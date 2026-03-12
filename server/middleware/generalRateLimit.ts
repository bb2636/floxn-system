import type { Request, Response, NextFunction } from "express";
import { rateLimit } from "./rateLimit";

/**
 * 일반 API 엔드포인트용 Rate Limiting
 * IP 기반으로 요청 제한
 */

// 일반 API 요청 제한 (1분당 100회)
export const generalApiRateLimit = rateLimit({
  maxAttempts: 100,
  windowMs: 60 * 1000, // 1분
  message: "너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.",
});

// 엄격한 API 요청 제한 (1분당 30회) - 민감한 작업용
export const strictApiRateLimit = rateLimit({
  maxAttempts: 30,
  windowMs: 60 * 1000, // 1분
  message: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
});

// 파일 업로드 제한 (1분당 10회)
export const uploadRateLimit = rateLimit({
  maxAttempts: 10,
  windowMs: 60 * 1000, // 1분
  message: "파일 업로드 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
});
