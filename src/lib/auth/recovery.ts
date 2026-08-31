import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from "node:crypto";

const RECOVERY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function requireSecret(secret: string) {
  if (secret.length < 32) throw new Error("Account recovery is not configured.");
}

function normalizeRecoveryCode(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function deliveryKey(secret: string) {
  requireSecret(secret);
  return createHash("sha256").update(`yuzheng-recovery-delivery:${secret}`).digest();
}

export function generateRecoveryCode() {
  const raw = Array.from({ length: 20 }, () => RECOVERY_ALPHABET[randomInt(RECOVERY_ALPHABET.length)]).join("");
  return raw.match(/.{5}/g)?.join("-") ?? raw;
}

export function digestRecoveryCode(code: string, secret: string) {
  requireSecret(secret);
  return createHmac("sha256", secret).update(normalizeRecoveryCode(code)).digest("hex");
}

export function recoveryCodeMatches(code: string, expectedDigest: string, secret: string) {
  const actual = Buffer.from(digestRecoveryCode(code, secret), "hex");
  const expected = Buffer.from(expectedDigest, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function sealRecoveryDelivery(code: string, secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deliveryKey(secret), iv);
  const encrypted = Buffer.concat([cipher.update(code, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function openRecoveryDelivery(payload: string, secret: string) {
  try {
    const parts = payload.split(".");
    if (parts.length !== 4) return null;
    const [version, ivValue, tagValue, encryptedValue] = parts;
    if (version !== "v1" || !ivValue || !tagValue || !encryptedValue) return null;
    const iv = Buffer.from(ivValue, "base64url");
    const tag = Buffer.from(tagValue, "base64url");
    const encrypted = Buffer.from(encryptedValue, "base64url");
    if (
      iv.toString("base64url") !== ivValue
      || tag.toString("base64url") !== tagValue
      || encrypted.toString("base64url") !== encryptedValue
    ) return null;
    const decipher = createDecipheriv("aes-256-gcm", deliveryKey(secret), iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  } catch {
    return null;
  }
}
