import * as db from '../db.js';
import { el } from '../util.js';
import { setHeader, navigate, goBack, showToast } from '../ui.js';
import { createBatchFromRecipe, defaultBatchLabel } from '../models.js';
import { bookIconSvg } from '../icons.js';

export async function renderBatchNeu(main) {
  setHeader({ title: 'Neuer Batch', back: () => goBack('#/batches') });

  const recipes = (await db.getAllRecipes()).sort((a, b) => a.name.localeCompare(b.name, 'de'));

  if (recipes.length === 0) {
    main.append(
      el('div', { class: 'empty-state' }, [
        el('span', { class: 'icon-badge', html: bookIconSvg(28) }),
        el('div', {}, 'Erst ein Rezept anlegen, bevor ein Batch gestartet werden kann.'),
        el('button', { class: 'btn primary', style: 'margin-top:16px;', onclick: () => navigate('#/rezept/neu') }, '+ Rezept anlegen'),
      ])
    );
    return;
  }

  const body = el('div', {});
  main.append(body);

  function renderRecipePicker() {
    body.innerHTML = '';
    body.append(el('p', { class: 'hint' }, 'Rezept auswählen, um den neuen Batch zu starten:'));
    for (const recipe of recipes) {
      body.append(
        el(
          'button',
          {
            class: 'card link',
            style: 'width:100%; text-align:left; border:1px solid var(--border); font: inherit;',
            onclick: () => renderNameForm(recipe),
          },
          [el('div', { class: 'card-title' }, recipe.name)]
        )
      );
    }
  }

  function renderNameForm(recipe) {
    body.innerHTML = '';

    const nameInput = el('input', {
      type: 'text',
      value: defaultBatchLabel(recipe, new Date().toISOString()),
    });

    body.append(
      el('div', { class: 'field' }, [
        el('label', {}, 'Name des Batches'),
        nameInput,
      ]),
      el('p', { class: 'hint' }, 'Rezept: ' + recipe.name),
      el(
        'button',
        {
          class: 'btn primary block',
          style: 'margin-top:8px;',
          onclick: async () => {
            const name = nameInput.value.trim();
            if (!name) {
              showToast('Bitte einen Namen eingeben.');
              nameInput.focus();
              return;
            }
            const batch = createBatchFromRecipe(recipe);
            batch.label = name;
            await db.saveBatch(batch);
            showToast('Batch gestartet.');
            navigate('#/batch/' + batch.id);
          },
        },
        'Batch starten'
      ),
      el(
        'button',
        {
          class: 'btn secondary block',
          style: 'margin-top:8px;',
          onclick: () => renderRecipePicker(),
        },
        '‹ Anderes Rezept wählen'
      )
    );

    nameInput.focus();
    nameInput.select();
  }

  renderRecipePicker();
}
