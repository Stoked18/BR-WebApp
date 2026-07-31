/** Anzeigetexte fuer Vorgangstypen und -status samt Fundstelle im BetrVG. */

export const VORGANGSTYP: Record<string, { text: string; norm: string }> = {
  EINSTELLUNG_99: { text: 'Einstellung', norm: '§ 99 BetrVG' },
  VERSETZUNG_99: { text: 'Versetzung', norm: '§ 99 BetrVG' },
  EINGRUPPIERUNG_99: { text: 'Ein-/Umgruppierung', norm: '§ 99 BetrVG' },
  KUENDIGUNG_ORDENTLICH_102: { text: 'ordentliche Kündigung', norm: '§ 102 BetrVG' },
  KUENDIGUNG_AUSSERORDENTLICH_102: { text: 'außerordentliche Kündigung', norm: '§ 102 BetrVG' },
  KUENDIGUNG_BR_MITGLIED_103: { text: 'Kündigung eines Mandatsträgers', norm: '§ 103 BetrVG' },
  VORLAEUFIGE_MASSNAHME_100: { text: 'vorläufige Maßnahme', norm: '§ 100 BetrVG' },
  MITBESTIMMUNG_87: { text: 'soziale Angelegenheit', norm: '§ 87 BetrVG' },
  UNTERRICHTUNG_80: { text: 'Unterrichtung', norm: '§ 80 Abs. 2 BetrVG' },
  PERSONALPLANUNG_92: { text: 'Personalplanung', norm: '§ 92 BetrVG' },
  AUSSCHREIBUNG_93: { text: 'Ausschreibung', norm: '§ 93 BetrVG' },
  AUSWAHLRICHTLINIE_95: { text: 'Auswahlrichtlinie', norm: '§ 95 BetrVG' },
  ARBEITSPLATZGESTALTUNG_90_91: { text: 'Arbeitsplatzgestaltung', norm: '§§ 90, 91 BetrVG' },
  BERUFSBILDUNG_96_98: { text: 'Berufsbildung', norm: '§§ 96–98 BetrVG' },
  BETRIEBSAENDERUNG_111: { text: 'Betriebsänderung', norm: '§ 111 BetrVG' },
  WIRTSCHAFTSAUSSCHUSS_106: { text: 'wirtschaftliche Angelegenheit', norm: '§ 106 BetrVG' },
  BESCHWERDE_85: { text: 'Beschwerde', norm: '§ 85 BetrVG' },
  EINIGUNGSSTELLE_76: { text: 'Einigungsstelle', norm: '§ 76 BetrVG' },
  SONSTIGES: { text: 'sonstiger Vorgang', norm: '' },
};

export const STATUSTEXT: Record<string, string> = {
  EINGEGANGEN: 'eingegangen',
  IN_PRUEFUNG: 'in Prüfung',
  IM_AUSSCHUSS: 'im Ausschuss',
  AUF_TAGESORDNUNG: 'auf der Tagesordnung',
  BESCHLOSSEN: 'beschlossen',
  BEANTWORTET: 'beantwortet',
  FRIST_VERSTRICHEN: 'Frist verstrichen',
  ABGESCHLOSSEN: 'abgeschlossen',
  ZURUECKGEZOGEN: 'zurückgezogen',
};
