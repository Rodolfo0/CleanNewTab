const FAVICON_DB_NAME = "clean-new-tab-favicons";
const FAVICON_DB_VERSION = 1;
const FAVICON_STORE_NAME = "favicons";

export type CachedFavicon = {
  blob: Blob;
  pageUrl: string;
  size: number;
  updatedAt: number;
};

function openFaviconDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB no esta disponible."));
      return;
    }

    const request = indexedDB.open(FAVICON_DB_NAME, FAVICON_DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error("No se pudo abrir IndexedDB."));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(FAVICON_STORE_NAME)) {
        db.createObjectStore(FAVICON_STORE_NAME, { keyPath: "pageUrl" });
      }
    };
  });
}

function runFaviconTransaction<T>(
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T>,
) {
  return new Promise<T>((resolve, reject) => {
    void openFaviconDb()
      .then((db) => {
        const transaction = db.transaction(FAVICON_STORE_NAME, mode);
        const request = callback(transaction.objectStore(FAVICON_STORE_NAME));

        request.onerror = () => reject(request.error ?? new Error("IndexedDB fallo."));
        request.onsuccess = () => resolve(request.result);
        transaction.oncomplete = () => db.close();
        transaction.onabort = () => {
          db.close();
          reject(transaction.error ?? new Error("IndexedDB cancelo la operacion."));
        };
      })
      .catch(reject);
  });
}

export function getCachedFavicon(pageUrl: string) {
  return runFaviconTransaction<CachedFavicon | undefined>("readonly", (store) =>
    store.get(pageUrl),
  );
}

export function saveCachedFavicon(favicon: CachedFavicon) {
  return runFaviconTransaction<IDBValidKey>("readwrite", (store) =>
    store.put(favicon),
  );
}
