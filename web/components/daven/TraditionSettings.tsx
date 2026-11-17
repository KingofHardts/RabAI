"use client";

/*
 * The person's tradition and customs, in the Daven settings (lib/siddur/tradition.ts). Choosing a
 * tradition sets every custom to its starting point; each custom can then be changed. RabbAI can
 * also offer a change from the chat, and the siddur asks when someone opens a prayer a custom left
 * out. Nothing here changes a word of a siddur.
 */

import { CUSTOMS, customsFor, NUSACH_NAMES, type DavenCustoms, type Nusach } from "@/lib/siddur/tradition";

const GROUPS: Array<{ id: (typeof CUSTOMS)[number]["group"]; title: string }> = [
  { id: "tachanun", title: "Tachanun" },
  { id: "daily", title: "Every day" },
  { id: "shabbat", title: "Shabbat" },
  { id: "festivals", title: "Festivals" },
];

export default function TraditionSettings({
  customs,
  israel,
  onChange,
  onNusach,
}: {
  customs: DavenCustoms;
  israel: boolean;
  onChange: (c: DavenCustoms) => void;
  /** A new tradition was chosen (the siddur may offer to open that tradition's siddur). */
  onNusach?: (n: Nusach) => void;
}) {
  const start = customsFor(customs.nusach);
  const changed = CUSTOMS.filter((c) => customs[c.key] !== start[c.key]).length;
  return (
    <fieldset className="sd-customs sd-tradition">
      <legend>Your tradition</legend>
      <div className="sd-nusach" role="radiogroup" aria-label="Your tradition">
        {(Object.keys(NUSACH_NAMES) as Nusach[]).map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={customs.nusach === n}
            className={`sd-nusach-opt${customs.nusach === n ? " on" : ""}`}
            onClick={() => {
              if (customs.nusach === n) return;
              onChange(customsFor(n));
              onNusach?.(n);
            }}
          >
            <span className="sd-nusach-name">{NUSACH_NAMES[n].label}</span>
            <span className="sd-nusach-about">{NUSACH_NAMES[n].about}</span>
          </button>
        ))}
      </div>
      <details className="sd-custom-list">
        <summary>
          Customs{changed ? ` · ${changed} changed from ${NUSACH_NAMES[customs.nusach].label}` : ""}
        </summary>
        <p className="fine-left">
          Each tradition starts from its usual customs; change any that your shul does differently. You can also tell RabbAI in the chat (&ldquo;we say Tachanun on Pesach Sheni&rdquo;), or
          answer when the siddur asks. RabbAI&apos;s reading, not yet reviewed by the rabbinic board.
        </p>
        {GROUPS.map((g) => {
          const items = CUSTOMS.filter((c) => c.group === g.id && (!c.where || (c.where === "israel") === israel));
          if (!items.length) return null;
          return (
            <div key={g.id} className="sd-custom-group">
              <h5>{g.title}</h5>
              {items.map((c) =>
                c.options ? (
                  <label key={c.key} className="sd-custom-choice">
                    <span>{c.label}</span>
                    <select value={String(customs[c.key])} onChange={(e) => onChange({ ...customs, [c.key]: e.target.value } as DavenCustoms)}>
                      {c.options.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <label key={c.key}>
                    <input type="checkbox" checked={customs[c.key] === true} onChange={(e) => onChange({ ...customs, [c.key]: e.target.checked } as DavenCustoms)} /> {c.label}
                    {customs[c.key] !== start[c.key] && <span className="sd-custom-mine"> · yours</span>}
                  </label>
                ),
              )}
            </div>
          );
        })}
        {changed > 0 && (
          <button type="button" className="link" onClick={() => onChange(customsFor(customs.nusach))}>
            Back to {NUSACH_NAMES[customs.nusach].label}&apos;s usual customs
          </button>
        )}
      </details>
    </fieldset>
  );
}

/** The first time the Daven tab opens: "How do you daven?", so the siddur starts from the person's tradition. */
export function TraditionWelcome({ onPick, onSkip }: { onPick: (n: Nusach) => void; onSkip: () => void }) {
  return (
    <section className="sd-welcome" aria-labelledby="sd-welcome-h">
      <h3 id="sd-welcome-h">How do you daven?</h3>
      <p>
        So the siddur shows what <em>you</em> say today. You can change it any time in the settings, tell RabbAI in the chat, or let the siddur learn: when you open something it left out,
        it asks whether you say it.
      </p>
      <div className="sd-nusach" role="group" aria-label="Your tradition">
        {(Object.keys(NUSACH_NAMES) as Nusach[]).map((n) => (
          <button key={n} type="button" className="sd-nusach-opt" onClick={() => onPick(n)}>
            <span className="sd-nusach-name">{NUSACH_NAMES[n].label}</span>
            <span className="sd-nusach-about">{NUSACH_NAMES[n].about}</span>
          </button>
        ))}
      </div>
      <button type="button" className="link" onClick={onSkip}>
        Not sure: start with Ashkenaz and learn as I go
      </button>
    </section>
  );
}
