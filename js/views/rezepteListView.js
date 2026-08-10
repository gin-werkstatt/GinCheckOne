import * as db from '../db.js';
import { el, formatDate } from '../util.js';
import { setHeader, navigate } from '../ui.js';
import { bookIconSvg } from '../icons.js';

export async function renderRezepteList(main) {
  setHeader({
    title: 'Rezepte',
    action: { label: '+ Neu', onClick: () => navigate('#/rezept/neu') },
  });

  const recipes = (await db.getAllRecipes()).sort((a, b) => a.name.localeCompare(b.name, 'de'));

  if (recipes.length === 0) {
    main.append(
      el('div', { class: 'empty-state' }, [
        el('span', { class: 'icon-badge', html: bookIconSvg(28) }),
        el('div', {}, 'Noch keine Rezepte vorhanden.'),
        el('div', { style: 'display:flex; flex-direction:column; gap:10px; margin-top:16px; max-width:280px; margin-left:auto; margin-right:auto;' }, [
          el('button', { class: 'btn primary block', onclick: () => navigate('#/rezept/neu') }, '+ Rezept anlegen'),
          el('button', { class: 'btn secondary block', onclick: () => navigate('#/rezept/import') }, 'Aus CSV-Datei importieren'),
        ]),
      ])
    );
    return;
  }

  main.append(
    el(
      'button',
      { class: 'btn secondary block', style: 'margin-bottom:14px;', onclick: () => navigate('#/rezept/import') },
      'Rezept aus CSV-Datei importieren'
    )
  );

  for (const recipe of recipes) {
    const itemCount = Object.values(recipe.steps).reduce(
      (sum, step) => sum + step.sections.reduce((s2, sec) => s2 + sec.items.length, 0),
      0
    );
    main.append(
      el(
        'a',
        {
          class: 'card link',
          href: '#/rezept/' + recipe.id,
        },
        [
          el('div', { class: 'card-title' }, recipe.name),
          el(
            'div',
            { class: 'card-meta' },
            `${itemCount} Checklistenpunkte · zuletzt geändert ${formatDate(recipe.updatedAt)}`
          ),
        ]
      )
    );
  }
}
