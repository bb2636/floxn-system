import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Case, MasterData } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Check } from "lucide-react";
import { FieldSurveyLayout } from "@/components/field-survey-layout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AreaCalculationRow {
  id: string;
  category: string; // 장소: 주방, 화장실, 방안, 거실상
  location: string; // 위치
  workName: string; // 공사명
  damageWidth: string; // 피해면적 가로 (mm)
  damageHeight: string; // 피해면적 세로 (mm)
  damageArea: string; // 피해면적 면적 (m²)
  repairWidth: string; // 복구면적 가로 (mm)
  repairHeight: string; // 복구면적 세로 (mm)
  repairArea: string; // 복구면적 면적 (m²)
  note: string; // 비고
}

const CATEGORIES = ["복구면적 산출표", "노무비", "자재비", "견적서"];

export default function FieldEstimate() {
  const [selectedCategory, setSelectedCategory] = useState("복구면적 산출표");
  const [rows, setRows] = useState<AreaCalculationRow[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  // 현장입력에서 선택한 케이스 ID 가져오기
  const selectedCaseId = localStorage.getItem('selectedFieldSurveyCaseId') || '';

  const { toast } = useToast();

  // 마스터 데이터 조회
  const { data: masterDataList = [] } = useQuery<MasterData[]>({
    queryKey: ['/api/master-data'],
  });

  // 카테고리별 마스터 데이터 필터링
  const roomCategories = masterDataList
    .filter(item => item.category === 'room_category')
    .map(item => item.value);
  const locations = masterDataList
    .filter(item => item.category === 'location')
    .map(item => item.value);
  const workNames = masterDataList
    .filter(item => item.category === 'work_name')
    .map(item => item.value);

  // 선택된 케이스 데이터 가져오기
  const { data: selectedCase, isLoading: isLoadingSelectedCase } = useQuery<Case>({
    queryKey: ["/api/cases", selectedCaseId],
    enabled: !!selectedCaseId,
  });

  // 최신 견적 가져오기
  const { data: latestEstimate } = useQuery<{ estimate: any; rows: any[] }>({
    queryKey: ["/api/estimates", selectedCaseId, "latest"],
    enabled: !!selectedCaseId,
  });

  // 초기 빈 행 생성 또는 견적 불러오기
  useEffect(() => {
    if (latestEstimate?.rows && latestEstimate.rows.length > 0) {
      // 기존 견적이 있으면 불러오기
      const loadedRows = latestEstimate.rows.map((row: any) => ({
        id: `row-${row.id}`,
        category: row.category || (roomCategories[0] || ""),
        location: row.location || (locations[0] || ""),
        workName: row.workName || (workNames[0] || ""),
        damageWidth: row.damageWidth?.toString() || "0000",
        damageHeight: row.damageHeight?.toString() || "0000",
        damageArea: row.damageArea ? (row.damageArea / 1000000).toFixed(2) : "0000",
        repairWidth: row.repairWidth?.toString() || "0000",
        repairHeight: row.repairHeight?.toString() || "0000",
        repairArea: row.repairArea ? (row.repairArea / 1000000).toFixed(2) : "0000",
        note: row.note || "",
      }));
      setRows(loadedRows);
    } else if (rows.length === 0 && masterDataList.length > 0) {
      // 견적이 없고 마스터 데이터가 로드되었으면 빈 행 생성
      addRow();
    }
  }, [latestEstimate, masterDataList]);

  // 빈 행 생성 함수
  const createBlankRow = (): AreaCalculationRow => ({
    id: `row-${Date.now()}-${Math.random()}`,
    category: roomCategories[0] || "",
    location: locations[0] || "",
    workName: workNames[0] || "",
    damageWidth: "0000",
    damageHeight: "0000",
    damageArea: "0000",
    repairWidth: "0000",
    repairHeight: "0000",
    repairArea: "0000",
    note: "",
  });

  // 행 추가
  const addRow = () => {
    setRows(prev => [...prev, createBlankRow()]);
  };

  // 선택된 행 삭제
  const deleteSelectedRows = () => {
    if (selectedRows.size === 0) return;
    setRows(prev => prev.filter(row => !selectedRows.has(row.id)));
    setSelectedRows(new Set());
  };

  // 체크박스 토글
  const toggleRowSelection = (rowId: string) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(rowId)) {
      newSelected.delete(rowId);
    } else {
      newSelected.add(rowId);
    }
    setSelectedRows(newSelected);
  };

  // 행 업데이트
  const updateRow = (rowId: string, field: keyof AreaCalculationRow, value: string) => {
    setRows(prev => prev.map(row => {
      if (row.id === rowId) {
        const updated = { ...row, [field]: value };
        
        // 가로/세로 변경 시 면적 자동 계산
        if (field === 'damageWidth' || field === 'damageHeight') {
          const width = parseFloat(field === 'damageWidth' ? value : row.damageWidth) || 0;
          const height = parseFloat(field === 'damageHeight' ? value : row.damageHeight) || 0;
          // mm² -> m² 변환 (1,000,000 mm² = 1 m²)
          const area = (width * height / 1000000).toFixed(2);
          updated.damageArea = area;
        }
        
        if (field === 'repairWidth' || field === 'repairHeight') {
          const width = parseFloat(field === 'repairWidth' ? value : row.repairWidth) || 0;
          const height = parseFloat(field === 'repairHeight' ? value : row.repairHeight) || 0;
          // mm² -> m² 변환
          const area = (width * height / 1000000).toFixed(2);
          updated.repairArea = area;
        }
        
        return updated;
      }
      return row;
    }));
  };

  // 초기화
  const handleReset = () => {
    if (masterDataList.length === 0) {
      toast({
        title: "잠시만 기다려주세요",
        description: "마스터 데이터를 로딩 중입니다.",
        variant: "destructive",
      });
      return;
    }
    if (confirm("입력한 내용을 모두 초기화하시겠습니까?")) {
      setRows([createBlankRow()]);
      setSelectedRows(new Set());
    }
  };

  // 저장 mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCaseId) {
        throw new Error("케이스가 선택되지 않았습니다");
      }

      // UI 데이터를 API 형식으로 변환 (rowOrder는 서버에서 자동 할당)
      const apiRows = rows.map((row) => ({
        category: row.category,
        location: row.location === "선택" ? null : row.location,
        workName: row.workName === "선택" ? null : row.workName,
        damageWidth: row.damageWidth,
        damageHeight: row.damageHeight,
        damageArea: row.damageArea,
        repairWidth: row.repairWidth,
        repairHeight: row.repairHeight,
        repairArea: row.repairArea,
        note: row.note,
      }));

      return await apiRequest("POST", `/api/estimates/${selectedCaseId}`, { rows: apiRows });
    },
    onSuccess: () => {
      toast({
        title: "저장 완료",
        description: "견적이 성공적으로 저장되었습니다.",
      });
      // 견적 목록 및 최신 견적 갱신
      queryClient.invalidateQueries({ queryKey: ["/api/estimates", selectedCaseId] });
      queryClient.invalidateQueries({ queryKey: ["/api/estimates", selectedCaseId, "latest"] });
    },
    onError: (error: any) => {
      toast({
        title: "저장 실패",
        description: error.message || "견적 저장 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // 저장
  const handleSave = () => {
    saveMutation.mutate();
  };

  if (isLoadingSelectedCase) {
    return (
      <FieldSurveyLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p style={{ fontFamily: "Pretendard", color: "rgba(12, 12, 12, 0.6)" }}>
              로딩 중...
            </p>
          </div>
        </div>
      </FieldSurveyLayout>
    );
  }

  if (!selectedCase) {
    return (
      <FieldSurveyLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p style={{ fontFamily: "Pretendard", fontSize: "16px", color: "rgba(12, 12, 12, 0.6)" }}>
              현장입력에서 케이스를 먼저 선택해주세요.
            </p>
          </div>
        </div>
      </FieldSurveyLayout>
    );
  }

  return (
    <FieldSurveyLayout>
      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "32px 40px 60px",
        }}
      >
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
            견적서 작성
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
              <span>담당자 {selectedCase.assignedPartnerManager || "미정"}</span>
            </div>
          </div>
        </div>

        {/* 카테고리 탭 */}
        <div 
          className="flex gap-8 mb-6"
          style={{
            borderBottom: "2px solid rgba(12, 12, 12, 0.08)",
          }}
        >
          {CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setSelectedCategory(category)}
              className="pb-3 transition-all relative"
              style={{
                fontFamily: "Pretendard",
                fontSize: "16px",
                fontWeight: selectedCategory === category ? 600 : 400,
                letterSpacing: "-0.02em",
                background: "transparent",
                color: selectedCategory === category ? "#008FED" : "rgba(12, 12, 12, 0.5)",
                border: "none",
              }}
              data-testid={`tab-${category}`}
            >
              {category}
              {selectedCategory === category && (
                <div
                  style={{
                    position: "absolute",
                    bottom: "-2px",
                    left: 0,
                    right: 0,
                    height: "2px",
                    background: "#008FED",
                  }}
                />
              )}
            </button>
          ))}
        </div>

        {/* 복구면적 산출표 컨텐츠 */}
        {selectedCategory === "복구면적 산출표" && (
          <div>
            {/* 복구면적 산출표 헤더 */}
            <div className="flex items-center justify-between mb-4">
              <h2
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "18px",
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                  color: "#0C0C0C",
                }}
              >
                복구면적 산출표
              </h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={addRow}
                  disabled={masterDataList.length === 0}
                  className="px-4 py-2 rounded-md flex items-center gap-2 hover-elevate active-elevate-2"
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 500,
                    background: masterDataList.length === 0 ? "#f5f5f5" : "white",
                    color: masterDataList.length === 0 ? "rgba(12, 12, 12, 0.3)" : "#008FED",
                    border: masterDataList.length === 0 ? "1px solid rgba(12, 12, 12, 0.1)" : "1px solid #008FED",
                    cursor: masterDataList.length === 0 ? "not-allowed" : "pointer",
                    opacity: masterDataList.length === 0 ? 0.6 : 1,
                  }}
                  data-testid="button-add-row"
                >
                  항목 추가
                </button>
                <button
                  type="button"
                  onClick={deleteSelectedRows}
                  disabled={selectedRows.size === 0}
                  className="px-4 py-2 rounded-md flex items-center gap-2 hover-elevate active-elevate-2"
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 500,
                    background: selectedRows.size === 0 ? "#f5f5f5" : "#FF4D4F",
                    color: selectedRows.size === 0 ? "rgba(12, 12, 12, 0.3)" : "white",
                    border: "none",
                    cursor: selectedRows.size === 0 ? "not-allowed" : "pointer",
                    opacity: selectedRows.size === 0 ? 0.6 : 1,
                  }}
                  data-testid="button-delete-rows"
                >
                  행 삭제
                </button>
              </div>
            </div>

            {/* 테이블 */}
            <div
              style={{
                background: "white",
                borderRadius: "8px",
                overflow: "auto",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: "1200px",
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: "rgba(12, 12, 12, 0.03)",
                      borderBottom: "2px solid rgba(12, 12, 12, 0.08)",
                    }}
                  >
                    <th style={{ width: "40px", padding: "12px 8px" }}></th>
                    <th style={{ width: "120px", padding: "12px 8px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600, color: "#0C0C0C", textAlign: "center" }}>장소</th>
                    <th style={{ width: "120px", padding: "12px 8px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600, color: "#0C0C0C", textAlign: "center" }}>위치</th>
                    <th style={{ width: "120px", padding: "12px 8px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600, color: "#0C0C0C", textAlign: "center" }}>공사명</th>
                    <th style={{ padding: "12px 8px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600, color: "#0C0C0C", textAlign: "center" }} colSpan={3}>
                      피해면적
                    </th>
                    <th style={{ padding: "12px 8px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600, color: "#0C0C0C", textAlign: "center" }} colSpan={3}>
                      복구면적
                    </th>
                    <th style={{ width: "100px", padding: "12px 8px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600, color: "#0C0C0C", textAlign: "center" }}>비고</th>
                  </tr>
                  <tr
                    style={{
                      background: "rgba(12, 12, 12, 0.02)",
                      borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                    }}
                  >
                    <th></th>
                    <th></th>
                    <th></th>
                    <th></th>
                    <th style={{ padding: "8px", fontFamily: "Pretendard", fontSize: "12px", fontWeight: 500, color: "rgba(12, 12, 12, 0.6)", textAlign: "center" }}>가로(mm)</th>
                    <th style={{ padding: "8px", fontFamily: "Pretendard", fontSize: "12px", fontWeight: 500, color: "rgba(12, 12, 12, 0.6)", textAlign: "center" }}>세로(mm)</th>
                    <th style={{ padding: "8px", fontFamily: "Pretendard", fontSize: "12px", fontWeight: 500, color: "rgba(12, 12, 12, 0.6)", textAlign: "center" }}>면적(m²)</th>
                    <th style={{ padding: "8px", fontFamily: "Pretendard", fontSize: "12px", fontWeight: 500, color: "rgba(12, 12, 12, 0.6)", textAlign: "center" }}>가로(mm)</th>
                    <th style={{ padding: "8px", fontFamily: "Pretendard", fontSize: "12px", fontWeight: 500, color: "rgba(12, 12, 12, 0.6)", textAlign: "center" }}>세로(mm)</th>
                    <th style={{ padding: "8px", fontFamily: "Pretendard", fontSize: "12px", fontWeight: 500, color: "rgba(12, 12, 12, 0.6)", textAlign: "center" }}>면적(m²)</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr
                      key={row.id}
                      style={{
                        borderBottom: "1px solid rgba(12, 12, 12, 0.06)",
                      }}
                    >
                      <td style={{ padding: "8px", textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={selectedRows.has(row.id)}
                          onChange={() => toggleRowSelection(row.id)}
                          style={{ width: "16px", height: "16px", cursor: "pointer" }}
                          data-testid={`checkbox-row-${index}`}
                        />
                      </td>
                      <td style={{ padding: "8px" }}>
                        <Select
                          value={row.category}
                          onValueChange={(value) => updateRow(row.id, 'category', value)}
                        >
                          <SelectTrigger 
                            className="border focus:ring-0"
                            style={{
                              width: "100%",
                              height: "40px",
                              fontFamily: "Pretendard",
                              fontSize: "14px",
                              borderColor: "rgba(12, 12, 12, 0.2)",
                              borderRadius: "6px",
                            }}
                            data-testid={`select-category-${index}`}
                          >
                            <SelectValue>
                              {row.category}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {roomCategories.map(cat => (
                              <SelectItem key={cat} value={cat}>
                                <div className="flex items-center justify-between w-full">
                                  <span>{cat}</span>
                                  {row.category === cat && (
                                    <Check className="w-4 h-4 ml-2" style={{ color: "#008FED" }} />
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td style={{ padding: "8px" }}>
                        <Select
                          value={row.location}
                          onValueChange={(value) => updateRow(row.id, 'location', value)}
                        >
                          <SelectTrigger 
                            className="border focus:ring-0"
                            style={{
                              width: "100%",
                              height: "40px",
                              fontFamily: "Pretendard",
                              fontSize: "14px",
                              borderColor: "rgba(12, 12, 12, 0.2)",
                              borderRadius: "6px",
                            }}
                            data-testid={`select-location-${index}`}
                          >
                            <SelectValue>
                              {row.location}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {locations.map(loc => (
                              <SelectItem key={loc} value={loc}>
                                <div className="flex items-center justify-between w-full">
                                  <span>{loc}</span>
                                  {row.location === loc && (
                                    <Check className="w-4 h-4 ml-2" style={{ color: "#008FED" }} />
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td style={{ padding: "8px" }}>
                        <Select
                          value={row.workName}
                          onValueChange={(value) => updateRow(row.id, 'workName', value)}
                        >
                          <SelectTrigger 
                            className="border focus:ring-0"
                            style={{
                              width: "100%",
                              height: "40px",
                              fontFamily: "Pretendard",
                              fontSize: "14px",
                              borderColor: "rgba(12, 12, 12, 0.2)",
                              borderRadius: "6px",
                            }}
                            data-testid={`select-workname-${index}`}
                          >
                            <SelectValue>
                              {row.workName}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {workNames.map(work => (
                              <SelectItem key={work} value={work}>
                                <div className="flex items-center justify-between w-full">
                                  <span>{work}</span>
                                  {row.workName === work && (
                                    <Check className="w-4 h-4 ml-2" style={{ color: "#008FED" }} />
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td style={{ padding: "8px" }}>
                        <input
                          type="text"
                          value={row.damageWidth}
                          onChange={(e) => updateRow(row.id, 'damageWidth', e.target.value)}
                          className="focus:outline-none focus:border-2 focus:border-[#008FED]"
                          style={{
                            width: "100%",
                            padding: "8px",
                            fontFamily: "Pretendard",
                            fontSize: "14px",
                            border: "1px solid rgba(12, 12, 12, 0.1)",
                            borderRadius: "8px",
                            textAlign: "center",
                          }}
                          data-testid={`input-damage-width-${index}`}
                        />
                      </td>
                      <td style={{ padding: "8px" }}>
                        <input
                          type="text"
                          value={row.damageHeight}
                          onChange={(e) => updateRow(row.id, 'damageHeight', e.target.value)}
                          className="focus:outline-none focus:border-2 focus:border-[#008FED]"
                          style={{
                            width: "100%",
                            padding: "8px",
                            fontFamily: "Pretendard",
                            fontSize: "14px",
                            border: "1px solid rgba(12, 12, 12, 0.1)",
                            borderRadius: "8px",
                            textAlign: "center",
                          }}
                          data-testid={`input-damage-height-${index}`}
                        />
                      </td>
                      <td style={{ padding: "8px" }}>
                        <input
                          type="text"
                          value={row.damageArea}
                          readOnly
                          style={{
                            width: "100%",
                            padding: "8px",
                            fontFamily: "Pretendard",
                            fontSize: "14px",
                            border: "1px solid rgba(12, 12, 12, 0.1)",
                            borderRadius: "4px",
                            textAlign: "center",
                            background: "rgba(12, 12, 12, 0.02)",
                          }}
                          data-testid={`input-damage-area-${index}`}
                        />
                      </td>
                      <td style={{ padding: "8px" }}>
                        <input
                          type="text"
                          value={row.repairWidth}
                          onChange={(e) => updateRow(row.id, 'repairWidth', e.target.value)}
                          className="focus:outline-none focus:border-2 focus:border-[#008FED]"
                          style={{
                            width: "100%",
                            padding: "8px",
                            fontFamily: "Pretendard",
                            fontSize: "14px",
                            border: "1px solid rgba(12, 12, 12, 0.1)",
                            borderRadius: "8px",
                            textAlign: "center",
                          }}
                          data-testid={`input-repair-width-${index}`}
                        />
                      </td>
                      <td style={{ padding: "8px" }}>
                        <input
                          type="text"
                          value={row.repairHeight}
                          onChange={(e) => updateRow(row.id, 'repairHeight', e.target.value)}
                          className="focus:outline-none focus:border-2 focus:border-[#008FED]"
                          style={{
                            width: "100%",
                            padding: "8px",
                            fontFamily: "Pretendard",
                            fontSize: "14px",
                            border: "1px solid rgba(12, 12, 12, 0.1)",
                            borderRadius: "8px",
                            textAlign: "center",
                          }}
                          data-testid={`input-repair-height-${index}`}
                        />
                      </td>
                      <td style={{ padding: "8px" }}>
                        <input
                          type="text"
                          value={row.repairArea}
                          readOnly
                          style={{
                            width: "100%",
                            padding: "8px",
                            fontFamily: "Pretendard",
                            fontSize: "14px",
                            border: "1px solid rgba(12, 12, 12, 0.1)",
                            borderRadius: "4px",
                            textAlign: "center",
                            background: "rgba(12, 12, 12, 0.02)",
                          }}
                          data-testid={`input-repair-area-${index}`}
                        />
                      </td>
                      <td style={{ padding: "8px" }}>
                        <input
                          type="text"
                          value={row.note}
                          onChange={(e) => updateRow(row.id, 'note', e.target.value)}
                          className="focus:outline-none focus:border-2 focus:border-[#008FED]"
                          style={{
                            width: "100%",
                            padding: "8px",
                            fontFamily: "Pretendard",
                            fontSize: "14px",
                            border: "1px solid rgba(12, 12, 12, 0.1)",
                            borderRadius: "8px",
                          }}
                          data-testid={`input-note-${index}`}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 다른 카테고리는 준비중 표시 */}
        {selectedCategory !== "복구면적 산출표" && (
          <div
            className="flex items-center justify-center"
            style={{
              minHeight: "400px",
              background: "rgba(12, 12, 12, 0.02)",
              borderRadius: "8px",
            }}
          >
            <p
              style={{
                fontFamily: "Pretendard",
                fontSize: "16px",
                color: "rgba(12, 12, 12, 0.4)",
              }}
            >
              {selectedCategory} - 준비 중입니다
            </p>
          </div>
        )}

        {/* 하단 버튼 */}
        {selectedCategory === "복구면적 산출표" && (
          <div
            className="flex justify-between items-center mt-8"
            style={{
              padding: "20px 0",
            }}
          >
            <button
              type="button"
              onClick={handleReset}
              style={{
                fontFamily: "Pretendard",
                fontSize: "16px",
                fontWeight: 600,
                color: "#FF4D4F",
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
              data-testid="button-reset"
            >
              초기화
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="hover-elevate active-elevate-2"
              style={{
                fontFamily: "Pretendard",
                fontSize: "16px",
                fontWeight: 600,
                height: "52px",
                padding: "12px 48px",
                background: "#008FED",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "8px",
              }}
              data-testid="button-save"
            >
              저장
            </button>
          </div>
        )}
      </div>
    </FieldSurveyLayout>
  );
}
