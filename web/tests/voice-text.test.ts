import { test } from "node:test";
import assert from "node:assert/strict";
import { respell } from "../lib/voice/lexicon";
import { namesForLearning, speechChunks, speechText } from "../lib/voice/speech-text";
import { voiceProvider } from "../lib/voice/provider";

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
    assert.equal(voiceProvider(), "openai", "ElevenLabs needs a voice id too");
    process.env.ELEVENLABS_VOICE_ID = "v";
    assert.equal(voiceProvider(), "elevenlabs");
    process.env.RABAI_VOICE_PROVIDER = "openai";
    assert.equal(voiceProvider(), "openai");
    process.env.RABAI_VOICE_PROVIDER = "off";
    assert.equal(voiceProvider(), null);
  } finally {
    process.env = keep;
  }
});
