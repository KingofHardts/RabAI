"""The sources list for the rabbinic board as one readable page (tools/review_list.py --html).

The same content as docs/sources-for-review.md, laid out to read on a screen or print: a
contents rail, a search box that narrows the list to the books matching a word, and each book
as a row with its editions. Not committed; made on request to share with the board.
"""

from datetime import date
from html import escape

from review_list import PART_INTROS, PART_ORDER, area_rows, glance, how_to_review, intro, part_no, part_title, reading_steps, reads

STATE_LABELS = {
    "testing": "Reads",
    "held": "Waiting for you",
    "needs_agreement": "Needs the publisher",
    "no_copy": "No copy yet",
}

STYLE = """
/* Layout: a reading column beside a contents rail; each book is a row in a list, never a card. */
:root {
  --paper: #fbfbfa;
  --ink: #1c2230;
  --muted: #586174;
  --rule: #dde1e8;
  --techelet: #1f4f8a;
  --wash: #eef3fa;
  --caution: #855400;
  --caution-wash: #fbf2df;
  --held: #5a3e98;
  --held-wash: #f1edfa;
  --out: #9a2b2b;
  --out-wash: #fbecec;
  --reads: #24643f;
  --reads-wash: #e8f4ec;
  --font-display: "Frank Ruhl Libre", "Times New Roman", serif;
  --font-body: "Source Sans 3", "Segoe UI", "DejaVu Sans", system-ui, sans-serif;
  --font-mono: "IBM Plex Mono", ui-monospace, "DejaVu Sans Mono", monospace;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --paper: #13161c; --ink: #e5e8ee; --muted: #a2aaba; --rule: #2b313d;
    --techelet: #8fb8ec; --wash: #1a2433;
    --caution: #e2b25a; --caution-wash: #2c2414; --held: #bba5ee; --held-wash: #241f33;
    --out: #f08f8f; --out-wash: #321c1c; --reads: #7fcf9b; --reads-wash: #16291e;
    color-scheme: dark;
  }
}
:root[data-theme="dark"] {
  --paper: #13161c; --ink: #e5e8ee; --muted: #a2aaba; --rule: #2b313d;
  --techelet: #8fb8ec; --wash: #1a2433;
  --caution: #e2b25a; --caution-wash: #2c2414; --held: #bba5ee; --held-wash: #241f33;
  --out: #f08f8f; --out-wash: #321c1c; --reads: #7fcf9b; --reads-wash: #16291e;
  color-scheme: dark;
}
body { background: var(--paper); color: var(--ink); font: 16px/1.55 var(--font-body); }
.page { display: grid; grid-template-columns: minmax(0, 1fr); gap: 32px; max-width: 1180px; margin: 0 auto;
  padding-inline: 20px; padding-block: 28px 64px; }
@media (min-width: 1000px) { .page { grid-template-columns: 250px minmax(0, 1fr); } }
.rail { font-size: 14px; }
@media (min-width: 1000px) { .rail { position: sticky; top: calc(env(safe-area-inset-top, 0px) + 16px); align-self: start;
  max-height: calc(100vh - 32px); overflow: auto; } }
.rail h2 { font: 600 12px/1.3 var(--font-body); letter-spacing: .08em; text-transform: uppercase; color: var(--muted); margin: 0 0 8px; }
.rail ol { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; }
.rail a { display: block; padding: 4px 8px; border-radius: 6px; color: var(--ink); text-decoration: none; }
.rail a:hover, .rail a:focus-visible { background: var(--wash); outline: none; }
.rail .sub a { padding-left: 20px; color: var(--muted); }
main { min-width: 0; max-width: 820px; }
header.top { border-bottom: 1px solid var(--rule); padding-bottom: 20px; margin-bottom: 8px; }
.eyebrow { font: 600 12px/1.3 var(--font-body); letter-spacing: .08em; text-transform: uppercase; color: var(--techelet); margin: 0; }
h1 { font: 500 clamp(30px, 5vw, 42px)/1.15 var(--font-display); margin: 8px 0 6px; text-wrap: balance; }
.subtitle { font: 400 20px/1.4 var(--font-display); color: var(--muted); margin: 0 0 12px; }
.made { font-size: 14px; color: var(--muted); margin: 0; }
h2.part { font: 500 28px/1.2 var(--font-display); margin: 48px 0 8px; padding-top: 12px; border-top: 2px solid var(--ink); text-wrap: balance; scroll-margin-top: 16px; }
h2.part.first { border-top: 0; margin-top: 16px; }
section { scroll-margin-top: 16px; }
h3 { font: 500 22px/1.25 var(--font-display); margin: 32px 0 4px; text-wrap: balance; scroll-margin-top: 16px; }
h4 { font: 600 13px/1.3 var(--font-body); letter-spacing: .08em; text-transform: uppercase; color: var(--techelet); margin: 24px 0 6px; }
h5 { font: italic 400 15px/1.3 var(--font-display); color: var(--muted); margin: 16px 0 4px; }
p { margin: 0 0 12px; max-width: 70ch; }
.lede { font-size: 17px; }
.about { color: var(--muted); margin-bottom: 8px; }
.glance { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin: 20px 0; }
.figure { border-top: 3px solid var(--fg, var(--ink)); padding-top: 8px; }
.figure b { display: block; font: 500 30px/1.1 var(--font-display); font-variant-numeric: tabular-nums; }
.figure span { font-size: 14px; color: var(--muted); }
.figure.reads { --fg: var(--reads); } .figure.caution { --fg: var(--caution); } .figure.held { --fg: var(--held); } .figure.out { --fg: var(--out); }
.table-wrap { overflow-x: auto; margin: 8px 0 16px; }
table { border-collapse: collapse; width: 100%; font-size: 15px; }
th, td { text-align: left; padding: 6px 10px; border-bottom: 1px solid var(--rule); }
th { font-weight: 600; color: var(--muted); font-size: 13px; }
td.n, th.n { text-align: right; font-variant-numeric: tabular-nums; }
ul.points { padding-left: 20px; margin: 0 0 12px; } ul.points li { margin-bottom: 6px; }
.find { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; margin: 24px 0 0; padding: 12px; border: 1px solid var(--rule); border-radius: 10px; background: var(--wash); }
.find label { font-weight: 600; }
.find input { flex: 1 1 220px; min-width: 0; font: inherit; padding: 8px 10px; border: 1px solid var(--rule); border-radius: 8px; background: var(--paper); color: var(--ink); }
.find input:focus-visible { outline: 2px solid var(--techelet); outline-offset: 1px; }
.find output { font-size: 14px; color: var(--muted); }
ol.books { list-style: none; margin: 0; padding: 0; }
.book { padding: 10px 0; border-bottom: 1px solid var(--rule); break-inside: avoid; }
.book-head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 10px; }
.title { font-weight: 600; }
.he { font-family: var(--font-display); font-size: 18px; color: var(--muted); }
.by { font-size: 14px; color: var(--muted); }
.tags { display: flex; flex-wrap: wrap; gap: 4px 6px; margin-top: 4px; }
.tag { font-size: 12px; padding: 1px 8px; border-radius: 999px; border: 1px solid var(--rule); color: var(--muted); }
.tag.core { border-color: var(--techelet); color: var(--techelet); }
.tag.caution { border-color: var(--caution); color: var(--caution); background: var(--caution-wash); }
ul.eds { list-style: none; margin: 6px 0 0; padding: 0; display: grid; gap: 4px; font-size: 15px; }
.state { display: inline-block; min-width: 0; font: 600 11px/1.6 var(--font-body); letter-spacing: .04em; text-transform: uppercase;
  padding: 0 7px; border-radius: 4px; margin-right: 6px; }
.state.testing { color: var(--reads); background: var(--reads-wash); }
.state.held { color: var(--held); background: var(--held-wash); }
.state.needs_agreement, .state.no_copy { color: var(--muted); background: var(--wash); }
.note { font-size: 14px; color: var(--muted); margin: 4px 0 0; max-width: 70ch; }
.caution-text { margin: 6px 0 0; padding: 8px 12px; border-left: 3px solid var(--caution); background: var(--caution-wash); font-size: 15px; max-width: 70ch; }
.reason { margin: 4px 0 0; font-size: 15px; max-width: 70ch; }
code.id { font: 12px var(--font-mono); color: var(--muted); margin-left: auto; padding-left: 8px; }
ol.steps { padding-left: 24px; margin: 4px 0 12px; } ol.steps li { margin-bottom: 4px; padding-left: 4px; }
.sites { list-style: none; padding: 0; margin: 0 0 12px; }
.sites li { padding: 6px 0; border-bottom: 1px solid var(--rule); }
.domain { font: 13px var(--font-mono); color: var(--muted); }
.out-title { font-weight: 600; }
ol.questions { padding-left: 28px; } ol.questions li { margin-bottom: 6px; }
[hidden] { display: none !important; }
a { color: var(--techelet); }
@media (prefers-reduced-motion: no-preference) { html { scroll-behavior: smooth; } }
@media print {
  :root { --paper: #fff; }
  .rail, .find { display: none; }
  .page { display: block; padding: 0; max-width: none; }
  main { max-width: none; }
  body { font-size: 9.5pt; line-height: 1.35; }
  p, .note, .caution-text, .reason { max-width: none; }
  h1 { font-size: 26pt; } .subtitle { font-size: 13pt; }
  h2.part { font-size: 17pt; margin-top: 0; break-before: page; }
  h2.part.first { break-before: auto; }
  h3 { font-size: 13pt; margin-top: 14px; break-after: avoid; }
  h4, h5 { margin-top: 10px; break-after: avoid; }
  .figure b { font-size: 20pt; }
  .book { padding: 4px 0; }
  .he { font-size: 11pt; }
  ul.eds { font-size: 9pt; gap: 1px; margin-top: 2px; }
  .note { font-size: 8.5pt; }
  .tag { font-size: 7.5pt; }
  .state { font-size: 7pt; }
  code.id { font-size: 7.5pt; }
  ol.library, ol.compact { columns: 2; column-gap: 0.3in; }
  a { color: inherit; text-decoration: none; }
}
"""

SCRIPT = """
(function () {
  var box = document.getElementById('find-book');
  var count = document.getElementById('find-count');
  if (!box) return;
  var books = Array.prototype.slice.call(document.querySelectorAll('[data-find]'));
  var heads = Array.prototype.slice.call(document.querySelectorAll('[data-group]'));
  function norm(s) { return s.toLowerCase().normalize('NFKD').replace(/[\\u0591-\\u05C7]/g, '').replace(/[^\\p{L}\\p{N} ]+/gu, ' '); }
  books.forEach(function (b) { b._text = norm(b.getAttribute('data-find')); });
  function run() {
    var words = norm(box.value).split(/\\s+/).filter(Boolean);
    var shown = 0;
    books.forEach(function (b) {
      var hit = words.every(function (w) { return b._text.indexOf(w) >= 0; });
      b.hidden = !hit;
      if (hit) shown++;
    });
    heads.forEach(function (h) {
      var sel = '[data-in~="' + h.getAttribute('data-group') + '"]';
      h.hidden = words.length > 0 && !document.querySelector(sel + ':not([hidden])');
    });
    count.textContent = words.length ? shown + (shown === 1 ? ' entry matches' : ' entries match') : '';
  }
  box.addEventListener('input', run);
})();
"""


def h(text) -> str:
    return escape(str(text or ""), quote=True)


def work_head(w: dict) -> str:
    he = f' <span class="he" lang="he" dir="rtl">{h(w["hebrew"])}</span>' if w.get("hebrew") else ""
    by = ", ".join(x for x in (w.get("author"), w.get("dates"), w.get("region")) if x)
    return (
        f'<div class="book-head"><span class="title">{h(w["title"])}</span>{he}<code class="id">{h(w["id"])}</code></div>'
        + (f'<div class="by">{h(by)}</div>' if by else "")
    )


def edition_label(e: dict) -> str:
    extra = []
    if e.get("use") == "words":
        extra.append("used only for what words mean")
    if e.get("use") == "vowels":
        extra.append("used only to show the vowels")
    if e.get("cleaned"):
        extra.append("an editor's additions removed")
    lang = " (English)" if e.get("language") == "en" and "english" not in e["name"].lower() and "translat" not in e["name"].lower() else ""
    return h(e["name"] + lang) + (f' <span class="note">({h("; ".join(extra))})</span>' if extra else "")


def find_text(w: dict, extra: str = "") -> str:
    return " ".join(
        str(x) for x in (w.get("title"), w.get("hebrew"), w.get("author"), w.get("id"), " ".join(e["name"] for e in w["editions"]), extra) if x
    )


def page(data: dict, counts) -> str:
    c = counts(data)
    today = date.today()
    made = f"{today.day} {today.strftime('%B %Y')}"
    out: list[str] = []
    add = out.append
    add("<title>RabAI's Sources</title>")
    add('<link rel="preconnect" href="https://fonts.googleapis.com">')
    add('<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>')
    add(
        '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@400;500;600&'
        'family=IBM+Plex+Mono&family=Source+Sans+3:ital,wght@0,400;0,600;1,400&display=swap">'
    )
    add(f"<style>{STYLE}</style>")
    add('<div class="page">')

    # Contents rail.
    areas_read = [area for area, works, _ in area_rows(data) if works]
    add('<nav class="rail" aria-label="Contents"><h2>Contents</h2><ol>')
    add('<li><a href="#glance">At a glance</a></li><li><a href="#review">How to review</a></li>')
    for pid in PART_ORDER:
        add(f'<li><a href="#{pid}">{h(part_title(pid))}</a></li>')
        if pid == "library":
            for a in areas_read:
                add(f'<li class="sub"><a href="#area-{h(a["id"])}">{h(a["title"])}</a></li>')
    add("</ol></nav>")

    add("<main>")
    add('<header class="top">')
    add('<p class="eyebrow">For the rabbinic board</p>')
    add("<h1>RabAI's sources</h1>")
    add('<p class="subtitle">What RabAI reads, and what it leaves out</p>')
    add(f'<p class="made">Made from RabAI\'s canon on {h(made)}. Nothing in it is approved yet: the board decides what RabAI may use.</p>')
    add("</header>")

    add('<section id="glance"><h2 class="part first">At a glance</h2>')
    first, second = intro(data)
    add(f'<p class="lede">{h(first)}</p><p>{h(second)}</p>')
    add('<div class="glance">')
    add(f'<div class="figure reads"><b>{c["readEditions"]:,}</b><span>editions of {c["readWorks"]:,} works RabAI reads</span></div>')
    add(f'<div class="figure caution"><b>{c["cautioned"]}</b><span>kept with a caution</span></div>')
    add(f'<div class="figure held"><b>{c["held"]}</b><span>editions waiting for your decision</span></div>')
    add(f'<div class="figure out"><b>{c["leftOut"]}</b><span>editions and collections left out</span></div>')
    add("</div>")
    add('<div class="table-wrap"><table><thead><tr><th>Area</th><th class="n">Works RabAI reads</th><th class="n">Editions</th></tr></thead><tbody>')
    for area, works, editions in area_rows(data):
        add(f'<tr><td><a href="#area-{h(area["id"])}">{h(area["title"])}</a></td><td class="n">{works:,}</td><td class="n">{editions:,}</td></tr>')
    add("</tbody></table></div>")
    add('<ul class="points">')
    for lead, rest in glance(data):
        add(f"<li><b>{h(lead)}</b> {h(rest)}</li>")
    add("</ul></section>")

    add('<section id="review"><h2 class="part">How to review</h2>')
    for para in how_to_review():
        add(f"<p>{h(para)}</p>")
    add(
        '<div class="find" role="search"><label for="find-book">Find a book</label>'
        '<input id="find-book" type="search" placeholder="Mishnah Berurah, Ramban, משנה ברורה…" autocomplete="off">'
        '<output id="find-count" for="find-book" aria-live="polite"></output></div>'
    )
    add("</section>")

    def tags_for(w: dict) -> str:
        tags = []
        if w.get("core"):
            tags.append('<span class="tag core">Core</span>')
        if w.get("caution"):
            tags.append(f'<span class="tag caution">With a caution ({h(part_no("caution"))})</span>')
        if w.get("minhag"):
            tags.append(f'<span class="tag">{h(w["minhag"])}</span>')
        tags.extend(f'<span class="tag">{h(s)}</span>' for s in w.get("streams") or [])
        return f'<div class="tags">{"".join(tags)}</div>' if tags else ""

    def html_caution():
        add('<ol class="books">')
        for w in data["works"]:
            if w.get("caution") and any(reads(e) for e in w["editions"]):
                add(f'<li class="book" data-find="{h(find_text(w, w["caution"]))}" data-in="caution">{work_head(w)}')
                add(f'<p class="reason"><b>Why:</b> {h("; ".join(w["cautionKinds"]))}.</p>')
                add(f'<p class="caution-text">{h(w["caution"])}</p></li>')
        add("</ol>")

    def html_waiting():
        for a in data["areas"]:
            rows = [(w, e) for w in data["works"] if w["area"] == a["id"] for e in w["editions"] if e["state"] == "held"]
            if not rows:
                continue
            add(f'<h3 data-group="held-{h(a["id"])}">{h(a["title"])}</h3><ol class="books">')
            for w, e in rows:
                find = find_text(w, (e.get("note") or "") + " " + (w.get("note") or ""))
                add(f'<li class="book" data-find="{h(find)}" data-in="held-{h(a["id"])}">{work_head(w)}')
                add(f'<ul class="eds"><li><span class="state held">Waiting for you</span>{edition_label(e)}</li></ul>')
                if e.get("note"):
                    add(f'<p class="reason"><b>Why it waits:</b> {h(e["note"])}</p>')
                if w.get("note"):
                    add(f'<p class="reason"><b>{"About the work" if e.get("note") else "Why it waits"}:</b> {h(w["note"])}</p>')
                add("</li>")
            add("</ol>")

    def html_left_out():
        for heading, reconsider, gid in (("Left out; you may reconsider", True, "out-yes"), ("Left out", False, "out-no")):
            rows = [r for r in data["leftOut"] if r["mayReconsider"] is reconsider]
            if not rows:
                continue
            add(f'<h3 data-group="{gid}">{h(heading)}</h3><ol class="books">')
            for r in rows:
                reason = r["reason"] + (" " + r["note"] if r.get("note") else "")
                add(
                    f'<li class="book" data-find="{h(r["title"] + " " + r["id"] + " " + reason)}" data-in="{gid}">'
                    f'<div class="book-head"><span class="title">{h(r["title"])}</span><code class="id">{h(r["id"])}</code></div>'
                    f'<p class="reason">{h(reason)}</p></li>'
                )
            add("</ol>")

    def html_commentaries():
        if data["readingOrder"]["status"] != "approved":
            add("<p><b>This order is a draft, waiting for your review.</b></p>")
        for t in data["readingOrder"]["texts"]:
            add(f"<h3>{h(t['title'])}</h3><ol class=\"steps\">")
            for step in reading_steps(t):
                add(f"<li>{h(step)}</li>")
            add("</ol>")

    def html_websites():
        s = data["sites"]
        if s["status"] != "approved":
            add("<p><b>This list waits for your review.</b></p>")
        add('<h3>The only sites RabAI searches about Torah, halacha or belief</h3><ul class="sites">')
        for site in s["trusted"]:
            add(f'<li><b>{h(site["name"])}</b> <span class="domain">{h(site["domain"])}</span><br>{h(site["offers"])}</li>')
        add('</ul><h3>Never searched, even for everyday facts</h3><ul class="sites">')
        for site in s["notForWeb"]:
            add(f'<li><b>{h(site["name"])}</b> <span class="domain">{h(site["domain"])}</span><br>{h(site["reason"])}</li>')
        add("</ul>")

    def html_not_yet():
        for heading, state in (("Needs the publisher's agreement", "needs_agreement"), ("No copy we may use yet", "no_copy")):
            rows = [(w, e) for w in data["works"] for e in w["editions"] if e["state"] == state]
            if not rows:
                continue
            add(f'<h3 data-group="{state}">{h(heading)}</h3><ol class="books compact">')
            for w, e in rows:
                add(
                    f'<li class="book" data-find="{h(w["title"] + " " + e["name"] + " " + w["id"])}" data-in="{state}">'
                    f'<div class="book-head"><span class="title">{h(w["title"])}</span><code class="id">{h(w["id"])}</code></div>'
                    f'<div class="by">{edition_label(e)}</div></li>'
                )
            add("</ol>")

    def html_questions():
        last = None
        for q in data["questions"]:
            if q["section"] != last:
                if last is not None:
                    add("</ol>")
                add(f"<h3>{h(q['section'])}</h3><ol class=\"questions\">")
                last = q["section"]
            add(f'<li value="{q["number"]}">{h(q["text"])}</li>')
        if last is not None:
            add("</ol>")

    def html_library():
        for a in areas_read:
            ws = [w for w in data["works"] if w["area"] == a["id"] and any(reads(e) for e in w["editions"])]
            add(f'<h3 id="area-{h(a["id"])}" data-group="{h(a["id"])}">{h(a["title"])}</h3>')
            add(f'<p class="about" data-group="{h(a["id"])}">{h(a["about"])}</p>')
            groups: list[str] = []
            for w in ws:
                if w["group"] not in groups:
                    groups.append(w["group"])
            for gi, g in enumerate(groups):
                gid = f"{a['id']}-{gi}"
                gw = [w for w in ws if w["group"] == g]
                if g:
                    add(f'<h4 data-group="{h(gid)}">{h(g)}</h4>')
                eras: list[str] = []
                for w in gw:
                    if w["era"] not in eras:
                        eras.append(w["era"])
                for era in eras:
                    eid = f"{gid}-{era}"
                    if len(eras) > 1:
                        add(f'<h5 data-group="{h(eid)}">{h(data["eras"].get(era, era))}</h5>')
                    add('<ol class="books library">')
                    for w in gw:
                        if w["era"] != era:
                            continue
                        add(f'<li class="book" data-find="{h(find_text(w))}" data-in="{h(a["id"])} {h(gid)} {h(eid)}">')
                        add(work_head(w))
                        add(tags_for(w))
                        add('<ul class="eds">')
                        for e in w["editions"]:
                            if reads(e) or e["state"] == "held":
                                note = f' <span class="note">{h(e["note"])}</span>' if e.get("note") and reads(e) else ""
                                later = f" ({h(part_no('waiting'))})" if e["state"] == "held" else ""
                                add(f'<li><span class="state {h(e["state"])}">{h(STATE_LABELS[e["state"]])}</span>{edition_label(e)}{later}{note}</li>')
                        add("</ul>")
                        if w.get("note"):
                            add(f'<p class="note">Note: {h(w["note"])}</p>')
                        add("</li>")
                    add("</ol>")

    parts = {
        "caution": html_caution,
        "waiting": html_waiting,
        "left-out": html_left_out,
        "commentaries": html_commentaries,
        "websites": html_websites,
        "not-yet": html_not_yet,
        "questions": html_questions,
        "library": html_library,
    }
    for pid in PART_ORDER:
        add(f'<section id="{pid}" class="part-{pid}"><h2 class="part">{h(part_title(pid))}</h2>')
        add(f"<p>{h(PART_INTROS[pid])}</p>")
        parts[pid]()
        add("</section>")

    add("</main></div>")
    add(f"<script>{SCRIPT}</script>")
    return "\n".join(out) + "\n"
