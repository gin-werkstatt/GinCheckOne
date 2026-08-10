import * as db from '../db.js';
import { el } from '../util.js';
import { setHeader, navigate, goBack, showToast } from '../ui.js';
import { parseCsv, buildRecipeFromCsvRows, csvTemplate } from '../csv.js';

export async function renderRezeptImport(main) {
  setHeader({ title: 'Rezept importieren', back: () => goBack('#/rezepte') });

  let parsedRows = null;

  const nameInput = el('input', { type: 'text', placeholder: 'z. B. Mein Gin (Kurzname)' });
  const beschreibungInput = el('textarea', {});
  const statusEl = el('p', { class: 'hint' }, 'Noch keine Datei ausgewählt.');

  const saveBtn = el(
    'button',
    {
      class: 'btn primary block',
      style: 'margin-top:6px;',
      onclick: async () => {
        if (!parsedRows) return;
        try {
          const recipe = buildRecipeFromCsvRows(nameInput.value, beschreibungInput.value, parsedRows);
          await db.saveRecipe(recipe);
          showToast('Rezept importiert.');
          navigate('#/rezept/' + recipe.id);
        } catch (err) {
          showToast(err.message);
        }
      },
    },
    'Rezept speichern'
  );
  saveBtn.disabled = true;

  const fileInput = el('input', {
    type: 'file',
    accept: '.csv,text/csv',
    onchange: async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const rows = parseCsv(text);
        if (rows.length === 0) throw new Error('Keine Zeilen in der Datei gefunden.');
        parsedRows = rows;
        statusEl.textContent = `"${file.name}": ${rows.length} Checklistenpunkte erkannt. Name/Beschreibung prüfen und speichern.`;
        statusEl.style.color = '';
        saveBtn.disabled = false;
        if (!nameInput.value.trim()) {
          nameInput.value = file.name.replace(/\.csv$/i, '');
        }
      } catch (err) {
        parsedRows = null;
        saveBtn.disabled = true;
        statusEl.textContent = 'Fehler beim Lesen der Datei: ' + err.message;
        statusEl.style.color = 'var(--danger)';
      }
    },
  });

  const templateBtn = el(
    'button',
    {
      class: 'btn secondary block',
      onclick: () => {
        const blob = new Blob([csvTemplate()], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'rezept-vorlage.csv';
        document.body.append(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      },
    },
    'CSV-Vorlage herunterladen'
  );

  main.append(
    el('div', { class: 'field' }, [el('label', {}, 'Name des Rezepts'), nameInput]),
    el('div', { class: 'field' }, [el('label', {}, 'Beschreibung (optional)'), beschreibungInput]),
    el('div', { class: 'field' }, [el('label', {}, 'CSV-Datei auswählen'), fileInput, statusEl]),
    saveBtn,
    el('div', { class: 'card', style: 'margin-top:24px;' }, [
      el('div', { class: 'card-title' }, 'So ist die CSV-Datei aufgebaut'),
      el(
        'p',
        { class: 'hint' },
        'Eine Zeile pro Checklistenpunkt, mit Kopfzeile. Spalten (Komma oder Semikolon getrennt):'
      ),
      el('ul', { style: 'margin:8px 0; padding-left:20px; font-size:0.88rem; color:var(--text-muted);' }, [
        el('li', {}, [el('strong', {}, 'Schritt'), ' – Vorbereitung, Mazeration, Destillation, Verdünnen oder Nachbereitung']),
        el('li', {}, [el('strong', {}, 'Abschnitt'), ' – optionaler Zwischentitel, darf leer sein']),
        el('li', {}, [el('strong', {}, 'Punkt'), ' – der Text des Checklistenpunkts']),
        el('li', {}, [el('strong', {}, 'Einheit'), ' – z. B. g, kg, L, % – leer lassen, wenn kein Messwert nötig ist']),
        el('li', {}, [el('strong', {}, 'Foto'), ' – "ja" wenn ein Foto-Beleg möglich sein soll, sonst leer lassen']),
      ]),
      el(
        'pre',
        {
          style:
            'white-space:pre-wrap; font-size:0.78rem; background:var(--bg); padding:10px; border-radius:8px; overflow-x:auto; margin:10px 0;',
        },
        csvTemplate()
      ),
      templateBtn,
    ])
  );
}
