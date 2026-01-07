import { PDFDocument, PDFPage, PDFFont, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const MARGIN = 50;
const CONTENT_WIDTH = A4_WIDTH - (MARGIN * 2);

interface InvoiceData {
  recipientName: string;
  caseNumber: string;
  acceptanceDate: string;
  submissionDate: string;
  insuranceAccidentNo?: string;
  particulars: Array<{
    title: string;
    detail?: string;
    amount: number;
  }>;
  totalAmount: number;
  remarks?: string;
}

interface FontSet {
  regular: PDFFont;
  bold: PDFFont;
}

interface FontCache {
  regular: Buffer | null;
  semiBold: Buffer | null;
}

const fontCache: FontCache = {
  regular: null,
  semiBold: null,
};

function loadPretendardFonts(): { regular: Buffer; semiBold: Buffer } {
  const fontsDir = path.join(process.cwd(), 'server/fonts');
  
  if (!fontCache.regular) {
    const regularPath = path.join(fontsDir, 'Pretendard-Regular.ttf');
    if (!fs.existsSync(regularPath)) {
      throw new Error('Pretendard-Regular.ttf를 찾을 수 없습니다: ' + regularPath);
    }
    fontCache.regular = fs.readFileSync(regularPath);
    console.log(`[Invoice PDF] Pretendard-Regular 로드: ${(fontCache.regular.length / 1024).toFixed(1)}KB`);
  }
  
  if (!fontCache.semiBold) {
    const semiBoldPath = path.join(fontsDir, 'Pretendard-SemiBold.ttf');
    if (!fs.existsSync(semiBoldPath)) {
      throw new Error('Pretendard-SemiBold.ttf를 찾을 수 없습니다: ' + semiBoldPath);
    }
    fontCache.semiBold = fs.readFileSync(semiBoldPath);
    console.log(`[Invoice PDF] Pretendard-SemiBold 로드: ${(fontCache.semiBold.length / 1024).toFixed(1)}KB`);
  }
  
  return { regular: fontCache.regular, semiBold: fontCache.semiBold };
}

function collectAllInvoiceText(data: InvoiceData): string {
  const texts: string[] = [
    // 헤더
    'INVOICE',
    // 정보 레이블
    '수 신', '수신', ':', '수임일자', '사고번호', '청구일자',
    // 테이블 헤더
    'PARTICULARS', 'AMOUNT', 'TOTAL AMOUNT', 'TOTAL',
    // 계좌 정보 박스
    '아래의 계좌로 입금 부탁드립니다.',
    '은행명', '은행', '계좌번호', '예금주', '사업자등록번호', '사업자 등록번호',
    '신한은행', '신한', '㈜플록슨', '플록슨',
    '140-015-744120', '517-89-03490',
    // 푸터
    'FLOXN., Inc', 'FLOXN',
    // 비고
    '비 고', '비고',
    // 동적 데이터
    data.recipientName || '-',
    data.caseNumber || '-',
    data.insuranceAccidentNo || '-',
    formatDate(data.acceptanceDate),
    formatDate(data.submissionDate),
    formatAmount(data.totalAmount),
    data.remarks || '',
    // 특수 문자 및 숫자
    '0123456789',
    ',원₩.-/()[]{}:;',
    '㈜株',
    // 흔히 사용되는 한글 문자
    '가나다라마바사아자차카타파하',
    '보험사손해방지비용대물복구청구금액합계',
    '접수등록번호일자',
  ];
  
  // 항목 데이터
  for (const item of data.particulars) {
    texts.push(item.title || '');
    texts.push(item.detail || '');
    texts.push(formatAmount(item.amount));
  }
  
  const allText = texts.join('');
  const uniqueChars = Array.from(new Set(allText.split(''))).join('');
  
  console.log(`[Invoice PDF] 수집된 고유 문자 수: ${uniqueChars.length}개`);
  console.log(`[Invoice PDF] 샘플 문자: ${uniqueChars.substring(0, 50)}...`);
  
  return uniqueChars;
}

async function embedPretendardFonts(pdfDoc: PDFDocument): Promise<FontSet> {
  pdfDoc.registerFontkit(fontkit);
  
  const { regular, semiBold } = loadPretendardFonts();
  
  console.log(`[Invoice PDF] ========== 폰트 임베딩 (pdf-lib subset) ==========`);
  console.log(`[Invoice PDF] Regular 원본: ${(regular.length / 1024).toFixed(1)}KB`);
  console.log(`[Invoice PDF] SemiBold 원본: ${(semiBold.length / 1024).toFixed(1)}KB`);
  
  // pdf-lib 내장 서브셋팅 사용 - 실제 사용된 글리프만 임베드됨
  const regularFont = await pdfDoc.embedFont(regular, { subset: true });
  const semiBoldFont = await pdfDoc.embedFont(semiBold, { subset: true });
  
  console.log(`[Invoice PDF] 폰트 임베딩 완료 (subset: true)`);
  console.log(`[Invoice PDF] =====================================================`);
  
  return { regular: regularFont, bold: semiBoldFont };
}

function measureTextWidth(text: string, font: PDFFont, size: number): number {
  try {
    return font.widthOfTextAtSize(text, size);
  } catch {
    return text.length * size * 0.5;
  }
}

function formatAmount(amount: number): string {
  return amount.toLocaleString('ko-KR') + '원';
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) {
    return new Date().toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).replace(/\. /g, '.').replace(/\.$/, '');
  }
  
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).replace(/\. /g, '.').replace(/\.$/, '');
  } catch {
    return dateStr;
  }
}

function drawTextLine(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  size: number,
  color: { r: number; g: number; b: number } = { r: 0, g: 0, b: 0 }
): void {
  try {
    page.drawText(text, {
      x,
      y,
      size,
      font,
      color: rgb(color.r, color.g, color.b),
    });
  } catch (e) {
    console.warn(`[invoice-pdf] Failed to draw text: "${text.substring(0, 20)}..."`);
  }
}

function drawCenteredText(
  page: PDFPage,
  text: string,
  y: number,
  font: PDFFont,
  size: number,
  color: { r: number; g: number; b: number } = { r: 0, g: 0, b: 0 }
): void {
  const textWidth = measureTextWidth(text, font, size);
  const x = (A4_WIDTH - textWidth) / 2;
  drawTextLine(page, text, x, y, font, size, color);
}

function drawRightAlignedText(
  page: PDFPage,
  text: string,
  rightX: number,
  y: number,
  font: PDFFont,
  size: number,
  color: { r: number; g: number; b: number } = { r: 0, g: 0, b: 0 }
): void {
  const textWidth = measureTextWidth(text, font, size);
  const x = rightX - textWidth;
  drawTextLine(page, text, x, y, font, size, color);
}

export async function generateInvoicePdf(data: InvoiceData): Promise<Buffer> {
  console.log('[Invoice PDF] Generating PDF with Pretendard (pdf-lib subset)...');
  
  // 진단 로깅 - 사용될 텍스트 수집
  collectAllInvoiceText(data);
  
  const pdfDoc = await PDFDocument.create();
  const fonts = await embedPretendardFonts(pdfDoc);
  
  const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
  
  let y = A4_HEIGHT - MARGIN;
  
  drawCenteredText(page, 'INVOICE', y, fonts.bold, 28);
  y -= 15;
  
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: A4_WIDTH - MARGIN, y },
    thickness: 2,
    color: rgb(0, 0, 0),
  });
  
  y -= 40;
  
  const leftColX = MARGIN;
  const rightColX = A4_WIDTH / 2 + 20;
  const labelWidth = 70;
  const fontSize = 11;
  const lineHeight = 20;
  
  drawTextLine(page, '수 신', leftColX, y, fonts.bold, fontSize);
  drawTextLine(page, ':', leftColX + labelWidth, y, fonts.regular, fontSize);
  drawTextLine(page, data.recipientName || '-', leftColX + labelWidth + 15, y, fonts.regular, fontSize, { r: 0, g: 0.4, b: 0.8 });
  
  drawTextLine(page, '수임일자', rightColX, y, fonts.bold, fontSize);
  drawTextLine(page, ':', rightColX + labelWidth, y, fonts.regular, fontSize);
  drawTextLine(page, formatDate(data.acceptanceDate), rightColX + labelWidth + 15, y, fonts.regular, fontSize, { r: 0, g: 0.4, b: 0.8 });
  
  y -= lineHeight;
  
  drawTextLine(page, '사고번호', leftColX, y, fonts.bold, fontSize);
  drawTextLine(page, ':', leftColX + labelWidth, y, fonts.regular, fontSize);
  drawTextLine(page, data.insuranceAccidentNo || '-', leftColX + labelWidth + 15, y, fonts.regular, fontSize, { r: 0, g: 0.4, b: 0.8 });
  
  drawTextLine(page, '청구일자', rightColX, y, fonts.bold, fontSize);
  drawTextLine(page, ':', rightColX + labelWidth, y, fonts.regular, fontSize);
  drawTextLine(page, formatDate(data.submissionDate), rightColX + labelWidth + 15, y, fonts.regular, fontSize, { r: 0, g: 0.4, b: 0.8 });
  
  y -= 40;
  
  const tableX = MARGIN;
  const tableWidth = CONTENT_WIDTH;
  const particularsColWidth = tableWidth * 0.65;
  const amountColWidth = tableWidth * 0.35;
  const headerHeight = 30;
  const cellPadding = 10;
  
  page.drawRectangle({
    x: tableX,
    y: y - headerHeight,
    width: particularsColWidth,
    height: headerHeight,
    color: rgb(0.95, 0.95, 0.95),
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });
  
  page.drawRectangle({
    x: tableX + particularsColWidth,
    y: y - headerHeight,
    width: amountColWidth,
    height: headerHeight,
    color: rgb(0.95, 0.95, 0.95),
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });
  
  const headerTextY = y - headerHeight / 2 - 5;
  const particularsHeaderWidth = measureTextWidth('PARTICULARS', fonts.bold, 12);
  drawTextLine(page, 'PARTICULARS', tableX + (particularsColWidth - particularsHeaderWidth) / 2, headerTextY, fonts.bold, 12);
  
  const amountHeaderWidth = measureTextWidth('AMOUNT', fonts.bold, 12);
  drawTextLine(page, 'AMOUNT', tableX + particularsColWidth + (amountColWidth - amountHeaderWidth) / 2, headerTextY, fonts.bold, 12);
  
  y -= headerHeight;
  
  const itemLineHeight = 18;
  const detailLineHeight = 14;
  let contentHeight = 20;
  
  for (const item of data.particulars) {
    contentHeight += itemLineHeight;
    if (item.detail) {
      contentHeight += detailLineHeight;
    }
    contentHeight += 8;
  }
  
  contentHeight = Math.max(contentHeight, 100);
  
  page.drawRectangle({
    x: tableX,
    y: y - contentHeight,
    width: particularsColWidth,
    height: contentHeight,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });
  
  page.drawRectangle({
    x: tableX + particularsColWidth,
    y: y - contentHeight,
    width: amountColWidth,
    height: contentHeight,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });
  
  let itemY = y - cellPadding - 10;
  let amountY = y - cellPadding - 10;
  
  for (const item of data.particulars) {
    drawTextLine(page, `■ ${item.title}`, tableX + cellPadding, itemY, fonts.bold, 11);
    drawRightAlignedText(page, formatAmount(item.amount), tableX + tableWidth - cellPadding, amountY, fonts.regular, 11, { r: 0.8, g: 0, b: 0 });
    
    itemY -= itemLineHeight;
    amountY -= itemLineHeight;
    
    if (item.detail) {
      drawTextLine(page, item.detail, tableX + cellPadding + 16, itemY, fonts.regular, 9, { r: 0.4, g: 0.4, b: 0.4 });
      itemY -= detailLineHeight;
      amountY -= detailLineHeight;
    }
    
    itemY -= 4;
    amountY -= 4;
  }
  
  y -= contentHeight;
  
  const totalRowHeight = 30;
  
  page.drawRectangle({
    x: tableX,
    y: y - totalRowHeight,
    width: particularsColWidth,
    height: totalRowHeight,
    color: rgb(0.98, 0.98, 0.98),
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });
  
  page.drawRectangle({
    x: tableX + particularsColWidth,
    y: y - totalRowHeight,
    width: amountColWidth,
    height: totalRowHeight,
    color: rgb(0.98, 0.98, 0.98),
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });
  
  const totalTextY = y - totalRowHeight / 2 - 5;
  drawTextLine(page, 'TOTAL AMOUNT', tableX + cellPadding, totalTextY, fonts.bold, 12);
  drawRightAlignedText(page, formatAmount(data.totalAmount), tableX + tableWidth - cellPadding, totalTextY, fonts.bold, 13, { r: 0.8, g: 0, b: 0 });
  
  y -= totalRowHeight + 30;
  
  const accountBoxWidth = CONTENT_WIDTH;
  const accountBoxHeight = 120;
  
  page.drawRectangle({
    x: tableX,
    y: y - 25,
    width: accountBoxWidth,
    height: 25,
    color: rgb(0.97, 0.97, 0.97),
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });
  
  const accountHeaderText = '아래의 계좌로 입금 부탁드립니다.';
  const accountHeaderWidth = measureTextWidth(accountHeaderText, fonts.bold, 11);
  drawTextLine(page, accountHeaderText, tableX + (accountBoxWidth - accountHeaderWidth) / 2, y - 17, fonts.bold, 11);
  
  y -= 25;
  
  page.drawRectangle({
    x: tableX,
    y: y - (accountBoxHeight - 25),
    width: accountBoxWidth,
    height: accountBoxHeight - 25,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });
  
  const accountLabelX = tableX + 80;
  const accountValueX = tableX + 200;
  const accountLineHeight = 20;
  let accountY = y - 20;
  
  const accountData = [
    { label: '은행명', value: '신한은행' },
    { label: '계좌번호', value: '140-015-744120' },
    { label: '예금주', value: '주식회사 플록슨' },
    { label: '사업자등록번호', value: '517-89-03490' },
  ];
  
  for (const row of accountData) {
    const labelWidth = measureTextWidth(row.label, fonts.bold, 10);
    drawTextLine(page, row.label, accountLabelX + (80 - labelWidth) / 2, accountY, fonts.bold, 10);
    const valueWidth = measureTextWidth(row.value, fonts.regular, 10);
    drawTextLine(page, row.value, accountValueX + (200 - valueWidth) / 2, accountY, fonts.regular, 10);
    accountY -= accountLineHeight;
  }
  
  y -= accountBoxHeight + 30;
  
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: A4_WIDTH - MARGIN, y },
    thickness: 2,
    color: rgb(0, 0, 0),
  });
  
  y -= 25;
  
  drawCenteredText(page, 'FLOXN., Inc', y, fonts.bold, 16);
  
  const pdfBytes = await pdfDoc.save();
  const buffer = Buffer.from(pdfBytes);
  
  // 진단 로깅: PDF 구성 요소 분석
  console.log('[Invoice PDF] ========== 최종 PDF 결과 ==========');
  console.log(`[Invoice PDF] 페이지 수: ${pdfDoc.getPageCount()}`);
  console.log(`[Invoice PDF] 폰트: Pretendard (Regular + SemiBold)`);
  console.log(`[Invoice PDF] 이미지: 0개 (텍스트/표만 포함)`);
  console.log(`[Invoice PDF] 최종 PDF 크기: ${(buffer.length / 1024).toFixed(1)}KB (${(buffer.length / 1024 / 1024).toFixed(3)}MB)`);
  
  // 크기 검증
  const maxSizeMB = 3;
  if (buffer.length > maxSizeMB * 1024 * 1024) {
    console.warn(`[Invoice PDF] ⚠️ 경고: PDF 크기가 ${maxSizeMB}MB 초과 (${(buffer.length / 1024 / 1024).toFixed(2)}MB)`);
  } else {
    console.log(`[Invoice PDF] ✓ PDF 크기 정상 (${maxSizeMB}MB 이하)`);
  }
  console.log('[Invoice PDF] ==============================================');
  
  return buffer;
}

export async function sendInvoiceEmailWithAttachment(
  recipientEmail: string,
  invoiceData: InvoiceData,
  pdfBuffer: Buffer
): Promise<boolean> {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || '587');
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  
  if (!smtpHost || !smtpUser || !smtpPass) {
    throw new Error('SMTP 설정이 필요합니다. SMTP_HOST, SMTP_USER, SMTP_PASS를 확인해주세요.');
  }
  
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
  
  const fileName = `INVOICE_${invoiceData.caseNumber}_${Date.now()}.pdf`;
  const dateStr = new Date().toLocaleDateString('ko-KR', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  const emailContent = `안녕하세요,

INVOICE를 첨부하여 전송드립니다.

- 접수번호: ${invoiceData.caseNumber || '-'}
- 수임일자: ${formatDate(invoiceData.acceptanceDate)}
- 제출일자: ${formatDate(invoiceData.submissionDate)}
- 청구금액: ${formatAmount(invoiceData.totalAmount)}

첨부된 PDF 파일을 확인해 주세요.

감사합니다.
FLOXN 드림`;

  const mailOptions = {
    from: `FLOXN <${smtpUser}>`,
    to: recipientEmail,
    subject: `[FLOXN] INVOICE - ${invoiceData.caseNumber || dateStr}`,
    text: emailContent,
    attachments: [
      {
        filename: fileName,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  };
  
  try {
    await transporter.sendMail(mailOptions);
    console.log(`[Email] Invoice PDF sent to ${recipientEmail} with attachment`);
    return true;
  } catch (error) {
    console.error('[Email] Failed to send invoice email with attachment:', error);
    throw new Error('이메일 전송에 실패했습니다');
  }
}
