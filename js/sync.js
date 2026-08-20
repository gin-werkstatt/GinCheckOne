// Abgleich mit dem eigenen PHP-Backend (server/-Ordner) auf dem Webspace.
// IndexedDB bleibt die primäre Datenquelle (App funktioniert weiter offline);
// dieses Modul überträgt nur Änderungen seit dem letzten Abgleich in beide
// Richtungen. Konflikte werden pro Datensatz per Zeitstempel aufgelöst
// ("letzter Stand gewinnt") - für den Anwendungsfall (eigene Geräte, ein
// Nutzer) ausreichend.
import * as db from './db.js';

const CONFIG_KEY = 'syncConfig';
const LAST_SYNC_KEY = 'letzteSyncAt';

export function getSyncConfig() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CONFIG_KEY));
    return { serverUrl: parsed?.serverUrl || '', apiToken: parsed?.apiToken || '' };
  } catch {
    return { serverUrl: '', apiToken: '' };
  }
}

export function setSyncConfig(config) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export function isSyncConfigured() {
  const c = getSyncConfig();
  return !!(c.serverUrl && c.apiToken);
}

export function getLastSyncAt() {
  return localStorage.getItem(LAST_SYNC_KEY);
}

function baseUrl(config) {
  return config.serverUrl.trim().replace(/\/+$/, '');
}

async function apiFetch(config, path, options = {}) {
  let res;
  try {
    res = await fetch(`${baseUrl(config)}/${path}`, {
      ...options,
      headers: { ...(options.headers || {}), 'X-Api-Token': config.apiToken },
    });
  } catch {
    throw new Error('Server nicht erreichbar. Internetverbindung und Server-Adresse prüfen.');
  }
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      if (body.error) message = body.error;
    } catch {
      // keine JSON-Antwort, statusText behalten
    }
    throw new Error(`Server-Fehler (${res.status}): ${message}`);
  }
  return res;
}

async function uploadPhoto(config, photo) {
  const form = new FormData();
  form.append('id', photo.id);
  form.append('batchId', photo.batchId);
  form.append('stepKey', photo.stepKey || '');
  form.append('itemId', photo.itemId || '');
  form.append('width', photo.width || '');
  form.append('height', photo.height || '');
  form.append('createdAt', photo.createdAt);
  form.append('photo', photo.blob, `${photo.id}.jpg`);
  await apiFetch(config, 'photo_upload.php', { method: 'POST', body: form });
}

async function downloadPhoto(config, meta) {
  const res = await apiFetch(config, `photo_download.php?id=${encodeURIComponent(meta.id)}`);
  const blob = await res.blob();
  await db.savePhoto({
    id: meta.id,
    batchId: meta.batchId,
    stepKey: meta.stepKey,
    itemId: meta.itemId || null,
    width: meta.width,
    height: meta.height,
    createdAt: meta.createdAt,
    blob,
    syncedAt: new Date().toISOString(),
  });
}

export async function syncNow() {
  const config = getSyncConfig();
  if (!config.serverUrl || !config.apiToken) {
    throw new Error('Bitte zuerst Server-Adresse und Zugangscode eintragen.');
  }

  const since = getLastSyncAt();

  const [recipes, batches, photos, deletedRecipes, deletedBatches, deletedPhotos] = await Promise.all([
    db.getAllRecipes(),
    db.getAllBatches(),
    db.getAllPhotos(),
    db.getTombstones('recipe'),
    db.getTombstones('batch'),
    db.getTombstones('photo'),
  ]);

  // Ältere Batches (vor Einführung des Sync) hatten noch kein "updatedAt" -
  // einmalig nachtragen, sonst würden sie nie mit hochgeladen.
  for (const b of batches) {
    if (!b.updatedAt) {
      b.updatedAt = b.completedAt || b.startedAt || new Date().toISOString();
      await db.putBatch(b);
    }
  }

  const changedRecipes = since ? recipes.filter((r) => !r.updatedAt || r.updatedAt > since) : recipes;
  const changedBatches = since ? batches.filter((b) => !b.updatedAt || b.updatedAt > since) : batches;

  const body = {
    since,
    recipes: changedRecipes,
    batches: changedBatches,
    deletedRecipes: deletedRecipes.map((t) => t.entityId),
    deletedBatches: deletedBatches.map((t) => t.entityId),
    deletedPhotos: deletedPhotos.map((t) => t.entityId),
  };

  const res = await apiFetch(config, 'sync.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const result = await res.json();

  for (const r of result.recipes || []) await db.putRecipe(r);
  for (const b of result.batches || []) await db.putBatch(b);
  for (const id of result.deletedRecipes || []) await db.removeRecipeLocally(id);
  for (const id of result.deletedBatches || []) await db.removeBatchLocally(id);
  for (const id of result.deletedPhotos || []) await db.removePhotoLocally(id);

  const localPhotoIds = new Set(photos.map((p) => p.id));
  const photosToDownload = (result.photos || []).filter((p) => !localPhotoIds.has(p.id));
  for (const meta of photosToDownload) {
    await downloadPhoto(config, meta);
  }

  const photosToUpload = photos.filter((p) => !p.syncedAt);
  for (const photo of photosToUpload) {
    await uploadPhoto(config, photo);
    photo.syncedAt = new Date().toISOString();
    await db.savePhoto(photo);
  }

  await db.clearTombstones('recipe', deletedRecipes.map((t) => t.entityId));
  await db.clearTombstones('batch', deletedBatches.map((t) => t.entityId));
  await db.clearTombstones('photo', deletedPhotos.map((t) => t.entityId));

  localStorage.setItem(LAST_SYNC_KEY, result.serverTime);

  return {
    pushed: changedRecipes.length + changedBatches.length + photosToUpload.length,
    pulled: (result.recipes || []).length + (result.batches || []).length + photosToDownload.length,
  };
}

let autoSyncInFlight = false;
let lastAutoSyncAttempt = 0;
const AUTO_SYNC_MIN_INTERVAL_MS = 60 * 1000;

// Synchronisiert automatisch im Hintergrund, z. B. beim Öffnen der App oder
// wenn wieder Internet da ist - ohne Fehlermeldung, falls es nicht klappt
// (z. B. kein Netz in der Werkstatt), damit das die App nicht stört.
export async function autoSyncIfNeeded({ onSyncStart, onSyncEnd } = {}) {
  if (autoSyncInFlight || !navigator.onLine || !isSyncConfigured()) {
    return;
  }
  const now = Date.now();
  if (now - lastAutoSyncAttempt < AUTO_SYNC_MIN_INTERVAL_MS) {
    return;
  }
  lastAutoSyncAttempt = now;
  autoSyncInFlight = true;
  onSyncStart?.();
  try {
    await syncNow();
  } catch (err) {
    console.warn('Automatische Synchronisierung fehlgeschlagen:', err.message);
  } finally {
    autoSyncInFlight = false;
    onSyncEnd?.();
  }
}
