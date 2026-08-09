/**
 * Firebase bootstrap.
 *
 * Web config values are publishable by design, so they live in VITE_ env vars.
 * When they are absent the app falls back to a local device-only backend so the
 * whole product stays testable before keys are wired up.
 */
const config = {
  apiKey: import.meta.env["VITE_FIREBASE_API_KEY"] as string | undefined,
  authDomain: import.meta.env["VITE_FIREBASE_AUTH_DOMAIN"] as string | undefined,
  projectId: import.meta.env["VITE_FIREBASE_PROJECT_ID"] as string | undefined,
  storageBucket: import.meta.env["VITE_FIREBASE_STORAGE_BUCKET"] as string | undefined,
  messagingSenderId: import.meta.env["VITE_FIREBASE_MESSAGING_SENDER_ID"] as string | undefined,
  appId: import.meta.env["VITE_FIREBASE_APP_ID"] as string | undefined,
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
