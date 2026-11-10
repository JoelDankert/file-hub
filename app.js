'use strict';
const list = document.querySelector('#files'), viewer = document.querySelector('#viewer');
const message = document.querySelector('#message'), filename = document.querySelector('#filename');
const content = document.querySelector('#content'), download = document.querySelector('#download');
const copy = document.querySelector('#copy'), form = document.querySelector('#unlock');
let password = '', current = 0, text = '', opener, copyTimer, copyRequest = 0, objectURL;
const bytes = value => Uint8Array.from(atob(value), c => c.charCodeAt(0));
async function decrypt(envelope) {
  if (envelope.v !== 1) throw Error('unsupported');
  const salt = bytes(envelope.salt), iv = bytes(envelope.iv);
  if (salt.length !== 16 || iv.length !== 12) throw Error('invalid');
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({name:'PBKDF2', salt, iterations:600000, hash:'SHA-256'}, material, {name:'AES-GCM', length:256}, false, ['decrypt']);
  return crypto.subtle.decrypt({name:'AES-GCM', iv}, key, bytes(envelope.ciphertext));
}
async function load(item) {
  if (!/^[a-f0-9]{32}\.enc$/.test(item.file)) throw Error('invalid filename');
  const response = await fetch('files/' + item.file, {cache:'no-store'});
  if (!response.ok) throw Error('fetch');
  return decrypt(await response.json());
}
function blobFor(item, data) {
  const types = {png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp',avif:'image/avif'};
  const ext = item.name.split('.').pop().toLowerCase();
  return new Blob([data], {type:item.kind === 'image' ? (types[ext] || 'application/octet-stream') : 'application/octet-stream'});
}
function closeViewer() {
  current++; copyRequest++; clearTimeout(copyTimer); viewer.hidden = true; list.hidden = false;
  content.replaceChildren(); message.textContent = ''; if (objectURL) URL.revokeObjectURL(objectURL); objectURL = null;
  if (opener) opener.focus({preventScroll:true});
}
window.addEventListener('popstate', closeViewer);
document.querySelector('#back').addEventListener('click', () => {
  if (history.state && history.state.fileHubViewer) history.back(); else closeViewer();
});
copy.addEventListener('click', async () => {
  const request = ++copyRequest, id = current;
  try {
    await navigator.clipboard.writeText(text);
    if (id !== current || request !== copyRequest) return;
    clearTimeout(copyTimer); copy.textContent = 'Kopiert'; message.textContent = '';
    copyTimer = setTimeout(() => { copy.textContent = 'Kopieren'; }, 1500);
  } catch { if (id === current && request === copyRequest) message.textContent = 'Kopieren fehlgeschlagen.'; }
});
async function openFile(item, button) {
  const id = ++current; copyRequest++; clearTimeout(copyTimer); opener = button; text = '';
  list.hidden = true; viewer.hidden = false; filename.textContent = item.name; message.textContent = '';
  content.replaceChildren(); copy.hidden = true; copy.textContent = 'Kopieren'; download.hidden = true;
  if (objectURL) URL.revokeObjectURL(objectURL); objectURL = null;
  history.pushState({fileHubViewer:true}, ''); document.querySelector('#back').focus({preventScroll:true});
  try {
    const data = await load(item); if (id !== current) return;
    objectURL = URL.createObjectURL(blobFor(item, data)); download.href = objectURL; download.download = item.name; download.hidden = false;
    if (item.kind === 'image') { const img = document.createElement('img'); img.alt = item.name; img.src = objectURL; content.append(img); }
    if (item.kind === 'text') { text = new TextDecoder().decode(data); const pre = document.createElement('pre'); pre.textContent = text; content.append(pre); copy.hidden = false; }
  } catch { if (id === current) message.textContent = 'Datei konnte nicht entschlüsselt werden.'; }
}
function render(entries) {
  list.replaceChildren();
  for (const item of entries) {
    if (!item || typeof item.name !== 'string' || typeof item.file !== 'string' || !/^[a-f0-9]{32}\.enc$/.test(item.file) || !['text','image','file'].includes(item.kind)) throw Error('invalid index');
    const row = document.createElement('li'), button = document.createElement('button'), actions = document.createElement('div');
    button.type = 'button'; button.className = 'file'; button.textContent = item.name; button.addEventListener('click', () => openFile(item, button));
    actions.className = 'row-actions';
    const link = document.createElement('button'); link.type = 'button'; link.textContent = 'Download'; link.setAttribute('aria-label', `${item.name} herunterladen`);
    link.addEventListener('click', async () => {
      try {
        const data = await load(item), url = URL.createObjectURL(blobFor(item, data));
        const a = document.createElement('a'); a.href = url; a.download = item.name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 60000);
      } catch { message.textContent = 'Download fehlgeschlagen.'; }
    });
    // Copy precedes download, matching the preview controls.
    if (item.kind === 'text') {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = 'Kopieren'; b.setAttribute('aria-label', `${item.name} kopieren`);
      b.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(new TextDecoder().decode(await load(item))); message.textContent = ''; b.textContent = 'Kopiert'; setTimeout(() => { b.textContent = 'Kopieren'; }, 1500); }
        catch { message.textContent = 'Kopieren fehlgeschlagen.'; }
      }); actions.append(b);
    }
    actions.append(link);
    row.append(button, actions); list.append(row);
  }
  if (!list.children.length) message.textContent = 'Keine Dateien.';
}
const storageKey = 'file-hub-password-v1';
document.querySelector('#logout').addEventListener('click', () => {
  try { localStorage.removeItem(storageKey); } catch { /* storage is optional */ }
  password = ''; text = ''; current++; copyRequest++; clearTimeout(copyTimer);
  if (objectURL) URL.revokeObjectURL(objectURL);
  objectURL = null; content.replaceChildren(); list.replaceChildren();
  viewer.hidden = true; document.querySelector('#session').hidden = true;
  download.removeAttribute('href'); filename.textContent = ''; message.textContent = '';
  // A fresh document discards all pending decrypt/download/clipboard callbacks.
  history.replaceState(null, '');
  location.reload();
});
async function unlock(value) {
  password = value;
  const submit = form.querySelector('button'); submit.disabled = true; message.textContent = 'Entschlüsseln …';
  try {
    const response = await fetch('manifest.json', {cache:'no-store'}); if (!response.ok) throw Error('fetch');
    const entries = JSON.parse(new TextDecoder().decode(await decrypt(await response.json())));
    if (!Array.isArray(entries)) throw Error('invalid'); render(entries); form.hidden = true; document.querySelector('#session').hidden = false; message.textContent = '';
    try { localStorage.setItem(storageKey, value); } catch { /* storage is optional */ }
    if (!entries.length) message.textContent = 'Keine Dateien.';
  } catch {
    password = ''; list.replaceChildren(); message.textContent = 'Entschlüsselung fehlgeschlagen. Passwort oder Daten prüfen.';
    try { localStorage.removeItem(storageKey); } catch { /* storage is optional */ }
  } finally { submit.disabled = false; }
}
form.addEventListener('submit', event => {
  event.preventDefault(); const field = document.querySelector('#password'); const value = field.value; field.value = '';
  unlock(value);
});
try { const saved = localStorage.getItem(storageKey); if (saved) unlock(saved); } catch { /* storage is optional */ }
