/*
 * What a siddur's instructions point to, so the Daven tab can open it: the Koren siddur's laws
 * ("See laws 129–131", in its "Gates to Prayer") and other prayers named in an instruction
 * ("say Hallel on page 732"). Page numbers are the printed book's, so the app opens by name.
 */

/** A range of the Koren siddur's numbered laws ("129–131"; "478a"). */
export interface LawRange {
  from: number;
  to: number;
  label: string;
}

/** The laws an instruction refers to ("See laws 129–131", "See law 478a"). */
export function lawRanges(text: string): LawRange[] {
  const out: LawRange[] = [];
  for (const m of text.matchAll(/\blaws?\s+(\d{1,3})([a-z])?(?:\s*[–-]\s*(\d{1,3}))?/gi)) {
    const from = Number(m[1]);
    const to = m[3] ? Number(m[3]) : from;
    if (!from || to < from || to - from > 20) continue;
    out.push({ from, to, label: m[3] ? `Laws ${from}–${to}` : `Law ${from}${m[2] ?? ""}` });
  }
  return out;
}

/** Prayers an instruction may send you to, and the names the siddur's contents use for them. */
const PRAYERS: Array<{ re: RegExp; name: string; label: string }> = [
  { re: /\bHallel\b/, name: "Hallel", label: "Hallel" },
  { re: /Musaf for Rosh [ḤH]odesh/i, name: "Musaf for Rosh Hodesh", label: "Musaf for Rosh Chodesh" },
  { re: /Musaf for (Festivals|Yom Tov)|for [ḤH]ol HaMo.ed on page/i, name: "Musaf for Festivals", label: "Musaf" },
  { re: /Avinu Malkenu/i, name: "Avinu Malkenu", label: "Avinu Malkeinu" },
  { re: /Seli[ḥh]ot/i, name: "Selihot; All Days", label: "Selichot" },
  { re: /Omer is counted/i, name: "Counting of the Omer", label: "Counting the Omer" },
  { re: /Barekhi Nafshi/i, name: "Barekhi Nafshi", label: "Barchi Nafshi" },
];

/** The prayers an instruction names, by the siddur's names for them. */
export function prayerLinks(text: string): Array<{ name: string; label: string }> {
  return PRAYERS.filter((p) => p.re.test(text)).map(({ name, label }) => ({ name, label }));
}

/** A law's number at the start of a line of the Koren siddur's laws ("129 One begins…"). */
export function lawNumbersIn(text: string): Array<{ n: number; suffix: string; at: number }> {
  const out: Array<{ n: number; suffix: string; at: number }> = [];
  for (const m of text.matchAll(/(^|\n)\s*(\d{1,3})([a-z])?\s+(?=[A-Z“"(])/g)) out.push({ n: Number(m[2]), suffix: m[3] ?? "", at: m.index + m[1].length });
  return out;
}
