import { createCipheriv, createDecipheriv, createPrivateKey, createPublicKey, diffieHellman, generateKeyPairSync, hkdfSync, randomBytes } from "node:crypto";
import { gunzipSync, gzipSync } from "node:zlib";

/*
 * Sealed files for the translation inbox (scripts/translate-here.ts and
 * scripts/translations-inbox.ts). Translations made inside a Claude Code session travel to RabAI's
 * translation library through the public GitHub repository, so they are sealed first: anyone can
 * seal a file with the inbox's public key, and only the import job, which holds the private key in
 * the translation library's own database, can open it. Unreviewed translations are never public.
 *
 * X25519 key agreement with a fresh key per file, HKDF-SHA256, AES-256-GCM over the gzipped JSON.
 */

const INFO = "rabai-translations-inbox-v1";

export interface SealedFile {
  v: 1;
  /** The sender's one-time public key (SPKI DER, base64). */
  eph: string;
  iv: string;
  tag: string;
  data: string;
}

export function makeInboxKeys(): { publicKey: string; privateKey: string } {
  const { publicKey, privateKey } = generateKeyPairSync("x25519");
  return {
    publicKey: publicKey.export({ type: "spki", format: "pem" }).toString(),
    privateKey: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
  };
}

function keyFor(shared: Buffer, eph: Buffer): Buffer {
  return Buffer.from(hkdfSync("sha256", shared, eph, INFO, 32));
}

export function seal(publicKeyPem: string, value: unknown): string {
  const eph = generateKeyPairSync("x25519");
  const ephDer = eph.publicKey.export({ type: "spki", format: "der" });
  const shared = diffieHellman({ privateKey: eph.privateKey, publicKey: createPublicKey(publicKeyPem) });
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyFor(shared, ephDer), iv);
  const data = Buffer.concat([cipher.update(gzipSync(Buffer.from(JSON.stringify(value)))), cipher.final()]);
  const file: SealedFile = {
    v: 1,
    eph: ephDer.toString("base64"),
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data: data.toString("base64"),
  };
  return JSON.stringify(file);
}

/** Opens a sealed file. Throws when the key is wrong or the file was changed. */
export function unseal(privateKeyPem: string, text: string): unknown {
  const file = JSON.parse(text) as SealedFile;
  if (file.v !== 1) throw new Error(`Unknown sealed file version ${String(file.v)}.`);
  const ephDer = Buffer.from(file.eph, "base64");
  const shared = diffieHellman({
    privateKey: createPrivateKey(privateKeyPem),
    publicKey: createPublicKey({ key: ephDer, format: "der", type: "spki" }),
  });
  const decipher = createDecipheriv("aes-256-gcm", keyFor(shared, ephDer), Buffer.from(file.iv, "base64"));
  decipher.setAuthTag(Buffer.from(file.tag, "base64"));
  const plain = Buffer.concat([decipher.update(Buffer.from(file.data, "base64")), decipher.final()]);
  return JSON.parse(gunzipSync(plain).toString());
}
