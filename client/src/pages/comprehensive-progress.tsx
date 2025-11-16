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

const specialNotesFormSchema = z.object({
  specialNotes: z.string(),
});

const progressFormSchema = z.object({
  content: z.string().min(1, "진행상황 내용을 입력해주세요"),
});

export default function ComprehensiveProgress() {
  const [activeMenu, setActiveMenu] = useState("종합진행관리");
  const [activeTab, setActiveTab] = useState("전체");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [showSpecialNotesDialog, setShowSpecialNotesDialog] = useState(false);
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [showDetailSheet, setShowDetailSheet] = useState(false);
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
      return await apiRequest("PATCH", `/api/cases/${caseId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      toast({
        title: "상태 변경 완료",
        description: "진행상태가 성공적으로 변경되었습니다.",
      });
    },
    onError: () => {
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
      setShowSpecialNotesDialog(false);
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
      setShowSpecialNotesDialog(false);
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

  // 상태 옵션 정의 (모달에서 사용)
  const statusOptions = [
    { value: "심사대기", label: "심사대기", bg: "rgba(12, 149, 246, 0.2)", color: "#0077D8" },
    { value: "협력사 미배정", label: "협력사 미배정", bg: "rgba(255, 226, 85, 0.2)", color: "#A16000" },
    { value: "2차 심사대기", label: "2차 심사대기", bg: "rgba(164, 68, 248, 0.2)", color: "#8626DA" },
    { value: "승인", label: "승인", bg: "rgba(76, 203, 160, 0.2)", color: "#2EAD82" },
    { value: "반려", label: "반려", bg: "rgba(208, 43, 32, 0.2)", color: "#B20D02" },
  ];

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

  // 특이사항 Dialog 열기 핸들러 (협력사만)
  const handleOpenSpecialNotesDialog = () => {
    if (!selectedCaseId) {
      toast({
        title: "케이스 선택 필요",
        description: "케이스를 먼저 선택해주세요.",
        variant: "destructive",
      });
      return;
    }
    if (user?.role !== "협력사") {
      toast({
        title: "권한 없음",
        description: "협력사만 특이사항을 입력할 수 있습니다.",
        variant: "destructive",
      });
      return;
    }
    setShowSpecialNotesDialog(true);
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
    if (showSpecialNotesDialog && selectedCase) {
      specialNotesForm.reset({
        specialNotes: selectedCase.specialNotes ?? "",
      });
    }
  }, [showSpecialNotesDialog, selectedCase, specialNotesForm]);

  useEffect(() => {
    if (showProgressDialog) {
      progressForm.reset({
        content: "",
      });
    }
  }, [showProgressDialog, progressForm]);

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
              overflowX: "auto",
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
              const getStatusColor = (status: string | null) => {
                switch (status) {
                  case "심사대기":
                    return { bg: "rgba(0, 143, 237, 0.15)", text: "#008FED" };
                  case "협력사 미배정":
                    return { bg: "rgba(255, 152, 0, 0.15)", text: "#FF9800" };
                  case "2차 심사대기":
                    return { bg: "rgba(233, 30, 99, 0.15)", text: "#E91E63" };
                  case "승인":
                    return { bg: "rgba(0, 200, 83, 0.15)", text: "#00C853" };
                  case "반려":
                    return { bg: "rgba(244, 67, 54, 0.15)", text: "#F44336" };
                  default:
                    return { bg: "rgba(12, 12, 12, 0.05)", text: "rgba(12, 12, 12, 0.6)" };
                }
              };

              const statusColors = getStatusColor(caseItem.status);
              
              return (
                <div
                  key={caseItem.id}
                  onClick={() => {
                    setSelectedCaseId(caseItem.id);
                    setShowDetailSheet(true);
                  }}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "110px 130px 110px 90px 100px 100px 100px 100px 80px 120px 120px 60px 100px 100px",
                    padding: "14px 20px",
                    borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                    overflowX: "auto",
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
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <div
                          style={{
                            padding: "6px 12px",
                            background: statusColors.bg,
                            borderRadius: "6px",
                            fontFamily: "Pretendard",
                            fontSize: "12px",
                            fontWeight: 600,
                            color: statusColors.text,
                            textAlign: "center",
                            whiteSpace: "nowrap",
                            cursor: "pointer",
                          }}
                          data-testid={`button-status-${caseItem.id}`}
                        >
                          {caseItem.status || "대기중"}
                        </div>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="start"
                        style={{
                          width: "212px",
                          background: "rgba(253, 253, 253, 0.9)",
                          backdropFilter: "blur(17px)",
                          border: "none",
                          boxShadow: "0px 0px 60px rgba(170, 177, 194, 0.3), 6px 0px 40px rgba(219, 233, 245, 0.3)",
                          borderRadius: "12px",
                          padding: "0",
                        }}
                      >
                        {statusOptions.map((option) => (
                          <DropdownMenuItem
                            key={option.value}
                            onClick={() => handleStatusChange(caseItem.id, option.value)}
                            style={{
                              display: "flex",
                              justifyContent: "center",
                              alignItems: "center",
                              padding: "12px",
                              margin: "0",
                              cursor: user?.role === "관리자" ? "pointer" : "not-allowed",
                            }}
                            data-testid={`button-status-option-${option.value}`}
                          >
                            <div
                              style={{
                                padding: "8px 12px",
                                background: option.bg,
                                backdropFilter: "blur(7px)",
                                borderRadius: "20px",
                                fontFamily: "Pretendard",
                                fontWeight: 500,
                                fontSize: "16px",
                                color: option.color,
                                opacity: user?.role === "관리자" ? 1 : 0.6,
                                minWidth: "120px",
                                textAlign: "center",
                              }}
                            >
                              {option.label}
                            </div>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
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
          <SheetHeader className="mb-6">
            <SheetTitle 
              style={{
                fontFamily: "Pretendard",
                fontWeight: 600,
                fontSize: "20px",
                color: "#0C0C0C",
              }}
            >
              진행건 상세보기
            </SheetTitle>
          </SheetHeader>

          {selectedCaseId && (() => {
            const selectedCase = cases?.find(c => c.id === selectedCaseId);
            if (!selectedCase) return null;

            return (
              <ScrollArea className="h-[calc(100vh-120px)]">
                <div style={{ display: "flex", flexDirection: "column", gap: "16px", paddingBottom: "20px" }}>
                  {/* 상단 카드 */}
                  <div 
                    style={{
                      background: "rgba(12, 12, 12, 0.04)",
                      backdropFilter: "blur(7px)",
                      borderRadius: "12px",
                      padding: "16px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "16px",
                    }}
                  >
                    {/* 첫 번째 줄: 보험사+사고번호, 상태 태그 */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
                        <span style={{
                          fontFamily: "Pretendard",
                          fontWeight: 600,
                          fontSize: "18px",
                          letterSpacing: "-0.02em",
                          color: "rgba(12, 12, 12, 0.9)",
                        }}>
                          {selectedCase.insuranceCompany || "-"}
                        </span>
                        <span style={{
                          fontFamily: "Pretendard",
                          fontWeight: 600,
                          fontSize: "18px",
                          letterSpacing: "-0.02em",
                          color: "rgba(12, 12, 12, 0.9)",
                        }}>
                          {selectedCase.insuranceAccidentNo || "-"}
                        </span>
                      </div>
                      <div style={{
                        padding: "8px 12px",
                        background: "rgba(12, 149, 246, 0.2)",
                        backdropFilter: "blur(7px)",
                        borderRadius: "20px",
                        fontFamily: "Pretendard",
                        fontWeight: 500,
                        fontSize: "16px",
                        letterSpacing: "-0.02em",
                        color: "#0077D8",
                      }}>
                        {selectedCase.status || "대기중"}
                      </div>
                    </div>
                    
                    {/* 두 번째 줄: 사고번호, 보험사, 계약자 */}
                    <div style={{ display: "flex", gap: "24px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{
                          fontFamily: "Pretendard",
                          fontSize: "16px",
                          letterSpacing: "-0.02em",
                          color: "rgba(12, 12, 12, 0.5)",
                        }}>
                          사고번호
                        </span>
                        <span style={{
                          fontFamily: "Pretendard",
                          fontSize: "16px",
                          letterSpacing: "-0.02em",
                          color: "rgba(12, 12, 12, 0.7)",
                        }}>
                          {selectedCase.insuranceAccidentNo || "-"}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{
                          fontFamily: "Pretendard",
                          fontSize: "16px",
                          letterSpacing: "-0.02em",
                          color: "rgba(12, 12, 12, 0.5)",
                        }}>
                          보험사
                        </span>
                        <span style={{
                          fontFamily: "Pretendard",
                          fontSize: "16px",
                          letterSpacing: "-0.02em",
                          color: "rgba(12, 12, 12, 0.7)",
                        }}>
                          {selectedCase.insuranceCompany || "-"}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{
                          fontFamily: "Pretendard",
                          fontSize: "16px",
                          letterSpacing: "-0.02em",
                          color: "rgba(12, 12, 12, 0.5)",
                        }}>
                          계약자
                        </span>
                        <span style={{
                          fontFamily: "Pretendard",
                          fontSize: "16px",
                          letterSpacing: "-0.02em",
                          color: "rgba(12, 12, 12, 0.7)",
                        }}>
                          {selectedCase.clientName || "-"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 핵심 정보 */}
                  <div style={{
                    borderBottom: "1px solid rgba(12, 12, 12, 0.1)",
                    paddingBottom: "24px",
                  }}>
                    <div style={{
                      padding: "10px 16px",
                      fontFamily: "Pretendard",
                      fontWeight: 600,
                      fontSize: "15px",
                      letterSpacing: "-0.02em",
                      color: "rgba(12, 12, 12, 0.9)",
                    }}>
                      핵심 정보
                    </div>
                    <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: "0" }}>
                      {/* Row 1 */}
                      <div style={{ display: "flex", gap: "20px", minHeight: "44px", alignItems: "center" }}>
                        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{
                            width: "80px",
                            fontFamily: "Pretendard",
                            fontSize: "16px",
                            letterSpacing: "-0.02em",
                            color: "rgba(12, 12, 12, 0.5)",
                          }}>진행상태</span>
                          <span style={{
                            fontFamily: "Pretendard",
                            fontSize: "16px",
                            letterSpacing: "-0.02em",
                            color: "rgba(12, 12, 12, 0.9)",
                          }}>{selectedCase.status || "대기중"}</span>
                        </div>
                        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{
                            width: "80px",
                            fontFamily: "Pretendard",
                            fontSize: "16px",
                            letterSpacing: "-0.02em",
                            color: "rgba(12, 12, 12, 0.5)",
                          }}>당사 담당자</span>
                          <span style={{
                            fontFamily: "Pretendard",
                            fontSize: "16px",
                            letterSpacing: "-0.02em",
                            color: "rgba(12, 12, 12, 0.9)",
                          }}>{selectedCase.assignedPartnerManager || "-"}</span>
                        </div>
                      </div>
                      {/* Row 2 */}
                      <div style={{ display: "flex", gap: "20px", minHeight: "44px", alignItems: "center" }}>
                        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{
                            width: "80px",
                            fontFamily: "Pretendard",
                            fontSize: "16px",
                            letterSpacing: "-0.02em",
                            color: "rgba(12, 12, 12, 0.5)",
                          }}>협력사</span>
                          <span style={{
                            fontFamily: "Pretendard",
                            fontSize: "16px",
                            letterSpacing: "-0.02em",
                            color: "rgba(12, 12, 12, 0.9)",
                          }}>{selectedCase.assignedPartner || "-"}</span>
                        </div>
                        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{
                            width: "80px",
                            fontFamily: "Pretendard",
                            fontSize: "16px",
                            letterSpacing: "-0.02em",
                            color: "rgba(12, 12, 12, 0.5)",
                          }}>경과일수</span>
                          <span style={{
                            fontFamily: "Pretendard",
                            fontSize: "16px",
                            letterSpacing: "-0.02em",
                            color: "rgba(12, 12, 12, 0.9)",
                          }}>{calculateDays(selectedCase.createdAt)}</span>
                        </div>
                      </div>
                      {/* Row 3 */}
                      <div style={{ display: "flex", gap: "20px", minHeight: "44px", alignItems: "center" }}>
                        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{
                            width: "80px",
                            fontFamily: "Pretendard",
                            fontSize: "16px",
                            letterSpacing: "-0.02em",
                            color: "rgba(12, 12, 12, 0.5)",
                          }}>견적금액</span>
                          <span style={{
                            fontFamily: "Pretendard",
                            fontSize: "16px",
                            letterSpacing: "-0.02em",
                            color: "rgba(12, 12, 12, 0.9)",
                          }}>7,312,000원</span>
                        </div>
                        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{
                            width: "80px",
                            fontFamily: "Pretendard",
                            fontSize: "16px",
                            letterSpacing: "-0.02em",
                            color: "rgba(12, 12, 12, 0.5)",
                          }}>승인금액</span>
                          <span style={{
                            fontFamily: "Pretendard",
                            fontSize: "16px",
                            letterSpacing: "-0.02em",
                            color: "rgba(12, 12, 12, 0.9)",
                          }}>6,320,000원</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 종결/보상 */}
                  <div style={{
                    borderBottom: "1px solid rgba(12, 12, 12, 0.1)",
                    paddingBottom: "24px",
                  }}>
                    <div style={{
                      padding: "10px 16px",
                      fontFamily: "Pretendard",
                      fontWeight: 600,
                      fontSize: "15px",
                      letterSpacing: "-0.02em",
                      color: "rgba(12, 12, 12, 0.9)",
                    }}>
                      종결/보상
                    </div>
                    <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: "0" }}>
                      <div style={{ display: "flex", gap: "20px", minHeight: "44px", alignItems: "center" }}>
                        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{
                            width: "80px",
                            fontFamily: "Pretendard",
                            fontSize: "16px",
                            letterSpacing: "-0.02em",
                            color: "rgba(12, 12, 12, 0.5)",
                          }}>종결번호</span>
                          <span style={{
                            fontFamily: "Pretendard",
                            fontSize: "16px",
                            letterSpacing: "-0.02em",
                            color: "rgba(12, 12, 12, 0.9)",
                          }}>POL-12345</span>
                        </div>
                        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{
                            width: "80px",
                            fontFamily: "Pretendard",
                            fontSize: "16px",
                            letterSpacing: "-0.02em",
                            color: "rgba(12, 12, 12, 0.5)",
                          }}>Ded</span>
                          <span style={{
                            fontFamily: "Pretendard",
                            fontSize: "16px",
                            letterSpacing: "-0.02em",
                            color: "rgba(12, 12, 12, 0.9)",
                          }}>200,000원</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 심사 정보 */}
                  <div style={{
                    borderBottom: "1px solid rgba(12, 12, 12, 0.1)",
                    paddingBottom: "24px",
                  }}>
                    <div style={{
                      padding: "10px 16px",
                      fontFamily: "Pretendard",
                      fontWeight: 600,
                      fontSize: "15px",
                      letterSpacing: "-0.02em",
                      color: "rgba(12, 12, 12, 0.9)",
                    }}>
                      심사 정보
                    </div>
                    <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: "0" }}>
                      <div style={{ display: "flex", gap: "20px", minHeight: "44px", alignItems: "center" }}>
                        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{
                            width: "80px",
                            fontFamily: "Pretendard",
                            fontSize: "16px",
                            letterSpacing: "-0.02em",
                            color: "rgba(12, 12, 12, 0.5)",
                          }}>심사사</span>
                          <span style={{
                            fontFamily: "Pretendard",
                            fontSize: "16px",
                            letterSpacing: "-0.02em",
                            color: "rgba(12, 12, 12, 0.9)",
                          }}>{selectedCase.insuranceCompany || "-"}</span>
                        </div>
                        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{
                            width: "80px",
                            fontFamily: "Pretendard",
                            fontSize: "16px",
                            letterSpacing: "-0.02em",
                            color: "rgba(12, 12, 12, 0.5)",
                          }}>심사 담당자</span>
                          <span style={{
                            fontFamily: "Pretendard",
                            fontSize: "16px",
                            letterSpacing: "-0.02em",
                            color: "rgba(12, 12, 12, 0.9)",
                          }}>{selectedCase.assignedPartnerManager || "-"}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 일시 */}
                  <div style={{
                    borderBottom: "1px solid rgba(12, 12, 12, 0.1)",
                    paddingBottom: "24px",
                  }}>
                    <div style={{
                      padding: "10px 16px",
                      fontFamily: "Pretendard",
                      fontWeight: 600,
                      fontSize: "15px",
                      letterSpacing: "-0.02em",
                      color: "rgba(12, 12, 12, 0.9)",
                    }}>
                      일시
                    </div>
                    <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: "0" }}>
                      {/* Row 1 */}
                      <div style={{ display: "flex", gap: "20px", minHeight: "44px", alignItems: "center" }}>
                        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{
                            width: "80px",
                            fontFamily: "Pretendard",
                            fontSize: "16px",
                            letterSpacing: "-0.02em",
                            color: "rgba(12, 12, 12, 0.5)",
                          }}>접수일</span>
                          <span style={{
                            fontFamily: "Pretendard",
                            fontSize: "16px",
                            letterSpacing: "-0.02em",
                            color: "rgba(12, 12, 12, 0.9)",
                          }}>{formatDate(selectedCase.createdAt)}</span>
                        </div>
                        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{
                            width: "80px",
                            fontFamily: "Pretendard",
                            fontSize: "16px",
                            letterSpacing: "-0.02em",
                            color: "rgba(12, 12, 12, 0.5)",
                          }}>배당일</span>
                          <span style={{
                            fontFamily: "Pretendard",
                            fontSize: "16px",
                            letterSpacing: "-0.02em",
                            color: "rgba(12, 12, 12, 0.9)",
                          }}>{formatDate(selectedCase.assignmentDate ?? null)}</span>
                        </div>
                      </div>
                      {/* Row 2 */}
                      <div style={{ display: "flex", gap: "20px", minHeight: "44px", alignItems: "center" }}>
                        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{
                            width: "80px",
                            fontFamily: "Pretendard",
                            fontSize: "16px",
                            letterSpacing: "-0.02em",
                            color: "rgba(12, 12, 12, 0.5)",
                          }}>현장방문당일 배당</span>
                          <span style={{
                            fontFamily: "Pretendard",
                            fontSize: "16px",
                            letterSpacing: "-0.02em",
                            color: "rgba(12, 12, 12, 0.9)",
                          }}>{formatDate(selectedCase.siteVisitDate ?? null)}</span>
                        </div>
                        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{
                            width: "80px",
                            fontFamily: "Pretendard",
                            fontSize: "16px",
                            letterSpacing: "-0.02em",
                            color: "rgba(12, 12, 12, 0.5)",
                          }}>현장조사당일 배당</span>
                          <span style={{
                            fontFamily: "Pretendard",
                            fontSize: "16px",
                            letterSpacing: "-0.02em",
                            color: "rgba(12, 12, 12, 0.9)",
                          }}>{formatDate(selectedCase.fieldSurveyDate ?? null)}</span>
                        </div>
                      </div>
                      {/* Row 3 */}
                      <div style={{ display: "flex", gap: "20px", minHeight: "44px", alignItems: "center" }}>
                        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{
                            width: "80px",
                            fontFamily: "Pretendard",
                            fontSize: "16px",
                            letterSpacing: "-0.02em",
                            color: "rgba(12, 12, 12, 0.5)",
                          }}>1차 실사일 (심사)</span>
                          <span style={{
                            fontFamily: "Pretendard",
                            fontSize: "16px",
                            letterSpacing: "-0.02em",
                            color: "rgba(12, 12, 12, 0.9)",
                          }}>{formatDate(selectedCase.firstInspectionDate ?? null)}</span>
                        </div>
                        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{
                            width: "80px",
                            fontFamily: "Pretendard",
                            fontSize: "16px",
                            letterSpacing: "-0.02em",
                            color: "rgba(12, 12, 12, 0.5)",
                          }}>승인완성일정</span>
                          <span style={{
                            fontFamily: "Pretendard",
                            fontSize: "16px",
                            letterSpacing: "-0.02em",
                            color: "rgba(12, 12, 12, 0.9)",
                          }}>{formatDate(selectedCase.approvalCompletionDate ?? null)}</span>
                        </div>
                      </div>
                      {/* Row 4 */}
                      <div style={{ display: "flex", gap: "20px", minHeight: "44px", alignItems: "center" }}>
                        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{
                            width: "80px",
                            fontFamily: "Pretendard",
                            fontSize: "16px",
                            letterSpacing: "-0.02em",
                            color: "rgba(12, 12, 12, 0.5)",
                          }}>총공일</span>
                          <span style={{
                            fontFamily: "Pretendard",
                            fontSize: "16px",
                            letterSpacing: "-0.02em",
                            color: "rgba(12, 12, 12, 0.9)",
                          }}>{formatDate(selectedCase.totalWorkDate ?? null)}</span>
                        </div>
                        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{
                            width: "80px",
                            fontFamily: "Pretendard",
                            fontSize: "16px",
                            letterSpacing: "-0.02em",
                            color: "rgba(12, 12, 12, 0.5)",
                          }}>공사업체보고 배당</span>
                          <span style={{
                            fontFamily: "Pretendard",
                            fontSize: "16px",
                            letterSpacing: "-0.02em",
                            color: "rgba(12, 12, 12, 0.9)",
                          }}>{formatDate(selectedCase.contractorReportDate ?? null)}</span>
                        </div>
                      </div>
                      {/* Row 5 */}
                      <div style={{ display: "flex", gap: "20px", minHeight: "44px", alignItems: "center" }}>
                        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{
                            width: "80px",
                            fontFamily: "Pretendard",
                            fontSize: "16px",
                            letterSpacing: "-0.02em",
                            color: "rgba(12, 12, 12, 0.5)",
                          }}>공사업체보수 배당</span>
                          <span style={{
                            fontFamily: "Pretendard",
                            fontSize: "16px",
                            letterSpacing: "-0.02em",
                            color: "rgba(12, 12, 12, 0.9)",
                          }}>{formatDate(selectedCase.contractorRepairDate ?? null)}</span>
                        </div>
                        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{
                            width: "80px",
                            fontFamily: "Pretendard",
                            fontSize: "16px",
                            letterSpacing: "-0.02em",
                            color: "rgba(12, 12, 12, 0.5)",
                          }}>완공일</span>
                          <span style={{
                            fontFamily: "Pretendard",
                            fontSize: "16px",
                            letterSpacing: "-0.02em",
                            color: "rgba(12, 12, 12, 0.9)",
                          }}>{formatDate(selectedCase.completionDate ?? null)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 특이사항 섹션 */}
                  <div style={{
                    padding: "20px",
                    background: "rgba(12, 12, 12, 0.04)",
                    backdropFilter: "blur(7px)",
                    borderRadius: "12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}>
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
                        fontFamily: "Pretendard",
                        fontSize: "16px",
                        lineHeight: "1.6",
                        letterSpacing: "-0.02em",
                        color: selectedCase?.specialNotes ? "rgba(12, 12, 12, 0.9)" : "rgba(12, 12, 12, 0.5)",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                      }}
                      data-testid="text-special-notes"
                    >
                      {selectedCase?.specialNotes || "-"}
                    </div>
                  </div>

                  {/* 하단 버튼 */}
                  <button
                    onClick={handleOpenSpecialNotesDialog}
                    style={{
                      width: "100%",
                      height: "52px",
                      background: "#FFFFFF",
                      border: "1px solid rgba(0, 143, 237, 0.3)",
                      boxShadow: "2px 4px 30px #BDD1F0",
                      borderRadius: "10px",
                      padding: "10px",
                      fontFamily: "Pretendard",
                      fontWeight: 600,
                      fontSize: "18px",
                      letterSpacing: "-0.02em",
                      color: "#0C95F6",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                    data-testid="button-special-note-input"
                  >
                    특이사항 입력
                  </button>
                </div>
              </ScrollArea>
            );
          })()}
        </SheetContent>
      </Sheet>

      {/* 특이사항 입력 Dialog */}
      <Dialog open={showSpecialNotesDialog} onOpenChange={setShowSpecialNotesDialog}>
        <DialogContent className="max-w-[747px]" data-testid="dialog-special-notes">
          <DialogHeader>
            <DialogTitle style={{
              fontFamily: "Pretendard",
              fontWeight: 600,
              fontSize: "18px",
              letterSpacing: "-0.02em",
              color: "#0C0C0C",
            }}>
              특이사항 입력
            </DialogTitle>
          </DialogHeader>

          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* 선택한 건 (케이스 정보) */}
            <div>
              <div style={{
                fontFamily: "Pretendard",
                fontWeight: 500,
                fontSize: "14px",
                letterSpacing: "-0.01em",
                color: "#686A6E",
                marginBottom: "8px",
              }}>
                선택한 건
              </div>
              
              <div style={{
                padding: "20px",
                background: "rgba(12, 12, 12, 0.04)",
                backdropFilter: "blur(7px)",
                borderRadius: "12px",
              }}>
                {/* 보험사 + 보험사 사고번호 */}
                <div style={{ display: "flex", alignItems: "center", gap: "9px", marginBottom: "12px" }}>
                  <span style={{
                    fontFamily: "Pretendard",
                    fontWeight: 600,
                    fontSize: "18px",
                    letterSpacing: "-0.02em",
                    color: "rgba(12, 12, 12, 0.9)",
                  }}>
                    {selectedCase?.insuranceCompany || "-"}
                  </span>
                  <div style={{
                    width: "4px",
                    height: "4px",
                    background: "rgba(0, 143, 237, 0.9)",
                    borderRadius: "50%",
                  }}></div>
                  <span style={{
                    fontFamily: "Pretendard",
                    fontWeight: 600,
                    fontSize: "18px",
                    letterSpacing: "-0.02em",
                    color: "rgba(12, 12, 12, 0.9)",
                  }}>
                    {selectedCase?.insuranceAccidentNo || "-"}
                  </span>
                </div>
                
                {/* 핵심 정보 그리드 */}
                <div style={{ 
                  display: "grid",
                  gridTemplateColumns: "100px 1fr",
                  gap: "8px",
                  fontSize: "14px",
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
                    사고일시
                  </span>
                  <span style={{
                    fontFamily: "Pretendard",
                    fontWeight: 400,
                    color: "rgba(12, 12, 12, 0.8)",
                  }}>
                    {formatDate(selectedCase?.accidentDate ?? null)}
                  </span>

                  <span style={{
                    fontFamily: "Pretendard",
                    fontWeight: 500,
                    color: "rgba(12, 12, 12, 0.6)",
                  }}>
                    보험계약자
                  </span>
                  <span style={{
                    fontFamily: "Pretendard",
                    fontWeight: 400,
                    color: "rgba(12, 12, 12, 0.8)",
                  }}>
                    {selectedCase?.policyHolderName || "-"}
                  </span>
                </div>
              </div>
            </div>

            {/* 특이사항 Form - 협력사는 입력, 관리자는 확인 */}
            {user?.role === "협력사" ? (
              <Form {...specialNotesForm}>
                <form onSubmit={specialNotesForm.handleSubmit(handleSpecialNotesSubmit)} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                  <FormField
                    control={specialNotesForm.control}
                    name="specialNotes"
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
                          특이사항
                        </div>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="특이사항을 입력하세요"
                            style={{
                              minHeight: "155px",
                              borderRadius: "12px",
                              fontFamily: "Pretendard",
                              fontSize: "14px",
                            }}
                            data-testid="input-special-notes"
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
                      onClick={() => setShowSpecialNotesDialog(false)}
                      data-testid="button-cancel-special-notes"
                    >
                      취소
                    </Button>
                    <Button
                      type="submit"
                      disabled={updateSpecialNotesMutation.isPending}
                      data-testid="button-save-special-notes"
                    >
                      {updateSpecialNotesMutation.isPending ? "저장 중..." : "저장"}
                    </Button>
                  </div>
                </form>
              </Form>
            ) : (
              // 관리자는 특이사항 확인만 가능
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                <div>
                  <div style={{
                    fontFamily: "Pretendard",
                    fontWeight: 500,
                    fontSize: "14px",
                    letterSpacing: "-0.01em",
                    color: "#686A6E",
                    marginBottom: "8px",
                  }}>
                    특이사항
                  </div>
                  <div style={{
                    minHeight: "155px",
                    borderRadius: "12px",
                    border: "1px solid rgba(12, 12, 12, 0.1)",
                    padding: "12px",
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    color: "rgba(12, 12, 12, 0.8)",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}>
                    {selectedCase?.specialNotes || "-"}
                  </div>
                  {selectedCase?.specialNotes && !selectedCase?.specialNotesConfirmedBy && (
                    <div style={{
                      marginTop: "8px",
                      fontFamily: "Pretendard",
                      fontSize: "12px",
                      color: "#ED1C00",
                    }}>
                      ※ 협력사가 작성한 특이사항이 확인되지 않았습니다.
                    </div>
                  )}
                  {selectedCase?.specialNotesConfirmedBy && (
                    <div style={{
                      marginTop: "8px",
                      fontFamily: "Pretendard",
                      fontSize: "12px",
                      color: "#008FED",
                    }}>
                      ✓ 확인 완료
                    </div>
                  )}
                </div>

                {/* 버튼 */}
                <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowSpecialNotesDialog(false)}
                    data-testid="button-cancel-special-notes"
                  >
                    닫기
                  </Button>
                  {selectedCase?.specialNotes && !selectedCase?.specialNotesConfirmedBy && (
                    <Button
                      onClick={handleConfirmSpecialNotes}
                      disabled={confirmSpecialNotesMutation.isPending}
                      data-testid="button-confirm-special-notes"
                    >
                      {confirmSpecialNotesMutation.isPending ? "확인 중..." : "확인"}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

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

      {/* 진행건 상세보기 Sheet */}
      <Sheet open={showDetailSheet} onOpenChange={setShowDetailSheet}>
        <SheetContent 
          side="right"
          style={{
            width: "609px",
            background: "#FFFFFF",
            padding: "0",
            border: "none",
          }}
        >
          <SheetHeader style={{ padding: "24px 24px 0 24px", borderBottom: "1px solid rgba(12, 12, 12, 0.08)" }}>
            <SheetTitle style={{
              fontFamily: "Pretendard",
              fontWeight: 600,
              fontSize: "18px",
              color: "#0C0C0C",
              paddingBottom: "16px",
            }}>
              진행건 상세보기
            </SheetTitle>
          </SheetHeader>

          <ScrollArea style={{ height: "calc(100vh - 80px)" }}>
            <div style={{ padding: "24px" }}>
              {selectedCase && (
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                  {/* 케이스 번호와 상태 */}
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "16px",
                    background: "rgba(0, 143, 237, 0.05)",
                    borderRadius: "12px",
                  }}>
                    <div>
                      <div style={{
                        fontFamily: "Pretendard",
                        fontSize: "12px",
                        color: "rgba(12, 12, 12, 0.6)",
                        marginBottom: "4px",
                      }}>
                        사고번호
                      </div>
                      <div style={{
                        fontFamily: "Pretendard",
                        fontSize: "16px",
                        fontWeight: 600,
                        color: "#0C0C0C",
                      }}>
                        {selectedCase.insuranceAccidentNo || "-"}
                      </div>
                    </div>
                    <div
                      style={{
                        padding: "8px 16px",
                        background: selectedCase.status === "승인" ? "rgba(0, 200, 83, 0.15)" : 
                                   selectedCase.status === "반려" ? "rgba(244, 67, 54, 0.15)" : 
                                   "rgba(0, 143, 237, 0.15)",
                        borderRadius: "20px",
                        fontFamily: "Pretendard",
                        fontSize: "14px",
                        fontWeight: 600,
                        color: selectedCase.status === "승인" ? "#00C853" : 
                               selectedCase.status === "반려" ? "#F44336" : 
                               "#008FED",
                      }}
                      data-testid="detail-status"
                    >
                      {selectedCase.status || "대기중"}
                    </div>
                  </div>

                  {/* 기본 정보 */}
                  <div>
                    <div style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#0C0C0C",
                      marginBottom: "12px",
                      paddingBottom: "8px",
                      borderBottom: "2px solid #008FED",
                    }}>
                      기본 정보
                    </div>
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "100px 1fr",
                      gap: "12px",
                      fontSize: "13px",
                    }}>
                      <div style={{ fontFamily: "Pretendard", fontWeight: 500, color: "rgba(12, 12, 12, 0.6)" }}>
                        접수번호
                      </div>
                      <div style={{ fontFamily: "Pretendard", color: "rgba(12, 12, 12, 0.9)" }}>
                        {selectedCase.caseNumber || "-"}
                      </div>

                      <div style={{ fontFamily: "Pretendard", fontWeight: 500, color: "rgba(12, 12, 12, 0.6)" }}>
                        보험사
                      </div>
                      <div style={{ fontFamily: "Pretendard", color: "rgba(12, 12, 12, 0.9)" }}>
                        {selectedCase.insuranceCompany || "-"}
                      </div>

                      <div style={{ fontFamily: "Pretendard", fontWeight: 500, color: "rgba(12, 12, 12, 0.6)" }}>
                        의뢰사
                      </div>
                      <div style={{ fontFamily: "Pretendard", color: "rgba(12, 12, 12, 0.9)" }}>
                        {selectedCase.clientName || "-"}
                      </div>

                      <div style={{ fontFamily: "Pretendard", fontWeight: 500, color: "rgba(12, 12, 12, 0.6)" }}>
                        담당자
                      </div>
                      <div style={{ fontFamily: "Pretendard", color: "rgba(12, 12, 12, 0.9)" }}>
                        {selectedCase.assignedPartnerManager || "-"}
                      </div>

                      <div style={{ fontFamily: "Pretendard", fontWeight: 500, color: "rgba(12, 12, 12, 0.6)" }}>
                        협력사
                      </div>
                      <div style={{ fontFamily: "Pretendard", color: "rgba(12, 12, 12, 0.9)" }}>
                        {selectedCase.assignedPartner || "-"}
                      </div>
                    </div>
                  </div>

                  {/* 정산 정보 */}
                  <div>
                    <div style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#0C0C0C",
                      marginBottom: "12px",
                      paddingBottom: "8px",
                      borderBottom: "2px solid #008FED",
                    }}>
                      정산/분석
                    </div>
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "100px 1fr",
                      gap: "12px",
                      fontSize: "13px",
                    }}>
                      <div style={{ fontFamily: "Pretendard", fontWeight: 500, color: "rgba(12, 12, 12, 0.6)" }}>
                        단행사
                      </div>
                      <div style={{ fontFamily: "Pretendard", color: "rgba(12, 12, 12, 0.9)" }}>
                        {selectedCase.status === "승인" ? "심사완료" : "-"}
                      </div>

                      <div style={{ fontFamily: "Pretendard", fontWeight: 500, color: "rgba(12, 12, 12, 0.6)" }}>
                        입사 담당자
                      </div>
                      <div style={{ fontFamily: "Pretendard", color: "rgba(12, 12, 12, 0.9)" }}>
                        {selectedCase.investigatorName || "-"}
                      </div>

                      <div style={{ fontFamily: "Pretendard", fontWeight: 500, color: "rgba(12, 12, 12, 0.6)" }}>
                        협력사
                      </div>
                      <div style={{ fontFamily: "Pretendard", color: "rgba(12, 12, 12, 0.9)" }}>
                        {selectedCase.assignedPartner || "-"}
                      </div>

                      <div style={{ fontFamily: "Pretendard", fontWeight: 500, color: "rgba(12, 12, 12, 0.6)" }}>
                        당일차
                      </div>
                      <div style={{ fontFamily: "Pretendard", color: "rgba(12, 12, 12, 0.9)" }}>
                        {calculateDays(selectedCase.createdAt)}
                      </div>

                      <div style={{ fontFamily: "Pretendard", fontWeight: 500, color: "rgba(12, 12, 12, 0.6)" }}>
                        견적금액
                      </div>
                      <div style={{ fontFamily: "Pretendard", color: "rgba(12, 12, 12, 0.9)" }}>
                        -
                      </div>

                      <div style={{ fontFamily: "Pretendard", fontWeight: 500, color: "rgba(12, 12, 12, 0.6)" }}>
                        승인금액
                      </div>
                      <div style={{ fontFamily: "Pretendard", color: "rgba(12, 12, 12, 0.9)" }}>
                        -
                      </div>
                    </div>
                  </div>

                  {/* 증권/분석 */}
                  <div>
                    <div style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#0C0C0C",
                      marginBottom: "12px",
                      paddingBottom: "8px",
                      borderBottom: "2px solid #008FED",
                    }}>
                      증권/분석
                    </div>
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "100px 1fr",
                      gap: "12px",
                      fontSize: "13px",
                    }}>
                      <div style={{ fontFamily: "Pretendard", fontWeight: 500, color: "rgba(12, 12, 12, 0.6)" }}>
                        증권번호
                      </div>
                      <div style={{ fontFamily: "Pretendard", color: "rgba(12, 12, 12, 0.9)" }}>
                        -
                      </div>

                      <div style={{ fontFamily: "Pretendard", fontWeight: 500, color: "rgba(12, 12, 12, 0.6)" }}>
                        가입금액
                      </div>
                      <div style={{ fontFamily: "Pretendard", color: "rgba(12, 12, 12, 0.9)" }}>
                        -
                      </div>

                      <div style={{ fontFamily: "Pretendard", fontWeight: 500, color: "rgba(12, 12, 12, 0.6)" }}>
                        Deol
                      </div>
                      <div style={{ fontFamily: "Pretendard", color: "rgba(12, 12, 12, 0.9)" }}>
                        -
                      </div>
                    </div>
                  </div>

                  {/* 심사 정보 */}
                  <div>
                    <div style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#0C0C0C",
                      marginBottom: "12px",
                      paddingBottom: "8px",
                      borderBottom: "2px solid #008FED",
                    }}>
                      심사 정보
                    </div>
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "100px 1fr",
                      gap: "12px",
                      fontSize: "13px",
                    }}>
                      <div style={{ fontFamily: "Pretendard", fontWeight: 500, color: "rgba(12, 12, 12, 0.6)" }}>
                        심사사
                      </div>
                      <div style={{ fontFamily: "Pretendard", color: "rgba(12, 12, 12, 0.9)" }}>
                        {selectedCase.insuranceCompany || "-"}
                      </div>

                      <div style={{ fontFamily: "Pretendard", fontWeight: 500, color: "rgba(12, 12, 12, 0.6)" }}>
                        심사 담당자
                      </div>
                      <div style={{ fontFamily: "Pretendard", color: "rgba(12, 12, 12, 0.9)" }}>
                        {selectedCase.investigatorName || "-"}
                      </div>

                      <div style={{ fontFamily: "Pretendard", fontWeight: 500, color: "rgba(12, 12, 12, 0.6)" }}>
                        협력사
                      </div>
                      <div style={{ fontFamily: "Pretendard", color: "rgba(12, 12, 12, 0.9)" }}>
                        {selectedCase.assignedPartner || "-"}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

    </div>
  );
}
