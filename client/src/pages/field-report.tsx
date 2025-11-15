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
  // 현장조사 정보
  visitDate: string | null;
  visitTime: string | null;
  travelDistance: string | null;
  dispatchLocation: string | null;
  accompaniedPerson: string | null;
  accidentCategory: string | null;
  accidentCause: string | null;
  specialNotes: string | null;
  victimName: string | null;
  victimContact: string | null;
  victimAddress: string | null;
  additionalVictims: string | null;
  specialRequests: string | null;
  processingTypes: string | null;
  processingTypeOther: string | null;
  recoveryMethodType: string | null;
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
          {/* 현장조사 정보 섹션 */}
          <div>
            <h2
              style={{
                fontFamily: "Pretendard",
                fontSize: "20px",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: "#0C0C0C",
                marginBottom: "24px",
              }}
            >
              현장조사 정보
            </h2>

            {/* 현장정보 */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "16px",
                    fontWeight: 600,
                    color: "rgba(12, 12, 12, 0.8)",
                  }}
                >
                  현장정보
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center">
                  <span
                    className="w-32"
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "rgba(12, 12, 12, 0.6)",
                    }}
                  >
                    방문일시
                  </span>
                  <span
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: "#0C0C0C",
                    }}
                  >
                    {caseData.visitDate && caseData.visitTime 
                      ? `${caseData.visitDate} ${caseData.visitTime}` 
                      : caseData.visitDate || "-"}
                  </span>
                </div>
                <div className="flex items-center">
                  <span
                    className="w-32"
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "rgba(12, 12, 12, 0.6)",
                    }}
                  >
                    현장 이동 거리
                  </span>
                  <span
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: "#0C0C0C",
                    }}
                  >
                    {caseData.travelDistance ? `${caseData.travelDistance}km` : "-"}
                  </span>
                </div>
                <div className="flex items-center">
                  <span
                    className="w-32"
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "rgba(12, 12, 12, 0.6)",
                    }}
                  >
                    출동 담당자
                  </span>
                  <span
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: "#0C0C0C",
                    }}
                  >
                    {caseData.accompaniedPerson || "-"}
                  </span>
                </div>
                <div className="flex items-center">
                  <span
                    className="w-32"
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "rgba(12, 12, 12, 0.6)",
                    }}
                  >
                    피보험자 주소
                  </span>
                  <span
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: "#0C0C0C",
                    }}
                  >
                    {caseData.insuredAddress || "-"}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* 사고 원인(누수원천) */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "16px",
                    fontWeight: 600,
                    color: "rgba(12, 12, 12, 0.8)",
                  }}
                >
                  사고 원인(누수원천)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center">
                  <span
                    className="w-32"
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "rgba(12, 12, 12, 0.6)",
                    }}
                  >
                    카테고리
                  </span>
                  <div
                    className="px-3 py-1 rounded"
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: "#008FED",
                      background: "rgba(0, 143, 237, 0.1)",
                    }}
                  >
                    {caseData.accidentCategory || "-"}
                  </div>
                </div>
                <div>
                  <span
                    className="block mb-2"
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "rgba(12, 12, 12, 0.6)",
                    }}
                  >
                    사고원인
                  </span>
                  <div
                    className="p-4 rounded"
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: "#0C0C0C",
                      background: "rgba(12, 12, 12, 0.03)",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {caseData.accidentCause || "이 안에는 사고원인이 적성됩니다."}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 현장 특이사항 */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "16px",
                    fontWeight: 600,
                    color: "rgba(12, 12, 12, 0.8)",
                  }}
                >
                  현장 특이사항
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="p-4 rounded"
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    color: "#0C0C0C",
                    background: "rgba(12, 12, 12, 0.03)",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {caseData.specialNotes || "이 안에는 특이사항이 적성됩니다."}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 피해 복구방식 및 처리 유형 섹션 */}
          <div>
            <h2
              style={{
                fontFamily: "Pretendard",
                fontSize: "20px",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: "#0C0C0C",
                marginBottom: "24px",
              }}
            >
              피해 복구방식 및 처리 유형
            </h2>

            {/* 피해자 정보 */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "16px",
                    fontWeight: 600,
                    color: "rgba(12, 12, 12, 0.8)",
                  }}
                >
                  피해자 정보
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(() => {
                  const victims = [];
                  
                  // 기본 피해자
                  if (caseData.victimName) {
                    victims.push({
                      name: caseData.victimName,
                      contact: caseData.victimContact || "",
                      address: caseData.victimAddress || "",
                    });
                  }
                  
                  // 추가 피해자
                  if (caseData.additionalVictims && caseData.additionalVictims.trim()) {
                    try {
                      const additional = JSON.parse(caseData.additionalVictims);
                      if (Array.isArray(additional)) {
                        victims.push(...additional);
                      }
                    } catch (e) {
                      console.error("Error parsing additional victims:", e);
                    }
                  }
                  
                  return victims.length > 0 ? (
                    victims.map((victim, index) => (
                      <div 
                        key={index}
                        className="p-3 rounded flex items-center gap-3"
                        style={{ background: "rgba(12, 12, 12, 0.03)" }}
                      >
                        <div
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: "#008FED" }}
                        />
                        <span
                          style={{
                            fontFamily: "Pretendard",
                            fontSize: "14px",
                            fontWeight: 600,
                            color: "#0C0C0C",
                          }}
                        >
                          {victim.name}
                        </span>
                        <span
                          style={{
                            fontFamily: "Pretendard",
                            fontSize: "14px",
                            color: "rgba(12, 12, 12, 0.6)",
                          }}
                        >
                          {victim.contact}
                        </span>
                        <span
                          style={{
                            fontFamily: "Pretendard",
                            fontSize: "14px",
                            color: "rgba(12, 12, 12, 0.6)",
                          }}
                        >
                          {victim.address}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p style={{ fontFamily: "Pretendard", fontSize: "14px", color: "rgba(12, 12, 12, 0.5)" }}>
                      등록된 피해자가 없습니다.
                    </p>
                  );
                })()}
              </CardContent>
            </Card>

            {/* 처리 유형 및 복구 방식 */}
            <Card>
              <CardHeader>
                <CardTitle
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "16px",
                    fontWeight: 600,
                    color: "rgba(12, 12, 12, 0.8)",
                  }}
                >
                  처리 유형 및 복구 방식
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center">
                  <span
                    className="w-32"
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "rgba(12, 12, 12, 0.6)",
                    }}
                  >
                    처리 유형
                  </span>
                  <div className="flex gap-2">
                    {(() => {
                      let types: string[] = [];
                      
                      if (caseData.processingTypes && caseData.processingTypes.trim()) {
                        try {
                          const parsed = JSON.parse(caseData.processingTypes);
                          if (Array.isArray(parsed)) {
                            types = parsed;
                          }
                        } catch (e) {
                          console.error("Error parsing processing types:", e);
                        }
                      }
                      
                      return types.length > 0 ? (
                        types.map((type: string, index: number) => (
                          <div
                            key={index}
                            className="px-3 py-1 rounded"
                            style={{
                              fontFamily: "Pretendard",
                              fontSize: "14px",
                              color: "#008FED",
                              background: "rgba(0, 143, 237, 0.1)",
                            }}
                          >
                            {type}
                          </div>
                        ))
                      ) : (
                        <span style={{ fontFamily: "Pretendard", fontSize: "14px", color: "rgba(12, 12, 12, 0.5)" }}>
                          -
                        </span>
                      );
                    })()}
                  </div>
                </div>
                <div className="flex items-center">
                  <span
                    className="w-32"
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "rgba(12, 12, 12, 0.6)",
                    }}
                  >
                    복구 방식
                  </span>
                  <div
                    className="px-3 py-1 rounded"
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: "#008FED",
                      background: "rgba(0, 143, 237, 0.1)",
                    }}
                  >
                    {caseData.recoveryMethodType || "-"}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
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
