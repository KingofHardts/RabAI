import { test } from "node:test";
import assert from "node:assert/strict";
import { describeProblem, modelProblem, problemNotice } from "../lib/engine/model-error";

const apiError = (status: number, type: string, message: string) => Object.assign(new Error(message), { status, error: { type: "error", error: { type, message } } });

test("a failed model call is sorted into a plain cause, without its message", () => {
  const credit = modelProblem(apiError(400, "invalid_request_error", "Your credit balance is too low to access the Anthropic API."));
  assert.deepEqual(credit, { kind: "credit", status: 400, type: "invalid_request_error" });
  assert.equal(modelProblem(apiError(401, "authentication_error", "invalid x-api-key")).kind, "key");
  const rate = modelProblem(apiError(429, "rate_limit_error", "This request would exceed the rate limit for your organization (0f1e2d3c-…)"));
  assert.equal(rate.kind, "rate_limit");
  assert.ok(!JSON.stringify(rate).includes("organization"), "the message, which names the organization, is never kept");
  assert.equal(modelProblem(apiError(529, "overloaded_error", "Overloaded")).kind, "overloaded");
  assert.equal(modelProblem(apiError(404, "not_found_error", "model: x")).kind, "model");
  assert.equal(modelProblem(new TypeError("fetch failed")).kind, "network");
  assert.equal(modelProblem("??").kind, "other");
  assert.equal(describeProblem(credit), "credit (HTTP 400, invalid_request_error)");
});

test("the person is told what kind of trouble it is", () => {
  assert.match(problemNotice({ kind: "credit" }), /needs attention/);
  assert.match(problemNotice({ kind: "rate_limit" }), /very busy/);
  assert.match(problemNotice({ kind: "other" }), /Something went wrong/);
});
