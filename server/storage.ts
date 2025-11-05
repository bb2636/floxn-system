import { type User, type InsertUser, users, type Claim, type InsertClaim, claims } from "@shared/schema";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";
import { db } from "./db";
import { eq, and, or } from "drizzle-orm";

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
  // Claims methods
  getClaimsForUser(user: User): Promise<Claim[]>;
  getDashboardStats(user: User, startDate?: string, endDate?: string): Promise<{
    totalReception: number;
    totalPending: number;
    insuranceUnsettled: { count: number; amount: string };
    partnerUnsettled: { count: number; amount: string };
    receptionWaiting: number;
    investigating: number;
    reviewing: number;
    completed: number;
  }>;
  createClaim(claim: InsertClaim): Promise<Claim>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private claims: Map<string, Claim>;

  constructor() {
    this.users = new Map();
    this.claims = new Map();
    this.seedTestUser();
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
    ];

    testUsers.forEach((user) => {
      this.users.set(user.id, user);
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

  // Helper function to check if user position is 과장 or above
  private isManagerOrAbove(position: string | null): boolean {
    const managerPositions = ["과장", "차장", "부장", "이사", "상무", "전무", "부사장", "사장", "대표이사"];
    return position ? managerPositions.includes(position) : false;
  }

  async getClaimsForUser(user: User): Promise<Claim[]> {
    const allClaims = Array.from(this.claims.values());

    // 관리자는 모든 데이터를 볼 수 있음
    if (user.role === "관리자") {
      return allClaims;
    }

    // 과장 이상: 해당 회사의 모든 데이터
    if (this.isManagerOrAbove(user.position)) {
      return allClaims.filter(c => c.company === user.company);
    }

    // 과장 미만: 자기가 담당한 건만
    return allClaims.filter(c => c.assignedTo === user.username);
  }

  async getDashboardStats(user: User, startDate?: string, endDate?: string): Promise<{
    totalReception: number;
    totalPending: number;
    insuranceUnsettled: { count: number; amount: string };
    partnerUnsettled: { count: number; amount: string };
    receptionWaiting: number;
    investigating: number;
    reviewing: number;
    completed: number;
  }> {
    let userClaims = await this.getClaimsForUser(user);

    // Filter by date range if provided
    if (startDate && endDate) {
      userClaims = userClaims.filter(claim => {
        const accidentDate = claim.accidentDate;
        return accidentDate >= startDate && accidentDate <= endDate;
      });
    }

    // Calculate statistics
    const totalReception = userClaims.length;
    const totalPending = userClaims.filter(c => c.status !== "완료").length;

    // Insurance unsettled claims
    const insuranceUnsettledClaims = userClaims.filter(c => c.insuranceType === "보험사 미정산");
    const insuranceUnsettledAmount = insuranceUnsettledClaims.reduce((sum, claim) => {
      const amount = parseInt(claim.settlementAmount || "0");
      return sum + amount;
    }, 0);

    // Partner unsettled claims
    const partnerUnsettledClaims = userClaims.filter(c => c.insuranceType === "협력사 미정산");
    const partnerUnsettledAmount = partnerUnsettledClaims.reduce((sum, claim) => {
      const amount = parseInt(claim.settlementAmount || "0");
      return sum + amount;
    }, 0);

    // Status counts
    const receptionWaiting = userClaims.filter(c => c.status === "접수 대기").length;
    const investigating = userClaims.filter(c => c.status === "조사중").length;
    const reviewing = userClaims.filter(c => c.status === "심사중").length;
    const completed = userClaims.filter(c => c.status === "완료").length;

    return {
      totalReception,
      totalPending,
      insuranceUnsettled: { 
        count: insuranceUnsettledClaims.length, 
        amount: insuranceUnsettledAmount.toString() 
      },
      partnerUnsettled: { 
        count: partnerUnsettledClaims.length, 
        amount: partnerUnsettledAmount.toString() 
      },
      receptionWaiting,
      investigating,
      reviewing,
      completed,
    };
  }

  async createClaim(insertClaim: InsertClaim): Promise<Claim> {
    const id = randomUUID();
    const currentDate = getKSTDate();
    
    const newClaim: Claim = {
      id,
      ...insertClaim,
      status: insertClaim.status || "접수 대기",
      claimAmount: insertClaim.claimAmount || null,
      settlementAmount: insertClaim.settlementAmount || null,
      insuranceType: insertClaim.insuranceType || null,
      createdAt: currentDate,
      updatedAt: currentDate,
    };

    this.claims.set(id, newClaim);
    return newClaim;
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

      // Check if we have any claims
      const existingClaims = await db.select().from(claims);
      
      // Only seed if claims table is empty
      if (existingClaims.length === 0) {
        await this.seedTestClaims();
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

  private async seedTestClaims() {
    const currentDate = getKSTDate();
    
    const testClaims = [
      // Claims assigned to xblock01 (관리자 - sees all)
      {
        claimNumber: "CLM-2024-001",
        assignedTo: "xblock01",
        company: "플록슨",
        status: "조사중",
        accidentDate: "2024-01-15",
        claimAmount: "5000000",
        settlementAmount: "4500000",
        insuranceType: "보험사 미정산",
        createdAt: currentDate,
        updatedAt: currentDate,
      },
      {
        claimNumber: "CLM-2024-002",
        assignedTo: "chulsu01",
        company: "플록슨",
        status: "접수 대기",
        accidentDate: "2024-01-20",
        claimAmount: "3000000",
        settlementAmount: "2800000",
        insuranceType: "협력사 미정산",
        createdAt: currentDate,
        updatedAt: currentDate,
      },
      {
        claimNumber: "CLM-2024-003",
        assignedTo: "kang01",
        company: "플록슨",
        status: "심사중",
        accidentDate: "2024-02-01",
        claimAmount: "7500000",
        settlementAmount: "7000000",
        insuranceType: "보험사 미정산",
        createdAt: currentDate,
        updatedAt: currentDate,
      },
      {
        claimNumber: "CLM-2024-004",
        assignedTo: "jung01",
        company: "플록슨",
        status: "조사중",
        accidentDate: "2024-02-10",
        claimAmount: "2000000",
        settlementAmount: "1900000",
        insuranceType: "협력사 미정산",
        createdAt: currentDate,
        updatedAt: currentDate,
      },
      {
        claimNumber: "CLM-2024-005",
        assignedTo: "xblock01",
        company: "플록슨",
        status: "완료",
        accidentDate: "2024-02-15",
        claimAmount: "10000000",
        settlementAmount: "9500000",
        insuranceType: "보험사 미정산",
        createdAt: currentDate,
        updatedAt: currentDate,
      },
    ];

    await db.insert(claims).values(testClaims);
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

  // Helper function to check if user position is 과장 or above
  private isManagerOrAbove(position: string | null): boolean {
    const managerPositions = ["과장", "차장", "부장", "이사", "상무", "전무", "부사장", "사장", "대표이사"];
    return position ? managerPositions.includes(position) : false;
  }

  async getClaimsForUser(user: User): Promise<Claim[]> {
    try {
      // 관리자는 모든 데이터를 볼 수 있음
      if (user.role === "관리자") {
        return await db.select().from(claims);
      }

      // 과장 이상: 해당 회사의 모든 데이터
      if (this.isManagerOrAbove(user.position)) {
        return await db.select().from(claims).where(eq(claims.company, user.company));
      }

      // 과장 미만: 자기가 담당한 건만
      return await db.select().from(claims).where(eq(claims.assignedTo, user.username));
    } catch (error) {
      console.error("Error getting claims for user:", error);
      return [];
    }
  }

  async getDashboardStats(user: User, startDate?: string, endDate?: string): Promise<{
    totalReception: number;
    totalPending: number;
    insuranceUnsettled: { count: number; amount: string };
    partnerUnsettled: { count: number; amount: string };
    receptionWaiting: number;
    investigating: number;
    reviewing: number;
    completed: number;
  }> {
    try {
      // Get all claims the user can see
      let userClaims = await this.getClaimsForUser(user);

      // Filter by date range if provided
      if (startDate && endDate) {
        userClaims = userClaims.filter(claim => {
          const accidentDate = claim.accidentDate;
          return accidentDate >= startDate && accidentDate <= endDate;
        });
      }

      // Calculate statistics
      const totalReception = userClaims.length;
      const totalPending = userClaims.filter(c => c.status !== "완료").length;

      // Insurance unsettled claims
      const insuranceUnsettledClaims = userClaims.filter(c => c.insuranceType === "보험사 미정산");
      const insuranceUnsettledAmount = insuranceUnsettledClaims.reduce((sum, claim) => {
        const amount = parseInt(claim.settlementAmount || "0");
        return sum + amount;
      }, 0);

      // Partner unsettled claims
      const partnerUnsettledClaims = userClaims.filter(c => c.insuranceType === "협력사 미정산");
      const partnerUnsettledAmount = partnerUnsettledClaims.reduce((sum, claim) => {
        const amount = parseInt(claim.settlementAmount || "0");
        return sum + amount;
      }, 0);

      // Status counts
      const receptionWaiting = userClaims.filter(c => c.status === "접수 대기").length;
      const investigating = userClaims.filter(c => c.status === "조사중").length;
      const reviewing = userClaims.filter(c => c.status === "심사중").length;
      const completed = userClaims.filter(c => c.status === "완료").length;

      return {
        totalReception,
        totalPending,
        insuranceUnsettled: { 
          count: insuranceUnsettledClaims.length, 
          amount: insuranceUnsettledAmount.toString() 
        },
        partnerUnsettled: { 
          count: partnerUnsettledClaims.length, 
          amount: partnerUnsettledAmount.toString() 
        },
        receptionWaiting,
        investigating,
        reviewing,
        completed,
      };
    } catch (error) {
      console.error("Error getting dashboard stats:", error);
      return {
        totalReception: 0,
        totalPending: 0,
        insuranceUnsettled: { count: 0, amount: "0" },
        partnerUnsettled: { count: 0, amount: "0" },
        receptionWaiting: 0,
        investigating: 0,
        reviewing: 0,
        completed: 0,
      };
    }
  }

  async createClaim(insertClaim: InsertClaim): Promise<Claim> {
    const currentDate = getKSTDate();
    
    const newClaim = {
      ...insertClaim,
      createdAt: currentDate,
      updatedAt: currentDate,
    };

    const result = await db.insert(claims).values(newClaim).returning();
    return result[0];
  }
}

export const storage = new DbStorage();
