import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import { useMemo } from "react";

// MaterialCatalogItem matches excel_data 자재비 response
export interface MaterialCatalogItem {
  workType: string; // 공종명
  materialName: string;
  specification: string;
  unit: string;
  standardPrice: number | string; // number or "입력"
}

export interface MaterialRow {
  id: string;
  공종: string; // 노무비에서 가져온 공종
  자재: string; // 드롭다운
  규격: string; // 입력 필드
  단위: string; // 읽기전용
  기준단가: number; // 읽기전용
  수량: number; // 입력
  금액: number; // 계산값
  비고: string; // 입력
  sourceLaborRowId?: string; // 노무비 행 ID 추적
}

interface MaterialCostSectionProps {
  rows: MaterialRow[];
  onRowsChange: (rows: MaterialRow[]) => void;
  catalog: MaterialCatalogItem[];
  laborCategories: string[]; // 노무비의 공종 리스트
  selectedRows: Set<string>;
  onSelectRow: (rowId: string) => void;
  onSelectAll: () => void;
  isLoading?: boolean;
}

export function MaterialCostSection({
  rows,
  onRowsChange,
  catalog,
  laborCategories,
  selectedRows,
  onSelectRow,
  onSelectAll,
  isLoading = false,
}: MaterialCostSectionProps) {
  // 공종별로 필터링된 자재명 옵션
  const getMaterialNamesForWorkType = (workType: string) => {
    if (!workType) return [];
    const names = new Set(
      catalog
        .filter(item => item.workType === workType)
        .map(item => item.materialName)
    );
    return Array.from(names).sort();
  };

  // 선택된 공종과 자재명에 따른 규격 옵션
  const getSpecificationsForMaterial = (workType: string, materialName: string) => {
    return catalog
      .filter(item => item.workType === workType && item.materialName === materialName)
      .map(item => ({
        spec: item.specification,
        unit: item.unit,
        price: item.standardPrice,
      }));
  };

  // 행 업데이트
  const updateRow = (rowId: string, field: keyof MaterialRow, value: any) => {
    onRowsChange(rows.map(row => {
      if (row.id === rowId) {
        const updated = { ...row, [field]: value };

        // 자재 변경 시 규격 리셋
        if (field === '자재') {
          updated.규격 = '';
          updated.단위 = '';
          updated.기준단가 = 0;
        }

        // 규격 변경 시 카탈로그에서 단위와 가격 가져오기
        if (field === '규격') {
          const catalogItem = catalog.find(item =>
            item.workType === updated.공종 &&
            item.materialName === updated.자재 && 
            item.specification === value
          );
          if (catalogItem) {
            updated.단위 = catalogItem.unit;
            // standardPrice가 "입력"이면 0, 아니면 숫자 값
            updated.기준단가 = typeof catalogItem.standardPrice === 'string' ? 0 : catalogItem.standardPrice;
          }
        }

        // 공종 변경 시 자재/규격 리셋 (공종 정보는 노무비에서만 사용)
        if (field === '공종') {
          updated.자재 = '';
          updated.규격 = '';
          updated.단위 = '';
          updated.기준단가 = 0;
        }

        // 기준단가, 수량, 규격 변경 시 금액 재계산
        const qty = Number(updated.수량) || 0;
        const price = Number(updated.기준단가) || 0;
        updated.금액 = Math.round(qty * price);

        return updated;
      }
      return row;
    }));
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
          minWidth: "1400px",
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
              <input 
                type="checkbox"
                checked={selectedRows.size === rows.length && rows.length > 0}
                onChange={onSelectAll}
                data-testid="checkbox-select-all-material"
              />
            </th>
            <th style={{ padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 500, color: "rgba(12, 12, 12, 0.6)", textAlign: "left", borderBottom: "1px solid #E5E7EB" }}>공종</th>
            <th style={{ padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 500, color: "rgba(12, 12, 12, 0.6)", textAlign: "left", borderBottom: "1px solid #E5E7EB" }}>자재</th>
            <th style={{ padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 500, color: "rgba(12, 12, 12, 0.6)", textAlign: "left", borderBottom: "1px solid #E5E7EB" }}>규격</th>
            <th style={{ padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 500, color: "rgba(12, 12, 12, 0.6)", textAlign: "left", borderBottom: "1px solid #E5E7EB" }}>단위</th>
            <th style={{ padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 500, color: "rgba(12, 12, 12, 0.6)", textAlign: "right", borderBottom: "1px solid #E5E7EB" }}>기준단가</th>
            <th style={{ padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 500, color: "rgba(12, 12, 12, 0.6)", textAlign: "right", borderBottom: "1px solid #E5E7EB" }}>수량</th>
            <th style={{ padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 500, color: "rgba(12, 12, 12, 0.6)", textAlign: "right", borderBottom: "1px solid #E5E7EB" }}>금액</th>
            <th style={{ padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 500, color: "rgba(12, 12, 12, 0.6)", textAlign: "left", borderBottom: "1px solid #E5E7EB" }}>비고</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const materialNamesForRow = getMaterialNamesForWorkType(row.공종);
            const specOptions = (row.공종 && row.자재) ? getSpecificationsForMaterial(row.공종, row.자재) : [];
            
            // 규격이 "입력"인지 확인 (기준단가가 수동 입력 가능한지)
            const catalogItem = catalog.find(item =>
              item.workType === row.공종 &&
              item.materialName === row.자재 && 
              item.specification === row.규격
            );
            const isManualPriceInput = catalogItem && typeof catalogItem.standardPrice === 'string';
            
            return (
              <tr key={row.id} style={{ height: "56px", borderBottom: "1px solid #E5E7EB" }}>
                {/* 체크박스 */}
                <td style={{ padding: "0 12px", textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={selectedRows.has(row.id)}
                    onChange={() => onSelectRow(row.id)}
                    data-testid={`checkbox-material-${index}`}
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
                      data-testid={`select-공종-material-${index}`}
                    >
                      <SelectValue placeholder="선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {laborCategories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                
                {/* 자재 - Select (공종 선택 후 활성화되며, 공종별로 필터링됨) */}
                <td style={{ padding: "0 8px" }}>
                  <Select 
                    value={row.자재} 
                    onValueChange={(value) => updateRow(row.id, '자재', value)}
                    disabled={!row.공종}
                  >
                    <SelectTrigger 
                      className="h-9 border-0" 
                      style={{ fontFamily: "Pretendard", fontSize: "14px" }}
                      data-testid={`select-자재-${index}`}
                    >
                      <SelectValue placeholder={row.공종 ? "선택" : "공종 먼저 선택"} />
                    </SelectTrigger>
                    <SelectContent>
                      {materialNamesForRow.map(name => (
                        <SelectItem key={name} value={name}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                
                {/* 규격 - Select (자재 선택 후 활성화) */}
                <td style={{ padding: "0 8px" }}>
                  <Select 
                    value={row.규격} 
                    onValueChange={(value) => updateRow(row.id, '규격', value)}
                    disabled={!row.자재}
                  >
                    <SelectTrigger 
                      className="h-9 border-0" 
                      style={{ fontFamily: "Pretendard", fontSize: "14px" }}
                      data-testid={`select-규격-${index}`}
                    >
                      <SelectValue placeholder="선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {specOptions.map((opt, idx) => (
                        <SelectItem key={`${opt.spec}-${idx}`} value={opt.spec}>
                          {opt.spec}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                
                {/* 단위 - Readonly */}
                <td style={{ padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", color: "rgba(12, 12, 12, 0.6)", textAlign: "left" }}>
                  {row.단위 || '-'}
                </td>
                
                {/* 기준단가 - 규격이 "입력"이면 수동 입력 가능, 아니면 Readonly */}
                <td style={{ padding: "0 8px", background: isManualPriceInput ? "#EFF6FF" : "transparent" }}>
                  {isManualPriceInput ? (
                    <Input
                      type="number"
                      value={Number.isFinite(row.기준단가) ? row.기준단가 : ''}
                      onChange={(e) => updateRow(row.id, '기준단가', Number(e.target.value) || 0)}
                      className="h-9 border-0 bg-transparent text-right"
                      style={{ fontFamily: "Pretendard", fontSize: "14px" }}
                      placeholder="입력"
                      data-testid={`input-기준단가-${index}`}
                    />
                  ) : (
                    <div style={{ padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", color: "rgba(12, 12, 12, 0.8)", textAlign: "right" }}>
                      {row.기준단가.toLocaleString()}
                    </div>
                  )}
                </td>
                
                {/* 수량 - Editable Input (파란색 배경) */}
                <td style={{ padding: "0 8px", background: "#EFF6FF" }}>
                  <Input
                    type="number"
                    value={row.수량 || ''}
                    onChange={(e) => updateRow(row.id, '수량', Number(e.target.value) || 0)}
                    className="h-9 border-0 bg-transparent text-right"
                    style={{ fontFamily: "Pretendard", fontSize: "14px" }}
                    data-testid={`input-수량-material-${index}`}
                  />
                </td>
                
                {/* 금액 - Readonly Calculated */}
                <td style={{ padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600, color: "#0C0C0C", textAlign: "right", background: "rgba(12, 12, 12, 0.02)" }}>
                  {row.금액.toLocaleString()}
                </td>
                
                {/* 비고 - Editable Input (파란색 배경) */}
                <td style={{ padding: "0 8px", background: "#EFF6FF" }}>
                  <Input
                    value={row.비고}
                    onChange={(e) => updateRow(row.id, '비고', e.target.value)}
                    className="h-9 border-0 bg-transparent"
                    style={{ fontFamily: "Pretendard", fontSize: "14px" }}
                    placeholder="현장 변동에 따라 변동"
                    data-testid={`input-비고-${index}`}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
