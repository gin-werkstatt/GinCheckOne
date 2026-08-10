import * as db from '../db.js';
import { el } from '../util.js';
import { setHeader, goBack, showToast } from '../ui.js';
import { STEP_ORDER, STEP_LABELS } from '../models.js';
import { pickPhotoFile, addPhoto, removePhoto, photoObjectUrl } from '../photo.js';
import { cameraIconSvg } from '../icons.js';

let saveTimer = null;
function scheduleSave(batch) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => db.saveBatch(batch), 400);
}

function recomputeCurrentStep(batch) {
  const firstOpen = batch.steps.findIndex((s) => s.status !== 'done');
  if (firstOpen === -1) {
    batch.status = 'completed';
    batch.completedAt = batch.completedAt || new Date().toISOString();
    batch.currentStepIndex = batch.steps.length - 1;
  } else {
    batch.status = 'in_progress';
    batch.completedAt = null;
    batch.currentStepIndex = firstOpen;
  }
}

function showLightbox(url, onDelete) {
  const overlay = el('div', { class: 'lightbox' });
  const close = () => overlay.remove();
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  overlay.append(
    el('img', { src: url }),
    el('div', { class: 'lightbox-actions' }, [
      el('button', { class: 'btn secondary', onclick: close }, 'Schließen'),
      el(
        'button',
        {
          class: 'btn danger',
          onclick: async () => {
            close();
            await onDelete();
          },
        },
        'Foto löschen'
      ),
    ])
  );
  document.body.append(overlay);
}

export async function renderCheckliste(main, batchId, stepIndex) {
  const batch = await db.getBatch(batchId);
  if (!batch || !batch.steps[stepIndex]) {
    setHeader({ title: 'Schritt', back: () => goBack('#/batch/' + batchId) });
    main.append(el('div', { class: 'empty-state' }, 'Schritt nicht gefunden.'));
    return;
  }

  const step = batch.steps[stepIndex];
  const stepKey = STEP_ORDER[stepIndex];

  if (step.status === 'pending') {
    step.status = 'in_progress';
    step.startedAt = new Date().toISOString();
    await db.saveBatch(batch);
  }

  let photos = await db.getPhotosByBatch(batchId);

  setHeader({
    title: STEP_LABELS[stepKey],
    back: () => goBack('#/batch/' + batchId),
  });

  const body = el('div', {});
  main.append(body);

  function photosFor(itemId) {
    return photos.filter((p) => p.itemId === itemId);
  }

  function render() {
    body.innerHTML = '';

    body.append(
      el('div', { class: 'field' }, [
        el('label', {}, 'Notiz zum Schritt (optional)'),
        el('textarea', {
          oninput: (e) => {
            step.stepNote = e.target.value;
            scheduleSave(batch);
          },
        }, step.stepNote || ''),
      ])
    );

    for (const section of step.sections) {
      if (section.title) {
        body.append(el('div', { class: 'section-title' }, section.title));
      }
      const list = el('div', { class: 'card' });
      for (const item of section.items) {
        list.append(renderItem(item));
      }
      body.append(list);
    }

    body.append(
      el(
        'button',
        {
          class: 'btn ' + (step.status === 'done' ? 'secondary' : 'primary') + ' block',
          style: 'margin-top:8px;',
          onclick: async () => {
            step.status = step.status === 'done' ? 'in_progress' : 'done';
            step.completedAt = step.status === 'done' ? new Date().toISOString() : null;
            recomputeCurrentStep(batch);
            await db.saveBatch(batch);
            showToast(step.status === 'done' ? 'Schritt abgeschlossen.' : 'Schritt wieder geöffnet.');
            render();
          },
        },
        step.status === 'done' ? 'Als offen markieren' : 'Schritt abschließen'
      )
    );
  }

  function renderItem(item) {
    const row = el('div', { class: 'checklist-item' + (item.checked ? ' checked' : '') });
    const checkboxId = 'chk-' + item.id;
    const checkbox = el('input', {
      type: 'checkbox',
      id: checkboxId,
      checked: item.checked,
      onchange: async (e) => {
        item.checked = e.target.checked;
        item.checkedAt = item.checked ? new Date().toISOString() : null;
        await db.saveBatch(batch);
        row.classList.toggle('checked', item.checked);
      },
    });

    const extra = el('div', { class: 'item-extra' });

    if (item.wantsValue) {
      extra.append(
        el('input', {
          type: 'text',
          inputmode: 'decimal',
          placeholder: 'Wert' + (item.valueUnit ? ' (' + item.valueUnit + ')' : ''),
          value: item.value || '',
          oninput: (e) => {
            item.value = e.target.value;
            scheduleSave(batch);
          },
        })
      );
    }

    const photoRow = el('div', { class: 'photo-row' });
    function renderPhotoRow() {
      photoRow.innerHTML = '';
      for (const photo of photosFor(item.id)) {
        const url = photoObjectUrl(photo);
        const thumb = el('img', {
          class: 'photo-thumb',
          src: url,
          onclick: () => {
            showLightbox(url, async () => {
              await removePhoto(photo.id);
              item.photoIds = item.photoIds.filter((id) => id !== photo.id);
              photos = photos.filter((p) => p.id !== photo.id);
              await db.saveBatch(batch);
              renderPhotoRow();
            });
          },
        });
        photoRow.append(thumb);
      }
      if (item.wantsPhoto) {
        photoRow.append(
          el('button', {
            class: 'photo-add-btn',
            'aria-label': 'Foto hinzufügen',
            html: cameraIconSvg(true),
            onclick: async () => {
              const file = await pickPhotoFile();
              if (!file) return;
              const photo = await addPhoto({ batchId, stepKey, itemId: item.id, file });
              photos.push(photo);
              item.photoIds.push(photo.id);
              await db.saveBatch(batch);
              renderPhotoRow();
            },
          })
        );
      }
    }
    renderPhotoRow();

    row.append(
      checkbox,
      el('div', { class: 'item-body' }, [
        el('label', { class: 'item-label', for: checkboxId }, item.label),
        extra,
        photoRow,
      ])
    );
    return row;
  }

  render();
}
