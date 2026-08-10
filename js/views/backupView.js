import { el, formatDateTime, confirmDialog } from '../util.js';
import { setHeader, showToast } from '../ui.js';
import { buildBackupZip, shareOrDownloadBackup, importBackupFile, getLastBackupAt } from '../backup.js';
import { uploadIconSvg, restoreIconSvg } from '../icons.js';

function daysSince(iso) {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

export async function renderBackup(main) {
  setHeader({ title: 'Sichern' });

  const lastBackup = getLastBackupAt();
  const days = daysSince(lastBackup);
  const warn = days !== null && days >= 30;

  main.append(
    el('div', { class: 'card' }, [
      el('div', { class: 'card-title' }, 'Letztes Backup'),
      el(
        'div',
        { class: 'card-meta', style: warn ? 'color:var(--danger);' : '' },
        lastBackup ? `${formatDateTime(lastBackup)} (vor ${days} ${days === 1 ? 'Tag' : 'Tagen'})` : 'Noch nie gesichert.'
      ),
    ])
  );

  main.append(
    el(
      'button',
      {
        class: 'btn primary block',
        style: 'margin-bottom:12px;',
        onclick: async (e) => {
          const btn = e.currentTarget;
          btn.disabled = true;
          btn.textContent = 'Erstelle Backup…';
          try {
            const blob = await buildBackupZip();
            await shareOrDownloadBackup(blob);
            showToast('Backup erstellt.');
            main.innerHTML = '';
            await renderBackup(main);
          } catch (err) {
            console.error(err);
            showToast('Backup fehlgeschlagen: ' + err.message);
          } finally {
            btn.disabled = false;
          }
        },
      },
      [el('span', { html: uploadIconSvg(18) }), 'Backup erstellen']
    )
  );

  const fileInput = el('input', { type: 'file', accept: '.zip,application/zip', style: 'display:none;' });
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;
    if (
      !confirmDialog(
        'Wiederherstellen ersetzt ALLE aktuellen Rezepte, Batches und Fotos durch den Inhalt dieser Sicherung. Fortfahren?'
      )
    ) {
      fileInput.value = '';
      return;
    }
    try {
      await importBackupFile(file);
      showToast('Wiederherstellung abgeschlossen.');
      location.hash = '#/batches';
    } catch (err) {
      console.error(err);
      showToast('Wiederherstellung fehlgeschlagen: ' + err.message);
    }
    fileInput.value = '';
  });

  main.append(
    fileInput,
    el(
      'button',
      {
        class: 'btn secondary block',
        onclick: () => fileInput.click(),
      },
      [el('span', { html: restoreIconSvg(18) }), 'Backup wiederherstellen']
    ),
    el(
      'p',
      { class: 'hint', style: 'margin-top:16px;' },
      'Ein Backup ist eine .zip-Datei mit allen Rezepten, Batches und Fotos. Speichere sie z. B. in "Dateien" oder iCloud Drive, damit deine Daten auch bei einem Handy-Problem erhalten bleiben.'
    )
  );
}
