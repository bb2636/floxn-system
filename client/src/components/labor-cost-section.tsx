import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Copy, Search, ChevronDown, ChevronRight, GripVertical } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// 복구면적 산출표 행 인터페이스
export interface AreaCalculationRowForLabor {
  id: string;
  category: string; // 장소
  location: string; // 위치
  workType: string; // 공종
  workName: string; // 공사명
  damageArea: string; // 피해면적
  repairArea: string; // 복구면적
  width?: string; // 가로(mm)
  height?: string; // 세로(mm)
}

// 노무비 카탈로그 항목 (from excel_data)
export interface LaborCatalogItem {
  공종: string;
  공사명: string;
  세부공사: string; // '노무비' | '일위대가'
  세부항목: string;
  단위: string;
  단가_인: number | null;
  단가_천장: number | null;
  단가_벽체: number | null;
  단가_바닥: number | null;
  단가_길이: number | null;
}

// 노무비 테이블 행
export interface LaborCostRow {
  id: string;
  sourceAreaRowId?: string; // 복구면적 산출표 행 ID (연동 추적용)
  isLinkedFromRecovery?: boolean; // 복구면적에서 연동 생성된 행인지 (true: 수정불가, false/undefined: 수정가능)
  place: string; // 장소 - 복구면적 산출표에서 가져옴 (읽기전용)
  position: string; // 위치 - 복구면적 산출표에서 가져옴 (읽기전용)
  category: string; // 공종 - select
  workName: string; // 공사명 - select (filtered by category)
  detailWork: string; // 세부공사 - select (filtered by workName)
  detailItem: string; // 세부항목 - select (filtered by detailWork)
  priceStandard: string; // 단가 기준 - select (민/위/기/JV)
  unit: string; // 단위 - readonly
  standardPrice: number; // 기준가(단위) - readonly (단가_인 for 노무비)
  quantity: number; // 수량 - editable
  applicationRates: { // 적용면 - radio buttons (only one can be selected)
    ceiling: boolean; // 천장
    wall: boolean; // 벽체
    floor: boolean; // 바닥
    molding: boolean; // 길이
  };
  salesMarkupRate: number; // 판매가 마진율 - editable
  pricePerSqm: number; // 기준가(m²) - calculated
  damageArea: number; // 피해면적 - editable
  deduction: number; // 공제(원) - calculated
  includeInEstimate: boolean; // 경비여부 - checkbox
  request: string; // 요청 - editable input
  amount: number; // 금액 - calculated
}

interface LaborCostSectionProps {
  rows: LaborCostRow[];
  onRowsChange: (rows: LaborCostRow[]) => void;
  catalog: LaborCatalogItem[];
  selectedRows: Set<string>;
  onSelectRow: (rowId: string) => void;
  onSelectAll: () => void;
  isLoading?: boolean;
  areaCalculationRows?: AreaCalculationRowForLabor[]; // 복구면적 산출표 데이터
  filteredWorkTypes?: string[]; // 케이스 유형에 따라 필터링된 공종 목록
  isReadOnly?: boolean; // 읽기 전용 모드
  onAreaImportToMaterial?: (workType: string, totalArea: number) => void; // 피해면적 산출표 불러오기 시 자재비 수량 업데이트 콜백
  enableAreaImport?: boolean; // 피해면적 불러오기 활성화 (손해방지 케이스만 true)
}

export function LaborCostSection({
  rows,
  onRowsChange,
  catalog,
  selectedRows,
  onSelectRow,
  onSelectAll,
  isLoading = false,
  areaCalculationRows = [],
  filteredWorkTypes,
  isReadOnly = false,
  onAreaImportToMaterial,
  enableAreaImport = true, // 기본값 true (하위 호환)
}: LaborCostSectionProps) {
  // 공사명 선택 팝업 상태
  const [areaPopupOpen, setAreaPopupOpen] = useState(false);
  const [areaPopupRowId, setAreaPopupRowId] = useState<string | null>(null);
  const [areaPopupWorkName, setAreaPopupWorkName] = useState<string>("");
  const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null); // 팝업에서 선택된 그룹 key
  
  // 드래그 앤 드롭 상태
  const [draggedRowId, setDraggedRowId] = useState<string | null>(null);
  const [dragOverRowId, setDragOverRowId] = useState<string | null>(null);

  // 드래그 앤 드롭 핸들러
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

    const newRows = [...rows];
    const draggedIndex = newRows.findIndex(r => r.id === sourceRowId);
    const targetIndex = newRows.findIndex(r => r.id === targetRowId);
    
    if (draggedIndex !== -1 && targetIndex !== -1) {
      const [draggedRow] = newRows.splice(draggedIndex, 1);
      newRows.splice(targetIndex, 0, draggedRow);
      onRowsChange(newRows);
    }

    setDraggedRowId(null);
    setDragOverRowId(null);
  };

  const handleDragEnd = () => {
    setDraggedRowId(null);
    setDragOverRowId(null);
  };

  // 공사명 선택 시 팝업 열기
  const handleWorkNameChange = (rowId: string, workName: string) => {
    // 먼저 workName 업데이트
    updateRow(rowId, 'workName', workName);
    
    // 피해면적 불러오기 비활성화 시 팝업 열지 않음 (손해방지 케이스만 활성화)
    if (!enableAreaImport) return;
    
    // 해당 공사명과 일치하는 복구면적 산출표 데이터가 있으면 팝업 열기
    const matchingRows = areaCalculationRows.filter(ar => ar.workName === workName);
    if (matchingRows.length > 0) {
      setAreaPopupRowId(rowId);
      setAreaPopupWorkName(workName);
      setSelectedGroupKey(null); // 선택 초기화
      setAreaPopupOpen(true);
    }
  };
  
  // 공사명 Select 닫힐 때 팝업 열기 (같은 값 재선택 시에도 팝업 열리도록)
  const handleWorkNameSelectClose = (rowId: string, open: boolean) => {
    // Select가 닫힐 때만 처리
    if (open) return;
    
    // 피해면적 불러오기 비활성화 시 팝업 열지 않음 (손해방지 케이스만 활성화)
    if (!enableAreaImport) return;
    
    const row = rows.find(r => r.id === rowId);
    if (!row?.workName) return;
    
    // 해당 공사명과 일치하는 복구면적 산출표 데이터가 있으면 팝업 열기
    const matchingRows = areaCalculationRows.filter(ar => ar.workName === row.workName);
    if (matchingRows.length > 0) {
      setAreaPopupRowId(rowId);
      setAreaPopupWorkName(row.workName);
      setSelectedGroupKey(null); // 선택 초기화
      setAreaPopupOpen(true);
    }
  };

  // 팝업 닫기 (취소)
  const handleAreaPopupClose = () => {
    setAreaPopupOpen(false);
    setAreaPopupRowId(null);
    setAreaPopupWorkName("");
    setSelectedGroupKey(null);
  };

  // 팝업에서 "불러오기" 클릭 시 선택된 그룹의 복구면적 합계 적용
  const handleAreaRowImport = () => {
    if (!areaPopupRowId || !selectedGroupKey) return;
    
    // 선택된 그룹의 복구면적 합계 계산
    const selectedGroup = groupedAreaRows.find(g => g.key === selectedGroupKey);
    if (!selectedGroup) return;
    
    // 소수점 1자리로 반올림
    const damageArea = Math.round(selectedGroup.totalRepairArea * 10) / 10;
    
    // 장소는 그룹의 category에서 가져옴
    const place = selectedGroup.category || '';
    
    // 위치는 천장/벽체/바닥 중 면적이 있는 것들을 조합
    const positionParts: string[] = [];
    if (selectedGroup.천장 > 0) positionParts.push('천장');
    if (selectedGroup.벽체 > 0) positionParts.push('벽체');
    if (selectedGroup.바닥 > 0) positionParts.push('바닥');
    const position = positionParts.join('/') || '';
    
    // 현재 노무비 행의 공종 가져오기
    const currentRow = rows.find(r => r.id === areaPopupRowId);
    const workType = currentRow?.category || '';
    
    onRowsChange(rows.map(row => {
      if (row.id === areaPopupRowId) {
        const updated = { ...row, damageArea, place, position };
        // 금액 재계산
        const standardPrice = Number(updated.standardPrice) || 0;
        const quantity = Number(updated.quantity) || 0;
        const pricePerSqm = Number(updated.pricePerSqm) || 0;
        
        if (updated.category === '누수탐지비용') {
          updated.amount = Math.round(standardPrice * quantity);
        } else if (updated.detailWork === '노무비') {
          // 노무비: 기준가(단위) * 수량 (피해면적은 표시만, 곱하지 않음)
          updated.amount = Math.round(standardPrice * quantity);
        } else if (updated.detailWork === '일위대가') {
          // 일위대가: 기준가(m²) * 피해면적 * 수량
          updated.amount = Math.round(pricePerSqm * damageArea * quantity);
        }
        return updated;
      }
      return row;
    }));
    
    // 자재비에 해당 공종의 수량 업데이트 (콜백이 있을 경우)
    if (onAreaImportToMaterial && workType) {
      onAreaImportToMaterial(workType, damageArea);
    }
    
    handleAreaPopupClose();
  };

  // 팝업에 표시할 복구면적 산출표 데이터 (공사명별 필터링)
  const matchingAreaRows = useMemo(() => {
    return areaCalculationRows.filter(ar => ar.workName === areaPopupWorkName);
  }, [areaCalculationRows, areaPopupWorkName]);

  // 위치(방분류) + 공사명별 그룹화, 천장/벽체/바닥별 복구면적 계산
  const groupedAreaRows = useMemo(() => {
    // 위치(category) + 공사명(workName) 기준으로 그룹화
    const groups: Record<string, { 
      key: string;
      category: string; // 위치 (주방, 발코니 등)
      workName: string; // 공사명
      천장: number;
      벽체: number;
      바닥: number;
      totalRepairArea: number;
    }> = {};
    
    matchingAreaRows.forEach(row => {
      const key = `${row.category || ''}-${row.workName || ''}`;
      if (!groups[key]) {
        groups[key] = {
          key,
          category: row.category || '',
          workName: row.workName || '',
          천장: 0,
          벽체: 0,
          바닥: 0,
          totalRepairArea: 0,
        };
      }
      
      const area = parseFloat(row.repairArea) || 0;
      const location = row.location || '';
      
      // location에 따라 천장/벽체/바닥 분류
      if (location.includes('천장') || location === '천장') {
        groups[key].천장 += area;
      } else if (location.includes('벽체') || location.includes('벽') || location === '벽체') {
        groups[key].벽체 += area;
      } else if (location.includes('바닥') || location === '바닥') {
        groups[key].바닥 += area;
      } else {
        // 기타 위치는 전체에 추가
        groups[key].totalRepairArea += area;
      }
      
      groups[key].totalRepairArea = groups[key].천장 + groups[key].벽체 + groups[key].바닥;
    });
    
    return Object.values(groups);
  }, [matchingAreaRows]);

  // 캐스케이딩 옵션 생성 - filteredWorkTypes가 제공되면 우선 사용
  const categoryOptions = useMemo(() => {
    // filteredWorkTypes가 제공되면 그것을 사용
    if (filteredWorkTypes && filteredWorkTypes.length > 0) {
      return filteredWorkTypes;
    }
    // 기본 로직: 카탈로그에서 공종 추출
    if (!catalog.length) return ["누수탐지비용"]; // 누수탐지비용은 항상 표시
    const unique = new Set(catalog.map(item => item.공종));
    const categories = Array.from(unique);
    // 누수탐지비용이 catalog에 없으면 추가
    if (!categories.includes("누수탐지비용")) {
      return ["누수탐지비용", ...categories];
    }
    return categories;
  }, [catalog, filteredWorkTypes]);

  // 걸레받이 -> 목공사 역변환 (노무비 카탈로그 조회용)
  const mapWorkNameForLookup = (workName: string) => {
    if (workName === '걸레받이') return '목공사';
    return workName;
  };

  const getWorkNameOptions = (category: string, currentValue?: string) => {
    if (!category) return currentValue ? [currentValue] : [];
    // 누수탐지비용 특수 케이스
    if (category === "누수탐지비용") {
      return ["종합검사"];
    }
    if (!catalog.length) return currentValue ? [currentValue] : [];
    const filtered = catalog.filter(item => item.공종 === category);
    const unique = new Set(filtered.map(item => {
      // 목공사 공종의 공사명 "목공사"를 "걸레받이"로 변경
      if (category === '목공사' && item.공사명 === '목공사') {
        return '걸레받이';
      }
      return item.공사명;
    }));
    const options = Array.from(unique);
    // 현재 값이 옵션에 없으면 추가
    if (currentValue && !options.includes(currentValue)) {
      options.unshift(currentValue);
    }
    return options;
  };

  const getDetailWorkOptions = (category: string, workName: string, currentValue?: string) => {
    if (!category || !workName) return currentValue ? [currentValue] : [];
    // 누수탐지비용 특수 케이스
    if (category === "누수탐지비용" && workName === "종합검사") {
      return ["1회", "2회", "3회 이상"];
    }
    // 목공사-걸레받이 특수 케이스: 일위대가만 표시
    if (category === '목공사' && workName === '걸레받이') {
      return ['일위대가'];
    }
    if (!catalog.length) return currentValue ? [currentValue] : [];
    // 걸레받이 -> 목공사 변환하여 조회
    const lookupWorkName = mapWorkNameForLookup(workName);
    const filtered = catalog.filter(item => 
      item.공종 === category && item.공사명 === lookupWorkName
    );
    const unique = new Set(filtered.map(item => item.세부공사));
    // 현재 값이 옵션에 없으면 추가
    if (currentValue && !unique.has(currentValue)) {
      unique.add(currentValue);
    }
    return Array.from(unique);
  };

  const getDetailItemOptions = (category: string, workName: string, detailWork: string) => {
    if (!category) return [];
    // 목공사-걸레받이 특수 케이스: 걸레받이만 표시
    if (category === '목공사' && workName === '걸레받이' && detailWork === '일위대가') {
      return ['걸레받이'];
    }
    if (!catalog.length) return [];
    
    // 걸레받이 -> 목공사 변환하여 조회
    const lookupWorkName = mapWorkNameForLookup(workName);
    
    // 공종 + 공사명으로 필터링해서 노임항목(세부항목) 추출
    const filtered = catalog.filter(item => 
      item.공종 === category && 
      item.공사명 === lookupWorkName &&
      item.세부공사 === '노무비'
    );
    
    // 세부항목(노임항목)에서 중복 제거
    const unique = new Set(filtered.map(item => item.세부항목).filter(Boolean));
    return Array.from(unique);
  };

  const getApplicationRateOptions = (category: string, workName: string, detailWork: string, detailItem: string) => {
    if (!category || !workName || !detailWork || !detailItem) return [];
    // 목공사-걸레받이 특수 케이스: 길이(molding)만 표시
    if (category === '목공사' && workName === '걸레받이' && detailWork === '일위대가' && detailItem === '걸레받이') {
      return ['molding'] as Array<'ceiling' | 'wall' | 'floor' | 'molding'>;
    }
    if (!catalog.length) return [];
    // 걸레받이 -> 목공사 변환하여 조회
    const lookupWorkName = mapWorkNameForLookup(workName);
    // 동일한 세부항목이 여러 개 있을 수 있으므로 모든 항목 찾기
    const items = catalog.filter(i => 
      i.공종 === category && 
      i.공사명 === lookupWorkName && 
      i.세부공사 === detailWork && 
      i.세부항목 === detailItem
    );
    if (items.length === 0) return [];
    
    const options: Array<'ceiling' | 'wall' | 'floor' | 'molding'> = [];
    // 모든 항목의 가격 정보를 합쳐서 적용면 옵션 생성
    let hasCeiling = false;
    let hasWall = false;
    let hasFloor = false;
    let hasMolding = false;
    
    items.forEach(item => {
      if (item.단가_천장 !== null) hasCeiling = true;
      if (item.단가_벽체 !== null) hasWall = true;
      if (item.단가_바닥 !== null) hasFloor = true;
      if (item.단가_길이 !== null) hasMolding = true;
    });
    
    if (hasCeiling) options.push('ceiling');
    if (hasWall) options.push('wall');
    if (hasFloor) options.push('floor');
    if (hasMolding) options.push('molding');
    
    return options;
  };

  // 피해철거공사 행 자동 생성 함수
  const createDemolitionRow = (sourceRow: LaborCostRow, demolitionDetailItem: string): LaborCostRow => {
    // sourceRow의 공사명에서 철거공사 공사명 도출
    // 예: 목공사-석고보드 → 철거공사-석고보드
    const demolitionWorkName = sourceRow.workName;
    
    // 새 형식으로 먼저 검색: 철거공사-<공사명>-일위대가-<세부항목>
    let demolitionCatalogItem = catalog.find(item =>
      item.공종 === '철거공사' &&
      item.공사명 === demolitionWorkName &&
      item.세부공사 === '일위대가'
    );
    
    // 새 형식 없으면 기존 형식으로 검색: 피해철거공사-피해철거-일위대가-<세부항목>
    if (!demolitionCatalogItem) {
      demolitionCatalogItem = catalog.find(item =>
        item.공종 === '피해철거공사' &&
        item.공사명 === '피해철거' &&
        item.세부공사 === '일위대가' &&
        item.세부항목 === demolitionDetailItem
      );
    }
    
    // 사용할 카탈로그 항목에서 공종/공사명/세부항목 결정
    const useCategory = demolitionCatalogItem?.공종 || '철거공사';
    const useWorkName = demolitionCatalogItem?.공사명 || demolitionWorkName;
    const useDetailItem = demolitionCatalogItem?.세부항목 || demolitionDetailItem;
    
    const newRow: LaborCostRow = {
      id: `labor-demolition-${sourceRow.id}-${Date.now()}`,
      sourceAreaRowId: `demolition-${sourceRow.id}`, // 중복 방지를 위한 추적 ID
      place: sourceRow.place,
      position: sourceRow.position,
      category: useCategory,
      workName: useWorkName,
      detailWork: '일위대가',
      detailItem: useDetailItem,
      priceStandard: sourceRow.priceStandard,
      unit: demolitionCatalogItem?.단위 || 'm²',
      standardPrice: demolitionCatalogItem?.단가_인 || 0,
      quantity: 1,
      applicationRates: { ceiling: false, wall: false, floor: false, molding: false },
      salesMarkupRate: 0,
      pricePerSqm: 0,
      damageArea: sourceRow.damageArea,
      deduction: 0,
      includeInEstimate: true,
      request: '',
      amount: 0,
    };
    
    // 적용면 및 기준가 설정
    if (demolitionCatalogItem) {
      if (demolitionCatalogItem.단가_천장 !== null) {
        newRow.applicationRates.ceiling = true;
        newRow.pricePerSqm = demolitionCatalogItem.단가_천장;
      } else if (demolitionCatalogItem.단가_벽체 !== null) {
        newRow.applicationRates.wall = true;
        newRow.pricePerSqm = demolitionCatalogItem.단가_벽체;
      } else if (demolitionCatalogItem.단가_바닥 !== null) {
        newRow.applicationRates.floor = true;
        newRow.pricePerSqm = demolitionCatalogItem.단가_바닥;
      } else if (demolitionCatalogItem.단가_길이 !== null) {
        newRow.applicationRates.molding = true;
        newRow.pricePerSqm = demolitionCatalogItem.단가_길이;
      }
    }
    
    // 금액 계산 (일위대가: 기준가(m²) * 피해면적 * 수량)
    newRow.amount = Math.round(newRow.pricePerSqm * newRow.damageArea * newRow.quantity);
    
    return newRow;
  };

  // 행 업데이트
  const updateRow = (rowId: string, field: keyof LaborCostRow, value: any) => {
    if (isReadOnly) return;
    
    let demolitionRowToAdd: LaborCostRow | null = null;
    const currentRow = rows.find(r => r.id === rowId);
    
    const updatedRows = rows.map(row => {
      if (row.id === rowId) {
        const updated = { ...row, [field]: value };

        // category 변경 시 하위 필드 리셋
        if (field === 'category') {
          // 누수탐지비용 선택 시 특수 처리
          if (value === "누수탐지비용") {
            updated.workName = "종합검사";
            updated.detailWork = "";
            updated.detailItem = '';
            updated.unit = "회";
            updated.standardPrice = 0;
            updated.applicationRates = { ceiling: false, wall: false, floor: false, molding: false };
            updated.pricePerSqm = 0;
          } else {
            updated.workName = '';
            updated.detailWork = '';
            updated.detailItem = '';
            updated.unit = '';
            updated.standardPrice = 0;
            updated.applicationRates = { ceiling: false, wall: false, floor: false, molding: false };
            updated.pricePerSqm = 0;
          }
        }

        // workName 변경 시 하위 필드 리셋
        if (field === 'workName') {
          // 목공사-반자틀 선택 시 자동으로 일위대가-반자틀설치 설정
          if (updated.category === '목공사' && value === '반자틀') {
            updated.detailWork = '일위대가';
            updated.detailItem = '반자틀설치';
            
            // 카탈로그에서 데이터 가져오기
            const catalogItem = catalog.find(item =>
              item.공종 === '목공사' &&
              item.공사명 === '반자틀' &&
              item.세부공사 === '일위대가' &&
              item.세부항목 === '반자틀설치'
            );
            
            if (catalogItem) {
              updated.unit = catalogItem.단위 || '';
              updated.standardPrice = catalogItem.단가_인 || 0;
              
              // applicationRates 기본값 설정
              updated.applicationRates = { ceiling: false, wall: false, floor: false, molding: false };
              if (catalogItem.단가_천장 !== null) {
                updated.applicationRates.ceiling = true;
                updated.pricePerSqm = catalogItem.단가_천장;
              } else if (catalogItem.단가_벽체 !== null) {
                updated.applicationRates.wall = true;
                updated.pricePerSqm = catalogItem.단가_벽체;
              } else if (catalogItem.단가_바닥 !== null) {
                updated.applicationRates.floor = true;
                updated.pricePerSqm = catalogItem.단가_바닥;
              } else if (catalogItem.단가_길이 !== null) {
                updated.applicationRates.molding = true;
                updated.pricePerSqm = catalogItem.단가_길이;
              }
            } else {
              updated.unit = '';
              updated.standardPrice = 0;
              updated.applicationRates = { ceiling: false, wall: false, floor: false, molding: false };
              updated.pricePerSqm = 0;
            }
            
            // 반자틀설치에 대한 피해철거공사(반자틀해체) 행 자동 추가
            const demolitionSourceId = `demolition-${rowId}`;
            const existingDemolition = rows.find(r => r.sourceAreaRowId === demolitionSourceId);
            if (!existingDemolition) {
              demolitionRowToAdd = createDemolitionRow({ ...updated }, '반자틀해체');
            }
          }
          // 목공사-걸레받이 선택 시 자동으로 일위대가-걸레받이 설정
          else if (updated.category === '목공사' && value === '걸레받이') {
            updated.detailWork = '일위대가';
            updated.detailItem = '걸레받이';
            
            // 카탈로그에서 데이터 가져오기 (걸레받이 → 목공사로 변환하여 조회)
            const catalogItem = catalog.find(item =>
              item.공종 === '목공사' &&
              item.공사명 === '목공사' &&
              item.세부공사 === '일위대가' &&
              item.세부항목 === '걸레받이'
            );
            
            if (catalogItem) {
              updated.unit = catalogItem.단위 || '';
              updated.standardPrice = catalogItem.단가_인 || 0;
              
              // applicationRates 기본값 설정 (걸레받이는 길이 기준)
              updated.applicationRates = { ceiling: false, wall: false, floor: false, molding: false };
              if (catalogItem.단가_길이 !== null) {
                updated.applicationRates.molding = true;
                updated.pricePerSqm = catalogItem.단가_길이;
              } else if (catalogItem.단가_천장 !== null) {
                updated.applicationRates.ceiling = true;
                updated.pricePerSqm = catalogItem.단가_천장;
              } else if (catalogItem.단가_벽체 !== null) {
                updated.applicationRates.wall = true;
                updated.pricePerSqm = catalogItem.단가_벽체;
              } else if (catalogItem.단가_바닥 !== null) {
                updated.applicationRates.floor = true;
                updated.pricePerSqm = catalogItem.단가_바닥;
              }
            } else {
              updated.unit = '';
              updated.standardPrice = 0;
              updated.applicationRates = { ceiling: false, wall: false, floor: false, molding: false };
              updated.pricePerSqm = 0;
            }
            // 걸레받이는 피해철거공사 자동 추가 없음
          }
          // 그 외 모든 공사명 선택 시 기본으로 노무비 설정 (새 DB 형식)
          else {
            updated.detailWork = '노무비';
            updated.unit = '';
            updated.standardPrice = 0;
            updated.applicationRates = { ceiling: false, wall: false, floor: false, molding: false };
            updated.pricePerSqm = 0;
            
            // 해당 공종+공사명의 노임항목 옵션 확인
            const lookupWorkName = mapWorkNameForLookup(value);
            const matchingItems = catalog.filter(item => 
              item.공종 === updated.category && 
              item.공사명 === lookupWorkName &&
              item.세부공사 === '노무비'
            );
            const uniqueDetailItems = Array.from(new Set(matchingItems.map(item => item.세부항목).filter(Boolean)));
            
            // 노임항목이 하나만 있으면 자동 선택
            if (uniqueDetailItems.length === 1) {
              updated.detailItem = uniqueDetailItems[0];
              
              // 카탈로그에서 해당 항목의 단가 가져오기
              const catalogItem = matchingItems.find(item => item.세부항목 === uniqueDetailItems[0]);
              if (catalogItem) {
                updated.unit = catalogItem.단위 || '인';
                updated.standardPrice = catalogItem.단가_인 || 0;
                updated.pricePerSqm = catalogItem.단가_인 || 0; // 적용단가도 설정
              }
              console.log('[노무비 자동선택]', updated.category, '->', value, '->', updated.detailItem, '단가:', updated.pricePerSqm);
            } else if (uniqueDetailItems.length > 1) {
              // 노임항목이 여러 개면 선택 대기
              updated.detailItem = '';
              console.log('[노무비 다중옵션]', updated.category, '->', value, '옵션:', uniqueDetailItems);
            } else {
              updated.detailItem = '';
              console.log('[노무비 옵션없음]', updated.category, '->', value, '매칭항목:', matchingItems.length);
            }
          }
        }

        // detailWork 변경 시 하위 필드 리셋
        if (field === 'detailWork') {
          // 누수탐지비용인 경우 pricing 로직 적용
          if (updated.category === "누수탐지비용") {
            updated.detailItem = '';
            // unit은 이미 "회"로 설정되어 있으므로 유지
            // detailWork에 따라 standardPrice 설정
            if (value === "1회") updated.standardPrice = 300000;
            else if (value === "2회") updated.standardPrice = 400000;
            else if (value === "3회 이상") updated.standardPrice = 500000;
            else updated.standardPrice = 0;
            updated.applicationRates = { ceiling: false, wall: false, floor: false, molding: false };
            updated.pricePerSqm = 0;
          } else {
            updated.detailItem = '';
            updated.unit = '';
            updated.standardPrice = 0;
            updated.applicationRates = { ceiling: false, wall: false, floor: false, molding: false };
            updated.pricePerSqm = 0;
          }
        }

        // detailItem 변경 시 카탈로그에서 데이터 채우기
        if (field === 'detailItem') {
          // 걸레받이 -> 목공사 변환하여 조회
          const lookupWorkName = mapWorkNameForLookup(updated.workName);
          const catalogItem = catalog.find(item =>
            item.공종 === updated.category &&
            item.공사명 === lookupWorkName &&
            item.세부공사 === updated.detailWork &&
            item.세부항목 === value
          );
          if (catalogItem) {
            // detailWork가 "노무비"인 경우: unit = '인', standardPrice = 단가_인
            if (updated.detailWork === '노무비') {
              updated.unit = '인';
              updated.standardPrice = catalogItem.단가_인 || 0;
            } else {
              // 일위대가인 경우: catalogItem.단위 사용
              updated.unit = catalogItem.단위 || '';
              updated.standardPrice = catalogItem.단가_인 || 0;
            }
            
            // applicationRates 기본값 설정 (첫 번째 사용 가능한 옵션 선택)
            updated.applicationRates = { ceiling: false, wall: false, floor: false, molding: false };
            if (catalogItem.단가_천장 !== null) {
              updated.applicationRates.ceiling = true;
              updated.pricePerSqm = catalogItem.단가_천장;
            } else if (catalogItem.단가_벽체 !== null) {
              updated.applicationRates.wall = true;
              updated.pricePerSqm = catalogItem.단가_벽체;
            } else if (catalogItem.단가_바닥 !== null) {
              updated.applicationRates.floor = true;
              updated.pricePerSqm = catalogItem.단가_바닥;
            } else if (catalogItem.단가_길이 !== null) {
              updated.applicationRates.molding = true;
              updated.pricePerSqm = catalogItem.단가_길이;
            }
          }
          
          // 반자틀설치, 석고보드설치, 합판설치 선택 시 피해철거공사 행 자동 추가
          if (updated.category === '목공사' && (value === '반자틀설치' || value === '석고보드설치' || value === '합판설치')) {
            // 반자틀설치 → 반자틀해체, 석고보드설치/합판설치 → 석고보드해체
            const demolitionDetailItem = value === '반자틀설치' ? '반자틀해체' : '석고보드해체';
            const demolitionSourceId = `demolition-${rowId}`;
            
            // 이미 해당 행에 대한 피해철거공사 행이 있는지 확인
            const existingDemolition = rows.find(r => r.sourceAreaRowId === demolitionSourceId);
            if (!existingDemolition) {
              // 업데이트된 행 정보로 피해철거공사 행 생성
              demolitionRowToAdd = createDemolitionRow({ ...updated }, demolitionDetailItem);
            }
          }
        }

        // applicationRates 변경 시 pricePerSqm 업데이트
        if (field === 'applicationRates') {
          // 걸레받이 -> 목공사 변환하여 조회
          const lookupWorkName = mapWorkNameForLookup(updated.workName);
          const catalogItem = catalog.find(item =>
            item.공종 === updated.category &&
            item.공사명 === lookupWorkName &&
            item.세부공사 === updated.detailWork &&
            item.세부항목 === updated.detailItem
          );
          if (catalogItem) {
            // 선택된 첫 번째 applicationRate의 가격 사용
            if (value.ceiling) updated.pricePerSqm = catalogItem.단가_천장 || 0;
            else if (value.wall) updated.pricePerSqm = catalogItem.단가_벽체 || 0;
            else if (value.floor) updated.pricePerSqm = catalogItem.단가_바닥 || 0;
            else if (value.molding) updated.pricePerSqm = catalogItem.단가_길이 || 0;
            else updated.pricePerSqm = 0;
          }
        }

        // 금액 계산 (타입을 명시적으로 number로 변환)
        const standardPrice = Number(updated.standardPrice) || 0;
        const quantity = Number(updated.quantity) || 0;
        const pricePerSqm = Number(updated.pricePerSqm) || 0;
        const damageArea = Number(updated.damageArea) || 0;
        
        // 누수탐지비용은 standardPrice * quantity로 계산
        if (updated.category === '누수탐지비용') {
          updated.amount = Math.round(standardPrice * quantity);
        } else if (updated.detailWork === '노무비') {
          // 노무비: 기준가(단위) * 수량 (피해면적은 표시만, 곱하지 않음)
          updated.amount = Math.round(standardPrice * quantity);
        } else if (updated.detailWork === '일위대가') {
          // 일위대가: 기준가(m²) * 피해면적 * 수량
          updated.amount = Math.round(pricePerSqm * damageArea * quantity);
        } else {
          updated.amount = 0;
        }

        return updated;
      }
      return row;
    });
    
    // 피해철거공사 행 추가
    if (demolitionRowToAdd) {
      updatedRows.push(demolitionRowToAdd);
    }
    
    onRowsChange(updatedRows);
  };

  // 행 복제
  const duplicateRow = (row: LaborCostRow) => {
    const newRow = { ...row, id: `labor-${Date.now()}-${Math.random()}` };
    onRowsChange([...rows, newRow]);
  };

  // 공종별 + 공사명별 그룹화 함수 (이미지와 같이 공종과 공사명 모두 rowspan 적용)
  interface WorkNameSubGroup {
    workName: string;
    rows: LaborCostRow[];
    startIndexInCategory: number;
  }
  interface CategoryGroup {
    category: string;
    rows: LaborCostRow[];
    workNameSubGroups: WorkNameSubGroup[];
    startIndex: number;
  }
  
  const groupRowsByCategory = (rows: LaborCostRow[]): CategoryGroup[] => {
    const groups: CategoryGroup[] = [];
    let currentGroup: CategoryGroup | null = null;
    let globalIndex = 0;

    rows.forEach((row) => {
      if (!currentGroup || currentGroup.category !== row.category) {
        if (currentGroup) {
          groups.push(currentGroup);
        }
        currentGroup = {
          category: row.category || "미지정",
          rows: [row],
          workNameSubGroups: [],
          startIndex: globalIndex,
        };
      } else {
        currentGroup.rows.push(row);
      }
      globalIndex++;
    });

    if (currentGroup) {
      groups.push(currentGroup);
    }

    // 각 공종 그룹 내에서 공사명별 서브그룹 생성
    groups.forEach(group => {
      let currentSubGroup: WorkNameSubGroup | null = null;
      let indexInCategory = 0;
      
      group.rows.forEach((row) => {
        if (!currentSubGroup || currentSubGroup.workName !== row.workName) {
          if (currentSubGroup) {
            group.workNameSubGroups.push(currentSubGroup);
          }
          currentSubGroup = {
            workName: row.workName || "",
            rows: [row],
            startIndexInCategory: indexInCategory,
          };
        } else {
          currentSubGroup.rows.push(row);
        }
        indexInCategory++;
      });
      
      if (currentSubGroup) {
        group.workNameSubGroups.push(currentSubGroup);
      }
    });

    return groups;
  };
  
  // 특정 행이 공사명 서브그룹의 첫 번째 행인지 확인하는 헬퍼
  const isFirstRowInWorkNameSubGroup = (group: CategoryGroup, rowId: string): boolean => {
    for (const subGroup of group.workNameSubGroups) {
      if (subGroup.rows[0]?.id === rowId) {
        return true;
      }
    }
    return false;
  };
  
  // 특정 행이 속한 공사명 서브그룹의 행 수 반환
  const getWorkNameSubGroupRowCount = (group: CategoryGroup, rowId: string): number => {
    for (const subGroup of group.workNameSubGroups) {
      if (subGroup.rows.some(r => r.id === rowId)) {
        return subGroup.rows.length;
      }
    }
    return 1;
  };

  // 공종 그룹 내 행 추가
  const addRowInCategory = (category: string, afterRowId: string) => {
    if (isReadOnly) return;
    const newRow: LaborCostRow = {
      id: `labor-${Date.now()}-${Math.random()}`,
      sourceAreaRowId: '',
      place: '',
      position: '',
      category: category,
      workName: '',
      detailWork: '',
      detailItem: '',
      priceStandard: '',
      unit: '',
      standardPrice: 0,
      quantity: 1,
      applicationRates: { ceiling: false, wall: false, floor: false, molding: false },
      salesMarkupRate: 0,
      pricePerSqm: 0,
      damageArea: 0,
      deduction: 0,
      includeInEstimate: false,
      request: '',
      amount: 0,
    };
    
    const afterIndex = rows.findIndex(r => r.id === afterRowId);
    if (afterIndex !== -1) {
      const newRows = [...rows];
      newRows.splice(afterIndex + 1, 0, newRow);
      onRowsChange(newRows);
    } else {
      onRowsChange([...rows, newRow]);
    }
  };

  // 특정 행 삭제
  const deleteRowById = (rowId: string) => {
    if (isReadOnly) return;
    const groupedRows = groupRowsByCategory(rows);
    const group = groupedRows.find(g => g.rows.some(r => r.id === rowId));
    if (group && group.rows.length <= 1) {
      return; // 그룹에 1개 행만 있으면 삭제 불가
    }
    onRowsChange(rows.filter(r => r.id !== rowId));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          borderSpacing: 0,
          minWidth: "1200px",
        }}
      >
        <thead>
          <tr
            style={{
              background: "rgba(12, 12, 12, 0.04)",
              height: "48px",
            }}
          >
            <th style={{ width: "40px", padding: "0 8px", textAlign: "center", borderBottom: "1px solid #E5E7EB", borderRight: "1px solid rgba(12, 12, 12, 0.06)" }}>
              <Checkbox 
                checked={selectedRows.size === rows.length && rows.length > 0}
                onCheckedChange={onSelectAll}
                data-testid="checkbox-select-all-labor" 
              />
            </th>
            <th style={{ width: "120px", padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600, color: "rgba(12, 12, 12, 0.6)", textAlign: "center", borderBottom: "1px solid #E5E7EB", borderRight: "1px solid rgba(12, 12, 12, 0.06)" }}>공종</th>
            <th style={{ width: "60px", padding: "0 4px", fontFamily: "Pretendard", fontSize: "12px", fontWeight: 500, color: "rgba(12, 12, 12, 0.4)", textAlign: "center", borderBottom: "1px solid #E5E7EB", borderRight: "1px solid rgba(12, 12, 12, 0.06)" }}>+/-</th>
            <th style={{ width: "120px", padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600, color: "rgba(12, 12, 12, 0.6)", textAlign: "center", borderBottom: "1px solid #E5E7EB", borderRight: "1px solid rgba(12, 12, 12, 0.06)" }}>공사명</th>
            <th style={{ width: "120px", padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600, color: "rgba(12, 12, 12, 0.6)", textAlign: "center", borderBottom: "1px solid #E5E7EB", borderRight: "1px solid rgba(12, 12, 12, 0.06)" }}>노임항목</th>
            <th style={{ width: "100px", padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600, color: "rgba(12, 12, 12, 0.6)", textAlign: "center", borderBottom: "1px solid #E5E7EB", borderRight: "1px solid rgba(12, 12, 12, 0.06)" }}>복구면적</th>
            <th style={{ width: "100px", padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600, color: "rgba(12, 12, 12, 0.6)", textAlign: "center", borderBottom: "1px solid #E5E7EB", borderRight: "1px solid rgba(12, 12, 12, 0.06)" }}>적용단가</th>
            <th style={{ width: "80px", padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600, color: "rgba(12, 12, 12, 0.6)", textAlign: "center", borderBottom: "1px solid #E5E7EB", borderRight: "1px solid rgba(12, 12, 12, 0.06)" }}>수량(인)</th>
            <th style={{ width: "100px", padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600, color: "rgba(12, 12, 12, 0.6)", textAlign: "center", borderBottom: "1px solid #E5E7EB", borderRight: "1px solid rgba(12, 12, 12, 0.06)" }}>합계</th>
            <th style={{ width: "80px", padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600, color: "rgba(12, 12, 12, 0.6)", textAlign: "center", borderBottom: "1px solid #E5E7EB", borderRight: "1px solid rgba(12, 12, 12, 0.06)" }}>경비 여부</th>
            <th style={{ width: "150px", padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600, color: "rgba(12, 12, 12, 0.6)", textAlign: "center", borderBottom: "1px solid #E5E7EB" }}>비고</th>
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
                    height: "56px", 
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
                          group.rows.forEach(r => {
                            if (allSelected) {
                              onSelectRow(r.id);
                            } else if (!selectedRows.has(r.id)) {
                              onSelectRow(r.id);
                            }
                          });
                        }}
                        style={{ width: "16px", height: "16px", cursor: "pointer" }}
                        data-testid={`checkbox-group-labor-${groupIndex}`}
                      />
                    </td>
                  )}
                  
                  {/* 공종 컬럼 - 그룹 첫 번째 행에만 rowspan 적용 */}
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
                        value={row.category || undefined} 
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
                          data-testid={`select-category-labor-${globalIndex}`}
                        >
                          <SelectValue placeholder="공종 선택">
                            {row.category || "공종 선택"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {categoryOptions.filter(opt => opt && opt.trim() !== '').map(opt => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
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
                        data-testid={`button-add-labor-row-${globalIndex}`}
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
                        data-testid={`button-delete-labor-row-${globalIndex}`}
                      >
                        −
                      </button>
                    </div>
                  </td>
                  
                  {/* 공사명 - 각 행마다 별도 셀 (그룹화 없음) */}
                  <td style={{ padding: "0 8px" }}>
                    <Select 
                      value={row.workName || undefined} 
                      onValueChange={(value) => handleWorkNameChange(row.id, value)}
                      onOpenChange={(open) => handleWorkNameSelectClose(row.id, open)}
                      disabled={!row.category}
                    >
                      <SelectTrigger 
                        className="h-9 border-0" 
                        style={{ fontFamily: "Pretendard", fontSize: "14px" }}
                        data-testid={`select-workName-labor-${globalIndex}`}
                      >
                        <SelectValue placeholder="공사명 선택">
                          {row.workName || "공사명 선택"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {getWorkNameOptions(row.category, row.workName).filter(opt => opt && opt.trim() !== '').map(opt => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  
                  {/* 노임항목 */}
                  <td style={{ padding: "0 8px" }}>
                    <Select 
                      value={row.detailItem || undefined} 
                      onValueChange={(value) => updateRow(row.id, 'detailItem', value)}
                      disabled={!row.workName}
                    >
                      <SelectTrigger 
                        className="h-9 border-0" 
                        style={{ fontFamily: "Pretendard", fontSize: "14px" }}
                        data-testid={`select-laborItem-${globalIndex}`}
                      >
                        <SelectValue placeholder="선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {getDetailItemOptions(row.category, row.workName, row.detailWork || '노무비').filter(opt => opt && opt.trim() !== '').map(opt => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  
                  {/* 복구면적 */}
                  <td style={{ padding: "0 8px" }}>
                    <Input
                      type="number"
                      step="0.1"
                      value={Number(Number(row.damageArea || 0).toFixed(1))}
                      onChange={(e) => updateRow(row.id, 'damageArea', Math.round(Number(e.target.value) * 10) / 10 || 0)}
                      className="h-9 border text-center"
                      style={{ fontFamily: "Pretendard", fontSize: "14px" }}
                      data-testid={`input-recoveryArea-labor-${globalIndex}`}
                    />
                  </td>
                  
                  {/* 적용단가 */}
                  <td style={{ padding: "0 8px" }}>
                    <Input
                      type="number"
                      value={row.pricePerSqm || 0}
                      onChange={(e) => updateRow(row.id, 'pricePerSqm', Number(e.target.value) || 0)}
                      className="h-9 border text-center"
                      style={{ fontFamily: "Pretendard", fontSize: "14px" }}
                      data-testid={`input-unitPrice-labor-${globalIndex}`}
                    />
                  </td>
                  
                  {/* 수량(인) */}
                  <td style={{ padding: "0 8px" }}>
                    <Input
                      type="number"
                      step="0.01"
                      value={row.quantity}
                      onChange={(e) => updateRow(row.id, 'quantity', Number(e.target.value) || 0)}
                      className="h-9 border text-center"
                      style={{ fontFamily: "Pretendard", fontSize: "14px" }}
                      data-testid={`input-quantity-labor-${globalIndex}`}
                    />
                  </td>
                  
                  {/* 합계 */}
                  <td style={{ padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600, color: "#0C0C0C", textAlign: "center", background: "rgba(12, 12, 12, 0.02)" }}>
                    {(row.amount ?? 0).toLocaleString()}
                  </td>
                  
                  {/* 경비 여부 */}
                  <td style={{ padding: "0 12px", textAlign: "center" }}>
                    <Checkbox
                      checked={!row.includeInEstimate}
                      onCheckedChange={(checked) => updateRow(row.id, 'includeInEstimate', !checked)}
                      data-testid={`checkbox-expense-labor-${globalIndex}`}
                    />
                  </td>
                  
                  {/* 비고 */}
                  <td style={{ padding: "0 8px" }}>
                    <Input
                      value={row.request}
                      onChange={(e) => updateRow(row.id, 'request', e.target.value)}
                      className="h-9 border"
                      style={{ fontFamily: "Pretendard", fontSize: "14px" }}
                      placeholder=""
                      data-testid={`input-note-labor-${globalIndex}`}
                    />
                  </td>
                </tr>
              );
            })
          ))}
        </tbody>
      </table>

      {/* 피해면적산출표 데이터 선택 팝업 - 이미지 UI에 맞게 구현 */}
      <Dialog open={areaPopupOpen} onOpenChange={(open) => !open && handleAreaPopupClose()}>
        <DialogContent 
          className="max-w-3xl p-0 gap-0 overflow-hidden"
          style={{ borderRadius: "12px" }}
        >
          {/* 헤더 */}
          <div 
            className="text-center py-5 border-b"
            style={{ 
              background: "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)"
            }}
          >
            <DialogTitle 
              style={{ 
                fontFamily: "Pretendard",
                fontWeight: 700,
                fontSize: "20px",
                color: "#1a1a1a"
              }}
            >
              피해면적산출표
            </DialogTitle>
          </div>

          {/* 본문 */}
          <div className="p-6">
            {/* 서브헤더 */}
            <div 
              style={{ 
                fontFamily: "Pretendard",
                fontWeight: 500,
                fontSize: "14px",
                color: "#495057",
                marginBottom: "16px"
              }}
            >
              피해면적산출표
            </div>

            {/* 테이블 - 위치/공사명별 그룹화, 천장/벽체/바닥 표시 */}
            <div className="text-right mb-2" style={{ fontFamily: "Pretendard", fontSize: "12px", color: "#6c757d" }}>
              (단위 : ㎡)
            </div>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full" style={{ borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f8f9fa" }}>
                    <th 
                      className="px-3 py-3 text-center" 
                      style={{ 
                        fontFamily: "Pretendard", 
                        fontSize: "13px", 
                        fontWeight: 500, 
                        color: "#495057",
                        width: "70px",
                        borderBottom: "1px solid #e9ecef",
                        borderRight: "1px solid #e9ecef"
                      }}
                    >
                      반영
                    </th>
                    <th 
                      className="px-3 py-3 text-center" 
                      style={{ 
                        fontFamily: "Pretendard", 
                        fontSize: "13px", 
                        fontWeight: 500, 
                        color: "#495057",
                        width: "80px",
                        borderBottom: "1px solid #e9ecef",
                        borderRight: "1px solid #e9ecef"
                      }}
                    >
                      위치
                    </th>
                    <th 
                      className="px-3 py-3 text-center" 
                      style={{ 
                        fontFamily: "Pretendard", 
                        fontSize: "13px", 
                        fontWeight: 500, 
                        color: "#495057",
                        width: "100px",
                        borderBottom: "1px solid #e9ecef",
                        borderRight: "1px solid #e9ecef"
                      }}
                    >
                      공사명
                    </th>
                    <th 
                      className="px-3 py-3 text-center" 
                      colSpan={3}
                      style={{ 
                        fontFamily: "Pretendard", 
                        fontSize: "13px", 
                        fontWeight: 500, 
                        color: "#495057",
                        borderBottom: "1px solid #e9ecef"
                      }}
                    >
                      복구면적
                    </th>
                  </tr>
                  <tr style={{ backgroundColor: "#f8f9fa" }}>
                    <th style={{ borderBottom: "1px solid #e9ecef", borderRight: "1px solid #e9ecef" }}></th>
                    <th style={{ borderBottom: "1px solid #e9ecef", borderRight: "1px solid #e9ecef" }}></th>
                    <th style={{ borderBottom: "1px solid #e9ecef", borderRight: "1px solid #e9ecef" }}></th>
                    <th 
                      className="px-2 py-2 text-center" 
                      style={{ 
                        fontFamily: "Pretendard", 
                        fontSize: "12px", 
                        fontWeight: 400, 
                        color: "#6c757d",
                        width: "70px",
                        borderBottom: "1px solid #e9ecef",
                        borderRight: "1px solid #e9ecef"
                      }}
                    >
                      천장
                    </th>
                    <th 
                      className="px-2 py-2 text-center" 
                      style={{ 
                        fontFamily: "Pretendard", 
                        fontSize: "12px", 
                        fontWeight: 400, 
                        color: "#6c757d",
                        width: "70px",
                        borderBottom: "1px solid #e9ecef",
                        borderRight: "1px solid #e9ecef"
                      }}
                    >
                      벽체
                    </th>
                    <th 
                      className="px-2 py-2 text-center" 
                      style={{ 
                        fontFamily: "Pretendard", 
                        fontSize: "12px", 
                        fontWeight: 400, 
                        color: "#6c757d",
                        width: "70px",
                        borderBottom: "1px solid #e9ecef"
                      }}
                    >
                      바닥
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {groupedAreaRows.map((group, idx) => (
                    <tr 
                      key={group.key} 
                      className="cursor-pointer transition-colors"
                      style={{ 
                        backgroundColor: selectedGroupKey === group.key ? "#e7f5ff" : "white",
                        borderBottom: "1px solid #e9ecef"
                      }}
                      onClick={() => setSelectedGroupKey(group.key)}
                    >
                      <td className="px-3 py-3 text-center" style={{ borderRight: "1px solid #e9ecef" }}>
                        <div className="flex justify-center">
                          <div
                            className="w-5 h-5 rounded-full border-2 flex items-center justify-center cursor-pointer"
                            style={{
                              borderColor: selectedGroupKey === group.key ? "#228be6" : "#ced4da",
                              backgroundColor: selectedGroupKey === group.key ? "#228be6" : "white"
                            }}
                            data-testid={`radio-area-group-${idx}`}
                          >
                            {selectedGroupKey === group.key && (
                              <div 
                                className="w-2 h-2 rounded-full" 
                                style={{ backgroundColor: "white" }}
                              />
                            )}
                          </div>
                        </div>
                      </td>
                      <td 
                        className="px-3 py-3 text-center"
                        style={{ fontFamily: "Pretendard", fontSize: "14px", color: "#1a1a1a", borderRight: "1px solid #e9ecef" }}
                      >
                        {group.category || '-'}
                      </td>
                      <td 
                        className="px-3 py-3 text-center"
                        style={{ fontFamily: "Pretendard", fontSize: "14px", color: "#1a1a1a", borderRight: "1px solid #e9ecef" }}
                      >
                        {group.workName || '-'}
                      </td>
                      <td 
                        className="px-2 py-3 text-center"
                        style={{ fontFamily: "Pretendard", fontSize: "14px", color: "#1a1a1a", borderRight: "1px solid #e9ecef" }}
                      >
                        {group.천장 > 0 ? group.천장.toFixed(2) : ''}
                      </td>
                      <td 
                        className="px-2 py-3 text-center"
                        style={{ fontFamily: "Pretendard", fontSize: "14px", color: "#1a1a1a", borderRight: "1px solid #e9ecef" }}
                      >
                        {group.벽체 > 0 ? group.벽체.toFixed(2) : ''}
                      </td>
                      <td 
                        className="px-2 py-3 text-center"
                        style={{ fontFamily: "Pretendard", fontSize: "14px", color: "#1a1a1a" }}
                      >
                        {group.바닥 > 0 ? group.바닥.toFixed(2) : ''}
                      </td>
                    </tr>
                  ))}
                  {groupedAreaRows.length === 0 && (
                    <tr>
                      <td 
                        colSpan={6} 
                        className="px-4 py-8 text-center"
                        style={{ fontFamily: "Pretendard", fontSize: "14px", color: "#868e96" }}
                      >
                        일치하는 데이터가 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 하단 버튼 */}
          <div 
            className="flex border-t"
            style={{ minHeight: "56px" }}
          >
            <button
              onClick={handleAreaPopupClose}
              className="flex-1 py-4 text-center transition-colors hover:bg-gray-50"
              style={{
                fontFamily: "Pretendard",
                fontWeight: 500,
                fontSize: "16px",
                color: "#228be6",
                backgroundColor: "white",
                border: "none",
                cursor: "pointer"
              }}
              data-testid="button-area-cancel"
            >
              취소
            </button>
            <button
              onClick={handleAreaRowImport}
              disabled={!selectedGroupKey}
              className="flex-1 py-4 text-center transition-colors"
              style={{
                fontFamily: "Pretendard",
                fontWeight: 500,
                fontSize: "16px",
                color: "white",
                backgroundColor: selectedGroupKey ? "#228be6" : "#adb5bd",
                border: "none",
                cursor: selectedGroupKey ? "pointer" : "not-allowed"
              }}
              data-testid="button-area-import"
            >
              불러오기
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
