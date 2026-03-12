import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";

/**
 * CSRF 보호 미들웨어
 * Cross-Site Request Forgery 공격 방지
 * 
 * SameSite 쿠키로 기본 보호되지만, 추가 보안을 위해 CSRF 토큰 사용
 */

declare module 'express-session' {
  interface SessionData {
    csrfToken?: string;
  }
}

/**
 * CSRF 토큰 생성
 */
function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * CSRF 토큰 검증 미들웨어
 * GET 요청은 제외 (읽기 전용)
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  // GET, HEAD, OPTIONS 요청은 CSRF 검증 제외
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // 세션이 없으면 인증이 안 된 상태이므로 CSRF 검증 불필요
  if (!req.session) {
    return next();
  }

  // CSRF 토큰이 세션에 없으면 생성
  if (!req.session.csrfToken) {
    req.session.csrfToken = generateCsrfToken();
  }

  // 요청에서 CSRF 토큰 추출 (헤더 우선, body/query는 보안상 권장하지 않음)
  // 주의: body는 express.json() 미들웨어가 파싱한 후에만 접근 가능
  const tokenFromRequest = 
    (req.headers['x-csrf-token'] as string) ||
    (req.body && typeof req.body === 'object' && 'csrfToken' in req.body ? req.body.csrfToken : undefined) ||
    (req.query && typeof req.query === 'object' && 'csrfToken' in req.query ? req.query.csrfToken : undefined);

  // 토큰 검증
  if (!tokenFromRequest || tokenFromRequest !== req.session.csrfToken) {
    return res.status(403).json({
      error: "CSRF 토큰이 유효하지 않습니다. 페이지를 새로고침하고 다시 시도해주세요.",
    });
  }

  next();
}

/**
 * CSRF 토큰 제공 엔드포인트
 * 클라이언트에서 토큰을 가져올 수 있도록
 */
export function getCsrfToken(req: Request, res: Response) {
  if (!req.session) {
    return res.status(401).json({ error: "인증이 필요합니다" });
  }

  // 토큰이 없으면 생성
  if (!req.session.csrfToken) {
    req.session.csrfToken = generateCsrfToken();
  }

  res.json({ csrfToken: req.session.csrfToken });
}
