import { prisma } from '@/lib/prisma';
import { verlangeRecht } from '@/lib/auth';
import { betriebsausschuss, freistellungen, mindestsitzeMinderheit, pruefeGroesse } from '@/lib/betrvg';
import { datum } from '@/lib/format';
import { Karte, Leer, Marke, Rechtshinweis, Seitenkopf, Tabelle, Warnung } from '@/components/ui';

export const dynamic = 'force-dynamic';

const FUNKTIONSTEXT: Record<string, string> = {
  VORSITZ: 'Vorsitz',
  STELLV_VORSITZ: 'Stellv. Vorsitz',
  SCHRIFTFUEHRUNG: 'Schriftführung',
  BETRIEBSAUSSCHUSS_MITGLIED: 'Betriebsausschuss',
  AUSSCHUSS_VORSITZ: 'Ausschussvorsitz',
  DATENSCHUTZKOORDINATION: 'Datenschutzkoordination',
  WAHLVORSTAND: 'Wahlvorstand',
  SBV_VERTRAUENSPERSON: 'Vertrauensperson SBV',
  JAV_VORSITZ: 'JAV-Vorsitz',
  AUFSICHTSRAT_MITGLIED: 'Aufsichtsrat',
};

export default async function Gremiumsseite() {
  await verlangeRecht('gremium.lesen');

  const [betrieb, gremium, amtsperiode] = await Promise.all([
    prisma.betrieb.findFirst(),
    prisma.gremium.findFirst({
      where: { typ: 'BETRIEBSRAT' },
      include: {
        mitgliedschaften: {
          where: { ende: null },
          include: { person: { include: { funktionen: { where: { ende: null } }, freistellungen: { where: { ende: null } }, schichtzuordnung: true } } },
          orderBy: [{ status: 'asc' }, { nachrueckRang: 'asc' }],
        },
      },
    }),
    prisma.amtsperiode.findFirst({ where: { aktiv: true } }),
  ]);

  if (!gremium || !betrieb) return <Leer text="Es ist noch kein Gremium angelegt." />;

  const wahlergebnisse = amtsperiode
    ? await prisma.wahlergebnis.findMany({
        where: { amtsperiodeId: amtsperiode.id },
        include: { person: true },
        orderBy: { stimmen: 'desc' },
      })
    : [];

  const ordentliche = gremium.mitgliedschaften.filter((m) => m.status === 'ORDENTLICH');
  const ersatz = gremium.mitgliedschaften.filter((m) => m.status === 'ERSATZMITGLIED');

  const groesse = pruefeGroesse(betrieb.anzahlWahlberechtigte, gremium.sollGroesse);
  const ausschuss = betriebsausschuss(gremium.sollGroesse);
  const frei = freistellungen(betrieb.anzahlBeschaeftigte);

  const weiblich = ordentliche.filter((m) => m.person.geschlecht === 'WEIBLICH').length;
  const maennlich = ordentliche.filter((m) => m.person.geschlecht === 'MAENNLICH').length;
  // Naeherung: Beschaeftigtenverhaeltnis ist im Stammdatensatz nicht erfasst,
  // deshalb wird das Verhaeltnis im Gremium als Anhalt herangezogen.
  const quote = mindestsitzeMinderheit(weiblich * 50, maennlich * 50, gremium.sollGroesse);

  const istFreigestellt = gremium.mitgliedschaften.filter((m) => m.person.freistellungen.length > 0);

  return (
    <>
      <Seitenkopf
        titel="Mitglieder und Rollen"
        beschreibung={`${gremium.bezeichnung} · ${amtsperiode?.bezeichnung ?? 'Amtsperiode nicht erfasst'} · gewählt in Personenwahl`}
      />

      {!groesse.stimmig && <div className="mb-6"><Warnung titel="Gremiumsgröße prüfen">{groesse.hinweis}</Warnung></div>}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Karte
            titel={`Ordentliche Mitglieder (${ordentliche.length})`}
            hinweis="Reihenfolge nach Stimmenzahl der Personenwahl"
          >
            <Tabelle kopf={['Name', 'Bereich', 'Schicht', 'Funktion', 'Seit']}>
              {ordentliche.map((m) => (
                <tr key={m.id}>
                  <td className="px-2 py-2">
                    <span className="font-medium text-slate-900">
                      {m.person.vorname} {m.person.nachname}
                    </span>
                    {m.person.freistellungen.length > 0 && (
                      <span className="ml-2">
                        <Marke ton="violett">
                          {m.person.freistellungen[0].umfang === 'VOLL'
                            ? 'freigestellt'
                            : `${m.person.freistellungen[0].prozent}% freigestellt`}
                        </Marke>
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2 text-slate-600">{m.person.abteilung ?? '–'}</td>
                  <td className="px-2 py-2 text-xs text-slate-500">
                    {m.person.schichtzuordnung?.bezeichnung ?? '–'}
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex flex-wrap gap-1">
                      {m.person.funktionen.map((f) => (
                        <Marke key={f.id} ton="blau">
                          {FUNKTIONSTEXT[f.typ] ?? f.typ}
                        </Marke>
                      ))}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-xs text-slate-500">{datum(m.beginn)}</td>
                </tr>
              ))}
            </Tabelle>
          </Karte>

          <Karte
            titel={`Ersatzmitglieder (${ersatz.length})`}
            hinweis="Nachrückreihenfolge nach § 25 Abs. 2 S. 2 BetrVG – bei Personenwahl entscheidet allein die Stimmenzahl"
          >
            {ersatz.length === 0 ? (
              <Leer text="Es sind keine Ersatzmitglieder erfasst." />
            ) : (
              <Tabelle kopf={['Rang', 'Name', 'Bereich', 'Stimmen']}>
                {ersatz.map((m) => {
                  const stimmen = wahlergebnisse.find((w) => w.personId === m.personId)?.stimmen;
                  return (
                    <tr key={m.id}>
                      <td className="px-2 py-2 tabular-nums text-slate-500">{m.nachrueckRang ?? '–'}</td>
                      <td className="px-2 py-2 font-medium text-slate-900">
                        {m.person.vorname} {m.person.nachname}
                      </td>
                      <td className="px-2 py-2 text-slate-600">{m.person.abteilung ?? '–'}</td>
                      <td className="px-2 py-2 tabular-nums text-slate-600">{stimmen ?? '–'}</td>
                    </tr>
                  );
                })}
              </Tabelle>
            )}
          </Karte>

          {wahlergebnisse.length > 0 && (
            <Karte titel="Wahlergebnis" hinweis={`Wahltag ${datum(amtsperiode?.wahltag)} · Mehrheitswahl ohne Listen`}>
              <Tabelle kopf={['Platz', 'Name', 'Stimmen', 'Ergebnis']}>
                {wahlergebnisse.map((w, i) => (
                  <tr key={w.id}>
                    <td className="px-2 py-2 tabular-nums text-slate-500">{i + 1}</td>
                    <td className="px-2 py-2 text-slate-900">
                      {w.person.vorname} {w.person.nachname}
                    </td>
                    <td className="px-2 py-2 tabular-nums font-medium text-slate-900">{w.stimmen}</td>
                    <td className="px-2 py-2">
                      {w.gewaehlt ? (
                        <Marke ton="gruen">gewählt</Marke>
                      ) : (
                        <Marke ton="neutral">Ersatzmitglied, Rang {w.nachrueckRang}</Marke>
                      )}
                    </td>
                  </tr>
                ))}
              </Tabelle>
            </Karte>
          )}
        </div>

        <div className="space-y-6">
          <Karte titel="Rechtliche Eckwerte">
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">Gremiumsgröße</dt>
                <dd className="text-slate-800">
                  {gremium.sollGroesse} Mitglieder
                  <p className="mt-0.5 text-xs text-slate-500">{groesse.hinweis}</p>
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">Betriebsausschuss</dt>
                <dd className="text-slate-800">
                  {ausschuss.gesamt} Personen
                  <p className="mt-0.5 text-xs text-slate-500">{ausschuss.grundlage}</p>
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">Freistellungen</dt>
                <dd className="text-slate-800">
                  {istFreigestellt.length} erfasst, {frei.anzahl} gesetzlich vorgeschrieben
                  <p className="mt-0.5 text-xs text-slate-500">{frei.grundlage}</p>
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">Zusammensetzung</dt>
                <dd className="text-slate-800">
                  {weiblich} weiblich, {maennlich} männlich
                  <p className="mt-0.5 text-xs text-slate-500">
                    Für die Prüfung des § 15 Abs. 2 BetrVG ist das Verhältnis der Geschlechter in der
                    Belegschaft maßgeblich, nicht das im Gremium. Es ist in den Stammdaten zu hinterlegen.
                  </p>
                </dd>
              </div>
            </dl>
          </Karte>

          <Karte titel="Nachrücken im Vertretungsfall">
            <p className="text-sm text-slate-700">
              Ist ein ordentliches Mitglied zeitweilig verhindert, rückt nach § 25 Abs. 1 S. 2 BetrVG ein
              Ersatzmitglied nach. Die Verhinderung wird bei der jeweiligen Sitzung erfasst; das System
              ermittelt daraufhin die nächste berechtigte Person und dokumentiert die Ladung.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Häufig übersehen: Auch eine rechtliche Verhinderung – etwa die Beratung der eigenen
              Angelegenheit – löst das Nachrücken aus. Ebenso zählt eine Schichtlage, die die Teilnahme
              tatsächlich unmöglich macht.
            </p>
          </Karte>

          <Rechtshinweis norm="§ 15 Abs. 2 BetrVG">
            {quote.grundlage}
          </Rechtshinweis>
        </div>
      </div>
    </>
  );
}
