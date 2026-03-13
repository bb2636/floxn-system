import type { Request, Response, NextFunction } from "express";

/**
 * 보안 헤더 미들웨어
 * XSS, Clickjacking 등 공격 방지
 */

export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.REPLIT_DEPLOYMENT === '1';

  // 주소 검색이 필요한 페이지 경로 (CSP 완화 적용)
  // SPA 라우팅을 고려하여 루트 경로도 포함
  const addressSearchPaths = ['/intake', '/admin-settings', '/'];
  const isAddressSearchPage = addressSearchPaths.some(path => {
    // 정확히 일치하거나 하위 경로인지 확인
    return req.path === path || req.path.startsWith(path + '/');
  });

  // Content Security Policy (CSP)
  // XSS 공격 방지를 위한 정책 설정
  // Daum Postcode API 도메인 (카카오로 통합됨):
  // - https://t1.daumcdn.net: 스크립트 로드
  // - https://postcode.map.daum.net: 주소 검색 iframe (레거시)
  // - https://postcode.map.kakao.com: 주소 검색 iframe (신규, 카카오 도메인)
  // - https://ssl.daumcdn.net: 추가 리소스
  // - https://suggest-bar.daum.net: 주소 제안 서비스
  // - https://stlog1-local.kakao.com: 카카오 로깅 서비스
  const daumDomains = "https://t1.daumcdn.net https://postcode.map.daum.net https://postcode.map.kakao.com https://ssl.daumcdn.net https://suggest-bar.daum.net https://stlog1-local.kakao.com";
  
  // 외부 리소스 도메인
  // - https://cdn.jsdelivr.net: Pretendard 폰트 스타일시트
  // - https://fonts.googleapis.com: Google Fonts (Noto Sans KR)
  const externalDomains = "https://cdn.jsdelivr.net https://fonts.googleapis.com";
  
  // 주소 검색 페이지는 CSP를 완화 (Daum API 호환성)
  if (isAddressSearchPage) {
    // 주소 검색 페이지: Daum API 호환을 위해 CSP 완화
    res.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'self' https:",
        `script-src 'self' 'unsafe-inline' 'unsafe-eval' https: ${daumDomains}`,
        "style-src 'self' 'unsafe-inline' https:",
        "img-src 'self' data: https: blob:",
        "font-src 'self' data: https:",
        `connect-src 'self' ws: wss: https: ${daumDomains}`,
        `frame-src 'self' https: ${daumDomains}`,
        `child-src 'self' https: ${daumDomains}`,
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'self'",
      ].join('; ')
    );
  } else if (isProduction) {
    // 프로덕션 환경: 엄격한 CSP (SPA 라우팅 고려하여 모든 페이지에서 필요한 도메인 허용)
    res.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${daumDomains}`, // Daum Postcode API 허용
        `style-src 'self' 'unsafe-inline' ${externalDomains}`, // 외부 폰트 스타일시트 허용
        "img-src 'self' data: https: blob:",
        `font-src 'self' data: ${externalDomains}`, // 외부 폰트 파일 허용
        `connect-src 'self' ${daumDomains}`, // Daum Postcode API 허용
        `frame-src 'self' ${daumDomains}`, // Daum Postcode iframe 허용 (카카오 도메인 포함)
        `child-src 'self' ${daumDomains}`, // Daum Postcode iframe 허용 (frame-src 대체)
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
        `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${daumDomains}`,
        `style-src 'self' 'unsafe-inline' ${externalDomains}`, // 외부 폰트 스타일시트 허용
        "img-src 'self' data: https: blob:",
        `font-src 'self' data: ${externalDomains}`, // 외부 폰트 파일 허용
        `connect-src 'self' ws: wss: ${daumDomains}`,
        `frame-src 'self' ${daumDomains}`, // Daum Postcode iframe 허용 (카카오 도메인 포함)
        `child-src 'self' ${daumDomains}`, // Daum Postcode iframe 허용
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
