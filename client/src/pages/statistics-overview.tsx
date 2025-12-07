import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { User, Case } from "@shared/schema";
import { Search, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format, startOfMonth, endOfMonth, parseISO, isWithinInterval, isBefore } from "date-fns";
import { ko } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const headerStyle = {
  padding: "12px 8px",
  fontFamily: "Pretendard",
  fontSize: "14px",
  fontWeight: 600,
  lineHeight: "128%",
  letterSpacing: "-0.02em",
  color: "rgba(12, 12, 12, 0.6)",
  borderRight: "1px solid rgba(12, 12, 12, 0.06)",
  borderBottom: "1px solid rgba(12, 12, 12, 0.06)",
  textAlign: "center" as const,
  background: "rgba(12, 12, 12, 0.04)",
};

const cellStyle = {
  padding: "12px 8px",
  fontFamily: "Pretendard",
  fontSize: "14px",
  lineHeight: "128%",
  letterSpacing: "-0.02em",
  color: "rgba(12, 12, 12, 0.8)",
  borderRight: "1px solid rgba(12, 12, 12, 0.06)",
  borderBottom: "1px solid rgba(12, 12, 12, 0.06)",
  textAlign: "center" as const,
};

// 종결 상태 목록
const CLOSED_STATUSES = [
  "정산완료",
  "입금완료",
  "일부입금",
  "접수취소",
];

// 진행과정별 상태 목록 (미결건 분류용)
const PROGRESS_STATUSES = [
  "접수완료",
  "현장방문",
  "현장정보입력",
  "현장정보제출",
  "복구요청",
  "출동비청구",
  "청구",
  "접수취소",
];

// 직접복구 관련 상태 확인
const isDirectRecovery = (caseItem: Case): boolean => {
  return caseItem.recoveryType === "직접복구" || 
         caseItem.status === "직접복구" ||
         caseItem.status === "(직접복구인 경우) 청구자료제출";
};

// 선견적요청 관련 상태 확인
const isPreEstimate = (caseItem: Case): boolean => {
  return caseItem.recoveryType === "선견적요청" || 
         caseItem.status === "선견적요청" ||
         caseItem.status === "(선견적요청인 경우) 출동비 청구";
};

// 종결 상태인지 확인
const isClosed = (caseItem: Case): boolean => {
  return CLOSED_STATUSES.includes(caseItem.status);
};

// 상태 매핑 (DB 상태 -> 표시용 상태)
const mapStatusToProgress = (status: string): string => {
  // 상태를 진행과정별 카테고리에 매핑
  if (status === "접수완료") return "접수완료";
  if (status === "현장방문") return "현장방문";
  if (status === "현장정보입력") return "현장정보입력";
  if (status === "현장정보제출" || status === "검토중" || status === "1차승인") return "현장정보제출";
  if (status === "복구요청(2차승인)" || status === "직접복구") return "복구요청";
  if (status === "선견적요청" || status === "(선견적요청인 경우) 출동비 청구") return "출동비청구";
  if (status === "청구" || status === "(직접복구인 경우) 청구자료제출") return "청구";
  if (status === "접수취소") return "접수취소";
  return "접수완료"; // 기본값
};

export default function StatisticsOverview() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("수임");
  const [activeSubFilter, setActiveSubFilter] = useState("진행과정별");
  
  // 기간 설정 (기본값: 현재 월)
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()));
  const [calendarOpen, setCalendarOpen] = useState(false);

  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  // 케이스 데이터 가져오기
  const { data: cases = [] } = useQuery<Case[]>({
    queryKey: ["/api/cases"],
  });

  // 수임 탭 통계 계산
  const statistics = useMemo(() => {
    if (!cases.length) {
      return {
        이월: { 직접복구: 0, 선견적요청: 0, 계: 0 },
        수임: { 직접복구: 0, 선견적요청: 0, 계: 0 },
        종결: {
          직접복구: { 직접복구: 0, 선견적요청: 0, 접수취소: 0, 소계: 0 },
          선견적요청: { 직접복구: 0, 선견적요청: 0, 접수취소: 0, 소계: 0 },
          합계: { 직접복구: 0, 선견적요청: 0, 접수취소: 0, 소계: 0 },
        },
        처리율: 0,
        미결: { 직접복구: 0, 선견적요청: 0, 계: 0 },
      };
    }

    // 이월(A): 기준일 이전에 생성되었고 미종결인 케이스
    const 이월_직접복구 = cases.filter(c => {
      const createdAt = parseISO(c.createdAt);
      return isBefore(createdAt, startDate) && !isClosed(c) && isDirectRecovery(c);
    }).length;

    const 이월_선견적요청 = cases.filter(c => {
      const createdAt = parseISO(c.createdAt);
      return isBefore(createdAt, startDate) && !isClosed(c) && isPreEstimate(c);
    }).length;

    // 수임(B): 기준일 내 수임받은 케이스 (createdAt 기준)
    const 수임_직접복구 = cases.filter(c => {
      try {
        const createdAt = parseISO(c.createdAt);
        return isWithinInterval(createdAt, { start: startDate, end: endDate }) && isDirectRecovery(c);
      } catch {
        return false;
      }
    }).length;

    const 수임_선견적요청 = cases.filter(c => {
      try {
        const createdAt = parseISO(c.createdAt);
        return isWithinInterval(createdAt, { start: startDate, end: endDate }) && isPreEstimate(c);
      } catch {
        return false;
      }
    }).length;

    // 종결(C): 기준일 내 종결된 케이스
    const closedInPeriod = cases.filter(c => {
      try {
        const createdAt = parseISO(c.createdAt);
        return isClosed(c) && isWithinInterval(createdAt, { start: startDate, end: endDate });
      } catch {
        return false;
      }
    });

    // 종결 > 직접복구 카테고리
    const 종결_직접복구_직접복구 = closedInPeriod.filter(c => 
      isDirectRecovery(c) && c.status === "정산완료"
    ).length;
    const 종결_직접복구_선견적요청 = closedInPeriod.filter(c => 
      isDirectRecovery(c) && (c.status === "입금완료" || c.status === "일부입금")
    ).length;
    const 종결_직접복구_접수취소 = closedInPeriod.filter(c => 
      isDirectRecovery(c) && c.status === "접수취소"
    ).length;

    // 종결 > 선견적요청 카테고리
    const 종결_선견적요청_직접복구 = closedInPeriod.filter(c => 
      isPreEstimate(c) && c.status === "정산완료"
    ).length;
    const 종결_선견적요청_선견적요청 = closedInPeriod.filter(c => 
      isPreEstimate(c) && (c.status === "입금완료" || c.status === "일부입금")
    ).length;
    const 종결_선견적요청_접수취소 = closedInPeriod.filter(c => 
      isPreEstimate(c) && c.status === "접수취소"
    ).length;

    // 소계 계산
    const 종결_직접복구_소계 = 종결_직접복구_직접복구 + 종결_직접복구_선견적요청 + 종결_직접복구_접수취소;
    const 종결_선견적요청_소계 = 종결_선견적요청_직접복구 + 종결_선견적요청_선견적요청 + 종결_선견적요청_접수취소;

    // 합계 계산
    const 종결_합계_직접복구 = 종결_직접복구_직접복구 + 종결_선견적요청_직접복구;
    const 종결_합계_선견적요청 = 종결_직접복구_선견적요청 + 종결_선견적요청_선견적요청;
    const 종결_합계_접수취소 = 종결_직접복구_접수취소 + 종결_선견적요청_접수취소;
    const 종결_합계_소계 = 종결_직접복구_소계 + 종결_선견적요청_소계;

    // 계산
    const 이월_계 = 이월_직접복구 + 이월_선견적요청;
    const 수임_계 = 수임_직접복구 + 수임_선견적요청;
    const 종결_계 = 종결_합계_소계;

    // 미결(D): 기준일 현재 이월+수임-종결
    const 미결_직접복구 = 이월_직접복구 + 수임_직접복구 - 종결_직접복구_소계;
    const 미결_선견적요청 = 이월_선견적요청 + 수임_선견적요청 - 종결_선견적요청_소계;
    const 미결_계 = 미결_직접복구 + 미결_선견적요청;

    // 처리율 계산
    const total = 이월_계 + 수임_계;
    const 처리율 = total > 0 ? Math.round((종결_계 / total) * 100) : 0;

    return {
      이월: { 직접복구: 이월_직접복구, 선견적요청: 이월_선견적요청, 계: 이월_계 },
      수임: { 직접복구: 수임_직접복구, 선견적요청: 수임_선견적요청, 계: 수임_계 },
      종결: {
        직접복구: { 
          직접복구: 종결_직접복구_직접복구, 
          선견적요청: 종결_직접복구_선견적요청, 
          접수취소: 종결_직접복구_접수취소, 
          소계: 종결_직접복구_소계 
        },
        선견적요청: { 
          직접복구: 종결_선견적요청_직접복구, 
          선견적요청: 종결_선견적요청_선견적요청, 
          접수취소: 종결_선견적요청_접수취소, 
          소계: 종결_선견적요청_소계 
        },
        합계: { 
          직접복구: 종결_합계_직접복구, 
          선견적요청: 종결_합계_선견적요청, 
          접수취소: 종결_합계_접수취소, 
          소계: 종결_합계_소계 
        },
      },
      처리율,
      미결: { 직접복구: 미결_직접복구, 선견적요청: 미결_선견적요청, 계: 미결_계 },
    };
  }, [cases, startDate, endDate]);

  // 미결 - 진행과정별 통계 계산
  const progressStatistics = useMemo(() => {
    if (!cases.length) {
      return {
        직접복구: {
          접수완료: 0,
          현장방문: 0,
          현장정보입력: 0,
          현장정보제출: 0,
          복구요청: 0,
          출동비청구: 0,
          청구: 0,
          접수취소: 0,
          계: 0,
        },
        선견적요청: {
          접수완료: 0,
          현장방문: 0,
          현장정보입력: 0,
          현장정보제출: 0,
          복구요청: 0,
          출동비청구: 0,
          청구: 0,
          접수취소: 0,
          계: 0,
        },
        합계: {
          접수완료: 0,
          현장방문: 0,
          현장정보입력: 0,
          현장정보제출: 0,
          복구요청: 0,
          출동비청구: 0,
          청구: 0,
          접수취소: 0,
          계: 0,
        },
      };
    }

    // 미결건: 종결되지 않은 케이스 (기간 내 생성 또는 이월)
    const unsettledCases = cases.filter(c => {
      try {
        const createdAt = parseISO(c.createdAt);
        const isInPeriod = isWithinInterval(createdAt, { start: startDate, end: endDate }) || isBefore(createdAt, startDate);
        return !isClosed(c) && isInPeriod;
      } catch {
        return false;
      }
    });

    // 직접복구 미결건
    const directRecoveryCases = unsettledCases.filter(isDirectRecovery);
    const 직접복구_접수완료 = directRecoveryCases.filter(c => mapStatusToProgress(c.status) === "접수완료").length;
    const 직접복구_현장방문 = directRecoveryCases.filter(c => mapStatusToProgress(c.status) === "현장방문").length;
    const 직접복구_현장정보입력 = directRecoveryCases.filter(c => mapStatusToProgress(c.status) === "현장정보입력").length;
    const 직접복구_현장정보제출 = directRecoveryCases.filter(c => mapStatusToProgress(c.status) === "현장정보제출").length;
    const 직접복구_복구요청 = directRecoveryCases.filter(c => mapStatusToProgress(c.status) === "복구요청").length;
    const 직접복구_출동비청구 = directRecoveryCases.filter(c => mapStatusToProgress(c.status) === "출동비청구").length;
    const 직접복구_청구 = directRecoveryCases.filter(c => mapStatusToProgress(c.status) === "청구").length;
    const 직접복구_접수취소 = directRecoveryCases.filter(c => mapStatusToProgress(c.status) === "접수취소").length;
    const 직접복구_계 = directRecoveryCases.length;

    // 선견적요청 미결건
    const preEstimateCases = unsettledCases.filter(isPreEstimate);
    const 선견적요청_접수완료 = preEstimateCases.filter(c => mapStatusToProgress(c.status) === "접수완료").length;
    const 선견적요청_현장방문 = preEstimateCases.filter(c => mapStatusToProgress(c.status) === "현장방문").length;
    const 선견적요청_현장정보입력 = preEstimateCases.filter(c => mapStatusToProgress(c.status) === "현장정보입력").length;
    const 선견적요청_현장정보제출 = preEstimateCases.filter(c => mapStatusToProgress(c.status) === "현장정보제출").length;
    const 선견적요청_복구요청 = preEstimateCases.filter(c => mapStatusToProgress(c.status) === "복구요청").length;
    const 선견적요청_출동비청구 = preEstimateCases.filter(c => mapStatusToProgress(c.status) === "출동비청구").length;
    const 선견적요청_청구 = preEstimateCases.filter(c => mapStatusToProgress(c.status) === "청구").length;
    const 선견적요청_접수취소 = preEstimateCases.filter(c => mapStatusToProgress(c.status) === "접수취소").length;
    const 선견적요청_계 = preEstimateCases.length;

    return {
      직접복구: {
        접수완료: 직접복구_접수완료,
        현장방문: 직접복구_현장방문,
        현장정보입력: 직접복구_현장정보입력,
        현장정보제출: 직접복구_현장정보제출,
        복구요청: 직접복구_복구요청,
        출동비청구: 직접복구_출동비청구,
        청구: 직접복구_청구,
        접수취소: 직접복구_접수취소,
        계: 직접복구_계,
      },
      선견적요청: {
        접수완료: 선견적요청_접수완료,
        현장방문: 선견적요청_현장방문,
        현장정보입력: 선견적요청_현장정보입력,
        현장정보제출: 선견적요청_현장정보제출,
        복구요청: 선견적요청_복구요청,
        출동비청구: 선견적요청_출동비청구,
        청구: 선견적요청_청구,
        접수취소: 선견적요청_접수취소,
        계: 선견적요청_계,
      },
      합계: {
        접수완료: 직접복구_접수완료 + 선견적요청_접수완료,
        현장방문: 직접복구_현장방문 + 선견적요청_현장방문,
        현장정보입력: 직접복구_현장정보입력 + 선견적요청_현장정보입력,
        현장정보제출: 직접복구_현장정보제출 + 선견적요청_현장정보제출,
        복구요청: 직접복구_복구요청 + 선견적요청_복구요청,
        출동비청구: 직접복구_출동비청구 + 선견적요청_출동비청구,
        청구: 직접복구_청구 + 선견적요청_청구,
        접수취소: 직접복구_접수취소 + 선견적요청_접수취소,
        계: 직접복구_계 + 선견적요청_계,
      },
    };
  }, [cases, startDate, endDate]);

  if (!user) {
    return null;
  }

  const subFiltersMap: Record<string, string[]> = {
    "미결": ["진행과정별", "수리비 금액계층별", "기간별"],
    "직접복구": ["전체", "종결건 진행과정별", "완료건 금액계층별", "평균 수리비 항목별"],
  };
  
  const currentSubFilters = subFiltersMap[activeTab] || [];

  // 기간 텍스트 생성
  const periodText = `${format(startDate, "yyyy.MM.dd")} - ${format(endDate, "yyyy.MM.dd")}`;

  // 수임 테이블 렌더링
  const renderSuimTable = () => (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1800px" }}>
        <thead>
          {/* 1행: 최상위 헤더 */}
          <tr>
            <th rowSpan={3} style={{ ...headerStyle, width: "100px", verticalAlign: "middle" }}>
              구분값
            </th>
            <th colSpan={3} style={headerStyle}>
              이월
            </th>
            <th colSpan={3} style={headerStyle}>
              수임
            </th>
            <th colSpan={12} style={headerStyle}>
              종결
            </th>
            <th rowSpan={3} style={{ ...headerStyle, width: "80px", verticalAlign: "middle" }}>
              처리율
            </th>
            <th colSpan={3} style={headerStyle}>
              미결
            </th>
          </tr>

          {/* 2행: 중간 헤더 */}
          <tr>
            <th rowSpan={2} style={headerStyle}>직접복구</th>
            <th rowSpan={2} style={headerStyle}>선견적요청</th>
            <th rowSpan={2} style={headerStyle}>계</th>
            <th rowSpan={2} style={headerStyle}>직접복구</th>
            <th rowSpan={2} style={headerStyle}>선견적요청</th>
            <th rowSpan={2} style={headerStyle}>계</th>
            <th colSpan={4} style={headerStyle}>직접복구</th>
            <th colSpan={4} style={headerStyle}>선견적요청</th>
            <th colSpan={4} style={headerStyle}>합계</th>
            <th rowSpan={2} style={headerStyle}>직접복구</th>
            <th rowSpan={2} style={headerStyle}>선견적요청</th>
            <th rowSpan={2} style={headerStyle}>계</th>
          </tr>

          {/* 3행: 최하위 헤더 */}
          <tr>
            <th style={headerStyle}>직접복구</th>
            <th style={headerStyle}>선견적요청</th>
            <th style={headerStyle}>접수취소</th>
            <th style={headerStyle}>소계</th>
            <th style={headerStyle}>직접복구</th>
            <th style={headerStyle}>선견적요청</th>
            <th style={headerStyle}>접수취소</th>
            <th style={headerStyle}>소계</th>
            <th style={headerStyle}>직접복구</th>
            <th style={headerStyle}>선견적요청</th>
            <th style={headerStyle}>접수취소</th>
            <th style={headerStyle}>소계</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ ...cellStyle, fontWeight: 600 }}>{format(startDate, "yyyy.MM", { locale: ko })}</td>
            <td style={cellStyle}>{statistics.이월.직접복구}</td>
            <td style={cellStyle}>{statistics.이월.선견적요청}</td>
            <td style={{ ...cellStyle, fontWeight: 600, background: "rgba(0, 143, 237, 0.05)" }}>{statistics.이월.계}</td>
            <td style={cellStyle}>{statistics.수임.직접복구}</td>
            <td style={cellStyle}>{statistics.수임.선견적요청}</td>
            <td style={{ ...cellStyle, fontWeight: 600, background: "rgba(0, 143, 237, 0.05)" }}>{statistics.수임.계}</td>
            <td style={cellStyle}>{statistics.종결.직접복구.직접복구}</td>
            <td style={cellStyle}>{statistics.종결.직접복구.선견적요청}</td>
            <td style={cellStyle}>{statistics.종결.직접복구.접수취소}</td>
            <td style={{ ...cellStyle, fontWeight: 600 }}>{statistics.종결.직접복구.소계}</td>
            <td style={cellStyle}>{statistics.종결.선견적요청.직접복구}</td>
            <td style={cellStyle}>{statistics.종결.선견적요청.선견적요청}</td>
            <td style={cellStyle}>{statistics.종결.선견적요청.접수취소}</td>
            <td style={{ ...cellStyle, fontWeight: 600 }}>{statistics.종결.선견적요청.소계}</td>
            <td style={cellStyle}>{statistics.종결.합계.직접복구}</td>
            <td style={cellStyle}>{statistics.종결.합계.선견적요청}</td>
            <td style={cellStyle}>{statistics.종결.합계.접수취소}</td>
            <td style={{ ...cellStyle, fontWeight: 600, background: "rgba(0, 143, 237, 0.05)" }}>{statistics.종결.합계.소계}</td>
            <td style={{ ...cellStyle, fontWeight: 600, color: "#008FED" }}>{statistics.처리율}%</td>
            <td style={cellStyle}>{statistics.미결.직접복구}</td>
            <td style={cellStyle}>{statistics.미결.선견적요청}</td>
            <td style={{ ...cellStyle, fontWeight: 600, background: "rgba(255, 77, 79, 0.05)", color: "#FF4D4F" }}>{statistics.미결.계}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  // 미결 - 진행과정별 테이블 렌더링
  const renderProgressTable = () => (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1400px" }}>
        <thead>
          {/* 1행: 최상위 헤더 */}
          <tr>
            <th rowSpan={2} style={{ ...headerStyle, width: "100px", verticalAlign: "middle" }}>
              구분값
            </th>
            <th rowSpan={2} style={{ ...headerStyle, width: "100px", verticalAlign: "middle" }}>
              유형값
            </th>
            <th colSpan={9} style={headerStyle}>
              직접복구
            </th>
            <th colSpan={4} style={headerStyle}>
              선견적요청
            </th>
          </tr>

          {/* 2행: 세부 헤더 */}
          <tr>
            {/* 직접복구 하위 */}
            <th style={headerStyle}>접수완료</th>
            <th style={headerStyle}>현장방문</th>
            <th style={headerStyle}>현장정보입력</th>
            <th style={headerStyle}>현장정보제출</th>
            <th style={headerStyle}>복구요청</th>
            <th style={headerStyle}>출동비청구</th>
            <th style={headerStyle}>청구</th>
            <th style={headerStyle}>접수취소</th>
            <th style={{ ...headerStyle, background: "rgba(0, 143, 237, 0.08)" }}>계</th>
            {/* 선견적요청 하위 */}
            <th style={headerStyle}>접수완료</th>
            <th style={headerStyle}>현장방문</th>
            <th style={headerStyle}>현장정보입력</th>
            <th style={{ ...headerStyle, background: "rgba(0, 143, 237, 0.08)" }}>계</th>
          </tr>
        </thead>
        <tbody>
          {/* 데이터 행 */}
          <tr>
            <td style={{ ...cellStyle, fontWeight: 600 }}>{format(startDate, "yyyy.MM", { locale: ko })}</td>
            <td style={cellStyle}>전체</td>
            {/* 직접복구 */}
            <td style={cellStyle}>{progressStatistics.직접복구.접수완료}</td>
            <td style={cellStyle}>{progressStatistics.직접복구.현장방문}</td>
            <td style={cellStyle}>{progressStatistics.직접복구.현장정보입력}</td>
            <td style={cellStyle}>{progressStatistics.직접복구.현장정보제출}</td>
            <td style={cellStyle}>{progressStatistics.직접복구.복구요청}</td>
            <td style={cellStyle}>{progressStatistics.직접복구.출동비청구}</td>
            <td style={cellStyle}>{progressStatistics.직접복구.청구}</td>
            <td style={cellStyle}>{progressStatistics.직접복구.접수취소}</td>
            <td style={{ ...cellStyle, fontWeight: 600, background: "rgba(0, 143, 237, 0.05)" }}>{progressStatistics.직접복구.계}</td>
            {/* 선견적요청 */}
            <td style={cellStyle}>{progressStatistics.선견적요청.접수완료}</td>
            <td style={cellStyle}>{progressStatistics.선견적요청.현장방문}</td>
            <td style={cellStyle}>{progressStatistics.선견적요청.현장정보입력}</td>
            <td style={{ ...cellStyle, fontWeight: 600, background: "rgba(0, 143, 237, 0.05)" }}>{progressStatistics.선견적요청.계}</td>
          </tr>
          {/* 합계 행 */}
          <tr style={{ background: "rgba(12, 12, 12, 0.02)" }}>
            <td style={{ ...cellStyle, fontWeight: 600 }}>합계</td>
            <td style={cellStyle}>-</td>
            {/* 직접복구 합계 */}
            <td style={{ ...cellStyle, fontWeight: 600 }}>{progressStatistics.합계.접수완료}</td>
            <td style={{ ...cellStyle, fontWeight: 600 }}>{progressStatistics.합계.현장방문}</td>
            <td style={{ ...cellStyle, fontWeight: 600 }}>{progressStatistics.합계.현장정보입력}</td>
            <td style={{ ...cellStyle, fontWeight: 600 }}>{progressStatistics.합계.현장정보제출}</td>
            <td style={{ ...cellStyle, fontWeight: 600 }}>{progressStatistics.합계.복구요청}</td>
            <td style={{ ...cellStyle, fontWeight: 600 }}>{progressStatistics.합계.출동비청구}</td>
            <td style={{ ...cellStyle, fontWeight: 600 }}>{progressStatistics.합계.청구}</td>
            <td style={{ ...cellStyle, fontWeight: 600 }}>{progressStatistics.합계.접수취소}</td>
            <td style={{ ...cellStyle, fontWeight: 700, background: "rgba(0, 143, 237, 0.08)", color: "#008FED" }}>{progressStatistics.합계.계}</td>
            {/* 선견적요청 합계 */}
            <td style={{ ...cellStyle, fontWeight: 600 }}>{progressStatistics.선견적요청.접수완료}</td>
            <td style={{ ...cellStyle, fontWeight: 600 }}>{progressStatistics.선견적요청.현장방문}</td>
            <td style={{ ...cellStyle, fontWeight: 600 }}>{progressStatistics.선견적요청.현장정보입력}</td>
            <td style={{ ...cellStyle, fontWeight: 700, background: "rgba(0, 143, 237, 0.08)", color: "#008FED" }}>{progressStatistics.선견적요청.계}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  // 현재 탭에 따른 테이블 렌더링
  const renderTable = () => {
    if (activeTab === "수임") {
      return renderSuimTable();
    }
    if (activeTab === "미결" && activeSubFilter === "진행과정별") {
      return renderProgressTable();
    }
    // 다른 탭들은 기본 빈 테이블
    return (
      <div className="p-8 text-center" style={{ color: "rgba(12, 12, 12, 0.5)" }}>
        해당 탭의 데이터를 준비 중입니다.
      </div>
    );
  };

  return (
    <div className="p-8">
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
          통계
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

      <div className="mb-6">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2"
              size={20}
              style={{ color: "rgba(12, 12, 12, 0.4)" }}
            />
            <Input
              type="text"
              placeholder="검색어를 입력해주세요"
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
              data-testid="input-search-statistics"
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
            data-testid="button-search-statistics"
          >
            검색
          </Button>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                style={{
                  height: "40px",
                  padding: "0 16px",
                  background: "#FFFFFF",
                  border: "1px solid rgba(12, 12, 12, 0.2)",
                  borderRadius: "8px",
                  fontFamily: "Pretendard",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "rgba(12, 12, 12, 0.7)",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
                data-testid="button-add-period"
              >
                <CalendarIcon size={16} style={{ color: "rgba(12, 12, 12, 0.5)" }} />
                기간추가
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <div className="p-4">
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">시작일</label>
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => date && setStartDate(date)}
                    locale={ko}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">종료일</label>
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => date && setEndDate(date)}
                    locale={ko}
                  />
                </div>
                <Button 
                  className="w-full mt-4"
                  onClick={() => setCalendarOpen(false)}
                >
                  적용
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <div
            style={{
              width: "1px",
              height: "24px",
              background: "rgba(12, 12, 12, 0.1)",
            }}
          />

          <div className="flex items-center gap-2">
            {["수임", "미결", "직접복구", "출동비 청구", "사고확인"].map((tab) => {
              const hasSubFilters = subFiltersMap[tab];
              const isActive = activeTab === tab;
              const showBorder = hasSubFilters && isActive;
              
              return (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    if (subFiltersMap[tab]) {
                      setActiveSubFilter(subFiltersMap[tab][0]);
                    }
                  }}
                  style={{
                    height: "40px",
                    padding: "0 20px",
                    background: isActive ? "#FFFFFF" : "transparent",
                    border: isActive ? "1px solid rgba(12, 12, 12, 0.2)" : "none",
                    borderRadius: "8px",
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: isActive ? "#008FED" : "rgba(12, 12, 12, 0.5)",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  data-testid={`tab-${tab}`}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          {/* 서브 필터 표시 (미결, 직접복구) */}
          {currentSubFilters.length > 0 && (
            <>
              <div
                style={{
                  width: "1px",
                  height: "24px",
                  background: "rgba(12, 12, 12, 0.1)",
                }}
              />
              <div className="flex items-center gap-2">
                {currentSubFilters.map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setActiveSubFilter(filter)}
                    style={{
                      height: "40px",
                      padding: "0 20px",
                      background: activeSubFilter === filter ? "#FFFFFF" : "transparent",
                      border: activeSubFilter === filter ? "1px solid rgba(12, 12, 12, 0.2)" : "none",
                      borderRadius: "8px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: activeSubFilter === filter ? "#0C0C0C" : "rgba(12, 12, 12, 0.5)",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                    data-testid={`subfilter-${filter}`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div
        className="mb-4"
        style={{
          fontFamily: "Pretendard",
          fontSize: "14px",
          fontWeight: 500,
          color: "rgba(12, 12, 12, 0.6)",
        }}
      >
        총 {cases.length}건의 통계
      </div>

      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "12px",
          border: "1px solid rgba(12, 12, 12, 0.06)",
          overflow: "hidden",
        }}
      >
        {renderTable()}
      </div>
    </div>
  );
}
