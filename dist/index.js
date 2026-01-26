var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express2 from "express";
import session from "express-session";
import createMemoryStore from "memorystore";

// server/routes.ts
import { createServer } from "http";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  CASE_STATUSES: () => CASE_STATUSES,
  DEFAULT_LABOR_RATE_TIERS: () => DEFAULT_LABOR_RATE_TIERS,
  DOCUMENT_CATEGORIES: () => DOCUMENT_CATEGORIES,
  INVOICE_STATUSES: () => INVOICE_STATUSES,
  INVOICE_TYPES: () => INVOICE_TYPES,
  MASTER_DATA_CATEGORIES: () => MASTER_DATA_CATEGORIES,
  MENU_ITEMS: () => MENU_ITEMS,
  PERMISSION_CATEGORIES: () => PERMISSION_CATEGORIES,
  RECOVERY_TYPES: () => RECOVERY_TYPES,
  VALID_ROLES: () => VALID_ROLES,
  approveReportSchema: () => approveReportSchema,
  caseChangeLogs: () => caseChangeLogs,
  caseDocuments: () => caseDocuments,
  cases: () => cases,
  changeMyPasswordSchema: () => changeMyPasswordSchema,
  conversations: () => conversations,
  createAccountSchema: () => createAccountSchema,
  deleteAccountSchema: () => deleteAccountSchema,
  drawings: () => drawings,
  estimateRows: () => estimateRows,
  estimates: () => estimates,
  excelData: () => excelData,
  fieldSurveyData: () => fieldSurveyData,
  inquiries: () => inquiries,
  insertCaseChangeLogSchema: () => insertCaseChangeLogSchema,
  insertCaseDocumentSchema: () => insertCaseDocumentSchema,
  insertCaseRequestSchema: () => insertCaseRequestSchema,
  insertCaseSchema: () => insertCaseSchema,
  insertConversationSchema: () => insertConversationSchema,
  insertDrawingSchema: () => insertDrawingSchema,
  insertEstimateRowSchema: () => insertEstimateRowSchema,
  insertEstimateSchema: () => insertEstimateSchema,
  insertExcelDataSchema: () => insertExcelDataSchema,
  insertFieldSurveyDataSchema: () => insertFieldSurveyDataSchema,
  insertInquirySchema: () => insertInquirySchema,
  insertInvoiceSchema: () => insertInvoiceSchema,
  insertLaborCostSchema: () => insertLaborCostSchema,
  insertLaborRateTierSchema: () => insertLaborRateTierSchema,
  insertMasterDataSchema: () => insertMasterDataSchema,
  insertMaterialSchema: () => insertMaterialSchema,
  insertMessageSchema: () => insertMessageSchema,
  insertNoticeSchema: () => insertNoticeSchema,
  insertProgressUpdateSchema: () => insertProgressUpdateSchema,
  insertRolePermissionSchema: () => insertRolePermissionSchema,
  insertSettlementSchema: () => insertSettlementSchema,
  insertSharedDrawingSchema: () => insertSharedDrawingSchema,
  insertUnitPriceOverrideSchema: () => insertUnitPriceOverrideSchema,
  insertUserFavoriteSchema: () => insertUserFavoriteSchema,
  insertUserSchema: () => insertUserSchema,
  invoices: () => invoices,
  laborCosts: () => laborCosts,
  laborRateTiers: () => laborRateTiers,
  loginSchema: () => loginSchema,
  masterData: () => masterData,
  materials: () => materials,
  messages: () => messages,
  notices: () => notices,
  progressUpdates: () => progressUpdates,
  respondInquirySchema: () => respondInquirySchema,
  reviewCaseSchema: () => reviewCaseSchema,
  rolePermissions: () => rolePermissions,
  settlements: () => settlements,
  sharedDrawings: () => sharedDrawings,
  unitPriceOverrides: () => unitPriceOverrides,
  updateInquirySchema: () => updateInquirySchema,
  updateLaborRateTierSchema: () => updateLaborRateTierSchema,
  updateLaborRateTiersSchema: () => updateLaborRateTiersSchema,
  updatePasswordSchema: () => updatePasswordSchema,
  updateRolePermissionSchema: () => updateRolePermissionSchema,
  updateUserSchema: () => updateUserSchema,
  userFavorites: () => userFavorites,
  users: () => users
});
import { sql as sql2 } from "drizzle-orm";
import { pgTable as pgTable2, text as text2, varchar, integer as integer2, bigint, serial as serial2, timestamp as timestamp2, json, unique } from "drizzle-orm/pg-core";
import { createInsertSchema as createInsertSchema2 } from "drizzle-zod";
import { z } from "zod";

// shared/models/chat.ts
import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { sql } from "drizzle-orm";
var conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull()
});
var messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull()
});
var insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true
});
var insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true
});

// shared/schema.ts
var users = pgTable2("users", {
  id: varchar("id").primaryKey().default(sql2`gen_random_uuid()`),
  username: text2("username").notNull().unique(),
  password: text2("password").notNull(),
  role: text2("role").notNull().default("\uC0AC\uC6D0"),
  name: text2("name").notNull(),
  company: text2("company").notNull(),
  department: text2("department"),
  position: text2("position"),
  email: text2("email"),
  phone: text2("phone"),
  office: text2("office"),
  address: text2("address"),
  // Partner-specific fields
  businessRegistrationNumber: text2("business_registration_number"),
  // 사업자 등록번호
  representativeName: text2("representative_name"),
  // 대표자 명
  bankName: text2("bank_name"),
  accountNumber: text2("account_number"),
  accountHolder: text2("account_holder"),
  serviceRegions: text2("service_regions").array(),
  attachments: text2("attachments").array(),
  status: text2("status").notNull().default("active"),
  // "active" | "deleted"
  createdAt: text2("created_at").notNull()
});
var VALID_ROLES = ["\uC2EC\uC0AC\uC0AC", "\uC870\uC0AC\uC0AC", "\uBCF4\uD5D8\uC0AC", "\uD611\uB825\uC0AC", "\uAD00\uB9AC\uC790"];
var insertUserSchema = createInsertSchema2(users).omit({
  id: true,
  createdAt: true
}).extend({
  role: z.enum(VALID_ROLES).default("\uBCF4\uD5D8\uC0AC")
});
var loginSchema = z.object({
  username: z.string().min(1, "\uC544\uC774\uB514\uB97C \uC785\uB825\uD574\uC8FC\uC138\uC694"),
  password: z.string().min(1, "\uBE44\uBC00\uBC88\uD638\uB97C \uC785\uB825\uD574\uC8FC\uC138\uC694"),
  rememberMe: z.boolean().default(false)
});
var updatePasswordSchema = z.object({
  username: z.string().min(1, "\uC0AC\uC6A9\uC790 \uC774\uB984\uC774 \uD544\uC694\uD569\uB2C8\uB2E4"),
  newPassword: z.string().min(1, "\uC0C8 \uBE44\uBC00\uBC88\uD638\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4")
});
var changeMyPasswordSchema = z.object({
  currentPassword: z.string().min(1, "\uD604\uC7AC \uBE44\uBC00\uBC88\uD638\uB97C \uC785\uB825\uD574\uC8FC\uC138\uC694"),
  newPassword: z.string().min(8, "\uBE44\uBC00\uBC88\uD638\uB294 8\uC790 \uC774\uC0C1\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4").regex(/[A-Za-z]/, "\uBE44\uBC00\uBC88\uD638\uC5D0 \uC601\uBB38\uC790\uAC00 \uD3EC\uD568\uB418\uC5B4\uC57C \uD569\uB2C8\uB2E4").regex(/[0-9]/, "\uBE44\uBC00\uBC88\uD638\uC5D0 \uC22B\uC790\uAC00 \uD3EC\uD568\uB418\uC5B4\uC57C \uD569\uB2C8\uB2E4"),
  confirmPassword: z.string().min(1, "\uBE44\uBC00\uBC88\uD638 \uD655\uC778\uC744 \uC785\uB825\uD574\uC8FC\uC138\uC694")
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "\uC0C8 \uBE44\uBC00\uBC88\uD638\uAC00 \uC77C\uCE58\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4",
  path: ["confirmPassword"]
});
var deleteAccountSchema = z.object({
  username: z.string().min(1, "\uC0AC\uC6A9\uC790 \uC774\uB984\uC774 \uD544\uC694\uD569\uB2C8\uB2E4")
});
var createAccountSchema = z.object({
  username: z.string().min(3, "\uC544\uC774\uB514\uB294 3\uC790 \uC774\uC0C1\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4"),
  password: z.string().min(4, "\uBE44\uBC00\uBC88\uD638\uB294 4\uC790 \uC774\uC0C1\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4"),
  role: z.enum(VALID_ROLES),
  name: z.string().min(1, "\uC774\uB984\uC744 \uC785\uB825\uD574\uC8FC\uC138\uC694"),
  company: z.string().min(1, "\uD68C\uC0AC\uBA85\uC744 \uC785\uB825\uD574\uC8FC\uC138\uC694"),
  department: z.string().optional(),
  position: z.string().optional(),
  email: z.string().email("\uC62C\uBC14\uB978 \uC774\uBA54\uC77C \uC8FC\uC18C\uB97C \uC785\uB825\uD574\uC8FC\uC138\uC694").optional().or(z.literal("")),
  phone: z.string().optional(),
  office: z.string().optional(),
  address: z.string().optional(),
  // Partner-specific fields
  businessRegistrationNumber: z.string().optional(),
  representativeName: z.string().optional(),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  accountHolder: z.string().optional(),
  serviceRegions: z.array(z.string()).optional(),
  attachments: z.array(z.string()).optional()
});
var updateUserSchema = z.object({
  name: z.string().min(1, "\uC774\uB984\uC744 \uC785\uB825\uD574\uC8FC\uC138\uC694").optional(),
  role: z.enum(VALID_ROLES).optional(),
  department: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
  email: z.string().email("\uC62C\uBC14\uB978 \uC774\uBA54\uC77C \uC8FC\uC18C\uB97C \uC785\uB825\uD574\uC8FC\uC138\uC694").optional().or(z.literal("")).nullable(),
  phone: z.string().optional().nullable(),
  office: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  // Partner-specific fields
  businessRegistrationNumber: z.string().optional().nullable(),
  representativeName: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  accountNumber: z.string().optional().nullable(),
  accountHolder: z.string().optional().nullable(),
  serviceRegions: z.array(z.string()).optional().nullable(),
  attachments: z.array(z.string()).optional().nullable()
});
var cases = pgTable2("cases", {
  id: varchar("id").primaryKey().default(sql2`gen_random_uuid()`),
  caseNumber: text2("case_number").unique(),
  caseGroupId: text2("case_group_id"),
  // 케이스 그룹 식별자 (동일 보험사고번호 내 케이스들)
  status: text2("status").notNull().default("\uBC30\uB2F9\uB300\uAE30"),
  recoveryType: text2("recovery_type"),
  // 복구 타입: "직접복구" | "선견적요청" | null
  // 담당자 정보 (관리자)
  managerId: varchar("manager_id").references(() => users.id),
  // 기본 정보
  accidentDate: text2("accident_date"),
  // 보험 정보
  insuranceCompany: text2("insurance_company"),
  insurancePolicyNo: text2("insurance_policy_no"),
  insuranceAccidentNo: text2("insurance_accident_no"),
  // 의뢰자 정보
  clientResidence: text2("client_residence"),
  clientDepartment: text2("client_department"),
  clientName: text2("client_name"),
  clientContact: text2("client_contact"),
  // 심사자 정보
  assessorId: text2("assessor_id"),
  // 심사사 회사명
  assessorDepartment: text2("assessor_department"),
  assessorTeam: text2("assessor_team"),
  assessorContact: text2("assessor_contact"),
  assessorEmail: text2("assessor_email"),
  // 심사사 이메일
  // 조사자 정보
  investigatorTeam: text2("investigator_team"),
  investigatorDepartment: text2("investigator_department"),
  investigatorTeamName: text2("investigator_team_name"),
  investigatorContact: text2("investigator_contact"),
  investigatorEmail: text2("investigator_email"),
  // 조사사 이메일
  // 피보험자 및 피해자 정보
  // 보험계약자 정보
  policyHolderName: text2("policy_holder_name"),
  policyHolderIdNumber: text2("policy_holder_id_number"),
  policyHolderAddress: text2("policy_holder_address"),
  // 피보험자 정보
  insuredName: text2("insured_name"),
  insuredIdNumber: text2("insured_id_number"),
  insuredContact: text2("insured_contact"),
  insuredAddress: text2("insured_address"),
  insuredAddressDetail: text2("insured_address_detail"),
  sameAsPolicyHolder: text2("same_as_policy_holder"),
  // "true" | "false" | null
  // 피해자 정보
  victimName: text2("victim_name"),
  victimContact: text2("victim_contact"),
  victimAddress: text2("victim_address"),
  victimAddressDetail: text2("victim_address_detail"),
  additionalVictims: text2("additional_victims"),
  // JSON string of additional victims array
  // 현장조사 정보 (향후 fieldSurveyData 테이블로 이동 예정, 현재는 호환성 유지)
  visitDate: text2("visit_date"),
  // 방문 일시 (날짜)
  visitTime: text2("visit_time"),
  // 방문 일시 (시간)
  accompaniedPerson: text2("accompanied_person"),
  // 출동담당자
  travelDistance: text2("travel_distance"),
  // 현장 이동 거리
  dispatchLocation: text2("dispatch_location"),
  // 출동 업장지
  accidentTime: text2("accident_time"),
  // 사고 발생 시각
  accidentCategory: text2("accident_category"),
  // 사고 원인 카테고리 (배관, 교체, 방수, 기타)
  processingTypes: text2("processing_types"),
  // 처리 유형 (JSON array)
  processingTypeOther: text2("processing_type_other"),
  // 기타 처리 유형
  recoveryMethodType: text2("recovery_method_type"),
  // 복구 방식 (부분수리, 전체수리)
  fieldSurveyStatus: text2("field_survey_status").default("draft"),
  // 현장조사 상태 (draft/submitted)
  // 기타 (기존 필드)
  clientPhone: text2("client_phone"),
  clientAddress: text2("client_address"),
  accidentLocation: text2("accident_location"),
  accidentDescription: text2("accident_description"),
  // 사고 및 복구 정보
  accidentType: text2("accident_type"),
  // 사고 유형
  accidentCause: text2("accident_cause"),
  // 사고 원인
  restorationMethod: text2("restoration_method"),
  // 복구 방식 (없음, 플랫폼 복구, 선견적요청)
  otherVendorEstimate: text2("other_vendor_estimate"),
  // 타 업체 견적
  // 피해 사항 (JSON으로 저장)
  damageItems: text2("damage_items"),
  // JSON string of damage items array
  // 손방 및 대물 선택
  damagePreventionCost: text2("damage_prevention_cost"),
  // "true" | "false" | null (손해방지 체크)
  victimIncidentAssistance: text2("victim_incident_assistance"),
  // "true" | "false" | null (피해세대복구 체크)
  // 배당사항
  assignedPartner: text2("assigned_partner"),
  // 협력사명
  assignedPartnerManager: text2("assigned_partner_manager"),
  // 담당자명
  assignedPartnerContact: text2("assigned_partner_contact"),
  // 담당자 연락처
  urgency: text2("urgency"),
  // 긴급도
  specialRequests: text2("special_requests"),
  // 특이사항 및 요청사항
  // 진행상황 관련 필드
  progressStatus: text2("progress_status"),
  // 주요진행사항 (서류보완요청 등)
  specialNotes: text2("special_notes"),
  // 협력사 특이사항 메모 (기존 - 레거시)
  specialNotesConfirmedBy: varchar("special_notes_confirmed_by").references(() => users.id),
  // 관리자 확인자 ID
  additionalNotes: text2("additional_notes"),
  // 협력사 기타사항 (800자 제한)
  // 특이사항 히스토리 (협력사/관리자 별도 입력)
  partnerNotesHistory: text2("partner_notes_history"),
  // JSON: [{content, createdAt, createdBy}]
  adminNotesHistory: text2("admin_notes_history"),
  // JSON: [{content, createdAt, createdBy}]
  partnerNotesAckedByAdmin: text2("partner_notes_acked_by_admin"),
  // "true" when admin confirmed partner notes
  adminNotesAckedByPartner: text2("admin_notes_acked_by_partner"),
  // "true" when partner confirmed admin notes
  // 일정 관련 필드
  receptionDate: text2("reception_date"),
  // 접수일 (접수완료 된 날짜)
  inspectionDate: text2("inspection_date"),
  // 검수일
  assignmentDate: text2("assignment_date"),
  // 배당일 (접수완료되고 협력사가 배당 받은 날짜)
  siteVisitDate: text2("site_visit_date"),
  // 현장방문일 (협력사가 현장 방문일자를 입력한 날짜)
  fieldSurveyDate: text2("field_survey_date"),
  // 현장조사당일 배당
  siteInvestigationSubmitDate: text2("site_investigation_submit_date"),
  // 현장자료 제출일 (협력사가 현장출동 보고서를 제출한 날짜)
  firstInspectionDate: text2("first_inspection_date"),
  // 1차 실사일 (심사)
  firstApprovalDate: text2("first_approval_date"),
  // 1차 승인일(내부) - 플록슨 관리자가 1차 승인 한 날짜
  secondApprovalDate: text2("second_approval_date"),
  // 2차 승인일(복구 요청일) - 플록슨 관리자가 2차 승인으로 변경한 날짜
  firstInvoiceDate: text2("first_invoice_date"),
  // 1차 송장일 (내부)
  approvalRequestDate: text2("approval_request_date"),
  // 승인요청일
  approvalDate: text2("approval_date"),
  // 승인일(공사 시작일)
  approvalCompletionDate: text2("approval_completion_date"),
  // 승인완성일정
  constructionStartDate: text2("construction_start_date"),
  // 공사시작일
  constructionCompletionDate: text2("construction_completion_date"),
  // 복구완료일 (협력사가 증빙자료 제출에 청구자료를 업로드 한 날짜)
  constructionReportSubmitDate: text2("construction_report_submit_date"),
  // 공사완료보고 제출일
  totalWorkDate: text2("total_work_date"),
  // 총공일
  contractorReportDate: text2("contractor_report_date"),
  // 공사업체보고 배당
  contractorRepairDate: text2("contractor_repair_date"),
  // 공사업체보수 배당
  completionDate: text2("completion_date"),
  // 완공일
  claimDate: text2("claim_date"),
  // 청구일 (청구 상태로 변경된 날짜)
  paymentCompletedDate: text2("payment_completed_date"),
  // 입금완료일 (입금완료 상태로 변경된 날짜)
  partialPaymentDate: text2("partial_payment_date"),
  // 일부입금일 (부분입금 상태로 변경된 날짜)
  settlementCompletedDate: text2("settlement_completed_date"),
  // 정산완료일 (정산완료 상태로 변경된 날짜)
  // 심사 관련 필드 (1차 승인)
  reviewDecision: text2("review_decision"),
  // 심사결과: "승인" | "비승인" | null
  reviewComment: text2("review_comment"),
  // 검토 의견
  reviewedAt: text2("reviewed_at"),
  // 심사 일시
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  // 심사자 ID
  // 보고서 승인 관련 필드 (2차 승인)
  reportApprovalDecision: text2("report_approval_decision"),
  // 보고서 승인결과: "승인" | "비승인" | null
  reportApprovalComment: text2("report_approval_comment"),
  // 보고서 승인 의견
  reportApprovedAt: text2("report_approved_at"),
  // 보고서 승인 일시
  reportApprovedBy: varchar("report_approved_by").references(() => users.id),
  // 보고서 승인자 ID
  // 금액 관련 필드
  estimateAmount: text2("estimate_amount"),
  // 견적금액 (최종 총액)
  initialEstimateAmount: text2("initial_estimate_amount"),
  // 최초 견적금액 (첫 현장출동보고서 제출 시점의 견적금액)
  initialPreventionEstimateAmount: text2("initial_prevention_estimate_amount"),
  // 최초 손해방지비용 견적금액 (첫 현장출동보고서 제출 시점)
  initialPropertyEstimateAmount: text2("initial_property_estimate_amount"),
  // 최초 대물비용 견적금액 (첫 현장출동보고서 제출 시점)
  approvedAmount: text2("approved_amount"),
  // 승인금액 (2차승인 시점의 견적금액)
  // 인보이스 관련 필드
  invoiceDamagePreventionAmount: text2("invoice_damage_prevention_amount"),
  // 재사용 인보이스 - 손해방지비용
  invoicePropertyRepairAmount: text2("invoice_property_repair_amount"),
  // 재사용 인보이스 - 대물복구비용
  invoiceRemarks: text2("invoice_remarks"),
  // 재사용 인보이스 - 비고
  fieldDispatchInvoiceAmount: text2("field_dispatch_invoice_amount"),
  // 현장출동비용 청구 - 현장출동비용
  fieldDispatchInvoiceRemarks: text2("field_dispatch_invoice_remarks"),
  // 현장출동비용 청구 - 비고
  invoiceConfirmDate: text2("invoice_confirm_date"),
  // 인보이스 확인 날짜 (승인 권한자가 확인한 날짜)
  taxInvoiceConfirmDate: text2("tax_invoice_confirm_date"),
  // 세금계산서 확인 날짜
  assignedTo: varchar("assigned_to").references(() => users.id),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: text2("created_at").notNull(),
  updatedAt: text2("updated_at").notNull()
});
var CASE_STATUSES = [
  "\uBC30\uB2F9\uB300\uAE30",
  // 관리자가 접수하기에서 접수정보를 입력했으나, 배당협력사 정보를 입력하지 않은 상태
  "\uC811\uC218\uC644\uB8CC",
  // 관리자가 배당협력사 정보와 접수하기에 있는 정보를 모두 입력하고 '접수완료'를 눌러 접수를 완료한 상태
  "\uD604\uC7A5\uBC29\uBB38",
  // 배당받은 협력사가 현장정보를 입력할때 방문일시를 입력한 상태
  "\uD604\uC7A5\uC815\uBCF4\uC785\uB825",
  // 협력업체가 의뢰된 사고에 대해 현장조사 후 현장조사입력을 마친 상태
  "\uAC80\uD1A0\uC911",
  // 현장정보입력이 제출 된 후, 플록슨 담당자가 페이지를 열어본 상태
  "\uBC18\uB824",
  // 현장정보 입력이 미흡해 재입력을 요구한 상태
  "1\uCC28\uC2B9\uC778",
  // 협력업체가 입력한 현장 정보에 문제가 없어 플록슨 담당자가 승인한 경우
  "\uD604\uC7A5\uC815\uBCF4\uC81C\uCD9C",
  // 승인된 현장 정보를 플록슨 담당자가 심사자 또는 조사자에게 발송
  "\uBCF5\uAD6C\uC694\uCCAD(2\uCC28\uC2B9\uC778)",
  // 심사자 또는 조사자가 현장 정보를 확인하고, 플록슨 또는 협력업체에 복구를 요청
  "\uC9C1\uC811\uBCF5\uAD6C",
  // 플록슨 담당자 또는 협력업체가 해당 사고건의 복구가 진행되는 경우
  "\uC120\uACAC\uC801\uC694\uCCAD",
  // 관리자가 접수하기에서 복구방식을 '선견적 요청'으로 했을경우 선견적만 제출하고 종결되는 경우
  "(\uC9C1\uC811\uBCF5\uAD6C\uC778 \uACBD\uC6B0) \uCCAD\uAD6C\uC790\uB8CC\uC81C\uCD9C",
  // 현장복구를 완료 한 후 청구증빙자료를 제출한 상태
  "(\uC120\uACAC\uC801\uC694\uCCAD\uC778 \uACBD\uC6B0) \uCD9C\uB3D9\uBE44 \uCCAD\uAD6C",
  // 선견적요청 상태 선택시 자동으로 청구 상태 변환
  "\uCCAD\uAD6C",
  // 복구 완료 자료(복구 or 선견적요청 인보이스 포함)를 심사자 및 조사자에게 발송
  "\uC785\uAE08\uC644\uB8CC",
  // 청구한 인보이스 금액이 모두 입금된 상태 (자부담 제외)
  "\uBD80\uBD84\uC785\uAE08",
  // 청구한 인보이스 금액중 비례보상에 따른 일부 금액이 입금된 상태
  "\uC815\uC0B0\uC644\uB8CC",
  // 입금이 완료되어 수수료에 대한 세금계산서가 발행 완료된 상태
  "\uC811\uC218\uCDE8\uC18C"
  // 플록슨에 사고가 의뢰 되었으나, 어떠한 사유로 인해 접수가 취소된 상태
];
var RECOVERY_TYPES = ["\uC9C1\uC811\uBCF5\uAD6C", "\uC120\uACAC\uC801\uC694\uCCAD"];
var insertCaseSchema = createInsertSchema2(cases).omit({
  id: true,
  caseNumber: true,
  createdAt: true,
  updatedAt: true
}).extend({
  status: z.enum(CASE_STATUSES).default("\uBC30\uB2F9\uB300\uAE30"),
  recoveryType: z.enum(RECOVERY_TYPES).optional().nullable()
});
var insertCaseRequestSchema = insertCaseSchema.omit({
  createdBy: true
}).extend({
  caseNumber: z.string().optional(),
  id: z.string().optional()
  // For draft resume and deletion
});
var progressUpdates = pgTable2("progress_updates", {
  id: varchar("id").primaryKey().default(sql2`gen_random_uuid()`),
  caseId: varchar("case_id").notNull().references(() => cases.id),
  content: text2("content").notNull(),
  // 주요 진행사항 내용
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: text2("created_at").notNull()
});
var insertProgressUpdateSchema = createInsertSchema2(progressUpdates).omit({
  id: true,
  createdAt: true
});
var reviewCaseSchema = z.object({
  decision: z.enum(["\uC2B9\uC778", "\uBE44\uC2B9\uC778"]),
  reviewComment: z.string().max(800, "\uAC80\uD1A0 \uC758\uACAC\uC740 800\uC790\uB97C \uCD08\uACFC\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4").optional().or(z.literal(""))
});
var approveReportSchema = z.object({
  decision: z.enum(["\uC2B9\uC778", "\uBE44\uC2B9\uC778"]),
  approvalComment: z.string().max(800, "\uC2B9\uC778 \uC758\uACAC\uC740 800\uC790\uB97C \uCD08\uACFC\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4").optional().or(z.literal(""))
});
var rolePermissions = pgTable2("role_permissions", {
  id: varchar("id").primaryKey().default(sql2`gen_random_uuid()`),
  roleName: text2("role_name").notNull().unique(),
  // 역할명 (예: "보험사", "협력사", "심사사")
  permissions: text2("permissions").notNull(),
  // JSON string: { [category]: string[] }
  createdAt: text2("created_at").notNull(),
  updatedAt: text2("updated_at").notNull()
});
var insertRolePermissionSchema = createInsertSchema2(rolePermissions).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var updateRolePermissionSchema = insertRolePermissionSchema.partial().extend({
  roleName: z.string().min(1, "\uC5ED\uD560\uBA85\uC744 \uC785\uB825\uD574\uC8FC\uC138\uC694")
});
var PERMISSION_CATEGORIES = {
  "\uD648": [],
  "\uC0C8\uB85C\uC6B4\uC811\uC218": [],
  "\uD604\uC7A5\uC870\uC0AC": ["\uD604\uC7A5\uC785\uB825", "\uB3C4\uBA74\uC791\uC131", "\uC99D\uBE59\uC790\uB8CC \uC5C5\uB85C\uB4DC", "\uACAC\uC801\uC11C \uC791\uC131", "\uBCF4\uACE0\uC11C \uC791\uC131"],
  "\uC885\uD569\uC9C4\uD589\uAD00\uB9AC": [],
  "\uD1B5\uACC4 \uBC0F \uC815\uC0B0": ["\uD1B5\uACC4", "\uC815\uC0B0\uC870\uD68C"],
  "\uAD00\uB9AC\uC790 \uC124\uC815": ["\uACC4\uC815\uAD00\uB9AC", "DB\uAD00\uB9AC", "\uAE30\uC900\uC815\uBCF4 \uAD00\uB9AC", "\uC811\uADFC\uAD8C\uD55C\uAD00\uB9AC", "\uC778\uBCF4\uC774\uC2A4 \uC2B9\uC778", "\uBCF4\uACE0\uC11C \uC2B9\uC778"]
};
var excelData = pgTable2("excel_data", {
  id: varchar("id").primaryKey().default(sql2`gen_random_uuid()`),
  type: text2("type").notNull(),
  // "노무비" | "자재비"
  title: text2("title").notNull(),
  // "2025-09-01 전국 - 정부노임단가"
  headers: json("headers").$type().notNull(),
  data: json("data").$type().notNull(),
  uploadedAt: timestamp2("uploaded_at").defaultNow().notNull(),
  updatedAt: timestamp2("updated_at").defaultNow().notNull()
}, (table) => ({
  typeTitleUnique: unique("type_title_unique").on(table.type, table.title)
}));
var insertExcelDataSchema = createInsertSchema2(excelData).omit({
  id: true,
  uploadedAt: true,
  updatedAt: true
});
var inquiries = pgTable2("inquiries", {
  id: varchar("id").primaryKey().default(sql2`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: text2("title").notNull(),
  content: text2("content").notNull(),
  status: text2("status").notNull().default("\uB300\uAE30"),
  // "대기" | "완료"
  responseTitle: text2("response_title"),
  response: text2("response"),
  respondedBy: varchar("responded_by").references(() => users.id),
  respondedAt: timestamp2("responded_at"),
  createdAt: timestamp2("created_at").defaultNow().notNull(),
  updatedAt: timestamp2("updated_at").defaultNow().notNull()
});
var insertInquirySchema = createInsertSchema2(inquiries).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var updateInquirySchema = insertInquirySchema.partial().extend({
  id: z.string()
});
var respondInquirySchema = z.object({
  responseTitle: z.string().min(1, "\uB2F5\uBCC0 \uC81C\uBAA9\uC744 \uC785\uB825\uD574\uC8FC\uC138\uC694"),
  response: z.string().min(1, "\uB2F5\uBCC0 \uB0B4\uC6A9\uC744 \uC785\uB825\uD574\uC8FC\uC138\uC694")
});
var fieldSurveyData = pgTable2("field_survey_data", {
  id: varchar("id").primaryKey().default(sql2`gen_random_uuid()`),
  caseGroupId: text2("case_group_id").notNull().unique(),
  // 케이스 그룹 식별자 (보험사고번호 기반)
  // 현장조사 정보
  visitDate: text2("visit_date"),
  // 방문 일시 (날짜)
  visitTime: text2("visit_time"),
  // 방문 일시 (시간)
  accompaniedPerson: text2("accompanied_person"),
  // 출동담당자
  travelDistance: text2("travel_distance"),
  // 현장 이동 거리
  dispatchLocation: text2("dispatch_location"),
  // 출동 업장지
  accidentTime: text2("accident_time"),
  // 사고 발생 시각
  accidentCategory: text2("accident_category"),
  // 사고 원인 카테고리 (배관, 교체, 방수, 기타)
  processingTypes: text2("processing_types"),
  // 처리 유형 (JSON array)
  processingTypeOther: text2("processing_type_other"),
  // 기타 처리 유형
  recoveryMethodType: text2("recovery_method_type"),
  // 복구 방식 (부분수리, 전체수리)
  fieldSurveyStatus: text2("field_survey_status").default("draft"),
  // 현장조사 상태 (draft/submitted)
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp2("created_at").defaultNow().notNull(),
  updatedAt: timestamp2("updated_at").defaultNow().notNull()
});
var insertFieldSurveyDataSchema = createInsertSchema2(fieldSurveyData).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var sharedDrawings = pgTable2("shared_drawings", {
  id: varchar("id").primaryKey().default(sql2`gen_random_uuid()`),
  caseGroupId: text2("case_group_id").notNull().unique(),
  // 케이스 그룹 식별자
  uploadedImages: json("uploaded_images").$type().notNull().default(sql2`'[]'`),
  rectangles: json("rectangles").$type().notNull().default(sql2`'[]'`),
  accidentAreas: json("accident_areas").$type().notNull().default(sql2`'[]'`),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp2("created_at").defaultNow().notNull(),
  updatedAt: timestamp2("updated_at").defaultNow().notNull()
});
var insertSharedDrawingSchema = createInsertSchema2(sharedDrawings).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var drawings = pgTable2("drawings", {
  id: varchar("id").primaryKey().default(sql2`gen_random_uuid()`),
  caseId: varchar("case_id").notNull().unique(),
  // 케이스당 하나의 도면만 존재
  uploadedImages: json("uploaded_images").$type().notNull().default(sql2`'[]'`),
  rectangles: json("rectangles").$type().notNull().default(sql2`'[]'`),
  accidentAreas: json("accident_areas").$type().notNull().default(sql2`'[]'`),
  leakMarkers: json("leak_markers").$type().notNull().default(sql2`'[]'`),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp2("created_at").defaultNow().notNull(),
  updatedAt: timestamp2("updated_at").defaultNow().notNull()
});
var insertDrawingSchema = createInsertSchema2(drawings).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var caseDocuments = pgTable2("case_documents", {
  id: varchar("id").primaryKey().default(sql2`gen_random_uuid()`),
  caseId: varchar("case_id").notNull().references(() => cases.id),
  category: text2("category").notNull(),
  // 서브카테고리: 현장출동사진, 수리중 사진, 복구완료 사진, 보험금 청구서, 등
  fileName: text2("file_name").notNull(),
  fileType: text2("file_type").notNull(),
  fileSize: integer2("file_size").notNull(),
  fileData: text2("file_data").notNull(),
  // Base64 encoded file data
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp2("created_at").defaultNow().notNull()
});
var DOCUMENT_CATEGORIES = [
  // 사진 탭
  "\uD604\uC7A5\uCD9C\uB3D9\uC0AC\uC9C4",
  "\uC218\uB9AC\uC911 \uC0AC\uC9C4",
  "\uBCF5\uAD6C\uC644\uB8CC \uC0AC\uC9C4",
  // 기본자료 탭
  "\uBCF4\uD5D8\uAE08 \uCCAD\uAD6C\uC11C",
  "\uAC1C\uC778\uC815\uBCF4 \uB3D9\uC758\uC11C(\uAC00\uC871\uC6A9)",
  // 증빙자료 탭
  "\uC8FC\uBBFC\uB4F1\uB85D\uB4F1\uBCF8",
  "\uB4F1\uAE30\uBD80\uB4F1\uBCF8",
  "\uAC74\uCD95\uBB3C\uB300\uC7A5",
  "\uAE30\uD0C0\uC99D\uBE59\uC790\uB8CC(\uBBFC\uC6D0\uC77C\uC9C0 \uB4F1)",
  // 청구자료 탭
  "\uC704\uC784\uC7A5",
  "\uB3C4\uAE09\uACC4\uC57D\uC11C",
  "\uBCF5\uAD6C\uC644\uB8CC\uD655\uC778\uC11C",
  "\uBD80\uAC00\uC138 \uCCAD\uAD6C\uC790\uB8CC"
];
var insertCaseDocumentSchema = createInsertSchema2(caseDocuments).omit({
  id: true,
  createdAt: true
}).extend({
  parentCategory: z.string().optional()
  // 탭 정보 (청구자료 등) - DB에 저장되지 않음, 상태 변경 로직에만 사용
});
var masterData = pgTable2("master_data", {
  id: varchar("id").primaryKey().default(sql2`gen_random_uuid()`),
  category: text2("category").notNull(),
  // "room_category" | "location" | "work_name"
  value: text2("value").notNull(),
  // 실제 표시 값
  note: text2("note"),
  // 메모
  tag: text2("tag").default("\uACF5\uD1B5"),
  // 태그: 공통, 새로운 접수, 현장입력 등
  isActive: text2("is_active").notNull().default("true"),
  // "true" | "false"
  displayOrder: integer2("display_order").notNull().default(0),
  // 표시 순서
  createdAt: timestamp2("created_at").defaultNow().notNull(),
  updatedAt: timestamp2("updated_at").defaultNow().notNull()
}, (table) => ({
  // unique constraint: 같은 카테고리에서 같은 값 중복 방지
  unq: unique().on(table.category, table.value)
}));
var MASTER_DATA_CATEGORIES = ["room_category", "location", "work_name", "work_type"];
var insertMasterDataSchema = createInsertSchema2(masterData).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var estimates = pgTable2("estimates", {
  id: varchar("id").primaryKey().default(sql2`gen_random_uuid()`),
  caseId: varchar("case_id").notNull().references(() => cases.id),
  version: integer2("version").notNull().default(1),
  // 버전 관리
  status: text2("status").notNull().default("draft"),
  // "draft" | "submitted" | "approved"
  createdBy: varchar("created_by").notNull().references(() => users.id),
  laborCostData: json("labor_cost_data"),
  // 노무비 데이터 (JSON)
  materialCostData: json("material_cost_data"),
  // 자재비 데이터 (JSON)
  createdAt: timestamp2("created_at").defaultNow().notNull(),
  updatedAt: timestamp2("updated_at").defaultNow().notNull()
}, (table) => ({
  // unique constraint: 케이스당 버전별로 하나만 허용
  unq: unique().on(table.caseId, table.version)
}));
var estimateRows = pgTable2("estimate_rows", {
  id: varchar("id").primaryKey().default(sql2`gen_random_uuid()`),
  estimateId: varchar("estimate_id").notNull().references(() => estimates.id),
  category: text2("category").notNull(),
  // 장소: 주방, 화장실, 방안, 거실 등
  location: text2("location"),
  // 위치: 천장, 벽면, 바닥
  workType: text2("work_type"),
  // 공종: 목공사, 수장공사, 철거공사 등
  workName: text2("work_name"),
  // 공사명: 합판, 석고보드, 도배 등
  damageWidth: bigint("damage_width", { mode: "number" }),
  // 피해면적 가로 (mm)
  damageHeight: bigint("damage_height", { mode: "number" }),
  // 피해면적 세로 (mm)
  damageArea: bigint("damage_area", { mode: "number" }),
  // 피해면적 면적 (mm²) - 계산된 값
  repairWidth: bigint("repair_width", { mode: "number" }),
  // 복구면적 가로 (mm)
  repairHeight: bigint("repair_height", { mode: "number" }),
  // 복구면적 세로 (mm)
  repairArea: bigint("repair_area", { mode: "number" }),
  // 복구면적 면적 (mm²) - 계산된 값
  note: text2("note"),
  // 비고
  rowOrder: integer2("row_order").notNull(),
  // 행 순서
  createdAt: timestamp2("created_at").defaultNow().notNull()
}, (table) => ({
  // unique constraint: 각 견적 내에서 행 순서는 중복되지 않음
  unqOrder: unique().on(table.estimateId, table.rowOrder)
}));
var insertEstimateSchema = createInsertSchema2(estimates).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertEstimateRowSchema = createInsertSchema2(estimateRows).omit({
  id: true,
  createdAt: true
});
var laborCosts = pgTable2("labor_costs", {
  id: serial2("id").primaryKey(),
  category: text2("category").notNull(),
  // 공종: 가구공사, 도배공사 등
  workName: text2("work_name").notNull(),
  // 공사명: 고정, 철거 등
  detailWork: text2("detail_work").notNull(),
  // 세부공사: 실리콘, 타일 등
  detailItem: text2("detail_item"),
  // 세부항목: 선택적
  priceStandard: text2("price_standard").notNull(),
  // 단가기준: 인, 일, 시간 등
  unit: text2("unit").notNull(),
  // 단위: 일, 시간, ㎡ 등
  standardPrice: integer2("standard_price").notNull(),
  // 기준가(원) = 노임단가(E)
  standardWorkQuantity: integer2("standard_work_quantity").notNull().default(100),
  // 기준작업량(D값), 일위대가 = E/D
  createdAt: timestamp2("created_at").defaultNow().notNull(),
  updatedAt: timestamp2("updated_at").defaultNow().notNull()
});
var insertLaborCostSchema = createInsertSchema2(laborCosts).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var materials = pgTable2("materials", {
  id: serial2("id").primaryKey(),
  workType: text2("work_type").notNull(),
  // 공종: 방수공사, 도배공사, 장판공사 등
  materialName: text2("material_name").notNull(),
  // 자재명: 우레탄, 실리콘, 합지 등
  specification: text2("specification").notNull().default(""),
  // 규격: 빈 문자열 허용
  unit: text2("unit").notNull(),
  // 단위: EA, ㎡, 롤 등
  standardPrice: integer2("standard_price").notNull(),
  // 기준단가(원)
  isActive: text2("is_active").notNull().default("true"),
  // "true" | "false"
  createdAt: timestamp2("created_at").defaultNow().notNull(),
  updatedAt: timestamp2("updated_at").defaultNow().notNull()
}, (table) => ({
  // unique constraint: 같은 공종에서 같은 자재명+규격 중복 방지
  unq: unique().on(table.workType, table.materialName, table.specification)
}));
var insertMaterialSchema = createInsertSchema2(materials).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var userFavorites = pgTable2("user_favorites", {
  id: serial2("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  menuName: text2("menu_name").notNull(),
  // 메뉴 이름 (홈, 접수하기, 현장조사, 종합진행관리, 통계 및 정산, 관리자 설정)
  createdAt: timestamp2("created_at").defaultNow().notNull()
}, (table) => ({
  // 한 사용자가 같은 메뉴를 중복으로 즐겨찾기 할 수 없도록
  unq: unique().on(table.userId, table.menuName)
}));
var MENU_ITEMS = ["\uD648", "\uC811\uC218\uD558\uAE30", "\uD604\uC7A5\uC870\uC0AC", "\uC885\uD569\uC9C4\uD589\uAD00\uB9AC", "\uD1B5\uACC4 \uBC0F \uC815\uC0B0", "\uAD00\uB9AC\uC790 \uC124\uC815"];
var insertUserFavoriteSchema = createInsertSchema2(userFavorites).omit({
  id: true,
  createdAt: true
}).extend({
  menuName: z.enum(MENU_ITEMS)
});
var notices = pgTable2("notices", {
  id: varchar("id").primaryKey().default(sql2`gen_random_uuid()`),
  title: text2("title").notNull(),
  content: text2("content").notNull(),
  authorId: varchar("author_id").notNull().references(() => users.id),
  createdAt: timestamp2("created_at").defaultNow().notNull(),
  updatedAt: timestamp2("updated_at").defaultNow().notNull()
});
var insertNoticeSchema = createInsertSchema2(notices).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var caseChangeLogs = pgTable2("case_change_logs", {
  id: varchar("id").primaryKey().default(sql2`gen_random_uuid()`),
  caseId: varchar("case_id").notNull().references(() => cases.id, { onDelete: "cascade" }),
  changedBy: varchar("changed_by").references(() => users.id),
  // 변경자 (사용자 ID)
  changedByName: text2("changed_by_name"),
  // 변경자 이름 (조회 편의용)
  changedAt: timestamp2("changed_at").defaultNow().notNull(),
  // 변경 시간
  changeType: text2("change_type").notNull(),
  // 변경 유형: "create" | "update" | "status_change"
  changes: json("changes").$type(),
  // 변경 내용
  note: text2("note")
  // 변경 사유/메모
});
var insertCaseChangeLogSchema = createInsertSchema2(caseChangeLogs).omit({
  id: true,
  changedAt: true
});
var settlements = pgTable2("settlements", {
  id: varchar("id").primaryKey().default(sql2`gen_random_uuid()`),
  caseId: varchar("case_id").notNull().references(() => cases.id, { onDelete: "cascade" }),
  settlementAmount: text2("settlement_amount").notNull(),
  // 정산금액
  settlementDate: text2("settlement_date").notNull(),
  // 정산일자
  commission: text2("commission"),
  // 수수료
  discount: text2("discount"),
  // 입금액 (레거시, 하위 호환용)
  deductible: text2("deductible"),
  // 자기부담금
  invoiceDate: text2("invoice_date"),
  // 계산서 발행일
  memo: text2("memo"),
  // 정산 메모
  bank: text2("bank"),
  // 입금은행
  closingDate: text2("closing_date"),
  // 종결일 (정산완료 시 설정)
  partnerPaymentAmount: text2("partner_payment_amount"),
  // 협력업체 지급금액
  partnerPaymentDate: text2("partner_payment_date"),
  // 협력업체 지급일
  depositEntries: json("deposit_entries").$type(),
  // 입금내역 배열
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: text2("created_at").notNull()
});
var insertSettlementSchema = createInsertSchema2(settlements).omit({
  id: true,
  createdAt: true,
  createdBy: true
});
var invoices = pgTable2("invoices", {
  id: varchar("id").primaryKey().default(sql2`gen_random_uuid()`),
  caseId: varchar("case_id").notNull().references(() => cases.id, { onDelete: "cascade" }),
  caseGroupPrefix: text2("case_group_prefix"),
  // 사건번호 그룹 접두사 (예: "251217005")
  type: text2("type").notNull(),
  // "직접복구" | "선견적요청"
  status: text2("status").notNull().default("draft"),
  // "draft" | "approved" | "partial" | "rejected"
  // 금액 정보
  damagePreventionEstimate: text2("damage_prevention_estimate"),
  // 손해방지비용 견적금액
  damagePreventionApproved: text2("damage_prevention_approved"),
  // 손해방지비용 승인금액
  propertyRepairEstimate: text2("property_repair_estimate"),
  // 대물복구비용 견적금액
  propertyRepairApproved: text2("property_repair_approved"),
  // 대물복구비용 승인금액
  fieldDispatchAmount: text2("field_dispatch_amount"),
  // 현장출동비용 (선견적요청)
  totalApprovedAmount: text2("total_approved_amount"),
  // 총 승인 금액
  deductible: text2("deductible"),
  // 자기부담금
  // 승인 정보
  submissionDate: text2("submission_date"),
  // 제출일
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: text2("approved_at"),
  // 승인일시
  settlementStatus: text2("settlement_status"),
  // "정산" | "부분입금" | "청구변경"
  remarks: text2("remarks"),
  // 비고
  createdAt: text2("created_at").notNull(),
  updatedAt: text2("updated_at")
});
var INVOICE_TYPES = ["\uC9C1\uC811\uBCF5\uAD6C", "\uC120\uACAC\uC801\uC694\uCCAD"];
var INVOICE_STATUSES = ["draft", "approved", "partial", "rejected"];
var insertInvoiceSchema = createInsertSchema2(invoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var laborRateTiers = pgTable2("labor_rate_tiers", {
  id: serial2("id").primaryKey(),
  minRatio: integer2("min_ratio").notNull(),
  // 최소 C/D 비율 (백분율, 예: 85 = 85%)
  rateMultiplier: integer2("rate_multiplier").notNull(),
  // E 적용률 (백분율, 예: 100 = 100%)
  sortOrder: integer2("sort_order").notNull(),
  // 정렬 순서 (높은 비율부터)
  createdAt: timestamp2("created_at").defaultNow().notNull(),
  updatedAt: timestamp2("updated_at").defaultNow().notNull()
});
var insertLaborRateTierSchema = createInsertSchema2(laborRateTiers).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var updateLaborRateTierSchema = z.object({
  id: z.number(),
  minRatio: z.number().min(0).max(100),
  rateMultiplier: z.number().min(0).max(100)
});
var updateLaborRateTiersSchema = z.object({
  tiers: z.array(updateLaborRateTierSchema)
});
var DEFAULT_LABOR_RATE_TIERS = [
  { minRatio: 85, rateMultiplier: 100, sortOrder: 1 },
  // ≥85%: 100%
  { minRatio: 80, rateMultiplier: 95, sortOrder: 2 },
  // ≥80%: 95%
  { minRatio: 75, rateMultiplier: 82, sortOrder: 3 },
  // ≥75%: 82%
  { minRatio: 70, rateMultiplier: 74, sortOrder: 4 },
  // ≥70%: 74%
  { minRatio: 65, rateMultiplier: 66, sortOrder: 5 },
  // ≥65%: 66%
  { minRatio: 60, rateMultiplier: 58, sortOrder: 6 },
  // ≥60%: 58%
  { minRatio: 50, rateMultiplier: 50, sortOrder: 7 },
  // ≥50%: 50%
  { minRatio: 0, rateMultiplier: 45, sortOrder: 8 }
  // <50%: 45%
];
var unitPriceOverrides = pgTable2("unit_price_overrides", {
  id: serial2("id").primaryKey(),
  category: text2("category").notNull(),
  // 공종
  workName: text2("work_name").notNull(),
  // 공사명
  laborItem: text2("labor_item").notNull(),
  // 노임항목
  standardWorkQuantity: integer2("standard_work_quantity").notNull().default(100),
  // 기준작업량(D값)
  createdAt: timestamp2("created_at").defaultNow().notNull(),
  updatedAt: timestamp2("updated_at").defaultNow().notNull()
}, (table) => ({
  // unique constraint: 공종+공사명+노임항목 조합은 유일해야 함
  unqKey: unique().on(table.category, table.workName, table.laborItem)
}));
var insertUnitPriceOverrideSchema = createInsertSchema2(unitPriceOverrides).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// server/storage.ts
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";

// server/db.ts
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
neonConfig.webSocketConstructor = ws;
var isProduction = process.env.REPLIT_DEPLOYMENT === "1";
var databaseUrl = isProduction ? process.env.PROD_DATABASE_URL : process.env.DEV_DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    isProduction ? "PROD_DATABASE_URL must be set for production deployment." : "DEV_DATABASE_URL must be set for development."
  );
}
var hostMatch = databaseUrl.match(/@([^/]+)\//);
var dbHost = hostMatch ? hostMatch[1] : "unknown";
console.log(`[DB] Connected to ${isProduction ? "PRODUCTION" : "DEVELOPMENT"} database (${dbHost})`);
var pool = new Pool({
  connectionString: databaseUrl,
  max: 10
});
var db = drizzle({ client: pool, schema: schema_exports });

// server/storage.ts
import { eq, asc, desc, and, or, like, sql as sql3 } from "drizzle-orm";
var SALT_ROUNDS = 10;
function getKSTDate() {
  const kstDate = new Date(
    (/* @__PURE__ */ new Date()).toLocaleString("en-US", { timeZone: "Asia/Seoul" })
  );
  const year = kstDate.getFullYear();
  const month = String(kstDate.getMonth() + 1).padStart(2, "0");
  const day = String(kstDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
function getKSTTimestamp() {
  const now = /* @__PURE__ */ new Date();
  const kstDate = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Seoul" })
  );
  const year = kstDate.getFullYear();
  const month = String(kstDate.getMonth() + 1).padStart(2, "0");
  const day = String(kstDate.getDate()).padStart(2, "0");
  const hours = String(kstDate.getHours()).padStart(2, "0");
  const minutes = String(kstDate.getMinutes()).padStart(2, "0");
  const seconds = String(kstDate.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+09:00`;
}
var DbStorage = class {
  constructor() {
    this.initDatabase();
  }
  async initDatabase() {
    try {
      const existingUsers = await db.select().from(users);
      if (existingUsers.length === 0) {
        await this.seedTestUsers();
      } else {
        await this.ensureEssentialAccounts();
      }
    } catch (error) {
      console.error("Database initialization error:", error);
    }
  }
  async ensureEssentialAccounts() {
    console.log(
      "[Essential Accounts] Checking and creating essential accounts..."
    );
    const currentDate = getKSTDate();
    const hashedPassword = await bcrypt.hash("1234", SALT_ROUNDS);
    const essentialAccounts = [
      // 관리자
      {
        username: "admin01",
        password: hashedPassword,
        role: "\uAD00\uB9AC\uC790",
        name: "\uAE40\uBE14\uB77D",
        company: "\uD50C\uB85D\uC2A8",
        department: "\uAC1C\uBC1C\uD300",
        position: "\uD300\uC7A5",
        email: "admin01@floxn.com",
        phone: "010-1001-1001",
        office: "02-1001-1001",
        address: "\uC11C\uC6B8 \uAC15\uB0A8\uAD6C",
        status: "active",
        createdAt: currentDate
      },
      {
        username: "admin02",
        password: hashedPassword,
        role: "\uAD00\uB9AC\uC790",
        name: "\uBC15\uC601\uD76C",
        company: "\uD50C\uB85D\uC2A8",
        department: "\uAE30\uD68D\uD300",
        position: "\uBD80\uC7A5",
        email: "admin02@floxn.com",
        phone: "010-1002-1002",
        office: "02-1002-1002",
        address: "\uC11C\uC6B8 \uC1A1\uD30C\uAD6C",
        status: "active",
        createdAt: currentDate
      },
      {
        username: "admin03",
        password: hashedPassword,
        role: "\uAD00\uB9AC\uC790",
        name: "\uC774\uD604\uC6B0",
        company: "\uD50C\uB85D\uC2A8",
        department: "\uC778\uC0AC\uD300",
        position: "\uCC28\uC7A5",
        email: "admin03@floxn.com",
        phone: "010-1003-1003",
        office: "02-1003-1003",
        address: "\uC11C\uC6B8 \uC885\uB85C\uAD6C",
        status: "active",
        createdAt: currentDate
      },
      {
        username: "admin04",
        password: hashedPassword,
        role: "\uAD00\uB9AC\uC790",
        name: "\uCD5C\uC9C0\uC6D0",
        company: "\uD50C\uB85D\uC2A8",
        department: "\uC6B4\uC601\uD300",
        position: "\uACFC\uC7A5",
        email: "admin04@floxn.com",
        phone: "010-1004-1004",
        office: "02-1004-1004",
        address: "\uC11C\uC6B8 \uB9C8\uD3EC\uAD6C",
        status: "active",
        createdAt: currentDate
      },
      {
        username: "admin05",
        password: hashedPassword,
        role: "\uAD00\uB9AC\uC790",
        name: "\uC815\uC218\uD604",
        company: "\uD50C\uB85D\uC2A8",
        department: "\uCD1D\uBB34\uD300",
        position: "\uB300\uB9AC",
        email: "admin05@floxn.com",
        phone: "010-1005-1005",
        office: "02-1005-1005",
        address: "\uC11C\uC6B8 \uC11C\uCD08\uAD6C",
        status: "active",
        createdAt: currentDate
      },
      // 보험사
      {
        username: "insure01",
        password: hashedPassword,
        role: "\uBCF4\uD5D8\uC0AC",
        name: "\uAE40\uBBFC\uC900",
        company: "\uC0BC\uC131\uD654\uC7AC",
        department: "\uC0AC\uACE0\uC811\uC218\uD300",
        position: "\uD300\uC7A5",
        email: "insure01@samsung.com",
        phone: "010-2001-2001",
        office: "02-2001-2001",
        address: "\uC11C\uC6B8 \uAC15\uB0A8\uAD6C",
        status: "active",
        createdAt: currentDate
      },
      {
        username: "insure02",
        password: hashedPassword,
        role: "\uBCF4\uD5D8\uC0AC",
        name: "\uC774\uC11C\uC724",
        company: "\uD604\uB300\uD574\uC0C1",
        department: "\uBCF4\uC0C1\uD300",
        position: "\uACFC\uC7A5",
        email: "insure02@hyundai.com",
        phone: "010-2002-2002",
        office: "02-2002-2002",
        address: "\uC11C\uC6B8 \uC11C\uCD08\uAD6C",
        status: "active",
        createdAt: currentDate
      },
      {
        username: "insure03",
        password: hashedPassword,
        role: "\uBCF4\uD5D8\uC0AC",
        name: "\uBC15\uB3C4\uD604",
        company: "DB\uC190\uD574\uBCF4\uD5D8",
        department: "\uBCF4\uC0C1\uD300",
        position: "\uB300\uB9AC",
        email: "insure03@db.com",
        phone: "010-2003-2003",
        office: "02-2003-2003",
        address: "\uC11C\uC6B8 \uC1A1\uD30C\uAD6C",
        status: "active",
        createdAt: currentDate
      },
      {
        username: "insure04",
        password: hashedPassword,
        role: "\uBCF4\uD5D8\uC0AC",
        name: "\uCD5C\uD558\uC740",
        company: "KB\uC190\uD574\uBCF4\uD5D8",
        department: "\uC0AC\uACE0\uC811\uC218\uD300",
        position: "\uC0AC\uC6D0",
        email: "insure04@kb.com",
        phone: "010-2004-2004",
        office: "02-2004-2004",
        address: "\uC11C\uC6B8 \uC601\uB4F1\uD3EC\uAD6C",
        status: "active",
        createdAt: currentDate
      },
      {
        username: "insure05",
        password: hashedPassword,
        role: "\uBCF4\uD5D8\uC0AC",
        name: "\uC815\uC608\uC900",
        company: "MG\uC190\uD574\uBCF4\uD5D8",
        department: "\uBCF4\uC0C1\uD300",
        position: "\uCC28\uC7A5",
        email: "insure05@mg.com",
        phone: "010-2005-2005",
        office: "02-2005-2005",
        address: "\uC11C\uC6B8 \uAC15\uB3D9\uAD6C",
        status: "active",
        createdAt: currentDate
      },
      // 협력사
      {
        username: "partner01",
        password: hashedPassword,
        role: "\uD611\uB825\uC0AC",
        name: "\uAC15\uC9C0\uD6C8",
        company: "\uC6B0\uB9AC\uC218\uB9AC",
        department: "\uD604\uC7A5\uD300",
        position: "\uD300\uC7A5",
        email: "partner01@woori.com",
        phone: "010-3001-3001",
        office: "02-3001-3001",
        address: "\uC11C\uC6B8 \uB9C8\uD3EC\uAD6C",
        bankName: "\uAD6D\uBBFC\uC740\uD589",
        accountNumber: "123-456-789",
        accountHolder: "\uC6B0\uB9AC\uC218\uB9AC",
        serviceRegions: ["\uC11C\uC6B8", "\uACBD\uAE30"],
        status: "active",
        createdAt: currentDate
      },
      {
        username: "partner02",
        password: hashedPassword,
        role: "\uD611\uB825\uC0AC",
        name: "\uC724\uC18C\uD76C",
        company: "\uBCF5\uAD6C\uB9C8\uC2A4\uD130",
        department: "\uC2DC\uACF5\uD300",
        position: "\uC2E4\uC7A5",
        email: "partner02@master.com",
        phone: "010-3002-3002",
        office: "02-3002-3002",
        address: "\uC11C\uC6B8 \uAC15\uC11C\uAD6C",
        bankName: "\uC2E0\uD55C\uC740\uD589",
        accountNumber: "567-890-001",
        accountHolder: "\uBCF5\uAD6C\uB9C8\uC2A4\uD130",
        serviceRegions: ["\uC11C\uC6B8/\uAC15\uC11C\uAD6C", "\uC591\uCC9C\uAD6C", "\uC601\uB4F1\uD3EC\uAD6C"],
        status: "active",
        createdAt: currentDate
      },
      {
        username: "partner03",
        password: hashedPassword,
        role: "\uD611\uB825\uC0AC",
        name: "\uC7A5\uBBFC\uC11C",
        company: "\uB204\uC218\uBC15\uC0AC",
        department: "\uC601\uC5C5\uD300",
        position: "\uACFC\uC7A5",
        email: "partner03@nusoo.com",
        phone: "010-3003-3003",
        office: "02-3003-3003",
        address: "\uACBD\uAE30 \uC218\uC6D0\uC2DC",
        bankName: "\uC6B0\uB9AC\uC740\uD589",
        accountNumber: "567-890-000003",
        accountHolder: "\uB204\uC218\uBC15\uC0AC",
        serviceRegions: ["\uACBD\uAE30/\uC218\uC6D0\uC2DC", "\uD654\uC131\uC2DC", "\uC6A9\uC778\uC2DC"],
        status: "active",
        createdAt: currentDate
      },
      {
        username: "partner04",
        password: hashedPassword,
        role: "\uD611\uB825\uC0AC",
        name: "\uC784\uCC44\uC6D0",
        company: "\uC2A4\uD53C\uB4DC\uBCF5\uAD6C",
        department: "\uD604\uC7A5\uD300",
        position: "\uB300\uB9AC",
        email: "partner04@speed.com",
        phone: "010-3004-3004",
        office: "02-3004-3004",
        address: "\uC11C\uC6B8 \uB178\uC6D0\uAD6C",
        bankName: "\uD558\uB098\uC740\uD589",
        accountNumber: "567-890-000004",
        accountHolder: "\uC2A4\uD53C\uB4DC\uBCF5\uAD6C",
        serviceRegions: ["\uC11C\uC6B8/\uB178\uC6D0\uAD6C", "\uB3C4\uBD09\uAD6C", "\uAC15\uBD81\uAD6C"],
        status: "active",
        createdAt: currentDate
      },
      {
        username: "partner05",
        password: hashedPassword,
        role: "\uD611\uB825\uC0AC",
        name: "\uD55C\uC720\uC9C4",
        company: "\uBCF5\uAD6C\uC804\uBB38\uAC00",
        department: "\uACAC\uC801\uD300",
        position: "\uBD80\uC7A5",
        email: "partner05@expert.com",
        phone: "010-3005-3005",
        office: "02-3005-3005",
        address: "\uACBD\uAE30 \uC131\uB0A8\uC2DC",
        bankName: "\uB18D\uD611\uC740\uD589",
        accountNumber: "567-890-000005",
        accountHolder: "\uD55C\uC720\uC9C4",
        serviceRegions: ["\uACBD\uAE30/\uC131\uB0A8\uC2DC", "\uBD84\uB2F9\uAD6C", "\uC218\uC815\uAD6C"],
        status: "active",
        createdAt: currentDate
      },
      // 심사사
      {
        username: "assessor01",
        password: hashedPassword,
        role: "\uC2EC\uC0AC\uC0AC",
        name: "\uC2E0\uB3D9\uC6B1",
        company: "\uD50C\uB85D\uC2A8",
        department: "\uC2EC\uC0AC\uD300",
        position: "\uC218\uC11D\uC2EC\uC0AC\uC0AC",
        email: "assessor01@floxn.com",
        phone: "010-4001-4001",
        office: "02-4001-4001",
        address: "\uC11C\uC6B8 \uAC15\uB0A8\uAD6C",
        status: "active",
        createdAt: currentDate
      },
      {
        username: "assessor02",
        password: hashedPassword,
        role: "\uC2EC\uC0AC\uC0AC",
        name: "\uC624\uC11C\uD604",
        company: "\uD50C\uB85D\uC2A8",
        department: "\uC2EC\uC0AC\uD300",
        position: "\uCC45\uC784\uC2EC\uC0AC\uC0AC",
        email: "assessor02@floxn.com",
        phone: "010-4002-4002",
        office: "02-4002-4002",
        address: "\uC11C\uC6B8 \uC11C\uCD08\uAD6C",
        status: "active",
        createdAt: currentDate
      },
      {
        username: "assessor03",
        password: hashedPassword,
        role: "\uC2EC\uC0AC\uC0AC",
        name: "\uBC30\uC900\uC601",
        company: "\uD50C\uB85D\uC2A8",
        department: "\uC2EC\uC0AC\uD300",
        position: "\uC120\uC784\uC2EC\uC0AC\uC0AC",
        email: "assessor03@floxn.com",
        phone: "010-4003-4003",
        office: "02-4003-4003",
        address: "\uC11C\uC6B8 \uC1A1\uD30C\uAD6C",
        status: "active",
        createdAt: currentDate
      },
      {
        username: "assessor04",
        password: hashedPassword,
        role: "\uC2EC\uC0AC\uC0AC",
        name: "\uD669\uC2DC\uC6B0",
        company: "\uD50C\uB85D\uC2A8",
        department: "\uC2EC\uC0AC\uD300",
        position: "\uC2EC\uC0AC\uC0AC",
        email: "assessor04@floxn.com",
        phone: "010-4004-4004",
        office: "02-4004-4004",
        address: "\uC11C\uC6B8 \uB9C8\uD3EC\uAD6C",
        status: "active",
        createdAt: currentDate
      },
      {
        username: "assessor05",
        password: hashedPassword,
        role: "\uC2EC\uC0AC\uC0AC",
        name: "\uC11C\uC740\uBE44",
        company: "\uD50C\uB85D\uC2A8",
        department: "\uC2EC\uC0AC\uD300",
        position: "\uC2EC\uC0AC\uC0AC",
        email: "assessor05@floxn.com",
        phone: "010-4005-4005",
        office: "02-4005-4005",
        address: "\uC11C\uC6B8 \uAC15\uB3D9\uAD6C",
        status: "active",
        createdAt: currentDate
      },
      // 조사사
      {
        username: "investigator01",
        password: hashedPassword,
        role: "\uC870\uC0AC\uC0AC",
        name: "\uC548\uC7AC\uD604",
        company: "\uD50C\uB85D\uC2A8",
        department: "\uC870\uC0AC\uD300",
        position: "\uC218\uC11D\uC870\uC0AC\uC0AC",
        email: "investigator01@floxn.com",
        phone: "010-5001-5001",
        office: "02-5001-5001",
        address: "\uC11C\uC6B8 \uAC15\uB0A8\uAD6C",
        status: "active",
        createdAt: currentDate
      },
      {
        username: "investigator02",
        password: hashedPassword,
        role: "\uC870\uC0AC\uC0AC",
        name: "\uC870\uC544\uB77C",
        company: "\uD50C\uB85D\uC2A8",
        department: "\uC870\uC0AC\uD300",
        position: "\uCC45\uC784\uC870\uC0AC\uC0AC",
        email: "investigator02@floxn.com",
        phone: "010-5002-5002",
        office: "02-5002-5002",
        address: "\uC11C\uC6B8 \uC11C\uCD08\uAD6C",
        status: "active",
        createdAt: currentDate
      },
      {
        username: "investigator03",
        password: hashedPassword,
        role: "\uC870\uC0AC\uC0AC",
        name: "\uD64D\uBBFC\uC7AC",
        company: "\uD50C\uB85D\uC2A8",
        department: "\uC870\uC0AC\uD300",
        position: "\uC120\uC784\uC870\uC0AC\uC0AC",
        email: "investigator03@floxn.com",
        phone: "010-5003-5003",
        office: "02-5003-5003",
        address: "\uC11C\uC6B8 \uC1A1\uD30C\uAD6C",
        status: "active",
        createdAt: currentDate
      },
      {
        username: "investigator04",
        password: hashedPassword,
        role: "\uC870\uC0AC\uC0AC",
        name: "\uD5C8\uC9C0\uC548",
        company: "\uD50C\uB85D\uC2A8",
        department: "\uC870\uC0AC\uD300",
        position: "\uC870\uC0AC\uC0AC",
        email: "investigator04@floxn.com",
        phone: "010-5004-5004",
        office: "02-5004-5004",
        address: "\uC11C\uC6B8 \uB9C8\uD3EC\uAD6C",
        status: "active",
        createdAt: currentDate
      },
      {
        username: "investigator05",
        password: hashedPassword,
        role: "\uC870\uC0AC\uC0AC",
        name: "\uC1A1\uB2E4\uBE48",
        company: "\uD50C\uB85D\uC2A8",
        department: "\uC870\uC0AC\uD300",
        position: "\uC870\uC0AC\uC0AC",
        email: "investigator05@floxn.com",
        phone: "010-5005-5005",
        office: "02-5005-5005",
        address: "\uC11C\uC6B8 \uAC15\uB3D9\uAD6C",
        status: "active",
        createdAt: currentDate
      },
      // 의뢰사
      {
        username: "client01",
        password: hashedPassword,
        role: "\uC758\uB8B0\uC0AC",
        name: "\uAE40\uB300\uD55C",
        company: "\uB300\uD55C\uC544\uD30C\uD2B8\uAD00\uB9AC",
        department: "\uAD00\uB9AC\uD300",
        position: "\uD300\uC7A5",
        email: "client01@daehan.com",
        phone: "010-6001-6001",
        office: "02-6001-6001",
        address: "\uC11C\uC6B8 \uAC15\uB0A8\uAD6C",
        status: "active",
        createdAt: currentDate
      },
      {
        username: "client02",
        password: hashedPassword,
        role: "\uC758\uB8B0\uC0AC",
        name: "\uC774\uD55C\uB098",
        company: "\uD55C\uB098\uBE4C\uB529\uAD00\uB9AC",
        department: "\uAD00\uB9AC\uD300",
        position: "\uACFC\uC7A5",
        email: "client02@hanna.com",
        phone: "010-6002-6002",
        office: "02-6002-6002",
        address: "\uC11C\uC6B8 \uC11C\uCD08\uAD6C",
        status: "active",
        createdAt: currentDate
      },
      {
        username: "client03",
        password: hashedPassword,
        role: "\uC758\uB8B0\uC0AC",
        name: "\uBC15\uC885\uD569",
        company: "\uC885\uD569\uBD80\uB3D9\uC0B0",
        department: "\uC601\uC5C5\uD300",
        position: "\uB300\uB9AC",
        email: "client03@jonghap.com",
        phone: "010-6003-6003",
        office: "02-6003-6003",
        address: "\uC11C\uC6B8 \uC1A1\uD30C\uAD6C",
        status: "active",
        createdAt: currentDate
      },
      {
        username: "client04",
        password: hashedPassword,
        role: "\uC758\uB8B0\uC0AC",
        name: "\uCD5C\uBBFC\uC9C0",
        company: "\uBBFC\uC9C0\uC2DC\uC124\uAD00\uB9AC",
        department: "\uAD00\uB9AC\uD300",
        position: "\uC2E4\uC7A5",
        email: "client04@minji.com",
        phone: "010-6004-6004",
        office: "02-6004-6004",
        address: "\uC11C\uC6B8 \uB9C8\uD3EC\uAD6C",
        status: "active",
        createdAt: currentDate
      },
      {
        username: "client05",
        password: hashedPassword,
        role: "\uC758\uB8B0\uC0AC",
        name: "\uC815\uC11C\uC6B8",
        company: "\uC11C\uC6B8\uAC74\uBB3C\uAD00\uB9AC",
        department: "\uAD00\uB9AC\uD300",
        position: "\uBD80\uC7A5",
        email: "client05@seoul.com",
        phone: "010-6005-6005",
        office: "02-6005-6005",
        address: "\uC11C\uC6B8 \uAC15\uB3D9\uAD6C",
        status: "active",
        createdAt: currentDate
      }
    ];
    let createdCount = 0;
    let updatedCount = 0;
    let existingCount = 0;
    for (const account of essentialAccounts) {
      try {
        const existing = await db.select().from(users).where(eq(users.username, account.username));
        if (existing.length === 0) {
          await db.insert(users).values({
            id: randomUUID(),
            ...account
          });
          console.log(
            `[Essential Accounts] Created: ${account.username} (${account.role})`
          );
          createdCount++;
        } else {
          if (account.role === "\uAD00\uB9AC\uC790") {
            await db.update(users).set({ password: account.password }).where(eq(users.username, account.username));
            console.log(
              `[Essential Accounts] Password updated: ${account.username}`
            );
            updatedCount++;
          } else {
            existingCount++;
          }
        }
      } catch (error) {
        console.error(
          `[Essential Accounts] Error creating ${account.username}:`,
          error
        );
      }
    }
    console.log(
      `[Essential Accounts] Summary: ${createdCount} created, ${updatedCount} password updated, ${existingCount} already exist`
    );
  }
  async seedTestCases() {
    const currentDate = getKSTDate();
    const allUsers = await db.select().from(users);
    const admin01 = allUsers.find((u) => u.username === "admin01");
    const assessor01 = allUsers.find((u) => u.username === "assessor01");
    const assessor02 = allUsers.find((u) => u.username === "assessor02");
    const partner01 = allUsers.find((u) => u.username === "partner01");
    const partner02 = allUsers.find((u) => u.username === "partner02");
    if (!admin01) return;
    const statuses = ["\uC81C\uCD9C", "\uAC80\uD1A0\uC911", "1\uCC28\uC2B9\uC778", "\uC644\uB8CC", "\uCCAD\uAD6C", "\uC815\uC0B0\uC644\uB8CC"];
    const insuranceCompanies = [
      "MG\uC190\uD574\uBCF4\uD5D8",
      "\uC0BC\uC131\uD654\uC7AC",
      "\uD604\uB300\uD574\uC0C1",
      "DB\uC190\uD574\uBCF4\uD5D8",
      "KB\uC190\uD574\uBCF4\uD5D8"
    ];
    const testCases = [];
    for (let i = 1; i <= 145; i++) {
      const day = (i % 28 + 1).toString().padStart(2, "0");
      const status = statuses[i % statuses.length];
      const insurance = insuranceCompanies[i % insuranceCompanies.length];
      testCases.push({
        caseNumber: `CLM-2024100${i.toString().padStart(5, "0")}`,
        status,
        accidentDate: `2024-10-${day}`,
        insuranceCompany: insurance,
        insurancePolicyNo: `${insurance.substring(0, 2)}2024-${i.toString().padStart(5, "0")}`,
        insuranceAccidentNo: `24100${i.toString().padStart(4, "0")}`,
        clientResidence: "\uC11C\uC6B8 \uAC15\uB0A8\uAD6C",
        clientDepartment: "\uBCF4\uC0C1\uD300",
        clientName: `\uACE0\uAC1D${i}`,
        clientContact: "010-0000-0000",
        assessorId: (i % 2 === 0 ? assessor01?.id : assessor02?.id) || null,
        assessorDepartment: "\uC2EC\uC0AC\uD300",
        assessorTeam: i % 2 === 0 ? "1\uD300" : "2\uD300",
        assessorContact: "010-4001-4001",
        investigatorTeam: "\uC870\uC0AC1\uD300",
        investigatorDepartment: "\uD604\uC7A5\uC870\uC0AC",
        investigatorTeamName: "\uD50C\uB85D\uC2A8 \uC870\uC0AC\uD300",
        investigatorContact: "02-5001-5001",
        policyHolderName: `\uACE0\uAC1D${i}`,
        policyHolderIdNumber: "800101-1******",
        policyHolderAddress: "\uC11C\uC6B8 \uAC15\uB0A8\uAD6C",
        insuredName: `\uACE0\uAC1D${i}`,
        insuredIdNumber: "800101-1******",
        insuredContact: "010-0000-0000",
        insuredAddress: "\uC11C\uC6B8 \uAC15\uB0A8\uAD6C",
        victimName: "\uC774\uC6C3\uC9D1",
        victimContact: "010-9999-8888",
        clientPhone: "010-0000-0000",
        clientAddress: "\uC11C\uC6B8 \uAC15\uB0A8\uAD6C",
        accidentLocation: `\uC11C\uC6B8 \uAC15\uB0A8\uAD6C \uC544\uD30C\uD2B8 ${i}\uD638`,
        accidentDescription: "\uB204\uC218 \uD53C\uD574",
        assignedTo: (i % 2 === 0 ? partner01?.id : partner02?.id) || null,
        createdBy: admin01.id,
        createdAt: `2024-10-${day}`,
        updatedAt: `2024-10-${day}`
      });
    }
    for (let i = 1; i <= 167; i++) {
      const day = (i % 28 + 1).toString().padStart(2, "0");
      const status = statuses[i % statuses.length];
      const insurance = insuranceCompanies[i % insuranceCompanies.length];
      testCases.push({
        caseNumber: `CLM-2024110${i.toString().padStart(5, "0")}`,
        status,
        accidentDate: `2024-11-${day}`,
        insuranceCompany: insurance,
        insurancePolicyNo: `${insurance.substring(0, 2)}2024-${i.toString().padStart(5, "0")}`,
        insuranceAccidentNo: `24110${i.toString().padStart(4, "0")}`,
        clientResidence: "\uC11C\uC6B8 \uC11C\uCD08\uAD6C",
        clientDepartment: "\uBCF4\uC0C1\uD300",
        clientName: `\uACE0\uAC1D${i}`,
        clientContact: "010-1111-1111",
        assessorId: (i % 2 === 0 ? assessor01?.id : assessor02?.id) || null,
        assessorDepartment: "\uC2EC\uC0AC\uD300",
        assessorTeam: i % 2 === 0 ? "1\uD300" : "2\uD300",
        assessorContact: "010-4001-4001",
        investigatorTeam: "\uC870\uC0AC1\uD300",
        investigatorDepartment: "\uD604\uC7A5\uC870\uC0AC",
        investigatorTeamName: "\uD50C\uB85D\uC2A8 \uC870\uC0AC\uD300",
        investigatorContact: "02-5001-5001",
        policyHolderName: `\uACE0\uAC1D${i}`,
        policyHolderIdNumber: "800101-1******",
        policyHolderAddress: "\uC11C\uC6B8 \uC11C\uCD08\uAD6C",
        insuredName: `\uACE0\uAC1D${i}`,
        insuredIdNumber: "800101-1******",
        insuredContact: "010-1111-1111",
        insuredAddress: "\uC11C\uC6B8 \uC11C\uCD08\uAD6C",
        victimName: "\uC774\uC6C3\uC9D1",
        victimContact: "010-9999-8888",
        clientPhone: "010-1111-1111",
        clientAddress: "\uC11C\uC6B8 \uC11C\uCD08\uAD6C",
        accidentLocation: `\uC11C\uC6B8 \uC11C\uCD08\uAD6C \uC544\uD30C\uD2B8 ${i}\uD638`,
        accidentDescription: "\uB204\uC218 \uD53C\uD574",
        assignedTo: (i % 2 === 0 ? partner01?.id : partner02?.id) || null,
        createdBy: admin01.id,
        createdAt: `2024-11-${day}`,
        updatedAt: `2024-11-${day}`
      });
    }
    testCases.push(
      {
        caseNumber: "CLM-25145136",
        status: "\uC81C\uCD9C",
        accidentDate: "2024-11-15",
        insuranceCompany: "MG\uC190\uD574\uBCF4\uD5D8",
        insurancePolicyNo: "MG2024-12345",
        insuranceAccidentNo: "25219943",
        clientResidence: "\uC11C\uC6B8 \uAC15\uB0A8\uAD6C",
        clientDepartment: "\uBCF4\uC0C1\uD300",
        clientName: "\uAE40\uBE14\uB77D",
        clientContact: "010-1234-5678",
        assessorId: assessor01?.id || null,
        assessorDepartment: "\uC2EC\uC0AC\uD300",
        assessorTeam: "1\uD300",
        assessorContact: "010-4001-4001",
        investigatorTeam: "\uC870\uC0AC1\uD300",
        investigatorDepartment: "\uD604\uC7A5\uC870\uC0AC",
        investigatorTeamName: "\uD50C\uB85D\uC2A8 \uC870\uC0AC\uD300",
        investigatorContact: "02-5001-5001",
        policyHolderName: "\uAE40\uBE14\uB77D",
        policyHolderIdNumber: "800101-1******",
        policyHolderAddress: "\uC11C\uC6B8 \uAC15\uB0A8\uAD6C \uD14C\uD5E4\uB780\uB85C 123",
        insuredName: "\uAE40\uBE14\uB77D",
        insuredIdNumber: "800101-1******",
        insuredContact: "010-1234-5678",
        insuredAddress: "\uC11C\uC6B8 \uAC15\uB0A8\uAD6C \uD14C\uD5E4\uB780\uB85C 123",
        victimName: "\uC774\uC6C3\uC9D1",
        victimContact: "010-9999-8888",
        clientPhone: "010-1234-5678",
        clientAddress: "\uC11C\uC6B8 \uAC15\uB0A8\uAD6C \uD14C\uD5E4\uB780\uB85C 123",
        accidentLocation: "\uC11C\uC6B8 \uAC15\uB0A8\uAD6C \uD14C\uD5E4\uB780\uB85C 123 \uC544\uD30C\uD2B8 1001\uD638",
        accidentDescription: "\uD654\uC7A5\uC2E4 \uBC30\uAD00 \uB204\uC218\uB85C \uC778\uD55C \uCC9C\uC7A5 \uCE68\uC218 \uD53C\uD574",
        assignedTo: partner01?.id || null,
        createdBy: admin01.id,
        createdAt: "2024-11-15",
        updatedAt: "2024-11-15"
      },
      {
        caseNumber: "CLM-25145135",
        status: "\uAC80\uD1A0\uC911",
        accidentDate: "2024-11-14",
        insuranceCompany: "\uC0BC\uC131\uD654\uC7AC",
        insurancePolicyNo: "SS2024-67890",
        insuranceAccidentNo: "25219942",
        clientResidence: "\uC11C\uC6B8 \uC11C\uCD08\uAD6C",
        clientDepartment: "\uBCF4\uC0C1\uD300",
        clientName: "\uBC15\uCCA0\uC218",
        clientContact: "010-2345-6789",
        assessorId: assessor02?.id || null,
        assessorDepartment: "\uC2EC\uC0AC\uD300",
        assessorTeam: "2\uD300",
        assessorContact: "010-4002-4002",
        investigatorTeam: "\uC870\uC0AC2\uD300",
        investigatorDepartment: "\uD604\uC7A5\uC870\uC0AC",
        investigatorTeamName: "\uD50C\uB85D\uC2A8 \uC870\uC0AC\uD300",
        investigatorContact: "02-5002-5002",
        policyHolderName: "\uBC15\uCCA0\uC218",
        policyHolderIdNumber: "750505-1******",
        policyHolderAddress: "\uC11C\uC6B8 \uC11C\uCD08\uAD6C \uAC15\uB0A8\uB300\uB85C 456",
        insuredName: "\uBC15\uCCA0\uC218",
        insuredIdNumber: "750505-1******",
        insuredContact: "010-2345-6789",
        insuredAddress: "\uC11C\uC6B8 \uC11C\uCD08\uAD6C \uAC15\uB0A8\uB300\uB85C 456",
        victimName: "\uC544\uB798\uCE35 \uC8FC\uBBFC",
        victimContact: "010-7777-6666",
        clientPhone: "010-2345-6789",
        clientAddress: "\uC11C\uC6B8 \uC11C\uCD08\uAD6C \uAC15\uB0A8\uB300\uB85C 456",
        accidentLocation: "\uC11C\uC6B8 \uC11C\uCD08\uAD6C \uAC15\uB0A8\uB300\uB85C 456 \uBE4C\uB77C 202\uD638",
        accidentDescription: "\uC2F1\uD06C\uB300 \uD558\uC218 \uBC30\uAD00 \uD30C\uC190\uC73C\uB85C \uC778\uD55C \uB204\uC218",
        assignedTo: partner02?.id || null,
        createdBy: admin01.id,
        createdAt: "2024-11-14",
        updatedAt: "2024-11-14"
      },
      {
        caseNumber: "CLM-25145134",
        status: "\uC791\uC131\uC911",
        accidentDate: "2024-11-13",
        insuranceCompany: "\uD604\uB300\uD574\uC0C1",
        insurancePolicyNo: "HD2024-11111",
        insuranceAccidentNo: "25219941",
        clientResidence: "\uACBD\uAE30 \uC131\uB0A8\uC2DC",
        clientDepartment: "\uBCF4\uC0C1\uD300",
        clientName: "\uC774\uBBF8\uB77C",
        clientContact: "010-3456-7890",
        assessorId: assessor01?.id || null,
        assessorDepartment: "\uC2EC\uC0AC\uD300",
        assessorTeam: "1\uD300",
        assessorContact: "010-4001-4001",
        investigatorTeam: "\uC870\uC0AC1\uD300",
        investigatorDepartment: "\uD604\uC7A5\uC870\uC0AC",
        investigatorTeamName: "\uD50C\uB85D\uC2A8 \uC870\uC0AC\uD300",
        investigatorContact: "02-5001-5001",
        policyHolderName: "\uC774\uBBF8\uB77C",
        policyHolderIdNumber: "900303-2******",
        policyHolderAddress: "\uACBD\uAE30 \uC131\uB0A8\uC2DC \uBD84\uB2F9\uAD6C 789",
        insuredName: "\uC774\uBBF8\uB77C",
        insuredIdNumber: "900303-2******",
        insuredContact: "010-3456-7890",
        insuredAddress: "\uACBD\uAE30 \uC131\uB0A8\uC2DC \uBD84\uB2F9\uAD6C 789",
        victimName: "\uC606\uC9D1",
        victimContact: "010-5555-4444",
        clientPhone: "010-3456-7890",
        clientAddress: "\uACBD\uAE30 \uC131\uB0A8\uC2DC \uBD84\uB2F9\uAD6C 789",
        accidentLocation: "\uACBD\uAE30 \uC131\uB0A8\uC2DC \uBD84\uB2F9\uAD6C 789 \uC544\uD30C\uD2B8 506\uD638",
        accidentDescription: "\uBCF4\uC77C\uB7EC \uBC30\uAD00 \uB3D9\uD30C\uB85C \uC778\uD55C \uB204\uC218 \uC0AC\uACE0",
        assignedTo: partner01?.id || null,
        createdBy: admin01.id,
        createdAt: "2024-11-13",
        updatedAt: "2024-11-13"
      }
    );
    await db.insert(cases).values(testCases);
  }
  async seedTestEstimates() {
    try {
      const completedCases = await db.select().from(cases).where(sql3`${cases.status} IN ('완료', '청구')`);
      if (completedCases.length === 0) {
        console.log("No completed or billed cases found for estimate seeding");
        return;
      }
      const adminUsers = await db.select().from(users).where(sql3`${users.role} = '관리자'`);
      const admin01 = adminUsers.find((u) => u.username === "admin01");
      if (!admin01) {
        console.log("No admin user found for estimate seeding");
        return;
      }
      const estimateRecords = completedCases.map((caseRecord, index) => {
        const laborCostData = [
          {
            id: `labor-${index}-1`,
            category: "\uB3C4\uBC30\uACF5\uC0AC",
            workName: "\uB3C4\uBC30",
            detailWork: "\uBCBD\uC9C0",
            standardPrice: 15e3,
            quantity: 20,
            amount: 3e5,
            includeInEstimate: false
            // 경비 제외
          },
          {
            id: `labor-${index}-2`,
            category: "\uC7A5\uD310\uACF5\uC0AC",
            workName: "\uC7A5\uD310",
            detailWork: "PVC \uC7A5\uD310",
            standardPrice: 12e3,
            quantity: 15,
            amount: 18e4,
            includeInEstimate: false
            // 경비 제외
          }
        ];
        const materialCostData = [
          {
            id: `material-${index}-1`,
            materialName: "\uBCBD\uC9C0",
            specification: "\uD3ED 92cm",
            unit: "m",
            standardPrice: 8e3,
            quantity: 25,
            \uAE08\uC561: 2e5
          }
        ];
        return {
          caseId: caseRecord.id,
          version: 1,
          status: "submitted",
          createdBy: admin01.id,
          laborCostData,
          materialCostData
        };
      });
      await db.insert(estimates).values(estimateRecords);
      console.log(
        `Seeded ${estimateRecords.length} estimates for completed/billed cases`
      );
    } catch (error) {
      console.error("Error seeding test estimates:", error);
    }
  }
  async seedTestUsers() {
    const hashedPassword = await bcrypt.hash("1234", SALT_ROUNDS);
    const currentDate = getKSTDate();
    const testUsers = [
      // ===== 관리자 5명 =====
      {
        username: "admin01",
        password: hashedPassword,
        role: "\uAD00\uB9AC\uC790",
        name: "\uAE40\uBE14\uB77D",
        company: "\uD50C\uB85D\uC2A8",
        department: "\uAC1C\uBC1C\uD300",
        position: "\uD300\uC7A5",
        email: "admin01@floxn.com",
        phone: "010-1001-1001",
        office: "02-1001-1001",
        address: "\uC11C\uC6B8 \uAC15\uB0A8\uAD6C",
        status: "active",
        createdAt: currentDate
      },
      {
        username: "admin02",
        password: hashedPassword,
        role: "\uAD00\uB9AC\uC790",
        name: "\uBC15\uC601\uD76C",
        company: "\uD50C\uB85D\uC2A8",
        department: "\uAE30\uD68D\uD300",
        position: "\uBD80\uC7A5",
        email: "admin02@floxn.com",
        phone: "010-1002-1002",
        office: "02-1002-1002",
        address: "\uC11C\uC6B8 \uC1A1\uD30C\uAD6C",
        status: "active",
        createdAt: currentDate
      },
      {
        username: "admin03",
        password: hashedPassword,
        role: "\uAD00\uB9AC\uC790",
        name: "\uC774\uD604\uC6B0",
        company: "\uD50C\uB85D\uC2A8",
        department: "\uC778\uC0AC\uD300",
        position: "\uCC28\uC7A5",
        email: "admin03@floxn.com",
        phone: "010-1003-1003",
        office: "02-1003-1003",
        address: "\uC11C\uC6B8 \uC885\uB85C\uAD6C",
        status: "active",
        createdAt: currentDate
      },
      {
        username: "admin04",
        password: hashedPassword,
        role: "\uAD00\uB9AC\uC790",
        name: "\uCD5C\uC9C0\uC6D0",
        company: "\uD50C\uB85D\uC2A8",
        department: "\uC6B4\uC601\uD300",
        position: "\uACFC\uC7A5",
        email: "admin04@floxn.com",
        phone: "010-1004-1004",
        office: "02-1004-1004",
        address: "\uC11C\uC6B8 \uB9C8\uD3EC\uAD6C",
        status: "active",
        createdAt: currentDate
      },
      {
        username: "admin05",
        password: hashedPassword,
        role: "\uAD00\uB9AC\uC790",
        name: "\uC815\uC218\uD604",
        company: "\uD50C\uB85D\uC2A8",
        department: "\uCD1D\uBB34\uD300",
        position: "\uB300\uB9AC",
        email: "admin05@floxn.com",
        phone: "010-1005-1005",
        office: "02-1005-1005",
        address: "\uC11C\uC6B8 \uC11C\uCD08\uAD6C",
        status: "active",
        createdAt: currentDate
      },
      // ===== 보험사 5명 =====
      {
        username: "insure01",
        password: hashedPassword,
        role: "\uBCF4\uD5D8\uC0AC",
        name: "\uAE40\uBBFC\uC900",
        company: "\uC0BC\uC131\uD654\uC7AC",
        department: "\uC0AC\uACE0\uC811\uC218\uD300",
        position: "\uD300\uC7A5",
        email: "insure01@samsung.com",
        phone: "010-2001-2001",
        office: "02-2001-2001",
        address: "\uC11C\uC6B8 \uAC15\uB0A8\uAD6C",
        status: "active",
        createdAt: currentDate
      },
      {
        username: "insure02",
        password: hashedPassword,
        role: "\uBCF4\uD5D8\uC0AC",
        name: "\uC774\uC11C\uC724",
        company: "\uD604\uB300\uD574\uC0C1",
        department: "\uBCF4\uC0C1\uD300",
        position: "\uCC28\uC7A5",
        email: "insure02@hyundai.com",
        phone: "010-2002-2002",
        office: "02-2002-2002",
        address: "\uC11C\uC6B8 \uC911\uAD6C",
        status: "active",
        createdAt: currentDate
      },
      {
        username: "insure03",
        password: hashedPassword,
        role: "\uBCF4\uD5D8\uC0AC",
        name: "\uBC15\uB3C4\uD604",
        company: "DB\uC190\uD574\uBCF4\uD5D8",
        department: "\uC0AC\uACE0\uCC98\uB9AC\uD300",
        position: "\uACFC\uC7A5",
        email: "insure03@db.com",
        phone: "010-2003-2003",
        office: "02-2003-2003",
        address: "\uC11C\uC6B8 \uC601\uB4F1\uD3EC\uAD6C",
        status: "active",
        createdAt: currentDate
      },
      {
        username: "insure04",
        password: hashedPassword,
        role: "\uBCF4\uD5D8\uC0AC",
        name: "\uCD5C\uD558\uC740",
        company: "KB\uC190\uD574\uBCF4\uD5D8",
        department: "\uBCF4\uC0C1\uC2EC\uC0AC\uD300",
        position: "\uBD80\uC7A5",
        email: "insure04@kb.com",
        phone: "010-2004-2004",
        office: "02-2004-2004",
        address: "\uC11C\uC6B8 \uC885\uB85C\uAD6C",
        status: "active",
        createdAt: currentDate
      },
      {
        username: "insure05",
        password: hashedPassword,
        role: "\uBCF4\uD5D8\uC0AC",
        name: "\uC815\uC608\uC900",
        company: "\uBA54\uB9AC\uCE20\uD654\uC7AC",
        department: "\uC0AC\uACE0\uC870\uC0AC\uD300",
        position: "\uB300\uB9AC",
        email: "insure05@meritz.com",
        phone: "010-2005-2005",
        office: "02-2005-2005",
        address: "\uC11C\uC6B8 \uAC15\uB3D9\uAD6C",
        status: "active",
        createdAt: currentDate
      },
      // ===== 협력사 5명 =====
      {
        username: "partner01",
        password: hashedPassword,
        role: "\uD611\uB825\uC0AC",
        name: "\uAC15\uC9C0\uD6C8",
        company: "AERO \uD30C\uD2B8\uB108\uC2A4",
        department: "\uD604\uC7A5\uC870\uC0AC\uD300",
        position: "\uD300\uC7A5",
        email: "partner01@aero.com",
        phone: "010-3001-3001",
        office: "02-3001-3001",
        address: "\uC11C\uC6B8 \uC11C\uCD08\uAD6C",
        bankName: "\uAD6D\uBBFC\uC740\uD589",
        accountNumber: "123-456-000001",
        accountHolder: "\uAC15\uC9C0\uD6C8",
        serviceRegions: ["\uC11C\uC6B8\uC2DC/\uAC15\uB0A8\uAD6C", "\uC11C\uCD08\uAD6C", "\uC1A1\uD30C\uAD6C"],
        status: "active",
        createdAt: currentDate
      },
      {
        username: "partner02",
        password: hashedPassword,
        role: "\uD611\uB825\uC0AC",
        name: "\uC724\uC18C\uD76C",
        company: "\uB204\uC218\uB2E5\uD130",
        department: "\uBCF5\uAD6C\uD300",
        position: "\uCC28\uC7A5",
        email: "partner02@doctor.com",
        phone: "010-3002-3002",
        office: "02-3002-3002",
        address: "\uC11C\uC6B8 \uC6A9\uC0B0\uAD6C",
        bankName: "\uC2E0\uD55C\uC740\uD589",
        accountNumber: "234-567-000002",
        accountHolder: "\uC724\uC18C\uD76C",
        serviceRegions: ["\uC11C\uC6B8\uC2DC/\uC885\uB85C\uAD6C", "\uC911\uAD6C", "\uC6A9\uC0B0\uAD6C"],
        status: "active",
        createdAt: currentDate
      },
      {
        username: "partner03",
        password: hashedPassword,
        role: "\uD611\uB825\uC0AC",
        name: "\uC7A5\uBBFC\uC11C",
        company: "\uD074\uB9B0\uC6CC\uD130",
        department: "\uAE30\uC220\uD300",
        position: "\uACFC\uC7A5",
        email: "partner03@cleanwater.com",
        phone: "010-3003-3003",
        office: "02-3003-3003",
        address: "\uC11C\uC6B8 \uB9C8\uD3EC\uAD6C",
        bankName: "\uC6B0\uB9AC\uC740\uD589",
        accountNumber: "345-678-000003",
        accountHolder: "\uC7A5\uBBFC\uC11C",
        serviceRegions: ["\uC11C\uC6B8\uC2DC/\uB9C8\uD3EC\uAD6C", "\uC11C\uB300\uBB38\uAD6C", "\uC740\uD3C9\uAD6C"],
        status: "active",
        createdAt: currentDate
      },
      {
        username: "partner04",
        password: hashedPassword,
        role: "\uD611\uB825\uC0AC",
        name: "\uC784\uCC44\uC6D0",
        company: "\uC218\uB9AC\uB9C8\uC2A4\uD130",
        department: "\uC2DC\uACF5\uD300",
        position: "\uD300\uC7A5",
        email: "partner04@master.com",
        phone: "010-3004-3004",
        office: "02-3004-3004",
        address: "\uC11C\uC6B8 \uAC15\uBD81\uAD6C",
        bankName: "\uD558\uB098\uC740\uD589",
        accountNumber: "456-789-000004",
        accountHolder: "\uC784\uCC44\uC6D0",
        serviceRegions: ["\uC11C\uC6B8\uC2DC/\uAC15\uBD81\uAD6C", "\uC131\uBD81\uAD6C", "\uB178\uC6D0\uAD6C"],
        status: "active",
        createdAt: currentDate
      },
      {
        username: "partner05",
        password: hashedPassword,
        role: "\uD611\uB825\uC0AC",
        name: "\uD55C\uC720\uC9C4",
        company: "\uBCF5\uAD6C\uC804\uBB38\uAC00",
        department: "\uACAC\uC801\uD300",
        position: "\uBD80\uC7A5",
        email: "partner05@expert.com",
        phone: "010-3005-3005",
        office: "02-3005-3005",
        address: "\uACBD\uAE30 \uC131\uB0A8\uC2DC",
        bankName: "\uB18D\uD611\uC740\uD589",
        accountNumber: "567-890-000005",
        accountHolder: "\uD55C\uC720\uC9C4",
        serviceRegions: ["\uACBD\uAE30/\uC131\uB0A8\uC2DC", "\uBD84\uB2F9\uAD6C", "\uC218\uC815\uAD6C"],
        status: "active",
        createdAt: currentDate
      },
      // ===== 심사사 5명 =====
      {
        username: "assessor01",
        password: hashedPassword,
        role: "\uC2EC\uC0AC\uC0AC",
        name: "\uC2E0\uB3D9\uC6B1",
        company: "\uD50C\uB85D\uC2A8",
        department: "\uC2EC\uC0AC\uD300",
        position: "\uC218\uC11D\uC2EC\uC0AC\uC0AC",
        email: "assessor01@floxn.com",
        phone: "010-4001-4001",
        office: "02-4001-4001",
        address: "\uC11C\uC6B8 \uAC15\uB0A8\uAD6C",
        status: "active",
        createdAt: currentDate
      },
      {
        username: "assessor02",
        password: hashedPassword,
        role: "\uC2EC\uC0AC\uC0AC",
        name: "\uC624\uC11C\uD604",
        company: "\uD50C\uB85D\uC2A8",
        department: "\uC2EC\uC0AC\uD300",
        position: "\uCC45\uC784\uC2EC\uC0AC\uC0AC",
        email: "assessor02@floxn.com",
        phone: "010-4002-4002",
        office: "02-4002-4002",
        address: "\uC11C\uC6B8 \uC11C\uCD08\uAD6C",
        status: "active",
        createdAt: currentDate
      },
      {
        username: "assessor03",
        password: hashedPassword,
        role: "\uC2EC\uC0AC\uC0AC",
        name: "\uBC30\uC900\uC601",
        company: "\uD50C\uB85D\uC2A8",
        department: "\uC2EC\uC0AC\uD300",
        position: "\uC120\uC784\uC2EC\uC0AC\uC0AC",
        email: "assessor03@floxn.com",
        phone: "010-4003-4003",
        office: "02-4003-4003",
        address: "\uC11C\uC6B8 \uC1A1\uD30C\uAD6C",
        status: "active",
        createdAt: currentDate
      },
      {
        username: "assessor04",
        password: hashedPassword,
        role: "\uC2EC\uC0AC\uC0AC",
        name: "\uD669\uC2DC\uC6B0",
        company: "\uD50C\uB85D\uC2A8",
        department: "\uC2EC\uC0AC\uD300",
        position: "\uC2EC\uC0AC\uC0AC",
        email: "assessor04@floxn.com",
        phone: "010-4004-4004",
        office: "02-4004-4004",
        address: "\uC11C\uC6B8 \uB9C8\uD3EC\uAD6C",
        status: "active",
        createdAt: currentDate
      },
      {
        username: "assessor05",
        password: hashedPassword,
        role: "\uC2EC\uC0AC\uC0AC",
        name: "\uC11C\uC740\uBE44",
        company: "\uD50C\uB85D\uC2A8",
        department: "\uC2EC\uC0AC\uD300",
        position: "\uC2EC\uC0AC\uC0AC",
        email: "assessor05@floxn.com",
        phone: "010-4005-4005",
        office: "02-4005-4005",
        address: "\uC11C\uC6B8 \uAC15\uB3D9\uAD6C",
        status: "active",
        createdAt: currentDate
      },
      // ===== 조사사 5명 =====
      {
        username: "investigator01",
        password: hashedPassword,
        role: "\uC870\uC0AC\uC0AC",
        name: "\uC548\uC7AC\uD604",
        company: "\uD50C\uB85D\uC2A8",
        department: "\uC870\uC0AC\uD300",
        position: "\uC218\uC11D\uC870\uC0AC\uC0AC",
        email: "investigator01@floxn.com",
        phone: "010-5001-5001",
        office: "02-5001-5001",
        address: "\uC11C\uC6B8 \uAC15\uB0A8\uAD6C",
        status: "active",
        createdAt: currentDate
      },
      {
        username: "investigator02",
        password: hashedPassword,
        role: "\uC870\uC0AC\uC0AC",
        name: "\uC870\uC544\uB77C",
        company: "\uD50C\uB85D\uC2A8",
        department: "\uC870\uC0AC\uD300",
        position: "\uCC45\uC784\uC870\uC0AC\uC0AC",
        email: "investigator02@floxn.com",
        phone: "010-5002-5002",
        office: "02-5002-5002",
        address: "\uC11C\uC6B8 \uC131\uB3D9\uAD6C",
        status: "active",
        createdAt: currentDate
      },
      {
        username: "investigator03",
        password: hashedPassword,
        role: "\uC870\uC0AC\uC0AC",
        name: "\uD64D\uBBFC\uC7AC",
        company: "\uD50C\uB85D\uC2A8",
        department: "\uC870\uC0AC\uD300",
        position: "\uC120\uC784\uC870\uC0AC\uC0AC",
        email: "investigator03@floxn.com",
        phone: "010-5003-5003",
        office: "02-5003-5003",
        address: "\uC11C\uC6B8 \uAD11\uC9C4\uAD6C",
        status: "active",
        createdAt: currentDate
      },
      {
        username: "investigator04",
        password: hashedPassword,
        role: "\uC870\uC0AC\uC0AC",
        name: "\uD5C8\uC9C0\uC548",
        company: "\uD50C\uB85D\uC2A8",
        department: "\uC870\uC0AC\uD300",
        position: "\uC870\uC0AC\uC0AC",
        email: "investigator04@floxn.com",
        phone: "010-5004-5004",
        office: "02-5004-5004",
        address: "\uACBD\uAE30 \uC131\uB0A8\uC2DC",
        status: "active",
        createdAt: currentDate
      },
      {
        username: "investigator05",
        password: hashedPassword,
        role: "\uC870\uC0AC\uC0AC",
        name: "\uC1A1\uB2E4\uBE48",
        company: "\uD50C\uB85D\uC2A8",
        department: "\uC870\uC0AC\uD300",
        position: "\uC870\uC0AC\uC0AC",
        email: "investigator05@floxn.com",
        phone: "010-5005-5005",
        office: "02-5005-5005",
        address: "\uC11C\uC6B8 \uC6A9\uC0B0\uAD6C",
        status: "active",
        createdAt: currentDate
      }
    ];
    await db.insert(users).values(testUsers);
  }
  async getUser(id) {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }
  async getUserByUsername(username) {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }
  async getAllUsers() {
    const result = await db.select().from(users).where(eq(users.status, "active"));
    return result;
  }
  async createUser(insertUser) {
    const hashedPassword = await bcrypt.hash(insertUser.password, SALT_ROUNDS);
    const createdAt = getKSTDate();
    const newUser = {
      username: insertUser.username,
      password: hashedPassword,
      role: insertUser.role || "\uC0AC\uC6D0",
      name: insertUser.name,
      company: insertUser.company,
      department: insertUser.department || null,
      position: insertUser.position || null,
      email: insertUser.email || null,
      phone: insertUser.phone || null,
      office: insertUser.office || null,
      address: insertUser.address || null,
      bankName: insertUser.bankName || null,
      accountNumber: insertUser.accountNumber || null,
      accountHolder: insertUser.accountHolder || null,
      serviceRegions: insertUser.serviceRegions || null,
      attachments: insertUser.attachments || null,
      status: insertUser.status || "active",
      createdAt
    };
    const result = await db.insert(users).values(newUser).returning();
    return result[0];
  }
  async verifyPassword(username, password) {
    const user = await this.getUserByUsername(username);
    if (!user) {
      console.log("[VERIFY PASSWORD] User not found:", username);
      return null;
    }
    if (user.status === "deleted") {
      console.log("[VERIFY PASSWORD] Account deleted:", username);
      return null;
    }
    const isValid = await bcrypt.compare(password, user.password);
    console.log("[VERIFY PASSWORD]", {
      username,
      userExists: true,
      status: user.status,
      passwordValid: isValid,
      hasPasswordHash: !!user.password
    });
    return isValid ? user : null;
  }
  async updatePassword(username, newPassword) {
    const user = await this.getUserByUsername(username);
    if (!user) {
      return null;
    }
    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    const result = await db.update(users).set({ password: hashedPassword }).where(eq(users.username, username)).returning();
    return result[0] || null;
  }
  async updateUser(userId, userData) {
    const existingUser = await this.getUser(userId);
    if (!existingUser) {
      return null;
    }
    const result = await db.update(users).set(userData).where(eq(users.id, userId)).returning();
    return result[0] || null;
  }
  async deleteAccount(username) {
    const user = await this.getUserByUsername(username);
    if (!user) {
      return null;
    }
    const result = await db.update(users).set({ status: "deleted" }).where(eq(users.username, username)).returning();
    return result[0] || null;
  }
  async getCaseById(caseId) {
    const result = await db.select().from(cases).where(eq(cases.id, caseId)).limit(1);
    if (!result[0]) return null;
    const caseData = result[0];
    if (caseData.assignedPartner && (!caseData.assignedPartnerManager || !caseData.assignedPartnerContact)) {
      const partnerUsers = await db.select().from(users).where(
        and(
          eq(users.company, caseData.assignedPartner),
          eq(users.role, "\uD611\uB825\uC0AC")
        )
      ).limit(1);
      if (partnerUsers.length > 0) {
        const partnerUser = partnerUsers[0];
        const updatedFields = {};
        if (!caseData.assignedPartnerManager && partnerUser.name) {
          updatedFields.assignedPartnerManager = partnerUser.name;
        }
        if (!caseData.assignedPartnerContact && partnerUser.phone) {
          updatedFields.assignedPartnerContact = partnerUser.phone;
        }
        if (Object.keys(updatedFields).length > 0) {
          const updated = await db.update(cases).set(updatedFields).where(eq(cases.id, caseId)).returning();
          if (updated.length > 0) {
            return updated[0];
          }
        }
      }
    }
    return caseData;
  }
  async getAssignedCasesForUser(user, search) {
    let query = db.select().from(cases);
    switch (user.role) {
      case "\uC2EC\uC0AC\uC0AC":
        query = query.where(eq(cases.assessorId, user.id));
        break;
      case "\uD611\uB825\uC0AC":
        query = query.where(eq(cases.assignedPartner, user.company));
        break;
      case "\uC870\uC0AC\uC0AC":
        query = query.where(eq(cases.investigatorTeamName, user.company));
        break;
      case "\uAD00\uB9AC\uC790":
        break;
      default:
        return [];
    }
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      query = query.where(
        or(
          like(cases.caseNumber, searchTerm),
          like(cases.insuredName, searchTerm),
          like(cases.insuranceCompany, searchTerm)
        )
      );
    }
    const results = await query;
    return results;
  }
  async getNextCaseSequence(date, insuranceAccidentNo) {
    if (insuranceAccidentNo) {
      const existingCases = await db.select({ caseNumber: cases.caseNumber }).from(cases).where(eq(cases.insuranceAccidentNo, insuranceAccidentNo));
      if (existingCases.length > 0) {
        const firstCaseNumber = existingCases[0].caseNumber;
        if (firstCaseNumber) {
          const parts = firstCaseNumber.split("-");
          if (parts.length >= 2) {
            const prefix2 = parts[0];
            let maxSuffix = -1;
            for (const c of existingCases) {
              if (c.caseNumber && c.caseNumber.startsWith(prefix2 + "-")) {
                const suffixStr = c.caseNumber.split("-")[1];
                const suffix = parseInt(suffixStr, 10);
                if (!isNaN(suffix) && suffix > maxSuffix) {
                  maxSuffix = suffix;
                }
              }
            }
            return { prefix: prefix2, suffix: maxSuffix + 1 };
          }
        }
      }
    }
    const dateParts = date.split("-");
    const year = dateParts[0].substring(2);
    const month = dateParts[1];
    const day = dateParts[2];
    const datePrefix = year + month + day;
    const allCases = await db.select({ caseNumber: cases.caseNumber }).from(cases).where(sql3`${cases.caseNumber} LIKE ${datePrefix + "%"}`);
    let maxSequence = 0;
    for (const c of allCases) {
      if (c.caseNumber && c.caseNumber.startsWith(datePrefix)) {
        const parts = c.caseNumber.split("-");
        if (parts.length >= 1) {
          const sequencePart = parts[0].substring(6);
          const seq = parseInt(sequencePart, 10);
          if (!isNaN(seq) && seq > maxSequence) {
            maxSequence = seq;
          }
        }
      }
    }
    const nextSequence = maxSequence + 1;
    const seqStr = String(nextSequence).padStart(3, "0");
    const prefix = `${datePrefix}${seqStr}`;
    return { prefix, suffix: 0 };
  }
  async createCase(caseData) {
    const currentDate = getKSTDate();
    const status = caseData.status || "\uC791\uC131\uC911";
    let autoReceptionDate = caseData.receptionDate || null;
    let autoAssignmentDate = caseData.assignmentDate || null;
    if (status === "\uC811\uC218\uC644\uB8CC") {
      if (!autoReceptionDate) {
        autoReceptionDate = currentDate;
      }
      if (!autoAssignmentDate) {
        autoAssignmentDate = currentDate;
      }
    }
    const newCase = {
      caseNumber: caseData.caseNumber,
      status,
      accidentDate: caseData.accidentDate || null,
      insuranceCompany: caseData.insuranceCompany || null,
      insurancePolicyNo: caseData.insurancePolicyNo || null,
      insuranceAccidentNo: caseData.insuranceAccidentNo || null,
      clientResidence: caseData.clientResidence || null,
      clientDepartment: caseData.clientDepartment || null,
      clientName: caseData.clientName || null,
      clientContact: caseData.clientContact || null,
      assessorId: caseData.assessorId || null,
      assessorDepartment: caseData.assessorDepartment || null,
      assessorTeam: caseData.assessorTeam || null,
      assessorContact: caseData.assessorContact || null,
      investigatorTeam: caseData.investigatorTeam || null,
      investigatorDepartment: caseData.investigatorDepartment || null,
      investigatorTeamName: caseData.investigatorTeamName || null,
      investigatorContact: caseData.investigatorContact || null,
      policyHolderName: caseData.policyHolderName || null,
      policyHolderIdNumber: caseData.policyHolderIdNumber || null,
      policyHolderAddress: caseData.policyHolderAddress || null,
      insuredName: caseData.insuredName || null,
      insuredIdNumber: caseData.insuredIdNumber || null,
      insuredContact: caseData.insuredContact || null,
      insuredAddress: caseData.insuredAddress || null,
      insuredAddressDetail: caseData.insuredAddressDetail || null,
      victimName: caseData.victimName || null,
      victimContact: caseData.victimContact || null,
      sameAsPolicyHolder: caseData.sameAsPolicyHolder != null ? String(caseData.sameAsPolicyHolder) : null,
      clientPhone: caseData.clientPhone || null,
      clientAddress: caseData.clientAddress || null,
      accidentLocation: caseData.accidentLocation || null,
      accidentDescription: caseData.accidentDescription || null,
      accidentType: caseData.accidentType || null,
      accidentCause: caseData.accidentCause || null,
      restorationMethod: caseData.restorationMethod || null,
      otherVendorEstimate: caseData.otherVendorEstimate || null,
      damageItems: caseData.damageItems || null,
      damagePreventionCost: caseData.damagePreventionCost || null,
      victimIncidentAssistance: caseData.victimIncidentAssistance || null,
      assignedPartner: caseData.assignedPartner || null,
      assignedPartnerManager: caseData.assignedPartnerManager || null,
      assignedPartnerContact: caseData.assignedPartnerContact || null,
      urgency: caseData.urgency || null,
      specialRequests: caseData.specialRequests || null,
      progressStatus: caseData.progressStatus || null,
      specialNotes: caseData.specialNotes || null,
      receptionDate: autoReceptionDate,
      assignmentDate: autoAssignmentDate,
      siteVisitDate: caseData.siteVisitDate || null,
      assignedTo: caseData.assignedTo || null,
      managerId: caseData.managerId || null,
      createdBy: caseData.createdBy,
      createdAt: currentDate,
      updatedAt: currentDate
    };
    const result = await db.insert(cases).values(newCase).returning();
    return result[0];
  }
  async getAllCases(user) {
    let query = db.select().from(cases);
    if (user) {
      switch (user.role) {
        case "\uAD00\uB9AC\uC790":
          break;
        case "\uD611\uB825\uC0AC":
          query = query.where(eq(cases.assignedPartner, user.company));
          break;
        case "\uBCF4\uD5D8\uC0AC":
          query = query.where(eq(cases.insuranceCompany, user.company));
          break;
        case "\uC2EC\uC0AC\uC0AC":
          query = query.where(eq(cases.assessorId, user.id));
          break;
        case "\uC870\uC0AC\uC0AC":
          query = query.where(eq(cases.investigatorTeamName, user.company));
          break;
        case "\uC758\uB8B0\uC0AC":
          query = query.where(eq(cases.clientName, user.name));
          break;
        default:
          return [];
      }
    }
    const allCases = await query.orderBy(asc(cases.createdAt));
    const allProgressUpdates = await db.select().from(progressUpdates);
    const allUsers = await db.select().from(users);
    const userMap = new Map(allUsers.map((u) => [u.id, u]));
    console.log(`[getAllCases] Total users in userMap: ${userMap.size}`);
    const casesWithProgress = allCases.map(
      (caseItem) => {
        const caseUpdates = allProgressUpdates.filter((update) => update.caseId === caseItem.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        const latestUpdate = caseUpdates[0];
        const manager = caseItem.managerId ? userMap.get(caseItem.managerId) : null;
        console.log(
          `[getAllCases] Case ${caseItem.caseNumber}: managerId=${caseItem.managerId || "NULL"}, found: ${manager?.name || "-"}`
        );
        return {
          ...caseItem,
          latestProgress: latestUpdate ? {
            content: latestUpdate.content,
            createdAt: latestUpdate.createdAt
          } : null,
          managerName: manager?.name || null
        };
      }
    );
    return casesWithProgress;
  }
  async updateCase(caseId, caseData) {
    const currentDate = getKSTDate();
    const existingCase = await this.getCaseById(caseId);
    const additionalUpdates = {};
    if (caseData.assignedPartner && existingCase && !existingCase.assignmentDate) {
      additionalUpdates.assignmentDate = currentDate;
    }
    const updateData = { ...caseData, ...additionalUpdates, updatedAt: currentDate };
    const result = await db.update(cases).set(updateData).where(eq(cases.id, caseId)).returning();
    if (result.length === 0) {
      return null;
    }
    return result[0];
  }
  async deleteCase(caseId) {
    const caseEstimates = await db.select({ id: estimates.id }).from(estimates).where(eq(estimates.caseId, caseId));
    for (const estimate of caseEstimates) {
      await db.delete(estimateRows).where(eq(estimateRows.estimateId, estimate.id));
    }
    await db.delete(estimates).where(eq(estimates.caseId, caseId));
    await db.delete(caseDocuments).where(eq(caseDocuments.caseId, caseId));
    await db.delete(progressUpdates).where(eq(progressUpdates.caseId, caseId));
    await db.delete(drawings).where(eq(drawings.caseId, caseId));
    await db.delete(cases).where(eq(cases.id, caseId));
  }
  async updateCaseStatus(caseId, status) {
    const currentDate = getKSTDate();
    const normalizedStatus = status === "\uBBF8\uBCF5\uAD6C" ? "\uCD9C\uB3D9\uBE44 \uCCAD\uAD6C" : status;
    const existingCase = await this.getCaseById(caseId);
    if (!existingCase) {
      return null;
    }
    const dateUpdates = {};
    switch (normalizedStatus) {
      case "\uC811\uC218\uC644\uB8CC":
        if (!existingCase.receptionDate) {
          dateUpdates.receptionDate = currentDate;
        }
        if (!existingCase.assignmentDate) {
          dateUpdates.assignmentDate = currentDate;
        }
        break;
      case "\uD604\uC7A5\uBC29\uBB38":
        if (!existingCase.siteVisitDate) {
          dateUpdates.siteVisitDate = currentDate;
        }
        break;
      case "\uD604\uC7A5\uC815\uBCF4\uC785\uB825":
      case "\uD604\uC7A5\uC815\uBCF4\uC81C\uCD9C":
        if (!existingCase.siteInvestigationSubmitDate) {
          dateUpdates.siteInvestigationSubmitDate = currentDate;
        }
        break;
      case "1\uCC28\uC2B9\uC778":
        if (!existingCase.firstApprovalDate) {
          dateUpdates.firstApprovalDate = currentDate;
        }
        break;
      case "\uBCF5\uAD6C\uC694\uCCAD(2\uCC28\uC2B9\uC778)":
        if (!existingCase.secondApprovalDate) {
          dateUpdates.secondApprovalDate = currentDate;
        }
        if (existingCase.estimateAmount) {
          dateUpdates.approvedAmount = existingCase.estimateAmount;
        }
        break;
      case "(\uC9C1\uC811\uBCF5\uAD6C\uC778 \uACBD\uC6B0) \uCCAD\uAD6C\uC790\uB8CC\uC81C\uCD9C":
      case "(\uC120\uACAC\uC801\uC694\uCCAD\uC778 \uACBD\uC6B0) \uCD9C\uB3D9\uBE44 \uCCAD\uAD6C":
        if (!existingCase.constructionCompletionDate) {
          dateUpdates.constructionCompletionDate = currentDate;
        }
        break;
      case "\uCCAD\uAD6C":
        if (!existingCase.claimDate) {
          dateUpdates.claimDate = currentDate;
        }
        break;
      case "\uC785\uAE08\uC644\uB8CC":
        if (!existingCase.paymentCompletedDate) {
          dateUpdates.paymentCompletedDate = currentDate;
        }
        break;
      case "\uBD80\uBD84\uC785\uAE08":
        if (!existingCase.partialPaymentDate) {
          dateUpdates.partialPaymentDate = currentDate;
        }
        break;
      case "\uC815\uC0B0\uC644\uB8CC":
        if (!existingCase.settlementCompletedDate) {
          dateUpdates.settlementCompletedDate = currentDate;
        }
        break;
    }
    let recoveryTypeUpdate = {};
    if (normalizedStatus === "\uC9C1\uC811\uBCF5\uAD6C" || normalizedStatus === "(\uC9C1\uC811\uBCF5\uAD6C\uC778 \uACBD\uC6B0) \uCCAD\uAD6C\uC790\uB8CC\uC81C\uCD9C") {
      recoveryTypeUpdate.recoveryType = "\uC9C1\uC811\uBCF5\uAD6C";
    } else if (normalizedStatus === "\uC120\uACAC\uC801\uC694\uCCAD" || normalizedStatus === "(\uC120\uACAC\uC801\uC694\uCCAD\uC778 \uACBD\uC6B0) \uCD9C\uB3D9\uBE44 \uCCAD\uAD6C") {
      recoveryTypeUpdate.recoveryType = "\uC120\uACAC\uC801\uC694\uCCAD";
    }
    const result = await db.update(cases).set({
      status: normalizedStatus,
      updatedAt: currentDate,
      ...dateUpdates,
      ...recoveryTypeUpdate
    }).where(eq(cases.id, caseId)).returning();
    if (result.length === 0) {
      return null;
    }
    return result[0];
  }
  async updateCaseSpecialNotes(caseId, specialNotes) {
    const currentDate = getKSTDate();
    const result = await db.update(cases).set({
      specialNotes,
      specialNotesConfirmedBy: null,
      updatedAt: currentDate
    }).where(eq(cases.id, caseId)).returning();
    if (result.length === 0) {
      return null;
    }
    return result[0];
  }
  async confirmCaseSpecialNotes(caseId, confirmedBy) {
    const currentDate = getKSTDate();
    const result = await db.update(cases).set({ specialNotesConfirmedBy: confirmedBy, updatedAt: currentDate }).where(eq(cases.id, caseId)).returning();
    if (result.length === 0) {
      return null;
    }
    return result[0];
  }
  async updateCaseAdditionalNotes(caseId, additionalNotes) {
    const currentDate = getKSTDate();
    const result = await db.update(cases).set({ additionalNotes, updatedAt: currentDate }).where(eq(cases.id, caseId)).returning();
    if (result.length === 0) {
      return null;
    }
    return result[0];
  }
  async updateCaseEstimateAmount(caseId, estimateAmount) {
    const currentDate = getKSTDate();
    const result = await db.update(cases).set({ estimateAmount, updatedAt: currentDate }).where(eq(cases.id, caseId)).returning();
    if (result.length === 0) {
      return null;
    }
    return result[0];
  }
  async submitFieldSurvey(caseId, estimateInfo) {
    const currentDate = getKSTDate();
    const existingCase = await this.getCaseById(caseId);
    const additionalUpdates = {};
    if (existingCase && !existingCase.siteInvestigationSubmitDate) {
      additionalUpdates.siteInvestigationSubmitDate = currentDate;
    }
    if (existingCase && !existingCase.initialEstimateAmount && existingCase.estimateAmount) {
      additionalUpdates.initialEstimateAmount = existingCase.estimateAmount;
    }
    if (existingCase && estimateInfo) {
      if (estimateInfo.isPrevention && !existingCase.initialPreventionEstimateAmount) {
        additionalUpdates.initialPreventionEstimateAmount = estimateInfo.estimateTotal;
      } else if (!estimateInfo.isPrevention && !existingCase.initialPropertyEstimateAmount) {
        additionalUpdates.initialPropertyEstimateAmount = estimateInfo.estimateTotal;
      }
    }
    const result = await db.update(cases).set({
      fieldSurveyStatus: "submitted",
      status: "\uAC80\uD1A0\uC911",
      ...additionalUpdates,
      updatedAt: currentDate
    }).where(eq(cases.id, caseId)).returning();
    if (result.length === 0) {
      return null;
    }
    return result[0];
  }
  async reviewCase(caseId, decision, reviewComment, reviewedBy) {
    const currentDate = getKSTDate();
    const currentTimestamp = getKSTTimestamp();
    const existingCase = await this.getCaseById(caseId);
    const additionalUpdates = {};
    if (decision === "\uC2B9\uC778" && existingCase && !existingCase.firstApprovalDate) {
      additionalUpdates.firstApprovalDate = currentDate;
      if (existingCase.estimateAmount) {
        additionalUpdates.approvedAmount = existingCase.estimateAmount;
      }
    }
    const result = await db.update(cases).set({
      reviewDecision: decision,
      reviewComment: reviewComment || null,
      reviewedAt: currentTimestamp,
      reviewedBy,
      status: decision === "\uC2B9\uC778" ? "1\uCC28\uC2B9\uC778" : "\uBC18\uB824",
      ...additionalUpdates,
      updatedAt: currentDate
    }).where(eq(cases.id, caseId)).returning();
    if (result.length === 0) {
      return null;
    }
    return result[0];
  }
  async approveReport(caseId, decision, approvalComment, approvedBy) {
    const currentDate = getKSTDate();
    const currentTimestamp = getKSTTimestamp();
    const existingCase = await this.getCaseById(caseId);
    if (!existingCase || existingCase.status !== "\uD604\uC7A5\uC815\uBCF4\uC81C\uCD9C") {
      return null;
    }
    const additionalUpdates = {};
    if (decision === "\uC2B9\uC778" && existingCase && !existingCase.secondApprovalDate) {
      additionalUpdates.secondApprovalDate = currentDate;
    }
    const result = await db.update(cases).set({
      reportApprovalDecision: decision,
      reportApprovalComment: approvalComment || null,
      reportApprovedAt: currentTimestamp,
      reportApprovedBy: approvedBy,
      // 승인 시 상태를 "복구요청(2차승인)"으로 변경
      status: decision === "\uC2B9\uC778" ? "\uBCF5\uAD6C\uC694\uCCAD(2\uCC28\uC2B9\uC778)" : existingCase.status,
      ...additionalUpdates,
      updatedAt: currentDate
    }).where(eq(cases.id, caseId)).returning();
    if (result.length === 0) {
      return null;
    }
    return result[0];
  }
  async updateCaseFieldSurvey(caseId, fieldData) {
    const currentDate = getKSTDate();
    const existingCase = await this.getCaseById(caseId);
    const additionalUpdates = {};
    if (fieldData.visitDate && existingCase && !existingCase.siteVisitDate) {
      additionalUpdates.siteVisitDate = currentDate;
    }
    if (fieldData.fieldSurveyStatus === "submitted" && !fieldData.status) {
      additionalUpdates.status = "\uAC80\uD1A0\uC911";
    }
    const result = await db.update(cases).set({ ...fieldData, ...additionalUpdates, updatedAt: currentDate }).where(eq(cases.id, caseId)).returning();
    if (result.length === 0) {
      return null;
    }
    return result[0];
  }
  async getPartnerStats() {
    const allCases = await db.select().from(cases);
    const allUsers = await db.select().from(users).where(eq(users.role, "\uD611\uB825\uC0AC"));
    const today = getKSTDate();
    const currentMonth = today.substring(0, 7);
    return allUsers.map((partner) => {
      const partnerCases = allCases.filter(
        (c) => c.assignedPartner === partner.company
      );
      const dailyCount = partnerCases.filter(
        (c) => c.createdAt === today
      ).length;
      const monthlyCount = partnerCases.filter(
        (c) => c.createdAt?.startsWith(currentMonth)
      ).length;
      const inProgressCount = partnerCases.filter(
        (c) => c.status !== "\uC791\uC131\uC911" && c.status !== "\uC644\uB8CC"
      ).length;
      const pendingCount = partnerCases.filter(
        (c) => c.status !== "\uC644\uB8CC"
      ).length;
      return {
        partnerName: partner.company,
        dailyCount,
        monthlyCount,
        inProgressCount,
        pendingCount
      };
    });
  }
  async createProgressUpdate(data) {
    const currentTimestamp = getKSTTimestamp();
    const newUpdate = {
      caseId: data.caseId,
      content: data.content,
      createdBy: data.createdBy,
      createdAt: currentTimestamp
    };
    const result = await db.insert(progressUpdates).values(newUpdate).returning();
    return result[0];
  }
  async getProgressUpdatesByCaseId(caseId) {
    const result = await db.select().from(progressUpdates).where(eq(progressUpdates.caseId, caseId)).orderBy(asc(progressUpdates.createdAt));
    return result;
  }
  async getStatisticsFilters() {
    const allCases = await db.select().from(cases);
    const allUsers = await db.select().from(users).where(eq(users.status, "active"));
    const insuranceCompaniesSet = /* @__PURE__ */ new Set();
    allCases.forEach((caseItem) => {
      if (caseItem.insuranceCompany) {
        insuranceCompaniesSet.add(caseItem.insuranceCompany);
      }
    });
    const assessorsSet = /* @__PURE__ */ new Set();
    const investigatorsSet = /* @__PURE__ */ new Set();
    const partnersSet = /* @__PURE__ */ new Set();
    const settlementManagersSet = /* @__PURE__ */ new Set();
    allUsers.forEach((user) => {
      if (user.role === "\uC2EC\uC0AC\uC0AC" && user.company) {
        assessorsSet.add(user.company);
      } else if (user.role === "\uC870\uC0AC\uC0AC" && user.company) {
        investigatorsSet.add(user.company);
      } else if (user.role === "\uD611\uB825\uC0AC" && user.company) {
        partnersSet.add(user.company);
      }
      if (user.name) {
        settlementManagersSet.add(user.name);
      }
    });
    return {
      insuranceCompanies: Array.from(insuranceCompaniesSet).sort(),
      assessors: Array.from(assessorsSet).sort(),
      investigators: Array.from(investigatorsSet).sort(),
      partners: Array.from(partnersSet).sort(),
      settlementManagers: Array.from(settlementManagersSet).sort()
    };
  }
  async getRolePermission(roleName) {
    const result = await db.select().from(rolePermissions).where(eq(rolePermissions.roleName, roleName));
    return result[0];
  }
  async saveRolePermission(data) {
    const currentDate = getKSTTimestamp();
    const existing = await this.getRolePermission(data.roleName);
    if (existing) {
      const updated = await db.update(rolePermissions).set({
        permissions: data.permissions,
        updatedAt: currentDate
      }).where(eq(rolePermissions.roleName, data.roleName)).returning();
      return updated[0];
    } else {
      const created = await db.insert(rolePermissions).values({
        roleName: data.roleName,
        permissions: data.permissions,
        createdAt: currentDate,
        updatedAt: currentDate
      }).returning();
      return created[0];
    }
  }
  async deleteRolePermission(roleName) {
    const deleted = await db.delete(rolePermissions).where(eq(rolePermissions.roleName, roleName)).returning();
    return deleted.length > 0;
  }
  async getAllRolePermissions() {
    return await db.select().from(rolePermissions);
  }
  // New methods for multi-version support
  async listExcelData(type) {
    const result = await db.select().from(excelData).where(eq(excelData.type, type)).orderBy(desc(excelData.uploadedAt));
    return result;
  }
  async getExcelDataById(id) {
    const result = await db.select().from(excelData).where(eq(excelData.id, id)).limit(1);
    return result[0] || null;
  }
  async deleteExcelDataById(id) {
    const deleted = await db.delete(excelData).where(eq(excelData.id, id)).returning();
    return deleted.length > 0;
  }
  async saveExcelData(data) {
    console.log("[DB] saveExcelData called with:", {
      type: data.type,
      title: data.title
    });
    const created = await db.insert(excelData).values({
      type: data.type,
      title: data.title,
      headers: data.headers,
      data: data.data
    }).returning();
    console.log("[DB] saveExcelData result:", {
      id: created[0]?.id,
      type: created[0]?.type
    });
    const verify = await db.select().from(excelData).where(eq(excelData.id, created[0].id));
    console.log(
      "[DB] saveExcelData verification:",
      verify.length > 0 ? "EXISTS" : "MISSING"
    );
    return created[0];
  }
  async updateExcelData(id, headers, newData) {
    const updated = await db.update(excelData).set({
      headers,
      data: newData,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(excelData.id, id)).returning();
    return updated[0] || null;
  }
  // Legacy methods (deprecated, for backward compatibility during migration)
  async getExcelData(type) {
    const versions = await this.listExcelData(type);
    return versions[0] || null;
  }
  async deleteExcelData(type) {
    await db.delete(excelData).where(eq(excelData.type, type));
  }
  async createInquiry(data) {
    const created = await db.insert(inquiries).values({
      userId: data.userId,
      title: data.title,
      content: data.content,
      status: data.status || "\uB300\uAE30",
      response: data.response || null,
      respondedBy: data.respondedBy || null,
      respondedAt: data.respondedAt || null
    }).returning();
    return created[0];
  }
  async getAllInquiries() {
    return await db.select().from(inquiries).orderBy(asc(inquiries.createdAt));
  }
  async getInquiriesByUserId(userId) {
    return await db.select().from(inquiries).where(eq(inquiries.userId, userId)).orderBy(asc(inquiries.createdAt));
  }
  async updateInquiry(id, data) {
    const updated = await db.update(inquiries).set({
      ...data,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(inquiries.id, id)).returning();
    return updated[0] || null;
  }
  async saveDrawing(data) {
    const created = await db.insert(drawings).values({
      caseId: data.caseId,
      uploadedImages: data.uploadedImages,
      rectangles: data.rectangles,
      accidentAreas: data.accidentAreas,
      leakMarkers: data.leakMarkers,
      createdBy: data.createdBy
    }).returning();
    return created[0];
  }
  async getDrawing(id) {
    const result = await db.select().from(drawings).where(eq(drawings.id, id)).limit(1);
    return result[0] || null;
  }
  async getDrawingByCaseId(caseId) {
    const result = await db.select().from(drawings).where(eq(drawings.caseId, caseId)).limit(1);
    return result[0] || null;
  }
  async updateDrawing(id, data) {
    const updated = await db.update(drawings).set({
      ...data,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(drawings.id, id)).returning();
    return updated[0] || null;
  }
  async getOrCreateActiveCase(userId) {
    const existing = await db.select().from(cases).where(and(eq(cases.createdBy, userId), eq(cases.status, "\uC791\uC131\uC911"))).limit(1);
    if (existing.length > 0) {
      return existing[0];
    }
    const caseNumber = `CLM-DRAW-${Date.now()}`;
    const newCase = await db.insert(cases).values({
      caseNumber,
      status: "\uC791\uC131\uC911",
      createdBy: userId,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    }).returning();
    return newCase[0];
  }
  // Document methods
  async saveDocument(data) {
    const created = await db.insert(caseDocuments).values({
      caseId: data.caseId,
      category: data.category,
      fileName: data.fileName,
      fileType: data.fileType,
      fileSize: data.fileSize,
      fileData: data.fileData,
      createdBy: data.createdBy
    }).returning();
    return created[0];
  }
  async getDocument(id) {
    const result = await db.select().from(caseDocuments).where(eq(caseDocuments.id, id)).limit(1);
    return result[0] || null;
  }
  async getDocumentFileData(id) {
    const result = await db.select({ fileData: caseDocuments.fileData }).from(caseDocuments).where(eq(caseDocuments.id, id)).limit(1);
    return result[0]?.fileData || null;
  }
  async getDocumentsByCaseId(caseId) {
    const result = await db.select().from(caseDocuments).where(eq(caseDocuments.caseId, caseId)).orderBy(desc(caseDocuments.createdAt));
    return result;
  }
  async deleteDocument(id) {
    await db.delete(caseDocuments).where(eq(caseDocuments.id, id));
  }
  async updateDocumentCategory(id, category) {
    const updated = await db.update(caseDocuments).set({ category }).where(eq(caseDocuments.id, id)).returning();
    return updated[0] || null;
  }
  // Estimate methods
  async createEstimateVersion(caseId, userId, rows, laborCostData = null, materialCostData = null, vatIncluded = true) {
    return await db.transaction(async (tx) => {
      const existingEstimates = await tx.select({ version: estimates.version }).from(estimates).where(eq(estimates.caseId, caseId)).orderBy(desc(estimates.version)).limit(1).for("update");
      const nextVersion = existingEstimates.length > 0 ? existingEstimates[0].version + 1 : 1;
      const enrichedMaterialCostData = {
        rows: materialCostData || [],
        vatIncluded
        // VAT 포함/별도 옵션 저장
      };
      const [newEstimate] = await tx.insert(estimates).values({
        caseId,
        version: nextVersion,
        status: "draft",
        createdBy: userId,
        laborCostData: Array.isArray(laborCostData) ? laborCostData : null,
        materialCostData: enrichedMaterialCostData
      }).returning();
      if (rows.length > 0) {
        const sortedInputRows = [...rows].sort((a, b) => {
          const orderA = a.rowOrder ?? 0;
          const orderB = b.rowOrder ?? 0;
          return orderA - orderB;
        });
        const rowsWithEstimateId = sortedInputRows.map((row, index) => ({
          ...row,
          estimateId: newEstimate.id,
          rowOrder: index + 1
          // 1부터 시작하는 순차적 번호
        }));
        const insertedRows = await tx.insert(estimateRows).values(rowsWithEstimateId).returning();
        const sortedRows = insertedRows.sort((a, b) => a.rowOrder - b.rowOrder);
        return { estimate: newEstimate, rows: sortedRows };
      }
      return { estimate: newEstimate, rows: [] };
    });
  }
  async getLatestEstimate(caseId) {
    const latestEstimate = await db.select().from(estimates).where(eq(estimates.caseId, caseId)).orderBy(desc(estimates.version)).limit(1);
    if (latestEstimate.length === 0) {
      return null;
    }
    const estimate = latestEstimate[0];
    const rows = await db.select().from(estimateRows).where(eq(estimateRows.estimateId, estimate.id)).orderBy(asc(estimateRows.rowOrder));
    return { estimate, rows };
  }
  async getEstimateVersion(caseId, version) {
    const result = await db.select().from(estimates).where(and(eq(estimates.caseId, caseId), eq(estimates.version, version))).limit(1);
    if (result.length === 0) {
      return null;
    }
    const estimate = result[0];
    const rows = await db.select().from(estimateRows).where(eq(estimateRows.estimateId, estimate.id)).orderBy(asc(estimateRows.rowOrder));
    return { estimate, rows };
  }
  async listEstimateVersions(caseId) {
    const allVersions = await db.select().from(estimates).where(eq(estimates.caseId, caseId)).orderBy(desc(estimates.version));
    return allVersions;
  }
  // Master data methods
  async getMasterData(category, includeInactive = false) {
    if (category) {
      if (includeInactive) {
        return await db.select().from(masterData).where(eq(masterData.category, category)).orderBy(asc(masterData.displayOrder), asc(masterData.value));
      } else {
        return await db.select().from(masterData).where(
          and(
            eq(masterData.category, category),
            eq(masterData.isActive, "true")
          )
        ).orderBy(asc(masterData.displayOrder), asc(masterData.value));
      }
    } else {
      if (includeInactive) {
        return await db.select().from(masterData).orderBy(
          asc(masterData.category),
          asc(masterData.displayOrder),
          asc(masterData.value)
        );
      } else {
        return await db.select().from(masterData).where(eq(masterData.isActive, "true")).orderBy(
          asc(masterData.category),
          asc(masterData.displayOrder),
          asc(masterData.value)
        );
      }
    }
  }
  async createMasterData(data) {
    const [created] = await db.insert(masterData).values(data).returning();
    return created;
  }
  async deleteMasterData(id) {
    await db.update(masterData).set({ isActive: "false", updatedAt: /* @__PURE__ */ new Date() }).where(eq(masterData.id, id));
  }
  async updateMasterData(id, data) {
    const [updated] = await db.update(masterData).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(masterData.id, id)).returning();
    return updated || null;
  }
  // Labor cost methods
  async getLaborCosts(filters) {
    let query = db.select().from(laborCosts);
    const conditions = [];
    if (filters?.category) {
      conditions.push(eq(laborCosts.category, filters.category));
    }
    if (filters?.workName) {
      conditions.push(eq(laborCosts.workName, filters.workName));
    }
    if (filters?.detailWork) {
      conditions.push(eq(laborCosts.detailWork, filters.detailWork));
    }
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    return await query.orderBy(
      asc(laborCosts.category),
      asc(laborCosts.workName)
    );
  }
  async getLaborCostOptions() {
    const allCosts = await db.select().from(laborCosts).orderBy(asc(laborCosts.category), asc(laborCosts.workName));
    const categories = /* @__PURE__ */ new Set();
    const workNamesByCategory = {};
    const detailWorksByWork = {};
    for (const cost of allCosts) {
      const category = cost.category?.trim();
      const workName = cost.workName?.trim();
      const detailWork = cost.detailWork?.trim();
      if (!category || !workName || !detailWork) continue;
      categories.add(category);
      if (!workNamesByCategory[category]) {
        workNamesByCategory[category] = /* @__PURE__ */ new Set();
      }
      workNamesByCategory[category].add(workName);
      const workKey = `${category}|${workName}`;
      if (!detailWorksByWork[workKey]) {
        detailWorksByWork[workKey] = /* @__PURE__ */ new Set();
      }
      detailWorksByWork[workKey].add(detailWork);
    }
    return {
      categories: Array.from(categories),
      workNamesByCategory: Object.fromEntries(
        Object.entries(workNamesByCategory).map(([k, v]) => [k, Array.from(v)])
      ),
      detailWorksByWork: Object.fromEntries(
        Object.entries(detailWorksByWork).map(([k, v]) => [k, Array.from(v)])
      )
    };
  }
  async createLaborCost(data) {
    const [created] = await db.insert(laborCosts).values(data).returning();
    return created;
  }
  async deleteLaborCost(id) {
    await db.delete(laborCosts).where(eq(laborCosts.id, Number(id)));
  }
  // Material methods
  async listMaterials(workType) {
    let query = db.select().from(materials);
    if (workType) {
      query = query.where(
        and(eq(materials.isActive, "true"), eq(materials.workType, workType))
      );
    } else {
      query = query.where(eq(materials.isActive, "true"));
    }
    return query.orderBy(
      asc(materials.workType),
      asc(materials.materialName),
      asc(materials.specification)
    );
  }
  async createMaterial(data) {
    const [created] = await db.insert(materials).values(data).returning();
    return created;
  }
  async deleteMaterial(id) {
    await db.delete(materials).where(eq(materials.id, Number(id)));
  }
  async getMaterialsCatalog() {
    const excelRows = await db.select().from(excelData).where(eq(excelData.type, "\uC790\uC7AC\uBE44")).orderBy(sql3`${excelData.uploadedAt} DESC`);
    if (excelRows.length === 0) {
      return [];
    }
    const latestExcelData = excelRows[0];
    const headers = latestExcelData.headers;
    const data = latestExcelData.data;
    const workTypeIdx = headers.findIndex((h) => h === "\uACF5\uC885\uBA85");
    const materialNameIdx = headers.findIndex((h) => h === "\uC790\uC7AC\uBA85");
    const specIdx = headers.findIndex((h) => h === "\uADDC\uACA9");
    const unitIdx = headers.findIndex((h) => h === "\uB2E8\uC704");
    const priceIdx = headers.findIndex((h) => h === "\uB2E8\uAC00");
    if (materialNameIdx === -1 || unitIdx === -1 || priceIdx === -1) {
      console.error("Missing required columns in excel_data \uC790\uC7AC\uBE44");
      return [];
    }
    let lastWorkType = "";
    let lastMaterialName = "";
    let lastSpecification = "";
    const catalog = [];
    for (const row of data) {
      if (!row || row.length === 0) continue;
      const workType = workTypeIdx !== -1 && row[workTypeIdx] ? row[workTypeIdx] : lastWorkType;
      const materialName = row[materialNameIdx] ?? lastMaterialName;
      const specification = row[specIdx] ?? lastSpecification;
      const unit = row[unitIdx];
      const price = row[priceIdx];
      if (!workType || !materialName || !unit || price === void 0 || price === null) {
        continue;
      }
      if (workTypeIdx !== -1 && row[workTypeIdx]) lastWorkType = workType;
      if (row[materialNameIdx]) lastMaterialName = materialName;
      if (row[specIdx] !== null && row[specIdx] !== void 0)
        lastSpecification = specification;
      let standardPrice = price;
      if (typeof price === "string") {
        const cleaned = price.replace(/,/g, "");
        const parsed = parseFloat(cleaned);
        standardPrice = isNaN(parsed) ? price : parsed;
      }
      catalog.push({
        workType,
        materialName,
        specification: specification || "-",
        unit,
        standardPrice
      });
    }
    return catalog;
  }
  // User favorites methods
  async getUserFavorites(userId) {
    const favorites = await db.select().from(userFavorites).where(eq(userFavorites.userId, userId)).orderBy(asc(userFavorites.createdAt));
    return favorites;
  }
  async addFavorite(data) {
    const [favorite] = await db.insert(userFavorites).values(data).returning();
    return favorite;
  }
  async removeFavorite(userId, menuName) {
    await db.delete(userFavorites).where(
      and(
        eq(userFavorites.userId, userId),
        eq(userFavorites.menuName, menuName)
      )
    );
  }
  // Notice methods
  async getAllNotices() {
    const allNotices = await db.select().from(notices).orderBy(desc(notices.createdAt));
    return allNotices;
  }
  async createNotice(data) {
    const [created] = await db.insert(notices).values(data).returning();
    return created;
  }
  async updateNotice(id, data) {
    const [updated] = await db.update(notices).set({
      title: data.title,
      content: data.content,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(notices.id, id)).returning();
    return updated || null;
  }
  async deleteNotice(id) {
    await db.delete(notices).where(eq(notices.id, id));
  }
  // Asset cloning methods (for syncing from related cases)
  async getRelatedCaseWithDrawing(caseId) {
    const sourceCase = await this.getCaseById(caseId);
    if (!sourceCase || !sourceCase.insuranceAccidentNo) return null;
    const relatedCases = await this.getCasesByAccidentNo(
      sourceCase.insuranceAccidentNo,
      caseId
    );
    for (const relatedCase of relatedCases) {
      const drawing = await this.getDrawingByCaseId(relatedCase.id);
      if (drawing) {
        return {
          caseId: relatedCase.id,
          caseNumber: relatedCase.caseNumber || ""
        };
      }
    }
    return null;
  }
  async getAllRelatedCasesWithDrawings(caseId) {
    const sourceCase = await this.getCaseById(caseId);
    if (!sourceCase || !sourceCase.insuranceAccidentNo) return [];
    const relatedCases = await this.getCasesByAccidentNo(
      sourceCase.insuranceAccidentNo,
      caseId
    );
    const casesWithDrawings = [];
    for (const relatedCase of relatedCases) {
      const drawing = await this.getDrawingByCaseId(relatedCase.id);
      if (drawing) {
        casesWithDrawings.push({
          caseId: relatedCase.id,
          caseNumber: relatedCase.caseNumber || ""
        });
      }
    }
    return casesWithDrawings;
  }
  async getRelatedCaseWithEstimate(caseId) {
    const sourceCase = await this.getCaseById(caseId);
    if (!sourceCase || !sourceCase.insuranceAccidentNo) return null;
    const relatedCases = await this.getCasesByAccidentNo(
      sourceCase.insuranceAccidentNo,
      caseId
    );
    for (const relatedCase of relatedCases) {
      const estimate = await this.getLatestEstimate(relatedCase.id);
      if (estimate) {
        return {
          caseId: relatedCase.id,
          caseNumber: relatedCase.caseNumber || ""
        };
      }
    }
    return null;
  }
  async getRelatedCaseWithDocuments(caseId) {
    const sourceCase = await this.getCaseById(caseId);
    if (!sourceCase || !sourceCase.insuranceAccidentNo) return null;
    const relatedCases = await this.getCasesByAccidentNo(
      sourceCase.insuranceAccidentNo,
      caseId
    );
    for (const relatedCase of relatedCases) {
      const docs = await this.getDocumentsByCaseId(relatedCase.id);
      if (docs && docs.length > 0) {
        return {
          caseId: relatedCase.id,
          caseNumber: relatedCase.caseNumber || "",
          documentCount: docs.length
        };
      }
    }
    return null;
  }
  async cloneDrawingFromCase(sourceCaseId, targetCaseId, userId) {
    const sourceDrawing = await this.getDrawingByCaseId(sourceCaseId);
    if (!sourceDrawing) return null;
    const existingDrawing = await this.getDrawingByCaseId(targetCaseId);
    if (existingDrawing) {
      const updated = await this.updateDrawing(existingDrawing.id, {
        uploadedImages: sourceDrawing.uploadedImages,
        rectangles: sourceDrawing.rectangles,
        accidentAreas: sourceDrawing.accidentAreas,
        leakMarkers: sourceDrawing.leakMarkers
      });
      return updated;
    }
    const newDrawing = await this.saveDrawing({
      caseId: targetCaseId,
      uploadedImages: sourceDrawing.uploadedImages,
      rectangles: sourceDrawing.rectangles,
      accidentAreas: sourceDrawing.accidentAreas,
      leakMarkers: sourceDrawing.leakMarkers,
      createdBy: userId
    });
    return newDrawing;
  }
  async cloneEstimateFromCase(sourceCaseId, targetCaseId, userId) {
    const sourceEstimate = await this.getLatestEstimate(sourceCaseId);
    if (!sourceEstimate) return null;
    const rowsData = sourceEstimate.rows.map((row) => ({
      category: row.category,
      location: row.location,
      workName: row.workName,
      damageWidth: row.damageWidth,
      damageHeight: row.damageHeight,
      damageArea: row.damageArea,
      repairWidth: row.repairWidth,
      repairHeight: row.repairHeight,
      repairArea: row.repairArea,
      note: row.note,
      rowOrder: row.rowOrder
    }));
    const newEstimate = await this.createEstimateVersion(
      targetCaseId,
      userId,
      rowsData,
      sourceEstimate.estimate.laborCostData,
      sourceEstimate.estimate.materialCostData
    );
    return newEstimate;
  }
  async cloneDocumentsFromCase(sourceCaseId, targetCaseId, userId) {
    const sourceDocuments = await this.getDocumentsByCaseId(sourceCaseId);
    if (!sourceDocuments || sourceDocuments.length === 0) return [];
    const clonedDocuments = [];
    for (const doc of sourceDocuments) {
      const newDoc = await this.saveDocument({
        caseId: targetCaseId,
        category: doc.category,
        fileName: doc.fileName,
        fileType: doc.fileType,
        fileSize: doc.fileSize,
        fileData: doc.fileData,
        createdBy: userId
      });
      clonedDocuments.push(newDoc);
    }
    return clonedDocuments;
  }
  // Field Survey Data methods
  async getFieldSurveyData(caseGroupId) {
    const [result] = await db.select().from(fieldSurveyData).where(eq(fieldSurveyData.caseGroupId, caseGroupId)).limit(1);
    return result || null;
  }
  async saveFieldSurveyData(data) {
    const [created] = await db.insert(fieldSurveyData).values(data).returning();
    return created;
  }
  async updateFieldSurveyData(caseGroupId, data) {
    const [updated] = await db.update(fieldSurveyData).set({
      ...data,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(fieldSurveyData.caseGroupId, caseGroupId)).returning();
    return updated || null;
  }
  // Shared Drawing methods
  async getSharedDrawing(caseGroupId) {
    const [result] = await db.select().from(sharedDrawings).where(eq(sharedDrawings.caseGroupId, caseGroupId)).limit(1);
    return result || null;
  }
  async saveSharedDrawing(data) {
    const [created] = await db.insert(sharedDrawings).values(data).returning();
    return created;
  }
  async updateSharedDrawing(caseGroupId, data) {
    const [updated] = await db.update(sharedDrawings).set({
      ...data,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(sharedDrawings.caseGroupId, caseGroupId)).returning();
    return updated || null;
  }
  // Case group methods
  async getCasesByGroupId(caseGroupId) {
    const result = await db.select().from(cases).where(eq(cases.caseGroupId, caseGroupId)).orderBy(asc(cases.caseNumber));
    return result;
  }
  // Same accident number methods (for field survey sync)
  async getCasesByAccidentNo(accidentNo, excludeCaseId) {
    if (!accidentNo) return [];
    const conditions = [eq(cases.insuranceAccidentNo, accidentNo)];
    const result = await db.select().from(cases).where(and(...conditions)).orderBy(asc(cases.caseNumber));
    if (excludeCaseId) {
      return result.filter((c) => c.id !== excludeCaseId);
    }
    return result;
  }
  // 접수번호 prefix를 기준으로 관련 케이스 조회 (예: 251203001 -> 251203001, 251203001-1, 251203001-2)
  async getCasesByCaseNumberPrefix(caseNumber, excludeCaseId) {
    if (!caseNumber) return [];
    const prefix = caseNumber.split("-")[0];
    if (!prefix) return [];
    const result = await db.select().from(cases).where(sql3`${cases.caseNumber} LIKE ${prefix + "%"}`).orderBy(asc(cases.caseNumber));
    if (excludeCaseId) {
      return result.filter((c) => c.id !== excludeCaseId);
    }
    return result;
  }
  async syncFieldSurveyToRelatedCases(sourceCaseId, fieldData) {
    const sourceCase = await this.getCaseById(sourceCaseId);
    if (!sourceCase || !sourceCase.caseNumber) {
      console.log(
        `[Field Survey Sync] Source case ${sourceCaseId} not found or no case number`
      );
      return 0;
    }
    const relatedCases = await this.getCasesByCaseNumberPrefix(
      sourceCase.caseNumber,
      sourceCaseId
    );
    if (relatedCases.length === 0) {
      console.log(
        `[Field Survey Sync] No related cases found for ${sourceCase.caseNumber}`
      );
      return 0;
    }
    console.log(
      `[Field Survey Sync] Syncing field data from ${sourceCase.caseNumber} to ${relatedCases.length} related cases:`,
      relatedCases.map((c) => c.caseNumber).join(", ")
    );
    let updatedCount = 0;
    for (const relatedCase of relatedCases) {
      try {
        await db.update(cases).set(fieldData).where(eq(cases.id, relatedCase.id));
        updatedCount++;
        console.log(
          `[Field Survey Sync] Updated case ${relatedCase.caseNumber}`
        );
      } catch (error) {
        console.error(
          `Failed to sync field survey to case ${relatedCase.id}:`,
          error
        );
      }
    }
    return updatedCount;
  }
  // Real-time sync for drawings to all related cases (same case number prefix)
  async syncDrawingToRelatedCases(sourceCaseId) {
    const sourceCase = await this.getCaseById(sourceCaseId);
    if (!sourceCase || !sourceCase.caseNumber) {
      console.log(
        `[Drawing Sync] Source case ${sourceCaseId} not found or no case number`
      );
      return 0;
    }
    const relatedCases = await this.getCasesByCaseNumberPrefix(
      sourceCase.caseNumber,
      sourceCaseId
    );
    if (relatedCases.length === 0) {
      console.log(
        `[Drawing Sync] No related cases found for ${sourceCase.caseNumber}`
      );
      return 0;
    }
    const sourceDrawing = await this.getDrawingByCaseId(sourceCaseId);
    if (!sourceDrawing) {
      console.log(
        `[Drawing Sync] No drawing found for source case ${sourceCaseId}`
      );
      return 0;
    }
    console.log(
      `[Drawing Sync] Syncing drawing from ${sourceCase.caseNumber} to ${relatedCases.length} related cases:`,
      relatedCases.map((c) => c.caseNumber).join(", ")
    );
    let syncedCount = 0;
    for (const relatedCase of relatedCases) {
      try {
        const existingDrawing = await this.getDrawingByCaseId(relatedCase.id);
        if (existingDrawing) {
          await db.update(drawings).set({
            uploadedImages: sourceDrawing.uploadedImages,
            rectangles: sourceDrawing.rectangles,
            accidentAreas: sourceDrawing.accidentAreas,
            leakMarkers: sourceDrawing.leakMarkers
          }).where(eq(drawings.id, existingDrawing.id));
        } else {
          await db.insert(drawings).values({
            id: randomUUID(),
            caseId: relatedCase.id,
            uploadedImages: sourceDrawing.uploadedImages,
            rectangles: sourceDrawing.rectangles,
            accidentAreas: sourceDrawing.accidentAreas,
            leakMarkers: sourceDrawing.leakMarkers,
            createdBy: sourceDrawing.createdBy,
            createdAt: getKSTDate()
          });
        }
        syncedCount++;
        console.log(`[Drawing Sync] Updated case ${relatedCase.caseNumber}`);
      } catch (error) {
        console.error(
          `Failed to sync drawing to case ${relatedCase.id}:`,
          error
        );
      }
    }
    console.log(
      `[Drawing Sync] Synced drawing from case ${sourceCase.caseNumber} to ${syncedCount} related cases`
    );
    return syncedCount;
  }
  // Real-time sync for new documents to all related cases (same case number prefix)
  async syncDocumentsToRelatedCases(sourceCaseId, newDocument) {
    const sourceCase = await this.getCaseById(sourceCaseId);
    if (!sourceCase || !sourceCase.caseNumber) {
      console.log(
        `[Document Sync] Source case ${sourceCaseId} not found or no case number`
      );
      return 0;
    }
    const relatedCases = await this.getCasesByCaseNumberPrefix(
      sourceCase.caseNumber,
      sourceCaseId
    );
    if (relatedCases.length === 0) {
      console.log(
        `[Document Sync] No related cases found for ${sourceCase.caseNumber}`
      );
      return 0;
    }
    console.log(
      `[Document Sync] Syncing document "${newDocument.fileName}" from ${sourceCase.caseNumber} to ${relatedCases.length} related cases:`,
      relatedCases.map((c) => c.caseNumber).join(", ")
    );
    let syncedCount = 0;
    for (const relatedCase of relatedCases) {
      try {
        await db.insert(caseDocuments).values({
          id: randomUUID(),
          caseId: relatedCase.id,
          category: newDocument.category,
          fileName: newDocument.fileName,
          fileType: newDocument.fileType,
          fileSize: newDocument.fileSize,
          base64Data: newDocument.base64Data,
          description: newDocument.description,
          uploadedBy: newDocument.uploadedBy,
          uploadedAt: getKSTDate()
        });
        syncedCount++;
        console.log(`[Document Sync] Synced to case ${relatedCase.caseNumber}`);
      } catch (error) {
        console.error(
          `Failed to sync document to case ${relatedCase.id}:`,
          error
        );
      }
    }
    console.log(
      `[Document Sync] Synced document "${newDocument.fileName}" from case ${sourceCase.caseNumber} to ${syncedCount} related cases`
    );
    return syncedCount;
  }
  // Real-time sync for estimates to all related cases (same case number prefix)
  async syncEstimateToRelatedCases(sourceCaseId) {
    const sourceCase = await this.getCaseById(sourceCaseId);
    if (!sourceCase || !sourceCase.caseNumber) {
      console.log(
        `[Estimate Sync] Source case ${sourceCaseId} not found or no case number`
      );
      return 0;
    }
    const relatedCases = await this.getCasesByCaseNumberPrefix(
      sourceCase.caseNumber,
      sourceCaseId
    );
    if (relatedCases.length === 0) {
      return 0;
    }
    const sourceEstimate = await this.getLatestEstimate(sourceCaseId);
    if (!sourceEstimate) {
      return 0;
    }
    let syncedCount = 0;
    for (const relatedCase of relatedCases) {
      try {
        const existingVersions = await db.select({ version: estimates.version }).from(estimates).where(eq(estimates.caseId, relatedCase.id)).orderBy(desc(estimates.version)).limit(1);
        const nextVersion = (existingVersions[0]?.version || 0) + 1;
        const newEstimateId = randomUUID();
        await db.insert(estimates).values({
          id: newEstimateId,
          caseId: relatedCase.id,
          version: nextVersion,
          createdBy: sourceEstimate.estimate.createdBy,
          createdAt: /* @__PURE__ */ new Date(),
          // Use Date object for timestamp column
          laborCostData: sourceEstimate.estimate.laborCostData,
          materialCostData: sourceEstimate.estimate.materialCostData,
          vatIncluded: sourceEstimate.estimate.vatIncluded
        });
        for (let i = 0; i < sourceEstimate.rows.length; i++) {
          const row = sourceEstimate.rows[i];
          await db.insert(estimateRows).values({
            id: randomUUID(),
            estimateId: newEstimateId,
            rowOrder: i + 1,
            category: row.category,
            location: row.location,
            workType: row.workType,
            workName: row.workName,
            damageWidthMm: row.damageWidthMm,
            damageHeightMm: row.damageHeightMm,
            damageAreaMm2: row.damageAreaMm2,
            repairWidthMm: row.repairWidthMm,
            repairHeightMm: row.repairHeightMm,
            repairAreaMm2: row.repairAreaMm2,
            note: row.note
          });
        }
        if (sourceCase.estimateAmount && (!relatedCase.estimateAmount || relatedCase.estimateAmount === "0")) {
          await db.update(cases).set({ estimateAmount: sourceCase.estimateAmount }).where(eq(cases.id, relatedCase.id));
        }
        syncedCount++;
      } catch (error) {
        console.error(
          `[Estimate Sync Error] Failed to sync to case ${relatedCase.id}:`,
          {
            message: error?.message || "Unknown error",
            code: error?.code || "No error code",
            stack: error?.stack?.split("\n").slice(0, 5).join("\n") || "No stack",
            sourceCaseId,
            targetCaseId: relatedCase.id
          }
        );
      }
    }
    console.log(
      `[Estimate Sync] Synced estimate from case ${sourceCaseId} to ${syncedCount} related cases`
    );
    return syncedCount;
  }
  // Case number helpers
  // 손해방지 케이스 확인 (prefix-0 형식 = 손해방지, 기존 prefix만 있는 것도 체크)
  async getPreventionCaseByPrefix(prefix) {
    const newFormat = await db.select().from(cases).where(eq(cases.caseNumber, `${prefix}-0`)).limit(1);
    if (newFormat[0]) return newFormat[0];
    const oldFormat = await db.select().from(cases).where(eq(cases.caseNumber, prefix)).limit(1);
    return oldFormat[0] || null;
  }
  // 피해세대복구 다음 suffix 계산
  async getNextVictimSuffix(prefix) {
    const allCases = await db.select({ caseNumber: cases.caseNumber }).from(cases).where(sql3`${cases.caseNumber} LIKE ${prefix + "%"}`);
    let maxSuffix = 0;
    for (const c of allCases) {
      if (c.caseNumber && c.caseNumber.startsWith(prefix + "-")) {
        const suffixStr = c.caseNumber.split("-")[1];
        const suffix = parseInt(suffixStr, 10);
        if (!isNaN(suffix) && suffix > maxSuffix) {
          maxSuffix = suffix;
        }
      }
    }
    return maxSuffix + 1;
  }
  // 같은 prefix를 가진 케이스들 조회 (예: 251102001, 251102001-1, 251102001-2)
  async getCasesByPrefix(prefix, excludeCaseId) {
    const allCases = await db.select().from(cases).where(
      sql3`${cases.caseNumber} = ${prefix} OR ${cases.caseNumber} LIKE ${prefix + "-%"}`
    );
    if (excludeCaseId) {
      return allCases.filter((c) => c.id !== excludeCaseId);
    }
    return allCases;
  }
  // 접수 정보를 같은 prefix 케이스들에 동기화
  async syncIntakeDataToRelatedCases(sourceCaseId) {
    const sourceCase = await this.getCaseById(sourceCaseId);
    if (!sourceCase || !sourceCase.caseNumber) {
      return 0;
    }
    const prefix = sourceCase.caseNumber.split("-")[0];
    const relatedCases = await this.getCasesByPrefix(prefix, sourceCaseId);
    if (relatedCases.length === 0) {
      return 0;
    }
    const syncData = {
      // 담당자 정보
      managerId: sourceCase.managerId,
      // 기본 정보
      accidentDate: sourceCase.accidentDate,
      insuranceCompany: sourceCase.insuranceCompany,
      insurancePolicyNo: sourceCase.insurancePolicyNo,
      insuranceAccidentNo: sourceCase.insuranceAccidentNo,
      // 의뢰사 정보
      clientResidence: sourceCase.clientResidence,
      clientDepartment: sourceCase.clientDepartment,
      clientName: sourceCase.clientName,
      clientContact: sourceCase.clientContact,
      // 심사사 정보
      assessorId: sourceCase.assessorId,
      assessorDepartment: sourceCase.assessorDepartment,
      assessorTeam: sourceCase.assessorTeam,
      assessorContact: sourceCase.assessorContact,
      // 조사사 정보
      investigatorTeam: sourceCase.investigatorTeam,
      investigatorDepartment: sourceCase.investigatorDepartment,
      investigatorTeamName: sourceCase.investigatorTeamName,
      investigatorContact: sourceCase.investigatorContact,
      // 보험계약자 정보
      policyHolderName: sourceCase.policyHolderName,
      policyHolderIdNumber: sourceCase.policyHolderIdNumber,
      policyHolderAddress: sourceCase.policyHolderAddress,
      // 피보험자 정보
      insuredName: sourceCase.insuredName,
      insuredIdNumber: sourceCase.insuredIdNumber,
      insuredContact: sourceCase.insuredContact,
      insuredAddress: sourceCase.insuredAddress,
      insuredAddressDetail: sourceCase.insuredAddressDetail,
      sameAsPolicyHolder: sourceCase.sameAsPolicyHolder,
      // 피해자 정보 - 동기화에서 제외 (각 케이스별로 개별 관리)
      // victimName, victimContact, victimAddress는 각 케이스에서 독립적으로 관리
      // 사고 정보
      accidentType: sourceCase.accidentType,
      accidentCause: sourceCase.accidentCause,
      accidentDescription: sourceCase.accidentDescription,
      restorationMethod: sourceCase.restorationMethod,
      otherVendorEstimate: sourceCase.otherVendorEstimate,
      // 협력사 배당 정보
      assignedPartner: sourceCase.assignedPartner,
      assignedPartnerManager: sourceCase.assignedPartnerManager,
      assignedPartnerContact: sourceCase.assignedPartnerContact,
      // 기타
      urgency: sourceCase.urgency,
      specialRequests: sourceCase.specialRequests
    };
    let syncedCount = 0;
    for (const relatedCase of relatedCases) {
      try {
        await db.update(cases).set({
          ...syncData,
          updatedAt: getKSTDate()
        }).where(eq(cases.id, relatedCase.id));
        syncedCount++;
      } catch (error) {
        console.error(
          `Failed to sync intake data to case ${relatedCase.id}:`,
          error
        );
      }
    }
    console.log(
      `[Intake Sync] Synced intake data from case ${sourceCaseId} (${sourceCase.caseNumber}) to ${syncedCount} related cases`
    );
    return syncedCount;
  }
  // 기존 케이스들의 날짜를 상태 기반으로 자동 채우기
  async migrateExistingCaseDates() {
    const allCases = await db.select().from(cases);
    let updatedCount = 0;
    for (const caseItem of allCases) {
      const dateUpdates = {};
      const baseDate = caseItem.createdAt || getKSTDate();
      if (!caseItem.receptionDate) {
        dateUpdates.receptionDate = baseDate;
      }
      const status = caseItem.status;
      const statusOrder = [
        "\uBC30\uB2F9\uB300\uAE30",
        "\uC811\uC218\uC644\uB8CC",
        "\uD604\uC7A5\uBC29\uBB38",
        "\uD604\uC7A5\uC815\uBCF4\uC785\uB825",
        "\uAC80\uD1A0\uC911",
        "\uBC18\uB824",
        "1\uCC28\uC2B9\uC778",
        "\uD604\uC7A5\uC815\uBCF4\uC81C\uCD9C",
        "\uBCF5\uAD6C\uC694\uCCAD(2\uCC28\uC2B9\uC778)",
        "\uC9C1\uC811\uBCF5\uAD6C",
        "\uC120\uACAC\uC801\uC694\uCCAD",
        "(\uC9C1\uC811\uBCF5\uAD6C\uC778 \uACBD\uC6B0) \uCCAD\uAD6C\uC790\uB8CC\uC81C\uCD9C",
        "(\uC120\uACAC\uC801\uC694\uCCAD\uC778 \uACBD\uC6B0) \uCD9C\uB3D9\uBE44 \uCCAD\uAD6C",
        "\uCCAD\uAD6C",
        "\uC785\uAE08\uC644\uB8CC",
        "\uBD80\uBD84\uC785\uAE08",
        "\uC815\uC0B0\uC644\uB8CC"
      ];
      const currentIndex = statusOrder.indexOf(status || "");
      if (!caseItem.assignmentDate && currentIndex >= statusOrder.indexOf("\uC811\uC218\uC644\uB8CC")) {
        dateUpdates.assignmentDate = baseDate;
      }
      if (!caseItem.siteVisitDate && currentIndex >= statusOrder.indexOf("\uD604\uC7A5\uBC29\uBB38")) {
        dateUpdates.siteVisitDate = baseDate;
      }
      if (!caseItem.siteInvestigationSubmitDate && currentIndex >= statusOrder.indexOf("\uD604\uC7A5\uC815\uBCF4\uC785\uB825")) {
        dateUpdates.siteInvestigationSubmitDate = baseDate;
      }
      if (!caseItem.firstApprovalDate && currentIndex >= statusOrder.indexOf("1\uCC28\uC2B9\uC778")) {
        dateUpdates.firstApprovalDate = baseDate;
      }
      if (!caseItem.secondApprovalDate && currentIndex >= statusOrder.indexOf("\uBCF5\uAD6C\uC694\uCCAD(2\uCC28\uC2B9\uC778)")) {
        dateUpdates.secondApprovalDate = baseDate;
      }
      if (!caseItem.constructionCompletionDate && (currentIndex >= statusOrder.indexOf("(\uC9C1\uC811\uBCF5\uAD6C\uC778 \uACBD\uC6B0) \uCCAD\uAD6C\uC790\uB8CC\uC81C\uCD9C") || currentIndex >= statusOrder.indexOf("(\uC120\uACAC\uC801\uC694\uCCAD\uC778 \uACBD\uC6B0) \uCD9C\uB3D9\uBE44 \uCCAD\uAD6C"))) {
        dateUpdates.constructionCompletionDate = baseDate;
      }
      if (!caseItem.claimDate && currentIndex >= statusOrder.indexOf("\uCCAD\uAD6C")) {
        dateUpdates.claimDate = baseDate;
      }
      if (Object.keys(dateUpdates).length > 0) {
        await db.update(cases).set(dateUpdates).where(eq(cases.id, caseItem.id));
        updatedCount++;
      }
    }
    console.log(
      `[Date Migration] Updated ${updatedCount} cases with auto-populated dates`
    );
    return updatedCount;
  }
  // Case change log methods
  async createCaseChangeLog(data) {
    const [log2] = await db.insert(caseChangeLogs).values(data).returning();
    return log2;
  }
  async getCaseChangeLogs(caseId) {
    return await db.select().from(caseChangeLogs).where(eq(caseChangeLogs.caseId, caseId)).orderBy(desc(caseChangeLogs.changedAt));
  }
  async getAllCaseChangeLogs(filters) {
    const conditions = [];
    if (filters?.changedBy) {
      conditions.push(eq(caseChangeLogs.changedBy, filters.changedBy));
    }
    if (filters?.dateFrom) {
      conditions.push(
        sql3`${caseChangeLogs.changedAt}::date >= ${filters.dateFrom}::date`
      );
    }
    if (filters?.dateTo) {
      conditions.push(
        sql3`${caseChangeLogs.changedAt}::date <= ${filters.dateTo}::date`
      );
    }
    const query = db.select({
      id: caseChangeLogs.id,
      caseId: caseChangeLogs.caseId,
      changedBy: caseChangeLogs.changedBy,
      changedByName: caseChangeLogs.changedByName,
      changedAt: caseChangeLogs.changedAt,
      changeType: caseChangeLogs.changeType,
      changes: caseChangeLogs.changes,
      note: caseChangeLogs.note,
      caseNumber: cases.caseNumber
    }).from(caseChangeLogs).innerJoin(cases, eq(caseChangeLogs.caseId, cases.id)).orderBy(desc(caseChangeLogs.changedAt));
    if (filters?.caseNumber) {
      conditions.push(like(cases.caseNumber, `%${filters.caseNumber}%`));
    }
    if (conditions.length > 0) {
      return await query.where(and(...conditions));
    }
    return await query;
  }
  // Settlement methods
  async createSettlement(data, createdBy) {
    const [settlement] = await db.insert(settlements).values({
      ...data,
      createdBy,
      createdAt: getKSTTimestamp()
    }).returning();
    return settlement;
  }
  async updateSettlement(id, data) {
    const [updated] = await db.update(settlements).set(data).where(eq(settlements.id, id)).returning();
    return updated || null;
  }
  async getSettlementsByCaseId(caseId) {
    return await db.select().from(settlements).where(eq(settlements.caseId, caseId)).orderBy(desc(settlements.createdAt));
  }
  async getLatestSettlementByCaseId(caseId) {
    const result = await db.select().from(settlements).where(eq(settlements.caseId, caseId)).orderBy(desc(settlements.createdAt)).limit(1);
    return result[0] || null;
  }
  async getAllSettlements() {
    return await db.select().from(settlements).orderBy(desc(settlements.createdAt));
  }
  // Labor rate tiers methods
  async getLaborRateTiers() {
    const tiers = await db.select().from(laborRateTiers).orderBy(asc(laborRateTiers.sortOrder));
    if (tiers.length === 0) {
      await this.initializeLaborRateTiers();
      return await db.select().from(laborRateTiers).orderBy(asc(laborRateTiers.sortOrder));
    }
    return tiers;
  }
  async updateLaborRateTiers(updates) {
    for (const update of updates) {
      await db.update(laborRateTiers).set({
        minRatio: update.minRatio,
        rateMultiplier: update.rateMultiplier,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(laborRateTiers.id, update.id));
    }
    return await this.getLaborRateTiers();
  }
  async initializeLaborRateTiers() {
    const existing = await db.select().from(laborRateTiers);
    if (existing.length > 0) {
      return;
    }
    for (const tier of DEFAULT_LABOR_RATE_TIERS) {
      await db.insert(laborRateTiers).values(tier);
    }
    console.log("[Storage] Labor rate tiers initialized with default values");
  }
  // Invoice methods
  async createInvoice(data, createdBy) {
    const [invoice] = await db.insert(invoices).values({
      ...data,
      createdAt: getKSTTimestamp()
    }).returning();
    return invoice;
  }
  async updateInvoice(id, data) {
    const [updated] = await db.update(invoices).set({
      ...data,
      updatedAt: getKSTTimestamp()
    }).where(eq(invoices.id, id)).returning();
    return updated || null;
  }
  async getInvoiceById(id) {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice || null;
  }
  async getInvoiceByCaseId(caseId) {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.caseId, caseId)).orderBy(desc(invoices.createdAt)).limit(1);
    return invoice || null;
  }
  async getInvoiceByCaseGroupPrefix(caseGroupPrefix) {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.caseGroupPrefix, caseGroupPrefix)).orderBy(desc(invoices.createdAt)).limit(1);
    return invoice || null;
  }
  async getAllInvoices() {
    return await db.select().from(invoices).orderBy(desc(invoices.createdAt));
  }
  async getApprovedInvoices() {
    return await db.select().from(invoices).where(or(
      eq(invoices.status, "approved"),
      eq(invoices.status, "partial")
    )).orderBy(desc(invoices.createdAt));
  }
  // Unit Price Override methods (D값 관리)
  async getAllUnitPriceOverrides() {
    return await db.select().from(unitPriceOverrides).orderBy(asc(unitPriceOverrides.category), asc(unitPriceOverrides.workName));
  }
  async getUnitPriceOverride(category, workName, laborItem) {
    const [override] = await db.select().from(unitPriceOverrides).where(and(
      eq(unitPriceOverrides.category, category),
      eq(unitPriceOverrides.workName, workName),
      eq(unitPriceOverrides.laborItem, laborItem)
    ));
    return override || null;
  }
  async upsertUnitPriceOverride(data) {
    const existing = await this.getUnitPriceOverride(data.category, data.workName, data.laborItem);
    if (existing) {
      const [updated] = await db.update(unitPriceOverrides).set({
        standardWorkQuantity: data.standardWorkQuantity,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(unitPriceOverrides.id, existing.id)).returning();
      return updated;
    } else {
      const [created] = await db.insert(unitPriceOverrides).values(data).returning();
      return created;
    }
  }
  async bulkUpsertUnitPriceOverrides(items) {
    const results = [];
    for (const item of items) {
      const result = await this.upsertUnitPriceOverride(item);
      results.push(result);
    }
    return results;
  }
};
var storage = new DbStorage();

// server/routes.ts
import { z as z2 } from "zod";
import { sql as sql4, inArray as inArray2 } from "drizzle-orm";
import nodemailer2 from "nodemailer";
import https from "https";
import crypto from "crypto";

// server/replit_integrations/object_storage/objectStorage.ts
import { Storage } from "@google-cloud/storage";
import { randomUUID as randomUUID2 } from "crypto";

// server/replit_integrations/object_storage/objectAcl.ts
var ACL_POLICY_METADATA_KEY = "custom:aclPolicy";
function isPermissionAllowed(requested, granted) {
  if (requested === "read" /* READ */) {
    return ["read" /* READ */, "write" /* WRITE */].includes(granted);
  }
  return granted === "write" /* WRITE */;
}
function createObjectAccessGroup(group) {
  switch (group.type) {
    // Implement the case for each type of access group to instantiate.
    //
    // For example:
    // case "USER_LIST":
    //   return new UserListAccessGroup(group.id);
    // case "EMAIL_DOMAIN":
    //   return new EmailDomainAccessGroup(group.id);
    // case "GROUP_MEMBER":
    //   return new GroupMemberAccessGroup(group.id);
    // case "SUBSCRIBER":
    //   return new SubscriberAccessGroup(group.id);
    default:
      throw new Error(`Unknown access group type: ${group.type}`);
  }
}
async function setObjectAclPolicy(objectFile, aclPolicy) {
  const [exists] = await objectFile.exists();
  if (!exists) {
    throw new Error(`Object not found: ${objectFile.name}`);
  }
  await objectFile.setMetadata({
    metadata: {
      [ACL_POLICY_METADATA_KEY]: JSON.stringify(aclPolicy)
    }
  });
}
async function getObjectAclPolicy(objectFile) {
  const [metadata] = await objectFile.getMetadata();
  const aclPolicy = metadata?.metadata?.[ACL_POLICY_METADATA_KEY];
  if (!aclPolicy) {
    return null;
  }
  return JSON.parse(aclPolicy);
}
async function canAccessObject({
  userId,
  objectFile,
  requestedPermission
}) {
  const aclPolicy = await getObjectAclPolicy(objectFile);
  if (!aclPolicy) {
    return false;
  }
  if (aclPolicy.visibility === "public" && requestedPermission === "read" /* READ */) {
    return true;
  }
  if (!userId) {
    return false;
  }
  if (aclPolicy.owner === userId) {
    return true;
  }
  for (const rule of aclPolicy.aclRules || []) {
    const accessGroup = createObjectAccessGroup(rule.group);
    if (await accessGroup.hasMember(userId) && isPermissionAllowed(requestedPermission, rule.permission)) {
      return true;
    }
  }
  return false;
}

// server/replit_integrations/object_storage/objectStorage.ts
var REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";
var objectStorageClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token"
      }
    },
    universe_domain: "googleapis.com"
  },
  projectId: ""
});
var ObjectNotFoundError = class _ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, _ObjectNotFoundError.prototype);
  }
};
var ObjectStorageService = class {
  constructor() {
  }
  // Gets the public object search paths.
  getPublicObjectSearchPaths() {
    const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
    const paths = Array.from(
      new Set(
        pathsStr.split(",").map((path4) => path4.trim()).filter((path4) => path4.length > 0)
      )
    );
    if (paths.length === 0) {
      throw new Error(
        "PUBLIC_OBJECT_SEARCH_PATHS not set. Create a bucket in 'Object Storage' tool and set PUBLIC_OBJECT_SEARCH_PATHS env var (comma-separated paths)."
      );
    }
    return paths;
  }
  // Gets the private object directory.
  getPrivateObjectDir() {
    const dir = process.env.PRIVATE_OBJECT_DIR || "";
    if (!dir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' tool and set PRIVATE_OBJECT_DIR env var."
      );
    }
    return dir;
  }
  // Search for a public object from the search paths.
  async searchPublicObject(filePath) {
    for (const searchPath of this.getPublicObjectSearchPaths()) {
      const fullPath = `${searchPath}/${filePath}`;
      const { bucketName, objectName } = parseObjectPath(fullPath);
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);
      const [exists] = await file.exists();
      if (exists) {
        return file;
      }
    }
    return null;
  }
  // Downloads an object to the response.
  async downloadObject(file, res, cacheTtlSec = 3600) {
    try {
      const [metadata] = await file.getMetadata();
      const aclPolicy = await getObjectAclPolicy(file);
      const isPublic = aclPolicy?.visibility === "public";
      res.set({
        "Content-Type": metadata.contentType || "application/octet-stream",
        "Content-Length": metadata.size,
        "Cache-Control": `${isPublic ? "public" : "private"}, max-age=${cacheTtlSec}`
      });
      const stream = file.createReadStream();
      stream.on("error", (err) => {
        console.error("Stream error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Error streaming file" });
        }
      });
      stream.pipe(res);
    } catch (error) {
      console.error("Error downloading file:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }
  // Gets the upload URL for an object entity.
  async getObjectEntityUploadURL() {
    const privateObjectDir = this.getPrivateObjectDir();
    if (!privateObjectDir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' tool and set PRIVATE_OBJECT_DIR env var."
      );
    }
    const objectId = randomUUID2();
    const fullPath = `${privateObjectDir}/uploads/${objectId}`;
    const { bucketName, objectName } = parseObjectPath(fullPath);
    return signObjectURL({
      bucketName,
      objectName,
      method: "PUT",
      ttlSec: 900
    });
  }
  // Gets the object entity file from the object path.
  async getObjectEntityFile(objectPath) {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }
    const parts = objectPath.slice(1).split("/");
    if (parts.length < 2) {
      throw new ObjectNotFoundError();
    }
    const entityId = parts.slice(1).join("/");
    let entityDir = this.getPrivateObjectDir();
    if (!entityDir.endsWith("/")) {
      entityDir = `${entityDir}/`;
    }
    const objectEntityPath = `${entityDir}${entityId}`;
    const { bucketName, objectName } = parseObjectPath(objectEntityPath);
    const bucket = objectStorageClient.bucket(bucketName);
    const objectFile = bucket.file(objectName);
    const [exists] = await objectFile.exists();
    if (!exists) {
      throw new ObjectNotFoundError();
    }
    return objectFile;
  }
  normalizeObjectEntityPath(rawPath) {
    if (!rawPath.startsWith("https://storage.googleapis.com/")) {
      return rawPath;
    }
    const url = new URL(rawPath);
    const rawObjectPath = url.pathname;
    let objectEntityDir = this.getPrivateObjectDir();
    if (!objectEntityDir.endsWith("/")) {
      objectEntityDir = `${objectEntityDir}/`;
    }
    if (!rawObjectPath.startsWith(objectEntityDir)) {
      return rawObjectPath;
    }
    const entityId = rawObjectPath.slice(objectEntityDir.length);
    return `/objects/${entityId}`;
  }
  // Tries to set the ACL policy for the object entity and return the normalized path.
  async trySetObjectEntityAclPolicy(rawPath, aclPolicy) {
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    if (!normalizedPath.startsWith("/")) {
      return normalizedPath;
    }
    const objectFile = await this.getObjectEntityFile(normalizedPath);
    await setObjectAclPolicy(objectFile, aclPolicy);
    return normalizedPath;
  }
  // Checks if the user can access the object entity.
  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission
  }) {
    return canAccessObject({
      userId,
      objectFile,
      requestedPermission: requestedPermission ?? "read" /* READ */
    });
  }
};
function parseObjectPath(path4) {
  if (!path4.startsWith("/")) {
    path4 = `/${path4}`;
  }
  const pathParts = path4.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }
  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");
  return {
    bucketName,
    objectName
  };
}
async function signObjectURL({
  bucketName,
  objectName,
  method,
  ttlSec
}) {
  const request = {
    bucket_name: bucketName,
    object_name: objectName,
    method,
    expires_at: new Date(Date.now() + ttlSec * 1e3).toISOString()
  };
  const response = await fetch(
    `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(request)
    }
  );
  if (!response.ok) {
    throw new Error(
      `Failed to sign object URL, errorcode: ${response.status}, make sure you're running on Replit`
    );
  }
  const { signed_url: signedURL } = await response.json();
  return signedURL;
}

// server/replit_integrations/object_storage/routes.ts
function registerObjectStorageRoutes(app2) {
  const objectStorageService = new ObjectStorageService();
  app2.post("/api/uploads/request-url", async (req, res) => {
    try {
      const { name, size, contentType } = req.body;
      if (!name) {
        return res.status(400).json({
          error: "Missing required field: name"
        });
      }
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
      res.json({
        uploadURL,
        objectPath,
        // Echo back the metadata for client convenience
        metadata: { name, size, contentType }
      });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });
  app2.get("/objects/:objectPath(*)", async (req, res) => {
    try {
      const requestPath = req.path;
      if (requestPath.startsWith("/objects/public/")) {
        const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
        if (!bucketId) {
          return res.status(500).json({ error: "Object Storage not configured" });
        }
        const objectName = requestPath.slice("/objects/".length);
        const bucket = objectStorageClient.bucket(bucketId);
        const file = bucket.file(objectName);
        const [exists] = await file.exists();
        if (!exists) {
          return res.status(404).json({ error: "Object not found" });
        }
        await objectStorageService.downloadObject(file, res);
        return;
      }
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      await objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "Object not found" });
      }
      return res.status(500).json({ error: "Failed to serve object" });
    }
  });
}

// server/email.ts
var BASE = "https://sendmail-43925.bubbleapps.io/version-test/api/1.1/wf";
var WORKFLOW = "send-file";
async function callBubbleWF(payload) {
  const TOKEN = process.env.BUBBLE_API_TOKEN;
  if (!TOKEN) {
    throw new Error("BUBBLE_API_TOKEN environment variable is required");
  }
  const res = await fetch(`${BASE}/${WORKFLOW}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOKEN}`
    },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.status === "error") {
    throw new Error(
      `Bubble WF fail: ${res.status} ${res.statusText}
${typeof data === "object" ? JSON.stringify(data) : String(data)}`
    );
  }
  return data;
}
async function sendNotificationEmail(email, title, emailContent) {
  try {
    await callBubbleWF({
      sender: "FLOXN",
      title,
      to: email,
      content: emailContent
    });
    console.log(`[Email] Notification email sent to ${email}: ${title}`);
    return true;
  } catch (error) {
    console.error("[Email] Failed to send notification email:", error);
    throw new Error("\uC774\uBA54\uC77C \uC804\uC1A1\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4");
  }
}
async function sendAccountCreationEmail(email, accountInfo) {
  const roleNames = {
    admin: "\uAD00\uB9AC\uC790",
    insurer: "\uBCF4\uD5D8\uC0AC",
    partner: "\uD611\uB825\uC0AC",
    assessor: "\uC2EC\uC0AC\uC0AC",
    investigator: "\uC870\uC0AC\uC0AC",
    client: "\uC758\uB8B0\uC0AC"
  };
  const roleName = roleNames[accountInfo.role] || accountInfo.role;
  const content = `[FLOXN \uACC4\uC815 \uC0DD\uC131 \uC548\uB0B4]

\uC548\uB155\uD558\uC138\uC694, ${accountInfo.name}\uB2D8.

FLOXN \uD50C\uB7AB\uD3FC \uACC4\uC815\uC774 \uC0DD\uC131\uB418\uC5C8\uC2B5\uB2C8\uB2E4.

\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u25A0 \uACC4\uC815 \uC815\uBCF4
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
- \uC774\uB984: ${accountInfo.name}
- \uC18C\uC18D: ${accountInfo.company || "-"}
- \uC5ED\uD560: ${roleName}
- \uC544\uC774\uB514: ${accountInfo.username}
- \uBE44\uBC00\uBC88\uD638: ${accountInfo.password}

\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u25A0 \uB85C\uADF8\uC778 \uC548\uB0B4
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\uC544\uB798 \uC8FC\uC18C\uC5D0\uC11C \uB85C\uADF8\uC778\uD558\uC2E4 \uC218 \uC788\uC2B5\uB2C8\uB2E4.
https://peulrogseun-aqaqaq4561.replit.app

\uB85C\uADF8\uC778 \uD6C4 \uBC18\uB4DC\uC2DC \uBE44\uBC00\uBC88\uD638\uB97C \uBCC0\uACBD\uD574 \uC8FC\uC138\uC694.

FLOXN \uB4DC\uB9BC`;
  try {
    await callBubbleWF({
      sender: "FLOXN",
      title: "[FLOXN] \uACC4\uC815 \uC0DD\uC131 \uC548\uB0B4",
      to: email,
      content
    });
    console.log(`[Email] Account creation notification sent to ${email}`);
    return true;
  } catch (error) {
    console.error("[Email] Failed to send account creation email:", error);
    throw new Error("\uC774\uBA54\uC77C \uC804\uC1A1\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4");
  }
}

// server/pdf-service.ts
import puppeteer from "puppeteer";
import { PDFDocument } from "pdf-lib";
import fs from "fs";
import path from "path";
import { eq as eq2, and as and2, inArray } from "drizzle-orm";
var TEMPLATES_DIR = path.join(process.cwd(), "server/pdf-templates");
function replaceTemplateVariables(template, data) {
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
    result = result.replace(regex, value ?? "");
  }
  return result;
}
function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    return `${date.getFullYear()}\uB144 ${date.getMonth() + 1}\uC6D4 ${date.getDate()}\uC77C`;
  } catch {
    return dateStr;
  }
}
function formatNumber(num) {
  if (num === null || num === void 0) return "0";
  return num.toLocaleString("ko-KR");
}
async function generateCoverPage(caseData, partnerData) {
  const templatePath = path.join(TEMPLATES_DIR, "cover.html");
  let template = fs.readFileSync(templatePath, "utf-8");
  const fullAddress = [caseData.insuredAddress, caseData.insuredAddressDetail].filter(Boolean).join(" ");
  const dispatchDateTime = [caseData.visitDate, caseData.visitTime].filter(Boolean).join(" ");
  const data = {
    recipientName: caseData.insuranceCompany || "",
    insuranceAccidentNo: caseData.insuranceAccidentNo || "",
    insuredName: caseData.insuredName || caseData.victimName || "",
    investigatorName: partnerData?.name || "",
    partnerCompany: caseData.assignedPartner || "",
    address: fullAddress,
    dispatchDateTime,
    documentDate: formatDate((/* @__PURE__ */ new Date()).toISOString()),
    senderCompany: caseData.assignedPartner || "",
    senderName: partnerData?.name || "",
    senderContact: partnerData?.phone || "",
    footerText: "\uBCF8 \uD655\uC778\uC11C\uB294 \uD604\uC7A5 \uCD9C\uB3D9 \uC0AC\uC2E4\uC744 \uC99D\uBA85\uD569\uB2C8\uB2E4."
  };
  return replaceTemplateVariables(template, data);
}
async function generateFieldReportPage(caseData, partnerData, repairItems) {
  const templatePath = path.join(TEMPLATES_DIR, "field-report.html");
  let template = fs.readFileSync(templatePath, "utf-8");
  const insuredFullAddress = [caseData.insuredAddress, caseData.insuredAddressDetail].filter(Boolean).join(" ");
  const victimFullAddress = [caseData.victimAddress, caseData.victimAddressDetail].filter(Boolean).join(" ");
  const visitDateTime = [caseData.visitDate, caseData.visitTime].filter(Boolean).join(" ");
  const accidentDateTime = [caseData.accidentDate, caseData.accidentTime].filter(Boolean).join(" ");
  let processingTypesStr = "";
  if (caseData.processingTypes) {
    try {
      const types = JSON.parse(caseData.processingTypes);
      processingTypesStr = Array.isArray(types) ? types.join(", ") : "";
    } catch {
      processingTypesStr = caseData.processingTypes || "";
    }
  }
  let repairItemsHtml = "";
  if (repairItems && repairItems.length > 0) {
    repairItems.forEach((item, index) => {
      const areaM2 = item.repairArea ? Number(item.repairArea).toFixed(2) : "-";
      repairItemsHtml += `
        <tr>
          <td>${index + 1}</td>
          <td>${item.category || "-"}</td>
          <td>${item.location || "-"}</td>
          <td>${item.workName || "-"}</td>
          <td>${areaM2} \u33A1</td>
          <td>${item.note || "-"}</td>
        </tr>
      `;
    });
  } else {
    repairItemsHtml = '<tr><td colspan="6" style="text-align:center;padding:10mm;">\uB4F1\uB85D\uB41C \uBCF5\uAD6C \uB0B4\uC5ED\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</td></tr>';
  }
  const data = {
    visitDateTime: visitDateTime || "-",
    dispatchManager: caseData.dispatchManager || partnerData?.name || "-",
    dispatchLocation: caseData.dispatchLocation || "-",
    partnerCompany: caseData.assignedPartner || "-",
    insuredFullAddress: insuredFullAddress || "-",
    accidentDateTime: accidentDateTime || "-",
    accidentCategory: caseData.accidentCategory || "-",
    accidentCause: caseData.accidentCause || "-",
    siteNotes: caseData.siteNotes || caseData.specialNotes || "\uD2B9\uC774\uC0AC\uD56D \uC5C6\uC74C",
    vocContent: caseData.specialRequests || caseData.vocContent || caseData.additionalNotes || "-",
    victimName: caseData.victimName || "-",
    victimContact: caseData.victimContact || "-",
    victimAddress: victimFullAddress || insuredFullAddress || "-",
    processingTypes: processingTypesStr || "-",
    recoveryMethodType: caseData.recoveryMethodType || "-",
    repairItemsHtml,
    documentDate: formatDate((/* @__PURE__ */ new Date()).toISOString()),
    authorName: partnerData?.name || caseData.dispatchManager || "-"
  };
  template = template.replace("{{repairItemsHtml}}", repairItemsHtml);
  return replaceTemplateVariables(template, data);
}
async function generateDrawingPage(caseData, drawingData) {
  const templatePath = path.join(TEMPLATES_DIR, "drawing.html");
  let template = fs.readFileSync(templatePath, "utf-8");
  const fullAddress = [caseData.insuredAddress, caseData.insuredAddressDetail].filter(Boolean).join(" ");
  let drawingContent = '<div class="no-image">\uB3C4\uBA74 \uC774\uBBF8\uC9C0\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.</div>';
  const hasUploadedImages = drawingData?.uploadedImages && drawingData.uploadedImages.length > 0;
  const hasRectangles = drawingData?.rectangles && drawingData.rectangles.length > 0;
  const hasLeakMarkers = drawingData?.leakMarkers && drawingData.leakMarkers.length > 0;
  const hasAccidentAreas = drawingData?.accidentAreas && drawingData.accidentAreas.length > 0;
  console.log(`[PDF \uB3C4\uBA74] \uC774\uBBF8\uC9C0: ${hasUploadedImages ? drawingData.uploadedImages.length : 0}, \uC0AC\uAC01\uD615: ${hasRectangles ? drawingData.rectangles.length : 0}, \uB204\uC218\uB9C8\uCEE4: ${hasLeakMarkers ? drawingData.leakMarkers.length : 0}`);
  if (hasUploadedImages || hasRectangles || hasLeakMarkers || hasAccidentAreas) {
    const DISPLAY_SCALE = 0.05;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    if (hasUploadedImages) {
      for (const img of drawingData.uploadedImages) {
        const x = img.x || 0;
        const y = img.y || 0;
        const w = img.width || 200;
        const h = img.height || 200;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + w);
        maxY = Math.max(maxY, y + h);
      }
    }
    if (hasRectangles) {
      for (const rect of drawingData.rectangles) {
        const x = rect.x || 0;
        const y = rect.y || 0;
        const w = rect.width || 50;
        const h = rect.height || 50;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + w);
        maxY = Math.max(maxY, y + h);
      }
    }
    if (hasLeakMarkers) {
      for (const marker of drawingData.leakMarkers) {
        const x = marker.x || 0;
        const y = marker.y || 0;
        minX = Math.min(minX, x - 200);
        minY = Math.min(minY, y - 200);
        maxX = Math.max(maxX, x + 200);
        maxY = Math.max(maxY, y + 200);
      }
    }
    if (hasAccidentAreas) {
      for (const area of drawingData.accidentAreas) {
        const x = area.x || 0;
        const y = area.y || 0;
        const w = area.width || 50;
        const h = area.height || 50;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + w);
        maxY = Math.max(maxY, y + h);
      }
    }
    const contentWidth = (maxX - minX) * DISPLAY_SCALE;
    const contentHeight = (maxY - minY) * DISPLAY_SCALE;
    const containerWidth = 540;
    const containerHeight = 700;
    const scaleX = containerWidth / contentWidth;
    const scaleY = containerHeight / contentHeight;
    const fitScale = Math.min(scaleX, scaleY, 1);
    const finalScale = DISPLAY_SCALE * fitScale;
    const offsetX = -minX * finalScale + (containerWidth - contentWidth * fitScale) / 2;
    const offsetY = -minY * finalScale + 20;
    console.log(`[PDF \uB3C4\uBA74] \uACBD\uACC4: minX=${minX}, minY=${minY}, maxX=${maxX}, maxY=${maxY}`);
    console.log(`[PDF \uB3C4\uBA74] \uCF58\uD150\uCE20 \uD06C\uAE30: ${contentWidth}x${contentHeight}px, fitScale=${fitScale.toFixed(3)}`);
    let elements = "";
    if (hasUploadedImages) {
      for (const img of drawingData.uploadedImages) {
        let imageUrl = img.src || "";
        if (imageUrl && !imageUrl.startsWith("data:")) {
          imageUrl = `data:image/png;base64,${imageUrl}`;
        }
        if (imageUrl) {
          const x = (img.x || 0) * finalScale + offsetX;
          const y = (img.y || 0) * finalScale + offsetY;
          const width = (img.width || 200) * finalScale;
          const height = (img.height || 200) * finalScale;
          elements += `<img src="${imageUrl}" style="position:absolute;left:${x}px;top:${y}px;width:${width}px;height:${height}px;object-fit:contain;" />`;
        }
      }
    }
    if (hasRectangles) {
      for (const rect of drawingData.rectangles) {
        const x = (rect.x || 0) * finalScale + offsetX;
        const y = (rect.y || 0) * finalScale + offsetY;
        const width = (rect.width || 50) * finalScale;
        const height = (rect.height || 50) * finalScale;
        const bgColor = rect.backgroundColor || "#FFFFFF";
        const borderColor = "#666666";
        elements += `<div style="position:absolute;left:${x}px;top:${y}px;width:${width}px;height:${height}px;border:1px solid ${borderColor};background:${bgColor};box-sizing:border-box;"></div>`;
        if (rect.text) {
          elements += `<div style="position:absolute;left:${x}px;top:${y + height / 2 - 8}px;width:${width}px;text-align:center;font-size:10px;color:#333;font-weight:bold;">${rect.text}</div>`;
        }
      }
    }
    if (hasLeakMarkers) {
      for (const marker of drawingData.leakMarkers) {
        const x = (marker.x || 0) * finalScale + offsetX;
        const y = (marker.y || 0) * finalScale + offsetY;
        elements += `<div style="position:absolute;left:${x - 12}px;top:${y - 12}px;width:24px;height:24px;background:#EF4444;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:10px;font-weight:bold;border:2px solid #DC2626;">\u2715</div>`;
      }
    }
    if (hasAccidentAreas) {
      for (const area of drawingData.accidentAreas) {
        const x = (area.x || 0) * finalScale + offsetX;
        const y = (area.y || 0) * finalScale + offsetY;
        const width = (area.width || 50) * finalScale;
        const height = (area.height || 50) * finalScale;
        elements += `<div style="position:absolute;left:${x}px;top:${y}px;width:${width}px;height:${height}px;border:2px dashed #EF4444;background:rgba(239,68,68,0.1);box-sizing:border-box;"></div>`;
      }
    }
    const canvasHeight = Math.min(contentHeight * fitScale + 40, containerHeight);
    drawingContent = `<div class="drawing-canvas" style="position:relative;width:${containerWidth}px;height:${canvasHeight}px;border:1px solid #ddd;background:#f9f9f9;overflow:hidden;margin:0 auto;">${elements}</div>`;
  }
  const data = {
    caseNumber: caseData.caseNumber || "",
    insuranceCompany: caseData.insuranceCompany || "",
    insuredName: caseData.insuredName || caseData.victimName || "",
    address: fullAddress,
    insuranceAccidentNo: caseData.insuranceAccidentNo || "",
    documentDate: formatDate((/* @__PURE__ */ new Date()).toISOString()),
    drawingContent
  };
  return replaceTemplateVariables(template, data);
}
async function generateEvidencePages(caseData, documents) {
  const templatePath = path.join(TEMPLATES_DIR, "evidence-images.html");
  let template = fs.readFileSync(templatePath, "utf-8");
  const categoryGroups = {};
  const categoryToTab = {
    "\uD604\uC7A5\uCD9C\uB3D9\uC0AC\uC9C4": "\uD604\uC7A5\uC0AC\uC9C4",
    "\uD604\uC7A5": "\uD604\uC7A5\uC0AC\uC9C4",
    "\uC218\uB9AC\uC911 \uC0AC\uC9C4": "\uD604\uC7A5\uC0AC\uC9C4",
    "\uC218\uB9AC\uC911": "\uD604\uC7A5\uC0AC\uC9C4",
    "\uBCF5\uAD6C\uC644\uB8CC \uC0AC\uC9C4": "\uD604\uC7A5\uC0AC\uC9C4",
    "\uBCF5\uAD6C\uC644\uB8CC": "\uD604\uC7A5\uC0AC\uC9C4",
    "\uBCF4\uD5D8\uAE08 \uCCAD\uAD6C\uC11C": "\uAE30\uBCF8\uC790\uB8CC",
    "\uAC1C\uC778\uC815\uBCF4 \uB3D9\uC758\uC11C(\uAC00\uC871\uC6A9)": "\uAE30\uBCF8\uC790\uB8CC",
    "\uC8FC\uBBFC\uB4F1\uB85D\uB4F1\uBCF8": "\uC99D\uBE59\uC790\uB8CC",
    "\uB4F1\uAE30\uBD80\uB4F1\uBCF8": "\uC99D\uBE59\uC790\uB8CC",
    "\uAC74\uCD95\uBB3C\uB300\uC7A5": "\uC99D\uBE59\uC790\uB8CC",
    "\uAE30\uD0C0\uC99D\uBE59\uC790\uB8CC(\uBBFC\uC6D0\uC77C\uC9C0 \uB4F1)": "\uC99D\uBE59\uC790\uB8CC",
    "\uC704\uC784\uC7A5": "\uCCAD\uAD6C\uC790\uB8CC",
    "\uB3C4\uAE09\uACC4\uC57D\uC11C": "\uCCAD\uAD6C\uC790\uB8CC",
    "\uBCF5\uAD6C\uC644\uB8CC\uD655\uC778\uC11C": "\uCCAD\uAD6C\uC790\uB8CC",
    "\uBD80\uAC00\uC138 \uCCAD\uAD6C\uC790\uB8CC": "\uCCAD\uAD6C\uC790\uB8CC",
    "\uCCAD\uAD6C": "\uCCAD\uAD6C\uC790\uB8CC"
  };
  for (const doc of documents) {
    const tab = categoryToTab[doc.category] || "\uAE30\uD0C0";
    if (!categoryGroups[tab]) {
      categoryGroups[tab] = [];
    }
    categoryGroups[tab].push(doc);
  }
  const allImages = [];
  const tabOrder = ["\uD604\uC7A5\uC0AC\uC9C4", "\uAE30\uBCF8\uC790\uB8CC", "\uC99D\uBE59\uC790\uB8CC", "\uCCAD\uAD6C\uC790\uB8CC", "\uAE30\uD0C0"];
  for (const tab of tabOrder) {
    const docs = categoryGroups[tab];
    if (!docs || docs.length === 0) continue;
    for (const doc of docs) {
      const isImage = doc.fileType?.startsWith("image/");
      const hasValidData = doc.fileData && doc.fileData.length > 100;
      if (isImage && hasValidData) {
        allImages.push({ doc, tab });
      } else if (isImage && !hasValidData) {
        console.log(`[PDF \uC99D\uBE59\uC790\uB8CC] \uC774\uBBF8\uC9C0 \uB370\uC774\uD130 \uC5C6\uC74C - \uAC74\uB108\uB700: ${doc.fileName}`);
      }
    }
  }
  console.log(`[PDF \uC99D\uBE59\uC790\uB8CC] \uC720\uD6A8\uD55C \uC774\uBBF8\uC9C0 \uC218: ${allImages.length}`);
  allImages.forEach((img, idx) => {
    const dataLength = img.doc.fileData?.length || 0;
    console.log(`[PDF \uC99D\uBE59\uC790\uB8CC] \uC774\uBBF8\uC9C0 ${idx + 1}: ${img.doc.fileName}, \uB370\uC774\uD130 \uD06C\uAE30: ${dataLength} bytes`);
  });
  if (allImages.length === 0) {
    console.log("[PDF \uC99D\uBE59\uC790\uB8CC] \uC720\uD6A8\uD55C \uC774\uBBF8\uC9C0 \uC5C6\uC74C - \uBE48 \uD398\uC774\uC9C0 \uC0DD\uC131\uD558\uC9C0 \uC54A\uC74C");
    return "";
  }
  let pagesHtml = "";
  for (let i = 0; i < allImages.length; i += 2) {
    const firstImage = allImages[i];
    const secondImage = allImages[i + 1];
    let imagesBlockHtml = "";
    const firstUploadDate = firstImage.doc.createdAt ? new Date(firstImage.doc.createdAt).toLocaleDateString("ko-KR") : "";
    let firstImageDataUri = firstImage.doc.fileData || "";
    if (firstImageDataUri && !firstImageDataUri.startsWith("data:")) {
      firstImageDataUri = `data:${firstImage.doc.fileType || "image/jpeg"};base64,${firstImageDataUri}`;
    }
    imagesBlockHtml += `
      <div class="image-block">
        <div class="image-block-header">${firstImage.tab} - ${firstImage.doc.category}</div>
        <div class="image-container">
          <img src="${firstImageDataUri}" alt="${firstImage.doc.fileName}" class="evidence-image" onerror="this.style.display='none'"/>
        </div>
        <div class="image-info">
          <span class="image-name">${firstImage.doc.fileName}</span>
          <span class="image-date">\uC5C5\uB85C\uB4DC: ${firstUploadDate}</span>
        </div>
      </div>
    `;
    if (secondImage) {
      const secondUploadDate = secondImage.doc.createdAt ? new Date(secondImage.doc.createdAt).toLocaleDateString("ko-KR") : "";
      let secondImageDataUri = secondImage.doc.fileData || "";
      if (secondImageDataUri && !secondImageDataUri.startsWith("data:")) {
        secondImageDataUri = `data:${secondImage.doc.fileType || "image/jpeg"};base64,${secondImageDataUri}`;
      }
      imagesBlockHtml += `
        <div class="image-block">
          <div class="image-block-header">${secondImage.tab} - ${secondImage.doc.category}</div>
          <div class="image-container">
            <img src="${secondImageDataUri}" alt="${secondImage.doc.fileName}" class="evidence-image" onerror="this.style.display='none'"/>
          </div>
          <div class="image-info">
            <span class="image-name">${secondImage.doc.fileName}</span>
            <span class="image-date">\uC5C5\uB85C\uB4DC: ${secondUploadDate}</span>
          </div>
        </div>
      `;
    }
    pagesHtml += `
      <div class="page">
        <div class="header-bar">
          <div class="header-title">\uC99D\uBE59\uC790\uB8CC</div>
          <div class="header-info">\uC811\uC218\uBC88\uD638: ${caseData.caseNumber || ""}</div>
        </div>
        <div class="images-wrapper">
          ${imagesBlockHtml}
        </div>
      </div>
    `;
  }
  console.log(`[PDF \uC99D\uBE59\uC790\uB8CC] \uC0DD\uC131\uB41C \uD398\uC774\uC9C0 \uC218: ${Math.ceil(allImages.length / 2)}`);
  template = template.replace("{{imagesHtml}}", pagesHtml);
  template = template.replace("{{#unless hasImages}}", "<!--");
  template = template.replace("{{/unless}}", "-->");
  template = template.replace("{{caseNumber}}", caseData.caseNumber || "");
  return template;
}
async function generateRecoveryAreaPage(caseData, estimateRowsData) {
  const templatePath = path.join(TEMPLATES_DIR, "recovery-area.html");
  let template = fs.readFileSync(templatePath, "utf-8");
  const fullAddress = [caseData.insuredAddress, caseData.insuredAddressDetail].filter(Boolean).join(" ");
  const categoryGroups = {};
  if (estimateRowsData && estimateRowsData.length > 0) {
    estimateRowsData.forEach((row) => {
      const category = row.category || "\uAE30\uD0C0";
      if (!categoryGroups[category]) {
        categoryGroups[category] = [];
      }
      categoryGroups[category].push(row);
    });
  }
  let areaRowsHtml = "";
  const categories = Object.keys(categoryGroups);
  if (categories.length > 0) {
    categories.forEach((category) => {
      const rows = categoryGroups[category];
      const rowSpan = rows.length;
      rows.forEach((row, index) => {
        const damageW = row.damageWidth ? Number(row.damageWidth).toFixed(1) : "0.0";
        const damageH = row.damageHeight ? Number(row.damageHeight).toFixed(1) : "0.0";
        const damageAreaM2 = row.damageArea ? Number(row.damageArea).toFixed(1) : "0.0";
        const repairW = row.repairWidth ? Number(row.repairWidth).toFixed(1) : "0.0";
        const repairH = row.repairHeight ? Number(row.repairHeight).toFixed(1) : "0.0";
        const repairAreaM2 = row.repairArea ? Number(row.repairArea).toFixed(1) : "0.0";
        const workContent = row.location || "-";
        const workType = row.workName || "-";
        const note = row.note || "-";
        if (index === 0) {
          areaRowsHtml += `
            <tr>
              <td class="category-cell" rowspan="${rowSpan}">${category}</td>
              <td>${workContent}</td>
              <td>${workType}</td>
              <td>${damageAreaM2}</td>
              <td>${damageW}</td>
              <td>${damageH}</td>
              <td>${repairAreaM2}</td>
              <td>${repairW}</td>
              <td>${repairH}</td>
              <td>${note}</td>
            </tr>
          `;
        } else {
          areaRowsHtml += `
            <tr>
              <td>${workContent}</td>
              <td>${workType}</td>
              <td>${damageAreaM2}</td>
              <td>${damageW}</td>
              <td>${damageH}</td>
              <td>${repairAreaM2}</td>
              <td>${repairW}</td>
              <td>${repairH}</td>
              <td>${note}</td>
            </tr>
          `;
        }
      });
    });
  } else {
    areaRowsHtml = '<tr><td colspan="10" style="text-align:center;padding:10mm;">\uB4F1\uB85D\uB41C \uBCF5\uAD6C\uBA74\uC801 \uB370\uC774\uD130\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.</td></tr>';
  }
  const data = {
    caseNumber: caseData.caseNumber || "",
    insuranceCompany: caseData.insuranceCompany || "",
    insuranceAccidentNo: caseData.insuranceAccidentNo || "",
    address: fullAddress,
    documentDate: formatDate((/* @__PURE__ */ new Date()).toISOString()),
    areaRowsHtml
  };
  template = template.replace("{{areaRowsHtml}}", areaRowsHtml);
  return replaceTemplateVariables(template, data);
}
async function generateEstimatePage(caseData, estimateData, estimateRowsData, partnerData) {
  const templatePath = path.join(TEMPLATES_DIR, "estimate.html");
  let template = fs.readFileSync(templatePath, "utf-8");
  const fullAddress = [caseData.insuredAddress, caseData.insuredAddressDetail].filter(Boolean).join(" ");
  let areaRowsHtml = "";
  if (estimateRowsData && estimateRowsData.length > 0) {
    estimateRowsData.forEach((row, index) => {
      const damageW = row.damageWidth || "-";
      const damageH = row.damageHeight || "-";
      const damageAreaM2 = row.damageArea ? Number(row.damageArea).toFixed(2) : "-";
      const damageDisplay = `${damageW}\xD7${damageH}=${damageAreaM2}\u33A1`;
      const repairW = row.repairWidth || "-";
      const repairH = row.repairHeight || "-";
      const repairAreaM2 = row.repairArea ? Number(row.repairArea).toFixed(2) : "-";
      const repairDisplay = `${repairW}\xD7${repairH}=${repairAreaM2}\u33A1`;
      areaRowsHtml += `
        <tr>
          <td style="text-align:center">${index + 1}</td>
          <td style="text-align:center">${row.category || "-"}</td>
          <td style="text-align:center">${row.location || "-"}</td>
          <td style="text-align:center">${row.workType || "-"}</td>
          <td style="text-align:left">${row.workName || "-"}</td>
          <td style="text-align:center">${damageDisplay}</td>
          <td style="text-align:center">${repairDisplay}</td>
          <td style="text-align:left">${row.note || "-"}</td>
        </tr>
      `;
    });
  } else {
    areaRowsHtml = '<tr><td colspan="8" style="text-align:center;padding:5mm;">\uB4F1\uB85D\uB41C \uBCF5\uAD6C\uBA74\uC801\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</td></tr>';
  }
  let laborCostData = [];
  let materialCostData = [];
  let laborTotal = 0;
  let materialTotal = 0;
  if (estimateData) {
    if (estimateData.laborCostData) {
      try {
        laborCostData = typeof estimateData.laborCostData === "string" ? JSON.parse(estimateData.laborCostData) : estimateData.laborCostData;
        if (Array.isArray(laborCostData)) {
          laborTotal = laborCostData.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
        }
      } catch {
        laborCostData = [];
      }
    }
    if (estimateData.materialCostData) {
      try {
        let rawMaterialData = typeof estimateData.materialCostData === "string" ? JSON.parse(estimateData.materialCostData) : estimateData.materialCostData;
        if (rawMaterialData && typeof rawMaterialData === "object") {
          if (Array.isArray(rawMaterialData)) {
            materialCostData = rawMaterialData;
          } else if (rawMaterialData.rows && Array.isArray(rawMaterialData.rows)) {
            materialCostData = rawMaterialData.rows;
          }
        }
        if (Array.isArray(materialCostData) && materialCostData.length > 0) {
          materialTotal = materialCostData.reduce((sum, item) => {
            const amount = Number(item.\uD569\uACC4) || Number(item.\uAE08\uC561) || Number(item.amount) || 0;
            return sum + amount;
          }, 0);
          console.log(`[PDF \uC790\uC7AC\uBE44] ${materialCostData.length}\uAC1C \uD56D\uBAA9, \uD569\uACC4: ${materialTotal}`);
        }
      } catch (err) {
        console.error("[PDF \uC790\uC7AC\uBE44 \uD30C\uC2F1 \uC624\uB958]:", err);
        materialCostData = [];
      }
    }
  }
  let laborRowsHtml = "";
  if (laborCostData.length > 0) {
    laborCostData.forEach((item) => {
      const category = item.category || "-";
      const workName = item.workName || "-";
      const detailItem = item.detailItem || "-";
      const damageAreaValue = item.damageArea || 0;
      const damageAreaDisplay = damageAreaValue > 0 ? `${Number(damageAreaValue).toFixed(0)}\u33A1` : "-";
      const pricePerSqm = item.pricePerSqm || item.standardPrice || 0;
      const quantity = item.quantity || 0;
      const amount = item.amount || 0;
      const isExpense = item.includeInEstimate === true || item.includeInEstimate === "true" ? "O" : "-";
      const note = item.request || "-";
      laborRowsHtml += `
        <tr>
          <td style="text-align:center">${category}</td>
          <td style="text-align:center">${workName}</td>
          <td style="text-align:center">${detailItem}</td>
          <td style="text-align:right">${damageAreaDisplay}</td>
          <td style="text-align:right">${formatNumber(Math.round(pricePerSqm))}</td>
          <td style="text-align:center">${Number(quantity).toFixed(2)}</td>
          <td style="text-align:right">${formatNumber(Math.round(amount))}</td>
          <td style="text-align:center">${isExpense}</td>
          <td style="text-align:left">${note}</td>
        </tr>
      `;
    });
    laborRowsHtml += `
      <tr style="background-color:#f5f5f5;font-weight:bold;">
        <td colspan="6" style="text-align:center">\uB178\uBB34\uBE44 \uC18C\uACC4</td>
        <td style="text-align:right">${formatNumber(Math.round(laborTotal))}</td>
        <td colspan="2"></td>
      </tr>
    `;
  } else {
    laborRowsHtml = '<tr><td colspan="9" style="text-align:center;padding:5mm;">\uB4F1\uB85D\uB41C \uB178\uBB34\uBE44\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.</td></tr>';
  }
  let materialRowsHtml = "";
  if (materialCostData.length > 0) {
    materialCostData.forEach((item) => {
      const category = item.\uACF5\uC885 || item.category || "-";
      const workName = item.\uACF5\uC0AC\uBA85 || item.workName || "-";
      const materialItem = item.\uC790\uC7AC\uD56D\uBAA9 || item.\uC790\uC7AC || "-";
      const unitPrice = item.\uB2E8\uAC00 || item.\uAE30\uC900\uB2E8\uAC00 || 0;
      const quantity = item.\uC218\uB7C9 || 0;
      const unit = item.\uB2E8\uC704 || "-";
      const amount = item.\uD569\uACC4 || item.\uAE08\uC561 || 0;
      const note = item.\uBE44\uACE0 || "-";
      materialRowsHtml += `
        <tr>
          <td style="text-align:center">${category}</td>
          <td style="text-align:center">${workName}</td>
          <td style="text-align:left">${materialItem}</td>
          <td style="text-align:right">${formatNumber(Math.round(unitPrice))}</td>
          <td style="text-align:center">${Number(quantity).toFixed(2)}</td>
          <td style="text-align:center">${unit}</td>
          <td style="text-align:right">${formatNumber(Math.round(amount))}</td>
          <td style="text-align:left">${note}</td>
        </tr>
      `;
    });
    materialRowsHtml += `
      <tr style="background-color:#f5f5f5;font-weight:bold;">
        <td colspan="6" style="text-align:center">\uC790\uC7AC\uBE44 \uC18C\uACC4</td>
        <td style="text-align:right">${formatNumber(Math.round(materialTotal))}</td>
        <td></td>
      </tr>
    `;
  } else {
    materialRowsHtml = '<tr><td colspan="8" style="text-align:center;padding:5mm;">\uB4F1\uB85D\uB41C \uC790\uC7AC\uBE44\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.</td></tr>';
  }
  let vatIncluded = true;
  if (estimateData?.materialCostData) {
    try {
      const rawData = typeof estimateData.materialCostData === "string" ? JSON.parse(estimateData.materialCostData) : estimateData.materialCostData;
      if (rawData && typeof rawData === "object" && rawData.vatIncluded !== void 0) {
        vatIncluded = rawData.vatIncluded;
      }
    } catch {
    }
  }
  let laborTotalNonExpense = 0;
  let laborTotalExpense = 0;
  if (Array.isArray(laborCostData)) {
    laborCostData.forEach((item) => {
      const amount = Number(item.amount) || 0;
      if (item.includeInEstimate === true || item.includeInEstimate === "true") {
        laborTotalNonExpense += amount;
      } else {
        laborTotalExpense += amount;
      }
    });
  }
  const subtotal = laborTotal + materialTotal;
  const baseForFees = laborTotalNonExpense + materialTotal;
  const managementFee = Math.round(baseForFees * 0.06);
  const profit = Math.round(baseForFees * 0.15);
  const vatBase = subtotal + managementFee + profit;
  const truncation = vatBase % 1e4;
  const truncatedVatBase = vatBase - truncation;
  const vat = vatIncluded ? Math.round(truncatedVatBase * 0.1) : 0;
  const grandTotal = truncatedVatBase + vat;
  const data = {
    caseNumber: caseData.caseNumber || "",
    insuranceAccidentNo: caseData.insuranceAccidentNo || "",
    insuranceCompany: caseData.insuranceCompany || "",
    insuredName: caseData.insuredName || caseData.victimName || "",
    address: fullAddress,
    documentDate: formatDate((/* @__PURE__ */ new Date()).toISOString()),
    partnerCompany: caseData.assignedPartner || "",
    supplierBusinessNumber: partnerData?.businessRegistrationNumber || "",
    supplierCompanyName: partnerData?.company || caseData.assignedPartner || "",
    supplierRepresentative: partnerData?.representativeName || "",
    areaRowsHtml,
    laborRowsHtml,
    materialRowsHtml,
    laborTotal: formatNumber(laborTotal),
    materialTotal: formatNumber(materialTotal),
    subtotal: formatNumber(subtotal),
    managementFee: formatNumber(managementFee),
    profit: formatNumber(profit),
    vat: formatNumber(vat),
    vatStatus: vatIncluded ? "\uD3EC\uD568" : "\uBCC4\uB3C4",
    truncation: formatNumber(truncation),
    grandTotal: formatNumber(grandTotal),
    estimateAmount: formatNumber(Number(caseData.estimateAmount) || grandTotal)
  };
  const areaTableRegex = /(<tbody id="area-rows">)([\s\S]*?)(<\/tbody>)/i;
  template = template.replace(areaTableRegex, `$1${areaRowsHtml}$3`);
  const laborTableRegex = /(<tbody id="labor-rows">)([\s\S]*?)(<\/tbody>)/i;
  template = template.replace(laborTableRegex, `$1${laborRowsHtml}$3`);
  const materialTableRegex = /(<tbody id="material-rows">)([\s\S]*?)(<\/tbody>)/i;
  template = template.replace(materialTableRegex, `$1${materialRowsHtml}$3`);
  return replaceTemplateVariables(template, data);
}
async function generatePdf(payload) {
  const { caseId, sections, evidence } = payload;
  const [caseData] = await db.select().from(cases).where(eq2(cases.id, caseId));
  if (!caseData) {
    throw new Error("\uCF00\uC774\uC2A4\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.");
  }
  let partnerData = null;
  if (caseData.assignedPartner) {
    const partners = await db.select().from(users).where(eq2(users.company, caseData.assignedPartner));
    partnerData = partners[0] || null;
  }
  let browser = null;
  try {
    browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || "/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium",
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
    });
    const pdfParts = [];
    if (sections.cover) {
      const coverHtml = await generateCoverPage(caseData, partnerData);
      const page = await browser.newPage();
      await page.setContent(coverHtml, { waitUntil: "networkidle0" });
      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "0", right: "0", bottom: "0", left: "0" }
      });
      pdfParts.push(Buffer.from(pdfBuffer));
      await page.close();
    }
    if (sections.fieldReport) {
      let repairItems = [];
      const estimateList = await db.select().from(estimates).where(eq2(estimates.caseId, caseId)).orderBy(estimates.version);
      if (estimateList.length > 0) {
        const latestEstimate = estimateList[estimateList.length - 1];
        repairItems = await db.select().from(estimateRows).where(eq2(estimateRows.estimateId, latestEstimate.id)).orderBy(estimateRows.rowOrder);
      }
      const fieldReportHtml = await generateFieldReportPage(caseData, partnerData, repairItems);
      const page = await browser.newPage();
      await page.setContent(fieldReportHtml, { waitUntil: "networkidle0" });
      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "0", right: "0", bottom: "0", left: "0" }
      });
      pdfParts.push(Buffer.from(pdfBuffer));
      await page.close();
    }
    if (sections.drawing) {
      const [drawingData] = await db.select().from(drawings).where(eq2(drawings.caseId, caseId));
      const drawingHtml = await generateDrawingPage(caseData, drawingData);
      const page = await browser.newPage();
      await page.setContent(drawingHtml, { waitUntil: "networkidle0" });
      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "0", right: "0", bottom: "0", left: "0" }
      });
      pdfParts.push(Buffer.from(pdfBuffer));
      await page.close();
    }
    const pdfDocumentsToAppend = [];
    const categoryToTab = {
      "\uD604\uC7A5\uCD9C\uB3D9\uC0AC\uC9C4": "\uD604\uC7A5\uC0AC\uC9C4",
      "\uD604\uC7A5": "\uD604\uC7A5\uC0AC\uC9C4",
      "\uC218\uB9AC\uC911 \uC0AC\uC9C4": "\uD604\uC7A5\uC0AC\uC9C4",
      "\uC218\uB9AC\uC911": "\uD604\uC7A5\uC0AC\uC9C4",
      "\uBCF5\uAD6C\uC644\uB8CC \uC0AC\uC9C4": "\uD604\uC7A5\uC0AC\uC9C4",
      "\uBCF5\uAD6C\uC644\uB8CC": "\uD604\uC7A5\uC0AC\uC9C4",
      "\uBCF4\uD5D8\uAE08 \uCCAD\uAD6C\uC11C": "\uAE30\uBCF8\uC790\uB8CC",
      "\uAC1C\uC778\uC815\uBCF4 \uB3D9\uC758\uC11C(\uAC00\uC871\uC6A9)": "\uAE30\uBCF8\uC790\uB8CC",
      "\uC8FC\uBBFC\uB4F1\uB85D\uB4F1\uBCF8": "\uC99D\uBE59\uC790\uB8CC",
      "\uB4F1\uAE30\uBD80\uB4F1\uBCF8": "\uC99D\uBE59\uC790\uB8CC",
      "\uAC74\uCD95\uBB3C\uB300\uC7A5": "\uC99D\uBE59\uC790\uB8CC",
      "\uAE30\uD0C0\uC99D\uBE59\uC790\uB8CC(\uBBFC\uC6D0\uC77C\uC9C0 \uB4F1)": "\uC99D\uBE59\uC790\uB8CC",
      "\uC704\uC784\uC7A5": "\uCCAD\uAD6C\uC790\uB8CC",
      "\uB3C4\uAE09\uACC4\uC57D\uC11C": "\uCCAD\uAD6C\uC790\uB8CC",
      "\uBCF5\uAD6C\uC644\uB8CC\uD655\uC778\uC11C": "\uCCAD\uAD6C\uC790\uB8CC",
      "\uBD80\uAC00\uC138 \uCCAD\uAD6C\uC790\uB8CC": "\uCCAD\uAD6C\uC790\uB8CC",
      "\uCCAD\uAD6C": "\uCCAD\uAD6C\uC790\uB8CC"
    };
    if (sections.evidence && evidence.selectedFileIds.length > 0) {
      const selectedDocs = await db.select().from(caseDocuments).where(
        and2(
          eq2(caseDocuments.caseId, caseId),
          inArray(caseDocuments.id, evidence.selectedFileIds)
        )
      );
      const imageDocs = selectedDocs.filter((doc) => doc.fileType?.startsWith("image/"));
      const pdfDocs = selectedDocs.filter((doc) => doc.fileType === "application/pdf" || doc.fileName?.toLowerCase().endsWith(".pdf"));
      console.log(`[PDF \uC0DD\uC131] \uC120\uD0DD\uB41C \uBB38\uC11C \uC218: ${selectedDocs.length}, \uC774\uBBF8\uC9C0: ${imageDocs.length}, PDF: ${pdfDocs.length}`);
      console.log("[PDF \uC0DD\uC131] PDF \uBB38\uC11C \uBAA9\uB85D:", pdfDocs.map((d) => ({ id: d.id, name: d.fileName, type: d.fileType, category: d.category })));
      if (imageDocs.length > 0) {
        const evidenceHtml = await generateEvidencePages(caseData, imageDocs);
        if (evidenceHtml && evidenceHtml.trim().length > 0) {
          const page = await browser.newPage();
          await page.setContent(evidenceHtml, { waitUntil: "networkidle0", timeout: 6e4 });
          await page.evaluate(() => {
            return Promise.all(
              Array.from(document.images).filter((img) => !img.complete).map((img) => new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = resolve;
              }))
            );
          });
          const pdfBuffer = await page.pdf({
            format: "A4",
            printBackground: true,
            margin: { top: "0", right: "0", bottom: "0", left: "0" }
          });
          pdfParts.push(Buffer.from(pdfBuffer));
          await page.close();
        } else {
          console.log("[PDF \uC0DD\uC131] \uC99D\uBE59\uC790\uB8CC \uC774\uBBF8\uC9C0 \uC5C6\uC74C - \uD398\uC774\uC9C0 \uAC74\uB108\uB700");
        }
      }
      pdfDocs.forEach((doc) => {
        const tab = categoryToTab[doc.category] || "\uAE30\uD0C0";
        pdfDocumentsToAppend.push({ doc, tab });
      });
      if (pdfDocumentsToAppend.length > 0) {
        const tabOrder = ["\uD604\uC7A5\uC0AC\uC9C4", "\uAE30\uBCF8\uC790\uB8CC", "\uC99D\uBE59\uC790\uB8CC", "\uCCAD\uAD6C\uC790\uB8CC", "\uAE30\uD0C0"];
        const sortedPdfDocs = [...pdfDocumentsToAppend].sort((a, b) => {
          const aIndex = tabOrder.indexOf(a.tab);
          const bIndex = tabOrder.indexOf(b.tab);
          return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
        });
        const generatePdfAttachmentHeader = (tabName, category, fileName, caseNumber) => {
          return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @page { size: A4; margin: 0; }
    body { 
      font-family: 'Noto Sans KR', sans-serif; 
      margin: 0; 
      padding: 20mm;
      box-sizing: border-box;
    }
    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: linear-gradient(135deg, #3b82f6, #6366f1);
      color: white;
      padding: 10mm 15mm;
      margin: -20mm -20mm 20mm -20mm;
    }
    .header-title { font-size: 18pt; font-weight: bold; }
    .header-info { font-size: 10pt; }
    .content {
      padding: 20mm;
      text-align: center;
    }
    .tab-badge {
      display: inline-block;
      background: #3b82f6;
      color: white;
      padding: 5mm 10mm;
      border-radius: 5mm;
      font-size: 14pt;
      margin-bottom: 10mm;
    }
    .category-name {
      font-size: 16pt;
      color: #374151;
      margin-bottom: 10mm;
    }
    .file-name {
      font-size: 12pt;
      color: #6b7280;
      word-break: break-all;
    }
    .note {
      margin-top: 20mm;
      font-size: 10pt;
      color: #9ca3af;
    }
  </style>
</head>
<body>
  <div class="header-bar">
    <div class="header-title">\uC99D\uBE59\uC790\uB8CC - PDF \uCCA8\uBD80</div>
    <div class="header-info">\uC811\uC218\uBC88\uD638: ${caseNumber}</div>
  </div>
  <div class="content">
    <div class="tab-badge">${tabName}</div>
    <div class="category-name">${category}</div>
    <div class="file-name">${fileName}</div>
    <div class="note">\u203B \uB2E4\uC74C \uD398\uC774\uC9C0\uBD80\uD130 \uCCA8\uBD80 PDF \uB0B4\uC6A9\uC774 \uD45C\uC2DC\uB429\uB2C8\uB2E4.</div>
  </div>
</body>
</html>`;
        };
        console.log(`[PDF \uC99D\uBE59\uC790\uB8CC] PDF \uCCA8\uBD80\uD30C\uC77C ${sortedPdfDocs.length}\uAC1C\uB97C \uC99D\uBE59\uC790\uB8CC \uC139\uC158\uC5D0 \uCD94\uAC00`);
        if (!browser) {
          browser = await puppeteer.launch({
            headless: true,
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || "/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium",
            args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
          });
        }
        for (const { doc: pdfDoc, tab } of sortedPdfDocs) {
          try {
            const headerHtml = generatePdfAttachmentHeader(tab, pdfDoc.category, pdfDoc.fileName, caseData.caseNumber || "");
            const headerPage = await browser.newPage();
            await headerPage.setContent(headerHtml, { waitUntil: "networkidle0" });
            const headerPdfBuffer = await headerPage.pdf({
              format: "A4",
              printBackground: true,
              margin: { top: "0", right: "0", bottom: "0", left: "0" }
            });
            pdfParts.push(Buffer.from(headerPdfBuffer));
            await headerPage.close();
            console.log(`[PDF \uC99D\uBE59\uC790\uB8CC] \uD5E4\uB354 \uCD94\uAC00: ${tab} - ${pdfDoc.category} - ${pdfDoc.fileName}`);
            let pdfData;
            if (pdfDoc.fileData.startsWith("data:")) {
              const base64Data = pdfDoc.fileData.split(",")[1];
              pdfData = Buffer.from(base64Data, "base64");
            } else {
              pdfData = Buffer.from(pdfDoc.fileData, "base64");
            }
            pdfParts.push(Buffer.from(pdfData));
            console.log(`[PDF \uC99D\uBE59\uC790\uB8CC] PDF \uB0B4\uC6A9 \uCD94\uAC00: ${pdfDoc.fileName} (${pdfData.length} bytes)`);
          } catch (err) {
            console.error(`[PDF \uC99D\uBE59\uC790\uB8CC] PDF \uCC98\uB9AC \uC2E4\uD328 (${pdfDoc.fileName}):`, err);
          }
        }
        pdfDocumentsToAppend.length = 0;
      }
    }
    if (sections.estimate) {
      const estimateList = await db.select().from(estimates).where(eq2(estimates.caseId, caseId)).orderBy(estimates.version);
      let estimateData = null;
      let estimateRowsData = [];
      if (estimateList.length > 0) {
        estimateData = estimateList[estimateList.length - 1];
        estimateRowsData = await db.select().from(estimateRows).where(eq2(estimateRows.estimateId, estimateData.id)).orderBy(estimateRows.rowOrder);
      }
      if (estimateRowsData.length > 0) {
        const recoveryAreaHtml = await generateRecoveryAreaPage(caseData, estimateRowsData);
        const recoveryPage = await browser.newPage();
        await recoveryPage.setContent(recoveryAreaHtml, { waitUntil: "networkidle0" });
        const recoveryPdfBuffer = await recoveryPage.pdf({
          format: "A4",
          printBackground: true,
          margin: { top: "0", right: "0", bottom: "0", left: "0" }
        });
        pdfParts.push(Buffer.from(recoveryPdfBuffer));
        await recoveryPage.close();
      }
      const estimateHtml = await generateEstimatePage(caseData, estimateData, estimateRowsData, partnerData);
      const page = await browser.newPage();
      await page.setContent(estimateHtml, { waitUntil: "networkidle0" });
      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "0", right: "0", bottom: "0", left: "0" }
      });
      pdfParts.push(Buffer.from(pdfBuffer));
      await page.close();
    }
    await browser.close();
    browser = null;
    const mergedPdf = await PDFDocument.create();
    for (const pdfBuffer of pdfParts) {
      try {
        const pdf = await PDFDocument.load(pdfBuffer);
        const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        pages.forEach((page) => mergedPdf.addPage(page));
      } catch (err) {
        console.error("PDF \uB85C\uB4DC \uC2E4\uD328:", err);
      }
    }
    if (pdfDocumentsToAppend.length > 0) {
      console.log(`[PDF \uBCD1\uD569] \uC99D\uBE59\uC790\uB8CC \uC139\uC158\uC5D0\uC11C \uCC98\uB9AC\uB418\uC9C0 \uC54A\uC740 PDF ${pdfDocumentsToAppend.length}\uAC1C \uCD94\uAC00`);
      for (const { doc: pdfDoc, tab } of pdfDocumentsToAppend) {
        try {
          console.log(`[PDF \uBCD1\uD569] \uCC98\uB9AC \uC911: ${pdfDoc.fileName} (${tab}), \uB370\uC774\uD130 \uAE38\uC774: ${pdfDoc.fileData?.length || 0}`);
          let pdfData;
          if (pdfDoc.fileData.startsWith("data:")) {
            const base64Data = pdfDoc.fileData.split(",")[1];
            pdfData = Buffer.from(base64Data, "base64");
          } else {
            pdfData = Buffer.from(pdfDoc.fileData, "base64");
          }
          console.log(`[PDF \uBCD1\uD569] \uB514\uCF54\uB529\uB41C PDF \uD06C\uAE30: ${pdfData.length} bytes`);
          const attachedPdf = await PDFDocument.load(pdfData, { ignoreEncryption: true });
          const pageCount = attachedPdf.getPageCount();
          console.log(`[PDF \uBCD1\uD569] \uCCA8\uBD80 PDF \uD398\uC774\uC9C0 \uC218: ${pageCount}`);
          const pages = await mergedPdf.copyPages(attachedPdf, attachedPdf.getPageIndices());
          pages.forEach((page) => mergedPdf.addPage(page));
          console.log(`[PDF \uBCD1\uD569] \uC131\uACF5: ${pdfDoc.fileName} (${pageCount}\uD398\uC774\uC9C0 \uCD94\uAC00)`);
        } catch (err) {
          console.error(`[PDF \uBCD1\uD569] \uC2E4\uD328 (${pdfDoc.fileName}):`, err);
        }
      }
    }
    const finalPdfBytes = await mergedPdf.save();
    return Buffer.from(finalPdfBytes);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// server/invoice-pdf-service.ts
import puppeteer2 from "puppeteer";
import nodemailer from "nodemailer";
function formatAmount(amount) {
  return amount.toLocaleString("ko-KR") + "\uC6D0";
}
function formatDate2(dateStr) {
  if (!dateStr) {
    return (/* @__PURE__ */ new Date()).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).replace(/\. /g, ".").replace(/\.$/, "");
  }
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).replace(/\. /g, ".").replace(/\.$/, "");
  } catch {
    return dateStr;
  }
}
function generateInvoiceHtml(data) {
  const particularsContent = data.particulars.map((item) => {
    let html = `<div class="particulars-item">
      <div class="particulars-item-title">\u25A0 ${item.title}</div>`;
    if (item.detail) {
      html += `<div class="particulars-item-detail">${item.detail}</div>`;
    }
    html += `</div>`;
    return html;
  }).join("");
  const amountContent = data.particulars.map((item) => {
    return `<div class="amount-item">${formatAmount(item.amount)}</div>`;
  }).join("");
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>INVOICE</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Noto Sans KR', sans-serif;
      font-size: 12px;
      line-height: 1.5;
      color: #000;
      background: #fff;
      width: 210mm;
      min-height: 297mm;
      padding: 20mm 15mm;
    }
    
    .container {
      width: 100%;
      max-width: 180mm;
      margin: 0 auto;
    }
    
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 10px;
      border-bottom: 2px solid #000;
    }
    
    .header h1 {
      font-size: 28px;
      font-weight: 700;
      letter-spacing: 3px;
    }
    
    .info-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
    }
    
    .info-left, .info-right {
      width: 48%;
    }
    
    .info-row {
      display: flex;
      margin-bottom: 8px;
    }
    
    .info-label {
      width: 80px;
      font-weight: 500;
      color: #333;
    }
    
    .info-colon {
      width: 20px;
      text-align: center;
    }
    
    .info-value {
      flex: 1;
      color: #0066cc;
      font-weight: 500;
    }
    
    .table-section {
      margin-bottom: 40px;
    }
    
    .particulars-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #000;
    }
    
    .particulars-table th {
      background: #f5f5f5;
      padding: 12px 16px;
      text-align: center;
      font-weight: 600;
      border: 1px solid #000;
      font-size: 13px;
    }
    
    .particulars-table td {
      padding: 16px;
      border: 1px solid #000;
      vertical-align: top;
    }
    
    .particulars-table .col-particulars {
      width: 65%;
    }
    
    .particulars-table .col-amount {
      width: 35%;
      text-align: right;
    }
    
    .particulars-content {
      min-height: 80px;
    }
    
    .particulars-item {
      margin-bottom: 12px;
    }
    
    .particulars-item-title {
      font-weight: 600;
      margin-bottom: 4px;
    }
    
    .particulars-item-detail {
      color: #666;
      font-size: 11px;
      margin-left: 16px;
    }
    
    .amount-item {
      margin-bottom: 12px;
      color: #cc0000;
      font-weight: 500;
      min-height: 20px;
    }
    
    .total-row td {
      background: #fafafa;
      font-weight: 700;
    }
    
    .total-label {
      text-align: left !important;
      padding-left: 16px !important;
    }
    
    .total-amount {
      color: #cc0000;
      font-weight: 700;
      font-size: 14px;
    }
    
    .account-section {
      border: 1px solid #000;
      margin-bottom: 40px;
    }
    
    .account-header {
      text-align: center;
      padding: 12px;
      background: #f9f9f9;
      border-bottom: 1px solid #000;
      font-weight: 600;
    }
    
    .account-body {
      padding: 16px;
    }
    
    .account-row {
      display: flex;
      margin-bottom: 8px;
    }
    
    .account-row:last-child {
      margin-bottom: 0;
    }
    
    .account-label {
      width: 120px;
      text-align: center;
      font-weight: 500;
    }
    
    .account-value {
      flex: 1;
      text-align: center;
    }
    
    .footer {
      text-align: center;
      padding-top: 30px;
      border-top: 2px solid #000;
      margin-top: 40px;
    }
    
    .footer-text {
      font-size: 18px;
      font-weight: 600;
      letter-spacing: 2px;
    }
    
    @media print {
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>INVOICE</h1>
    </div>
    
    <div class="info-section">
      <div class="info-left">
        <div class="info-row">
          <span class="info-label">\uC218 \uC2E0</span>
          <span class="info-colon">:</span>
          <span class="info-value">${data.recipientName || "-"}</span>
        </div>
        <div class="info-row">
          <span class="info-label">\uC0AC\uACE0\uBC88\uD638</span>
          <span class="info-colon">:</span>
          <span class="info-value">${data.caseNumber || "-"}</span>
        </div>
      </div>
      <div class="info-right">
        <div class="info-row">
          <span class="info-label">\uC218\uC784\uC77C\uC790</span>
          <span class="info-colon">:</span>
          <span class="info-value">${formatDate2(data.acceptanceDate)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">\uC81C\uCD9C\uC77C\uC790</span>
          <span class="info-colon">:</span>
          <span class="info-value">${formatDate2(data.submissionDate)}</span>
        </div>
      </div>
    </div>
    
    <div class="table-section">
      <table class="particulars-table">
        <thead>
          <tr>
            <th class="col-particulars">PARTICULARS</th>
            <th class="col-amount">AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="col-particulars">
              <div class="particulars-content">
                ${particularsContent}
              </div>
            </td>
            <td class="col-amount">
              <div class="particulars-content">
                ${amountContent}
              </div>
            </td>
          </tr>
          <tr class="total-row">
            <td class="total-label">TOTAL AMOUNT</td>
            <td class="col-amount">
              <span class="total-amount">${formatAmount(data.totalAmount)}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <div class="account-section">
      <div class="account-header">
        \uC544\uB798\uC758 \uACC4\uC88C\uB85C \uC785\uAE08 \uBD80\uD0C1\uB4DC\uB9BD\uB2C8\uB2E4.
      </div>
      <div class="account-body">
        <div class="account-row">
          <span class="account-label">\uC740\uD589\uBA85</span>
          <span class="account-value">\uC2E0\uD55C\uC740\uD589</span>
        </div>
        <div class="account-row">
          <span class="account-label">\uACC4\uC88C\uBC88\uD638</span>
          <span class="account-value">140-015-744120</span>
        </div>
        <div class="account-row">
          <span class="account-label">\uC608\uAE08\uC8FC</span>
          <span class="account-value">\uC8FC\uC2DD\uD68C\uC0AC \uD50C\uB85D\uC2A8</span>
        </div>
        <div class="account-row">
          <span class="account-label">\uC0AC\uC5C5\uC790\uB4F1\uB85D\uBC88\uD638</span>
          <span class="account-value">517-89-03490</span>
        </div>
      </div>
    </div>
    
    <div class="footer">
      <span class="footer-text">FLOXN., Inc</span>
    </div>
  </div>
</body>
</html>`;
}
async function generateInvoicePdf(data) {
  const html = generateInvoiceHtml(data);
  let browser = null;
  try {
    browser = await puppeteer2.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || "/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--single-process"
      ]
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" }
    });
    await page.close();
    await browser.close();
    browser = null;
    return Buffer.from(pdfBuffer);
  } catch (error) {
    if (browser) {
      await browser.close();
    }
    throw error;
  }
}

// server/routes.ts
function createSolapiAuthHeader(apiKey, apiSecret) {
  const date = (/* @__PURE__ */ new Date()).toISOString();
  const salt = crypto.randomBytes(32).toString("hex");
  const signature = crypto.createHmac("sha256", apiSecret).update(date + salt).digest("hex");
  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
}
function solapiHttpsRequest({ method, path: path4, headers, body }) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      { hostname: "api.solapi.com", port: 443, method, path: path4, headers, timeout: 15e3 },
      (res) => {
        let data = "";
        res.on("data", (c) => data += c);
        res.on("end", () => {
          try {
            const json2 = data ? JSON.parse(data) : {};
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              return resolve(json2);
            }
            reject({ statusCode: res.statusCode, body: json2 });
          } catch {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              return resolve({ raw: data });
            }
            reject({ statusCode: res.statusCode, body: data });
          }
        });
      }
    );
    req.on("timeout", () => req.destroy(new Error("REQUEST_TIMEOUT")));
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}
async function registerRoutes(app2) {
  registerObjectStorageRoutes(app2);
  app2.post("/api/login", async (req, res) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      console.log("[LOGIN ATTEMPT]", {
        username: validatedData.username,
        isProduction: process.env.REPLIT_DEPLOYMENT === "1",
        dbUrl: process.env.REPLIT_DEPLOYMENT === "1" ? "PROD_DATABASE" : "DEV_DATABASE"
      });
      const user = await storage.verifyPassword(
        validatedData.username,
        validatedData.password
      );
      if (!user) {
        console.log("[LOGIN FAILED] User not found or password mismatch:", validatedData.username);
        return res.status(401).json({
          error: "\uC544\uC774\uB514 \uB610\uB294 \uBE44\uBC00\uBC88\uD638\uAC00 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4"
        });
      }
      if (req.session) {
        req.session.userId = user.id;
        req.session.userRole = user.role;
        req.session.rememberMe = validatedData.rememberMe;
        console.log("[LOGIN] Setting session:", {
          userId: user.id,
          userRole: user.role,
          username: user.username
        });
        if (validatedData.rememberMe) {
          req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1e3;
        } else {
          req.session.cookie.maxAge = 24 * 60 * 60 * 1e3;
        }
      }
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Login error:", error);
      res.status(500).json({ error: "\uB85C\uADF8\uC778 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.post("/api/logout", async (req, res) => {
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          console.error("Logout error:", err);
          return res.status(500).json({ error: "\uB85C\uADF8\uC544\uC6C3 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
        }
        res.clearCookie("connect.sid");
        res.json({ success: true });
      });
    } else {
      res.json({ success: true });
    }
  });
  app2.get("/api/user", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(404).json({ error: "\uC0AC\uC6A9\uC790\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
    }
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  });
  app2.get("/api/check-session", async (req, res) => {
    if (req.session?.userId) {
      const user = await storage.getUser(req.session.userId);
      if (user) {
        const { password, ...userWithoutPassword } = user;
        return res.json({ authenticated: true, user: userWithoutPassword });
      }
    }
    res.json({ authenticated: false });
  });
  app2.post("/api/reset-admin-passwords", async (req, res) => {
    try {
      const isProduction2 = process.env.REPLIT_DEPLOYMENT === "1";
      const dbUrl = isProduction2 ? process.env.PROD_DATABASE_URL : process.env.DEV_DATABASE_URL;
      const dbHost2 = dbUrl ? dbUrl.match(/@([^/]+)\//)?.[1] : "unknown";
      console.log("[RESET ADMIN] Starting password reset", { isProduction: isProduction2, dbHost: dbHost2 });
      const adminUsernames = ["admin01", "admin02", "admin03", "admin04", "admin05"];
      const results = [];
      for (const username of adminUsernames) {
        try {
          const updated = await storage.updatePassword(username, "1234");
          results.push({ username, success: !!updated, error: null });
          console.log(`[RESET ADMIN] ${username}: ${updated ? "SUCCESS" : "USER NOT FOUND"}`);
        } catch (err) {
          results.push({ username, success: false, error: err.message });
          console.error(`[RESET ADMIN] ${username} ERROR:`, err.message);
        }
      }
      res.json({
        message: "Admin passwords reset complete",
        isProduction: isProduction2,
        dbHost: dbHost2,
        results
      });
    } catch (error) {
      console.error("[RESET ADMIN] Error:", error);
      res.status(500).json({ error: "Failed to reset passwords", details: error.message });
    }
  });
  app2.get("/api/debug/db-check", async (req, res) => {
    try {
      const isProduction2 = process.env.REPLIT_DEPLOYMENT === "1";
      const dbUrl = isProduction2 ? process.env.PROD_DATABASE_URL : process.env.DEV_DATABASE_URL;
      const dbHost2 = dbUrl ? dbUrl.match(/@([^/]+)\//)?.[1] : "unknown";
      const users2 = await storage.getAllUsers();
      const adminUsers = users2.filter((u) => u.role === "\uAD00\uB9AC\uC790");
      res.json({
        isProduction: isProduction2,
        dbHost: dbHost2,
        totalUsers: users2.length,
        adminUsers: adminUsers.map((u) => ({ username: u.username, status: u.status }))
      });
    } catch (error) {
      res.status(500).json({
        error: "Database check failed",
        details: error.message,
        isProduction: process.env.REPLIT_DEPLOYMENT === "1"
      });
    }
  });
  const BUILD_TIME = (/* @__PURE__ */ new Date()).toISOString();
  const BUILD_ID = `build-${Date.now()}`;
  app2.get("/api/debug/version", async (req, res) => {
    res.json({
      buildId: BUILD_ID,
      buildTime: BUILD_TIME,
      appVersion: "1.0.0-debug",
      nodeEnv: process.env.NODE_ENV,
      replitDeployment: process.env.REPLIT_DEPLOYMENT,
      isProduction: process.env.REPLIT_DEPLOYMENT === "1",
      hasDbStatusRoute: true,
      registeredDebugRoutes: ["/api/debug/version", "/api/debug/db-status"],
      serverStartTime: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  app2.get("/api/debug/db-status", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "\uC778\uC99D \uD544\uC694" });
      }
      const user = await storage.getUser(req.session.userId);
      if (!user || user.role !== "\uAD00\uB9AC\uC790") {
        return res.status(403).json({ error: "\uAD00\uB9AC\uC790 \uAD8C\uD55C \uD544\uC694" });
      }
      const isProduction2 = process.env.REPLIT_DEPLOYMENT === "1";
      const dbUrl = isProduction2 ? process.env.PROD_DATABASE_URL || process.env.DATABASE_URL : process.env.DEV_DATABASE_URL || process.env.DATABASE_URL;
      const maskedDbUrl = dbUrl ? dbUrl.replace(/\/\/[^@]+@/, "//***:***@").split("?")[0] : "NOT SET";
      const casesResult = await db.select({ count: sql4`count(*)` }).from(cases);
      const totalCases = casesResult[0]?.count || 0;
      const filteredCases = await storage.getAllCases(user);
      const allUsers = await storage.getAllUsers();
      const allCasesRaw = await db.select().from(cases);
      const statusBreakdown = {};
      allCasesRaw.forEach((c) => {
        const status = c.status || "null";
        statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
      });
      res.json({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        environment: {
          isProduction: isProduction2,
          NODE_ENV: process.env.NODE_ENV,
          REPLIT_DEPLOYMENT: process.env.REPLIT_DEPLOYMENT
        },
        database: {
          maskedUrl: maskedDbUrl,
          connectionTest: "OK"
        },
        counts: {
          totalCasesInDb: totalCases,
          casesReturnedByApi: filteredCases.length,
          totalUsers: allUsers.length
        },
        statusBreakdown,
        currentUser: {
          id: user.id,
          username: user.username,
          role: user.role
        },
        sampleCaseIds: allCasesRaw.slice(0, 3).map((c) => ({ id: c.id, caseNumber: c.caseNumber, status: c.status }))
      });
    } catch (error) {
      console.error("[DEBUG] Error:", error);
      res.status(500).json({
        error: "Debug endpoint error",
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });
  app2.get("/api/users/basic", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    try {
      const users2 = await storage.getAllUsers();
      const basicUsers = users2.map(({ id, name, username, phone, role, bankName, accountNumber }) => ({
        id,
        name,
        username,
        contact: phone,
        role,
        bankName,
        accountNumber
      }));
      res.json(basicUsers);
    } catch (error) {
      console.error("Get basic users error:", error);
      res.status(500).json({ error: "\uC0AC\uC6A9\uC790 \uBAA9\uB85D\uC744 \uBD88\uB7EC\uC624\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.get("/api/insurance-companies", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    try {
      const users2 = await storage.getAllUsers();
      const companySet = /* @__PURE__ */ new Set();
      users2.filter((u) => u.role === "\uBCF4\uD5D8\uC0AC" && u.company).forEach((u) => companySet.add(u.company));
      const insuranceCompanies = Array.from(companySet).sort();
      res.json(insuranceCompanies);
    } catch (error) {
      console.error("Get insurance companies error:", error);
      res.status(500).json({ error: "\uBCF4\uD5D8\uC0AC \uBAA9\uB85D\uC744 \uBD88\uB7EC\uC624\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.get("/api/users", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    if (req.session.userRole !== "\uAD00\uB9AC\uC790") {
      return res.status(403).json({ error: "\uAD00\uB9AC\uC790 \uAD8C\uD55C\uC774 \uD544\uC694\uD569\uB2C8\uB2E4" });
    }
    try {
      const users2 = await storage.getAllUsers();
      const usersWithoutPasswords = users2.map(({ password, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ error: "\uC0AC\uC6A9\uC790 \uBAA9\uB85D\uC744 \uBD88\uB7EC\uC624\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.post("/api/update-password", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    if (req.session.userRole !== "\uAD00\uB9AC\uC790") {
      return res.status(403).json({ error: "\uAD00\uB9AC\uC790 \uAD8C\uD55C\uC774 \uD544\uC694\uD569\uB2C8\uB2E4" });
    }
    try {
      const validatedData = updatePasswordSchema.parse(req.body);
      const updatedUser = await storage.updatePassword(
        validatedData.username,
        validatedData.newPassword
      );
      if (!updatedUser) {
        return res.status(404).json({ error: "\uC0AC\uC6A9\uC790\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
      }
      const { password, ...userWithoutPassword } = updatedUser;
      res.json({ success: true, user: userWithoutPassword });
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Password update error:", error);
      res.status(500).json({ error: "\uBE44\uBC00\uBC88\uD638 \uBCC0\uACBD \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.patch("/api/me/password", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    try {
      const validatedData = changeMyPasswordSchema.parse(req.body);
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ error: "\uC0AC\uC6A9\uC790\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
      }
      const isPasswordValid = await storage.verifyPassword(user.username, validatedData.currentPassword);
      if (!isPasswordValid) {
        return res.status(400).json({ error: "\uD604\uC7AC \uBE44\uBC00\uBC88\uD638\uAC00 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4" });
      }
      const updatedUser = await storage.updatePassword(user.username, validatedData.newPassword);
      if (!updatedUser) {
        return res.status(500).json({ error: "\uBE44\uBC00\uBC88\uD638 \uBCC0\uACBD \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
      }
      const { password, ...userWithoutPassword } = updatedUser;
      res.json({ success: true, message: "\uBE44\uBC00\uBC88\uD638\uAC00 \uC131\uACF5\uC801\uC73C\uB85C \uBCC0\uACBD\uB418\uC5C8\uC2B5\uB2C8\uB2E4" });
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ error: error.errors[0]?.message || "\uC785\uB825 \uAC12\uC774 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4" });
      }
      console.error("Change my password error:", error);
      res.status(500).json({ error: "\uBE44\uBC00\uBC88\uD638 \uBCC0\uACBD \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.post("/api/delete-account", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    if (req.session.userRole !== "\uAD00\uB9AC\uC790") {
      return res.status(403).json({ error: "\uAD00\uB9AC\uC790 \uAD8C\uD55C\uC774 \uD544\uC694\uD569\uB2C8\uB2E4" });
    }
    try {
      const validatedData = deleteAccountSchema.parse(req.body);
      const deletedUser = await storage.deleteAccount(validatedData.username);
      if (!deletedUser) {
        return res.status(404).json({ error: "\uC0AC\uC6A9\uC790\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
      }
      const { password, ...userWithoutPassword } = deletedUser;
      res.json({ success: true, user: userWithoutPassword });
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Delete account error:", error);
      res.status(500).json({ error: "\uACC4\uC815 \uC0AD\uC81C \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.patch("/api/users/:id", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    if (req.session.userRole !== "\uAD00\uB9AC\uC790") {
      return res.status(403).json({ error: "\uAD00\uB9AC\uC790 \uAD8C\uD55C\uC774 \uD544\uC694\uD569\uB2C8\uB2E4" });
    }
    try {
      const userId = req.params.id;
      const validatedData = updateUserSchema.parse(req.body);
      const updatedUser = await storage.updateUser(userId, validatedData);
      if (!updatedUser) {
        return res.status(404).json({ error: "\uC0AC\uC6A9\uC790\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
      }
      const { password, ...userWithoutPassword } = updatedUser;
      res.json({ success: true, user: userWithoutPassword });
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Update user error:", error);
      res.status(500).json({ error: "\uACC4\uC815 \uC815\uBCF4 \uC218\uC815 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.post("/api/create-account", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    if (req.session.userRole !== "\uAD00\uB9AC\uC790") {
      return res.status(403).json({ error: "\uAD00\uB9AC\uC790 \uAD8C\uD55C\uC774 \uD544\uC694\uD569\uB2C8\uB2E4" });
    }
    try {
      console.log("Create account request body:", JSON.stringify(req.body, null, 2));
      const validatedData = createAccountSchema.parse(req.body);
      console.log("Validated data:", JSON.stringify(validatedData, null, 2));
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(409).json({ error: "\uC774\uBBF8 \uC0AC\uC6A9 \uC911\uC778 \uC544\uC774\uB514\uC785\uB2C8\uB2E4" });
      }
      const newUser = await storage.createUser({
        username: validatedData.username,
        password: validatedData.password,
        role: validatedData.role,
        name: validatedData.name,
        company: validatedData.company,
        department: validatedData.department,
        position: validatedData.position,
        email: validatedData.email || void 0,
        phone: validatedData.phone,
        office: validatedData.office,
        address: validatedData.address,
        bankName: validatedData.bankName,
        accountNumber: validatedData.accountNumber,
        accountHolder: validatedData.accountHolder,
        serviceRegions: validatedData.serviceRegions,
        attachments: validatedData.attachments,
        status: "active"
      });
      console.log("Created user:", JSON.stringify(newUser, null, 2));
      const { password, ...userWithoutPassword } = newUser;
      res.status(201).json({ success: true, user: userWithoutPassword });
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create account error:", error);
      res.status(500).json({ error: "\uACC4\uC815 \uC0DD\uC131 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.get("/api/cases/next-sequence", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    try {
      const date = req.query.date;
      if (!date) {
        return res.status(400).json({ error: "\uB0A0\uC9DC\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4" });
      }
      const insuranceAccidentNo = req.query.insuranceAccidentNo;
      const result = await storage.getNextCaseSequence(date, insuranceAccidentNo);
      res.json(result);
    } catch (error) {
      console.error("Get next sequence error:", error);
      res.status(500).json({ error: "\uC21C\uBC88 \uC870\uD68C \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.post("/api/cases", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    try {
      console.log("\u{1F4E5} Incoming sameAsPolicyHolder:", req.body.sameAsPolicyHolder, "type:", typeof req.body.sameAsPolicyHolder);
      console.log("\u{1F4E5} Incoming managerId:", req.body.managerId);
      console.log("\u{1F4E5} Incoming assignedPartnerManager:", req.body.assignedPartnerManager);
      const validatedData = insertCaseRequestSchema.parse(req.body);
      console.log("\u2705 Validated sameAsPolicyHolder:", validatedData.sameAsPolicyHolder, "type:", typeof validatedData.sameAsPolicyHolder);
      console.log("\u2705 Validated managerId:", validatedData.managerId);
      console.log("\u2705 Validated assignedPartnerManager:", validatedData.assignedPartnerManager);
      console.log("\u2705 Validated assignedPartnerContact:", validatedData.assignedPartnerContact);
      console.log("\u2705 Validated assignedPartner:", validatedData.assignedPartner);
      const allUsersForAutoPopulate = await storage.getAllUsers();
      if (validatedData.assignedPartner && !validatedData.assignedPartnerManager) {
        const partnerCompanyName = validatedData.assignedPartner;
        const partnerUser = allUsersForAutoPopulate.find((u) => u.company === partnerCompanyName && u.role === "\uD611\uB825\uC0AC");
        if (partnerUser) {
          if (partnerUser.name) {
            validatedData.assignedPartnerManager = partnerUser.name;
            console.log(`[Auto-populate] Partner manager set to: ${partnerUser.name} for company: ${partnerCompanyName}`);
          }
          if (partnerUser.phone && !validatedData.assignedPartnerContact) {
            validatedData.assignedPartnerContact = partnerUser.phone;
            console.log(`[Auto-populate] Partner contact set to: ${partnerUser.phone} for company: ${partnerCompanyName}`);
          }
        }
      }
      if (validatedData.assessorTeam) {
        const assessorUser = allUsersForAutoPopulate.find((u) => u.role === "\uC2EC\uC0AC\uC0AC" && u.name === validatedData.assessorTeam);
        if (assessorUser?.email) {
          validatedData.assessorEmail = assessorUser.email;
          console.log(`[Auto-populate] Assessor email set to: ${assessorUser.email} for assessor: ${validatedData.assessorTeam}`);
        }
      }
      if (validatedData.investigatorTeamName) {
        const investigatorUser = allUsersForAutoPopulate.find((u) => u.role === "\uC870\uC0AC\uC0AC" && u.name === validatedData.investigatorTeamName);
        if (investigatorUser?.email) {
          validatedData.investigatorEmail = investigatorUser.email;
          console.log(`[Auto-populate] Investigator email set to: ${investigatorUser.email} for investigator: ${validatedData.investigatorTeamName}`);
        }
      }
      const hasDamagePrevention = validatedData.damagePreventionCost === "true" || validatedData.damagePreventionCost === true;
      const hasVictimRecovery = validatedData.victimIncidentAssistance === "true" || validatedData.victimIncidentAssistance === true;
      console.log("\u{1F50D} Processing types:", { hasDamagePrevention, hasVictimRecovery, damagePreventionCost: validatedData.damagePreventionCost, victimIncidentAssistance: validatedData.victimIncidentAssistance });
      const caseGroupId = validatedData.insuranceAccidentNo || `GROUP-${Date.now()}`;
      if (validatedData.status === "\uBC30\uB2F9\uB300\uAE30") {
        if (validatedData.id) {
          const existingCase = await storage.getCaseById(validatedData.id);
          if (existingCase && existingCase.status === "\uBC30\uB2F9\uB300\uAE30") {
            const existingCaseNumber = existingCase.caseNumber || "";
            const needsNewPrefix = !existingCaseNumber || existingCaseNumber === "-" || existingCaseNumber.startsWith("DRAFT-");
            let existingPrefix = "";
            let existingSuffix = null;
            if (!needsNewPrefix && existingCaseNumber.includes("-") && existingCaseNumber !== "-" && !existingCaseNumber.startsWith("DRAFT-")) {
              existingPrefix = existingCaseNumber.split("-")[0];
              existingSuffix = existingCaseNumber.split("-")[1];
            } else if (!needsNewPrefix) {
              existingPrefix = existingCaseNumber;
            }
            if (needsNewPrefix || !existingPrefix) {
              const draftDate2 = validatedData.accidentDate || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
              const { prefix: prefix2 } = await storage.getNextCaseSequence(draftDate2, validatedData.insuranceAccidentNo || void 0);
              existingPrefix = prefix2;
            }
            let newCaseNumber;
            const createdCases2 = [];
            if (!hasDamagePrevention && !hasVictimRecovery) {
              newCaseNumber = `DRAFT-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
            } else if (hasDamagePrevention && !hasVictimRecovery) {
              const existingPreventionCase = await storage.getPreventionCaseByPrefix(existingPrefix);
              if (existingPreventionCase && existingPreventionCase.id !== validatedData.id) {
                if (existingPreventionCase.status === "\uBC30\uB2F9\uB300\uAE30") {
                  await storage.deleteCase(existingPreventionCase.id);
                  console.log(`[Case Draft] Deleted existing draft prevention case ${existingPreventionCase.caseNumber} to replace with current case`);
                  newCaseNumber = `${existingPrefix}-0`;
                } else {
                  console.log(`[Case Draft] Prevention case ${existingPreventionCase.caseNumber} already exists and completed, keeping current case number`);
                  newCaseNumber = existingCaseNumber;
                }
              } else {
                newCaseNumber = `${existingPrefix}-0`;
              }
            } else if (!hasDamagePrevention && hasVictimRecovery) {
              if (existingSuffix && existingSuffix !== "0" && parseInt(existingSuffix) >= 1) {
                newCaseNumber = existingCaseNumber;
              } else {
                const nextSuffix = await storage.getNextVictimSuffix(existingPrefix);
                newCaseNumber = `${existingPrefix}-${nextSuffix}`;
              }
            } else {
              const existingPreventionCase = await storage.getPreventionCaseByPrefix(existingPrefix);
              if (existingPreventionCase && existingPreventionCase.id !== validatedData.id) {
                if (existingSuffix && existingSuffix !== "0" && parseInt(existingSuffix) >= 1) {
                  newCaseNumber = existingCaseNumber;
                } else {
                  const nextSuffix = await storage.getNextVictimSuffix(existingPrefix);
                  newCaseNumber = `${existingPrefix}-${nextSuffix}`;
                }
                const updatedCase2 = await storage.updateCase(validatedData.id, {
                  ...validatedData,
                  caseNumber: newCaseNumber,
                  caseGroupId
                });
                createdCases2.push(updatedCase2);
                await storage.updateCase(existingPreventionCase.id, {
                  ...validatedData,
                  caseNumber: existingPreventionCase.caseNumber || void 0,
                  caseGroupId
                });
                console.log(`[Case Draft] Updated existing prevention case ${existingPreventionCase.caseNumber} and victim case ${newCaseNumber}`);
              } else {
                newCaseNumber = `${existingPrefix}-0`;
                const updatedCase2 = await storage.updateCase(validatedData.id, {
                  ...validatedData,
                  caseNumber: newCaseNumber,
                  caseGroupId
                });
                createdCases2.push(updatedCase2);
                const nextSuffix = await storage.getNextVictimSuffix(existingPrefix);
                const recoveryData = JSON.parse(JSON.stringify(validatedData));
                const recoveryCase = await storage.createCase({
                  ...recoveryData,
                  caseNumber: `${existingPrefix}-${nextSuffix}`,
                  caseGroupId,
                  status: "\uBC30\uB2F9\uB300\uAE30",
                  createdBy: req.session.userId
                });
                createdCases2.push(recoveryCase);
              }
              if (createdCases2.length > 0) {
                try {
                  const syncCount = await storage.syncIntakeDataToRelatedCases(createdCases2[0].id);
                  if (syncCount > 0) {
                    console.log(`[Case Draft] Auto-synced intake data to ${syncCount} related cases`);
                  }
                } catch (syncError) {
                  console.error("Failed to sync intake data:", syncError);
                }
              }
              return res.status(200).json({ success: true, cases: createdCases2 });
            }
            const updatedCase = await storage.updateCase(validatedData.id, {
              ...validatedData,
              caseNumber: newCaseNumber,
              caseGroupId
            });
            try {
              const syncCount = await storage.syncIntakeDataToRelatedCases(updatedCase.id);
              if (syncCount > 0) {
                console.log(`[Case Draft] Auto-synced intake data to ${syncCount} related cases`);
              }
            } catch (syncError) {
              console.error("Failed to sync intake data:", syncError);
            }
            return res.status(200).json({ success: true, cases: [updatedCase] });
          }
        }
        const draftDate = validatedData.accidentDate || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
        const { prefix, suffix } = await storage.getNextCaseSequence(
          draftDate,
          validatedData.insuranceAccidentNo || void 0
        );
        const createdCases = [];
        if (hasDamagePrevention && !hasVictimRecovery) {
          const draftCase = await storage.createCase({
            ...validatedData,
            caseNumber: `${prefix}-0`,
            caseGroupId,
            createdBy: req.session.userId
          });
          createdCases.push(draftCase);
        } else if (!hasDamagePrevention && hasVictimRecovery) {
          const caseNumber2 = `${prefix}-${suffix === 0 ? 1 : suffix}`;
          const draftCase = await storage.createCase({
            ...validatedData,
            caseNumber: caseNumber2,
            caseGroupId,
            createdBy: req.session.userId
          });
          createdCases.push(draftCase);
        } else if (hasDamagePrevention && hasVictimRecovery) {
          const existingPrevention = await storage.getPreventionCaseByPrefix(prefix);
          if (!existingPrevention) {
            const preventionData = JSON.parse(JSON.stringify(validatedData));
            const preventionDraft = await storage.createCase({
              ...preventionData,
              caseNumber: `${prefix}-0`,
              caseGroupId,
              createdBy: req.session.userId
            });
            createdCases.push(preventionDraft);
          }
          const nextSuffix = await storage.getNextVictimSuffix(prefix);
          const recoveryData = JSON.parse(JSON.stringify(validatedData));
          const recoveryDraft = await storage.createCase({
            ...recoveryData,
            caseNumber: `${prefix}-${nextSuffix}`,
            caseGroupId,
            createdBy: req.session.userId
          });
          createdCases.push(recoveryDraft);
        } else {
          const draftCase = await storage.createCase({
            ...validatedData,
            caseNumber: `DRAFT-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
            caseGroupId,
            createdBy: req.session.userId
          });
          createdCases.push(draftCase);
        }
        return res.status(201).json({ success: true, cases: createdCases });
      }
      if (validatedData.status === "\uC811\uC218\uC644\uB8CC") {
        const receptionDate = validatedData.receptionDate;
        if (!receptionDate) {
          return res.status(400).json({ error: "\uC811\uC218\uC77C\uC774 \uD544\uC694\uD569\uB2C8\uB2E4" });
        }
        const fullDate = receptionDate.split("T")[0];
        const completedCases = [];
        if (validatedData.id) {
          const existingCase = await storage.getCaseById(validatedData.id);
          if (existingCase && existingCase.status === "\uBC30\uB2F9\uB300\uAE30") {
            const existingCaseNumber = existingCase.caseNumber || "";
            const needsNewPrefix = !existingCaseNumber || existingCaseNumber === "-" || existingCaseNumber.startsWith("DRAFT-");
            let existingPrefix = "";
            let existingSuffix = null;
            if (!needsNewPrefix && existingCaseNumber.includes("-") && existingCaseNumber !== "-" && !existingCaseNumber.startsWith("DRAFT-")) {
              existingPrefix = existingCaseNumber.split("-")[0];
              existingSuffix = existingCaseNumber.split("-")[1];
            } else if (!needsNewPrefix) {
              existingPrefix = existingCaseNumber;
            }
            if (needsNewPrefix || !existingPrefix) {
              const { prefix: prefix2 } = await storage.getNextCaseSequence(fullDate, validatedData.insuranceAccidentNo || void 0);
              existingPrefix = prefix2;
            }
            let newCaseNumber;
            if (!hasDamagePrevention && !hasVictimRecovery) {
              const nextSuffix = await storage.getNextVictimSuffix(existingPrefix);
              newCaseNumber = `${existingPrefix}-${nextSuffix}`;
            } else if (hasDamagePrevention && !hasVictimRecovery) {
              const existingPreventionCase = await storage.getPreventionCaseByPrefix(existingPrefix);
              if (existingPreventionCase && existingPreventionCase.id !== validatedData.id) {
                if (existingPreventionCase.status === "\uBC30\uB2F9\uB300\uAE30") {
                  await storage.deleteCase(existingPreventionCase.id);
                  console.log(`[Case Complete] Deleted existing draft prevention case ${existingPreventionCase.caseNumber} to replace with current case`);
                  newCaseNumber = `${existingPrefix}-0`;
                } else {
                  console.log(`[Case Complete] Prevention case ${existingPreventionCase.caseNumber} already exists and completed, keeping current case number`);
                  newCaseNumber = existingCaseNumber;
                }
              } else {
                newCaseNumber = `${existingPrefix}-0`;
              }
            } else if (!hasDamagePrevention && hasVictimRecovery) {
              if (existingSuffix && existingSuffix !== "0" && parseInt(existingSuffix) >= 1) {
                newCaseNumber = existingCaseNumber;
              } else {
                const nextSuffix = await storage.getNextVictimSuffix(existingPrefix);
                newCaseNumber = `${existingPrefix}-${nextSuffix}`;
              }
            } else {
              const relatedDraftCases = await storage.getCasesByPrefix(existingPrefix);
              const draftCases = relatedDraftCases.filter((c) => c.status === "\uBC30\uB2F9\uB300\uAE30");
              console.log(`[Case Complete] Found ${draftCases.length} draft cases with prefix ${existingPrefix}`);
              if (draftCases.length >= 2) {
                const updateDataWithoutId = { ...validatedData };
                delete updateDataWithoutId.id;
                for (const draftCase of draftCases) {
                  const updatedCase2 = await storage.updateCase(draftCase.id, {
                    ...updateDataWithoutId,
                    caseNumber: draftCase.caseNumber || void 0,
                    caseGroupId,
                    status: "\uC811\uC218\uC644\uB8CC"
                  });
                  completedCases.push(updatedCase2);
                  console.log(`[Case Complete] Updated draft case ${draftCase.caseNumber} to \uC811\uC218\uC644\uB8CC`);
                }
              } else {
                const existingPreventionCase = await storage.getPreventionCaseByPrefix(existingPrefix);
                if (existingPreventionCase && existingPreventionCase.id !== validatedData.id) {
                  if (existingSuffix && existingSuffix !== "0" && parseInt(existingSuffix) >= 1) {
                    newCaseNumber = existingCaseNumber;
                  } else {
                    const nextSuffix = await storage.getNextVictimSuffix(existingPrefix);
                    newCaseNumber = `${existingPrefix}-${nextSuffix}`;
                  }
                  const updatedCase2 = await storage.updateCase(validatedData.id, {
                    ...validatedData,
                    caseNumber: newCaseNumber,
                    caseGroupId,
                    status: "\uC811\uC218\uC644\uB8CC"
                  });
                  completedCases.push(updatedCase2);
                  if (existingPreventionCase.status === "\uBC30\uB2F9\uB300\uAE30") {
                    await storage.updateCase(existingPreventionCase.id, {
                      ...validatedData,
                      caseNumber: existingPreventionCase.caseNumber || void 0,
                      caseGroupId,
                      status: "\uC811\uC218\uC644\uB8CC"
                    });
                  }
                  console.log(`[Case Complete] Updated existing prevention case ${existingPreventionCase.caseNumber} and victim case ${newCaseNumber}`);
                } else if (existingPreventionCase && existingPreventionCase.id === validatedData.id) {
                  newCaseNumber = `${existingPrefix}-0`;
                  const existingVictimCases = relatedDraftCases.filter(
                    (c) => c.id !== validatedData.id && c.caseNumber?.includes("-") && parseInt(c.caseNumber.split("-")[1]) >= 1
                  );
                  const updatedPrevention = await storage.updateCase(validatedData.id, {
                    ...validatedData,
                    caseNumber: newCaseNumber,
                    caseGroupId,
                    status: "\uC811\uC218\uC644\uB8CC"
                  });
                  completedCases.push(updatedPrevention);
                  if (existingVictimCases.length > 0) {
                    for (const victimCase of existingVictimCases) {
                      const updatedVictim = await storage.updateCase(victimCase.id, {
                        ...validatedData,
                        caseNumber: victimCase.caseNumber || void 0,
                        caseGroupId,
                        status: "\uC811\uC218\uC644\uB8CC"
                      });
                      completedCases.push(updatedVictim);
                    }
                  } else {
                    const nextSuffix = await storage.getNextVictimSuffix(existingPrefix);
                    const recoveryData = JSON.parse(JSON.stringify(validatedData));
                    const recoveryCase = await storage.createCase({
                      ...recoveryData,
                      caseNumber: `${existingPrefix}-${nextSuffix}`,
                      caseGroupId,
                      status: "\uC811\uC218\uC644\uB8CC",
                      createdBy: req.session.userId
                    });
                    completedCases.push(recoveryCase);
                  }
                  console.log(`[Case Complete] Updated prevention case and ${existingVictimCases.length > 0 ? "existing" : "new"} victim case`);
                } else {
                  newCaseNumber = `${existingPrefix}-0`;
                  const updatedCase2 = await storage.updateCase(validatedData.id, {
                    ...validatedData,
                    caseNumber: newCaseNumber,
                    caseGroupId,
                    status: "\uC811\uC218\uC644\uB8CC"
                  });
                  completedCases.push(updatedCase2);
                  const nextSuffix = await storage.getNextVictimSuffix(existingPrefix);
                  const recoveryData = JSON.parse(JSON.stringify(validatedData));
                  const recoveryCase = await storage.createCase({
                    ...recoveryData,
                    caseNumber: `${existingPrefix}-${nextSuffix}`,
                    caseGroupId,
                    status: "\uC811\uC218\uC644\uB8CC",
                    createdBy: req.session.userId
                  });
                  completedCases.push(recoveryCase);
                  console.log(`[Case Complete] Created prevention case ${newCaseNumber} and victim case`);
                }
              }
              if (completedCases.length > 0) {
                try {
                  const syncCount = await storage.syncIntakeDataToRelatedCases(completedCases[0].id);
                  if (syncCount > 0) {
                    console.log(`[Case Complete] Auto-synced intake data to ${syncCount} related cases`);
                  }
                } catch (syncError) {
                  console.error("Failed to sync intake data:", syncError);
                }
              }
              return res.status(200).json({ success: true, cases: completedCases });
            }
            const updatedCase = await storage.updateCase(validatedData.id, {
              ...validatedData,
              caseNumber: newCaseNumber,
              caseGroupId,
              status: "\uC811\uC218\uC644\uB8CC"
            });
            completedCases.push(updatedCase);
            if (completedCases.length > 0) {
              try {
                const syncCount = await storage.syncIntakeDataToRelatedCases(completedCases[0].id);
                if (syncCount > 0) {
                  console.log(`[Case Complete] Auto-synced intake data to ${syncCount} related cases`);
                }
              } catch (syncError) {
                console.error("Failed to sync intake data:", syncError);
              }
            }
            return res.status(200).json({ success: true, cases: completedCases });
          }
        }
        const parentCasePrefix2 = req.body.parentCasePrefix;
        if (parentCasePrefix2) {
          console.log(`[Case Create] Creating additional victim case with parentCasePrefix: ${parentCasePrefix2}`);
          const nextSuffix = await storage.getNextVictimSuffix(parentCasePrefix2);
          const caseNumber2 = `${parentCasePrefix2}-${nextSuffix}`;
          console.log(`[Case Create] Generated case number: ${caseNumber2} (suffix: ${nextSuffix})`);
          const newCase2 = await storage.createCase({
            ...validatedData,
            caseNumber: caseNumber2,
            caseGroupId,
            createdBy: req.session.userId
          });
          completedCases.push(newCase2);
          try {
            const syncCount = await storage.syncIntakeDataToRelatedCases(newCase2.id);
            if (syncCount > 0) {
              console.log(`[Case Create] Auto-synced intake data to ${syncCount} related cases`);
            }
          } catch (syncError) {
            console.error("Failed to sync intake data to related cases:", syncError);
          }
          return res.status(201).json({ success: true, cases: completedCases });
        }
        const { prefix, suffix } = await storage.getNextCaseSequence(
          fullDate,
          validatedData.insuranceAccidentNo || void 0
        );
        if (hasDamagePrevention && !hasVictimRecovery) {
          const caseNumber2 = `${prefix}-0`;
          const newCase2 = await storage.createCase({
            ...validatedData,
            caseNumber: caseNumber2,
            caseGroupId,
            createdBy: req.session.userId
          });
          completedCases.push(newCase2);
        } else if (!hasDamagePrevention && hasVictimRecovery) {
          const caseNumber2 = `${prefix}-${suffix === 0 ? 1 : suffix}`;
          const newCase2 = await storage.createCase({
            ...validatedData,
            caseNumber: caseNumber2,
            caseGroupId,
            createdBy: req.session.userId
          });
          completedCases.push(newCase2);
        } else if (hasDamagePrevention && hasVictimRecovery) {
          const existingPrevention = await storage.getPreventionCaseByPrefix(prefix);
          if (!existingPrevention) {
            const preventionData = JSON.parse(JSON.stringify(validatedData));
            const preventionCase = await storage.createCase({
              ...preventionData,
              caseNumber: `${prefix}-0`,
              caseGroupId,
              createdBy: req.session.userId
            });
            completedCases.push(preventionCase);
          }
          const nextSuffix = await storage.getNextVictimSuffix(prefix);
          const recoveryData = JSON.parse(JSON.stringify(validatedData));
          const recoveryCase = await storage.createCase({
            ...recoveryData,
            caseNumber: `${prefix}-${nextSuffix}`,
            caseGroupId,
            createdBy: req.session.userId
          });
          completedCases.push(recoveryCase);
        } else {
          const caseNumber2 = `${prefix}-${suffix === 0 ? 1 : suffix}`;
          const newCase2 = await storage.createCase({
            ...validatedData,
            caseNumber: caseNumber2,
            caseGroupId,
            createdBy: req.session.userId
          });
          completedCases.push(newCase2);
        }
        if (completedCases.length > 0) {
          try {
            const syncCount = await storage.syncIntakeDataToRelatedCases(completedCases[0].id);
            if (syncCount > 0) {
              console.log(`[Case Create] Auto-synced intake data to ${syncCount} related cases`);
            }
          } catch (syncError) {
            console.error("Failed to sync intake data to related cases:", syncError);
          }
        }
        return res.status(201).json({ success: true, cases: completedCases });
      }
      let caseNumber = validatedData.caseNumber;
      const parentCasePrefix = req.body.parentCasePrefix;
      console.log(`[Case Create] parentCasePrefix: ${parentCasePrefix}, existing caseNumber: ${caseNumber}`);
      if (parentCasePrefix && !caseNumber) {
        const nextSuffix = await storage.getNextVictimSuffix(parentCasePrefix);
        caseNumber = `${parentCasePrefix}-${nextSuffix}`;
        console.log(`[Case Create] Creating additional victim case with number: ${caseNumber} (suffix: ${nextSuffix})`);
      } else if (!caseNumber) {
        console.log(`[Case Create] Fallback - generating new case number`);
        const fallbackDate = validatedData.accidentDate || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
        const { prefix, suffix } = await storage.getNextCaseSequence(
          fallbackDate,
          validatedData.insuranceAccidentNo || void 0
        );
        caseNumber = `${prefix}-${suffix === 0 ? 1 : suffix}`;
        console.log(`[Case Create] Generated new case number: ${caseNumber}`);
      }
      const newCase = await storage.createCase({
        ...validatedData,
        caseNumber,
        caseGroupId,
        createdBy: req.session.userId
      });
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
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create case error:", error);
      res.status(500).json({ error: "\uC811\uC218 \uC0DD\uC131 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.get("/api/cases", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    try {
      const currentUser = await storage.getUser(req.session.userId);
      if (!currentUser) {
        return res.status(404).json({ error: "\uC0AC\uC6A9\uC790\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
      }
      const cases2 = await storage.getAllCases(currentUser);
      res.json(cases2);
    } catch (error) {
      console.error("Get cases error:", error);
      res.status(500).json({ error: "\uCF00\uC774\uC2A4 \uBAA9\uB85D\uC744 \uBD88\uB7EC\uC624\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.get("/api/cases/:id", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    try {
      const { id } = req.params;
      const caseData = await storage.getCaseById(id);
      if (!caseData) {
        return res.status(404).json({ error: "\uCF00\uC774\uC2A4\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
      }
      console.log(`[GET /api/cases/${id}] Partner info:`, {
        caseNumber: caseData.caseNumber,
        assignedPartner: caseData.assignedPartner,
        assignedPartnerManager: caseData.assignedPartnerManager,
        assignedPartnerContact: caseData.assignedPartnerContact
      });
      res.json(caseData);
    } catch (error) {
      console.error("Get case by ID error:", error);
      res.status(500).json({ error: "\uCF00\uC774\uC2A4\uB97C \uBD88\uB7EC\uC624\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  const getFieldLabel = (field) => {
    const fieldLabels = {
      managerId: "\uB2F9\uC0AC \uB2F4\uB2F9\uC790",
      managerDepartment: "\uB2F4\uB2F9\uC790 \uBD80\uC11C",
      managerPosition: "\uB2F4\uB2F9\uC790 \uC9C1\uAE09",
      managerContact: "\uB2F4\uB2F9\uC790 \uC5F0\uB77D\uCC98",
      accidentDate: "\uC0AC\uACE0\uC77C",
      insuranceCompany: "\uBCF4\uD5D8\uC0AC",
      insurancePolicyNo: "\uC99D\uAD8C\uBC88\uD638",
      insuranceAccidentNo: "\uC0AC\uACE0\uBC88\uD638",
      clientResidence: "\uC758\uB8B0\uC0AC",
      clientDepartment: "\uC758\uB8B0\uC790 \uBD80\uC11C",
      clientName: "\uC758\uB8B0\uC790\uBA85",
      clientContact: "\uC758\uB8B0\uC790 \uC5F0\uB77D\uCC98",
      assessorId: "\uC2EC\uC0AC\uC0AC",
      assessorDepartment: "\uC2EC\uC0AC\uC0AC \uBD80\uC11C",
      assessorTeam: "\uC2EC\uC0AC\uC790",
      assessorContact: "\uC2EC\uC0AC\uC0AC \uC5F0\uB77D\uCC98",
      investigatorTeam: "\uC190\uC0AC\uBA85",
      investigatorDepartment: "\uC870\uC0AC\uC0AC \uBD80\uC11C",
      investigatorTeamName: "\uC870\uC0AC\uC790",
      investigatorContact: "\uC870\uC0AC\uC0AC \uC5F0\uB77D\uCC98",
      policyHolderName: "\uBCF4\uD5D8\uACC4\uC57D\uC790\uBA85",
      policyHolderIdNumber: "\uBCF4\uD5D8\uACC4\uC57D\uC790 \uC8FC\uBBFC\uBC88\uD638",
      policyHolderAddress: "\uBCF4\uD5D8\uACC4\uC57D\uC790 \uC8FC\uC18C",
      insuredName: "\uD53C\uBCF4\uD5D8\uC790\uBA85",
      insuredIdNumber: "\uD53C\uBCF4\uD5D8\uC790 \uC8FC\uBBFC\uBC88\uD638",
      insuredAddress: "\uD53C\uBCF4\uD5D8\uC790 \uC8FC\uC18C",
      insuredAddressDetail: "\uD53C\uBCF4\uD5D8\uC790 \uC0C1\uC138\uC8FC\uC18C",
      insuredContact: "\uD53C\uBCF4\uD5D8\uC790 \uC5F0\uB77D\uCC98",
      victimName: "\uD53C\uD574\uC790\uBA85",
      victimIdNumber: "\uD53C\uD574\uC790 \uC8FC\uBBFC\uBC88\uD638",
      victimAddress: "\uD53C\uD574\uC790 \uC8FC\uC18C",
      victimAddressDetail: "\uD53C\uD574\uC790 \uC0C1\uC138\uC8FC\uC18C",
      victimPhone: "\uD53C\uD574\uC790 \uC5F0\uB77D\uCC98",
      victimContact: "\uD53C\uD574\uC790 \uC5F0\uB77D\uCC98",
      perpetratorName: "\uAC00\uD574\uC790\uBA85",
      perpetratorIdNumber: "\uAC00\uD574\uC790 \uC8FC\uBBFC\uBC88\uD638",
      perpetratorAddress: "\uAC00\uD574\uC790 \uC8FC\uC18C",
      perpetratorPhone: "\uAC00\uD574\uC790 \uC5F0\uB77D\uCC98",
      status: "\uC0C1\uD0DC",
      recoveryType: "\uBCF5\uAD6C \uD0C0\uC785",
      specialNotes: "\uD2B9\uC774\uC0AC\uD56D",
      additionalNotes: "\uCD94\uAC00 \uBA54\uBAA8",
      buildingType: "\uAC74\uBB3C \uC720\uD615",
      buildingStructure: "\uAC74\uBB3C \uAD6C\uC870",
      accidentLocation: "\uC0AC\uACE0 \uC704\uCE58",
      accidentType: "\uC0AC\uACE0 \uC720\uD615",
      causeOfDamage: "\uD53C\uD574 \uC6D0\uC778",
      partnerCompany: "\uD611\uB825\uC5C5\uCCB4",
      assignedPartner: "\uBC30\uC815 \uD611\uB825\uC0AC",
      assignedPartnerManager: "\uD611\uB825\uC0AC \uB2F4\uB2F9\uC790",
      assignedPartnerContact: "\uD611\uB825\uC0AC \uC5F0\uB77D\uCC98",
      damagePreventionCost: "\uC190\uD574\uBC29\uC9C0\uBE44\uC6A9",
      victimIncidentAssistance: "\uD53C\uD574\uC790\uC0AC\uACE0\uBD80\uB2F4\uAE08"
    };
    return fieldLabels[field] || field;
  };
  app2.patch("/api/cases/:id", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    try {
      const { id } = req.params;
      const updateData = req.body;
      const existingCase = await storage.getCaseById(id);
      if (!existingCase) {
        return res.status(404).json({ error: "\uCF00\uC774\uC2A4\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
      }
      const changes = [];
      const trackedFields = [
        // 담당자 정보
        "managerId",
        "managerDepartment",
        "managerPosition",
        "managerContact",
        // 기본 정보
        "accidentDate",
        "insuranceCompany",
        "insurancePolicyNo",
        "insuranceAccidentNo",
        "clientResidence",
        "clientDepartment",
        "clientName",
        "clientContact",
        "assessorId",
        "assessorDepartment",
        "assessorTeam",
        "assessorContact",
        "investigatorTeam",
        "investigatorDepartment",
        "investigatorTeamName",
        "investigatorContact",
        // 보험계약자/피보험자/피해자/가해자 정보
        "policyHolderName",
        "policyHolderIdNumber",
        "policyHolderAddress",
        "insuredName",
        "insuredIdNumber",
        "insuredAddress",
        "insuredAddressDetail",
        "insuredContact",
        "victimName",
        "victimIdNumber",
        "victimAddress",
        "victimAddressDetail",
        "victimPhone",
        "victimContact",
        "perpetratorName",
        "perpetratorIdNumber",
        "perpetratorAddress",
        "perpetratorPhone",
        // 상태 및 기타 정보
        "status",
        "recoveryType",
        "specialNotes",
        "additionalNotes",
        "buildingType",
        "buildingStructure",
        "accidentLocation",
        "accidentType",
        "causeOfDamage",
        "partnerCompany",
        // 협력사 정보
        "assignedPartner",
        "assignedPartnerManager",
        "assignedPartnerContact",
        // 처리 유형
        "damagePreventionCost",
        "victimIncidentAssistance"
      ];
      const normalizeValue = (value) => {
        if (value === null || value === void 0 || value === "") {
          return null;
        }
        return String(value).trim();
      };
      const allUsers = await storage.getAllUsers();
      const userMap = new Map(allUsers.map((u) => [u.id, u.name]));
      if (updateData.assignedPartner && !updateData.assignedPartnerManager) {
        const partnerCompanyName = updateData.assignedPartner;
        const partnerUser = allUsers.find((u) => u.company === partnerCompanyName && u.role === "\uD611\uB825\uC0AC");
        if (partnerUser) {
          if (partnerUser.name) {
            updateData.assignedPartnerManager = partnerUser.name;
            console.log(`[Auto-populate] Partner manager set to: ${partnerUser.name} for company: ${partnerCompanyName}`);
          }
          if (partnerUser.phone && !updateData.assignedPartnerContact) {
            updateData.assignedPartnerContact = partnerUser.phone;
            console.log(`[Auto-populate] Partner contact set to: ${partnerUser.phone} for company: ${partnerCompanyName}`);
          }
        }
      }
      const assessorName = updateData.assessorTeam || existingCase.assessorTeam;
      if (assessorName) {
        const assessorUser = allUsers.find((u) => u.role === "\uC2EC\uC0AC\uC0AC" && u.name === assessorName);
        if (assessorUser?.email) {
          updateData.assessorEmail = assessorUser.email;
          console.log(`[Auto-populate] Assessor email set to: ${assessorUser.email} for assessor: ${assessorName}`);
        }
      }
      const investigatorName = updateData.investigatorTeamName || existingCase.investigatorTeamName;
      if (investigatorName) {
        const investigatorUser = allUsers.find((u) => u.role === "\uC870\uC0AC\uC0AC" && u.name === investigatorName);
        if (investigatorUser?.email) {
          updateData.investigatorEmail = investigatorUser.email;
          console.log(`[Auto-populate] Investigator email set to: ${investigatorUser.email} for investigator: ${investigatorName}`);
        }
      }
      for (const field of trackedFields) {
        const oldValue = existingCase[field];
        const newValue = updateData[field];
        const normalizedOld = normalizeValue(oldValue);
        const normalizedNew = normalizeValue(newValue);
        if (field in updateData && normalizedOld !== normalizedNew) {
          if (field === "managerId") {
            const oldUserName = normalizedOld ? userMap.get(normalizedOld) || "(\uC54C\uC218\uC5C6\uC74C)" : null;
            const newUserName = normalizedNew ? userMap.get(normalizedNew) || "(\uC54C\uC218\uC5C6\uC74C)" : null;
            changes.push({
              field,
              fieldLabel: getFieldLabel(field),
              before: oldUserName,
              after: newUserName
            });
          } else {
            changes.push({
              field,
              fieldLabel: getFieldLabel(field),
              before: normalizedOld,
              after: normalizedNew
            });
          }
        }
      }
      const hasDamagePreventionField = "damagePreventionCost" in updateData;
      const hasVictimRecoveryField = "victimIncidentAssistance" in updateData;
      const hasDamagePrevention = hasDamagePreventionField ? updateData.damagePreventionCost === "true" || updateData.damagePreventionCost === true : existingCase.damagePreventionCost === "true" || existingCase.damagePreventionCost === true;
      const hasVictimRecovery = hasVictimRecoveryField ? updateData.victimIncidentAssistance === "true" || updateData.victimIncidentAssistance === true : existingCase.victimIncidentAssistance === "true" || existingCase.victimIncidentAssistance === true;
      const existingCaseNumber = existingCase.caseNumber || "";
      const needsNewPrefix = !existingCaseNumber || existingCaseNumber === "-" || existingCaseNumber.startsWith("DRAFT-");
      let existingPrefix = "";
      let existingSuffix = null;
      if (!needsNewPrefix && existingCaseNumber.includes("-") && existingCaseNumber !== "-" && !existingCaseNumber.startsWith("DRAFT-")) {
        existingPrefix = existingCaseNumber.split("-")[0];
        existingSuffix = existingCaseNumber.split("-")[1];
      } else if (!needsNewPrefix) {
        existingPrefix = existingCaseNumber;
      }
      if (needsNewPrefix || !existingPrefix) {
        const accDate = updateData.accidentDate || existingCase.accidentDate || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
        const { prefix } = await storage.getNextCaseSequence(accDate, updateData.insuranceAccidentNo || existingCase.insuranceAccidentNo || void 0);
        existingPrefix = prefix;
      }
      const hadDamagePrevention = existingCase.damagePreventionCost === "true" || existingCase.damagePreventionCost === true;
      const hadVictimRecovery = existingCase.victimIncidentAssistance === "true" || existingCase.victimIncidentAssistance === true;
      const caseGroupId = existingCase.caseGroupId;
      let deletedCases = [];
      const shouldProcessCaseNumberLogic = hasDamagePreventionField || hasVictimRecoveryField;
      if (shouldProcessCaseNumberLogic && existingPrefix) {
        const allCases = await storage.getAllCases();
        const siblingCases = allCases.filter((c) => {
          if (c.id === id) return false;
          if (caseGroupId && c.caseGroupId === caseGroupId) return true;
          const siblingNumber = c.caseNumber || "";
          if (siblingNumber.includes("-") && siblingNumber !== "-" && !siblingNumber.startsWith("DRAFT-")) {
            const siblingPrefix = siblingNumber.split("-")[0];
            return siblingPrefix === existingPrefix;
          }
          return false;
        });
        if (hasDamagePrevention && !hasVictimRecovery) {
          for (const sibling of siblingCases) {
            if (sibling.status === "\uBC30\uB2F9\uB300\uAE30") {
              await storage.deleteCase(sibling.id);
              deletedCases.push(sibling.caseNumber || sibling.id);
              console.log(`[Case Delete] Deleted sibling case ${sibling.caseNumber} for damage prevention only (status: ${sibling.status})`);
            }
          }
        }
        if (!hasDamagePrevention && hasVictimRecovery) {
          for (const sibling of siblingCases) {
            if (sibling.status === "\uBC30\uB2F9\uB300\uAE30") {
              await storage.deleteCase(sibling.id);
              deletedCases.push(sibling.caseNumber || sibling.id);
              console.log(`[Case Delete] Deleted sibling case ${sibling.caseNumber} for victim recovery only (status: ${sibling.status})`);
            }
          }
        }
        if (!hasDamagePrevention && !hasVictimRecovery) {
          for (const sibling of siblingCases) {
            if (sibling.status === "\uBC30\uB2F9\uB300\uAE30") {
              await storage.deleteCase(sibling.id);
              deletedCases.push(sibling.caseNumber || sibling.id);
              console.log(`[Case Delete] Deleted sibling case ${sibling.caseNumber} (status: ${sibling.status})`);
            }
          }
        }
      }
      let newCaseNumber = existingCaseNumber;
      if (shouldProcessCaseNumberLogic) {
        if (!hasDamagePrevention && !hasVictimRecovery) {
          newCaseNumber = `DRAFT-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
        } else if (hasDamagePrevention && !hasVictimRecovery) {
          newCaseNumber = `${existingPrefix}-0`;
        } else if (!hasDamagePrevention && hasVictimRecovery) {
          if (existingSuffix && existingSuffix !== "0" && parseInt(existingSuffix) >= 1) {
            newCaseNumber = existingCaseNumber;
          } else {
            const nextSuffix = await storage.getNextVictimSuffix(existingPrefix);
            newCaseNumber = `${existingPrefix}-${nextSuffix}`;
          }
        } else {
          const relatedCases = await storage.getCasesByPrefix(existingPrefix);
          const existingPreventionCase = relatedCases.find((c) => c.caseNumber === `${existingPrefix}-0`);
          const existingVictimCases = relatedCases.filter(
            (c) => c.caseNumber?.includes("-") && parseInt(c.caseNumber.split("-")[1]) >= 1
          );
          const currentIsPrevention = existingCaseNumber === `${existingPrefix}-0`;
          if (currentIsPrevention) {
            newCaseNumber = existingCaseNumber;
            const updatedCase2 = await storage.updateCase(id, { ...updateData, caseNumber: newCaseNumber });
            if (!updatedCase2) {
              return res.status(404).json({ error: "\uCF00\uC774\uC2A4 \uC5C5\uB370\uC774\uD2B8\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4" });
            }
            const completedCases = [updatedCase2];
            if (existingVictimCases.length > 0) {
              const updateDataWithoutId = { ...updateData };
              delete updateDataWithoutId.id;
              for (const victimCase of existingVictimCases) {
                const updatedVictim = await storage.updateCase(victimCase.id, {
                  ...updateDataWithoutId,
                  caseNumber: victimCase.caseNumber,
                  status: updateData.status || victimCase.status
                });
                if (updatedVictim) completedCases.push(updatedVictim);
              }
              console.log(`[Case Update] Updated prevention case and ${existingVictimCases.length} existing victim case(s)`);
            } else {
              const nextSuffix = await storage.getNextVictimSuffix(existingPrefix);
              const caseGroupIdForNew = existingCase.caseGroupId || `group-${Date.now()}`;
              const recoveryData = JSON.parse(JSON.stringify(updateData));
              delete recoveryData.id;
              const recoveryCase = await storage.createCase({
                ...recoveryData,
                caseNumber: `${existingPrefix}-${nextSuffix}`,
                caseGroupId: caseGroupIdForNew,
                status: updateData.status || existingCase.status,
                createdBy: req.session.userId
              });
              completedCases.push(recoveryCase);
              console.log(`[Case Update] Updated prevention case and created new victim case`);
            }
            if (changes.length > 0) {
              try {
                const user = await storage.getUser(req.session.userId);
                await storage.createCaseChangeLog({
                  caseId: id,
                  changedBy: req.session.userId,
                  changedByName: user?.name || "\uC54C \uC218 \uC5C6\uC74C",
                  changeType: "update",
                  changes,
                  note: null
                });
              } catch (logError) {
                console.error("Failed to create change log:", logError);
              }
            }
            try {
              await storage.syncIntakeDataToRelatedCases(id);
            } catch (syncError) {
              console.error("Failed to sync intake data:", syncError);
            }
            return res.json({ success: true, cases: completedCases });
          } else {
            newCaseNumber = existingCaseNumber;
            const updatedCase2 = await storage.updateCase(id, { ...updateData, caseNumber: newCaseNumber });
            if (!updatedCase2) {
              return res.status(404).json({ error: "\uCF00\uC774\uC2A4 \uC5C5\uB370\uC774\uD2B8\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4" });
            }
            const completedCases = [updatedCase2];
            if (existingPreventionCase) {
              const updateDataWithoutId = { ...updateData };
              delete updateDataWithoutId.id;
              const updatedPrevention = await storage.updateCase(existingPreventionCase.id, {
                ...updateDataWithoutId,
                caseNumber: existingPreventionCase.caseNumber,
                status: updateData.status || existingPreventionCase.status
              });
              if (updatedPrevention) completedCases.push(updatedPrevention);
              console.log(`[Case Update] Updated victim case and existing prevention case`);
            } else {
              const caseGroupIdForNew = existingCase.caseGroupId || `group-${Date.now()}`;
              const preventionData = JSON.parse(JSON.stringify(updateData));
              delete preventionData.id;
              const preventionCase = await storage.createCase({
                ...preventionData,
                caseNumber: `${existingPrefix}-0`,
                caseGroupId: caseGroupIdForNew,
                status: updateData.status || existingCase.status,
                createdBy: req.session.userId
              });
              completedCases.push(preventionCase);
              console.log(`[Case Update] Updated victim case and created new prevention case`);
            }
            if (changes.length > 0) {
              try {
                const user = await storage.getUser(req.session.userId);
                await storage.createCaseChangeLog({
                  caseId: id,
                  changedBy: req.session.userId,
                  changedByName: user?.name || "\uC54C \uC218 \uC5C6\uC74C",
                  changeType: "update",
                  changes,
                  note: null
                });
              } catch (logError) {
                console.error("Failed to create change log:", logError);
              }
            }
            try {
              await storage.syncIntakeDataToRelatedCases(id);
            } catch (syncError) {
              console.error("Failed to sync intake data:", syncError);
            }
            return res.json({ success: true, cases: completedCases });
          }
        }
      }
      const updateDataWithCaseNumber = shouldProcessCaseNumberLogic ? { ...updateData, caseNumber: newCaseNumber } : updateData;
      const updatedCase = await storage.updateCase(id, updateDataWithCaseNumber);
      if (!updatedCase) {
        return res.status(404).json({ error: "\uCF00\uC774\uC2A4 \uC5C5\uB370\uC774\uD2B8\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4" });
      }
      if (changes.length > 0) {
        try {
          const user = await storage.getUser(req.session.userId);
          await storage.createCaseChangeLog({
            caseId: id,
            changedBy: req.session.userId,
            changedByName: user?.name || "\uC54C \uC218 \uC5C6\uC74C",
            changeType: "update",
            changes,
            note: null
          });
          console.log(`[Change Log] Recorded ${changes.length} changes for case ${id}:`, changes.map((c) => `${c.fieldLabel}: ${c.before} \u2192 ${c.after}`).join(", "));
        } catch (logError) {
          console.error("Failed to create change log:", logError);
        }
      }
      try {
        const syncCount = await storage.syncIntakeDataToRelatedCases(id);
        if (syncCount > 0) {
          console.log(`[Case Update] Auto-synced intake data to ${syncCount} related cases`);
        }
      } catch (syncError) {
        console.error("Failed to sync intake data to related cases:", syncError);
      }
      res.json({ success: true, case: updatedCase });
    } catch (error) {
      console.error("Update case error:", error);
      res.status(500).json({ error: "\uCF00\uC774\uC2A4 \uC5C5\uB370\uC774\uD2B8 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.delete("/api/cases/:id", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    try {
      const { id } = req.params;
      const existingCase = await storage.getCaseById(id);
      if (!existingCase) {
        return res.status(404).json({ error: "\uCF00\uC774\uC2A4\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
      }
      if (req.session.userRole !== "\uAD00\uB9AC\uC790" && existingCase.status !== "\uBC30\uB2F9\uB300\uAE30") {
        return res.status(403).json({ error: "\uC784\uC2DC\uC800\uC7A5 \uAC74(\uBC30\uB2F9\uB300\uAE30 \uC0C1\uD0DC)\uB9CC \uC0AD\uC81C\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4" });
      }
      await storage.deleteCase(id);
      res.json({ success: true, message: "\uCF00\uC774\uC2A4\uAC00 \uC0AD\uC81C\uB418\uC5C8\uC2B5\uB2C8\uB2E4" });
    } catch (error) {
      console.error("Delete case error:", error);
      res.status(500).json({ error: "\uCF00\uC774\uC2A4 \uC0AD\uC81C \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.patch("/api/cases/:caseId/status", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    const userRole = req.session.userRole;
    if (userRole !== "\uAD00\uB9AC\uC790" && userRole !== "\uD611\uB825\uC0AC") {
      return res.status(403).json({ error: "\uAD8C\uD55C\uC774 \uC5C6\uC2B5\uB2C8\uB2E4" });
    }
    try {
      const { caseId } = req.params;
      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ error: "\uC0C1\uD0DC \uAC12\uC774 \uD544\uC694\uD569\uB2C8\uB2E4" });
      }
      const ALLOWED_STATUSES = [
        "\uBC30\uB2F9\uB300\uAE30",
        "\uC811\uC218\uC644\uB8CC",
        "\uD604\uC7A5\uBC29\uBB38",
        "\uD604\uC7A5\uC815\uBCF4\uC785\uB825",
        "\uAC80\uD1A0\uC911",
        "\uBC18\uB824",
        "1\uCC28\uC2B9\uC778",
        "\uD604\uC7A5\uC815\uBCF4\uC81C\uCD9C",
        "\uBCF5\uAD6C\uC694\uCCAD(2\uCC28\uC2B9\uC778)",
        "\uC9C1\uC811\uBCF5\uAD6C",
        "\uC120\uACAC\uC801\uC694\uCCAD",
        "(\uC9C1\uC811\uBCF5\uAD6C\uC778 \uACBD\uC6B0) \uCCAD\uAD6C\uC790\uB8CC\uC81C\uCD9C",
        "(\uC120\uACAC\uC801\uC694\uCCAD\uC778 \uACBD\uC6B0) \uCD9C\uB3D9\uBE44 \uCCAD\uAD6C",
        "\uCCAD\uAD6C",
        "\uC785\uAE08\uC644\uB8CC",
        "\uBD80\uBD84\uC785\uAE08",
        "\uC815\uC0B0\uC644\uB8CC",
        "\uC811\uC218\uCDE8\uC18C"
      ];
      if (!ALLOWED_STATUSES.includes(status)) {
        return res.status(400).json({ error: `\uD5C8\uC6A9\uB418\uC9C0 \uC54A\uC740 \uC0C1\uD0DC\uAC12\uC785\uB2C8\uB2E4: ${status}` });
      }
      if (userRole === "\uD611\uB825\uC0AC") {
        const PARTNER_ALLOWED = [
          "\uC9C1\uC811\uBCF5\uAD6C",
          "\uC120\uACAC\uC801\uC694\uCCAD",
          "(\uC9C1\uC811\uBCF5\uAD6C\uC778 \uACBD\uC6B0) \uCCAD\uAD6C\uC790\uB8CC\uC81C\uCD9C",
          "(\uC120\uACAC\uC801\uC694\uCCAD\uC778 \uACBD\uC6B0) \uCD9C\uB3D9\uBE44 \uCCAD\uAD6C"
        ];
        if (!PARTNER_ALLOWED.includes(status)) {
          return res.status(403).json({ error: "\uD611\uB825\uC0AC\uB294 \uC9C1\uC811\uBCF5\uAD6C/\uC120\uACAC\uC801\uC694\uCCAD\uB9CC \uC120\uD0DD\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4" });
        }
      }
      const updatedCase = await storage.updateCaseStatus(caseId, status);
      if (!updatedCase) {
        return res.status(404).json({ error: "\uCF00\uC774\uC2A4\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
      }
      res.json({ success: true, case: updatedCase });
    } catch (error) {
      console.error("Update case status error:", error);
      res.status(500).json({ error: "\uC0C1\uD0DC \uBCC0\uACBD \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.patch("/api/cases/:caseId/special-notes", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    if (req.session.userRole !== "\uD611\uB825\uC0AC") {
      return res.status(403).json({ error: "\uD611\uB825\uC0AC \uAD8C\uD55C\uC774 \uD544\uC694\uD569\uB2C8\uB2E4" });
    }
    try {
      const { caseId } = req.params;
      const updateSchema = z2.object({
        specialNotes: z2.string().max(1e3, "\uD2B9\uC774\uC0AC\uD56D\uC740 \uCD5C\uB300 1000\uC790\uAE4C\uC9C0 \uC785\uB825 \uAC00\uB2A5\uD569\uB2C8\uB2E4").nullable()
      });
      const { specialNotes } = updateSchema.parse(req.body);
      const updatedCase = await storage.updateCaseSpecialNotes(caseId, specialNotes);
      if (!updatedCase) {
        return res.status(404).json({ error: "\uCF00\uC774\uC2A4\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
      }
      res.json({ success: true, case: updatedCase });
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Update case special notes error:", error);
      res.status(500).json({ error: "\uD2B9\uC774\uC0AC\uD56D \uC800\uC7A5 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.patch("/api/cases/:caseId/special-notes-confirm", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    if (req.session.userRole !== "\uAD00\uB9AC\uC790") {
      return res.status(403).json({ error: "\uAD00\uB9AC\uC790 \uAD8C\uD55C\uC774 \uD544\uC694\uD569\uB2C8\uB2E4" });
    }
    try {
      const { caseId } = req.params;
      const updatedCase = await storage.confirmCaseSpecialNotes(caseId, req.session.userId);
      if (!updatedCase) {
        return res.status(404).json({ error: "\uCF00\uC774\uC2A4\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
      }
      res.json({ success: true, case: updatedCase });
    } catch (error) {
      console.error("Confirm case special notes error:", error);
      res.status(500).json({ error: "\uD2B9\uC774\uC0AC\uD56D \uD655\uC778 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.post("/api/cases/:caseId/notes-history", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    if (req.session.userRole !== "\uD611\uB825\uC0AC" && req.session.userRole !== "\uAD00\uB9AC\uC790") {
      return res.status(403).json({ error: "\uD611\uB825\uC0AC \uB610\uB294 \uAD00\uB9AC\uC790 \uAD8C\uD55C\uC774 \uD544\uC694\uD569\uB2C8\uB2E4" });
    }
    try {
      const { caseId } = req.params;
      const noteSchema = z2.object({
        content: z2.string().min(1, "\uB0B4\uC6A9\uC744 \uC785\uB825\uD574\uC8FC\uC138\uC694").max(1e3, "\uD2B9\uC774\uC0AC\uD56D\uC740 \uCD5C\uB300 1000\uC790\uAE4C\uC9C0 \uC785\uB825 \uAC00\uB2A5\uD569\uB2C8\uB2E4")
      });
      const { content } = noteSchema.parse(req.body);
      const noteType = req.session.userRole === "\uD611\uB825\uC0AC" ? "partner" : "admin";
      const existingCase = await storage.getCaseById(caseId);
      if (!existingCase) {
        return res.status(404).json({ error: "\uCF00\uC774\uC2A4\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
      }
      const currentUser = await storage.getUser(req.session.userId);
      const historyField = noteType === "partner" ? "partnerNotesHistory" : "adminNotesHistory";
      const currentHistory = existingCase[historyField] ? JSON.parse(existingCase[historyField]) : [];
      const newNote = {
        content,
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        createdBy: req.session.userId,
        createdByName: currentUser?.name || ""
      };
      currentHistory.push(newNote);
      const updateData = {};
      updateData[historyField] = JSON.stringify(currentHistory);
      if (noteType === "partner") {
        updateData.partnerNotesAckedByAdmin = null;
      } else {
        updateData.adminNotesAckedByPartner = null;
      }
      const updatedCase = await storage.updateCase(caseId, updateData);
      if (!updatedCase) {
        return res.status(404).json({ error: "\uCF00\uC774\uC2A4 \uC5C5\uB370\uC774\uD2B8\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4" });
      }
      res.json({ success: true, case: updatedCase, noteType });
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Add notes history error:", error);
      res.status(500).json({ error: "\uD2B9\uC774\uC0AC\uD56D \uC800\uC7A5 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.post("/api/cases/:caseId/notes-ack", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    if (req.session.userRole !== "\uD611\uB825\uC0AC" && req.session.userRole !== "\uAD00\uB9AC\uC790") {
      return res.status(403).json({ error: "\uD611\uB825\uC0AC \uB610\uB294 \uAD00\uB9AC\uC790 \uAD8C\uD55C\uC774 \uD544\uC694\uD569\uB2C8\uB2E4" });
    }
    try {
      const { caseId } = req.params;
      const existingCase = await storage.getCaseById(caseId);
      if (!existingCase) {
        return res.status(404).json({ error: "\uCF00\uC774\uC2A4\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
      }
      const updateData = {};
      if (req.session.userRole === "\uD611\uB825\uC0AC") {
        updateData.adminNotesAckedByPartner = "true";
      } else if (req.session.userRole === "\uAD00\uB9AC\uC790") {
        updateData.partnerNotesAckedByAdmin = "true";
      }
      const updatedCase = await storage.updateCase(caseId, updateData);
      if (!updatedCase) {
        return res.status(404).json({ error: "\uCF00\uC774\uC2A4 \uC5C5\uB370\uC774\uD2B8\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4" });
      }
      res.json({ success: true, case: updatedCase });
    } catch (error) {
      console.error("Acknowledge notes error:", error);
      res.status(500).json({ error: "\uD2B9\uC774\uC0AC\uD56D \uD655\uC778 \uCC98\uB9AC \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.post("/api/cases/:caseId/progress", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    if (req.session.userRole !== "\uAD00\uB9AC\uC790") {
      return res.status(403).json({ error: "\uAD00\uB9AC\uC790 \uAD8C\uD55C\uC774 \uD544\uC694\uD569\uB2C8\uB2E4" });
    }
    try {
      const { caseId } = req.params;
      const progressSchema = z2.object({
        content: z2.string().min(1, "\uC9C4\uD589\uC0C1\uD669 \uB0B4\uC6A9\uC774 \uD544\uC694\uD569\uB2C8\uB2E4")
      });
      const { content } = progressSchema.parse(req.body);
      const progressUpdate = await storage.createProgressUpdate({
        caseId,
        content,
        createdBy: req.session.userId
      });
      res.json({ success: true, progressUpdate });
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Add progress update error:", error);
      res.status(500).json({ error: "\uC9C4\uD589\uC0C1\uD669 \uCD94\uAC00 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.patch("/api/cases/:caseId/additional-notes", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    if (req.session.userRole !== "\uD611\uB825\uC0AC") {
      return res.status(403).json({ error: "\uD611\uB825\uC0AC \uAD8C\uD55C\uC774 \uD544\uC694\uD569\uB2C8\uB2E4" });
    }
    try {
      const { caseId } = req.params;
      const updateSchema = z2.object({
        additionalNotes: z2.string().max(800, "\uAE30\uD0C0\uC0AC\uD56D\uC740 800\uC790\uB97C \uCD08\uACFC\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4").nullable()
      });
      const { additionalNotes } = updateSchema.parse(req.body);
      const updatedCase = await storage.updateCaseAdditionalNotes(caseId, additionalNotes);
      if (!updatedCase) {
        return res.status(404).json({ error: "\uCF00\uC774\uC2A4\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
      }
      res.json({ success: true, case: updatedCase });
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Update case additional notes error:", error);
      res.status(500).json({ error: "\uAE30\uD0C0\uC0AC\uD56D \uC800\uC7A5 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.patch("/api/cases/:caseId/submit", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    if (req.session.userRole !== "\uD611\uB825\uC0AC") {
      return res.status(403).json({ error: "\uD611\uB825\uC0AC \uAD8C\uD55C\uC774 \uD544\uC694\uD569\uB2C8\uB2E4" });
    }
    try {
      const { caseId } = req.params;
      const caseData = await storage.getCaseById(caseId);
      if (!caseData) {
        return res.status(404).json({ error: "\uCF00\uC774\uC2A4\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
      }
      const drawing = await storage.getDrawingByCaseId(caseId);
      const documents = await storage.getDocumentsByCaseId(caseId);
      const estimateData = await storage.getLatestEstimate(caseId);
      const isLossPreventionCase = /-0$/.test(caseData.caseNumber || "");
      const hasRecoveryRows = !!(estimateData?.rows && estimateData.rows.length > 0);
      let hasLaborCosts = false;
      let hasMaterialCosts = false;
      if (estimateData?.estimate?.laborCostData) {
        try {
          const data = typeof estimateData.estimate.laborCostData === "string" ? JSON.parse(estimateData.estimate.laborCostData) : estimateData.estimate.laborCostData;
          hasLaborCosts = Array.isArray(data) && data.length > 0;
        } catch {
          hasLaborCosts = false;
        }
      }
      if (estimateData?.estimate?.materialCostData) {
        try {
          const data = typeof estimateData.estimate.materialCostData === "string" ? JSON.parse(estimateData.estimate.materialCostData) : estimateData.estimate.materialCostData;
          hasMaterialCosts = Array.isArray(data) && data.length > 0;
        } catch {
          hasMaterialCosts = false;
        }
      }
      const isFieldSurveyComplete = !!(caseData.visitDate && caseData.visitTime && caseData.accidentCategory);
      const isDrawingComplete = !!drawing;
      const isDocumentsComplete = documents.length > 0;
      const isEstimateComplete = isLossPreventionCase ? hasLaborCosts || hasMaterialCosts : hasRecoveryRows;
      if (!isFieldSurveyComplete || !isDrawingComplete || !isDocumentsComplete || !isEstimateComplete) {
        const missingItems = [];
        if (!isFieldSurveyComplete) missingItems.push("\uD604\uC7A5\uC870\uC0AC \uC815\uBCF4");
        if (!isDrawingComplete) missingItems.push("\uB3C4\uBA74");
        if (!isDocumentsComplete) missingItems.push("\uC99D\uBE59\uC790\uB8CC");
        if (!isEstimateComplete) missingItems.push("\uACAC\uC801\uC11C");
        return res.status(400).json({
          error: `\uB2E4\uC74C \uD56D\uBAA9\uC744 \uC644\uB8CC\uD574\uC8FC\uC138\uC694: ${missingItems.join(", ")}`
        });
      }
      let estimateTotal = null;
      if (estimateData && estimateData.rows) {
        const rows = estimateData.rows;
        const vatIncluded = estimateData.vatIncluded ?? true;
        const laborCosts2 = rows.reduce((sum, row) => {
          const laborAmount = parseFloat(row.laborCost?.toString() || "0") || 0;
          const includeInEstimate = row.includeInEstimate !== false;
          return sum + (includeInEstimate ? laborAmount : 0);
        }, 0);
        const expenseCosts = rows.reduce((sum, row) => {
          const laborAmount = parseFloat(row.laborCost?.toString() || "0") || 0;
          const includeInEstimate = row.includeInEstimate !== false;
          return sum + (includeInEstimate ? 0 : laborAmount);
        }, 0);
        const materialCosts = rows.reduce((sum, row) => {
          return sum + (parseFloat(row.materialCost?.toString() || "0") || 0);
        }, 0);
        const baseAmount = laborCosts2 + materialCosts;
        const managementFee = Math.round(baseAmount * 0.06);
        const profit = Math.round(baseAmount * 0.15);
        const subtotal = laborCosts2 + expenseCosts + materialCosts + managementFee + profit;
        const vat = vatIncluded ? Math.round(subtotal * 0.1) : 0;
        estimateTotal = subtotal + vat;
      }
      if (estimateTotal === null && caseData.estimateAmount) {
        const parsedAmount = parseFloat(caseData.estimateAmount.replace(/,/g, ""));
        estimateTotal = isNaN(parsedAmount) ? 0 : parsedAmount;
      }
      if (estimateTotal === null) {
        estimateTotal = 0;
      }
      const caseNumber = caseData.caseNumber || "";
      const caseNumberParts = caseNumber.split("-");
      const suffix = caseNumberParts.length > 1 ? parseInt(caseNumberParts[caseNumberParts.length - 1], 10) : 0;
      const isPrevention = suffix === 0;
      const updatedCase = await storage.submitFieldSurvey(caseId, {
        estimateTotal: estimateTotal.toString(),
        isPrevention
      });
      if (!updatedCase) {
        return res.status(404).json({ error: "\uCF00\uC774\uC2A4\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
      }
      res.json({ success: true, case: updatedCase });
    } catch (error) {
      console.error("Submit field survey error:", error);
      res.status(500).json({ error: "\uD604\uC7A5\uC870\uC0AC \uBCF4\uACE0\uC11C \uC81C\uCD9C \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.patch("/api/cases/:caseId/review", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    if (req.session.userRole !== "\uAD00\uB9AC\uC790") {
      return res.status(403).json({ error: "\uAD00\uB9AC\uC790 \uAD8C\uD55C\uC774 \uD544\uC694\uD569\uB2C8\uB2E4" });
    }
    try {
      const { caseId } = req.params;
      const parsed = reviewCaseSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: "\uC785\uB825 \uB370\uC774\uD130\uAC00 \uC720\uD6A8\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4",
          details: parsed.error.errors
        });
      }
      const { decision, reviewComment } = parsed.data;
      const existingCase = await storage.getCaseById(caseId);
      if (!existingCase) {
        return res.status(404).json({ error: "\uCF00\uC774\uC2A4\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
      }
      if (existingCase.fieldSurveyStatus !== "submitted") {
        return res.status(400).json({
          error: "\uC81C\uCD9C\uB41C \uBCF4\uACE0\uC11C\uB9CC \uC2EC\uC0AC\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4"
        });
      }
      const updatedCase = await storage.reviewCase(
        caseId,
        decision,
        reviewComment || null,
        req.session.userId
      );
      if (!updatedCase) {
        return res.status(404).json({ error: "\uCF00\uC774\uC2A4\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
      }
      res.json({ success: true, case: updatedCase });
    } catch (error) {
      console.error("Review case error:", error);
      res.status(500).json({ error: "\uBCF4\uACE0\uC11C \uC2EC\uC0AC \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.patch("/api/cases/:caseId/approve-report", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    if (req.session.userRole !== "\uAD00\uB9AC\uC790") {
      return res.status(403).json({ error: "\uAD00\uB9AC\uC790 \uAD8C\uD55C\uC774 \uD544\uC694\uD569\uB2C8\uB2E4" });
    }
    try {
      const { caseId } = req.params;
      const parsed = approveReportSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: "\uC785\uB825 \uB370\uC774\uD130\uAC00 \uC720\uD6A8\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4",
          details: parsed.error.errors
        });
      }
      const { decision, approvalComment } = parsed.data;
      const existingCase = await storage.getCaseById(caseId);
      if (!existingCase) {
        return res.status(404).json({ error: "\uCF00\uC774\uC2A4\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
      }
      if (existingCase.status !== "\uD604\uC7A5\uC815\uBCF4\uC81C\uCD9C") {
        return res.status(400).json({
          error: "\uD604\uC7A5\uC815\uBCF4\uC81C\uCD9C \uC0C1\uD0DC\uC778 \uBCF4\uACE0\uC11C\uB9CC \uC2B9\uC778\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4"
        });
      }
      const updatedCase = await storage.approveReport(
        caseId,
        decision,
        approvalComment || null,
        req.session.userId
      );
      if (!updatedCase) {
        return res.status(404).json({ error: "\uCF00\uC774\uC2A4\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
      }
      res.json({ success: true, case: updatedCase });
    } catch (error) {
      console.error("Approve report error:", error);
      res.status(500).json({ error: "\uBCF4\uACE0\uC11C \uC2B9\uC778 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.patch("/api/cases/:caseId/field-survey", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    const userRole = req.session.userRole;
    const { caseId } = req.params;
    if (userRole !== "\uD611\uB825\uC0AC" && userRole !== "\uAD00\uB9AC\uC790") {
      return res.status(403).json({ error: "\uD611\uB825\uC0AC \uB610\uB294 \uAD00\uB9AC\uC790 \uAD8C\uD55C\uC774 \uD544\uC694\uD569\uB2C8\uB2E4" });
    }
    if (userRole === "\uAD00\uB9AC\uC790") {
      const existingCase = await storage.getCaseById(caseId);
      if (!existingCase) {
        return res.status(404).json({ error: "\uCF00\uC774\uC2A4\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
      }
      if (existingCase.fieldSurveyStatus !== "submitted") {
        return res.status(403).json({ error: "\uD611\uB825\uC0AC\uAC00 \uBCF4\uACE0\uC11C\uB97C \uC81C\uCD9C\uD55C \uD6C4\uC5D0\uB9CC \uC218\uC815\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4" });
      }
    }
    try {
      const updateSchema = z2.object({
        visitDate: z2.string().nullable().optional(),
        visitTime: z2.string().nullable().optional(),
        travelDistance: z2.string().nullable().optional(),
        dispatchLocation: z2.string().nullable().optional(),
        accompaniedPerson: z2.string().nullable().optional(),
        accidentDate: z2.string().nullable().optional(),
        accidentTime: z2.string().nullable().optional(),
        accidentCategory: z2.string().nullable().optional(),
        accidentCause: z2.string().nullable().optional(),
        specialNotes: z2.string().nullable().optional(),
        victimName: z2.string().nullable().optional(),
        victimContact: z2.string().nullable().optional(),
        victimAddress: z2.string().nullable().optional(),
        additionalVictims: z2.string().nullable().optional(),
        specialRequests: z2.string().nullable().optional(),
        processingTypes: z2.string().nullable().optional(),
        processingTypeOther: z2.string().nullable().optional(),
        recoveryMethodType: z2.string().nullable().optional(),
        fieldSurveyStatus: z2.string().nullable().optional(),
        status: z2.string().nullable().optional()
        // 케이스 상태 자동 변경용
      });
      const fieldData = updateSchema.parse(req.body);
      const updatedCase = await storage.updateCaseFieldSurvey(caseId, fieldData);
      if (!updatedCase) {
        return res.status(404).json({ error: "\uCF00\uC774\uC2A4\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
      }
      const {
        status,
        fieldSurveyStatus,
        victimName,
        victimContact,
        victimAddress,
        additionalVictims,
        ...syncData
      } = fieldData;
      let syncedCount = 0;
      try {
        syncedCount = await storage.syncFieldSurveyToRelatedCases(caseId, syncData);
      } catch (syncError) {
        console.error("Sync to related cases failed:", syncError);
      }
      res.json({
        success: true,
        case: updatedCase,
        syncedCases: syncedCount
      });
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Update case field survey error:", error);
      res.status(500).json({ error: "\uD604\uC7A5\uC870\uC0AC \uC815\uBCF4 \uC800\uC7A5 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.get("/api/partner-stats", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    try {
      const stats = await storage.getPartnerStats();
      res.json(stats);
    } catch (error) {
      console.error("Get partner stats error:", error);
      res.status(500).json({ error: "\uD611\uB825\uC0AC \uD1B5\uACC4\uB97C \uBD88\uB7EC\uC624\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.post("/api/progress-updates", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    try {
      const validatedData = insertProgressUpdateSchema.parse({
        ...req.body,
        createdBy: req.session.userId
      });
      const newUpdate = await storage.createProgressUpdate(validatedData);
      res.status(201).json({ success: true, update: newUpdate });
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create progress update error:", error);
      res.status(500).json({ error: "\uC9C4\uD589\uC0C1\uD669 \uC5C5\uB370\uC774\uD2B8 \uC0DD\uC131 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.get("/api/progress-updates/:caseId", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    try {
      const updates = await storage.getProgressUpdatesByCaseId(req.params.caseId);
      res.json(updates);
    } catch (error) {
      console.error("Get progress updates error:", error);
      res.status(500).json({ error: "\uC9C4\uD589\uC0C1\uD669 \uC5C5\uB370\uC774\uD2B8\uB97C \uBD88\uB7EC\uC624\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.get("/api/statistics/filters", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    try {
      const filters = await storage.getStatisticsFilters();
      res.json(filters);
    } catch (error) {
      console.error("Get statistics filters error:", error);
      res.status(500).json({ error: "\uD544\uD130 \uB370\uC774\uD130\uB97C \uBD88\uB7EC\uC624\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.get("/api/statistics/cases", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    try {
      const currentUser = await storage.getUser(req.session.userId);
      if (!currentUser) {
        return res.status(404).json({ error: "\uC0AC\uC6A9\uC790\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
      }
      const allCases = await storage.getAllCases(currentUser);
      res.json(allCases);
    } catch (error) {
      console.error("Get statistics cases error:", error);
      res.status(500).json({ error: "\uD1B5\uACC4 \uB370\uC774\uD130\uB97C \uBD88\uB7EC\uC624\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.get("/api/role-permissions", async (req, res) => {
    console.log("[GET /api/role-permissions] Request received, session:", {
      userId: req.session?.userId,
      userRole: req.session?.userRole
    });
    if (!req.session?.userId) {
      console.log("[GET /api/role-permissions] 401: Not authenticated");
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    if (req.session.userRole !== "\uAD00\uB9AC\uC790") {
      console.log("[GET /api/role-permissions] 403: Not admin, role is:", req.session.userRole);
      return res.status(403).json({ error: "\uAD00\uB9AC\uC790 \uAD8C\uD55C\uC774 \uD544\uC694\uD569\uB2C8\uB2E4" });
    }
    try {
      const permissions = await storage.getAllRolePermissions();
      console.log("[GET /api/role-permissions] Success, returning", permissions.length, "permissions");
      res.json(permissions);
    } catch (error) {
      console.error("Get role permissions error:", error);
      res.status(500).json({ error: "\uAD8C\uD55C \uC815\uBCF4\uB97C \uBD88\uB7EC\uC624\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.get("/api/role-permissions/:roleName", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    if (req.session.userRole !== "\uAD00\uB9AC\uC790") {
      return res.status(403).json({ error: "\uAD00\uB9AC\uC790 \uAD8C\uD55C\uC774 \uD544\uC694\uD569\uB2C8\uB2E4" });
    }
    try {
      const permission = await storage.getRolePermission(req.params.roleName);
      if (!permission) {
        return res.status(404).json({ error: "\uAD8C\uD55C \uC815\uBCF4\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
      }
      res.json(permission);
    } catch (error) {
      console.error("Get role permission error:", error);
      res.status(500).json({ error: "\uAD8C\uD55C \uC815\uBCF4\uB97C \uBD88\uB7EC\uC624\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.get("/api/my-permissions", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    const userRole = req.session.userRole;
    const userId = req.session.userId;
    if (!userRole) {
      return res.status(400).json({ error: "\uC0AC\uC6A9\uC790 \uC5ED\uD560 \uC815\uBCF4\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
    }
    try {
      if (userRole === "\uAD00\uB9AC\uC790") {
        const individualKey = `\uAD00\uB9AC\uC790_${userId}`;
        const individualPermission = await storage.getRolePermission(individualKey);
        if (individualPermission) {
          return res.json(individualPermission);
        }
      }
      const permission = await storage.getRolePermission(userRole);
      if (!permission) {
        return res.json(null);
      }
      res.json(permission);
    } catch (error) {
      console.error("Get my permissions error:", error);
      res.status(500).json({ error: "\uAD8C\uD55C \uC815\uBCF4\uB97C \uBD88\uB7EC\uC624\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.post("/api/role-permissions", async (req, res) => {
    console.log("[POST /api/role-permissions] Request received, session:", {
      userId: req.session?.userId,
      userRole: req.session?.userRole
    }, "body:", req.body);
    if (!req.session?.userId) {
      console.log("[POST /api/role-permissions] 401: Not authenticated");
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    if (req.session.userRole !== "\uAD00\uB9AC\uC790") {
      console.log("[POST /api/role-permissions] 403: Not admin, role is:", req.session.userRole);
      return res.status(403).json({ error: "\uAD00\uB9AC\uC790 \uAD8C\uD55C\uC774 \uD544\uC694\uD569\uB2C8\uB2E4" });
    }
    try {
      const validatedData = insertRolePermissionSchema.parse(req.body);
      const permission = await storage.saveRolePermission(validatedData);
      console.log("[POST /api/role-permissions] Success, saved permission for role:", validatedData.roleName);
      res.json(permission);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        console.log("[POST /api/role-permissions] 400: Validation error:", error.errors);
        return res.status(400).json({ error: error.errors });
      }
      console.error("Save role permission error:", error);
      res.status(500).json({ error: "\uAD8C\uD55C \uC815\uBCF4\uB97C \uC800\uC7A5\uD558\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.delete("/api/role-permissions/:roleName", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    if (req.session.userRole !== "\uAD00\uB9AC\uC790") {
      return res.status(403).json({ error: "\uAD00\uB9AC\uC790 \uAD8C\uD55C\uC774 \uD544\uC694\uD569\uB2C8\uB2E4" });
    }
    try {
      const { roleName } = req.params;
      const deleted = await storage.deleteRolePermission(roleName);
      if (deleted) {
        console.log("[DELETE /api/role-permissions] Deleted permission for role:", roleName);
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "\uAD8C\uD55C\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
      }
    } catch (error) {
      console.error("Delete role permission error:", error);
      res.status(500).json({ error: "\uAD8C\uD55C \uC0AD\uC81C \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.get("/api/excel-data/:type", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    if (req.session.userRole !== "\uAD00\uB9AC\uC790") {
      return res.status(403).json({ error: "\uAD00\uB9AC\uC790 \uAD8C\uD55C\uC774 \uD544\uC694\uD569\uB2C8\uB2E4" });
    }
    try {
      const { type } = req.params;
      if (type !== "\uB178\uBB34\uBE44" && type !== "\uC790\uC7AC\uBE44" && type !== "\uC77C\uC704\uB300\uAC00") {
        return res.status(400).json({ error: "\uC798\uBABB\uB41C \uB370\uC774\uD130 \uD0C0\uC785\uC785\uB2C8\uB2E4" });
      }
      const data = await storage.getExcelData(type);
      res.json(data);
    } catch (error) {
      console.error("Get excel data error:", error);
      res.status(500).json({ error: "\uB370\uC774\uD130\uB97C \uC870\uD68C\uD558\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.get("/api/excel-data/:type/versions", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    if (req.session.userRole !== "\uAD00\uB9AC\uC790") {
      return res.status(403).json({ error: "\uAD00\uB9AC\uC790 \uAD8C\uD55C\uC774 \uD544\uC694\uD569\uB2C8\uB2E4" });
    }
    try {
      const { type } = req.params;
      if (type !== "\uB178\uBB34\uBE44" && type !== "\uC790\uC7AC\uBE44" && type !== "\uC77C\uC704\uB300\uAC00") {
        return res.status(400).json({ error: "\uC798\uBABB\uB41C \uB370\uC774\uD130 \uD0C0\uC785\uC785\uB2C8\uB2E4" });
      }
      const dataList = await storage.listExcelData(type);
      res.json(dataList);
    } catch (error) {
      console.error("List excel data versions error:", error);
      res.status(500).json({ error: "\uB370\uC774\uD130\uB97C \uC870\uD68C\uD558\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.get("/api/excel-data/detail/:id", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    if (req.session.userRole !== "\uAD00\uB9AC\uC790") {
      return res.status(403).json({ error: "\uAD00\uB9AC\uC790 \uAD8C\uD55C\uC774 \uD544\uC694\uD569\uB2C8\uB2E4" });
    }
    try {
      const { id } = req.params;
      const data = await storage.getExcelDataById(id);
      if (!data) {
        return res.status(404).json({ error: "\uB370\uC774\uD130\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
      }
      res.json(data);
    } catch (error) {
      console.error("Get excel data by ID error:", error);
      res.status(500).json({ error: "\uB370\uC774\uD130\uB97C \uC870\uD68C\uD558\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.post("/api/excel-data", async (req, res) => {
    console.log("[Excel Upload] POST /api/excel-data called");
    if (!req.session?.userId) {
      console.log("[Excel Upload] Error: \uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790");
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    if (req.session.userRole !== "\uAD00\uB9AC\uC790") {
      console.log("[Excel Upload] Error: \uAD00\uB9AC\uC790 \uAD8C\uD55C \uD544\uC694");
      return res.status(403).json({ error: "\uAD00\uB9AC\uC790 \uAD8C\uD55C\uC774 \uD544\uC694\uD569\uB2C8\uB2E4" });
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
      if (error instanceof z2.ZodError) {
        console.log("[Excel Upload] Validation error:", error.errors);
        return res.status(400).json({ error: error.errors });
      }
      if (error && typeof error === "object" && "code" in error && error.code === "23505") {
        console.log("[Excel Upload] Error: \uB3D9\uC77C\uD55C \uC81C\uBAA9 \uC874\uC7AC");
        return res.status(409).json({
          error: "\uB3D9\uC77C\uD55C \uC81C\uBAA9\uC758 \uB370\uC774\uD130\uAC00 \uC774\uBBF8 \uC874\uC7AC\uD569\uB2C8\uB2E4. \uB2E4\uB978 \uC81C\uBAA9\uC744 \uC0AC\uC6A9\uD574\uC8FC\uC138\uC694."
        });
      }
      console.error("[Excel Upload] Save excel data error:", error);
      res.status(500).json({ error: "\uB370\uC774\uD130\uB97C \uC800\uC7A5\uD558\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.patch("/api/excel-data/:id/reparse-headers", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    if (req.session.userRole !== "\uAD00\uB9AC\uC790") {
      return res.status(403).json({ error: "\uAD00\uB9AC\uC790 \uAD8C\uD55C\uC774 \uD544\uC694\uD569\uB2C8\uB2E4" });
    }
    try {
      const { id } = req.params;
      const existing = await storage.getExcelDataById(id);
      if (!existing) {
        return res.status(404).json({ error: "\uB370\uC774\uD130\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
      }
      const allRows = [existing.headers, ...existing.data];
      let headerRowIdx = 0;
      for (let i = 0; i < Math.min(allRows.length, 10); i++) {
        const row = allRows[i];
        if (!row) continue;
        const rowStr = row.map((c) => c?.toString() || "").join("|");
        if (rowStr.includes("\uACF5\uC885") && rowStr.includes("\uACF5\uC0AC\uBA85")) {
          headerRowIdx = i;
          console.log("[Reparse] Found header row at index:", i, "Row:", row);
          break;
        }
      }
      const newHeaders = allRows[headerRowIdx].map((h) => h?.toString() || "");
      const newData = allRows.slice(headerRowIdx + 1);
      console.log("[Reparse] Original headers:", existing.headers);
      console.log("[Reparse] New headers:", newHeaders);
      console.log("[Reparse] New data rows:", newData.length);
      const updated = await storage.updateExcelData(id, newHeaders, newData);
      res.json(updated);
    } catch (error) {
      console.error("Reparse headers error:", error);
      res.status(500).json({ error: "\uD5E4\uB354 \uC7AC\uC778\uC2DD \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.delete("/api/excel-data/:type", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    if (req.session.userRole !== "\uAD00\uB9AC\uC790") {
      return res.status(403).json({ error: "\uAD00\uB9AC\uC790 \uAD8C\uD55C\uC774 \uD544\uC694\uD569\uB2C8\uB2E4" });
    }
    try {
      const { type } = req.params;
      if (type !== "\uB178\uBB34\uBE44" && type !== "\uC790\uC7AC\uBE44" && type !== "\uC77C\uC704\uB300\uAC00") {
        return res.status(400).json({ error: "\uC798\uBABB\uB41C \uB370\uC774\uD130 \uD0C0\uC785\uC785\uB2C8\uB2E4" });
      }
      await storage.deleteExcelData(type);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete excel data error:", error);
      res.status(500).json({ error: "\uB370\uC774\uD130\uB97C \uC0AD\uC81C\uD558\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.delete("/api/excel-data/id/:id", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    if (req.session.userRole !== "\uAD00\uB9AC\uC790") {
      return res.status(403).json({ error: "\uAD00\uB9AC\uC790 \uAD8C\uD55C\uC774 \uD544\uC694\uD569\uB2C8\uB2E4" });
    }
    try {
      const { id } = req.params;
      const deleted = await storage.deleteExcelDataById(id);
      if (!deleted) {
        return res.status(404).json({ error: "\uB370\uC774\uD130\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Delete excel data error:", error);
      res.status(500).json({ error: "\uB370\uC774\uD130\uB97C \uC0AD\uC81C\uD558\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.get("/api/inquiries", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    try {
      let inquiries2;
      if (req.session.userRole === "\uAD00\uB9AC\uC790") {
        inquiries2 = await storage.getAllInquiries();
      } else {
        inquiries2 = await storage.getInquiriesByUserId(req.session.userId);
      }
      res.json(inquiries2);
    } catch (error) {
      console.error("Get inquiries error:", error);
      res.status(500).json({ error: "\uBB38\uC758 \uBAA9\uB85D\uC744 \uC870\uD68C\uD558\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.post("/api/inquiries", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    try {
      const validatedData = insertInquirySchema.parse({
        ...req.body,
        userId: req.session.userId
        // Always use authenticated user's ID
      });
      const inquiry = await storage.createInquiry(validatedData);
      res.json(inquiry);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create inquiry error:", error);
      res.status(500).json({ error: "\uBB38\uC758\uB97C \uB4F1\uB85D\uD558\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.patch("/api/inquiries/:id", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    if (req.session.userRole !== "\uAD00\uB9AC\uC790") {
      return res.status(403).json({ error: "\uAD00\uB9AC\uC790 \uAD8C\uD55C\uC774 \uD544\uC694\uD569\uB2C8\uB2E4" });
    }
    try {
      const { id } = req.params;
      const validatedData = respondInquirySchema.parse(req.body);
      const updateData = {
        responseTitle: validatedData.responseTitle,
        response: validatedData.response,
        respondedBy: req.session.userId,
        respondedAt: /* @__PURE__ */ new Date(),
        status: "\uC644\uB8CC"
      };
      const updated = await storage.updateInquiry(id, updateData);
      if (!updated) {
        return res.status(404).json({ error: "\uBB38\uC758\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
      }
      res.json(updated);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Update inquiry error:", error);
      res.status(500).json({ error: "\uBB38\uC758\uB97C \uC218\uC815\uD558\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.post("/api/drawings", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    try {
      const { drawingId, ...bodyData } = req.body;
      const validatedData = insertDrawingSchema.parse({
        ...bodyData,
        createdBy: req.session.userId
      });
      const requestedCase = await storage.getCaseById(validatedData.caseId);
      if (!requestedCase) {
        return res.status(404).json({ error: "\uCF00\uC774\uC2A4\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
      }
      let drawing;
      if (drawingId) {
        const existing = await storage.getDrawing(drawingId);
        if (!existing) {
          return res.status(404).json({ error: "\uB3C4\uBA74\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
        }
        if (existing.caseId !== validatedData.caseId) {
          return res.status(403).json({ error: "\uB2E4\uB978 \uCF00\uC774\uC2A4\uC758 \uB3C4\uBA74\uC785\uB2C8\uB2E4" });
        }
        const updateData = {
          uploadedImages: validatedData.uploadedImages,
          rectangles: validatedData.rectangles,
          accidentAreas: validatedData.accidentAreas,
          leakMarkers: validatedData.leakMarkers
          // caseId is immutable - don't update it
        };
        drawing = await storage.updateDrawing(drawingId, updateData);
      } else {
        const existing = await storage.getDrawingByCaseId(validatedData.caseId);
        if (existing) {
          const updateData = {
            uploadedImages: validatedData.uploadedImages,
            rectangles: validatedData.rectangles,
            accidentAreas: validatedData.accidentAreas,
            leakMarkers: validatedData.leakMarkers
          };
          drawing = await storage.updateDrawing(existing.id, updateData);
        } else {
          drawing = await storage.saveDrawing(validatedData);
        }
      }
      res.json(drawing);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Save drawing error:", error);
      res.status(500).json({ error: "\uB3C4\uBA74\uC744 \uC800\uC7A5\uD558\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.get("/api/drawings/:id", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    try {
      const { id } = req.params;
      const drawing = await storage.getDrawing(id);
      if (!drawing) {
        return res.status(404).json({ error: "\uB3C4\uBA74\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
      }
      res.json(drawing);
    } catch (error) {
      console.error("Get drawing error:", error);
      res.status(500).json({ error: "\uB3C4\uBA74\uC744 \uC870\uD68C\uD558\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.get("/api/drawings/case/:caseId", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    try {
      const { caseId } = req.params;
      const drawing = await storage.getDrawingByCaseId(caseId);
      if (!drawing) {
        return res.status(404).json({ error: "\uB3C4\uBA74\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
      }
      res.json(drawing);
    } catch (error) {
      console.error("Get drawing by case error:", error);
      res.status(500).json({ error: "\uB3C4\uBA74\uC744 \uC870\uD68C\uD558\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.get("/api/drawings/active-case-id", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    try {
      const activeCase = await storage.getOrCreateActiveCase(req.session.userId);
      res.json({ caseId: activeCase.id });
    } catch (error) {
      console.error("Get active case ID error:", error);
      res.status(500).json({ error: "\uD65C\uC131 \uCF00\uC774\uC2A4 ID\uB97C \uC870\uD68C\uD558\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.get("/api/cases/:caseId/related-drawing", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
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
      res.status(500).json({ error: "\uAD00\uB828 \uB3C4\uBA74\uC744 \uC870\uD68C\uD558\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.get("/api/cases/:caseId/related-drawings", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    try {
      const { caseId } = req.params;
      const relatedCases = await storage.getAllRelatedCasesWithDrawings(caseId);
      res.json({ relatedCases });
    } catch (error) {
      console.error("Get all related drawings error:", error);
      res.status(500).json({ error: "\uAD00\uB828 \uB3C4\uBA74 \uBAA9\uB85D\uC744 \uC870\uD68C\uD558\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.post("/api/cases/:caseId/clone-drawing", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    try {
      const { caseId } = req.params;
      const { sourceCaseId } = req.body;
      if (!sourceCaseId) {
        return res.status(400).json({ error: "\uC18C\uC2A4 \uCF00\uC774\uC2A4 ID\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4" });
      }
      const clonedDrawing = await storage.cloneDrawingFromCase(
        sourceCaseId,
        caseId,
        req.session.userId
      );
      if (!clonedDrawing) {
        return res.status(404).json({ error: "\uC18C\uC2A4 \uCF00\uC774\uC2A4\uC5D0 \uB3C4\uBA74\uC774 \uC5C6\uC2B5\uB2C8\uB2E4" });
      }
      res.json({ success: true, drawing: clonedDrawing });
    } catch (error) {
      console.error("Clone drawing error:", error);
      res.status(500).json({ error: "\uB3C4\uBA74\uC744 \uBCF5\uC81C\uD558\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.get("/api/cases/:caseId/related-estimate", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
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
      res.status(500).json({ error: "\uAD00\uB828 \uACAC\uC801\uC11C\uB97C \uC870\uD68C\uD558\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.post("/api/cases/:caseId/clone-estimate", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    try {
      const { caseId } = req.params;
      const { sourceCaseId } = req.body;
      if (!sourceCaseId) {
        return res.status(400).json({ error: "\uC18C\uC2A4 \uCF00\uC774\uC2A4 ID\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4" });
      }
      const clonedEstimate = await storage.cloneEstimateFromCase(
        sourceCaseId,
        caseId,
        req.session.userId
      );
      if (!clonedEstimate) {
        return res.status(404).json({ error: "\uC18C\uC2A4 \uCF00\uC774\uC2A4\uC5D0 \uACAC\uC801\uC11C\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4" });
      }
      res.json({ success: true, estimate: clonedEstimate });
    } catch (error) {
      console.error("Clone estimate error:", error);
      res.status(500).json({ error: "\uACAC\uC801\uC11C\uB97C \uBCF5\uC81C\uD558\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.get("/api/cases/:caseId/related-documents", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
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
      res.status(500).json({ error: "\uAD00\uB828 \uC99D\uBE59\uC790\uB8CC\uB97C \uC870\uD68C\uD558\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.post("/api/cases/:caseId/clone-documents", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    try {
      const { caseId } = req.params;
      const { sourceCaseId } = req.body;
      if (!sourceCaseId) {
        return res.status(400).json({ error: "\uC18C\uC2A4 \uCF00\uC774\uC2A4 ID\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4" });
      }
      const clonedDocuments = await storage.cloneDocumentsFromCase(
        sourceCaseId,
        caseId,
        req.session.userId
      );
      res.json({ success: true, documents: clonedDocuments, count: clonedDocuments.length });
    } catch (error) {
      console.error("Clone documents error:", error);
      res.status(500).json({ error: "\uC99D\uBE59\uC790\uB8CC\uB97C \uBCF5\uC81C\uD558\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.post("/api/documents", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    try {
      const validatedData = insertCaseDocumentSchema.parse(req.body);
      const document2 = await storage.saveDocument(validatedData);
      const claimDocumentCategories = ["\uC704\uC784\uC7A5", "\uB3C4\uAE09\uACC4\uC57D\uC11C", "\uBCF5\uAD6C\uC644\uB8CC\uD655\uC778\uC11C", "\uBD80\uAC00\uC138 \uCCAD\uAD6C\uC790\uB8CC"];
      const settlementStatuses = ["\uCCAD\uAD6C", "\uC785\uAE08\uC644\uB8CC", "\uBD80\uBD84\uC785\uAE08", "\uC815\uC0B0\uC644\uB8CC"];
      const parentCategory = validatedData.parentCategory;
      const isClaimTab = parentCategory === "\uCCAD\uAD6C\uC790\uB8CC";
      if ((isClaimTab || claimDocumentCategories.includes(validatedData.category) || validatedData.category === "\uCCAD\uAD6C") && validatedData.caseId) {
        const existingCase = await storage.getCaseById(validatedData.caseId);
        if (existingCase) {
          const updateData = {};
          const currentDate = (/* @__PURE__ */ new Date()).toLocaleString("en-CA", {
            timeZone: "Asia/Seoul"
          }).split(",")[0];
          if (!settlementStatuses.includes(existingCase.status)) {
            updateData.status = "\uCCAD\uAD6C";
            updateData.claimDate = currentDate;
          }
          if (!existingCase.constructionCompletionDate) {
            updateData.constructionCompletionDate = currentDate;
          }
          if (Object.keys(updateData).length > 0) {
            await storage.updateCase(validatedData.caseId, updateData);
          }
        }
      }
      res.json(document2);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Upload document error:", error);
      res.status(500).json({ error: "\uBB38\uC11C\uB97C \uC5C5\uB85C\uB4DC\uD558\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.get("/api/documents/case/:caseId", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    try {
      const { caseId } = req.params;
      if (!caseId || caseId === "null" || caseId === "undefined") {
        console.error("Invalid caseId for documents:", caseId);
        return res.status(400).json({ error: "\uC720\uD6A8\uD558\uC9C0 \uC54A\uC740 \uCF00\uC774\uC2A4 ID\uC785\uB2C8\uB2E4" });
      }
      const documents = await storage.getDocumentsByCaseId(caseId);
      res.json(documents);
    } catch (error) {
      console.error("Get documents error:", error);
      console.error("Get documents error details:", error instanceof Error ? error.message : String(error));
      res.status(500).json({ error: "\uBB38\uC11C\uB97C \uC870\uD68C\uD558\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.get("/api/documents/:id/data", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    try {
      const { id } = req.params;
      if (!id || id === "null" || id === "undefined") {
        return res.status(400).json({ error: "\uC720\uD6A8\uD558\uC9C0 \uC54A\uC740 \uBB38\uC11C ID\uC785\uB2C8\uB2E4" });
      }
      const document2 = await storage.getDocument(id);
      if (!document2) {
        return res.status(404).json({ error: "\uBB38\uC11C\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
      }
      const userRole = req.session.userRole;
      const isPrivilegedRole = userRole === "\uAD00\uB9AC\uC790" || userRole === "\uC2EC\uC0AC\uC0AC";
      if (!isPrivilegedRole && document2.createdBy !== req.session.userId) {
        return res.status(403).json({ error: "\uAD8C\uD55C\uC774 \uC5C6\uC2B5\uB2C8\uB2E4" });
      }
      const fileData = await storage.getDocumentFileData(id);
      if (!fileData) {
        return res.status(404).json({ error: "\uBB38\uC11C \uB370\uC774\uD130\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
      }
      res.json({ fileData });
    } catch (error) {
      console.error("Get document data error:", error);
      res.status(500).json({ error: "\uBB38\uC11C \uB370\uC774\uD130\uB97C \uC870\uD68C\uD558\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.delete("/api/documents/:id", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    try {
      const { id } = req.params;
      const document2 = await storage.getDocument(id);
      if (!document2) {
        return res.status(404).json({ error: "\uBB38\uC11C\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
      }
      const userRole = req.session.userRole;
      const isPrivilegedRole = userRole === "\uAD00\uB9AC\uC790" || userRole === "\uC2EC\uC0AC\uC0AC";
      if (!isPrivilegedRole && document2.createdBy !== req.session.userId) {
        return res.status(403).json({ error: "\uAD8C\uD55C\uC774 \uC5C6\uC2B5\uB2C8\uB2E4" });
      }
      await storage.deleteDocument(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete document error:", error);
      res.status(500).json({ error: "\uBB38\uC11C\uB97C \uC0AD\uC81C\uD558\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.patch("/api/documents/:id", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    try {
      const { id } = req.params;
      const { category } = req.body;
      if (!category) {
        return res.status(400).json({ error: "\uCE74\uD14C\uACE0\uB9AC\uB97C \uC785\uB825\uD574\uC8FC\uC138\uC694" });
      }
      const document2 = await storage.getDocument(id);
      if (!document2) {
        return res.status(404).json({ error: "\uBB38\uC11C\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
      }
      const userRole = req.session.userRole;
      const isPrivilegedRole = userRole === "\uAD00\uB9AC\uC790" || userRole === "\uC2EC\uC0AC\uC0AC";
      if (!isPrivilegedRole && document2.createdBy !== req.session.userId) {
        return res.status(403).json({ error: "\uAD8C\uD55C\uC774 \uC5C6\uC2B5\uB2C8\uB2E4" });
      }
      const updated = await storage.updateDocumentCategory(id, category);
      res.json(updated);
    } catch (error) {
      console.error("Update document category error:", error);
      res.status(500).json({ error: "\uCE74\uD14C\uACE0\uB9AC\uB97C \uBCC0\uACBD\uD558\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.get("/api/cases/assigned", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    try {
      const { search } = req.query;
      const currentUser = await storage.getUser(req.session.userId);
      if (!currentUser) {
        return res.status(404).json({ error: "\uC0AC\uC6A9\uC790\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
      }
      const cases2 = await storage.getAssignedCasesForUser(currentUser, search);
      const caseSummaries = cases2.map((c) => ({
        id: c.id,
        caseNumber: c.caseNumber,
        insuredName: c.insuredName,
        accidentLocation: c.insuredAddress || c.victimAddress || "-",
        insuranceCompany: c.insuranceCompany,
        status: c.status
      }));
      res.json(caseSummaries);
    } catch (error) {
      console.error("Get assigned cases error:", error);
      res.status(500).json({ error: "\uBC30\uC815\uB41C \uCF00\uC774\uC2A4\uB97C \uC870\uD68C\uD558\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.post("/api/estimates/:caseId", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    try {
      const { caseId } = req.params;
      const { rows, laborCostData, materialCostData, totalAmount, vatIncluded } = req.body;
      if (!rows || !Array.isArray(rows)) {
        return res.status(400).json({ error: "\uACAC\uC801 \uD589 \uB370\uC774\uD130\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4" });
      }
      const existingCase = await storage.getCaseById(caseId);
      if (!existingCase) {
        return res.status(404).json({ error: "\uCF00\uC774\uC2A4\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
      }
      const estimateRowSchema = z2.object({
        category: z2.string().min(1, "\uD56D\uC18C\uB97C \uC120\uD0DD\uD574\uC8FC\uC138\uC694"),
        location: z2.string().nullable().optional(),
        workType: z2.string().nullable().optional(),
        workName: z2.string().nullable().optional(),
        damageWidth: z2.union([z2.string(), z2.number()]).nullable().optional(),
        damageHeight: z2.union([z2.string(), z2.number()]).nullable().optional(),
        damageArea: z2.union([z2.string(), z2.number()]).nullable().optional(),
        repairWidth: z2.union([z2.string(), z2.number()]).nullable().optional(),
        repairHeight: z2.union([z2.string(), z2.number()]).nullable().optional(),
        repairArea: z2.union([z2.string(), z2.number()]).nullable().optional(),
        note: z2.string().nullable().optional()
      });
      const dbRows = rows.map((row, index) => {
        const validated = estimateRowSchema.parse(row);
        const toNumber = (val) => {
          if (val === null || val === void 0 || val === "" || val === "0") return null;
          const num = typeof val === "string" ? parseFloat(val) : val;
          return !isNaN(num) && num >= 0 ? num : null;
        };
        const toArea = (val) => {
          if (val === null || val === void 0 || val === "" || val === "0") return null;
          const num = typeof val === "string" ? parseFloat(val) : val;
          if (isNaN(num) || num < 0) return null;
          return num;
        };
        return {
          category: validated.category,
          location: validated.location === "\uC120\uD0DD" ? null : validated.location,
          workType: validated.workType || null,
          workName: validated.workName === "\uC120\uD0DD" ? null : validated.workName,
          damageWidth: toNumber(validated.damageWidth),
          damageHeight: toNumber(validated.damageHeight),
          damageArea: toArea(validated.damageArea),
          repairWidth: toNumber(validated.repairWidth),
          repairHeight: toNumber(validated.repairHeight),
          repairArea: toArea(validated.repairArea),
          note: validated.note || null,
          rowOrder: index + 1
          // Server assigns 1-based ordering
        };
      });
      const result = await storage.createEstimateVersion(
        caseId,
        req.session.userId,
        dbRows,
        laborCostData || null,
        materialCostData || null,
        vatIncluded ?? true
        // VAT 포함/별도 옵션
      );
      if (totalAmount !== void 0 && totalAmount !== null) {
        await storage.updateCaseEstimateAmount(caseId, totalAmount.toString());
      }
      res.json(result);
    } catch (error) {
      const errorDetails = {
        message: error?.message || "Unknown error",
        stack: error?.stack || "No stack trace",
        code: error?.code || "No error code",
        caseId: req.params.caseId,
        userId: req.session?.userId,
        rowCount: req.body?.rows?.length || 0,
        hasLaborData: !!req.body?.laborCostData,
        hasMaterialData: !!req.body?.materialCostData,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
      console.error("[Estimate Save Error]", JSON.stringify(errorDetails, null, 2));
      if (error instanceof z2.ZodError) {
        return res.status(400).json({
          error: "\uACAC\uC801 \uB370\uC774\uD130 \uD615\uC2DD\uC774 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4",
          details: error.errors,
          errorCode: "VALIDATION_ERROR"
        });
      }
      res.status(500).json({
        error: "\uACAC\uC801\uC744 \uC800\uC7A5\uD558\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4",
        errorCode: error?.code || "UNKNOWN_ERROR",
        errorMessage: error?.message || "Unknown error",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
  });
  app2.get("/api/estimates/:caseId/latest", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    try {
      const { caseId } = req.params;
      const result = await storage.getLatestEstimate(caseId);
      if (!result) {
        return res.json({ estimate: null, rows: [] });
      }
      res.json(result);
    } catch (error) {
      console.error("Get latest estimate error:", error);
      res.status(500).json({ error: "\uACAC\uC801\uC744 \uC870\uD68C\uD558\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.post("/api/estimates/batch/latest", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    try {
      const batchEstimatesSchema = z2.object({
        caseIds: z2.array(z2.string().min(1)).max(100)
        // Max 100 cases per request
      });
      const { caseIds } = batchEstimatesSchema.parse(req.body);
      const results = await Promise.all(
        caseIds.map(async (caseId) => {
          try {
            const result = await storage.getLatestEstimate(caseId);
            return {
              caseId,
              estimate: result?.estimate || null,
              rows: result?.rows || []
            };
          } catch (error) {
            console.error(`Error fetching estimate for case ${caseId}:`, error);
            return {
              caseId,
              estimate: null,
              rows: [],
              error: "\uACAC\uC801 \uC870\uD68C \uC2E4\uD328"
            };
          }
        })
      );
      res.json(results);
    } catch (error) {
      console.error("Batch get estimates error:", error);
      if (error instanceof z2.ZodError) {
        return res.status(400).json({
          error: "\uC694\uCCAD \uB370\uC774\uD130 \uD615\uC2DD\uC774 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4",
          details: error.errors
        });
      }
      res.status(500).json({ error: "\uACAC\uC801\uC744 \uC870\uD68C\uD558\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.get("/api/estimates/:caseId/versions", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    try {
      const { caseId } = req.params;
      const versions = await storage.listEstimateVersions(caseId);
      res.json(versions);
    } catch (error) {
      console.error("List estimate versions error:", error);
      res.status(500).json({ error: "\uACAC\uC801 \uBC84\uC804\uC744 \uC870\uD68C\uD558\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.get("/api/estimates/:caseId/versions/:version", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    try {
      const { caseId, version } = req.params;
      const versionNum = parseInt(version, 10);
      if (isNaN(versionNum)) {
        return res.status(400).json({ error: "\uC720\uD6A8\uD558\uC9C0 \uC54A\uC740 \uBC84\uC804 \uBC88\uD638\uC785\uB2C8\uB2E4" });
      }
      const result = await storage.getEstimateVersion(caseId, versionNum);
      if (!result) {
        return res.status(404).json({ error: "\uACAC\uC801 \uBC84\uC804\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
      }
      res.json(result);
    } catch (error) {
      console.error("Get estimate version error:", error);
      res.status(500).json({ error: "\uACAC\uC801 \uBC84\uC804\uC744 \uC870\uD68C\uD558\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.get("/api/master-data", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    try {
      const { category, includeInactive } = req.query;
      const includeAll = includeInactive === "true";
      const data = await storage.getMasterData(category, includeAll);
      res.json(data);
    } catch (error) {
      console.error("Get master data error:", error);
      res.status(500).json({ error: "\uAE30\uC900\uC815\uBCF4\uB97C \uC870\uD68C\uD558\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.post("/api/master-data", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    const userRole = req.session.userRole;
    if (userRole !== "\uAD00\uB9AC\uC790") {
      return res.status(403).json({ error: "\uAD00\uB9AC\uC790\uB9CC \uAE30\uC900\uC815\uBCF4\uB97C \uCD94\uAC00\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4" });
    }
    try {
      const validated = insertMasterDataSchema.parse(req.body);
      const created = await storage.createMasterData(validated);
      res.json(created);
    } catch (error) {
      console.error("Create master data error:", error);
      if (error instanceof z2.ZodError) {
        return res.status(400).json({
          error: "\uC785\uB825 \uB370\uC774\uD130 \uD615\uC2DD\uC774 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4",
          details: error.errors
        });
      }
      res.status(500).json({ error: "\uAE30\uC900\uC815\uBCF4\uB97C \uCD94\uAC00\uD558\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.delete("/api/master-data/:id", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    const userRole = req.session.userRole;
    if (userRole !== "\uAD00\uB9AC\uC790") {
      return res.status(403).json({ error: "\uAD00\uB9AC\uC790\uB9CC \uAE30\uC900\uC815\uBCF4\uB97C \uC0AD\uC81C\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4" });
    }
    try {
      const { id } = req.params;
      console.log("[Master Data DELETE] Deleting item:", id);
      await storage.deleteMasterData(id);
      console.log("[Master Data DELETE] Successfully deleted:", id);
      res.json({ success: true });
    } catch (error) {
      console.error("[Master Data DELETE] Error deleting:", error);
      res.status(500).json({ error: "\uAE30\uC900\uC815\uBCF4\uB97C \uC0AD\uC81C\uD558\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.patch("/api/master-data/:id", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    const userRole = req.session.userRole;
    if (userRole !== "\uAD00\uB9AC\uC790") {
      return res.status(403).json({ error: "\uAD00\uB9AC\uC790\uB9CC \uAE30\uC900\uC815\uBCF4\uB97C \uC218\uC815\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4" });
    }
    try {
      const { id } = req.params;
      const { value, displayOrder, isActive, note } = req.body;
      const updated = await storage.updateMasterData(id, {
        value,
        displayOrder,
        isActive,
        note
      });
      if (!updated) {
        return res.status(404).json({ error: "\uAE30\uC900\uC815\uBCF4\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Update master data error:", error);
      res.status(500).json({ error: "\uAE30\uC900\uC815\uBCF4\uB97C \uC218\uC815\uD558\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.get("/api/labor-costs", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    try {
      const { category, workName, detailWork } = req.query;
      const filters = {};
      if (typeof category === "string") filters.category = category;
      if (typeof workName === "string") filters.workName = workName;
      if (typeof detailWork === "string") filters.detailWork = detailWork;
      const data = await storage.getLaborCosts(Object.keys(filters).length > 0 ? filters : void 0);
      res.json(data);
    } catch (error) {
      console.error("Get labor costs error:", error);
      res.status(500).json({ error: "\uB178\uBB34\uBE44\uB97C \uC870\uD68C\uD558\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.get("/api/labor-costs/options", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    try {
      const options = await storage.getLaborCostOptions();
      res.json(options);
    } catch (error) {
      console.error("Get labor cost options error:", error);
      res.status(500).json({ error: "\uB178\uBB34\uBE44 \uC635\uC158\uC744 \uC870\uD68C\uD558\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.get("/api/labor-catalog", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    try {
      const excelDataList = await storage.listExcelData("\uB178\uBB34\uBE44");
      if (!excelDataList || excelDataList.length === 0) {
        return res.json([]);
      }
      const excelData2 = excelDataList[0];
      if (!excelData2.data || !Array.isArray(excelData2.data)) {
        return res.json([]);
      }
      const catalog = [];
      const safeString = (val) => {
        if (val === null || val === void 0) return "";
        return String(val).trim();
      };
      const parsePrice = (val) => {
        if (val === null || val === void 0 || val === "") return null;
        if (typeof val === "number") return val;
        const cleaned = String(val).replace(/,/g, "").trim();
        const num = parseFloat(cleaned);
        return isNaN(num) ? null : num;
      };
      const headers = excelData2.headers || [];
      const isNewFormat = headers.some((h) => h && h.includes("\uB178\uC784\uD56D\uBAA9"));
      console.log("Labor catalog headers:", headers);
      console.log("Is new format:", isNewFormat);
      if (isNewFormat) {
        let categoryIdx = 0, workNameIdx = 1, laborItemIdx = 2, priceIdx = 3;
        headers.forEach((h, idx) => {
          const trimmed = (h || "").trim();
          if (trimmed === "\uACF5\uC885") categoryIdx = idx;
          if (trimmed.includes("\uB178\uC784\uD56D\uBAA9")) laborItemIdx = idx;
          if (trimmed.includes("\uAE08\uC561")) priceIdx = idx;
        });
        headers.forEach((h, idx) => {
          const trimmed = (h || "").trim();
          if ((trimmed.includes("\uACF5\uC0AC\uBA85") || trimmed.includes("\uD488\uBA85")) && idx !== laborItemIdx) {
            workNameIdx = idx;
          }
        });
        console.log("NEW FORMAT column indices:", { categoryIdx, workNameIdx, laborItemIdx, priceIdx });
        let prevCategory = null;
        let prevWorkName = null;
        for (let i = 0; i < excelData2.data.length; i++) {
          const row = excelData2.data[i];
          if (!row || row.length === 0) continue;
          const category = safeString(row[categoryIdx]) || prevCategory || "";
          const workName = safeString(row[workNameIdx]) || prevWorkName || "";
          const laborItem = safeString(row[laborItemIdx]);
          const price = parsePrice(row[priceIdx]);
          if (safeString(row[categoryIdx])) prevCategory = category;
          if (safeString(row[workNameIdx])) prevWorkName = workName;
          if (!category || !laborItem) continue;
          catalog.push({
            \uACF5\uC885: category,
            \uACF5\uC0AC\uBA85: workName,
            \uC138\uBD80\uACF5\uC0AC: "\uB178\uBB34\uBE44",
            // 새 형식은 모두 노무비로 간주
            \uC138\uBD80\uD56D\uBAA9: laborItem,
            // 노임항목DB 값
            \uB2E8\uC704: "\uC778",
            \uB2E8\uAC00_\uC778: price,
            \uB2E8\uAC00_\uCC9C\uC7A5: null,
            \uB2E8\uAC00_\uBCBD\uCCB4: null,
            \uB2E8\uAC00_\uBC14\uB2E5: null,
            \uB2E8\uAC00_\uAE38\uC774: null
          });
        }
      } else {
        let prevCategory = null;
        let prevWorkName = null;
        let prevDetailWork = null;
        for (let i = 0; i < excelData2.data.length; i++) {
          const row = excelData2.data[i];
          if (!row || row.length === 0) continue;
          const category = safeString(row[0]) || prevCategory || "";
          const workName = safeString(row[1]) || prevWorkName || "";
          const detailWork = safeString(row[2]) || prevDetailWork || "";
          const detailItem = safeString(row[3]);
          const laborPrice = parsePrice(row[4]);
          const ceilingPrice = parsePrice(row[7]);
          const wallPrice = parsePrice(row[8]);
          const floorPrice = parsePrice(row[9]);
          const lengthPrice = parsePrice(row[10]);
          if (safeString(row[0])) prevCategory = category;
          if (safeString(row[1])) prevWorkName = workName;
          if (safeString(row[2])) prevDetailWork = detailWork;
          if (!category || !workName || !detailWork) continue;
          let unit = "m";
          if (detailWork === "\uB178\uBB34\uBE44") {
            unit = "\uC778";
          } else if (ceilingPrice || wallPrice || floorPrice) {
            unit = "\u33A1";
          } else if (lengthPrice) {
            unit = "m";
          }
          catalog.push({
            \uACF5\uC885: category,
            \uACF5\uC0AC\uBA85: workName,
            \uC138\uBD80\uACF5\uC0AC: detailWork,
            \uC138\uBD80\uD56D\uBAA9: detailItem,
            \uB2E8\uC704: unit,
            \uB2E8\uAC00_\uC778: laborPrice,
            \uB2E8\uAC00_\uCC9C\uC7A5: ceilingPrice,
            \uB2E8\uAC00_\uBCBD\uCCB4: wallPrice,
            \uB2E8\uAC00_\uBC14\uB2E5: floorPrice,
            \uB2E8\uAC00_\uAE38\uC774: lengthPrice
          });
          if (category === "\uD53C\uD574\uCCA0\uAC70\uACF5\uC0AC" && detailWork === "\uC77C\uC704\uB300\uAC00" && detailItem) {
            const extractedWorkName = detailItem.replace(/\s*(해체|철거)\s*$/g, "").trim();
            if (extractedWorkName) {
              catalog.push({
                \uACF5\uC885: "\uCCA0\uAC70\uACF5\uC0AC",
                \uACF5\uC0AC\uBA85: extractedWorkName,
                \uC138\uBD80\uACF5\uC0AC: detailWork,
                \uC138\uBD80\uD56D\uBAA9: detailItem,
                \uB2E8\uC704: unit,
                \uB2E8\uAC00_\uC778: laborPrice,
                \uB2E8\uAC00_\uCC9C\uC7A5: ceilingPrice,
                \uB2E8\uAC00_\uBCBD\uCCB4: wallPrice,
                \uB2E8\uAC00_\uBC14\uB2E5: floorPrice,
                \uB2E8\uAC00_\uAE38\uC774: lengthPrice
              });
            }
          }
          if (category === "\uC6D0\uC778\uCCA0\uAC70\uACF5\uC0AC" && detailWork === "\uC77C\uC704\uB300\uAC00" && detailItem) {
            const extractedWorkName = detailItem.replace(/\s*(해체|철거|및.*|\/.*)\s*$/g, "").trim();
            if (extractedWorkName) {
              catalog.push({
                \uACF5\uC885: "\uCCA0\uAC70\uACF5\uC0AC",
                \uACF5\uC0AC\uBA85: extractedWorkName,
                \uC138\uBD80\uACF5\uC0AC: detailWork,
                \uC138\uBD80\uD56D\uBAA9: detailItem,
                \uB2E8\uC704: unit,
                \uB2E8\uAC00_\uC778: laborPrice,
                \uB2E8\uAC00_\uCC9C\uC7A5: ceilingPrice,
                \uB2E8\uAC00_\uBCBD\uCCB4: wallPrice,
                \uB2E8\uAC00_\uBC14\uB2E5: floorPrice,
                \uB2E8\uAC00_\uAE38\uC774: lengthPrice
              });
            }
          }
        }
      }
      console.log("========== LABOR CATALOG DEBUG ==========");
      console.log("Parsed catalog items count:", catalog.length);
      console.log("\uCCAB 5\uAC1C \uD56D\uBAA9:", JSON.stringify(catalog.slice(0, 5), null, 2));
      const allCategories = Array.from(new Set(catalog.map((item) => item.\uACF5\uC885)));
      console.log("\uC804\uCCB4 \uACF5\uC885 \uBAA9\uB85D:", allCategories);
      console.log("==========================================");
      res.json(catalog);
    } catch (error) {
      console.error("Get labor catalog error:", error);
      res.status(500).json({ error: "\uB178\uBB34\uBE44 \uCE74\uD0C8\uB85C\uADF8\uB97C \uC870\uD68C\uD558\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.get("/api/ilwidaega-catalog", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    try {
      const excelDataList = await storage.listExcelData("\uC77C\uC704\uB300\uAC00");
      console.log("[\uC77C\uC704\uB300\uAC00 API] \uC870\uD68C \uACB0\uACFC:", excelDataList?.length || 0, "\uAC1C");
      if (!excelDataList || excelDataList.length === 0) {
        console.log("[\uC77C\uC704\uB300\uAC00 API] \uC77C\uC704\uB300\uAC00 \uB370\uC774\uD130 \uC5C6\uC74C");
        return res.json([]);
      }
      const excelData2 = excelDataList[0];
      console.log("[\uC77C\uC704\uB300\uAC00 API] \uC0AC\uC6A9\uD560 \uB370\uC774\uD130:", excelData2.id, excelData2.title);
      if (!excelData2.data || !Array.isArray(excelData2.data)) {
        console.log("[\uC77C\uC704\uB300\uAC00 API] \uB370\uC774\uD130 \uBC30\uC5F4 \uC5C6\uC74C");
        return res.json([]);
      }
      console.log("[\uC77C\uC704\uB300\uAC00 API] \uD589 \uC218:", excelData2.data.length);
      const safeString = (val) => {
        if (val === null || val === void 0) return "";
        return String(val).trim();
      };
      const parsePrice = (val) => {
        if (val === null || val === void 0 || val === "") return null;
        if (typeof val === "number") return val;
        const cleaned = String(val).replace(/,/g, "").trim();
        const num = parseFloat(cleaned);
        return isNaN(num) ? null : num;
      };
      const catalog = [];
      const headers = excelData2.headers || [];
      let categoryIdx = 0, workNameIdx = 1, laborItemIdx = 2;
      let standardWorkQuantityIdx = -1;
      let laborUnitPriceIdx = -1;
      let ilwidaegaIdx = -1;
      headers.forEach((h, idx) => {
        const trimmed = (h || "").trim();
        if (trimmed === "\uACF5\uC885") categoryIdx = idx;
        if (trimmed.includes("\uACF5\uC0AC\uBA85") || trimmed.includes("\uD488\uBA85")) workNameIdx = idx;
        if (trimmed.includes("\uB178\uC784\uD56D\uBAA9") && !trimmed.includes("\uACF5\uC885")) laborItemIdx = idx;
        if (trimmed.includes("\uAE30\uC900\uC791\uC5C5\uB7C9") && !trimmed.includes("\uC77C\uC704\uB300\uAC00") && !trimmed.includes("\uB178\uC784\uB2E8\uAC00")) {
          standardWorkQuantityIdx = idx;
        }
        if (trimmed.includes("\uB178\uC784\uB2E8\uAC00") && !trimmed.includes("\uC77C\uC704\uB300\uAC00")) {
          laborUnitPriceIdx = idx;
        }
        if (trimmed.includes("\uC77C\uC704\uB300\uAC00")) {
          ilwidaegaIdx = idx;
        }
      });
      console.log("\uC77C\uC704\uB300\uAC00 headers:", headers);
      console.log("\uC77C\uC704\uB300\uAC00 column indices:", {
        categoryIdx,
        workNameIdx,
        laborItemIdx,
        standardWorkQuantityIdx,
        laborUnitPriceIdx,
        ilwidaegaIdx
      });
      let prevCategory = null;
      let prevWorkName = null;
      for (let i = 0; i < excelData2.data.length; i++) {
        const row = excelData2.data[i];
        if (!row || row.length === 0) continue;
        const category = safeString(row[categoryIdx]) || prevCategory || "";
        const workName = safeString(row[workNameIdx]) || prevWorkName || "";
        const laborItem = safeString(row[laborItemIdx]);
        const D = standardWorkQuantityIdx >= 0 ? parsePrice(row[standardWorkQuantityIdx]) : null;
        const E = laborUnitPriceIdx >= 0 ? parsePrice(row[laborUnitPriceIdx]) : null;
        const ilwidaega = ilwidaegaIdx >= 0 ? parsePrice(row[ilwidaegaIdx]) : null;
        if (safeString(row[categoryIdx])) prevCategory = category;
        if (safeString(row[workNameIdx])) prevWorkName = workName;
        if (!category || !laborItem) continue;
        if (category === "\uACF5\uC885" || laborItem === "\uB178\uC784\uD56D\uBAA9" || laborItem.includes("\uB178\uC784\uD56D\uBAA9")) continue;
        catalog.push({
          \uACF5\uC885: category,
          \uACF5\uC0AC\uBA85: workName,
          \uB178\uC784\uD56D\uBAA9: laborItem,
          \uAE30\uC900\uC791\uC5C5\uB7C9: D,
          // D
          \uB178\uC784\uB2E8\uAC00: E,
          // E (노임단가(인당))
          \uC77C\uC704\uB300\uAC00: ilwidaega
          // 참고용 (E/D)
        });
      }
      const seen = /* @__PURE__ */ new Set();
      const uniqueCatalog = catalog.filter((item) => {
        const key = `${item.\uACF5\uC885}|${item.\uACF5\uC0AC\uBA85}|${item.\uB178\uC784\uD56D\uBAA9}`;
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });
      console.log("Parsed \uC77C\uC704\uB300\uAC00 catalog items:", catalog.length, "\u2192 \uC911\uBCF5 \uC81C\uAC70 \uD6C4:", uniqueCatalog.length);
      res.json(uniqueCatalog);
    } catch (error) {
      console.error("Get \uC77C\uC704\uB300\uAC00 catalog error:", error);
      res.status(500).json({ error: "\uC77C\uC704\uB300\uAC00 \uCE74\uD0C8\uB85C\uADF8\uB97C \uC870\uD68C\uD558\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.get("/api/unit-price-overrides", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    try {
      const overrides = await storage.getAllUnitPriceOverrides();
      res.json(overrides);
    } catch (error) {
      console.error("Get unit price overrides error:", error);
      res.status(500).json({ error: "\uAE30\uC900\uC791\uC5C5\uB7C9 \uB370\uC774\uD130\uB97C \uC870\uD68C\uD558\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.post("/api/unit-price-overrides", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    const userRole = req.session.userRole;
    if (userRole !== "\uAD00\uB9AC\uC790") {
      return res.status(403).json({ error: "\uAD00\uB9AC\uC790\uB9CC \uAE30\uC900\uC791\uC5C5\uB7C9\uC744 \uC218\uC815\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4" });
    }
    try {
      const { category, workName, laborItem, standardWorkQuantity } = req.body;
      if (!category || !laborItem || standardWorkQuantity === void 0) {
        return res.status(400).json({ error: "\uD544\uC218 \uD544\uB4DC\uAC00 \uB204\uB77D\uB418\uC5C8\uC2B5\uB2C8\uB2E4" });
      }
      const parsedValue = Number(standardWorkQuantity);
      if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
        return res.status(400).json({ error: "\uAE30\uC900\uC791\uC5C5\uB7C9\uC740 0\uBCF4\uB2E4 \uD070 \uC22B\uC790\uC5EC\uC57C \uD569\uB2C8\uB2E4" });
      }
      const result = await storage.upsertUnitPriceOverride({
        category,
        workName: workName || "",
        laborItem,
        standardWorkQuantity: parsedValue
      });
      res.json(result);
    } catch (error) {
      console.error("Update unit price override error:", error);
      res.status(500).json({ error: "\uAE30\uC900\uC791\uC5C5\uB7C9 \uC800\uC7A5 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.post("/api/unit-price-overrides/bulk", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    const userRole = req.session.userRole;
    if (userRole !== "\uAD00\uB9AC\uC790") {
      return res.status(403).json({ error: "\uAD00\uB9AC\uC790\uB9CC \uAE30\uC900\uC791\uC5C5\uB7C9\uC744 \uC218\uC815\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4" });
    }
    try {
      const { items } = req.body;
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "\uC5C5\uB370\uC774\uD2B8\uD560 \uD56D\uBAA9\uC774 \uC5C6\uC2B5\uB2C8\uB2E4" });
      }
      const validationErrors = [];
      const validatedItems = items.map((item, index) => {
        const parsedValue = Number(item.standardWorkQuantity);
        if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
          validationErrors.push(`[${index + 1}] ${item.category || "(\uC5C6\uC74C)"} - ${item.laborItem || "(\uC5C6\uC74C)"}: \uAE30\uC900\uC791\uC5C5\uB7C9\uC740 0\uBCF4\uB2E4 \uD070 \uC22B\uC790\uC5EC\uC57C \uD569\uB2C8\uB2E4`);
          return null;
        }
        return {
          category: item.category,
          workName: item.workName || "",
          laborItem: item.laborItem,
          standardWorkQuantity: parsedValue
        };
      }).filter((item) => item !== null);
      if (validationErrors.length > 0) {
        return res.status(400).json({
          error: "\uC77C\uBD80 \uD56D\uBAA9\uC758 \uAE30\uC900\uC791\uC5C5\uB7C9\uC774 \uC720\uD6A8\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4",
          details: validationErrors
        });
      }
      const results = await storage.bulkUpsertUnitPriceOverrides(validatedItems);
      res.json({ success: true, count: results.length });
    } catch (error) {
      console.error("Bulk update unit price overrides error:", error);
      res.status(500).json({ error: "\uAE30\uC900\uC791\uC5C5\uB7C9 \uC77C\uAD04 \uC800\uC7A5 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.get("/api/materials-by-workname", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    try {
      const excelDataList = await storage.listExcelData("\uC790\uC7AC\uBE44");
      if (!excelDataList || excelDataList.length === 0) {
        return res.json([]);
      }
      const excelData2 = excelDataList[0];
      console.log("[\uC790\uC7AC\uBE44 API] Excel \uB370\uC774\uD130:", {
        id: excelData2.id,
        title: excelData2.title,
        headerType: typeof excelData2.headers,
        headersRaw: JSON.stringify(excelData2.headers),
        dataRows: excelData2.data?.length || 0
      });
      if (!excelData2.data || !Array.isArray(excelData2.data)) {
        return res.json([]);
      }
      const safeString = (val) => {
        if (val === null || val === void 0) return "";
        return String(val).trim();
      };
      const parsePrice = (val) => {
        if (val === null || val === void 0 || val === "") return null;
        if (typeof val === "string" && val.trim() === "\uC785\uB825") return "\uC785\uB825";
        if (typeof val === "number") return val;
        const cleaned = String(val).replace(/,/g, "").trim();
        const num = parseFloat(cleaned);
        return isNaN(num) ? null : num;
      };
      const catalog = [];
      const headers = excelData2.headers || [];
      console.log("[\uC790\uC7AC\uBE44 API] \uD5E4\uB354:", headers);
      let categoryIdx = 0, workNameIdx = 1, materialItemIdx = 2, unitIdx = 3, priceIdx = 4;
      headers.forEach((h, idx) => {
        if (!h) return;
        if (h.includes("\uC790\uC7AC\uD56D\uBAA9") || h.includes("\uC790\uC7AC\uBA85")) materialItemIdx = idx;
      });
      headers.forEach((h, idx) => {
        if (!h) return;
        if (h.trim() === "\uACF5\uC885" || h.includes("\uACF5\uC885\uBA85")) categoryIdx = idx;
        if ((h.includes("\uACF5\uC0AC\uBA85") || h.includes("\uD488\uBA85")) && idx !== materialItemIdx && !h.includes("\uC790\uC7AC")) {
          workNameIdx = idx;
        }
        if (h.includes("\uB2E8\uC704")) unitIdx = idx;
        if (h.includes("\uAE08\uC561") || h.includes("\uB2E8\uAC00")) priceIdx = idx;
      });
      console.log("[\uC790\uC7AC\uBE44 API] \uC778\uB371\uC2A4:", { categoryIdx, workNameIdx, materialItemIdx, unitIdx, priceIdx });
      let prevCategory = null;
      let prevWorkName = null;
      for (let i = 0; i < excelData2.data.length; i++) {
        const row = excelData2.data[i];
        if (!row || row.length === 0) continue;
        const category = safeString(row[categoryIdx]) || prevCategory || "";
        const workName = safeString(row[workNameIdx]) || prevWorkName || "";
        const materialItem = safeString(row[materialItemIdx]);
        const unit = safeString(row[unitIdx]);
        const price = parsePrice(row[priceIdx]);
        if (safeString(row[categoryIdx])) prevCategory = category;
        if (safeString(row[workNameIdx])) prevWorkName = workName;
        if (!category || !workName || !materialItem) continue;
        catalog.push({
          \uACF5\uC885: category,
          \uACF5\uC0AC\uBA85: workName,
          \uC790\uC7AC\uD56D\uBAA9: materialItem,
          \uB2E8\uC704: unit,
          \uAE08\uC561: price
        });
      }
      console.log("Parsed \uC790\uC7AC\uBE44 catalog items:", catalog.length);
      res.json(catalog);
    } catch (error) {
      console.error("Get \uC790\uC7AC\uBE44 catalog error:", error);
      res.status(500).json({ error: "\uC790\uC7AC\uBE44 \uCE74\uD0C8\uB85C\uADF8\uB97C \uC870\uD68C\uD558\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.get("/api/materials", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    try {
      const catalog = await storage.getMaterialsCatalog();
      res.json(catalog);
    } catch (error) {
      console.error("Get materials catalog error:", error);
      res.status(500).json({ error: "\uC790\uC7AC\uBE44 \uCE74\uD0C8\uB85C\uADF8\uB97C \uC870\uD68C\uD558\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.post("/api/materials", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    const userRole = req.session.userRole;
    if (userRole !== "\uAD00\uB9AC\uC790") {
      return res.status(403).json({ error: "\uAD00\uB9AC\uC790\uB9CC \uC790\uC7AC\uB97C \uCD94\uAC00\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4" });
    }
    try {
      const validated = insertMaterialSchema.parse(req.body);
      const created = await storage.createMaterial(validated);
      res.json(created);
    } catch (error) {
      console.error("Create material error:", error);
      if (error instanceof z2.ZodError) {
        return res.status(400).json({
          error: "\uC785\uB825 \uB370\uC774\uD130 \uD615\uC2DD\uC774 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4",
          details: error.errors
        });
      }
      res.status(500).json({ error: "\uC790\uC7AC\uB97C \uCD94\uAC00\uD558\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.delete("/api/materials/:id", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    const userRole = req.session.userRole;
    if (userRole !== "\uAD00\uB9AC\uC790") {
      return res.status(403).json({ error: "\uAD00\uB9AC\uC790\uB9CC \uC790\uC7AC\uB97C \uC0AD\uC81C\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4" });
    }
    try {
      const { id } = req.params;
      await storage.deleteMaterial(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete material error:", error);
      res.status(500).json({ error: "\uC790\uC7AC\uB97C \uC0AD\uC81C\uD558\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.post("/api/labor-costs", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    const userRole = req.session.userRole;
    if (userRole !== "\uAD00\uB9AC\uC790") {
      return res.status(403).json({ error: "\uAD00\uB9AC\uC790\uB9CC \uB178\uBB34\uBE44\uB97C \uCD94\uAC00\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4" });
    }
    try {
      const validated = insertLaborCostSchema.parse(req.body);
      const created = await storage.createLaborCost(validated);
      res.json(created);
    } catch (error) {
      console.error("Create labor cost error:", error);
      if (error instanceof z2.ZodError) {
        return res.status(400).json({
          error: "\uC785\uB825 \uB370\uC774\uD130 \uD615\uC2DD\uC774 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4",
          details: error.errors
        });
      }
      res.status(500).json({ error: "\uB178\uBB34\uBE44\uB97C \uCD94\uAC00\uD558\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.delete("/api/labor-costs/:id", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    const userRole = req.session.userRole;
    if (userRole !== "\uAD00\uB9AC\uC790") {
      return res.status(403).json({ error: "\uAD00\uB9AC\uC790\uB9CC \uB178\uBB34\uBE44\uB97C \uC0AD\uC81C\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4" });
    }
    try {
      const { id } = req.params;
      await storage.deleteLaborCost(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete labor cost error:", error);
      res.status(500).json({ error: "\uB178\uBB34\uBE44\uB97C \uC0AD\uC81C\uD558\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.get("/api/field-surveys/:caseId/report", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    try {
      const { caseId } = req.params;
      if (!caseId || caseId === "null" || caseId === "undefined") {
        console.error("Invalid caseId for field survey report:", caseId);
        return res.status(400).json({ error: "\uC720\uD6A8\uD558\uC9C0 \uC54A\uC740 \uCF00\uC774\uC2A4 ID\uC785\uB2C8\uB2E4" });
      }
      const caseData = await storage.getCaseById(caseId);
      if (!caseData) {
        return res.status(404).json({ error: "\uCF00\uC774\uC2A4\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
      }
      const drawing = await storage.getDrawingByCaseId(caseId);
      const documents = await storage.getDocumentsByCaseId(caseId);
      const estimateData = await storage.getLatestEstimate(caseId);
      const isLossPreventionCase = /-0$/.test(caseData.caseNumber || "");
      const hasRecoveryRows = !!(estimateData?.rows && estimateData.rows.length > 0);
      let hasLaborCosts = false;
      let hasMaterialCosts = false;
      if (estimateData?.estimate?.laborCostData) {
        try {
          const data = typeof estimateData.estimate.laborCostData === "string" ? JSON.parse(estimateData.estimate.laborCostData) : estimateData.estimate.laborCostData;
          hasLaborCosts = Array.isArray(data) && data.length > 0;
        } catch {
          hasLaborCosts = false;
        }
      }
      if (estimateData?.estimate?.materialCostData) {
        try {
          const data = typeof estimateData.estimate.materialCostData === "string" ? JSON.parse(estimateData.estimate.materialCostData) : estimateData.estimate.materialCostData;
          hasMaterialCosts = Array.isArray(data) && data.length > 0;
        } catch {
          hasMaterialCosts = false;
        }
      }
      const hasResidentRegistration = documents.some(
        (doc) => doc.category === "\uC8FC\uBBFC\uB4F1\uB85D\uB4F1\uBCF8"
      );
      const completionStatus = {
        fieldSurvey: !!(caseData.visitDate && caseData.visitTime && caseData.accidentCategory),
        drawing: !!drawing,
        documents: isLossPreventionCase ? hasResidentRegistration : documents.length > 0,
        // 손해방지 케이스: 노무비 또는 자재비만 있으면 완료
        // 피해복구 케이스: 복구면적 산출표 필수
        estimate: isLossPreventionCase ? hasLaborCosts || hasMaterialCosts : hasRecoveryRows,
        isComplete: false
      };
      completionStatus.isComplete = completionStatus.fieldSurvey && completionStatus.drawing && completionStatus.documents && completionStatus.estimate;
      console.log(`[Report completionStatus] Case: ${caseData.caseNumber}`, {
        isLossPreventionCase,
        fieldSurvey: completionStatus.fieldSurvey,
        drawing: completionStatus.drawing,
        documents: completionStatus.documents,
        estimate: completionStatus.estimate,
        isComplete: completionStatus.isComplete,
        details: {
          visitDate: caseData.visitDate,
          visitTime: caseData.visitTime,
          accidentCategory: caseData.accidentCategory,
          hasDrawing: !!drawing,
          docCount: documents.length,
          hasResidentRegistration,
          hasLaborCosts,
          hasMaterialCosts,
          hasRecoveryRows
        }
      });
      res.json({
        case: caseData,
        drawing: drawing || null,
        documents: documents || [],
        estimate: estimateData || { estimate: null, rows: [] },
        completionStatus
      });
    } catch (error) {
      console.error("Get field survey report error:", error);
      res.status(500).json({ error: "\uD604\uC7A5\uC870\uC0AC \uBCF4\uACE0\uC11C\uB97C \uC870\uD68C\uD558\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.get("/api/dashboard/stats", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    try {
      const currentUser = await storage.getUser(req.session.userId);
      if (!currentUser) {
        return res.status(404).json({ error: "\uC0AC\uC6A9\uC790\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
      }
      const filteredCases = await storage.getAllCases(currentUser);
      const parseAccidentDate = (dateStr) => {
        if (!dateStr) return null;
        try {
          return new Date(dateStr);
        } catch {
          return null;
        }
      };
      const now = /* @__PURE__ */ new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const lastYear = currentMonth === 1 ? currentYear - 1 : currentYear;
      const currentMonthCases = filteredCases.filter((c) => {
        const accidentDate = parseAccidentDate(c.accidentDate);
        if (!accidentDate) return false;
        return accidentDate.getFullYear() === currentYear && accidentDate.getMonth() + 1 === currentMonth;
      });
      const lastMonthCases = filteredCases.filter((c) => {
        const accidentDate = parseAccidentDate(c.accidentDate);
        if (!accidentDate) return false;
        return accidentDate.getFullYear() === lastYear && accidentDate.getMonth() + 1 === lastMonth;
      });
      const claimStatuses = ["\uCCAD\uAD6C", "\uC785\uAE08\uC644\uB8CC", "\uBD80\uBD84\uC785\uAE08", "\uC815\uC0B0\uC644\uB8CC", "\uC811\uC218\uCDE8\uC18C"];
      const receivedCases = filteredCases.filter((c) => c.status !== "\uC811\uC218\uCDE8\uC18C").length;
      const lastMonthReceivedCases = lastMonthCases.filter((c) => c.status !== "\uC811\uC218\uCDE8\uC18C").length;
      const pendingCases = filteredCases.filter((c) => !claimStatuses.includes(c.status)).length;
      const lastMonthPendingCases = lastMonthCases.filter((c) => !claimStatuses.includes(c.status)).length;
      const receivedCasesChangeCount = receivedCases - lastMonthReceivedCases;
      const receivedCasesChange = lastMonthReceivedCases > 0 ? receivedCasesChangeCount / lastMonthReceivedCases * 100 : 0;
      const pendingCasesChangeCount = pendingCases - lastMonthPendingCases;
      const pendingCasesChange = lastMonthPendingCases > 0 ? pendingCasesChangeCount / lastMonthPendingCases * 100 : 0;
      const calculateEstimateTotal = (laborCostData, materialCostData) => {
        let laborTotalWithExpense = 0;
        let laborTotalWithoutExpense = 0;
        let materialTotal = 0;
        if (Array.isArray(laborCostData)) {
          laborCostData.forEach((row) => {
            const amount = row.amount || 0;
            if (row.includeInEstimate) {
              laborTotalWithExpense += amount;
            } else {
              laborTotalWithoutExpense += amount;
            }
          });
        }
        if (Array.isArray(materialCostData)) {
          materialCostData.forEach((row) => {
            materialTotal += row.\uAE08\uC561 || 0;
          });
        }
        const subtotal = laborTotalWithExpense + laborTotalWithoutExpense + materialTotal;
        const baseForFees = laborTotalWithoutExpense + materialTotal;
        const managementFee = Math.round(baseForFees * 0.06);
        const profit = Math.round(baseForFees * 0.15);
        const vatBase = subtotal + managementFee + profit;
        const vat = Math.round(vatBase * 0.1);
        const total = vatBase + vat;
        return total;
      };
      const caseIds = filteredCases.map((c) => c.id);
      const allEstimates = caseIds.length > 0 ? await db.select().from(estimates).where(inArray2(estimates.caseId, caseIds)) : [];
      const latestEstimatesByCaseId = /* @__PURE__ */ new Map();
      allEstimates.forEach((est) => {
        const existing = latestEstimatesByCaseId.get(est.caseId);
        if (!existing || est.version > existing.version) {
          latestEstimatesByCaseId.set(est.caseId, est);
        }
      });
      const insuranceUnsettledCases = filteredCases.filter((c) => c.status === "\uCCAD\uAD6C");
      const insuranceUnsettledAmount = insuranceUnsettledCases.reduce((sum, c) => {
        const estimate = latestEstimatesByCaseId.get(c.id);
        if (estimate) {
          const total = calculateEstimateTotal(estimate.laborCostData, estimate.materialCostData);
          return sum + total;
        }
        return sum;
      }, 0);
      const partnerUnsettledCases = filteredCases.filter(
        (c) => c.status === "\uC785\uAE08\uC644\uB8CC" || c.status === "\uBD80\uBD84\uC785\uAE08"
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
        receivedCasesChange: Math.round(receivedCasesChange * 10) / 10,
        // 소수점 1자리
        receivedCasesChangeCount,
        // 미결건: status가 "제출", "검토중", "1차승인"인 케이스
        pendingCases,
        lastMonthPendingCases,
        pendingCasesChange: Math.round(pendingCasesChange * 10) / 10,
        // 소수점 1자리
        pendingCasesChangeCount,
        // 보험사 미정산: "청구" 상태인 케이스들의 견적 금액 합계
        insuranceUnsettledCases: insuranceUnsettledCases.length,
        insuranceUnsettledAmount: Math.round(insuranceUnsettledAmount),
        // 협력사 미정산: "완료" 또는 "청구" 상태인 케이스들의 견적 금액 합계
        partnerUnsettledCases: partnerUnsettledCases.length,
        partnerUnsettledAmount: Math.round(partnerUnsettledAmount)
      };
      res.json(stats);
    } catch (error) {
      console.error("Get dashboard stats error:", error);
      res.status(500).json({ error: "\uD1B5\uACC4\uB97C \uC870\uD68C\uD558\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.get("/api/statistics/avg-repair-cost-by-category", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    try {
      const startDateParam = req.query.startDate;
      const endDateParam = req.query.endDate;
      const damagePreventionTypes = ["\uB204\uC218\uD0D0\uC9C0\uBE44\uC6A9", "\uBC30\uAD00\uACF5\uC0AC", "\uBC29\uC218\uACF5\uC0AC", "\uCF54\uD0B9\uACF5\uC0AC", "\uCCA0\uAC70\uACF5\uC0AC", "\uC6D0\uC778\uCCA0\uAC70\uACF5\uC0AC"];
      const propertyRepairTypes = ["\uAC00\uC124\uACF5\uC0AC", "\uBAA9\uACF5\uC0AC", "\uC218\uC7A5\uACF5\uC0AC", "\uB3C4\uC7A5\uACF5\uC0AC", "\uC695\uC2E4\uACF5\uC0AC", "\uD0C0\uC77C\uACF5\uC0AC", "\uAC00\uAD6C\uACF5\uC0AC", "\uC804\uAE30\uACF5\uC0AC", "\uD53C\uD574\uCCA0\uAC70\uACF5\uC0AC", "\uAE30\uD0C0\uACF5\uC0AC"];
      let caseFilter = sql4`1=1`;
      if (startDateParam && endDateParam) {
        caseFilter = sql4`${cases.createdAt} >= ${startDateParam} AND ${cases.createdAt} <= ${endDateParam}`;
      }
      const completedCases = await db.select().from(cases).where(sql4`(${cases.status} IN ('정산완료', '입금완료', '부분입금')) AND (${cases.recoveryType} = '직접복구' OR ${cases.status} = '직접복구')`);
      if (!completedCases.length) {
        return res.json({
          \uC190\uD574\uC815\uC9C0\uBE44\uC6A9: { \uB204\uC218\uD0D0\uC9C0\uBE44: 0, \uBC30\uAD00\uACF5\uC0AC: 0, \uBC29\uC218\uACF5\uC0AC: 0, \uCF54\uD0B9\uACF5\uC0AC: 0, \uCCA0\uAC70\uACF5\uC0AC: 0, \uACC4: 0 },
          \uB300\uBB3C\uC218\uB9AC\uBE44\uC6A9: { \uAC00\uC124\uACF5\uC0AC: 0, \uBAA9\uACF5\uC0AC: 0, \uC218\uC7A5\uACF5\uC0AC: 0, \uB3C4\uC7A5\uACF5\uC0AC: 0, \uC695\uC2E4\uACF5\uC0AC: 0, \uAC00\uAD6C\uACF5\uC0AC: 0, \uC804\uAE30\uACF5\uC0AC: 0, \uCCA0\uAC70\uACF5\uC0AC: 0, \uAE30\uD0C0\uACF5\uC0AC: 0, \uACC4: 0 },
          \uCD1D\uACC4: 0,
          \uAC74\uC218: 0
        });
      }
      const caseIds = completedCases.map((c) => c.id);
      const allEstimates = await db.select().from(estimates).where(inArray2(estimates.caseId, caseIds));
      const latestEstimatesByCaseId = /* @__PURE__ */ new Map();
      allEstimates.forEach((est) => {
        const existing = latestEstimatesByCaseId.get(est.caseId);
        if (!existing || est.version > existing.version) {
          latestEstimatesByCaseId.set(est.caseId, est);
        }
      });
      const damagePreventionTotals = {
        \uB204\uC218\uD0D0\uC9C0\uBE44: 0,
        \uBC30\uAD00\uACF5\uC0AC: 0,
        \uBC29\uC218\uACF5\uC0AC: 0,
        \uCF54\uD0B9\uACF5\uC0AC: 0,
        \uCCA0\uAC70\uACF5\uC0AC: 0
      };
      const propertyRepairTotals = {
        \uAC00\uC124\uACF5\uC0AC: 0,
        \uBAA9\uACF5\uC0AC: 0,
        \uC218\uC7A5\uACF5\uC0AC: 0,
        \uB3C4\uC7A5\uACF5\uC0AC: 0,
        \uC695\uC2E4\uACF5\uC0AC: 0,
        \uAC00\uAD6C\uACF5\uC0AC: 0,
        \uC804\uAE30\uACF5\uC0AC: 0,
        \uCCA0\uAC70\uACF5\uC0AC: 0,
        \uAE30\uD0C0\uACF5\uC0AC: 0
      };
      let validCaseCount = 0;
      latestEstimatesByCaseId.forEach((estimate) => {
        if (!estimate.laborCostData || !Array.isArray(estimate.laborCostData)) return;
        validCaseCount++;
        estimate.laborCostData.forEach((row) => {
          const category = row.category || "";
          const amount = row.amount || 0;
          if (category === "\uB204\uC218\uD0D0\uC9C0\uBE44\uC6A9") {
            damagePreventionTotals["\uB204\uC218\uD0D0\uC9C0\uBE44"] += amount;
          } else if (category === "\uBC30\uAD00\uACF5\uC0AC") {
            damagePreventionTotals["\uBC30\uAD00\uACF5\uC0AC"] += amount;
          } else if (category === "\uBC29\uC218\uACF5\uC0AC") {
            damagePreventionTotals["\uBC29\uC218\uACF5\uC0AC"] += amount;
          } else if (category === "\uCF54\uD0B9\uACF5\uC0AC") {
            damagePreventionTotals["\uCF54\uD0B9\uACF5\uC0AC"] += amount;
          } else if (category === "\uC6D0\uC778\uCCA0\uAC70\uACF5\uC0AC" || category.includes("\uCCA0\uAC70") && damagePreventionTypes.some((t) => t.includes(category))) {
            damagePreventionTotals["\uCCA0\uAC70\uACF5\uC0AC"] += amount;
          }
          if (category === "\uAC00\uC124\uACF5\uC0AC") {
            propertyRepairTotals["\uAC00\uC124\uACF5\uC0AC"] += amount;
          } else if (category === "\uBAA9\uACF5\uC0AC") {
            propertyRepairTotals["\uBAA9\uACF5\uC0AC"] += amount;
          } else if (category === "\uC218\uC7A5\uACF5\uC0AC") {
            propertyRepairTotals["\uC218\uC7A5\uACF5\uC0AC"] += amount;
          } else if (category === "\uB3C4\uC7A5\uACF5\uC0AC") {
            propertyRepairTotals["\uB3C4\uC7A5\uACF5\uC0AC"] += amount;
          } else if (category === "\uC695\uC2E4\uACF5\uC0AC" || category === "\uD0C0\uC77C\uACF5\uC0AC") {
            propertyRepairTotals["\uC695\uC2E4\uACF5\uC0AC"] += amount;
          } else if (category === "\uAC00\uAD6C\uACF5\uC0AC") {
            propertyRepairTotals["\uAC00\uAD6C\uACF5\uC0AC"] += amount;
          } else if (category === "\uC804\uAE30\uACF5\uC0AC") {
            propertyRepairTotals["\uC804\uAE30\uACF5\uC0AC"] += amount;
          } else if (category === "\uD53C\uD574\uCCA0\uAC70\uACF5\uC0AC") {
            propertyRepairTotals["\uCCA0\uAC70\uACF5\uC0AC"] += amount;
          } else if (category === "\uAE30\uD0C0\uACF5\uC0AC" && !damagePreventionTypes.includes(category)) {
            propertyRepairTotals["\uAE30\uD0C0\uACF5\uC0AC"] += amount;
          }
        });
      });
      const avgDivisor = validCaseCount || 1;
      const avgDamagePrevention = {};
      Object.keys(damagePreventionTotals).forEach((key) => {
        avgDamagePrevention[key] = Math.round(damagePreventionTotals[key] / avgDivisor);
      });
      avgDamagePrevention["\uACC4"] = Object.values(avgDamagePrevention).reduce((a, b) => a + b, 0);
      const avgPropertyRepair = {};
      Object.keys(propertyRepairTotals).forEach((key) => {
        avgPropertyRepair[key] = Math.round(propertyRepairTotals[key] / avgDivisor);
      });
      avgPropertyRepair["\uACC4"] = Object.values(avgPropertyRepair).reduce((a, b) => a + b, 0);
      res.json({
        \uC190\uD574\uC815\uC9C0\uBE44\uC6A9: avgDamagePrevention,
        \uB300\uBB3C\uC218\uB9AC\uBE44\uC6A9: avgPropertyRepair,
        \uCD1D\uACC4: avgDamagePrevention["\uACC4"] + avgPropertyRepair["\uACC4"],
        \uAC74\uC218: validCaseCount
      });
    } catch (error) {
      console.error("Get avg repair cost by category error:", error);
      res.status(500).json({ error: "\uD3C9\uADE0 \uC218\uB9AC\uBE44 \uD56D\uBAA9\uBCC4 \uD1B5\uACC4\uB97C \uC870\uD68C\uD558\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.post("/api/invoice/send", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    try {
      const { caseId, relatedCaseIds, damagePreventionAmount, propertyRepairAmount, remarks } = req.body;
      if (!caseId) {
        return res.status(400).json({ error: "\uCF00\uC774\uC2A4 ID\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4" });
      }
      const parsedDamagePreventionAmount = parseInt(damagePreventionAmount) || 0;
      const parsedPropertyRepairAmount = parseInt(propertyRepairAmount) || 0;
      const caseData = await storage.getCaseById(caseId);
      if (!caseData) {
        return res.status(404).json({ error: "\uCF00\uC774\uC2A4\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
      }
      const caseIdsToUpdate = relatedCaseIds && relatedCaseIds.length > 0 ? relatedCaseIds : [caseId];
      for (const id of caseIdsToUpdate) {
        await storage.updateCase(id, {
          status: "\uCCAD\uAD6C",
          invoiceDamagePreventionAmount: parsedDamagePreventionAmount.toString(),
          invoicePropertyRepairAmount: parsedPropertyRepairAmount.toString(),
          invoiceRemarks: remarks || null
        });
        await storage.createProgressUpdate({
          caseId: id,
          content: `\uC778\uBCF4\uC774\uC2A4 \uBC1C\uC1A1 \uC644\uB8CC - \uCCAD\uAD6C \uC0C1\uD0DC\uB85C \uBCC0\uACBD (\uC190\uD574\uBC29\uC9C0\uBE44\uC6A9: ${parsedDamagePreventionAmount.toLocaleString()}\uC6D0, \uB300\uBB3C\uBCF5\uAD6C\uBE44\uC6A9: ${parsedPropertyRepairAmount.toLocaleString()}\uC6D0${remarks ? `, \uBE44\uACE0: ${remarks}` : ""})`,
          createdBy: req.session.userId
        });
      }
      res.json({
        success: true,
        message: "\uC778\uBCF4\uC774\uC2A4\uAC00 \uBC1C\uC1A1\uB418\uC5C8\uC2B5\uB2C8\uB2E4.",
        updatedCases: caseIdsToUpdate.length
      });
    } catch (error) {
      console.error("Invoice send error:", error);
      res.status(500).json({ error: "\uC778\uBCF4\uC774\uC2A4 \uBC1C\uC1A1 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.post("/api/field-dispatch-invoice/send", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    try {
      const { caseId, relatedCaseIds, fieldDispatchAmount, remarks } = req.body;
      if (!caseId) {
        return res.status(400).json({ error: "\uCF00\uC774\uC2A4 ID\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4" });
      }
      const parsedFieldDispatchAmount = parseInt(fieldDispatchAmount) || 0;
      const caseData = await storage.getCaseById(caseId);
      if (!caseData) {
        return res.status(404).json({ error: "\uCF00\uC774\uC2A4\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
      }
      const caseIdsToUpdate = relatedCaseIds && relatedCaseIds.length > 0 ? relatedCaseIds : [caseId];
      for (const id of caseIdsToUpdate) {
        await storage.updateCase(id, {
          status: "\uCCAD\uAD6C",
          fieldDispatchInvoiceAmount: parsedFieldDispatchAmount.toString(),
          fieldDispatchInvoiceRemarks: remarks || null
        });
        await storage.createProgressUpdate({
          caseId: id,
          content: `\uD604\uC7A5\uCD9C\uB3D9\uBE44\uC6A9 \uCCAD\uAD6C\uC11C \uBC1C\uC1A1 \uC644\uB8CC - \uCCAD\uAD6C \uC0C1\uD0DC\uB85C \uBCC0\uACBD (\uD604\uC7A5\uCD9C\uB3D9\uBE44\uC6A9: ${parsedFieldDispatchAmount.toLocaleString()}\uC6D0${remarks ? `, \uBE44\uACE0: ${remarks}` : ""})`,
          createdBy: req.session.userId
        });
      }
      res.json({
        success: true,
        message: "\uD604\uC7A5\uCD9C\uB3D9\uBE44\uC6A9 \uCCAD\uAD6C\uC11C\uAC00 \uBC1C\uC1A1\uB418\uC5C8\uC2B5\uB2C8\uB2E4.",
        updatedCases: caseIdsToUpdate.length,
        savedAmount: parsedFieldDispatchAmount
      });
    } catch (error) {
      console.error("Field dispatch invoice send error:", error);
      res.status(500).json({ error: "\uD604\uC7A5\uCD9C\uB3D9\uBE44\uC6A9 \uCCAD\uAD6C\uC11C \uBC1C\uC1A1 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.get("/api/favorites", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    try {
      const favorites = await storage.getUserFavorites(req.session.userId);
      res.json(favorites);
    } catch (error) {
      console.error("Get favorites error:", error);
      res.status(500).json({ error: "\uC990\uACA8\uCC3E\uAE30\uB97C \uC870\uD68C\uD558\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.post("/api/favorites", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    try {
      const { menuName } = req.body;
      if (!menuName) {
        return res.status(400).json({ error: "\uBA54\uB274 \uC774\uB984\uC774 \uD544\uC694\uD569\uB2C8\uB2E4" });
      }
      const favorite = await storage.addFavorite({
        userId: req.session.userId,
        menuName
      });
      res.json(favorite);
    } catch (error) {
      console.error("Add favorite error:", error);
      if (error instanceof Error && error.message.includes("unique")) {
        return res.status(409).json({ error: "\uC774\uBBF8 \uC990\uACA8\uCC3E\uAE30\uC5D0 \uCD94\uAC00\uB41C \uBA54\uB274\uC785\uB2C8\uB2E4" });
      }
      res.status(500).json({ error: "\uC990\uACA8\uCC3E\uAE30\uB97C \uCD94\uAC00\uD558\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.delete("/api/favorites/:menuName", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    try {
      const { menuName } = req.params;
      await storage.removeFavorite(req.session.userId, menuName);
      res.json({ success: true });
    } catch (error) {
      console.error("Remove favorite error:", error);
      res.status(500).json({ error: "\uC990\uACA8\uCC3E\uAE30\uB97C \uC0AD\uC81C\uD558\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.get("/api/notices", async (req, res) => {
    try {
      const allNotices = await storage.getAllNotices();
      res.json(allNotices);
    } catch (error) {
      console.error("Get notices error:", error);
      res.status(500).json({ error: "\uACF5\uC9C0\uC0AC\uD56D\uC744 \uC870\uD68C\uD558\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.post("/api/notices", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user || user.role !== "\uAD00\uB9AC\uC790") {
      return res.status(403).json({ error: "\uAD00\uB9AC\uC790\uB9CC \uACF5\uC9C0\uC0AC\uD56D\uC744 \uC791\uC131\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4" });
    }
    try {
      const { title, content } = req.body;
      if (!title || !content) {
        return res.status(400).json({ error: "\uC81C\uBAA9\uACFC \uB0B4\uC6A9\uC744 \uC785\uB825\uD574\uC8FC\uC138\uC694" });
      }
      const notice = await storage.createNotice({
        title,
        content,
        authorId: req.session.userId
      });
      res.json(notice);
    } catch (error) {
      console.error("Create notice error:", error);
      res.status(500).json({ error: "\uACF5\uC9C0\uC0AC\uD56D\uC744 \uB4F1\uB85D\uD558\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.patch("/api/notices/:id", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user || user.role !== "\uAD00\uB9AC\uC790") {
      return res.status(403).json({ error: "\uAD00\uB9AC\uC790\uB9CC \uACF5\uC9C0\uC0AC\uD56D\uC744 \uC218\uC815\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4" });
    }
    try {
      const { id } = req.params;
      const { title, content } = req.body;
      if (!title || !content) {
        return res.status(400).json({ error: "\uC81C\uBAA9\uACFC \uB0B4\uC6A9\uC744 \uC785\uB825\uD574\uC8FC\uC138\uC694" });
      }
      const updated = await storage.updateNotice(id, { title, content });
      if (!updated) {
        return res.status(404).json({ error: "\uACF5\uC9C0\uC0AC\uD56D\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Update notice error:", error);
      res.status(500).json({ error: "\uACF5\uC9C0\uC0AC\uD56D\uC744 \uC218\uC815\uD558\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.delete("/api/notices/:id", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user || user.role !== "\uAD00\uB9AC\uC790") {
      return res.status(403).json({ error: "\uAD00\uB9AC\uC790\uB9CC \uACF5\uC9C0\uC0AC\uD56D\uC744 \uC0AD\uC81C\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4" });
    }
    try {
      const { id } = req.params;
      await storage.deleteNotice(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete notice error:", error);
      res.status(500).json({ error: "\uACF5\uC9C0\uC0AC\uD56D\uC744 \uC0AD\uC81C\uD558\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.get("/api/cases/:caseId/change-logs", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    try {
      const { caseId } = req.params;
      const logs = await storage.getCaseChangeLogs(caseId);
      res.json(logs);
    } catch (error) {
      console.error("Get case change logs error:", error);
      res.status(500).json({ error: "\uBCC0\uACBD \uB85C\uADF8\uB97C \uBD88\uB7EC\uC624\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.get("/api/case-change-logs", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user || user.role !== "\uAD00\uB9AC\uC790") {
      return res.status(403).json({ error: "\uAD00\uB9AC\uC790\uB9CC \uBCC0\uACBD \uB85C\uADF8\uB97C \uC870\uD68C\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4" });
    }
    try {
      const { caseNumber, changedBy, dateFrom, dateTo } = req.query;
      const logs = await storage.getAllCaseChangeLogs({
        caseNumber,
        changedBy,
        dateFrom,
        dateTo
      });
      res.json(logs);
    } catch (error) {
      console.error("Get all change logs error:", error);
      res.status(500).json({ error: "\uBCC0\uACBD \uB85C\uADF8\uB97C \uBD88\uB7EC\uC624\uB294 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.post("/api/send-dashboard-pdf-email", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user || user.role !== "\uAD00\uB9AC\uC790") {
      return res.status(403).json({ error: "\uAD00\uB9AC\uC790\uB9CC \uC0AC\uC6A9\uD560 \uC218 \uC788\uB294 \uAE30\uB2A5\uC785\uB2C8\uB2E4" });
    }
    try {
      const { email, pdfBase64, title } = req.body;
      if (!email || !pdfBase64) {
        return res.status(400).json({ error: "\uC774\uBA54\uC77C \uC8FC\uC18C\uC640 PDF \uB370\uC774\uD130\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4" });
      }
      const dateStr = (/* @__PURE__ */ new Date()).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
      const timestamp3 = Date.now();
      const fileName = `dashboard_${timestamp3}.pdf`;
      const pdfBuffer = Buffer.from(pdfBase64, "base64");
      const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
      if (!bucketId) {
        console.error("[send-dashboard-pdf-email] Missing Object Storage bucket ID");
        return res.status(500).json({ error: "Object Storage \uC124\uC815\uC774 \uD544\uC694\uD569\uB2C8\uB2E4" });
      }
      const bucket = objectStorageClient.bucket(bucketId);
      const objectName = `public/dashboard-pdfs/${fileName}`;
      const file = bucket.file(objectName);
      await file.save(pdfBuffer, {
        contentType: "application/pdf",
        metadata: {
          "custom:aclPolicy": JSON.stringify({ owner: user.id, visibility: "public" })
        }
      });
      const SIGNED_URL_TTL_SEC = 7 * 24 * 60 * 60;
      const pdfUrl = await signObjectURL({
        bucketName: bucketId,
        objectName,
        method: "GET",
        ttlSec: SIGNED_URL_TTL_SEC
      });
      console.log(`[PDF Upload] Dashboard PDF uploaded with signed URL`);
      const emailContent = `\uC548\uB155\uD558\uC138\uC694,

FLOXN \uB300\uC2DC\uBCF4\uB4DC \uD604\uD669\uC744 \uBCF4\uB0B4\uB4DC\uB9BD\uB2C8\uB2E4.

- \uBC1C\uC1A1\uC77C: ${dateStr}
- \uBC1C\uC1A1\uC790: ${user.name || user.username}

\uC544\uB798 \uB9C1\uD06C\uB97C \uD074\uB9AD\uD558\uC2DC\uBA74 PDF\uB97C \uB2E4\uC6B4\uB85C\uB4DC\uD558\uC2E4 \uC218 \uC788\uC2B5\uB2C8\uB2E4:
${pdfUrl}

\uAC10\uC0AC\uD569\uB2C8\uB2E4.
FLOXN \uB4DC\uB9BC`;
      await sendNotificationEmail(email, title || `FLOXN \uB300\uC2DC\uBCF4\uB4DC \uD604\uD669 - ${dateStr}`, emailContent);
      console.log(`[Email] Dashboard PDF link sent successfully to ${email} by ${user.username}`);
      res.json({ success: true, message: "\uC774\uBA54\uC77C\uC774 \uC804\uC1A1\uB418\uC5C8\uC2B5\uB2C8\uB2E4", pdfUrl });
    } catch (error) {
      console.error("Send dashboard PDF email error:", error);
      res.status(500).json({ error: "\uC774\uBA54\uC77C \uC804\uC1A1 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.post("/api/send-invoice-email", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(403).json({ error: "\uC0AC\uC6A9\uC790 \uC815\uBCF4\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
    }
    try {
      const {
        email,
        pdfBase64,
        caseNumber,
        insuranceCompany,
        accidentNo,
        damagePreventionAmount,
        propertyRepairAmount,
        totalAmount,
        remarks
      } = req.body;
      if (!email || !pdfBase64) {
        return res.status(400).json({ error: "\uC774\uBA54\uC77C \uC8FC\uC18C\uC640 PDF \uB370\uC774\uD130\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4" });
      }
      const dateStr = (/* @__PURE__ */ new Date()).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
      const timestamp3 = Date.now();
      const fileName = `invoice_${caseNumber || timestamp3}_${timestamp3}.pdf`;
      const pdfBuffer = Buffer.from(pdfBase64, "base64");
      const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
      if (!bucketId) {
        console.error("[send-invoice-email] Missing Object Storage bucket ID");
        return res.status(500).json({ error: "Object Storage \uC124\uC815\uC774 \uD544\uC694\uD569\uB2C8\uB2E4" });
      }
      const bucket = objectStorageClient.bucket(bucketId);
      const objectName = `public/invoice-pdfs/${fileName}`;
      const file = bucket.file(objectName);
      await file.save(pdfBuffer, {
        contentType: "application/pdf",
        metadata: {
          "custom:aclPolicy": JSON.stringify({ owner: user.id, visibility: "public" })
        }
      });
      const SIGNED_URL_TTL_SEC = 7 * 24 * 60 * 60;
      const pdfUrl = await signObjectURL({
        bucketName: bucketId,
        objectName,
        method: "GET",
        ttlSec: SIGNED_URL_TTL_SEC
      });
      console.log(`[PDF Upload] Invoice PDF uploaded with signed URL`);
      const formatAmount2 = (amount) => amount.toLocaleString("ko-KR");
      const emailContent = `\uC548\uB155\uD558\uC138\uC694,

INVOICE\uB97C \uC804\uC1A1\uD574\uB4DC\uB9BD\uB2C8\uB2E4.

- \uBCF4\uD5D8\uC0AC: ${insuranceCompany || "-"}
- \uC0AC\uACE0\uBC88\uD638: ${accidentNo || "-"}
- \uC0AC\uAC74\uBC88\uD638: ${caseNumber || "-"}

\uCCAD\uAD6C \uAE08\uC561:
- \uC190\uD574\uBC29\uC9C0\uBE44\uC6A9: ${formatAmount2(damagePreventionAmount || 0)}\uC6D0
- \uB300\uBB3C\uBCF5\uAD6C\uBE44\uC6A9: ${formatAmount2(propertyRepairAmount || 0)}\uC6D0
- \uD569\uACC4: ${formatAmount2(totalAmount || 0)}\uC6D0
${remarks ? `
\uBE44\uACE0: ${remarks}` : ""}

\uC544\uB798 \uB9C1\uD06C\uB97C \uD074\uB9AD\uD558\uC2DC\uBA74 INVOICE PDF\uB97C \uB2E4\uC6B4\uB85C\uB4DC\uD558\uC2E4 \uC218 \uC788\uC2B5\uB2C8\uB2E4:
${pdfUrl}

- \uBC1C\uC1A1\uC77C: ${dateStr}
- \uBC1C\uC1A1\uC790: ${user.name || user.username}

\uAC10\uC0AC\uD569\uB2C8\uB2E4.
FLOXN \uB4DC\uB9BC`;
      await sendNotificationEmail(email, `FLOXN INVOICE - ${caseNumber || dateStr}`, emailContent);
      console.log(`[Email] Invoice PDF link sent successfully to ${email} by ${user.username}`);
      res.json({ success: true, message: "INVOICE \uC774\uBA54\uC77C\uC774 \uC804\uC1A1\uB418\uC5C8\uC2B5\uB2C8\uB2E4", pdfUrl });
    } catch (error) {
      console.error("Send invoice email error:", error);
      res.status(500).json({ error: "INVOICE \uC774\uBA54\uC77C \uC804\uC1A1 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  const generateInvoicePdfSchema = z2.object({
    caseId: z2.string().min(1, "\uCF00\uC774\uC2A4 ID\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4"),
    recipientName: z2.string().optional(),
    damagePreventionAmount: z2.number().optional().default(0),
    propertyRepairAmount: z2.number().optional().default(0),
    fieldDispatchPreventionAmount: z2.number().optional().default(0),
    fieldDispatchPropertyAmount: z2.number().optional().default(0),
    totalAmount: z2.number().optional(),
    remarks: z2.string().optional()
  });
  app2.post("/api/generate-invoice-pdf", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(403).json({ error: "\uC0AC\uC6A9\uC790 \uC815\uBCF4\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
    }
    const allowedRoles = ["\uD611\uB825\uC0AC", "\uAD00\uB9AC\uC790", "\uC2EC\uC0AC\uC0AC"];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: "INVOICE PDF \uC0DD\uC131 \uAD8C\uD55C\uC774 \uC5C6\uC2B5\uB2C8\uB2E4" });
    }
    try {
      const validationResult = generateInvoicePdfSchema.safeParse(req.body);
      if (!validationResult.success) {
        const errorMessage = validationResult.error.errors.map((e) => e.message).join(", ");
        return res.status(400).json({ error: errorMessage });
      }
      const {
        caseId,
        recipientName,
        damagePreventionAmount,
        propertyRepairAmount,
        fieldDispatchPreventionAmount,
        fieldDispatchPropertyAmount,
        totalAmount: clientTotalAmount,
        remarks
      } = validationResult.data;
      const caseData = await storage.getCaseById(caseId);
      if (!caseData) {
        return res.status(404).json({ error: "\uCF00\uC774\uC2A4\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
      }
      const particulars = [];
      const accidentNo = caseData.insuranceAccidentNo || caseData.caseNumber;
      if (damagePreventionAmount && damagePreventionAmount > 0) {
        particulars.push({
          title: `[${accidentNo}] - \uC190\uD574\uBC29\uC9C0\uBE44\uC6A9`,
          amount: damagePreventionAmount
        });
      }
      if (propertyRepairAmount && propertyRepairAmount > 0) {
        particulars.push({
          title: `[${accidentNo}] - \uB300\uBB3C\uBCF5\uAD6C\uBE44\uC6A9`,
          amount: propertyRepairAmount
        });
      }
      if (fieldDispatchPreventionAmount && fieldDispatchPreventionAmount > 0) {
        particulars.push({
          title: `[${accidentNo}] - \uD604\uC7A5\uCD9C\uB3D9\uBE44\uC6A9 (\uC190\uD574\uBC29\uC9C0)`,
          amount: fieldDispatchPreventionAmount
        });
      }
      if (fieldDispatchPropertyAmount && fieldDispatchPropertyAmount > 0) {
        particulars.push({
          title: `[${accidentNo}] - \uD604\uC7A5\uCD9C\uB3D9\uBE44\uC6A9 (\uB300\uBB3C)`,
          amount: fieldDispatchPropertyAmount
        });
      }
      if (particulars.length === 0) {
        particulars.push({
          title: `[${accidentNo}]`,
          detail: "\uCCAD\uAD6C \uB0B4\uC5ED \uC5C6\uC74C",
          amount: 0
        });
      }
      let totalAmount;
      if (clientTotalAmount !== void 0) {
        totalAmount = clientTotalAmount;
      } else {
        const sumBeforeTruncation = (damagePreventionAmount || 0) + (propertyRepairAmount || 0) + (fieldDispatchPreventionAmount || 0) + (fieldDispatchPropertyAmount || 0);
        const truncation = sumBeforeTruncation % 1e3;
        totalAmount = sumBeforeTruncation - truncation;
      }
      const invoiceData = {
        recipientName: recipientName || caseData.insuranceCompany || "-",
        caseNumber: caseData.caseNumber || "-",
        acceptanceDate: caseData.accidentDate || (/* @__PURE__ */ new Date()).toISOString(),
        submissionDate: (/* @__PURE__ */ new Date()).toISOString(),
        insuranceAccidentNo: accidentNo || void 0,
        particulars,
        totalAmount,
        remarks
      };
      console.log(`[Invoice PDF] Generating PDF for download - case ${caseId}`);
      const pdfBuffer = await generateInvoicePdf(invoiceData);
      console.log(`[Invoice PDF] PDF generated for download, size: ${pdfBuffer.length} bytes`);
      const fileName = `INVOICE_${caseData.caseNumber || caseId}_${Date.now()}.pdf`;
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
      res.setHeader("Content-Length", pdfBuffer.length);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Generate invoice PDF error:", error);
      const errorMessage = error instanceof Error ? error.message : "PDF \uC0DD\uC131 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4";
      res.status(500).json({ error: errorMessage });
    }
  });
  const sendInvoiceEmailV2Schema = z2.object({
    email: z2.string().email("\uC62C\uBC14\uB978 \uC774\uBA54\uC77C \uD615\uC2DD\uC774 \uC544\uB2D9\uB2C8\uB2E4"),
    caseId: z2.string().min(1, "\uCF00\uC774\uC2A4 ID\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4"),
    recipientName: z2.string().optional(),
    damagePreventionAmount: z2.number().optional().default(0),
    propertyRepairAmount: z2.number().optional().default(0),
    fieldDispatchPreventionAmount: z2.number().optional().default(0),
    fieldDispatchPropertyAmount: z2.number().optional().default(0),
    totalAmount: z2.number().optional(),
    remarks: z2.string().optional()
  });
  app2.post("/api/send-invoice-email-v2", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(403).json({ error: "\uC0AC\uC6A9\uC790 \uC815\uBCF4\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
    }
    const allowedRoles = ["\uD611\uB825\uC0AC", "\uAD00\uB9AC\uC790", "\uC2EC\uC0AC\uC0AC"];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: "INVOICE \uC774\uBA54\uC77C \uC804\uC1A1 \uAD8C\uD55C\uC774 \uC5C6\uC2B5\uB2C8\uB2E4" });
    }
    try {
      const validationResult = sendInvoiceEmailV2Schema.safeParse(req.body);
      if (!validationResult.success) {
        const errorMessage = validationResult.error.errors.map((e) => e.message).join(", ");
        return res.status(400).json({ error: errorMessage });
      }
      const {
        email,
        caseId,
        recipientName,
        damagePreventionAmount,
        propertyRepairAmount,
        fieldDispatchPreventionAmount,
        fieldDispatchPropertyAmount,
        totalAmount: clientTotalAmount,
        remarks
      } = validationResult.data;
      const caseData = await storage.getCaseById(caseId);
      if (!caseData) {
        return res.status(404).json({ error: "\uCF00\uC774\uC2A4\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
      }
      const particulars = [];
      const accidentNo = caseData.insuranceAccidentNo || caseData.caseNumber;
      if (damagePreventionAmount && damagePreventionAmount > 0) {
        particulars.push({
          title: `[${accidentNo}] - \uC190\uD574\uBC29\uC9C0\uBE44\uC6A9`,
          amount: damagePreventionAmount
        });
      }
      if (propertyRepairAmount && propertyRepairAmount > 0) {
        particulars.push({
          title: `[${accidentNo}] - \uB300\uBB3C\uBCF5\uAD6C\uBE44\uC6A9`,
          amount: propertyRepairAmount
        });
      }
      if (fieldDispatchPreventionAmount && fieldDispatchPreventionAmount > 0) {
        particulars.push({
          title: `[${accidentNo}] - \uD604\uC7A5\uCD9C\uB3D9\uBE44\uC6A9 (\uC190\uD574\uBC29\uC9C0)`,
          amount: fieldDispatchPreventionAmount
        });
      }
      if (fieldDispatchPropertyAmount && fieldDispatchPropertyAmount > 0) {
        particulars.push({
          title: `[${accidentNo}] - \uD604\uC7A5\uCD9C\uB3D9\uBE44\uC6A9 (\uB300\uBB3C)`,
          amount: fieldDispatchPropertyAmount
        });
      }
      if (particulars.length === 0) {
        particulars.push({
          title: `[${accidentNo}]`,
          detail: "\uCCAD\uAD6C \uB0B4\uC5ED \uC5C6\uC74C",
          amount: 0
        });
      }
      let totalAmount;
      if (clientTotalAmount !== void 0) {
        totalAmount = clientTotalAmount;
      } else {
        const sumBeforeTruncation = (damagePreventionAmount || 0) + (propertyRepairAmount || 0) + (fieldDispatchPreventionAmount || 0) + (fieldDispatchPropertyAmount || 0);
        const truncation = sumBeforeTruncation % 1e3;
        totalAmount = sumBeforeTruncation - truncation;
      }
      const invoiceData = {
        recipientName: recipientName || caseData.insuranceCompany || "-",
        caseNumber: caseData.caseNumber || "-",
        acceptanceDate: caseData.accidentDate || (/* @__PURE__ */ new Date()).toISOString(),
        submissionDate: (/* @__PURE__ */ new Date()).toISOString(),
        insuranceAccidentNo: accidentNo || void 0,
        particulars,
        totalAmount,
        remarks
      };
      console.log(`[Invoice PDF] Generating PDF for case ${caseId}`);
      const pdfBuffer = await generateInvoicePdf(invoiceData);
      console.log(`[Invoice PDF] PDF generated, size: ${pdfBuffer.length} bytes`);
      const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
      if (!bucketId) {
        console.error("[send-invoice-email-v2] Missing Object Storage bucket ID");
        return res.status(500).json({ error: "Object Storage \uC124\uC815\uC774 \uD544\uC694\uD569\uB2C8\uB2E4" });
      }
      const timestamp3 = Date.now();
      const fileName = `invoice_${caseData.caseNumber || caseId}_${timestamp3}.pdf`;
      const bucket = objectStorageClient.bucket(bucketId);
      const objectName = `public/invoice-pdfs/${fileName}`;
      const file = bucket.file(objectName);
      await file.save(pdfBuffer, {
        contentType: "application/pdf",
        metadata: {
          "custom:aclPolicy": JSON.stringify({ owner: user.id, visibility: "public" })
        }
      });
      const SIGNED_URL_TTL_SEC = 7 * 24 * 60 * 60;
      const pdfUrl = await signObjectURL({
        bucketName: bucketId,
        objectName,
        method: "GET",
        ttlSec: SIGNED_URL_TTL_SEC
      });
      console.log(`[PDF Upload] Invoice PDF uploaded with signed URL`);
      const formatAmount2 = (amt) => amt.toLocaleString("ko-KR");
      const dateStr = (/* @__PURE__ */ new Date()).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
      const amountLines = [];
      if (damagePreventionAmount && damagePreventionAmount > 0) {
        amountLines.push(`- \uC190\uD574\uBC29\uC9C0\uBE44\uC6A9: ${formatAmount2(damagePreventionAmount)}\uC6D0`);
      }
      if (propertyRepairAmount && propertyRepairAmount > 0) {
        amountLines.push(`- \uB300\uBB3C\uBCF5\uAD6C\uBE44\uC6A9: ${formatAmount2(propertyRepairAmount)}\uC6D0`);
      }
      if (fieldDispatchPreventionAmount && fieldDispatchPreventionAmount > 0) {
        amountLines.push(`- \uD604\uC7A5\uCD9C\uB3D9\uBE44\uC6A9 (\uC190\uD574\uBC29\uC9C0): ${formatAmount2(fieldDispatchPreventionAmount)}\uC6D0`);
      }
      if (fieldDispatchPropertyAmount && fieldDispatchPropertyAmount > 0) {
        amountLines.push(`- \uD604\uC7A5\uCD9C\uB3D9\uBE44\uC6A9 (\uB300\uBB3C): ${formatAmount2(fieldDispatchPropertyAmount)}\uC6D0`);
      }
      amountLines.push(`- \uD569\uACC4: ${formatAmount2(totalAmount)}\uC6D0`);
      const emailContent = `\uC548\uB155\uD558\uC138\uC694,

INVOICE\uB97C \uC804\uC1A1\uD574\uB4DC\uB9BD\uB2C8\uB2E4.

- \uBCF4\uD5D8\uC0AC: ${invoiceData.recipientName}
- \uC0AC\uACE0\uBC88\uD638: ${invoiceData.insuranceAccidentNo || "-"}

\uCCAD\uAD6C \uAE08\uC561:
${amountLines.join("\n")}
${remarks ? `
\uBE44\uACE0: ${remarks}` : ""}

\uC544\uB798 \uB9C1\uD06C\uB97C \uD074\uB9AD\uD558\uC2DC\uBA74 INVOICE PDF\uB97C \uB2E4\uC6B4\uB85C\uB4DC\uD558\uC2E4 \uC218 \uC788\uC2B5\uB2C8\uB2E4:
${pdfUrl}

- \uBC1C\uC1A1\uC77C: ${dateStr}
- \uBC1C\uC1A1\uC790: ${user.name || user.username}

\uAC10\uC0AC\uD569\uB2C8\uB2E4.
FLOXN \uB4DC\uB9BC`;
      const emailSubjectId = invoiceData.insuranceAccidentNo || caseData.insurancePolicyNo || invoiceData.caseNumber || dateStr;
      await sendNotificationEmail(email, `FLOXN INVOICE - ${emailSubjectId}`, emailContent);
      console.log(`[Email] Invoice PDF link sent successfully to ${email} by ${user.username}`);
      res.json({ success: true, message: "INVOICE \uC774\uBA54\uC77C\uC774 \uC804\uC1A1\uB418\uC5C8\uC2B5\uB2C8\uB2E4", pdfUrl });
    } catch (error) {
      console.error("Send invoice email v2 error:", error);
      const errorMessage = error instanceof Error ? error.message : "INVOICE \uC774\uBA54\uC77C \uC804\uC1A1 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4";
      res.status(500).json({ error: errorMessage });
    }
  });
  app2.post("/api/send-field-dispatch-invoice-email", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(403).json({ error: "\uC0AC\uC6A9\uC790 \uC815\uBCF4\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
    }
    try {
      const {
        email,
        pdfBase64,
        caseNumber,
        insuranceCompany,
        accidentNo,
        fieldDispatchAmount,
        totalAmount,
        remarks
      } = req.body;
      if (!email || !pdfBase64) {
        return res.status(400).json({ error: "\uC774\uBA54\uC77C \uC8FC\uC18C\uC640 PDF \uB370\uC774\uD130\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4" });
      }
      const dateStr = (/* @__PURE__ */ new Date()).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
      const timestamp3 = Date.now();
      const fileName = `field_dispatch_invoice_${caseNumber || "unknown"}_${timestamp3}.pdf`;
      const pdfBuffer = Buffer.from(pdfBase64, "base64");
      const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
      if (!bucketId) {
        console.error("[send-field-dispatch-invoice-email] Missing Object Storage bucket ID");
        return res.status(500).json({ error: "Object Storage \uC124\uC815\uC774 \uD544\uC694\uD569\uB2C8\uB2E4" });
      }
      const bucket = objectStorageClient.bucket(bucketId);
      const objectName = `public/invoice-pdfs/${fileName}`;
      const file = bucket.file(objectName);
      await file.save(pdfBuffer, {
        contentType: "application/pdf",
        metadata: {
          "custom:aclPolicy": JSON.stringify({ owner: user.id, visibility: "public" })
        }
      });
      const SIGNED_URL_TTL_SEC = 7 * 24 * 60 * 60;
      const pdfUrl = await signObjectURL({
        bucketName: bucketId,
        objectName,
        method: "GET",
        ttlSec: SIGNED_URL_TTL_SEC
      });
      console.log(`[PDF Upload] Field dispatch invoice PDF uploaded with signed URL`);
      const formatAmount2 = (amount) => amount.toLocaleString("ko-KR");
      const emailContent = `\uC548\uB155\uD558\uC138\uC694,

\uD604\uC7A5\uCD9C\uB3D9\uBE44\uC6A9 \uCCAD\uAD6C\uC11C\uB97C \uC804\uC1A1\uD574\uB4DC\uB9BD\uB2C8\uB2E4.

- \uBCF4\uD5D8\uC0AC: ${insuranceCompany || "-"}
- \uC0AC\uACE0\uBC88\uD638: ${accidentNo || "-"}
- \uC0AC\uAC74\uBC88\uD638: ${caseNumber || "-"}

\uCCAD\uAD6C \uAE08\uC561:
- \uD604\uC7A5\uCD9C\uB3D9\uBE44\uC6A9: ${formatAmount2(fieldDispatchAmount || 0)}\uC6D0
- \uD569\uACC4: ${formatAmount2(totalAmount || 0)}\uC6D0
${remarks ? `
\uBE44\uACE0: ${remarks}` : ""}

\uC544\uB798 \uB9C1\uD06C\uB97C \uD074\uB9AD\uD558\uC2DC\uBA74 \uD604\uC7A5\uCD9C\uB3D9\uBE44\uC6A9 \uCCAD\uAD6C\uC11C PDF\uB97C \uB2E4\uC6B4\uB85C\uB4DC\uD558\uC2E4 \uC218 \uC788\uC2B5\uB2C8\uB2E4:
${pdfUrl}

- \uBC1C\uC1A1\uC77C: ${dateStr}
- \uBC1C\uC1A1\uC790: ${user.name || user.username}

\uAC10\uC0AC\uD569\uB2C8\uB2E4.
FLOXN \uB4DC\uB9BC`;
      await sendNotificationEmail(email, `FLOXN \uD604\uC7A5\uCD9C\uB3D9\uBE44\uC6A9 \uCCAD\uAD6C\uC11C - ${caseNumber || dateStr}`, emailContent);
      console.log(`[Email] Field dispatch invoice PDF link sent successfully to ${email} by ${user.username}`);
      res.json({ success: true, message: "\uD604\uC7A5\uCD9C\uB3D9\uBE44\uC6A9 \uCCAD\uAD6C\uC11C \uC774\uBA54\uC77C\uC774 \uC804\uC1A1\uB418\uC5C8\uC2B5\uB2C8\uB2E4", pdfUrl });
    } catch (error) {
      console.error("Send field dispatch invoice email error:", error);
      res.status(500).json({ error: "\uD604\uC7A5\uCD9C\uB3D9\uBE44\uC6A9 \uCCAD\uAD6C\uC11C \uC774\uBA54\uC77C \uC804\uC1A1 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.post("/api/generate-document-urls", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(403).json({ error: "\uC0AC\uC6A9\uC790 \uC815\uBCF4\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
    }
    const allowedRoles = ["\uD611\uB825\uC0AC", "\uAD00\uB9AC\uC790", "\uC2EC\uC0AC\uC0AC"];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: "\uC99D\uBE59\uC790\uB8CC URL \uC0DD\uC131 \uAD8C\uD55C\uC774 \uC5C6\uC2B5\uB2C8\uB2E4" });
    }
    try {
      const { caseId } = req.body;
      if (!caseId) {
        return res.status(400).json({ error: "caseId\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4" });
      }
      const caseData = await storage.getCaseById(caseId);
      if (!caseData) {
        return res.status(404).json({ error: "\uC0AC\uAC74\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
      }
      if (user.role !== "\uAD00\uB9AC\uC790") {
        const isAssignedPartner = user.role === "\uD611\uB825\uC0AC" && caseData.assignedPartner === user.company;
        const isAssignedAssessor = user.role === "\uC2EC\uC0AC\uC0AC" && caseData.assessorId === user.id;
        if (!isAssignedPartner && !isAssignedAssessor) {
          return res.status(403).json({ error: "\uD574\uB2F9 \uC0AC\uAC74\uC5D0 \uB300\uD55C \uC811\uADFC \uAD8C\uD55C\uC774 \uC5C6\uC2B5\uB2C8\uB2E4" });
        }
      }
      const documents = await storage.getDocumentsByCaseId(caseId);
      if (!documents || documents.length === 0) {
        return res.json({ documentLinks: [] });
      }
      console.log(`[generate-document-urls] Found ${documents.length} documents for case ${caseId}`);
      const privateObjectDir = process.env.PRIVATE_OBJECT_DIR;
      if (!privateObjectDir) {
        console.warn("[generate-document-urls] PRIVATE_OBJECT_DIR not set");
        return res.json({ documentLinks: [] });
      }
      const privateDirParts = privateObjectDir.startsWith("/") ? privateObjectDir.slice(1).split("/") : privateObjectDir.split("/");
      const privateBucketName = privateDirParts[0];
      const privatePrefix = privateDirParts.slice(1).join("/");
      const privateBucket = objectStorageClient.bucket(privateBucketName);
      const SIGNED_URL_TTL_SEC = 7 * 24 * 60 * 60;
      const timestamp3 = Date.now();
      const documentLinks = [];
      for (const doc of documents) {
        try {
          const fileBuffer = Buffer.from(doc.fileData, "base64");
          const sanitizedFileName = doc.fileName.replace(/[^a-zA-Z0-9가-힣._-]/g, "_");
          const docObjectName = `${privatePrefix}/case-documents/${caseId}/${timestamp3}_${sanitizedFileName}`;
          const docFile = privateBucket.file(docObjectName);
          await docFile.save(fileBuffer, {
            contentType: doc.fileType,
            metadata: {
              "custom:aclPolicy": JSON.stringify({ owner: user.id, visibility: "private" })
            }
          });
          const docUrl = await signObjectURL({
            bucketName: privateBucketName,
            objectName: docObjectName,
            method: "GET",
            ttlSec: SIGNED_URL_TTL_SEC
          });
          documentLinks.push({
            category: doc.category,
            fileName: doc.fileName,
            url: docUrl
          });
          console.log(`[generate-document-urls] Generated signed URL for: ${doc.fileName}`);
        } catch (docError) {
          console.error(`[generate-document-urls] Failed for ${doc.fileName}:`, docError);
        }
      }
      res.json({ documentLinks });
    } catch (error) {
      console.error("Generate document URLs error:", error);
      res.status(500).json({ error: "\uC99D\uBE59\uC790\uB8CC URL \uC0DD\uC131 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  const sendFieldReportEmailSchema = z2.object({
    email: z2.string().email("\uC62C\uBC14\uB978 \uC774\uBA54\uC77C \uD615\uC2DD\uC774 \uC544\uB2D9\uB2C8\uB2E4").optional(),
    // 하위 호환성
    emails: z2.array(z2.string().email("\uC62C\uBC14\uB978 \uC774\uBA54\uC77C \uD615\uC2DD\uC774 \uC544\uB2D9\uB2C8\uB2E4")).optional(),
    // 여러 수신자 지원
    pdfBase64: z2.string().min(1, "PDF \uB370\uC774\uD130\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4"),
    caseId: z2.string().optional(),
    caseNumber: z2.string().optional(),
    insuranceCompany: z2.string().optional(),
    accidentNo: z2.string().optional(),
    clientName: z2.string().optional(),
    insuredName: z2.string().optional(),
    visitDate: z2.string().optional().nullable(),
    accidentCategory: z2.string().optional().nullable(),
    accidentCause: z2.string().optional().nullable(),
    recoveryMethodType: z2.string().optional().nullable()
  });
  app2.post("/api/send-field-report-email", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(403).json({ error: "\uC0AC\uC6A9\uC790 \uC815\uBCF4\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
    }
    const allowedRoles = ["\uD611\uB825\uC0AC", "\uAD00\uB9AC\uC790", "\uC2EC\uC0AC\uC0AC"];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: "\uD604\uC7A5\uC870\uC0AC \uB9AC\uD3EC\uD2B8 \uC774\uBA54\uC77C \uC804\uC1A1 \uAD8C\uD55C\uC774 \uC5C6\uC2B5\uB2C8\uB2E4" });
    }
    try {
      const validationResult = sendFieldReportEmailSchema.safeParse(req.body);
      if (!validationResult.success) {
        const errorMessage = validationResult.error.errors.map((e) => e.message).join(", ");
        return res.status(400).json({ error: errorMessage });
      }
      const {
        email,
        emails: emailsList,
        pdfBase64,
        caseId,
        caseNumber,
        insuranceCompany,
        accidentNo,
        clientName,
        insuredName,
        visitDate,
        accidentCategory,
        accidentCause,
        recoveryMethodType
      } = validationResult.data;
      const recipients = emailsList && emailsList.length > 0 ? emailsList : email ? [email] : [];
      if (recipients.length === 0) {
        return res.status(400).json({ error: "\uC218\uC2E0\uC790 \uC774\uBA54\uC77C\uC774 \uD544\uC694\uD569\uB2C8\uB2E4" });
      }
      const dateStr = (/* @__PURE__ */ new Date()).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
      const timestamp3 = Date.now();
      const fileName = `field-report_${caseNumber || timestamp3}_${timestamp3}.pdf`;
      const pdfBuffer = Buffer.from(pdfBase64, "base64");
      const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
      if (!bucketId) {
        console.error("[send-field-report-email] Missing Object Storage bucket ID");
        return res.status(500).json({ error: "Object Storage \uC124\uC815\uC774 \uD544\uC694\uD569\uB2C8\uB2E4" });
      }
      const bucket = objectStorageClient.bucket(bucketId);
      const objectName = `public/field-report-pdfs/${fileName}`;
      const file = bucket.file(objectName);
      await file.save(pdfBuffer, {
        contentType: "application/pdf",
        metadata: {
          "custom:aclPolicy": JSON.stringify({ owner: user.id, visibility: "public" })
        }
      });
      const SIGNED_URL_TTL_SEC = 7 * 24 * 60 * 60;
      const pdfUrl = await signObjectURL({
        bucketName: bucketId,
        objectName,
        method: "GET",
        ttlSec: SIGNED_URL_TTL_SEC
      });
      console.log(`[PDF Upload] Field Report PDF uploaded with signed URL`);
      let documentLinksSection = "";
      if (caseId) {
        try {
          const documents = await storage.getDocumentsByCaseId(caseId);
          if (documents && documents.length > 0) {
            const categoryOrder = [
              "\uD604\uC7A5\uCD9C\uB3D9\uC0AC\uC9C4",
              "\uC218\uB9AC\uC911 \uC0AC\uC9C4",
              "\uBCF5\uAD6C\uC644\uB8CC \uC0AC\uC9C4",
              "\uBCF4\uD5D8\uAE08 \uCCAD\uAD6C\uC11C",
              "\uAC1C\uC778\uC815\uBCF4 \uB3D9\uC758\uC11C(\uAC00\uC871\uC6A9)",
              "\uC8FC\uBBFC\uB4F1\uB85D\uB4F1\uBCF8",
              "\uB4F1\uAE30\uBD80\uB4F1\uBCF8",
              "\uAC74\uCD95\uBB3C\uB300\uC7A5",
              "\uAE30\uD0C0\uC99D\uBE59\uC790\uB8CC(\uBBFC\uC6D0\uC77C\uC9C0 \uB4F1)",
              "\uC704\uC784\uC7A5",
              "\uB3C4\uAE09\uACC4\uC57D\uC11C",
              "\uBCF5\uAD6C\uC644\uB8CC\uD655\uC778\uC11C",
              "\uBD80\uAC00\uC138 \uCCAD\uAD6C\uC790\uB8CC"
            ];
            const privateObjectDir = process.env.PRIVATE_OBJECT_DIR;
            if (privateObjectDir) {
              const privateDirParts = privateObjectDir.startsWith("/") ? privateObjectDir.slice(1).split("/") : privateObjectDir.split("/");
              const privateBucketName = privateDirParts[0];
              const privatePrefix = privateDirParts.slice(1).join("/");
              const privateBucket = objectStorageClient.bucket(privateBucketName);
              const SIGNED_URL_TTL_SEC2 = 7 * 24 * 60 * 60;
              const emailTimestamp = Date.now();
              const categoryGroups = {};
              for (const doc of documents) {
                if (!doc.fileData || !doc.category) continue;
                try {
                  const fileBuffer = Buffer.from(doc.fileData, "base64");
                  const sanitizedFileName = doc.fileName.replace(/[^a-zA-Z0-9가-힣._-]/g, "_");
                  const docObjectName = `${privatePrefix}/email-documents/${caseId}/${emailTimestamp}_${sanitizedFileName}`;
                  const docFile = privateBucket.file(docObjectName);
                  await docFile.save(fileBuffer, {
                    contentType: doc.fileType,
                    metadata: {
                      "custom:aclPolicy": JSON.stringify({ owner: user.id, visibility: "private" })
                    }
                  });
                  const docUrl = await signObjectURL({
                    bucketName: privateBucketName,
                    objectName: docObjectName,
                    method: "GET",
                    ttlSec: SIGNED_URL_TTL_SEC2
                  });
                  if (!categoryGroups[doc.category]) {
                    categoryGroups[doc.category] = [];
                  }
                  categoryGroups[doc.category].push({
                    fileName: doc.fileName || "unknown",
                    url: docUrl
                  });
                } catch (docUploadErr) {
                  console.error(`[Email] Failed to generate signed URL for ${doc.fileName}:`, docUploadErr);
                }
              }
              const allCategories = [...categoryOrder, ...Object.keys(categoryGroups).filter((c) => !categoryOrder.includes(c))];
              let linksText = "\n\n\u25A0 \uC99D\uBE59\uC790\uB8CC \uB2E4\uC6B4\uB85C\uB4DC (\uB9C1\uD06C\uB294 7\uC77C\uAC04 \uC720\uD6A8\uD569\uB2C8\uB2E4)\n";
              let hasLinks = false;
              for (const category of allCategories) {
                if (!categoryGroups[category] || categoryGroups[category].length === 0) continue;
                hasLinks = true;
                linksText += `
[${category}]
`;
                for (const docLink of categoryGroups[category]) {
                  linksText += `  - ${docLink.fileName}
    ${docLink.url}
`;
                }
              }
              if (hasLinks) {
                documentLinksSection = linksText;
              }
            }
          }
        } catch (docError) {
          console.error("[Email] Error fetching documents for email:", docError);
        }
      }
      const emailContent = `\uC548\uB155\uD558\uC138\uC694,

\uD604\uC7A5\uC870\uC0AC \uB9AC\uD3EC\uD2B8\uB97C \uC804\uC1A1\uD574\uB4DC\uB9BD\uB2C8\uB2E4.

\u25A0 \uC0AC\uAC74 \uC815\uBCF4
- \uBCF4\uD5D8\uC0AC: ${insuranceCompany || "-"}
- \uC0AC\uACE0\uBC88\uD638: ${accidentNo || "-"}
- \uC0AC\uAC74\uBC88\uD638: ${caseNumber || "-"}
- \uC758\uB8B0\uC0AC: ${clientName || "-"}

\u25A0 \uD53C\uBCF4\uD5D8\uC790 \uC815\uBCF4
- \uD53C\uBCF4\uD5D8\uC790: ${insuredName || "-"}

\u25A0 \uD604\uC7A5\uC870\uC0AC \uC815\uBCF4
- \uBC29\uBB38\uC77C: ${visitDate || "-"}
- \uC0AC\uACE0\uBD84\uB958: ${accidentCategory || "-"}
- \uC0AC\uACE0\uC6D0\uC778: ${accidentCause || "-"}
- \uCC98\uB9AC\uC720\uD615: ${recoveryMethodType || "-"}

\u25A0 \uD604\uC7A5\uC870\uC0AC \uB9AC\uD3EC\uD2B8 PDF
\uC544\uB798 \uB9C1\uD06C\uB97C \uD074\uB9AD\uD558\uC2DC\uBA74 \uB2E4\uC6B4\uB85C\uB4DC\uD558\uC2E4 \uC218 \uC788\uC2B5\uB2C8\uB2E4:
${pdfUrl}
${documentLinksSection}

- \uBC1C\uC1A1\uC77C: ${dateStr}
- \uBC1C\uC1A1\uC790: ${user.name || user.username}

\uAC10\uC0AC\uD569\uB2C8\uB2E4.
FLOXN \uB4DC\uB9BC`;
      const sendResults = [];
      for (const recipientEmail of recipients) {
        try {
          await sendNotificationEmail(recipientEmail, `FLOXN \uD604\uC7A5\uC870\uC0AC \uB9AC\uD3EC\uD2B8 - ${caseNumber || dateStr}`, emailContent);
          sendResults.push({ email: recipientEmail, success: true });
          console.log(`[Email] Field Report PDF link sent successfully to ${recipientEmail} by ${user.username}`);
        } catch (sendError) {
          console.error(`[Email] Failed to send to ${recipientEmail}:`, sendError);
          sendResults.push({
            email: recipientEmail,
            success: false,
            error: sendError instanceof Error ? sendError.message : "\uC804\uC1A1 \uC2E4\uD328"
          });
        }
      }
      const successCount = sendResults.filter((r) => r.success).length;
      const failedCount = sendResults.filter((r) => !r.success).length;
      if (successCount === 0) {
        return res.status(500).json({
          error: "\uBAA8\uB4E0 \uC774\uBA54\uC77C \uC804\uC1A1\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4",
          details: sendResults.filter((r) => !r.success)
        });
      }
      const message = failedCount > 0 ? `${successCount}\uBA85\uC5D0\uAC8C \uC804\uC1A1 \uC644\uB8CC, ${failedCount}\uBA85 \uC804\uC1A1 \uC2E4\uD328` : `${successCount}\uBA85\uC5D0\uAC8C \uD604\uC7A5\uC870\uC0AC \uB9AC\uD3EC\uD2B8 \uC774\uBA54\uC77C\uC774 \uC804\uC1A1\uB418\uC5C8\uC2B5\uB2C8\uB2E4`;
      res.json({ success: true, message, pdfUrl, results: sendResults });
    } catch (error) {
      console.error("Send field report email error:", error);
      res.status(500).json({ error: "\uD604\uC7A5\uC870\uC0AC \uB9AC\uD3EC\uD2B8 \uC774\uBA54\uC77C \uC804\uC1A1 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  const sendFieldReportEmailV2Schema = z2.object({
    emails: z2.array(z2.string().email("\uC62C\uBC14\uB978 \uC774\uBA54\uC77C \uD615\uC2DD\uC774 \uC544\uB2D9\uB2C8\uB2E4")).min(1, "\uC218\uC2E0\uC790 \uC774\uBA54\uC77C\uC774 \uD544\uC694\uD569\uB2C8\uB2E4"),
    caseId: z2.string().min(1, "\uCF00\uC774\uC2A4 ID\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4"),
    sections: z2.object({
      cover: z2.boolean().default(true),
      fieldReport: z2.boolean().default(true),
      drawing: z2.boolean().default(true),
      evidence: z2.boolean().default(true),
      estimate: z2.boolean().default(true),
      etc: z2.boolean().default(false)
    }),
    evidence: z2.object({
      tab: z2.string().default("\uC804\uCCB4"),
      selectedFileIds: z2.array(z2.string()).default([])
    }).default({ tab: "\uC804\uCCB4", selectedFileIds: [] })
  });
  app2.post("/api/send-field-report-email-v2", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(403).json({ error: "\uC0AC\uC6A9\uC790 \uC815\uBCF4\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
    }
    const allowedRoles = ["\uD611\uB825\uC0AC", "\uAD00\uB9AC\uC790", "\uC2EC\uC0AC\uC0AC"];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: "\uD604\uC7A5\uC870\uC0AC \uB9AC\uD3EC\uD2B8 \uC774\uBA54\uC77C \uC804\uC1A1 \uAD8C\uD55C\uC774 \uC5C6\uC2B5\uB2C8\uB2E4" });
    }
    try {
      const validationResult = sendFieldReportEmailV2Schema.safeParse(req.body);
      if (!validationResult.success) {
        const errorMessage = validationResult.error.errors.map((e) => e.message).join(", ");
        return res.status(400).json({ error: errorMessage });
      }
      const { emails, caseId, sections, evidence } = validationResult.data;
      const caseData = await storage.getCaseById(caseId);
      if (!caseData) {
        return res.status(404).json({ error: "\uCF00\uC774\uC2A4\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
      }
      console.log(`[send-field-report-email-v2] Generating PDF for case ${caseId}`);
      const pdfBuffer = await generatePdf({
        caseId,
        sections,
        evidence
      });
      const dateStr = (/* @__PURE__ */ new Date()).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
      const timestamp3 = Date.now();
      const fileName = `field-report_${caseData.caseNumber || timestamp3}_${timestamp3}.pdf`;
      const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
      if (!bucketId) {
        console.error("[send-field-report-email-v2] Missing Object Storage bucket ID");
        return res.status(500).json({ error: "Object Storage \uC124\uC815\uC774 \uD544\uC694\uD569\uB2C8\uB2E4" });
      }
      const bucket = objectStorageClient.bucket(bucketId);
      const objectName = `public/field-report-pdfs/${fileName}`;
      const file = bucket.file(objectName);
      await file.save(pdfBuffer, {
        contentType: "application/pdf",
        metadata: {
          "custom:aclPolicy": JSON.stringify({ owner: user.id, visibility: "public" })
        }
      });
      const SIGNED_URL_TTL_SEC = 7 * 24 * 60 * 60;
      const pdfUrl = await signObjectURL({
        bucketName: bucketId,
        objectName,
        method: "GET",
        ttlSec: SIGNED_URL_TTL_SEC
      });
      console.log(`[send-field-report-email-v2] PDF uploaded with signed URL`);
      let documentLinksSection = "";
      try {
        const documents = await storage.getDocumentsByCaseId(caseId);
        if (documents && documents.length > 0) {
          const categoryOrder = [
            "\uD604\uC7A5\uCD9C\uB3D9\uC0AC\uC9C4",
            "\uC218\uB9AC\uC911 \uC0AC\uC9C4",
            "\uBCF5\uAD6C\uC644\uB8CC \uC0AC\uC9C4",
            "\uBCF4\uD5D8\uAE08 \uCCAD\uAD6C\uC11C",
            "\uAC1C\uC778\uC815\uBCF4 \uB3D9\uC758\uC11C(\uAC00\uC871\uC6A9)",
            "\uC8FC\uBBFC\uB4F1\uB85D\uB4F1\uBCF8",
            "\uB4F1\uAE30\uBD80\uB4F1\uBCF8",
            "\uAC74\uCD95\uBB3C\uB300\uC7A5",
            "\uAE30\uD0C0\uC99D\uBE59\uC790\uB8CC(\uBBFC\uC6D0\uC77C\uC9C0 \uB4F1)",
            "\uC704\uC784\uC7A5",
            "\uB3C4\uAE09\uACC4\uC57D\uC11C",
            "\uBCF5\uAD6C\uC644\uB8CC\uD655\uC778\uC11C",
            "\uBD80\uAC00\uC138 \uCCAD\uAD6C\uC790\uB8CC"
          ];
          const privateObjectDir = process.env.PRIVATE_OBJECT_DIR;
          if (privateObjectDir) {
            const privateDirParts = privateObjectDir.startsWith("/") ? privateObjectDir.slice(1).split("/") : privateObjectDir.split("/");
            const privateBucketName = privateDirParts[0];
            const privatePrefix = privateDirParts.slice(1).join("/");
            const privateBucket = objectStorageClient.bucket(privateBucketName);
            const categoryGroups = {};
            for (const doc of documents) {
              if (!doc.fileData || !doc.category) continue;
              try {
                const fileBuffer = Buffer.from(doc.fileData, "base64");
                const sanitizedFileName = doc.fileName.replace(/[^a-zA-Z0-9가-힣._-]/g, "_");
                const docObjectName = `${privatePrefix}/email-documents/${caseId}/${timestamp3}_${sanitizedFileName}`;
                const docFile = privateBucket.file(docObjectName);
                await docFile.save(fileBuffer, {
                  contentType: doc.fileType,
                  metadata: {
                    "custom:aclPolicy": JSON.stringify({ owner: user.id, visibility: "private" })
                  }
                });
                const docUrl = await signObjectURL({
                  bucketName: privateBucketName,
                  objectName: docObjectName,
                  method: "GET",
                  ttlSec: SIGNED_URL_TTL_SEC
                });
                if (!categoryGroups[doc.category]) {
                  categoryGroups[doc.category] = [];
                }
                categoryGroups[doc.category].push({ fileName: doc.fileName, url: docUrl });
              } catch (docError) {
                console.error(`[send-field-report-email-v2] Failed for ${doc.fileName}:`, docError);
              }
            }
            const sortedCategories = Object.keys(categoryGroups).sort((a, b) => {
              const indexA = categoryOrder.indexOf(a);
              const indexB = categoryOrder.indexOf(b);
              return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
            });
            if (sortedCategories.length > 0) {
              documentLinksSection = "\n\n\u{1F4CE} \uC99D\uBE59\uC790\uB8CC \uB2E4\uC6B4\uB85C\uB4DC \uB9C1\uD06C:\n" + sortedCategories.map((category) => {
                const docs = categoryGroups[category];
                return `
[${category}]
` + docs.map((d) => `  - ${d.fileName}: ${d.url}`).join("\n");
              }).join("\n");
            }
          }
        }
      } catch (docError) {
        console.error("[send-field-report-email-v2] Failed to generate document links:", docError);
      }
      const emailContent = `\uC548\uB155\uD558\uC138\uC694.

FLOXN \uD604\uC7A5\uC870\uC0AC \uB9AC\uD3EC\uD2B8\uB97C \uC804\uC1A1\uB4DC\uB9BD\uB2C8\uB2E4.

\u25B6 \uB9AC\uD3EC\uD2B8 \uC815\uBCF4
- \uBCF4\uD5D8\uC0AC: ${caseData.insuranceCompany || "\uBBF8\uC9C0\uC815"}
- \uC0AC\uACE0\uBC88\uD638: ${caseData.insuranceAccidentNo || "\uBBF8\uC9C0\uC815"}
- \uC758\uB8B0\uC778: ${caseData.clientName || "\uBBF8\uC9C0\uC815"}
- \uD53C\uBCF4\uD5D8\uC790: ${caseData.insuredName || "\uBBF8\uC9C0\uC815"}
- \uCD9C\uB3D9\uC77C: ${caseData.visitDate || "\uBBF8\uC9C0\uC815"}
- \uC0AC\uACE0\uC720\uD615: ${caseData.accidentCategory || "\uBBF8\uC9C0\uC815"}
- \uC0AC\uACE0\uC6D0\uC778: ${caseData.accidentCause || "\uBBF8\uC9C0\uC815"}
- \uBCF5\uAD6C\uBC29\uC2DD: ${caseData.recoveryMethodType || "\uBBF8\uC9C0\uC815"}

\u25B6 PDF \uB2E4\uC6B4\uB85C\uB4DC \uB9C1\uD06C (7\uC77C\uAC04 \uC720\uD6A8)
${pdfUrl}
${documentLinksSection}

- \uBC1C\uC1A1\uC77C\uC2DC: ${dateStr}
- \uBC1C\uC1A1\uC790: ${user.name || user.username}

\uAC10\uC0AC\uD569\uB2C8\uB2E4.
FLOXN \uB4DC\uB9BC`;
      const sendResults = [];
      for (const recipientEmail of emails) {
        try {
          await sendNotificationEmail(recipientEmail, `FLOXN \uD604\uC7A5\uC870\uC0AC \uB9AC\uD3EC\uD2B8 - ${caseData.caseNumber || dateStr}`, emailContent);
          sendResults.push({ email: recipientEmail, success: true });
          console.log(`[Email] Field Report PDF sent to ${recipientEmail} by ${user.username}`);
        } catch (sendError) {
          console.error(`[Email] Failed to send to ${recipientEmail}:`, sendError);
          sendResults.push({
            email: recipientEmail,
            success: false,
            error: sendError instanceof Error ? sendError.message : "\uC804\uC1A1 \uC2E4\uD328"
          });
        }
      }
      const successCount = sendResults.filter((r) => r.success).length;
      const failedCount = sendResults.filter((r) => !r.success).length;
      if (successCount === 0) {
        return res.status(500).json({
          error: "\uBAA8\uB4E0 \uC774\uBA54\uC77C \uC804\uC1A1\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4",
          details: sendResults.filter((r) => !r.success)
        });
      }
      const message = failedCount > 0 ? `${successCount}\uBA85\uC5D0\uAC8C \uC804\uC1A1 \uC644\uB8CC, ${failedCount}\uBA85 \uC804\uC1A1 \uC2E4\uD328` : `${successCount}\uBA85\uC5D0\uAC8C \uD604\uC7A5\uC870\uC0AC \uB9AC\uD3EC\uD2B8 \uC774\uBA54\uC77C\uC774 \uC804\uC1A1\uB418\uC5C8\uC2B5\uB2C8\uB2E4`;
      res.json({ success: true, message, pdfUrl, results: sendResults });
    } catch (error) {
      console.error("Send field report email v2 error:", error);
      res.status(500).json({ error: "\uD604\uC7A5\uC870\uC0AC \uB9AC\uD3EC\uD2B8 \uC774\uBA54\uC77C \uC804\uC1A1 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.post("/send-pdf", async (req, res) => {
    try {
      const { to, pdfUrl } = req.body;
      if (!to || typeof to !== "string") {
        return res.status(400).json({ ok: false, message: "\uC218\uC2E0\uC790 \uC774\uBA54\uC77C(to)\uC774 \uD544\uC694\uD569\uB2C8\uB2E4" });
      }
      if (!pdfUrl || typeof pdfUrl !== "string") {
        return res.status(400).json({ ok: false, message: "PDF URL(pdfUrl)\uC774 \uD544\uC694\uD569\uB2C8\uB2E4" });
      }
      const SMTP_HOST = process.env.SMTP_HOST;
      const SMTP_PORT = process.env.SMTP_PORT;
      const SMTP_USER = process.env.SMTP_USER;
      const SMTP_PASS = process.env.SMTP_PASS;
      if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
        console.error("[send-pdf] Missing SMTP configuration");
        return res.status(500).json({ ok: false, message: "SMTP \uC124\uC815\uC774 \uD544\uC694\uD569\uB2C8\uB2E4 (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS)" });
      }
      console.log(`[send-pdf] Downloading PDF from: ${pdfUrl}`);
      let pdfBuffer;
      try {
        const pdfResponse = await fetch(pdfUrl);
        if (!pdfResponse.ok) {
          console.error(`[send-pdf] PDF download failed: ${pdfResponse.status} ${pdfResponse.statusText}`);
          return res.status(500).json({ ok: false, message: `PDF \uB2E4\uC6B4\uB85C\uB4DC \uC2E4\uD328: ${pdfResponse.status}` });
        }
        const arrayBuffer = await pdfResponse.arrayBuffer();
        pdfBuffer = Buffer.from(arrayBuffer);
        console.log(`[send-pdf] PDF downloaded successfully, size: ${pdfBuffer.length} bytes`);
      } catch (downloadError) {
        console.error("[send-pdf] PDF download error:", downloadError);
        return res.status(500).json({ ok: false, message: "PDF \uD30C\uC77C\uC744 \uB2E4\uC6B4\uB85C\uB4DC\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
      }
      const transporter = nodemailer2.createTransport({
        host: SMTP_HOST,
        port: parseInt(SMTP_PORT, 10),
        secure: parseInt(SMTP_PORT, 10) === 465,
        // true for 465, false for other ports
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS
        }
      });
      console.log(`[send-pdf] Sending email to: ${to}`);
      try {
        const info = await transporter.sendMail({
          from: `FLOXN <${SMTP_USER}>`,
          to,
          subject: "PDF \uD30C\uC77C \uC804\uC1A1",
          text: "\uCCA8\uBD80\uB41C PDF \uD30C\uC77C\uC744 \uD655\uC778\uD574\uC8FC\uC138\uC694.",
          attachments: [
            {
              filename: "document.pdf",
              content: pdfBuffer,
              contentType: "application/pdf"
            }
          ]
        });
        console.log(`[send-pdf] Email sent successfully: ${info.messageId}`);
        return res.json({ ok: true });
      } catch (sendError) {
        console.error("[send-pdf] Email send error:", sendError);
        return res.status(500).json({ ok: false, message: `\uC774\uBA54\uC77C \uC804\uC1A1 \uC2E4\uD328: ${sendError.message}` });
      }
    } catch (error) {
      console.error("[send-pdf] Unexpected error:", error);
      return res.status(500).json({ ok: false, message: `\uC11C\uBC84 \uC624\uB958: ${error.message}` });
    }
  });
  const sendSmsSchema = z2.object({
    to: z2.string().min(10, "\uC720\uD6A8\uD55C \uC804\uD654\uBC88\uD638\uB97C \uC785\uB825\uD574\uC8FC\uC138\uC694").max(20),
    caseNumber: z2.string().optional(),
    insuranceCompany: z2.string().optional(),
    managerName: z2.string().optional(),
    insurancePolicyNo: z2.string().optional(),
    insuranceAccidentNo: z2.string().optional(),
    insuredName: z2.string().optional(),
    insuredContact: z2.string().optional(),
    victimName: z2.string().optional(),
    victimContact: z2.string().optional(),
    investigatorTeamName: z2.string().optional(),
    investigatorContact: z2.string().optional(),
    accidentLocation: z2.string().optional(),
    accidentLocationDetail: z2.string().optional(),
    requestScope: z2.string().optional()
  });
  app2.post("/api/send-sms", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    const currentUser = await storage.getUser(req.session.userId);
    if (!currentUser) {
      return res.status(401).json({ error: "\uC0AC\uC6A9\uC790\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
    }
    if (!["\uAD00\uB9AC\uC790", "\uBCF4\uD5D8\uC0AC"].includes(currentUser.role)) {
      console.log(`[send-sms] Unauthorized role: ${currentUser.role} (user: ${currentUser.username})`);
      return res.status(403).json({ error: "SMS \uBC1C\uC1A1 \uAD8C\uD55C\uC774 \uC5C6\uC2B5\uB2C8\uB2E4" });
    }
    try {
      const validatedData = sendSmsSchema.parse(req.body);
      const {
        to,
        caseNumber,
        insuranceCompany,
        managerName,
        insurancePolicyNo,
        insuranceAccidentNo,
        insuredName,
        insuredContact,
        victimName,
        victimContact,
        investigatorTeamName,
        investigatorContact,
        accidentLocation,
        accidentLocationDetail,
        requestScope
      } = validatedData;
      const SOLAPI_API_KEY = process.env.SOLAPI_API_KEY;
      const SOLAPI_API_SECRET = process.env.SOLAPI_API_SECRET;
      const SOLAPI_SENDER = process.env.SOLAPI_SENDER;
      if (!SOLAPI_API_KEY || !SOLAPI_API_SECRET || !SOLAPI_SENDER) {
        console.error("[send-sms] Missing Solapi configuration");
        return res.status(500).json({
          error: "SMS \uC11C\uBE44\uC2A4\uAC00 \uC124\uC815\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4"
        });
      }
      const normalizedTo = to.replace(/[^0-9]/g, "");
      const normalizedSender = SOLAPI_SENDER.replace(/[^0-9]/g, "");
      if (normalizedTo.length < 10 || normalizedTo.length > 11) {
        return res.status(400).json({ error: "\uC720\uD6A8\uD558\uC9C0 \uC54A\uC740 \uC804\uD654\uBC88\uD638 \uD615\uC2DD\uC785\uB2C8\uB2E4" });
      }
      const messageText = `<\uC811\uC218\uC644\uB8CC \uC54C\uB9BC>

\uC811\uC218\uBC88\uD638 : ${caseNumber || "-"}
\uBCF4\uD5D8\uC0AC : ${insuranceCompany || "-"}
\uB2F4\uB2F9\uC790 : ${managerName || "-"}
\uC99D\uAD8C\uBC88\uD638 : ${insurancePolicyNo || "-"}
\uC0AC\uACE0\uBC88\uD638 : ${insuranceAccidentNo || "-"}
\uD53C\uBCF4\uD5D8\uC790 : ${insuredName || "-"}  \uC5F0\uB77D\uCC98 ${insuredContact || "-"}
\uD53C\uD574\uC790 : ${victimName || "-"}  \uC5F0\uB77D\uCC98 ${victimContact || "-"}
\uC870\uC0AC\uC790 : ${investigatorTeamName || "-"}  \uC5F0\uB77D\uCC98 ${investigatorContact || "-"}
\uC0AC\uACE0\uC7A5\uC18C : ${[accidentLocation, accidentLocationDetail].filter(Boolean).join(" ") || "-"}
\uC758\uB8B0\uBC94\uC704 : ${requestScope || "-"}`;
      console.log(`[send-sms] Sending LMS to: ${normalizedTo} (user: ${req.session.userId})`);
      const payload = {
        message: {
          to: normalizedTo,
          from: normalizedSender,
          text: messageText,
          subject: "\uC811\uC218\uC644\uB8CC \uC54C\uB9BC",
          type: "LMS"
        }
      };
      const body = JSON.stringify(payload);
      const solapiResponse = await solapiHttpsRequest({
        method: "POST",
        path: "/messages/v4/send",
        headers: {
          Authorization: createSolapiAuthHeader(SOLAPI_API_KEY, SOLAPI_API_SECRET),
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body)
        },
        body
      });
      console.log(`[send-sms] LMS sent successfully to ${normalizedTo}`, solapiResponse);
      res.json({
        success: true,
        message: "\uBB38\uC790\uAC00 \uC804\uC1A1\uB418\uC5C8\uC2B5\uB2C8\uB2E4"
      });
    } catch (error) {
      if (error instanceof z2.ZodError) {
        console.error("[send-sms] Validation error:", error.errors);
        return res.status(400).json({ error: "\uC694\uCCAD \uB370\uC774\uD130\uAC00 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4", details: error.errors });
      }
      console.error("[send-sms] SMS send error:", error);
      if (error?.statusCode && error?.body) {
        return res.status(error.statusCode).json({
          error: "\uBB38\uC790 \uC804\uC1A1\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4",
          statusCode: error.statusCode,
          details: error.body
        });
      }
      const errorMessage = error instanceof Error ? error.message : "\uC54C \uC218 \uC5C6\uB294 \uC624\uB958";
      const errorDetails = error instanceof Error ? error.stack : JSON.stringify(error);
      res.status(500).json({
        error: "\uBB38\uC790 \uC804\uC1A1\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4",
        details: errorMessage,
        stack: errorDetails
      });
    }
  });
  const accountNotificationSchema = z2.object({
    sendEmail: z2.boolean().default(false),
    sendSms: z2.boolean().default(false),
    email: z2.string().email().optional().nullable(),
    phone: z2.string().optional().nullable(),
    name: z2.string(),
    username: z2.string(),
    password: z2.string(),
    role: z2.string(),
    company: z2.string().optional().nullable()
  });
  app2.post("/api/send-account-notification", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    const currentUser = await storage.getUser(req.session.userId);
    if (!currentUser) {
      return res.status(401).json({ error: "\uC0AC\uC6A9\uC790\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
    }
    if (currentUser.role !== "\uAD00\uB9AC\uC790") {
      return res.status(403).json({ error: "\uACC4\uC815 \uC0DD\uC131 \uC548\uB0B4 \uBC1C\uC1A1 \uAD8C\uD55C\uC774 \uC5C6\uC2B5\uB2C8\uB2E4" });
    }
    try {
      const validatedData = accountNotificationSchema.parse(req.body);
      const { sendEmail, sendSms, email, phone, name, username, password, role, company } = validatedData;
      const results = {
        emailSent: false,
        smsSent: false,
        errors: []
      };
      const roleNames = {
        admin: "\uAD00\uB9AC\uC790",
        insurer: "\uBCF4\uD5D8\uC0AC",
        partner: "\uD611\uB825\uC0AC",
        assessor: "\uC2EC\uC0AC\uC0AC",
        investigator: "\uC870\uC0AC\uC0AC",
        client: "\uC758\uB8B0\uC0AC",
        \uAD00\uB9AC\uC790: "\uAD00\uB9AC\uC790",
        \uBCF4\uD5D8\uC0AC: "\uBCF4\uD5D8\uC0AC",
        \uD611\uB825\uC0AC: "\uD611\uB825\uC0AC",
        \uC2EC\uC0AC\uC0AC: "\uC2EC\uC0AC\uC0AC",
        \uC870\uC0AC\uC0AC: "\uC870\uC0AC\uC0AC",
        \uC758\uB8B0\uC0AC: "\uC758\uB8B0\uC0AC"
      };
      const roleName = roleNames[role] || role;
      if (sendEmail && email) {
        try {
          await sendAccountCreationEmail(email, {
            name,
            username,
            password,
            role,
            company: company || void 0
          });
          results.emailSent = true;
          console.log(`[send-account-notification] Email sent to ${email}`);
        } catch (emailError) {
          console.error("[send-account-notification] Email error:", emailError);
          results.errors.push("\uC774\uBA54\uC77C \uC804\uC1A1 \uC2E4\uD328");
        }
      }
      if (sendSms && phone) {
        const SOLAPI_API_KEY = process.env.SOLAPI_API_KEY;
        const SOLAPI_API_SECRET = process.env.SOLAPI_API_SECRET;
        const SOLAPI_SENDER = process.env.SOLAPI_SENDER;
        if (!SOLAPI_API_KEY || !SOLAPI_API_SECRET || !SOLAPI_SENDER) {
          results.errors.push("SMS \uC11C\uBE44\uC2A4\uAC00 \uC124\uC815\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4");
        } else {
          const normalizedPhone = phone.replace(/[^0-9]/g, "");
          const normalizedSender = SOLAPI_SENDER.replace(/[^0-9]/g, "");
          if (normalizedPhone.length < 10 || normalizedPhone.length > 11) {
            results.errors.push("\uC720\uD6A8\uD558\uC9C0 \uC54A\uC740 \uC804\uD654\uBC88\uD638 \uD615\uC2DD\uC785\uB2C8\uB2E4");
          } else {
            const messageText = `[FLOXN \uACC4\uC815 \uC0DD\uC131 \uC548\uB0B4]

\uC548\uB155\uD558\uC138\uC694, ${name}\uB2D8.
FLOXN \uD50C\uB7AB\uD3FC \uACC4\uC815\uC774 \uC0DD\uC131\uB418\uC5C8\uC2B5\uB2C8\uB2E4.

\u25B6 \uACC4\uC815 \uC815\uBCF4
- \uC774\uB984: ${name}
- \uC18C\uC18D: ${company || "-"}
- \uC5ED\uD560: ${roleName}
- \uC544\uC774\uB514: ${username}
- \uBE44\uBC00\uBC88\uD638: ${password}

\u25B6 \uB85C\uADF8\uC778 \uC8FC\uC18C
https://peulrogseun-aqaqaq4561.replit.app

\uB85C\uADF8\uC778 \uD6C4 \uBC18\uB4DC\uC2DC \uBE44\uBC00\uBC88\uD638\uB97C \uBCC0\uACBD\uD574 \uC8FC\uC138\uC694.`;
            try {
              const payload = {
                message: {
                  to: normalizedPhone,
                  from: normalizedSender,
                  text: messageText,
                  subject: "FLOXN \uACC4\uC815 \uC0DD\uC131 \uC548\uB0B4",
                  type: "LMS"
                }
              };
              const body = JSON.stringify(payload);
              await solapiHttpsRequest({
                method: "POST",
                path: "/messages/v4/send",
                headers: {
                  Authorization: createSolapiAuthHeader(SOLAPI_API_KEY, SOLAPI_API_SECRET),
                  "Content-Type": "application/json",
                  "Content-Length": Buffer.byteLength(body)
                },
                body
              });
              results.smsSent = true;
              console.log(`[send-account-notification] SMS sent to ${normalizedPhone}`);
            } catch (smsError) {
              console.error("[send-account-notification] SMS error:", smsError);
              results.errors.push("SMS \uC804\uC1A1 \uC2E4\uD328");
            }
          }
        }
      }
      if (results.emailSent || results.smsSent) {
        let message = "";
        if (results.emailSent && results.smsSent) {
          message = "\uC774\uBA54\uC77C\uACFC \uBB38\uC790\uAC00 \uC804\uC1A1\uB418\uC5C8\uC2B5\uB2C8\uB2E4";
        } else if (results.emailSent) {
          message = "\uC774\uBA54\uC77C\uC774 \uC804\uC1A1\uB418\uC5C8\uC2B5\uB2C8\uB2E4";
        } else {
          message = "\uBB38\uC790\uAC00 \uC804\uC1A1\uB418\uC5C8\uC2B5\uB2C8\uB2E4";
        }
        res.json({ success: true, message, ...results });
      } else if (results.errors.length > 0) {
        res.status(500).json({ success: false, error: results.errors.join(", "), ...results });
      } else {
        res.json({ success: true, message: "\uBC1C\uC1A1 \uB300\uC0C1\uC774 \uC5C6\uC2B5\uB2C8\uB2E4", ...results });
      }
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ error: "\uC694\uCCAD \uB370\uC774\uD130\uAC00 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4", details: error.errors });
      }
      console.error("[send-account-notification] Error:", error);
      res.status(500).json({ error: "\uC54C\uB9BC \uBC1C\uC1A1\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  const stageNotificationSchema = z2.object({
    caseId: z2.string(),
    stage: z2.enum([
      "\uC811\uC218\uC644\uB8CC",
      "\uD604\uC7A5\uC815\uBCF4\uC785\uB825",
      "\uBC18\uB824",
      "\uD604\uC7A5\uC815\uBCF4\uC81C\uCD9C",
      "\uBCF5\uAD6C\uC694\uCCAD",
      "\uC9C1\uC811\uBCF5\uAD6C",
      "\uBBF8\uBCF5\uAD6C",
      "\uCCAD\uAD6C\uC790\uB8CC\uC81C\uCD9C",
      "\uCCAD\uAD6C",
      "\uACB0\uC815\uAE08\uC561/\uC218\uC218\uB8CC",
      "\uC811\uC218\uCDE8\uC18C",
      "\uC785\uAE08\uC644\uB8CC",
      "\uBD80\uBD84\uC785\uAE08",
      "\uC815\uC0B0\uC644\uB8CC",
      "\uC120\uACAC\uC801\uC694\uCCAD"
    ]),
    recipients: z2.object({
      partner: z2.boolean().default(false),
      manager: z2.boolean().default(false),
      assessorInvestigator: z2.boolean().default(false)
    }),
    additionalMessage: z2.string().optional(),
    // 접수취소 사유 (접수취소 단계에서만 사용)
    cancelReason: z2.string().optional(),
    // 결정금액/수수료 정보 (결정금액수수료 단계에서만 사용)
    recoveryAmount: z2.number().optional(),
    feeRate: z2.number().optional(),
    paymentAmount: z2.number().optional()
  });
  app2.post("/api/send-stage-notification", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "\uC778\uC99D\uB418\uC9C0 \uC54A\uC740 \uC0AC\uC6A9\uC790\uC785\uB2C8\uB2E4" });
    }
    const currentUser = await storage.getUser(req.session.userId);
    if (!currentUser) {
      return res.status(401).json({ error: "\uC0AC\uC6A9\uC790\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
    }
    if (!["\uAD00\uB9AC\uC790", "\uD611\uB825\uC0AC"].includes(currentUser.role)) {
      console.log(`[send-stage-notification] Unauthorized role: ${currentUser.role} (user: ${currentUser.username})`);
      return res.status(403).json({ error: "SMS \uBC1C\uC1A1 \uAD8C\uD55C\uC774 \uC5C6\uC2B5\uB2C8\uB2E4" });
    }
    try {
      const validatedData = stageNotificationSchema.parse(req.body);
      const { caseId, stage, recipients, additionalMessage, cancelReason, recoveryAmount, feeRate, paymentAmount } = validatedData;
      const SOLAPI_API_KEY = process.env.SOLAPI_API_KEY;
      const SOLAPI_API_SECRET = process.env.SOLAPI_API_SECRET;
      const SOLAPI_SENDER = process.env.SOLAPI_SENDER;
      if (!SOLAPI_API_KEY || !SOLAPI_API_SECRET || !SOLAPI_SENDER) {
        console.error("[send-stage-notification] Missing Solapi configuration");
        return res.status(500).json({ error: "SMS \uC11C\uBE44\uC2A4\uAC00 \uC124\uC815\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4" });
      }
      const caseData = await storage.getCaseById(caseId);
      if (!caseData) {
        return res.status(404).json({ error: "\uCF00\uC774\uC2A4\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
      }
      let managerData = null;
      if (caseData.managerId) {
        managerData = await storage.getUser(caseData.managerId);
      }
      const normalizedSender = SOLAPI_SENDER.replace(/[^0-9]/g, "");
      const phoneNumbers = [];
      if (recipients.partner && caseData.assignedPartnerContact) {
        const normalizedPhone = caseData.assignedPartnerContact.replace(/[^0-9]/g, "");
        if (normalizedPhone.length >= 10 && normalizedPhone.length <= 11) {
          phoneNumbers.push({
            type: "\uD611\uB825\uC5C5\uCCB4",
            phone: normalizedPhone,
            name: caseData.assignedPartner || "\uD611\uB825\uC5C5\uCCB4"
          });
        }
      }
      if (recipients.manager && managerData?.phone) {
        const normalizedPhone = managerData.phone.replace(/[^0-9]/g, "");
        if (normalizedPhone.length >= 10 && normalizedPhone.length <= 11) {
          phoneNumbers.push({
            type: "\uD50C\uB85D\uC2A8\uB2F4\uB2F9\uC790",
            phone: normalizedPhone,
            name: managerData.name || "\uB2F4\uB2F9\uC790"
          });
        }
      }
      if (recipients.assessorInvestigator) {
        if (caseData.assessorContact) {
          const normalizedPhone = caseData.assessorContact.replace(/[^0-9]/g, "");
          if (normalizedPhone.length >= 10 && normalizedPhone.length <= 11) {
            phoneNumbers.push({
              type: "\uC2EC\uC0AC\uC790",
              phone: normalizedPhone,
              name: caseData.assessorId || "\uC2EC\uC0AC\uC790"
            });
          }
        }
        if (caseData.investigatorContact) {
          const normalizedPhone = caseData.investigatorContact.replace(/[^0-9]/g, "");
          if (normalizedPhone.length >= 10 && normalizedPhone.length <= 11) {
            phoneNumbers.push({
              type: "\uC870\uC0AC\uC790",
              phone: normalizedPhone,
              name: caseData.investigatorTeamName || "\uC870\uC0AC\uC790"
            });
          }
        }
      }
      if (phoneNumbers.length === 0) {
        return res.status(400).json({ error: "\uBC1C\uC1A1\uD560 \uC5F0\uB77D\uCC98\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4" });
      }
      let messageText = "";
      let subject = "";
      if (stage === "\uC811\uC218\uC644\uB8CC") {
        subject = "\uC811\uC218\uC644\uB8CC \uC54C\uB9BC";
        messageText = `<\uC811\uC218\uC644\uB8CC \uC54C\uB9BC>

\uC811\uC218\uBC88\uD638 : ${caseData.caseNumber || "-"}
\uBCF4\uD5D8\uC0AC : ${caseData.insuranceCompany || "-"}
\uB2F4\uB2F9\uC790 : ${managerData?.name || "-"}
\uC99D\uAD8C\uBC88\uD638 : ${caseData.insurancePolicyNo || "-"}
\uC0AC\uACE0\uBC88\uD638 : ${caseData.insuranceAccidentNo || "-"}
\uD53C\uBCF4\uD5D8\uC790 : ${caseData.insuredName || "-"}  \uC5F0\uB77D\uCC98 ${caseData.insuredContact || "-"}
\uD53C\uD574\uC790 : ${caseData.victimName || "-"}  \uC5F0\uB77D\uCC98 ${caseData.victimContact || "-"}
\uC870\uC0AC\uC790 : ${caseData.investigatorTeamName || "-"}  \uC5F0\uB77D\uCC98 ${caseData.investigatorContact || "-"}
\uC0AC\uACE0\uC7A5\uC18C : ${[caseData.insuredAddress, caseData.insuredAddressDetail].filter(Boolean).join(" ") || "-"}
\uC758\uB8B0\uBC94\uC704 : ${[caseData.damagePreventionCost === "true" ? "\uC190\uBC29" : null, caseData.victimIncidentAssistance === "true" ? "\uB300\uBB3C" : null].filter(Boolean).join(", ") || "\uAE30\uD0C0"}`;
      } else if (stage === "\uC811\uC218\uCDE8\uC18C") {
        subject = "\uC811\uC218\uCDE8\uC18C \uC54C\uB9BC";
        messageText = `<\uC811\uC218\uCDE8\uC18C \uC54C\uB9BC>

\uC811\uC218\uBC88\uD638 : ${caseData.caseNumber || "-"}
\uBCF4\uD5D8\uC0AC : ${caseData.insuranceCompany || "-"}
\uC99D\uAD8C\uBC88\uD638 : ${caseData.insurancePolicyNo || "-"}
\uC0AC\uACE0\uBC88\uD638 : ${caseData.insuranceAccidentNo || "-"}
\uD53C\uBCF4\uD5D8\uC790 : ${caseData.insuredName || "-"}
\uC0AC\uACE0\uC7A5\uC18C : ${[caseData.insuredAddress, caseData.insuredAddressDetail].filter(Boolean).join(" ") || "-"}

\uC704 \uC811\uC218\uAC74\uC740 \uC811\uC218 \uCDE8\uC18C \uB418\uC5C8\uC74C\uC744 \uC54C\uB824\uB4DC\uB9BD\uB2C8\uB2E4.
\uCDE8\uC18C \uC0AC\uC720 : ${cancelReason || "-"}`;
      } else if (stage === "\uACB0\uC815\uAE08\uC561/\uC218\uC218\uB8CC") {
        subject = "\uACB0\uC815\uAE08\uC561 \uBC0F \uC218\uC218\uB8CC \uC548\uB0B4";
        messageText = `<\uACB0\uC815\uAE08\uC561 \uBC0F \uC218\uC218\uB8CC\uC548\uB0B4 \uC54C\uB9BC>

\uC811\uC218\uBC88\uD638 : ${caseData.caseNumber || "-"}
\uBCF4\uD5D8\uC0AC : ${caseData.insuranceCompany || "-"}
\uC99D\uAD8C\uBC88\uD638 : ${caseData.insurancePolicyNo || "-"}
\uC0AC\uACE0\uBC88\uD638 : ${caseData.insuranceAccidentNo || "-"}
\uD53C\uBCF4\uD5D8\uC790 : ${caseData.insuredName || "-"}
\uC0AC\uACE0\uC7A5\uC18C : ${[caseData.insuredAddress, caseData.insuredAddressDetail].filter(Boolean).join(" ") || "-"}
\uBCF5\uAD6C\uAE08\uC561 : ${recoveryAmount?.toLocaleString() || "-"}\uC6D0
\uC218\uC218\uB8CC : \uCD5C\uC885\uAE08\uC561\uC758 ${feeRate || "-"}%
\uC9C0\uAE09\uAE08\uC561 : ${paymentAmount?.toLocaleString() || "-"}\uC6D0`;
      } else {
        const stageDisplayName = stage === "\uC9C1\uC811\uBCF5\uAD6C" || stage === "\uBBF8\uBCF5\uAD6C" ? `${stage}` : stage;
        subject = `${stageDisplayName} \uC54C\uB9BC`;
        messageText = `<${stageDisplayName} \uC54C\uB9BC>

\uC811\uC218\uBC88\uD638 : ${caseData.caseNumber || "-"}
\uBCF4\uD5D8\uC0AC : ${caseData.insuranceCompany || "-"}
\uC99D\uAD8C\uBC88\uD638 : ${caseData.insurancePolicyNo || "-"}
\uC0AC\uACE0\uBC88\uD638 : ${caseData.insuranceAccidentNo || "-"}
\uD53C\uBCF4\uD5D8\uC790 : ${caseData.insuredName || "-"}
\uC0AC\uACE0\uC7A5\uC18C : ${[caseData.insuredAddress, caseData.insuredAddressDetail].filter(Boolean).join(" ") || "-"}
\uC9C4\uD589\uC0AC\uD56D : ${stageDisplayName}`;
      }
      if (additionalMessage) {
        messageText += `

\uCD94\uAC00\uC0AC\uD56D : ${additionalMessage}`;
      }
      console.log(`[send-stage-notification] Stage: ${stage}, Recipients request:`, JSON.stringify(recipients));
      console.log(`[send-stage-notification] Phone numbers collected: ${phoneNumbers.length}`, phoneNumbers.map((p) => `${p.type}:${p.phone}`).join(", "));
      const results = [];
      for (const recipient of phoneNumbers) {
        try {
          const payload = {
            message: {
              to: recipient.phone,
              from: normalizedSender,
              text: messageText,
              subject,
              type: "LMS"
            }
          };
          const body = JSON.stringify(payload);
          await solapiHttpsRequest({
            method: "POST",
            path: "/messages/v4/send",
            headers: {
              Authorization: createSolapiAuthHeader(SOLAPI_API_KEY, SOLAPI_API_SECRET),
              "Content-Type": "application/json",
              "Content-Length": Buffer.byteLength(body)
            },
            body
          });
          console.log(`[send-stage-notification] LMS sent to ${recipient.type}: ${recipient.phone}`);
          results.push({ type: recipient.type, name: recipient.name, success: true });
        } catch (sendError) {
          console.error(`[send-stage-notification] Failed to send to ${recipient.type}:`, sendError);
          results.push({
            type: recipient.type,
            name: recipient.name,
            success: false,
            error: sendError?.body?.message || sendError?.message || "\uBC1C\uC1A1 \uC2E4\uD328"
          });
        }
      }
      const successCount = results.filter((r) => r.success).length;
      const failCount = results.filter((r) => !r.success).length;
      res.json({
        success: successCount > 0,
        message: `${successCount}\uAC74 \uBC1C\uC1A1 \uC644\uB8CC${failCount > 0 ? `, ${failCount}\uAC74 \uC2E4\uD328` : ""}`,
        results
      });
    } catch (error) {
      if (error instanceof z2.ZodError) {
        console.error("[send-stage-notification] Validation error:", error.errors);
        return res.status(400).json({ error: "\uC694\uCCAD \uB370\uC774\uD130\uAC00 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4", details: error.errors });
      }
      console.error("[send-stage-notification] Error:", error);
      res.status(500).json({
        error: "\uC54C\uB9BC \uBC1C\uC1A1\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4",
        details: error instanceof Error ? error.message : "\uC54C \uC218 \uC5C6\uB294 \uC624\uB958"
      });
    }
  });
  app2.post("/api/settlements", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "\uB85C\uADF8\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4" });
      }
      const validatedData = insertSettlementSchema.parse(req.body);
      const settlement = await storage.createSettlement(
        validatedData,
        req.session.userId
      );
      res.status(201).json(settlement);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create settlement error:", error);
      res.status(500).json({ error: "\uC815\uC0B0 \uC0DD\uC131 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.get("/api/settlements", async (req, res) => {
    try {
      const settlements2 = await storage.getAllSettlements();
      res.json(settlements2);
    } catch (error) {
      console.error("Get all settlements error:", error);
      res.status(500).json({ error: "\uC815\uC0B0 \uBAA9\uB85D \uC870\uD68C \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.get("/api/settlements/case/:caseId", async (req, res) => {
    try {
      const { caseId } = req.params;
      const settlements2 = await storage.getSettlementsByCaseId(caseId);
      res.json(settlements2);
    } catch (error) {
      console.error("Get settlements by case error:", error);
      res.status(500).json({ error: "\uCF00\uC774\uC2A4\uBCC4 \uC815\uC0B0 \uC870\uD68C \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.get("/api/settlements/case/:caseId/latest", async (req, res) => {
    try {
      const { caseId } = req.params;
      const settlement = await storage.getLatestSettlementByCaseId(caseId);
      res.json(settlement);
    } catch (error) {
      console.error("Get latest settlement error:", error);
      res.status(500).json({ error: "\uCD5C\uC2E0 \uC815\uC0B0 \uC870\uD68C \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.patch("/api/settlements/:id", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "\uB85C\uADF8\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4" });
      }
      const { id } = req.params;
      const updated = await storage.updateSettlement(id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "\uC815\uC0B0 \uC815\uBCF4\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Update settlement error:", error);
      res.status(500).json({ error: "\uC815\uC0B0 \uC218\uC815 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.get("/api/labor-rate-tiers", async (req, res) => {
    try {
      const tiers = await storage.getLaborRateTiers();
      res.json(tiers);
    } catch (error) {
      console.error("Get labor rate tiers error:", error);
      res.status(500).json({ error: "\uB178\uC784\uB2E8\uAC00 \uC801\uC6A9\uB960 \uC870\uD68C \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.put("/api/labor-rate-tiers", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "\uB85C\uADF8\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4" });
      }
      const { tiers } = req.body;
      if (!Array.isArray(tiers)) {
        return res.status(400).json({ error: "tiers \uBC30\uC5F4\uC774 \uD544\uC694\uD569\uB2C8\uB2E4" });
      }
      const updatedTiers = await storage.updateLaborRateTiers(tiers);
      res.json(updatedTiers);
    } catch (error) {
      console.error("Update labor rate tiers error:", error);
      res.status(500).json({ error: "\uB178\uC784\uB2E8\uAC00 \uC801\uC6A9\uB960 \uC218\uC815 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.post("/api/invoices", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "\uB85C\uADF8\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4" });
      }
      const invoice = await storage.createInvoice(req.body, req.session.userId);
      res.status(201).json(invoice);
    } catch (error) {
      console.error("Create invoice error:", error);
      res.status(500).json({ error: "\uC778\uBCF4\uC774\uC2A4 \uC0DD\uC131 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.patch("/api/invoices/:id", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "\uB85C\uADF8\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4" });
      }
      const { id } = req.params;
      const invoice = await storage.updateInvoice(id, req.body);
      if (!invoice) {
        return res.status(404).json({ error: "\uC778\uBCF4\uC774\uC2A4\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
      }
      res.json(invoice);
    } catch (error) {
      console.error("Update invoice error:", error);
      res.status(500).json({ error: "\uC778\uBCF4\uC774\uC2A4 \uC218\uC815 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.get("/api/invoices", async (req, res) => {
    try {
      const invoices2 = await storage.getAllInvoices();
      res.json(invoices2);
    } catch (error) {
      console.error("Get all invoices error:", error);
      res.status(500).json({ error: "\uC778\uBCF4\uC774\uC2A4 \uBAA9\uB85D \uC870\uD68C \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.get("/api/invoices/approved", async (req, res) => {
    try {
      const invoices2 = await storage.getApprovedInvoices();
      res.json(invoices2);
    } catch (error) {
      console.error("Get approved invoices error:", error);
      res.status(500).json({ error: "\uC2B9\uC778\uB41C \uC778\uBCF4\uC774\uC2A4 \uC870\uD68C \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.get("/api/invoices/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const invoice = await storage.getInvoiceById(id);
      if (!invoice) {
        return res.status(404).json({ error: "\uC778\uBCF4\uC774\uC2A4\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
      }
      res.json(invoice);
    } catch (error) {
      console.error("Get invoice error:", error);
      res.status(500).json({ error: "\uC778\uBCF4\uC774\uC2A4 \uC870\uD68C \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.get("/api/invoices/case/:caseId", async (req, res) => {
    try {
      const { caseId } = req.params;
      const invoice = await storage.getInvoiceByCaseId(caseId);
      res.json(invoice);
    } catch (error) {
      console.error("Get invoice by case error:", error);
      res.status(500).json({ error: "\uCF00\uC774\uC2A4\uBCC4 \uC778\uBCF4\uC774\uC2A4 \uC870\uD68C \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.get("/api/invoices/group/:prefix", async (req, res) => {
    try {
      const { prefix } = req.params;
      const invoice = await storage.getInvoiceByCaseGroupPrefix(prefix);
      res.json(invoice);
    } catch (error) {
      console.error("Get invoice by group prefix error:", error);
      res.status(500).json({ error: "\uADF8\uB8F9\uBCC4 \uC778\uBCF4\uC774\uC2A4 \uC870\uD68C \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.get("/api/invoice-amounts/:prefix", async (req, res) => {
    try {
      const { prefix } = req.params;
      const allCases = await storage.getAllCases();
      const groupCases = allCases.filter((c) => {
        if (!c.caseNumber) return false;
        const casePrefix = c.caseNumber.split("-")[0];
        return casePrefix === prefix;
      });
      const approvedStatuses = [
        "1\uCC28\uC2B9\uC778",
        "\uD604\uC7A5\uC815\uBCF4\uC81C\uCD9C",
        "\uBCF5\uAD6C\uC694\uCCAD(2\uCC28\uC2B9\uC778)",
        "\uC9C1\uC811\uBCF5\uAD6C",
        "\uC120\uACAC\uC801\uC694\uCCAD",
        "(\uC9C1\uC811\uBCF5\uAD6C\uC778 \uACBD\uC6B0) \uCCAD\uAD6C\uC790\uB8CC\uC81C\uCD9C",
        "(\uC120\uACAC\uC801\uC694\uCCAD\uC778 \uACBD\uC6B0) \uCD9C\uB3D9\uBE44 \uCCAD\uAD6C",
        "\uCCAD\uAD6C",
        "\uC785\uAE08\uC644\uB8CC",
        "\uBD80\uBD84\uC785\uAE08",
        "\uC815\uC0B0\uC644\uB8CC"
      ];
      let damagePreventionAmount = 0;
      let propertyRepairAmount = 0;
      for (const c of groupCases) {
        if (!c.caseNumber || !approvedStatuses.includes(c.status || "")) continue;
        const suffix = c.caseNumber.split("-")[1];
        const amount = parseInt(c.approvedAmount || c.estimateAmount || "0") || 0;
        if (suffix === "0") {
          damagePreventionAmount += amount;
        } else if (suffix && parseInt(suffix) >= 1) {
          propertyRepairAmount += amount;
        }
      }
      res.json({
        damagePreventionAmount,
        propertyRepairAmount,
        totalAmount: damagePreventionAmount + propertyRepairAmount
      });
    } catch (error) {
      console.error("Get invoice amounts error:", error);
      res.status(500).json({ error: "\uC778\uBCF4\uC774\uC2A4 \uAE08\uC561 \uC870\uD68C \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  const pdfDownloadSchema = z2.object({
    caseId: z2.string().min(1),
    sections: z2.object({
      cover: z2.boolean().default(false),
      fieldReport: z2.boolean().default(false),
      drawing: z2.boolean().default(false),
      evidence: z2.boolean().default(false),
      estimate: z2.boolean().default(false),
      etc: z2.boolean().default(false)
    }),
    evidence: z2.object({
      tab: z2.string().default("\uC804\uCCB4"),
      selectedFileIds: z2.array(z2.string()).default([])
    }).default({ tab: "\uC804\uCCB4", selectedFileIds: [] })
  });
  app2.post("/api/pdf/download", async (req, res) => {
    try {
      const payload = pdfDownloadSchema.parse(req.body);
      const pdfBuffer = await generatePdf(payload);
      const caseData = await storage.getCaseById(payload.caseId);
      const filename = caseData?.caseNumber ? `\uD604\uC7A5\uCD9C\uB3D9\uBCF4\uACE0\uC11C_${caseData.caseNumber}.pdf` : `\uD604\uC7A5\uCD9C\uB3D9\uBCF4\uACE0\uC11C_${payload.caseId}.pdf`;
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
      res.setHeader("Content-Length", pdfBuffer.length);
      res.send(pdfBuffer);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("PDF generation error:", error);
      res.status(500).json({ error: "PDF \uC0DD\uC131 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  app2.get("/api/admin/backfill-initial-estimates", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "\uC778\uC99D\uC774 \uD544\uC694\uD569\uB2C8\uB2E4. \uB85C\uADF8\uC778 \uD6C4 \uC774 URL\uC744 \uBC29\uBB38\uD558\uC138\uC694." });
      }
      const user = await storage.getUser(req.session.userId);
      if (!user || user.role !== "\uAD00\uB9AC\uC790") {
        return res.status(403).json({ error: "\uAD00\uB9AC\uC790 \uAD8C\uD55C\uC774 \uD544\uC694\uD569\uB2C8\uB2E4" });
      }
      const result1 = await db.execute(sql4`
        UPDATE cases 
        SET initial_estimate_amount = estimate_amount 
        WHERE estimate_amount IS NOT NULL 
          AND initial_estimate_amount IS NULL 
          AND field_survey_status IN ('submitted', 'approved', 'rejected')
        RETURNING id, case_number
      `);
      const result2 = await db.execute(sql4`
        UPDATE cases 
        SET initial_prevention_estimate_amount = estimate_amount 
        WHERE estimate_amount IS NOT NULL 
          AND (initial_prevention_estimate_amount IS NULL OR initial_prevention_estimate_amount = '')
          AND field_survey_status IN ('submitted', 'approved', 'rejected')
          AND case_number LIKE '%-0'
        RETURNING id, case_number, estimate_amount
      `);
      const result3 = await db.execute(sql4`
        UPDATE cases 
        SET initial_property_estimate_amount = estimate_amount 
        WHERE estimate_amount IS NOT NULL 
          AND (initial_property_estimate_amount IS NULL OR initial_property_estimate_amount = '')
          AND field_survey_status IN ('submitted', 'approved', 'rejected')
          AND case_number ~ '-[1-9][0-9]*$'
        RETURNING id, case_number, estimate_amount
      `);
      console.log("[Backfill] Updated initial_estimate_amount:", result1.rows.length);
      console.log("[Backfill] Updated initial_prevention_estimate_amount:", result2.rows.length);
      console.log("[Backfill] Updated initial_property_estimate_amount:", result3.rows.length);
      res.json({
        success: true,
        message: `\uBC31\uD544 \uC644\uB8CC: initial_estimate_amount=${result1.rows.length}\uAC74, \uC190\uD574\uBC29\uC9C0\uBE44\uC6A9=${result2.rows.length}\uAC74, \uB300\uBB3C\uBE44\uC6A9=${result3.rows.length}\uAC74`,
        details: {
          initialEstimate: result1.rows.length,
          prevention: result2.rows,
          property: result3.rows
        }
      });
    } catch (error) {
      console.error("Backfill error:", error);
      res.status(500).json({ error: "\uBC31\uD544 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs2 from "fs";
import path3 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path2 from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      ),
      await import("@replit/vite-plugin-dev-banner").then(
        (m) => m.devBanner()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path2.resolve(import.meta.dirname, "client", "src"),
      "@shared": path2.resolve(import.meta.dirname, "shared"),
      "@assets": path2.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path2.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path2.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path3.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs2.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path3.resolve(import.meta.dirname, "public");
  if (!fs2.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path3.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
var MemoryStore = createMemoryStore(session);
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}
app.use(session({
  secret: process.env.SESSION_SECRET || "insurance-system-secret-key-change-in-production",
  resave: false,
  saveUninitialized: false,
  store: new MemoryStore({
    checkPeriod: 864e5
  }),
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1e3,
    sameSite: "lax"
  }
}));
app.use(express2.json({
  limit: "500mb",
  // 대용량 파일 처리를 위해 크기 제한 대폭 증가
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express2.urlencoded({ extended: false, limit: "500mb" }));
app.use((req, res, next) => {
  const start = Date.now();
  const path4 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path4.startsWith("/api")) {
      let logLine = `${req.method} ${path4} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  try {
    const migratedCount = await storage.migrateExistingCaseDates();
    if (migratedCount > 0) {
      log(`Date migration completed: ${migratedCount} cases updated`);
    }
  } catch (error) {
    console.error("Date migration failed:", error);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.timeout = 3e5;
  server.keepAliveTimeout = 12e4;
  server.headersTimeout = 31e4;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port} (timeout: ${server.timeout}ms)`);
  });
})();
