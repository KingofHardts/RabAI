// Joins answer lines that split one of the library's words (words joined by a makaf) into one line.
import { readdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import { passageWords } from "../lib/engine/gloss";
import { lettersOf } from "../lib/library/daf";
const dir = process.argv[2];
const sk = (l: string) => (l ? l[0] + l.slice(1).replace(/[וי]/g, "") : "");
const same = (a: string, b: string) => a === b || sk(a) === sk(b);
const NOISE = /^[\[(]?(marks the (direct )?object|untranslated object marker|object marker|direct object marker)[\])]?$/i;
let merged = 0, stuck = 0;
function fixBlock(lines: string[], from: number, to: number, he: string, label: string) {
  const W = passageWords(he); const K = W.map((w) => lettersOf(w));
  const idx: number[] = [];
  for (let n = from; n < to; n++) { const [h, e] = lines[n].split("|").map((s) => s.trim()); if (lines[n].includes("|") && h && lettersOf(h) && e) idx.push(n); }
  let i = 0, k = 0;
  while (k < idx.length && i < W.length) {
    if (!K[i]) { i++; continue; }
    const key = lines[idx[k]].split("|")[0].trim().split(/\s+/).map(lettersOf).join("");
    if (same(key, K[i])) { i++; k++; continue; }
    // an expression: one item over several words
    let have = "", j = i, hit = -1;
    for (; j < W.length && have.length < key.length + 2; j++) { have += K[j]; if (same(have, key)) { hit = j; break; } }
    if (hit >= 0) { i = hit + 1; k++; continue; }
    // several items over one or more words
    const itemKey = (n: number) => lines[idx[n]].split("|")[0].trim().split(/\s+/).map(lettersOf).join("");
    let done = -1, upto = -1;
    search: for (let j2 = i; j2 < Math.min(W.length, i + 5); j2++) {
      const wk = K.slice(i, j2 + 1).join(""); let cat = "";
      for (let m = k; m < Math.min(idx.length, k + 8); m++) { cat += itemKey(m); if (same(cat, wk)) { done = m; upto = j2; break search; } if (cat.length > wk.length + 2) break; }
    }
    if (done > k) {
      const ens = idx.slice(k, done + 1).map((n) => lines[n].split("|")[1].trim()).filter((e) => !NOISE.test(e));
      const en = ens.join(" ") || lines[idx[done]].split("|")[1].trim();
      lines[idx[k]] = `${W.slice(i, upto + 1).join(" ").replace(/[,:.;!?]+$/, "")} | ${en}`;
      for (let n = k + 1; n <= done; n++) lines[idx[n]] = "\u0000";
      merged++; i = upto + 1; k = done + 1; continue;
    }
    console.log("STUCK:", label, `word ${i} of ${W.length}, item ${k} of ${idx.length}`); stuck++; return;
  }
}
for (const f of readdirSync(dir).filter((f) => f.endsWith(".request.md")).sort()) {
  const af = `${dir}/${f.replace(".request.md", ".answer.txt")}`; if (!existsSync(af)) continue;
  const req = readFileSync(`${dir}/${f}`, "utf8"); const lines = readFileSync(af, "utf8").split("\n");
  const one = req.match(/^The passage, (.+):\n(.*)$/m);
  if (one) { const part = req.match(/after "WORDS:":\n(.*)$/m); fixBlock(lines, 0, lines.length, part ? part[1] : one[2], f); }
  else {
    const rl = req.split("\n"); const hes = new Map<string, string>();
    for (let i = 0; i < rl.length; i++) { if (/^Sources from the library|^Answer each passage/.test(rl[i])) break; const m = rl[i].match(/^\[(.+)\]$/); if (m) hes.set(m[1], rl[i + 1] ?? ""); }
    const heads: Array<[number, string]> = [];
    lines.forEach((l, n) => { const m = l.trim().match(/^\[(.+)\]$/); if (m && hes.has(m[1].trim())) heads.push([n, m[1].trim()]); });
    heads.forEach(([n, ref], h) => fixBlock(lines, n + 1, h + 1 < heads.length ? heads[h + 1][0] : lines.length, hes.get(ref)!, `${f} ${ref}`));
  }
  writeFileSync(af, lines.filter((l) => l !== "\u0000").join("\n"));
}
console.log(`joined ${merged} words, stuck ${stuck}`);
