import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { User } from "@shared/schema";
import { MousePointer2, Square, ZoomIn, ZoomOut, Move, Lock, LockOpen, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface PastedImage {
  id: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  locked: boolean;
}

interface DrawnRectangle {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  locked: boolean;
}

type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w';

export default function FieldDrawing() {
  const [location, setLocation] = useLocation();
  const [selectedTool, setSelectedTool] = useState("pointer");
  const [pastedImages, setPastedImages] = useState<PastedImage[]>([]);
  const [rectangles, setRectangles] = useState<DrawnRectangle[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [selectedRectangleId, setSelectedRectangleId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
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
                  locked: false,
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

  // 이미지/사각형 잠금 토글
  const toggleLock = (imageId?: string, rectangleId?: string) => {
    if (imageId) {
      setPastedImages(prev =>
        prev.map(img =>
          img.id === imageId ? { ...img, locked: !img.locked } : img
        )
      );
      toast({
        title: pastedImages.find(img => img.id === imageId)?.locked ? "잠금 해제" : "잠금",
        description: pastedImages.find(img => img.id === imageId)?.locked ? "이미지 편집이 가능합니다." : "이미지가 잠겼습니다.",
      });
    } else if (rectangleId) {
      setRectangles(prev =>
        prev.map(rect =>
          rect.id === rectangleId ? { ...rect, locked: !rect.locked } : rect
        )
      );
      toast({
        title: rectangles.find(rect => rect.id === rectangleId)?.locked ? "잠금 해제" : "잠금",
        description: rectangles.find(rect => rect.id === rectangleId)?.locked ? "사각형 편집이 가능합니다." : "사각형이 잠겼습니다.",
      });
    }
  };

  // 이미지/사각형 삭제
  const deleteItem = (imageId?: string, rectangleId?: string) => {
    if (imageId) {
      setPastedImages(prev => prev.filter(img => img.id !== imageId));
      setSelectedImageId(null);
      toast({
        title: "이미지 삭제",
        description: "이미지가 삭제되었습니다.",
      });
    } else if (rectangleId) {
      setRectangles(prev => prev.filter(rect => rect.id !== rectangleId));
      setSelectedRectangleId(null);
      toast({
        title: "사각형 삭제",
        description: "사각형이 삭제되었습니다.",
      });
    }
  };

  // 캔버스 마우스 다운 (사각형 그리기 시작 또는 선택 해제)
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      setSelectedImageId(null);
      setSelectedRectangleId(null);
      
      if (selectedTool === "rectangle") {
        const canvasRect = canvasRef.current?.getBoundingClientRect();
        if (!canvasRect) return;
        
        setIsDrawing(true);
        setDrawStart({
          x: e.clientX - canvasRect.left,
          y: e.clientY - canvasRect.top,
        });
      }
    }
  };

  // 이미지 드래그 시작
  const handleImageMouseDown = (e: React.MouseEvent, imageId: string) => {
    if (selectedTool !== "pointer") return;
    
    const image = pastedImages.find(img => img.id === imageId);
    if (!image) return;
    
    // 잠긴 아이템은 선택만 하고 드래그하지 않음
    if (image.locked) {
      if (selectedImageId === imageId) {
        // 이미 선택된 잠긴 아이템을 다시 클릭하면 선택 해제
        setSelectedImageId(null);
      } else {
        setSelectedImageId(imageId);
        setSelectedRectangleId(null);
      }
      e.stopPropagation();
      return;
    }

    setSelectedImageId(imageId);
    setSelectedRectangleId(null);
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - image.x,
      y: e.clientY - image.y,
    });
    e.stopPropagation();
  };

  // 사각형 드래그 시작
  const handleRectangleMouseDown = (e: React.MouseEvent, rectangleId: string) => {
    if (selectedTool !== "pointer") return;
    
    const rectangle = rectangles.find(rect => rect.id === rectangleId);
    if (!rectangle) return;
    
    // 잠긴 아이템은 선택만 하고 드래그하지 않음
    if (rectangle.locked) {
      if (selectedRectangleId === rectangleId) {
        // 이미 선택된 잠긴 아이템을 다시 클릭하면 선택 해제
        setSelectedRectangleId(null);
      } else {
        setSelectedRectangleId(rectangleId);
        setSelectedImageId(null);
      }
      e.stopPropagation();
      return;
    }

    setSelectedRectangleId(rectangleId);
    setSelectedImageId(null);
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - rectangle.x,
      y: e.clientY - rectangle.y,
    });
    e.stopPropagation();
  };

  // 리사이즈 핸들 마우스 다운
  const handleResizeMouseDown = (e: React.MouseEvent, handle: ResizeHandle, imageId?: string, rectangleId?: string) => {
    e.stopPropagation();
    
    if (imageId) {
      const image = pastedImages.find(img => img.id === imageId);
      if (!image || image.locked) return;
      
      setIsResizing(true);
      setResizeHandle(handle);
      setResizeStart({
        x: image.x,
        y: image.y,
        width: image.width,
        height: image.height,
      });
    } else if (rectangleId) {
      const rectangle = rectangles.find(rect => rect.id === rectangleId);
      if (!rectangle || rectangle.locked) return;
      
      setIsResizing(true);
      setResizeHandle(handle);
      setResizeStart({
        x: rectangle.x,
        y: rectangle.y,
        width: rectangle.width,
        height: rectangle.height,
      });
    }
  };

  // 마우스 이동 처리
  const handleMouseMove = (e: React.MouseEvent) => {
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;

    const mouseX = e.clientX - canvasRect.left;
    const mouseY = e.clientY - canvasRect.top;

    // 사각형 그리기 중
    if (isDrawing && selectedTool === "rectangle") {
      const width = mouseX - drawStart.x;
      const height = mouseY - drawStart.y;
      
      // 임시 사각형 업데이트는 실제 그릴 때 처리
      return;
    }

    // 드래그 중
    if (isDragging && !isResizing) {
      if (selectedImageId) {
        const image = pastedImages.find(img => img.id === selectedImageId);
        if (image && !image.locked) {
          setPastedImages(prev =>
            prev.map(img =>
              img.id === selectedImageId
                ? {
                    ...img,
                    x: mouseX - dragOffset.x,
                    y: mouseY - dragOffset.y,
                  }
                : img
            )
          );
        }
      } else if (selectedRectangleId) {
        const rectangle = rectangles.find(rect => rect.id === selectedRectangleId);
        if (rectangle && !rectangle.locked) {
          setRectangles(prev =>
            prev.map(rect =>
              rect.id === selectedRectangleId
                ? {
                    ...rect,
                    x: mouseX - dragOffset.x,
                    y: mouseY - dragOffset.y,
                  }
                : rect
            )
          );
        }
      }
    }

    // 리사이즈 중
    if (isResizing && resizeHandle) {
      if (selectedImageId) {
        const image = pastedImages.find(img => img.id === selectedImageId);
        if (image && !image.locked) {
          let newX = resizeStart.x;
          let newY = resizeStart.y;
          let newWidth = resizeStart.width;
          let newHeight = resizeStart.height;

          if (resizeHandle.includes('e')) {
            newWidth = mouseX - resizeStart.x;
          }
          if (resizeHandle.includes('w')) {
            const proposedWidth = resizeStart.width + (resizeStart.x - mouseX);
            if (proposedWidth >= 50) {
              newWidth = proposedWidth;
              newX = mouseX;
            } else {
              newWidth = 50;
              newX = resizeStart.x + resizeStart.width - 50;
            }
          }
          if (resizeHandle.includes('s')) {
            newHeight = mouseY - resizeStart.y;
          }
          if (resizeHandle.includes('n')) {
            const proposedHeight = resizeStart.height + (resizeStart.y - mouseY);
            if (proposedHeight >= 50) {
              newHeight = proposedHeight;
              newY = mouseY;
            } else {
              newHeight = 50;
              newY = resizeStart.y + resizeStart.height - 50;
            }
          }

          setPastedImages(prev =>
            prev.map(img =>
              img.id === selectedImageId
                ? {
                    ...img,
                    x: newX,
                    y: newY,
                    width: Math.max(50, newWidth),
                    height: Math.max(50, newHeight),
                  }
                : img
            )
          );
        }
      } else if (selectedRectangleId) {
        const rectangle = rectangles.find(rect => rect.id === selectedRectangleId);
        if (rectangle && !rectangle.locked) {
          let newX = resizeStart.x;
          let newY = resizeStart.y;
          let newWidth = resizeStart.width;
          let newHeight = resizeStart.height;

          if (resizeHandle.includes('e')) {
            newWidth = mouseX - resizeStart.x;
          }
          if (resizeHandle.includes('w')) {
            const proposedWidth = resizeStart.width + (resizeStart.x - mouseX);
            if (proposedWidth >= 20) {
              newWidth = proposedWidth;
              newX = mouseX;
            } else {
              newWidth = 20;
              newX = resizeStart.x + resizeStart.width - 20;
            }
          }
          if (resizeHandle.includes('s')) {
            newHeight = mouseY - resizeStart.y;
          }
          if (resizeHandle.includes('n')) {
            const proposedHeight = resizeStart.height + (resizeStart.y - mouseY);
            if (proposedHeight >= 20) {
              newHeight = proposedHeight;
              newY = mouseY;
            } else {
              newHeight = 20;
              newY = resizeStart.y + resizeStart.height - 20;
            }
          }

          setRectangles(prev =>
            prev.map(rect =>
              rect.id === selectedRectangleId
                ? {
                    ...rect,
                    x: newX,
                    y: newY,
                    width: Math.max(20, newWidth),
                    height: Math.max(20, newHeight),
                  }
                : rect
            )
          );
        }
      }
    }
  };

  // 마우스 업 처리
  const handleMouseUp = (e: React.MouseEvent) => {
    // 사각형 그리기 완료
    if (isDrawing && selectedTool === "rectangle") {
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (!canvasRect) return;
      
      const endX = e.clientX - canvasRect.left;
      const endY = e.clientY - canvasRect.top;
      
      const width = endX - drawStart.x;
      const height = endY - drawStart.y;
      
      if (Math.abs(width) > 10 && Math.abs(height) > 10) {
        const newRectangle: DrawnRectangle = {
          id: `rect-${Date.now()}`,
          x: width < 0 ? endX : drawStart.x,
          y: height < 0 ? endY : drawStart.y,
          width: Math.abs(width),
          height: Math.abs(height),
          locked: false,
        };
        setRectangles(prev => [...prev, newRectangle]);
      }
      
      setIsDrawing(false);
    }
    
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
  };

  if (!user) {
    return null;
  }

  const fieldSurveyMenuItems = [
    { title: "현장관리", url: "/field-survey/management" },
    { title: "도면 작성", url: "/field-survey/drawing" },
    { title: "종합자료 등록", url: "/field-survey/documents" },
    { title: "견적서작성조사", url: "/field-survey/estimate" },
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
          {fieldSurveyMenuItems.map((item) => (
            <button
              key={item.title}
              onClick={() => setLocation(item.url)}
              data-testid={`menu-${item.title}`}
              className="w-full text-left px-3 py-2.5 rounded mb-1 hover-elevate active-elevate-2"
              style={{
                fontFamily: "Pretendard",
                fontSize: "14px",
                fontWeight: location === item.url ? 600 : 500,
                color: location === item.url ? "#008FED" : "rgba(12, 12, 12, 0.7)",
                background: location === item.url ? "rgba(0, 143, 237, 0.08)" : "transparent",
              }}
            >
              {item.title}
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
                cursor: isDragging ? "grabbing" : selectedTool === "rectangle" ? "crosshair" : "default",
              }}
              data-testid="canvas-area"
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {/* 붙여넣기 안내 메시지 */}
              {pastedImages.length === 0 && rectangles.length === 0 && (
                <div className="w-full h-full flex flex-col items-center justify-center gap-3 pointer-events-none">
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

              {/* 그려진 사각형들 */}
              {rectangles.map((rectangle) => (
                <div
                  key={rectangle.id}
                  style={{
                    position: "absolute",
                    left: `${rectangle.x}px`,
                    top: `${rectangle.y}px`,
                    width: `${rectangle.width}px`,
                    height: `${rectangle.height}px`,
                    border: selectedRectangleId === rectangle.id ? "2px solid #008FED" : "2px solid rgba(0, 143, 237, 0.5)",
                    cursor: !rectangle.locked && selectedTool === "pointer" ? "move" : "default",
                    boxSizing: "border-box",
                    background: "rgba(0, 143, 237, 0.05)",
                  }}
                  onMouseDown={(e) => handleRectangleMouseDown(e, rectangle.id)}
                  data-testid={`rectangle-${rectangle.id}`}
                >
                  {/* 리사이즈 핸들 */}
                  {selectedRectangleId === rectangle.id && !rectangle.locked && (
                    <>
                      {(['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'] as ResizeHandle[]).map((handle) => (
                        <div
                          key={handle}
                          onMouseDown={(e) => handleResizeMouseDown(e, handle, undefined, rectangle.id)}
                          style={{
                            position: "absolute",
                            width: handle.length === 1 ? "100%" : "8px",
                            height: handle.length === 1 ? "100%" : "8px",
                            background: "#008FED",
                            border: "1px solid white",
                            cursor: `${handle}-resize`,
                            ...(handle === 'nw' && { top: "-4px", left: "-4px" }),
                            ...(handle === 'ne' && { top: "-4px", right: "-4px" }),
                            ...(handle === 'sw' && { bottom: "-4px", left: "-4px" }),
                            ...(handle === 'se' && { bottom: "-4px", right: "-4px" }),
                            ...(handle === 'n' && { top: "-4px", left: "0", width: "100%", height: "4px" }),
                            ...(handle === 's' && { bottom: "-4px", left: "0", width: "100%", height: "4px" }),
                            ...(handle === 'e' && { right: "-4px", top: "0", width: "4px", height: "100%" }),
                            ...(handle === 'w' && { left: "-4px", top: "0", width: "4px", height: "100%" }),
                          }}
                          data-testid={`resize-handle-${handle}-rect-${rectangle.id}`}
                        />
                      ))}
                    </>
                  )}

                  {/* 잠금/삭제 툴바 */}
                  {selectedRectangleId === rectangle.id && (
                    <div
                      className="absolute flex items-center gap-1 px-2 py-1 rounded"
                      style={{
                        top: "-36px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        background: "rgba(0, 0, 0, 0.8)",
                        backdropFilter: "blur(4px)",
                      }}
                      data-testid={`toolbar-rect-${rectangle.id}`}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLock(undefined, rectangle.id);
                        }}
                        className="p-1.5 hover-elevate rounded"
                        style={{
                          background: "transparent",
                          color: "white",
                        }}
                        data-testid={`lock-rect-${rectangle.id}`}
                      >
                        {rectangle.locked ? <Lock className="w-4 h-4" /> : <LockOpen className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteItem(undefined, rectangle.id);
                        }}
                        className="p-1.5 hover-elevate rounded"
                        style={{
                          background: "transparent",
                          color: "#EF4444",
                        }}
                        data-testid={`delete-rect-${rectangle.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}

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
                    cursor: !image.locked && selectedTool === "pointer" ? "move" : "default",
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
                  
                  {/* 리사이즈 핸들 */}
                  {selectedImageId === image.id && !image.locked && (
                    <>
                      {(['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'] as ResizeHandle[]).map((handle) => (
                        <div
                          key={handle}
                          onMouseDown={(e) => handleResizeMouseDown(e, handle, image.id)}
                          style={{
                            position: "absolute",
                            width: handle.length === 1 ? "100%" : "8px",
                            height: handle.length === 1 ? "100%" : "8px",
                            background: "#008FED",
                            border: "1px solid white",
                            cursor: `${handle}-resize`,
                            ...(handle === 'nw' && { top: "-4px", left: "-4px" }),
                            ...(handle === 'ne' && { top: "-4px", right: "-4px" }),
                            ...(handle === 'sw' && { bottom: "-4px", left: "-4px" }),
                            ...(handle === 'se' && { bottom: "-4px", right: "-4px" }),
                            ...(handle === 'n' && { top: "-4px", left: "0", width: "100%", height: "4px" }),
                            ...(handle === 's' && { bottom: "-4px", left: "0", width: "100%", height: "4px" }),
                            ...(handle === 'e' && { right: "-4px", top: "0", width: "4px", height: "100%" }),
                            ...(handle === 'w' && { left: "-4px", top: "0", width: "4px", height: "100%" }),
                          }}
                          data-testid={`resize-handle-${handle}-${image.id}`}
                        />
                      ))}
                    </>
                  )}

                  {/* 잠금/삭제 툴바 */}
                  {selectedImageId === image.id && (
                    <div
                      className="absolute flex items-center gap-1 px-2 py-1 rounded"
                      style={{
                        top: "-36px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        background: "rgba(0, 0, 0, 0.8)",
                        backdropFilter: "blur(4px)",
                      }}
                      data-testid={`toolbar-${image.id}`}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLock(image.id);
                        }}
                        className="p-1.5 hover-elevate rounded"
                        style={{
                          background: "transparent",
                          color: "white",
                        }}
                        data-testid={`lock-${image.id}`}
                      >
                        {image.locked ? <Lock className="w-4 h-4" /> : <LockOpen className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteItem(image.id);
                        }}
                        className="p-1.5 hover-elevate rounded"
                        style={{
                          background: "transparent",
                          color: "#EF4444",
                        }}
                        data-testid={`delete-${image.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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
