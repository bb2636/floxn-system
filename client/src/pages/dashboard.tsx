import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { User } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Home, Star, LogOut } from "lucide-react";
import logoIcon from "@assets/Frame 2_1762217940686.png";

export default function Dashboard() {
  const [, setLocation] = useLocation();
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
            <div 
              className="flex items-center gap-2 px-2 py-2 bg-white rounded-lg"
              style={{
                border: '1px solid rgba(12, 12, 12, 0.3)',
              }}
            >
              <span 
                style={{
                  fontFamily: 'Pretendard',
                  fontSize: '16px',
                  fontWeight: 500,
                  letterSpacing: '-0.02em',
                  color: '#0C0C0C',
                }}
              >
                이번 달
              </span>
            </div>
          </div>

          {/* Stats Cards Placeholder */}
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="p-6 rounded-xl"
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: '1px solid #FFFFFF',
                  boxShadow: '12px 12px 50px #DBE9F5',
                  backdropFilter: 'blur(7px)',
                }}
              >
                <div 
                  style={{
                    fontFamily: 'Pretendard',
                    fontSize: '16px',
                    fontWeight: 600,
                    color: 'rgba(12, 12, 12, 0.8)',
                  }}
                >
                  통계 카드 {i}
                </div>
                <div 
                  className="mt-4"
                  style={{
                    fontFamily: 'Pretendard',
                    fontSize: '32px',
                    fontWeight: 700,
                    color: '#0C0C0C',
                  }}
                >
                  0
                </div>
              </div>
            ))}
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
