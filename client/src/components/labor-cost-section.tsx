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
import { Copy, Search } from "lucide-react";
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
}: LaborCostSectionProps) {
  // 공사명 선택 팝업 상태
  const [areaPopupOpen, setAreaPopupOpen] = useState(false);
  const [areaPopupRowId, setAreaPopupRowId] = useState<string | null>(null);
  const [areaPopupWorkName, setAreaPopupWorkName] = useState<string>("");
  const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null); // 팝업에서 선택된 그룹 key

  // 공사명 선택 시 팝업 열기
  const handleWorkNameChange = (rowId: string, workName: string) => {
    // 먼저 workName 업데이트
    updateRow(rowId, 'workName', workName);
    
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
    
    // 현재 노무비 행의 공종 가져오기
    const currentRow = rows.find(r => r.id === areaPopupRowId);
    const workType = currentRow?.category || '';
    
    onRowsChange(rows.map(row => {
      if (row.id === areaPopupRowId) {
        const updated = { ...row, damageArea };
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

  const getWorkNameOptions = (category: string) => {
    if (!category) return [];
    // 누수탐지비용 특수 케이스
    if (category === "누수탐지비용") {
      return ["종합검사"];
    }
    if (!catalog.length) return [];
    const filtered = catalog.filter(item => item.공종 === category);
    const unique = new Set(filtered.map(item => item.공사명));
    return Array.from(unique);
  };

  const getDetailWorkOptions = (category: string, workName: string) => {
    if (!category || !workName) return [];
    // 누수탐지비용 특수 케이스
    if (category === "누수탐지비용" && workName === "종합검사") {
      return ["1회", "2회", "3회 이상"];
    }
    if (!catalog.length) return [];
    const filtered = catalog.filter(item => 
      item.공종 === category && item.공사명 === workName
    );
    const unique = new Set(filtered.map(item => item.세부공사));
    return Array.from(unique);
  };

  const getDetailItemOptions = (category: string, workName: string, detailWork: string) => {
    if (!catalog.length || !category || !workName || !detailWork) return [];
    const filtered = catalog.filter(item => 
      item.공종 === category && 
      item.공사명 === workName && 
      item.세부공사 === detailWork
    );
    return filtered.map(item => item.세부항목);
  };

  const getApplicationRateOptions = (category: string, workName: string, detailWork: string, detailItem: string) => {
    if (!catalog.length || !category || !workName || !detailWork || !detailItem) return [];
    // 동일한 세부항목이 여러 개 있을 수 있으므로 모든 항목 찾기
    const items = catalog.filter(i => 
      i.공종 === category && 
      i.공사명 === workName && 
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

  // 행 업데이트
  const updateRow = (rowId: string, field: keyof LaborCostRow, value: any) => {
    if (isReadOnly) return;
    onRowsChange(rows.map(row => {
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
          updated.detailWork = '';
          updated.detailItem = '';
          updated.unit = '';
          updated.standardPrice = 0;
          updated.applicationRates = { ceiling: false, wall: false, floor: false, molding: false };
          updated.pricePerSqm = 0;
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
          const catalogItem = catalog.find(item =>
            item.공종 === updated.category &&
            item.공사명 === updated.workName &&
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
        }

        // applicationRates 변경 시 pricePerSqm 업데이트
        if (field === 'applicationRates') {
          const catalogItem = catalog.find(item =>
            item.공종 === updated.category &&
            item.공사명 === updated.workName &&
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
    }));
  };

  // 행 복제
  const duplicateRow = (row: LaborCostRow) => {
    const newRow = { ...row, id: `labor-${Date.now()}-${Math.random()}` };
    onRowsChange([...rows, newRow]);
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
          borderCollapse: "separate",
          borderSpacing: 0,
          minWidth: "2000px",
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
              <Checkbox 
                checked={selectedRows.size === rows.length && rows.length > 0}
                onCheckedChange={onSelectAll}
                data-testid="checkbox-select-all-labor" 
              />
            </th>
            <th style={{ padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 500, color: "rgba(12, 12, 12, 0.6)", textAlign: "left", borderBottom: "1px solid #E5E7EB" }}>공종</th>
            <th style={{ padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 500, color: "rgba(12, 12, 12, 0.6)", textAlign: "left", borderBottom: "1px solid #E5E7EB" }}>공사명</th>
            <th style={{ padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 500, color: "rgba(12, 12, 12, 0.6)", textAlign: "left", borderBottom: "1px solid #E5E7EB" }}>세부공사</th>
            <th style={{ padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 500, color: "rgba(12, 12, 12, 0.6)", textAlign: "left", borderBottom: "1px solid #E5E7EB" }}>세부항목</th>
            <th style={{ padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 500, color: "rgba(12, 12, 12, 0.6)", textAlign: "left", borderBottom: "1px solid #E5E7EB" }}>단위</th>
            <th style={{ padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 500, color: "rgba(12, 12, 12, 0.6)", textAlign: "right", borderBottom: "1px solid #E5E7EB" }}>기준가(원/단위)</th>
            <th style={{ padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 500, color: "rgba(12, 12, 12, 0.6)", textAlign: "right", borderBottom: "1px solid #E5E7EB" }}>수량</th>
            <th style={{ width: "300px", padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 500, color: "rgba(12, 12, 12, 0.6)", textAlign: "left", borderBottom: "1px solid #E5E7EB" }}>적용면</th>
            <th style={{ padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 500, color: "rgba(12, 12, 12, 0.6)", textAlign: "right", borderBottom: "1px solid #E5E7EB" }}>기준가(㎡/길이)</th>
            <th style={{ padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 500, color: "rgba(12, 12, 12, 0.6)", textAlign: "right", borderBottom: "1px solid #E5E7EB" }}>피해면적</th>
            <th style={{ padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 500, color: "rgba(12, 12, 12, 0.6)", textAlign: "right", borderBottom: "1px solid #E5E7EB" }}>금액(원)</th>
            <th style={{ width: "80px", padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 500, color: "rgba(12, 12, 12, 0.6)", textAlign: "center", borderBottom: "1px solid #E5E7EB" }}>경비 여부</th>
            <th style={{ padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 500, color: "rgba(12, 12, 12, 0.6)", textAlign: "left", borderBottom: "1px solid #E5E7EB" }}>요청</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id} style={{ height: "56px", borderBottom: "1px solid #E5E7EB" }}>
              {/* 체크박스 */}
              <td style={{ padding: "0 12px", textAlign: "center" }}>
                <Checkbox 
                  checked={selectedRows.has(row.id)}
                  onCheckedChange={() => onSelectRow(row.id)}
                  data-testid={`checkbox-labor-${index}`}
                />
              </td>
              
              {/* 공종 - Select */}
              <td style={{ padding: "0 8px" }}>
                <Select 
                  value={row.category || undefined} 
                  onValueChange={(value) => updateRow(row.id, 'category', value)}
                >
                  <SelectTrigger 
                    className="h-9 border-0" 
                    style={{ fontFamily: "Pretendard", fontSize: "14px" }}
                    data-testid={`select-category-${index}`}
                  >
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.filter(opt => opt && opt.trim() !== '').map(opt => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>
              
              {/* 공사명 - Select */}
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
                    data-testid={`select-workName-${index}`}
                  >
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {getWorkNameOptions(row.category).filter(opt => opt && opt.trim() !== '').map(opt => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>
              
              {/* 세부공사 - Select */}
              <td style={{ padding: "0 8px" }}>
                <Select 
                  value={row.detailWork || undefined} 
                  onValueChange={(value) => updateRow(row.id, 'detailWork', value)}
                  disabled={!row.workName}
                >
                  <SelectTrigger 
                    className="h-9 border-0" 
                    style={{ fontFamily: "Pretendard", fontSize: "14px" }}
                    data-testid={`select-detailWork-${index}`}
                  >
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {getDetailWorkOptions(row.category, row.workName).filter(opt => opt && opt.trim() !== '').map(opt => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>
              
              {/* 세부항목 - Select */}
              <td style={{ padding: "0 8px" }}>
                <Select 
                  value={row.detailItem || undefined} 
                  onValueChange={(value) => updateRow(row.id, 'detailItem', value)}
                  disabled={!row.detailWork}
                >
                  <SelectTrigger 
                    className="h-9 border-0" 
                    style={{ fontFamily: "Pretendard", fontSize: "14px" }}
                    data-testid={`select-detailItem-${index}`}
                  >
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {getDetailItemOptions(row.category, row.workName, row.detailWork).filter(opt => opt && opt.trim() !== '').map(opt => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>
              
              {/* 단위 - Readonly */}
              <td style={{ padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", color: "rgba(12, 12, 12, 0.6)", textAlign: "left" }}>
                {row.unit || '-'}
              </td>
              
              {/* 기준가(원/단위) - Readonly */}
              <td style={{ padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", color: "rgba(12, 12, 12, 0.8)", textAlign: "right" }}>
                {(row.standardPrice ?? 0).toLocaleString()}
              </td>
              
              {/* 수량 - Editable Input */}
              <td style={{ padding: "0 8px", background: "#EFF6FF" }}>
                <Input
                  type="number"
                  value={row.quantity}
                  onChange={(e) => updateRow(row.id, 'quantity', Number(e.target.value) || 0)}
                  className="h-9 border-0 bg-transparent text-right"
                  style={{ fontFamily: "Pretendard", fontSize: "14px" }}
                  data-testid={`input-quantity-${index}`}
                />
              </td>
              
              {/* 적용면 - Radio buttons (only one can be selected), 노무비일 때는 "-" 표시 */}
              <td style={{ padding: "0 8px", background: "#EFF6FF" }}>
                {row.detailWork === "노무비" ? (
                  <span style={{ 
                    fontFamily: "Pretendard", 
                    fontSize: "14px", 
                    color: "rgba(12, 12, 12, 0.4)",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "36px"
                  }}>
                    -
                  </span>
                ) : (
                  <RadioGroup
                    value={
                      row.applicationRates?.ceiling ? 'ceiling' :
                      row.applicationRates?.wall ? 'wall' :
                      row.applicationRates?.floor ? 'floor' :
                      row.applicationRates?.molding ? 'molding' : ''
                    }
                    onValueChange={(value) => {
                      updateRow(row.id, 'applicationRates', {
                        ceiling: value === 'ceiling',
                        wall: value === 'wall',
                        floor: value === 'floor',
                        molding: value === 'molding'
                      });
                    }}
                    className="flex gap-4"
                  >
                    {[
                      { key: 'ceiling' as const, label: '천장' },
                      { key: 'wall' as const, label: '벽체' },
                      { key: 'floor' as const, label: '바닥' },
                      { key: 'molding' as const, label: '길이' }
                    ].map(({ key, label }) => {
                      const isSelected = 
                        (key === 'ceiling' && row.applicationRates?.ceiling) ||
                        (key === 'wall' && row.applicationRates?.wall) ||
                        (key === 'floor' && row.applicationRates?.floor) ||
                        (key === 'molding' && row.applicationRates?.molding);
                      const radioId = `radio-${row.id}-${key}`;
                      return (
                        <div key={key} className="flex items-center gap-1">
                          <RadioGroupItem
                            id={radioId}
                            value={key}
                            data-testid={`radio-applicationRate-${key}-${index}`}
                          />
                          <label 
                            htmlFor={radioId}
                            style={{ 
                              fontFamily: "Pretendard", 
                              fontSize: "13px", 
                              cursor: "pointer",
                              color: isSelected ? "#0C0C0C" : "rgba(12, 12, 12, 0.6)"
                            }}
                          >
                            {label}
                          </label>
                        </div>
                      );
                    })}
                  </RadioGroup>
                )}
              </td>
              
              {/* 기준가(㎡/길이) - Readonly */}
              <td style={{ padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", color: "rgba(12, 12, 12, 0.8)", textAlign: "right" }}>
                {(row.pricePerSqm ?? 0).toLocaleString()}
              </td>
              
              {/* 피해면적 - Editable Input (소수점 1자리 표시) */}
              <td style={{ padding: "0 8px", background: "#EFF6FF" }}>
                <Input
                  type="number"
                  step="0.1"
                  value={Number(row.damageArea.toFixed(1))}
                  onChange={(e) => updateRow(row.id, 'damageArea', Math.round(Number(e.target.value) * 10) / 10 || 0)}
                  className="h-9 border-0 bg-transparent text-right"
                  style={{ fontFamily: "Pretendard", fontSize: "14px" }}
                  data-testid={`input-damageArea-${index}`}
                />
              </td>
              
              {/* 금액(원) - Readonly Calculated */}
              <td style={{ padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600, color: "#0C0C0C", textAlign: "right", background: "rgba(12, 12, 12, 0.02)" }}>
                {(row.amount ?? 0).toLocaleString()}
              </td>
              
              {/* 경비 여부 - Checkbox (체크됨 = 경비, 체크안됨 = 경비아님) */}
              <td style={{ padding: "0 12px", textAlign: "center" }}>
                <Checkbox
                  checked={!row.includeInEstimate}
                  onCheckedChange={(checked) => updateRow(row.id, 'includeInEstimate', !checked)}
                  data-testid={`checkbox-includeInEstimate-${index}`}
                />
              </td>
              
              {/* 요청 - Editable Input with 복제 button */}
              <td style={{ padding: "0 8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <Input
                    value={row.request}
                    onChange={(e) => updateRow(row.id, 'request', e.target.value)}
                    className="h-9 border-0 bg-transparent flex-1"
                    style={{ fontFamily: "Pretendard", fontSize: "14px" }}
                    placeholder="-"
                    data-testid={`input-request-${index}`}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => duplicateRow(row)}
                    className="h-8 w-8 flex-shrink-0"
                    data-testid={`button-duplicate-${index}`}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
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
