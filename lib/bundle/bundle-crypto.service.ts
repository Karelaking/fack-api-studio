/**
 * Fack API - Bundle Cryptography Service
 *
 * Implements authenticated encryption (AES-256-GCM) with PBKDF2 key derivation
 * for offline project runtime bundles.
 */

import crypto from "node:crypto";
import {
  BUNDLE_MAGIC_HEADER,
  BUNDLE_SPEC_VERSION,
  type FackRuntimeBundle,
  type DecryptedBundleResult,
} from "./bundle.type";

const MAGIC_BYTES = Buffer.from(BUNDLE_MAGIC_HEADER, "utf-8");
const SALT_LENGTH_BYTES = 16;
const IV_LENGTH_BYTES = 12;
const TAG_LENGTH_BYTES = 16;
const PBKDF2_ITERATIONS = 100000;
const KEY_LENGTH_BYTES = 32;
const HEADER_MIN_LENGTH =
  4 + 1 + SALT_LENGTH_BYTES + IV_LENGTH_BYTES + TAG_LENGTH_BYTES;

/**
 * Resolves the master encryption secret salt.
 * Throws in production when FACK_ENCRYPTION_SECRET is missing to prevent predictable keys.
 */
export function getMasterEncryptionSalt(): string {
  const secret = process.env.FACK_ENCRYPTION_SECRET;
  if (secret && secret.length > 0) {
    return secret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "FACK_ENCRYPTION_SECRET must be configured to generate or validate project bundles in production.",
    );
  }

  return "fack-api-local-bundle-master-salt-v1";
}

/**
 * Derives a deterministic project secret key for a given project ID.
 */
export function generateProjectSecretKey(projectId: string): string {
  const salt = getMasterEncryptionSalt();
  const hmac = crypto.createHmac("sha256", salt);
  hmac.update(projectId);
  const hash = hmac.digest("hex").slice(0, 32);
  return `fack_sec_${hash}`;
}

/**
 * Validates whether a provided secret key is valid for a given project ID.
 */
export function validateProjectSecretKey(
  projectId: string,
  candidateKey: string,
): boolean {
  const expectedKey = generateProjectSecretKey(projectId);
  const candidateBuffer = Buffer.from(candidateKey);
  const expectedBuffer = Buffer.from(expectedKey);

  if (candidateBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(candidateBuffer, expectedBuffer);
}

/**
 * Encrypts a FackRuntimeBundle using AES-256-GCM with PBKDF2 key derivation.
 */
export function encryptBundle(
  bundle: FackRuntimeBundle,
  secretKey: string,
): Buffer {
  const jsonString = JSON.stringify(bundle);
  const salt = crypto.randomBytes(SALT_LENGTH_BYTES);
  const derivedKey = crypto.pbkdf2Sync(
    secretKey,
    salt,
    PBKDF2_ITERATIONS,
    KEY_LENGTH_BYTES,
    "sha256",
  );

  const iv = crypto.randomBytes(IV_LENGTH_BYTES);
  const cipher = crypto.createCipheriv("aes-256-gcm", derivedKey, iv);

  const ciphertext = Buffer.concat([
    cipher.update(jsonString, "utf-8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();
  const versionByte = Buffer.from([BUNDLE_SPEC_VERSION]);

  return Buffer.concat([
    MAGIC_BYTES,
    versionByte,
    salt,
    iv,
    authTag,
    ciphertext,
  ]);
}

/**
 * Decrypts an encrypted bundle buffer using AES-256-GCM and the secret key.
 */
export function decryptBundle(
  data: Buffer | Uint8Array,
  secretKey: string,
): DecryptedBundleResult {
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);

  if (buffer.length < HEADER_MIN_LENGTH) {
    throw new Error(
      "Invalid bundle: file is too small to be a valid Fack bundle.",
    );
  }

  const magic = buffer.subarray(0, 4);
  if (!magic.equals(MAGIC_BYTES)) {
    throw new Error("Invalid bundle: missing FACK magic header.");
  }

  const version = buffer.readUInt8(4);
  if (version !== BUNDLE_SPEC_VERSION) {
    throw new Error(
      `Unsupported bundle version: ${version}. Expected: ${BUNDLE_SPEC_VERSION}.`,
    );
  }

  let offset = 5;
  const salt = buffer.subarray(offset, offset + SALT_LENGTH_BYTES);
  offset += SALT_LENGTH_BYTES;

  const iv = buffer.subarray(offset, offset + IV_LENGTH_BYTES);
  offset += IV_LENGTH_BYTES;

  const authTag = buffer.subarray(offset, offset + TAG_LENGTH_BYTES);
  offset += TAG_LENGTH_BYTES;

  const ciphertext = buffer.subarray(offset);

  const derivedKey = crypto.pbkdf2Sync(
    secretKey,
    salt,
    PBKDF2_ITERATIONS,
    KEY_LENGTH_BYTES,
    "sha256",
  );

  const decipher = crypto.createDecipheriv("aes-256-gcm", derivedKey, iv);
  decipher.setAuthTag(authTag);

  try {
    const decryptedUtf8 = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf-8");

    const parsed = JSON.parse(decryptedUtf8) as FackRuntimeBundle;

    if (
      parsed.magic !== BUNDLE_MAGIC_HEADER ||
      parsed.version !== BUNDLE_SPEC_VERSION
    ) {
      throw new Error("Decrypted payload failed bundle schema verification.");
    }

    return {
      bundle: parsed,
      rawJson: decryptedUtf8,
    };
  } catch {
    throw new Error(
      "Failed to decrypt bundle. Ensure the project secret key is correct and the bundle has not been tampered with.",
    );
  }
}
