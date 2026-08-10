// Kamera-Aufnahme + client-seitige Verkleinerung/Komprimierung, bevor ein
// Foto in IndexedDB gespeichert wird (spart Speicherplatz auf dem iPhone).
import { generateId } from './models.js';
import { savePhoto, deletePhoto } from './db.js';

const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.7;

export function pickPhotoFile() {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.style.display = 'none';
    input.addEventListener('change', () => {
      resolve(input.files && input.files[0] ? input.files[0] : null);
      input.remove();
    });
    document.body.append(input);
    input.click();
  });
}

async function compressImage(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, width, height);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
  return { blob, width, height };
}

export async function addPhoto({ batchId, stepKey, itemId, file }) {
  const { blob, width, height } = await compressImage(file);
  const photo = {
    id: generateId(),
    batchId,
    stepKey,
    itemId: itemId || null,
    blob,
    width,
    height,
    createdAt: new Date().toISOString(),
  };
  await savePhoto(photo);
  return photo;
}

export async function removePhoto(photoId) {
  await deletePhoto(photoId);
}

export function photoObjectUrl(photo) {
  return URL.createObjectURL(photo.blob);
}
