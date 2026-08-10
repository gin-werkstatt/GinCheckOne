import * as db from '../db.js';
import { el, formatDate, confirmDialog } from '../util.js';
import { setHeader, navigate, goBack, showToast } from '../ui.js';
import { STEP_ORDER, STEP_LABELS } from '../models.js';
import { editIconSvg, printerIconSvg } from '../icons.js';

function sectionsProgress(step) {
  let total = 0;
  let checked = 0;
  for (const section of step.sections) {
    for (const item of section.items) {
      total++;
      if (item.checked) checked++;
    }
  }
  return { total, checked };
}

export async function renderBatchDetail(main, batchId) {
  const batch = await db.getBatch(batchId);
  if (!batch) {
    setHeader({ title: 'Batch', back: () => goBack('#/batches') });
    main.append(el('div', { class: 'empty-state' }, 'Batch nicht gefunden.'));
    return;
  }

  setHeader({
    title: batch.label || batch.recipeNameSnapshot,
    back: () => goBack('#/batches'),
    action: {
      label: el('span', { class: 'icon-inline', html: editIconSvg(19) }),
      onClick: async () => {
        const newLabel = window.prompt('Name des Batches:', batch.label || batch.recipeNameSnapshot);
        if (newLabel === null) return;
        batch.label = newLabel;
        await db.saveBatch(batch);
        renderBatchDetail(main, batchId);
      },
    },
  });

  main.append(
    el('div', { class: 'card-meta', style: 'margin-bottom:14px;' }, [
      `Rezept: ${batch.recipeNameSnapshot} · gestartet ${formatDate(batch.startedAt)}`,
      batch.completedAt ? el('div', {}, `abgeschlossen ${formatDate(batch.completedAt)}`) : null,
    ])
  );

  const stepper = el('div', { class: 'stepper' });
  STEP_ORDER.forEach((stepKey, index) => {
    const step = batch.steps[index];
    const { total, checked } = sectionsProgress(step);
    const row = el(
      'button',
      {
        class: 'step-row ' + step.status,
        onclick: () => navigate(`#/batch/${batchId}/schritt/${index}`),
      },
      [
        el('div', { class: 'dot' }, step.status === 'done' ? '✓' : String(index + 1)),
        el('div', { class: 'info' }, [
          el('div', { class: 'step-name' }, STEP_LABELS[stepKey]),
          el(
            'div',
            { class: 'step-sub' },
            step.status === 'pending'
              ? 'noch nicht begonnen'
              : `${checked}/${total} erledigt` + (step.completedAt ? ` · abgeschlossen ${formatDate(step.completedAt)}` : '')
          ),
        ]),
      ]
    );
    stepper.append(row);
  });
  main.append(stepper);

  main.append(
    el(
      'button',
      { class: 'btn secondary block', style: 'margin-bottom:10px;', onclick: () => navigate(`#/batch/${batchId}/druck`) },
      [el('span', { html: printerIconSvg(18) }), 'Checkliste anzeigen / drucken']
    )
  );

  main.append(
    el(
      'button',
      {
        class: 'btn danger block',
        onclick: async () => {
          if (!confirmDialog('Diesen Batch inkl. aller Fotos wirklich löschen?')) return;
          await db.deleteBatch(batchId);
          showToast('Batch gelöscht.');
          navigate('#/batches');
        },
      },
      'Batch löschen'
    )
  );
}
