import "server-only";

import crypto from "node:crypto";

import { supabaseEnv } from "@/lib/supabase/env";
import type { Uuid } from "@/types/catalog";

const ORDER_CODE_REGEX = /^[A-Z0-9]{2,10}-[0-9]{1,8}$/;
const TOKEN_FORMAT_REGEX = /^[A-Za-z0-9_-]{24,120}$/;

function getTrackingKey(): Buffer {
  const secret =
    process.env.ORDER_TRACKING_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.TROPIPAY_CLIENT_SECRET?.trim() ||
    `${supabaseEnv.url}:${supabaseEnv.storeSlug}:order-tracking-fallback-v1`;

  return crypto
    .createHash("sha256")
    .update(`dulce-delia:order-tracking-token:v1:${secret}`, "utf8")
    .digest();
}

/**
 * Checks whether a user-entered string looks like a plain consecutive order code
 * (e.g. "DEL-1001" or "#DEL-1001") rather than an encrypted validation token.
 */
export function isPlainOrderCode(raw: string): boolean {
  const clean = raw.trim().replace(/^#/, "").toUpperCase();
  return ORDER_CODE_REGEX.test(clean);
}

/**
 * Extracts a tracking token if the user pasted a full `/pedido/<token>` URL,
 * or returns the trimmed input string.
 */
export function extractTrackingTokenCandidate(raw: string): string {
  const trimmed = raw.trim();
  const match = trimmed.match(/\/pedido\/([^/?#\s]+)/i);
  if (match?.[1]) {
    try {
      return decodeURIComponent(match[1]).trim();
    } catch {
      return match[1].trim();
    }
  }
  return trimmed;
}

/**
 * Deterministically encrypts and authenticates `(storeId, orderCode)` using
 * AES-256-GCM with a synthetic IV (SIV) and storeId bound via AAD.
 *
 * This prevents order enumeration by consecutive `order_code` while remaining
 * stateless and compatible with all existing and future orders.
 */
export function encryptOrderTrackingToken(orderCode: string, storeId: Uuid): string {
  const cleanCode = orderCode.trim().replace(/^#/, "").toUpperCase();
  const cleanStoreId = storeId.trim().toLowerCase();
  const key = getTrackingKey();

  const iv = crypto
    .createHmac("sha256", key)
    .update(`iv:${cleanStoreId}:${cleanCode}`, "utf8")
    .digest()
    .subarray(0, 12);

  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv, { authTagLength: 12 });
  cipher.setAAD(Buffer.from(cleanStoreId, "utf8"));
  const ciphertext = Buffer.concat([cipher.update(cleanCode, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, ciphertext, authTag]).toString("base64url");
}

/**
 * Validates and decrypts an encrypted tracking token for a given `storeId`.
 * Returns the canonical uppercase `order_code` (e.g. "DEL-1004") if valid,
 * or `null` if the token is plain text, tampered, or belongs to another store.
 */
export function decryptOrderTrackingToken(rawToken: string, storeId: Uuid): string | null {
  try {
    const candidate = extractTrackingTokenCandidate(rawToken);
    if (!candidate || isPlainOrderCode(candidate)) {
      return null;
    }
    if (!TOKEN_FORMAT_REGEX.test(candidate)) {
      return null;
    }

    const buf = Buffer.from(candidate, "base64url");
    // 12-byte IV + at least 4-byte order_code + 12-byte GCM tag = min 28 bytes
    if (buf.length < 28 || buf.length > 48) {
      return null;
    }

    const cleanStoreId = storeId.trim().toLowerCase();
    const key = getTrackingKey();

    const iv = buf.subarray(0, 12);
    const authTag = buf.subarray(buf.length - 12);
    const ciphertext = buf.subarray(12, buf.length - 12);

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv, { authTagLength: 12 });
    decipher.setAAD(Buffer.from(cleanStoreId, "utf8"));
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString(
      "utf8",
    );
    const cleanCode = decrypted.trim().toUpperCase();
    if (!ORDER_CODE_REGEX.test(cleanCode)) {
      return null;
    }

    const expectedIv = crypto
      .createHmac("sha256", key)
      .update(`iv:${cleanStoreId}:${cleanCode}`, "utf8")
      .digest()
      .subarray(0, 12);

    if (!crypto.timingSafeEqual(iv, expectedIv)) {
      return null;
    }

    return cleanCode;
  } catch {
    return null;
  }
}

export function buildOrderTrackingPath(orderCode: string, storeId: Uuid): string {
  const token = encryptOrderTrackingToken(orderCode, storeId);
  return `/pedido/${encodeURIComponent(token)}`;
}
