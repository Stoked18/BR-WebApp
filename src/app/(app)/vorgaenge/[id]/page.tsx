import { notFound } from 'next/navigation';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { verlangeRecht } from '@/lib/auth';
import { darf } from '@/lib/authz';
import { protokolliere } from '@/lib/audit';
import { FRISTVORLAGEN, fristampel, verbleibendeTage, vorlageFuerVorgangstyp } from '@/lib/fristen';
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
 * Ruegt die unvollstaendige Unterrichtung. Das ist der wichtigste Hebel bei
 * § 99 BetrVG: Solange die Unterrichtung unvollstaendig ist, laeuft die
 * Wochenfrist nicht an und die Zustimmungsfiktion tritt nicht ein.
 */
async function ruegeUnterrichtung(formular: FormData) {
  'use server';
  const benutzer = await verlangeRecht('vorgang.bearbeiten');

  const id = String(formular.get('id'));
  const fehlend = String(formular.get('fehlend')).trim();
  if (!fehlend) return;

  const vorgang = await prisma.vorgang.findUniqueOrThrow({ where: { id } });

  await prisma.vorgang.update({
    where: { id },
    data: {
      // Die Frist wird ausgesetzt, bis die Unterrichtung vervollstaendigt ist.
      fristBis: null,
      status: 'IN_PRUEFUNG',
      sachverhalt:
        `${vorgang.sachverhalt ?? ''}\n\n[${datum(new Date())}] Rüge der unvollständigen Unterrichtung ` +
        `nach § 99 Abs. 1 BetrVG. Es fehlen: ${fehlend}. Die Frist des § 99 Abs. 3 S. 1 BetrVG ist ` +
        `bis zur Vervollständigung nicht in Lauf gesetzt.`,
    },
  });

  await prisma.fristereignis.create({
    data: {
      vorgangId: id,
      bezeichnung: 'Fristlauf ausgesetzt – Unterrichtung unvollständig',
      grundlage: '§ 99 Abs. 1 S. 1, 2 BetrVG',
      startAm: new Date(),
      endeAm: new Date(),
      berechnung:
        `Der Betriebsrat hat gerügt, dass die Unterrichtung unvollständig ist. Es fehlen: ${fehlend}. ` +
        `Nach § 99 Abs. 1 BetrVG setzt erst die vollständige Unterrichtung die Wochenfrist des ` +
        `§ 99 Abs. 3 S. 1 BetrVG in Lauf. Die Frist wird daher zurückgesetzt und mit Eingang der ` +
        `fehlenden Angaben neu berechnet.`,
    },
  });

  await protokolliere({
    benutzerId: benutzer.id,
    benutzerName: benutzer.anzeigename,
    aktion: 'AENDERN',
    entitaet: 'Vorgang',
    entitaetId: id,
    details: `Unvollständige Unterrichtung gerügt: ${fehlend}`,
  });

  revalidatePath(`/vorgaenge/${id}`);
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

          {istNeunundneunzig && offen && darf(benutzer, 'vorgang.bearbeiten') && (
            <Karte
              titel="Unvollständige Unterrichtung rügen"
              hinweis="Setzt den Fristlauf zurück – der wirksamste Schutz gegen die Zustimmungsfiktion"
            >
              <form action={ruegeUnterrichtung} className="space-y-3">
                <input type="hidden" name="id" value={vorgang.id} />
                <textarea
                  name="fehlend"
                  rows={3}
                  required
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Bewerbungsunterlagen aller Bewerber, Angaben zur vorgesehenen Eingruppierung, Auswirkungen auf die Belegschaft …"
                />
                <Knopf variante="sekundaer">Rüge erfassen und Frist aussetzen</Knopf>
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
