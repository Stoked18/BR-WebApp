-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Systemrolle" AS ENUM ('BR_VORSITZ', 'BR_STELLV', 'BR_MITGLIED', 'ERSATZMITGLIED', 'JAV', 'SBV', 'WIRTSCHAFTSAUSSCHUSS', 'AUFSICHTSRAT_AN', 'AG_PERSONAL', 'AG_FACHBEREICH', 'AG_ARBEITSSICHERHEIT', 'DSB', 'IT_BETRIEB', 'AUDIT');

-- CreateEnum
CREATE TYPE "Wahlverfahren" AS ENUM ('PERSONENWAHL', 'LISTENWAHL');

-- CreateEnum
CREATE TYPE "Geschlecht" AS ENUM ('WEIBLICH', 'MAENNLICH', 'DIVERS', 'KEINE_ANGABE');

-- CreateEnum
CREATE TYPE "Gremiumstyp" AS ENUM ('BETRIEBSRAT', 'GESAMTBETRIEBSRAT', 'KONZERNBETRIEBSRAT', 'EUROBETRIEBSRAT', 'JAV', 'SBV', 'WIRTSCHAFTSAUSSCHUSS', 'AUFSICHTSRAT');

-- CreateEnum
CREATE TYPE "Mitgliedsstatus" AS ENUM ('ORDENTLICH', 'ERSATZMITGLIED', 'AUSGESCHIEDEN');

-- CreateEnum
CREATE TYPE "Funktionstyp" AS ENUM ('VORSITZ', 'STELLV_VORSITZ', 'SCHRIFTFUEHRUNG', 'BETRIEBSAUSSCHUSS_MITGLIED', 'AUSSCHUSS_VORSITZ', 'DATENSCHUTZKOORDINATION', 'WAHLVORSTAND', 'SBV_VERTRAUENSPERSON', 'JAV_VORSITZ', 'AUFSICHTSRAT_MITGLIED');

-- CreateEnum
CREATE TYPE "Freistellungsumfang" AS ENUM ('VOLL', 'TEILWEISE');

-- CreateEnum
CREATE TYPE "Ausschusstyp" AS ENUM ('BETRIEBSAUSSCHUSS', 'WEITERER_AUSSCHUSS', 'ARBEITSGRUPPE', 'WIRTSCHAFTSAUSSCHUSS', 'ARBEITSSCHUTZAUSSCHUSS', 'AD_HOC');

-- CreateEnum
CREATE TYPE "Sitzungsstatus" AS ENUM ('GEPLANT', 'EINGELADEN', 'LAUFEND', 'ABGESCHLOSSEN', 'PROTOKOLL_ENTWURF', 'PROTOKOLL_FREIGEGEBEN', 'ABGESAGT');

-- CreateEnum
CREATE TYPE "Sitzungsform" AS ENUM ('PRAESENZ', 'VIDEO', 'HYBRID');

-- CreateEnum
CREATE TYPE "Sitzungsart" AS ENUM ('ORDENTLICH', 'AUSSERORDENTLICH', 'AUSSCHUSS', 'BETRIEBSVERSAMMLUNG', 'ABTEILUNGSVERSAMMLUNG', 'MONATSGESPRAECH', 'ASA');

-- CreateEnum
CREATE TYPE "Topstatus" AS ENUM ('OFFEN', 'IN_BERATUNG', 'BESCHLOSSEN', 'VERTAGT', 'ZURUECKGEZOGEN', 'ZUR_KENNTNIS');

-- CreateEnum
CREATE TYPE "Vertraulichkeit" AS ENUM ('OEFFENTLICH', 'INTERN_BR', 'VERTRAULICH', 'PERSONENBEZOGEN');

-- CreateEnum
CREATE TYPE "Abstimmungsart" AS ENUM ('OFFEN', 'GEHEIM');

-- CreateEnum
CREATE TYPE "Beschlussergebnis" AS ENUM ('ANGENOMMEN', 'ABGELEHNT', 'VERTAGT', 'NICHT_BESCHLUSSFAEHIG');

-- CreateEnum
CREATE TYPE "Mehrheitserfordernis" AS ENUM ('EINFACHE_MEHRHEIT_ANWESENDE', 'MEHRHEIT_DER_MITGLIEDER', 'ZWEI_DRITTEL');

-- CreateEnum
CREATE TYPE "Teilnahmestatus" AS ENUM ('GELADEN', 'ANWESEND', 'ENTSCHULDIGT', 'UNENTSCHULDIGT', 'TEILWEISE', 'VERTRETEN');

-- CreateEnum
CREATE TYPE "Teilnahmerolle" AS ENUM ('ORDENTLICHES_MITGLIED', 'ERSATZMITGLIED', 'SBV', 'JAV', 'ARBEITGEBER', 'GEWERKSCHAFT', 'SACHVERSTAENDIGER', 'GAST', 'SCHRIFTFUEHRUNG');

-- CreateEnum
CREATE TYPE "Verhinderungsgrund" AS ENUM ('URLAUB', 'KRANKHEIT', 'DIENSTREISE', 'SCHICHT', 'BEFANGENHEIT', 'SONSTIGES');

-- CreateEnum
CREATE TYPE "Vorgangstyp" AS ENUM ('EINSTELLUNG_99', 'VERSETZUNG_99', 'EINGRUPPIERUNG_99', 'KUENDIGUNG_ORDENTLICH_102', 'KUENDIGUNG_AUSSERORDENTLICH_102', 'KUENDIGUNG_BR_MITGLIED_103', 'VORLAEUFIGE_MASSNAHME_100', 'MITBESTIMMUNG_87', 'UNTERRICHTUNG_80', 'PERSONALPLANUNG_92', 'AUSSCHREIBUNG_93', 'AUSWAHLRICHTLINIE_95', 'ARBEITSPLATZGESTALTUNG_90_91', 'BERUFSBILDUNG_96_98', 'BETRIEBSAENDERUNG_111', 'WIRTSCHAFTSAUSSCHUSS_106', 'BESCHWERDE_85', 'EINIGUNGSSTELLE_76', 'SONSTIGES');

-- CreateEnum
CREATE TYPE "Vorgangsstatus" AS ENUM ('EINGEGANGEN', 'IN_PRUEFUNG', 'IM_AUSSCHUSS', 'AUF_TAGESORDNUNG', 'BESCHLOSSEN', 'BEANTWORTET', 'FRIST_VERSTRICHEN', 'ABGESCHLOSSEN', 'ZURUECKGEZOGEN');

-- CreateEnum
CREATE TYPE "Fristart" AS ENUM ('KALENDERTAGE', 'WERKTAGE', 'ARBEITSTAGE', 'WOCHEN');

-- CreateEnum
CREATE TYPE "BVStatus" AS ENUM ('ENTWURF', 'IN_VERHANDLUNG', 'BESCHLOSSEN', 'IN_KRAFT', 'GEKUENDIGT', 'NACHWIRKEND', 'AUSSER_KRAFT');

-- CreateEnum
CREATE TYPE "Aufgabenstatus" AS ENUM ('OFFEN', 'IN_ARBEIT', 'WARTET', 'ERLEDIGT', 'ABGEBROCHEN');

-- CreateEnum
CREATE TYPE "Prioritaet" AS ENUM ('NIEDRIG', 'NORMAL', 'HOCH', 'KRITISCH');

-- CreateEnum
CREATE TYPE "Schulungsgrundlage" AS ENUM ('ERFORDERLICH_37_6', 'GEEIGNET_37_7', 'SBV_179_SGB_IX', 'JAV_65_BETRVG');

-- CreateEnum
CREATE TYPE "Schulungsstatus" AS ENUM ('GEPLANT', 'BESCHLOSSEN', 'AG_INFORMIERT', 'BESTAETIGT', 'ABGELEHNT', 'DURCHGEFUEHRT', 'STORNIERT');

-- CreateEnum
CREATE TYPE "AufsichtsratStatus" AS ENUM ('VORBEREITUNG', 'WAHLVORSTAND_BESTELLT', 'WAHLAUSSCHREIBEN', 'KANDIDATUR', 'WAHL', 'KONSTITUIERT');

-- CreateEnum
CREATE TYPE "Auditaktion" AS ENUM ('ANMELDUNG', 'ANMELDUNG_FEHLGESCHLAGEN', 'ABMELDUNG', 'LESEN', 'ANLEGEN', 'AENDERN', 'LOESCHEN', 'EXPORT', 'FREIGABE', 'RECHTEAENDERUNG', 'LOESCHLAUF');

-- CreateEnum
CREATE TYPE "AnfrageTyp" AS ENUM ('AUSKUNFT_15', 'BERICHTIGUNG_16', 'LOESCHUNG_17', 'EINSCHRAENKUNG_18', 'WIDERSPRUCH_21');

-- CreateEnum
CREATE TYPE "AnfrageStatus" AS ENUM ('EINGEGANGEN', 'IN_BEARBEITUNG', 'BEANTWORTET', 'ABGELEHNT');

-- CreateTable
CREATE TABLE "Benutzer" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "anzeigename" TEXT NOT NULL,
    "passwortHash" TEXT,
    "rollen" "Systemrolle"[],
    "aktiv" BOOLEAN NOT NULL DEFAULT true,
    "passwortWechsel" BOOLEAN NOT NULL DEFAULT true,
    "mfaSecret" TEXT,
    "letzterLogin" TIMESTAMP(3),
    "gesperrtBis" TIMESTAMP(3),
    "fehlversuche" INTEGER NOT NULL DEFAULT 0,
    "oidcSubject" TEXT,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "geaendertAm" TIMESTAMP(3) NOT NULL,
    "personId" TEXT,

    CONSTRAINT "Benutzer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sitzungstoken" (
    "id" TEXT NOT NULL,
    "benutzerId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "laeuftAbAm" TIMESTAMP(3) NOT NULL,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "widerrufen" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Sitzungstoken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Betrieb" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ort" TEXT NOT NULL,
    "bundesland" TEXT NOT NULL DEFAULT 'NW',
    "anzahlWahlberechtigte" INTEGER NOT NULL,
    "anzahlBeschaeftigte" INTEGER NOT NULL,
    "tarifgebunden" BOOLEAN NOT NULL DEFAULT false,
    "tarifvertrag" TEXT,
    "konzernName" TEXT,
    "boersennotiert" BOOLEAN NOT NULL DEFAULT false,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Betrieb_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Amtsperiode" (
    "id" TEXT NOT NULL,
    "betriebId" TEXT NOT NULL,
    "bezeichnung" TEXT NOT NULL,
    "beginn" TIMESTAMP(3) NOT NULL,
    "ende" TIMESTAMP(3) NOT NULL,
    "wahltag" TIMESTAMP(3),
    "wahlverfahren" "Wahlverfahren" NOT NULL DEFAULT 'PERSONENWAHL',
    "aktiv" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Amtsperiode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "vorname" TEXT NOT NULL,
    "nachname" TEXT NOT NULL,
    "personalnummer" TEXT,
    "email" TEXT,
    "telefon" TEXT,
    "abteilung" TEXT,
    "kostenstelle" TEXT,
    "geschlecht" "Geschlecht" NOT NULL DEFAULT 'KEINE_ANGABE',
    "eintrittsdatum" TIMESTAMP(3),
    "austrittsdatum" TIMESTAMP(3),
    "aktiv" BOOLEAN NOT NULL DEFAULT true,
    "bemerkung" TEXT,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "geaendertAm" TIMESTAMP(3) NOT NULL,
    "schichtgruppeId" TEXT,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gremium" (
    "id" TEXT NOT NULL,
    "betriebId" TEXT NOT NULL,
    "typ" "Gremiumstyp" NOT NULL,
    "bezeichnung" TEXT NOT NULL,
    "sollGroesse" INTEGER NOT NULL,
    "aktiv" BOOLEAN NOT NULL DEFAULT true,
    "geschaeftsordnungDokumentId" TEXT,
    "videoteilnahmeErlaubt" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Gremium_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mitgliedschaft" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "gremiumId" TEXT NOT NULL,
    "amtsperiodeId" TEXT NOT NULL,
    "status" "Mitgliedsstatus" NOT NULL DEFAULT 'ORDENTLICH',
    "nachrueckRang" INTEGER,
    "beginn" TIMESTAMP(3) NOT NULL,
    "ende" TIMESTAMP(3),
    "austrittsgrund" TEXT,

    CONSTRAINT "Mitgliedschaft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Funktion" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "typ" "Funktionstyp" NOT NULL,
    "gremiumId" TEXT,
    "ausschussId" TEXT,
    "beginn" TIMESTAMP(3) NOT NULL,
    "ende" TIMESTAMP(3),
    "beschlussId" TEXT,

    CONSTRAINT "Funktion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Freistellung" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "umfang" "Freistellungsumfang" NOT NULL DEFAULT 'VOLL',
    "prozent" INTEGER,
    "beginn" TIMESTAMP(3) NOT NULL,
    "ende" TIMESTAMP(3),
    "beschlussId" TEXT,

    CONSTRAINT "Freistellung_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ausschuss" (
    "id" TEXT NOT NULL,
    "gremiumId" TEXT NOT NULL,
    "typ" "Ausschusstyp" NOT NULL,
    "bezeichnung" TEXT NOT NULL,
    "beschreibung" TEXT,
    "aufgabenUebertragen" BOOLEAN NOT NULL DEFAULT false,
    "uebertrageneAufgaben" TEXT,
    "uebertragungsBeschlussId" TEXT,
    "beschlussbefugt" BOOLEAN NOT NULL DEFAULT false,
    "sollGroesse" INTEGER,
    "aktiv" BOOLEAN NOT NULL DEFAULT true,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ausschuss_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AusschussMitgliedschaft" (
    "id" TEXT NOT NULL,
    "ausschussId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "ersatz" BOOLEAN NOT NULL DEFAULT false,
    "vorsitz" BOOLEAN NOT NULL DEFAULT false,
    "beginn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ende" TIMESTAMP(3),

    CONSTRAINT "AusschussMitgliedschaft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sitzung" (
    "id" TEXT NOT NULL,
    "gremiumId" TEXT,
    "ausschussId" TEXT,
    "art" "Sitzungsart" NOT NULL DEFAULT 'ORDENTLICH',
    "nummer" TEXT NOT NULL,
    "titel" TEXT,
    "beginn" TIMESTAMP(3) NOT NULL,
    "ende" TIMESTAMP(3),
    "ort" TEXT,
    "form" "Sitzungsform" NOT NULL DEFAULT 'PRAESENZ',
    "videoLink" TEXT,
    "status" "Sitzungsstatus" NOT NULL DEFAULT 'GEPLANT',
    "einladungVersendetAm" TIMESTAMP(3),
    "ladungsfristTage" INTEGER NOT NULL DEFAULT 7,
    "widerspruchVideoAnzahl" INTEGER NOT NULL DEFAULT 0,
    "nichtoeffentlichkeitBestaetigt" BOOLEAN NOT NULL DEFAULT false,
    "leitungId" TEXT,
    "beschlussfaehig" BOOLEAN,
    "anwesendZahl" INTEGER,
    "erforderlichZahl" INTEGER,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "geaendertAm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sitzung_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tagesordnungspunkt" (
    "id" TEXT NOT NULL,
    "sitzungId" TEXT NOT NULL,
    "nummer" INTEGER NOT NULL,
    "titel" TEXT NOT NULL,
    "beschreibung" TEXT,
    "antragstellerPersonId" TEXT,
    "zeitbudgetMin" INTEGER,
    "status" "Topstatus" NOT NULL DEFAULT 'OFFEN',
    "vertraulichkeit" "Vertraulichkeit" NOT NULL DEFAULT 'INTERN_BR',
    "vorgangId" TEXT,

    CONSTRAINT "Tagesordnungspunkt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Beschluss" (
    "id" TEXT NOT NULL,
    "topId" TEXT NOT NULL,
    "aktenzeichen" TEXT NOT NULL,
    "wortlaut" TEXT NOT NULL,
    "rechtsgrundlage" TEXT,
    "art" "Abstimmungsart" NOT NULL DEFAULT 'OFFEN',
    "jaStimmen" INTEGER NOT NULL,
    "neinStimmen" INTEGER NOT NULL,
    "enthaltungen" INTEGER NOT NULL,
    "anwesendStimmberechtigt" INTEGER NOT NULL,
    "mehrheitserfordernis" "Mehrheitserfordernis" NOT NULL DEFAULT 'EINFACHE_MEHRHEIT_ANWESENDE',
    "ergebnis" "Beschlussergebnis" NOT NULL,
    "gefasstAm" TIMESTAMP(3) NOT NULL,
    "bemerkung" TEXT,
    "umgesetztAm" TIMESTAMP(3),
    "vorgangId" TEXT,

    CONSTRAINT "Beschluss_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Teilnahme" (
    "id" TEXT NOT NULL,
    "sitzungId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "rolle" "Teilnahmerolle" NOT NULL DEFAULT 'ORDENTLICHES_MITGLIED',
    "status" "Teilnahmestatus" NOT NULL DEFAULT 'ANWESEND',
    "stimmberechtigt" BOOLEAN NOT NULL DEFAULT true,
    "form" "Sitzungsform" NOT NULL DEFAULT 'PRAESENZ',
    "von" TIMESTAMP(3),
    "bis" TIMESTAMP(3),
    "unterschriebenAm" TIMESTAMP(3),
    "bemerkung" TEXT,

    CONSTRAINT "Teilnahme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verhinderung" (
    "id" TEXT NOT NULL,
    "sitzungId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "grund" "Verhinderungsgrund" NOT NULL,
    "bemerkung" TEXT,
    "gemeldetAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ersatzPersonId" TEXT,
    "ersatzGeladenAm" TIMESTAMP(3),

    CONSTRAINT "Verhinderung_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Niederschrift" (
    "id" TEXT NOT NULL,
    "sitzungId" TEXT NOT NULL,
    "inhalt" TEXT NOT NULL,
    "erstelltVonPersonId" TEXT,
    "unterschriftVorsitzPersonId" TEXT,
    "unterschriftVorsitzAm" TIMESTAMP(3),
    "unterschriftWeiteresPersonId" TEXT,
    "unterschriftWeiteresAm" TIMESTAMP(3),
    "einspruchsfristBis" TIMESTAMP(3),
    "freigegebenAm" TIMESTAMP(3),
    "inhaltHash" TEXT,

    CONSTRAINT "Niederschrift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Einspruch" (
    "id" TEXT NOT NULL,
    "niederschriftId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "eingegangenAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "erledigtAm" TIMESTAMP(3),
    "erledigungsvermerk" TEXT,

    CONSTRAINT "Einspruch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vorgang" (
    "id" TEXT NOT NULL,
    "aktenzeichen" TEXT NOT NULL,
    "typ" "Vorgangstyp" NOT NULL,
    "titel" TEXT NOT NULL,
    "sachverhalt" TEXT,
    "gremiumId" TEXT,
    "ausschussId" TEXT,
    "einreicherId" TEXT,
    "fachbereich" TEXT,
    "betroffenePersonalnummer" TEXT,
    "betroffeneInitialen" TEXT,
    "eingegangenAm" TIMESTAMP(3) NOT NULL,
    "fristBis" TIMESTAMP(3),
    "fristTage" INTEGER,
    "fristArt" "Fristart",
    "zustimmungsfiktion" BOOLEAN NOT NULL DEFAULT false,
    "status" "Vorgangsstatus" NOT NULL DEFAULT 'EINGEGANGEN',
    "erledigtAm" TIMESTAMP(3),
    "antwortText" TEXT,
    "antwortAm" TIMESTAMP(3),
    "vertraulichkeit" "Vertraulichkeit" NOT NULL DEFAULT 'PERSONENBEZOGEN',
    "loeschenAb" TIMESTAMP(3),
    "geloeschtAm" TIMESTAMP(3),
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "geaendertAm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vorgang_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fristereignis" (
    "id" TEXT NOT NULL,
    "vorgangId" TEXT NOT NULL,
    "bezeichnung" TEXT NOT NULL,
    "grundlage" TEXT NOT NULL,
    "startAm" TIMESTAMP(3) NOT NULL,
    "endeAm" TIMESTAMP(3) NOT NULL,
    "berechnung" TEXT NOT NULL,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Fristereignis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Betriebsvereinbarung" (
    "id" TEXT NOT NULL,
    "nummer" TEXT NOT NULL,
    "titel" TEXT NOT NULL,
    "gegenstand" TEXT,
    "rechtsgrundlage" TEXT,
    "status" "BVStatus" NOT NULL DEFAULT 'ENTWURF',
    "abgeschlossenAm" TIMESTAMP(3),
    "inkrafttretenAm" TIMESTAMP(3),
    "befristetBis" TIMESTAMP(3),
    "kuendigungsfristMonate" INTEGER DEFAULT 3,
    "gekuendigtAm" TIMESTAMP(3),
    "gekuendigtVon" TEXT,
    "ausserKraftAm" TIMESTAMP(3),
    "nachwirkung" BOOLEAN NOT NULL DEFAULT false,
    "tarifvorbehaltGeprueft" BOOLEAN NOT NULL DEFAULT false,
    "tarifvorbehaltVermerk" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "vorgaengerId" TEXT,
    "beschlussId" TEXT,
    "bemerkung" TEXT,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "geaendertAm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Betriebsvereinbarung_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Aufgabe" (
    "id" TEXT NOT NULL,
    "titel" TEXT NOT NULL,
    "beschreibung" TEXT,
    "status" "Aufgabenstatus" NOT NULL DEFAULT 'OFFEN',
    "prioritaet" "Prioritaet" NOT NULL DEFAULT 'NORMAL',
    "faelligAm" TIMESTAMP(3),
    "erledigtAm" TIMESTAMP(3),
    "zustaendigId" TEXT,
    "ausschussId" TEXT,
    "erstellerId" TEXT,
    "sitzungId" TEXT,
    "topId" TEXT,
    "vorgangId" TEXT,
    "bvId" TEXT,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "geaendertAm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Aufgabe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dokument" (
    "id" TEXT NOT NULL,
    "titel" TEXT NOT NULL,
    "dateiname" TEXT NOT NULL,
    "mimetype" TEXT NOT NULL,
    "groesseByte" INTEGER NOT NULL,
    "speicherpfad" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "verschluesselt" BOOLEAN NOT NULL DEFAULT true,
    "vertraulichkeit" "Vertraulichkeit" NOT NULL DEFAULT 'INTERN_BR',
    "kategorie" TEXT,
    "uploaderId" TEXT,
    "topId" TEXT,
    "vorgangId" TEXT,
    "bvId" TEXT,
    "loeschenAb" TIMESTAMP(3),
    "geloeschtAm" TIMESTAMP(3),
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Dokument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Schulung" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "amtsperiodeId" TEXT NOT NULL,
    "titel" TEXT NOT NULL,
    "anbieter" TEXT,
    "ort" TEXT,
    "beginn" TIMESTAMP(3) NOT NULL,
    "ende" TIMESTAMP(3) NOT NULL,
    "tage" INTEGER NOT NULL,
    "grundlage" "Schulungsgrundlage" NOT NULL DEFAULT 'ERFORDERLICH_37_6',
    "status" "Schulungsstatus" NOT NULL DEFAULT 'GEPLANT',
    "kostenEuro" DECIMAL(10,2),
    "beschlussId" TEXT,
    "agMitgeteiltAm" TIMESTAMP(3),
    "bemerkung" TEXT,

    CONSTRAINT "Schulung_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sprechstunde" (
    "id" TEXT NOT NULL,
    "personId" TEXT,
    "beginn" TIMESTAMP(3) NOT NULL,
    "ende" TIMESTAMP(3) NOT NULL,
    "ort" TEXT,
    "schichtbezug" TEXT,
    "bemerkung" TEXT,

    CONSTRAINT "Sprechstunde_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Schichtmodell" (
    "id" TEXT NOT NULL,
    "betriebId" TEXT NOT NULL,
    "bezeichnung" TEXT NOT NULL,
    "beschreibung" TEXT,
    "tageProJahr" INTEGER NOT NULL DEFAULT 350,
    "aktiv" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Schichtmodell_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Schichtgruppe" (
    "id" TEXT NOT NULL,
    "modellId" TEXT NOT NULL,
    "bezeichnung" TEXT NOT NULL,
    "beginnUhrzeit" TEXT NOT NULL,
    "endeUhrzeit" TEXT NOT NULL,

    CONSTRAINT "Schichtgruppe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wahlergebnis" (
    "id" TEXT NOT NULL,
    "amtsperiodeId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "stimmen" INTEGER NOT NULL,
    "gewaehlt" BOOLEAN NOT NULL DEFAULT false,
    "nachrueckRang" INTEGER,
    "quotenplatz" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Wahlergebnis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AufsichtsratProjekt" (
    "id" TEXT NOT NULL,
    "bezeichnung" TEXT NOT NULL,
    "rechtsgrundlage" TEXT NOT NULL DEFAULT 'DrittelbG',
    "sitzeGesamt" INTEGER NOT NULL,
    "sitzeArbeitnehmer" INTEGER NOT NULL,
    "status" "AufsichtsratStatus" NOT NULL DEFAULT 'VORBEREITUNG',
    "zieldatum" TIMESTAMP(3),
    "bemerkung" TEXT,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AufsichtsratProjekt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AufsichtsratMeilenstein" (
    "id" TEXT NOT NULL,
    "projektId" TEXT NOT NULL,
    "bezeichnung" TEXT NOT NULL,
    "rechtsgrundlage" TEXT,
    "faelligAm" TIMESTAMP(3),
    "erledigtAm" TIMESTAMP(3),
    "reihenfolge" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AufsichtsratMeilenstein_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verarbeitungstaetigkeit" (
    "id" TEXT NOT NULL,
    "bezeichnung" TEXT NOT NULL,
    "zweck" TEXT NOT NULL,
    "rechtsgrundlage" TEXT NOT NULL,
    "betroffeneKategorien" TEXT NOT NULL,
    "datenkategorien" TEXT NOT NULL,
    "empfaenger" TEXT,
    "drittlandtransfer" BOOLEAN NOT NULL DEFAULT false,
    "drittlandDetails" TEXT,
    "loeschfrist" TEXT NOT NULL,
    "tom" TEXT,
    "dsfaErforderlich" BOOLEAN NOT NULL DEFAULT false,
    "dsfaVermerk" TEXT,
    "standAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Verarbeitungstaetigkeit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Loeschregel" (
    "id" TEXT NOT NULL,
    "entitaet" TEXT NOT NULL,
    "bezeichnung" TEXT NOT NULL,
    "aufbewahrungMonate" INTEGER NOT NULL,
    "begruendung" TEXT NOT NULL,
    "aktiv" BOOLEAN NOT NULL DEFAULT true,
    "letzterLauf" TIMESTAMP(3),

    CONSTRAINT "Loeschregel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEintrag" (
    "id" TEXT NOT NULL,
    "zeitpunkt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "benutzerId" TEXT,
    "benutzerName" TEXT,
    "aktion" "Auditaktion" NOT NULL,
    "entitaet" TEXT NOT NULL,
    "entitaetId" TEXT,
    "details" TEXT,
    "ipHash" TEXT,
    "vorherigerHash" TEXT,
    "hash" TEXT NOT NULL,

    CONSTRAINT "AuditEintrag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Betroffenenanfrage" (
    "id" TEXT NOT NULL,
    "typ" "AnfrageTyp" NOT NULL,
    "antragstellerName" TEXT NOT NULL,
    "personalnummer" TEXT,
    "eingegangenAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fristBis" TIMESTAMP(3) NOT NULL,
    "status" "AnfrageStatus" NOT NULL DEFAULT 'EINGEGANGEN',
    "beschreibung" TEXT,
    "antwort" TEXT,
    "beantwortetAm" TIMESTAMP(3),
    "dsbEinbezogen" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Betroffenenanfrage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Einstellung" (
    "schluessel" TEXT NOT NULL,
    "wert" TEXT NOT NULL,
    "beschreibung" TEXT,
    "geaendertAm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Einstellung_pkey" PRIMARY KEY ("schluessel")
);

-- CreateIndex
CREATE UNIQUE INDEX "Benutzer_email_key" ON "Benutzer"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Benutzer_oidcSubject_key" ON "Benutzer"("oidcSubject");

-- CreateIndex
CREATE UNIQUE INDEX "Benutzer_personId_key" ON "Benutzer"("personId");

-- CreateIndex
CREATE INDEX "Benutzer_aktiv_idx" ON "Benutzer"("aktiv");

-- CreateIndex
CREATE UNIQUE INDEX "Sitzungstoken_tokenHash_key" ON "Sitzungstoken"("tokenHash");

-- CreateIndex
CREATE INDEX "Sitzungstoken_benutzerId_idx" ON "Sitzungstoken"("benutzerId");

-- CreateIndex
CREATE INDEX "Sitzungstoken_laeuftAbAm_idx" ON "Sitzungstoken"("laeuftAbAm");

-- CreateIndex
CREATE INDEX "Amtsperiode_betriebId_aktiv_idx" ON "Amtsperiode"("betriebId", "aktiv");

-- CreateIndex
CREATE UNIQUE INDEX "Person_personalnummer_key" ON "Person"("personalnummer");

-- CreateIndex
CREATE INDEX "Person_nachname_vorname_idx" ON "Person"("nachname", "vorname");

-- CreateIndex
CREATE INDEX "Person_aktiv_idx" ON "Person"("aktiv");

-- CreateIndex
CREATE INDEX "Gremium_betriebId_typ_idx" ON "Gremium"("betriebId", "typ");

-- CreateIndex
CREATE INDEX "Mitgliedschaft_gremiumId_status_idx" ON "Mitgliedschaft"("gremiumId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Mitgliedschaft_personId_gremiumId_amtsperiodeId_key" ON "Mitgliedschaft"("personId", "gremiumId", "amtsperiodeId");

-- CreateIndex
CREATE INDEX "Funktion_personId_typ_idx" ON "Funktion"("personId", "typ");

-- CreateIndex
CREATE INDEX "Funktion_typ_ende_idx" ON "Funktion"("typ", "ende");

-- CreateIndex
CREATE INDEX "Freistellung_personId_idx" ON "Freistellung"("personId");

-- CreateIndex
CREATE INDEX "Ausschuss_gremiumId_typ_idx" ON "Ausschuss"("gremiumId", "typ");

-- CreateIndex
CREATE INDEX "AusschussMitgliedschaft_personId_idx" ON "AusschussMitgliedschaft"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "AusschussMitgliedschaft_ausschussId_personId_key" ON "AusschussMitgliedschaft"("ausschussId", "personId");

-- CreateIndex
CREATE INDEX "Sitzung_gremiumId_beginn_idx" ON "Sitzung"("gremiumId", "beginn");

-- CreateIndex
CREATE INDEX "Sitzung_ausschussId_beginn_idx" ON "Sitzung"("ausschussId", "beginn");

-- CreateIndex
CREATE INDEX "Sitzung_status_idx" ON "Sitzung"("status");

-- CreateIndex
CREATE INDEX "Tagesordnungspunkt_vorgangId_idx" ON "Tagesordnungspunkt"("vorgangId");

-- CreateIndex
CREATE UNIQUE INDEX "Tagesordnungspunkt_sitzungId_nummer_key" ON "Tagesordnungspunkt"("sitzungId", "nummer");

-- CreateIndex
CREATE UNIQUE INDEX "Beschluss_aktenzeichen_key" ON "Beschluss"("aktenzeichen");

-- CreateIndex
CREATE INDEX "Beschluss_gefasstAm_idx" ON "Beschluss"("gefasstAm");

-- CreateIndex
CREATE INDEX "Beschluss_vorgangId_idx" ON "Beschluss"("vorgangId");

-- CreateIndex
CREATE INDEX "Teilnahme_personId_idx" ON "Teilnahme"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "Teilnahme_sitzungId_personId_key" ON "Teilnahme"("sitzungId", "personId");

-- CreateIndex
CREATE UNIQUE INDEX "Verhinderung_sitzungId_personId_key" ON "Verhinderung"("sitzungId", "personId");

-- CreateIndex
CREATE UNIQUE INDEX "Niederschrift_sitzungId_key" ON "Niederschrift"("sitzungId");

-- CreateIndex
CREATE UNIQUE INDEX "Vorgang_aktenzeichen_key" ON "Vorgang"("aktenzeichen");

-- CreateIndex
CREATE INDEX "Vorgang_status_fristBis_idx" ON "Vorgang"("status", "fristBis");

-- CreateIndex
CREATE INDEX "Vorgang_typ_idx" ON "Vorgang"("typ");

-- CreateIndex
CREATE INDEX "Vorgang_eingegangenAm_idx" ON "Vorgang"("eingegangenAm");

-- CreateIndex
CREATE UNIQUE INDEX "Betriebsvereinbarung_nummer_key" ON "Betriebsvereinbarung"("nummer");

-- CreateIndex
CREATE INDEX "Betriebsvereinbarung_status_idx" ON "Betriebsvereinbarung"("status");

-- CreateIndex
CREATE INDEX "Aufgabe_status_faelligAm_idx" ON "Aufgabe"("status", "faelligAm");

-- CreateIndex
CREATE INDEX "Aufgabe_zustaendigId_idx" ON "Aufgabe"("zustaendigId");

-- CreateIndex
CREATE INDEX "Dokument_vertraulichkeit_idx" ON "Dokument"("vertraulichkeit");

-- CreateIndex
CREATE INDEX "Dokument_loeschenAb_idx" ON "Dokument"("loeschenAb");

-- CreateIndex
CREATE INDEX "Schulung_personId_amtsperiodeId_idx" ON "Schulung"("personId", "amtsperiodeId");

-- CreateIndex
CREATE INDEX "Sprechstunde_beginn_idx" ON "Sprechstunde"("beginn");

-- CreateIndex
CREATE INDEX "Wahlergebnis_amtsperiodeId_stimmen_idx" ON "Wahlergebnis"("amtsperiodeId", "stimmen");

-- CreateIndex
CREATE UNIQUE INDEX "Wahlergebnis_amtsperiodeId_personId_key" ON "Wahlergebnis"("amtsperiodeId", "personId");

-- CreateIndex
CREATE INDEX "AufsichtsratMeilenstein_projektId_reihenfolge_idx" ON "AufsichtsratMeilenstein"("projektId", "reihenfolge");

-- CreateIndex
CREATE INDEX "Verarbeitungstaetigkeit_bezeichnung_idx" ON "Verarbeitungstaetigkeit"("bezeichnung");

-- CreateIndex
CREATE UNIQUE INDEX "Loeschregel_entitaet_key" ON "Loeschregel"("entitaet");

-- CreateIndex
CREATE INDEX "AuditEintrag_zeitpunkt_idx" ON "AuditEintrag"("zeitpunkt");

-- CreateIndex
CREATE INDEX "AuditEintrag_entitaet_entitaetId_idx" ON "AuditEintrag"("entitaet", "entitaetId");

-- CreateIndex
CREATE INDEX "AuditEintrag_benutzerId_idx" ON "AuditEintrag"("benutzerId");

-- CreateIndex
CREATE INDEX "Betroffenenanfrage_status_fristBis_idx" ON "Betroffenenanfrage"("status", "fristBis");

-- AddForeignKey
ALTER TABLE "Benutzer" ADD CONSTRAINT "Benutzer_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sitzungstoken" ADD CONSTRAINT "Sitzungstoken_benutzerId_fkey" FOREIGN KEY ("benutzerId") REFERENCES "Benutzer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Amtsperiode" ADD CONSTRAINT "Amtsperiode_betriebId_fkey" FOREIGN KEY ("betriebId") REFERENCES "Betrieb"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_schichtgruppeId_fkey" FOREIGN KEY ("schichtgruppeId") REFERENCES "Schichtgruppe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gremium" ADD CONSTRAINT "Gremium_betriebId_fkey" FOREIGN KEY ("betriebId") REFERENCES "Betrieb"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mitgliedschaft" ADD CONSTRAINT "Mitgliedschaft_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mitgliedschaft" ADD CONSTRAINT "Mitgliedschaft_gremiumId_fkey" FOREIGN KEY ("gremiumId") REFERENCES "Gremium"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mitgliedschaft" ADD CONSTRAINT "Mitgliedschaft_amtsperiodeId_fkey" FOREIGN KEY ("amtsperiodeId") REFERENCES "Amtsperiode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Funktion" ADD CONSTRAINT "Funktion_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Funktion" ADD CONSTRAINT "Funktion_ausschussId_fkey" FOREIGN KEY ("ausschussId") REFERENCES "Ausschuss"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Funktion" ADD CONSTRAINT "Funktion_beschlussId_fkey" FOREIGN KEY ("beschlussId") REFERENCES "Beschluss"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Freistellung" ADD CONSTRAINT "Freistellung_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ausschuss" ADD CONSTRAINT "Ausschuss_gremiumId_fkey" FOREIGN KEY ("gremiumId") REFERENCES "Gremium"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AusschussMitgliedschaft" ADD CONSTRAINT "AusschussMitgliedschaft_ausschussId_fkey" FOREIGN KEY ("ausschussId") REFERENCES "Ausschuss"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AusschussMitgliedschaft" ADD CONSTRAINT "AusschussMitgliedschaft_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sitzung" ADD CONSTRAINT "Sitzung_gremiumId_fkey" FOREIGN KEY ("gremiumId") REFERENCES "Gremium"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sitzung" ADD CONSTRAINT "Sitzung_ausschussId_fkey" FOREIGN KEY ("ausschussId") REFERENCES "Ausschuss"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sitzung" ADD CONSTRAINT "Sitzung_leitungId_fkey" FOREIGN KEY ("leitungId") REFERENCES "Benutzer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tagesordnungspunkt" ADD CONSTRAINT "Tagesordnungspunkt_sitzungId_fkey" FOREIGN KEY ("sitzungId") REFERENCES "Sitzung"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tagesordnungspunkt" ADD CONSTRAINT "Tagesordnungspunkt_vorgangId_fkey" FOREIGN KEY ("vorgangId") REFERENCES "Vorgang"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Beschluss" ADD CONSTRAINT "Beschluss_topId_fkey" FOREIGN KEY ("topId") REFERENCES "Tagesordnungspunkt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Beschluss" ADD CONSTRAINT "Beschluss_vorgangId_fkey" FOREIGN KEY ("vorgangId") REFERENCES "Vorgang"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Teilnahme" ADD CONSTRAINT "Teilnahme_sitzungId_fkey" FOREIGN KEY ("sitzungId") REFERENCES "Sitzung"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Teilnahme" ADD CONSTRAINT "Teilnahme_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Verhinderung" ADD CONSTRAINT "Verhinderung_sitzungId_fkey" FOREIGN KEY ("sitzungId") REFERENCES "Sitzung"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Verhinderung" ADD CONSTRAINT "Verhinderung_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Niederschrift" ADD CONSTRAINT "Niederschrift_sitzungId_fkey" FOREIGN KEY ("sitzungId") REFERENCES "Sitzung"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Einspruch" ADD CONSTRAINT "Einspruch_niederschriftId_fkey" FOREIGN KEY ("niederschriftId") REFERENCES "Niederschrift"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vorgang" ADD CONSTRAINT "Vorgang_gremiumId_fkey" FOREIGN KEY ("gremiumId") REFERENCES "Gremium"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vorgang" ADD CONSTRAINT "Vorgang_ausschussId_fkey" FOREIGN KEY ("ausschussId") REFERENCES "Ausschuss"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vorgang" ADD CONSTRAINT "Vorgang_einreicherId_fkey" FOREIGN KEY ("einreicherId") REFERENCES "Benutzer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fristereignis" ADD CONSTRAINT "Fristereignis_vorgangId_fkey" FOREIGN KEY ("vorgangId") REFERENCES "Vorgang"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aufgabe" ADD CONSTRAINT "Aufgabe_zustaendigId_fkey" FOREIGN KEY ("zustaendigId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aufgabe" ADD CONSTRAINT "Aufgabe_ausschussId_fkey" FOREIGN KEY ("ausschussId") REFERENCES "Ausschuss"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aufgabe" ADD CONSTRAINT "Aufgabe_erstellerId_fkey" FOREIGN KEY ("erstellerId") REFERENCES "Benutzer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aufgabe" ADD CONSTRAINT "Aufgabe_sitzungId_fkey" FOREIGN KEY ("sitzungId") REFERENCES "Sitzung"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aufgabe" ADD CONSTRAINT "Aufgabe_topId_fkey" FOREIGN KEY ("topId") REFERENCES "Tagesordnungspunkt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aufgabe" ADD CONSTRAINT "Aufgabe_vorgangId_fkey" FOREIGN KEY ("vorgangId") REFERENCES "Vorgang"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aufgabe" ADD CONSTRAINT "Aufgabe_bvId_fkey" FOREIGN KEY ("bvId") REFERENCES "Betriebsvereinbarung"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dokument" ADD CONSTRAINT "Dokument_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "Benutzer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dokument" ADD CONSTRAINT "Dokument_topId_fkey" FOREIGN KEY ("topId") REFERENCES "Tagesordnungspunkt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dokument" ADD CONSTRAINT "Dokument_vorgangId_fkey" FOREIGN KEY ("vorgangId") REFERENCES "Vorgang"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dokument" ADD CONSTRAINT "Dokument_bvId_fkey" FOREIGN KEY ("bvId") REFERENCES "Betriebsvereinbarung"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schulung" ADD CONSTRAINT "Schulung_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schulung" ADD CONSTRAINT "Schulung_amtsperiodeId_fkey" FOREIGN KEY ("amtsperiodeId") REFERENCES "Amtsperiode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sprechstunde" ADD CONSTRAINT "Sprechstunde_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schichtmodell" ADD CONSTRAINT "Schichtmodell_betriebId_fkey" FOREIGN KEY ("betriebId") REFERENCES "Betrieb"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schichtgruppe" ADD CONSTRAINT "Schichtgruppe_modellId_fkey" FOREIGN KEY ("modellId") REFERENCES "Schichtmodell"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wahlergebnis" ADD CONSTRAINT "Wahlergebnis_amtsperiodeId_fkey" FOREIGN KEY ("amtsperiodeId") REFERENCES "Amtsperiode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wahlergebnis" ADD CONSTRAINT "Wahlergebnis_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AufsichtsratMeilenstein" ADD CONSTRAINT "AufsichtsratMeilenstein_projektId_fkey" FOREIGN KEY ("projektId") REFERENCES "AufsichtsratProjekt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEintrag" ADD CONSTRAINT "AuditEintrag_benutzerId_fkey" FOREIGN KEY ("benutzerId") REFERENCES "Benutzer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

