// Feste Reihenfolge der Produktionsschritte, überall in der App verwendet.
export const STEP_ORDER = [
  'vorbereitung',
  'mazeration',
  'destillation',
  'verduennen',
  'nachbereitung',
];

export const STEP_LABELS = {
  vorbereitung: 'Vorbereitung',
  mazeration: 'Mazeration',
  destillation: 'Destillation',
  verduennen: 'Verdünnen',
  nachbereitung: 'Nachbereitung',
};

export function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

export function makeItem(label, opts = {}) {
  return {
    id: generateId(),
    label,
    wantsPhoto: !!opts.wantsPhoto,
    wantsValue: !!opts.wantsValue,
    valueUnit: opts.valueUnit || '',
  };
}

export function makeSection(title, items) {
  return { id: generateId(), title: title || null, items };
}

export function createEmptySection() {
  return makeSection(null, []);
}

export function createEmptyRecipeSteps() {
  const steps = {};
  for (const key of STEP_ORDER) {
    steps[key] = { sections: [createEmptySection()] };
  }
  return steps;
}

export function createRecipe(name) {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    name: name || 'Neues Rezept',
    beschreibung: '',
    archived: false,
    createdAt: now,
    updatedAt: now,
    steps: createEmptyRecipeSteps(),
  };
}

// Erstellt ein neues Rezept als Kopie eines bestehenden (für "Rezept duplizieren").
export function duplicateRecipe(recipe, newName) {
  const now = new Date().toISOString();
  const steps = {};
  for (const key of STEP_ORDER) {
    steps[key] = {
      sections: recipe.steps[key].sections.map((section) =>
        makeSection(
          section.title,
          section.items.map((item) =>
            makeItem(item.label, {
              wantsPhoto: item.wantsPhoto,
              wantsValue: item.wantsValue,
              valueUnit: item.valueUnit,
            })
          )
        )
      ),
    };
  }
  return {
    id: generateId(),
    name: newName || recipe.name + ' (Kopie)',
    beschreibung: recipe.beschreibung,
    archived: false,
    createdAt: now,
    updatedAt: now,
    steps,
  };
}

function stepInstanceFromTemplate(stepKey, stepTemplate) {
  return {
    stepKey,
    status: 'pending',
    startedAt: null,
    completedAt: null,
    stepNote: '',
    sections: stepTemplate.sections.map((section) => ({
      title: section.title,
      items: section.items.map((item) => ({
        id: item.id,
        label: item.label,
        wantsPhoto: item.wantsPhoto,
        wantsValue: item.wantsValue,
        valueUnit: item.valueUnit,
        checked: false,
        checkedAt: null,
        note: '',
        value: '',
        photoIds: [],
      })),
    })),
  };
}

// Erstellt einen neuen Batch aus einem Rezept. Die Checklisten werden zu diesem
// Zeitpunkt "eingefroren" (Kopie), damit spätere Rezeptänderungen alte Batches
// nicht nachträglich verändern.
export function createBatchFromRecipe(recipe, label) {
  const now = new Date().toISOString();
  const steps = STEP_ORDER.map((key) => stepInstanceFromTemplate(key, recipe.steps[key]));
  steps[0].status = 'in_progress';
  steps[0].startedAt = now;
  return {
    id: generateId(),
    recipeId: recipe.id,
    recipeNameSnapshot: recipe.name,
    label: label || '',
    status: 'in_progress',
    currentStepIndex: 0,
    startedAt: now,
    completedAt: null,
    steps,
  };
}

export function defaultBatchLabel(recipe, startedAt) {
  const date = new Date(startedAt || Date.now());
  const dateStr = date.toLocaleDateString('de-DE');
  return `Batch – ${recipe.name} – ${dateStr}`;
}

