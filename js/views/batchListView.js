import * as db from '../db.js';
import { el, formatDate } from '../util.js';
import { setHeader, navigate } from '../ui.js';
import { STEP_ORDER, STEP_LABELS } from '../models.js';
import { flaskIconSvg } from '../icons.js';

export function renderBatchCard(batch) {
  const stepNum = batch.currentStepIndex + 1;
  const stepLabel = STEP_LABELS[STEP_ORDER[batch.currentStepIndex]];
  const pct = batch.status === 'completed' ? 100 : Math.round((batch.currentStepIndex / STEP_ORDER.length) * 100);

  return el(
    'a',
    { class: 'card link', href: '#/batch/' + batch.id },
    [
      el('div', { style: 'display:flex; justify-content:space-between; gap:8px; align-items:start;' }, [
        el('div', { class: 'card-title' }, batch.label || batch.recipeNameSnapshot),
        el(
          'span',
          { class: 'badge' + (batch.status === 'completed' ? ' done' : '') },
          batch.status === 'completed' ? 'Fertig' : `Schritt ${stepNum}/${STEP_ORDER.length}`
        ),
      ]),
      el(
        'div',
        { class: 'card-meta' },
        batch.status === 'completed'
          ? `${batch.recipeNameSnapshot} · abgeschlossen ${formatDate(batch.completedAt)}`
          : `${batch.recipeNameSnapshot} · aktuell: ${stepLabel} · gestartet ${formatDate(batch.startedAt)}`
      ),
      el('div', { class: 'progress-bar' }, [el('span', { style: `width:${pct}%` })]),
    ]
  );
}

export async function renderBatchList(main) {
  setHeader({
    title: 'Batches',
    action: { label: '+ Neu', onClick: () => navigate('#/batch/neu') },
  });

  const batches = await db.getAllBatches();
  const active = batches.filter((b) => b.status !== 'completed');
  const done = batches.filter((b) => b.status === 'completed');
  const ordered = [...active, ...done];

  if (ordered.length === 0) {
    main.append(
      el('div', { class: 'empty-state' }, [
        el('span', { class: 'icon-badge', html: flaskIconSvg(28) }),
        el('div', {}, 'Noch kein Batch gestartet.'),
        el(
          'button',
          { class: 'btn primary', style: 'margin-top:16px;', onclick: () => navigate('#/batch/neu') },
          '+ Neuen Batch starten'
        ),
      ])
    );
    return;
  }

  for (const batch of ordered) {
    main.append(renderBatchCard(batch));
  }
}
