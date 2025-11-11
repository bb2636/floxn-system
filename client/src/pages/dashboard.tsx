import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { User } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Home, Star, LogOut, CalendarPlus, AlertCircle, Building2, Handshake, TrendingUp, TrendingDown, Calendar, ChevronDown, ChevronRight, X } from "lucide-react";
import logoIcon from "@assets/Vector_1762589710900.png";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format, startOfMonth, endOfMonth, startOfToday, subMonths, endOfToday } from "date-fns";
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
  const [favorites, setFavorites] = useState([
    { name: "홈", icon: <Home className="w-4 h-4" /> },
    { name: "종합진행관리", icon: <Star className="w-4 h-4" /> },
    { name: "관리자 설정", icon: <Star className="w-4 h-4" /> },
  ]);
  
  const [periodType, setPeriodType] = useState<PeriodType>('thisMonth');
  const [isPeriodSheetOpen, setIsPeriodSheetOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  
  const [staffTab, setStaffTab] = useState<StaffTabType>('reception');

  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/user"],
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
    { name: "진행상황", active: false },
    { name: "현장조사", active: false },
    { name: "종합진행관리", active: false },
    { name: "통계 및 정산", active: false },
    { name: "관리자 설정", active: false },
  ];

  const prohibitions = [
    "사고·개인정보 외부 전송 금지 (메일/메신저 포함)",
    "승인 전 임의 공사 지시 금지",
    "정산 데이터 수기 가공 금지 (검증 절차 필수)",
  ];

  const inquiries = [
    { title: "정산 반영 지연 문의", status: "처리중" },
    { title: "서류 양식 요청", status: "답변완료" },
  ];

  const handleRemoveFavorite = (favoriteName: string) => {
    setFavorites(favorites.filter(fav => fav.name !== favoriteName));
    toast({
      title: "즐겨찾기 해제",
      description: `"${favoriteName}"이(가) 즐겨찾기에서 제거되었습니다.`,
    });
  };

  const staffData = {
    reception: [
      { name: '김블락', position: '사원', count: 30 },
      { name: '이철수', position: '대리', count: 25 },
      { name: '박영희', position: '과장', count: 20 },
      { name: '정민수', position: '차장', count: 18 },
      { name: '최수진', position: '부장', count: 15 },
      { name: '강동원', position: '사원', count: 12 },
    ],
    pending: [
      { name: '김블락', position: '사원', count: 15 },
      { name: '이철수', position: '대리', count: 12 },
      { name: '박영희', position: '과장', count: 10 },
      { name: '정민수', position: '차장', count: 8 },
      { name: '최수진', position: '부장', count: 7 },
      { name: '강동원', position: '사원', count: 5 },
    ],
    insurance: [
      { name: '김블락', position: '사원', count: 30, amount: 7325000 },
      { name: '이철수', position: '대리', count: 28, amount: 6850000 },
      { name: '박영희', position: '과장', count: 25, amount: 6125000 },
      { name: '정민수', position: '차장', count: 22, amount: 5400000 },
      { name: '최수진', position: '부장', count: 20, amount: 4900000 },
      { name: '강동원', position: '사원', count: 18, amount: 4400000 },
    ],
    partner: [
      { name: '김블락', position: '사원', count: 30, amount: 7325000 },
      { name: '이철수', position: '대리', count: 27, amount: 6625000 },
      { name: '박영희', position: '과장', count: 24, amount: 5875000 },
      { name: '정민수', position: '차장', count: 21, amount: 5145000 },
      { name: '최수진', position: '부장', count: 19, amount: 4650000 },
      { name: '강동원', position: '사원', count: 17, amount: 4165000 },
    ],
  };

  const currentStaffData = staffData[staffTab];

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
              <div className="flex justify-between items-center w-full">
                <div className="flex items-center" style={{ gap: '8px' }}>
                  <span style={{
                    fontFamily: 'Pretendard',
                    fontSize: '26px',
                    fontWeight: 600,
                    lineHeight: '128%',
                    letterSpacing: '-0.02em',
                    color: 'rgba(12, 12, 12, 0.9)',
                  }}>
                    167건
                  </span>
                  <div className="flex items-center justify-center" style={{
                    padding: '6px 10px',
                    background: 'rgba(0, 143, 237, 0.2)',
                    borderRadius: '4px',
                  }}>
                    <span style={{
                      fontFamily: 'Pretendard',
                      fontSize: '12px',
                      fontWeight: 500,
                      lineHeight: '128%',
                      letterSpacing: '-0.01em',
                      color: '#008FED',
                    }}>
                      상승
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-center w-full" style={{
                padding: '12px 10px',
                background: 'rgba(12, 12, 12, 0.05)',
                borderRadius: '8px',
              }}>
                <span style={{
                  fontFamily: 'Pretendard',
                  fontSize: '14px',
                  fontWeight: 400,
                  lineHeight: '128%',
                  letterSpacing: '-0.01em',
                  color: 'rgba(12, 12, 12, 0.7)',
                }}>
                  접수건이 지난 달보다 12.4% 늘었어요
                </span>
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
              <div className="flex justify-between items-center w-full">
                <div className="flex items-center" style={{ gap: '8px' }}>
                  <span style={{
                    fontFamily: 'Pretendard',
                    fontSize: '26px',
                    fontWeight: 600,
                    lineHeight: '128%',
                    letterSpacing: '-0.02em',
                    color: 'rgba(12, 12, 12, 0.9)',
                  }}>
                    167건
                  </span>
                  <div className="flex items-center justify-center" style={{
                    padding: '6px 10px',
                    background: 'rgba(208, 43, 32, 0.08)',
                    borderRadius: '4px',
                  }}>
                    <span style={{
                      fontFamily: 'Pretendard',
                      fontSize: '12px',
                      fontWeight: 500,
                      lineHeight: '128%',
                      letterSpacing: '-0.01em',
                      color: '#D02B20',
                    }}>
                      감소
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 보험사 미정산 */}
            <div className="flex flex-col items-start" style={{ gap: '4px', width: '100%' }}>
              <span style={{
                fontFamily: 'Pretendard',
                fontSize: '14px',
                fontWeight: 500,
                lineHeight: '128%',
                letterSpacing: '-0.01em',
                color: 'rgba(12, 12, 12, 0.5)',
              }}>
                보험사 미정산
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
                  167건
                </span>
                <span style={{
                  fontFamily: 'Pretendard',
                  fontSize: '16px',
                  fontWeight: 400,
                  lineHeight: '128%',
                  letterSpacing: '-0.02em',
                  color: 'rgba(12, 12, 12, 0.7)',
                }}>
                  1,296,000원
                </span>
              </div>
            </div>

            {/* 협력사 미정산 */}
            <div className="flex flex-col items-start" style={{ gap: '4px', width: '100%' }}>
              <span style={{
                fontFamily: 'Pretendard',
                fontSize: '14px',
                fontWeight: 500,
                lineHeight: '128%',
                letterSpacing: '-0.01em',
                color: 'rgba(12, 12, 12, 0.5)',
              }}>
                협력사 미정산
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
                  167건
                </span>
                <span style={{
                  fontFamily: 'Pretendard',
                  fontSize: '16px',
                  fontWeight: 400,
                  lineHeight: '128%',
                  letterSpacing: '-0.02em',
                  color: 'rgba(12, 12, 12, 0.7)',
                }}>
                  1,296,000원
                </span>
              </div>
            </div>
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
                onClick={() => setStaffTab('reception')}
                className="flex items-center justify-center"
                style={{
                  width: '70px',
                  height: '40px',
                  padding: '10px',
                  borderBottom: staffTab === 'reception' ? '2px solid #008FED' : 'none',
                }}
                data-testid="tab-staff-reception"
              >
                <span style={{
                  fontFamily: 'Pretendard',
                  fontSize: '14px',
                  fontWeight: staffTab === 'reception' ? 600 : 400,
                  lineHeight: '128%',
                  letterSpacing: '-0.01em',
                  color: staffTab === 'reception' ? '#0C0C0C' : 'rgba(12, 12, 12, 0.5)',
                }}>
                  접수
                </span>
              </button>
              <button 
                onClick={() => setStaffTab('pending')}
                className="flex items-center justify-center"
                style={{
                  width: '69px',
                  height: '40px',
                  padding: '10px',
                  borderBottom: staffTab === 'pending' ? '2px solid #008FED' : 'none',
                }}
                data-testid="tab-staff-pending"
              >
                <span style={{
                  fontFamily: 'Pretendard',
                  fontSize: '14px',
                  fontWeight: staffTab === 'pending' ? 600 : 400,
                  lineHeight: '128%',
                  letterSpacing: '-0.01em',
                  color: staffTab === 'pending' ? '#0C0C0C' : 'rgba(12, 12, 12, 0.5)',
                }}>
                  미결
                </span>
              </button>
              <button 
                onClick={() => setStaffTab('insurance')}
                className="flex items-center justify-center"
                style={{
                  width: '118px',
                  height: '40px',
                  padding: '10px',
                  flexGrow: 1,
                  borderBottom: staffTab === 'insurance' ? '2px solid #008FED' : 'none',
                }}
                data-testid="tab-staff-insurance"
              >
                <span style={{
                  fontFamily: 'Pretendard',
                  fontSize: '14px',
                  fontWeight: staffTab === 'insurance' ? 600 : 400,
                  lineHeight: '128%',
                  letterSpacing: '-0.01em',
                  color: staffTab === 'insurance' ? '#0C0C0C' : 'rgba(12, 12, 12, 0.5)',
                }}>
                  보험사 미정산
                </span>
              </button>
              <button 
                onClick={() => setStaffTab('partner')}
                className="flex items-center justify-center"
                style={{
                  width: '118px',
                  height: '40px',
                  padding: '10px',
                  flexGrow: 1,
                  borderBottom: staffTab === 'partner' ? '2px solid #008FED' : 'none',
                }}
                data-testid="tab-staff-partner"
              >
                <span style={{
                  fontFamily: 'Pretendard',
                  fontSize: '14px',
                  fontWeight: staffTab === 'partner' ? 600 : 400,
                  lineHeight: '128%',
                  letterSpacing: '-0.01em',
                  color: staffTab === 'partner' ? '#0C0C0C' : 'rgba(12, 12, 12, 0.5)',
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
              {currentStaffData.map((staff, index) => (
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
                    {(staffTab === 'insurance' || staffTab === 'partner') && 'amount' in staff && (
                      <span style={{
                        fontFamily: 'Pretendard',
                        fontSize: '13px',
                        fontWeight: 400,
                        lineHeight: '128%',
                        letterSpacing: '-0.01em',
                        color: 'rgba(12, 12, 12, 0.7)',
                      }}>
                        {staff.amount.toLocaleString('ko-KR')} 원
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Desktop Stats Cards - Original version */}
          <div className="hidden lg:grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-[18px]">
            {/* 접수건 */}
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
                    <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
                      <path d="M0 10L7 0L14 10H0Z" fill="#0C95F6"/>
                    </svg>
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
                        167
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
                  <span
                    style={{
                      fontFamily: 'Pretendard',
                      fontSize: '16px',
                      fontWeight: 500,
                      lineHeight: '128%',
                      letterSpacing: '-0.02em',
                      color: '#0C95F6',
                    }}
                    data-testid="text-received-trend"
                  >
                    전월 대비 +12.4% (18건)
                  </span>
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

            {/* 미결건 */}
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
                    <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
                      <path d="M14 0L7 10L0 0H14Z" fill="#D02B20"/>
                    </svg>
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
                        167
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
                  <span
                    style={{
                      fontFamily: 'Pretendard',
                      fontSize: '16px',
                      fontWeight: 500,
                      lineHeight: '128%',
                      letterSpacing: '-0.02em',
                      color: '#D02B20',
                    }}
                    data-testid="text-pending-trend"
                  >
                    전월 대비 -12.4% (18건)
                  </span>
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

            {/* 보험사 미정산 */}
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
                보험사 미정산
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
                      167
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
                      15,181,650
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

            {/* 협력사 미정산 */}
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
                협력사 미정산
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
                      167
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
                      15,181,650
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
          </div>

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
                      이번 달
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
                  {[
                    { name: '김블락', position: '사원', count: 30 },
                    { name: '이블락', position: '주임', count: 25 },
                    { name: '박블락', position: '대리', count: 28 },
                    { name: '최블락', position: '과장', count: 22 },
                    { name: '정블락', position: '차장', count: 27 },
                    { name: '강블락', position: '부장', count: 24 },
                    { name: '조블락', position: '사원', count: 21 },
                  ].map((item, index) => (
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
                  ))}
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
                }}
                data-testid="card-case-list"
              >
                {[
                  { status: '작성중', statusColor: '#0C95F6', title: 'CASE #CLM-1023 · 세대 누수 (욕실)', accidentNo: '000000000', updated: '업데이트 2시간 전' },
                  { status: '제출', statusColor: '#4CCBA0', title: 'CASE #CLM-1042 · 상가 천장 누수', accidentNo: '000000000', updated: '업데이트 2시간 전' },
                  { status: '작성중', statusColor: '#0C95F6', title: 'CASE #CLM-1055 · 주택 화재', accidentNo: '000000000', updated: '업데이트 3시간 전' },
                  { status: '제출', statusColor: '#4CCBA0', title: 'CASE #CLM-1067 · 사무실 누수', accidentNo: '000000000', updated: '업데이트 5시간 전' },
                ].map((caseItem, index) => (
                  <div
                    key={index}
                    className="flex flex-col gap-3"
                    data-testid={`case-item-${index}`}
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
                            color: caseItem.statusColor,
                          }}
                        >
                          {caseItem.status}
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
                        {caseItem.updated}
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
                          {caseItem.title}
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
                            {caseItem.accidentNo}
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
                ))}
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

          {/* Prohibitions Card */}
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
                  금지사항
                </h3>
                <span 
                  style={{
                    fontFamily: 'Pretendard',
                    fontSize: '15px',
                    fontWeight: 500,
                    letterSpacing: '-0.01em',
                    color: '#D02B20',
                  }}
                >
                  필독
                </span>
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
              {prohibitions.map((item, index) => (
                <div 
                  key={index}
                  className="px-5 py-3"
                  style={{
                    fontFamily: 'Pretendard',
                    fontSize: '16px',
                    fontWeight: 400,
                    letterSpacing: '-0.02em',
                    color: 'rgba(12, 12, 12, 0.9)',
                  }}
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

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
              {favorites.map((item, index) => (
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
                    {item.name}
                  </span>
                  <button
                    onClick={() => handleRemoveFavorite(item.name)}
                    className="cursor-pointer transition-opacity hover:opacity-70"
                    data-testid={`favorite-star-${item.name}`}
                  >
                    <Star className="w-[18px] h-[18px] fill-[#008FED] text-[#008FED]" />
                  </button>
                </div>
              ))}
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
