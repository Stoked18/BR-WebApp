#!/bin/sh
# Legt die Geheimnisse und die .env an, bevor "docker compose up" laeuft.
#
# Das war bisher Handarbeit: Passwort erzeugen, in eine Datei schreiben, dasselbe
# Passwort noch einmal in die DATABASE_URL eintragen. Genau daran ist es in der
# Praxis gescheitert – "openssl rand -base64" liefert in etwa zwei von drei
# Faellen ein Passwort mit "/" oder "+", und ein "/" im Passwort zerlegt die
# Verbindungszeichenkette. Prisma meldet dann "P1013 ... invalid port number in
# database URL", was in die voellig falsche Richtung fuehrt.
#
# Dieses Skript erzeugt deshalb ausschliesslich Zeichen, die in einer URL
# unbedenklich sind, und traegt sie an beiden Stellen selbst ein.

set -eu

cd "$(dirname "$0")"

geheim() {
  # Hexadezimal: 48 Zeichen aus [0-9a-f], 192 Bit. In URL, YAML und Shell
  # gleichermassen harmlos.
  openssl rand -hex 24
}

if ! command -v openssl >/dev/null 2>&1; then
  echo "FEHLER: openssl wird gebraucht, ist aber nicht installiert." >&2
  exit 1
fi

if [ -e .env ]; then
  echo "Es gibt bereits eine .env – sie wird nicht angetastet."
  echo "Zum Neuanlegen vorher wegsichern:  mv .env .env.alt"
  exit 1
fi

mkdir -p geheimnisse sicherung

if [ -e geheimnisse/db_passwort ]; then
  echo "Verwende das vorhandene geheimnisse/db_passwort."
  DB_PASSWORT="$(cat geheimnisse/db_passwort)"
  case "$DB_PASSWORT" in
    */*|*+*)
      echo "FEHLER: Das vorhandene Datenbankpasswort enthaelt '/' oder '+'." >&2
      echo "        Das zerlegt die DATABASE_URL. Datei loeschen und dieses" >&2
      echo "        Skript erneut aufrufen:  rm geheimnisse/db_passwort" >&2
      exit 1 ;;
  esac
else
  DB_PASSWORT="$(geheim)"
  printf '%s' "$DB_PASSWORT" > geheimnisse/db_passwort
  chmod 600 geheimnisse/db_passwort
  echo "geheimnisse/db_passwort angelegt."
fi

BUNDESLAND_WERT="${1:-NW}"

cat > .env <<ENDE
# Von vorbereiten.sh erzeugt am $(date +%Y-%m-%d).
# Diese Datei enthaelt Geheimnisse und gehoert nicht in die Versionsverwaltung.

# Muss zum Inhalt von geheimnisse/db_passwort passen – beides hat dieses
# Skript gemeinsam gesetzt.
DATABASE_URL="postgresql://brapp:${DB_PASSWORT}@db:5432/brcockpit?schema=public"

# Signaturschluessel fuer die Anmeldesitzungen.
AUTH_SECRET="$(geheim)$(geheim)"

# Schluessel der verschluesselten Dokumentenablage (AES-256-GCM, 64 Hexzeichen).
# ACHTUNG: Geht er verloren, sind alle abgelegten Dokumente unwiederbringlich
# verloren. Ausserhalb dieses Servers verwahren – verschlossen bei Vorsitz und
# Stellvertretung, nicht in der Datensicherung (§ 79 BetrVG, Art. 32 DSGVO).
DOKUMENT_SCHLUESSEL="$(openssl rand -hex 32)"

# Steuert die Feiertage und damit jede Fristberechnung nach § 193 BGB.
BUNDESLAND="${BUNDESLAND_WERT}"

# Erreichbarkeit. Vorgabe: nur auf dem Server selbst; nach aussen veroeffentlicht
# ein Reverse Proxy mit TLS. Fuer einen ersten Test ohne Reverse Proxy auf
# 0.0.0.0 setzen – dann aber unverschluesselt und ohne echte Daten.
BINDUNG=127.0.0.1
PORT_AUSSEN=3000

# Merkmal "Secure" am Sitzungs-Cookie: auto (aus X-Forwarded-Proto), ja, nein.
# Hinter einem TLS-Reverse-Proxy ist "ja" die sichere Wahl; fuer die Erprobung
# ueber eine LAN-Adresse ohne Proxy muss es "auto" oder "nein" bleiben, sonst
# haelt der Browser das Cookie zurueck. Siehe docs/BETRIEB.md.
SITZUNG_COOKIE_SECURE=auto

# Nur noetig, wenn Formulare hinter dem eigenen Reverse Proxy mit
# "Invalid Server Actions request" scheitern: die extern sichtbare Adresse.
ZUSAETZLICHE_SERVER_ACTION_URSPRUENGE=""
ENDE

chmod 600 .env

echo ".env angelegt."
echo
echo "Naechste Schritte:"
echo "  1. Bundesland in der .env pruefen (steht auf ${BUNDESLAND_WERT})."
echo "  2. docker compose up -d --build"
echo "  3. http://127.0.0.1:3000 aufrufen – es erscheint die Ersteinrichtung."
echo
echo "Den Wert von DOKUMENT_SCHLUESSEL jetzt ausserhalb des Servers sichern."
