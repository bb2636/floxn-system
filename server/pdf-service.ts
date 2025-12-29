import puppeteer from 'puppeteer';
import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { db } from './db';
import { cases, caseDocuments, drawings, estimates, estimateRows, users } from '@shared/schema';
import { eq, and, inArray } from 'drizzle-orm';

const TEMPLATES_DIR = path.join(process.cwd(), 'server/pdf-templates');

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
    investigatorName: partnerData?.name || '',
    partnerCompany: caseData.assignedPartner || '',
    address: fullAddress,
    dispatchDateTime: dispatchDateTime,
    documentDate: formatDate(new Date().toISOString()),
    senderCompany: 'FLOXN',
    senderName: partnerData?.name || '',
    senderContact: partnerData?.phone || '',
    footerText: '본 확인서는 현장 출동 사실을 증명합니다.',
  };
  
  return replaceTemplateVariables(template, data);
}

async function generateFieldReportPage(caseData: any, partnerData: any, repairItems: any[]): Promise<string> {
  const templatePath = path.join(TEMPLATES_DIR, 'field-report.html');
  let template = fs.readFileSync(templatePath, 'utf-8');
  
  const fullAddress = [caseData.insuredAddress, caseData.insuredAddressDetail]
    .filter(Boolean).join(' ');
  
  const dispatchDateTime = [caseData.visitDate, caseData.visitTime]
    .filter(Boolean).join(' ');
  
  let processingTypesStr = '';
  if (caseData.processingTypes) {
    try {
      const types = JSON.parse(caseData.processingTypes);
      processingTypesStr = Array.isArray(types) ? types.join(', ') : '';
    } catch {
      processingTypesStr = '';
    }
  }

  let repairItemsHtml = '';
  if (repairItems && repairItems.length > 0) {
    repairItems.forEach((item, index) => {
      const areaM2 = item.repairArea ? (Number(item.repairArea) / 1000000).toFixed(2) : '-';
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
    caseNumber: caseData.caseNumber || '',
    insuranceAccidentNo: caseData.insuranceAccidentNo || '',
    insuranceCompany: caseData.insuranceCompany || '',
    dispatchDateTime: dispatchDateTime,
    travelDistance: caseData.travelDistance || '',
    partnerCompany: caseData.assignedPartner || '',
    investigatorName: partnerData?.name || '',
    investigatorContact: partnerData?.phone || '',
    victimName: caseData.victimName || '',
    victimContact: caseData.victimContact || '',
    address: fullAddress,
    accidentDate: caseData.accidentDate || '',
    accidentTime: caseData.accidentTime || '',
    accidentCategory: caseData.accidentCategory || '',
    accidentCause: caseData.accidentCause || '',
    accidentDescription: caseData.accidentDescription || '',
    recoveryMethodType: caseData.recoveryMethodType || '',
    processingTypes: processingTypesStr,
    repairItemsHtml: repairItemsHtml,
    additionalNotes: caseData.additionalNotes || '특이사항 없음',
    specialNotes: caseData.specialNotes || '',
  };
  
  template = template.replace('{{#each repairItems}}', '');
  template = template.replace('{{/each}}', '');
  template = template.replace(/<tr>\s*<td>\{\{@index\}\}<\/td>[\s\S]*?<\/tr>/g, '');
  
  const repairTableRegex = /(<tbody[^>]*>)([\s\S]*?)(<\/tbody>)/i;
  template = template.replace(repairTableRegex, `$1${repairItemsHtml}$3`);
  
  return replaceTemplateVariables(template, data);
}

async function generateDrawingPage(caseData: any, drawingData: any): Promise<string> {
  const templatePath = path.join(TEMPLATES_DIR, 'drawing.html');
  let template = fs.readFileSync(templatePath, 'utf-8');
  
  const fullAddress = [caseData.insuredAddress, caseData.insuredAddressDetail]
    .filter(Boolean).join(' ');
  
  let drawingImageUrl = '';
  if (drawingData && drawingData.uploadedImages && drawingData.uploadedImages.length > 0) {
    drawingImageUrl = drawingData.uploadedImages[0].src || '';
  }
  
  const data = {
    caseNumber: caseData.caseNumber || '',
    insuranceCompany: caseData.insuranceCompany || '',
    insuredName: caseData.insuredName || caseData.victimName || '',
    address: fullAddress,
    insuranceAccidentNo: caseData.insuranceAccidentNo || '',
    documentDate: formatDate(new Date().toISOString()),
    drawingImageUrl: drawingImageUrl,
  };
  
  return replaceTemplateVariables(template, data);
}

async function generateEvidencePages(caseData: any, documents: any[]): Promise<string> {
  const templatePath = path.join(TEMPLATES_DIR, 'evidence-images.html');
  let template = fs.readFileSync(templatePath, 'utf-8');
  
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
  
  let pagesHtml = '';
  const tabOrder = ['현장사진', '기본자료', '증빙자료', '청구자료', '기타'];
  
  for (const tab of tabOrder) {
    const docs = categoryGroups[tab];
    if (!docs || docs.length === 0) continue;
    
    for (const doc of docs) {
      const isImage = doc.fileType?.startsWith('image/');
      const isPdf = doc.fileType === 'application/pdf';
      
      if (isImage) {
        const uploadDate = doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('ko-KR') : '';
        pagesHtml += `
          <div class="page">
            <div class="category-header">${tab}</div>
            <div class="subcategory">${doc.category}</div>
            <div class="image-container">
              <img src="${doc.fileData}" alt="${doc.fileName}" onerror="this.style.display='none'"/>
            </div>
            <div class="image-info">
              <span class="filename">${doc.fileName}</span>
              <span class="upload-date">업로드: ${uploadDate}</span>
            </div>
          </div>
        `;
      }
    }
  }
  
  if (!pagesHtml) {
    pagesHtml = `
      <div class="page">
        <div class="category-header">증빙자료</div>
        <div class="no-content">선택된 이미지 파일이 없습니다.</div>
      </div>
    `;
  }
  
  template = template.replace('{{#each categories}}', '');
  template = template.replace('{{/each}}', '');
  
  const pageContainerRegex = /(<div class="pages">)([\s\S]*?)(<\/div>\s*<\/body>)/i;
  if (pageContainerRegex.test(template)) {
    template = template.replace(pageContainerRegex, `$1${pagesHtml}$3`);
  } else {
    template = template.replace('</body>', `<div class="pages">${pagesHtml}</div></body>`);
  }
  
  return template;
}

async function generateEstimatePage(caseData: any, estimateData: any, estimateRowsData: any[]): Promise<string> {
  const templatePath = path.join(TEMPLATES_DIR, 'estimate.html');
  let template = fs.readFileSync(templatePath, 'utf-8');
  
  const fullAddress = [caseData.insuredAddress, caseData.insuredAddressDetail]
    .filter(Boolean).join(' ');
  
  let areaRowsHtml = '';
  if (estimateRowsData && estimateRowsData.length > 0) {
    estimateRowsData.forEach((row, index) => {
      const damageW = row.damageWidth || '-';
      const damageH = row.damageHeight || '-';
      const damageAreaM2 = row.damageArea ? (Number(row.damageArea) / 1000000).toFixed(2) : '-';
      const damageDisplay = `${damageW}×${damageH}=${damageAreaM2}㎡`;
      
      const repairW = row.repairWidth || '-';
      const repairH = row.repairHeight || '-';
      const repairAreaM2 = row.repairArea ? (Number(row.repairArea) / 1000000).toFixed(2) : '-';
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
        materialCostData = typeof estimateData.materialCostData === 'string'
          ? JSON.parse(estimateData.materialCostData)
          : estimateData.materialCostData;
        if (Array.isArray(materialCostData)) {
          materialTotal = materialCostData.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
        }
      } catch { materialCostData = []; }
    }
  }
  
  let laborRowsHtml = '';
  if (laborCostData.length > 0) {
    laborCostData.forEach((item) => {
      const itemName = item.workName || item.name || item.workType || '-';
      laborRowsHtml += `
        <tr>
          <td style="text-align:left">${itemName}</td>
          <td style="text-align:center">${item.detailWork || item.spec || '-'}</td>
          <td style="text-align:center">${item.unit || '-'}</td>
          <td style="text-align:center">${formatNumber(item.quantity || item.qty)}</td>
          <td style="text-align:right">${formatNumber(item.unitPrice || item.price)}</td>
          <td style="text-align:right">${formatNumber(item.amount)}</td>
          <td style="text-align:left">${item.note || '-'}</td>
        </tr>
      `;
    });
    laborRowsHtml += `
      <tr style="background-color:#f5f5f5;font-weight:bold;">
        <td colspan="5" style="text-align:center">노무비 소계</td>
        <td style="text-align:right">${formatNumber(laborTotal)}</td>
        <td></td>
      </tr>
    `;
  } else {
    laborRowsHtml = '<tr><td colspan="7" style="text-align:center;padding:5mm;">등록된 노무비가 없습니다.</td></tr>';
  }
  
  let materialRowsHtml = '';
  if (materialCostData.length > 0) {
    materialCostData.forEach((item) => {
      const itemName = item.materialName || item.name || item.workType || '-';
      materialRowsHtml += `
        <tr>
          <td style="text-align:left">${itemName}</td>
          <td style="text-align:center">${item.specification || item.spec || '-'}</td>
          <td style="text-align:center">${item.unit || '-'}</td>
          <td style="text-align:center">${formatNumber(item.quantity || item.qty)}</td>
          <td style="text-align:right">${formatNumber(item.unitPrice || item.price)}</td>
          <td style="text-align:right">${formatNumber(item.amount)}</td>
          <td style="text-align:left">${item.note || '-'}</td>
        </tr>
      `;
    });
    materialRowsHtml += `
      <tr style="background-color:#f5f5f5;font-weight:bold;">
        <td colspan="5" style="text-align:center">자재비 소계</td>
        <td style="text-align:right">${formatNumber(materialTotal)}</td>
        <td></td>
      </tr>
    `;
  } else {
    materialRowsHtml = '<tr><td colspan="7" style="text-align:center;padding:5mm;">등록된 자재비가 없습니다.</td></tr>';
  }
  
  const subtotal = laborTotal + materialTotal;
  const vat = Math.round(subtotal * 0.1);
  const grandTotal = subtotal + vat;
  
  const data = {
    caseNumber: caseData.caseNumber || '',
    insuranceAccidentNo: caseData.insuranceAccidentNo || '',
    insuranceCompany: caseData.insuranceCompany || '',
    insuredName: caseData.insuredName || caseData.victimName || '',
    address: fullAddress,
    documentDate: formatDate(new Date().toISOString()),
    areaRowsHtml: areaRowsHtml,
    laborRowsHtml: laborRowsHtml,
    materialRowsHtml: materialRowsHtml,
    laborTotal: formatNumber(laborTotal),
    materialTotal: formatNumber(materialTotal),
    subtotal: formatNumber(subtotal),
    vat: formatNumber(vat),
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

export async function generatePdf(payload: PdfGenerationPayload): Promise<Buffer> {
  const { caseId, sections, evidence } = payload;
  
  const [caseData] = await db.select().from(cases).where(eq(cases.id, caseId));
  if (!caseData) {
    throw new Error('케이스를 찾을 수 없습니다.');
  }
  
  let partnerData: any = null;
  if (caseData.assignedPartner) {
    const partners = await db.select().from(users).where(eq(users.company, caseData.assignedPartner));
    partnerData = partners[0] || null;
  }
  
  let browser: any = null;
  
  try {
    browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
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
    
    const pdfDocumentsToAppend: any[] = [];
    
    if (sections.evidence && evidence.selectedFileIds.length > 0) {
      const selectedDocs = await db.select().from(caseDocuments)
        .where(
          and(
            eq(caseDocuments.caseId, caseId),
            inArray(caseDocuments.id, evidence.selectedFileIds)
          )
        );
      
      const imageDocs = selectedDocs.filter(doc => doc.fileType?.startsWith('image/'));
      const pdfDocs = selectedDocs.filter(doc => doc.fileType === 'application/pdf');
      
      if (imageDocs.length > 0) {
        const evidenceHtml = await generateEvidencePages(caseData, imageDocs);
        const page = await browser.newPage();
        await page.setContent(evidenceHtml, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: { top: '0', right: '0', bottom: '0', left: '0' },
        });
        pdfParts.push(Buffer.from(pdfBuffer));
        await page.close();
      }
      
      pdfDocumentsToAppend.push(...pdfDocs);
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
      
      const estimateHtml = await generateEstimatePage(caseData, estimateData, estimateRowsData);
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
    
    for (const pdfDoc of pdfDocumentsToAppend) {
      try {
        let pdfData: Uint8Array;
        if (pdfDoc.fileData.startsWith('data:')) {
          const base64Data = pdfDoc.fileData.split(',')[1];
          pdfData = Buffer.from(base64Data, 'base64');
        } else {
          pdfData = Buffer.from(pdfDoc.fileData, 'base64');
        }
        
        const attachedPdf = await PDFDocument.load(pdfData, { ignoreEncryption: true });
        const pages = await mergedPdf.copyPages(attachedPdf, attachedPdf.getPageIndices());
        pages.forEach(page => mergedPdf.addPage(page));
      } catch (err) {
        console.error(`첨부 PDF 병합 실패 (${pdfDoc.fileName}):`, err);
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
