# Rechtsgrundlagen

Welche Norm wo umgesetzt ist — und wo die Anwendung bewusst nichts entscheidet.

Stand: Sommer 2026, bezogen auf einen Betrieb in Nordrhein-Westfalen.

## Lesehilfe

Die Anwendung unterscheidet drei Arten von Vorgaben:

- **Zwingendes Recht.** Fest im Quelltext, nicht konfigurierbar. Beispiel: die
  Beschlussfähigkeit nach § 33 Abs. 2 BetrVG.
- **Dispositives Recht.** Vorbelegt mit dem gesetzlichen Regelfall, überschreibbar.
  Beispiel: die dreimonatige Kündigungsfrist des § 77 Abs. 5 BetrVG.
- **Praxis und Geschäftsordnung.** In der Oberfläche als solche gekennzeichnet.
  Beispiel: die Ladungsfrist, für die § 29 Abs. 2 S. 3 BetrVG keine Tageszahl nennt.

Die dritte Gruppe ist die gefährlichste, weil sie sich wie Gesetz anfühlt. Sie
trägt deshalb überall den Hinweis, dass sie nicht unmittelbar aus dem Gesetz folgt.

## Zusammensetzung des Gremiums

| Norm | Gegenstand | Umsetzung |
| --- | --- | --- |
| § 9 BetrVG | Zahl der Mitglieder | `groesseBetriebsrat()`, vollständige Staffel einschließlich der Fortschreibung über 9.000 Arbeitnehmer |
| § 13 Abs. 1 | Wahlzeitraum 1. März bis 31. Mai | Amtsperiode, Hinweis in der Rechtsprüfung |
| § 13 Abs. 2 | Neuwahl außer der Reihe | Hinweistext bei Abweichung der Gremiumsgröße und bei erschöpfter Ersatzmitgliederliste |
| § 15 Abs. 2 | Geschlecht in der Minderheit | `mindestsitzeMinderheit()` nach dem Höchstzahlverfahren (§ 15 Abs. 2 WO) |
| § 21 | Amtszeit vier Jahre | Amtsperiode |
| § 25 Abs. 1 | Nachrücken bei Verhinderung | Verhinderungsmeldung erzeugt Ladung des Ersatzmitglieds |
| § 25 Abs. 2 S. 2 | Reihenfolge bei Personenwahl | `ermittleNachruecker()` — allein nach Stimmenzahl, kein Listenbezug |
| § 26 | Vorsitz und Stellvertretung | Funktionen, Prüfung in der Rechtsprüfung |
| § 38 Abs. 1 | Freistellungen | `freistellungen()`, vollständige Staffel |

**Zur Schwelle 700/701.** Der beschriebene Betrieb hat rund 700 Beschäftigte und
einen dreizehnköpfigen Betriebsrat. Nach § 9 BetrVG setzen dreizehn Mitglieder
mindestens 701 wahlberechtigte Arbeitnehmer voraus; bei genau 700 wären es elf.
Die Anwendung führt deshalb zwei getrennte Zahlen: Stammbeschäftigte und
Wahlberechtigte. Letztere schließen die nach § 7 S. 2 BetrVG wahlberechtigten
Leiharbeitnehmer ein, über die die Schwelle in solchen Betrieben regelmäßig
erreicht wird. Stimmen beide Zahlen nicht zur Gremiumsgröße, meldet die
Rechtsprüfung das — mit dem Hinweis, dass es auf den Tag des Wahlausschreibens
ankommt und eine spätere Veränderung nach § 13 Abs. 2 Nr. 1 BetrVG erst bei
erheblicher Abweichung zur Neuwahl führt.

## Ausschüsse

| Norm | Gegenstand | Umsetzung |
| --- | --- | --- |
| § 27 Abs. 1 | Betriebsausschuss ab neun Mitgliedern | `betriebsausschuss()` — bei 13 Mitgliedern fünf Personen |
| § 27 Abs. 2 S. 2 | Übertragung zur selbständigen Erledigung | Mehrheitserfordernis `MEHRHEIT_DER_MITGLIEDER` |
| § 28 Abs. 1 | weitere Ausschüsse | Ausschusstyp, Übertragungsvermerk |
| § 28 Abs. 1 S. 4 | nicht übertragbar | Hinweis auf der Ausschussseite: Betriebsvereinbarungen und § 111 BetrVG bleiben dem Gremium vorbehalten |
| § 28a | Arbeitsgruppen | eigener Ausschusstyp |
| § 106 f. | Wirtschaftsausschuss | `wirtschaftsausschuss()`, Pflicht ab 100 ständig Beschäftigten |
| § 11 ASiG | Arbeitsschutzausschuss, vierteljährlich | Turnusprüfung |

Die Aufgabenübertragung ist der Punkt, an dem in der Praxis am häufigsten etwas
schiefgeht: Sie verlangt die Mehrheit der Stimmen der *Mitglieder* — bei
dreizehn Mitgliedern also sieben Ja-Stimmen, unabhängig davon, wie viele
anwesend sind. Ein mit sechs Ja-Stimmen bei acht Anwesenden gefasster Beschluss
wäre nach § 33 Abs. 1 BetrVG angenommen, nach § 28 Abs. 1 S. 3 BetrVG aber nicht.
Die Anwendung wertet beide Maßstäbe getrennt aus und weist das Ergebnis mit
Begründung aus.

## Sitzungen und Beschlüsse

| Norm | Gegenstand | Umsetzung |
| --- | --- | --- |
| § 29 Abs. 2 | Einberufung, Mitteilung der Tagesordnung | Ladungsvermerk, Warnung bei fehlender Ladung |
| § 29 Abs. 3 | Einberufung auf Antrag eines Viertels | `viertelQuorum()` |
| § 30 Abs. 1 | während der Arbeitszeit, nicht öffentlich | Hinweis zur Terminlage im Schichtbetrieb |
| § 30 Abs. 2 | Video- und Telefonkonferenz | `pruefeVideositzung()` mit allen vier Voraussetzungen |
| § 31 | Gewerkschaftsbeauftragte | Teilnahmerolle |
| § 32 | Schwerbehindertenvertretung | Teilnahmerolle |
| § 33 Abs. 1 | Mehrheit der Anwesenden | `werteAbstimmung()`; Enthaltungen zählen nicht als Ja-Stimmen, Stimmengleichheit bedeutet Ablehnung |
| § 33 Abs. 1 S. 2 | Konferenzteilnahme gleicht Anwesenheit | Teilnahmeform ohne Einfluss auf die Zählung |
| § 33 Abs. 2 | Beschlussfähigkeit | `pruefeBeschlussfaehigkeit()`, bei 13 Mitgliedern mindestens 7 |
| § 34 Abs. 1 | Niederschrift, Wortlaut, Unterschriften | Niederschrift mit zwei Unterschriftsfeldern und Integritätshash |
| § 36 | Geschäftsordnung | Vermerk, Prüfung in der Rechtsprüfung |
| § 43 Abs. 1 | Betriebsversammlung je Quartal | Turnusprüfung |
| § 44 Abs. 1 | Teilversammlungen | Hinweis für den vollkontinuierlichen Betrieb |
| § 74 Abs. 1 | Monatsgespräch | Turnusprüfung |

**Kein Umlaufbeschluss.** Das BetrVG kennt die Beschlussfassung außerhalb einer
Sitzung nicht. Die Anwendung bietet deshalb bewusst keine Möglichkeit, per
E-Mail oder Abstimmungslink zu beschließen — auch nicht als Bequemlichkeit. Wer
kurzfristig beschließen muss, beruft nach § 29 Abs. 3 BetrVG eine
außerordentliche Sitzung ein, notfalls als Video- oder Telefonkonferenz unter den
Voraussetzungen des § 30 Abs. 2 BetrVG.

**Anwesenheit statt Ladung.** § 33 Abs. 2 BetrVG stellt auf die tatsächliche
Teilnahme an der Beschlussfassung ab. Vor der Sitzung zeigt die Anwendung
deshalb nur eine als solche gekennzeichnete Prognose und lässt keine Beschlüsse
zu. Erst mit der Eröffnung entsteht aus der Ladung die Anwesenheitsliste, die die
Sitzungsleitung korrigiert und die nach § 34 Abs. 1 S. 3 BetrVG zu unterzeichnen ist.

## Beteiligungsrechte und Fristen

| Norm | Frist | Rechtsfolge bei Ablauf |
| --- | --- | --- |
| § 99 Abs. 3 S. 1 | eine Woche | Zustimmung gilt als erteilt (§ 99 Abs. 3 S. 2) |
| § 102 Abs. 2 S. 1 | eine Woche | Schweigen gilt als Zustimmung (S. 2), kein Widerspruch mehr möglich |
| § 102 Abs. 2 S. 3 | drei Tage | abschließende Stellungnahme |
| § 100 Abs. 2 S. 3 | drei Tage | vorläufige Maßnahme darf fortbestehen |
| § 103 | **keine gesetzliche Frist** | keine Fiktion; der Arbeitgeber muss die Zustimmung gerichtlich ersetzen lassen |
| § 77 Abs. 5 | drei Monate | Ende der Betriebsvereinbarung, ggf. Nachwirkung |
| § 4 S. 1 KSchG | drei Wochen | Frist der beschäftigten Person, nur nachrichtlich geführt |
| Art. 12 Abs. 3 DSGVO | ein Monat | Verstoß gegen die Antwortpflicht |

Berechnet wird nach §§ 187 Abs. 1, 188, 193 BGB: Der Ereignistag zählt nicht mit,
die Wochenfrist endet am gleichnamigen Wochentag, und fällt das Ende auf
Sonnabend, Sonntag oder gesetzlichen Feiertag, tritt der nächste Werktag an seine
Stelle.

**Warum das Bundesland zählt.** § 193 BGB knüpft an das Feiertagsrecht am Ort der
Leistung an. In Nordrhein-Westfalen sind Fronleichnam und Allerheiligen
gesetzliche Feiertage, in Niedersachsen oder Berlin nicht. Eine am Donnerstag,
28. Mai 2026 zugegangene Anhörung nach § 99 BetrVG läuft in NRW am Freitag,
5. Juni 2026 ab — anderswo bereits am Donnerstag, 4. Juni. Ein Tag Unterschied
entscheidet über die Zustimmungsfiktion. Die Feiertagsberechnung
(`src/lib/feiertage.ts`) deckt alle sechzehn Bundesländer ab und ist getestet.

**§ 103 BetrVG.** Das Gesetz nennt hier keine Frist. Die Anwendung führt eine
Dreitagesfrist als Praxisvorgabe — in Anlehnung an § 102 Abs. 2 S. 3 BetrVG und
wegen der Zwei-Wochen-Frist des § 626 Abs. 2 BGB beim Arbeitgeber. Sie ist als
nicht gesetzlich gekennzeichnet, und ihr Ablauf begründet ausdrücklich keine
Zustimmungsfiktion.

**Die Unvollständigkeitsrüge.** Der praktisch wichtigste Hebel bei § 99 BetrVG:
Die Wochenfrist läuft erst ab vollständiger Unterrichtung. Fehlen Angaben oder
Unterlagen nach § 99 Abs. 1 BetrVG, ist das dem Arbeitgeber unverzüglich
mitzuteilen — die Frist beginnt dann nicht. Die Anwendung stellt dafür eine
eigene Funktion bereit, die den Fristlauf zurücksetzt und den Vorgang mit
Datum und Begründung dokumentiert.

## Kosten, Schulung, Sprechstunden

| Norm | Gegenstand | Umsetzung |
| --- | --- | --- |
| § 37 Abs. 2 | Arbeitsbefreiung | — (nicht abgebildet) |
| § 37 Abs. 6 | erforderliche Schulungen | eigene Grundlage, kein Kontingent, Mitteilungsvermerk |
| § 37 Abs. 7 | geeignete Schulungen | Kontingent drei bzw. vier Wochen je Amtsperiode |
| § 39 | Sprechstunden | Termine mit Schichtbezug |
| § 40 | Kosten und Sachaufwand | Kostenerfassung bei Schulungen |
| § 80 Abs. 3 | Sachverständige | als Teilnahmerolle und Aufgabe |

Das Kontingent des § 37 Abs. 7 BetrVG unterstellt derzeit den Regelwert von drei
Wochen. Für Mitglieder im Erstmandat sind es vier; das Merkmal „erstmals
gewählt" ist in den Stammdaten noch nicht erfasst und wäre bei Bedarf
nachzutragen.

## Betriebsvereinbarungen

| Norm | Gegenstand | Umsetzung |
| --- | --- | --- |
| § 77 Abs. 3 | Tarifvorbehalt | Pflichtvermerk, Warnung bei fehlender Prüfung |
| § 77 Abs. 5 | Kündigung, drei Monate | Fristberechnung ab Kündigungsdatum |
| § 77 Abs. 6 | Nachwirkung | Merkmal je Vereinbarung |
| §§ 50, 58 | Zuständigkeit von Gesamt- und Konzernbetriebsrat | Hinweistext bei konzernweiten Systemen |

Bei Tarifbindung an die Metall- und Elektroindustrie NRW ist § 77 Abs. 3 BetrVG
für jede Vereinbarung zu prüfen. Die Anwendung erzwingt die Prüfung nicht, macht
aber sichtbar, wo der Vermerk fehlt.

Bei konzernweit eingeführten Systemen — für einen Betrieb eines
NYSE-notierten Konzerns der Regelfall — ist zusätzlich die Zuständigkeit zu
klären. Eine Vereinbarung des unzuständigen Gremiums ist unwirksam.

## Unternehmensmitbestimmung

| Norm | Gegenstand | Umsetzung |
| --- | --- | --- |
| § 1 Abs. 1 Nr. 1 DrittelbG | Pflicht ab mehr als 500 Arbeitnehmern | `aufsichtsratLage()` |
| § 2 Abs. 2 DrittelbG | Zurechnung von Konzernunternehmen | Meilenstein mit Prüfauftrag |
| § 4 Abs. 1 DrittelbG | ein Drittel Arbeitnehmervertreter | Sitzberechnung |
| § 5 DrittelbG | unmittelbare, geheime Wahl | Meilenstein, Hinweis zur Schichtorganisation |
| § 6 DrittelbG | Wahlvorschläge | Meilenstein |
| § 95 AktG | Größe durch drei teilbar, mindestens drei | Aufrundung der Sitzzahl |
| §§ 97 ff. AktG | Statusverfahren | Hinweis, auch als Mittel gegen Verzögerung |
| § 116 AktG | Verschwiegenheit im Aufsichtsrat | eigene Rolle ohne Zugriff auf Sitzungsdaten |

Oberhalb von 2.000 Arbeitnehmern greift das MitbestG mit paritätischer
Besetzung; darauf weist die Anwendung hin, bildet das Verfahren aber nicht aus.

Die gesellschaftsrechtliche Umsetzung — Satzungsänderung, Statusverfahren — ist
Sache des Unternehmens. Die Anwendung begleitet den Zeitplan und organisiert die
Wahl der Arbeitnehmervertreter.

## Was bewusst offen bleibt

Diese Punkte sind nicht vergessen, sondern absichtlich nicht entschieden:

- **Ob eine Zustimmung zu verweigern ist.** Der Katalog des § 99 Abs. 2 BetrVG
  ist abschließend, die Subsumtion aber wertend. Die Anwendung erinnert an den
  Katalog und daran, dass eine Begründung außerhalb davon die Verweigerung
  unbeachtlich macht — die Entscheidung trifft das Gremium.
- **Ob eine Schulung erforderlich ist.** § 37 Abs. 6 BetrVG verlangt einen Bezug
  zur konkreten Aufgabe im Betrieb. Das lässt sich nicht automatisieren.
- **Ob eine Maßnahme eine Betriebsänderung nach § 111 BetrVG ist.** Die
  Schwellenwerte hängen von Art und Umfang ab und sind streitanfällig.
- **Die Zuständigkeitsabgrenzung nach §§ 50, 58 BetrVG.** Die Anwendung weist
  auf die Frage hin, beantwortet sie aber nicht.
- **Die Wirksamkeit der Betriebsratswahl selbst.** Anfechtung nach § 19 BetrVG
  und Nichtigkeit sind nicht abgebildet.

## Quellen

Maßgeblich ist der jeweils geltende Gesetzestext. Die Anwendung bildet den Stand
Sommer 2026 ab, einschließlich der durch das Betriebsrätemodernisierungsgesetz
2021 eingefügten §§ 30 Abs. 2, 33 Abs. 1 S. 2 und 79a BetrVG.

Vor einer Entscheidung mit erheblichen Folgen — Widerspruch gegen eine
Kündigung, Anrufung der Einigungsstelle, Beschlussverfahren — gehört die
Rechtsprüfung in fachkundige Hände. Diese Anwendung ersetzt sie nicht.
