import { ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebarStatistics } from "@/components/app-sidebar-statistics";
import { GlobalHeader } from "@/components/global-header";

interface StatisticsLayoutProps {
  children: ReactNode;
}

export function StatisticsLayout({ children }: StatisticsLayoutProps) {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#E7EDFE] to-white relative overflow-hidden">
      {/* Background blur effects */}
      <div className="absolute w-[1095px] h-[776.83px] left-[97.61px] bottom-[1169.19px] bg-[rgba(254,240,230,0.4)] blur-[212px] rotate-[-35.25deg] pointer-events-none" />
      <div className="absolute w-[1334.83px] h-[1322.98px] left-[811.58px] bottom-0 bg-[rgba(234,230,254,0.5)] blur-[212px] pointer-events-none" />
      <div className="absolute w-[348px] h-[1322.98px] left-0 bottom-[188.99px] bg-[rgba(234,230,254,0.5)] blur-[212px] pointer-events-none" />

      <GlobalHeader />

      <SidebarProvider style={style as React.CSSProperties}>
        <div className="flex w-full relative z-10">
          <AppSidebarStatistics />
          <main className="flex-1">
            {children}
          </main>
        </div>
      </SidebarProvider>
    </div>
  );
}
