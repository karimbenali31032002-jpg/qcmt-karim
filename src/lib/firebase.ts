
// Mock Auth Service for Local Storage Version
export const isFirebaseConfigured = true;

// Mock user store
const LOCAL_USER_KEY = 'medstratify_local_user';

export const auth = {
  currentUser: JSON.parse(localStorage.getItem(LOCAL_USER_KEY) || 'null'),
  onAuthStateChanged: (callback: (user: any) => void) => {
    const user = JSON.parse(localStorage.getItem(LOCAL_USER_KEY) || 'null');
    callback(user);
    // Return a dummy unsubscribe function
    return () => {};
  }
};

export const signInWithGoogle = async () => {
  // Create a local mock user
  const mockUser = {
    uid: 'local-user-id',
    displayName: 'Utilisateur Local',
    email: 'karimbenali31032002@gmail.com', // Setting this to your email so you remain admin
    photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=local',
    emailVerified: true
  };
  localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(mockUser));
  window.location.reload();
  return mockUser;
};

export const signOut = async () => {
  localStorage.removeItem(LOCAL_USER_KEY);
  window.location.reload();
};

export const checkIsAdmin = (user: any) => {
  return user?.email === 'karimbenali31032002@gmail.com';
};

// Mock database objects for compatibility
export const db = null;
export const storage = null;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(error: unknown, _operationType: OperationType, _path: string | null) {
  console.error('Local Storage Error: ', error);
  throw error;
}
