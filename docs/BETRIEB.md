# Betrieb

Installation, Sicherung und Aktualisierung im eigenen Rechenzentrum.

## Voraussetzungen

- Linux-Server mit Docker und Compose-Plugin
- Reverse Proxy mit TLS (nginx, Caddy, Traefik)
- 2 CPU-Kerne, 4 GB Arbeitsspeicher, 20 GB Plattenplatz genügen für ein Gremium
  dieser Größe deutlich

Die Anwendung braucht **keinen** Internetzugang. Sie ruft keine externen Dienste
auf — weder für Schriftarten noch für Aktualisierungsprüfungen oder Telemetrie.

## Einrichtung

```bash
git clone <repository> br-cockpit
cd br-cockpit

# Geheimnisse erzeugen
mkdir -p geheimnisse
openssl rand -base64 24 > geheimnisse/db_passwort
chmod 600 geheimnisse/db_passwort

cp .env.example .env
```

In `.env` eintragen:

```bash
# beide mit `openssl rand -hex 32` erzeugen
AUTH_SECRET="..."
DOKUMENT_SCHLUESSEL="..."

# Passwort aus geheimnisse/db_passwort einsetzen
DATABASE_URL="postgresql://brapp:<passwort>@db:5432/brcockpit?schema=public"

BUNDESLAND="NW"
```

Starten:

```bash
docker compose up -d --build
```

Die Migrationen laufen in einem eigenen Dienst (`migration`), bevor der
Anwendungsdienst startet; `docker compose up` wartet darauf.

## Ersteinrichtung

Auf einer leeren Datenbank leitet die Anwendung jeden Aufruf auf
`/einrichtung`. Dort werden in einem Schritt angelegt:

- der **Betrieb** (Name, Ort, Bundesland, Zahl der Wahlberechtigten und
  Beschäftigten),
- das **Gremium** mit der Mitgliederzahl — leer gelassen, wird sie nach
  § 9 BetrVG aus der Zahl der Wahlberechtigten berechnet,
- das erste **Konto für den Betriebsratsvorsitz**,
- die **Einstellungen** mit ihren Vorgaben.

Sobald ein Konto besteht, ist die Seite dauerhaft gesperrt — sie prüft das
sowohl beim Aufruf als auch noch einmal beim Absenden, damit sie nicht zur
Hintertür wird. Ein Konto von Hand in der Datenbank anzulegen ist damit nicht
mehr nötig.

Das Bundesland ist die folgenreichste Angabe: es steuert die Feiertage und
damit jede Fristberechnung nach § 193 BGB. In Nordrhein-Westfalen zählen
Fronleichnam und Allerheiligen mit, und genau diese beiden Tage verschieben in
der Praxis eine Wochenfrist nach § 99 BetrVG.

## Erprobung und Übergang in den Echtbetrieb

Für den Testlauf gibt es unter **Verwaltung** (nur mit dem Recht
`gremium.verwalten`, also Vorsitz und Stellvertretung):

- **Betrieb** — Name, Ort, Bundesland, Beschäftigtenzahlen, Konzern, Tarifbindung.
- **Gremium** — Bezeichnung, Mitgliederzahl (§ 9 BetrVG prüft auf eine ungerade
  Zahl), Zulassung der Video- und Telefonteilnahme nach § 30 Abs. 2 BetrVG.
- **Einstellungen** — Ladungsfrist, Einwendungsfrist gegen die Niederschrift und
  der Schalter **Testbetrieb**. Ist er gesetzt, steht in der ganzen Anwendung
  ein Hinweisbalken: die hier erfassten Fristen und Beschlüsse entfalten keine
  Wirkung nach außen, maßgeblich bleiben die unterzeichnete Niederschrift und
  die Beschlusssammlung nach § 34 BetrVG.

**Verwaltung → Benutzerkonten** (Recht `benutzer.verwalten`, nur Vorsitz) legt
Konten an, ändert Rollen, setzt Kennwörter und deaktiviert Zugänge. Konten
werden nicht gelöscht: sonst risse die Zuordnung alter Protokolleinträge. Beim
Ausscheiden aus dem Amt (§ 24 BetrVG) ist das Konto zu deaktivieren; laufende
Anmeldungen enden dabei sofort.

Ein zurückgesetztes Kennwort ist einer zweiten Person bekannt. Die betroffene
Person landet bei der nächsten Anmeldung deshalb auf **Mein Konto** und wird
zum Wechsel aufgefordert.

**Verwaltung → Bestand zurücksetzen** entfernt den Beispielbestand. Zwei Stufen:

| Stufe | Entfernt | Bleibt |
|---|---|---|
| 1 – Bewegungsdaten | Sitzungen, Tagesordnung, Niederschriften, Beschlüsse, Vorgänge und Fristen, Aufgaben, Dokumente, Betriebsvereinbarungen, Schulungen, Sprechstunden, Aufsichtsratsprojekt, Datenschutzregister | Personen, Mitgliedschaften, Ausschüsse, alle Konten |
| 2 – alles | zusätzlich Personen, Mitgliedschaften, Funktionen, Freistellungen, Wahlergebnisse, Ausschüsse, Schichtmodelle, alle übrigen Konten, das Zugriffsprotokoll | Betrieb, Gremium, Amtsperiode, Einstellungen, das eigene Konto |

Stufe 1 verlangt die Eingabe `LÖSCHEN`, Stufe 2 den Namen des Betriebs.

Dass Stufe 2 **das Zugriffsprotokoll leert**, ist kein Nebeneffekt, sondern
notwendig: die Einträge sind über eine Hash-Kette verbunden und verweisen auf
die Konten, die dabei gelöscht werden. Bliebe das Protokoll stehen, meldete
seine Prüfung ab sofort dauerhaft eine Manipulation. Der erste Eintrag der
neuen Kette hält fest, wer wann zurückgesetzt hat.

Vor beiden Stufen eine Sicherung anlegen — es gibt keinen Papierkorb. Nach dem
Übergang in den Echtbetrieb gehört diese Seite nicht mehr benutzt; für einzelne
Löschungen sind die Löschregeln im Datenschutzmodul vorgesehen, die
fristgebunden und dokumentiert arbeiten.

## Der Dokumentenschlüssel

Das ist der wichtigste Betriebsgegenstand.

`DOKUMENT_SCHLUESSEL` verschlüsselt die Inhalte aller abgelegten Dokumente. Er
steht in der Umgebung des Anwendungsdienstes — **nicht** in der Datenbank und
**nicht** in der Sicherung. Das ist Absicht: Ein Datenbank-Dump, den die
IT-Abteilung des Arbeitgebers für die Sicherung ohnehin anfertigt, soll keine
Betriebsratsunterlagen preisgeben (§§ 78, 79 BetrVG, Art. 32 DSGVO).

Daraus folgt:

- Der Schlüssel gehört in die Verwahrung des Betriebsrats, nicht der IT.
  Sinnvoll: verschlossene Hinterlegung bei Vorsitz **und** Stellvertretung, damit
  er nicht an einer Person hängt.
- Geht er verloren, sind alle Dokumente unwiederbringlich verloren. Sitzungs-
  und Vorgangsdaten in der Datenbank bleiben lesbar, die Dateianhänge nicht.
- Ein Wechsel des Schlüssels erfordert die Neuverschlüsselung des Bestands und
  ist vorab im Gremium zu beschließen.

## Sicherung

```bash
#!/bin/sh
# /usr/local/sbin/br-cockpit-sicherung
set -eu
ZIEL="/sicherung/br-cockpit"
TAG="$(date +%Y-%m-%d)"
mkdir -p "$ZIEL"

docker compose exec -T db pg_dump -U brapp -Fc brcockpit > "$ZIEL/db-$TAG.dump"
docker run --rm -v br-cockpit_dokumente:/daten:ro -v "$ZIEL:/aus" \
  alpine tar czf "/aus/dokumente-$TAG.tar.gz" -C /daten .

# Aufbewahrung 30 Tage
find "$ZIEL" -type f -mtime +30 -delete
```

Täglich per systemd-Timer oder cron. **Der Dokumentenschlüssel gehört nicht in
diese Sicherung** — sonst ist die Verschlüsselung wertlos.

Die Wiederherstellung mindestens einmal jährlich üben. Eine ungeprüfte Sicherung
ist keine.

## Reverse Proxy

Beispiel für nginx:

```nginx
server {
    listen 443 ssl http2;
    server_name betriebsrat.betrieb.intern;

    ssl_certificate     /etc/ssl/certs/betriebsrat.pem;
    ssl_certificate_key /etc/ssl/private/betriebsrat.key;
    ssl_protocols       TLSv1.2 TLSv1.3;

    add_header Strict-Transport-Security "max-age=31536000" always;

    # Vertrauliche Unterlagen gehören nicht in Suchmaschinen oder Proxy-Caches
    add_header X-Robots-Tag "noindex, nofollow" always;

    client_max_body_size 25m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name betriebsrat.betrieb.intern;
    return 301 https://$host$request_uri;
}
```

Der Proxy sollte **keine** Zugriffsprotokolle mit vollständigen Pfaden
schreiben, weil sich daraus Rückschlüsse auf laufende Verfahren ziehen lassen —
und die Proxy-Protokolle liegen typischerweise bei der IT des Arbeitgebers.
Entweder Protokollierung abschalten oder auf Statuscodes ohne Pfade beschränken.

## Aktualisierung

```bash
git pull
docker compose build app
docker compose up -d app
```

Migrationen laufen beim Start. Vor einer Aktualisierung sichern.

## Betriebsüberwachung

Der Container meldet seinen Zustand über den eingebauten Healthcheck. Die
Anwendung selbst zeigt unter *Systemzustand* (nur Rolle IT-Betrieb) die
technischen Kennzahlen ohne jeden Fachinhalt.

Regelmäßig zu prüfen:

- **Kettenprüfung des Protokolls** — im Menüpunkt *Zugriffsprotokoll*. Bricht die
  Kette, wurde am Protokoll manipuliert. Das ist dem Gremium und der oder dem
  Datenschutzbeauftragten unverzüglich zu melden.
- **Fehlgeschlagene Anmeldungen** — auffällige Häufung deutet auf einen
  Zugriffsversuch.
- **Fällige Löschungen** — siehe Rechtsprüfung.

## Rollen der Beteiligten

| Aufgabe | Zuständig |
| --- | --- |
| Bereitstellung von Maschine, Netz, Sicherung | Arbeitgeber (§ 40 Abs. 2 BetrVG) |
| Administrativer Betrieb der Container | IT des Arbeitgebers |
| Verwahrung des Dokumentenschlüssels | Betriebsrat |
| Anlage und Sperrung von Benutzerkonten | Betriebsratsvorsitz |
| Festlegung der Aufbewahrungsfristen | Betriebsrat |
| Auswertung des Protokolls | Betriebsrat, unterstützt durch DSB |

Der administrative Zugang der IT lässt sich nicht vermeiden — jemand muss die
Maschinen betreiben. Er darf aber nicht zu fachlichem Zugriff werden. Dagegen
wirken drei Dinge zusammen: die Verschlüsselung der Dokumente mit einem
Schlüssel außerhalb der Reichweite der IT, das verkettete Protokoll, das
Zugriffe sichtbar macht, und eine schriftliche Vereinbarung, die den Rahmen
festhält.

## Wenn etwas schiefgeht

**Anwendung startet nicht.** `docker compose logs app`. Häufigste Ursache: die
Datenbank ist noch nicht bereit — der Healthcheck sollte das abfangen — oder
`DATABASE_URL` passt nicht zum Passwort in `geheimnisse/db_passwort`.

**Dokumente lassen sich nicht öffnen.** Meist der falsche oder fehlende
`DOKUMENT_SCHLUESSEL`. Die Entschlüsselung schlägt bewusst hart fehl, statt
beschädigte Inhalte auszuliefern.

**Niemand kommt mehr hinein.** Passwort direkt in der Datenbank zurücksetzen —
dasselbe Verfahren wie bei der Ersteinrichtung, mit `update` statt `create`. Der
Vorgang ist im Gremium zu vermerken, weil er am Protokoll vorbeiläuft.
