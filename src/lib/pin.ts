import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

// 가족 공용 PIN (읽기 전용 접근).
// FAMILY_PIN + PIN_COOKIE_SECRET 가 모두 설정된 경우에만 활성화(opt-in).
// 보안 주의: PIN+URL을 아는 누구나 전체 열람 가능. 강한 PIN 권장. 읽기 전용.

export const FAMILY_COOKIE = "family_access";
const TOKEN_VERSION = "v1";
const MAX_AGE_MS = 400 * 24 * 60 * 60 * 1000; // 400일

export function isPinEnabled(): boolean {
  return Boolean(process.env.FAMILY_PIN && process.env.PIN_COOKIE_SECRET);
}

function secret(): string {
  return process.env.PIN_COOKIE_SECRET!;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/** 입력 PIN이 설정된 FAMILY_PIN과 일치하는지(타이밍 안전 비교). */
export function verifyPin(input: string): boolean {
  if (!isPinEnabled()) return false;
  return safeEqual(input, process.env.FAMILY_PIN!);
}

/** 접근 쿠키 토큰 생성: `v1.<issuedAt>.<hmac>` */
export function createAccessToken(): string {
  const payload = `${TOKEN_VERSION}.${Date.now()}`;
  return `${payload}.${sign(payload)}`;
}

/** 쿠키 토큰 검증(서명 + 만료). */
export function verifyAccessToken(token: string | undefined): boolean {
  if (!isPinEnabled() || !token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [ver, issued, sig] = parts;
  if (ver !== TOKEN_VERSION) return false;
  const payload = `${ver}.${issued}`;
  if (!safeEqual(sig, sign(payload))) return false;
  const issuedAt = Number(issued);
  if (!Number.isFinite(issuedAt)) return false;
  if (Date.now() - issuedAt > MAX_AGE_MS) return false;
  return true;
}

export const FAMILY_COOKIE_MAX_AGE = Math.floor(MAX_AGE_MS / 1000);
