import { type User, type InsertUser, users, type Case, type InsertCase, cases } from "@shared/schema";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";
import { db } from "./db";
import { eq } from "drizzle-orm";

const SALT_ROUNDS = 10;

// Get current date in KST (Korea Standard Time, UTC+9)
function getKSTDate(): string {
  const kstDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const year = kstDate.getFullYear();
  const month = String(kstDate.getMonth() + 1).padStart(2, '0');
  const day = String(kstDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
  getAllCases(): Promise<Case[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private cases: Map<string, Case>;

  constructor() {
    this.users = new Map();
    this.cases = new Map();
    this.seedTestUser();
    this.seedTestCases();
  }

  private async seedTestUser() {
    const hashedPassword = await bcrypt.hash("1234", SALT_ROUNDS);
    const currentDate = getKSTDate();
    
    const testUsers: User[] = [
      {
        id: randomUUID(),
        username: "xblock01",
        password: hashedPassword,
        role: "관리자",
        name: "김블락",
        company: "플록슨",
        department: "개발팀",
        position: "팀장",
        email: "xblock@floxn.com",
        phone: "010-1234-5678",
        office: "02-1234-5678",
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
        username: "chulsu01",
        password: hashedPassword,
        role: "사원",
        name: "이철수",
        company: "플록슨",
        department: "영업팀",
        position: "대리",
        email: "chulsu@floxn.com",
        phone: "010-2345-6789",
        office: "02-2345-6789",
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
        username: "park01",
        password: hashedPassword,
        role: "관리자",
        name: "박영희",
        company: "플록슨",
        department: "기획팀",
        position: "부장",
        email: "park@floxn.com",
        phone: "010-3456-7890",
        office: "02-3456-7890",
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
        username: "jung01",
        password: hashedPassword,
        role: "사원",
        name: "정민수",
        company: "플록슨",
        department: "개발팀",
        position: "사원",
        email: "jung@floxn.com",
        phone: "010-4567-8901",
        office: "02-4567-8901",
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
        username: "choi01",
        password: hashedPassword,
        role: "사원",
        name: "최수정",
        company: "플록슨",
        department: "마케팅팀",
        position: "과장",
        email: "choi@floxn.com",
        phone: "010-5678-9012",
        office: "02-5678-9012",
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
        username: "kimh01",
        password: hashedPassword,
        role: "관리자",
        name: "김현우",
        company: "플록슨",
        department: "인사팀",
        position: "차장",
        email: "kimh@floxn.com",
        phone: "010-6789-0123",
        office: "02-6789-0123",
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
        username: "yoon01",
        password: hashedPassword,
        role: "사원",
        name: "윤서연",
        company: "플록슨",
        department: "영업팀",
        position: "사원",
        email: "yoon@floxn.com",
        phone: "010-7890-1234",
        office: "02-7890-1234",
        address: "서울 양천구",
        bankName: null,
        accountNumber: null,
        accountHolder: null,
        serviceRegions: null,
        attachments: null,
        status: "active",
        createdAt: currentDate,
      },
      // 보험사 사용자
      {
        id: randomUUID(),
        username: "mg_insure01",
        password: hashedPassword,
        role: "보험사",
        name: "이블락",
        company: "MG손해보험",
        department: "사고접수팀",
        position: "팀장",
        email: "block@mg.com",
        phone: "010-1111-2222",
        office: "02-1111-2222",
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
        username: "samsung_insure01",
        password: hashedPassword,
        role: "보험사",
        name: "김영희",
        company: "삼성화재",
        department: "보상팀",
        position: "과장",
        email: "kim@samsungfire.com",
        phone: "010-2222-3333",
        office: "02-2222-3333",
        address: "서울 강남구",
        bankName: null,
        accountNumber: null,
        accountHolder: null,
        serviceRegions: null,
        attachments: null,
        status: "active",
        createdAt: currentDate,
      },
      // 협력사 사용자
      {
        id: randomUUID(),
        username: "partner_choi01",
        password: hashedPassword,
        role: "협력사",
        name: "최블락",
        company: "AERO 파트너스",
        department: "현장조사팀",
        position: "팀장",
        email: "choi@aero.com",
        phone: "010-3333-4444",
        office: "02-3333-4444",
        address: "서울 서초구",
        bankName: "국민은행",
        accountNumber: "123-456-789012",
        accountHolder: "최블락",
        serviceRegions: ["서울시/강남구", "서초구", "송파구"],
        attachments: null,
        status: "active",
        createdAt: currentDate,
      },
      {
        id: randomUUID(),
        username: "partner_jung01",
        password: hashedPassword,
        role: "협력사",
        name: "정지훈",
        company: "누수닥터",
        department: "복구팀",
        position: "차장",
        email: "jung@doctor.com",
        phone: "010-4444-5555",
        office: "02-4444-5555",
        address: "서울 용산구",
        bankName: "신한은행",
        accountNumber: "234-567-890123",
        accountHolder: "정지훈",
        serviceRegions: ["서울시/종로구", "중구", "용산구"],
        attachments: null,
        status: "active",
        createdAt: currentDate,
      },
      // 심사사 사용자
      {
        id: randomUUID(),
        username: "assessor_park01",
        password: hashedPassword,
        role: "심사사",
        name: "박블락",
        company: "플록슨",
        department: "심사팀",
        position: "심사사",
        email: "park.assessor@floxn.com",
        phone: "010-5555-6666",
        office: "02-5555-6666",
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
        username: "assessor_lee01",
        password: hashedPassword,
        role: "심사사",
        name: "이민수",
        company: "플록슨",
        department: "심사팀",
        position: "수석심사사",
        email: "lee.assessor@floxn.com",
        phone: "010-6666-7777",
        office: "02-6666-7777",
        address: "서울 강동구",
        bankName: null,
        accountNumber: null,
        accountHolder: null,
        serviceRegions: null,
        attachments: null,
        status: "active",
        createdAt: currentDate,
      },
      // 조사사 사용자
      {
        id: randomUUID(),
        username: "investigator_song01",
        password: hashedPassword,
        role: "조사사",
        name: "송혜교",
        company: "플록슨",
        department: "조사팀",
        position: "조사사",
        email: "song.inv@floxn.com",
        phone: "010-7777-8888",
        office: "02-7777-8888",
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
        username: "investigator_kang01",
        password: hashedPassword,
        role: "조사사",
        name: "강동원",
        company: "플록슨",
        department: "조사팀",
        position: "수석조사사",
        email: "kang.inv@floxn.com",
        phone: "010-8888-9999",
        office: "02-8888-9999",
        address: "경기 성남시",
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
    const adminUser = usersArray.find(u => u.username === "xblock01");
    const insuranceUser1 = usersArray.find(u => u.username === "mg_insure01");
    const insuranceUser2 = usersArray.find(u => u.username === "samsung_insure01");
    const partner1 = usersArray.find(u => u.username === "partner_choi01");
    const partner2 = usersArray.find(u => u.username === "partner_jung01");
    const assessor1 = usersArray.find(u => u.username === "assessor_park01");
    const assessor2 = usersArray.find(u => u.username === "assessor_lee01");
    
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
      assignedTo: caseData.assignedTo || null,
      createdBy: caseData.createdBy,
      createdAt: currentDate,
      updatedAt: currentDate,
    };
    
    this.cases.set(id, newCase);
    return newCase;
  }

  async getAllCases(): Promise<Case[]> {
    return Array.from(this.cases.values());
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
      }
    } catch (error) {
      console.error("Database initialization error:", error);
    }
  }

  private async seedTestUsers() {
    const hashedPassword = await bcrypt.hash("1234", SALT_ROUNDS);
    const currentDate = getKSTDate();
    
    const testUsers = [
      {
        username: "xblock01",
        password: hashedPassword,
        role: "관리자",
        name: "김블락",
        company: "플록슨",
        department: "개발팀",
        position: "팀장",
        email: "xblock@floxn.com",
        phone: "010-1234-5678",
        office: "02-1234-5678",
        address: "서울 강남구",
        status: "active",
        createdAt: currentDate,
      },
      {
        username: "chulsu01",
        password: hashedPassword,
        role: "사원",
        name: "이철수",
        company: "플록슨",
        department: "영업팀",
        position: "대리",
        email: "chulsu@floxn.com",
        phone: "010-2345-6789",
        office: "02-2345-6789",
        address: "서울 서초구",
        status: "active",
        createdAt: currentDate,
      },
      {
        username: "park01",
        password: hashedPassword,
        role: "관리자",
        name: "박영희",
        company: "플록슨",
        department: "기획팀",
        position: "부장",
        email: "park@floxn.com",
        phone: "010-3456-7890",
        office: "02-3456-7890",
        address: "서울 송파구",
        status: "active",
        createdAt: currentDate,
      },
      {
        username: "jung01",
        password: hashedPassword,
        role: "사원",
        name: "정민수",
        company: "플록슨",
        department: "개발팀",
        position: "사원",
        email: "jung@floxn.com",
        phone: "010-4567-8901",
        office: "02-4567-8901",
        address: "경기 성남시",
        status: "active",
        createdAt: currentDate,
      },
      {
        username: "choi01",
        password: hashedPassword,
        role: "사원",
        name: "최지은",
        company: "플록슨",
        department: "마케팅팀",
        position: "주임",
        email: "choi@floxn.com",
        phone: "010-5678-9012",
        office: "02-5678-9012",
        address: "서울 마포구",
        status: "active",
        createdAt: currentDate,
      },
      {
        username: "kang01",
        password: hashedPassword,
        role: "사원",
        name: "강동원",
        company: "플록슨",
        department: "총무팀",
        position: "과장",
        email: "kang@floxn.com",
        phone: "010-6789-0123",
        office: "02-6789-0123",
        address: "서울 용산구",
        status: "active",
        createdAt: currentDate,
      },
      {
        username: "han01",
        password: hashedPassword,
        role: "사원",
        name: "한소희",
        company: "플록슨",
        department: "인사팀",
        position: "차장",
        email: "han@floxn.com",
        phone: "010-7890-1234",
        office: "02-7890-1234",
        address: "서울 양천구",
        status: "active",
        createdAt: currentDate,
      },
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
      insuranceAccidentNo: caseData.insuranceAccidentNo || null,
      insurancePolicyNo: caseData.insurancePolicyNo || null,
      insuranceCompany: caseData.insuranceCompany || null,
      clientName: caseData.clientName || null,
      clientPhone: caseData.clientPhone || null,
      clientAddress: caseData.clientAddress || null,
      accidentDate: caseData.accidentDate || null,
      accidentLocation: caseData.accidentLocation || null,
      accidentDescription: caseData.accidentDescription || null,
      assignedTo: caseData.assignedTo || null,
      createdBy: caseData.createdBy,
      createdAt: currentDate,
      updatedAt: currentDate,
    };

    const result = await db.insert(cases).values(newCase).returning();
    return result[0];
  }

  async getAllCases(): Promise<Case[]> {
    const result = await db.select().from(cases);
    return result;
  }
}

export const storage = new DbStorage();
