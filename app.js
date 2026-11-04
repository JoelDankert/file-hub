'use strict';
const list = document.querySelector('#files');
const viewer = document.querySelector('#viewer');
const message = document.querySelector('#message');
const filename = document.querySelector('#filename');
const content = document.querySelector('#content');
const download = document.querySelector('#download');
const copy = document.querySelector('#copy');
let current = 0;
let text = '';
let opener;

function closeViewer() {
  current++;
  viewer.hidden = true;
  list.hidden = false;
  content.replaceChildren();
  message.textContent = '';
  if (opener) opener.focus({preventScroll:true});
}
window.addEventListener('popstate', closeViewer);
document.querySelector('#back').addEventListener('click', () => {
  if (history.state && history.state.fileHubViewer) history.back();
  else closeViewer();
});
copy.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(text);
    copy.textContent = 'Kopiert';
    message.textContent = '';
  } catch { message.textContent = 'Kopieren fehlgeschlagen.'; }
});
async function openFile(item, button) {
  const id = ++current;
  opener = button;
  text = '';
  list.hidden = true;
  viewer.hidden = false;
  filename.textContent = item.name;
  message.textContent = '';
  content.replaceChildren();
  copy.hidden = true;
  copy.textContent = 'Kopieren';
  const url = 'files/' + item.file;
  download.href = url;
  download.download = item.name;
  history.pushState({fileHubViewer:true}, '');
  document.querySelector('#back').focus({preventScroll:true});
  if (item.kind === 'image') {
    const img = document.createElement('img');
    img.alt = item.name;
    img.addEventListener('error', () => { if (id === current) message.textContent = 'Bild konnte nicht geladen werden.'; });
    img.src = url;
    content.append(img);
  } else if (item.kind === 'text') {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error();
      const loaded = await response.text();
      if (id !== current) return;
      text = loaded;
      const pre = document.createElement('pre');
      pre.textContent = text;
      content.append(pre);
      copy.hidden = false;
    } catch { if (id === current) message.textContent = 'Datei konnte nicht geladen werden.'; }
  }
}
(async () => {
  try {
    const response = await fetch('manifest.json', {cache:'no-store'});
    if (!response.ok) throw new Error();
    const entries = await response.json();
    if (!Array.isArray(entries)) throw new Error();
    for (const item of entries) {
      if (!item || typeof item.name !== 'string' || typeof item.file !== 'string' || !/^[a-f0-9]{32}\.[a-z0-9]+$/.test(item.file)) continue;
      const row = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'file';
      button.textContent = item.name;
      button.addEventListener('click', () => openFile(item, button));
      row.append(button);
      list.append(row);
    }
    if (!list.children.length) message.textContent = 'Keine Dateien.';
  } catch { message.textContent = 'Dateien konnten nicht geladen werden.'; }
})();
