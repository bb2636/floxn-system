import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { User, CaseWithLatestProgress } from "@shared/schema";
import { Search, Cloud } from "lucide-react";
import logoIcon from "@assets/Frame 2_1762217940686.png";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { GlobalHeader } from "@/components/global-header";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// 진행상태 목록
const CASE_STATUSES = [
  "접수중",
  "접수완료",
  "현장방문",
  "현장정보 입력",
  "검토중",
  "반려",
  "1차승인",
  "발송",
  "복구요청",
  "직접복구",
  "미복구",
  "청구자료제출",
  "출동비 청구",
  "청구",
  "입금완료",
  "일부입금",
  "정산완료",
  "접수취소",
] as const;

// 상태별 색상
const getStatusColor = (status: string) => {
  if (status === "1차승인") return "#008FED"; // 파란색
  if (status === "복구요청") return "#00C853"; // 초록색
  if (status === "접수취소" || status === "반려") return "#ED1C00"; // 빨간색
  if (status === "입금완료" || status === "정산완료") return "#4CAF50"; // 완료 초록색
  return "rgba(12, 12, 12, 0.7)"; // 기본 회색
};

const specialNotesFormSchema = z.object({
  specialNotes: z.string().max(1000, "특이사항은 최대 1000자까지 입력 가능합니다"),
});

const progressFormSchema = z.object({
  content: z.string().min(1, "진행상황 내용을 입력해주세요"),
});

export default function ComprehensiveProgress() {
  const [activeMenu, setActiveMenu] = useState("종합진행관리");
  const [activeTab, setActiveTab] = useState("전체");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [detailTab, setDetailTab] = useState("기본정보");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: user, isLoading: userLoading } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  const { data: cases, isLoading } = useQuery<CaseWithLatestProgress[]>({
    queryKey: ["/api/cases"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ caseId, status }: { caseId: string; status: string }) => {
      // 백엔드에서 미복구→출동비 청구 전환 처리
      return await apiRequest("PATCH", `/api/cases/${caseId}/status`, { status });
    },
    onMutate: async ({ caseId, status }) => {
      // 진행 중인 refetch 취소
      await queryClient.cancelQueries({ queryKey: ["/api/cases"] });
      
      // 이전 데이터 저장 (롤백용)
      const previousCases = queryClient.getQueryData<CaseWithLatestProgress[]>(["/api/cases"]);
      
      // 미복구는 출동비 청구로 정규화 (백엔드와 동일한 로직)
      const normalizedStatus = status === "미복구" ? "출동비 청구" : status;
      
      // Optimistic update: 즉시 UI 업데이트 (status만 변경, 나머지는 그대로 유지)
      queryClient.setQueryData<CaseWithLatestProgress[]>(["/api/cases"], (old) => {
        if (!old) return old;
        return old.map(c => 
          c.id === caseId 
            ? { ...c, status: normalizedStatus }
            : c
        );
      });
      
      return { previousCases };
    },
    onSuccess: (data, variables) => {
      // 백엔드에서 반환된 실제 데이터로 업데이트
      if (data && typeof data === 'object' && 'id' in data) {
        queryClient.setQueryData<CaseWithLatestProgress[]>(["/api/cases"], (old) => {
          if (!old) return old;
          return old.map(c => c.id === data.id ? { ...c, ...data } : c);
        });
      }
      
      // 백그라운드 refetch로 전체 데이터 동기화
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      
      // 미복구 선택 시 자동 전환 알림 (백엔드에서 출동비 청구로 변경됨)
      if (variables.status === "미복구") {
        toast({
          title: "상태 자동 변경",
          description: "미복구 선택으로 인해 상태가 '출동비 청구'로 자동 변경되었습니다.",
        });
      } else {
        toast({
          title: "상태 변경 완료",
          description: "진행상태가 성공적으로 변경되었습니다.",
        });
      }
    },
    onError: (error, variables, context) => {
      // 롤백: 이전 데이터 복원
      if (context?.previousCases) {
        queryClient.setQueryData(["/api/cases"], context.previousCases);
      }
      
      toast({
        title: "상태 변경 실패",
        description: "상태 변경 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const updateSpecialNotesMutation = useMutation({
    mutationFn: async ({ caseId, specialNotes }: { caseId: string; specialNotes: string | null }) => {
      return await apiRequest("PATCH", `/api/cases/${caseId}/special-notes`, { specialNotes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      specialNotesForm.reset();
      toast({
        variant: "snackbar",
        title: "특이사항이 저장되었습니다",
      });
    },
    onError: () => {
      toast({
        title: "저장 실패",
        description: "특이사항 저장 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const confirmSpecialNotesMutation = useMutation({
    mutationFn: async (caseId: string) => {
      return await apiRequest("PATCH", `/api/cases/${caseId}/special-notes-confirm`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      toast({
        variant: "snackbar",
        title: "특이사항이 확인되었습니다",
      });
    },
    onError: () => {
      toast({
        title: "확인 실패",
        description: "특이사항 확인 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const addProgressMutation = useMutation({
    mutationFn: async ({ caseId, content }: { caseId: string; content: string }) => {
      return await apiRequest("POST", `/api/cases/${caseId}/progress`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      setShowProgressDialog(false);
      toast({
        variant: "snackbar",
        title: "진행상황이 추가되었습니다",
      });
    },
    onError: () => {
      toast({
        title: "추가 실패",
        description: "진행상황 추가 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // Find selected case
  const selectedCase = cases?.find(c => c.id === selectedCaseId);

  // Form for special notes
  const specialNotesForm = useForm<z.infer<typeof specialNotesFormSchema>>({
    resolver: zodResolver(specialNotesFormSchema),
    defaultValues: {
      specialNotes: "",
    },
  });

  // Form for progress
  const progressForm = useForm<z.infer<typeof progressFormSchema>>({
    resolver: zodResolver(progressFormSchema),
    defaultValues: {
      content: "",
    },
  });

  const menuItems = [
    { name: "홈" },
    { name: "접수하기" },
    { name: "현장조사" },
    { name: "종합진행관리" },
    { name: "통계 및 정산" },
    { name: "관리자 설정" },
  ];

  const tabs = [
    { name: "전체", key: "all" },
    { name: "협력사 미배정", key: "unassigned" },
    { name: "심사대기", key: "pending" },
    { name: "반려", key: "rejected" },
    { name: "2차 심사대기", key: "pending2" },
    { name: "승인", key: "approved" },
  ];

  // 탭 필터링
  const filteredByTab = (cases || []).filter((caseItem) => {
    if (activeTab === "전체") return true;
    if (activeTab === "협력사 미배정") return !caseItem.assignedPartner;
    if (activeTab === "심사대기") return caseItem.status === "심사대기";
    if (activeTab === "반려") return caseItem.status === "반려";
    if (activeTab === "2차 심사대기") return caseItem.status === "2차 심사대기";
    if (activeTab === "승인") return caseItem.status === "승인";
    return true;
  });

  // 검색 필터링
  const filteredData = filteredByTab.filter((caseItem) => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    
    if (normalizedQuery === "") {
      return true;
    }

    const insuranceCompany = (caseItem.insuranceCompany || "").toLowerCase();
    const insuranceAccidentNo = (caseItem.insuranceAccidentNo || "").toLowerCase();
    const caseNumber = (caseItem.caseNumber || "").toLowerCase();
    const clientName = (caseItem.clientName || "").toLowerCase();
    const assignedPartnerManager = (caseItem.assignedPartnerManager || "").toLowerCase();
    
    return (
      insuranceCompany.includes(normalizedQuery) ||
      insuranceAccidentNo.includes(normalizedQuery) ||
      caseNumber.includes(normalizedQuery) ||
      clientName.includes(normalizedQuery) ||
      assignedPartnerManager.includes(normalizedQuery)
    );
  });

  const totalCount = filteredData.length;

  // 상태 변경 핸들러
  const handleStatusChange = (caseId: string, status: string) => {
    if (user?.role !== "관리자") {
      toast({
        title: "권한 없음",
        description: "상태 변경은 관리자만 가능합니다.",
        variant: "destructive",
      });
      return;
    }
    updateStatusMutation.mutate({ caseId, status });
  };

  // 진행상황 Dialog 열기 핸들러 (관리자만)
  const handleOpenProgressDialog = () => {
    if (!selectedCaseId) {
      toast({
        title: "케이스 선택 필요",
        description: "케이스를 먼저 선택해주세요.",
        variant: "destructive",
      });
      return;
    }
    if (user?.role !== "관리자") {
      toast({
        title: "권한 없음",
        description: "관리자만 진행상황을 입력할 수 있습니다.",
        variant: "destructive",
      });
      return;
    }
    setShowProgressDialog(true);
  };


  // 특이사항 확인 핸들러 (관리자만)
  const handleConfirmSpecialNotes = () => {
    if (!selectedCaseId) return;
    if (user?.role !== "관리자") {
      toast({
        title: "권한 없음",
        description: "관리자만 특이사항을 확인할 수 있습니다.",
        variant: "destructive",
      });
      return;
    }
    confirmSpecialNotesMutation.mutate(selectedCaseId);
  };

  // 특이사항 제출 핸들러
  const handleSpecialNotesSubmit = (values: z.infer<typeof specialNotesFormSchema>) => {
    if (!selectedCaseId) return;
    
    // 빈 문자열을 null로 변환
    const specialNotes = values.specialNotes.trim() === "" ? null : values.specialNotes.trim();
    
    updateSpecialNotesMutation.mutate({
      caseId: selectedCaseId,
      specialNotes,
    });
  };

  // 진행상황 제출 핸들러
  const handleProgressSubmit = (values: z.infer<typeof progressFormSchema>) => {
    if (!selectedCaseId) return;
    
    addProgressMutation.mutate({
      caseId: selectedCaseId,
      content: values.content.trim(),
    });
  };

  // Dialog 열릴 때 form reset
  useEffect(() => {
    if (showProgressDialog) {
      progressForm.reset({
        content: "",
      });
    }
  }, [showProgressDialog, progressForm]);

  // 협력사 진행상황 폼 초기화 (탭 전환 시 또는 케이스 변경 시)
  useEffect(() => {
    if (detailTab === "진행상황" && user?.role === "협력사" && selectedCase) {
      specialNotesForm.reset({
        specialNotes: selectedCase.specialNotes || "",
      });
    }
  }, [detailTab, selectedCase, user?.role, specialNotesForm]);

  // 당일차 계산 (접수일부터 오늘까지)
  const calculateDays = (createdAt: string | null) => {
    if (!createdAt) return 0;
    const created = new Date(createdAt);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - created.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // 날짜 포맷팅 (YYYY-MM-DD)
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  if (userLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">로딩 중...</div>
      </div>
    );
  }

  if (!user) {
    setLocation("/");
    return null;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(0deg, #E7EDFE, #E7EDFE)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background blur effects */}
      <div
        style={{
          position: "absolute",
          width: "1095px",
          height: "776.83px",
          left: "97.61px",
          bottom: "1169.19px",
          background: "rgba(254, 240, 230, 0.4)",
          filter: "blur(212px)",
          transform: "rotate(-35.25deg)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: "1334.83px",
          height: "1322.98px",
          right: "0",
          bottom: "0",
          background: "rgba(234, 230, 254, 0.5)",
          filter: "blur(212px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: "348px",
          height: "1322.98px",
          left: "0",
          bottom: "188.99px",
          background: "rgba(234, 230, 254, 0.5)",
          filter: "blur(212px)",
          pointerEvents: "none",
        }}
      />

      <GlobalHeader />

      {/* Main Content */}
      <div
        style={{
          maxWidth: "1595px",
          margin: "0 auto",
          padding: "32px 20px",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Page Title */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "24px",
          }}
        >
          <h1
            style={{
              fontFamily: "Pretendard",
              fontWeight: 600,
              fontSize: "28px",
              lineHeight: "128%",
              letterSpacing: "-0.02em",
              color: "#0C0C0C",
            }}
          >
            종합진행관리
          </h1>
          <div
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#008FED",
            }}
          />
        </div>

        {/* Search Section */}
        <div
          style={{
            background: "#FFFFFF",
            boxShadow: "0px 0px 20px #DBE9F5",
            borderRadius: "12px",
            padding: "24px",
            marginBottom: "16px",
          }}
        >
          {/* Header */}
          <h2
            style={{
              fontFamily: "Pretendard",
              fontWeight: 600,
              fontSize: "16px",
              lineHeight: "128%",
              letterSpacing: "-0.02em",
              color: "#0C0C0C",
              marginBottom: "20px",
            }}
          >
            검색
          </h2>

          {/* Tabs */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "16px",
              flexWrap: "wrap",
            }}
          >
            {tabs.map((tab) => (
              <button
                key={tab.name}
                onClick={() => setActiveTab(tab.name)}
                style={{
                  padding: "10px 20px",
                  background:
                    activeTab === tab.name
                      ? "#008FED"
                      : "rgba(12, 12, 12, 0.04)",
                  borderRadius: "6px",
                  border: "none",
                  fontFamily: "Pretendard",
                  fontWeight: activeTab === tab.name ? 600 : 500,
                  fontSize: "14px",
                  lineHeight: "128%",
                  letterSpacing: "-0.02em",
                  color:
                    activeTab === tab.name ? "#FFFFFF" : "rgba(12, 12, 12, 0.5)",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                data-testid={`tab-${tab.key}`}
              >
                {tab.name}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div style={{ position: "relative", flex: 1 }}>
              <Search
                className="absolute left-4 top-1/2 transform -translate-y-1/2"
                style={{ width: "20px", height: "20px", color: "rgba(12, 12, 12, 0.4)" }}
              />
              <input
                type="text"
                placeholder="보험사 사고번호, 접수번호, 보험계약자, 당사 담당자 등으로 검색해주세요."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                  }
                }}
                style={{
                  width: "100%",
                  height: "52px",
                  padding: "0 20px 0 52px",
                  background: "#FDFDFD",
                  border: "1px solid rgba(12, 12, 12, 0.1)",
                  borderRadius: "8px",
                  fontFamily: "Pretendard",
                  fontSize: "14px",
                  fontWeight: 400,
                  letterSpacing: "-0.02em",
                  color: "#0C0C0C",
                }}
                data-testid="input-search"
              />
            </div>
            <button
              onClick={() => {
                // 검색 기능은 실시간으로 이미 작동 중
              }}
              style={{
                width: "100px",
                height: "52px",
                background: "#008FED",
                borderRadius: "8px",
                border: "none",
                fontFamily: "Pretendard",
                fontSize: "16px",
                fontWeight: 600,
                letterSpacing: "-0.02em",
                color: "#FFFFFF",
                cursor: "pointer",
              }}
              data-testid="button-search"
            >
              검색
            </button>
          </div>
        </div>

        {/* Count */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px", padding: "0 4px", marginBottom: "16px" }}>
          <span
            style={{
              fontFamily: "Pretendard",
              fontWeight: 700,
              fontSize: "20px",
              lineHeight: "128%",
              letterSpacing: "-0.02em",
              color: "rgba(12, 12, 12, 0.7)",
            }}
          >
            전체건
          </span>
          <span
            style={{
              fontFamily: "Pretendard",
              fontWeight: 700,
              fontSize: "20px",
              lineHeight: "128%",
              letterSpacing: "-0.02em",
              color: "#008FED",
            }}
          >
            {totalCount}
          </span>
        </div>

        {/* Table */}
        <div
          style={{
            background: "#FFFFFF",
            boxShadow: "0px 0px 20px #DBE9F5",
            borderRadius: "12px",
            overflow: "hidden",
          }}
        >
          {/* Table Header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "110px 130px 110px 90px 100px 100px 100px 100px 80px 120px 120px 60px 100px 100px",
              padding: "14px 20px",
              background: "rgba(12, 12, 12, 0.04)",
              borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
              gap: "8px",
            }}
          >
            <div style={{ fontFamily: "Pretendard", fontWeight: 600, fontSize: "13px", color: "rgba(12, 12, 12, 0.6)" }}>
              사고번호
            </div>
            <div style={{ fontFamily: "Pretendard", fontWeight: 600, fontSize: "13px", color: "rgba(12, 12, 12, 0.6)" }}>
              접수번호
            </div>
            <div style={{ fontFamily: "Pretendard", fontWeight: 600, fontSize: "13px", color: "rgba(12, 12, 12, 0.6)" }}>
              보험사
            </div>
            <div style={{ fontFamily: "Pretendard", fontWeight: 600, fontSize: "13px", color: "rgba(12, 12, 12, 0.6)" }}>
              계약자
            </div>
            <div style={{ fontFamily: "Pretendard", fontWeight: 600, fontSize: "13px", color: "rgba(12, 12, 12, 0.6)" }}>
              당사 담당자
            </div>
            <div style={{ fontFamily: "Pretendard", fontWeight: 600, fontSize: "13px", color: "rgba(12, 12, 12, 0.6)" }}>
              협력사
            </div>
            <div style={{ fontFamily: "Pretendard", fontWeight: 600, fontSize: "13px", color: "rgba(12, 12, 12, 0.6)" }}>
              견적금액
            </div>
            <div style={{ fontFamily: "Pretendard", fontWeight: 600, fontSize: "13px", color: "rgba(12, 12, 12, 0.6)" }}>
              정산금액
            </div>
            <div style={{ fontFamily: "Pretendard", fontWeight: 600, fontSize: "13px", color: "rgba(12, 12, 12, 0.6)" }}>
              경과일수
            </div>
            <div style={{ fontFamily: "Pretendard", fontWeight: 600, fontSize: "13px", color: "rgba(12, 12, 12, 0.6)" }}>
              진행상태
            </div>
            <div style={{ fontFamily: "Pretendard", fontWeight: 600, fontSize: "13px", color: "rgba(12, 12, 12, 0.6)" }}>
              진행상황
            </div>
            <div style={{ fontFamily: "Pretendard", fontWeight: 600, fontSize: "13px", color: "rgba(12, 12, 12, 0.6)" }}>
              특이사항
            </div>
            <div style={{ fontFamily: "Pretendard", fontWeight: 600, fontSize: "13px", color: "rgba(12, 12, 12, 0.6)" }}>
              수정하기
            </div>
            <div style={{ fontFamily: "Pretendard", fontWeight: 600, fontSize: "13px", color: "rgba(12, 12, 12, 0.6)" }}>
              요청
            </div>
          </div>

          {/* Table Body */}
          {filteredData.length === 0 ? (
            <div
              style={{
                padding: "80px 20px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "24px",
              }}
            >
              <Cloud
                style={{
                  width: "80px",
                  height: "80px",
                  color: "#008FED",
                  opacity: 0.3,
                }}
              />
              <div
                style={{
                  fontFamily: "Pretendard",
                  fontWeight: 500,
                  fontSize: "18px",
                  color: "rgba(12, 12, 12, 0.6)",
                }}
              >
                검색 결과가 없습니다.
              </div>
              <div
                style={{
                  padding: "20px 24px",
                  background: "rgba(12, 12, 12, 0.02)",
                  borderRadius: "8px",
                  display: "flex",
                  gap: "8px",
                  alignItems: "flex-start",
                }}
              >
                <div
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    background: "rgba(12, 12, 12, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "Pretendard",
                    fontWeight: 600,
                    fontSize: "12px",
                    color: "rgba(12, 12, 12, 0.6)",
                    flexShrink: 0,
                  }}
                >
                  i
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: "Pretendard",
                      fontWeight: 600,
                      fontSize: "14px",
                      color: "rgba(12, 12, 12, 0.7)",
                      marginBottom: "8px",
                    }}
                  >
                    이렇게 검색해보세요
                  </div>
                  <ul
                    style={{
                      listStyle: "none",
                      padding: 0,
                      margin: 0,
                      fontFamily: "Pretendard",
                      fontWeight: 400,
                      fontSize: "13px",
                      color: "rgba(12, 12, 12, 0.6)",
                      lineHeight: "1.6",
                    }}
                  >
                    <li>• 검색어를 콤마(,)로 분리하면 다중검색이 가능합니다</li>
                    <li>• 보험사명, 사고번호, 접수번호, 계약자, 당사 담당자 등으로 검색해보세요.</li>
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            filteredData.map((caseItem, index) => {
              return (
                <div
                  key={caseItem.id}
                  onClick={() => setSelectedCaseId(caseItem.id)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "110px 130px 110px 90px 100px 100px 100px 100px 80px 120px 120px 60px 100px 100px",
                    padding: "14px 20px",
                    borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                    gap: "8px",
                    alignItems: "center",
                    cursor: "pointer",
                  }}
                  data-testid={`case-row-${caseItem.id}`}
                >
                  <div style={{ fontFamily: "Pretendard", fontSize: "13px", color: "rgba(12, 12, 12, 0.8)" }}>
                    {caseItem.insuranceAccidentNo || "-"}
                  </div>
                  <div style={{ fontFamily: "Pretendard", fontSize: "13px", color: "rgba(12, 12, 12, 0.8)" }}>
                    {caseItem.caseNumber || "-"}
                  </div>
                  <div style={{ fontFamily: "Pretendard", fontSize: "13px", color: "rgba(12, 12, 12, 0.8)" }}>
                    {caseItem.insuranceCompany || "-"}
                  </div>
                  <div style={{ fontFamily: "Pretendard", fontSize: "13px", color: "rgba(12, 12, 12, 0.8)" }}>
                    {caseItem.clientName || "-"}
                  </div>
                  <div style={{ fontFamily: "Pretendard", fontSize: "13px", color: "rgba(12, 12, 12, 0.8)" }}>
                    {caseItem.assignedPartnerManager || "-"}
                  </div>
                  <div style={{ fontFamily: "Pretendard", fontSize: "13px", color: "rgba(12, 12, 12, 0.8)" }}>
                    {caseItem.assignedPartner || "-"}
                  </div>
                  <div style={{ fontFamily: "Pretendard", fontSize: "13px", color: "rgba(12, 12, 12, 0.8)" }}>
                    -
                  </div>
                  <div style={{ fontFamily: "Pretendard", fontSize: "13px", color: "rgba(12, 12, 12, 0.8)" }}>
                    -
                  </div>
                  <div style={{ fontFamily: "Pretendard", fontSize: "13px", color: "rgba(12, 12, 12, 0.8)" }}>
                    {calculateDays(caseItem.createdAt)}
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    {user?.role === "관리자" ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild disabled={updateStatusMutation.isPending}>
                          <div
                            style={{
                              padding: "6px 12px",
                              background: "rgba(12, 12, 12, 0.05)",
                              borderRadius: "6px",
                              fontFamily: "Pretendard",
                              fontSize: "12px",
                              fontWeight: 600,
                              color: getStatusColor(caseItem.status),
                              textAlign: "center",
                              whiteSpace: "nowrap",
                              cursor: updateStatusMutation.isPending ? "not-allowed" : "pointer",
                              opacity: updateStatusMutation.isPending ? 0.6 : 1,
                            }}
                            data-testid={`button-status-${caseItem.id}`}
                          >
                            {caseItem.status || "접수중"}
                          </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="start"
                          style={{
                            width: "200px",
                            background: "rgba(200, 200, 200, 0.95)",
                            backdropFilter: "blur(10px)",
                            border: "none",
                            borderRadius: "8px",
                            padding: "8px",
                          }}
                        >
                          {CASE_STATUSES.map((status) => (
                            <DropdownMenuItem
                              key={status}
                              onClick={() => handleStatusChange(caseItem.id, status)}
                              style={{
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                padding: "10px 12px",
                                margin: "0",
                                cursor: "pointer",
                                fontFamily: "Pretendard",
                                fontSize: "14px",
                                fontWeight: 500,
                                color: getStatusColor(status),
                                background: "transparent",
                                borderRadius: "4px",
                              }}
                              data-testid={`button-status-option-${status}`}
                            >
                              {status}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <div
                        style={{
                          padding: "6px 12px",
                          background: "rgba(12, 12, 12, 0.05)",
                          borderRadius: "6px",
                          fontFamily: "Pretendard",
                          fontSize: "12px",
                          fontWeight: 600,
                          color: getStatusColor(caseItem.status),
                          textAlign: "center",
                          whiteSpace: "nowrap",
                        }}
                        data-testid={`text-status-${caseItem.id}`}
                      >
                        {caseItem.status || "접수중"}
                      </div>
                    )}
                  </div>
                  <div 
                    style={{ 
                      fontFamily: "Pretendard", 
                      fontSize: "13px", 
                      color: "rgba(12, 12, 12, 0.8)",
                      cursor: user?.role === "관리자" ? "pointer" : "default",
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (user?.role === "관리자") {
                        setSelectedCaseId(caseItem.id);
                        setShowProgressDialog(true);
                      }
                    }}
                    data-testid={`button-progress-${caseItem.id}`}
                  >
                    {caseItem.latestProgress?.content || "-"}
                  </div>
                  <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                    {caseItem.specialNotes && (
                      <div
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          background: caseItem.specialNotesConfirmedBy ? "#008FED" : "#ED1C00",
                        }}
                        data-testid={`special-notes-indicator-${caseItem.id}`}
                      />
                    )}
                  </div>
                  <div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCaseId(caseItem.id);
                      }}
                      style={{
                        padding: "6px 12px",
                        background: "#FFFFFF",
                        border: "1px solid rgba(12, 12, 12, 0.1)",
                        borderRadius: "6px",
                        fontFamily: "Pretendard",
                        fontSize: "12px",
                        fontWeight: 500,
                        color: "rgba(12, 12, 12, 0.7)",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                      data-testid={`button-edit-${caseItem.id}`}
                    >
                      수정하기
                    </button>
                  </div>
                  <div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // 요청 기능 구현 예정
                      }}
                      style={{
                        padding: "6px 12px",
                        background: "#008FED",
                        border: "none",
                        borderRadius: "6px",
                        fontFamily: "Pretendard",
                        fontSize: "12px",
                        fontWeight: 500,
                        color: "#FFFFFF",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                      data-testid={`button-request-${caseItem.id}`}
                    >
                      요청
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 상세보기 Sheet */}
      <Sheet open={selectedCaseId !== null} onOpenChange={(open) => !open && setSelectedCaseId(null)}>
        <SheetContent 
          side="right" 
          className="w-full sm:max-w-[600px] overflow-y-auto"
          style={{
            background: "rgba(253, 253, 253, 0.95)",
            backdropFilter: "blur(17px)",
            padding: "50px 20px 32px 20px",
          }}
          data-testid="sheet-case-detail"
        >
          <SheetHeader style={{ padding: "24px 20px", borderBottom: "1px solid rgba(12, 12, 12, 0.08)", marginBottom: "0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <SheetTitle 
                style={{
                  fontFamily: "Pretendard",
                  fontWeight: 600,
                  fontSize: "22px",
                  letterSpacing: "-0.02em",
                  color: "#0C0C0C",
                }}
              >
                진행건 상세보기
              </SheetTitle>
            </div>
          </SheetHeader>

          {selectedCaseId && (() => {
            const selectedCase = cases?.find(c => c.id === selectedCaseId);
            if (!selectedCase) return null;

            return (
              <>
                {/* 탭 메뉴 */}
                <div style={{ 
                  display: "flex", 
                  gap: "0px",
                  borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                  padding: "0 20px",
                }}>
                  {["기본정보", "일자", "진행상황", "특이사항"].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setDetailTab(tab)}
                      style={{
                        padding: "16px 24px",
                        background: "transparent",
                        border: "none",
                        borderBottom: detailTab === tab ? "2px solid #008FED" : "2px solid transparent",
                        fontFamily: "Pretendard",
                        fontSize: "16px",
                        fontWeight: detailTab === tab ? 600 : 400,
                        color: detailTab === tab ? "#008FED" : "rgba(12, 12, 12, 0.6)",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                      data-testid={`tab-${tab}`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <ScrollArea className="h-[calc(100vh-220px)]">
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "16px 20px 20px 20px" }}>
                    
                    {/* 기본정보 탭 */}
                    {detailTab === "기본정보" && (
                      <>
                        {/* 기본 정보 섹션 */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                          {/* 섹션 제목 */}
                          <div style={{
                            padding: "9px 0px",
                            fontFamily: "Pretendard",
                            fontWeight: 700,
                            fontSize: "18px",
                            lineHeight: "128%",
                            letterSpacing: "-0.02em",
                            color: "#292929",
                          }}>
                            기본 정보
                          </div>

                          {/* 정보 리스트 */}
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            {/* 진행상태 */}
                            <div style={{
                              display: "flex",
                              flexDirection: "row",
                              alignItems: "center",
                              padding: "10px 0px",
                              gap: "16px",
                              minHeight: "60px",
                              background: "#FFFFFF",
                              borderBottom: "1px solid rgba(12, 12, 12, 0.1)",
                            }}>
                              <div style={{
                                width: "120px",
                                fontFamily: "Pretendard",
                                fontWeight: 600,
                                fontSize: "15px",
                                lineHeight: "128%",
                                letterSpacing: "-0.02em",
                                color: "rgba(12, 12, 12, 0.9)",
                              }}>
                                진행상태
                              </div>
                              <div style={{
                                padding: "8px 12px",
                                background: "rgba(12, 149, 246, 0.2)",
                                backdropFilter: "blur(7px)",
                                borderRadius: "20px",
                                fontFamily: "Pretendard",
                                fontWeight: 500,
                                fontSize: "16px",
                                lineHeight: "128%",
                                letterSpacing: "-0.02em",
                                color: "#0077D8",
                              }}>
                                {selectedCase.status || "접수중"}
                              </div>
                            </div>

                            {/* 당사 담당자 */}
                            <div style={{
                              display: "flex",
                              flexDirection: "row",
                              alignItems: "center",
                              padding: "10px 0px",
                              gap: "16px",
                              minHeight: "60px",
                              background: "#FFFFFF",
                              borderBottom: "1px solid rgba(12, 12, 12, 0.1)",
                            }}>
                              <div style={{
                                width: "120px",
                                fontFamily: "Pretendard",
                                fontWeight: 600,
                                fontSize: "15px",
                                lineHeight: "128%",
                                letterSpacing: "-0.02em",
                                color: "rgba(12, 12, 12, 0.9)",
                              }}>
                                당사 담당자
                              </div>
                              <div style={{
                                flex: 1,
                                fontFamily: "Pretendard",
                                fontWeight: 500,
                                fontSize: "15px",
                                lineHeight: "128%",
                                letterSpacing: "-0.01em",
                                color: "rgba(12, 12, 12, 0.7)",
                              }}>
                                {selectedCase.assignedPartnerManager || "-"}
                              </div>
                            </div>

                            {/* 협력사 */}
                            <div style={{
                              display: "flex",
                              flexDirection: "row",
                              alignItems: "center",
                              padding: "10px 0px",
                              gap: "16px",
                              minHeight: "60px",
                              background: "#FFFFFF",
                              borderBottom: "1px solid rgba(12, 12, 12, 0.1)",
                            }}>
                              <div style={{
                                width: "120px",
                                fontFamily: "Pretendard",
                                fontWeight: 600,
                                fontSize: "15px",
                                lineHeight: "128%",
                                letterSpacing: "-0.02em",
                                color: "rgba(12, 12, 12, 0.9)",
                              }}>
                                협력사
                              </div>
                              <div style={{
                                flex: 1,
                                fontFamily: "Pretendard",
                                fontWeight: 500,
                                fontSize: "15px",
                                lineHeight: "128%",
                                letterSpacing: "-0.01em",
                                color: "rgba(12, 12, 12, 0.7)",
                              }}>
                                {selectedCase.assignedPartner || "-"}
                              </div>
                            </div>

                            {/* 경과일수 */}
                            <div style={{
                              display: "flex",
                              flexDirection: "row",
                              alignItems: "center",
                              padding: "10px 0px",
                              gap: "16px",
                              minHeight: "60px",
                              background: "#FFFFFF",
                              borderBottom: "1px solid rgba(12, 12, 12, 0.1)",
                            }}>
                              <div style={{
                                width: "120px",
                                fontFamily: "Pretendard",
                                fontWeight: 600,
                                fontSize: "15px",
                                lineHeight: "128%",
                                letterSpacing: "-0.02em",
                                color: "rgba(12, 12, 12, 0.9)",
                              }}>
                                경과일수
                              </div>
                              <div style={{
                                flex: 1,
                                fontFamily: "Pretendard",
                                fontWeight: 500,
                                fontSize: "15px",
                                lineHeight: "128%",
                                letterSpacing: "-0.01em",
                                color: "rgba(12, 12, 12, 0.7)",
                              }}>
                                {calculateDays(selectedCase.createdAt)}
                              </div>
                            </div>

                            {/* 견적금액 */}
                            <div style={{
                              display: "flex",
                              flexDirection: "row",
                              alignItems: "center",
                              padding: "10px 0px",
                              gap: "16px",
                              minHeight: "60px",
                              background: "#FFFFFF",
                              borderBottom: "1px solid rgba(12, 12, 12, 0.1)",
                            }}>
                              <div style={{
                                width: "120px",
                                fontFamily: "Pretendard",
                                fontWeight: 600,
                                fontSize: "15px",
                                lineHeight: "128%",
                                letterSpacing: "-0.02em",
                                color: "rgba(12, 12, 12, 0.9)",
                              }}>
                                견적금액
                              </div>
                              <div style={{
                                flex: 1,
                                fontFamily: "Pretendard",
                                fontWeight: 500,
                                fontSize: "15px",
                                lineHeight: "128%",
                                letterSpacing: "-0.01em",
                                color: "rgba(12, 12, 12, 0.7)",
                              }}>
                                -
                              </div>
                            </div>

                            {/* 승인금액 */}
                            <div style={{
                              display: "flex",
                              flexDirection: "row",
                              alignItems: "center",
                              padding: "10px 0px",
                              gap: "16px",
                              minHeight: "60px",
                              background: "#FFFFFF",
                            }}>
                              <div style={{
                                width: "120px",
                                fontFamily: "Pretendard",
                                fontWeight: 600,
                                fontSize: "15px",
                                lineHeight: "128%",
                                letterSpacing: "-0.02em",
                                color: "rgba(12, 12, 12, 0.9)",
                              }}>
                                승인금액
                              </div>
                              <div style={{
                                flex: 1,
                                fontFamily: "Pretendard",
                                fontWeight: 500,
                                fontSize: "15px",
                                lineHeight: "128%",
                                letterSpacing: "-0.01em",
                                color: "rgba(12, 12, 12, 0.7)",
                              }}>
                                -
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 구분선 */}
                        <div style={{
                          width: "100%",
                          height: "12px",
                          background: "rgba(12, 12, 12, 0.06)",
                        }}></div>

                        {/* 증권/보장 섹션 */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                          {/* 섹션 제목 */}
                          <div style={{
                            padding: "9px 0px",
                            fontFamily: "Pretendard",
                            fontWeight: 700,
                            fontSize: "18px",
                            lineHeight: "128%",
                            letterSpacing: "-0.02em",
                            color: "#292929",
                          }}>
                            증권/보장
                          </div>

                          {/* 정보 리스트 */}
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            {/* 증권번호 */}
                            <div style={{
                              display: "flex",
                              flexDirection: "row",
                              alignItems: "center",
                              padding: "10px 0px",
                              gap: "16px",
                              minHeight: "60px",
                              background: "#FFFFFF",
                              borderBottom: "1px solid rgba(12, 12, 12, 0.1)",
                            }}>
                              <div style={{
                                width: "120px",
                                fontFamily: "Pretendard",
                                fontWeight: 600,
                                fontSize: "15px",
                                lineHeight: "128%",
                                letterSpacing: "-0.02em",
                                color: "rgba(12, 12, 12, 0.9)",
                              }}>
                                증권번호
                              </div>
                              <div style={{
                                flex: 1,
                                fontFamily: "Pretendard",
                                fontWeight: 500,
                                fontSize: "15px",
                                lineHeight: "128%",
                                letterSpacing: "-0.01em",
                                color: "rgba(12, 12, 12, 0.7)",
                              }}>
                                {selectedCase.insurancePolicyNo || "-"}
                              </div>
                            </div>

                            {/* 보장종류 */}
                            <div style={{
                              display: "flex",
                              flexDirection: "row",
                              alignItems: "center",
                              padding: "10px 0px",
                              gap: "16px",
                              minHeight: "60px",
                              background: "#FFFFFF",
                              borderBottom: "1px solid rgba(12, 12, 12, 0.1)",
                            }}>
                              <div style={{
                                width: "120px",
                                fontFamily: "Pretendard",
                                fontWeight: 600,
                                fontSize: "15px",
                                lineHeight: "128%",
                                letterSpacing: "-0.02em",
                                color: "rgba(12, 12, 12, 0.9)",
                              }}>
                                보장종류
                              </div>
                              <div style={{
                                flex: 1,
                                fontFamily: "Pretendard",
                                fontWeight: 500,
                                fontSize: "15px",
                                lineHeight: "128%",
                                letterSpacing: "-0.01em",
                                color: "rgba(12, 12, 12, 0.7)",
                              }}>
                                -
                              </div>
                            </div>

                            {/* 보장명 */}
                            <div style={{
                              display: "flex",
                              flexDirection: "row",
                              alignItems: "center",
                              padding: "10px 0px",
                              gap: "16px",
                              minHeight: "60px",
                              background: "#FFFFFF",
                            }}>
                              <div style={{
                                width: "120px",
                                fontFamily: "Pretendard",
                                fontWeight: 600,
                                fontSize: "15px",
                                lineHeight: "128%",
                                letterSpacing: "-0.02em",
                                color: "rgba(12, 12, 12, 0.9)",
                              }}>
                                보장명
                              </div>
                              <div style={{
                                flex: 1,
                                fontFamily: "Pretendard",
                                fontWeight: 500,
                                fontSize: "15px",
                                lineHeight: "128%",
                                letterSpacing: "-0.01em",
                                color: "rgba(12, 12, 12, 0.7)",
                              }}>
                                -
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    )}

              {/* 일자 탭 */}
              {detailTab === "일자" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {[
                    { label: "접수", value: selectedCase?.receptionDate },
                    { label: "검수일", value: selectedCase?.inspectionDate },
                    { label: "배당일", value: selectedCase?.assignmentDate },
                    { label: "현장방문일", value: selectedCase?.siteVisitDate },
                    { label: "현장조사 제출일", value: selectedCase?.siteInvestigationSubmitDate },
                    { label: "1차 송장일 (내부)", value: selectedCase?.firstInvoiceDate },
                    { label: "승인요청일", value: selectedCase?.approvalRequestDate },
                    { label: "승인일(공사 시작일)", value: selectedCase?.approvalDate },
                    { label: "공사시작일", value: selectedCase?.constructionStartDate },
                    { label: "공사완료일", value: selectedCase?.constructionCompletionDate },
                    { label: "공사완료보고 제출일", value: selectedCase?.constructionReportSubmitDate },
                    { label: "청구일", value: selectedCase?.claimDate },
                  ].map((item) => (
                    <div key={item.label} style={{
                      display: "flex",
                      alignItems: "center",
                      paddingBottom: "12px",
                      borderBottom: "1px solid rgba(12, 12, 12, 0.05)",
                    }}>
                      <span style={{
                        width: "180px",
                        fontFamily: "Pretendard",
                        fontSize: "16px",
                        fontWeight: 400,
                        letterSpacing: "-0.02em",
                        color: "rgba(12, 12, 12, 0.5)",
                      }}>
                        {item.label}
                      </span>
                      <span style={{
                        fontFamily: "Pretendard",
                        fontSize: "16px",
                        fontWeight: 400,
                        letterSpacing: "-0.02em",
                        color: "rgba(12, 12, 12, 0.7)",
                      }}>
                        {item.value || "-"}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* 진행상황 탭 */}
              {detailTab === "진행상황" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}>
                    <div style={{
                      fontFamily: "Pretendard",
                      fontWeight: 600,
                      fontSize: "16px",
                      letterSpacing: "-0.02em",
                      color: "rgba(12, 12, 12, 0.9)",
                    }}>
                      진행상황
                    </div>
                    {user?.role === "관리자" && (
                      <button
                        onClick={() => setShowProgressDialog(true)}
                        style={{
                          padding: "8px 16px",
                          background: "#008FED",
                          border: "none",
                          borderRadius: "8px",
                          fontFamily: "Pretendard",
                          fontWeight: 500,
                          fontSize: "14px",
                          color: "#FFFFFF",
                          cursor: "pointer",
                        }}
                        data-testid="button-add-progress"
                      >
                        + 진행상황 추가
                      </button>
                    )}
                  </div>

                  <div 
                    style={{
                      width: "100%",
                      minHeight: "200px",
                      padding: "16px",
                      background: "rgba(12, 12, 12, 0.04)",
                      border: "1px solid rgba(12, 12, 12, 0.1)",
                      borderRadius: "8px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      lineHeight: "1.6",
                      color: selectedCase.latestProgress?.content ? "rgba(12, 12, 12, 0.9)" : "rgba(12, 12, 12, 0.5)",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                    data-testid="text-progress-display"
                  >
                    {selectedCase.latestProgress?.content || "관리자가 입력한 진행상황이 없습니다."}
                  </div>
                </div>
              )}

              {/* 특이사항 탭 */}
              {detailTab === "특이사항" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {/* 협력사 화면 - 특이사항 입력 */}
                  {user?.role === "협력사" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      <div style={{
                        fontFamily: "Pretendard",
                        fontWeight: 600,
                        fontSize: "16px",
                        letterSpacing: "-0.02em",
                        color: "rgba(12, 12, 12, 0.9)",
                      }}>
                        특이사항
                      </div>

                      <div style={{
                        fontFamily: "Pretendard",
                        fontSize: "14px",
                        color: "rgba(12, 12, 12, 0.6)",
                        marginTop: "-8px",
                      }}>
                        관리자가 알아야 할 특이사항을 입력해주세요.
                      </div>

                      <div style={{ position: "relative" }}>
                        <textarea
                          value={specialNotesForm.watch("specialNotes")}
                          onChange={(e) => specialNotesForm.setValue("specialNotes", e.target.value)}
                          placeholder="사전 허가로 사전 작업 모습시행을 정상처리 주세요"
                          maxLength={1000}
                          style={{
                            width: "100%",
                            minHeight: "200px",
                            padding: "16px",
                            background: "rgba(12, 12, 12, 0.04)",
                            border: "1px solid rgba(12, 12, 12, 0.1)",
                            borderRadius: "8px",
                            fontFamily: "Pretendard",
                            fontSize: "14px",
                            lineHeight: "1.6",
                            color: "rgba(12, 12, 12, 0.9)",
                            resize: "vertical",
                          }}
                          data-testid="textarea-special-notes"
                        />
                        <div style={{
                          position: "absolute",
                          bottom: "16px",
                          right: "16px",
                          fontFamily: "Pretendard",
                          fontSize: "12px",
                          color: "rgba(12, 12, 12, 0.5)",
                        }}>
                          {specialNotesForm.watch("specialNotes").length} / 1000
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                        <button
                          onClick={() => {
                            specialNotesForm.reset({ specialNotes: "" });
                          }}
                          style={{
                            padding: "10px 24px",
                            background: "transparent",
                            border: "1px solid rgba(12, 12, 12, 0.2)",
                            borderRadius: "8px",
                            fontFamily: "Pretendard",
                            fontWeight: 500,
                            fontSize: "14px",
                            color: "rgba(12, 12, 12, 0.7)",
                            cursor: "pointer",
                          }}
                          data-testid="button-reset-special-notes"
                        >
                          초기화
                        </button>
                        <button
                          onClick={() => {
                            if (selectedCase.id) {
                              updateSpecialNotesMutation.mutate({
                                caseId: selectedCase.id,
                                specialNotes: specialNotesForm.watch("specialNotes"),
                              });
                            }
                          }}
                          disabled={updateSpecialNotesMutation.isPending || !specialNotesForm.watch("specialNotes").trim()}
                          style={{
                            padding: "10px 24px",
                            background: "#008FED",
                            border: "none",
                            borderRadius: "8px",
                            fontFamily: "Pretendard",
                            fontWeight: 600,
                            fontSize: "14px",
                            color: "#FFFFFF",
                            cursor: updateSpecialNotesMutation.isPending || !specialNotesForm.watch("specialNotes").trim() ? "not-allowed" : "pointer",
                            opacity: updateSpecialNotesMutation.isPending || !specialNotesForm.watch("specialNotes").trim() ? 0.6 : 1,
                          }}
                          data-testid="button-save-special-notes"
                        >
                          {updateSpecialNotesMutation.isPending ? "저장 중..." : "저장"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 관리자 화면 - 특이사항 확인 */}
                  {user?.role === "관리자" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      <div style={{
                        fontFamily: "Pretendard",
                        fontWeight: 600,
                        fontSize: "16px",
                        letterSpacing: "-0.02em",
                        color: "rgba(12, 12, 12, 0.9)",
                      }}>
                        특이사항
                      </div>

                      <div 
                        style={{
                          width: "100%",
                          minHeight: "200px",
                          padding: "16px",
                          background: "rgba(12, 12, 12, 0.04)",
                          border: "1px solid rgba(12, 12, 12, 0.1)",
                          borderRadius: "8px",
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          lineHeight: "1.6",
                          color: selectedCase.specialNotes ? "rgba(12, 12, 12, 0.9)" : "rgba(12, 12, 12, 0.5)",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                        }}
                        data-testid="text-special-notes-readonly"
                      >
                        {selectedCase.specialNotes || "협력사가 입력한 특이사항이 없습니다."}
                      </div>

                      {/* 특이사항 확인 체크박스 */}
                      {selectedCase.specialNotes && (
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "12px 16px",
                          background: "rgba(12, 12, 12, 0.02)",
                          borderRadius: "8px",
                          border: "1px solid rgba(12, 12, 12, 0.1)",
                        }}>
                          <input
                            type="checkbox"
                            checked={!!selectedCase.specialNotesConfirmedBy}
                            onChange={(e) => {
                              if (selectedCaseId) {
                                confirmSpecialNotesMutation.mutate(selectedCaseId);
                              }
                            }}
                            disabled={confirmSpecialNotesMutation.isPending}
                            style={{
                              width: "18px",
                              height: "18px",
                              cursor: confirmSpecialNotesMutation.isPending ? "not-allowed" : "pointer",
                            }}
                            data-testid="checkbox-confirm-special-notes"
                          />
                          <label style={{
                            fontFamily: "Pretendard",
                            fontSize: "14px",
                            fontWeight: 500,
                            color: "rgba(12, 12, 12, 0.8)",
                            cursor: confirmSpecialNotesMutation.isPending ? "not-allowed" : "pointer",
                          }}>
                            이 특이사항을 확인했습니다
                          </label>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

                  </div>
                </ScrollArea>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>

      {/* 진행상황 추가 Dialog (관리자 전용) */}
      <Dialog open={showProgressDialog} onOpenChange={setShowProgressDialog}>
        <DialogContent style={{
          maxWidth: "600px",
          background: "rgba(253, 253, 253, 0.9)",
          backdropFilter: "blur(17px)",
          border: "none",
          boxShadow: "0px 0px 60px rgba(170, 177, 194, 0.3), 6px 0px 40px rgba(219, 233, 245, 0.3)",
          borderRadius: "24px",
        }}>
          <DialogHeader>
            <DialogTitle style={{
              fontFamily: "Pretendard",
              fontWeight: 600,
              fontSize: "20px",
              color: "#0C0C0C",
            }}>
              진행상황 추가
            </DialogTitle>
          </DialogHeader>

          <div style={{ display: "flex", flexDirection: "column", gap: "24px", marginTop: "20px" }}>
            {/* 케이스 정보 */}
            <div style={{
              padding: "16px",
              background: "rgba(12, 12, 12, 0.03)",
              borderRadius: "12px",
            }}>
              <div style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr",
                gap: "8px 16px",
              }}>
                <span style={{
                  fontFamily: "Pretendard",
                  fontWeight: 500,
                  color: "rgba(12, 12, 12, 0.6)",
                }}>
                  접수번호
                </span>
                <span style={{
                  fontFamily: "Pretendard",
                  fontWeight: 400,
                  color: "rgba(12, 12, 12, 0.8)",
                }}>
                  {selectedCase?.caseNumber || "-"}
                </span>

                <span style={{
                  fontFamily: "Pretendard",
                  fontWeight: 500,
                  color: "rgba(12, 12, 12, 0.6)",
                }}>
                  보험사
                </span>
                <span style={{
                  fontFamily: "Pretendard",
                  fontWeight: 400,
                  color: "rgba(12, 12, 12, 0.8)",
                }}>
                  {selectedCase?.insuranceCompany || "-"}
                </span>
              </div>
            </div>

            {/* 진행상황 Form */}
            <Form {...progressForm}>
              <form onSubmit={progressForm.handleSubmit(handleProgressSubmit)} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                <FormField
                  control={progressForm.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <div style={{
                        fontFamily: "Pretendard",
                        fontWeight: 500,
                        fontSize: "14px",
                        letterSpacing: "-0.01em",
                        color: "#686A6E",
                        marginBottom: "8px",
                      }}>
                        진행상황 내용
                      </div>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="진행상황을 입력하세요"
                          style={{
                            minHeight: "155px",
                            borderRadius: "12px",
                            fontFamily: "Pretendard",
                            fontSize: "14px",
                          }}
                          data-testid="input-progress-content"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* 버튼 */}
                <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowProgressDialog(false)}
                    data-testid="button-cancel-progress"
                  >
                    취소
                  </Button>
                  <Button
                    type="submit"
                    disabled={addProgressMutation.isPending}
                    data-testid="button-save-progress"
                  >
                    {addProgressMutation.isPending ? "추가 중..." : "추가"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>


    </div>
  );
}
