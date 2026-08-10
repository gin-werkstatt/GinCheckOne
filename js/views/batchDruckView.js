import * as db from '../db.js';
import { el, formatDate, formatDateTime } from '../util.js';
import { setHeader, goBack } from '../ui.js';
import { STEP_ORDER, STEP_LABELS } from '../models.js';
import { photoObjectUrl } from '../photo.js';
import { printerIconSvg } from '../icons.js';

export async function renderBatchDruck(main, batchId) {
  const batch = await db.getBatch(batchId);
  if (!batch) {
    setHeader({ title: 'Drucken', back: () => goBack('#/batch/' + batchId) });
    main.append(el('div', { class: 'empty-state' }, 'Batch nicht gefunden.'));
    return;
  }

  setHeader({
    title: 'Checkliste',
    back: () => goBack('#/batch/' + batchId),
    action: {
      label: el('span', { class: 'icon-inline', style: 'gap:6px;' }, [
        el('span', { html: printerIconSvg(17) }),
        'Drucken',
      ]),
      onClick: () => window.print(),
    },
  });

  const photos = await db.getPhotosByBatch(batchId);
  const photosFor = (itemId) => photos.filter((p) => p.itemId === itemId);

  const doc = el('div', { class: 'print-doc' });

  doc.append(
    el('h2', {}, batch.label || batch.recipeNameSnapshot),
    el('p', { class: 'card-meta' }, [
      `Rezept: ${batch.recipeNameSnapshot}`,
      el('br'),
      `Gestartet: ${formatDate(batch.startedAt)}`,
      batch.completedAt ? el('span', {}, [el('br'), `Abgeschlossen: ${formatDate(batch.completedAt)}`]) : null,
    ])
  );

  STEP_ORDER.forEach((stepKey, index) => {
    const step = batch.steps[index];
    const heading = el('h3', { class: 'print-step-heading' }, [
      STEP_LABELS[stepKey],
      step.completedAt ? el('span', { class: 'card-meta' }, ' – ' + formatDate(step.completedAt)) : null,
    ]);
    doc.append(heading);

    if (step.status === 'pending') {
      doc.append(el('p', { class: 'card-meta' }, 'nicht begonnen'));
      return;
    }

    for (const section of step.sections) {
      if (section.title) {
        doc.append(el('div', { class: 'print-section-title' }, section.title));
      }
      for (const item of section.items) {
        const linePieces = [item.checked ? '☑' : '☐', ' ', item.label];
        if (item.value) linePieces.push(`  →  ${item.value}${item.valueUnit ? ' ' + item.valueUnit : ''}`);
        const line = el('div', { class: 'print-item' }, linePieces.join(''));
        const extras = [];
        if (item.note) extras.push(el('div', { class: 'print-note' }, 'Notiz: ' + item.note));
        const itemPhotos = photosFor(item.id);
        if (itemPhotos.length) {
          const row = el('div', { class: 'print-photo-row' });
          for (const p of itemPhotos) row.append(el('img', { src: photoObjectUrl(p) }));
          extras.push(row);
        }
        doc.append(el('div', { class: 'print-item-block' }, [line, ...extras]));
      }
    }

    if (step.stepNote) {
      doc.append(el('div', { class: 'print-note' }, 'Notiz zum Schritt: ' + step.stepNote));
    }
  });

  doc.append(el('p', { class: 'card-meta', style: 'margin-top:24px;' }, 'Erstellt am ' + formatDateTime(new Date().toISOString())));

  main.append(doc);
}
