import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { User } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Star, Calendar as CalendarIcon, Plus, AlertCircle, ChevronDown, TrendingUp, TrendingDown } from "lucide-react";
import logoIcon from "@assets/Frame 2_1762217940686.png";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ko } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeMenu, setActiveMenu] = useState("홈");
  const [favorites, setFavorites] = useState([
    { name: "홈", path: "/dashboard" },
    { name: "종합진행관리", path: "/dashboard" },
    { name: "관리자 설정", path: "/admin-settings" },
  ]);

  // 날짜 범위 상태 (기본값: 이번 달)
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [tempDateRange, setTempDateRange] = useState<{ from?: Date; to?: Date }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  const { data: stats } = useQuery<{
    totalReception: number;
    totalPending: number;
    insuranceUnsettled: { count: number; amount: string };
    partnerUnsettled: { count: number; amount: string };
    receptionWaiting: number;
    investigating: number;
    reviewing: number;
    completed: number;
  }>({
    queryKey: ["/api/dashboard/stats", dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: format(dateRange.from, "yyyy-MM-dd"),
        endDate: format(dateRange.to, "yyyy-MM-dd"),
      });
      const response = await fetch(`/api/dashboard/stats?${params}`);
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json();
    },
    enabled: !!user,
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
    { name: "홈", path: "/dashboard" },
    { name: "접수하기", path: "/dashboard" },
    { name: "진행상황", path: "/dashboard" },
    { name: "현장조사", path: "/dashboard" },
    { name: "종합진행관리", path: "/dashboard" },
    { name: "통계 및 정산", path: "/dashboard" },
    { name: "관리자 설정", path: "/admin-settings" },
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

  const handleMenuClick = (item: typeof menuItems[0]) => {
    setActiveMenu(item.name);
    if (item.path) {
      setLocation(item.path);
    }
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ background: '#E7EDFE', fontFamily: 'Pretendard' }}>
      {/* Blur Background Orbs - hidden on mobile */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none hidden lg:block">
        {/* Ellipse 3 - Top Left Orange */}
        <div 
          className="absolute"
          style={{
            width: '1095px',
            height: '777px',
            left: '97px',
            bottom: 'calc(100% - 700px)',
            background: 'rgba(254, 240, 230, 0.4)',
            borderRadius: '9999px',
            filter: 'blur(212px)',
            transform: 'rotate(-35.25deg)',
          }}
        />
        {/* Ellipse 2 - Bottom Right Purple */}
        <div 
          className="absolute"
          style={{
            width: '1335px',
            height: '1323px',
            right: 'calc(100% - 2146px)',
            bottom: '0px',
            background: 'rgba(234, 230, 254, 0.5)',
            borderRadius: '9999px',
            filter: 'blur(212px)',
          }}
        />
        {/* Ellipse 4 - Left Purple */}
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

      {/* Header - hidden on mobile */}
      <header 
        className="hidden lg:flex relative w-full items-center"
        style={{
          height: '89px',
          paddingRight: '32px',
          background: 'rgba(255, 255, 255, 0.06)',
          borderBottom: '1px solid rgba(0, 143, 237, 0.2)',
          backdropFilter: 'blur(22px)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center justify-center" style={{ width: '260px', height: '89px' }}>
          <img 
            src={logoIcon} 
            alt="FLOXN Logo" 
            style={{
              width: '138px',
              height: '25px',
              marginLeft: '36px',
            }}
            data-testid="logo"
          />
        </div>

        {/* Navigation Menu */}
        <div className="flex items-center flex-1" style={{ gap: '0px', height: '50px' }}>
          {menuItems.map((item) => (
            <button
              key={item.name}
              onClick={() => handleMenuClick(item)}
              className="flex items-center justify-center transition-colors"
              style={{
                padding: '10px 24px',
                borderRadius: '10px',
                fontSize: '18px',
                fontWeight: activeMenu === item.name ? 600 : 500,
                lineHeight: '128%',
                letterSpacing: '-0.02em',
                color: activeMenu === item.name ? '#0C0C0C' : 'rgba(12, 12, 12, 0.5)',
                whiteSpace: 'nowrap',
              }}
              data-testid={`menu-${item.name}`}
            >
              {item.name}
            </button>
          ))}
        </div>

        {/* Logout Button */}
        <button
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
          className="transition-colors"
          style={{
            padding: '10px 24px',
            borderRadius: '10px',
            fontSize: '16px',
            fontWeight: 500,
            lineHeight: '128%',
            letterSpacing: '-0.02em',
            color: 'rgba(12, 12, 12, 0.7)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
          }}
          data-testid="button-logout"
        >
          로그아웃
        </button>
      </header>

      {/* Mobile Header - visible only on mobile */}
      <header 
        className="lg:hidden relative w-full flex items-center justify-between px-5 py-4"
        style={{
          background: 'rgba(255, 255, 255, 0.06)',
          borderBottom: '1px solid rgba(0, 143, 237, 0.2)',
          backdropFilter: 'blur(22px)',
        }}
      >
        <img 
          src={logoIcon} 
          alt="FLOXN Logo" 
          className="h-6"
          data-testid="logo-mobile"
        />
        <button
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
          className="transition-colors"
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 500,
            lineHeight: '128%',
            letterSpacing: '-0.02em',
            color: 'rgba(12, 12, 12, 0.7)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
          }}
          data-testid="button-logout-mobile"
        >
          로그아웃
        </button>
      </header>

      {/* Main Content */}
      <div className="relative flex flex-col lg:flex-row">
        {/* Mobile Profile Card - visible only on mobile */}
        <div className="lg:hidden w-full flex justify-center pt-5 px-5">
          <div
            className="flex flex-col w-full max-w-[335px]"
            style={{
              background: '#FDFDFD',
              boxShadow: '12px 12px 24px rgba(0, 0, 0, 0.06)',
              backdropFilter: 'blur(7px)',
              borderRadius: '14px',
              paddingBottom: '24px',
            }}
          >
            <div className="flex items-center justify-between px-5 py-6">
              <h3 
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  lineHeight: '128%',
                  letterSpacing: '-0.01em',
                  color: 'rgba(12, 12, 12, 0.8)',
                }}
              >
                내 프로필
              </h3>
              <span
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  lineHeight: '128%',
                  letterSpacing: '-0.01em',
                  color: 'rgba(0, 143, 237, 0.8)',
                }}
              >
                {user.company}({user.role}), {user.position}
              </span>
            </div>
            
            <div className="flex flex-col items-center" style={{ gap: '8px' }}>
              <div className="flex items-center" style={{ gap: '10px' }}>
                <div 
                  className="flex items-center justify-center rounded-full"
                  style={{ 
                    width: '58px',
                    height: '58px',
                    background: 'rgba(0, 143, 237, 0.1)',
                  }}
                />
                <div className="flex flex-col" style={{ gap: '2px' }}>
                  <div className="flex items-center" style={{ gap: '2px' }}>
                    <span 
                      style={{
                        fontSize: '15px',
                        fontWeight: 600,
                        lineHeight: '128%',
                        letterSpacing: '-0.02em',
                        color: '#0C0C0C',
                      }}
                    >
                      {user.name || user.username}
                    </span>
                    <span 
                      style={{
                        fontSize: '13px',
                        fontWeight: 400,
                        lineHeight: '128%',
                        letterSpacing: '-0.01em',
                        color: 'rgba(12, 12, 12, 0.9)',
                      }}
                    >
                      {user.position || "사원"}
                    </span>
                  </div>
                  <span 
                    style={{
                      fontSize: '14px',
                      fontWeight: 400,
                      lineHeight: '128%',
                      letterSpacing: '-0.01em',
                      color: 'rgba(12, 12, 12, 0.7)',
                    }}
                  >
                    {user.email || `${user.username}@example.com`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Section */}
        <div className="flex-1 px-5 lg:px-0 lg:pl-[92px] pt-5 lg:pt-0">
          {/* 현황 요약 Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between py-4 lg:py-6">
            <h1 
              className="text-lg lg:text-xl font-semibold"
              style={{
                letterSpacing: '-0.02em',
                color: 'rgba(12, 12, 12, 0.9)',
              }}
            >
              현황 요약
            </h1>
            <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
              <PopoverTrigger asChild>
                <div 
                  className="flex items-center justify-between mt-3 lg:mt-0 px-3 lg:px-2 py-2 lg:py-2.5 bg-white border rounded-lg lg:rounded-lg cursor-pointer hover-elevate"
                  style={{
                    borderColor: 'rgba(12, 12, 12, 0.3)',
                    width: '100%',
                    maxWidth: '100%',
                  }}
                  data-testid="button-date-range"
                >
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-[18px] h-[18px] lg:w-[22px] lg:h-[22px]" style={{ color: '#008FED' }} />
                    <span 
                      className="text-sm lg:text-base font-medium"
                      style={{
                        letterSpacing: '-0.02em',
                        color: 'rgba(12, 12, 12, 0.8)',
                      }}
                    >
                      {format(dateRange.from, "yyyy.MM.dd", { locale: ko })} - {format(dateRange.to, "yyyy.MM.dd", { locale: ko })}
                    </span>
                  </div>
                  <ChevronDown className="w-5 h-5 lg:w-6 lg:h-6" style={{ color: 'rgba(12, 12, 12, 0.6)' }} />
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <div className="p-4 space-y-4">
                  <div className="space-y-2">
                    <div className="text-sm font-medium" style={{ color: 'rgba(12, 12, 12, 0.8)' }}>
                      시작일
                    </div>
                    <Calendar
                      mode="single"
                      selected={tempDateRange.from}
                      onSelect={(date) => setTempDateRange({ ...tempDateRange, from: date })}
                      locale={ko}
                      className="rounded-md border"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium" style={{ color: 'rgba(12, 12, 12, 0.8)' }}>
                      종료일
                    </div>
                    <Calendar
                      mode="single"
                      selected={tempDateRange.to}
                      onSelect={(date) => setTempDateRange({ ...tempDateRange, to: date })}
                      disabled={(date) => tempDateRange.from ? date < tempDateRange.from : false}
                      locale={ko}
                      className="rounded-md border"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        const now = new Date();
                        const range = {
                          from: startOfMonth(now),
                          to: endOfMonth(now),
                        };
                        setTempDateRange(range);
                        setDateRange(range);
                        setIsDatePickerOpen(false);
                      }}
                      data-testid="button-this-month"
                    >
                      이번 달
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => {
                        if (tempDateRange.from && tempDateRange.to) {
                          setDateRange({
                            from: tempDateRange.from,
                            to: tempDateRange.to,
                          });
                          setIsDatePickerOpen(false);
                        }
                      }}
                      disabled={!tempDateRange.from || !tempDateRange.to}
                      data-testid="button-apply-date"
                    >
                      적용
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Stats Cards - Mobile: Column, Desktop: Row */}
          <div className="flex flex-col lg:flex-row lg:items-start gap-3 lg:gap-[18px] mb-6 lg:mb-[89px]">
            {/* 접수건 Card */}
            <div
              className="flex flex-col p-5 gap-1 lg:gap-3 bg-white rounded-xl lg:rounded-xl lg:flex-1"
              style={{
                boxShadow: '0px 0px 20px #DBE9F5',
                minHeight: '105px',
              }}
              data-testid="stat-card-reception"
            >
              <div 
                className="text-sm font-medium"
                style={{
                  letterSpacing: '-0.01em',
                  color: 'rgba(12, 12, 12, 0.5)',
                }}
              >
                접수건
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span 
                    className="text-2xl lg:text-[38px] font-semibold"
                    style={{
                      letterSpacing: '-0.02em',
                      color: 'rgba(12, 12, 12, 0.9)',
                    }}
                  >
                    {stats?.totalReception || 0}건
                  </span>
                </div>
                <div 
                  className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded"
                  style={{
                    background: 'rgba(0, 143, 237, 0.2)',
                  }}
                >
                  <span 
                    className="text-xs font-medium"
                    style={{
                      letterSpacing: '-0.01em',
                      color: '#008FED',
                    }}
                  >
                    접수건
                  </span>
                  <TrendingUp className="w-4 h-4" style={{ color: '#0C0C0C' }} />
                </div>
              </div>
              <div 
                className="px-2.5 py-3 rounded-lg text-center"
                style={{
                  background: 'rgba(12, 12, 12, 0.05)',
                }}
              >
                <span 
                  className="text-sm font-normal"
                  style={{
                    letterSpacing: '-0.01em',
                    color: 'rgba(12, 12, 12, 0.7)',
                  }}
                >
                  접수건이 지난 달보다 12.4% 늘었어요
                </span>
              </div>
            </div>

            {/* 미결건 Card */}
            <div
              className="flex flex-col p-5 gap-1 lg:gap-3 bg-white rounded-xl lg:rounded-xl lg:flex-1"
              style={{
                boxShadow: '0px 0px 20px #DBE9F5',
                minHeight: '105px',
              }}
              data-testid="stat-card-pending"
            >
              <div 
                className="text-sm font-medium"
                style={{
                  letterSpacing: '-0.01em',
                  color: 'rgba(12, 12, 12, 0.5)',
                }}
              >
                미결건
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span 
                    className="text-2xl lg:text-[38px] font-semibold"
                    style={{
                      letterSpacing: '-0.02em',
                      color: 'rgba(12, 12, 12, 0.9)',
                    }}
                  >
                    {stats?.totalPending || 0}건
                  </span>
                </div>
                <div 
                  className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded"
                  style={{
                    background: 'rgba(208, 43, 32, 0.08)',
                  }}
                >
                  <span 
                    className="text-xs font-medium"
                    style={{
                      letterSpacing: '-0.01em',
                      color: '#D02B20',
                    }}
                  >
                    미결건
                  </span>
                  <TrendingDown className="w-4 h-4" style={{ color: '#0C0C0C' }} />
                </div>
              </div>
            </div>

            {/* 보험사 미정산 Card - Desktop only */}
            <div
              className="hidden lg:flex flex-col p-5 gap-3 bg-white rounded-xl flex-1"
              style={{
                boxShadow: '0px 0px 20px #DBE9F5',
                height: '147px',
              }}
              data-testid="stat-card-insurance-unpaid"
            >
              <div 
                className="text-sm font-medium"
                style={{
                  letterSpacing: '-0.01em',
                  color: 'rgba(12, 12, 12, 0.9)',
                }}
              >
                보험사 미정산
              </div>
              <div className="flex items-start justify-between w-full">
                <div className="flex flex-col justify-center" style={{ gap: '2px', height: '74px' }}>
                  <div className="flex items-center" style={{ gap: '8px' }}>
                    <span 
                      style={{
                        fontSize: '38px',
                        fontWeight: 700,
                        lineHeight: '128%',
                        letterSpacing: '-0.02em',
                        color: 'rgba(12, 12, 12, 0.9)',
                      }}
                    >
                      {stats?.insuranceUnsettled?.count || 0}
                    </span>
                    <span 
                      style={{
                        fontSize: '18px',
                        fontWeight: 400,
                        lineHeight: '128%',
                        letterSpacing: '-0.02em',
                        color: 'rgba(12, 12, 12, 0.6)',
                        paddingTop: '26px',
                      }}
                    >
                      건
                    </span>
                  </div>
                  <div 
                    style={{
                      fontSize: '16px',
                      fontWeight: 500,
                      lineHeight: '128%',
                      letterSpacing: '-0.02em',
                      color: 'rgba(12, 12, 12, 0.7)',
                    }}
                  >
                    총 {parseInt(stats?.insuranceUnsettled?.amount || "0").toLocaleString()} 원
                  </div>
                </div>
                <div 
                  className="flex items-center justify-center rounded-full"
                  style={{
                    width: '60px',
                    height: '60px',
                    background: 'rgba(0, 143, 237, 0.2)',
                  }}
                >
                  <span style={{ fontSize: '24px' }}>₩</span>
                </div>
              </div>
            </div>

            {/* 협력사 미정산 Card - Desktop only */}
            <div
              className="hidden lg:flex flex-col p-5 gap-3 bg-white rounded-xl flex-1"
              style={{
                boxShadow: '0px 0px 20px #DBE9F5',
                height: '147px',
              }}
              data-testid="stat-card-partner-unpaid"
            >
              <div 
                className="text-sm font-medium"
                style={{
                  letterSpacing: '-0.01em',
                  color: 'rgba(12, 12, 12, 0.9)',
                }}
              >
                협력사 미정산
              </div>
              <div className="flex items-start justify-between w-full">
                <div className="flex flex-col justify-center" style={{ gap: '2px', height: '74px' }}>
                  <div className="flex items-center" style={{ gap: '8px' }}>
                    <span 
                      style={{
                        fontSize: '38px',
                        fontWeight: 700,
                        lineHeight: '128%',
                        letterSpacing: '-0.02em',
                        color: 'rgba(12, 12, 12, 0.9)',
                      }}
                    >
                      {stats?.partnerUnsettled?.count || 0}
                    </span>
                    <span 
                      style={{
                        fontSize: '18px',
                        fontWeight: 400,
                        lineHeight: '128%',
                        letterSpacing: '-0.02em',
                        color: 'rgba(12, 12, 12, 0.6)',
                        paddingTop: '26px',
                      }}
                    >
                      건
                    </span>
                  </div>
                  <div 
                    style={{
                      fontSize: '16px',
                      fontWeight: 500,
                      lineHeight: '128%',
                      letterSpacing: '-0.02em',
                      color: 'rgba(12, 12, 12, 0.7)',
                    }}
                  >
                    총 {parseInt(stats?.partnerUnsettled?.amount || "0").toLocaleString()} 원
                  </div>
                </div>
                <div 
                  className="flex items-center justify-center rounded-full"
                  style={{
                    width: '60px',
                    height: '60px',
                    background: 'rgba(0, 143, 237, 0.2)',
                  }}
                >
                  <span style={{ fontSize: '24px' }}>₩</span>
                </div>
              </div>
            </div>
          </div>

          {/* 진행건 요약 Header - Desktop only */}
          <div className="hidden lg:flex items-center justify-between py-6">
            <h1 
              className="text-xl font-semibold"
              style={{
                letterSpacing: '-0.02em',
                color: '#0C0C0C',
              }}
            >
              진행건 요약
            </h1>
            <div 
              className="flex items-center justify-between px-2 py-2.5 bg-white border rounded-lg"
              style={{
                width: '128px',
                borderColor: 'rgba(12, 12, 12, 0.3)',
              }}
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-[22px] h-[22px]" style={{ color: '#008FED' }} />
                <span 
                  className="text-base font-medium"
                  style={{
                    letterSpacing: '-0.02em',
                    color: 'rgba(12, 12, 12, 0.9)',
                  }}
                >
                  이번 달
                </span>
              </div>
              <ChevronDown className="w-6 h-6" style={{ color: 'rgba(12, 12, 12, 0.6)' }} />
            </div>
          </div>

          {/* Progress Cards Grid - Desktop only */}
          <div className="hidden lg:flex items-start pb-6 gap-[18px]">
            {/* 접수 대기 Card */}
            <div
              className="flex flex-col flex-1 p-5 gap-3 bg-white rounded-xl"
              style={{
                boxShadow: '0px 0px 20px #DBE9F5',
                height: '147px',
              }}
            >
              <div 
                className="text-sm font-medium"
                style={{
                  letterSpacing: '-0.01em',
                  color: 'rgba(12, 12, 12, 0.9)',
                }}
              >
                접수 대기
              </div>
              <div className="flex items-start justify-between w-full">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span 
                      style={{
                        fontSize: '38px',
                        fontWeight: 700,
                        lineHeight: '128%',
                        letterSpacing: '-0.02em',
                        color: 'rgba(12, 12, 12, 0.9)',
                      }}
                    >
                      {stats?.receptionWaiting || 0}
                    </span>
                    <span 
                      style={{
                        fontSize: '18px',
                        fontWeight: 400,
                        lineHeight: '128%',
                        letterSpacing: '-0.02em',
                        color: 'rgba(12, 12, 12, 0.6)',
                        paddingTop: '26px',
                      }}
                    >
                      건
                    </span>
                  </div>
                  <div 
                    style={{
                      fontSize: '16px',
                      fontWeight: 500,
                      lineHeight: '128%',
                      letterSpacing: '-0.02em',
                      color: 'rgba(12, 12, 12, 0.7)',
                    }}
                  >
                    전체 대비 7.2%
                  </div>
                </div>
              </div>
            </div>

            {/* 조사중 Card */}
            <div
              className="flex flex-col flex-1 p-5 gap-3 bg-white rounded-xl"
              style={{
                boxShadow: '0px 0px 20px #DBE9F5',
                height: '147px',
              }}
            >
              <div 
                className="text-sm font-medium"
                style={{
                  letterSpacing: '-0.01em',
                  color: 'rgba(12, 12, 12, 0.9)',
                }}
              >
                조사중
              </div>
              <div className="flex items-start justify-between w-full">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span 
                      style={{
                        fontSize: '38px',
                        fontWeight: 700,
                        lineHeight: '128%',
                        letterSpacing: '-0.02em',
                        color: 'rgba(12, 12, 12, 0.9)',
                      }}
                    >
                      {stats?.investigating || 0}
                    </span>
                    <span 
                      style={{
                        fontSize: '18px',
                        fontWeight: 400,
                        lineHeight: '128%',
                        letterSpacing: '-0.02em',
                        color: 'rgba(12, 12, 12, 0.6)',
                        paddingTop: '26px',
                      }}
                    >
                      건
                    </span>
                  </div>
                  <div 
                    style={{
                      fontSize: '16px',
                      fontWeight: 500,
                      lineHeight: '128%',
                      letterSpacing: '-0.02em',
                      color: 'rgba(12, 12, 12, 0.7)',
                    }}
                  >
                    전체 대비 26.9%
                  </div>
                </div>
              </div>
            </div>

            {/* 심사중 Card */}
            <div
              className="flex flex-col flex-1 p-5 gap-3 bg-white rounded-xl"
              style={{
                boxShadow: '0px 0px 20px #DBE9F5',
                height: '147px',
              }}
            >
              <div 
                className="text-sm font-medium"
                style={{
                  letterSpacing: '-0.01em',
                  color: 'rgba(12, 12, 12, 0.9)',
                }}
              >
                심사중
              </div>
              <div className="flex items-start justify-between w-full">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span 
                      style={{
                        fontSize: '38px',
                        fontWeight: 700,
                        lineHeight: '128%',
                        letterSpacing: '-0.02em',
                        color: 'rgba(12, 12, 12, 0.9)',
                      }}
                    >
                      {stats?.reviewing || 0}
                    </span>
                    <span 
                      style={{
                        fontSize: '18px',
                        fontWeight: 400,
                        lineHeight: '128%',
                        letterSpacing: '-0.02em',
                        color: 'rgba(12, 12, 12, 0.6)',
                        paddingTop: '26px',
                      }}
                    >
                      건
                    </span>
                  </div>
                  <div 
                    style={{
                      fontSize: '16px',
                      fontWeight: 500,
                      lineHeight: '128%',
                      letterSpacing: '-0.02em',
                      color: 'rgba(12, 12, 12, 0.7)',
                    }}
                  >
                    전체 대비 46.7%
                  </div>
                </div>
              </div>
            </div>

            {/* 완료 Card */}
            <div
              className="flex flex-col flex-1 p-5 gap-3 bg-white rounded-xl"
              style={{
                boxShadow: '0px 0px 20px #DBE9F5',
                height: '147px',
              }}
            >
              <div 
                className="text-sm font-medium"
                style={{
                  letterSpacing: '-0.01em',
                  color: 'rgba(12, 12, 12, 0.9)',
                }}
              >
                완료
              </div>
              <div className="flex items-start justify-between w-full">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span 
                      style={{
                        fontSize: '38px',
                        fontWeight: 700,
                        lineHeight: '128%',
                        letterSpacing: '-0.02em',
                        color: 'rgba(12, 12, 12, 0.9)',
                      }}
                    >
                      {stats?.completed || 0}
                    </span>
                    <span 
                      style={{
                        fontSize: '18px',
                        fontWeight: 400,
                        lineHeight: '128%',
                        letterSpacing: '-0.02em',
                        color: 'rgba(12, 12, 12, 0.6)',
                        paddingTop: '26px',
                      }}
                    >
                      건
                    </span>
                  </div>
                  <div 
                    style={{
                      fontSize: '16px',
                      fontWeight: 500,
                      lineHeight: '128%',
                      letterSpacing: '-0.02em',
                      color: 'rgba(12, 12, 12, 0.7)',
                    }}
                  >
                    전체 대비 19.2%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Desktop only */}
        <div 
          className="hidden lg:flex flex-col gap-3 pt-[92px] pr-[92px]"
          style={{ 
            width: '415px',
          }}
        >
          {/* My Profile Card */}
          <div
            className="flex flex-col pb-8"
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid #FFFFFF',
              boxShadow: '12px 12px 50px #DBE9F5',
              backdropFilter: 'blur(7px)',
              borderRadius: '14px',
            }}
          >
            <div className="flex items-center justify-between px-5 py-6">
              <h3 
                className="text-lg font-semibold"
                style={{
                  letterSpacing: '-0.02em',
                  color: 'rgba(12, 12, 12, 0.8)',
                }}
              >
                내 프로필
              </h3>
              <button
                onClick={() => logoutMutation.mutate()}
                className="text-[15px] font-medium"
                style={{
                  letterSpacing: '-0.01em',
                  color: 'rgba(0, 143, 237, 0.8)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
                data-testid="button-logout"
              >
                로그아웃
              </button>
            </div>
            
            <div className="flex flex-col items-center gap-3">
              <div 
                className="flex items-center justify-center rounded-full"
                style={{ 
                  width: '72px',
                  height: '72px',
                  background: 'rgba(0, 143, 237, 0.2)',
                }}
              />
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-0.5">
                  <span 
                    className="text-lg font-semibold text-center"
                    style={{
                      letterSpacing: '-0.02em',
                      color: '#0C0C0C',
                    }}
                  >
                    {user.name || user.username}
                  </span>
                  <span 
                    className="text-[15px] font-normal text-center"
                    style={{
                      letterSpacing: '-0.01em',
                      color: 'rgba(12, 12, 12, 0.9)',
                    }}
                  >
                    {user.position || "사원"}
                  </span>
                </div>
                <span 
                  className="text-[15px] font-normal text-center"
                  style={{
                    letterSpacing: '-0.01em',
                    color: 'rgba(12, 12, 12, 0.7)',
                  }}
                >
                  {user.email || `${user.username}@example.com`}
                </span>
              </div>
            </div>
          </div>

          {/* Prohibitions Card */}
          <div
            className="flex flex-col pb-4"
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid #FFFFFF',
              boxShadow: '12px 12px 50px #DBE9F5',
              backdropFilter: 'blur(7px)',
              borderRadius: '14px',
            }}
          >
            <div className="flex items-center justify-between px-5 py-6">
              <div className="flex items-center gap-1.5">
                <h3 
                  className="text-lg font-semibold"
                  style={{
                    letterSpacing: '-0.02em',
                    color: '#0C0C0C',
                  }}
                >
                  금지사항
                </h3>
                <span 
                  className="text-[15px] font-medium"
                  style={{
                    letterSpacing: '-0.01em',
                    color: '#D02B20',
                  }}
                >
                  필독
                </span>
              </div>
              <button
                className="flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium"
                style={{
                  background: '#FDFDFD',
                  boxShadow: '2px 4px 30px #BDD1F0',
                  letterSpacing: '-0.01em',
                  color: 'rgba(12, 12, 12, 0.9)',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                더보기
              </button>
            </div>
            
            <div className="flex flex-col px-5 gap-4">
              {prohibitions.map((item, index) => (
                <div key={index} className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#D02B20' }} />
                  <span 
                    className="text-sm font-normal"
                    style={{
                      letterSpacing: '-0.01em',
                      color: 'rgba(12, 12, 12, 0.8)',
                      lineHeight: '1.5',
                    }}
                  >
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 1:1 Inquiry Card */}
          <div
            className="flex flex-col pb-4"
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid #FFFFFF',
              boxShadow: '12px 12px 50px #DBE9F5',
              backdropFilter: 'blur(7px)',
              borderRadius: '14px',
            }}
          >
            <div className="flex items-center justify-between px-5 py-6">
              <h3 
                className="text-lg font-semibold"
                style={{
                  letterSpacing: '-0.02em',
                  color: 'rgba(12, 12, 12, 0.8)',
                }}
              >
                1:1 문의
              </h3>
              <button
                className="flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium gap-1"
                style={{
                  background: '#FDFDFD',
                  boxShadow: '2px 4px 30px #BDD1F0',
                  letterSpacing: '-0.01em',
                  color: 'rgba(12, 12, 12, 0.9)',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <Plus className="w-4 h-4" />
                새 문의
              </button>
            </div>
            
            <div className="flex flex-col px-5 gap-3">
              {inquiries.map((inquiry, index) => (
                <div 
                  key={index}
                  className="flex items-start justify-between p-3 rounded-lg"
                  style={{
                    background: 'rgba(255, 255, 255, 0.5)',
                  }}
                >
                  <span 
                    className="text-sm font-medium"
                    style={{
                      letterSpacing: '-0.01em',
                      color: 'rgba(12, 12, 12, 0.9)',
                    }}
                  >
                    {inquiry.title}
                  </span>
                  <span 
                    className="text-xs font-medium px-2 py-1 rounded"
                    style={{
                      letterSpacing: '-0.01em',
                      color: inquiry.status === "처리중" ? '#008FED' : '#4CAF50',
                      background: inquiry.status === "처리중" ? 'rgba(0, 143, 237, 0.1)' : 'rgba(76, 175, 80, 0.1)',
                    }}
                  >
                    {inquiry.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Favorites Card */}
          <div
            className="flex flex-col pb-4"
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid #FFFFFF',
              boxShadow: '12px 12px 50px #DBE9F5',
              backdropFilter: 'blur(7px)',
              borderRadius: '14px',
            }}
          >
            <div className="flex items-center justify-between px-5 py-6">
              <h3 
                className="text-lg font-semibold"
                style={{
                  letterSpacing: '-0.02em',
                  color: 'rgba(12, 12, 12, 0.8)',
                }}
              >
                즐겨찾기
              </h3>
            </div>
            
            <div className="flex flex-col px-5 gap-2">
              {favorites.map((fav, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-white/30 transition-colors"
                  onClick={() => setLocation(fav.path)}
                >
                  <span 
                    className="text-sm font-medium"
                    style={{
                      letterSpacing: '-0.01em',
                      color: 'rgba(12, 12, 12, 0.9)',
                    }}
                  >
                    {fav.name}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFavorite(fav.name);
                    }}
                    data-testid={`favorite-star-${fav.name}`}
                  >
                    <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
