/*
 * The person's tradition (nusach) and the customs that follow from it, for "today's davening"
 * (lib/siddur/today.ts). Each tradition gives a starting point; every custom can be changed by the
 * person, in the Daven settings, by answering the siddur when it asks, or by telling RabbAI in the
 * chat (which offers the change for them to confirm). Nothing here changes a word of a siddur: it
 * only decides what is shown as said today.
 *
 * The defaults come from established Orthodox sources, gathered in docs/davening-calendar-audit.md
 * ("Traditions"). RabbAI's reading, for the rabbinic board (founding spec, open question 23).
 */

export type Nusach = "ashkenaz" | "sefard" | "chabad" | "edot";

export const NUSACH_NAMES: Record<Nusach, { label: string; about: string }> = {
  ashkenaz: { label: "Ashkenaz", about: "Most Ashkenazi shuls (Koren, ArtScroll)" },
  sefard: { label: "Sefard", about: "Chassidic shuls (Nusach Sefard)" },
  chabad: { label: "Chabad", about: "Nusach Ari, Tehillat Hashem" },
  edot: { label: "Sephardi", about: "Edot HaMizrach, Sephardi and Mizrachi shuls" },
};

/** Customs that differ between traditions and communities. */
export interface DavenCustoms {
  nusach: Nusach;
  /** Yom HaAtzma'ut and Yom Yerushalayim kept as days of thanksgiving: Hallel, and no Tachanun. */
  modernDays: boolean;
  /** In Israel, Viduy and the Thirteen Attributes before Tachanun (the Koren siddur: "some say"). */
  viduyIsrael: boolean;
  /** Viduy and the Thirteen Attributes before Tachanun every day it is said, everywhere. */
  viduyDaily: boolean;
  /** Outside Israel: no Tachanun through 12 Sivan. */
  sivan12: boolean;
  /** Outside Israel: no Tachanun through the end of Tishrei. */
  tishreiEnd: boolean;
  /** No Tachanun on Pesach Sheni (the Koren siddur's list; some Ashkenazim say it). */
  pesachSheni: boolean;
  /** No Tachanun on Chabad's days: 10 Kislev, 19–20 Kislev, 12–13 Tammuz (each from the Mincha before). */
  chabadDays: boolean;
  /** No Tachanun at Mincha (many Chassidic shuls, davening near sunset). */
  noMinchaTachanun: boolean;
  /** "He causes the dew to fall" in summer outside Israel. */
  dew: boolean;
  /** Ein Keloheinu and Pitum HaKetoret every day (outside Israel Ashkenazim say them on Shabbat). */
  pitumDaily: boolean;
  /** LeDavid HaShem Ori (Psalm 27): until Shemini Atzeret, until Hoshana Raba, or all year. */
  ledavid: "shemini-atzeret" | "hoshana-raba" | "all-year";
  /** Lamenatze'ach (Psalm 20) left out on every day without Tachanun (Sephardi), not only the main ones. */
  lamenatzeachWide: boolean;
  /** Mizmor LeToda said on Erev Pesach, Chol HaMoed Pesach and Erev Yom Kippur (Sephardi). */
  letodaPesach: boolean;
  /** Av HaRachamim before Musaf on Shabbat. */
  avHarachamim: boolean;
  /** Shabbat afternoon: Pirkei Avot from after Pesach to Rosh HaShana, all summer through Elul, or Pesach to Shavuot. */
  avot: "until-rosh-hashana" | "pesach-shavuot";
  /** Barekhi Nafshi on winter Shabbat afternoons. */
  barchiNafshi: boolean;
  /** Vihi No'am on Motza'ei Shabbat even when a festival falls in the coming week. */
  vihiNoamAlways: boolean;
  /** Yizkor on its four days (Sephardim say Hashkavah instead). */
  yizkor: boolean;
  /** Akdamut on Shavuot. */
  akdamut: boolean;
  /** Hoshanot on a Shabbat of Sukkot. */
  hoshanotShabbat: boolean;
  /** Hallel in shul after Ma'ariv on the Seder night(s). */
  pesachNightHallel: boolean;
  /** A blessing over half Hallel (Sephardim don't say one). */
  halfHallelBlessing: boolean;
  /** Avinu Malkeinu on fast days (many Sephardim say it only in the Ten Days). */
  avinuMalkeinuFasts: boolean;
}

const ASHKENAZ: DavenCustoms = {
  nusach: "ashkenaz",
  modernDays: false,
  viduyIsrael: false,
  viduyDaily: false,
  sivan12: false,
  tishreiEnd: false,
  pesachSheni: true,
  chabadDays: false,
  noMinchaTachanun: false,
  dew: false,
  pitumDaily: false,
  ledavid: "shemini-atzeret",
  lamenatzeachWide: false,
  letodaPesach: false,
  avHarachamim: true,
  avot: "until-rosh-hashana",
  barchiNafshi: true,
  vihiNoamAlways: false,
  yizkor: true,
  akdamut: true,
  hoshanotShabbat: true,
  pesachNightHallel: false,
  halfHallelBlessing: true,
  avinuMalkeinuFasts: true,
};

/** Each tradition's starting point. */
export function customsFor(nusach: Nusach): DavenCustoms {
  switch (nusach) {
    case "sefard":
      return { ...ASHKENAZ, nusach, viduyDaily: true, sivan12: true, tishreiEnd: true, dew: true, pitumDaily: true, ledavid: "hoshana-raba", pesachNightHallel: true };
    case "chabad":
      return { ...ASHKENAZ, nusach, viduyDaily: true, sivan12: true, tishreiEnd: true, chabadDays: true, dew: true, pitumDaily: true, ledavid: "hoshana-raba", barchiNafshi: false, akdamut: false, hoshanotShabbat: false, pesachNightHallel: true };
    case "edot":
      return {
        ...ASHKENAZ,
        nusach,
        viduyDaily: true,
        sivan12: true,
        tishreiEnd: true,
        dew: true,
        pitumDaily: true,
        ledavid: "all-year",
        lamenatzeachWide: true,
        letodaPesach: true,
        avHarachamim: false,
        avot: "pesach-shavuot",
        barchiNafshi: false,
        vihiNoamAlways: true,
        yizkor: false,
        akdamut: false,
        hoshanotShabbat: false,
        pesachNightHallel: true,
        halfHallelBlessing: false,
        avinuMalkeinuFasts: false,
      };
    default:
      return { ...ASHKENAZ };
  }
}

export const DEFAULT_CUSTOMS: DavenCustoms = customsFor("ashkenaz");

/** The customs a person can change one by one, in the order the settings show them, with plain words. */
export type CustomKey = Exclude<keyof DavenCustoms, "nusach">;

export interface CustomInfo {
  key: CustomKey;
  /** "No Tachanun on Pesach Sheni". */
  label: string;
  /** For a choice, its options. */
  options?: Array<{ value: string; label: string }>;
  /** Where it matters: some customs are only for Israel or only outside it. */
  where?: "israel" | "outside";
  group: "tachanun" | "daily" | "shabbat" | "festivals";
}

export const CUSTOMS: CustomInfo[] = [
  { key: "pesachSheni", label: "No Tachanun on Pesach Sheni", group: "tachanun" },
  { key: "sivan12", label: "No Tachanun through 12 Sivan", where: "outside", group: "tachanun" },
  { key: "tishreiEnd", label: "No Tachanun through the end of Tishrei", where: "outside", group: "tachanun" },
  { key: "chabadDays", label: "No Tachanun on 10 Kislev, 19–20 Kislev, 12–13 Tammuz", group: "tachanun" },
  { key: "noMinchaTachanun", label: "No Tachanun at Mincha (my shul davens near sunset)", group: "tachanun" },
  { key: "modernDays", label: "Hallel and no Tachanun on Yom HaAtzma'ut and Yom Yerushalayim", group: "tachanun" },
  { key: "viduyDaily", label: "Viduy before Tachanun every day", group: "tachanun" },
  { key: "viduyIsrael", label: "Viduy before Tachanun in Israel", where: "israel", group: "tachanun" },
  { key: "avinuMalkeinuFasts", label: "Avinu Malkeinu on fast days", group: "tachanun" },
  { key: "dew", label: "“He causes the dew to fall” in summer", where: "outside", group: "daily" },
  { key: "pitumDaily", label: "Ein Keloheinu and Pitum HaKetoret every day", group: "daily" },
  {
    key: "ledavid",
    label: "LeDavid HaShem Ori (Psalm 27)",
    options: [
      { value: "shemini-atzeret", label: "Elul through Shemini Atzeret" },
      { value: "hoshana-raba", label: "Elul through Hoshana Raba" },
      { value: "all-year", label: "All year" },
    ],
    group: "daily",
  },
  { key: "lamenatzeachWide", label: "Lamenatze'ach left out on every day without Tachanun", group: "daily" },
  { key: "letodaPesach", label: "Mizmor LeToda on Erev Pesach, Pesach and Erev Yom Kippur", group: "daily" },
  { key: "avHarachamim", label: "Av HaRachamim before Musaf", group: "shabbat" },
  {
    key: "avot",
    label: "Pirkei Avot on Shabbat afternoon",
    options: [
      { value: "until-rosh-hashana", label: "From Pesach to Rosh HaShana" },
      { value: "pesach-shavuot", label: "From Pesach to Shavuot" },
    ],
    group: "shabbat",
  },
  { key: "barchiNafshi", label: "Barekhi Nafshi on winter Shabbat afternoons", group: "shabbat" },
  { key: "vihiNoamAlways", label: "Vihi No'am even when a festival is in the coming week", group: "shabbat" },
  { key: "yizkor", label: "Yizkor (not Hashkavah)", group: "festivals" },
  { key: "akdamut", label: "Akdamut on Shavuot", group: "festivals" },
  { key: "hoshanotShabbat", label: "Hoshanot on the Shabbat of Sukkot", group: "festivals" },
  { key: "pesachNightHallel", label: "Hallel in shul on the Seder night", group: "festivals" },
  { key: "halfHallelBlessing", label: "A blessing over half Hallel", group: "festivals" },
];

const NUSACHS = Object.keys(NUSACH_NAMES) as Nusach[];

export function isNusach(v: unknown): v is Nusach {
  return typeof v === "string" && (NUSACHS as string[]).includes(v);
}

/**
 * Stored customs, each checked: a tradition's starting point, with the person's own changes on top.
 * Customs stored before traditions existed (modernDays, viduyIsrael, sivan12, tishreiEnd) are kept.
 */
export function parseCustoms(raw: unknown): DavenCustoms {
  const c = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const base = customsFor(isNusach(c.nusach) ? c.nusach : "ashkenaz");
  const out: DavenCustoms = { ...base };
  for (const info of CUSTOMS) {
    const v = c[info.key];
    if (info.options) {
      if (typeof v === "string" && info.options.some((o) => o.value === v)) (out as unknown as Record<string, unknown>)[info.key] = v;
    } else if (typeof v === "boolean") (out as unknown as Record<string, unknown>)[info.key] = v;
  }
  return out;
}

/** A change to the siddur's settings offered by RabbAI in the chat ([[daven …]]), checked. */
export type DavenSettingChange = { key: "nusach"; value: Nusach } | { key: CustomKey; value: boolean | string };

/** Reads "nusach=sefard" or "pesachSheni=false" from RabbAI's marker; null when it isn't a real setting. */
export function parseSettingChange(text: string): DavenSettingChange | null {
  const m = text.trim().match(/^([A-Za-z]+)\s*=\s*([A-Za-z-]+)$/);
  if (!m) return null;
  const [, key, value] = m;
  if (key === "nusach") return isNusach(value) ? { key, value } : null;
  const info = CUSTOMS.find((c) => c.key === key);
  if (!info) return null;
  if (info.options) return info.options.some((o) => o.value === value) ? { key: info.key, value } : null;
  if (value === "true" || value === "false") return { key: info.key, value: value === "true" };
  return null;
}

/** "Tradition: Sefard", "No Tachanun on Pesach Sheni: off": a change in plain words. */
export function describeChange(change: DavenSettingChange): string {
  if (change.key === "nusach") return `Tradition: ${NUSACH_NAMES[change.value as Nusach].label}`;
  const info = CUSTOMS.find((c) => c.key === change.key)!;
  if (info.options) return `${info.label}: ${info.options.find((o) => o.value === change.value)?.label ?? change.value}`;
  return `${info.label}: ${change.value ? "yes" : "no"}`;
}

/** Applies a change: a new tradition starts from its own customs. */
export function applyChange(customs: DavenCustoms, change: DavenSettingChange): DavenCustoms {
  if (change.key === "nusach") return customsFor(change.value as Nusach);
  return { ...customs, [change.key]: change.value } as DavenCustoms;
}

/** The siddur that fits a tradition best, among the library's (Chabad: Siddur Sefard, the closest). */
export function siddurFor(nusach: Nusach): string {
  return nusach === "edot" ? "Siddur Edot HaMizrach" : nusach === "sefard" || nusach === "chabad" ? "Siddur Sefard" : "The Koren Shalem Siddur; Ashkenaz";
}
