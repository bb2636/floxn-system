import puppeteer from 'puppeteer';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

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

export function generateInvoiceHtml(data: InvoiceData): string {
  const particularsContent = data.particulars.map(item => {
    let html = `<div class="particulars-item">
      <div class="particulars-item-title">■ ${item.title}</div>`;
    if (item.detail) {
      html += `<div class="particulars-item-detail">${item.detail}</div>`;
    }
    html += `</div>`;
    return html;
  }).join('');

  const amountContent = data.particulars.map(item => {
    return `<div class="amount-item">${formatAmount(item.amount)}</div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>INVOICE</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Noto Sans KR', sans-serif;
      font-size: 12px;
      line-height: 1.5;
      color: #000;
      background: #fff;
      width: 210mm;
      min-height: 297mm;
      padding: 20mm 15mm;
    }
    
    .container {
      width: 100%;
      max-width: 180mm;
      margin: 0 auto;
    }
    
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 10px;
      border-bottom: 2px solid #000;
    }
    
    .header h1 {
      font-size: 28px;
      font-weight: 700;
      letter-spacing: 3px;
    }
    
    .info-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
    }
    
    .info-left, .info-right {
      width: 48%;
    }
    
    .info-row {
      display: flex;
      margin-bottom: 8px;
    }
    
    .info-label {
      width: 80px;
      font-weight: 500;
      color: #333;
    }
    
    .info-colon {
      width: 20px;
      text-align: center;
    }
    
    .info-value {
      flex: 1;
      color: #0066cc;
      font-weight: 500;
    }
    
    .table-section {
      margin-bottom: 40px;
    }
    
    .particulars-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #000;
    }
    
    .particulars-table th {
      background: #f5f5f5;
      padding: 12px 16px;
      text-align: center;
      font-weight: 600;
      border: 1px solid #000;
      font-size: 13px;
    }
    
    .particulars-table td {
      padding: 16px;
      border: 1px solid #000;
      vertical-align: top;
    }
    
    .particulars-table .col-particulars {
      width: 65%;
    }
    
    .particulars-table .col-amount {
      width: 35%;
      text-align: right;
    }
    
    .particulars-content {
      min-height: 80px;
    }
    
    .particulars-item {
      margin-bottom: 12px;
    }
    
    .particulars-item-title {
      font-weight: 600;
      margin-bottom: 4px;
    }
    
    .particulars-item-detail {
      color: #666;
      font-size: 11px;
      margin-left: 16px;
    }
    
    .amount-item {
      margin-bottom: 12px;
      color: #cc0000;
      font-weight: 500;
      min-height: 20px;
    }
    
    .total-row td {
      background: #fafafa;
      font-weight: 700;
    }
    
    .total-label {
      text-align: left !important;
      padding-left: 16px !important;
    }
    
    .total-amount {
      color: #cc0000;
      font-weight: 700;
      font-size: 14px;
    }
    
    .account-section {
      border: 1px solid #000;
      margin-bottom: 40px;
    }
    
    .account-header {
      text-align: center;
      padding: 12px;
      background: #f9f9f9;
      border-bottom: 1px solid #000;
      font-weight: 600;
    }
    
    .account-body {
      padding: 16px;
    }
    
    .account-row {
      display: flex;
      margin-bottom: 8px;
    }
    
    .account-row:last-child {
      margin-bottom: 0;
    }
    
    .account-label {
      width: 120px;
      text-align: center;
      font-weight: 500;
    }
    
    .account-value {
      flex: 1;
      text-align: center;
    }
    
    .footer {
      text-align: center;
      padding-top: 30px;
      border-top: 2px solid #000;
      margin-top: 40px;
    }
    
    .footer-text {
      font-size: 18px;
      font-weight: 600;
      letter-spacing: 2px;
    }
    
    @media print {
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>INVOICE</h1>
    </div>
    
    <div class="info-section">
      <div class="info-left">
        <div class="info-row">
          <span class="info-label">수 신</span>
          <span class="info-colon">:</span>
          <span class="info-value">${data.recipientName || '-'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">사고번호</span>
          <span class="info-colon">:</span>
          <span class="info-value">${data.insuranceAccidentNo || '-'}</span>
        </div>
      </div>
      <div class="info-right">
        <div class="info-row">
          <span class="info-label">수임일자</span>
          <span class="info-colon">:</span>
          <span class="info-value">${formatDate(data.acceptanceDate)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">청구일자</span>
          <span class="info-colon">:</span>
          <span class="info-value">${formatDate(data.submissionDate)}</span>
        </div>
      </div>
    </div>
    
    <div class="table-section">
      <table class="particulars-table">
        <thead>
          <tr>
            <th class="col-particulars">PARTICULARS</th>
            <th class="col-amount">AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="col-particulars">
              <div class="particulars-content">
                ${particularsContent}
              </div>
            </td>
            <td class="col-amount">
              <div class="particulars-content">
                ${amountContent}
              </div>
            </td>
          </tr>
          <tr class="total-row">
            <td class="total-label">TOTAL AMOUNT</td>
            <td class="col-amount">
              <span class="total-amount">${formatAmount(data.totalAmount)}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <div class="account-section">
      <div class="account-header">
        아래의 계좌로 입금 부탁드립니다.
      </div>
      <div class="account-body">
        <div class="account-row">
          <span class="account-label">은행명</span>
          <span class="account-value">신한은행</span>
        </div>
        <div class="account-row">
          <span class="account-label">계좌번호</span>
          <span class="account-value">140-015-744120</span>
        </div>
        <div class="account-row">
          <span class="account-label">예금주</span>
          <span class="account-value">주식회사 플록슨</span>
        </div>
        <div class="account-row">
          <span class="account-label">사업자등록번호</span>
          <span class="account-value">517-89-03490</span>
        </div>
      </div>
    </div>
    
    <div class="footer">
      <span class="footer-text">FLOXN., Inc</span>
    </div>
  </div>
</body>
</html>`;
}

// Get Chromium executable path dynamically
export function getChromiumPath(): string | undefined {
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
    const { execSync } = require('child_process');
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

export async function generateInvoicePdf(data: InvoiceData): Promise<Buffer> {
  const html = generateInvoiceHtml(data);
  
  let browser = null;
  const chromiumPath = getChromiumPath();
  console.log(`[Invoice PDF] Using Chromium path: ${chromiumPath || 'bundled'}`);
  
  // Create a timeout promise
  const TIMEOUT_MS = 60000; // 60 second timeout
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('PDF 생성 시간 초과 (60초). Chromium 브라우저 실행에 실패했을 수 있습니다.')), TIMEOUT_MS);
  });
  
  const generatePdf = async (): Promise<Buffer> => {
    try {
      console.log('[Invoice PDF] Launching browser...');
      browser = await puppeteer.launch({
        headless: true,
        ...(chromiumPath && { executablePath: chromiumPath }),
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--single-process',
        ],
      });
      console.log('[Invoice PDF] Browser launched successfully');
      
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
      });
      
      await page.close();
      await browser.close();
      browser = null;
      
      console.log(`[Invoice PDF] PDF generated successfully, size: ${pdfBuffer.length} bytes`);
      return Buffer.from(pdfBuffer);
    } catch (error) {
      if (browser) {
        try { await browser.close(); } catch {}
      }
      const err = error as Error;
      console.error(`[Invoice PDF] Generation failed: ${err.message}`);
      throw new Error(`PDF 생성 실패: ${err.message}. Chromium 브라우저가 설치되어 있는지 확인하세요.`);
    }
  };
  
  // Race between PDF generation and timeout
  return Promise.race([generatePdf(), timeoutPromise]);
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
