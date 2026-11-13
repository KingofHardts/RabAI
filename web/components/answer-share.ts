/*
 * Ways to take an answer out of the app, all made on the device: a picture of it (for WhatsApp and
 * the like) and a printable source sheet of the texts it cited. Nothing is sent anywhere; the
 * person shares or prints it themselves. A text from the testing library says so on both, as it
 * does in the app.
 */
import type { LivePassage } from "@/lib/engine/live-sources";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** Lines of text wrapped to a width, by words. */
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const out: string[] = [];
  for (const para of text.split(/\n+/)) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width > width && line) {
        out.push(line);
        line = word;
      } else line = next;
    }
    if (line) out.push(line);
    out.push("");
  }
  while (out.length && !out[out.length - 1]) out.pop();
  return out;
}

/**
 * A picture of the answer: the question, the answer (cut at about 900 letters, with "…"), the texts
 * it cited and RabbAI's line. A PNG, 1080 pixels wide.
 */
export async function answerPicture(question: string, answer: string, refs: string[], testing: boolean): Promise<Blob | null> {
  if (typeof document === "undefined") return null;
  const W = 1080;
  const pad = 72;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const body = answer.length > 900 ? `${answer.slice(0, 900).replace(/\s+\S*$/, "")} …` : answer;
  const serif = '"Source Serif 4", Georgia, serif';
  const sans = '"IBM Plex Sans", system-ui, sans-serif';
  ctx.font = `600 38px ${serif}`;
  const qLines = wrap(ctx, question, W - pad * 2).slice(0, 4);
  ctx.font = `32px ${serif}`;
  const aLines = wrap(ctx, body, W - pad * 2);
  ctx.font = `26px ${sans}`;
  const sources = refs.slice(0, 6);
  const footer = [testing ? "Texts from RabbAI's testing library, not yet approved by the rabbinic board." : "", "From RabbAI, an AI Torah teacher, not a rav."].filter(Boolean);
  const fLines = footer.flatMap((f) => wrap(ctx, f, W - pad * 2));
  const H = pad + 40 + qLines.length * 52 + 36 + aLines.length * 46 + 40 + (sources.length ? 44 + sources.length * 38 : 0) + 30 + fLines.length * 36 + pad;
  canvas.width = W;
  canvas.height = H;
  ctx.fillStyle = "#fbf8f1";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#24476b";
  ctx.fillRect(0, 0, W, 14);
  let y = pad + 20;
  ctx.textBaseline = "top";
  ctx.fillStyle = "#6b6157";
  ctx.font = `600 24px ${sans}`;
  ctx.fillText("RabbAI", pad, y);
  y += 40;
  ctx.fillStyle = "#1d1a16";
  ctx.font = `600 38px ${serif}`;
  for (const l of qLines) {
    ctx.fillText(l, pad, y);
    y += 52;
  }
  y += 36;
  ctx.font = `32px ${serif}`;
  ctx.fillStyle = "#2a2621";
  for (const l of aLines) {
    if (l) ctx.fillText(l, pad, y);
    y += 46;
  }
  y += 40;
  if (sources.length) {
    ctx.font = `600 24px ${sans}`;
    ctx.fillStyle = "#6b6157";
    ctx.fillText("Sources", pad, y);
    y += 44;
    ctx.font = `26px ${sans}`;
    ctx.fillStyle = "#24476b";
    for (const r of sources) {
      ctx.fillText(`• ${r}`, pad, y);
      y += 38;
    }
  }
  y += 30;
  ctx.font = `26px ${sans}`;
  ctx.fillStyle = "#6b6157";
  for (const l of fLines) {
    ctx.fillText(l, pad, y);
    y += 36;
  }
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}

/** Share a picture with the share sheet where it can take files, else save it. */
export async function sharePicture(blob: Blob, name = "rabbai-answer.png"): Promise<"shared" | "saved" | "failed"> {
  const file = new File([blob], name, { type: "image/png" });
  try {
    const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
    if (typeof nav.share === "function" && nav.canShare?.({ files: [file] })) {
      await nav.share({ files: [file], title: "From RabbAI" });
      return "shared";
    }
  } catch (err) {
    if ((err as Error)?.name === "AbortError") return "failed";
  }
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return "saved";
  } catch {
    return "failed";
  }
}

/**
 * A printable source sheet: the question, then each text the answer cited, in Hebrew and English
 * as the library has them, with its reference. The words are the library's, never the model's.
 */
export function sourceSheetHtml(question: string, passages: LivePassage[], testing: boolean): string {
  const items = passages
    .map(
      (p, i) => `<section><h2>${i + 1}. ${esc(p.label || p.ref)}</h2>${p.caution ? `<p class="caution">${esc(p.caution)}</p>` : ""}${
        p.he ? `<p class="he" lang="he" dir="rtl">${esc(p.he)}</p>` : ""
      }${p.en ? `<p class="en">${esc(p.en)}</p>` : ""}</section>`,
    )
    .join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Source sheet: ${esc(question.slice(0, 80))}</title>
<style>
body{font-family:Georgia,serif;max-width:760px;margin:32px auto;padding:0 20px;color:#1d1a16;line-height:1.5}
h1{font-size:24px;font-weight:600;margin:0 0 4px}.q{color:#6b6157;font-family:system-ui,sans-serif;font-size:14px;margin:0 0 24px}
section{break-inside:avoid;border-top:1px solid #ddd;padding:14px 0}h2{font-size:16px;font-family:system-ui,sans-serif;margin:0 0 8px;color:#24476b}
.he{font-family:"Frank Ruhl Libre","David",serif;font-size:21px;line-height:1.8;text-align:right;margin:0 0 8px}.en{margin:0}
.caution{font-family:system-ui,sans-serif;font-size:13px;color:#8a5a00}
footer{border-top:1px solid #ddd;margin-top:20px;padding-top:10px;font-family:system-ui,sans-serif;font-size:12px;color:#6b6157}
@media print{button{display:none}}
</style></head><body><h1>Source sheet</h1><p class="q">${esc(question)}</p>${items}<footer>${
    testing ? "Texts from RabbAI's testing library, not yet approved by the rabbinic board. " : ""
  }Gathered by RabbAI, an AI Torah teacher, not a rav.</footer><p><button onclick="print()">Print</button></p></body></html>`;
}

/** Open the source sheet in a new tab, ready to print. */
export function openSourceSheet(html: string): boolean {
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank");
  if (!w) {
    // A blocked new tab: the sheet is saved instead, to open and print.
    const a = document.createElement("a");
    a.href = url;
    a.download = "rabbai-source-sheet.html";
    a.click();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return !!w;
}
