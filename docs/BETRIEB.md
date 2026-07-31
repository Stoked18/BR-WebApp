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

Die Migrationen laufen beim Start des Anwendungscontainers. Anschließend das
erste Konto anlegen:

```bash
docker compose exec app node -e "
const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');
(async () => {
  const p = new PrismaClient();
  await p.benutzer.create({ data: {
    email: 'vorsitz@betrieb.example',
    anzeigename: 'Vorsitz',
    passwortHash: await argon2.hash(process.env.START_PASSWORT, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 }),
    rollen: ['BR_VORSITZ'],
    passwortWechsel: true,
  }});
  await p.\$disconnect();
})();"
```

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
