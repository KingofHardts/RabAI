/*
 * Pictures a person attaches to a question (founding spec, "Pictures with a question"). Shared by
 * the app, which shrinks each picture on the device before sending it, and the server, which
 * checks what arrives. Pure functions only.
 *
 * A picture is read by RabAI for this question and the next few in the same chat. It is never
 * kept on the server: not with the answer while it is written (lib/answer-jobs.ts), not anywhere.
 * The device keeps a small preview of it with the saved chat.
 */

export type PictureType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";
export const PICTURE_TYPES: readonly PictureType[] = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export interface QuestionPicture {
  mediaType: PictureType;
  /** The picture's bytes, base64. */
  data: string;
}

export const PICTURE_LIMITS = {
  /** Pictures with one question. */
  perQuestion: 4,
  /** Pictures from earlier in the chat sent again with a follow-up, so RabAI can still see them. */
  inHistory: 4,
  /**
   * The longest side the app sends. Claude's newer models read a picture at up to 2576 pixels on
   * its long side, which matters for a photo of a whole page of small print.
   */
  longSide: 2576,
  /** And at most about this many pixels: Claude reads up to 4784 squares of 28 by 28 pixels. */
  maxPixels: 3_700_000,
  /** What the app aims for with one picture, in base64 characters (about 900 KB). */
  targetChars: 1_200_000,
  /** One picture, in base64 characters (about 1.5 MB). The server refuses anything bigger. */
  maxChars: 2_000_000,
  /** All pictures in one request, in base64 characters, under the hosting limit of 4.5 MB. */
  totalChars: 3_300_000,
  /** The preview kept with a saved chat: its longest side, in pixels. */
  previewSide: 240,
};

/** Asked for the person when they send pictures without words. */
export const PICTURE_QUESTION = "What is in this picture? Please read it and explain it to me.";
export const PICTURES_QUESTION = "What is in these pictures? Please read them and explain them to me.";

export function questionForPictures(count: number): string {
  return count > 1 ? PICTURES_QUESTION : PICTURE_QUESTION;
}

const B64 = /^[A-Za-z0-9+/]+={0,2}$/;

function firstBytes(data: string, n: number): number[] | null {
  const chunk = data.slice(0, Math.ceil(n / 3) * 4 + 4).replace(/=+$/, "");
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const out: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const ch of chunk) {
    const v = alphabet.indexOf(ch);
    if (v < 0) return null;
    buffer = (buffer << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((buffer >> bits) & 0xff);
      if (out.length >= n) break;
    }
  }
  return out;
}

/** The picture's real type, read from its first bytes (never trusted from the name it came with). */
export function pictureType(data: string): PictureType | null {
  const b = firstBytes(data, 12);
  if (!b || b.length < 12) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return "image/gif";
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50)
    return "image/webp";
  return null;
}

/**
 * The pictures in a request, checked: base64 of a real JPEG, PNG, WebP or GIF, within the limits.
 * Returns an error message for the person when something is wrong.
 */
export function readPictures(raw: unknown, max: number): QuestionPicture[] | string {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) return "Pictures must be a list.";
  if (raw.length > max) return `Please send at most ${max} pictures at a time.`;
  const out: QuestionPicture[] = [];
  for (const p of raw) {
    if (!p || typeof p !== "object") return "A picture couldn't be read.";
    const data = (p as Record<string, unknown>).data;
    if (typeof data !== "string" || !data || data.length > PICTURE_LIMITS.maxChars) return "A picture is too large. Please try a smaller one.";
    if (!B64.test(data)) return "A picture couldn't be read.";
    const mediaType = pictureType(data);
    if (!mediaType) return "Only photos and pictures (JPEG, PNG, WebP or GIF) can be sent.";
    out.push({ mediaType, data });
  }
  return out;
}

/** The total size of some pictures, in base64 characters. */
export function picturesSize(pictures: QuestionPicture[]): number {
  return pictures.reduce((n, p) => n + p.data.length, 0);
}
