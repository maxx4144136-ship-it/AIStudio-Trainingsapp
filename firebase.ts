import { initializeApp } from 'firebase/app';
import { browserLocalPersistence, getAuth, getRedirectResult, GoogleAuthProvider, setPersistence, signInWithPopup, signInWithRedirect, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const authReady = setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error('Auth persistence setup failed:', error);
});

const isStandaloneApp = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
};

export const completeRedirectLogin = async () => {
  await authReady;
  return getRedirectResult(auth);
};

export const loginWithGoogle = async () => {
  try {
    await authReady;
    if (isStandaloneApp()) {
      await signInWithRedirect(auth, googleProvider);
      return;
    }
    await signInWithPopup(auth, googleProvider);
  } catch (error) {
    console.error("Login failed:", error);
    throw error;
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout failed:", error);
    throw error;
  }
};
