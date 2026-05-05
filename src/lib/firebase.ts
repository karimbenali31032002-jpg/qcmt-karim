import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

let app: any = null;
let firebaseConfig: any = null;

// Initialization promise
export const firebaseInitPromise = (async () => {
  try {
    firebaseConfig = await import('../../firebase-applet-config.json').then(m => m.default);
    if (firebaseConfig && firebaseConfig.apiKey && firebaseConfig.apiKey !== "REPLACE_WITH_YOUR_API_KEY") {
      app = initializeApp(firebaseConfig);
      return true;
    }
  } catch (e) {
    console.error("Firebase init failed:", e);
  }
  return false;
})();

export const getFirebaseApp = () => app;
export const getIsConfigured = () => !!app;
export const getAuthInstance = () => app ? getAuth(app) : null;
export const getDb = () => app ? getFirestore(app, firebaseConfig?.firestoreDatabaseId || "(default)") : null;
export const getStorageInstance = () => app ? getStorage(app) : null;

// Keep exports for backward compatibility but they might be null initially
export let isFirebaseConfigured = false;
export let auth: any = null;
export let db: any = null;
export let storage: any = null;

firebaseInitPromise.then(configured => {
  isFirebaseConfigured = configured;
  if (configured) {
    auth = getAuth(app);
    db = getFirestore(app, firebaseConfig?.firestoreDatabaseId || "(default)");
    storage = getStorage(app);
  }
});

const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  if (!auth) throw new Error("Firebase Auth is not initialized. Check your configuration.");
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google:", error);
    throw error;
  }
};

export const signOut = async () => {
  if (!auth) return;
  try {
    await firebaseSignOut(auth);
    window.location.reload();
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
  }
};

export const checkIsAdmin = (user: any) => {
  return user?.email === 'karimbenali31032002@gmail.com';
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo: auth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
