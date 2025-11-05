import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { User } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Home, Star, LogOut, CalendarPlus, AlertCircle, Building2, Handshake, TrendingUp, TrendingDown, Calendar, ChevronDown } from "lucide-react";
import logoIcon from "@assets/Frame 2_1762217940686.png";

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

  return (
    <div className="relative" style={{ height: '1147px', background: '#E7EDFE' }}>
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

      {/* Header */}
      <header 
        className="relative w-full h-[89px] px-8 flex items-center justify-between"
        style={{
          background: 'rgba(255, 255, 255, 0.06)',
          borderBottom: '1px solid rgba(0, 143, 237, 0.2)',
          backdropFilter: 'blur(22px)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 w-[260px]">
          <img 
            src={logoIcon} 
            alt="FLOXN Logo" 
            className="w-6 h-6"
          />
          <div className="text-2xl font-bold text-gray-900">FLOXN</div>
        </div>

        {/* Navigation Menu */}
        <div className="flex items-center gap-6 flex-1 px-6">
          {menuItems.map((item) => (
            <button
              key={item.name}
              onClick={() => {
                setActiveMenu(item.name);
                if (item.name === "관리자 설정") {
                  setLocation("/admin-settings");
                }
              }}
              className="px-6 py-3 rounded-lg transition-colors"
              style={{
                fontFamily: 'Pretendard',
                fontSize: '18px',
                fontWeight: activeMenu === item.name ? 600 : 500,
                letterSpacing: '-0.02em',
                color: activeMenu === item.name ? '#0C0C0C' : 'rgba(12, 12, 12, 0.5)',
              }}
              data-testid={`menu-${item.name}`}
            >
              {item.name}
            </button>
          ))}
        </div>

        {/* User Profile */}
        <div className="flex items-center gap-3">
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(0, 143, 237, 0.3)' }}
          />
          <div className="flex items-center gap-2">
            <span 
              style={{
                fontFamily: 'Pretendard',
                fontSize: '15px',
                fontWeight: 600,
                letterSpacing: '-0.02em',
                color: 'rgba(12, 12, 12, 0.7)',
              }}
              data-testid="user-info"
            >
              {user.username}
            </span>
            <span 
              style={{
                fontFamily: 'Pretendard',
                fontSize: '15px',
                fontWeight: 500,
                letterSpacing: '-0.01em',
                color: 'rgba(12, 12, 12, 0.4)',
              }}
            >
              관리자
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative flex" style={{ height: 'calc(1147px - 89px)' }}>
        {/* Main Section */}
        <div className="flex-1 px-[92px] py-6">
          <div className="flex items-center justify-between mb-6">
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

          {/* Stats Cards */}
          <div className="flex gap-[18px]">
            {/* 접수건 */}
            <div
              className="flex flex-col"
              style={{
                flex: 1,
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
                flex: 1,
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
                flex: 1,
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
                flex: 1,
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

          {/* Progress Summary Section */}
          <div className="flex flex-col gap-6">
            {/* Section Header */}
            <div 
              className="flex items-center justify-between"
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
              style={{
                width: '861px',
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
                <div className="flex items-center gap-2">
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
        </div>

        {/* Right Sidebar */}
        <div 
          className="flex flex-col gap-3 py-6 pr-8"
          style={{ width: '415px' }}
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
              />
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
                  {user.username}
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
                  사원
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
                {user.username}@example.com
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
    </div>
  );
}
