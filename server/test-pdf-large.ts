/**
 * PDF 생성 대용량 데이터 처리 테스트 스크립트
 * 
 * 실행 방법:
 *   npm run test:pdf-large
 *   또는
 *   tsx server/test-pdf-large.ts
 */

import { generateInvoicePdf } from "./invoice-pdf-service";
import fs from "fs";
import path from "path";

// 테스트 결과 저장 디렉토리
const TEST_OUTPUT_DIR = path.join(process.cwd(), "test-pdf-output");

// 테스트 결과 디렉토리 생성
if (!fs.existsSync(TEST_OUTPUT_DIR)) {
  fs.mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
}

interface TestResult {
  testName: string;
  success: boolean;
  error?: string;
  pdfSize?: number;
  pdfPath?: string;
  duration?: number;
  itemCount?: number;
  textLength?: number;
}

const results: TestResult[] = [];

/**
 * 대용량 데이터 처리 테스트
 */
async function testLargeData(): Promise<void> {
  console.log("=".repeat(60));
  console.log("PDF 생성 대용량 데이터 처리 테스트");
  console.log("=".repeat(60));
  
  const testCases = [
    {
      name: "긴 텍스트 (1000자)",
      recipientName: "홍길동".repeat(100),
      caseNumber: "CASE-2024-015",
      insuranceAccidentNo: "ACC-" + "A".repeat(100),
      remarks: "긴 텍스트 테스트: " + "테스트 ".repeat(200),
      itemCount: 50,
    },
    {
      name: "많은 항목 (100개)",
      recipientName: "김철수",
      caseNumber: "CASE-2024-016",
      insuranceAccidentNo: "ACC-999-888",
      remarks: "많은 항목 테스트",
      itemCount: 100,
    },
    {
      name: "많은 항목 (500개)",
      recipientName: "박민수",
      caseNumber: "CASE-2024-018",
      insuranceAccidentNo: "ACC-500-001",
      remarks: "매우 많은 항목 테스트",
      itemCount: 500,
    },
    {
      name: "긴 텍스트 + 많은 항목 (200개)",
      recipientName: "이영희",
      caseNumber: "CASE-2024-017",
      insuranceAccidentNo: "ACC-777-666",
      remarks: "긴 텍스트와 많은 항목: " + "테스트 ".repeat(300),
      itemCount: 200,
    },
    {
      name: "극한 테스트 (1000개 항목)",
      recipientName: "최대용량테스트",
      caseNumber: "CASE-2024-019",
      insuranceAccidentNo: "ACC-1000-001",
      remarks: "극한 대용량 테스트: " + "매우 긴 텍스트 ".repeat(500),
      itemCount: 1000,
    },
  ];

  for (const testCase of testCases) {
    try {
      console.log(`\n[${testCase.name}] PDF 생성 중...`);
      console.log(`  - 항목 수: ${testCase.itemCount}개`);
      console.log(`  - 수신자명 길이: ${testCase.recipientName.length}자`);
      console.log(`  - 비고 길이: ${testCase.remarks.length}자`);
      
      // 많은 항목 생성
      const particulars = Array.from({ length: testCase.itemCount }, (_, i) => ({
        title: `항목 ${i + 1}`,
        detail: `상세 설명 ${i + 1}: ${"테스트 ".repeat(10)}`,
        amount: (i + 1) * 10000,
      }));

      const invoiceData = {
        recipientName: testCase.recipientName,
        caseNumber: testCase.caseNumber,
        acceptanceDate: "2024-01-15",
        submissionDate: "2024-01-20",
        insuranceAccidentNo: testCase.insuranceAccidentNo,
        particulars,
        totalAmount: particulars.reduce((sum, p) => sum + p.amount, 0),
        remarks: testCase.remarks,
      };

      const startTime = Date.now();
      const pdfBuffer = await generateInvoicePdf(invoiceData);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      const fileName = `test-large-${testCase.name.replace(/\s+/g, "-")}.pdf`;
      const filePath = path.join(TEST_OUTPUT_DIR, fileName);
      
      fs.writeFileSync(filePath, pdfBuffer);
      
      results.push({
        testName: testCase.name,
        success: true,
        pdfSize: pdfBuffer.length,
        pdfPath: filePath,
        duration,
        itemCount: testCase.itemCount,
        textLength: testCase.recipientName.length + testCase.remarks.length,
      });
      
      console.log(`✅ 성공: ${fileName}`);
      console.log(`  - PDF 크기: ${Math.round(pdfBuffer.length / 1024)}KB (${Math.round(pdfBuffer.length / 1024 / 1024 * 100) / 100}MB)`);
      console.log(`  - 생성 시간: ${duration}ms (${(duration / 1000).toFixed(2)}초)`);
      console.log(`  - 처리 속도: ${Math.round(testCase.itemCount / (duration / 1000))} 항목/초`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ 실패: ${errorMessage}`);
      results.push({
        testName: testCase.name,
        success: false,
        error: errorMessage,
        itemCount: testCase.itemCount,
      });
    }
  }
  
  // 결과 요약
  console.log("\n" + "=".repeat(60));
  console.log("테스트 결과 요약");
  console.log("=".repeat(60));
  
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  const totalCount = results.length;
  
  console.log(`\n총 테스트: ${totalCount}개`);
  console.log(`성공: ${successCount}개 (${Math.round(successCount / totalCount * 100)}%)`);
  console.log(`실패: ${failCount}개 (${Math.round(failCount / totalCount * 100)}%)`);
  
  if (successCount > 0) {
    console.log("\n성공한 테스트 상세:");
    results.filter(r => r.success).forEach(r => {
      console.log(`  - ${r.testName}:`);
      console.log(`    항목 수: ${r.itemCount}개`);
      console.log(`    PDF 크기: ${r.pdfSize ? Math.round(r.pdfSize / 1024) : 0}KB`);
      console.log(`    생성 시간: ${r.duration}ms`);
      if (r.duration && r.itemCount) {
        console.log(`    처리 속도: ${Math.round(r.itemCount / (r.duration / 1000))} 항목/초`);
      }
    });
  }
  
  if (failCount > 0) {
    console.log("\n실패한 테스트:");
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.testName}: ${r.error}`);
    });
  }
  
  console.log(`\n생성된 PDF 파일 위치: ${TEST_OUTPUT_DIR}`);
  console.log("=".repeat(60));
}

// 스크립트 직접 실행 시
testLargeData().catch(console.error);

export { testLargeData };
