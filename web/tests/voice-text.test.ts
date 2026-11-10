import { test } from "node:test";
import assert from "node:assert/strict";
import { SAY_AS, parseMyWords, respell } from "../lib/voice/lexicon";
import { namesForLearning, sayOptions, speechChunks, speechText } from "../lib/voice/speech-text";
import { sayHebrew } from "../lib/siddur/translit";
import { voiceInstructions, voiceProvider } from "../lib/voice/provider";
import { openAiVoices, rankElevenVoices } from "../lib/voice/voices";

test("names of rabbis and books are respelled for a voice, keeping capitals", () => {
  assert.equal(respell("Rashi and Tosafot; the Shulchan Aruch."), "Rah-shee and Toh-sah-fote; the Shool-khahn Ah-rookh.");
  assert.equal(respell("Moshe Rabbeinu and Moshe"), "Moh-sheh Rah-bay-noo and Moh-sheh");
  assert.equal(respell("halacha, Chazal's view"), "hah-lah-khah, Khah-zahl's view");
});

test("RabbAI's own name is said \"Rab\", then the letters A and I, by every voice", () => {
  assert.equal(respell("RabbAI's answer, and RabAI."), "Rab AI's answer, and Rab AI.");
  assert.equal(respell("Ask RabbAI.", "natural"), "Ask Rab AI.");
  assert.equal(respell("Ask RabbAI.", "natural", { style: "ipa" }), "Ask Rab AI.");
});

test("the stress of a name is shown to a natural voice in capitals or as sounds, never to the device's", () => {
  const t = "Tosafot asks on the Gemara; the Ran answers.";
  assert.equal(respell(t, "natural", { style: "caps" }), "Toh-sah-FOTE asks on the Geh-MAH-rah; the Rahn answers.");
  assert.equal(respell(t, "natural", { style: "ipa" }), "/ˌtoʊsɑˈfoʊt/ asks on the /ɡəˈmɑɹɑ/; the /ɹɑn/ answers.");
  assert.equal(respell("the Shulchan Aruch", "natural", { style: "ipa" }), "the /ˈʃʊlxɑn/ /ɑˈɹux/");
  // The device's voices would spell capitals out, so they never get them.
  assert.equal(respell(t, "device", { style: "caps" }), "Toh-sah-fote asks on the Geh-mah-rah; the Rahn answers.");
  // Every entry's sounds mark a stress when the word has more than one syllable, and use no sentence marks.
  for (const e of SAY_AS) {
    if (!e.ipa) continue;
    assert.ok(!/[.!?;\/]/.test(e.ipa), `${e.written[0]}: sounds hold no sentence marks`);
    for (const word of e.say.split(" ")) assert.ok(!word.includes("-") || /[A-Z]{2}/.test(word), `${e.written[0]}: "${word}" shows its stress`);
    assert.equal(e.ipa.split(" ").length, e.say.split(" ").length, `${e.written[0]}: one group of sounds per word`);
  }
});

test("a person's own fixes come first and are said exactly as written", () => {
  const mine = parseMyWords([{ written: " Rashi ", say: "RAH-shee" }, { written: "Rav Ashi", say: "Rahv Ah-SHEE" }, { written: "", say: "x" }, { written: "rashi", say: "again" }, 7]);
  assert.deepEqual(mine, [{ written: "Rashi", say: "RAH-shee" }, { written: "Rav Ashi", say: "Rahv Ah-SHEE" }]);
  assert.equal(respell("Rashi, Rav Ashi and Rav Papa", "natural", { style: "caps", mine }), "RAH-shee, Rahv Ah-SHEE and Rahv PAH-pah");
  assert.equal(respell("Rashi says", "device", { mine }), "RAH-shee says");
});

test("vocalized Hebrew is said with its stress: the last syllable, unless the word is of a kind stressed earlier", () => {
  const say = (he: string) => sayHebrew(he, "sephardi", "caps");
  assert.equal(say("בָּרוּךְ אַתָּה אֱלֹקֵינוּ מֶלֶךְ הָעוֹלָם"), "baRUKH aTAH eloKEInu MElekh ha'oLAM");
  assert.equal(say("אֲשֶׁר קִדְּשָׁנוּ בְּמִצְוֹתָיו וְצִוָּנוּ"), "aSHER kid'SHAnu b'mitzvoTAV v'tziVAnu");
  // "And you shall love": after "and", the stress moves to the end; "you said" keeps it earlier.
  assert.equal(say("וְאָהַבְתָּ אָמַרְתָּ לְפָנֶיךָ לְבָבְךָ"), "v'ahavTA aMARta l'faNEkha l'vavKHA");
  assert.equal(say("הַשָּׁמַיִם הָאָרֶץ לַיְלָה רוּחַ לֶחֶם יְרוּשָׁלַיִם"), "hashaMAyim ha'Aretz LAYlah RUakh LEkhem y'rushaLAyim");
  assert.equal(say("תּוֹרָה שַׁבָּת נַעַר אַחַת חַיִּים לָכֶם סֵפֶר קֹדֶשׁ אֱמֶת"), "toRAH shaBAT NA'ar aKHAT khaYIM laKHEM SEfer KOdesh eMET");
  assert.equal(say("וַיֹּאמֶר אֵלִיָּהוּ יַגִּידוּ שִׁירוּ הוֹדוּ"), "vaYOmer eliYAhu yaGIdu SHIru hoDU");
  // The Torah's own accents say where the stress is.
  assert.equal(say("בְּרֵאשִׁ֖ית בָּרָ֣א אֱלֹהִ֑ים אֵ֥ת הַשָּׁמַ֖יִם וְאֵ֥ת הָאָֽרֶץ"), "b'reSHIT baRA eloHIM et hashaMAyim v'et ha'Aretz");
  // One-syllable words are left alone; the Ashkenazi reading keeps the same stress.
  assert.equal(say("שְׁמַע כָּל"), "sh'ma kol");
  assert.equal(sayHebrew("בָּרוּךְ אַתָּה", "ashkenazi", "caps"), "boRUKH aTOH");
  assert.equal(sayHebrew("בָּרוּךְ אַתָּה מֶלֶךְ", "sephardi", "ipa"), "/bɑˈɹux/ /ɑˈtɑ/ /ˈmɛlɛx/");
  assert.equal(sayHebrew("בָּרוּךְ אַתָּה", "sephardi", "plain"), "barukh atah");
});

test("the choice in Settings becomes a style for names and one for Hebrew", () => {
  assert.deepEqual(sayOptions("auto", true), { names: "ipa", hebrew: "caps", mine: [] });
  assert.deepEqual(sayOptions("auto", false), { names: "caps", hebrew: "caps", mine: [] });
  assert.deepEqual(sayOptions("sounds", true), { names: "ipa", hebrew: "ipa", mine: [] });
  assert.deepEqual(sayOptions("sounds", false), { names: "caps", hebrew: "caps", mine: [] });
  assert.deepEqual(sayOptions("plain", true), { names: "plain", hebrew: "plain", mine: [] });
  assert.equal(
    speechText("Rav Ashi says בָּרוּךְ אַתָּה יְהוָה in the Gemara.", "sephardi", "natural", sayOptions("auto", true)),
    "/ɹɑv/ /ˈɑʃi/ says baRUKH aTAH /hɑˈʃɛm/ in the /ɡəˈmɑɹɑ/.",
  );
});

test("short names match only as written, and never inside another word", () => {
  assert.equal(respell("The Ran agrees. He ran home."), "The Rahn agrees. He ran home.");
  assert.equal(respell("Tosafot-like, Rashism"), "Tosafot-like, Rashism");
});

test("God's names are said as in learning, not as in prayer", () => {
  assert.equal(speechText("בָּרוּךְ אַתָּה יְהוָה אֱלֹהֵינוּ", "sephardi"), "barukh atah Hah-shem elokeinu");
  assert.equal(speechText("Baruch atah Adonai, Eloheinu; Elohim created.", "sephardi"), "Baruch atah Hah-shem, Elokeinu; Elokim created.");
  // The Name written out as it is read in prayer is said the same way; "my lord" (adoni) is not a name.
  assert.equal(speechText("אֲדֹנָי שְׂפָתַי", "sephardi"), "Hah-shem s'fatai");
  assert.equal(speechText("אֲדֹנִי", "sephardi"), "adoni");
  assert.equal(namesForLearning("ברוך אתה ה׳ אלהינו", true), "ברוך אתה השם אלקינו");
  // אֵלֶּה ("these") is not one of the names.
  assert.equal(namesForLearning("אלה הדברים"), "אלה הדברים");
});

test("an answer loses its marks and links, and pointed Hebrew is said in English letters", () => {
  assert.equal(speechText("**Rashi** says [1] see https://example.com. Done.", "ashkenazi"), "Rah-shee says see. Done.");
  assert.equal(speechText("Say מוֹדֶה אֲנִי first.", "ashkenazi"), "Say modeh ani first.");
  // Unpointed Hebrew is left for a voice that reads Hebrew.
  assert.equal(speechText("The Gemara (ברכות לה.) says so.", "sephardi"), "The Geh-mah-rah (ברכות לה.) says so.");
});

test("speech comes in small pieces, the first one short", () => {
  const long = "This is one sentence of the answer. ".repeat(40);
  const pieces = speechChunks(long);
  assert.ok(pieces[0].length <= 220);
  assert.ok(pieces.every((p) => p.length <= 700));
  assert.equal(pieces.join(" ").replace(/\s+/g, " "), long.trim().replace(/\s+/g, " "));
  // One very long sentence is cut between words.
  const run = "word ".repeat(400).trim();
  assert.ok(speechChunks(run).every((p) => p.length <= 700));
});

test("RabbAI's own voice is on only when a service is set up", () => {
  const keep = { ...process.env };
  try {
    delete process.env.ELEVENLABS_API_KEY;
    delete process.env.ELEVENLABS_VOICE_ID;
    delete process.env.OPENAI_API_KEY;
    delete process.env.RABAI_VOICE_PROVIDER;
    assert.equal(voiceProvider(), null);
    process.env.OPENAI_API_KEY = "x";
    assert.equal(voiceProvider(), "openai");
    process.env.ELEVENLABS_API_KEY = "x";
    assert.equal(voiceProvider(), "elevenlabs", "a key is enough: the voice is chosen from the account's list");
    process.env.RABAI_VOICE_PROVIDER = "openai";
    assert.equal(voiceProvider(), "openai");
    process.env.RABAI_VOICE_PROVIDER = "off";
    assert.equal(voiceProvider(), null);
  } finally {
    process.env = keep;
  }
});

test("a natural voice gets only the respellings it needs", () => {
  // The device's voices get every entry; a natural voice keeps words it already says well.
  assert.equal(respell("Rashi and the Mishnah", "natural"), "Rashi and the Mishnah");
  assert.equal(respell("Chazal and the Shulchan Aruch", "natural"), "Khah-zahl and the Shool-khahn Ah-rookh");
  assert.equal(respell("The Ran says Hashem's Gemara", "natural"), "The Rahn says Hah-shem's Geh-mah-rah");
  assert.equal(speechText("**Rashi** on Chazal", "sephardi", "natural"), "Rashi on Khah-zahl");
});

test("ElevenLabs voices: a kind older man first, clones left out", () => {
  const raw = [
    { voice_id: "girl1", name: "Laura - Enthusiast, Quirky Attitude", category: "premade", labels: { gender: "female", age: "young", accent: "american" } },
    { voice_id: "man2", name: "Liam - Energetic, Social Media Creator", category: "premade", labels: { gender: "male", age: "young", accent: "american" } },
    { voice_id: "man1", name: "Bill - Wise, Mature, Balanced", category: "premade", labels: { gender: "male", age: "old", accent: "american" } },
    { voice_id: "man3", name: "George - Warm, Captivating Storyteller", category: "premade", labels: { gender: "male", age: "middle_aged", accent: "british" } },
    { voice_id: "clone", name: "Someone real", category: "cloned", labels: { gender: "male", age: "old" } },
    { voice_id: "woman1", name: "Alice - Clear, Engaging Educator", category: "premade", labels: { gender: "female", age: "middle_aged", accent: "british" } },
    { voice_id: "bad id!", name: "Broken" },
  ];
  const list = rankElevenVoices(raw);
  assert.deepEqual(
    list.voices.map((v) => v.id),
    ["man1", "man3", "man2", "woman1", "girl1"],
  );
  assert.equal(list.defaultVoice, "man1");
  assert.equal(list.voices[0].name, "Bill");
  assert.match(list.voices[0].about, /^Older · American · Wise, Mature, Balanced$/);
  assert.equal(list.voices.find((v) => v.id === "woman1")?.group, "women");
  // The voice set for RabbAI leads and is the default, even a voice not in the list.
  assert.equal(rankElevenVoices(raw, "man3").defaultVoice, "man3");
  assert.equal(rankElevenVoices(raw, "man3").voices[0].id, "man3");
  const outside = rankElevenVoices(raw, "designed9");
  assert.equal(outside.defaultVoice, "designed9");
  assert.equal(outside.voices[0].id, "designed9");
});

test("OpenAI voices: a man's natural voice by default, women's voices offered too", () => {
  const list = openAiVoices();
  assert.equal(list.defaultVoice, "cedar");
  assert.ok(list.voices.some((v) => v.group === "women"));
  assert.equal(openAiVoices("onyx").voices[0].id, "onyx");
  assert.match(voiceInstructions("men"), /older man/);
  assert.match(voiceInstructions("women"), /older woman/);
  // Qualities only: the instructions never name a person.
  assert.doesNotMatch(voiceInstructions("men"), /\bRabbi\b|\bRav\b/);
});

test("ElevenLabs: a request it can't accept is tried again more simply, and the voice list is read", async () => {
  const { synthesize } = await import("../lib/voice/provider");
  const { voiceList, forgetVoiceList } = await import("../lib/voice/voices");
  const keep = { ...process.env };
  const realFetch = globalThis.fetch;
  const sent: Array<{ url: string; body: Record<string, unknown> | null }> = [];
  try {
    process.env.ELEVENLABS_API_KEY = "test-key";
    delete process.env.ELEVENLABS_VOICE_ID;
    delete process.env.ELEVENLABS_MODEL;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      sent.push({ url, body: init?.body ? JSON.parse(String(init.body)) : null });
      if (url.includes("/v2/voices")) {
        return new Response(JSON.stringify({ voices: [{ voice_id: "old1", name: "Bill - Wise", labels: { gender: "male", age: "old" } }], has_more: false }), { status: 200 });
      }
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      // This pretend service refuses voice settings on its newest model.
      if (body.voice_settings) return new Response("{}", { status: 422 });
      return new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { "Content-Type": "audio/mpeg" } });
    }) as typeof fetch;
    forgetVoiceList();
    const list = await voiceList("elevenlabs");
    assert.equal(list.defaultVoice, "old1");
    const res = await synthesize("elevenlabs", { text: "Shalom.", voice: "old1", group: "men", previous: "Before.", next: "After." });
    assert.equal(res.status, 200);
    const speech = sent.filter((s) => s.url.includes("/text-to-speech/"));
    assert.equal(speech.length, 2);
    assert.equal(speech[0].body?.model_id, "eleven_v4");
    assert.equal(speech[0].body?.previous_text, "Before.");
    assert.ok(speech[0].body?.voice_settings);
    assert.equal(speech[1].body?.voice_settings, undefined);
    assert.match(speech[1].url, /\/text-to-speech\/old1\?/);
    // The key goes only to the service, in its header; the text sent is only the piece and its neighbours.
    assert.deepEqual(Object.keys(speech[0].body ?? {}).sort(), ["model_id", "next_text", "previous_text", "text", "voice_settings"]);
  } finally {
    globalThis.fetch = realFetch;
    forgetVoiceList();
    process.env = keep;
  }
});
