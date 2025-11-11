import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { User } from "@shared/schema";
import logoIcon from "@assets/Frame 2_1762217940686.png";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function GlobalHeader() {
  const [, setLocation] = useLocation();
  const [location] = useLocation();
  const { toast } = useToast();

  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  const menuItems = [
    { name: "홈", path: "/dashboard" },
    { name: "접수하기", path: "/intake" },
    { name: "진행상황", path: "/progress" },
    { name: "현장조사", path: "#" },
    { name: "종합진행관리", path: "/comprehensive-progress" },
    { name: "통계 및 정산", path: "/statistics" },
    { name: "관리자 설정", path: "/admin-settings" },
  ];

  const handleMenuClick = (menuName: string, path: string) => {
    if (path !== "#") {
      setLocation(path);
    }
  };

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/logout", {});
      setLocation("/");
    } catch (error) {
      toast({
        title: "로그아웃 실패",
        description: "로그아웃 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const getActiveMenu = () => {
    if (location === "/dashboard") return "홈";
    if (location === "/intake") return "접수하기";
    if (location === "/progress") return "진행상황";
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
      {/* 데스크톱 헤더 (>= 1024px) */}
      <header className="hidden lg:flex items-center justify-between px-8 h-[89px] bg-white/60 backdrop-blur-[7px] border-b border-[rgba(0,143,237,0.2)] relative z-10">
        <div className="flex items-center gap-8">
          <img
            src={logoIcon}
            alt="FLOXN 로고"
            className="h-8 cursor-pointer"
            onClick={() => setLocation("/dashboard")}
            data-testid="logo-header"
          />
          <nav className="flex items-center gap-2">
            {menuItems.map((item) => (
              <button
                key={item.name}
                onClick={() => handleMenuClick(item.name, item.path)}
                className={`px-4 py-2 text-[15px] font-medium leading-[128%] tracking-[-0.01em] rounded-[10px] transition-all ${
                  activeMenu === item.name
                    ? "text-[#008FED] bg-[rgba(12,12,12,0.08)]"
                    : "text-[rgba(12,12,12,0.5)] hover:text-[rgba(12,12,12,0.8)] hover:bg-[rgba(12,12,12,0.04)]"
                }`}
                data-testid={`nav-${item.name}`}
              >
                {item.name}
              </button>
            ))}
          </nav>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-[rgba(12,12,12,0.04)] transition-colors"
              data-testid="user-menu-trigger"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#008FED] to-[#A855F7] flex items-center justify-center text-white font-semibold text-sm">
                {user.name.charAt(0)}
              </div>
              <div className="flex flex-col items-start">
                <div className="text-sm font-semibold text-[#0C0C0C]">
                  {user.name}
                </div>
                <div className="text-xs text-[rgba(12,12,12,0.5)]">
                  {user.role}
                </div>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={handleLogout} data-testid="button-logout">
              로그아웃
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* 모바일 헤더 (< 1024px) */}
      <header className="lg:hidden flex items-center justify-between px-4 h-[58px] bg-white/60 backdrop-blur-[7px] border-b border-[rgba(0,143,237,0.2)] relative z-10">
        <img
          src={logoIcon}
          alt="FLOXN 로고"
          className="h-6 cursor-pointer"
          onClick={() => setLocation("/dashboard")}
          data-testid="logo-header-mobile"
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          data-testid="button-logout-mobile"
        >
          로그아웃
        </Button>
      </header>
    </>
  );
}
