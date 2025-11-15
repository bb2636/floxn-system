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
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

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
  category: string; // 공종 (editable dropdown)
  workName: string; // 공사명
  detailWork: string; // 세부공사
  detailItem: string | null; // 세부항목
  priceStandard: string; // 단가 기준 (editable dropdown)
  unit: string; // 단위
  standardPrice: string; // 기준가(원/단위)
  quantity: string; // 수량 (editable)
  applicationRates: { // 적용률 (multiple checkboxes)
    ceiling: boolean; // 천장
    wall: boolean; // 벽체
    floor: boolean; // 바닥
    molding: boolean; // 몰이
  };
  pricePerSqm: string; // 기준가(㎡)
  damageArea: string; // 피해면적
  deduction: string; // 공제(원)
  expenseStatus: string; // 경비여부
  salesMarkupRate: string; // 판매단가율 (editable)
  amount: string; // 금액(원) (calculated)
  request: string; // 요청
  includeInEstimate: boolean; // 견적입력 (checkbox)
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
  category: string; // 공종 (드롭다운)
  materialName: string; // 자재 (드롭다운)
  specification: string; // 규격
  unit: string; // 단위
  areaUnit: string; // 단위² (m² 등)
  standardPrice: number; // 기본단가
  quantity: string; // 수량 (editable)
  amount: number; // 금액 (계산값)
  note: string; // 비고 (editable)
  request: string; // 요청
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
  const [vatIncluded, setVatIncluded] = useState(true); // VAT 포함 여부

  // 빈 자재비 행 생성 함수
  const createBlankMaterialRow = (): MaterialRow => {
    return {
      id: `material-${Date.now()}-${Math.random()}`,
      category: "",
      materialName: "",
      specification: "",
      unit: "",
      areaUnit: "m²",
      standardPrice: 0,
      quantity: "",
      amount: 0,
      note: "",
      request: "",
    };
  };

  // 빈 노무비 행 생성 함수
  const createBlankLaborRow = (): LaborCostRow => {
    return {
      id: `labor-${Date.now()}-${Math.random()}`,
      category: "가구공사",
      workName: "코킹",
      detailWork: "실리콘",
      detailItem: "-",
      priceStandard: "인",
      unit: "원",
      standardPrice: "157069",
      quantity: "1",
      applicationRates: {
        ceiling: false,
        wall: true,
        floor: false,
        molding: false,
      },
      salesMarkupRate: "30",
      pricePerSqm: "30",
      damageArea: "157069",
      deduction: "",
      expenseStatus: "",
      amount: "0",
      request: "",
      includeInEstimate: false,
    };
  };

  // 노무비 초기 첫 행 설정
  useEffect(() => {
    if (laborCostRows.length === 0) {
      setLaborCostRows([createBlankLaborRow()]);
    }
  }, []);

  // 자재비 초기 빈 행 설정
  useEffect(() => {
    if (materialRows.length === 0) {
      setMaterialRows([createBlankMaterialRow()]);
    }
  }, []);

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
  const [selectedMaterialCategory, setSelectedMaterialCategory] = useState("");
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

  // 총 비용 계산 (견적서 탭용)
  const estimateSummary = useMemo(() => {
    // 노무비 총합 (공제 필드 합계)
    const laborTotal = laborCostRows.reduce((sum, row) => {
      const deduction = parseFloat(row.deduction) || 0;
      return sum + deduction;
    }, 0);

    // 자재비 총합 (금액 필드 합계)
    const materialTotal = materialRows.reduce((sum, row) => {
      return sum + (row.amount || 0);
    }, 0);

    // 소계
    const subtotal = laborTotal + materialTotal;

    // 일반관리비 (6%)
    const managementFee = Math.round(subtotal * 0.06);

    // 이윤 (15%)
    const profit = Math.round(subtotal * 0.15);

    // VAT 기준액 (소계 + 일반관리비 + 이윤)
    const vatBase = subtotal + managementFee + profit;

    // VAT (10%)
    const vat = Math.round(vatBase * 0.1);

    // 총 합계
    const total = vatIncluded ? vatBase + vat : vatBase;

    return {
      subtotal,
      managementFee,
      profit,
      vat,
      total,
    };
  }, [laborCostRows, materialRows, vatIncluded]);

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
      applicationRates: {
        ceiling: false,
        wall: false,
        floor: false,
        molding: false,
      },
      pricePerSqm: "30",
      damageArea: "",
      deduction: "",
      expenseStatus: "",
      salesMarkupRate: "30",
      amount: item.standardPrice.toString(),
      request: "",
      includeInEstimate: false,
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
  const availableMaterialCategories = useMemo(() => {
    const categories = new Set<string>();
    materialsData.forEach(m => {
      // materialsData에서 category 필드가 있으면 추출, 없으면 자재명을 카테고리로 사용
      const category = m.materialName; // DB에 category 컬럼이 없으므로 materialName을 사용
      categories.add(category);
    });
    return Array.from(categories).sort();
  }, [materialsData]);

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
      category: selectedMaterial.materialName, // 공종으로 자재명 사용
      materialName: selectedMaterial.materialName,
      specification: selectedMaterial.specification,
      unit: selectedMaterial.unit,
      areaUnit: "m²", // 기본값
      standardPrice: selectedMaterial.standardPrice,
      quantity: "1",
      amount: selectedMaterial.standardPrice,
      note: "",
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

  // 자재비 빈 행 추가
  const addBlankMaterialRow = () => {
    setMaterialRows(prev => [...prev, createBlankMaterialRow()]);
  };

  // 자재비 행 수정
  const updateMaterialRow = (rowId: string, updates: Partial<MaterialRow>) => {
    setMaterialRows(prev => 
      prev.map(row => {
        if (row.id !== rowId) return row;
        
        const updatedRow = { ...row, ...updates };
        
        // quantity가 변경되면 amount 재계산
        if (updates.quantity !== undefined) {
          const qty = parseFloat(updatedRow.quantity) || 0;
          updatedRow.amount = qty * updatedRow.standardPrice;
        }
        
        return updatedRow;
      })
    );
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
  const updateLaborRow = (rowId: string, field: keyof LaborCostRow | string, value: any) => {
    setLaborCostRows(prev => prev.map(row => {
      if (row.id === rowId) {
        // 적용률 체크박스 업데이트
        if (field.startsWith('applicationRates.')) {
          const rateType = field.split('.')[1] as keyof typeof row.applicationRates;
          return {
            ...row,
            applicationRates: {
              ...row.applicationRates,
              [rateType]: value,
            },
          };
        }
        
        // 일반 필드 업데이트
        return { ...row, [field]: value };
      }
      return row;
    }));
  };

  // 노무비 행 복제
  const duplicateLaborRow = (rowId: string) => {
    const rowToDuplicate = laborCostRows.find(r => r.id === rowId);
    if (rowToDuplicate) {
      const newRow: LaborCostRow = {
        ...rowToDuplicate,
        id: `labor-${Date.now()}-${Math.random()}`,
      };
      setLaborCostRows(prev => [...prev, newRow]);
      toast({
        title: "행이 복제되었습니다",
      });
    }
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
            {/* 상단 탭 버튼 및 공종 선택 */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              {/* 좌측 탭 버튼 */}
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  style={{
                    padding: "10px 20px",
                    background: "white",
                    border: "1px solid rgba(12, 12, 12, 0.1)",
                    borderRadius: "6px",
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "#0C0C0C",
                    cursor: "pointer",
                  }}
                  data-testid="button-select-rows"
                >
                  행 선택
                </button>
                <button
                  style={{
                    padding: "10px 20px",
                    background: "white",
                    border: "1px solid rgba(12, 12, 12, 0.1)",
                    borderRadius: "6px",
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "#0C0C0C",
                    cursor: "pointer",
                  }}
                  data-testid="button-go-to-estimate"
                >
                  견적서 이동
                </button>
              </div>

              {/* 우측 공종 선택 */}
              <div style={{ width: "200px" }}>
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
                    data-testid="select-category-filter"
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
                    <th style={{ width: "50px", padding: "12px 8px", borderRight: "1px solid rgba(12, 12, 12, 0.06)", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600, color: "rgba(12, 12, 12, 0.6)", textAlign: "center" }}></th>
                    <th style={{ width: "120px", padding: "12px 8px", borderRight: "1px solid rgba(12, 12, 12, 0.06)", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600, color: "rgba(12, 12, 12, 0.6)", textAlign: "center" }}>공종</th>
                    <th style={{ width: "100px", padding: "12px 8px", borderRight: "1px solid rgba(12, 12, 12, 0.06)", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600, color: "rgba(12, 12, 12, 0.6)", textAlign: "center" }}>공사명</th>
                    <th style={{ width: "100px", padding: "12px 8px", borderRight: "1px solid rgba(12, 12, 12, 0.06)", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600, color: "rgba(12, 12, 12, 0.6)", textAlign: "center" }}>세부공사</th>
                    <th style={{ width: "120px", padding: "12px 8px", borderRight: "1px solid rgba(12, 12, 12, 0.06)", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600, color: "rgba(12, 12, 12, 0.6)", textAlign: "center" }}>세부항목</th>
                    <th style={{ width: "100px", padding: "12px 8px", borderRight: "1px solid rgba(12, 12, 12, 0.06)", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600, color: "rgba(12, 12, 12, 0.6)", textAlign: "center" }}>단가 기준</th>
                    <th style={{ width: "70px", padding: "12px 8px", borderRight: "1px solid rgba(12, 12, 12, 0.06)", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600, color: "rgba(12, 12, 12, 0.6)", textAlign: "center" }}>단위</th>
                    <th style={{ width: "120px", padding: "12px 8px", borderRight: "1px solid rgba(12, 12, 12, 0.06)", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600, color: "rgba(12, 12, 12, 0.6)", textAlign: "center" }}>기준가(원/단위)</th>
                    <th style={{ width: "80px", padding: "12px 8px", borderRight: "1px solid rgba(12, 12, 12, 0.06)", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600, color: "rgba(12, 12, 12, 0.6)", textAlign: "center" }}>수량</th>
                    <th style={{ width: "140px", padding: "12px 8px", borderRight: "1px solid rgba(12, 12, 12, 0.06)", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600, color: "rgba(12, 12, 12, 0.6)", textAlign: "center" }}>적용률</th>
                    <th style={{ width: "100px", padding: "12px 8px", borderRight: "1px solid rgba(12, 12, 12, 0.06)", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600, color: "rgba(12, 12, 12, 0.6)", textAlign: "center" }}>기준가(㎡)</th>
                    <th style={{ width: "100px", padding: "12px 8px", borderRight: "1px solid rgba(12, 12, 12, 0.06)", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600, color: "rgba(12, 12, 12, 0.6)", textAlign: "center" }}>판매단가율</th>
                    <th style={{ width: "120px", padding: "12px 8px", borderRight: "1px solid rgba(12, 12, 12, 0.06)", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600, color: "rgba(12, 12, 12, 0.6)", textAlign: "center" }}>금액(원)</th>
                    <th style={{ width: "80px", padding: "12px 8px", borderRight: "1px solid rgba(12, 12, 12, 0.06)", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600, color: "rgba(12, 12, 12, 0.6)", textAlign: "center" }}>견적입력</th>
                    <th style={{ width: "80px", padding: "12px 8px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600, color: "rgba(12, 12, 12, 0.6)", textAlign: "center" }}>복제</th>
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
                      {/* 체크박스 */}
                      <td style={{ padding: "8px", textAlign: "center", borderRight: "1px solid rgba(12, 12, 12, 0.06)" }}>
                        <input
                          type="checkbox"
                          checked={selectedLaborRows.has(row.id)}
                          onChange={() => toggleLaborRow(row.id)}
                          style={{ width: "16px", height: "16px", cursor: "pointer" }}
                          data-testid={`checkbox-labor-${row.id}`}
                        />
                      </td>
                      
                      {/* 공종 (드롭다운) */}
                      <td style={{ padding: "8px", borderRight: "1px solid rgba(12, 12, 12, 0.06)" }}>
                        <select
                          value={row.category}
                          onChange={(e) => updateLaborRow(row.id, 'category', e.target.value)}
                          style={{
                            width: "100%",
                            padding: "6px 8px",
                            border: "1px solid rgba(12, 12, 12, 0.1)",
                            borderRadius: "4px",
                            fontFamily: "Pretendard",
                            fontSize: "13px",
                          }}
                          data-testid={`select-category-${row.id}`}
                        >
                          {availableCostCategories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </td>
                      
                      {/* 공사명 */}
                      <td style={{ padding: "8px", borderRight: "1px solid rgba(12, 12, 12, 0.06)" }}>
                        <span style={{ fontFamily: "Pretendard", fontSize: "13px" }}>{row.workName}</span>
                      </td>
                      
                      {/* 세부공사 */}
                      <td style={{ padding: "8px", borderRight: "1px solid rgba(12, 12, 12, 0.06)" }}>
                        <span style={{ fontFamily: "Pretendard", fontSize: "13px" }}>{row.detailWork}</span>
                      </td>
                      
                      {/* 세부항목 */}
                      <td style={{ padding: "8px", borderRight: "1px solid rgba(12, 12, 12, 0.06)" }}>
                        <span style={{ fontFamily: "Pretendard", fontSize: "13px" }}>{row.detailItem || ""}</span>
                      </td>
                      
                      {/* 단가 기준 (드롭다운) */}
                      <td style={{ padding: "8px", borderRight: "1px solid rgba(12, 12, 12, 0.06)" }}>
                        <select
                          value={row.priceStandard}
                          onChange={(e) => updateLaborRow(row.id, 'priceStandard', e.target.value)}
                          style={{
                            width: "100%",
                            padding: "6px 8px",
                            border: "1px solid rgba(12, 12, 12, 0.1)",
                            borderRadius: "4px",
                            fontFamily: "Pretendard",
                            fontSize: "13px",
                          }}
                          data-testid={`select-priceStandard-${row.id}`}
                        >
                          <option value="인">인</option>
                          <option value="식">식</option>
                          <option value="개">개</option>
                        </select>
                      </td>
                      
                      {/* 단위 */}
                      <td style={{ padding: "8px", textAlign: "center", borderRight: "1px solid rgba(12, 12, 12, 0.06)" }}>
                        <span style={{ fontFamily: "Pretendard", fontSize: "13px" }}>{row.unit}</span>
                      </td>
                      
                      {/* 기준가(원/단위) */}
                      <td style={{ padding: "8px", textAlign: "right", borderRight: "1px solid rgba(12, 12, 12, 0.06)" }}>
                        <span style={{ fontFamily: "Pretendard", fontSize: "13px" }}>{parseInt(row.standardPrice || "0").toLocaleString()}</span>
                      </td>
                      
                      {/* 수량 */}
                      <td style={{ padding: "8px", borderRight: "1px solid rgba(12, 12, 12, 0.06)" }}>
                        <input 
                          type="text" 
                          value={row.quantity} 
                          onChange={(e) => updateLaborRow(row.id, 'quantity', e.target.value)}
                          className="input-focus-blue" 
                          style={{ width: "100%", padding: "6px 8px", fontFamily: "Pretendard", fontSize: "13px", border: "1px solid rgba(12, 12, 12, 0.1)", borderRadius: "4px", textAlign: "right" }} 
                          data-testid={`input-quantity-${row.id}`}
                        />
                      </td>
                      
                      {/* 적용률 (여러 체크박스) */}
                      <td style={{ padding: "8px", borderRight: "1px solid rgba(12, 12, 12, 0.06)" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <label style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", fontFamily: "Pretendard" }}>
                            <input
                              type="checkbox"
                              checked={row.applicationRates.ceiling}
                              onChange={(e) => updateLaborRow(row.id, 'applicationRates.ceiling', e.target.checked)}
                              style={{ width: "14px", height: "14px" }}
                              data-testid={`checkbox-ceiling-${row.id}`}
                            />
                            천장
                          </label>
                          <label style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", fontFamily: "Pretendard" }}>
                            <input
                              type="checkbox"
                              checked={row.applicationRates.wall}
                              onChange={(e) => updateLaborRow(row.id, 'applicationRates.wall', e.target.checked)}
                              style={{ width: "14px", height: "14px" }}
                              data-testid={`checkbox-wall-${row.id}`}
                            />
                            벽체
                          </label>
                          <label style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", fontFamily: "Pretendard" }}>
                            <input
                              type="checkbox"
                              checked={row.applicationRates.floor}
                              onChange={(e) => updateLaborRow(row.id, 'applicationRates.floor', e.target.checked)}
                              style={{ width: "14px", height: "14px" }}
                              data-testid={`checkbox-floor-${row.id}`}
                            />
                            바닥
                          </label>
                          <label style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", fontFamily: "Pretendard" }}>
                            <input
                              type="checkbox"
                              checked={row.applicationRates.molding}
                              onChange={(e) => updateLaborRow(row.id, 'applicationRates.molding', e.target.checked)}
                              style={{ width: "14px", height: "14px" }}
                              data-testid={`checkbox-molding-${row.id}`}
                            />
                            몰이
                          </label>
                        </div>
                      </td>
                      
                      {/* 기준가(㎡) */}
                      <td style={{ padding: "8px", borderRight: "1px solid rgba(12, 12, 12, 0.06)" }}>
                        <input 
                          type="text" 
                          value={row.pricePerSqm} 
                          onChange={(e) => updateLaborRow(row.id, 'pricePerSqm', e.target.value)}
                          className="input-focus-blue" 
                          style={{ width: "100%", padding: "6px 8px", fontFamily: "Pretendard", fontSize: "13px", border: "1px solid rgba(12, 12, 12, 0.1)", borderRadius: "4px", textAlign: "right" }} 
                          data-testid={`input-pricePerSqm-${row.id}`}
                        />
                      </td>
                      
                      {/* 판매단가율 */}
                      <td style={{ padding: "8px", borderRight: "1px solid rgba(12, 12, 12, 0.06)" }}>
                        <input 
                          type="text" 
                          value={row.salesMarkupRate} 
                          onChange={(e) => updateLaborRow(row.id, 'salesMarkupRate', e.target.value)}
                          className="input-focus-blue" 
                          style={{ width: "100%", padding: "6px 8px", fontFamily: "Pretendard", fontSize: "13px", border: "1px solid rgba(12, 12, 12, 0.1)", borderRadius: "4px", textAlign: "right" }} 
                          data-testid={`input-salesMarkupRate-${row.id}`}
                        />
                      </td>
                      
                      {/* 금액(원) - 계산 결과 */}
                      <td style={{ padding: "8px", textAlign: "right", borderRight: "1px solid rgba(12, 12, 12, 0.06)", background: "rgba(12, 12, 12, 0.02)" }}>
                        <span style={{ fontFamily: "Pretendard", fontSize: "13px", fontWeight: 600 }}>
                          {parseInt(row.amount || "0").toLocaleString()}
                        </span>
                      </td>
                      
                      {/* 견적입력 체크박스 */}
                      <td style={{ padding: "8px", textAlign: "center", borderRight: "1px solid rgba(12, 12, 12, 0.06)" }}>
                        <input 
                          type="checkbox" 
                          checked={row.includeInEstimate} 
                          onChange={(e) => updateLaborRow(row.id, 'includeInEstimate', e.target.checked)}
                          style={{ width: "16px", height: "16px", cursor: "pointer" }} 
                          data-testid={`checkbox-includeInEstimate-${row.id}`}
                        />
                      </td>
                      
                      {/* 복제 버튼 */}
                      <td style={{ padding: "8px", textAlign: "center" }}>
                        <button
                          onClick={() => duplicateLaborRow(row.id)}
                          style={{
                            padding: "4px 12px",
                            background: "white",
                            border: "1px solid rgba(12, 12, 12, 0.2)",
                            borderRadius: "4px",
                            fontFamily: "Pretendard",
                            fontSize: "12px",
                            cursor: "pointer",
                          }}
                          data-testid={`button-duplicate-${row.id}`}
                        >
                          복제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 항목 추가 선택기 패널 */}
            <div
              style={{
                background: "rgba(12, 12, 12, 0.02)",
                borderRadius: "8px",
                padding: "16px",
                marginTop: "20px",
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
                      data-testid="select-cost-category-add"
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
                      data-testid="select-cost-workname-add"
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
                      data-testid="select-cost-detailwork-add"
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
        {/* 견적서 탭 */}
        {selectedCategory === "견적서" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
          >
            {/* 견적서 제목 */}
            <div
              style={{
                fontFamily: "Pretendard",
                fontWeight: 600,
                fontSize: "20px",
                lineHeight: "128%",
                letterSpacing: "-0.02em",
                color: "#0C0C0C",
                marginBottom: "24px",
              }}
            >
              견적서
            </div>

            {/* 작성자 정보 */}
            <div
              style={{
                background: "rgba(12, 12, 12, 0.02)",
                borderRadius: "12px",
                padding: "24px",
              }}
            >
              <h3
                style={{
                  fontFamily: "Pretendard",
                  fontWeight: 600,
                  fontSize: "16px",
                  lineHeight: "128%",
                  letterSpacing: "-0.02em",
                  color: "#0C0C0C",
                  marginBottom: "20px",
                }}
              >
                작성자 정보
              </h3>

              {/* 담당자 */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: "12px",
                }}
              >
                <label
                  style={{
                    fontFamily: "Pretendard",
                    fontWeight: 400,
                    fontSize: "14px",
                    lineHeight: "128%",
                    letterSpacing: "-0.01em",
                    color: "rgba(12, 12, 12, 0.6)",
                    width: "100px",
                    flexShrink: 0,
                  }}
                >
                  담당자
                </label>
                <div
                  style={{
                    flex: 1,
                    padding: "12px 16px",
                    background: "rgba(12, 12, 12, 0.04)",
                    borderRadius: "8px",
                    fontFamily: "Pretendard",
                    fontWeight: 400,
                    fontSize: "14px",
                    lineHeight: "128%",
                    letterSpacing: "-0.01em",
                    color: "rgba(12, 12, 12, 0.6)",
                  }}
                >
                  {selectedCase?.assignedPartnerManager || "담당자 성함"}
                </div>
              </div>

              {/* 협력사명 */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: "12px",
                }}
              >
                <label
                  style={{
                    fontFamily: "Pretendard",
                    fontWeight: 400,
                    fontSize: "14px",
                    lineHeight: "128%",
                    letterSpacing: "-0.01em",
                    color: "rgba(12, 12, 12, 0.6)",
                    width: "100px",
                    flexShrink: 0,
                  }}
                >
                  협력사명
                </label>
                <div
                  style={{
                    flex: 1,
                    padding: "12px 16px",
                    background: "rgba(12, 12, 12, 0.04)",
                    borderRadius: "8px",
                    fontFamily: "Pretendard",
                    fontWeight: 400,
                    fontSize: "14px",
                    lineHeight: "128%",
                    letterSpacing: "-0.01em",
                    color: "rgba(12, 12, 12, 0.6)",
                  }}
                >
                  {selectedCase?.assignedPartner || "협력사명"}
                </div>
              </div>

              {/* 연락처 */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <label
                  style={{
                    fontFamily: "Pretendard",
                    fontWeight: 400,
                    fontSize: "14px",
                    lineHeight: "128%",
                    letterSpacing: "-0.01em",
                    color: "rgba(12, 12, 12, 0.6)",
                    width: "100px",
                    flexShrink: 0,
                  }}
                >
                  연락처
                </label>
                <div
                  style={{
                    flex: 1,
                    padding: "12px 16px",
                    background: "rgba(12, 12, 12, 0.04)",
                    borderRadius: "8px",
                    fontFamily: "Pretendard",
                    fontWeight: 400,
                    fontSize: "14px",
                    lineHeight: "128%",
                    letterSpacing: "-0.01em",
                    color: "rgba(12, 12, 12, 0.6)",
                  }}
                >
                  {selectedCase?.assignedPartnerContact || "'-'빼고 입력"}
                </div>
              </div>
            </div>

            {/* 고객 정보 & 기타 섹션 */}
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "flex-start",
                gap: "20px",
                marginTop: "24px",
              }}
            >

              {/* 고객 정보 */}
              <div
                style={{
                  flex: 1,
                  background: "rgba(12, 12, 12, 0.04)",
                  borderRadius: "12px",
                  padding: "20px",
                }}
              >
                <h3
                  style={{
                    fontFamily: "Pretendard",
                    fontWeight: 500,
                    fontSize: "18px",
                    lineHeight: "128%",
                    letterSpacing: "-0.02em",
                    color: "#0C0C0C",
                    marginBottom: "20px",
                  }}
                >
                  고객 정보
                </h3>
                
                {/* 착수일 */}
                <div style={{ marginBottom: "12px" }}>
                  <label
                    style={{
                      fontFamily: "Pretendard",
                      fontWeight: 500,
                      fontSize: "14px",
                      lineHeight: "128%",
                      letterSpacing: "-0.01em",
                      color: "#686A6E",
                      display: "block",
                      marginBottom: "8px",
                    }}
                  >
                    착수일
                  </label>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <input
                      type="date"
                      style={{
                        flex: 1,
                        padding: "10px 20px",
                        background: "rgba(12, 12, 12, 0.04)",
                        borderRadius: "8px",
                        border: "none",
                        fontFamily: "Pretendard",
                        fontWeight: 600,
                        fontSize: "16px",
                        lineHeight: "128%",
                        letterSpacing: "-0.02em",
                        color: "#0C0C0C",
                      }}
                      data-testid="input-start-date"
                    />
                    <button
                      style={{
                        padding: "10px 24px",
                        background: "#008FED",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        fontFamily: "Pretendard",
                        fontWeight: 500,
                        fontSize: "14px",
                        cursor: "pointer",
                      }}
                      data-testid="button-set-date"
                    >
                      조회
                    </button>
                  </div>
                </div>

                {/* 피보험자 */}
                <div style={{ marginBottom: "12px" }}>
                  <label
                    style={{
                      fontFamily: "Pretendard",
                      fontWeight: 500,
                      fontSize: "14px",
                      lineHeight: "128%",
                      letterSpacing: "-0.01em",
                      color: "#686A6E",
                      display: "block",
                      marginBottom: "8px",
                    }}
                  >
                    피보험자
                  </label>
                  <input
                    type="text"
                    placeholder="입력값이 들어간 것으로 보임"
                    style={{
                      width: "100%",
                      padding: "10px 20px",
                      background: "rgba(12, 12, 12, 0.04)",
                      borderRadius: "8px",
                      border: "none",
                      fontFamily: "Pretendard",
                      fontWeight: 600,
                      fontSize: "16px",
                      lineHeight: "128%",
                      letterSpacing: "-0.02em",
                      color: "#0C0C0C",
                    }}
                    data-testid="input-insured"
                  />
                </div>

                {/* 피보험자명 */}
                <div style={{ marginBottom: "12px" }}>
                  <label
                    style={{
                      fontFamily: "Pretendard",
                      fontWeight: 500,
                      fontSize: "14px",
                      lineHeight: "128%",
                      letterSpacing: "-0.01em",
                      color: "#686A6E",
                      display: "block",
                      marginBottom: "8px",
                    }}
                  >
                    피보험자명
                  </label>
                  <input
                    type="text"
                    placeholder="피보험자명"
                    style={{
                      width: "100%",
                      padding: "10px 20px",
                      background: "rgba(12, 12, 12, 0.04)",
                      borderRadius: "8px",
                      border: "none",
                      fontFamily: "Pretendard",
                      fontWeight: 600,
                      fontSize: "16px",
                      lineHeight: "128%",
                      letterSpacing: "-0.02em",
                      color: "#0C0C0C",
                    }}
                    data-testid="input-insured-name"
                  />
                </div>

                {/* 주소 */}
                <div>
                  <label
                    style={{
                      fontFamily: "Pretendard",
                      fontWeight: 500,
                      fontSize: "14px",
                      lineHeight: "128%",
                      letterSpacing: "-0.01em",
                      color: "#686A6E",
                      display: "block",
                      marginBottom: "8px",
                    }}
                  >
                    주소
                  </label>
                  <input
                    type="text"
                    placeholder="주소"
                    style={{
                      width: "100%",
                      padding: "10px 20px",
                      background: "rgba(12, 12, 12, 0.04)",
                      borderRadius: "8px",
                      border: "none",
                      fontFamily: "Pretendard",
                      fontWeight: 600,
                      fontSize: "16px",
                      lineHeight: "128%",
                      letterSpacing: "-0.02em",
                      color: "#0C0C0C",
                    }}
                    data-testid="input-address"
                  />
                </div>
              </div>
            </div>

            {/* 복구면적 산출표 섹션 */}
            <div style={{ marginTop: "40px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "12px",
                }}
              >
                <div>
                  <span
                    style={{
                      fontFamily: "Pretendard",
                      fontWeight: 600,
                      fontSize: "16px",
                      letterSpacing: "-0.02em",
                      color: "#0C0C0C",
                    }}
                  >
                    복구면적 산출표
                  </span>
                  <span
                    style={{
                      fontFamily: "Pretendard",
                      fontWeight: 400,
                      fontSize: "14px",
                      color: "#686A6E",
                      marginLeft: "12px",
                    }}
                  >
                    2025-00-00
                  </span>
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    style={{
                      padding: "6px 12px",
                      background: "white",
                      border: "1px solid rgba(12, 12, 12, 0.1)",
                      borderRadius: "4px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      cursor: "pointer",
                    }}
                    data-testid="button-add-row-area"
                  >
                    월 추가
                  </button>
                  <button
                    style={{
                      padding: "6px 12px",
                      background: "white",
                      border: "1px solid rgba(12, 12, 12, 0.1)",
                      borderRadius: "4px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: "#D02B20",
                      cursor: "pointer",
                    }}
                    data-testid="button-delete-row-area"
                  >
                    행 삭제
                  </button>
                </div>
              </div>
              
              {/* 복구면적 산출표 테이블 */}
              {rows.length > 0 && (
                <div
                  style={{
                    background: "#FDFDFD",
                    boxShadow: "0px 0px 20px #DBE9F5",
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
                          background: "rgba(12, 12, 12, 0.04)",
                          borderBottom: "1px solid rgba(12, 12, 12, 0.06)",
                        }}
                      >
                        <th style={{ width: "40px", padding: "12px", textAlign: "center" }}></th>
                        <th style={{ padding: "12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600, color: "rgba(12, 12, 12, 0.6)" }}>장소</th>
                        <th style={{ padding: "12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600, color: "rgba(12, 12, 12, 0.6)" }}>위치</th>
                        <th style={{ padding: "12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600, color: "rgba(12, 12, 12, 0.6)" }}>공사내용</th>
                        <th style={{ padding: "12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600, color: "rgba(12, 12, 12, 0.6)" }}>피해면적</th>
                        <th style={{ padding: "12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600, color: "rgba(12, 12, 12, 0.6)" }}>기준가(mm)</th>
                        <th style={{ padding: "12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600, color: "rgba(12, 12, 12, 0.6)" }}>면적(mm)</th>
                        <th style={{ padding: "12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600, color: "rgba(12, 12, 12, 0.6)" }}>기준가(mm)</th>
                        <th style={{ padding: "12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600, color: "rgba(12, 12, 12, 0.6)" }}>면적(m²)</th>
                        <th style={{ padding: "12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600, color: "rgba(12, 12, 12, 0.6)" }}>비고</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, index) => (
                        <tr key={index} style={{ borderBottom: "1px solid rgba(12, 12, 12, 0.06)" }}>
                          <td style={{ padding: "8px", textAlign: "center" }}>
                            <input type="checkbox" />
                          </td>
                          <td style={{ padding: "8px" }}>
                            <select
                              value={row.category}
                              onChange={(e) => updateRow(row.id, 'category', e.target.value)}
                              style={{
                                width: "100%",
                                padding: "6px 8px",
                                border: "1px solid rgba(12, 12, 12, 0.1)",
                                borderRadius: "4px",
                                fontFamily: "Pretendard",
                                fontSize: "14px",
                              }}
                            >
                              {roomCategories.map((cat) => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                          </td>
                          <td style={{ padding: "8px" }}>
                            <select
                              value={row.location}
                              onChange={(e) => updateRow(row.id, 'location', e.target.value)}
                              style={{
                                width: "100%",
                                padding: "6px 8px",
                                border: "1px solid rgba(12, 12, 12, 0.1)",
                                borderRadius: "4px",
                                fontFamily: "Pretendard",
                                fontSize: "14px",
                              }}
                            >
                              {locations.map((loc) => (
                                <option key={loc} value={loc}>{loc}</option>
                              ))}
                            </select>
                          </td>
                          <td style={{ padding: "8px" }}>
                            <select
                              value={row.workName}
                              onChange={(e) => updateRow(row.id, 'workName', e.target.value)}
                              style={{
                                width: "100%",
                                padding: "6px 8px",
                                border: "1px solid rgba(12, 12, 12, 0.1)",
                                borderRadius: "4px",
                                fontFamily: "Pretendard",
                                fontSize: "14px",
                              }}
                            >
                              {workNames.map((work) => (
                                <option key={work} value={work}>{work}</option>
                              ))}
                            </select>
                          </td>
                          <td style={{ padding: "8px", fontFamily: "Pretendard", fontSize: "14px", textAlign: "right", background: "rgba(12, 12, 12, 0.02)" }}>{row.damageArea}</td>
                          <td style={{ padding: "8px" }}>
                            <input
                              type="text"
                              value={row.damageWidth}
                              onChange={(e) => updateRow(row.id, 'damageWidth', e.target.value)}
                              style={{
                                width: "100%",
                                padding: "6px 8px",
                                border: "1px solid rgba(12, 12, 12, 0.1)",
                                borderRadius: "4px",
                                fontFamily: "Pretendard",
                                fontSize: "14px",
                                textAlign: "right",
                              }}
                            />
                          </td>
                          <td style={{ padding: "8px" }}>
                            <input
                              type="text"
                              value={row.damageHeight}
                              onChange={(e) => updateRow(row.id, 'damageHeight', e.target.value)}
                              style={{
                                width: "100%",
                                padding: "6px 8px",
                                border: "1px solid rgba(12, 12, 12, 0.1)",
                                borderRadius: "4px",
                                fontFamily: "Pretendard",
                                fontSize: "14px",
                                textAlign: "right",
                              }}
                            />
                          </td>
                          <td style={{ padding: "8px" }}>
                            <input
                              type="text"
                              value={row.repairWidth}
                              onChange={(e) => updateRow(row.id, 'repairWidth', e.target.value)}
                              style={{
                                width: "100%",
                                padding: "6px 8px",
                                border: "1px solid rgba(12, 12, 12, 0.1)",
                                borderRadius: "4px",
                                fontFamily: "Pretendard",
                                fontSize: "14px",
                                textAlign: "right",
                              }}
                            />
                          </td>
                          <td style={{ padding: "8px", fontFamily: "Pretendard", fontSize: "14px", textAlign: "right", background: "rgba(12, 12, 12, 0.02)" }}>{row.repairArea}</td>
                          <td style={{ padding: "8px" }}>
                            <input
                              type="text"
                              value={row.note}
                              onChange={(e) => updateRow(row.id, 'note', e.target.value)}
                              style={{
                                width: "100%",
                                padding: "6px 8px",
                                border: "1px solid rgba(12, 12, 12, 0.1)",
                                borderRadius: "4px",
                                fontFamily: "Pretendard",
                                fontSize: "14px",
                              }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 노무비 섹션 */}
            <div style={{ marginTop: "40px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "12px",
                }}
              >
                <div>
                  <span
                    style={{
                      fontFamily: "Pretendard",
                      fontWeight: 600,
                      fontSize: "16px",
                      letterSpacing: "-0.02em",
                      color: "#0C0C0C",
                    }}
                  >
                    노무비
                  </span>
                  <span
                    style={{
                      fontFamily: "Pretendard",
                      fontWeight: 400,
                      fontSize: "14px",
                      color: "#686A6E",
                      marginLeft: "12px",
                    }}
                  >
                    2025-00-00
                  </span>
                </div>
              </div>
              
              {/* 필터 UI */}
              <div
                style={{
                  padding: "16px",
                  background: "#FAFAFA",
                  border: "1px solid #E5E7EB",
                  borderRadius: "6px",
                  marginBottom: "12px",
                }}
              >
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  {/* 장소 드롭다운 */}
                  <div style={{ flex: 1 }}>
                    <label
                      style={{
                        display: "block",
                        fontFamily: "Pretendard",
                        fontSize: "12px",
                        fontWeight: 500,
                        color: "#686A6E",
                        marginBottom: "6px",
                      }}
                    >
                      장소
                    </label>
                    <Select>
                      <SelectTrigger
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          background: "white",
                        }}
                        data-testid="select-labor-filter-location"
                      >
                        <SelectValue placeholder="가구공사" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="가구공사">가구공사</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 공사명 드롭다운 */}
                  <div style={{ flex: 1 }}>
                    <label
                      style={{
                        display: "block",
                        fontFamily: "Pretendard",
                        fontSize: "12px",
                        fontWeight: 500,
                        color: "#686A6E",
                        marginBottom: "6px",
                      }}
                    >
                      공사명
                    </label>
                    <Select>
                      <SelectTrigger
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          background: "white",
                        }}
                        data-testid="select-labor-filter-work"
                      >
                        <SelectValue placeholder="공사명 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="코킹">코킹</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 세부공사 드롭다운 */}
                  <div style={{ flex: 1 }}>
                    <label
                      style={{
                        display: "block",
                        fontFamily: "Pretendard",
                        fontSize: "12px",
                        fontWeight: 500,
                        color: "#686A6E",
                        marginBottom: "6px",
                      }}
                    >
                      세부공사
                    </label>
                    <Select>
                      <SelectTrigger
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          background: "white",
                        }}
                        data-testid="select-labor-filter-detail"
                      >
                        <SelectValue placeholder="세부공사 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="실리콘">실리콘</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 항목 추가 버튼 */}
                  <button
                    style={{
                      marginTop: "22px",
                      padding: "9px 16px",
                      background: "#3B82F6",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      fontWeight: 500,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                    data-testid="button-add-labor-item"
                  >
                    항목 추가
                  </button>
                </div>

                {/* 삭제 버튼 */}
                <div style={{ marginTop: "12px" }}>
                  <button
                    style={{
                      padding: "6px 12px",
                      background: "white",
                      border: "1px solid #D02B20",
                      borderRadius: "4px",
                      fontFamily: "Pretendard",
                      fontSize: "13px",
                      color: "#D02B20",
                      cursor: "pointer",
                    }}
                    data-testid="button-delete-selected-labor"
                  >
                    선 삭제
                  </button>
                </div>
              </div>
              
              {/* 노무비 테이블 */}
              {laborCostRows.length > 0 && (
                <div style={{ overflowX: "auto" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "separate",
                      borderSpacing: 0,
                      minWidth: "1800px",
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          background: "rgba(12, 12, 12, 0.02)",
                          height: "48px",
                        }}
                      >
                        <th style={{ width: "50px", padding: "0 12px", textAlign: "center", borderBottom: "1px solid #E5E7EB" }}>
                          <Checkbox data-testid="checkbox-select-all-labor" />
                        </th>
                        <th style={{ padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 500, color: "rgba(12, 12, 12, 0.6)", textAlign: "left", borderBottom: "1px solid #E5E7EB" }}>공종</th>
                        <th style={{ padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 500, color: "rgba(12, 12, 12, 0.6)", textAlign: "left", borderBottom: "1px solid #E5E7EB" }}>공사명</th>
                        <th style={{ padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 500, color: "rgba(12, 12, 12, 0.6)", textAlign: "left", borderBottom: "1px solid #E5E7EB" }}>세부공사</th>
                        <th style={{ padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 500, color: "rgba(12, 12, 12, 0.6)", textAlign: "left", borderBottom: "1px solid #E5E7EB" }}>세부항목</th>
                        <th style={{ padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 500, color: "rgba(12, 12, 12, 0.6)", textAlign: "left", borderBottom: "1px solid #E5E7EB" }}>단가 기준</th>
                        <th style={{ padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 500, color: "rgba(12, 12, 12, 0.6)", textAlign: "left", borderBottom: "1px solid #E5E7EB" }}>단위</th>
                        <th style={{ padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 500, color: "rgba(12, 12, 12, 0.6)", textAlign: "right", borderBottom: "1px solid #E5E7EB" }}>기준가(단위)</th>
                        <th style={{ padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 500, color: "rgba(12, 12, 12, 0.6)", textAlign: "right", borderBottom: "1px solid #E5E7EB" }}>수량</th>
                        <th style={{ width: "200px", padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 500, color: "rgba(12, 12, 12, 0.6)", textAlign: "left", borderBottom: "1px solid #E5E7EB" }}>적용률</th>
                        <th style={{ padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 500, color: "rgba(12, 12, 12, 0.6)", textAlign: "right", borderBottom: "1px solid #E5E7EB" }}>기준가(m²)</th>
                        <th style={{ padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 500, color: "rgba(12, 12, 12, 0.6)", textAlign: "right", borderBottom: "1px solid #E5E7EB" }}>피해면적</th>
                        <th style={{ padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 500, color: "rgba(12, 12, 12, 0.6)", textAlign: "right", borderBottom: "1px solid #E5E7EB" }}>공제(원)</th>
                        <th style={{ padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 500, color: "rgba(12, 12, 12, 0.6)", textAlign: "center", borderBottom: "1px solid #E5E7EB" }}>경비여부</th>
                        <th style={{ padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 500, color: "rgba(12, 12, 12, 0.6)", textAlign: "left", borderBottom: "1px solid #E5E7EB" }}>요청</th>
                      </tr>
                    </thead>
                    <tbody>
                      {laborCostRows.map((row, index) => (
                        <tr key={row.id} style={{ height: "56px", borderBottom: "1px solid #E5E7EB" }}>
                          {/* 체크박스 */}
                          <td style={{ padding: "0 12px", textAlign: "center" }}>
                            <Checkbox 
                              checked={selectedLaborRows.has(row.id)}
                              onCheckedChange={(checked) => {
                                const newSet = new Set(selectedLaborRows);
                                if (checked) {
                                  newSet.add(row.id);
                                } else {
                                  newSet.delete(row.id);
                                }
                                setSelectedLaborRows(newSet);
                              }}
                              data-testid={`checkbox-labor-${index}`}
                            />
                          </td>
                          
                          {/* 공종 - Select */}
                          <td style={{ padding: "0 8px" }}>
                            <Select value={row.category} onValueChange={(value) => {
                              setLaborCostRows(prev => prev.map(r => r.id === row.id ? { ...r, category: value } : r));
                            }}>
                              <SelectTrigger 
                                className="h-9 border-0" 
                                style={{ fontFamily: "Pretendard", fontSize: "14px" }}
                                data-testid={`select-category-${index}`}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="가구공사">가구공사</SelectItem>
                                <SelectItem value="도배공사">도배공사</SelectItem>
                                <SelectItem value="미장공사">미장공사</SelectItem>
                                <SelectItem value="수장공사">수장공사</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          
                          {/* 공사명 - Read-only */}
                          <td style={{ padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", color: "rgba(12, 12, 12, 0.8)" }}>
                            {row.workName}
                          </td>
                          
                          {/* 세부공사 - Read-only */}
                          <td style={{ padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", color: "rgba(12, 12, 12, 0.8)" }}>
                            {row.detailWork}
                          </td>
                          
                          {/* 세부항목 - Read-only */}
                          <td style={{ padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", color: "rgba(12, 12, 12, 0.6)" }}>
                            {row.detailItem || "-"}
                          </td>
                          
                          {/* 단가 기준 - Select */}
                          <td style={{ padding: "0 8px" }}>
                            <Select value={row.priceStandard} onValueChange={(value) => {
                              setLaborCostRows(prev => prev.map(r => r.id === row.id ? { ...r, priceStandard: value } : r));
                            }}>
                              <SelectTrigger 
                                className="h-9 border-0" 
                                style={{ fontFamily: "Pretendard", fontSize: "14px" }}
                                data-testid={`select-price-standard-${index}`}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="민">민</SelectItem>
                                <SelectItem value="위">위</SelectItem>
                                <SelectItem value="기">기</SelectItem>
                                <SelectItem value="JV">JV</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          
                          {/* 단위 - Select */}
                          <td style={{ padding: "0 8px" }}>
                            <Select value={row.unit} onValueChange={(value) => {
                              setLaborCostRows(prev => prev.map(r => r.id === row.id ? { ...r, unit: value } : r));
                            }}>
                              <SelectTrigger 
                                className="h-9 border-0" 
                                style={{ fontFamily: "Pretendard", fontSize: "14px" }}
                                data-testid={`select-unit-${index}`}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="인">인</SelectItem>
                                <SelectItem value="m²">m²</SelectItem>
                                <SelectItem value="개">개</SelectItem>
                                <SelectItem value="식">식</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          
                          {/* 기준가(단위) - Read-only */}
                          <td style={{ padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", color: "rgba(12, 12, 12, 0.8)", textAlign: "right" }}>
                            {Number(row.standardPrice).toLocaleString()}
                          </td>
                          
                          {/* 수량 - Editable Input */}
                          <td style={{ padding: "0 8px", background: "#EFF6FF" }}>
                            <Input
                              value={row.quantity}
                              onChange={(e) => {
                                setLaborCostRows(prev => prev.map(r => r.id === row.id ? { ...r, quantity: e.target.value } : r));
                              }}
                              className="h-9 border-0 bg-transparent text-right"
                              style={{ fontFamily: "Pretendard", fontSize: "14px" }}
                              data-testid={`input-quantity-${index}`}
                            />
                          </td>
                          
                          {/* 적용률 - Checkboxes + Input */}
                          <td style={{ padding: "0 8px", background: "#EFF6FF" }}>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1">
                                <Checkbox 
                                  checked={row.applicationRates.ceiling}
                                  onCheckedChange={(checked) => {
                                    setLaborCostRows(prev => prev.map(r => r.id === row.id ? { 
                                      ...r, 
                                      applicationRates: { ...r.applicationRates, ceiling: !!checked }
                                    } : r));
                                  }}
                                  data-testid={`checkbox-ceiling-${index}`}
                                />
                                <label style={{ fontFamily: "Pretendard", fontSize: "13px", color: row.applicationRates.ceiling ? "#222" : "rgba(12, 12, 12, 0.6)" }}>천장</label>
                              </div>
                              <div className="flex items-center gap-1">
                                <Checkbox 
                                  checked={row.applicationRates.wall}
                                  onCheckedChange={(checked) => {
                                    setLaborCostRows(prev => prev.map(r => r.id === row.id ? { 
                                      ...r, 
                                      applicationRates: { ...r.applicationRates, wall: !!checked }
                                    } : r));
                                  }}
                                  data-testid={`checkbox-wall-${index}`}
                                />
                                <label style={{ fontFamily: "Pretendard", fontSize: "13px", color: row.applicationRates.wall ? "#222" : "rgba(12, 12, 12, 0.6)" }}>벽체</label>
                              </div>
                              <div className="flex items-center gap-1">
                                <Checkbox 
                                  checked={row.applicationRates.floor}
                                  onCheckedChange={(checked) => {
                                    setLaborCostRows(prev => prev.map(r => r.id === row.id ? { 
                                      ...r, 
                                      applicationRates: { ...r.applicationRates, floor: !!checked }
                                    } : r));
                                  }}
                                  data-testid={`checkbox-floor-${index}`}
                                />
                                <label style={{ fontFamily: "Pretendard", fontSize: "13px", color: row.applicationRates.floor ? "#222" : "rgba(12, 12, 12, 0.6)" }}>바닥</label>
                              </div>
                              <div className="flex items-center gap-1">
                                <Checkbox 
                                  checked={row.applicationRates.molding}
                                  onCheckedChange={(checked) => {
                                    setLaborCostRows(prev => prev.map(r => r.id === row.id ? { 
                                      ...r, 
                                      applicationRates: { ...r.applicationRates, molding: !!checked }
                                    } : r));
                                  }}
                                  data-testid={`checkbox-molding-${index}`}
                                />
                                <label style={{ fontFamily: "Pretendard", fontSize: "13px", color: row.applicationRates.molding ? "#222" : "rgba(12, 12, 12, 0.6)" }}>몰이</label>
                              </div>
                              <Input
                                value={row.salesMarkupRate}
                                onChange={(e) => {
                                  setLaborCostRows(prev => prev.map(r => r.id === row.id ? { ...r, salesMarkupRate: e.target.value } : r));
                                }}
                                className="h-9 w-16 border-0 bg-white text-right"
                                style={{ fontFamily: "Pretendard", fontSize: "14px" }}
                                data-testid={`input-rate-${index}`}
                              />
                            </div>
                          </td>
                          
                          {/* 기준가(m²) - Editable Input */}
                          <td style={{ padding: "0 8px", background: "#EFF6FF" }}>
                            <Input
                              value={row.pricePerSqm}
                              onChange={(e) => {
                                setLaborCostRows(prev => prev.map(r => r.id === row.id ? { ...r, pricePerSqm: e.target.value } : r));
                              }}
                              className="h-9 border-0 bg-transparent text-right"
                              style={{ fontFamily: "Pretendard", fontSize: "14px" }}
                              data-testid={`input-price-sqm-${index}`}
                            />
                          </td>
                          
                          {/* 피해면적 - Read-only */}
                          <td style={{ padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", color: "rgba(12, 12, 12, 0.8)", textAlign: "right" }}>
                            {Number(row.damageArea).toLocaleString()}
                          </td>
                          
                          {/* 공제(원) - Read-only */}
                          <td style={{ padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", color: "rgba(12, 12, 12, 0.8)", textAlign: "right" }}>
                            {Number(row.deduction).toLocaleString()}
                          </td>
                          
                          {/* 경비여부 - 복제 버튼 */}
                          <td style={{ padding: "0 12px", textAlign: "center" }}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const newRow = { ...row, id: `labor-${Date.now()}-${Math.random()}` };
                                setLaborCostRows(prev => [...prev, newRow]);
                              }}
                              style={{ fontFamily: "Pretendard", fontSize: "13px" }}
                              data-testid={`button-duplicate-${index}`}
                            >
                              복제
                            </Button>
                          </td>
                          
                          {/* 요청 - Editable Input */}
                          <td style={{ padding: "0 8px" }}>
                            <Input
                              value={row.request || ""}
                              onChange={(e) => {
                                setLaborCostRows(prev => prev.map(r => r.id === row.id ? { ...r, request: e.target.value } : r));
                              }}
                              className="h-9 border-0 bg-transparent"
                              style={{ fontFamily: "Pretendard", fontSize: "14px" }}
                              placeholder="-"
                              data-testid={`input-request-${index}`}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 자재비 섹션 */}
            <div style={{ marginTop: "40px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "12px",
                }}
              >
                <div>
                  <span
                    style={{
                      fontFamily: "Pretendard",
                      fontWeight: 600,
                      fontSize: "16px",
                      letterSpacing: "-0.02em",
                      color: "#0C0C0C",
                    }}
                  >
                    자재비
                  </span>
                  <span
                    style={{
                      fontFamily: "Pretendard",
                      fontWeight: 400,
                      fontSize: "14px",
                      color: "#686A6E",
                      marginLeft: "12px",
                    }}
                  >
                    2025-00-00
                  </span>
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    style={{
                      padding: "6px 12px",
                      background: "white",
                      border: "1px solid rgba(12, 12, 12, 0.1)",
                      borderRadius: "4px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      cursor: "pointer",
                    }}
                    data-testid="button-add-row-material"
                  >
                    월 추가
                  </button>
                  <button
                    style={{
                      padding: "6px 12px",
                      background: "white",
                      border: "1px solid rgba(12, 12, 12, 0.1)",
                      borderRadius: "4px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: "#D02B20",
                      cursor: "pointer",
                    }}
                    data-testid="button-delete-row-material"
                  >
                    행 삭제
                  </button>
                </div>
              </div>
              
              {/* 자재비 테이블 */}
              {materialRows.length > 0 && (
                <div
                  style={{
                    background: "#FDFDFD",
                    boxShadow: "0px 0px 20px #DBE9F5",
                    borderRadius: "8px",
                    overflow: "auto",
                  }}
                >
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      minWidth: "1000px",
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          background: "rgba(12, 12, 12, 0.04)",
                          borderBottom: "1px solid rgba(12, 12, 12, 0.06)",
                        }}
                      >
                        <th style={{ width: "40px", padding: "12px", textAlign: "center" }}></th>
                        <th style={{ padding: "12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600, color: "rgba(12, 12, 12, 0.6)" }}>공종</th>
                        <th style={{ padding: "12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600, color: "rgba(12, 12, 12, 0.6)" }}>자재명</th>
                        <th style={{ padding: "12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600, color: "rgba(12, 12, 12, 0.6)" }}>규격</th>
                        <th style={{ padding: "12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600, color: "rgba(12, 12, 12, 0.6)" }}>단위</th>
                        <th style={{ padding: "12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600, color: "rgba(12, 12, 12, 0.6)" }}>기준가</th>
                        <th style={{ padding: "12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600, color: "rgba(12, 12, 12, 0.6)" }}>수량</th>
                        <th style={{ padding: "12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600, color: "rgba(12, 12, 12, 0.6)" }}>금액</th>
                        <th style={{ padding: "12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600, color: "rgba(12, 12, 12, 0.6)" }}>비고</th>
                      </tr>
                    </thead>
                    <tbody>
                      {materialRows.map((row) => (
                        <tr key={row.id} style={{ borderBottom: "1px solid rgba(12, 12, 12, 0.06)" }}>
                          <td style={{ padding: "8px", textAlign: "center" }}>
                            <input type="checkbox" />
                          </td>
                          <td style={{ padding: "8px", fontFamily: "Pretendard", fontSize: "14px" }}>{row.materialName}</td>
                          <td style={{ padding: "8px", fontFamily: "Pretendard", fontSize: "14px" }}>{row.materialName}</td>
                          <td style={{ padding: "8px", fontFamily: "Pretendard", fontSize: "14px" }}>{row.specification}</td>
                          <td style={{ padding: "8px", fontFamily: "Pretendard", fontSize: "14px" }}>{row.unit}</td>
                          <td style={{ padding: "8px", fontFamily: "Pretendard", fontSize: "14px", textAlign: "right" }}>{row.standardPrice}</td>
                          <td style={{ padding: "8px", fontFamily: "Pretendard", fontSize: "14px", textAlign: "right" }}>{row.quantity}</td>
                          <td style={{ padding: "8px", fontFamily: "Pretendard", fontSize: "14px", textAlign: "right" }}>{row.amount}</td>
                          <td style={{ padding: "8px", fontFamily: "Pretendard", fontSize: "14px" }}>{row.request}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 총 비용 계산 섹션 */}
              <div
                style={{
                  marginTop: "40px",
                  padding: "24px 32px",
                  background: "rgba(0, 143, 237, 0.03)",
                  borderRadius: "8px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                    maxWidth: "500px",
                    marginLeft: "auto",
                  }}
                >
                  {/* 소계 */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "Pretendard",
                        fontSize: "16px",
                        fontWeight: 500,
                        color: "rgba(12, 12, 12, 0.8)",
                      }}
                    >
                      소계
                    </span>
                    <span
                      style={{
                        fontFamily: "Pretendard",
                        fontSize: "16px",
                        fontWeight: 600,
                        color: "rgba(12, 12, 12, 0.9)",
                      }}
                    >
                      {estimateSummary.subtotal.toLocaleString()}
                    </span>
                  </div>

                  {/* 일반관리비 (6%) */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "Pretendard",
                        fontSize: "16px",
                        fontWeight: 500,
                        color: "rgba(12, 12, 12, 0.8)",
                      }}
                    >
                      일반관리비 (6%)
                    </span>
                    <span
                      style={{
                        fontFamily: "Pretendard",
                        fontSize: "16px",
                        fontWeight: 600,
                        color: "rgba(12, 12, 12, 0.9)",
                      }}
                    >
                      {estimateSummary.managementFee.toLocaleString()}
                    </span>
                  </div>

                  {/* 이윤 (15%) */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "Pretendard",
                        fontSize: "16px",
                        fontWeight: 500,
                        color: "rgba(12, 12, 12, 0.8)",
                      }}
                    >
                      이윤 (15%)
                    </span>
                    <span
                      style={{
                        fontFamily: "Pretendard",
                        fontSize: "16px",
                        fontWeight: 600,
                        color: "rgba(12, 12, 12, 0.9)",
                      }}
                    >
                      {estimateSummary.profit.toLocaleString()}
                    </span>
                  </div>

                  {/* VAT */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "16px",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "16px",
                          fontWeight: 500,
                          color: "rgba(12, 12, 12, 0.8)",
                        }}
                      >
                        VAT
                      </span>
                      <div
                        style={{
                          display: "flex",
                          gap: "12px",
                        }}
                      >
                        <label
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            cursor: "pointer",
                          }}
                        >
                          <input
                            type="radio"
                            checked={vatIncluded}
                            onChange={() => setVatIncluded(true)}
                            style={{
                              accentColor: "#008FED",
                            }}
                          />
                          <span
                            style={{
                              fontFamily: "Pretendard",
                              fontSize: "14px",
                              color: "rgba(12, 12, 12, 0.7)",
                            }}
                          >
                            포함
                          </span>
                        </label>
                        <label
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            cursor: "pointer",
                          }}
                        >
                          <input
                            type="radio"
                            checked={!vatIncluded}
                            onChange={() => setVatIncluded(false)}
                            style={{
                              accentColor: "#008FED",
                            }}
                          />
                          <span
                            style={{
                              fontFamily: "Pretendard",
                              fontSize: "14px",
                              color: "rgba(12, 12, 12, 0.7)",
                            }}
                          >
                            별도
                          </span>
                        </label>
                      </div>
                    </div>
                    <span
                      style={{
                        fontFamily: "Pretendard",
                        fontSize: "16px",
                        fontWeight: 600,
                        color: "rgba(12, 12, 12, 0.9)",
                      }}
                    >
                      {estimateSummary.vat.toLocaleString()}
                    </span>
                  </div>

                  {/* 구분선 */}
                  <div
                    style={{
                      height: "1px",
                      background: "rgba(12, 12, 12, 0.1)",
                      margin: "8px 0",
                    }}
                  />

                  {/* 총 합계 */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "Pretendard",
                        fontSize: "18px",
                        fontWeight: 600,
                        color: "#008FED",
                      }}
                    >
                      총 합계
                    </span>
                    <span
                      style={{
                        fontFamily: "Pretendard",
                        fontSize: "24px",
                        fontWeight: 700,
                        color: "#008FED",
                      }}
                      data-testid="text-total-amount"
                    >
                      {estimateSummary.total.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
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
            {/* 상단 탭 버튼 및 공종 선택 */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              {/* 좌측 탭 버튼 */}
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  style={{
                    padding: "10px 20px",
                    background: "white",
                    border: "1px solid rgba(12, 12, 12, 0.1)",
                    borderRadius: "6px",
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "#0C0C0C",
                    cursor: "pointer",
                  }}
                  data-testid="button-pyeongsu"
                >
                  평수별
                </button>
                <button
                  style={{
                    padding: "10px 20px",
                    background: "white",
                    border: "1px solid rgba(12, 12, 12, 0.1)",
                    borderRadius: "6px",
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "#0C0C0C",
                    cursor: "pointer",
                  }}
                  data-testid="button-hyeong-materials"
                >
                  형 자재
                </button>
                <button
                  style={{
                    padding: "10px 20px",
                    background: "white",
                    border: "1px solid rgba(12, 12, 12, 0.1)",
                    borderRadius: "6px",
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "#0C0C0C",
                    cursor: "pointer",
                  }}
                  data-testid="button-go-to-estimate-materials"
                >
                  견적서 이동
                </button>
              </div>

              {/* 우측 공종 선택 */}
              <div style={{ width: "200px" }}>
                <Select
                  value={selectedMaterialCategory}
                  onValueChange={setSelectedMaterialCategory}
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
                    data-testid="select-material-category-filter"
                  >
                    <SelectValue placeholder="공종 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMaterialCategories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 항목 추가 버튼 */}
            <div style={{ marginBottom: "16px" }}>
              <Button
                type="button"
                onClick={addBlankMaterialRow}
                className="hover-elevate active-elevate-2"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontFamily: "Pretendard",
                  fontSize: "15px",
                  fontWeight: 500,
                  padding: "10px 20px",
                  background: "#008FED",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: "6px",
                }}
                data-testid="button-add-material-row"
              >
                <Plus size={16} />
                항목 추가
              </Button>
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
                        minWidth: "120px",
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
                        minWidth: "120px",
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
                        minWidth: "100px",
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
                        minWidth: "70px",
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
                      기본단가
                    </th>
                    <th
                      style={{
                        padding: "12px",
                        background: "rgba(12, 12, 12, 0.02)",
                        border: "1px solid rgba(12, 12, 12, 0.08)",
                        fontWeight: 600,
                        textAlign: "center",
                        minWidth: "90px",
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
                        minWidth: "110px",
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
                        minWidth: "200px",
                      }}
                    >
                      비고
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {materialRows.map((row) => (
                    <tr key={row.id}>
                      {/* 체크박스 */}
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

                      {/* 공종 (드롭다운 또는 텍스트) */}
                      <td
                        style={{
                          padding: "8px",
                          border: "1px solid rgba(12, 12, 12, 0.08)",
                        }}
                      >
                        <div
                          style={{
                            width: "100%",
                            padding: "8px",
                            border: "1px solid rgba(12, 12, 12, 0.06)",
                            borderRadius: "4px",
                            fontFamily: "Pretendard",
                            fontSize: "14px",
                            background: "rgba(12, 12, 12, 0.02)",
                            color: "#0C0C0C",
                          }}
                          data-testid={`text-category-${row.id}`}
                        >
                          {row.category}
                        </div>
                      </td>

                      {/* 자재 (드롭다운 또는 텍스트) */}
                      <td
                        style={{
                          padding: "8px",
                          border: "1px solid rgba(12, 12, 12, 0.08)",
                        }}
                      >
                        <div
                          style={{
                            width: "100%",
                            padding: "8px",
                            border: "1px solid rgba(12, 12, 12, 0.06)",
                            borderRadius: "4px",
                            fontFamily: "Pretendard",
                            fontSize: "14px",
                            background: "rgba(12, 12, 12, 0.02)",
                            color: "#0C0C0C",
                          }}
                          data-testid={`text-materialName-${row.id}`}
                        >
                          {row.materialName}
                        </div>
                      </td>

                      {/* 규격 (읽기전용) */}
                      <td
                        style={{
                          padding: "8px",
                          border: "1px solid rgba(12, 12, 12, 0.08)",
                        }}
                      >
                        <div
                          style={{
                            width: "100%",
                            padding: "8px",
                            border: "1px solid rgba(12, 12, 12, 0.06)",
                            borderRadius: "4px",
                            fontFamily: "Pretendard",
                            fontSize: "14px",
                            background: "rgba(12, 12, 12, 0.02)",
                            color: "#0C0C0C",
                          }}
                          data-testid={`text-specification-${row.id}`}
                        >
                          {row.specification}
                        </div>
                      </td>

                      {/* 단위 (읽기전용) */}
                      <td
                        style={{
                          padding: "8px",
                          border: "1px solid rgba(12, 12, 12, 0.08)",
                        }}
                      >
                        <div
                          style={{
                            width: "100%",
                            padding: "8px",
                            border: "1px solid rgba(12, 12, 12, 0.06)",
                            borderRadius: "4px",
                            fontFamily: "Pretendard",
                            fontSize: "14px",
                            background: "rgba(12, 12, 12, 0.02)",
                            color: "#0C0C0C",
                            textAlign: "center",
                          }}
                          data-testid={`text-unit-${row.id}`}
                        >
                          {row.unit}
                        </div>
                      </td>

                      {/* 기본단가 (읽기전용) */}
                      <td
                        style={{
                          padding: "8px",
                          border: "1px solid rgba(12, 12, 12, 0.08)",
                        }}
                      >
                        <div
                          style={{
                            width: "100%",
                            padding: "8px",
                            border: "1px solid rgba(12, 12, 12, 0.06)",
                            borderRadius: "4px",
                            fontFamily: "Pretendard",
                            fontSize: "14px",
                            background: "rgba(12, 12, 12, 0.02)",
                            color: "#0C0C0C",
                            textAlign: "right",
                          }}
                          data-testid={`text-standardPrice-${row.id}`}
                        >
                          {row.standardPrice.toLocaleString()}
                        </div>
                      </td>

                      {/* 수량 (편집 가능, 파란색 테두리) */}
                      <td
                        style={{
                          padding: "8px",
                          border: "1px solid rgba(12, 12, 12, 0.08)",
                        }}
                      >
                        <input
                          type="text"
                          value={row.quantity}
                          onChange={(e) => updateMaterialRow(row.id, { quantity: e.target.value })}
                          style={{
                            width: "100%",
                            padding: "8px",
                            border: "2px solid #008FED",
                            borderRadius: "4px",
                            fontFamily: "Pretendard",
                            fontSize: "14px",
                            textAlign: "right",
                          }}
                          data-testid={`input-quantity-${row.id}`}
                        />
                      </td>

                      {/* 금액 (읽기전용) */}
                      <td
                        style={{
                          padding: "8px",
                          border: "1px solid rgba(12, 12, 12, 0.08)",
                        }}
                      >
                        <div
                          style={{
                            width: "100%",
                            padding: "8px",
                            border: "1px solid rgba(12, 12, 12, 0.06)",
                            borderRadius: "4px",
                            fontFamily: "Pretendard",
                            fontSize: "14px",
                            background: "rgba(12, 12, 12, 0.02)",
                            color: "#0C0C0C",
                            textAlign: "right",
                          }}
                          data-testid={`text-amount-${row.id}`}
                        >
                          {row.amount.toLocaleString()}
                        </div>
                      </td>

                      {/* 비고 (편집 가능, 파란색 테두리, 넓음) */}
                      <td
                        style={{
                          padding: "8px",
                          border: "1px solid rgba(12, 12, 12, 0.08)",
                        }}
                      >
                        <input
                          type="text"
                          value={row.note}
                          onChange={(e) => updateMaterialRow(row.id, { note: e.target.value })}
                          style={{
                            width: "100%",
                            padding: "8px",
                            border: "2px solid #008FED",
                            borderRadius: "4px",
                            fontFamily: "Pretendard",
                            fontSize: "14px",
                          }}
                          data-testid={`input-note-${row.id}`}
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
