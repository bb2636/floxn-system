import type { Request, Response, NextFunction } from "express";
import { activeUserSessions } from "../session-store";

/**
 * 세션 보안 강화 미들웨어
 * - 세션 타임아웃 자동 연장
 * - 비활성 세션 감지
 * - 세션 하이재킹 감지
 */

// 세션 마지막 활동 시간 추적
const sessionLastActivity = new Map<string, number>();

// 비활성 타임아웃 (30분)
const INACTIVE_TIMEOUT = 30 * 60 * 1000;

// 세션 타임아웃 자동 연장 간격 (5분)
const SESSION_EXTEND_INTERVAL = 5 * 60 * 1000;

// 주기적으로 비활성 세션 정리
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, lastActivity] of sessionLastActivity.entries()) {
    if (now - lastActivity > INACTIVE_TIMEOUT) {
      sessionLastActivity.delete(sessionId);
      // 비활성 세션은 세션 스토어에서 자동으로 만료됨
    }
  }
}, 60000); // 1분마다 체크

/**
 * 세션 보안 미들웨어
 */
export function sessionSecurity(req: Request, res: Response, next: NextFunction) {
  if (!req.session || !req.session.userId) {
    return next();
  }

  const sessionId = req.sessionID;
  const now = Date.now();
  const lastActivity = sessionLastActivity.get(sessionId) || now;

  // 비활성 세션 체크
  if (now - lastActivity > INACTIVE_TIMEOUT) {
    // 세션 만료 (비동기 destroy 후 응답)
    sessionLastActivity.delete(sessionId);
    req.session.destroy((err) => {
      if (err) {
        console.error("[Session Security] Failed to destroy inactive session:", err);
      }
      // destroy 완료 후 응답 (이미 응답이 보내졌을 수 있으므로 체크)
      if (!res.headersSent) {
        res.status(401).json({ error: "세션이 만료되었습니다. 다시 로그인해주세요." });
      }
    });
    return; // destroy 콜백에서 응답 처리
  }

  // 세션 타임아웃 자동 연장 (5분마다)
  if (now - lastActivity > SESSION_EXTEND_INTERVAL) {
    // 세션 쿠키 연장
    if (req.session.cookie) {
      const currentMaxAge = req.session.cookie.maxAge || 24 * 60 * 60 * 1000;
      req.session.cookie.maxAge = currentMaxAge;
      req.session.touch();
    }
  }

  // 마지막 활동 시간 업데이트
  sessionLastActivity.set(sessionId, now);

  // 세션 하이재킹 감지: IP 주소 변경 체크
  const currentIp = getClientIp(req);
  const sessionIp = (req.session as any).ipAddress;

  if (sessionIp && sessionIp !== currentIp) {
    // IP 주소가 변경되었지만, 프록시 환경에서는 정확하지 않을 수 있음
    // 로그만 기록하고 경고 (프로덕션에서는 더 엄격하게 처리 가능)
    console.warn("[Session Security] IP address changed", {
      sessionId,
      userId: req.session.userId,
      oldIp: sessionIp,
      newIp: currentIp,
    });
  } else if (!sessionIp) {
    // 첫 요청 시 IP 주소 저장
    (req.session as any).ipAddress = currentIp;
  }

  next();
}

/**
 * Request에서 IP 주소 추출
 */
function getClientIp(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    (req.headers['x-real-ip'] as string) ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}
