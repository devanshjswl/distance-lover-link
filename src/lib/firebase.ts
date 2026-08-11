/**
 * Firebase bootstrap.
 *
 * Web config values are publishable by design (access control lives in
 * firestore.rules / storage.rules), so they ship with the bundle as defaults
 * and can still be overridden per-environment with VITE_FIREBASE_* env vars.
 */
const env = import.meta.env as Record<string, string | undefined>;

const pick = (key: string, fallback: string) => {
  const value = env[key];
  return value && value.trim() ? value.trim() : fallback;
};

const config = {
  apiKey: pick("VITE_FIREBASE_API_KEY", "AIzaSyDF3g7JY8PQjTaML-GLDkjLNfGgWM65Ylk"),
  authDomain: pick("VITE_FIREBASE_AUTH_DOMAIN", "usapp-d44e6.firebaseapp.com"),
  projectId: pick("VITE_FIREBASE_PROJECT_ID", "usapp-d44e6"),
  storageBucket: pick("VITE_FIREBASE_STORAGE_BUCKET", "usapp-d44e6.firebasestorage.app"),
  messagingSenderId: pick("VITE_FIREBASE_MESSAGING_SENDER_ID", "76460906083"),
  appId: pick("VITE_FIREBASE_APP_ID", "1:76460906083:web:d00a11034d64e0c18c8a56"),
  measurementId: pick("VITE_FIREBASE_MEASUREMENT_ID", "G-GBRXEMZXKT"),
};

export const firebaseConfigured = Boolean(config.apiKey && config.projectId && config.appId);


type Bundle = {
  app: import("firebase/app").FirebaseApp;
  auth: import("firebase/auth").Auth;
  db: import("firebase/firestore").Firestore;
  storage: import("firebase/storage").FirebaseStorage;
};

let bundle: Promise<Bundle> | null = null;

export function getFirebase(): Promise<Bundle> {
  if (!firebaseConfigured) return Promise.reject(new Error("Firebase is not configured"));
  if (!bundle) {
    bundle = (async () => {
      const [{ initializeApp, getApps, getApp }, authMod, fsMod, storageMod] = await Promise.all([
        import("firebase/app"),
        import("firebase/auth"),
        import("firebase/firestore"),
        import("firebase/storage"),
      ]);
      const app = getApps().length ? getApp() : initializeApp(config as Record<string, string>);
      const db = fsMod.initializeFirestore(app, {
        localCache: fsMod.persistentLocalCache({
          tabManager: fsMod.persistentMultipleTabManager(),
        }),
      });
      return {
        app,
        auth: authMod.getAuth(app),
        db,
        storage: storageMod.getStorage(app),
      };
    })();
  }
  return bundle;
}

/** Best-effort push registration; silently no-ops without config or permission. */
export async function registerPushMessaging(): Promise<string | null> {
  const vapid = import.meta.env["VITE_FIREBASE_VAPID_KEY"] as string | undefined;
  if (!firebaseConfigured || !vapid || typeof window === "undefined") return null;
  try {
    const { getMessaging, getToken, isSupported } = await import("firebase/messaging");
    if (!(await isSupported())) return null;
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;
    const { app } = await getFirebase();
    return await getToken(getMessaging(app), { vapidKey: vapid });
  } catch {
    return null;
  }
}
