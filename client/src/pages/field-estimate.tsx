import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Case, MasterData, LaborCost } from "@shared/schema";
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

interface LaborCostRow {
  id: string;
  laborItemId?: string; // DB 노무비 항목 ID (선택용)
  category: string; // 공종
  workName: string; // 공사명
  detailWork: string; // 세부공사
  detailItem: string | null; // 세부항목
  priceStandard: string; // 단가 기준
  unit: string; // 단위
  standardPrice: string; // 기준가(원/단위)
  quantity: string; // 수량 (editable)
  applicationRate: string; // 적용면
  pricePerSqm: string; // 기준가(㎡)
  damageArea: string; // 피해면적
  deduction: string; // 공제(원)
  expenseStatus: string; // 경비여부
  request: string; // 요청
}

interface Material {
  id: string; // 고유 ID (materialName-spec-unit)
  materialName: string; // 자재명
  specification: string; // 규격
  unit: string; // 단위
  standardPrice: number; // 단가 (숫자)
}

interface MaterialRow {
  id: string;
  materialName: string; // 공종 (자재명)
  specification: string; // 규격
  unit: string; // 단위
  standardPrice: number; // 기준가
  quantity: number; // 수량 (editable)
  amount: number; // 금액 (계산값)
  deduction: number; // 공제(원) (editable)
  expenseStatus: boolean; // 경비여부 (editable)
  request: string; // 요청 (editable)
}

const CATEGORIES = ["복구면적 산출표", "노무비", "자재비", "견적서"];

export default function FieldEstimate() {
  const [selectedCategory, setSelectedCategory] = useState("복구면적 산출표");
  const [rows, setRows] = useState<AreaCalculationRow[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [laborCostRows, setLaborCostRows] = useState<LaborCostRow[]>([]);
  const [selectedLaborRows, setSelectedLaborRows] = useState<Set<string>>(new Set());
  const [materialRows, setMaterialRows] = useState<MaterialRow[]>([]);
  const [selectedMaterialRows, setSelectedMaterialRows] = useState<Set<string>>(new Set());

  // 현장입력에서 선택한 케이스 ID 가져오기
  const selectedCaseId = localStorage.getItem('selectedFieldSurveyCaseId') || '';

  const { toast } = useToast();

  // 마스터 데이터 조회
  const { data: masterDataList = [] } = useQuery<MasterData[]>({
    queryKey: ['/api/master-data'],
  });

  // 노무비 데이터 조회
  const { data: laborCostData = [], isLoading: isLoadingLaborCosts } = useQuery<LaborCost[]>({
    queryKey: ['/api/labor-costs'],
  });

  // 노무비 캐스케이딩 선택기 옵션 조회
  const { data: laborOptions } = useQuery<{
    categories: string[];
    workNamesByCategory: Record<string, string[]>;
    detailWorksByWork: Record<string, string[]>;
  }>({
    queryKey: ['/api/labor-costs/options'],
  });

  // 자재비 데이터 조회
  const { data: materialsData = [], isLoading: isLoadingMaterials } = useQuery<Material[]>({
    queryKey: ['/api/materials'],
  });

  // 노무비 캐스케이딩 선택기 state
  const [selectedCostCategory, setSelectedCostCategory] = useState("");
  const [selectedCostWorkName, setSelectedCostWorkName] = useState("");
  const [selectedCostDetailWork, setSelectedCostDetailWork] = useState(""); // 세부공사 (노무비 or 일위대가)

  // 자재비 선택기 state
  const [selectedMaterialName, setSelectedMaterialName] = useState("");
  const [selectedMaterialSpec, setSelectedMaterialSpec] = useState("");

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

  // ===== 노무비 관련 함수 =====
  
  // 캐스케이딩 필터링 옵션 (useMemo로 성능 최적화)
  const availableCostCategories = useMemo(() => {
    if (!laborOptions) return [];
    return laborOptions.categories || [];
  }, [laborOptions]);

  const availableCostWorkNames = useMemo(() => {
    if (!laborOptions || !selectedCostCategory) return [];
    return laborOptions.workNamesByCategory[selectedCostCategory] || [];
  }, [laborOptions, selectedCostCategory]);

  const availableCostDetailWorks = useMemo(() => {
    if (!laborOptions || !selectedCostCategory || !selectedCostWorkName) return [];
    const workKey = `${selectedCostCategory}|${selectedCostWorkName}`;
    return laborOptions.detailWorksByWork[workKey] || [];
  }, [laborOptions, selectedCostCategory, selectedCostWorkName]);

  // 캐스케이딩 선택: 상위 선택 변경 시 하위 선택 초기화
  useEffect(() => {
    setSelectedCostWorkName("");
    setSelectedCostDetailWork("");
  }, [selectedCostCategory]);

  useEffect(() => {
    setSelectedCostDetailWork("");
  }, [selectedCostWorkName]);
  
  // 노무비 항목 추가 (선택한 조합의 모든 DB 항목을 테이블에 추가)
  const handleAddLaborItems = () => {
    if (!selectedCostCategory || !selectedCostWorkName || !selectedCostDetailWork) {
      toast({
        title: "선택을 완료해주세요",
        description: "공종, 공사명, 세부공사를 모두 선택해주세요.",
        variant: "destructive",
      });
      return;
    }
    
    // 선택한 조합에 맞는 노무비 DB 항목 필터링
    const filtered = laborCostData.filter(item =>
      item.category === selectedCostCategory &&
      item.workName === selectedCostWorkName &&
      item.detailWork === selectedCostDetailWork
    );
    
    if (filtered.length === 0) {
      toast({
        title: "항목이 없습니다",
        description: "선택한 조합에 해당하는 항목이 없습니다.",
        variant: "destructive",
      });
      return;
    }
    
    // 필터링된 항목들을 테이블 행으로 변환
    const newRows: LaborCostRow[] = filtered.map(item => ({
      id: `labor-${Date.now()}-${Math.random()}`,
      laborItemId: item.id.toString(),
      category: item.category,
      workName: item.workName,
      detailWork: item.detailWork,
      detailItem: item.detailItem || "",
      priceStandard: item.priceStandard,
      unit: item.unit,
      standardPrice: item.standardPrice.toString(),
      quantity: "1",
      applicationRate: "",
      pricePerSqm: "",
      damageArea: "",
      deduction: "",
      expenseStatus: "",
      request: "",
    }));
    
    setLaborCostRows(prev => [...prev, ...newRows]);
    
    toast({
      title: "항목이 추가되었습니다",
      description: `${filtered.length}개의 항목이 테이블에 추가되었습니다.`,
    });
  };
  
  // 선택된 노무비 행 삭제
  const deleteLaborRows = () => {
    if (selectedLaborRows.size === 0) {
      toast({
        title: "삭제할 항목을 선택하세요",
        description: "삭제할 노무비 항목을 먼저 선택해주세요.",
        variant: "destructive",
      });
      return;
    }
    
    if (confirm(`선택한 ${selectedLaborRows.size}개의 항목을 삭제하시겠습니까?`)) {
      setLaborCostRows(prev => prev.filter(row => !selectedLaborRows.has(row.id)));
      setSelectedLaborRows(new Set());
    }
  };
  
  // 자재비 관련 computed values
  const materialNames = useMemo(() => {
    const names = new Set<string>();
    materialsData.forEach(m => names.add(m.materialName));
    return Array.from(names).sort();
  }, [materialsData]);

  const materialSpecifications = useMemo(() => {
    if (!selectedMaterialName) return [];
    return materialsData
      .filter(m => m.materialName === selectedMaterialName)
      .map(m => ({ 
        id: m.id,
        label: `${m.specification} (${m.unit})` 
      }));
  }, [materialsData, selectedMaterialName]);

  // 자재 추가 함수
  const handleAddMaterial = () => {
    if (!selectedMaterialName || !selectedMaterialSpec) {
      toast({
        title: "자재를 선택하세요",
        description: "공종과 자재를 모두 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    const selectedMaterial = materialsData.find(m => m.id === selectedMaterialSpec);

    if (!selectedMaterial) {
      toast({
        title: "자재를 찾을 수 없습니다",
        description: "선택한 자재 정보를 찾을 수 없습니다.",
        variant: "destructive",
      });
      return;
    }

    const newRow: MaterialRow = {
      id: `material-${Date.now()}-${Math.random()}`,
      materialName: selectedMaterial.materialName,
      specification: selectedMaterial.specification,
      unit: selectedMaterial.unit,
      standardPrice: selectedMaterial.standardPrice,
      quantity: 1,
      amount: selectedMaterial.standardPrice,
      deduction: 0,
      expenseStatus: false,
      request: "",
    };

    setMaterialRows(prev => [...prev, newRow]);
    
    // 선택 초기화 (연속 추가 가능하도록)
    setSelectedMaterialSpec("");
    
    toast({
      title: "자재가 추가되었습니다",
      description: `${selectedMaterial.materialName} - ${selectedMaterial.specification}`,
    });
  };

  // 자재비 행 삭제
  const deleteMaterialRows = () => {
    if (selectedMaterialRows.size === 0) {
      toast({
        title: "삭제할 항목을 선택하세요",
        description: "삭제할 자재 항목을 먼저 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (confirm(`선택한 ${selectedMaterialRows.size}개의 항목을 삭제하시겠습니까?`)) {
      setMaterialRows(prev => prev.filter(row => !selectedMaterialRows.has(row.id)));
      setSelectedMaterialRows(new Set());
    }
  };

  // 자재비 행 체크박스 토글
  const toggleMaterialRow = (rowId: string) => {
    setSelectedMaterialRows(prev => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
  };

  // 자재비 전체 선택/해제
  const toggleAllMaterialRows = () => {
    if (selectedMaterialRows.size === materialRows.length) {
      setSelectedMaterialRows(new Set());
    } else {
      setSelectedMaterialRows(new Set(materialRows.map(row => row.id)));
    }
  };

  // 노무비 행 체크박스 토글
  const toggleLaborRow = (rowId: string) => {
    setSelectedLaborRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rowId)) {
        newSet.delete(rowId);
      } else {
        newSet.add(rowId);
      }
      return newSet;
    });
  };
  
  // 노무비 행 업데이트
  const updateLaborRow = (rowId: string, field: keyof LaborCostRow, value: string) => {
    setLaborCostRows(prev => prev.map(row => {
      if (row.id === rowId) {
        // 공종 선택 시: 모든 필드 초기화
        if (field === 'category') {
          return {
            ...row,
            category: value,
            laborItemId: "", // laborItemId도 초기화
            workName: "",
            detailWork: "",
            detailItem: "",
            priceStandard: "",
            unit: "",
            standardPrice: "0",
            quantity: "1",
            applicationRate: "",
            pricePerSqm: "",
            damageArea: "",
            deduction: "",
            expenseStatus: "",
            request: "",
          };
        }
        
        // 노무비 항목 ID 선택 시: DB에서 해당 항목 찾아서 모든 필드 자동 채움
        if (field === 'laborItemId') {
          const selectedItem = laborCostData.find(item => item.id === parseInt(value));
          if (selectedItem) {
            return {
              ...row,
              laborItemId: value,
              workName: selectedItem.workName,
              detailWork: selectedItem.detailWork,
              detailItem: selectedItem.detailItem || "",
              priceStandard: selectedItem.priceStandard,
              unit: selectedItem.unit,
              standardPrice: selectedItem.standardPrice.toString(),
            };
          }
        }
        
        // 그 외 필드 변경 (quantity 등)
        return { ...row, [field]: value };
      }
      return row;
    }));
  };
  
  // 노무비 테이블 리셋
  const resetLaborTable = () => {
    if (laborCostData.length === 0) {
      toast({
        title: "잠시만 기다려주세요",
        description: "노무비 데이터를 로딩 중입니다.",
        variant: "destructive",
      });
      return;
    }
    if (confirm("노무비 입력 내용을 모두 초기화하시겠습니까?")) {
      setLaborCostRows([]);
      setSelectedLaborRows(new Set());
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
        className="relative p-8"
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
                  borderRadius: "8px 8px 0px 0px",
                  overflow: "hidden",
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: "rgba(12, 12, 12, 0.04)",
                      borderBottom: "1px solid rgba(12, 12, 12, 0.06)",
                    }}
                  >
                    <th 
                      style={{ 
                        width: "54px", 
                        padding: "17.5px 8px",
                        borderRight: "1px solid rgba(12, 12, 12, 0.06)",
                      }}
                    ></th>
                    <th 
                      style={{ 
                        width: "183px", 
                        padding: "17.5px 8px", 
                        fontFamily: "Pretendard", 
                        fontSize: "15px", 
                        fontWeight: 600, 
                        color: "rgba(12, 12, 12, 0.6)", 
                        textAlign: "center",
                        borderRight: "1px solid rgba(12, 12, 12, 0.06)",
                      }}
                    >
                      장소
                    </th>
                    <th 
                      style={{ 
                        width: "185px", 
                        padding: "17.5px 8px", 
                        fontFamily: "Pretendard", 
                        fontSize: "15px", 
                        fontWeight: 600, 
                        color: "rgba(12, 12, 12, 0.6)", 
                        textAlign: "center",
                        borderRight: "1px solid rgba(12, 12, 12, 0.06)",
                      }}
                    >
                      위치
                    </th>
                    <th 
                      style={{ 
                        width: "183px", 
                        padding: "17.5px 8px", 
                        fontFamily: "Pretendard", 
                        fontSize: "15px", 
                        fontWeight: 600, 
                        color: "rgba(12, 12, 12, 0.6)", 
                        textAlign: "center",
                        borderRight: "1px solid rgba(12, 12, 12, 0.06)",
                      }}
                    >
                      공사내용
                    </th>
                    <th 
                      style={{ 
                        width: "393px",
                        padding: "0",
                        borderRight: "1px solid rgba(12, 12, 12, 0.06)",
                      }} 
                      colSpan={3}
                    >
                      <div style={{ width: "100%", display: "flex", flexDirection: "column" }}>
                        <div 
                          style={{ 
                            padding: "17.5px 8px", 
                            fontFamily: "Pretendard", 
                            fontSize: "15px", 
                            fontWeight: 600, 
                            color: "rgba(12, 12, 12, 0.6)", 
                            textAlign: "center",
                            background: "rgba(12, 12, 12, 0.04)",
                            height: "43px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          피해면적
                        </div>
                        <div style={{ display: "flex", width: "100%" }}>
                          <div 
                            style={{ 
                              flex: 1,
                              padding: "17.5px 8px", 
                              fontFamily: "Pretendard", 
                              fontSize: "15px", 
                              fontWeight: 600, 
                              color: "rgba(12, 12, 12, 0.6)", 
                              textAlign: "center",
                              height: "43px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            가로(mm)
                          </div>
                          <div 
                            style={{ 
                              flex: 1,
                              padding: "17.5px 8px", 
                              fontFamily: "Pretendard", 
                              fontSize: "15px", 
                              fontWeight: 600, 
                              color: "rgba(12, 12, 12, 0.6)", 
                              textAlign: "center",
                              height: "43px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            세로(mm)
                          </div>
                          <div 
                            style={{ 
                              flex: 1,
                              padding: "17.5px 8px", 
                              fontFamily: "Pretendard", 
                              fontSize: "15px", 
                              fontWeight: 600, 
                              color: "rgba(12, 12, 12, 0.6)", 
                              textAlign: "center",
                              height: "43px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            면적(㎡)
                          </div>
                        </div>
                      </div>
                    </th>
                    <th 
                      style={{ 
                        width: "393px",
                        padding: "0",
                        borderRight: "1px solid rgba(12, 12, 12, 0.06)",
                      }} 
                      colSpan={3}
                    >
                      <div style={{ width: "100%", display: "flex", flexDirection: "column" }}>
                        <div 
                          style={{ 
                            padding: "17.5px 8px", 
                            fontFamily: "Pretendard", 
                            fontSize: "15px", 
                            fontWeight: 600, 
                            color: "rgba(12, 12, 12, 0.6)", 
                            textAlign: "center",
                            background: "rgba(12, 12, 12, 0.04)",
                            height: "43px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          복구면적
                        </div>
                        <div style={{ display: "flex", width: "100%" }}>
                          <div 
                            style={{ 
                              flex: 1,
                              padding: "17.5px 8px", 
                              fontFamily: "Pretendard", 
                              fontSize: "15px", 
                              fontWeight: 600, 
                              color: "rgba(12, 12, 12, 0.6)", 
                              textAlign: "center",
                              height: "43px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            가로(mm)
                          </div>
                          <div 
                            style={{ 
                              flex: 1,
                              padding: "17.5px 8px", 
                              fontFamily: "Pretendard", 
                              fontSize: "15px", 
                              fontWeight: 600, 
                              color: "rgba(12, 12, 12, 0.6)", 
                              textAlign: "center",
                              height: "43px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            세로(mm)
                          </div>
                          <div 
                            style={{ 
                              flex: 1,
                              padding: "17.5px 8px", 
                              fontFamily: "Pretendard", 
                              fontSize: "15px", 
                              fontWeight: 600, 
                              color: "rgba(12, 12, 12, 0.6)", 
                              textAlign: "center",
                              height: "43px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            면적(㎡)
                          </div>
                        </div>
                      </div>
                    </th>
                    <th 
                      style={{ 
                        width: "205px", 
                        padding: "17.5px 8px", 
                        fontFamily: "Pretendard", 
                        fontSize: "15px", 
                        fontWeight: 600, 
                        color: "rgba(12, 12, 12, 0.6)", 
                        textAlign: "center",
                      }}
                    >
                      비고
                    </th>
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
                          className="input-focus-blue"
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
                          className="input-focus-blue"
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
                          className="input-focus-blue"
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
                          className="input-focus-blue"
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
                          className="input-focus-blue"
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

        {/* 노무비 컨텐츠 */}
        {selectedCategory === "노무비" && (
          <div>
            {/* 노무비 헤더 */}
            <h2
              style={{
                fontFamily: "Pretendard",
                fontSize: "18px",
                fontWeight: 600,
                letterSpacing: "-0.02em",
                color: "#0C0C0C",
                marginBottom: "16px",
              }}
            >
              노무비
            </h2>

            {/* 캐스케이딩 선택기 패널 */}
            <div
              style={{
                background: "rgba(12, 12, 12, 0.02)",
                borderRadius: "8px",
                padding: "16px",
                marginBottom: "16px",
                border: "1px solid rgba(12, 12, 12, 0.06)",
              }}
            >
              <div className="flex items-end gap-3">
                {/* 공종 선택 */}
                <div style={{ flex: 1 }}>
                  <label
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "13px",
                      fontWeight: 500,
                      color: "rgba(12, 12, 12, 0.7)",
                      display: "block",
                      marginBottom: "6px",
                    }}
                  >
                    공종
                  </label>
                  <Select
                    value={selectedCostCategory}
                    onValueChange={setSelectedCostCategory}
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
                        background: "white",
                      }}
                      data-testid="select-cost-category"
                    >
                      <SelectValue placeholder="공종 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCostCategories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 공사명 선택 */}
                <div style={{ flex: 1 }}>
                  <label
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "13px",
                      fontWeight: 500,
                      color: "rgba(12, 12, 12, 0.7)",
                      display: "block",
                      marginBottom: "6px",
                    }}
                  >
                    공사명
                  </label>
                  <Select
                    value={selectedCostWorkName}
                    onValueChange={setSelectedCostWorkName}
                    disabled={!selectedCostCategory}
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
                        background: selectedCostCategory ? "white" : "rgba(12, 12, 12, 0.02)",
                      }}
                      data-testid="select-cost-workname"
                    >
                      <SelectValue placeholder="공사명 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCostWorkNames.map(name => (
                        <SelectItem key={name} value={name}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 세부공사 선택 (노무비/일위대가) */}
                <div style={{ flex: 1 }}>
                  <label
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "13px",
                      fontWeight: 500,
                      color: "rgba(12, 12, 12, 0.7)",
                      display: "block",
                      marginBottom: "6px",
                    }}
                  >
                    세부공사
                  </label>
                  <Select
                    value={selectedCostDetailWork}
                    onValueChange={setSelectedCostDetailWork}
                    disabled={!selectedCostWorkName}
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
                        background: selectedCostWorkName ? "white" : "rgba(12, 12, 12, 0.02)",
                      }}
                      data-testid="select-cost-detailwork"
                    >
                      <SelectValue placeholder="세부공사 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCostDetailWorks.map(detail => (
                        <SelectItem key={detail} value={detail}>{detail}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 항목 추가 버튼 */}
                <Button
                  onClick={handleAddLaborItems}
                  disabled={!selectedCostDetailWork}
                  style={{
                    height: "40px",
                    paddingLeft: "20px",
                    paddingRight: "20px",
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 500,
                  }}
                  data-testid="button-add-labor-items"
                >
                  항목 추가
                </Button>
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
                  minWidth: "1600px",
                  borderRadius: "8px 8px 0px 0px",
                  overflow: "hidden",
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: "rgba(12, 12, 12, 0.04)",
                      borderBottom: "1px solid rgba(12, 12, 12, 0.06)",
                    }}
                  >
                    <th style={{ width: "54px", padding: "17.5px 8px", borderRight: "1px solid rgba(12, 12, 12, 0.06)", fontFamily: "Pretendard", fontSize: "15px", fontWeight: 600, color: "rgba(12, 12, 12, 0.6)", textAlign: "center" }}></th>
                    <th style={{ width: "100px", padding: "17.5px 8px", borderRight: "1px solid rgba(12, 12, 12, 0.06)", fontFamily: "Pretendard", fontSize: "15px", fontWeight: 600, color: "rgba(12, 12, 12, 0.6)", textAlign: "center" }}>공사명</th>
                    <th style={{ width: "100px", padding: "17.5px 8px", borderRight: "1px solid rgba(12, 12, 12, 0.06)", fontFamily: "Pretendard", fontSize: "15px", fontWeight: 600, color: "rgba(12, 12, 12, 0.6)", textAlign: "center" }}>세부공사</th>
                    <th style={{ width: "100px", padding: "17.5px 8px", borderRight: "1px solid rgba(12, 12, 12, 0.06)", fontFamily: "Pretendard", fontSize: "15px", fontWeight: 600, color: "rgba(12, 12, 12, 0.6)", textAlign: "center" }}>세부항목</th>
                    <th style={{ width: "100px", padding: "17.5px 8px", borderRight: "1px solid rgba(12, 12, 12, 0.06)", fontFamily: "Pretendard", fontSize: "15px", fontWeight: 600, color: "rgba(12, 12, 12, 0.6)", textAlign: "center" }}>단가 기준</th>
                    <th style={{ width: "70px", padding: "17.5px 8px", borderRight: "1px solid rgba(12, 12, 12, 0.06)", fontFamily: "Pretendard", fontSize: "15px", fontWeight: 600, color: "rgba(12, 12, 12, 0.6)", textAlign: "center" }}>단위</th>
                    <th style={{ width: "100px", padding: "17.5px 8px", borderRight: "1px solid rgba(12, 12, 12, 0.06)", fontFamily: "Pretendard", fontSize: "15px", fontWeight: 600, color: "rgba(12, 12, 12, 0.6)", textAlign: "center" }}>기준가</th>
                    <th style={{ width: "70px", padding: "17.5px 8px", borderRight: "1px solid rgba(12, 12, 12, 0.06)", fontFamily: "Pretendard", fontSize: "15px", fontWeight: 600, color: "rgba(12, 12, 12, 0.6)", textAlign: "center" }}>수량</th>
                    <th style={{ width: "70px", padding: "17.5px 8px", borderRight: "1px solid rgba(12, 12, 12, 0.06)", fontFamily: "Pretendard", fontSize: "15px", fontWeight: 600, color: "rgba(12, 12, 12, 0.6)", textAlign: "center" }}>적용면</th>
                    <th style={{ width: "90px", padding: "17.5px 8px", borderRight: "1px solid rgba(12, 12, 12, 0.06)", fontFamily: "Pretendard", fontSize: "15px", fontWeight: 600, color: "rgba(12, 12, 12, 0.6)", textAlign: "center" }}>기준가(㎡)</th>
                    <th style={{ width: "90px", padding: "17.5px 8px", borderRight: "1px solid rgba(12, 12, 12, 0.06)", fontFamily: "Pretendard", fontSize: "15px", fontWeight: 600, color: "rgba(12, 12, 12, 0.6)", textAlign: "center" }}>피해면적</th>
                    <th style={{ width: "90px", padding: "17.5px 8px", borderRight: "1px solid rgba(12, 12, 12, 0.06)", fontFamily: "Pretendard", fontSize: "15px", fontWeight: 600, color: "rgba(12, 12, 12, 0.6)", textAlign: "center" }}>공제(원)</th>
                    <th style={{ width: "80px", padding: "17.5px 8px", borderRight: "1px solid rgba(12, 12, 12, 0.06)", fontFamily: "Pretendard", fontSize: "15px", fontWeight: 600, color: "rgba(12, 12, 12, 0.6)", textAlign: "center" }}>경비여부</th>
                    <th style={{ width: "70px", padding: "17.5px 8px", fontFamily: "Pretendard", fontSize: "15px", fontWeight: 600, color: "rgba(12, 12, 12, 0.6)", textAlign: "center" }}>요청</th>
                  </tr>
                </thead>
                <tbody>
                  {laborCostRows.map((row) => (
                    <tr
                      key={row.id}
                      style={{
                        borderBottom: "1px solid rgba(12, 12, 12, 0.06)",
                      }}
                    >
                      <td style={{ padding: "8px", textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={selectedLaborRows.has(row.id)}
                          onChange={() => toggleLaborRow(row.id)}
                          style={{ width: "16px", height: "16px", cursor: "pointer" }}
                          data-testid={`checkbox-labor-${row.id}`}
                        />
                      </td>
                      <td style={{ padding: "8px" }}>
                        <input 
                          type="text" 
                          value={row.workName} 
                          readOnly
                          className="input-focus-blue" 
                          style={{ width: "100%", padding: "8px", fontFamily: "Pretendard", fontSize: "14px", border: "1px solid rgba(12, 12, 12, 0.1)", borderRadius: "8px", textAlign: "center", background: "rgba(12, 12, 12, 0.02)", cursor: "not-allowed" }} 
                          data-testid={`input-workName-${row.id}`}
                        />
                      </td>
                      <td style={{ padding: "8px" }}>
                        <input 
                          type="text" 
                          value={row.detailWork} 
                          readOnly
                          className="input-focus-blue" 
                          style={{ width: "100%", padding: "8px", fontFamily: "Pretendard", fontSize: "14px", border: "1px solid rgba(12, 12, 12, 0.1)", borderRadius: "8px", textAlign: "center", background: "rgba(12, 12, 12, 0.02)", cursor: "not-allowed" }} 
                          data-testid={`input-detailWork-${row.id}`}
                        />
                      </td>
                      <td style={{ padding: "8px" }}>
                        <input 
                          type="text" 
                          value={row.detailItem || ""} 
                          readOnly
                          className="input-focus-blue" 
                          style={{ width: "100%", padding: "8px", fontFamily: "Pretendard", fontSize: "14px", border: "1px solid rgba(12, 12, 12, 0.1)", borderRadius: "8px", textAlign: "center", background: "rgba(12, 12, 12, 0.02)", cursor: "not-allowed" }} 
                          data-testid={`input-detailItem-${row.id}`}
                        />
                      </td>
                      <td style={{ padding: "8px" }}>
                        <input 
                          type="text" 
                          value={row.priceStandard} 
                          readOnly
                          className="input-focus-blue" 
                          style={{ width: "100%", padding: "8px", fontFamily: "Pretendard", fontSize: "14px", border: "1px solid rgba(12, 12, 12, 0.1)", borderRadius: "8px", textAlign: "center", background: "rgba(12, 12, 12, 0.02)", cursor: "not-allowed" }} 
                          data-testid={`input-priceStandard-${row.id}`}
                        />
                      </td>
                      <td style={{ padding: "8px" }}>
                        <input 
                          type="text" 
                          value={row.unit} 
                          readOnly
                          className="input-focus-blue" 
                          style={{ width: "100%", padding: "8px", fontFamily: "Pretendard", fontSize: "14px", border: "1px solid rgba(12, 12, 12, 0.1)", borderRadius: "8px", textAlign: "center", background: "rgba(12, 12, 12, 0.02)", cursor: "not-allowed" }} 
                          data-testid={`input-unit-${row.id}`}
                        />
                      </td>
                      <td style={{ padding: "8px" }}>
                        <input 
                          type="text" 
                          value={row.standardPrice} 
                          readOnly
                          className="input-focus-blue" 
                          style={{ width: "100%", padding: "8px", fontFamily: "Pretendard", fontSize: "14px", border: "1px solid rgba(12, 12, 12, 0.1)", borderRadius: "8px", textAlign: "center", background: "rgba(12, 12, 12, 0.02)", cursor: "not-allowed" }} 
                          data-testid={`input-standardPrice-${row.id}`}
                        />
                      </td>
                      <td style={{ padding: "8px" }}>
                        <input 
                          type="text" 
                          value={row.quantity} 
                          onChange={(e) => updateLaborRow(row.id, 'quantity', e.target.value)}
                          className="input-focus-blue" 
                          style={{ width: "100%", padding: "8px", fontFamily: "Pretendard", fontSize: "14px", border: "1px solid rgba(12, 12, 12, 0.1)", borderRadius: "8px", textAlign: "center" }} 
                          data-testid={`input-quantity-${row.id}`}
                        />
                      </td>
                      <td style={{ padding: "8px" }}>
                        <input 
                          type="text" 
                          value={row.applicationRate} 
                          onChange={(e) => updateLaborRow(row.id, 'applicationRate', e.target.value)}
                          className="input-focus-blue" 
                          style={{ width: "100%", padding: "8px", fontFamily: "Pretendard", fontSize: "14px", border: "1px solid rgba(12, 12, 12, 0.1)", borderRadius: "8px", textAlign: "center" }} 
                          data-testid={`input-applicationRate-${row.id}`}
                        />
                      </td>
                      <td style={{ padding: "8px" }}>
                        <input 
                          type="text" 
                          value={row.pricePerSqm} 
                          onChange={(e) => updateLaborRow(row.id, 'pricePerSqm', e.target.value)}
                          className="input-focus-blue" 
                          style={{ width: "100%", padding: "8px", fontFamily: "Pretendard", fontSize: "14px", border: "1px solid rgba(12, 12, 12, 0.1)", borderRadius: "8px", textAlign: "center" }} 
                          data-testid={`input-pricePerSqm-${row.id}`}
                        />
                      </td>
                      <td style={{ padding: "8px" }}>
                        <input 
                          type="text" 
                          value={row.damageArea} 
                          onChange={(e) => updateLaborRow(row.id, 'damageArea', e.target.value)}
                          className="input-focus-blue" 
                          style={{ width: "100%", padding: "8px", fontFamily: "Pretendard", fontSize: "14px", border: "1px solid rgba(12, 12, 12, 0.1)", borderRadius: "8px", textAlign: "center" }} 
                          data-testid={`input-damageArea-${row.id}`}
                        />
                      </td>
                      <td style={{ padding: "8px" }}>
                        <input 
                          type="text" 
                          value={row.deduction} 
                          onChange={(e) => updateLaborRow(row.id, 'deduction', e.target.value)}
                          className="input-focus-blue" 
                          style={{ width: "100%", padding: "8px", fontFamily: "Pretendard", fontSize: "14px", border: "1px solid rgba(12, 12, 12, 0.1)", borderRadius: "8px", textAlign: "center" }} 
                          data-testid={`input-deduction-${row.id}`}
                        />
                      </td>
                      <td style={{ padding: "8px", textAlign: "center" }}>
                        <input 
                          type="checkbox" 
                          checked={row.expenseStatus === "true"} 
                          onChange={(e) => updateLaborRow(row.id, 'expenseStatus', e.target.checked ? "true" : "false")}
                          style={{ width: "16px", height: "16px", cursor: "pointer" }} 
                          data-testid={`checkbox-expenseStatus-${row.id}`}
                        />
                      </td>
                      <td style={{ padding: "8px", textAlign: "center" }}>
                        <input 
                          type="checkbox" 
                          checked={row.request === "true"} 
                          onChange={(e) => updateLaborRow(row.id, 'request', e.target.checked ? "true" : "false")}
                          style={{ width: "16px", height: "16px", cursor: "pointer" }} 
                          data-testid={`checkbox-request-${row.id}`}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 노무비 버튼 영역 */}
            <div className="flex gap-3 mt-6">

              <Button
                type="button"
                onClick={deleteLaborRows}
                disabled={selectedLaborRows.size === 0}
                className="hover-elevate active-elevate-2"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontFamily: "Pretendard",
                  fontSize: "15px",
                  fontWeight: 500,
                  padding: "10px 20px",
                  background: "white",
                  color: "#FF4D4F",
                  border: "1px solid #FF4D4F",
                  borderRadius: "6px",
                  cursor: selectedLaborRows.size === 0 ? "not-allowed" : "pointer",
                  opacity: selectedLaborRows.size === 0 ? 0.5 : 1,
                }}
                data-testid="button-delete-labor-rows"
              >
                <Trash2 className="w-4 h-4" />
                삭제
              </Button>
            </div>
          </div>
        )}

        {/* 자재비, 견적서는 준비중 표시 */}
        {(selectedCategory === "자재비" || selectedCategory === "견적서") && (
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

        {/* 하단 버튼 - 복구면적 산출표 */}
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

        {/* 하단 버튼 - 노무비 */}
        {selectedCategory === "노무비" && (
          <div
            className="flex justify-between items-center mt-8"
            style={{
              padding: "20px 0",
            }}
          >
            <button
              type="button"
              onClick={resetLaborTable}
              style={{
                fontFamily: "Pretendard",
                fontSize: "16px",
                fontWeight: 600,
                color: "#FF4D4F",
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
              data-testid="button-reset-labor"
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
              data-testid="button-save-labor"
            >
              저장
            </button>
          </div>
        )}

        {/* 자재비 컨텐츠 */}
        {selectedCategory === "자재비" && (
          <div>
            {/* 자재비 헤더 */}
            <h2
              style={{
                fontFamily: "Pretendard",
                fontSize: "18px",
                fontWeight: 600,
                letterSpacing: "-0.02em",
                color: "#0C0C0C",
                marginBottom: "16px",
              }}
            >
              자재비
            </h2>

            {/* 자재 선택기 패널 */}
            <div
              style={{
                background: "rgba(12, 12, 12, 0.02)",
                borderRadius: "8px",
                padding: "16px",
                marginBottom: "16px",
                border: "1px solid rgba(12, 12, 12, 0.06)",
              }}
            >
              <div className="flex items-end gap-3">
                {/* 공종 선택 */}
                <div style={{ flex: 1 }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "#0C0C0C",
                    }}
                  >
                    공종
                  </label>
                  <Select
                    value={selectedMaterialName}
                    onValueChange={(value) => {
                      setSelectedMaterialName(value);
                      setSelectedMaterialSpec("");
                    }}
                    data-testid="select-material-name"
                  >
                    <SelectTrigger
                      className="w-full"
                      style={{
                        height: "42px",
                        fontFamily: "Pretendard",
                        fontSize: "15px",
                        borderRadius: "6px",
                        border: "1px solid rgba(12, 12, 12, 0.12)",
                      }}
                    >
                      <SelectValue placeholder="공종 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {materialNames.map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 자재 선택 */}
                <div style={{ flex: 1 }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "#0C0C0C",
                    }}
                  >
                    자재
                  </label>
                  <Select
                    value={selectedMaterialSpec}
                    onValueChange={setSelectedMaterialSpec}
                    disabled={!selectedMaterialName}
                    data-testid="select-material-spec"
                  >
                    <SelectTrigger
                      className="w-full"
                      style={{
                        height: "42px",
                        fontFamily: "Pretendard",
                        fontSize: "15px",
                        borderRadius: "6px",
                        border: "1px solid rgba(12, 12, 12, 0.12)",
                      }}
                    >
                      <SelectValue placeholder="자재 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {materialSpecifications.map((spec) => (
                        <SelectItem key={spec.id} value={spec.id}>
                          {spec.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 항목 추가 버튼 */}
                <Button
                  type="button"
                  onClick={handleAddMaterial}
                  disabled={!selectedMaterialName || !selectedMaterialSpec}
                  className="hover-elevate active-elevate-2"
                  style={{
                    height: "42px",
                    padding: "0 24px",
                    background: "#008FED",
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: "6px",
                    fontFamily: "Pretendard",
                    fontSize: "15px",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                  data-testid="button-add-material"
                >
                  항목 추가
                </Button>
              </div>
            </div>

            {/* 자재비 테이블 */}
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontFamily: "Pretendard",
                  fontSize: "14px",
                  marginBottom: "16px",
                }}
              >
                <thead>
                  <tr>
                    <th
                      style={{
                        padding: "12px",
                        background: "rgba(12, 12, 12, 0.02)",
                        border: "1px solid rgba(12, 12, 12, 0.08)",
                        fontWeight: 600,
                        textAlign: "center",
                        width: "40px",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={materialRows.length > 0 && selectedMaterialRows.size === materialRows.length}
                        onChange={toggleAllMaterialRows}
                        style={{ cursor: "pointer" }}
                        data-testid="checkbox-all-materials"
                      />
                    </th>
                    <th
                      style={{
                        padding: "12px",
                        background: "rgba(12, 12, 12, 0.02)",
                        border: "1px solid rgba(12, 12, 12, 0.08)",
                        fontWeight: 600,
                        textAlign: "center",
                        minWidth: "100px",
                      }}
                    >
                      공종
                    </th>
                    <th
                      style={{
                        padding: "12px",
                        background: "rgba(12, 12, 12, 0.02)",
                        border: "1px solid rgba(12, 12, 12, 0.08)",
                        fontWeight: 600,
                        textAlign: "center",
                        minWidth: "100px",
                      }}
                    >
                      자재
                    </th>
                    <th
                      style={{
                        padding: "12px",
                        background: "rgba(12, 12, 12, 0.02)",
                        border: "1px solid rgba(12, 12, 12, 0.08)",
                        fontWeight: 600,
                        textAlign: "center",
                        minWidth: "80px",
                      }}
                    >
                      규격
                    </th>
                    <th
                      style={{
                        padding: "12px",
                        background: "rgba(12, 12, 12, 0.02)",
                        border: "1px solid rgba(12, 12, 12, 0.08)",
                        fontWeight: 600,
                        textAlign: "center",
                        minWidth: "60px",
                      }}
                    >
                      단위
                    </th>
                    <th
                      style={{
                        padding: "12px",
                        background: "rgba(12, 12, 12, 0.02)",
                        border: "1px solid rgba(12, 12, 12, 0.08)",
                        fontWeight: 600,
                        textAlign: "center",
                        minWidth: "100px",
                      }}
                    >
                      기준가
                    </th>
                    <th
                      style={{
                        padding: "12px",
                        background: "rgba(12, 12, 12, 0.02)",
                        border: "1px solid rgba(12, 12, 12, 0.08)",
                        fontWeight: 600,
                        textAlign: "center",
                        minWidth: "80px",
                      }}
                    >
                      수량
                    </th>
                    <th
                      style={{
                        padding: "12px",
                        background: "rgba(12, 12, 12, 0.02)",
                        border: "1px solid rgba(12, 12, 12, 0.08)",
                        fontWeight: 600,
                        textAlign: "center",
                        minWidth: "100px",
                      }}
                    >
                      금액
                    </th>
                    <th
                      style={{
                        padding: "12px",
                        background: "rgba(12, 12, 12, 0.02)",
                        border: "1px solid rgba(12, 12, 12, 0.08)",
                        fontWeight: 600,
                        textAlign: "center",
                        minWidth: "100px",
                      }}
                    >
                      공제(원)
                    </th>
                    <th
                      style={{
                        padding: "12px",
                        background: "rgba(12, 12, 12, 0.02)",
                        border: "1px solid rgba(12, 12, 12, 0.08)",
                        fontWeight: 600,
                        textAlign: "center",
                        minWidth: "80px",
                      }}
                    >
                      경비여부
                    </th>
                    <th
                      style={{
                        padding: "12px",
                        background: "rgba(12, 12, 12, 0.02)",
                        border: "1px solid rgba(12, 12, 12, 0.08)",
                        fontWeight: 600,
                        textAlign: "center",
                        minWidth: "150px",
                      }}
                    >
                      요청
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {materialRows.map((row) => (
                    <tr key={row.id}>
                      <td
                        style={{
                          padding: "8px",
                          border: "1px solid rgba(12, 12, 12, 0.08)",
                          textAlign: "center",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedMaterialRows.has(row.id)}
                          onChange={() => toggleMaterialRow(row.id)}
                          style={{ cursor: "pointer" }}
                          data-testid={`checkbox-material-${row.id}`}
                        />
                      </td>
                      <td
                        style={{
                          padding: "8px",
                          border: "1px solid rgba(12, 12, 12, 0.08)",
                        }}
                      >
                        <input
                          type="text"
                          value={row.materialName}
                          readOnly
                          style={{
                            width: "100%",
                            padding: "8px",
                            border: "1px solid rgba(12, 12, 12, 0.06)",
                            borderRadius: "4px",
                            fontFamily: "Pretendard",
                            fontSize: "14px",
                            background: "rgba(12, 12, 12, 0.02)",
                            cursor: "not-allowed",
                          }}
                          data-testid={`input-materialName-${row.id}`}
                        />
                      </td>
                      <td
                        style={{
                          padding: "8px",
                          border: "1px solid rgba(12, 12, 12, 0.08)",
                        }}
                      >
                        <input
                          type="text"
                          value={row.specification}
                          readOnly
                          style={{
                            width: "100%",
                            padding: "8px",
                            border: "1px solid rgba(12, 12, 12, 0.06)",
                            borderRadius: "4px",
                            fontFamily: "Pretendard",
                            fontSize: "14px",
                            background: "rgba(12, 12, 12, 0.02)",
                            cursor: "not-allowed",
                          }}
                          data-testid={`input-specification-${row.id}`}
                        />
                      </td>
                      <td
                        style={{
                          padding: "8px",
                          border: "1px solid rgba(12, 12, 12, 0.08)",
                        }}
                      >
                        <input
                          type="text"
                          value={row.unit}
                          readOnly
                          style={{
                            width: "100%",
                            padding: "8px",
                            border: "1px solid rgba(12, 12, 12, 0.06)",
                            borderRadius: "4px",
                            fontFamily: "Pretendard",
                            fontSize: "14px",
                            background: "rgba(12, 12, 12, 0.02)",
                            cursor: "not-allowed",
                          }}
                          data-testid={`input-unit-${row.id}`}
                        />
                      </td>
                      <td
                        style={{
                          padding: "8px",
                          border: "1px solid rgba(12, 12, 12, 0.08)",
                        }}
                      >
                        <input
                          type="text"
                          value={row.standardPrice}
                          readOnly
                          style={{
                            width: "100%",
                            padding: "8px",
                            border: "1px solid rgba(12, 12, 12, 0.06)",
                            borderRadius: "4px",
                            fontFamily: "Pretendard",
                            fontSize: "14px",
                            background: "rgba(12, 12, 12, 0.02)",
                            cursor: "not-allowed",
                          }}
                          data-testid={`input-standardPrice-${row.id}`}
                        />
                      </td>
                      <td
                        style={{
                          padding: "8px",
                          border: "1px solid rgba(12, 12, 12, 0.08)",
                        }}
                      >
                        <input
                          type="number"
                          value={row.quantity}
                          onChange={(e) => {
                            const quantity = Number(e.target.value) || 0;
                            const amount = quantity * row.standardPrice;
                            setMaterialRows(prev =>
                              prev.map(r =>
                                r.id === row.id
                                  ? { ...r, quantity, amount }
                                  : r
                              )
                            );
                          }}
                          style={{
                            width: "100%",
                            padding: "8px",
                            border: "1px solid rgba(12, 12, 12, 0.12)",
                            borderRadius: "4px",
                            fontFamily: "Pretendard",
                            fontSize: "14px",
                          }}
                          data-testid={`input-quantity-${row.id}`}
                        />
                      </td>
                      <td
                        style={{
                          padding: "8px",
                          border: "1px solid rgba(12, 12, 12, 0.08)",
                        }}
                      >
                        <input
                          type="text"
                          value={row.amount}
                          readOnly
                          style={{
                            width: "100%",
                            padding: "8px",
                            border: "1px solid rgba(12, 12, 12, 0.06)",
                            borderRadius: "4px",
                            fontFamily: "Pretendard",
                            fontSize: "14px",
                            background: "rgba(12, 12, 12, 0.02)",
                            cursor: "not-allowed",
                          }}
                          data-testid={`input-amount-${row.id}`}
                        />
                      </td>
                      <td
                        style={{
                          padding: "8px",
                          border: "1px solid rgba(12, 12, 12, 0.08)",
                        }}
                      >
                        <input
                          type="number"
                          value={row.deduction}
                          onChange={(e) => {
                            const deduction = Number(e.target.value) || 0;
                            setMaterialRows(prev =>
                              prev.map(r =>
                                r.id === row.id
                                  ? { ...r, deduction }
                                  : r
                              )
                            );
                          }}
                          style={{
                            width: "100%",
                            padding: "8px",
                            border: "1px solid rgba(12, 12, 12, 0.12)",
                            borderRadius: "4px",
                            fontFamily: "Pretendard",
                            fontSize: "14px",
                          }}
                          data-testid={`input-deduction-${row.id}`}
                        />
                      </td>
                      <td
                        style={{
                          padding: "8px",
                          border: "1px solid rgba(12, 12, 12, 0.08)",
                          textAlign: "center",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={row.expenseStatus}
                          onChange={(e) => {
                            setMaterialRows(prev =>
                              prev.map(r =>
                                r.id === row.id
                                  ? { ...r, expenseStatus: e.target.checked }
                                  : r
                              )
                            );
                          }}
                          style={{ cursor: "pointer" }}
                          data-testid={`checkbox-expenseStatus-${row.id}`}
                        />
                      </td>
                      <td
                        style={{
                          padding: "8px",
                          border: "1px solid rgba(12, 12, 12, 0.08)",
                        }}
                      >
                        <input
                          type="text"
                          value={row.request}
                          onChange={(e) => {
                            setMaterialRows(prev =>
                              prev.map(r =>
                                r.id === row.id
                                  ? { ...r, request: e.target.value }
                                  : r
                              )
                            );
                          }}
                          style={{
                            width: "100%",
                            padding: "8px",
                            border: "1px solid rgba(12, 12, 12, 0.12)",
                            borderRadius: "4px",
                            fontFamily: "Pretendard",
                            fontSize: "14px",
                          }}
                          data-testid={`input-request-${row.id}`}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* 삭제 버튼 */}
              <div style={{ marginTop: "16px" }}>
                <Button
                  type="button"
                  onClick={deleteMaterialRows}
                  disabled={selectedMaterialRows.size === 0}
                  className="hover-elevate active-elevate-2"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontFamily: "Pretendard",
                    fontSize: "15px",
                    fontWeight: 500,
                    padding: "10px 20px",
                    background: "white",
                    color: "#FF4D4F",
                    border: "1px solid rgba(12, 12, 12, 0.12)",
                    borderRadius: "6px",
                  }}
                  data-testid="button-delete-materials"
                >
                  <Trash2 size={16} />
                  삭제
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 하단 버튼 - 자재비 */}
        {selectedCategory === "자재비" && (
          <div
            className="flex justify-between items-center mt-8"
            style={{
              padding: "20px 0",
            }}
          >
            <button
              type="button"
              onClick={() => setMaterialRows([])}
              style={{
                fontFamily: "Pretendard",
                fontSize: "16px",
                fontWeight: 600,
                color: "#FF4D4F",
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
              data-testid="button-reset-materials"
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
              data-testid="button-save-materials"
            >
              저장
            </button>
          </div>
        )}
      </div>
    </FieldSurveyLayout>
  );
}
