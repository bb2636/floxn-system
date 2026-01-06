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
  
  // Use NotoSansKR-Regular-static.ttf (16MB full Korean font)
  const regularTtf = path.join(fontsDir, 'NotoSansKR-Regular-static.ttf');
  // Bold uses same font as Regular (will appear same weight)
  const boldTtf = path.join(fontsDir, 'NotoSansKR-Regular-static.ttf');
  
  let regular: Buffer | null = null;
  let bold: Buffer | null = null;
  
  try {
    if (fs.existsSync(regularTtf)) {
      regular = fs.readFileSync(regularTtf);
      console.log(`[pdf-lib] NotoSansKR-Regular-static.ttf 로드 완료 (${Math.round(regular.length / 1024 / 1024)}MB)`);
    }
  } catch (err) {
    console.error('[pdf-lib] NotoSansKR-Regular-static.ttf 로드 실패:', err);
  }
  
  try {
    if (fs.existsSync(boldTtf)) {
      bold = fs.readFileSync(boldTtf);
      console.log(`[pdf-lib] Bold 폰트 로드 완료`);
    }
  } catch (err) {
    console.error('[pdf-lib] Bold 폰트 로드 실패:', err);
  }
  
  if (!regular || !bold) {
    throw new Error('한글 폰트를 로드할 수 없습니다. server/fonts 디렉토리에 NotoSansKR-Regular-static.ttf 파일이 있는지 확인하세요.');
  }
  
  cachedFonts = { regular, bold };
  return cachedFonts;
}

async function embedFonts(pdfDoc: PDFDocument): Promise<FontSet> {
  pdfDoc.registerFontkit(fontkit);
  
  const fontBytes = loadFontBytes();
  
  const regular = await pdfDoc.embedFont(fontBytes.regular);
  const bold = await pdfDoc.embedFont(fontBytes.bold);
  
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
  
  drawText(page, {
    x: MARGIN,
    y: y - 40,
    text: '현장출동확인서',
    font: fonts.bold,
    size: 22,
    maxWidth: CONTENT_WIDTH,
    align: 'center',
  });
  
  y -= 80;
  
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: A4_WIDTH - MARGIN, y },
    thickness: 1,
    color: rgb(0.3, 0.3, 0.3),
  });
  
  y -= 30;
  
  drawText(page, {
    x: MARGIN,
    y,
    text: '수 신',
    font: fonts.bold,
    size: 12,
  });
  
  drawText(page, {
    x: MARGIN + 50,
    y,
    text: `${caseData.insuranceCompany || ''} 귀중`,
    font: fonts.regular,
    size: 12,
  });
  
  y -= 40;
  
  const fullAddress = [caseData.insuredAddress, caseData.insuredAddressDetail]
    .filter(Boolean).join(' ');
  
  const dispatchDateTime = [caseData.visitDate, caseData.visitTime]
    .filter(Boolean).join(' ');
  
  const tableRows: TableCell[][] = [
    [
      { text: '사고번호', width: 100, isHeader: true, align: 'center' },
      { text: caseData.insuranceAccidentNo || '-', width: 150, align: 'left' },
      { text: '피보험자', width: 100, isHeader: true, align: 'center' },
      { text: caseData.insuredName || caseData.victimName || '-', width: 165, align: 'left' },
    ],
    [
      { text: '출동담당자', width: 100, isHeader: true, align: 'center' },
      { text: caseData.assignedPartnerManager || partnerData?.name || '-', width: 150, align: 'left' },
      { text: '협력업체', width: 100, isHeader: true, align: 'center' },
      { text: caseData.assignedPartner || '-', width: 165, align: 'left' },
    ],
    [
      { text: '현장주소', width: 100, isHeader: true, align: 'center' },
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
    rowHeight: 26,
  });
  
  y -= 30;
  
  const confirmationText = `위 사고와 관련하여 현장에 방문, 피해 상황 조사 및 복구공사 착수 여부를 확인하였기에 관련 서류(현장사진 및 견적서) 첨부하여 확인서를 제출합니다.`;
  
  y = drawText(page, {
    x: MARGIN,
    y,
    text: confirmationText,
    font: fonts.regular,
    size: 11,
    maxWidth: CONTENT_WIDTH,
    lineHeight: 1.8,
  });
  
  y -= 40;
  
  drawText(page, {
    x: MARGIN,
    y,
    text: formatDate(new Date().toISOString()),
    font: fonts.regular,
    size: 12,
    maxWidth: CONTENT_WIDTH,
    align: 'center',
  });
  
  y -= 60;
  
  const senderTableRows: TableCell[][] = [
    [
      { text: '업 체 명', width: 80, isHeader: true, align: 'center' },
      { text: caseData.assignedPartner || '-', width: 200, align: 'left' },
    ],
    [
      { text: '담 당 자', width: 80, isHeader: true, align: 'center' },
      { text: caseData.assignedPartnerManager || partnerData?.name || '-', width: 200, align: 'left' },
    ],
    [
      { text: '연 락 처', width: 80, isHeader: true, align: 'center' },
      { text: caseData.assignedPartnerContact || partnerData?.phone || '-', width: 200, align: 'left' },
    ],
  ];
  
  drawTable(page, {
    x: A4_WIDTH - MARGIN - 280,
    y,
    rows: senderTableRows,
    fonts,
    fontSize: 10,
    rowHeight: 24,
  });
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
  
  page.drawRectangle({
    x: MARGIN,
    y: y - 35,
    width: CONTENT_WIDTH,
    height: 35,
    color: rgb(0.95, 0.95, 0.95),
    borderColor: rgb(0.3, 0.3, 0.3),
    borderWidth: 1,
  });
  
  drawText(page, {
    x: MARGIN,
    y: y - 25,
    text: '출동확인서',
    font: fonts.bold,
    size: 16,
    maxWidth: CONTENT_WIDTH,
    align: 'center',
  });
  
  y -= 50;
  
  const insuredFullAddress = [caseData.insuredAddress, caseData.insuredAddressDetail]
    .filter(Boolean).join(' ');
  
  const visitDateTime = [caseData.visitDate, caseData.visitTime]
    .filter(Boolean).join(' ');
  
  const accidentDateTime = [caseData.accidentDate, caseData.accidentTime]
    .filter(Boolean).join(' ');
  
  drawText(page, {
    x: MARGIN,
    y,
    text: '■ 현장정보',
    font: fonts.bold,
    size: 11,
  });
  
  y -= 20;
  
  const fieldInfoRows: TableCell[][] = [
    [
      { text: '방문일시', width: 90, isHeader: true, align: 'center' },
      { text: visitDateTime || '-', width: 168, align: 'left' },
      { text: '출동담당자', width: 90, isHeader: true, align: 'center' },
      { text: caseData.assignedPartnerManager || partnerData?.name || '-', width: 167, align: 'left' },
    ],
    [
      { text: '출동담당지', width: 90, isHeader: true, align: 'center' },
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
    rowHeight: 22,
  });
  
  y -= 20;
  
  drawText(page, {
    x: MARGIN,
    y,
    text: '■ 사고 내용',
    font: fonts.bold,
    size: 11,
  });
  
  y -= 20;
  
  const accidentInfoRows: TableCell[][] = [
    [
      { text: '사고일시', width: 90, isHeader: true, align: 'center' },
      { text: accidentDateTime || '-', width: 168, align: 'left' },
      { text: '사고유형', width: 90, isHeader: true, align: 'center' },
      { text: caseData.accidentCategory || '-', width: 167, align: 'left' },
    ],
    [
      { text: '사고원인', width: 90, isHeader: true, align: 'center' },
      { text: caseData.accidentCause || '-', width: 425, align: 'left' },
    ],
    [
      { text: '현장 특이사항', width: 90, isHeader: true, align: 'center' },
      { text: caseData.siteNotes || caseData.specialNotes || '특이사항 없음', width: 425, align: 'left' },
    ],
  ];
  
  y = drawTable(page, {
    x: MARGIN,
    y,
    rows: accidentInfoRows,
    fonts,
    fontSize: 9,
    rowHeight: 22,
  });
  
  y -= 20;
  
  drawText(page, {
    x: MARGIN,
    y,
    text: '■ 피해/복구 내역',
    font: fonts.bold,
    size: 11,
  });
  
  y -= 20;
  
  const repairHeaderRow: TableCell[] = [
    { text: '번호', width: 40, isHeader: true, align: 'center' },
    { text: '구분', width: 80, isHeader: true, align: 'center' },
    { text: '위치', width: 90, isHeader: true, align: 'center' },
    { text: '공사내용', width: 130, isHeader: true, align: 'center' },
    { text: '면적(㎡)', width: 80, isHeader: true, align: 'center' },
    { text: '비고', width: 95, isHeader: true, align: 'center' },
  ];
  
  const repairDataRows: TableCell[][] = [repairHeaderRow];
  
  if (repairItems && repairItems.length > 0) {
    repairItems.forEach((item, index) => {
      const areaM2 = item.repairArea ? Number(item.repairArea).toFixed(2) : '-';
      repairDataRows.push([
        { text: String(index + 1), width: 40, align: 'center' },
        { text: item.category || '-', width: 80, align: 'center' },
        { text: item.location || '-', width: 90, align: 'left' },
        { text: item.workName || '-', width: 130, align: 'left' },
        { text: `${areaM2} ㎡`, width: 80, align: 'right' },
        { text: item.note || '-', width: 95, align: 'left' },
      ]);
    });
  } else {
    repairDataRows.push([
      { text: '등록된 복구 내역이 없습니다.', width: 515, align: 'center' },
    ]);
  }
  
  y = drawTable(page, {
    x: MARGIN,
    y,
    rows: repairDataRows,
    fonts,
    fontSize: 8,
    rowHeight: 20,
  });
  
  y -= 30;
  
  drawText(page, {
    x: MARGIN,
    y,
    text: `작성일: ${formatDate(new Date().toISOString())}`,
    font: fonts.regular,
    size: 9,
  });
  
  drawText(page, {
    x: A4_WIDTH - MARGIN - 150,
    y,
    text: `작성자: ${caseData.assignedPartnerManager || partnerData?.name || '-'}`,
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
    
    drawText(page, {
      x: A4_WIDTH - MARGIN - 150,
      y: A4_HEIGHT - MARGIN - 22,
      text: `접수번호: ${caseData.caseNumber || ''}`,
      font: fonts.regular,
      size: 9,
      color: { r: 1, g: 1, b: 1 },
    });
    
    const firstImage = imageDocs[i];
    const firstY = A4_HEIGHT - MARGIN - 30 - spacing - headerHeight - imageHeight;
    
    page.drawRectangle({
      x: MARGIN,
      y: firstY + imageHeight,
      width: CONTENT_WIDTH,
      height: headerHeight,
      color: rgb(0.96, 0.96, 0.96),
      borderColor: rgb(0.8, 0.8, 0.8),
      borderWidth: 0.5,
    });
    
    drawText(page, {
      x: MARGIN + 10,
      y: firstY + imageHeight + 8,
      text: `${firstImage.tab} - ${firstImage.doc.category || ''}`,
      font: fonts.regular,
      size: 9,
    });
    
    page.drawRectangle({
      x: MARGIN,
      y: firstY,
      width: CONTENT_WIDTH,
      height: imageHeight,
      borderColor: rgb(0.8, 0.8, 0.8),
      borderWidth: 0.5,
    });
    
    const firstResult = await embedImage(
      pdfDoc, page, firstImage.doc.fileData,
      MARGIN + 5, firstY + 5, imageWidth - 10, imageHeight - 10,
      processingConfig
    );
    
    if (!firstResult.success) {
      drawErrorSection(page, fonts, MARGIN + 5, firstY + 5, imageWidth - 10, imageHeight - 10,
        firstImage.doc.fileName, firstResult.error || '첨부 실패');
      errors.push({ fileName: firstImage.doc.fileName, reason: firstResult.error || '첨부 실패' });
    }
    
    if (imageDocs[i + 1]) {
      const secondImage = imageDocs[i + 1];
      const secondY = firstY - spacing - headerHeight - imageHeight;
      
      page.drawRectangle({
        x: MARGIN,
        y: secondY + imageHeight,
        width: CONTENT_WIDTH,
        height: headerHeight,
        color: rgb(0.96, 0.96, 0.96),
        borderColor: rgb(0.8, 0.8, 0.8),
        borderWidth: 0.5,
      });
      
      drawText(page, {
        x: MARGIN + 10,
        y: secondY + imageHeight + 8,
        text: `${secondImage.tab} - ${secondImage.doc.category || ''}`,
        font: fonts.regular,
        size: 9,
      });
      
      page.drawRectangle({
        x: MARGIN,
        y: secondY,
        width: CONTENT_WIDTH,
        height: imageHeight,
        borderColor: rgb(0.8, 0.8, 0.8),
        borderWidth: 0.5,
      });
      
      const secondResult = await embedImage(
        pdfDoc, page, secondImage.doc.fileData,
        MARGIN + 5, secondY + 5, imageWidth - 10, imageHeight - 10,
        processingConfig
      );
      
      if (!secondResult.success) {
        drawErrorSection(page, fonts, MARGIN + 5, secondY + 5, imageWidth - 10, imageHeight - 10,
          secondImage.doc.fileName, secondResult.error || '첨부 실패');
        errors.push({ fileName: secondImage.doc.fileName, reason: secondResult.error || '첨부 실패' });
      }
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
  
  drawText(page, {
    x: MARGIN,
    y: y - 5,
    text: '현장 피해/복구 면적 산출표',
    font: fonts.bold,
    size: 14,
  });
  
  page.drawLine({
    start: { x: MARGIN, y: y - 20 },
    end: { x: A4_WIDTH - MARGIN, y: y - 20 },
    thickness: 1,
    color: rgb(0, 0, 0),
  });
  
  y -= 35;
  
  const fullAddress = [caseData.insuredAddress, caseData.insuredAddressDetail]
    .filter(Boolean).join(' ');
  
  const headerRows: TableCell[][] = [
    [
      { text: '접수번호', width: 70, isHeader: true, align: 'center' },
      { text: caseData.caseNumber || '-', width: 100, align: 'left' },
      { text: '고객사', width: 60, isHeader: true, align: 'center' },
      { text: caseData.insuranceCompany || '-', width: 100, align: 'left' },
      { text: '사고번호', width: 70, isHeader: true, align: 'center' },
      { text: caseData.insuranceAccidentNo || '-', width: 115, align: 'left' },
    ],
    [
      { text: '장소', width: 70, isHeader: true, align: 'center' },
      { text: fullAddress || '-', width: 260, align: 'left' },
      { text: '작성일자', width: 70, isHeader: true, align: 'center' },
      { text: formatDate(new Date().toISOString()), width: 115, align: 'left' },
    ],
  ];
  
  y = drawTable(page, {
    x: MARGIN,
    y,
    rows: headerRows,
    fonts,
    fontSize: 8,
    rowHeight: 20,
  });
  
  y -= 15;
  
  drawText(page, {
    x: A4_WIDTH - MARGIN - 60,
    y,
    text: '단위: ㎡',
    font: fonts.regular,
    size: 8,
  });
  
  y -= 15;
  
  const areaTableHeader: TableCell[] = [
    { text: '구분', width: 50, isHeader: true, align: 'center' },
    { text: '공사내용', width: 70, isHeader: true, align: 'center' },
    { text: '공사분류', width: 70, isHeader: true, align: 'center' },
    { text: '피해면적', width: 50, isHeader: true, align: 'center' },
    { text: '가로', width: 40, isHeader: true, align: 'center' },
    { text: '세로', width: 40, isHeader: true, align: 'center' },
    { text: '복구면적', width: 50, isHeader: true, align: 'center' },
    { text: '가로', width: 40, isHeader: true, align: 'center' },
    { text: '세로', width: 40, isHeader: true, align: 'center' },
    { text: '비고', width: 65, isHeader: true, align: 'center' },
  ];
  
  const areaTableRows: TableCell[][] = [areaTableHeader];
  
  if (estimateRowsData && estimateRowsData.length > 0) {
    for (const row of estimateRowsData) {
      const damageW = row.damageWidth ? Number(row.damageWidth).toFixed(1) : '0.0';
      const damageH = row.damageHeight ? Number(row.damageHeight).toFixed(1) : '0.0';
      const damageAreaM2 = row.damageArea ? Number(row.damageArea).toFixed(1) : '0.0';
      
      const repairW = row.repairWidth ? Number(row.repairWidth).toFixed(1) : '0.0';
      const repairH = row.repairHeight ? Number(row.repairHeight).toFixed(1) : '0.0';
      const repairAreaM2 = row.repairArea ? Number(row.repairArea).toFixed(1) : '0.0';
      
      areaTableRows.push([
        { text: row.category || '-', width: 50, align: 'center' },
        { text: row.location || '-', width: 70, align: 'left' },
        { text: row.workName || '-', width: 70, align: 'left' },
        { text: damageAreaM2, width: 50, align: 'right' },
        { text: damageW, width: 40, align: 'right' },
        { text: damageH, width: 40, align: 'right' },
        { text: repairAreaM2, width: 50, align: 'right' },
        { text: repairW, width: 40, align: 'right' },
        { text: repairH, width: 40, align: 'right' },
        { text: row.note || '-', width: 65, align: 'left' },
      ]);
    }
  } else {
    areaTableRows.push([
      { text: '등록된 복구면적 데이터가 없습니다.', width: 515, align: 'center' },
    ]);
  }
  
  drawTable(page, {
    x: MARGIN,
    y,
    rows: areaTableRows,
    fonts,
    fontSize: 7,
    rowHeight: 18,
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
  
  page.drawRectangle({
    x: MARGIN,
    y: y - 30,
    width: CONTENT_WIDTH,
    height: 30,
    color: rgb(0.95, 0.95, 0.95),
    borderColor: rgb(0.3, 0.3, 0.3),
    borderWidth: 1,
  });
  
  drawText(page, {
    x: MARGIN,
    y: y - 22,
    text: '견 적 서',
    font: fonts.bold,
    size: 16,
    maxWidth: CONTENT_WIDTH,
    align: 'center',
  });
  
  y -= 45;
  
  const fullAddress = [caseData.insuredAddress, caseData.insuredAddressDetail]
    .filter(Boolean).join(' ');
  
  const estimateInfoRows: TableCell[][] = [
    [
      { text: '접수번호', width: 80, isHeader: true, align: 'center' },
      { text: caseData.caseNumber || '-', width: 178, align: 'left' },
      { text: '고객사', width: 80, isHeader: true, align: 'center' },
      { text: caseData.insuranceCompany || '-', width: 177, align: 'left' },
    ],
    [
      { text: '피보험자', width: 80, isHeader: true, align: 'center' },
      { text: caseData.insuredName || caseData.victimName || '-', width: 178, align: 'left' },
      { text: '사고번호', width: 80, isHeader: true, align: 'center' },
      { text: caseData.insuranceAccidentNo || '-', width: 177, align: 'left' },
    ],
    [
      { text: '현장주소', width: 80, isHeader: true, align: 'center' },
      { text: fullAddress || '-', width: 435, align: 'left' },
    ],
  ];
  
  y = drawTable(page, {
    x: MARGIN,
    y,
    rows: estimateInfoRows,
    fonts,
    fontSize: 9,
    rowHeight: 22,
  });
  
  y -= 20;
  
  drawText(page, {
    x: MARGIN,
    y,
    text: '■ 노무비',
    font: fonts.bold,
    size: 10,
  });
  
  y -= 15;
  
  let laborCostData: any[] = [];
  if (estimateData?.laborCost) {
    try {
      const rawLaborData = typeof estimateData.laborCost === 'string'
        ? JSON.parse(estimateData.laborCost)
        : estimateData.laborCost;
      if (Array.isArray(rawLaborData)) {
        laborCostData = rawLaborData;
      } else if (rawLaborData.rows && Array.isArray(rawLaborData.rows)) {
        laborCostData = rawLaborData.rows;
      }
    } catch {}
  }
  
  const laborHeader: TableCell[] = [
    { text: '번호', width: 35, isHeader: true, align: 'center' },
    { text: '직종', width: 100, isHeader: true, align: 'center' },
    { text: '단가', width: 90, isHeader: true, align: 'center' },
    { text: '투입일', width: 60, isHeader: true, align: 'center' },
    { text: '인원', width: 50, isHeader: true, align: 'center' },
    { text: '금액', width: 90, isHeader: true, align: 'center' },
    { text: '비고', width: 90, isHeader: true, align: 'center' },
  ];
  
  const laborRows: TableCell[][] = [laborHeader];
  let laborTotal = 0;
  
  if (laborCostData.length > 0) {
    laborCostData.forEach((row, idx) => {
      const unitPrice = Number(row.unitPrice) || 0;
      const days = Number(row.days) || 0;
      const workers = Number(row.workers) || 0;
      const amount = unitPrice * days * workers;
      laborTotal += amount;
      
      laborRows.push([
        { text: String(idx + 1), width: 35, align: 'center' },
        { text: row.jobType || '-', width: 100, align: 'left' },
        { text: formatNumber(unitPrice), width: 90, align: 'right' },
        { text: String(days), width: 60, align: 'center' },
        { text: String(workers), width: 50, align: 'center' },
        { text: formatNumber(amount), width: 90, align: 'right' },
        { text: row.note || '-', width: 90, align: 'left' },
      ]);
    });
  } else {
    laborRows.push([
      { text: '등록된 노무비 데이터가 없습니다.', width: 515, align: 'center' },
    ]);
  }
  
  laborRows.push([
    { text: '소계', width: 425, isHeader: true, align: 'right' },
    { text: formatNumber(laborTotal), width: 90, align: 'right' },
  ]);
  
  y = drawTable(page, {
    x: MARGIN,
    y,
    rows: laborRows,
    fonts,
    fontSize: 8,
    rowHeight: 18,
  });
  
  y -= 20;
  
  drawText(page, {
    x: MARGIN,
    y,
    text: '■ 자재비',
    font: fonts.bold,
    size: 10,
  });
  
  y -= 15;
  
  let materialCostData: any[] = [];
  if (estimateData?.materialCost) {
    try {
      const rawMaterialData = typeof estimateData.materialCost === 'string'
        ? JSON.parse(estimateData.materialCost)
        : estimateData.materialCost;
      if (Array.isArray(rawMaterialData)) {
        materialCostData = rawMaterialData;
      } else if (rawMaterialData.rows && Array.isArray(rawMaterialData.rows)) {
        materialCostData = rawMaterialData.rows;
      }
    } catch {}
  }
  
  const materialHeader: TableCell[] = [
    { text: '번호', width: 35, isHeader: true, align: 'center' },
    { text: '자재명', width: 140, isHeader: true, align: 'center' },
    { text: '규격', width: 80, isHeader: true, align: 'center' },
    { text: '단위', width: 50, isHeader: true, align: 'center' },
    { text: '수량', width: 50, isHeader: true, align: 'center' },
    { text: '단가', width: 70, isHeader: true, align: 'center' },
    { text: '금액', width: 90, isHeader: true, align: 'center' },
  ];
  
  const materialRows: TableCell[][] = [materialHeader];
  let materialTotal = 0;
  
  if (materialCostData.length > 0) {
    materialCostData.forEach((row, idx) => {
      const qty = Number(row.quantity) || 0;
      const unitPrice = Number(row.unitPrice) || 0;
      const amount = qty * unitPrice;
      materialTotal += amount;
      
      materialRows.push([
        { text: String(idx + 1), width: 35, align: 'center' },
        { text: row.materialName || '-', width: 140, align: 'left' },
        { text: row.spec || '-', width: 80, align: 'left' },
        { text: row.unit || '-', width: 50, align: 'center' },
        { text: String(qty), width: 50, align: 'center' },
        { text: formatNumber(unitPrice), width: 70, align: 'right' },
        { text: formatNumber(amount), width: 90, align: 'right' },
      ]);
    });
  } else {
    materialRows.push([
      { text: '등록된 자재비 데이터가 없습니다.', width: 515, align: 'center' },
    ]);
  }
  
  materialRows.push([
    { text: '소계', width: 425, isHeader: true, align: 'right' },
    { text: formatNumber(materialTotal), width: 90, align: 'right' },
  ]);
  
  y = drawTable(page, {
    x: MARGIN,
    y,
    rows: materialRows,
    fonts,
    fontSize: 8,
    rowHeight: 18,
  });
  
  y -= 25;
  
  const subtotal = laborTotal + materialTotal;
  const vatRate = 0.1;
  const vat = Math.round(subtotal * vatRate);
  const grandTotal = subtotal + vat;
  
  const totalRows: TableCell[][] = [
    [
      { text: '노무비 합계', width: 150, isHeader: true, align: 'center' },
      { text: formatNumber(laborTotal), width: 108, align: 'right' },
    ],
    [
      { text: '자재비 합계', width: 150, isHeader: true, align: 'center' },
      { text: formatNumber(materialTotal), width: 108, align: 'right' },
    ],
    [
      { text: '합계', width: 150, isHeader: true, align: 'center' },
      { text: formatNumber(subtotal), width: 108, align: 'right' },
    ],
    [
      { text: '부가세(10%)', width: 150, isHeader: true, align: 'center' },
      { text: formatNumber(vat), width: 108, align: 'right' },
    ],
    [
      { text: '총계', width: 150, isHeader: true, align: 'center' },
      { text: formatNumber(grandTotal), width: 108, align: 'right' },
    ],
  ];
  
  drawTable(page, {
    x: A4_WIDTH - MARGIN - 258,
    y,
    rows: totalRows,
    fonts,
    fontSize: 9,
    rowHeight: 20,
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
}

export async function generatePdfWithPdfLib(
  payload: PdfGenerationPayload,
  processingLevel: number = 0
): Promise<Buffer> {
  const { caseId, sections, evidence } = payload;
  const processingConfig = PROCESSING_LEVELS[processingLevel] || PROCESSING_LEVELS[0];
  
  console.log(`[pdf-lib] PDF 생성 시작 - 레벨 ${processingLevel}: ${processingConfig.maxDimension}px / ${processingConfig.quality}%`);
  
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
  
  if (sections.evidence && evidence.selectedFileIds.length > 0) {
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
