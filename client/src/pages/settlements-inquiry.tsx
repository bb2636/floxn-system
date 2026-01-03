import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { User, CaseWithLatestProgress, Estimate, Settlement } from "@shared/schema";
import { Search, Calendar as CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { formatCaseNumber } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { InvoiceSheet, getCaseNumberPrefix } from "@/components/InvoiceSheet";
import { FieldDispatchCostSheet } from "@/components/FieldDispatchCostSheet";
import { InvoiceManagementPopup } from "@/components/InvoiceManagementPopup";

// 정산 테이블 행 타입
interface SettlementRow {
  id: string; // Primary case ID (first in group)
  caseIds: string[]; // All case IDs in the group
  caseNumber: string | null; // Combined case numbers (e.g., "251225001-0, 251225001-1")
  caseNumberPrefix: string | null; // Case number prefix for grouping
  insuranceCompany: string;
  manager: string;
  managerId: string | null; // 담당자 ID (관리자)
  withdrawalNumber: string;
  accidentNumber: string;
  admin: string;
  depositBank: string; // 입금은행
  withdrawalDate: string;
  constructionStatus: string;
  recoveryType: string | null; // 복구 유형: 직접복구 | 선견적요청
  // 손해방지비용 (from -0 cases)
  preventionEstimateAmount: number;
  preventionApprovedAmount: number;
  preventionDifference: number;
  preventionAdjustmentRate: string;
  // 대물비용 (sum of -1, -2, etc. cases)
  propertyEstimateAmount: number;
  propertyApprovedAmount: number;
  propertyDifference: number;
  propertyAdjustmentRate: string;
  // 청구액
  claimAmount: number;
  // 정산 데이터
  settlementAmount: number;
  settlementDate: string;
  settlementCommission: number; // 수수료 (손해방지/대물비용 있을 때만)
  usageFee: number; // 사용료 (미수리 시 10만원)
  settlementDeposit: number;
  settlementDeductible: number;
  settlementInvoiceDate: string;
  settlementMemo: string;
  status: string;
  // 협력업체 지급 정보
  partnerPaymentAmount: number; // 협력업체 지급금액
  partnerPaymentDate: string; // 협력업체 지급일
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
  const [managementDialogOpen, setManagementDialogOpen] = useState(false);
  const [selectedCaseForManagement, setSelectedCaseForManagement] = useState<SettlementRow | null>(null);
  
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [showFieldDispatchInvoiceDialog, setShowFieldDispatchInvoiceDialog] = useState(false);
  const [invoiceCaseId, setInvoiceCaseId] = useState<string | null>(null);
  const [showInvoiceManagementPopup, setShowInvoiceManagementPopup] = useState(false);
  const [selectedCaseForInvoice, setSelectedCaseForInvoice] = useState<CaseWithLatestProgress | null>(null);
  const [selectedRelatedCasesForInvoice, setSelectedRelatedCasesForInvoice] = useState<CaseWithLatestProgress[]>([]);
  const [selectedCommission, setSelectedCommission] = useState<number>(0);
  const [selectedEstimateData, setSelectedEstimateData] = useState<{
    preventionEstimate: number;
    preventionApproved: number;
    propertyEstimate: number;
    propertyApproved: number;
  } | null>(null);
  
  const { toast } = useToast();

  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  const { data: cases = [], isLoading: casesLoading } = useQuery<CaseWithLatestProgress[]>({
    queryKey: ["/api/cases"],
  });

  const { data: allUsers = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Fetch all settlements
  const { data: allSettlements = [], isLoading: settlementsLoading } = useQuery<Settlement[]>({
    queryKey: ["/api/settlements"],
  });

  // Create a map for quick settlement lookup by caseId (get the latest)
  const settlementsByCaseIdMap = useMemo(() => {
    const map = new Map<string, Settlement>();
    allSettlements.forEach(s => {
      const existing = map.get(s.caseId);
      // Keep the latest settlement (ordered by createdAt descending from API)
      if (!existing) {
        map.set(s.caseId, s);
      }
    });
    return map;
  }, [allSettlements]);

  // Create a map to get all settlements for a case (for history view)
  const allSettlementsByCaseIdMap = useMemo(() => {
    const map = new Map<string, Settlement[]>();
    allSettlements.forEach(s => {
      const existing = map.get(s.caseId) || [];
      existing.push(s);
      map.set(s.caseId, existing);
    });
    return map;
  }, [allSettlements]);

  // Helper function to open Invoice Management Popup
  const handleOpenManagement = (row: SettlementRow) => {
    const targetCase = cases.find(c => c.id === row.id);
    if (targetCase) {
      setSelectedCaseForInvoice(targetCase);
      // 같은 사고번호의 모든 케이스들 찾기 (row.caseIds 사용)
      const relatedCases = row.caseIds
        .map(caseId => cases.find(c => c.id === caseId))
        .filter((c): c is CaseWithLatestProgress => c !== undefined);
      setSelectedRelatedCasesForInvoice(relatedCases);
      setSelectedEstimateData({
        preventionEstimate: row.preventionEstimateAmount || 0,
        preventionApproved: row.preventionApprovedAmount || 0,
        propertyEstimate: row.propertyEstimateAmount || 0,
        propertyApproved: row.propertyApprovedAmount || 0,
      });
      // 해당 케이스의 수수료를 가져옴 (settlementCommission은 이미 그룹별로 계산된 값)
      setSelectedCommission(row.settlementCommission || 0);
      setShowInvoiceManagementPopup(true);
    }
  };
  
  // Helper function to open Invoice Sheet - recoveryType에 따라 적절한 인보이스 표시
  const handleOpenInvoiceSheet = (row: SettlementRow) => {
    const targetCase = cases.find(c => c.id === row.id);
    if (targetCase) {
      setInvoiceCaseId(targetCase.id);
      // recoveryType에 따라 적절한 인보이스 다이얼로그 표시
      if (targetCase.recoveryType === "선견적요청") {
        setShowFieldDispatchInvoiceDialog(true);
      } else {
        setShowInvoiceDialog(true);
      }
    }
  };
  
  // Get settlements for the selected case
  const selectedCaseSettlements = useMemo(() => {
    if (!selectedCaseForManagement) return [];
    return allSettlementsByCaseIdMap.get(selectedCaseForManagement.id) || [];
  }, [selectedCaseForManagement, allSettlementsByCaseIdMap]);

  if (!user) {
    return null;
  }

  // Create maps for quick user lookup by ID, username, and company name
  const usersByIdMap = useMemo(() => {
    const map = new Map<string, User>();
    allUsers.forEach(u => map.set(u.id, u));
    return map;
  }, [allUsers]);

  const usersByUsernameMap = useMemo(() => {
    const map = new Map<string, User>();
    allUsers.forEach(u => map.set(u.username, u));
    return map;
  }, [allUsers]);

  const usersByCompanyMap = useMemo(() => {
    const map = new Map<string, User>();
    allUsers.forEach(u => {
      if (u.company) map.set(u.company, u);
    });
    return map;
  }, [allUsers]);

  // 보험사 목록 (role이 '보험사'인 사용자들의 company 중복 제거)
  const insuranceCompanyOptions = useMemo(() => {
    const companies = new Set<string>();
    allUsers.forEach(u => {
      if (u.role === '보험사' && u.company) {
        companies.add(u.company);
      }
    });
    return Array.from(companies).sort();
  }, [allUsers]);

  // 심사사 목록 (role이 '심사사'인 사용자들의 company 중복 제거)
  const assessorOptions = useMemo(() => {
    const companies = new Set<string>();
    allUsers.forEach(u => {
      if (u.role === '심사사' && u.company) {
        companies.add(u.company);
      }
    });
    return Array.from(companies).sort();
  }, [allUsers]);

  // 담당자 목록 (role이 '관리자'인 사용자들의 이름)
  const managerOptions = useMemo(() => {
    return allUsers
      .filter(u => u.role === '관리자' && u.name)
      .map(u => u.name)
      .sort();
  }, [allUsers]);

  // Filter cases with status '청구' and after (claim, payment, settlement)
  const settlementStatuses = ["청구", "입금완료", "부분입금", "정산완료"];
  const claimCases = cases.filter(c => settlementStatuses.includes(c.status));
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

  // Helper function for parsing amounts
  const parseAmountValue = (value: string | number | null | undefined): number => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return isNaN(value) ? 0 : value;
    const cleaned = String(value).replace(/,/g, '');
    const parsed = Number(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Helper function to get case suffix (e.g., -0, -1, -2)
  const getCaseSuffix = (caseNumber: string | null): number => {
    if (!caseNumber) return 0;
    const dashIndex = caseNumber.lastIndexOf('-');
    if (dashIndex > 0) {
      const suffix = parseInt(caseNumber.substring(dashIndex + 1), 10);
      return isNaN(suffix) ? 0 : suffix;
    }
    return 0;
  };

  // Build table rows using useMemo with grouping by case number prefix
  const tableRows = useMemo(() => {
    if (!user) return [];
    
    // First, build individual case data
    const individualCaseData = claimCases.map((caseItem) => {
      const estimateData = estimatesMap.get(caseItem.id);
      
      // Determine if this is prevention (-0) or property (-1, -2, etc.) based on case number suffix
      const casePrefix = getCaseNumberPrefix(caseItem.caseNumber);
      const caseSuffix = getCaseSuffix(caseItem.caseNumber);
      const isPrevention = caseSuffix === 0; // -0 is prevention cost
      const isProperty = caseSuffix > 0; // -1, -2, etc. are property costs
      
      // 견적금액 결정 로직:
      // 1. initialEstimateAmount (종합진행관리와 동일하게 사용)
      // 2. 그 외 fallback들
      let estimateTotal = 0;
      
      // 종합진행관리와 동일하게 initialEstimateAmount 우선 사용
      const initialEstimateAmount = (caseItem as any).initialEstimateAmount;
      
      if (initialEstimateAmount !== null && initialEstimateAmount !== undefined && initialEstimateAmount !== "") {
        // initialEstimateAmount가 있으면 그 값 사용 (종합진행관리와 동일)
        estimateTotal = parseAmountValue(initialEstimateAmount);
      } else if (estimateData?.estimate?.laborCostData) {
        // 초기 견적금액이 없으면 현재 견적 데이터에서 계산 (아직 제출 전인 경우)
        const laborData = estimateData.estimate.laborCostData as any[];
        const laborTotal = laborData.reduce((sum, row) => sum + (row.amount || 0), 0);
        const managementFee = Math.round(laborTotal * 0.06);
        const profit = Math.round(laborTotal * 0.15);
        const subtotalBeforeVAT = laborTotal + managementFee + profit;
        const vat = Math.round(subtotalBeforeVAT * 0.1);
        estimateTotal = subtotalBeforeVAT + vat;
      } else {
        estimateTotal = parseAmountValue(caseItem.estimateAmount);
      }

      // Use approvedAmount field if available
      const caseApprovedAmount = parseAmountValue(caseItem.approvedAmount);
      const isApproved = caseItem.reviewDecision === "승인" || caseApprovedAmount > 0;
      const approvedValue = caseApprovedAmount > 0 ? caseApprovedAmount : (isApproved ? estimateTotal : 0);

      // Get assigned partner's bank information
      const assignedPartnerValue = caseItem.assignedPartner || user.username;
      const partnerUser = usersByIdMap.get(assignedPartnerValue) 
        || usersByUsernameMap.get(assignedPartnerValue)
        || usersByCompanyMap.get(assignedPartnerValue);
      const depositBank = partnerUser?.bankName || "-";

      // 정산 데이터 파싱
      const settlement = settlementsByCaseIdMap.get(caseItem.id);
      const settlementAmount = settlement ? parseAmountValue(settlement.settlementAmount) : 0;
      // 미수리(선견적요청)일 때: 수수료 = 0, 사용료 = 10만원
      // 수리(직접복구)일 때: 수수료 = DB값, 사용료 = 0
      const isNoRepair = caseItem.recoveryType === "선견적요청";
      const settlementCommission = isNoRepair 
        ? 0 
        : (settlement ? parseAmountValue(settlement.commission) : 0);
      const usageFee = isNoRepair ? 100000 : 0;
      const settlementDeposit = settlement ? parseAmountValue(settlement.discount) : 0;
      const settlementDeductible = settlement ? parseAmountValue(settlement.deductible) : 0;

      return {
        id: caseItem.id,
        caseNumber: caseItem.caseNumber,
        casePrefix,
        caseSuffix,
        isPrevention,
        isProperty,
        estimateTotal,
        approvedValue,
        insuranceCompany: caseItem.insuranceCompany || "-",
        manager: caseItem.assessorId || "-",
        managerId: caseItem.managerId || null,
        withdrawalNumber: caseItem.insurancePolicyNo || "-",
        accidentNumber: caseItem.insuranceAccidentNo || "-",
        admin: assignedPartnerValue,
        depositBank,
        withdrawalDate: settlement?.closingDate || caseItem.completionDate || "-",
        constructionStatus: caseItem.recoveryType === "직접복구" ? "수리" : (caseItem.recoveryType === "선견적요청" ? "미수리" : "-"),
        recoveryType: caseItem.recoveryType || null,
        settlementAmount,
        settlementDate: settlement?.settlementDate || "-",
        settlementCommission,
        usageFee,
        settlementDeposit,
        settlementDeductible,
        settlementInvoiceDate: caseItem.taxInvoiceConfirmDate || settlement?.invoiceDate || "-",
        settlementMemo: settlement?.memo || "",
        status: caseItem.status,
        partnerPaymentAmount: settlement ? parseAmountValue(settlement.partnerPaymentAmount) : 0,
        partnerPaymentDate: settlement?.partnerPaymentDate || "-",
      };
    });

    // Group cases by prefix
    const groupedByPrefix = new Map<string, typeof individualCaseData>();
    individualCaseData.forEach(caseData => {
      const prefix = caseData.casePrefix || caseData.id; // Use ID if no prefix
      if (!groupedByPrefix.has(prefix)) {
        groupedByPrefix.set(prefix, []);
      }
      groupedByPrefix.get(prefix)!.push(caseData);
    });

    // Build combined rows for each group
    const combinedRows: SettlementRow[] = [];
    groupedByPrefix.forEach((casesInGroup, prefix) => {
      // Sort by suffix
      casesInGroup.sort((a, b) => a.caseSuffix - b.caseSuffix);

      // Combine case numbers
      const combinedCaseNumbers = casesInGroup
        .map(c => c.caseNumber)
        .filter(Boolean)
        .join(", ");

      // Collect all case IDs
      const allCaseIds = casesInGroup.map(c => c.id);

      // Use first case for common data (typically -0 case has main info)
      const primaryCase = casesInGroup[0];

      // 그룹 내 직접복구 건이 있는지 확인
      // 직접복구 건이 하나라도 있으면 해당 건들의 금액만 표시, 사용료 없음
      // 모든 건이 선견적요청일 때만 사용료 10만원
      const hasDirectRepair = casesInGroup.some(c => c.recoveryType === "직접복구");
      const allNoRepair = casesInGroup.every(c => c.recoveryType === "선견적요청");

      // Calculate prevention costs (from -0 cases)
      // 직접복구 건만 계산 (선견적요청 건은 제외)
      const preventionCases = casesInGroup.filter(c => c.isPrevention);
      const directRepairPreventionCases = preventionCases.filter(c => c.recoveryType === "직접복구");
      const preventionEstimateAmount = directRepairPreventionCases.reduce((sum, c) => sum + c.estimateTotal, 0);
      const preventionApprovedAmount = directRepairPreventionCases.reduce((sum, c) => sum + c.approvedValue, 0);
      const preventionDifference = preventionApprovedAmount - preventionEstimateAmount;
      const preventionAdjustmentRate = preventionEstimateAmount > 0 
        ? ((preventionDifference / preventionEstimateAmount) * 100).toFixed(1) + "%"
        : "-";

      // Calculate property costs (from -1, -2, etc. cases - summed)
      // 직접복구 건만 계산 (선견적요청 건은 제외)
      const propertyCases = casesInGroup.filter(c => c.isProperty);
      const directRepairPropertyCases = propertyCases.filter(c => c.recoveryType === "직접복구");
      const propertyEstimateAmount = directRepairPropertyCases.reduce((sum, c) => sum + c.estimateTotal, 0);
      const propertyApprovedAmount = directRepairPropertyCases.reduce((sum, c) => sum + c.approvedValue, 0);
      const propertyDifference = propertyApprovedAmount - propertyEstimateAmount;
      const propertyAdjustmentRate = propertyEstimateAmount > 0
        ? ((propertyDifference / propertyEstimateAmount) * 100).toFixed(1) + "%"
        : "-";

      // Total claim amount (직접복구 건 기준)
      const claimAmount = preventionEstimateAmount + propertyEstimateAmount;

      // Sum settlement amounts for all cases in group
      const totalSettlementAmount = casesInGroup.reduce((sum, c) => sum + c.settlementAmount, 0);
      // 수수료: 직접복구 건이 있을 때만 해당 건들의 수수료 합산
      const directRepairCases = casesInGroup.filter(c => c.recoveryType === "직접복구");
      const totalSettlementCommission = hasDirectRepair 
        ? directRepairCases.reduce((sum, c) => sum + c.settlementCommission, 0)
        : 0;
      // 사용료: 모든 건이 선견적요청일 때만 10만원, 직접복구 건이 하나라도 있으면 0
      const totalUsageFee = allNoRepair ? 100000 : 0;
      const totalSettlementDeposit = casesInGroup.reduce((sum, c) => sum + c.settlementDeposit, 0);
      const totalSettlementDeductible = casesInGroup.reduce((sum, c) => sum + c.settlementDeductible, 0);

      // 협력업체 지급 정보 합산
      const totalPartnerPaymentAmount = casesInGroup.reduce((sum, c) => sum + c.partnerPaymentAmount, 0);
      
      combinedRows.push({
        id: primaryCase.id,
        caseIds: allCaseIds,
        caseNumber: combinedCaseNumbers || primaryCase.caseNumber,
        caseNumberPrefix: prefix,
        insuranceCompany: primaryCase.insuranceCompany,
        manager: primaryCase.manager,
        managerId: primaryCase.managerId,
        withdrawalNumber: primaryCase.withdrawalNumber,
        accidentNumber: primaryCase.accidentNumber,
        admin: primaryCase.admin,
        depositBank: primaryCase.depositBank,
        withdrawalDate: primaryCase.withdrawalDate,
        constructionStatus: hasDirectRepair ? "수리" : (allNoRepair ? "미수리" : "-"),
        recoveryType: hasDirectRepair ? "직접복구" : primaryCase.recoveryType,
        preventionEstimateAmount,
        preventionApprovedAmount,
        preventionDifference,
        preventionAdjustmentRate,
        propertyEstimateAmount,
        propertyApprovedAmount,
        propertyDifference,
        propertyAdjustmentRate,
        claimAmount,
        settlementAmount: totalSettlementAmount,
        settlementDate: primaryCase.settlementDate,
        settlementCommission: totalSettlementCommission,
        usageFee: totalUsageFee,
        settlementDeposit: totalSettlementDeposit,
        settlementDeductible: totalSettlementDeductible,
        settlementInvoiceDate: primaryCase.settlementInvoiceDate,
        settlementMemo: primaryCase.settlementMemo,
        status: primaryCase.status,
        partnerPaymentAmount: totalPartnerPaymentAmount,
        partnerPaymentDate: primaryCase.partnerPaymentDate,
      });
    });

    // 최신 접수순으로 정렬 (접수번호 기준 내림차순)
    combinedRows.sort((a, b) => {
      const prefixA = a.caseNumberPrefix || "";
      const prefixB = b.caseNumberPrefix || "";
      return prefixB.localeCompare(prefixA);
    });

    return combinedRows;
  }, [claimCases, estimatesMap, user, usersByIdMap, usersByUsernameMap, usersByCompanyMap, settlementsByCaseIdMap]);

  const isLoading = casesLoading || estimatesLoading || usersLoading || settlementsLoading;

  // 필터링 (검색어 + 정산여부 + 보험사 + 심사사 + 담당자)
  const filteredRows = useMemo(() => {
    let filtered = tableRows;
    
    // 정산여부 필터 적용
    if (settlementStatus !== "전체") {
      filtered = filtered.filter((row) => row.status === settlementStatus);
    }
    
    // 보험사 필터 적용
    if (insuranceCompany !== "전체") {
      filtered = filtered.filter((row) => row.insuranceCompany === insuranceCompany);
    }
    
    // 심사사 필터 적용 (manager는 assessorId로 심사사 회사명을 저장)
    if (assessor !== "전체") {
      filtered = filtered.filter((row) => {
        return row.manager === assessor;
      });
    }
    
    // 담당자 필터 적용 (managerId는 관리자 ID이므로 해당 사용자의 name과 비교)
    if (manager !== "전체") {
      filtered = filtered.filter((row) => {
        if (!row.managerId) return false;
        const managerUser = usersByIdMap.get(row.managerId);
        return managerUser?.name === manager;
      });
    }
    
    // 접수번호 검색 필터 적용
    if (searchQuery.trim()) {
      const extractNumbers = (str: string | null) => (str || "").replace(/[^0-9]/g, "");
      const normalizedQuery = extractNumbers(searchQuery.trim());
      
      if (normalizedQuery) {
        filtered = filtered.filter((row) => {
          const caseNumberDigits = extractNumbers(row.caseNumber);
          return caseNumberDigits.includes(normalizedQuery);
        });
      }
    }
    
    // 기간 필터 적용 (정산일 기준)
    if (startDate && endDate) {
      filtered = filtered.filter((row) => {
        if (!row.settlementDate || row.settlementDate === "-") return false;
        const rowDate = new Date(row.settlementDate);
        // 시작일 00:00:00부터 종료일 23:59:59까지 포함
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        return rowDate >= start && rowDate <= end;
      });
    }
    
    return filtered;
  }, [tableRows, searchQuery, settlementStatus, insuranceCompany, assessor, manager, usersByIdMap, usersByUsernameMap, usersByCompanyMap, startDate, endDate]);

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
                <SelectItem value="청구">청구</SelectItem>
                <SelectItem value="부분입금">부분입금</SelectItem>
                <SelectItem value="입금완료">입금완료</SelectItem>
                <SelectItem value="정산완료">정산완료</SelectItem>
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
                {insuranceCompanyOptions.map((company) => (
                  <SelectItem key={company} value={company}>{company}</SelectItem>
                ))}
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
                {assessorOptions.map((company) => (
                  <SelectItem key={company} value={company}>{company}</SelectItem>
                ))}
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
                {managerOptions.map((name) => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
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
          data-testid="text-results-count"
        >
          {filteredRows.length}
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
                >협력사</th>
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
              ) : filteredRows.length === 0 ? (
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
                    {searchQuery.trim() ? "검색 결과가 없습니다." : "정산 조회 대상 접수건이 없습니다."}
                  </td>
                </tr>
              ) : filteredRows.map((row, index) => (
                <tr
                  key={row.id}
                  style={{
                    borderBottom:
                      index < filteredRows.length - 1
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
                    {row.managerId ? (usersByIdMap.get(row.managerId)?.name || "-") : "-"}
                  </td>
                  <td
                    style={{
                      padding: "8px 12px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: "rgba(12, 12, 12, 0.8)",
                      borderRight: "1px solid rgba(12, 12, 12, 0.05)",
                      textAlign: "center",
                      width: "120px",
                      maxWidth: "120px",
                    }}
                  >
                    <div
                      style={{
                        maxHeight: "48px",
                        overflowY: "auto",
                        display: "flex",
                        flexDirection: "column",
                        gap: "2px",
                      }}
                    >
                      {row.caseNumber?.split(", ").map((num, idx) => (
                        <div key={idx}>{formatCaseNumber(num)}</div>
                      )) || "-"}
                    </div>
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
                      color: row.settlementCommission > 0 ? "rgba(12, 12, 12, 0.8)" : "rgba(12, 12, 12, 0.5)",
                      borderRight: "1px solid rgba(12, 12, 12, 0.05)",
                      textAlign: "right",
                    }}
                  >
                    {row.settlementCommission > 0 ? row.settlementCommission.toLocaleString() + "원" : "-"}
                  </td>
                  {/* 협력업체 (지급금액, 지급일) */}
                  <td
                    style={{
                      padding: "14px 16px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: row.partnerPaymentAmount > 0 ? "rgba(12, 12, 12, 0.8)" : "rgba(12, 12, 12, 0.5)",
                      borderRight: "1px solid rgba(12, 12, 12, 0.05)",
                      textAlign: "right",
                    }}
                  >
                    {row.partnerPaymentAmount > 0 ? row.partnerPaymentAmount.toLocaleString() + "원" : "-"}
                  </td>
                  <td
                    style={{
                      padding: "14px 16px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: row.partnerPaymentDate !== "-" ? "rgba(12, 12, 12, 0.8)" : "rgba(12, 12, 12, 0.5)",
                      borderRight: "1px solid rgba(12, 12, 12, 0.05)",
                      textAlign: "center",
                    }}
                  >
                    {row.partnerPaymentDate}
                  </td>
                  {/* 사용료 */}
                  <td
                    style={{
                      padding: "14px 16px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: row.usageFee > 0 ? "rgba(12, 12, 12, 0.8)" : "rgba(12, 12, 12, 0.5)",
                      borderRight: "1px solid rgba(12, 12, 12, 0.05)",
                      textAlign: "right",
                    }}
                  >
                    {row.usageFee > 0 ? row.usageFee.toLocaleString() + "원" : "-"}
                  </td>
                  {/* 자기부담금 */}
                  <td
                    style={{
                      padding: "14px 16px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: row.settlementDeductible > 0 ? "rgba(12, 12, 12, 0.8)" : "rgba(12, 12, 12, 0.5)",
                      borderRight: "1px solid rgba(12, 12, 12, 0.05)",
                      textAlign: "right",
                    }}
                  >
                    {row.settlementDeductible > 0 ? row.settlementDeductible.toLocaleString() + "원" : "-"}
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
                      color: row.depositBank !== "-" ? "rgba(12, 12, 12, 0.8)" : "rgba(12, 12, 12, 0.5)",
                      borderRight: "1px solid rgba(12, 12, 12, 0.05)",
                      textAlign: "center",
                    }}
                  >
                    {row.depositBank}
                  </td>
                  {/* 입금액 (정산 입금액) */}
                  <td
                    style={{
                      padding: "14px 16px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: row.settlementDeposit > 0 ? "rgba(12, 12, 12, 0.8)" : "rgba(12, 12, 12, 0.5)",
                      borderRight: "1px solid rgba(12, 12, 12, 0.05)",
                      textAlign: "right",
                    }}
                  >
                    {row.settlementDeposit > 0 ? row.settlementDeposit.toLocaleString() + "원" : "-"}
                  </td>
                  {/* 입금일 (정산일자) */}
                  <td
                    style={{
                      padding: "14px 16px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: row.settlementDate !== "-" ? "rgba(12, 12, 12, 0.8)" : "rgba(12, 12, 12, 0.5)",
                      borderRight: "1px solid rgba(12, 12, 12, 0.05)",
                      textAlign: "center",
                    }}
                  >
                    {row.settlementDate}
                  </td>
                  {/* 계산서 (계산서 발행일) */}
                  <td
                    style={{
                      padding: "14px 16px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: row.settlementInvoiceDate !== "-" ? "rgba(12, 12, 12, 0.8)" : "rgba(12, 12, 12, 0.5)",
                      borderRight: "1px solid rgba(12, 12, 12, 0.05)",
                      textAlign: "center",
                    }}
                  >
                    {row.settlementInvoiceDate}
                  </td>
                  {/* 관리 */}
                  <td
                    style={{
                      padding: "14px 16px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      textAlign: "center",
                    }}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenManagement(row);
                      }}
                      data-testid={`button-management-${row.id}`}
                      style={{
                        padding: "4px 12px",
                        height: "28px",
                        fontSize: "12px",
                        fontFamily: "Pretendard",
                      }}
                    >
                      관리
                    </Button>
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
      {/* Settlement Management Dialog */}
      <Dialog open={managementDialogOpen} onOpenChange={setManagementDialogOpen}>
        <DialogContent 
          className="max-w-4xl max-h-[80vh] overflow-y-auto"
          style={{
            fontFamily: "Pretendard",
          }}
        >
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "Pretendard", fontSize: "18px", fontWeight: 600 }}>
              정산 관리 - {selectedCaseForManagement?.caseNumber ? formatCaseNumber(selectedCaseForManagement.caseNumber) : ""}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Case Info Summary */}
            {selectedCaseForManagement && (
              <div 
                className="p-4 rounded-lg"
                style={{ background: "rgba(12, 12, 12, 0.03)", border: "1px solid rgba(12, 12, 12, 0.08)" }}
              >
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div style={{ fontSize: "12px", color: "rgba(12, 12, 12, 0.5)" }}>보험사</div>
                    <div style={{ fontSize: "14px", fontWeight: 500 }}>{selectedCaseForManagement.insuranceCompany}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "12px", color: "rgba(12, 12, 12, 0.5)" }}>사고번호</div>
                    <div style={{ fontSize: "14px", fontWeight: 500 }}>{selectedCaseForManagement.accidentNumber}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "12px", color: "rgba(12, 12, 12, 0.5)" }}>청구액</div>
                    <div style={{ fontSize: "14px", fontWeight: 500 }}>{selectedCaseForManagement.claimAmount.toLocaleString()}원</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "12px", color: "rgba(12, 12, 12, 0.5)" }}>진행상태</div>
                    <div style={{ fontSize: "14px", fontWeight: 500 }}>{selectedCaseForManagement.status}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Settlement History */}
            <div>
              <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "12px" }}>
                정산 이력 ({selectedCaseSettlements.length}건)
              </h3>

              {selectedCaseSettlements.length === 0 ? (
                <div 
                  className="p-8 text-center rounded-lg"
                  style={{ background: "rgba(12, 12, 12, 0.03)", border: "1px solid rgba(12, 12, 12, 0.08)" }}
                >
                  <span style={{ fontSize: "14px", color: "rgba(12, 12, 12, 0.5)" }}>
                    정산 이력이 없습니다.
                  </span>
                </div>
              ) : (
                <div 
                  className="rounded-lg overflow-hidden"
                  style={{ border: "1px solid rgba(12, 12, 12, 0.08)" }}
                >
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "rgba(12, 12, 12, 0.06)" }}>
                        <th style={{ padding: "12px 16px", fontSize: "13px", fontWeight: 600, textAlign: "center", borderBottom: "1px solid rgba(12, 12, 12, 0.08)" }}>정산일</th>
                        <th style={{ padding: "12px 16px", fontSize: "13px", fontWeight: 600, textAlign: "right", borderBottom: "1px solid rgba(12, 12, 12, 0.08)" }}>정산금액</th>
                        <th style={{ padding: "12px 16px", fontSize: "13px", fontWeight: 600, textAlign: "right", borderBottom: "1px solid rgba(12, 12, 12, 0.08)" }}>수수료</th>
                        <th style={{ padding: "12px 16px", fontSize: "13px", fontWeight: 600, textAlign: "right", borderBottom: "1px solid rgba(12, 12, 12, 0.08)" }}>할인</th>
                        <th style={{ padding: "12px 16px", fontSize: "13px", fontWeight: 600, textAlign: "right", borderBottom: "1px solid rgba(12, 12, 12, 0.08)" }}>자기부담금</th>
                        <th style={{ padding: "12px 16px", fontSize: "13px", fontWeight: 600, textAlign: "center", borderBottom: "1px solid rgba(12, 12, 12, 0.08)" }}>계산서 발행일</th>
                        <th style={{ padding: "12px 16px", fontSize: "13px", fontWeight: 600, textAlign: "left", borderBottom: "1px solid rgba(12, 12, 12, 0.08)" }}>메모</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedCaseSettlements.map((settlement, index) => (
                        <tr 
                          key={settlement.id}
                          style={{ background: index % 2 === 0 ? "#fff" : "rgba(12, 12, 12, 0.02)" }}
                        >
                          <td style={{ padding: "12px 16px", fontSize: "14px", textAlign: "center", borderBottom: "1px solid rgba(12, 12, 12, 0.05)" }}>
                            {settlement.settlementDate || "-"}
                          </td>
                          <td style={{ padding: "12px 16px", fontSize: "14px", textAlign: "right", borderBottom: "1px solid rgba(12, 12, 12, 0.05)" }}>
                            {settlement.settlementAmount ? parseInt(settlement.settlementAmount).toLocaleString() + "원" : "-"}
                          </td>
                          <td style={{ padding: "12px 16px", fontSize: "14px", textAlign: "right", borderBottom: "1px solid rgba(12, 12, 12, 0.05)" }}>
                            {settlement.commission ? parseInt(settlement.commission).toLocaleString() + "원" : "-"}
                          </td>
                          <td style={{ padding: "12px 16px", fontSize: "14px", textAlign: "right", borderBottom: "1px solid rgba(12, 12, 12, 0.05)" }}>
                            {settlement.discount ? parseInt(settlement.discount).toLocaleString() + "원" : "-"}
                          </td>
                          <td style={{ padding: "12px 16px", fontSize: "14px", textAlign: "right", borderBottom: "1px solid rgba(12, 12, 12, 0.05)" }}>
                            {settlement.deductible ? parseInt(settlement.deductible).toLocaleString() + "원" : "-"}
                          </td>
                          <td style={{ padding: "12px 16px", fontSize: "14px", textAlign: "center", borderBottom: "1px solid rgba(12, 12, 12, 0.05)" }}>
                            {settlement.invoiceDate || "-"}
                          </td>
                          <td style={{ padding: "12px 16px", fontSize: "14px", textAlign: "left", borderBottom: "1px solid rgba(12, 12, 12, 0.05)", maxWidth: "200px" }}>
                            <span style={{ 
                              overflow: "hidden", 
                              textOverflow: "ellipsis", 
                              whiteSpace: "nowrap",
                              display: "block" 
                            }}>
                              {settlement.memo || "-"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Total Summary */}
            {selectedCaseSettlements.length > 0 && (
              <div 
                className="p-4 rounded-lg"
                style={{ background: "rgba(0, 143, 237, 0.05)", border: "1px solid rgba(0, 143, 237, 0.15)" }}
              >
                <div className="flex justify-between items-center">
                  <span style={{ fontSize: "14px", fontWeight: 500 }}>총 정산금액</span>
                  <span style={{ fontSize: "18px", fontWeight: 600, color: "#008FED" }}>
                    {selectedCaseSettlements.reduce((sum, s) => sum + (parseInt(s.settlementAmount) || 0), 0).toLocaleString()}원
                  </span>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      {/* INVOICE Sheet - 직접복구 케이스용 (손해방지비용 + 대물복구비용) */}
      <InvoiceSheet
        open={showInvoiceDialog}
        onOpenChange={setShowInvoiceDialog}
        caseData={cases?.find(c => c.id === invoiceCaseId) || null}
        relatedCases={(() => {
          const invoiceCase = cases?.find(c => c.id === invoiceCaseId);
          const invoiceCasePrefix = getCaseNumberPrefix(invoiceCase?.caseNumber);
          return invoiceCasePrefix 
            ? cases?.filter(c => getCaseNumberPrefix(c.caseNumber) === invoiceCasePrefix) || []
            : invoiceCase ? [invoiceCase] : [];
        })()}
      />
      {/* 현장출동비용 청구 Sheet - 선견적요청 케이스용 (현장출동비용만) */}
      <FieldDispatchCostSheet
        open={showFieldDispatchInvoiceDialog}
        onOpenChange={setShowFieldDispatchInvoiceDialog}
        caseData={cases?.find(c => c.id === invoiceCaseId) || null}
        relatedCases={(() => {
          const invoiceCase = cases?.find(c => c.id === invoiceCaseId);
          const invoiceCasePrefix = getCaseNumberPrefix(invoiceCase?.caseNumber);
          return invoiceCasePrefix 
            ? cases?.filter(c => getCaseNumberPrefix(c.caseNumber) === invoiceCasePrefix) || []
            : invoiceCase ? [invoiceCase] : [];
        })()}
      />
      {/* 인보이스 관리 팝업 */}
      <InvoiceManagementPopup
        open={showInvoiceManagementPopup}
        onOpenChange={setShowInvoiceManagementPopup}
        caseData={selectedCaseForInvoice}
        estimateData={selectedEstimateData}
        relatedCases={selectedRelatedCasesForInvoice.map(c => ({
          id: c.id,
          caseNumber: c.caseNumber,
          recoveryType: c.recoveryType,
          estimateAmount: null,
        }))}
        managerName={(() => {
          if (!selectedCaseForInvoice?.managerId) return "-";
          const manager = usersByIdMap.get(selectedCaseForInvoice.managerId);
          return manager?.name || "-";
        })()}
        managerContact={(() => {
          if (!selectedCaseForInvoice?.managerId) return "-";
          const manager = usersByIdMap.get(selectedCaseForInvoice.managerId);
          return manager?.phone || "-";
        })()}
        settlementCommission={selectedCommission}
      />
    </div>
  );
}
