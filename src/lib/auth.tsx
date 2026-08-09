import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { firebaseConfigured, getFirebase } from "./firebase";
import { getProfile, newId, saveProfile, watchProfile } from "./backend";
import type { Profile } from "./types";

type Session = { uid: string; email: string; name: string; photo?: string | null };

type AuthValue = {
  ready: boolean;
  session: Session | null;
  profile: Profile | null;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);
const LOCAL_SESSION = "us.session";
const LOCAL_CREDS = "us.creds";

const makeCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

async function ensureProfile(session: Session) {
  const existing = await getProfile(session.uid);
  if (existing?.inviteCode) return;
  await saveProfile(session.uid, {
    name: existing?.name || session.name || (session.email.split("@")[0] ?? "there"),
    email: session.email,
    photo: session.photo ?? null,
    inviteCode: existing?.inviteCode ?? makeCode(),
    coupleId: existing?.coupleId ?? null,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    createdAt: existing?.createdAt ?? Date.now(),
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!firebaseConfigured) {
      const raw = localStorage.getItem(LOCAL_SESSION);
      const parsed = raw ? (JSON.parse(raw) as Session) : null;
      setSession(parsed);
      if (parsed) void ensureProfile(parsed);
      setReady(true);
      return;
    }
    let unsub = () => {};
    void (async () => {
      const { auth } = await getFirebase();
      const { onAuthStateChanged } = await import("firebase/auth");
      unsub = onAuthStateChanged(auth, async (user) => {
        if (user) {
          const next: Session = {
            uid: user.uid,
            email: user.email ?? "",
            name: user.displayName ?? ((user.email ?? "").split("@")[0] ?? "there"),
            photo: user.photoURL,
          };
          setSession(next);
          await ensureProfile(next);
        } else {
          setSession(null);
        }
        setReady(true);
      });
    })();
    return () => unsub();
  }, []);

  useEffect(() => watchProfile(session?.uid ?? null, setProfile), [session?.uid]);

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    if (!firebaseConfigured) {
      const creds = JSON.parse(localStorage.getItem(LOCAL_CREDS) ?? "{}") as Record<
        string,
        { password: string; uid: string; name: string }
      >;
      if (creds[email]) throw new Error("That email is already registered on this device.");
      const uid = newId();
      creds[email] = { password, uid, name };
      localStorage.setItem(LOCAL_CREDS, JSON.stringify(creds));
      const next: Session = { uid, email, name };
      localStorage.setItem(LOCAL_SESSION, JSON.stringify(next));
      await ensureProfile(next);
      setSession(next);
      return;
    }
    const { auth } = await getFirebase();
    const { createUserWithEmailAndPassword, updateProfile } = await import("firebase/auth");
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    await ensureProfile({ uid: cred.user.uid, email, name });
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!firebaseConfigured) {
      const creds = JSON.parse(localStorage.getItem(LOCAL_CREDS) ?? "{}") as Record<
        string,
        { password: string; uid: string; name: string }
      >;
      const found = creds[email];
      if (!found || found.password !== password) throw new Error("Wrong email or password.");
      const next: Session = { uid: found.uid, email, name: found.name };
      localStorage.setItem(LOCAL_SESSION, JSON.stringify(next));
      await ensureProfile(next);
      setSession(next);
      return;
    }
    const { auth } = await getFirebase();
    const { signInWithEmailAndPassword } = await import("firebase/auth");
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!firebaseConfigured) {
      throw new Error("Google sign-in needs Firebase keys. Use email sign-up to test locally.");
    }
    const { auth } = await getFirebase();
    const { GoogleAuthProvider, signInWithPopup } = await import("firebase/auth");
    await signInWithPopup(auth, new GoogleAuthProvider());
  }, []);

  const signOut = useCallback(async () => {
    if (!firebaseConfigured) {
      localStorage.removeItem(LOCAL_SESSION);
      setSession(null);
      return;
    }
    const { auth } = await getFirebase();
    const { signOut: fbSignOut } = await import("firebase/auth");
    await fbSignOut(auth);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    if (!firebaseConfigured) throw new Error("Password reset needs Firebase keys.");
    const { auth } = await getFirebase();
    const { sendPasswordResetEmail } = await import("firebase/auth");
    await sendPasswordResetEmail(auth, email, {
      url: `${window.location.origin}/reset-password`,
    });
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      ready,
      session,
      profile,
      signUp,
      signIn,
      signInWithGoogle,
      signOut,
      resetPassword,
    }),
    [ready, session, profile, signUp, signIn, signInWithGoogle, signOut, resetPassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
