import crypto from "crypto";

export const ADMIN_EMAIL = "itsjumah.tj@gmail.com";
const ADMIN_PASSWORD_HASH =
  "01db28934d840035b74f770a24babe081a42e2dc450ee6106b1b59388d6495c2:b81d138284bba135e2a72fc42e436a789ea4746c0bd47fbd98cb9f29e4d812c864716131b6872d53215298600a0cc2acb594e49b665183d667cb0fcc241363c7";

export const ADMIN_COOKIE_NAME = "mc_admin_session";
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 24; // 1 day

const TOKEN_SECRET = crypto
  .createHash("sha256")
  .update("mc-admin-token-" + ADMIN_EMAIL)
  .digest();

export function verifyAdminPassword(password: string): boolean {
  const [salt, hash] = ADMIN_PASSWORD_HASH.split(":");
  if (!salt || !hash) return false;
  const keyBuffer = Buffer.from(hash, "hex");
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(keyBuffer, derivedKey);
}

export function createAdminToken(): string {
  const payload = {
    role: "admin",
    iat: Date.now(),
    exp: Date.now() + ADMIN_COOKIE_MAX_AGE * 1000,
  };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", TOKEN_SECRET)
    .update(data)
    .digest("base64url");
  return `${data}.${signature}`;
}

export function verifyAdminToken(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return false;
    const [data, signature] = parts;
    if (!data || !signature) return false;

    const expected = crypto
      .createHmac("sha256", TOKEN_SECRET)
      .update(data)
      .digest("base64url");

    if (
      expected.length !== signature.length ||
      !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
    ) {
      return false;
    }

    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
    return payload.role === "admin" && payload.exp > Date.now();
  } catch {
    return false;
  }
}
