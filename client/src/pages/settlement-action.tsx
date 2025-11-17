import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { User, CaseWithLatestProgress } from "@shared/schema";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

export default function SettlementAction() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [settlementAmount, setSettlementAmount] = useState("");
  const [settlementRate, setSettlementRate] = useState("50");
  const [commission, setCommission] = useState("0");
  const [discount, setDiscount] = useState("0");
  const [deductible, setDeductible] = useState("0");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [useTodaySettlement, setUseTodaySettlement] = useState(false);
  const [useTodayInvoice, setUseTodayInvoice] = useState(false);
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
  const claimCases = cases.filter((c) => c.status === "청구");

  // Map real case data to settlement rows
  const settlements = claimCases.map((caseItem) => ({
    id: caseItem.id,
    date: caseItem.createdAt ? format(new Date(caseItem.createdAt), "yyyy-MM-dd") : "-",
    insuranceCompany: caseItem.insuranceCompany || "-",
    insuranceAccidentNo: caseItem.insuranceAccidentNo || "-",
    caseNumber: caseItem.caseNumber,
    contractor: caseItem.policyHolderName || "-",
    assessor: caseItem.assessorId || "-",
    assessmentDate: caseItem.reviewedAt || "-",
    partner: caseItem.assignedPartner || "-",
    refundAmount: caseItem.estimateAmount || "0",
    depositAmount: "0", // TODO: Add deposit tracking
    caseData: caseItem,
  }));

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
      settlementRate: parseFloat(settlementRate) || 0,
      settlementAmount: parseFloat(settlementAmount.replace(/,/g, "")) || 0,
      commission: parseFloat(commission) || 0,
      discount: parseFloat(discount) || 0,
      deductible: parseFloat(deductible) || 0,
      invoiceDate,
      useTodaySettlement,
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
                      minWidth: "80px",
                    }}
                  >
                    담당자
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
                    환급액
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
                    <td colSpan={11} style={{ padding: "40px", textAlign: "center" }}>
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
                    <td colSpan={11} style={{ padding: "40px", textAlign: "center" }}>
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
                        {row.assessmentDate}
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
                        {row.partner}
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
                        {row.refundAmount}
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
                담당자
              </span>
              <span
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "16px",
                  color: "rgba(12, 12, 12, 0.7)",
                }}
              >
                {selectedCase.partner}
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
                    { label: "접수 담당자", value: selectedCase.partner },
                    { label: "담당자", value: selectedCase.assessor },
                    { label: "승인금액", value: selectedCase.refundAmount },
                    { label: "비급액", value: selectedCase.depositAmount },
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
                    청산 상태
                  </div>
                  <div
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "18px",
                      fontWeight: 600,
                      color: "rgba(12, 12, 12, 0.9)",
                    }}
                  >
                    미정산
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
                      color: "#D02B20",
                    }}
                  >
                    2,650,000원
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
                현장사 계좌 정보
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
                    국민은행
                  </div>
                  <div
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "18px",
                      fontWeight: 600,
                      color: "rgba(12, 12, 12, 0.9)",
                    }}
                  >
                    123456-78-987654
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
                    김블락
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
                협력사 이름
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
            <div className="grid grid-cols-2 gap-6 mb-6">
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
                <div className="flex items-center gap-4">
                  <Input
                    type="text"
                    value={settlementAmount}
                    onChange={(e) => setSettlementAmount(e.target.value)}
                    placeholder="2,650,000"
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
                  <Input
                    type="text"
                    placeholder="날짜 선택"
                    style={{
                      flex: 1,
                      height: "44px",
                      background: "#FAFAFA",
                      border: "1px solid rgba(12, 12, 12, 0.1)",
                      borderRadius: "8px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                    }}
                    data-testid="input-settlement-date"
                  />
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={useTodaySettlement}
                      onCheckedChange={(checked) => setUseTodaySettlement(checked === true)}
                      data-testid="checkbox-use-today-settlement"
                    />
                    <label
                      style={{
                        fontFamily: "Pretendard",
                        fontSize: "14px",
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

            {/* Rate Display */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <label
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "rgba(12, 12, 12, 0.7)",
                  }}
                >
                  정률
                </label>
                <Input
                  type="text"
                  value={settlementRate}
                  onChange={(e) => setSettlementRate(e.target.value)}
                  style={{
                    width: "80px",
                    height: "32px",
                    background: "#FAFAFA",
                    border: "1px solid rgba(12, 12, 12, 0.1)",
                    borderRadius: "6px",
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    textAlign: "center",
                  }}
                  data-testid="input-settlement-rate"
                />
              </div>
              <div
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "16px",
                  fontWeight: 600,
                  color: "#008FED",
                }}
              >
                미정산액 2,650,000원
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
