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
import { HDate, HebrewCalendar, flags, months } from "@hebcal/core";
import { appliesToday, readLine, type SiddurLine } from "../lib/siddur/lines";
import { DEFAULT_CUSTOMS, avinuMalkeinuToday, lamenatzeachToday, mizmorLetodahToday, omerDayOf, planToday, tachanunToday, torahToday } from "../lib/siddur/today";
import { atService, type Service } from "../lib/siddur/festivals";
import { customsFor } from "../lib/siddur/tradition";
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
// AUDIT_SKIP_DAILY=1 skips this pass, to look at the festival passes quickly.
for (const book of process.env.AUDIT_SKIP_DAILY === "1" ? [] : ["The Koren Shalem Siddur; Ashkenaz", "Siddur Ashkenaz", "Siddur Sefard", "Siddur Edot HaMizrach"]) {
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
// 3. The festivals, service by service (2026-11-17, second round): every day of Pesach, Shavuot,
// Sukkot and Shemini Atzeret, with expectations worked out from the Hebrew date alone.
const plainHe = (l: SiddurLine) => l.he.map((p) => p.segs.map((x) => x.text).join("")).join(" ").replace(/[֑-ׇ]/g, "").replace(/[^א-ת ]/g, " ").replace(/\s+/g, " ").trim();
/** Winter phrase at a service, from the date: from Musaf of 22 Tishrei until Musaf of 15 Nisan. */
const winterAt = (hd: HDate, svc: Service) => {
  const m = hd.getMonth(), day = hd.getDate();
  if (m === months.TISHREI && day === 22) return svc === "musaf" || svc === "mincha";
  if (m === months.NISAN && day === 15) return svc === "maariv" || svc === "shacharit";
  const y = hd.getFullYear();
  return hd.abs() > new HDate(22, months.TISHREI, y).abs() && hd.abs() < new HDate(15, months.NISAN, y).abs();
};
/** The Musaf offerings said today, by their Hebrew openings. */
const OFFERINGS: Array<[string, RegExp]> = [
  ["Pesach first days", /^ובחדש הראשון/], ["Pesach other days", /^והקרבתם אשה/], ["Shavuot", /^וביום הבכורים/], ["Sukkot first days", /^ובחמשה עשר יום/],
  ["day 2", /^וביום השני/], ["day 3", /^וביום השלישי/], ["day 4", /^וביום הרביעי/], ["day 5", /^וביום החמישי/], ["day 6", /^וביום הששי/], ["day 7", /^וביום השביעי/], ["Shemini Atzeret", /^ביום השמיני/],
];
const offeringsFor = (hd: HDate, il: boolean): string[] => {
  const m = hd.getMonth(), day = hd.getDate();
  if (m === months.NISAN) return day === 15 || (day === 16 && !il) ? ["Pesach first days"] : ["Pesach other days"];
  if (m === months.SIVAN) return ["Shavuot"];
  if (m === months.TISHREI && day >= 22) return ["Shemini Atzeret"];
  if (day === 15 || (day === 16 && !il)) return ["Sukkot first days"];
  // Chol HaMoed Sukkot: in Israel the day's own offering (16 Tishrei is day 2); outside Israel it and the next.
  return il ? [`day ${day - 14}`] : [`day ${day - 15}`, `day ${day - 14}`];
};
let festivalChecks = 0;
for (const book of ["The Koren Shalem Siddur; Ashkenaz", "Siddur Sefard", "Siddur Edot HaMizrach"]) {
  const file = join(dir, book.replace(/ /g, "_").replace(/;/g, "") + ".json");
  if (!existsSync(file)) continue;
  const data = JSON.parse(readFileSync(file, "utf8")) as Record<string, Array<{ ref: string; he: string; en: string }>>;
  const koren = /koren/i.test(book);
  const sec = (re: RegExp) => {
    const k = Object.keys(data).find((x) => re.test(x));
    if (!k) return null;
    const parts = k.slice(book.length + 2).split(", ");
    return { k, short: parts[parts.length - 1], part: parts[0], lines: data[k].map((l) => readLine(l.ref, l.he.replace(/<[^>]+>/g, ""), l.en.replace(/<[^>]+>/g, ""), koren)) };
  };
  const amidah = sec(/Festivals, Amida for Yom Tov$|Holidays, Maariv, Shacharit & Mincha Amidah$|Three Festivals, Amidah$/);
  const musaf = sec(/Festivals, Musaf for Festivals$|Holidays, Yom Tov Musaf Amidah$|Three Festivals, Mussaf$/);
  if (!amidah || !musaf) { flag(`${book}: no festival Amidah or Musaf found`, "-"); continue; }
  for (const il of [false, true]) for (let hd = START; hd.abs() < END.abs(); hd = hd.next()) {
    const base = dayFacts(hd, il) as any;
    const regalim = base.festival && base.festival !== "rosh-hashana" && base.festival !== "yom-kippur";
    if (!regalim) continue;
    for (const svc of ["maariv", "shacharit", "mincha", "musaf"] as Service[]) {
      const isMusaf = svc === "musaf";
      if (!isMusaf && !base.yomTov) continue;
      // Ma'ariv is said on the night that begins this day.
      const night = svc === "maariv" ? (() => { const dv = daveningDay(hd, il, true); return { ...dv, notes: daveningNotes(dv) }; })() : base;
      const s = isMusaf ? musaf : amidah;
      const customs = customsFor(koren ? "ashkenaz" : /Edot/.test(book) ? "edot" : "sefard");
      const plan = planToday(s.part, s.short, s.lines, night, customs, s.k, svc);
      const label = `${book} ${il ? "IL" : "DIA"} ${hd} ${svc}`;
      const w = (what: string) => flag(`${what} [${s.short}]`, label);
      if (plan.whole) { w("festival service hidden"); continue; }
      festivalChecks++;
      const hidden = new Set<number>();
      for (const f of plan.folds) for (let i = f.from; i < f.to; i++) hidden.add(i);
      const dd = { ...atService(night, svc)!, dewOutsideIsrael: customs.dew };
      const phraseOn = (p: { tag?: { condition?: string } }) => !p.tag?.condition || appliesToday(p.tag.condition as never, dd) !== false;
      const winter = winterAt(hd, svc);
      const dew = !winter && (il || !koren);
      const seen: Record<string, number> = {};
      let names = 0, mashiv = 0, tal = 0, vatodienu = 0, simShalom = 0, shalomRav = 0;
      s.lines.forEach((line, i) => {
        if (hidden.has(i)) return;
        const he = plainHe(line);
        for (const [name, re] of OFFERINGS) if (re.test(he)) seen[name] = (seen[name] ?? 0) + 1;
        for (const p of [...line.he]) {
          const c = p.tag?.condition;
          if ((c === "pesach" || c === "shavuot" || c === "sukkot" || c === "sheminiAtzeret") && phraseOn(p)) names++;
          const t = p.segs.map((x) => x.text).join("").replace(/[֑-ׇ]/g, "");
          if (/משיב הרוח ומוריד הגשם/.test(t) && phraseOn(p)) mashiv++;
          if (/^\s*מוריד הטל/.test(t) && phraseOn(p)) tal++;
        }
        if (/^ותודיענו/.test(he)) vatodienu++;
        if (koren && /^שים שלום/.test(he)) simShalom++;
        if (koren && /^שלום רב/.test(he)) shalomRav++;
      });
      saw("Festival service lines", true);
      if (mashiv !== (winter ? 1 : 0)) w(`"He makes the wind blow" shown ${mashiv} times (expected ${winter ? 1 : 0})`);
      if (tal !== (dew ? 1 : 0)) w(`"He causes the dew to fall" shown ${tal} times (expected ${dew ? 1 : 0})`);
      if (!isMusaf) {
        if (vatodienu !== (svc === "maariv" && hd.getDay() === 0 ? 1 : 0)) w(`Vatodienu shown ${vatodienu} times`);
        const sim = svc === "shacharit" || (il && hd.getDay() === 6 && svc === "mincha");
        if (koren && (simShalom !== (sim ? 1 : 0) || shalomRav !== (sim ? 0 : 1))) w("Sim Shalom / Shalom Rav");
      }
      // The festival's name: once in "You have given us" and once in Ya'aleh VeYavo (twice in Musaf's "the additional offering of" too).
      if (names < 2 || names % 2 !== 0 && !isMusaf) w(`festival names shown ${names}`);
      if (isMusaf && !/Edot/.test(book)) {
        const want = offeringsFor(hd, il);
        const got = OFFERINGS.map(([n]) => n).filter((n) => seen[n]);
        if (want.join("|") !== got.join("|")) w(`Musaf offerings ${got.join("+") || "none"}, expected ${want.join("+")}`);
      }
    }
  }
}
// The festival prayers said on one day only (Koren), from the Hebrew date alone.
if (existsSync(join(dir, "The_Koren_Shalem_Siddur_Ashkenaz.json"))) {
  const book = "The Koren Shalem Siddur; Ashkenaz";
  const data = JSON.parse(readFileSync(join(dir, "The_Koren_Shalem_Siddur_Ashkenaz.json"), "utf8")) as Record<string, Array<{ ref: string; he: string; en: string }>>;
  const ONE_DAY: Array<[string, (hd: HDate, il: boolean) => boolean]> = [
    ["Yizkor", (hd, il) => (hd.getMonth() === months.NISAN && hd.getDate() === (il ? 21 : 22)) || (hd.getMonth() === months.SIVAN && hd.getDate() === (il ? 6 : 7)) || (hd.getMonth() === months.TISHREI && (hd.getDate() === 10 || hd.getDate() === 22))],
    ["Prayer for Dew", (hd) => hd.getMonth() === months.NISAN && hd.getDate() === 15],
    ["Prayer for Rain", (hd) => hd.getMonth() === months.TISHREI && hd.getDate() === 22],
    ["Akdamut", (hd) => hd.getMonth() === months.SIVAN && hd.getDate() === 6],
    ["Hakafot for Simhat Torah", (hd, il) => hd.getMonth() === months.TISHREI && hd.getDate() === (il ? 22 : 23)],
    ["Blessing on Taking the Lulav", (hd) => hd.getMonth() === months.TISHREI && hd.getDate() >= 15 && hd.getDate() <= 21 && hd.getDay() !== 6],
    ["Hoshanot", (hd) => hd.getMonth() === months.TISHREI && hd.getDate() >= 15 && hd.getDate() <= 20 && hd.getDay() !== 6],
    ["Hoshanot for Shabbat Hol HaMo'ed", (hd) => hd.getMonth() === months.TISHREI && hd.getDate() >= 15 && hd.getDate() <= 21 && hd.getDay() === 6],
    ["Hoshanot for Hoshana Raba", (hd) => hd.getMonth() === months.TISHREI && hd.getDate() === 21],
  ];
  for (const il of [false, true]) for (let hd = START; hd.abs() < END.abs(); hd = hd.next()) {
    const d = dayFacts(hd, il) as any;
    for (const [name, want] of ONE_DAY) {
      const k = `${book}, Festivals, ${name}`;
      if (!data[k]) { flag(`No section ${name}`, "-"); continue; }
      const plan = planToday("Festivals", name, [], d, DEFAULT_CUSTOMS, k);
      if (saw("One-day festival prayers", true) && !plan.whole !== want(hd, il)) flag(`${name} ${plan.whole ? "hidden" : "shown"} wrongly`, `${il ? "IL" : "DIA"} ${hd}`);
    }
    // Musaf's Kedusha: "We will revere" on Yom Tov, Shabbat and Hoshana Raba; "We will sanctify" on Chol HaMoed.
    if (d.cholHamoed || (d.yomTov && d.festival !== "rosh-hashana" && d.festival !== "yom-kippur")) {
      const k = `${book}, Festivals, Musaf for Festivals`;
      const lines = data[k].map((l) => readLine(l.ref, l.he.replace(/<[^>]+>/g, ""), l.en.replace(/<[^>]+>/g, ""), true));
      const plan = planToday("Festivals", "Musaf for Festivals", lines, d, DEFAULT_CUSTOMS, k, "musaf");
      const hidden = new Set<number>();
      for (const f of plan.folds) for (let i = f.from; i < f.to; i++) hidden.add(i);
      const shown = (re: RegExp) => lines.some((l, i) => !hidden.has(i) && re.test(plainHe(l)));
      const festive = d.yomTov || d.dow === 6 || d.hoshanaRaba;
      if (saw("Musaf Kedusha", true) && (shown(/^נעריצך/) !== festive || shown(/^נקדש את שמך/) === festive)) flag("Musaf Kedusha", `${il ? "IL" : "DIA"} ${hd}`);
    }
  }
}
saw("Festival days", festivalChecks > 0);
console.log(`Checked ${festivalChecks} festival services (Pesach, Shavuot, Sukkot, Shemini Atzeret; each service).`);

// 4. Ma'ariv belongs to the night: an early Ma'ariv before sunset uses tonight's day; and Vihi No'am.
const korenFile = join(dir, "The_Koren_Shalem_Siddur_Ashkenaz.json");
if (existsSync(korenFile)) {
  const data = JSON.parse(readFileSync(korenFile, "utf8")) as Record<string, Array<{ ref: string; he: string; en: string }>>;
  const lines = (k: string) => data[k].map((l) => readLine(l.ref, l.he.replace(/<[^>]+>/g, ""), l.en.replace(/<[^>]+>/g, ""), true));
  const maarivK = "The Koren Shalem Siddur; Ashkenaz, Weekdays, Ma'ariv for Weekdays";
  const motzK = "The Koren Shalem Siddur; Ashkenaz, Shabbat, Ma'ariv for Motza'ei Shabbat";
  const maariv = data[maarivK] ? lines(maarivK) : [];
  const motz = data[motzK] ? lines(motzK) : [];
  for (const il of [false, true]) for (let hd = START; hd.abs() < END.abs(); hd = hd.next()) {
    // Tonight's day, as the app gives it before sunset (DaySummary.daveningTonight).
    const tonight = (() => { const dv = daveningDay(hd.next(), il, true); return { ...dv, notes: daveningNotes(dv) }; })();
    if (tonight.yomTov || tonight.dow === 6) continue;
    const label = `${il ? "IL" : "DIA"} night of ${hd.next()}`;
    const plan = planToday("Weekdays", "Ma'ariv for Weekdays", maariv, tonight, DEFAULT_CUSTOMS, maarivK, "maariv");
    const hidden = new Set<number>();
    for (const f of plan.folds) for (let i = f.from; i < f.to; i++) hidden.add(i);
    let yv = 0;
    maariv.forEach((l, i) => { if (!hidden.has(i) && /may there rise, come, reach/i.test(textOf(l))) yv++; });
    const want = tonight.roshChodesh || tonight.cholHamoed;
    if (saw("Early Ma'ariv (tonight's day)", true) && (yv > 0) !== want) flag(`Ma'ariv before sunset: Ya'aleh VeYavo ${yv ? "shown" : "hidden"} wrongly`, label);
    // Vihi No'am on Motza'ei Shabbat (Saturday afternoon's Ma'ariv is the night of Sunday).
    if (hd.getDay() === 6 && motz.length) {
      const sunday = hd.next();
      const ytWeek = [0, 1, 2, 3, 4, 5].some((k) => (HebrewCalendar.getHolidaysOnDate(new HDate(sunday.abs() + k), il) ?? []).some((e) => (e.getFlags() & flags.CHAG) !== 0));
      for (const nusach of ["ashkenaz", "edot"] as const) {
        const p = planToday("Shabbat", "Ma'ariv for Motza'ei Shabbat", motz, tonight, customsFor(nusach), motzK, "maariv");
        const hid = new Set<number>();
        for (const f of p.folds) for (let i = f.from; i < f.to; i++) hid.add(i);
        const shown = motz.some((l, i) => !hid.has(i) && /^ויהי נעם/.test(plainHe(l)));
        const wantVn = !tonight.tishaBav && (nusach === "edot" || !ytWeek);
        if (saw("Vihi No'am", true) && shown !== wantVn) flag(`Vihi No'am (${nusach}) ${shown ? "shown" : "hidden"} wrongly`, label);
      }
    }
  }
}

console.log(`Checked ${checkedDays} siddur-days (two years, outside Israel and in Israel).`);
for (const [what, n] of looked) console.log(`  ${what}: ${n} line-days looked at`);
for (const what of ["One-day festival prayers", "Musaf Kedusha", "Festival service lines", "Festival days", "Early Ma'ariv (tonight's day)", "Vihi No'am", "Ya'aleh VeYavo", "Al HaNissim (Chanukah)", "Al HaNissim (Purim)", "Aneinu", "Ten Days lines", "Lamenatzeach", "Mizmor LeToda", "Retzei (bentching)", "Av HaRachamim", "Atah Yatzarta", "LeDavid"])
  if (!looked.get(what)) flag(`The check "${what}" found no line to look at`, "-");
if (!problems.size) console.log("No problems found.");
for (const [k, v] of problems) console.log(`PROBLEM ${k} (${v.length}) e.g. ${v.slice(0, 3).join(" | ")}`);
process.exit(problems.size ? 1 : 0);
