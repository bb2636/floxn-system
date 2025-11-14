import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { User, Case } from "@shared/schema";
import { Upload, X, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface UploadedFile {
  id: string;
  file: File;
  category: string;
  progress: number;
  uploaded: boolean;
}

type DocumentCategory = "전체" | "현장" | "수리중" | "복구완료" | "청구" | "개인정보";

export default function FieldDocuments() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory>("전체");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  // 현장입력에서 선택한 케이스 ID 가져오기
  const selectedCaseId = localStorage.getItem('selectedFieldSurveyCaseId') || '';

  // 선택된 케이스 데이터 가져오기
  const { data: selectedCase } = useQuery<Case>({
    queryKey: ["/api/cases", selectedCaseId],
    enabled: !!selectedCaseId,
  });

  if (!user) {
    return null;
  }

  const categories: DocumentCategory[] = ["전체", "현장", "수리중", "복구완료", "청구", "개인정보"];

  // 파일 선택 핸들러
  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newFiles: UploadedFile[] = Array.from(files).map(file => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      category: selectedCategory === "전체" ? "현장" : selectedCategory,
      progress: 0,
      uploaded: false,
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);

    // 시뮬레이션: 파일 업로드 진행
    newFiles.forEach(uploadedFile => {
      simulateUpload(uploadedFile.id);
    });
  };

  // 업로드 시뮬레이션
  const simulateUpload = (fileId: string) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 20;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setUploadedFiles(prev =>
          prev.map(f =>
            f.id === fileId ? { ...f, progress: 100, uploaded: true } : f
          )
        );
      } else {
        setUploadedFiles(prev =>
          prev.map(f =>
            f.id === fileId ? { ...f, progress } : f
          )
        );
      }
    }, 300);
  };

  // 파일 삭제
  const handleFileRemove = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  // 드래그 앤 드롭 핸들러
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  // 파일 크기 포맷
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)}MB`;
  };

  // 필터링된 파일 목록
  const filteredFiles = selectedCategory === "전체"
    ? uploadedFiles
    : uploadedFiles.filter(f => f.category === selectedCategory);

  return (
    <div className="flex-1 overflow-y-auto bg-[#F5F7FA] p-8">
      {/* 헤더 */}
      <div className="flex items-center gap-4 mb-8">
        <h1
          style={{
            fontFamily: "Pretendard",
            fontSize: "26px",
            fontWeight: 600,
            letterSpacing: "-0.02em",
            color: "#0C0C0C",
          }}
        >
          증빙자료 등록
        </h1>
      </div>

      {/* 작성중인 건 */}
      {selectedCase && (
        <div className="mb-6">
          <div
            className="mb-4"
            style={{
              fontFamily: "Pretendard",
              fontSize: "15px",
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color: "rgba(12, 12, 12, 0.7)",
            }}
          >
            작성중인 건
          </div>
          <div
            className="p-4 rounded-xl"
            style={{
              background: "rgba(12, 12, 12, 0.04)",
              backdropFilter: "blur(7px)",
            }}
          >
            <div className="flex items-start gap-4">
              {/* 케이스 정보 */}
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: "#008FED" }} />
                  <div className="flex items-center gap-2">
                    <span
                      style={{
                        fontFamily: "Pretendard",
                        fontSize: "18px",
                        fontWeight: 600,
                        letterSpacing: "-0.02em",
                        color: "rgba(12, 12, 12, 0.9)",
                      }}
                    >
                      {selectedCase.insuranceCompany}
                    </span>
                    <span
                      style={{
                        fontFamily: "Pretendard",
                        fontSize: "18px",
                        fontWeight: 600,
                        letterSpacing: "-0.02em",
                        color: "rgba(12, 12, 12, 0.9)",
                      }}
                    >
                      {selectedCase.insuranceAccidentNo}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-6 pl-6">
                  <div className="flex items-center gap-1.5">
                    <span
                      style={{
                        fontFamily: "Pretendard",
                        fontSize: "16px",
                        fontWeight: 400,
                        letterSpacing: "-0.02em",
                        color: "rgba(12, 12, 12, 0.5)",
                      }}
                    >
                      접수번호
                    </span>
                    <span
                      style={{
                        fontFamily: "Pretendard",
                        fontSize: "16px",
                        fontWeight: 400,
                        letterSpacing: "-0.02em",
                        color: "rgba(12, 12, 12, 0.7)",
                      }}
                    >
                      {selectedCase.insurancePolicyNo || "-"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      style={{
                        fontFamily: "Pretendard",
                        fontSize: "16px",
                        fontWeight: 400,
                        letterSpacing: "-0.02em",
                        color: "rgba(12, 12, 12, 0.5)",
                      }}
                    >
                      계약자
                    </span>
                    <span
                      style={{
                        fontFamily: "Pretendard",
                        fontSize: "16px",
                        fontWeight: 400,
                        letterSpacing: "-0.02em",
                        color: "rgba(12, 12, 12, 0.7)",
                      }}
                    >
                      {selectedCase.policyHolderName || "-"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      style={{
                        fontFamily: "Pretendard",
                        fontSize: "16px",
                        fontWeight: 400,
                        letterSpacing: "-0.02em",
                        color: "rgba(12, 12, 12, 0.5)",
                      }}
                    >
                      담당자
                    </span>
                    <span
                      style={{
                        fontFamily: "Pretendard",
                        fontSize: "16px",
                        fontWeight: 400,
                        letterSpacing: "-0.02em",
                        color: "rgba(12, 12, 12, 0.7)",
                      }}
                    >
                      {selectedCase.insuredName || "-"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 증빙자료 정보 섹션 */}
      <div
        className="mb-6"
        style={{
          fontFamily: "Pretendard",
          fontSize: "18px",
          fontWeight: 600,
          letterSpacing: "-0.02em",
          color: "#0C0C0C",
        }}
      >
        증빙자료 정보
      </div>

      {/* 카테고리 탭 */}
      <div className="flex border-b mb-6" style={{ borderColor: "rgba(12, 12, 12, 0.1)" }}>
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setSelectedCategory(category)}
            className="px-8 py-3 transition-colors"
            style={{
              fontFamily: "Pretendard",
              fontSize: "16px",
              fontWeight: selectedCategory === category ? 600 : 500,
              letterSpacing: "-0.02em",
              color: selectedCategory === category ? "#008FED" : "rgba(12, 12, 12, 0.5)",
              borderBottom: selectedCategory === category ? "2px solid #008FED" : "2px solid transparent",
            }}
            data-testid={`tab-${category}`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* 파일 업로드 영역 */}
      <div
        className="rounded-2xl p-12 mb-6 cursor-pointer transition-all"
        style={{
          background: isDragging ? "rgba(0, 143, 237, 0.05)" : "rgba(12, 12, 12, 0.02)",
          border: isDragging ? "2px dashed #008FED" : "2px dashed rgba(12, 12, 12, 0.1)",
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        data-testid="upload-area"
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          data-testid="file-input"
        />
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "rgba(0, 143, 237, 0.1)" }}>
            <Upload className="w-8 h-8" style={{ color: "#008FED" }} />
          </div>
          <div className="text-center">
            <div
              style={{
                fontFamily: "Pretendard",
                fontSize: "16px",
                fontWeight: 500,
                letterSpacing: "-0.02em",
                color: "rgba(12, 12, 12, 0.7)",
                marginBottom: "8px",
              }}
            >
              파일 또는 이미지를 이곳에 올려주세요
            </div>
            <button
              type="button"
              className="px-6 py-2 rounded-lg"
              style={{
                fontFamily: "Pretendard",
                fontSize: "14px",
                fontWeight: 500,
                letterSpacing: "-0.02em",
                color: "#008FED",
                border: "1px solid #008FED",
                background: "white",
              }}
              data-testid="button-select-file"
            >
              파일 찾기
            </button>
          </div>
        </div>
      </div>

      {/* 파일 목록 */}
      <div
        className="mb-2"
        style={{
          fontFamily: "Pretendard",
          fontSize: "15px",
          fontWeight: 500,
          letterSpacing: "-0.02em",
          color: "rgba(12, 12, 12, 0.7)",
        }}
      >
        파일 목록 {filteredFiles.length}
      </div>

      {/* 업로드된 파일들 */}
      <div className="grid grid-cols-2 gap-4">
        {filteredFiles.map((uploadedFile) => (
          <div
            key={uploadedFile.id}
            className="relative p-4 rounded-xl flex items-start gap-4"
            style={{
              background: "white",
              border: "1px solid rgba(12, 12, 12, 0.08)",
            }}
          >
            {/* 썸네일 */}
            <div
              className="flex-shrink-0 rounded-lg overflow-hidden"
              style={{
                width: "64px",
                height: "64px",
                background: "rgba(12, 12, 12, 0.04)",
              }}
            >
              {uploadedFile.file.type.startsWith('image/') ? (
                <img
                  src={URL.createObjectURL(uploadedFile.file)}
                  alt={uploadedFile.file.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Upload className="w-6 h-6" style={{ color: "rgba(12, 12, 12, 0.3)" }} />
                </div>
              )}
            </div>

            {/* 파일 정보 */}
            <div className="flex-1 min-w-0">
              <div
                className="truncate mb-1"
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "14px",
                  fontWeight: 500,
                  letterSpacing: "-0.02em",
                  color: "#0C0C0C",
                }}
              >
                {uploadedFile.file.name}
              </div>
              <div
                className="mb-2"
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "12px",
                  fontWeight: 400,
                  color: "rgba(12, 12, 12, 0.5)",
                }}
              >
                {formatFileSize(uploadedFile.file.size)}
              </div>

              {/* 업로드 진행바 또는 카테고리 선택 */}
              {!uploadedFile.uploaded ? (
                <div className="space-y-2">
                  <Progress value={uploadedFile.progress} className="h-1.5" />
                  <div
                    className="text-right"
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "12px",
                      fontWeight: 500,
                      color: "#008FED",
                    }}
                  >
                    {Math.round(uploadedFile.progress)}%
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "12px",
                      fontWeight: 500,
                      color: "#008FED",
                    }}
                  >
                    업로드 완료
                  </span>
                  <Select
                    value={uploadedFile.category}
                    onValueChange={(value) => {
                      const newCategory = value as DocumentCategory;
                      setUploadedFiles(prev =>
                        prev.map(f =>
                          f.id === uploadedFile.id ? { ...f, category: newCategory } : f
                        )
                      );
                      toast({
                        title: "카테고리 변경",
                        description: `"${uploadedFile.file.name}"을(를) ${newCategory} 카테고리로 이동했습니다.`,
                      });
                    }}
                  >
                    <SelectTrigger 
                      className="h-7 w-[100px] text-xs"
                      style={{
                        fontFamily: "Pretendard",
                        fontSize: "12px",
                        borderColor: "rgba(12, 12, 12, 0.2)",
                      }}
                      data-testid={`select-category-${uploadedFile.id}`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.filter(c => c !== "전체").map((category) => (
                        <SelectItem 
                          key={category} 
                          value={category}
                          style={{
                            fontFamily: "Pretendard",
                            fontSize: "12px",
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <span>{category}</span>
                            {uploadedFile.category === category && (
                              <Check className="w-3 h-3" style={{ color: "#008FED" }} />
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* 삭제 버튼 */}
            <button
              type="button"
              onClick={() => handleFileRemove(uploadedFile.id)}
              className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center hover-elevate active-elevate-2"
              style={{
                background: "rgba(12, 12, 12, 0.05)",
              }}
              data-testid={`button-remove-${uploadedFile.id}`}
            >
              <X className="w-4 h-4" style={{ color: "rgba(12, 12, 12, 0.5)" }} />
            </button>
          </div>
        ))}
      </div>

      {/* 빈 상태 */}
      {filteredFiles.length === 0 && (
        <div
          className="text-center py-12"
          style={{
            fontFamily: "Pretendard",
            fontSize: "14px",
            color: "rgba(12, 12, 12, 0.4)",
          }}
        >
          업로드된 파일이 없습니다
        </div>
      )}
    </div>
  );
}
