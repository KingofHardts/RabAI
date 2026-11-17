/*
 * The davening calendar audit (docs/davening-calendar-audit.md): every weekday and Shabbat of two
 * Hebrew years, outside Israel and in Israel, through "today's davening" for the Koren siddur and
 * Sefaria's Siddur Ashkenaz, Sefard and Edot HaMizrach, checked against expectations coded apart
 * from the engine. Also compares the Tachanun list with Hebcal's and names each kind of difference.
 *
 *   npx tsx scripts/audit-davening.ts <folder>   (the files tools/davening_dump.py writes)
 *
 * Prints only section names, line numbers, dates and counts: never a line of the siddurs' text
 * (the "Check today's davening" workflow's log is public). Exits 1 when anything is wrong.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { HDate, HebrewCalendar, months } from "@hebcal/core";
import { appliesToday, readLine, type SiddurLine } from "../lib/siddur/lines";
import { DEFAULT_CUSTOMS, avinuMalkeinuToday, lamenatzeachToday, mizmorLetodahToday, omerDayOf, planToday, tachanunToday, torahToday } from "../lib/siddur/today";
import { daveningDay, daveningNotes } from "../lib/calendar/davening";
import { korenTachanun } from "../lib/calendar/tachanun";

const dir = process.argv[2] ?? "davening-dump";
const problems = new Map<string, string[]>();
const flag = (what: string, day: string) => problems.set(what, [...(problems.get(what) ?? []), day]);
/** How many lines each check looked at: a check that never matches anything checks nothing. */
const looked = new Map<string, number>();
const saw = (what: string, yes: boolean) => { if (yes) looked.set(what, (looked.get(what) ?? 0) + 1); return yes; };
const START = new HDate(1, months.TISHREI, 5787);
const END = new HDate(1, months.TISHREI, 5789);
const dayFacts = (hd: HDate, il: boolean) => { const dv = daveningDay(hd, il); return { ...dv, notes: daveningNotes(dv) }; };

// 1. Tachanun: Koren's list against Hebcal. Each kind of difference was checked against the sources.
const EXPECTED = /Pesach Sheni|Purim Katan|Yom HaAtzma|Yom Yerushalayim|the days around Shavuot|the days of Sukkot|^$/;
for (const il of [false, true]) for (let hd = START; hd.abs() < END.abs(); hd = hd.next()) {
  if (hd.getDay() === 6) continue;
  const k = korenTachanun(hd, il), h = HebrewCalendar.tachanun(hd, il);
  for (const [svc, a, b] of [["shacharit", k.shacharit && !k.modern.shacharit, h.shacharit], ["mincha", k.mincha && !k.modern.mincha, h.mincha]] as const)
    if (a !== b && !EXPECTED.test(k.why ?? "")) flag(`Tachanun (${svc}) differs from Hebcal for a reason not yet checked: ${k.why}`, `${il ? "IL" : "DIA"} ${hd}`);
}

// 2. The siddurim, day by day.
const plain = (s: string) => s.replace(/<[^>]+>/g, "").replace(/[֑-ׇ]/g, "").replace(/\s+/g, " ").trim();
const textOf = (l: SiddurLine) => l.kind === "heading" ? l.heading!.en : l.kind === "instruction" ? l.instruction! : l.en.map((p) => (p.tag ? p.tag.text + ": " : "") + p.segs.map((s) => s.text).join("")).join(" ");
let checkedDays = 0;
for (const book of ["The Koren Shalem Siddur; Ashkenaz", "Siddur Ashkenaz", "Siddur Sefard", "Siddur Edot HaMizrach"]) {
  const file = join(dir, book.replace(/ /g, "_").replace(/;/g, "") + ".json");
  if (!existsSync(file)) { flag(`No copy of ${book} to check`, "-"); continue; }
  const data = JSON.parse(readFileSync(file, "utf8")) as Record<string, Array<{ ref: string; he: string; en: string }>>;
  const koren = /koren/i.test(book);
  const secs = Object.entries(data).map(([k, raw]) => {
    const parts = k.slice(book.length + 2).split(", ");
    return { k, name: k.slice(book.length + 2), short: parts[parts.length - 1], part: parts[0], lines: raw.map((l) => ({ line: readLine(l.ref, l.he.replace(/<[^>]+>/g, ""), l.en.replace(/<[^>]+>/g, ""), koren), he: plain(l.he) })) };
  });
  const daily = secs.filter((s) => (koren ? /^Weekdays, |^Giving Thanks, Birkat HaMazon|^Festivals, Hallel$/ : /Weekday|Counting of the Omer|Birkat HaMazon|Grace/i).test(s.name));
  const shabbat = koren ? secs.filter((s) => /^Shabbat, |^Giving Thanks, Birkat HaMazon/.test(s.name)) : [];
  for (const il of [false, true]) for (let hd = START; hd.abs() < END.abs(); hd = hd.next()) {
    const d = dayFacts(hd, il) as any;
    if (d.yomTov) continue;
    const isShabbat = d.dow === 6;
    const label = `${book} ${il ? "IL" : "DIA"} ${hd}`;
    let psalms = 0, omer = 0, alNaharot = false, shirHamaalot = false;
    checkedDays++;
    for (const s of isShabbat ? shabbat : daily) {
      const plan = planToday(s.part, s.short, s.lines.map((x) => x.line), d, DEFAULT_CUSTOMS, s.k);
      const svc = /min[ḥc]?ha/i.test(s.k) ? "mincha" : /maariv|ma'ariv|arvit/i.test(s.k) ? "maariv" : "shacharit";
      const w = (what: string) => flag(`${what} [${s.name}]`, label);
      if (!isShabbat && /(^|, )ta(ḥ|ch|h)anun(,|$)/i.test(s.k) && !/ma'?ariv/i.test(s.k) && !!plan.whole === tachanunToday(d, DEFAULT_CUSTOMS, svc as "shacharit")) w(`Tachanun ${plan.whole ? "hidden" : "shown"} wrongly`);
      if (koren && s.short === "Avinu Malkenu" && !plan.whole !== avinuMalkeinuToday(d, DEFAULT_CUSTOMS, "shacharit")) w("Avinu Malkenu");
      if (koren && s.short === "Reading of the Torah" && !plan.whole !== (torahToday(d) || isShabbat)) w("Torah reading");
      if (koren && s.short === "Hallel" && !plan.whole !== d.hallel > 0) w("Hallel");
      if (s.short === "Blessing the New Month" && !plan.whole !== d.mevarchim) w("Blessing the New Month");
      if (/^Ethics of the Fathers \d$/.test(s.short) && !plan.whole !== (d.pirkeiAvot ?? []).includes(Number(s.short.slice(-1)))) w("Pirkei Avot chapter");
      if (s.short === "Barekhi Nafshi" && /Shabbat/.test(s.part) && !plan.whole !== d.barchiNafshi) w("Barekhi Nafshi");
      if (plan.whole) continue;
      const hidden = new Set<number>();
      for (const f of plan.folds) for (let i = f.from; i < f.to; i++) hidden.add(i);
      s.lines.forEach(({ line, he }, i) => {
        const off = (ps: typeof line.en) => ps.length > 0 && ps.every((p) => p.tag?.condition && appliesToday(p.tag.condition, d) === false);
        const vis = !hidden.has(i) && !off(line.en) && !(line.en.length === 0 && off(line.he));
        // Koren's English often opens with the Hebrew word it translates; checks read past it.
        const t = textOf(line).replace(/^[^A-Za-z]+/, "");
        const at = (what: string) => w(`${what} (line ${i + 1})`);
        const bentch = /Birkat HaMazon|Grace/.test(s.k);
        // By the English (Koren) or the Hebrew opening (all).
        const yaaleh = /may there rise, come, reach/i.test(t) || /^(אלהינו ואלהי אבותינו )?יעלה ויבא/.test(he.replace(/[^א-ת ]/g, ""));
        if (saw("Ya'aleh VeYavo", yaaleh) && vis !== (d.roshChodesh || d.cholHamoed || (bentch && d.yomTov))) at(`Ya'aleh VeYavo ${vis ? "shown" : "hidden"} wrongly`);
        if (saw("Al HaNissim (Chanukah)", /^On .anukk?a:/i.test(t) || /In the days of Mattityahu/.test(t)) && vis !== d.chanukah) at(`Al HaNissim (Chanukah) ${vis ? "shown" : "hidden"} wrongly`);
        if (saw("Al HaNissim (Purim)", /^On Purim:/i.test(t) || /In the days of Mordekhai and Esther/.test(t)) && vis !== d.purim) at(`Al HaNissim (Purim) ${vis ? "shown" : "hidden"} wrongly`);
        if (!koren && /^על הנסים/.test(he) && vis && !(d.chanukah || d.purim)) at("Al HaNissim shown on an ordinary day");
        if (saw("Aneinu", /Answer us, Lord, answer us on our Fast Day/i.test(t) || /^עננו .{0,12}עננו ביום צום/.test(he.replace(/[^א-ת ]/g, ""))) && vis !== d.fast) at(`Aneinu ${vis ? "shown" : "hidden"} wrongly`);
        if (saw("Ten Days lines", /^Between Rosh HaShana (and|&) Yom Kippur: /i.test(t)) && vis !== d.tenDays) at("Ten Days line");
        if (koren && s.short === "Conclusion of the Service" && saw("Lamenatzeach", /A psalm of David. May the LORD answer you when you are in distress/.test(t)) && vis !== lamenatzeachToday(d, DEFAULT_CUSTOMS)) at("Lamenatzeach");
        if (koren && saw("Mizmor LeToda", /A psalm of thanksgiving/i.test(t) && line.kind === "prayer") && vis !== mizmorLetodahToday(d)) at("Mizmor LeToda");
        if (/^(Today is the (first|second|third|fourth|fifth|sixth) day|.{0,12}Today is the (first|second|third|fourth|fifth|sixth) day of the week)/i.test(t.replace(/^\w+day: /, "").replace(/^[^A-Za-z]+/, "")) && vis && !isShabbat && koren) psalms++;
        if (!koren && /^(היום יום (ראשון|שני|שלישי|רביעי|חמישי|ששי) בשבת|מזמור ליום (ראשון|שני|שלישי|רביעי|חמישי|ששי))/.test(he) && vis) psalms++;
        if (/omer/i.test(s.k) && omerDayOf(line) !== null && vis) omer++;
        if (/By the rivers of Babylon/.test(t) && vis) alNaharot = true;
        if (/When the LORD brought back the exiles of Zion/.test(t) && bentch && vis) shirHamaalot = true;
        if (saw("Retzei (bentching)", /^Favor and strengthen us, LORD our God, through Your commandments/.test(t) && bentch) && vis !== isShabbat) at("Retzei");
        if (saw("Av HaRachamim", /Father of compassion, who dwells on high/.test(t)) && vis !== d.avHarachamim) at("Av HaRachamim");
        if (saw("Atah Yatzarta", /Long ago You formed Your world/.test(t)) && vis !== (isShabbat && d.roshChodesh)) at("Atah Yatzarta");
        if (saw("LeDavid", /The LORD is my light and my salvation/.test(t)) && vis !== d.ledavid) at("LeDavid");
      });
    }
    if (!isShabbat && psalms !== 1) flag(`${book}: daily psalm shown ${psalms} times`, label);
    if (!isShabbat && omer !== (d.omerTonight ? 1 : 0)) flag(`${book}: Omer counts shown ${omer}`, label);
    if (koren && !isShabbat && alNaharot === shirHamaalot) flag(`${book}: bentching's opening psalm`, label);
  }
}
console.log(`Checked ${checkedDays} siddur-days (two years, outside Israel and in Israel).`);
for (const [what, n] of looked) console.log(`  ${what}: ${n} line-days looked at`);
for (const what of ["Ya'aleh VeYavo", "Al HaNissim (Chanukah)", "Al HaNissim (Purim)", "Aneinu", "Ten Days lines", "Lamenatzeach", "Mizmor LeToda", "Retzei (bentching)", "Av HaRachamim", "Atah Yatzarta", "LeDavid"])
  if (!looked.get(what)) flag(`The check "${what}" found no line to look at`, "-");
if (!problems.size) console.log("No problems found.");
for (const [k, v] of problems) console.log(`PROBLEM ${k} (${v.length}) e.g. ${v.slice(0, 3).join(" | ")}`);
process.exit(problems.size ? 1 : 0);
