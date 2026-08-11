import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { verlangeBenutzer } from '@/lib/auth';
import { protokolliere } from '@/lib/audit';
import { hashePasswort, pruefePasswort, pruefePasswortstaerke } from '@/lib/passwort';
import { ROLLENBEZEICHNUNG } from '@/lib/authz';
import { datumZeit } from '@/lib/format';
import { Karte, Knopf, Rechtshinweis, Seitenkopf, Warnung } from '@/components/ui';
import { Rueckmeldung } from '@/components/rueckmeldung';

export const dynamic = 'force-dynamic';

const feld = 'mt-1 w-full max-w-sm rounded border border-slate-300 px-2 py-1.5 text-sm';
const beschriftung = 'block text-xs font-medium text-slate-600';

/**
 * Eigenes Konto.
 *
 * Ohne diese Seite bliebe das Kennzeichen "Kennwortwechsel erforderlich"
 * folgenlos: der Vorsitz koennte ein Erstkennwort setzen, die betroffene
 * Person haette aber keine Moeglichkeit, es zu ersetzen. Das Kennwort waere
 * dauerhaft einer zweiten Person bekannt – mit Art. 32 DSGVO nicht vereinbar.
 */
async function aendereEigenesPasswort(formular: FormData) {
  'use server';
  const benutzer = await verlangeBenutzer();

  const alt = String(formular.get('alt') ?? '');
  const neu = String(formular.get('neu') ?? '');
  const wiederholung = String(formular.get('wiederholung') ?? '');

  const scheitern = (grund: string) => redirect(`/konto?fehler=${encodeURIComponent(grund)}`);

  const datensatz = await prisma.benutzer.findUnique({ where: { id: benutzer.id } });
  if (!datensatz?.passwortHash) scheitern('Für dieses Konto ist kein Kennwort hinterlegt.');

  if (!(await pruefePasswort(datensatz!.passwortHash!, alt))) {
    await protokolliere({
      benutzerId: benutzer.id,
      benutzerName: benutzer.anzeigename,
      aktion: 'ANMELDUNG_FEHLGESCHLAGEN',
      entitaet: 'Benutzer',
      entitaetId: benutzer.id,
      details: 'Kennwortwechsel mit falschem bisherigem Kennwort versucht.',
    });
    scheitern('Das bisherige Kennwort ist nicht korrekt.');
  }

  if (neu !== wiederholung) scheitern('Die beiden Eingaben des neuen Kennworts stimmen nicht überein.');
  if (neu === alt) scheitern('Das neue Kennwort muss sich vom bisherigen unterscheiden.');

  const staerke = pruefePasswortstaerke(neu);
  if (!staerke.tauglich) scheitern(staerke.maengel.join(' '));

  await prisma.benutzer.update({
    where: { id: benutzer.id },
    data: { passwortHash: await hashePasswort(neu), passwortWechsel: false },
  });

  await protokolliere({
    benutzerId: benutzer.id,
    benutzerName: benutzer.anzeigename,
    aktion: 'AENDERN',
    entitaet: 'Benutzer',
    entitaetId: benutzer.id,
    details: 'Eigenes Kennwort geändert.',
  });

  redirect('/konto?ok=' + encodeURIComponent('Kennwort geändert.'));
}

export default async function Konto({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; fehler?: string }>;
}) {
  const benutzer = await verlangeBenutzer();
  const { ok, fehler } = await searchParams;

  const datensatz = await prisma.benutzer.findUnique({
    where: { id: benutzer.id },
    select: { letzterLogin: true, passwortWechsel: true, erstelltAm: true },
  });

  const offeneAnmeldungen = await prisma.sitzungstoken.count({
    where: { benutzerId: benutzer.id, widerrufen: false, laeuftAbAm: { gt: new Date() } },
  });

  return (
    <>
      <Seitenkopf titel="Mein Konto" beschreibung="Zugangsdaten und Rollen des angemeldeten Kontos." />

      <Rueckmeldung ok={ok} fehler={fehler} />

      {datensatz?.passwortWechsel && (
        <div className="mb-6">
          <Warnung titel="Ein Kennwortwechsel steht aus.">
            Dieses Kennwort wurde von einer anderen Person vergeben und ist ihr bekannt. Solange es
            nicht gewechselt ist, lässt sich nicht belegen, dass eine Handlung in diesem System
            tatsächlich von Ihnen stammt.
          </Warnung>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Karte titel="Kennwort ändern">
          <form action={aendereEigenesPasswort} className="space-y-3">
            <div>
              <label htmlFor="alt" className={beschriftung}>Bisheriges Kennwort</label>
              <input id="alt" name="alt" type="password" required autoComplete="current-password" className={feld} />
            </div>
            <div>
              <label htmlFor="neu" className={beschriftung}>Neues Kennwort</label>
              <input id="neu" name="neu" type="password" required autoComplete="new-password" className={feld} />
            </div>
            <div>
              <label htmlFor="wiederholung" className={beschriftung}>Neues Kennwort wiederholen</label>
              <input
                id="wiederholung"
                name="wiederholung"
                type="password"
                required
                autoComplete="new-password"
                className={feld}
              />
            </div>
            <p className="max-w-md text-xs leading-relaxed text-slate-500">
              Mindestens zwölf Zeichen und mindestens eine Ziffer oder ein Sonderzeichen. Länge zählt
              mehr als Komplexität: eine Folge aus mehreren Wörtern ist sicherer und leichter zu
              merken als ein kurzes Kennwort mit Sonderzeichen.
            </p>
            <Knopf>Kennwort ändern</Knopf>
          </form>
        </Karte>

        <Karte titel="Angaben zum Konto">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Name</dt>
              <dd className="text-slate-800">{benutzer.anzeigename}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Kennung</dt>
              <dd className="text-slate-800">{benutzer.email}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Rollen</dt>
              <dd className="text-right text-slate-800">
                {benutzer.rollen.map((r) => ROLLENBEZEICHNUNG[r]).join(', ') || '—'}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Konto besteht seit</dt>
              <dd className="text-slate-800">{datumZeit(datensatz?.erstelltAm)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Letzte Anmeldung</dt>
              <dd className="text-slate-800">{datumZeit(datensatz?.letzterLogin)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Offene Anmeldungen</dt>
              <dd className="text-slate-800">{offeneAnmeldungen}</dd>
            </div>
          </dl>
        </Karte>
      </div>

      <div className="mt-6">
        <Rechtshinweis norm="Art. 32 DSGVO">
          Die Zugangsdaten sind persönlich und dürfen nicht weitergegeben werden – auch nicht an
          andere Mitglieder des Gremiums. Jede Handlung in dieser Anwendung wird dem angemeldeten
          Konto zugerechnet. Wer den Verdacht hat, dass ein Kennwort bekannt geworden ist, ändert es
          hier sofort; laufende Anmeldungen bleiben davon unberührt und sind über „Abmelden" zu
          beenden.
        </Rechtshinweis>
      </div>
    </>
  );
}
