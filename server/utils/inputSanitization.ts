/**
 * 입력 검증 및 Sanitization 유틸리티
 * SQL Injection, XSS 등 공격 방지
 */

/**
 * SQL Injection 위험 문자 제거
 */
export function sanitizeForSQL(input: string | null | undefined): string {
  if (!input) return '';
  
  // SQL Injection 위험 문자 제거
  // 주의: Drizzle ORM을 사용하므로 직접 SQL 쿼리는 없지만, 추가 보안을 위해
  const dangerous = [
    /'/g,      // 작은따옴표
    /"/g,      // 큰따옴표
    /;/g,      // 세미콜론
    /--/g,     // SQL 주석
    /\/\*/g,   // SQL 주석 시작
    /\*\//g,   // SQL 주석 끝
    /xp_/gi,   // SQL Server 확장 프로시저
    /sp_/gi,   // SQL Server 저장 프로시저
  ];

  let sanitized = input;
  for (const pattern of dangerous) {
    sanitized = sanitized.replace(pattern, '');
  }

  return sanitized.trim();
}

/**
 * 파일명 sanitization 강화
 */
export function sanitizeFileName(fileName: string): string {
  if (!fileName) return 'unnamed';

  // 경로 탐색 공격 방지
  let sanitized = fileName
    .replace(/\.\./g, '')           // 상위 디렉토리 참조 제거
    .replace(/\//g, '_')            // 슬래시 제거
    .replace(/\\/g, '_')            // 백슬래시 제거
    .replace(/:/g, '_')             // 콜론 제거
    .replace(/\*/g, '_')            // 별표 제거
    .replace(/\?/g, '_')            // 물음표 제거
    .replace(/</g, '_')             // 작은 부등호 제거
    .replace(/>/g, '_')             // 큰 부등호 제거
    .replace(/\|/g, '_')            // 파이프 제거
    .replace(/"/g, '_')             // 큰따옴표 제거
    .replace(/'/g, '_');            // 작은따옴표 제거

  // 파일명 길이 제한 (255자)
  if (sanitized.length > 255) {
    const ext = sanitized.substring(sanitized.lastIndexOf('.'));
    sanitized = sanitized.substring(0, 255 - ext.length) + ext;
  }

  // 빈 파일명 방지
  if (!sanitized || sanitized.trim() === '') {
    sanitized = 'unnamed';
  }

  return sanitized;
}

/**
 * 특수 문자 필터링 (일반 텍스트 입력용)
 */
export function sanitizeText(input: string | null | undefined, options?: {
  allowNewlines?: boolean;
  allowSpecialChars?: boolean;
  maxLength?: number;
}): string {
  if (!input) return '';

  const {
    allowNewlines = true,
    allowSpecialChars = true,
    maxLength = 10000,
  } = options || {};

  let sanitized = input;

  // 길이 제한
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  // 줄바꿈 처리
  if (!allowNewlines) {
    sanitized = sanitized.replace(/\n/g, ' ').replace(/\r/g, ' ');
  }

  // 특수 문자 필터링
  if (!allowSpecialChars) {
    // HTML 태그 제거
    sanitized = sanitized.replace(/<[^>]*>/g, '');
    // 위험한 문자 제거
    sanitized = sanitized.replace(/[<>'"&]/g, '');
  }

  return sanitized.trim();
}

/**
 * URL sanitization
 */
export function sanitizeUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    // 허용된 프로토콜만
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * 이메일 주소 검증 및 sanitization
 */
export function sanitizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const sanitized = email.trim().toLowerCase();

  if (!emailRegex.test(sanitized)) {
    return null;
  }

  // 길이 제한
  if (sanitized.length > 254) {
    return null;
  }

  return sanitized;
}

/**
 * 숫자 검증
 */
export function sanitizeNumber(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  
  const num = typeof input === 'number' ? input : parseFloat(String(input));
  
  if (isNaN(num) || !isFinite(num)) {
    return null;
  }

  return num;
}

/**
 * 정수 검증
 */
export function sanitizeInteger(input: string | number | null | undefined): number | null {
  const num = sanitizeNumber(input);
  if (num === null) return null;
  
  return Math.floor(num);
}
