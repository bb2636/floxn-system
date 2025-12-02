import { useState } from "react";
import { useLocation } from "wouter";
import { Plus, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import Intake from "@/pages/intake";

export function FloatingIntakeButton() {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  
  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  // 로그인 페이지, 접수 페이지, 에러 페이지에서는 표시하지 않음
  const hiddenPaths = ['/', '/login', '/intake', '/forbidden', '/not-found'];
  if (hiddenPaths.includes(location)) return null;

  // 관리자만 표시
  if (user?.role !== "관리자") return null;

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleSuccess = () => {
    setIsOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: '32px',
          right: '32px',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: '16px 24px',
          background: '#008FED',
          borderRadius: '40px',
          border: 'none',
          boxShadow: '0px 4px 20px rgba(0, 143, 237, 0.4)',
          cursor: 'pointer',
          zIndex: 100,
        }}
        data-testid="button-floating-intake"
      >
        <span style={{
          fontFamily: 'Pretendard',
          fontWeight: 600,
          fontSize: '16px',
          lineHeight: '128%',
          letterSpacing: '-0.02em',
          color: '#FFFFFF',
        }}>
          접수
        </span>
        <Plus size={20} color="#FFFFFF" />
      </button>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent 
          side="right" 
          className="w-full sm:max-w-full md:max-w-[90vw] lg:max-w-[85vw] xl:max-w-[80vw] p-0 overflow-y-auto"
          style={{ 
            maxWidth: '1400px',
            background: '#F5F7FA',
          }}
        >
          <div className="h-full overflow-y-auto">
            <Intake 
              isModal={true} 
              onClose={handleClose} 
              onSuccess={handleSuccess} 
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
