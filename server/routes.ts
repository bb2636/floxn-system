import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { loginSchema, updatePasswordSchema, deleteAccountSchema, createAccountSchema, insertCaseSchema, insertCaseRequestSchema, insertProgressUpdateSchema, insertRolePermissionSchema, insertExcelDataSchema, insertInquirySchema, updateInquirySchema, respondInquirySchema, insertDrawingSchema, insertCaseDocumentSchema, insertMasterDataSchema, insertLaborCostSchema, reviewCaseSchema } from "@shared/schema";
import { z } from "zod";

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

  // Create case endpoint
  app.post("/api/cases", async (req, res) => {
    // Check authentication
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    try {
      // Validate request body with Zod (without createdBy)
      const validatedData = insertCaseRequestSchema.parse(req.body);
      
      // Generate case number
      const timestamp = Date.now();
      const caseNumber = `CLM-${timestamp}`;

      // Create new case with createdBy from session
      const newCase = await storage.createCase({
        ...validatedData,
        caseNumber,
        createdBy: req.session.userId,
      });

      res.status(201).json({ success: true, case: newCase });
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

  // Update case status endpoint (admin only)
  app.patch("/api/cases/:caseId/status", async (req, res) => {
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
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ error: "상태 값이 필요합니다" });
      }

      // 허용된 상태값 검증
      const ALLOWED_STATUSES = [
        "접수중", "접수완료", "현장방문", "현장정보 입력", "검토중", "반려",
        "1차승인", "발송", "복구요청", "직접복구", "미복구", "청구자료제출",
        "출동비 청구", "청구", "입금완료", "일부입금", "정산완료", "접수취소"
      ];

      if (!ALLOWED_STATUSES.includes(status)) {
        return res.status(400).json({ error: `허용되지 않은 상태값입니다: ${status}` });
      }

      // storage.updateCaseStatus에서 미복구→출동비 청구 정규화 처리
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

  // Update case field survey endpoint (협력사 only)
  app.patch("/api/cases/:caseId/field-survey", async (req, res) => {
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

      res.json({ success: true, case: updatedCase });
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
      if (type !== "노무비" && type !== "자재비") {
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
      if (type !== "노무비" && type !== "자재비") {
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
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    if (req.session.userRole !== "관리자") {
      return res.status(403).json({ error: "관리자 권한이 필요합니다" });
    }

    try {
      const validatedData = insertExcelDataSchema.parse(req.body);
      const result = await storage.saveExcelData(validatedData);
      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      // Handle unique constraint violation (Postgres error code 23505)
      if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
        return res.status(409).json({ 
          error: "동일한 제목의 데이터가 이미 존재합니다. 다른 제목을 사용해주세요." 
        });
      }
      console.error("Save excel data error:", error);
      res.status(500).json({ error: "데이터를 저장하는 중 오류가 발생했습니다" });
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
      if (type !== "노무비" && type !== "자재비") {
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
        // Verify ownership before update
        const existing = await storage.getDrawing(drawingId);
        if (!existing) {
          return res.status(404).json({ error: "도면을 찾을 수 없습니다" });
        }
        if (existing.createdBy !== req.session.userId) {
          return res.status(403).json({ error: "권한이 없습니다" });
        }
        // Verify case match
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
          // Verify ownership before updating
          if (existing.createdBy !== req.session.userId) {
            return res.status(403).json({ error: "권한이 없습니다" });
          }
          
          // Update existing drawing (exclude immutable fields)
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

  // ===== 증빙자료 Documents API =====
  
  // Upload document(s) to a case
  app.post("/api/documents", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    try {
      const validatedData = insertCaseDocumentSchema.parse(req.body);
      const document = await storage.saveDocument(validatedData);
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
      const { rows, laborCostData, materialCostData, totalAmount } = req.body;

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
        materialCostData || null
      );
      
      // 견적 총액을 케이스에 업데이트
      if (totalAmount !== undefined && totalAmount !== null) {
        await storage.updateCase(caseId, {
          estimateAmount: totalAmount.toString(),
        });
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
  app.get("/api/master-data", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    try {
      const { category } = req.query;
      const data = await storage.getMasterData(category as string | undefined);
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
      const { value, displayOrder, isActive } = req.body;

      const updated = await storage.updateMasterData(id, {
        value,
        displayOrder,
        isActive,
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

      // Parse excel data into structured catalog
      // Actual columns: 공종, 공사명(품명), 세부공사, 세부항목, 인, 천장, 벽체, 바닥, 길이, ...
      const catalog: any[] = [];
      let prevCategory: string | null = null;
      let prevWorkName: string | null = null;
      let prevDetailWork: string | null = null;

      // Start from index 0 - NO header row in this data
      for (let i = 0; i < excelData.data.length; i++) {
        const row = excelData.data[i];
        if (!row || row.length === 0) continue;

        // Extract and forward-fill merged cells (handle both null and empty string)
        const category: string = (row[0] && row[0].trim()) ? row[0].trim() : prevCategory;
        const workName: string = (row[1] && row[1].trim()) ? row[1].trim() : prevWorkName;
        const detailWork: string = (row[2] && row[2].trim()) ? row[2].trim() : prevDetailWork;
        const detailItem: string = (row[3] && row[3].trim()) ? row[3].trim() : '';
        
        // Parse price columns (remove commas, convert to number)
        const parsePrice = (val: any): number | null => {
          if (val === null || val === undefined || val === '') return null;
          if (typeof val === 'number') return val;
          const cleaned = String(val).replace(/,/g, '').trim();
          const num = parseFloat(cleaned);
          return isNaN(num) ? null : num;
        };

        const laborPrice = parsePrice(row[4]); // 인
        const ceilingPrice = parsePrice(row[5]); // 천장
        const wallPrice = parsePrice(row[6]); // 벽체
        const floorPrice = parsePrice(row[7]); // 바닥
        const lengthPrice = parsePrice(row[8]); // 길이

        // Update forward-fill values
        if (category) prevCategory = category;
        if (workName) prevWorkName = workName;
        if (detailWork) prevDetailWork = detailWork;

        // Skip rows without enough data
        if (!category || !workName || !detailWork) continue;

        // Determine unit based on detailWork (세부공사)
        // For 노무비, unit is '인', otherwise use '㎡' or 'm' as default
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
      }

      res.json(catalog);
    } catch (error) {
      console.error("Get labor catalog error:", error);
      res.status(500).json({ error: "노무비 카탈로그를 조회하는 중 오류가 발생했습니다" });
    }
  });

  // Materials (자재비) endpoints
  // Get parsed materials data from excel_data (all authenticated users)
  app.get("/api/materials", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    try {
      // Get latest 자재비 data from excel_data table
      const excelData = await storage.getExcelData('자재비');
      
      if (!excelData || !excelData.data) {
        return res.json([]);
      }

      // Parse excel data into structured material list
      const materials: any[] = [];
      let currentMaterialName: string | null = null;

      for (const row of excelData.data as any[][]) {
        const [materialName, specification, unit, price] = row;
        
        // Skip empty rows or info messages
        if (!specification && !unit && !price) continue;
        
        // New material starts when materialName is not null
        if (materialName !== null && materialName !== undefined && materialName !== '') {
          currentMaterialName = materialName;
        }
        
        // Add material row
        if (currentMaterialName && specification && unit) {
          // Normalize standardPrice to number
          let normalizedPrice: number;
          if (typeof price === 'string') {
            // Strip commas and whitespace before parsing
            const cleanedPrice = price.replace(/,/g, '').trim();
            
            // Check if it's "입력" or other non-numeric string
            if (cleanedPrice === '입력' || isNaN(Number(cleanedPrice))) {
              normalizedPrice = 0; // Default to 0 for manual input fields
            } else {
              normalizedPrice = Number(cleanedPrice);
            }
          } else {
            normalizedPrice = price || 0;
          }
          
          materials.push({
            id: `${currentMaterialName}-${specification}-${unit}`,
            materialName: currentMaterialName,
            specification: specification,
            unit: unit,
            standardPrice: normalizedPrice,
          });
        }
      }

      res.json(materials);
    } catch (error) {
      console.error("Get materials error:", error);
      res.status(500).json({ error: "자재비를 조회하는 중 오류가 발생했습니다" });
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
      
      // Calculate statistics from filtered cases
      const stats = {
        // 접수건: 총 케이스 수
        receivedCases: filteredCases.length,
        
        // 미결건: status가 "접수", "조사중", "견적중" 등 완료가 아닌 케이스
        pendingCases: filteredCases.filter(c => c.status !== "완료").length,
        
        // 보험사 미정산: insuranceSettlementStatus가 "미정산"인 케이스
        insuranceUnsettledCases: filteredCases.filter(c => c.insuranceSettlementStatus === "미정산").length,
        insuranceUnsettledAmount: filteredCases
          .filter(c => c.insuranceSettlementStatus === "미정산")
          .reduce((sum, c) => sum + (c.insuranceSettlementAmount || 0), 0),
        
        // 협력사 미정산: partnerSettlementStatus가 "미정산"인 케이스
        partnerUnsettledCases: filteredCases.filter(c => c.partnerSettlementStatus === "미정산").length,
        partnerUnsettledAmount: filteredCases
          .filter(c => c.partnerSettlementStatus === "미정산")
          .reduce((sum, c) => sum + (c.partnerSettlementAmount || 0), 0),
      };
      
      res.json(stats);
    } catch (error) {
      console.error("Get dashboard stats error:", error);
      res.status(500).json({ error: "통계를 조회하는 중 오류가 발생했습니다" });
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

  const httpServer = createServer(app);

  return httpServer;
}
