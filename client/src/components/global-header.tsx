import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { User } from "@shared/schema";
import logoIcon from "@assets/Frame 2_1762217940686.png";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/use-permissions";

export function GlobalHeader() {
  const [, setLocation] = useLocation();
  const [location] = useLocation();
  const { toast } = useToast();
  const { hasCategory, isLoading: permissionsLoading } = usePermissions();

  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  const logoutMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/logout", {}),
    onSuccess: () => {
      setLocation("/");
    },
    onError: () => {
      toast({
        title: "로그아웃 실패",
        description: "다시 시도해주세요.",
        variant: "destructive",
      });
    },
  });

  // All possible menu items with their permission categories
  const allMenuItems = [
    { name: "홈", category: "홈" },
    { name: "접수하기", category: "새로운접수" },
    { name: "현장조사", category: "현장조사" },
    { name: "종합진행관리", category: "종합진행관리" },
    { name: "통계 및 정산", category: "통계 및 정산" },
    { name: "관리자 설정", category: "관리자 설정" },
  ];

  // Filter menu items based on user permissions
  const menuItems = allMenuItems.filter((item) => {
    // Don't show any menu items while loading permissions
    if (permissionsLoading) return false;
    return hasCategory(item.category);
  });

  const getActiveMenu = () => {
    if (location === "/dashboard") return "홈";
    if (location === "/intake") return "접수하기";
    if (location.startsWith("/field-survey")) return "현장조사";
    if (location === "/comprehensive-progress") return "종합진행관리";
    if (location.startsWith("/statistics") || location === "/settlements") return "통계 및 정산";
    if (location === "/admin-settings") return "관리자 설정";
    return "";
  };

  const activeMenu = getActiveMenu();

  if (!user) {
    return null;
  }

  return (
    <>
      {/* Mobile Header */}
      <header 
        className="lg:hidden flex items-center justify-between relative w-full"
        style={{
          background: 'rgba(255, 255, 255, 0.06)',
          backdropFilter: 'blur(22px)',
          borderBottom: '1px solid rgba(0, 143, 237, 0.2)',
          height: '58px',
          padding: '0px 20px',
          gap: '230px',
        }}
      >
        {/* Logo */}
        <div 
          className="flex flex-col items-start"
          style={{
            padding: '0px 12px',
            gap: '10px',
            width: '52px',
            height: '26px',
            filter: 'drop-shadow(0px 0px 20px #DBE9F5)',
          }}
        >
          <img 
            src={logoIcon} 
            alt="FLOXN Logo" 
            style={{
              width: '28px',
              height: '26px',
            }}
          />
        </div>

        {/* Logout Button */}
        <button
          type="button"
          onClick={() => logoutMutation.mutate()}
          className="flex items-center justify-center"
          style={{
            padding: '6px 12px',
            gap: '10px',
            width: '76px',
            height: '31px',
            background: 'rgba(253, 253, 253, 0.1)',
            borderRadius: '6px',
          }}
          data-testid="button-mobile-logout"
        >
          <span
            style={{
              width: '52px',
              height: '19px',
              fontFamily: 'Pretendard',
              fontStyle: 'normal',
              fontWeight: 500,
              fontSize: '15px',
              lineHeight: '128%',
              letterSpacing: '-0.01em',
              textDecoration: 'underline',
              color: 'rgba(12, 12, 12, 0.7)',
            }}
          >
            로그아웃
          </span>
        </button>
      </header>

      {/* Desktop Header */}
      <header 
        className="hidden lg:flex relative w-full h-[89px] px-8 items-center justify-between"
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
              type="button"
              key={item.name}
              onClick={() => {
                if (item.name === "홈") {
                  setLocation("/dashboard");
                } else if (item.name === "접수하기") {
                  setLocation("/intake");
                } else if (item.name === "현장조사") {
                  setLocation("/field-survey/management");
                } else if (item.name === "종합진행관리") {
                  setLocation("/comprehensive-progress");
                } else if (item.name === "관리자 설정") {
                  setLocation("/admin-settings");
                } else if (item.name === "통계 및 정산") {
                  setLocation("/statistics");
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
              data-testid="user-position"
            >
              {user.position || user.role || "사용자"}
            </span>
          </div>
        </div>
      </header>
    </>
  );
}
