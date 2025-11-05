import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { User } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Star, Calendar, Plus, AlertCircle, ChevronDown, TrendingUp, TrendingDown } from "lucide-react";
import logoIcon from "@assets/Frame 2_1762217940686.png";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeMenu, setActiveMenu] = useState("홈");
  const [favorites, setFavorites] = useState([
    { name: "홈", path: "/dashboard" },
    { name: "종합진행관리", path: "/dashboard" },
    { name: "관리자 설정", path: "/admin-settings" },
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
    <div className="relative min-h-screen overflow-x-hidden" style={{ background: '#E7EDFE' }}>
      {/* Blur Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
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

      {/* Header */}
      <header 
        className="relative w-full flex items-center"
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
          {menuItems.map((item, index) => (
            <button
              key={item.name}
              onClick={() => handleMenuClick(item)}
              className="flex items-center justify-center transition-colors"
              style={{
                padding: '10px 24px',
                borderRadius: '10px',
                fontFamily: 'Pretendard',
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

        {/* User Profile */}
        <div className="flex items-center" style={{ gap: '12px', height: '32px' }}>
          <div 
            className="rounded-full"
            style={{ 
              width: '32px',
              height: '32px',
              background: 'rgba(0, 143, 237, 0.3)',
            }}
          />
          <div className="flex items-center" style={{ gap: '8px' }}>
            <span 
              style={{
                fontFamily: 'Pretendard',
                fontSize: '15px',
                fontWeight: 600,
                lineHeight: '128%',
                letterSpacing: '-0.02em',
                color: 'rgba(12, 12, 12, 0.7)',
              }}
              data-testid="user-name"
            >
              {user.name || user.username}
            </span>
            <span 
              style={{
                fontFamily: 'Pretendard',
                fontSize: '15px',
                fontWeight: 500,
                lineHeight: '128%',
                letterSpacing: '-0.01em',
                color: 'rgba(12, 12, 12, 0.4)',
              }}
            >
              {user.role === "관리자" ? "관리자" : user.role}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative flex">
        {/* Main Section */}
        <div className="flex-1" style={{ paddingLeft: '92px', paddingRight: '0px' }}>
          {/* 현황 요약 Header */}
          <div className="flex items-center justify-between" style={{ paddingTop: '24px', paddingBottom: '24px', height: '92px' }}>
            <h1 
              style={{
                fontFamily: 'Pretendard',
                fontSize: '20px',
                fontWeight: 600,
                lineHeight: '128%',
                letterSpacing: '-0.02em',
                color: '#0C0C0C',
              }}
            >
              현황 요약
            </h1>
            <div 
              className="flex items-center justify-between"
              style={{
                width: '128px',
                height: '44px',
                padding: '10px 8px',
                background: '#FFFFFF',
                border: '1px solid rgba(12, 12, 12, 0.3)',
                borderRadius: '8px',
                boxSizing: 'border-box',
              }}
            >
              <div className="flex items-center" style={{ gap: '8px' }}>
                <Calendar className="w-[22px] h-[22px]" style={{ color: '#008FED' }} />
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
              <ChevronDown className="w-6 h-6" style={{ color: 'rgba(12, 12, 12, 0.6)' }} />
            </div>
          </div>

          {/* Stats Cards Grid */}
          <div className="flex items-start" style={{ gap: '18px', marginBottom: '89px' }}>
            {/* 접수건 Card */}
            <div
              className="flex flex-col items-start"
              style={{
                flex: '1 1 0',
                padding: '20px',
                gap: '12px',
                height: '147px',
                background: '#FFFFFF',
                boxShadow: '0px 0px 20px #DBE9F5',
                borderRadius: '12px',
              }}
              data-testid="stat-card-reception"
            >
              <div 
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
              </div>
              <div className="flex items-start justify-between w-full">
                <div className="flex flex-col" style={{ gap: '2px' }}>
                  <div className="flex items-center" style={{ gap: '8px' }}>
                    <TrendingUp className="w-[14px] h-[10px]" style={{ color: '#0C95F6' }} />
                    <div className="flex items-center" style={{ gap: '8px' }}>
                      <span 
                        style={{
                          fontFamily: 'Pretendard',
                          fontSize: '38px',
                          fontWeight: 700,
                          lineHeight: '128%',
                          letterSpacing: '-0.02em',
                          color: 'rgba(12, 12, 12, 0.9)',
                        }}
                      >
                        167
                      </span>
                      <span 
                        style={{
                          fontFamily: 'Pretendard',
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
                  </div>
                  <div 
                    style={{
                      fontFamily: 'Pretendard',
                      fontSize: '16px',
                      fontWeight: 500,
                      lineHeight: '128%',
                      letterSpacing: '-0.02em',
                      color: '#0C95F6',
                    }}
                  >
                    전월 대비 +12.4% (18건)
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
                  <Plus className="w-[26px] h-[26px]" style={{ color: '#008FED' }} />
                </div>
              </div>
            </div>

            {/* 미결건 Card */}
            <div
              className="flex flex-col items-start"
              style={{
                flex: '1 1 0',
                padding: '20px',
                gap: '12px',
                height: '147px',
                background: '#FFFFFF',
                boxShadow: '0px 0px 20px #DBE9F5',
                borderRadius: '12px',
              }}
              data-testid="stat-card-pending"
            >
              <div 
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
              </div>
              <div className="flex items-start justify-between w-full">
                <div className="flex flex-col" style={{ gap: '2px' }}>
                  <div className="flex items-center" style={{ gap: '8px' }}>
                    <TrendingDown className="w-[14px] h-[10px]" style={{ color: '#D02B20' }} />
                    <div className="flex items-center" style={{ gap: '8px' }}>
                      <span 
                        style={{
                          fontFamily: 'Pretendard',
                          fontSize: '38px',
                          fontWeight: 700,
                          lineHeight: '128%',
                          letterSpacing: '-0.02em',
                          color: 'rgba(12, 12, 12, 0.9)',
                        }}
                      >
                        42
                      </span>
                      <span 
                        style={{
                          fontFamily: 'Pretendard',
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
                  </div>
                  <div 
                    style={{
                      fontFamily: 'Pretendard',
                      fontSize: '16px',
                      fontWeight: 500,
                      lineHeight: '128%',
                      letterSpacing: '-0.02em',
                      color: '#D02B20',
                    }}
                  >
                    전월 대비 -12.4% (18건)
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
                  <AlertCircle className="w-[26px] h-[26px]" style={{ color: '#008FED' }} />
                </div>
              </div>
            </div>

            {/* 보험사 미정산 Card */}
            <div
              className="flex flex-col items-start"
              style={{
                flex: '1 1 0',
                padding: '20px',
                gap: '12px',
                height: '147px',
                background: '#FFFFFF',
                boxShadow: '0px 0px 20px #DBE9F5',
                borderRadius: '12px',
              }}
              data-testid="stat-card-insurance-unpaid"
            >
              <div 
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
              </div>
              <div className="flex items-start justify-between w-full">
                <div className="flex flex-col justify-center" style={{ gap: '2px', height: '74px' }}>
                  <div className="flex items-center" style={{ gap: '8px' }}>
                    <div className="flex items-center" style={{ gap: '8px' }}>
                      <span 
                        style={{
                          fontFamily: 'Pretendard',
                          fontSize: '38px',
                          fontWeight: 700,
                          lineHeight: '128%',
                          letterSpacing: '-0.02em',
                          color: 'rgba(12, 12, 12, 0.9)',
                        }}
                      >
                        89
                      </span>
                      <span 
                        style={{
                          fontFamily: 'Pretendard',
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
                  </div>
                  <div 
                    style={{
                      fontFamily: 'Pretendard',
                      fontSize: '16px',
                      fontWeight: 500,
                      lineHeight: '128%',
                      letterSpacing: '-0.02em',
                      color: 'rgba(12, 12, 12, 0.7)',
                    }}
                  >
                    총 1,234,567,890 원
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

            {/* 협력사 미정산 Card */}
            <div
              className="flex flex-col items-start"
              style={{
                flex: '1 1 0',
                padding: '20px',
                gap: '12px',
                height: '147px',
                background: '#FFFFFF',
                boxShadow: '0px 0px 20px #DBE9F5',
                borderRadius: '12px',
              }}
              data-testid="stat-card-partner-unpaid"
            >
              <div 
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
              </div>
              <div className="flex items-start justify-between w-full">
                <div className="flex flex-col justify-center" style={{ gap: '2px', height: '74px' }}>
                  <div className="flex items-center" style={{ gap: '8px' }}>
                    <div className="flex items-center" style={{ gap: '8px' }}>
                      <span 
                        style={{
                          fontFamily: 'Pretendard',
                          fontSize: '38px',
                          fontWeight: 700,
                          lineHeight: '128%',
                          letterSpacing: '-0.02em',
                          color: 'rgba(12, 12, 12, 0.9)',
                        }}
                      >
                        56
                      </span>
                      <span 
                        style={{
                          fontFamily: 'Pretendard',
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
                  </div>
                  <div 
                    style={{
                      fontFamily: 'Pretendard',
                      fontSize: '16px',
                      fontWeight: 500,
                      lineHeight: '128%',
                      letterSpacing: '-0.02em',
                      color: 'rgba(12, 12, 12, 0.7)',
                    }}
                  >
                    총 987,654,321 원
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

          {/* 진행건 요약 Header */}
          <div className="flex items-center justify-between" style={{ paddingTop: '24px', paddingBottom: '24px', height: '92px' }}>
            <h1 
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
            </h1>
            <div 
              className="flex items-center justify-between"
              style={{
                width: '128px',
                height: '44px',
                padding: '10px 8px',
                background: '#FFFFFF',
                border: '1px solid rgba(12, 12, 12, 0.3)',
                borderRadius: '8px',
                boxSizing: 'border-box',
              }}
            >
              <div className="flex items-center" style={{ gap: '8px' }}>
                <Calendar className="w-[22px] h-[22px]" style={{ color: '#008FED' }} />
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
              <ChevronDown className="w-6 h-6" style={{ color: 'rgba(12, 12, 12, 0.6)' }} />
            </div>
          </div>

          {/* Progress Cards Grid */}
          <div className="flex items-start pb-6" style={{ gap: '18px' }}>
            {/* 접수 대기 Card */}
            <div
              className="flex flex-col items-start"
              style={{
                flex: '1 1 0',
                padding: '20px',
                gap: '12px',
                height: '147px',
                background: '#FFFFFF',
                boxShadow: '0px 0px 20px #DBE9F5',
                borderRadius: '12px',
              }}
            >
              <div 
                style={{
                  fontFamily: 'Pretendard',
                  fontSize: '14px',
                  fontWeight: 500,
                  lineHeight: '128%',
                  letterSpacing: '-0.01em',
                  color: 'rgba(12, 12, 12, 0.9)',
                }}
              >
                접수 대기
              </div>
              <div className="flex items-start justify-between w-full">
                <div className="flex flex-col" style={{ gap: '2px' }}>
                  <div className="flex items-center" style={{ gap: '8px' }}>
                    <span 
                      style={{
                        fontFamily: 'Pretendard',
                        fontSize: '38px',
                        fontWeight: 700,
                        lineHeight: '128%',
                        letterSpacing: '-0.02em',
                        color: 'rgba(12, 12, 12, 0.9)',
                      }}
                    >
                      12
                    </span>
                    <span 
                      style={{
                        fontFamily: 'Pretendard',
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
                      fontFamily: 'Pretendard',
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
              className="flex flex-col items-start"
              style={{
                flex: '1 1 0',
                padding: '20px',
                gap: '12px',
                height: '147px',
                background: '#FFFFFF',
                boxShadow: '0px 0px 20px #DBE9F5',
                borderRadius: '12px',
              }}
            >
              <div 
                style={{
                  fontFamily: 'Pretendard',
                  fontSize: '14px',
                  fontWeight: 500,
                  lineHeight: '128%',
                  letterSpacing: '-0.01em',
                  color: 'rgba(12, 12, 12, 0.9)',
                }}
              >
                조사중
              </div>
              <div className="flex items-start justify-between w-full">
                <div className="flex flex-col" style={{ gap: '2px' }}>
                  <div className="flex items-center" style={{ gap: '8px' }}>
                    <span 
                      style={{
                        fontFamily: 'Pretendard',
                        fontSize: '38px',
                        fontWeight: 700,
                        lineHeight: '128%',
                        letterSpacing: '-0.02em',
                        color: 'rgba(12, 12, 12, 0.9)',
                      }}
                    >
                      45
                    </span>
                    <span 
                      style={{
                        fontFamily: 'Pretendard',
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
                      fontFamily: 'Pretendard',
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
              className="flex flex-col items-start"
              style={{
                flex: '1 1 0',
                padding: '20px',
                gap: '12px',
                height: '147px',
                background: '#FFFFFF',
                boxShadow: '0px 0px 20px #DBE9F5',
                borderRadius: '12px',
              }}
            >
              <div 
                style={{
                  fontFamily: 'Pretendard',
                  fontSize: '14px',
                  fontWeight: 500,
                  lineHeight: '128%',
                  letterSpacing: '-0.01em',
                  color: 'rgba(12, 12, 12, 0.9)',
                }}
              >
                심사중
              </div>
              <div className="flex items-start justify-between w-full">
                <div className="flex flex-col" style={{ gap: '2px' }}>
                  <div className="flex items-center" style={{ gap: '8px' }}>
                    <span 
                      style={{
                        fontFamily: 'Pretendard',
                        fontSize: '38px',
                        fontWeight: 700,
                        lineHeight: '128%',
                        letterSpacing: '-0.02em',
                        color: 'rgba(12, 12, 12, 0.9)',
                      }}
                    >
                      78
                    </span>
                    <span 
                      style={{
                        fontFamily: 'Pretendard',
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
                      fontFamily: 'Pretendard',
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
              className="flex flex-col items-start"
              style={{
                flex: '1 1 0',
                padding: '20px',
                gap: '12px',
                height: '147px',
                background: '#FFFFFF',
                boxShadow: '0px 0px 20px #DBE9F5',
                borderRadius: '12px',
              }}
            >
              <div 
                style={{
                  fontFamily: 'Pretendard',
                  fontSize: '14px',
                  fontWeight: 500,
                  lineHeight: '128%',
                  letterSpacing: '-0.01em',
                  color: 'rgba(12, 12, 12, 0.9)',
                }}
              >
                완료
              </div>
              <div className="flex items-start justify-between w-full">
                <div className="flex flex-col" style={{ gap: '2px' }}>
                  <div className="flex items-center" style={{ gap: '8px' }}>
                    <span 
                      style={{
                        fontFamily: 'Pretendard',
                        fontSize: '38px',
                        fontWeight: 700,
                        lineHeight: '128%',
                        letterSpacing: '-0.02em',
                        color: 'rgba(12, 12, 12, 0.9)',
                      }}
                    >
                      32
                    </span>
                    <span 
                      style={{
                        fontFamily: 'Pretendard',
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
                      fontFamily: 'Pretendard',
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

        {/* Right Sidebar */}
        <div 
          className="flex flex-col"
          style={{ 
            width: '415px',
            gap: '12px',
            paddingTop: '92px',
            paddingLeft: '0px',
            paddingRight: '92px',
          }}
        >
          {/* My Profile Card */}
          <div
            className="flex flex-col"
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid #FFFFFF',
              boxShadow: '12px 12px 50px #DBE9F5',
              backdropFilter: 'blur(7px)',
              borderRadius: '14px',
              paddingBottom: '32px',
            }}
          >
            <div className="flex items-center justify-between" style={{ padding: '24px 20px' }}>
              <h3 
                style={{
                  fontFamily: 'Pretendard',
                  fontSize: '18px',
                  fontWeight: 600,
                  lineHeight: '128%',
                  letterSpacing: '-0.02em',
                  color: 'rgba(12, 12, 12, 0.8)',
                  margin: '0 auto',
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
                  lineHeight: '128%',
                  letterSpacing: '-0.01em',
                  color: 'rgba(0, 143, 237, 0.8)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  margin: '0 auto',
                }}
                data-testid="button-logout"
              >
                로그아웃
              </button>
            </div>
            
            <div className="flex flex-col items-center" style={{ gap: '12px' }}>
              <div 
                className="flex items-center justify-center rounded-full"
                style={{ 
                  width: '72px',
                  height: '72px',
                  background: 'rgba(0, 143, 237, 0.2)',
                }}
              />
              <div className="flex flex-col items-center" style={{ gap: '4px' }}>
                <div className="flex items-center" style={{ gap: '2px' }}>
                  <span 
                    style={{
                      fontFamily: 'Pretendard',
                      fontSize: '18px',
                      fontWeight: 600,
                      lineHeight: '128%',
                      textAlign: 'center',
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
                      lineHeight: '128%',
                      textAlign: 'center',
                      letterSpacing: '-0.01em',
                      color: 'rgba(12, 12, 12, 0.9)',
                    }}
                  >
                    {user.position || "사원"}
                  </span>
                </div>
                <span 
                  style={{
                    fontFamily: 'Pretendard',
                    fontSize: '15px',
                    fontWeight: 400,
                    lineHeight: '128%',
                    textAlign: 'center',
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
            className="flex flex-col"
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid #FFFFFF',
              boxShadow: '12px 12px 50px #DBE9F5',
              backdropFilter: 'blur(7px)',
              borderRadius: '14px',
              paddingBottom: '16px',
            }}
          >
            <div className="flex items-center justify-between" style={{ padding: '24px 20px', gap: '6px' }}>
              <div className="flex items-center" style={{ gap: '6px', margin: '0 auto' }}>
                <h3 
                  style={{
                    fontFamily: 'Pretendard',
                    fontSize: '18px',
                    fontWeight: 600,
                    lineHeight: '128%',
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
                    lineHeight: '128%',
                    letterSpacing: '-0.01em',
                    color: '#D02B20',
                  }}
                >
                  필독
                </span>
              </div>
              <button
                className="flex items-center justify-center"
                style={{
                  padding: '8px 12px',
                  background: '#FDFDFD',
                  boxShadow: '2px 4px 30px #BDD1F0',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  margin: '0 auto',
                }}
              >
                <span
                  style={{
                    fontFamily: 'Pretendard',
                    fontSize: '15px',
                    fontWeight: 600,
                    lineHeight: '128%',
                    letterSpacing: '-0.02em',
                    color: 'rgba(0, 143, 237, 0.8)',
                  }}
                >
                  더보기
                </span>
              </button>
            </div>
            
            <div className="flex flex-col">
              {prohibitions.map((item, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between"
                  style={{ padding: '12px 20px' }}
                >
                  <span 
                    style={{
                      fontFamily: 'Pretendard',
                      fontSize: '16px',
                      fontWeight: 400,
                      lineHeight: '128%',
                      letterSpacing: '-0.02em',
                      color: 'rgba(12, 12, 12, 0.9)',
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
            className="flex flex-col"
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid #FFFFFF',
              boxShadow: '12px 12px 50px #DBE9F5',
              backdropFilter: 'blur(7px)',
              borderRadius: '14px',
              paddingBottom: '16px',
            }}
          >
            <div className="flex items-center justify-between" style={{ padding: '24px 20px' }}>
              <h3 
                style={{
                  fontFamily: 'Pretendard',
                  fontSize: '18px',
                  fontWeight: 600,
                  lineHeight: '128%',
                  letterSpacing: '-0.02em',
                  color: '#0C0C0C',
                  margin: '0 auto',
                }}
              >
                1:1 문의
              </h3>
              <button
                className="flex items-center justify-center"
                style={{
                  padding: '8px 12px',
                  background: '#FDFDFD',
                  boxShadow: '2px 4px 30px #BDD1F0',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  margin: '0 auto',
                }}
              >
                <span
                  style={{
                    fontFamily: 'Pretendard',
                    fontSize: '15px',
                    fontWeight: 600,
                    lineHeight: '128%',
                    letterSpacing: '-0.02em',
                    color: 'rgba(0, 143, 237, 0.8)',
                  }}
                >
                  새 문의
                </span>
              </button>
            </div>
            
            <div className="flex flex-col">
              {inquiries.map((item, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between"
                  style={{ padding: '12px 20px' }}
                >
                  <span 
                    style={{
                      fontFamily: 'Pretendard',
                      fontSize: '16px',
                      fontWeight: 400,
                      lineHeight: '128%',
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
                      lineHeight: '128%',
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
            className="flex flex-col"
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid #FFFFFF',
              boxShadow: '12px 12px 50px #DBE9F5',
              backdropFilter: 'blur(7px)',
              borderRadius: '14px',
              paddingBottom: '16px',
            }}
          >
            <div className="flex items-center" style={{ padding: '24px 20px' }}>
              <h3 
                style={{
                  fontFamily: 'Pretendard',
                  fontSize: '18px',
                  fontWeight: 600,
                  lineHeight: '128%',
                  letterSpacing: '-0.02em',
                  color: '#0C0C0C',
                }}
              >
                즐겨찾기
              </h3>
            </div>
            
            <div className="flex flex-col">
              {favorites.map((item, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between"
                  style={{ padding: '12px 20px' }}
                >
                  <span 
                    style={{
                      fontFamily: 'Pretendard',
                      fontSize: '16px',
                      fontWeight: 400,
                      lineHeight: '128%',
                      letterSpacing: '-0.02em',
                      color: 'rgba(12, 12, 12, 0.9)',
                    }}
                  >
                    {item.name}
                  </span>
                  <button
                    onClick={() => handleRemoveFavorite(item.name)}
                    className="cursor-pointer transition-opacity hover:opacity-70"
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                    }}
                    data-testid={`favorite-star-${item.name}`}
                  >
                    <Star className="w-[18px] h-[18px] fill-[#008FED]" style={{ color: '#008FED' }} />
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
