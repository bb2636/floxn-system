import { useState } from "react";
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
  assessorName: string;
}

export default function FieldReport() {
  // 현장입력에서 선택한 케이스 ID 가져오기
  const selectedCaseId = localStorage.getItem('selectedFieldSurveyCaseId') || '';
  
  // 선택된 케이스 데이터 가져오기
  const { data: selectedCase, isLoading: isLoadingSelectedCase } = useQuery<Case>({
    queryKey: ["/api/cases", selectedCaseId],
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

  if (isLoadingSelectedCase) {
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

  if (!selectedCase) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">케이스를 찾을 수 없습니다.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

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
              {selectedCase.insuranceCompany || "보험사 미정"} {selectedCase.insuranceAccidentNo || ""}
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
            <span>접수번호 {selectedCase.caseNumber}</span>
            <span>계약자 {selectedCase.policyHolderName || selectedCase.clientName || "미정"}</span>
            <span>담당자 {selectedCase.assessorName || "미정"}</span>
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
                    <span className="text-sm">누수닥터</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground w-24">담당자명</span>
                    <span className="text-sm">김플록</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground w-24">담당자 연락처</span>
                    <span className="text-sm">010 0000 0000</span>
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
                    <span className="text-sm">{selectedCase.caseNumber}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground w-24">보험사</span>
                    <span className="text-sm">{selectedCase.insuranceCompany}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* 보험계약자 및 피보험자 정보 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">보험계약자 및 피보험자 정보</CardTitle>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="same-person" />
                <label htmlFor="same-person" className="text-sm">보험계약자 = 피보험자</label>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground w-24">보험계약자</span>
                    <span className="text-sm">김플록</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground w-24">피보험자</span>
                    <span className="text-sm">김플록</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground w-24">피보험자 연락처</span>
                    <span className="text-sm">010 0000 0000</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground w-24">피보험자 주소</span>
                    <span className="text-sm">서울 관악구 낙원로 55-11 511호</span>
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
              <span className="text-sm">2025-00-00 00:00</span>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 도면 탭 */}
        <TabsContent value="도면">
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground">도면 데이터를 표시합니다.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 증빙자료 탭 */}
        <TabsContent value="증빙자료">
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground">증빙자료 데이터를 표시합니다.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 견적서 탭 */}
        <TabsContent value="견적서">
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground">견적서 데이터를 표시합니다.</p>
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
