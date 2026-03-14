import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const IV_LENGTH = 12;

let cachedKey: Buffer | undefined;

function resolveKey(): Buffer {
  if (cachedKey) return cachedKey;

  const raw = process.env["TOKEN_ENCRYPTION_KEY"];

  if (!raw) {
    throw new Error("TOKEN_ENCRYPTION_KEY is required.");
  }

  if (/^[a-f0-9]{64}$/i.test(raw)) {
    cachedKey = Buffer.from(raw, "hex");
    return cachedKey;
  }

  try {
    const decoded = Buffer.from(raw, "base64");

    if (decoded.length === 32) {
      cachedKey = decoded;
      return cachedKey;
    }
  } catch {
    // Fall through to hash mode.
  }

  cachedKey = createHash("sha256").update(raw).digest();
  return cachedKey;
}

export function sealSecret(value: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", resolveKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function openSecret(value: string): string {
  const [ivPart, tagPart, encryptedPart] = value.split(".");

  if (!ivPart || !tagPart || !encryptedPart) {
    throw new Error("Encrypted secret has invalid format.");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    resolveKey(),
    Buffer.from(ivPart, "base64url"),
  );

  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedPart, "base64url")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
