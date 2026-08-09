import { firebaseConfigured, getFirebase } from "./firebase";
import type { Profile } from "./types";

export type Unsub = () => void;
type Row = { id: string; createdAt?: number } & Record<string, unknown>;

/* ------------------------------------------------------------------ *
 * Local fallback engine (device-only, realtime across tabs)
 * ------------------------------------------------------------------ */

const CHANNEL = "us-sync";
let channel: BroadcastChannel | null = null;
const listeners = new Set<(key: string) => void>();

function bus() {
  if (typeof window === "undefined") return null;
  if (!channel && "BroadcastChannel" in window) {
    channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = (event) => listeners.forEach((fn) => fn(String(event.data)));
    window.addEventListener("storage", (event) => {
      if (event.key) listeners.forEach((fn) => fn(event.key as string));
    });
  }
  return channel;
}

function emit(key: string) {
  bus()?.postMessage(key);
  listeners.forEach((fn) => fn(key));
}

function onKey(key: string, fn: () => void): Unsub {
  bus();
  const handler = (changed: string) => {
    if (changed === key) fn();
  };
  listeners.add(handler);
  return () => listeners.delete(handler);
}

const readLocal = <T>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const writeLocal = (key: string, value: unknown) => {
  localStorage.setItem(key, JSON.stringify(value));
  emit(key);
};

const collKey = (coupleId: string, name: string) => `us.db.${coupleId}.${name}`;
const USERS_KEY = "us.users";

export const newId = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const sortRows = (rows: Row[]) => [...rows].sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));

/* ------------------------------------------------------------------ *
 * Collections
 * ------------------------------------------------------------------ */

export function watchCollection<T>(
  coupleId: string | null | undefined,
  name: string,
  cb: (rows: T[]) => void,
): Unsub {
  if (!coupleId) {
    cb([]);
    return () => {};
  }

  if (!firebaseConfigured) {
    const key = collKey(coupleId, name);
    const push = () => cb(sortRows(readLocal<Row[]>(key, [])) as T[]);
    push();
    return onKey(key, push);
  }

  let live = true;
  let unsub: Unsub = () => {};
  void (async () => {
    const { db } = await getFirebase();
    const fs = await import("firebase/firestore");
    if (!live) return;
    const q = fs.query(fs.collection(db, "couples", coupleId, name), fs.orderBy("createdAt", "asc"));
    unsub = fs.onSnapshot(
      q,
      (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as T[]),
      (error) => console.error(`[us] ${name} subscription failed`, error),
    );
  })();
  return () => {
    live = false;
    unsub();
  };
}

export function watchRecord<T>(
  coupleId: string | null | undefined,
  name: string,
  id: string,
  cb: (row: T | null) => void,
): Unsub {
  return watchCollection<T & { id: string }>(coupleId, name, (rows) => {
    cb((rows.find((row) => row.id === id) as T) ?? null);
  });
}

export async function addRecord(
  coupleId: string,
  name: string,
  data: Record<string, unknown>,
): Promise<string> {
  const payload = { createdAt: Date.now(), ...data };
  if (!firebaseConfigured) {
    const key = collKey(coupleId, name);
    const id = newId();
    writeLocal(key, [...readLocal<Row[]>(key, []), { id, ...payload }]);
    return id;
  }
  const { db } = await getFirebase();
  const fs = await import("firebase/firestore");
  const ref = await fs.addDoc(fs.collection(db, "couples", coupleId, name), payload);
  return ref.id;
}

export async function setRecord(
  coupleId: string,
  name: string,
  id: string,
  data: Record<string, unknown>,
): Promise<void> {
  const payload = { createdAt: Date.now(), ...data, updatedAt: Date.now() };
  if (!firebaseConfigured) {
    const key = collKey(coupleId, name);
    const rows = readLocal<Row[]>(key, []);
    const existing = rows.find((row) => row.id === id);
    writeLocal(
      key,
      existing
        ? rows.map((row) => (row.id === id ? { ...row, ...payload, createdAt: row.createdAt } : row))
        : [...rows, { id, ...payload }],
    );
    return;
  }
  const { db } = await getFirebase();
  const fs = await import("firebase/firestore");
  await fs.setDoc(fs.doc(db, "couples", coupleId, name, id), payload, { merge: true });
}

export async function updateRecord(
  coupleId: string,
  name: string,
  id: string,
  patch: Record<string, unknown>,
): Promise<void> {
  await setRecord(coupleId, name, id, patch);
}

export async function removeRecord(coupleId: string, name: string, id: string): Promise<void> {
  if (!firebaseConfigured) {
    const key = collKey(coupleId, name);
    writeLocal(
      key,
      readLocal<Row[]>(key, []).filter((row) => row.id !== id),
    );
    return;
  }
  const { db } = await getFirebase();
  const fs = await import("firebase/firestore");
  await fs.deleteDoc(fs.doc(db, "couples", coupleId, name, id));
}

/* ------------------------------------------------------------------ *
 * Profiles (top-level, needed for invite-code pairing)
 * ------------------------------------------------------------------ */

export function watchProfile(uid: string | null, cb: (profile: Profile | null) => void): Unsub {
  if (!uid) {
    cb(null);
    return () => {};
  }
  if (!firebaseConfigured) {
    const push = () => cb(readLocal<Record<string, Profile>>(USERS_KEY, {})[uid] ?? null);
    push();
    return onKey(USERS_KEY, push);
  }
  let live = true;
  let unsub: Unsub = () => {};
  void (async () => {
    const { db } = await getFirebase();
    const fs = await import("firebase/firestore");
    if (!live) return;
    unsub = fs.onSnapshot(fs.doc(db, "users", uid), (snap) =>
      cb(snap.exists() ? ({ id: snap.id, ...snap.data() } as Profile) : null),
    );
  })();
  return () => {
    live = false;
    unsub();
  };
}

export async function saveProfile(uid: string, patch: Partial<Profile>): Promise<void> {
  if (!firebaseConfigured) {
    const users = readLocal<Record<string, Profile>>(USERS_KEY, {});
    users[uid] = { ...(users[uid] ?? { id: uid, name: "", email: "" }), ...patch, id: uid };
    writeLocal(USERS_KEY, users);
    return;
  }
  const { db } = await getFirebase();
  const fs = await import("firebase/firestore");
  await fs.setDoc(fs.doc(db, "users", uid), { ...patch, id: uid }, { merge: true });
}

export async function getProfile(uid: string): Promise<Profile | null> {
  if (!firebaseConfigured) return readLocal<Record<string, Profile>>(USERS_KEY, {})[uid] ?? null;
  const { db } = await getFirebase();
  const fs = await import("firebase/firestore");
  const snap = await fs.getDoc(fs.doc(db, "users", uid));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Profile) : null;
}

export async function findProfileByCode(code: string): Promise<Profile | null> {
  const wanted = code.trim().toUpperCase();
  if (!wanted) return null;
  if (!firebaseConfigured) {
    return (
      Object.values(readLocal<Record<string, Profile>>(USERS_KEY, {})).find(
        (profile) => profile.inviteCode === wanted,
      ) ?? null
    );
  }
  const { db } = await getFirebase();
  const fs = await import("firebase/firestore");
  const snap = await fs.getDocs(
    fs.query(fs.collection(db, "users"), fs.where("inviteCode", "==", wanted), fs.limit(1)),
  );
  const doc = snap.docs[0];
  return doc ? ({ id: doc.id, ...doc.data() } as Profile) : null;
}

/* ------------------------------------------------------------------ *
 * Media
 * ------------------------------------------------------------------ */

export async function uploadMedia(path: string, blob: Blob): Promise<string> {
  if (!firebaseConfigured) {
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }
  const { storage } = await getFirebase();
  const mod = await import("firebase/storage");
  const ref = mod.ref(storage, path);
  await mod.uploadBytes(ref, blob);
  return await mod.getDownloadURL(ref);
}
