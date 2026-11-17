"use client";

/*
 * The Daven tab's Times: the day's times at the person's place, grouped by the part of the day,
 * with what comes next and how long until it, and a strip of dates to see another day. Both
 * opinions are named where the calendar gives two (the server's calendar); RabbAI never picks
 * one. From the server's calendar (Hebcal, KosherJava's calculations), as everywhere in the app.
 */

import { useEffect, useMemo, useState } from "react";
import type { DaySummary, Place } from "@/lib/calendar/place";
import { deviceWhen } from "@/lib/calendar/device";

type Zman = NonNullable<DaySummary["zmanim"]>["items"][number];

const GROUPS: Array<{ title: string; ids: RegExp }> = [
  { title: "Dawn", ids: /^(alot|misheyakir|sunrise)$/ },
  { title: "Morning", ids: /^(shma|shmaMGA|tefillah|tefillahMGA)$/ },
  { title: "Midday", ids: /^(chatzot|minchaGedola|minchaKetana)$/ },
  { title: "Evening", ids: /^(plag|sunset|tzeit7083|tzeit|rabbeinuTam)$/ },
  { title: "Night", ids: /^(chatzotNight)$/ },
];

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** "6:42 am" on a date, on this device's clock. */
function at(date: string, time: string): Date | null {
  const m = time.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (!m) return null;
  let h = Number(m[1]) % 12;
  if (/pm/i.test(m[3])) h += 12;
  const d = new Date(`${date}T00:00:00`);
  d.setHours(h, Number(m[2]), 0, 0);
  return d;
}

/** "in 1 hr 12 min", "in 8 min". */
function until(ms: number): string {
  const min = Math.max(0, Math.round(ms / 60000));
  if (min < 60) return `in ${min} min`;
  const h = Math.floor(min / 60);
  const rest = min % 60;
  return `in ${h} hr${rest ? ` ${rest} min` : ""}`;
}

export default function DavenTimes({ day, place, onPlace }: { day: DaySummary | null; place: Place | null; onPlace: () => void }) {
  const today = day?.date ?? ymd(new Date());
  const [date, setDate] = useState(today);
  const [other, setOther] = useState<DaySummary | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "failed">("idle");
  const [now, setNow] = useState(() => Date.now());

  // The countdown moves once a minute.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (date === today) {
      setOther(null);
      return;
    }
    let live = true;
    setState("loading");
    fetch("/api/daven/day", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date, when: deviceWhen() }) })
      .then((r) => (r.ok ? (r.json() as Promise<DaySummary>) : Promise.reject()))
      .then((d) => {
        if (!live) return;
        setOther(d);
        setState("idle");
      })
      .catch(() => live && setState("failed"));
    return () => {
      live = false;
    };
  }, [date, today]);

  const shown = date === today ? day : other;
  const items = shown?.zmanim?.items ?? [];
  const strip = useMemo(() => {
    const base = new Date(`${today}T12:00:00`);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i - 1);
      return { date: ymd(d), dow: d.toLocaleDateString("en-US", { weekday: "short" }), num: d.getDate() };
    });
  }, [today]);

  // What comes next today, and how long until it.
  const next = useMemo(() => {
    if (date !== today) return null;
    for (const z of items) {
      const t = at(today, z.time);
      if (t && t.getTime() > now) return { z, ms: t.getTime() - now };
    }
    return null;
  }, [items, date, today, now]);

  if (!place)
    return (
      <div className="dt-empty">
        <p>The times depend on where you are.</p>
        <button type="button" className="btn" onClick={onPlace}>
          Set your place
        </button>
      </div>
    );

  return (
    <div className="dt">
      <div className="dt-strip" role="tablist" aria-label="Day">
        {strip.map((s) => (
          <button key={s.date} type="button" role="tab" aria-selected={s.date === date} className={`dt-day${s.date === date ? " on" : ""}${s.date === today ? " today" : ""}`} onClick={() => setDate(s.date)}>
            <span className="dt-dow">{s.date === today ? "Today" : s.dow}</span>
            <span className="dt-num">{s.num}</span>
          </button>
        ))}
      </div>
      {shown && (
        <p className="dt-date">
          {shown.civil} · {shown.hebrew}
          {shown.place ? ` · ${shown.place.name}` : ""}
        </p>
      )}
      {shown && shown.todayIs.length > 0 && <p className="dt-is">{shown.todayIs.join(" · ")}</p>}
      {next && (
        <div className="dt-next" role="status">
          <span className="dt-next-k">Up next</span>
          <span className="dt-next-name">{next.z.label}</span>
          <span className="dt-next-time">
            {next.z.time} · {until(next.ms)}
          </span>
          {next.z.note && <span className="dt-next-note">{next.z.note}</span>}
        </div>
      )}
      {state === "loading" && <p className="note">Loading that day<span className="dots" /></p>}
      {state === "failed" && <p className="note">That day&apos;s times couldn&apos;t be loaded. Check the connection and try again.</p>}
      {GROUPS.map((g) => {
        const list = items.filter((z: Zman) => z.id && g.ids.test(z.id));
        if (!list.length) return null;
        return (
          <section key={g.title} className="dt-group" aria-label={g.title}>
            <h4>{g.title}</h4>
            <ul>
              {list.map((z) => {
                const past = date === today && (at(today, z.time)?.getTime() ?? Infinity) < now;
                return (
                  <li key={`${z.id}-${z.note ?? ""}`} className={`${past ? "past" : ""}${next?.z === z ? " next" : ""}`}>
                    <span className="dt-label">
                      {z.label}
                      {z.note && <span className="dt-note">{z.note}</span>}
                    </span>
                    <span className="dt-time">{z.time}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      {shown?.shabbat && (
        <p className="dt-shabbat">
          Shabbat: candles {shown.shabbat.candlesDay} {shown.shabbat.candles} · ends {shown.shabbat.endsDay} {shown.shabbat.ends}
        </p>
      )}
      <p className="fine-left">
        From the calendar for your place (Hebcal, with KosherJava&apos;s calculations). Where opinions differ, both are given; ask your rav which to follow. Change the place or the
        opinions in Settings.
      </p>
    </div>
  );
}
