import { describe, expect, it } from 'vitest';
import {
  aufsichtsratLage,
  betriebsausschuss,
  ermittleNachruecker,
  erforderlicheTeilnehmer,
  freistellungen,
  groesseBetriebsrat,
  mindestsitzeMinderheit,
  pruefeBeschlussfaehigkeit,
  pruefeGroesse,
  pruefeVideositzung,
  schulungskontingentTage,
  viertelQuorum,
  werteAbstimmung,
  wirtschaftsausschuss,
  type Nachrueckkandidat,
} from './betrvg';

describe('§ 9 BetrVG – Groesse des Betriebsrats', () => {
  it('trifft die Staffelgrenzen', () => {
    expect(groesseBetriebsrat(4)).toBe(0);
    expect(groesseBetriebsrat(5)).toBe(1);
    expect(groesseBetriebsrat(20)).toBe(1);
    expect(groesseBetriebsrat(21)).toBe(3);
    expect(groesseBetriebsrat(400)).toBe(9);
    expect(groesseBetriebsrat(401)).toBe(11);
  });

  it('unterscheidet 700 und 701 Wahlberechtigte', () => {
    // Der Unterschied entscheidet ueber 11 oder 13 Sitze und damit ueber
    // Betriebsausschuss, Quoren und Beschlussfaehigkeit.
    expect(groesseBetriebsrat(700)).toBe(11);
    expect(groesseBetriebsrat(701)).toBe(13);
    expect(groesseBetriebsrat(1000)).toBe(13);
    expect(groesseBetriebsrat(1001)).toBe(15);
  });

  it('rechnet oberhalb von 9.000 Arbeitnehmern weiter', () => {
    expect(groesseBetriebsrat(9000)).toBe(35);
    expect(groesseBetriebsrat(9001)).toBe(37);
    expect(groesseBetriebsrat(12000)).toBe(37);
    expect(groesseBetriebsrat(12001)).toBe(39);
  });

  it('meldet eine Abweichung zwischen Soll und Ist', () => {
    expect(pruefeGroesse(720, 13).stimmig).toBe(true);
    const abweichung = pruefeGroesse(700, 13);
    expect(abweichung.stimmig).toBe(false);
    expect(abweichung.soll).toBe(11);
    expect(abweichung.hinweis).toContain('§ 13 Abs. 2 Nr. 1 BetrVG');
  });
});

describe('§ 33 BetrVG – Beschlussfaehigkeit', () => {
  it('verlangt mindestens die Haelfte der Mitglieder', () => {
    expect(erforderlicheTeilnehmer(13)).toBe(7);
    expect(erforderlicheTeilnehmer(11)).toBe(6);
    expect(erforderlicheTeilnehmer(9)).toBe(5);
    expect(erforderlicheTeilnehmer(1)).toBe(1);
  });

  it('bewertet die Anwesenheit im 13er-Gremium', () => {
    expect(pruefeBeschlussfaehigkeit(13, 7).beschlussfaehig).toBe(true);
    const fehlt = pruefeBeschlussfaehigkeit(13, 6);
    expect(fehlt.beschlussfaehig).toBe(false);
    expect(fehlt.begruendung).toContain('unwirksam');
  });
});

describe('§ 33 Abs. 1 BetrVG – Mehrheiten', () => {
  it('zaehlt Enthaltungen nicht als Ja-Stimmen', () => {
    const e = werteAbstimmung(6, 5, 2, 13, 13);
    expect(e.angenommen).toBe(true);
    expect(e.erforderlich).toBe(6);
  });

  it('wertet Stimmengleichheit als Ablehnung', () => {
    const e = werteAbstimmung(6, 6, 1, 13, 13);
    expect(e.angenommen).toBe(false);
    expect(e.begruendung).toContain('Stimmengleichheit');
  });

  it('verlangt bei Aufgabenuebertragung die Mehrheit der Mitglieder', () => {
    // § 27 Abs. 2 S. 2 / § 28 Abs. 1 S. 3 BetrVG: 7 von 13, unabhaengig
    // davon, wie viele Mitglieder anwesend sind.
    const knapp = werteAbstimmung(6, 1, 0, 7, 13, 'MEHRHEIT_DER_MITGLIEDER');
    expect(knapp.erforderlich).toBe(7);
    expect(knapp.angenommen).toBe(false);

    const reicht = werteAbstimmung(7, 1, 0, 8, 13, 'MEHRHEIT_DER_MITGLIEDER');
    expect(reicht.angenommen).toBe(true);
  });

  it('rechnet Zwei-Drittel-Mehrheiten auf', () => {
    const e = werteAbstimmung(6, 3, 0, 9, 13, 'ZWEI_DRITTEL');
    expect(e.erforderlich).toBe(6);
    expect(e.angenommen).toBe(true);
  });
});

describe('Viertelquorum', () => {
  it('rundet auf', () => {
    expect(viertelQuorum(13)).toBe(4);
    expect(viertelQuorum(12)).toBe(3);
    expect(viertelQuorum(11)).toBe(3);
    expect(viertelQuorum(9)).toBe(3);
  });
});

describe('§ 27 BetrVG – Betriebsausschuss', () => {
  it('ist ab neun Mitgliedern zu bilden', () => {
    expect(betriebsausschuss(7).erforderlich).toBe(false);
    expect(betriebsausschuss(9).erforderlich).toBe(true);
  });

  it('umfasst im 13er-Gremium fuenf Personen', () => {
    const a = betriebsausschuss(13);
    expect(a.weitereMitglieder).toBe(3);
    expect(a.gesamt).toBe(5);
  });

  it('waechst mit der Gremiumsgroesse', () => {
    expect(betriebsausschuss(17).gesamt).toBe(7);
    expect(betriebsausschuss(25).gesamt).toBe(9);
    expect(betriebsausschuss(37).gesamt).toBe(11);
  });
});

describe('§ 38 BetrVG – Freistellungen', () => {
  it('sieht bei 700 Arbeitnehmern zwei Freistellungen vor', () => {
    expect(freistellungen(700).anzahl).toBe(2);
  });

  it('trifft die Staffelgrenzen', () => {
    expect(freistellungen(199).anzahl).toBe(0);
    expect(freistellungen(200).anzahl).toBe(1);
    expect(freistellungen(500).anzahl).toBe(1);
    expect(freistellungen(501).anzahl).toBe(2);
    expect(freistellungen(900).anzahl).toBe(2);
    expect(freistellungen(901).anzahl).toBe(3);
  });

  it('rechnet oberhalb von 10.000 weiter', () => {
    expect(freistellungen(10000).anzahl).toBe(12);
    expect(freistellungen(12000).anzahl).toBe(13);
  });
});

describe('§ 106 BetrVG – Wirtschaftsausschuss', () => {
  it('ist bei 700 Beschaeftigten zu bilden', () => {
    const w = wirtschaftsausschuss(700);
    expect(w.erforderlich).toBe(true);
    expect(w.maxMitglieder).toBe(7);
  });

  it('greift erst oberhalb von 100 Beschaeftigten', () => {
    expect(wirtschaftsausschuss(100).erforderlich).toBe(false);
    expect(wirtschaftsausschuss(101).erforderlich).toBe(true);
  });
});

describe('§ 15 Abs. 2 BetrVG – Geschlecht in der Minderheit', () => {
  it('greift erst ab drei Sitzen', () => {
    expect(mindestsitzeMinderheit(100, 200, 1).anwendbar).toBe(false);
  });

  it('verteilt 13 Sitze nach dem Hoechstzahlverfahren', () => {
    const m = mindestsitzeMinderheit(300, 400, 13);
    expect(m.verteilung.weiblich + m.verteilung.maennlich).toBe(13);
    expect(m.minderheit).toBe('WEIBLICH');
    expect(m.mindestsitze).toBe(m.verteilung.weiblich);
    expect(m.mindestsitze).toBeGreaterThan(0);
  });

  it('bildet das Verhaeltnis proportional ab', () => {
    // Bei exakt hälftiger Verteilung entfallen auf beide Geschlechter gleich viele Sitze.
    const m = mindestsitzeMinderheit(350, 350, 12);
    expect(m.verteilung.weiblich).toBe(6);
    expect(m.verteilung.maennlich).toBe(6);
    expect(m.anwendbar).toBe(false);
  });

  it('gibt einer sehr kleinen Minderheit mindestens keinen Sitz zu viel', () => {
    const m = mindestsitzeMinderheit(20, 680, 13);
    expect(m.minderheit).toBe('WEIBLICH');
    expect(m.mindestsitze).toBe(0);
  });
});

describe('§ 30 Abs. 2 BetrVG – Video- und Telefonkonferenz', () => {
  const basis = {
    gremiumsgroesse: 13,
    geschaeftsordnungRegeltVideo: true,
    widersprueche: 0,
    nichtoeffentlichkeitSichergestellt: true,
    aufzeichnungAusgeschlossen: true,
  };

  it('laesst die Videositzung unter den gesetzlichen Voraussetzungen zu', () => {
    expect(pruefeVideositzung(basis).zulaessig).toBe(true);
  });

  it('verlangt eine Regelung in der Geschaeftsordnung', () => {
    const p = pruefeVideositzung({ ...basis, geschaeftsordnungRegeltVideo: false });
    expect(p.zulaessig).toBe(false);
    expect(p.maengel[0]).toContain('§ 30 Abs. 2 Nr. 1 BetrVG');
  });

  it('scheitert am Widerspruch eines Viertels der Mitglieder', () => {
    expect(pruefeVideositzung({ ...basis, widersprueche: 3 }).zulaessig).toBe(true);
    const gesperrt = pruefeVideositzung({ ...basis, widersprueche: 4 });
    expect(gesperrt.zulaessig).toBe(false);
    expect(gesperrt.maengel.join(' ')).toContain('§ 30 Abs. 2 Nr. 3 BetrVG');
  });

  it('verlangt Nichtoeffentlichkeit und Aufzeichnungsverbot', () => {
    expect(pruefeVideositzung({ ...basis, nichtoeffentlichkeitSichergestellt: false }).zulaessig).toBe(false);
    expect(pruefeVideositzung({ ...basis, aufzeichnungAusgeschlossen: false }).zulaessig).toBe(false);
  });
});

describe('§ 37 Abs. 7 BetrVG – Schulungskontingent', () => {
  it('gewaehrt im ersten Mandat vier Wochen', () => {
    expect(schulungskontingentTage(true)).toBe(20);
    expect(schulungskontingentTage(false)).toBe(15);
  });
});

describe('DrittelbG – Aufsichtsrat', () => {
  it('greift oberhalb von 500 Arbeitnehmern', () => {
    expect(aufsichtsratLage(500).pflicht).toBe(false);
    expect(aufsichtsratLage(501).pflicht).toBe(true);
  });

  it('ordnet 700 Arbeitnehmer dem DrittelbG zu', () => {
    const l = aufsichtsratLage(700, 3);
    expect(l.gesetz).toBe('DrittelbG');
    expect(l.sitzeGesamtVorschlag).toBe(3);
    expect(l.sitzeArbeitnehmer).toBe(1);
  });

  it('rundet die Sitzzahl auf ein Vielfaches von drei (§ 95 AktG)', () => {
    const l = aufsichtsratLage(700, 7);
    expect(l.sitzeGesamtVorschlag).toBe(9);
    expect(l.sitzeArbeitnehmer).toBe(3);
  });

  it('weist oberhalb von 2.000 Arbeitnehmern auf das MitbestG hin', () => {
    const l = aufsichtsratLage(2500, 12);
    expect(l.gesetz).toBe('MitbestG');
    expect(l.sitzeArbeitnehmer).toBe(6);
  });
});

describe('§ 25 BetrVG – Nachruecken bei Personenwahl', () => {
  const kandidaten: Nachrueckkandidat[] = [
    { personId: 'p1', name: 'A. Bergmann', stimmen: 88, geschlecht: 'MAENNLICH', rang: 1 },
    { personId: 'p2', name: 'C. Dorn', stimmen: 74, geschlecht: 'WEIBLICH', rang: 2 },
    { personId: 'p3', name: 'E. Feld', stimmen: 61, geschlecht: 'MAENNLICH', rang: 3 },
  ];

  it('nimmt den Bewerber mit der hoechsten Stimmenzahl', () => {
    const v = ermittleNachruecker(kandidaten, new Set());
    expect(v.kandidat?.personId).toBe('p1');
    expect(v.begruendung).toContain('§ 25 Abs. 2 S. 2 BetrVG');
  });

  it('ueberspringt bereits nachgerueckte Personen', () => {
    const v = ermittleNachruecker(kandidaten, new Set(['p1']));
    expect(v.kandidat?.personId).toBe('p2');
  });

  it('meldet die erschoepfte Ersatzmitgliederliste', () => {
    const v = ermittleNachruecker(kandidaten, new Set(['p1', 'p2', 'p3']));
    expect(v.kandidat).toBeNull();
    expect(v.warnungen[0]).toContain('§ 13 Abs. 2 Nr. 2 BetrVG');
  });

  it('bevorzugt bei einem Quotenplatz das Minderheitengeschlecht', () => {
    const v = ermittleNachruecker(kandidaten, new Set(), {
      quotenplatzBetroffen: true,
      minderheitengeschlecht: 'WEIBLICH',
    });
    expect(v.kandidat?.personId).toBe('p2');
    expect(v.warnungen.join(' ')).toContain('§ 15 Abs. 2 BetrVG');
  });

  it('weicht auf die Stimmenzahl aus, wenn kein passendes Ersatzmitglied da ist', () => {
    const v = ermittleNachruecker(kandidaten, new Set(['p2']), {
      quotenplatzBetroffen: true,
      minderheitengeschlecht: 'WEIBLICH',
    });
    expect(v.kandidat?.personId).toBe('p1');
    expect(v.warnungen.join(' ')).toContain('kein Ersatzmitglied desselben');
  });

  it('weist auf den erforderlichen Losentscheid bei Stimmengleichheit hin', () => {
    const gleich: Nachrueckkandidat[] = [
      { personId: 'x', name: 'X', stimmen: 50, geschlecht: 'WEIBLICH', rang: 1 },
      { personId: 'y', name: 'Y', stimmen: 50, geschlecht: 'MAENNLICH', rang: 2 },
    ];
    const v = ermittleNachruecker(gleich, new Set());
    expect(v.warnungen.join(' ')).toContain('das Los');
  });
});
