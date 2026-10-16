import { test } from "node:test";
import assert from "node:assert/strict";
import { PICTURE_LIMITS, pictureType, picturesSize, questionForPictures, readPictures } from "../lib/pictures";
import { planRequest } from "../lib/engine/answer";
import { lookupRequest } from "../lib/engine/lookup";
import { loadLibrary } from "../lib/library/index";

const b64 = (bytes: number[]) => Buffer.from(Uint8Array.from(bytes)).toString("base64");
// The first bytes of each kind of picture, padded out to a few dozen bytes.
const pad = (head: number[]) => [...head, ...Array.from({ length: 32 }, (_, i) => i)];
const JPEG = b64(pad([0xff, 0xd8, 0xff, 0xe0]));
const PNG = b64(pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
const GIF = b64(pad([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]));
const WEBP = b64(pad([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50]));
const PDF = b64(pad([0x25, 0x50, 0x44, 0x46, 0x2d]));

test("a picture's kind is read from its own bytes, never from its name", () => {
  assert.equal(pictureType(JPEG), "image/jpeg");
  assert.equal(pictureType(PNG), "image/png");
  assert.equal(pictureType(GIF), "image/gif");
  assert.equal(pictureType(WEBP), "image/webp");
  assert.equal(pictureType(PDF), null);
  assert.equal(pictureType("not base64!"), null);
  assert.equal(pictureType(""), null);
});

test("pictures in a request are checked: real pictures only, within the limits", () => {
  assert.deepEqual(readPictures(undefined, 4), []);
  assert.deepEqual(readPictures([{ data: PNG }], 4), [{ mediaType: "image/png", data: PNG }]);
  // The kind it claims is ignored; its bytes decide.
  assert.deepEqual(readPictures([{ data: JPEG, mediaType: "image/png" }], 4), [{ mediaType: "image/jpeg", data: JPEG }]);
  assert.match(readPictures("x", 4) as string, /list/);
  assert.match(readPictures([{ data: PDF }], 4) as string, /Only photos and pictures/);
  assert.match(readPictures([{ data: "abc$%" }], 4) as string, /couldn't be read/);
  assert.match(readPictures([{ data: PNG }, { data: PNG }, { data: PNG }], 2) as string, /at most 2/);
  assert.match(readPictures([{ data: "A".repeat(PICTURE_LIMITS.maxChars + 4) }], 4) as string, /too large/);
  assert.equal(picturesSize([{ mediaType: "image/png", data: PNG }, { mediaType: "image/jpeg", data: JPEG }]), PNG.length + JPEG.length);
});

test("a picture sent without words gets a plain question", () => {
  assert.match(questionForPictures(1), /this picture/);
  assert.match(questionForPictures(3), /these pictures/);
});

const lib = loadLibrary("development");
const config = { model: "claude-opus-5-5", effort: "high" as const, maxTokens: 16000 };

test("pictures come after the documents, so every citation's document number is unchanged", () => {
  const plain = planRequest({ question: "What does this page say about Creation?" }, lib, config);
  const withPicture = planRequest({ question: "What does this page say about Creation?", pictures: [{ mediaType: "image/png", data: PNG }] }, lib, config);
  const blocks = (p: typeof plain) => p.params.messages[p.params.messages.length - 1].content as unknown as Array<Record<string, unknown>>;
  const a = blocks(plain);
  const b = blocks(withPicture);
  const docs = (list: Array<Record<string, unknown>>) => list.flatMap((x, i) => (x.type === "document" ? [`${i}:${x.title}`] : []));
  assert.deepEqual(docs(b), docs(a), "the documents keep their places");
  const firstImage = b.findIndex((x) => x.type === "image");
  const lastDoc = Math.max(...b.flatMap((x, i) => (x.type === "document" ? [i] : [-1])));
  assert.ok(firstImage > lastDoc, "the picture comes after every document");
  assert.equal(b[firstImage - 1].type, "text");
  assert.match(String(b[firstImage - 1].text), /The picture the person sent/);
  assert.equal(b[b.length - 1].type, "text", "the question is last");
  assert.deepEqual(b[firstImage].source, { type: "base64", media_type: "image/png", data: PNG });
});

test("several pictures are each labeled, so RabAI can say which one it means", () => {
  const { params } = planRequest(
    { question: "Compare these two pages.", pictures: [{ mediaType: "image/png", data: PNG }, { mediaType: "image/jpeg", data: JPEG }] },
    lib,
    config,
  );
  const blocks = params.messages[params.messages.length - 1].content as unknown as Array<Record<string, unknown>>;
  const texts = blocks.filter((b) => b.type === "text").map((b) => String(b.text));
  assert.ok(texts.includes("The pictures the person sent (2):"));
  const i1 = blocks.findIndex((b) => b.type === "text" && b.text === "Picture 1:");
  const i2 = blocks.findIndex((b) => b.type === "text" && b.text === "Picture 2:");
  assert.ok(i1 >= 0 && i2 > i1);
  assert.equal(blocks[i1 + 1].type, "image");
  assert.equal(blocks[i2 + 1].type, "image");
});

test("pictures from earlier in the chat go with that turn, and the turns still alternate", () => {
  const { params } = planRequest(
    {
      question: "And the next line?",
      history: [
        { role: "user", text: "What is written here?", pictures: [{ mediaType: "image/jpeg", data: JPEG }] },
        { role: "assistant", text: "It is the first line of Berakhot." },
      ],
    },
    lib,
    config,
  );
  assert.deepEqual(
    params.messages.map((m) => m.role),
    ["user", "assistant", "user"],
  );
  const first = params.messages[0].content as unknown as Array<Record<string, unknown>>;
  assert.ok(first.some((x) => x.type === "image"), "the earlier picture is sent again with its turn");
  assert.ok(first.some((x) => x.type === "text" && /What is written here/.test(String(x.text))));
});

test("the lookup step reads the pictures too", () => {
  const req = lookupRequest("What is on this page?", "Berakhot\n", "claude-sonnet-5-5", [{ mediaType: "image/webp", data: WEBP }]);
  const content = req.messages[0].content as unknown as Array<Record<string, unknown>>;
  assert.ok(Array.isArray(content));
  assert.equal(content[0].type, "image");
  assert.equal(content[content.length - 1].type, "text");
  const plain = lookupRequest("What is on this page?", "Berakhot\n", "claude-sonnet-5-5");
  assert.equal(typeof plain.messages[0].content, "string", "without pictures the request is unchanged");
});
