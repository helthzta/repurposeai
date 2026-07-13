import { createHash, randomBytes } from "node:crypto";

/**
 * The random token itself is the secret (256 bits of entropy), so a fast
 * sha256 hash is enough to protect it if the DB leaks — no bcrypt needed.
 */
export function generateApiKey() {
  const secret = randomBytes(24).toString("base64url");
  const plain = `rp_live_${secret}`;
  const prefix = `rp_live_${"•".repeat(8)}${secret.slice(-4)}`;
  const hash = createHash("sha256").update(plain).digest("hex");

  return { plain, prefix, hash };
}
