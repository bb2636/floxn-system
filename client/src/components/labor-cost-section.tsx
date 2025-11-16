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
  공종: string; // select
  공사명: string; // select (filtered by 공종)
  세부공사: string; // select (filtered by 공사명)
  세부항목: string; // select (filtered by 세부공사)
  단위: string; // readonly
  기준가_단위: number; // readonly (단가_인 for 노무비)
  수량: number; // editable
  적용면: '천장' | '벽체' | '바닥' | '길이' | ''; // checkbox selection (only one can be selected)
  기준가_적용면: number; // readonly (단가_천장/벽체/바닥/길이)
  피해면적: number; // editable
  금액: number; // calculated
  요청: string; // editable input with placeholder "-"
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
  const 공종Options = useMemo(() => {
    if (!catalog.length) return [];
    const unique = new Set(catalog.map(item => item.공종));
    return Array.from(unique);
  }, [catalog]);

  const get공사명Options = (공종: string) => {
    if (!catalog.length || !공종) return [];
    const filtered = catalog.filter(item => item.공종 === 공종);
    const unique = new Set(filtered.map(item => item.공사명));
    return Array.from(unique);
  };

  const get세부공사Options = (공종: string, 공사명: string) => {
    if (!catalog.length || !공종 || !공사명) return [];
    const filtered = catalog.filter(item => 
      item.공종 === 공종 && item.공사명 === 공사명
    );
    const unique = new Set(filtered.map(item => item.세부공사));
    return Array.from(unique);
  };

  const get세부항목Options = (공종: string, 공사명: string, 세부공사: string) => {
    if (!catalog.length || !공종 || !공사명 || !세부공사) return [];
    const filtered = catalog.filter(item => 
      item.공종 === 공종 && 
      item.공사명 === 공사명 && 
      item.세부공사 === 세부공사
    );
    return filtered.map(item => item.세부항목);
  };

  const get적용면Options = (공종: string, 공사명: string, 세부공사: string, 세부항목: string) => {
    if (!catalog.length || !공종 || !공사명 || !세부공사 || !세부항목) return [];
    const item = catalog.find(i => 
      i.공종 === 공종 && 
      i.공사명 === 공사명 && 
      i.세부공사 === 세부공사 && 
      i.세부항목 === 세부항목
    );
    if (!item) return [];
    
    const options: Array<'천장' | '벽체' | '바닥' | '길이'> = [];
    if (item.단가_천장 !== null) options.push('천장');
    if (item.단가_벽체 !== null) options.push('벽체');
    if (item.단가_바닥 !== null) options.push('바닥');
    if (item.단가_길이 !== null) options.push('길이');
    return options;
  };

  // 행 업데이트
  const updateRow = (rowId: string, field: keyof LaborCostRow, value: any) => {
    onRowsChange(rows.map(row => {
      if (row.id === rowId) {
        const updated = { ...row, [field]: value };

        // 공종 변경 시 하위 필드 리셋
        if (field === '공종') {
          updated.공사명 = '';
          updated.세부공사 = '';
          updated.세부항목 = '';
          updated.단위 = '';
          updated.기준가_단위 = 0;
          updated.적용면 = '';
          updated.기준가_적용면 = 0;
        }

        // 공사명 변경 시 하위 필드 리셋
        if (field === '공사명') {
          updated.세부공사 = '';
          updated.세부항목 = '';
          updated.단위 = '';
          updated.기준가_단위 = 0;
          updated.적용면 = '';
          updated.기준가_적용면 = 0;
        }

        // 세부공사 변경 시 하위 필드 리셋
        if (field === '세부공사') {
          updated.세부항목 = '';
          updated.단위 = '';
          updated.기준가_단위 = 0;
          updated.적용면 = '';
          updated.기준가_적용면 = 0;
        }

        // 세부항목 변경 시 카탈로그에서 데이터 채우기
        if (field === '세부항목') {
          const catalogItem = catalog.find(item =>
            item.공종 === updated.공종 &&
            item.공사명 === updated.공사명 &&
            item.세부공사 === updated.세부공사 &&
            item.세부항목 === value
          );
          if (catalogItem) {
            updated.단위 = catalogItem.단위 || '';
            updated.기준가_단위 = catalogItem.단가_인 || 0;
            // 적용면 기본값 설정
            if (catalogItem.단가_천장) updated.적용면 = '천장';
            else if (catalogItem.단가_벽체) updated.적용면 = '벽체';
            else if (catalogItem.단가_바닥) updated.적용면 = '바닥';
            else if (catalogItem.단가_길이) updated.적용면 = '길이';
            
            // 기준가_적용면 설정
            if (updated.적용면 === '천장') updated.기준가_적용면 = catalogItem.단가_천장 || 0;
            else if (updated.적용면 === '벽체') updated.기준가_적용면 = catalogItem.단가_벽체 || 0;
            else if (updated.적용면 === '바닥') updated.기준가_적용면 = catalogItem.단가_바닥 || 0;
            else if (updated.적용면 === '길이') updated.기준가_적용면 = catalogItem.단가_길이 || 0;
          }
        }

        // 적용면 변경 시 기준가_적용면 업데이트
        if (field === '적용면') {
          if (value === '') {
            // 적용면 선택 해제 시 기준가와 금액 리셋
            updated.기준가_적용면 = 0;
          } else {
            const catalogItem = catalog.find(item =>
              item.공종 === updated.공종 &&
              item.공사명 === updated.공사명 &&
              item.세부공사 === updated.세부공사 &&
              item.세부항목 === updated.세부항목
            );
            if (catalogItem) {
              if (value === '천장') updated.기준가_적용면 = catalogItem.단가_천장 || 0;
              else if (value === '벽체') updated.기준가_적용면 = catalogItem.단가_벽체 || 0;
              else if (value === '바닥') updated.기준가_적용면 = catalogItem.단가_바닥 || 0;
              else if (value === '길이') updated.기준가_적용면 = catalogItem.단가_길이 || 0;
            }
          }
        }

        // 금액 계산 (타입을 명시적으로 number로 변환)
        const 기준가_단위 = Number(updated.기준가_단위) || 0;
        const 수량 = Number(updated.수량) || 0;
        const 기준가_적용면 = Number(updated.기준가_적용면) || 0;
        const 피해면적 = Number(updated.피해면적) || 0;
        
        if (updated.세부공사 === '노무비') {
          updated.금액 = Math.round(기준가_단위 * 수량);
        } else if (updated.세부공사 === '일위대가') {
          updated.금액 = Math.round(기준가_적용면 * 피해면적 * 수량);
        } else {
          updated.금액 = 0;
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
                  value={row.공종} 
                  onValueChange={(value) => updateRow(row.id, '공종', value)}
                >
                  <SelectTrigger 
                    className="h-9 border-0" 
                    style={{ fontFamily: "Pretendard", fontSize: "14px" }}
                    data-testid={`select-공종-${index}`}
                  >
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {공종Options.map(opt => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>
              
              {/* 공사명 - Select */}
              <td style={{ padding: "0 8px" }}>
                <Select 
                  value={row.공사명} 
                  onValueChange={(value) => updateRow(row.id, '공사명', value)}
                  disabled={!row.공종}
                >
                  <SelectTrigger 
                    className="h-9 border-0" 
                    style={{ fontFamily: "Pretendard", fontSize: "14px" }}
                    data-testid={`select-공사명-${index}`}
                  >
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {get공사명Options(row.공종).map(opt => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>
              
              {/* 세부공사 - Select */}
              <td style={{ padding: "0 8px" }}>
                <Select 
                  value={row.세부공사} 
                  onValueChange={(value) => updateRow(row.id, '세부공사', value)}
                  disabled={!row.공사명}
                >
                  <SelectTrigger 
                    className="h-9 border-0" 
                    style={{ fontFamily: "Pretendard", fontSize: "14px" }}
                    data-testid={`select-세부공사-${index}`}
                  >
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {get세부공사Options(row.공종, row.공사명).map(opt => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>
              
              {/* 세부항목 - Select */}
              <td style={{ padding: "0 8px" }}>
                <Select 
                  value={row.세부항목} 
                  onValueChange={(value) => updateRow(row.id, '세부항목', value)}
                  disabled={!row.세부공사}
                >
                  <SelectTrigger 
                    className="h-9 border-0" 
                    style={{ fontFamily: "Pretendard", fontSize: "14px" }}
                    data-testid={`select-세부항목-${index}`}
                  >
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {get세부항목Options(row.공종, row.공사명, row.세부공사).map(opt => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>
              
              {/* 단위 - Readonly */}
              <td style={{ padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", color: "rgba(12, 12, 12, 0.6)", textAlign: "left" }}>
                {row.단위 || '-'}
              </td>
              
              {/* 기준가(원/단위) - Readonly */}
              <td style={{ padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", color: "rgba(12, 12, 12, 0.8)", textAlign: "right" }}>
                {row.기준가_단위.toLocaleString()}
              </td>
              
              {/* 수량 - Editable Input */}
              <td style={{ padding: "0 8px", background: "#EFF6FF" }}>
                <Input
                  type="number"
                  value={row.수량}
                  onChange={(e) => updateRow(row.id, '수량', Number(e.target.value) || 0)}
                  className="h-9 border-0 bg-transparent text-right"
                  style={{ fontFamily: "Pretendard", fontSize: "14px" }}
                  data-testid={`input-수량-${index}`}
                />
              </td>
              
              {/* 적용면 - Checkboxes (항상 4개 표시, 한 번에 하나만 선택 가능) */}
              <td style={{ padding: "0 8px", background: "#EFF6FF" }}>
                <div className="flex gap-4">
                  {(['천장', '벽체', '바닥', '길이'] as const).map(opt => {
                    const checkboxId = `checkbox-${row.id}-${opt}`;
                    return (
                      <div key={opt} className="flex items-center gap-1">
                        <Checkbox
                          id={checkboxId}
                          checked={row.적용면 === opt}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              updateRow(row.id, '적용면', opt);
                            } else {
                              updateRow(row.id, '적용면', '');
                            }
                          }}
                          data-testid={`checkbox-적용면-${opt}-${index}`}
                        />
                        <label 
                          htmlFor={checkboxId}
                          style={{ 
                            fontFamily: "Pretendard", 
                            fontSize: "13px", 
                            cursor: "pointer",
                            color: row.적용면 === opt ? "#0C0C0C" : "rgba(12, 12, 12, 0.6)"
                          }}
                        >
                          {opt}
                        </label>
                      </div>
                    );
                  })}
                </div>
              </td>
              
              {/* 기준가(㎡/길이) - Readonly (항상 표시) */}
              <td style={{ padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", color: "rgba(12, 12, 12, 0.8)", textAlign: "right" }}>
                {row.기준가_적용면.toLocaleString()}
              </td>
              
              {/* 피해면적 - Editable Input (항상 표시) */}
              <td style={{ padding: "0 8px", background: "#EFF6FF" }}>
                <Input
                  type="number"
                  value={row.피해면적}
                  onChange={(e) => updateRow(row.id, '피해면적', Number(e.target.value) || 0)}
                  className="h-9 border-0 bg-transparent text-right"
                  style={{ fontFamily: "Pretendard", fontSize: "14px" }}
                  data-testid={`input-피해면적-${index}`}
                />
              </td>
              
              {/* 금액(원) - Readonly Calculated */}
              <td style={{ padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600, color: "#0C0C0C", textAlign: "right", background: "rgba(12, 12, 12, 0.02)" }}>
                {row.금액.toLocaleString()}
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
                  value={row.요청}
                  onChange={(e) => updateRow(row.id, '요청', e.target.value)}
                  className="h-9 border-0 bg-transparent"
                  style={{ fontFamily: "Pretendard", fontSize: "14px" }}
                  placeholder="-"
                  data-testid={`input-요청-${index}`}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
