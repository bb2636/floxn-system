import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, json, unique } from "drizzle-orm/pg-core";
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
  status: text("status").notNull().default("작성중"),
  
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
  
  // 피해자 정보
  victimName: text("victim_name"),
  victimContact: text("victim_contact"),
  
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
  specialNotes: text("special_notes"), // 관리자 특이사항 메모
  
  // 일정 관련 필드
  assignmentDate: text("assignment_date"), // 배당일
  siteVisitDate: text("site_visit_date"), // 현장방문당일 배당
  fieldSurveyDate: text("field_survey_date"), // 현장조사당일 배당
  firstInspectionDate: text("first_inspection_date"), // 1차 실사일 (심사)
  approvalCompletionDate: text("approval_completion_date"), // 승인완성일정
  totalWorkDate: text("total_work_date"), // 총공일
  contractorReportDate: text("contractor_report_date"), // 공사업체보고 배당
  contractorRepairDate: text("contractor_repair_date"), // 공사업체보수 배당
  completionDate: text("completion_date"), // 완공일
  
  assignedTo: varchar("assigned_to").references(() => users.id),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const CASE_STATUSES = ["작성중", "제출", "검토중", "완료"] as const;
export type CaseStatus = typeof CASE_STATUSES[number];

export const insertCaseSchema = createInsertSchema(cases).omit({
  id: true,
  caseNumber: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  status: z.enum(CASE_STATUSES).default("작성중"),
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
