import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { verlangeRecht } from '@/lib/auth';
import { darf } from '@/lib/authz';
import { protokolliere } from '@/lib/audit';
import { alsKalendertag, berechneNachVorlage, vorlageFuerVorgangstyp } from '@/lib/fristen';
import { Karte, Knopf, Rechtshinweis, Seitenkopf } from '@/components/ui';
import { VORGANGSTYP } from '@/lib/vorgangstexte';
import type { Vorgangstyp } from '@prisma/client';

export const dynamic = 'force-dynamic';

/** Aufbewahrungsdauer je Vorgangsart – speist das Loeschkonzept. */
const AUFBEWAHRUNG_MONATE: Partial<Record<Vorgangstyp, number>> = {
  EINSTELLUNG_99: 36,
  VERSETZUNG_99: 36,
  EINGRUPPIERUNG_99: 36,
  KUENDIGUNG_ORDENTLICH_102: 36,
  KUENDIGUNG_AUSSERORDENTLICH_102: 36,
  KUENDIGUNG_BR_MITGLIED_103: 36,
  VORLAEUFIGE_MASSNAHME_100: 36,
  BESCHWERDE_85: 12,
};

const AUSWAEHLBAR: Vorgangstyp[] = [
  'EINSTELLUNG_99',
  'VERSETZUNG_99',
  'EINGRUPPIERUNG_99',
  'KUENDIGUNG_ORDENTLICH_102',
  'KUENDIGUNG_AUSSERORDENTLICH_102',
  'VORLAEUFIGE_MASSNAHME_100',
  'MITBESTIMMUNG_87',
  'UNTERRICHTUNG_80',
  'PERSONALPLANUNG_92',
  'ARBEITSPLATZGESTALTUNG_90_91',
  'BETRIEBSAENDERUNG_111',
  'SONSTIGES',
];

async function einreichen(formular: FormData) {
  'use server';
  const benutzer = await verlangeRecht('vorgang.einreichen');
  if (!darf(benutzer, 'vorgang.einreichen')) throw new Error('Keine Berechtigung.');

  const typ = String(formular.get('typ')) as Vorgangstyp;
  const titel = String(formular.get('titel')).trim();
  const sachverhalt = String(formular.get('sachverhalt')).trim();
  const fachbereich = String(formular.get('fachbereich') ?? '').trim() || null;
  const initialen = String(formular.get('initialen') ?? '').trim() || null;
  const vollstaendig = formular.get('vollstaendig') === 'ja';

  if (!titel || !sachverhalt) throw new Error('Bezeichnung und Sachverhalt sind erforderlich.');

  const gremium = await prisma.gremium.findFirst({ where: { typ: 'BETRIEBSRAT' } });
  const jetzt = new Date();
  const jahr = jetzt.getFullYear();
  const laufend = await prisma.vorgang.count({ where: { eingegangenAm: { gte: new Date(`${jahr}-01-01`) } } });
  const aktenzeichen = `BR-${jahr}-${String(laufend + 1).padStart(4, '0')}`;

  // Die Frist laeuft nur an, wenn die Unterrichtung als vollstaendig erklaert
  // wird. Der Betriebsrat kann sie spaeter gleichwohl ruegen; dann wird die
  // Frist zurueckgesetzt.
  const vorlage = vorlageFuerVorgangstyp(typ);
  const frist = vorlage && vollstaendig ? berechneNachVorlage(vorlage.schluessel, alsKalendertag(jetzt), 'NW') : null;

  const monate = AUFBEWAHRUNG_MONATE[typ] ?? 120;
  const loeschen = new Date(jetzt);
  loeschen.setMonth(loeschen.getMonth() + monate);

  const vorgang = await prisma.vorgang.create({
    data: {
      aktenzeichen,
      typ,
      titel,
      sachverhalt,
      gremiumId: gremium?.id ?? null,
      einreicherId: benutzer.id,
      fachbereich,
      betroffeneInitialen: initialen,
      eingegangenAm: jetzt,
      fristBis: frist?.ablauf ?? null,
      fristTage: frist ? (frist.vorlage.einheit === 'WOCHEN' ? frist.vorlage.dauer * 7 : frist.vorlage.dauer) : null,
      fristArt: frist ? (frist.vorlage.einheit === 'WOCHEN' ? 'WOCHEN' : 'KALENDERTAGE') : null,
      zustimmungsfiktion: typ.endsWith('_99'),
      status: 'EINGEGANGEN',
      vertraulichkeit: initialen ? 'PERSONENBEZOGEN' : 'VERTRAULICH',
      loeschenAb: loeschen,
    },
  });

  if (frist) {
    await prisma.fristereignis.create({
      data: {
        vorgangId: vorgang.id,
        bezeichnung: frist.vorlage.bezeichnung,
        grundlage: `${frist.vorlage.grundlage} i.V.m. §§ 187 Abs. 1, 188 BGB`,
        startAm: jetzt,
        endeAm: frist.ablauf,
        berechnung: frist.herleitung,
      },
    });
  }

  await protokolliere({
    benutzerId: benutzer.id,
    benutzerName: benutzer.anzeigename,
    aktion: 'ANLEGEN',
    entitaet: 'Vorgang',
    entitaetId: aktenzeichen,
    details: `Antrag über das Portal eingereicht: ${titel}${frist ? ` – Frist bis ${frist.ablauf.toISOString()}` : ' – ohne Fristlauf, Unterrichtung als unvollständig gekennzeichnet'}`,
  });

  redirect('/portal');
}

export default async function NeuerAntrag() {
  const benutzer = await verlangeRecht('vorgang.einreichen');
  if (!darf(benutzer, 'vorgang.einreichen')) {
    return <p className="text-sm text-slate-600">Für das Antragsportal fehlt Ihnen die Berechtigung.</p>;
  }

  return (
    <>
      <Seitenkopf
        titel="Neuen Antrag stellen"
        beschreibung="Der Antrag geht unmittelbar beim Betriebsrat ein. Die gesetzliche Frist wird automatisch berechnet und beiden Seiten angezeigt."
        aktion={
          <Link href="/portal" className="text-sm text-marke-700 hover:underline">
            zurück
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Karte titel="Angaben zum Beteiligungsverfahren">
            <form action={einreichen} className="space-y-4">
              <div>
                <label htmlFor="typ" className="block text-sm font-medium text-slate-700">
                  Art des Verfahrens
                </label>
                <select
                  id="typ"
                  name="typ"
                  required
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  {AUSWAEHLBAR.map((t) => (
                    <option key={t} value={t}>
                      {VORGANGSTYP[t].text}
                      {VORGANGSTYP[t].norm && ` – ${VORGANGSTYP[t].norm}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="titel" className="block text-sm font-medium text-slate-700">
                  Kurzbezeichnung
                </label>
                <input
                  id="titel"
                  name="titel"
                  required
                  placeholder="Einstellung Maschinenbediener Spritzguss (Nachtschicht)"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label htmlFor="fachbereich" className="block text-sm font-medium text-slate-700">
                  Fachbereich
                </label>
                <input
                  id="fachbereich"
                  name="fachbereich"
                  placeholder="Produktion Spritzguss"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label htmlFor="initialen" className="block text-sm font-medium text-slate-700">
                  Betroffene Person (Initialen)
                </label>
                <input
                  id="initialen"
                  name="initialen"
                  placeholder="M. T."
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Nur bei personellen Einzelmaßnahmen ausfüllen. Vollständige Namen und Unterlagen
                  gehören in die Anlage zur Unterrichtung, nicht in dieses Feld.
                </p>
              </div>

              <div>
                <label htmlFor="sachverhalt" className="block text-sm font-medium text-slate-700">
                  Sachverhalt und Unterrichtung
                </label>
                <textarea
                  id="sachverhalt"
                  name="sachverhalt"
                  rows={8}
                  required
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Beschreiben Sie die geplante Maßnahme und geben Sie an, welche Unterlagen beigefügt sind."
                />
              </div>

              <fieldset className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <legend className="px-1 text-sm font-medium text-slate-700">Vollständigkeit</legend>
                <label className="flex items-start gap-2 text-sm text-slate-700">
                  <input type="checkbox" name="vollstaendig" value="ja" defaultChecked className="mt-1" />
                  <span>
                    Die Unterrichtung ist vollständig; alle nach § 99 Abs. 1 BetrVG erforderlichen
                    Angaben und Unterlagen liegen bei.
                  </span>
                </label>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  Nur bei vollständiger Unterrichtung beginnt die gesetzliche Frist zu laufen. Setzen
                  Sie den Haken nicht, wird der Antrag ohne Fristlauf erfasst. Der Betriebsrat kann
                  die Vollständigkeit auch nachträglich rügen.
                </p>
              </fieldset>

              <Knopf>Antrag einreichen</Knopf>
            </form>
          </Karte>
        </div>

        <div className="space-y-6">
          <Rechtshinweis norm="§ 99 Abs. 1 BetrVG">
            Zu unterrichten ist über die Person, den Arbeitsplatz, die vorgesehene Eingruppierung und
            die Auswirkungen der Maßnahme. Bei Einstellungen sind die Bewerbungsunterlagen aller
            Bewerber vorzulegen und die Zustimmung zu beantragen.
          </Rechtshinweis>
          <Rechtshinweis norm="§ 102 Abs. 1 BetrVG">
            Vor jeder Kündigung ist der Betriebsrat zu hören; ihm sind die Gründe mitzuteilen. Eine
            ohne Anhörung ausgesprochene Kündigung ist unwirksam. Nachgeschobene Gründe heilen den
            Mangel nicht – es wäre ein neues Anhörungsverfahren erforderlich.
          </Rechtshinweis>
          <Rechtshinweis norm="§ 100 BetrVG">
            Eine vorläufige personelle Maßnahme darf nur bei dringender sachlicher Erforderlichkeit
            durchgeführt werden. Der Betriebsrat ist unverzüglich zu unterrichten; bestreitet er die
            Erforderlichkeit binnen drei Tagen, muss die Maßnahme aufgehoben werden, sofern nicht
            binnen weiterer drei Tage das Arbeitsgericht angerufen wird.
          </Rechtshinweis>
        </div>
      </div>
    </>
  );
}
