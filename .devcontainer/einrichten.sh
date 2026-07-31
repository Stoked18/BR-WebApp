#!/usr/bin/env bash
# Richtet die Erprobungsumgebung ein: Abhaengigkeiten, Schema, Beispielbestand.
set -euo pipefail

echo "Installiere Abhängigkeiten ..."
npm ci

echo "Erzeuge Prisma-Client ..."
npx prisma generate

echo "Warte auf die Datenbank ..."
for i in $(seq 1 30); do
  if npx prisma db execute --schema prisma/schema.prisma --stdin <<< "SELECT 1;" >/dev/null 2>&1; then break; fi
  sleep 2
done

echo "Spiele Migrationen ein ..."
npx prisma migrate deploy

echo "Lege Beispielbestand an ..."
npm run db:seed

cat <<'HINWEIS'

Fertig. Starten mit:

    npm run dev

Anmeldung – alle Konten mit dem Passwort Start!Passwort2026:

  m.kowalski@medtech-solingen.example    Betriebsratsvorsitz, sieht alles
  t.brenner@medtech-solingen.example     einfaches Mitglied
  c.vahle@medtech-solingen.example       Ersatzmitglied, nur Lesezugriff
  personal@medtech-solingen.example      Personalabteilung, nur Antragsportal
  datenschutz@medtech-solingen.example   DSB, nur Datenschutzmodul
  it-betrieb@medtech-solingen.example    IT-Betrieb, nur technische Kennzahlen

Der Reiz liegt im Vergleich: Melden Sie sich als Vorsitz an, notieren Sie sich
die Adresse einer Sitzung, und rufen Sie dieselbe Adresse als Personalabteilung
auf. Sie erhalten 404.

HINWEIS
