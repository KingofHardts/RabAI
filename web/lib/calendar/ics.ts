/*
 * A calendar file (.ics) the person adds to their own calendar, for reminders: counting the Omer,
 * Mincha before sunset, a yahrzeit. Made on the device; nothing is sent anywhere. Safe on the device.
 */

export interface CalendarEvent {
  /** A stable id, so adding the file again updates the same events. */
  uid: string;
  title: string;
  /** When it starts (local time). */
  start: Date;
  /** Minutes long. */
  minutes?: number;
  /** An all-day event (a yahrzeit) on this date. */
  allDay?: boolean;
  notes?: string;
  /** A reminder this many minutes before. */
  alarmBefore?: number;
}

const pad = (n: number) => String(n).padStart(2, "0");
/** Local time, as the person's calendar reads it ("floating" time). */
const local = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
const day = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
const stamp = (d: Date) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;

/** Text as a calendar file needs it: commas, semicolons and line breaks escaped. */
export function icsText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Long lines folded at 73 characters, as the format asks. */
function fold(line: string): string {
  const out: string[] = [];
  let rest = line;
  while (rest.length > 73) {
    out.push(rest.slice(0, 73));
    rest = ` ${rest.slice(73)}`;
  }
  out.push(rest);
  return out.join("\r\n");
}

export function calendarFile(name: string, events: CalendarEvent[], now = new Date()): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//RabbAI//Daven//EN", "CALSCALE:GREGORIAN", `X-WR-CALNAME:${icsText(name)}`];
  for (const e of events) {
    lines.push("BEGIN:VEVENT", `UID:${e.uid}@rabbai`, `DTSTAMP:${stamp(now)}`);
    if (e.allDay) {
      const next = new Date(e.start.getFullYear(), e.start.getMonth(), e.start.getDate() + 1);
      lines.push(`DTSTART;VALUE=DATE:${day(e.start)}`, `DTEND;VALUE=DATE:${day(next)}`);
    } else {
      const end = new Date(e.start.getTime() + (e.minutes ?? 15) * 60000);
      lines.push(`DTSTART:${local(e.start)}`, `DTEND:${local(end)}`);
    }
    lines.push(`SUMMARY:${icsText(e.title)}`);
    if (e.notes) lines.push(`DESCRIPTION:${icsText(e.notes)}`);
    if (e.alarmBefore !== undefined) lines.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${icsText(e.title)}`, `TRIGGER:-PT${Math.max(0, Math.round(e.alarmBefore))}M`, "END:VALARM");
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

/** Downloads a calendar file in the browser. */
export function downloadCalendar(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}
