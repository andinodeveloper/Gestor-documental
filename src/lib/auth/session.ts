import type { AppRole } from "@/lib/auth/types";

export const SESSION_COOKIE_NAME = "gd_session";
const SESSION_LIFETIME_SECONDS = 60 * 60 * 12;
const tokenVersion = 1;

interface SessionTokenPayload {
  sub: string;
  role: AppRole;
  ver: number;
  iat: number;
  exp: number;
}

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export async function createSessionToken({
  username,
  role,
}: {
  username: string;
  role: AppRole;
}) {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionTokenPayload = {
    sub: username,
    role,
    ver: tokenVersion,
    iat: now,
    exp: now + SESSION_LIFETIME_SECONDS,
  };
  const encodedPayload = encodeBase64Url(textEncoder.encode(JSON.stringify(payload)));
  const signature = await signPayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export async function verifySessionToken(token: string) {
  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = await signPayload(encodedPayload);

  if (signature !== expectedSignature) {
    return null;
  }

  const payload = parsePayload(encodedPayload);

  if (!payload || payload.ver !== tokenVersion) {
    return null;
  }

  if (payload.exp <= Math.floor(Date.now() / 1000)) {
    return null;
  }

  return payload;
}

export function getSessionCookieMaxAge() {
  return SESSION_LIFETIME_SECONDS;
}

async function signPayload(value: string) {
  const secret = process.env.SESSION_SECRET ?? "dev-only-session-secret-change-me";
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, textEncoder.encode(value));

  return encodeBase64Url(new Uint8Array(signatureBuffer));
}

function parsePayload(encodedPayload: string) {
  try {
    const decoded = textDecoder.decode(decodeBase64Url(encodedPayload));
    return JSON.parse(decoded) as SessionTokenPayload;
  } catch {
    return null;
  }
}

function encodeBase64Url(bytes: Uint8Array) {
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  const binary = atob(`${normalized}${padding}`);

  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
