import { ReactNode, useEffect } from "react";
import { AppSidebarFieldSurvey } from "@/components/app-sidebar-field-survey";
import { GlobalHeader } from "@/components/global-header";

interface FieldSurveyLayoutProps {
  children: ReactNode;
}

export function FieldSurveyLayout({ children }: FieldSurveyLayoutProps) {
  // 모바일 viewport 높이를 CSS 변수로 설정 (초기 설정만)
  useEffect(() => {
    const setVh = () => {
      // 실제 viewport 높이를 계산하여 CSS 변수로 설정
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    // 초기 설정만 수행 (키보드 입력 중 재계산 방지)
    setVh();

    // 화면 회전 등의 경우에만 업데이트 (키보드는 제외)
    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      // 입력 필드가 포커스된 상태에서는 재계산 안 함
      const activeElement = document.activeElement;
      if (activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA') {
        return;
      }
      
      // Throttle: 300ms 이내 연속 호출 방지
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(setVh, 300);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
    };
  }, []);

  return (
    <div 
      className="bg-gradient-to-b from-[#E7EDFE] to-white relative"
      style={{
        minHeight: 'calc(var(--vh, 1vh) * 100)', // 모바일 대응, fallback은 CSS에서
      }}
    >
      {/* Background blur effects */}
      <div className="absolute w-[1095px] h-[776.83px] left-[97.61px] bottom-[1169.19px] bg-[rgba(254,240,230,0.4)] blur-[212px] rotate-[-35.25deg] pointer-events-none" />
      <div className="absolute w-[1334.83px] h-[1322.98px] left-[811.58px] bottom-0 bg-[rgba(234,230,254,0.5)] blur-[212px] pointer-events-none" />
      <div className="absolute w-[348px] h-[1322.98px] left-0 bottom-[188.99px] bg-[rgba(234,230,254,0.5)] blur-[212px] pointer-events-none" />

      <GlobalHeader />

      {/* Main Content - 모바일에서 스크롤 안정성 개선 */}
      <div 
        className="relative flex"
        style={{
          height: 'calc(var(--vh, 1vh) * 100 - 89px)', // 모바일 대응, fallback은 --vh가 없으면 1vh 사용
        }}
      >
        <AppSidebarFieldSurvey />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
