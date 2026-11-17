"use client";

/*
 * The Daven tab's Calendar (the Luach): a month with each day's Hebrew date and a mark for what it
 * is (a festival, a fast, Rosh Chodesh); Shabbat shows the parsha. Tapping a day shows what it is,
 * what changes in the davening, and its times. From the calendar (lib/calendar/luach.ts).
 */

import { useEffect, useState } from "react";
import type { DaySummary } from "@/lib/calendar/place";
import type { LuachMonth } from "@/lib/calendar/luach";
import { deviceWhen } from "@/lib/calendar/device";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Shabbat"];
const KIND_WORDS: Record<string, string> = { holiday: "Festival", fast: "Fast", roshChodesh: "Rosh Chodesh", parsha: "Parsha", special: "Special Shabbat", modern: "Israel" };

export default function DavenLuach({ day }: { day: DaySummary | null }) {
  const todayDate = day?.date ?? new Date().toISOString().slice(0, 10);
  const [ym, setYm] = useState(() => ({ y: Number(todayDate.slice(0, 4)), m: Number(todayDate.slice(5, 7)) }));
  const [month, setMonth] = useState<LuachMonth | null>(null);
  const [failed, setFailed] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [detail, setDetail] = useState<DaySummary | null>(null);

  useEffect(() => {
    let live = true;
    setFailed(false);
    fetch("/api/daven/month", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ year: ym.y, month: ym.m, when: deviceWhen() }) })
      .then((r) => (r.ok ? (r.json() as Promise<LuachMonth>) : Promise.reject()))
      .then((m) => live && setMonth(m))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [ym]);

  useEffect(() => {
    if (!picked) return;
    if (picked === todayDate && day) {
      setDetail(day);
      return;
    }
    let live = true;
    setDetail(null);
    fetch("/api/daven/day", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date: picked, when: deviceWhen() }) })
      .then((r) => (r.ok ? (r.json() as Promise<DaySummary>) : Promise.reject()))
      .then((d) => live && setDetail(d))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [picked, todayDate, day]);

  const move = (k: number) => {
    setPicked(null);
    setYm(({ y, m }) => {
      const n = m + k;
      return n < 1 ? { y: y - 1, m: 12 } : n > 12 ? { y: y + 1, m: 1 } : { y, m: n };
    });
  };

  const lead = month?.days[0]?.dow ?? 0;
  const sel = month?.days.find((x) => x.date === picked);
  return (
    <div className="dl">
      <div className="dl-head">
        <button type="button" className="rb-btn" onClick={() => move(-1)} aria-label="Previous month">
          ‹
        </button>
        <div className="dl-title">
          <span>{month?.title ?? "…"}</span>
          {month && <span className="dl-heb">{month.hebrewTitle}</span>}
        </div>
        <button type="button" className="rb-btn" onClick={() => move(1)} aria-label="Next month">
          ›
        </button>
      </div>
      {failed && <p className="note">The calendar couldn&apos;t be loaded. Check the connection and try again.</p>}
      {month && (
        <div className="dl-grid" role="grid" aria-label={`${month.title}, ${month.hebrewTitle}`}>
          {DOW.map((d) => (
            <span key={d} className="dl-dow" role="columnheader">
              {d === "Shabbat" ? "Sat" : d}
            </span>
          ))}
          {Array.from({ length: lead }, (_, i) => (
            <span key={`b${i}`} />
          ))}
          {month.days.map((d) => {
            const marks = d.events.filter((e) => e.kind !== "parsha");
            return (
              <button
                key={d.date}
                type="button"
                role="gridcell"
                aria-selected={picked === d.date}
                className={`dl-day${d.date === todayDate ? " today" : ""}${picked === d.date ? " on" : ""}${d.dow === 6 ? " shabbat" : ""}`}
                onClick={() => setPicked(d.date === picked ? null : d.date)}
                aria-label={`${d.date}, ${d.hebrew}${d.events.length ? `: ${d.events.map((e) => e.title).join(", ")}` : ""}`}
              >
                <span className="dl-num">{Number(d.date.slice(8))}</span>
                <span className="dl-he" lang="he" dir="rtl">
                  {d.heDay}
                </span>
                {marks.length > 0 && (
                  <span className="dl-dots" aria-hidden="true">
                    {marks.slice(0, 3).map((e, i) => (
                      <span key={i} className={`dl-dot ${e.kind}`} />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
      <ul className="dl-key" aria-label="What the marks mean">
        {(["holiday", "roshChodesh", "fast", "modern"] as const).map((k) => (
          <li key={k}>
            <span className={`dl-dot ${k}`} aria-hidden="true" /> {KIND_WORDS[k]}
          </li>
        ))}
      </ul>
      {sel && (
        <section className="dl-detail" aria-live="polite">
          <h4>
            {new Date(`${sel.date}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} · {sel.hebrew}
          </h4>
          {sel.events.length > 0 && (
            <ul className="dl-events">
              {sel.events.map((e) => (
                <li key={e.title}>
                  <span className={`dl-dot ${e.kind}`} aria-hidden="true" /> {e.title}
                </li>
              ))}
            </ul>
          )}
          {detail?.davening?.notes && detail.davening.notes.length > 0 && (
            <ul className="dl-notes">
              {detail.davening.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          )}
          {detail?.zmanim && detail.zmanim.items.length > 0 && (
            <details className="dl-times">
              <summary>Times{detail.place ? ` in ${detail.place.name}` : ""}</summary>
              <ul>
                {detail.zmanim.items.map((z) => (
                  <li key={`${z.id}-${z.note ?? ""}`}>
                    <span>
                      {z.label}
                      {z.note && <span className="dt-note">{z.note}</span>}
                    </span>
                    <span className="dt-time">{z.time}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
          {detail?.daf && <p className="dl-daf">Daf Yomi: {detail.daf.text}</p>}
          <p className="fine-left">The davening notes are RabbAI&apos;s reading of the calendar, not yet reviewed by the rabbinic board.</p>
        </section>
      )}
    </div>
  );
}
