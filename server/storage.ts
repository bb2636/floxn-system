import { type User, type InsertUser, users, type Case, type CaseWithLatestProgress, type InsertCase, cases, type ProgressUpdate, type InsertProgressUpdate, progressUpdates, type RolePermission, type InsertRolePermission, rolePermissions, type ExcelData, type InsertExcelData, excelData, type Inquiry, type InsertInquiry, type UpdateInquiry, inquiries, type Drawing, type InsertDrawing, drawings } from "@shared/schema";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";
import { db } from "./db";
import { eq, asc, desc, and } from "drizzle-orm";

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
  createCase(caseData: Omit<InsertCase, "caseNumber"> & { caseNumber: string; createdBy: string }): Promise<Case>;
  getAllCases(): Promise<CaseWithLatestProgress[]>;
  updateCaseStatus(caseId: string, status: string): Promise<Case | null>;
  updateCaseSpecialNotes(caseId: string, specialNotes: string | null): Promise<Case | null>;
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
  // Drawing methods
  saveDrawing(data: InsertDrawing): Promise<Drawing>;
  getDrawing(id: string): Promise<Drawing | null>;
  getDrawingByCaseId(caseId: string): Promise<Drawing | null>;
  updateDrawing(id: string, data: Partial<InsertDrawing>): Promise<Drawing | null>;
  // Case helper for drawing persistence
  getOrCreateActiveCase(userId: string): Promise<Case>;
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

  constructor() {
    this.users = new Map();
    this.cases = new Map();
    this.progressUpdates = new Map();
    this.rolePermissions = new Map();
    this.excelData = new Map();
    this.inquiries = new Map();
    this.drawings = new Map();
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

  async createCase(caseData: Omit<InsertCase, "caseNumber"> & { caseNumber: string; createdBy: string }): Promise<Case> {
    const id = randomUUID();
    const currentDate = getKSTDate();
    
    const newCase: Case = {
      id,
      caseNumber: caseData.caseNumber,
      status: caseData.status || "작성중",
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
      victimName: caseData.victimName || null,
      victimContact: caseData.victimContact || null,
      clientPhone: caseData.clientPhone || null,
      clientAddress: caseData.clientAddress || null,
      accidentLocation: caseData.accidentLocation || null,
      accidentDescription: caseData.accidentDescription || null,
      accidentType: caseData.accidentType || null,
      accidentCause: caseData.accidentCause || null,
      restorationMethod: caseData.restorationMethod || null,
      otherVendorEstimate: caseData.otherVendorEstimate || null,
      damageItems: caseData.damageItems || null,
      assignedPartner: caseData.assignedPartner || null,
      assignedPartnerManager: caseData.assignedPartnerManager || null,
      assignedPartnerContact: caseData.assignedPartnerContact || null,
      urgency: caseData.urgency || null,
      specialRequests: caseData.specialRequests || null,
      progressStatus: caseData.progressStatus || null,
      specialNotes: caseData.specialNotes || null,
      assignmentDate: caseData.assignmentDate || null,
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
    };
    
    this.cases.set(id, newCase);
    return newCase;
  }

  async getAllCases(): Promise<CaseWithLatestProgress[]> {
    const allCases = Array.from(this.cases.values());
    
    // createdAt 기준 오름차순 정렬 (가장 오래된 것부터)
    allCases.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    
    // 각 케이스의 최신 진행상황 찾기
    const casesWithProgress: CaseWithLatestProgress[] = allCases.map(caseItem => {
      // 해당 케이스의 모든 진행상황 찾기
      const caseUpdates = Array.from(this.progressUpdates.values())
        .filter(update => update.caseId === caseItem.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)); // 최신순 정렬
      
      // 최신 진행상황
      const latestUpdate = caseUpdates[0];
      
      return {
        ...caseItem,
        latestProgress: latestUpdate ? {
          content: latestUpdate.content,
          createdAt: latestUpdate.createdAt,
        } : null,
      };
    });
    
    return casesWithProgress;
  }

  async updateCaseStatus(caseId: string, status: string): Promise<Case | null> {
    const caseItem = this.cases.get(caseId);
    if (!caseItem) {
      return null;
    }
    
    const updatedCase: Case = {
      ...caseItem,
      status,
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
}

export class DbStorage implements IStorage {
  constructor() {
    this.initDatabase();
  }

  private async initDatabase() {
    try {
      // Check if we have any users
      const existingUsers = await db.select().from(users);
      
      // Only seed if database is empty
      if (existingUsers.length === 0) {
        await this.seedTestUsers();
        await this.seedTestCases();
      }
    } catch (error) {
      console.error("Database initialization error:", error);
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
    
    const testCases = [
      {
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
        createdAt: "2025-01-15",
        updatedAt: "2025-01-15",
      },
      {
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
        createdAt: "2025-01-14",
        updatedAt: "2025-01-14",
      },
      {
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
        createdAt: "2025-01-13",
        updatedAt: "2025-01-13",
      },
    ];

    await db.insert(cases).values(testCases);
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

  async createCase(caseData: Omit<InsertCase, "caseNumber"> & { caseNumber: string; createdBy: string }): Promise<Case> {
    const currentDate = getKSTDate();
    
    const newCase = {
      caseNumber: caseData.caseNumber,
      status: caseData.status || "작성중",
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
      victimName: caseData.victimName || null,
      victimContact: caseData.victimContact || null,
      clientPhone: caseData.clientPhone || null,
      clientAddress: caseData.clientAddress || null,
      accidentLocation: caseData.accidentLocation || null,
      accidentDescription: caseData.accidentDescription || null,
      accidentType: caseData.accidentType || null,
      accidentCause: caseData.accidentCause || null,
      restorationMethod: caseData.restorationMethod || null,
      otherVendorEstimate: caseData.otherVendorEstimate || null,
      damageItems: caseData.damageItems || null,
      assignedPartner: caseData.assignedPartner || null,
      assignedPartnerManager: caseData.assignedPartnerManager || null,
      assignedPartnerContact: caseData.assignedPartnerContact || null,
      urgency: caseData.urgency || null,
      specialRequests: caseData.specialRequests || null,
      progressStatus: caseData.progressStatus || null,
      specialNotes: caseData.specialNotes || null,
      assignedTo: caseData.assignedTo || null,
      createdBy: caseData.createdBy,
      createdAt: currentDate,
      updatedAt: currentDate,
    };

    const result = await db.insert(cases).values(newCase).returning();
    return result[0];
  }

  async getAllCases(): Promise<CaseWithLatestProgress[]> {
    const allCases = await db.select().from(cases).orderBy(asc(cases.createdAt));
    const allProgressUpdates = await db.select().from(progressUpdates);
    
    // 각 케이스의 최신 진행상황 찾기
    const casesWithProgress: CaseWithLatestProgress[] = allCases.map(caseItem => {
      // 해당 케이스의 모든 진행상황 찾기
      const caseUpdates = allProgressUpdates
        .filter(update => update.caseId === caseItem.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)); // 최신순 정렬
      
      // 최신 진행상황
      const latestUpdate = caseUpdates[0];
      
      return {
        ...caseItem,
        latestProgress: latestUpdate ? {
          content: latestUpdate.content,
          createdAt: latestUpdate.createdAt,
        } : null,
      };
    });
    
    return casesWithProgress;
  }

  async updateCaseStatus(caseId: string, status: string): Promise<Case | null> {
    const currentDate = getKSTDate();
    
    const result = await db.update(cases)
      .set({ status, updatedAt: currentDate })
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
      .set({ specialNotes, updatedAt: currentDate })
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
  }): Promise<Case | null> {
    const currentDate = getKSTDate();
    
    const result = await db.update(cases)
      .set({ ...fieldData, updatedAt: currentDate })
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
}

export const storage = new DbStorage();
