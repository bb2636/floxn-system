import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

interface CompressionResult {
  success: boolean;
  compressedBuffer?: Buffer;
  originalSize: number;
  compressedSize?: number;
  compressionRatio?: number;
  error?: string;
}

const PDF_SIZE_THRESHOLD = 2 * 1024 * 1024; // 2MB 이상일 때만 압축
const MAX_PDF_SIZE = 15 * 1024 * 1024; // 15MB 이상은 거부

export async function compressPdf(inputBuffer: Buffer): Promise<CompressionResult> {
  const originalSize = inputBuffer.length;
  
  // 2MB 미만은 압축 불필요
  if (originalSize < PDF_SIZE_THRESHOLD) {
    console.log(`[pdf-compress] 파일 크기 ${(originalSize / 1024 / 1024).toFixed(2)}MB - 압축 불필요`);
    return {
      success: true,
      compressedBuffer: inputBuffer,
      originalSize,
      compressedSize: originalSize,
      compressionRatio: 100,
    };
  }
  
  // 15MB 초과는 거부
  if (originalSize > MAX_PDF_SIZE) {
    console.log(`[pdf-compress] 파일 크기 ${(originalSize / 1024 / 1024).toFixed(2)}MB - 최대 크기 초과`);
    return {
      success: false,
      originalSize,
      error: `PDF 파일이 너무 큽니다 (${(originalSize / 1024 / 1024).toFixed(1)}MB). 최대 15MB까지 업로드 가능합니다.`,
    };
  }
  
  const tempDir = os.tmpdir();
  const uniqueId = crypto.randomBytes(8).toString('hex');
  const inputPath = path.join(tempDir, `input_${uniqueId}.pdf`);
  const outputPath = path.join(tempDir, `output_${uniqueId}.pdf`);
  
  try {
    // 임시 파일에 PDF 저장
    fs.writeFileSync(inputPath, inputBuffer);
    
    console.log(`[pdf-compress] Ghostscript 압축 시작: ${(originalSize / 1024 / 1024).toFixed(2)}MB`);
    
    // Ghostscript로 PDF 압축 (ebook 품질 - 중간 수준 압축)
    const gsCommand = [
      'gs',
      '-sDEVICE=pdfwrite',
      '-dCompatibilityLevel=1.4',
      '-dPDFSETTINGS=/ebook',  // /screen(최저) /ebook(중간) /printer(고품질)
      '-dNOPAUSE',
      '-dQUIET',
      '-dBATCH',
      '-dColorImageResolution=150',
      '-dGrayImageResolution=150',
      '-dMonoImageResolution=150',
      `-sOutputFile=${outputPath}`,
      inputPath,
    ];
    
    await new Promise<void>((resolve, reject) => {
      const gs = spawn(gsCommand[0], gsCommand.slice(1), {
        timeout: 60000, // 60초 타임아웃
      });
      
      let stderr = '';
      gs.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      gs.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Ghostscript failed with code ${code}: ${stderr}`));
        }
      });
      
      gs.on('error', (err) => {
        reject(err);
      });
    });
    
    // 압축된 파일 읽기
    if (!fs.existsSync(outputPath)) {
      throw new Error('압축된 PDF 파일이 생성되지 않았습니다');
    }
    
    const compressedBuffer = fs.readFileSync(outputPath);
    const compressedSize = compressedBuffer.length;
    const compressionRatio = Math.round((compressedSize / originalSize) * 100);
    
    console.log(`[pdf-compress] 압축 완료: ${(originalSize / 1024 / 1024).toFixed(2)}MB → ${(compressedSize / 1024 / 1024).toFixed(2)}MB (${compressionRatio}%)`);
    
    // 압축된 파일이 더 작으면 압축 버전 사용, 아니면 원본 사용
    if (compressedSize < originalSize) {
      return {
        success: true,
        compressedBuffer,
        originalSize,
        compressedSize,
        compressionRatio,
      };
    } else {
      console.log(`[pdf-compress] 압축 효과 없음 - 원본 사용`);
      return {
        success: true,
        compressedBuffer: inputBuffer,
        originalSize,
        compressedSize: originalSize,
        compressionRatio: 100,
      };
    }
  } catch (error) {
    console.error('[pdf-compress] 압축 오류:', error);
    
    // 압축 실패 시 원본 반환 (오류로 중단하지 않음)
    return {
      success: true,
      compressedBuffer: inputBuffer,
      originalSize,
      compressedSize: originalSize,
      compressionRatio: 100,
      error: `압축 실패 (원본 사용): ${(error as Error).message}`,
    };
  } finally {
    // 임시 파일 정리
    try {
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    } catch (cleanupError) {
      console.warn('[pdf-compress] 임시 파일 정리 실패:', cleanupError);
    }
  }
}

export function isPdfFile(fileType: string | undefined, fileName: string | undefined): boolean {
  if (fileType === 'application/pdf') return true;
  if (fileName?.toLowerCase().endsWith('.pdf')) return true;
  return false;
}
