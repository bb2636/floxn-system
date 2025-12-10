import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, GripVertical, Lock, Plus, Minus } from "lucide-react";

// MaterialCatalogItem matches excel_data 자재비 response
export interface MaterialCatalogItem {
  workType: string; // 공종 (원인공사, 목공사, 수장공사 등)
  workName: string; // 공사명 (방수, 합판, 도배 등)
  materialName: string; // 자재항목 (방수프라이머 18L, PVC배관 등)
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
  단위: string; // 단위 (m², EA 등)
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
  // 자재비 카탈로그에서 공종 목록 추출 (자재비 DB에 있는 공종만 표시)
  const materialCategoryOptions = useMemo(() => {
    const categories = new Set(catalog.map(item => item.workType));
    const sorted = Array.from(categories).sort();
    console.log('[자재비 공종 드롭다운] catalog 개수:', catalog.length, '공종 목록:', sorted);
    return sorted;
  }, [catalog]);

  // 공종별로 필터링된 공사명 옵션
  const getWorkNamesForWorkType = (workType: string) => {
    if (!workType) return [];
    const matchingItems = catalog.filter(item => item.workType === workType);
    const names = new Set(matchingItems.map(item => item.workName));
    return Array.from(names).sort();
  };

  // 공종 + 공사명별로 필터링된 자재항목 옵션
  const getMaterialNamesForWorkTypeAndWorkName = (workType: string, workName: string) => {
    if (!workType || !workName) return [];
    const matchingItems = catalog.filter(item => 
      item.workType === workType && item.workName === workName
    );
    const names = new Set(matchingItems.map(item => item.materialName));
    return Array.from(names).sort();
  };

  // (구버전 호환용) 공종별로 필터링된 자재명 옵션
  const getMaterialNamesForWorkType = (workType: string) => {
    if (!workType) return [];
    const matchingItems = catalog.filter(item => item.workType === workType);
    const names = new Set(matchingItems.map(item => item.materialName));
    return Array.from(names).sort();
  };

  // 선택된 공종, 공사명, 자재항목에 따른 규격/단가 가져오기
  const getSpecificationsForMaterial = (workType: string, workName: string, materialName: string) => {
    return catalog
      .filter(item => 
        item.workType === workType && 
        item.workName === workName && 
        item.materialName === materialName
      )
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

        // 공사명 변경 시 → 자재항목 초기화
        if (field === '공사명') {
          updated.자재항목 = '';
          updated.자재 = '';
          updated.규격 = '';
          updated.단위 = '';
          updated.단가 = 0;
          updated.기준단가 = 0;
          console.log('[자재비] 공사명 선택:', value);
        }

        // 자재항목 변경 시 → 단가 자동 설정
        if (field === '자재항목' || field === '자재') {
          updated.자재항목 = value;
          updated.자재 = value;
          updated.규격 = '';
          updated.단위 = '';
          updated.단가 = 0;
          updated.기준단가 = 0;
          
          // 카탈로그에서 공종+공사명+자재항목으로 단가 가져오기
          const catalogItems = catalog.filter(item =>
            item.workType === updated.공종 &&
            item.workName === updated.공사명 &&
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
          console.log('[자재비] 자재항목 선택:', value, '공종:', updated.공종, '공사명:', updated.공사명);
        }

        // 수량 변경 시 합계 재계산
        if (field === '수량m2' || field === '수량EA' || field === '수량') {
          const qty = (updated.수량m2 || 0) + (updated.수량EA || 0);
          updated.수량 = qty;
          updated.합계 = Math.round(updated.단가 * qty);
          updated.금액 = updated.합계;
        }

        // 단가 변경 시 합계 재계산
        if (field === '단가' || field === '기준단가') {
          const qty = (updated.수량m2 || 0) + (updated.수량EA || 0);
          updated.합계 = Math.round(updated.단가 * qty);
          updated.금액 = updated.합계;
        }

        return updated;
      }
      return row;
    }));
  };

  // 공종 내 행 추가
  const addRowToGroup = (workType: string) => {
    if (isReadOnly) return;
    
    const newRow: MaterialRow = {
      id: `material-manual-${Date.now()}-${Math.random()}`,
      공종: workType,
      공사명: '',
      자재항목: '',
      자재: '',
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
      isLinkedFromRecovery: false, // 수동 추가 행
    };
    
    // 해당 공종의 마지막 행 뒤에 추가
    const lastIndexOfGroup = rows.reduce((lastIdx, row, idx) => 
      row.공종 === workType ? idx : lastIdx, -1);
    
    if (lastIndexOfGroup >= 0) {
      const newRows = [...rows];
      newRows.splice(lastIndexOfGroup + 1, 0, newRow);
      onRowsChange(newRows);
    } else {
      onRowsChange([...rows, newRow]);
    }
  };

  // 공종 내 행 삭제
  const removeRowFromGroup = (rowId: string, workType: string) => {
    if (isReadOnly) return;
    
    // 해당 공종 그룹 내 행이 1개면 삭제 불가
    const groupRows = rows.filter(r => r.공종 === workType);
    if (groupRows.length <= 1) return;
    
    onRowsChange(rows.filter(r => r.id !== rowId));
  };

  // 공종별 그룹화
  const groupedRows = useMemo(() => {
    const groups: { [key: string]: MaterialRow[] } = {};
    rows.forEach(row => {
      const key = row.공종 || '미분류';
      if (!groups[key]) groups[key] = [];
      groups[key].push(row);
    });
    return groups;
  }, [rows]);

  // 전역 인덱스 계산용
  let globalIndex = 0;

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
          <tr
            style={{
              background: "rgba(12, 12, 12, 0.02)",
              height: "40px",
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
            <th style={{ padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 500, color: "rgba(12, 12, 12, 0.6)", textAlign: "left", borderBottom: "1px solid #E5E7EB", minWidth: "120px" }}>공종</th>
            <th style={{ padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 500, color: "rgba(12, 12, 12, 0.6)", textAlign: "left", borderBottom: "1px solid #E5E7EB", minWidth: "100px" }}>공사명</th>
            <th style={{ padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 500, color: "rgba(12, 12, 12, 0.6)", textAlign: "left", borderBottom: "1px solid #E5E7EB", minWidth: "150px" }}>자재항목</th>
            <th style={{ padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 500, color: "rgba(12, 12, 12, 0.6)", textAlign: "right", borderBottom: "1px solid #E5E7EB", minWidth: "80px" }}>단가</th>
            <th style={{ padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 500, color: "rgba(12, 12, 12, 0.6)", textAlign: "center", borderBottom: "1px solid #E5E7EB", minWidth: "150px" }}>수량</th>
            <th style={{ padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 500, color: "rgba(12, 12, 12, 0.6)", textAlign: "center", borderBottom: "1px solid #E5E7EB", minWidth: "60px" }}>단위</th>
            <th style={{ padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 500, color: "rgba(12, 12, 12, 0.6)", textAlign: "right", borderBottom: "1px solid #E5E7EB", minWidth: "100px" }}>합계</th>
            <th style={{ padding: "0 12px", fontFamily: "Pretendard", fontSize: "14px", fontWeight: 500, color: "rgba(12, 12, 12, 0.6)", textAlign: "left", borderBottom: "1px solid #E5E7EB", minWidth: "150px" }}>비고</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(groupedRows).map(([workType, groupRows]) => (
            groupRows.map((row, rowIndex) => {
              const currentGlobalIndex = globalIndex++;
              // 공종별 공사명 목록 (방수, 합판, 도배 등)
              const workNamesForRow = getWorkNamesForWorkType(row.공종);
              // 공종+공사명별 자재항목 목록 (방수프라이머, PVC배관 등)
              const materialNamesForRow = getMaterialNamesForWorkTypeAndWorkName(row.공종, row.공사명);
              
              // 자재항목 값 (자재항목 또는 자재 사용)
              const materialItem = row.자재항목 || row.자재 || '';
              // 단가 값 (단가 또는 기준단가 사용)
              const price = row.단가 || row.기준단가 || 0;
              // 수량 계산 (m2 + EA)
              const quantity = (row.수량m2 || 0) + (row.수량EA || 0);
              // 합계 값 (합계 또는 금액 사용)
              const total = row.합계 || row.금액 || Math.round(price * quantity);
              // 연동 행인지 확인 (복구면적에서 자동 생성된 행)
              const isLinkedRow = row.isLinkedFromRecovery === true;
              // 수량 표시 텍스트
              const quantityDisplay = isLinkedRow 
                ? `(${row.수량m2 || 0}바닥+벽체+천장)` 
                : (quantity > 0 ? quantity.toString() : '');
              
              return (
                <tr 
                  key={row.id} 
                  style={{ 
                    height: "48px", 
                    borderBottom: "1px solid #E5E7EB",
                    background: isLinkedRow ? "rgba(59, 130, 246, 0.03)" : undefined,
                  }}
                  title={isLinkedRow ? "복구면적에서 자동 생성된 행 (수정 불가)" : undefined}
                >
                  {/* 체크박스 */}
                  <td style={{ padding: "0 12px", textAlign: "center" }}>
                    <input
                      type="checkbox"
                      checked={selectedRows.has(row.id)}
                      onChange={() => onSelectRow(row.id)}
                      data-testid={`checkbox-material-${currentGlobalIndex}`}
                    />
                  </td>
                  
                  {/* 공종 - 첫 번째 행에만 rowspan으로 표시, +/- 버튼 포함 */}
                  {rowIndex === 0 ? (
                    <td 
                      rowSpan={groupRows.length} 
                      style={{ 
                        padding: "8px 12px", 
                        verticalAlign: "top",
                        borderRight: "1px solid #E5E7EB",
                      }}
                    >
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
                            marginBottom: "8px",
                          }}
                          title="복구면적에서 연동됨 (수정 불가)"
                        >
                          <Lock style={{ width: "12px", height: "12px", marginRight: "6px", opacity: 0.6 }} />
                          {row.공종 || ""}
                        </div>
                      ) : workType === '미분류' || !row.공종 ? (
                        // 미분류 그룹 또는 공종이 없는 행: 드롭다운으로 공종 선택 가능
                        <Select 
                          value={row.공종 || ''} 
                          onValueChange={(value) => {
                            console.log('[자재비 공종 드롭다운] 선택됨:', value);
                            // 해당 그룹 내 모든 행의 공종을 업데이트하고 공사명도 초기화
                            onRowsChange(rows.map(r => {
                              if (groupRows.some(gr => gr.id === r.id)) {
                                return { 
                                  ...r, 
                                  공종: value,
                                  공사명: '-', // 공종 선택 시 공사명 초기화 (자재항목 선택 시 자동 갱신)
                                  자재항목: '', // 자재항목 초기화
                                  자재: '',
                                  규격: '',
                                  단위: '',
                                  단가: 0,
                                  기준단가: 0,
                                  수량: 0,
                                  합계: 0,
                                  금액: 0,
                                };
                              }
                              return r;
                            }));
                          }}
                          disabled={isReadOnly || isLoading}
                        >
                          <SelectTrigger 
                            className="h-9 mb-2" 
                            style={{ fontFamily: "Pretendard", fontSize: "14px" }}
                            data-testid={`select-공종-group-${rowIndex}`}
                          >
                            <SelectValue placeholder={isLoading ? "로딩 중..." : "공종 선택"} />
                          </SelectTrigger>
                          <SelectContent>
                            {isLoading ? (
                              <SelectItem value="_loading" disabled>로딩 중...</SelectItem>
                            ) : materialCategoryOptions.length === 0 ? (
                              <SelectItem value="_empty" disabled>공종 데이터 없음</SelectItem>
                            ) : (
                              materialCategoryOptions.map(cat => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      ) : (
                        // 공종이 이미 설정된 경우: 텍스트로 표시
                        <div style={{ fontFamily: "Pretendard", fontSize: "14px", marginBottom: "8px" }}>
                          {row.공종}
                        </div>
                      )}
                      
                      {/* +/- 버튼 */}
                      {!isReadOnly && (
                        <div style={{ display: "flex", gap: "4px" }}>
                          <button
                            onClick={() => addRowToGroup(workType)}
                            style={{
                              width: "24px",
                              height: "24px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              background: "#3B82F6",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                              fontSize: "16px",
                              fontWeight: "bold",
                            }}
                            data-testid={`button-add-material-${workType}`}
                          >
                            +
                          </button>
                          <button
                            onClick={() => removeRowFromGroup(row.id, workType)}
                            disabled={groupRows.length <= 1}
                            style={{
                              width: "24px",
                              height: "24px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              background: groupRows.length <= 1 ? "#f5f5f5" : "#FF4D4F",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              cursor: groupRows.length <= 1 ? "not-allowed" : "pointer",
                              fontSize: "16px",
                              fontWeight: "bold",
                            }}
                            data-testid={`button-remove-material-${workType}`}
                          >
                            −
                          </button>
                        </div>
                      )}
                    </td>
                  ) : null}
                  
                  {/* 공사명 - 자재비 DB의 자재명을 드롭다운으로 표시 */}
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
                        title="복구면적에서 연동됨"
                      >
                        <Lock style={{ width: "12px", height: "12px", marginRight: "6px", opacity: 0.6 }} />
                        {row.공사명 || "-"}
                      </div>
                    ) : (
                      <Select 
                        value={row.공사명 || ''} 
                        onValueChange={(value) => {
                          console.log('[자재비 공사명 드롭다운] 선택됨:', value, '공종:', row.공종);
                          // 공사명 선택 시 자재항목 초기화
                          onRowsChange(rows.map(r => 
                            r.id === row.id 
                              ? { ...r, 공사명: value, 자재항목: '', 자재: '', 규격: '', 단위: '', 단가: 0, 기준단가: 0 }
                              : r
                          ));
                        }}
                        disabled={!row.공종 || isReadOnly}
                      >
                        <SelectTrigger 
                          className="h-9 border-0" 
                          style={{ fontFamily: "Pretendard", fontSize: "14px" }}
                          data-testid={`select-공사명-material-${currentGlobalIndex}`}
                        >
                          <SelectValue placeholder={row.공종 ? "선택" : "공종 먼저 선택"} />
                        </SelectTrigger>
                        <SelectContent>
                          {workNamesForRow.filter(name => name && name.trim() !== '').map(name => (
                            <SelectItem key={name} value={name}>{name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </td>
                  
                  {/* 자재항목 */}
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
                        {materialItem || "-"}
                      </div>
                    ) : (
                      <Select 
                        value={materialItem} 
                        onValueChange={(value) => updateRow(row.id, '자재항목', value)}
                        disabled={!row.공종 || !row.공사명 || isReadOnly}
                      >
                        <SelectTrigger 
                          className="h-9 border-0" 
                          style={{ fontFamily: "Pretendard", fontSize: "14px" }}
                          data-testid={`select-자재항목-${currentGlobalIndex}`}
                        >
                          <SelectValue placeholder={!row.공종 ? "공종 먼저 선택" : (!row.공사명 ? "공사명 먼저 선택" : "선택")} />
                        </SelectTrigger>
                        <SelectContent>
                          {materialNamesForRow.filter(name => name && name.trim() !== '').map(name => (
                            <SelectItem key={name} value={name}>{name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </td>
                  
                  {/* 단가 */}
                  <td style={{ 
                    padding: "0 12px", 
                    fontFamily: "Pretendard", 
                    fontSize: "14px", 
                    color: isLinkedRow ? "rgba(59, 130, 246, 0.9)" : "rgba(12, 12, 12, 0.8)", 
                    textAlign: "right" 
                  }}>
                    {price > 0 ? price.toLocaleString() : "-"}
                  </td>
                  
                  {/* 수량 - 연동 행은 수식 표시, 수동 행은 입력 */}
                  <td style={{ padding: "0 8px", background: "#EFF6FF" }}>
                    {isLinkedRow ? (
                      <div 
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "12px",
                          color: "rgba(59, 130, 246, 0.9)",
                          textAlign: "center",
                          padding: "4px 8px",
                        }}
                        title="바닥+벽체+천장 면적 합계"
                      >
                        ({row.수량m2 || 0}바닥+벽체+천장)
                      </div>
                    ) : (
                      <Input
                        type="number"
                        value={quantity || ''}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 0;
                          // 수량 변경 시 수량m2로 저장
                          onRowsChange(rows.map(r => {
                            if (r.id === row.id) {
                              const newTotal = Math.round((r.단가 || r.기준단가 || 0) * val);
                              return { ...r, 수량m2: val, 수량EA: 0, 수량: val, 합계: newTotal, 금액: newTotal };
                            }
                            return r;
                          }));
                        }}
                        className="h-9 border-0 bg-transparent text-center"
                        style={{ fontFamily: "Pretendard", fontSize: "14px" }}
                        placeholder="수동 입력"
                        disabled={isReadOnly}
                        data-testid={`input-수량-${currentGlobalIndex}`}
                      />
                    )}
                  </td>
                  
                  {/* 단위 */}
                  <td style={{ 
                    padding: "0 12px", 
                    fontFamily: "Pretendard", 
                    fontSize: "14px", 
                    color: isLinkedRow ? "rgba(59, 130, 246, 0.9)" : "rgba(12, 12, 12, 0.8)", 
                    textAlign: "center" 
                  }}>
                    {row.단위 || "m²"}
                  </td>
                  
                  {/* 합계 */}
                  <td style={{ 
                    padding: "0 12px", 
                    fontFamily: "Pretendard", 
                    fontSize: "14px", 
                    fontWeight: 600, 
                    color: isLinkedRow ? "rgba(59, 130, 246, 0.9)" : "#0C0C0C", 
                    textAlign: "right", 
                    background: isLinkedRow ? "rgba(59, 130, 246, 0.05)" : "rgba(12, 12, 12, 0.02)" 
                  }}>
                    {total > 0 ? total.toLocaleString() : "단가x수량"}
                  </td>
                  
                  {/* 비고 - 연동 행도 수정 가능 */}
                  <td style={{ padding: "0 8px", background: "#EFF6FF" }}>
                    <Input
                      value={row.비고}
                      onChange={(e) => {
                        onRowsChange(rows.map(r => r.id === row.id ? { ...r, 비고: e.target.value } : r));
                      }}
                      className="h-9 border-0 bg-transparent"
                      style={{ fontFamily: "Pretendard", fontSize: "14px" }}
                      placeholder=""
                      disabled={isReadOnly}
                      data-testid={`input-비고-${currentGlobalIndex}`}
                    />
                  </td>
                </tr>
              );
            })
          ))}
        </tbody>
      </table>
    </div>
  );
}
