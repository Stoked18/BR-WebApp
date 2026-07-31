# Datenschutz

Diese Unterlage beschreibt, wie die Anwendung die Anforderungen der DSGVO und des
§ 79a BetrVG umsetzt. Sie ist als Zulieferung des Betriebsrats zum Verzeichnis
der Verarbeitungstätigkeiten des Arbeitgebers gedacht und dient zugleich als
Grundlage für die Abstimmung mit der oder dem Datenschutzbeauftragten.

## Die Ausgangslage

§ 79a BetrVG stellt seit 2021 klar:

> Bei der Verarbeitung personenbezogener Daten hat der Betriebsrat die
> Vorschriften über den Datenschutz einzuhalten. Soweit der Betriebsrat zur
> Erfüllung der in seiner Zuständigkeit liegenden Aufgaben personenbezogene
> Daten verarbeitet, ist der Arbeitgeber der für die Verarbeitung
> Verantwortliche im Sinne der datenschutzrechtlichen Vorschriften.

Daraus folgt eine Konstellation, die technisch aufzulösen ist: Der Arbeitgeber
trägt die Verantwortung nach Art. 4 Nr. 7 DSGVO, darf aber wegen § 78 BetrVG
(Behinderungs- und Benachteiligungsverbot) und § 79 BetrVG (Geheimhaltung)
gerade **keinen** Einblick in die Betriebsratsunterlagen nehmen. Wer die Server
betreibt, ist derselbe, der die Daten nicht sehen darf.

§ 79a S. 3 BetrVG löst das für die Datenschutzbeauftragten ausdrücklich: Sie sind
gegenüber dem Arbeitgeber zur Verschwiegenheit über die Informationen
verpflichtet, die ihnen aus der Betriebsratsarbeit bekannt werden.

Für alle anderen muss die Technik die Trennung leisten.

## Verantwortlichkeit und Rollen

| Beteiligte | Rolle nach DSGVO | Zugriff in der Anwendung |
| --- | --- | --- |
| Arbeitgeber | Verantwortlicher (Art. 4 Nr. 7) | kein Zugriff auf Inhalte |
| Betriebsrat | verarbeitet in eigener Zuständigkeit | voller fachlicher Zugriff |
| Datenschutzbeauftragte:r | Aufgaben nach Art. 39 DSGVO | Datenschutzmodul und Protokoll, keine Sachakten |
| IT-Betrieb | im Auftrag des Verantwortlichen | technische Kennzahlen, keine Fachdaten |
| Personalabteilung, Führungskräfte | Antragstellende | eigene Anträge und die Antwort darauf |

## Rechtsgrundlagen der Verarbeitung

Die Verarbeitung stützt sich auf **Art. 6 Abs. 1 lit. c DSGVO** in Verbindung
mit der jeweiligen Norm des BetrVG — die Beteiligungsrechte begründen eine
rechtliche Verpflichtung. Eine Einwilligung wird nicht eingeholt; sie wäre im
Beschäftigungsverhältnis ohnehin selten freiwillig.

Für besondere Kategorien personenbezogener Daten — Gesundheitsangaben im
Eingliederungsmanagement, die Schwerbehinderteneigenschaft, Angaben in
Kündigungsanhörungen — greift **Art. 9 Abs. 2 lit. b DSGVO** in Verbindung mit
§ 26 Abs. 3 BDSG.

Die vollständige Zuordnung je Verarbeitungstätigkeit steht im
Verarbeitungsverzeichnis der Anwendung (Menüpunkt *Verarbeitung und Löschung*)
und lässt sich dort pflegen.

## Datenminimierung

Art. 5 Abs. 1 lit. c DSGVO ist an mehreren Stellen konstruktiv umgesetzt:

- **Vorgänge tragen Initialen, keine Klarnamen.** Die vollständigen Angaben
  stehen in der Anlage zur Unterrichtung, die der Arbeitgeber beifügt — nicht in
  den durchsuchbaren Feldern.
- **Verhinderungsgründe werden als Kategorie gespeichert**, nicht als Freitext.
  Wer krank ist, erzeugt den Eintrag „Arbeitsunfähigkeit"; Diagnosen gehören
  nicht in Sitzungsunterlagen.
- **IP-Adressen werden nur pseudonymisiert protokolliert** — als gesalzener
  Hash, aus dem sich die Adresse nicht zurückrechnen lässt.
- **Das Protokoll speichert keine Inhalte**, sondern nur, wer wann welche Art von
  Zugriff hatte.

## Technische und organisatorische Maßnahmen (Art. 32 DSGVO)

### Vertraulichkeit

**Zugriffskontrolle.** Rollenbasiert, mit Prüfung auf jeder einzelnen Seite. Das
Ausblenden von Menüpunkten allein wäre keine Kontrolle — wer die Adresse kennt,
käme sonst durch. Ein Zugriff ohne Berechtigung führt zu 404, nicht zu einer
Fehlermeldung: Die Arbeitgeberseite soll aus dem Verhalten der Anwendung nichts
über die Binnenstruktur des Gremiums lernen. Die Trennung ist durch Tests
abgesichert (`src/lib/authz.test.ts`).

**Vertraulichkeitsstufen.** Jedes Dokument und jeder Tagesordnungspunkt trägt
eine Stufe: öffentlich, gremiumsintern, vertraulich nach § 79 BetrVG oder
personenbezogen. Die Stufe steuert die Sichtbarkeit unabhängig von der Rolle.

**Verschlüsselung der Ablage.** Dokumentinhalte werden mit AES-256-GCM
verschlüsselt (`src/lib/krypto.ts`). Der Schlüssel steht in der Umgebung des
Anwendungsdienstes, nicht in der Datenbank und nicht in der Sicherung. Damit
gibt ein Datenbank-Dump — den die IT für die Sicherung ohnehin anfertigt — keine
Betriebsratsunterlagen preis. Das ist die entscheidende Maßnahme gegen den
strukturellen Konflikt aus § 79a BetrVG.

Der Schlüssel gehört in die Verwahrung des Betriebsrats, etwa hinterlegt beim
Vorsitz und der Stellvertretung. Geht er verloren, sind die Dokumente
unwiederbringlich verloren — das ist der Preis der Maßnahme und im Gremium zu
beschließen.

**Transportverschlüsselung.** Die Anwendung lauscht nur auf der Loopback-Adresse
und wird über einen Reverse Proxy mit TLS veröffentlicht. Cookies sind
`HttpOnly`, `SameSite=Lax` und im Produktivbetrieb `Secure`.

### Integrität

**Verkettetes Protokoll.** Jeder Eintrag enthält den Hash seines Vorgängers.
Wird ein Eintrag nachträglich verändert oder gelöscht, bricht die Kette und die
Prüfung im Menüpunkt *Zugriffsprotokoll* schlägt an. Damit lässt sich belegen,
dass niemand unbemerkt Einsicht genommen hat — auch nicht mit
Datenbankzugriff.

Empfehlung: Das Ergebnis der Kettenprüfung vierteljährlich im Gremium auswerten
und in die Niederschrift aufnehmen.

**Integritätssicherung der Niederschriften.** Freigegebene Niederschriften
erhalten einen Hash über den Inhalt.

### Verfügbarkeit

Sicherung von Datenbank und Dokumentenablage nach dem Verfahren des Hauses.
Wichtig: Der Dokumentenschlüssel darf **nicht** in derselben Sicherung liegen,
sonst ist die Maßnahme wertlos. Einzelheiten in [BETRIEB.md](BETRIEB.md).

### Belastbarkeit

Anmeldeversuche werden nach fünf Fehlschlägen für fünfzehn Minuten gesperrt.
Passwörter werden mit Argon2id nach den Parametern von BSI und OWASP gehasht.
Sitzungstokens laufen nach zehn Stunden ab — etwa eine Schicht plus Puffer.

## Löschkonzept

Art. 5 Abs. 1 lit. e DSGVO verlangt, personenbezogene Daten nur so lange
vorzuhalten, wie es der Zweck erfordert.

| Datenbestand | Aufbewahrung | Begründung |
| --- | --- | --- |
| Personelle Einzelmaßnahmen, Anhörungen | 36 Monate | Regelverjährung §§ 195, 199 BGB |
| Kollektive Vorgänge, Betriebsänderungen | 120 Monate | Auslegung späterer Vereinbarungen |
| Sitzungsniederschriften | 96 Monate | Amtszeit zuzüglich vier Jahre, damit Beschlüsse über den Gremienwechsel hinaus nachweisbar bleiben |
| Protokolleinträge | 12 Monate | Speicherbegrenzung |
| Aufzeichnungen aus Sprechstunden | 12 Monate | nach Erledigung nicht mehr erforderlich |

Die Fristen sind in der Anwendung hinterlegt und dort anpassbar. Überschrittene
Fristen meldet die Rechtsprüfung.

**Aussetzung der Löschung.** Läuft ein arbeitsgerichtliches Verfahren, ist die
Löschung bis zum rechtskräftigen Abschluss auszusetzen und der Grund zu
vermerken. Die Anwendung löscht deshalb nicht automatisch, sondern meldet nur,
was fällig ist — die Entscheidung bleibt beim Gremium.

## Datenschutz-Folgenabschätzung

Für die Anhörungen zu Kündigungen (§§ 102, 103 BetrVG) ist eine Folgenabschätzung
nach Art. 35 DSGVO als erforderlich bewertet: Es werden Gesundheits- und
Sozialdaten in einem Verfahren verarbeitet, das für die Betroffenen erhebliche
Folgen hat. Der Vermerk steht im Verarbeitungsverzeichnis.

Für die übrigen Verarbeitungen wurde keine Folgenabschätzung als erforderlich
angesehen. Die Anwendung führt keine Profilbildung durch, bewertet niemanden
automatisiert und überwacht kein Verhalten. Sie ist ausdrücklich **keine**
technische Einrichtung im Sinne des § 87 Abs. 1 Nr. 6 BetrVG zur Überwachung von
Beschäftigten — sie verarbeitet Vorgänge, keine Leistungsdaten.

## Betroffenenrechte

Anträge nach Art. 15 bis 21 DSGVO werden in der Anwendung erfasst, mit der
Monatsfrist des Art. 12 Abs. 3 DSGVO versehen und mit Ampel überwacht.

Zu beachten: Auskunft über Daten, die der Betriebsrat verarbeitet, ist beim
Arbeitgeber als Verantwortlichem zu beantragen. Dieser kann die Auskunft aber
nicht selbst erteilen, ohne die Vertraulichkeit zu verletzen. Der praktikable
Weg führt über die Datenschutzbeauftragten, die nach § 79a S. 3 BetrVG zur
Verschwiegenheit gegenüber dem Arbeitgeber verpflichtet sind. Das Verfahren
sollte zwischen Betriebsrat, Arbeitgeber und DSB schriftlich abgestimmt werden.

## Kein Drittlandtransfer

Die Anwendung wird ausschließlich im eigenen Rechenzentrum betrieben. Es gibt
keine Verbindung zu Diensten Dritter — keine Schriftarten von externen Servern,
keine Analysewerkzeuge, keine Fehlermeldedienste, keine Aktualisierungsprüfung.
Die Telemetrie des eingesetzten Web-Rahmenwerks ist im Container abgeschaltet.

Das ist bei Zugehörigkeit zu einem Konzern mit Sitz außerhalb der EU keine
Nebensächlichkeit: Eine Betriebsratsanwendung in einer Konzern-Cloud stünde
faktisch unter der Kontrolle des Arbeitgebers und wäre mit §§ 78, 79 BetrVG kaum
vereinbar — von Art. 44 ff. DSGVO abgesehen.

## Vor der Einführung zu klären

1. **Beschluss des Betriebsrats** über die Einführung und die Verwahrung des
   Dokumentenschlüssels.
2. **Abstimmung mit der oder dem Datenschutzbeauftragten** und Aufnahme der
   Verarbeitungen in das Verzeichnis des Arbeitgebers.
3. **Schriftliche Vereinbarung mit dem Arbeitgeber** über den Betrieb: Wer
   betreibt die Maschinen, wer hat administrativen Zugang, wie ist
   ausgeschlossen, dass administrativer Zugang zu fachlichem Zugang wird, wie
   werden Sicherungen gehandhabt. Grundlage ist § 40 Abs. 2 BetrVG — der
   Arbeitgeber schuldet die Informations- und Kommunikationstechnik.
4. **Verfahren für Betroffenenanträge** zwischen Betriebsrat, Arbeitgeber und DSB.
5. **Festlegung der Aufbewahrungsfristen** im Gremium, abweichend von den
   Vorbelegungen, wo dies geboten ist.

Ein Vorschlag für den Ablauf steht in [EINFUEHRUNG.md](EINFUEHRUNG.md).
