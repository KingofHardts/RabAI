/*
 * How RabbAI's voice should say Hebrew and Aramaic words written in English letters, and the names
 * of rabbis and books. Speech voices are trained mostly on English, so "Chazal" comes out with the
 * "ch" of "chair" and "Hashem" as "hash 'em". Each entry gives the spellings found in answers and
 * how to say the word, two ways:
 *
 *   say: a spelling a voice reads correctly: "kh" for the throaty ch (as in "Bach"), hyphens
 *        between syllables, and the stressed syllable in CAPITALS ("RAH-shee").
 *   ipa: the word's sounds in the International Phonetic Alphabet, with ˈ before the stressed
 *        syllable. The newest voices read these exactly when they are written between slashes.
 *
 * Words are said the way they are usually said in English among people who learn ("geh-MAH-rah",
 * "RAHM-bahm"); a word written the Israeli way is said that way ("Shabbat": shah-BAHT), and one
 * written the Ashkenazi way that way ("Shabbos": SHAH-bis).
 *
 * This is pronunciation only, not Torah content. Add a word when a voice says it wrong.
 *
 * The device's voices get every entry (respelled, without capitals, which some of them would spell
 * out). The natural voices of a speech service (RabbAI's own voice) already say many of these
 * words well, so they get only the entries they need: words written with "ch" (the throaty sound),
 * the short names that are also English words, and the words marked `natural`.
 */

export interface SayAs {
  /** The ways the word is written in English text (any capitalization). */
  written: string[];
  /** How to spell it for the voice, the stressed syllable in capitals. */
  say: string;
  /** Its sounds (IPA), one group per word, for a voice that reads them. */
  ipa?: string;
  /** Match only as written, capital and all: "Ran" the Rishon, not "he ran". */
  exact?: boolean;
  /** Respell it for a natural voice too (one that would otherwise say it wrong). */
  natural?: boolean;
  /** Use `say` exactly as it is, for every voice ("Rab AI"). */
  literal?: boolean;
}

/** Which entries to use: every one (the device's voices), or those a natural voice needs. */
export type RespellFor = "device" | "natural";

/**
 * How a voice is told where the stress falls: "plain" (not at all), "caps" (the stressed syllable in
 * capitals) or "ipa" (the word's sounds between slashes, for a voice that reads them).
 */
export type SayStyle = "plain" | "caps" | "ipa";

/** A word the person fixed themselves, on their device: said exactly as they wrote it. */
export interface MyWord {
  written: string;
  say: string;
}

const N = { natural: true } as const;
const X = { exact: true } as const;
const w = (written: string | string[], say: string, ipa?: string, flags: Partial<SayAs> = {}): SayAs => ({
  written: Array.isArray(written) ? written : [written],
  say,
  ...(ipa ? { ipa } : {}),
  ...flags,
});

export const SAY_AS: SayAs[] = [
  // RabbAI's own name: "Rab", then the letters A and I.
  w(["RabbAI", "RabAI"], "Rab AI", undefined, { natural: true, literal: true }),

  // The Name and common words
  w("Hashem", "hah-SHEM", "hɑˈʃɛm", N),
  w("Baruch Hashem", "bah-ROOKH hah-SHEM", "bɑˈɹux hɑˈʃɛm"),
  w("Chazal", "khah-ZAHL", "xɑˈzɑl"),
  w(["halacha", "halachah", "halakha", "halakhah"], "hah-LAH-khah", "hɑˈlɑxɑ"),
  w(["halachic", "halakhic"], "hah-LAH-khik", "hɑˈlɑxɪk"),
  w(["halachos"], "hah-LAH-khos", "hɑˈlɑxoʊs"),
  w(["halachot", "halakhot"], "hah-lah-KHOTE", "ˌhɑlɑˈxoʊt"),
  w("chesed", "KHEH-sed", "ˈxɛsɛd"),
  w("chacham", "khah-KHAHM", "xɑˈxɑm"),
  w(["chachamim", "chakhamim"], "khah-khah-MEEM", "ˌxɑxɑˈmim"),
  w("talmid chacham", "tahl-MEED khah-KHAHM", "tɑlˈmid xɑˈxɑm"),
  w("chavrusa", "khahv-ROO-sah", "xɑvˈɹusɑ"),
  w(["chavruta", "chavrutah"], "khahv-ROO-tah", "xɑvˈɹutɑ"),
  w("Chumash", "KHOO-mahsh", "ˈxumɑʃ"),
  w(["Tanach", "Tanakh"], "tah-NAKH", "tɑˈnɑx"),
  w(["Gemara", "Gemoro"], "geh-MAH-rah", "ɡəˈmɑɹɑ", N),
  w(["Mishnah", "Mishna"], "MISH-nah", "ˈmɪʃnɑ"),
  w(["Mishnayot"], "mish-nah-YOTE", "ˌmɪʃnɑˈjoʊt", N),
  w(["Mishnayos"], "mish-NAH-yos", "mɪʃˈnɑjoʊs", N),
  w("Bavli", "BAHV-lee", "ˈbɑvli"),
  w("Yerushalmi", "yeh-roo-SHAHL-mee", "jɛɹuˈʃɑlmi", N),
  w("daf", "dahf", "dɑf", N),
  w("amud", "ah-MOOD", "ɑˈmud", N),
  w("sefer", "SAY-fer", "ˈseɪfɚ"),
  w("sefarim", "sfah-REEM", "sfɑˈɹim", N),
  w("seforim", "SFOR-im", "ˈsfɔɹɪm", N),
  w("mitzvah", "MITS-vah", "ˈmɪtsvɑ"),
  w("mitzvot", "mits-VOTE", "mɪtsˈvoʊt"),
  w("mitzvos", "MITS-vos", "ˈmɪtsvoʊs"),
  w(["bracha", "brachah", "beracha", "berachah", "berakhah"], "BRAH-khah", "ˈbɹɑxɑ"),
  w(["brachot", "berachot", "berakhot"], "brah-KHOTE", "bɹɑˈxoʊt"),
  w(["brachos", "berachos"], "BRAH-khos", "ˈbɹɑxoʊs"),
  w(["tefillah", "tefilla"], "teh-FEE-lah", "təˈfilɑ"),
  w("tefillin", "teh-FILL-in", "təˈfɪlɪn"),
  w(["teshuvah", "teshuva"], "teh-SHOO-vah", "təˈʃuvɑ"),
  w(["kavanah", "kavana", "kavannah"], "kah-VAH-nah", "kɑˈvɑnɑ"),
  w(["Shema", "Shma"], "sh'MAH", "ʃəˈmɑ", N),
  w("Amidah", "ah-MEE-dah", "ɑˈmidɑ"),
  w("Kaddish", "KAH-dish", "ˈkɑdɪʃ"),
  w("Kedushah", "keh-DOO-shah", "kəˈduʃɑ", N),
  w("Kiddushin", "kee-doo-SHEEN", "ˌkiduˈʃin", N),
  w("Aleinu", "ah-LAY-noo", "ɑˈleɪnu", N),
  w("Hallel", "hah-LEL", "hɑˈlɛl", N),
  w("Tachanun", "TAH-khah-noon", "ˈtɑxɑnun"),
  w("Shacharit", "SHAH-khah-reet", "ˈʃɑxɑɹit"),
  w("Shacharis", "SHAH-khah-ris", "ˈʃɑxɑɹɪs"),
  w(["Mincha", "Minchah"], "MIN-khah", "ˈmɪnxɑ"),
  w(["Maariv", "Ma'ariv"], "MAH-ah-reev", "ˈmɑɑɹiv", N),
  w(["Musaf", "Mussaf"], "MOO-sahf", "ˈmusɑf", N),
  w("Birkat HaMazon", "beer-KAHT hah-mah-ZONE", "bɪɹˈkɑt hɑmɑˈzoʊn", N),
  w(["Havdalah", "Havdala"], "hahv-DAH-lah", "hɑvˈdɑlɑ", N),
  w(["siddur"], "SID-oor", "ˈsɪdʊɹ", N),
  w(["daven"], "DAH-ven", "ˈdɑvən", N),
  w(["davening"], "DAH-ven-ing", "ˈdɑvənɪŋ", N),
  w("Shabbat", "shah-BAHT", "ʃɑˈbɑt"),
  w("Shabbos", "SHAH-bis", "ˈʃɑbəs"),
  w("Pesach", "PAY-sakh", "ˈpeɪsɑx"),
  w(["Chanukah", "Chanukkah", "Hanukkah", "Hanukah"], "KHAH-noo-kah", "ˈxɑnukɑ"),
  w("Sukkot", "soo-KOTE", "suˈkoʊt"),
  w("Sukkos", "SOOK-us", "ˈsʊkəs"),
  w("Shavuot", "shah-voo-OTE", "ʃɑvuˈoʊt"),
  w("Shavuos", "shah-VOO-us", "ʃɑˈvuəs"),
  w("Yom Kippur", "yome kee-POOR", "joʊm kiˈpʊɹ"),
  w(["Rosh Hashanah", "Rosh HaShanah", "Rosh Hashana"], "rosh hah-SHAH-nah", "ɹoʊʃ hɑˈʃɑnɑ"),
  w("Rosh Chodesh", "rosh KHOH-desh", "ɹoʊʃ ˈxoʊdɛʃ"),
  w("Rishonim", "ree-shoh-NEEM", "ˌɹiʃoʊˈnim", N),
  w(["Acharonim", "Achronim", "Aharonim"], "ah-khah-roh-NEEM", "ˌɑxɑɹoʊˈnim"),
  w("Tannaim", "tah-nah-EEM", "ˌtɑnɑˈim", N),
  w("Amoraim", "ah-moh-rah-EEM", "ˌɑmoʊɹɑˈim", N),
  w("Zohar", "ZOH-har", "ˈzoʊhɑɹ"),
  w(["parsha", "parasha", "parashah"], "PAR-shah", "ˈpɑɹʃɑ", N),
  w(["Parashat", "Parshat"], "par-SHAHT", "pɑɹˈʃɑt", N),
  w("sugya", "SOOG-yah", "ˈsʊɡjɑ", N),
  w(["pshat", "peshat"], "p'SHAHT", "pəˈʃɑt", N),
  w("machlokes", "makh-LOH-kes", "mɑxˈloʊkɛs"),
  w("machloket", "makh-LOH-ket", "mɑxˈloʊkɛt"),
  w("posek", "POH-sek", "ˈpoʊsɛk", N),
  w("poskim", "pohs-KEEM", "poʊsˈkim", N),
  w("chiddush", "KHID-ish", "ˈxɪdɪʃ"),
  w("shiur", "SHEE-oor", "ˈʃiʊɹ", N),
  w(["svara", "sevara"], "s'VAH-rah", "səˈvɑɹɑ", N),
  w("kashya", "KAHSH-yah", "ˈkɑʃjɑ", N),
  w("teiku", "TAY-koo", "ˈteɪku", N),
  w("kal vachomer", "kahl vah-KHOH-mer", "kɑl vɑˈxoʊmɚ"),
  w("mussar", "MOO-sar", "ˈmusɑɹ", N),
  w("emunah", "eh-MOO-nah", "ɛˈmunɑ", N),
  w("bitachon", "bee-tah-KHONE", "ˌbitɑˈxoʊn"),
  w("tzedakah", "tseh-DAH-kah", "tsəˈdɑkɑ", N),
  w("lashon hara", "lah-SHONE hah-RAH", "lɑˈʃoʊn hɑˈɹɑ", N),
  w("muktzeh", "MOOK-tseh", "ˈmʊktsɛ", N),
  w(["melacha", "melachah"], "meh-LAH-khah", "məˈlɑxɑ"),
  w("eruv", "AY-roov", "ˈeɪɹuv", N),
  w("tzitzit", "TSIT-sit", "ˈtsɪtsɪt", N),
  w("tzitzis", "TSIT-sis", "ˈtsɪtsɪs", N),
  w("tallit", "tah-LEET", "tɑˈlit", N),
  w("tallis", "TAH-lis", "ˈtɑlɪs", N),
  w("Shechinah", "sheh-KHEE-nah", "ʃəˈxinɑ"),
  w(["Beit HaMikdash", "Beis HaMikdash"], "bait hah-mik-DAHSH", "beɪt hɑmɪkˈdɑʃ", N),
  w("Yisrael", "yis-rah-EL", "jɪsɹɑˈɛl", N),
  w("Eretz Yisrael", "EH-rets yis-rah-EL", "ˈɛɹɛts jɪsɹɑˈɛl", N),
  w("Yerushalayim", "yeh-roo-shah-LAH-yim", "jəˌɹuʃɑˈlɑjɪm", N),
  w("Tehillim", "teh-HILL-im", "təˈhɪlɪm", N),

  // The Chumash and its books
  w("Bereishit", "beh-ray-SHEET", "bəɹeɪˈʃit", N),
  w("Bereishis", "beh-RAY-shis", "bəˈɹeɪʃɪs", N),
  w("Shemot", "sheh-MOTE", "ʃəˈmoʊt", N),
  w("Vayikra", "vah-YIK-rah", "vɑˈjɪkɹɑ", N),
  w("Bamidbar", "bah-MID-bar", "bɑˈmɪdbɑɹ", N),
  w("Devarim", "deh-vah-REEM", "ˌdɛvɑˈɹim", N),
  w("Mishlei", "MISH-lay", "ˈmɪʃleɪ", N),
  w("Kohelet", "koh-HEH-let", "koʊˈhɛlɛt", N),
  w(["Pirkei Avot"], "peer-KAY ah-VOTE", "pɪɹˈkeɪ ɑˈvoʊt", N),
  w(["Pirkei Avos"], "PEER-kay AH-vos", "ˈpɪɹkeɪ ˈɑvoʊs", N),

  // Tractates
  w("Eruvin", "ay-roo-VEEN", "ˌeɪɹuˈvin", N),
  w("Pesachim", "peh-sah-KHEEM", "ˌpɛsɑˈxim"),
  w("Yoma", "YOH-mah", "ˈjoʊmɑ", N),
  w("Sukkah", "SOO-kah", "ˈsukɑ", N),
  w("Beitzah", "BAY-tsah", "ˈbeɪtsɑ", N),
  w(["Taanit", "Ta'anit"], "tah-ah-NEET", "ˌtɑɑˈnit", N),
  w("Megillah", "meh-GILL-ah", "məˈɡɪlɑ", N),
  w("Moed Katan", "moh-ED kah-TAHN", "moʊˈɛd kɑˈtɑn", N),
  w("Chagigah", "khah-GEE-gah", "xɑˈɡiɡɑ"),
  w("Yevamot", "yeh-vah-MOTE", "ˌjɛvɑˈmoʊt", N),
  w(["Ketubot", "Ketuvot"], "keh-too-BOTE", "kəˌtuˈboʊt", N),
  w("Nedarim", "neh-dah-REEM", "ˌnɛdɑˈɹim", N),
  w("Nazir", "nah-ZEER", "nɑˈziɹ", N),
  w("Sotah", "SOH-tah", "ˈsoʊtɑ", N),
  w("Gittin", "GIT-in", "ˈɡɪtɪn", N),
  w(["Bava Kamma", "Bava Kama"], "BAH-vah KAH-mah", "ˈbɑvɑ ˈkɑmɑ", N),
  w("Bava Metzia", "BAH-vah meh-TSEE-ah", "ˈbɑvɑ məˈtsiɑ", N),
  w("Bava Batra", "BAH-vah BAHT-rah", "ˈbɑvɑ ˈbɑtɹɑ", N),
  w("Makkot", "mah-KOTE", "mɑˈkoʊt", N),
  w("Shevuot", "sheh-voo-OTE", "ʃəvuˈoʊt", N),
  w("Avodah Zarah", "ah-VOH-dah ZAH-rah", "ɑˈvoʊdɑ ˈzɑɹɑ", N),
  w("Horayot", "hoh-rah-YOTE", "ˌhoʊɹɑˈjoʊt", N),
  w("Zevachim", "zeh-vah-KHEEM", "ˌzɛvɑˈxim"),
  w("Menachot", "meh-nah-KHOTE", "ˌmɛnɑˈxoʊt"),
  w("Chullin", "khoo-LEEN", "xuˈlin"),
  w(["Bekhorot", "Bechorot"], "beh-khoh-ROTE", "ˌbɛxoʊˈɹoʊt", N),
  w(["Arakhin", "Arachin"], "ah-rah-KHEEN", "ˌɑɹɑˈxin", N),
  w("Temurah", "teh-moo-RAH", "ˌtɛmuˈɹɑ", N),
  w("Keritot", "keh-ree-TOTE", "ˌkɛɹiˈtoʊt", N),
  w("Meilah", "meh-ee-LAH", "ˌmɛiˈlɑ", N),
  w("Niddah", "NID-ah", "ˈnɪdɑ", N),

  // Rishonim, Acharonim and their books
  w("Rashi", "RAH-shee", "ˈɹɑʃi"),
  w("Tosafot", "toh-sah-FOTE", "ˌtoʊsɑˈfoʊt", N),
  w(["Tosfos", "Tosafos"], "TOHS-fos", "ˈtoʊsfoʊs", N),
  w("Rambam", "RAHM-bahm", "ˈɹɑmbɑm", N),
  w("Ramban", "RAHM-bahn", "ˈɹɑmbɑn", N),
  w("Rashba", "RAHSH-bah", "ˈɹɑʃbɑ", N),
  w("Rashbam", "RAHSH-bahm", "ˈɹɑʃbɑm", N),
  w("Ritva", "RIT-vah", "ˈɹɪtvɑ", N),
  w("Rif", "Riff", "ɹɪf", X),
  w("Ran", "Rahn", "ɹɑn", X),
  w(["Raavad", "Ra'avad"], "RAH-ah-vahd", "ˈɹɑɑvɑd", N),
  w("Meiri", "meh-EE-ree", "mɛˈiɹi", N),
  w("Mordechai", "MOR-deh-khai", "ˈmɔɹdəxaɪ"),
  w(["Rabbeinu", "Rabenu", "Rabbenu"], "rah-BAY-noo", "ɹɑˈbeɪnu", N),
  w("Rabbeinu Tam", "rah-BAY-noo TAHM", "ɹɑˈbeɪnu tɑm", N),
  w("Rabbeinu Chananel", "rah-BAY-noo khah-nahn-EL", "ɹɑˈbeɪnu ˌxɑnɑnˈɛl"),
  w("Rabbeinu Yonah", "rah-BAY-noo YOH-nah", "ɹɑˈbeɪnu ˈjoʊnɑ", N),
  w(["Rabbeinu Bachya", "Rabbeinu Bachye"], "rah-BAY-noo BAKH-yay", "ɹɑˈbeɪnu ˈbɑxjeɪ"),
  w("Ibn Ezra", "ibben EZ-rah", "ˈɪbən ˈɛzɹɑ", N),
  w("Sforno", "SFOR-noh", "ˈsfɔɹnoʊ", N),
  w("Radak", "RAH-dahk", "ˈɹɑdɑk", N),
  w("Ralbag", "RAHL-bahg", "ˈɹɑlbɑɡ", N),
  w(["Abarbanel", "Abravanel"], "ah-bar-bah-NEL", "ˌɑbɑɹbɑˈnɛl", N),
  w("Chizkuni", "khiz-KOO-nee", "xɪzˈkuni"),
  w(["Ohr HaChaim", "Or HaChaim"], "ohr hah-KHAH-yim", "ɔɹ hɑˈxɑjɪm"),
  w("Kli Yakar", "klee yah-KAR", "kli jɑˈkɑɹ", N),
  w("Malbim", "MAHL-bim", "ˈmɑlbɪm", N),
  w("Netziv", "neh-TSEEV", "nəˈtsiv", N),
  w("Sfas Emes", "sfahs EH-mes", "sfɑs ˈɛmɛs", N),
  w("Sefat Emet", "sfaht eh-MET", "sfɑt ɛˈmɛt", N),
  w("Maharsha", "mah-HAR-shah", "mɑˈhɑɹʃɑ", N),
  w("Maharshal", "mah-HAR-shahl", "mɑˈhɑɹʃɑl", N),
  w("Maharal", "mah-hah-RAHL", "ˌmɑhɑˈɹɑl", N),
  w("Maharam", "mah-hah-RAHM", "ˌmɑhɑˈɹɑm", N),
  w(["Shulchan Aruch", "Shulchan Arukh", "Shulhan Arukh"], "SHOOL-khahn ah-ROOKH", "ˈʃʊlxɑn ɑˈɹux"),
  w(["Aruch HaShulchan", "Arukh HaShulchan"], "ah-ROOKH hah-shool-KHAHN", "ɑˈɹux hɑʃʊlˈxɑn"),
  w("Kitzur", "KIT-soor", "ˈkɪtsʊɹ", N),
  w(["Mechaber", "Mehaber"], "meh-KHAH-ber", "məˈxɑbɚ"),
  w(["Rema", "Rama"], "REH-mah", "ˈɹɛmɑ", X),
  w("Shach", "Shahkh", "ʃɑx", X),
  w("Taz", "Tahz", "tɑz", X),
  w("Gra", "Grah", "ɡɹɑ", X),
  w("Magen Avraham", "mah-GAIN ahv-rah-HAHM", "mɑˈɡeɪn ˌɑvɹɑˈhɑm", N),
  w(["Mishnah Berurah", "Mishna Berura", "Mishnah Berura"], "MISH-nah b'ROO-rah", "ˈmɪʃnɑ bəˈɹuɹɑ", N),
  w(["Mishneh Torah"], "MISH-neh TOH-rah", "ˈmɪʃnɛ ˈtoʊɹɑ", N),
  w("Chayei Adam", "khah-YAY ah-DAHM", "xɑˈjeɪ ɑˈdɑm"),
  w(["Chofetz Chaim", "Chafetz Chaim", "Chafetz Chayim"], "khoh-FETS KHAH-yim", "xoʊˈfɛts ˈxɑjɪm"),
  w("Chazon Ish", "khah-ZONE EESH", "xɑˈzoʊn iʃ"),
  w("Chasam Sofer", "KHAH-sahm SOH-fer", "ˈxɑsɑm ˈsoʊfɚ"),
  w("Chatam Sofer", "khah-TAHM soh-FER", "xɑˈtɑm soʊˈfɛɹ"),
  w("Igrot Moshe", "ee-GROTE moh-SHEH", "iˈɡɹoʊt moʊˈʃɛ", N),
  w("Igros Moshe", "IG-ros MOH-sheh", "ˈɪɡɹoʊs ˈmoʊʃɛ", N),
  w("Ben Ish Chai", "ben eesh KHAI", "bɛn iʃ xaɪ"),
  w("Kaf HaChaim", "kahf hah-KHAH-yim", "kɑf hɑˈxɑjɪm"),
  w("Yalkut Yosef", "yahl-KOOT YOH-sef", "jɑlˈkut ˈjoʊsɛf", N),
  w("Vilna Gaon", "VIL-nah gah-OHN", "ˈvɪlnɑ ɡɑˈoʊn", N),
  w("Baal Shem Tov", "bahl shem TOVE", "bɑl ʃɛm toʊv", N),
  w("Tanya", "TAHN-yah", "ˈtɑnjɑ", N),
  w("Ramchal", "RAHM-khahl", "ˈɹɑmxɑl"),
  w("Mesillat Yesharim", "meh-see-LAHT yeh-shah-REEM", "ˌmɛsiˈlɑt ˌjɛʃɑˈɹim", N),
  w("Mesilas Yesharim", "meh-SEE-lahs yeh-SHAH-rim", "məˈsilɑs jəˈʃɑɹɪm", N),
  w(["Chovot HaLevavot"], "khoh-VOTE hah-leh-vah-VOTE", "xoʊˈvoʊt hɑˌlɛvɑˈvoʊt"),
  w(["Chovos HaLevavos"], "KHOH-vos hah-leh-VAH-vos", "ˈxoʊvoʊs hɑləˈvɑvoʊs"),
  w("Kuzari", "koo-ZAH-ree", "kuˈzɑɹi", N),
  w("Moreh Nevuchim", "moh-REH neh-voo-KHEEM", "moʊˈɹɛ ˌnɛvuˈxim"),
  w("Sefer HaChinuch", "SAY-fer hah-khee-NOOKH", "ˈseɪfɚ hɑxiˈnux"),
  w("Tur", "Toor", "tʊɹ", X),
  w(["Beit Yosef", "Beis Yosef"], "bait YOH-sef", "beɪt ˈjoʊsɛf", N),

  // Sages and people of the Torah
  w("Abaye", "ah-BAH-yay", "ɑˈbɑjeɪ", N),
  w("Rava", "RAH-vah", "ˈɹɑvɑ", N),
  w(["Rabba", "Rabbah"], "RAH-bah", "ˈɹɑbɑ", N),
  w("Rav", "Rahv", "ɹɑv", N),
  w("Ravina", "rah-VEE-nah", "ɹɑˈvinɑ", N),
  w("Rav Ashi", "rahv AH-shee", "ɹɑv ˈɑʃi", N),
  w("Rav Huna", "rahv HOO-nah", "ɹɑv ˈhunɑ", N),
  w("Rav Chisda", "rahv KHIZ-dah", "ɹɑv ˈxɪzdɑ"),
  w("Rav Nachman", "rahv NAHKH-mahn", "ɹɑv ˈnɑxmɑn"),
  w("Rav Sheshet", "rahv SHAY-shet", "ɹɑv ˈʃeɪʃɛt", N),
  w("Rav Papa", "rahv PAH-pah", "ɹɑv ˈpɑpɑ", N),
  w(["Zeira", "Zeira"], "ZAY-rah", "ˈzeɪɹɑ", N),
  w("Rabban", "rah-BAHN", "ɹɑˈbɑn", N),
  w("Shmuel", "SHMOO-el", "ˈʃmuɛl", N),
  w("Yochanan", "yoh-KHAH-nahn", "joʊˈxɑnɑn"),
  w("Reish Lakish", "raysh lah-KEESH", "ɹeɪʃ lɑˈkiʃ", N),
  w("Shammai", "SHAH-my", "ˈʃɑmaɪ", N),
  w("Akiva", "ah-KEE-vah", "ɑˈkivɑ", N),
  w("Meir", "may-EER", "meɪˈiɹ", X),
  w("Tarfon", "tar-FONE", "tɑɹˈfoʊn", N),
  w("Gamliel", "gahm-lee-EL", "ˌɡɑmliˈɛl", N),
  w("Eliezer", "eh-lee-EH-zer", "ˌɛliˈɛzɚ", N),
  w("Elazar", "el-ah-ZAR", "ˌɛlɑˈzɑɹ", N),
  w("Yehoshua", "yeh-hoh-SHOO-ah", "jəhoʊˈʃuɑ", N),
  w("Yishmael", "yish-mah-EL", "ˌjɪʃmɑˈɛl", N),
  w("Shimon", "shee-MONE", "ʃiˈmoʊn", N),
  w("bar Yochai", "bar yoh-KHAI", "bɑɹ joʊˈxaɪ"),
  w(["Yosei", "Yose"], "YOH-say", "ˈjoʊseɪ", X),
  w("Moshe", "MOH-sheh", "ˈmoʊʃɛ", N),
  w("Moshe Rabbeinu", "MOH-sheh rah-BAY-noo", "ˈmoʊʃɛ ɹɑˈbeɪnu", N),
  w("Aharon", "ah-hah-RONE", "ˌɑhɑˈɹoʊn", N),
  w(["Yaakov", "Ya'akov"], "YAH-ah-kove", "ˈjɑɑkoʊv", N),
  w(["Yitzchak", "Yitzhak"], "YITS-khahk", "ˈjɪtsxɑk"),
  w("Avraham", "ahv-rah-HAHM", "ˌɑvɹɑˈhɑm", N),
  w(["Yehudah", "Yehuda"], "yeh-HOO-dah", "jəˈhudɑ", N),
  w("Yosef", "YOH-sef", "ˈjoʊsɛf", N),
  w("Shlomo", "SHLOH-moh", "ˈʃloʊmoʊ", N),
  w("Eliyahu", "eh-lee-YAH-hoo", "ˌɛliˈjɑhu", N),
  w("Esav", "ay-SAHV", "eɪˈsɑv", N),
  w(["Chava", "Chavah"], "KHAH-vah", "ˈxɑvɑ"),
  w(["Chana", "Chanah"], "KHAH-nah", "ˈxɑnɑ"),
  w(["Rivka", "Rivkah"], "RIV-kah", "ˈɹɪvkɑ", N),
];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Whether a natural voice needs this entry too. */
const forNatural = (e: SayAs) => !!e.natural || !!e.exact || e.written.some((x) => /ch/i.test(x));

interface Entry {
  say: string;
  ipa?: string;
  written: string;
  exact: boolean;
  natural: boolean;
  literal: boolean;
}
const ENTRIES = SAY_AS.flatMap((e) => e.written.map((x) => ({ w: x, say: e.say, ipa: e.ipa, exact: !!e.exact, natural: forNatural(e), literal: !!e.literal })));
const BY_SPELLING = new Map<string, Entry>();
for (const e of ENTRIES) BY_SPELLING.set(e.w.toLowerCase().replace(/\s+/g, " "), { say: e.say, ipa: e.ipa, written: e.w, exact: e.exact, natural: e.natural, literal: e.literal });

/**
 * Spellings in one pattern, longest first so "Moshe Rabbeinu" wins over "Moshe". A word counts
 * only standing alone: not inside a longer word or a hyphenated one. (No lookbehind: older iPhones
 * can't read it.)
 */
const patternFor = (words: string[]) =>
  new RegExp(
    `(^|[^\\p{L}'-])(${[...words]
      .sort((a, b) => b.length - a.length)
      .map((x) => escape(x).replace(/ /g, "\\s+"))
      .join("|")})(?![\\p{L}-])`,
    "giu",
  );
const PATTERN = patternFor(ENTRIES.map((e) => e.w));

/** An entry in the chosen style, keeping a capital where the written word had one. */
function styled(e: Entry, word: string, style: SayStyle): string {
  if (e.literal) return e.say;
  if (style === "ipa" && e.ipa)
    return e.ipa
      .split(" ")
      .map((x) => `/${x}/`)
      .join(" ");
  const capital = /^\p{Lu}/u.test(word);
  if (style === "plain") {
    const low = e.say.toLowerCase();
    return capital ? low.replace(/(^|\s)(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase()) : low;
  }
  // Capitals mark the stress; the first letter follows the written word.
  return capital ? e.say[0].toUpperCase() + e.say.slice(1) : e.say;
}

export interface RespellOptions {
  /** How the stress is shown (the device's voices always get "plain"). */
  style?: SayStyle;
  /** The person's own fixes, which come first and are used exactly as written. */
  mine?: MyWord[];
}

/** Marks a place already respelled, so a later pass leaves it alone. */
const HOLD_OPEN = "\uE000";
const HOLD_CLOSE = "\uE001";

/**
 * Respells the known words in English text for a speech voice. `voice` is "device" for the
 * device's own voices (every word, no capitals) or "natural" for RabbAI's own voice (only the
 * words it needs, in the chosen style).
 */
export function respell(text: string, voice: RespellFor = "device", opts: RespellOptions = {}): string {
  const style: SayStyle = voice === "device" ? "plain" : (opts.style ?? "plain");
  const held: string[] = [];
  const hold = (said: string) => `${HOLD_OPEN}${held.push(said) - 1}${HOLD_CLOSE}`;
  let t = text;
  const mine = (opts.mine ?? []).filter((m) => m.written.trim() && m.say.trim());
  if (mine.length) {
    const bySpelling = new Map(mine.map((m) => [m.written.trim().toLowerCase().replace(/\s+/g, " "), m.say.trim()]));
    t = t.replace(patternFor(mine.map((m) => m.written.trim())), (all: string, before: string, word: string) => {
      const say = bySpelling.get(word.toLowerCase().replace(/\s+/g, " "));
      return say ? before + hold(say) : all;
    });
  }
  t = t.replace(PATTERN, (all: string, before: string, word: string) => {
    const e = BY_SPELLING.get(word.toLowerCase().replace(/\s+/g, " "));
    if (!e || (e.exact && word.replace(/\s+/g, " ") !== e.written)) return all;
    if (voice === "natural" && !e.natural) return all;
    return before + hold(styled(e, word, style));
  });
  return t.replace(new RegExp(`${HOLD_OPEN}(\\d+)${HOLD_CLOSE}`, "g"), (_, n: string) => held[Number(n)] ?? "");
}

/** The person's own fixes from stored text, each checked; at most 200, short. */
export function parseMyWords(raw: unknown): MyWord[] {
  if (!Array.isArray(raw)) return [];
  const out: MyWord[] = [];
  const seen = new Set<string>();
  for (const x of raw) {
    if (!x || typeof x !== "object") continue;
    const { written, say } = x as Record<string, unknown>;
    if (typeof written !== "string" || typeof say !== "string") continue;
    const wr = written.trim().replace(/\s+/g, " ").slice(0, 40);
    const sy = say.trim().replace(/\s+/g, " ").slice(0, 80);
    const key = wr.toLowerCase();
    if (!/\p{L}/u.test(wr) || !sy || seen.has(key)) continue;
    seen.add(key);
    out.push({ written: wr, say: sy });
    if (out.length >= 200) break;
  }
  return out;
}
