import * as db from '../db.js';
import { el } from '../util.js';
import { setHeader } from '../ui.js';
import { renderBatchCard } from './batchListView.js';
import { archiveIconSvg } from '../icons.js';

export async function renderArchiv(main) {
  setHeader({ title: 'Archiv' });

  const batches = await db.getBatchesByStatus('completed');

  if (batches.length === 0) {
    main.append(
      el('div', { class: 'empty-state' }, [
        el('span', { class: 'icon-badge', html: archiveIconSvg(28) }),
        el('div', {}, 'Noch kein abgeschlossener Batch.'),
      ])
    );
    return;
  }

  for (const batch of batches) {
    main.append(renderBatchCard(batch));
  }
}
