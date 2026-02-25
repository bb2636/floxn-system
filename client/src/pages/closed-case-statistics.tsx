import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { User, Case, Settlement } from "@shared/schema";
import { Search, Calendar as CalendarIcon, ChevronRight, Star, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { format, startOfMonth, endOfMonth, parseISO, isWithinInterval } from "date-fns";
import { ko } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const CLOSED_STATUSES = ["정산완료", "입금완료", "부분입금", "접수취소"];

const isClosed = (c: Case): boolean => CLOSED_STATUSES.includes(c.status);

const getClosedDate = (c: Case, settlement?: Settlement): string | null => {
  if (c.status === "정산완료") {
    return settlement?.settlementDate || c.settlementCompletedDate || null;
  }
  if (c.status === "입금완료") {
    return c.paymentCompletedDate || null;
  }
  if (c.status === "부분입금") {
    return c.partialPaymentDate || null;
  }
  if (c.status === "접수취소") {
    // 접수취소 전용 날짜 필드 없으므로 최종 수정일(상태 변경 시점) 사용
    return c.updatedAt || c.createdAt || null;
  }
  return c.settlementCompletedDate || c.paymentCompletedDate || c.partialPaymentDate || null;
};

const getClaimAmount = (c: Case): number => {
  if (c.recoveryType === "직접복구" || c.restorationMethod === "직접복구" || c.status === "직접복구" || c.status === "청구자료제출(복구)") {
    const prevention = parseFloat(c.invoiceDamagePreventionAmount || "0") || 0;
    const property = parseFloat(c.invoicePropertyRepairAmount || "0") || 0;
    return prevention + property;
  }
  return parseFloat(c.fieldDispatchInvoiceAmount || "0") || 0;
};

const formatAmount = (amount: number): string => {
  if (!amount) return "-";
  return amount.toLocaleString("ko-KR") + "원";
};

const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return "-";
  try {
    const d = parseISO(dateStr);
    return format(d, "yyyy.MM.dd");
  } catch {
    return dateStr;
  }
};

const headerStyle: React.CSSProperties = {
  padding: "12px 8px",
  fontFamily: "Pretendard",
  fontSize: "14px",
  fontWeight: 600,
  lineHeight: "128%",
  letterSpacing: "-0.02em",
  color: "rgba(12, 12, 12, 0.6)",
  borderRight: "1px solid rgba(12, 12, 12, 0.06)",
  borderBottom: "1px solid rgba(12, 12, 12, 0.06)",
  textAlign: "center",
  background: "rgba(12, 12, 12, 0.04)",
  whiteSpace: "nowrap",
};

const cellStyle: React.CSSProperties = {
  padding: "10px 8px",
  fontFamily: "Pretendard",
  fontSize: "13px",
  lineHeight: "128%",
  letterSpacing: "-0.02em",
  color: "rgba(12, 12, 12, 0.8)",
  borderRight: "1px solid rgba(12, 12, 12, 0.06)",
  borderBottom: "1px solid rgba(12, 12, 12, 0.06)",
  textAlign: "center",
  whiteSpace: "nowrap",
};

export default function ClosedCaseStatistics() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<"사고번호" | "접수번호">("사고번호");
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()));
  const [startCalendarOpen, setStartCalendarOpen] = useState(false);

  const { data: cases = [] } = useQuery<Case[]>({
    queryKey: ["/api/cases"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users/basic"],
  });

  const { data: settlements = [] } = useQuery<Settlement[]>({
    queryKey: ["/api/settlements"],
  });

  const settlementMap = useMemo(() => {
    const map: Record<string, Settlement> = {};
    settlements.forEach((s) => {
      map[s.caseId] = s;
    });
    return map;
  }, [settlements]);

  const userMap = useMemo(() => {
    const map: Record<string, User> = {};
    users.forEach((u) => {
      map[u.id] = u;
    });
    return map;
  }, [users]);

  const filteredCases = useMemo(() => {
    let result = cases.filter((c) => {
      if (!isClosed(c)) return false;

      const settlement = settlementMap[c.id];
      const closedDate = getClosedDate(c, settlement);
      if (!closedDate) return false;

      try {
        const d = parseISO(closedDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (!isWithinInterval(d, { start: startDate, end })) return false;
      } catch {
        return false;
      }

      return true;
    });

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((c) => {
        if (searchType === "사고번호") {
          return (c.insuranceAccidentNo || "").toLowerCase().includes(q);
        } else {
          return (c.caseNumber || "").toLowerCase().includes(q);
        }
      });
    }

    return result;
  }, [cases, settlementMap, startDate, endDate, searchQuery, searchType]);

  const getManagerName = (c: Case): string => {
    if (c.managerId && userMap[c.managerId]) {
      return userMap[c.managerId].name;
    }
    if ((c as any).managerName) return (c as any).managerName;
    return "-";
  };

  const getDepositInfo = (c: Case): { amount: number; date: string } => {
    const settlement = settlementMap[c.id];
    if (settlement?.depositEntries && settlement.depositEntries.length > 0) {
      const totalDeposit = settlement.depositEntries.reduce((sum, entry) => sum + (entry.depositAmount || 0), 0);
      const validDates = settlement.depositEntries
        .map((e) => e.depositDate)
        .filter(Boolean);
      let latestDate = "-";
      if (validDates.length > 0) {
        latestDate = validDates.sort((a, b) => {
          try {
            return parseISO(a).getTime() - parseISO(b).getTime();
          } catch {
            return a.localeCompare(b);
          }
        }).pop() || "-";
      }
      return { amount: totalDeposit, date: latestDate };
    }
    return { amount: 0, date: "-" };
  };

  const handleExcelDownload = () => {
    const headers = [
      "보험사", "사고번호",
      ...(searchType === "접수번호" ? ["접수번호"] : []),
      "플록슨 담당자", "접수 일자",
      "의뢰사", "의뢰자", "심사사", "심사자",
      "조사사", "조사자", "협력사", "담당자", "배당일자",
      "사고유형", "사고원인", "복구방식", "진행상태",
      "견적금액", "견적일자", "승인금액", "승인일자",
      ...(searchType !== "접수번호" ? ["청구액", "청구일자", "입금액", "입금일자", "정산액(협력업체 지급일)", "수수료", "정산일자"] : []),
    ];

    const rows = filteredCases.map((c) => {
      const deposit = getDepositInfo(c);
      const settlement = settlementMap[c.id];
      return [
        c.insuranceCompany || "",
        c.insuranceAccidentNo || "",
        ...(searchType === "접수번호" ? [c.caseNumber || ""] : []),
        getManagerName(c),
        formatDate(c.createdAt),
        c.clientResidence || "",
        c.clientName || "",
        c.assessorId || "",
        c.assessorTeam || "",
        c.investigatorTeam || "",
        c.investigatorTeamName || "",
        c.assignedPartner || "",
        c.assignedPartnerManager || "",
        formatDate(c.assignmentDate),
        c.accidentType || "",
        c.accidentCause || "",
        c.restorationMethod || c.recoveryType || "",
        c.status,
        c.estimateAmount ? parseFloat(c.estimateAmount).toLocaleString() : "",
        formatDate(c.siteInvestigationSubmitDate),
        c.approvedAmount ? parseFloat(c.approvedAmount).toLocaleString() : "",
        formatDate(c.approvalDate),
        ...(searchType !== "접수번호" ? [
          getClaimAmount(c) ? getClaimAmount(c).toLocaleString() : "",
          formatDate(c.claimDate),
          deposit.amount ? deposit.amount.toLocaleString() : "",
          formatDate(deposit.date),
          settlement?.partnerPaymentAmount ? `${parseFloat(settlement.partnerPaymentAmount).toLocaleString()} (${formatDate(settlement.partnerPaymentDate)})` : "",
          settlement?.commission ? parseFloat(settlement.commission).toLocaleString() : "",
          formatDate(settlement?.settlementDate),
        ] : []),
      ];
    });

    const csvContent = [headers.join(","), ...rows.map((r) => r.map((v) => `"${v}"`).join(","))].join("\n");
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `종결건_통계_${format(new Date(), "yyyyMMdd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: "24px", fontFamily: "Pretendard" }}>
      <div className="flex items-center gap-2 mb-6" style={{ fontSize: "18px", fontWeight: 600, color: "rgba(12, 12, 12, 0.8)" }}>
        <span style={{ color: "rgba(12, 12, 12, 0.5)" }}>통계</span>
        <ChevronRight size={16} style={{ color: "rgba(12, 12, 12, 0.3)" }} />
        <span>종결건 통계</span>
        <Star size={16} style={{ color: "rgba(12, 12, 12, 0.2)", marginLeft: "8px" }} />
      </div>
      <div className="flex items-center gap-2 mb-3" style={{ maxWidth: "540px" }}>
        <div className="relative flex-1">
          <Search size={16} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "rgba(12, 12, 12, 0.3)" }} />
          <Input
            placeholder="검색어를 입력해주세요"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
              }
            }}
            className="w-full"
            style={{
              paddingLeft: "40px",
              height: "48px",
              borderRadius: "10px",
              border: "1px solid rgba(12, 12, 12, 0.1)",
              fontFamily: "Pretendard",
              fontSize: "15px",
              background: "#FFFFFF",
            }}
            data-testid="input-statistics-search"
          />
        </div>
        <Button
          style={{
            height: "48px",
            padding: "0 28px",
            background: "#008FED",
            color: "#FFFFFF",
            borderRadius: "10px",
            fontFamily: "Pretendard",
            fontSize: "15px",
            fontWeight: 600,
          }}
          data-testid="button-statistics-search"
        >
          검색
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span style={{ fontSize: "14px", fontWeight: 600, color: "rgba(12, 12, 12, 0.6)", whiteSpace: "nowrap", fontFamily: "Pretendard" }}>
            종결기간 :
          </span>
          <Popover open={startCalendarOpen} onOpenChange={setStartCalendarOpen}>
            <PopoverTrigger asChild>
              <button
                className="flex items-center gap-2"
                style={{
                  height: "36px",
                  padding: "0 12px",
                  border: "1px solid rgba(12, 12, 12, 0.1)",
                  borderRadius: "6px",
                  background: "#FFFFFF",
                  fontSize: "13px",
                  fontFamily: "Pretendard",
                  color: "rgba(12, 12, 12, 0.7)",
                  cursor: "pointer",
                }}
                data-testid="button-start-date"
              >
                <CalendarIcon size={14} style={{ color: "rgba(12, 12, 12, 0.4)" }} />
                {format(startDate, "yyyy.MM.dd")} - {format(endDate, "yyyy.MM.dd")}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <div className="flex gap-0">
                <div>
                  <div style={{ padding: "8px 12px", fontSize: "12px", fontWeight: 600, color: "rgba(12,12,12,0.5)", fontFamily: "Pretendard", borderBottom: "1px solid rgba(12,12,12,0.06)" }}>시작일</div>
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => {
                      if (date) {
                        setStartDate(date);
                        if (date > endDate) setEndDate(date);
                      }
                    }}
                    locale={ko}
                  />
                </div>
                <div style={{ borderLeft: "1px solid rgba(12,12,12,0.06)" }}>
                  <div style={{ padding: "8px 12px", fontSize: "12px", fontWeight: 600, color: "rgba(12,12,12,0.5)", fontFamily: "Pretendard", borderBottom: "1px solid rgba(12,12,12,0.06)" }}>종료일</div>
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => {
                      if (date) {
                        setEndDate(date);
                        if (date < startDate) setStartDate(date);
                        setStartCalendarOpen(false);
                      }
                    }}
                    locale={ko}
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div style={{ width: "1px", height: "24px", background: "rgba(12, 12, 12, 0.1)" }} />

        <div className="flex items-center" style={{ borderRadius: "8px", overflow: "hidden", border: "1px solid rgba(12, 12, 12, 0.1)" }}>
          <button
            onClick={() => setSearchType("사고번호")}
            style={{
              height: "36px",
              padding: "0 16px",
              background: searchType === "사고번호" ? "#008FED" : "#FFFFFF",
              color: searchType === "사고번호" ? "#FFFFFF" : "rgba(12, 12, 12, 0.5)",
              fontSize: "13px",
              fontWeight: 600,
              fontFamily: "Pretendard",
              border: "none",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            data-testid="toggle-accident-number"
          >
            사고번호
          </button>
          <button
            onClick={() => setSearchType("접수번호")}
            style={{
              height: "36px",
              padding: "0 16px",
              background: searchType === "접수번호" ? "#008FED" : "#FFFFFF",
              color: searchType === "접수번호" ? "#FFFFFF" : "rgba(12, 12, 12, 0.5)",
              fontSize: "13px",
              fontWeight: 600,
              fontFamily: "Pretendard",
              border: "none",
              borderLeft: "1px solid rgba(12, 12, 12, 0.1)",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            data-testid="toggle-receipt-number"
          >
            접수번호
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between mb-3">
        <div style={{ fontSize: "14px", fontWeight: 500, color: "rgba(12, 12, 12, 0.6)", fontFamily: "Pretendard" }}>
          총 <span style={{ fontWeight: 700, color: "rgba(12, 12, 12, 0.8)" }}>{filteredCases.length}</span>개의 통계
        </div>
        <Button
          variant="outline"
          onClick={handleExcelDownload}
          className="flex items-center gap-2"
          style={{
            height: "36px",
            borderRadius: "8px",
            fontSize: "13px",
            fontFamily: "Pretendard",
            fontWeight: 500,
            color: "rgba(12, 12, 12, 0.7)",
            border: "1px solid rgba(12, 12, 12, 0.12)",
          }}
          data-testid="button-excel-download"
        >
          <Download size={14} />
          엑셀 다운로드
        </Button>
      </div>
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "12px",
          border: "1px solid rgba(12, 12, 12, 0.06)",
          overflow: "auto",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "3500px" }}>
          <thead>
            <tr>
              <th colSpan={2} style={{ ...headerStyle, borderBottom: "1px solid rgba(12, 12, 12, 0.06)" }}>보험사</th>
              <th colSpan={searchType === "접수번호" ? 3 : 2} style={{ ...headerStyle, borderBottom: "1px solid rgba(12, 12, 12, 0.06)" }}>플록슨</th>
              <th colSpan={2} style={{ ...headerStyle, borderBottom: "1px solid rgba(12, 12, 12, 0.06)" }}>의뢰사</th>
              <th colSpan={2} style={{ ...headerStyle, borderBottom: "1px solid rgba(12, 12, 12, 0.06)" }}>심사사</th>
              <th colSpan={2} style={{ ...headerStyle, borderBottom: "1px solid rgba(12, 12, 12, 0.06)" }}>조사사</th>
              <th colSpan={3} style={{ ...headerStyle, borderBottom: "1px solid rgba(12, 12, 12, 0.06)" }}>협력사</th>
              <th rowSpan={2} style={{ ...headerStyle, width: "100px" }}>사고 유형</th>
              <th rowSpan={2} style={{ ...headerStyle, width: "100px" }}>사고 원인</th>
              <th rowSpan={2} style={{ ...headerStyle, width: "100px" }}>복구 방식</th>
              <th rowSpan={2} style={{ ...headerStyle, width: "120px" }}>진행 상태</th>
              <th colSpan={2} style={{ ...headerStyle, borderBottom: "1px solid rgba(12, 12, 12, 0.06)" }}>견적금액</th>
              <th colSpan={2} style={{ ...headerStyle, borderBottom: "1px solid rgba(12, 12, 12, 0.06)", ...(searchType === "접수번호" ? { borderRight: "none" } : {}) }}>승인금액</th>
              {searchType !== "접수번호" && (
                <>
                  <th colSpan={2} style={{ ...headerStyle, borderBottom: "1px solid rgba(12, 12, 12, 0.06)" }}>청구액</th>
                  <th colSpan={2} style={{ ...headerStyle, borderBottom: "1px solid rgba(12, 12, 12, 0.06)" }}>입금액</th>
                  <th colSpan={3} style={{ ...headerStyle, borderBottom: "1px solid rgba(12, 12, 12, 0.06)", borderRight: "none" }}>정산</th>
                </>
              )}
            </tr>
            <tr>
              <th style={{ ...headerStyle, width: "120px" }}>보험사</th>
              <th style={{ ...headerStyle, width: "140px" }}>사고번호</th>
              {searchType === "접수번호" && (
                <th style={{ ...headerStyle, width: "140px" }}>접수번호</th>
              )}
              <th style={{ ...headerStyle, width: "80px" }}>담당자</th>
              <th style={{ ...headerStyle, width: "110px" }}>최초 접수 일자</th>
              <th style={{ ...headerStyle, width: "100px" }}>의뢰사</th>
              <th style={{ ...headerStyle, width: "80px" }}>의뢰자</th>
              <th style={{ ...headerStyle, width: "100px" }}>심사사</th>
              <th style={{ ...headerStyle, width: "80px" }}>심사자</th>
              <th style={{ ...headerStyle, width: "100px" }}>조사사</th>
              <th style={{ ...headerStyle, width: "80px" }}>조사자</th>
              <th style={{ ...headerStyle, width: "100px" }}>협력사</th>
              <th style={{ ...headerStyle, width: "80px" }}>담당자</th>
              <th style={{ ...headerStyle, width: "110px" }}>배당일자</th>
              <th style={{ ...headerStyle, width: "120px" }}>견적금액</th>
              <th style={{ ...headerStyle, width: "110px" }}>견적일자</th>
              <th style={{ ...headerStyle, width: "120px" }}>승인금액</th>
              <th style={{ ...headerStyle, width: "110px", ...(searchType === "접수번호" ? { borderRight: "none" } : {}) }}>승인일자</th>
              {searchType !== "접수번호" && (
                <>
                  <th style={{ ...headerStyle, width: "120px" }}>청구액</th>
                  <th style={{ ...headerStyle, width: "110px" }}>청구일자</th>
                  <th style={{ ...headerStyle, width: "120px" }}>입금액</th>
                  <th style={{ ...headerStyle, width: "110px" }}>입금일자</th>
                  <th style={{ ...headerStyle, width: "140px" }}>정산액{"\n"}(협력업체 지급일)</th>
                  <th style={{ ...headerStyle, width: "120px" }}>수수료</th>
                  <th style={{ ...headerStyle, width: "110px", borderRight: "none" }}>정산일자</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {filteredCases.length === 0 ? (
              <tr>
                <td
                  colSpan={searchType === "접수번호" ? 22 : 28}
                  style={{
                    padding: "60px 20px",
                    textAlign: "center",
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    color: "rgba(12, 12, 12, 0.4)",
                  }}
                >
                  해당 기간의 종결건이 없습니다.
                </td>
              </tr>
            ) : (
              filteredCases.map((c) => {
                const deposit = getDepositInfo(c);
                const settlement = settlementMap[c.id];
                const estimateAmt = parseFloat(c.estimateAmount || "0") || 0;
                const approvedAmt = parseFloat(c.approvedAmount || "0") || 0;
                const claimAmt = getClaimAmount(c);

                return (
                  <tr key={c.id} data-testid={`row-case-${c.id}`}>
                    <td style={cellStyle}>{c.insuranceCompany || "-"}</td>
                    <td style={{ ...cellStyle, fontSize: "12px" }}>{c.insuranceAccidentNo || "-"}</td>
                    {searchType === "접수번호" && (
                      <td style={{ ...cellStyle, fontSize: "12px" }}>{c.caseNumber || "-"}</td>
                    )}
                    <td style={cellStyle}>{getManagerName(c)}</td>
                    <td style={cellStyle}>{formatDate(c.createdAt)}</td>
                    <td style={cellStyle}>{c.clientResidence || "-"}</td>
                    <td style={cellStyle}>{c.clientName || "-"}</td>
                    <td style={cellStyle}>{c.assessorId || "-"}</td>
                    <td style={cellStyle}>{c.assessorTeam || "-"}</td>
                    <td style={cellStyle}>{c.investigatorTeam || "-"}</td>
                    <td style={cellStyle}>{c.investigatorTeamName || "-"}</td>
                    <td style={cellStyle}>{c.assignedPartner || "-"}</td>
                    <td style={cellStyle}>{c.assignedPartnerManager || "-"}</td>
                    <td style={cellStyle}>{formatDate(c.assignmentDate)}</td>
                    <td style={cellStyle}>{c.accidentType || "-"}</td>
                    <td style={cellStyle}>{c.accidentCause || "-"}</td>
                    <td style={cellStyle}>{c.restorationMethod || c.recoveryType || "-"}</td>
                    <td style={{ ...cellStyle, fontWeight: 500 }}>{c.status}</td>
                    <td style={{ ...cellStyle, textAlign: "right" }}>{formatAmount(estimateAmt)}</td>
                    <td style={cellStyle}>{formatDate(c.siteInvestigationSubmitDate)}</td>
                    <td style={{ ...cellStyle, textAlign: "right" }}>{formatAmount(approvedAmt)}</td>
                    <td style={{ ...cellStyle, ...(searchType === "접수번호" ? { borderRight: "none" } : {}) }}>{formatDate(c.approvalDate)}</td>
                    {searchType !== "접수번호" && (
                      <>
                        <td style={{ ...cellStyle, textAlign: "right" }}>{formatAmount(claimAmt)}</td>
                        <td style={cellStyle}>{formatDate(c.claimDate)}</td>
                        <td style={{ ...cellStyle, textAlign: "right" }}>{formatAmount(deposit.amount)}</td>
                        <td style={cellStyle}>{formatDate(deposit.date)}</td>
                        <td style={{ ...cellStyle, textAlign: "right" }}>
                          {formatAmount(parseFloat(settlement?.partnerPaymentAmount || "0") || 0)}
                          {settlement?.partnerPaymentDate ? <div style={{ fontSize: "11px", color: "rgba(12,12,12,0.4)", marginTop: "2px" }}>({formatDate(settlement.partnerPaymentDate)})</div> : null}
                        </td>
                        <td style={{ ...cellStyle, textAlign: "right" }}>{formatAmount(parseFloat(settlement?.commission || "0") || 0)}</td>
                        <td style={{ ...cellStyle, borderRight: "none" }}>{formatDate(settlement?.settlementDate)}</td>
                      </>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
