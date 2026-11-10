// Pre-collect check: every word of every passage has English. Prints references and word counts only.
import { readdirSync, readFileSync, existsSync } from "fs";
import { readGlossReply, alignGlosses, passageWords } from "../lib/engine/gloss";
import { splitGroupReply } from "../lib/engine/translate";
const dir = process.argv[2]; const verbose = process.argv.includes("-v");
let bad = 0, ok = 0;
const check = (label: string, he: string, text: string | undefined, needGeneral: boolean) => {
  if (text === undefined) { console.log("NO ANSWER:", label); bad++; return; }
  const words = passageWords(he);
  let r; try { r = readGlossReply(text); } catch (e) { console.log("UNREADABLE:", label, String(e)); bad++; return; }
  const rows = alignGlosses(words, r.items);
  const last = rows[rows.length - 1]; const end = last ? last.at + last.n : 0;
  // A word with no Hebrew letters (an English instruction, a number) can take no English: not a gap.
  const holes = rows.filter((x) => x.en === null && /[א-ת]/.test(words.slice(x.at, x.at + x.n).join(""))).map((x) => `${x.at}+${x.n}`);
  if (end < words.length) holes.push(`${end}..${words.length} (end)`);
  const miss: string[] = [];
  if (needGeneral && !r.general) miss.push("no GENERAL");
  if (holes.length || miss.length) { bad++; console.log("HOLES:", label, `words=${words.length} items=${r.items.length}`, holes.join(","), miss.join(","), verbose ? holes.map(h=>words.slice(+h.split("+")[0], +h.split("+")[0]+ (+h.split("+")[1]||3)).join(" ")).join(" / ") : ""); }
  else ok++;
};
for (const f of readdirSync(dir).filter((f) => f.endsWith(".request.md")).sort()) {
  const req = readFileSync(`${dir}/${f}`, "utf8");
  const af = `${dir}/${f.replace(".request.md", ".answer.txt")}`;
  const ans = existsSync(af) ? readFileSync(af, "utf8") : undefined;
  const one = req.match(/^The passage, (.+):\n(.*)$/m);
  if (one) {
    const part = req.match(/after "WORDS:":\n(.*)$/m);
    check(`${f} ${one[1]}`, part ? part[1] : one[2], ans, false);
    continue;
  }
  const lines = req.split("\n"); const ps: Array<{ ref: string; he: string; en: boolean }> = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^Sources from the library|^Answer each passage/.test(lines[i])) break;
    const m = lines[i].match(/^\[(.+)\]$/);
    if (m && lines[i + 1] !== undefined) ps.push({ ref: m[1], he: lines[i + 1], en: /^The library's English/.test(lines[i + 2] ?? "") });
  }
  const parts = ans === undefined ? new Map<string, string>() : splitGroupReply(ans, ps.map((p) => p.ref));
  for (const p of ps) check(`${f} ${p.ref}`, p.he, ans === undefined ? undefined : parts.get(p.ref), !p.en);
}
console.log(`ok ${ok}, to fix ${bad}`);
