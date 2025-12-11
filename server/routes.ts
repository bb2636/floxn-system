import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { loginSchema, updatePasswordSchema, deleteAccountSchema, createAccountSchema, insertCaseSchema, insertCaseRequestSchema, insertProgressUpdateSchema, insertRolePermissionSchema, insertExcelDataSchema, insertInquirySchema, updateInquirySchema, respondInquirySchema, insertDrawingSchema, insertCaseDocumentSchema, insertMasterDataSchema, insertLaborCostSchema, insertMaterialSchema, reviewCaseSchema } from "@shared/schema";
import { z } from "zod";
import { db } from "./db";
import { estimates, cases } from "@shared/schema";
import { sql, inArray } from "drizzle-orm";
import nodemailer from "nodemailer";

export async function registerRoutes(app: Express): Promise<Server> {
  // Login endpoint
  app.post("/api/login", async (req, res) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      
      const user = await storage.verifyPassword(
        validatedData.username,
        validatedData.password
      );

      if (!user) {
        return res.status(401).json({ 
          error: "아이디 또는 비밀번호가 올바르지 않습니다" 
        });
      }

      if (req.session) {
        req.session.userId = user.id;
        req.session.userRole = user.role;
        req.session.rememberMe = validatedData.rememberMe;
        
        console.log("[LOGIN] Setting session:", {
          userId: user.id,
          userRole: user.role,
          username: user.username,
        });
        
        if (validatedData.rememberMe) {
          req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
        } else {
          req.session.cookie.maxAge = 24 * 60 * 60 * 1000;
        }
      }

      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Login error:", error);
      res.status(500).json({ error: "로그인 중 오류가 발생했습니다" });
    }
  });

  // Logout endpoint
  app.post("/api/logout", async (req, res) => {
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          console.error("Logout error:", err);
          return res.status(500).json({ error: "로그아웃 중 오류가 발생했습니다" });
        }
        res.clearCookie("connect.sid");
        res.json({ success: true });
      });
    } else {
      res.json({ success: true });
    }
  });

  // Get current user endpoint
  app.get("/api/user", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(404).json({ error: "사용자를 찾을 수 없습니다" });
    }

    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  });

  // Check session endpoint
  app.get("/api/check-session", async (req, res) => {
    if (req.session?.userId) {
      const user = await storage.getUser(req.session.userId);
      if (user) {
        const { password, ...userWithoutPassword } = user;
        return res.json({ authenticated: true, user: userWithoutPassword });
      }
    }
    res.json({ authenticated: false });
  });

  // Get all users endpoint (admin only)
  app.get("/api/users", async (req, res) => {
    // Check authentication
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    // Check admin authorization
    if (req.session.userRole !== "관리자") {
      return res.status(403).json({ error: "관리자 권한이 필요합니다" });
    }

    try {
      const users = await storage.getAllUsers();
      // Remove passwords from all users
      const usersWithoutPasswords = users.map(({ password, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ error: "사용자 목록을 불러오는 중 오류가 발생했습니다" });
    }
  });

  // Update password endpoint (admin only)
  app.post("/api/update-password", async (req, res) => {
    // Check authentication
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    // Check admin authorization
    if (req.session.userRole !== "관리자") {
      return res.status(403).json({ error: "관리자 권한이 필요합니다" });
    }

    try {
      // Validate request body with Zod
      const validatedData = updatePasswordSchema.parse(req.body);

      const updatedUser = await storage.updatePassword(
        validatedData.username,
        validatedData.newPassword
      );

      if (!updatedUser) {
        return res.status(404).json({ error: "사용자를 찾을 수 없습니다" });
      }

      const { password, ...userWithoutPassword } = updatedUser;
      res.json({ success: true, user: userWithoutPassword });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Password update error:", error);
      res.status(500).json({ error: "비밀번호 변경 중 오류가 발생했습니다" });
    }
  });

  // Delete account endpoint (admin only - soft delete)
  app.post("/api/delete-account", async (req, res) => {
    // Check authentication
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    // Check admin authorization
    if (req.session.userRole !== "관리자") {
      return res.status(403).json({ error: "관리자 권한이 필요합니다" });
    }

    try {
      // Validate request body with Zod
      const validatedData = deleteAccountSchema.parse(req.body);

      const deletedUser = await storage.deleteAccount(validatedData.username);

      if (!deletedUser) {
        return res.status(404).json({ error: "사용자를 찾을 수 없습니다" });
      }

      const { password, ...userWithoutPassword } = deletedUser;
      res.json({ success: true, user: userWithoutPassword });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Delete account error:", error);
      res.status(500).json({ error: "계정 삭제 중 오류가 발생했습니다" });
    }
  });

  // Create account endpoint (admin only)
  app.post("/api/create-account", async (req, res) => {
    // Check authentication
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    // Check admin authorization
    if (req.session.userRole !== "관리자") {
      return res.status(403).json({ error: "관리자 권한이 필요합니다" });
    }

    try {
      console.log("Create account request body:", JSON.stringify(req.body, null, 2));
      
      // Validate request body with Zod
      const validatedData = createAccountSchema.parse(req.body);
      
      console.log("Validated data:", JSON.stringify(validatedData, null, 2));

      // Check if username already exists
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(409).json({ error: "이미 사용 중인 아이디입니다" });
      }

      // Create new user
      const newUser = await storage.createUser({
        username: validatedData.username,
        password: validatedData.password,
        role: validatedData.role,
        name: validatedData.name,
        company: validatedData.company,
        department: validatedData.department,
        position: validatedData.position,
        email: validatedData.email || undefined,
        phone: validatedData.phone,
        office: validatedData.office,
        address: validatedData.address,
        bankName: validatedData.bankName,
        accountNumber: validatedData.accountNumber,
        accountHolder: validatedData.accountHolder,
        serviceRegions: validatedData.serviceRegions,
        attachments: validatedData.attachments,
        status: "active",
      });
      
      console.log("Created user:", JSON.stringify(newUser, null, 2));

      const { password, ...userWithoutPassword } = newUser;
      res.status(201).json({ success: true, user: userWithoutPassword });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create account error:", error);
      res.status(500).json({ error: "계정 생성 중 오류가 발생했습니다" });
    }
  });

  // Get next case sequence number for a specific date
  app.get("/api/cases/next-sequence", async (req, res) => {
    // Check authentication
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    try {
      const date = req.query.date as string;
      
      if (!date) {
        return res.status(400).json({ error: "날짜가 필요합니다" });
      }

      // Get next sequence info for the given date
      const insuranceAccidentNo = req.query.insuranceAccidentNo as string | undefined;
      const result = await storage.getNextCaseSequence(date, insuranceAccidentNo);
      
      res.json(result);
    } catch (error) {
      console.error("Get next sequence error:", error);
      res.status(500).json({ error: "순번 조회 중 오류가 발생했습니다" });
    }
  });

  // Create case endpoint (supports multi-case creation)
  app.post("/api/cases", async (req, res) => {
    // Check authentication
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    try {
      // Debug: log incoming sameAsPolicyHolder with type
      console.log("📥 Incoming sameAsPolicyHolder:", req.body.sameAsPolicyHolder, "type:", typeof req.body.sameAsPolicyHolder);
      console.log("📥 Incoming managerId:", req.body.managerId);
      
      // Validate request body with Zod
      const validatedData = insertCaseRequestSchema.parse(req.body);
      
      // Debug: log validated sameAsPolicyHolder with type
      console.log("✅ Validated sameAsPolicyHolder:", validatedData.sameAsPolicyHolder, "type:", typeof validatedData.sameAsPolicyHolder);
      console.log("✅ Validated managerId:", validatedData.managerId);
      
      // Determine case types based on damagePreventionCost and victimIncidentAssistance fields
      // 프론트엔드에서 "true"/"false" 문자열로 전송됨
      const hasDamagePrevention = validatedData.damagePreventionCost === "true";
      const hasVictimRecovery = validatedData.victimIncidentAssistance === "true";
      
      console.log("🔍 Processing types:", { hasDamagePrevention, hasVictimRecovery, damagePreventionCost: validatedData.damagePreventionCost, victimIncidentAssistance: validatedData.victimIncidentAssistance });
      
      // Generate caseGroupId (use insuranceAccidentNo or generate unique ID)
      const caseGroupId = validatedData.insuranceAccidentNo || `GROUP-${Date.now()}`;
      
      // Handle draft cases (배당대기 status)
      if (validatedData.status === "배당대기") {
        // Delete existing draft if resuming (only delete if it's still a draft)
        if (validatedData.id) {
          const existingCase = await storage.getCaseById(validatedData.id);
          if (existingCase && existingCase.status === "배당대기") {
            await storage.deleteCase(validatedData.id);
          }
        }
        
        // 임시저장 시에도 실제 접수번호 형식 사용 (접수하기 페이지와 일치)
        // 사고일자를 기준으로 접수번호 생성
        const draftDate = validatedData.accidentDate || new Date().toISOString().split('T')[0];
        const { prefix, suffix } = await storage.getNextCaseSequence(
          draftDate,
          validatedData.insuranceAccidentNo || undefined
        );
        
        // Create draft based on processing types
        const createdCases: any[] = [];
        
        if (hasDamagePrevention && !hasVictimRecovery) {
          // Only damage prevention: create single draft (no suffix)
          const draftCase = await storage.createCase({
            ...validatedData,
            caseNumber: prefix,
            caseGroupId,
            createdBy: req.session.userId,
          });
          createdCases.push(draftCase);
        } else if (!hasDamagePrevention && hasVictimRecovery) {
          // Only victim recovery: create single draft with -N suffix
          const caseNumber = `${prefix}-${suffix === 0 ? 1 : suffix}`;
          const draftCase = await storage.createCase({
            ...validatedData,
            caseNumber,
            caseGroupId,
            createdBy: req.session.userId,
          });
          createdCases.push(draftCase);
        } else if (hasDamagePrevention && hasVictimRecovery) {
          // Both types selected
          // 1. Check if prevention case already exists for this prefix
          const existingPrevention = await storage.getPreventionCaseByPrefix(prefix);
          
          if (!existingPrevention) {
            // Create prevention case (no suffix)
            const preventionData = JSON.parse(JSON.stringify(validatedData));
            const preventionDraft = await storage.createCase({
              ...preventionData,
              caseNumber: prefix,
              caseGroupId,
              createdBy: req.session.userId,
            });
            createdCases.push(preventionDraft);
          }
          
          // 2. Always create victim recovery case with next available suffix
          const nextSuffix = await storage.getNextVictimSuffix(prefix);
          const recoveryData = JSON.parse(JSON.stringify(validatedData));
          const recoveryDraft = await storage.createCase({
            ...recoveryData,
            caseNumber: `${prefix}-${nextSuffix}`,
            caseGroupId,
            createdBy: req.session.userId,
          });
          createdCases.push(recoveryDraft);
        } else {
          // No processing type selected - create single draft with -1 suffix (default victim recovery)
          const caseNumber = `${prefix}-${suffix === 0 ? 1 : suffix}`;
          const draftCase = await storage.createCase({
            ...validatedData,
            caseNumber,
            caseGroupId,
            createdBy: req.session.userId,
          });
          createdCases.push(draftCase);
        }
        
        return res.status(201).json({ success: true, cases: createdCases });
      }
      
      // Handle case completion (접수완료 status)
      if (validatedData.status === "접수완료") {
        // Delete existing draft if resuming (only delete if it's still a draft)
        if (validatedData.id) {
          const existingCase = await storage.getCaseById(validatedData.id);
          if (existingCase && existingCase.status === "배당대기") {
            await storage.deleteCase(validatedData.id);
          }
        }
        
        // Generate case number based on reception date
        const receptionDate = validatedData.receptionDate;
        if (!receptionDate) {
          return res.status(400).json({ error: "접수일이 필요합니다" });
        }
        
        // Parse date (format: YYYY-MM-DD or KST timestamp)
        const fullDate = receptionDate.split('T')[0]; // "2025-11-24"
        
        // ⚠️ CRITICAL: Get case prefix and suffix based on insurance accident number
        // If same accident number exists, reuses the same prefix (B 방식)
        const { prefix, suffix } = await storage.getNextCaseSequence(
          fullDate, 
          validatedData.insuranceAccidentNo || undefined
        );
        // prefix: e.g., "251124001" (yyMMddxxx)
        // suffix: 0 for new accident, incremented for existing accident
        
        const createdCases: any[] = [];
        
        if (hasDamagePrevention && !hasVictimRecovery) {
          // Only damage prevention
          // Damage prevention cases display without suffix (just prefix like 251124001)
          const caseNumber = prefix;
          const newCase = await storage.createCase({
            ...validatedData,
            caseNumber,
            caseGroupId,
            createdBy: req.session.userId,
          });
          createdCases.push(newCase);
        } else if (!hasDamagePrevention && hasVictimRecovery) {
          // Only victim recovery
          // For new accident (suffix=0), use 1; for existing, use returned suffix
          const caseNumber = `${prefix}-${suffix === 0 ? 1 : suffix}`;
          const newCase = await storage.createCase({
            ...validatedData,
            caseNumber,
            caseGroupId,
            createdBy: req.session.userId,
          });
          createdCases.push(newCase);
        } else if (hasDamagePrevention && hasVictimRecovery) {
          // Both types selected
          // 1. Check if prevention case already exists for this prefix
          const existingPrevention = await storage.getPreventionCaseByPrefix(prefix);
          
          if (!existingPrevention) {
            // Create prevention case (no suffix)
            const preventionData = JSON.parse(JSON.stringify(validatedData));
            const preventionCase = await storage.createCase({
              ...preventionData,
              caseNumber: prefix,
              caseGroupId,
              createdBy: req.session.userId,
            });
            createdCases.push(preventionCase);
          }
          
          // 2. Always create victim recovery case with next available suffix
          const nextSuffix = await storage.getNextVictimSuffix(prefix);
          const recoveryData = JSON.parse(JSON.stringify(validatedData));
          const recoveryCase = await storage.createCase({
            ...recoveryData,
            caseNumber: `${prefix}-${nextSuffix}`,
            caseGroupId,
            createdBy: req.session.userId,
          });
          createdCases.push(recoveryCase);
        } else {
          // No processing type - create single case with -1 suffix (default victim recovery)
          const caseNumber = `${prefix}-${suffix === 0 ? 1 : suffix}`;
          const newCase = await storage.createCase({
            ...validatedData,
            caseNumber,
            caseGroupId,
            createdBy: req.session.userId,
          });
          createdCases.push(newCase);
        }
        
        // 케이스 생성 후 같은 prefix를 가진 기존 케이스들에 접수 정보 동기화
        if (createdCases.length > 0) {
          const firstCreatedCase = createdCases[0];
          try {
            const syncCount = await storage.syncIntakeDataToRelatedCases(firstCreatedCase.id);
            if (syncCount > 0) {
              console.log(`[Case Create] Auto-synced intake data to ${syncCount} related cases`);
            }
          } catch (syncError) {
            console.error("Failed to sync intake data to related cases:", syncError);
            // Don't fail the request if sync fails
          }
        }
        
        return res.status(201).json({ success: true, cases: createdCases });
      }
      
      // Fallback: single case creation for other statuses
      // 다른 상태의 경우에도 실제 접수번호 형식 사용
      let caseNumber = validatedData.caseNumber;
      
      // 추가 피해자 생성 시: parentCasePrefix가 있으면 해당 prefix 기반으로 suffix 계산
      const parentCasePrefix = (req.body as any).parentCasePrefix;
      if (parentCasePrefix && !caseNumber) {
        const nextSuffix = await storage.getNextVictimSuffix(parentCasePrefix);
        caseNumber = `${parentCasePrefix}-${nextSuffix}`;
        console.log(`[Case Create] Creating additional victim case with number: ${caseNumber}`);
      } else if (!caseNumber) {
        const fallbackDate = validatedData.accidentDate || new Date().toISOString().split('T')[0];
        const { prefix, suffix } = await storage.getNextCaseSequence(
          fallbackDate,
          validatedData.insuranceAccidentNo || undefined
        );
        caseNumber = `${prefix}-${suffix === 0 ? 1 : suffix}`;
      }
      
      const newCase = await storage.createCase({
        ...validatedData,
        caseNumber,
        caseGroupId,
        createdBy: req.session.userId,
      });
      
      // 추가 피해자 케이스 생성 후 동기화
      if (parentCasePrefix) {
        try {
          const syncCount = await storage.syncIntakeDataToRelatedCases(newCase.id);
          if (syncCount > 0) {
            console.log(`[Case Create] Auto-synced intake data to ${syncCount} related cases`);
          }
        } catch (syncError) {
          console.error("Failed to sync intake data to related cases:", syncError);
        }
      }

      res.status(201).json({ success: true, cases: [newCase] });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create case error:", error);
      res.status(500).json({ error: "접수 생성 중 오류가 발생했습니다" });
    }
  });

  // Get all cases endpoint (with role-based filtering)
  app.get("/api/cases", async (req, res) => {
    // Check authentication
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    try {
      // Get current user for permission-based filtering
      const currentUser = await storage.getUser(req.session.userId);
      
      if (!currentUser) {
        return res.status(404).json({ error: "사용자를 찾을 수 없습니다" });
      }
      
      // Get cases filtered by user role and permissions
      const cases = await storage.getAllCases(currentUser);
      res.json(cases);
    } catch (error) {
      console.error("Get cases error:", error);
      res.status(500).json({ error: "케이스 목록을 불러오는 중 오류가 발생했습니다" });
    }
  });

  // Get single case by ID endpoint
  app.get("/api/cases/:id", async (req, res) => {
    // Check authentication
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    try {
      const { id } = req.params;
      const caseData = await storage.getCaseById(id);
      
      if (!caseData) {
        return res.status(404).json({ error: "케이스를 찾을 수 없습니다" });
      }

      res.json(caseData);
    } catch (error) {
      console.error("Get case by ID error:", error);
      res.status(500).json({ error: "케이스를 불러오는 중 오류가 발생했습니다" });
    }
  });

  // Helper function for field labels (for change logs)
  const getFieldLabel = (field: string): string => {
    const fieldLabels: Record<string, string> = {
      managerId: "당사 담당자",
      managerDepartment: "담당자 부서",
      managerPosition: "담당자 직급",
      managerContact: "담당자 연락처",
      accidentDate: "사고일",
      insuranceCompany: "보험사",
      insurancePolicyNo: "증권번호",
      insuranceAccidentNo: "사고번호",
      clientResidence: "의뢰사",
      clientDepartment: "의뢰자 부서",
      clientName: "의뢰자명",
      clientContact: "의뢰자 연락처",
      assessorId: "심사사",
      assessorDepartment: "심사사 부서",
      assessorTeam: "심사자",
      assessorContact: "심사사 연락처",
      investigatorTeam: "손사명",
      investigatorDepartment: "조사사 부서",
      investigatorTeamName: "조사자",
      investigatorContact: "조사사 연락처",
      policyHolderName: "보험계약자명",
      policyHolderIdNumber: "보험계약자 주민번호",
      policyHolderAddress: "보험계약자 주소",
      insuredName: "피보험자명",
      insuredIdNumber: "피보험자 주민번호",
      insuredAddress: "피보험자 주소",
      insuredAddressDetail: "피보험자 상세주소",
      insuredContact: "피보험자 연락처",
      victimName: "피해자명",
      victimIdNumber: "피해자 주민번호",
      victimAddress: "피해자 주소",
      victimAddressDetail: "피해자 상세주소",
      victimPhone: "피해자 연락처",
      victimContact: "피해자 연락처",
      perpetratorName: "가해자명",
      perpetratorIdNumber: "가해자 주민번호",
      perpetratorAddress: "가해자 주소",
      perpetratorPhone: "가해자 연락처",
      status: "상태",
      recoveryType: "복구 타입",
      specialNotes: "특이사항",
      additionalNotes: "추가 메모",
      buildingType: "건물 유형",
      buildingStructure: "건물 구조",
      accidentLocation: "사고 위치",
      accidentType: "사고 유형",
      causeOfDamage: "피해 원인",
      partnerCompany: "협력업체",
      assignedPartner: "배정 협력사",
      assignedPartnerManager: "협력사 담당자",
      assignedPartnerContact: "협력사 연락처",
      damagePreventionCost: "손해방지비용",
      victimIncidentAssistance: "피해자사고부담금",
    };
    return fieldLabels[field] || field;
  };

  // Update case endpoint
  app.patch("/api/cases/:id", async (req, res) => {
    // Check authentication
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    try {
      const { id } = req.params;
      const updateData = req.body;

      // 케이스 존재 여부 확인
      const existingCase = await storage.getCaseById(id);
      if (!existingCase) {
        return res.status(404).json({ error: "케이스를 찾을 수 없습니다" });
      }

      // 변경 사항 추적
      const changes: Array<{field: string; fieldLabel: string; before: string | null; after: string | null}> = [];
      const trackedFields = [
        // 담당자 정보
        "managerId", "managerDepartment", "managerPosition", "managerContact",
        // 기본 정보
        "accidentDate", "insuranceCompany", "insurancePolicyNo", "insuranceAccidentNo",
        "clientResidence", "clientDepartment", "clientName", "clientContact",
        "assessorId", "assessorDepartment", "assessorTeam", "assessorContact",
        "investigatorTeam", "investigatorDepartment", "investigatorTeamName", "investigatorContact",
        // 보험계약자/피보험자/피해자/가해자 정보
        "policyHolderName", "policyHolderIdNumber", "policyHolderAddress",
        "insuredName", "insuredIdNumber", "insuredAddress", "insuredAddressDetail", "insuredContact",
        "victimName", "victimIdNumber", "victimAddress", "victimAddressDetail", "victimPhone", "victimContact",
        "perpetratorName", "perpetratorIdNumber", "perpetratorAddress", "perpetratorPhone",
        // 상태 및 기타 정보
        "status", "recoveryType", "specialNotes", "additionalNotes",
        "buildingType", "buildingStructure", "accidentLocation", "accidentType", "causeOfDamage", "partnerCompany",
        // 협력사 정보
        "assignedPartner", "assignedPartnerManager", "assignedPartnerContact",
        // 처리 유형
        "damagePreventionCost", "victimIncidentAssistance"
      ];

      // Helper function to normalize values for comparison
      const normalizeValue = (value: any): string | null => {
        if (value === null || value === undefined || value === '') {
          return null;
        }
        return String(value).trim();
      };

      // Get all users for resolving managerId to names
      const allUsers = await storage.getAllUsers();
      const userMap = new Map(allUsers.map(u => [u.id, u.name]));

      for (const field of trackedFields) {
        const oldValue = (existingCase as any)[field];
        const newValue = updateData[field];
        
        // Normalize values for comparison
        const normalizedOld = normalizeValue(oldValue);
        const normalizedNew = normalizeValue(newValue);
        
        // Only track if the field is being updated and the value actually changed
        if (field in updateData && normalizedOld !== normalizedNew) {
          // Special handling for managerId - resolve to user names
          if (field === 'managerId') {
            const oldUserName = normalizedOld ? (userMap.get(normalizedOld) || '(알수없음)') : null;
            const newUserName = normalizedNew ? (userMap.get(normalizedNew) || '(알수없음)') : null;
            changes.push({
              field,
              fieldLabel: getFieldLabel(field),
              before: oldUserName,
              after: newUserName,
            });
          } else {
            changes.push({
              field,
              fieldLabel: getFieldLabel(field),
              before: normalizedOld,
              after: normalizedNew,
            });
          }
        }
      }

      // 케이스 업데이트
      const updatedCase = await storage.updateCase(id, updateData);
      
      if (!updatedCase) {
        return res.status(404).json({ error: "케이스 업데이트에 실패했습니다" });
      }

      // 변경 로그 저장 (변경 사항이 있을 때만)
      if (changes.length > 0) {
        try {
          const user = await storage.getUser(req.session.userId);
          await storage.createCaseChangeLog({
            caseId: id,
            changedBy: req.session.userId,
            changedByName: user?.name || "알 수 없음",
            changeType: "update",
            changes,
            note: null,
          });
          console.log(`[Change Log] Recorded ${changes.length} changes for case ${id}:`, changes.map(c => `${c.fieldLabel}: ${c.before} → ${c.after}`).join(', '));
        } catch (logError) {
          console.error("Failed to create change log:", logError);
          // Don't fail the request if logging fails
        }
      }

      // 같은 prefix를 가진 관련 케이스들에 접수 정보 동기화
      // (예: 251102001, 251102001-1, 251102001-2는 모두 동기화)
      try {
        const syncCount = await storage.syncIntakeDataToRelatedCases(id);
        if (syncCount > 0) {
          console.log(`[Case Update] Auto-synced intake data to ${syncCount} related cases`);
        }
      } catch (syncError) {
        console.error("Failed to sync intake data to related cases:", syncError);
        // Don't fail the request if sync fails
      }

      res.json({ success: true, case: updatedCase });
    } catch (error) {
      console.error("Update case error:", error);
      res.status(500).json({ error: "케이스 업데이트 중 오류가 발생했습니다" });
    }
  });

  // Delete case endpoint
  app.delete("/api/cases/:id", async (req, res) => {
    // Check authentication
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    try {
      const { id } = req.params;

      // 케이스 존재 여부 확인
      const existingCase = await storage.getCaseById(id);
      if (!existingCase) {
        return res.status(404).json({ error: "케이스를 찾을 수 없습니다" });
      }

      // 관리자는 모든 케이스 삭제 가능, 그 외는 배당대기 상태만 삭제 가능
      if (req.session.userRole !== "관리자" && existingCase.status !== "배당대기") {
        return res.status(403).json({ error: "임시저장 건(배당대기 상태)만 삭제할 수 있습니다" });
      }

      // 케이스 삭제
      await storage.deleteCase(id);

      res.json({ success: true, message: "케이스가 삭제되었습니다" });
    } catch (error) {
      console.error("Delete case error:", error);
      res.status(500).json({ error: "케이스 삭제 중 오류가 발생했습니다" });
    }
  });

  // Update case status endpoint (admin and partner)
  app.patch("/api/cases/:caseId/status", async (req, res) => {
    // Check authentication
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    const userRole = req.session.userRole;
    
    // Check authorization (관리자 또는 협력사)
    if (userRole !== "관리자" && userRole !== "협력사") {
      return res.status(403).json({ error: "권한이 없습니다" });
    }

    try {
      const { caseId } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ error: "상태 값이 필요합니다" });
      }

      // 허용된 상태값 검증
      const ALLOWED_STATUSES = [
        "배당대기", "접수완료", "현장방문", "현장정보입력", "검토중", "반려",
        "1차승인", "현장정보제출", "복구요청(2차승인)", "직접복구", "선견적요청", "(직접복구인 경우) 청구자료제출",
        "(선견적요청인 경우) 출동비 청구", "청구", "입금완료", "일부입금", "정산완료", "접수취소"
      ];

      if (!ALLOWED_STATUSES.includes(status)) {
        return res.status(400).json({ error: `허용되지 않은 상태값입니다: ${status}` });
      }

      // 협력사는 직접복구/선견적요청만 변경 가능
      if (userRole === "협력사") {
        const PARTNER_ALLOWED = ["직접복구", "선견적요청"];
        if (!PARTNER_ALLOWED.includes(status)) {
          return res.status(403).json({ error: "협력사는 직접복구/선견적요청만 선택할 수 있습니다" });
        }
      }

      // storage.updateCaseStatus에서 미복구→출동비 청구 정규화 처리 및 날짜 자동 기록
      const updatedCase = await storage.updateCaseStatus(caseId, status);
      
      if (!updatedCase) {
        return res.status(404).json({ error: "케이스를 찾을 수 없습니다" });
      }

      res.json({ success: true, case: updatedCase });
    } catch (error) {
      console.error("Update case status error:", error);
      res.status(500).json({ error: "상태 변경 중 오류가 발생했습니다" });
    }
  });

  // Update case special notes endpoint (협력사 only)
  app.patch("/api/cases/:caseId/special-notes", async (req, res) => {
    // Check authentication
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    // Check authorization (협력사만 가능)
    if (req.session.userRole !== "협력사") {
      return res.status(403).json({ error: "협력사 권한이 필요합니다" });
    }

    try {
      const { caseId } = req.params;
      
      // Validate specialNotes with Zod
      const updateSchema = z.object({
        specialNotes: z.string().max(1000, "특이사항은 최대 1000자까지 입력 가능합니다").nullable(),
      });
      
      const { specialNotes } = updateSchema.parse(req.body);

      const updatedCase = await storage.updateCaseSpecialNotes(caseId, specialNotes);
      
      if (!updatedCase) {
        return res.status(404).json({ error: "케이스를 찾을 수 없습니다" });
      }

      res.json({ success: true, case: updatedCase });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Update case special notes error:", error);
      res.status(500).json({ error: "특이사항 저장 중 오류가 발생했습니다" });
    }
  });

  // Confirm case special notes endpoint (관리자 only)
  app.patch("/api/cases/:caseId/special-notes-confirm", async (req, res) => {
    // Check authentication
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    // Check admin authorization
    if (req.session.userRole !== "관리자") {
      return res.status(403).json({ error: "관리자 권한이 필요합니다" });
    }

    try {
      const { caseId } = req.params;

      const updatedCase = await storage.confirmCaseSpecialNotes(caseId, req.session.userId);
      
      if (!updatedCase) {
        return res.status(404).json({ error: "케이스를 찾을 수 없습니다" });
      }

      res.json({ success: true, case: updatedCase });
    } catch (error) {
      console.error("Confirm case special notes error:", error);
      res.status(500).json({ error: "특이사항 확인 중 오류가 발생했습니다" });
    }
  });

  // Add progress update endpoint (관리자 only)
  app.post("/api/cases/:caseId/progress", async (req, res) => {
    // Check authentication
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    // Check admin authorization
    if (req.session.userRole !== "관리자") {
      return res.status(403).json({ error: "관리자 권한이 필요합니다" });
    }

    try {
      const { caseId } = req.params;
      
      // Validate content with Zod
      const progressSchema = z.object({
        content: z.string().min(1, "진행상황 내용이 필요합니다"),
      });
      
      const { content } = progressSchema.parse(req.body);

      const progressUpdate = await storage.createProgressUpdate({
        caseId,
        content,
        createdBy: req.session.userId,
      });

      res.json({ success: true, progressUpdate });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Add progress update error:", error);
      res.status(500).json({ error: "진행상황 추가 중 오류가 발생했습니다" });
    }
  });

  // Update case additional notes endpoint (협력사 only)
  app.patch("/api/cases/:caseId/additional-notes", async (req, res) => {
    // Check authentication
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    // Check authorization (협력사만 가능)
    if (req.session.userRole !== "협력사") {
      return res.status(403).json({ error: "협력사 권한이 필요합니다" });
    }

    try {
      const { caseId } = req.params;
      
      // Validate additionalNotes with Zod (800자 제한)
      const updateSchema = z.object({
        additionalNotes: z.string().max(800, "기타사항은 800자를 초과할 수 없습니다").nullable(),
      });
      
      const { additionalNotes } = updateSchema.parse(req.body);

      const updatedCase = await storage.updateCaseAdditionalNotes(caseId, additionalNotes);
      
      if (!updatedCase) {
        return res.status(404).json({ error: "케이스를 찾을 수 없습니다" });
      }

      res.json({ success: true, case: updatedCase });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Update case additional notes error:", error);
      res.status(500).json({ error: "기타사항 저장 중 오류가 발생했습니다" });
    }
  });

  // Submit field survey endpoint (협력사 only)
  app.patch("/api/cases/:caseId/submit", async (req, res) => {
    // Check authentication
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    // Check authorization (협력사만 가능)
    if (req.session.userRole !== "협력사") {
      return res.status(403).json({ error: "협력사 권한이 필요합니다" });
    }

    try {
      const { caseId } = req.params;
      
      // 케이스 정보 조회
      const caseData = await storage.getCaseById(caseId);
      if (!caseData) {
        return res.status(404).json({ error: "케이스를 찾을 수 없습니다" });
      }

      // 도면 조회
      const drawing = await storage.getDrawingByCaseId(caseId);
      
      // 증빙자료 조회
      const documents = await storage.getDocumentsByCaseId(caseId);
      
      // 최신 견적 조회
      const estimateData = await storage.getLatestEstimate(caseId);
      
      // 완료 여부 체크
      const isFieldSurveyComplete = !!(caseData.visitDate && caseData.visitTime && caseData.accidentCategory);
      const isDrawingComplete = !!drawing;
      const isDocumentsComplete = documents.length > 0;
      const isEstimateComplete = !!(estimateData?.rows && estimateData.rows.length > 0);
      
      if (!isFieldSurveyComplete || !isDrawingComplete || !isDocumentsComplete || !isEstimateComplete) {
        const missingItems = [];
        if (!isFieldSurveyComplete) missingItems.push("현장조사 정보");
        if (!isDrawingComplete) missingItems.push("도면");
        if (!isDocumentsComplete) missingItems.push("증빙자료");
        if (!isEstimateComplete) missingItems.push("견적서");
        
        return res.status(400).json({ 
          error: `다음 항목을 완료해주세요: ${missingItems.join(", ")}` 
        });
      }

      // 제출 처리
      const updatedCase = await storage.submitFieldSurvey(caseId);
      
      if (!updatedCase) {
        return res.status(404).json({ error: "케이스를 찾을 수 없습니다" });
      }

      res.json({ success: true, case: updatedCase });
    } catch (error) {
      console.error("Submit field survey error:", error);
      res.status(500).json({ error: "현장조사 보고서 제출 중 오류가 발생했습니다" });
    }
  });

  // Review case endpoint (관리자 only)
  app.patch("/api/cases/:caseId/review", async (req, res) => {
    // Check authentication
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    // Check authorization (관리자만 가능)
    if (req.session.userRole !== "관리자") {
      return res.status(403).json({ error: "관리자 권한이 필요합니다" });
    }

    try {
      const { caseId } = req.params;
      
      // Validate review data with Zod
      const parsed = reviewCaseSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          error: "입력 데이터가 유효하지 않습니다",
          details: parsed.error.errors 
        });
      }

      const { decision, reviewComment } = parsed.data;

      // 케이스 확인
      const existingCase = await storage.getCaseById(caseId);
      if (!existingCase) {
        return res.status(404).json({ error: "케이스를 찾을 수 없습니다" });
      }

      // 제출된 보고서만 심사 가능
      if (existingCase.fieldSurveyStatus !== "submitted") {
        return res.status(400).json({ 
          error: "제출된 보고서만 심사할 수 있습니다" 
        });
      }

      // 심사 처리
      const updatedCase = await storage.reviewCase(
        caseId, 
        decision, 
        reviewComment || null, 
        req.session.userId
      );
      
      if (!updatedCase) {
        return res.status(404).json({ error: "케이스를 찾을 수 없습니다" });
      }

      res.json({ success: true, case: updatedCase });
    } catch (error) {
      console.error("Review case error:", error);
      res.status(500).json({ error: "보고서 심사 중 오류가 발생했습니다" });
    }
  });

  // Update case field survey endpoint (협력사: 언제든지, 관리자: 제출 후에만)
  app.patch("/api/cases/:caseId/field-survey", async (req, res) => {
    // Check authentication
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    const userRole = req.session.userRole;
    const { caseId } = req.params;

    // 협력사: 언제든지 수정 가능
    // 관리자: 협력사가 제출(submitted) 후에만 수정 가능
    if (userRole !== "협력사" && userRole !== "관리자") {
      return res.status(403).json({ error: "협력사 또는 관리자 권한이 필요합니다" });
    }

    // 관리자인 경우, 케이스가 제출된 상태인지 확인
    if (userRole === "관리자") {
      const existingCase = await storage.getCaseById(caseId);
      if (!existingCase) {
        return res.status(404).json({ error: "케이스를 찾을 수 없습니다" });
      }
      if (existingCase.fieldSurveyStatus !== "submitted") {
        return res.status(403).json({ error: "협력사가 보고서를 제출한 후에만 수정할 수 있습니다" });
      }
    }

    try {
      // Validate field data with Zod
      const updateSchema = z.object({
        visitDate: z.string().nullable().optional(),
        visitTime: z.string().nullable().optional(),
        travelDistance: z.string().nullable().optional(),
        dispatchLocation: z.string().nullable().optional(),
        accompaniedPerson: z.string().nullable().optional(),
        accidentTime: z.string().nullable().optional(),
        accidentCategory: z.string().nullable().optional(),
        accidentCause: z.string().nullable().optional(),
        specialNotes: z.string().nullable().optional(),
        victimName: z.string().nullable().optional(),
        victimContact: z.string().nullable().optional(),
        victimAddress: z.string().nullable().optional(),
        additionalVictims: z.string().nullable().optional(),
        specialRequests: z.string().nullable().optional(),
        processingTypes: z.string().nullable().optional(),
        processingTypeOther: z.string().nullable().optional(),
        recoveryMethodType: z.string().nullable().optional(),
        fieldSurveyStatus: z.string().nullable().optional(),
        status: z.string().nullable().optional(), // 케이스 상태 자동 변경용
      });
      
      const fieldData = updateSchema.parse(req.body);

      const updatedCase = await storage.updateCaseFieldSurvey(caseId, fieldData);
      
      if (!updatedCase) {
        return res.status(404).json({ error: "케이스를 찾을 수 없습니다" });
      }

      // Sync field survey data to related cases (same accident number, different receipt)
      // Create a new object excluding status fields - each case manages its own status
      const { status, fieldSurveyStatus, ...syncData } = fieldData;
      
      let syncedCount = 0;
      try {
        syncedCount = await storage.syncFieldSurveyToRelatedCases(caseId, syncData);
      } catch (syncError) {
        console.error("Sync to related cases failed:", syncError);
        // Don't fail the request if sync fails
      }
      
      res.json({ 
        success: true, 
        case: updatedCase,
        syncedCases: syncedCount 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Update case field survey error:", error);
      res.status(500).json({ error: "현장조사 정보 저장 중 오류가 발생했습니다" });
    }
  });

  // Get partner statistics endpoint
  app.get("/api/partner-stats", async (req, res) => {
    // Check authentication
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    try {
      const stats = await storage.getPartnerStats();
      res.json(stats);
    } catch (error) {
      console.error("Get partner stats error:", error);
      res.status(500).json({ error: "협력사 통계를 불러오는 중 오류가 발생했습니다" });
    }
  });

  // Create progress update endpoint
  app.post("/api/progress-updates", async (req, res) => {
    // Check authentication
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    try {
      const validatedData = insertProgressUpdateSchema.parse({
        ...req.body,
        createdBy: req.session.userId,
      });

      const newUpdate = await storage.createProgressUpdate(validatedData);
      res.status(201).json({ success: true, update: newUpdate });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create progress update error:", error);
      res.status(500).json({ error: "진행상황 업데이트 생성 중 오류가 발생했습니다" });
    }
  });

  // Get progress updates by case ID endpoint
  app.get("/api/progress-updates/:caseId", async (req, res) => {
    // Check authentication
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    try {
      const updates = await storage.getProgressUpdatesByCaseId(req.params.caseId);
      res.json(updates);
    } catch (error) {
      console.error("Get progress updates error:", error);
      res.status(500).json({ error: "진행상황 업데이트를 불러오는 중 오류가 발생했습니다" });
    }
  });

  // Get statistics filters endpoint
  app.get("/api/statistics/filters", async (req, res) => {
    // Check authentication
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    try {
      const filters = await storage.getStatisticsFilters();
      res.json(filters);
    } catch (error) {
      console.error("Get statistics filters error:", error);
      res.status(500).json({ error: "필터 데이터를 불러오는 중 오류가 발생했습니다" });
    }
  });

  // Get filtered cases for statistics endpoint (with role-based filtering)
  app.get("/api/statistics/cases", async (req, res) => {
    // Check authentication
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    try {
      // Get current user for permission-based filtering
      const currentUser = await storage.getUser(req.session.userId);
      
      if (!currentUser) {
        return res.status(404).json({ error: "사용자를 찾을 수 없습니다" });
      }
      
      // Get cases filtered by user role and permissions
      const allCases = await storage.getAllCases(currentUser);
      res.json(allCases);
    } catch (error) {
      console.error("Get statistics cases error:", error);
      res.status(500).json({ error: "통계 데이터를 불러오는 중 오류가 발생했습니다" });
    }
  });

  // Get all role permissions endpoint (admin only)
  app.get("/api/role-permissions", async (req, res) => {
    console.log("[GET /api/role-permissions] Request received, session:", {
      userId: req.session?.userId,
      userRole: req.session?.userRole,
    });
    
    // Check authentication
    if (!req.session?.userId) {
      console.log("[GET /api/role-permissions] 401: Not authenticated");
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    // Check admin authorization
    if (req.session.userRole !== "관리자") {
      console.log("[GET /api/role-permissions] 403: Not admin, role is:", req.session.userRole);
      return res.status(403).json({ error: "관리자 권한이 필요합니다" });
    }

    try {
      const permissions = await storage.getAllRolePermissions();
      console.log("[GET /api/role-permissions] Success, returning", permissions.length, "permissions");
      res.json(permissions);
    } catch (error) {
      console.error("Get role permissions error:", error);
      res.status(500).json({ error: "권한 정보를 불러오는 중 오류가 발생했습니다" });
    }
  });

  // Get role permission by role name endpoint (admin only)
  app.get("/api/role-permissions/:roleName", async (req, res) => {
    // Check authentication
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    // Check admin authorization
    if (req.session.userRole !== "관리자") {
      return res.status(403).json({ error: "관리자 권한이 필요합니다" });
    }

    try {
      const permission = await storage.getRolePermission(req.params.roleName);
      if (!permission) {
        return res.status(404).json({ error: "권한 정보를 찾을 수 없습니다" });
      }
      res.json(permission);
    } catch (error) {
      console.error("Get role permission error:", error);
      res.status(500).json({ error: "권한 정보를 불러오는 중 오류가 발생했습니다" });
    }
  });

  // Get current user's permissions endpoint (all authenticated users)
  app.get("/api/my-permissions", async (req, res) => {
    // Check authentication
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    // Get user's role from session
    const userRole = req.session.userRole;
    if (!userRole) {
      return res.status(400).json({ error: "사용자 역할 정보를 찾을 수 없습니다" });
    }

    try {
      const permission = await storage.getRolePermission(userRole);
      if (!permission) {
        // If no permissions set for this role, return empty permissions
        return res.json(null);
      }
      res.json(permission);
    } catch (error) {
      console.error("Get my permissions error:", error);
      res.status(500).json({ error: "권한 정보를 불러오는 중 오류가 발생했습니다" });
    }
  });

  // Save role permission endpoint (admin only)
  app.post("/api/role-permissions", async (req, res) => {
    console.log("[POST /api/role-permissions] Request received, session:", {
      userId: req.session?.userId,
      userRole: req.session?.userRole,
    }, "body:", req.body);
    
    // Check authentication
    if (!req.session?.userId) {
      console.log("[POST /api/role-permissions] 401: Not authenticated");
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    // Check admin authorization
    if (req.session.userRole !== "관리자") {
      console.log("[POST /api/role-permissions] 403: Not admin, role is:", req.session.userRole);
      return res.status(403).json({ error: "관리자 권한이 필요합니다" });
    }

    try {
      const validatedData = insertRolePermissionSchema.parse(req.body);
      const permission = await storage.saveRolePermission(validatedData);
      console.log("[POST /api/role-permissions] Success, saved permission for role:", validatedData.roleName);
      res.json(permission);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.log("[POST /api/role-permissions] 400: Validation error:", error.errors);
        return res.status(400).json({ error: error.errors });
      }
      console.error("Save role permission error:", error);
      res.status(500).json({ error: "권한 정보를 저장하는 중 오류가 발생했습니다" });
    }
  });

  // Excel Data APIs (노무비/자재비)
  // Get latest version for a type (backward compatibility - original behavior)
  app.get("/api/excel-data/:type", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    if (req.session.userRole !== "관리자") {
      return res.status(403).json({ error: "관리자 권한이 필요합니다" });
    }

    try {
      const { type } = req.params;
      if (type !== "노무비" && type !== "자재비" && type !== "일위대가") {
        return res.status(400).json({ error: "잘못된 데이터 타입입니다" });
      }

      const data = await storage.getExcelData(type);
      res.json(data);
    } catch (error) {
      console.error("Get excel data error:", error);
      res.status(500).json({ error: "데이터를 조회하는 중 오류가 발생했습니다" });
    }
  });

  // Get list of all versions for a type (new endpoint for version management)
  app.get("/api/excel-data/:type/versions", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    if (req.session.userRole !== "관리자") {
      return res.status(403).json({ error: "관리자 권한이 필요합니다" });
    }

    try {
      const { type } = req.params;
      if (type !== "노무비" && type !== "자재비" && type !== "일위대가") {
        return res.status(400).json({ error: "잘못된 데이터 타입입니다" });
      }

      const dataList = await storage.listExcelData(type);
      res.json(dataList);
    } catch (error) {
      console.error("List excel data versions error:", error);
      res.status(500).json({ error: "데이터를 조회하는 중 오류가 발생했습니다" });
    }
  });

  // Get specific version by ID
  app.get("/api/excel-data/detail/:id", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    if (req.session.userRole !== "관리자") {
      return res.status(403).json({ error: "관리자 권한이 필요합니다" });
    }

    try {
      const { id } = req.params;
      const data = await storage.getExcelDataById(id);
      
      if (!data) {
        return res.status(404).json({ error: "데이터를 찾을 수 없습니다" });
      }
      
      res.json(data);
    } catch (error) {
      console.error("Get excel data by ID error:", error);
      res.status(500).json({ error: "데이터를 조회하는 중 오류가 발생했습니다" });
    }
  });

  app.post("/api/excel-data", async (req, res) => {
    console.log("[Excel Upload] POST /api/excel-data called");
    
    if (!req.session?.userId) {
      console.log("[Excel Upload] Error: 인증되지 않은 사용자");
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    if (req.session.userRole !== "관리자") {
      console.log("[Excel Upload] Error: 관리자 권한 필요");
      return res.status(403).json({ error: "관리자 권한이 필요합니다" });
    }

    try {
      console.log("[Excel Upload] Request body:", {
        type: req.body?.type,
        title: req.body?.title,
        headersCount: req.body?.headers?.length,
        dataRowsCount: req.body?.data?.length
      });
      
      const validatedData = insertExcelDataSchema.parse(req.body);
      const result = await storage.saveExcelData(validatedData);
      
      console.log("[Excel Upload] Success! Saved with ID:", result.id);
      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.log("[Excel Upload] Validation error:", error.errors);
        return res.status(400).json({ error: error.errors });
      }
      // Handle unique constraint violation (Postgres error code 23505)
      if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
        console.log("[Excel Upload] Error: 동일한 제목 존재");
        return res.status(409).json({ 
          error: "동일한 제목의 데이터가 이미 존재합니다. 다른 제목을 사용해주세요." 
        });
      }
      console.error("[Excel Upload] Save excel data error:", error);
      res.status(500).json({ error: "데이터를 저장하는 중 오류가 발생했습니다" });
    }
  });

  // Re-parse headers for existing data (one-time fix)
  app.patch("/api/excel-data/:id/reparse-headers", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    if (req.session.userRole !== "관리자") {
      return res.status(403).json({ error: "관리자 권한이 필요합니다" });
    }

    try {
      const { id } = req.params;
      const existing = await storage.getExcelDataById(id);
      
      if (!existing) {
        return res.status(404).json({ error: "데이터를 찾을 수 없습니다" });
      }

      // Combine current headers and data to re-detect the correct header row
      const allRows = [existing.headers, ...existing.data];
      
      // Find header row: look for row containing both "공종" and "공사명"
      let headerRowIdx = 0;
      for (let i = 0; i < Math.min(allRows.length, 10); i++) {
        const row = allRows[i] as any[];
        if (!row) continue;
        const rowStr = row.map((c: any) => c?.toString() || '').join('|');
        if (rowStr.includes('공종') && rowStr.includes('공사명')) {
          headerRowIdx = i;
          console.log('[Reparse] Found header row at index:', i, 'Row:', row);
          break;
        }
      }

      const newHeaders = (allRows[headerRowIdx] as any[]).map((h: any) => h?.toString() || '');
      const newData = allRows.slice(headerRowIdx + 1);

      console.log('[Reparse] Original headers:', existing.headers);
      console.log('[Reparse] New headers:', newHeaders);
      console.log('[Reparse] New data rows:', newData.length);

      const updated = await storage.updateExcelData(id, newHeaders, newData);
      res.json(updated);
    } catch (error) {
      console.error("Reparse headers error:", error);
      res.status(500).json({ error: "헤더 재인식 중 오류가 발생했습니다" });
    }
  });

  // Delete all versions by type (original behavior - backward compatibility)
  app.delete("/api/excel-data/:type", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    if (req.session.userRole !== "관리자") {
      return res.status(403).json({ error: "관리자 권한이 필요합니다" });
    }

    try {
      const { type } = req.params;
      if (type !== "노무비" && type !== "자재비" && type !== "일위대가") {
        return res.status(400).json({ error: "잘못된 데이터 타입입니다" });
      }

      await storage.deleteExcelData(type);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete excel data error:", error);
      res.status(500).json({ error: "데이터를 삭제하는 중 오류가 발생했습니다" });
    }
  });

  // Delete specific version by ID (new endpoint for version management)
  app.delete("/api/excel-data/id/:id", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    if (req.session.userRole !== "관리자") {
      return res.status(403).json({ error: "관리자 권한이 필요합니다" });
    }

    try {
      const { id } = req.params;
      
      const deleted = await storage.deleteExcelDataById(id);
      if (!deleted) {
        return res.status(404).json({ error: "데이터를 찾을 수 없습니다" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Delete excel data error:", error);
      res.status(500).json({ error: "데이터를 삭제하는 중 오류가 발생했습니다" });
    }
  });

  // Get all inquiries (admin) or user's inquiries (regular users)
  app.get("/api/inquiries", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    try {
      let inquiries;
      if (req.session.userRole === "관리자") {
        // Admin can see all inquiries
        inquiries = await storage.getAllInquiries();
      } else {
        // Regular users can only see their own inquiries
        inquiries = await storage.getInquiriesByUserId(req.session.userId);
      }
      res.json(inquiries);
    } catch (error) {
      console.error("Get inquiries error:", error);
      res.status(500).json({ error: "문의 목록을 조회하는 중 오류가 발생했습니다" });
    }
  });

  // Create new inquiry
  app.post("/api/inquiries", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    try {
      const validatedData = insertInquirySchema.parse({
        ...req.body,
        userId: req.session.userId, // Always use authenticated user's ID
      });
      const inquiry = await storage.createInquiry(validatedData);
      res.json(inquiry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create inquiry error:", error);
      res.status(500).json({ error: "문의를 등록하는 중 오류가 발생했습니다" });
    }
  });

  // Update inquiry (admin only - for responding)
  app.patch("/api/inquiries/:id", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    if (req.session.userRole !== "관리자") {
      return res.status(403).json({ error: "관리자 권한이 필요합니다" });
    }

    try {
      const { id } = req.params;
      
      // Validate response content
      const validatedData = respondInquirySchema.parse(req.body);

      const updateData = {
        responseTitle: validatedData.responseTitle,
        response: validatedData.response,
        respondedBy: req.session.userId,
        respondedAt: new Date(),
        status: "완료",
      };

      const updated = await storage.updateInquiry(id, updateData);
      if (!updated) {
        return res.status(404).json({ error: "문의를 찾을 수 없습니다" });
      }
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Update inquiry error:", error);
      res.status(500).json({ error: "문의를 수정하는 중 오류가 발생했습니다" });
    }
  });

  // ==================== DRAWING ROUTES ====================

  // Save drawing (create or update)
  app.post("/api/drawings", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    try {
      // Extract drawingId if provided (for updates)
      const { drawingId, ...bodyData } = req.body;
      
      // Validate the request data
      const validatedData = insertDrawingSchema.parse({
        ...bodyData,
        createdBy: req.session.userId,
      });

      // Verify the user has access to this case
      const requestedCase = await storage.getCaseById(validatedData.caseId);
      if (!requestedCase) {
        return res.status(404).json({ error: "케이스를 찾을 수 없습니다" });
      }

      // Note: Additional permission checks could be added here based on user role
      // Currently relying on frontend filtering (field-management page shows only accessible cases)
      
      let drawing;
      
      // If drawingId is provided, update existing drawing
      if (drawingId) {
        const existing = await storage.getDrawing(drawingId);
        if (!existing) {
          return res.status(404).json({ error: "도면을 찾을 수 없습니다" });
        }
        // Verify case match (케이스 접근 권한은 이미 위에서 확인됨)
        if (existing.caseId !== validatedData.caseId) {
          return res.status(403).json({ error: "다른 케이스의 도면입니다" });
        }
        
        const updateData = {
          uploadedImages: validatedData.uploadedImages,
          rectangles: validatedData.rectangles,
          accidentAreas: validatedData.accidentAreas,
          leakMarkers: validatedData.leakMarkers,
          // caseId is immutable - don't update it
        };
        drawing = await storage.updateDrawing(drawingId, updateData);
      } else {
        // Check if a drawing already exists for this case
        const existing = await storage.getDrawingByCaseId(validatedData.caseId);

        if (existing) {
          // Update existing drawing - 케이스 접근 권한이 있으면 수정 가능
          const updateData = {
            uploadedImages: validatedData.uploadedImages,
            rectangles: validatedData.rectangles,
            accidentAreas: validatedData.accidentAreas,
            leakMarkers: validatedData.leakMarkers,
          };
          drawing = await storage.updateDrawing(existing.id, updateData);
        } else {
          // Create new drawing
          drawing = await storage.saveDrawing(validatedData);
        }
      }
      
      // 도면 자동 동기화 비활성화 - 각 케이스 개별 관리
      // Auto-sync drawing disabled - each case manages its own drawing
      
      res.json(drawing);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Save drawing error:", error);
      res.status(500).json({ error: "도면을 저장하는 중 오류가 발생했습니다" });
    }
  });

  // Get drawing by ID
  app.get("/api/drawings/:id", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    try {
      const { id } = req.params;
      const drawing = await storage.getDrawing(id);
      
      if (!drawing) {
        return res.status(404).json({ error: "도면을 찾을 수 없습니다" });
      }

      res.json(drawing);
    } catch (error) {
      console.error("Get drawing error:", error);
      res.status(500).json({ error: "도면을 조회하는 중 오류가 발생했습니다" });
    }
  });

  // Get drawing by case ID
  app.get("/api/drawings/case/:caseId", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    try {
      const { caseId } = req.params;
      const drawing = await storage.getDrawingByCaseId(caseId);
      
      if (!drawing) {
        return res.status(404).json({ error: "도면을 찾을 수 없습니다" });
      }

      res.json(drawing);
    } catch (error) {
      console.error("Get drawing by case error:", error);
      res.status(500).json({ error: "도면을 조회하는 중 오류가 발생했습니다" });
    }
  });

  // Get active case ID for current user
  app.get("/api/drawings/active-case-id", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    try {
      const activeCase = await storage.getOrCreateActiveCase(req.session.userId!);
      res.json({ caseId: activeCase.id });
    } catch (error) {
      console.error("Get active case ID error:", error);
      res.status(500).json({ error: "활성 케이스 ID를 조회하는 중 오류가 발생했습니다" });
    }
  });

  // ===== Asset Cloning API (Copy from Related Cases) =====

  // Get related case with drawing (for cloning suggestion)
  app.get("/api/cases/:caseId/related-drawing", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    try {
      const { caseId } = req.params;
      const relatedCase = await storage.getRelatedCaseWithDrawing(caseId);
      
      if (!relatedCase) {
        return res.json({ hasRelatedDrawing: false });
      }

      res.json({ 
        hasRelatedDrawing: true, 
        sourceCaseId: relatedCase.caseId, 
        sourceCaseNumber: relatedCase.caseNumber 
      });
    } catch (error) {
      console.error("Get related drawing error:", error);
      res.status(500).json({ error: "관련 도면을 조회하는 중 오류가 발생했습니다" });
    }
  });

  // Get ALL related cases with drawings (for manual copy selection)
  app.get("/api/cases/:caseId/related-drawings", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    try {
      const { caseId } = req.params;
      const relatedCases = await storage.getAllRelatedCasesWithDrawings(caseId);
      res.json({ relatedCases });
    } catch (error) {
      console.error("Get all related drawings error:", error);
      res.status(500).json({ error: "관련 도면 목록을 조회하는 중 오류가 발생했습니다" });
    }
  });

  // Clone drawing from related case
  app.post("/api/cases/:caseId/clone-drawing", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    try {
      const { caseId } = req.params;
      const { sourceCaseId } = req.body;

      if (!sourceCaseId) {
        return res.status(400).json({ error: "소스 케이스 ID가 필요합니다" });
      }

      const clonedDrawing = await storage.cloneDrawingFromCase(
        sourceCaseId, 
        caseId, 
        req.session.userId!
      );

      if (!clonedDrawing) {
        return res.status(404).json({ error: "소스 케이스에 도면이 없습니다" });
      }

      res.json({ success: true, drawing: clonedDrawing });
    } catch (error) {
      console.error("Clone drawing error:", error);
      res.status(500).json({ error: "도면을 복제하는 중 오류가 발생했습니다" });
    }
  });

  // Get related case with estimate (for cloning suggestion)
  app.get("/api/cases/:caseId/related-estimate", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    try {
      const { caseId } = req.params;
      const relatedCase = await storage.getRelatedCaseWithEstimate(caseId);
      
      if (!relatedCase) {
        return res.json({ hasRelatedEstimate: false });
      }

      res.json({ 
        hasRelatedEstimate: true, 
        sourceCaseId: relatedCase.caseId, 
        sourceCaseNumber: relatedCase.caseNumber 
      });
    } catch (error) {
      console.error("Get related estimate error:", error);
      res.status(500).json({ error: "관련 견적서를 조회하는 중 오류가 발생했습니다" });
    }
  });

  // Clone estimate from related case
  app.post("/api/cases/:caseId/clone-estimate", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    try {
      const { caseId } = req.params;
      const { sourceCaseId } = req.body;

      if (!sourceCaseId) {
        return res.status(400).json({ error: "소스 케이스 ID가 필요합니다" });
      }

      const clonedEstimate = await storage.cloneEstimateFromCase(
        sourceCaseId, 
        caseId, 
        req.session.userId!
      );

      if (!clonedEstimate) {
        return res.status(404).json({ error: "소스 케이스에 견적서가 없습니다" });
      }

      res.json({ success: true, estimate: clonedEstimate });
    } catch (error) {
      console.error("Clone estimate error:", error);
      res.status(500).json({ error: "견적서를 복제하는 중 오류가 발생했습니다" });
    }
  });

  // Get related case with documents (for cloning suggestion)
  app.get("/api/cases/:caseId/related-documents", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    try {
      const { caseId } = req.params;
      const relatedCase = await storage.getRelatedCaseWithDocuments(caseId);
      
      if (!relatedCase) {
        return res.json({ hasRelatedDocuments: false });
      }

      res.json({ 
        hasRelatedDocuments: true, 
        sourceCaseId: relatedCase.caseId, 
        sourceCaseNumber: relatedCase.caseNumber,
        documentCount: relatedCase.documentCount
      });
    } catch (error) {
      console.error("Get related documents error:", error);
      res.status(500).json({ error: "관련 증빙자료를 조회하는 중 오류가 발생했습니다" });
    }
  });

  // Clone documents from related case
  app.post("/api/cases/:caseId/clone-documents", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    try {
      const { caseId } = req.params;
      const { sourceCaseId } = req.body;

      if (!sourceCaseId) {
        return res.status(400).json({ error: "소스 케이스 ID가 필요합니다" });
      }

      const clonedDocuments = await storage.cloneDocumentsFromCase(
        sourceCaseId, 
        caseId, 
        req.session.userId!
      );

      res.json({ success: true, documents: clonedDocuments, count: clonedDocuments.length });
    } catch (error) {
      console.error("Clone documents error:", error);
      res.status(500).json({ error: "증빙자료를 복제하는 중 오류가 발생했습니다" });
    }
  });

  // ===== 증빙자료 Documents API =====
  
  // Upload document(s) to a case
  app.post("/api/documents", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    try {
      const validatedData = insertCaseDocumentSchema.parse(req.body);
      const document = await storage.saveDocument(validatedData);
      
      // 청구 탭 자료 제출 시 복구완료일 자동 기록 (기존 값이 없을 때만)
      if (validatedData.category === "청구" && validatedData.caseId) {
        const existingCase = await storage.getCaseById(validatedData.caseId);
        if (existingCase && !existingCase.constructionCompletionDate) {
          await storage.updateCase(validatedData.caseId, {
            constructionCompletionDate: new Date().toLocaleString("en-CA", { 
              timeZone: "Asia/Seoul" 
            }).split(",")[0]
          });
        }
      }
      
      // 문서 자동 동기화 비활성화 - 각 케이스 개별 관리
      // Auto-sync document disabled - each case manages its own documents
      
      res.json(document);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Upload document error:", error);
      res.status(500).json({ error: "문서를 업로드하는 중 오류가 발생했습니다" });
    }
  });

  // Get all documents for a case
  app.get("/api/documents/case/:caseId", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    try {
      const { caseId } = req.params;
      const documents = await storage.getDocumentsByCaseId(caseId);
      res.json(documents);
    } catch (error) {
      console.error("Get documents error:", error);
      res.status(500).json({ error: "문서를 조회하는 중 오류가 발생했습니다" });
    }
  });

  // Delete a document
  app.delete("/api/documents/:id", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    try {
      const { id } = req.params;
      
      // Verify existence
      const document = await storage.getDocument(id);
      if (!document) {
        return res.status(404).json({ error: "문서를 찾을 수 없습니다" });
      }
      
      // Allow admins and assessors to manage all documents, others only their own
      const userRole = req.session.userRole;
      const isPrivilegedRole = userRole === "관리자" || userRole === "심사사";
      
      if (!isPrivilegedRole && document.createdBy !== req.session.userId) {
        return res.status(403).json({ error: "권한이 없습니다" });
      }

      await storage.deleteDocument(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete document error:", error);
      res.status(500).json({ error: "문서를 삭제하는 중 오류가 발생했습니다" });
    }
  });

  // Update document category
  app.patch("/api/documents/:id", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    try {
      const { id } = req.params;
      const { category } = req.body;

      if (!category) {
        return res.status(400).json({ error: "카테고리를 입력해주세요" });
      }

      // Verify existence
      const document = await storage.getDocument(id);
      if (!document) {
        return res.status(404).json({ error: "문서를 찾을 수 없습니다" });
      }
      
      // Allow admins and assessors to manage all documents, others only their own
      const userRole = req.session.userRole;
      const isPrivilegedRole = userRole === "관리자" || userRole === "심사사";
      
      if (!isPrivilegedRole && document.createdBy !== req.session.userId) {
        return res.status(403).json({ error: "권한이 없습니다" });
      }

      const updated = await storage.updateDocumentCategory(id, category);
      res.json(updated);
    } catch (error) {
      console.error("Update document category error:", error);
      res.status(500).json({ error: "카테고리를 변경하는 중 오류가 발생했습니다" });
    }
  });

  // Cases endpoints
  // Get assigned cases for current user
  app.get("/api/cases/assigned", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    try {
      const { search } = req.query;
      const currentUser = await storage.getUser(req.session.userId);
      
      if (!currentUser) {
        return res.status(404).json({ error: "사용자를 찾을 수 없습니다" });
      }

      const cases = await storage.getAssignedCasesForUser(currentUser, search as string);
      
      // Return simplified case summary for picker
      const caseSummaries = cases.map(c => ({
        id: c.id,
        caseNumber: c.caseNumber,
        insuredName: c.insuredName,
        accidentLocation: c.insuredAddress || c.victimAddress || '-',
        insuranceCompany: c.insuranceCompany,
        status: c.status,
      }));

      res.json(caseSummaries);
    } catch (error) {
      console.error("Get assigned cases error:", error);
      res.status(500).json({ error: "배정된 케이스를 조회하는 중 오류가 발생했습니다" });
    }
  });

  // Estimate endpoints
  // Create new estimate version
  app.post("/api/estimates/:caseId", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    try {
      const { caseId } = req.params;
      const { rows, laborCostData, materialCostData, totalAmount, vatIncluded } = req.body;

      if (!rows || !Array.isArray(rows)) {
        return res.status(400).json({ error: "견적 행 데이터가 필요합니다" });
      }

      // Verify case exists
      const existingCase = await storage.getCaseById(caseId);
      if (!existingCase) {
        return res.status(404).json({ error: "케이스를 찾을 수 없습니다" });
      }

      // Validation schema for estimate row from UI
      const estimateRowSchema = z.object({
        category: z.string().min(1, "항소를 선택해주세요"),
        location: z.string().nullable().optional(),
        workName: z.string().nullable().optional(),
        damageWidth: z.union([z.string(), z.number()]).nullable().optional(),
        damageHeight: z.union([z.string(), z.number()]).nullable().optional(),
        damageArea: z.union([z.string(), z.number()]).nullable().optional(),
        repairWidth: z.union([z.string(), z.number()]).nullable().optional(),
        repairHeight: z.union([z.string(), z.number()]).nullable().optional(),
        repairArea: z.union([z.string(), z.number()]).nullable().optional(),
        note: z.string().nullable().optional(),
      });

      // Validate and transform UI row data to DB format
      const dbRows = rows.map((row: any, index: number) => {
        // Validate row structure
        const validated = estimateRowSchema.parse(row);

        // Convert to DB format with safe parsing
        // For width/height: simple integer conversion (mm)
        const toMillimeter = (val: string | number | null | undefined): number | null => {
          if (val === null || val === undefined || val === "" || val === "0000") return null;
          const num = typeof val === "string" ? parseInt(val, 10) : val;
          return !isNaN(num) && num >= 0 ? num : null;
        };

        // For area: convert m² to mm² (multiply by 1,000,000)
        const squareMeterToMillimeter = (val: string | number | null | undefined): number | null => {
          if (val === null || val === undefined || val === "" || val === "0000") return null;
          const num = typeof val === "string" ? parseFloat(val) : val;
          if (isNaN(num) || num < 0) return null;
          // Convert m² to mm² (multiply by 1,000,000)
          return Math.round(num * 1000000);
        };

        return {
          category: validated.category,
          location: validated.location === "선택" ? null : validated.location,
          workName: validated.workName === "선택" ? null : validated.workName,
          damageWidth: toMillimeter(validated.damageWidth),
          damageHeight: toMillimeter(validated.damageHeight),
          damageArea: squareMeterToMillimeter(validated.damageArea),
          repairWidth: toMillimeter(validated.repairWidth),
          repairHeight: toMillimeter(validated.repairHeight),
          repairArea: squareMeterToMillimeter(validated.repairArea),
          note: validated.note || null,
          rowOrder: index + 1, // Server assigns 1-based ordering
        };
      });

      const result = await storage.createEstimateVersion(
        caseId, 
        req.session.userId, 
        dbRows,
        laborCostData || null,
        materialCostData || null,
        vatIncluded ?? true // VAT 포함/별도 옵션
      );
      
      // 견적 총액을 케이스에 업데이트
      if (totalAmount !== undefined && totalAmount !== null) {
        await storage.updateCaseEstimateAmount(caseId, totalAmount.toString());
      }
      
      // Auto-sync estimate to all related cases (same insuranceAccidentNo)
      try {
        const syncCount = await storage.syncEstimateToRelatedCases(caseId);
        if (syncCount > 0) {
          console.log(`[Estimate] Auto-synced to ${syncCount} related cases`);
        }
      } catch (syncError) {
        console.error("Failed to sync estimate to related cases:", syncError);
        // Don't fail the request if sync fails
      }
      
      res.json(result);
    } catch (error) {
      console.error("Create estimate error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "견적 데이터 형식이 올바르지 않습니다",
          details: error.errors 
        });
      }
      res.status(500).json({ error: "견적을 저장하는 중 오류가 발생했습니다" });
    }
  });

  // Get latest estimate
  app.get("/api/estimates/:caseId/latest", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    try {
      const { caseId } = req.params;
      const result = await storage.getLatestEstimate(caseId);
      
      if (!result) {
        // Return empty result instead of 404 for easier frontend handling
        return res.json({ estimate: null, rows: [] });
      }

      res.json(result);
    } catch (error) {
      console.error("Get latest estimate error:", error);
      res.status(500).json({ error: "견적을 조회하는 중 오류가 발생했습니다" });
    }
  });

  // Get latest estimates for multiple cases (batch)
  app.post("/api/estimates/batch/latest", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    try {
      // Validate input with Zod
      const batchEstimatesSchema = z.object({
        caseIds: z.array(z.string().min(1)).max(100), // Max 100 cases per request
      });

      const { caseIds } = batchEstimatesSchema.parse(req.body);

      // Fetch estimates for all cases in parallel
      const results = await Promise.all(
        caseIds.map(async (caseId) => {
          try {
            const result = await storage.getLatestEstimate(caseId);
            return {
              caseId,
              estimate: result?.estimate || null,
              rows: result?.rows || [],
            };
          } catch (error) {
            console.error(`Error fetching estimate for case ${caseId}:`, error);
            return {
              caseId,
              estimate: null,
              rows: [],
              error: "견적 조회 실패",
            };
          }
        })
      );

      res.json(results);
    } catch (error) {
      console.error("Batch get estimates error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "요청 데이터 형식이 올바르지 않습니다",
          details: error.errors 
        });
      }
      res.status(500).json({ error: "견적을 조회하는 중 오류가 발생했습니다" });
    }
  });

  // Get all estimate versions
  app.get("/api/estimates/:caseId/versions", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    try {
      const { caseId } = req.params;
      const versions = await storage.listEstimateVersions(caseId);
      res.json(versions);
    } catch (error) {
      console.error("List estimate versions error:", error);
      res.status(500).json({ error: "견적 버전을 조회하는 중 오류가 발생했습니다" });
    }
  });

  // Get specific estimate version
  app.get("/api/estimates/:caseId/versions/:version", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    try {
      const { caseId, version } = req.params;
      const versionNum = parseInt(version, 10);

      if (isNaN(versionNum)) {
        return res.status(400).json({ error: "유효하지 않은 버전 번호입니다" });
      }

      const result = await storage.getEstimateVersion(caseId, versionNum);
      
      if (!result) {
        return res.status(404).json({ error: "견적 버전을 찾을 수 없습니다" });
      }

      res.json(result);
    } catch (error) {
      console.error("Get estimate version error:", error);
      res.status(500).json({ error: "견적 버전을 조회하는 중 오류가 발생했습니다" });
    }
  });

  // Master Data endpoints
  // Get master data (optionally filtered by category)
  // includeInactive=true for admin management view
  app.get("/api/master-data", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    try {
      const { category, includeInactive } = req.query;
      const includeAll = includeInactive === "true";
      const data = await storage.getMasterData(category as string | undefined, includeAll);
      res.json(data);
    } catch (error) {
      console.error("Get master data error:", error);
      res.status(500).json({ error: "기준정보를 조회하는 중 오류가 발생했습니다" });
    }
  });

  // Create new master data item (admin only)
  app.post("/api/master-data", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    const userRole = req.session.userRole;
    if (userRole !== "관리자") {
      return res.status(403).json({ error: "관리자만 기준정보를 추가할 수 있습니다" });
    }

    try {
      // Validate request body with Zod schema
      const validated = insertMasterDataSchema.parse(req.body);

      const created = await storage.createMasterData(validated);

      res.json(created);
    } catch (error) {
      console.error("Create master data error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "입력 데이터 형식이 올바르지 않습니다",
          details: error.errors 
        });
      }
      res.status(500).json({ error: "기준정보를 추가하는 중 오류가 발생했습니다" });
    }
  });

  // Delete master data item (admin only, soft delete)
  app.delete("/api/master-data/:id", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    const userRole = req.session.userRole;
    if (userRole !== "관리자") {
      return res.status(403).json({ error: "관리자만 기준정보를 삭제할 수 있습니다" });
    }

    try {
      const { id } = req.params;
      await storage.deleteMasterData(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete master data error:", error);
      res.status(500).json({ error: "기준정보를 삭제하는 중 오류가 발생했습니다" });
    }
  });

  // Update master data item (admin only)
  app.patch("/api/master-data/:id", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    const userRole = req.session.userRole;
    if (userRole !== "관리자") {
      return res.status(403).json({ error: "관리자만 기준정보를 수정할 수 있습니다" });
    }

    try {
      const { id } = req.params;
      const { value, displayOrder, isActive, note } = req.body;

      const updated = await storage.updateMasterData(id, {
        value,
        displayOrder,
        isActive,
        note,
      });

      if (!updated) {
        return res.status(404).json({ error: "기준정보를 찾을 수 없습니다" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Update master data error:", error);
      res.status(500).json({ error: "기준정보를 수정하는 중 오류가 발생했습니다" });
    }
  });

  // Labor cost endpoints
  // Get all labor costs (with optional filters)
  app.get("/api/labor-costs", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    try {
      const { category, workName, detailWork } = req.query;
      const filters: { category?: string; workName?: string; detailWork?: string } = {};
      
      if (typeof category === 'string') filters.category = category;
      if (typeof workName === 'string') filters.workName = workName;
      if (typeof detailWork === 'string') filters.detailWork = detailWork;
      
      const data = await storage.getLaborCosts(Object.keys(filters).length > 0 ? filters : undefined);
      res.json(data);
    } catch (error) {
      console.error("Get labor costs error:", error);
      res.status(500).json({ error: "노무비를 조회하는 중 오류가 발생했습니다" });
    }
  });

  app.get("/api/labor-costs/options", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    try {
      const options = await storage.getLaborCostOptions();
      res.json(options);
    } catch (error) {
      console.error("Get labor cost options error:", error);
      res.status(500).json({ error: "노무비 옵션을 조회하는 중 오류가 발생했습니다" });
    }
  });

  // Labor catalog from excel_data
  // Get parsed labor cost catalog from excel_data (all authenticated users)
  app.get("/api/labor-catalog", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    try {
      // Get latest 노무비 data from excel_data table
      const excelDataList = await storage.listExcelData('노무비');
      
      if (!excelDataList || excelDataList.length === 0) {
        return res.json([]);
      }

      // Use the most recent entry
      const excelData = excelDataList[0];
      
      if (!excelData.data || !Array.isArray(excelData.data)) {
        return res.json([]);
      }

      const catalog: any[] = [];
      
      // Helper functions
      const safeString = (val: any): string => {
        if (val === null || val === undefined) return '';
        return String(val).trim();
      };
      
      const parsePrice = (val: any): number | null => {
        if (val === null || val === undefined || val === '') return null;
        if (typeof val === 'number') return val;
        const cleaned = String(val).replace(/,/g, '').trim();
        const num = parseFloat(cleaned);
        return isNaN(num) ? null : num;
      };

      // Detect format by checking headers
      const headers = excelData.headers || [];
      const isNewFormat = headers.some((h: string) => h && h.includes('노임항목'));
      
      console.log('Labor catalog headers:', headers);
      console.log('Is new format:', isNewFormat);

      if (isNewFormat) {
        // NEW FORMAT: 공종, 공사명, 노임항목DB, 금액
        // Find column indices by header names with EXACT match priority
        // NOTE: Headers like '노임항목(공종에 종속)' contain '공종' substring, so use exact match first
        let categoryIdx = 0, workNameIdx = 1, laborItemIdx = 2, priceIdx = 3;
        
        // First pass: exact or near-exact matches (priority)
        headers.forEach((h: string, idx: number) => {
          const trimmed = (h || '').trim();
          // Exact match for 공종 (not substring match to avoid '노임항목(공종에 종속)')
          if (trimmed === '공종') categoryIdx = idx;
          // 노임항목 must be detected before checking for 공사명
          if (trimmed.includes('노임항목')) laborItemIdx = idx;
          // 금액 exact or near-exact
          if (trimmed.includes('금액')) priceIdx = idx;
        });
        
        // Second pass: 공사명 with more specific matching (exclude 노임항목 column)
        headers.forEach((h: string, idx: number) => {
          const trimmed = (h || '').trim();
          // 공사명 match (but not if already matched as 노임항목)
          if ((trimmed.includes('공사명') || trimmed.includes('품명')) && idx !== laborItemIdx) {
            workNameIdx = idx;
          }
        });
        
        console.log('NEW FORMAT column indices:', { categoryIdx, workNameIdx, laborItemIdx, priceIdx });

        let prevCategory: string | null = null;
        let prevWorkName: string | null = null;

        for (let i = 0; i < excelData.data.length; i++) {
          const row = excelData.data[i];
          if (!row || row.length === 0) continue;

          const category: string = safeString(row[categoryIdx]) || prevCategory || '';
          const workName: string = safeString(row[workNameIdx]) || prevWorkName || '';
          const laborItem: string = safeString(row[laborItemIdx]);
          const price = parsePrice(row[priceIdx]);

          // Update forward-fill values
          if (safeString(row[categoryIdx])) prevCategory = category;
          if (safeString(row[workNameIdx])) prevWorkName = workName;

          // Skip rows without essential data
          if (!category || !laborItem) continue;

          catalog.push({
            공종: category,
            공사명: workName,
            세부공사: '노무비', // 새 형식은 모두 노무비로 간주
            세부항목: laborItem, // 노임항목DB 값
            단위: '인',
            단가_인: price,
            단가_천장: null,
            단가_벽체: null,
            단가_바닥: null,
            단가_길이: null,
          });
        }
      } else {
        // OLD FORMAT: 공종, 공사명(품명), 세부공사, 세부항목, 인, 수량, 무게, 천장, 벽체, 바닥, 길이, 비고
        let prevCategory: string | null = null;
        let prevWorkName: string | null = null;
        let prevDetailWork: string | null = null;

        for (let i = 0; i < excelData.data.length; i++) {
          const row = excelData.data[i];
          if (!row || row.length === 0) continue;

          const category: string = safeString(row[0]) || prevCategory || '';
          const workName: string = safeString(row[1]) || prevWorkName || '';
          const detailWork: string = safeString(row[2]) || prevDetailWork || '';
          const detailItem: string = safeString(row[3]);

          // Column indices for old format
          const laborPrice = parsePrice(row[4]); // 인
          const ceilingPrice = parsePrice(row[7]); // 천장
          const wallPrice = parsePrice(row[8]); // 벽체
          const floorPrice = parsePrice(row[9]); // 바닥
          const lengthPrice = parsePrice(row[10]); // 길이

          // Update forward-fill values
          if (safeString(row[0])) prevCategory = category;
          if (safeString(row[1])) prevWorkName = workName;
          if (safeString(row[2])) prevDetailWork = detailWork;

          // Skip rows without enough data
          if (!category || !workName || !detailWork) continue;

          let unit = 'm';
          if (detailWork === '노무비') {
            unit = '인';
          } else if (ceilingPrice || wallPrice || floorPrice) {
            unit = '㎡';
          } else if (lengthPrice) {
            unit = 'm';
          }

          catalog.push({
            공종: category,
            공사명: workName,
            세부공사: detailWork,
            세부항목: detailItem,
            단위: unit,
            단가_인: laborPrice,
            단가_천장: ceilingPrice,
            단가_벽체: wallPrice,
            단가_바닥: floorPrice,
            단가_길이: lengthPrice,
          });
          
          // 피해철거공사 항목을 철거공사로 변환하여 추가 엔트리 생성
          // 예: 피해철거공사-피해철거-일위대가-석고보드 해체 → 철거공사-석고보드-일위대가-석고보드 해체
          if (category === '피해철거공사' && detailWork === '일위대가' && detailItem) {
            // 세부항목에서 공사명 추출 (예: "석고보드 해체" → "석고보드")
            const extractedWorkName = detailItem.replace(/\s*(해체|철거)\s*$/g, '').trim();
            if (extractedWorkName) {
              catalog.push({
                공종: '철거공사',
                공사명: extractedWorkName,
                세부공사: detailWork,
                세부항목: detailItem,
                단위: unit,
                단가_인: laborPrice,
                단가_천장: ceilingPrice,
                단가_벽체: wallPrice,
                단가_바닥: floorPrice,
                단가_길이: lengthPrice,
              });
            }
          }
          
          // 원인철거공사 항목도 철거공사로 변환
          if (category === '원인철거공사' && detailWork === '일위대가' && detailItem) {
            const extractedWorkName = detailItem.replace(/\s*(해체|철거|및.*|\/.*)\s*$/g, '').trim();
            if (extractedWorkName) {
              catalog.push({
                공종: '철거공사',
                공사명: extractedWorkName,
                세부공사: detailWork,
                세부항목: detailItem,
                단위: unit,
                단가_인: laborPrice,
                단가_천장: ceilingPrice,
                단가_벽체: wallPrice,
                단가_바닥: floorPrice,
                단가_길이: lengthPrice,
              });
            }
          }
        }
      }

      console.log('========== LABOR CATALOG DEBUG ==========');
      console.log('Parsed catalog items count:', catalog.length);
      // Debug: 첫 5개 항목 출력
      console.log('첫 5개 항목:', JSON.stringify(catalog.slice(0, 5), null, 2));
      
      // Debug: 모든 공종 목록 확인
      const allCategories = Array.from(new Set(catalog.map((item: any) => item.공종)));
      console.log('전체 공종 목록:', allCategories);
      console.log('==========================================');
      
      res.json(catalog);
    } catch (error) {
      console.error("Get labor catalog error:", error);
      res.status(500).json({ error: "노무비 카탈로그를 조회하는 중 오류가 발생했습니다" });
    }
  });

  // 일위대가DB catalog endpoint - Query by 공종 + 공사명 to get all 노임항목 rows
  app.get("/api/ilwidaega-catalog", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    try {
      // Get latest 일위대가 data from excel_data table
      const excelDataList = await storage.listExcelData('일위대가');
      
      console.log('[일위대가 API] 조회 결과:', excelDataList?.length || 0, '개');
      
      if (!excelDataList || excelDataList.length === 0) {
        console.log('[일위대가 API] 일위대가 데이터 없음');
        return res.json([]);
      }

      // Use the most recent entry
      const excelData = excelDataList[0];
      console.log('[일위대가 API] 사용할 데이터:', excelData.id, excelData.title);
      
      if (!excelData.data || !Array.isArray(excelData.data)) {
        console.log('[일위대가 API] 데이터 배열 없음');
        return res.json([]);
      }
      
      console.log('[일위대가 API] 행 수:', excelData.data.length);

      // Helper functions
      const safeString = (val: any): string => {
        if (val === null || val === undefined) return '';
        return String(val).trim();
      };
      
      const parsePrice = (val: any): number | null => {
        if (val === null || val === undefined || val === '') return null;
        if (typeof val === 'number') return val;
        const cleaned = String(val).replace(/,/g, '').trim();
        const num = parseFloat(cleaned);
        return isNaN(num) ? null : num;
      };

      const catalog: any[] = [];
      const headers = excelData.headers || [];
      
      // 일위대가 format: 공종, 공사명, 노임항목, 기준작업량, 노임단가(인당), 일위대가(노임단가/기준작업량)
      // Find column indices by header names with EXACT match priority
      // NOTE: Headers like '노임항목(공종에 종속)' contain '공종' substring, so use exact match first
      let categoryIdx = 0, workNameIdx = 1, laborItemIdx = 2, priceIdx = -1, standardWorkQuantityIdx = -1;
      
      // First pass: exact or near-exact matches (priority)
      headers.forEach((h: string, idx: number) => {
        const trimmed = (h || '').trim();
        // Exact match for 공종 (not substring match to avoid '노임항목(공종에 종속)')
        if (trimmed === '공종') categoryIdx = idx;
        // 노임항목 must be detected before checking for 공사명
        if (trimmed.includes('노임항목')) laborItemIdx = idx;
        // 금액 또는 일위대가 (금액 컬럼)
        if (trimmed.includes('금액') || trimmed.includes('일위대가') || trimmed.includes('노임단가')) {
          // 일위대가 컬럼이 금액으로 사용됨 (우선순위: 일위대가 > 금액)
          if (trimmed.includes('일위대가')) {
            priceIdx = idx;
          } else if (priceIdx < 0) {
            priceIdx = idx;
          }
        }
        // 기준작업량 - '일위대가(노임단가/기준작업량)' 같은 복합 헤더 제외 (정확히 '기준작업량'만 매칭)
        if (trimmed.includes('기준작업량') && !trimmed.includes('일위대가') && !trimmed.includes('노임단가')) {
          standardWorkQuantityIdx = idx;
        }
      });
      
      // Second pass: 공사명 with more specific matching (exclude 노임항목 column)
      headers.forEach((h: string, idx: number) => {
        const trimmed = (h || '').trim();
        // 공사명 match (but not if already matched as 노임항목)
        if ((trimmed.includes('공사명') || trimmed.includes('품명')) && idx !== laborItemIdx) {
          workNameIdx = idx;
        }
      });
      
      console.log('일위대가 headers:', headers);
      console.log('일위대가 column indices:', { categoryIdx, workNameIdx, laborItemIdx, priceIdx, standardWorkQuantityIdx });

      let prevCategory: string | null = null;
      let prevWorkName: string | null = null;

      for (let i = 0; i < excelData.data.length; i++) {
        const row = excelData.data[i];
        if (!row || row.length === 0) continue;

        const category: string = safeString(row[categoryIdx]) || prevCategory || '';
        const workName: string = safeString(row[workNameIdx]) || prevWorkName || '';
        const laborItem: string = safeString(row[laborItemIdx]);
        const price = parsePrice(row[priceIdx]);
        const standardWorkQuantity = standardWorkQuantityIdx >= 0 ? parsePrice(row[standardWorkQuantityIdx]) : null;

        // Update forward-fill values
        if (safeString(row[categoryIdx])) prevCategory = category;
        if (safeString(row[workNameIdx])) prevWorkName = workName;

        // Skip rows without essential data
        if (!category || !laborItem) continue;
        
        // Skip header rows (rows where values look like header names)
        if (category === '공종' || laborItem === '노임항목' || laborItem.includes('노임항목')) continue;

        catalog.push({
          공종: category,
          공사명: workName,
          노임항목: laborItem,
          금액: price,
          기준작업량: standardWorkQuantity,
        });
      }

      // Remove duplicate entries (based on 공종+공사명+노임항목 combination)
      const seen = new Set<string>();
      const uniqueCatalog = catalog.filter(item => {
        const key = `${item.공종}|${item.공사명}|${item.노임항목}`;
        if (seen.has(key)) {
          return false; // Duplicate
        }
        seen.add(key);
        return true;
      });
      
      console.log('Parsed 일위대가 catalog items:', catalog.length, '→ 중복 제거 후:', uniqueCatalog.length);
      
      res.json(uniqueCatalog);
    } catch (error) {
      console.error("Get 일위대가 catalog error:", error);
      res.status(500).json({ error: "일위대가 카탈로그를 조회하는 중 오류가 발생했습니다" });
    }
  });

  // 자재비DB catalog endpoint - Query by 공사명 to get matching materials
  app.get("/api/materials-by-workname", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    try {
      // Get latest 자재비 data from excel_data table
      const excelDataList = await storage.listExcelData('자재비');
      
      if (!excelDataList || excelDataList.length === 0) {
        return res.json([]);
      }

      // Use the most recent entry
      const excelData = excelDataList[0];
      
      console.log('[자재비 API] Excel 데이터:', {
        id: excelData.id,
        title: excelData.title,
        headerType: typeof excelData.headers,
        headersRaw: JSON.stringify(excelData.headers),
        dataRows: excelData.data?.length || 0
      });
      
      if (!excelData.data || !Array.isArray(excelData.data)) {
        return res.json([]);
      }

      // Helper functions
      const safeString = (val: any): string => {
        if (val === null || val === undefined) return '';
        return String(val).trim();
      };
      
      const parsePrice = (val: any): number | string | null => {
        if (val === null || val === undefined || val === '') return null;
        if (typeof val === 'string' && val.trim() === '입력') return '입력';
        if (typeof val === 'number') return val;
        const cleaned = String(val).replace(/,/g, '').trim();
        const num = parseFloat(cleaned);
        return isNaN(num) ? null : num;
      };

      const catalog: any[] = [];
      const headers = excelData.headers || [];
      
      // 자재비 format: 공종, 공사명, 자재항목(공사명에 종속), 단위, 단가
      console.log('[자재비 API] 헤더:', headers);
      let categoryIdx = 0, workNameIdx = 1, materialItemIdx = 2, unitIdx = 3, priceIdx = 4;
      
      // First pass: find 자재항목 column (to exclude it from 공사명 matching)
      headers.forEach((h: string, idx: number) => {
        if (!h) return;
        if (h.includes('자재항목') || h.includes('자재명')) materialItemIdx = idx;
      });
      
      // Second pass: find other columns (excluding 자재항목 from 공사명 match)
      headers.forEach((h: string, idx: number) => {
        if (!h) return;
        // 공종 (exact match or column name that is just "공종")
        if (h.trim() === '공종' || h.includes('공종명')) categoryIdx = idx;
        // 공사명 - but NOT if it's the 자재항목 column
        if ((h.includes('공사명') || h.includes('품명')) && idx !== materialItemIdx && !h.includes('자재')) {
          workNameIdx = idx;
        }
        if (h.includes('단위')) unitIdx = idx;
        if (h.includes('금액') || h.includes('단가')) priceIdx = idx;
      });
      console.log('[자재비 API] 인덱스:', { categoryIdx, workNameIdx, materialItemIdx, unitIdx, priceIdx });

      let prevCategory: string | null = null;
      let prevWorkName: string | null = null;

      for (let i = 0; i < excelData.data.length; i++) {
        const row = excelData.data[i];
        if (!row || row.length === 0) continue;

        const category: string = safeString(row[categoryIdx]) || prevCategory || '';
        const workName: string = safeString(row[workNameIdx]) || prevWorkName || '';
        const materialItem: string = safeString(row[materialItemIdx]); // 자재항목
        const unit: string = safeString(row[unitIdx]);
        const price = parsePrice(row[priceIdx]);

        // Update forward-fill values
        if (safeString(row[categoryIdx])) prevCategory = category;
        if (safeString(row[workNameIdx])) prevWorkName = workName;

        // Skip rows without essential data
        if (!category || !workName || !materialItem) continue;

        catalog.push({
          공종: category,
          공사명: workName,
          자재항목: materialItem,
          단위: unit,
          금액: price,
        });
      }

      console.log('Parsed 자재비 catalog items:', catalog.length);
      
      res.json(catalog);
    } catch (error) {
      console.error("Get 자재비 catalog error:", error);
      res.status(500).json({ error: "자재비 카탈로그를 조회하는 중 오류가 발생했습니다" });
    }
  });

  // Materials (자재비) endpoints
  // Get materials catalog from excel_data (all authenticated users)
  app.get("/api/materials", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    try {
      const catalog = await storage.getMaterialsCatalog();
      res.json(catalog);
    } catch (error) {
      console.error("Get materials catalog error:", error);
      res.status(500).json({ error: "자재비 카탈로그를 조회하는 중 오류가 발생했습니다" });
    }
  });

  // Create new material (admin only)
  app.post("/api/materials", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    const userRole = req.session.userRole;
    if (userRole !== "관리자") {
      return res.status(403).json({ error: "관리자만 자재를 추가할 수 있습니다" });
    }

    try {
      const validated = insertMaterialSchema.parse(req.body);
      const created = await storage.createMaterial(validated);
      res.json(created);
    } catch (error) {
      console.error("Create material error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "입력 데이터 형식이 올바르지 않습니다",
          details: error.errors 
        });
      }
      res.status(500).json({ error: "자재를 추가하는 중 오류가 발생했습니다" });
    }
  });

  // Delete material (admin only)
  app.delete("/api/materials/:id", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    const userRole = req.session.userRole;
    if (userRole !== "관리자") {
      return res.status(403).json({ error: "관리자만 자재를 삭제할 수 있습니다" });
    }

    try {
      const { id } = req.params;
      await storage.deleteMaterial(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete material error:", error);
      res.status(500).json({ error: "자재를 삭제하는 중 오류가 발생했습니다" });
    }
  });

  // Create new labor cost item (admin only)
  app.post("/api/labor-costs", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    const userRole = req.session.userRole;
    if (userRole !== "관리자") {
      return res.status(403).json({ error: "관리자만 노무비를 추가할 수 있습니다" });
    }

    try {
      const validated = insertLaborCostSchema.parse(req.body);
      const created = await storage.createLaborCost(validated);
      res.json(created);
    } catch (error) {
      console.error("Create labor cost error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "입력 데이터 형식이 올바르지 않습니다",
          details: error.errors 
        });
      }
      res.status(500).json({ error: "노무비를 추가하는 중 오류가 발생했습니다" });
    }
  });

  // Delete labor cost item (admin only)
  app.delete("/api/labor-costs/:id", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    const userRole = req.session.userRole;
    if (userRole !== "관리자") {
      return res.status(403).json({ error: "관리자만 노무비를 삭제할 수 있습니다" });
    }

    try {
      const { id } = req.params;
      await storage.deleteLaborCost(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete labor cost error:", error);
      res.status(500).json({ error: "노무비를 삭제하는 중 오류가 발생했습니다" });
    }
  });

  // Get field survey report data (통합 조회)
  app.get("/api/field-surveys/:caseId/report", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    try {
      const { caseId } = req.params;
      
      // 케이스 정보 조회
      const caseData = await storage.getCaseById(caseId);
      if (!caseData) {
        return res.status(404).json({ error: "케이스를 찾을 수 없습니다" });
      }

      // 도면 조회
      const drawing = await storage.getDrawingByCaseId(caseId);
      
      // 증빙자료 조회
      const documents = await storage.getDocumentsByCaseId(caseId);
      
      // 최신 견적 조회
      const estimateData = await storage.getLatestEstimate(caseId);
      
      // 각 섹션 완료 여부 체크
      const completionStatus = {
        fieldSurvey: !!(caseData.visitDate && caseData.visitTime && caseData.accidentCategory),
        drawing: !!drawing,
        documents: documents.length > 0,
        estimate: !!(estimateData?.rows && estimateData.rows.length > 0),
        isComplete: false,
      };
      
      // 전체 완료 여부 (기타사항은 optional이므로 제외)
      completionStatus.isComplete = 
        completionStatus.fieldSurvey &&
        completionStatus.drawing &&
        completionStatus.documents &&
        completionStatus.estimate;
      
      // 통합된 보고서 데이터 반환
      res.json({
        case: caseData,
        drawing: drawing || null,
        documents: documents || [],
        estimate: estimateData || { estimate: null, rows: [] },
        completionStatus,
      });
    } catch (error) {
      console.error("Get field survey report error:", error);
      res.status(500).json({ error: "현장조사 보고서를 조회하는 중 오류가 발생했습니다" });
    }
  });

  // Get dashboard statistics (권한별 필터링)
  app.get("/api/dashboard/stats", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    try {
      // Get current user for permission-based filtering
      const currentUser = await storage.getUser(req.session.userId);
      
      if (!currentUser) {
        return res.status(404).json({ error: "사용자를 찾을 수 없습니다" });
      }
      
      // Get cases filtered by user role and permissions
      const filteredCases = await storage.getAllCases(currentUser);
      
      // Helper function to parse date from case
      const parseAccidentDate = (dateStr: string | null): Date | null => {
        if (!dateStr) return null;
        try {
          return new Date(dateStr);
        } catch {
          return null;
        }
      };
      
      // Calculate current month and last month ranges dynamically
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1; // JavaScript months are 0-indexed
      
      // Calculate last month (handle year boundary)
      const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const lastYear = currentMonth === 1 ? currentYear - 1 : currentYear;
      
      // Filter cases for current month
      const currentMonthCases = filteredCases.filter(c => {
        const accidentDate = parseAccidentDate(c.accidentDate);
        if (!accidentDate) return false;
        return accidentDate.getFullYear() === currentYear && accidentDate.getMonth() + 1 === currentMonth;
      });
      
      // Filter cases for last month
      const lastMonthCases = filteredCases.filter(c => {
        const accidentDate = parseAccidentDate(c.accidentDate);
        if (!accidentDate) return false;
        return accidentDate.getFullYear() === lastYear && accidentDate.getMonth() + 1 === lastMonth;
      });
      
      // 미결건: 청구단계 이전 (청구, 입금완료, 일부입금, 정산완료 제외)
      const claimStatuses = ["청구", "입금완료", "일부입금", "정산완료", "접수취소"];
      
      // 접수건: 전체 케이스 (취소 제외)
      const receivedCases = filteredCases.filter(c => c.status !== "접수취소").length;
      const lastMonthReceivedCases = lastMonthCases.filter(c => c.status !== "접수취소").length;
      
      // 미결건: 청구단계 이전 (청구, 입금완료, 일부입금, 정산완료, 접수취소 제외)
      const pendingCases = filteredCases.filter(c => !claimStatuses.includes(c.status)).length;
      const lastMonthPendingCases = lastMonthCases.filter(c => !claimStatuses.includes(c.status)).length;
      
      // Calculate changes
      const receivedCasesChangeCount = receivedCases - lastMonthReceivedCases;
      const receivedCasesChange = lastMonthReceivedCases > 0 
        ? ((receivedCasesChangeCount / lastMonthReceivedCases) * 100)
        : 0;
      
      const pendingCasesChangeCount = pendingCases - lastMonthPendingCases;
      const pendingCasesChange = lastMonthPendingCases > 0
        ? ((pendingCasesChangeCount / lastMonthPendingCases) * 100)
        : 0;
      
      // Helper function to calculate estimate total from laborCostData and materialCostData
      const calculateEstimateTotal = (laborCostData: any, materialCostData: any): number => {
        let laborTotalWithExpense = 0;
        let laborTotalWithoutExpense = 0;
        let materialTotal = 0;

        // Calculate labor costs
        if (Array.isArray(laborCostData)) {
          laborCostData.forEach((row: any) => {
            const amount = row.amount || 0;
            if (row.includeInEstimate) {
              laborTotalWithExpense += amount;
            } else {
              laborTotalWithoutExpense += amount;
            }
          });
        }

        // Calculate material costs
        if (Array.isArray(materialCostData)) {
          materialCostData.forEach((row: any) => {
            materialTotal += (row.금액 || 0);
          });
        }

        // 소계 (전체)
        const subtotal = laborTotalWithExpense + laborTotalWithoutExpense + materialTotal;

        // 일반관리비와 이윤 계산 대상 (경비 제외)
        const baseForFees = laborTotalWithoutExpense + materialTotal;

        // 일반관리비 (6%) - 경비 제외 항목에만 적용
        const managementFee = Math.round(baseForFees * 0.06);

        // 이윤 (15%) - 경비 제외 항목에만 적용
        const profit = Math.round(baseForFees * 0.15);

        // VAT 기준액 (소계 + 일반관리비 + 이윤)
        const vatBase = subtotal + managementFee + profit;

        // VAT (10%)
        const vat = Math.round(vatBase * 0.1);

        // 총 합계 (VAT 포함)
        const total = vatBase + vat;

        return total;
      };

      // Get estimates for all cases to calculate unsettled amounts
      const caseIds = filteredCases.map(c => c.id);
      const allEstimates = caseIds.length > 0
        ? await db
            .select()
            .from(estimates)
            .where(inArray(estimates.caseId, caseIds))
        : [];

      // Get latest estimate for each case
      const latestEstimatesByCaseId = new Map<string, any>();
      allEstimates.forEach(est => {
        const existing = latestEstimatesByCaseId.get(est.caseId);
        if (!existing || est.version > existing.version) {
          latestEstimatesByCaseId.set(est.caseId, est);
        }
      });

      // 보험사 미정산: 입금완료 상태 이전인 건들 (청구했지만 아직 입금 안된 건)
      const insuranceUnsettledCases = filteredCases.filter(c => c.status === "청구");
      const insuranceUnsettledAmount = insuranceUnsettledCases.reduce((sum, c) => {
        const estimate = latestEstimatesByCaseId.get(c.id);
        if (estimate) {
          const total = calculateEstimateTotal(estimate.laborCostData, estimate.materialCostData);
          return sum + total;
        }
        return sum;
      }, 0);

      // 협력사 미정산: 정산완료 이전 상태의 건들 (입금 됐지만 아직 정산 안된 건)
      const partnerUnsettledCases = filteredCases.filter(c => 
        c.status === "입금완료" || c.status === "일부입금"
      );
      const partnerUnsettledAmount = partnerUnsettledCases.reduce((sum, c) => {
        const estimate = latestEstimatesByCaseId.get(c.id);
        if (estimate) {
          const total = calculateEstimateTotal(estimate.laborCostData, estimate.materialCostData);
          return sum + total;
        }
        return sum;
      }, 0);
      
      const stats = {
        // 접수건: 이번달 케이스 수
        receivedCases,
        lastMonthReceivedCases,
        receivedCasesChange: Math.round(receivedCasesChange * 10) / 10, // 소수점 1자리
        receivedCasesChangeCount,
        
        // 미결건: status가 "제출", "검토중", "1차승인"인 케이스
        pendingCases,
        lastMonthPendingCases,
        pendingCasesChange: Math.round(pendingCasesChange * 10) / 10, // 소수점 1자리
        pendingCasesChangeCount,
        
        // 보험사 미정산: "청구" 상태인 케이스들의 견적 금액 합계
        insuranceUnsettledCases: insuranceUnsettledCases.length,
        insuranceUnsettledAmount: Math.round(insuranceUnsettledAmount),
        
        // 협력사 미정산: "완료" 또는 "청구" 상태인 케이스들의 견적 금액 합계
        partnerUnsettledCases: partnerUnsettledCases.length,
        partnerUnsettledAmount: Math.round(partnerUnsettledAmount),
      };
      
      res.json(stats);
    } catch (error) {
      console.error("Get dashboard stats error:", error);
      res.status(500).json({ error: "통계를 조회하는 중 오류가 발생했습니다" });
    }
  });

  // 평균 수리비 항목별 통계 API
  app.get("/api/statistics/avg-repair-cost-by-category", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    try {
      const startDateParam = req.query.startDate as string;
      const endDateParam = req.query.endDate as string;

      // 손해정지비용 공종
      const damagePreventionTypes = ['누수탐지비용', '배관공사', '방수공사', '코킹공사', '철거공사', '원인철거공사'];
      // 대물수리비용 공종
      const propertyRepairTypes = ['가설공사', '목공사', '수장공사', '도장공사', '욕실공사', '타일공사', '가구공사', '전기공사', '피해철거공사', '기타공사'];

      // 기간 필터링
      let caseFilter = sql`1=1`;
      if (startDateParam && endDateParam) {
        caseFilter = sql`${cases.createdAt} >= ${startDateParam} AND ${cases.createdAt} <= ${endDateParam}`;
      }

      // 완료된 직접복구 케이스 조회
      const completedCases = await db
        .select()
        .from(cases)
        .where(sql`(${cases.status} IN ('정산완료', '입금완료', '일부입금')) AND (${cases.recoveryType} = '직접복구' OR ${cases.status} = '직접복구')`);

      if (!completedCases.length) {
        return res.json({
          손해정지비용: { 누수탐지비: 0, 배관공사: 0, 방수공사: 0, 코킹공사: 0, 철거공사: 0, 계: 0 },
          대물수리비용: { 가설공사: 0, 목공사: 0, 수장공사: 0, 도장공사: 0, 욕실공사: 0, 가구공사: 0, 전기공사: 0, 철거공사: 0, 기타공사: 0, 계: 0 },
          총계: 0,
          건수: 0,
        });
      }

      // 케이스별 최신 견적 조회
      const caseIds = completedCases.map(c => c.id);
      const allEstimates = await db
        .select()
        .from(estimates)
        .where(inArray(estimates.caseId, caseIds));

      // 케이스별 최신 견적만 추출
      const latestEstimatesByCaseId = new Map<string, any>();
      allEstimates.forEach(est => {
        const existing = latestEstimatesByCaseId.get(est.caseId);
        if (!existing || est.version > existing.version) {
          latestEstimatesByCaseId.set(est.caseId, est);
        }
      });

      // 공종별 합계 계산
      const damagePreventionTotals: Record<string, number> = {
        누수탐지비: 0, 배관공사: 0, 방수공사: 0, 코킹공사: 0, 철거공사: 0
      };
      const propertyRepairTotals: Record<string, number> = {
        가설공사: 0, 목공사: 0, 수장공사: 0, 도장공사: 0, 욕실공사: 0, 가구공사: 0, 전기공사: 0, 철거공사: 0, 기타공사: 0
      };

      let validCaseCount = 0;

      latestEstimatesByCaseId.forEach((estimate) => {
        if (!estimate.laborCostData || !Array.isArray(estimate.laborCostData)) return;
        validCaseCount++;

        estimate.laborCostData.forEach((row: any) => {
          const category = row.category || '';
          const amount = row.amount || 0;

          // 손해정지비용 분류
          if (category === '누수탐지비용') {
            damagePreventionTotals['누수탐지비'] += amount;
          } else if (category === '배관공사') {
            damagePreventionTotals['배관공사'] += amount;
          } else if (category === '방수공사') {
            damagePreventionTotals['방수공사'] += amount;
          } else if (category === '코킹공사') {
            damagePreventionTotals['코킹공사'] += amount;
          } else if (category === '원인철거공사' || (category.includes('철거') && damagePreventionTypes.some(t => t.includes(category)))) {
            damagePreventionTotals['철거공사'] += amount;
          }

          // 대물수리비용 분류
          if (category === '가설공사') {
            propertyRepairTotals['가설공사'] += amount;
          } else if (category === '목공사') {
            propertyRepairTotals['목공사'] += amount;
          } else if (category === '수장공사') {
            propertyRepairTotals['수장공사'] += amount;
          } else if (category === '도장공사') {
            propertyRepairTotals['도장공사'] += amount;
          } else if (category === '욕실공사' || category === '타일공사') {
            propertyRepairTotals['욕실공사'] += amount;
          } else if (category === '가구공사') {
            propertyRepairTotals['가구공사'] += amount;
          } else if (category === '전기공사') {
            propertyRepairTotals['전기공사'] += amount;
          } else if (category === '피해철거공사') {
            propertyRepairTotals['철거공사'] += amount;
          } else if (category === '기타공사' && !damagePreventionTypes.includes(category)) {
            propertyRepairTotals['기타공사'] += amount;
          }
        });
      });

      // 평균 계산
      const avgDivisor = validCaseCount || 1;
      const avgDamagePrevention: Record<string, number> = {};
      Object.keys(damagePreventionTotals).forEach(key => {
        avgDamagePrevention[key] = Math.round(damagePreventionTotals[key] / avgDivisor);
      });
      avgDamagePrevention['계'] = Object.values(avgDamagePrevention).reduce((a, b) => a + b, 0);

      const avgPropertyRepair: Record<string, number> = {};
      Object.keys(propertyRepairTotals).forEach(key => {
        avgPropertyRepair[key] = Math.round(propertyRepairTotals[key] / avgDivisor);
      });
      avgPropertyRepair['계'] = Object.values(avgPropertyRepair).reduce((a, b) => a + b, 0);

      res.json({
        손해정지비용: avgDamagePrevention,
        대물수리비용: avgPropertyRepair,
        총계: avgDamagePrevention['계'] + avgPropertyRepair['계'],
        건수: validCaseCount,
      });
    } catch (error) {
      console.error("Get avg repair cost by category error:", error);
      res.status(500).json({ error: "평균 수리비 항목별 통계를 조회하는 중 오류가 발생했습니다" });
    }
  });

  // 인보이스 발송 API
  app.post("/api/invoice/send", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    try {
      const { caseId, relatedCaseIds } = req.body;

      if (!caseId) {
        return res.status(400).json({ error: "케이스 ID가 필요합니다" });
      }

      // 케이스 정보 조회
      const caseData = await storage.getCaseById(caseId);
      if (!caseData) {
        return res.status(404).json({ error: "케이스를 찾을 수 없습니다" });
      }

      // 관련 케이스들의 상태를 "청구"로 변경
      const caseIdsToUpdate = relatedCaseIds && relatedCaseIds.length > 0 ? relatedCaseIds : [caseId];
      
      for (const id of caseIdsToUpdate) {
        await storage.updateCase(id, { status: "청구" });
        
        // 진행상황 기록 추가
        await storage.createProgressUpdate({
          caseId: id,
          content: "인보이스 발송 완료 - 청구 상태로 변경",
          createdBy: req.session.userId,
        });
      }

      // TODO: 실제 이메일 발송 로직 (SendGrid 등 연동 필요)
      // 현재는 상태만 변경하고 성공 응답 반환

      res.json({ 
        success: true, 
        message: "인보이스가 발송되었습니다.",
        updatedCases: caseIdsToUpdate.length,
      });
    } catch (error) {
      console.error("Invoice send error:", error);
      res.status(500).json({ error: "인보이스 발송 중 오류가 발생했습니다" });
    }
  });

  // User favorites endpoints
  // Get user's favorites
  app.get("/api/favorites", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    try {
      const favorites = await storage.getUserFavorites(req.session.userId);
      res.json(favorites);
    } catch (error) {
      console.error("Get favorites error:", error);
      res.status(500).json({ error: "즐겨찾기를 조회하는 중 오류가 발생했습니다" });
    }
  });

  // Add favorite
  app.post("/api/favorites", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    try {
      const { menuName } = req.body;

      if (!menuName) {
        return res.status(400).json({ error: "메뉴 이름이 필요합니다" });
      }

      const favorite = await storage.addFavorite({
        userId: req.session.userId,
        menuName,
      });

      res.json(favorite);
    } catch (error) {
      console.error("Add favorite error:", error);
      
      // Handle unique constraint violation (duplicate favorite)
      if (error instanceof Error && error.message.includes("unique")) {
        return res.status(409).json({ error: "이미 즐겨찾기에 추가된 메뉴입니다" });
      }
      
      res.status(500).json({ error: "즐겨찾기를 추가하는 중 오류가 발생했습니다" });
    }
  });

  // Remove favorite
  app.delete("/api/favorites/:menuName", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    try {
      const { menuName } = req.params;

      await storage.removeFavorite(req.session.userId, menuName);
      res.json({ success: true });
    } catch (error) {
      console.error("Remove favorite error:", error);
      res.status(500).json({ error: "즐겨찾기를 삭제하는 중 오류가 발생했습니다" });
    }
  });

  // Notices routes
  // Get all notices
  app.get("/api/notices", async (req, res) => {
    try {
      const allNotices = await storage.getAllNotices();
      res.json(allNotices);
    } catch (error) {
      console.error("Get notices error:", error);
      res.status(500).json({ error: "공지사항을 조회하는 중 오류가 발생했습니다" });
    }
  });

  // Create notice (admin only)
  app.post("/api/notices", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    // Check if user is admin
    const user = await storage.getUser(req.session.userId);
    if (!user || user.role !== "관리자") {
      return res.status(403).json({ error: "관리자만 공지사항을 작성할 수 있습니다" });
    }

    try {
      const { title, content } = req.body;

      if (!title || !content) {
        return res.status(400).json({ error: "제목과 내용을 입력해주세요" });
      }

      const notice = await storage.createNotice({
        title,
        content,
        authorId: req.session.userId,
      });

      res.json(notice);
    } catch (error) {
      console.error("Create notice error:", error);
      res.status(500).json({ error: "공지사항을 등록하는 중 오류가 발생했습니다" });
    }
  });

  // Update notice (admin only)
  app.patch("/api/notices/:id", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    // Check if user is admin
    const user = await storage.getUser(req.session.userId);
    if (!user || user.role !== "관리자") {
      return res.status(403).json({ error: "관리자만 공지사항을 수정할 수 있습니다" });
    }

    try {
      const { id } = req.params;
      const { title, content } = req.body;

      if (!title || !content) {
        return res.status(400).json({ error: "제목과 내용을 입력해주세요" });
      }

      const updated = await storage.updateNotice(id, { title, content });

      if (!updated) {
        return res.status(404).json({ error: "공지사항을 찾을 수 없습니다" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Update notice error:", error);
      res.status(500).json({ error: "공지사항을 수정하는 중 오류가 발생했습니다" });
    }
  });

  // Delete notice (admin only)
  app.delete("/api/notices/:id", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    // Check if user is admin
    const user = await storage.getUser(req.session.userId);
    if (!user || user.role !== "관리자") {
      return res.status(403).json({ error: "관리자만 공지사항을 삭제할 수 있습니다" });
    }

    try {
      const { id } = req.params;
      await storage.deleteNotice(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete notice error:", error);
      res.status(500).json({ error: "공지사항을 삭제하는 중 오류가 발생했습니다" });
    }
  });

  // Get change logs for a specific case
  app.get("/api/cases/:caseId/change-logs", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    try {
      const { caseId } = req.params;
      const logs = await storage.getCaseChangeLogs(caseId);
      res.json(logs);
    } catch (error) {
      console.error("Get case change logs error:", error);
      res.status(500).json({ error: "변경 로그를 불러오는 중 오류가 발생했습니다" });
    }
  });

  // Get all change logs (admin only)
  app.get("/api/case-change-logs", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    // Check if user is admin
    const user = await storage.getUser(req.session.userId);
    if (!user || user.role !== "관리자") {
      return res.status(403).json({ error: "관리자만 변경 로그를 조회할 수 있습니다" });
    }

    try {
      const { caseNumber, changedBy, dateFrom, dateTo } = req.query;
      
      const logs = await storage.getAllCaseChangeLogs({
        caseNumber: caseNumber as string | undefined,
        changedBy: changedBy as string | undefined,
        dateFrom: dateFrom as string | undefined,
        dateTo: dateTo as string | undefined,
      });
      
      res.json(logs);
    } catch (error) {
      console.error("Get all change logs error:", error);
      res.status(500).json({ error: "변경 로그를 불러오는 중 오류가 발생했습니다" });
    }
  });

  // Send field report email endpoint (SMTP/Nodemailer)
  app.post("/api/send-field-report-email", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    try {
      const { email, pdfBase64, caseNumber, caseId } = req.body;

      if (!email || !pdfBase64) {
        return res.status(400).json({ error: "이메일 주소와 PDF 데이터가 필요합니다" });
      }

      // Check SMTP environment variables
      const SMTP_HOST = process.env.SMTP_HOST;
      const SMTP_PORT = process.env.SMTP_PORT;
      const SMTP_USER = process.env.SMTP_USER;
      const SMTP_PASS = process.env.SMTP_PASS;

      if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
        console.error("[send-field-report-email] Missing SMTP configuration");
        return res.status(500).json({ error: "SMTP 설정이 필요합니다 (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS)" });
      }

      const fileName = `현장출동보고서_${caseNumber || 'report'}_${new Date().toISOString().split('T')[0]}.pdf`;
      const dateStr = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
      
      // Convert base64 to buffer
      const pdfBuffer = Buffer.from(pdfBase64, 'base64');

      // Create Nodemailer transporter
      const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: parseInt(SMTP_PORT, 10),
        secure: parseInt(SMTP_PORT, 10) === 465,
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS,
        },
      });

      // Send email with PDF attachment
      const mailOptions = {
        from: `FLOXN <${SMTP_USER}>`,
        to: email,
        subject: `현장출동보고서 - ${caseNumber || "케이스"}`,
        text: `안녕하세요,

현장출동보고서를 첨부하여 보내드립니다.

- 접수번호: ${caseNumber || "N/A"}
- 발송일: ${dateStr}

첨부된 PDF 파일을 확인해 주시기 바랍니다.

감사합니다.
FLOXN 드림`,
        attachments: [
          {
            filename: fileName,
            content: pdfBuffer,
            contentType: 'application/pdf',
          }
        ],
      };

      const info = await transporter.sendMail(mailOptions);
      console.log(`[Email] Field report sent successfully to ${email} for case ${caseNumber || caseId}, messageId: ${info.messageId}`);
      res.json({ success: true, message: "이메일이 전송되었습니다" });
    } catch (error) {
      console.error("Send field report email error:", error);
      res.status(500).json({ error: "이메일 전송 중 오류가 발생했습니다" });
    }
  });

  // ==========================================
  // POST /send-pdf - PDF 이메일 첨부 전송 (SMTP/Nodemailer)
  // ==========================================
  app.post("/send-pdf", async (req, res) => {
    try {
      const { to, pdfUrl } = req.body;

      // Validate request body
      if (!to || typeof to !== 'string') {
        return res.status(400).json({ ok: false, message: "수신자 이메일(to)이 필요합니다" });
      }
      if (!pdfUrl || typeof pdfUrl !== 'string') {
        return res.status(400).json({ ok: false, message: "PDF URL(pdfUrl)이 필요합니다" });
      }

      // Check SMTP environment variables
      const SMTP_HOST = process.env.SMTP_HOST;
      const SMTP_PORT = process.env.SMTP_PORT;
      const SMTP_USER = process.env.SMTP_USER;
      const SMTP_PASS = process.env.SMTP_PASS;

      if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
        console.error("[send-pdf] Missing SMTP configuration");
        return res.status(500).json({ ok: false, message: "SMTP 설정이 필요합니다 (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS)" });
      }

      // Download PDF from URL
      console.log(`[send-pdf] Downloading PDF from: ${pdfUrl}`);
      let pdfBuffer: Buffer;
      try {
        const pdfResponse = await fetch(pdfUrl);
        if (!pdfResponse.ok) {
          console.error(`[send-pdf] PDF download failed: ${pdfResponse.status} ${pdfResponse.statusText}`);
          return res.status(500).json({ ok: false, message: `PDF 다운로드 실패: ${pdfResponse.status}` });
        }
        const arrayBuffer = await pdfResponse.arrayBuffer();
        pdfBuffer = Buffer.from(arrayBuffer);
        console.log(`[send-pdf] PDF downloaded successfully, size: ${pdfBuffer.length} bytes`);
      } catch (downloadError) {
        console.error("[send-pdf] PDF download error:", downloadError);
        return res.status(500).json({ ok: false, message: "PDF 파일을 다운로드할 수 없습니다" });
      }

      // Setup Nodemailer transporter
      const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: parseInt(SMTP_PORT, 10),
        secure: parseInt(SMTP_PORT, 10) === 465, // true for 465, false for other ports
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS,
        },
      });

      // Send email with PDF attachment
      console.log(`[send-pdf] Sending email to: ${to}`);
      try {
        const info = await transporter.sendMail({
          from: `FLOXN <${SMTP_USER}>`,
          to: to,
          subject: "PDF 파일 전송",
          text: "첨부된 PDF 파일을 확인해주세요.",
          attachments: [
            {
              filename: "document.pdf",
              content: pdfBuffer,
              contentType: "application/pdf",
            },
          ],
        });

        console.log(`[send-pdf] Email sent successfully: ${info.messageId}`);
        return res.json({ ok: true });
      } catch (sendError) {
        console.error("[send-pdf] Email send error:", sendError);
        return res.status(500).json({ ok: false, message: `이메일 전송 실패: ${(sendError as Error).message}` });
      }
    } catch (error) {
      console.error("[send-pdf] Unexpected error:", error);
      return res.status(500).json({ ok: false, message: `서버 오류: ${(error as Error).message}` });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
