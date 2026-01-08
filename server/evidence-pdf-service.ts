import { PDFDocument, PDFPage, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { compressPdfForEmail } from './pdf-compression';
import { ObjectStorageService } from './replit_integrations/object_storage';

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const MARGIN = 30;
const HEADER_HEIGHT = 35;
const MAX_PDF_SIZE_BYTES = 8 * 1024 * 1024; // 8MB limit for each PDF

interface DocumentData {
  id: string;
  fileName: string;
  fileType: string;
  fileData?: string;
  storageKey?: string;
  category?: string;
  caseId?: string;
}

interface EvidencePdfResult {
  filename: string;
  buffer: Buffer;
  tabName: string;
  part?: number;
  imageCount: number;
}

interface ProcessedImage {
  buffer: Buffer;
  width: number;
  height: number;
  fileName: string;
  category: string;
  caseNumber?: string;
  error?: string;
}

const TAB_CATEGORIES: Record<string, string[]> = {
  '현장사진': ['현장출동사진', '현장', '수리중 사진', '수리중', '복구완료 사진', '복구완료'],
  '기본자료': ['보험금 청구서', '개인정보 동의서(가족용)', '개인정보 동의서', '기본자료'],
  '증빙자료': ['주민등록등본', '등기부등본', '건축물대장', '기타증빙자료(민원일지 등)', '기타증빙자료', '증빙자료'],
  '청구자료': ['위임장', '도급계약서', '복구완료확인서', '부가세 청구자료', '청구', '청구자료'],
};

function getCategoryToTab(category: string): string {
  for (const [tabName, categories] of Object.entries(TAB_CATEGORIES)) {
    if (categories.includes(category)) {
      return tabName;
    }
  }
  return '기타';
}

let cachedFont: Buffer | null = null;

function loadFontBytes(): Buffer {
  if (cachedFont) return cachedFont;
  
  const fontsDir = path.join(process.cwd(), 'server/fonts');
  const regularTtf = path.join(fontsDir, 'NotoSansKR-Regular-static.ttf');
  
  try {
    if (fs.existsSync(regularTtf)) {
      cachedFont = fs.readFileSync(regularTtf);
      console.log(`[Evidence PDF] NotoSansKR 폰트 로드 완료 (${Math.round(cachedFont.length / 1024 / 1024)}MB)`);
      return cachedFont;
    }
  } catch (err) {
    console.error('[Evidence PDF] 폰트 로드 실패:', err);
  }
  
  throw new Error('한글 폰트를 로드할 수 없습니다.');
}

const COMPRESSION_LEVELS = [
  { maxWidth: 1600, quality: 60 },
  { maxWidth: 1400, quality: 50 },
  { maxWidth: 1200, quality: 40 },
  { maxWidth: 1000, quality: 30 },
  { maxWidth: 800, quality: 25 },
  { maxWidth: 600, quality: 20 },
];

async function compressImage(fileBuffer: Buffer, fileName: string, targetSize: number = 500 * 1024): Promise<ProcessedImage> {
  for (const level of COMPRESSION_LEVELS) {
    try {
      const compressed = await sharp(fileBuffer)
        .resize(level.maxWidth, Math.round(level.maxWidth * 1.5), { 
          fit: 'inside', 
          withoutEnlargement: true 
        })
        .jpeg({ quality: level.quality, mozjpeg: true })
        .toBuffer();
      
      const metadata = await sharp(compressed).metadata();
      
      console.log(`[Evidence PDF] Image ${fileName}: ${level.maxWidth}px/${level.quality}% → ${Math.round(compressed.length / 1024)}KB`);
      
      if (compressed.length <= targetSize || level === COMPRESSION_LEVELS[COMPRESSION_LEVELS.length - 1]) {
        return {
          buffer: compressed,
          width: metadata.width || 800,
          height: metadata.height || 600,
          fileName,
          category: '',
        };
      }
    } catch (err) {
      console.error(`[Evidence PDF] Compression failed for ${fileName} at level ${level.maxWidth}:`, err);
    }
  }
  
  const lastLevel = COMPRESSION_LEVELS[COMPRESSION_LEVELS.length - 1];
  try {
    const compressed = await sharp(fileBuffer)
      .resize(lastLevel.maxWidth, Math.round(lastLevel.maxWidth * 1.5), { 
        fit: 'inside', 
        withoutEnlargement: true 
      })
      .jpeg({ quality: lastLevel.quality, mozjpeg: true })
      .toBuffer();
    
    const metadata = await sharp(compressed).metadata();
    
    return {
      buffer: compressed,
      width: metadata.width || 800,
      height: metadata.height || 600,
      fileName,
      category: '',
    };
  } catch (err) {
    console.error(`[Evidence PDF] Final compression failed for ${fileName}:`, err);
    return {
      buffer: Buffer.alloc(0),
      width: 0,
      height: 0,
      fileName,
      category: '',
      error: err instanceof Error ? err.message : 'Unknown compression error',
    };
  }
}

async function createEvidencePdfForTab(
  tabName: string,
  images: ProcessedImage[],
  caseNumber: string,
  insuranceAccidentNo: string
): Promise<EvidencePdfResult[]> {
  const results: EvidencePdfResult[] = [];
  
  if (images.length === 0) {
    return results;
  }
  
  const fontBytes = loadFontBytes();
  let currentPdf = await PDFDocument.create();
  currentPdf.registerFontkit(fontkit);
  // subset: true로 사용되는 글자만 임베딩 (16MB → 수백KB로 감소)
  let font = await currentPdf.embedFont(fontBytes, { subset: true });
  
  let currentImageCount = 0;
  let partNumber = 1;
  
  // Helper to finalize current PDF and start a new one
  const finalizePdf = async (forcePartNumber: boolean = false): Promise<void> => {
    if (currentImageCount === 0) return;
    
    const pdfBytes = await currentPdf.save();
    let buffer = Buffer.from(pdfBytes);
    
    // 이메일 첨부용 압축 적용 (7MB 타겟)
    const originalSize = buffer.length;
    if (originalSize > 7 * 1024 * 1024) {
      console.log(`[Evidence PDF] Compressing PDF: ${Math.round(originalSize / 1024 / 1024 * 100) / 100}MB...`);
      buffer = await compressPdfForEmail(buffer);
      console.log(`[Evidence PDF] Compressed: ${Math.round(originalSize / 1024 / 1024 * 100) / 100}MB → ${Math.round(buffer.length / 1024 / 1024 * 100) / 100}MB`);
    }
    
    // Determine filename: use part number if we need to split or already split
    const filename = forcePartNumber || partNumber > 1 || images.length > 10
      ? `Evidence_${tabName}_${partNumber}.pdf`
      : `Evidence_${tabName}.pdf`;
    
    results.push({
      filename,
      buffer,
      tabName,
      part: partNumber,
      imageCount: currentImageCount,
    });
    
    console.log(`[Evidence PDF] Created ${filename}: ${Math.round(buffer.length / 1024 / 1024 * 100) / 100}MB, ${currentImageCount} images`);
    
    // Reset for next chunk
    currentPdf = await PDFDocument.create();
    currentPdf.registerFontkit(fontkit);
    // subset: true로 사용되는 글자만 임베딩 (16MB → 수백KB로 감소)
    font = await currentPdf.embedFont(fontBytes, { subset: true });
    currentImageCount = 0;
    partNumber++;
  };
  
  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    
    const page = currentPdf.addPage([A4_WIDTH, A4_HEIGHT]);
    
    page.drawRectangle({
      x: MARGIN,
      y: A4_HEIGHT - MARGIN - HEADER_HEIGHT,
      width: A4_WIDTH - (MARGIN * 2),
      height: HEADER_HEIGHT,
      color: rgb(0.95, 0.95, 0.95),
      borderColor: rgb(0.7, 0.7, 0.7),
      borderWidth: 0.5,
    });
    
    // Use image-specific caseNumber if available, otherwise fall back to the general caseNumber
    const displayCaseNumber = img.caseNumber || insuranceAccidentNo || caseNumber;
    const headerText = `[${displayCaseNumber}] ${tabName} - ${img.category || '기타'}`;
    try {
      page.drawText(headerText, {
        x: MARGIN + 10,
        y: A4_HEIGHT - MARGIN - HEADER_HEIGHT + 10,
        size: 10,
        font,
        color: rgb(0.2, 0.2, 0.2),
      });
    } catch (e) {
      console.warn(`[Evidence PDF] Failed to draw header text: ${headerText}`);
    }
    
    const fileNameText = img.fileName.length > 50 
      ? img.fileName.substring(0, 47) + '...' 
      : img.fileName;
    try {
      page.drawText(fileNameText, {
        x: MARGIN + 10,
        y: A4_HEIGHT - MARGIN - HEADER_HEIGHT + 22,
        size: 8,
        font,
        color: rgb(0.4, 0.4, 0.4),
      });
    } catch (e) {
      console.warn(`[Evidence PDF] Failed to draw filename text`);
    }
    
    const imageAreaTop = A4_HEIGHT - MARGIN - HEADER_HEIGHT - 10;
    const imageAreaHeight = imageAreaTop - MARGIN - 10;
    const imageAreaWidth = A4_WIDTH - (MARGIN * 2);
    
    if (img.error || img.buffer.length === 0) {
      page.drawRectangle({
        x: MARGIN,
        y: MARGIN + 10,
        width: imageAreaWidth,
        height: imageAreaHeight,
        color: rgb(0.98, 0.96, 0.96),
        borderColor: rgb(0.8, 0.3, 0.3),
        borderWidth: 1,
      });
      
      try {
        page.drawText('이미지 로드 실패', {
          x: A4_WIDTH / 2 - 40,
          y: A4_HEIGHT / 2,
          size: 14,
          font,
          color: rgb(0.6, 0.1, 0.1),
        });
        
        page.drawText(`파일명: ${img.fileName}`, {
          x: MARGIN + 20,
          y: A4_HEIGHT / 2 - 30,
          size: 10,
          font,
          color: rgb(0.4, 0.4, 0.4),
        });
        
        page.drawText(`사유: ${img.error || '알 수 없는 오류'}`, {
          x: MARGIN + 20,
          y: A4_HEIGHT / 2 - 50,
          size: 9,
          font,
          color: rgb(0.4, 0.4, 0.4),
        });
      } catch (e) {
        console.warn('[Evidence PDF] Failed to draw error placeholder text');
      }
    } else {
      try {
        const embeddedImage = await currentPdf.embedJpg(img.buffer);
        const imgDims = embeddedImage.scale(1);
        
        const scaleX = imageAreaWidth / imgDims.width;
        const scaleY = imageAreaHeight / imgDims.height;
        const scale = Math.min(scaleX, scaleY, 1);
        
        const drawWidth = imgDims.width * scale;
        const drawHeight = imgDims.height * scale;
        
        const drawX = MARGIN + (imageAreaWidth - drawWidth) / 2;
        const drawY = MARGIN + 10 + (imageAreaHeight - drawHeight) / 2;
        
        page.drawImage(embeddedImage, {
          x: drawX,
          y: drawY,
          width: drawWidth,
          height: drawHeight,
        });
        
        console.log(`[Evidence PDF] Added image: ${img.fileName}`);
      } catch (imgErr) {
        console.error(`[Evidence PDF] Failed to embed image ${img.fileName}:`, imgErr);
        
        page.drawRectangle({
          x: MARGIN,
          y: MARGIN + 10,
          width: imageAreaWidth,
          height: imageAreaHeight,
          color: rgb(0.98, 0.96, 0.96),
          borderColor: rgb(0.8, 0.3, 0.3),
          borderWidth: 1,
        });
        
        try {
          page.drawText('이미지 처리 실패', {
            x: A4_WIDTH / 2 - 40,
            y: A4_HEIGHT / 2,
            size: 14,
            font,
            color: rgb(0.6, 0.1, 0.1),
          });
          
          page.drawText(`파일명: ${img.fileName}`, {
            x: MARGIN + 20,
            y: A4_HEIGHT / 2 - 30,
            size: 10,
            font,
            color: rgb(0.4, 0.4, 0.4),
          });
        } catch (e) {
          // Silent fail for text drawing
        }
      }
    }
    
    currentImageCount++;
    
    // Check size AFTER adding image - if exceeds limit, finalize and move this image to new PDF
    const tempBytes = await currentPdf.save();
    if (tempBytes.byteLength > MAX_PDF_SIZE_BYTES && currentImageCount > 1) {
      // Remove the last page (current image) and finalize
      const pageCount = currentPdf.getPageCount();
      if (pageCount > 0) {
        currentPdf.removePage(pageCount - 1);
        currentImageCount--;
        
        // Finalize PDF without the last image
        await finalizePdf(true);
        
        // Re-add the removed image to the new PDF
        const newPage = currentPdf.addPage([A4_WIDTH, A4_HEIGHT]);
        
        newPage.drawRectangle({
          x: MARGIN,
          y: A4_HEIGHT - MARGIN - HEADER_HEIGHT,
          width: A4_WIDTH - (MARGIN * 2),
          height: HEADER_HEIGHT,
          color: rgb(0.95, 0.95, 0.95),
          borderColor: rgb(0.7, 0.7, 0.7),
          borderWidth: 0.5,
        });
        
        // Use image-specific caseNumber if available, otherwise fall back to the general caseNumber
    const displayCaseNumber = img.caseNumber || insuranceAccidentNo || caseNumber;
    const headerText = `[${displayCaseNumber}] ${tabName} - ${img.category || '기타'}`;
        try {
          newPage.drawText(headerText, {
            x: MARGIN + 10,
            y: A4_HEIGHT - MARGIN - HEADER_HEIGHT + 10,
            size: 10,
            font,
            color: rgb(0.2, 0.2, 0.2),
          });
        } catch (e) {
          // Silent fail
        }
        
        if (!img.error && img.buffer.length > 0) {
          try {
            const embeddedImage = await currentPdf.embedJpg(img.buffer);
            const imgDims = embeddedImage.scale(1);
            const scaleX = imageAreaWidth / imgDims.width;
            const scaleY = imageAreaHeight / imgDims.height;
            const scale = Math.min(scaleX, scaleY, 1);
            const drawWidth = imgDims.width * scale;
            const drawHeight = imgDims.height * scale;
            const drawX = MARGIN + (imageAreaWidth - drawWidth) / 2;
            const drawY = MARGIN + 10 + (imageAreaHeight - drawHeight) / 2;
            
            newPage.drawImage(embeddedImage, {
              x: drawX,
              y: drawY,
              width: drawWidth,
              height: drawHeight,
            });
          } catch (e) {
            // Silent fail - image already has placeholder
          }
        }
        
        currentImageCount = 1;
      }
    }
  }
  
  // Finalize remaining images
  if (currentImageCount > 0) {
    await finalizePdf(partNumber > 1);
  }
  
  return results;
}

// Helper to get file buffer from Object Storage or fileData
async function getDocumentBuffer(doc: DocumentData): Promise<Buffer | null> {
  try {
    // 1. Object Storage에서 가져오기 (storageKey가 있는 경우)
    if (doc.storageKey) {
      const privateObjectDir = process.env.PRIVATE_OBJECT_DIR;
      if (privateObjectDir) {
        const fullPath = `${privateObjectDir}/${doc.storageKey}`;
        const storageService = new ObjectStorageService();
        const buffer = await storageService.downloadToBuffer(fullPath);
        console.log(`[Evidence PDF] Downloaded from Object Storage: ${doc.fileName} (${Math.round(buffer.length / 1024)}KB)`);
        return buffer;
      }
    }
    
    // 2. fileData에서 가져오기 (레거시)
    if (doc.fileData) {
      const base64Data = doc.fileData.includes(',') 
        ? doc.fileData.split(',')[1] 
        : doc.fileData;
      return Buffer.from(base64Data, 'base64');
    }
    
    return null;
  } catch (err) {
    console.error(`[Evidence PDF] Failed to get buffer for ${doc.fileName}:`, err);
    return null;
  }
}

// Check if document is a PDF file
function isPdfDocument(doc: DocumentData): boolean {
  const mimeType = doc.fileType || '';
  if (mimeType === 'application/pdf') return true;
  if (doc.fileName?.toLowerCase().endsWith('.pdf')) return true;
  return false;
}

// Check if document is an image file
function isImageDocument(doc: DocumentData): boolean {
  const mimeType = doc.fileType || '';
  if (mimeType.startsWith('image/') && !mimeType.includes('heic') && !mimeType.includes('webp')) return true;
  const ext = doc.fileName?.toLowerCase();
  if (ext?.endsWith('.jpg') || ext?.endsWith('.jpeg') || ext?.endsWith('.png') || ext?.endsWith('.gif')) return true;
  return false;
}

export async function generateEvidencePdfs(
  documents: DocumentData[],
  selectedDocumentIds: string[],
  caseNumber: string,
  insuranceAccidentNo: string,
  caseNumberMap?: Record<string, string>
): Promise<EvidencePdfResult[]> {
  console.log(`[Evidence PDF] Starting generation for ${selectedDocumentIds.length} selected documents`);
  
  const selectedDocs = documents.filter(doc => selectedDocumentIds.includes(doc.id));
  
  // Separate PDFs and images
  const pdfDocs: DocumentData[] = [];
  const imageDocs: DocumentData[] = [];
  
  for (const doc of selectedDocs) {
    // Check if document has data available (fileData or storageKey)
    if (!doc.fileData && !doc.storageKey) continue;
    
    if (isPdfDocument(doc)) {
      pdfDocs.push(doc);
    } else if (isImageDocument(doc)) {
      imageDocs.push(doc);
    }
  }
  
  console.log(`[Evidence PDF] Found ${pdfDocs.length} PDF documents, ${imageDocs.length} images`);
  
  const allResults: EvidencePdfResult[] = [];
  
  // 1. Add PDF documents as separate attachments
  for (const doc of pdfDocs) {
    try {
      const buffer = await getDocumentBuffer(doc);
      if (buffer && buffer.length > 0) {
        // Compress if needed
        let finalBuffer = buffer;
        if (buffer.length > 7 * 1024 * 1024) {
          console.log(`[Evidence PDF] Compressing PDF: ${doc.fileName} (${Math.round(buffer.length / 1024 / 1024 * 100) / 100}MB)`);
          finalBuffer = await compressPdfForEmail(buffer);
        }
        
        allResults.push({
          filename: doc.fileName,
          buffer: finalBuffer,
          tabName: getCategoryToTab(doc.category || ''),
          imageCount: 0,
        });
        console.log(`[Evidence PDF] Added PDF document: ${doc.fileName} (${Math.round(finalBuffer.length / 1024)}KB)`);
      }
    } catch (err) {
      console.error(`[Evidence PDF] Failed to process PDF ${doc.fileName}:`, err);
    }
  }
  
  // 2. Group images by tab and generate evidence PDFs
  const tabGroups: Record<string, DocumentData[]> = {
    '현장사진': [],
    '기본자료': [],
    '증빙자료': [],
    '청구자료': [],
    '기타': [],
  };
  
  for (const doc of imageDocs) {
    const tabName = getCategoryToTab(doc.category || '');
    if (tabGroups[tabName]) {
      tabGroups[tabName].push(doc);
    } else {
      tabGroups['기타'].push(doc);
    }
  }
  
  for (const [tabName, docs] of Object.entries(tabGroups)) {
    if (docs.length === 0) continue;
    
    console.log(`[Evidence PDF] Processing tab "${tabName}" with ${docs.length} images`);
    
    const processedImages: ProcessedImage[] = [];
    
    for (const doc of docs) {
      try {
        const fileBuffer = await getDocumentBuffer(doc);
        if (!fileBuffer || fileBuffer.length === 0) {
          console.warn(`[Evidence PDF] No data for image: ${doc.fileName}`);
          continue;
        }
        
        const processed = await compressImage(fileBuffer, doc.fileName);
        processed.category = doc.category || '';
        processed.caseNumber = (caseNumberMap && doc.caseId) ? caseNumberMap[doc.caseId] : undefined;
        processedImages.push(processed);
      } catch (err) {
        console.error(`[Evidence PDF] Failed to process ${doc.fileName}:`, err);
        processedImages.push({
          buffer: Buffer.alloc(0),
          width: 0,
          height: 0,
          fileName: doc.fileName,
          category: doc.category || '',
          caseNumber: (caseNumberMap && doc.caseId) ? caseNumberMap[doc.caseId] : undefined,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }
    
    if (processedImages.length > 0) {
      const tabResults = await createEvidencePdfForTab(
        tabName,
        processedImages,
        caseNumber,
        insuranceAccidentNo
      );
      
      allResults.push(...tabResults);
    }
  }
  
  console.log(`[Evidence PDF] Generation complete. Created ${allResults.length} PDF files`);
  
  for (const result of allResults) {
    console.log(`  - ${result.filename}: ${Math.round(result.buffer.length / 1024 / 1024 * 100) / 100}MB (${result.imageCount} images)`);
  }
  
  return allResults;
}

export function logAttachmentSummary(
  invoicePdf: Buffer,
  evidencePdfs: EvidencePdfResult[]
): void {
  console.log('\n========== SMTP 첨부 파일 요약 ==========');
  console.log(`Invoice.pdf: ${Math.round(invoicePdf.length / 1024 / 1024 * 1000) / 1000}MB`);
  
  let totalSize = invoicePdf.length;
  
  for (const pdf of evidencePdfs) {
    console.log(`${pdf.filename}: ${Math.round(pdf.buffer.length / 1024 / 1024 * 1000) / 1000}MB`);
    totalSize += pdf.buffer.length;
  }
  
  console.log(`------------------------------------------`);
  console.log(`총 첨부 파일 개수: ${1 + evidencePdfs.length}`);
  console.log(`총 첨부 용량: ${Math.round(totalSize / 1024 / 1024 * 1000) / 1000}MB`);
  console.log('==========================================\n');
}
