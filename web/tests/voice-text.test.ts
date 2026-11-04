import { test } from "node:test";
import assert from "node:assert/strict";
import { respell } from "../lib/voice/lexicon";
import { namesForLearning, speechChunks, speechText } from "../lib/voice/speech-text";
import { voiceInstructions, voiceProvider } from "../lib/voice/provider";
import { openAiVoices, rankElevenVoices } from "../lib/voice/voices";

test("names of rabbis and books are respelled for a voice, keeping capitals", () => {
  assert.equal(respell("Rashi and Tosafot; the Shulchan Aruch."), "Rah-shee and Toe-sah-fote; the Shool-khahn Ah-rookh.");
  assert.equal(respell("Moshe Rabbeinu and Moshe"), "Mo-sheh Rah-bay-noo and Mo-sheh");
  assert.equal(respell("halacha, Chazal's view"), "ha-la-kha, Kha-zal's view");
});

test("short names match only as written, and never inside another word", () => {
  assert.equal(respell("The Ran agrees. He ran home."), "The Rahn agrees. He ran home.");
  assert.equal(respell("Tosafot-like, Rashism"), "Tosafot-like, Rashism");
});

test("God's names are said as in learning, not as in prayer", () => {
  assert.equal(speechText("בָּרוּךְ אַתָּה יְהוָה אֱלֹהֵינוּ", "sephardi"), "Baruch atah Ha-Shem Elokeinu");
  assert.equal(speechText("Baruch atah Adonai, Eloheinu; Elohim created.", "sephardi"), "Baruch atah Ha-Shem, Elokeinu; Elokim created.");
  assert.equal(namesForLearning("ברוך אתה ה׳ אלהינו", true), "ברוך אתה השם אלקינו");
  // אֵלֶּה ("these") is not one of the names.
  assert.equal(namesForLearning("אלה הדברים"), "אלה הדברים");
});

test("an answer loses its marks and links, and pointed Hebrew is said in English letters", () => {
  assert.equal(speechText("**Rashi** says [1] see https://example.com. Done.", "ashkenazi"), "Rah-shee says see. Done.");
  assert.equal(speechText("Say מוֹדֶה אֲנִי first.", "ashkenazi"), "Say Modeh ani first.");
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
  assert.equal(respell("Chazal and the Shulchan Aruch", "natural"), "Kha-zal and the Shool-khahn Ah-rookh");
  assert.equal(respell("The Ran says Hashem's Gemara", "natural"), "The Rahn says Ha-Shem's Geh-mah-rah");
  assert.equal(speechText("**Rashi** on Chazal", "sephardi", "natural"), "Rashi on Kha-zal");
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
