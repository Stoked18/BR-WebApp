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

./vorbereiten.sh NW          # Bundeslandkürzel, Vorgabe ist NW
docker compose up -d --build
```

Mehr ist es nicht. `vorbereiten.sh` erzeugt das Datenbankpasswort, den
Signaturschlüssel und den Dokumentenschlüssel und trägt sie in `.env` und
`geheimnisse/db_passwort` ein. Eine vorhandene `.env` rührt es nicht an.

> **Warum ein Skript und keine Handarbeit?** Weil das Datenbankpasswort an zwei
> Stellen stehen muss und in einer URL landet. Die frühere Anleitung erzeugte es
> mit `openssl rand -base64 24` — das liefert in rund **zwei von drei Fällen**
> ein Passwort mit `/` oder `+`, und ein `/` zerlegt die Verbindungszeichenkette.
> Prisma meldet dann `P1013 … invalid port number in database URL`, obwohl an der
> Portangabe nichts falsch ist. Das Skript verwendet nur Hexadezimalzeichen.

Die Migrationen laufen in einem eigenen Dienst (`migration`), bevor der
Anwendungsdienst startet; `docker compose up` wartet darauf.

Danach `http://127.0.0.1:3000` aufrufen — es erscheint die Ersteinrichtung.

### Erreichbarkeit für einen ersten Test

Die Vorgabe bindet den Port an `127.0.0.1`, die Anwendung ist also nur auf dem
Server selbst erreichbar; nach außen veröffentlicht sie ein Reverse Proxy mit
TLS. Wer erst einmal ohne Reverse Proxy ausprobieren will, setzt in `.env`:

```bash
BINDUNG=0.0.0.0
```

und startet mit `docker compose up -d` neu. Dann ist sie im Betriebsnetz unter
`http://<server>:3000` erreichbar — **unverschlüsselt**. Das ist zum
Ausprobieren vertretbar, nicht mit echten Betriebsratsdaten (Art. 32 DSGVO).

Ohne Reverse Proxy und ohne diese Zeile lautet das Fehlerbild schlicht: der
Server antwortet nicht. Das ist dann kein Fehler der Anwendung.

### Der Reverse Proxy muss `X-Forwarded-Proto` setzen

Das ist keine Empfehlung, sondern eine Betriebsbedingung. Das Sitzungs-Cookie
trägt das Merkmal `Secure` genau dann, wenn die Verbindung zum Browser über TLS
läuft — und woran die Anwendung das erkennt, ist allein diese Kopfzeile.

Der Grund: Zwischen Proxy und Container läuft die Strecke unverschlüsselt. Der
Container sieht also von sich aus nur HTTP. Der Next.js-Server ergänzt fehlende
`X-Forwarded-*`-Kopfzeilen selbstständig mit den Werten der tatsächlichen
Verbindung — nachgemessen im laufenden Container:

| Aufbau | `x-forwarded-proto` |
|---|---|
| ohne Proxy, direkt über HTTP | `http` — vom Server ergänzt |
| TLS-Proxy davor, Kopfzeile gesetzt | `https` — vom Proxy |
| TLS-Proxy davor, Kopfzeile **nicht** gesetzt | `http` — vom Server ergänzt, **falsch** |

Im dritten Fall ließe die Anwendung `Secure` weg, obwohl der Browser über HTTPS
spricht. Caddy und Traefik setzen die Kopfzeile von sich aus; nginx braucht die
Zeile ausdrücklich — die vollständige Beispielkonfiguration steht unten unter
[Reverse Proxy](#reverse-proxy) und enthält sie bereits.

Wer sichergehen will, erzwingt das Merkmal unabhängig von den Kopfzeilen — in
`.env`:

```bash
SITZUNG_COOKIE_SECURE=ja
```

Empfohlen für jeden Betrieb hinter TLS. Vorgabe ist `auto`, also die Erkennung
über die Kopfzeile.

Prüfen lässt sich das Ergebnis ohne Werkzeuge: Bei der Anmeldung schreibt die
Anwendung eine Zeile ins Protokoll, sobald sie eine Sitzung **ohne** `Secure`
vergibt:

```bash
docker compose logs app | grep Sitzung
```

Im Erprobungsbetrieb ohne Proxy ist diese Zeile erwartet. Erscheint sie im
Regelbetrieb hinter TLS, setzt der Proxy `X-Forwarded-Proto` nicht.

## Wenn es nicht startet

Zuerst der Blick auf die Dienste — der Migrationsdienst muss auf `Exited (0)`
stehen, nicht auf `Exited (1)`:

```bash
docker compose ps -a
docker compose logs migration
docker compose logs app
```

| Meldung / Erscheinung | Ursache | Abhilfe |
|---|---|---|
| `P1013 … invalid port number in database URL` | `/` oder `+` im Datenbankpasswort. Die Portangabe ist **nicht** das Problem. | `rm .env geheimnisse/db_passwort`, dann `./vorbereiten.sh`. Achtung: Bei bereits angelegter Datenbank auch `docker compose down -v` — sonst behält Postgres das alte Passwort. |
| `FEHLER: DATABASE_URL ist leer` | Keine `.env` neben der `docker-compose.yml` | `./vorbereiten.sh` |
| `P1000 … authentication failed` | `.env` und `geheimnisse/db_passwort` passen nicht zusammen, oder die Datenbank wurde mit einem anderen Passwort angelegt | `docker compose down -v` (löscht den Datenbestand!), dann neu | 
| `The database schema is not empty` | Migrationen wurden schon eingespielt | Kein Fehler, der Dienst darf beendet sein |
| Container `app` ist dauerhaft `unhealthy` | Bindeadresse — betraf Fassungen vor dem Setzen von `HOSTNAME=0.0.0.0` im Dockerfile | Abbild neu bauen: `docker compose build --no-cache app` |
| `unknown option: service_completed_successfully` o. Ä. | Altes `docker-compose` (Python, v1) | Compose v2 verwenden: `docker compose` statt `docker-compose` |
| Browser: „Diese Seite funktioniert nicht" von einem anderen Rechner aus | Port an `127.0.0.1` gebunden (Vorgabe) | Siehe „Erreichbarkeit für einen ersten Test" |
| Anmeldung gelingt, führt aber sofort auf die Anmeldemaske zurück | Das Sitzungs-Cookie trägt `Secure`, die Verbindung läuft aber über Klartext-HTTP — der Browser hält es dann zurück. Betraf Fassungen, in denen `Secure` an `NODE_ENV` hing. | Abbild neu bauen. Prüfen: `SITZUNG_COOKIE_SECURE` muss für den Betrieb ohne TLS auf `auto` oder `nein` stehen, nicht auf `ja`. Siehe „Der Reverse Proxy muss `X-Forwarded-Proto` setzen". |
| Anmeldung scheitert mit `Invalid Server Actions request` | Reverse Proxy gibt einen anderen `Host` weiter, als der Browser aufruft | In `.env` `ZUSAETZLICHE_SERVER_ACTION_URSPRUENGE` setzen und **neu bauen** (`docker compose build app`) — ein Neustart genügt nicht. Einzelheiten unter [Reverse Proxy](#wenn-formulare-mit-invalid-server-actions-request-scheitern). |
| `exec /usr/bin/tini: exec format error` | Abbild für eine andere Prozessorarchitektur gebaut (z. B. auf einem Mac für einen amd64-Server) | Auf dem Zielserver bauen oder `docker buildx build --platform linux/amd64` |

Ganz von vorn anfangen — **löscht den gesamten Datenbestand**:

```bash
docker compose down -v
rm -f .env geheimnisse/db_passwort
./vorbereiten.sh
docker compose up -d --build
```

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

### Wenn Formulare mit „Invalid Server Actions request" scheitern

Next.js prüft bei jedem abgeschickten Formular, ob die Herkunftsadresse des
Browsers (`Origin`) zum Hostnamen passt, unter dem der Server sich sieht. Das
ist ein Schutz gegen websiteübergreifende Anfragen. Passt beides nicht
zusammen, bricht die Anwendung mit `Invalid Server Actions request` ab — am
sichtbarsten bei der Anmeldung.

Mit der Konfiguration oben tritt das **nicht** auf: `proxy_set_header Host
$host` reicht den öffentlichen Namen durch, Herkunft und Hostname stimmen
überein. Nötig wird die folgende Einstellung erst, wenn der Proxy einen anderen
`Host` weitergibt als der Browser aufruft — etwa weil er auf den internen
Dienstnamen umschreibt. Dann die extern sichtbare Adresse in `.env` eintragen,
mehrere durch Komma getrennt:

```bash
ZUSAETZLICHE_SERVER_ACTION_URSPRUENGE="betriebsrat.betrieb.intern"
```

> **Diese Einstellung wirkt erst nach einem Neu-Bau.** Sie wird beim Übersetzen
> ausgewertet und steht danach fest im erzeugten Server; ein `docker compose up
> -d app` genügt **nicht**:
>
> ```bash
> docker compose build app     # zwingend – hier wird der Wert eingebaut
> docker compose up -d app
> ```
>
> Das Bauargument reicht `docker-compose.yml` an das Dockerfile durch. Ob der
> Wert angekommen ist, lässt sich am fertigen Abbild ablesen:
>
> ```bash
> docker compose run --rm --entrypoint sh app -c \
>   'grep -o "\"allowedOrigins\":\[[^]]*\]" server.js'
> ```

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
