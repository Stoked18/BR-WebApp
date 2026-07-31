import { prisma } from '@/lib/prisma';
import { verlangeRecht } from '@/lib/auth';
import { bewertung, pruefe, type Befund, type Pruefdaten } from '@/lib/pruefung';
import { Karte, Kennzahl, Marke, Seitenkopf } from '@/components/ui';

export const dynamic = 'force-dynamic';

const SCHWERE: Record<string, { text: string; ton: 'rot' | 'gelb' | 'gruen' }> = {
  KRITISCH: { text: 'Handlungsbedarf', ton: 'rot' },
  HINWEIS: { text: 'Hinweis', ton: 'gelb' },
  ERFUELLT: { text: 'erfüllt', ton: 'gruen' },
};

/** Sammelt den Datenschnappschuss fuer die Pruefung. */
async function ermittleDaten(): Promise<Pruefdaten | null> {
  const jetzt = new Date();
  const betrieb = await prisma.betrieb.findFirst();
  const gremium = await prisma.gremium.findFirst({ where: { typ: 'BETRIEBSRAT' } });
  if (!betrieb || !gremium) return null;

  const [
    ordentliche,
    ersatz,
    funktionen,
    ausschuesse,
    freistellungen,
    versammlung,
    monatsgespraech,
    asa,
    vergangeneSitzungen,
    niederschriften,
    vorgaenge,
    bvOhnePruefung,
    vvt,
    loeschregeln,
    aufsichtsrat,
  ] = await Promise.all([
    prisma.mitgliedschaft.count({ where: { gremiumId: gremium.id, status: 'ORDENTLICH', ende: null } }),
    prisma.mitgliedschaft.count({ where: { gremiumId: gremium.id, status: 'ERSATZMITGLIED', ende: null } }),
    prisma.funktion.findMany({ where: { ende: null, typ: { in: ['VORSITZ', 'STELLV_VORSITZ'] } } }),
    prisma.ausschuss.findMany({ where: { aktiv: true }, include: { _count: { select: { mitglieder: true } } } }),
    prisma.freistellung.count({ where: { ende: null } }),
    prisma.sitzung.findFirst({ where: { art: 'BETRIEBSVERSAMMLUNG', beginn: { lte: jetzt } }, orderBy: { beginn: 'desc' } }),
    prisma.sitzung.findFirst({ where: { art: 'MONATSGESPRAECH', beginn: { lte: jetzt } }, orderBy: { beginn: 'desc' } }),
    prisma.sitzung.findFirst({ where: { art: 'ASA', beginn: { lte: jetzt } }, orderBy: { beginn: 'desc' } }),
    prisma.sitzung.findMany({
      where: { beginn: { lte: jetzt }, art: { in: ['ORDENTLICH', 'AUSSERORDENTLICH'] }, status: { not: 'ABGESAGT' } },
      include: { niederschrift: true },
    }),
    prisma.niederschrift.findMany(),
    prisma.vorgang.findMany({
      where: { status: { notIn: ['ABGESCHLOSSEN', 'BEANTWORTET', 'ZURUECKGEZOGEN'] } },
    }),
    prisma.betriebsvereinbarung.count({ where: { tarifvorbehaltGeprueft: false, status: { not: 'ENTWURF' } } }),
    prisma.verarbeitungstaetigkeit.count(),
    prisma.loeschregel.count({ where: { aktiv: true } }),
    prisma.aufsichtsratProjekt.count(),
  ]);

  const ba = ausschuesse.find((a) => a.typ === 'BETRIEBSAUSSCHUSS');

  return {
    jetzt,
    wahlberechtigte: betrieb.anzahlWahlberechtigte,
    beschaeftigte: betrieb.anzahlBeschaeftigte,
    gremiumsgroesse: gremium.sollGroesse,
    besetzteSitze: ordentliche,
    ersatzmitglieder: ersatz,
    hatVorsitz: funktionen.some((f) => f.typ === 'VORSITZ'),
    hatStellvertretung: funktionen.some((f) => f.typ === 'STELLV_VORSITZ'),
    hatBetriebsausschuss: Boolean(ba),
    betriebsausschussGroesse: ba?._count.mitglieder ?? 0,
    hatWirtschaftsausschuss: ausschuesse.some((a) => a.typ === 'WIRTSCHAFTSAUSSCHUSS'),
    freistellungenErfasst: freistellungen,
    ausschuesseMitUebertragung: ausschuesse.filter((a) => a.aufgabenUebertragen).length,
    geschaeftsordnungVorhanden: Boolean(gremium.geschaeftsordnungDokumentId),
    videoteilnahmeGeregelt: gremium.videoteilnahmeErlaubt,
    letzteBetriebsversammlung: versammlung?.beginn ?? null,
    letztesMonatsgespraech: monatsgespraech?.beginn ?? null,
    letzteAsaSitzung: asa?.beginn ?? null,
    sitzungenOhneNiederschrift: vergangeneSitzungen.filter((s) => !s.niederschrift).length,
    niederschriftenOhneZweiteUnterschrift: niederschriften.filter(
      (n) => !n.unterschriftVorsitzAm || !n.unterschriftWeiteresAm,
    ).length,
    vorgaengeFristVerstrichen: vorgaenge.filter((v) => v.fristBis && v.fristBis < jetzt).length,
    bvOhneTarifpruefung: bvOhnePruefung,
    vvtEintraege: vvt,
    loeschregeln,
    vorgaengeUeberAufbewahrung: vorgaenge.filter((v) => v.loeschenAb && v.loeschenAb < jetzt && !v.geloeschtAm).length,
    aufsichtsratProjektVorhanden: aufsichtsrat > 0,
  };
}

export default async function Rechtspruefung() {
  await verlangeRecht('gremium.lesen');
  const daten = await ermittleDaten();

  if (!daten) {
    return <p className="text-sm text-slate-600">Es sind noch keine Stammdaten erfasst.</p>;
  }

  const befunde = pruefe(daten);
  const werte = bewertung(befunde);

  const bereiche = befunde.reduce<Record<string, Befund[]>>((acc, b) => {
    (acc[b.bereich] ??= []).push(b);
    return acc;
  }, {});

  // Handlungsbedarf zuerst, danach Hinweise, dann Erfuelltes.
  const rang = { KRITISCH: 0, HINWEIS: 1, ERFUELLT: 2 };

  return (
    <>
      <Seitenkopf
        titel="Rechtsprüfung"
        beschreibung="Automatischer Abgleich des Datenbestands mit den Vorgaben des BetrVG, des ASiG und der DSGVO. Die Prüfung zeigt, wo hinzusehen ist – sie ersetzt keine Rechtsberatung."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Kennzahl wert={`${werte.quote}%`} bezeichnung="Geprüfte Punkte erfüllt" ton={werte.quote >= 80 ? 'gruen' : 'gelb'} />
        <Kennzahl wert={werte.kritisch} bezeichnung="Handlungsbedarf" ton={werte.kritisch ? 'rot' : 'gruen'} />
        <Kennzahl wert={werte.hinweise} bezeichnung="Hinweise" ton={werte.hinweise ? 'gelb' : 'gruen'} />
        <Kennzahl wert={werte.erfuellt} bezeichnung="Erfüllt" ton="gruen" />
      </div>

      <div className="space-y-6">
        {Object.entries(bereiche).map(([bereich, liste]) => (
          <Karte key={bereich} titel={bereich}>
            <ul className="space-y-4">
              {[...liste]
                .sort((a, b) => rang[a.schwere] - rang[b.schwere])
                .map((b) => {
                  const s = SCHWERE[b.schwere];
                  return (
                    <li
                      key={b.schluessel}
                      className={`border-l-2 pl-4 ${
                        b.schwere === 'KRITISCH'
                          ? 'border-rose-400'
                          : b.schwere === 'HINWEIS'
                            ? 'border-amber-400'
                            : 'border-emerald-400'
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-medium text-slate-900">{b.titel}</h3>
                          <p className="text-xs text-slate-500">{b.norm}</p>
                        </div>
                        <Marke ton={s.ton}>{s.text}</Marke>
                      </div>
                      <p className="mt-1.5 text-sm text-slate-700">{b.text}</p>
                      {b.empfehlung && (
                        <p className="mt-1 text-xs leading-relaxed text-slate-500">{b.empfehlung}</p>
                      )}
                    </li>
                  );
                })}
            </ul>
          </Karte>
        ))}
      </div>
    </>
  );
}
