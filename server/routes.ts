import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { loginSchema, updatePasswordSchema, deleteAccountSchema, createAccountSchema } from "@shared/schema";
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

  // Get dashboard statistics endpoint
  app.get("/api/dashboard/stats", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ error: "사용자를 찾을 수 없습니다" });
      }

      const stats = await storage.getDashboardStats(user);
      res.json(stats);
    } catch (error) {
      console.error("Dashboard stats error:", error);
      res.status(500).json({ error: "통계 조회 중 오류가 발생했습니다" });
    }
  });

  // Get claims for user endpoint
  app.get("/api/claims", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "인증되지 않은 사용자입니다" });
    }

    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ error: "사용자를 찾을 수 없습니다" });
      }

      const claims = await storage.getClaimsForUser(user);
      res.json(claims);
    } catch (error) {
      console.error("Get claims error:", error);
      res.status(500).json({ error: "데이터 조회 중 오류가 발생했습니다" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
