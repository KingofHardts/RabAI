/*
 * The suggested questions on a new chat. A few come from the day (this week's parsha, today's
 * daf, a fast, a holiday, Shabbat coming), and the rest are drawn fresh each time from a larger
 * set, so the screen isn't the same four questions every visit. Safe on the device.
 */

import type { DaySummary } from "./calendar/place";

export interface Starter {
  /** What the button says. */
  label: string;
  /** What is asked when it is pressed (the label, unless more is needed). */
  ask: string;
}

export interface StarterGroup {
  label: string;
  items: Starter[];
}

const q = (label: string, ask = label): Starter => ({ label, ask });

/** Questions about Torah, drawn three at a time. */
export const TORAH_STARTERS: Starter[] = [
  q("Why does the Torah start with Creation?"),
  q("What did Hillel say about the whole Torah on one foot?"),
  q("Help me read the first words of the Torah"),
  q("Why do we say Modeh Ani as soon as we wake up?"),
  q("What is the difference between the Mishnah and the Gemara?"),
  q("Who was Rashi, and why does everyone learn him?"),
  q("What does it mean to love your neighbor as yourself?"),
  q("Why are there two versions of the Ten Commandments?"),
  q("What are the Rambam's thirteen principles of faith?"),
  q("How does an argument in the Gemara work? Show me a short one."),
  q("What is lashon hara, and why is it so serious?"),
  q("What does the Shema actually say?"),
  q("Why did Avraham plead with HaShem for Sedom?"),
  q("What does honoring parents mean in halacha?"),
  q("How did the Torah come down from Moshe to us?"),
  q("What is teshuvah, according to the Rambam?"),
  q("What can we learn from Chana's prayer?"),
  q("Why is Shabbat called a sign between HaShem and Israel?"),
  q("What is the yetzer hara, and how do the sages say to face it?"),
  q("How did Rabbi Akiva begin learning at forty?"),
  q("What does Pirkei Avot say about finding a friend to learn with?"),
  q("Which bracha do I make on food with several ingredients?"),
  q("What does “na'aseh v'nishma” teach us?"),
  q("Why did Yosef cry when he saw his brothers?"),
  q("What is bitachon, trust in HaShem, in Chovot HaLevavot?"),
  q("Why is the Amidah in the order it is?"),
  q("Why do we wash our hands before eating bread?"),
  q("Help me understand a mishnah, word by word"),
  q("What is the story of the oven of Achnai?"),
  q("Why is the world built on kindness?"),
  q("What do tzitzit remind us of?"),
  q("How much tzedakah should a person give?"),
  q("Why are there two challot on Shabbat?"),
  q("What does Mesillat Yesharim say is the first step to growth?"),
  q("What is a machloket l'shem shamayim?"),
  q("Why do we stand for the Torah?"),
];

/** Talking about life, drawn two at a time. */
export const LIFE_STARTERS: Starter[] = [
  q("I had a hard day. Can we talk?"),
  q("My friend and I had a falling out. How do I make it right?"),
  q("How can I find more joy in davening?"),
  q("I want to learn more, but I can't find the time. Where do I start?"),
  q("I'm worried about something. What does the Torah say about worry?"),
  q("How do I stay patient with my children?"),
  q("I lost my temper today. What now?"),
  q("How can I be more grateful each day?"),
  q("I feel far from HaShem lately."),
  q("How do I tell someone a hard truth kindly?"),
  q("Help me make a plan to learn a little every day"),
];

/** A shuffled copy, with a source of randomness that tests can fix. */
function shuffled<T>(items: T[], rand: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Days from today to a date, both YYYY-MM-DD. */
function daysUntil(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86400000);
}

/** The questions that belong to today. */
export function dayStarters(day: DaySummary | null, today: string, weekday: number): Starter[] {
  if (!day) return [];
  const out: Starter[] = [];
  const is = (re: RegExp) => day.todayIs.some((t) => re.test(t));

  // What today is comes first: a fast, Chanukah, Rosh Chodesh, a holiday, the Omer.
  const fastToday = day.todayIs.find((t) => /^(?:Tzom|Ta['’]anit|Asara|Tish['’]a|Yom Kippur)/.test(t));
  if (fastToday) out.push(q(`When does ${fastToday} end today?`, `When does the fast of ${fastToday} end today, where I am?`));
  else if (is(/^Chanukah/)) out.push(q("How many Chanukah lights tonight, and which brachot?"));
  else if (is(/^Rosh Chodesh/)) out.push(q("What do we add to davening on Rosh Chodesh?"));
  else if (is(/Omer/)) out.push(q("What is tonight's count of the Omer?"));

  // Then what is coming soon: a fast tomorrow, or a holiday within the next ten days.
  const next = day.coming[0];
  if (out.length === 0 && next) {
    const days = daysUntil(today, next.date);
    if (next.kind === "fast" && days <= 2) out.push(q(`When does ${next.title} begin and end?`, `When does the fast of ${next.title} (${next.day}) begin and end, where I am?`));
    else if ((next.kind === "holiday" || next.kind === "chanukah") && days <= 10)
      out.push(q(`How do we get ready for ${next.title.replace(/^Erev /, "")}?`, `${next.title} is ${next.day}. How do we get ready for it?`));
  }

  // This week's parsha, and from Wednesday on, when Shabbat comes in.
  if (day.parsha && !day.parsha.holiday) {
    out.push(q(`A short dvar Torah on Parashat ${day.parsha.name}`, `Give me a short dvar Torah on this week's parsha, Parashat ${day.parsha.name}.`));
  }
  if (weekday >= 3 && weekday <= 5) out.push(q("When is candle lighting this Friday?", "When is candle lighting this Friday, and when does Shabbat end, where I am?"));

  if (day.daf) {
    const ref = day.daf.ref ?? day.daf.text;
    out.push(q(`Learn today's daf with me: ${day.daf.text}`, `Let's learn today's Daf Yomi together, ${ref}. Start me at the beginning and go step by step.`));
  }
  return out.slice(0, 3);
}

/** Everyday halacha, drawn four at a time. Each answer comes with the note to ask one's rav. */
export const HALACHA_STARTERS: Starter[] = [
  q("How long do we wait between meat and milk?"),
  q("What do I do if I forgot Ya'aleh VeYavo?"),
  q("When is the latest time for the morning Shema today?", "When is the latest time for the morning Shema today, where I am?"),
  q("Which bracha comes first when I have several foods?"),
  q("What are the 39 kinds of work on Shabbat?"),
  q("May I set a timer for the lights before Shabbat?"),
  q("How do I make Havdalah?"),
  q("What if I missed a night of counting the Omer?"),
  q("How is a pot kashered?"),
  q("What are the laws of washing hands for bread?"),
  q("When may I daven Mincha today?", "From when and until when may I daven Mincha today, where I am?"),
  q("What makes a mezuzah kosher, and where does it go?"),
  q("What do I say after eating fruit or cake?"),
  q("How do I light Shabbat candles when I am away from home?"),
];

/**
 * The groups of suggested questions for a new chat: today's, then four each about Torah, everyday
 * halacha and life, drawn fresh each time. The welcome shows one group at a time.
 */
export function pickStarters(day: DaySummary | null, opts: { rand?: () => number; now?: Date } = {}): StarterGroup[] {
  const rand = opts.rand ?? Math.random;
  const now = opts.now ?? new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const forToday = dayStarters(day, today, now.getDay());
  const torah = shuffled(TORAH_STARTERS, rand)
    .filter((s) => !forToday.some((t) => t.label === s.label))
    .slice(0, 4);
  const groups: StarterGroup[] = [];
  if (forToday.length) groups.push({ label: "For this week", items: forToday });
  groups.push({ label: "Ask about Torah", items: torah });
  groups.push({ label: "Halacha", items: shuffled(HALACHA_STARTERS, rand).slice(0, 4) });
  groups.push({ label: "Talk about life", items: shuffled(LIFE_STARTERS, rand).slice(0, 4) });
  return groups;
}
