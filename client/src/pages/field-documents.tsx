import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { User, Case, CaseDocument } from "@shared/schema";
import { Upload, X, Check, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";

type DocumentCategory = "전체" | "현장" | "수리중" | "복구완료" | "청구" | "개인정보";

interface UploadingFile {
  id: string;
  file: File;
  category: string;
  progress: number;
  uploaded: boolean;
}

// Helper function to convert File to Base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/png;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
};

// Helper function to download a file from Base64
const downloadFile = (fileName: string, fileType: string, base64Data: string) => {
  // Create blob from base64
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: fileType });

  // Create download link
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export default function FieldDocuments() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory>("전체");
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
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

  // 문서 목록 조회
  const { data: documents = [], isLoading } = useQuery<CaseDocument[]>({
    queryKey: ["/api/documents/case", selectedCaseId],
    enabled: !!selectedCaseId,
  });

  // 문서 업로드 mutation
  const uploadMutation = useMutation({
    mutationFn: async (data: {
      caseId: string;
      category: string;
      fileName: string;
      fileType: string;
      fileSize: number;
      fileData: string;
      createdBy: string;
    }) => {
      return await apiRequest("POST", "/api/documents", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents/case", selectedCaseId] });
      toast({
        title: "파일이 업로드 되었습니다",
        description: "",
        className: "bg-[#008FED] text-white border-0",
      });
    },
  });

  // 문서 삭제 mutation
  const deleteMutation = useMutation({
    mutationFn: async (documentId: string) => {
      return await apiRequest("DELETE", `/api/documents/${documentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents/case", selectedCaseId] });
    },
  });

  // 카테고리 변경 mutation
  const updateCategoryMutation = useMutation({
    mutationFn: async ({ documentId, category }: { documentId: string; category: string }) => {
      return await apiRequest("PATCH", `/api/documents/${documentId}`, { category });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents/case", selectedCaseId] });
      const fileName = documents.find(d => d.id === variables.documentId)?.fileName || "파일";
      toast({
        title: `${fileName}을(를) ${variables.category} 카테고리로 이동했습니다.`,
        description: "",
      });
    },
  });

  if (!user || !selectedCaseId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#F5F7FA]">
        <div
          style={{
            fontFamily: "Pretendard",
            fontSize: "16px",
            fontWeight: 500,
            color: "rgba(12, 12, 12, 0.5)",
          }}
        >
          케이스를 선택해주세요
        </div>
      </div>
    );
  }

  const categories: DocumentCategory[] = ["전체", "현장", "수리중", "복구완료", "청구", "개인정보"];

  // 파일 선택 핸들러
  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newFiles: UploadingFile[] = Array.from(files).map(file => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      category: selectedCategory === "전체" ? "현장" : selectedCategory,
      progress: 0,
      uploaded: false,
    }));

    setUploadingFiles(prev => [...prev, ...newFiles]);

    // 파일 업로드
    for (const uploadingFile of newFiles) {
      try {
        // Progress simulation
        const interval = setInterval(() => {
          setUploadingFiles(prev =>
            prev.map(f =>
              f.id === uploadingFile.id ? { ...f, progress: Math.min(f.progress + 20, 90) } : f
            )
          );
        }, 200);

        // Convert to Base64
        const base64Data = await fileToBase64(uploadingFile.file);

        // Upload to server
        await uploadMutation.mutateAsync({
          caseId: selectedCaseId,
          category: uploadingFile.category,
          fileName: uploadingFile.file.name,
          fileType: uploadingFile.file.type,
          fileSize: uploadingFile.file.size,
          fileData: base64Data,
          createdBy: user.id,
        });

        clearInterval(interval);

        // Mark as complete
        setUploadingFiles(prev =>
          prev.map(f =>
            f.id === uploadingFile.id ? { ...f, progress: 100, uploaded: true } : f
          )
        );

        // Remove from uploading list after a delay
        setTimeout(() => {
          setUploadingFiles(prev => prev.filter(f => f.id !== uploadingFile.id));
        }, 1000);
      } catch (error) {
        console.error("Upload error:", error);
        setUploadingFiles(prev => prev.filter(f => f.id !== uploadingFile.id));
        toast({
          title: "업로드 중 오류가 발생했습니다",
          description: "",
          variant: "destructive",
        });
      }
    }
  };

  // 파일 삭제
  const handleFileRemove = (documentId: string) => {
    deleteMutation.mutate(documentId);
  };

  // 카테고리 변경
  const handleCategoryChange = (documentId: string, newCategory: string) => {
    updateCategoryMutation.mutate({ documentId, category: newCategory });
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
  const filteredDocuments = selectedCategory === "전체"
    ? documents
    : documents.filter(d => d.category === selectedCategory);

  // 저장 핸들러
  const handleSave = () => {
    toast({
      title: "증빙자료가 저장되었습니다",
      description: "",
      className: "bg-[#008FED] text-white border-0",
      action: (
        <button
          onClick={() => {
            // 확인하기 클릭 시 동작 (필요시 추가)
          }}
          className="px-4 py-2 rounded"
          style={{
            background: "white",
            color: "#008FED",
            fontFamily: "Pretendard",
            fontSize: "14px",
            fontWeight: 600,
            textDecoration: "underline",
          }}
        >
          확인하기
        </button>
      ),
    });
  };

  return (
    <div className="flex-1 overflow-y-auto p-8">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-8">
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
        
        {/* 저장 버튼 */}
        <button
          type="button"
          onClick={handleSave}
          className="px-8 py-3 rounded-lg hover-elevate active-elevate-2"
          style={{
            background: "#008FED",
            color: "white",
            fontFamily: "Pretendard",
            fontSize: "16px",
            fontWeight: 600,
            letterSpacing: "-0.02em",
            border: "none",
          }}
          data-testid="button-save"
        >
          저장
        </button>
      </div>

      {/* 작성중인 건 */}
      {selectedCase && (
        <div className="mb-6">
          <div
            style={{
              fontFamily: "Pretendard",
              fontSize: "14px",
              fontWeight: 400,
              letterSpacing: "-0.02em",
              color: "rgba(12, 12, 12, 0.5)",
              marginBottom: "8px",
            }}
          >
            작성중인 건
          </div>
          
          <div 
            className="p-4 rounded-lg"
            style={{
              background: "rgba(12, 12, 12, 0.03)",
            }}
          >
            {/* 첫 번째 줄: 보험사명 + 사고번호 */}
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: "#008FED" }}
              />
              <span
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "15px",
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                  color: "#0C0C0C",
                }}
              >
                {selectedCase.insuranceCompany || "보험사 미정"} {selectedCase.insuranceAccidentNo || ""}
              </span>
            </div>
            
            {/* 두 번째 줄: 접수번호, 계약자, 담당자 */}
            <div 
              className="flex items-center gap-4"
              style={{
                fontFamily: "Pretendard",
                fontSize: "13px",
                fontWeight: 400,
                letterSpacing: "-0.02em",
                color: "rgba(12, 12, 12, 0.5)",
                paddingLeft: "12px",
              }}
            >
              <span>접수번호 {selectedCase.caseNumber}</span>
              <span>계약자 {selectedCase.policyHolderName || selectedCase.clientName || "미정"}</span>
              <span>담당자 {selectedCase.assignedPartnerManager || "미정"}</span>
            </div>
          </div>
        </div>
      )}

      {/* 카테고리 탭 */}
      <div 
        className="flex gap-8 mb-6"
        style={{
          borderBottom: "2px solid rgba(12, 12, 12, 0.08)",
        }}
      >
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setSelectedCategory(category)}
            className="pb-3 transition-all relative"
            style={{
              fontFamily: "Pretendard",
              fontSize: "16px",
              fontWeight: selectedCategory === category ? 600 : 400,
              letterSpacing: "-0.02em",
              background: "transparent",
              color: selectedCategory === category ? "#008FED" : "rgba(12, 12, 12, 0.5)",
              border: "none",
            }}
            data-testid={`tab-${category}`}
          >
            {category}
            {selectedCategory === category && (
              <div
                style={{
                  position: "absolute",
                  bottom: "-2px",
                  left: 0,
                  right: 0,
                  height: "2px",
                  background: "#008FED",
                }}
              />
            )}
          </button>
        ))}
      </div>

      {/* 파일 업로드 영역 */}
      <div
        className="mb-6 rounded-xl p-12 transition-all cursor-pointer"
        style={{
          background: isDragging ? "rgba(0, 143, 237, 0.08)" : "rgba(0, 143, 237, 0.03)",
          border: "none",
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
                fontSize: "15px",
                fontWeight: 400,
                letterSpacing: "-0.02em",
                color: "rgba(12, 12, 12, 0.5)",
                marginBottom: "12px",
              }}
            >
              파일 또는 이미지를 이곳에 올려주세요
            </div>
            <button
              type="button"
              style={{
                fontFamily: "Pretendard",
                fontSize: "15px",
                fontWeight: 500,
                letterSpacing: "-0.02em",
                color: "#008FED",
                border: "none",
                background: "transparent",
                cursor: "pointer",
              }}
              data-testid="button-select-file"
            >
              파일 찾기
            </button>
          </div>
        </div>
      </div>

      {/* Uploading files (progress) */}
      {uploadingFiles.length > 0 && (
        <div className="mb-6">
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
            업로드 중 {uploadingFiles.length}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {uploadingFiles.map((uploadingFile) => (
              <div
                key={uploadingFile.id}
                className="relative p-4 rounded-xl flex items-start gap-4"
                style={{
                  background: "white",
                  border: "1px solid rgba(12, 12, 12, 0.08)",
                }}
              >
                <div
                  className="flex-shrink-0 rounded-lg overflow-hidden"
                  style={{
                    width: "64px",
                    height: "64px",
                    background: "rgba(12, 12, 12, 0.04)",
                  }}
                >
                  {uploadingFile.file.type.startsWith('image/') ? (
                    <img
                      src={URL.createObjectURL(uploadingFile.file)}
                      alt={uploadingFile.file.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Upload className="w-6 h-6" style={{ color: "rgba(12, 12, 12, 0.3)" }} />
                    </div>
                  )}
                </div>

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
                    {uploadingFile.file.name}
                  </div>
                  <div
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "12px",
                      fontWeight: 400,
                      letterSpacing: "-0.02em",
                      color: "rgba(12, 12, 12, 0.5)",
                      marginBottom: "8px",
                    }}
                  >
                    {formatFileSize(uploadingFile.file.size)}
                  </div>

                  {/* Progress bar */}
                  <Progress value={uploadingFile.progress} className="h-1.5" />

                  {uploadingFile.uploaded && (
                    <div
                      className="mt-2 flex items-center gap-1"
                      style={{
                        fontFamily: "Pretendard",
                        fontSize: "12px",
                        fontWeight: 500,
                        letterSpacing: "-0.02em",
                        color: "#008FED",
                      }}
                    >
                      <Check className="w-3 h-3" />
                      업로드 완료
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
        파일 목록 {filteredDocuments.length}
      </div>

      {/* 업로드된 문서들 */}
      {isLoading ? (
        <div className="text-center py-12">
          <div
            style={{
              fontFamily: "Pretendard",
              fontSize: "16px",
              fontWeight: 400,
              color: "rgba(12, 12, 12, 0.5)",
            }}
          >
            불러오는 중...
          </div>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="text-center py-12">
          <div
            style={{
              fontFamily: "Pretendard",
              fontSize: "16px",
              fontWeight: 400,
              color: "rgba(12, 12, 12, 0.5)",
            }}
          >
            업로드된 파일이 없습니다
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {filteredDocuments.map((doc) => {
            const isImage = doc.fileType.startsWith('image/');
            return (
              <div
                key={doc.id}
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
                  {isImage ? (
                    <img
                      src={`data:${doc.fileType};base64,${doc.fileData}`}
                      alt={doc.fileName}
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
                  <button
                    type="button"
                    onClick={() => downloadFile(doc.fileName, doc.fileType, doc.fileData)}
                    className="truncate mb-1 text-left w-full hover:underline"
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      fontWeight: 500,
                      letterSpacing: "-0.02em",
                      color: "#0C0C0C",
                    }}
                    data-testid={`button-download-${doc.id}`}
                  >
                    {doc.fileName}
                  </button>
                  <div
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "12px",
                      fontWeight: 400,
                      letterSpacing: "-0.02em",
                      color: "rgba(12, 12, 12, 0.5)",
                      marginBottom: "8px",
                    }}
                  >
                    {formatFileSize(doc.fileSize)}
                  </div>

                  {/* Category dropdown */}
                  <Select
                    value={doc.category}
                    onValueChange={(value) => handleCategoryChange(doc.id, value)}
                  >
                    <SelectTrigger
                      className="w-32 h-8"
                      style={{
                        fontFamily: "Pretendard",
                        fontSize: "12px",
                        fontWeight: 400,
                      }}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.filter(c => c !== "전체").map((category) => (
                        <SelectItem key={category} value={category}>
                          <div className="flex items-center gap-2">
                            {doc.category === category && <Check className="w-3 h-3" />}
                            <span>{category}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 다운로드 및 삭제 버튼 */}
                <div className="absolute top-2 right-2 flex gap-1">
                  <button
                    type="button"
                    onClick={() => downloadFile(doc.fileName, doc.fileType, doc.fileData)}
                    className="p-1.5 rounded-lg hover-elevate active-elevate-2"
                    style={{
                      background: "rgba(255, 255, 255, 0.9)",
                      border: "1px solid rgba(12, 12, 12, 0.1)",
                    }}
                    data-testid={`button-download-icon-${doc.id}`}
                  >
                    <Download className="w-4 h-4" style={{ color: "rgba(12, 12, 12, 0.5)" }} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFileRemove(doc.id)}
                    className="p-1.5 rounded-lg hover-elevate active-elevate-2"
                    style={{
                      background: "rgba(255, 255, 255, 0.9)",
                      border: "1px solid rgba(12, 12, 12, 0.1)",
                    }}
                    data-testid={`button-delete-${doc.id}`}
                  >
                    <X className="w-4 h-4" style={{ color: "rgba(12, 12, 12, 0.5)" }} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
