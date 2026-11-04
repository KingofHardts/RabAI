/*
 * How RabbAI's voice should say Hebrew and Aramaic words written in English letters, and the names
 * of rabbis and books. Speech voices are trained mostly on English, so "Chazal" comes out with the
 * "ch" of "chair" and "Hashem" as "hash 'em". Each entry gives the spellings found in answers and a
 * spelling the voice reads correctly: "kh" for the throaty ch (as in "Bach"), hyphens between syllables.
 *
 * This is pronunciation only, not Torah content. Add a word when a voice says it wrong; keep "say"
 * in plain letters a voice can read.
 */

export interface SayAs {
  /** The ways the word is written in English text (any capitalization). */
  written: string[];
  /** How to spell it for the voice. */
  say: string;
  /** Match only as written, capital and all: "Ran" the Rishon, not "he ran". */
  exact?: boolean;
}

export const SAY_AS: SayAs[] = [
  // The Name and common words
  { written: ["Hashem"], say: "Ha-Shem" },
  { written: ["Chazal"], say: "Kha-zal" },
  { written: ["halacha", "halachah", "halakha", "halakhah"], say: "ha-la-kha" },
  { written: ["halachic", "halakhic"], say: "ha-la-khic" },
  { written: ["halachos", "halachot", "halakhot"], say: "ha-la-khote" },
  { written: ["chesed"], say: "kheh-sed" },
  { written: ["chacham"], say: "kha-khahm" },
  { written: ["chachamim", "chakhamim"], say: "kha-kha-meem" },
  { written: ["chavrusa", "chavruta", "chavrutah"], say: "khahv-roo-tah" },
  { written: ["Chumash"], say: "Khoo-mahsh" },
  { written: ["Tanach", "Tanakh"], say: "Tah-nakh" },
  { written: ["Gemara", "Gemoro"], say: "Geh-mah-rah" },
  { written: ["Mishnah", "Mishna"], say: "Mish-nah" },
  { written: ["Bavli"], say: "Bahv-lee" },
  { written: ["Yerushalmi"], say: "Yeh-roo-shahl-mee" },
  { written: ["daf"], say: "dahf" },
  { written: ["amud"], say: "ah-mood" },
  { written: ["sefer"], say: "seh-fer" },
  { written: ["sefarim", "seforim"], say: "seh-fah-reem" },
  { written: ["mitzvah"], say: "mitz-vah" },
  { written: ["mitzvot", "mitzvos"], say: "mitz-vote" },
  { written: ["bracha", "brachah", "beracha", "berachah", "berakhah"], say: "brah-khah" },
  { written: ["brachot", "berachot", "berakhot", "brachos", "berachos"], say: "brah-khote" },
  { written: ["tefillah", "tefilla"], say: "teh-fee-lah" },
  { written: ["tefillin"], say: "teh-fee-leen" },
  { written: ["teshuvah", "teshuva"], say: "teh-shoo-vah" },
  { written: ["kavanah", "kavana", "kavannah"], say: "kah-vah-nah" },
  { written: ["Shema", "Shma"], say: "Sh'mah" },
  { written: ["Amidah"], say: "Ah-mee-dah" },
  { written: ["Kaddish"], say: "Kah-dish" },
  { written: ["Kiddushin"], say: "Kee-doo-sheen" },
  { written: ["Shabbat"], say: "Shah-baht" },
  { written: ["Pesach"], say: "Peh-sakh" },
  { written: ["Chanukah", "Chanukkah", "Hanukkah", "Hanukah"], say: "Kha-noo-kah" },
  { written: ["Sukkot"], say: "Soo-kote" },
  { written: ["Shavuot"], say: "Shah-voo-ote" },
  { written: ["Yom Kippur"], say: "Yome Kee-poor" },
  { written: ["Rosh Hashanah", "Rosh HaShanah", "Rosh Hashana"], say: "Rosh Ha-shah-nah" },
  { written: ["Rishonim"], say: "Ree-sho-neem" },
  { written: ["Acharonim", "Achronim", "Aharonim"], say: "Akh-ah-ro-neem" },
  { written: ["Tannaim"], say: "Tah-nah-eem" },
  { written: ["Amoraim"], say: "Ah-mo-rah-eem" },
  { written: ["Zohar"], say: "Zo-har" },

  // Rishonim, Acharonim and their books
  { written: ["Rashi"], say: "Rah-shee" },
  { written: ["Tosafot"], say: "Toe-sah-fote" },
  { written: ["Tosfos", "Tosafos"], say: "Toss-fos" },
  { written: ["Rambam"], say: "Rahm-bahm" },
  { written: ["Ramban"], say: "Rahm-bahn" },
  { written: ["Rashba"], say: "Rahsh-bah" },
  { written: ["Ritva"], say: "Reet-vah" },
  { written: ["Rif"], say: "Reef", exact: true },
  { written: ["Ran"], say: "Rahn", exact: true },
  { written: ["Rabbeinu", "Rabenu", "Rabbenu"], say: "Rah-bay-noo" },
  { written: ["Maharsha"], say: "Ma-har-shah" },
  { written: ["Maharal"], say: "Ma-ha-rahl" },
  { written: ["Shulchan Aruch", "Shulchan Arukh", "Shulhan Arukh"], say: "Shool-khahn Ah-rookh" },
  { written: ["Mechaber", "Mehaber"], say: "Meh-khah-ber" },
  { written: ["Rema", "Rama"], say: "Reh-mah", exact: true },
  { written: ["Shach"], say: "Shakh", exact: true },
  { written: ["Taz"], say: "Tahz", exact: true },
  { written: ["Mishnah Berurah", "Mishna Berura", "Mishnah Berura"], say: "Mish-nah Beh-roo-rah" },
  { written: ["Chofetz Chaim", "Chafetz Chaim", "Chafetz Chayim"], say: "Kho-fetz Khah-yeem" },
  { written: ["Chazon Ish"], say: "Kha-zone Eesh" },
  { written: ["Chasam Sofer", "Chatam Sofer"], say: "Khah-sahm So-fer" },
  { written: ["Tur"], say: "Toor", exact: true },
  { written: ["Beit Yosef", "Beis Yosef"], say: "Bait Yo-sef" },

  // Sages and people of the Torah
  { written: ["Abaye"], say: "Ah-bah-yeh" },
  { written: ["Rava"], say: "Rah-vah" },
  { written: ["Rabba"], say: "Rah-bah" },
  { written: ["Rav"], say: "Rahv" },
  { written: ["Shmuel"], say: "Shmoo-el" },
  { written: ["Yochanan"], say: "Yo-khah-nahn" },
  { written: ["Reish Lakish"], say: "Raysh Lah-keesh" },
  { written: ["Shammai"], say: "Shah-my" },
  { written: ["Akiva"], say: "Ah-kee-vah" },
  { written: ["Meir"], say: "May-eer", exact: true },
  { written: ["Moshe"], say: "Mo-sheh" },
  { written: ["Moshe Rabbeinu"], say: "Mo-sheh Rah-bay-noo" },
  { written: ["Yaakov", "Ya'akov"], say: "Yah-ah-kove" },
  { written: ["Yitzchak", "Yitzhak"], say: "Yitz-khahk" },
  { written: ["Avraham"], say: "Ahv-rah-hahm" },
  { written: ["Yehudah", "Yehuda"], say: "Yeh-hoo-dah" },
  { written: ["Yosef"], say: "Yo-sef" },
  { written: ["Eliyahu"], say: "Eh-lee-yah-hoo" },
  { written: ["Chava"], say: "Khah-vah" },
  { written: ["Rivka", "Rivkah"], say: "Reev-kah" },
];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const ENTRIES = SAY_AS.flatMap((e) => e.written.map((w) => ({ w, say: e.say, exact: !!e.exact })));
const BY_SPELLING = new Map<string, { say: string; written: string; exact: boolean }>();
for (const e of ENTRIES) BY_SPELLING.set(e.w.toLowerCase().replace(/\s+/g, " "), { say: e.say, written: e.w, exact: e.exact });

/**
 * All spellings in one pattern, longest first so "Moshe Rabbeinu" wins over "Moshe". A word counts
 * only standing alone: not inside a longer word or a hyphenated one. (No lookbehind: older iPhones
 * can't read it.)
 */
const PATTERN = new RegExp(
  `(^|[^\\p{L}'-])(${ENTRIES.map((e) => e.w)
    .sort((a, b) => b.length - a.length)
    .map((w) => escape(w).replace(/ /g, "\\s+"))
    .join("|")})(?![\\p{L}-])`,
  "giu",
);

/** Respells the known words in English text for a speech voice, keeping a capital where there was one. */
export function respell(text: string): string {
  return text.replace(PATTERN, (all: string, before: string, word: string) => {
    const e = BY_SPELLING.get(word.toLowerCase().replace(/\s+/g, " "));
    if (!e || (e.exact && word.replace(/\s+/g, " ") !== e.written)) return all;
    const say = /^\p{Lu}/u.test(word) ? e.say[0].toUpperCase() + e.say.slice(1) : e.say[0].toLowerCase() + e.say.slice(1);
    return before + say;
  });
}
