"use client";

import { useEffect, useState } from "react";
import { parseMyWords, type MyWord } from "@/lib/voice/lexicon";
import { SAY_MODES, type SayMode } from "@/lib/voice/speech-text";
import { saidAs, setMyWords, setSayMode, type OwnVoices } from "./voice";

/*
 * Settings: how RabbAI's voice says words. The person can hear any word or sentence and see what
 * the voice is given, choose how the stress of Hebrew and of names is shown to the voice, and fix
 * a word themselves. Their fixes are kept on this device only; "Copy my fixes" lets them send the
 * list to be added for everyone (lib/voice/lexicon.ts).
 */

const MODE_KEY = "rabai_say_mode";
const WORDS_KEY = "rabai_my_words";

/** The stored choices, set for the voice; called once when the app opens. */
export function loadPronunciation(): { mode: SayMode; words: MyWord[] } {
  let mode: SayMode = "auto";
  let words: MyWord[] = [];
  try {
    const m = window.localStorage.getItem(MODE_KEY);
    if (m && (SAY_MODES as string[]).includes(m)) mode = m as SayMode;
    words = parseMyWords(JSON.parse(window.localStorage.getItem(WORDS_KEY) ?? "[]"));
  } catch {
    /* storage is unavailable */
  }
  setSayMode(mode);
  setMyWords(words);
  return { mode, words };
}

const MODE_LABEL: Record<SayMode, string> = { auto: "Auto", sounds: "Sounds", capitals: "Capitals", plain: "Plain" };
const MODE_ABOUT: Record<SayMode, string> = {
  auto: "Names are given to the voice as exact sounds where it can read them, and Hebrew with the stressed part in capitals. The usual choice.",
  sounds: "Names and Hebrew are both given as exact sounds. Most exact, but a voice can stumble on a long passage of them.",
  capitals: "The stressed part of each word is written in capitals (baRUKH aTAH).",
  plain: "Words are respelled, with no stress shown: the voice decides where the stress goes.",
};

const store = (key: string, value: string) => {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage is unavailable */
  }
};

export default function Pronunciation({ own, onHear }: { own: OwnVoices | null; onHear: (text: string) => void }) {
  const [mode, setMode] = useState<SayMode>("auto");
  const [words, setWords] = useState<MyWord[]>([]);
  const [sample, setSample] = useState("RabbAI: Rashi and Tosafot on the Gemara, and the Shulchan Aruch.");
  const [written, setWritten] = useState("");
  const [say, setSay] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const kept = loadPronunciation();
    setMode(kept.mode);
    setWords(kept.words);
  }, []);
  const ownOn = !!own?.available;
  const sounds = !!own?.sounds;

  const chooseMode = (m: SayMode) => {
    setMode(m);
    setSayMode(m);
    store(MODE_KEY, m);
  };
  const keep = (list: MyWord[]) => {
    const clean = parseMyWords(list);
    setWords(clean);
    setMyWords(clean);
    store(WORDS_KEY, JSON.stringify(clean));
  };
  const add = () => {
    const w = written.trim();
    const s = say.trim();
    if (!w || !s) return;
    keep([{ written: w, say: s }, ...words.filter((x) => x.written.toLowerCase() !== w.toLowerCase())]);
    setWritten("");
    setSay("");
  };
  const copy = () => {
    const text = words.map((x) => `${x.written} = ${x.say}`).join("\n");
    void navigator.clipboard?.writeText(text).then(
      () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      },
      () => undefined,
    );
  };
  // What the voice is given for the sample, with the choices as they stand now.
  const given = saidAs(sample, ownOn, sounds);
  // `mode` and `words` are read through the voice's own copies; naming them here keeps the line fresh.
  void mode;
  void words;

  return (
    <details className="pron">
      <summary>Pronunciation: how RabbAI says words</summary>
      <div className="pron-body">
        <label className="pron-label" htmlFor="pron-sample">
          Try a word or a sentence
        </label>
        <div className="pron-row">
          <input id="pron-sample" type="text" value={sample} maxLength={300} onChange={(e) => setSample(e.target.value)} autoComplete="off" spellCheck={false} />
          <button type="button" className="btn quiet" disabled={!sample.trim()} onClick={() => onHear(sample)}>
            Hear it
          </button>
        </div>
        {sample.trim() && (
          <p className="pron-given">
            <span className="pron-k">The voice is given:</span> <span className="pron-said">{given}</span>
          </p>
        )}

        {ownOn && (
          <>
            <span className="pron-label" id="pron-mode-label">
              Where the stress falls, in Hebrew and in names
            </span>
            <div className="seg" role="radiogroup" aria-labelledby="pron-mode-label">
              {SAY_MODES.map((m) => (
                <button key={m} type="button" role="radio" aria-checked={mode === m} className={mode === m ? "on" : ""} onClick={() => chooseMode(m)}>
                  {MODE_LABEL[m]}
                </button>
              ))}
            </div>
            <p className="fine-left">
              {MODE_ABOUT[mode]}
              {(mode === "auto" || mode === "sounds") && !sounds ? " This voice doesn't read exact sounds, so it is given capitals." : ""}
              {(mode === "auto" || mode === "sounds") && sounds ? " In Talk the quick voice is given capitals." : ""}
            </p>
          </>
        )}

        <span className="pron-label">Fix a word yourself</span>
        <div className="pron-fix">
          <input type="text" value={written} maxLength={40} placeholder="The word as written (Ritva)" aria-label="The word as it is written" onChange={(e) => setWritten(e.target.value)} autoComplete="off" spellCheck={false} />
          <input type="text" value={say} maxLength={80} placeholder="Say it as (RIT-vah)" aria-label="How to say it" onChange={(e) => setSay(e.target.value)} autoComplete="off" spellCheck={false} />
          <button type="button" className="btn quiet" disabled={!say.trim()} onClick={() => onHear(say)}>
            Hear
          </button>
          <button type="button" className="btn" disabled={!written.trim() || !say.trim()} onClick={add}>
            Save
          </button>
        </div>
        <p className="fine-left">
          Write it the way it sounds, with the stressed part in CAPITALS and &ldquo;kh&rdquo; for the throaty sound. Press Hear until it is right, then Save. Kept on this device only.
        </p>
        {words.length > 0 && (
          <>
            <ul className="pron-list">
              {words.map((x) => (
                <li key={x.written}>
                  <span className="pron-w">{x.written}</span>
                  <span className="pron-s">{x.say}</span>
                  <button type="button" className="link" onClick={() => onHear(x.written)}>
                    Hear
                  </button>
                  <button type="button" className="link" aria-label={`Remove the fix for ${x.written}`} onClick={() => keep(words.filter((y) => y.written !== x.written))}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" className="btn quiet" onClick={copy}>
              {copied ? "Copied" : "Copy my fixes"}
            </button>
            <span className="fine-left pron-copy-note"> Send them to be added for everyone.</span>
          </>
        )}
      </div>
    </details>
  );
}
