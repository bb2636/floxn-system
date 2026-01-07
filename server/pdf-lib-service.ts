import { PDFDocument, PDFPage, PDFFont, rgb, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { db } from './db';
import { cases, caseDocuments, drawings, estimates, estimateRows, users } from '@shared/schema';
import { eq, and, inArray, ilike, sql } from 'drizzle-orm';

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const MARGIN = 40;
const CONTENT_WIDTH = A4_WIDTH - (MARGIN * 2);

const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024;

interface ImageProcessingConfig {
  maxDimension: number;
  quality: number;
}

const PROCESSING_LEVELS: ImageProcessingConfig[] = [
  { maxDimension: 1600, quality: 60 },
  { maxDimension: 1400, quality: 50 },
  { maxDimension: 1200, quality: 40 },
  { maxDimension: 1000, quality: 30 },
  { maxDimension: 800, quality: 25 },
  { maxDimension: 700, quality: 20 },
];

const SUPPORTED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.heic', '.heif', '.webp'];
const UNSUPPORTED_EXTENSIONS = ['.mov', '.mp4', '.avi', '.tiff', '.raw'];

interface FontSet {
  regular: PDFFont;
  bold: PDFFont;
}

let cachedFonts: { regular: Buffer; bold: Buffer } | null = null;

function loadFontBytes(): { regular: Buffer; bold: Buffer } {
  if (cachedFonts) return cachedFonts;
  
  const fontsDir = path.join(process.cwd(), 'server/fonts');
  
  // Use Pretendard (2.6MB - much smaller than NotoSansKR 16MB)
  const regularTtf = path.join(fontsDir, 'Pretendard-Regular.ttf');
  const boldTtf = path.join(fontsDir, 'Pretendard-SemiBold.ttf');
  
  let regular: Buffer | null = null;
  let bold: Buffer | null = null;
  
  try {
    if (fs.existsSync(regularTtf)) {
      regular = fs.readFileSync(regularTtf);
      console.log(`[pdf-lib] Pretendard-Regular.ttf 로드 완료 (${Math.round(regular.length / 1024 / 1024 * 10) / 10}MB)`);
    }
  } catch (err) {
    console.error('[pdf-lib] Pretendard-Regular.ttf 로드 실패:', err);
  }
  
  try {
    if (fs.existsSync(boldTtf)) {
      bold = fs.readFileSync(boldTtf);
      console.log(`[pdf-lib] Pretendard-SemiBold.ttf 로드 완료`);
    }
  } catch (err) {
    console.error('[pdf-lib] Pretendard-SemiBold.ttf 로드 실패:', err);
  }
  
  if (!regular || !bold) {
    throw new Error('한글 폰트를 로드할 수 없습니다. server/fonts 디렉토리에 Pretendard-Regular.ttf 파일이 있는지 확인하세요.');
  }
  
  cachedFonts = { regular, bold };
  return cachedFonts;
}

async function embedFonts(pdfDoc: PDFDocument): Promise<FontSet> {
  pdfDoc.registerFontkit(fontkit);
  
  const fontBytes = loadFontBytes();
  
  // subset: false로 전체 폰트 임베딩 (한글 글자 누락 방지)
  const regular = await pdfDoc.embedFont(fontBytes.regular, { subset: false });
  const bold = await pdfDoc.embedFont(fontBytes.bold, { subset: false });
  
  return { regular, bold };
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

interface DrawTextOptions {
  x: number;
  y: number;
  text: string;
  font: PDFFont;
  size?: number;
  color?: { r: number; g: number; b: number };
  maxWidth?: number;
  lineHeight?: number;
  align?: 'left' | 'center' | 'right';
}

function measureTextWidth(text: string, font: PDFFont, size: number): number {
  try {
    return font.widthOfTextAtSize(text, size);
  } catch {
    return text.length * size * 0.5;
  }
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  const paragraphs = text.split('\n');
  
  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      lines.push('');
      continue;
    }
    
    let currentLine = '';
    const chars = paragraph.split('');
    
    for (const char of chars) {
      const testLine = currentLine + char;
      const width = measureTextWidth(testLine, font, size);
      
      if (width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = char;
      } else {
        currentLine = testLine;
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }
  }
  
  return lines;
}

function drawText(page: PDFPage, options: DrawTextOptions): number {
  const { x, y, text, font, size = 10, color = { r: 0, g: 0, b: 0 }, maxWidth, lineHeight = 1.4, align = 'left' } = options;
  
  if (!text) return y;
  
  let lines: string[];
  if (maxWidth) {
    lines = wrapText(text, font, size, maxWidth);
  } else {
    lines = text.split('\n');
  }
  
  let currentY = y;
  const actualLineHeight = size * lineHeight;
  
  for (const line of lines) {
    let drawX = x;
    
    if (align === 'center' && maxWidth) {
      const textWidth = measureTextWidth(line, font, size);
      drawX = x + (maxWidth - textWidth) / 2;
    } else if (align === 'right' && maxWidth) {
      const textWidth = measureTextWidth(line, font, size);
      drawX = x + maxWidth - textWidth;
    }
    
    try {
      page.drawText(line, {
        x: drawX,
        y: currentY,
        size,
        font,
        color: rgb(color.r, color.g, color.b),
      });
    } catch (e) {
      console.warn(`[pdf-lib] Failed to draw text: "${line.substring(0, 20)}..."`);
    }
    
    currentY -= actualLineHeight;
  }
  
  return currentY;
}

interface TableCell {
  text: string;
  width: number;
  align?: 'left' | 'center' | 'right';
  isHeader?: boolean;
  rowSpan?: number;
  colSpan?: number;
}

interface DrawTableOptions {
  x: number;
  y: number;
  rows: TableCell[][];
  fonts: FontSet;
  fontSize?: number;
  headerBgColor?: { r: number; g: number; b: number };
  rowHeight?: number;
  borderWidth?: number;
}

function drawTable(page: PDFPage, options: DrawTableOptions): number {
  const {
    x, y, rows, fonts, fontSize = 9,
    headerBgColor = { r: 0.94, g: 0.94, b: 0.94 },
    rowHeight = 22, borderWidth = 0.5
  } = options;
  
  let currentY = y;
  
  for (const row of rows) {
    let cellX = x;
    const isHeaderRow = row.some(cell => cell.isHeader);
    
    for (const cell of row) {
      if (cell.isHeader) {
        page.drawRectangle({
          x: cellX,
          y: currentY - rowHeight,
          width: cell.width,
          height: rowHeight,
          color: rgb(headerBgColor.r, headerBgColor.g, headerBgColor.b),
        });
      }
      
      page.drawRectangle({
        x: cellX,
        y: currentY - rowHeight,
        width: cell.width,
        height: rowHeight,
        borderColor: rgb(0.3, 0.3, 0.3),
        borderWidth,
      });
      
      const font = cell.isHeader ? fonts.bold : fonts.regular;
      const textY = currentY - rowHeight / 2 - fontSize / 3;
      const padding = 4;
      
      let textX = cellX + padding;
      if (cell.align === 'center') {
        const textWidth = measureTextWidth(cell.text, font, fontSize);
        textX = cellX + (cell.width - textWidth) / 2;
      } else if (cell.align === 'right') {
        const textWidth = measureTextWidth(cell.text, font, fontSize);
        textX = cellX + cell.width - textWidth - padding;
      }
      
      try {
        page.drawText(cell.text || '', {
          x: textX,
          y: textY,
          size: fontSize,
          font,
          color: rgb(0, 0, 0),
        });
      } catch (e) {
        console.warn(`[pdf-lib] Table cell text failed: "${cell.text?.substring(0, 10)}..."`);
      }
      
      cellX += cell.width;
    }
    
    currentY -= rowHeight;
  }
  
  return currentY;
}

async function normalizeImage(
  base64Data: string,
  config: ImageProcessingConfig = PROCESSING_LEVELS[0]
): Promise<{ success: boolean; data?: Buffer; error?: string }> {
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
    
    const image = sharp(imageBuffer, { failOnError: false });
    
    const processedImage = image.resize(maxDimension, maxDimension, {
      fit: 'inside',
      withoutEnlargement: true
    });
    
    const compressedBuffer = await processedImage
      .jpeg({ quality, mozjpeg: true, force: true })
      .toBuffer();
    
    return { success: true, data: compressedBuffer };
  } catch (error: any) {
    return { success: false, error: error.message || '이미지 처리 오류' };
  }
}

async function embedImage(
  pdfDoc: PDFDocument,
  page: PDFPage,
  imageData: string,
  x: number,
  y: number,
  maxWidth: number,
  maxHeight: number,
  config: ImageProcessingConfig
): Promise<{ success: boolean; error?: string }> {
  try {
    const normalized = await normalizeImage(imageData, config);
    
    if (!normalized.success || !normalized.data) {
      return { success: false, error: normalized.error || '이미지 처리 실패' };
    }
    
    let embeddedImage;
    try {
      embeddedImage = await pdfDoc.embedJpg(normalized.data);
    } catch {
      try {
        embeddedImage = await pdfDoc.embedPng(normalized.data);
      } catch {
        return { success: false, error: '이미지 포맷 처리 불가' };
      }
    }
    
    const imgWidth = embeddedImage.width;
    const imgHeight = embeddedImage.height;
    const aspectRatio = imgWidth / imgHeight;
    
    let drawWidth = maxWidth;
    let drawHeight = drawWidth / aspectRatio;
    
    if (drawHeight > maxHeight) {
      drawHeight = maxHeight;
      drawWidth = drawHeight * aspectRatio;
    }
    
    const drawX = x + (maxWidth - drawWidth) / 2;
    const drawY = y + (maxHeight - drawHeight) / 2;
    
    page.drawImage(embeddedImage, {
      x: drawX,
      y: drawY,
      width: drawWidth,
      height: drawHeight,
    });
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || '이미지 임베딩 실패' };
  }
}

function drawErrorSection(
  page: PDFPage,
  fonts: FontSet,
  x: number,
  y: number,
  width: number,
  height: number,
  title: string,
  message: string
): void {
  page.drawRectangle({
    x,
    y,
    width,
    height,
    color: rgb(0.99, 0.95, 0.95),
    borderColor: rgb(0.8, 0.2, 0.2),
    borderWidth: 1,
  });
  
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  
  drawText(page, {
    x: centerX - 30,
    y: centerY + 20,
    text: '⚠ 오류',
    font: fonts.bold,
    size: 14,
    color: { r: 0.6, g: 0.1, b: 0.1 },
  });
  
  drawText(page, {
    x: x + 10,
    y: centerY - 10,
    text: title,
    font: fonts.bold,
    size: 10,
    maxWidth: width - 20,
    align: 'center',
  });
  
  drawText(page, {
    x: x + 10,
    y: centerY - 30,
    text: message,
    font: fonts.regular,
    size: 9,
    color: { r: 0.4, g: 0.4, b: 0.4 },
    maxWidth: width - 20,
    align: 'center',
  });
}

async function renderCoverPage(
  pdfDoc: PDFDocument,
  fonts: FontSet,
  caseData: any,
  partnerData: any
): Promise<void> {
  const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
  let y = A4_HEIGHT - MARGIN;
  
  // Title: 현장출동확인서
  drawText(page, {
    x: MARGIN,
    y: y - 30,
    text: '현장출동확인서',
    font: fonts.bold,
    size: 24,
    maxWidth: CONTENT_WIDTH,
    align: 'center',
  });
  
  y -= 90;
  
  // 수 신 line with underline
  const recipientName = caseData.insuranceCompany || '-';
  drawText(page, {
    x: MARGIN,
    y,
    text: '수 신',
    font: fonts.bold,
    size: 12,
  });
  
  drawText(page, {
    x: MARGIN + 60,
    y,
    text: recipientName,
    font: fonts.regular,
    size: 12,
  });
  
  // Underline under recipient name
  const recipientWidth = recipientName.length * 8;
  page.drawLine({
    start: { x: MARGIN + 60, y: y - 4 },
    end: { x: MARGIN + 60 + Math.max(recipientWidth, 150), y: y - 4 },
    thickness: 0.5,
    color: rgb(0.3, 0.3, 0.3),
  });
  
  drawText(page, {
    x: A4_WIDTH - MARGIN - 30,
    y,
    text: '귀하',
    font: fonts.regular,
    size: 12,
  });
  
  y -= 40;
  
  const fullAddress = [caseData.insuredAddress, caseData.insuredAddressDetail]
    .filter(Boolean).join(' ');
  
  const dispatchDateTime = [caseData.visitDate, caseData.visitTime]
    .filter(Boolean).join(' ');
  
  // Main info table
  const tableRows: TableCell[][] = [
    [
      { text: '사고접수번호', width: 100, isHeader: true, align: 'center' },
      { text: caseData.insuranceAccidentNo || '-', width: 150, align: 'left' },
      { text: '피보험자명', width: 100, isHeader: true, align: 'center' },
      { text: caseData.insuredName || caseData.victimName || '-', width: 165, align: 'left' },
    ],
    [
      { text: '출동담당자', width: 100, isHeader: true, align: 'center' },
      { text: caseData.assignedPartnerManager || partnerData?.name || '-', width: 150, align: 'left' },
      { text: '협력업체', width: 100, isHeader: true, align: 'center' },
      { text: caseData.assignedPartner || '-', width: 165, align: 'left' },
    ],
    [
      { text: '주소', width: 100, isHeader: true, align: 'center' },
      { text: fullAddress || '-', width: 415, align: 'left' },
    ],
    [
      { text: '출동일시', width: 100, isHeader: true, align: 'center' },
      { text: dispatchDateTime || '-', width: 415, align: 'left' },
    ],
  ];
  
  y = drawTable(page, {
    x: MARGIN,
    y,
    rows: tableRows,
    fonts,
    fontSize: 10,
    rowHeight: 28,
  });
  
  y -= 40;
  
  // Body text - two lines
  drawText(page, {
    x: MARGIN,
    y,
    text: '상기 건에 대하여 현장 출동 조사를 실시하였으며,',
    font: fonts.regular,
    size: 11,
  });
  
  y -= 22;
  
  drawText(page, {
    x: MARGIN,
    y,
    text: '조사 결과를 별첨 보고서와 같이 제출합니다.',
    font: fonts.regular,
    size: 11,
  });
  
  y -= 50;
  
  // Confirmation text (bold, centered)
  drawText(page, {
    x: MARGIN,
    y,
    text: '위 내용이 사실과 다름없음을 확인합니다.',
    font: fonts.bold,
    size: 12,
    maxWidth: CONTENT_WIDTH,
    align: 'center',
  });
  
  y -= 50;
  
  // Date (centered)
  const now = new Date();
  const dateStr = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일`;
  drawText(page, {
    x: MARGIN,
    y,
    text: dateStr,
    font: fonts.regular,
    size: 13,
    maxWidth: CONTENT_WIDTH,
    align: 'center',
  });
  
  y -= 70;
  
  // Company info (right-aligned label: value format)
  const infoX = A4_WIDTH / 2 + 30;
  const labelWidth = 70;
  const valueX = infoX + labelWidth + 20;
  
  drawText(page, {
    x: infoX,
    y,
    text: '회 사 명 :',
    font: fonts.bold,
    size: 11,
  });
  drawText(page, {
    x: valueX,
    y,
    text: caseData.assignedPartner || '-',
    font: fonts.regular,
    size: 11,
  });
  
  y -= 25;
  
  drawText(page, {
    x: infoX,
    y,
    text: '담 당 자 :',
    font: fonts.bold,
    size: 11,
  });
  drawText(page, {
    x: valueX,
    y,
    text: caseData.assignedPartnerManager || partnerData?.name || '-',
    font: fonts.regular,
    size: 11,
  });
  
  y -= 25;
  
  drawText(page, {
    x: infoX,
    y,
    text: '연 락 처 :',
    font: fonts.bold,
    size: 11,
  });
  drawText(page, {
    x: valueX,
    y,
    text: caseData.assignedPartnerContact || partnerData?.phone || '-',
    font: fonts.regular,
    size: 11,
  });
  
  // FLOXN logo at bottom center (using image file)
  const logoY = MARGIN + 20;
  const centerX = A4_WIDTH / 2;
  
  try {
    const logoPath = path.join(process.cwd(), 'server/assets/floxn-logo.png');
    if (fs.existsSync(logoPath)) {
      const logoData = fs.readFileSync(logoPath);
      const logoImage = await pdfDoc.embedPng(logoData);
      const logoDims = logoImage.scale(1);
      
      // Scale logo to fit nicely (max width ~120px)
      const maxLogoWidth = 120;
      const logoScale = Math.min(maxLogoWidth / logoDims.width, 1);
      const drawLogoWidth = logoDims.width * logoScale;
      const drawLogoHeight = logoDims.height * logoScale;
      
      page.drawImage(logoImage, {
        x: centerX - drawLogoWidth / 2,
        y: logoY,
        width: drawLogoWidth,
        height: drawLogoHeight,
      });
    }
  } catch (err) {
    console.error('[pdf-lib] 로고 이미지 로드 실패:', err);
  }
}

async function renderFieldReportPage(
  pdfDoc: PDFDocument,
  fonts: FontSet,
  caseData: any,
  partnerData: any,
  repairItems: any[]
): Promise<void> {
  const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
  let y = A4_HEIGHT - MARGIN;
  
  // Title: 출동확인서 (centered)
  drawText(page, {
    x: MARGIN,
    y: y - 25,
    text: '출동확인서',
    font: fonts.bold,
    size: 20,
    maxWidth: CONTENT_WIDTH,
    align: 'center',
  });
  
  y -= 55;
  
  const insuredFullAddress = [caseData.insuredAddress, caseData.insuredAddressDetail]
    .filter(Boolean).join(' ');
  
  const visitDateTime = [caseData.visitDate, caseData.visitTime]
    .filter(Boolean).join(' ');
  
  const accidentDateTime = [caseData.accidentDate, caseData.accidentTime]
    .filter(Boolean).join(' ');
  
  // Helper function to draw section header with grey background
  const drawSectionHeader = (title: string, currentY: number): number => {
    const headerHeight = 22;
    page.drawRectangle({
      x: MARGIN,
      y: currentY - headerHeight,
      width: CONTENT_WIDTH,
      height: headerHeight,
      color: rgb(0.85, 0.85, 0.85),
    });
    
    drawText(page, {
      x: MARGIN + 8,
      y: currentY - 15,
      text: title,
      font: fonts.bold,
      size: 10,
    });
    
    return currentY - headerHeight - 5;
  };
  
  // Section 1: 현장정보
  y = drawSectionHeader('현장정보', y);
  
  const fieldInfoRows: TableCell[][] = [
    [
      { text: '방문일시', width: 90, isHeader: true, align: 'center' },
      { text: visitDateTime || '-', width: 168, align: 'left' },
      { text: '출동 담당자', width: 90, isHeader: true, align: 'center' },
      { text: caseData.assignedPartnerManager || partnerData?.name || '-', width: 167, align: 'left' },
    ],
    [
      { text: '출동 담당지', width: 90, isHeader: true, align: 'center' },
      { text: caseData.dispatchLocation || '-', width: 168, align: 'left' },
      { text: '협력업체', width: 90, isHeader: true, align: 'center' },
      { text: caseData.assignedPartner || '-', width: 167, align: 'left' },
    ],
    [
      { text: '피보험자 주소', width: 90, isHeader: true, align: 'center' },
      { text: insuredFullAddress || '-', width: 425, align: 'left' },
    ],
  ];
  
  y = drawTable(page, {
    x: MARGIN,
    y,
    rows: fieldInfoRows,
    fonts,
    fontSize: 9,
    rowHeight: 24,
  });
  
  y -= 15;
  
  // Section 2: 사고 원인(+수리항목)
  y = drawSectionHeader('사고 원인(+수리항목)', y);
  
  const accidentInfoRows: TableCell[][] = [
    [
      { text: '사고 발생일시', width: 90, isHeader: true, align: 'center' },
      { text: accidentDateTime || '-', width: 168, align: 'left' },
      { text: '누수유형', width: 90, isHeader: true, align: 'center' },
      { text: caseData.leakType || caseData.accidentCategory || '-', width: 167, align: 'left' },
    ],
    [
      { text: '사고원인', width: 90, isHeader: true, align: 'center' },
      { text: caseData.accidentCause || '-', width: 425, align: 'left' },
    ],
  ];
  
  y = drawTable(page, {
    x: MARGIN,
    y,
    rows: accidentInfoRows,
    fonts,
    fontSize: 9,
    rowHeight: 24,
  });
  
  y -= 15;
  
  // Section 3: 특이사항 및 요청사항 (VOC) - 현장 특이사항 섹션 제거됨
  y = drawSectionHeader('특이사항 및 요청사항 (VOC)', y);
  
  // VOC는 협력사가 현장입력시 작성한 specialNotes 필드 사용
  const vocText = caseData.specialNotes || '-';
  
  page.drawRectangle({
    x: MARGIN,
    y: y - 45,
    width: CONTENT_WIDTH,
    height: 50,
    borderColor: rgb(0.7, 0.7, 0.7),
    borderWidth: 0.5,
  });
  
  drawText(page, {
    x: MARGIN + 8,
    y: y - 12,
    text: vocText,
    font: fonts.regular,
    size: 9,
    maxWidth: CONTENT_WIDTH - 16,
  });
  
  y -= 60;
  
  // Section 5: 피해 복구방식 및 처리 유형
  y = drawSectionHeader('피해 복구방식 및 처리 유형', y);
  
  const victimFullAddress = [caseData.victimAddress, caseData.victimAddressDetail]
    .filter(Boolean).join(' ') || insuredFullAddress;
  
  // 처리유형 파싱 (JSON 배열)
  let processingTypesStr = '-';
  try {
    if (caseData.processingTypes) {
      const types = typeof caseData.processingTypes === 'string' 
        ? JSON.parse(caseData.processingTypes) 
        : caseData.processingTypes;
      if (Array.isArray(types) && types.length > 0) {
        processingTypesStr = types.join(', ');
        if (caseData.processingTypeOther) {
          processingTypesStr += ` (${caseData.processingTypeOther})`;
        }
      }
    }
  } catch (e) {
    processingTypesStr = caseData.processingTypes?.toString() || '-';
  }
  
  const recoveryInfoRows: TableCell[][] = [
    [
      { text: '피해자명', width: 90, isHeader: true, align: 'center' },
      { text: caseData.victimName || '-', width: 168, align: 'left' },
      { text: '피해자 연락처', width: 90, isHeader: true, align: 'center' },
      { text: caseData.victimContact || caseData.victimPhone || '-', width: 167, align: 'left' },
    ],
    [
      { text: '피해주소', width: 90, isHeader: true, align: 'center' },
      { text: victimFullAddress || '-', width: 425, align: 'left' },
    ],
    [
      { text: '처리유형', width: 90, isHeader: true, align: 'center' },
      { text: processingTypesStr, width: 425, align: 'left' },
    ],
    [
      { text: '복구방식', width: 90, isHeader: true, align: 'center' },
      { text: caseData.recoveryMethodType || caseData.restorationMethod || caseData.recoveryMethod || '-', width: 425, align: 'left' },
    ],
  ];
  
  y = drawTable(page, {
    x: MARGIN,
    y,
    rows: recoveryInfoRows,
    fonts,
    fontSize: 9,
    rowHeight: 24,
  });
  
  // Footer: 작성일 and 작성자
  const footerY = MARGIN + 20;
  const now = new Date();
  const dateStr = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일`;
  
  drawText(page, {
    x: MARGIN,
    y: footerY,
    text: `작성일: ${dateStr}`,
    font: fonts.regular,
    size: 9,
  });
  
  const partnerName = caseData.assignedPartner || '-';
  const managerName = caseData.assignedPartnerManager || partnerData?.name || '-';
  
  drawText(page, {
    x: A4_WIDTH - MARGIN - 180,
    y: footerY,
    text: `작성자: ${managerName} (${partnerName})`,
    font: fonts.regular,
    size: 9,
  });
}

async function renderDrawingPage(
  pdfDoc: PDFDocument,
  fonts: FontSet,
  caseData: any,
  drawingData: any
): Promise<void> {
  const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
  let y = A4_HEIGHT - MARGIN;
  
  // Header: 현장 피해상황 도면 with gray background
  const headerHeight = 35;
  page.drawRectangle({
    x: MARGIN,
    y: y - headerHeight,
    width: CONTENT_WIDTH,
    height: headerHeight,
    color: rgb(0.92, 0.92, 0.92),
    borderColor: rgb(0.7, 0.7, 0.7),
    borderWidth: 0.5,
  });
  
  drawText(page, {
    x: MARGIN + 15,
    y: y - 25,
    text: '현장 피해상황 도면',
    font: fonts.bold,
    size: 14,
  });
  
  // 접수번호 on the right
  const accidentNo = caseData.insuranceAccidentNo || caseData.caseNumber || '-';
  drawText(page, {
    x: A4_WIDTH - MARGIN - 150,
    y: y - 25,
    text: `접수번호: ${accidentNo}`,
    font: fonts.regular,
    size: 10,
  });
  
  y -= headerHeight + 15;
  
  // Info line: 고객사, 피보험자, 주소
  const insuranceCompany = caseData.insuranceCompany || '-';
  const insuredName = caseData.insuredName || caseData.victimName || '-';
  const fullAddress = [caseData.insuredAddress, caseData.insuredAddressDetail]
    .filter(Boolean).join(' ') || '-';
  
  drawText(page, {
    x: MARGIN,
    y,
    text: `고객사: ${insuranceCompany}     피보험자: ${insuredName}     주소: ${fullAddress}`,
    font: fonts.regular,
    size: 9,
  });
  
  y -= 30;
  
  // Drawing area - large box for the drawing image
  const drawingAreaHeight = A4_HEIGHT - MARGIN * 2 - headerHeight - 80;
  const drawingAreaWidth = CONTENT_WIDTH;
  
  page.drawRectangle({
    x: MARGIN,
    y: y - drawingAreaHeight,
    width: drawingAreaWidth,
    height: drawingAreaHeight,
    borderColor: rgb(0.7, 0.7, 0.7),
    borderWidth: 0.5,
  });
  
  // Try to embed drawing image if available
  // 우선순위: canvasImage (전체 캔버스 스냅샷) > uploadedImages (개별 이미지)
  console.log('[pdf-lib] ===== 도면 섹션 생성 시작 =====');
  console.log('[pdf-lib] 도면 데이터 존재 여부:', !!drawingData);
  if (drawingData) {
    console.log('[pdf-lib] 도면 상세:', JSON.stringify({
      id: drawingData.id,
      caseId: drawingData.caseId,
      hasCanvasImage: !!(drawingData as any).canvasImage,
      canvasImageLength: (drawingData as any).canvasImage?.length || 0,
      uploadedImagesCount: Array.isArray(drawingData.uploadedImages) ? drawingData.uploadedImages.length : 'not array',
      rectanglesCount: Array.isArray(drawingData.rectangles) ? drawingData.rectangles.length : 'not array',
    }));
  }
  
  // 안전하게 canvasImage 접근 (DB 컬럼이 없을 수 있음)
  const canvasImage = drawingData ? (drawingData as any).canvasImage : null;
  
  // 캔버스 이미지가 있으면 우선 사용 (전체 도면 스냅샷)
  if (drawingData && canvasImage) {
    console.log('[pdf-lib] 분기: canvasImage 사용 (캔버스 스냅샷)');
    try {
      let imageData: Buffer;
      
      if (canvasImage.startsWith('data:image/')) {
        const base64Data = canvasImage.split(',')[1];
        imageData = Buffer.from(base64Data, 'base64');
      } else {
        imageData = Buffer.from(canvasImage, 'base64');
      }
      
      // PNG 이미지 (html2canvas는 PNG로 출력)
      const embeddedImage = await pdfDoc.embedPng(imageData);
      
      const imgDims = embeddedImage.scale(1);
      const maxWidth = drawingAreaWidth - 10;  // 패딩 축소
      const maxHeight = drawingAreaHeight - 10;  // 패딩 축소
      
      const scaleX = maxWidth / imgDims.width;
      const scaleY = maxHeight / imgDims.height;
      const scale = Math.min(scaleX, scaleY);  // 스케일 제한 제거 - 영역에 맞게 확대
      
      const drawWidth = imgDims.width * scale;
      const drawHeight = imgDims.height * scale;
      
      const drawX = MARGIN + (drawingAreaWidth - drawWidth) / 2;
      const drawY = (y - drawingAreaHeight) + (drawingAreaHeight - drawHeight) / 2;
      
      page.drawImage(embeddedImage, {
        x: drawX,
        y: drawY,
        width: drawWidth,
        height: drawHeight,
      });
      
      console.log('[pdf-lib] 캔버스 도면 이미지 삽입 완료');
    } catch (err) {
      console.error('[pdf-lib] 캔버스 도면 이미지 삽입 실패:', err);
      // 실패 시 placeholder 표시
      drawText(page, {
        x: MARGIN + drawingAreaWidth / 2 - 50,
        y: y - drawingAreaHeight / 2,
        text: '도면 이미지 로드 실패',
        font: fonts.regular,
        size: 12,
        color: { r: 0.6, g: 0.6, b: 0.6 },
      });
    }
  } else if (drawingData && drawingData.uploadedImages && drawingData.uploadedImages.length > 0) {
    // canvasImage가 없으면 기존 방식으로 첫 번째 업로드 이미지 사용
    console.log('[pdf-lib] 분기: uploadedImages 사용 (첫 번째 업로드 이미지)');
    try {
      const mainImage = drawingData.uploadedImages[0];
      if (mainImage.src) {
        let imageData: Buffer;
        
        if (mainImage.src.startsWith('data:image/')) {
          const base64Data = mainImage.src.split(',')[1];
          imageData = Buffer.from(base64Data, 'base64');
        } else {
          imageData = Buffer.from(mainImage.src, 'base64');
        }
        
        // Determine image type and embed
        let embeddedImage;
        const srcLower = mainImage.src.toLowerCase();
        if (srcLower.includes('image/png') || srcLower.includes('.png')) {
          embeddedImage = await pdfDoc.embedPng(imageData);
        } else {
          // Convert to JPEG using sharp if needed
          const processedBuffer = await sharp(imageData)
            .jpeg({ quality: 85 })
            .toBuffer();
          embeddedImage = await pdfDoc.embedJpg(processedBuffer);
        }
        
        const imgDims = embeddedImage.scale(1);
        const maxWidth = drawingAreaWidth - 10;  // 패딩 축소
        const maxHeight = drawingAreaHeight - 10;  // 패딩 축소
        
        const scaleX = maxWidth / imgDims.width;
        const scaleY = maxHeight / imgDims.height;
        const scale = Math.min(scaleX, scaleY);  // 스케일 제한 제거 - 영역에 맞게 확대
        
        const drawWidth = imgDims.width * scale;
        const drawHeight = imgDims.height * scale;
        
        const drawX = MARGIN + (drawingAreaWidth - drawWidth) / 2;
        const drawY = (y - drawingAreaHeight) + (drawingAreaHeight - drawHeight) / 2;
        
        page.drawImage(embeddedImage, {
          x: drawX,
          y: drawY,
          width: drawWidth,
          height: drawHeight,
        });
        
        console.log('[pdf-lib] 도면 이미지 삽입 완료 (업로드 이미지)');
      }
    } catch (err) {
      console.error('[pdf-lib] 도면 이미지 삽입 실패:', err);
      drawText(page, {
        x: MARGIN + drawingAreaWidth / 2 - 50,
        y: y - drawingAreaHeight / 2,
        text: '도면 이미지 로드 실패',
        font: fonts.regular,
        size: 12,
        color: { r: 0.6, g: 0.6, b: 0.6 },
      });
    }
  } else {
    // No drawing data - show placeholder
    console.log('[pdf-lib] 분기: 도면 없음 (등록된 도면이 없습니다 표시)');
    drawText(page, {
      x: MARGIN + drawingAreaWidth / 2 - 60,
      y: y - drawingAreaHeight / 2,
      text: '등록된 도면이 없습니다',
      font: fonts.regular,
      size: 12,
      color: { r: 0.6, g: 0.6, b: 0.6 },
    });
  }
  console.log('[pdf-lib] ===== 도면 섹션 생성 완료 =====');
  
  // Footer
  const footerY = MARGIN + 15;
  const now = new Date();
  const dateStr = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일`;
  
  drawText(page, {
    x: MARGIN,
    y: footerY,
    text: `작성일: ${dateStr} | 사고접수번호: ${accidentNo}`,
    font: fonts.regular,
    size: 9,
  });
}

async function renderEvidencePages(
  pdfDoc: PDFDocument,
  fonts: FontSet,
  caseData: any,
  documents: any[],
  processingConfig: ImageProcessingConfig
): Promise<{ errors: Array<{ fileName: string; reason: string }> }> {
  const errors: Array<{ fileName: string; reason: string }> = [];
  
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
  
  const imageDocs: Array<{ doc: any; tab: string }> = [];
  
  for (const doc of documents) {
    const isImage = doc.fileType?.startsWith('image/');
    const hasValidData = doc.fileData && doc.fileData.length > 100;
    
    if (isImage && hasValidData) {
      const tab = categoryToTab[doc.category] || '기타';
      imageDocs.push({ doc, tab });
    } else if (isImage && !hasValidData) {
      errors.push({ fileName: doc.fileName, reason: '이미지 데이터 없음' });
    }
  }
  
  if (imageDocs.length === 0) {
    return { errors };
  }
  
  const imageHeight = 340;
  const imageWidth = CONTENT_WIDTH;
  const headerHeight = 30;
  const spacing = 15;
  
  for (let i = 0; i < imageDocs.length; i += 2) {
    const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
    
    page.drawRectangle({
      x: MARGIN,
      y: A4_HEIGHT - MARGIN - 30,
      width: CONTENT_WIDTH,
      height: 30,
      color: rgb(0.2, 0.2, 0.2),
    });
    
    drawText(page, {
      x: MARGIN + 10,
      y: A4_HEIGHT - MARGIN - 22,
      text: '증빙자료',
      font: fonts.bold,
      size: 12,
      color: { r: 1, g: 1, b: 1 },
    });
    
    const accidentNo = caseData.insuranceAccidentNo || caseData.caseNumber || '';
    drawText(page, {
      x: A4_WIDTH - MARGIN - 150,
      y: A4_HEIGHT - MARGIN - 22,
      text: `접수번호: ${accidentNo}`,
      font: fonts.regular,
      size: 9,
      color: { r: 1, g: 1, b: 1 },
    });
    
    const firstImage = imageDocs[i];
    const footerHeight = 25;
    const firstY = A4_HEIGHT - MARGIN - 30 - spacing - headerHeight - imageHeight - footerHeight;
    
    // Category header for first image
    page.drawRectangle({
      x: MARGIN,
      y: firstY + imageHeight + footerHeight,
      width: CONTENT_WIDTH,
      height: headerHeight,
      color: rgb(0.96, 0.96, 0.96),
      borderColor: rgb(0.8, 0.8, 0.8),
      borderWidth: 0.5,
    });
    
    drawText(page, {
      x: MARGIN + 10,
      y: firstY + imageHeight + footerHeight + 8,
      text: `${firstImage.tab} - ${firstImage.doc.category || ''}`,
      font: fonts.regular,
      size: 9,
    });
    
    // Image area for first image
    page.drawRectangle({
      x: MARGIN,
      y: firstY + footerHeight,
      width: CONTENT_WIDTH,
      height: imageHeight,
      borderColor: rgb(0.8, 0.8, 0.8),
      borderWidth: 0.5,
    });
    
    const firstResult = await embedImage(
      pdfDoc, page, firstImage.doc.fileData,
      MARGIN + 5, firstY + footerHeight + 5, imageWidth - 10, imageHeight - 10,
      processingConfig
    );
    
    if (!firstResult.success) {
      drawErrorSection(page, fonts, MARGIN + 5, firstY + footerHeight + 5, imageWidth - 10, imageHeight - 10,
        firstImage.doc.fileName, firstResult.error || '첨부 실패');
      errors.push({ fileName: firstImage.doc.fileName, reason: firstResult.error || '첨부 실패' });
    }
    
    // Footer with filename and upload date for first image
    const firstUploadDate = firstImage.doc.createdAt 
      ? new Date(firstImage.doc.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'numeric', day: 'numeric' })
      : '-';
    
    drawText(page, {
      x: MARGIN + 5,
      y: firstY + 8,
      text: firstImage.doc.fileName || '',
      font: fonts.regular,
      size: 8,
      color: { r: 0.3, g: 0.3, b: 0.3 },
    });
    
    drawText(page, {
      x: A4_WIDTH - MARGIN - 100,
      y: firstY + 8,
      text: `업로드: ${firstUploadDate}`,
      font: fonts.regular,
      size: 8,
      color: { r: 0.3, g: 0.3, b: 0.3 },
    });
    
    if (imageDocs[i + 1]) {
      const secondImage = imageDocs[i + 1];
      const secondY = firstY - spacing - headerHeight - imageHeight - footerHeight;
      
      // Category header for second image
      page.drawRectangle({
        x: MARGIN,
        y: secondY + imageHeight + footerHeight,
        width: CONTENT_WIDTH,
        height: headerHeight,
        color: rgb(0.96, 0.96, 0.96),
        borderColor: rgb(0.8, 0.8, 0.8),
        borderWidth: 0.5,
      });
      
      drawText(page, {
        x: MARGIN + 10,
        y: secondY + imageHeight + footerHeight + 8,
        text: `${secondImage.tab} - ${secondImage.doc.category || ''}`,
        font: fonts.regular,
        size: 9,
      });
      
      // Image area for second image
      page.drawRectangle({
        x: MARGIN,
        y: secondY + footerHeight,
        width: CONTENT_WIDTH,
        height: imageHeight,
        borderColor: rgb(0.8, 0.8, 0.8),
        borderWidth: 0.5,
      });
      
      const secondResult = await embedImage(
        pdfDoc, page, secondImage.doc.fileData,
        MARGIN + 5, secondY + footerHeight + 5, imageWidth - 10, imageHeight - 10,
        processingConfig
      );
      
      if (!secondResult.success) {
        drawErrorSection(page, fonts, MARGIN + 5, secondY + footerHeight + 5, imageWidth - 10, imageHeight - 10,
          secondImage.doc.fileName, secondResult.error || '첨부 실패');
        errors.push({ fileName: secondImage.doc.fileName, reason: secondResult.error || '첨부 실패' });
      }
      
      // Footer with filename and upload date for second image
      const secondUploadDate = secondImage.doc.createdAt 
        ? new Date(secondImage.doc.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'numeric', day: 'numeric' })
        : '-';
      
      drawText(page, {
        x: MARGIN + 5,
        y: secondY + 8,
        text: secondImage.doc.fileName || '',
        font: fonts.regular,
        size: 8,
        color: { r: 0.3, g: 0.3, b: 0.3 },
      });
      
      drawText(page, {
        x: A4_WIDTH - MARGIN - 100,
        y: secondY + 8,
        text: `업로드: ${secondUploadDate}`,
        font: fonts.regular,
        size: 8,
        color: { r: 0.3, g: 0.3, b: 0.3 },
      });
    }
  }
  
  return { errors };
}

async function renderRecoveryAreaPage(
  pdfDoc: PDFDocument,
  fonts: FontSet,
  caseData: any,
  estimateRowsData: any[]
): Promise<void> {
  const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
  let y = A4_HEIGHT - MARGIN;
  
  // Title (no Excel icon)
  drawText(page, {
    x: MARGIN,
    y: y - 18,
    text: '현장 피해/복구 면적 산출표',
    font: fonts.bold,
    size: 16,
  });
  
  y -= 45;
  
  const fullAddress = [caseData.insuredAddress, caseData.insuredAddressDetail]
    .filter(Boolean).join(' ');
  
  const now = new Date();
  const dateStr = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일`;
  
  // Info table
  const headerRows: TableCell[][] = [
    [
      { text: '접수번호', width: 70, isHeader: true, align: 'center' },
      { text: caseData.insuranceAccidentNo || caseData.caseNumber || '-', width: 120, align: 'left' },
      { text: '고객사', width: 60, isHeader: true, align: 'center' },
      { text: caseData.insuranceCompany || '-', width: 100, align: 'left' },
      { text: '고객사 번호', width: 70, isHeader: true, align: 'center' },
      { text: caseData.clientContact || caseData.insuredContact || '-', width: 95, align: 'left' },
    ],
    [
      { text: '장소', width: 70, isHeader: true, align: 'center' },
      { text: fullAddress || '-', width: 280, align: 'left' },
      { text: '작성일자', width: 70, isHeader: true, align: 'center' },
      { text: dateStr, width: 95, align: 'left' },
    ],
  ];
  
  y = drawTable(page, {
    x: MARGIN,
    y,
    rows: headerRows,
    fonts,
    fontSize: 9,
    rowHeight: 24,
  });
  
  y -= 20;
  
  drawText(page, {
    x: A4_WIDTH - MARGIN - 60,
    y,
    text: '단위: ㎡',
    font: fonts.regular,
    size: 9,
  });
  
  y -= 15;
  
  // Two-row header for area table
  const headerRow1: TableCell[] = [
    { text: '구분', width: 55, isHeader: true, align: 'center' },
    { text: '공사내용', width: 70, isHeader: true, align: 'center' },
    { text: '공사분류', width: 70, isHeader: true, align: 'center' },
    { text: '피해면적', width: 130, isHeader: true, align: 'center' },
    { text: '복구면적', width: 130, isHeader: true, align: 'center' },
    { text: '비고', width: 60, isHeader: true, align: 'center' },
  ];
  
  const headerRow2: TableCell[] = [
    { text: '', width: 55, isHeader: true, align: 'center' },
    { text: '', width: 70, isHeader: true, align: 'center' },
    { text: '', width: 70, isHeader: true, align: 'center' },
    { text: '면적', width: 43, isHeader: true, align: 'center' },
    { text: '가로', width: 43, isHeader: true, align: 'center' },
    { text: '세로', width: 44, isHeader: true, align: 'center' },
    { text: '면적', width: 43, isHeader: true, align: 'center' },
    { text: '가로', width: 43, isHeader: true, align: 'center' },
    { text: '세로', width: 44, isHeader: true, align: 'center' },
    { text: '', width: 60, isHeader: true, align: 'center' },
  ];
  
  // Draw first header row
  y = drawTable(page, {
    x: MARGIN,
    y,
    rows: [headerRow1],
    fonts,
    fontSize: 8,
    rowHeight: 20,
  });
  
  // Draw second header row
  y = drawTable(page, {
    x: MARGIN,
    y,
    rows: [headerRow2],
    fonts,
    fontSize: 8,
    rowHeight: 20,
  });
  
  // Group rows by category (location)
  const groupedRows: Record<string, any[]> = {};
  if (estimateRowsData && estimateRowsData.length > 0) {
    for (const row of estimateRowsData) {
      const category = row.category || '기타';
      if (!groupedRows[category]) {
        groupedRows[category] = [];
      }
      groupedRows[category].push(row);
    }
  }
  
  // Draw data rows grouped by category with merged cells
  const categories = Object.keys(groupedRows);
  const dataRowHeight = 22;
  const categoryColWidth = 55;
  
  if (categories.length > 0) {
    for (const category of categories) {
      const rows = groupedRows[category];
      const groupHeight = rows.length * dataRowHeight;
      const groupStartY = y;
      
      // Draw merged category cell (spans all rows in this group)
      page.drawRectangle({
        x: MARGIN,
        y: groupStartY - groupHeight,
        width: categoryColWidth,
        height: groupHeight,
        color: rgb(1, 1, 1),
      });
      page.drawRectangle({
        x: MARGIN,
        y: groupStartY - groupHeight,
        width: categoryColWidth,
        height: groupHeight,
        borderColor: rgb(0.3, 0.3, 0.3),
        borderWidth: 0.5,
      });
      
      // Draw category text centered vertically in merged cell
      const categoryTextWidth = measureTextWidth(category, fonts.regular, 8);
      page.drawText(category, {
        x: MARGIN + (categoryColWidth - categoryTextWidth) / 2,
        y: groupStartY - groupHeight / 2 - 3,
        size: 8,
        font: fonts.regular,
        color: rgb(0, 0, 0),
      });
      
      // Draw individual rows (excluding category column)
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const damageW = row.damageWidth ? Number(row.damageWidth).toFixed(1) : '0.0';
        const damageH = row.damageHeight ? Number(row.damageHeight).toFixed(1) : '0.0';
        const damageAreaM2 = row.damageArea ? Number(row.damageArea).toFixed(1) : '0.0';
        
        const repairW = row.repairWidth ? Number(row.repairWidth).toFixed(1) : '0.0';
        const repairH = row.repairHeight ? Number(row.repairHeight).toFixed(1) : '0.0';
        const repairAreaM2 = row.repairArea ? Number(row.repairArea).toFixed(1) : '0.0';
        
        // Row without category column (starts after category column)
        const dataRow: TableCell[] = [
          { text: row.location || '-', width: 70, align: 'center' },
          { text: row.workName || '-', width: 70, align: 'center' },
          { text: damageAreaM2, width: 43, align: 'center' },
          { text: damageW, width: 43, align: 'center' },
          { text: damageH, width: 44, align: 'center' },
          { text: repairAreaM2, width: 43, align: 'center' },
          { text: repairW, width: 43, align: 'center' },
          { text: repairH, width: 44, align: 'center' },
          { text: row.note || '-', width: 60, align: 'center' },
        ];
        
        drawTable(page, {
          x: MARGIN + categoryColWidth,
          y: groupStartY - i * dataRowHeight,
          rows: [dataRow],
          fonts,
          fontSize: 8,
          rowHeight: dataRowHeight,
        });
      }
      
      y = groupStartY - groupHeight;
    }
  } else {
    const emptyRow: TableCell[] = [
      { text: '등록된 복구면적 데이터가 없습니다.', width: 515, align: 'center' },
    ];
    
    drawTable(page, {
      x: MARGIN,
      y,
      rows: [emptyRow],
      fonts,
      fontSize: 8,
      rowHeight: 22,
    });
  }
  
  // Footer
  const footerY = MARGIN + 20;
  drawText(page, {
    x: A4_WIDTH - MARGIN - 120,
    y: footerY,
    text: `작성일: ${dateStr}`,
    font: fonts.regular,
    size: 9,
  });
}

async function renderEstimatePage(
  pdfDoc: PDFDocument,
  fonts: FontSet,
  caseData: any,
  estimateData: any,
  estimateRowsData: any[],
  partnerData: any
): Promise<void> {
  const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
  let y = A4_HEIGHT - MARGIN;
  
  // ===== 견적서 타이틀 =====
  drawText(page, {
    x: MARGIN,
    y: y - 10,
    text: '견 적 서',
    font: fonts.bold,
    size: 18,
    maxWidth: CONTENT_WIDTH,
    align: 'center',
  });
  
  y -= 40;
  
  // ===== 상단 정보 테이블 =====
  const fullAddress = [caseData.insuredAddress, caseData.insuredAddressDetail]
    .filter(Boolean).join(' ');
  
  const partnerCompany = partnerData?.company || caseData.assignedPartner || '-';
  const partnerBusinessNo = partnerData?.businessRegistrationNumber || '-';
  const partnerRepName = partnerData?.representativeName || partnerData?.name || '-';
  
  const rowHeight = 20;
  const leftTableWidth = 250; // 현장명/보험사/접수번호 테이블
  const supplierLabelWidth = 30; // 공/급/자 병합 셀
  const rightTableWidth = 235; // 사업자번호/상호명/대표자 테이블
  
  // 좌측 테이블 (현장명/보험사/접수번호)
  const leftTableRows: TableCell[][] = [
    [
      { text: '현장명(주소)', width: 70, isHeader: true, align: 'center' },
      { text: fullAddress || '-', width: 180, align: 'left' },
    ],
    [
      { text: '보험사', width: 70, isHeader: true, align: 'center' },
      { text: caseData.insuranceCompany || '-', width: 180, align: 'left' },
    ],
    [
      { text: '접수번호', width: 70, isHeader: true, align: 'center' },
      { text: caseData.insuranceAccidentNo || caseData.caseNumber || '-', width: 180, align: 'left' },
    ],
  ];
  
  drawTable(page, {
    x: MARGIN,
    y,
    rows: leftTableRows,
    fonts,
    fontSize: 9,
    rowHeight,
  });
  
  // 공급자 병합 셀 (3행 세로 병합)
  const supplierX = MARGIN + leftTableWidth;
  const supplierHeight = rowHeight * 3;
  
  // 공급자 셀 배경
  page.drawRectangle({
    x: supplierX,
    y: y - supplierHeight,
    width: supplierLabelWidth,
    height: supplierHeight,
    color: rgb(0.94, 0.94, 0.94),
  });
  
  // 공급자 셀 테두리
  page.drawRectangle({
    x: supplierX,
    y: y - supplierHeight,
    width: supplierLabelWidth,
    height: supplierHeight,
    borderColor: rgb(0.3, 0.3, 0.3),
    borderWidth: 0.5,
  });
  
  // 공/급/자 텍스트 (세로 중앙에 배치)
  const supplierLabels = ['공', '급', '자'];
  supplierLabels.forEach((label, idx) => {
    const labelY = y - (idx + 0.5) * rowHeight;
    const labelWidth = measureTextWidth(label, fonts.bold, 9);
    page.drawText(label, {
      x: supplierX + (supplierLabelWidth - labelWidth) / 2,
      y: labelY - 3,
      size: 9,
      font: fonts.bold,
      color: rgb(0, 0, 0),
    });
  });
  
  // 우측 테이블 (사업자번호/상호명/대표자)
  const rightTableRows: TableCell[][] = [
    [
      { text: '사업자번호', width: 70, isHeader: true, align: 'center' },
      { text: partnerBusinessNo, width: 165, align: 'left' },
    ],
    [
      { text: '상호명', width: 70, isHeader: true, align: 'center' },
      { text: partnerCompany, width: 165, align: 'left' },
    ],
    [
      { text: '대표자', width: 70, isHeader: true, align: 'center' },
      { text: partnerRepName, width: 165, align: 'left' },
    ],
  ];
  
  drawTable(page, {
    x: supplierX + supplierLabelWidth,
    y,
    rows: rightTableRows,
    fonts,
    fontSize: 9,
    rowHeight,
  });
  
  y -= supplierHeight;
  
  y -= 10;
  
  // ===== 노무비 테이블 =====
  page.drawRectangle({
    x: MARGIN,
    y: y - 15,
    width: CONTENT_WIDTH,
    height: 15,
    color: rgb(0.95, 0.9, 0.7),
  });
  
  drawText(page, {
    x: MARGIN + 5,
    y: y - 12,
    text: '노무비',
    font: fonts.bold,
    size: 9,
  });
  
  y -= 20;
  
  let laborCostItems: any[] = [];
  if (estimateData?.laborCostData) {
    try {
      const rawLaborData = typeof estimateData.laborCostData === 'string'
        ? JSON.parse(estimateData.laborCostData)
        : estimateData.laborCostData;
      if (Array.isArray(rawLaborData)) {
        laborCostItems = rawLaborData;
      } else if (rawLaborData.rows && Array.isArray(rawLaborData.rows)) {
        laborCostItems = rawLaborData.rows;
      }
    } catch {}
  }
  
  // Golden Master 노무비 컬럼: 공종 | 공사명 | 노임항목 | 복구면적 | 적용단가 | 수량(인) | 합계 | 경비 | 비고
  const laborHeader: TableCell[] = [
    { text: '공종', width: 55, isHeader: true, align: 'center' },
    { text: '공사명', width: 60, isHeader: true, align: 'center' },
    { text: '노임항목', width: 60, isHeader: true, align: 'center' },
    { text: '복구면적', width: 55, isHeader: true, align: 'center' },
    { text: '적용단가', width: 65, isHeader: true, align: 'center' },
    { text: '수량(인)', width: 45, isHeader: true, align: 'center' },
    { text: '합계', width: 70, isHeader: true, align: 'center' },
    { text: '경비', width: 50, isHeader: true, align: 'center' },
    { text: '비고', width: 55, isHeader: true, align: 'center' },
  ];
  
  const laborRows: TableCell[][] = [laborHeader];
  let laborTotal = 0;
  let laborExpenseTotal = 0;
  
  if (laborCostItems.length > 0) {
    laborCostItems.forEach((row) => {
      // LaborCostRow 필드명: category(공종), workName(공사명), detailItem(세부항목/노임항목)
      // damageArea(피해면적), standardPrice(기준가), pricePerSqm(기준가m²)
      // quantity(수량), amount(금액), includeInEstimate(경비여부), request(요청/비고)
      const damageArea = Number(row.damageArea) || Number(row.repairArea) || Number(row.area) || 0;
      const unitPrice = Number(row.standardPrice) || Number(row.pricePerSqm) || Number(row.unitPrice) || 0;
      const quantity = Number(row.quantity) || 1;
      const amount = Number(row.amount) || 0;
      const expense = row.includeInEstimate ? amount : 0;
      laborTotal += amount;
      if (row.includeInEstimate) {
        laborExpenseTotal += amount;
      }
      
      laborRows.push([
        { text: row.category || row.workType || '-', width: 55, align: 'center' },
        { text: row.workName || '-', width: 60, align: 'left' },
        { text: row.detailItem || row.laborItem || '-', width: 60, align: 'left' },
        { text: damageArea > 0 ? damageArea.toFixed(2) : '-', width: 55, align: 'right' },
        { text: unitPrice > 0 ? formatNumber(unitPrice) : '-', width: 65, align: 'right' },
        { text: String(quantity), width: 45, align: 'center' },
        { text: formatNumber(amount), width: 70, align: 'right' },
        { text: expense > 0 ? formatNumber(expense) : '-', width: 50, align: 'right' },
        { text: row.request || row.note || '-', width: 55, align: 'left' },
      ]);
    });
  } else {
    laborRows.push([
      { text: '등록된 노무비 데이터가 없습니다.', width: 515, align: 'center' },
    ]);
  }
  
  // 노무비 소계 행 (전체 너비에 맞춤: 55+60+60+55+65+45+70+50+55 = 515)
  laborRows.push([
    { text: '노무비 소계', width: 400, isHeader: true, align: 'center' },
    { text: formatNumber(laborTotal), width: 115, align: 'right' },
  ]);
  
  y = drawTable(page, {
    x: MARGIN,
    y,
    rows: laborRows,
    fonts,
    fontSize: 7,
    rowHeight: 16,
  });
  
  y -= 15;
  
  // ===== 자재비 테이블 =====
  page.drawRectangle({
    x: MARGIN,
    y: y - 15,
    width: CONTENT_WIDTH,
    height: 15,
    color: rgb(0.95, 0.9, 0.7),
  });
  
  drawText(page, {
    x: MARGIN + 5,
    y: y - 12,
    text: '자재비',
    font: fonts.bold,
    size: 9,
  });
  
  y -= 20;
  
  let materialCostItems: any[] = [];
  if (estimateData?.materialCostData) {
    try {
      const rawMaterialData = typeof estimateData.materialCostData === 'string'
        ? JSON.parse(estimateData.materialCostData)
        : estimateData.materialCostData;
      if (Array.isArray(rawMaterialData)) {
        materialCostItems = rawMaterialData;
      } else if (rawMaterialData.rows && Array.isArray(rawMaterialData.rows)) {
        materialCostItems = rawMaterialData.rows;
      }
    } catch {}
  }
  
  // Golden Master 자재비 컬럼: 공종 | 공사명 | 자재항목 | 단가 | 수량 | 단위 | 합계 | 비고
  const materialHeader: TableCell[] = [
    { text: '공종', width: 55, isHeader: true, align: 'center' },
    { text: '공사명', width: 70, isHeader: true, align: 'center' },
    { text: '자재항목', width: 90, isHeader: true, align: 'center' },
    { text: '단가', width: 70, isHeader: true, align: 'center' },
    { text: '수량', width: 50, isHeader: true, align: 'center' },
    { text: '단위', width: 40, isHeader: true, align: 'center' },
    { text: '합계', width: 80, isHeader: true, align: 'center' },
    { text: '비고', width: 60, isHeader: true, align: 'center' },
  ];
  
  const materialRows: TableCell[][] = [materialHeader];
  let materialTotal = 0;
  
  if (materialCostItems.length > 0) {
    materialCostItems.forEach((row) => {
      // MaterialRow 필드명: 공종, 공사명, 자재항목, 자재, 규격, 단위, 단가, 기준단가
      // 수량m2, 수량EA, 수량, 합계, 금액, 비고
      const qty = Number(row['수량']) || Number(row['수량m2']) || Number(row.quantity) || 1;
      const unitPrice = Number(row['단가']) || Number(row['기준단가']) || Number(row.unitPrice) || 0;
      const amount = Number(row['합계']) || Number(row['금액']) || Number(row.amount) || (qty * unitPrice);
      materialTotal += amount;
      
      materialRows.push([
        { text: row['공종'] || row.workType || row.category || '-', width: 55, align: 'center' },
        { text: row['공사명'] || row.workName || '-', width: 70, align: 'left' },
        { text: row['자재항목'] || row['자재'] || row.materialItem || row.materialName || '-', width: 90, align: 'left' },
        { text: unitPrice > 0 ? formatNumber(unitPrice) : '-', width: 70, align: 'right' },
        { text: String(qty), width: 50, align: 'center' },
        { text: row['단위'] || row.unit || '-', width: 40, align: 'center' },
        { text: formatNumber(amount), width: 80, align: 'right' },
        { text: row['비고'] || row.note || '-', width: 60, align: 'left' },
      ]);
    });
  } else {
    materialRows.push([
      { text: '등록된 자재비 데이터가 없습니다.', width: 515, align: 'center' },
    ]);
  }
  
  // 자재비 소계 행 (전체 너비에 맞춤: 55+70+90+70+50+40+80+60 = 515)
  materialRows.push([
    { text: '자재비 소계', width: 400, isHeader: true, align: 'center' },
    { text: formatNumber(materialTotal), width: 115, align: 'right' },
  ]);
  
  y = drawTable(page, {
    x: MARGIN,
    y,
    rows: materialRows,
    fonts,
    fontSize: 7,
    rowHeight: 16,
  });
  
  y -= 20;
  
  // ===== 합계/정산 구간 (Golden Master 양식) =====
  const subtotal = laborTotal + materialTotal;
  const adminFeeRate = 0.06;
  const profitRate = 0.15;
  const vatRate = 0.1;
  
  const adminFee = Math.round(subtotal * adminFeeRate);
  const profit = Math.round(subtotal * profitRate);
  const beforeRounding = subtotal + adminFee + profit;
  // 만원단위 절사 (10000원 단위) - 용어는 '천원단위 절사'로 표시
  const rounded = Math.floor(beforeRounding / 10000) * 10000;
  const roundingDiff = beforeRounding - rounded;
  const vat = Math.round(rounded * vatRate);
  const grandTotal = rounded + vat;
  
  const totalRows: TableCell[][] = [
    [
      { text: '노무비 합계', width: 150, isHeader: true, align: 'center' },
      { text: formatNumber(laborTotal), width: 110, align: 'right' },
    ],
    [
      { text: '자재비 합계', width: 150, isHeader: true, align: 'center' },
      { text: formatNumber(materialTotal), width: 110, align: 'right' },
    ],
    [
      { text: '소계', width: 150, isHeader: true, align: 'center' },
      { text: formatNumber(subtotal), width: 110, align: 'right' },
    ],
    [
      { text: '일반관리비 (6%)', width: 150, isHeader: true, align: 'center' },
      { text: formatNumber(adminFee), width: 110, align: 'right' },
    ],
    [
      { text: '이윤 (15%)', width: 150, isHeader: true, align: 'center' },
      { text: formatNumber(profit), width: 110, align: 'right' },
    ],
    [
      { text: '천원단위 절사', width: 150, isHeader: true, align: 'center' },
      { text: roundingDiff > 0 ? `-${formatNumber(roundingDiff)}` : '0', width: 110, align: 'right' },
    ],
    [
      { text: '합계', width: 150, isHeader: true, align: 'center' },
      { text: formatNumber(rounded), width: 110, align: 'right' },
    ],
    [
      { text: '부가세 (10%) - 포함', width: 150, isHeader: true, align: 'center' },
      { text: formatNumber(vat), width: 110, align: 'right' },
    ],
    [
      { text: '총 합계', width: 150, isHeader: true, align: 'center' },
      { text: formatNumber(grandTotal), width: 110, align: 'right' },
    ],
  ];
  
  drawTable(page, {
    x: A4_WIDTH - MARGIN - 260,
    y,
    rows: totalRows,
    fonts,
    fontSize: 9,
    rowHeight: 18,
  });
  
  // ===== 하단 문구 및 작성일 =====
  const footerY = MARGIN + 30;
  
  const today = new Date();
  const dateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;
  
  // 안내문구 (합계표 아래, 작성일 위 - 초록색 박스 위치)
  drawText(page, {
    x: MARGIN + 50,
    y: footerY + 35,
    text: '상기 견적은 시공 전 예상금액이며, 현장 상황 및 실제 시공범위에 따라 일부 변동될 수 있습니다.',
    font: fonts.regular,
    size: 8,
    color: { r: 0.8, g: 0.2, b: 0.2 },
  });
  
  // 작성일 (안내문구 아래)
  drawText(page, {
    x: MARGIN,
    y: footerY + 10,
    text: `작성일: ${dateStr}`,
    font: fonts.regular,
    size: 9,
  });
  
  // 회사명 (오른쪽)
  drawText(page, {
    x: A4_WIDTH - MARGIN - 80,
    y: footerY + 10,
    text: partnerCompany,
    font: fonts.regular,
    size: 9,
  });
}

function renderErrorPage(
  pdfDoc: PDFDocument,
  fonts: FontSet,
  sectionName: string,
  errorMessage: string
): void {
  const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
  
  page.drawRectangle({
    x: MARGIN,
    y: MARGIN,
    width: CONTENT_WIDTH,
    height: A4_HEIGHT - (MARGIN * 2),
    color: rgb(0.99, 0.96, 0.96),
    borderColor: rgb(0.8, 0.3, 0.3),
    borderWidth: 2,
  });
  
  const centerX = A4_WIDTH / 2;
  const centerY = A4_HEIGHT / 2;
  
  drawText(page, {
    x: centerX - 60,
    y: centerY + 60,
    text: '⚠ 섹션 생성 오류',
    font: fonts.bold,
    size: 18,
    color: { r: 0.6, g: 0.1, b: 0.1 },
  });
  
  drawText(page, {
    x: MARGIN + 30,
    y: centerY + 20,
    text: `섹션: ${sectionName}`,
    font: fonts.bold,
    size: 14,
    maxWidth: CONTENT_WIDTH - 60,
    align: 'center',
  });
  
  drawText(page, {
    x: MARGIN + 30,
    y: centerY - 20,
    text: errorMessage,
    font: fonts.regular,
    size: 11,
    color: { r: 0.4, g: 0.4, b: 0.4 },
    maxWidth: CONTENT_WIDTH - 60,
    align: 'center',
  });
  
  drawText(page, {
    x: MARGIN + 30,
    y: centerY - 80,
    text: '이 섹션의 생성에 실패하여 안내 페이지로 대체되었습니다.',
    font: fonts.regular,
    size: 10,
    color: { r: 0.5, g: 0.5, b: 0.5 },
    maxWidth: CONTENT_WIDTH - 60,
    align: 'center',
  });
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
  skipEvidence?: boolean; // 본문 PDF에서 증빙 이미지 제외 (이메일 용량 제한용)
}

export async function generatePdfWithPdfLib(
  payload: PdfGenerationPayload,
  processingLevel: number = 0
): Promise<Buffer> {
  const { caseId, sections, evidence, skipEvidence } = payload;
  const processingConfig = PROCESSING_LEVELS[processingLevel] || PROCESSING_LEVELS[0];
  
  console.log(`[pdf-lib] PDF 생성 시작 - 레벨 ${processingLevel}: ${processingConfig.maxDimension}px / ${processingConfig.quality}%`);
  if (skipEvidence) {
    console.log('[pdf-lib] skipEvidence=true: 본문 PDF에서 증빙 이미지 제외');
  }
  
  const [caseData] = await db.select().from(cases).where(eq(cases.id, caseId));
  if (!caseData) {
    throw new Error('케이스를 찾을 수 없습니다.');
  }
  
  let partnerData: any = null;
  if (caseData.assignedPartner) {
    const trimmedPartnerName = caseData.assignedPartner.trim();
    let partners = await db.select().from(users).where(
      sql`TRIM(${users.company}) = ${trimmedPartnerName}`
    );
    
    if (partners.length === 0) {
      partners = await db.select().from(users).where(
        ilike(users.company, `%${trimmedPartnerName}%`)
      );
    }
    
    if (partners.length === 0 && caseData.assignedPartnerManager) {
      partners = await db.select().from(users).where(
        eq(users.name, caseData.assignedPartnerManager.trim())
      );
    }
    
    if (partners.length > 0) {
      partnerData = partners.find(p => p.role === '협력사') || partners[0];
    }
  }
  
  const pdfDoc = await PDFDocument.create();
  let fonts: FontSet;
  
  try {
    fonts = await embedFonts(pdfDoc);
  } catch (fontError: any) {
    console.error('[pdf-lib] 폰트 로드 실패:', fontError.message);
    const fallbackFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    fonts = { regular: fallbackFont, bold: fallbackFont };
  }
  
  if (sections.cover) {
    try {
      await renderCoverPage(pdfDoc, fonts, caseData, partnerData);
      console.log('[pdf-lib] 표지 페이지 생성 완료');
    } catch (err: any) {
      console.error('[pdf-lib] 표지 페이지 생성 실패:', err.message);
      renderErrorPage(pdfDoc, fonts, '현장출동확인서 (표지)', err.message);
    }
  }
  
  if (sections.fieldReport) {
    try {
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
      
      await renderFieldReportPage(pdfDoc, fonts, caseData, partnerData, repairItems);
      console.log('[pdf-lib] 출동확인서 페이지 생성 완료');
    } catch (err: any) {
      console.error('[pdf-lib] 출동확인서 페이지 생성 실패:', err.message);
      renderErrorPage(pdfDoc, fonts, '출동확인서', err.message);
    }
  }
  
  if (sections.drawing) {
    try {
      // Get drawing data for this case
      const [drawingData] = await db.select().from(drawings)
        .where(eq(drawings.caseId, caseId));
      
      await renderDrawingPage(pdfDoc, fonts, caseData, drawingData);
      console.log('[pdf-lib] 도면 페이지 생성 완료');
    } catch (err: any) {
      console.error('[pdf-lib] 도면 페이지 생성 실패:', err.message);
      renderErrorPage(pdfDoc, fonts, '현장 피해상황 도면', err.message);
    }
  }
  
  // skipEvidence가 true면 증빙 섹션 스킵 (이메일 용량 제한용)
  if (sections.evidence && evidence.selectedFileIds.length > 0 && !skipEvidence) {
    try {
      const selectedDocs = await db.select().from(caseDocuments)
        .where(
          and(
            eq(caseDocuments.caseId, caseId),
            inArray(caseDocuments.id, evidence.selectedFileIds)
          )
        );
      
      const imageDocs = selectedDocs.filter(doc => doc.fileType?.startsWith('image/'));
      const pdfDocs = selectedDocs.filter(doc =>
        doc.fileType === 'application/pdf' || doc.fileName?.toLowerCase().endsWith('.pdf')
      );
      
      console.log(`[pdf-lib] 선택된 문서: 이미지 ${imageDocs.length}개, PDF ${pdfDocs.length}개`);
      
      if (imageDocs.length > 0) {
        const { errors } = await renderEvidencePages(pdfDoc, fonts, caseData, imageDocs, processingConfig);
        if (errors.length > 0) {
          console.log(`[pdf-lib] 증빙자료 처리 중 오류 ${errors.length}개:`, errors);
        }
        console.log('[pdf-lib] 증빙자료 이미지 페이지 생성 완료');
      }
      
      for (const pdfDocData of pdfDocs) {
        try {
          let pdfData: Uint8Array;
          if (pdfDocData.fileData?.startsWith('data:')) {
            const base64Data = pdfDocData.fileData.split(',')[1];
            pdfData = Buffer.from(base64Data, 'base64');
          } else if (pdfDocData.fileData) {
            pdfData = Buffer.from(pdfDocData.fileData, 'base64');
          } else {
            continue;
          }
          
          const attachedPdf = await PDFDocument.load(pdfData, { ignoreEncryption: true });
          const pages = await pdfDoc.copyPages(attachedPdf, attachedPdf.getPageIndices());
          pages.forEach(page => pdfDoc.addPage(page));
          console.log(`[pdf-lib] PDF 첨부 완료: ${pdfDocData.fileName}`);
        } catch (pdfErr: any) {
          console.error(`[pdf-lib] PDF 첨부 실패 (${pdfDocData.fileName}):`, pdfErr.message);
        }
      }
    } catch (err: any) {
      console.error('[pdf-lib] 증빙자료 섹션 생성 실패:', err.message);
      renderErrorPage(pdfDoc, fonts, '증빙자료', err.message);
    }
  }
  
  if (sections.estimate) {
    try {
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
      
      if (estimateRowsData.length > 0) {
        await renderRecoveryAreaPage(pdfDoc, fonts, caseData, estimateRowsData);
        console.log('[pdf-lib] 복구면적 산출표 페이지 생성 완료');
      }
      
      await renderEstimatePage(pdfDoc, fonts, caseData, estimateData, estimateRowsData, partnerData);
      console.log('[pdf-lib] 견적서 페이지 생성 완료');
    } catch (err: any) {
      console.error('[pdf-lib] 견적서 섹션 생성 실패:', err.message);
      renderErrorPage(pdfDoc, fonts, '견적서', err.message);
    }
  }
  
  if (pdfDoc.getPageCount() === 0) {
    const emptyPage = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
    drawText(emptyPage, {
      x: MARGIN,
      y: A4_HEIGHT / 2,
      text: '생성된 콘텐츠가 없습니다.',
      font: fonts.regular,
      size: 14,
      maxWidth: CONTENT_WIDTH,
      align: 'center',
    });
  }
  
  const pdfBytes = await pdfDoc.save();
  console.log(`[pdf-lib] PDF 생성 완료 - 크기: ${Math.round(pdfBytes.length / 1024)}KB, 페이지: ${pdfDoc.getPageCount()}`);
  
  return Buffer.from(pdfBytes);
}

export async function generatePdfWithSizeLimitPdfLib(payload: PdfGenerationPayload): Promise<Buffer> {
  const totalLevels = PROCESSING_LEVELS.length;
  
  for (let level = 0; level < totalLevels; level++) {
    const config = PROCESSING_LEVELS[level];
    console.log(`[pdf-lib] 레벨 ${level + 1}/${totalLevels}: ${config.maxDimension}px / ${config.quality}%로 PDF 생성 시도`);
    
    try {
      const pdfBuffer = await generatePdfWithPdfLib(payload, level);
      const sizeInMB = pdfBuffer.length / (1024 * 1024);
      
      console.log(`[pdf-lib] PDF 크기: ${sizeInMB.toFixed(2)}MB (제한: ${MAX_PDF_SIZE_BYTES / (1024 * 1024)}MB)`);
      
      if (pdfBuffer.length <= MAX_PDF_SIZE_BYTES) {
        console.log(`[pdf-lib] 레벨 ${level + 1} 성공 - 크기: ${sizeInMB.toFixed(2)}MB`);
        return pdfBuffer;
      }
      
      if (level < totalLevels - 1) {
        const nextConfig = PROCESSING_LEVELS[level + 1];
        console.log(`[pdf-lib] PDF 크기 초과 - 레벨 ${level + 2} (${nextConfig.maxDimension}px/${nextConfig.quality}%)로 재시도`);
      }
    } catch (err: any) {
      console.error(`[pdf-lib] 레벨 ${level + 1} 생성 실패:`, err.message);
      if (level < totalLevels - 1) {
        console.log(`[pdf-lib] 다음 레벨로 재시도...`);
        continue;
      }
    }
  }
  
  const lastLevel = totalLevels - 1;
  const lastConfig = PROCESSING_LEVELS[lastLevel];
  console.warn(`[pdf-lib] 최저 레벨 (${lastConfig.maxDimension}px/${lastConfig.quality}%)로도 10MB 초과 - 마지막 결과 반환`);
  
  try {
    return await generatePdfWithPdfLib(payload, lastLevel);
  } catch (err: any) {
    console.error(`[pdf-lib] 최종 생성 실패:`, err.message);
    const emptyPdf = await PDFDocument.create();
    emptyPdf.addPage();
    return Buffer.from(await emptyPdf.save());
  }
}

// ========================================================
// 탭별 증빙 PDF 생성 (이메일 용량 제한용)
// ========================================================

const TAB_NAMES = ['현장사진', '기본자료', '증빙자료', '청구자료'] as const;
type TabName = typeof TAB_NAMES[number];

const CATEGORY_TO_TAB: Record<string, TabName> = {
  '현장출동사진': '현장사진', '현장': '현장사진',
  '수리중 사진': '현장사진', '수리중': '현장사진',
  '복구완료 사진': '현장사진', '복구완료': '현장사진',
  '보험금 청구서': '기본자료', '개인정보 동의서(가족용)': '기본자료',
  '주민등록등본': '증빙자료', '등기부등본': '증빙자료',
  '건축물대장': '증빙자료', '기타증빙자료(민원일지 등)': '증빙자료',
  '위임장': '청구자료', '도급계약서': '청구자료',
  '복구완료확인서': '청구자료', '부가세 청구자료': '청구자료', '청구': '청구자료',
};

const MAX_EVIDENCE_PDF_SIZE_BYTES = 8 * 1024 * 1024; // 8MB 제한

interface EvidencePdfResult {
  tabName: string;
  fileName: string;
  buffer: Buffer;
  pageCount: number;
  imageCount: number;
}

// 단계적 압축으로 이미지를 PDF에 추가할 버퍼로 변환
async function compressImageForPdf(
  imageData: Buffer,
  targetMaxBytes: number = 500 * 1024 // 기본 500KB 목표
): Promise<{ buffer: Buffer; format: 'jpeg' | 'png' }> {
  const levels = [
    { maxDimension: 1600, quality: 60 },
    { maxDimension: 1400, quality: 50 },
    { maxDimension: 1200, quality: 40 },
    { maxDimension: 1000, quality: 30 },
    { maxDimension: 800, quality: 25 },
    { maxDimension: 700, quality: 20 },
  ];
  
  for (const level of levels) {
    try {
      const compressed = await sharp(imageData)
        .resize(level.maxDimension, level.maxDimension, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: level.quality })
        .toBuffer();
      
      if (compressed.length <= targetMaxBytes) {
        return { buffer: compressed, format: 'jpeg' };
      }
    } catch (err) {
      continue;
    }
  }
  
  // 최저 레벨로도 안되면 마지막 결과 반환
  try {
    const lastLevel = levels[levels.length - 1];
    const compressed = await sharp(imageData)
      .resize(lastLevel.maxDimension, lastLevel.maxDimension, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: lastLevel.quality })
      .toBuffer();
    return { buffer: compressed, format: 'jpeg' };
  } catch (err) {
    // 변환 실패 시 원본 반환 시도
    return { buffer: imageData, format: 'jpeg' };
  }
}

// 단일 탭의 증빙 PDF 생성 (8MB 초과 시 분할)
async function generateSingleTabEvidencePdf(
  tabName: string,
  documents: Array<{ id: string; fileName: string; fileType: string; fileData: string; category: string }>,
  caseData: any,
  fonts: FontSet,
  accidentNo: string
): Promise<EvidencePdfResult[]> {
  const results: EvidencePdfResult[] = [];
  
  if (documents.length === 0) {
    return results;
  }
  
  console.log(`[pdf-lib] 탭 "${tabName}" 증빙 PDF 생성 시작 - ${documents.length}개 이미지`);
  
  let currentPdfDoc = await PDFDocument.create();
  currentPdfDoc.registerFontkit(fontkit);
  let currentFonts = await embedFonts(currentPdfDoc);
  
  let currentPartIndex = 1;
  let currentImageCount = 0;
  let estimatedSize = 0;
  
  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i];
    
    try {
      // Base64 → Buffer
      let imageData: Buffer;
      if (doc.fileData.startsWith('data:')) {
        const base64Data = doc.fileData.split(',')[1];
        imageData = Buffer.from(base64Data, 'base64');
      } else {
        imageData = Buffer.from(doc.fileData, 'base64');
      }
      
      // 이미지 압축
      const { buffer: compressedBuffer, format } = await compressImageForPdf(imageData);
      
      // 현재 PDF 크기 체크 (예상치 - 이미지 + 텍스트 오버헤드)
      const estimatedImageSize = compressedBuffer.length + 5000; // 5KB 오버헤드
      
      // 8MB 초과 예상 시 현재 PDF 저장하고 새 PDF 시작
      if (estimatedSize + estimatedImageSize > MAX_EVIDENCE_PDF_SIZE_BYTES && currentImageCount > 0) {
        // 현재 PDF 저장
        const pdfBytes = await currentPdfDoc.save();
        const partSuffix = currentPartIndex > 1 ? `_${currentPartIndex}` : '';
        results.push({
          tabName,
          fileName: `Evidence_${tabName}${partSuffix}.pdf`,
          buffer: Buffer.from(pdfBytes),
          pageCount: currentPdfDoc.getPageCount(),
          imageCount: currentImageCount,
        });
        
        console.log(`[pdf-lib] 탭 "${tabName}" 파트 ${currentPartIndex} 완료 - ${currentImageCount}개 이미지, ${Math.round(pdfBytes.length / 1024)}KB`);
        
        // 새 PDF 시작 (폰트도 새 문서에 재할당)
        currentPdfDoc = await PDFDocument.create();
        currentPdfDoc.registerFontkit(fontkit);
        currentFonts = await embedFonts(currentPdfDoc);
        currentPartIndex++;
        currentImageCount = 0;
        estimatedSize = 0;
      }
      
      // 페이지 추가
      const page = currentPdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
      
      // 헤더
      const headerHeight = 25;
      page.drawRectangle({
        x: MARGIN,
        y: A4_HEIGHT - MARGIN - headerHeight,
        width: CONTENT_WIDTH,
        height: headerHeight,
        color: rgb(0.95, 0.95, 0.95),
      });
      
      drawText(page, {
        x: MARGIN + 10,
        y: A4_HEIGHT - MARGIN - 17,
        text: `[${tabName}] ${doc.category || '증빙자료'} - ${doc.fileName}`,
        font: currentFonts.bold,
        size: 10,
        maxWidth: CONTENT_WIDTH - 20,
      });
      
      // 이미지 영역
      const imageAreaTop = A4_HEIGHT - MARGIN - headerHeight - 15;
      const imageAreaHeight = imageAreaTop - MARGIN - 30;
      
      // 이미지 삽입
      const embeddedImage = format === 'png' 
        ? await currentPdfDoc.embedPng(compressedBuffer)
        : await currentPdfDoc.embedJpg(compressedBuffer);
      
      const imgDims = embeddedImage.scale(1);
      const maxWidth = CONTENT_WIDTH - 20;
      const maxHeight = imageAreaHeight - 20;
      
      const scaleX = maxWidth / imgDims.width;
      const scaleY = maxHeight / imgDims.height;
      const scale = Math.min(scaleX, scaleY, 1);
      
      const drawWidth = imgDims.width * scale;
      const drawHeight = imgDims.height * scale;
      
      const drawX = MARGIN + (CONTENT_WIDTH - drawWidth) / 2;
      const drawY = MARGIN + 30 + (imageAreaHeight - drawHeight) / 2;
      
      page.drawImage(embeddedImage, {
        x: drawX,
        y: drawY,
        width: drawWidth,
        height: drawHeight,
      });
      
      // 푸터
      drawText(page, {
        x: MARGIN,
        y: MARGIN + 10,
        text: `사고접수번호: ${accidentNo} | ${i + 1}/${documents.length}`,
        font: currentFonts.regular,
        size: 8,
        color: { r: 0.5, g: 0.5, b: 0.5 },
      });
      
      currentImageCount++;
      estimatedSize += estimatedImageSize;
      
    } catch (err: any) {
      console.error(`[pdf-lib] 이미지 처리 실패 (${doc.fileName}):`, err.message);
    }
  }
  
  // 마지막 PDF 저장
  if (currentImageCount > 0) {
    const pdfBytes = await currentPdfDoc.save();
    const partSuffix = currentPartIndex > 1 ? `_${currentPartIndex}` : '';
    results.push({
      tabName,
      fileName: `Evidence_${tabName}${partSuffix}.pdf`,
      buffer: Buffer.from(pdfBytes),
      pageCount: currentPdfDoc.getPageCount(),
      imageCount: currentImageCount,
    });
    
    console.log(`[pdf-lib] 탭 "${tabName}" 파트 ${currentPartIndex} 완료 - ${currentImageCount}개 이미지, ${Math.round(pdfBytes.length / 1024)}KB`);
  }
  
  return results;
}

// 탭별 증빙 PDF 생성 메인 함수
export async function generateEvidencePDFsByTab(
  caseId: string,
  selectedFileIds: string[]
): Promise<EvidencePdfResult[]> {
  console.log(`[pdf-lib] ===== 탭별 증빙 PDF 생성 시작 =====`);
  console.log(`[pdf-lib] 케이스: ${caseId}, 선택된 파일: ${selectedFileIds.length}개`);
  
  if (selectedFileIds.length === 0) {
    console.log('[pdf-lib] 선택된 파일 없음');
    return [];
  }
  
  // 케이스 정보
  const [caseData] = await db.select().from(cases).where(eq(cases.id, caseId));
  if (!caseData) {
    throw new Error('케이스를 찾을 수 없습니다.');
  }
  
  const accidentNo = caseData.insuranceAccidentNo || caseData.caseNumber || 'UNKNOWN';
  
  // 선택된 문서 조회
  const selectedDocs = await db.select().from(caseDocuments)
    .where(
      and(
        eq(caseDocuments.caseId, caseId),
        inArray(caseDocuments.id, selectedFileIds)
      )
    );
  
  // 이미지만 필터링
  const imageDocs = selectedDocs.filter(doc => doc.fileType?.startsWith('image/'));
  console.log(`[pdf-lib] 이미지 문서: ${imageDocs.length}개`);
  
  // 탭별로 분류
  const docsByTab: Record<TabName, typeof imageDocs> = {
    '현장사진': [],
    '기본자료': [],
    '증빙자료': [],
    '청구자료': [],
  };
  
  for (const doc of imageDocs) {
    const tab = CATEGORY_TO_TAB[doc.category] || '현장사진'; // 기본값
    docsByTab[tab].push(doc);
  }
  
  // 폰트 로드
  const fontBytes = loadFontBytes();
  const tempPdfDoc = await PDFDocument.create();
  tempPdfDoc.registerFontkit(fontkit);
  const fonts = await embedFonts(tempPdfDoc);
  
  // 각 탭별 PDF 생성
  const allResults: EvidencePdfResult[] = [];
  
  for (const tabName of TAB_NAMES) {
    const tabDocs = docsByTab[tabName];
    if (tabDocs.length === 0) continue;
    
    const tabResults = await generateSingleTabEvidencePdf(
      tabName,
      tabDocs,
      caseData,
      fonts,
      accidentNo
    );
    
    allResults.push(...tabResults);
  }
  
  console.log(`[pdf-lib] ===== 탭별 증빙 PDF 생성 완료: ${allResults.length}개 파일 =====`);
  for (const result of allResults) {
    console.log(`[pdf-lib]   - ${result.fileName}: ${Math.round(result.buffer.length / 1024)}KB, ${result.imageCount}개 이미지, ${result.pageCount}페이지`);
  }
  
  return allResults;
}
