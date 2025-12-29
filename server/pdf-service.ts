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
    visitDateTime: visitDateTime || '-',
    dispatchManager: caseData.dispatchManager || partnerData?.name || '-',
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
    authorName: partnerData?.name || caseData.dispatchManager || '-',
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
  
  if (drawingData && drawingData.uploadedImages && drawingData.uploadedImages.length > 0) {
    let imageUrl = drawingData.uploadedImages[0].src || '';
    if (imageUrl && !imageUrl.startsWith('data:')) {
      imageUrl = `data:image/png;base64,${imageUrl}`;
    }
    if (imageUrl) {
      drawingContent = `<img src="${imageUrl}" alt="현장 피해상황 도면" class="drawing-image" onerror="this.style.display='none'" />`;
    }
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
  
  // Collect all image documents
  const allImages: { doc: any; tab: string }[] = [];
  const tabOrder = ['현장사진', '기본자료', '증빙자료', '청구자료', '기타'];
  
  for (const tab of tabOrder) {
    const docs = categoryGroups[tab];
    if (!docs || docs.length === 0) continue;
    
    for (const doc of docs) {
      const isImage = doc.fileType?.startsWith('image/');
      if (isImage) {
        allImages.push({ doc, tab });
      }
    }
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
  
  if (!pagesHtml) {
    pagesHtml = `
      <div class="page">
        <div class="header-bar">
          <div class="header-title">증빙자료</div>
          <div class="header-info">접수번호: ${caseData.caseNumber || ''}</div>
        </div>
        <div class="no-images">선택된 이미지 파일이 없습니다.</div>
      </div>
    `;
  }
  
  template = template.replace('{{imagesHtml}}', pagesHtml);
  template = template.replace('{{#unless hasImages}}', allImages.length === 0 ? '' : '<!--');
  template = template.replace('{{/unless}}', allImages.length === 0 ? '' : '-->');
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
        // 피해면적 - mm to m conversion (stored as mm, display as m)
        const damageW = row.damageWidth ? (Number(row.damageWidth) / 1000).toFixed(1) : '0.0';
        const damageH = row.damageHeight ? (Number(row.damageHeight) / 1000).toFixed(1) : '0.0';
        const damageAreaM2 = row.damageArea ? (Number(row.damageArea) / 1000000).toFixed(1) : '0.0';
        
        // 복구면적 - mm to m conversion
        const repairW = row.repairWidth ? (Number(row.repairWidth) / 1000).toFixed(1) : '0.0';
        const repairH = row.repairHeight ? (Number(row.repairHeight) / 1000).toFixed(1) : '0.0';
        const repairAreaM2 = row.repairArea ? (Number(row.repairArea) / 1000000).toFixed(1) : '0.0';
        
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
        let rawMaterialData = typeof estimateData.materialCostData === 'string'
          ? JSON.parse(estimateData.materialCostData)
          : estimateData.materialCostData;
        
        // materialCostData is stored as { rows: [...], vatIncluded: boolean }
        // Extract the rows array from the wrapper object
        if (rawMaterialData && typeof rawMaterialData === 'object' && !Array.isArray(rawMaterialData)) {
          materialCostData = rawMaterialData.rows || [];
          console.log('[PDF] materialCostData 구조 감지: { rows, vatIncluded }, rows 개수:', materialCostData.length);
        } else if (Array.isArray(rawMaterialData)) {
          materialCostData = rawMaterialData;
        }
        
        if (Array.isArray(materialCostData)) {
          // MaterialRow uses Korean field names: 합계 or 금액 for amount
          materialTotal = materialCostData.reduce((sum, item) => {
            const amount = Number(item.합계) || Number(item.금액) || Number(item.amount) || 0;
            return sum + amount;
          }, 0);
          console.log('[PDF] 자재비 합계:', materialTotal);
        }
      } catch { materialCostData = []; }
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
      // 적용단가 - pricePerSqm (기준가 m²)
      const pricePerSqm = item.pricePerSqm || item.standardPrice || 0;
      // 수량(인) - quantity
      const quantity = item.quantity || 0;
      // 합계 - amount
      const amount = item.amount || 0;
      // 경비 - includeInEstimate (경비여부)
      const isExpense = item.includeInEstimate === true || item.includeInEstimate === 'true' ? 'O' : '-';
      // 비고 - request
      const note = item.request || '-';
      
      laborRowsHtml += `
        <tr>
          <td style="text-align:center">${category}</td>
          <td style="text-align:center">${workName}</td>
          <td style="text-align:center">${detailItem}</td>
          <td style="text-align:right">${damageAreaDisplay}</td>
          <td style="text-align:right">${formatNumber(Math.round(pricePerSqm))}</td>
          <td style="text-align:center">${Number(quantity).toFixed(2)}</td>
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
  
  const subtotal = laborTotal + materialTotal;
  const managementFee = Math.round(subtotal * 0.06); // 일반관리비 6%
  const profit = Math.round(subtotal * 0.15); // 이윤 15%
  const vatBase = subtotal + managementFee + profit;
  const vat = Math.round(vatBase * 0.1); // 부가세 10%
  const grandTotal = vatBase + vat;
  
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
    managementFee: formatNumber(managementFee),
    profit: formatNumber(profit),
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
      const pdfDocs = selectedDocs.filter(doc => doc.fileType === 'application/pdf' || doc.fileName?.toLowerCase().endsWith('.pdf'));
      
      console.log(`[PDF 생성] 선택된 문서 수: ${selectedDocs.length}, 이미지: ${imageDocs.length}, PDF: ${pdfDocs.length}`);
      console.log('[PDF 생성] PDF 문서 목록:', pdfDocs.map(d => ({ id: d.id, name: d.fileName, type: d.fileType })));
      
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
