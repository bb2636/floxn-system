import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { User, CaseWithLatestProgress } from "@shared/schema";
import { Search, Calendar as CalendarIcon, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

export default function SettlementAction() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [isDetailExpanded, setIsDetailExpanded] = useState(true);
  const [settlementRate, setSettlementRate] = useState("50");
  const [settlementAmount, setSettlementAmount] = useState("");
  const [settlementDate, setSettlementDate] = useState<Date | undefined>(undefined);
  const [useTodayDate, setUseTodayDate] = useState(false);
  const [settlementMemo, setSettlementMemo] = useState("");

  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  const { data: cases = [], isLoading } = useQuery<CaseWithLatestProgress[]>({
    queryKey: ["/api/cases"],
  });

  if (!user) {
    return null;
  }

  // Filter cases with status '청구' (claim)
  const claimCases = cases.filter(c => c.status === "청구");

  // Map real case data to settlement rows
  const settlements = claimCases.map((caseItem) => ({
    id: caseItem.id,
    date: caseItem.claimDate || "-",
    insuranceCompany: caseItem.insuranceCompany || "-",
    insuranceAccidentNo: caseItem.insuranceAccidentNo || "-",
    caseNumber: caseItem.caseNumber,
    contractor: caseItem.policyHolderName || "-",
    assessor: caseItem.assessorId || "-",
    assessmentDate: caseItem.reviewedAt || "-",
    winner: caseItem.assignedPartner || "-",
    refundAmount: caseItem.estimateAmount || "0",
    depositAmount: "0", // TODO: Add deposit tracking
    caseData: caseItem,
  }));

  // Filter settlements based on search query
  const filteredSettlements = searchQuery.trim()
    ? settlements.filter(s => 
        s.caseNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.insuranceAccidentNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.insuranceCompany.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.contractor.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : settlements;

  const selectedCase = filteredSettlements.find(s => s.id === selectedCaseId);

  const handleSearch = () => {
    // Search is now handled reactively by filteredSettlements
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
      settlementRate: parseFloat(settlementRate) || 0,
      settlementAmount: parseFloat(settlementAmount.replace(/,/g, '')) || 0,
      settlementDate: settlementDate ? format(settlementDate, "yyyy-MM-dd") : null,
      useTodayDate,
      settlementMemo,
    };

    console.log("Settlement data to submit:", settlementData);
    // TODO: Replace with actual API call
    // await apiRequest("POST", "/api/settlements", settlementData);
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

      {/* Search Section */}
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
          className="mb-4"
          style={{
            fontFamily: "Pretendard",
            fontSize: "16px",
            fontWeight: 600,
            color: "#0C0C0C",
          }}
        >
          검색하기
        </h2>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2"
              size={20}
              style={{ color: "rgba(12, 12, 12, 0.4)" }}
            />
            <Input
              type="text"
              placeholder="25245196"
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
          borderRadius: "12px",
          border: "1px solid rgba(12, 12, 12, 0.08)",
          overflow: "hidden",
          marginBottom: "24px",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(12, 12, 12, 0.06)" }}>
                <th
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
                  날짜
                </th>
                <th
                  style={{
                    padding: "16px",
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "rgba(12, 12, 12, 0.8)",
                    borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                    textAlign: "center",
                    minWidth: "120px",
                  }}
                >
                  보험사
                </th>
                <th
                  style={{
                    padding: "16px",
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
                    padding: "16px",
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "rgba(12, 12, 12, 0.8)",
                    borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                    textAlign: "center",
                    minWidth: "120px",
                  }}
                >
                  접수번호
                </th>
                <th
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
                  계약자
                </th>
                <th
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
                  심사
                </th>
                <th
                  style={{
                    padding: "16px",
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "rgba(12, 12, 12, 0.8)",
                    borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                    textAlign: "center",
                    minWidth: "120px",
                  }}
                >
                  심사결정일
                </th>
                <th
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
                  당첨자
                </th>
                <th
                  style={{
                    padding: "16px",
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "rgba(12, 12, 12, 0.8)",
                    borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                    textAlign: "center",
                    minWidth: "120px",
                  }}
                >
                  환급액
                </th>
                <th
                  style={{
                    padding: "16px",
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "rgba(12, 12, 12, 0.8)",
                    borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                    textAlign: "center",
                    minWidth: "120px",
                  }}
                >
                  입금액
                </th>
                <th
                  style={{
                    padding: "16px",
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "rgba(12, 12, 12, 0.8)",
                    borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                    textAlign: "center",
                    minWidth: "80px",
                  }}
                >
                  오픈
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={11} style={{ padding: "40px", textAlign: "center" }}>
                    <span style={{ fontFamily: "Pretendard", fontSize: "14px", color: "rgba(12, 12, 12, 0.5)" }}>
                      데이터를 불러오는 중...
                    </span>
                  </td>
                </tr>
              ) : filteredSettlements.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ padding: "40px", textAlign: "center" }}>
                    <span style={{ fontFamily: "Pretendard", fontSize: "14px", color: "rgba(12, 12, 12, 0.5)" }}>
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
                    }}
                  >
                    <td
                      style={{
                        padding: "16px",
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
                        padding: "16px",
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
                        padding: "16px",
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
                        padding: "16px",
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
                        padding: "16px",
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
                        padding: "16px",
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
                        padding: "16px",
                        fontFamily: "Pretendard",
                        fontSize: "14px",
                        color: "rgba(12, 12, 12, 0.8)",
                        borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                        textAlign: "center",
                      }}
                    >
                      {row.assessmentDate}
                    </td>
                    <td
                      style={{
                        padding: "16px",
                        fontFamily: "Pretendard",
                        fontSize: "14px",
                        color: "rgba(12, 12, 12, 0.8)",
                        borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                        textAlign: "center",
                      }}
                    >
                      {row.winner}
                    </td>
                    <td
                      style={{
                        padding: "16px",
                        fontFamily: "Pretendard",
                        fontSize: "14px",
                        color: "rgba(12, 12, 12, 0.8)",
                        borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                        textAlign: "center",
                      }}
                    >
                      {row.refundAmount}
                    </td>
                    <td
                      style={{
                        padding: "16px",
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
                        padding: "16px",
                        borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                        textAlign: "center",
                      }}
                    >
                      <button
                        onClick={() => setSelectedCaseId(selectedCaseId === row.id ? null : row.id)}
                        style={{
                          width: "24px",
                          height: "24px",
                          borderRadius: "4px",
                          border: "2px solid #008FED",
                          background: selectedCaseId === row.id ? "#008FED" : "#FFFFFF",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          margin: "0 auto",
                        }}
                        data-testid={`button-select-case-${row.id}`}
                      >
                        {selectedCaseId === row.id && (
                          <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
                            <path
                              d="M1 5L5 9L13 1"
                              stroke="#FFFFFF"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Section */}
      {selectedCase && (
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: "12px",
            padding: "24px",
            border: "1px solid rgba(12, 12, 12, 0.08)",
            marginBottom: "24px",
          }}
        >
          {/* Detail Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "18px",
                  fontWeight: 600,
                  color: "#0C0C0C",
                  marginBottom: "8px",
                }}
              >
                {selectedCase.insuranceCompany} {selectedCase.insuranceAccidentNo}
              </h3>
              <div className="flex gap-4">
                <span
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    color: "rgba(12, 12, 12, 0.6)",
                  }}
                >
                  접수번호 {selectedCase.caseNumber}
                </span>
                <span
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    color: "rgba(12, 12, 12, 0.6)",
                  }}
                >
                  계약자: {selectedCase.contractor}
                </span>
                <span
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    color: "rgba(12, 12, 12, 0.6)",
                  }}
                >
                  담당자: {selectedCase.assessor}
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsDetailExpanded(!isDetailExpanded)}
              style={{
                padding: "8px",
                borderRadius: "6px",
                border: "1px solid rgba(12, 12, 12, 0.1)",
                background: "#FFFFFF",
                cursor: "pointer",
              }}
              data-testid="button-toggle-detail"
            >
              {isDetailExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          </div>

          {isDetailExpanded && (
            <>
              {/* Basic Info */}
              <div
                className="grid grid-cols-4 gap-4 mb-6"
                style={{
                  padding: "20px",
                  background: "rgba(12, 12, 12, 0.02)",
                  borderRadius: "8px",
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "12px",
                      color: "rgba(12, 12, 12, 0.5)",
                      marginBottom: "4px",
                    }}
                  >
                    보험사
                  </div>
                  <div
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "#0C0C0C",
                    }}
                  >
                    {selectedCase.insuranceCompany}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "12px",
                      color: "rgba(12, 12, 12, 0.5)",
                      marginBottom: "4px",
                    }}
                  >
                    사고번호
                  </div>
                  <div
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "#0C0C0C",
                    }}
                  >
                    {selectedCase.insuranceAccidentNo}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "12px",
                      color: "rgba(12, 12, 12, 0.5)",
                      marginBottom: "4px",
                    }}
                  >
                    접수번호
                  </div>
                  <div
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "#0C0C0C",
                    }}
                  >
                    {selectedCase.caseNumber}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "12px",
                      color: "rgba(12, 12, 12, 0.5)",
                      marginBottom: "4px",
                    }}
                  >
                    계약자
                  </div>
                  <div
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "#0C0C0C",
                    }}
                  >
                    {selectedCase.contractor}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "12px",
                      color: "rgba(12, 12, 12, 0.5)",
                      marginBottom: "4px",
                    }}
                  >
                    접수 심사결정일
                  </div>
                  <div
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "#0C0C0C",
                    }}
                  >
                    {selectedCase.assessmentDate}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "12px",
                      color: "rgba(12, 12, 12, 0.5)",
                      marginBottom: "4px",
                    }}
                  >
                    청산자
                  </div>
                  <div
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "#0C0C0C",
                    }}
                  >
                    {selectedCase.winner}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "12px",
                      color: "rgba(12, 12, 12, 0.5)",
                      marginBottom: "4px",
                    }}
                  >
                    심사결정일
                  </div>
                  <div
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "#0C0C0C",
                    }}
                  >
                    {selectedCase.assessmentDate}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "12px",
                      color: "rgba(12, 12, 12, 0.5)",
                      marginBottom: "4px",
                    }}
                  >
                    환급금
                  </div>
                  <div
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "#0C0C0C",
                    }}
                  >
                    {selectedCase.refundAmount}
                  </div>
                </div>
              </div>

              {/* Cost Info */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div
                  style={{
                    padding: "16px",
                    background: "rgba(12, 12, 12, 0.02)",
                    borderRadius: "8px",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "12px",
                      color: "rgba(12, 12, 12, 0.5)",
                      marginBottom: "8px",
                    }}
                  >
                    할인 실비
                  </div>
                  <div
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "16px",
                      fontWeight: 600,
                      color: "#0C0C0C",
                    }}
                  >
                    미정상
                  </div>
                </div>
                <div
                  style={{
                    padding: "16px",
                    background: "rgba(12, 12, 12, 0.02)",
                    borderRadius: "8px",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "12px",
                      color: "rgba(12, 12, 12, 0.5)",
                      marginBottom: "8px",
                    }}
                  >
                    보험가 가산금액
                  </div>
                  <div
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "16px",
                      fontWeight: 600,
                      color: "#0C0C0C",
                    }}
                  >
                    300,000원
                  </div>
                </div>
                <div
                  style={{
                    padding: "16px",
                    background: "rgba(12, 12, 12, 0.02)",
                    borderRadius: "8px",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "12px",
                      color: "rgba(12, 12, 12, 0.5)",
                      marginBottom: "8px",
                    }}
                  >
                    할인가 가산금액
                  </div>
                  <div
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "16px",
                      fontWeight: 600,
                      color: "#0C0C0C",
                    }}
                  >
                    0원
                  </div>
                </div>
              </div>

              {/* Settlement Form */}
              <div
                style={{
                  padding: "24px",
                  background: "rgba(0, 143, 237, 0.03)",
                  borderRadius: "8px",
                }}
              >
                <div className="flex items-center justify-between mb-6">
                  <h4
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "16px",
                      fontWeight: 600,
                      color: "#0C0C0C",
                    }}
                  >
                    정산하기
                  </h4>
                  <Button
                    variant="outline"
                    style={{
                      height: "36px",
                      padding: "0 16px",
                      borderRadius: "6px",
                      fontFamily: "Pretendard",
                      fontSize: "13px",
                    }}
                    data-testid="button-extra-fee"
                  >
                    엑스트라 성립요금
                  </Button>
                </div>

                {/* Settlement Amount */}
                <div className="mb-4">
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
                    청산총액
                  </label>
                  <div
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "18px",
                      fontWeight: 600,
                      color: "#0C0C0C",
                    }}
                  >
                    0 원
                  </div>
                </div>

                {/* Settlement Rate */}
                <div className="mb-4">
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
                    정률
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      value={settlementRate}
                      onChange={(e) => setSettlementRate(e.target.value)}
                      style={{
                        width: "100px",
                        height: "40px",
                        background: "#FFFFFF",
                        border: "1px solid rgba(12, 12, 12, 0.1)",
                        borderRadius: "6px",
                        fontFamily: "Pretendard",
                        fontSize: "14px",
                        textAlign: "center",
                      }}
                      data-testid="input-settlement-rate"
                    />
                    <span
                      style={{
                        fontFamily: "Pretendard",
                        fontSize: "14px",
                        color: "rgba(12, 12, 12, 0.8)",
                      }}
                    >
                      %
                    </span>
                  </div>
                </div>

                {/* Settlement Real Cost */}
                <div className="mb-4">
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
                    청산 실비
                  </label>
                  <Input
                    type="text"
                    value={settlementAmount}
                    onChange={(e) => setSettlementAmount(e.target.value)}
                    style={{
                      height: "40px",
                      background: "#FFFFFF",
                      border: "1px solid rgba(12, 12, 12, 0.1)",
                      borderRadius: "6px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                    }}
                    data-testid="input-settlement-amount"
                  />
                </div>

                {/* Settlement Date */}
                <div className="mb-4">
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
                    날짜 선택
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        style={{
                          width: "100%",
                          height: "40px",
                          padding: "0 16px",
                          background: "#FFFFFF",
                          border: "1px solid rgba(12, 12, 12, 0.1)",
                          borderRadius: "6px",
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          color: settlementDate ? "#0C0C0C" : "rgba(12, 12, 12, 0.4)",
                          textAlign: "left",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                        data-testid="button-select-settlement-date"
                      >
                        {settlementDate ? format(settlementDate, "PPP", { locale: ko }) : "날짜 선택"}
                        <CalendarIcon size={16} />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={settlementDate}
                        onSelect={setSettlementDate}
                        locale={ko}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Use Today Checkbox */}
                <div className="flex items-center gap-2 mb-4">
                  <Checkbox
                    checked={useTodayDate}
                    onCheckedChange={(checked) => setUseTodayDate(checked === true)}
                    data-testid="checkbox-use-today"
                  />
                  <label
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: "rgba(12, 12, 12, 0.8)",
                      cursor: "pointer",
                    }}
                    onClick={() => setUseTodayDate(!useTodayDate)}
                  >
                    오늘로 설정
                  </label>
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
                    비고(메모)
                  </label>
                  <Textarea
                    value={settlementMemo}
                    onChange={(e) => setSettlementMemo(e.target.value)}
                    placeholder="메모(선택) 내용을 입력하세요"
                    maxLength={400}
                    style={{
                      minHeight: "120px",
                      background: "#FFFFFF",
                      border: "1px solid rgba(12, 12, 12, 0.1)",
                      borderRadius: "6px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      resize: "vertical",
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
                  <Button
                    variant="outline"
                    style={{
                      height: "44px",
                      padding: "0 24px",
                      borderRadius: "8px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                    }}
                    data-testid="button-save-draft"
                  >
                    정산 중 입력 완료
                  </Button>
                  <Button
                    onClick={handleSettlement}
                    style={{
                      height: "44px",
                      padding: "0 32px",
                      background: "#008FED",
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
            </>
          )}
        </div>
      )}
    </div>
  );
}
