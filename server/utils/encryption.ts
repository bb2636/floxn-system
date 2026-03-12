import crypto from "crypto";

/**
 * 개인정보 암호화 유틸리티
 * AES-256-GCM 암호화를 사용하여 민감 정보를 보호
 */

// 환경변수에서 암호화 키 가져오기 (32바이트 = 256비트)
// 중요: 프로덕션 환경에서는 반드시 ENCRYPTION_KEY 환경변수를 설정해야 합니다
// 생성 방법: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
if (!ENCRYPTION_KEY) {
  console.warn("[Encryption] WARNING: ENCRYPTION_KEY not set. Using random key (not persistent across restarts).");
}
const ENCRYPTION_KEY_FINAL = ENCRYPTION_KEY || crypto.randomBytes(32).toString("hex");

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // GCM 권장 길이
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;

/**
 * 키를 Buffer로 변환
 */
function getKeyBuffer(): Buffer {
  // 환경변수가 hex 문자열이면 디코딩, 아니면 해시 생성
  if (ENCRYPTION_KEY_FINAL.length === 64) {
    // 32바이트 hex 문자열
    return Buffer.from(ENCRYPTION_KEY_FINAL, "hex");
  }
  // 그 외의 경우 SHA-256 해시 사용
  return crypto.createHash("sha256").update(ENCRYPTION_KEY_FINAL).digest();
}

/**
 * 민감 정보 암호화
 * @param plaintext 암호화할 평문
 * @returns 암호화된 문자열 (base64)
 */
export function encryptSensitiveData(plaintext: string | null | undefined): string | null {
  if (!plaintext || plaintext.trim() === "") {
    return null;
  }

  try {
    const key = getKeyBuffer();
    const iv = crypto.randomBytes(IV_LENGTH);
    const salt = crypto.randomBytes(SALT_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    // 암호화
    let encrypted = cipher.update(plaintext, "utf8", "base64");
    encrypted += cipher.final("base64");
    
    // 인증 태그 가져오기
    const authTag = cipher.getAuthTag();

    // IV + Salt + AuthTag + Encrypted 데이터를 결합
    const combined = Buffer.concat([
      iv,
      salt,
      authTag,
      Buffer.from(encrypted, "base64"),
    ]);

    // Base64로 인코딩하여 반환
    return combined.toString("base64");
  } catch (error) {
    console.error("[Encryption] Failed to encrypt data:", error);
    // 암호화 실패 시 원본 반환하지 않음 (보안)
    throw new Error("Failed to encrypt sensitive data");
  }
}

/**
 * 민감 정보 복호화
 * @param encrypted 암호화된 문자열 (base64)
 * @returns 복호화된 평문
 */
export function decryptSensitiveData(encrypted: string | null | undefined): string | null {
  if (!encrypted || encrypted.trim() === "") {
    return null;
  }

  try {
    const key = getKeyBuffer();
    const combined = Buffer.from(encrypted, "base64");

    // 데이터 길이 검증
    const minLength = IV_LENGTH + SALT_LENGTH + TAG_LENGTH;
    if (combined.length < minLength) {
      throw new Error("Invalid encrypted data format");
    }

    // IV, Salt, AuthTag, Encrypted 데이터 분리
    const iv = combined.subarray(0, IV_LENGTH);
    const salt = combined.subarray(IV_LENGTH, IV_LENGTH + SALT_LENGTH);
    const authTag = combined.subarray(IV_LENGTH + SALT_LENGTH, IV_LENGTH + SALT_LENGTH + TAG_LENGTH);
    const encryptedData = combined.subarray(IV_LENGTH + SALT_LENGTH + TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    // 복호화
    let decrypted = decipher.update(encryptedData, undefined, "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("[Encryption] Failed to decrypt data:", error);
    // 복호화 실패 시 null 반환
    return null;
  }
}

/**
 * 주민등록번호 마스킹 (표시용)
 * @param idNumber 주민등록번호 (복호화된 평문 또는 이미 평문)
 * @returns 마스킹된 주민등록번호 (예: 123456-1*****)
 */
export function maskIdNumber(idNumber: string | null | undefined): string | null {
  if (!idNumber || idNumber.trim() === "") {
    return null;
  }

  // 하이픈 제거
  const cleaned = idNumber.replace(/-/g, "");
  
  // 13자리 주민등록번호 형식 확인
  if (cleaned.length === 13) {
    return `${cleaned.substring(0, 6)}-${cleaned.substring(6, 7)}******`;
  }
  
  // 그 외의 경우 앞 6자리만 표시
  if (cleaned.length > 6) {
    return `${cleaned.substring(0, 6)}${"*".repeat(cleaned.length - 6)}`;
  }

  return idNumber;
}

/**
 * 주소 마스킹 (표시용)
 * @param address 주소
 * @returns 마스킹된 주소 (상세 주소 일부만 마스킹)
 */
export function maskAddress(address: string | null | undefined): string | null {
  if (!address || address.trim() === "") {
    return null;
  }

  // 주소가 짧으면 전체 마스킹
  if (address.length <= 10) {
    return "***";
  }

  // 앞부분은 표시, 뒷부분은 마스킹
  const visibleLength = Math.floor(address.length * 0.6);
  return address.substring(0, visibleLength) + "***";
}

/**
 * 전화번호 마스킹 (표시용)
 * @param phone 전화번호
 * @returns 마스킹된 전화번호 (예: 010-****-1234)
 */
export function maskPhone(phone: string | null | undefined): string | null {
  if (!phone || phone.trim() === "") {
    return null;
  }

  // 하이픈 제거
  const cleaned = phone.replace(/-/g, "").replace(/\s/g, "");

  // 11자리 휴대폰 번호 (010-1234-5678)
  if (cleaned.length === 11 && cleaned.startsWith("010")) {
    return `${cleaned.substring(0, 3)}-****-${cleaned.substring(7)}`;
  }

  // 10자리 전화번호 (02-1234-5678)
  if (cleaned.length === 10) {
    if (cleaned.startsWith("02")) {
      return `${cleaned.substring(0, 2)}-****-${cleaned.substring(6)}`;
    }
    return `${cleaned.substring(0, 3)}-****-${cleaned.substring(6)}`;
  }

  // 그 외의 경우 중간 부분 마스킹
  if (cleaned.length > 6) {
    const start = Math.floor(cleaned.length * 0.3);
    const end = Math.floor(cleaned.length * 0.7);
    return cleaned.substring(0, start) + "*".repeat(end - start) + cleaned.substring(end);
  }

  return phone;
}
