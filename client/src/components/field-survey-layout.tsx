import { ReactNode, useRef, useEffect } from "react";
import { AppSidebarFieldSurvey } from "@/components/app-sidebar-field-survey";
import { GlobalHeader } from "@/components/global-header";

interface FieldSurveyLayoutProps {
  children: ReactNode;
}

export function FieldSurveyLayout({ children }: FieldSurveyLayoutProps) {
  const mainRef = useRef<HTMLElement>(null);
  const scrollPositionRef = useRef(0);

  // Prevent unwanted scroll restoration
  useEffect(() => {
    const mainElement = mainRef.current;
    if (!mainElement) return;

    const saveScrollPosition = () => {
      scrollPositionRef.current = mainElement.scrollTop;
    };

    // Save scroll position on any scroll event
    mainElement.addEventListener('scroll', saveScrollPosition, { passive: true });

    // Restore scroll position after any focus event
    const restoreScrollOnFocus = () => {
      const savedScroll = scrollPositionRef.current;
      requestAnimationFrame(() => {
        if (mainElement.scrollTop !== savedScroll) {
          mainElement.scrollTop = savedScroll;
        }
      });
    };

    mainElement.addEventListener('focusin', restoreScrollOnFocus, { passive: true });

    return () => {
      mainElement.removeEventListener('scroll', saveScrollPosition);
      mainElement.removeEventListener('focusin', restoreScrollOnFocus);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#E7EDFE] to-white relative overflow-hidden">
      {/* Background blur effects */}
      <div className="absolute w-[1095px] h-[776.83px] left-[97.61px] bottom-[1169.19px] bg-[rgba(254,240,230,0.4)] blur-[212px] rotate-[-35.25deg] pointer-events-none" />
      <div className="absolute w-[1334.83px] h-[1322.98px] left-[811.58px] bottom-0 bg-[rgba(234,230,254,0.5)] blur-[212px] pointer-events-none" />
      <div className="absolute w-[348px] h-[1322.98px] left-0 bottom-[188.99px] bg-[rgba(234,230,254,0.5)] blur-[212px] pointer-events-none" />

      <GlobalHeader />

      {/* Main Content */}
      <div className="relative flex" style={{ height: "calc(100vh - 89px)" }}>
        <AppSidebarFieldSurvey />
        <main 
          ref={mainRef}
          className="flex-1 overflow-y-auto"
          style={{
            scrollBehavior: 'auto',
            overscrollBehavior: 'contain',
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
