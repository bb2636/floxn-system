import { type User, type InsertUser } from "@shared/schema";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByAccidentNumber(accidentNumber: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  verifyPassword(accidentNumber: string, password: string): Promise<User | null>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;

  constructor() {
    this.users = new Map();
    this.seedTestUser();
  }

  private async seedTestUser() {
    const hashedPassword = await bcrypt.hash("test1234", SALT_ROUNDS);
    const testUser: User = {
      id: randomUUID(),
      accidentNumber: "TEST-2024-001",
      password: hashedPassword,
    };
    this.users.set(testUser.id, testUser);
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByAccidentNumber(accidentNumber: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.accidentNumber === accidentNumber,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(insertUser.password, SALT_ROUNDS);
    const id = randomUUID();
    const user: User = {
      ...insertUser,
      id,
      password: hashedPassword,
    };
    this.users.set(id, user);
    return user;
  }

  async verifyPassword(accidentNumber: string, password: string): Promise<User | null> {
    const user = await this.getUserByAccidentNumber(accidentNumber);
    if (!user) {
      return null;
    }

    const isValid = await bcrypt.compare(password, user.password);
    return isValid ? user : null;
  }
}

export const storage = new MemStorage();
