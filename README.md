# Datei-Hub

GitHub Pages und die gesamte Git-Historie sind öffentlich. Der aktuelle Index und die Dateien werden lokal mit AES-256-GCM verschlüsselt; der Schlüssel wird mit PBKDF2-SHA-256 (600.000 Iterationen und zufälligem Salt) aus dem Passwort abgeleitet. Jede Verschlüsselung verwendet einen zufälligen Nonce. Ein schwaches Passwort kann offline erraten werden; Webseiten-Code und Metadaten wie Dateigrößen bleiben öffentlich. Ein kompromittierter Host kann den Code verändern und Passwörter abfangen. Bereits veröffentlichte Klartextdateien, darunter RC522_Test.ino, bleiben in der Git-Historie öffentlich. Das ist kein rückwirkender Schutz.

## Dateien hinzufügen

Nur ausdrücklich ausgewählte Dateien veröffentlichen. Dateien in `/home/joeld/file-hub-inbox/` ablegen und mit `file-hub-publish --confirm-public DATEINAME` veröffentlichen. Das lokale Passwort liegt ausschließlich in `/home/joeld/.hermes/private/file-hub-password` (Dateimodus 600); es darf nicht in Git oder Befehlsargumente gelangen. Das Hilfsprogramm verschlüsselt die Datei und den Index, veröffentlicht ausschließlich Chiffrat und prüft die Live-Version. Die Dateien im Eingang bleiben erhalten. Den Link zur Website und das Passwort getrennt übermitteln.

Texte können kopiert, Rasterbilder angezeigt und Dateien heruntergeladen werden. GitHub-Größenlimits gelten auch für verschlüsselte Daten.

Nach erfolgreichem Entsperren wird das Passwort dauerhaft im localStorage dieses Browserprofils gespeichert und beim erneuten Besuch automatisch verwendet. Jeder mit Zugriff auf dieses Browserprofil kann das Passwort und die Dateien lesen. Das Löschen der Seitendaten entfernt das gespeicherte Passwort; auf anderen Geräten oder in anderen Browserprofilen muss es erneut eingegeben werden. Ist localStorage deaktiviert, funktioniert das manuelle Entsperren weiterhin.
