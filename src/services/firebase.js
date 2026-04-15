import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, set, remove, onValue } from 'firebase/database';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

export const firebaseService = {
  // Set data
  async set(path, value) {
    try {
      await set(ref(db, `studypro/${path}`), value);
      return true;
    } catch (error) {
      console.error('Firebase set error:', error);
      throw error;
    }
  },

  // Get data once
  async get(path) {
    try {
      const snapshot = await get(ref(db, `studypro/${path}`));
      return snapshot.val();
    } catch (error) {
      console.error('Firebase get error:', error);
      throw error;
    }
  },

  // Remove data
  async remove(path) {
    try {
      await remove(ref(db, `studypro/${path}`));
      return true;
    } catch (error) {
      console.error('Firebase remove error:', error);
      throw error;
    }
  },

  // Listen to changes
  onValue(path, callback) {
    return onValue(ref(db, `studypro/${path}`), (snapshot) => {
      callback(snapshot.val());
    });
  },

  // Connection status
  onConnection(callback) {
    return onValue(ref(db, '.info/connected'), (snap) => {
      callback(snap.val());
    });
  }
};