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
  
  // TTF 파일만 사용 (OTF는 "Not a CFF Font" 에러 발생)
  const regularPath = path.join(fontsDir, 'Pretendard-Regular.ttf');
  const semiBoldPath = path.join(fontsDir, 'Pretendard-SemiBold.ttf');
  
  console.log(`[Invoice PDF] ========== TTF 폰트 로딩 ==========`);
  console.log(`[Invoice PDF] Regular 경로: ${regularPath}`);
  console.log(`[Invoice PDF] SemiBold 경로: ${semiBoldPath}`);
  
  // 파일 존재 확인 - 없으면 즉시 에러
  if (!fs.existsSync(regularPath)) {
    throw new Error(`Pretendard-Regular.ttf를 찾을 수 없습니다: ${regularPath}`);
  }
  if (!fs.existsSync(semiBoldPath)) {
    throw new Error(`Pretendard-SemiBold.ttf를 찾을 수 없습니다: ${semiBoldPath}`);
  }
  
  // 파일 크기 확인 및 로그
  const regularStat = fs.statSync(regularPath);
  const semiBoldStat = fs.statSync(semiBoldPath);
  console.log(`[Invoice PDF] Regular 파일 크기: ${regularStat.size} bytes (${(regularStat.size / 1024 / 1024).toFixed(2)}MB)`);
  console.log(`[Invoice PDF] SemiBold 파일 크기: ${semiBoldStat.size} bytes (${(semiBoldStat.size / 1024 / 1024).toFixed(2)}MB)`);
  
  // 캐시된 버전과 크기가 다르면 재로드
  if (!fontCache.regular || fontCache.regular.length !== regularStat.size) {
    fontCache.regular = fs.readFileSync(regularPath);
    
    // 파일 시그니처 검증 (TTF: 0x00010000)
    const signature = fontCache.regular.slice(0, 4).toString('hex');
    console.log(`[Invoice PDF] Regular 시그니처: ${signature}`);
    
    // HTML/에러 페이지 감지 (<!DOCTYPE 또는 <html로 시작하는 경우)
    const firstChars = fontCache.regular.slice(0, 10).toString('utf8');
    if (firstChars.includes('<!') || firstChars.includes('<html')) {
      throw new Error(`Regular 폰트 파일이 HTML/에러 페이지입니다. 첫 10자: ${firstChars}`);
    }
    
    if (signature !== '00010000') {
      throw new Error(`Regular 폰트가 TTF 형식이 아닙니다. 시그니처: ${signature} (예상: 00010000)`);
    }
  }
  
  if (!fontCache.semiBold || fontCache.semiBold.length !== semiBoldStat.size) {
    fontCache.semiBold = fs.readFileSync(semiBoldPath);
    
    // 파일 시그니처 검증
    const signature = fontCache.semiBold.slice(0, 4).toString('hex');
    console.log(`[Invoice PDF] SemiBold 시그니처: ${signature}`);
    
    // HTML/에러 페이지 감지
    const firstChars = fontCache.semiBold.slice(0, 10).toString('utf8');
    if (firstChars.includes('<!') || firstChars.includes('<html')) {
      throw new Error(`SemiBold 폰트 파일이 HTML/에러 페이지입니다. 첫 10자: ${firstChars}`);
    }
    
    if (signature !== '00010000') {
      throw new Error(`SemiBold 폰트가 TTF 형식이 아닙니다. 시그니처: ${signature} (예상: 00010000)`);
    }
  }
  
  console.log(`[Invoice PDF] TTF 폰트 로딩 완료`);
  console.log(`[Invoice PDF] ================================`);
  
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
    '140-015-744120', '517-87-03490',
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
  
  console.log(`[Invoice PDF] ========== 폰트 임베딩 (subset: false - 전체 폰트) ==========`);
  
  // subset: false로 전체 폰트 임베드 (글자 깨짐 방지)
  let regularFont: PDFFont;
  let semiBoldFont: PDFFont;
  
  try {
    regularFont = await pdfDoc.embedFont(regular, { subset: false });
    console.log(`[Invoice PDF] Regular 폰트 임베딩 성공 (전체 폰트)`);
  } catch (error) {
    throw new Error(`Pretendard-Regular.ttf embedFont 실패: ${error}`);
  }
  
  try {
    semiBoldFont = await pdfDoc.embedFont(semiBold, { subset: false });
    console.log(`[Invoice PDF] SemiBold 폰트 임베딩 성공 (전체 폰트)`);
  } catch (error) {
    throw new Error(`Pretendard-SemiBold.ttf embedFont 실패: ${error}`);
  }
  
  console.log(`[Invoice PDF] 폰트 임베딩 완료 (subset: false)`);
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

let drawTextCallCount = 0;

function resetDrawTextCounter(): void {
  drawTextCallCount = 0;
}

function getDrawTextCount(): number {
  return drawTextCallCount;
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
  drawTextCallCount++;
  try {
    // 한 번의 drawText로 전체 텍스트 렌더링 (문자 단위 분리 금지)
    // characterSpacing, wordSpacing 사용 안함 (기본값 0)
    page.drawText(text, {
      x,
      y,
      size,
      font,
      color: rgb(color.r, color.g, color.b),
    });
  } catch (e) {
    console.warn(`[Invoice PDF] Failed to draw text: "${text.substring(0, 20)}..." - ${e}`);
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
  
  // drawText 호출 횟수 카운터 초기화
  resetDrawTextCounter();
  
  // 진단 로깅 - 사용될 텍스트 수집
  collectAllInvoiceText(data);
  
  const pdfDoc = await PDFDocument.create();
  const fonts = await embedPretendardFonts(pdfDoc);
  
  const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
  
  // === 1. 타이틀 섹션 ===
  let y = A4_HEIGHT - 60;
  
  // INVOICE 제목 (가운데 정렬)
  drawCenteredText(page, 'INVOICE', y, fonts.bold, 24);
  y -= 30;
  
  // 타이틀 아래 수평선
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: A4_WIDTH - MARGIN, y },
    thickness: 1.5,
    color: rgb(0, 0, 0),
  });
  
  // === 2. 정보 섹션 ===
  y -= 35;
  
  const leftColX = MARGIN;
  const rightColX = 320;
  const colonX1 = 95;
  const valueX1 = 110;
  const colonX2 = 395;
  const valueX2 = 410;
  const fontSize = 11;
  const lineHeight = 22;
  
  // 첫 번째 행: 수신 / 수임일자
  drawTextLine(page, '수 신', leftColX, y, fonts.regular, fontSize);
  drawTextLine(page, ':', colonX1, y, fonts.regular, fontSize);
  drawTextLine(page, data.recipientName || '-', valueX1, y, fonts.regular, fontSize, { r: 0.2, g: 0.4, b: 0.7 });
  
  drawTextLine(page, '수임일자', rightColX, y, fonts.regular, fontSize);
  drawTextLine(page, ':', colonX2, y, fonts.regular, fontSize);
  drawTextLine(page, formatDate(data.acceptanceDate), valueX2, y, fonts.regular, fontSize, { r: 0.2, g: 0.4, b: 0.7 });
  
  y -= lineHeight;
  
  // 두 번째 행: 사고번호 / 청구일자
  drawTextLine(page, '사고번호', leftColX, y, fonts.regular, fontSize);
  drawTextLine(page, ':', colonX1, y, fonts.regular, fontSize);
  drawTextLine(page, data.insuranceAccidentNo || data.caseNumber || '-', valueX1, y, fonts.regular, fontSize, { r: 0.2, g: 0.4, b: 0.7 });
  
  drawTextLine(page, '청구일자', rightColX, y, fonts.regular, fontSize);
  drawTextLine(page, ':', colonX2, y, fonts.regular, fontSize);
  drawTextLine(page, formatDate(data.submissionDate), valueX2, y, fonts.regular, fontSize, { r: 0.2, g: 0.4, b: 0.7 });
  
  // === 3. 테이블 섹션 ===
  y -= 45;
  
  const tableX = MARGIN;
  const tableWidth = CONTENT_WIDTH;
  const particularsColWidth = tableWidth * 0.70;
  const amountColWidth = tableWidth * 0.30;
  const headerHeight = 35;
  const cellPadding = 12;
  
  // 테이블 헤더 - PARTICULARS
  page.drawRectangle({
    x: tableX,
    y: y - headerHeight,
    width: particularsColWidth,
    height: headerHeight,
    color: rgb(0.96, 0.96, 0.96),
    borderColor: rgb(0, 0, 0),
    borderWidth: 0.5,
  });
  
  // 테이블 헤더 - AMOUNT
  page.drawRectangle({
    x: tableX + particularsColWidth,
    y: y - headerHeight,
    width: amountColWidth,
    height: headerHeight,
    color: rgb(0.96, 0.96, 0.96),
    borderColor: rgb(0, 0, 0),
    borderWidth: 0.5,
  });
  
  // 헤더 텍스트
  const headerTextY = y - headerHeight / 2 - 4;
  const particularsHeaderWidth = measureTextWidth('PARTICULARS', fonts.bold, 11);
  drawTextLine(page, 'PARTICULARS', tableX + (particularsColWidth - particularsHeaderWidth) / 2, headerTextY, fonts.bold, 11);
  
  const amountHeaderWidth = measureTextWidth('AMOUNT', fonts.bold, 11);
  drawTextLine(page, 'AMOUNT', tableX + particularsColWidth + (amountColWidth - amountHeaderWidth) / 2, headerTextY, fonts.bold, 11);
  
  y -= headerHeight;
  
  // 내용 행 높이 계산
  const itemRowHeight = 25;
  let contentHeight = 0;
  for (const item of data.particulars) {
    contentHeight += itemRowHeight;
    if (item.detail) {
      contentHeight += 18;
    }
  }
  contentHeight = Math.max(contentHeight + 30, 80);
  
  // 내용 셀 - PARTICULARS
  page.drawRectangle({
    x: tableX,
    y: y - contentHeight,
    width: particularsColWidth,
    height: contentHeight,
    borderColor: rgb(0, 0, 0),
    borderWidth: 0.5,
  });
  
  // 내용 셀 - AMOUNT
  page.drawRectangle({
    x: tableX + particularsColWidth,
    y: y - contentHeight,
    width: amountColWidth,
    height: contentHeight,
    borderColor: rgb(0, 0, 0),
    borderWidth: 0.5,
  });
  
  // 항목 렌더링
  let itemY = y - cellPadding - 12;
  
  for (const item of data.particulars) {
    // 항목 제목
    const itemTitle = '\u25A0 ' + item.title;
    drawTextLine(page, itemTitle, tableX + cellPadding, itemY, fonts.regular, 10);
    
    // 금액 (오른쪽 정렬, 빨간색)
    drawRightAlignedText(page, formatAmount(item.amount), tableX + tableWidth - cellPadding, itemY, fonts.regular, 11, { r: 0.8, g: 0, b: 0 });
    
    itemY -= itemRowHeight;
    
    // 상세 설명이 있으면 추가
    if (item.detail) {
      drawTextLine(page, item.detail, tableX + cellPadding + 18, itemY + 8, fonts.regular, 9, { r: 0.5, g: 0.5, b: 0.5 });
      itemY -= 18;
    }
  }
  
  y -= contentHeight;
  
  // TOTAL AMOUNT 행
  const totalRowHeight = 35;
  
  page.drawRectangle({
    x: tableX,
    y: y - totalRowHeight,
    width: particularsColWidth,
    height: totalRowHeight,
    color: rgb(0.98, 0.98, 0.98),
    borderColor: rgb(0, 0, 0),
    borderWidth: 0.5,
  });
  
  page.drawRectangle({
    x: tableX + particularsColWidth,
    y: y - totalRowHeight,
    width: amountColWidth,
    height: totalRowHeight,
    color: rgb(0.98, 0.98, 0.98),
    borderColor: rgb(0, 0, 0),
    borderWidth: 0.5,
  });
  
  const totalTextY = y - totalRowHeight / 2 - 4;
  drawTextLine(page, 'TOTAL AMOUNT', tableX + cellPadding, totalTextY, fonts.bold, 11);
  drawRightAlignedText(page, formatAmount(data.totalAmount), tableX + tableWidth - cellPadding, totalTextY, fonts.bold, 12, { r: 0.8, g: 0, b: 0 });
  
  // === 4. 계좌 정보 박스 ===
  y -= totalRowHeight + 35;
  
  const accountBoxWidth = CONTENT_WIDTH;
  
  // 헤더 박스
  page.drawRectangle({
    x: tableX,
    y: y - 28,
    width: accountBoxWidth,
    height: 28,
    color: rgb(0.96, 0.96, 0.96),
    borderColor: rgb(0, 0, 0),
    borderWidth: 0.5,
  });
  
  const accountHeaderText = '아래의 계좌로 입금 부탁드립니다.';
  const accountHeaderTextWidth = measureTextWidth(accountHeaderText, fonts.bold, 10);
  drawTextLine(page, accountHeaderText, tableX + (accountBoxWidth - accountHeaderTextWidth) / 2, y - 18, fonts.bold, 10);
  
  y -= 28;
  
  // 계좌 정보 본문
  const accountBodyHeight = 90;
  page.drawRectangle({
    x: tableX,
    y: y - accountBodyHeight,
    width: accountBoxWidth,
    height: accountBodyHeight,
    borderColor: rgb(0, 0, 0),
    borderWidth: 0.5,
  });
  
  const accountLabelX = tableX + 100;
  const accountValueX = tableX + accountBoxWidth / 2 + 30;
  const accountLineHeight = 20;
  let accountY = y - 22;
  
  const accountData = [
    { label: '은행명', value: '신한은행' },
    { label: '계좌번호', value: '140-015-744120' },
    { label: '예금주', value: '주식회사 플록슨' },
    { label: '사업자등록번호', value: '517-87-03490' },
  ];
  
  for (const row of accountData) {
    drawTextLine(page, row.label, accountLabelX, accountY, fonts.bold, 10);
    drawTextLine(page, row.value, accountValueX, accountY, fonts.regular, 10);
    accountY -= accountLineHeight;
  }
  
  // === 5. 푸터 ===
  y -= accountBodyHeight + 35;
  
  // 푸터 수평선
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: A4_WIDTH - MARGIN, y },
    thickness: 1.5,
    color: rgb(0, 0, 0),
  });
  
  y -= 25;
  
  // FLOXN., Inc 로고
  drawCenteredText(page, 'FLOXN., Inc', y, fonts.bold, 14);
  
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
