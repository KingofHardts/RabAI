/*
 * What went wrong when the model couldn't be reached: its HTTP status and the kind of error
 * Anthropic named, sorted into a plain cause. Never the error's message (a rate-limit message names
 * the organization) and never a key. The answer carries it as `problem`, so the "Is RabbAI
 * working?" check can say why answers failed, and the person gets a notice that says what kind of
 * trouble it is.
 */

export type ModelProblemKind = "credit" | "key" | "rate_limit" | "overloaded" | "model" | "request" | "server" | "network" | "other";

export interface ModelProblem {
  kind: ModelProblemKind;
  /** The HTTP status, when the model answered with one. */
  status?: number;
  /** Anthropic's own name for the error ("authentication_error", "rate_limit_error", …). */
  type?: string;
}

const TYPE = /^[a-z_]{1,40}$/;

/** The cause of a failed model call, from the error the SDK threw. */
export function modelProblem(err: unknown): ModelProblem {
  const e = (err ?? {}) as { status?: unknown; error?: unknown; message?: unknown; name?: unknown; cause?: unknown };
  const status = typeof e.status === "number" ? e.status : undefined;
  const body = e.error && typeof e.error === "object" ? (e.error as { error?: { type?: unknown }; type?: unknown }) : undefined;
  const rawType = body?.error?.type ?? body?.type;
  const type = typeof rawType === "string" && TYPE.test(rawType) ? rawType : undefined;
  const message = typeof e.message === "string" ? e.message : "";
  const out = (kind: ModelProblemKind): ModelProblem => ({ kind, ...(status ? { status } : {}), ...(type ? { type } : {}) });
  if (/credit balance|billing|spend(ing)? limit|usage limit/i.test(message) || type === "billing_error" || status === 402) return out("credit");
  if (status === 401 || status === 403 || type === "authentication_error" || type === "permission_error") return out("key");
  if (status === 429 || type === "rate_limit_error") return out("rate_limit");
  if (status === 529 || type === "overloaded_error") return out("overloaded");
  if (status === 404 || type === "not_found_error") return out("model");
  if (status && status >= 500) return out("server");
  if (status && status >= 400) return out("request");
  if (!status && /fetch failed|ECONN|ETIMEDOUT|ENOTFOUND|socket|network|timed? ?out/i.test(`${message} ${String(e.name ?? "")}`)) return out("network");
  return out("other");
}

/** What the person is told. */
export function problemNotice(p: ModelProblem): string {
  switch (p.kind) {
    case "credit":
    case "key":
      return "RabbAI can't answer right now: the account it uses to reach its model needs attention. Please let the maintainer know.";
    case "rate_limit":
    case "overloaded":
      return "RabbAI is very busy right now. Please try again in a minute.";
    default:
      return "Something went wrong reaching RabbAI. Please try again in a moment.";
  }
}

/** One line for logs and the health check: "credit (HTTP 400, invalid_request_error)". */
export function describeProblem(p: ModelProblem): string {
  const extra = [p.status ? `HTTP ${p.status}` : "", p.type ?? ""].filter(Boolean).join(", ");
  return extra ? `${p.kind} (${extra})` : p.kind;
}
