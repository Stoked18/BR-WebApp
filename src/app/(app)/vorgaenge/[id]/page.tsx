import { notFound } from 'next/navigation';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { verlangeRecht } from '@/lib/auth';
import { darf } from '@/lib/authz';
import { protokolliere } from '@/lib/audit';
import {
  FRISTVORLAGEN,
  alsKalendertag,
  berechneNachVorlage,
  fristampel,
  verbleibendeTage,
  vorlageFuerVorgangstyp,
} from '@/lib/fristen';
import { gruppeVon, ruegewirkung, verfahrensstand } from '@/lib/vorgangsablauf';
import { datum, datumZeit, relativeTage } from '@/lib/format';
import { Fehler, Karte, Knopf, Marke, Rechtshinweis, Seitenkopf, Warnung } from '@/components/ui';
import { STATUSTEXT, VORGANGSTYP } from '@/lib/vorgangstexte';

export const dynamic = 'force-dynamic';

async function beantworte(formular: FormData) {
  'use server';
  const benutzer = await verlangeRecht('vorgang.beantworten');

  const id = String(formular.get('id'));
  const text = String(formular.get('antwort')).trim();
  if (!text) return;

  await prisma.vorgang.update({
    where: { id },
    data: { antwortText: text, antwortAm: new Date(), status: 'BEANTWORTET', erledigtAm: new Date() },
  });

  await protokolliere({
    benutzerId: benutzer.id,
    benutzerName: benutzer.anzeigename,
    aktion: 'AENDERN',
    entitaet: 'Vorgang',
    entitaetId: id,
    details: 'Antwort des Betriebsrats erfasst und Vorgang abgeschlossen.',
  });

  revalidatePath(`/vorgaenge/${id}`);
}

/**
 * Ruegt die unvollstaendige Unterrichtung.
 *
 * Die Rechtsfolge unterscheidet sich je nach Norm und wird deshalb aus
 * ruegewirkung() abgeleitet, statt hier fest verdrahtet zu werden:
 *
 *  - § 99 BetrVG: die Wochenfrist laeuft erst ab vollstaendiger Unterrichtung.
 *    Die Frist wird angehalten, die Zustimmungsfiktion tritt nicht ein.
 *  - § 102 BetrVG: die Wochenfrist laeuft weiter. Die Ruege wird dokumentiert,
 *    weil die unvollstaendige Anhoerung die Kuendigung unwirksam macht – der
 *    Betriebsrat muss aber gleichwohl fristgerecht Stellung nehmen.
 */
async function ruegeUnterrichtung(formular: FormData) {
  'use server';
  const benutzer = await verlangeRecht('vorgang.bearbeiten');

  const id = String(formular.get('id'));
  const fehlend = String(formular.get('fehlend')).trim();
  if (!fehlend) return;

  const vorgang = await prisma.vorgang.findUniqueOrThrow({ where: { id } });
  const wirkung = ruegewirkung(vorgang.typ);
  if (!wirkung) throw new Error('Für diese Vorgangsart ist die Rüge der Unterrichtung nicht vorgesehen.');

  const jetzt = new Date();

  await prisma.vorgang.update({
    where: { id },
    data: {
      // Nur wo die Frist rechtlich nicht anlaeuft, wird sie auch ausgesetzt.
      ...(wirkung.haeltFristAn ? { fristBis: null } : {}),
      unterrichtungGeruegtAm: jetzt,
      unterrichtungGeruegtInhalt: fehlend,
      status: 'IN_PRUEFUNG',
      sachverhalt:
        `${vorgang.sachverhalt ?? ''}\n\n[${datum(jetzt)}] Rüge der unvollständigen Unterrichtung ` +
        `nach ${wirkung.norm}. Es fehlen: ${fehlend}.` +
        (wirkung.haeltFristAn
          ? ' Die Frist ist bis zur Vervollständigung nicht in Lauf gesetzt.'
          : ' Die Frist läuft gleichwohl weiter; es ist fristgerecht Stellung zu nehmen.'),
    },
  });

  await prisma.fristereignis.create({
    data: {
      vorgangId: id,
      bezeichnung: wirkung.haeltFristAn
        ? 'Fristlauf ausgesetzt – Unterrichtung unvollständig'
        : 'Unvollständige Unterrichtung gerügt – Frist läuft weiter',
      grundlage: wirkung.norm,
      startAm: jetzt,
      endeAm: vorgang.fristBis ?? jetzt,
      berechnung:
        `Der Betriebsrat hat gerügt, dass die Unterrichtung unvollständig ist. Es fehlen: ${fehlend}. ` +
        wirkung.wirkung +
        (wirkung.warnung ? ` ${wirkung.warnung}` : ''),
    },
  });

  await protokolliere({
    benutzerId: benutzer.id,
    benutzerName: benutzer.anzeigename,
    aktion: 'AENDERN',
    entitaet: 'Vorgang',
    entitaetId: id,
    details:
      `Unvollständige Unterrichtung gerügt (${wirkung.norm}): ${fehlend}. ` +
      (wirkung.haeltFristAn ? 'Frist ausgesetzt.' : 'Frist läuft weiter.'),
  });

  revalidatePath(`/vorgaenge/${id}`);
  revalidatePath('/vorgaenge');
}

/**
 * Vermerkt, dass der Arbeitgeber die fehlenden Angaben nachgereicht hat.
 *
 * Bei § 99 BetrVG beginnt damit die Wochenfrist neu zu laufen – ab dem Zugang
 * der Vervollstaendigung, nicht ab dem urspruenglichen Eingang.
 */
async function vervollstaendigeUnterrichtung(formular: FormData) {
  'use server';
  const benutzer = await verlangeRecht('vorgang.bearbeiten');

  const id = String(formular.get('id'));
  const eingangRoh = String(formular.get('eingang') ?? '').trim();
  const eingang = eingangRoh ? new Date(eingangRoh) : new Date();
  if (Number.isNaN(eingang.getTime())) throw new Error('Der angegebene Zugang ist kein gültiges Datum.');

  const vorgang = await prisma.vorgang.findUniqueOrThrow({ where: { id } });
  const wirkung = ruegewirkung(vorgang.typ);
  const vorlage = vorlageFuerVorgangstyp(vorgang.typ);

  // Nur wo die Ruege die Frist angehalten hat, beginnt sie jetzt neu.
  const neueFrist =
    wirkung?.haeltFristAn && vorlage
      ? berechneNachVorlage(vorlage.schluessel, alsKalendertag(eingang), 'NW')
      : null;

  await prisma.vorgang.update({
    where: { id },
    data: {
      unterrichtungVervollstaendigtAm: eingang,
      ...(neueFrist ? { fristBis: neueFrist.ablauf } : {}),
    },
  });

  if (neueFrist) {
    await prisma.fristereignis.create({
      data: {
        vorgangId: id,
        bezeichnung: 'Frist neu berechnet – Unterrichtung vervollständigt',
        grundlage: `${neueFrist.vorlage.grundlage} i.V.m. §§ 187 Abs. 1, 188 BGB`,
        startAm: eingang,
        endeAm: neueFrist.ablauf,
        berechnung:
          'Der Arbeitgeber hat die fehlenden Angaben nachgereicht. Die Frist läuft ab diesem ' +
          `Zugang neu. ${neueFrist.herleitung}`,
      },
    });
  }

  await protokolliere({
    benutzerId: benutzer.id,
    benutzerName: benutzer.anzeigename,
    aktion: 'AENDERN',
    entitaet: 'Vorgang',
    entitaetId: id,
    details: `Unterrichtung vervollständigt am ${datum(eingang)}.${neueFrist ? ' Frist neu berechnet.' : ''}`,
  });

  revalidatePath(`/vorgaenge/${id}`);
  revalidatePath('/vorgaenge');
}

/**
 * Dokumentiert den Zugang der Stellungnahme beim Arbeitgeber.
 *
 * Fuer die Fristwahrung kommt es auf den Zugang an, nicht auf die Absendung
 * (§ 130 BGB). Im Streit um die Rechtzeitigkeit einer Zustimmungsverweigerung
 * oder eines Widerspruchs ist dieser Nachweis der entscheidende Punkt.
 */
async function dokumentiereZugang(formular: FormData) {
  'use server';
  const benutzer = await verlangeRecht('vorgang.bearbeiten');

  const id = String(formular.get('id'));
  const zugangRoh = String(formular.get('zugang') ?? '').trim();
  const zugang = zugangRoh ? new Date(zugangRoh) : new Date();
  if (Number.isNaN(zugang.getTime())) throw new Error('Der angegebene Zugang ist kein gültiges Datum.');

  const vorgang = await prisma.vorgang.findUniqueOrThrow({ where: { id } });
  if (!vorgang.antwortAm) {
    throw new Error('Es ist noch keine Stellungnahme erfasst, deren Zugang dokumentiert werden könnte.');
  }

  const rechtzeitig = vorgang.fristBis ? zugang <= vorgang.fristBis : null;

  await prisma.vorgang.update({
    where: { id },
    data: { antwortZugangAm: zugang, status: 'ABGESCHLOSSEN', erledigtAm: zugang },
  });

  await protokolliere({
    benutzerId: benutzer.id,
    benutzerName: benutzer.anzeigename,
    aktion: 'AENDERN',
    entitaet: 'Vorgang',
    entitaetId: id,
    details:
      `Zugang der Stellungnahme beim Arbeitgeber am ${datum(zugang)} dokumentiert.` +
      (rechtzeitig === null
        ? ''
        : rechtzeitig
          ? ' Die Frist ist gewahrt.'
          : ' Achtung: der Zugang liegt nach Fristablauf.'),
  });

  revalidatePath(`/vorgaenge/${id}`);
  revalidatePath('/vorgaenge');
}

export default async function Vorgangsdetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const benutzer = await verlangeRecht('vorgang.lesen');

  const vorgang = await prisma.vorgang.findUnique({
    where: { id },
    include: {
      ausschuss: true,
      einreicher: { select: { anzeigename: true } },
      fristereignisse: { orderBy: { erstelltAm: 'desc' } },
      beschluesse: true,
      tops: { include: { sitzung: true } },
      aufgaben: { include: { zustaendig: true } },
    },
  });

  if (!vorgang) notFound();

  const jetzt = new Date();
  const typ = VORGANGSTYP[vorgang.typ] ?? { text: vorgang.typ, norm: '' };
  const ampel = fristampel(vorgang.fristBis, jetzt);
  const vorlage = vorlageFuerVorgangstyp(vorgang.typ);
  const offen = !['ABGESCHLOSSEN', 'BEANTWORTET', 'ZURUECKGEZOGEN'].includes(vorgang.status);
  const istNeunundneunzig = vorgang.typ.endsWith('_99');

  const gruppe = gruppeVon(vorgang.typ);
  const wirkung = ruegewirkung(vorgang.typ);
  const kannBearbeiten = darf(benutzer, 'vorgang.bearbeiten');

  const schritte = verfahrensstand({
    typ: vorgang.typ,
    eingegangenAm: vorgang.eingegangenAm,
    unterrichtungGeruegtAm: vorgang.unterrichtungGeruegtAm,
    unterrichtungVervollstaendigtAm: vorgang.unterrichtungVervollstaendigtAm,
    aufTagesordnung: vorgang.tops.length > 0,
    beschlussGefasst: vorgang.beschluesse.length > 0,
    antwortAm: vorgang.antwortAm,
    antwortZugangAm: vorgang.antwortZugangAm,
    fristBis: vorgang.fristBis,
  });

  const SCHRITTFARBE = {
    ERLEDIGT: 'border-emerald-400',
    OFFEN: 'border-slate-300',
    WARNUNG: 'border-amber-400',
    ENTFAELLT: 'border-slate-200',
  } as const;

  return (
    <>
      <Seitenkopf
        titel={vorgang.titel}
        beschreibung={`${vorgang.aktenzeichen} · ${typ.text} nach ${typ.norm}`}
        aktion={
          <Link href="/vorgaenge" className="text-sm text-marke-700 hover:underline">
            zurück zur Liste
          </Link>
        }
      />

      <div className="mb-6 space-y-3">
        {ampel === 'ABGELAUFEN' && offen && vorgang.zustimmungsfiktion && (
          <Fehler titel="Die Frist ist verstrichen">
            Nach § 99 Abs. 3 S. 2 BetrVG gilt die Zustimmung als erteilt. Eine nachträgliche Verweigerung
            geht ins Leere. Zu prüfen bleibt, ob die Unterrichtung überhaupt vollständig war – nur dann
            ist die Frist wirksam angelaufen.
          </Fehler>
        )}
        {ampel === 'KRITISCH' && offen && (
          <Warnung titel="Die Frist läuft heute ab">
            Die Antwort muss dem Arbeitgeber noch heute zugehen. Maßgeblich ist der Zugang, nicht die
            Absendung. Bei schriftformbedürftigen Erklärungen ist der Zugang zu dokumentieren.
          </Warnung>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Karte titel="Sachverhalt">
            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
              {vorgang.sachverhalt ?? 'Kein Sachverhalt erfasst.'}
            </p>
          </Karte>

          {vorgang.fristereignisse.length > 0 && (
            <Karte titel="Fristberechnung" hinweis="Nachvollziehbare Herleitung für die Akte">
              <ol className="space-y-4">
                {vorgang.fristereignisse.map((f) => (
                  <li key={f.id} className="border-l-2 border-slate-200 pl-4">
                    <p className="text-sm font-medium text-slate-800">{f.bezeichnung}</p>
                    <p className="text-xs text-slate-500">{f.grundlage}</p>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{f.berechnung}</p>
                  </li>
                ))}
              </ol>
            </Karte>
          )}

          {vorgang.antwortText ? (
            <Karte titel="Antwort des Betriebsrats" hinweis={`erteilt am ${datum(vorgang.antwortAm)}`}>
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{vorgang.antwortText}</p>
            </Karte>
          ) : (
            darf(benutzer, 'vorgang.beantworten') && (
              <Karte titel="Antwort erfassen">
                <form action={beantworte} className="space-y-3">
                  <input type="hidden" name="id" value={vorgang.id} />
                  <textarea
                    name="antwort"
                    rows={6}
                    required
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                    placeholder={
                      istNeunundneunzig
                        ? 'Der Betriebsrat verweigert die Zustimmung. Die Verweigerung stützt sich auf § 99 Abs. 2 Nr. … BetrVG, weil …'
                        : 'Der Betriebsrat nimmt wie folgt Stellung …'
                    }
                  />
                  <p className="text-xs leading-relaxed text-slate-500">
                    {istNeunundneunzig
                      ? 'Die Verweigerung muss schriftlich erfolgen und einen der abschließend aufgezählten Gründe des § 99 Abs. 2 BetrVG benennen. Eine Begründung außerhalb dieses Katalogs macht die Verweigerung unbeachtlich; die Zustimmung gilt dann als erteilt.'
                      : 'Die Stellungnahme muss dem Arbeitgeber innerhalb der Frist zugehen. Der Zugang ist zu dokumentieren.'}
                  </p>
                  <Knopf>Antwort speichern und Vorgang abschließen</Knopf>
                </form>
              </Karte>
            )
          )}

          {wirkung && offen && kannBearbeiten && !vorgang.unterrichtungGeruegtAm && (
            <Karte
              titel="Unvollständige Unterrichtung rügen"
              hinweis={
                wirkung.haeltFristAn
                  ? 'Hält den Fristlauf an – der wirksamste Schutz gegen die Zustimmungsfiktion'
                  : 'Dokumentiert den Mangel – die Frist läuft dabei weiter'
              }
            >
              <form action={ruegeUnterrichtung} className="space-y-3">
                <input type="hidden" name="id" value={vorgang.id} />
                <textarea
                  name="fehlend"
                  rows={3}
                  required
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                  placeholder={
                    gruppe === 'ANHOERUNG'
                      ? 'Kündigungsgründe nicht hinreichend konkretisiert, Sozialdaten (Lebensalter, Betriebszugehörigkeit, Unterhaltspflichten) fehlen …'
                      : 'Bewerbungsunterlagen aller Bewerber, Angaben zur vorgesehenen Eingruppierung, Auswirkungen auf die Belegschaft …'
                  }
                />
                <p className="text-xs leading-relaxed text-slate-500">
                  <span className="font-medium text-slate-700">{wirkung.norm}</span> · {wirkung.wirkung}
                </p>
                {wirkung.warnung && (
                  <Warnung titel="Die Frist läuft trotz der Rüge weiter">{wirkung.warnung}</Warnung>
                )}
                <Knopf variante="sekundaer">
                  {wirkung.haeltFristAn ? 'Rüge erfassen und Frist anhalten' : 'Rüge erfassen'}
                </Knopf>
              </form>
            </Karte>
          )}

          {wirkung && vorgang.unterrichtungGeruegtAm && !vorgang.unterrichtungVervollstaendigtAm && kannBearbeiten && (
            <Karte
              titel="Unterrichtung vervollständigt"
              hinweis={
                wirkung.haeltFristAn
                  ? 'Die Frist beginnt mit dem Zugang der Nachreichung neu'
                  : 'Vermerk – die Frist bleibt unverändert'
              }
            >
              <p className="mb-3 text-sm text-slate-700">
                Gerügt am {datum(vorgang.unterrichtungGeruegtAm)}:{' '}
                <span className="text-slate-600">{vorgang.unterrichtungGeruegtInhalt}</span>
              </p>
              <form action={vervollstaendigeUnterrichtung} className="space-y-3">
                <input type="hidden" name="id" value={vorgang.id} />
                <div>
                  <label className="block text-xs font-medium text-slate-600">
                    Zugang der nachgereichten Angaben
                  </label>
                  <input
                    name="eingang"
                    type="date"
                    required
                    className="mt-1 w-full max-w-xs rounded border border-slate-300 px-2 py-1.5 text-sm"
                  />
                </div>
                <Knopf variante="sekundaer">
                  {wirkung.haeltFristAn ? 'Vervollständigung erfassen und Frist neu berechnen' : 'Vervollständigung erfassen'}
                </Knopf>
              </form>
            </Karte>
          )}

          {vorgang.antwortAm && !vorgang.antwortZugangAm && kannBearbeiten && (
            <Karte
              titel="Zugang der Stellungnahme dokumentieren"
              hinweis="Für die Fristwahrung kommt es auf den Zugang an, nicht auf die Absendung"
            >
              <form action={dokumentiereZugang} className="space-y-3">
                <input type="hidden" name="id" value={vorgang.id} />
                <div>
                  <label className="block text-xs font-medium text-slate-600">
                    Zugang beim Arbeitgeber
                  </label>
                  <input
                    name="zugang"
                    type="date"
                    required
                    className="mt-1 w-full max-w-xs rounded border border-slate-300 px-2 py-1.5 text-sm"
                  />
                </div>
                <p className="text-xs leading-relaxed text-slate-500">
                  Maßgeblich ist der Zeitpunkt, zu dem die Stellungnahme in den Machtbereich des
                  Arbeitgebers gelangt ist (§ 130 BGB). Im Streit um die Rechtzeitigkeit einer
                  Zustimmungsverweigerung oder eines Widerspruchs ist dieser Nachweis entscheidend –
                  Empfangsbekenntnis oder Eingangsstempel aufbewahren.
                </p>
                <Knopf variante="sekundaer">Zugang dokumentieren und Vorgang abschließen</Knopf>
              </form>
            </Karte>
          )}

          {vorgang.beschluesse.length > 0 && (
            <Karte titel="Gefasste Beschlüsse">
              <ul className="space-y-3">
                {vorgang.beschluesse.map((b) => (
                  <li key={b.id} className="rounded-md bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs text-slate-500">{b.aktenzeichen}</span>
                      <Marke ton={b.ergebnis === 'ANGENOMMEN' ? 'gruen' : 'rot'}>
                        {b.ergebnis === 'ANGENOMMEN' ? 'angenommen' : 'abgelehnt'}
                      </Marke>
                    </div>
                    <p className="mt-1 text-sm text-slate-800">{b.wortlaut}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {datum(b.gefasstAm)} · {b.jaStimmen} Ja / {b.neinStimmen} Nein / {b.enthaltungen} Enthaltung
                    </p>
                  </li>
                ))}
              </ul>
            </Karte>
          )}
        </div>

        <div className="space-y-6">
          <Karte titel="Verfahrensstand" hinweis="Die Reihenfolge ist nicht beliebig">
            <ol className="space-y-3">
              {schritte.map((s, i) => (
                <li key={s.bezeichnung} className={`border-l-2 pl-3 ${SCHRITTFARBE[s.status]}`}>
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={`text-sm font-medium ${
                        s.status === 'ERLEDIGT' ? 'text-slate-500' : 'text-slate-900'
                      }`}
                    >
                      <span className="mr-1.5 tabular-nums text-slate-400">{i + 1}.</span>
                      {s.bezeichnung}
                    </p>
                    {s.status === 'ERLEDIGT' && <Marke ton="gruen">erledigt</Marke>}
                    {s.status === 'WARNUNG' && <Marke ton="gelb">beachten</Marke>}
                  </div>
                  {s.norm && <p className="mt-0.5 text-xs text-slate-400">{s.norm}</p>}
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{s.vermerk}</p>
                </li>
              ))}
            </ol>
          </Karte>

          <Karte titel="Frist">
            {vorgang.fristBis ? (
              <>
                <p className="text-2xl font-semibold tabular-nums text-slate-900">{datum(vorgang.fristBis)}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {relativeTage(verbleibendeTage(vorgang.fristBis, jetzt))} · Ablauf 24:00 Uhr
                </p>
                <div className="mt-2">
                  <Marke ton={ampel === 'OFFEN' ? 'gruen' : ampel === 'WARNUNG' ? 'gelb' : 'rot'}>
                    {ampel === 'ABGELAUFEN' ? 'abgelaufen' : ampel === 'KRITISCH' ? 'läuft heute ab' : ampel === 'WARNUNG' ? 'dringend' : 'offen'}
                  </Marke>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-600">
                Für diesen Vorgang läuft keine Frist. Bei § 99 BetrVG kann das daran liegen, dass die
                Unterrichtung gerügt wurde und die Frist deshalb nicht angelaufen ist.
              </p>
            )}
            {vorgang.zustimmungsfiktion && (
              <p className="mt-3 rounded bg-rose-50 px-3 py-2 text-xs leading-relaxed text-rose-800">
                Bei Fristablauf gilt die Zustimmung nach § 99 Abs. 3 S. 2 BetrVG als erteilt.
              </p>
            )}
          </Karte>

          <Karte titel="Eckdaten">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Eingang</dt>
                <dd className="text-slate-800">{datumZeit(vorgang.eingegangenAm)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Status</dt>
                <dd className="text-slate-800">{STATUSTEXT[vorgang.status] ?? vorgang.status}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Fachbereich</dt>
                <dd className="text-right text-slate-800">{vorgang.fachbereich ?? '–'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Eingereicht von</dt>
                <dd className="text-right text-slate-800">{vorgang.einreicher?.anzeigename ?? '–'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Betroffen</dt>
                <dd className="text-slate-800">{vorgang.betroffeneInitialen ?? 'kein Personenbezug'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Zuständig</dt>
                <dd className="text-right text-slate-800">{vorgang.ausschuss?.bezeichnung ?? 'Gremium'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Löschung vorgesehen</dt>
                <dd className="text-slate-800">{datum(vorgang.loeschenAb)}</dd>
              </div>
            </dl>
          </Karte>

          {vorgang.tops.length > 0 && (
            <Karte titel="Behandlung in Sitzungen">
              <ul className="space-y-2 text-sm">
                {vorgang.tops.map((t) => (
                  <li key={t.id}>
                    <Link href={`/sitzungen/${t.sitzung.id}`} className="text-marke-700 hover:underline">
                      {t.sitzung.titel ?? 'Sitzung'} {t.sitzung.nummer}
                    </Link>
                    <span className="block text-xs text-slate-500">
                      TOP {t.nummer} · {datum(t.sitzung.beginn)}
                    </span>
                  </li>
                ))}
              </ul>
            </Karte>
          )}

          {vorlage && (
            <Rechtshinweis norm={vorlage.grundlage}>
              {vorlage.folgeBeiAblauf ?? vorlage.bezeichnung}
              {vorlage.hinweis && <span className="mt-1 block">{vorlage.hinweis}</span>}
              {!vorlage.gesetzlich && (
                <span className="mt-1 block font-medium">
                  Diese Frist ergibt sich nicht unmittelbar aus dem Gesetz, sondern aus der Praxis
                  beziehungsweise der Geschäftsordnung.
                </span>
              )}
            </Rechtshinweis>
          )}

          {vorgang.typ === 'KUENDIGUNG_ORDENTLICH_102' && (
            <Rechtshinweis norm={FRISTVORLAGEN.WIDERSPRUCH_KUENDIGUNG_ARBEITNEHMER.grundlage}>
              Für die betroffene Person läuft parallel die dreiwöchige Klagefrist des § 4 S. 1 KSchG ab
              Zugang der Kündigung. Darauf sollte in der Sprechstunde hingewiesen werden.
            </Rechtshinweis>
          )}
        </div>
      </div>
    </>
  );
}
