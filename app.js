'use strict';
const list = document.querySelector('#files');
const message = document.querySelector('#message');
(async () => {
  try {
    const response = await fetch('manifest.json', {cache:'no-store'});
    if (!response.ok) throw new Error('manifest');
    const entries = await response.json();
    if (!Array.isArray(entries)) throw new Error('manifest');
    for (const item of entries) {
      if (!item || typeof item.name !== 'string' || typeof item.file !== 'string' || !/^[a-f0-9]{32}\.[a-z0-9]+$/.test(item.file)) continue;
      const url = 'files/' + item.file;
      const row = document.createElement('li');
      if (item.kind === 'image') {
        const img = document.createElement('img'); img.src = url; img.alt = ''; img.loading = 'lazy'; row.append(img);
      }
      const name = document.createElement('span'); name.className = 'name'; name.textContent = item.name; row.append(name);
      const download = document.createElement('a'); download.href = url; download.download = item.name; download.textContent = 'Download'; row.append(download);
      if (item.kind === 'text') {
        const copy = document.createElement('button'); copy.type = 'button'; copy.textContent = 'Kopieren';
        copy.addEventListener('click', async () => { try { const r = await fetch(url); if (!r.ok) throw new Error(); await navigator.clipboard.writeText(await r.text()); copy.textContent = 'Kopiert'; setTimeout(() => { copy.textContent = 'Kopieren'; }, 1500); } catch { message.textContent = 'Kopieren fehlgeschlagen.'; } });
        row.append(copy);
      }
      list.append(row);
    }
    if (!list.children.length) message.textContent = 'Keine Dateien.';
  } catch { message.textContent = 'Dateien konnten nicht geladen werden.'; }
})();
