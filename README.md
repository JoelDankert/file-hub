# Datei-Hub

**Öffentlich:** Jede veröffentlichte Datei und frühere Git-Version ist weltweit abrufbar. Keine vertraulichen Dateien verwenden. Nur ausdrücklich freigegebene Dateien hinzufügen. Löschen aus der aktuellen Version löscht nicht die Git-Historie.

## Datei hinzufügen

```sh
cd /home/joeld/file-hub
python3 add-file.py /pfad/zur/ausdruecklich-freigegebenen-datei.txt
git status --short
git diff -- manifest.json
# Neue Dateien im Ordner files/ vor Veröffentlichung prüfen!
git add manifest.json files/
git commit -m 'Add public file'
git push
```

Texte (.txt, .md, .csv, .json, .log) können kopiert werden, Rasterbilder werden als Vorschau angezeigt. Andere Dateien werden zum Download angeboten. Keine serverseitigen Uploads; GitHub Pages ist statisch. Die kryptischen Dateinamen sind kein Zugriffsschutz. Große Dateien unterliegen GitHubs Größenlimits.

## Erstveröffentlichung

Repository `JoelDankert/file-hub` öffentlich erstellen, `main` pushen und GitHub Pages unter Settings → Pages aus Branch `main`, Ordner `/ (root)` aktivieren. URL: https://joeldankert.github.io/file-hub/ . GitHub Pages benötigt eventuell einige Minuten.
