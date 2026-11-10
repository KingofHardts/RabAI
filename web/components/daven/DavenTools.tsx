"use client";

import { useEffect, useMemo, useState } from "react";
import type { DaySummary, Place } from "@/lib/calendar/place";
import { deviceWhen } from "@/lib/calendar/device";
import { calendarFile, downloadCalendar, type CalendarEvent } from "@/lib/calendar/ics";
import type { YahrzeitDate } from "@/lib/calendar/reminders";
import { monthlyTehillim, weeklyTehillim } from "@/lib/calendar/tehillim";
import { bearingToJerusalem, directionWords } from "@/lib/geo/mizrach";

/*
 * The Daven tab's tools, under the services on its home: tonight's Omer, today's Tehillim,
 * reminders for the person's own calendar (Mincha, Kiddush Levana, the Omer), yahrzeits, the
 * direction to Jerusalem, which bracha to say, and finding a minyan. Lists the person keeps
 * (names for Tehillim, yahrzeits) stay on this device only. Halacha questions go to the chat,
 * where the answer is checked against the sources like any other.
 */

const NAMES_KEY = "rabai_tehillim_names";
/** A date (YYYY-MM-DD) as "Friday, February 26, 2027". */
const longDate = (ymd: string) => new Date(`${ymd}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
const YAHRZEIT_KEY = "rabai_yahrzeits";

interface Yahrzeit {
  id: string;
  name: string;
  date: string;
  afterSunset: boolean;
}

function readList<T>(key: string, ok: (x: unknown) => x is T): T[] {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? "[]") as unknown;
    return Array.isArray(v) ? v.filter(ok).slice(0, 50) : [];
  } catch {
    return [];
  }
}

function keepList(key: string, list: unknown[]) {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    /* storage unavailable */
  }
}

const isName = (x: unknown): x is string => typeof x === "string" && x.trim().length > 0 && x.length <= 80;
const isYahrzeit = (x: unknown): x is Yahrzeit => {
  const y = x as Yahrzeit;
  return !!y && typeof y.id === "string" && typeof y.name === "string" && /^\d{4}-\d{2}-\d{2}$/.test(y.date ?? "") && typeof y.afterSunset === "boolean";
};

/** "3 weeks and 2 days" for an Omer count. */
export function omerWords(n: number): string {
  const weeks = Math.floor(n / 7);
  const days = n % 7;
  const w = weeks ? `${weeks} ${weeks === 1 ? "week" : "weeks"}` : "";
  const d = days ? `${days} ${days === 1 ? "day" : "days"}` : "";
  return [w, d].filter(Boolean).join(" and ");
}

async function reminders(body: Record<string, unknown>): Promise<{ items?: Array<{ title: string; start: string; notes?: string }>; error?: string }> {
  try {
    const res = await fetch("/api/daven/reminders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, when: deviceWhen() }) });
    return (await res.json()) as { items?: Array<{ title: string; start: string; notes?: string }>; error?: string };
  } catch {
    return { error: "The reminders couldn't be made just now." };
  }
}

function addToCalendar(name: string, file: string, items: Array<{ title: string; start: string; notes?: string }>, uidBase: string, minutes = 15) {
  const events: CalendarEvent[] = items.map((it, i) => ({ uid: `${uidBase}-${i}-${it.start.slice(0, 10)}`, title: it.title, start: new Date(it.start), minutes, notes: it.notes, alarmBefore: 0 }));
  downloadCalendar(file, calendarFile(name, events));
}

export default function DavenTools({
  day,
  place,
  onAsk,
  onLearn,
  onOpen,
  onPlace,
}: {
  day: DaySummary | null;
  place: Place | null;
  onAsk: (question: string) => void;
  /** Opens a text in the reader (Learn). */
  onLearn: (ref: string) => void;
  /** Opens a section of the siddur by its name, in the Daven tab. */
  onOpen: (name: string) => boolean;
  onPlace: () => void;
}) {
  const davening = day?.davening;
  const [note, setNote] = useState<string | null>(null);
  const [names, setNames] = useState<string[]>([]);
  const [newName, setNewName] = useState("");
  const [weekly, setWeekly] = useState(false);
  const [yahrzeits, setYahrzeits] = useState<Yahrzeit[]>([]);
  const [yForm, setYForm] = useState({ name: "", date: "", afterSunset: false });
  const [yDates, setYDates] = useState<Record<string, { hebrew: string; dates: YahrzeitDate[] } | { error: string }>>({});
  const [minchaBefore, setMinchaBefore] = useState(30);
  const [levanaFrom, setLevanaFrom] = useState<3 | 7>(3);
  const [omerTime, setOmerTime] = useState("20:30");
  const [food, setFood] = useState("");
  const [heading, setHeading] = useState<number | null>(null);
  const [compassError, setCompassError] = useState<string | null>(null);

  useEffect(() => {
    setNames(readList(NAMES_KEY, isName));
    setYahrzeits(readList(YAHRZEIT_KEY, isYahrzeit));
  }, []);

  // The coming dates of each yahrzeit, from its date alone (the name stays on this device).
  useEffect(() => {
    for (const y of yahrzeits) {
      if (yDates[y.id]) continue;
      void fetch("/api/daven/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "yahrzeit", date: y.date, afterSunset: y.afterSunset }),
      })
        .then((r) => r.json())
        .then((j: { hebrew?: string; dates?: YahrzeitDate[]; error?: string }) =>
          setYDates((prev) => ({ ...prev, [y.id]: j.hebrew && j.dates ? { hebrew: j.hebrew, dates: j.dates } : { error: j.error ?? "Couldn't work out the dates." } })),
        )
        .catch(() => setYDates((prev) => ({ ...prev, [y.id]: { error: "Couldn't work out the dates just now." } })));
    }
  }, [yahrzeits, yDates]);

  const dayOfMonth = useMemo(() => Number(day?.hebrew?.match(/^(\d{1,2})\s/)?.[1] ?? 0), [day?.hebrew]);
  const portions = weekly ? [weeklyTehillim(davening?.dow ?? new Date().getDay())] : dayOfMonth ? monthlyTehillim(dayOfMonth) : [];
  const bearing = place ? bearingToJerusalem(place) : null;

  const flash = (text: string) => {
    setNote(text);
    window.setTimeout(() => setNote((n) => (n === text ? null : n)), 4000);
  };

  const omerReminders = () => {
    const n = davening?.omerTonight;
    if (!n) return;
    const [h, m] = omerTime.split(":").map(Number);
    const now = new Date();
    // Tonight's count is tonight's date; before nightfall, today.
    const events: CalendarEvent[] = [];
    for (let k = n; k <= 49; k++) {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (k - n), h, m);
      events.push({ uid: `omer-${date.getFullYear()}-${k}`, title: `Count the Omer: day ${k} tonight`, start: date, minutes: 10, notes: `Tonight is day ${k} of the Omer: ${omerWords(k)}.`, alarmBefore: 0 });
    }
    downloadCalendar("count-the-omer.ics", calendarFile("Counting the Omer", events));
    flash("A calendar file with a reminder each night was downloaded. Open it to add the reminders to your calendar.");
  };

  const compass = async () => {
    setCompassError(null);
    const D = (window as unknown as { DeviceOrientationEvent?: { requestPermission?: () => Promise<string> } }).DeviceOrientationEvent;
    try {
      if (D?.requestPermission && (await D.requestPermission()) !== "granted") {
        setCompassError("The compass needs permission to use the phone's motion sensors.");
        return;
      }
    } catch {
      setCompassError("The compass couldn't be started here.");
      return;
    }
    const on = (e: DeviceOrientationEvent & { webkitCompassHeading?: number }) => {
      const h = typeof e.webkitCompassHeading === "number" ? e.webkitCompassHeading : e.absolute && e.alpha !== null ? (360 - e.alpha) % 360 : null;
      if (h !== null) setHeading(h);
    };
    window.addEventListener("deviceorientationabsolute" as "deviceorientation", on as EventListener, true);
    window.addEventListener("deviceorientation", on as EventListener, true);
    window.setTimeout(() => setHeading((h) => (h === null ? (setCompassError("This device doesn't report a compass direction. Use the direction in words."), null) : h)), 2500);
  };

  const addName = () => {
    const v = newName.trim().slice(0, 80);
    if (!v) return;
    const next = [...names, v].slice(0, 50);
    setNames(next);
    keepList(NAMES_KEY, next);
    setNewName("");
  };

  const addYahrzeit = () => {
    if (!yForm.name.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(yForm.date)) return;
    const next = [...yahrzeits, { id: `${Date.now().toString(36)}`, name: yForm.name.trim().slice(0, 80), date: yForm.date, afterSunset: yForm.afterSunset }].slice(0, 50);
    setYahrzeits(next);
    keepList(YAHRZEIT_KEY, next);
    setYForm({ name: "", date: "", afterSunset: false });
  };

  const yahrzeitCalendar = (y: Yahrzeit) => {
    const d = yDates[y.id];
    if (!d || "error" in d) return;
    const events: CalendarEvent[] = d.dates.map((x) => {
      const [yy, mm, dd] = x.date.split("-").map(Number);
      return {
        uid: `yahrzeit-${y.id}-${x.date}`,
        title: `Yahrzeit of ${y.name} (${x.hebrew})`,
        start: new Date(yy, mm - 1, dd),
        allDay: true,
        notes:
          "The yahrzeit begins the evening before, at sunset. Many light a yahrzeit candle then and say Kaddish." +
          (x.adarII ? ` This is a leap year: some keep the yahrzeit in Adar II instead (${longDate(x.adarII.date)}), and some keep both. Ask your rav.` : ""),
      };
    });
    downloadCalendar(`yahrzeit-${y.name.replace(/[^\w]+/g, "-").toLowerCase() || "dates"}.ics`, calendarFile(`Yahrzeit: ${y.name}`, events));
    flash("A calendar file with the coming yahrzeits was downloaded. Open it to add them to your calendar.");
  };

  return (
    <div className="sd-tools">
      <h3 className="sd-block-h">Tools</h3>
      {note && (
        <p className="sd-tool-note" role="status">
          {note}
        </p>
      )}
      <div className="sd-tool-grid">
        {davening?.omerTonight && (
          <details className="sd-tool" aria-label="Counting the Omer" open>
          <summary>
            <span className="sd-tool-title">Counting the Omer</span>
            <span className="sd-tool-sub">Tonight's count, and a reminder</span>
          </summary>
            <p>
              {day?.afterSunset ? "Tonight" : "Tonight, after nightfall"}: day {davening.omerTonight}
              {davening.omerTonight >= 7 ? ` (${omerWords(davening.omerTonight)})` : ""}.
            </p>
            <div className="sd-tool-row">
              <button type="button" className="btn" onClick={() => onOpen("Counting of the Omer") || flash("This siddur has no Counting of the Omer.")}>
                Count now
              </button>
              <label className="sd-tool-inline">
                Remind me at{" "}
                <input type="time" value={omerTime} onChange={(e) => setOmerTime(e.target.value)} aria-label="Reminder time for the Omer" />
              </label>
              <button type="button" className="btn quiet" onClick={omerReminders}>
                Remind me each night
              </button>
            </div>
          </details>
        )}

        <details className="sd-tool" aria-label="Today's Tehillim">
          <summary>
            <span className="sd-tool-title">Today&apos;s Tehillim</span>
            <span className="sd-tool-sub">The day's psalms, and names to say them for</span>
          </summary>
          <div className="seg sd-tool-seg" role="group" aria-label="Tehillim cycle">
            <button type="button" aria-pressed={!weekly} onClick={() => setWeekly(false)}>
              Monthly
            </button>
            <button type="button" aria-pressed={weekly} onClick={() => setWeekly(true)}>
              Weekly
            </button>
          </div>
          {portions.length ? (
            portions.map((p) => (
              <div key={p.label}>
                <p className="sd-tool-label">{p.label}</p>
                <div className="sd-chips">
                  {p.chapters.map((c) => (
                    <button key={c} type="button" className="chip" onClick={() => onLearn(`Psalms ${c}`)}>
                      {c}
                      {p.verses ? `:${p.verses.replace("-", "–")}` : ""}
                    </button>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <p className="muted">Today&apos;s date hasn&apos;t arrived yet.</p>
          )}
          {!weekly && dayOfMonth === 29 && <p className="fine-left">If this month has 29 days, also say day 30&apos;s psalms (145–150) today.</p>}
          <details className="sd-tool-more">
            <summary>Names for a refuah (healing){names.length ? ` · ${names.length}` : ""}</summary>
            <ul className="sd-names">
              {names.map((n, i) => (
                <li key={`${n}-${i}`}>
                  <span>{n}</span>
                  <button
                    type="button"
                    className="link"
                    onClick={() => {
                      const next = names.filter((_, j) => j !== i);
                      setNames(next);
                      keepList(NAMES_KEY, next);
                    }}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <div className="sd-tool-row">
              <input value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addName()} placeholder="Name, son/daughter of mother's name" aria-label="A name to say Tehillim for" />
              <button type="button" className="btn quiet" onClick={addName}>
                Add
              </button>
            </div>
            <p className="fine-left">Kept on this device only.</p>
          </details>
        </details>

        <details className="sd-tool" aria-label="Reminders">
          <summary>
            <span className="sd-tool-title">Reminders</span>
            <span className="sd-tool-sub">For Mincha and the new moon, in your own calendar</span>
          </summary>
          <p className="fine-left">Added to your own calendar, as a calendar file. Nothing is kept here.</p>
          <div className="sd-tool-row">
            <span>Mincha,</span>
            <select value={minchaBefore} onChange={(e) => setMinchaBefore(Number(e.target.value))} aria-label="Minutes before sunset">
              {[15, 30, 45, 60].map((m) => (
                <option key={m} value={m}>
                  {m} minutes
                </option>
              ))}
            </select>
            <span>before sunset</span>
            <button
              type="button"
              className="btn quiet"
              onClick={async () => {
                if (!place) return onPlace();
                const r = await reminders({ kind: "mincha", minutes: minchaBefore });
                if (r.items?.length) {
                  addToCalendar("Mincha", "mincha-reminders.ics", r.items, "mincha");
                  flash("A calendar file with a reminder for the next 30 days was downloaded.");
                } else flash(r.error ?? "No reminders could be made.");
              }}
            >
              {place ? "Add" : "Set your place"}
            </button>
          </div>
          <div className="sd-tool-row">
            <span>Kiddush Levana, from</span>
            <select value={levanaFrom} onChange={(e) => setLevanaFrom(Number(e.target.value) === 7 ? 7 : 3)} aria-label="Days after the molad">
              <option value={3}>3 days</option>
              <option value={7}>7 days</option>
            </select>
            <span>after the molad</span>
            <button
              type="button"
              className="btn quiet"
              onClick={async () => {
                const r = await reminders({ kind: "kiddush-levana", from: levanaFrom });
                if (r.items?.length) {
                  addToCalendar("Kiddush Levana", "kiddush-levana.ics", r.items, `levana${levanaFrom}`);
                  flash("A calendar file for the coming six months was downloaded.");
                } else flash(r.error ?? "No reminders could be made.");
              }}
            >
              Add
            </button>
          </div>
        </details>

        <details className="sd-tool" aria-label="Yahrzeits">
          <summary>
            <span className="sd-tool-title">Yahrzeits</span>
            <span className="sd-tool-sub">The coming dates, kept on this device</span>
          </summary>
          {yahrzeits.length > 0 && (
            <ul className="sd-yahrzeits">
              {yahrzeits.map((y) => {
                const d = yDates[y.id];
                const next = d && !("error" in d) ? d.dates[0] : null;
                return (
                  <li key={y.id}>
                    <p className="sd-y-name">{y.name}</p>
                    {d && "error" in d && <p className="muted">{d.error}</p>}
                    {d && !("error" in d) && (
                      <p className="muted">
                        {d.hebrew}
                        {next ? `. Next: ${longDate(next.date)}, beginning the evening before.` : ""}
                        {next?.adarII ? ` That year has two Adars: some keep it in Adar II instead (${longDate(next.adarII.date)}), and some keep both. Ask your rav.` : ""}
                      </p>
                    )}
                    <div className="sd-tool-row">
                      <button type="button" className="btn quiet" disabled={!next} onClick={() => yahrzeitCalendar(y)}>
                        Add to calendar
                      </button>
                      <button
                        type="button"
                        className="link"
                        onClick={() => {
                          const list = yahrzeits.filter((x) => x.id !== y.id);
                          setYahrzeits(list);
                          keepList(YAHRZEIT_KEY, list);
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="sd-y-form">
            <input value={yForm.name} onChange={(e) => setYForm({ ...yForm, name: e.target.value })} placeholder="Name" aria-label="Name" />
            <input type="date" value={yForm.date} onChange={(e) => setYForm({ ...yForm, date: e.target.value })} aria-label="Date of passing" />
            <label className="sd-tool-inline">
              <input type="checkbox" checked={yForm.afterSunset} onChange={(e) => setYForm({ ...yForm, afterSunset: e.target.checked })} /> After sunset
            </label>
            <button type="button" className="btn quiet" onClick={addYahrzeit} disabled={!yForm.name.trim() || !yForm.date}>
              Add
            </button>
          </div>
          <p className="fine-left">
            Kept on this device only; only the date is used to work out the yahrzeit. For a passing in Adar, customs differ in a leap year: ask your rav.
          </p>
        </details>

        <details className="sd-tool" aria-label="Facing Jerusalem">
          <summary>
            <span className="sd-tool-title">Facing Jerusalem</span>
            <span className="sd-tool-sub">Which way to face</span>
          </summary>
          {bearing === null ? (
            <p>
              <button type="button" className="link" onClick={onPlace}>
                Set your place
              </button>{" "}
              to see which way to face.
            </p>
          ) : (
            <>
              <p>
                From {place?.name ?? "here"}, Jerusalem is to the {directionWords(bearing)} ({Math.round(bearing)}° from north).
              </p>
              {heading !== null ? (
                <div className="sd-compass" aria-label={`Turn until the arrow points up. It points ${Math.round((bearing - heading + 360) % 360)} degrees from straight ahead.`}>
                  <span style={{ transform: `rotate(${(bearing - heading + 360) % 360}deg)` }} aria-hidden="true">
                    ↑
                  </span>
                </div>
              ) : (
                <button type="button" className="btn quiet" onClick={() => void compass()}>
                  Use the compass
                </button>
              )}
              {compassError && <p className="muted">{compassError}</p>}
            </>
          )}
        </details>

        <details className="sd-tool" aria-label="Which bracha">
          <summary>
            <span className="sd-tool-title">Which bracha?</span>
            <span className="sd-tool-sub">Ask which blessing a food gets</span>
          </summary>
          <div className="sd-tool-row">
            <input value={food} onChange={(e) => setFood(e.target.value)} placeholder="What are you eating or drinking?" aria-label="What are you eating or drinking?" onKeyDown={(e) => e.key === "Enter" && food.trim() && onAsk(`What bracha do I say before and after eating ${food.trim()}?`)} />
            <button type="button" className="btn" disabled={!food.trim()} onClick={() => onAsk(`What bracha do I say before and after eating ${food.trim()}?`)}>
              Ask
            </button>
          </div>
          <div className="sd-chips">
            {["bread", "cake or cookies", "wine or grape juice", "an apple", "a banana", "rice", "chocolate", "water"].map((f) => (
              <button key={f} type="button" className="chip" onClick={() => onAsk(`What bracha do I say before and after eating ${f}?`)}>
                {f}
              </button>
            ))}
          </div>
          <p className="fine-left">
            Answered in the chat from the sources.{" "}
            <button type="button" className="link" onClick={() => onOpen("Blessings on Pleasures, Sights and Sounds") || flash("This siddur has no section of blessings.")}>
              The blessings in the siddur
            </button>
          </p>
        </details>

        <details className="sd-tool" aria-label="Find a minyan">
          <summary>
            <span className="sd-tool-title">Find a minyan</span>
            <span className="sd-tool-sub">Near you</span>
          </summary>
          <p>GoDaven lists minyanim and their times around the world.</p>
          <a className="btn quiet" href="https://www.godaven.com/" target="_blank" rel="noopener noreferrer">
            Open GoDaven ↗
          </a>
        </details>
      </div>
    </div>
  );
}
