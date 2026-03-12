import type { Request, Response, NextFunction } from "express";

/**
 * 보안 헤더 미들웨어
 * XSS, Clickjacking 등 공격 방지
 */

export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.REPLIT_DEPLOYMENT === '1';

  // Content Security Policy (CSP)
  // XSS 공격 방지를 위한 정책 설정
  if (isProduction) {
    // 프로덕션 환경: 엄격한 CSP
    res.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://t1.daumcdn.net", // Daum Postcode API 허용
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https: blob:",
        "font-src 'self' data:",
        "connect-src 'self' https://t1.daumcdn.net", // Daum Postcode API 허용
        "frame-src 'self' https://t1.daumcdn.net", // Daum Postcode iframe 허용
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'self'",
        "upgrade-insecure-requests",
      ].join('; ')
    );
  } else {
    // 개발 환경: 개발 도구 사용을 위해 완화된 CSP
    res.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://t1.daumcdn.net",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https: blob:",
        "font-src 'self' data:",
        "connect-src 'self' ws: wss: https://t1.daumcdn.net",
        "frame-src 'self' https://t1.daumcdn.net",
      ].join('; ')
    );
  }

  // X-Content-Type-Options: MIME 타입 스니핑 방지
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // X-Frame-Options: Clickjacking 방지
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  // X-XSS-Protection: 브라우저 XSS 필터 활성화 (레거시 브라우저용)
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer-Policy: 리퍼러 정보 제한
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions-Policy: 브라우저 기능 제한
  res.setHeader(
    'Permissions-Policy',
    [
      'geolocation=()',
      'microphone=()',
      'camera=()',
      'payment=()',
      'usb=()',
    ].join(', ')
  );

  next();
}
