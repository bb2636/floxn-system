import { sql } from "drizzle-orm";
import { pgTable, text, varchar } from "drizzle-orm/pg-core";
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

export const VALID_ROLES = ["심사사", "조사사", "보험사", "협력사", "관리자"] as const;
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
