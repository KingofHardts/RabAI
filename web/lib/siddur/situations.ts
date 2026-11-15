/*
 * The person's own situation while davening, chosen in the Daven tab (none of it leaves the device):
 *
 * - "In shul today": a groom, a bris or a house of mourning, so no Tachanun today. The person says
 *   so; RabbAI only applies it, for today's date only, and says why in the folded line. This is
 *   RabbAI's reading of when Tachanun is left out, not yet reviewed by the rabbinic board (open
 *   question 30). Only Tachanun (and what the siddur ties to it) changes; other changes in a house
 *   of mourning are left to the siddur's own instructions.
 * - Eating alone or with three: the zimmun is the siddur's own heading, set aside when alone.
 * - "I'm saying Kaddish" and "I'm leading": the lines the siddur gives the mourner or the leader are
 *   marked, so they are easy to find. Nothing is added to the text.
 */
import type { DaySummaryDavening } from "@/lib/calendar/place";
import type { SiddurLine } from "./lines";
import type { Fold } from "./today";

export type ShulReason = "groom" | "bris" | "mourning";

export const SHUL_REASONS: Record<ShulReason, { label: string; why: string }> = {
  groom: { label: "A groom is here (his week of celebration)", why: "a groom is here" },
  bris: { label: "A bris today (the father, mohel or sandak is here)", why: "a bris today" },
  mourning: { label: "Davening in a house of mourning", why: "a house of mourning" },
};

/** "No Tachanun in shul today", for one date. */
export interface ShulToday {
  date: string;
  reason: ShulReason;
}

export function parseShulToday(raw: unknown): ShulToday | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(r.date)) return null;
  if (typeof r.reason !== "string" || !(r.reason in SHUL_REASONS)) return null;
  return { date: r.date, reason: r.reason as ShulReason };
}

/** Today's davening with the person's "no Tachanun in shul today", when it is for today. */
export function withShulToday(d: DaySummaryDavening | undefined, today: string | undefined, shul: ShulToday | null): DaySummaryDavening | undefined {
  if (!d || !shul || !today || shul.date !== today) return d;
  return { ...d, tachanun: { ...d.tachanun, shacharit: false, mincha: false }, shulNoTachanun: SHUL_REASONS[shul.reason].why, houseOfMourning: shul.reason === "mourning" };
}

const headingText = (l: SiddurLine) => `${l.heading?.en ?? ""} ${l.heading?.he ?? ""}`;

/** The Mourner's Kaddish and the Rabbis' Kaddish (said by mourners), by the siddur's heading. */
export function isMournersKaddish(text: string): boolean {
  return /mourner[’']?s kaddish|rabbis[’']? kaddish|kaddish de-?rabbanan|קדיש יתום|קדיש דרבנן/i.test(text);
}

/** A section's name or heading that opens the zimmun. */
const ZIMUN = /^\s*(?:zimm?un|zimmun\s*\/|invitation\b)|סדר הזימון|^זימון/i;

/** Eating alone: the zimmun, from its heading to the next heading, is set aside. */
export function zimunFolds(lines: SiddurLine[]): Fold[] {
  const folds: Fold[] = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.kind !== "heading" || !ZIMUN.test(l.heading?.en ?? "") && !ZIMUN.test(l.heading?.he ?? "")) continue;
    let j = i + 1;
    while (j < lines.length && lines[j].kind !== "heading") j++;
    folds.push({ from: i, to: j, reason: "The zimmun is said when three or more ate together" });
    i = j - 1;
  }
  return folds;
}

/** A whole section that is the zimmun (a siddur that prints it as its own section). */
export function zimunWhole(short: string): string | null {
  return /^(?:zimm?un|zimmun for three|invitation to grace)/i.test(short) ? "The zimmun is said when three or more ate together" : null;
}

const LEADER = /^(?:leader|reader|the leader|ש"ץ|ש״ץ|חזן)/i;
const MOURNER = /^(?:mourner|אבל)/i;

/** Whose a line is, by the siddur's own role label: "leader", "mourner", or null. */
export function lineRole(role: string | undefined): "leader" | "mourner" | null {
  if (!role) return null;
  if (MOURNER.test(role)) return "mourner";
  if (LEADER.test(role)) return "leader";
  return null;
}

/** Whether a heading line opens a Mourner's Kaddish. */
export function kaddishHeading(l: SiddurLine): boolean {
  return l.kind === "heading" && isMournersKaddish(headingText(l));
}
