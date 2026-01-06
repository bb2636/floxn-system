import puppeteer from 'puppeteer';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { execSync } from 'child_process';
import { db } from './db';
import { cases, caseDocuments, drawings, estimates, estimateRows, users } from '@shared/schema';
import { eq, and, inArray, ilike, sql } from 'drizzle-orm';

const TEMPLATES_DIR = path.join(process.cwd(), 'server/pdf-templates');

// Get Chromium executable path dynamically
function getChromiumPath(): string | undefined {
  // Check environment variable first
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  
  // Try common Nix store paths
  const possiblePaths = [
    '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
  ];
  
  // Check hardcoded paths first (synchronous but safe)
  for (const p of possiblePaths) {
    try {
      if (fs.existsSync(p)) {
        return p;
      }
    } catch {}
  }
  
  // Try which command (wrapped in try-catch to prevent stalling)
  try {
    const chromiumPath = execSync('which chromium 2>/dev/null || which chromium-browser 2>/dev/null || true', { 
      encoding: 'utf8',
      timeout: 5000, // 5 second timeout
    }).trim();
    if (chromiumPath && fs.existsSync(chromiumPath)) {
      return chromiumPath;
    }
  } catch (e) {
    console.warn('[Chromium] which command failed:', e);
  }
  
  // Let puppeteer try to use its bundled Chromium
  console.warn('[Chromium] No system Chromium found, will try bundled version');
  return undefined;
}

// PDF 최대 크기 (10MB)
const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024;

// 지원하는 이미지 확장자 (HEIC/WEBP도 변환 처리)
const SUPPORTED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.heic', '.heif', '.webp'];
// 지원하지 않는 확장자 (동영상 파일만)
const UNSUPPORTED_EXTENSIONS = ['.mov', '.mp4', '.avi', '.tiff', '.raw'];

// 이미지 전처리 설정 (해상도 + 품질 조합)
interface ImageProcessingConfig {
  maxDimension: number;
  quality: number;
}

// 단계적 품질/해상도 하향 설정
const PROCESSING_LEVELS: ImageProcessingConfig[] = [
  { maxDimension: 1600, quality: 60 },  // 1단계: 기본
  { maxDimension: 1400, quality: 50 },  // 2단계
  { maxDimension: 1200, quality: 40 },  // 3단계
  { maxDimension: 1000, quality: 30 },  // 4단계: 최저
];

// 파일 정보 로깅
function logFileInfo(doc: any, stage: string) {
  const ext = path.extname(doc.fileName || '').toLowerCase();
  const sizeBytes = doc.fileData ? Buffer.from(doc.fileData.replace(/^data:[^;]+;base64,/, ''), 'base64').length : 0;
  console.log(`[PDF 증빙자료] [${stage}] file_id=${doc.id}, filename=${doc.fileName}, ext=${ext}, size_bytes=${sizeBytes}, mime=${doc.fileType || 'unknown'}`);
}

// 지원 여부 체크
function checkFileSupport(doc: any): { supported: boolean; reason?: string } {
  const ext = path.extname(doc.fileName || '').toLowerCase();
  const mime = doc.fileType || '';
  
  // 지원하지 않는 확장자 체크
  if (UNSUPPORTED_EXTENSIONS.includes(ext)) {
    return { supported: false, reason: `지원하지 않는 파일 형식입니다: ${ext}` };
  }
  
  // 이미지 파일 체크
  if (mime.startsWith('image/')) {
    if (!SUPPORTED_IMAGE_EXTENSIONS.includes(ext) && ext !== '') {
      return { supported: false, reason: `지원하지 않는 이미지 형식입니다: ${ext}` };
    }
    return { supported: true };
  }
  
  // PDF 파일 체크
  if (mime === 'application/pdf' || ext === '.pdf') {
    return { supported: true };
  }
  
  return { supported: false, reason: `지원하지 않는 파일 형식입니다: ${mime || ext}` };
}

// 강화된 이미지 정규화 (리사이즈 & JPEG 강제 변환 & 압축)
// 모든 이미지를 JPEG로 변환 (HEIC/WEBP 포함), 지정된 해상도/품질로 처리
async function normalizeImage(
  base64Data: string, 
  config: ImageProcessingConfig = PROCESSING_LEVELS[0]
): Promise<{ success: boolean; data?: Buffer; error?: string }> {
  const startTime = Date.now();
  const { maxDimension, quality } = config;
  
  try {
    let imageBuffer: Buffer;
    
    if (base64Data.startsWith('data:')) {
      const matches = base64Data.match(/^data:[^;]+;base64,(.+)$/);
      if (matches) {
        imageBuffer = Buffer.from(matches[1], 'base64');
      } else {
        return { success: false, error: '잘못된 이미지 데이터 형식' };
      }
    } else {
      imageBuffer = Buffer.from(base64Data, 'base64');
    }
    
    const originalSize = imageBuffer.length;
    console.log(`[PDF 증빙자료] [B] 이미지 처리 시작, 원본 크기: ${Math.round(originalSize / 1024)}KB, 목표: ${maxDimension}px / ${quality}%`);
    
    // Sharp로 이미지 처리 (HEIC/WEBP 자동 변환 지원)
    const image = sharp(imageBuffer, { failOnError: false });
    const metadata = await image.metadata();
    
    // 항상 리사이즈 적용 (maxDimension 이하로)
    const processedImage = image.resize(maxDimension, maxDimension, { 
      fit: 'inside', 
      withoutEnlargement: true 
    });
    
    if (metadata.width && metadata.height) {
      console.log(`[PDF 증빙자료] [B] 이미지 리사이즈: ${metadata.width}x${metadata.height} → max ${maxDimension}px`);
    }
    
    // JPEG로 강제 변환 및 압축 (mozjpeg으로 최적화)
    const compressedBuffer = await processedImage
      .jpeg({ quality, mozjpeg: true, force: true })
      .toBuffer();
    
    const elapsedMs = Date.now() - startTime;
    const targetSize = 500 * 1024; // 목표 500KB
    const resultSize = compressedBuffer.length;
    
    console.log(`[PDF 증빙자료] [B] 이미지 처리 완료: ${Math.round(originalSize / 1024)}KB → ${Math.round(resultSize / 1024)}KB (목표: ~500KB), elapsed_ms=${elapsedMs}`);
    
    return { success: true, data: compressedBuffer };
  } catch (error: any) {
    const elapsedMs = Date.now() - startTime;
    console.error(`[PDF 증빙자료] [B] 이미지 처리 실패, elapsed_ms=${elapsedMs}:`, error.message);
    return { success: false, error: error.message || '이미지 처리 오류' };
  }
}

// Puppeteer를 사용하여 한글 헤더가 포함된 증빙자료 PDF 생성
async function generateEvidencePdfWithPdfLib(
  caseData: any, 
  documents: any[], 
  processingConfig: ImageProcessingConfig = PROCESSING_LEVELS[0]
): Promise<{ pdfBuffer: Buffer; errors: Array<{ fileName: string; reason: string }> }> {
  const startTime = Date.now();
  const errors: Array<{ fileName: string; reason: string }> = [];
  
  console.log(`[PDF 증빙자료] === Puppeteer 기반 생성 시작 ===`);
  console.log(`[PDF 증빙자료] 총 파일 수: ${documents.length}, 설정: ${processingConfig.maxDimension}px / ${processingConfig.quality}%`);
  
  // 1. 파일 리스트 상세 로그
  documents.forEach((doc, idx) => {
    logFileInfo(doc, `파일목록 ${idx + 1}/${documents.length}`);
  });
  
  // 카테고리 -> 탭 매핑
  const categoryToTab: Record<string, string> = {
    '현장출동사진': '현장사진', '현장': '현장사진',
    '수리중 사진': '현장사진', '수리중': '현장사진',
    '복구완료 사진': '현장사진', '복구완료': '현장사진',
    '보험금 청구서': '기본자료', '개인정보 동의서(가족용)': '기본자료',
    '주민등록등본': '증빙자료', '등기부등본': '증빙자료',
    '건축물대장': '증빙자료', '기타증빙자료(민원일지 등)': '증빙자료',
    '위임장': '청구자료', '도급계약서': '청구자료',
    '복구완료확인서': '청구자료', '부가세 청구자료': '청구자료', '청구': '청구자료',
  };
  
  // 2. 이미지 문서만 필터링 및 지원 여부 체크
  const imageDocs: Array<{ doc: any; tab: string }> = [];
  
  for (const doc of documents) {
    const fileStartTime = Date.now();
    const supportCheck = checkFileSupport(doc);
    
    if (!supportCheck.supported) {
      console.log(`[PDF 증빙자료] [A] 지원하지 않는 파일: ${doc.fileName} - ${supportCheck.reason}`);
      errors.push({ fileName: doc.fileName, reason: supportCheck.reason || '지원하지 않는 형식' });
      continue;
    }
    
    const isImage = doc.fileType?.startsWith('image/');
    const hasValidData = doc.fileData && doc.fileData.length > 100;
    
    if (isImage && hasValidData) {
      const tab = categoryToTab[doc.category] || '기타';
      imageDocs.push({ doc, tab });
      console.log(`[PDF 증빙자료] [A] 이미지 파일 확인: ${doc.fileName}, tab=${tab}, elapsed_ms=${Date.now() - fileStartTime}`);
    } else if (isImage && !hasValidData) {
      console.log(`[PDF 증빙자료] [A] 이미지 데이터 없음: ${doc.fileName}`);
      errors.push({ fileName: doc.fileName, reason: '이미지 데이터가 없습니다' });
    }
  }
  
  console.log(`[PDF 증빙자료] 유효한 이미지 수: ${imageDocs.length}`);
  
  if (imageDocs.length === 0) {
    console.log(`[PDF 증빙자료] 유효한 이미지 없음 - 빈 버퍼 반환`);
    return { pdfBuffer: Buffer.alloc(0), errors };
  }
  
  // 3. 이미지 압축 및 base64 준비 (개별 try/catch로 전체 실패 방지)
  const processedImages: Array<{ base64: string; tab: string; category: string; fileName: string; failed?: boolean; errorReason?: string }> = [];
  
  for (const { doc, tab } of imageDocs) {
    try {
      const normalized = await normalizeImage(doc.fileData, processingConfig);
      if (normalized.success && normalized.data) {
        const base64 = `data:image/jpeg;base64,${normalized.data.toString('base64')}`;
        processedImages.push({ base64, tab, category: doc.category || '기타', fileName: doc.fileName });
      } else {
        // 이미지 처리 실패 시 에러 페이지로 대체
        console.warn(`[PDF 증빙자료] 이미지 처리 실패 - 에러 페이지로 대체: ${doc.fileName}`);
        processedImages.push({ 
          base64: '', 
          tab, 
          category: doc.category || '기타', 
          fileName: doc.fileName,
          failed: true,
          errorReason: normalized.error || '이미지 처리 실패'
        });
        errors.push({ fileName: doc.fileName, reason: normalized.error || '이미지 처리 실패' });
      }
    } catch (err: any) {
      // 예외 발생 시에도 에러 페이지로 대체 (전체 PDF 실패 방지)
      console.error(`[PDF 증빙자료] 이미지 처리 예외 - 에러 페이지로 대체: ${doc.fileName}`, err.message);
      processedImages.push({ 
        base64: '', 
        tab, 
        category: doc.category || '기타', 
        fileName: doc.fileName,
        failed: true,
        errorReason: err.message || '파일 손상/지원 불가'
      });
      errors.push({ fileName: doc.fileName, reason: err.message || '파일 손상/지원 불가' });
    }
  }
  
  if (processedImages.length === 0) {
    console.log(`[PDF 증빙자료] 처리된 이미지 없음 - 빈 버퍼 반환`);
    return { pdfBuffer: Buffer.alloc(0), errors };
  }
  
  // 4. HTML 생성 (2개 이미지씩 페이지 구성, 실패 시 에러 페이지 대체)
  const caseNumber = caseData.caseNumber || '';
  let pagesHtml = '';
  
  // 이미지 섹션 HTML 생성 헬퍼 함수
  const generateImageSection = (img: typeof processedImages[0], index: number) => {
    if (img.failed) {
      // 실패한 이미지 - 에러 안내 페이지로 대체
      return `
        <div class="image-section error-section">
          <div class="image-header error-header">접수번호:${caseNumber} | ${img.tab}(${img.category})</div>
          <div class="error-container">
            <div class="error-icon">⚠</div>
            <div class="error-title">첨부 실패</div>
            <div class="error-filename">${img.fileName}</div>
            <div class="error-reason">${img.errorReason || '파일 손상/지원 불가'}</div>
          </div>
        </div>
      `;
    }
    return `
      <div class="image-section">
        <div class="image-header">접수번호:${caseNumber} | ${img.tab}(${img.category})</div>
        <div class="image-container">
          <img src="${img.base64}" alt="Evidence ${index + 1}" />
        </div>
      </div>
    `;
  };
  
  for (let i = 0; i < processedImages.length; i += 2) {
    const first = processedImages[i];
    const second = processedImages[i + 1];
    
    pagesHtml += `
      <div class="page">
        ${generateImageSection(first, i)}
        ${second ? generateImageSection(second, i + 1) : ''}
      </div>
    `;
  }
  
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" />
  <style>
    @page { size: A4; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif; 
      background: white;
    }
    .page {
      width: 210mm;
      height: 297mm;
      padding: 10mm;
      page-break-after: always;
      display: flex;
      flex-direction: column;
      gap: 8mm;
    }
    .page:last-child { page-break-after: auto; }
    .image-section {
      flex: 1;
      display: flex;
      flex-direction: column;
      border: 1px solid #e5e5e5;
      border-radius: 4px;
      overflow: hidden;
    }
    .image-header {
      background: #f8f8f8;
      border-bottom: 1px solid #e5e5e5;
      padding: 8px 15px;
      font-size: 11pt;
      color: #333;
    }
    .image-container {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 10px;
      background: white;
    }
    .image-container img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
    /* 에러 페이지 스타일 */
    .error-section {
      background: #fef2f2;
    }
    .error-header {
      background: #fee2e2;
      color: #991b1b;
    }
    .error-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
      text-align: center;
    }
    .error-icon {
      font-size: 48pt;
      color: #dc2626;
      margin-bottom: 10px;
    }
    .error-title {
      font-size: 18pt;
      font-weight: bold;
      color: #991b1b;
      margin-bottom: 15px;
    }
    .error-filename {
      font-size: 11pt;
      color: #374151;
      word-break: break-all;
      max-width: 90%;
      margin-bottom: 10px;
    }
    .error-reason {
      font-size: 10pt;
      color: #6b7280;
      background: #fee2e2;
      padding: 8px 15px;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  ${pagesHtml}
</body>
</html>`;
  
  // 5. Puppeteer로 PDF 생성
  const chromiumPath = getChromiumPath();
  console.log(`[PDF 증빙자료] Using Chromium path: ${chromiumPath || 'bundled'}`);
  
  const browser = await puppeteer.launch({
    headless: true,
    ...(chromiumPath && { executablePath: chromiumPath }),
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--single-process'],
  });
  
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 60000 });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });
    
    await page.close();
    
    const elapsedMs = Date.now() - startTime;
    console.log(`[PDF 증빙자료] === Puppeteer 기반 생성 완료 ===`);
    console.log(`[PDF 증빙자료] 생성된 PDF 크기: ${Math.round(pdfBuffer.length / 1024)}KB, 페이지 수: ${Math.ceil(processedImages.length / 2)}, 오류 파일: ${errors.length}, elapsed_ms=${elapsedMs}`);
    
    return { pdfBuffer: Buffer.from(pdfBuffer), errors };
  } finally {
    await browser.close();
  }
}

// 이미지를 PDF 페이지에 삽입하는 헬퍼 함수
async function embedImageToPage(
  pdfDoc: PDFDocument,
  page: any,
  imageData: { doc: any; tab: string },
  x: number, y: number, maxWidth: number, maxHeight: number,
  processingConfig: ImageProcessingConfig,
  errors: Array<{ fileName: string; reason: string }>,
  font: any,
  caseNumber?: string
): Promise<void> {
  const fileStartTime = Date.now();
  const { doc, tab } = imageData;
  
  try {
    console.log(`[PDF 증빙자료] [C] 이미지 삽입 시작: ${doc.fileName}`);
    
    // 이미지 정규화
    const normalized = await normalizeImage(doc.fileData, processingConfig);
    
    if (!normalized.success || !normalized.data) {
      throw new Error(normalized.error || '이미지 정규화 실패');
    }
    
    // pdf-lib에 이미지 임베드
    let embeddedImage;
    try {
      embeddedImage = await pdfDoc.embedJpg(normalized.data);
    } catch (jpgError) {
      // PNG로 재시도
      try {
        embeddedImage = await pdfDoc.embedPng(normalized.data);
      } catch (pngError) {
        throw new Error('이미지 포맷을 처리할 수 없습니다');
      }
    }
    
    // 이미지 크기 계산 (비율 유지)
    const imgWidth = embeddedImage.width;
    const imgHeight = embeddedImage.height;
    const aspectRatio = imgWidth / imgHeight;
    
    let drawWidth = maxWidth;
    let drawHeight = drawWidth / aspectRatio;
    
    if (drawHeight > maxHeight - 30) {
      drawHeight = maxHeight - 30;
      drawWidth = drawHeight * aspectRatio;
    }
    
    // 중앙 정렬
    const drawX = x + (maxWidth - drawWidth) / 2;
    const drawY = y + (maxHeight - drawHeight - 30) / 2 + 20;
    
    // 이미지 그리기
    page.drawImage(embeddedImage, {
      x: drawX, y: drawY,
      width: drawWidth, height: drawHeight,
    });
    
    // 이미지 상단에 접수번호와 카테고리 정보 표시 (영문만 - 한글 인코딩 불가)
    const headerText = caseNumber 
      ? `Case: ${caseNumber}`
      : `Document`;
    page.drawText(headerText, {
      x: x, y: y + maxHeight - 15,
      size: 9, font, color: rgb(0.2, 0.2, 0.2),
    });
    
    const elapsedMs = Date.now() - fileStartTime;
    console.log(`[PDF 증빙자료] [C] 이미지 삽입 완료: ${doc.fileName}, elapsed_ms=${elapsedMs}`);
    
  } catch (error: any) {
    const elapsedMs = Date.now() - fileStartTime;
    console.error(`[PDF 증빙자료] [C] 이미지 삽입 실패: ${doc.fileName}, elapsed_ms=${elapsedMs}, error=${error.message}`);
    errors.push({ fileName: doc.fileName, reason: error.message || '첨부 불가' });
    
    // 오류 페이지 대체 표시 (영문만 - 한글 인코딩 불가)
    page.drawRectangle({
      x: x, y: y,
      width: maxWidth, height: maxHeight - 30,
      borderColor: rgb(0.8, 0.2, 0.2),
      borderWidth: 1,
    });
    page.drawText(`Cannot attach: ${doc.fileName}`, {
      x: x + 10, y: y + maxHeight / 2,
      size: 10, font, color: rgb(0.8, 0.2, 0.2),
    });
    page.drawText(`Error`, {
      x: x + 10, y: y + maxHeight / 2 - 15,
      size: 8, font, color: rgb(0.5, 0.5, 0.5),
    });
  }
}

// 이미지 압축 함수 - quality는 1-100 (기본 80)
async function compressImage(base64Data: string, quality: number = 80, maxWidth: number = 1200): Promise<string> {
  try {
    // base64 데이터에서 실제 이미지 데이터 추출
    let imageBuffer: Buffer;
    let mimeType = 'image/jpeg';
    
    if (base64Data.startsWith('data:')) {
      const matches = base64Data.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        mimeType = matches[1];
        imageBuffer = Buffer.from(matches[2], 'base64');
      } else {
        return base64Data;
      }
    } else {
      imageBuffer = Buffer.from(base64Data, 'base64');
    }
    
    // Sharp로 이미지 처리
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
    
    // 너무 큰 이미지는 리사이즈
    let processedImage = image;
    if (metadata.width && metadata.width > maxWidth) {
      processedImage = image.resize(maxWidth, undefined, { withoutEnlargement: true });
    }
    
    // JPEG로 압축 (PNG도 JPEG로 변환하여 용량 감소)
    const compressedBuffer = await processedImage
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();
    
    const compressedBase64 = compressedBuffer.toString('base64');
    console.log(`[PDF 이미지압축] 원본: ${Math.round(imageBuffer.length / 1024)}KB → 압축: ${Math.round(compressedBuffer.length / 1024)}KB (품질: ${quality}%)`);
    
    return `data:image/jpeg;base64,${compressedBase64}`;
  } catch (error) {
    console.error('[PDF 이미지압축] 압축 실패:', error);
    return base64Data;
  }
}

interface PdfGenerationPayload {
  caseId: string;
  sections: {
    cover: boolean;
    fieldReport: boolean;
    drawing: boolean;
    evidence: boolean;
    estimate: boolean;
    etc: boolean;
  };
  evidence: {
    tab: string;
    selectedFileIds: string[];
  };
}

function replaceTemplateVariables(template: string, data: Record<string, any>): string {
  let result = template;
  
  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value ?? '');
  }
  
  return result;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
  } catch {
    return dateStr;
  }
}

function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return '0';
  return num.toLocaleString('ko-KR');
}

async function generateCoverPage(caseData: any, partnerData: any): Promise<string> {
  const templatePath = path.join(TEMPLATES_DIR, 'cover.html');
  let template = fs.readFileSync(templatePath, 'utf-8');
  
  const fullAddress = [caseData.insuredAddress, caseData.insuredAddressDetail]
    .filter(Boolean).join(' ');
  
  const dispatchDateTime = [caseData.visitDate, caseData.visitTime]
    .filter(Boolean).join(' ');
  
  const data = {
    recipientName: caseData.insuranceCompany || '',
    insuranceAccidentNo: caseData.insuranceAccidentNo || '',
    insuredName: caseData.insuredName || caseData.victimName || '',
    // 출동담당자: 접수 시 입력한 담당자명 우선, 없으면 협력사 계정 이름
    investigatorName: caseData.assignedPartnerManager || partnerData?.name || '',
    partnerCompany: caseData.assignedPartner || '',
    address: fullAddress,
    dispatchDateTime: dispatchDateTime,
    documentDate: formatDate(new Date().toISOString()),
    senderCompany: caseData.assignedPartner || '',
    // 담당자: 접수 시 입력한 담당자명 우선
    senderName: caseData.assignedPartnerManager || partnerData?.name || '',
    // 연락처: 접수 시 입력한 담당자 연락처 우선
    senderContact: caseData.assignedPartnerContact || partnerData?.phone || '',
  };
  
  return replaceTemplateVariables(template, data);
}

async function generateFieldReportPage(caseData: any, partnerData: any, repairItems: any[]): Promise<string> {
  const templatePath = path.join(TEMPLATES_DIR, 'field-report.html');
  let template = fs.readFileSync(templatePath, 'utf-8');
  
  const insuredFullAddress = [caseData.insuredAddress, caseData.insuredAddressDetail]
    .filter(Boolean).join(' ');
  
  const victimFullAddress = [caseData.victimAddress, caseData.victimAddressDetail]
    .filter(Boolean).join(' ');
  
  const visitDateTime = [caseData.visitDate, caseData.visitTime]
    .filter(Boolean).join(' ');
  
  const accidentDateTime = [caseData.accidentDate, caseData.accidentTime]
    .filter(Boolean).join(' ');
  
  let processingTypesStr = '';
  if (caseData.processingTypes) {
    try {
      const types = JSON.parse(caseData.processingTypes);
      processingTypesStr = Array.isArray(types) ? types.join(', ') : '';
    } catch {
      processingTypesStr = caseData.processingTypes || '';
    }
  }

  let repairItemsHtml = '';
  if (repairItems && repairItems.length > 0) {
    repairItems.forEach((item, index) => {
      const areaM2 = item.repairArea ? Number(item.repairArea).toFixed(2) : '-';
      repairItemsHtml += `
        <tr>
          <td>${index + 1}</td>
          <td>${item.category || '-'}</td>
          <td>${item.location || '-'}</td>
          <td>${item.workName || '-'}</td>
          <td>${areaM2} ㎡</td>
          <td>${item.note || '-'}</td>
        </tr>
      `;
    });
  } else {
    repairItemsHtml = '<tr><td colspan="6" style="text-align:center;padding:10mm;">등록된 복구 내역이 없습니다.</td></tr>';
  }
  
  const data = {
    visitDateTime: visitDateTime || '-',
    // 출동담당자: 접수 시 입력한 담당자명 우선
    dispatchManager: caseData.assignedPartnerManager || caseData.dispatchManager || partnerData?.name || '-',
    dispatchLocation: caseData.dispatchLocation || '-',
    partnerCompany: caseData.assignedPartner || '-',
    insuredFullAddress: insuredFullAddress || '-',
    accidentDateTime: accidentDateTime || '-',
    accidentCategory: caseData.accidentCategory || '-',
    accidentCause: caseData.accidentCause || '-',
    siteNotes: caseData.siteNotes || caseData.specialNotes || '특이사항 없음',
    vocContent: caseData.specialRequests || caseData.vocContent || caseData.additionalNotes || '-',
    victimName: caseData.victimName || '-',
    victimContact: caseData.victimContact || '-',
    victimAddress: victimFullAddress || insuredFullAddress || '-',
    processingTypes: processingTypesStr || '-',
    recoveryMethodType: caseData.recoveryMethodType || '-',
    repairItemsHtml: repairItemsHtml,
    documentDate: formatDate(new Date().toISOString()),
    // 작성자: 접수 시 입력한 담당자명 우선
    authorName: caseData.assignedPartnerManager || partnerData?.name || caseData.dispatchManager || '-',
  };
  
  template = template.replace('{{repairItemsHtml}}', repairItemsHtml);
  
  return replaceTemplateVariables(template, data);
}

async function generateDrawingPage(caseData: any, drawingData: any): Promise<string> {
  const templatePath = path.join(TEMPLATES_DIR, 'drawing.html');
  let template = fs.readFileSync(templatePath, 'utf-8');
  
  const fullAddress = [caseData.insuredAddress, caseData.insuredAddressDetail]
    .filter(Boolean).join(' ');
  
  let drawingContent = '<div class="no-image">도면 이미지가 없습니다.</div>';
  
  // Check if drawing has any content
  const hasUploadedImages = drawingData?.uploadedImages && drawingData.uploadedImages.length > 0;
  const hasRectangles = drawingData?.rectangles && drawingData.rectangles.length > 0;
  const hasLeakMarkers = drawingData?.leakMarkers && drawingData.leakMarkers.length > 0;
  const hasAccidentAreas = drawingData?.accidentAreas && drawingData.accidentAreas.length > 0;
  
  console.log(`[PDF 도면] 이미지: ${hasUploadedImages ? drawingData.uploadedImages.length : 0}, 사각형: ${hasRectangles ? drawingData.rectangles.length : 0}, 누수마커: ${hasLeakMarkers ? drawingData.leakMarkers.length : 0}`);
  
  if (hasUploadedImages || hasRectangles || hasLeakMarkers || hasAccidentAreas) {
    // Use the same DISPLAY_SCALE as the web app (0.05)
    // This converts large internal coordinates to displayable pixels
    const DISPLAY_SCALE = 0.05;
    
    // Calculate bounding box of all elements to determine canvas size
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    if (hasUploadedImages) {
      for (const img of drawingData.uploadedImages) {
        const x = img.x || 0;
        const y = img.y || 0;
        const w = img.width || 200;
        const h = img.height || 200;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + w);
        maxY = Math.max(maxY, y + h);
      }
    }
    if (hasRectangles) {
      for (const rect of drawingData.rectangles) {
        const x = rect.x || 0;
        const y = rect.y || 0;
        const w = rect.width || 50;
        const h = rect.height || 50;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + w);
        maxY = Math.max(maxY, y + h);
      }
    }
    if (hasLeakMarkers) {
      for (const marker of drawingData.leakMarkers) {
        const x = marker.x || 0;
        const y = marker.y || 0;
        minX = Math.min(minX, x - 200);
        minY = Math.min(minY, y - 200);
        maxX = Math.max(maxX, x + 200);
        maxY = Math.max(maxY, y + 200);
      }
    }
    if (hasAccidentAreas) {
      for (const area of drawingData.accidentAreas) {
        const x = area.x || 0;
        const y = area.y || 0;
        const w = area.width || 50;
        const h = area.height || 50;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + w);
        maxY = Math.max(maxY, y + h);
      }
    }
    
    // Calculate display dimensions
    const contentWidth = (maxX - minX) * DISPLAY_SCALE;
    const contentHeight = (maxY - minY) * DISPLAY_SCALE;
    
    // PDF container dimensions
    const containerWidth = 540; // A4 with margins
    const containerHeight = 700; // Reasonable height for PDF
    
    // Calculate scale to fit content in container
    const scaleX = containerWidth / contentWidth;
    const scaleY = containerHeight / contentHeight;
    const fitScale = Math.min(scaleX, scaleY, 1); // Don't scale up, only down
    
    const finalScale = DISPLAY_SCALE * fitScale;
    const offsetX = -minX * finalScale + (containerWidth - contentWidth * fitScale) / 2;
    const offsetY = -minY * finalScale + 20; // Add some top padding
    
    console.log(`[PDF 도면] 경계: minX=${minX}, minY=${minY}, maxX=${maxX}, maxY=${maxY}`);
    console.log(`[PDF 도면] 콘텐츠 크기: ${contentWidth}x${contentHeight}px, fitScale=${fitScale.toFixed(3)}`);
    
    let elements = '';
    
    // Add uploaded images
    if (hasUploadedImages) {
      for (const img of drawingData.uploadedImages) {
        let imageUrl = img.src || '';
        if (imageUrl && !imageUrl.startsWith('data:')) {
          imageUrl = `data:image/png;base64,${imageUrl}`;
        }
        if (imageUrl) {
          const x = (img.x || 0) * finalScale + offsetX;
          const y = (img.y || 0) * finalScale + offsetY;
          const width = (img.width || 200) * finalScale;
          const height = (img.height || 200) * finalScale;
          elements += `<img src="${imageUrl}" style="position:absolute;left:${x}px;top:${y}px;width:${width}px;height:${height}px;object-fit:contain;" />`;
        }
      }
    }
    
    // Add rectangles
    if (hasRectangles) {
      for (const rect of drawingData.rectangles) {
        const x = (rect.x || 0) * finalScale + offsetX;
        const y = (rect.y || 0) * finalScale + offsetY;
        const width = (rect.width || 50) * finalScale;
        const height = (rect.height || 50) * finalScale;
        const bgColor = rect.backgroundColor || '#FFFFFF';
        const borderColor = '#666666';
        elements += `<div style="position:absolute;left:${x}px;top:${y}px;width:${width}px;height:${height}px;border:1px solid ${borderColor};background:${bgColor};box-sizing:border-box;"></div>`;
        
        // Add label/text if exists
        if (rect.text) {
          elements += `<div style="position:absolute;left:${x}px;top:${y + height / 2 - 8}px;width:${width}px;text-align:center;font-size:10px;color:#333;font-weight:bold;">${rect.text}</div>`;
        }
      }
    }
    
    // Add leak markers
    if (hasLeakMarkers) {
      for (const marker of drawingData.leakMarkers) {
        const x = (marker.x || 0) * finalScale + offsetX;
        const y = (marker.y || 0) * finalScale + offsetY;
        elements += `<div style="position:absolute;left:${x - 12}px;top:${y - 12}px;width:24px;height:24px;background:#EF4444;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:10px;font-weight:bold;border:2px solid #DC2626;">✕</div>`;
      }
    }
    
    // Add accident areas
    if (hasAccidentAreas) {
      for (const area of drawingData.accidentAreas) {
        const x = (area.x || 0) * finalScale + offsetX;
        const y = (area.y || 0) * finalScale + offsetY;
        const width = (area.width || 50) * finalScale;
        const height = (area.height || 50) * finalScale;
        elements += `<div style="position:absolute;left:${x}px;top:${y}px;width:${width}px;height:${height}px;border:2px dashed #EF4444;background:rgba(239,68,68,0.1);box-sizing:border-box;"></div>`;
      }
    }
    
    const canvasHeight = Math.min(contentHeight * fitScale + 40, containerHeight);
    drawingContent = `<div class="drawing-canvas" style="position:relative;width:${containerWidth}px;height:${canvasHeight}px;border:1px solid #ddd;background:#f9f9f9;overflow:hidden;margin:0 auto;">${elements}</div>`;
  }
  
  const data = {
    caseNumber: caseData.caseNumber || '',
    insuranceCompany: caseData.insuranceCompany || '',
    insuredName: caseData.insuredName || caseData.victimName || '',
    address: fullAddress,
    insuranceAccidentNo: caseData.insuranceAccidentNo || '',
    documentDate: formatDate(new Date().toISOString()),
    drawingContent: drawingContent,
  };
  
  return replaceTemplateVariables(template, data);
}

async function generateEvidencePages(caseData: any, documents: any[], imageQuality: number = 80): Promise<string> {
  const templatePath = path.join(TEMPLATES_DIR, 'evidence-images.html');
  let template = fs.readFileSync(templatePath, 'utf-8');
  
  console.log(`[PDF 증빙자료] 이미지 품질: ${imageQuality}%`);
  
  const categoryGroups: Record<string, any[]> = {};
  
  const categoryToTab: Record<string, string> = {
    '현장출동사진': '현장사진',
    '현장': '현장사진',
    '수리중 사진': '현장사진',
    '수리중': '현장사진',
    '복구완료 사진': '현장사진',
    '복구완료': '현장사진',
    '보험금 청구서': '기본자료',
    '개인정보 동의서(가족용)': '기본자료',
    '주민등록등본': '증빙자료',
    '등기부등본': '증빙자료',
    '건축물대장': '증빙자료',
    '기타증빙자료(민원일지 등)': '증빙자료',
    '위임장': '청구자료',
    '도급계약서': '청구자료',
    '복구완료확인서': '청구자료',
    '부가세 청구자료': '청구자료',
    '청구': '청구자료',
  };
  
  for (const doc of documents) {
    const tab = categoryToTab[doc.category] || '기타';
    if (!categoryGroups[tab]) {
      categoryGroups[tab] = [];
    }
    categoryGroups[tab].push(doc);
  }
  
  // Collect all image documents with valid data
  const allImages: { doc: any; tab: string }[] = [];
  const tabOrder = ['현장사진', '기본자료', '증빙자료', '청구자료', '기타'];
  
  for (const tab of tabOrder) {
    const docs = categoryGroups[tab];
    if (!docs || docs.length === 0) continue;
    
    for (const doc of docs) {
      const isImage = doc.fileType?.startsWith('image/');
      // Only include images that have valid file data
      const hasValidData = doc.fileData && doc.fileData.length > 100;
      if (isImage && hasValidData) {
        allImages.push({ doc, tab });
      } else if (isImage && !hasValidData) {
        console.log(`[PDF 증빙자료] 이미지 데이터 없음 - 건너뜀: ${doc.fileName}`);
      }
    }
  }
  
  console.log(`[PDF 증빙자료] 유효한 이미지 수: ${allImages.length}`);
  
  // Log each image's data size
  allImages.forEach((img, idx) => {
    const dataLength = img.doc.fileData?.length || 0;
    console.log(`[PDF 증빙자료] 이미지 ${idx + 1}: ${img.doc.fileName}, 데이터 크기: ${dataLength} bytes`);
  });
  
  // If no valid images, return empty string immediately
  if (allImages.length === 0) {
    console.log('[PDF 증빙자료] 유효한 이미지 없음 - 빈 페이지 생성하지 않음');
    return '';
  }
  
  let pagesHtml = '';
  
  // Generate pages with 2 images each
  for (let i = 0; i < allImages.length; i += 2) {
    const firstImage = allImages[i];
    const secondImage = allImages[i + 1];
    
    let imagesBlockHtml = '';
    
    // First image block
    const firstUploadDate = firstImage.doc.createdAt ? new Date(firstImage.doc.createdAt).toLocaleDateString('ko-KR') : '';
    let firstImageDataUri = firstImage.doc.fileData || '';
    if (firstImageDataUri && !firstImageDataUri.startsWith('data:')) {
      firstImageDataUri = `data:${firstImage.doc.fileType || 'image/jpeg'};base64,${firstImageDataUri}`;
    }
    // 이미지 압축 적용
    firstImageDataUri = await compressImage(firstImageDataUri, imageQuality);
    
    imagesBlockHtml += `
      <div class="image-block">
        <div class="image-block-header">${firstImage.tab} - ${firstImage.doc.category}</div>
        <div class="image-container">
          <img src="${firstImageDataUri}" alt="${firstImage.doc.fileName}" class="evidence-image" onerror="this.style.display='none'"/>
        </div>
        <div class="image-info">
          <span class="image-name">${firstImage.doc.fileName}</span>
          <span class="image-date">업로드: ${firstUploadDate}</span>
        </div>
      </div>
    `;
    
    // Second image block (if exists)
    if (secondImage) {
      const secondUploadDate = secondImage.doc.createdAt ? new Date(secondImage.doc.createdAt).toLocaleDateString('ko-KR') : '';
      let secondImageDataUri = secondImage.doc.fileData || '';
      if (secondImageDataUri && !secondImageDataUri.startsWith('data:')) {
        secondImageDataUri = `data:${secondImage.doc.fileType || 'image/jpeg'};base64,${secondImageDataUri}`;
      }
      // 이미지 압축 적용
      secondImageDataUri = await compressImage(secondImageDataUri, imageQuality);
      
      imagesBlockHtml += `
        <div class="image-block">
          <div class="image-block-header">${secondImage.tab} - ${secondImage.doc.category}</div>
          <div class="image-container">
            <img src="${secondImageDataUri}" alt="${secondImage.doc.fileName}" class="evidence-image" onerror="this.style.display='none'"/>
          </div>
          <div class="image-info">
            <span class="image-name">${secondImage.doc.fileName}</span>
            <span class="image-date">업로드: ${secondUploadDate}</span>
          </div>
        </div>
      `;
    }
    
    pagesHtml += `
      <div class="page">
        <div class="header-bar">
          <div class="header-title">증빙자료</div>
          <div class="header-info">접수번호: ${caseData.caseNumber || ''}</div>
        </div>
        <div class="images-wrapper">
          ${imagesBlockHtml}
        </div>
      </div>
    `;
  }
  
  // Note: Already checked allImages.length at start, so pagesHtml should have content
  console.log(`[PDF 증빙자료] 생성된 페이지 수: ${Math.ceil(allImages.length / 2)}`);
  
  template = template.replace('{{imagesHtml}}', pagesHtml);
  template = template.replace('{{#unless hasImages}}', '<!--');
  template = template.replace('{{/unless}}', '-->');
  template = template.replace('{{caseNumber}}', caseData.caseNumber || '');
  
  return template;
}

async function generateRecoveryAreaPage(caseData: any, estimateRowsData: any[]): Promise<string> {
  const templatePath = path.join(TEMPLATES_DIR, 'recovery-area.html');
  let template = fs.readFileSync(templatePath, 'utf-8');
  
  const fullAddress = [caseData.insuredAddress, caseData.insuredAddressDetail]
    .filter(Boolean).join(' ');
  
  // Group rows by category (장소)
  const categoryGroups: Record<string, any[]> = {};
  if (estimateRowsData && estimateRowsData.length > 0) {
    estimateRowsData.forEach((row) => {
      const category = row.category || '기타';
      if (!categoryGroups[category]) {
        categoryGroups[category] = [];
      }
      categoryGroups[category].push(row);
    });
  }
  
  let areaRowsHtml = '';
  const categories = Object.keys(categoryGroups);
  
  if (categories.length > 0) {
    categories.forEach((category) => {
      const rows = categoryGroups[category];
      const rowSpan = rows.length;
      
      rows.forEach((row, index) => {
        // 피해면적 - 이미 m 단위로 저장됨
        const damageW = row.damageWidth ? Number(row.damageWidth).toFixed(1) : '0.0';
        const damageH = row.damageHeight ? Number(row.damageHeight).toFixed(1) : '0.0';
        const damageAreaM2 = row.damageArea ? Number(row.damageArea).toFixed(1) : '0.0';
        
        // 복구면적 - 이미 m 단위로 저장됨
        const repairW = row.repairWidth ? Number(row.repairWidth).toFixed(1) : '0.0';
        const repairH = row.repairHeight ? Number(row.repairHeight).toFixed(1) : '0.0';
        const repairAreaM2 = row.repairArea ? Number(row.repairArea).toFixed(1) : '0.0';
        
        // 공사내용 = location (위치), 공사분류 = workName (공사명)
        const workContent = row.location || '-';
        const workType = row.workName || '-';
        const note = row.note || '-';
        
        if (index === 0) {
          areaRowsHtml += `
            <tr>
              <td class="category-cell" rowspan="${rowSpan}">${category}</td>
              <td>${workContent}</td>
              <td>${workType}</td>
              <td>${damageAreaM2}</td>
              <td>${damageW}</td>
              <td>${damageH}</td>
              <td>${repairAreaM2}</td>
              <td>${repairW}</td>
              <td>${repairH}</td>
              <td>${note}</td>
            </tr>
          `;
        } else {
          areaRowsHtml += `
            <tr>
              <td>${workContent}</td>
              <td>${workType}</td>
              <td>${damageAreaM2}</td>
              <td>${damageW}</td>
              <td>${damageH}</td>
              <td>${repairAreaM2}</td>
              <td>${repairW}</td>
              <td>${repairH}</td>
              <td>${note}</td>
            </tr>
          `;
        }
      });
    });
  } else {
    areaRowsHtml = '<tr><td colspan="10" style="text-align:center;padding:10mm;">등록된 복구면적 데이터가 없습니다.</td></tr>';
  }
  
  const data = {
    caseNumber: caseData.caseNumber || '',
    insuranceCompany: caseData.insuranceCompany || '',
    insuranceAccidentNo: caseData.insuranceAccidentNo || '',
    address: fullAddress,
    documentDate: formatDate(new Date().toISOString()),
    areaRowsHtml: areaRowsHtml,
  };
  
  template = template.replace('{{areaRowsHtml}}', areaRowsHtml);
  
  return replaceTemplateVariables(template, data);
}

async function generateEstimatePage(caseData: any, estimateData: any, estimateRowsData: any[], partnerData: any): Promise<string> {
  const templatePath = path.join(TEMPLATES_DIR, 'estimate.html');
  let template = fs.readFileSync(templatePath, 'utf-8');
  
  const fullAddress = [caseData.insuredAddress, caseData.insuredAddressDetail]
    .filter(Boolean).join(' ');
  
  let areaRowsHtml = '';
  if (estimateRowsData && estimateRowsData.length > 0) {
    estimateRowsData.forEach((row, index) => {
      const damageW = row.damageWidth || '-';
      const damageH = row.damageHeight || '-';
      const damageAreaM2 = row.damageArea ? Number(row.damageArea).toFixed(2) : '-';
      const damageDisplay = `${damageW}×${damageH}=${damageAreaM2}㎡`;
      
      const repairW = row.repairWidth || '-';
      const repairH = row.repairHeight || '-';
      const repairAreaM2 = row.repairArea ? Number(row.repairArea).toFixed(2) : '-';
      const repairDisplay = `${repairW}×${repairH}=${repairAreaM2}㎡`;
      
      areaRowsHtml += `
        <tr>
          <td style="text-align:center">${index + 1}</td>
          <td style="text-align:center">${row.category || '-'}</td>
          <td style="text-align:center">${row.location || '-'}</td>
          <td style="text-align:center">${row.workType || '-'}</td>
          <td style="text-align:left">${row.workName || '-'}</td>
          <td style="text-align:center">${damageDisplay}</td>
          <td style="text-align:center">${repairDisplay}</td>
          <td style="text-align:left">${row.note || '-'}</td>
        </tr>
      `;
    });
  } else {
    areaRowsHtml = '<tr><td colspan="8" style="text-align:center;padding:5mm;">등록된 복구면적이 없습니다.</td></tr>';
  }
  
  let laborCostData: any[] = [];
  let materialCostData: any[] = [];
  let laborTotal = 0;
  let materialTotal = 0;
  
  if (estimateData) {
    if (estimateData.laborCostData) {
      try {
        laborCostData = typeof estimateData.laborCostData === 'string' 
          ? JSON.parse(estimateData.laborCostData) 
          : estimateData.laborCostData;
        if (Array.isArray(laborCostData)) {
          laborTotal = laborCostData.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
        }
      } catch { laborCostData = []; }
    }
    if (estimateData.materialCostData) {
      try {
        let rawMaterialData = typeof estimateData.materialCostData === 'string'
          ? JSON.parse(estimateData.materialCostData)
          : estimateData.materialCostData;
        
        // Handle both formats: {"rows": [...]} or direct array [...]
        if (rawMaterialData && typeof rawMaterialData === 'object') {
          if (Array.isArray(rawMaterialData)) {
            materialCostData = rawMaterialData;
          } else if (rawMaterialData.rows && Array.isArray(rawMaterialData.rows)) {
            materialCostData = rawMaterialData.rows;
          }
        }
        
        if (Array.isArray(materialCostData) && materialCostData.length > 0) {
          // MaterialRow uses Korean field names: 합계 or 금액 for amount
          materialTotal = materialCostData.reduce((sum, item) => {
            const amount = Number(item.합계) || Number(item.금액) || Number(item.amount) || 0;
            return sum + amount;
          }, 0);
          console.log(`[PDF 자재비] ${materialCostData.length}개 항목, 합계: ${materialTotal}`);
        }
      } catch (err) { 
        console.error('[PDF 자재비 파싱 오류]:', err);
        materialCostData = []; 
      }
    }
  }
  
  let laborRowsHtml = '';
  if (laborCostData.length > 0) {
    laborCostData.forEach((item) => {
      // Match exact field names from LaborCostRow interface
      const category = item.category || '-';
      const workName = item.workName || '-';
      const detailItem = item.detailItem || '-';
      // 복구면적 - damageArea field (in mm² stored, display as m²)
      const damageAreaValue = item.damageArea || 0;
      const damageAreaDisplay = damageAreaValue > 0 ? `${Number(damageAreaValue).toFixed(0)}㎡` : '-';
      // 적용단가 - standardPrice (E: DB 노임단가)
      const standardPrice = item.standardPrice || 0;
      // 합계 - amount
      const amount = item.amount || 0;
      // 수량(인) - I ÷ E (합계 ÷ 노임단가), 소수점 둘째 자리
      const displayQuantity = standardPrice > 0 ? (amount / standardPrice) : 0;
      // 경비 - includeInEstimate: false = 경비체크됨(O), true = 경비체크안됨(-)
      const isExpense = item.includeInEstimate === false || item.includeInEstimate === 'false' ? 'O' : '-';
      // 비고 - request
      const note = item.request || '-';
      
      laborRowsHtml += `
        <tr>
          <td style="text-align:center">${category}</td>
          <td style="text-align:center">${workName}</td>
          <td style="text-align:center">${detailItem}</td>
          <td style="text-align:right">${damageAreaDisplay}</td>
          <td style="text-align:right">${formatNumber(Math.round(standardPrice))}</td>
          <td style="text-align:center">${displayQuantity.toFixed(2)}</td>
          <td style="text-align:right">${formatNumber(Math.round(amount))}</td>
          <td style="text-align:center">${isExpense}</td>
          <td style="text-align:left">${note}</td>
        </tr>
      `;
    });
    laborRowsHtml += `
      <tr style="background-color:#f5f5f5;font-weight:bold;">
        <td colspan="6" style="text-align:center">노무비 소계</td>
        <td style="text-align:right">${formatNumber(Math.round(laborTotal))}</td>
        <td colspan="2"></td>
      </tr>
    `;
  } else {
    laborRowsHtml = '<tr><td colspan="9" style="text-align:center;padding:5mm;">등록된 노무비가 없습니다.</td></tr>';
  }
  
  let materialRowsHtml = '';
  if (materialCostData.length > 0) {
    materialCostData.forEach((item) => {
      // Match exact field names from MaterialRow interface
      const category = item.공종 || item.category || '-';
      const workName = item.공사명 || item.workName || '-';
      const materialItem = item.자재항목 || item.자재 || '-';
      const unitPrice = item.단가 || item.기준단가 || 0;
      const quantity = item.수량 || 0;
      const unit = item.단위 || '-';
      const amount = item.합계 || item.금액 || 0;
      const note = item.비고 || '-';
      
      materialRowsHtml += `
        <tr>
          <td style="text-align:center">${category}</td>
          <td style="text-align:center">${workName}</td>
          <td style="text-align:left">${materialItem}</td>
          <td style="text-align:right">${formatNumber(Math.round(unitPrice))}</td>
          <td style="text-align:center">${Number(quantity).toFixed(2)}</td>
          <td style="text-align:center">${unit}</td>
          <td style="text-align:right">${formatNumber(Math.round(amount))}</td>
          <td style="text-align:left">${note}</td>
        </tr>
      `;
    });
    materialRowsHtml += `
      <tr style="background-color:#f5f5f5;font-weight:bold;">
        <td colspan="6" style="text-align:center">자재비 소계</td>
        <td style="text-align:right">${formatNumber(Math.round(materialTotal))}</td>
        <td></td>
      </tr>
    `;
  } else {
    materialRowsHtml = '<tr><td colspan="8" style="text-align:center;padding:5mm;">등록된 자재비가 없습니다.</td></tr>';
  }
  
  // VAT 포함/별도 옵션 확인 (materialCostData에 저장됨)
  let vatIncluded = true; // 기본값: 포함
  if (estimateData?.materialCostData) {
    try {
      const rawData = typeof estimateData.materialCostData === 'string'
        ? JSON.parse(estimateData.materialCostData)
        : estimateData.materialCostData;
      if (rawData && typeof rawData === 'object' && rawData.vatIncluded !== undefined) {
        vatIncluded = rawData.vatIncluded;
      }
    } catch {}
  }
  
  // 경비 여부 구분 (includeInEstimate: true = 일반관리비/이윤에 포함, false = 경비)
  let laborTotalNonExpense = 0; // 경비 아닌 노무비
  let laborTotalExpense = 0; // 경비인 노무비
  if (Array.isArray(laborCostData)) {
    laborCostData.forEach(item => {
      const amount = Number(item.amount) || 0;
      if (item.includeInEstimate === true || item.includeInEstimate === 'true') {
        laborTotalNonExpense += amount;
      } else {
        laborTotalExpense += amount;
      }
    });
  }
  
  // 소계 (전체)
  const subtotal = laborTotal + materialTotal;
  
  // 일반관리비와 이윤 계산 대상 (경비 아닌 항목 + 자재비)
  const baseForFees = laborTotalNonExpense + materialTotal;
  
  // 일반관리비 (6%)
  const managementFee = Math.round(baseForFees * 0.06);
  
  // 이윤 (15%)
  const profit = Math.round(baseForFees * 0.15);
  
  // VAT 기준액 (소계 + 일반관리비 + 이윤)
  const vatBase = subtotal + managementFee + profit;
  
  // 만원단위절사 (VAT 적용 전에 절사)
  const truncation = vatBase % 10000;
  const truncatedVatBase = vatBase - truncation;
  
  // VAT (10%) - 절사된 금액에 적용
  const vat = vatIncluded ? Math.round(truncatedVatBase * 0.1) : 0;
  
  // 총 합계 = 만원단위절사된 금액 + VAT
  const grandTotal = truncatedVatBase + vat;
  
  const data = {
    caseNumber: caseData.caseNumber || '',
    insuranceAccidentNo: caseData.insuranceAccidentNo || '',
    insuranceCompany: caseData.insuranceCompany || '',
    insuredName: caseData.insuredName || caseData.victimName || '',
    address: fullAddress,
    documentDate: formatDate(new Date().toISOString()),
    partnerCompany: caseData.assignedPartner || '',
    supplierBusinessNumber: partnerData?.businessRegistrationNumber || '',
    supplierCompanyName: partnerData?.company || caseData.assignedPartner || '',
    supplierRepresentative: partnerData?.representativeName || '',
    areaRowsHtml: areaRowsHtml,
    laborRowsHtml: laborRowsHtml,
    materialRowsHtml: materialRowsHtml,
    laborTotal: formatNumber(laborTotal),
    materialTotal: formatNumber(materialTotal),
    subtotal: formatNumber(subtotal),
    managementFee: formatNumber(managementFee),
    profit: formatNumber(profit),
    vat: formatNumber(vat),
    vatStatus: vatIncluded ? '포함' : '별도',
    truncation: formatNumber(truncation),
    truncatedSubtotal: formatNumber(truncatedVatBase),
    grandTotal: formatNumber(grandTotal),
    estimateAmount: formatNumber(Number(caseData.estimateAmount) || grandTotal),
  };
  
  const areaTableRegex = /(<tbody id="area-rows">)([\s\S]*?)(<\/tbody>)/i;
  template = template.replace(areaTableRegex, `$1${areaRowsHtml}$3`);
  
  const laborTableRegex = /(<tbody id="labor-rows">)([\s\S]*?)(<\/tbody>)/i;
  template = template.replace(laborTableRegex, `$1${laborRowsHtml}$3`);
  
  const materialTableRegex = /(<tbody id="material-rows">)([\s\S]*?)(<\/tbody>)/i;
  template = template.replace(materialTableRegex, `$1${materialRowsHtml}$3`);
  
  return replaceTemplateVariables(template, data);
}

export async function generatePdf(payload: PdfGenerationPayload, processingLevel: number = 0): Promise<Buffer> {
  const { caseId, sections, evidence } = payload;
  const processingConfig = PROCESSING_LEVELS[processingLevel] || PROCESSING_LEVELS[0];
  console.log(`[PDF 생성] 처리 레벨 ${processingLevel}: ${processingConfig.maxDimension}px / ${processingConfig.quality}%`);
  
  const [caseData] = await db.select().from(cases).where(eq(cases.id, caseId));
  if (!caseData) {
    throw new Error('케이스를 찾을 수 없습니다.');
  }
  
  let partnerData: any = null;
  if (caseData.assignedPartner) {
    const trimmedPartnerName = caseData.assignedPartner.trim();
    console.log(`[PDF 생성] 협력사 검색: "${trimmedPartnerName}"`);
    
    // 1차 시도: 정확히 일치 (trim 적용)
    let partners = await db.select().from(users).where(
      sql`TRIM(${users.company}) = ${trimmedPartnerName}`
    );
    
    // 2차 시도: 대소문자 무시 + LIKE 검색
    if (partners.length === 0) {
      console.log(`[PDF 생성] 정확히 일치하는 협력사 없음, ILIKE 검색 시도...`);
      partners = await db.select().from(users).where(
        ilike(users.company, `%${trimmedPartnerName}%`)
      );
    }
    
    // 3차 시도: 담당자 이름으로 검색
    if (partners.length === 0 && caseData.assignedPartnerManager) {
      console.log(`[PDF 생성] 회사명 검색 실패, 담당자명 "${caseData.assignedPartnerManager}"로 검색 시도...`);
      partners = await db.select().from(users).where(
        eq(users.name, caseData.assignedPartnerManager.trim())
      );
    }
    
    console.log(`[PDF 생성] 검색 결과: ${partners.length}개 사용자 발견`);
    if (partners.length > 0) {
      // 협력사 역할을 가진 사용자 우선
      const partnerUser = partners.find(p => p.role === '협력사') || partners[0];
      partnerData = partnerUser;
      console.log(`[PDF 생성] 협력사 정보 - 회사: ${partnerData.company}, 사업자번호: ${partnerData.businessRegistrationNumber || '없음'}, 대표자: ${partnerData.representativeName || '없음'}`);
    } else {
      console.log(`[PDF 생성] 협력사 "${trimmedPartnerName}"에 해당하는 사용자를 찾을 수 없음`);
      // 모든 협력사 목록 출력 (디버깅용)
      const allPartners = await db.select({ company: users.company, name: users.name }).from(users).where(eq(users.role, '협력사'));
      console.log(`[PDF 생성] 시스템 내 등록된 협력사 목록: ${allPartners.map(p => `${p.company}(${p.name})`).join(', ')}`);
    }
  }
  
  let browser: any = null;
  
  try {
    const chromiumPath = getChromiumPath();
    console.log(`[PDF] Using Chromium path: ${chromiumPath || 'bundled'}`);
    browser = await puppeteer.launch({
      headless: true,
      ...(chromiumPath && { executablePath: chromiumPath }),
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--single-process'],
    });
    
    const pdfParts: Buffer[] = [];
    
    if (sections.cover) {
      const coverHtml = await generateCoverPage(caseData, partnerData);
      const page = await browser.newPage();
      await page.setContent(coverHtml, { waitUntil: 'networkidle0' });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
      });
      pdfParts.push(Buffer.from(pdfBuffer));
      await page.close();
    }
    
    if (sections.fieldReport) {
      let repairItems: any[] = [];
      const estimateList = await db.select().from(estimates)
        .where(eq(estimates.caseId, caseId))
        .orderBy(estimates.version);
      
      if (estimateList.length > 0) {
        const latestEstimate = estimateList[estimateList.length - 1];
        repairItems = await db.select().from(estimateRows)
          .where(eq(estimateRows.estimateId, latestEstimate.id))
          .orderBy(estimateRows.rowOrder);
      }
      
      const fieldReportHtml = await generateFieldReportPage(caseData, partnerData, repairItems);
      const page = await browser.newPage();
      await page.setContent(fieldReportHtml, { waitUntil: 'networkidle0' });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
      });
      pdfParts.push(Buffer.from(pdfBuffer));
      await page.close();
    }
    
    if (sections.drawing) {
      const [drawingData] = await db.select().from(drawings).where(eq(drawings.caseId, caseId));
      const drawingHtml = await generateDrawingPage(caseData, drawingData);
      const page = await browser.newPage();
      await page.setContent(drawingHtml, { waitUntil: 'networkidle0' });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
      });
      pdfParts.push(Buffer.from(pdfBuffer));
      await page.close();
    }
    
    const pdfDocumentsToAppend: { doc: any; tab: string }[] = [];
    
    // 카테고리 -> 탭 매핑
    const categoryToTab: Record<string, string> = {
      '현장출동사진': '현장사진',
      '현장': '현장사진',
      '수리중 사진': '현장사진',
      '수리중': '현장사진',
      '복구완료 사진': '현장사진',
      '복구완료': '현장사진',
      '보험금 청구서': '기본자료',
      '개인정보 동의서(가족용)': '기본자료',
      '주민등록등본': '증빙자료',
      '등기부등본': '증빙자료',
      '건축물대장': '증빙자료',
      '기타증빙자료(민원일지 등)': '증빙자료',
      '위임장': '청구자료',
      '도급계약서': '청구자료',
      '복구완료확인서': '청구자료',
      '부가세 청구자료': '청구자료',
      '청구': '청구자료',
    };
    
    if (sections.evidence && evidence.selectedFileIds.length > 0) {
      const selectedDocs = await db.select().from(caseDocuments)
        .where(
          and(
            eq(caseDocuments.caseId, caseId),
            inArray(caseDocuments.id, evidence.selectedFileIds)
          )
        );
      
      const imageDocs = selectedDocs.filter(doc => doc.fileType?.startsWith('image/'));
      const pdfDocs = selectedDocs.filter(doc => doc.fileType === 'application/pdf' || doc.fileName?.toLowerCase().endsWith('.pdf'));
      
      console.log(`[PDF 생성] 선택된 문서 수: ${selectedDocs.length}, 이미지: ${imageDocs.length}, PDF: ${pdfDocs.length}`);
      console.log('[PDF 생성] PDF 문서 목록:', pdfDocs.map(d => ({ id: d.id, name: d.fileName, type: d.fileType, category: d.category })));
      
      if (imageDocs.length > 0) {
        // pdf-lib로 직접 PDF 생성 (Puppeteer 미사용 - 안정성 향상)
        console.log(`[PDF 생성] 증빙자료 이미지 pdf-lib로 직접 생성 시작`);
        const { pdfBuffer: evidencePdfBuffer, errors: evidenceErrors } = await generateEvidencePdfWithPdfLib(caseData, imageDocs, processingConfig);
        
        if (evidenceErrors.length > 0) {
          console.log(`[PDF 생성] 증빙자료 처리 중 오류 발생: ${evidenceErrors.length}개 파일`);
          evidenceErrors.forEach(err => {
            console.log(`[PDF 생성]   - ${err.fileName}: ${err.reason}`);
          });
        }
        
        if (evidencePdfBuffer.length > 0) {
          pdfParts.push(evidencePdfBuffer);
          console.log(`[PDF 생성] 증빙자료 PDF 생성 완료: ${Math.round(evidencePdfBuffer.length / 1024)}KB`);
        } else {
          console.log('[PDF 생성] 증빙자료 이미지 없음 - 페이지 건너뜀');
        }
      }
      
      // PDF 문서들을 카테고리/탭 정보와 함께 저장 (증빙자료 섹션에서 바로 추가하기 위함)
      pdfDocs.forEach(doc => {
        const tab = categoryToTab[doc.category] || '기타';
        pdfDocumentsToAppend.push({ doc, tab });
      });
      
      // PDF 첨부파일을 증빙자료 섹션에 카테고리별로 추가
      if (pdfDocumentsToAppend.length > 0) {
        // 탭 순서대로 정렬
        const tabOrder = ['현장사진', '기본자료', '증빙자료', '청구자료', '기타'];
        const sortedPdfDocs = [...pdfDocumentsToAppend].sort((a, b) => {
          const aIndex = tabOrder.indexOf(a.tab);
          const bIndex = tabOrder.indexOf(b.tab);
          return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
        });
        
        // 카테고리별 헤더 페이지 생성 함수
        const generatePdfAttachmentHeader = (tabName: string, category: string, fileName: string, caseNumber: string) => {
          return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @page { size: A4; margin: 0; }
    body { 
      font-family: 'Noto Sans KR', sans-serif; 
      margin: 0; 
      padding: 20mm;
      box-sizing: border-box;
    }
    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: linear-gradient(135deg, #3b82f6, #6366f1);
      color: white;
      padding: 10mm 15mm;
      margin: -20mm -20mm 20mm -20mm;
    }
    .header-title { font-size: 18pt; font-weight: bold; }
    .header-info { font-size: 10pt; }
    .content {
      padding: 20mm;
      text-align: center;
    }
    .tab-badge {
      display: inline-block;
      background: #3b82f6;
      color: white;
      padding: 5mm 10mm;
      border-radius: 5mm;
      font-size: 14pt;
      margin-bottom: 10mm;
    }
    .category-name {
      font-size: 16pt;
      color: #374151;
      margin-bottom: 10mm;
    }
    .file-name {
      font-size: 12pt;
      color: #6b7280;
      word-break: break-all;
    }
    .note {
      margin-top: 20mm;
      font-size: 10pt;
      color: #9ca3af;
    }
  </style>
</head>
<body>
  <div class="header-bar">
    <div class="header-title">증빙자료 - PDF 첨부</div>
    <div class="header-info">접수번호: ${caseNumber}</div>
  </div>
  <div class="content">
    <div class="tab-badge">${tabName}</div>
    <div class="category-name">${category}</div>
    <div class="file-name">${fileName}</div>
    <div class="note">※ 다음 페이지부터 첨부 PDF 내용이 표시됩니다.</div>
  </div>
</body>
</html>`;
        };
        
        console.log(`[PDF 증빙자료] PDF 첨부파일 ${sortedPdfDocs.length}개를 증빙자료 섹션에 추가`);
        
        // 브라우저가 아직 열려있는지 확인하고, 필요시 다시 열기
        if (!browser) {
          const chromiumPath2 = getChromiumPath();
          browser = await puppeteer.launch({
            headless: true,
            ...(chromiumPath2 && { executablePath: chromiumPath2 }),
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--single-process'],
          });
        }
        
        for (const { doc: pdfDoc, tab } of sortedPdfDocs) {
          try {
            // 1. 헤더 페이지 생성
            const headerHtml = generatePdfAttachmentHeader(tab, pdfDoc.category, pdfDoc.fileName, caseData.caseNumber || '');
            const headerPage = await browser.newPage();
            await headerPage.setContent(headerHtml, { waitUntil: 'networkidle0' });
            const headerPdfBuffer = await headerPage.pdf({
              format: 'A4',
              printBackground: true,
              margin: { top: '0', right: '0', bottom: '0', left: '0' },
            });
            pdfParts.push(Buffer.from(headerPdfBuffer));
            await headerPage.close();
            
            // 2. 실제 PDF 파일 내용 추가
            console.log(`[PDF 증빙자료] 헤더 추가: ${tab} - ${pdfDoc.category} - ${pdfDoc.fileName}`);
            
            // PDF 데이터 파싱 및 추가
            let pdfData: Uint8Array;
            if (pdfDoc.fileData.startsWith('data:')) {
              const base64Data = pdfDoc.fileData.split(',')[1];
              pdfData = Buffer.from(base64Data, 'base64');
            } else {
              pdfData = Buffer.from(pdfDoc.fileData, 'base64');
            }
            
            // pdfParts에 PDF 버퍼 추가 (나중에 병합됨)
            pdfParts.push(Buffer.from(pdfData));
            console.log(`[PDF 증빙자료] PDF 내용 추가: ${pdfDoc.fileName} (${pdfData.length} bytes)`);
            
          } catch (err) {
            console.error(`[PDF 증빙자료] PDF 처리 실패 (${pdfDoc.fileName}):`, err);
          }
        }
        
        // 이미 증빙자료 섹션에 추가했으므로 마지막에 다시 추가되지 않도록 배열 비우기
        pdfDocumentsToAppend.length = 0;
      }
    }
    
    if (sections.estimate) {
      const estimateList = await db.select().from(estimates)
        .where(eq(estimates.caseId, caseId))
        .orderBy(estimates.version);
      
      let estimateData: any = null;
      let estimateRowsData: any[] = [];
      
      if (estimateList.length > 0) {
        estimateData = estimateList[estimateList.length - 1];
        estimateRowsData = await db.select().from(estimateRows)
          .where(eq(estimateRows.estimateId, estimateData.id))
          .orderBy(estimateRows.rowOrder);
      }
      
      // Generate recovery area page first (복구면적 산출표)
      if (estimateRowsData.length > 0) {
        const recoveryAreaHtml = await generateRecoveryAreaPage(caseData, estimateRowsData);
        const recoveryPage = await browser.newPage();
        await recoveryPage.setContent(recoveryAreaHtml, { waitUntil: 'networkidle0' });
        const recoveryPdfBuffer = await recoveryPage.pdf({
          format: 'A4',
          printBackground: true,
          margin: { top: '0', right: '0', bottom: '0', left: '0' },
        });
        pdfParts.push(Buffer.from(recoveryPdfBuffer));
        await recoveryPage.close();
      }
      
      // Generate estimate page (노무비/자재비 견적서)
      const estimateHtml = await generateEstimatePage(caseData, estimateData, estimateRowsData, partnerData);
      const page = await browser.newPage();
      await page.setContent(estimateHtml, { waitUntil: 'networkidle0' });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
      });
      pdfParts.push(Buffer.from(pdfBuffer));
      await page.close();
    }
    
    await browser.close();
    browser = null;
    
    const mergedPdf = await PDFDocument.create();
    
    for (const pdfBuffer of pdfParts) {
      try {
        const pdf = await PDFDocument.load(pdfBuffer);
        const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        pages.forEach(page => mergedPdf.addPage(page));
      } catch (err) {
        console.error('PDF 로드 실패:', err);
      }
    }
    
    // 증빙자료 섹션에서 이미 처리되었으므로 여기서는 추가 처리 없음
    // (pdfDocumentsToAppend는 증빙자료 섹션에서 처리 후 비워짐)
    if (pdfDocumentsToAppend.length > 0) {
      console.log(`[PDF 병합] 증빙자료 섹션에서 처리되지 않은 PDF ${pdfDocumentsToAppend.length}개 추가`);
      for (const { doc: pdfDoc, tab } of pdfDocumentsToAppend) {
        try {
          console.log(`[PDF 병합] 처리 중: ${pdfDoc.fileName} (${tab}), 데이터 길이: ${pdfDoc.fileData?.length || 0}`);
          let pdfData: Uint8Array;
          if (pdfDoc.fileData.startsWith('data:')) {
            const base64Data = pdfDoc.fileData.split(',')[1];
            pdfData = Buffer.from(base64Data, 'base64');
          } else {
            pdfData = Buffer.from(pdfDoc.fileData, 'base64');
          }
          
          console.log(`[PDF 병합] 디코딩된 PDF 크기: ${pdfData.length} bytes`);
          const attachedPdf = await PDFDocument.load(pdfData, { ignoreEncryption: true });
          const pageCount = attachedPdf.getPageCount();
          console.log(`[PDF 병합] 첨부 PDF 페이지 수: ${pageCount}`);
          const pages = await mergedPdf.copyPages(attachedPdf, attachedPdf.getPageIndices());
          pages.forEach(page => mergedPdf.addPage(page));
          console.log(`[PDF 병합] 성공: ${pdfDoc.fileName} (${pageCount}페이지 추가)`);
        } catch (err) {
          console.error(`[PDF 병합] 실패 (${pdfDoc.fileName}):`, err);
        }
      }
    }
    
    const finalPdfBytes = await mergedPdf.save();
    return Buffer.from(finalPdfBytes);
    
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

export const pdfGenerationPayloadSchema = {
  caseId: 'string',
  sections: {
    cover: 'boolean',
    fieldReport: 'boolean',
    drawing: 'boolean',
    evidence: 'boolean',
    estimate: 'boolean',
    etc: 'boolean',
  },
  evidence: {
    tab: 'string',
    selectedFileIds: 'string[]',
  },
};

// 10MB 제한을 고려한 PDF 생성 함수 (해상도+품질 단계적 하향)
// 에러로 종료하지 않고, 화질을 더 낮춰서라도 단일 PDF를 반드시 생성
export async function generatePdfWithSizeLimit(payload: PdfGenerationPayload): Promise<Buffer> {
  // 처리 레벨: 1600px/60% → 1400px/50% → 1200px/40% → 1000px/30% 순으로 시도
  const totalLevels = PROCESSING_LEVELS.length;
  
  for (let level = 0; level < totalLevels; level++) {
    const config = PROCESSING_LEVELS[level];
    console.log(`[PDF 생성] 레벨 ${level + 1}/${totalLevels}: ${config.maxDimension}px / ${config.quality}%로 PDF 생성 시도`);
    
    try {
      const pdfBuffer = await generatePdf(payload, level);
      const sizeInMB = pdfBuffer.length / (1024 * 1024);
      
      console.log(`[PDF 생성] PDF 크기: ${sizeInMB.toFixed(2)}MB (제한: ${MAX_PDF_SIZE_BYTES / (1024 * 1024)}MB)`);
      
      if (pdfBuffer.length <= MAX_PDF_SIZE_BYTES) {
        console.log(`[PDF 생성] 레벨 ${level + 1} 성공 - 크기: ${sizeInMB.toFixed(2)}MB`);
        return pdfBuffer;
      }
      
      if (level < totalLevels - 1) {
        const nextConfig = PROCESSING_LEVELS[level + 1];
        console.log(`[PDF 생성] PDF 크기 초과 - 레벨 ${level + 2} (${nextConfig.maxDimension}px/${nextConfig.quality}%)로 재시도`);
      }
    } catch (err: any) {
      console.error(`[PDF 생성] 레벨 ${level + 1} 생성 실패:`, err.message);
      // 다음 레벨로 계속 시도
      if (level < totalLevels - 1) {
        console.log(`[PDF 생성] 다음 레벨로 재시도...`);
        continue;
      }
    }
  }
  
  // 최저 레벨로도 10MB 초과 시 마지막 결과 반환 (에러 없이 반드시 생성)
  const lastLevel = totalLevels - 1;
  const lastConfig = PROCESSING_LEVELS[lastLevel];
  console.warn(`[PDF 생성] 최저 레벨 (${lastConfig.maxDimension}px/${lastConfig.quality}%)로도 10MB 초과 - 마지막 결과 반환`);
  
  try {
    return await generatePdf(payload, lastLevel);
  } catch (err: any) {
    console.error(`[PDF 생성] 최종 생성 실패:`, err.message);
    // 빈 PDF라도 반환 (에러 throw 하지 않음)
    const { PDFDocument } = await import('pdf-lib');
    const emptyPdf = await PDFDocument.create();
    emptyPdf.addPage();
    return Buffer.from(await emptyPdf.save());
  }
}
