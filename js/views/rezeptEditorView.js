import * as db from '../db.js';
import { el, confirmDialog } from '../util.js';
import { setHeader, navigate, goBack, showToast } from '../ui.js';
import { cameraIconSvg, closeIconSvg, downloadIconSvg } from '../icons.js';
import { recipeToCsv } from '../csv.js';
import {
  STEP_ORDER,
  STEP_LABELS,
  createRecipe,
  createEmptySection,
  duplicateRecipe,
  generateId,
} from '../models.js';

export async function renderRezeptEditor(main, id) {
  const isNew = !id;
  let recipe = isNew ? createRecipe('Neues Rezept') : await db.getRecipe(id);

  if (!recipe) {
    main.append(el('div', { class: 'empty-state' }, 'Rezept nicht gefunden.'));
    return;
  }
  // Tiefe Kopie, damit Änderungen erst beim Speichern übernommen werden.
  recipe = JSON.parse(JSON.stringify(recipe));

  const body = el('div', {});
  main.append(body);

  setHeader({
    title: isNew ? 'Neues Rezept' : 'Rezept bearbeiten',
    back: () => goBack('#/rezepte'),
    action: {
      label: 'Speichern',
      onClick: async () => {
        if (!recipe.name.trim()) {
          showToast('Bitte einen Namen eingeben.');
          return;
        }
        await db.saveRecipe(recipe);
        showToast('Rezept gespeichert.');
        navigate('#/rezept/' + recipe.id);
      },
    },
  });

  function renderBody() {
    body.innerHTML = '';

    body.append(
      el('div', { class: 'field' }, [
        el('label', {}, 'Name'),
        el('input', {
          type: 'text',
          value: recipe.name,
          oninput: (e) => {
            recipe.name = e.target.value;
          },
        }),
      ]),
      el('div', { class: 'field' }, [
        el('label', {}, 'Beschreibung (optional)'),
        el('textarea', {
          oninput: (e) => {
            recipe.beschreibung = e.target.value;
          },
        }, recipe.beschreibung || ''),
      ])
    );

    for (const stepKey of STEP_ORDER) {
      body.append(renderStep(stepKey));
    }

    if (!isNew) {
      body.append(
        el('div', { class: 'field', style: 'margin-top:28px; display:flex; gap:10px; flex-direction:column;' }, [
          el(
            'button',
            {
              class: 'btn secondary block',
              onclick: async () => {
                const name = window.prompt('Name des neuen Rezepts:', recipe.name + ' (Kopie)');
                if (!name) return;
                const copy = duplicateRecipe(recipe, name);
                await db.saveRecipe(copy);
                showToast('Rezept dupliziert.');
                navigate('#/rezept/' + copy.id);
              },
            },
            'Rezept duplizieren'
          ),
          el(
            'button',
            {
              class: 'btn secondary block',
              onclick: () => {
                const csv = recipeToCsv(recipe);
                const filename = (recipe.name.trim() || 'rezept').replace(/[^\w\-äöüÄÖÜß]+/g, '_') + '.csv';
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.append(a);
                a.click();
                a.remove();
                setTimeout(() => URL.revokeObjectURL(url), 5000);
              },
            },
            [el('span', { html: downloadIconSvg(18) }), 'Als CSV exportieren']
          ),
          el(
            'button',
            {
              class: 'btn danger block',
              onclick: async () => {
                if (!confirmDialog('Rezept "' + recipe.name + '" wirklich löschen? Bereits gestartete Batches bleiben erhalten.')) return;
                await db.deleteRecipe(recipe.id);
                showToast('Rezept gelöscht.');
                navigate('#/rezepte');
              },
            },
            'Rezept löschen'
          ),
        ])
      );
    }
  }

  function renderStep(stepKey) {
    const step = recipe.steps[stepKey];
    const details = el('details', { class: 'card', open: true });
    const summary = el('summary', { style: 'font-weight:600; cursor:pointer;' }, STEP_LABELS[stepKey]);
    details.append(summary);

    for (const section of step.sections) {
      details.append(renderSection(stepKey, section));
    }

    details.append(
      el(
        'button',
        {
          class: 'btn secondary',
          style: 'margin-top:4px;',
          onclick: () => {
            step.sections.push(createEmptySection());
            renderBody();
          },
        },
        '+ Abschnitt hinzufügen'
      )
    );

    return details;
  }

  function renderSection(stepKey, section) {
    const step = recipe.steps[stepKey];
    const block = el('div', { class: 'section-block' });

    const headerRow = el('div', { class: 'section-block-header' }, [
      el('input', {
        type: 'text',
        placeholder: 'Abschnittsname (optional)',
        value: section.title || '',
        oninput: (e) => {
          section.title = e.target.value || null;
        },
      }),
    ]);
    if (step.sections.length > 1) {
      headerRow.append(
        el('button', {
          class: 'remove-btn',
          'aria-label': 'Abschnitt entfernen',
          html: closeIconSvg(18),
          onclick: () => {
            if (!confirmDialog('Abschnitt inkl. aller Punkte entfernen?')) return;
            step.sections = step.sections.filter((s) => s !== section);
            renderBody();
          },
        })
      );
    }
    block.append(headerRow);

    for (const item of section.items) {
      block.append(renderItemRow(section, item));
    }

    block.append(
      el(
        'button',
        {
          class: 'btn secondary',
          onclick: () => {
            section.items.push({
              id: generateId(),
              label: '',
              wantsPhoto: false,
              wantsValue: false,
              valueUnit: '',
            });
            renderBody();
          },
        },
        '+ Punkt hinzufügen'
      )
    );

    return block;
  }

  function renderItemRow(section, item) {
    const row = el('div', { class: 'item-edit-row' }, [
      el('input', {
        type: 'text',
        placeholder: 'Checklistenpunkt',
        value: item.label,
        oninput: (e) => {
          item.label = e.target.value;
        },
      }),
      el('button', {
        class: 'remove-btn',
        title: item.wantsPhoto ? 'Foto-Hinweis: an' : 'Foto-Hinweis: aus',
        style: item.wantsPhoto ? 'color:var(--accent);' : 'color:var(--text-muted);',
        html: cameraIconSvg(item.wantsPhoto),
        onclick: () => {
          item.wantsPhoto = !item.wantsPhoto;
          renderBody();
        },
      }),
      el(
        'button',
        {
          class: 'remove-btn',
          title: item.wantsValue ? 'Messwert-Hinweis: an' : 'Messwert-Hinweis: aus',
          style: item.wantsValue ? 'color:var(--accent);' : 'color:var(--text-muted);',
          onclick: () => {
            item.wantsValue = !item.wantsValue;
            renderBody();
          },
        },
        '#'
      ),
      el('button', {
        class: 'remove-btn',
        'aria-label': 'Punkt entfernen',
        html: closeIconSvg(18),
        onclick: () => {
          section.items = section.items.filter((i) => i !== item);
          renderBody();
        },
      }),
    ]);
    if (item.wantsValue) {
      const unitInput = el('input', {
        type: 'text',
        placeholder: 'Einheit z.B. g, %',
        value: item.valueUnit || '',
        style: 'max-width:110px; border:1px solid var(--border); border-radius:8px; padding:9px 10px; font-size:0.92rem;',
        oninput: (e) => {
          item.valueUnit = e.target.value;
        },
      });
      row.insertBefore(unitInput, row.lastChild);
    }
    return row;
  }

  renderBody();
}
