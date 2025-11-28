import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Case, MasterData, LaborCost, User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Check, Search, Copy } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { FieldSurveyLayout } from "@/components/field-survey-layout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatCaseNumber } from "@/lib/utils";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LaborCostSection, type LaborCatalogItem, type LaborCostRow } from "@/components/labor-cost-section";
import { MaterialCostSection, type MaterialCatalogItem } from "@/components/material-cost-section";

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

// Import LaborCatalogItem and LaborCostRow from labor-cost-section.tsx (removed duplicates)

interface Material {
  id: number; // DB ID
  workType: string; // 공종: 방수공사, 도배공사 등
  materialName: string; // 자재명
  specification: string; // 규격
  unit: string; // 단위
  standardPrice: number; // 단가 (숫자)
  isActive: string; // "true" | "false"
  createdAt: string; // ISO timestamp string from API
  updatedAt: string; // ISO timestamp string from API
}

// 자재비 테이블 행 (새 UI 구조)
interface MaterialRow {
  id: string;
  공종: string; // 노무비에서 가져온 공종 (드롭다운)
  자재: string; // 자재명 (드롭다운)
  규격: string; // 규격 (드롭다운)
  단위: string; // 단위 (읽기전용)
  기준단가: number; // 기준단가 (읽기전용)
  수량: number; // 수량 (입력)
  금액: number; // 금액 (계산값)
  비고: string; // 비고 (입력)
  sourceLaborRowId?: string; // 노무비 행 ID 추적
}

const CATEGORIES = ["복구면적 산출표", "노무비", "자재비", "견적서"];

export default function FieldEstimate() {
  // Hydration guard: 기존 견적 복원 완료 추적 (중복 행 방지)
  const isHydratedRef = useRef(false);

  const [selectedCategory, setSelectedCategory] = useState("복구면적 산출표");
  const [rows, setRows] = useState<AreaCalculationRow[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [laborCostRows, setLaborCostRows] = useState<LaborCostRow[]>([]);
  const [selectedLaborRows, setSelectedLaborRows] = useState<Set<string>>(new Set());
  const [materialRows, setMaterialRows] = useState<MaterialRow[]>([]);
  const [selectedMaterialRows, setSelectedMaterialRows] = useState<Set<string>>(new Set());
  const [vatIncluded, setVatIncluded] = useState(true); // VAT 포함 여부
  const [estimateCase, setEstimateCase] = useState<Case | null>(null); // 견적서용 선택된 케이스
  const [caseSearchModalOpen, setCaseSearchModalOpen] = useState(false); // 케이스 검색 모달
  const [selectedCaseId, setSelectedCaseId] = useState(() => 
    localStorage.getItem('selectedFieldSurveyCaseId') || ''
  );

  // localStorage 변경 감지 (현장입력에서 케이스 선택 시)
  useEffect(() => {
    const handleStorageChange = () => {
      const newCaseId = localStorage.getItem('selectedFieldSurveyCaseId') || '';
      setSelectedCaseId(prevId => {
        if (newCaseId !== prevId) {
          return newCaseId;
        }
        return prevId;
      });
    };

    // storage event (다른 탭/창에서의 변경)
    window.addEventListener('storage', handleStorageChange);
    
    // 같은 페이지 내에서의 변경 감지 (interval)
    const intervalId = setInterval(handleStorageChange, 500);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(intervalId);
    };
  }, []); // dependency 제거 (한 번만 설정)

  // 빈 자재비 행 생성 함수
  const createBlankMaterialRow = (공종 = '', sourceLaborRowId?: string): MaterialRow => {
    return {
      id: `material-${Date.now()}-${Math.random()}`,
      공종,
      자재: '',
      규격: '',
      단위: '',
      기준단가: 0,
      수량: 1,
      금액: 0,
      비고: '',
      sourceLaborRowId,
    };
  };

  // 노무비 카탈로그 조회 (from excel_data)
  const { data: laborCatalog = [], isLoading: isLoadingLaborCatalog } = useQuery<LaborCatalogItem[]>({
    queryKey: ['/api/labor-catalog'],
  });

  // 자재비 카탈로그 조회 (from excel_data)
  const { data: materialCatalog = [], isLoading: isLoadingMaterialCatalog } = useQuery<MaterialCatalogItem[]>({
    queryKey: ['/api/materials'],
  });

  // 빈 노무비 행 생성 함수
  const createBlankLaborRow = (): LaborCostRow => {
    // 빈 행 생성 (사용자가 직접 선택하도록)
    return {
      id: `labor-${Date.now()}-${Math.random()}`,
      category: '',
      workName: '',
      detailWork: '',
      detailItem: '',
      priceStandard: '',
      unit: '',
      standardPrice: 0,
      quantity: 1,
      applicationRates: {
        ceiling: false,
        wall: false,
        floor: false,
        molding: false,
      },
      salesMarkupRate: 0,
      pricePerSqm: 0,
      damageArea: 0,
      deduction: 0,
      includeInEstimate: false,
      request: '',
      amount: 0,
    };
  };

  // 노무비 초기 첫 행 설정 (항상 기본 1행 유지)
  useEffect(() => {
    if (laborCostRows.length === 0) {
      setLaborCostRows([createBlankLaborRow()]);
    }
  }, [laborCostRows.length]);

  // 자재비 초기 빈 행 설정 (항상 기본 1행 유지)
  useEffect(() => {
    if (materialRows.length === 0) {
      setMaterialRows([createBlankMaterialRow()]);
    }
  }, [materialRows.length]);

  // 노무비 행 변화 감지 및 자재비 행 동기화
  useEffect(() => {
    // Hydration 완료 전에는 동기화 건너뛰기 (중복 행 방지)
    if (!isHydratedRef.current) {
      return;
    }

    setMaterialRows(prev => {
      // 이미 연결된 노무비 행 ID 목록
      const existingSourceIds = new Set(prev.map(row => row.sourceLaborRowId).filter(Boolean));
      
      // 자재비 행이 없는 노무비 행 찾기
      const laborRowsNeedingMaterial = laborCostRows.filter(laborRow => 
        laborRow.id && !existingSourceIds.has(laborRow.id)
      );
      
      // 기존 행 업데이트 + 새 행 추가 (한 번에 처리)
      const updatedRows = prev.map((matRow, index) => {
        // sourceLaborRowId가 있으면 해당 노무비 행과 동기화
        if (matRow.sourceLaborRowId) {
          const linkedLaborRow = laborCostRows.find(lr => lr.id === matRow.sourceLaborRowId);
          if (linkedLaborRow && linkedLaborRow.category !== matRow.공종) {
            return { ...matRow, 공종: linkedLaborRow.category };
          }
          return matRow;
        }
        
        // sourceLaborRowId가 없으면 같은 인덱스의 노무비 행과 동기화
        const correspondingLaborRow = laborCostRows[index];
        if (correspondingLaborRow && correspondingLaborRow.category !== matRow.공종) {
          return { ...matRow, 공종: correspondingLaborRow.category };
        }
        return matRow;
      });
      
      // 새로운 자재비 행 추가
      const newRows = laborRowsNeedingMaterial.map(laborRow => 
        createBlankMaterialRow(laborRow.category, laborRow.id)
      );
      
      return [...updatedRows, ...newRows];
    });
  }, [laborCostRows]);

  // selectedCaseId 변경 시 hydration guard 및 상태 초기화
  useEffect(() => {
    if (!selectedCaseId) return; // Empty caseId, skip
    
    // Hydration guard reset
    isHydratedRef.current = false;
    
    // 이전 케이스 데이터 초기화
    setRows([]);
    setLaborCostRows([]);
    setMaterialRows([]);
    setSelectedRows(new Set());
    setSelectedLaborRows(new Set());
    setSelectedMaterialRows(new Set());
    
    // Query 캐시 무효화 (새 케이스 데이터 강제 로드)
    queryClient.invalidateQueries({ queryKey: ["/api/estimates", selectedCaseId, "latest"] });
    queryClient.invalidateQueries({ queryKey: [`/api/cases/${selectedCaseId}`] });
  }, [selectedCaseId]);

  const { toast } = useToast();

  // 현재 로그인한 사용자 정보
  const { data: currentUser } = useQuery<User>({
    queryKey: ['/api/user'],
  });

  // 현재 날짜 (KST) 가져오기
  const getCurrentDate = () => {
    const formatter = new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const parts = formatter.formatToParts(new Date());
    const year = parts.find(p => p.type === 'year')?.value || '';
    const month = parts.find(p => p.type === 'month')?.value || '';
    const day = parts.find(p => p.type === 'day')?.value || '';
    return `${year}-${month}-${day}`;
  };

  // 케이스 검색
  const [caseSearchQuery, setCaseSearchQuery] = useState('');
  
  // 모든 케이스 조회 (검색용)
  const { data: allCases = [] } = useQuery<Case[]>({
    queryKey: ['/api/cases'],
    enabled: caseSearchModalOpen,
  });

  // 케이스 필터링 (검색어 기준) - 안전한 null 처리
  const filteredCases = allCases.filter(c => {
    if (!caseSearchQuery) return true;
    const query = caseSearchQuery.toLowerCase();
    const caseNumber = c.caseNumber?.toLowerCase() ?? '';
    const insuranceCompany = c.insuranceCompany?.toLowerCase() ?? '';
    const insuranceAccidentNo = c.insuranceAccidentNo?.toLowerCase() ?? '';
    const policyHolderName = c.policyHolderName?.toLowerCase() ?? '';
    const victimName = c.victimName?.toLowerCase() ?? '';
    
    return (
      caseNumber.includes(query) ||
      insuranceCompany.includes(query) ||
      insuranceAccidentNo.includes(query) ||
      policyHolderName.includes(query) ||
      victimName.includes(query)
    );
  });

  // 케이스 선택 핸들러
  const handleCaseSelect = (caseId: string) => {
    setSelectedCaseId(caseId);
    localStorage.setItem('selectedFieldSurveyCaseId', caseId);
    
    // 선택한 케이스를 estimateCase로 직접 설정 (고객정보 즉시 업데이트)
    const selected = allCases?.find((c: Case) => c.id === caseId);
    if (selected) {
      setEstimateCase(selected);
    }
    
    setCaseSearchModalOpen(false);
    setCaseSearchQuery("");
    toast({
      title: "케이스가 선택되었습니다",
      description: "선택한 케이스의 견적서를 작성할 수 있습니다.",
    });
  };

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

  // Legacy labor catalog helpers and updateLaborRow removed - replaced by LaborCostSection

  // 노무비 행 추가
  const addLaborRow = () => {
    const newLaborRow = createBlankLaborRow();
    setLaborCostRows(prev => [...prev, newLaborRow]);
  };

  // 선택된 노무비 행 삭제
  const deleteSelectedLaborRows = () => {
    if (selectedLaborRows.size === 0) return;
    setLaborCostRows(prev => prev.filter(row => !selectedLaborRows.has(row.id)));
    setSelectedLaborRows(new Set());
  };

  // 자재비 행 추가
  const addMaterialRow = () => {
    setMaterialRows(prev => [...prev, createBlankMaterialRow()]);
  };

  // 선택된 자재비 행 삭제
  const deleteSelectedMaterialRows = () => {
    if (selectedMaterialRows.size === 0) return;
    // 삭제된 행과 연결된 노무비 행 정보 제거
    const deletedSourceIds = new Set(
      materialRows
        .filter(row => selectedMaterialRows.has(row.id))
        .map(row => row.sourceLaborRowId)
        .filter(Boolean)
    );
    setMaterialRows(prev => prev.filter(row => !selectedMaterialRows.has(row.id)));
    setSelectedMaterialRows(new Set());
  };

  // 자재비 행 전체 선택/해제
  const toggleSelectAllMaterialRows = () => {
    if (selectedMaterialRows.size === materialRows.length) {
      setSelectedMaterialRows(new Set());
    } else {
      setSelectedMaterialRows(new Set(materialRows.map(row => row.id)));
    }
  };

  // 자재비 행 개별 선택
  const toggleSelectMaterialRow = (rowId: string) => {
    setSelectedMaterialRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rowId)) {
        newSet.delete(rowId);
      } else {
        newSet.add(rowId);
      }
      return newSet;
    });
  };

  // 노무비 공종 목록 (자재비에서 사용)
  const laborCategories = useMemo(() => {
    if (!laborCatalog.length) return [];
    const unique = new Set(laborCatalog.map(item => item.공종));
    return Array.from(unique).sort();
  }, [laborCatalog]);

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
    queryKey: [`/api/cases/${selectedCaseId}`],
    enabled: !!selectedCaseId,
  });

  // 최신 견적 가져오기
  const { data: latestEstimate, isLoading: isLoadingEstimate } = useQuery<{ estimate: any; rows: any[] }>({
    queryKey: ["/api/estimates", selectedCaseId, "latest"],
    enabled: !!selectedCaseId,
  });

  // 관련 케이스 견적서 확인 (같은 사고번호의 다른 케이스에 견적서가 있는지)
  const { data: relatedEstimateInfo } = useQuery<{
    hasRelatedEstimate: boolean;
    sourceCaseId?: string;
    sourceCaseNumber?: string;
  }>({
    queryKey: ["/api/cases", selectedCaseId, "related-estimate"],
    enabled: !!selectedCaseId && !latestEstimate?.estimate && !isLoadingEstimate,
  });

  // 견적서 복제 mutation
  const cloneEstimateMutation = useMutation({
    mutationFn: async (sourceCaseId: string) => {
      const response = await apiRequest("POST", `/api/cases/${selectedCaseId}/clone-estimate`, {
        sourceCaseId,
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "견적서 복제 실패");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/estimates", selectedCaseId, "latest"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cases", selectedCaseId, "related-estimate"] });
      toast({
        title: "견적서 복제 완료",
        description: "관련 케이스의 견적서가 복제되었습니다.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "견적서 복제 실패",
        description: error.message || "알 수 없는 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // 현재 작성중인 건 정보를 견적서에 자동 설정
  // selectedCase가 변경되면 estimateCase도 항상 업데이트 (고객정보 즉시 반영)
  useEffect(() => {
    if (selectedCase) {
      setEstimateCase(selectedCase);
    }
  }, [selectedCase]);

  // 초기 빈 행 생성 또는 견적 불러오기
  useEffect(() => {
    // Query가 resolve될 때까지 대기 (undefined 상태 skip)
    if (latestEstimate === undefined) return;
    
    // Hydration이 이미 완료되었거나, 케이스가 선택되지 않았으면 skip
    if (isHydratedRef.current || !selectedCaseId) return;
    
    // 마스터 데이터가 로드될 때까지 대기
    if (masterDataList.length === 0) return;
    
    if (latestEstimate) {
      // 복구면적 산출표 데이터 불러오기
      if (latestEstimate.rows && latestEstimate.rows.length > 0) {
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
      } else {
        // 복구면적 데이터가 없으면 빈 행 생성
        addRow();
      }
      
      // 노무비 데이터 불러오기
      if (latestEstimate.estimate?.laborCostData && Array.isArray(latestEstimate.estimate.laborCostData)) {
        const loadedLaborRows = latestEstimate.estimate.laborCostData.map((row: any) => {
          const { rowIndex, ...rest } = row; // rowIndex 제거
          return {
            id: `labor-${Date.now()}-${Math.random()}`,
            ...rest,
          };
        });
        setLaborCostRows(loadedLaborRows);
        
        // 자재비 데이터 불러오기 (노무비 ID 매핑 후)
        // materialCostData가 객체(새 형식: {rows, vatIncluded}) 또는 배열(기존 형식)일 수 있음
        const materialData = latestEstimate.estimate?.materialCostData;
        const materialRowsData = Array.isArray(materialData) 
          ? materialData 
          : (materialData?.rows || []);
        
        if (materialRowsData.length > 0) {
          const loadedMaterialRows = materialRowsData.map((row: any) => {
            const { sourceLaborRowIndex, ...rest } = row; // sourceLaborRowIndex 제거
            
            // sourceLaborRowIndex를 사용하여 새로운 laborRow의 ID로 매핑
            const sourceLaborRowId = 
              typeof sourceLaborRowIndex === 'number' && sourceLaborRowIndex >= 0 
                ? loadedLaborRows[sourceLaborRowIndex]?.id 
                : undefined;
            
            return {
              id: `material-${Date.now()}-${Math.random()}`,
              ...rest,
              sourceLaborRowId,
            };
          });
          setMaterialRows(loadedMaterialRows);
        }

        // VAT 포함/별도 옵션 복원 (새 형식에서는 materialCostData.vatIncluded에 저장)
        if (materialData?.vatIncluded !== undefined) {
          setVatIncluded(materialData.vatIncluded);
        }
      } else if (latestEstimate.estimate?.materialCostData) {
        // 노무비 데이터는 없지만 자재비 데이터만 있는 경우
        const materialData = latestEstimate.estimate.materialCostData;
        const materialRowsData = Array.isArray(materialData) 
          ? materialData 
          : (materialData?.rows || []);
        
        if (materialRowsData.length > 0) {
          const loadedMaterialRows = materialRowsData.map((row: any) => {
            const { sourceLaborRowIndex, ...rest } = row;
            return {
              id: `material-${Date.now()}-${Math.random()}`,
              ...rest,
              sourceLaborRowId: undefined,
            };
          });
          setMaterialRows(loadedMaterialRows);
        }

        // VAT 포함/별도 옵션 복원
        if (materialData?.vatIncluded !== undefined) {
          setVatIncluded(materialData.vatIncluded);
        }
      }

      // Hydration 완료 표시 (노무비-자재비 동기화 활성화)
      isHydratedRef.current = true;
    } else {
      // 견적 데이터가 아예 없으면 빈 행만 생성
      addRow();
      isHydratedRef.current = true;
    }
  }, [latestEstimate, masterDataList, selectedCaseId]);

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
    // 현재 행의 인덱스 찾기 (노무비/자재비 연동용)
    const currentRowIndex = rows.findIndex(r => r.id === rowId);
    
    setRows(prev => prev.map(row => {
      if (row.id === rowId) {
        const updated = { ...row, [field]: value };
        
        // 가로/세로 변경 시 면적 자동 계산
        if (field === 'damageWidth' || field === 'damageHeight') {
          const width = parseFloat(field === 'damageWidth' ? value : row.damageWidth) || 0;
          const height = parseFloat(field === 'damageHeight' ? value : row.damageHeight) || 0;
          // mm -> m 변환하여 m² 계산 (1000mm = 1m)
          const widthM = width / 1000;
          const heightM = height / 1000;
          const area = (widthM * heightM).toFixed(2);
          updated.damageArea = area;
        }
        
        if (field === 'repairWidth' || field === 'repairHeight') {
          const width = parseFloat(field === 'repairWidth' ? value : row.repairWidth) || 0;
          const height = parseFloat(field === 'repairHeight' ? value : row.repairHeight) || 0;
          // mm -> m 변환하여 m² 계산 (1000mm = 1m)
          const widthM = width / 1000;
          const heightM = height / 1000;
          const area = (widthM * heightM).toFixed(2);
          updated.repairArea = area;
          
          // 복구면적이 변경되면 노무비의 피해면적과 자재비의 수량에 자동 연동
          // 복구면적산출표 N행 → 노무비 N행, 자재비 N행으로 연동
          const repairAreaNum = parseFloat(area) || 0;
          
          // 노무비 연동: 같은 인덱스 행의 damageArea 업데이트
          if (currentRowIndex >= 0) {
            setLaborCostRows(prevLabor => {
              // 노무비 행이 부족하면 빈 행 추가
              const newLabor = [...prevLabor];
              while (newLabor.length <= currentRowIndex) {
                newLabor.push(createBlankLaborRow());
              }
              // 같은 인덱스 행에 복구면적 값 자동 입력
              newLabor[currentRowIndex] = { ...newLabor[currentRowIndex], damageArea: repairAreaNum };
              return newLabor;
            });
            
            // 자재비 연동: 같은 인덱스 행의 수량 업데이트
            setMaterialRows(prevMaterial => {
              // 자재비 행이 부족하면 빈 행 추가
              const newMaterial = [...prevMaterial];
              while (newMaterial.length <= currentRowIndex) {
                newMaterial.push(createBlankMaterialRow());
              }
              // 같은 인덱스 행에 복구면적 값을 수량으로 자동 입력
              const currentRow = newMaterial[currentRowIndex];
              const newAmount = repairAreaNum * (currentRow.기준단가 || 0);
              newMaterial[currentRowIndex] = { ...currentRow, 수량: repairAreaNum, 금액: newAmount };
              return newMaterial;
            });
          }
        }
        
        return updated;
      }
      return row;
    }));
  };

  // 총 비용 계산 (견적서 탭용)
  const estimateSummary = useMemo(() => {
    // 노무비 총합 - 경비 여부에 따라 분리
    // includeInEstimate === true → 경비가 아닌 항목 (관리비/이윤에 포함)
    // includeInEstimate === false → 경비 항목 (관리비/이윤에서 제외)
    const laborTotalNonExpense = laborCostRows.reduce((sum, row) => {
      if (row.includeInEstimate) {
        return sum + (row.amount || 0);
      }
      return sum;
    }, 0);

    const laborTotalExpense = laborCostRows.reduce((sum, row) => {
      if (!row.includeInEstimate) {
        return sum + (row.amount || 0);
      }
      return sum;
    }, 0);

    // 자재비 총합 (금액 필드 합계)
    const materialTotal = materialRows.reduce((sum, row) => {
      return sum + (row.금액 || 0);
    }, 0);

    // 소계 (전체)
    const subtotal = laborTotalNonExpense + laborTotalExpense + materialTotal;

    // 일반관리비와 이윤 계산 대상 (경비가 아닌 항목 + 자재비)
    const baseForFees = laborTotalNonExpense + materialTotal;

    // 일반관리비 (6%) - 경비 제외 항목에만 적용
    const managementFee = Math.round(baseForFees * 0.06);

    // 이윤 (15%) - 경비 제외 항목에만 적용
    const profit = Math.round(baseForFees * 0.15);

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

    const selectedMaterial = materialsData.find(m => m.id === Number(selectedMaterialSpec));

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
      공종: selectedMaterialName, // 선택된 공종 사용
      자재: selectedMaterial.materialName,
      규격: selectedMaterial.specification,
      단위: selectedMaterial.unit,
      기준단가: selectedMaterial.standardPrice,
      수량: 1,
      금액: selectedMaterial.standardPrice,
      비고: "",
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
        
        // 수량이 변경되면 금액 재계산
        if (updates.수량 !== undefined) {
          updatedRow.금액 = updatedRow.수량 * updatedRow.기준단가;
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
  
  // 노무비 테이블 리셋
  const resetLaborTable = () => {
    if (laborCatalog.length === 0) {
      toast({
        title: "잠시만 기다려주세요",
        description: "노무비 데이터를 로딩 중입니다.",
        variant: "destructive",
      });
      return;
    }
    if (confirm("노무비 입력 내용을 모두 초기화하시겠습니까?")) {
      setLaborCostRows([createBlankLaborRow()]);
      setSelectedLaborRows(new Set());
    }
  };

  // 저장 mutation (복구면적 산출표 + 노무비 + 자재비 통합 저장)
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

      // 노무비 데이터 (id 제외, rowIndex 추가)
      const laborCostData = laborCostRows.map(({ id, ...rest }, index) => ({
        ...rest,
        rowIndex: index,
      }));

      // 자재비 데이터 (id 제외, sourceLaborRowIndex 추가)
      const materialCostData = materialRows.map(({ id, sourceLaborRowId, ...rest }) => {
        // sourceLaborRowId를 인덱스로 변환
        const laborIndex = laborCostRows.findIndex(lr => lr.id === sourceLaborRowId);
        return {
          ...rest,
          sourceLaborRowIndex: laborIndex >= 0 ? laborIndex : null,
        };
      });

      return await apiRequest("POST", `/api/estimates/${selectedCaseId}`, { 
        rows: apiRows,
        laborCostData,
        materialCostData,
        totalAmount: estimateSummary.total, // 견적 총액 전송
        vatIncluded, // VAT 포함/별도 옵션
      });
    },
    onSuccess: () => {
      toast({
        title: "저장 완료",
        description: "견적이 성공적으로 저장되었습니다.",
      });
      // 견적 목록 및 최신 견적 갱신
      queryClient.invalidateQueries({ queryKey: ["/api/estimates", selectedCaseId] });
      queryClient.invalidateQueries({ queryKey: ["/api/estimates", selectedCaseId, "latest"] });
      // 케이스 목록 갱신 (견적금액이 업데이트되었으므로)
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      // 보고서 데이터 갱신 (견적서 탭에서 실시간 반영)
      queryClient.invalidateQueries({ queryKey: ["/api/field-surveys", selectedCaseId, "report"] });
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
            className="flex items-center justify-between mb-2"
            style={{
              fontFamily: "Pretendard",
              fontSize: "14px",
              fontWeight: 400,
              letterSpacing: "-0.02em",
              color: "rgba(12, 12, 12, 0.5)",
            }}
          >
            <span>작성중인 건</span>
            <button
              type="button"
              onClick={() => setCaseSearchModalOpen(true)}
              className="px-3 py-1.5 rounded-lg hover-elevate active-elevate-2"
              style={{
                fontFamily: "Pretendard",
                fontSize: "13px",
                fontWeight: 500,
                letterSpacing: "-0.02em",
                color: "#008FED",
                background: "rgba(0, 143, 237, 0.08)",
                border: "1px solid rgba(0, 143, 237, 0.2)",
              }}
              data-testid="button-select-other-case"
            >
              다른 건 선택
            </button>
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
              <span>접수번호 {formatCaseNumber(selectedCase.caseNumber)}</span>
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
                                {cat}
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
                                {loc}
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
                                {work}
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

            {/* 작성자 정보 & 고객 정보 섹션 */}
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                gap: "20px",
              }}
            >
              {/* 작성자 정보 */}
              <div
                style={{
                  flex: 1,
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
                      color: "#0C0C0C",
                    }}
                  >
                    {currentUser?.name || "-"}
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
                      color: "#0C0C0C",
                    }}
                  >
                    {currentUser?.company || "-"}
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
                      color: "#0C0C0C",
                    }}
                  >
                    {currentUser?.phone || "-"}
                  </div>
                </div>
              </div>

              {/* 고객 정보 */}
              <div
                style={{
                  flex: 1,
                  background: "rgba(12, 12, 12, 0.04)",
                  borderRadius: "12px",
                  padding: "24px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                  <h3
                    style={{
                      fontFamily: "Pretendard",
                      fontWeight: 500,
                      fontSize: "18px",
                      lineHeight: "128%",
                      letterSpacing: "-0.02em",
                      color: "#0C0C0C",
                      margin: 0,
                    }}
                  >
                    고객 정보
                  </h3>
                  <button
                    onClick={() => setCaseSearchModalOpen(true)}
                    className="hover-elevate active-elevate-2"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "8px 16px",
                      background: "#008FED",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      fontFamily: "Pretendard",
                      fontWeight: 500,
                      fontSize: "14px",
                      cursor: "pointer",
                    }}
                    data-testid="button-search-case"
                  >
                    <Search className="w-4 h-4" />
                    케이스 검색
                  </button>
                </div>
                
                {/* 접수번호 */}
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
                    접수번호
                  </label>
                  <div
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
                    data-testid="text-case-number"
                  >
                    {formatCaseNumber(estimateCase?.caseNumber) || "-"}
                  </div>
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
                  <div
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
                    data-testid="text-insured-name"
                  >
                    {estimateCase?.insuredName || "-"}
                  </div>
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
                  <div
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
                    data-testid="text-address"
                  >
                    {estimateCase?.insuredAddress || "-"}
                  </div>
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
                    {getCurrentDate()}
                  </span>
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    onClick={addRow}
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
                    행 추가
                  </button>
                  <button
                    onClick={deleteSelectedRows}
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
                            <input
                              type="checkbox"
                              checked={selectedRows.has(row.id)}
                              onChange={() => toggleRowSelection(row.id)}
                              data-testid={`checkbox-area-row-${index}`}
                            />
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

            {/* 노무비 섹션 - 노무비 탭과 동일 */}
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
                    {getCurrentDate()}
                  </span>
                </div>
              </div>
              
              {/* 노무비 테이블 - 노무비 탭과 동일한 LaborCostSection 사용 */}
              <LaborCostSection
                rows={laborCostRows}
                onRowsChange={setLaborCostRows}
                catalog={laborCatalog}
                selectedRows={selectedLaborRows}
                onSelectRow={toggleLaborRow}
                onSelectAll={() => {
                  if (selectedLaborRows.size === laborCostRows.length) {
                    setSelectedLaborRows(new Set());
                  } else {
                    setSelectedLaborRows(new Set(laborCostRows.map(r => r.id)));
                  }
                }}
                isLoading={isLoadingLaborCatalog}
              />
            </div>

            {/* 자재비 섹션 - 자재비 탭과 동일 */}
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
                    {getCurrentDate()}
                  </span>
                </div>
              </div>
              
              {/* 자재비 테이블 - 자재비 탭과 동일한 MaterialCostSection 사용 */}
              <MaterialCostSection
                rows={materialRows}
                onRowsChange={setMaterialRows}
                catalog={materialCatalog}
                laborCategories={laborCategories}
                selectedRows={selectedMaterialRows}
                onSelectRow={toggleSelectMaterialRow}
                onSelectAll={toggleSelectAllMaterialRows}
                isLoading={isLoadingMaterialCatalog}
              />
            </div>

            {/* 합계 섹션 */}
            <div
              style={{
                marginTop: "40px",
                background: "#F7FBFF",
                borderRadius: "12px",
                padding: "24px 32px",
              }}
            >
              {/* 소계 */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "16px",
                }}
              >
                <span
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "16px",
                    fontWeight: 500,
                    color: "#0C0C0C",
                  }}
                >
                  소계
                </span>
                <span
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "16px",
                    fontWeight: 600,
                    color: "#0C0C0C",
                  }}
                  data-testid="text-subtotal"
                >
                  {estimateSummary.subtotal.toLocaleString()}원
                </span>
              </div>

              {/* 일반관리비 (6%) */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "16px",
                }}
              >
                <span
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "16px",
                    fontWeight: 500,
                    color: "#0C0C0C",
                  }}
                >
                  일반관리비 (6%)
                </span>
                <span
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "16px",
                    fontWeight: 600,
                    color: "#0C0C0C",
                  }}
                  data-testid="text-managementFee"
                >
                  {estimateSummary.managementFee.toLocaleString()}원
                </span>
              </div>

              {/* 이윤 (15%) */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "16px",
                }}
              >
                <span
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "16px",
                    fontWeight: 500,
                    color: "#0C0C0C",
                  }}
                >
                  이윤 (15%)
                </span>
                <span
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "16px",
                    fontWeight: 600,
                    color: "#0C0C0C",
                  }}
                  data-testid="text-profit"
                >
                  {estimateSummary.profit.toLocaleString()}원
                </span>
              </div>

              {/* VAT */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "16px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "16px",
                      fontWeight: 500,
                      color: "#0C0C0C",
                    }}
                  >
                    VAT (10%)
                  </span>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="radio"
                        name="vat"
                        checked={vatIncluded}
                        onChange={() => setVatIncluded(true)}
                        style={{ cursor: "pointer" }}
                        data-testid="radio-vat-included"
                      />
                      <span
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          fontWeight: 500,
                          color: vatIncluded ? "#008FED" : "#686A6E",
                        }}
                      >
                        포함
                      </span>
                    </label>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="radio"
                        name="vat"
                        checked={!vatIncluded}
                        onChange={() => setVatIncluded(false)}
                        style={{ cursor: "pointer" }}
                        data-testid="radio-vat-excluded"
                      />
                      <span
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          fontWeight: 500,
                          color: !vatIncluded ? "#008FED" : "#686A6E",
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
                    color: "#0C0C0C",
                  }}
                  data-testid="text-vat"
                >
                  {estimateSummary.vat.toLocaleString()}원
                </span>
              </div>

              {/* 구분선 */}
              <div
                style={{
                  height: "1px",
                  background: "rgba(12, 12, 12, 0.1)",
                  margin: "20px 0",
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
                    color: "#0C0C0C",
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
                  data-testid="text-total"
                >
                  {estimateSummary.total.toLocaleString()}원
                </span>
              </div>
            </div>

            {/* 저장 버튼 */}
            <div
              style={{
                marginTop: "24px",
                display: "flex",
                justifyContent: "flex-end",
                gap: "12px",
              }}
            >
              {/* 관련 케이스에서 견적서 복제 버튼 */}
              {relatedEstimateInfo?.hasRelatedEstimate && !latestEstimate?.estimate && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      disabled={cloneEstimateMutation.isPending}
                      style={{
                        padding: "12px 32px",
                        background: cloneEstimateMutation.isPending ? "#ccc" : "#F59E0B",
                        border: "none",
                        borderRadius: "8px",
                        fontFamily: "Pretendard",
                        fontSize: "16px",
                        fontWeight: 600,
                        color: "white",
                        cursor: cloneEstimateMutation.isPending ? "not-allowed" : "pointer",
                        boxShadow: "0px 2px 8px rgba(245, 158, 11, 0.3)",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                      data-testid="button-clone-estimate"
                    >
                      <Copy className="w-4 h-4" />
                      {cloneEstimateMutation.isPending ? "복제 중..." : "관련 견적서 가져오기"}
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>관련 케이스에서 견적서 복제</AlertDialogTitle>
                      <AlertDialogDescription>
                        <span className="font-semibold">{formatCaseNumber(relatedEstimateInfo.sourceCaseNumber)}</span> 케이스의 견적서를 복제하시겠습니까?
                        <br />
                        복제 후에도 개별적으로 수정할 수 있습니다.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>취소</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          if (relatedEstimateInfo.sourceCaseId) {
                            cloneEstimateMutation.mutate(relatedEstimateInfo.sourceCaseId);
                          }
                        }}
                        data-testid="button-confirm-clone-estimate"
                      >
                        복제하기
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                style={{
                  padding: "12px 32px",
                  background: saveMutation.isPending ? "#ccc" : "#008FED",
                  border: "none",
                  borderRadius: "8px",
                  fontFamily: "Pretendard",
                  fontSize: "16px",
                  fontWeight: 600,
                  color: "white",
                  cursor: saveMutation.isPending ? "not-allowed" : "pointer",
                  boxShadow: "0px 2px 8px rgba(0, 143, 237, 0.3)",
                }}
                data-testid="button-save-estimate"
              >
                {saveMutation.isPending ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        )}

        {/* 노무비 컨텐츠 - NEW */}
        {selectedCategory === "노무비" && (
          <div>
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
                    {getCurrentDate()}
                  </span>
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <Button
                    onClick={addLaborRow}
                    variant="outline"
                    size="sm"
                    disabled={isLoadingLaborCatalog}
                    data-testid="button-add-labor-row"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    행 추가
                  </Button>
                  <Button
                    onClick={deleteSelectedLaborRows}
                    variant="outline"
                    size="sm"
                    disabled={selectedLaborRows.size === 0}
                    data-testid="button-delete-labor-rows"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    행 삭제
                  </Button>
                </div>
              </div>
              
              {/* 노무비 테이블 컴포넌트 - 새로운 프롬프트 기반 UI */}
              <LaborCostSection
                rows={laborCostRows}
                onRowsChange={setLaborCostRows}
                catalog={laborCatalog}
                selectedRows={selectedLaborRows}
                onSelectRow={toggleLaborRow}
                onSelectAll={() => {
                  if (selectedLaborRows.size === laborCostRows.length) {
                    setSelectedLaborRows(new Set());
                  } else {
                    setSelectedLaborRows(new Set(laborCostRows.map(r => r.id)));
                  }
                }}
                isLoading={isLoadingLaborCatalog}
              />
            </div>

            {/* 기존 노무비 테이블 (임시 주석 처리) */}
            {false && laborCostRows.length > 0 && (
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
                            <Select value={row.category || undefined} onValueChange={(value) => {
                              setLaborCostRows(prev => prev.map(r => {
                                if (r.id === row.id) {
                                  // 누수탐지비용 선택 시 초기화
                                  if (value === "누수탐지비용") {
                                    return {
                                      ...r,
                                      category: value,
                                      workName: "종합검사",
                                      detailWork: "",
                                      standardPrice: 0,
                                      unit: "회"
                                    };
                                  }
                                  return { ...r, category: value };
                                }
                                return r;
                              }));
                            }}>
                              <SelectTrigger 
                                className="h-9 border-0" 
                                style={{ fontFamily: "Pretendard", fontSize: "14px" }}
                                data-testid={`select-category-${index}`}
                              >
                                <SelectValue placeholder="공종 선택" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="가구공사">가구공사</SelectItem>
                                <SelectItem value="도배공사">도배공사</SelectItem>
                                <SelectItem value="미장공사">미장공사</SelectItem>
                                <SelectItem value="수장공사">수장공사</SelectItem>
                                <SelectItem value="누수탐지비용">누수탐지비용</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          
                          {/* 공사명 - Read-only */}
                          <td style={{ padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", color: "rgba(12, 12, 12, 0.8)" }}>
                            {row.workName}
                          </td>
                          
                          {/* 세부공사 - 누수탐지비용일 때만 Select, 나머지는 Read-only */}
                          <td style={{ padding: row.category === "누수탐지비용" ? "0 8px" : "0 12px" }}>
                            {row.category === "누수탐지비용" ? (
                              <Select 
                                value={row.detailWork || undefined} 
                                onValueChange={(value) => {
                                  setLaborCostRows(prev => prev.map(r => {
                                    if (r.id === row.id) {
                                      // 세부공사에 따라 기준가 설정
                                      let price = 0;
                                      if (value === "1회") price = 300000;
                                      else if (value === "2회") price = 400000;
                                      else if (value === "3회 이상") price = 500000;
                                      
                                      return {
                                        ...r,
                                        detailWork: value,
                                        standardPrice: price
                                      };
                                    }
                                    return r;
                                  }));
                                }}
                              >
                                <SelectTrigger 
                                  className="h-9 border-0" 
                                  style={{ fontFamily: "Pretendard", fontSize: "14px" }}
                                  data-testid={`select-detail-work-${index}`}
                                >
                                  <SelectValue placeholder="선택하세요" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="1회">1회</SelectItem>
                                  <SelectItem value="2회">2회</SelectItem>
                                  <SelectItem value="3회 이상">3회 이상</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <span style={{ fontFamily: "Pretendard", fontSize: "14px", color: "rgba(12, 12, 12, 0.8)" }}>
                                {row.detailWork}
                              </span>
                            )}
                          </td>
                          
                          {/* 세부항목 - Read-only */}
                          <td style={{ padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", color: "rgba(12, 12, 12, 0.6)" }}>
                            {row.detailItem || "-"}
                          </td>
                          
                          {/* 단가 기준 - Select */}
                          <td style={{ padding: "0 8px" }}>
                            <Select value={row.priceStandard || undefined} onValueChange={(value) => {
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
                          
                          {/* 단위 - Read-only */}
                          <td style={{ padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", color: "rgba(12, 12, 12, 0.8)" }} data-testid={`text-unit-${index}`}>
                            {row.unit || "-"}
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
                                setLaborCostRows(prev => prev.map(r => r.id === row.id ? { ...r, quantity: Number(e.target.value) || 0 } : r));
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
                                  setLaborCostRows(prev => prev.map(r => r.id === row.id ? { ...r, salesMarkupRate: Number(e.target.value) || 0 } : r));
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
                                setLaborCostRows(prev => prev.map(r => r.id === row.id ? { ...r, pricePerSqm: Number(e.target.value) || 0 } : r));
                              }}
                              className="h-9 border-0 bg-transparent text-right"
                              style={{ fontFamily: "Pretendard", fontSize: "14px" }}
                              data-testid={`input-price-sqm-${index}`}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </div>
        )}

        {/* 자재비 섹션 */}
        {selectedCategory === "자재비" && (
          <div style={{ marginTop: "40px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "12px",
              }}
            >
              <span
                style={{
                  fontFamily: "Pretendard",
                  fontWeight: 600,
                  fontSize: "18px",
                  letterSpacing: "-0.02em",
                  color: "#0C0C0C",
                }}
              >
                자재비
              </span>
              <div style={{ display: "flex", gap: "8px" }}>
                <Button
                  onClick={addMaterialRow}
                  variant="outline"
                  size="sm"
                  data-testid="button-add-material-row"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  행 추가
                </Button>
                <Button
                  onClick={deleteSelectedMaterialRows}
                  variant="outline"
                  size="sm"
                  disabled={selectedMaterialRows.size === 0}
                  data-testid="button-delete-material-rows"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  선택 삭제
                </Button>
              </div>
            </div>

            <MaterialCostSection
              rows={materialRows}
              onRowsChange={setMaterialRows}
              catalog={materialCatalog}
              laborCategories={laborCategories}
              selectedRows={selectedMaterialRows}
              onSelectRow={toggleSelectMaterialRow}
              onSelectAll={toggleSelectAllMaterialRows}
              isLoading={isLoadingMaterialCatalog}
            />

            {/* 하단 버튼 */}
            <div
              className="flex justify-end items-center mt-8"
              style={{ padding: "20px 0" }}
            >
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
                data-testid="button-save-material"
              >
                저장
              </button>
            </div>
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

        {/* 하단 버튼 - 자재비 */}
      </div>

      {/* 케이스 선택 모달 */}
      <Dialog open={caseSearchModalOpen} onOpenChange={setCaseSearchModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle
              style={{
                fontFamily: "Pretendard",
                fontSize: "20px",
                fontWeight: 600,
                letterSpacing: "-0.02em",
                color: "#0C0C0C",
              }}
            >
              케이스 선택
            </DialogTitle>
          </DialogHeader>

          {/* 검색 입력 */}
          <div className="mb-4">
            <Input
              placeholder="접수번호, 보험사, 사고번호, 계약자명, 피해자명 검색..."
              value={caseSearchQuery}
              onChange={(e) => setCaseSearchQuery(e.target.value)}
              className="w-full"
              style={{
                fontFamily: "Pretendard",
                fontSize: "14px",
              }}
              data-testid="input-case-search"
            />
          </div>

          {/* 케이스 목록 */}
          <div className="space-y-2">
            {filteredCases.map((caseItem) => (
              <div
                key={caseItem.id}
                onClick={() => handleCaseSelect(caseItem.id!)}
                className={`p-4 rounded-lg cursor-pointer transition-all hover-elevate ${
                  selectedCaseId === caseItem.id ? 'ring-2 ring-blue-500' : ''
                }`}
                style={{
                  background: selectedCaseId === caseItem.id ? "rgba(0, 143, 237, 0.05)" : "rgba(12, 12, 12, 0.02)",
                  border: "1px solid rgba(12, 12, 12, 0.08)",
                }}
                data-testid={`case-item-${caseItem.id}`}
              >
                <div className="flex items-center gap-3">
                  {/* 선택 표시 */}
                  {selectedCaseId === caseItem.id && (
                    <div className="flex-shrink-0">
                      <Check className="w-5 h-5" style={{ color: "#008FED" }} />
                    </div>
                  )}
                  
                  <div className="flex-1">
                    {/* 첫 번째 줄: 보험사 + 사고번호 */}
                    <div
                      className="mb-1"
                      style={{
                        fontFamily: "Pretendard",
                        fontSize: "15px",
                        fontWeight: 600,
                        letterSpacing: "-0.02em",
                        color: "#0C0C0C",
                      }}
                    >
                      {caseItem.insuranceCompany || "보험사 미정"} {caseItem.insuranceAccidentNo || ""}
                    </div>

                    {/* 두 번째 줄: 접수번호, 계약자, 피해자, 상태 */}
                    <div
                      className="flex items-center gap-3 flex-wrap"
                      style={{
                        fontFamily: "Pretendard",
                        fontSize: "13px",
                        fontWeight: 400,
                        letterSpacing: "-0.02em",
                        color: "rgba(12, 12, 12, 0.6)",
                      }}
                    >
                      <span>접수번호: {formatCaseNumber(caseItem.caseNumber)}</span>
                      <span>계약자: {caseItem.policyHolderName || caseItem.clientName || "미정"}</span>
                      <span>피해자: {caseItem.victimName || "미정"}</span>
                      <span className="px-2 py-0.5 rounded" style={{
                        background: "rgba(0, 143, 237, 0.1)",
                        color: "#008FED",
                        fontSize: "12px",
                      }}>
                        {caseItem.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {filteredCases.length === 0 && (
              <div
                className="text-center py-12"
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "14px",
                  fontWeight: 400,
                  color: "rgba(12, 12, 12, 0.5)",
                }}
              >
                검색 결과가 없습니다
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </FieldSurveyLayout>
  );
}
