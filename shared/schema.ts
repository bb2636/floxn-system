import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, serial, timestamp, json, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("사원"),
  name: text("name").notNull(),
  company: text("company").notNull(),
  department: text("department"),
  position: text("position"),
  email: text("email"),
  phone: text("phone"),
  office: text("office"),
  address: text("address"),
  // Partner-specific fields
  bankName: text("bank_name"),
  accountNumber: text("account_number"),
  accountHolder: text("account_holder"),
  serviceRegions: text("service_regions").array(),
  attachments: text("attachments").array(),
  status: text("status").notNull().default("active"), // "active" | "deleted"
  createdAt: text("created_at").notNull(),
});

export const VALID_ROLES = ["심사사", "조사사", "보험사", "협력사", "의뢰사", "관리자"] as const;
export type UserRole = typeof VALID_ROLES[number];

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
}).extend({
  role: z.enum(VALID_ROLES).default("보험사"),
});

export const loginSchema = z.object({
  username: z.string().min(1, "아이디를 입력해주세요"),
  password: z.string().min(1, "비밀번호를 입력해주세요"),
  rememberMe: z.boolean().default(false),
});

export const updatePasswordSchema = z.object({
  username: z.string().min(1, "사용자 이름이 필요합니다"),
  newPassword: z.string().min(1, "새 비밀번호가 필요합니다"),
});

export const deleteAccountSchema = z.object({
  username: z.string().min(1, "사용자 이름이 필요합니다"),
});

export const createAccountSchema = z.object({
  username: z.string().min(3, "아이디는 3자 이상이어야 합니다"),
  password: z.string().min(4, "비밀번호는 4자 이상이어야 합니다"),
  role: z.enum(VALID_ROLES),
  name: z.string().min(1, "이름을 입력해주세요"),
  company: z.string().min(1, "회사명을 입력해주세요"),
  department: z.string().optional(),
  position: z.string().optional(),
  email: z.string().email("올바른 이메일 주소를 입력해주세요").optional().or(z.literal("")),
  phone: z.string().optional(),
  office: z.string().optional(),
  address: z.string().optional(),
  // Partner-specific fields
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  accountHolder: z.string().optional(),
  serviceRegions: z.array(z.string()).optional(),
  attachments: z.array(z.string()).optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
export type CreateAccountInput = z.infer<typeof createAccountSchema>;

export const cases = pgTable("cases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caseNumber: text("case_number").notNull().unique(),
  status: text("status").notNull().default("접수중"),
  recoveryType: text("recovery_type"), // 복구 타입: "직접복구" | "미복구" | null
  
  // 기본 정보
  accidentDate: text("accident_date"),
  
  // 보험 정보
  insuranceCompany: text("insurance_company"),
  insurancePolicyNo: text("insurance_policy_no"),
  insuranceAccidentNo: text("insurance_accident_no"),
  
  // 의뢰자 정보
  clientResidence: text("client_residence"),
  clientDepartment: text("client_department"),
  clientName: text("client_name"),
  clientContact: text("client_contact"),
  
  // 심사자 정보
  assessorId: text("assessor_id"), // 심사사 회사명
  assessorDepartment: text("assessor_department"),
  assessorTeam: text("assessor_team"),
  assessorContact: text("assessor_contact"),
  
  // 조사자 정보
  investigatorTeam: text("investigator_team"),
  investigatorDepartment: text("investigator_department"),
  investigatorTeamName: text("investigator_team_name"),
  investigatorContact: text("investigator_contact"),
  
  // 피보험자 및 피해자 정보
  // 보험계약자 정보
  policyHolderName: text("policy_holder_name"),
  policyHolderIdNumber: text("policy_holder_id_number"),
  policyHolderAddress: text("policy_holder_address"),
  
  // 피보험자 정보
  insuredName: text("insured_name"),
  insuredIdNumber: text("insured_id_number"),
  insuredContact: text("insured_contact"),
  insuredAddress: text("insured_address"),
  sameAsPolicyHolder: text("same_as_policy_holder"), // "true" | "false" | null
  
  // 피해자 정보
  victimName: text("victim_name"),
  victimContact: text("victim_contact"),
  victimAddress: text("victim_address"),
  additionalVictims: text("additional_victims"), // JSON string of additional victims array
  
  // 현장조사 정보
  visitDate: text("visit_date"), // 방문 일시 (날짜)
  visitTime: text("visit_time"), // 방문 일시 (시간)
  accompaniedPerson: text("accompanied_person"), // 출동담당자
  travelDistance: text("travel_distance"), // 현장 이동 거리
  dispatchLocation: text("dispatch_location"), // 출동 업장지
  accidentTime: text("accident_time"), // 사고 발생 시각
  accidentCategory: text("accident_category"), // 사고 원인 카테고리 (배관, 교체, 방수, 기타)
  processingTypes: text("processing_types"), // 처리 유형 (JSON array)
  processingTypeOther: text("processing_type_other"), // 기타 처리 유형
  recoveryMethodType: text("recovery_method_type"), // 복구 방식 (부분수리, 전체수리)
  fieldSurveyStatus: text("field_survey_status").default("draft"), // 현장조사 상태 (draft/submitted)
  
  // 기타 (기존 필드)
  clientPhone: text("client_phone"),
  clientAddress: text("client_address"),
  accidentLocation: text("accident_location"),
  accidentDescription: text("accident_description"),
  
  // 사고 및 복구 정보
  accidentType: text("accident_type"), // 사고 유형
  accidentCause: text("accident_cause"), // 사고 원인
  restorationMethod: text("restoration_method"), // 복구 방식 (없음, 플랫폼 복구, 선견적요청)
  otherVendorEstimate: text("other_vendor_estimate"), // 타 업체 견적
  
  // 피해 사항 (JSON으로 저장)
  damageItems: text("damage_items"), // JSON string of damage items array
  
  // 배당사항
  assignedPartner: text("assigned_partner"), // 협력사명
  assignedPartnerManager: text("assigned_partner_manager"), // 담당자명
  assignedPartnerContact: text("assigned_partner_contact"), // 담당자 연락처
  urgency: text("urgency"), // 긴급도
  specialRequests: text("special_requests"), // 특이사항 및 요청사항
  
  // 진행상황 관련 필드
  progressStatus: text("progress_status"), // 주요진행사항 (서류보완요청 등)
  specialNotes: text("special_notes"), // 협력사 특이사항 메모
  specialNotesConfirmedBy: varchar("special_notes_confirmed_by").references(() => users.id), // 관리자 확인자 ID
  additionalNotes: text("additional_notes"), // 협력사 기타사항 (800자 제한)
  
  // 일정 관련 필드
  receptionDate: text("reception_date"), // 접수일
  inspectionDate: text("inspection_date"), // 검수일
  assignmentDate: text("assignment_date"), // 배당일
  siteVisitDate: text("site_visit_date"), // 현장방문일
  fieldSurveyDate: text("field_survey_date"), // 현장조사당일 배당
  siteInvestigationSubmitDate: text("site_investigation_submit_date"), // 현장조사 제출일
  firstInspectionDate: text("first_inspection_date"), // 1차 실사일 (심사)
  firstInvoiceDate: text("first_invoice_date"), // 1차 송장일 (내부)
  approvalRequestDate: text("approval_request_date"), // 승인요청일
  approvalDate: text("approval_date"), // 승인일(공사 시작일)
  approvalCompletionDate: text("approval_completion_date"), // 승인완성일정
  constructionStartDate: text("construction_start_date"), // 공사시작일
  constructionCompletionDate: text("construction_completion_date"), // 공사완료일
  constructionReportSubmitDate: text("construction_report_submit_date"), // 공사완료보고 제출일
  totalWorkDate: text("total_work_date"), // 총공일
  contractorReportDate: text("contractor_report_date"), // 공사업체보고 배당
  contractorRepairDate: text("contractor_repair_date"), // 공사업체보수 배당
  completionDate: text("completion_date"), // 완공일
  claimDate: text("claim_date"), // 청구일
  
  // 심사 관련 필드
  reviewDecision: text("review_decision"), // 심사결과: "승인" | "비승인" | null
  reviewComment: text("review_comment"), // 검토 의견
  reviewedAt: text("reviewed_at"), // 심사 일시
  reviewedBy: varchar("reviewed_by").references(() => users.id), // 심사자 ID
  
  // 금액 관련 필드
  estimateAmount: text("estimate_amount"), // 견적금액 (최종 총액)
  
  assignedTo: varchar("assigned_to").references(() => users.id),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const CASE_STATUSES = [
  "접수중",        // 관리자가 현장 접수를 임시저장한 상태
  "접수완료",      // 관리자가 현장 접수를 완전히 완료한 상태
  "현장방문",      // 협력사가 방문일시만 입력하고 저장한 상태
  "현장정보 입력", // 협력사가 현장조사의 모든 항목을 완료한 상태
  "검토중",        // 현장정보가 제출된 후 플록슨 담당자가 페이지를 열어본 상태
  "반려",          // 재입력 요구 상태
  "1차승인",       // 플록슨 담당자 승인
  "발송",          // 심사자/조사자에게 발송
  "복구요청",      // 심사자/조사자가 복구 요청
  "직접복구",      // 복구 진행 선택
  "미복구",        // 선견적만 제출하고 종결
  "청구자료제출",  // 직접복구 후 청구증빙자료 제출
  "출동비 청구",   // 미복구 시 자동 전환
  "청구",          // 인보이스 발송
  "입금완료",      // 전액 입금
  "일부입금",      // 일부 입금
  "정산완료",      // 세금계산서 발행 완료
  "접수취소",      // 접수 취소 (언제든지 가능)
] as const;
export type CaseStatus = typeof CASE_STATUSES[number];

export const RECOVERY_TYPES = ["직접복구", "미복구"] as const;
export type RecoveryType = typeof RECOVERY_TYPES[number];

export const insertCaseSchema = createInsertSchema(cases).omit({
  id: true,
  caseNumber: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  status: z.enum(CASE_STATUSES).default("접수중"),
  recoveryType: z.enum(RECOVERY_TYPES).optional().nullable(),
});

export const insertCaseRequestSchema = insertCaseSchema.omit({
  createdBy: true,
});

export type InsertCase = z.infer<typeof insertCaseSchema>;
export type InsertCaseRequest = z.infer<typeof insertCaseRequestSchema>;
export type Case = typeof cases.$inferSelect;

export type CaseWithLatestProgress = Case & {
  latestProgress?: {
    content: string;
    createdAt: string;
  } | null;
};

// 진행상황 업데이트 테이블
export const progressUpdates = pgTable("progress_updates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caseId: varchar("case_id").notNull().references(() => cases.id),
  content: text("content").notNull(), // 주요 진행사항 내용
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: text("created_at").notNull(),
});

export const insertProgressUpdateSchema = createInsertSchema(progressUpdates).omit({
  id: true,
  createdAt: true,
});

export type InsertProgressUpdate = z.infer<typeof insertProgressUpdateSchema>;
export type ProgressUpdate = typeof progressUpdates.$inferSelect;

// 보고서 심사 스키마
export const reviewCaseSchema = z.object({
  decision: z.enum(["승인", "비승인"]),
  reviewComment: z.string().max(800, "검토 의견은 800자를 초과할 수 없습니다").optional().or(z.literal("")),
});

export type ReviewCaseInput = z.infer<typeof reviewCaseSchema>;

// 역할 권한 관리 테이블
export const rolePermissions = pgTable("role_permissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roleName: text("role_name").notNull().unique(), // 역할명 (예: "보험사", "협력사", "심사사")
  permissions: text("permissions").notNull(), // JSON string: { [category]: string[] }
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const insertRolePermissionSchema = createInsertSchema(rolePermissions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateRolePermissionSchema = insertRolePermissionSchema.partial().extend({
  roleName: z.string().min(1, "역할명을 입력해주세요"),
});

export type InsertRolePermission = z.infer<typeof insertRolePermissionSchema>;
export type UpdateRolePermission = z.infer<typeof updateRolePermissionSchema>;
export type RolePermission = typeof rolePermissions.$inferSelect;

// 권한 카테고리 및 항목 정의
export const PERMISSION_CATEGORIES = {
  "홈": [],
  "새로운접수": [],
  "현장조사": ["현장입력", "도면작성", "증빙자료 업로드", "견적서 작성", "보고서 작성"],
  "종합진행관리": [],
  "통계 및 정산": ["통계", "정산조회", "정산하기"],
  "관리자 설정": ["계정관리", "DB관리", "기준정보 관리", "접근권한관리"],
} as const;

// 엑셀 데이터 저장 테이블 (노무비/자재비)
export const excelData = pgTable("excel_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // "노무비" | "자재비"
  title: text("title").notNull(), // "2025-09-01 전국 - 정부노임단가"
  headers: json("headers").$type<string[]>().notNull(),
  data: json("data").$type<any[][]>().notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  typeTitleUnique: unique("type_title_unique").on(table.type, table.title),
}));

export const insertExcelDataSchema = createInsertSchema(excelData).omit({
  id: true,
  uploadedAt: true,
  updatedAt: true,
});

export type InsertExcelData = z.infer<typeof insertExcelDataSchema>;
export type ExcelData = typeof excelData.$inferSelect;

// 1:1 문의 테이블
export const inquiries = pgTable("inquiries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  content: text("content").notNull(),
  status: text("status").notNull().default("대기"), // "대기" | "완료"
  responseTitle: text("response_title"),
  response: text("response"),
  respondedBy: varchar("responded_by").references(() => users.id),
  respondedAt: timestamp("responded_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertInquirySchema = createInsertSchema(inquiries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateInquirySchema = insertInquirySchema.partial().extend({
  id: z.string(),
});

export const respondInquirySchema = z.object({
  responseTitle: z.string().min(1, "답변 제목을 입력해주세요"),
  response: z.string().min(1, "답변 내용을 입력해주세요"),
});

export type InsertInquiry = z.infer<typeof insertInquirySchema>;
export type UpdateInquiry = z.infer<typeof updateInquirySchema>;
export type RespondInquiry = z.infer<typeof respondInquirySchema>;
export type Inquiry = typeof inquiries.$inferSelect;

// 도면 저장 테이블
export const drawings = pgTable("drawings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caseId: varchar("case_id").notNull(), // required: drawing must be linked to case
  uploadedImages: json("uploaded_images").$type<{
    id: string;
    src: string;
    x: number;
    y: number;
    width: number;
    height: number;
    locked: boolean;
  }[]>().notNull().default(sql`'[]'`),
  rectangles: json("rectangles").$type<{
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    text: string;
    locked: boolean;
  }[]>().notNull().default(sql`'[]'`),
  accidentAreas: json("accident_areas").$type<{
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    locked: boolean;
  }[]>().notNull().default(sql`'[]'`),
  leakMarkers: json("leak_markers").$type<{
    id: string;
    x: number;
    y: number;
  }[]>().notNull().default(sql`'[]'`),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDrawingSchema = createInsertSchema(drawings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDrawing = z.infer<typeof insertDrawingSchema>;
export type Drawing = typeof drawings.$inferSelect;

// 증빙자료 문서 테이블
export const caseDocuments = pgTable("case_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caseId: varchar("case_id").notNull().references(() => cases.id),
  category: text("category").notNull(), // "전체", "현장", "수리중", "복구완료", "청구", "개인정보"
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size").notNull(),
  fileData: text("file_data").notNull(), // Base64 encoded file data
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const DOCUMENT_CATEGORIES = ["현장", "수리중", "복구완료", "청구", "개인정보"] as const;
export type DocumentCategory = typeof DOCUMENT_CATEGORIES[number];

export const insertCaseDocumentSchema = createInsertSchema(caseDocuments).omit({
  id: true,
  createdAt: true,
});

export type InsertCaseDocument = z.infer<typeof insertCaseDocumentSchema>;
export type CaseDocument = typeof caseDocuments.$inferSelect;

// 마스터 데이터 테이블 (관리자 기준정보관리용)
export const masterData = pgTable("master_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  category: text("category").notNull(), // "room_category" | "location" | "work_name"
  value: text("value").notNull(), // 실제 표시 값
  isActive: text("is_active").notNull().default("true"), // "true" | "false"
  displayOrder: integer("display_order").notNull().default(0), // 표시 순서
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  // unique constraint: 같은 카테고리에서 같은 값 중복 방지
  unq: unique().on(table.category, table.value),
}));

export const MASTER_DATA_CATEGORIES = ["room_category", "location", "work_name"] as const;
export type MasterDataCategory = typeof MASTER_DATA_CATEGORIES[number];

export const insertMasterDataSchema = createInsertSchema(masterData).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMasterData = z.infer<typeof insertMasterDataSchema>;
export type MasterData = typeof masterData.$inferSelect;

// 견적서 테이블 (부모 테이블)
export const estimates = pgTable("estimates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caseId: varchar("case_id").notNull().references(() => cases.id),
  version: integer("version").notNull().default(1), // 버전 관리
  status: text("status").notNull().default("draft"), // "draft" | "submitted" | "approved"
  createdBy: varchar("created_by").notNull().references(() => users.id),
  laborCostData: json("labor_cost_data"), // 노무비 데이터 (JSON)
  materialCostData: json("material_cost_data"), // 자재비 데이터 (JSON)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  // unique constraint: 케이스당 버전별로 하나만 허용
  unq: unique().on(table.caseId, table.version),
}));

// 복구면적 산출표 행 테이블 (자식 테이블)
export const estimateRows = pgTable("estimate_rows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  estimateId: varchar("estimate_id").notNull().references(() => estimates.id),
  category: text("category").notNull(), // 항소: 주방, 화장실, 방안, 거실상
  location: text("location"), // 위치
  workName: text("work_name"), // 공사명
  damageWidth: integer("damage_width"), // 피해면적 가로 (mm)
  damageHeight: integer("damage_height"), // 피해면적 세로 (mm)
  damageArea: integer("damage_area"), // 피해면적 면적 (mm²) - 계산된 값
  repairWidth: integer("repair_width"), // 복구면적 가로 (mm)
  repairHeight: integer("repair_height"), // 복구면적 세로 (mm)
  repairArea: integer("repair_area"), // 복구면적 면적 (mm²) - 계산된 값
  note: text("note"), // 비고
  rowOrder: integer("row_order").notNull(), // 행 순서
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  // unique constraint: 각 견적 내에서 행 순서는 중복되지 않음
  unqOrder: unique().on(table.estimateId, table.rowOrder),
}));

export const insertEstimateSchema = createInsertSchema(estimates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEstimateRowSchema = createInsertSchema(estimateRows).omit({
  id: true,
  createdAt: true,
});

export type InsertEstimate = z.infer<typeof insertEstimateSchema>;
export type Estimate = typeof estimates.$inferSelect;
export type InsertEstimateRow = z.infer<typeof insertEstimateRowSchema>;
export type EstimateRow = typeof estimateRows.$inferSelect;

// 노무비 마스터 테이블
export const laborCosts = pgTable("labor_costs", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(), // 공종: 가구공사, 도배공사 등
  workName: text("work_name").notNull(), // 공사명: 고정, 철거 등
  detailWork: text("detail_work").notNull(), // 세부공사: 실리콘, 타일 등
  detailItem: text("detail_item"), // 세부항목: 선택적
  priceStandard: text("price_standard").notNull(), // 단가기준: 인, 일, 시간 등
  unit: text("unit").notNull(), // 단위: 일, 시간, ㎡ 등
  standardPrice: integer("standard_price").notNull(), // 기준가(원)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertLaborCostSchema = createInsertSchema(laborCosts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLaborCost = z.infer<typeof insertLaborCostSchema>;
export type LaborCost = typeof laborCosts.$inferSelect;

// 사용자 즐겨찾기 테이블
export const userFavorites = pgTable("user_favorites", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  menuName: text("menu_name").notNull(), // 메뉴 이름 (홈, 접수하기, 현장조사, 종합진행관리, 통계 및 정산, 관리자 설정)
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  // 한 사용자가 같은 메뉴를 중복으로 즐겨찾기 할 수 없도록
  unq: unique().on(table.userId, table.menuName),
}));

export const MENU_ITEMS = ["홈", "접수하기", "현장조사", "종합진행관리", "통계 및 정산", "관리자 설정"] as const;

export const insertUserFavoriteSchema = createInsertSchema(userFavorites).omit({
  id: true,
  createdAt: true,
}).extend({
  menuName: z.enum(MENU_ITEMS),
});

export type UserFavorite = typeof userFavorites.$inferSelect;
export type InsertUserFavorite = z.infer<typeof insertUserFavoriteSchema>;

// 공지사항 테이블
export const notices = pgTable("notices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  content: text("content").notNull(),
  authorId: varchar("author_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertNoticeSchema = createInsertSchema(notices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Notice = typeof notices.$inferSelect;
export type InsertNotice = z.infer<typeof insertNoticeSchema>;
