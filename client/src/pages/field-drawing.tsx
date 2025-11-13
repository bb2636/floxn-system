import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { User } from "@shared/schema";
import { MousePointer2, ImagePlus, Square, Target, Lock, Trash2, Focus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UploadedImage {
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
  text: string;
  locked: boolean;
}

interface AccidentArea {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  locked: boolean;
}

interface LeakMarker {
  id: string;
  x: number;
  y: number;
}

type ToolType = "pointer" | "upload" | "rectangle" | "leak" | "accident-area";
type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w';
type EntityType = 'image' | 'rectangle' | 'accident-area';

interface ActiveTransform {
  entityType: EntityType;
  entityId: string;
  mode: 'drag' | 'resize';
  handle?: ResizeHandle;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
  startEntityX: number;
  startEntityY: number;
}

export default function FieldDrawing() {
  const [location, setLocation] = useLocation();
  const [selectedTool, setSelectedTool] = useState<ToolType>("pointer");
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [rectangles, setRectangles] = useState<DrawnRectangle[]>([]);
  const [accidentAreas, setAccidentAreas] = useState<AccidentArea[]>([]);
  const [leakMarkers, setLeakMarkers] = useState<LeakMarker[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [selectedRectangleId, setSelectedRectangleId] = useState<string | null>(null);
  const [selectedAccidentAreaId, setSelectedAccidentAreaId] = useState<string | null>(null);
  const [selectedLeakId, setSelectedLeakId] = useState<string | null>(null);
  const [activeTransform, setActiveTransform] = useState<ActiveTransform | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Hybrid approach: activeTransformRef prevents stale closures in document-level listeners
  // while activeTransform state drives UI updates (resize handles, selection highlights)
  const activeTransformRef = useRef<ActiveTransform | null>(null);
  const { toast} = useToast();

  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  // Document level mouse event handlers for drag/resize
  // Dependencies: [isDrawing, selectedTool] only - activeTransform removed to prevent listener re-creation
  // This ensures document handlers persist and always read fresh transform state from ref
  useEffect(() => {
    const handleDocumentMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current) return;

      // Read from ref to avoid stale closure - critical for delta accumulation
      const transform = activeTransformRef.current;
      if (!transform) return;

      // Get canvas bounding rect
      const canvasRect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - canvasRect.left;
      const y = e.clientY - canvasRect.top;

      // Handle drag or resize
      const deltaX = e.clientX - transform.startX;
      const deltaY = e.clientY - transform.startY;

        if (transform.mode === 'drag') {
          // Drag mode
          const newX = transform.startEntityX + deltaX;
          const newY = transform.startEntityY + deltaY;

          // Canvas boundary clamping
          const maxX = 1200 - transform.startWidth;
          const maxY = 800 - transform.startHeight;
          const clampedX = Math.max(0, Math.min(newX, maxX));
          const clampedY = Math.max(0, Math.min(newY, maxY));

          if (transform.entityType === 'image') {
            setUploadedImages(prev =>
              prev.map(img =>
                img.id === transform.entityId
                  ? { ...img, x: clampedX, y: clampedY }
                  : img
              )
            );
          } else if (transform.entityType === 'rectangle') {
            setRectangles(prev =>
              prev.map(rect =>
                rect.id === transform.entityId
                  ? { ...rect, x: clampedX, y: clampedY }
                  : rect
              )
            );
          } else if (transform.entityType === 'accident-area') {
            setAccidentAreas(prev =>
              prev.map(area =>
                area.id === transform.entityId
                  ? { ...area, x: clampedX, y: clampedY }
                  : area
              )
            );
          }
        } else if (transform.mode === 'resize' && transform.handle) {
          // Resize mode - reuse existing logic
          const handle = transform.handle;
          let newX = transform.startEntityX;
          let newY = transform.startEntityY;
          let newWidth = transform.startWidth;
          let newHeight = transform.startHeight;

          const rightEdge = transform.startEntityX + transform.startWidth;
          const bottomEdge = transform.startEntityY + transform.startHeight;

          // Development logging for resize debugging
          if (import.meta.env.DEV) {
            console.log('[Resize Debug]', { handle, deltaX, deltaY, startEntityX: transform.startEntityX, startEntityY: transform.startEntityY, rightEdge, bottomEdge });
          }

          // Apply delta based on handle direction
          if (handle.includes('n')) {
            newY = transform.startEntityY + deltaY;
            newHeight = transform.startHeight - deltaY;
          } else if (handle.includes('s')) {
            newHeight = transform.startHeight + deltaY;
          }

          if (handle.includes('w')) {
            newX = transform.startEntityX + deltaX;
            newWidth = transform.startWidth - deltaX;
          } else if (handle.includes('e')) {
            newWidth = transform.startWidth + deltaX;
          }

          // Canvas boundary clamping (preserving opposite edge) - BEFORE min size
          if (handle.includes('w')) {
            if (newX < 0) {
              newX = 0;
              newWidth = rightEdge;
            } else if (newX + newWidth > 1200) {
              newWidth = 1200 - newX;
            }
          } else if (handle.includes('e')) {
            if (newX + newWidth > 1200) {
              newWidth = 1200 - newX;
            }
          }

          if (handle.includes('n')) {
            if (newY < 0) {
              newY = 0;
              newHeight = bottomEdge;
            } else if (newY + newHeight > 800) {
              newHeight = 800 - newY;
            }
          } else if (handle.includes('s')) {
            if (newY + newHeight > 800) {
              newHeight = 800 - newY;
            }
          }

          // Minimum size constraint (after boundary clamping)
          const minSize = 20;
          if (newWidth < minSize) {
            newWidth = minSize;
            // For west handles, preserve the right edge (if possible)
            if (handle.includes('w')) {
              newX = rightEdge - minSize;
              // Re-clamp to prevent negative coordinates
              if (newX < 0) {
                newX = 0;
                newWidth = Math.min(minSize, rightEdge);
              }
            }
            // For east handles, prevent exceeding canvas
            if (newX + newWidth > 1200) {
              newX = 1200 - minSize;
            }
          }
          if (newHeight < minSize) {
            newHeight = minSize;
            // For north handles, preserve the bottom edge (if possible)
            if (handle.includes('n')) {
              newY = bottomEdge - minSize;
              // Re-clamp to prevent negative coordinates
              if (newY < 0) {
                newY = 0;
                newHeight = Math.min(minSize, bottomEdge);
              }
            }
            // For south handles, prevent exceeding canvas
            if (newY + newHeight > 800) {
              newY = 800 - minSize;
            }
          }

          // Update entity state
          if (transform.entityType === 'image') {
            setUploadedImages(prev =>
              prev.map(img =>
                img.id === transform.entityId
                  ? { ...img, x: newX, y: newY, width: newWidth, height: newHeight }
                  : img
              )
            );
          } else if (transform.entityType === 'rectangle') {
            setRectangles(prev =>
              prev.map(rect =>
                rect.id === transform.entityId
                  ? { ...rect, x: newX, y: newY, width: newWidth, height: newHeight }
                  : rect
              )
            );
          } else if (transform.entityType === 'accident-area') {
            setAccidentAreas(prev =>
              prev.map(area =>
                area.id === transform.entityId
                  ? { ...area, x: newX, y: newY, width: newWidth, height: newHeight }
                  : area
              )
            );
          }
        }
    };

    const handleDocumentMouseUp = () => {
      activeTransformRef.current = null;
      setActiveTransform(null);
      setIsDrawing(false);
    };

    document.addEventListener('mousemove', handleDocumentMouseMove);
    document.addEventListener('mouseup', handleDocumentMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleDocumentMouseMove);
      document.removeEventListener('mouseup', handleDocumentMouseUp);
    };
  }, [isDrawing, selectedTool]);

  // 리사이즈 핸들 마우스 다운 핸들러
  const handleResizeHandleMouseDown = (
    e: React.MouseEvent,
    handle: ResizeHandle,
    entity: UploadedImage | DrawnRectangle | AccidentArea,
    entityType: EntityType
  ) => {
    e.stopPropagation();
    
    const newTransform = {
      entityType,
      entityId: entity.id,
      mode: 'resize' as const,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: entity.width,
      startHeight: entity.height,
      startEntityX: entity.x,
      startEntityY: entity.y,
    };
    
    // Update ref first to prevent stale closures
    activeTransformRef.current = newTransform;
    // Then update state for UI
    setActiveTransform(newTransform);
    
    // Ensure selection is set so resize handles render
    if (entityType === 'image') {
      setSelectedImageId(entity.id);
      setSelectedRectangleId(null);
      setSelectedAccidentAreaId(null);
      setSelectedLeakId(null);
    } else if (entityType === 'rectangle') {
      setSelectedRectangleId(entity.id);
      setSelectedImageId(null);
      setSelectedAccidentAreaId(null);
      setSelectedLeakId(null);
    } else if (entityType === 'accident-area') {
      setSelectedAccidentAreaId(entity.id);
      setSelectedImageId(null);
      setSelectedRectangleId(null);
      setSelectedLeakId(null);
    }
  };

  const fieldSurveyMenuItems = [
    { title: "현장관리", url: "/field-survey/management" },
    { title: "도면 작성", url: "/field-survey/drawing" },
    { title: "종합자료 등록", url: "/field-survey/documents" },
    { title: "견적서작성조사", url: "/field-survey/estimate" },
  ];

  const tools = [
    { id: "pointer" as ToolType, icon: MousePointer2, label: "선택" },
    { id: "upload" as ToolType, icon: ImagePlus, label: "이미지 업로드" },
    { id: "rectangle" as ToolType, icon: Square, label: "사각형" },
    { id: "leak" as ToolType, icon: Target, label: "누수 지점" },
    { id: "accident-area" as ToolType, icon: Focus, label: "사고 영역" },
  ];

  // 파일 업로드 핸들러
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.type.startsWith('image/')) {
      toast({
        title: "오류",
        description: "이미지 파일만 업로드할 수 있습니다.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const newImage: UploadedImage = {
          id: `img-${Date.now()}`,
          src: event.target?.result as string,
          x: 50,
          y: 50,
          width: Math.min(img.width, 300),
          height: (Math.min(img.width, 300) * img.height) / img.width,
          locked: false,
        };
        setUploadedImages(prev => [...prev, newImage]);
        setSelectedImageId(newImage.id);
        setSelectedRectangleId(null);
        setSelectedAccidentAreaId(null);
        setSelectedLeakId(null);
        toast({
          title: "이미지 추가",
          description: "이미지가 추가되었습니다.",
        });
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 툴 선택 핸들러
  const handleToolClick = (toolId: ToolType) => {
    if (toolId === "upload") {
      fileInputRef.current?.click();
    } else {
      setSelectedTool(toolId);
      setSelectedImageId(null);
      setSelectedRectangleId(null);
      setSelectedAccidentAreaId(null);
      setSelectedLeakId(null);
    }
  };

  // 캔버스 클릭 핸들러
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - canvasRect.left;
    const y = e.clientY - canvasRect.top;

    if (selectedTool === "leak") {
      // 누수 지점 마커 추가
      const newMarker: LeakMarker = {
        id: `leak-${Date.now()}`,
        x,
        y,
      };
      setLeakMarkers(prev => [...prev, newMarker]);
      toast({
        title: "누수 지점 표시",
        description: "누수 발생 지점이 표시되었습니다.",
      });
    }
  };

  // 이미지 마우스 다운 핸들러
  const handleImageMouseDown = (e: React.MouseEvent, image: UploadedImage) => {
    e.stopPropagation();
    if (selectedTool !== "pointer" || image.locked) return;
    
    setSelectedImageId(image.id);
    setSelectedRectangleId(null);
    setSelectedAccidentAreaId(null);
    setSelectedLeakId(null);
    
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;
    
    const newTransform = {
      entityType: 'image' as const,
      entityId: image.id,
      mode: 'drag' as const,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: image.width,
      startHeight: image.height,
      startEntityX: image.x,
      startEntityY: image.y,
    };
    
    activeTransformRef.current = newTransform;
    setActiveTransform(newTransform);
  };

  // 사각형 마우스 다운 핸들러
  const handleRectangleMouseDown = (e: React.MouseEvent, rect: DrawnRectangle) => {
    e.stopPropagation();
    if (selectedTool !== "pointer" || rect.locked) return;
    
    setSelectedRectangleId(rect.id);
    setSelectedImageId(null);
    setSelectedAccidentAreaId(null);
    setSelectedLeakId(null);
    
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;
    
    const newTransform = {
      entityType: 'rectangle' as const,
      entityId: rect.id,
      mode: 'drag' as const,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: rect.width,
      startHeight: rect.height,
      startEntityX: rect.x,
      startEntityY: rect.y,
    };
    
    activeTransformRef.current = newTransform;
    setActiveTransform(newTransform);
  };

  // 사고영역 마우스 다운 핸들러
  const handleAccidentAreaMouseDown = (e: React.MouseEvent, area: AccidentArea) => {
    e.stopPropagation();
    if (selectedTool !== "pointer" || area.locked) return;
    
    setSelectedAccidentAreaId(area.id);
    setSelectedImageId(null);
    setSelectedRectangleId(null);
    setSelectedLeakId(null);
    
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;
    
    const newTransform = {
      entityType: 'accident-area' as const,
      entityId: area.id,
      mode: 'drag' as const,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: area.width,
      startHeight: area.height,
      startEntityX: area.x,
      startEntityY: area.y,
    };
    
    activeTransformRef.current = newTransform;
    setActiveTransform(newTransform);
  };

  // 누수 마커 클릭 핸들러
  const handleLeakMarkerClick = (e: React.MouseEvent, leakId: string) => {
    e.stopPropagation();
    if (selectedTool === "pointer") {
      setSelectedLeakId(leakId);
      setSelectedImageId(null);
      setSelectedRectangleId(null);
      setSelectedAccidentAreaId(null);
    }
  };

  // 삭제 핸들러
  const handleDelete = () => {
    if (selectedImageId) {
      setUploadedImages(prev => prev.filter(img => img.id !== selectedImageId));
      setSelectedImageId(null);
      toast({ title: "삭제 완료", description: "이미지가 삭제되었습니다." });
    } else if (selectedRectangleId) {
      setRectangles(prev => prev.filter(rect => rect.id !== selectedRectangleId));
      setSelectedRectangleId(null);
      toast({ title: "삭제 완료", description: "사각형이 삭제되었습니다." });
    } else if (selectedAccidentAreaId) {
      setAccidentAreas(prev => prev.filter(area => area.id !== selectedAccidentAreaId));
      setSelectedAccidentAreaId(null);
      toast({ title: "삭제 완료", description: "사고 영역이 삭제되었습니다." });
    } else if (selectedLeakId) {
      setLeakMarkers(prev => prev.filter(leak => leak.id !== selectedLeakId));
      setSelectedLeakId(null);
      toast({ title: "삭제 완료", description: "누수 지점이 삭제되었습니다." });
    }
  };

  // 잠금 토글
  const handleToggleLock = () => {
    if (selectedImageId) {
      setUploadedImages(prev =>
        prev.map(img =>
          img.id === selectedImageId ? { ...img, locked: !img.locked } : img
        )
      );
    } else if (selectedRectangleId) {
      setRectangles(prev =>
        prev.map(rect =>
          rect.id === selectedRectangleId ? { ...rect, locked: !rect.locked } : rect
        )
      );
    } else if (selectedAccidentAreaId) {
      setAccidentAreas(prev =>
        prev.map(area =>
          area.id === selectedAccidentAreaId ? { ...area, locked: !area.locked } : area
        )
      );
    }
  };

  // 사각형 너비 변경
  const handleRectangleWidthChange = (value: string) => {
    const width = parseInt(value) || 0;
    if (selectedRectangleId) {
      setRectangles(prev =>
        prev.map(rect =>
          rect.id === selectedRectangleId ? { ...rect, width } : rect
        )
      );
    }
  };

  // 사각형 높이 변경
  const handleRectangleHeightChange = (value: string) => {
    const height = parseInt(value) || 0;
    if (selectedRectangleId) {
      setRectangles(prev =>
        prev.map(rect =>
          rect.id === selectedRectangleId ? { ...rect, height } : rect
        )
      );
    }
  };

  // 사각형 텍스트 변경
  const handleRectangleTextChange = (value: string) => {
    if (selectedRectangleId) {
      setRectangles(prev =>
        prev.map(rect =>
          rect.id === selectedRectangleId ? { ...rect, text: value } : rect
        )
      );
    }
  };

  // 사각형/사고영역 그리기 시작
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - canvasRect.left;
    const y = e.clientY - canvasRect.top;

    if (selectedTool === "rectangle" || selectedTool === "accident-area") {
      setIsDrawing(true);
      setDrawStart({ x, y });
    } else if (selectedTool === "pointer") {
      // 드래그 시작 로직
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    // Canvas-level handler now only handles drawing preview
    // Drag and resize are handled by document-level listeners in useEffect
    
    // Drawing preview for rectangle/accident-area (visual feedback only)
    if (isDrawing && (selectedTool === "rectangle" || selectedTool === "accident-area")) {
      // Drawing preview is handled by render logic
      return;
    }
    
    // All drag/resize logic moved to document listeners
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    
    // 사각형 그리기 완료
    if (isDrawing && selectedTool === "rectangle") {
      const canvasRect = canvasRef.current.getBoundingClientRect();
      const endX = e.clientX - canvasRect.left;
      const endY = e.clientY - canvasRect.top;
      
      const width = Math.abs(endX - drawStart.x);
      const height = Math.abs(endY - drawStart.y);
      
      if (width > 10 && height > 10) {
        const newRectangle: DrawnRectangle = {
          id: `rect-${Date.now()}`,
          x: Math.min(drawStart.x, endX),
          y: Math.min(drawStart.y, endY),
          width,
          height,
          text: "",
          locked: false,
        };
        setRectangles(prev => [...prev, newRectangle]);
        setSelectedRectangleId(newRectangle.id);
        setSelectedImageId(null);
        setSelectedAccidentAreaId(null);
        setSelectedLeakId(null);
      }
      
      setIsDrawing(false);
    }
    
    // 사고영역 그리기 완료
    if (isDrawing && selectedTool === "accident-area") {
      const canvasRect = canvasRef.current.getBoundingClientRect();
      const endX = e.clientX - canvasRect.left;
      const endY = e.clientY - canvasRect.top;
      
      const width = Math.abs(endX - drawStart.x);
      const height = Math.abs(endY - drawStart.y);
      
      if (width > 10 && height > 10) {
        const newArea: AccidentArea = {
          id: `area-${Date.now()}`,
          x: Math.min(drawStart.x, endX),
          y: Math.min(drawStart.y, endY),
          width,
          height,
          locked: false,
        };
        setAccidentAreas(prev => [...prev, newArea]);
        setSelectedAccidentAreaId(newArea.id);
        setSelectedImageId(null);
        setSelectedRectangleId(null);
        setSelectedLeakId(null);
      }
      
      setIsDrawing(false);
    }
    
    // 드래그/리사이즈 완료
    if (activeTransform) {
      setActiveTransform(null);
    }
  };

  if (!user) {
    return null;
  }

  const selectedImage = uploadedImages.find(img => img.id === selectedImageId);
  const selectedRectangle = rectangles.find(rect => rect.id === selectedRectangleId);
  const selectedAccidentArea = accidentAreas.find(area => area.id === selectedAccidentAreaId);

  return (
    <>
      <div className="flex h-[calc(100vh-89px)] min-h-0 overflow-hidden">
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
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
          {/* 숨겨진 파일 입력 */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
            data-testid="input-file-upload"
          />

          {/* 툴바 (상단 중앙) */}
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
            <div 
              className="flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg"
              style={{
                background: "white",
                border: "1px solid rgba(0, 0, 0, 0.08)",
              }}
            >
              {tools.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => handleToolClick(tool.id)}
                  data-testid={`tool-${tool.id}`}
                  className="p-3 rounded-lg transition-all"
                  style={{
                    background: selectedTool === tool.id ? "#008FED" : "transparent",
                    color: selectedTool === tool.id ? "white" : "#0C0C0C",
                  }}
                >
                  <tool.icon className="w-6 h-6" />
                </button>
              ))}
            </div>
          </div>

          {/* 선택된 사각형의 컨트롤 (상단 중앙 아래) */}
          {selectedRectangle && selectedTool === "pointer" && (
            <div 
              className="absolute z-10"
              style={{
                left: `calc(${selectedRectangle.x}px + 180px)`,
                top: `${Math.max(selectedRectangle.y - 60, 80)}px`,
              }}
            >
              <div 
                className="flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg"
                style={{
                  background: "#2C2C2C",
                }}
              >
                <div className="flex items-center gap-2">
                  <span style={{ color: "white", fontSize: "12px", fontWeight: 500 }}>W</span>
                  <input
                    type="number"
                    value={selectedRectangle.width}
                    onChange={(e) => handleRectangleWidthChange(e.target.value)}
                    className="w-20 px-2 py-1 rounded text-white text-sm"
                    style={{
                      background: "#1C1C1C",
                      border: "1px solid #008FED",
                    }}
                    data-testid="input-rectangle-width"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span style={{ color: "white", fontSize: "12px", fontWeight: 500 }}>H</span>
                  <input
                    type="number"
                    value={selectedRectangle.height}
                    onChange={(e) => handleRectangleHeightChange(e.target.value)}
                    className="w-20 px-2 py-1 rounded text-white text-sm"
                    style={{
                      background: "#1C1C1C",
                      border: "none",
                    }}
                    data-testid="input-rectangle-height"
                  />
                </div>
                <button
                  onClick={handleToggleLock}
                  className="p-1 rounded hover:bg-white/10"
                  data-testid="button-toggle-lock"
                >
                  <Lock className="w-4 h-4 text-white" />
                </button>
                <button
                  onClick={handleDelete}
                  className="p-1 rounded hover:bg-white/10"
                  data-testid="button-delete"
                >
                  <Trash2 className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          )}

          {/* 선택된 이미지/누수 마커의 컨트롤 */}
          {(selectedImage || selectedLeakId) && selectedTool === "pointer" && (
            <div 
              className="absolute z-10"
              style={{
                left: selectedImage ? `calc(${selectedImage.x}px + 180px)` : `calc(${leakMarkers.find(l => l.id === selectedLeakId)?.x}px + 180px - 40px)`,
                top: selectedImage ? `${Math.max(selectedImage.y - 50, 80)}px` : `${Math.max((leakMarkers.find(l => l.id === selectedLeakId)?.y || 0) - 50, 80)}px`,
              }}
            >
              <div 
                className="flex items-center gap-3 px-3 py-2 rounded-lg shadow-lg"
                style={{
                  background: "#2C2C2C",
                }}
              >
                {selectedImage && (
                  <button
                    onClick={handleToggleLock}
                    className="p-2 rounded hover:bg-white/10"
                    data-testid="button-toggle-lock-image"
                  >
                    <Lock className="w-5 h-5 text-white" />
                  </button>
                )}
                <button
                  onClick={handleDelete}
                  className="p-2 rounded hover:bg-white/10"
                  data-testid="button-delete-selected"
                >
                  <Trash2 className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          )}

          {/* 캔버스 영역 */}
          <div 
            className="flex-1 relative overflow-hidden"
            style={{
              background: "linear-gradient(0deg, rgba(218, 218, 218, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(218, 218, 218, 0.5) 1px, transparent 1px)",
              backgroundSize: "10px 10px",
            }}
            onClick={handleCanvasClick}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              {/* 도면 컨테이너 */}
              <div
                ref={canvasRef}
                className="bg-white rounded"
                style={{
                  width: "1200px",
                  height: "800px",
                  border: "1px solid #DADADA",
                  position: "relative",
                  cursor: selectedTool === "rectangle" || selectedTool === "accident-area" || selectedTool === "leak" ? "crosshair" : "default",
                }}
                data-testid="canvas-area"
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
              >
                {/* 업로드된 이미지들 */}
                {uploadedImages.map((image) => (
                  <div
                    key={image.id}
                    onMouseDown={(e) => handleImageMouseDown(e, image)}
                    style={{
                      position: "absolute",
                      left: `${image.x}px`,
                      top: `${image.y}px`,
                      width: `${image.width}px`,
                      height: `${image.height}px`,
                      border: selectedImageId === image.id ? "2px solid #008FED" : "none",
                      cursor: selectedTool === "pointer" && !image.locked ? "move" : "pointer",
                    }}
                    data-testid={`image-${image.id}`}
                  >
                    <img
                      src={image.src}
                      alt="Uploaded"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        pointerEvents: "none",
                      }}
                    />
                    
                    {/* 리사이즈 핸들 */}
                    {selectedImageId === image.id && !image.locked && (
                      <>
                        {/* 모서리 핸들 */}
                        <div data-testid={`resize-handle-nw-${image.id}`} onMouseDown={(e) => handleResizeHandleMouseDown(e, 'nw', image, 'image')} style={{ position: 'absolute', top: -4, left: -4, width: 8, height: 8, background: '#008FED', cursor: 'nw-resize', zIndex: 10, pointerEvents: 'auto' }} />
                        <div data-testid={`resize-handle-ne-${image.id}`} onMouseDown={(e) => handleResizeHandleMouseDown(e, 'ne', image, 'image')} style={{ position: 'absolute', top: -4, right: -4, width: 8, height: 8, background: '#008FED', cursor: 'ne-resize', zIndex: 10, pointerEvents: 'auto' }} />
                        <div data-testid={`resize-handle-sw-${image.id}`} onMouseDown={(e) => handleResizeHandleMouseDown(e, 'sw', image, 'image')} style={{ position: 'absolute', bottom: -4, left: -4, width: 8, height: 8, background: '#008FED', cursor: 'sw-resize', zIndex: 10, pointerEvents: 'auto' }} />
                        <div data-testid={`resize-handle-se-${image.id}`} onMouseDown={(e) => handleResizeHandleMouseDown(e, 'se', image, 'image')} style={{ position: 'absolute', bottom: -4, right: -4, width: 8, height: 8, background: '#008FED', cursor: 'se-resize', zIndex: 10, pointerEvents: 'auto' }} />
                        {/* 엣지 핸들 */}
                        <div data-testid={`resize-handle-n-${image.id}`} onMouseDown={(e) => handleResizeHandleMouseDown(e, 'n', image, 'image')} style={{ position: 'absolute', top: -4, left: '50%', transform: 'translateX(-50%)', width: 8, height: 8, background: '#008FED', cursor: 'n-resize', zIndex: 10, pointerEvents: 'auto' }} />
                        <div data-testid={`resize-handle-s-${image.id}`} onMouseDown={(e) => handleResizeHandleMouseDown(e, 's', image, 'image')} style={{ position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%)', width: 8, height: 8, background: '#008FED', cursor: 's-resize', zIndex: 10, pointerEvents: 'auto' }} />
                        <div data-testid={`resize-handle-e-${image.id}`} onMouseDown={(e) => handleResizeHandleMouseDown(e, 'e', image, 'image')} style={{ position: 'absolute', top: '50%', right: -4, transform: 'translateY(-50%)', width: 8, height: 8, background: '#008FED', cursor: 'e-resize', zIndex: 10, pointerEvents: 'auto' }} />
                        <div data-testid={`resize-handle-w-${image.id}`} onMouseDown={(e) => handleResizeHandleMouseDown(e, 'w', image, 'image')} style={{ position: 'absolute', top: '50%', left: -4, transform: 'translateY(-50%)', width: 8, height: 8, background: '#008FED', cursor: 'w-resize', zIndex: 10, pointerEvents: 'auto' }} />
                      </>
                    )}
                  </div>
                ))}

                {/* 사각형들 */}
                {rectangles.map((rect) => (
                  <div
                    key={rect.id}
                    onMouseDown={(e) => handleRectangleMouseDown(e, rect)}
                    style={{
                      position: "absolute",
                      left: `${rect.x}px`,
                      top: `${rect.y}px`,
                      width: `${rect.width}px`,
                      height: `${rect.height}px`,
                      border: selectedRectangleId === rect.id ? "2px solid #008FED" : "1px solid #0C0C0C",
                      background: "rgba(255, 255, 255, 0.8)",
                      cursor: selectedTool === "pointer" && !rect.locked ? "move" : "pointer",
                    }}
                    data-testid={`rectangle-${rect.id}`}
                  >
                    {/* 텍스트 입력 */}
                    {selectedRectangleId === rect.id ? (
                      <input
                        type="text"
                        value={rect.text}
                        onChange={(e) => handleRectangleTextChange(e.target.value)}
                        placeholder="텍스트 입력"
                        className="w-full h-full text-center border-none outline-none bg-transparent"
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          color: "#0C0C0C",
                        }}
                        data-testid="input-rectangle-text"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span
                          style={{
                            fontFamily: "Pretendard",
                            fontSize: "14px",
                            color: "#0C0C0C",
                          }}
                        >
                          {rect.text || ""}
                        </span>
                      </div>
                    )}

                    {/* mm 표시 (하단) */}
                    <div
                      style={{
                        position: "absolute",
                        bottom: "-20px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        background: "rgba(218, 218, 218, 0.9)",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        fontSize: "11px",
                        fontFamily: "Pretendard",
                        color: "#0C0C0C",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {rect.width} mm
                    </div>

                    {/* mm 표시 (우측) */}
                    <div
                      style={{
                        position: "absolute",
                        right: "-50px",
                        top: "50%",
                        transform: "translateY(-50%) rotate(90deg)",
                        background: "rgba(218, 218, 218, 0.9)",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        fontSize: "11px",
                        fontFamily: "Pretendard",
                        color: "#0C0C0C",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {rect.height} mm
                    </div>
                  </div>
                ))}

                {/* 사고 영역들 */}
                {accidentAreas.map((area) => (
                  <div
                    key={area.id}
                    onMouseDown={(e) => handleAccidentAreaMouseDown(e, area)}
                    style={{
                      position: "absolute",
                      left: `${area.x}px`,
                      top: `${area.y}px`,
                      width: `${area.width}px`,
                      height: `${area.height}px`,
                      border: selectedAccidentAreaId === area.id ? "2px dashed #008FED" : "2px dashed #9E9E9E",
                      background: "rgba(189, 189, 189, 0.3)",
                      cursor: selectedTool === "pointer" && !area.locked ? "move" : "pointer",
                    }}
                    data-testid={`accident-area-${area.id}`}
                  >
                    {/* 리사이즈 핸들 */}
                    {selectedAccidentAreaId === area.id && !area.locked && (
                      <>
                        {/* 모서리 핸들 */}
                        <div data-testid={`resize-handle-nw-${area.id}`} onMouseDown={(e) => handleResizeHandleMouseDown(e, 'nw', area, 'accident-area')} style={{ position: 'absolute', top: -4, left: -4, width: 8, height: 8, background: '#008FED', cursor: 'nw-resize', zIndex: 10, pointerEvents: 'auto' }} />
                        <div data-testid={`resize-handle-ne-${area.id}`} onMouseDown={(e) => handleResizeHandleMouseDown(e, 'ne', area, 'accident-area')} style={{ position: 'absolute', top: -4, right: -4, width: 8, height: 8, background: '#008FED', cursor: 'ne-resize', zIndex: 10, pointerEvents: 'auto' }} />
                        <div data-testid={`resize-handle-sw-${area.id}`} onMouseDown={(e) => handleResizeHandleMouseDown(e, 'sw', area, 'accident-area')} style={{ position: 'absolute', bottom: -4, left: -4, width: 8, height: 8, background: '#008FED', cursor: 'sw-resize', zIndex: 10, pointerEvents: 'auto' }} />
                        <div data-testid={`resize-handle-se-${area.id}`} onMouseDown={(e) => handleResizeHandleMouseDown(e, 'se', area, 'accident-area')} style={{ position: 'absolute', bottom: -4, right: -4, width: 8, height: 8, background: '#008FED', cursor: 'se-resize', zIndex: 10, pointerEvents: 'auto' }} />
                        {/* 엣지 핸들 */}
                        <div data-testid={`resize-handle-n-${area.id}`} onMouseDown={(e) => handleResizeHandleMouseDown(e, 'n', area, 'accident-area')} style={{ position: 'absolute', top: -4, left: '50%', transform: 'translateX(-50%)', width: 8, height: 8, background: '#008FED', cursor: 'n-resize', zIndex: 10, pointerEvents: 'auto' }} />
                        <div data-testid={`resize-handle-s-${area.id}`} onMouseDown={(e) => handleResizeHandleMouseDown(e, 's', area, 'accident-area')} style={{ position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%)', width: 8, height: 8, background: '#008FED', cursor: 's-resize', zIndex: 10, pointerEvents: 'auto' }} />
                        <div data-testid={`resize-handle-e-${area.id}`} onMouseDown={(e) => handleResizeHandleMouseDown(e, 'e', area, 'accident-area')} style={{ position: 'absolute', top: '50%', right: -4, transform: 'translateY(-50%)', width: 8, height: 8, background: '#008FED', cursor: 'e-resize', zIndex: 10, pointerEvents: 'auto' }} />
                        <div data-testid={`resize-handle-w-${area.id}`} onMouseDown={(e) => handleResizeHandleMouseDown(e, 'w', area, 'accident-area')} style={{ position: 'absolute', top: '50%', left: -4, transform: 'translateY(-50%)', width: 8, height: 8, background: '#008FED', cursor: 'w-resize', zIndex: 10, pointerEvents: 'auto' }} />
                      </>
                    )}
                  </div>
                ))}

                {/* 누수 마커들 */}
                {leakMarkers.map((marker) => (
                  <div
                    key={marker.id}
                    onClick={(e) => handleLeakMarkerClick(e, marker.id)}
                    style={{
                      position: "absolute",
                      left: `${marker.x - 15}px`,
                      top: `${marker.y - 15}px`,
                      width: "30px",
                      height: "30px",
                      cursor: "pointer",
                    }}
                    data-testid={`leak-marker-${marker.id}`}
                  >
                    {/* 빨간 원 */}
                    <div
                      style={{
                        width: "20px",
                        height: "20px",
                        borderRadius: "50%",
                        background: "#E53935",
                        position: "absolute",
                        top: "5px",
                        left: "5px",
                        border: selectedLeakId === marker.id ? "2px solid #008FED" : "none",
                      }}
                    />
                    {/* 파란 삼각형 (하단) */}
                    <div
                      style={{
                        width: "0",
                        height: "0",
                        borderLeft: "8px solid transparent",
                        borderRight: "8px solid transparent",
                        borderTop: "12px solid #1976D2",
                        position: "absolute",
                        bottom: "0",
                        left: "7px",
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
