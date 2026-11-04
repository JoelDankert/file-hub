#!/usr/bin/env python3
"""Encrypt files and the index locally. Never write plaintext to the repository."""
import argparse, base64, json, os, secrets, stat, tempfile
from pathlib import Path
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

ROOT = Path(__file__).resolve().parent
PASSWORD = Path.home() / '.hermes/private/file-hub-password'
TEXT = set('.txt .md .csv .json .log .ino .c .cpp .h .hpp .py .sh .js .ts .html .css .yaml .yml .xml .sql .java .kt .rs .ahk .ps1'.split())
IMAGES = set('.png .jpg .jpeg .gif .webp .avif'.split())
ITERATIONS = 600000

def password():
    s = PASSWORD.lstat()
    if not stat.S_ISREG(s.st_mode) or s.st_uid != os.getuid() or s.st_mode & 0o077:
        raise ValueError('password file must be an owner-only regular file')
    value = PASSWORD.read_bytes().rstrip(b'\r\n')
    if not value: raise ValueError('empty password')
    value.decode('utf-8')
    return value

def b64(b): return base64.b64encode(b).decode('ascii')
def un64(s): return base64.b64decode(s, validate=True)
def key(pw, salt): return PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=ITERATIONS).derive(pw)
def encrypt(data, pw):
    salt, iv = os.urandom(16), os.urandom(12)
    return {'v': 1, 'salt': b64(salt), 'iv': b64(iv), 'ciphertext': b64(AESGCM(key(pw, salt)).encrypt(iv, data, None))}
def decrypt(obj, pw):
    if obj.get('v') != 1: raise ValueError('unsupported encryption version')
    salt, iv = un64(obj['salt']), un64(obj['iv'])
    if len(salt) != 16 or len(iv) != 12: raise ValueError('invalid encryption parameters')
    return AESGCM(key(pw, salt)).decrypt(iv, un64(obj['ciphertext']), None)
def atomic_json(path, obj):
    fd, tmp = tempfile.mkstemp(dir=path.parent, prefix='.encrypted-', suffix='.tmp')
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as f:
            json.dump(obj, f, separators=(',', ':')); f.write('\n'); f.flush(); os.fsync(f.fileno())
        os.replace(tmp, path)
    finally:
        if os.path.exists(tmp): os.unlink(tmp)
def read_manifest(root, pw):
    entries = json.loads(decrypt(json.loads((root / 'manifest.json').read_text()), pw))
    if not isinstance(entries, list): raise ValueError('invalid index')
    return entries
def add(source, root=ROOT):
    if source.is_symlink() or not source.is_file(): raise ValueError('source must be a regular non-symlink file')
    pw = password()
    entries = read_manifest(root, pw)
    if any(e['name'] == source.name for e in entries): raise ValueError('duplicate filename')
    suffix = source.suffix.lower()
    kind = 'text' if suffix in TEXT else 'image' if suffix in IMAGES else 'file'
    name = secrets.token_hex(16) + '.enc'
    target = root / 'files' / name
    data = source.read_bytes()
    atomic_json(target, encrypt(data, pw))
    try:
        entries.append({'name': source.name, 'file': name, 'kind': kind})
        atomic_json(root / 'manifest.json', encrypt(json.dumps(entries, ensure_ascii=False).encode(), pw))
    except BaseException:
        target.unlink(missing_ok=True)
        raise
    return entries[-1]
def main():
    parser = argparse.ArgumentParser(description='Encrypt an explicitly selected file locally.')
    parser.add_argument('file', type=Path)
    args = parser.parse_args()
    add(args.file)
    print('Encrypted file added locally; review and publish the encrypted changes.')
if __name__ == '__main__': main()
