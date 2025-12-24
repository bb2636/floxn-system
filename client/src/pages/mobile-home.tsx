import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { User, Case } from "@shared/schema";
import { ChevronDown, Calendar, AlertCircle, Wallet } from "lucide-react";
import { GlobalHeader } from "@/components/global-header";
import { startOfMonth, endOfMonth, subMonths, isWithinInterval, parseISO } from "date-fns";

type TabType = '전체' | '미결' | '미정산' | '일부정산';

export default function MobileHome() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<TabType>('미정산');

  useEffect(() => {
    const setVh = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    setVh();
    window.addEventListener('resize', setVh);
    return () => window.removeEventListener('resize', setVh);
  }, []);

  const { data: user, isLoading: userLoading } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  const { data: allCases = [], isLoading: casesLoading } = useQuery<Case[]>({
    queryKey: ["/api/cases"],
    enabled: !!user,
  });

  const { data: allUsers = [] } = useQuery<Omit<User, "password">[]>({
    queryKey: ["/api/users"],
    enabled: !!user,
  });

  const thisMonthRange = useMemo(() => ({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  }), []);

  const lastMonthRange = useMemo(() => ({
    from: startOfMonth(subMonths(new Date(), 1)),
    to: endOfMonth(subMonths(new Date(), 1)),
  }), []);

  const thisMonthCases = useMemo(() => {
    return allCases.filter(c => {
      if (c.status === '작성중' || !c.accidentDate) return false;
      try {
        const caseDate = parseISO(c.accidentDate);
        return isWithinInterval(caseDate, { start: thisMonthRange.from, end: thisMonthRange.to });
      } catch {
        return false;
      }
    });
  }, [allCases, thisMonthRange]);

  const lastMonthCases = useMemo(() => {
    return allCases.filter(c => {
      if (c.status === '작성중' || !c.accidentDate) return false;
      try {
        const caseDate = parseISO(c.accidentDate);
        return isWithinInterval(caseDate, { start: lastMonthRange.from, end: lastMonthRange.to });
      } catch {
        return false;
      }
    });
  }, [allCases, lastMonthRange]);

  const stats = useMemo(() => {
    const receptionCount = thisMonthCases.length;
    const lastMonthReceptionCount = lastMonthCases.length;
    const changePercent = lastMonthReceptionCount > 0 
      ? ((receptionCount - lastMonthReceptionCount) / lastMonthReceptionCount * 100).toFixed(1)
      : '0';
    
    const pendingCount = thisMonthCases.filter(c => 
      c.status === '제출' || c.status === '검토중' || c.status === '1차승인'
    ).length;

    const unsettledCount = thisMonthCases.filter(c => c.status === '완료').length;

    return {
      receptionCount,
      pendingCount,
      unsettledCount,
      changePercent,
      isIncrease: receptionCount >= lastMonthReceptionCount,
    };
  }, [thisMonthCases, lastMonthCases]);

  const filteredCasesByTab = useMemo(() => {
    switch (activeTab) {
      case '전체':
        return thisMonthCases;
      case '미결':
        return thisMonthCases.filter(c => 
          c.status === '제출' || c.status === '검토중' || c.status === '1차승인'
        );
      case '미정산':
        return thisMonthCases.filter(c => c.status === '완료');
      case '일부정산':
        return thisMonthCases.filter(c => c.status === '완료');
      default:
        return thisMonthCases;
    }
  }, [thisMonthCases, activeTab]);

  const staffSummary = useMemo(() => {
    const userCaseCounts = new Map<string, { name: string; count: number; amount: number }>();

    filteredCasesByTab.forEach(c => {
      const assignedToId = c.assignedTo || 'unassigned';
      const existing = userCaseCounts.get(assignedToId);
      const parseAmount = (val: string | null | undefined) => {
        if (!val) return 0;
        const cleaned = val.replace(/,/g, '');
        const num = Number(cleaned);
        return isNaN(num) ? 0 : num;
      };
      const caseAmount = parseAmount(c.approvedAmount) || parseAmount(c.estimateAmount);

      if (existing) {
        existing.count++;
        existing.amount += caseAmount;
      } else {
        const assignedUser = allUsers.find(u => u.id === assignedToId);
        userCaseCounts.set(assignedToId, {
          name: assignedUser ? assignedUser.name : '미배정',
          count: 1,
          amount: caseAmount,
        });
      }
    });

    return Array.from(userCaseCounts.values()).sort((a, b) => b.count - a.count);
  }, [filteredCasesByTab, allUsers]);

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('ko-KR') + ' 원';
  };

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch("/api/check-session");
        const data = await response.json();
        if (!data.authenticated) {
          setLocation("/mobile-login");
        }
      } catch (error) {
        console.error("Session check failed:", error);
        setLocation("/mobile-login");
      }
    };

    checkSession();
  }, [setLocation]);

  if (userLoading || casesLoading) {
    return (
      <div 
        className="relative w-full bg-white flex items-center justify-center"
        style={{ minHeight: 'calc(var(--vh, 1vh) * 100)' }}
      >
        <div className="animate-pulse text-gray-400">로딩 중...</div>
      </div>
    );
  }

  const tabs: TabType[] = ['전체', '미결', '미정산', '일부정산'];

  return (
    <div 
      className="relative w-full bg-white"
      style={{ minHeight: 'calc(var(--vh, 1vh) * 100)' }}
    >
      <GlobalHeader />

      <div className="flex flex-col">
        <div
          className="flex flex-col items-center px-5 pt-4"
          style={{ gap: '16px' }}
        >
          <div
            style={{
              width: '335px',
              height: '51px',
              background: '#FDFDFD',
              boxShadow: '12px 12px 24px rgba(0, 0, 0, 0.06)',
              backdropFilter: 'blur(7px)',
              borderRadius: '14px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
            data-testid="card-user-profile"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  fontFamily: 'Pretendard',
                  fontWeight: 600,
                  fontSize: '15px',
                  lineHeight: '128%',
                  letterSpacing: '-0.02em',
                  color: '#0C0C0C',
                }}
                data-testid="text-user-name"
              >
                {user?.name || '사용자'}
              </span>
              <span
                style={{
                  fontFamily: 'Pretendard',
                  fontWeight: 400,
                  fontSize: '13px',
                  lineHeight: '128%',
                  letterSpacing: '-0.01em',
                  color: '#008FED',
                }}
                data-testid="text-user-company"
              >
                {user?.company || '플록슨'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col mt-4">
          <div
            className="flex items-center px-5"
            style={{
              height: '55px',
            }}
          >
            <span
              style={{
                fontFamily: 'Pretendard',
                fontWeight: 600,
                fontSize: '18px',
                lineHeight: '128%',
                letterSpacing: '-0.02em',
                color: '#0C0C0C',
              }}
              data-testid="text-reception-title"
            >
              접수 현황
            </span>
          </div>

          <div
            className="flex items-center px-5"
            style={{
              height: '39px',
              gap: '8px',
            }}
          >
            <span
              style={{
                fontFamily: 'Pretendard',
                fontWeight: 600,
                fontSize: '15px',
                lineHeight: '128%',
                letterSpacing: '-0.02em',
                color: 'rgba(12, 12, 12, 0.9)',
              }}
            >
              이번 달
            </span>
            <ChevronDown 
              style={{ width: '18px', height: '18px', color: 'rgba(12, 12, 12, 0.6)' }}
            />
          </div>

          <div className="flex flex-col px-4" style={{ gap: '12px' }}>
            <div
              className="flex justify-between items-center"
              style={{ padding: '12px 0', height: '46px' }}
            >
              <div className="flex items-center" style={{ gap: '8px' }}>
                <Calendar style={{ width: '22px', height: '22px', color: 'rgba(12, 12, 12, 0.3)' }} />
                <span
                  style={{
                    fontFamily: 'Pretendard',
                    fontWeight: 500,
                    fontSize: '16px',
                    lineHeight: '128%',
                    letterSpacing: '-0.02em',
                    color: 'rgba(12, 12, 12, 0.8)',
                  }}
                >
                  접수
                </span>
              </div>
              <span
                style={{
                  fontFamily: 'Pretendard',
                  fontWeight: 600,
                  fontSize: '16px',
                  lineHeight: '128%',
                  letterSpacing: '-0.02em',
                  color: '#0C0C0C',
                }}
                data-testid="text-reception-count"
              >
                {stats.receptionCount.toString().padStart(3, '0')}
              </span>
            </div>

            <div
              className="flex justify-center items-center"
              style={{
                height: '42px',
                background: 'rgba(12, 12, 12, 0.05)',
                borderRadius: '8px',
                padding: '12px 10px',
              }}
            >
              <span
                style={{
                  fontFamily: 'Pretendard',
                  fontWeight: 400,
                  fontSize: '14px',
                  lineHeight: '128%',
                  letterSpacing: '-0.01em',
                  color: 'rgba(12, 12, 12, 0.7)',
                }}
                data-testid="text-reception-change"
              >
                접수건이 지난 달보다 {stats.changePercent}% {stats.isIncrease ? '늘었어요' : '줄었어요'}
              </span>
            </div>

            <div
              className="flex justify-between items-center"
              style={{ padding: '12px 0', height: '46px' }}
            >
              <div className="flex items-center" style={{ gap: '8px' }}>
                <AlertCircle style={{ width: '22px', height: '22px', color: 'rgba(12, 12, 12, 0.3)' }} />
                <span
                  style={{
                    fontFamily: 'Pretendard',
                    fontWeight: 500,
                    fontSize: '16px',
                    lineHeight: '128%',
                    letterSpacing: '-0.02em',
                    color: 'rgba(12, 12, 12, 0.8)',
                  }}
                >
                  미결건
                </span>
              </div>
              <span
                style={{
                  fontFamily: 'Pretendard',
                  fontWeight: 600,
                  fontSize: '16px',
                  lineHeight: '128%',
                  letterSpacing: '-0.02em',
                  color: '#0C0C0C',
                }}
                data-testid="text-pending-count"
              >
                {stats.pendingCount.toString().padStart(3, '0')}
              </span>
            </div>

            <div
              className="flex justify-between items-center"
              style={{ padding: '12px 0', height: '46px' }}
            >
              <div className="flex items-center" style={{ gap: '8px' }}>
                <Wallet style={{ width: '22px', height: '22px', color: 'rgba(12, 12, 12, 0.3)' }} />
                <span
                  style={{
                    fontFamily: 'Pretendard',
                    fontWeight: 500,
                    fontSize: '16px',
                    lineHeight: '128%',
                    letterSpacing: '-0.02em',
                    color: 'rgba(12, 12, 12, 0.8)',
                  }}
                >
                  미정산
                </span>
              </div>
              <span
                style={{
                  fontFamily: 'Pretendard',
                  fontWeight: 600,
                  fontSize: '16px',
                  lineHeight: '128%',
                  letterSpacing: '-0.02em',
                  color: '#0C0C0C',
                }}
                data-testid="text-unsettled-count"
              >
                {stats.unsettledCount.toString().padStart(3, '0')}
              </span>
            </div>
          </div>
        </div>

        <div
          style={{
            width: '100%',
            height: '8px',
            background: 'rgba(12, 12, 12, 0.06)',
            marginTop: '16px',
          }}
        />

        <div className="flex flex-col">
          <div
            className="flex items-center px-5"
            style={{
              height: '55px',
            }}
          >
            <span
              style={{
                fontFamily: 'Pretendard',
                fontWeight: 600,
                fontSize: '18px',
                lineHeight: '128%',
                letterSpacing: '-0.02em',
                color: 'rgba(12, 12, 12, 0.9)',
              }}
              data-testid="text-manager-summary-title"
            >
              담당자 요약
            </span>
          </div>

          <div
            className="flex items-center px-5"
            style={{
              height: '39px',
              gap: '8px',
            }}
          >
            <span
              style={{
                fontFamily: 'Pretendard',
                fontWeight: 600,
                fontSize: '15px',
                lineHeight: '128%',
                letterSpacing: '-0.02em',
                color: 'rgba(12, 12, 12, 0.8)',
              }}
            >
              이번 달
            </span>
            <ChevronDown 
              style={{ width: '18px', height: '18px', color: 'rgba(12, 12, 12, 0.6)' }}
            />
          </div>

          <div
            className="flex items-center"
            style={{
              height: '40px',
              filter: 'drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.02))',
            }}
          >
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="flex-1 flex justify-center items-center"
                style={{
                  height: '40px',
                  borderBottom: activeTab === tab ? '2px solid #008FED' : 'none',
                  fontFamily: 'Pretendard',
                  fontWeight: activeTab === tab ? 600 : 400,
                  fontSize: '14px',
                  lineHeight: '128%',
                  letterSpacing: '-0.01em',
                  color: activeTab === tab ? '#0C0C0C' : 'rgba(12, 12, 12, 0.5)',
                }}
                data-testid={`tab-${tab}`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div
            className="flex items-center px-4"
            style={{
              height: '39px',
              background: 'rgba(12, 12, 12, 0.04)',
              borderRadius: '8px',
            }}
          >
            <div className="flex items-center" style={{ width: '126px' }}>
              <span
                style={{
                  fontFamily: 'Pretendard',
                  fontWeight: 500,
                  fontSize: '15px',
                  lineHeight: '128%',
                  letterSpacing: '-0.01em',
                  color: 'rgba(12, 12, 12, 0.6)',
                }}
              >
                성함
              </span>
            </div>
            <div className="flex-1 flex items-center">
              <span
                style={{
                  fontFamily: 'Pretendard',
                  fontWeight: 500,
                  fontSize: '15px',
                  lineHeight: '128%',
                  letterSpacing: '-0.01em',
                  color: 'rgba(12, 12, 12, 0.6)',
                }}
              >
                건 수
              </span>
            </div>
          </div>

          <div
            className="flex flex-col"
            style={{
              borderRadius: '12px',
              padding: '8px 0',
            }}
          >
            {staffSummary.length === 0 ? (
              <div
                className="flex items-center justify-center px-4"
                style={{ height: '52px' }}
              >
                <span
                  style={{
                    fontFamily: 'Pretendard',
                    fontWeight: 400,
                    fontSize: '14px',
                    color: 'rgba(12, 12, 12, 0.5)',
                  }}
                >
                  데이터가 없습니다
                </span>
              </div>
            ) : (
              staffSummary.map((staff, index) => (
                <div
                  key={index}
                  className="flex items-center px-4"
                  style={{ height: '52px' }}
                  data-testid={`staff-row-${index}`}
                >
                  <div className="flex items-center" style={{ width: '126px' }}>
                    <span
                      style={{
                        fontFamily: 'Pretendard',
                        fontWeight: 500,
                        fontSize: '14px',
                        lineHeight: '128%',
                        letterSpacing: '-0.01em',
                        color: '#0C0C0C',
                      }}
                    >
                      {staff.name}
                    </span>
                  </div>
                  <div className="flex-1 flex items-center" style={{ gap: '6px' }}>
                    <span
                      style={{
                        fontFamily: 'Pretendard',
                        fontWeight: 500,
                        fontSize: '14px',
                        lineHeight: '128%',
                        letterSpacing: '-0.01em',
                        color: '#0C0C0C',
                      }}
                    >
                      {staff.count}건
                    </span>
                    <span
                      style={{
                        fontFamily: 'Pretendard',
                        fontWeight: 400,
                        fontSize: '13px',
                        lineHeight: '128%',
                        letterSpacing: '-0.01em',
                        color: 'rgba(12, 12, 12, 0.5)',
                      }}
                    >
                      {formatAmount(staff.amount)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
