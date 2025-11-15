import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Case {
  id: string;
  caseNumber: string;
  insuranceCompany: string;
  insuranceAccidentNo: string;
  clientName: string;
  policyHolderName: string;
  insuredName: string;
  insuredContact: string;
  insuredAddress: string;
  accidentDate: string;
  accidentTime: string;
  assignedPartner: string;
  assignedPartnerManager: string;
  assignedPartnerContact: string;
}

interface Drawing {
  id: string;
  caseId: string;
  uploadedImages: Array<{
    id: string;
    src: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
}

interface CaseDocument {
  id: string;
  caseId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  category: string;
  createdAt: string;
}

interface Estimate {
  id: string;
  caseId: string;
  version: number;
  status: string;
}

interface EstimateRow {
  id: string;
  category: string;
  location: string;
  workName: string;
  damageArea: number;
  repairArea: number;
  note: string;
}

interface ReportData {
  case: Case;
  drawing: Drawing | null;
  documents: CaseDocument[];
  estimate: {
    estimate: Estimate | null;
    rows: EstimateRow[];
  };
}

export default function FieldReport() {
  // 현장입력에서 선택한 케이스 ID 가져오기
  const selectedCaseId = localStorage.getItem('selectedFieldSurveyCaseId') || '';
  
  // 통합 보고서 데이터 가져오기
  const { data: reportData, isLoading } = useQuery<ReportData>({
    queryKey: ["/api/field-surveys", selectedCaseId, "report"],
    enabled: !!selectedCaseId,
  });

  if (!selectedCaseId) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">케이스를 먼저 선택해주세요.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">로딩중...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">보고서 데이터를 찾을 수 없습니다.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { case: caseData, drawing, documents, estimate } = reportData;

  return (
    <div className="relative p-8">
      {/* 페이지 타이틀 */}
      <div className="flex items-center gap-2 mb-8">
        <h1
          style={{
            fontFamily: "Pretendard",
            fontSize: "24px",
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: "#0C0C0C",
          }}
        >
          현장출동보고서
        </h1>
        <div
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: "rgba(12, 12, 12, 0.2)",
          }}
        />
      </div>

      {/* 작성중인 건 */}
      <div className="mb-6">
        <div
          style={{
            fontFamily: "Pretendard",
            fontSize: "14px",
            fontWeight: 400,
            letterSpacing: "-0.02em",
            color: "rgba(12, 12, 12, 0.5)",
            marginBottom: "8px",
          }}
        >
          작성중인 건
        </div>
        
        <div 
          className="p-4 rounded-lg"
          style={{
            background: "rgba(12, 12, 12, 0.03)",
          }}
        >
          {/* 첫 번째 줄: 보험사명 + 사고번호 */}
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: "#008FED" }}
            />
            <span
              style={{
                fontFamily: "Pretendard",
                fontSize: "15px",
                fontWeight: 600,
                letterSpacing: "-0.02em",
                color: "#0C0C0C",
              }}
            >
              {caseData.insuranceCompany || "보험사 미정"} {caseData.insuranceAccidentNo || ""}
            </span>
          </div>
          
          {/* 두 번째 줄: 접수번호, 계약자, 담당자 */}
          <div 
            className="flex items-center gap-4"
            style={{
              fontFamily: "Pretendard",
              fontSize: "13px",
              fontWeight: 400,
              letterSpacing: "-0.02em",
              color: "rgba(12, 12, 12, 0.5)",
              paddingLeft: "12px",
            }}
          >
            <span>접수번호 {caseData.caseNumber}</span>
            <span>계약자 {caseData.policyHolderName || caseData.clientName || "미정"}</span>
            <span>담당자 {caseData.assignedPartnerManager || "미정"}</span>
          </div>
        </div>
      </div>

      {/* 탭 메뉴 */}
      <Tabs defaultValue="현장조사" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="현장조사">현장조사</TabsTrigger>
          <TabsTrigger value="도면">도면</TabsTrigger>
          <TabsTrigger value="증빙자료">증빙자료</TabsTrigger>
          <TabsTrigger value="견적서">견적서</TabsTrigger>
          <TabsTrigger value="기타사항/원인">기타사항/원인</TabsTrigger>
        </TabsList>

        {/* 현장조사 탭 */}
        <TabsContent value="현장조사" className="space-y-6">
          {/* 기본 정보 섹션 */}
          <div>
            <h2 className="text-lg font-semibold mb-4">기본 정보</h2>
            <div className="grid grid-cols-2 gap-4">
              {/* 협력사 정보 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">협력사 정보</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground w-24">업체</span>
                    <span className="text-sm">{caseData.assignedPartner || "미배정"}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground w-24">담당자명</span>
                    <span className="text-sm">{caseData.assignedPartnerManager || "미정"}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground w-24">담당자 연락처</span>
                    <span className="text-sm">{caseData.assignedPartnerContact || "미정"}</span>
                  </div>
                </CardContent>
              </Card>

              {/* 가옥 정보 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">가옥 정보</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground w-24">접수번호</span>
                    <span className="text-sm">{caseData.caseNumber}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground w-24">보험사</span>
                    <span className="text-sm">{caseData.insuranceCompany || "미정"}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* 보험계약자 및 피보험자 정보 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">보험계약자 및 피보험자 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground w-24">보험계약자</span>
                    <span className="text-sm">{caseData.policyHolderName || "미정"}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground w-24">피보험자</span>
                    <span className="text-sm">{caseData.insuredName || "미정"}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground w-24">피보험자 연락처</span>
                    <span className="text-sm">{caseData.insuredContact || "미정"}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground w-24">피보험자 주소</span>
                    <span className="text-sm">{caseData.insuredAddress || "미정"}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 사고 발생 일시 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">사고 발생 일시</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-sm">
                {caseData.accidentDate ? `${caseData.accidentDate} ${caseData.accidentTime || ''}` : "미정"}
              </span>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 도면 탭 */}
        <TabsContent value="도면">
          <Card>
            <CardContent className="p-6">
              {drawing && drawing.uploadedImages && drawing.uploadedImages.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold">업로드된 도면 이미지</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {drawing.uploadedImages.map((img) => (
                      <div key={img.id} className="border rounded-lg p-2">
                        <img 
                          src={img.src} 
                          alt={`도면 이미지 ${img.id}`}
                          className="w-full h-auto rounded"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">등록된 도면이 없습니다.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 증빙자료 탭 */}
        <TabsContent value="증빙자료">
          <Card>
            <CardContent className="p-6">
              {documents && documents.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold">등록된 증빙자료 ({documents.length}건)</h3>
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <div 
                        key={doc.id} 
                        className="flex items-center justify-between p-3 border rounded-lg hover-elevate"
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-sm font-medium">{doc.fileName}</div>
                          <div className="text-xs text-muted-foreground">
                            {doc.category} • {(doc.fileSize / 1024).toFixed(1)} KB
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(doc.createdAt).toLocaleDateString('ko-KR')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">등록된 증빙자료가 없습니다.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 견적서 탭 */}
        <TabsContent value="견적서">
          <Card>
            <CardContent className="p-6">
              {estimate.estimate && estimate.rows && estimate.rows.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">복구면적 산출표</h3>
                    <div className="text-xs text-muted-foreground">
                      버전 {estimate.estimate.version} • {estimate.estimate.status}
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="p-2 text-left">장소</th>
                          <th className="p-2 text-left">위치</th>
                          <th className="p-2 text-left">공사내용</th>
                          <th className="p-2 text-right">피해면적 (㎡)</th>
                          <th className="p-2 text-right">복구면적 (㎡)</th>
                          <th className="p-2 text-left">비고</th>
                        </tr>
                      </thead>
                      <tbody>
                        {estimate.rows.map((row) => (
                          <tr key={row.id} className="border-b">
                            <td className="p-2">{row.category}</td>
                            <td className="p-2">{row.location}</td>
                            <td className="p-2">{row.workName}</td>
                            <td className="p-2 text-right">
                              {row.damageArea ? (row.damageArea / 1_000_000).toFixed(2) : '-'}
                            </td>
                            <td className="p-2 text-right">
                              {row.repairArea ? (row.repairArea / 1_000_000).toFixed(2) : '-'}
                            </td>
                            <td className="p-2">{row.note || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">등록된 견적서가 없습니다.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 기타사항/원인 탭 */}
        <TabsContent value="기타사항/원인">
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground">기타사항/원인 데이터를 표시합니다.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
