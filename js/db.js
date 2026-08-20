// Kleine, selbstgeschriebene IndexedDB-Hülle (Promise-basiert). Kein externes
// Paket nötig, damit die App ohne Build-Schritt und ohne Internetzugang beim
// Bauen läuft.

const DB_NAME = 'distillerei-db';
const DB_VERSION = 3;

let dbPromise = null;

function openDatabase() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (event) => {
      const db = req.result;
      const tx = req.transaction;
      if (!db.objectStoreNames.contains('recipes')) {
        db.createObjectStore('recipes', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('batches')) {
        const store = db.createObjectStore('batches', { keyPath: 'id' });
        store.createIndex('status', 'status');
        store.createIndex('recipeId', 'recipeId');
      }

      let photosStore;
      if (!db.objectStoreNames.contains('photos')) {
        photosStore = db.createObjectStore('photos', { keyPath: 'id' });
        photosStore.createIndex('batchId', 'batchId');
      } else {
        photosStore = tx.objectStore('photos');
      }

      // Merkt sich lokal gelöschte Rezepte/Batches/Fotos, damit eine Löschung
      // bei der Server-Synchronisierung auf andere Geräte übertragen werden
      // kann (sonst würde ein gelöschter Eintrag beim nächsten Abgleich von
      // einem anderen Gerät wieder auftauchen).
      if (!db.objectStoreNames.contains('tombstones')) {
        db.createObjectStore('tombstones', { keyPath: 'id' });
      }

      // Ehemals hieß das Feld "chargeId" (Charge -> Batch umbenannt). Bereits
      // gespeicherte Fotos auf das neue Feld umstellen, damit alte Daten nicht
      // verloren gehen.
      if (event.oldVersion < 2 && photosStore.indexNames.contains('chargeId')) {
        photosStore.deleteIndex('chargeId');
        photosStore.createIndex('batchId', 'batchId');
        photosStore.openCursor().onsuccess = (e) => {
          const cursor = e.target.result;
          if (!cursor) return;
          const record = cursor.value;
          if (record.chargeId !== undefined) {
            record.batchId = record.chargeId;
            delete record.chargeId;
            cursor.update(record);
          }
          cursor.continue();
        };
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function reqToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore(storeName, mode, fn) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    let result;
    Promise.resolve(fn(store))
      .then((r) => {
        result = r;
      })
      .catch(reject);
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

// ---------- Rezepte ----------

export async function getAllRecipes() {
  return withStore('recipes', 'readonly', (store) => reqToPromise(store.getAll()));
}

export async function getRecipe(id) {
  return withStore('recipes', 'readonly', (store) => reqToPromise(store.get(id)));
}

export async function saveRecipe(recipe) {
  recipe.updatedAt = new Date().toISOString();
  return putRecipe(recipe);
}

// Speichert ein Rezept, ohne "updatedAt" zu verändern (für den Server-Sync,
// der den Zeitstempel des jeweils anderen Geräts unverändert übernehmen muss).
export async function putRecipe(recipe) {
  await withStore('recipes', 'readwrite', (store) => reqToPromise(store.put(recipe)));
  return recipe;
}

export async function deleteRecipe(id) {
  await withStore('recipes', 'readwrite', (store) => reqToPromise(store.delete(id)));
  await addTombstone('recipe', id);
}

// Entfernt ein Rezept lokal, ohne eine neue Lösch-Markierung anzulegen (wird
// beim Sync verwendet, um eine auf einem anderen Gerät erfolgte Löschung zu
// übernehmen).
export async function removeRecipeLocally(id) {
  return withStore('recipes', 'readwrite', (store) => reqToPromise(store.delete(id)));
}

// ---------- Batches ----------

export async function getAllBatches() {
  const all = await withStore('batches', 'readonly', (store) => reqToPromise(store.getAll()));
  return all.sort((a, b) => (b.startedAt || '').localeCompare(a.startedAt || ''));
}

export async function getBatchesByStatus(status) {
  const all = await getAllBatches();
  return all.filter((b) => b.status === status);
}

export async function getBatch(id) {
  return withStore('batches', 'readonly', (store) => reqToPromise(store.get(id)));
}

export async function saveBatch(batch) {
  batch.updatedAt = new Date().toISOString();
  return putBatch(batch);
}

// Speichert einen Batch, ohne "updatedAt" zu verändern (für den Server-Sync).
export async function putBatch(batch) {
  await withStore('batches', 'readwrite', (store) => reqToPromise(store.put(batch)));
  return batch;
}

export async function deleteBatch(id) {
  await deletePhotosByBatch(id);
  await withStore('batches', 'readwrite', (store) => reqToPromise(store.delete(id)));
  await addTombstone('batch', id);
}

// Entfernt einen Batch lokal, ohne eine neue Lösch-Markierung anzulegen (wird
// beim Sync verwendet, um eine auf einem anderen Gerät erfolgte Löschung zu
// übernehmen).
export async function removeBatchLocally(id) {
  await deletePhotosByBatch(id);
  return withStore('batches', 'readwrite', (store) => reqToPromise(store.delete(id)));
}

// ---------- Fotos ----------

export async function savePhoto(photo) {
  await withStore('photos', 'readwrite', (store) => reqToPromise(store.put(photo)));
  return photo;
}

export async function getPhoto(id) {
  return withStore('photos', 'readonly', (store) => reqToPromise(store.get(id)));
}

export async function getPhotosByBatch(batchId) {
  return withStore('photos', 'readonly', (store) =>
    reqToPromise(store.index('batchId').getAll(batchId))
  );
}

export async function deletePhoto(id) {
  await withStore('photos', 'readwrite', (store) => reqToPromise(store.delete(id)));
  await addTombstone('photo', id);
}

// Entfernt ein Foto lokal, ohne eine neue Lösch-Markierung anzulegen (wird
// beim Sync verwendet, um eine auf einem anderen Gerät erfolgte Löschung zu
// übernehmen).
export async function removePhotoLocally(id) {
  return withStore('photos', 'readwrite', (store) => reqToPromise(store.delete(id)));
}

export async function deletePhotosByBatch(batchId) {
  const photos = await getPhotosByBatch(batchId);
  return withStore('photos', 'readwrite', (store) => {
    for (const p of photos) store.delete(p.id);
  });
}

// ---------- Lösch-Markierungen (für den Server-Sync) ----------

export async function addTombstone(type, entityId) {
  return withStore('tombstones', 'readwrite', (store) =>
    reqToPromise(
      store.put({ id: `${type}:${entityId}`, type, entityId, deletedAt: new Date().toISOString() })
    )
  );
}

export async function getTombstones(type) {
  const all = await withStore('tombstones', 'readonly', (store) => reqToPromise(store.getAll()));
  return all.filter((t) => t.type === type);
}

export async function clearTombstones(type, entityIds) {
  const idsToRemove = new Set(entityIds);
  return withStore('tombstones', 'readwrite', (store) => {
    store.openCursor().onsuccess = (e) => {
      const cursor = e.target.result;
      if (!cursor) return;
      if (cursor.value.type === type && idsToRemove.has(cursor.value.entityId)) {
        cursor.delete();
      }
      cursor.continue();
    };
  });
}

// ---------- Kompletter Datenexport/-import (für Backup) ----------

export async function getAllPhotos() {
  return withStore('photos', 'readonly', (store) => reqToPromise(store.getAll()));
}

export async function replaceAllData({ recipes, batches, photos }) {
  const db = await openDatabase();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(['recipes', 'batches', 'photos'], 'readwrite');
    tx.objectStore('recipes').clear();
    tx.objectStore('batches').clear();
    tx.objectStore('photos').clear();
    for (const r of recipes) tx.objectStore('recipes').put(r);
    for (const b of batches) tx.objectStore('batches').put(b);
    for (const p of photos) tx.objectStore('photos').put(p);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
