import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { User, CaseWithLatestProgress } from "@shared/schema";
import { Search, X, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export default function SettlementAction() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [settlementAmount, setSettlementAmount] = useState("");
  const [settlementDate, setSettlementDate] = useState<Date | undefined>(undefined);
  const [commission, setCommission] = useState("0");
  const [discount, setDiscount] = useState("0");
  const [deductible, setDeductible] = useState("0");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [useTodayInvoice, setUseTodayInvoice] = useState(false);
  const [settlementMemo, setSettlementMemo] = useState("");

  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  const { data: cases = [], isLoading } = useQuery<CaseWithLatestProgress[]>({
    queryKey: ["/api/cases"],
  });

  const { data: allUsers = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  if (!user) {
    return null;
  }

  // Create maps for quick user lookup by both ID and username
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

  // Filter cases with status '청구' (claim)
  const claimCases = cases.filter((c) => c.status === "청구");
  const caseIds = claimCases.map(c => c.id);

  // Fetch all estimates in a single batch request
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

  // Create a map for quick estimate lookup
  const estimatesMap = useMemo(() => {
    const map = new Map();
    if (estimatesData) {
      for (const item of estimatesData) {
        map.set(item.caseId, item);
      }
    }
    return map;
  }, [estimatesData]);

  // Helper function to format number with commas
  const formatNumberWithComma = (value: string | number | null | undefined): string => {
    if (!value || value === "0") return "0";
    const numValue = typeof value === "string" ? parseFloat(value.replace(/,/g, "")) : value;
    if (isNaN(numValue)) return "0";
    return numValue.toLocaleString("ko-KR");
  };

  // Helper function to calculate approved amount from labor cost data
  const calculateApprovedAmount = (caseId: string, caseItem: CaseWithLatestProgress): number => {
    const estimateData = estimatesMap.get(caseId);
    
    // Calculate from labor cost data (most accurate)
    if (estimateData?.estimate?.laborCostData) {
      const laborData = estimateData.estimate.laborCostData as any[];
      const laborTotal = laborData.reduce((sum, row) => sum + (row.amount || 0), 0);
      
      const managementFee = Math.round(laborTotal * 0.06); // 일반관리비 6%
      const profit = Math.round(laborTotal * 0.15); // 이윤 15%
      const subtotalBeforeVAT = laborTotal + managementFee + profit;
      const vat = Math.round(subtotalBeforeVAT * 0.1); // VAT 10%
      
      return subtotalBeforeVAT + vat;
    }
    
    // Fallback to estimateAmount
    const parseAmount = (value: string | number | null | undefined): number => {
      if (value === null || value === undefined) return 0;
      if (typeof value === 'number') return isNaN(value) ? 0 : value;
      const cleaned = String(value).replace(/,/g, '');
      const parsed = Number(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    };
    
    return parseAmount(caseItem.estimateAmount);
  };

  // Map real case data to settlement rows
  // useMemo ensures recomputation when users or estimates data changes
  const settlements = useMemo(() => {
    return claimCases.map((caseItem) => {
      const approvedAmount = calculateApprovedAmount(caseItem.id, caseItem);
      
      // Get partner user - try both ID and username lookup
      const assignedPartnerValue = caseItem.assignedPartner || "";
      const partnerUser = usersByIdMap.get(assignedPartnerValue) || usersByUsernameMap.get(assignedPartnerValue);
      
      return {
        id: caseItem.id,
        date: caseItem.createdAt ? format(new Date(caseItem.createdAt), "yyyy-MM-dd") : "-",
        insuranceCompany: caseItem.insuranceCompany || "-",
        insuranceAccidentNo: caseItem.insuranceAccidentNo || "-",
        caseNumber: caseItem.caseNumber,
        contractor: caseItem.policyHolderName || "-",
        assessor: caseItem.assessorId || "-",
        reviewManager: caseItem.reviewedBy || "-", // 심사 담당자
        partner: caseItem.assignedPartner || "-",
        partnerName: partnerUser?.name || caseItem.assignedPartner || "-", // 협력사 이름
        partnerUser: partnerUser, // 협력사 사용자 정보
        clientManager: caseItem.clientName || "-", // 당사 담당자
        approvedAmount: formatNumberWithComma(approvedAmount), // 승인금액
        claimAmount: formatNumberWithComma(approvedAmount), // 청구액 (승인금액과 동일)
        depositAmount: "0", // TODO: Add deposit tracking
        caseData: caseItem,
      };
    });
  }, [claimCases, usersByIdMap, usersByUsernameMap, estimatesMap]);

  // Filter settlements based on search query
  const filteredSettlements = searchQuery.trim()
    ? settlements.filter(
        (s) =>
          s.caseNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.insuranceAccidentNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.insuranceCompany.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.contractor.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : settlements;

  const selectedCase = filteredSettlements.find((s) => s.id === selectedCaseId);

  const handleSearch = () => {
    console.log("Searching for:", searchQuery);
  };

  const handleSettlement = () => {
    if (!selectedCase) {
      console.error("No case selected for settlement");
      return;
    }

    const settlementData = {
      caseId: selectedCase.id,
      caseNumber: selectedCase.caseNumber,
      settlementAmount: parseFloat(settlementAmount.replace(/,/g, "")) || 0,
      settlementDate: settlementDate ? format(settlementDate, "yyyy-MM-dd") : "",
      commission: parseFloat(commission) || 0,
      discount: parseFloat(discount) || 0,
      deductible: parseFloat(deductible) || 0,
      invoiceDate,
      useTodayInvoice,
      settlementMemo,
    };

    console.log("Settlement data to submit:", settlementData);
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
          정산하기
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

      {/* Search and Results Section - Combined */}
      <div
        className="mb-6"
        style={{
          background: "#FFFFFF",
          borderRadius: "12px",
          padding: "24px",
          border: "1px solid rgba(12, 12, 12, 0.08)",
        }}
      >
        {/* Section Title */}
        <h2
          className="mb-4"
          style={{
            fontFamily: "Pretendard",
            fontSize: "16px",
            fontWeight: 600,
            color: "#0C0C0C",
          }}
        >
          조회하기
        </h2>

        {/* Search Input */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2"
              size={20}
              style={{ color: "rgba(12, 12, 12, 0.4)" }}
            />
            <Input
              type="text"
              placeholder="25219943"
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
              data-testid="input-search-settlement"
            />
          </div>
          <Button
            onClick={handleSearch}
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
            data-testid="button-search-settlement"
          >
            검색
          </Button>
        </div>

        {/* Results Count */}
        <div className="mb-4">
          <span
            style={{
              fontFamily: "Pretendard",
              fontSize: "14px",
              fontWeight: 500,
              color: "rgba(12, 12, 12, 0.7)",
            }}
          >
            검색결과 {filteredSettlements.length}
          </span>
        </div>

        {/* Results Table */}
        <div
          style={{
            borderRadius: "8px",
            border: "1px solid rgba(12, 12, 12, 0.08)",
            overflow: "hidden",
          }}
        >
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "rgba(12, 12, 12, 0.06)" }}>
                  <th
                    style={{
                      padding: "12px 16px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "rgba(12, 12, 12, 0.8)",
                      borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                      textAlign: "center",
                      minWidth: "90px",
                    }}
                  >
                    날짜
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "rgba(12, 12, 12, 0.8)",
                      borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                      textAlign: "center",
                      minWidth: "100px",
                    }}
                  >
                    보험사
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "rgba(12, 12, 12, 0.8)",
                      borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                      textAlign: "center",
                      minWidth: "120px",
                    }}
                  >
                    보험사 사고번호
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "rgba(12, 12, 12, 0.8)",
                      borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                      textAlign: "center",
                      minWidth: "100px",
                    }}
                  >
                    접수번호
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "rgba(12, 12, 12, 0.8)",
                      borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                      textAlign: "center",
                      minWidth: "80px",
                    }}
                  >
                    계약자
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "rgba(12, 12, 12, 0.8)",
                      borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                      textAlign: "center",
                      minWidth: "80px",
                    }}
                  >
                    심사사
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "rgba(12, 12, 12, 0.8)",
                      borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                      textAlign: "center",
                      minWidth: "100px",
                    }}
                  >
                    심사 담당자
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "rgba(12, 12, 12, 0.8)",
                      borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                      textAlign: "center",
                      minWidth: "100px",
                    }}
                  >
                    청구액
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "rgba(12, 12, 12, 0.8)",
                      borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                      textAlign: "center",
                      minWidth: "100px",
                    }}
                  >
                    입금액
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "rgba(12, 12, 12, 0.8)",
                      borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                      textAlign: "center",
                      minWidth: "60px",
                    }}
                  >
                    오픈
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={10} style={{ padding: "40px", textAlign: "center" }}>
                      <span
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          color: "rgba(12, 12, 12, 0.5)",
                        }}
                      >
                        데이터를 불러오는 중...
                      </span>
                    </td>
                  </tr>
                ) : filteredSettlements.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ padding: "40px", textAlign: "center" }}>
                      <span
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          color: "rgba(12, 12, 12, 0.5)",
                        }}
                      >
                        {searchQuery.trim() ? "검색 결과가 없습니다." : "진행상태가 '청구'인 접수건이 없습니다."}
                      </span>
                    </td>
                  </tr>
                ) : (
                  filteredSettlements.map((row) => (
                    <tr
                      key={row.id}
                      style={{
                        background: selectedCaseId === row.id ? "rgba(0, 143, 237, 0.05)" : "#FFFFFF",
                        cursor: "pointer",
                      }}
                      onClick={() => setSelectedCaseId(row.id)}
                    >
                      <td
                        style={{
                          padding: "12px 16px",
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          color: "rgba(12, 12, 12, 0.8)",
                          borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                          textAlign: "center",
                        }}
                      >
                        {row.date}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          color: "rgba(12, 12, 12, 0.8)",
                          borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                          textAlign: "center",
                        }}
                      >
                        {row.insuranceCompany}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          color: "rgba(12, 12, 12, 0.8)",
                          borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                          textAlign: "center",
                        }}
                      >
                        {row.insuranceAccidentNo}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          color: "rgba(12, 12, 12, 0.8)",
                          borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                          textAlign: "center",
                        }}
                      >
                        {row.caseNumber}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          color: "rgba(12, 12, 12, 0.8)",
                          borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                          textAlign: "center",
                        }}
                      >
                        {row.contractor}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          color: "rgba(12, 12, 12, 0.8)",
                          borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                          textAlign: "center",
                        }}
                      >
                        {row.assessor}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          color: "rgba(12, 12, 12, 0.8)",
                          borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                          textAlign: "center",
                        }}
                      >
                        {row.reviewManager}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          color: "rgba(12, 12, 12, 0.8)",
                          borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                          textAlign: "center",
                        }}
                      >
                        {row.claimAmount}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          color: "rgba(12, 12, 12, 0.8)",
                          borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                          textAlign: "center",
                        }}
                      >
                        {row.depositAmount}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                          textAlign: "center",
                        }}
                      >
                        <div
                          style={{
                            width: "24px",
                            height: "24px",
                            borderRadius: "50%",
                            background: selectedCaseId === row.id ? "#008FED" : "rgba(12, 12, 12, 0.1)",
                            margin: "0 auto",
                          }}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detail Section */}
      {selectedCase && (
        <div
          style={{
            background: "rgba(12, 12, 12, 0.04)",
            backdropFilter: "blur(7px)",
            borderRadius: "12px",
            padding: "32px",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "#008FED",
                }}
              />
              <div className="flex items-center gap-2">
                <h3
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "22px",
                    fontWeight: 600,
                    letterSpacing: "-0.02em",
                    color: "rgba(12, 12, 12, 0.9)",
                  }}
                >
                  {selectedCase.insuranceCompany}
                </h3>
                <h3
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "22px",
                    fontWeight: 600,
                    letterSpacing: "-0.02em",
                    color: "rgba(12, 12, 12, 0.9)",
                  }}
                >
                  {selectedCase.insuranceAccidentNo}
                </h3>
              </div>
            </div>
            <button
              onClick={() => setSelectedCaseId(null)}
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                background: "rgba(12, 12, 12, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                border: "none",
              }}
              data-testid="button-close-detail"
            >
              <X size={16} style={{ color: "#FFFFFF" }} />
            </button>
          </div>

          {/* Meta Info */}
          <div className="flex items-center gap-6 mb-6" style={{ paddingLeft: "24px" }}>
            <div className="flex items-center gap-2">
              <span
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "16px",
                  color: "rgba(12, 12, 12, 0.5)",
                }}
              >
                접수번호
              </span>
              <span
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "16px",
                  color: "rgba(12, 12, 12, 0.7)",
                }}
              >
                {selectedCase.caseNumber}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "16px",
                  color: "rgba(12, 12, 12, 0.5)",
                }}
              >
                계약자
              </span>
              <span
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "16px",
                  color: "rgba(12, 12, 12, 0.7)",
                }}
              >
                {selectedCase.contractor}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "16px",
                  color: "rgba(12, 12, 12, 0.5)",
                }}
              >
                협력사
              </span>
              <span
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "16px",
                  color: "rgba(12, 12, 12, 0.7)",
                }}
              >
                {selectedCase.partnerName}
              </span>
            </div>
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-[2fr_1fr] gap-3 mb-6">
            {/* Left Column */}
            <div className="flex flex-col gap-3">
              {/* Basic Info */}
              <div
                style={{
                  background: "#FFFFFF",
                  borderRadius: "12px",
                  padding: "24px",
                }}
              >
                <h4
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "15px",
                    fontWeight: 600,
                    letterSpacing: "-0.02em",
                    color: "rgba(12, 12, 12, 0.9)",
                    marginBottom: "16px",
                  }}
                >
                  기본정보
                </h4>
                <div className="grid grid-cols-4 gap-x-6 gap-y-4">
                  {[
                    { label: "보험사", value: selectedCase.insuranceCompany },
                    { label: "사고번호", value: selectedCase.insuranceAccidentNo },
                    { label: "접수번호", value: selectedCase.caseNumber },
                    { label: "계약자", value: selectedCase.contractor },
                    { label: "당사 담당자", value: selectedCase.clientManager },
                    { label: "협력사", value: selectedCase.partnerName },
                    { label: "승인금액", value: selectedCase.approvedAmount },
                    { label: "청구액", value: selectedCase.claimAmount },
                  ].map((item, idx) => (
                    <div key={idx}>
                      <div
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          color: "rgba(12, 12, 12, 0.5)",
                          marginBottom: "4px",
                        }}
                      >
                        {item.label}
                      </div>
                      <div
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          fontWeight: 500,
                          color: "rgba(12, 12, 12, 0.9)",
                        }}
                      >
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Settlement Status */}
              <div className="grid grid-cols-2 gap-3">
                <div
                  style={{
                    background: "#FFFFFF",
                    borderRadius: "12px",
                    padding: "20px",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: "rgba(12, 12, 12, 0.6)",
                      marginBottom: "8px",
                    }}
                  >
                    정산 상태
                  </div>
                  <div
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "18px",
                      fontWeight: 600,
                      color: selectedCase.caseData.status === "정산완료" 
                        ? "#008FED" 
                        : selectedCase.caseData.status === "입금완료"
                        ? "#008FED"
                        : "rgba(12, 12, 12, 0.9)",
                    }}
                  >
                    {selectedCase.caseData.status === "청구" 
                      ? "미정산" 
                      : selectedCase.caseData.status === "입금완료"
                      ? "입금완료"
                      : selectedCase.caseData.status === "일부입금"
                      ? "일부입금"
                      : selectedCase.caseData.status === "정산완료"
                      ? "정산완료"
                      : selectedCase.caseData.status
                    }
                  </div>
                </div>
                <div
                  style={{
                    background: "#FFFFFF",
                    borderRadius: "12px",
                    padding: "20px",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: "rgba(12, 12, 12, 0.6)",
                      marginBottom: "8px",
                    }}
                  >
                    미정산액
                  </div>
                  <div
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "18px",
                      fontWeight: 600,
                      color: selectedCase.caseData.status === "정산완료" || selectedCase.caseData.status === "입금완료"
                        ? "#008FED"
                        : "#D02B20",
                    }}
                  >
                    {selectedCase.caseData.status === "정산완료" || selectedCase.caseData.status === "입금완료"
                      ? "0원"
                      : `${selectedCase.approvedAmount}원`
                    }
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Account Info */}
            <div
              style={{
                background: "#FFFFFF",
                borderRadius: "12px",
                padding: "24px",
              }}
            >
              <h4
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "15px",
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                  color: "rgba(12, 12, 12, 0.9)",
                  marginBottom: "16px",
                }}
              >
                협력사 계좌 정보
              </h4>
              <div className="space-y-4">
                <div>
                  <div
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "rgba(12, 12, 12, 0.9)",
                      marginBottom: "8px",
                    }}
                  >
                    {selectedCase.partnerUser?.bankName || "-"}
                  </div>
                  <div
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "18px",
                      fontWeight: 600,
                      color: "rgba(12, 12, 12, 0.9)",
                    }}
                  >
                    {selectedCase.partnerUser?.accountNumber || "-"}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "rgba(12, 12, 12, 0.9)",
                      marginBottom: "4px",
                    }}
                  >
                    {selectedCase.partnerUser?.accountHolder || "-"}
                  </div>
                  <div
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: "rgba(12, 12, 12, 0.6)",
                    }}
                  >
                    · 협력사 계좌가 등록된 정보로 자동입력됩니다
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Settlement Form */}
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: "12px",
              padding: "24px",
            }}
          >
            <div className="flex items-center gap-2 mb-6">
              <h4
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "18px",
                  fontWeight: 600,
                  color: "rgba(12, 12, 12, 0.9)",
                }}
              >
                {selectedCase.partnerName}
              </h4>
              <span
                style={{
                  padding: "4px 12px",
                  background: "rgba(208, 43, 32, 0.1)",
                  borderRadius: "12px",
                  fontFamily: "Pretendard",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#D02B20",
                }}
              >
                미정산
              </span>
            </div>

            {/* Settlement Amount and Date */}
            <div className="grid grid-cols-2 gap-6 mb-4">
              <div>
                <label
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "rgba(12, 12, 12, 0.7)",
                    display: "block",
                    marginBottom: "8px",
                  }}
                >
                  정산금액
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    value={settlementAmount}
                    onChange={(e) => setSettlementAmount(e.target.value)}
                    placeholder="0"
                    style={{
                      flex: 1,
                      height: "44px",
                      background: "#FAFAFA",
                      border: "1px solid rgba(12, 12, 12, 0.1)",
                      borderRadius: "8px",
                      fontFamily: "Pretendard",
                      fontSize: "16px",
                      fontWeight: 600,
                      textAlign: "right",
                      paddingRight: "16px",
                    }}
                    data-testid="input-settlement-amount"
                  />
                  <span
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "16px",
                      color: "rgba(12, 12, 12, 0.7)",
                    }}
                  >
                    원
                  </span>
                </div>
                {/* Amount Buttons */}
                <div className="flex items-center gap-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const rawAmount = selectedCase.caseData.status === "정산완료" || selectedCase.caseData.status === "입금완료"
                        ? "0"
                        : selectedCase.approvedAmount.replace(/,/g, "");
                      setSettlementAmount(rawAmount.replace(/\B(?=(\d{3})+(?!\d))/g, ","));
                    }}
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "13px",
                      height: "32px",
                    }}
                    data-testid="button-full-amount"
                  >
                    전액
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const rawAmount = selectedCase.caseData.status === "정산완료" || selectedCase.caseData.status === "입금완료"
                        ? "0"
                        : selectedCase.approvedAmount.replace(/,/g, "");
                      const halfAmount = Math.floor(parseInt(rawAmount) * 0.5);
                      setSettlementAmount(halfAmount.toLocaleString());
                    }}
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "13px",
                      height: "32px",
                    }}
                    data-testid="button-half-amount"
                  >
                    50%
                  </Button>
                </div>
              </div>
              <div>
                <label
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "rgba(12, 12, 12, 0.7)",
                    display: "block",
                    marginBottom: "8px",
                  }}
                >
                  정산일자
                </label>
                <div className="flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        style={{
                          flex: 1,
                          height: "44px",
                          background: "#FAFAFA",
                          border: "1px solid rgba(12, 12, 12, 0.1)",
                          borderRadius: "8px",
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          justifyContent: "space-between",
                          fontWeight: settlementDate ? 500 : 400,
                          color: settlementDate ? "rgba(12, 12, 12, 0.9)" : "rgba(12, 12, 12, 0.5)",
                        }}
                        data-testid="button-settlement-date"
                      >
                        <span>{settlementDate ? format(settlementDate, "yyyy년 MM월 dd일", { locale: ko }) : "날짜 선택"}</span>
                        <CalendarIcon className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={settlementDate}
                        onSelect={setSettlementDate}
                        locale={ko}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <Button
                    variant="outline"
                    onClick={() => setSettlementDate(new Date())}
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "13px",
                      height: "44px",
                      whiteSpace: "nowrap",
                      paddingLeft: "12px",
                      paddingRight: "12px",
                    }}
                    data-testid="button-set-today"
                  >
                    오늘로 설정
                  </Button>
                </div>
              </div>
            </div>

            {/* Unsettled Amount Display */}
            <div className="mb-6">
              <div
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "16px",
                  fontWeight: 600,
                  color: "#008FED",
                }}
              >
                미정산액 {selectedCase.caseData.status === "정산완료" || selectedCase.caseData.status === "입금완료"
                  ? "0원"
                  : `${selectedCase.approvedAmount}원`
                }
              </div>
            </div>

            {/* Additional Fields */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div>
                <label
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "rgba(12, 12, 12, 0.7)",
                    display: "block",
                    marginBottom: "8px",
                  }}
                >
                  수수료(원)
                </label>
                <Input
                  type="text"
                  value={commission}
                  onChange={(e) => setCommission(e.target.value)}
                  placeholder="0"
                  style={{
                    height: "40px",
                    background: "#FAFAFA",
                    border: "1px solid rgba(12, 12, 12, 0.1)",
                    borderRadius: "8px",
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    textAlign: "center",
                  }}
                  data-testid="input-commission"
                />
              </div>
              <div>
                <label
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "rgba(12, 12, 12, 0.7)",
                    display: "block",
                    marginBottom: "8px",
                  }}
                >
                  할구
                </label>
                <Input
                  type="text"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  placeholder="0"
                  style={{
                    height: "40px",
                    background: "#FAFAFA",
                    border: "1px solid rgba(12, 12, 12, 0.1)",
                    borderRadius: "8px",
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    textAlign: "center",
                  }}
                  data-testid="input-discount"
                />
              </div>
              <div>
                <label
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "rgba(12, 12, 12, 0.7)",
                    display: "block",
                    marginBottom: "8px",
                  }}
                >
                  자기부담금(원)
                </label>
                <Input
                  type="text"
                  value={deductible}
                  onChange={(e) => setDeductible(e.target.value)}
                  placeholder="0"
                  style={{
                    height: "40px",
                    background: "#FAFAFA",
                    border: "1px solid rgba(12, 12, 12, 0.1)",
                    borderRadius: "8px",
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    textAlign: "center",
                  }}
                  data-testid="input-deductible"
                />
              </div>
              <div>
                <label
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "rgba(12, 12, 12, 0.7)",
                    display: "block",
                    marginBottom: "8px",
                  }}
                >
                  계산서 발행일
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    placeholder="날짜 선택"
                    style={{
                      flex: 1,
                      height: "40px",
                      background: "#FAFAFA",
                      border: "1px solid rgba(12, 12, 12, 0.1)",
                      borderRadius: "8px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                    }}
                    data-testid="input-invoice-date"
                  />
                  <div className="flex items-center gap-1">
                    <Checkbox
                      checked={useTodayInvoice}
                      onCheckedChange={(checked) => setUseTodayInvoice(checked === true)}
                      data-testid="checkbox-use-today-invoice"
                    />
                    <label
                      style={{
                        fontFamily: "Pretendard",
                        fontSize: "12px",
                        color: "rgba(12, 12, 12, 0.7)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      오늘로 설정
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Memo */}
            <div className="mb-6">
              <label
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "rgba(12, 12, 12, 0.7)",
                  display: "block",
                  marginBottom: "8px",
                }}
              >
                메모(선택)
              </label>
              <Textarea
                value={settlementMemo}
                onChange={(e) => setSettlementMemo(e.target.value)}
                placeholder="메모(선택) 내용을 입력하세요"
                maxLength={400}
                style={{
                  minHeight: "80px",
                  background: "#FAFAFA",
                  border: "1px solid rgba(12, 12, 12, 0.1)",
                  borderRadius: "8px",
                  fontFamily: "Pretendard",
                  fontSize: "14px",
                  resize: "none",
                }}
                data-testid="textarea-settlement-memo"
              />
              <div
                style={{
                  textAlign: "right",
                  marginTop: "4px",
                  fontFamily: "Pretendard",
                  fontSize: "12px",
                  color: "rgba(12, 12, 12, 0.5)",
                }}
              >
                {settlementMemo.length}/400
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between">
              <span
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "14px",
                  color: "rgba(12, 12, 12, 0.6)",
                }}
              >
                정산 요 관례 0건
              </span>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  style={{
                    height: "44px",
                    padding: "0 24px",
                    borderRadius: "8px",
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 600,
                  }}
                  data-testid="button-add-settlement"
                >
                  추가하기
                </Button>
                <Button
                  onClick={handleSettlement}
                  style={{
                    height: "44px",
                    padding: "0 32px",
                    background: "#6B7280",
                    borderRadius: "8px",
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "#FFFFFF",
                  }}
                  data-testid="button-submit-settlement"
                >
                  정산
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
