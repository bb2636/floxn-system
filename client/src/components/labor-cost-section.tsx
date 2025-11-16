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
import { Copy } from "lucide-react";

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
}

export function LaborCostSection({
  rows,
  onRowsChange,
  catalog,
  selectedRows,
  onSelectRow,
  onSelectAll,
  isLoading = false,
}: LaborCostSectionProps) {
  // 캐스케이딩 옵션 생성
  const categoryOptions = useMemo(() => {
    if (!catalog.length) return ["누수탐지비용"]; // 누수탐지비용은 항상 표시
    const unique = new Set(catalog.map(item => item.공종));
    const categories = Array.from(unique);
    // 누수탐지비용이 catalog에 없으면 추가
    if (!categories.includes("누수탐지비용")) {
      return ["누수탐지비용", ...categories];
    }
    return categories;
  }, [catalog]);

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
          updated.amount = Math.round(standardPrice * quantity);
        } else if (updated.detailWork === '일위대가') {
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
            <th style={{ width: "80px", padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 500, color: "rgba(12, 12, 12, 0.6)", textAlign: "center", borderBottom: "1px solid #E5E7EB" }}>복제</th>
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
                  value={row.category} 
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
                    {categoryOptions.map(opt => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>
              
              {/* 공사명 - Select */}
              <td style={{ padding: "0 8px" }}>
                <Select 
                  value={row.workName} 
                  onValueChange={(value) => updateRow(row.id, 'workName', value)}
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
                    {getWorkNameOptions(row.category).map(opt => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>
              
              {/* 세부공사 - Select */}
              <td style={{ padding: "0 8px" }}>
                <Select 
                  value={row.detailWork} 
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
                    {getDetailWorkOptions(row.category, row.workName).map(opt => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>
              
              {/* 세부항목 - Select */}
              <td style={{ padding: "0 8px" }}>
                <Select 
                  value={row.detailItem} 
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
                    {getDetailItemOptions(row.category, row.workName, row.detailWork).map(opt => (
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
              
              {/* 적용면 - Radio buttons (only one can be selected) */}
              <td style={{ padding: "0 8px", background: "#EFF6FF" }}>
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
              </td>
              
              {/* 기준가(㎡/길이) - Readonly */}
              <td style={{ padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", color: "rgba(12, 12, 12, 0.8)", textAlign: "right" }}>
                {(row.pricePerSqm ?? 0).toLocaleString()}
              </td>
              
              {/* 피해면적 - Editable Input */}
              <td style={{ padding: "0 8px", background: "#EFF6FF" }}>
                <Input
                  type="number"
                  value={row.damageArea}
                  onChange={(e) => updateRow(row.id, 'damageArea', Number(e.target.value) || 0)}
                  className="h-9 border-0 bg-transparent text-right"
                  style={{ fontFamily: "Pretendard", fontSize: "14px" }}
                  data-testid={`input-damageArea-${index}`}
                />
              </td>
              
              {/* 금액(원) - Readonly Calculated */}
              <td style={{ padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600, color: "#0C0C0C", textAlign: "right", background: "rgba(12, 12, 12, 0.02)" }}>
                {(row.amount ?? 0).toLocaleString()}
              </td>
              
              {/* 복제 버튼 */}
              <td style={{ padding: "0 12px", textAlign: "center" }}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => duplicateRow(row)}
                  className="h-8 w-8"
                  data-testid={`button-duplicate-${index}`}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </td>
              
              {/* 요청 - Editable Input */}
              <td style={{ padding: "0 8px" }}>
                <Input
                  value={row.request}
                  onChange={(e) => updateRow(row.id, 'request', e.target.value)}
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
  );
}
