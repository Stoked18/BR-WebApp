#!/usr/bin/env bash
#
# Richtet die Erprobungsumgebung ein: Abhaengigkeiten, Schema, Beispielbestand.
#
# Laesst sich jederzeit erneut aufrufen ("npm run setup"). Der Beispielbestand
# wird nur angelegt, wenn die Datenbank noch leer ist – sonst gingen erfasste
# Sitzungen und Vorgaenge verloren. Erzwingen mit: BESTAND_NEU=ja npm run setup
set -euo pipefail

cd "$(dirname "$0")/.."

echo
echo "=== BR-Cockpit einrichten ==============================================="
echo

# --- Abhaengigkeiten ------------------------------------------------------
# npm ci loescht node_modules zuerst. Schlaegt es fehl, bliebe kein
# brauchbarer Stand zurueck – deshalb der Rueckfall auf npm install.
echo "[1/5] Abhängigkeiten installieren ..."
if ! npm ci; then
  echo "      npm ci fehlgeschlagen, versuche npm install ..."
  npm install
fi

# --- Prisma-Client --------------------------------------------------------
echo "[2/5] Prisma-Client erzeugen ..."
npx prisma generate >/dev/null

# --- Datenbank abwarten ---------------------------------------------------
echo "[3/5] Auf die Datenbank warten ..."
bereit=nein
for _ in $(seq 1 30); do
  if npx prisma db execute --schema prisma/schema.prisma --stdin <<< "SELECT 1;" >/dev/null 2>&1; then
    bereit=ja
    break
  fi
  sleep 2
done
if [ "$bereit" != "ja" ]; then
  echo
  echo "      Die Datenbank ist nicht erreichbar." >&2
  echo "      DATABASE_URL: ${DATABASE_URL:-nicht gesetzt}" >&2
  echo "      Prüfen Sie, ob der Dienst 'db' läuft." >&2
  exit 1
fi

# --- Schema ---------------------------------------------------------------
echo "[4/5] Migrationen einspielen ..."
npx prisma migrate deploy

# --- Beispielbestand ------------------------------------------------------
echo "[5/5] Beispielbestand ..."
vorhanden=$(npx tsx --eval "
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
p.betrieb.count()
  .then((n) => { console.log(n); })
  .catch(() => { console.log(0); })
  .finally(() => p.\$disconnect());
" 2>/dev/null | tail -1 || echo 0)

if [ "${BESTAND_NEU:-nein}" = "ja" ] || [ "$vorhanden" = "0" ]; then
  npm run db:seed
else
  echo "      Es sind bereits Daten vorhanden – der Beispielbestand wird nicht"
  echo "      erneut angelegt. Erzwingen mit: BESTAND_NEU=ja npm run setup"
fi

cat <<'HINWEIS'

=== Fertig ==============================================================

Starten mit:

    npm run dev

Anmeldung – alle Konten mit dem Passwort Start!Passwort2026:

  m.kowalski@medtech-solingen.example    Betriebsratsvorsitz, sieht alles
  t.brenner@medtech-solingen.example     einfaches Mitglied
  c.vahle@medtech-solingen.example       Ersatzmitglied, nur Lesezugriff
  personal@medtech-solingen.example      Personalabteilung, nur Antragsportal
  datenschutz@medtech-solingen.example   DSB, nur Datenschutzmodul
  it-betrieb@medtech-solingen.example    IT-Betrieb, nur technische Kennzahlen

Der aufschlussreichste Test: Melden Sie sich als Vorsitz an, merken Sie sich
die Adresse einer Sitzung, und rufen Sie dieselbe Adresse als
Personalabteilung auf. Sie erhalten 404.

HINWEIS
