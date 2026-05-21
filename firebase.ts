import { initializeApp } from 'firebase/app';
import { browserLocalPersistence, getAuth, getRedirectResult, GoogleAuthProvider, setPersistence, signInWithCredential, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

const GOOGLE_WEB_CLIENT_ID = '1079405440218-t5jfqm8vqnnq8kha1mq5vkau6ok7gjgv.apps.googleusercontent.com';

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            prompt?: string;
            callback: (response: { access_token?: string; error?: string; error_description?: string }) => void;
          }) => { requestAccessToken: (overrideConfig?: { prompt?: string }) => void };
        };
      };
    };
  }
}

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

const loadGoogleIdentityScript = () => {
  if (typeof window === 'undefined') return Promise.reject(new Error('Google login is only available in the browser'));
  if (window.google?.accounts?.oauth2) return Promise.resolve();

  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Google identity script failed to load')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Google identity script failed to load'));
    document.head.appendChild(script);
  });
};

const loginWithGoogleTokenClient = async () => {
  await authReady;
  await loadGoogleIdentityScript();

  return new Promise<void>((resolve, reject) => {
    const tokenClient = window.google?.accounts?.oauth2?.initTokenClient({
      client_id: GOOGLE_WEB_CLIENT_ID,
      scope: 'openid email profile',
      prompt: 'select_account',
      callback: async (response) => {
        try {
          if (response.error) {
            reject(new Error(response.error_description || response.error));
            return;
          }
          if (!response.access_token) {
            reject(new Error('Google login did not return an access token'));
            return;
          }
          const credential = GoogleAuthProvider.credential(null, response.access_token);
          await signInWithCredential(auth, credential);
          resolve();
        } catch (error) {
          reject(error);
        }
      },
    });

    if (!tokenClient) {
      reject(new Error('Google identity services are unavailable'));
      return;
    }

    tokenClient.requestAccessToken({ prompt: 'select_account' });
  });
};

export const loginWithGoogle = async () => {
  try {
    await authReady;
    if (isStandaloneApp()) {
      await loginWithGoogleTokenClient();
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
