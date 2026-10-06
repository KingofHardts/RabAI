import type { Passage, Work } from "./types";

/*
 * The development library: a small set of passages typed by the team so the app can be
 * built and tested before the board approves any edition. Hebrew follows the standard
 * texts, without vowels. English translations are the team's placeholders.
 *
 * Nothing here may be used in a public launch. It is replaced by approved editions
 * imported from the whitelist (see docs/library-growth.md).
 */

const DEV_EDITION = "Development text, typed from the standard text. To be replaced by the approved edition.";
const DEV_TRANSLATION = { by: "RabAI team (placeholder)", status: "development" as const };

export const DEV_WORKS: Work[] = [
  { id: "bereishit", title: "Bereishit", he: "בראשית", canonId: "tanakh", kind: "text", edition: DEV_EDITION, translation: DEV_TRANSLATION, library: "development", aliases: ["genesis", "bereishis", "bereshit", "creation"] },
  { id: "rashi-bereishit", title: "Rashi on Bereishit", he: "רש״י על בראשית", canonId: "rashi-tanakh", kind: "commentary", author: "Rashi", edition: DEV_EDITION, translation: DEV_TRANSLATION, library: "development", aliases: ["rashi"] },
  { id: "ramban-bereishit", title: "Ramban on Bereishit", he: "רמב״ן על בראשית", canonId: "ramban-torah", kind: "commentary", author: "Ramban", edition: DEV_EDITION, translation: DEV_TRANSLATION, library: "development", aliases: ["ramban", "nachmanides"] },
  { id: "shemos", title: "Shemos", he: "שמות", canonId: "tanakh", kind: "text", edition: DEV_EDITION, translation: DEV_TRANSLATION, library: "development", aliases: ["exodus", "shemot"] },
  { id: "vayikra", title: "Vayikra", he: "ויקרא", canonId: "tanakh", kind: "text", edition: DEV_EDITION, translation: DEV_TRANSLATION, library: "development", aliases: ["leviticus"] },
  { id: "devarim", title: "Devarim", he: "דברים", canonId: "tanakh", kind: "text", edition: DEV_EDITION, translation: DEV_TRANSLATION, library: "development", aliases: ["deuteronomy"] },
  { id: "tehillim", title: "Tehillim", he: "תהלים", canonId: "tanakh", kind: "text", edition: DEV_EDITION, translation: DEV_TRANSLATION, library: "development", aliases: ["psalms", "psalm"] },
  { id: "avot", title: "Pirkei Avot", he: "פרקי אבות", canonId: "mishnah", kind: "text", edition: DEV_EDITION, translation: DEV_TRANSLATION, library: "development", aliases: ["avos", "pirkei avos", "ethics of the fathers"] },
  { id: "shabbat", title: "Shabbat", he: "שבת", canonId: "talmud-bavli", kind: "text", edition: DEV_EDITION, translation: DEV_TRANSLATION, library: "development", aliases: ["shabbos", "gemara", "talmud"] },
  { id: "eruvin", title: "Eruvin", he: "עירובין", canonId: "talmud-bavli", kind: "text", edition: DEV_EDITION, translation: DEV_TRANSLATION, library: "development", aliases: ["eiruvin", "gemara", "talmud"] }
];

export const DEV_PASSAGES: Passage[] = [
  // ---- Bereishit 1 ----
  { ref: "Bereishit 1:1", work: "bereishit", section: "Bereishit 1", sectionHe: "בראשית א", order: 1, label: "Verse 1", labelHe: "א",
    he: "בראשית ברא אלהים את השמים ואת הארץ׃",
    en: "In the beginning, God created the heavens and the earth.",
    keywords: ["creation", "beginning", "world", "creator", "start"] },
  { ref: "Bereishit 1:2", work: "bereishit", section: "Bereishit 1", sectionHe: "בראשית א", order: 2, label: "Verse 2", labelHe: "ב",
    he: "והארץ היתה תהו ובהו וחשך על פני תהום ורוח אלהים מרחפת על פני המים׃",
    en: "The earth was unformed and empty, darkness was on the face of the deep, and the spirit of God hovered over the face of the waters." },
  { ref: "Bereishit 1:3", work: "bereishit", section: "Bereishit 1", sectionHe: "בראשית א", order: 3, label: "Verse 3", labelHe: "ג",
    he: "ויאמר אלהים יהי אור ויהי אור׃",
    en: "God said, “Let there be light,” and there was light.", keywords: ["light"] },
  { ref: "Bereishit 1:4", work: "bereishit", section: "Bereishit 1", sectionHe: "בראשית א", order: 4, label: "Verse 4", labelHe: "ד",
    he: "וירא אלהים את האור כי טוב ויבדל אלהים בין האור ובין החשך׃",
    en: "God saw the light, that it was good, and God separated between the light and the darkness.", keywords: ["light", "good"] },
  { ref: "Bereishit 1:5", work: "bereishit", section: "Bereishit 1", sectionHe: "בראשית א", order: 5, label: "Verse 5", labelHe: "ה",
    he: "ויקרא אלהים לאור יום ולחשך קרא לילה ויהי ערב ויהי בקר יום אחד׃",
    en: "God called the light Day, and the darkness He called Night. It was evening and it was morning, one day.", keywords: ["day", "night", "evening", "morning"] },
  { ref: "Rashi on Bereishit 1:1", work: "rashi-bereishit", section: "Bereishit 1", sectionHe: "בראשית א", order: 101, label: "Rashi", labelHe: "רש״י", on: "Bereishit 1:1",
    he: "בראשית — אמר רבי יצחק: לא היה צריך להתחיל את התורה אלא מ״החדש הזה לכם״, שהיא מצוה ראשונה שנצטוו בה ישראל. ומה טעם פתח בבראשית? משום ״כח מעשיו הגיד לעמו לתת להם נחלת גוים״, שאם יאמרו אומות העולם לישראל: לסטים אתם, שכבשתם ארצות שבעה גוים — הם אומרים להם: כל הארץ של הקב״ה היא, הוא בראה ונתנה לאשר ישר בעיניו. ברצונו נתנה להם, וברצונו נטלה מהם ונתנה לנו.",
    en: "In the beginning — Rabbi Yitzchak said: The Torah should have begun only from “This month shall be for you,” the first mitzvah the Jewish people were commanded. Why did it begin with Creation? Because of “He told His people the power of His works, to give them the inheritance of the nations.” If the nations of the world say to Israel, “You are robbers, for you conquered the lands of seven nations,” they answer: “The whole earth belongs to the Holy One, blessed be He. He created it and gave it to whomever He saw fit. By His will He gave it to them, and by His will He took it from them and gave it to us.”",
    keywords: ["why", "torah", "start", "begin", "creation", "mitzvah", "first", "land", "israel", "eretz yisrael"] },
  { ref: "Ramban on Bereishit 1:1", work: "ramban-bereishit", section: "Bereishit 1", sectionHe: "בראשית א", order: 102, label: "Ramban (opening words)", labelHe: "רמב״ן", on: "Bereishit 1:1",
    he: "ויש לשאול בה, כי צורך גדול הוא להתחיל התורה בבראשית ברא אלהים, כי הוא שורש האמונה…",
    en: "One may ask about this, for there is a great need to begin the Torah with “In the beginning God created,” because it is the root of faith…",
    keywords: ["why", "torah", "start", "begin", "creation", "emunah", "faith", "root"] },

  // ---- Shemos 12 ----
  { ref: "Shemos 12:2", work: "shemos", section: "Shemos 12", sectionHe: "שמות יב", order: 2, label: "Verse 2", labelHe: "ב",
    he: "החדש הזה לכם ראש חדשים ראשון הוא לכם לחדשי השנה׃",
    en: "This month shall be for you the head of the months; it shall be the first of the months of the year for you.",
    keywords: ["first mitzvah", "month", "rosh chodesh", "calendar", "nissan"] },

  // ---- Vayikra 19 ----
  { ref: "Vayikra 19:18", work: "vayikra", section: "Vayikra 19", sectionHe: "ויקרא יט", order: 18, label: "Verse 18", labelHe: "יח",
    he: "לא תקם ולא תטר את בני עמך ואהבת לרעך כמוך אני ה'׃",
    en: "Do not take revenge and do not bear a grudge against the members of your people; love your fellow as yourself. I am HaShem.",
    keywords: ["love", "fellow", "neighbor", "revenge", "grudge", "kindness", "golden rule"] },

  // ---- Devarim 6 ----
  { ref: "Devarim 6:4", work: "devarim", section: "Devarim 6", sectionHe: "דברים ו", order: 4, label: "Verse 4", labelHe: "ד",
    he: "שמע ישראל ה' אלהינו ה' אחד׃",
    en: "Hear, O Israel: HaShem is our God, HaShem is One.",
    keywords: ["shema", "one", "unity", "emunah", "faith"] },
  { ref: "Devarim 6:5", work: "devarim", section: "Devarim 6", sectionHe: "דברים ו", order: 5, label: "Verse 5", labelHe: "ה",
    he: "ואהבת את ה' אלהיך בכל לבבך ובכל נפשך ובכל מאדך׃",
    en: "You shall love HaShem your God with all your heart, with all your soul, and with all your might.",
    keywords: ["love", "shema", "heart", "soul", "connection", "close", "closer"] },

  // ---- Tehillim 111 ----
  { ref: "Tehillim 111:5", work: "tehillim", section: "Tehillim 111", sectionHe: "תהלים קיא", order: 5, label: "Verse 5", labelHe: "ה",
    he: "טרף נתן ליראיו יזכר לעולם בריתו׃",
    en: "He gave food to those who fear Him; He will remember His covenant forever." },
  { ref: "Tehillim 111:6", work: "tehillim", section: "Tehillim 111", sectionHe: "תהלים קיא", order: 6, label: "Verse 6", labelHe: "ו",
    he: "כח מעשיו הגיד לעמו לתת להם נחלת גוים׃",
    en: "He told His people the power of His works, to give them the inheritance of the nations.",
    keywords: ["power", "works", "creation", "land", "inheritance"] },
  { ref: "Tehillim 111:7", work: "tehillim", section: "Tehillim 111", sectionHe: "תהלים קיא", order: 7, label: "Verse 7", labelHe: "ז",
    he: "מעשי ידיו אמת ומשפט נאמנים כל פקודיו׃",
    en: "The works of His hands are truth and justice; all His commandments are faithful." },

  // ---- Pirkei Avot 1 ----
  { ref: "Pirkei Avot 1:1", work: "avot", section: "Pirkei Avot 1", sectionHe: "פרקי אבות א", order: 1, label: "Mishnah 1", labelHe: "א",
    he: "משה קבל תורה מסיני, ומסרה ליהושע, ויהושע לזקנים, וזקנים לנביאים, ונביאים מסרוה לאנשי כנסת הגדולה. הם אמרו שלשה דברים: הוו מתונים בדין, והעמידו תלמידים הרבה, ועשו סיג לתורה.",
    en: "Moshe received the Torah from Sinai and handed it down to Yehoshua, Yehoshua to the Elders, the Elders to the Prophets, and the Prophets handed it down to the Men of the Great Assembly. They said three things: Be deliberate in judgment, raise up many students, and make a fence for the Torah.",
    keywords: ["mesorah", "tradition", "chain", "oral torah", "sinai", "transmission", "students", "fence"] },
  { ref: "Pirkei Avot 1:2", work: "avot", section: "Pirkei Avot 1", sectionHe: "פרקי אבות א", order: 2, label: "Mishnah 2", labelHe: "ב",
    he: "שמעון הצדיק היה משירי כנסת הגדולה. הוא היה אומר: על שלשה דברים העולם עומד: על התורה ועל העבודה ועל גמילות חסדים.",
    en: "Shimon HaTzaddik was one of the last of the Men of the Great Assembly. He used to say: The world stands on three things: on Torah, on avodah (the service of HaShem), and on acts of kindness.",
    keywords: ["world", "stands", "pillars", "kindness", "chessed", "prayer", "avodah", "torah study"] },
  { ref: "Pirkei Avot 1:14", work: "avot", section: "Pirkei Avot 1", sectionHe: "פרקי אבות א", order: 14, label: "Mishnah 14 (Hillel)", labelHe: "יד",
    he: "הוא היה אומר: אם אין אני לי, מי לי? וכשאני לעצמי, מה אני? ואם לא עכשיו, אימתי?",
    en: "He (Hillel) used to say: If I am not for myself, who will be for me? And when I am for myself, what am I? And if not now, when?",
    keywords: ["hillel", "now", "self", "responsibility", "growth", "start", "procrastination"] },

  // ---- Shabbat 21b ----
  { ref: "Shabbat 21b:1", work: "shabbat", section: "Shabbat 21b", sectionHe: "שבת כא:", order: 1, label: "The baraita", labelHe: "ברייתא",
    he: "תנו רבנן: מצות חנוכה נר איש וביתו, והמהדרין נר לכל אחד ואחד.",
    en: "The Sages taught: The mitzvah of Chanukah is one light for a man and his household. Those who beautify the mitzvah light one for each person.",
    keywords: ["chanukah", "hanukkah", "candles", "lights", "menorah", "mehadrin"] },
  { ref: "Shabbat 21b:2", work: "shabbat", section: "Shabbat 21b", sectionHe: "שבת כא:", order: 2, label: "Beis Shammai and Beis Hillel", labelHe: "ב״ש וב״ה",
    he: "והמהדרין מן המהדרין, בית שמאי אומרים: יום ראשון מדליק שמנה, מכאן ואילך פוחת והולך. ובית הלל אומרים: יום ראשון מדליק אחת, מכאן ואילך מוסיף והולך.",
    en: "And those who beautify it most: Beis Shammai say, on the first day one lights eight, and from then on, one fewer each night. Beis Hillel say, on the first day one lights one, and from then on, one more each night.",
    keywords: ["chanukah", "hanukkah", "candles", "lights", "menorah", "beis shammai", "beis hillel", "add", "each night", "machlokes"] },
  { ref: "Shabbat 21b:3", work: "shabbat", section: "Shabbat 21b", sectionHe: "שבת כא:", order: 3, label: "Ulla", labelHe: "עולא",
    he: "אמר עולא: פליגי בה תרי אמוראי במערבא, רבי יוסי בר אבין ורבי יוסי בר זבידא.",
    en: "Ulla said: Two Amoraim in the West (Eretz Yisrael) disagree about this, Rabbi Yosi bar Avin and Rabbi Yosi bar Zevida.",
    keywords: ["chanukah", "reason", "machlokes"] },
  { ref: "Shabbat 21b:4", work: "shabbat", section: "Shabbat 21b", sectionHe: "שבת כא:", order: 4, label: "The first explanation", labelHe: "חד אמר",
    he: "חד אמר: טעמא דבית שמאי כנגד ימים הנכנסין, וטעמא דבית הלל כנגד ימים היוצאין.",
    en: "One said: Beis Shammai’s reason corresponds to the days still to come, and Beis Hillel’s reason corresponds to the days that have gone by.",
    keywords: ["chanukah", "reason", "days", "beis shammai", "beis hillel"] },
  { ref: "Shabbat 21b:5", work: "shabbat", section: "Shabbat 21b", sectionHe: "שבת כא:", order: 5, label: "The second explanation", labelHe: "וחד אמר",
    he: "וחד אמר: טעמא דבית שמאי כנגד פרי החג, וטעמא דבית הלל דמעלין בקדש ואין מורידין.",
    en: "The other said: Beis Shammai’s reason corresponds to the bulls of the festival of Sukkos, and Beis Hillel’s reason is that we go up in holiness and do not go down.",
    keywords: ["chanukah", "reason", "holiness", "sukkos", "beis shammai", "beis hillel"] },

  // ---- Shabbat 31a ----
  { ref: "Shabbat 31a:1", work: "shabbat", section: "Shabbat 31a", sectionHe: "שבת לא.", order: 1, label: "Hillel and the convert", labelHe: "הלל והגר",
    he: "שוב מעשה בנכרי אחד שבא לפני שמאי, אמר לו: גיירני על מנת שתלמדני כל התורה כולה כשאני עומד על רגל אחת. דחפו באמת הבנין שבידו. בא לפני הלל, גייריה. אמר לו: דעלך סני לחברך לא תעביד, זו היא כל התורה כולה, ואידך פירושה הוא, זיל גמור.",
    en: "Another time, a gentile came before Shammai and said to him: Convert me on condition that you teach me the entire Torah while I stand on one foot. Shammai pushed him away with the builder’s measuring stick in his hand. He came before Hillel, who converted him. Hillel said to him: What is hateful to you, do not do to your fellow. That is the entire Torah; the rest is its explanation. Go and learn it.",
    keywords: ["hillel", "shammai", "convert", "one foot", "golden rule", "whole torah", "hateful", "go and learn"] },

  // ---- Eruvin 13b ----
  { ref: "Eruvin 13b:1", work: "eruvin", section: "Eruvin 13b", sectionHe: "עירובין יג:", order: 1, label: "A heavenly voice", labelHe: "בת קול",
    he: "אמר רבי אבא אמר שמואל: שלש שנים נחלקו בית שמאי ובית הלל, הללו אומרים הלכה כמותנו והללו אומרים הלכה כמותנו. יצאה בת קול ואמרה: אלו ואלו דברי אלהים חיים הן, והלכה כבית הלל.",
    en: "Rabbi Abba said in the name of Shmuel: For three years Beis Shammai and Beis Hillel disagreed. These said, “The halacha follows us,” and those said, “The halacha follows us.” A heavenly voice came forth and said: “These and these are the words of the living God, and the halacha follows Beis Hillel.”",
    keywords: ["machlokes", "disagreement", "both sides", "eilu v'eilu", "beis shammai", "beis hillel", "halacha", "wrong"] }
];
