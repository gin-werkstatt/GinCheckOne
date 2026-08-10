import * as db from './db.js';
import { el } from './util.js';
import { initUi } from './ui.js';
import { flaskIconSvg, archiveIconSvg, bookIconSvg, downloadIconSvg, warningIconSvg } from './icons.js';
import { renderBatchList } from './views/batchListView.js';
import { renderArchiv } from './views/archivView.js';
import { renderRezepteList } from './views/rezepteListView.js';
import { renderRezeptEditor } from './views/rezeptEditorView.js';
import { renderRezeptImport } from './views/rezeptImportView.js';
import { renderBatchDetail } from './views/batchDetailView.js';
import { renderBatchNeu } from './views/batchNeuView.js';
import { renderCheckliste } from './views/checklisteView.js';
import { renderBatchDruck } from './views/batchDruckView.js';
import { renderBackup } from './views/backupView.js';

const appEl = document.getElementById('app');
const header = el('header', { class: 'topbar' });
const brandRow = el('div', { class: 'brand-row' }, [
  el('img', { class: 'brand-logo', src: 'Logo-Ginwerkstatt.svg', alt: 'Ginwerkstatt' }),
]);
const titleRow = el('div', { class: 'title-row' });
header.append(brandRow, titleRow);
const main = el('main');
const nav = el('nav', { class: 'bottom-nav' });
appEl.append(header, main, nav);
initUi(titleRow);

const TABS = [
  { key: 'batches', label: 'Batches', icon: flaskIconSvg, href: '#/batches' },
  { key: 'archiv', label: 'Archiv', icon: archiveIconSvg, href: '#/archiv' },
  { key: 'rezepte', label: 'Rezepte', icon: bookIconSvg, href: '#/rezepte' },
  { key: 'sichern', label: 'Sichern', icon: downloadIconSvg, href: '#/sichern' },
];

function renderNav(activeKey) {
  nav.innerHTML = '';
  for (const tab of TABS) {
    nav.append(
      el(
        'button',
        {
          class: activeKey === tab.key ? 'active' : '',
          onclick: () => {
            location.hash = tab.href;
          },
        },
        [
          el('span', { class: 'icon', html: tab.icon(22) }),
          el('span', { class: 'label' }, tab.label),
        ]
      )
    );
  }
}

function parseRoute(hash) {
  const path = (hash || '#/batches').replace(/^#/, '');
  return path.split('/').filter(Boolean);
}

async function router() {
  const [root, a, b, c] = parseRoute(location.hash);
  main.innerHTML = '';

  try {
    if (!root || root === 'batches') {
      renderNav('batches');
      await renderBatchList(main);
    } else if (root === 'archiv') {
      renderNav('archiv');
      await renderArchiv(main);
    } else if (root === 'rezepte') {
      renderNav('rezepte');
      await renderRezepteList(main);
    } else if (root === 'rezept') {
      renderNav('rezepte');
      if (a === 'import') {
        await renderRezeptImport(main);
      } else {
        await renderRezeptEditor(main, a === 'neu' ? null : a);
      }
    } else if (root === 'sichern') {
      renderNav('sichern');
      await renderBackup(main);
    } else if (root === 'batch') {
      const batchId = a;
      if (batchId === 'neu') {
        renderNav('batches');
        await renderBatchNeu(main);
      } else if (b === 'schritt') {
        renderNav('batches');
        await renderCheckliste(main, batchId, Number(c));
      } else if (b === 'druck') {
        renderNav('batches');
        await renderBatchDruck(main, batchId);
      } else {
        renderNav('batches');
        await renderBatchDetail(main, batchId);
      }
    } else {
      renderNav('batches');
      main.append(el('div', { class: 'empty-state' }, 'Seite nicht gefunden.'));
    }
  } catch (err) {
    console.error(err);
    main.append(
      el('div', { class: 'empty-state' }, [
        el('span', { class: 'icon-badge danger', html: warningIconSvg(28) }),
        el('div', {}, 'Etwas ist schiefgelaufen: ' + err.message),
      ])
    );
  }
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', router);

async function init() {
  await router();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloading) return;
      reloading = true;
      location.reload();
    });
  }
}

init();
