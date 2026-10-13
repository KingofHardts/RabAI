// Open the live app in a real browser, the way a person does, and report what happened.
//
// Run by tools/health_check.py in the "Is RabAI working?" workflow. Reads the access code from
// RABAI_CODE (already masked in the log) and Playwright from PW_PATH. Prints one line per finding,
// starting with "OK " or "PROBLEM ". It never prints the code or any words of an answer: only
// whether an answer appeared, how long it took, and the app's own notices and page errors.

const { chromium, devices } = require(process.env.PW_PATH || "playwright");

const APP = process.env.APP || "https://rab-ai-ecru.vercel.app";
const CODE = process.env.RABAI_CODE || "";
const QUESTION = "What is the first word of the Torah, and what does it mean?";
// Set when the app has website collections, so the Articles screens should be there.
const ARTICLES = process.env.ARTICLES_EXPECTED === "1";

function say(kind, text) {
  console.log(`${kind} ${text.replace(/\s+/g, " ").slice(0, 300)}`);
}

async function unlock(page) {
  await page.goto(`${APP}/unlock`, { waitUntil: "networkidle", timeout: 60000 });
  const button = page.locator("form.unlock-form button[type=submit]");
  // Typing before the page has finished loading can be undone when it does; type again if so.
  for (let attempt = 0; attempt < 5 && !(await button.isEnabled()); attempt++) {
    await page.fill("#access-code", CODE);
    await page.waitForTimeout(1000);
  }
  await button.click();
  await page.waitForURL((u) => !u.pathname.startsWith("/unlock"), { timeout: 30000 });
  await page.waitForSelector("#ask-input", { timeout: 60000 });
}

// Learn, Articles, the first section, its first article: only counts and yes or no are printed,
// never an article's title or words.
async function walkArticles(page, name) {
  await page.evaluate(() => window.localStorage.setItem("rabai_mode", "learn"));
  await page.reload({ waitUntil: "networkidle", timeout: 60000 });
  const row = page.locator("button.lib-row", { hasText: "Articles" });
  await row.waitFor({ timeout: 60000 });
  await row.click();
  const shelves = page.locator(".learn-screen button.lib-row");
  await shelves.first().waitFor({ timeout: 30000 });
  const n = await shelves.count();
  await shelves.first().click();
  const items = page.locator(".article-rows .lib-row");
  await items.first().waitFor({ timeout: 30000 });
  const listed = await items.count();
  await items.first().click();
  await page.locator(".article-credit").first().waitFor({ timeout: 30000 });
  const lines = await page.locator(".line.article").count();
  say("OK", `${name}: Learn shows Articles (${n} sections); a section listed ${listed}; an article opened with its credit line and ${lines} paragraphs.`);
}

// The Sources page: search it for a book, and check nothing is wider than the screen. Only counts
// are printed.
async function checkSources(page, name) {
  await page.goto(`${APP}/sources`, { waitUntil: "networkidle", timeout: 60000 });
  const box = page.locator("#sources-find-input");
  await box.waitFor({ timeout: 30000 });
  const all = await page.locator("li.src-work").count();
  // Typing before the page has finished loading can be undone when it does; type again if so.
  let counted = false;
  for (let attempt = 0; attempt < 3 && !counted; attempt++) {
    await box.fill("");
    await box.fill("Mishnah Berurah");
    counted = await page
      .waitForFunction(() => /match/.test(document.querySelector(".sources-find [aria-live]")?.textContent || ""), null, { timeout: 5000 })
      .then(() => true)
      .catch(() => false);
  }
  const shown = await page.locator("li.src-work:not([hidden])").count();
  if (!counted || shown === 0) say("PROBLEM", `${name}: searching the Sources page for "Mishnah Berurah" found nothing.`);
  else say("OK", `${name}: the Sources page lists ${all} entries; searching it for "Mishnah Berurah" found ${shown}.`);
  const wider = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (wider > 1) say("PROBLEM", `${name}: the Sources page is ${wider}px wider than the screen.`);
}

async function run(name, options, ask) {
  const browser = await chromium.launch();
  const context = await browser.newContext(options);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(`page error: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console error: ${m.text()}`);
  });
  page.on("response", (r) => {
    if (r.url().startsWith(APP) && r.status() >= 500) errors.push(`HTTP ${r.status()} from ${new URL(r.url()).pathname}`);
  });
  try {
    await unlock(page);
    say("OK", `${name}: the app opened after the access code.`);
    if (ARTICLES && !ask) {
      try {
        await walkArticles(page, name);
      } catch (e) {
        say("PROBLEM", `${name}: the Articles screens: ${e.message.split("\n")[0]}`);
      }
    }
    if (ask) {
      const started = Date.now();
      await page.fill("#ask-input", QUESTION);
      await page.click(".composer form button[type=submit]");
      // Done when the answer shows its follow-up buttons (answered) or the app's notice.
      const outcome = await Promise.race([
        page.waitForSelector(".msg-ai.bare .follow", { timeout: 150000 }).then(() => "answered"),
        page.waitForSelector(".msg-ai.bare .note", { timeout: 150000 }).then(() => "notice"),
      ]).catch(() => "nothing");
      const seconds = Math.round((Date.now() - started) / 1000);
      await page.waitForTimeout(500);
      const notices = await page.locator(".msg-ai.bare .note").count();
      if (outcome === "answered" && notices === 0) {
        const cites = await page.locator(".msg-ai.bare .cite").count();
        say("OK", `${name}: a question was answered in ${seconds} seconds, with ${cites} source buttons.`);
      } else if (notices > 0) {
        const note = await page.locator(".msg-ai.bare .note").first().innerText();
        say("PROBLEM", `${name}: a question got the app's notice after ${seconds} seconds: "${note}"`);
      } else {
        say("PROBLEM", `${name}: a question got no answer and no notice within ${seconds} seconds.`);
      }
    }
    try {
      await checkSources(page, name);
    } catch (e) {
      say("PROBLEM", `${name}: the Sources page: ${e.message.split("\n")[0]}`);
    }
  } catch (e) {
    say("PROBLEM", `${name}: ${e.message.split("\n")[0]}`);
  }
  for (const e of errors.slice(0, 8)) say("PROBLEM", `${name}: ${e}`);
  if (errors.length === 0) say("OK", `${name}: no page errors.`);
  await browser.close();
}

(async () => {
  if (!CODE) {
    say("PROBLEM", "No access code was given to the browser test.");
    return;
  }
  await run("Computer", { viewport: { width: 1280, height: 860 } }, false);
  await run("Phone", devices["iPhone 13"], true);
})().catch((e) => {
  say("PROBLEM", `The browser test failed to run: ${e.message.split("\n")[0]}`);
});
