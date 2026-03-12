import type { Request, Response, NextFunction } from "express";

/**
 * Rate Limiting 미들웨어
 * Brute force 공격 방지를 위한 로그인 시도 제한
 */

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const rateLimitStore: RateLimitStore = {};

// 주기적으로 오래된 항목 정리 (메모리 누수 방지)
setInterval(() => {
  const now = Date.now();
  for (const key in rateLimitStore) {
    if (rateLimitStore[key].resetTime < now) {
      delete rateLimitStore[key];
    }
  }
}, 60000); // 1분마다 정리

/**
 * Rate Limiting 미들웨어 생성
 * @param maxAttempts 최대 시도 횟수
 * @param windowMs 시간 윈도우 (밀리초)
 * @param keyGenerator 요청 키 생성 함수 (기본: IP 주소)
 */
export function rateLimit(options: {
  maxAttempts: number;
  windowMs: number;
  keyGenerator?: (req: Request) => string;
  message?: string;
}) {
  const { maxAttempts, windowMs, keyGenerator, message } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator ? keyGenerator(req) : getClientIp(req) || 'unknown';
    const now = Date.now();

    // 기존 항목이 있고 아직 윈도우 내에 있으면
    if (rateLimitStore[key] && rateLimitStore[key].resetTime > now) {
      rateLimitStore[key].count++;

      // 최대 시도 횟수 초과
      if (rateLimitStore[key].count > maxAttempts) {
        const retryAfter = Math.ceil((rateLimitStore[key].resetTime - now) / 1000);
        res.setHeader('Retry-After', retryAfter.toString());
        return res.status(429).json({
          error: message || "너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.",
          retryAfter,
        });
      }
    } else {
      // 새로운 윈도우 시작
      rateLimitStore[key] = {
        count: 1,
        resetTime: now + windowMs,
      };
    }

    // 남은 시도 횟수 헤더 추가
    const remaining = Math.max(0, maxAttempts - rateLimitStore[key].count);
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', new Date(rateLimitStore[key].resetTime).toISOString());

    next();
  };
}

/**
 * Request에서 IP 주소 추출
 */
function getClientIp(req: Request): string | undefined {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    (req.headers['x-real-ip'] as string) ||
    req.socket?.remoteAddress ||
    undefined
  );
}
