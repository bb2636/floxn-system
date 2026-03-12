import type { Request, Response, NextFunction } from "express";

/**
 * HTTPS 강제 리다이렉트 미들웨어
 * 프로덕션 환경에서 HTTP 요청을 HTTPS로 리다이렉트
 * 
 * Replit 환경에서는 프록시 뒤에서 HTTPS가 처리되므로,
 * X-Forwarded-Proto 헤더를 확인하여 HTTPS를 강제합니다.
 */
export function requireHTTPS(req: Request, res: Response, next: NextFunction) {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.REPLIT_DEPLOYMENT === '1';
  
  // 개발 환경에서는 HTTPS 강제하지 않음
  if (!isProduction) {
    return next();
  }

  // Health check 엔드포인트는 제외
  if (req.path === '/_health') {
    return next();
  }

  // X-Forwarded-Proto 헤더 확인 (프록시 환경)
  const forwardedProto = req.headers['x-forwarded-proto'];
  const isHTTPS = forwardedProto === 'https' || req.secure;

  // HTTPS가 아니면 HTTPS로 리다이렉트
  if (!isHTTPS) {
    const host = req.headers.host || req.hostname;
    const url = req.originalUrl || req.url;
    
    // HTTPS URL 생성
    const httpsUrl = `https://${host}${url}`;
    
    console.warn(`[HTTPS Redirect] Redirecting HTTP request to HTTPS: ${httpsUrl}`);
    return res.redirect(301, httpsUrl);
  }

  // HSTS (HTTP Strict Transport Security) 헤더 추가
  // 브라우저가 향후 1년간 HTTPS만 사용하도록 강제
  res.setHeader(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );

  // HTTPS이면 다음 미들웨어로 진행
  next();
}
