import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { verlangeRecht } from '@/lib/auth';
import { darf } from '@/lib/authz';
import { protokolliere } from '@/lib/audit';
import { datum } from '@/lib/format';
import { Karte, Kennzahl, Knopf, Leer, Marke, Seitenkopf, Tabelle } from '@/components/ui';

export const dynamic = 'force-dynamic';

const PRIO: Record<string, { text: string; ton: 'neutral' | 'gelb' | 'rot' | 'blau' }> = {
  NIEDRIG: { text: 'niedrig', ton: 'neutral' },
  NORMAL: { text: 'normal', ton: 'blau' },
  HOCH: { text: 'hoch', ton: 'gelb' },
  KRITISCH: { text: 'kritisch', ton: 'rot' },
};

const STATUSTEXT: Record<string, string> = {
  OFFEN: 'offen',
  IN_ARBEIT: 'in Arbeit',
  WARTET: 'wartet',
  ERLEDIGT: 'erledigt',
  ABGEBROCHEN: 'abgebrochen',
};

async function setzeStatus(formular: FormData) {
  'use server';
  const benutzer = await verlangeRecht('aufgabe.verwalten');

  const id = String(formular.get('id'));
  const status = String(formular.get('status')) as 'OFFEN' | 'IN_ARBEIT' | 'ERLEDIGT';

  await prisma.aufgabe.update({
    where: { id },
    data: { status, erledigtAm: status === 'ERLEDIGT' ? new Date() : null },
  });

  await protokolliere({
    benutzerId: benutzer.id,
    benutzerName: benutzer.anzeigename,
    aktion: 'AENDERN',
    entitaet: 'Aufgabe',
    entitaetId: id,
    details: `Status auf ${status} gesetzt.`,
  });

  revalidatePath('/aufgaben');
}

async function legeAn(formular: FormData) {
  'use server';
  const benutzer = await verlangeRecht('aufgabe.verwalten');

  const titel = String(formular.get('titel')).trim();
  if (!titel) return;
  const faellig = String(formular.get('faelligAm') ?? '');
  const zustaendigId = String(formular.get('zustaendigId') ?? '') || null;

  await prisma.aufgabe.create({
    data: {
      titel,
      beschreibung: String(formular.get('beschreibung') ?? '').trim() || null,
      prioritaet: (String(formular.get('prioritaet') ?? 'NORMAL') as 'NIEDRIG' | 'NORMAL' | 'HOCH' | 'KRITISCH'),
      faelligAm: faellig ? new Date(faellig) : null,
      zustaendigId,
      erstellerId: benutzer.id,
    },
  });

  await protokolliere({
    benutzerId: benutzer.id,
    benutzerName: benutzer.anzeigename,
    aktion: 'ANLEGEN',
    entitaet: 'Aufgabe',
    details: titel,
  });

  revalidatePath('/aufgaben');
}

export default async function Aufgaben() {
  const benutzer = await verlangeRecht('aufgabe.lesen');
  const jetzt = new Date();

  const [aufgaben, personen] = await Promise.all([
    prisma.aufgabe.findMany({
      orderBy: [{ status: 'asc' }, { faelligAm: { sort: 'asc', nulls: 'last' } }],
      include: { zustaendig: true, ausschuss: true, vorgang: true },
    }),
    prisma.person.findMany({ where: { aktiv: true }, orderBy: { nachname: 'asc' } }),
  ]);

  const offen = aufgaben.filter((a) => ['OFFEN', 'IN_ARBEIT', 'WARTET'].includes(a.status));
  const ueberfaellig = offen.filter((a) => a.faelligAm && a.faelligAm < jetzt);
  const kannVerwalten = darf(benutzer, 'aufgabe.verwalten');

  return (
    <>
      <Seitenkopf
        titel="Aufgaben"
        beschreibung="Was aus Beschlüssen und laufenden Vorgängen zu erledigen ist – mit Zuständigkeit und Termin."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Kennzahl wert={offen.length} bezeichnung="Offen" />
        <Kennzahl wert={ueberfaellig.length} bezeichnung="Überfällig" ton={ueberfaellig.length ? 'rot' : 'gruen'} />
        <Kennzahl wert={aufgaben.length - offen.length} bezeichnung="Abgeschlossen" ton="gruen" />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Karte titel={`Aufgabenliste (${aufgaben.length})`}>
            {aufgaben.length === 0 ? (
              <Leer text="Es sind keine Aufgaben erfasst." />
            ) : (
              <Tabelle kopf={['Aufgabe', 'Zuständig', 'Fällig', 'Priorität', kannVerwalten ? 'Aktion' : 'Status']}>
                {aufgaben.map((a) => {
                  const spaet = a.faelligAm && a.faelligAm < jetzt && a.status !== 'ERLEDIGT';
                  const prio = PRIO[a.prioritaet] ?? { text: a.prioritaet, ton: 'neutral' as const };
                  return (
                    <tr key={a.id} className={a.status === 'ERLEDIGT' ? 'opacity-50' : ''}>
                      <td className="px-2 py-2">
                        <span className={`font-medium ${a.status === 'ERLEDIGT' ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                          {a.titel}
                        </span>
                        {a.beschreibung && (
                          <span className="mt-0.5 block max-w-lg text-xs leading-relaxed text-slate-500">
                            {a.beschreibung}
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-xs text-slate-600">
                        {a.zustaendig ? `${a.zustaendig.vorname} ${a.zustaendig.nachname}` : a.ausschuss?.bezeichnung ?? '–'}
                      </td>
                      <td className={`whitespace-nowrap px-2 py-2 text-xs ${spaet ? 'font-medium text-rose-700' : 'text-slate-600'}`}>
                        {datum(a.faelligAm)}
                      </td>
                      <td className="px-2 py-2">
                        <Marke ton={prio.ton}>{prio.text}</Marke>
                      </td>
                      <td className="px-2 py-2">
                        {kannVerwalten && a.status !== 'ERLEDIGT' ? (
                          <form action={setzeStatus}>
                            <input type="hidden" name="id" value={a.id} />
                            <input type="hidden" name="status" value="ERLEDIGT" />
                            <button type="submit" className="text-xs text-marke-700 underline hover:text-marke-900">
                              erledigt
                            </button>
                          </form>
                        ) : (
                          <span className="text-xs text-slate-500">{STATUSTEXT[a.status] ?? a.status}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </Tabelle>
            )}
          </Karte>
        </div>

        {kannVerwalten && (
          <Karte titel="Aufgabe anlegen">
            <form action={legeAn} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600">Bezeichnung</label>
                <input name="titel" required className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600">Erläuterung</label>
                <textarea name="beschreibung" rows={3} className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600">Zuständig</label>
                <select name="zustaendigId" className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm">
                  <option value="">– offen –</option>
                  {personen.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.vorname} {p.nachname}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600">Fällig am</label>
                  <input name="faelligAm" type="date" className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600">Priorität</label>
                  <select name="prioritaet" defaultValue="NORMAL" className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm">
                    <option value="NIEDRIG">niedrig</option>
                    <option value="NORMAL">normal</option>
                    <option value="HOCH">hoch</option>
                    <option value="KRITISCH">kritisch</option>
                  </select>
                </div>
              </div>
              <Knopf>Anlegen</Knopf>
            </form>
          </Karte>
        )}
      </div>
    </>
  );
}
