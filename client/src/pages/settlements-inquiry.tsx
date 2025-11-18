import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { User, CaseWithLatestProgress, Estimate } from "@shared/schema";
import { Search, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

// 정산 테이블 행 타입
interface SettlementRow {
  id: string;
  caseNumber: string;
  insuranceCompany: string;
  manager: string;
  withdrawalNumber: string;
  accidentNumber: string;
  admin: string;
  withdrawalDate: string;
  constructionStatus: string;
  // 손해방지비용
  preventionEstimateAmount: number;
  preventionApprovedAmount: number;
  preventionDifference: number;
  preventionAdjustmentRate: string;
  // 대물비용
  propertyEstimateAmount: number;
  propertyApprovedAmount: number;
  propertyDifference: number;
  propertyAdjustmentRate: string;
  // 청구액
  claimAmount: number;
}

export default function SettlementsInquiry() {
  const [searchQuery, setSearchQuery] = useState("");
  const [settlementStatus, setSettlementStatus] = useState("전체");
  const [insuranceCompany, setInsuranceCompany] = useState("전체");
  const [assessor, setAssessor] = useState("전체");
  const [manager, setManager] = useState("전체");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [dateRangeOpen, setDateRangeOpen] = useState(false);

  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  const { data: cases = [], isLoading: casesLoading } = useQuery<CaseWithLatestProgress[]>({
    queryKey: ["/api/cases"],
  });

  if (!user) {
    return null;
  }

  // Filter cases with status '청구' (claim)
  const claimCases = cases.filter(c => c.status === "청구");
  const caseIds = claimCases.map(c => c.id);

  // Fetch all estimates in a single batch request using react-query
  const { data: estimatesData, isLoading: estimatesLoading } = useQuery({
    queryKey: ["/api/estimates/batch/latest", caseIds],
    queryFn: async () => {
      if (caseIds.length === 0) return [];
      
      const response = await fetch("/api/estimates/batch/latest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseIds }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch estimates");
      }
      
      return response.json();
    },
    enabled: caseIds.length > 0,
    staleTime: 60000, // 1 minute cache
  });

  // Create a map for quick lookup
  const estimatesMap = useMemo(() => {
    const map = new Map();
    if (estimatesData) {
      for (const item of estimatesData) {
        map.set(item.caseId, item);
      }
    }
    return map;
  }, [estimatesData]);

  // Build table rows using useMemo to ensure proper reactivity
  const tableRows = useMemo(() => {
    if (!user) return [];
    
    return claimCases.map((caseItem) => {
      const estimateData = estimatesMap.get(caseItem.id);
      
      // Calculate estimate total from labor and material costs
      let estimateTotal = 0;
      if (estimateData?.estimate?.laborCostData && estimateData?.estimate?.materialCostData) {
        const laborData = estimateData.estimate.laborCostData as any[];
        const materialData = estimateData.estimate.materialCostData as any[];
        
        const laborTotal = laborData.reduce((sum, row) => sum + (row.amount || 0), 0);
        const materialTotal = materialData.reduce((sum, row) => sum + (row.금액 || 0), 0);
        const baseForFees = laborTotal + materialTotal;
        const managementFee = Math.round(baseForFees * 0.06);
        const profit = Math.round(baseForFees * 0.15);
        const vatBase = laborTotal + materialTotal + managementFee + profit;
        const vat = Math.round(vatBase * 0.1);
        estimateTotal = vatBase + vat;
      } else {
        // Fallback chain: try estimate's totalAmount, then case's estimateAmount
        // Robust parsing that handles string (with commas), number, and null
        const parseAmount = (value: string | number | null | undefined): number => {
          if (value === null || value === undefined) return 0;
          
          // If already a number, return it directly (handle NaN case)
          if (typeof value === 'number') {
            return isNaN(value) ? 0 : value;
          }
          
          // If string, remove commas and parse
          const cleaned = String(value).replace(/,/g, '');
          const parsed = Number(cleaned);
          return isNaN(parsed) ? 0 : parsed;
        };
        
        const storedTotal = parseAmount(estimateData?.estimate?.totalAmount);
        const caseTotal = parseAmount(caseItem.estimateAmount);
        estimateTotal = storedTotal > 0 ? storedTotal : caseTotal;
      }

      // Parse and validate processingTypes
      let processingTypes: string[] = [];
      try {
        if (caseItem.processingTypes) {
          const parsed = JSON.parse(caseItem.processingTypes);
          // Validate that it's an array
          if (Array.isArray(parsed)) {
            // Filter to known processing types
            processingTypes = parsed.filter(type => 
              typeof type === 'string' && 
              ["손해방지", "피해세대복구"].includes(type)
            );
          } else {
            console.warn(`Invalid processingTypes format for case ${caseItem.id}:`, parsed);
          }
        }
      } catch (error) {
        console.error(`Error parsing processingTypes for case ${caseItem.id}:`, error);
      }

      const hasPreventionCost = processingTypes.includes("손해방지");
      const hasPropertyCost = processingTypes.includes("피해세대복구");

      // Calculate estimate amounts
      const preventionEstimateAmount = (hasPreventionCost && estimateTotal > 0) ? estimateTotal : 0;
      const propertyEstimateAmount = (hasPropertyCost && estimateTotal > 0) ? estimateTotal : 0;

      // Calculate approved amounts
      // If reviewDecision is "승인", approved amount equals estimate amount
      // Otherwise, approved amount is 0
      const isApproved = caseItem.reviewDecision === "승인";
      const preventionApprovedAmount = (hasPreventionCost && estimateTotal > 0 && isApproved) ? estimateTotal : 0;
      const propertyApprovedAmount = (hasPropertyCost && estimateTotal > 0 && isApproved) ? estimateTotal : 0;

      // Calculate differences and adjustment rates
      const preventionDifference = preventionApprovedAmount - preventionEstimateAmount;
      const preventionAdjustmentRate = preventionEstimateAmount > 0 
        ? ((preventionDifference / preventionEstimateAmount) * 100).toFixed(1) + "%"
        : "-";

      const propertyDifference = propertyApprovedAmount - propertyEstimateAmount;
      const propertyAdjustmentRate = propertyEstimateAmount > 0
        ? ((propertyDifference / propertyEstimateAmount) * 100).toFixed(1) + "%"
        : "-";

      return {
        id: caseItem.id,
        caseNumber: caseItem.caseNumber,
        insuranceCompany: caseItem.insuranceCompany || "-",
        manager: caseItem.assessorId || "-",
        withdrawalNumber: caseItem.insurancePolicyNo || "-",
        accidentNumber: caseItem.insuranceAccidentNo || "-",
        admin: caseItem.assignedPartner || user.username,
        withdrawalDate: caseItem.completionDate || caseItem.claimDate || "-",
        constructionStatus: caseItem.recoveryType ? "유" : "무",
        preventionEstimateAmount,
        preventionApprovedAmount,
        preventionDifference,
        preventionAdjustmentRate,
        propertyEstimateAmount,
        propertyApprovedAmount,
        propertyDifference,
        propertyAdjustmentRate,
        claimAmount: estimateTotal,
      };
    });
  }, [claimCases, estimatesMap, user]);

  const isLoading = casesLoading || estimatesLoading;

  const handleReset = () => {
    setSearchQuery("");
    setSettlementStatus("전체");
    setInsuranceCompany("전체");
    setAssessor("전체");
    setManager("전체");
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const handleDateRangeApply = () => {
    if (startDate && endDate) {
      setDateRangeOpen(false);
    }
  };

  return (
    <div className="p-8">
      {/* Page title */}
      <div className="flex items-center gap-2 mb-6">
        <h1
          style={{
            fontFamily: "Pretendard",
            fontSize: "26px",
            fontWeight: 600,
            letterSpacing: "-0.02em",
            color: "#0C0C0C",
          }}
        >
          정산 조회
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

      {/* Search and Filter Section */}
      <div
        className="mb-6"
        style={{
          background: "#FFFFFF",
          borderRadius: "12px",
          padding: "24px",
          border: "1px solid rgba(12, 12, 12, 0.08)",
        }}
      >
        <h2
          className="mb-6"
          style={{
            fontFamily: "Pretendard",
            fontSize: "16px",
            fontWeight: 600,
            color: "#0C0C0C",
          }}
        >
          조회하기
        </h2>

        {/* Search */}
        <div className="mb-6">
          <label
            className="block mb-2"
            style={{
              fontFamily: "Pretendard",
              fontSize: "14px",
              fontWeight: 500,
              color: "rgba(12, 12, 12, 0.7)",
            }}
          >
            검색
          </label>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2"
                size={20}
                style={{ color: "rgba(12, 12, 12, 0.4)" }}
              />
              <Input
                type="text"
                placeholder="검색어를 직접 검색"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  height: "48px",
                  paddingLeft: "48px",
                  background: "#FAFAFA",
                  border: "1px solid rgba(12, 12, 12, 0.1)",
                  borderRadius: "8px",
                  fontFamily: "Pretendard",
                  fontSize: "14px",
                }}
                data-testid="input-search-settlements"
              />
            </div>
            <Button
              style={{
                height: "48px",
                padding: "0 32px",
                background: "#008FED",
                borderRadius: "8px",
                fontFamily: "Pretendard",
                fontSize: "14px",
                fontWeight: 600,
                color: "#FFFFFF",
              }}
              data-testid="button-search-settlements"
            >
              검색
            </Button>
          </div>
        </div>

        {/* Filters - All in one row */}
        <div className="flex items-end gap-3">
          {/* 정산여부 */}
          <div style={{ flex: "0 0 auto", minWidth: "120px" }}>
            <label
              className="block mb-2"
              style={{
                fontFamily: "Pretendard",
                fontSize: "14px",
                fontWeight: 500,
                color: "rgba(12, 12, 12, 0.7)",
              }}
            >
              정산여부
            </label>
            <Select value={settlementStatus} onValueChange={setSettlementStatus}>
              <SelectTrigger
                style={{
                  height: "40px",
                  background: "#F5F5F5",
                  border: "1px solid rgba(12, 12, 12, 0.1)",
                  borderRadius: "8px",
                  fontFamily: "Pretendard",
                  fontSize: "14px",
                }}
                data-testid="select-settlement-status"
              >
                <SelectValue placeholder="전체" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="전체">전체</SelectItem>
                <SelectItem value="청산완료">청산완료</SelectItem>
                <SelectItem value="청산대기">청산대기</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 보험사 */}
          <div style={{ flex: "0 0 auto", minWidth: "120px" }}>
            <label
              className="block mb-2"
              style={{
                fontFamily: "Pretendard",
                fontSize: "14px",
                fontWeight: 500,
                color: "rgba(12, 12, 12, 0.7)",
              }}
            >
              보험사
            </label>
            <Select value={insuranceCompany} onValueChange={setInsuranceCompany}>
              <SelectTrigger
                style={{
                  height: "40px",
                  background: "#F5F5F5",
                  border: "1px solid rgba(12, 12, 12, 0.1)",
                  borderRadius: "8px",
                  fontFamily: "Pretendard",
                  fontSize: "14px",
                }}
                data-testid="select-insurance-company"
              >
                <SelectValue placeholder="전체" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="전체">전체</SelectItem>
                <SelectItem value="현대해상">현대해상</SelectItem>
                <SelectItem value="삼성화재">삼성화재</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 심사사 */}
          <div style={{ flex: "0 0 auto", minWidth: "120px" }}>
            <label
              className="block mb-2"
              style={{
                fontFamily: "Pretendard",
                fontSize: "14px",
                fontWeight: 500,
                color: "rgba(12, 12, 12, 0.7)",
              }}
            >
              심사사
            </label>
            <Select value={assessor} onValueChange={setAssessor}>
              <SelectTrigger
                style={{
                  height: "40px",
                  background: "#F5F5F5",
                  border: "1px solid rgba(12, 12, 12, 0.1)",
                  borderRadius: "8px",
                  fontFamily: "Pretendard",
                  fontSize: "14px",
                }}
                data-testid="select-assessor"
              >
                <SelectValue placeholder="전체" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="전체">전체</SelectItem>
                <SelectItem value="김팀장">김팀장</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 담당자 */}
          <div style={{ flex: "0 0 auto", minWidth: "120px" }}>
            <label
              className="block mb-2"
              style={{
                fontFamily: "Pretendard",
                fontSize: "14px",
                fontWeight: 500,
                color: "rgba(12, 12, 12, 0.7)",
              }}
            >
              담당자
            </label>
            <Select value={manager} onValueChange={setManager}>
              <SelectTrigger
                style={{
                  height: "40px",
                  background: "#F5F5F5",
                  border: "1px solid rgba(12, 12, 12, 0.1)",
                  borderRadius: "8px",
                  fontFamily: "Pretendard",
                  fontSize: "14px",
                }}
                data-testid="select-manager"
              >
                <SelectValue placeholder="전체" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="전체">전체</SelectItem>
                <SelectItem value="김팀장">김팀장</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 날짜 선택 */}
          <div style={{ flex: "0 0 auto", minWidth: "120px" }}>
            <label
              className="block mb-2"
              style={{
                fontFamily: "Pretendard",
                fontSize: "14px",
                fontWeight: 500,
                color: "rgba(12, 12, 12, 0.7)",
              }}
            >
              날짜 선택
            </label>
            <Popover open={dateRangeOpen} onOpenChange={setDateRangeOpen}>
              <PopoverTrigger asChild>
                <button
                  style={{
                    height: "40px",
                    padding: "0 16px",
                    background: "#F5F5F5",
                    border: "1px solid rgba(12, 12, 12, 0.1)",
                    borderRadius: "8px",
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    whiteSpace: "nowrap",
                  }}
                  data-testid="button-date-range"
                >
                  <CalendarIcon size={16} style={{ color: "rgba(12, 12, 12, 0.5)" }} />
                  {startDate && endDate
                    ? `${format(startDate, "yyyy.MM.dd")} ~ ${format(endDate, "yyyy.MM.dd")}`
                    : "기간설정"}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-4" align="start">
                <div className="flex gap-4">
                  <div>
                    <p className="text-sm font-medium mb-2">시작일</p>
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      locale={ko}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">종료일</p>
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      locale={ko}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setStartDate(undefined);
                      setEndDate(undefined);
                    }}
                  >
                    초기화
                  </Button>
                  <Button onClick={handleDateRangeApply}>적용</Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Spacer */}
          <div style={{ flex: "1 1 auto" }}></div>

          {/* Buttons */}
          <div className="flex gap-2" style={{ flex: "0 0 auto" }}>
            <Button
              variant="outline"
              onClick={handleReset}
              style={{
                height: "40px",
                padding: "0 24px",
                borderRadius: "8px",
                fontFamily: "Pretendard",
                fontSize: "14px",
              }}
              data-testid="button-reset"
            >
              초기화
            </Button>
            <Button
              style={{
                height: "40px",
                padding: "0 24px",
                background: "#008FED",
                borderRadius: "8px",
                fontFamily: "Pretendard",
                fontSize: "14px",
                fontWeight: 600,
                color: "#FFFFFF",
                whiteSpace: "nowrap",
              }}
              data-testid="button-search-with-filters"
            >
              선택된 조건 검색하기
            </Button>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="mb-4 flex items-center gap-2">
        <span
          style={{
            fontFamily: "Pretendard",
            fontSize: "16px",
            fontWeight: 500,
            color: "rgba(12, 12, 12, 0.7)",
          }}
        >
          결과
        </span>
        <span
          style={{
            fontFamily: "Pretendard",
            fontSize: "16px",
            fontWeight: 600,
            color: "#008FED",
          }}
        >
          1000
        </span>
      </div>

      {/* Wide Table with Horizontal Scroll */}
      <div
        style={{
          borderRadius: "12px",
          border: "1px solid rgba(12, 12, 12, 0.08)",
          overflow: "hidden",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "max-content", minWidth: "100%", borderCollapse: "collapse" }}>
            <thead>
              {/* FIX: 2단 헤더 구조 수정 - 첫 번째 행 */}
              <tr style={{ background: "rgba(12, 12, 12, 0.06)" }}>
                {/* 기본 컬럼들 - rowSpan=2로 두 줄 차지 */}
                <th
                  rowSpan={2}
                  style={{
                    padding: "16px",
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "rgba(12, 12, 12, 0.8)",
                    borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                    borderRight: "1px solid rgba(12, 12, 12, 0.08)",
                    textAlign: "center",
                    width: "60px",
                  }}
                >
                  <Checkbox data-testid="checkbox-select-all" />
                </th>
                <th
                  rowSpan={2}
                  style={{
                    padding: "16px",
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "rgba(12, 12, 12, 0.8)",
                    borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                    borderRight: "1px solid rgba(12, 12, 12, 0.08)",
                    textAlign: "center",
                    minWidth: "120px",
                  }}
                >
                  접수번호
                </th>
                <th
                  rowSpan={2}
                  style={{
                    padding: "16px",
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "rgba(12, 12, 12, 0.8)",
                    borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                    borderRight: "1px solid rgba(12, 12, 12, 0.08)",
                    textAlign: "center",
                    minWidth: "100px",
                  }}
                >
                  보험사
                </th>
                <th
                  rowSpan={2}
                  style={{
                    padding: "16px",
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "rgba(12, 12, 12, 0.8)",
                    borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                    borderRight: "1px solid rgba(12, 12, 12, 0.08)",
                    textAlign: "center",
                    minWidth: "100px",
                  }}
                >
                  담당자
                </th>
                <th
                  rowSpan={2}
                  style={{
                    padding: "16px",
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "rgba(12, 12, 12, 0.8)",
                    borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                    borderRight: "1px solid rgba(12, 12, 12, 0.08)",
                    textAlign: "center",
                    minWidth: "120px",
                  }}
                >
                  증권번호
                </th>
                <th
                  rowSpan={2}
                  style={{
                    padding: "16px",
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "rgba(12, 12, 12, 0.8)",
                    borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                    borderRight: "1px solid rgba(12, 12, 12, 0.08)",
                    textAlign: "center",
                    minWidth: "120px",
                  }}
                >
                  사고번호
                </th>
                <th
                  rowSpan={2}
                  style={{
                    padding: "16px",
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "rgba(12, 12, 12, 0.8)",
                    borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                    borderRight: "1px solid rgba(12, 12, 12, 0.08)",
                    textAlign: "center",
                    minWidth: "100px",
                  }}
                >
                  관리자
                </th>
                <th
                  rowSpan={2}
                  style={{
                    padding: "16px",
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "rgba(12, 12, 12, 0.8)",
                    borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                    borderRight: "1px solid rgba(12, 12, 12, 0.08)",
                    textAlign: "center",
                    minWidth: "120px",
                  }}
                >
                  종결일
                </th>
                <th
                  rowSpan={2}
                  style={{
                    padding: "16px",
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "rgba(12, 12, 12, 0.8)",
                    borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                    borderRight: "1px solid rgba(12, 12, 12, 0.08)",
                    textAlign: "center",
                    minWidth: "100px",
                  }}
                >
                  공사유무
                </th>
                {/* FIX: 상위 헤더 - colSpan으로 하위 컬럼들을 그룹화 */}
                {/* 손해방지비용 - colSpan=4 (견적금액, 승인금액, 차액, 수정률) */}
                <th
                  colSpan={4}
                  style={{
                    padding: "12px 16px",
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "rgba(12, 12, 12, 0.8)",
                    borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                    borderRight: "1px solid rgba(12, 12, 12, 0.08)",
                    textAlign: "center",
                    background: "rgba(0, 143, 237, 0.05)",
                  }}
                >
                  손해방지비용
                </th>
                {/* 대물비용 - colSpan=4 (견적금액, 승인금액, 차액, 수정률) */}
                <th
                  colSpan={4}
                  style={{
                    padding: "12px 16px",
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "rgba(12, 12, 12, 0.8)",
                    borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                    borderRight: "1px solid rgba(12, 12, 12, 0.08)",
                    textAlign: "center",
                    background: "rgba(0, 143, 237, 0.05)",
                  }}
                >
                  대물비용
                </th>
                {/* 나머지 컬럼들 - rowSpan=2로 두 줄 차지 */}
                <th
                  rowSpan={2}
                  style={{
                    padding: "16px",
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "rgba(12, 12, 12, 0.8)",
                    borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                    borderRight: "1px solid rgba(12, 12, 12, 0.08)",
                    textAlign: "center",
                    minWidth: "100px",
                  }}
                >
                  수수료
                </th>
                {/* 협력업체 - colSpan=2 (지급금액, 지급일) */}
                <th
                  colSpan={2}
                  style={{
                    padding: "12px 16px",
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "rgba(12, 12, 12, 0.8)",
                    borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                    borderRight: "1px solid rgba(12, 12, 12, 0.08)",
                    textAlign: "center",
                    background: "rgba(0, 143, 237, 0.05)",
                  }}
                >
                  협력업체
                </th>
                <th
                  rowSpan={2}
                  style={{
                    padding: "16px",
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "rgba(12, 12, 12, 0.8)",
                    borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                    borderRight: "1px solid rgba(12, 12, 12, 0.08)",
                    textAlign: "center",
                    minWidth: "120px",
                  }}
                >
                  사용료
                </th>
                <th
                  rowSpan={2}
                  style={{
                    padding: "16px",
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "rgba(12, 12, 12, 0.8)",
                    borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                    borderRight: "1px solid rgba(12, 12, 12, 0.08)",
                    textAlign: "center",
                    minWidth: "100px",
                  }}
                >
                  자기부담금
                </th>
                <th
                  rowSpan={2}
                  style={{
                    padding: "16px",
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "rgba(12, 12, 12, 0.8)",
                    borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                    borderRight: "1px solid rgba(12, 12, 12, 0.08)",
                    textAlign: "center",
                    minWidth: "100px",
                  }}
                >
                  청구액
                </th>
                <th
                  rowSpan={2}
                  style={{
                    padding: "16px",
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "rgba(12, 12, 12, 0.8)",
                    borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                    borderRight: "1px solid rgba(12, 12, 12, 0.08)",
                    textAlign: "center",
                    minWidth: "100px",
                  }}
                >
                  입금은행
                </th>
                <th
                  rowSpan={2}
                  style={{
                    padding: "16px",
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "rgba(12, 12, 12, 0.8)",
                    borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                    borderRight: "1px solid rgba(12, 12, 12, 0.08)",
                    textAlign: "center",
                    minWidth: "100px",
                  }}
                >
                  입금액
                </th>
                <th
                  rowSpan={2}
                  style={{
                    padding: "16px",
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "rgba(12, 12, 12, 0.8)",
                    borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                    borderRight: "1px solid rgba(12, 12, 12, 0.08)",
                    textAlign: "center",
                    minWidth: "120px",
                  }}
                >
                  입금일
                </th>
                <th
                  rowSpan={2}
                  style={{
                    padding: "16px",
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "rgba(12, 12, 12, 0.8)",
                    borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                    borderRight: "1px solid rgba(12, 12, 12, 0.08)",
                    textAlign: "center",
                    minWidth: "100px",
                  }}
                >
                  계산서
                </th>
                <th
                  rowSpan={2}
                  style={{
                    padding: "16px",
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "rgba(12, 12, 12, 0.8)",
                    borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                    textAlign: "center",
                    minWidth: "100px",
                  }}
                >
                  관리
                </th>
              </tr>
              
              {/* FIX: 2단 헤더 구조 수정 - 두 번째 행 (하위 헤더만) */}
              <tr style={{ background: "rgba(12, 12, 12, 0.03)" }}>
                {/* 손해방지비용 하위 컬럼 (견적금액, 승인금액, 차액, 수정률) */}
                <th
                  style={{
                    padding: "12px 16px",
                    fontFamily: "Pretendard",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "rgba(12, 12, 12, 0.7)",
                    borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                    borderRight: "1px solid rgba(12, 12, 12, 0.08)",
                    textAlign: "center",
                    minWidth: "100px",
                  }}
                >
                  견적금액
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    fontFamily: "Pretendard",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "rgba(12, 12, 12, 0.7)",
                    borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                    borderRight: "1px solid rgba(12, 12, 12, 0.08)",
                    textAlign: "center",
                    minWidth: "100px",
                  }}
                >
                  승인금액
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    fontFamily: "Pretendard",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "rgba(12, 12, 12, 0.7)",
                    borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                    borderRight: "1px solid rgba(12, 12, 12, 0.08)",
                    textAlign: "center",
                    minWidth: "80px",
                  }}
                >
                  차액
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    fontFamily: "Pretendard",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "rgba(12, 12, 12, 0.7)",
                    borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                    borderRight: "1px solid rgba(12, 12, 12, 0.08)",
                    textAlign: "center",
                    minWidth: "80px",
                  }}
                >
                  수정률
                </th>
                {/* 대물비용 하위 컬럼 (견적금액, 승인금액, 차액, 수정률) */}
                <th
                  style={{
                    padding: "12px 16px",
                    fontFamily: "Pretendard",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "rgba(12, 12, 12, 0.7)",
                    borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                    borderRight: "1px solid rgba(12, 12, 12, 0.08)",
                    textAlign: "center",
                    minWidth: "100px",
                  }}
                >
                  견적금액
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    fontFamily: "Pretendard",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "rgba(12, 12, 12, 0.7)",
                    borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                    borderRight: "1px solid rgba(12, 12, 12, 0.08)",
                    textAlign: "center",
                    minWidth: "100px",
                  }}
                >
                  승인금액
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    fontFamily: "Pretendard",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "rgba(12, 12, 12, 0.7)",
                    borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                    borderRight: "1px solid rgba(12, 12, 12, 0.08)",
                    textAlign: "center",
                    minWidth: "80px",
                  }}
                >
                  차액
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    fontFamily: "Pretendard",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "rgba(12, 12, 12, 0.7)",
                    borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                    borderRight: "1px solid rgba(12, 12, 12, 0.08)",
                    textAlign: "center",
                    minWidth: "80px",
                  }}
                >
                  수정률
                </th>
                {/* 협력업체 하위 컬럼 (지급금액, 지급일) */}
                <th
                  style={{
                    padding: "12px 16px",
                    fontFamily: "Pretendard",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "rgba(12, 12, 12, 0.7)",
                    borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                    borderRight: "1px solid rgba(12, 12, 12, 0.08)",
                    textAlign: "center",
                    minWidth: "100px",
                  }}
                >
                  지급금액
                </th>
                <th
                  style={{
                    padding: "12px 16px",
                    fontFamily: "Pretendard",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "rgba(12, 12, 12, 0.7)",
                    borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                    borderRight: "1px solid rgba(12, 12, 12, 0.08)",
                    textAlign: "center",
                    minWidth: "120px",
                  }}
                >
                  지급일
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={21}
                    style={{
                      padding: "48px",
                      textAlign: "center",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: "rgba(12, 12, 12, 0.5)",
                    }}
                  >
                    데이터를 불러오는 중...
                  </td>
                </tr>
              ) : tableRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={21}
                    style={{
                      padding: "48px",
                      textAlign: "center",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: "rgba(12, 12, 12, 0.5)",
                    }}
                  >
                    진행상태가 '청구'인 접수건이 없습니다.
                  </td>
                </tr>
              ) : tableRows.map((row, index) => (
                <tr
                  key={row.id}
                  style={{
                    borderBottom:
                      index < tableRows.length - 1
                        ? "1px solid rgba(12, 12, 12, 0.05)"
                        : "none",
                  }}
                >
                  <td
                    style={{
                      padding: "14px 16px",
                      borderRight: "1px solid rgba(12, 12, 12, 0.05)",
                      textAlign: "center",
                    }}
                  >
                    <Checkbox data-testid={`checkbox-row-${index}`} />
                  </td>
                  <td
                    style={{
                      padding: "14px 16px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: "rgba(12, 12, 12, 0.8)",
                      borderRight: "1px solid rgba(12, 12, 12, 0.05)",
                      textAlign: "center",
                    }}
                  >
                    {row.caseNumber}
                  </td>
                  <td
                    style={{
                      padding: "14px 16px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: "rgba(12, 12, 12, 0.8)",
                      borderRight: "1px solid rgba(12, 12, 12, 0.05)",
                      textAlign: "center",
                    }}
                  >
                    {row.insuranceCompany}
                  </td>
                  <td
                    style={{
                      padding: "14px 16px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: "rgba(12, 12, 12, 0.8)",
                      borderRight: "1px solid rgba(12, 12, 12, 0.05)",
                      textAlign: "center",
                    }}
                  >
                    {row.manager}
                  </td>
                  <td
                    style={{
                      padding: "14px 16px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: "rgba(12, 12, 12, 0.8)",
                      borderRight: "1px solid rgba(12, 12, 12, 0.05)",
                      textAlign: "center",
                    }}
                  >
                    {row.withdrawalNumber}
                  </td>
                  <td
                    style={{
                      padding: "14px 16px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: "rgba(12, 12, 12, 0.8)",
                      borderRight: "1px solid rgba(12, 12, 12, 0.05)",
                      textAlign: "center",
                    }}
                  >
                    {row.accidentNumber}
                  </td>
                  <td
                    style={{
                      padding: "14px 16px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: "rgba(12, 12, 12, 0.8)",
                      borderRight: "1px solid rgba(12, 12, 12, 0.05)",
                      textAlign: "center",
                    }}
                  >
                    {row.admin}
                  </td>
                  <td
                    style={{
                      padding: "14px 16px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: "rgba(12, 12, 12, 0.8)",
                      borderRight: "1px solid rgba(12, 12, 12, 0.05)",
                      textAlign: "center",
                    }}
                  >
                    {row.withdrawalDate}
                  </td>
                  <td
                    style={{
                      padding: "14px 16px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: "rgba(12, 12, 12, 0.8)",
                      borderRight: "1px solid rgba(12, 12, 12, 0.05)",
                      textAlign: "center",
                    }}
                  >
                    {row.constructionStatus}
                  </td>
                  {/* 손해방지비용 (견적금액, 승인금액, 차액, 수정률) */}
                  <td
                    style={{
                      padding: "14px 16px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: row.preventionEstimateAmount > 0 ? "rgba(12, 12, 12, 0.8)" : "rgba(12, 12, 12, 0.5)",
                      borderRight: "1px solid rgba(12, 12, 12, 0.05)",
                      textAlign: "right",
                    }}
                  >
                    {row.preventionEstimateAmount > 0 ? row.preventionEstimateAmount.toLocaleString() + "원" : "-"}
                  </td>
                  <td
                    style={{
                      padding: "14px 16px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: row.preventionApprovedAmount > 0 ? "rgba(12, 12, 12, 0.8)" : "rgba(12, 12, 12, 0.5)",
                      borderRight: "1px solid rgba(12, 12, 12, 0.05)",
                      textAlign: "right",
                    }}
                  >
                    {row.preventionApprovedAmount > 0 ? row.preventionApprovedAmount.toLocaleString() + "원" : "-"}
                  </td>
                  <td
                    style={{
                      padding: "14px 16px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: row.preventionEstimateAmount > 0 ? "rgba(12, 12, 12, 0.8)" : "rgba(12, 12, 12, 0.5)",
                      borderRight: "1px solid rgba(12, 12, 12, 0.05)",
                      textAlign: "right",
                    }}
                  >
                    {row.preventionEstimateAmount > 0 ? row.preventionDifference.toLocaleString() + "원" : "-"}
                  </td>
                  <td
                    style={{
                      padding: "14px 16px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: row.preventionEstimateAmount > 0 ? "rgba(12, 12, 12, 0.8)" : "rgba(12, 12, 12, 0.5)",
                      borderRight: "1px solid rgba(12, 12, 12, 0.05)",
                      textAlign: "center",
                    }}
                  >
                    {row.preventionAdjustmentRate}
                  </td>
                  {/* 대물비용 (견적금액, 승인금액, 차액, 수정률) */}
                  <td
                    style={{
                      padding: "14px 16px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: row.propertyEstimateAmount > 0 ? "rgba(12, 12, 12, 0.8)" : "rgba(12, 12, 12, 0.5)",
                      borderRight: "1px solid rgba(12, 12, 12, 0.05)",
                      textAlign: "right",
                    }}
                  >
                    {row.propertyEstimateAmount > 0 ? row.propertyEstimateAmount.toLocaleString() + "원" : "-"}
                  </td>
                  <td
                    style={{
                      padding: "14px 16px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: row.propertyApprovedAmount > 0 ? "rgba(12, 12, 12, 0.8)" : "rgba(12, 12, 12, 0.5)",
                      borderRight: "1px solid rgba(12, 12, 12, 0.05)",
                      textAlign: "right",
                    }}
                  >
                    {row.propertyApprovedAmount > 0 ? row.propertyApprovedAmount.toLocaleString() + "원" : "-"}
                  </td>
                  <td
                    style={{
                      padding: "14px 16px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: row.propertyEstimateAmount > 0 ? "rgba(12, 12, 12, 0.8)" : "rgba(12, 12, 12, 0.5)",
                      borderRight: "1px solid rgba(12, 12, 12, 0.05)",
                      textAlign: "right",
                    }}
                  >
                    {row.propertyEstimateAmount > 0 ? row.propertyDifference.toLocaleString() + "원" : "-"}
                  </td>
                  <td
                    style={{
                      padding: "14px 16px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: row.propertyEstimateAmount > 0 ? "rgba(12, 12, 12, 0.8)" : "rgba(12, 12, 12, 0.5)",
                      borderRight: "1px solid rgba(12, 12, 12, 0.05)",
                      textAlign: "center",
                    }}
                  >
                    {row.propertyAdjustmentRate}
                  </td>
                  {/* 수수료 */}
                  <td
                    style={{
                      padding: "14px 16px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: "rgba(12, 12, 12, 0.5)",
                      borderRight: "1px solid rgba(12, 12, 12, 0.05)",
                      textAlign: "center",
                    }}
                  >
                    -
                  </td>
                  {/* 협력업체 (지급금액, 지급일) */}
                  <td
                    style={{
                      padding: "14px 16px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: "rgba(12, 12, 12, 0.5)",
                      borderRight: "1px solid rgba(12, 12, 12, 0.05)",
                      textAlign: "center",
                    }}
                  >
                    -
                  </td>
                  <td
                    style={{
                      padding: "14px 16px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: "rgba(12, 12, 12, 0.5)",
                      borderRight: "1px solid rgba(12, 12, 12, 0.05)",
                      textAlign: "center",
                    }}
                  >
                    -
                  </td>
                  {/* 서울본 */}
                  <td
                    style={{
                      padding: "14px 16px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: "rgba(12, 12, 12, 0.5)",
                      borderRight: "1px solid rgba(12, 12, 12, 0.05)",
                      textAlign: "center",
                    }}
                  >
                    -
                  </td>
                  {/* 자기부담금 */}
                  <td
                    style={{
                      padding: "14px 16px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: "rgba(12, 12, 12, 0.5)",
                      borderRight: "1px solid rgba(12, 12, 12, 0.05)",
                      textAlign: "center",
                    }}
                  >
                    -
                  </td>
                  {/* 청구액 */}
                  <td
                    style={{
                      padding: "14px 16px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: row.claimAmount > 0 ? "rgba(12, 12, 12, 0.8)" : "rgba(12, 12, 12, 0.5)",
                      borderRight: "1px solid rgba(12, 12, 12, 0.05)",
                      textAlign: "right",
                    }}
                  >
                    {row.claimAmount > 0 ? row.claimAmount.toLocaleString() + "원" : "-"}
                  </td>
                  {/* 입금은행 */}
                  <td
                    style={{
                      padding: "14px 16px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: "rgba(12, 12, 12, 0.5)",
                      borderRight: "1px solid rgba(12, 12, 12, 0.05)",
                      textAlign: "center",
                    }}
                  >
                    ----
                  </td>
                  {/* 입금액 */}
                  <td
                    style={{
                      padding: "14px 16px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: "rgba(12, 12, 12, 0.5)",
                      borderRight: "1px solid rgba(12, 12, 12, 0.05)",
                      textAlign: "center",
                    }}
                  >
                    2025-00-00
                  </td>
                  {/* 입금일 */}
                  <td
                    style={{
                      padding: "14px 16px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: "rgba(12, 12, 12, 0.5)",
                      borderRight: "1px solid rgba(12, 12, 12, 0.05)",
                      textAlign: "center",
                    }}
                  >
                    -
                  </td>
                  {/* 계산서 */}
                  <td
                    style={{
                      padding: "14px 16px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: "rgba(12, 12, 12, 0.5)",
                      borderRight: "1px solid rgba(12, 12, 12, 0.05)",
                      textAlign: "center",
                    }}
                  >
                    -
                  </td>
                  {/* 관리 */}
                  <td
                    style={{
                      padding: "14px 16px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: "rgba(12, 12, 12, 0.5)",
                      textAlign: "center",
                    }}
                  >
                    관리
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div
          className="flex items-center justify-center p-6"
          style={{
            borderTop: "1px solid rgba(12, 12, 12, 0.05)",
          }}
        >
          <span
            style={{
              fontFamily: "Pretendard",
              fontSize: "14px",
              color: "rgba(12, 12, 12, 0.5)",
            }}
          >
            합계
          </span>
        </div>
      </div>
    </div>
  );
}
