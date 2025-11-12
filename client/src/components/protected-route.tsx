import { usePermissions } from "@/hooks/use-permissions";
import { useLocation } from "wouter";
import { useEffect } from "react";

interface ProtectedRouteProps {
  category: string;
  children: React.ReactNode;
}

export function ProtectedRoute({ category, children }: ProtectedRouteProps) {
  const { hasCategory, isLoading, user } = usePermissions();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Wait for loading to complete
    if (isLoading) return;

    // If not logged in, redirect to login
    if (!user) {
      setLocation("/");
      return;
    }

    // If no permission for this category, redirect to forbidden
    if (!hasCategory(category)) {
      setLocation("/forbidden");
      return;
    }
  }, [isLoading, user, category, hasCategory, setLocation]);

  // Show nothing while loading or checking permissions
  if (isLoading || !user || !hasCategory(category)) {
    return null;
  }

  return <>{children}</>;
}
