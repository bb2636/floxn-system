import { storage } from "../storage";
import type { User } from "@shared/schema";

/**
 * 문서 접근 감사 로그 유틸리티
 * 민감한 문서 접근을 추적하여 보안 감사에 활용
 */

export interface DocumentAccessLog {
  documentId: string;
  caseId: string;
  userId: string;
  userName: string;
  userRole: string;
  action: "view" | "download" | "download_url" | "image";
  documentCategory: string;
  documentFileName: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

/**
 * 문서 접근 감사 로그 기록
 * @param logData 감사 로그 데이터
 */
export async function logDocumentAccess(logData: Omit<DocumentAccessLog, "timestamp">): Promise<void> {
  try {
    const user = await storage.getUser(logData.userId);
    const userName = user?.name || "Unknown";
    const userRole = user?.role || "Unknown";

    const logEntry: DocumentAccessLog = {
      ...logData,
      userName,
      userRole,
      timestamp: new Date(),
    };

    // 콘솔에 로그 출력 (프로덕션 환경에서도 감사 추적을 위해)
    console.log("[Document Access Audit]", JSON.stringify({
      documentId: logEntry.documentId,
      caseId: logEntry.caseId,
      userId: logEntry.userId,
      userName: logEntry.userName,
      userRole: logEntry.userRole,
      action: logEntry.action,
      documentCategory: logEntry.documentCategory,
      documentFileName: logEntry.documentFileName,
      ipAddress: logEntry.ipAddress,
      timestamp: logEntry.timestamp.toISOString(),
    }));

    // TODO: 향후 데이터베이스에 저장하는 기능 추가 가능
    // await storage.saveDocumentAccessLog(logEntry);
  } catch (error) {
    // 감사 로그 기록 실패는 시스템 오류로 처리하지 않음 (요청은 계속 진행)
    console.error("[Document Access Audit] Failed to log document access:", error);
  }
}

/**
 * Request에서 IP 주소 추출
 */
export function getClientIp(req: any): string | undefined {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    undefined
  );
}

/**
 * Request에서 User-Agent 추출
 */
export function getUserAgent(req: any): string | undefined {
  return req.headers['user-agent'] || undefined;
}
