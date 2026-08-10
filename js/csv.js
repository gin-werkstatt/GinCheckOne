import { STEP_ORDER, STEP_LABELS, createRecipe, makeItem, makeSection } from './models.js';

function detectDelimiter(sampleLine) {
  const commaCount = (sampleLine.match(/,/g) || []).length;
  const semiCount = (sampleLine.match(/;/g) || []).length;
  return semiCount > commaCount ? ';' : ',';
}

// Einfacher CSV-Parser (RFC4180-artig): Komma oder Semikolon als Trenner
// (automatisch erkannt), Anführungszeichen zum Maskieren von Kommas/Umbrüchen.
// Gibt ein Array von Objekten zurück, ein Eintrag pro Datenzeile, Schlüssel aus
// der (kleingeschriebenen) Kopfzeile.
export function parseCsv(text) {
  const clean = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const firstLineEnd = clean.indexOf('\n');
  const firstLine = firstLineEnd === -1 ? clean : clean.slice(0, firstLineEnd);
  const delimiter = detectDelimiter(firstLine);

  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = '';
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      pushField();
    } else if (ch === '\n') {
      pushRow();
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) pushRow();

  const nonEmptyRows = rows.filter((r) => r.some((cell) => cell.trim() !== ''));
  if (nonEmptyRows.length === 0) return [];

  const header = nonEmptyRows[0].map((h) => h.trim().toLowerCase());
  return nonEmptyRows.slice(1).map((r) => {
    const obj = {};
    header.forEach((key, idx) => {
      obj[key] = (r[idx] || '').trim();
    });
    return obj;
  });
}

const STEP_KEY_BY_ALIAS = (() => {
  const map = {};
  for (const key of STEP_ORDER) {
    map[key] = key;
    map[STEP_LABELS[key].toLowerCase()] = key;
  }
  return map;
})();

function resolveStepKey(raw) {
  return STEP_KEY_BY_ALIAS[(raw || '').trim().toLowerCase()] || null;
}

const TRUTHY_PHOTO = new Set(['ja', 'j', 'x', '1', 'true', 'wahr']);

// Baut aus geparsten CSV-Zeilen (Spalten: Schritt, Abschnitt, Punkt, Einheit,
// Foto) ein vollständiges Rezept-Objekt, wie es der Rezept-Editor auch anlegt.
export function buildRecipeFromCsvRows(name, beschreibung, rows) {
  if (!name || !name.trim()) throw new Error('Bitte einen Rezeptnamen angeben.');
  if (!rows || rows.length === 0) throw new Error('Die CSV-Datei enthält keine Zeilen.');

  const recipe = createRecipe(name.trim());
  recipe.beschreibung = beschreibung ? beschreibung.trim() : '';
  for (const key of STEP_ORDER) {
    recipe.steps[key].sections = [];
  }

  rows.forEach((row, index) => {
    const lineNo = index + 2; // 1 für Kopfzeile, 1 weil 1-basiert
    const stepKey = resolveStepKey(row.schritt);
    if (!stepKey) {
      throw new Error(
        `Zeile ${lineNo}: unbekannter Schritt "${row.schritt || ''}". Erlaubt: ` +
          STEP_ORDER.map((k) => STEP_LABELS[k]).join(', ')
      );
    }
    const label = (row.punkt || '').trim();
    if (!label) {
      throw new Error(`Zeile ${lineNo}: Spalte "Punkt" ist leer.`);
    }
    const sectionTitle = (row.abschnitt || '').trim() || null;
    const step = recipe.steps[stepKey];
    let section = step.sections.find((s) => (s.title || null) === sectionTitle);
    if (!section) {
      section = makeSection(sectionTitle, []);
      step.sections.push(section);
    }
    const unit = (row.einheit || '').trim();
    const wantsPhoto = TRUTHY_PHOTO.has((row.foto || '').trim().toLowerCase());
    section.items.push(makeItem(label, { wantsValue: !!unit, valueUnit: unit, wantsPhoto }));
  });

  for (const key of STEP_ORDER) {
    if (recipe.steps[key].sections.length === 0) {
      recipe.steps[key].sections.push(makeSection(null, []));
    }
  }

  return recipe;
}

export function csvTemplate() {
  const header = 'Schritt;Abschnitt;Punkt;Einheit;Foto';
  const example = [
    'Vorbereitung;;Beispiel-Punkt ohne Wert und Foto;;',
    'Mazeration;Zutaten mazerieren;Beispiel-Zutat A;g;',
    'Mazeration;Zutaten mazerieren;Beispiel-Zutat B mit Foto-Beleg;g;ja',
    'Destillation;Prüfung vor dem Brennvorgang;Beispiel-Prüfpunkt;;',
    'Verdünnen;;Beispiel-Messwert;%;ja',
    'Nachbereitung;;Beispiel-Abschlusspunkt;;',
  ];
  return [header, ...example].join('\n');
}
