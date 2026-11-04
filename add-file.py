#!/usr/bin/env python3
"""Add exactly one explicitly selected file to the public file hub."""
import argparse
import json
import os
from pathlib import Path
import secrets
import shutil
import tempfile

ROOT = Path(__file__).resolve().parent
TEXT = {'.txt', '.md', '.csv', '.json', '.log'}
IMAGES = {'.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif'}

def main():
    parser = argparse.ArgumentParser(description='Copies a file into the PUBLIC GitHub Pages site. Publish only files you explicitly intend to expose.')
    parser.add_argument('file', type=Path)
    args = parser.parse_args()
    source = args.file
    if not source.is_file(): parser.error('not a regular file')
    suffix = source.suffix.lower()
    # Never publish active content (HTML/SVG/JS etc.) with its executable extension.
    # Also store text as .bin: downloads remain safe even if their content is HTML.
    kind = 'text' if suffix in TEXT else 'image' if suffix in IMAGES else 'file'
    if kind != 'image': suffix = '.bin'
    manifest_path = ROOT / 'manifest.json'
    entries = json.loads(manifest_path.read_text(encoding='utf-8'))
    if not isinstance(entries, list): raise ValueError('manifest must be a list')
    directory = ROOT / 'files'; directory.mkdir(exist_ok=True)
    dest = directory / (secrets.token_hex(16) + suffix)
    try:
        with dest.open('xb') as out, source.open('rb') as inp: shutil.copyfileobj(inp, out)
        entries.append({'name': source.name, 'file': dest.name, 'kind': kind})
        fd, temp = tempfile.mkstemp(dir=ROOT, prefix='.manifest-', suffix='.tmp')
        try:
            with os.fdopen(fd, 'w', encoding='utf-8') as out: json.dump(entries, out, ensure_ascii=False, indent=2); out.write('\n')
            os.replace(temp, manifest_path)
        finally:
            if os.path.exists(temp): os.unlink(temp)
    except BaseException:
        dest.unlink(missing_ok=True)
        raise
    print('Added:', source.name, '→', dest.relative_to(ROOT))
    print('PUBLIC after committing and publishing; review both file and manifest before pushing.')

if __name__ == '__main__': main()
