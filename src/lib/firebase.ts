import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, memoryLocalCache, getFirestore, Firestore, setLogLevel } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Silence internal SDK backoff logs
try {
  setLogLevel('silent');
} catch (_) {}

// Suppress unhandled resource-exhausted quota rejections in the browser environment
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    if (
      reason &&
      (reason.code === 'resource-exhausted' ||
        (typeof reason.message === 'string' && reason.message.includes('Quota limit exceeded')))
    ) {
      event.preventDefault();
    }
  });
}

// Purge any stale IndexedDB write queues from prior persistent sessions to prevent repeated backoff loops
if (typeof window !== 'undefined' && window.indexedDB) {
  try {
    if (typeof window.indexedDB.databases === 'function') {
      window.indexedDB.databases().then((dbs) => {
        dbs.forEach((dbInfo) => {
          if (dbInfo.name && dbInfo.name.startsWith('firestore')) {
            try { window.indexedDB.deleteDatabase(dbInfo.name); } catch (_) {}
          }
        });
      }).catch(() => {});
    }
  } catch (_) {}
}

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

let dbInstance: Firestore;
try {
  dbInstance = initializeFirestore(app, {
    localCache: memoryLocalCache(),
  }, firebaseConfig.firestoreDatabaseId);
} catch {
  dbInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId);
}

export const db = dbInstance;
export const auth = getAuth(app);


