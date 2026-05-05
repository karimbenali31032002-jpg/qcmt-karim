import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '@/firebase-applet-config.json';

// Log a warning if config seems invalid (empty apiKey is a common sign of missing config)
if (!firebaseConfig || !firebaseConfig.apiKey || firebaseConfig.apiKey === "REPLACE_WITH_YOUR_API_KEY") {
  console.warn("⚠️ Firebase Configuration is incomplete. Please check your firebase-applet-config.json file.");
}

let app;
try {
  if (firebaseConfig && firebaseConfig.apiKey && firebaseConfig.apiKey !== "REPLACE_WITH_YOUR_API_KEY") {
    app = initializeApp(firebaseConfig);
  } else {
    console.warn("⚠️ Firebase configuration is missing or incomplete.");
  }
} catch (error) {
  console.error("❌ Failed to initialize Firebase:", error);
}

export const isFirebaseConfigured = !!app;
export const auth = app ? getAuth(app) : null;

// Ensure db and storage don't crash if app exists but config is weird
export const db = app ? getFirestore(app, firebaseConfig?.firestoreDatabaseId || "(default)") : null;
export const storage = app ? getStorage(app) : null;

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
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
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
