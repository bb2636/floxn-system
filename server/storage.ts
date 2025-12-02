import { type User, type InsertUser, users, type Case, type CaseWithLatestProgress, type InsertCase, cases, type ProgressUpdate, type InsertProgressUpdate, progressUpdates, type RolePermission, type InsertRolePermission, rolePermissions, type ExcelData, type InsertExcelData, excelData, type Inquiry, type InsertInquiry, type UpdateInquiry, inquiries, type Drawing, type InsertDrawing, drawings, type SharedDrawing, type InsertSharedDrawing, sharedDrawings, type FieldSurveyData, type InsertFieldSurveyData, fieldSurveyData, type CaseDocument, type InsertCaseDocument, caseDocuments, type MasterData, type InsertMasterData, masterData, type Estimate, type InsertEstimate, estimates, type EstimateRow, type InsertEstimateRow, estimateRows, type LaborCost, type InsertLaborCost, laborCosts, type Material, type InsertMaterial, materials, type UserFavorite, type InsertUserFavorite, userFavorites, type Notice, type InsertNotice, notices } from "@shared/schema";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";
import { db } from "./db";
import { eq, asc, desc, and, or, like, sql } from "drizzle-orm";

const SALT_ROUNDS = 10;

// Get current date in KST (Korea Standard Time, UTC+9)
function getKSTDate(): string {
  const kstDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const year = kstDate.getFullYear();
  const month = String(kstDate.getMonth() + 1).padStart(2, '0');
  const day = String(kstDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getKSTTimestamp(): string {
  const now = new Date();
  const kstDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  
  const year = kstDate.getFullYear();
  const month = String(kstDate.getMonth() + 1).padStart(2, '0');
  const day = String(kstDate.getDate()).padStart(2, '0');
  const hours = String(kstDate.getHours()).padStart(2, '0');
  const minutes = String(kstDate.getMinutes()).padStart(2, '0');
  const seconds = String(kstDate.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+09:00`;
}

// Check if user has team leader level authority (팀장, 부장, 차장, 과장)
function isTeamLeader(position: string | null): boolean {
  if (!position) return false;
  return ["팀장", "부장", "차장", "과장"].includes(position);
}

export interface PartnerStats {
  partnerName: string;
  dailyCount: number; // 일배당건수
  monthlyCount: number; // 월배당건수
  inProgressCount: number; // 진행건수
  pendingCount: number; // 미결건수
}

export interface StatisticsFilters {
  insuranceCompanies: string[];
  assessors: string[];
  investigators: string[];
  partners: string[];
  settlementManagers: string[];
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  verifyPassword(username: string, password: string): Promise<User | null>;
  updatePassword(username: string, newPassword: string): Promise<User | null>;
  deleteAccount(username: string): Promise<User | null>;
  getNextCaseSequence(date: string, insuranceAccidentNo?: string): Promise<{ prefix: string; suffix: number }>;
  createCase(caseData: Omit<InsertCase, "caseNumber"> & { caseNumber: string; createdBy: string }): Promise<Case>;
  getCaseById(caseId: string): Promise<Case | null>;
  getAssignedCasesForUser(user: User, search?: string): Promise<Case[]>;
  getAllCases(user?: User): Promise<CaseWithLatestProgress[]>;
  updateCase(caseId: string, caseData: Partial<InsertCase>): Promise<Case | null>;
  deleteCase(caseId: string): Promise<void>;
  updateCaseStatus(caseId: string, status: string): Promise<Case | null>;
  updateCaseSpecialNotes(caseId: string, specialNotes: string | null): Promise<Case | null>;
  confirmCaseSpecialNotes(caseId: string, confirmedBy: string): Promise<Case | null>;
  updateCaseAdditionalNotes(caseId: string, additionalNotes: string | null): Promise<Case | null>;
  updateCaseEstimateAmount(caseId: string, estimateAmount: string): Promise<Case | null>;
  submitFieldSurvey(caseId: string): Promise<Case | null>;
  reviewCase(caseId: string, decision: "승인" | "비승인", reviewComment: string | null, reviewedBy: string): Promise<Case | null>;
  getPartnerStats(): Promise<PartnerStats[]>;
  createProgressUpdate(data: InsertProgressUpdate): Promise<ProgressUpdate>;
  getProgressUpdatesByCaseId(caseId: string): Promise<ProgressUpdate[]>;
  getStatisticsFilters(): Promise<StatisticsFilters>;
  getRolePermission(roleName: string): Promise<RolePermission | undefined>;
  saveRolePermission(data: InsertRolePermission): Promise<RolePermission>;
  getAllRolePermissions(): Promise<RolePermission[]>;
  listExcelData(type: string): Promise<ExcelData[]>;
  getExcelDataById(id: string): Promise<ExcelData | null>;
  saveExcelData(data: InsertExcelData): Promise<ExcelData>;
  deleteExcelDataById(id: string): Promise<boolean>;
  // Legacy methods (deprecated, for backward compatibility during migration)
  getExcelData(type: string): Promise<ExcelData | null>;
  deleteExcelData(type: string): Promise<void>;
  createInquiry(data: InsertInquiry): Promise<Inquiry>;
  getAllInquiries(): Promise<Inquiry[]>;
  getInquiriesByUserId(userId: string): Promise<Inquiry[]>;
  updateInquiry(id: string, data: Partial<UpdateInquiry>): Promise<Inquiry | null>;
  // Field Survey Data methods (shared by case group)
  getFieldSurveyData(caseGroupId: string): Promise<FieldSurveyData | null>;
  saveFieldSurveyData(data: InsertFieldSurveyData): Promise<FieldSurveyData>;
  updateFieldSurveyData(caseGroupId: string, data: Partial<InsertFieldSurveyData>): Promise<FieldSurveyData | null>;
  // Shared Drawing methods (shared by case group)
  getSharedDrawing(caseGroupId: string): Promise<SharedDrawing | null>;
  saveSharedDrawing(data: InsertSharedDrawing): Promise<SharedDrawing>;
  updateSharedDrawing(caseGroupId: string, data: Partial<InsertSharedDrawing>): Promise<SharedDrawing | null>;
  // Individual Drawing methods (case-specific leak markers)
  saveDrawing(data: InsertDrawing): Promise<Drawing>;
  getDrawing(id: string): Promise<Drawing | null>;
  getDrawingByCaseId(caseId: string): Promise<Drawing | null>;
  updateDrawing(id: string, data: Partial<InsertDrawing>): Promise<Drawing | null>;
  // Case group methods
  getCasesByGroupId(caseGroupId: string): Promise<Case[]>;
  // Same accident number methods (for field survey sync)
  getCasesByAccidentNo(accidentNo: string, excludeCaseId?: string): Promise<Case[]>;
  syncFieldSurveyToRelatedCases(sourceCaseId: string, fieldData: Partial<InsertCase>): Promise<number>;
  // Real-time sync methods for all field survey data (drawing, documents, estimates)
  syncDrawingToRelatedCases(sourceCaseId: string): Promise<number>;
  syncDocumentsToRelatedCases(sourceCaseId: string, newDocument: CaseDocument): Promise<number>;
  syncEstimateToRelatedCases(sourceCaseId: string): Promise<number>;
  // Case number helpers
  getPreventionCaseByPrefix(prefix: string): Promise<Case | null>;
  getNextVictimSuffix(prefix: string): Promise<number>;
  // Case helper for drawing persistence
  getOrCreateActiveCase(userId: string): Promise<Case>;
  // Document methods
  saveDocument(data: InsertCaseDocument): Promise<CaseDocument>;
  getDocument(id: string): Promise<CaseDocument | null>;
  getDocumentsByCaseId(caseId: string): Promise<CaseDocument[]>;
  deleteDocument(id: string): Promise<void>;
  updateDocumentCategory(id: string, category: string): Promise<CaseDocument | null>;
  // Estimate methods
  createEstimateVersion(caseId: string, userId: string, rows: Omit<InsertEstimateRow, 'estimateId'>[], laborCostData?: any | null, materialCostData?: any | null, vatIncluded?: boolean): Promise<{ estimate: Estimate; rows: EstimateRow[] }>;
  getLatestEstimate(caseId: string): Promise<{ estimate: Estimate; rows: EstimateRow[] } | null>;
  getEstimateVersion(caseId: string, version: number): Promise<{ estimate: Estimate; rows: EstimateRow[] } | null>;
  listEstimateVersions(caseId: string): Promise<Estimate[]>;
  // Master data methods
  getMasterData(category?: string, includeInactive?: boolean): Promise<MasterData[]>;
  createMasterData(data: InsertMasterData): Promise<MasterData>;
  deleteMasterData(id: string): Promise<void>;
  updateMasterData(id: string, data: Partial<InsertMasterData>): Promise<MasterData | null>;
  // Labor cost methods
  getLaborCosts(filters?: { category?: string; workName?: string; detailWork?: string }): Promise<LaborCost[]>;
  getLaborCostOptions(): Promise<{
    categories: string[];
    workNamesByCategory: Record<string, string[]>;
    detailWorksByWork: Record<string, string[]>;
  }>;
  createLaborCost(data: InsertLaborCost): Promise<LaborCost>;
  deleteLaborCost(id: string): Promise<void>;
  // Material methods
  listMaterials(workType?: string): Promise<Material[]>;
  createMaterial(data: InsertMaterial): Promise<Material>;
  deleteMaterial(id: string): Promise<void>;
  // Excel-based materials catalog
  getMaterialsCatalog(): Promise<Array<{
    workType: string; // 공종명
    materialName: string;
    specification: string;
    unit: string;
    standardPrice: number | string; // can be "입력" or number
  }>>;
  // User favorites methods
  getUserFavorites(userId: string): Promise<UserFavorite[]>;
  addFavorite(data: InsertUserFavorite): Promise<UserFavorite>;
  removeFavorite(userId: string, menuName: string): Promise<void>;
  // Notice methods
  getAllNotices(): Promise<Notice[]>;
  createNotice(data: InsertNotice): Promise<Notice>;
  updateNotice(id: string, data: { title: string; content: string }): Promise<Notice | null>;
  deleteNotice(id: string): Promise<void>;
  // Asset cloning methods (for syncing from related cases)
  getRelatedCaseWithDrawing(caseId: string): Promise<{ caseId: string; caseNumber: string } | null>;
  getRelatedCaseWithEstimate(caseId: string): Promise<{ caseId: string; caseNumber: string } | null>;
  getRelatedCaseWithDocuments(caseId: string): Promise<{ caseId: string; caseNumber: string; documentCount: number } | null>;
  cloneDrawingFromCase(sourceCaseId: string, targetCaseId: string, userId: string): Promise<Drawing | null>;
  cloneEstimateFromCase(sourceCaseId: string, targetCaseId: string, userId: string): Promise<{ estimate: Estimate; rows: EstimateRow[] } | null>;
  cloneDocumentsFromCase(sourceCaseId: string, targetCaseId: string, userId: string): Promise<CaseDocument[]>;
}

// @deprecated - MemStorage is not used in production. Use DbStorage instead.
// Kept only for backward compatibility with functional in-memory implementations.
export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private cases: Map<string, Case>;
  private progressUpdates: Map<string, ProgressUpdate>;
  private rolePermissions: Map<string, RolePermission>;
  private excelData: Map<string, ExcelData>;
  private inquiries: Map<string, Inquiry>;
  private drawings: Map<string, Drawing>;
  private documents: Map<string, CaseDocument>;

  constructor() {
    this.users = new Map();
    this.cases = new Map();
    this.progressUpdates = new Map();
    this.rolePermissions = new Map();
    this.excelData = new Map();
    this.inquiries = new Map();
    this.drawings = new Map();
    this.documents = new Map();
    this.seedTestUser();
    this.seedTestCases();
  }

  private async seedTestUser() {
    const hashedPassword = await bcrypt.hash("1234", SALT_ROUNDS);
    const currentDate = getKSTDate();
    
    const testUsers: User[] = [
      // ===== 관리자 5명 =====
      {
        id: randomUUID(),
        username: "admin01",
        password: hashedPassword,
        role: "관리자",
        name: "김블락",
        company: "플록슨",
        department: "개발팀",
        position: "팀장",
        email: "admin01@floxn.com",
        phone: "010-1001-1001",
        office: "02-1001-1001",
        address: "서울 강남구",
        bankName: null,
        accountNumber: null,
        accountHolder: null,
        serviceRegions: null,
        attachments: null,
        status: "active",
        createdAt: currentDate,
      },
      {
        id: randomUUID(),
        username: "admin02",
        password: hashedPassword,
        role: "관리자",
        name: "박영희",
        company: "플록슨",
        department: "기획팀",
        position: "부장",
        email: "admin02@floxn.com",
        phone: "010-1002-1002",
        office: "02-1002-1002",
        address: "서울 송파구",
        bankName: null,
        accountNumber: null,
        accountHolder: null,
        serviceRegions: null,
        attachments: null,
        status: "active",
        createdAt: currentDate,
      },
      {
        id: randomUUID(),
        username: "admin03",
        password: hashedPassword,
        role: "관리자",
        name: "이현우",
        company: "플록슨",
        department: "인사팀",
        position: "차장",
        email: "admin03@floxn.com",
        phone: "010-1003-1003",
        office: "02-1003-1003",
        address: "서울 종로구",
        bankName: null,
        accountNumber: null,
        accountHolder: null,
        serviceRegions: null,
        attachments: null,
        status: "active",
        createdAt: currentDate,
      },
      {
        id: randomUUID(),
        username: "admin04",
        password: hashedPassword,
        role: "관리자",
        name: "최지원",
        company: "플록슨",
        department: "운영팀",
        position: "과장",
        email: "admin04@floxn.com",
        phone: "010-1004-1004",
        office: "02-1004-1004",
        address: "서울 마포구",
        bankName: null,
        accountNumber: null,
        accountHolder: null,
        serviceRegions: null,
        attachments: null,
        status: "active",
        createdAt: currentDate,
      },
      {
        id: randomUUID(),
        username: "admin05",
        password: hashedPassword,
        role: "관리자",
        name: "정수현",
        company: "플록슨",
        department: "총무팀",
        position: "대리",
        email: "admin05@floxn.com",
        phone: "010-1005-1005",
        office: "02-1005-1005",
        address: "서울 서초구",
        bankName: null,
        accountNumber: null,
        accountHolder: null,
        serviceRegions: null,
        attachments: null,
        status: "active",
        createdAt: currentDate,
      },

      // ===== 보험사 5명 =====
      {
        id: randomUUID(),
        username: "insure01",
        password: hashedPassword,
        role: "보험사",
        name: "김민준",
        company: "삼성화재",
        department: "사고접수팀",
        position: "팀장",
        email: "insure01@samsung.com",
        phone: "010-2001-2001",
        office: "02-2001-2001",
        address: "서울 강남구",
        bankName: null,
        accountNumber: null,
        accountHolder: null,
        serviceRegions: null,
        attachments: null,
        status: "active",
        createdAt: currentDate,
      },
      {
        id: randomUUID(),
        username: "insure02",
        password: hashedPassword,
        role: "보험사",
        name: "이서윤",
        company: "현대해상",
        department: "보상팀",
        position: "차장",
        email: "insure02@hyundai.com",
        phone: "010-2002-2002",
        office: "02-2002-2002",
        address: "서울 중구",
        bankName: null,
        accountNumber: null,
        accountHolder: null,
        serviceRegions: null,
        attachments: null,
        status: "active",
        createdAt: currentDate,
      },
      {
        id: randomUUID(),
        username: "insure03",
        password: hashedPassword,
        role: "보험사",
        name: "박도현",
        company: "DB손해보험",
        department: "사고처리팀",
        position: "과장",
        email: "insure03@db.com",
        phone: "010-2003-2003",
        office: "02-2003-2003",
        address: "서울 영등포구",
        bankName: null,
        accountNumber: null,
        accountHolder: null,
        serviceRegions: null,
        attachments: null,
        status: "active",
        createdAt: currentDate,
      },
      {
        id: randomUUID(),
        username: "insure04",
        password: hashedPassword,
        role: "보험사",
        name: "최하은",
        company: "KB손해보험",
        department: "보상심사팀",
        position: "부장",
        email: "insure04@kb.com",
        phone: "010-2004-2004",
        office: "02-2004-2004",
        address: "서울 종로구",
        bankName: null,
        accountNumber: null,
        accountHolder: null,
        serviceRegions: null,
        attachments: null,
        status: "active",
        createdAt: currentDate,
      },
      {
        id: randomUUID(),
        username: "insure05",
        password: hashedPassword,
        role: "보험사",
        name: "정예준",
        company: "메리츠화재",
        department: "사고조사팀",
        position: "대리",
        email: "insure05@meritz.com",
        phone: "010-2005-2005",
        office: "02-2005-2005",
        address: "서울 강동구",
        bankName: null,
        accountNumber: null,
        accountHolder: null,
        serviceRegions: null,
        attachments: null,
        status: "active",
        createdAt: currentDate,
      },

      // ===== 협력사 5명 =====
      {
        id: randomUUID(),
        username: "partner01",
        password: hashedPassword,
        role: "협력사",
        name: "강지훈",
        company: "AERO 파트너스",
        department: "현장조사팀",
        position: "팀장",
        email: "partner01@aero.com",
        phone: "010-3001-3001",
        office: "02-3001-3001",
        address: "서울 서초구",
        bankName: "국민은행",
        accountNumber: "123-456-000001",
        accountHolder: "강지훈",
        serviceRegions: ["서울시/강남구", "서초구", "송파구"],
        attachments: null,
        status: "active",
        createdAt: currentDate,
      },
      {
        id: randomUUID(),
        username: "partner02",
        password: hashedPassword,
        role: "협력사",
        name: "윤소희",
        company: "누수닥터",
        department: "복구팀",
        position: "차장",
        email: "partner02@doctor.com",
        phone: "010-3002-3002",
        office: "02-3002-3002",
        address: "서울 용산구",
        bankName: "신한은행",
        accountNumber: "234-567-000002",
        accountHolder: "윤소희",
        serviceRegions: ["서울시/종로구", "중구", "용산구"],
        attachments: null,
        status: "active",
        createdAt: currentDate,
      },
      {
        id: randomUUID(),
        username: "partner03",
        password: hashedPassword,
        role: "협력사",
        name: "장민서",
        company: "클린워터",
        department: "기술팀",
        position: "과장",
        email: "partner03@cleanwater.com",
        phone: "010-3003-3003",
        office: "02-3003-3003",
        address: "서울 마포구",
        bankName: "우리은행",
        accountNumber: "345-678-000003",
        accountHolder: "장민서",
        serviceRegions: ["서울시/마포구", "서대문구", "은평구"],
        attachments: null,
        status: "active",
        createdAt: currentDate,
      },
      {
        id: randomUUID(),
        username: "partner04",
        password: hashedPassword,
        role: "협력사",
        name: "임채원",
        company: "수리마스터",
        department: "시공팀",
        position: "팀장",
        email: "partner04@master.com",
        phone: "010-3004-3004",
        office: "02-3004-3004",
        address: "서울 강북구",
        bankName: "하나은행",
        accountNumber: "456-789-000004",
        accountHolder: "임채원",
        serviceRegions: ["서울시/강북구", "성북구", "노원구"],
        attachments: null,
        status: "active",
        createdAt: currentDate,
      },
      {
        id: randomUUID(),
        username: "partner05",
        password: hashedPassword,
        role: "협력사",
        name: "한유진",
        company: "복구전문가",
        department: "견적팀",
        position: "부장",
        email: "partner05@expert.com",
        phone: "010-3005-3005",
        office: "02-3005-3005",
        address: "경기 성남시",
        bankName: "농협은행",
        accountNumber: "567-890-000005",
        accountHolder: "한유진",
        serviceRegions: ["경기/성남시", "분당구", "수정구"],
        attachments: null,
        status: "active",
        createdAt: currentDate,
      },

      // ===== 심사사 5명 =====
      {
        id: randomUUID(),
        username: "assessor01",
        password: hashedPassword,
        role: "심사사",
        name: "신동욱",
        company: "플록슨",
        department: "심사팀",
        position: "수석심사사",
        email: "assessor01@floxn.com",
        phone: "010-4001-4001",
        office: "02-4001-4001",
        address: "서울 강남구",
        bankName: null,
        accountNumber: null,
        accountHolder: null,
        serviceRegions: null,
        attachments: null,
        status: "active",
        createdAt: currentDate,
      },
      {
        id: randomUUID(),
        username: "assessor02",
        password: hashedPassword,
        role: "심사사",
        name: "오서현",
        company: "플록슨",
        department: "심사팀",
        position: "책임심사사",
        email: "assessor02@floxn.com",
        phone: "010-4002-4002",
        office: "02-4002-4002",
        address: "서울 서초구",
        bankName: null,
        accountNumber: null,
        accountHolder: null,
        serviceRegions: null,
        attachments: null,
        status: "active",
        createdAt: currentDate,
      },
      {
        id: randomUUID(),
        username: "assessor03",
        password: hashedPassword,
        role: "심사사",
        name: "배준영",
        company: "플록슨",
        department: "심사팀",
        position: "선임심사사",
        email: "assessor03@floxn.com",
        phone: "010-4003-4003",
        office: "02-4003-4003",
        address: "서울 송파구",
        bankName: null,
        accountNumber: null,
        accountHolder: null,
        serviceRegions: null,
        attachments: null,
        status: "active",
        createdAt: currentDate,
      },
      {
        id: randomUUID(),
        username: "assessor04",
        password: hashedPassword,
        role: "심사사",
        name: "황시우",
        company: "플록슨",
        department: "심사팀",
        position: "심사사",
        email: "assessor04@floxn.com",
        phone: "010-4004-4004",
        office: "02-4004-4004",
        address: "서울 마포구",
        bankName: null,
        accountNumber: null,
        accountHolder: null,
        serviceRegions: null,
        attachments: null,
        status: "active",
        createdAt: currentDate,
      },
      {
        id: randomUUID(),
        username: "assessor05",
        password: hashedPassword,
        role: "심사사",
        name: "서은비",
        company: "플록슨",
        department: "심사팀",
        position: "심사사",
        email: "assessor05@floxn.com",
        phone: "010-4005-4005",
        office: "02-4005-4005",
        address: "서울 강동구",
        bankName: null,
        accountNumber: null,
        accountHolder: null,
        serviceRegions: null,
        attachments: null,
        status: "active",
        createdAt: currentDate,
      },

      // ===== 조사사 5명 =====
      {
        id: randomUUID(),
        username: "investigator01",
        password: hashedPassword,
        role: "조사사",
        name: "안재현",
        company: "플록슨",
        department: "조사팀",
        position: "수석조사사",
        email: "investigator01@floxn.com",
        phone: "010-5001-5001",
        office: "02-5001-5001",
        address: "서울 강남구",
        bankName: null,
        accountNumber: null,
        accountHolder: null,
        serviceRegions: null,
        attachments: null,
        status: "active",
        createdAt: currentDate,
      },
      {
        id: randomUUID(),
        username: "investigator02",
        password: hashedPassword,
        role: "조사사",
        name: "조아라",
        company: "플록슨",
        department: "조사팀",
        position: "책임조사사",
        email: "investigator02@floxn.com",
        phone: "010-5002-5002",
        office: "02-5002-5002",
        address: "서울 성동구",
        bankName: null,
        accountNumber: null,
        accountHolder: null,
        serviceRegions: null,
        attachments: null,
        status: "active",
        createdAt: currentDate,
      },
      {
        id: randomUUID(),
        username: "investigator03",
        password: hashedPassword,
        role: "조사사",
        name: "홍민재",
        company: "플록슨",
        department: "조사팀",
        position: "선임조사사",
        email: "investigator03@floxn.com",
        phone: "010-5003-5003",
        office: "02-5003-5003",
        address: "서울 광진구",
        bankName: null,
        accountNumber: null,
        accountHolder: null,
        serviceRegions: null,
        attachments: null,
        status: "active",
        createdAt: currentDate,
      },
      {
        id: randomUUID(),
        username: "investigator04",
        password: hashedPassword,
        role: "조사사",
        name: "허지안",
        company: "플록슨",
        department: "조사팀",
        position: "조사사",
        email: "investigator04@floxn.com",
        phone: "010-5004-5004",
        office: "02-5004-5004",
        address: "경기 성남시",
        bankName: null,
        accountNumber: null,
        accountHolder: null,
        serviceRegions: null,
        attachments: null,
        status: "active",
        createdAt: currentDate,
      },
      {
        id: randomUUID(),
        username: "investigator05",
        password: hashedPassword,
        role: "조사사",
        name: "송다빈",
        company: "플록슨",
        department: "조사팀",
        position: "조사사",
        email: "investigator05@floxn.com",
        phone: "010-5005-5005",
        office: "02-5005-5005",
        address: "서울 용산구",
        bankName: null,
        accountNumber: null,
        accountHolder: null,
        serviceRegions: null,
        attachments: null,
        status: "active",
        createdAt: currentDate,
      },
    ];

    testUsers.forEach((user) => {
      this.users.set(user.id, user);
    });
  }

  private async seedTestCases() {
    const currentDate = getKSTDate();
    const usersArray = Array.from(this.users.values());
    
    // Get specific users for case assignment
    const adminUser = usersArray.find(u => u.username === "admin01");
    const insuranceUser1 = usersArray.find(u => u.username === "insure01");
    const insuranceUser2 = usersArray.find(u => u.username === "insure02");
    const partner1 = usersArray.find(u => u.username === "partner01");
    const partner2 = usersArray.find(u => u.username === "partner02");
    const assessor1 = usersArray.find(u => u.username === "assessor01");
    const assessor2 = usersArray.find(u => u.username === "assessor02");
    
    if (!adminUser) return;
    
    const testCases: Case[] = [
      {
        id: randomUUID(),
        caseNumber: "CLM-25145136",
        status: "제출",
        accidentDate: "2025-01-15",
        insuranceCompany: "MG손해보험",
        insurancePolicyNo: "MG2024-12345",
        insuranceAccidentNo: "25219943",
        clientResidence: "서울 강남구",
        clientDepartment: "보상팀",
        clientName: "김블락",
        clientContact: "010-1234-5678",
        assessorId: assessor1?.id || null,
        assessorDepartment: "심사팀",
        assessorTeam: "1팀",
        assessorContact: "010-5555-6666",
        investigatorTeam: "조사1팀",
        investigatorDepartment: "현장조사",
        investigatorTeamName: "플록슨 조사팀",
        investigatorContact: "02-7777-8888",
        policyHolderName: "김블락",
        policyHolderIdNumber: "800101-1******",
        policyHolderAddress: "서울 강남구 테헤란로 123",
        insuredName: "김블락",
        insuredIdNumber: "800101-1******",
        insuredContact: "010-1234-5678",
        insuredAddress: "서울 강남구 테헤란로 123",
        victimName: "이웃집",
        victimContact: "010-9999-8888",
        clientPhone: "010-1234-5678",
        clientAddress: "서울 강남구 테헤란로 123",
        accidentLocation: "서울 강남구 테헤란로 123 아파트 1001호",
        accidentDescription: "화장실 배관 누수로 인한 천장 침수 피해",
        accidentType: "급배수 누수",
        accidentCause: "배관 노후",
        restorationMethod: "선견적요청",
        otherVendorEstimate: null,
        damageItems: JSON.stringify(["천장", "벽면", "바닥"]),
        assignedPartner: partner1?.company || null,
        assignedPartnerManager: partner1?.name || null,
        assignedPartnerContact: partner1?.phone || null,
        urgency: "보통",
        specialRequests: null,
        progressStatus: "서류보완요청",
        specialNotes: null,
        assignmentDate: null,
        siteVisitDate: null,
        fieldSurveyDate: null,
        firstInspectionDate: null,
        approvalCompletionDate: null,
        totalWorkDate: null,
        contractorReportDate: null,
        contractorRepairDate: null,
        completionDate: null,
        assignedTo: partner1?.id || null,
        createdBy: adminUser.id,
        createdAt: "2025-01-15",
        updatedAt: "2025-01-15",
      },
      {
        id: randomUUID(),
        caseNumber: "CLM-25145135",
        status: "검토중",
        accidentDate: "2025-01-14",
        insuranceCompany: "삼성화재",
        insurancePolicyNo: "SS2024-67890",
        insuranceAccidentNo: "25219942",
        clientResidence: "서울 서초구",
        clientDepartment: "보상팀",
        clientName: "박철수",
        clientContact: "010-2345-6789",
        assessorId: assessor2?.id || null,
        assessorDepartment: "심사팀",
        assessorTeam: "2팀",
        assessorContact: "010-6666-7777",
        investigatorTeam: "조사2팀",
        investigatorDepartment: "현장조사",
        investigatorTeamName: "플록슨 조사팀",
        investigatorContact: "02-8888-9999",
        policyHolderName: "박철수",
        policyHolderIdNumber: "750505-1******",
        policyHolderAddress: "서울 서초구 강남대로 456",
        insuredName: "박철수",
        insuredIdNumber: "750505-1******",
        insuredContact: "010-2345-6789",
        insuredAddress: "서울 서초구 강남대로 456",
        victimName: "아래층 주민",
        victimContact: "010-7777-6666",
        clientPhone: "010-2345-6789",
        clientAddress: "서울 서초구 강남대로 456",
        accidentLocation: "서울 서초구 강남대로 456 빌라 202호",
        accidentDescription: "싱크대 하수 배관 파손으로 인한 누수",
        accidentType: "급배수 누수",
        accidentCause: "부주의",
        restorationMethod: "플랫폼 복구",
        otherVendorEstimate: null,
        damageItems: JSON.stringify(["부엌", "벽면"]),
        assignedPartner: partner2?.company || null,
        assignedPartnerManager: partner2?.name || null,
        assignedPartnerContact: partner2?.phone || null,
        urgency: "긴급",
        specialRequests: null,
        progressStatus: "서류보완요청",
        specialNotes: null,
        assignmentDate: null,
        siteVisitDate: null,
        fieldSurveyDate: null,
        firstInspectionDate: null,
        approvalCompletionDate: null,
        totalWorkDate: null,
        contractorReportDate: null,
        contractorRepairDate: null,
        completionDate: null,
        assignedTo: partner2?.id || null,
        createdBy: adminUser.id,
        createdAt: "2025-01-14",
        updatedAt: "2025-01-14",
      },
      {
        id: randomUUID(),
        caseNumber: "CLM-25145134",
        status: "작성중",
        accidentDate: "2025-01-13",
        insuranceCompany: "현대해상",
        insurancePolicyNo: "HD2024-11111",
        insuranceAccidentNo: "25219941",
        clientResidence: "경기 성남시",
        clientDepartment: "보상팀",
        clientName: "이미라",
        clientContact: "010-3456-7890",
        assessorId: assessor1?.id || null,
        assessorDepartment: "심사팀",
        assessorTeam: "1팀",
        assessorContact: "010-5555-6666",
        investigatorTeam: "조사1팀",
        investigatorDepartment: "현장조사",
        investigatorTeamName: "플록슨 조사팀",
        investigatorContact: "02-7777-8888",
        policyHolderName: "이미라",
        policyHolderIdNumber: "900303-2******",
        policyHolderAddress: "경기 성남시 분당구 789",
        insuredName: "이미라",
        insuredIdNumber: "900303-2******",
        insuredContact: "010-3456-7890",
        insuredAddress: "경기 성남시 분당구 789",
        victimName: "옆집",
        victimContact: "010-5555-4444",
        clientPhone: "010-3456-7890",
        clientAddress: "경기 성남시 분당구 789",
        accidentLocation: "경기 성남시 분당구 789 아파트 506호",
        accidentDescription: "보일러 배관 동파로 인한 누수 사고",
        accidentType: "난방 누수",
        accidentCause: "동파",
        restorationMethod: "없음",
        otherVendorEstimate: null,
        damageItems: JSON.stringify(["보일러실", "복도", "바닥"]),
        assignedPartner: partner1?.company || null,
        assignedPartnerManager: partner1?.name || null,
        assignedPartnerContact: partner1?.phone || null,
        urgency: "낮음",
        specialRequests: "겨울철 동파 예방 조치 필요",
        progressStatus: "선견적요청",
        specialNotes: null,
        assignmentDate: null,
        siteVisitDate: null,
        fieldSurveyDate: null,
        firstInspectionDate: null,
        approvalCompletionDate: null,
        totalWorkDate: null,
        contractorReportDate: null,
        contractorRepairDate: null,
        completionDate: null,
        assignedTo: partner1?.id || null,
        createdBy: adminUser.id,
        createdAt: "2025-01-13",
        updatedAt: "2025-01-13",
      },
    ];

    testCases.forEach((testCase) => {
      this.cases.set(testCase.id, testCase);
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getAllUsers(): Promise<User[]> {
    // Return all active users (not soft-deleted)
    return Array.from(this.users.values()).filter(
      (user) => user.status === "active",
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(insertUser.password, SALT_ROUNDS);
    const id = randomUUID();
    const createdAt = getKSTDate();
    const user: User = {
      id,
      username: insertUser.username,
      password: hashedPassword,
      role: insertUser.role || "사원",
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
      createdAt,
    };
    this.users.set(id, user);
    return user;
  }

  async verifyPassword(username: string, password: string): Promise<User | null> {
    const user = await this.getUserByUsername(username);
    if (!user) {
      return null;
    }

    const isValid = await bcrypt.compare(password, user.password);
    return isValid ? user : null;
  }

  async updatePassword(username: string, newPassword: string): Promise<User | null> {
    const user = await this.getUserByUsername(username);
    if (!user) {
      return null;
    }

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    const updatedUser: User = {
      ...user,
      password: hashedPassword,
    };
    this.users.set(user.id, updatedUser);
    return updatedUser;
  }

  async deleteAccount(username: string): Promise<User | null> {
    const user = await this.getUserByUsername(username);
    if (!user) {
      return null;
    }

    // Soft delete: update status to "deleted" instead of removing from storage
    const deletedUser: User = {
      ...user,
      status: "deleted",
    };
    this.users.set(user.id, deletedUser);
    return deletedUser;
  }

  async getCaseById(caseId: string): Promise<Case | null> {
    return this.cases.get(caseId) || null;
  }

  async getAssignedCasesForUser(user: User, search?: string): Promise<Case[]> {
    const allCases = Array.from(this.cases.values());
    
    // Filter by role
    let filtered = allCases;
    switch (user.role) {
      case "심사사":
        filtered = allCases.filter(c => c.assessorId === user.id);
        break;
      case "협력사":
        // 협력사는 "접수완료" 상태 이상의 건만 볼 수 있음 (배당대기 상태는 제외)
        filtered = allCases.filter(c => 
          c.assignedPartner === user.company && 
          c.status !== "배당대기"
        );
        break;
      case "조사사":
        filtered = allCases.filter(c => c.investigatorTeamName === user.company);
        break;
      case "관리자":
        // Admins see all
        break;
      default:
        return [];
    }

    // Apply search if provided
    if (search && search.trim()) {
      const searchLower = search.trim().toLowerCase();
      filtered = filtered.filter(c =>
        c.caseNumber?.toLowerCase().includes(searchLower) ||
        c.insuredName?.toLowerCase().includes(searchLower) ||
        c.insuranceCompany?.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }

  async getNextCaseSequence(date: string, insuranceAccidentNo?: string): Promise<{ prefix: string; suffix: number }> {
    // Step 1: Check if there are existing cases with the same insurance accident number
    if (insuranceAccidentNo) {
      const existingCases = await db
        .select({ caseNumber: cases.caseNumber })
        .from(cases)
        .where(eq(cases.insuranceAccidentNo, insuranceAccidentNo));
      
      if (existingCases.length > 0) {
        // Extract prefix from first existing case (yyMMddxxx part)
        const firstCaseNumber = existingCases[0].caseNumber;
        if (firstCaseNumber) {
          const parts = firstCaseNumber.split('-');
          if (parts.length >= 2) {
            const prefix = parts[0]; // "251124001"
            
            // Find max suffix for this prefix
            let maxSuffix = -1;
            for (const c of existingCases) {
              if (c.caseNumber && c.caseNumber.startsWith(prefix + '-')) {
                const suffixStr = c.caseNumber.split('-')[1];
                const suffix = parseInt(suffixStr, 10);
                if (!isNaN(suffix) && suffix > maxSuffix) {
                  maxSuffix = suffix;
                }
              }
            }
            
            return { prefix, suffix: maxSuffix + 1 };
          }
        }
      }
    }
    
    // Step 2: No existing cases with same accident number - generate new prefix
    // Convert YYYY-MM-DD to yyMMdd (6 digits)
    const dateParts = date.split('-');
    const year = dateParts[0].substring(2); // YY (last 2 digits)
    const month = dateParts[1]; // MM
    const day = dateParts[2]; // dd
    const datePrefix = year + month + day; // yyMMdd
    
    // Query database for cases with case numbers starting with datePrefix
    const allCases = await db
      .select({ caseNumber: cases.caseNumber })
      .from(cases)
      .where(sql`${cases.caseNumber} LIKE ${datePrefix + '%'}`);
    
    let maxSequence = 0;
    for (const c of allCases) {
      if (c.caseNumber && c.caseNumber.startsWith(datePrefix)) {
        const parts = c.caseNumber.split('-');
        if (parts.length >= 1) {
          const sequencePart = parts[0].substring(6); // Extract XXX from yyMMddxxx
          const seq = parseInt(sequencePart, 10);
          if (!isNaN(seq) && seq > maxSequence) {
            maxSequence = seq;
          }
        }
      }
    }
    
    const nextSequence = maxSequence + 1;
    const seqStr = String(nextSequence).padStart(3, '0');
    const prefix = `${datePrefix}${seqStr}`; // e.g., "251124001"
    
    return { prefix, suffix: 0 };
  }

  async createCase(caseData: Omit<InsertCase, "caseNumber"> & { caseNumber: string; createdBy: string }): Promise<Case> {
    const currentDate = getKSTDate();
    const status = caseData.status || "작성중";
    
    // 상태에 따라 자동으로 날짜 기록 (케이스 생성 시)
    let autoReceptionDate = caseData.receptionDate || null;
    let autoAssignmentDate = caseData.assignmentDate || null;
    
    if (status === "접수완료") {
      // 접수완료 상태로 생성 시 접수일과 배당일 자동 기록 (기존 값 없을 때만)
      if (!autoReceptionDate) {
        autoReceptionDate = currentDate;
      }
      if (!autoAssignmentDate) {
        autoAssignmentDate = currentDate;
      }
    }
    
    // Insert into database and get the created case
    const [newCase] = await db.insert(cases).values({
      caseNumber: caseData.caseNumber,
      status: status,
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
      sameAsPolicyHolder: caseData.sameAsPolicyHolder != null 
        ? String(caseData.sameAsPolicyHolder) 
        : null,
      victimName: caseData.victimName || null,
      victimContact: caseData.victimContact || null,
      victimAddress: caseData.victimAddress || null,
      additionalVictims: caseData.additionalVictims || null,
      clientPhone: caseData.clientPhone || null,
      clientAddress: caseData.clientAddress || null,
      accidentLocation: caseData.accidentLocation || null,
      accidentDescription: caseData.accidentDescription || null,
      accidentType: caseData.accidentType || null,
      accidentCause: caseData.accidentCause || null,
      recoveryType: caseData.recoveryType || null,
      restorationMethod: caseData.restorationMethod || null,
      otherVendorEstimate: caseData.otherVendorEstimate || null,
      damagePreventionCost: caseData.damagePreventionCost || null,
      victimIncidentAssistance: caseData.victimIncidentAssistance || null,
      damageItems: caseData.damageItems || null,
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
      fieldSurveyDate: caseData.fieldSurveyDate || null,
      firstInspectionDate: caseData.firstInspectionDate || null,
      approvalCompletionDate: caseData.approvalCompletionDate || null,
      totalWorkDate: caseData.totalWorkDate || null,
      contractorReportDate: caseData.contractorReportDate || null,
      contractorRepairDate: caseData.contractorRepairDate || null,
      completionDate: caseData.completionDate || null,
      assignedTo: caseData.assignedTo || null,
      createdBy: caseData.createdBy,
      createdAt: currentDate,
      updatedAt: currentDate,
    }).returning();
    
    return newCase;
  }

  async getAllCases(user?: User): Promise<CaseWithLatestProgress[]> {
    // Fetch all cases from database instead of memory
    let allCases = await db.select().from(cases);
    
    // 권한별 필터링
    if (user) {
      switch (user.role) {
        case "관리자":
          // 관리자는 모든 케이스 조회 가능
          break;
        case "협력사":
          // 협력사는 직급 상관없이 자기 회사의 모든 케이스
          allCases = allCases.filter(c => c.assignedPartner === user.company);
          break;
        case "보험사":
          // 보험사는 자기 회사 케이스만
          allCases = allCases.filter(c => c.insuranceCompany === user.company);
          break;
        case "심사사":
          // 심사사는 자기가 맡은 케이스만
          allCases = allCases.filter(c => c.assessorId === user.id);
          break;
        case "조사사":
          // 조사사는 자기 팀 케이스만
          allCases = allCases.filter(c => c.investigatorTeamName === user.company);
          break;
        case "의뢰사":
          // 의뢰사는 자기가 의뢰한 케이스만
          allCases = allCases.filter(c => c.clientName === user.name);
          break;
        default:
          // 기타 role은 빈 배열 반환
          allCases = [];
      }
    }
    
    // createdAt 기준 오름차순 정렬 (가장 오래된 것부터)
    allCases.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    
    // 모든 사용자 정보 가져오기 (담당자 이름 조회용)
    const allUsers = await db.select().from(users);
    const userMap = new Map(allUsers.map(u => [u.id, u]));
    
    // 각 케이스의 최신 진행상황 및 담당자 이름 찾기
    const casesWithProgress: CaseWithLatestProgress[] = allCases.map(caseItem => {
      // 해당 케이스의 모든 진행상황 찾기
      const caseUpdates = Array.from(this.progressUpdates.values())
        .filter(update => update.caseId === caseItem.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)); // 최신순 정렬
      
      // 최신 진행상황
      const latestUpdate = caseUpdates[0];
      
      // 담당자 이름 조회
      const manager = caseItem.managerId ? userMap.get(caseItem.managerId) : null;
      
      return {
        ...caseItem,
        latestProgress: latestUpdate ? {
          content: latestUpdate.content,
          createdAt: latestUpdate.createdAt,
        } : null,
        managerName: manager?.name || null,
      };
    });
    
    return casesWithProgress;
  }

  async updateCase(caseId: string, caseData: Partial<InsertCase>): Promise<Case | null> {
    const caseItem = this.cases.get(caseId);
    if (!caseItem) {
      return null;
    }
    
    const currentDate = getKSTDate();
    
    // 배당 협력사 저장 시 assignmentDate 자동 기록 (기존 값이 없을 때만)
    const additionalUpdates: Partial<Case> = {};
    if (caseData.assignedPartner && !caseItem.assignmentDate) {
      additionalUpdates.assignmentDate = currentDate;
    }
    
    const updatedCase: Case = {
      ...caseItem,
      ...caseData,
      ...additionalUpdates,
      updatedAt: currentDate,
    };
    
    this.cases.set(caseId, updatedCase);
    return updatedCase;
  }

  async deleteCase(caseId: string): Promise<void> {
    this.cases.delete(caseId);
  }

  async updateCaseStatus(caseId: string, status: string): Promise<Case | null> {
    const caseItem = this.cases.get(caseId);
    if (!caseItem) {
      return null;
    }
    
    const currentDate = getKSTDate();
    
    // 미복구 선택 시 자동으로 출동비 청구로 정규화
    const normalizedStatus = status === "미복구" ? "출동비 청구" : status;
    
    // 상태에 따라 자동으로 날짜 기록 (기존 값이 없을 때만)
    const dateUpdates: Partial<Case> = {};
    
    switch (normalizedStatus) {
      case "접수완료":
        // 접수일과 배당일 자동 기록 (기존 값 없을 때만)
        if (!caseItem.receptionDate) {
          dateUpdates.receptionDate = currentDate;
        }
        if (!caseItem.assignmentDate) {
          dateUpdates.assignmentDate = currentDate;
        }
        break;
      case "현장방문":
        // 현장방문일 자동 기록 (기존 값 없을 때만)
        if (!caseItem.siteVisitDate) {
          dateUpdates.siteVisitDate = currentDate;
        }
        break;
      case "현장정보입력":
      case "현장정보제출":
        // 현장자료 제출일 자동 기록 (기존 값 없을 때만)
        if (!caseItem.siteInvestigationSubmitDate) {
          dateUpdates.siteInvestigationSubmitDate = currentDate;
        }
        break;
      case "1차승인":
        // 1차 승인일(내부) 자동 기록 (기존 값 없을 때만)
        if (!caseItem.firstApprovalDate) {
          dateUpdates.firstApprovalDate = currentDate;
        }
        break;
      case "복구요청(2차승인)":
        // 2차 승인일(복구 요청일) 자동 기록 (기존 값 없을 때만)
        if (!caseItem.secondApprovalDate) {
          dateUpdates.secondApprovalDate = currentDate;
        }
        break;
      case "(직접복구인 경우) 청구자료제출":
      case "(선견적요청인 경우) 출동비 청구":
        // 복구완료일 자동 기록 (기존 값 없을 때만)
        if (!caseItem.constructionCompletionDate) {
          dateUpdates.constructionCompletionDate = currentDate;
        }
        break;
      case "청구":
        // 청구일 자동 기록 (기존 값 없을 때만)
        if (!caseItem.claimDate) {
          dateUpdates.claimDate = currentDate;
        }
        break;
    }
    
    const updatedCase: Case = {
      ...caseItem,
      status: normalizedStatus,
      updatedAt: currentDate,
      ...dateUpdates,
    };
    
    this.cases.set(caseId, updatedCase);
    return updatedCase;
  }

  async updateCaseSpecialNotes(caseId: string, specialNotes: string | null): Promise<Case | null> {
    const caseItem = this.cases.get(caseId);
    if (!caseItem) {
      return null;
    }
    
    const updatedCase: Case = {
      ...caseItem,
      specialNotes,
      specialNotesConfirmedBy: null, // Reset confirmation when notes are updated
      updatedAt: getKSTDate(),
    };
    
    this.cases.set(caseId, updatedCase);
    return updatedCase;
  }

  async confirmCaseSpecialNotes(caseId: string, confirmedBy: string): Promise<Case | null> {
    const caseItem = this.cases.get(caseId);
    if (!caseItem) {
      return null;
    }
    
    const updatedCase: Case = {
      ...caseItem,
      specialNotesConfirmedBy: confirmedBy,
      updatedAt: getKSTDate(),
    };
    
    this.cases.set(caseId, updatedCase);
    return updatedCase;
  }

  async updateCaseAdditionalNotes(caseId: string, additionalNotes: string | null): Promise<Case | null> {
    const caseItem = this.cases.get(caseId);
    if (!caseItem) {
      return null;
    }
    
    const updatedCase: Case = {
      ...caseItem,
      additionalNotes,
      updatedAt: getKSTDate(),
    };
    
    this.cases.set(caseId, updatedCase);
    return updatedCase;
  }

  async updateCaseEstimateAmount(caseId: string, estimateAmount: string): Promise<Case | null> {
    const caseItem = this.cases.get(caseId);
    if (!caseItem) {
      return null;
    }
    
    const updatedCase: Case = {
      ...caseItem,
      estimateAmount,
      updatedAt: getKSTDate(),
    };
    
    this.cases.set(caseId, updatedCase);
    return updatedCase;
  }

  async submitFieldSurvey(caseId: string): Promise<Case | null> {
    const caseItem = this.cases.get(caseId);
    if (!caseItem) {
      return null;
    }
    
    const updatedCase: Case = {
      ...caseItem,
      fieldSurveyStatus: "submitted",
      status: "제출",
      updatedAt: getKSTDate(),
    };
    
    this.cases.set(caseId, updatedCase);
    return updatedCase;
  }

  async reviewCase(caseId: string, decision: "승인" | "비승인", reviewComment: string | null, reviewedBy: string): Promise<Case | null> {
    const caseItem = this.cases.get(caseId);
    if (!caseItem) {
      return null;
    }
    
    const updatedCase: Case = {
      ...caseItem,
      reviewDecision: decision,
      reviewComment: reviewComment || null,
      reviewedAt: getKSTTimestamp(),
      reviewedBy: reviewedBy,
      status: decision === "승인" ? "1차승인" : "반려",
      updatedAt: getKSTDate(),
    };
    
    this.cases.set(caseId, updatedCase);
    return updatedCase;
  }

  async getPartnerStats(): Promise<PartnerStats[]> {
    const allCases = Array.from(this.cases.values());
    const allUsers = Array.from(this.users.values());
    const partners = allUsers.filter(u => u.role === "협력사");
    
    const today = getKSTDate();
    const currentMonth = today.substring(0, 7); // YYYY-MM
    
    return partners.map(partner => {
      const partnerCases = allCases.filter(c => c.assignedPartner === partner.company);
      
      const dailyCount = partnerCases.filter(c => c.createdAt === today).length;
      const monthlyCount = partnerCases.filter(c => c.createdAt?.startsWith(currentMonth)).length;
      const inProgressCount = partnerCases.filter(c => c.status !== "작성중" && c.status !== "완료").length;
      const pendingCount = partnerCases.filter(c => c.status !== "완료").length;
      
      return {
        partnerName: partner.company,
        dailyCount,
        monthlyCount,
        inProgressCount,
        pendingCount,
      };
    });
  }

  async createProgressUpdate(data: InsertProgressUpdate): Promise<ProgressUpdate> {
    const id = randomUUID();
    const currentTimestamp = getKSTTimestamp();
    
    const newUpdate: ProgressUpdate = {
      id,
      caseId: data.caseId,
      content: data.content,
      createdBy: data.createdBy,
      createdAt: currentTimestamp,
    };
    
    this.progressUpdates.set(id, newUpdate);
    return newUpdate;
  }

  async getProgressUpdatesByCaseId(caseId: string): Promise<ProgressUpdate[]> {
    const updates = Array.from(this.progressUpdates.values()).filter(u => u.caseId === caseId);
    return updates.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async getStatisticsFilters(): Promise<StatisticsFilters> {
    // Get unique insurance companies from cases
    const insuranceCompaniesSet = new Set<string>();
    Array.from(this.cases.values()).forEach(caseItem => {
      if (caseItem.insuranceCompany) {
        insuranceCompaniesSet.add(caseItem.insuranceCompany);
      }
    });

    // Get unique company names by role from users
    const assessorsSet = new Set<string>();
    const investigatorsSet = new Set<string>();
    const partnersSet = new Set<string>();
    const settlementManagersSet = new Set<string>();

    Array.from(this.users.values()).forEach(user => {
      if (user.status !== "active") return; // Only include active users

      if (user.role === "심사사" && user.company) {
        assessorsSet.add(user.company);
      } else if (user.role === "조사사" && user.company) {
        investigatorsSet.add(user.company);
      } else if (user.role === "협력사" && user.company) {
        partnersSet.add(user.company);
      }
      
      // Add all active users as potential settlement managers
      if (user.name) {
        settlementManagersSet.add(user.name);
      }
    });

    // Convert to sorted arrays
    return {
      insuranceCompanies: Array.from(insuranceCompaniesSet).sort(),
      assessors: Array.from(assessorsSet).sort(),
      investigators: Array.from(investigatorsSet).sort(),
      partners: Array.from(partnersSet).sort(),
      settlementManagers: Array.from(settlementManagersSet).sort(),
    };
  }

  async getRolePermission(roleName: string): Promise<RolePermission | undefined> {
    return this.rolePermissions.get(roleName);
  }

  async saveRolePermission(data: InsertRolePermission): Promise<RolePermission> {
    const currentDate = getKSTTimestamp();
    const existing = this.rolePermissions.get(data.roleName);
    
    const rolePermission: RolePermission = {
      id: existing?.id || randomUUID(),
      roleName: data.roleName,
      permissions: data.permissions,
      createdAt: existing?.createdAt || currentDate,
      updatedAt: currentDate,
    };
    
    this.rolePermissions.set(data.roleName, rolePermission);
    return rolePermission;
  }

  async getAllRolePermissions(): Promise<RolePermission[]> {
    return Array.from(this.rolePermissions.values());
  }

  // Excel Data methods (in-memory implementation)
  async listExcelData(type: string): Promise<ExcelData[]> {
    const allData = Array.from(this.excelData.values());
    return allData
      .filter(item => item.type === type)
      .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
  }

  async getExcelDataById(id: string): Promise<ExcelData | null> {
    return this.excelData.get(id) || null;
  }

  async deleteExcelDataById(id: string): Promise<boolean> {
    return this.excelData.delete(id);
  }

  async saveExcelData(data: InsertExcelData): Promise<ExcelData> {
    const currentDate = new Date();
    const newData: ExcelData = {
      id: randomUUID(),
      type: data.type,
      title: data.title,
      headers: data.headers as any,
      data: data.data as any,
      uploadedAt: currentDate,
      updatedAt: currentDate,
    };
    this.excelData.set(newData.id, newData);
    return newData;
  }

  // Legacy methods
  async getExcelData(type: string): Promise<ExcelData | null> {
    const versions = await this.listExcelData(type);
    return versions[0] || null;
  }

  async deleteExcelData(type: string): Promise<void> {
    const allData = Array.from(this.excelData.values());
    const toDelete = allData.filter(item => item.type === type);
    toDelete.forEach(item => this.excelData.delete(item.id));
  }

  // Inquiry methods (in-memory implementation)
  async createInquiry(data: InsertInquiry): Promise<Inquiry> {
    const currentDate = new Date();
    const newInquiry: Inquiry = {
      id: randomUUID(),
      userId: data.userId,
      title: data.title,
      content: data.content,
      status: data.status || "대기",
      response: data.response || null,
      respondedBy: data.respondedBy || null,
      respondedAt: data.respondedAt || null,
      createdAt: currentDate,
      updatedAt: currentDate,
    };
    this.inquiries.set(newInquiry.id, newInquiry);
    return newInquiry;
  }

  async getAllInquiries(): Promise<Inquiry[]> {
    return Array.from(this.inquiries.values())
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async getInquiriesByUserId(userId: string): Promise<Inquiry[]> {
    const allInquiries = Array.from(this.inquiries.values());
    return allInquiries
      .filter(inquiry => inquiry.userId === userId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async updateInquiry(id: string, data: Partial<UpdateInquiry>): Promise<Inquiry | null> {
    const existing = this.inquiries.get(id);
    if (!existing) {
      return null;
    }
    const updated: Inquiry = {
      ...existing,
      ...data,
      updatedAt: new Date(),
    };
    this.inquiries.set(id, updated);
    return updated;
  }

  async saveDrawing(data: InsertDrawing): Promise<Drawing> {
    const id = Math.random().toString(36).substr(2, 9);
    const drawing: Drawing = {
      id,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.drawings.set(id, drawing);
    return drawing;
  }

  async getDrawing(id: string): Promise<Drawing | null> {
    return this.drawings.get(id) || null;
  }

  async getDrawingByCaseId(caseId: string): Promise<Drawing | null> {
    for (const drawing of this.drawings.values()) {
      if (drawing.caseId === caseId) {
        return drawing;
      }
    }
    return null;
  }

  async updateDrawing(id: string, data: Partial<InsertDrawing>): Promise<Drawing | null> {
    const existing = this.drawings.get(id);
    if (!existing) {
      return null;
    }
    const updated: Drawing = {
      ...existing,
      ...data,
      updatedAt: new Date(),
    };
    this.drawings.set(id, updated);
    return updated;
  }

  async getOrCreateActiveCase(userId: string): Promise<Case> {
    // Find existing active case (작성중) for this user
    for (const caseItem of this.cases.values()) {
      if (caseItem.createdBy === userId && caseItem.status === "작성중") {
        return caseItem;
      }
    }

    // Create new active case for drawing purposes
    const caseNumber = `CLM-DRAW-${Date.now()}`;
    const newCase: Case = {
      id: randomUUID(),
      caseNumber,
      status: "작성중",
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      accidentDate: null,
      insuranceCompany: null,
      insurancePolicyNo: null,
      insuranceAccidentNo: null,
      clientResidence: null,
      clientDepartment: null,
      clientName: null,
      clientContact: null,
      assessorId: null,
      assessorDepartment: null,
      assessorTeam: null,
      assessorContact: null,
      investigatorTeam: null,
      investigatorDepartment: null,
      investigatorTeamName: null,
      investigatorContact: null,
      policyHolderName: null,
      policyHolderIdNumber: null,
      policyHolderAddress: null,
      insuredName: null,
      insuredIdNumber: null,
      insuredContact: null,
      insuredAddress: null,
      victimName: null,
      victimContact: null,
      clientPhone: null,
      clientAddress: null,
      accidentLocation: null,
      accidentDescription: null,
      accidentType: null,
      accidentTime: null,
      victimDamageItems: null,
      specialNotes: null,
      partnerCompany: null,
      repairCompanyName: null,
      assignedAt: null,
      targetCompletionDate: null,
      acceptedAt: null,
      rejectionReason: null,
      surveyScheduledAt: null,
      surveyCompletedAt: null,
      damageScope: null,
      repairMethod: null,
      surveyNotes: null,
      estimateAmount: null,
      estimateSubmittedAt: null,
      estimateApprovedAt: null,
      estimateRejectionReason: null,
      workStartedAt: null,
      workCompletedAt: null,
      finalReportSubmittedAt: null,
      settlementAmount: null,
      settlementCompletedAt: null,
      paymentRequestedAt: null,
      paymentCompletedAt: null,
    };

    this.cases.set(newCase.id, newCase);
    return newCase;
  }

  // Document methods
  async saveDocument(data: InsertCaseDocument): Promise<CaseDocument> {
    const id = randomUUID();
    const document: CaseDocument = {
      id,
      ...data,
      createdAt: new Date(),
    };
    this.documents.set(id, document);
    return document;
  }

  async getDocument(id: string): Promise<CaseDocument | null> {
    return this.documents.get(id) || null;
  }

  async getDocumentsByCaseId(caseId: string): Promise<CaseDocument[]> {
    const result: CaseDocument[] = [];
    for (const doc of this.documents.values()) {
      if (doc.caseId === caseId) {
        result.push(doc);
      }
    }
    return result;
  }

  async deleteDocument(id: string): Promise<void> {
    this.documents.delete(id);
  }

  async updateDocumentCategory(id: string, category: string): Promise<CaseDocument | null> {
    const existing = this.documents.get(id);
    if (!existing) {
      return null;
    }
    const updated: CaseDocument = {
      ...existing,
      category,
    };
    this.documents.set(id, updated);
    return updated;
  }

  // Estimate methods (stub - not implemented for MemStorage)
  async createEstimateVersion(caseId: string, userId: string, rows: Omit<InsertEstimateRow, 'estimateId'>[], laborCostData?: any | null, materialCostData?: any | null, vatIncluded?: boolean): Promise<{ estimate: Estimate; rows: EstimateRow[] }> {
    throw new Error("Estimate methods not implemented in MemStorage");
  }

  async getLatestEstimate(caseId: string): Promise<{ estimate: Estimate; rows: EstimateRow[] } | null> {
    throw new Error("Estimate methods not implemented in MemStorage");
  }

  async getEstimateVersion(caseId: string, version: number): Promise<{ estimate: Estimate; rows: EstimateRow[] } | null> {
    throw new Error("Estimate methods not implemented in MemStorage");
  }

  async listEstimateVersions(caseId: string): Promise<Estimate[]> {
    throw new Error("Estimate methods not implemented in MemStorage");
  }

  async getMasterData(category?: string, includeInactive?: boolean): Promise<MasterData[]> {
    throw new Error("Master data methods not implemented in MemStorage");
  }

  async createMasterData(data: InsertMasterData): Promise<MasterData> {
    throw new Error("Master data methods not implemented in MemStorage");
  }

  async deleteMasterData(id: string): Promise<void> {
    throw new Error("Master data methods not implemented in MemStorage");
  }

  async updateMasterData(id: string, data: Partial<InsertMasterData>): Promise<MasterData | null> {
    throw new Error("Master data methods not implemented in MemStorage");
  }

  async getLaborCosts(filters?: { category?: string; workName?: string; detailWork?: string }): Promise<LaborCost[]> {
    throw new Error("Labor cost methods not implemented in MemStorage");
  }

  async getLaborCostOptions(): Promise<{
    categories: string[];
    workNamesByCategory: Record<string, string[]>;
    detailWorksByWork: Record<string, string[]>;
  }> {
    throw new Error("Labor cost methods not implemented in MemStorage");
  }

  async createLaborCost(data: InsertLaborCost): Promise<LaborCost> {
    throw new Error("Labor cost methods not implemented in MemStorage");
  }

  async deleteLaborCost(id: string): Promise<void> {
    throw new Error("Labor cost methods not implemented in MemStorage");
  }

  async listMaterials(workType?: string): Promise<Material[]> {
    throw new Error("Material methods not implemented in MemStorage");
  }

  async createMaterial(data: InsertMaterial): Promise<Material> {
    throw new Error("Material methods not implemented in MemStorage");
  }

  async deleteMaterial(id: string): Promise<void> {
    throw new Error("Material methods not implemented in MemStorage");
  }

  async getMaterialsCatalog(): Promise<Array<{
    workType: string;
    materialName: string;
    specification: string;
    unit: string;
    standardPrice: number | string;
  }>> {
    throw new Error("Materials catalog not implemented in MemStorage");
  }

  async getUserFavorites(userId: string): Promise<UserFavorite[]> {
    throw new Error("User favorites methods not implemented in MemStorage");
  }

  async addFavorite(data: InsertUserFavorite): Promise<UserFavorite> {
    throw new Error("User favorites methods not implemented in MemStorage");
  }

  async removeFavorite(userId: string, menuName: string): Promise<void> {
    throw new Error("User favorites methods not implemented in MemStorage");
  }

  async getAllNotices(): Promise<Notice[]> {
    throw new Error("Notice methods not implemented in MemStorage");
  }

  async createNotice(data: InsertNotice): Promise<Notice> {
    throw new Error("Notice methods not implemented in MemStorage");
  }

  async updateNotice(id: string, data: { title: string; content: string }): Promise<Notice | null> {
    throw new Error("Notice methods not implemented in MemStorage");
  }

  async deleteNotice(id: string): Promise<void> {
    throw new Error("Notice methods not implemented in MemStorage");
  }

  // Asset cloning methods (stub)
  async getRelatedCaseWithDrawing(caseId: string): Promise<{ caseId: string; caseNumber: string } | null> {
    throw new Error("Asset cloning methods not implemented in MemStorage");
  }

  async getRelatedCaseWithEstimate(caseId: string): Promise<{ caseId: string; caseNumber: string } | null> {
    throw new Error("Asset cloning methods not implemented in MemStorage");
  }

  async getRelatedCaseWithDocuments(caseId: string): Promise<{ caseId: string; caseNumber: string; documentCount: number } | null> {
    throw new Error("Asset cloning methods not implemented in MemStorage");
  }

  async cloneDrawingFromCase(sourceCaseId: string, targetCaseId: string, userId: string): Promise<Drawing | null> {
    throw new Error("Asset cloning methods not implemented in MemStorage");
  }

  async cloneEstimateFromCase(sourceCaseId: string, targetCaseId: string, userId: string): Promise<{ estimate: Estimate; rows: EstimateRow[] } | null> {
    throw new Error("Asset cloning methods not implemented in MemStorage");
  }

  async cloneDocumentsFromCase(sourceCaseId: string, targetCaseId: string, userId: string): Promise<CaseDocument[]> {
    throw new Error("Asset cloning methods not implemented in MemStorage");
  }

  // Field Survey Data methods (stub)
  async getFieldSurveyData(caseGroupId: string): Promise<FieldSurveyData | null> {
    throw new Error("Field survey data methods not implemented in MemStorage");
  }

  async saveFieldSurveyData(data: InsertFieldSurveyData): Promise<FieldSurveyData> {
    throw new Error("Field survey data methods not implemented in MemStorage");
  }

  async updateFieldSurveyData(caseGroupId: string, data: Partial<InsertFieldSurveyData>): Promise<FieldSurveyData | null> {
    throw new Error("Field survey data methods not implemented in MemStorage");
  }

  // Shared Drawing methods (stub)
  async getSharedDrawing(caseGroupId: string): Promise<SharedDrawing | null> {
    throw new Error("Shared drawing methods not implemented in MemStorage");
  }

  async saveSharedDrawing(data: InsertSharedDrawing): Promise<SharedDrawing> {
    throw new Error("Shared drawing methods not implemented in MemStorage");
  }

  async updateSharedDrawing(caseGroupId: string, data: Partial<InsertSharedDrawing>): Promise<SharedDrawing | null> {
    throw new Error("Shared drawing methods not implemented in MemStorage");
  }

  // Case group methods (stub)
  async getCasesByGroupId(caseGroupId: string): Promise<Case[]> {
    throw new Error("Case group methods not implemented in MemStorage");
  }

  // Same accident number methods (stub)
  async getCasesByAccidentNo(accidentNo: string, excludeCaseId?: string): Promise<Case[]> {
    throw new Error("Same accident number methods not implemented in MemStorage");
  }

  async syncFieldSurveyToRelatedCases(sourceCaseId: string, fieldData: Partial<InsertCase>): Promise<number> {
    throw new Error("Same accident number methods not implemented in MemStorage");
  }

  async syncDrawingToRelatedCases(sourceCaseId: string): Promise<number> {
    throw new Error("Sync drawing to related cases not implemented in MemStorage");
  }

  async syncDocumentsToRelatedCases(sourceCaseId: string, newDocument: CaseDocument): Promise<number> {
    throw new Error("Sync documents to related cases not implemented in MemStorage");
  }

  async syncEstimateToRelatedCases(sourceCaseId: string): Promise<number> {
    throw new Error("Sync estimate to related cases not implemented in MemStorage");
  }

  // Case number helpers (stub)
  async getPreventionCaseByPrefix(prefix: string): Promise<Case | null> {
    throw new Error("Case number helper methods not implemented in MemStorage");
  }

  async getNextVictimSuffix(prefix: string): Promise<number> {
    throw new Error("Case number helper methods not implemented in MemStorage");
  }
}

export class DbStorage implements IStorage {
  constructor() {
    this.initDatabase();
  }

  private async initDatabase() {
    try {
      // Check if we have any users
      const existingUsers = await db.select().from(users);
      
      // Seed users if no users exist
      if (existingUsers.length === 0) {
        await this.seedTestUsers();
      } else {
        // Always ensure essential accounts exist (admin01, partner01)
        await this.ensureEssentialAccounts();
      }
      
      // NOTE: 더 이상 케이스/견적 더미 데이터를 자동 생성하지 않음
      // 사용자가 직접 데이터를 생성해야 함
    } catch (error) {
      console.error("Database initialization error:", error);
    }
  }

  private async ensureEssentialAccounts() {
    const currentDate = getKSTDate();
    const hashedPassword = await bcrypt.hash("1234", SALT_ROUNDS);
    
    // Check if admin01 exists
    const admin01 = await db.select().from(users).where(eq(users.username, "admin01"));
    if (admin01.length === 0) {
      await db.insert(users).values({
        id: randomUUID(),
        username: "admin01",
        password: hashedPassword,
        role: "관리자",
        name: "김블락",
        company: "플록슨",
        department: "개발팀",
        position: "팀장",
        email: "admin01@floxn.com",
        phone: "010-1001-1001",
        office: "02-1001-1001",
        address: "서울 강남구",
        status: "active",
        createdAt: currentDate,
      });
      console.log("Created essential account: admin01");
    }
    
    // Check if partner01 exists
    const partner01 = await db.select().from(users).where(eq(users.username, "partner01"));
    if (partner01.length === 0) {
      await db.insert(users).values({
        id: randomUUID(),
        username: "partner01",
        password: hashedPassword,
        role: "협력사",
        name: "최진우",
        company: "우리수리",
        department: "현장팀",
        position: "팀장",
        email: "partner01@woori.com",
        phone: "010-3001-3001",
        office: "02-3001-3001",
        address: "서울 마포구",
        bankName: "국민은행",
        accountNumber: "123-456-789",
        accountHolder: "우리수리",
        serviceRegions: ["서울", "경기"],
        status: "active",
        createdAt: currentDate,
      });
      console.log("Created essential account: partner01");
    }
  }

  private async seedTestCases() {
    const currentDate = getKSTDate();
    
    // Get users for case assignment
    const allUsers = await db.select().from(users);
    const admin01 = allUsers.find(u => u.username === "admin01");
    const assessor01 = allUsers.find(u => u.username === "assessor01");
    const assessor02 = allUsers.find(u => u.username === "assessor02");
    const partner01 = allUsers.find(u => u.username === "partner01");
    const partner02 = allUsers.find(u => u.username === "partner02");
    
    if (!admin01) return;
    
    const statuses = ["제출", "검토중", "1차승인", "완료", "청구", "정산완료"];
    const insuranceCompanies = ["MG손해보험", "삼성화재", "현대해상", "DB손해보험", "KB손해보험"];
    
    const testCases = [];
    
    // 지난달 (2024년 10월) 케이스 - 145건
    for (let i = 1; i <= 145; i++) {
      const day = ((i % 28) + 1).toString().padStart(2, '0');
      const status = statuses[i % statuses.length];
      const insurance = insuranceCompanies[i % insuranceCompanies.length];
      
      testCases.push({
        caseNumber: `CLM-2024100${i.toString().padStart(5, '0')}`,
        status,
        accidentDate: `2024-10-${day}`,
        insuranceCompany: insurance,
        insurancePolicyNo: `${insurance.substring(0, 2)}2024-${i.toString().padStart(5, '0')}`,
        insuranceAccidentNo: `24100${i.toString().padStart(4, '0')}`,
        clientResidence: "서울 강남구",
        clientDepartment: "보상팀",
        clientName: `고객${i}`,
        clientContact: "010-0000-0000",
        assessorId: (i % 2 === 0 ? assessor01?.id : assessor02?.id) || null,
        assessorDepartment: "심사팀",
        assessorTeam: (i % 2 === 0 ? "1팀" : "2팀"),
        assessorContact: "010-4001-4001",
        investigatorTeam: "조사1팀",
        investigatorDepartment: "현장조사",
        investigatorTeamName: "플록슨 조사팀",
        investigatorContact: "02-5001-5001",
        policyHolderName: `고객${i}`,
        policyHolderIdNumber: "800101-1******",
        policyHolderAddress: "서울 강남구",
        insuredName: `고객${i}`,
        insuredIdNumber: "800101-1******",
        insuredContact: "010-0000-0000",
        insuredAddress: "서울 강남구",
        victimName: "이웃집",
        victimContact: "010-9999-8888",
        clientPhone: "010-0000-0000",
        clientAddress: "서울 강남구",
        accidentLocation: `서울 강남구 아파트 ${i}호`,
        accidentDescription: "누수 피해",
        assignedTo: (i % 2 === 0 ? partner01?.id : partner02?.id) || null,
        createdBy: admin01.id,
        createdAt: `2024-10-${day}`,
        updatedAt: `2024-10-${day}`,
      });
    }
    
    // 이번달 (2024년 11월) 케이스 - 167건 (전월 대비 +15.2% 증가, 22건 증가)
    for (let i = 1; i <= 167; i++) {
      const day = ((i % 28) + 1).toString().padStart(2, '0');
      const status = statuses[i % statuses.length];
      const insurance = insuranceCompanies[i % insuranceCompanies.length];
      
      testCases.push({
        caseNumber: `CLM-2024110${i.toString().padStart(5, '0')}`,
        status,
        accidentDate: `2024-11-${day}`,
        insuranceCompany: insurance,
        insurancePolicyNo: `${insurance.substring(0, 2)}2024-${i.toString().padStart(5, '0')}`,
        insuranceAccidentNo: `24110${i.toString().padStart(4, '0')}`,
        clientResidence: "서울 서초구",
        clientDepartment: "보상팀",
        clientName: `고객${i}`,
        clientContact: "010-1111-1111",
        assessorId: (i % 2 === 0 ? assessor01?.id : assessor02?.id) || null,
        assessorDepartment: "심사팀",
        assessorTeam: (i % 2 === 0 ? "1팀" : "2팀"),
        assessorContact: "010-4001-4001",
        investigatorTeam: "조사1팀",
        investigatorDepartment: "현장조사",
        investigatorTeamName: "플록슨 조사팀",
        investigatorContact: "02-5001-5001",
        policyHolderName: `고객${i}`,
        policyHolderIdNumber: "800101-1******",
        policyHolderAddress: "서울 서초구",
        insuredName: `고객${i}`,
        insuredIdNumber: "800101-1******",
        insuredContact: "010-1111-1111",
        insuredAddress: "서울 서초구",
        victimName: "이웃집",
        victimContact: "010-9999-8888",
        clientPhone: "010-1111-1111",
        clientAddress: "서울 서초구",
        accidentLocation: `서울 서초구 아파트 ${i}호`,
        accidentDescription: "누수 피해",
        assignedTo: (i % 2 === 0 ? partner01?.id : partner02?.id) || null,
        createdBy: admin01.id,
        createdAt: `2024-11-${day}`,
        updatedAt: `2024-11-${day}`,
      });
    }
    
    // 기존 샘플 케이스 3건 추가 (이번달)
    testCases.push(
      {
        caseNumber: "CLM-25145136",
        status: "제출",
        accidentDate: "2024-11-15",
        insuranceCompany: "MG손해보험",
        insurancePolicyNo: "MG2024-12345",
        insuranceAccidentNo: "25219943",
        clientResidence: "서울 강남구",
        clientDepartment: "보상팀",
        clientName: "김블락",
        clientContact: "010-1234-5678",
        assessorId: assessor01?.id || null,
        assessorDepartment: "심사팀",
        assessorTeam: "1팀",
        assessorContact: "010-4001-4001",
        investigatorTeam: "조사1팀",
        investigatorDepartment: "현장조사",
        investigatorTeamName: "플록슨 조사팀",
        investigatorContact: "02-5001-5001",
        policyHolderName: "김블락",
        policyHolderIdNumber: "800101-1******",
        policyHolderAddress: "서울 강남구 테헤란로 123",
        insuredName: "김블락",
        insuredIdNumber: "800101-1******",
        insuredContact: "010-1234-5678",
        insuredAddress: "서울 강남구 테헤란로 123",
        victimName: "이웃집",
        victimContact: "010-9999-8888",
        clientPhone: "010-1234-5678",
        clientAddress: "서울 강남구 테헤란로 123",
        accidentLocation: "서울 강남구 테헤란로 123 아파트 1001호",
        accidentDescription: "화장실 배관 누수로 인한 천장 침수 피해",
        assignedTo: partner01?.id || null,
        createdBy: admin01.id,
        createdAt: "2024-11-15",
        updatedAt: "2024-11-15",
      },
      {
        caseNumber: "CLM-25145135",
        status: "검토중",
        accidentDate: "2024-11-14",
        insuranceCompany: "삼성화재",
        insurancePolicyNo: "SS2024-67890",
        insuranceAccidentNo: "25219942",
        clientResidence: "서울 서초구",
        clientDepartment: "보상팀",
        clientName: "박철수",
        clientContact: "010-2345-6789",
        assessorId: assessor02?.id || null,
        assessorDepartment: "심사팀",
        assessorTeam: "2팀",
        assessorContact: "010-4002-4002",
        investigatorTeam: "조사2팀",
        investigatorDepartment: "현장조사",
        investigatorTeamName: "플록슨 조사팀",
        investigatorContact: "02-5002-5002",
        policyHolderName: "박철수",
        policyHolderIdNumber: "750505-1******",
        policyHolderAddress: "서울 서초구 강남대로 456",
        insuredName: "박철수",
        insuredIdNumber: "750505-1******",
        insuredContact: "010-2345-6789",
        insuredAddress: "서울 서초구 강남대로 456",
        victimName: "아래층 주민",
        victimContact: "010-7777-6666",
        clientPhone: "010-2345-6789",
        clientAddress: "서울 서초구 강남대로 456",
        accidentLocation: "서울 서초구 강남대로 456 빌라 202호",
        accidentDescription: "싱크대 하수 배관 파손으로 인한 누수",
        assignedTo: partner02?.id || null,
        createdBy: admin01.id,
        createdAt: "2024-11-14",
        updatedAt: "2024-11-14",
      },
      {
        caseNumber: "CLM-25145134",
        status: "작성중",
        accidentDate: "2024-11-13",
        insuranceCompany: "현대해상",
        insurancePolicyNo: "HD2024-11111",
        insuranceAccidentNo: "25219941",
        clientResidence: "경기 성남시",
        clientDepartment: "보상팀",
        clientName: "이미라",
        clientContact: "010-3456-7890",
        assessorId: assessor01?.id || null,
        assessorDepartment: "심사팀",
        assessorTeam: "1팀",
        assessorContact: "010-4001-4001",
        investigatorTeam: "조사1팀",
        investigatorDepartment: "현장조사",
        investigatorTeamName: "플록슨 조사팀",
        investigatorContact: "02-5001-5001",
        policyHolderName: "이미라",
        policyHolderIdNumber: "900303-2******",
        policyHolderAddress: "경기 성남시 분당구 789",
        insuredName: "이미라",
        insuredIdNumber: "900303-2******",
        insuredContact: "010-3456-7890",
        insuredAddress: "경기 성남시 분당구 789",
        victimName: "옆집",
        victimContact: "010-5555-4444",
        clientPhone: "010-3456-7890",
        clientAddress: "경기 성남시 분당구 789",
        accidentLocation: "경기 성남시 분당구 789 아파트 506호",
        accidentDescription: "보일러 배관 동파로 인한 누수 사고",
        assignedTo: partner01?.id || null,
        createdBy: admin01.id,
        createdAt: "2024-11-13",
        updatedAt: "2024-11-13",
      },
    );

    await db.insert(cases).values(testCases);
  }

  private async seedTestEstimates() {
    try {
      // Get all cases with status "완료" or "청구"
      const completedCases = await db
        .select()
        .from(cases)
        .where(sql`${cases.status} IN ('완료', '청구')`);

      if (completedCases.length === 0) {
        console.log("No completed or billed cases found for estimate seeding");
        return;
      }

      // Get admin user for createdBy
      const adminUsers = await db.select().from(users).where(sql`${users.role} = '관리자'`);
      const admin01 = adminUsers.find(u => u.username === "admin01");
      
      if (!admin01) {
        console.log("No admin user found for estimate seeding");
        return;
      }

      // Create sample estimate data for each completed case
      const estimateRecords = completedCases.map((caseRecord, index) => {
        // Generate varied labor cost data
        const laborCostData = [
          {
            id: `labor-${index}-1`,
            category: "도배공사",
            workName: "도배",
            detailWork: "벽지",
            standardPrice: 15000,
            quantity: 20,
            amount: 300000,
            includeInEstimate: false, // 경비 제외
          },
          {
            id: `labor-${index}-2`,
            category: "장판공사",
            workName: "장판",
            detailWork: "PVC 장판",
            standardPrice: 12000,
            quantity: 15,
            amount: 180000,
            includeInEstimate: false, // 경비 제외
          },
        ];

        // Generate varied material cost data
        const materialCostData = [
          {
            id: `material-${index}-1`,
            materialName: "벽지",
            specification: "폭 92cm",
            unit: "m",
            standardPrice: 8000,
            quantity: 25,
            금액: 200000,
          },
        ];

        return {
          caseId: caseRecord.id,
          version: 1,
          status: "submitted",
          createdBy: admin01.id,
          laborCostData: laborCostData as any,
          materialCostData: materialCostData as any,
        };
      });

      // Insert estimates
      await db.insert(estimates).values(estimateRecords);
      
      console.log(`Seeded ${estimateRecords.length} estimates for completed/billed cases`);
    } catch (error) {
      console.error("Error seeding test estimates:", error);
    }
  }

  private async seedTestUsers() {
    const hashedPassword = await bcrypt.hash("1234", SALT_ROUNDS);
    const currentDate = getKSTDate();
    
    const testUsers = [
      // ===== 관리자 5명 =====
      { username: "admin01", password: hashedPassword, role: "관리자", name: "김블락", company: "플록슨", department: "개발팀", position: "팀장", email: "admin01@floxn.com", phone: "010-1001-1001", office: "02-1001-1001", address: "서울 강남구", status: "active", createdAt: currentDate },
      { username: "admin02", password: hashedPassword, role: "관리자", name: "박영희", company: "플록슨", department: "기획팀", position: "부장", email: "admin02@floxn.com", phone: "010-1002-1002", office: "02-1002-1002", address: "서울 송파구", status: "active", createdAt: currentDate },
      { username: "admin03", password: hashedPassword, role: "관리자", name: "이현우", company: "플록슨", department: "인사팀", position: "차장", email: "admin03@floxn.com", phone: "010-1003-1003", office: "02-1003-1003", address: "서울 종로구", status: "active", createdAt: currentDate },
      { username: "admin04", password: hashedPassword, role: "관리자", name: "최지원", company: "플록슨", department: "운영팀", position: "과장", email: "admin04@floxn.com", phone: "010-1004-1004", office: "02-1004-1004", address: "서울 마포구", status: "active", createdAt: currentDate },
      { username: "admin05", password: hashedPassword, role: "관리자", name: "정수현", company: "플록슨", department: "총무팀", position: "대리", email: "admin05@floxn.com", phone: "010-1005-1005", office: "02-1005-1005", address: "서울 서초구", status: "active", createdAt: currentDate },
      
      // ===== 보험사 5명 =====
      { username: "insure01", password: hashedPassword, role: "보험사", name: "김민준", company: "삼성화재", department: "사고접수팀", position: "팀장", email: "insure01@samsung.com", phone: "010-2001-2001", office: "02-2001-2001", address: "서울 강남구", status: "active", createdAt: currentDate },
      { username: "insure02", password: hashedPassword, role: "보험사", name: "이서윤", company: "현대해상", department: "보상팀", position: "차장", email: "insure02@hyundai.com", phone: "010-2002-2002", office: "02-2002-2002", address: "서울 중구", status: "active", createdAt: currentDate },
      { username: "insure03", password: hashedPassword, role: "보험사", name: "박도현", company: "DB손해보험", department: "사고처리팀", position: "과장", email: "insure03@db.com", phone: "010-2003-2003", office: "02-2003-2003", address: "서울 영등포구", status: "active", createdAt: currentDate },
      { username: "insure04", password: hashedPassword, role: "보험사", name: "최하은", company: "KB손해보험", department: "보상심사팀", position: "부장", email: "insure04@kb.com", phone: "010-2004-2004", office: "02-2004-2004", address: "서울 종로구", status: "active", createdAt: currentDate },
      { username: "insure05", password: hashedPassword, role: "보험사", name: "정예준", company: "메리츠화재", department: "사고조사팀", position: "대리", email: "insure05@meritz.com", phone: "010-2005-2005", office: "02-2005-2005", address: "서울 강동구", status: "active", createdAt: currentDate },
      
      // ===== 협력사 5명 =====
      { username: "partner01", password: hashedPassword, role: "협력사", name: "강지훈", company: "AERO 파트너스", department: "현장조사팀", position: "팀장", email: "partner01@aero.com", phone: "010-3001-3001", office: "02-3001-3001", address: "서울 서초구", bankName: "국민은행", accountNumber: "123-456-000001", accountHolder: "강지훈", serviceRegions: ["서울시/강남구", "서초구", "송파구"], status: "active", createdAt: currentDate },
      { username: "partner02", password: hashedPassword, role: "협력사", name: "윤소희", company: "누수닥터", department: "복구팀", position: "차장", email: "partner02@doctor.com", phone: "010-3002-3002", office: "02-3002-3002", address: "서울 용산구", bankName: "신한은행", accountNumber: "234-567-000002", accountHolder: "윤소희", serviceRegions: ["서울시/종로구", "중구", "용산구"], status: "active", createdAt: currentDate },
      { username: "partner03", password: hashedPassword, role: "협력사", name: "장민서", company: "클린워터", department: "기술팀", position: "과장", email: "partner03@cleanwater.com", phone: "010-3003-3003", office: "02-3003-3003", address: "서울 마포구", bankName: "우리은행", accountNumber: "345-678-000003", accountHolder: "장민서", serviceRegions: ["서울시/마포구", "서대문구", "은평구"], status: "active", createdAt: currentDate },
      { username: "partner04", password: hashedPassword, role: "협력사", name: "임채원", company: "수리마스터", department: "시공팀", position: "팀장", email: "partner04@master.com", phone: "010-3004-3004", office: "02-3004-3004", address: "서울 강북구", bankName: "하나은행", accountNumber: "456-789-000004", accountHolder: "임채원", serviceRegions: ["서울시/강북구", "성북구", "노원구"], status: "active", createdAt: currentDate },
      { username: "partner05", password: hashedPassword, role: "협력사", name: "한유진", company: "복구전문가", department: "견적팀", position: "부장", email: "partner05@expert.com", phone: "010-3005-3005", office: "02-3005-3005", address: "경기 성남시", bankName: "농협은행", accountNumber: "567-890-000005", accountHolder: "한유진", serviceRegions: ["경기/성남시", "분당구", "수정구"], status: "active", createdAt: currentDate },
      
      // ===== 심사사 5명 =====
      { username: "assessor01", password: hashedPassword, role: "심사사", name: "신동욱", company: "플록슨", department: "심사팀", position: "수석심사사", email: "assessor01@floxn.com", phone: "010-4001-4001", office: "02-4001-4001", address: "서울 강남구", status: "active", createdAt: currentDate },
      { username: "assessor02", password: hashedPassword, role: "심사사", name: "오서현", company: "플록슨", department: "심사팀", position: "책임심사사", email: "assessor02@floxn.com", phone: "010-4002-4002", office: "02-4002-4002", address: "서울 서초구", status: "active", createdAt: currentDate },
      { username: "assessor03", password: hashedPassword, role: "심사사", name: "배준영", company: "플록슨", department: "심사팀", position: "선임심사사", email: "assessor03@floxn.com", phone: "010-4003-4003", office: "02-4003-4003", address: "서울 송파구", status: "active", createdAt: currentDate },
      { username: "assessor04", password: hashedPassword, role: "심사사", name: "황시우", company: "플록슨", department: "심사팀", position: "심사사", email: "assessor04@floxn.com", phone: "010-4004-4004", office: "02-4004-4004", address: "서울 마포구", status: "active", createdAt: currentDate },
      { username: "assessor05", password: hashedPassword, role: "심사사", name: "서은비", company: "플록슨", department: "심사팀", position: "심사사", email: "assessor05@floxn.com", phone: "010-4005-4005", office: "02-4005-4005", address: "서울 강동구", status: "active", createdAt: currentDate },
      
      // ===== 조사사 5명 =====
      { username: "investigator01", password: hashedPassword, role: "조사사", name: "안재현", company: "플록슨", department: "조사팀", position: "수석조사사", email: "investigator01@floxn.com", phone: "010-5001-5001", office: "02-5001-5001", address: "서울 강남구", status: "active", createdAt: currentDate },
      { username: "investigator02", password: hashedPassword, role: "조사사", name: "조아라", company: "플록슨", department: "조사팀", position: "책임조사사", email: "investigator02@floxn.com", phone: "010-5002-5002", office: "02-5002-5002", address: "서울 성동구", status: "active", createdAt: currentDate },
      { username: "investigator03", password: hashedPassword, role: "조사사", name: "홍민재", company: "플록슨", department: "조사팀", position: "선임조사사", email: "investigator03@floxn.com", phone: "010-5003-5003", office: "02-5003-5003", address: "서울 광진구", status: "active", createdAt: currentDate },
      { username: "investigator04", password: hashedPassword, role: "조사사", name: "허지안", company: "플록슨", department: "조사팀", position: "조사사", email: "investigator04@floxn.com", phone: "010-5004-5004", office: "02-5004-5004", address: "경기 성남시", status: "active", createdAt: currentDate },
      { username: "investigator05", password: hashedPassword, role: "조사사", name: "송다빈", company: "플록슨", department: "조사팀", position: "조사사", email: "investigator05@floxn.com", phone: "010-5005-5005", office: "02-5005-5005", address: "서울 용산구", status: "active", createdAt: currentDate },
    ];

    await db.insert(users).values(testUsers);
  }

  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async getAllUsers(): Promise<User[]> {
    // Return all active users (not soft-deleted)
    const result = await db.select().from(users).where(eq(users.status, "active"));
    return result;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(insertUser.password, SALT_ROUNDS);
    const createdAt = getKSTDate();
    
    const newUser = {
      username: insertUser.username,
      password: hashedPassword,
      role: insertUser.role || "사원",
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
      createdAt,
    };

    const result = await db.insert(users).values(newUser).returning();
    return result[0];
  }

  async verifyPassword(username: string, password: string): Promise<User | null> {
    const user = await this.getUserByUsername(username);
    if (!user) {
      return null;
    }

    const isValid = await bcrypt.compare(password, user.password);
    return isValid ? user : null;
  }

  async updatePassword(username: string, newPassword: string): Promise<User | null> {
    const user = await this.getUserByUsername(username);
    if (!user) {
      return null;
    }

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    
    const result = await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.username, username))
      .returning();
    
    return result[0] || null;
  }

  async deleteAccount(username: string): Promise<User | null> {
    const user = await this.getUserByUsername(username);
    if (!user) {
      return null;
    }

    // Soft delete: update status to "deleted"
    const result = await db
      .update(users)
      .set({ status: "deleted" })
      .where(eq(users.username, username))
      .returning();
    
    return result[0] || null;
  }

  async getCaseById(caseId: string): Promise<Case | null> {
    const result = await db.select().from(cases).where(eq(cases.id, caseId)).limit(1);
    return result[0] || null;
  }

  async getAssignedCasesForUser(user: User, search?: string): Promise<Case[]> {
    // Build filter based on user role
    let query = db.select().from(cases);

    // Role-based filtering
    switch (user.role) {
      case "심사사":
        // Assessors see cases where they are assigned
        query = query.where(eq(cases.assessorId, user.id));
        break;
      case "협력사":
        // Partners see cases assigned to their company
        query = query.where(eq(cases.assignedPartner, user.company));
        break;
      case "조사사":
        // Investigators see cases where their team is assigned
        query = query.where(eq(cases.investigatorTeamName, user.company));
        break;
      case "관리자":
        // Admins see all cases
        break;
      default:
        // Other roles see no cases
        return [];
    }

    // Apply search filter if provided
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

  async getNextCaseSequence(date: string, insuranceAccidentNo?: string): Promise<{ prefix: string; suffix: number }> {
    // Step 1: Check if there are existing cases with the same insurance accident number
    if (insuranceAccidentNo) {
      const existingCases = await db
        .select({ caseNumber: cases.caseNumber })
        .from(cases)
        .where(eq(cases.insuranceAccidentNo, insuranceAccidentNo));
      
      if (existingCases.length > 0) {
        // Extract prefix from first existing case (yyMMddxxx part)
        const firstCaseNumber = existingCases[0].caseNumber;
        if (firstCaseNumber) {
          const parts = firstCaseNumber.split('-');
          if (parts.length >= 2) {
            const prefix = parts[0]; // "251124001"
            
            // Find max suffix for this prefix
            let maxSuffix = -1;
            for (const c of existingCases) {
              if (c.caseNumber && c.caseNumber.startsWith(prefix + '-')) {
                const suffixStr = c.caseNumber.split('-')[1];
                const suffix = parseInt(suffixStr, 10);
                if (!isNaN(suffix) && suffix > maxSuffix) {
                  maxSuffix = suffix;
                }
              }
            }
            
            return { prefix, suffix: maxSuffix + 1 };
          }
        }
      }
    }
    
    // Step 2: No existing cases with same accident number - generate new prefix
    // Convert YYYY-MM-DD to yyMMdd (6 digits)
    const dateParts = date.split('-');
    const year = dateParts[0].substring(2); // YY (last 2 digits)
    const month = dateParts[1]; // MM
    const day = dateParts[2]; // dd
    const datePrefix = year + month + day; // yyMMdd
    
    // Query database for cases with case numbers starting with datePrefix
    const allCases = await db
      .select({ caseNumber: cases.caseNumber })
      .from(cases)
      .where(sql`${cases.caseNumber} LIKE ${datePrefix + '%'}`);
    
    let maxSequence = 0;
    for (const c of allCases) {
      if (c.caseNumber && c.caseNumber.startsWith(datePrefix)) {
        const parts = c.caseNumber.split('-');
        if (parts.length >= 1) {
          const sequencePart = parts[0].substring(6); // Extract XXX from yyMMddxxx
          const seq = parseInt(sequencePart, 10);
          if (!isNaN(seq) && seq > maxSequence) {
            maxSequence = seq;
          }
        }
      }
    }
    
    const nextSequence = maxSequence + 1;
    const seqStr = String(nextSequence).padStart(3, '0');
    const prefix = `${datePrefix}${seqStr}`; // e.g., "251124001"
    
    return { prefix, suffix: 0 };
  }

  async createCase(caseData: Omit<InsertCase, "caseNumber"> & { caseNumber: string; createdBy: string }): Promise<Case> {
    const currentDate = getKSTDate();
    const status = caseData.status || "작성중";
    
    // 상태에 따라 자동으로 날짜 기록 (케이스 생성 시)
    let autoReceptionDate = caseData.receptionDate || null;
    let autoAssignmentDate = caseData.assignmentDate || null;
    
    if (status === "접수완료") {
      // 접수완료 상태로 생성 시 접수일과 배당일 자동 기록 (기존 값 없을 때만)
      if (!autoReceptionDate) {
        autoReceptionDate = currentDate;
      }
      if (!autoAssignmentDate) {
        autoAssignmentDate = currentDate;
      }
    }
    
    const newCase = {
      caseNumber: caseData.caseNumber,
      status: status,
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
      sameAsPolicyHolder: caseData.sameAsPolicyHolder != null 
        ? String(caseData.sameAsPolicyHolder)
        : null,
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
      createdBy: caseData.createdBy,
      createdAt: currentDate,
      updatedAt: currentDate,
    };

    const result = await db.insert(cases).values(newCase).returning();
    return result[0];
  }

  async getAllCases(user?: User): Promise<CaseWithLatestProgress[]> {
    let query: any = db.select().from(cases);
    
    // 권한별 필터링
    if (user) {
      switch (user.role) {
        case "관리자":
          // 관리자는 모든 케이스 조회 가능
          break;
        case "협력사":
          // 협력사는 직급 상관없이 자기 회사의 모든 케이스
          query = query.where(eq(cases.assignedPartner, user.company));
          break;
        case "보험사":
          // 보험사는 자기 회사 케이스만
          query = query.where(eq(cases.insuranceCompany, user.company));
          break;
        case "심사사":
          // 심사사는 자기가 맡은 케이스만
          query = query.where(eq(cases.assessorId, user.id));
          break;
        case "조사사":
          // 조사사는 자기 팀 케이스만
          query = query.where(eq(cases.investigatorTeamName, user.company));
          break;
        case "의뢰사":
          // 의뢰사는 자기가 의뢰한 케이스만
          query = query.where(eq(cases.clientName, user.name));
          break;
        default:
          // 기타 role은 빈 배열 반환
          return [];
      }
    }
    
    const allCases = await query.orderBy(asc(cases.createdAt));
    const allProgressUpdates = await db.select().from(progressUpdates);
    
    // 담당자 이름 조회용 사용자 목록 가져오기
    const allUsers = await db.select().from(users);
    const userMap = new Map(allUsers.map(u => [u.id, u]));
    
    // 각 케이스의 최신 진행상황 찾기
    const casesWithProgress: CaseWithLatestProgress[] = allCases.map(caseItem => {
      // 해당 케이스의 모든 진행상황 찾기
      const caseUpdates = allProgressUpdates
        .filter(update => update.caseId === caseItem.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)); // 최신순 정렬
      
      // 최신 진행상황
      const latestUpdate = caseUpdates[0];
      
      // 담당자 이름 조회 (managerId로 users 테이블에서 찾기)
      const manager = caseItem.managerId ? userMap.get(caseItem.managerId) : null;
      
      return {
        ...caseItem,
        latestProgress: latestUpdate ? {
          content: latestUpdate.content,
          createdAt: latestUpdate.createdAt,
        } : null,
        managerName: manager?.name || null,
      };
    });
    
    return casesWithProgress;
  }

  async updateCase(caseId: string, caseData: Partial<InsertCase>): Promise<Case | null> {
    const currentDate = getKSTDate();
    
    // 배당 협력사 저장 시 assignmentDate 자동 기록 (기존 값이 없을 때만)
    const existingCase = await this.getCaseById(caseId);
    const additionalUpdates: Partial<typeof cases.$inferInsert> = {};
    
    if (caseData.assignedPartner && existingCase && !existingCase.assignmentDate) {
      additionalUpdates.assignmentDate = currentDate;
    }
    
    const result = await db.update(cases)
      .set({ ...caseData, ...additionalUpdates, updatedAt: currentDate })
      .where(eq(cases.id, caseId))
      .returning();
    
    if (result.length === 0) {
      return null;
    }
    
    return result[0];
  }

  async deleteCase(caseId: string): Promise<void> {
    // 1. 먼저 해당 케이스의 견적서 ID 목록 가져오기
    const caseEstimates = await db.select({ id: estimates.id })
      .from(estimates)
      .where(eq(estimates.caseId, caseId));
    
    // 2. 각 견적서의 estimateRows 삭제
    for (const estimate of caseEstimates) {
      await db.delete(estimateRows).where(eq(estimateRows.estimateId, estimate.id));
    }
    
    // 3. 견적서 삭제
    await db.delete(estimates).where(eq(estimates.caseId, caseId));
    
    // 4. 케이스 문서 삭제
    await db.delete(caseDocuments).where(eq(caseDocuments.caseId, caseId));
    
    // 5. 진행상황 업데이트 삭제
    await db.delete(progressUpdates).where(eq(progressUpdates.caseId, caseId));
    
    // 6. 도면 삭제 (drawings 테이블)
    await db.delete(drawings).where(eq(drawings.caseId, caseId));
    
    // 7. 마지막으로 케이스 삭제
    await db.delete(cases).where(eq(cases.id, caseId));
  }

  async updateCaseStatus(caseId: string, status: string): Promise<Case | null> {
    const currentDate = getKSTDate();
    
    // 미복구 선택 시 자동으로 출동비 청구로 정규화 (모든 경로에서 일관성 보장)
    const normalizedStatus = status === "미복구" ? "출동비 청구" : status;
    
    // 먼저 기존 케이스 데이터를 가져와서 일자가 이미 설정되어 있는지 확인
    const existingCase = await this.getCaseById(caseId);
    if (!existingCase) {
      return null;
    }
    
    // 상태에 따라 자동으로 날짜 기록 (기존 값이 없을 때만)
    const dateUpdates: Partial<typeof cases.$inferInsert> = {};
    
    switch (normalizedStatus) {
      case "접수완료":
        // 접수일과 배당일 자동 기록 (기존 값 없을 때만)
        if (!existingCase.receptionDate) {
          dateUpdates.receptionDate = currentDate;
        }
        if (!existingCase.assignmentDate) {
          dateUpdates.assignmentDate = currentDate;
        }
        break;
      case "현장방문":
        // 현장방문일 자동 기록 (기존 값 없을 때만)
        if (!existingCase.siteVisitDate) {
          dateUpdates.siteVisitDate = currentDate;
        }
        break;
      case "현장정보입력":
      case "현장정보제출":
        // 현장자료 제출일 자동 기록 (기존 값 없을 때만)
        if (!existingCase.siteInvestigationSubmitDate) {
          dateUpdates.siteInvestigationSubmitDate = currentDate;
        }
        break;
      case "1차승인":
        // 1차 승인일(내부) 자동 기록 (기존 값 없을 때만)
        if (!existingCase.firstApprovalDate) {
          dateUpdates.firstApprovalDate = currentDate;
        }
        break;
      case "복구요청(2차승인)":
        // 2차 승인일(복구 요청일) 자동 기록 (기존 값 없을 때만)
        if (!existingCase.secondApprovalDate) {
          dateUpdates.secondApprovalDate = currentDate;
        }
        break;
      case "(직접복구인 경우) 청구자료제출":
      case "(선견적요청인 경우) 출동비 청구":
        // 복구완료일 자동 기록 (기존 값 없을 때만)
        if (!existingCase.constructionCompletionDate) {
          dateUpdates.constructionCompletionDate = currentDate;
        }
        break;
      case "청구":
        // 청구일 자동 기록 (기존 값 없을 때만)
        if (!existingCase.claimDate) {
          dateUpdates.claimDate = currentDate;
        }
        break;
    }
    
    const result = await db.update(cases)
      .set({ 
        status: normalizedStatus, 
        updatedAt: currentDate,
        ...dateUpdates
      })
      .where(eq(cases.id, caseId))
      .returning();
    
    if (result.length === 0) {
      return null;
    }
    
    return result[0];
  }

  async updateCaseSpecialNotes(caseId: string, specialNotes: string | null): Promise<Case | null> {
    const currentDate = getKSTDate();
    
    const result = await db.update(cases)
      .set({ specialNotes, specialNotesConfirmedBy: null, updatedAt: currentDate }) // Reset confirmation when notes are updated
      .where(eq(cases.id, caseId))
      .returning();
    
    if (result.length === 0) {
      return null;
    }
    
    return result[0];
  }

  async confirmCaseSpecialNotes(caseId: string, confirmedBy: string): Promise<Case | null> {
    const currentDate = getKSTDate();
    
    const result = await db.update(cases)
      .set({ specialNotesConfirmedBy: confirmedBy, updatedAt: currentDate })
      .where(eq(cases.id, caseId))
      .returning();
    
    if (result.length === 0) {
      return null;
    }
    
    return result[0];
  }

  async updateCaseAdditionalNotes(caseId: string, additionalNotes: string | null): Promise<Case | null> {
    const currentDate = getKSTDate();
    
    const result = await db.update(cases)
      .set({ additionalNotes, updatedAt: currentDate })
      .where(eq(cases.id, caseId))
      .returning();
    
    if (result.length === 0) {
      return null;
    }
    
    return result[0];
  }

  async updateCaseEstimateAmount(caseId: string, estimateAmount: string): Promise<Case | null> {
    const currentDate = getKSTDate();
    
    const result = await db.update(cases)
      .set({ estimateAmount, updatedAt: currentDate })
      .where(eq(cases.id, caseId))
      .returning();
    
    if (result.length === 0) {
      return null;
    }
    
    return result[0];
  }

  async submitFieldSurvey(caseId: string): Promise<Case | null> {
    const currentDate = getKSTDate();
    
    // 현장자료 제출일 자동 기록 (기존 값이 없을 때만)
    const existingCase = await this.getCaseById(caseId);
    const additionalUpdates: Partial<typeof cases.$inferInsert> = {};
    
    if (existingCase && !existingCase.siteInvestigationSubmitDate) {
      additionalUpdates.siteInvestigationSubmitDate = currentDate;
    }
    
    const result = await db.update(cases)
      .set({ 
        fieldSurveyStatus: "submitted",
        status: "제출",
        ...additionalUpdates,
        updatedAt: currentDate 
      })
      .where(eq(cases.id, caseId))
      .returning();
    
    if (result.length === 0) {
      return null;
    }
    
    return result[0];
  }

  async reviewCase(caseId: string, decision: "승인" | "비승인", reviewComment: string | null, reviewedBy: string): Promise<Case | null> {
    const currentDate = getKSTDate();
    const currentTimestamp = getKSTTimestamp();
    
    // 승인 시 1차 승인일(내부) 자동 기록 (기존 값이 없을 때만)
    const existingCase = await this.getCaseById(caseId);
    const additionalUpdates: Partial<typeof cases.$inferInsert> = {};
    
    if (decision === "승인" && existingCase && !existingCase.firstApprovalDate) {
      additionalUpdates.firstApprovalDate = currentDate;
    }
    
    const result = await db.update(cases)
      .set({ 
        reviewDecision: decision,
        reviewComment: reviewComment || null,
        reviewedAt: currentTimestamp,
        reviewedBy: reviewedBy,
        status: decision === "승인" ? "1차승인" : "반려",
        ...additionalUpdates,
        updatedAt: currentDate 
      })
      .where(eq(cases.id, caseId))
      .returning();
    
    if (result.length === 0) {
      return null;
    }
    
    return result[0];
  }

  async updateCaseFieldSurvey(caseId: string, fieldData: {
    visitDate?: string | null;
    visitTime?: string | null;
    travelDistance?: string | null;
    dispatchLocation?: string | null;
    accompaniedPerson?: string | null;
    accidentTime?: string | null;
    accidentCategory?: string | null;
    accidentCause?: string | null;
    specialNotes?: string | null;
    victimName?: string | null;
    victimContact?: string | null;
    victimAddress?: string | null;
    additionalVictims?: string | null;
    specialRequests?: string | null;
    processingTypes?: string | null;
    processingTypeOther?: string | null;
    recoveryMethodType?: string | null;
    fieldSurveyStatus?: string | null;
    status?: string | null; // 케이스 상태 자동 변경용
  }): Promise<Case | null> {
    const currentDate = getKSTDate();
    
    // 현장방문일 저장 시 siteVisitDate 자동 기록 (기존 값이 없을 때만)
    const existingCase = await this.getCaseById(caseId);
    const additionalUpdates: Partial<typeof cases.$inferInsert> = {};
    
    if (fieldData.visitDate && existingCase && !existingCase.siteVisitDate) {
      additionalUpdates.siteVisitDate = currentDate;
    }
    
    const result = await db.update(cases)
      .set({ ...fieldData, ...additionalUpdates, updatedAt: currentDate })
      .where(eq(cases.id, caseId))
      .returning();
    
    if (result.length === 0) {
      return null;
    }
    
    return result[0];
  }

  async getPartnerStats(): Promise<PartnerStats[]> {
    const allCases = await db.select().from(cases);
    const allUsers = await db.select().from(users).where(eq(users.role, "협력사"));
    
    const today = getKSTDate();
    const currentMonth = today.substring(0, 7); // YYYY-MM
    
    return allUsers.map(partner => {
      const partnerCases = allCases.filter(c => c.assignedPartner === partner.company);
      
      const dailyCount = partnerCases.filter(c => c.createdAt === today).length;
      const monthlyCount = partnerCases.filter(c => c.createdAt?.startsWith(currentMonth)).length;
      const inProgressCount = partnerCases.filter(c => c.status !== "작성중" && c.status !== "완료").length;
      const pendingCount = partnerCases.filter(c => c.status !== "완료").length;
      
      return {
        partnerName: partner.company,
        dailyCount,
        monthlyCount,
        inProgressCount,
        pendingCount,
      };
    });
  }

  async createProgressUpdate(data: InsertProgressUpdate): Promise<ProgressUpdate> {
    const currentTimestamp = getKSTTimestamp();
    
    const newUpdate = {
      caseId: data.caseId,
      content: data.content,
      createdBy: data.createdBy,
      createdAt: currentTimestamp,
    };

    const result = await db.insert(progressUpdates).values(newUpdate).returning();
    return result[0];
  }

  async getProgressUpdatesByCaseId(caseId: string): Promise<ProgressUpdate[]> {
    const result = await db.select()
      .from(progressUpdates)
      .where(eq(progressUpdates.caseId, caseId))
      .orderBy(asc(progressUpdates.createdAt));
    return result;
  }

  async getStatisticsFilters(): Promise<StatisticsFilters> {
    // Get all cases and users
    const allCases = await db.select().from(cases);
    const allUsers = await db.select().from(users).where(eq(users.status, "active"));

    // Get unique insurance companies from cases
    const insuranceCompaniesSet = new Set<string>();
    allCases.forEach(caseItem => {
      if (caseItem.insuranceCompany) {
        insuranceCompaniesSet.add(caseItem.insuranceCompany);
      }
    });

    // Get unique company names by role from users
    const assessorsSet = new Set<string>();
    const investigatorsSet = new Set<string>();
    const partnersSet = new Set<string>();
    const settlementManagersSet = new Set<string>();

    allUsers.forEach(user => {
      if (user.role === "심사사" && user.company) {
        assessorsSet.add(user.company);
      } else if (user.role === "조사사" && user.company) {
        investigatorsSet.add(user.company);
      } else if (user.role === "협력사" && user.company) {
        partnersSet.add(user.company);
      }
      
      // Add all active users as potential settlement managers
      if (user.name) {
        settlementManagersSet.add(user.name);
      }
    });

    // Convert to sorted arrays
    return {
      insuranceCompanies: Array.from(insuranceCompaniesSet).sort(),
      assessors: Array.from(assessorsSet).sort(),
      investigators: Array.from(investigatorsSet).sort(),
      partners: Array.from(partnersSet).sort(),
      settlementManagers: Array.from(settlementManagersSet).sort(),
    };
  }

  async getRolePermission(roleName: string): Promise<RolePermission | undefined> {
    const result = await db.select().from(rolePermissions).where(eq(rolePermissions.roleName, roleName));
    return result[0];
  }

  async saveRolePermission(data: InsertRolePermission): Promise<RolePermission> {
    const currentDate = getKSTTimestamp();
    const existing = await this.getRolePermission(data.roleName);
    
    if (existing) {
      // Update existing
      const updated = await db.update(rolePermissions)
        .set({
          permissions: data.permissions,
          updatedAt: currentDate,
        })
        .where(eq(rolePermissions.roleName, data.roleName))
        .returning();
      return updated[0];
    } else {
      // Create new
      const created = await db.insert(rolePermissions)
        .values({
          roleName: data.roleName,
          permissions: data.permissions,
          createdAt: currentDate,
          updatedAt: currentDate,
        })
        .returning();
      return created[0];
    }
  }

  async getAllRolePermissions(): Promise<RolePermission[]> {
    return await db.select().from(rolePermissions);
  }

  // New methods for multi-version support
  async listExcelData(type: string): Promise<ExcelData[]> {
    const result = await db.select()
      .from(excelData)
      .where(eq(excelData.type, type))
      .orderBy(desc(excelData.uploadedAt));
    return result;
  }

  async getExcelDataById(id: string): Promise<ExcelData | null> {
    const result = await db.select()
      .from(excelData)
      .where(eq(excelData.id, id))
      .limit(1);
    return result[0] || null;
  }

  async deleteExcelDataById(id: string): Promise<boolean> {
    const deleted = await db.delete(excelData)
      .where(eq(excelData.id, id))
      .returning();
    return deleted.length > 0;
  }

  async saveExcelData(data: InsertExcelData): Promise<ExcelData> {
    // Create new version (no longer overwrites existing)
    const created = await db.insert(excelData)
      .values({
        type: data.type,
        title: data.title,
        headers: data.headers as any,
        data: data.data as any,
      })
      .returning();
    return created[0];
  }

  // Legacy methods (deprecated, for backward compatibility during migration)
  async getExcelData(type: string): Promise<ExcelData | null> {
    // Use listExcelData to get the latest version (already ordered by uploadedAt DESC)
    const versions = await this.listExcelData(type);
    return versions[0] || null;
  }

  async deleteExcelData(type: string): Promise<void> {
    // Delete all versions of this type
    await db.delete(excelData).where(eq(excelData.type, type));
  }

  async createInquiry(data: InsertInquiry): Promise<Inquiry> {
    const created = await db.insert(inquiries)
      .values({
        userId: data.userId,
        title: data.title,
        content: data.content,
        status: data.status || "대기",
        response: data.response || null,
        respondedBy: data.respondedBy || null,
        respondedAt: data.respondedAt || null,
      })
      .returning();
    return created[0];
  }

  async getAllInquiries(): Promise<Inquiry[]> {
    return await db.select().from(inquiries).orderBy(asc(inquiries.createdAt));
  }

  async getInquiriesByUserId(userId: string): Promise<Inquiry[]> {
    return await db.select().from(inquiries)
      .where(eq(inquiries.userId, userId))
      .orderBy(asc(inquiries.createdAt));
  }

  async updateInquiry(id: string, data: Partial<UpdateInquiry>): Promise<Inquiry | null> {
    const updated = await db.update(inquiries)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(inquiries.id, id))
      .returning();
    return updated[0] || null;
  }

  async saveDrawing(data: InsertDrawing): Promise<Drawing> {
    const created = await db.insert(drawings)
      .values({
        caseId: data.caseId,
        uploadedImages: data.uploadedImages,
        rectangles: data.rectangles,
        accidentAreas: data.accidentAreas,
        leakMarkers: data.leakMarkers,
        createdBy: data.createdBy,
      })
      .returning();
    return created[0];
  }

  async getDrawing(id: string): Promise<Drawing | null> {
    const result = await db.select()
      .from(drawings)
      .where(eq(drawings.id, id))
      .limit(1);
    return result[0] || null;
  }

  async getDrawingByCaseId(caseId: string): Promise<Drawing | null> {
    const result = await db.select()
      .from(drawings)
      .where(eq(drawings.caseId, caseId))
      .limit(1);
    return result[0] || null;
  }

  async updateDrawing(id: string, data: Partial<InsertDrawing>): Promise<Drawing | null> {
    const updated = await db.update(drawings)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(drawings.id, id))
      .returning();
    return updated[0] || null;
  }

  async getOrCreateActiveCase(userId: string): Promise<Case> {
    // Find existing active case (작성중) for this user
    const existing = await db.select()
      .from(cases)
      .where(and(
        eq(cases.createdBy, userId),
        eq(cases.status, "작성중")
      ))
      .limit(1);

    if (existing.length > 0) {
      return existing[0];
    }

    // Create new active case for drawing purposes
    const caseNumber = `CLM-DRAW-${Date.now()}`;
    const newCase = await db.insert(cases)
      .values({
        caseNumber,
        status: "작성중",
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return newCase[0];
  }

  // Document methods
  async saveDocument(data: InsertCaseDocument): Promise<CaseDocument> {
    const created = await db.insert(caseDocuments)
      .values({
        caseId: data.caseId,
        category: data.category,
        fileName: data.fileName,
        fileType: data.fileType,
        fileSize: data.fileSize,
        fileData: data.fileData,
        createdBy: data.createdBy,
      })
      .returning();
    return created[0];
  }

  async getDocument(id: string): Promise<CaseDocument | null> {
    const result = await db.select()
      .from(caseDocuments)
      .where(eq(caseDocuments.id, id))
      .limit(1);
    return result[0] || null;
  }

  async getDocumentsByCaseId(caseId: string): Promise<CaseDocument[]> {
    const result = await db.select()
      .from(caseDocuments)
      .where(eq(caseDocuments.caseId, caseId))
      .orderBy(desc(caseDocuments.createdAt));
    return result;
  }

  async deleteDocument(id: string): Promise<void> {
    await db.delete(caseDocuments)
      .where(eq(caseDocuments.id, id));
  }

  async updateDocumentCategory(id: string, category: string): Promise<CaseDocument | null> {
    const updated = await db.update(caseDocuments)
      .set({ category })
      .where(eq(caseDocuments.id, id))
      .returning();
    return updated[0] || null;
  }

  // Estimate methods
  async createEstimateVersion(
    caseId: string, 
    userId: string, 
    rows: Omit<InsertEstimateRow, 'estimateId'>[],
    laborCostData: any | null = null,
    materialCostData: any | null = null,
    vatIncluded: boolean = true
  ): Promise<{ estimate: Estimate; rows: EstimateRow[] }> {
    return await db.transaction(async (tx) => {
      // 1. 현재 최대 버전 조회 (row-level locking으로 동시성 제어)
      const existingEstimates = await tx
        .select({ version: estimates.version })
        .from(estimates)
        .where(eq(estimates.caseId, caseId))
        .orderBy(desc(estimates.version))
        .limit(1)
        .for('update'); // row-level lock 추가

      const nextVersion = existingEstimates.length > 0 ? existingEstimates[0].version + 1 : 1;

      // 2. 새 견적 레코드 생성 (노무비/자재비 데이터 포함, vatIncluded는 materialCostData에 같이 저장)
      // materialCostData에 vatIncluded 옵션을 함께 저장 (배열이 아닌 객체 형태로 감싸서)
      const enrichedMaterialCostData = {
        rows: materialCostData || [],
        vatIncluded, // VAT 포함/별도 옵션 저장
      };
      
      const [newEstimate] = await tx
        .insert(estimates)
        .values({
          caseId,
          version: nextVersion,
          status: "draft",
          createdBy: userId,
          laborCostData: Array.isArray(laborCostData) ? laborCostData : null,
          materialCostData: enrichedMaterialCostData,
        })
        .returning();

      // 3. 견적 행들을 배치로 삽입
      if (rows.length > 0) {
        // rowOrder 정규화: 정렬 후 1부터 순차적으로 할당
        const sortedInputRows = [...rows].sort((a, b) => {
          const orderA = a.rowOrder ?? 0;
          const orderB = b.rowOrder ?? 0;
          return orderA - orderB;
        });

        const rowsWithEstimateId = sortedInputRows.map((row, index) => ({
          ...row,
          estimateId: newEstimate.id,
          rowOrder: index + 1, // 1부터 시작하는 순차적 번호
        }));

        const insertedRows = await tx
          .insert(estimateRows)
          .values(rowsWithEstimateId)
          .returning();

        // rowOrder로 정렬하여 반환
        const sortedRows = insertedRows.sort((a, b) => a.rowOrder - b.rowOrder);

        return { estimate: newEstimate, rows: sortedRows };
      }

      return { estimate: newEstimate, rows: [] };
    });
  }

  async getLatestEstimate(caseId: string): Promise<{ estimate: Estimate; rows: EstimateRow[] } | null> {
    // 최신 버전의 견적 조회
    const latestEstimate = await db
      .select()
      .from(estimates)
      .where(eq(estimates.caseId, caseId))
      .orderBy(desc(estimates.version))
      .limit(1);

    if (latestEstimate.length === 0) {
      return null;
    }

    const estimate = latestEstimate[0];

    // 해당 견적의 행들을 조회
    const rows = await db
      .select()
      .from(estimateRows)
      .where(eq(estimateRows.estimateId, estimate.id))
      .orderBy(asc(estimateRows.rowOrder));

    return { estimate, rows };
  }

  async getEstimateVersion(caseId: string, version: number): Promise<{ estimate: Estimate; rows: EstimateRow[] } | null> {
    // 특정 버전의 견적 조회
    const result = await db
      .select()
      .from(estimates)
      .where(and(
        eq(estimates.caseId, caseId),
        eq(estimates.version, version)
      ))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const estimate = result[0];

    // 해당 견적의 행들을 조회
    const rows = await db
      .select()
      .from(estimateRows)
      .where(eq(estimateRows.estimateId, estimate.id))
      .orderBy(asc(estimateRows.rowOrder));

    return { estimate, rows };
  }

  async listEstimateVersions(caseId: string): Promise<Estimate[]> {
    // 모든 버전의 견적 리스트 조회 (최신 버전부터)
    const allVersions = await db
      .select()
      .from(estimates)
      .where(eq(estimates.caseId, caseId))
      .orderBy(desc(estimates.version));

    return allVersions;
  }

  // Master data methods
  async getMasterData(category?: string, includeInactive: boolean = false): Promise<MasterData[]> {
    if (category) {
      if (includeInactive) {
        // 특정 카테고리의 모든 데이터 조회 (관리자용)
        return await db
          .select()
          .from(masterData)
          .where(eq(masterData.category, category))
          .orderBy(asc(masterData.displayOrder), asc(masterData.value));
      } else {
        // 특정 카테고리의 활성 데이터만 조회 (displayOrder 순서로)
        return await db
          .select()
          .from(masterData)
          .where(and(
            eq(masterData.category, category),
            eq(masterData.isActive, "true")
          ))
          .orderBy(asc(masterData.displayOrder), asc(masterData.value));
      }
    } else {
      if (includeInactive) {
        // 모든 데이터 조회 (관리자용)
        return await db
          .select()
          .from(masterData)
          .orderBy(asc(masterData.category), asc(masterData.displayOrder), asc(masterData.value));
      } else {
        // 모든 활성 데이터 조회
        return await db
          .select()
          .from(masterData)
          .where(eq(masterData.isActive, "true"))
          .orderBy(asc(masterData.category), asc(masterData.displayOrder), asc(masterData.value));
      }
    }
  }

  async createMasterData(data: InsertMasterData): Promise<MasterData> {
    const [created] = await db.insert(masterData).values(data).returning();
    return created;
  }

  async deleteMasterData(id: string): Promise<void> {
    // Soft delete: isActive를 false로 설정
    await db
      .update(masterData)
      .set({ isActive: "false", updatedAt: new Date() })
      .where(eq(masterData.id, id));
  }

  async updateMasterData(id: string, data: Partial<InsertMasterData>): Promise<MasterData | null> {
    const [updated] = await db
      .update(masterData)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(masterData.id, id))
      .returning();
    
    return updated || null;
  }

  // Labor cost methods
  async getLaborCosts(filters?: { category?: string; workName?: string; detailWork?: string }): Promise<LaborCost[]> {
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
      query = query.where(and(...conditions)) as any;
    }
    
    return await query.orderBy(asc(laborCosts.category), asc(laborCosts.workName));
  }

  async getLaborCostOptions(): Promise<{
    categories: string[];
    workNamesByCategory: Record<string, string[]>;
    detailWorksByWork: Record<string, string[]>;
  }> {
    const allCosts = await db.select().from(laborCosts).orderBy(asc(laborCosts.category), asc(laborCosts.workName));
    
    const categories = new Set<string>();
    const workNamesByCategory: Record<string, Set<string>> = {};
    const detailWorksByWork: Record<string, Set<string>> = {};
    
    for (const cost of allCosts) {
      const category = cost.category?.trim();
      const workName = cost.workName?.trim();
      const detailWork = cost.detailWork?.trim();
      
      if (!category || !workName || !detailWork) continue;
      
      categories.add(category);
      
      if (!workNamesByCategory[category]) {
        workNamesByCategory[category] = new Set();
      }
      workNamesByCategory[category].add(workName);
      
      const workKey = `${category}|${workName}`;
      if (!detailWorksByWork[workKey]) {
        detailWorksByWork[workKey] = new Set();
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
      ),
    };
  }

  async createLaborCost(data: InsertLaborCost): Promise<LaborCost> {
    const [created] = await db.insert(laborCosts).values(data).returning();
    return created;
  }

  async deleteLaborCost(id: string): Promise<void> {
    await db.delete(laborCosts).where(eq(laborCosts.id, Number(id)));
  }

  // Material methods
  async listMaterials(workType?: string): Promise<Material[]> {
    let query = db
      .select()
      .from(materials);
    
    if (workType) {
      query = query.where(and(
        eq(materials.isActive, "true"),
        eq(materials.workType, workType)
      ));
    } else {
      query = query.where(eq(materials.isActive, "true"));
    }

    return query.orderBy(
      asc(materials.workType),
      asc(materials.materialName),
      asc(materials.specification)
    );
  }

  async createMaterial(data: InsertMaterial): Promise<Material> {
    const [created] = await db.insert(materials).values(data).returning();
    return created;
  }

  async deleteMaterial(id: string): Promise<void> {
    await db.delete(materials).where(eq(materials.id, Number(id)));
  }

  async getMaterialsCatalog(): Promise<Array<{
    workType: string;
    materialName: string;
    specification: string;
    unit: string;
    standardPrice: number | string;
  }>> {
    // Get 자재비 data from excel_data table, sorted by upload date (최신 데이터 먼저)
    const excelRows = await db
      .select()
      .from(excelData)
      .where(eq(excelData.type, "자재비"))
      .orderBy(sql`${excelData.uploadedAt} DESC`);
    
    if (excelRows.length === 0) {
      return [];
    }
    
    // Take the most recent upload (first in DESC order)
    const latestExcelData = excelRows[0];
    const headers = latestExcelData.headers as string[];
    const data = latestExcelData.data as any[][];
    
    // Find column indices
    const workTypeIdx = headers.findIndex(h => h === "공종명");
    const materialNameIdx = headers.findIndex(h => h === "자재명");
    const specIdx = headers.findIndex(h => h === "규격");
    const unitIdx = headers.findIndex(h => h === "단위");
    const priceIdx = headers.findIndex(h => h === "단가");
    
    if (materialNameIdx === -1 || unitIdx === -1 || priceIdx === -1) {
      console.error("Missing required columns in excel_data 자재비");
      return [];
    }
    
    // Forward-fill processing
    let lastWorkType = "";
    let lastMaterialName = "";
    let lastSpecification = "";
    
    const catalog: Array<{
      workType: string;
      materialName: string;
      specification: string;
      unit: string;
      standardPrice: number | string;
    }> = [];
    
    for (const row of data) {
      // Skip empty rows or rows with invalid structure
      if (!row || row.length === 0) continue;
      
      // Get values with forward-fill
      const workType = (workTypeIdx !== -1 && row[workTypeIdx]) ? row[workTypeIdx] : lastWorkType;
      const materialName = row[materialNameIdx] ?? lastMaterialName;
      const specification = row[specIdx] ?? lastSpecification;
      const unit = row[unitIdx];
      const price = row[priceIdx];
      
      // Skip if essential fields are missing
      if (!workType || !materialName || !unit || price === undefined || price === null) {
        continue;
      }
      
      // Update last values for forward-fill
      if (workTypeIdx !== -1 && row[workTypeIdx]) lastWorkType = workType;
      if (row[materialNameIdx]) lastMaterialName = materialName;
      if (row[specIdx] !== null && row[specIdx] !== undefined) lastSpecification = specification;
      
      // Parse price: if it's "입력", keep as string; otherwise convert to number
      let standardPrice: number | string = price;
      if (typeof price === "string") {
        // Remove commas and try to parse
        const cleaned = price.replace(/,/g, "");
        const parsed = parseFloat(cleaned);
        standardPrice = isNaN(parsed) ? price : parsed;
      }
      
      catalog.push({
        workType,
        materialName,
        specification: specification || "-",
        unit,
        standardPrice,
      });
    }
    
    return catalog;
  }

  // User favorites methods
  async getUserFavorites(userId: string): Promise<UserFavorite[]> {
    const favorites = await db
      .select()
      .from(userFavorites)
      .where(eq(userFavorites.userId, userId))
      .orderBy(asc(userFavorites.createdAt));
    return favorites;
  }

  async addFavorite(data: InsertUserFavorite): Promise<UserFavorite> {
    const [favorite] = await db
      .insert(userFavorites)
      .values(data)
      .returning();
    return favorite;
  }

  async removeFavorite(userId: string, menuName: string): Promise<void> {
    await db
      .delete(userFavorites)
      .where(
        and(
          eq(userFavorites.userId, userId),
          eq(userFavorites.menuName, menuName)
        )
      );
  }

  // Notice methods
  async getAllNotices(): Promise<Notice[]> {
    const allNotices = await db
      .select()
      .from(notices)
      .orderBy(desc(notices.createdAt));
    return allNotices;
  }

  async createNotice(data: InsertNotice): Promise<Notice> {
    const [created] = await db
      .insert(notices)
      .values(data)
      .returning();
    return created;
  }

  async updateNotice(id: string, data: { title: string; content: string }): Promise<Notice | null> {
    const [updated] = await db
      .update(notices)
      .set({
        title: data.title,
        content: data.content,
        updatedAt: new Date(),
      })
      .where(eq(notices.id, id))
      .returning();
    return updated || null;
  }

  async deleteNotice(id: string): Promise<void> {
    await db.delete(notices).where(eq(notices.id, id));
  }

  // Asset cloning methods (for syncing from related cases)
  async getRelatedCaseWithDrawing(caseId: string): Promise<{ caseId: string; caseNumber: string } | null> {
    // Get the source case to find its accident number
    const sourceCase = await this.getCaseById(caseId);
    if (!sourceCase || !sourceCase.insuranceAccidentNo) return null;

    // Find related cases with the same accident number
    const relatedCases = await this.getCasesByAccidentNo(sourceCase.insuranceAccidentNo, caseId);
    
    // Find the first related case that has a drawing
    for (const relatedCase of relatedCases) {
      const drawing = await this.getDrawingByCaseId(relatedCase.id);
      if (drawing) {
        return { caseId: relatedCase.id, caseNumber: relatedCase.caseNumber || '' };
      }
    }
    return null;
  }

  async getRelatedCaseWithEstimate(caseId: string): Promise<{ caseId: string; caseNumber: string } | null> {
    // Get the source case to find its accident number
    const sourceCase = await this.getCaseById(caseId);
    if (!sourceCase || !sourceCase.insuranceAccidentNo) return null;

    // Find related cases with the same accident number
    const relatedCases = await this.getCasesByAccidentNo(sourceCase.insuranceAccidentNo, caseId);
    
    // Find the first related case that has an estimate
    for (const relatedCase of relatedCases) {
      const estimate = await this.getLatestEstimate(relatedCase.id);
      if (estimate) {
        return { caseId: relatedCase.id, caseNumber: relatedCase.caseNumber || '' };
      }
    }
    return null;
  }

  async getRelatedCaseWithDocuments(caseId: string): Promise<{ caseId: string; caseNumber: string; documentCount: number } | null> {
    // Get the source case to find its accident number
    const sourceCase = await this.getCaseById(caseId);
    if (!sourceCase || !sourceCase.insuranceAccidentNo) return null;

    // Find related cases with the same accident number
    const relatedCases = await this.getCasesByAccidentNo(sourceCase.insuranceAccidentNo, caseId);
    
    // Find the first related case that has documents
    for (const relatedCase of relatedCases) {
      const docs = await this.getDocumentsByCaseId(relatedCase.id);
      if (docs && docs.length > 0) {
        return { caseId: relatedCase.id, caseNumber: relatedCase.caseNumber || '', documentCount: docs.length };
      }
    }
    return null;
  }

  async cloneDrawingFromCase(sourceCaseId: string, targetCaseId: string, userId: string): Promise<Drawing | null> {
    // Get source drawing
    const sourceDrawing = await this.getDrawingByCaseId(sourceCaseId);
    if (!sourceDrawing) return null;

    // Check if target already has a drawing
    const existingDrawing = await this.getDrawingByCaseId(targetCaseId);
    if (existingDrawing) {
      // Update existing drawing with source data
      const updated = await this.updateDrawing(existingDrawing.id, {
        uploadedImages: sourceDrawing.uploadedImages,
        rectangles: sourceDrawing.rectangles,
        accidentAreas: sourceDrawing.accidentAreas,
        leakMarkers: sourceDrawing.leakMarkers,
      });
      return updated;
    }

    // Create new drawing for target case
    const newDrawing = await this.saveDrawing({
      caseId: targetCaseId,
      uploadedImages: sourceDrawing.uploadedImages,
      rectangles: sourceDrawing.rectangles,
      accidentAreas: sourceDrawing.accidentAreas,
      leakMarkers: sourceDrawing.leakMarkers,
      createdBy: userId,
    });
    return newDrawing;
  }

  async cloneEstimateFromCase(sourceCaseId: string, targetCaseId: string, userId: string): Promise<{ estimate: Estimate; rows: EstimateRow[] } | null> {
    // Get source estimate with rows
    const sourceEstimate = await this.getLatestEstimate(sourceCaseId);
    if (!sourceEstimate) return null;

    // Create new estimate for target case (version 1)
    const rowsData = sourceEstimate.rows.map(row => ({
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
      rowOrder: row.rowOrder,
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

  async cloneDocumentsFromCase(sourceCaseId: string, targetCaseId: string, userId: string): Promise<CaseDocument[]> {
    // Get source documents
    const sourceDocuments = await this.getDocumentsByCaseId(sourceCaseId);
    if (!sourceDocuments || sourceDocuments.length === 0) return [];

    // Clone each document
    const clonedDocuments: CaseDocument[] = [];
    for (const doc of sourceDocuments) {
      const newDoc = await this.saveDocument({
        caseId: targetCaseId,
        category: doc.category,
        fileName: doc.fileName,
        fileType: doc.fileType,
        fileSize: doc.fileSize,
        fileData: doc.fileData,
        createdBy: userId,
      });
      clonedDocuments.push(newDoc);
    }
    return clonedDocuments;
  }

  // Field Survey Data methods
  async getFieldSurveyData(caseGroupId: string): Promise<FieldSurveyData | null> {
    const [result] = await db
      .select()
      .from(fieldSurveyData)
      .where(eq(fieldSurveyData.caseGroupId, caseGroupId))
      .limit(1);
    return result || null;
  }

  async saveFieldSurveyData(data: InsertFieldSurveyData): Promise<FieldSurveyData> {
    const [created] = await db
      .insert(fieldSurveyData)
      .values(data)
      .returning();
    return created;
  }

  async updateFieldSurveyData(caseGroupId: string, data: Partial<InsertFieldSurveyData>): Promise<FieldSurveyData | null> {
    const [updated] = await db
      .update(fieldSurveyData)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(fieldSurveyData.caseGroupId, caseGroupId))
      .returning();
    return updated || null;
  }

  // Shared Drawing methods
  async getSharedDrawing(caseGroupId: string): Promise<SharedDrawing | null> {
    const [result] = await db
      .select()
      .from(sharedDrawings)
      .where(eq(sharedDrawings.caseGroupId, caseGroupId))
      .limit(1);
    return result || null;
  }

  async saveSharedDrawing(data: InsertSharedDrawing): Promise<SharedDrawing> {
    const [created] = await db
      .insert(sharedDrawings)
      .values(data)
      .returning();
    return created;
  }

  async updateSharedDrawing(caseGroupId: string, data: Partial<InsertSharedDrawing>): Promise<SharedDrawing | null> {
    const [updated] = await db
      .update(sharedDrawings)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(sharedDrawings.caseGroupId, caseGroupId))
      .returning();
    return updated || null;
  }

  // Case group methods
  async getCasesByGroupId(caseGroupId: string): Promise<Case[]> {
    const result = await db
      .select()
      .from(cases)
      .where(eq(cases.caseGroupId, caseGroupId))
      .orderBy(asc(cases.caseNumber));
    return result;
  }

  // Same accident number methods (for field survey sync)
  async getCasesByAccidentNo(accidentNo: string, excludeCaseId?: string): Promise<Case[]> {
    if (!accidentNo) return [];
    
    const conditions = [eq(cases.insuranceAccidentNo, accidentNo)];
    
    const result = await db
      .select()
      .from(cases)
      .where(and(...conditions))
      .orderBy(asc(cases.caseNumber));
    
    // Filter out the excluded case if provided
    if (excludeCaseId) {
      return result.filter(c => c.id !== excludeCaseId);
    }
    return result;
  }

  async syncFieldSurveyToRelatedCases(sourceCaseId: string, fieldData: Partial<InsertCase>): Promise<number> {
    // Get source case to find its accident number
    const sourceCase = await this.getCaseById(sourceCaseId);
    if (!sourceCase || !sourceCase.insuranceAccidentNo) {
      return 0;
    }

    // Get all related cases (same accident number, different receipt)
    const relatedCases = await this.getCasesByAccidentNo(sourceCase.insuranceAccidentNo, sourceCaseId);
    
    if (relatedCases.length === 0) {
      return 0;
    }

    // Update all related cases with the field survey data
    let updatedCount = 0;
    for (const relatedCase of relatedCases) {
      try {
        await db
          .update(cases)
          .set(fieldData)
          .where(eq(cases.id, relatedCase.id));
        updatedCount++;
      } catch (error) {
        console.error(`Failed to sync field survey to case ${relatedCase.id}:`, error);
      }
    }

    return updatedCount;
  }

  // Real-time sync for drawings to all related cases (same accident number)
  async syncDrawingToRelatedCases(sourceCaseId: string): Promise<number> {
    const sourceCase = await this.getCaseById(sourceCaseId);
    if (!sourceCase || !sourceCase.insuranceAccidentNo) {
      return 0;
    }

    const relatedCases = await this.getCasesByAccidentNo(sourceCase.insuranceAccidentNo, sourceCaseId);
    if (relatedCases.length === 0) {
      return 0;
    }

    // Get source drawing
    const sourceDrawing = await this.getDrawingByCaseId(sourceCaseId);
    if (!sourceDrawing) {
      return 0;
    }

    let syncedCount = 0;
    for (const relatedCase of relatedCases) {
      try {
        // Check if related case already has a drawing
        const existingDrawing = await this.getDrawingByCaseId(relatedCase.id);
        
        if (existingDrawing) {
          // Update existing drawing with source data
          await db
            .update(drawings)
            .set({
              uploadedImages: sourceDrawing.uploadedImages,
              rectangles: sourceDrawing.rectangles,
              accidentAreas: sourceDrawing.accidentAreas,
              leakMarkers: sourceDrawing.leakMarkers,
            })
            .where(eq(drawings.id, existingDrawing.id));
        } else {
          // Create new drawing for related case
          await db.insert(drawings).values({
            id: randomUUID(),
            caseId: relatedCase.id,
            uploadedImages: sourceDrawing.uploadedImages,
            rectangles: sourceDrawing.rectangles,
            accidentAreas: sourceDrawing.accidentAreas,
            leakMarkers: sourceDrawing.leakMarkers,
            createdBy: sourceDrawing.createdBy,
            createdAt: getKSTDate(),
          });
        }
        syncedCount++;
      } catch (error) {
        console.error(`Failed to sync drawing to case ${relatedCase.id}:`, error);
      }
    }

    console.log(`[Drawing Sync] Synced drawing from case ${sourceCaseId} to ${syncedCount} related cases`);
    return syncedCount;
  }

  // Real-time sync for new documents to all related cases (same accident number)
  async syncDocumentsToRelatedCases(sourceCaseId: string, newDocument: CaseDocument): Promise<number> {
    const sourceCase = await this.getCaseById(sourceCaseId);
    if (!sourceCase || !sourceCase.insuranceAccidentNo) {
      return 0;
    }

    const relatedCases = await this.getCasesByAccidentNo(sourceCase.insuranceAccidentNo, sourceCaseId);
    if (relatedCases.length === 0) {
      return 0;
    }

    let syncedCount = 0;
    for (const relatedCase of relatedCases) {
      try {
        // Create the same document for related case (duplicate with new id)
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
          uploadedAt: getKSTDate(),
        });
        syncedCount++;
      } catch (error) {
        console.error(`Failed to sync document to case ${relatedCase.id}:`, error);
      }
    }

    console.log(`[Document Sync] Synced document "${newDocument.fileName}" from case ${sourceCaseId} to ${syncedCount} related cases`);
    return syncedCount;
  }

  // Real-time sync for estimates to all related cases (same accident number)
  async syncEstimateToRelatedCases(sourceCaseId: string): Promise<number> {
    const sourceCase = await this.getCaseById(sourceCaseId);
    if (!sourceCase || !sourceCase.insuranceAccidentNo) {
      return 0;
    }

    const relatedCases = await this.getCasesByAccidentNo(sourceCase.insuranceAccidentNo, sourceCaseId);
    if (relatedCases.length === 0) {
      return 0;
    }

    // Get source estimate with rows
    const sourceEstimate = await this.getLatestEstimate(sourceCaseId);
    if (!sourceEstimate) {
      return 0;
    }

    let syncedCount = 0;
    for (const relatedCase of relatedCases) {
      try {
        // Get next version for related case
        const existingVersions = await db
          .select({ version: estimates.version })
          .from(estimates)
          .where(eq(estimates.caseId, relatedCase.id))
          .orderBy(desc(estimates.version))
          .limit(1);
        
        const nextVersion = (existingVersions[0]?.version || 0) + 1;
        const newEstimateId = randomUUID();

        // Create new estimate version for related case
        await db.insert(estimates).values({
          id: newEstimateId,
          caseId: relatedCase.id,
          version: nextVersion,
          createdBy: sourceEstimate.estimate.createdBy,
          createdAt: getKSTDate(),
          laborCostData: sourceEstimate.estimate.laborCostData,
          materialCostData: sourceEstimate.estimate.materialCostData,
          vatIncluded: sourceEstimate.estimate.vatIncluded,
        });

        // Copy all rows
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
            note: row.note,
          });
        }

        // Update case's estimate amount if available
        if (sourceCase.estimateAmount) {
          await db
            .update(cases)
            .set({ estimateAmount: sourceCase.estimateAmount })
            .where(eq(cases.id, relatedCase.id));
        }

        syncedCount++;
      } catch (error) {
        console.error(`Failed to sync estimate to case ${relatedCase.id}:`, error);
      }
    }

    console.log(`[Estimate Sync] Synced estimate from case ${sourceCaseId} to ${syncedCount} related cases`);
    return syncedCount;
  }

  // Case number helpers
  // 손해방지 케이스 확인 (prefix만 있는 케이스 = 손해방지)
  async getPreventionCaseByPrefix(prefix: string): Promise<Case | null> {
    const result = await db
      .select()
      .from(cases)
      .where(eq(cases.caseNumber, prefix))
      .limit(1);
    return result[0] || null;
  }

  // 피해세대복구 다음 suffix 계산
  async getNextVictimSuffix(prefix: string): Promise<number> {
    // Find all cases with this prefix (including prefix itself and prefix-N)
    const allCases = await db
      .select({ caseNumber: cases.caseNumber })
      .from(cases)
      .where(sql`${cases.caseNumber} LIKE ${prefix + '%'}`);
    
    // Find the maximum suffix used
    let maxSuffix = 0;
    for (const c of allCases) {
      if (c.caseNumber && c.caseNumber.startsWith(prefix + '-')) {
        const suffixStr = c.caseNumber.split('-')[1];
        const suffix = parseInt(suffixStr, 10);
        if (!isNaN(suffix) && suffix > maxSuffix) {
          maxSuffix = suffix;
        }
      }
    }
    
    return maxSuffix + 1;
  }

  // 기존 케이스들의 날짜를 상태 기반으로 자동 채우기
  async migrateExistingCaseDates(): Promise<number> {
    const allCases = await db.select().from(cases);
    let updatedCount = 0;

    for (const caseItem of allCases) {
      const dateUpdates: Partial<typeof cases.$inferInsert> = {};
      const baseDate = caseItem.createdAt || getKSTDate();

      // 접수일: 없으면 createdAt으로 설정
      if (!caseItem.receptionDate) {
        dateUpdates.receptionDate = baseDate;
      }

      // 상태에 따라 순차적으로 날짜 채우기
      const status = caseItem.status;
      const statusOrder = [
        "배당대기", "접수완료", "현장방문", "현장정보입력", "검토중", "반려",
        "1차승인", "현장정보제출", "복구요청(2차승인)", "직접복구", "선견적요청",
        "(직접복구인 경우) 청구자료제출", "(선견적요청인 경우) 출동비 청구",
        "청구", "입금완료", "일부입금", "정산완료"
      ];

      const currentIndex = statusOrder.indexOf(status || "");

      // 배당일: 접수완료 이후 상태면 설정
      if (!caseItem.assignmentDate && currentIndex >= statusOrder.indexOf("접수완료")) {
        dateUpdates.assignmentDate = baseDate;
      }

      // 현장방문일: 현장방문 이후 상태면 설정
      if (!caseItem.siteVisitDate && currentIndex >= statusOrder.indexOf("현장방문")) {
        dateUpdates.siteVisitDate = baseDate;
      }

      // 현장자료 제출일: 현장정보입력 이후 상태면 설정
      if (!caseItem.siteInvestigationSubmitDate && currentIndex >= statusOrder.indexOf("현장정보입력")) {
        dateUpdates.siteInvestigationSubmitDate = baseDate;
      }

      // 1차 승인일: 1차승인 이후 상태면 설정
      if (!caseItem.firstApprovalDate && currentIndex >= statusOrder.indexOf("1차승인")) {
        dateUpdates.firstApprovalDate = baseDate;
      }

      // 2차 승인일: 복구요청(2차승인) 이후 상태면 설정
      if (!caseItem.secondApprovalDate && currentIndex >= statusOrder.indexOf("복구요청(2차승인)")) {
        dateUpdates.secondApprovalDate = baseDate;
      }

      // 복구완료일: 청구자료제출 또는 출동비 청구 이후 상태면 설정
      if (!caseItem.constructionCompletionDate && 
          (currentIndex >= statusOrder.indexOf("(직접복구인 경우) 청구자료제출") ||
           currentIndex >= statusOrder.indexOf("(선견적요청인 경우) 출동비 청구"))) {
        dateUpdates.constructionCompletionDate = baseDate;
      }

      // 청구일: 청구 이후 상태면 설정
      if (!caseItem.claimDate && currentIndex >= statusOrder.indexOf("청구")) {
        dateUpdates.claimDate = baseDate;
      }

      // 업데이트할 내용이 있으면 DB 업데이트
      if (Object.keys(dateUpdates).length > 0) {
        await db.update(cases)
          .set(dateUpdates)
          .where(eq(cases.id, caseItem.id));
        updatedCount++;
      }
    }

    console.log(`[Date Migration] Updated ${updatedCount} cases with auto-populated dates`);
    return updatedCount;
  }
}

export const storage = new DbStorage();
