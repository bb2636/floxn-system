import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Case, MasterData, LaborCost, User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Check, Search, Copy, GripVertical } from "lucide-react";
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
import { MaterialCostSection, type MaterialCatalogItem, type MaterialRow } from "@/components/material-cost-section";

interface AreaCalculationRow {
  id: string;
  category: string; // 장소: 주방, 화장실, 방안, 거실상
  location: string; // 위치
  workType: string; // 공종: 방수공사, 도배공사 등
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

// 일위대가 카탈로그 아이템 인터페이스
interface IlwidaegaCatalogItem {
  공종: string;
  공사명: string;
  노임항목: string;
  기준작업량: number | null;  // D
  노임단가: number | null;    // E (노임단가(인당))
  일위대가: number | null;    // E/D (참고용)
}

// 자재비 카탈로그 아이템 (공사명 기준 조회용)
interface MaterialByWorknameCatalogItem {
  공종: string; // 공종: 원인공사, 목공사, 수장공사 등
  공사명: string; // 공사명: 방수, 합판, 도배 등
  자재항목: string; // 자재비DB의 자재항목 컬럼
  규격?: string; // 규격 (선택 필드)
  단위: string;
  금액: number | string | null;
}

// MaterialRow는 "@/components/material-cost-section"에서 import

// ===== 노임비 계산 공식 (알파벳 정의) =====
// D = 기준작업량 (일위대가 DB)
// C = 복구면적 (노무비 계산값)
// E = 노임단가 (일위대가 DB)
// F = C/D 비율에 따른 적용단가 (E 기준 할인율 적용)
// H = C≥D: (C-D)×(E÷D) / C<D: F
// I = F + H (최종 노임비)
// 적용단가 = I / C
// 합계 = I

function calculateF_FieldEstimate(C: number, D: number, E: number): number {
  if (D <= 0 || E <= 0) return 0;
  
  const ratio = C / D;
  
  if (ratio >= 0.85) return E;
  if (ratio >= 0.80) return E * 0.95;
  if (ratio >= 0.75) return E * 0.82;
  if (ratio >= 0.70) return E * 0.74;
  if (ratio >= 0.65) return E * 0.66;
  if (ratio >= 0.60) return E * 0.58;
  if (ratio >= 0.50) return E * 0.50;
  return E * 0.45;
}

function calculateH_FieldEstimate(C: number, D: number, E: number, F: number): number {
  if (D <= 0) return 0;
  
  if (C >= D) {
    return (C - D) * (E / D);
  } else {
    return F;
  }
}

function calculateI_FieldEstimate(C: number, D: number, E: number): number {
  if (D <= 0 || C <= 0) return 0;
  
  const F = calculateF_FieldEstimate(C, D, E);
  const H = calculateH_FieldEstimate(C, D, E, F);
  const I = F + H;
  
  return Math.round(I);
}

function calculateAppliedUnitPrice_FieldEstimate(C: number, D: number, E: number): number {
  if (C <= 0 || D <= 0) return 0;
  
  const I = calculateI_FieldEstimate(C, D, E);
  return Math.round(I / C);
}

const CATEGORIES = ["복구면적 산출표", "노무비", "자재비", "견적서"];

// 노무비 행을 공종별로 정렬하는 헬퍼 함수 (같은 공종끼리 묶음)
// 독립 추가 행(isLinkedFromRecovery=false, sourceAreaRowId 없음)은 맨 아래에 유지
const sortLaborRowsByCategory = (rows: LaborCostRow[]): LaborCostRow[] => {
  // 연동 행과 독립 행 분리
  const linkedRows = rows.filter(r => r.isLinkedFromRecovery || r.sourceAreaRowId);
  const independentRows = rows.filter(r => !r.isLinkedFromRecovery && !r.sourceAreaRowId);
  
  // 연동 행만 정렬 (공종 → 공사명 순)
  const sortedLinkedRows = [...linkedRows].sort((a, b) => {
    const categoryA = a.category || '';
    const categoryB = b.category || '';
    if (categoryA !== categoryB) {
      return categoryA.localeCompare(categoryB, 'ko');
    }
    // 같은 공종 내에서는 공사명으로 정렬
    const workNameA = a.workName || '';
    const workNameB = b.workName || '';
    return workNameA.localeCompare(workNameB, 'ko');
  });
  
  // 독립 행은 맨 아래에 순서 유지하며 추가
  return [...sortedLinkedRows, ...independentRows];
};

export default function FieldEstimate() {
  // Hydration guard: 기존 견적 복원 완료 추적 (중복 행 방지)
  const isHydratedRef = useRef(false);
  const [isHydratedState, setIsHydratedState] = useState(false); // 컴포넌트 전달용 상태
  
  // 초기 로드 직후 자동 동기화 방지 (새 행 자동 생성 방지)
  const skipAutoSyncRef = useRef(true);

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
  const [customWorkTypes, setCustomWorkTypes] = useState<string[]>([]); // 사용자가 추가한 공종 목록
  const [workTypeInputMode, setWorkTypeInputMode] = useState<{[rowId: string]: boolean}>({}); // 행별 직접입력 모드
  const [customWorkNames, setCustomWorkNames] = useState<string[]>([]); // 사용자가 추가한 공사내용 목록
  const [workNameInputMode, setWorkNameInputMode] = useState<{[rowId: string]: boolean}>({}); // 행별 직접입력 모드
  const [selectedCaseId, setSelectedCaseId] = useState(() => 
    localStorage.getItem('selectedFieldSurveyCaseId') || ''
  );
  
  // 드래그 앤 드롭 상태
  const [draggedRowId, setDraggedRowId] = useState<string | null>(null);
  const [dragOverRowId, setDragOverRowId] = useState<string | null>(null);

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

  // 자재비 동기화 중복 호출 방지 ref (공종+공사명별 진행 중인 동기화 추적)
  const materialSyncInProgressRef = useRef<Set<string>>(new Set());
  
  // 노무비 행 중복 자동 제거 (React 배치 처리로 인한 중복 방지)
  // 연동된 행(isLinkedFromRecovery=true)에서 같은 공종+공사명+노임항목 조합은 첫 번째만 유지
  const lastDeduplicationRef = useRef<string>('');
  useEffect(() => {
    if (laborCostRows.length === 0) return;
    
    // 중복 체크: 연동된 행에서 같은 key가 여러 개인지 확인
    const linkedRows = laborCostRows.filter(r => r.isLinkedFromRecovery);
    const keyCount: Record<string, number> = {};
    let hasDuplicates = false;
    
    for (const row of linkedRows) {
      const key = `${row.category}|${row.workName}|${row.detailItem}`;
      keyCount[key] = (keyCount[key] || 0) + 1;
      if (keyCount[key] > 1) {
        hasDuplicates = true;
      }
    }
    
    if (!hasDuplicates) return;
    
    // 중복 제거 (무한 루프 방지를 위해 key 비교)
    const currentStateKey = laborCostRows.map(r => r.id).join(',');
    if (currentStateKey === lastDeduplicationRef.current) return;
    
    console.log('[노무비 중복 제거] 중복 감지, 자동 제거 실행');
    
    const seen = new Set<string>();
    const deduplicatedRows = laborCostRows.filter(row => {
      if (!row.isLinkedFromRecovery) return true; // 수동 행은 유지
      
      const key = `${row.category}|${row.workName}|${row.detailItem}`;
      if (seen.has(key)) {
        console.log('[노무비 중복 제거] 제거:', row.category, row.workName, row.detailItem);
        return false;
      }
      seen.add(key);
      return true;
    });
    
    if (deduplicatedRows.length !== laborCostRows.length) {
      lastDeduplicationRef.current = deduplicatedRows.map(r => r.id).join(',');
      setLaborCostRows(deduplicatedRows);
    }
  }, [laborCostRows]);

  // 자재비 행 중복 자동 제거 (React 배치 처리로 인한 중복 방지)
  // 연동된 행(isLinkedFromRecovery=true)에서 같은 공종+공사명 조합은 첫 번째만 유지
  const lastMaterialDeduplicationRef = useRef<string>('');
  useEffect(() => {
    if (materialRows.length === 0) return;
    
    // 중복 체크: 연동된 행에서 같은 key가 여러 개인지 확인
    const linkedRows = materialRows.filter(r => r.isLinkedFromRecovery);
    const keyCount: Record<string, number> = {};
    let hasDuplicates = false;
    
    for (const row of linkedRows) {
      const key = `${row.공종}|${row.공사명}`;
      keyCount[key] = (keyCount[key] || 0) + 1;
      if (keyCount[key] > 1) {
        hasDuplicates = true;
      }
    }
    
    if (!hasDuplicates) return;
    
    // 중복 제거 (무한 루프 방지를 위해 key 비교)
    const currentStateKey = materialRows.map(r => r.id).join(',');
    if (currentStateKey === lastMaterialDeduplicationRef.current) return;
    
    console.log('[자재비 중복 제거] 중복 감지, 자동 제거 실행');
    
    const seen = new Set<string>();
    const deduplicatedRows = materialRows.filter(row => {
      if (!row.isLinkedFromRecovery) return true; // 수동 행은 유지
      
      const key = `${row.공종}|${row.공사명}`;
      if (seen.has(key)) {
        console.log('[자재비 중복 제거] 제거:', row.공종, row.공사명);
        return false;
      }
      seen.add(key);
      return true;
    });
    
    if (deduplicatedRows.length !== materialRows.length) {
      lastMaterialDeduplicationRef.current = deduplicatedRows.map(r => r.id).join(',');
      setMaterialRows(deduplicatedRows);
    }
  }, [materialRows]);

  // 빈 자재비 행 생성 함수
  const createBlankMaterialRow = (공종 = '', 공사명 = '', sourceLaborRowId?: string): MaterialRow => {
    // 공종/공사명에 따른 자재 자동 설정
    let 자재 = '';
    if (공종 === '도장공사') {
      자재 = '페인트';
    } else if (공종 === '목공사' && 공사명 === '반자틀') {
      자재 = '각재';
    } else if (공종 === '목공사' && 공사명 === '걸레받이') {
      자재 = '걸레받이';
    } else if (공종 === '목공사' && 공사명 === '몰딩') {
      자재 = '몰딩';
    }
    
    return {
      id: `material-${Date.now()}-${Math.random()}`,
      공사명,
      공종,
      자재항목: 자재,
      자재,
      규격: '',
      단위: '',
      단가: 0,
      기준단가: 0,
      수량m2: 0,
      수량EA: 0,
      수량: 0,
      합계: 0,
      금액: 0,
      비고: '',
      sourceLaborRowId,
    };
  };

  // 문자열 정규화 헬퍼 (공백 제거, 소문자 변환) - 일위대가 매칭에 사용
  const normalizeForMatch = (str: string): string => {
    return (str || '').trim().toLowerCase().replace(/\s+/g, '');
  };

  // 노무비 카탈로그 조회 (from excel_data)
  const { data: laborCatalog = [], isLoading: isLoadingLaborCatalog } = useQuery<LaborCatalogItem[]>({
    queryKey: ['/api/labor-catalog'],
  });

  // 자재비 카탈로그 조회 (from excel_data)
  const { data: materialCatalog = [], isLoading: isLoadingMaterialCatalog } = useQuery<MaterialCatalogItem[]>({
    queryKey: ['/api/materials'],
  });

  // 일위대가 카탈로그 조회 (from excel_data) - 복구면적 → 노무비 자동생성용
  const { data: ilwidaegaCatalog = [] } = useQuery<IlwidaegaCatalogItem[]>({
    queryKey: ['/api/ilwidaega-catalog'],
  });

  // 자재비 카탈로그 조회 (공사명 기준) - 복구면적 → 자재비 자동생성용
  const { data: materialByWorknameCatalog = [] } = useQuery<MaterialByWorknameCatalogItem[]>({
    queryKey: ['/api/materials-by-workname'],
  });

  // materialByWorknameCatalog를 MaterialCatalogItem 형식으로 변환 (materialCatalog가 비어있을 때 대체)
  const transformedMaterialCatalog: MaterialCatalogItem[] = useMemo(() => {
    // materialCatalog가 있으면 그것을 사용, 없으면 materialByWorknameCatalog에서 변환
    if (materialCatalog.length > 0) {
      return materialCatalog;
    }
    // materialByWorknameCatalog.공종 = 공종 (원인공사, 목공사, 수장공사 등)
    // materialByWorknameCatalog.공사명 = 공사명 (방수, 합판, 도배 등)
    // materialByWorknameCatalog.자재항목 = 자재비DB의 자재항목
    return materialByWorknameCatalog.map(item => ({
      workType: item.공종, // 공종 필드 사용
      workName: item.공사명, // 공사명 필드 사용
      materialName: item.자재항목, // 자재항목 사용
      specification: '',
      unit: item.단위 || '',
      standardPrice: item.금액 ?? 0, // null이면 0으로 변환
    }));
  }, [materialCatalog, materialByWorknameCatalog]);

  // 빈 노무비 행 생성 함수
  const createBlankLaborRow = (options?: {
    sourceAreaRowId?: string;
    isLinkedFromRecovery?: boolean;
    place?: string;
    position?: string;
    category?: string;
    workName?: string;
    detailItem?: string;
    unit?: string;
    standardPrice?: number;
    damageArea?: number;
  }): LaborCostRow => {
    // 빈 행 생성 (세부공사는 기본값 일위대가)
    return {
      id: `labor-${Date.now()}-${Math.random()}`,
      sourceAreaRowId: options?.sourceAreaRowId,
      isLinkedFromRecovery: options?.isLinkedFromRecovery || false,
      place: options?.place || '', // 장소 - 복구면적 산출표에서 가져옴
      position: options?.position || '', // 위치 - 복구면적 산출표에서 가져옴
      category: options?.category || '',
      workName: options?.workName || '',
      detailWork: '일위대가', // 기본값: 일위대가
      detailItem: options?.detailItem || '',
      priceStandard: '',
      unit: options?.unit || '',
      standardPrice: options?.standardPrice || 0,
      quantity: 1,
      applicationRates: {
        ceiling: false,
        wall: false,
        floor: false,
        molding: false,
      },
      salesMarkupRate: 0,
      pricePerSqm: 0,
      damageArea: options?.damageArea || 0,
      deduction: 0,
      includeInEstimate: true,
      request: '',
      amount: 0,
    };
  };

  // 노무비 초기 첫 행 설정 (hydration 완료 후에만 빈 행 생성)
  useEffect(() => {
    // Hydration 완료 전에는 빈 행 생성하지 않음 (DB 데이터 로딩 대기)
    if (!isHydratedRef.current) return;
    if (laborCostRows.length === 0) {
      setLaborCostRows([createBlankLaborRow()]);
    }
  }, [laborCostRows.length]);

  // 자재비 초기 빈 행 설정 (hydration 완료 후에만 빈 행 생성)
  useEffect(() => {
    // Hydration 완료 전에는 빈 행 생성하지 않음 (DB 데이터 로딩 대기)
    if (!isHydratedRef.current) return;
    if (materialRows.length === 0) {
      setMaterialRows([createBlankMaterialRow()]);
    }
  }, [materialRows.length]);

  // 자재비 DB에 있는 공종 목록 추출
  const materialWorkTypes = useMemo(() => {
    const workTypes = new Set(materialCatalog.map(item => item.workType));
    console.log('[DEBUG] materialCatalog 공종 목록:', Array.from(workTypes));
    if (materialCatalog.length > 0) {
      console.log('[DEBUG] materialCatalog 첫 5개 항목:', materialCatalog.slice(0, 5));
    }
    return workTypes;
  }, [materialCatalog]);

  // 노무비 → 자재비 동기화는 isLossPreventionCase 정의 이후에 실행 (아래에 위치)

  // 자동 연동 대상 공종 목록 (도장, 목공, 수장, 도배, 마루)
  const AUTO_SYNC_WORK_TYPES = ['도장공사', '목공사', '수장공사', '도배', '마루'];

  // 노무비 공종 변환 함수 (특수 케이스 처리)
  // 목공사 + 반자틀/석고보드는 그대로 유지 (별도 피해철거공사 행 추가로 처리)
  const getLaborCategory = (workType: string, workName: string): string => {
    // 현재는 그대로 반환 (목공사 + 반자틀/석고보드 → 피해철거공사 자동 추가는 별도 로직에서 처리)
    return workType;
  };
  
  // 철거공사 추가 필요 여부 확인 (일위대가DB의 철거공사 공사명과 매칭)
  const needsDemolitionRow = (workType: string, workName: string): boolean => {
    // 목공사: 반자틀, 합판, 석고보드 → 일위대가DB 철거공사에 있음
    if (workType === '목공사' && (workName === '반자틀' || workName === '합판' || workName === '석고보드')) {
      return true;
    }
    // 수장공사: 도배, 마루, 장판 → 일위대가DB 철거공사에 있음
    if (workType === '수장공사' && (workName === '도배' || workName === '마루' || workName === '장판')) {
      return true;
    }
    return false;
  };
  
  // 철거공사 공사명 매핑 (복구면적 공사명 → 일위대가DB 철거공사 공사명)
  // 일위대가DB의 철거공사 공사명과 동일하게 유지
  const getDemolitionMapping = (workType: string, workName: string): { demolitionWorkName: string; detailItem: string } => {
    // 기본적으로 공사명 그대로 사용 (일위대가DB 철거공사에 같은 이름 있을 것으로 예상)
    // 목공사: 반자틀, 합판, 석고보드 → 철거공사 반자틀, 합판, 석고보드
    // 수장공사: 도배, 마루, 장판 → 철거공사 도배, 마루, 장판
    return { demolitionWorkName: workName, detailItem: '보통인부' };
  };
  
  // 철거공사 행 생성 함수 (일위대가DB 기반)
  const createDemolitionLaborRow = (sourceAreaRow: AreaCalculationRow, catalogItem?: IlwidaegaCatalogItem, overrideDamageArea?: number): LaborCostRow => {
    const { demolitionWorkName, detailItem } = getDemolitionMapping(sourceAreaRow.workType, sourceAreaRow.workName);
    
    // 안전한 피해면적 변환 (문자열/숫자 모두 처리)
    const parsedArea = overrideDamageArea ?? (parseFloat(sourceAreaRow.repairArea) || 0);
    const safeDamageArea = Math.round(parsedArea * 10) / 10;
    
    // 기준작업량(D), 노임단가(E) 가져오기
    const standardWorkQty = catalogItem?.기준작업량 || 0;
    const laborPrice = catalogItem?.노임단가 || 0;
    
    // 수량 계산: 복구면적 ÷ 기준작업량
    const calculatedQuantity = standardWorkQty > 0 
      ? Math.round((safeDamageArea / standardWorkQty) * 100) / 100 
      : 1;
    
    // 새 공식 적용 (C, D, E → I)
    // C = 복구면적 (safeDamageArea)
    // D = 기준작업량 (standardWorkQty)
    // E = 노임단가 (laborPrice)
    const C = safeDamageArea;
    const D = standardWorkQty;
    const E = laborPrice;
    
    let calculatedAmount = 0;
    let calculatedPricePerSqm = 0;
    
    if (D > 0 && E > 0 && C > 0) {
      // I 계산 (최종 노임비 = 합계)
      calculatedAmount = calculateI_FieldEstimate(C, D, E);
      // 적용단가 = I / C
      calculatedPricePerSqm = calculateAppliedUnitPrice_FieldEstimate(C, D, E);
    }
    
    return {
      id: `labor-demolition-${Date.now()}-${Math.random()}`,
      sourceAreaRowId: `demolition-${sourceAreaRow.id}`, // 원본 행 ID에 prefix 추가하여 구분
      isLinkedFromRecovery: true, // 복구면적에서 자동생성된 행
      sourceWorkType: sourceAreaRow.workType || '', // 부모 노무비 행의 공종 (복구면적 계산용)
      place: sourceAreaRow.category || '', // 장소
      position: sourceAreaRow.location || '', // 위치
      category: '철거공사', // 공종 - 일위대가DB 기준
      workName: demolitionWorkName, // 공사명 - 일위대가DB 기준 (반자틀, 석고, 도배 등)
      detailWork: '일위대가', // 세부공사
      detailItem: catalogItem?.노임항목 || detailItem, // 노임항목 (보통인부)
      priceStandard: '',
      unit: '㎡',
      standardPrice: laborPrice, // 노임단가 (E)
      standardWorkQuantity: standardWorkQty, // 기준작업량 (D)
      quantity: calculatedQuantity, // 자동 계산된 수량 (복구면적 ÷ 기준작업량)
      applicationRates: {
        ceiling: sourceAreaRow.location?.includes('천장') || false,
        wall: sourceAreaRow.location?.includes('벽') || false,
        floor: sourceAreaRow.location?.includes('바닥') || false,
        molding: false,
      },
      salesMarkupRate: 0,
      pricePerSqm: calculatedPricePerSqm, // 적용단가 (I/C)
      damageArea: safeDamageArea, // 복구면적 (C)
      deduction: 0,
      includeInEstimate: true,
      request: '',
      amount: calculatedAmount, // 합계 (I)
    };
  };

  // selectedCaseId 변경 시 hydration guard 및 상태 초기화
  useEffect(() => {
    if (!selectedCaseId) return; // Empty caseId, skip
    
    // Hydration guard reset
    isHydratedRef.current = false;
    setIsHydratedState(false);
    skipAutoSyncRef.current = true; // 자동 동기화 방지 리셋
    
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
    const insuredAddress = c.insuredAddress?.toLowerCase() ?? '';
    
    return (
      caseNumber.includes(query) ||
      insuranceCompany.includes(query) ||
      insuranceAccidentNo.includes(query) ||
      policyHolderName.includes(query) ||
      victimName.includes(query) ||
      insuredAddress.includes(query)
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
    if (isReadOnly) return;
    const newLaborRow = createBlankLaborRow();
    setLaborCostRows(prev => [...prev, newLaborRow]);
  };

  // 선택된 노무비 행 삭제
  const deleteSelectedLaborRows = () => {
    if (isReadOnly) return;
    if (selectedLaborRows.size === 0) return;
    setLaborCostRows(prev => prev.filter(row => !selectedLaborRows.has(row.id)));
    setSelectedLaborRows(new Set());
  };

  // 복구면적 산출표에서 노무비로 동기화 (일위대가DB 기반 자동 생성)
  // 일위대가DB에서 공종+공사명으로 조회하여 ALL matching 노임항목 행을 자동 생성
  const syncLaborFromRecoveryArea = () => {
    if (isReadOnly || rows.length === 0) return;
    
    // 기존 독립 추가 행 (isLinkedFromRecovery = false) 보존
    const independentRows = laborCostRows.filter(row => !row.isLinkedFromRecovery);
    
    // 복구면적 산출표에서 고유한 공종+공사명 조합 추출 및 면적 합산
    const workTypeMap = new Map<string, Map<string, { totalArea: number; areaRows: AreaCalculationRow[] }>>();
    
    rows.forEach(row => {
      const workType = row.workType || '';
      const workName = row.workName || '';
      if (!workType) return; // 공종이 없으면 건너뜀
      
      if (!workTypeMap.has(workType)) {
        workTypeMap.set(workType, new Map());
      }
      
      const workNameMap = workTypeMap.get(workType)!;
      if (!workNameMap.has(workName)) {
        workNameMap.set(workName, { totalArea: 0, areaRows: [] });
      }
      
      const workNameData = workNameMap.get(workName)!;
      workNameData.totalArea += parseFloat(row.repairArea) || 0;
      workNameData.areaRows.push(row);
    });
    
    // 공종별로 정렬된 노무비 행 생성 (일위대가DB 기반)
    const newLaborRows: LaborCostRow[] = [];
    const sortedWorkTypes = Array.from(workTypeMap.keys()).sort();
    
    sortedWorkTypes.forEach(workType => {
      const workNameMap = workTypeMap.get(workType)!;
      const sortedWorkNames = Array.from(workNameMap.keys()).sort();
      
      sortedWorkNames.forEach(workName => {
        const workNameData = workNameMap.get(workName)!;
        const sourceAreaRowId = workNameData.areaRows[0]?.id || '';
        const totalArea = Math.round(workNameData.totalArea * 10) / 10;
        
        // 일위대가DB에서 공종+공사명으로 ALL matching 노임항목 조회
        const matchingCatalogItems = ilwidaegaCatalog.filter(
          item => normalizeForMatch(item.공종 || '') === normalizeForMatch(workType) && 
                 normalizeForMatch(item.공사명 || '') === normalizeForMatch(workName)
        );
        
        // 복구면적 행에서 장소/위치 조합 추출 (모든 행의 데이터 반영)
        const uniquePlaces = Array.from(new Set(workNameData.areaRows.map(r => r.category).filter(Boolean)));
        const combinedPlace = uniquePlaces.join('/') || '';
        // 위치는 여러 행의 위치를 조합 (중복 제거)
        const uniqueLocations = Array.from(new Set(workNameData.areaRows.map(r => r.location).filter(Boolean)));
        const combinedPosition = uniqueLocations.join('/') || '';
        
        if (matchingCatalogItems.length > 0) {
          // 일위대가DB에서 매칭된 모든 노임항목으로 행 생성
          matchingCatalogItems.forEach((catalogItem, idx) => {
            // 기준작업량 가져오기
            const standardWorkQty = catalogItem.기준작업량 || 0;
            // 수량 계산: 복구면적 ÷ 기준작업량
            const calculatedQuantity = standardWorkQty > 0 
              ? Math.round((totalArea / standardWorkQty) * 100) / 100 
              : 1;
            
            // I = F + H 공식으로 적용단가/합계 계산
            const C = totalArea; // 복구면적
            const D = standardWorkQty; // 기준작업량
            const E = catalogItem.노임단가 || 0; // 노임단가(인당)
            
            // I 계산 (최종 노임비)
            let appliedUnitPrice = 0;
            let totalAmount = 0;
            if (D > 0 && E > 0 && C > 0) {
              const I = calculateI_FieldEstimate(C, D, E);
              appliedUnitPrice = Math.round(I / C); // 적용단가 = I / C
              totalAmount = I; // 합계 = I
            }
            
            newLaborRows.push({
              id: `labor-linked-${Date.now()}-${Math.random()}-${idx}`,
              sourceAreaRowId: sourceAreaRowId,
              isLinkedFromRecovery: true, // 복구면적에서 연동 생성된 행
              place: combinedPlace,
              position: combinedPosition,
              category: workType,
              workName: workName,
              detailWork: '일위대가',
              detailItem: catalogItem.노임항목,
              priceStandard: '',
              unit: '㎡',
              standardPrice: E, // 노임단가 (E)
              standardWorkQuantity: standardWorkQty, // 기준작업량 (D)
              quantity: calculatedQuantity, // 자동 계산된 수량
              applicationRates: { ceiling: false, wall: false, floor: false, molding: false },
              salesMarkupRate: 0,
              pricePerSqm: appliedUnitPrice, // 적용단가 = I / C
              damageArea: totalArea,
              deduction: 0,
              includeInEstimate: true,
              request: '',
              amount: totalAmount, // 합계 = I
            });
          });
        } else {
          // 일위대가DB에 없으면 빈 행 생성 (수동 입력용)
          newLaborRows.push(createBlankLaborRow({
            sourceAreaRowId,
            isLinkedFromRecovery: true,
            place: combinedPlace,
            position: combinedPosition,
            category: workType,
            workName: workName,
            damageArea: totalArea,
          }));
        }
        
        // 철거공사 자동 추가 규칙: 일위대가DB 철거공사 조회
        if (needsDemolitionRow(workType, workName)) {
          // 일위대가DB 철거공사에서 매칭 아이템 찾기
          const { demolitionWorkName } = getDemolitionMapping(workType, workName);
          const demolitionCatalogItems = ilwidaegaCatalog.filter(
            item => normalizeForMatch(item.공종 || '') === normalizeForMatch('철거공사') && 
                   normalizeForMatch(item.공사명 || '') === normalizeForMatch(demolitionWorkName)
          );
          
          // 대표 행 생성 (combined place/position 적용)
          const representativeAreaRow = workNameData.areaRows[0];
          
          // 철거공사 행은 totalArea를 overrideDamageArea로 전달하여 일관성 보장
          if (demolitionCatalogItems.length > 0) {
            // 일위대가DB에서 매칭된 모든 철거공사 노임항목으로 행 생성
            demolitionCatalogItems.forEach((catItem) => {
              const demolitionRow = createDemolitionLaborRow(representativeAreaRow, catItem, totalArea);
              // combined place/position 적용 (복수 장소/위치 지원)
              demolitionRow.place = combinedPlace;
              demolitionRow.position = combinedPosition;
              newLaborRows.push(demolitionRow);
            });
          } else {
            // 기본 철거공사 행 생성
            const demolitionRow = createDemolitionLaborRow(representativeAreaRow, undefined, totalArea);
            // combined place/position 적용 (복수 장소/위치 지원)
            demolitionRow.place = combinedPlace;
            demolitionRow.position = combinedPosition;
            newLaborRows.push(demolitionRow);
          }
        }
      });
    });
    
    // 연동 행 + 독립 행 합치기
    const allRows = [...newLaborRows, ...independentRows];
    
    if (allRows.length > 0) {
      setLaborCostRows(allRows);
      setSelectedLaborRows(new Set());
      toast({
        title: "노무비 동기화 완료",
        description: `복구면적 산출표에서 ${newLaborRows.length}개 항목이 자동 생성되었습니다.`,
      });
    }
  };

  // 자동 연동 대상 공사명 (반자틀 제외)
  const AUTO_SYNC_MATERIAL_WORK_NAMES = ['합판', '석고', '석고보드', '몰딩', '걸레받이', '도배', '마루', '장판'];
  
  // 복구면적 산출표에서 자재비로 동기화 (자재비DB 기반 자동 생성)
  // 핵심: 동일 Key(공종+공사명+자재항목)는 1행으로 merge, 전체 합산 후 마지막에 ceil 적용
  // isOverridden=true인 행은 사용자 수정값 보존 (autoQuantity만 업데이트)
  // RECONCILE: 복구면적에 없는 자동 생성 행은 삭제
  const syncMaterialFromRecoveryArea = () => {
    if (isReadOnly || rows.length === 0) return;
    
    // 기존 행 분류
    // 수동 행: isAutoGenerated=false AND isLinkedFromRecovery=false (또는 undefined)
    const manualRows = materialRows.filter(row => !row.isAutoGenerated && !row.isLinkedFromRecovery);
    
    // 기존 자동 생성 행을 autoKey로 매핑 (재사용 위해)
    // isAutoGenerated=true 또는 isLinkedFromRecovery=true인 모든 행
    const existingAutoRows = materialRows.filter(row => row.isAutoGenerated || row.isLinkedFromRecovery);
    const existingAutoRowsMap = new Map<string, MaterialRow>();
    existingAutoRows.forEach(row => {
      // autoKey가 없으면 공종|공사명|자재항목으로 생성
      const norm = (v: any) => (v ?? "").toString().trim();
      const key = row.autoKey || `${norm(row.공종)}|${norm(row.공사명)}|${norm(row.자재항목) || "__NONE__"}`;
      existingAutoRowsMap.set(key, row);
    });
    
    // 복구면적에서 공종+공사명별 면적 합산 (반자틀 제외)
    const workMap = new Map<string, { 
      공종: string; 
      공사명: string; 
      totalArea: number; 
      sourceAreaRowIds: string[];
    }>();
    
    rows.forEach(row => {
      const workType = row.workType || '';
      const workName = row.workName || '';
      if (!workType || !workName) return;
      
      // 반자틀은 자동 연동 제외
      if (workName === '반자틀') return;
      
      // 자동 연동 대상만 처리
      if (!AUTO_SYNC_MATERIAL_WORK_NAMES.includes(workName)) return;
      
      const key = `${workType}|${workName}`;
      if (!workMap.has(key)) {
        workMap.set(key, { 
          공종: workType, 
          공사명: workName, 
          totalArea: 0,
          sourceAreaRowIds: []
        });
      }
      
      const data = workMap.get(key)!;
      const repairArea = parseFloat(row.repairArea) || 0;
      data.totalArea += repairArea;
      data.sourceAreaRowIds.push(row.id);
    });
    
    // 공사명별 자재 항목 생성/업데이트 (자재비DB 매칭)
    // Map으로 autoKey 기준 merge: 동일한 autoKey는 1행만 유지
    // nextAutoKeys: 현재 복구면적에서 생성되어야 하는 모든 autoKey
    const nextAutoKeys = new Set<string>();
    const resultRowsMap = new Map<string, MaterialRow>();
    
    workMap.forEach((data) => {
      // 자재비DB에서 공사명으로 매칭되는 자재 찾기
      const matchingMaterials = materialByWorknameCatalog.filter(
        item => normalizeForMatch(item.공사명 || '') === normalizeForMatch(data.공사명 || '')
      );
      
      // 수량 계산 (단위별 산식 적용)
      const ratio = MATERIAL_UNIT_RATIOS[data.공사명];
      let calculatedQty: number;
      let calculatedUnit: string;
      let autoUnitType: 'm2' | 'EA';
      
      if (ratio) {
        // EA 단위: 전체 합산 후 마지막에 한 번만 ceil
        calculatedQty = Math.ceil(data.totalArea / ratio.unitSize);
        calculatedUnit = ratio.unit;
        autoUnitType = 'EA';
        console.log(`[자재비 집계] ${data.공사명}: 총면적 ${data.totalArea} ÷ ${ratio.unitSize} = ${data.totalArea / ratio.unitSize} → ceil → ${calculatedQty} ${calculatedUnit}`);
      } else {
        // m² 단위 (도배, 마루, 장판): 합산값 그대로
        calculatedQty = Math.round(data.totalArea * 10) / 10;
        calculatedUnit = '㎡';
        autoUnitType = 'm2';
        console.log(`[자재비 집계] ${data.공사명}: 총면적 ${data.totalArea}㎡ 그대로 사용`);
      }
      
      if (matchingMaterials.length > 0) {
        matchingMaterials.forEach(material => {
          const norm = (v: any) => (v ?? "").toString().trim();
          const itemKey = norm(material.자재항목) || "__NONE__";
          const autoKey = `${norm(data.공종)}|${norm(data.공사명)}|${itemKey}`;
          nextAutoKeys.add(autoKey);
          
          const unitPrice = typeof material.금액 === 'number' ? material.금액 : 0;
          
          // 기존 행이 있는지 확인
          const existingRow = existingAutoRowsMap.get(autoKey);
          
          if (existingRow && existingRow.isOverridden) {
            // 사용자 수정 행: 사용자 입력값 보존, autoQuantity만 업데이트
            resultRowsMap.set(autoKey, {
              ...existingRow,
              autoKey,
              autoQuantity: calculatedQty,
              sourceAreaRowIds: data.sourceAreaRowIds,
            });
            console.log(`[자재비 집계] ${autoKey}: isOverridden=true, 사용자 값 보존`);
          } else if (existingRow) {
            // 기존 자동 행: 값 업데이트 (ID 유지)
            resultRowsMap.set(autoKey, {
              ...existingRow,
              autoKey,
              단위: calculatedUnit,
              단가: unitPrice,
              기준단가: unitPrice,
              수량m2: autoUnitType === 'm2' ? calculatedQty : data.totalArea,
              수량EA: autoUnitType === 'EA' ? calculatedQty : 0,
              수량: calculatedQty,
              합계: Math.round(unitPrice * calculatedQty),
              금액: Math.round(unitPrice * calculatedQty),
              sourceAreaRowIds: data.sourceAreaRowIds,
              autoQuantity: calculatedQty,
              autoUnitType,
            });
            console.log(`[자재비 집계] ${autoKey}: 기존 행 업데이트`);
          } else {
            // 새 자동 생성 행
            resultRowsMap.set(autoKey, {
              id: `material-auto-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              공종: data.공종,
              공사명: data.공사명,
              자재항목: material.자재항목,
              자재: material.자재항목,
              규격: material.규격 || '',
              단위: calculatedUnit,
              단가: unitPrice,
              기준단가: unitPrice,
              수량m2: autoUnitType === 'm2' ? calculatedQty : data.totalArea,
              수량EA: autoUnitType === 'EA' ? calculatedQty : 0,
              수량: calculatedQty,
              합계: Math.round(unitPrice * calculatedQty),
              금액: Math.round(unitPrice * calculatedQty),
              비고: '',
              sourceAreaRowIds: data.sourceAreaRowIds,
              isLinkedFromRecovery: true,
              autoKey,
              isAutoGenerated: true,
              isOverridden: false,
              autoQuantity: calculatedQty,
              autoUnitType,
            });
            console.log(`[자재비 집계] ${autoKey}: 새 행 생성`);
          }
        });
      } else {
        // 매칭되는 자재가 없으면 빈 행 생성
        const norm = (v: any) => (v ?? "").toString().trim();
        const autoKey = `${norm(data.공종)}|${norm(data.공사명)}|__NONE__`;
        nextAutoKeys.add(autoKey);
        
        const existingRow = existingAutoRowsMap.get(autoKey);
        
        if (existingRow && existingRow.isOverridden) {
          resultRowsMap.set(autoKey, {
            ...existingRow,
            autoKey,
            autoQuantity: calculatedQty,
            sourceAreaRowIds: data.sourceAreaRowIds,
          });
        } else if (existingRow) {
          resultRowsMap.set(autoKey, {
            ...existingRow,
            autoKey,
            수량m2: autoUnitType === 'm2' ? calculatedQty : data.totalArea,
            수량EA: autoUnitType === 'EA' ? calculatedQty : 0,
            수량: calculatedQty,
            sourceAreaRowIds: data.sourceAreaRowIds,
            autoQuantity: calculatedQty,
            autoUnitType,
          });
        } else {
          resultRowsMap.set(autoKey, {
            id: `material-auto-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            공종: data.공종,
            공사명: data.공사명,
            자재항목: '',
            자재: '',
            규격: '',
            단위: calculatedUnit,
            단가: 0,
            기준단가: 0,
            수량m2: autoUnitType === 'm2' ? calculatedQty : data.totalArea,
            수량EA: autoUnitType === 'EA' ? calculatedQty : 0,
            수량: calculatedQty,
            합계: 0,
            금액: 0,
            비고: '',
            sourceAreaRowIds: data.sourceAreaRowIds,
            isLinkedFromRecovery: true,
            autoKey,
            isAutoGenerated: true,
            isOverridden: false,
            autoQuantity: calculatedQty,
            autoUnitType,
          });
        }
      }
    });
    
    // RECONCILE: 기존 자동 행 중 nextAutoKeys에 없는 행은 삭제 (stale rows 제거)
    const deletedCount = existingAutoRows.filter(row => {
      const norm = (v: any) => (v ?? "").toString().trim();
      const key = row.autoKey || `${norm(row.공종)}|${norm(row.공사명)}|${norm(row.자재항목) || "__NONE__"}`;
      return !nextAutoKeys.has(key);
    }).length;
    
    if (deletedCount > 0) {
      console.log(`[MATERIAL RECONCILE] ${deletedCount}개 stale 자동 행 삭제됨`);
    }
    
    console.log("[MATERIAL RECONCILE]", {
      nextKeys: Array.from(nextAutoKeys).sort(),
      before: materialRows.length,
      beforeAuto: existingAutoRows.length,
      beforeManual: manualRows.length,
      afterAuto: resultRowsMap.size,
      deleted: deletedCount,
    });
    
    // 결과 병합: 업데이트된 자동 행 + 수동 행
    const resultAutoRows = Array.from(resultRowsMap.values());
    const allRows = [...resultAutoRows, ...manualRows];
    
    console.log("[RECONCILE RESULT]", {
      nextKeys: Array.from(nextAutoKeys),
      finalRows: allRows.map(r => ({
        id: r.id,
        auto: r.isAutoGenerated,
        key: r.autoKey,
        work: r.공사명,
        material: r.자재항목
      }))
    });
    
    if (allRows.length > 0 || materialRows.length > 0) {
      setMaterialRows(allRows);
      setSelectedMaterialRows(new Set());
    }
  };

  // 자재비 행 추가
  const addMaterialRow = () => {
    if (isReadOnly) return;
    setMaterialRows(prev => [...prev, createBlankMaterialRow()]);
  };

  // 선택된 자재비 행 삭제
  const deleteSelectedMaterialRows = () => {
    if (isReadOnly) return;
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
    console.log('[DEBUG] laborCatalog 첫 5개 항목:', laborCatalog.slice(0, 5));
    console.log('[DEBUG] laborCatalog 공종 필드 샘플:', laborCatalog.slice(0, 5).map(item => item.공종));
    const unique = new Set(laborCatalog.map(item => item.공종));
    const result = Array.from(unique).sort();
    console.log('[DEBUG] 추출된 공종 목록:', result);
    return result;
  }, [laborCatalog]);
  
  // 공종별 공사명 매핑 (복구면적 산출표에서 사용)
  const workNamesByWorkType = useMemo(() => {
    if (!laborCatalog.length) return {} as Record<string, string[]>;
    const mapping: Record<string, Set<string>> = {};
    laborCatalog.forEach(item => {
      if (!mapping[item.공종]) {
        mapping[item.공종] = new Set();
      }
      // 목공사 공종의 공사명 "목공사"를 "걸레받이"로 변경
      if (normalizeForMatch(item.공종 || '') === normalizeForMatch('목공사') && normalizeForMatch(item.공사명 || '') === normalizeForMatch('목공사')) {
        mapping[item.공종].add('걸레받이');
      } else {
        mapping[item.공종].add(item.공사명);
      }
    });
    // Set을 배열로 변환하고 정렬
    const result: Record<string, string[]> = {};
    Object.keys(mapping).forEach(key => {
      result[key] = Array.from(mapping[key]).sort();
    });
    return result;
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

  // 협력사: 현장출동보고서 제출 후 수정 불가
  const isPartner = currentUser?.role === "협력사";
  const isSubmitted = selectedCase?.fieldSurveyStatus === "submitted";
  const isReadOnly = isPartner && isSubmitted;
  
  // 손해방지 공종 목록 (노무비 탭에서 사용) - 원인세대 항목
  const DAMAGE_PREVENTION_WORK_TYPES = ['누수탐지', '원인철거', '원인공사'];
  
  // 피해복구 공종 목록 (노무비 탭에서 사용) - 피해세대 항목
  // 도장, 목공, 수장만 복구면적산출표와 연동됨
  const VICTIM_RECOVERY_WORK_TYPES = ['철거공사', '가설공사', '목공사', '수장공사', '도장공사', '전기공사', '타일공사', '가구공사', '욕실공사', '폐기물', '기타'];
  
  // 복구면적 산출표와 연동되는 공종 목록 (피해복구에서 도장/목공/수장만 연동)
  const AREA_LINKED_WORK_TYPES = ['도장공사', '목공사', '수장공사'];
  
  // 복구면적 산출표 전용 공종 목록 (케이스 유형과 관계없이 항상 도장/목공/수장만)
  const AREA_CALCULATION_WORK_TYPES = ['도장공사', '목공사', '수장공사'];
  
  // 위치별 공종 매핑 (복구면적 산출표용)
  const WORK_TYPES_BY_LOCATION: Record<string, string[]> = {
    '천장': ['목공사', '수장공사'],
    '벽면': ['목공사', '수장공사'],
    '바닥': ['수장공사', '가설공사'],
  };
  
  // 위치+공종별 공사명 매핑 (복구면적 산출표용 - 하드코딩)
  const WORK_NAMES_BY_LOCATION_AND_TYPE: Record<string, Record<string, string[]>> = {
    '천장': {
      '목공사': ['반자틀', '합판', '석고보드', '몰딩'],
      '수장공사': ['도배'],
    },
    '벽면': {
      '목공사': ['합판', '석고보드', '걸레받이'],
      '수장공사': ['도배'],
    },
    '바닥': {
      '수장공사': ['마루', '장판'],
      '가설공사': ['건축물현장정리'],
    },
  };
  
  // 위치에 따른 공종 옵션 가져오기
  const getWorkTypesByLocation = (location: string): string[] => {
    return WORK_TYPES_BY_LOCATION[location] || AREA_CALCULATION_WORK_TYPES;
  };
  
  // 위치+공종에 따른 공사명 옵션 가져오기 (하드코딩 매핑)
  const getWorkNamesByWorkType = (workType: string, location?: string): string[] => {
    if (location && WORK_NAMES_BY_LOCATION_AND_TYPE[location]?.[workType]) {
      return WORK_NAMES_BY_LOCATION_AND_TYPE[location][workType];
    }
    return workNamesByWorkType[workType] || [];
  };
  
  // 손해방지 vs 피해복구 케이스 판별
  // 접수번호에 -1, -2 등이 붙어있으면 피해복구, 없으면 손해방지
  const isLossPreventionCase = useMemo(() => {
    const caseNumber = selectedCase?.caseNumber || '';
    // -숫자 패턴이 없으면 손해방지
    return !/-\d+$/.test(caseNumber);
  }, [selectedCase?.caseNumber]);

  // 복구면적 변경 시 자재비 자동 동기화를 위한 signature
  // rows 배열 참조가 같아도 내부 필드(workName, repairArea) 변경을 감지
  const recoverySignature = useMemo(
    () => rows.map(r => `${r.id}|${r.workType}|${r.workName}|${r.repairArea}`).join(','),
    [rows]
  );

  // 복구면적 변경 → 자재비 자동 동기화 useEffect
  useEffect(() => {
    // Hydration 완료 전에는 동기화 건너뛰기
    if (!isHydratedRef.current) {
      console.log("[SYNC SKIP] Hydration not complete");
      return;
    }
    
    // 초기 로드 직후 자동 동기화 방지
    if (skipAutoSyncRef.current) {
      console.log("[SYNC SKIP] Initial load, skipping auto sync");
      skipAutoSyncRef.current = false;
      return;
    }
    
    // 손해방지 케이스면 자동 연동하지 않음
    if (isLossPreventionCase) {
      console.log("[SYNC SKIP] Loss prevention case");
      return;
    }
    
    // 읽기 전용이면 동기화하지 않음
    if (isReadOnly) {
      console.log("[SYNC SKIP] Read-only mode");
      return;
    }
    
    console.log("[SYNC CALL] syncMaterialFromRecoveryArea triggered", {
      time: Date.now(),
      recoveryCount: rows.length,
      recoverySnapshot: rows.map(r => ({
        id: r.id,
        workType: r.workType,
        work: r.workName,
        area: r.repairArea
      }))
    });
    
    syncMaterialFromRecoveryArea();
  }, [recoverySignature, isLossPreventionCase, isReadOnly]);
  
  // 공종 목록 (노무비 DB에서 가져온 후 케이스 유형별 필터링)
  // 손해방지 케이스: DAMAGE_PREVENTION_WORK_TYPES만 표시
  // 피해복구 케이스: VICTIM_RECOVERY_WORK_TYPES만 표시
  const workTypes = useMemo(() => {
    // 케이스 유형에 따른 허용 공종 목록
    const allowedWorkTypes = isLossPreventionCase 
      ? DAMAGE_PREVENTION_WORK_TYPES 
      : VICTIM_RECOVERY_WORK_TYPES;
    
    // 노무비 카탈로그에서 공종 목록 가져오기 (허용된 공종만 필터링)
    if (laborCategories.length > 0) {
      const filtered = laborCategories.filter(cat => allowedWorkTypes.includes(cat));
      // 필터링 결과가 있으면 사용, 없으면 기본값 사용
      return filtered.length > 0 ? filtered : allowedWorkTypes;
    }
    
    // 카탈로그가 없으면 케이스 유형에 따른 기본값 사용
    return allowedWorkTypes;
  }, [laborCategories, isLossPreventionCase]);

  // 노무비 행 변화 감지 및 자재비 행 동기화 (공종, 공사명 그대로 복사)
  // 피해복구 케이스에서만 작동 (손해방지 케이스 제외)
  // 주의: 새 행 생성은 skipAutoSyncRef.current가 false일 때만 실행
  useEffect(() => {
    // Hydration 완료 전에는 동기화 건너뛰기 (중복 행 방지)
    if (!isHydratedRef.current) {
      return;
    }
    
    // 손해방지 케이스면 자동 연동하지 않음
    if (isLossPreventionCase) {
      return;
    }
    
    // 자재비 연동 제외 대상 확인 함수
    // 1. 복구면적 연동 행(isLinkedFromRecovery)만 자재비에 연동됨 (별도 경로)
    // 2. 노무비에서 수동 추가한 행은 자재비에 연동하지 않음
    // 3. 목공사-반자틀, 철거공사는 자재비 연동 제외
    // 4. 자동 연동 대상 공사명(합판, 석고보드, 도배 등)은 syncMaterialFromRecoveryArea에서 처리하므로 제외
    const AUTO_MATERIAL_SYNC_WORK_NAMES = ['합판', '석고', '석고보드', '몰딩', '걸레받이', '도배', '마루', '장판'];
    const shouldExcludeFromMaterialSync = (category: string, workName: string, isLinkedFromRecovery?: boolean): boolean => {
      // 노무비 수동 추가 행은 자재비 연동 안함 (복구면적 연동 행만 연동됨)
      if (!isLinkedFromRecovery) return true;
      // 목공사-반자틀, 철거공사는 복구면적 연동 행이더라도 자재비 연동 제외
      if ((category === '목공사' && workName === '반자틀') || category === '철거공사') return true;
      // 자동 연동 대상 공사명은 syncMaterialFromRecoveryArea에서 처리하므로 노무비→자재비 연동 제외
      // 이 공사명들은 복구면적에서 직접 자재비로 연동되어야 함 (노무비 경유 X)
      if (AUTO_MATERIAL_SYNC_WORK_NAMES.includes(workName)) {
        console.log('[노무비→자재비 useEffect] 자동연동 대상 제외:', category, workName);
        return true;
      }
      return false;
    };

    setMaterialRows(prev => {
      // 1. 먼저 목공사-반자틀로 변경된 노무비 행에 연결된 자재비 행 제거
      const filteredRows = prev.filter(matRow => {
        // 복구면적 연동 자재비 행은 유지 (별도 경로로 관리)
        if (matRow.isLinkedFromRecovery) return true;
        if (!matRow.sourceLaborRowId) return true;
        
        const linkedLaborRow = laborCostRows.find(lr => lr.id === matRow.sourceLaborRowId);
        if (!linkedLaborRow) return true;
        
        // 연결된 노무비 행이 목공사-반자틀이면 자재비 행 제거
        return !shouldExcludeFromMaterialSync(linkedLaborRow.category || '', linkedLaborRow.workName || '', linkedLaborRow.isLinkedFromRecovery);
      });
      
      // 초기 로드 직후에는 새 행 생성을 건너뜀 (기존 데이터 유지)
      // skipAutoSyncRef는 hydration 완료 후에만 false가 됨
      if (skipAutoSyncRef.current) {
        return filteredRows;
      }
      
      // 이미 연결된 노무비 행 ID 목록
      const existingSourceIds = new Set(filteredRows.map(row => row.sourceLaborRowId).filter(Boolean));
      
      // 자재비 행이 없는 노무비 행 찾기 (목공사-반자틀 제외, 복구면적 연동 행 제외)
      const laborRowsNeedingMaterial = laborCostRows.filter(laborRow => 
        laborRow.id && 
        !existingSourceIds.has(laborRow.id) &&
        !shouldExcludeFromMaterialSync(laborRow.category || '', laborRow.workName || '', laborRow.isLinkedFromRecovery)
      );
      
      // 기존 행 업데이트 + 새 행 추가 (한 번에 처리)
      const updatedRows = filteredRows.map((matRow, index) => {
        // sourceLaborRowId가 있으면 해당 노무비 행과 동기화
        if (matRow.sourceLaborRowId) {
          const linkedLaborRow = laborCostRows.find(lr => lr.id === matRow.sourceLaborRowId);
          if (linkedLaborRow) {
            const needsCategoryUpdate = linkedLaborRow.category !== matRow.공종;
            const needsWorkNameUpdate = linkedLaborRow.workName !== matRow.공사명;
            
            if (needsCategoryUpdate || needsWorkNameUpdate) {
              // 공종, 공사명 그대로 복사
              return { 
                ...matRow, 
                공종: linkedLaborRow.category || '',
                공사명: linkedLaborRow.workName || ''
              };
            }
          }
          return matRow;
        }
        
        // sourceLaborRowId가 없으면 같은 인덱스의 노무비 행과 동기화
        const correspondingLaborRow = laborCostRows[index];
        if (correspondingLaborRow) {
          // 연결된 노무비 행이 목공사-반자틀 또는 복구면적 연동 행이면 동기화 건너뛰기
          if (shouldExcludeFromMaterialSync(correspondingLaborRow.category || '', correspondingLaborRow.workName || '', correspondingLaborRow.isLinkedFromRecovery)) {
            return matRow;
          }
          
          const needsCategoryUpdate = correspondingLaborRow.category !== matRow.공종;
          const needsWorkNameUpdate = correspondingLaborRow.workName !== matRow.공사명;
          
          if (needsCategoryUpdate || needsWorkNameUpdate) {
            // 공종, 공사명 그대로 복사
            return { 
              ...matRow, 
              공종: correspondingLaborRow.category || '',
              공사명: correspondingLaborRow.workName || ''
            };
          }
        }
        return matRow;
      });
      
      // 새로운 자재비 행 추가 (공종, 공사명 그대로 복사)
      const newRows = laborRowsNeedingMaterial.map(laborRow => {
        return createBlankMaterialRow(laborRow.category || '', laborRow.workName || '', laborRow.id);
      });
      
      return [...updatedRows, ...newRows];
    });
  }, [laborCostRows, isLossPreventionCase]);

  // 복구면적 산출표 → 노무비 자동 연동 (피해복구 케이스에서만)
  // 일위대가DB에서 공종+공사명으로 조회하여 ALL matching 노임항목 행을 자동 생성
  // 복구면적 → 피해면적 추가 복사
  useEffect(() => {
    // Hydration 완료 전에는 동기화 건너뛰기 (중복 행 방지)
    if (!isHydratedRef.current) {
      return;
    }

    // 피해복구 케이스가 아니면 연동하지 않음 (손해방지 케이스 제외)
    if (isLossPreventionCase) {
      return;
    }

    // 일위대가 카탈로그가 로드되지 않았으면 대기
    if (!ilwidaegaCatalog || ilwidaegaCatalog.length === 0) {
      return;
    }

    // 이미 연동된 복구면적 산출표 행 ID 목록 (demolition- 접두사 제거하여 원본 ID 추출)
    const existingSourceAreaIds = new Set(
      laborCostRows.map(row => {
        const sourceId = row.sourceAreaRowId;
        if (!sourceId) return null;
        // demolition- 접두사가 있으면 제거하여 원본 ID 반환
        return sourceId.startsWith('demolition-') ? sourceId.replace('demolition-', '') : sourceId;
      }).filter(Boolean)
    );

    // 완성된 복구면적 산출표 행 찾기 (공종, 공사명 필수 입력)
    const completedAreaRows = rows.filter(row => {
      const hasRequiredFields = 
        row.workType && row.workType !== '' &&
        row.workName && row.workName !== '선택' && row.workName !== '';
      
      // 아직 연동되지 않은 행만
      const notYetSynced = !existingSourceAreaIds.has(row.id);
      
      return hasRequiredFields && notYetSynced;
    });

    // 연동할 행이 있으면 노무비에 추가 (일위대가DB 기반 모든 노임항목 생성)
    if (completedAreaRows.length > 0) {
      const newLaborRows: LaborCostRow[] = [];
      
      completedAreaRows.forEach(areaRow => {
        const workType = areaRow.workType;
        const workName = areaRow.workName;
        const damageAreaValue = Number(areaRow.repairArea) || 0;
        const laborCategory = getLaborCategory(workType, workName);
        
        // 일위대가DB에서 공종+공사명으로 ALL matching 노임항목 조회
        const matchingCatalogItems = ilwidaegaCatalog.filter(
          item => normalizeForMatch(item.공종 || '') === normalizeForMatch(laborCategory) && 
                 normalizeForMatch(item.공사명 || '') === normalizeForMatch(workName)
        );
        
        console.log('[연동] 일위대가 조회:', { workType, workName, laborCategory, matchCount: matchingCatalogItems.length });
        
        if (matchingCatalogItems.length > 0) {
          // 일위대가DB에서 매칭된 모든 노임항목으로 행 생성
          matchingCatalogItems.forEach((catalogItem, idx) => {
            const C = damageAreaValue; // 복구면적
            const D = catalogItem.기준작업량 || 0; // 기준작업량
            const E = catalogItem.노임단가 || 0; // 노임단가(인당)
            
            // 수량 계산: 복구면적 ÷ 기준작업량
            const calculatedQuantity = D > 0 
              ? Math.round((C / D) * 100) / 100 
              : 1;
            
            // 새 공식으로 적용단가와 합계 계산
            let calculatedAmount = 0;
            let calculatedPricePerSqm = 0;
            
            if (D > 0 && E > 0 && C > 0) {
              calculatedAmount = calculateI_FieldEstimate(C, D, E);
              calculatedPricePerSqm = calculateAppliedUnitPrice_FieldEstimate(C, D, E);
            }
            
            newLaborRows.push({
              id: `labor-linked-${Date.now()}-${Math.random()}-${idx}`,
              sourceAreaRowId: areaRow.id,
              isLinkedFromRecovery: true, // 복구면적에서 연동 생성된 행 (수정 불가)
              place: areaRow.category || '',
              position: areaRow.location || '',
              category: laborCategory,
              workName: workName,
              detailWork: '일위대가',
              detailItem: catalogItem.노임항목,
              priceStandard: '',
              unit: '㎡',
              standardPrice: E, // 노임단가 (E)
              standardWorkQuantity: D, // 기준작업량 (D)
              quantity: calculatedQuantity, // 수량 (C/D)
              applicationRates: { ceiling: false, wall: false, floor: false, molding: false },
              salesMarkupRate: 0,
              pricePerSqm: calculatedPricePerSqm, // 적용단가 (I/C)
              damageArea: C, // 복구면적 (C)
              deduction: 0,
              includeInEstimate: true,
              request: '',
              amount: calculatedAmount, // 합계 (I)
            });
          });
        } else {
          // 일위대가DB에 없으면 빈 행 생성 (수동 입력용)
          const mainRow = createBlankLaborRow({
            sourceAreaRowId: areaRow.id,
            isLinkedFromRecovery: true,
            place: areaRow.category || '',
            position: areaRow.location || '',
            category: laborCategory,
            workName: workName,
            damageArea: damageAreaValue,
          });
          newLaborRows.push(mainRow);
        }
        
        // 철거공사 자동 추가: 일위대가DB 철거공사 조회 (반자틀, 합판, 석고, 도배, 마루, 장판)
        if (needsDemolitionRow(workType, workName)) {
          const { demolitionWorkName } = getDemolitionMapping(workType, workName);
          
          // 일위대가DB 철거공사에서 매칭 아이템 찾기 (공종=철거공사)
          const demolitionCatalogItems = ilwidaegaCatalog.filter(
            item => normalizeForMatch(item.공종 || '') === normalizeForMatch('철거공사') && 
                   normalizeForMatch(item.공사명 || '') === normalizeForMatch(demolitionWorkName)
          );
          
          console.log('[연동] 철거공사 조회 (일위대가DB):', { demolitionWorkName, matchCount: demolitionCatalogItems.length });
          
          if (demolitionCatalogItems.length > 0) {
            // 일위대가DB에서 매칭된 모든 철거공사 노임항목으로 행 생성
            demolitionCatalogItems.forEach((catItem) => {
              const demolitionRow = createDemolitionLaborRow(areaRow, catItem, damageAreaValue);
              newLaborRows.push(demolitionRow);
            });
          } else {
            // 일위대가DB에 없으면 기본 철거공사 행 생성
            console.log('[연동] 철거공사 일위대가DB 매칭 없음:', demolitionWorkName);
            const demolitionRow = createDemolitionLaborRow(areaRow, undefined, damageAreaValue);
            newLaborRows.push(demolitionRow);
          }
        }
      });

      // 빈 행 하나만 있는 경우 제거하고 새 행 추가
      setLaborCostRows(prev => {
        // 빈 행 필터링 (첫 행이 완전히 비어있으면 제거)
        const nonEmptyRows = prev.filter(row => 
          row.sourceAreaRowId || row.place || row.position || row.category || row.workName
        );
        
        return [...nonEmptyRows, ...newLaborRows];
      });
    }

    // 이미 연동된 행의 데이터 업데이트 (변경 시 동기화)
    // Reconcile 로직: 공사명 변경 시 기존 행 삭제 후 재생성 (일위대가DB 노임항목 재조회 필요)
    setLaborCostRows(prev => {
      // 1. Reconcile: 삭제 대상 행 필터링
      // - 연동된 복구면적 행이 삭제되었거나
      // - 공사명이 변경된 경우 기존 행 삭제 (새로 생성됨)
      const filteredRows = prev.filter(laborRow => {
        // 독립 행(수동 추가)은 유지
        if (!laborRow.isLinkedFromRecovery || !laborRow.sourceAreaRowId) return true;
        
        // 피해철거공사 행인지 확인 (demolition- 접두사)
        const isDemolitionRow = laborRow.sourceAreaRowId.startsWith('demolition-');
        const originalAreaRowId = isDemolitionRow 
          ? laborRow.sourceAreaRowId.replace('demolition-', '') 
          : laborRow.sourceAreaRowId;
        
        // 원본 복구면적 산출표 행 찾기
        const linkedAreaRow = rows.find(r => r.id === originalAreaRowId);
        
        // 원본 행이 삭제된 경우 → 노무비 행도 삭제
        if (!linkedAreaRow) {
          console.log('[Reconcile] 원본 복구면적 행 삭제됨 → 노무비 행 삭제:', laborRow.workName);
          return false;
        }
        
        if (isDemolitionRow) {
          // 철거공사 행: 원본 행이 더 이상 철거공사가 필요 없는 공사명이면 제거
          // 또한 공사명이 변경되었으면 제거 (새로 생성됨)
          const { demolitionWorkName } = getDemolitionMapping(linkedAreaRow.workType, linkedAreaRow.workName);
          const needsDemolition = needsDemolitionRow(linkedAreaRow.workType, linkedAreaRow.workName);
          
          // 공사명 변경 여부 확인 (철거공사의 workName은 demolitionWorkName과 매칭)
          if (laborRow.workName !== demolitionWorkName) {
            console.log('[Reconcile] 철거공사 공사명 변경 → 기존 행 삭제:', laborRow.workName, '→', demolitionWorkName);
            return false;
          }
          
          // 더 이상 철거공사 필요 없으면 삭제
          if (!needsDemolition) {
            console.log('[Reconcile] 철거공사 불필요 → 기존 행 삭제:', laborRow.workName);
            return false;
          }
          
          return true;
        } else {
          // 일반 연동 행: 공사명이 변경되었으면 삭제 (새로 생성됨)
          if (laborRow.workName !== linkedAreaRow.workName) {
            console.log('[Reconcile] 공사명 변경 → 기존 행 삭제:', laborRow.workName, '→', linkedAreaRow.workName);
            return false;
          }
          return true;
        }
      });
      
      // 2. 나머지 행 업데이트 (장소, 위치, 피해면적 동기화)
      return filteredRows.map(laborRow => {
        if (!laborRow.sourceAreaRowId) return laborRow;
        
        // 피해철거공사 행인지 확인 (demolition- 접두사)
        const isDemolitionRow = laborRow.sourceAreaRowId.startsWith('demolition-');
        const originalAreaRowId = isDemolitionRow 
          ? laborRow.sourceAreaRowId.replace('demolition-', '') 
          : laborRow.sourceAreaRowId;
        
        const linkedAreaRow = rows.find(r => r.id === originalAreaRowId);
        if (!linkedAreaRow) return laborRow;
        
        // 복구면적 값 (숫자로 변환)
        const damageAreaValue = Number(linkedAreaRow.repairArea) || 0;
        
        if (isDemolitionRow) {
          // 피해철거공사 행 업데이트 (장소, 위치, 피해면적만 동기화)
          const needsUpdate = 
            laborRow.place !== linkedAreaRow.category ||
            laborRow.position !== linkedAreaRow.location ||
            laborRow.damageArea !== damageAreaValue;
          
          if (needsUpdate) {
            return {
              ...laborRow,
              place: linkedAreaRow.category,
              position: linkedAreaRow.location,
              damageArea: damageAreaValue,
            };
          }
        } else {
          // 일반 행 업데이트 (장소, 위치, 피해면적만 - 공사명 변경은 위에서 삭제 후 재생성)
          const laborCategory = getLaborCategory(linkedAreaRow.workType, linkedAreaRow.workName);
          
          const needsUpdate = 
            laborRow.place !== linkedAreaRow.category ||
            laborRow.position !== linkedAreaRow.location ||
            laborRow.category !== laborCategory ||
            laborRow.damageArea !== damageAreaValue;
          
          if (needsUpdate) {
            return {
              ...laborRow,
              place: linkedAreaRow.category,
              position: linkedAreaRow.location,
              category: laborCategory,
              damageArea: damageAreaValue,
            };
          }
        }
        
        return laborRow;
      });
    });
  }, [rows, isLossPreventionCase, ilwidaegaCatalog]); // rows(복구면적 산출표), 케이스 타입, 일위대가 카탈로그 변경 시 실행

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
          workType: row.workType || "",
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
        
        // 기존 workType 값을 customWorkTypes에 추가
        const existingWorkTypes = latestEstimate.rows
          .map((row: any) => row.workType)
          .filter((wt: string) => wt && wt.trim() !== '');
        const uniqueWorkTypes = Array.from(new Set(existingWorkTypes)) as string[];
        if (uniqueWorkTypes.length > 0) {
          setCustomWorkTypes(prev => {
            const combined = Array.from(new Set([...prev, ...uniqueWorkTypes]));
            return combined;
          });
        }
        
        // 기존 workName 값을 customWorkNames에 추가 (마스터 데이터에 없는 것만)
        const existingWorkNames = latestEstimate.rows
          .map((row: any) => row.workName)
          .filter((wn: string) => wn && wn.trim() !== '');
        const uniqueWorkNames = Array.from(new Set(existingWorkNames)) as string[];
        if (uniqueWorkNames.length > 0) {
          setCustomWorkNames(prev => {
            const combined = Array.from(new Set([...prev, ...uniqueWorkNames]));
            return combined;
          });
        }
      } else {
        // 복구면적 데이터가 없으면 빈 행 생성
        addRow();
      }
      
      // 노무비 데이터 불러오기
      if (latestEstimate.estimate?.laborCostData && Array.isArray(latestEstimate.estimate.laborCostData)) {
        const loadedLaborRows = latestEstimate.estimate.laborCostData.map((row: any, index: number) => {
          const { rowIndex, ...rest } = row; // rowIndex 제거
          // 결정적 ID 사용: rowIndex 기반으로 일관된 ID 생성 (모든 뷰에서 동일)
          const stableIndex = typeof rowIndex === 'number' ? rowIndex : index;
          return {
            id: `labor-saved-${stableIndex}`,
            ...rest,
          };
        });
        setLaborCostRows(sortLaborRowsByCategory(loadedLaborRows));
        
        // 자재비 데이터 불러오기 (노무비 ID 매핑 후)
        // materialCostData가 객체(새 형식: {rows, vatIncluded}) 또는 배열(기존 형식)일 수 있음
        const materialData = latestEstimate.estimate?.materialCostData;
        const materialRowsData = Array.isArray(materialData) 
          ? materialData 
          : (materialData?.rows || []);
        
        if (materialRowsData.length > 0) {
          const loadedMaterialRows = materialRowsData.map((row: any, index: number) => {
            const { sourceLaborRowIndex, ...rest } = row; // sourceLaborRowIndex 제거
            
            // sourceLaborRowIndex를 사용하여 새로운 laborRow의 ID로 매핑
            const sourceLaborRowId = 
              typeof sourceLaborRowIndex === 'number' && sourceLaborRowIndex >= 0 
                ? loadedLaborRows[sourceLaborRowIndex]?.id 
                : undefined;
            
            // 결정적 ID 사용: 인덱스 기반으로 일관된 ID 생성 (모든 뷰에서 동일)
            return {
              id: `material-saved-${index}`,
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
          const loadedMaterialRows = materialRowsData.map((row: any, index: number) => {
            const { sourceLaborRowIndex, ...rest } = row;
            // 결정적 ID 사용: 인덱스 기반으로 일관된 ID 생성
            return {
              id: `material-saved-${index}`,
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
      setIsHydratedState(true);
      // 자동 동기화 활성화 - 데이터 로드 완료 후 새 행 생성 허용
      skipAutoSyncRef.current = false;
    } else {
      // 견적 데이터가 아예 없으면 빈 행만 생성
      addRow();
      isHydratedRef.current = true;
      setIsHydratedState(true);
      skipAutoSyncRef.current = false;
    }
  }, [latestEstimate, masterDataList, selectedCaseId]);

  // 빈 행 생성 함수 - 모든 선택 필드는 빈 값으로 시작
  const createBlankRow = (): AreaCalculationRow => ({
    id: `row-${Date.now()}-${Math.random()}`,
    category: "",
    location: "",
    workType: "",
    workName: "",
    damageWidth: "0000",
    damageHeight: "0000",
    damageArea: "0000",
    repairWidth: "0000",
    repairHeight: "0000",
    repairArea: "0000",
    note: "",
  });

  // 행 추가 (기존 호환성 유지)
  const addRow = () => {
    if (isReadOnly) return;
    setRows(prev => [...prev, createBlankRow()]);
  };

  // 장소 그룹화 헬퍼 함수 - 연속된 동일 장소를 그룹으로 묶음
  const groupRowsByCategory = (rowList: AreaCalculationRow[]) => {
    const groups: { category: string; rows: AreaCalculationRow[]; startIndex: number }[] = [];
    let currentGroup: { category: string; rows: AreaCalculationRow[]; startIndex: number } | null = null;
    
    rowList.forEach((row, index) => {
      if (!currentGroup || currentGroup.category !== row.category) {
        // 새 그룹 시작
        currentGroup = { category: row.category, rows: [row], startIndex: index };
        groups.push(currentGroup);
      } else {
        // 기존 그룹에 추가
        currentGroup.rows.push(row);
      }
    });
    
    return groups;
  };

  // 장소 추가 (새 장소 그룹 추가)
  const addLocation = () => {
    if (isReadOnly) return;
    setRows(prev => [...prev, createBlankRow()]);
  };

  // 특정 장소 그룹 내에 행 추가 (같은 장소 값으로)
  const addRowInCategory = (categoryValue: string, afterRowId: string) => {
    if (isReadOnly) return;
    const newRow = createBlankRow();
    newRow.category = categoryValue; // 같은 장소 값 설정
    
    setRows(prev => {
      const newRows = [...prev];
      const insertIndex = newRows.findIndex(r => r.id === afterRowId);
      if (insertIndex !== -1) {
        // 해당 행 뒤에 삽입
        newRows.splice(insertIndex + 1, 0, newRow);
      } else {
        newRows.push(newRow);
      }
      return newRows;
    });
  };

  // 특정 행 삭제 (장소 그룹 내 행 삭제) + 연동된 노무비/자재비도 삭제
  const deleteRowById = (rowId: string) => {
    if (isReadOnly) return;
    
    // 연동된 노무비 행 삭제 (원래 행 + 철거공사 행)
    setLaborCostRows(prev => prev.filter(row => 
      row.sourceAreaRowId !== rowId && row.sourceAreaRowId !== `${rowId}::demolition`
    ));
    
    // 연동된 자재비 행 삭제 또는 업데이트 (sourceAreaRowId/sourceAreaRowIds 기준)
    setMaterialRows(prev => {
      return prev.map(row => {
        // sourceAreaRowId가 직접 매칭되는 경우
        if (row.sourceAreaRowId === rowId) {
          const updatedIds = (row.sourceAreaRowIds || []).filter(id => id !== rowId);
          if (updatedIds.length === 0) {
            return { ...row, _delete: true };
          }
          return { ...row, sourceAreaRowId: updatedIds[0], sourceAreaRowIds: updatedIds };
        }
        // sourceAreaRowIds 배열에 포함된 경우
        if (row.sourceAreaRowIds && row.sourceAreaRowIds.includes(rowId)) {
          const updatedIds = row.sourceAreaRowIds.filter(id => id !== rowId);
          if (updatedIds.length === 0) {
            return { ...row, _delete: true };
          }
          return { ...row, sourceAreaRowId: updatedIds[0], sourceAreaRowIds: updatedIds };
        }
        return row;
      }).filter(row => !(row as any)._delete);
    });
    
    // 복구면적 행 삭제
    setRows(prev => prev.filter(row => row.id !== rowId));
    
    console.log('[연동] 복구면적 행 삭제 → 노무비/자재비 연동 삭제:', rowId);
  };

  // 선택된 행 삭제 (체크박스 기반) + 연동된 노무비/자재비도 삭제
  const deleteSelectedRows = () => {
    if (isReadOnly) return;
    if (selectedRows.size === 0) return;
    
    const rowIdsToDelete = Array.from(selectedRows);
    
    // 연동된 노무비 행 삭제
    setLaborCostRows(prev => prev.filter(row => {
      if (!row.sourceAreaRowId) return true;
      // 원래 행 또는 철거공사 행인지 확인
      const baseRowId = row.sourceAreaRowId.replace('::demolition', '');
      return !rowIdsToDelete.includes(baseRowId);
    }));
    
    // 연동된 자재비 행 삭제 또는 업데이트 (sourceAreaRowId/sourceAreaRowIds 기준)
    setMaterialRows(prev => {
      return prev.map(row => {
        // sourceAreaRowId가 삭제 대상에 포함된 경우
        if (row.sourceAreaRowId && rowIdsToDelete.includes(row.sourceAreaRowId)) {
          const updatedIds = (row.sourceAreaRowIds || []).filter(id => !rowIdsToDelete.includes(id));
          if (updatedIds.length === 0) {
            return { ...row, _delete: true };
          }
          return { ...row, sourceAreaRowId: updatedIds[0], sourceAreaRowIds: updatedIds };
        }
        // sourceAreaRowIds 배열에 삭제 대상이 포함된 경우
        if (row.sourceAreaRowIds && row.sourceAreaRowIds.some(id => rowIdsToDelete.includes(id))) {
          const updatedIds = row.sourceAreaRowIds.filter(id => !rowIdsToDelete.includes(id));
          if (updatedIds.length === 0) {
            return { ...row, _delete: true };
          }
          return { ...row, sourceAreaRowId: updatedIds[0], sourceAreaRowIds: updatedIds };
        }
        return row;
      }).filter(row => !(row as any)._delete);
    });
    
    // 복구면적 행 삭제
    setRows(prev => prev.filter(row => !selectedRows.has(row.id)));
    setSelectedRows(new Set());
    
    console.log('[연동] 복구면적 행 일괄 삭제 → 노무비/자재비 연동 삭제:', rowIdsToDelete);
  };

  // 드래그 앤 드롭 핸들러 (복구면적 산출표)
  const handleDragStart = (e: React.DragEvent, rowId: string) => {
    if (isReadOnly) return;
    setDraggedRowId(rowId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', rowId);
  };

  const handleDragOver = (e: React.DragEvent, rowId: string) => {
    e.preventDefault();
    if (draggedRowId && draggedRowId !== rowId) {
      setDragOverRowId(rowId);
    }
  };

  const handleDragLeave = () => {
    setDragOverRowId(null);
  };

  const handleDrop = (e: React.DragEvent, targetRowId: string) => {
    e.preventDefault();
    const sourceRowId = e.dataTransfer.getData('text/plain');
    
    if (!sourceRowId || sourceRowId === targetRowId) {
      setDraggedRowId(null);
      setDragOverRowId(null);
      return;
    }

    setRows(prev => {
      const newRows = [...prev];
      const draggedIndex = newRows.findIndex(r => r.id === sourceRowId);
      const targetIndex = newRows.findIndex(r => r.id === targetRowId);
      
      if (draggedIndex !== -1 && targetIndex !== -1) {
        const [draggedRow] = newRows.splice(draggedIndex, 1);
        newRows.splice(targetIndex, 0, draggedRow);
      }
      return newRows;
    });

    setDraggedRowId(null);
    setDragOverRowId(null);
  };

  const handleDragEnd = () => {
    setDraggedRowId(null);
    setDragOverRowId(null);
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

  // 걸레받이/몰딩 여부 체크 함수
  const isLinearWorkName = (workName: string): boolean => {
    return workName === '걸레받이' || workName === '몰딩';
  };

  // 행 업데이트
  const updateRow = (rowId: string, field: keyof AreaCalculationRow, value: string) => {
    // 읽기 전용 모드에서는 업데이트 불가
    if (isReadOnly) return;
    
    // 현재 행의 인덱스 찾기 (노무비/자재비 연동용)
    const currentRowIndex = rows.findIndex(r => r.id === rowId);
    
    setRows(prev => prev.map(row => {
      if (row.id === rowId) {
        const updated = { ...row, [field]: value };
        
        // 공사명이 걸레받이/몰딩으로 변경되면 세로를 1로 고정
        if (field === 'workName' && isLinearWorkName(value)) {
          updated.damageHeight = '1';
          updated.repairHeight = '1';
          // 면적 재계산 (가로 값 그대로 표시)
          const damageWidth = parseFloat(updated.damageWidth) || 0;
          const repairWidth = parseFloat(updated.repairWidth) || 0;
          updated.damageArea = damageWidth > 0 ? damageWidth.toString() : '0';
          updated.repairArea = repairWidth > 0 ? repairWidth.toString() : '0';
        }
        
        // 공사명 변경 시 노무비/자재비 자동 연동 (공종이 이미 설정된 경우)
        if (field === 'workName' && updated.workType && value) {
          // 복구면적 값 가져오기
          const repairAreaValue = parseFloat(updated.repairArea) || 0;
          // 동기 방식으로 연동 (setLaborCostRows/setMaterialRows 내부에서 중복 체크)
          syncAreaRowToLaborAndMaterial(updated.workType, value, rowId, repairAreaValue);
        }
        
        // 공종 변경 시 노무비/자재비 자동 연동 (공사명이 이미 설정된 경우)
        if (field === 'workType' && updated.workName && value) {
          const repairAreaValue = parseFloat(updated.repairArea) || 0;
          syncAreaRowToLaborAndMaterial(value, updated.workName, rowId, repairAreaValue);
        }
        
        // 가로/세로 변경 시 면적 자동 계산
        if (field === 'damageWidth' || field === 'damageHeight') {
          const currentWorkName = updated.workName || row.workName;
          const width = parseFloat(field === 'damageWidth' ? value : row.damageWidth) || 0;
          
          if (isLinearWorkName(currentWorkName)) {
            // 걸레받이/몰딩: 세로 1 고정, 면적 = 가로 값 그대로
            updated.damageHeight = '1';
            updated.damageArea = width > 0 ? width.toString() : '0';
          } else {
            // 일반: mm -> m 변환하여 m² 계산 (1000mm = 1m)
            const height = parseFloat(field === 'damageHeight' ? value : row.damageHeight) || 0;
            const widthM = width / 1000;
            const heightM = height / 1000;
            const area = (widthM * heightM).toFixed(2);
            updated.damageArea = area;
          }
        }
        
        if (field === 'repairWidth' || field === 'repairHeight') {
          const currentWorkName = updated.workName || row.workName;
          const width = parseFloat(field === 'repairWidth' ? value : row.repairWidth) || 0;
          
          if (isLinearWorkName(currentWorkName)) {
            // 걸레받이/몰딩: 세로 1 고정, 면적 = 가로 값 그대로
            updated.repairHeight = '1';
            updated.repairArea = width > 0 ? width.toString() : '0';
          } else {
            // 일반: mm -> m 변환하여 m² 계산 (1000mm = 1m)
            const height = parseFloat(field === 'repairHeight' ? value : row.repairHeight) || 0;
            const widthM = width / 1000;
            const heightM = height / 1000;
            const area = (widthM * heightM).toFixed(2);
            updated.repairArea = area;
          }
          
          // 복구면적 변경 시 자재비 수량 업데이트 (공종과 공사명이 설정된 경우)
          if (updated.workType && updated.workName) {
            const repairAreaValue = parseFloat(updated.repairArea) || 0;
            // setTimeout으로 비동기 호출하여 rows 상태 업데이트 후 실행
            setTimeout(() => {
              syncAreaRowToLaborAndMaterial(updated.workType, updated.workName, rowId, repairAreaValue);
            }, 0);
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

    const unitPrice = selectedMaterial.standardPrice || 0;
    const newRow: MaterialRow = {
      id: `material-${Date.now()}-${Math.random()}`,
      공사명: '', // 수동 추가 시 공사명은 빈 값
      공종: selectedMaterialName, // 선택된 공종 사용
      자재항목: selectedMaterial.materialName,
      자재: selectedMaterial.materialName,
      규격: selectedMaterial.specification,
      단위: selectedMaterial.unit,
      단가: unitPrice,
      기준단가: unitPrice,
      수량m2: 0,
      수량EA: 1,
      수량: 1,
      합계: unitPrice,
      금액: unitPrice,
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

  // 피해면적 산출표에서 불러온 면적을 자재비의 해당 공종 수량에 반영
  const handleAreaImportToMaterial = (workType: string, totalArea: number) => {
    if (!workType || totalArea <= 0) return;
    
    setMaterialRows(prev => 
      prev.map(row => {
        // 공종이 일치하는 자재비 행의 수량을 업데이트
        if (row.공종 === workType) {
          const updatedRow = { ...row, 수량: totalArea };
          // 금액 재계산
          updatedRow.금액 = updatedRow.수량 * updatedRow.기준단가;
          return updatedRow;
        }
        return row;
      })
    );
  };
  
  // 철거공사 행도 함께 생성해야 하는 공사명 목록
  // 사용자가 이 공사명들을 선택하면 '철거공사' 공종으로 추가 행 생성
  const DEMOLITION_REQUIRED_WORK_NAMES = ['합판', '반자틀', '석고보드', '도배', '마루', '장판'];
  
  // 노무비 행 생성 또는 업데이트 헬퍼 (중복 방지 및 정렬 포함)
  const createOrUpdateLaborRow = (
    workType: string,
    workName: string,
    sourceRowId: string,
    matchingLaborItems: typeof laborCatalog
  ) => {
    const laborItem = matchingLaborItems.length > 0 ? matchingLaborItems[0] : null;
    const isSingleMatch = matchingLaborItems.length === 1;
    const detailItem = isSingleMatch && laborItem ? (laborItem.세부항목 || '') : '';
    const unitPrice = isSingleMatch && laborItem ? (laborItem.단가_인 || 0) : 0;
    
    setLaborCostRows(prev => {
      // 이미 같은 sourceAreaRowId를 가진 행이 있는지 확인
      const existingRowIndex = prev.findIndex(r => r.sourceAreaRowId === sourceRowId);
      
      if (existingRowIndex !== -1) {
        // 기존 행이 있으면 공종/공사명만 업데이트 (사용자 입력은 유지)
        const existingRow = prev[existingRowIndex];
        if (existingRow.category === workType && existingRow.workName === workName) {
          // 동일하면 변경 없음
          return prev;
        }
        
        console.log('[연동] 노무비 행 업데이트:', existingRow.category, existingRow.workName, '→', workType, workName);
        
        const updatedRows = [...prev];
        updatedRows[existingRowIndex] = {
          ...existingRow,
          category: workType,
          workName: workName,
          // DB 매칭이 있으면 세부항목/단가도 업데이트
          detailItem: matchingLaborItems.length > 0 ? detailItem : existingRow.detailItem,
          standardPrice: matchingLaborItems.length > 0 ? unitPrice : existingRow.standardPrice,
          unit: isSingleMatch && laborItem ? (laborItem.단위 || '인') : existingRow.unit,
          pricePerSqm: matchingLaborItems.length > 0 ? unitPrice : existingRow.pricePerSqm,
          amount: matchingLaborItems.length > 0 ? Math.round(unitPrice * existingRow.quantity) : existingRow.amount,
        };
        return sortLaborRowsByCategory(updatedRows);
      }
      
      // 새 행 생성 (DB 매칭이 없어도 빈 행으로 생성)
      const newLaborRow: LaborCostRow = {
        id: `labor-${Date.now()}-${Math.random()}`,
        sourceAreaRowId: sourceRowId,
        place: '',
        position: '',
        category: workType,
        workName: workName,
        detailWork: '노무비',
        detailItem: detailItem,
        priceStandard: '',
        unit: isSingleMatch && laborItem ? (laborItem.단위 || '인') : '',
        standardPrice: unitPrice,
        quantity: 1,
        applicationRates: { ceiling: false, wall: false, floor: false, molding: false },
        salesMarkupRate: 0,
        pricePerSqm: unitPrice,
        damageArea: 0,
        deduction: 0,
        includeInEstimate: false,
        request: '',
        amount: Math.round(unitPrice * 1),
      };
      
      console.log('[연동] 노무비 행 생성:', workType, workName, 
        matchingLaborItems.length > 0 
          ? (isSingleMatch ? `자동: ${detailItem} ${unitPrice}원` : `수동선택필요 (${matchingLaborItems.length}개 옵션)`)
          : '(DB 매칭 없음)');
      return sortLaborRowsByCategory([...prev, newLaborRow]);
    });
  };
  
  // 노무비 DB에서 해당 공종의 노무비 항목 찾기 (폴백 로직 포함)
  // OLD 형식 Excel에서는 개별 공사명(몰딩, 반자틀 등)이 세부공사='일위대가'로 되어 있고,
  // 노무비 항목은 '공종-공종-노무비' 구조로 되어 있음 (예: 목공사-목공사-노무비)
  // 예외: 피해철거공사-피해철거-노무비 (공사명이 공종과 다름)
  const findLaborItemsWithFallback = (
    normalizedWorkType: string, 
    normalizedWorkName: string
  ): typeof laborCatalog => {
    // 1순위: 정확한 매칭 (공종+공사명+세부공사=노무비)
    let items = laborCatalog.filter(item => 
      normalizeForMatch(item.공종) === normalizedWorkType && 
      normalizeForMatch(item.공사명) === normalizedWorkName &&
      item.세부공사 === '노무비'
    );
    
    if (items.length > 0) {
      console.log('[연동] 정확한 노무비 매칭:', normalizedWorkType, normalizedWorkName, `${items.length}개`);
      return items;
    }
    
    // 2순위: 같은 공종의 카테고리 노무비로 폴백 (예: 목공사-몰딩 → 목공사-목공사-노무비)
    items = laborCatalog.filter(item => 
      normalizeForMatch(item.공종) === normalizedWorkType && 
      normalizeForMatch(item.공사명) === normalizedWorkType && // 공사명이 공종과 동일한 항목
      item.세부공사 === '노무비'
    );
    
    if (items.length > 0) {
      console.log('[연동] 카테고리 노무비로 폴백:', normalizedWorkType, normalizedWorkName, 
        `→ ${items[0].공종}-${items[0].공사명}-${items[0].세부공사} (${items.length}개 옵션)`);
      return items;
    }
    
    // 3순위: 공종이 공사명으로 시작하는 경우 (예: 피해철거공사 → 피해철거공사-피해철거-노무비)
    items = laborCatalog.filter(item => 
      normalizeForMatch(item.공종) === normalizedWorkType && 
      normalizedWorkType.startsWith(normalizeForMatch(item.공사명)) && // 공종이 공사명으로 시작
      item.세부공사 === '노무비'
    );
    
    if (items.length > 0) {
      console.log('[연동] 부분 매칭 노무비로 폴백:', normalizedWorkType, normalizedWorkName, 
        `→ ${items[0].공종}-${items[0].공사명}-${items[0].세부공사} (${items.length}개 옵션)`);
      return items;
    }
    
    console.log('[연동] 노무비 매칭 없음:', normalizedWorkType, normalizedWorkName);
    return [];
  };
  
  // 자재비 단위 규격 상수 (공사명별 자재 규격)
  // type: 'length' = 길이(m) 기준, 'area' = 면적(㎡) 기준
  const MATERIAL_UNIT_RATIOS: Record<string, { type: 'length' | 'area'; unitSize: number; unit: string }> = {
    '몰딩': { type: 'length', unitSize: 2.44, unit: 'EA' },        // 한 개 길이 2.44m
    '걸레받이': { type: 'length', unitSize: 2.44, unit: 'EA' },   // 한 개 길이 2.44m
    '합판': { type: 'area', unitSize: 1.65, unit: 'EA' },          // 한 장 면적 1.65㎡
    '석고보드': { type: 'area', unitSize: 1.62, unit: 'EA' },      // 한 장 면적 1.62㎡
    '석고': { type: 'area', unitSize: 1.62, unit: 'EA' },          // 석고보드와 동일
  };
  
  // 자재비 수량 계산 헬퍼 함수
  // workName: 공사명, totalArea: 복구면적(㎡), totalLength: 복구 길이(m, 몰딩/걸레받이용)
  const computeMaterialQuantity = (workName: string, totalArea: number, totalLength?: number): { quantity: number; quantityEA: number; unit: string } => {
    const ratio = MATERIAL_UNIT_RATIOS[workName];
    
    if (ratio) {
      // 공사명별 단위 규격 적용
      const baseValue = ratio.type === 'length' ? (totalLength || totalArea) : totalArea;
      const calculatedQty = Math.ceil(baseValue / ratio.unitSize); // 올림
      console.log(`[자재비 수량] ${workName}: ${baseValue} ÷ ${ratio.unitSize} = ${baseValue / ratio.unitSize} → 올림 → ${calculatedQty} ${ratio.unit}`);
      return { 
        quantity: calculatedQty, 
        quantityEA: calculatedQty,
        unit: ratio.unit 
      };
    }
    
    // 규격 없는 경우 면적 그대로 사용
    return { 
      quantity: Math.round(totalArea * 10) / 10, 
      quantityEA: 0,
      unit: '㎡' 
    };
  };
  
  // 복구면적 산출표 → 노무비/자재비 자동 연동 함수 (일위대가DB 기반)
  // 일위대가DB에서 공종+공사명으로 조회하여 ALL matching 노임항목 행을 자동 생성
  const syncAreaRowToLaborAndMaterial = (workType: string, workName: string, sourceRowId: string, repairArea?: number) => {
    if (!workType || !workName) return;
    
    // 중복 호출 방지: 같은 공종+공사명에 대한 동기화가 진행 중이면 건너뛰기
    const materialSyncKey = `${workType}|${workName}`;
    if (materialSyncInProgressRef.current.has(materialSyncKey)) {
      console.log('[자재비 동기화] 중복 호출 방지:', materialSyncKey);
      return;
    }
    materialSyncInProgressRef.current.add(materialSyncKey);
    // 동기화 완료 후 제거 (다음 렌더 사이클에서)
    setTimeout(() => {
      materialSyncInProgressRef.current.delete(materialSyncKey);
    }, 100);
    
    // 면적 합산 대상 공사명: 도배, 마루, 장판, 합판, 석고보드, 석고
    const areaAggregationWorkNames = ['도배', '마루', '장판', '합판', '석고보드', '석고'];
    // 길이(m) 합산 대상 공사명: 몰딩, 걸레받이
    const lengthAggregationWorkNames = ['몰딩', '걸레받이'];
    
    // 기본값: 전달받은 repairArea 사용
    let totalMaterialArea = repairArea || 0;
    let totalMaterialLength = repairArea || 0; // 몰딩/걸레받이는 가로값이 길이(m)
    
    if (areaAggregationWorkNames.includes(workName)) {
      // 같은 공사명의 모든 행에서 면적 합산 (천장 ×1.3 적용 안 함 - 자재비는 실면적 기준)
      // 주의: rows 상태가 stale할 수 있으므로, 현재 행의 값(repairArea)을 별도로 반영
      let sumArea = 0;
      let currentRowIncluded = false;
      
      rows.forEach(row => {
        if (row.workName === workName) {
          if (row.id === sourceRowId) {
            // 현재 편집 중인 행: 전달받은 repairArea 사용 (최신값)
            sumArea += (repairArea || 0);
            currentRowIncluded = true;
          } else {
            // 다른 행: rows 상태에서 읽기
            const rowArea = parseFloat(row.repairArea) || 0;
            sumArea += rowArea;
          }
        }
      });
      
      // 현재 행이 rows에 없는 경우 (새로 추가되는 경우) repairArea 추가
      if (!currentRowIncluded && repairArea) {
        sumArea += repairArea;
      }
      
      if (sumArea > 0) {
        totalMaterialArea = Math.round(sumArea * 10) / 10;
      }
      console.log(`[자재비 수량] ${workName} 전체 면적 합계: ${totalMaterialArea}㎡ (rows: ${rows.filter(r => r.workName === workName).length}개, 현재행포함: ${currentRowIncluded})`);
    } else if (lengthAggregationWorkNames.includes(workName)) {
      // 몰딩/걸레받이: 길이 합산 (repairArea 필드 값은 mm 단위 → m로 변환: ÷1000)
      let sumLengthMm = 0; // mm 단위 합계
      let currentRowIncluded = false;
      
      rows.forEach(row => {
        if (row.workName === workName) {
          if (row.id === sourceRowId) {
            // 현재 편집 중인 행: 전달받은 repairArea 사용 (mm 단위)
            sumLengthMm += (repairArea || 0);
            currentRowIncluded = true;
          } else {
            // 다른 행: rows 상태에서 읽기 (mm 단위)
            const rowLengthMm = parseFloat(row.repairArea) || 0;
            sumLengthMm += rowLengthMm;
          }
        }
      });
      
      // 현재 행이 rows에 없는 경우 (새로 추가되는 경우) repairArea 추가
      if (!currentRowIncluded && repairArea) {
        sumLengthMm += repairArea;
      }
      
      // mm → m 변환 (÷1000)
      if (sumLengthMm > 0) {
        const sumLengthM = sumLengthMm / 1000;
        totalMaterialLength = Math.round(sumLengthM * 100) / 100; // 소수점 둘째 자리
        totalMaterialArea = totalMaterialLength; // computeMaterialQuantity에서 사용
      }
      console.log(`[자재비 수량] ${workName} 전체 길이 합계: ${sumLengthMm}mm → ${totalMaterialLength}m (rows: ${rows.filter(r => r.workName === workName).length}개, 현재행포함: ${currentRowIncluded})`);
    }
    
    console.log('[일위대가 연동] 복구면적 → 노무비:', workType, workName);
    
    // 일위대가DB에서 공종+공사명으로 ALL matching 노임항목 조회
    // 정규화된 비교 사용 (공백, 대소문자 등 무시)
    const normalizedWorkType = normalizeForMatch(workType);
    const normalizedWorkName = normalizeForMatch(workName);
    
    const matchingIlwidaegaItems = ilwidaegaCatalog.filter(item => {
      const itemWorkType = normalizeForMatch(item.공종 || '');
      const itemWorkName = normalizeForMatch(item.공사명 || '');
      return itemWorkType === normalizedWorkType && itemWorkName === normalizedWorkName;
    });
    
    console.log('[일위대가 연동] 매칭된 노임항목:', matchingIlwidaegaItems.length, '개',
      matchingIlwidaegaItems.map(item => `${item.노임항목}(E:${item.노임단가}원)`).join(', '));
    
    // 노무비 행 생성/업데이트 (일위대가DB 기반)
    // 중복 제거: 같은 공종+공사명+노임항목은 하나의 행만 유지
    setLaborCostRows(prev => {
      // 현재 sourceRowId를 가진 행 제거 (재생성을 위해)
      let filteredRows = prev.filter(r => 
        r.sourceAreaRowId !== sourceRowId && 
        !r.sourceAreaRowId?.startsWith(`${sourceRowId}::`)
      );
      
      // 이미 같은 공종+공사명으로 연동된 노무비 행들 (다른 sourceAreaRowId, 철거 제외)
      const existingSameWorkLaborRows = filteredRows.filter(r => 
        r.isLinkedFromRecovery && 
        r.category === workType && 
        r.workName === workName &&
        !r.sourceAreaRowId?.includes('::demolition')
      );
      
      // 이미 같은 철거공사+공사명으로 연동된 철거 행들 (다른 sourceAreaRowId)
      const { demolitionWorkName } = getDemolitionMapping(workType, workName);
      const existingSameDemolitionRows = filteredRows.filter(r => 
        r.isLinkedFromRecovery && 
        r.category === '철거공사' && 
        r.workName === demolitionWorkName
      );
      
      // 중복 체크: 이미 같은 공종+공사명 노무비 행이 있으면 새로 생성하지 않음
      // (rows 상태가 stale할 수 있으므로 filteredRows만으로 판단)
      if (existingSameWorkLaborRows.length > 0) {
        console.log('[일위대가 연동] 중복 건너뛰기: 이미 같은 공종+공사명 노무비 행 존재', 
          workType, workName, existingSameWorkLaborRows.length, '개',
          existingSameDemolitionRows.length > 0 ? `(철거도 존재: ${existingSameDemolitionRows.length}개)` : '');
        
        // 조기 반환 시에도 중복 제거 적용 (이미 존재하는 중복 행 제거)
        const seenEarly = new Set<string>();
        const deduplicatedFilteredRows = filteredRows.filter(row => {
          if (!row.isLinkedFromRecovery) return true;
          const key = `${row.category}|${row.workName}|${row.detailItem}`;
          if (seenEarly.has(key)) {
            console.log('[일위대가 연동] 기존 중복 행 제거:', row.category, row.workName, row.detailItem);
            return false;
          }
          seenEarly.add(key);
          return true;
        });
        
        // 복구면적은 useEffect에서 calculateRecoveryAreaByWorkName으로 자동 계산됨
        return deduplicatedFilteredRows;
      }
      
      // 독립 추가 행은 유지 (isLinkedFromRecovery = false이고 sourceAreaRowId가 없는 행)
      const newLaborRows: LaborCostRow[] = [];
      
      if (matchingIlwidaegaItems.length > 0) {
        // 일위대가DB에서 매칭된 모든 노임항목으로 행 생성
        matchingIlwidaegaItems.forEach((catalogItem, idx) => {
          // D = 기준작업량, E = 노임단가(인당)
          const D = catalogItem.기준작업량 || 0;
          const E = catalogItem.노임단가 || 0;
          
          // 복구면적 = 전달받은 repairArea (현재 행의 값)
          const currentRepairArea = repairArea || 0;
          
          // 중복 체크: 같은 공종+공사명+노임항목 행이 이미 있으면 건너뛰기
          const existingRow = filteredRows.find(r => 
            r.isLinkedFromRecovery && 
            r.category === workType && 
            r.workName === workName && 
            r.detailItem === catalogItem.노임항목
          );
          
          if (existingRow) {
            console.log('[일위대가 연동] 중복 행 건너뛰기:', workType, workName, catalogItem.노임항목);
            return; // 중복 - 건너뛰기
          }
          
          newLaborRows.push({
            id: `labor-ilwidaega-${Date.now()}-${Math.random()}-${idx}`,
            sourceAreaRowId: sourceRowId,
            isLinkedFromRecovery: true, // 복구면적에서 연동 생성된 행 (수정 불가)
            place: '',
            position: '',
            category: workType,
            workName: workName,
            detailWork: '일위대가',
            detailItem: catalogItem.노임항목 || '',
            priceStandard: '',
            unit: '㎡',
            standardPrice: E, // 노임단가 (E)
            standardWorkQuantity: D, // 기준작업량 (D)
            quantity: 1, // 초기값 1, useEffect에서 복구면적 기준으로 재계산됨
            applicationRates: { ceiling: false, wall: false, floor: false, molding: false },
            salesMarkupRate: 0,
            pricePerSqm: 0, // 초기값 0, useEffect에서 I/C로 계산됨
            damageArea: currentRepairArea, // 복구면적 (C) - repairArea 사용
            deduction: 0,
            includeInEstimate: true,
            request: '',
            amount: 0, // 초기값 0, useEffect에서 I로 계산됨
          });
        });
        console.log('[일위대가 연동] 노무비 행 생성:', workType, workName, 
          `${newLaborRows.length}개 노임항목 (${matchingIlwidaegaItems.map(i => i.노임항목).join(', ')})`);
      } else {
        // 일위대가DB에 없으면 빈 행 생성 (수동 입력용)
        const currentRepairArea = repairArea || 0;
        
        // 중복 체크: 이미 같은 공종+공사명 행이 있으면 건너뛰기
        const existingRow = filteredRows.find(r => 
          r.isLinkedFromRecovery && 
          r.category === workType && 
          r.workName === workName
        );
        
        if (!existingRow) {
          newLaborRows.push({
            id: `labor-manual-${Date.now()}-${Math.random()}`,
            sourceAreaRowId: sourceRowId,
            isLinkedFromRecovery: true,
            place: '',
            position: '',
            category: workType,
            workName: workName,
            detailWork: '일위대가',
            detailItem: '',
            priceStandard: '',
            unit: '㎡',
            standardPrice: 0,
            standardWorkQuantity: 0,
            quantity: 1,
            applicationRates: { ceiling: false, wall: false, floor: false, molding: false },
            salesMarkupRate: 0,
            pricePerSqm: 0,
            damageArea: currentRepairArea, // 복구면적 (C) - repairArea 사용
            deduction: 0,
            includeInEstimate: true,
            request: '',
            amount: 0,
          });
          console.log('[일위대가 연동] 노무비 행 생성 (DB 매칭 없음):', workType, workName);
        }
      }
      
      // 2. 특정 공사명인 경우 철거공사 행도 추가 생성 (일위대가DB 철거공사 조회)
      const isDemolitionRequired = DEMOLITION_REQUIRED_WORK_NAMES.some(
        name => normalizeForMatch(name) === normalizedWorkName
      );
      
      if (isDemolitionRequired && workType !== '철거공사') {
        // 일위대가DB 철거공사에서 매칭 아이템 찾기
        const { demolitionWorkName } = getDemolitionMapping(workType, workName);
        
        // 중복 체크: 이미 같은 철거공사+공사명 행이 있으면 건너뛰기
        const existingDemolitionRows = filteredRows.filter(r => 
          r.isLinkedFromRecovery && 
          r.category === '철거공사' && 
          r.workName === demolitionWorkName
        );
        
        if (existingDemolitionRows.length > 0) {
          console.log('[일위대가 연동] 철거공사 중복 건너뛰기:', demolitionWorkName, existingDemolitionRows.length, '개 이미 존재');
          // 이미 철거공사 행이 존재하면 생성하지 않음
        } else {
          const demolitionCatalogItems = ilwidaegaCatalog.filter(item => {
            const itemWorkType = normalizeForMatch(item.공종 || '');
            const itemWorkName = normalizeForMatch(item.공사명 || '');
            return itemWorkType === normalizeForMatch('철거공사') && itemWorkName === normalizeForMatch(demolitionWorkName);
          });
          
          console.log('[일위대가 연동] 철거공사 조회 (일위대가DB):', demolitionWorkName, demolitionCatalogItems.length, '개 매칭');
          
          if (demolitionCatalogItems.length > 0) {
            // 일위대가DB에서 매칭된 모든 철거공사 노임항목으로 행 생성
            demolitionCatalogItems.forEach((catItem, idx) => {
              // D = 기준작업량, E = 노임단가(인당)
              const D = catItem.기준작업량 || 0;
              const E = catItem.노임단가 || 0;
              // 철거공사는 부모 행과 동일한 복구면적 사용
              const currentRepairArea = repairArea || 0;
              
              // 중복 체크: 같은 철거공사+공사명+노임항목 행이 이미 있으면 건너뛰기
              const existingRow = filteredRows.find(r => 
                r.isLinkedFromRecovery && 
                r.category === '철거공사' && 
                r.workName === demolitionWorkName && 
                r.detailItem === catItem.노임항목
              );
              
              if (existingRow) {
                console.log('[일위대가 연동] 철거공사 중복 행 건너뛰기:', demolitionWorkName, catItem.노임항목);
                return;
              }
              
              newLaborRows.push({
                id: `labor-demolition-${Date.now()}-${Math.random()}-${idx}`,
                sourceAreaRowId: `${sourceRowId}::demolition`,
                isLinkedFromRecovery: true,
                sourceWorkType: workType, // 부모 노무비 행의 공종 (복구면적 계산용)
                place: '',
                position: '',
                category: '철거공사', // 일위대가DB 기준
                workName: demolitionWorkName, // 일위대가DB 기준 (반자틀, 석고, 도배 등)
                detailWork: '일위대가',
                detailItem: catItem.노임항목 || '', // 노임항목 (보통인부)
                priceStandard: '',
                unit: '㎡',
                standardPrice: E, // 노임단가 (E)
                standardWorkQuantity: D, // 기준작업량 (D)
                quantity: 1, // 초기값 1, useEffect에서 복구면적 기준으로 재계산됨
                applicationRates: { ceiling: false, wall: false, floor: false, molding: false },
                salesMarkupRate: 0,
                pricePerSqm: 0, // 초기값 0, useEffect에서 I/C로 계산됨
                damageArea: currentRepairArea, // 복구면적 (C) - 부모 행과 동일
                deduction: 0,
                includeInEstimate: true,
                request: '',
                amount: 0, // 초기값 0, useEffect에서 I로 계산됨
              });
            });
            console.log('[일위대가 연동] 철거공사 행 생성:', '철거공사', demolitionWorkName,
              `${demolitionCatalogItems.length}개 노임항목 (sourceWorkType: ${workType})`);
          } else {
            // 일위대가DB에 없으면 기본 철거공사 행 생성
            console.log('[일위대가 연동] 철거공사 일위대가DB 매칭 없음:', demolitionWorkName);
            const currentRepairArea = repairArea || 0;
            
            newLaborRows.push({
              id: `labor-demolition-${Date.now()}-${Math.random()}`,
              sourceAreaRowId: `${sourceRowId}::demolition`,
              isLinkedFromRecovery: true,
              sourceWorkType: workType, // 부모 노무비 행의 공종 (복구면적 계산용)
              place: '',
              position: '',
              category: '철거공사',
              workName: demolitionWorkName,
              detailWork: '일위대가',
              detailItem: '보통인부',
              priceStandard: '',
              unit: '㎡',
              standardPrice: 0,
              standardWorkQuantity: 0,
              quantity: 1,
              applicationRates: { ceiling: false, wall: false, floor: false, molding: false },
              salesMarkupRate: 0,
              pricePerSqm: 0,
              damageArea: currentRepairArea, // 복구면적 (C) - 부모 행과 동일
              deduction: 0,
              includeInEstimate: true,
              request: '',
              amount: 0,
            });
          }
        }
      }
      
      // 최종 결과 생성
      const allRows = [...filteredRows, ...newLaborRows];
      
      // 중복 제거: 같은 공종+공사명+노임항목 조합은 첫 번째 행만 유지
      // (React 배치 처리로 인해 동시에 생성된 중복 방지)
      const seen = new Set<string>();
      const deduplicatedRows = allRows.filter(row => {
        // 연동되지 않은 수동 행은 중복 체크에서 제외
        if (!row.isLinkedFromRecovery) return true;
        
        const key = `${row.category}|${row.workName}|${row.detailItem}`;
        if (seen.has(key)) {
          console.log('[일위대가 연동] 중복 행 제거:', row.category, row.workName, row.detailItem);
          return false;
        }
        seen.add(key);
        return true;
      });
      
      return deduplicatedRows;
    });
    
    // 자재비 연동 대상 공사명 (이 공사명만 자재비에 연동됨)
    // 합판, 석고(석고보드), 몰딩, 걸레받이, 도배, 마루, 장판
    const MATERIAL_LINKED_WORK_NAMES = ['합판', '석고보드', '석고', '몰딩', '걸레받이', '도배', '마루', '장판'];
    const isMaterialLinkedWorkName = MATERIAL_LINKED_WORK_NAMES.some(
      name => normalizeForMatch(name) === normalizedWorkName
    );
    
    // 자재비 연동 대상 공사명이 아니면 자재비 생성 스킵
    if (!isMaterialLinkedWorkName) {
      console.log('[연동] 자재비 스킵 (연동 대상 아님):', workType, workName);
      return; // 자재비 생성하지 않음
    }
    
    // 자재비 DB에서 해당 공종+공사명의 자재 찾기 (materialByWorknameCatalog 사용)
    // materialByWorknameCatalog 구조:
    //   - 공종 = 원인공사, 목공사, 수장공사 등 (workType과 매칭)
    //   - 공사명 = 방수, 합판, 도배 등 (workName과 매칭)
    //   - 자재항목 = 실제 자재 이름
    
    // 1순위: 공종 + 공사명 모두 일치
    const exactMatch = materialByWorknameCatalog.filter(item => 
      normalizeForMatch(item.공종) === normalizedWorkType &&
      normalizeForMatch(item.공사명) === normalizedWorkName
    );
    
    // 2순위: 공종 일치 + 공사명이 부분 일치 (예: 석고보드 -> 석고) - exactMatch 제외
    const exactMatchIds = new Set(exactMatch.map(m => `${m.공종}|${m.공사명}|${m.자재항목}`));
    const partialWorkNameMatch = materialByWorknameCatalog.filter(item => {
      const itemWorkType = normalizeForMatch(item.공종);
      const itemWorkName = normalizeForMatch(item.공사명);
      const itemKey = `${item.공종}|${item.공사명}|${item.자재항목}`;
      
      // exactMatch에 포함된 항목은 제외
      if (exactMatchIds.has(itemKey)) return false;
      
      return itemWorkType === normalizedWorkType && (
        itemWorkName.includes(normalizedWorkName) ||
        normalizedWorkName.includes(itemWorkName)
      );
    });
    
    // 3순위: 공종만 일치
    const matchByWorkType = materialByWorknameCatalog.filter(item => 
      normalizeForMatch(item.공종) === normalizedWorkType
    );
    
    // 우선순위 적용
    const materialsToUse = exactMatch.length > 0 ? exactMatch :
                           partialWorkNameMatch.length > 0 ? partialWorkNameMatch :
                           matchByWorkType;
    
    console.log('[연동] 자재비 DB 조회:', workType, workName, '→ 매칭:', materialsToUse.length, '개',
      exactMatch.length > 0 ? '(정확 매칭)' : partialWorkNameMatch.length > 0 ? '(부분 매칭)' : '(공종만 매칭)');
    
    // 자재 행 생성/업데이트 (1개면 자동완성, 여러개면 드롭다운에서 선택)
    const isSingleMatch = materialsToUse.length === 1;
    const materialItem = materialsToUse.length > 0 ? materialsToUse[0] : null;
    const materialName = isSingleMatch && materialItem ? materialItem.자재항목 : '';
    const spec = isSingleMatch && materialItem ? (materialItem.규격 || '') : '';
    const unit = isSingleMatch && materialItem ? (materialItem.단위 || 'EA') : '';
    
    // 단가 처리: '입력', '직접입력' 문자열인 경우 직접입력 필요
    const priceValue = isSingleMatch && materialItem ? materialItem.금액 : null;
    const isManualPriceEntry = typeof priceValue === 'string' && 
      (priceValue.includes('입력') || priceValue === '입력' || priceValue === '직접입력');
    const unitPrice = isSingleMatch && materialItem && !isManualPriceEntry
      ? (typeof materialItem.금액 === 'number' ? materialItem.금액 : 0) 
      : 0;
    
    setMaterialRows(prev => {
      // 공종+공사명 기준으로 기존 자재비 행 찾기 (하나의 공종+공사명에 하나의 자재비 행)
      const existingRowIndex = prev.findIndex(r => 
        r.공종 === workType && r.공사명 === workName && r.isLinkedFromRecovery === true
      );
      
      // 수량 계산
      const { quantity: computedQty, quantityEA: computedEA, unit: computedUnit } = computeMaterialQuantity(workName, totalMaterialArea);
      const useEA = computedUnit === 'EA';
      
      if (existingRowIndex !== -1) {
        // 기존 행이 있으면 수량만 업데이트 (공종+공사명 당 1개 행 유지)
        const existingRow = prev[existingRowIndex];
        
        console.log('[연동] 자재비 행 업데이트:', workType, workName, `면적: ${totalMaterialArea}, 계산수량: ${computedQty}`);
        
        const updatedRows = [...prev];
        const newPrice = materialsToUse.length > 0 && !existingRow.자재항목 ? unitPrice : (existingRow.단가 || existingRow.기준단가 || 0);
        const newM2 = useEA ? 0 : computedQty;
        const newEA = useEA ? computedQty : 0;
        const totalQty = computedQty;
        
        updatedRows[existingRowIndex] = {
          ...existingRow,
          isLinkedFromRecovery: true,
          수량m2: newM2,
          수량EA: newEA,
          수량: totalQty,
          합계: Math.round(newPrice * totalQty),
          금액: Math.round(newPrice * totalQty),
          // sourceAreaRowIds 배열로 연결된 복구면적 행 추적 (삭제 시 사용)
          sourceAreaRowIds: Array.from(new Set([...(existingRow.sourceAreaRowIds || []), sourceRowId])),
        };
        return updatedRows;
      }
      
      // 새 행 생성 (공종+공사명별 1개만)
      const materialQuantity = computedQty;
      const materialAmount = Math.round(unitPrice * materialQuantity);
      
      const newMaterialRow: MaterialRow = {
        id: `material-linked-${Date.now()}-${Math.random()}`,
        공종: workType,
        공사명: workName,
        자재항목: materialName,
        자재: materialName,
        규격: spec,
        단위: useEA ? 'EA' : unit,
        단가: unitPrice,
        기준단가: unitPrice,
        수량m2: useEA ? 0 : materialQuantity,
        수량EA: useEA ? materialQuantity : 0,
        수량: materialQuantity,
        합계: materialAmount,
        금액: materialAmount,
        비고: '',
        sourceAreaRowId: sourceRowId, // 첫 번째 복구면적 행 ID
        sourceAreaRowIds: [sourceRowId], // 연결된 모든 복구면적 행 ID 배열
        isLinkedFromRecovery: true,
        isManualPriceEntry: isManualPriceEntry,
      };
      
      console.log('[연동] 자재비 행 생성:', workType, workName, 
        `면적: ${totalMaterialArea}, 계산수량: ${materialQuantity} ${computedUnit}`,
        materialsToUse.length > 0
          ? (isSingleMatch ? `자동: ${materialName} ${unitPrice}원` : `수동선택필요 (${materialsToUse.length}개 옵션)`)
          : '(DB 매칭 없음)');
      return [...prev, newMaterialRow];
    });
    
    // 표면마감재(도배/마루/장판)의 경우 같은 공사명의 모든 자재비 행 수량 동기화
    const surfaceFinishes = ['도배', '마루', '장판'];
    if (surfaceFinishes.includes(workName)) {
      // 약간의 지연 후 동기화 (상태 업데이트 완료 대기)
      setTimeout(() => {
        setMaterialRows(prev => {
          // 같은 공사명의 모든 행에서 최대 수량 찾기 (가장 최근 계산된 합계)
          const sameWorkNameRows = prev.filter(r => r.공사명 === workName);
          if (sameWorkNameRows.length <= 1) return prev;
          
          // 가장 큰 수량 값을 찾아서 동기화 (합계가 가장 큰 값)
          const maxQty = Math.max(...sameWorkNameRows.map(r => (r.수량m2 || 0) + (r.수량EA || 0)));
          
          console.log(`[자재비 수량 동기화] ${workName}: ${sameWorkNameRows.length}개 행 → 수량 ${maxQty}로 통일`);
          
          return prev.map(r => {
            if (r.공사명 === workName) {
              const currentQty = (r.수량m2 || 0) + (r.수량EA || 0);
              if (currentQty !== maxQty) {
                const newTotal = Math.round((r.단가 || r.기준단가 || 0) * maxQty);
                return { 
                  ...r, 
                  수량m2: maxQty, 
                  수량EA: 0, 
                  수량: maxQty, 
                  합계: newTotal, 
                  금액: newTotal 
                };
              }
            }
            return r;
          });
        });
      }, 100);
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
    if (isReadOnly) return;
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
        workType: row.workType || null,
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
            
            {/* 두 번째 줄: 접수번호, 피보험자, 담당자 */}
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
              <span>피보험자 {selectedCase.policyHolderName || selectedCase.clientName || "미정"}</span>
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
                  onClick={addLocation}
                  disabled={masterDataList.length === 0 || isReadOnly}
                  className="px-4 py-2 rounded-md flex items-center gap-2 hover-elevate active-elevate-2"
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 500,
                    background: (masterDataList.length === 0 || isReadOnly) ? "#f5f5f5" : "white",
                    color: (masterDataList.length === 0 || isReadOnly) ? "rgba(12, 12, 12, 0.3)" : "#008FED",
                    border: (masterDataList.length === 0 || isReadOnly) ? "1px solid rgba(12, 12, 12, 0.1)" : "1px solid #008FED",
                    cursor: (masterDataList.length === 0 || isReadOnly) ? "not-allowed" : "pointer",
                    opacity: (masterDataList.length === 0 || isReadOnly) ? 0.6 : 1,
                  }}
                  data-testid="button-add-location"
                >
                  장소추가
                </button>
                <button
                  type="button"
                  onClick={deleteSelectedRows}
                  disabled={selectedRows.size === 0 || isReadOnly}
                  className="px-4 py-2 rounded-md flex items-center gap-2 hover-elevate active-elevate-2"
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 500,
                    background: (selectedRows.size === 0 || isReadOnly) ? "#f5f5f5" : "#FF4D4F",
                    color: (selectedRows.size === 0 || isReadOnly) ? "rgba(12, 12, 12, 0.3)" : "white",
                    border: "none",
                    cursor: (selectedRows.size === 0 || isReadOnly) ? "not-allowed" : "pointer",
                    opacity: (selectedRows.size === 0 || isReadOnly) ? 0.6 : 1,
                  }}
                  data-testid="button-delete-rows"
                >
                  삭제
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
                        width: "40px", 
                        padding: "17.5px 8px",
                        borderRight: "1px solid rgba(12, 12, 12, 0.06)",
                      }}
                    >
                    </th>
                    <th 
                      style={{ 
                        width: "120px", 
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
                        width: "60px", 
                        padding: "17.5px 4px",
                        borderRight: "1px solid rgba(12, 12, 12, 0.06)",
                        fontFamily: "Pretendard", 
                        fontSize: "12px", 
                        fontWeight: 500, 
                        color: "rgba(12, 12, 12, 0.4)", 
                        textAlign: "center",
                      }}
                    >
                      +/-
                    </th>
                    <th 
                      style={{ 
                        width: "120px", 
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
                        width: "140px", 
                        padding: "17.5px 8px", 
                        fontFamily: "Pretendard", 
                        fontSize: "15px", 
                        fontWeight: 600, 
                        color: "rgba(12, 12, 12, 0.6)", 
                        textAlign: "center",
                        borderRight: "1px solid rgba(12, 12, 12, 0.06)",
                      }}
                    >
                      공종
                    </th>
                    <th 
                      style={{ 
                        width: "140px", 
                        padding: "17.5px 8px", 
                        fontFamily: "Pretendard", 
                        fontSize: "15px", 
                        fontWeight: 600, 
                        color: "rgba(12, 12, 12, 0.6)", 
                        textAlign: "center",
                        borderRight: "1px solid rgba(12, 12, 12, 0.06)",
                      }}
                    >공사명
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
                  {groupRowsByCategory(rows).map((group, groupIndex) => (
                    group.rows.map((row, rowIndexInGroup) => {
                      const globalIndex = group.startIndex + rowIndexInGroup;
                      const isFirstRowInGroup = rowIndexInGroup === 0;
                      const isLastRowInGroup = rowIndexInGroup === group.rows.length - 1;
                      
                      return (
                        <tr
                          key={row.id}
                          draggable={!isReadOnly}
                          onDragStart={(e) => handleDragStart(e, row.id)}
                          onDragOver={(e) => handleDragOver(e, row.id)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, row.id)}
                          onDragEnd={handleDragEnd}
                          style={{
                            borderBottom: isLastRowInGroup ? "2px solid rgba(12, 12, 12, 0.15)" : "1px solid rgba(12, 12, 12, 0.06)",
                            opacity: draggedRowId === row.id ? 0.5 : 1,
                            background: dragOverRowId === row.id ? "rgba(59, 130, 246, 0.1)" : undefined,
                            transition: "background 0.2s",
                          }}
                        >
                          {/* 체크박스 컬럼 - 그룹 첫 번째 행에만 rowspan 적용 */}
                          {isFirstRowInGroup && (
                            <td 
                              rowSpan={group.rows.length}
                              style={{ 
                                padding: "8px",
                                verticalAlign: "middle",
                                borderRight: "1px solid rgba(12, 12, 12, 0.06)",
                                background: "rgba(12, 12, 12, 0.02)",
                                textAlign: "center",
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={group.rows.every(r => selectedRows.has(r.id))}
                                onChange={() => {
                                  const allSelected = group.rows.every(r => selectedRows.has(r.id));
                                  const newSelected = new Set(selectedRows);
                                  group.rows.forEach(r => {
                                    if (allSelected) {
                                      newSelected.delete(r.id);
                                    } else {
                                      newSelected.add(r.id);
                                    }
                                  });
                                  setSelectedRows(newSelected);
                                }}
                                style={{ width: "16px", height: "16px", cursor: "pointer" }}
                                data-testid={`checkbox-group-${groupIndex}`}
                              />
                            </td>
                          )}
                          
                          {/* 장소 컬럼 - 그룹 첫 번째 행에만 rowspan 적용 */}
                          {isFirstRowInGroup && (
                            <td 
                              rowSpan={group.rows.length}
                              style={{ 
                                padding: "8px",
                                verticalAlign: "top",
                                borderRight: "1px solid rgba(12, 12, 12, 0.06)",
                                background: "rgba(12, 12, 12, 0.02)",
                              }}
                            >
                              <Select
                                value={row.category}
                                onValueChange={(value) => {
                                  group.rows.forEach(r => updateRow(r.id, 'category', value));
                                }}
                              >
                                <SelectTrigger 
                                  className="border focus:ring-0"
                                  style={{
                                    width: "100%",
                                    height: "40px",
                                    fontFamily: "Pretendard",
                                    fontSize: "14px",
                                    fontWeight: 600,
                                    borderColor: "rgba(12, 12, 12, 0.2)",
                                    borderRadius: "6px",
                                  }}
                                  data-testid={`select-category-${globalIndex}`}
                                >
                                  <SelectValue>
                                    {row.category || "장소 선택"}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  {roomCategories.filter(cat => cat && cat.trim() !== '').map(cat => (
                                    <SelectItem key={cat} value={cat}>
                                      {cat}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                          )}
                          
                          {/* +/- 버튼 컬럼 */}
                          <td style={{ padding: "4px", textAlign: "center", width: "60px" }}>
                            <div style={{ display: "flex", gap: "2px", justifyContent: "center" }}>
                              <button
                                type="button"
                                onClick={() => addRowInCategory(row.category, row.id)}
                                disabled={isReadOnly}
                                style={{
                                  width: "24px",
                                  height: "24px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  background: isReadOnly ? "#f5f5f5" : "#008FED",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "4px",
                                  cursor: isReadOnly ? "not-allowed" : "pointer",
                                  fontSize: "16px",
                                  fontWeight: "bold",
                                }}
                                data-testid={`button-add-row-${globalIndex}`}
                              >
                                +
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteRowById(row.id)}
                                disabled={isReadOnly || group.rows.length <= 1}
                                style={{
                                  width: "24px",
                                  height: "24px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  background: (isReadOnly || group.rows.length <= 1) ? "#f5f5f5" : "#FF4D4F",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "4px",
                                  cursor: (isReadOnly || group.rows.length <= 1) ? "not-allowed" : "pointer",
                                  fontSize: "16px",
                                  fontWeight: "bold",
                                }}
                                data-testid={`button-delete-row-${globalIndex}`}
                              >
                                −
                              </button>
                            </div>
                          </td>
                          
                          {/* 위치 */}
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
                                data-testid={`select-location-${globalIndex}`}
                              >
                                <SelectValue>
                                  {row.location || "위치 선택"}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {locations.filter(loc => loc && loc.trim() !== '').map(loc => (
                                  <SelectItem key={loc} value={loc}>
                                    {loc}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                      <td style={{ padding: "8px" }}>
                        <Select
                          value={row.workType || undefined}
                          onValueChange={(value) => {
                            // 공종 변경 시 공사명도 초기화
                            updateRow(row.id, 'workType', value);
                            updateRow(row.id, 'workName', '');
                          }}
                          disabled={!row.location}
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
                            data-testid={`select-worktype-${globalIndex}`}
                          >
                            <SelectValue placeholder="공종 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            {getWorkTypesByLocation(row.location).map(wt => (
                              <SelectItem key={wt} value={wt}>
                                {wt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td style={{ padding: "8px" }}>
                        <Select
                          value={row.workName || undefined}
                          onValueChange={(value) => updateRow(row.id, 'workName', value)}
                          disabled={!row.workType}
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
                            data-testid={`select-workname-${globalIndex}`}
                          >
                            <SelectValue placeholder="공사명 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            {getWorkNamesByWorkType(row.workType, row.location).filter(wn => wn && wn.trim() !== '').map(wn => (
                              <SelectItem key={wn} value={wn}>
                                {wn}
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
                          data-testid={`input-damage-width-${globalIndex}`}
                        />
                      </td>
                      <td style={{ padding: "8px" }}>
                        <input
                          type="text"
                          value={row.damageHeight}
                          onChange={(e) => updateRow(row.id, 'damageHeight', e.target.value)}
                          readOnly={isLinearWorkName(row.workName)}
                          className="input-focus-blue"
                          style={{
                            width: "100%",
                            padding: "8px",
                            fontFamily: "Pretendard",
                            fontSize: "14px",
                            border: "1px solid rgba(12, 12, 12, 0.1)",
                            borderRadius: "8px",
                            textAlign: "center",
                            background: isLinearWorkName(row.workName) ? "rgba(12, 12, 12, 0.02)" : undefined,
                          }}
                          data-testid={`input-damage-height-${globalIndex}`}
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
                          data-testid={`input-damage-area-${globalIndex}`}
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
                          data-testid={`input-repair-width-${globalIndex}`}
                        />
                      </td>
                      <td style={{ padding: "8px" }}>
                        <input
                          type="text"
                          value={row.repairHeight}
                          onChange={(e) => updateRow(row.id, 'repairHeight', e.target.value)}
                          readOnly={isLinearWorkName(row.workName)}
                          className="input-focus-blue"
                          style={{
                            width: "100%",
                            padding: "8px",
                            fontFamily: "Pretendard",
                            fontSize: "14px",
                            border: "1px solid rgba(12, 12, 12, 0.1)",
                            borderRadius: "8px",
                            textAlign: "center",
                            background: isLinearWorkName(row.workName) ? "rgba(12, 12, 12, 0.02)" : undefined,
                          }}
                          data-testid={`input-repair-height-${globalIndex}`}
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
                          data-testid={`input-repair-area-${globalIndex}`}
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
                          data-testid={`input-note-${globalIndex}`}
                        />
                          </td>
                        </tr>
                      );
                    })
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
                    {[estimateCase?.insuredAddress, (estimateCase as any)?.insuredAddressDetail].filter(Boolean).join(" ") || "-"}
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
                    disabled={isReadOnly}
                    style={{
                      padding: "6px 12px",
                      background: isReadOnly ? "#f5f5f5" : "white",
                      border: "1px solid rgba(12, 12, 12, 0.1)",
                      borderRadius: "4px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      cursor: isReadOnly ? "not-allowed" : "pointer",
                      opacity: isReadOnly ? 0.5 : 1,
                    }}
                    data-testid="button-add-row-area"
                  >
                    행 추가
                  </button>
                  <button
                    onClick={deleteSelectedRows}
                    disabled={isReadOnly}
                    style={{
                      padding: "6px 12px",
                      background: isReadOnly ? "#f5f5f5" : "white",
                      border: "1px solid rgba(12, 12, 12, 0.1)",
                      borderRadius: "4px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: isReadOnly ? "#ccc" : "#D02B20",
                      cursor: isReadOnly ? "not-allowed" : "pointer",
                      opacity: isReadOnly ? 0.5 : 1,
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
                        <th style={{ padding: "12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600, color: "rgba(12, 12, 12, 0.6)" }}>공종</th>
                        <th style={{ padding: "12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600, color: "rgba(12, 12, 12, 0.6)" }}>공사명</th>
                        <th style={{ padding: "12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600, color: "rgba(12, 12, 12, 0.6)" }}>피해면적 가로(mm)</th>
                        <th style={{ padding: "12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600, color: "rgba(12, 12, 12, 0.6)" }}>피해면적 세로(mm)</th>
                        <th style={{ padding: "12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600, color: "rgba(12, 12, 12, 0.6)" }}>피해면적(㎡)</th>
                        <th style={{ padding: "12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600, color: "rgba(12, 12, 12, 0.6)" }}>복구면적 가로(mm)</th>
                        <th style={{ padding: "12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600, color: "rgba(12, 12, 12, 0.6)" }}>복구면적 세로(mm)</th>
                        <th style={{ padding: "12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600, color: "rgba(12, 12, 12, 0.6)" }}>복구면적(㎡)</th>
                        <th style={{ padding: "12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600, color: "rgba(12, 12, 12, 0.6)" }}>비고</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, index) => (
                        <tr key={row.id} style={{ borderBottom: "1px solid rgba(12, 12, 12, 0.06)" }}>
                          <td style={{ padding: "8px", textAlign: "center" }}>
                            <input
                              type="checkbox"
                              checked={selectedRows.has(row.id)}
                              onChange={() => toggleRowSelection(row.id)}
                              data-testid={`checkbox-estimate-area-row-${index}`}
                            />
                          </td>
                          <td style={{ padding: "8px" }}>
                            <select
                              value={row.category || ""}
                              onChange={(e) => updateRow(row.id, 'category', e.target.value)}
                              style={{
                                width: "100%",
                                padding: "6px 8px",
                                border: "1px solid rgba(12, 12, 12, 0.1)",
                                borderRadius: "4px",
                                fontFamily: "Pretendard",
                                fontSize: "14px",
                                color: row.category ? "#0C0C0C" : "rgba(12, 12, 12, 0.4)",
                              }}
                            >
                              <option value="">선택</option>
                              {roomCategories.map((cat) => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                          </td>
                          <td style={{ padding: "8px" }}>
                            <select
                              value={row.location || ""}
                              onChange={(e) => updateRow(row.id, 'location', e.target.value)}
                              style={{
                                width: "100%",
                                padding: "6px 8px",
                                border: "1px solid rgba(12, 12, 12, 0.1)",
                                borderRadius: "4px",
                                fontFamily: "Pretendard",
                                fontSize: "14px",
                                color: row.location ? "#0C0C0C" : "rgba(12, 12, 12, 0.4)",
                              }}
                            >
                              <option value="">선택</option>
                              {locations.map((loc) => (
                                <option key={loc} value={loc}>{loc}</option>
                              ))}
                            </select>
                          </td>
                          <td style={{ padding: "8px" }}>
                            <select
                              value={row.workType || ""}
                              onChange={(e) => {
                                updateRow(row.id, 'workType', e.target.value);
                                updateRow(row.id, 'workName', '');
                              }}
                              disabled={!row.location}
                              style={{
                                width: "100%",
                                padding: "6px 8px",
                                border: "1px solid rgba(12, 12, 12, 0.1)",
                                borderRadius: "4px",
                                fontFamily: "Pretendard",
                                fontSize: "14px",
                                color: row.workType ? "#0C0C0C" : "rgba(12, 12, 12, 0.4)",
                              }}
                            >
                              <option value="">공종 선택</option>
                              {getWorkTypesByLocation(row.location).map((wt) => (
                                <option key={wt} value={wt}>{wt}</option>
                              ))}
                            </select>
                          </td>
                          <td style={{ padding: "8px" }}>
                            <select
                              value={row.workName || ""}
                              onChange={(e) => updateRow(row.id, 'workName', e.target.value)}
                              disabled={!row.workType}
                              style={{
                                width: "100%",
                                padding: "6px 8px",
                                border: "1px solid rgba(12, 12, 12, 0.1)",
                                borderRadius: "4px",
                                fontFamily: "Pretendard",
                                fontSize: "14px",
                                color: row.workName ? "#0C0C0C" : "rgba(12, 12, 12, 0.4)",
                              }}
                            >
                              <option value="">공사명 선택</option>
                              {getWorkNamesByWorkType(row.workType, row.location).map((work) => (
                                <option key={work} value={work}>{work}</option>
                              ))}
                            </select>
                          </td>
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
                          <td style={{ padding: "8px", fontFamily: "Pretendard", fontSize: "14px", textAlign: "right", background: "rgba(12, 12, 12, 0.02)" }}>{row.damageArea}</td>
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
                          <td style={{ padding: "8px" }}>
                            <input
                              type="text"
                              value={row.repairHeight}
                              onChange={(e) => updateRow(row.id, 'repairHeight', e.target.value)}
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
                onRowsChange={(newRows) => setLaborCostRows(sortLaborRowsByCategory(newRows))}
                catalog={laborCatalog}
                ilwidaegaCatalog={ilwidaegaCatalog}
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
                areaCalculationRows={rows.map(r => ({
                  id: r.id,
                  category: r.category,
                  location: r.location,
                  workType: r.workType,
                  workName: r.workName,
                  damageArea: r.damageArea,
                  repairArea: r.repairArea,
                  width: r.repairWidth,
                  height: r.repairHeight,
                }))}
                filteredWorkTypes={workTypes}
                isReadOnly={isReadOnly}
                onAreaImportToMaterial={handleAreaImportToMaterial}
                enableAreaImport={!isLossPreventionCase}
                isHydrated={isHydratedState}
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
                catalog={transformedMaterialCatalog}
                laborCategories={workTypes}
                selectedRows={selectedMaterialRows}
                onSelectRow={toggleSelectMaterialRow}
                onSelectAll={toggleSelectAllMaterialRows}
                isLoading={isLoadingMaterialCatalog}
                isReadOnly={isReadOnly}
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
                disabled={saveMutation.isPending || isReadOnly}
                style={{
                  padding: "12px 32px",
                  background: (saveMutation.isPending || isReadOnly) ? "#ccc" : "#008FED",
                  border: "none",
                  borderRadius: "8px",
                  fontFamily: "Pretendard",
                  fontSize: "16px",
                  fontWeight: 600,
                  color: "white",
                  cursor: (saveMutation.isPending || isReadOnly) ? "not-allowed" : "pointer",
                  boxShadow: (saveMutation.isPending || isReadOnly) ? "none" : "0px 2px 8px rgba(0, 143, 237, 0.3)",
                }}
                data-testid="button-save-estimate"
              >
                {isReadOnly ? "수정 불가" : saveMutation.isPending ? "저장 중..." : "저장"}
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
                    onClick={syncLaborFromRecoveryArea}
                    variant="outline"
                    size="sm"
                    disabled={rows.length === 0 || isReadOnly}
                    style={{
                      borderColor: rows.length === 0 ? "#d1d5db" : "#10B981",
                      color: rows.length === 0 ? "#9ca3af" : "#10B981",
                    }}
                    data-testid="button-sync-labor-from-recovery"
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    복구면적 가져오기
                  </Button>
                  <Button
                    onClick={addLaborRow}
                    variant="outline"
                    size="sm"
                    disabled={isLoadingLaborCatalog || isReadOnly}
                    style={{
                      borderColor: "#008FED",
                      color: "#008FED",
                    }}
                    data-testid="button-add-labor-category"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    공종추가
                  </Button>
                  <Button
                    onClick={deleteSelectedLaborRows}
                    variant="outline"
                    size="sm"
                    disabled={selectedLaborRows.size === 0 || isReadOnly}
                    style={{
                      borderColor: selectedLaborRows.size === 0 ? "#d1d5db" : "#FF4D4F",
                      color: selectedLaborRows.size === 0 ? "#9ca3af" : "#FF4D4F",
                    }}
                    data-testid="button-delete-labor-rows"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    삭제
                  </Button>
                </div>
              </div>
              
              {/* 노무비 테이블 컴포넌트 - 새로운 프롬프트 기반 UI */}
              <LaborCostSection
                rows={laborCostRows}
                onRowsChange={(newRows) => setLaborCostRows(sortLaborRowsByCategory(newRows))}
                catalog={laborCatalog}
                ilwidaegaCatalog={ilwidaegaCatalog}
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
                areaCalculationRows={rows.map(r => ({
                  id: r.id,
                  category: r.category,
                  location: r.location,
                  workType: r.workType,
                  workName: r.workName,
                  damageArea: r.damageArea,
                  repairArea: r.repairArea,
                  width: r.repairWidth,
                  height: r.repairHeight,
                }))}
                filteredWorkTypes={workTypes}
                isReadOnly={isReadOnly}
                onAreaImportToMaterial={handleAreaImportToMaterial}
                enableAreaImport={!isLossPreventionCase}
                isHydrated={isHydratedState}
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
                  disabled={isReadOnly}
                  data-testid="button-add-material-row"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  행 추가
                </Button>
                <Button
                  onClick={deleteSelectedMaterialRows}
                  variant="outline"
                  size="sm"
                  disabled={selectedMaterialRows.size === 0 || isReadOnly}
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
              catalog={transformedMaterialCatalog}
              laborCategories={workTypes}
              selectedRows={selectedMaterialRows}
              onSelectRow={toggleSelectMaterialRow}
              onSelectAll={toggleSelectAllMaterialRows}
              isLoading={isLoadingMaterialCatalog}
              isReadOnly={isReadOnly}
            />

            {/* 하단 버튼 */}
            <div
              className="flex justify-end items-center mt-8"
              style={{ padding: "20px 0" }}
            >
              <button
                type="button"
                onClick={handleSave}
                disabled={isReadOnly}
                className="hover-elevate active-elevate-2"
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "16px",
                  fontWeight: 600,
                  height: "52px",
                  padding: "12px 48px",
                  background: isReadOnly ? "#ccc" : "#008FED",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: "8px",
                  cursor: isReadOnly ? "not-allowed" : "pointer",
                }}
                data-testid="button-save-material"
              >
                {isReadOnly ? "수정 불가" : "저장"}
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
              disabled={isReadOnly}
              style={{
                fontFamily: "Pretendard",
                fontSize: "16px",
                fontWeight: 600,
                color: isReadOnly ? "#ccc" : "#FF4D4F",
                background: "transparent",
                border: "none",
                cursor: isReadOnly ? "not-allowed" : "pointer",
              }}
              data-testid="button-reset-labor"
            >
              초기화
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isReadOnly}
              className="hover-elevate active-elevate-2"
              style={{
                fontFamily: "Pretendard",
                fontSize: "16px",
                fontWeight: 600,
                height: "52px",
                padding: "12px 48px",
                background: isReadOnly ? "#ccc" : "#008FED",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "8px",
                cursor: isReadOnly ? "not-allowed" : "pointer",
              }}
              data-testid="button-save-labor"
            >
              {isReadOnly ? "수정 불가" : "저장"}
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
              placeholder="접수번호, 보험사, 사고번호, 계약자명, 피해자명, 피보험자주소 검색..."
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
                      <span>피보험자: {caseItem.insuredName || caseItem.policyHolderName || caseItem.clientName || "미정"}</span>
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
