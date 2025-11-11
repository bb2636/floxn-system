import { ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebarStatistics } from "@/components/app-sidebar-statistics";

interface StatisticsLayoutProps {
  children: ReactNode;
}

export function StatisticsLayout({ children }: StatisticsLayoutProps) {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebarStatistics />
        <div className="flex flex-col flex-1">
          {children}
        </div>
      </div>
    </SidebarProvider>
  );
}
