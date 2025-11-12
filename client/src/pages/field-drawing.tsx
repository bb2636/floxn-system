import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { MousePointer2, Square, ZoomIn, ZoomOut, Move } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function FieldDrawing() {
  const [selectedTool, setSelectedTool] = useState("pointer");
  const [selectedMenuItem, setSelectedMenuItem] = useState("도면 목록");

  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  if (!user) {
    return null;
  }

  const menuItems = [
    "도면 목록",
    "층별자료 등록",
    "견적서 작성",
    "현장종합보고서"
  ];

  const tools = [
    { id: "pointer", icon: MousePointer2, label: "포인터" },
    { id: "rectangle", icon: Square, label: "사각형" },
    { id: "zoom-in", icon: ZoomIn, label: "확대" },
    { id: "zoom-out", icon: ZoomOut, label: "축소" },
    { id: "pan", icon: Move, label: "이동" },
  ];

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      {/* 왼쪽 사이드바 */}
      <div 
        className="w-[180px] border-r flex-shrink-0 flex flex-col"
        style={{
          background: "white",
          borderRight: "1px solid rgba(0, 143, 237, 0.15)",
        }}
      >
        {/* 도면 작성 타이틀 */}
        <div 
          className="p-4 border-b flex-shrink-0"
          style={{
            borderBottom: "1px solid rgba(0, 143, 237, 0.15)",
          }}
        >
          <h2 
            style={{
              fontFamily: "Pretendard",
              fontSize: "18px",
              fontWeight: 700,
              color: "#0C0C0C",
            }}
          >
            도면 작성
          </h2>
        </div>

        {/* 케이스 정보 */}
        <div 
          className="p-4 border-b flex-shrink-0"
          style={{
            borderBottom: "1px solid rgba(0, 143, 237, 0.15)",
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <div 
              className="w-2 h-2 rounded-full"
              style={{ background: "#008FED" }}
            />
            <span
              style={{
                fontFamily: "Pretendard",
                fontSize: "12px",
                fontWeight: 600,
                color: "#0C0C0C",
              }}
            >
              M0숭례문역4
            </span>
          </div>
          <span
            style={{
              fontFamily: "Pretendard",
              fontSize: "11px",
              color: "rgba(12, 12, 12, 0.5)",
            }}
          >
            ZK2109043
          </span>
        </div>

        {/* 메뉴 아이템들 */}
        <div className="p-2 flex-1 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item}
              onClick={() => setSelectedMenuItem(item)}
              data-testid={`menu-${item}`}
              className="w-full text-left px-3 py-2.5 rounded mb-1 hover-elevate active-elevate-2"
              style={{
                fontFamily: "Pretendard",
                fontSize: "14px",
                fontWeight: selectedMenuItem === item ? 600 : 500,
                color: selectedMenuItem === item ? "#008FED" : "rgba(12, 12, 12, 0.7)",
                background: selectedMenuItem === item ? "rgba(0, 143, 237, 0.08)" : "transparent",
              }}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {/* 메인 콘텐츠 영역 */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* 상단 액션 버튼들 */}
        <div 
          className="flex justify-end gap-2 p-4 border-b flex-shrink-0"
          style={{
            borderBottom: "1px solid rgba(0, 143, 237, 0.15)",
          }}
        >
          <Button
            variant="outline"
            data-testid="button-save"
            style={{
              fontFamily: "Pretendard",
              fontWeight: 600,
            }}
          >
            저장
          </Button>
          <Button
            data-testid="button-save-png"
            style={{
              fontFamily: "Pretendard",
              fontWeight: 600,
              background: "#008FED",
              color: "white",
            }}
          >
            PNG 저장
          </Button>
        </div>

        {/* 캔버스 영역 */}
        <div 
          className="flex-1 relative overflow-hidden"
          style={{
            background: "linear-gradient(0deg, rgba(0, 143, 237, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 143, 237, 0.03) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            {/* 도면 컨테이너 */}
            <div
              className="bg-white rounded shadow-lg"
              style={{
                width: "600px",
                height: "400px",
                border: "2px solid #008FED",
                position: "relative",
              }}
              data-testid="canvas-area"
            >
              {/* 도면 이미지 placeholder */}
              <div className="w-full h-full flex items-center justify-center">
                <span
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    color: "rgba(12, 12, 12, 0.4)",
                  }}
                >
                  도면 이미지 영역
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 하단 도구 바 */}
        <div 
          className="flex items-center justify-center gap-2 p-4 border-t flex-shrink-0"
          style={{
            borderTop: "1px solid rgba(0, 143, 237, 0.15)",
            background: "white",
          }}
        >
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.id}
                onClick={() => setSelectedTool(tool.id)}
                data-testid={`tool-${tool.id}`}
                className="p-2.5 rounded hover-elevate active-elevate-2"
                style={{
                  background: selectedTool === tool.id ? "#008FED" : "white",
                  color: selectedTool === tool.id ? "white" : "rgba(12, 12, 12, 0.7)",
                  border: selectedTool === tool.id ? "1px solid #008FED" : "1px solid rgba(0, 143, 237, 0.2)",
                }}
                title={tool.label}
              >
                <Icon className="w-5 h-5" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
