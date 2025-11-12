import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { MousePointer2, Square, ZoomIn, ZoomOut, Move } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface PastedImage {
  id: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function FieldDrawing() {
  const [selectedTool, setSelectedTool] = useState("pointer");
  const [selectedMenuItem, setSelectedMenuItem] = useState("도면 목록");
  const [pastedImages, setPastedImages] = useState<PastedImage[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  // 이미지 붙여넣기 이벤트 리스너
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        if (item.type.indexOf('image') !== -1) {
          const blob = item.getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const img = new Image();
              img.onload = () => {
                const newImage: PastedImage = {
                  id: `img-${Date.now()}`,
                  src: event.target?.result as string,
                  x: 50,
                  y: 50,
                  width: Math.min(img.width, 400),
                  height: Math.min(img.height, 300),
                };
                setPastedImages(prev => [...prev, newImage]);
                toast({
                  title: "이미지 추가 완료",
                  description: "이미지가 캔버스에 추가되었습니다. 드래그하여 위치를 조정할 수 있습니다.",
                });
              };
              img.src = event.target?.result as string;
            };
            reader.readAsDataURL(blob);
          }
          e.preventDefault();
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [toast]);

  // 이미지 드래그 시작
  const handleImageMouseDown = (e: React.MouseEvent, imageId: string) => {
    if (selectedTool !== "pointer") return;
    
    const image = pastedImages.find(img => img.id === imageId);
    if (!image) return;

    setSelectedImageId(imageId);
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - image.x,
      y: e.clientY - image.y,
    });
    e.stopPropagation();
  };

  // 이미지 드래그 중
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !selectedImageId) return;

    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;

    setPastedImages(prev =>
      prev.map(img =>
        img.id === selectedImageId
          ? {
              ...img,
              x: e.clientX - canvasRect.left - dragOffset.x,
              y: e.clientY - canvasRect.top - dragOffset.y,
            }
          : img
      )
    );
  };

  // 이미지 드래그 종료
  const handleMouseUp = () => {
    setIsDragging(false);
  };

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
              ref={canvasRef}
              className="bg-white rounded shadow-lg"
              style={{
                width: "600px",
                height: "400px",
                border: "2px solid #008FED",
                position: "relative",
                overflow: "hidden",
                cursor: isDragging ? "grabbing" : "default",
              }}
              data-testid="canvas-area"
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {/* 붙여넣기 안내 메시지 */}
              {pastedImages.length === 0 && (
                <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                  <span
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: "rgba(12, 12, 12, 0.4)",
                    }}
                  >
                    이미지를 복사한 후 Ctrl+V 로 붙여넣기
                  </span>
                  <span
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "12px",
                      color: "rgba(12, 12, 12, 0.3)",
                    }}
                  >
                    (도면 이미지, 사진 등을 클립보드에 복사하여 붙여넣을 수 있습니다)
                  </span>
                </div>
              )}

              {/* 붙여넣은 이미지들 */}
              {pastedImages.map((image) => (
                <div
                  key={image.id}
                  style={{
                    position: "absolute",
                    left: `${image.x}px`,
                    top: `${image.y}px`,
                    width: `${image.width}px`,
                    height: `${image.height}px`,
                    cursor: selectedTool === "pointer" ? "move" : "default",
                    border: selectedImageId === image.id ? "2px solid #008FED" : "2px solid transparent",
                    boxSizing: "border-box",
                  }}
                  onMouseDown={(e) => handleImageMouseDown(e, image.id)}
                  data-testid={`pasted-image-${image.id}`}
                >
                  <img
                    src={image.src}
                    alt="Pasted"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      pointerEvents: "none",
                      userSelect: "none",
                    }}
                    draggable={false}
                  />
                  
                  {/* 삭제 버튼 */}
                  {selectedImageId === image.id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPastedImages(prev => prev.filter(img => img.id !== image.id));
                        setSelectedImageId(null);
                        toast({
                          title: "이미지 삭제",
                          description: "이미지가 삭제되었습니다.",
                        });
                      }}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center"
                      style={{
                        background: "#EF4444",
                        color: "white",
                        fontSize: "14px",
                        fontWeight: "bold",
                        border: "2px solid white",
                      }}
                      data-testid={`delete-image-${image.id}`}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
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
