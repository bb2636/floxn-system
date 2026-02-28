import { usePermissions } from "@/hooks/use-permissions";
import { useLocation } from "wouter";
import { useEffect } from "react";

interface ProtectedRouteProps {
  category: string;
  children: React.ReactNode;
}

const categoryRouteMap: { category: string; path: string }[] = [
  { category: "홈", path: "/dashboard" },
  { category: "종합진행관리", path: "/comprehensive-progress" },
  { category: "새로운접수", path: "/intake" },
  { category: "현장조사", path: "/field-survey/management" },
  { category: "정산 및 통계", path: "/statistics" },
  { category: "관리자 설정", path: "/admin-settings" },
];

export function ProtectedRoute({ category, children }: ProtectedRouteProps) {
  const { hasCategory, isLoading, user } = usePermissions();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      setLocation("/");
      return;
    }

    if (!hasCategory(category)) {
      const fallback = categoryRouteMap.find(
        (r) => r.category !== category && hasCategory(r.category)
      );
      if (fallback) {
        setLocation(fallback.path);
      } else {
        setLocation("/forbidden");
      }
      return;
    }
  }, [isLoading, user, category, hasCategory, setLocation]);

  if (isLoading || !user || !hasCategory(category)) {
    return null;
  }

  return <>{children}</>;
}
