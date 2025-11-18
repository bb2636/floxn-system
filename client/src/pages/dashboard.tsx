import { useEffect, useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { User, Case, type UserFavorite, type Notice } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Home, Star, LogOut, CalendarPlus, AlertCircle, Building2, Handshake, TrendingUp, TrendingDown, Calendar, ChevronDown, ChevronRight, X } from "lucide-react";
import logoIcon from "@assets/Vector_1762589710900.png";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format, startOfMonth, endOfMonth, startOfToday, subMonths, endOfToday, isWithinInterval, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { GlobalHeader } from "@/components/global-header";

type PeriodType = 'all' | 'today' | 'thisMonth' | 'lastMonth' | 'custom';
type StaffTabType = 'reception' | 'pending' | 'insurance' | 'partner';

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<'reception' | 'pending' | 'insurance' | 'partner'>('reception');
  const { toast } = useToast();
  const [activeMenu, setActiveMenu] = useState("홈");
  
  const [periodType, setPeriodType] = useState<PeriodType>('thisMonth');
  const [isPeriodSheetOpen, setIsPeriodSheetOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  // Fetch dashboard statistics
  const { data: stats, isLoading: statsLoading } = useQuery<{
    receivedCases: number;
    lastMonthReceivedCases: number;
    receivedCasesChange: number;
    receivedCasesChangeCount: number;
    pendingCases: number;
    lastMonthPendingCases: number;
    pendingCasesChange: number;
    pendingCasesChangeCount: number;
    insuranceUnsettledCases: number;
    insuranceUnsettledAmount: number;
    partnerUnsettledCases: number;
    partnerUnsettledAmount: number;
  }>({
    queryKey: ["/api/dashboard/stats"],
    enabled: !!user, // Only fetch stats when user is loaded
  });

  // Fetch all cases for progress summary
  const { data: allCases, isLoading: casesLoading } = useQuery<Case[]>({
    queryKey: ["/api/cases"],
    enabled: !!user,
  });

  // Fetch user favorites
  const { data: userFavorites = [] } = useQuery<UserFavorite[]>({
    queryKey: ["/api/favorites"],
    enabled: !!user,
  });

  // Fetch notices (only for 협력사)
  const { data: notices = [] } = useQuery<Notice[]>({
    queryKey: ["/api/notices"],
    enabled: !!user && user.role === "협력사",
  });

  const removeFavoriteMutation = useMutation({
    mutationFn: async (menuName: string) => {
      await apiRequest("DELETE", `/api/favorites/${encodeURIComponent(menuName)}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
    },
    onError: () => {
      toast({
        title: "즐겨찾기 해제 실패",
        description: "다시 시도해주세요.",
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/logout", {});
    },
    onSuccess: () => {
      queryClient.clear();
      localStorage.removeItem("rememberMe");
      
      toast({
        title: "로그아웃 완료",
        description: "안전하게 로그아웃되었습니다.",
      });

      setTimeout(() => {
        setLocation("/");
      }, 500);
    },
  });

  // Filter cases by period - exclude 작성중 globally
  const filteredCasesByPeriod = useMemo(() => {
    if (!allCases) return [];
    
    // Globally exclude 작성중 status
    const activeCases = allCases.filter(c => c.status !== '작성중');
    
    if (periodType === 'all') return activeCases;
    if (!dateRange?.from || !dateRange?.to) return activeCases;

    return activeCases.filter(c => {
      if (!c.accidentDate) return false;
      try {
        const caseDate = parseISO(c.accidentDate);
        return isWithinInterval(caseDate, { start: dateRange.from!, end: dateRange.to! });
      } catch {
        return false;
      }
    });
  }, [allCases, periodType, dateRange]);

  // Filter cases by tab
  const filteredCasesByTab = useMemo(() => {
    if (!filteredCasesByPeriod) return [];

    switch (activeTab) {
      case 'reception':
        // 접수된 케이스 (all active cases)
        return filteredCasesByPeriod;
      case 'pending':
        // 미결 케이스 (제출, 검토중, 1차승인)
        return filteredCasesByPeriod.filter(c => 
          c.status === '제출' || c.status === '검토중' || c.status === '1차승인'
        );
      case 'insurance':
        // 보험사 미정산 케이스 (완료된 케이스)
        return filteredCasesByPeriod.filter(c => c.status === '완료');
      case 'partner':
        // 협력사 미정산 케이스 (완료된 케이스)
        return filteredCasesByPeriod.filter(c => c.status === '완료');
      default:
        return filteredCasesByPeriod;
    }
  }, [filteredCasesByPeriod, activeTab]);

  // Aggregate cases by assigned user
  const staffSummary = useMemo(() => {
    if (!filteredCasesByTab || !user) return [];

    const userCaseCounts = new Map<string, { name: string; position: string; count: number }>();

    filteredCasesByTab.forEach(c => {
      const assignedTo = c.assignedTo || '미배정';

      const existing = userCaseCounts.get(assignedTo);
      if (existing) {
        existing.count++;
      } else {
        userCaseCounts.set(assignedTo, {
          name: assignedTo,
          position: '직원',
          count: 1,
        });
      }
    });

    return Array.from(userCaseCounts.values()).sort((a, b) => b.count - a.count);
  }, [filteredCasesByTab, user]);

  // Filter cases assigned to current user for "내 작업" section
  const myTasks = useMemo(() => {
    if (!allCases || !user) return [];
    
    console.log('내 작업 필터링:', {
      userId: user.id,
      username: user.username,
      totalCases: allCases.length,
      casesWithAssignedTo: allCases.filter(c => c.assignedTo).length,
      myAssignedCases: allCases.filter(c => c.assignedTo === user.id).length,
      allCasesAssignedTo: allCases.map(c => ({ caseNumber: c.caseNumber, assignedTo: c.assignedTo }))
    });
    
    // Get cases assigned to current user, sorted by updatedAt (most recent first)
    return allCases
      .filter(c => c.assignedTo === user.id)
      .sort((a, b) => {
        const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return dateB - dateA; // Most recent first
      })
      .slice(0, 4); // Show only 4 most recent tasks
  }, [allCases, user]);

  // Get status color based on case status
  const getStatusColor = (status: string) => {
    switch (status) {
      case '작성중':
        return '#0C95F6'; // Blue
      case '제출':
        return '#4CCBA0'; // Green
      case '검토중':
        return '#FFA500'; // Orange
      case '1차승인':
        return '#9C27B0'; // Purple
      case '완료':
        return '#4CAF50'; // Green
      default:
        return '#808080'; // Gray
    }
  };

  // Calculate time ago from updatedAt
  const getTimeAgo = (updatedAt: string | null) => {
    if (!updatedAt) return '업데이트 시간 없음';
    
    const now = new Date();
    const updated = new Date(updatedAt);
    const diffMs = now.getTime() - updated.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) {
      return `업데이트 ${diffMins}분 전`;
    } else if (diffHours < 24) {
      return `업데이트 ${diffHours}시간 전`;
    } else {
      return `업데이트 ${diffDays}일 전`;
    }
  };

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">로딩 중...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const menuItems = [
    { name: "홈", active: true },
    { name: "접수하기", active: false },
    { name: "현장조사", active: false },
    { name: "종합진행관리", active: false },
    { name: "통계 및 정산", active: false },
    { name: "관리자 설정", active: false },
  ];

  const inquiries = [
    { title: "정산 반영 지연 문의", status: "처리중" },
    { title: "서류 양식 요청", status: "답변완료" },
  ];

  const handleRemoveFavorite = (menuName: string) => {
    removeFavoriteMutation.mutate(menuName);
    toast({
      title: "즐겨찾기 해제",
      description: `"${menuName}"이(가) 즐겨찾기에서 제거되었습니다.`,
    });
  };

  const getMenuIcon = (menuName: string) => {
    switch (menuName) {
      case "홈":
        return <Home className="w-4 h-4" />;
      case "접수하기":
        return <CalendarPlus className="w-4 h-4" />;
      case "현장조사":
        return <AlertCircle className="w-4 h-4" />;
      case "종합진행관리":
        return <Building2 className="w-4 h-4" />;
      case "통계 및 정산":
        return <TrendingUp className="w-4 h-4" />;
      case "관리자 설정":
        return <Star className="w-4 h-4" />;
      default:
        return <Star className="w-4 h-4" />;
    }
  };

  const handleFavoriteClick = (menuName: string) => {
    switch (menuName) {
      case "홈":
        setLocation("/dashboard");
        break;
      case "접수하기":
        setLocation("/intake");
        break;
      case "현장조사":
        setLocation("/field-survey/management");
        break;
      case "종합진행관리":
        setLocation("/comprehensive-progress");
        break;
      case "통계 및 정산":
        setLocation("/statistics");
        break;
      case "관리자 설정":
        setLocation("/admin-settings");
        break;
    }
  };


  const getPeriodLabel = () => {
    switch (periodType) {
      case 'all':
        return '전체';
      case 'today':
        return '오늘';
      case 'thisMonth':
        return '이번 달';
      case 'lastMonth':
        return '지난 달';
      case 'custom':
        if (dateRange?.from && dateRange?.to) {
          return `${format(dateRange.from, 'M/d', { locale: ko })} - ${format(dateRange.to, 'M/d', { locale: ko })}`;
        }
        return '날짜 선택';
      default:
        return '이번 달';
    }
  };

  const handlePeriodSelect = (type: PeriodType) => {
    setPeriodType(type);
    
    const today = startOfToday();
    const lastMonth = subMonths(today, 1);
    
    switch (type) {
      case 'all':
        setDateRange(undefined);
        setIsPeriodSheetOpen(false);
        break;
      case 'today':
        setDateRange({ from: today, to: endOfToday() });
        setIsPeriodSheetOpen(false);
        break;
      case 'thisMonth':
        setDateRange({ from: startOfMonth(today), to: endOfMonth(today) });
        setIsPeriodSheetOpen(false);
        break;
      case 'lastMonth':
        setDateRange({ from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) });
        setIsPeriodSheetOpen(false);
        break;
      case 'custom':
        setIsPeriodSheetOpen(false);
        setIsCalendarOpen(true);
        break;
    }
  };

  const handleCalendarApply = () => {
    if (dateRange?.from && dateRange?.to) {
      setPeriodType('custom');
      setIsCalendarOpen(false);
      toast({
        title: "기간 설정 완료",
        description: `${format(dateRange.from, 'yyyy-MM-dd')} ~ ${format(dateRange.to, 'yyyy-MM-dd')}`,
      });
    }
  };

  return (
    <div className="relative min-h-screen" style={{ background: '#E7EDFE' }}>
      {/* Blur Background Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute"
          style={{
            width: '1095px',
            height: '777px',
            left: '97px',
            bottom: '-200px',
            background: 'rgba(254, 240, 230, 0.4)',
            borderRadius: '9999px',
            filter: 'blur(212px)',
            transform: 'rotate(-35.25deg)',
          }}
        />
        <div 
          className="absolute"
          style={{
            width: '1335px',
            height: '1323px',
            left: '811px',
            bottom: '0px',
            background: 'rgba(234, 230, 254, 0.5)',
            borderRadius: '9999px',
            filter: 'blur(212px)',
          }}
        />
        <div 
          className="absolute"
          style={{
            width: '348px',
            height: '1323px',
            left: '0px',
            bottom: '189px',
            background: 'rgba(234, 230, 254, 0.5)',
            borderRadius: '9999px',
            filter: 'blur(212px)',
          }}
        />
      </div>

      <GlobalHeader />

      {/* Main Content */}
      <div className="relative flex flex-col lg:flex-row min-h-[calc(100vh-58px)] lg:min-h-[calc(100vh-89px)] overflow-y-auto">
        {/* Main Section */}
        <div className="flex-1 px-4 md:px-8 lg:px-12 xl:px-[92px] py-6">
          
          {/* Mobile Profile Card - Only visible on mobile */}
          <div 
            className="lg:hidden flex flex-col items-start mb-5"
            style={{
              width: '100%',
              maxWidth: '335px',
              margin: '0 auto 20px',
              padding: '0px 0px 24px',
              background: '#FDFDFD',
              boxShadow: '12px 12px 24px rgba(0, 0, 0, 0.06)',
              backdropFilter: 'blur(7px)',
              borderRadius: '14px',
            }}
            data-testid="mobile-profile-card"
          >
            {/* Header */}
            <div className="flex justify-between items-center w-full" style={{ padding: '24px 20px' }}>
              <span style={{
                fontFamily: 'Pretendard',
                fontSize: '14px',
                fontWeight: 600,
                lineHeight: '128%',
                letterSpacing: '-0.01em',
                color: 'rgba(12, 12, 12, 0.8)',
              }}>
                내 프로필
              </span>
              <span style={{
                fontFamily: 'Pretendard',
                fontSize: '14px',
                fontWeight: 600,
                lineHeight: '128%',
                letterSpacing: '-0.01em',
                color: 'rgba(0, 143, 237, 0.8)',
              }}>
                관리자
              </span>
            </div>
            
            {/* Profile Info */}
            <div className="flex flex-col justify-center items-center w-full" style={{ gap: '8px' }}>
              <div className="flex items-center" style={{ gap: '10px' }}>
                {/* Avatar */}
                <div 
                  className="flex items-center justify-center"
                  style={{
                    width: '58px',
                    height: '58px',
                    background: 'rgba(0, 143, 237, 0.1)',
                    borderRadius: '50px',
                  }}
                >
                  <span style={{
                    fontFamily: 'Pretendard',
                    fontSize: '20px',
                    fontWeight: 600,
                    color: '#008FED',
                  }}>
                    {user.name?.charAt(0) || user.username?.charAt(0) || 'U'}
                  </span>
                </div>
                
                {/* Name and Email */}
                <div className="flex flex-col items-center" style={{ gap: '2px' }}>
                  <div className="flex items-center" style={{ gap: '2px' }}>
                    <span style={{
                      fontFamily: 'Pretendard',
                      fontSize: '15px',
                      fontWeight: 600,
                      lineHeight: '128%',
                      letterSpacing: '-0.02em',
                      color: '#0C0C0C',
                    }}>
                      {user.name || user.username}
                    </span>
                    <span style={{
                      fontFamily: 'Pretendard',
                      fontSize: '13px',
                      fontWeight: 400,
                      lineHeight: '128%',
                      letterSpacing: '-0.01em',
                      color: 'rgba(12, 12, 12, 0.9)',
                    }}>
                      {user.position || '사원'}
                    </span>
                  </div>
                  <span style={{
                    fontFamily: 'Pretendard',
                    fontSize: '14px',
                    fontWeight: 400,
                    lineHeight: '128%',
                    letterSpacing: '-0.01em',
                    color: 'rgba(12, 12, 12, 0.7)',
                  }}>
                    {user.email || 'xblock@gmail.com'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Header - Only visible on desktop */}
          <div className="hidden lg:flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <h1 
              style={{
                fontFamily: 'Pretendard',
                fontSize: '20px',
                fontWeight: 600,
                letterSpacing: '-0.02em',
                color: '#0C0C0C',
              }}
            >
              현황 요약
            </h1>
            <button 
              onClick={() => setIsPeriodSheetOpen(true)}
              className="flex items-center justify-between"
              style={{
                width: '128px',
                height: '44px',
                padding: '10px 8px',
                gap: '8px',
                background: '#FFFFFF',
                border: '1px solid rgba(12, 12, 12, 0.3)',
                borderRadius: '8px',
              }}
              data-testid="button-period-selector"
            >
              <div className="flex items-center gap-2">
                <Calendar 
                  style={{ 
                    width: '22px', 
                    height: '22px', 
                    color: '#008FED' 
                  }} 
                />
                <span 
                  style={{
                    fontFamily: 'Pretendard',
                    fontSize: '16px',
                    fontWeight: 500,
                    lineHeight: '128%',
                    letterSpacing: '-0.02em',
                    color: 'rgba(12, 12, 12, 0.9)',
                  }}
                >
                  {getPeriodLabel()}
                </span>
              </div>
              <ChevronDown 
                style={{ 
                  width: '24px', 
                  height: '24px', 
                  color: 'rgba(12, 12, 12, 0.6)' 
                }} 
              />
            </button>
          </div>
          
          {/* Mobile Header - Only visible on mobile */}
          <div className="lg:hidden flex flex-col items-start mb-3" style={{ maxWidth: '375px', margin: '0 auto' }}>
            <div className="flex items-center w-full" style={{ padding: '16px 0px' }}>
              <span style={{
                fontFamily: 'Pretendard',
                fontSize: '18px',
                fontWeight: 600,
                lineHeight: '128%',
                letterSpacing: '-0.02em',
                color: 'rgba(12, 12, 12, 0.9)',
              }}>
                현황 요약
              </span>
            </div>
            <div className="flex items-center w-full" style={{ padding: '10px 0px' }}>
              <button 
                onClick={() => setIsPeriodSheetOpen(true)}
                className="flex items-center" 
                style={{ gap: '8px' }}
                data-testid="button-mobile-period-selector"
              >
                <span style={{
                  fontFamily: 'Pretendard',
                  fontSize: '15px',
                  fontWeight: 600,
                  lineHeight: '128%',
                  letterSpacing: '-0.02em',
                  color: 'rgba(12, 12, 12, 0.8)',
                }}>
                  {getPeriodLabel()}
                </span>
                <ChevronDown 
                  style={{ 
                    width: '18px', 
                    height: '18px', 
                    color: 'rgba(12, 12, 12, 0.6)' 
                  }} 
                />
              </button>
            </div>
          </div>

          {/* Mobile Stats Cards - Simplified version */}
          <div className="lg:hidden flex flex-col items-center" style={{ gap: '12px', maxWidth: '335px', margin: '0 auto' }}>
            {statsLoading ? (
              <div className="text-center py-4">로딩 중...</div>
            ) : stats ? (
              <>
                {/* 접수건 */}
                <div className="flex flex-col items-start" style={{ gap: '4px', width: '100%' }}>
                  <span style={{
                    fontFamily: 'Pretendard',
                    fontSize: '14px',
                    fontWeight: 500,
                    lineHeight: '128%',
                    letterSpacing: '-0.01em',
                    color: 'rgba(12, 12, 12, 0.5)',
                  }}>
                    접수건
                  </span>
                  <div className="flex flex-col" style={{ gap: '4px', width: '100%' }}>
                    <div className="flex items-center" style={{ gap: '8px' }}>
                      <span style={{
                        fontFamily: 'Pretendard',
                        fontSize: '26px',
                        fontWeight: 600,
                        lineHeight: '128%',
                        letterSpacing: '-0.02em',
                        color: 'rgba(12, 12, 12, 0.9)',
                      }}>
                        {stats.receivedCases}건
                      </span>
                    </div>
                    {/* 전월 대비 변화 표시 */}
                    <div className="flex items-center gap-1">
                      {stats.receivedCasesChange > 0 ? (
                        <>
                          <TrendingUp style={{ width: '12px', height: '12px', color: '#007AFF' }} />
                          <span
                            style={{
                              fontFamily: 'Pretendard',
                              fontSize: '11px',
                              fontWeight: 500,
                              lineHeight: '128%',
                              color: '#007AFF',
                            }}
                          >
                            {stats.receivedCasesChange > 0 ? '+' : ''}{stats.receivedCasesChange.toFixed(1)}% ({stats.receivedCasesChangeCount > 0 ? '+' : ''}{stats.receivedCasesChangeCount}건)
                          </span>
                        </>
                      ) : stats.receivedCasesChange < 0 ? (
                        <>
                          <TrendingDown style={{ width: '12px', height: '12px', color: '#FF3B30' }} />
                          <span
                            style={{
                              fontFamily: 'Pretendard',
                              fontSize: '11px',
                              fontWeight: 500,
                              lineHeight: '128%',
                              color: '#FF3B30',
                            }}
                          >
                            {stats.receivedCasesChange.toFixed(1)}% ({stats.receivedCasesChangeCount}건)
                          </span>
                        </>
                      ) : (
                        <span
                          style={{
                            fontFamily: 'Pretendard',
                            fontSize: '11px',
                            fontWeight: 500,
                            lineHeight: '128%',
                            color: 'rgba(12, 12, 12, 0.5)',
                          }}
                        >
                          변화 없음
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 미결건 */}
                <div className="flex flex-col items-start" style={{ gap: '4px', width: '100%' }}>
                  <span style={{
                    fontFamily: 'Pretendard',
                    fontSize: '14px',
                    fontWeight: 500,
                    lineHeight: '128%',
                    letterSpacing: '-0.01em',
                    color: 'rgba(12, 12, 12, 0.5)',
                  }}>
                    미결건
                  </span>
                  <div className="flex flex-col" style={{ gap: '4px', width: '100%' }}>
                    <div className="flex items-center" style={{ gap: '8px' }}>
                      <span style={{
                        fontFamily: 'Pretendard',
                        fontSize: '26px',
                        fontWeight: 600,
                        lineHeight: '128%',
                        letterSpacing: '-0.02em',
                        color: 'rgba(12, 12, 12, 0.9)',
                      }}>
                        {stats.pendingCases}건
                      </span>
                    </div>
                    {/* 전월 대비 변화 표시 */}
                    <div className="flex items-center gap-1">
                      {stats.pendingCasesChange > 0 ? (
                        <>
                          <TrendingUp style={{ width: '12px', height: '12px', color: '#007AFF' }} />
                          <span
                            style={{
                              fontFamily: 'Pretendard',
                              fontSize: '11px',
                              fontWeight: 500,
                              lineHeight: '128%',
                              color: '#007AFF',
                            }}
                          >
                            {stats.pendingCasesChange > 0 ? '+' : ''}{stats.pendingCasesChange.toFixed(1)}% ({stats.pendingCasesChangeCount > 0 ? '+' : ''}{stats.pendingCasesChangeCount}건)
                          </span>
                        </>
                      ) : stats.pendingCasesChange < 0 ? (
                        <>
                          <TrendingDown style={{ width: '12px', height: '12px', color: '#FF3B30' }} />
                          <span
                            style={{
                              fontFamily: 'Pretendard',
                              fontSize: '11px',
                              fontWeight: 500,
                              lineHeight: '128%',
                              color: '#FF3B30',
                            }}
                          >
                            {stats.pendingCasesChange.toFixed(1)}% ({stats.pendingCasesChangeCount}건)
                          </span>
                        </>
                      ) : (
                        <span
                          style={{
                            fontFamily: 'Pretendard',
                            fontSize: '11px',
                            fontWeight: 500,
                            lineHeight: '128%',
                            color: 'rgba(12, 12, 12, 0.5)',
                          }}
                        >
                          변화 없음
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 보험사 미정산 - 심사사/조사사/보험사/관리자만 표시 */}
                {user.role !== "협력사" && (
                  <div className="flex flex-col items-start" style={{ gap: '4px', width: '100%' }}>
                    <span style={{
                      fontFamily: 'Pretendard',
                      fontSize: '14px',
                      fontWeight: 500,
                      lineHeight: '128%',
                      letterSpacing: '-0.01em',
                      color: 'rgba(12, 12, 12, 0.5)',
                    }}>
                      {user.role === "관리자" ? "보험사 미정산" : "미정산"}
                    </span>
                    <div className="flex items-center" style={{ gap: '8px' }}>
                      <span style={{
                        fontFamily: 'Pretendard',
                        fontSize: '26px',
                        fontWeight: 600,
                        lineHeight: '128%',
                        letterSpacing: '-0.02em',
                        color: 'rgba(12, 12, 12, 0.9)',
                      }}>
                        {stats.insuranceUnsettledCases}건
                      </span>
                      <span style={{
                        fontFamily: 'Pretendard',
                        fontSize: '16px',
                        fontWeight: 400,
                        lineHeight: '128%',
                        letterSpacing: '-0.02em',
                        color: 'rgba(12, 12, 12, 0.7)',
                      }}>
                        {stats.insuranceUnsettledAmount.toLocaleString('ko-KR')}원
                      </span>
                    </div>
                  </div>
                )}

                {/* 협력사 미정산 - 협력사/관리자만 표시 */}
                {(user.role === "협력사" || user.role === "관리자") && (
                  <div className="flex flex-col items-start" style={{ gap: '4px', width: '100%' }}>
                    <span style={{
                      fontFamily: 'Pretendard',
                      fontSize: '14px',
                      fontWeight: 500,
                      lineHeight: '128%',
                      letterSpacing: '-0.01em',
                      color: 'rgba(12, 12, 12, 0.5)',
                    }}>
                      {user.role === "협력사" ? "미정산" : "협력사 미정산"}
                    </span>
                    <div className="flex items-center" style={{ gap: '8px' }}>
                      <span style={{
                        fontFamily: 'Pretendard',
                        fontSize: '26px',
                        fontWeight: 600,
                        lineHeight: '128%',
                        letterSpacing: '-0.02em',
                        color: 'rgba(12, 12, 12, 0.9)',
                      }}>
                        {stats.partnerUnsettledCases}건
                      </span>
                      <span style={{
                        fontFamily: 'Pretendard',
                        fontSize: '16px',
                        fontWeight: 400,
                        lineHeight: '128%',
                        letterSpacing: '-0.02em',
                        color: 'rgba(12, 12, 12, 0.7)',
                      }}>
                        {stats.partnerUnsettledAmount.toLocaleString('ko-KR')}원
                      </span>
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>

          {/* Separator for mobile */}
          <div className="lg:hidden w-full" style={{ height: '14px', background: 'rgba(12, 12, 12, 0.06)', margin: '20px 0' }} />

          {/* Mobile: 담당자 요약 Section */}
          <div className="lg:hidden flex flex-col items-center" style={{ gap: '16px', paddingBottom: '32px' }}>
            {/* Header */}
            <div className="flex flex-col items-start w-full" style={{ maxWidth: '375px', margin: '0 auto' }}>
              <div className="flex items-center w-full" style={{ padding: '16px 0px' }}>
                <span style={{
                  fontFamily: 'Pretendard',
                  fontSize: '18px',
                  fontWeight: 600,
                  lineHeight: '128%',
                  letterSpacing: '-0.02em',
                  color: 'rgba(12, 12, 12, 0.9)',
                }}>
                  담당자 요약
                </span>
              </div>
              <div className="flex items-center w-full" style={{ padding: '10px 0px' }}>
                <button className="flex items-center" style={{ gap: '8px' }}>
                  <span style={{
                    fontFamily: 'Pretendard',
                    fontSize: '15px',
                    fontWeight: 600,
                    lineHeight: '128%',
                    letterSpacing: '-0.02em',
                    color: 'rgba(12, 12, 12, 0.8)',
                  }}>
                    이번 달
                  </span>
                  <ChevronDown 
                    style={{ 
                      width: '18px', 
                      height: '18px', 
                      color: 'rgba(12, 12, 12, 0.6)' 
                    }} 
                  />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center w-full" style={{ maxWidth: '375px', margin: '0 auto', height: '40px', filter: 'drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.02))' }}>
              <button 
                onClick={() => setActiveTab('reception')}
                className="flex items-center justify-center"
                style={{
                  width: '70px',
                  height: '40px',
                  padding: '10px',
                  borderBottom: activeTab === 'reception' ? '2px solid #008FED' : 'none',
                }}
                data-testid="tab-staff-reception"
              >
                <span style={{
                  fontFamily: 'Pretendard',
                  fontSize: '14px',
                  fontWeight: activeTab === 'reception' ? 600 : 400,
                  lineHeight: '128%',
                  letterSpacing: '-0.01em',
                  color: activeTab === 'reception' ? '#0C0C0C' : 'rgba(12, 12, 12, 0.5)',
                }}>
                  접수
                </span>
              </button>
              <button 
                onClick={() => setActiveTab('pending')}
                className="flex items-center justify-center"
                style={{
                  width: '69px',
                  height: '40px',
                  padding: '10px',
                  borderBottom: activeTab === 'pending' ? '2px solid #008FED' : 'none',
                }}
                data-testid="tab-staff-pending"
              >
                <span style={{
                  fontFamily: 'Pretendard',
                  fontSize: '14px',
                  fontWeight: activeTab === 'pending' ? 600 : 400,
                  lineHeight: '128%',
                  letterSpacing: '-0.01em',
                  color: activeTab === 'pending' ? '#0C0C0C' : 'rgba(12, 12, 12, 0.5)',
                }}>
                  미결
                </span>
              </button>
              <button 
                onClick={() => setActiveTab('insurance')}
                className="flex items-center justify-center"
                style={{
                  width: '118px',
                  height: '40px',
                  padding: '10px',
                  flexGrow: 1,
                  borderBottom: activeTab === 'insurance' ? '2px solid #008FED' : 'none',
                }}
                data-testid="tab-staff-insurance"
              >
                <span style={{
                  fontFamily: 'Pretendard',
                  fontSize: '14px',
                  fontWeight: activeTab === 'insurance' ? 600 : 400,
                  lineHeight: '128%',
                  letterSpacing: '-0.01em',
                  color: activeTab === 'insurance' ? '#0C0C0C' : 'rgba(12, 12, 12, 0.5)',
                }}>
                  보험사 미정산
                </span>
              </button>
              <button 
                onClick={() => setActiveTab('partner')}
                className="flex items-center justify-center"
                style={{
                  width: '118px',
                  height: '40px',
                  padding: '10px',
                  flexGrow: 1,
                  borderBottom: activeTab === 'partner' ? '2px solid #008FED' : 'none',
                }}
                data-testid="tab-staff-partner"
              >
                <span style={{
                  fontFamily: 'Pretendard',
                  fontSize: '14px',
                  fontWeight: activeTab === 'partner' ? 600 : 400,
                  lineHeight: '128%',
                  letterSpacing: '-0.01em',
                  color: activeTab === 'partner' ? '#0C0C0C' : 'rgba(12, 12, 12, 0.5)',
                }}>
                  협력사 미정산
                </span>
              </button>
            </div>

            {/* Table */}
            <div 
              className="flex flex-col items-start"
              style={{
                width: '100%',
                maxWidth: '351px',
                margin: '0 auto',
                padding: '8px 0px',
                background: '#FDFDFD',
                border: '1px solid #F9F9FB',
                boxShadow: '0px 6px 22px rgba(0, 0, 0, 0.12)',
                borderRadius: '12px',
              }}
            >
              {casesLoading ? (
                <div className="flex items-center justify-center w-full py-8">
                  <span style={{
                    fontFamily: 'Pretendard',
                    fontSize: '14px',
                    fontWeight: 400,
                    color: 'rgba(12, 12, 12, 0.5)',
                  }}>
                    로딩 중...
                  </span>
                </div>
              ) : staffSummary.length === 0 ? (
                <div className="flex items-center justify-center w-full py-8">
                  <span style={{
                    fontFamily: 'Pretendard',
                    fontSize: '14px',
                    fontWeight: 400,
                    color: 'rgba(12, 12, 12, 0.5)',
                  }}>
                    해당 기간에 케이스가 없습니다.
                  </span>
                </div>
              ) : (
                staffSummary.map((staff, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between w-full"
                    style={{
                      padding: '0px 12px',
                      height: '52px',
                    }}
                    data-testid={`staff-row-${index}`}
                  >
                    <div className="flex items-center" style={{ gap: '8px' }}>
                      <div 
                        className="flex items-center justify-center"
                        style={{
                          width: '32px',
                          height: '32px',
                          background: 'rgba(0, 143, 237, 0.2)',
                          borderRadius: '50px',
                        }}
                      >
                        <span style={{
                          fontFamily: 'Pretendard',
                          fontSize: '13px',
                          fontWeight: 600,
                          color: '#008FED',
                        }}>
                          {staff.name.charAt(0)}
                        </span>
                      </div>
                      <div className="flex items-center" style={{ gap: '3px' }}>
                        <span style={{
                          fontFamily: 'Pretendard',
                          fontSize: '14px',
                          fontWeight: 600,
                          lineHeight: '128%',
                          letterSpacing: '-0.01em',
                          color: '#0C0C0C',
                        }}>
                          {staff.name}
                        </span>
                        <span style={{
                          fontFamily: 'Pretendard',
                          fontSize: '13px',
                          fontWeight: 400,
                          lineHeight: '128%',
                          letterSpacing: '-0.01em',
                          color: 'rgba(12, 12, 12, 0.9)',
                        }}>
                          {staff.position}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center" style={{ gap: '8px' }}>
                      <span style={{
                        fontFamily: 'Pretendard',
                        fontSize: '14px',
                        fontWeight: 500,
                        lineHeight: '128%',
                        letterSpacing: '-0.01em',
                        color: '#0C0C0C',
                      }}>
                        {staff.count}건
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Desktop Stats Cards - Original version */}
          {statsLoading ? (
            <div className="hidden lg:flex justify-center py-8">로딩 중...</div>
          ) : stats ? (
            <div className="hidden lg:grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-[18px]">
              {/* 접수건 - 모든 역할에 표시 */}
              <div
                className="flex flex-col"
                style={{
                  padding: '20px',
                  background: '#FFFFFF',
                  boxShadow: '0px 0px 20px #DBE9F5',
                  borderRadius: '12px',
                  gap: '12px',
                }}
                data-testid="card-stat-received"
              >
                <span
                  style={{
                    fontFamily: 'Pretendard',
                    fontSize: '14px',
                    fontWeight: 500,
                    lineHeight: '128%',
                    letterSpacing: '-0.01em',
                    color: 'rgba(12, 12, 12, 0.9)',
                  }}
                >
                  접수건
                </span>
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-[2px]">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          style={{
                            fontFamily: 'Pretendard',
                            fontSize: '38px',
                            fontWeight: 700,
                            lineHeight: '128%',
                            letterSpacing: '-0.02em',
                            color: 'rgba(12, 12, 12, 0.9)',
                          }}
                          data-testid="text-received-count"
                        >
                          {stats.receivedCases}
                        </span>
                        <div className="flex flex-col justify-end" style={{ paddingTop: '6px', paddingBottom: '6px' }}>
                          <span
                            style={{
                              fontFamily: 'Pretendard',
                              fontSize: '18px',
                              fontWeight: 400,
                              lineHeight: '128%',
                              letterSpacing: '-0.02em',
                              color: 'rgba(12, 12, 12, 0.6)',
                            }}
                          >
                            건
                          </span>
                        </div>
                      </div>
                    </div>
                    {/* 전월 대비 변화 표시 */}
                    <div className="flex items-center gap-1" style={{ marginTop: '4px' }}>
                      {stats.receivedCasesChange > 0 ? (
                        <>
                          <TrendingUp style={{ width: '14px', height: '14px', color: '#007AFF' }} />
                          <span
                            style={{
                              fontFamily: 'Pretendard',
                              fontSize: '12px',
                              fontWeight: 500,
                              lineHeight: '128%',
                              color: '#007AFF',
                            }}
                            data-testid="text-received-change"
                          >
                            {stats.receivedCasesChange > 0 ? '+' : ''}{stats.receivedCasesChange.toFixed(1)}% ({stats.receivedCasesChangeCount > 0 ? '+' : ''}{stats.receivedCasesChangeCount}건)
                          </span>
                        </>
                      ) : stats.receivedCasesChange < 0 ? (
                        <>
                          <TrendingDown style={{ width: '14px', height: '14px', color: '#FF3B30' }} />
                          <span
                            style={{
                              fontFamily: 'Pretendard',
                              fontSize: '12px',
                              fontWeight: 500,
                              lineHeight: '128%',
                              color: '#FF3B30',
                            }}
                            data-testid="text-received-change"
                          >
                            {stats.receivedCasesChange.toFixed(1)}% ({stats.receivedCasesChangeCount}건)
                          </span>
                        </>
                      ) : (
                        <span
                          style={{
                            fontFamily: 'Pretendard',
                            fontSize: '12px',
                            fontWeight: 500,
                            lineHeight: '128%',
                            color: 'rgba(12, 12, 12, 0.5)',
                          }}
                          data-testid="text-received-change"
                        >
                          변화 없음
                        </span>
                      )}
                    </div>
                  </div>
                  <div
                    className="flex items-center justify-center"
                    style={{
                      width: '60px',
                      height: '60px',
                      background: 'rgba(0, 143, 237, 0.2)',
                      borderRadius: '100px',
                    }}
                  >
                    <CalendarPlus style={{ width: '26px', height: '26px', color: '#008FED' }} />
                  </div>
                </div>
              </div>

              {/* 미결건 - 모든 역할에 표시 */}
              <div
                className="flex flex-col"
                style={{
                  padding: '20px',
                  background: '#FFFFFF',
                  boxShadow: '0px 0px 20px #DBE9F5',
                  borderRadius: '12px',
                  gap: '12px',
                }}
                data-testid="card-stat-pending"
              >
                <span
                  style={{
                    fontFamily: 'Pretendard',
                    fontSize: '14px',
                    fontWeight: 500,
                    lineHeight: '128%',
                    letterSpacing: '-0.01em',
                    color: 'rgba(12, 12, 12, 0.9)',
                  }}
                >
                  미결건
                </span>
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-[2px]">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          style={{
                            fontFamily: 'Pretendard',
                            fontSize: '38px',
                            fontWeight: 700,
                            lineHeight: '128%',
                            letterSpacing: '-0.02em',
                            color: 'rgba(12, 12, 12, 0.9)',
                          }}
                          data-testid="text-pending-count"
                        >
                          {stats.pendingCases}
                        </span>
                        <div className="flex flex-col justify-end" style={{ paddingTop: '6px', paddingBottom: '6px' }}>
                          <span
                            style={{
                              fontFamily: 'Pretendard',
                              fontSize: '18px',
                              fontWeight: 400,
                              lineHeight: '128%',
                              letterSpacing: '-0.02em',
                              color: 'rgba(12, 12, 12, 0.6)',
                            }}
                          >
                            건
                          </span>
                        </div>
                      </div>
                    </div>
                    {/* 전월 대비 변화 표시 */}
                    <div className="flex items-center gap-1" style={{ marginTop: '4px' }}>
                      {stats.pendingCasesChange > 0 ? (
                        <>
                          <TrendingUp style={{ width: '14px', height: '14px', color: '#007AFF' }} />
                          <span
                            style={{
                              fontFamily: 'Pretendard',
                              fontSize: '12px',
                              fontWeight: 500,
                              lineHeight: '128%',
                              color: '#007AFF',
                            }}
                            data-testid="text-pending-change"
                          >
                            {stats.pendingCasesChange > 0 ? '+' : ''}{stats.pendingCasesChange.toFixed(1)}% ({stats.pendingCasesChangeCount > 0 ? '+' : ''}{stats.pendingCasesChangeCount}건)
                          </span>
                        </>
                      ) : stats.pendingCasesChange < 0 ? (
                        <>
                          <TrendingDown style={{ width: '14px', height: '14px', color: '#FF3B30' }} />
                          <span
                            style={{
                              fontFamily: 'Pretendard',
                              fontSize: '12px',
                              fontWeight: 500,
                              lineHeight: '128%',
                              color: '#FF3B30',
                            }}
                            data-testid="text-pending-change"
                          >
                            {stats.pendingCasesChange.toFixed(1)}% ({stats.pendingCasesChangeCount}건)
                          </span>
                        </>
                      ) : (
                        <span
                          style={{
                            fontFamily: 'Pretendard',
                            fontSize: '12px',
                            fontWeight: 500,
                            lineHeight: '128%',
                            color: 'rgba(12, 12, 12, 0.5)',
                          }}
                          data-testid="text-pending-change"
                        >
                          변화 없음
                        </span>
                      )}
                    </div>
                  </div>
                  <div
                    className="flex items-center justify-center"
                    style={{
                      width: '60px',
                      height: '60px',
                      background: 'rgba(0, 143, 237, 0.2)',
                      borderRadius: '100px',
                    }}
                  >
                    <AlertCircle style={{ width: '26px', height: '26px', color: '#008FED' }} />
                  </div>
                </div>
              </div>

              {/* 보험사 미정산 - 심사사/조사사/보험사/관리자만 표시 */}
              {user.role !== "협력사" && (
                <div
                  className="flex flex-col"
                  style={{
                    padding: '20px',
                    background: '#FFFFFF',
                    boxShadow: '0px 0px 20px #DBE9F5',
                    borderRadius: '12px',
                    gap: '12px',
                  }}
                  data-testid="card-stat-insurance-unsettled"
                >
                  <span
                    style={{
                      fontFamily: 'Pretendard',
                      fontSize: '14px',
                      fontWeight: 500,
                      lineHeight: '128%',
                      letterSpacing: '-0.01em',
                      color: 'rgba(12, 12, 12, 0.9)',
                    }}
                  >
                    {user.role === "관리자" ? "보험사 미정산" : "미정산"}
                  </span>
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col justify-center gap-[2px]">
                      <div className="flex items-center gap-2">
                        <span
                          style={{
                            fontFamily: 'Pretendard',
                            fontSize: '38px',
                            fontWeight: 700,
                            lineHeight: '128%',
                            letterSpacing: '-0.02em',
                            color: 'rgba(12, 12, 12, 0.9)',
                          }}
                          data-testid="text-insurance-count"
                        >
                          {stats.insuranceUnsettledCases}
                        </span>
                        <div className="flex flex-col justify-end" style={{ paddingTop: '6px', paddingBottom: '6px' }}>
                          <span
                            style={{
                              fontFamily: 'Pretendard',
                              fontSize: '18px',
                              fontWeight: 400,
                              lineHeight: '128%',
                              letterSpacing: '-0.02em',
                              color: 'rgba(12, 12, 12, 0.6)',
                            }}
                          >
                            건
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span
                          style={{
                            fontFamily: 'Pretendard',
                            fontSize: '18px',
                            fontWeight: 600,
                            lineHeight: '128%',
                            letterSpacing: '-0.02em',
                            color: 'rgba(12, 12, 12, 0.6)',
                          }}
                          data-testid="text-insurance-amount"
                        >
                          {stats.insuranceUnsettledAmount.toLocaleString('ko-KR')}
                        </span>
                        <span
                          style={{
                            fontFamily: 'Pretendard',
                            fontSize: '16px',
                            fontWeight: 400,
                            lineHeight: '128%',
                            letterSpacing: '-0.02em',
                            color: 'rgba(12, 12, 12, 0.6)',
                          }}
                        >
                          원
                        </span>
                      </div>
                    </div>
                    <div
                      className="flex items-center justify-center"
                      style={{
                        width: '60px',
                        height: '60px',
                        background: 'rgba(0, 143, 237, 0.2)',
                        borderRadius: '100px',
                      }}
                    >
                      <Building2 style={{ width: '26px', height: '26px', color: '#008FED' }} />
                    </div>
                  </div>
                </div>
              )}

              {/* 협력사 미정산 - 협력사/관리자만 표시 */}
              {(user.role === "협력사" || user.role === "관리자") && (
                <div
                  className="flex flex-col"
                  style={{
                    padding: '20px',
                    background: '#FFFFFF',
                    boxShadow: '0px 0px 20px #DBE9F5',
                    borderRadius: '12px',
                    gap: '12px',
                  }}
                  data-testid="card-stat-partner-unsettled"
                >
                  <span
                    style={{
                      fontFamily: 'Pretendard',
                      fontSize: '14px',
                      fontWeight: 500,
                      lineHeight: '128%',
                      letterSpacing: '-0.01em',
                      color: 'rgba(12, 12, 12, 0.9)',
                    }}
                  >
                    {user.role === "협력사" ? "미정산" : "협력사 미정산"}
                  </span>
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col justify-center gap-[2px]">
                      <div className="flex items-center gap-2">
                        <span
                          style={{
                            fontFamily: 'Pretendard',
                            fontSize: '38px',
                            fontWeight: 700,
                            lineHeight: '128%',
                            letterSpacing: '-0.02em',
                            color: 'rgba(12, 12, 12, 0.9)',
                          }}
                          data-testid="text-partner-count"
                        >
                          {stats.partnerUnsettledCases}
                        </span>
                        <div className="flex flex-col justify-end" style={{ paddingTop: '6px', paddingBottom: '6px' }}>
                          <span
                            style={{
                              fontFamily: 'Pretendard',
                              fontSize: '18px',
                              fontWeight: 400,
                              lineHeight: '128%',
                              letterSpacing: '-0.02em',
                              color: 'rgba(12, 12, 12, 0.6)',
                            }}
                          >
                            건
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span
                          style={{
                            fontFamily: 'Pretendard',
                            fontSize: '18px',
                            fontWeight: 600,
                            lineHeight: '128%',
                            letterSpacing: '-0.02em',
                            color: 'rgba(12, 12, 12, 0.6)',
                          }}
                          data-testid="text-partner-amount"
                        >
                          {stats.partnerUnsettledAmount.toLocaleString('ko-KR')}
                        </span>
                        <span
                          style={{
                            fontFamily: 'Pretendard',
                            fontSize: '16px',
                            fontWeight: 400,
                            lineHeight: '128%',
                            letterSpacing: '-0.02em',
                            color: 'rgba(12, 12, 12, 0.6)',
                          }}
                        >
                          원
                        </span>
                      </div>
                    </div>
                    <div
                      className="flex items-center justify-center"
                      style={{
                        width: '60px',
                        height: '60px',
                        background: 'rgba(0, 143, 237, 0.2)',
                        borderRadius: '100px',
                      }}
                    >
                      <Handshake style={{ width: '26px', height: '26px', color: '#008FED' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {/* Progress Summary and Case List Section - Desktop only */}
          <div className="hidden lg:flex flex-col lg:flex-row items-start gap-6 mt-6">
            {/* Progress Summary */}
            <div className="flex flex-col gap-6 w-full lg:flex-1">
              {/* Section Header */}
              <div 
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                style={{ padding: '24px 0' }}
              >
                <h2
                  style={{
                    fontFamily: 'Pretendard',
                    fontSize: '20px',
                    fontWeight: 600,
                    lineHeight: '128%',
                    letterSpacing: '-0.02em',
                    color: '#0C0C0C',
                  }}
                >
                  진행건 요약
                </h2>
                <button 
                  onClick={() => setIsPeriodSheetOpen(true)}
                  className="flex items-center justify-between"
                  style={{
                    width: '128px',
                    height: '44px',
                    padding: '10px 8px',
                    gap: '8px',
                    background: '#FFFFFF',
                    border: '1px solid rgba(12, 12, 12, 0.3)',
                    borderRadius: '8px',
                  }}
                  data-testid="button-progress-period-selector"
                >
                  <div className="flex items-center gap-2">
                    <Calendar 
                      style={{ 
                        width: '22px', 
                        height: '22px', 
                        color: '#008FED' 
                      }} 
                    />
                    <span 
                      style={{
                        fontFamily: 'Pretendard',
                        fontSize: '16px',
                        fontWeight: 500,
                        lineHeight: '128%',
                        letterSpacing: '-0.02em',
                        color: 'rgba(12, 12, 12, 0.9)',
                      }}
                    >
                      {periodType === 'all' ? '전체' :
                       periodType === 'today' ? '오늘' :
                       periodType === 'thisMonth' ? '이번 달' :
                       periodType === 'lastMonth' ? '지난 달' :
                       '사용자 지정'}
                    </span>
                  </div>
                  <ChevronDown 
                    style={{ 
                      width: '24px', 
                      height: '24px', 
                      color: 'rgba(12, 12, 12, 0.6)' 
                    }} 
                  />
                </button>
              </div>

            {/* Summary Card */}
            <div
              className="w-full"
              style={{
                background: '#FDFDFD',
                boxShadow: '0px 0px 20px #DBE9F5',
                borderRadius: '12px',
              }}
              data-testid="card-progress-summary"
            >
              {/* Tabs */}
              <div
                className="flex flex-col"
                style={{
                  padding: '16px 20px',
                  gap: '10px',
                }}
              >
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                  <div className="flex items-center gap-2 min-w-max">
                  <button
                    onClick={() => setActiveTab('reception')}
                    className="flex items-center justify-center"
                    style={{
                      padding: '12px 16px',
                      background: activeTab === 'reception' ? '#008FED' : 'rgba(255, 255, 255, 0.04)',
                      boxShadow: activeTab === 'reception' ? '2px 4px 30px #BDD1F0' : 'inset 0px -2px 4px rgba(0, 0, 0, 0.05), inset 0px 2px 4px rgba(0, 0, 0, 0.05)',
                      backdropFilter: activeTab === 'reception' ? 'none' : 'blur(7px)',
                      borderRadius: '6px',
                    }}
                    data-testid="tab-reception"
                  >
                    <span
                      style={{
                        fontFamily: 'Pretendard',
                        fontSize: '16px',
                        fontWeight: activeTab === 'reception' ? 600 : 500,
                        lineHeight: '128%',
                        letterSpacing: '-0.02em',
                        color: activeTab === 'reception' ? '#FDFDFD' : 'rgba(12, 12, 12, 0.4)',
                      }}
                    >
                      접수
                    </span>
                  </button>
                  <button
                    onClick={() => setActiveTab('pending')}
                    className="flex items-center justify-center"
                    style={{
                      padding: '12px 16px',
                      background: activeTab === 'pending' ? '#008FED' : 'rgba(255, 255, 255, 0.04)',
                      boxShadow: activeTab === 'pending' ? '2px 4px 30px #BDD1F0' : 'inset 0px -2px 4px rgba(0, 0, 0, 0.05), inset 0px 2px 4px rgba(0, 0, 0, 0.05)',
                      backdropFilter: activeTab === 'pending' ? 'none' : 'blur(7px)',
                      borderRadius: '6px',
                    }}
                    data-testid="tab-pending"
                  >
                    <span
                      style={{
                        fontFamily: 'Pretendard',
                        fontSize: '16px',
                        fontWeight: activeTab === 'pending' ? 600 : 500,
                        lineHeight: '128%',
                        letterSpacing: '-0.02em',
                        color: activeTab === 'pending' ? '#FDFDFD' : 'rgba(12, 12, 12, 0.4)',
                      }}
                    >
                      미결
                    </span>
                  </button>
                  
                  {/* 보험사 미정산 - 협력사 사용자는 볼 수 없음 */}
                  {user.role !== '협력사' && (
                    <button
                      onClick={() => setActiveTab('insurance')}
                      className="flex items-center justify-center"
                      style={{
                        padding: '12px 16px',
                        background: activeTab === 'insurance' ? '#008FED' : 'rgba(255, 255, 255, 0.04)',
                        boxShadow: activeTab === 'insurance' ? '2px 4px 30px #BDD1F0' : 'inset 0px -2px 4px rgba(0, 0, 0, 0.05), inset 0px 2px 4px rgba(0, 0, 0, 0.05)',
                        backdropFilter: activeTab === 'insurance' ? 'none' : 'blur(7px)',
                        borderRadius: '6px',
                      }}
                      data-testid="tab-insurance"
                    >
                      <span
                        style={{
                          fontFamily: 'Pretendard',
                          fontSize: '16px',
                          fontWeight: activeTab === 'insurance' ? 600 : 500,
                          lineHeight: '128%',
                          letterSpacing: '-0.02em',
                          color: activeTab === 'insurance' ? '#FDFDFD' : 'rgba(12, 12, 12, 0.4)',
                        }}
                      >
                        보험사 미정산
                      </span>
                    </button>
                  )}
                  
                  {/* 협력사 미정산 - 심사사/조사사/보험사는 볼 수 없음 */}
                  {user.role !== '심사사' && user.role !== '조사사' && user.role !== '보험사' && (
                    <button
                      onClick={() => setActiveTab('partner')}
                      className="flex items-center justify-center"
                      style={{
                        padding: '12px 16px',
                        background: activeTab === 'partner' ? '#008FED' : 'rgba(255, 255, 255, 0.04)',
                        boxShadow: activeTab === 'partner' ? '2px 4px 30px #BDD1F0' : 'inset 0px -2px 4px rgba(0, 0, 0, 0.05), inset 0px 2px 4px rgba(0, 0, 0, 0.05)',
                        backdropFilter: activeTab === 'partner' ? 'none' : 'blur(7px)',
                        borderRadius: '6px',
                      }}
                      data-testid="tab-partner"
                    >
                      <span
                        style={{
                          fontFamily: 'Pretendard',
                          fontSize: '16px',
                          fontWeight: activeTab === 'partner' ? 600 : 500,
                          lineHeight: '128%',
                          letterSpacing: '-0.02em',
                          color: activeTab === 'partner' ? '#FDFDFD' : 'rgba(12, 12, 12, 0.4)',
                        }}
                      >
                        협력사 미정산
                      </span>
                    </button>
                  )}
                  </div>
                </div>
              </div>

              {/* Table */}
              <div
                className="flex flex-col"
                style={{
                  padding: '0 20px',
                  gap: '17px',
                  paddingBottom: '20px',
                }}
              >
                {/* Table Header */}
                <div
                  className="flex items-center"
                  style={{
                    background: 'rgba(12, 12, 12, 0.04)',
                    borderRadius: '8px',
                    height: '39px',
                  }}
                  data-testid="table-header"
                >
                  <div
                    className="flex items-center justify-center"
                    style={{ width: '68px', padding: '0 8px' }}
                  >
                    <span
                      style={{
                        fontFamily: 'Pretendard',
                        fontSize: '15px',
                        fontWeight: 500,
                        lineHeight: '128%',
                        letterSpacing: '-0.01em',
                        color: 'rgba(12, 12, 12, 0.6)',
                      }}
                    >
                      프로필
                    </span>
                  </div>
                  <div
                    className="flex items-center"
                    style={{ width: '165px', padding: '0 8px' }}
                  >
                    <span
                      style={{
                        fontFamily: 'Pretendard',
                        fontSize: '15px',
                        fontWeight: 500,
                        lineHeight: '128%',
                        letterSpacing: '-0.01em',
                        color: 'rgba(12, 12, 12, 0.6)',
                      }}
                    >
                      성함
                    </span>
                  </div>
                  <div
                    className="flex items-center"
                    style={{ width: '164px', padding: '0 8px' }}
                  >
                    <span
                      style={{
                        fontFamily: 'Pretendard',
                        fontSize: '15px',
                        fontWeight: 500,
                        lineHeight: '128%',
                        letterSpacing: '-0.01em',
                        color: 'rgba(12, 12, 12, 0.6)',
                      }}
                    >
                      직책
                    </span>
                  </div>
                  <div
                    className="flex items-center flex-1"
                    style={{ padding: '0 8px' }}
                  >
                    <span
                      style={{
                        fontFamily: 'Pretendard',
                        fontSize: '15px',
                        fontWeight: 500,
                        lineHeight: '128%',
                        letterSpacing: '-0.01em',
                        color: 'rgba(12, 12, 12, 0.6)',
                      }}
                    >
                      건 수
                    </span>
                  </div>
                </div>

                {/* Table Body */}
                <div className="flex flex-col gap-4">
                  {casesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <span style={{
                        fontFamily: 'Pretendard',
                        fontSize: '15px',
                        fontWeight: 400,
                        color: 'rgba(12, 12, 12, 0.5)',
                      }}>
                        로딩 중...
                      </span>
                    </div>
                  ) : staffSummary.length === 0 ? (
                    <div className="flex items-center justify-center py-8">
                      <span style={{
                        fontFamily: 'Pretendard',
                        fontSize: '15px',
                        fontWeight: 400,
                        color: 'rgba(12, 12, 12, 0.5)',
                      }}>
                        해당 기간에 케이스가 없습니다.
                      </span>
                    </div>
                  ) : (
                    staffSummary.slice(0, 7).map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center"
                        style={{ height: '39px' }}
                        data-testid={`table-row-${index}`}
                      >
                        <div
                          className="flex items-center justify-center"
                          style={{ width: '68px', padding: '0 8px' }}
                        >
                          <div
                            style={{
                              width: '39px',
                              height: '39px',
                              background: 'rgba(0, 143, 237, 0.2)',
                              borderRadius: '50px',
                            }}
                          />
                        </div>
                        <div
                          className="flex items-center"
                          style={{ width: '165px', padding: '0 8px' }}
                        >
                          <span
                            style={{
                              fontFamily: 'Pretendard',
                              fontSize: '16px',
                              fontWeight: 500,
                              lineHeight: '128%',
                              letterSpacing: '-0.02em',
                              color: 'rgba(12, 12, 12, 0.9)',
                            }}
                          >
                            {item.name}
                          </span>
                        </div>
                        <div
                          className="flex items-center"
                          style={{ width: '164px', padding: '0 8px' }}
                        >
                          <span
                            style={{
                              fontFamily: 'Pretendard',
                              fontSize: '16px',
                              fontWeight: 500,
                              lineHeight: '128%',
                              letterSpacing: '-0.02em',
                              color: 'rgba(12, 12, 12, 0.9)',
                            }}
                          >
                            {item.position}
                          </span>
                        </div>
                        <div
                          className="flex items-center flex-1"
                          style={{ padding: '0 8px' }}
                        >
                          <span
                            style={{
                              fontFamily: 'Pretendard',
                              fontSize: '16px',
                              fontWeight: 500,
                              lineHeight: '128%',
                              letterSpacing: '-0.02em',
                              color: 'rgba(12, 12, 12, 0.9)',
                            }}
                          >
                            {item.count}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            </div>

            {/* Case List Card */}
            <div className="flex flex-col gap-6 w-full lg:w-[418px]">
              {/* Title */}
              <div style={{ padding: '24px 0' }}>
                <h2
                  style={{
                    fontFamily: 'Pretendard',
                    fontSize: '20px',
                    fontWeight: 600,
                    lineHeight: '128%',
                    letterSpacing: '-0.02em',
                    color: '#0C0C0C',
                  }}
                >
                  내 작업
                </h2>
              </div>

              {/* Case List */}
              <div
                className="flex flex-col w-full"
                style={{
                  height: '535px',
                  background: '#FFFFFF',
                  boxShadow: '0px 0px 20px #DBE9F5',
                  borderRadius: '12px',
                  padding: '20px',
                  gap: '24px',
                  overflowY: 'auto',
                }}
                data-testid="card-case-list"
              >
                {myTasks.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <span
                      style={{
                        fontFamily: 'Pretendard',
                        fontSize: '15px',
                        fontWeight: 400,
                        color: 'rgba(12, 12, 12, 0.4)',
                      }}
                    >
                      맡은 작업이 없습니다
                    </span>
                  </div>
                ) : (
                  myTasks.map((caseItem, index) => (
                    <div
                      key={caseItem.id}
                      className="flex flex-col gap-3 cursor-pointer hover-elevate"
                      data-testid={`case-item-${index}`}
                      onClick={() => {
                        // Navigate to field survey page with this case
                        localStorage.setItem('selectedFieldSurveyCaseId', caseItem.id);
                        setLocation('/field-survey/management');
                      }}
                    >
                      {/* Status and Time */}
                      <div className="flex items-center justify-between">
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '8px 10px',
                            background: '#FDFDFD',
                            boxShadow: '0px 0px 20px #DBE9F5',
                            borderRadius: '8px',
                          }}
                          data-testid={`status-badge-${index}`}
                        >
                          <span
                            style={{
                              fontFamily: 'Pretendard',
                              fontSize: '15px',
                              fontWeight: 600,
                              lineHeight: '128%',
                              letterSpacing: '-0.02em',
                              color: getStatusColor(caseItem.status || '작성중'),
                            }}
                          >
                            {caseItem.status || '작성중'}
                          </span>
                        </div>
                        <span
                          style={{
                            fontFamily: 'Pretendard',
                            fontSize: '13px',
                            fontWeight: 400,
                            lineHeight: '128%',
                            letterSpacing: '-0.01em',
                            color: 'rgba(12, 12, 12, 0.4)',
                          }}
                        >
                          {getTimeAgo(caseItem.updatedAt)}
                        </span>
                      </div>

                      {/* Title and Arrow */}
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-1.5" style={{ padding: '0 4px' }}>
                          <span
                            style={{
                              fontFamily: 'Pretendard',
                              fontSize: '16px',
                              fontWeight: 600,
                              lineHeight: '128%',
                              letterSpacing: '-0.02em',
                              color: '#0C0C0C',
                            }}
                          >
                            {caseItem.caseNumber} · {caseItem.accidentLocation || '위치 미정'}
                          </span>
                          <div className="flex items-center gap-1">
                            <span
                              style={{
                                fontFamily: 'Pretendard',
                                fontSize: '14px',
                                fontWeight: 400,
                                lineHeight: '128%',
                                letterSpacing: '-0.01em',
                                color: 'rgba(12, 12, 12, 0.6)',
                              }}
                            >
                              사고번호
                            </span>
                            <span
                              style={{
                                fontFamily: 'Pretendard',
                                fontSize: '14px',
                                fontWeight: 500,
                                lineHeight: '128%',
                                letterSpacing: '-0.01em',
                                color: 'rgba(12, 12, 12, 0.6)',
                              }}
                            >
                              ·
                            </span>
                            <span
                              style={{
                                fontFamily: 'Pretendard',
                                fontSize: '14px',
                                fontWeight: 400,
                                lineHeight: '128%',
                                letterSpacing: '-0.01em',
                                color: 'rgba(12, 12, 12, 0.6)',
                              }}
                            >
                              {caseItem.insuranceAccidentNo || '미정'}
                            </span>
                          </div>
                        </div>
                        <ChevronRight
                          style={{
                            width: '18px',
                            height: '18px',
                            color: 'rgba(12, 12, 12, 0.4)',
                          }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Hidden on mobile */}
        <div 
          className="hidden lg:flex flex-col gap-3 py-6 px-4 md:px-8 lg:px-0 lg:pr-8 w-full lg:w-[415px]"
        >
          {/* My Profile Card */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid #FFFFFF',
              boxShadow: '12px 12px 50px #DBE9F5',
              backdropFilter: 'blur(7px)',
            }}
          >
            <div className="flex items-center justify-between px-5 py-6">
              <h3 
                style={{
                  fontFamily: 'Pretendard',
                  fontSize: '18px',
                  fontWeight: 600,
                  letterSpacing: '-0.02em',
                  color: 'rgba(12, 12, 12, 0.8)',
                }}
              >
                내 프로필
              </h3>
              <button
                onClick={() => logoutMutation.mutate()}
                style={{
                  fontFamily: 'Pretendard',
                  fontSize: '15px',
                  fontWeight: 500,
                  letterSpacing: '-0.01em',
                  color: 'rgba(0, 143, 237, 0.8)',
                }}
                data-testid="button-logout"
              >
                로그아웃
              </button>
            </div>
            
            <div className="flex flex-col items-center pb-8">
              <div 
                className="w-[72px] h-[72px] rounded-full flex items-center justify-center mb-3"
                style={{ background: 'rgba(0, 143, 237, 0.2)' }}
              >
                <span style={{
                  fontFamily: 'Pretendard',
                  fontSize: '24px',
                  fontWeight: 600,
                  color: '#008FED',
                }}>
                  {user.name?.charAt(0) || user.username?.charAt(0) || 'U'}
                </span>
              </div>
              <div className="flex items-center gap-1 mb-1">
                <span 
                  style={{
                    fontFamily: 'Pretendard',
                    fontSize: '18px',
                    fontWeight: 600,
                    letterSpacing: '-0.02em',
                    color: '#0C0C0C',
                  }}
                >
                  {user.name || user.username}
                </span>
                <span 
                  style={{
                    fontFamily: 'Pretendard',
                    fontSize: '15px',
                    fontWeight: 400,
                    letterSpacing: '-0.01em',
                    color: 'rgba(12, 12, 12, 0.9)',
                  }}
                >
                  {user.position || '사원'}
                </span>
              </div>
              <span 
                style={{
                  fontFamily: 'Pretendard',
                  fontSize: '15px',
                  fontWeight: 400,
                  letterSpacing: '-0.01em',
                  color: 'rgba(12, 12, 12, 0.7)',
                }}
              >
                {user.email || `${user.username}@example.com`}
              </span>
            </div>
          </div>

          {/* Notices Card - Only visible for 협력사 */}
          {user.role === "협력사" && (
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: '1px solid #FFFFFF',
                boxShadow: '12px 12px 50px #DBE9F5',
                backdropFilter: 'blur(7px)',
              }}
            >
              <div className="flex items-center justify-between px-5 py-6">
                <div className="flex items-center gap-2">
                  <h3 
                    style={{
                      fontFamily: 'Pretendard',
                      fontSize: '18px',
                      fontWeight: 600,
                      letterSpacing: '-0.02em',
                      color: '#0C0C0C',
                    }}
                  >
                    공지사항
                  </h3>
                </div>
                <button
                  className="px-3 py-2 bg-white rounded-md"
                  style={{
                    fontFamily: 'Pretendard',
                    fontSize: '15px',
                    fontWeight: 600,
                    letterSpacing: '-0.02em',
                    color: 'rgba(0, 143, 237, 0.8)',
                    boxShadow: '2px 4px 30px #BDD1F0',
                  }}
                >
                  더보기
                </button>
              </div>
              
              <div className="pb-4">
                {notices.length === 0 ? (
                  <div 
                    className="px-5 py-3"
                    style={{
                      fontFamily: 'Pretendard',
                      fontSize: '16px',
                      fontWeight: 400,
                      letterSpacing: '-0.02em',
                      color: 'rgba(12, 12, 12, 0.5)',
                      textAlign: 'center',
                    }}
                  >
                    등록된 공지사항이 없습니다.
                  </div>
                ) : (
                  notices.slice(0, 3).map((notice) => (
                    <div 
                      key={notice.id}
                      className="px-5 py-3"
                      style={{
                        fontFamily: 'Pretendard',
                        fontSize: '16px',
                        fontWeight: 400,
                        letterSpacing: '-0.02em',
                        color: 'rgba(12, 12, 12, 0.9)',
                      }}
                    >
                      {notice.title}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 1:1 Inquiry Card */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid #FFFFFF',
              boxShadow: '12px 12px 50px #DBE9F5',
              backdropFilter: 'blur(7px)',
            }}
          >
            <div className="flex items-center justify-between px-5 py-6">
              <h3 
                style={{
                  fontFamily: 'Pretendard',
                  fontSize: '18px',
                  fontWeight: 600,
                  letterSpacing: '-0.02em',
                  color: '#0C0C0C',
                }}
              >
                1:1 문의
              </h3>
              <button
                className="px-3 py-2 bg-white rounded-md"
                style={{
                  fontFamily: 'Pretendard',
                  fontSize: '15px',
                  fontWeight: 600,
                  letterSpacing: '-0.02em',
                  color: 'rgba(0, 143, 237, 0.8)',
                  boxShadow: '2px 4px 30px #BDD1F0',
                }}
              >
                새 문의
              </button>
            </div>
            
            <div className="pb-4">
              {inquiries.map((item, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between px-5 py-3"
                >
                  <span 
                    style={{
                      fontFamily: 'Pretendard',
                      fontSize: '16px',
                      fontWeight: 400,
                      letterSpacing: '-0.02em',
                      color: 'rgba(12, 12, 12, 0.9)',
                    }}
                  >
                    {item.title}
                  </span>
                  <span 
                    style={{
                      fontFamily: 'Pretendard',
                      fontSize: '15px',
                      fontWeight: 400,
                      letterSpacing: '-0.01em',
                      color: 'rgba(12, 12, 12, 0.6)',
                    }}
                  >
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Favorites Card */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid #FFFFFF',
              boxShadow: '12px 12px 50px #DBE9F5',
              backdropFilter: 'blur(7px)',
            }}
          >
            <div className="px-5 py-6">
              <h3 
                style={{
                  fontFamily: 'Pretendard',
                  fontSize: '18px',
                  fontWeight: 600,
                  letterSpacing: '-0.02em',
                  color: '#0C0C0C',
                }}
              >
                즐겨찾기
              </h3>
            </div>
            
            <div className="pb-4">
              {userFavorites.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <span
                    style={{
                      fontFamily: 'Pretendard',
                      fontSize: '14px',
                      fontWeight: 400,
                      letterSpacing: '-0.02em',
                      color: 'rgba(12, 12, 12, 0.4)',
                    }}
                  >
                    즐겨찾기한 메뉴가 없습니다
                  </span>
                </div>
              ) : (
                userFavorites.map((item) => (
                  <div 
                    key={item.id}
                    className="flex items-center justify-between px-5 py-3 cursor-pointer hover-elevate"
                    onClick={() => handleFavoriteClick(item.menuName)}
                  >
                    <div className="flex items-center gap-3">
                      {getMenuIcon(item.menuName)}
                      <span 
                        style={{
                          fontFamily: 'Pretendard',
                          fontSize: '16px',
                          fontWeight: 400,
                          letterSpacing: '-0.02em',
                          color: 'rgba(12, 12, 12, 0.9)',
                        }}
                      >
                        {item.menuName}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFavorite(item.menuName);
                      }}
                      className="cursor-pointer transition-opacity hover:opacity-70"
                      data-testid={`favorite-star-${item.menuName}`}
                    >
                      <Star className="w-[18px] h-[18px] fill-[#008FED] text-[#008FED]" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Period Selection Sheet - Mobile Bottom Sheet */}
      <Sheet open={isPeriodSheetOpen} onOpenChange={setIsPeriodSheetOpen}>
        <SheetContent 
          side="bottom" 
          className="h-auto rounded-t-2xl"
          style={{
            background: '#FFFFFF',
            padding: '0px',
          }}
        >
          <div className="flex flex-col" style={{ padding: '24px 20px' }}>
            <div className="flex items-center justify-between mb-6">
              <span style={{
                fontFamily: 'Pretendard',
                fontSize: '16px',
                fontWeight: 600,
                lineHeight: '128%',
                letterSpacing: '-0.01em',
                color: 'rgba(12, 12, 12, 0.9)',
              }}>
                기간 선택
              </span>
              <button 
                onClick={() => setIsPeriodSheetOpen(false)}
                data-testid="button-close-period-sheet"
              >
                <X style={{ width: '20px', height: '20px', color: 'rgba(12, 12, 12, 0.6)' }} />
              </button>
            </div>
            
            <div className="flex flex-col gap-2">
              {[
                { label: '전체', value: 'all' as PeriodType },
                { label: '오늘', value: 'today' as PeriodType },
                { label: '이번 달', value: 'thisMonth' as PeriodType },
                { label: '지난 달', value: 'lastMonth' as PeriodType },
                { label: '날짜 선택', value: 'custom' as PeriodType },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => handlePeriodSelect(option.value)}
                  className="flex items-center justify-between w-full"
                  style={{
                    padding: '14px 16px',
                    background: periodType === option.value ? 'rgba(0, 143, 237, 0.08)' : 'transparent',
                    borderRadius: '8px',
                  }}
                  data-testid={`option-period-${option.value}`}
                >
                  <span style={{
                    fontFamily: 'Pretendard',
                    fontSize: '15px',
                    fontWeight: periodType === option.value ? 600 : 400,
                    lineHeight: '128%',
                    letterSpacing: '-0.01em',
                    color: periodType === option.value ? '#008FED' : 'rgba(12, 12, 12, 0.9)',
                  }}>
                    {option.label}
                  </span>
                  {periodType === option.value && (
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: '#008FED',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <div style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: '#FFFFFF',
                      }} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Calendar Sheet - Date Range Picker */}
      <Sheet open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <SheetContent 
          side="bottom" 
          className="h-auto rounded-t-2xl"
          style={{
            background: '#FFFFFF',
            padding: '0px',
          }}
        >
          <div className="flex flex-col" style={{ padding: '24px 20px' }}>
            <div className="flex items-center justify-between mb-6">
              <span style={{
                fontFamily: 'Pretendard',
                fontSize: '16px',
                fontWeight: 600,
                lineHeight: '128%',
                letterSpacing: '-0.01em',
                color: 'rgba(12, 12, 12, 0.9)',
              }}>
                날짜 선택
              </span>
              <button 
                onClick={() => setIsCalendarOpen(false)}
                data-testid="button-close-calendar-sheet"
              >
                <X style={{ width: '20px', height: '20px', color: 'rgba(12, 12, 12, 0.6)' }} />
              </button>
            </div>
            
            <div className="flex flex-col items-center gap-4">
              <CalendarComponent
                mode="range"
                selected={dateRange}
                onSelect={setDateRange}
                locale={ko}
                className="rounded-md border"
                data-testid="calendar-range-picker"
              />
              
              {dateRange?.from && dateRange?.to && (
                <div className="flex items-center gap-2 w-full" style={{
                  padding: '12px 16px',
                  background: 'rgba(0, 143, 237, 0.05)',
                  borderRadius: '8px',
                }}>
                  <span style={{
                    fontFamily: 'Pretendard',
                    fontSize: '14px',
                    fontWeight: 500,
                    lineHeight: '128%',
                    letterSpacing: '-0.01em',
                    color: 'rgba(12, 12, 12, 0.7)',
                  }}>
                    {format(dateRange.from, 'yyyy-MM-dd')} ~ {format(dateRange.to, 'yyyy-MM-dd')}
                  </span>
                </div>
              )}
              
              <div className="flex gap-3 w-full">
                <Button
                  variant="outline"
                  onClick={() => setIsCalendarOpen(false)}
                  className="flex-1"
                  style={{
                    fontFamily: 'Pretendard',
                    fontSize: '15px',
                    fontWeight: 500,
                  }}
                  data-testid="button-calendar-cancel"
                >
                  취소
                </Button>
                <Button
                  onClick={handleCalendarApply}
                  disabled={!dateRange?.from || !dateRange?.to}
                  className="flex-1"
                  style={{
                    fontFamily: 'Pretendard',
                    fontSize: '15px',
                    fontWeight: 600,
                    background: '#008FED',
                  }}
                  data-testid="button-calendar-apply"
                >
                  적용
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
