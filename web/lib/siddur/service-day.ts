/*
 * Which day a prayer belongs to (founding spec, "Which day a service belongs to"). Ma'ariv belongs
 * to the coming night: an early Ma'ariv on the afternoon before Rosh Chodesh says Ya'aleh VeYavo
 * (Shulchan Aruch HaRav, Birkat HaMazon on Rosh Chodesh). Mincha belongs to the day that is
 * ending: a late Mincha after sunset follows the day it was said on. Shacharit and Musaf follow the
 * Hebrew day. The festival Amidah is said at all three services, so it follows the service the
 * person came from, or the one they choose.
 */

import type { DaySummary, DaySummaryDavening } from "@/lib/calendar/place";
import type { Service } from "./festivals";

/** The service a section is said at, from its name; "shared" for a prayer said at several. */
export function serviceOfSection(section: string): Service | "shared" | null {
  const s = section.toLowerCase();
  // The festival Amidah, printed once for Ma'ariv, Shacharit and Mincha.
  if (/amida for yom tov$|holidays, maariv, shacharit & mincha amidah$|three festivals, amidah$/.test(s)) return "shared";
  if (/musaf|mussaf/.test(s)) return "musaf";
  if (/min[ḥh]a|minchah?\b/.test(s)) return "mincha";
  if (/ma['’]?ariv|arvit|maariv|kabbalat shabbat|counting of the omer|sefirat haomer|shema before sleep|bedtime|al hamita|candle lighting|menorah|eve kiddush|kiddush for (yom tov|rosh hashana) evening|shabbat evening|havdala|motza.?ei/.test(s)) return "maariv";
  if (/shaharit|shacharit|morning|hallel|pesukei|blessings of the shema|the amida$|tahanun|tachanun|reading of the torah|daily psalm/.test(s)) return "shacharit";
  return null;
}

/** The day a service is said on: tonight's for Ma'ariv before sunset, the day that is ending for Mincha after it. */
export function dayForService(day: Pick<DaySummary, "davening" | "daveningTonight" | "daveningEarlier"> | null | undefined, service: Service): DaySummaryDavening | undefined {
  if (!day) return undefined;
  if (service === "maariv") return day.daveningTonight ?? day.davening;
  if (service === "mincha") return day.daveningEarlier ?? day.davening;
  return day.davening;
}

/** Which service a prayer said at several is for, by the time of day: after sunset Ma'ariv, after midday Mincha, else Shacharit. */
export function serviceByClock(afterSunset: boolean, hour: number): Service {
  if (afterSunset || hour >= 19) return "maariv";
  return hour >= 13 ? "mincha" : "shacharit";
}

export const SERVICE_NAMES: Record<Service, string> = { shacharit: "Shacharit", musaf: "Musaf", mincha: "Mincha", maariv: "Ma'ariv" };
