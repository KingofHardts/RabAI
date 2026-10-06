/**
 * The safety check that runs before anything else.
 *
 * It is deliberately simple and errs toward caution. It never blocks a question: a person
 * asking what the Torah says about suicide may be studying, or may be in pain, and RabAI
 * answers either way. When the check fires, the app shows crisis resources above the answer
 * and tells the model to put safety first (core premises, "Safety comes first").
 *
 * The board and a clinician should review these patterns before launch (docs/rabbinic-review.md).
 */

export type SafetyConcern = "self_harm" | "abuse" | "medical_emergency";

export interface SafetyResult {
  concern: SafetyConcern | null;
}

const PATTERNS: Array<[SafetyConcern, RegExp]> = [
  [
    "self_harm",
    /\b(kill(ing)? (my ?self|myself)|suicid(e|al)|end (it all|my life)|want to die|don'?t want to (live|be alive)|better off dead|hurt(ing)? myself|self[- ]harm|cut(ting)? myself|no reason to live|take my (own )?life)\b/i,
  ],
  [
    "abuse",
    /\b((he|she|they|my \w+) (hits?|beats?|hurts?|touch(es)?) me|being (abused|hit|beaten|molested)|abus(e|ing|ive) (me|my)|afraid (to go home|of my (husband|wife|father|mother|parent|rebbe|rabbi|teacher)))\b/i,
  ],
  [
    "medical_emergency",
    /\b(overdos(e|ed|ing)|can'?t breathe|chest pain|having a (heart attack|stroke|seizure)|poison(ed|ing)|unconscious|not breathing)\b/i,
  ],
];

export function checkSafety(text: string): SafetyResult {
  for (const [concern, pattern] of PATTERNS) {
    if (pattern.test(text)) return { concern };
  }
  return { concern: null };
}

export interface SafetyNotice {
  title: string;
  lines: Array<{ label: string; action: string; href: string }>;
}

/** US resources for now; localize before offering RabAI outside the US. */
export function safetyNotice(concern: SafetyConcern): SafetyNotice {
  const emergency = { label: "Emergency", action: "Call 911", href: "tel:911" };
  switch (concern) {
    case "self_harm":
      return {
        title: "You matter, and help is here right now.",
        lines: [
          { label: "Suicide & Crisis Lifeline", action: "Call or text 988", href: "tel:988" },
          emergency,
        ],
      };
    case "abuse":
      return {
        title: "You deserve to be safe.",
        lines: [
          { label: "Domestic Violence Hotline", action: "Call 1-800-799-7233", href: "tel:18007997233" },
          { label: "Childhelp (for children and teens)", action: "Call 1-800-422-4453", href: "tel:18004224453" },
          emergency,
        ],
      };
    case "medical_emergency":
      return { title: "Please get help right away.", lines: [emergency] };
  }
}

/** Added to the system prompt when the check fires. */
export function safetyInstruction(concern: SafetyConcern): string {
  return [
    `The safety check flagged this message (${concern.replace("_", " ")}).`,
    "Follow \"Safety comes first\": begin with warmth and the person's immediate safety, point them to the resources",
    "already shown on their screen (the app displays crisis lines above your answer), and urge them to reach a real person now.",
    "Keep it short and gentle. Torah teaching, if any, comes only after safety and only if it helps.",
    "If the message is plainly a study question and not about the person themselves, answer it, gently and briefly mentioning that help is available.",
  ].join(" ");
}
