import type { Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import type { User, Case } from "@shared/schema";

/**
 * 케이스 접근 권한 체크 미들웨어
 * 케이스 ID를 파라미터나 body에서 추출하여 접근 권한을 확인
 */

/**
 * Helper function to check if user has access to a case
 */
function checkCaseAccess(user: User, caseData: Case): boolean {
  const isPersonal = user.accountType === "개인";
  
  switch (user.role) {
    case "관리자":
      return true;
    case "협력사":
      if (isPersonal) {
        return (
          caseData.assignedPartner === user.company &&
          (caseData.assignedPartnerManager === user.name ||
            caseData.createdBy === user.id ||
            caseData.assignedTo === user.id)
        );
      } else {
        return caseData.assignedPartner === user.company;
      }
    case "보험사":
      if (isPersonal) {
        return (
          caseData.insuranceCompany === user.company &&
          (caseData.managerId === user.id || caseData.createdBy === user.id)
        );
      } else {
        return caseData.insuranceCompany === user.company;
      }
    case "심사사":
      if (isPersonal) {
        return (
          caseData.assessorId === user.company &&
          caseData.assessorTeam === user.name
        );
      } else {
        return caseData.assessorId === user.company;
      }
    case "조사사":
      if (isPersonal) {
        return (
          caseData.investigatorTeam === user.company &&
          caseData.investigatorTeamName === user.name
        );
      } else {
        return caseData.investigatorTeam === user.company;
      }
    case "의뢰사":
      if (isPersonal) {
        return caseData.clientName === user.name;
      } else {
        return caseData.clientResidence === user.company;
      }
    default:
      return false;
  }
}

/**
 * 케이스 접근 권한 체크 미들웨어
 * 
 * 사용법:
 * - URL 파라미터에서 caseId 추출: `requireCaseAccess({ paramName: 'id' })`
 * - Request body에서 caseId 추출: `requireCaseAccess({ bodyName: 'caseId' })`
 * - 둘 다 확인: `requireCaseAccess({ paramName: 'id', bodyName: 'caseId' })`
 */
export function requireCaseAccess(options: {
  paramName?: string;
  bodyName?: string;
  queryName?: string;
} = {}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // 인증 확인
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    try {
      // 사용자 정보 조회
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ error: "사용자를 찾을 수 없습니다" });
      }

      // 관리자는 모든 케이스에 접근 가능
      if (user.role === "관리자") {
        return next();
      }

      // 케이스 ID 추출
      let caseId: string | undefined;
      const caseIds: string[] = [];

      // URL 파라미터에서 추출
      if (options.paramName) {
        const paramCaseId = req.params[options.paramName];
        if (paramCaseId) {
          caseIds.push(paramCaseId);
          caseId = paramCaseId; // 첫 번째 caseId를 기본값으로 사용
        }
      }

      // Request body에서 추출
      if (options.bodyName) {
        const bodyCaseId = req.body?.[options.bodyName];
        if (bodyCaseId) {
          caseIds.push(bodyCaseId);
          if (!caseId) caseId = bodyCaseId; // 아직 caseId가 없으면 설정
        }
      }

      // Query string에서 추출
      if (options.queryName) {
        const queryCaseId = req.query[options.queryName] as string;
        if (queryCaseId) {
          caseIds.push(queryCaseId);
          if (!caseId) caseId = queryCaseId; // 아직 caseId가 없으면 설정
        }
      }

      // caseId가 없으면 다음 미들웨어로 진행 (케이스 ID가 필요 없는 경우)
      if (!caseId) {
        return next();
      }

      // 여러 caseId가 있으면 모두 체크 (예: clone-documents에서 sourceCaseId와 caseId 모두 체크)
      for (const idToCheck of caseIds) {
        const caseData = await storage.getCaseById(idToCheck);
        if (!caseData) {
          return res.status(404).json({ error: `케이스를 찾을 수 없습니다 (ID: ${idToCheck})` });
        }

        // 권한 체크
        if (!checkCaseAccess(user, caseData)) {
          return res.status(403).json({ error: `해당 케이스에 접근할 권한이 없습니다 (ID: ${idToCheck})` });
        }
      }

      // 권한이 있으면 케이스 데이터를 request에 저장 (다음 핸들러에서 사용 가능)
      // 기본 caseId의 케이스 데이터 저장
      const caseData = await storage.getCaseById(caseId);
      if (caseData) {
        (req as any).caseData = caseData;
      }
      next();
    } catch (error) {
      console.error("[CaseAccess] Error checking case access:", error);
      res.status(500).json({ error: "케이스 접근 권한 확인 중 오류가 발생했습니다" });
    }
  };
}
