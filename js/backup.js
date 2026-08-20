import * as db from './db.js';
import { createZip, readZip } from './zip.js';

const LAST_BACKUP_KEY = 'letzterBackupAt';

export function getLastBackupAt() {
  return localStorage.getItem(LAST_BACKUP_KEY);
}

function setLastBackupAt(iso) {
  localStorage.setItem(LAST_BACKUP_KEY, iso);
}

async function blobToUint8Array(blob) {
  const buf = await blob.arrayBuffer();
  return new Uint8Array(buf);
}

function dateStamp() {
  return new Date().toISOString().slice(0, 10);
}

export async function buildBackupZip() {
  const recipes = await db.getAllRecipes();
  const batches = await db.getAllBatches();
  const photos = await db.getAllPhotos();

  const manifest = {
    version: 1,
    exportedAt: new Date().toISOString(),
    recipes,
    batches,
    photos: photos.map((p) => ({
      id: p.id,
      batchId: p.batchId,
      stepKey: p.stepKey,
      itemId: p.itemId,
      width: p.width,
      height: p.height,
      createdAt: p.createdAt,
      file: `photos/${p.id}.jpg`,
    })),
  };

  const entries = [
    { name: 'manifest.json', data: new TextEncoder().encode(JSON.stringify(manifest, null, 2)) },
  ];
  for (const p of photos) {
    entries.push({ name: `photos/${p.id}.jpg`, data: await blobToUint8Array(p.blob) });
  }

  return createZip(entries);
}

// Löst je nach Möglichkeit des Browsers die native Teilen-Funktion (iOS) oder
// einen Download-Link (Desktop) aus. Manche Browser (z. B. Chrome am Desktop)
// melden zwar per canShare(), dass Teilen grundsätzlich ginge, lehnen den
// eigentlichen Teilen-Aufruf dann aber ab (z. B. weil kein Freigabeziel für
// .zip-Dateien registriert ist) - in diesem Fall auf den normalen Download
// zurückfallen, statt einen Fehler zu zeigen.
export async function shareOrDownloadBackup(blob) {
  const filename = `gin-backup-${dateStamp()}.zip`;
  const file = new File([blob], filename, { type: 'application/zip' });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      setLastBackupAt(new Date().toISOString());
      return;
    } catch (err) {
      if (err && err.name === 'AbortError') {
        throw new Error('Abgebrochen.');
      }
      // sonst: unten auf den Download-Link zurückfallen
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  setLastBackupAt(new Date().toISOString());
}

export async function importBackupFile(file) {
  const entries = await readZip(await file.arrayBuffer());
  const manifestEntry = entries.find((e) => e.name === 'manifest.json');
  if (!manifestEntry) throw new Error('manifest.json fehlt in der ZIP-Datei.');

  const manifest = JSON.parse(new TextDecoder().decode(manifestEntry.data));
  const photoFiles = new Map(entries.filter((e) => e.name.startsWith('photos/')).map((e) => [e.name, e.data]));

  const photos = manifest.photos.map((meta) => {
    const data = photoFiles.get(meta.file);
    if (!data) throw new Error(`Foto-Datei ${meta.file} fehlt im Archiv.`);
    return {
      id: meta.id,
      // ältere Backups nutzten noch "chargeId" statt "batchId"
      batchId: meta.batchId || meta.chargeId,
      stepKey: meta.stepKey,
      itemId: meta.itemId,
      width: meta.width,
      height: meta.height,
      createdAt: meta.createdAt,
      blob: new Blob([data], { type: 'image/jpeg' }),
    };
  });

  await db.replaceAllData({ recipes: manifest.recipes, batches: manifest.batches, photos });
}
