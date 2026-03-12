/**
 * 파일 업로드 검증 유틸리티
 * 악성 파일 업로드 방지
 */

// 허용된 파일 타입 (MIME 타입)
const ALLOWED_MIME_TYPES = [
  // 이미지
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
  // PDF
  'application/pdf',
  // 문서
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  // 텍스트
  'text/plain',
  'text/csv',
  // 기타
  'application/zip',
  'application/x-zip-compressed',
];

// 허용된 파일 확장자
const ALLOWED_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp',
  '.pdf',
  '.doc', '.docx',
  '.xls', '.xlsx',
  '.ppt', '.pptx',
  '.txt', '.csv',
  '.zip',
];

// 위험한 파일 확장자 (차단)
const DANGEROUS_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.com', '.scr', '.vbs', '.js', '.jar',
  '.sh', '.bash', '.ps1', '.dll', '.sys', '.drv',
];

// 최대 파일 크기 (50MB)
const MAX_FILE_SIZE = 50 * 1024 * 1024;

/**
 * 파일 타입 검증
 */
export function validateFileType(fileName: string, fileType: string): { valid: boolean; error?: string } {
  // 위험한 확장자 차단
  const lowerFileName = fileName.toLowerCase();
  for (const ext of DANGEROUS_EXTENSIONS) {
    if (lowerFileName.endsWith(ext)) {
      return {
        valid: false,
        error: `위험한 파일 형식입니다: ${ext}`,
      };
    }
  }

  // 허용된 확장자 확인
  const hasAllowedExtension = ALLOWED_EXTENSIONS.some(ext => lowerFileName.endsWith(ext));
  if (!hasAllowedExtension) {
    return {
      valid: false,
      error: `허용되지 않은 파일 형식입니다: ${fileName}`,
    };
  }

  // MIME 타입 확인
  if (fileType && !ALLOWED_MIME_TYPES.includes(fileType)) {
    return {
      valid: false,
      error: `허용되지 않은 파일 타입입니다: ${fileType}`,
    };
  }

  return { valid: true };
}

/**
 * 파일 크기 검증
 */
export function validateFileSize(fileSize: number): { valid: boolean; error?: string } {
  if (fileSize > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `파일 크기가 너무 큽니다. 최대 ${MAX_FILE_SIZE / 1024 / 1024}MB까지 업로드 가능합니다.`,
    };
  }

  if (fileSize <= 0) {
    return {
      valid: false,
      error: '파일 크기가 유효하지 않습니다.',
    };
  }

  return { valid: true };
}

/**
 * 파일명 검증 (경로 탐색 공격 방지)
 */
export function validateFileName(fileName: string): { valid: boolean; error?: string } {
  // 경로 탐색 공격 방지
  if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
    return {
      valid: false,
      error: '파일명에 경로 문자가 포함되어 있습니다.',
    };
  }

  // 파일명 길이 제한
  if (fileName.length > 255) {
    return {
      valid: false,
      error: '파일명이 너무 깁니다.',
    };
  }

  return { valid: true };
}

/**
 * 종합 파일 검증
 */
export function validateFile(fileName: string, fileType: string, fileSize: number): { valid: boolean; error?: string } {
  // 파일명 검증
  const fileNameCheck = validateFileName(fileName);
  if (!fileNameCheck.valid) {
    return fileNameCheck;
  }

  // 파일 타입 검증
  const fileTypeCheck = validateFileType(fileName, fileType);
  if (!fileTypeCheck.valid) {
    return fileTypeCheck;
  }

  // 파일 크기 검증
  const fileSizeCheck = validateFileSize(fileSize);
  if (!fileSizeCheck.valid) {
    return fileSizeCheck;
  }

  return { valid: true };
}
