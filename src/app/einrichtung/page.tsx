import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { hashePasswort, pruefePasswortstaerke } from '@/lib/passwort';
import { protokolliere } from '@/lib/audit';
import { groesseBetriebsrat } from '@/lib/betrvg';
import { BUNDESLAENDER } from '@/lib/feiertage';
import { EINSTELLUNGEN } from '@/lib/einstellungen';

export const dynamic = 'force-dynamic';

/**
 * Ersteinrichtung.
 *
 * Ohne Beispielbestand gaebe es im Produktivbetrieb weder einen Betrieb noch
 * ein Konto – niemand koennte sich anmelden. Diese Seite schliesst die Luecke
 * und ist nur erreichbar, solange noch kein Benutzerkonto besteht. Danach
 * verweigert sie den Zugang, damit sie nicht zur Hintertuer wird.
 */
async function richteEin(formular: FormData) {
  'use server';

  // Doppelte Absicherung: auch die Aktion prueft, ob wirklich noch nichts da ist.
  if ((await prisma.benutzer.count()) > 0) {
    throw new Error('Die Einrichtung ist bereits abgeschlossen.');
  }

  const betriebName = String(formular.get('betriebName') ?? '').trim();
  const ort = String(formular.get('ort') ?? '').trim();
  const bundesland = String(formular.get('bundesland') ?? 'NW');
  const wahlberechtigte = Number(formular.get('wahlberechtigte') ?? 0);
  const beschaeftigte = Number(formular.get('beschaeftigte') ?? 0);
  const gremiumsgroesse = Number(formular.get('gremiumsgroesse') ?? 0);

  const name = String(formular.get('name') ?? '').trim();
  const email = String(formular.get('email') ?? '').trim().toLowerCase();
  const passwort = String(formular.get('passwort') ?? '');

  if (!betriebName || !ort) throw new Error('Name und Ort des Betriebs sind anzugeben.');
  if (!name || !email) throw new Error('Name und E-Mail-Adresse sind anzugeben.');
  if (wahlberechtigte < 5) {
    throw new Error('Ein Betriebsrat wird nach § 1 Abs. 1 BetrVG erst ab fünf wahlberechtigten Arbeitnehmern gewählt.');
  }

  const staerke = pruefePasswortstaerke(passwort);
  if (!staerke.tauglich) throw new Error(staerke.maengel.join(' '));

  const betrieb = await prisma.betrieb.create({
    data: {
      name: betriebName,
      ort,
      bundesland,
      anzahlWahlberechtigte: wahlberechtigte,
      anzahlBeschaeftigte: beschaeftigte || wahlberechtigte,
    },
  });

  await prisma.gremium.create({
    data: {
      betriebId: betrieb.id,
      typ: 'BETRIEBSRAT',
      bezeichnung: `Betriebsrat ${ort}`,
      sollGroesse: gremiumsgroesse || groesseBetriebsrat(wahlberechtigte),
    },
  });

  const benutzer = await prisma.benutzer.create({
    data: {
      email,
      anzeigename: name,
      passwortHash: await hashePasswort(passwort),
      rollen: ['BR_VORSITZ'],
      passwortWechsel: false,
    },
  });

  // Vorgaben aus dem Einstellungskatalog anlegen, damit die Verwaltung von
  // Anfang an vollstaendig bestueckt ist.
  const testbetrieb = formular.get('testbetrieb') === 'on';
  await prisma.einstellung.createMany({
    data: EINSTELLUNGEN.map((def) => ({
      schluessel: def.schluessel,
      wert: def.schluessel === 'betrieb.testbetrieb' ? (testbetrieb ? 'ja' : 'nein') : def.vorgabe,
      beschreibung: def.bezeichnung,
    })),
    skipDuplicates: true,
  });

  await protokolliere({
    benutzerId: benutzer.id,
    benutzerName: benutzer.anzeigename,
    aktion: 'ANLEGEN',
    entitaet: 'Ersteinrichtung',
    entitaetId: betrieb.id,
    details: `Betrieb "${betriebName}" und erstes Konto für den Betriebsratsvorsitz angelegt.`,
  });

  redirect('/anmeldung');
}

export default async function Einrichtung() {
  // Sobald ein Konto besteht, ist diese Seite gesperrt.
  if ((await prisma.benutzer.count()) > 0) redirect('/anmeldung');

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">BR-Cockpit einrichten</h1>
          <p className="mt-1 text-sm text-slate-600">
            Diese Seite erscheint nur einmal. Sie legt den Betrieb, das Gremium und das erste Konto
            für den Betriebsratsvorsitz an. Danach ist sie dauerhaft gesperrt.
          </p>
        </div>

        <form action={richteEin} className="space-y-6">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Betrieb</h2>
            <div className="mt-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="betriebName" className="block text-xs font-medium text-slate-600">
                    Name des Betriebs
                  </label>
                  <input id="betriebName" name="betriebName" required className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm" />
                </div>
                <div>
                  <label htmlFor="ort" className="block text-xs font-medium text-slate-600">Ort</label>
                  <input id="ort" name="ort" required className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm" />
                </div>
              </div>

              <div>
                <label htmlFor="bundesland" className="block text-xs font-medium text-slate-600">
                  Bundesland
                </label>
                <select id="bundesland" name="bundesland" defaultValue="NW" className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm">
                  {BUNDESLAENDER.map((l) => (
                    <option key={l.kuerzel} value={l.kuerzel}>
                      {l.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  Steuert die Feiertage in der Fristberechnung. In Nordrhein-Westfalen zählen
                  Fronleichnam und Allerheiligen mit – das verschiebt Fristen nach § 193 BGB.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label htmlFor="wahlberechtigte" className="block text-xs font-medium text-slate-600">
                    Wahlberechtigte
                  </label>
                  <input id="wahlberechtigte" name="wahlberechtigte" type="number" min={5} required className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm" />
                </div>
                <div>
                  <label htmlFor="beschaeftigte" className="block text-xs font-medium text-slate-600">
                    Beschäftigte gesamt
                  </label>
                  <input id="beschaeftigte" name="beschaeftigte" type="number" min={1} className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm" />
                </div>
                <div>
                  <label htmlFor="gremiumsgroesse" className="block text-xs font-medium text-slate-600">
                    Mitglieder (leer = automatisch)
                  </label>
                  <input id="gremiumsgroesse" name="gremiumsgroesse" type="number" min={1} className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm" />
                </div>
              </div>
              <p className="text-xs leading-relaxed text-slate-500">
                Maßgeblich für die Größe des Betriebsrats nach § 9 BetrVG ist die Zahl der in der
                Regel beschäftigten <em>wahlberechtigten</em> Arbeitnehmer am Tag des
                Wahlausschreibens – einschließlich der nach § 7 S. 2 BetrVG wahlberechtigten
                Leiharbeitnehmer. Bleibt das Feld für die Mitgliederzahl leer, wird sie daraus
                berechnet.
              </p>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Konto für den Betriebsratsvorsitz</h2>
            <div className="mt-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="name" className="block text-xs font-medium text-slate-600">Name</label>
                  <input id="name" name="name" required className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm" />
                </div>
                <div>
                  <label htmlFor="email" className="block text-xs font-medium text-slate-600">
                    Dienstliche E-Mail-Adresse
                  </label>
                  <input id="email" name="email" type="email" required autoComplete="username" className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm" />
                </div>
              </div>
              <div>
                <label htmlFor="passwort" className="block text-xs font-medium text-slate-600">Passwort</label>
                <input id="passwort" name="passwort" type="password" required autoComplete="new-password" className="mt-1 w-full max-w-sm rounded border border-slate-300 px-2 py-1.5 text-sm" />
                <p className="mt-1 text-xs text-slate-500">
                  Mindestens zwölf Zeichen. Länge zählt mehr als Sonderzeichen.
                </p>
              </div>
              <label className="flex items-start gap-2 text-sm text-slate-700">
                <input type="checkbox" name="testbetrieb" defaultChecked className="mt-0.5" />
                <span>
                  Die Installation dient zunächst der Erprobung
                  <span className="block text-xs leading-relaxed text-slate-500">
                    Blendet in der ganzen Anwendung einen Hinweisbalken ein: Fristen und Beschlüsse
                    entfalten keine Wirkung nach außen, maßgeblich bleiben die unterzeichnete
                    Niederschrift und die Beschlusssammlung nach § 34 BetrVG. Später unter
                    „Verwaltung" abschaltbar.
                  </span>
                </span>
              </label>
            </div>
          </section>

          <button
            type="submit"
            className="rounded-md bg-marke-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-marke-800"
          >
            Einrichtung abschließen
          </button>
        </form>

        <p className="mt-6 text-xs leading-relaxed text-slate-500">
          Weitere Konten, Mitglieder und Ausschüsse legen Sie anschließend unter „Verwaltung" an.
          Die Unterlagen des Betriebsrats unterliegen der Geheimhaltungspflicht nach § 79 BetrVG.
        </p>
      </div>
    </main>
  );
}
