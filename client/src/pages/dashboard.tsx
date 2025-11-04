import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, LogOut, FileText, Clock, CheckCircle, AlertCircle } from "lucide-react";
import type { User } from "@shared/schema";

export default function Dashboard() {
  const [, setLocation] = useLocation();

  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ["/api/user"],
    retry: false,
  });

  useEffect(() => {
    if (error) {
      setLocation("/");
    }
  }, [error, setLocation]);

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", { method: "POST" });
      localStorage.removeItem("rememberMe");
      setLocation("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          <p className="text-sm text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const stats = [
    { label: "전체 사고", value: "0", icon: FileText, color: "text-primary" },
    { label: "진행 중", value: "0", icon: Clock, color: "text-blue-500" },
    { label: "완료", value: "0", icon: CheckCircle, color: "text-green-500" },
    { label: "대기", value: "0", icon: AlertCircle, color: "text-orange-500" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary">
                <Shield className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold text-foreground">보험 관리</span>
                <span className="text-xs text-muted-foreground">Insurance System</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right" data-testid="user-info">
                <p className="text-sm font-medium text-foreground">{user?.accidentNumber}</p>
                <p className="text-xs text-muted-foreground">사용자</p>
              </div>
              <Button
                variant="outline"
                onClick={handleLogout}
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4 mr-2" />
                로그아웃
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="space-y-8">
          {/* Welcome Section */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground" data-testid="text-welcome">
              대시보드
            </h1>
            <p className="text-muted-foreground">
              접수부터 종결까지 진행 흐름을 한눈에 확인하세요
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, idx) => (
              <Card key={idx} data-testid={`stat-card-${idx}`}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </CardTitle>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">{stat.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Empty State */}
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
              <div className="flex items-center justify-center w-20 h-20 rounded-full bg-muted">
                <FileText className="w-10 h-10 text-muted-foreground" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-semibold text-foreground">
                  등록된 사고가 없습니다
                </h3>
                <p className="text-sm text-muted-foreground">
                  새로운 보험 사고를 등록하여 관리를 시작하세요
                </p>
              </div>
              <Button className="mt-4" data-testid="button-add-case">
                <FileText className="w-4 h-4 mr-2" />
                사고 등록
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
