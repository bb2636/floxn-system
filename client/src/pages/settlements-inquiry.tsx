import { useState, useMemo, useRef } from "react";
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
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { formatCaseNumber } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

// 정산 테이블 행 타입
interface SettlementRow {
  id: string;
  caseNumber: string | null;
  insuranceCompany: string;
  manager: string;
  withdrawalNumber: string;
  accidentNumber: string;
  admin: string;
  depositBank: string; // 입금은행
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
  // 정산 데이터
  settlementAmount: number;
  settlementDate: string;
  settlementCommission: number;
  settlementDeposit: number;
  settlementDeductible: number;
  settlementInvoiceDate: string;
  settlementMemo: string;
  status: string;
}

// 케이스 번호에서 prefix 추출 (예: "251203001-2" -> "251203001")
const getCaseNumberPrefix = (caseNumber: string | null | undefined): string | null => {
  if (!caseNumber) return null;
  const dashIndex = caseNumber.lastIndexOf('-');
  if (dashIndex > 0) {
    return caseNumber.substring(0, dashIndex);
  }
  return caseNumber;
};

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
  
  // Invoice Sheet 상태 변수들
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [invoiceCaseId, setInvoiceCaseId] = useState<string | null>(null);
  const [invoiceDamagePreventionAmount, setInvoiceDamagePreventionAmount] = useState<string>("");
  const [invoiceFieldDispatchAmount, setInvoiceFieldDispatchAmount] = useState<string>("");
  const [invoiceRemarks, setInvoiceRemarks] = useState<string>("");
  const [invoiceRecipientEmail, setInvoiceRecipientEmail] = useState<string>("");
  const invoicePdfRef = useRef<HTMLDivElement>(null);
  const [isSendingInvoicePdf, setIsSendingInvoicePdf] = useState(false);
  
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

  // Helper function to open Invoice Sheet
  const handleOpenManagement = (row: SettlementRow) => {
    const targetCase = cases.find(c => c.id === row.id);
    if (targetCase) {
      setInvoiceCaseId(targetCase.id);
      setShowInvoiceDialog(true);
    }
  };
  
  // INVOICE PDF 발송 함수
  const handleSendInvoicePdf = async (invoiceCase: CaseWithLatestProgress | undefined, totalAmount: number) => {
    if (!invoicePdfRef.current) {
      toast({
        title: "PDF 생성 실패",
        description: "변환할 인보이스 정보를 찾을 수 없습니다.",
        variant: "destructive",
      });
      return;
    }

    if (!invoiceRecipientEmail) {
      toast({
        title: "이메일 주소 필요",
        description: "수신자 이메일 주소를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    setIsSendingInvoicePdf(true);

    try {
      const jsPDF = (await import("jspdf")).default;
      const html2canvas = (await import("html2canvas")).default;

      const pdfContainer = invoicePdfRef.current;
      const inputFields = pdfContainer.querySelectorAll('.invoice-input-field');
      const spanFields = pdfContainer.querySelectorAll('.invoice-span-field');
      const wonLabels = pdfContainer.querySelectorAll('.invoice-input-field + span');
      
      inputFields.forEach(el => (el as HTMLElement).style.display = 'none');
      wonLabels.forEach(el => (el as HTMLElement).style.display = 'none');
      spanFields.forEach(el => (el as HTMLElement).style.display = 'inline');

      const canvas = await html2canvas(invoicePdfRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#FFFFFF",
      });

      inputFields.forEach(el => (el as HTMLElement).style.display = '');
      wonLabels.forEach(el => (el as HTMLElement).style.display = '');
      spanFields.forEach(el => (el as HTMLElement).style.display = 'none');

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 10;
      
      const imgWidth = pageWidth - (margin * 2);
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);

      const pdfBase64 = pdf.output('datauristring').split(',')[1];

      const response = await fetch('/api/send-invoice-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: invoiceRecipientEmail,
          pdfBase64,
          caseNumber: invoiceCase?.caseNumber || '',
          insuranceCompany: invoiceCase?.insuranceCompany || '',
          accidentNo: invoiceCase?.insuranceAccidentNo || '',
          damagePreventionAmount: parseInt(invoiceDamagePreventionAmount || "0") || 0,
          fieldDispatchAmount: parseInt(invoiceFieldDispatchAmount || "0") || 0,
          totalAmount,
          remarks: invoiceRemarks,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "이메일 전송 완료",
          description: `${invoiceRecipientEmail}으로 INVOICE PDF가 전송되었습니다.`,
        });
        setShowInvoiceDialog(false);
        setInvoiceRecipientEmail("");
        setInvoiceDamagePreventionAmount("");
        setInvoiceFieldDispatchAmount("");
        setInvoiceRemarks("");
      } else {
        throw new Error(result.error || "이메일 전송에 실패했습니다");
      }
    } catch (error) {
      console.error("INVOICE PDF 이메일 전송 중 오류 발생", error);
      toast({
        title: "이메일 전송 실패",
        description: error instanceof Error ? error.message : "다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsSendingInvoicePdf(false);
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
  const settlementStatuses = ["청구", "입금완료", "일부입금", "정산완료"];
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

  // Build table rows using useMemo to ensure proper reactivity
  const tableRows = useMemo(() => {
    if (!user) return [];
    
    return claimCases.map((caseItem) => {
      const estimateData = estimatesMap.get(caseItem.id);
      
      // Calculate estimate total from labor cost data (노무비)
      // This is the most accurate source as it reflects the actual saved estimate
      let estimateTotal = 0;
      
      if (estimateData?.estimate?.laborCostData) {
        const laborData = estimateData.estimate.laborCostData as any[];
        
        // Sum up all labor costs
        const laborTotal = laborData.reduce((sum, row) => sum + (row.amount || 0), 0);
        
        // Calculate fees and taxes
        const managementFee = Math.round(laborTotal * 0.06); // 일반관리비 6%
        const profit = Math.round(laborTotal * 0.15); // 이윤 15%
        const subtotalBeforeVAT = laborTotal + managementFee + profit;
        const vat = Math.round(subtotalBeforeVAT * 0.1); // VAT 10%
        
        estimateTotal = subtotalBeforeVAT + vat;
      } else {
        // Fallback to cases.estimateAmount if no estimate data exists
        const parseAmount = (value: string | number | null | undefined): number => {
          if (value === null || value === undefined) return 0;
          if (typeof value === 'number') return isNaN(value) ? 0 : value;
          const cleaned = String(value).replace(/,/g, '');
          const parsed = Number(cleaned);
          return isNaN(parsed) ? 0 : parsed;
        };
        
        estimateTotal = parseAmount(caseItem.estimateAmount);
      }

      // Check processing types from individual fields (damagePreventionCost, victimIncidentAssistance)
      // and also from processingTypes JSON array for backward compatibility
      let hasPreventionCost = caseItem.damagePreventionCost === "true";
      let hasPropertyCost = caseItem.victimIncidentAssistance === "true";
      
      // Also check case number pattern: if case number contains "-" it's 피해세대복구, otherwise 손해방지
      if (!hasPreventionCost && !hasPropertyCost && caseItem.caseNumber) {
        if (caseItem.caseNumber.includes('-')) {
          hasPropertyCost = true;
        } else {
          hasPreventionCost = true;
        }
      }
      
      // Fallback to processingTypes JSON array if still not determined
      if (!hasPreventionCost && !hasPropertyCost && caseItem.processingTypes) {
        try {
          const parsed = JSON.parse(caseItem.processingTypes);
          if (Array.isArray(parsed)) {
            hasPreventionCost = parsed.includes("손해방지");
            hasPropertyCost = parsed.includes("피해세대복구");
          }
        } catch (error) {
          console.error(`Error parsing processingTypes for case ${caseItem.id}:`, error);
        }
      }

      // Calculate estimate amounts
      const preventionEstimateAmount = (hasPreventionCost && estimateTotal > 0) ? estimateTotal : 0;
      const propertyEstimateAmount = (hasPropertyCost && estimateTotal > 0) ? estimateTotal : 0;

      // Helper function for parsing amounts (reuse if defined above)
      const parseAmountValue = (value: string | number | null | undefined): number => {
        if (value === null || value === undefined) return 0;
        if (typeof value === 'number') return isNaN(value) ? 0 : value;
        const cleaned = String(value).replace(/,/g, '');
        const parsed = Number(cleaned);
        return isNaN(parsed) ? 0 : parsed;
      };
      
      // Use approvedAmount field if available, otherwise fall back to estimate if approved
      const caseApprovedAmount = parseAmountValue(caseItem.approvedAmount);
      const isApproved = caseItem.reviewDecision === "승인" || caseApprovedAmount > 0;
      const approvedValue = caseApprovedAmount > 0 ? caseApprovedAmount : (isApproved ? estimateTotal : 0);
      
      const preventionApprovedAmount = (hasPreventionCost && approvedValue > 0) ? approvedValue : 0;
      const propertyApprovedAmount = (hasPropertyCost && approvedValue > 0) ? approvedValue : 0;

      // Calculate differences and adjustment rates
      const preventionDifference = preventionApprovedAmount - preventionEstimateAmount;
      const preventionAdjustmentRate = preventionEstimateAmount > 0 
        ? ((preventionDifference / preventionEstimateAmount) * 100).toFixed(1) + "%"
        : "-";

      const propertyDifference = propertyApprovedAmount - propertyEstimateAmount;
      const propertyAdjustmentRate = propertyEstimateAmount > 0
        ? ((propertyDifference / propertyEstimateAmount) * 100).toFixed(1) + "%"
        : "-";

      // Get assigned partner's bank information
      // Try both ID and username lookup for backward compatibility
      const assignedPartnerValue = caseItem.assignedPartner || user.username;
      const partnerUser = usersByIdMap.get(assignedPartnerValue) 
        || usersByUsernameMap.get(assignedPartnerValue)
        || usersByCompanyMap.get(assignedPartnerValue);
      const depositBank = partnerUser?.bankName || "-";

      // 정산 데이터 파싱 - settlements 테이블에서 가져오기
      const settlement = settlementsByCaseIdMap.get(caseItem.id);
      const settlementAmount = settlement ? parseAmountValue(settlement.settlementAmount) : 0;
      const settlementCommission = settlement ? parseAmountValue(settlement.commission) : 0;
      const settlementDeposit = settlement ? parseAmountValue(settlement.discount) : 0;
      const settlementDeductible = settlement ? parseAmountValue(settlement.deductible) : 0;

      return {
        id: caseItem.id,
        caseNumber: caseItem.caseNumber,
        insuranceCompany: caseItem.insuranceCompany || "-",
        manager: caseItem.assessorId || "-",
        withdrawalNumber: caseItem.insurancePolicyNo || "-",
        accidentNumber: caseItem.insuranceAccidentNo || "-",
        admin: assignedPartnerValue,
        depositBank,
        withdrawalDate: caseItem.completionDate || caseItem.claimDate || "-",
        constructionStatus: caseItem.recoveryType ? "수리" : "미수리",
        preventionEstimateAmount,
        preventionApprovedAmount,
        preventionDifference,
        preventionAdjustmentRate,
        propertyEstimateAmount,
        propertyApprovedAmount,
        propertyDifference,
        propertyAdjustmentRate,
        claimAmount: estimateTotal,
        // 정산 데이터 추가 - settlements 테이블에서
        settlementAmount,
        settlementDate: settlement?.settlementDate || "-",
        settlementCommission,
        settlementDeposit,
        settlementDeductible,
        settlementInvoiceDate: settlement?.invoiceDate || "-",
        settlementMemo: settlement?.memo || "",
        status: caseItem.status,
      };
    });
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
    
    // 심사사 필터 적용 (manager는 assessorId이므로 해당 사용자의 company와 비교)
    if (assessor !== "전체") {
      filtered = filtered.filter((row) => {
        const assessorUser = usersByIdMap.get(row.manager);
        return assessorUser?.company === assessor;
      });
    }
    
    // 담당자 필터 적용 (admin은 assignedPartner이므로 해당 사용자의 name과 비교)
    if (manager !== "전체") {
      filtered = filtered.filter((row) => {
        const adminUser = usersByIdMap.get(row.admin) 
          || usersByUsernameMap.get(row.admin)
          || usersByCompanyMap.get(row.admin);
        return adminUser?.name === manager;
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
    
    return filtered;
  }, [tableRows, searchQuery, settlementStatus, insuranceCompany, assessor, manager, usersByIdMap, usersByUsernameMap, usersByCompanyMap]);

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
                <SelectItem value="일부입금">일부입금</SelectItem>
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
                    {formatCaseNumber(row.caseNumber)}
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

      {/* INVOICE Sheet - 새 디자인 */}
      <Sheet open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
        <SheetContent 
          side="right" 
          style={{
            width: "680px",
            maxWidth: "95vw",
            padding: 0,
            background: "#FFFFFF",
            overflow: "auto",
            boxShadow: "0px -2px 70px rgba(179, 193, 205, 0.8)",
            borderRadius: "12px 0 0 12px",
          }}
          data-testid="dialog-invoice"
        >
          {(() => {
            const invoiceCase = cases?.find(c => c.id === invoiceCaseId);
            const invoiceCasePrefix = getCaseNumberPrefix(invoiceCase?.caseNumber);
            const relatedCases = invoiceCasePrefix 
              ? cases?.filter(c => getCaseNumberPrefix(c.caseNumber) === invoiceCasePrefix) || []
              : invoiceCase ? [invoiceCase] : [];
            
            const totalAmount = (parseInt(invoiceDamagePreventionAmount || "0") || 0) + (parseInt(invoiceFieldDispatchAmount || "0") || 0);
            
            return (
              <div style={{
                display: "flex",
                flexDirection: "column",
                padding: "38px 0px 0px",
                gap: "24px",
              }}>
                {/* 헤더 섹션 */}
                <div style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                  width: "100%",
                }}>
                  <div style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    padding: "0px 38px",
                  }}>
                    <h2 style={{
                      fontFamily: "Pretendard",
                      fontWeight: 600,
                      fontSize: "32px",
                      lineHeight: "128%",
                      color: "#0C0C0C",
                      margin: 0,
                    }}>
                      INVOICE
                    </h2>
                  </div>
                  <div style={{
                    width: "100%",
                    height: "0px",
                    border: "1px solid rgba(12, 12, 12, 0.1)",
                  }} />
                </div>

                {/* 메인 콘텐츠 - PDF 캡처 영역 */}
                <div 
                  ref={invoicePdfRef}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    padding: "0px 38px",
                    gap: "26px",
                    background: "#FFFFFF",
                  }}
                >
                  {/* 요약 카드 2개 */}
                  <div style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: "8px",
                    width: "100%",
                  }}>
                    {/* 왼쪽 카드: 수신, 사고번호 */}
                    <div style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      padding: "15px 16px",
                      gap: "15px",
                      flex: 1,
                      background: "rgba(12, 12, 12, 0.04)",
                      backdropFilter: "blur(7px)",
                      borderRadius: "12px",
                    }}>
                      <div style={{
                        display: "flex",
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        width: "100%",
                      }}>
                        <span style={{
                          fontFamily: "Pretendard",
                          fontWeight: 400,
                          fontSize: "15px",
                          lineHeight: "128%",
                          letterSpacing: "-0.01em",
                          color: "rgba(12, 12, 12, 0.7)",
                        }}>
                          수신
                        </span>
                        <span style={{
                          fontFamily: "Pretendard",
                          fontWeight: 600,
                          fontSize: "15px",
                          lineHeight: "128%",
                          letterSpacing: "-0.02em",
                          color: "rgba(12, 12, 12, 0.9)",
                        }}>
                          {invoiceCase?.insuranceCompany || "-"}
                        </span>
                      </div>
                      <div style={{
                        width: "100%",
                        height: "0px",
                        border: "1px solid rgba(12, 12, 12, 0.1)",
                      }} />
                      <div style={{
                        display: "flex",
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        width: "100%",
                      }}>
                        <span style={{
                          fontFamily: "Pretendard",
                          fontWeight: 400,
                          fontSize: "15px",
                          lineHeight: "128%",
                          letterSpacing: "-0.01em",
                          color: "rgba(12, 12, 12, 0.7)",
                        }}>
                          사고번호
                        </span>
                        <span style={{
                          fontFamily: "Pretendard",
                          fontWeight: 600,
                          fontSize: "15px",
                          lineHeight: "128%",
                          letterSpacing: "-0.02em",
                          color: "rgba(12, 12, 12, 0.9)",
                        }}>
                          {invoiceCase?.insuranceAccidentNo || "-"}
                        </span>
                      </div>
                    </div>

                    {/* 오른쪽 카드: 수임일자, 제출일자 */}
                    <div style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      padding: "15px 16px",
                      gap: "15px",
                      flex: 1,
                      background: "rgba(12, 12, 12, 0.04)",
                      backdropFilter: "blur(7px)",
                      borderRadius: "12px",
                    }}>
                      <div style={{
                        display: "flex",
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        width: "100%",
                      }}>
                        <span style={{
                          fontFamily: "Pretendard",
                          fontWeight: 400,
                          fontSize: "15px",
                          lineHeight: "128%",
                          letterSpacing: "-0.01em",
                          color: "rgba(12, 12, 12, 0.7)",
                        }}>
                          수임일자
                        </span>
                        <span style={{
                          fontFamily: "Pretendard",
                          fontWeight: 600,
                          fontSize: "15px",
                          lineHeight: "128%",
                          letterSpacing: "-0.02em",
                          color: "rgba(12, 12, 12, 0.9)",
                        }}>
                          {invoiceCase?.receptionDate || "-"}
                        </span>
                      </div>
                      <div style={{
                        width: "100%",
                        height: "0px",
                        border: "1px solid rgba(12, 12, 12, 0.1)",
                      }} />
                      <div style={{
                        display: "flex",
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        width: "100%",
                      }}>
                        <span style={{
                          fontFamily: "Pretendard",
                          fontWeight: 400,
                          fontSize: "15px",
                          lineHeight: "128%",
                          letterSpacing: "-0.01em",
                          color: "rgba(12, 12, 12, 0.7)",
                        }}>
                          제출일자
                        </span>
                        <span style={{
                          fontFamily: "Pretendard",
                          fontWeight: 600,
                          fontSize: "15px",
                          lineHeight: "128%",
                          letterSpacing: "-0.02em",
                          color: "rgba(12, 12, 12, 0.9)",
                        }}>
                          {format(new Date(), "yyyy.MM.dd")}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Particulars 섹션 */}
                  <div style={{ width: "100%" }}>
                    <div style={{
                      fontFamily: "Pretendard",
                      fontWeight: 400,
                      fontSize: "14px",
                      lineHeight: "128%",
                      letterSpacing: "-0.01em",
                      color: "rgba(12, 12, 12, 0.5)",
                      marginBottom: "8px",
                    }}>
                      Particulars
                    </div>
                    <div style={{
                      fontFamily: "Pretendard",
                      fontWeight: 500,
                      fontSize: "16px",
                      lineHeight: "128%",
                      letterSpacing: "-0.02em",
                      color: "rgba(12, 12, 12, 0.9)",
                    }}>
                      사고번호 {invoiceCase?.insuranceAccidentNo || "-"}
                    </div>
                  </div>

                  {/* 테이블: PARTICULARS / AMOUNT */}
                  <div style={{ width: "100%" }}>
                    {/* 테이블 헤더 */}
                    <div style={{
                      display: "flex",
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "12px 0",
                      borderBottom: "1px solid rgba(12, 12, 12, 0.1)",
                    }}>
                      <span style={{
                        fontFamily: "Pretendard",
                        fontWeight: 600,
                        fontSize: "14px",
                        lineHeight: "128%",
                        letterSpacing: "-0.02em",
                        color: "rgba(12, 12, 12, 0.5)",
                      }}>
                        PARTICULARS
                      </span>
                      <span style={{
                        fontFamily: "Pretendard",
                        fontWeight: 600,
                        fontSize: "14px",
                        lineHeight: "128%",
                        letterSpacing: "-0.02em",
                        color: "rgba(12, 12, 12, 0.5)",
                      }}>
                        AMOUNT
                      </span>
                    </div>

                    {/* 손해방지비용 */}
                    <div style={{
                      display: "flex",
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "16px 0",
                      borderBottom: "1px solid rgba(12, 12, 12, 0.1)",
                    }}>
                      <span style={{
                        fontFamily: "Pretendard",
                        fontWeight: 500,
                        fontSize: "15px",
                        lineHeight: "128%",
                        letterSpacing: "-0.01em",
                        color: "rgba(12, 12, 12, 0.7)",
                      }}>
                        손해방지비용
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <input
                          type="text"
                          value={invoiceDamagePreventionAmount ? Number(invoiceDamagePreventionAmount).toLocaleString() : ""}
                          onChange={(e) => setInvoiceDamagePreventionAmount(e.target.value.replace(/[^0-9]/g, ""))}
                          placeholder="0"
                          className="invoice-input-field"
                          style={{
                            fontFamily: "Pretendard",
                            fontWeight: 500,
                            fontSize: "15px",
                            lineHeight: "128%",
                            letterSpacing: "-0.01em",
                            color: "rgba(12, 12, 12, 0.9)",
                            background: "transparent",
                            border: "none",
                            outline: "none",
                            textAlign: "right",
                            width: "120px",
                          }}
                          data-testid="input-damage-prevention-amount"
                        />
                        <span style={{
                          fontFamily: "Pretendard",
                          fontWeight: 500,
                          fontSize: "15px",
                          color: "rgba(12, 12, 12, 0.9)",
                        }}>원</span>
                        <span 
                          className="invoice-span-field"
                          style={{
                            display: "none",
                            fontFamily: "Pretendard",
                            fontWeight: 500,
                            fontSize: "15px",
                            lineHeight: "128%",
                            letterSpacing: "-0.01em",
                            color: "rgba(12, 12, 12, 0.9)",
                          }}
                          data-testid="text-damage-prevention-amount"
                        >
                          {invoiceDamagePreventionAmount ? Number(invoiceDamagePreventionAmount).toLocaleString() : "0"}원
                        </span>
                      </div>
                    </div>

                    {/* 대물복구비용 */}
                    <div style={{
                      display: "flex",
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "16px 0",
                      borderBottom: "1px solid rgba(12, 12, 12, 0.1)",
                    }}>
                      <span style={{
                        fontFamily: "Pretendard",
                        fontWeight: 500,
                        fontSize: "15px",
                        lineHeight: "128%",
                        letterSpacing: "-0.01em",
                        color: "rgba(12, 12, 12, 0.7)",
                      }}>
                        대물복구비용
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <input
                          type="text"
                          value={invoiceFieldDispatchAmount ? Number(invoiceFieldDispatchAmount).toLocaleString() : ""}
                          onChange={(e) => setInvoiceFieldDispatchAmount(e.target.value.replace(/[^0-9]/g, ""))}
                          placeholder="0"
                          className="invoice-input-field"
                          style={{
                            fontFamily: "Pretendard",
                            fontWeight: 500,
                            fontSize: "15px",
                            lineHeight: "128%",
                            letterSpacing: "-0.01em",
                            color: "rgba(12, 12, 12, 0.9)",
                            background: "transparent",
                            border: "none",
                            outline: "none",
                            textAlign: "right",
                            width: "120px",
                          }}
                          data-testid="input-field-dispatch-amount"
                        />
                        <span style={{
                          fontFamily: "Pretendard",
                          fontWeight: 500,
                          fontSize: "15px",
                          color: "rgba(12, 12, 12, 0.9)",
                        }}>원</span>
                        <span 
                          className="invoice-span-field"
                          style={{
                            display: "none",
                            fontFamily: "Pretendard",
                            fontWeight: 500,
                            fontSize: "15px",
                            lineHeight: "128%",
                            letterSpacing: "-0.01em",
                            color: "rgba(12, 12, 12, 0.9)",
                          }}
                          data-testid="text-field-dispatch-amount"
                        >
                          {invoiceFieldDispatchAmount ? Number(invoiceFieldDispatchAmount).toLocaleString() : "0"}원
                        </span>
                      </div>
                    </div>

                    {/* TOTAL AMOUNT */}
                    <div style={{
                      display: "flex",
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "16px 0",
                    }}>
                      <span style={{
                        fontFamily: "Pretendard",
                        fontWeight: 600,
                        fontSize: "15px",
                        lineHeight: "128%",
                        letterSpacing: "-0.02em",
                        color: "rgba(12, 12, 12, 0.9)",
                      }}>
                        TOTAL AMOUNT
                      </span>
                      <span style={{
                        fontFamily: "Pretendard",
                        fontWeight: 700,
                        fontSize: "18px",
                        lineHeight: "128%",
                        letterSpacing: "-0.02em",
                        color: "rgba(12, 12, 12, 0.9)",
                      }}>
                        {totalAmount.toLocaleString()}원
                      </span>
                    </div>
                  </div>

                  {/* 비고 및 입금정보 */}
                  <div style={{
                    display: "flex",
                    flexDirection: "row",
                    gap: "24px",
                    width: "100%",
                  }}>
                    {/* 비고 */}
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontFamily: "Pretendard",
                        fontWeight: 600,
                        fontSize: "15px",
                        lineHeight: "128%",
                        letterSpacing: "-0.02em",
                        color: "rgba(12, 12, 12, 0.9)",
                        marginBottom: "12px",
                      }}>
                        비고
                      </div>
                      <textarea
                        value={invoiceRemarks}
                        onChange={(e) => setInvoiceRemarks(e.target.value)}
                        placeholder="내용을 입력해주세요"
                        style={{
                          width: "100%",
                          height: "120px",
                          fontFamily: "Pretendard",
                          fontWeight: 400,
                          fontSize: "14px",
                          lineHeight: "150%",
                          letterSpacing: "-0.01em",
                          color: "rgba(12, 12, 12, 0.9)",
                          background: "rgba(12, 12, 12, 0.04)",
                          border: "none",
                          borderRadius: "8px",
                          padding: "12px",
                          resize: "none",
                          outline: "none",
                        }}
                        data-testid="textarea-invoice-remarks"
                      />
                    </div>

                    {/* 입금정보 */}
                    <div style={{
                      flex: 1,
                      background: "rgba(12, 149, 246, 0.1)",
                      borderRadius: "12px",
                      padding: "16px",
                    }}>
                      <div style={{
                        fontFamily: "Pretendard",
                        fontWeight: 600,
                        fontSize: "15px",
                        lineHeight: "128%",
                        letterSpacing: "-0.02em",
                        color: "rgba(12, 12, 12, 0.9)",
                        marginBottom: "16px",
                      }}>
                        입금 정보
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{
                            fontFamily: "Pretendard",
                            fontWeight: 400,
                            fontSize: "14px",
                            color: "rgba(12, 12, 12, 0.7)",
                          }}>
                            은행명
                          </span>
                          <span style={{
                            fontFamily: "Pretendard",
                            fontWeight: 500,
                            fontSize: "14px",
                            color: "rgba(12, 12, 12, 0.9)",
                          }}>
                            KB국민은행
                          </span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{
                            fontFamily: "Pretendard",
                            fontWeight: 400,
                            fontSize: "14px",
                            color: "rgba(12, 12, 12, 0.7)",
                          }}>
                            계좌번호
                          </span>
                          <span style={{
                            fontFamily: "Pretendard",
                            fontWeight: 500,
                            fontSize: "14px",
                            color: "rgba(12, 12, 12, 0.9)",
                          }}>
                            00000000000
                          </span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{
                            fontFamily: "Pretendard",
                            fontWeight: 400,
                            fontSize: "14px",
                            color: "rgba(12, 12, 12, 0.7)",
                          }}>
                            예금주
                          </span>
                          <span style={{
                            fontFamily: "Pretendard",
                            fontWeight: 500,
                            fontSize: "14px",
                            color: "rgba(12, 12, 12, 0.9)",
                          }}>
                            주식회사 블루손
                          </span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{
                            fontFamily: "Pretendard",
                            fontWeight: 400,
                            fontSize: "14px",
                            color: "rgba(12, 12, 12, 0.7)",
                          }}>
                            사업자등록번호
                          </span>
                          <span style={{
                            fontFamily: "Pretendard",
                            fontWeight: 500,
                            fontSize: "14px",
                            color: "rgba(12, 12, 12, 0.9)",
                          }}>
                            517-89-03490
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 이메일 입력 및 하단 버튼 */}
                <div style={{ 
                  padding: "20px 38px", 
                  borderTop: "1px solid rgba(12, 12, 12, 0.08)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}>
                  {/* 수신자 이메일 입력 */}
                  <div style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: "12px",
                  }}>
                    <span style={{
                      fontFamily: "Pretendard",
                      fontWeight: 500,
                      fontSize: "14px",
                      color: "rgba(12, 12, 12, 0.7)",
                      whiteSpace: "nowrap",
                    }}>
                      수신자 이메일
                    </span>
                    <input
                      type="email"
                      value={invoiceRecipientEmail}
                      onChange={(e) => setInvoiceRecipientEmail(e.target.value)}
                      placeholder="보험사 이메일 주소를 입력해주세요"
                      style={{
                        flex: 1,
                        fontFamily: "Pretendard",
                        fontWeight: 400,
                        fontSize: "14px",
                        lineHeight: "128%",
                        letterSpacing: "-0.01em",
                        color: "rgba(12, 12, 12, 0.9)",
                        background: "rgba(12, 12, 12, 0.04)",
                        border: "1px solid rgba(12, 12, 12, 0.1)",
                        borderRadius: "8px",
                        padding: "10px 14px",
                        outline: "none",
                      }}
                      data-testid="input-invoice-email"
                    />
                  </div>

                  {/* 버튼 영역 */}
                  <div style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "12px",
                  }}>
                    <Button
                      variant="outline"
                      onClick={() => handleSendInvoicePdf(invoiceCase, totalAmount)}
                      disabled={isSendingInvoicePdf || !invoiceRecipientEmail}
                      data-testid="button-invoice-pdf"
                    >
                      {isSendingInvoicePdf ? "발송 중..." : "PDF 발송"}
                    </Button>
                    <Button
                      onClick={async () => {
                        try {
                          await apiRequest("POST", "/api/invoice/send", {
                            caseId: invoiceCaseId,
                            relatedCaseIds: relatedCases.map(c => c.id),
                            damagePreventionAmount: parseInt(invoiceDamagePreventionAmount || "0") || 0,
                            fieldDispatchAmount: parseInt(invoiceFieldDispatchAmount || "0") || 0,
                            remarks: invoiceRemarks,
                            totalAmount: totalAmount,
                          });
                          toast({
                            title: "저장 완료",
                            description: "인보이스가 저장되었습니다.",
                          });
                          setShowInvoiceDialog(false);
                          setInvoiceDamagePreventionAmount("");
                          setInvoiceFieldDispatchAmount("");
                          setInvoiceRemarks("");
                          queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
                        } catch (error: any) {
                          toast({
                            title: "저장 실패",
                            description: error?.message || "저장 중 오류가 발생했습니다.",
                            variant: "destructive",
                          });
                        }
                      }}
                      style={{ background: "#008FED" }}
                      data-testid="button-invoice-save"
                    >
                      저장
                    </Button>
                  </div>
                </div>
              </div>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}
