// Kleine gemeinsame UI-Helfer (Kopfzeile, Navigation, Toast), die von app.js
// initialisiert und von allen views/*.js genutzt werden.
import { el } from './util.js';

let headerEl = null;

export function initUi(header) {
  headerEl = header;
}

export function setHeader({ title, back, action }) {
  headerEl.innerHTML = '';
  if (back) {
    headerEl.append(el('button', { class: 'back', 'aria-label': 'Zurück', onclick: back }, '‹'));
  }
  headerEl.append(el('h1', {}, title));
  if (action) {
    headerEl.append(el('button', { class: 'action', onclick: action.onClick }, action.label));
  }
}

export function navigate(hash) {
  location.hash = hash;
}

export function goBack(fallbackHash) {
  if (history.length > 1) {
    history.back();
  } else {
    navigate(fallbackHash);
  }
}

export function showToast(message) {
  const toast = el('div', { class: 'toast' }, message);
  document.body.append(toast);
  setTimeout(() => toast.remove(), 2200);
}
