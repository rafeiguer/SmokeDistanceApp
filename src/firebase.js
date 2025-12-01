// Lightweight Firebase bootstrap (Web SDK)
// Guards against missing dependency and missing config.
import Constants from 'expo-constants';

let firebaseApp = null;
let firestoreDb = null;
let loadError = null;

export function getFirebaseConfig() {
  const extra = (Constants?.expoConfig?.extra) || (Constants?.manifest?.extra) || {};
  const cfg = extra?.FIREBASE_CONFIG || null;
  if (!cfg || !cfg.apiKey || !cfg.projectId || !cfg.appId) return null;
  return cfg;
}

export function getFirebaseApp() {
  if (firebaseApp) return firebaseApp;
  const cfg = getFirebaseConfig();
  if (!cfg) return null;
  try {
    // Lazy require to avoid bundling error if package isn't installed yet
    const { initializeApp, getApps } = require('firebase/app');
    firebaseApp = getApps().length ? require('firebase/app').getApp() : initializeApp(cfg);
    return firebaseApp;
  } catch (e) {
    loadError = e;
    return null;
  }
}

export function getDb() {
  if (firestoreDb) return firestoreDb;
  const app = getFirebaseApp();
  if (!app) return null;
  try {
    const { getFirestore } = require('firebase/firestore');
    firestoreDb = getFirestore(app);
    return firestoreDb;
  } catch (e) {
    loadError = e;
    return null;
  }
}

export function getLastError() {
  return loadError;
}
