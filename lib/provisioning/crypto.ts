import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function encryptionKey() {
  const configured = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!configured) {
    if (process.env.NODE_ENV === "production") throw new Error("CREDENTIAL_ENCRYPTION_KEY is required for VPN provisioning");
    return createHash("sha256").update("most-development-credential-key").digest();
  }
  if (configured.length < 32) throw new Error("CREDENTIAL_ENCRYPTION_KEY must contain at least 32 characters");
  return createHash("sha256").update(configured).digest();
}

export function encryptProvisioningPayload(value: unknown) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return [iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptProvisioningPayload<T>(value: string): T {
  const [ivEncoded, tagEncoded, ciphertextEncoded, extra] = value.split(".");
  if (!ivEncoded || !tagEncoded || !ciphertextEncoded || extra) throw new Error("Invalid encrypted provisioning payload");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivEncoded, "base64url"));
  decipher.setAuthTag(Buffer.from(tagEncoded, "base64url"));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(ciphertextEncoded, "base64url")), decipher.final()]).toString("utf8")) as T;
}
