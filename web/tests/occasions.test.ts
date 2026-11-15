import { test } from "node:test";
import assert from "node:assert/strict";
import { dueReview, OCCASIONS, occasionPrompt, reviewPrompt, shabbatTablePrompt, weekItems, weekReviewPrompt } from "../lib/occasions";

const DAY = 86_400_000;

test("a review is due three to fourteen days after learning, once", () => {
  const now = 100 * DAY;
  const learning = [
    { text: "Berakhot 2a", last: now - 1 * DAY },
    { text: "Kiddushin 5a", at: "Kiddushin 5a:4", last: now - 4 * DAY },
    { text: "Shabbat 2a", last: now - 20 * DAY },
  ];
  assert.equal(dueReview(learning, {}, now)?.text, "Kiddushin 5a");
  assert.equal(dueReview(learning, { "Kiddushin 5a": now - 1 * DAY }, now), null, "reviewed since it was learned");
  assert.match(reviewPrompt(learning[1], now), /^4 days ago we learned Kiddushin 5a, up to Kiddushin 5a:4\./);
});

test("this week's learning, and the questions for the table and before an occasion", () => {
  const now = 100 * DAY;
  const items = weekItems([{ text: "Berakhot 2a", last: now - DAY }, { text: "old", last: now - 9 * DAY }], [{ topic: "Shabbat candles", last: now - 2 * DAY }], now);
  assert.deepEqual(items, ["Berakhot 2a", "Shabbat candles"]);
  assert.match(weekReviewPrompt(items), /chazara on what I learned this week: Berakhot 2a; Shabbat candles\./);
  assert.match(shabbatTablePrompt("Vayera"), /Parashat Vayera/);
  assert.match(shabbatTablePrompt(), /this week's parsha/);
  for (const o of OCCASIONS) assert.match(occasionPrompt(o), /soon\. What should I learn beforehand\?/);
});
