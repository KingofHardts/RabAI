/*
 * A few words on when a service may be said today, from the day's times (lib/calendar): shown
 * under the service's name on the Daven home. The times are the calendar's own, as the "Times
 * today" list shows them; where the calendar gives two opinions (the latest Shema), both are
 * named. RabbAI's reading of the calendar, labeled as such where it is shown.
 */

export interface DayTime {
  id?: string;
  label: string;
  time: string;
}

/** "9:12 AM" as "9:12", when the half of the day is plain from the prayer it belongs to. */
const short = (time: string) => time.replace(/\s*[AP]M$/i, "");

export function serviceTimes(service: string, items: DayTime[] | undefined): string {
  if (!items?.length) return "";
  const at = (id: string) => items.find((z) => z.id === id)?.time;
  if (service === "Shacharit") {
    const shema = at("shma");
    const mga = at("shmaMGA");
    const amidah = at("tefillah");
    const parts = [
      shema ? `Shema by ${short(shema)}${mga ? ` (${short(mga)} by the Magen Avraham)` : ""}` : "",
      amidah ? `the Amidah by ${short(amidah)}` : "",
    ].filter(Boolean);
    return parts.join(", ");
  }
  if (service === "Mincha") {
    const from = at("minchaGedola");
    const until = at("sunset");
    if (from && until) return `From ${short(from)} until sunset, ${short(until)}`;
    return until ? `Until sunset, ${short(until)}` : "";
  }
  if (service === "Maariv") {
    const night = at("tzeit");
    return night ? `From nightfall, ${short(night)}` : "";
  }
  return "";
}

/**
 * The prayer the home screen leads with. Late at night, once Maariv's time has long begun, that is
 * the Shema before sleep (when the siddur has it); otherwise the service for the hour.
 */
export function leadPrayer(hour: number, afterSunset: boolean, hasBedtime: boolean): "Shacharit" | "Mincha" | "Maariv" | "Bedtime Shema" {
  if (hasBedtime && (hour >= 22 || hour < 4)) return "Bedtime Shema";
  if (afterSunset) return "Maariv";
  if (hour >= 4 && hour < 12) return "Shacharit";
  if (hour >= 12 && hour < 18) return "Mincha";
  return "Maariv";
}
