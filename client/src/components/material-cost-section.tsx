import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, GripVertical, Lock } from "lucide-react";

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
  공사명: string; // 노무비에서 가져온 공사명 (읽기전용) - 내부 참조용
  자재항목: string; // 자재명 (기존 자재 필드 대체)
  자재: string; // 자재명 (호환용)
  규격: string; // 규격 (내부용)
  단위: string; // 단위 (내부용)
  단가: number; // 단가 (기존 기준단가 대체)
  기준단가: number; // 호환용
  수량m2: number; // 수량(m2) - 바닥+벽체+천장
  수량EA: number; // 수량(EA)
  수량: number; // 호환용 (총 수량)
  합계: number; // 합계 (기존 금액 대체)
  금액: number; // 호환용
  비고: string; // 입력
  sourceLaborRowId?: string; // 노무비 행 ID 추적
  sourceAreaRowId?: string; // 복구면적 산출표 행 ID 추적
  isLinkedFromRecovery?: boolean; // 복구면적에서 연동 생성된 행인지 (true: 수정불가, false/undefined: 수정가능)
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
  isReadOnly?: boolean; // 읽기 전용 모드
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
  isReadOnly = false,
}: MaterialCostSectionProps) {
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

  // 자재비 카탈로그에서 공종 목록 추출 (자재비 DB에 있는 공종만 표시)
  const materialCategoryOptions = useMemo(() => {
    const categories = new Set(catalog.map(item => item.workType));
    return Array.from(categories).sort();
  }, [catalog]);

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
    if (isReadOnly) return;
    
    // 연동 행은 수정 불가
    const targetRow = rows.find(r => r.id === rowId);
    if (targetRow?.isLinkedFromRecovery) return;
    
    onRowsChange(rows.map(row => {
      if (row.id === rowId) {
        const updated = { ...row, [field]: value };

        // 자재항목 변경 시 (= 자재 변경)
        if (field === '자재항목' || field === '자재') {
          updated.자재항목 = value;
          updated.자재 = value;
          updated.규격 = '';
          updated.단위 = '';
          updated.단가 = 0;
          updated.기준단가 = 0;
          
          // 카탈로그에서 첫 번째 규격의 단가 가져오기
          const catalogItems = catalog.filter(item =>
            item.workType === updated.공종 &&
            item.materialName === value
          );
          if (catalogItems.length > 0) {
            const first = catalogItems[0];
            updated.규격 = first.specification;
            updated.단위 = first.unit;
            const price = typeof first.standardPrice === 'string' ? 0 : first.standardPrice;
            updated.단가 = price;
            updated.기준단가 = price;
          }
        }

        // 공종 변경 시 자재/규격 리셋
        if (field === '공종') {
          let autoMaterial = '';
          if (value === '도장공사') {
            autoMaterial = '페인트';
          } else if (value === '목공사' && updated.공사명 === '반자틀') {
            autoMaterial = '각재';
          } else if (value === '목공사' && updated.공사명 === '걸레받이') {
            autoMaterial = '걸레받이';
          } else if (value === '목공사' && updated.공사명 === '몰딩') {
            autoMaterial = '몰딩';
          }
          updated.자재항목 = autoMaterial;
          updated.자재 = autoMaterial;
          updated.규격 = '';
          updated.단위 = '';
          updated.단가 = 0;
          updated.기준단가 = 0;
        }

        // 수량 변경 시 합계 재계산
        if (field === '수량m2' || field === '수량EA' || field === '단가') {
          const m2 = Number(updated.수량m2) || 0;
          const ea = Number(updated.수량EA) || 0;
          const price = Number(updated.단가) || 0;
          
          // 합계 = 단가 * (수량m2 + 수량EA)
          const total = Math.round(price * (m2 + ea));
          updated.합계 = total;
          updated.금액 = total;
          updated.수량 = m2 + ea;
        }

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
          minWidth: "900px",
        }}
      >
        <thead>
          {/* 첫 번째 행: 메인 헤더 */}
          <tr
            style={{
              background: "rgba(12, 12, 12, 0.02)",
              height: "32px",
            }}
          >
            <th rowSpan={2} style={{ width: "40px", padding: "0 4px", textAlign: "center", borderBottom: "1px solid #E5E7EB" }}></th>
            <th rowSpan={2} style={{ width: "50px", padding: "0 12px", textAlign: "center", borderBottom: "1px solid #E5E7EB" }}>
              <input 
                type="checkbox"
                checked={selectedRows.size === rows.length && rows.length > 0}
                onChange={onSelectAll}
                data-testid="checkbox-select-all-material"
              />
            </th>
            <th rowSpan={2} style={{ padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 500, color: "rgba(12, 12, 12, 0.6)", textAlign: "left", borderBottom: "1px solid #E5E7EB", minWidth: "100px" }}>공종</th>
            <th rowSpan={2} style={{ padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 500, color: "rgba(12, 12, 12, 0.6)", textAlign: "left", borderBottom: "1px solid #E5E7EB", minWidth: "120px" }}>자재항목</th>
            <th rowSpan={2} style={{ padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 500, color: "rgba(12, 12, 12, 0.6)", textAlign: "right", borderBottom: "1px solid #E5E7EB", minWidth: "80px" }}>단가</th>
            <th colSpan={2} style={{ padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 500, color: "rgba(12, 12, 12, 0.6)", textAlign: "center", borderBottom: "1px solid #E5E7EB", minWidth: "200px" }}>수량</th>
            <th rowSpan={2} style={{ padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 500, color: "rgba(12, 12, 12, 0.6)", textAlign: "right", borderBottom: "1px solid #E5E7EB", minWidth: "100px" }}>합계</th>
            <th rowSpan={2} style={{ padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 500, color: "rgba(12, 12, 12, 0.6)", textAlign: "left", borderBottom: "1px solid #E5E7EB", minWidth: "150px" }}>비고</th>
          </tr>
          {/* 두 번째 행: 수량 서브헤더 */}
          <tr
            style={{
              background: "rgba(12, 12, 12, 0.02)",
              height: "28px",
            }}
          >
            <th style={{ padding: "0 12px", fontFamily: "Pretendard", fontSize: "12px", fontWeight: 400, color: "rgba(12, 12, 12, 0.5)", textAlign: "center", borderBottom: "1px solid #E5E7EB" }}>
              m2<br/><span style={{ fontSize: "10px" }}>(바닥+벽체+천장)</span>
            </th>
            <th style={{ padding: "0 12px", fontFamily: "Pretendard", fontSize: "12px", fontWeight: 400, color: "rgba(12, 12, 12, 0.5)", textAlign: "center", borderBottom: "1px solid #E5E7EB" }}>
              EA
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const materialNamesForRow = getMaterialNamesForWorkType(row.공종);
            
            // 자재항목 값 (자재항목 또는 자재 사용)
            const materialItem = row.자재항목 || row.자재 || '';
            // 단가 값 (단가 또는 기준단가 사용)
            const price = row.단가 || row.기준단가 || 0;
            // 합계 값 (합계 또는 금액 사용)
            const total = row.합계 || row.금액 || 0;
            // 연동 행인지 확인 (복구면적에서 자동 생성된 행)
            const isLinkedRow = row.isLinkedFromRecovery === true;
            
            return (
              <tr 
                key={row.id} 
                draggable={!isReadOnly && !isLinkedRow}
                onDragStart={(e) => handleDragStart(e, row.id)}
                onDragOver={(e) => handleDragOver(e, row.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, row.id)}
                onDragEnd={handleDragEnd}
                style={{ 
                  height: "56px", 
                  borderBottom: "1px solid #E5E7EB",
                  opacity: draggedRowId === row.id ? 0.5 : 1,
                  background: dragOverRowId === row.id 
                    ? "rgba(59, 130, 246, 0.1)" 
                    : isLinkedRow 
                      ? "rgba(59, 130, 246, 0.03)" // 연동 행 배경색
                      : undefined,
                  transition: "background 0.2s",
                }}
                title={isLinkedRow ? "복구면적에서 자동 생성된 행 (수정 불가)" : undefined}
              >
                {/* 드래그 핸들 */}
                <td 
                  style={{ 
                    padding: "0 4px", 
                    textAlign: "center",
                    cursor: isReadOnly ? "default" : "grab",
                  }}
                >
                  <GripVertical 
                    className="w-4 h-4" 
                    style={{ 
                      color: isReadOnly ? "rgba(12, 12, 12, 0.2)" : "rgba(12, 12, 12, 0.4)",
                      margin: "0 auto",
                    }} 
                  />
                </td>
                {/* 체크박스 */}
                <td style={{ padding: "0 12px", textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={selectedRows.has(row.id)}
                    onChange={() => onSelectRow(row.id)}
                    data-testid={`checkbox-material-${index}`}
                  />
                </td>
                
                {/* 공종 - Select 또는 잠금 표시 */}
                <td style={{ padding: "0 8px" }}>
                  {isLinkedRow ? (
                    <div 
                      style={{
                        display: "flex",
                        alignItems: "center",
                        height: "36px",
                        padding: "0 8px",
                        fontFamily: "Pretendard",
                        fontSize: "14px",
                        color: "rgba(59, 130, 246, 0.9)",
                        background: "rgba(59, 130, 246, 0.08)",
                        borderRadius: "6px",
                        border: "1px solid rgba(59, 130, 246, 0.2)",
                      }}
                      title="복구면적에서 연동됨 (수정 불가)"
                    >
                      <Lock style={{ width: "12px", height: "12px", marginRight: "6px", opacity: 0.6 }} />
                      {row.공종 || ""}
                    </div>
                  ) : (
                    <Select 
                      value={row.공종} 
                      onValueChange={(value) => updateRow(row.id, '공종', value)}
                      disabled={isReadOnly}
                    >
                      <SelectTrigger 
                        className="h-9 border-0" 
                        style={{ fontFamily: "Pretendard", fontSize: "14px" }}
                        data-testid={`select-공종-material-${index}`}
                      >
                        <SelectValue placeholder="선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {materialCategoryOptions.filter(cat => cat && cat.trim() !== '').map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </td>
                
                {/* 자재항목 - Select 또는 잠금 표시 */}
                <td style={{ padding: "0 8px" }}>
                  {isLinkedRow ? (
                    <div 
                      style={{
                        display: "flex",
                        alignItems: "center",
                        height: "36px",
                        padding: "0 8px",
                        fontFamily: "Pretendard",
                        fontSize: "14px",
                        color: "rgba(59, 130, 246, 0.9)",
                        background: "rgba(59, 130, 246, 0.08)",
                        borderRadius: "6px",
                        border: "1px solid rgba(59, 130, 246, 0.2)",
                      }}
                      title="복구면적에서 연동됨 (수정 불가)"
                    >
                      <Lock style={{ width: "12px", height: "12px", marginRight: "6px", opacity: 0.6 }} />
                      {materialItem || ""}
                    </div>
                  ) : (
                    <Select 
                      value={materialItem} 
                      onValueChange={(value) => updateRow(row.id, '자재항목', value)}
                      disabled={!row.공종 || isReadOnly}
                    >
                      <SelectTrigger 
                        className="h-9 border-0" 
                        style={{ fontFamily: "Pretendard", fontSize: "14px" }}
                        data-testid={`select-자재항목-${index}`}
                      >
                        <SelectValue placeholder={row.공종 ? "선택" : "공종 먼저 선택"} />
                      </SelectTrigger>
                      <SelectContent>
                        {materialNamesForRow.filter(name => name && name.trim() !== '').map(name => (
                          <SelectItem key={name} value={name}>{name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </td>
                
                {/* 단가 - Readonly */}
                <td style={{ padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", color: "rgba(12, 12, 12, 0.8)", textAlign: "right" }}>
                  {price.toLocaleString()}
                </td>
                
                {/* 수량(m2) - Editable Input (연동 행은 수정 불가) */}
                <td style={{ padding: "0 8px", background: isLinkedRow ? "rgba(59, 130, 246, 0.05)" : "#EFF6FF" }}>
                  <Input
                    type="number"
                    value={row.수량m2 || ''}
                    onChange={(e) => updateRow(row.id, '수량m2', Number(e.target.value) || 0)}
                    className="h-9 border-0 bg-transparent text-center"
                    style={{ 
                      fontFamily: "Pretendard", 
                      fontSize: "14px",
                      color: isLinkedRow ? "rgba(59, 130, 246, 0.9)" : undefined,
                    }}
                    disabled={isReadOnly || isLinkedRow}
                    data-testid={`input-수량m2-${index}`}
                  />
                </td>
                
                {/* 수량(EA) - Editable Input (연동 행은 수정 불가) */}
                <td style={{ padding: "0 8px", background: isLinkedRow ? "rgba(59, 130, 246, 0.05)" : "#EFF6FF" }}>
                  <Input
                    type="number"
                    value={row.수량EA || ''}
                    onChange={(e) => updateRow(row.id, '수량EA', Number(e.target.value) || 0)}
                    className="h-9 border-0 bg-transparent text-center"
                    style={{ 
                      fontFamily: "Pretendard", 
                      fontSize: "14px",
                      color: isLinkedRow ? "rgba(59, 130, 246, 0.9)" : undefined,
                    }}
                    disabled={isReadOnly || isLinkedRow}
                    data-testid={`input-수량EA-${index}`}
                  />
                </td>
                
                {/* 합계 - Readonly Calculated */}
                <td style={{ 
                  padding: "0 12px", 
                  fontFamily: "Pretendard", 
                  fontSize: "14px", 
                  fontWeight: 600, 
                  color: isLinkedRow ? "rgba(59, 130, 246, 0.9)" : "#0C0C0C", 
                  textAlign: "right", 
                  background: isLinkedRow ? "rgba(59, 130, 246, 0.05)" : "rgba(12, 12, 12, 0.02)" 
                }}>
                  {total.toLocaleString()}
                </td>
                
                {/* 비고 - Editable Input (연동 행은 수정 불가) */}
                <td style={{ padding: "0 8px", background: isLinkedRow ? "rgba(59, 130, 246, 0.05)" : "#EFF6FF" }}>
                  <Input
                    value={row.비고}
                    onChange={(e) => updateRow(row.id, '비고', e.target.value)}
                    className="h-9 border-0 bg-transparent"
                    style={{ 
                      fontFamily: "Pretendard", 
                      fontSize: "14px",
                      color: isLinkedRow ? "rgba(59, 130, 246, 0.9)" : undefined,
                    }}
                    placeholder={isLinkedRow ? "복구면적에서 연동됨" : "현장 상황에 따라 변동"}
                    disabled={isReadOnly || isLinkedRow}
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
