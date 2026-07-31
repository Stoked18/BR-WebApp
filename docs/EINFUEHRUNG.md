# Einführung im Betrieb

Vorschlag für das Vorgehen — von der ersten Befassung im Gremium bis zum
Regelbetrieb. Die Reihenfolge ist nicht beliebig: Ohne Beschluss keine Kosten,
ohne geklärten Betrieb kein Datenschutz, ohne Schulung keine saubere Nutzung.

## 1. Befassung im Gremium

Ein Tagesordnungspunkt, ein Beschluss. Vorschlag für den Wortlaut:

> Der Betriebsrat beschließt, zur Organisation seiner Arbeit die quelloffene
> Anwendung BR-Cockpit einzusetzen. Die Anwendung wird ausschließlich im
> Rechenzentrum des Unternehmens betrieben; eine Nutzung von Diensten Dritter
> findet nicht statt. Der Vorsitzende wird beauftragt, die erforderliche
> Sachausstattung nach § 40 Abs. 2 BetrVG beim Arbeitgeber geltend zu machen und
> eine Vereinbarung über den technischen Betrieb abzuschließen, die den Zugriff
> des Arbeitgebers und seiner IT-Abteilung auf die Inhalte ausschließt.

Ein zweiter Beschluss regelt die Verwahrung des Dokumentenschlüssels:

> Der Schlüssel zur Verschlüsselung der Dokumentenablage wird von der
> Vorsitzenden und dem stellvertretenden Vorsitzenden getrennt verwahrt. Der
> IT-Abteilung des Arbeitgebers wird er nicht überlassen. Dem Betriebsrat ist
> bewusst, dass ein Verlust des Schlüssels den unwiederbringlichen Verlust der
> abgelegten Dokumente zur Folge hat.

## 2. Sachausstattung nach § 40 Abs. 2 BetrVG

Der Arbeitgeber hat dem Betriebsrat Informations- und Kommunikationstechnik in
erforderlichem Umfang zur Verfügung zu stellen. Für ein Gremium dieser Größe mit
laufenden Beteiligungsverfahren ist eine Anwendung zur Fristen- und
Sitzungsverwaltung ohne Weiteres erforderlich — die Alternative sind
Tabellenblätter auf Netzlaufwerken, auf die die IT ohnehin Zugriff hat.

Geltend zu machen sind: virtuelle Maschine oder Containerplattform, Sicherung,
Zertifikat und interner Name, sowie der Aufwand für Einrichtung und Betrieb.

## 3. Vereinbarung über den technischen Betrieb

Keine Betriebsvereinbarung im Sinne des § 77 BetrVG — der Betriebsrat regelt
seine eigene Arbeitsorganisation, darüber wird nicht mitbestimmt. Sinnvoll ist
gleichwohl eine schriftliche Abrede, die festhält:

- wer die Maschinen betreibt und welchen administrativen Zugang das erfordert
- dass administrativer Zugang nicht zu fachlichem Zugang wird
- dass Sicherungen den Dokumentenschlüssel nicht enthalten
- wie mit Protokolldaten des Reverse Proxy umgegangen wird
- wie Betroffenenanträge nach Art. 15 DSGVO abgewickelt werden

Der letzte Punkt ist heikel und sollte ausdrücklich geregelt werden: Der
Arbeitgeber ist nach § 79a S. 2 BetrVG Verantwortlicher und damit
Auskunftsschuldner, kann die Auskunft aber nicht selbst erteilen, ohne die
Vertraulichkeit zu verletzen. Der gangbare Weg führt über die
Datenschutzbeauftragten, die nach § 79a S. 3 BetrVG gegenüber dem Arbeitgeber
zur Verschwiegenheit verpflichtet sind.

## 4. Abstimmung mit dem Datenschutz

Die Unterlage [DATENSCHUTZ.md](DATENSCHUTZ.md) ist als Zulieferung zum
Verarbeitungsverzeichnis des Arbeitgebers gedacht. Mit der oder dem
Datenschutzbeauftragten zu klären:

- Aufnahme der Verarbeitungen in das Verzeichnis nach Art. 30 DSGVO
- Bewertung der Folgenabschätzung zu den Kündigungsanhörungen
- Aufbewahrungsfristen, soweit von den Vorbelegungen abgewichen wird
- Verfahren bei Betroffenenanträgen

## 5. Stammdaten

Vor der ersten produktiven Nutzung zu erfassen:

- Betrieb mit **beiden** Beschäftigtenzahlen — Stammbeschäftigte und
  Wahlberechtigte. Die zweite entscheidet über die Gremiumsgröße nach § 9 BetrVG
  und schließt die nach § 7 S. 2 BetrVG wahlberechtigten Leiharbeitnehmer ein.
- Amtsperiode mit Wahltag und Wahlverfahren
- **Wahlergebnis mit den Stimmenzahlen aller Bewerber.** Ohne diese Zahlen kann
  die Anwendung das Nachrücken nach § 25 Abs. 2 S. 2 BetrVG nicht ermitteln. Die
  Zahlen stehen in der Wahlniederschrift des Wahlvorstands.
- Mitglieder und Ersatzmitglieder, Funktionen, Freistellungen
- Ausschüsse mit den Übertragungsbeschlüssen im Wortlaut
- Schichtmodelle mit Gruppen — Grundlage für die Terminplanung nach
  § 30 Abs. 1 S. 2 BetrVG
- Bestand an Betriebsvereinbarungen

Bei den Ausschüssen lohnt der genaue Blick: Wurden Aufgaben zur selbständigen
Erledigung übertragen, und wenn ja, welche genau und mit welcher Mehrheit? Eine
pauschale Übertragung „aller personellen Angelegenheiten" wäre unwirksam, weil
sie den Gegenstand nicht hinreichend bestimmt bezeichnet.

## 6. Benutzerkonten

Konten nur für Personen anlegen, die sie brauchen. Die Rolle bestimmt den
Zugriff:

| Person | Rolle |
| --- | --- |
| Vorsitz | `BR_VORSITZ` |
| Stellvertretung | `BR_STELLV` |
| übrige Mitglieder | `BR_MITGLIED` |
| Ersatzmitglieder | `ERSATZMITGLIED` (nur Lesezugriff) |
| Schwerbehindertenvertretung | `SBV` |
| Jugend- und Auszubildendenvertretung | `JAV` |
| Personalabteilung | `AG_PERSONAL` |
| Führungskräfte mit Anträgen | `AG_FACHBEREICH` |
| Fachkraft für Arbeitssicherheit | `AG_ARBEITSSICHERHEIT` |
| Datenschutzbeauftragte:r | `DSB` |
| Systembetreuung | `IT_BETRIEB` |

Die drei arbeitgeberseitigen Rollen sehen ausschließlich ihre eigenen Anträge.
`IT_BETRIEB` sieht nur technische Kennzahlen. Beides ist getestet und im Browser
geprüft.

## 7. Geschäftsordnung anpassen

Die Anwendung setzt an mehreren Stellen Werte voraus, die das Gesetz offenlässt.
Sie gehören nach § 36 BetrVG in die Geschäftsordnung:

- **Ladungsfrist.** § 29 Abs. 2 S. 3 BetrVG verlangt rechtzeitige Ladung, nennt
  aber keine Tageszahl. Im vollkontinuierlichen Betrieb ist sie so zu bemessen,
  dass sie auch Nacht- und Wochenendschichten erreicht — sieben Tage sind
  vorbelegt, mehr kann angemessen sein.
- **Einspruchsfrist gegen die Niederschrift.** Gesetzlich nicht geregelt, zwei
  Wochen sind vorbelegt.
- **Video- und Telefonkonferenz.** § 30 Abs. 2 Nr. 1 BetrVG verlangt zwingend
  eine Regelung in der Geschäftsordnung, die den Vorrang der Präsenzsitzung
  sichert. Ohne sie darf nicht per Video getagt werden — und gerade im
  Schichtbetrieb ist das eine spürbare Einschränkung.

## 8. Schulung des Gremiums

Ein halber Tag genügt, wenn er die richtigen Punkte trifft:

- Fristenlogik: warum das Bundesland zählt und was die Zustimmungsfiktion
  bedeutet
- die Unvollständigkeitsrüge nach § 99 Abs. 1 BetrVG als wichtigster Hebel
- Verhinderung melden und was beim Nachrücken passiert
- warum vor der Eröffnung der Sitzung keine Beschlüsse erfassbar sind
- der Unterschied zwischen einfacher Mehrheit und Mehrheit der Mitglieder
- was die Arbeitgeberseite sieht — und was nicht

Der letzte Punkt ist wichtig für die Akzeptanz. Ein Gremium, das nicht sicher
weiß, dass die Personalabteilung seine Beratungen nicht mitliest, wird die
Anwendung nicht ehrlich nutzen.

Die Schulung selbst ist nach § 37 Abs. 6 BetrVG erforderlich, soweit sie sich auf
die Beteiligungsrechte und Fristen bezieht.

## 9. Übergang

Zwei bis drei Monate parallel führen, dann umstellen. Zuerst die Vorgänge mit
Fristen — dort ist der Nutzen am größten und der Fehler am teuersten. Sitzungen
und Beschlussregister folgen mit der nächsten ordentlichen Sitzung.

Altbestände nicht vollständig nacherfassen. Sinnvoll sind: laufende Vorgänge, der
Bestand an Betriebsvereinbarungen und die Beschlüsse der laufenden Amtsperiode.
Alles Ältere bleibt in der bisherigen Ablage.

## 10. Im Regelbetrieb

- **Vierteljährlich** die Kettenprüfung des Zugriffsprotokolls auswerten und das
  Ergebnis in die Niederschrift aufnehmen.
- **Vierteljährlich** die Rechtsprüfung durchgehen — sie meldet fehlende
  Niederschriften, überfällige Regeltermine und fällige Löschungen.
- **Jährlich** die Wiederherstellung aus der Sicherung üben.
- **Bei jeder Änderung im Gremium** — Ausscheiden, Nachrücken, neue Funktion —
  die Stammdaten nachziehen. Sonst ermittelt die Anwendung das falsche
  Ersatzmitglied, und das kann Beschlüsse unwirksam machen.
