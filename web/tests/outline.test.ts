import { test } from "node:test";
import assert from "node:assert/strict";
import type { BetaMessage } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { outlineDaf, outlineRequest, readOutline } from "../lib/engine/outline";
import type { ModelClient } from "../lib/engine/answer";

const lines = [
  { ref: "Berakhot 2a:1", he: "מאימתי קורין את שמע בערבין", en: "From when may one recite Shema in the evening?" },
  { ref: "Berakhot 2a:4", he: "גמ׳ תנא היכא קאי", en: "Where is the tanna standing?" },
];

test("the outline keeps only known lines and known kinds, in page order", () => {
  const out = readOutline(
    `Here: {"lines":[{"ref":"Berakhot 2a:4","kind":"question","note":"Asks   what the Mishnah builds on"},
      {"ref":"Berakhot 2a:1","kind":"mishnah","note":"The Mishnah's question"},
      {"ref":"Berakhot 9z:1","kind":"answer","note":"x"},
      {"ref":"Berakhot 2a:1","kind":"answer","note":"duplicate"},
      {"ref":"Berakhot 2a:4","kind":"opinion","note":"bad kind"}]}`,
    lines.map((l) => l.ref),
  );
  assert.deepEqual(out, [
    { ref: "Berakhot 2a:1", kind: "mishnah", note: "The Mishnah's question" },
    { ref: "Berakhot 2a:4", kind: "question", note: "Asks what the Mishnah builds on" },
  ]);
  assert.deepEqual(readOutline("no json", ["a"]), []);
});

test("the outline request carries the core premises and every line", () => {
  const req = outlineRequest(lines, "test-model");
  const system = JSON.stringify(req.system);
  assert.ok(system.includes("Marking the flow of the Gemara"));
  assert.ok(system.length > 10_000, "the core premises come first");
  const user = JSON.stringify(req.messages);
  assert.ok(user.includes("[Berakhot 2a:1]") && user.includes("[Berakhot 2a:4]"));
});

test("outlining asks the model once and reads its reply", async () => {
  let calls = 0;
  const client: ModelClient = {
    create: async () => {
      calls++;
      return {
        model: "test-model",
        content: [{ type: "text", text: '{"lines":[{"ref":"Berakhot 2a:1","kind":"mishnah","note":"The Mishnah"}]}' }],
      } as unknown as BetaMessage;
    },
  };
  const result = await outlineDaf(lines, client);
  assert.equal(calls, 1);
  assert.equal(result.model, "test-model");
  assert.deepEqual(result.lines.map((l) => l.kind), ["mishnah"]);
});
