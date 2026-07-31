# BR-Cockpit

Verwaltungsanwendung für Betriebsräte. Quelloffen, ohne Cloud-Anbindung, für den
Betrieb im eigenen Rechenzentrum.

Entwickelt für einen Betrieb der Medizintechnik in Nordrhein-Westfalen:
Kunststoffspritzguss und Montage, rund 700 Beschäftigte, vollkontinuierlicher
Schichtbetrieb an 350 Tagen im Jahr, dreizehnköpfiger Betriebsrat aus
Personenwahl, Zugehörigkeit zu einem börsennotierten Konzern, Aufsichtsrat in
Vorbereitung.

![Sitzungsansicht](docs/bilder/sitzung.png)

## Wofür das gut ist

Die meisten Fehler in der Betriebsratsarbeit sind keine inhaltlichen, sondern
formale: eine Frist läuft ab, ein falsches Ersatzmitglied wird geladen, ein
Beschluss wird ohne Beschlussfähigkeit gefasst, eine Aufgabenübertragung
scheitert an der falschen Mehrheit. Solche Fehler kosten Rechte, die sich nicht
zurückholen lassen — bei § 99 BetrVG tritt mit Fristablauf die Zustimmungsfiktion
ein, und dann ist die Maßnahme durch.

Diese Anwendung rechnet die betroffenen Größen selbst aus und dokumentiert die
Herleitung. Sie ersetzt keine Rechtsberatung, aber sie zeigt, wo hinzusehen ist.

## Was sie kann

**Sitzungsbetrieb.** Ladung, Tagesordnung, Anwesenheitsliste, Niederschrift.
Beschlussfähigkeit nach § 33 Abs. 2 BetrVG wird laufend berechnet — vor der
Sitzung als Prognose, danach auf Grundlage der festgestellten Anwesenheit.
Beschlüsse lassen sich erst erfassen, wenn die Sitzung eröffnet und die
Anwesenheit festgestellt ist; eine Erfassung auf Grundlage der bloßen Ladung
wäre angreifbar. Bei der Abstimmung unterscheidet das System die einfache
Mehrheit der Anwesenden (§ 33 Abs. 1) von der Mehrheit der Mitglieder, die
§§ 27 Abs. 2, 28 Abs. 1 BetrVG für die Aufgabenübertragung verlangen.

**Nachrücken.** Meldet jemand eine Verhinderung, ermittelt das System das
Ersatzmitglied nach § 25 Abs. 2 S. 2 BetrVG — bei Personenwahl allein nach
Stimmenzahl — und protokolliert die Begründung. Betrifft die Verhinderung einen
Mindestsitz des Geschlechts in der Minderheit (§ 15 Abs. 2 BetrVG), wird
vorrangig eine Person desselben Geschlechts vorgeschlagen und die Abweichung
von der Stimmenreihenfolge begründet.

**Fristen.** Berechnung nach §§ 187, 188, 193 BGB mit den gesetzlichen
Feiertagen des Bundeslandes. Für Nordrhein-Westfalen zählen Fronleichnam und
Allerheiligen mit — genau diese beiden Tage verschieben in der Praxis die
Wochenfrist des § 99 BetrVG. Jede Berechnung erzeugt eine ausformulierte
Herleitung für die Akte.

**Mitbestimmungsvorgänge.** §§ 87, 90/91, 92, 93, 95, 96–98, 99, 100, 102, 103,
106, 111 BetrVG mit Fristenampel und Zustimmungsfiktions-Warnung. Die
unvollständige Unterrichtung nach § 99 Abs. 1 BetrVG lässt sich rügen; das setzt
den Fristlauf zurück und ist der wirksamste Schutz gegen die Fiktion.

**Zusammenarbeit mit den Fachbereichen.** Personalabteilung, Führungskräfte und
Arbeitssicherheit reichen Anträge über ein eigenes Portal ein. Sie sehen dort
ihren Vorgang, den Sachstand und die abschließende Antwort des Gremiums — sonst
nichts.

**Gremium und Ausschüsse.** Mitglieder, Ersatzmitglieder mit Nachrückreihenfolge,
Funktionen, Freistellungen nach § 38 BetrVG, Betriebsausschuss nach § 27,
weitere Ausschüsse nach § 28 mit dokumentierter Aufgabenübertragung,
Arbeitsgruppen nach § 28a, Wirtschaftsausschuss, ASA.

**Betriebsvereinbarungen** mit Laufzeit, Kündigungsfrist nach § 77 Abs. 5,
Nachwirkung nach § 77 Abs. 6 und Vermerk zur Prüfung des Tarifvorbehalts nach
§ 77 Abs. 3.

**Rechtsprüfung.** Automatischer Abgleich des Datenbestands mit BetrVG, ASiG und
DSGVO: Gremiumsgröße, Betriebsausschuss, Freistellungen, Quartalspflichten,
fehlende Niederschriften, verstrichene Fristen, Löschfristen.

**Aufsichtsrat.** Einordnung nach DrittelbG mit Fristenplan für die Wahl der
Arbeitnehmervertreter.

**Datenschutz.** Verzeichnis der Verarbeitungstätigkeiten nach Art. 30 DSGVO,
Löschkonzept, Betroffenenanträge mit Monatsfrist, verkettetes Zugriffsprotokoll.

## Sphärentrennung

Das ist die architektonisch wichtigste Eigenschaft. Nach § 79a S. 2 BetrVG ist
der Arbeitgeber datenschutzrechtlich Verantwortlicher auch für die Verarbeitung
durch den Betriebsrat. Ein Einsichtsrecht folgt daraus nicht — die
Unabhängigkeit des Gremiums (§ 78 BetrVG) und die Geheimhaltungspflicht
(§ 79 BetrVG) bleiben unberührt.

Umgesetzt ist das dreifach:

1. **Rollenmodell.** Arbeitgeberseitige Rollen besitzen genau ein Recht:
   `vorgang.einreichen`. Jede geschützte Seite prüft das erforderliche Recht
   selbst; das Ausblenden von Menüpunkten allein wäre keine Zugriffskontrolle.
   Wer eine Adresse ohne Berechtigung aufruft, erhält 404 statt eines Hinweises
   auf die Existenz der Seite.
2. **Kein fachlicher Zugriff für die IT.** Die Rolle `IT_BETRIEB` hat
   ausschließlich `system.verwalten` und sieht nur technische Kennzahlen.
3. **Verschlüsselte Ablage.** Dokumentinhalte werden mit AES-256-GCM
   verschlüsselt; der Schlüssel liegt außerhalb von Datenbank und Sicherung.
   Ein Datenbank-Dump allein gibt keine Betriebsratsunterlagen preis.

Die Trennung ist durch Tests abgesichert (`src/lib/authz.test.ts`) und im
Browser gegen die laufende Anwendung geprüft.

## Betrieb

```bash
cp .env.example .env
openssl rand -hex 32   # -> AUTH_SECRET
openssl rand -hex 32   # -> DOKUMENT_SCHLUESSEL
mkdir -p geheimnisse && openssl rand -base64 24 > geheimnisse/db_passwort

docker compose up -d --build
```

Die Anwendung lauscht auf `127.0.0.1:3000` und gehört hinter einen Reverse Proxy
mit TLS. Einzelheiten in [docs/BETRIEB.md](docs/BETRIEB.md).

### Entwicklung

```bash
npm install
npx prisma migrate deploy
npm run db:seed     # Beispielbestand des beschriebenen Betriebs
npm run dev
```

Die Beispielkonten nutzen das Passwort `Start!Passwort2026` und müssen es bei der
ersten Anmeldung ändern. `m.kowalski@medtech-solingen.example` ist der Vorsitz,
`personal@medtech-solingen.example` die Personalabteilung,
`it-betrieb@medtech-solingen.example` zeigt die Sicht ohne Fachzugriff.

```bash
npm test          # 100 Tests zur Rechts- und Berechtigungslogik
npm run typecheck
```

## Aufbau

```
prisma/schema.prisma      Datenmodell in der Fachsprache des BetrVG
src/lib/feiertage.ts      Feiertage der Bundesländer, Osterrechnung
src/lib/fristen.ts        §§ 187, 188, 193 BGB und der Fristenkatalog
src/lib/betrvg.ts         §§ 9, 15, 25, 27, 28, 30, 33, 37, 38, 106 BetrVG, DrittelbG
src/lib/sitzung.ts        Anwesenheit: Prognose gegen festgestellte Teilnahme
src/lib/authz.ts          Rollen, Rechte, Vertraulichkeitsstufen
src/lib/pruefung.ts       Regelwerk der automatischen Rechtsprüfung
src/lib/audit.ts          verkettetes Protokoll
src/lib/krypto.ts         verschlüsselte Dokumentenablage
src/app/(app)/            Oberfläche
```

Die Fachbegriffe sind durchgehend deutsch. Eine Übersetzung würde
Rechtsbegriffe verwässern: „Verhinderung" im Sinne des § 25 BetrVG ist nicht
dasselbe wie eine Abwesenheit, und „Beschlussfähigkeit" nicht dasselbe wie ein
Quorum.

## Weiterführende Unterlagen

- [docs/RECHTSGRUNDLAGEN.md](docs/RECHTSGRUNDLAGEN.md) — welche Norm wo
  umgesetzt ist, und was bewusst offen bleibt
- [docs/DATENSCHUTZ.md](docs/DATENSCHUTZ.md) — Verantwortlichkeit,
  Rechtsgrundlagen, technische und organisatorische Maßnahmen, Löschkonzept
- [docs/BETRIEB.md](docs/BETRIEB.md) — Installation, Sicherung, Aktualisierung
- [docs/EINFUEHRUNG.md](docs/EINFUEHRUNG.md) — Vorgehen zur Einführung im
  Betrieb einschließlich der erforderlichen Beschlüsse

## Rechtsstand und Grenzen

Der Stand des Rechts ist im Sommer 2026 abgebildet, bezogen auf einen Betrieb in
Nordrhein-Westfalen. Wo eine Frist oder ein Schwellenwert nicht unmittelbar aus
dem Gesetz folgt, sondern aus der Geschäftsordnung oder der Praxis, ist das in
der Anwendung ausdrücklich gekennzeichnet — etwa bei der Ladungsfrist des § 29
Abs. 2 BetrVG oder der Dreitagesfrist zu § 103 BetrVG.

Die Anwendung trifft keine rechtlichen Entscheidungen. Sie rechnet, erinnert und
dokumentiert. Ob eine Zustimmung zu verweigern ist und mit welcher Begründung,
entscheidet das Gremium.

## Lizenz

AGPL-3.0-or-later. Siehe [LICENSE](LICENSE).
