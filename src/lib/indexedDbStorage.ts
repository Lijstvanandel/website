/**
 * Robust IndexedDB storage utility for large datasets (e.g. 2000+ council documents, full topics).
 * Bypasses the 5MB browser localStorage limit and safely falls back to sessionStorage or in-memory map.
 */

const DB_NAME = "lva_council_store";
const DB_VERSION = 1;
const STORE_NAME = "keyval";

let dbPromise: Promise<IDBDatabase | null> | null = null;
const memoryFallback = new Map<string, any>();

function getDb(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || !window.indexedDB) {
    return Promise.resolve(null);
  }

  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      try {
        const req = window.indexedDB.open(DB_NAME, DB_VERSION);

        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        };

        req.onsuccess = () => {
          resolve(req.result);
        };

        req.onerror = () => {
          console.warn("[IndexedDB] Kon database niet openen, fallback actief");
          resolve(null);
        };
      } catch (_e) {
        resolve(null);
      }
    });
  }

  return dbPromise;
}

export const indexedDbStorage = {
  async getItem<T = any>(key: string): Promise<T | null> {
    try {
      const db = await getDb();
      if (db) {
        return new Promise((resolve) => {
          try {
            const tx = db.transaction(STORE_NAME, "readonly");
            const store = tx.objectStore(STORE_NAME);
            const req = store.get(key);

            req.onsuccess = () => {
              if (req.result !== undefined && req.result !== null) {
                resolve(req.result as T);
              } else {
                resolve(null);
              }
            };

            req.onerror = () => {
              resolve(null);
            };
          } catch {
            resolve(null);
          }
        });
      }
    } catch {
      // fallback
    }

    // Fallback: sessionStorage then memory
    if (typeof window !== "undefined" && window.sessionStorage) {
      try {
        const val = window.sessionStorage.getItem(key);
        if (val) return JSON.parse(val);
      } catch {
        // ignore
      }
    }

    return memoryFallback.get(key) || null;
  },

  async setItem<T = any>(key: string, value: T): Promise<void> {
    try {
      const db = await getDb();
      if (db) {
        return new Promise((resolve) => {
          try {
            const tx = db.transaction(STORE_NAME, "readwrite");
            const store = tx.objectStore(STORE_NAME);
            store.put(value, key);

            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
          } catch {
            resolve();
          }
        });
      }
    } catch {
      // fallback
    }

    // Fallback: memory + optional sessionStorage for small values
    memoryFallback.set(key, value);
    if (typeof window !== "undefined" && window.sessionStorage) {
      try {
        const serialized = JSON.stringify(value);
        if (serialized.length < 500000) {
          window.sessionStorage.setItem(key, serialized);
        }
      } catch {
        // ignore quota error
      }
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      const db = await getDb();
      if (db) {
        return new Promise((resolve) => {
          try {
            const tx = db.transaction(STORE_NAME, "readwrite");
            const store = tx.objectStore(STORE_NAME);
            store.delete(key);

            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
          } catch {
            resolve();
          }
        });
      }
    } catch {
      // fallback
    }

    memoryFallback.delete(key);
    if (typeof window !== "undefined" && window.sessionStorage) {
      try {
        window.sessionStorage.removeItem(key);
      } catch {
        // ignore
      }
    }
  },
};
