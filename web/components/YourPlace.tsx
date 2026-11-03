"use client";

import { useEffect, useRef, useState } from "react";
import { CITIES, cityLabel, findCities, nearestCity, type City } from "@/lib/calendar/cities";
import { deviceTimeZone, type PlaceSettings } from "@/lib/calendar/device";
import { CANDLE_MINUTES, type DaySummary, type Place, type TimesPrefs } from "@/lib/calendar/place";

/*
 * "Your place": where the person is, for the day's times (candle lighting, the end of a fast, the
 * latest Shema), and how they like those times worked out. Kept only on this device.
 */

const HAVDALAH_LABELS: Record<NonNullable<TimesPrefs["havdalah"]>, string> = {
  "8.5": "At nightfall, three small stars (the usual)",
  "42": "42 minutes after sunset",
  "50": "50 minutes after sunset",
  "72": "72 minutes after sunset (Rabbeinu Tam)",
};

function cityPlace(c: City): Place {
  return { lat: c.lat, lon: c.lon, name: cityLabel(c), tz: c.tz, ...(c.il ? { il: true } : {}), from: "set" };
}

/** Where the times come from, in a few words. */
export function placeSummary(s: PlaceSettings): string {
  if (s.place) return s.place.from === "device" ? `${s.place.name} (from this device)` : s.place.name;
  return s.approx ? "Not set. RabbAI uses your approximate area" : "Not set. RabbAI gives dates but no times";
}

export default function YourPlace({
  settings,
  onChange,
  onClose,
}: {
  settings: PlaceSettings;
  onChange: (s: PlaceSettings) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [locating, setLocating] = useState(false);
  const [problem, setProblem] = useState("");
  const [preview, setPreview] = useState<DaySummary | null>(null);
  const first = useRef<HTMLButtonElement>(null);
  const canLocate = typeof navigator !== "undefined" && "geolocation" in navigator;
  const matches = query.trim() ? findCities(query) : [];

  useEffect(() => {
    first.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Show what the times come to with these settings, so the person can see it worked.
  useEffect(() => {
    const ctrl = new AbortController();
    const tz = deviceTimeZone();
    const when = {
      ...(tz ? { tz } : {}),
      ...(settings.place ? { place: settings.place } : {}),
      prefs: settings.prefs,
      ...(settings.approx ? {} : { approx: false }),
    };
    fetch("/api/calendar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ when }), signal: ctrl.signal })
      .then((r) => (r.ok ? (r.json() as Promise<DaySummary>) : null))
      .then((d) => setPreview(d))
      .catch(() => {});
    return () => ctrl.abort();
  }, [settings]);

  const setPrefs = (change: Partial<TimesPrefs>) => {
    const prefs: TimesPrefs = { ...settings.prefs, ...change };
    for (const k of Object.keys(prefs) as Array<keyof TimesPrefs>) if (prefs[k] === undefined) delete prefs[k];
    onChange({ ...settings, prefs });
  };

  const locate = () => {
    setProblem("");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const lat = Math.round(pos.coords.latitude * 100) / 100;
        const lon = Math.round(pos.coords.longitude * 100) / 100;
        const near = nearestCity(lat, lon);
        const tz = deviceTimeZone();
        const il = tz === "Asia/Jerusalem" || Boolean(near?.il);
        onChange({
          ...settings,
          place: { lat, lon, name: near ? `Near ${cityLabel(near)}` : "Your location", ...(tz ? { tz } : {}), ...(il ? { il: true } : {}), from: "device" },
        });
      },
      (err) => {
        setLocating(false);
        setProblem(
          err.code === err.PERMISSION_DENIED
            ? "Location is turned off for RabbAI on this device. You can choose a city instead."
            : "Your device couldn't find where you are just now. You can try again, or choose a city instead.",
        );
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 10 * 60 * 1000 },
    );
  };

  return (
    <div className="about-view" role="dialog" aria-modal="true" aria-labelledby="place-title">
      <div className="about-card place-card">
        <div className="about-head">
          <h2 id="place-title">Your place</h2>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose} ref={first}>
            ✕
          </button>
        </div>
        <p className="muted">
          Candle lighting, the end of a fast and the latest time for the Shema depend on where you are. Your place stays on
          this device. It goes with each question so RabbAI can work out the times, and is never kept.
        </p>

        <div className="place-now" aria-live="polite">
          <div>
            <strong>{settings.place ? settings.place.name : "No place set"}</strong>
            <span className="muted">
              {settings.place
                ? settings.place.from === "device"
                  ? "From this device's location"
                  : "Chosen here"
                : settings.approx
                  ? "RabbAI uses the approximate area of your internet connection, which can be off by many miles."
                  : "RabbAI gives dates, but no times."}
            </span>
            {preview?.shabbat && (
              <span className="place-preview">
                This Shabbat{preview.place ? ` in ${preview.place.name}` : ""}: candles {preview.shabbat.candlesDay.split(",")[0]} at{" "}
                {preview.shabbat.candles}, ends {preview.shabbat.endsDay.split(",")[0]} at {preview.shabbat.ends}.
              </span>
            )}
          </div>
          {settings.place && (
            <button type="button" className="btn quiet" onClick={() => onChange({ ...settings, place: null })}>
              Forget
            </button>
          )}
        </div>

        {canLocate && (
          <div className="place-locate">
            <button type="button" className="btn" onClick={locate} disabled={locating}>
              {locating ? "Finding you…" : "Use my location"}
            </button>
            <span className="muted">Your device will ask first. Only the area, to about a kilometer, is saved, and only on this device.</span>
          </div>
        )}
        {problem && (
          <p className="place-problem" role="alert">
            {problem}
          </p>
        )}

        <label className="about-field">
          <span>Or choose a city</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Brooklyn, Bnei Brak, Toronto…"
            autoComplete="off"
            enterKeyHint="search"
          />
        </label>
        {matches.length > 0 && (
          <ul className="place-results" aria-label="Cities">
            {matches.map((c) => (
              <li key={`${c.name}|${c.region}`}>
                <button
                  type="button"
                  onClick={() => {
                    onChange({ ...settings, place: cityPlace(c) });
                    setQuery("");
                    setProblem("");
                  }}
                >
                  <strong>{c.name}</strong>
                  <span className="muted">{c.region}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {query.trim() && matches.length === 0 && (
          <p className="muted place-none">
            That city isn&apos;t on the list yet. Try a city near you, or use your location.
          </p>
        )}

        <label className="about-field">
          <span>Shabbat candles</span>
          <select
            value={settings.prefs.candleMins ?? ""}
            onChange={(e) => setPrefs({ candleMins: e.target.value ? Number(e.target.value) : undefined })}
          >
            <option value="">The usual (18 minutes; in Israel, the city&apos;s custom)</option>
            {CANDLE_MINUTES.map((m) => (
              <option key={m} value={m}>
                {m} minutes before sunset
              </option>
            ))}
          </select>
        </label>

        <label className="about-field">
          <span>Shabbat and Yom Tov end</span>
          <select value={settings.prefs.havdalah ?? "8.5"} onChange={(e) => setPrefs({ havdalah: e.target.value === "8.5" ? undefined : (e.target.value as TimesPrefs["havdalah"]) })}>
            {(Object.keys(HAVDALAH_LABELS) as Array<keyof typeof HAVDALAH_LABELS>).map((k) => (
              <option key={k} value={k}>
                {HAVDALAH_LABELS[k]}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="about-field">
          <legend>Daily times</legend>
          <label className="about-choice">
            <input type="radio" name="place-custom" checked={settings.prefs.custom !== "chabad"} onChange={() => setPrefs({ custom: undefined })} />
            As most calendars give them (Magen Avraham and Vilna Gaon)
          </label>
          <label className="about-choice">
            <input type="radio" name="place-custom" checked={settings.prefs.custom === "chabad"} onChange={() => setPrefs({ custom: "chabad" })} />
            As Chabad calendars give them (the Baal HaTanya)
          </label>
        </fieldset>

        <label className="switch">
          <input type="checkbox" checked={settings.approx} onChange={(e) => onChange({ ...settings, approx: e.target.checked })} />
          <span>
            <strong>When no place is set, use my approximate area</strong>
            <span className="muted">From your internet connection. It can be off by many miles, and is never kept.</span>
          </span>
        </label>

        <p className="muted place-note">
          Times are worked out the way most Jewish calendars work them out (with Hebcal, from the KosherJava calculations),
          for sea level, rounded to the minute. They can differ by a minute or two from your shul&apos;s calendar, so don&apos;t
          wait for the last minute. For your community&apos;s practice, follow your shul&apos;s calendar and your rav.
        </p>

        <div className="about-foot">
          <button type="button" className="btn primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
