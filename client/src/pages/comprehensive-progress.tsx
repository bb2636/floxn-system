import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { User, CaseWithLatestProgress, type UserFavorite, type Invoice } from "@shared/schema";
import { Search, Cloud, Star, Plus, CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import logoIcon from "@assets/Frame 2_1762217940686.png";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatCaseNumber } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { GlobalHeader } from "@/components/global-header";
import IntakePage from "@/pages/intake";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { SmsNotificationDialog, type NotificationStage, type RecipientConfig } from "@/components/sms-notification-dialog";
import { InvoiceSheet, getCaseNumberPrefix } from "@/components/InvoiceSheet";
import { FieldDispatchCostSheet } from "@/components/FieldDispatchCostSheet";
import type { Case as SchemaCase } from "@shared/schema";

// SMS 자동 발송을 위한 수신자 기본 설정
const STAGE_RECIPIENT_DEFAULTS: Record<NotificationStage, RecipientConfig> = {
  "접수완료": { partner: true, manager: true, assessorInvestigator: true },
  "현장정보입력": { partner: false, manager: true, assessorInvestigator: false },
  "반려": { partner: true, manager: false, assessorInvestigator: false },
  "현장정보제출": { partner: false, manager: false, assessorInvestigator: true },
  "복구요청": { partner: true, manager: false, assessorInvestigator: false },
  "직접복구": { partner: true, manager: true, assessorInvestigator: false },
  "미복구": { partner: true, manager: true, assessorInvestigator: false },
  "청구자료제출": { partner: false, manager: true, assessorInvestigator: false },
  "청구": { partner: false, manager: false, assessorInvestigator: true },
  "결정금액/수수료": { partner: true, manager: false, assessorInvestigator: false },
  "접수취소": { partner: false, manager: false, assessorInvestigator: true },
  "입금완료": { partner: true, manager: true, assessorInvestigator: false },
  "부분입금": { partner: true, manager: true, assessorInvestigator: false },
  "정산완료": { partner: true, manager: true, assessorInvestigator: false },
  "선견적요청": { partner: true, manager: true, assessorInvestigator: false },
};

// 진행상태 목록
const CASE_STATUSES = [
  "배당대기",
  "접수완료",
  "현장방문",
  "현장정보입력",
  "검토중",
  "반려",
  "1차승인",
  "현장정보제출",
  "복구요청(2차승인)",
  "직접복구",
  "선견적요청",
  "(직접복구인 경우) 청구자료제출",
  "(선견적요청인 경우) 출동비 청구",
  "청구",
  "입금완료",
  "부분입금",
  "정산완료",
  "접수취소",
] as const;

// 상태별 색상
const getStatusColor = (status: string) => {
  if (status === "1차승인") return "#008FED"; // 파란색
  if (status === "복구요청(2차승인)") return "#00C853"; // 초록색
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
  const [selectedStatus, setSelectedStatus] = useState("전체");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [detailTab, setDetailTab] = useState("기본정보");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>([]);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [showReceptionDetailDialog, setShowReceptionDetailDialog] = useState(false);
  const [isReceptionEditMode, setIsReceptionEditMode] = useState(false);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [showFieldDispatchInvoiceDialog, setShowFieldDispatchInvoiceDialog] = useState(false);
  const [invoiceCaseId, setInvoiceCaseId] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // SMS 알림 다이얼로그 상태 (추가 정보가 필요한 상태에서만 사용)
  const [smsDialogOpen, setSmsDialogOpen] = useState(false);
  const [smsStage, setSmsStage] = useState<NotificationStage>("복구요청");
  const [smsCaseData, setSmsCaseData] = useState<CaseWithLatestProgress | null>(null);

  // 청구하기 버튼 표시 조건: 연관된 모든 케이스가 "청구" 상태인 경우에만 버튼 표시
  const canShowClaimButton = (caseItem: CaseWithLatestProgress, allCases: CaseWithLatestProgress[] | undefined): boolean => {
    if (!allCases) return false;
    
    // 해당 케이스가 "청구" 또는 청구자료제출 관련 상태인 경우에만 체크
    const claimStatuses = [
      "청구",
      "(직접복구인 경우) 청구자료제출",
      "(선견적요청인 경우) 출동비 청구"
    ];
    
    // 현재 케이스가 청구 상태가 아니면 버튼 숨김
    if (!claimStatuses.includes(caseItem.status || "")) {
      return false;
    }
    
    // 같은 prefix를 가진 모든 연관 케이스 찾기
    const groupPrefix = getCaseNumberPrefix(caseItem.caseNumber);
    if (!groupPrefix) return false;
    
    const relatedCases = allCases.filter(c => {
      const prefix = getCaseNumberPrefix(c.caseNumber);
      return prefix === groupPrefix;
    });
    
    // 연관된 모든 케이스가 청구 관련 상태인지 확인
    return relatedCases.every(c => claimStatuses.includes(c.status || ""));
  };

  const { data: user, isLoading: userLoading } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  const { data: cases, isLoading } = useQuery<CaseWithLatestProgress[]>({
    queryKey: ["/api/cases"],
  });

  const { data: favorites = [] } = useQuery<UserFavorite[]>({
    queryKey: ["/api/favorites"],
    enabled: !!user,
  });

  // 기본 사용자 정보 타입 (협력사도 접근 가능)
  type BasicUser = { id: string; name: string | null; username: string; contact: string | null; role: string; bankName: string | null; accountNumber: string | null };
  
  // 사용자 목록 가져오기 (담당자 이름 표시용) - 협력사도 접근 가능한 basic 엔드포인트 사용
  const { data: allUsers = [] } = useQuery<BasicUser[]>({
    queryKey: ["/api/users/basic"],
  });

  // 승인된 인보이스 목록 가져오기
  const { data: approvedInvoices = [] } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices/approved"],
  });

  // 사용자 ID로 이름 가져오기
  const getUserName = (userId: string | null | undefined): string => {
    if (!userId) return "-";
    const foundUser = allUsers.find(u => u.id === userId);
    return foundUser?.name || foundUser?.username || userId;
  };

  // 인보이스 승인된 그룹 프리픽스 목록 (Set for O(1) lookup)
  const approvedInvoicePrefixes = new Set(
    approvedInvoices.map(inv => inv.caseGroupPrefix)
  );

  // 케이스 그룹별로 모든 케이스가 "청구" 상태인지 확인
  const isGroupReadyForComprehensiveProgress = (caseItem: CaseWithLatestProgress, allCases: CaseWithLatestProgress[] | undefined): boolean => {
    if (!allCases) return false;
    
    const groupPrefix = getCaseNumberPrefix(caseItem.caseNumber);
    if (!groupPrefix) return false;
    
    // 1. 인보이스가 승인되었는지 확인
    if (!approvedInvoicePrefixes.has(groupPrefix)) {
      return false;
    }
    
    // 2. 같은 그룹의 모든 케이스가 "청구" 관련 상태인지 확인
    const casesInGroup = allCases.filter(c => getCaseNumberPrefix(c.caseNumber) === groupPrefix);
    const claimRelatedStatuses = [
      "청구",
      "(직접복구인 경우) 청구자료제출",
      "(선견적요청인 경우) 출동비 청구",
      "입금완료",
      "부분입금",
      "정산완료",
    ];
    
    const allHaveClaimStatus = casesInGroup.every(c => 
      claimRelatedStatuses.includes(c.status || "")
    );
    
    return allHaveClaimStatus;
  };

  const isFavorite = favorites.some((f) => f.menuName === "종합진행관리");

  const toggleFavoriteMutation = useMutation({
    mutationFn: async () => {
      if (isFavorite) {
        await apiRequest("DELETE", `/api/favorites/${encodeURIComponent("종합진행관리")}`);
      } else {
        await apiRequest("POST", "/api/favorites", { menuName: "종합진행관리" });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      toast({
        title: isFavorite ? "즐겨찾기 해제" : "즐겨찾기 추가",
        description: isFavorite 
          ? "종합진행관리가 즐겨찾기에서 제거되었습니다." 
          : "종합진행관리가 즐겨찾기에 추가되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "즐겨찾기 처리 실패",
        description: "다시 시도해주세요.",
        variant: "destructive",
      });
    },
  });

  const deleteCaseMutation = useMutation({
    mutationFn: async (caseId: string) => {
      return await apiRequest("DELETE", `/api/cases/${caseId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      setSelectedCaseId(null);
      setShowDeleteDialog(false);
      toast({
        title: "삭제 완료",
        description: "접수건이 삭제되었습니다.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "삭제 실패",
        description: error?.message || "접수건 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (caseIds: string[]) => {
      const results = await Promise.allSettled(
        caseIds.map(caseId => apiRequest("DELETE", `/api/cases/${caseId}`))
      );
      const failedCount = results.filter(r => r.status === "rejected").length;
      if (failedCount > 0) {
        throw new Error(`${failedCount}건 삭제 실패`);
      }
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      setSelectedCaseIds([]);
      setShowBulkDeleteDialog(false);
      toast({
        title: "삭제 완료",
        description: `선택한 ${selectedCaseIds.length}건이 삭제되었습니다.`,
      });
    },
    onError: (error: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      setSelectedCaseIds([]);
      setShowBulkDeleteDialog(false);
      toast({
        title: "일부 삭제 실패",
        description: error?.message || "일부 접수건 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ caseId, status }: { caseId: string; status: string }) => {
      // 백엔드에서 미복구→출동비 청구 전환 처리
      return await apiRequest("PATCH", `/api/cases/${caseId}/status`, { status });
    },
    onMutate: async ({ caseId, status }) => {
      // 진행 중인 refetch 취소
      await queryClient.cancelQueries({ queryKey: ["/api/cases"] });
      
      // 이전 데이터 저장 (롤백용 및 SMS 다이얼로그용)
      const previousCases = queryClient.getQueryData<CaseWithLatestProgress[]>(["/api/cases"]);
      
      // SMS 다이얼로그용 케이스 데이터 스냅샷 저장 (변경 전 상태)
      const targetCase = previousCases?.find(c => c.id === caseId) || null;
      
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
      
      return { previousCases, targetCase };
    },
    onSuccess: async (data, variables, context) => {
      // 백엔드에서 반환된 실제 데이터로 업데이트
      // 서버에서 { success: true, case: updatedCase } 형태로 반환
      let updatedCaseData: CaseWithLatestProgress | null = null;
      const responseData = data as { success?: boolean; case?: unknown };
      if (responseData && responseData.case && typeof responseData.case === 'object' && 'id' in responseData.case) {
        updatedCaseData = responseData.case as unknown as CaseWithLatestProgress;
        queryClient.setQueryData<CaseWithLatestProgress[]>(["/api/cases"], (old) => {
          if (!old) return old;
          return old.map(c => c.id === updatedCaseData!.id ? { ...c, ...updatedCaseData } : c);
        });
      }
      
      // 서버 응답에 case가 없으면 onMutate에서 저장한 스냅샷 사용
      if (!updatedCaseData && context?.targetCase) {
        updatedCaseData = context.targetCase;
      }
      
      // 백그라운드 refetch로 전체 데이터 동기화
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      
      // SMS 자동 발송 (Dialog 없이 바로 발송) - 추가 정보가 필요없는 상태에 사용
      const sendSmsAutomatically = async (caseData: CaseWithLatestProgress, stage: NotificationStage) => {
        try {
          const recipients = STAGE_RECIPIENT_DEFAULTS[stage];
          await apiRequest("POST", "/api/send-stage-notification", {
            caseId: caseData.id,
            stage,
            recipients,
          });
          toast({
            title: "문자 발송 완료",
            description: `${stage} 알림이 자동 발송되었습니다.`,
          });
        } catch (error) {
          console.error("SMS 자동 발송 실패:", error);
          toast({
            title: "문자 발송 실패",
            description: "문자 발송 중 오류가 발생했습니다.",
            variant: "destructive",
          });
        }
      };
      
      // 추가 정보 입력이 필요한 상태 (취소 사유, 결정금액 등)
      const stagesRequiringDialog: NotificationStage[] = ["접수취소", "결정금액/수수료"];
      
      // 미복구 선택 시 자동 전환 알림 (백엔드에서 출동비 청구로 변경됨)
      if (variables.status === "미복구") {
        toast({
          title: "상태 자동 변경",
          description: "미복구 선택으로 인해 상태가 '출동비 청구'로 자동 변경되었습니다.",
        });
        // 미복구 SMS 자동 발송
        if (updatedCaseData) {
          sendSmsAutomatically(updatedCaseData, "미복구");
        }
      } else {
        toast({
          title: "상태 변경 완료",
          description: "진행상태가 성공적으로 변경되었습니다.",
        });
        
        // 특정 상태 변경 시 SMS 발송 (표에 맞게 전체 상태 매핑)
        const smsRequiredStages: Record<string, NotificationStage> = {
          "접수완료": "접수완료",
          "현장정보입력": "현장정보입력",
          "반려": "반려",
          "현장정보제출": "현장정보제출",
          "복구요청(2차승인)": "복구요청",
          "직접복구": "직접복구",
          "선견적요청": "선견적요청",
          "(직접복구인 경우) 청구자료제출": "청구자료제출",
          "(선견적요청인 경우) 출동비 청구": "청구자료제출",
          "청구자료제출": "청구자료제출",
          "청구": "청구",
          "결정금액/수수료": "결정금액/수수료",
          "입금완료": "입금완료",
          "부분입금": "부분입금",
          "정산완료": "정산완료",
          "접수취소": "접수취소",
        };
        
        const stage = smsRequiredStages[variables.status];
        if (stage && updatedCaseData) {
          // 추가 정보가 필요한 상태는 Dialog 표시, 나머지는 자동 발송
          if (stagesRequiringDialog.includes(stage)) {
            setSmsCaseData(updatedCaseData);
            setSmsStage(stage);
            setSmsDialogOpen(true);
          } else {
            sendSmsAutomatically(updatedCaseData, stage);
          }
        }
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

  // 진행상태 옵션 - CASE_STATUSES와 동일하게 + 전체 옵션
  const statusOptions = [
    { name: "전체", key: "all" },
    ...CASE_STATUSES.map((status) => ({ name: status, key: status })),
  ];

  // 진행상태 필터링 + 협력사 필터링 (모든 케이스 표시)
  const filteredByStatus = (cases || []).filter((caseItem) => {
    // 협력사인 경우: 자신에게 배정된 모든 케이스 표시 (배당대기 제외)
    if (user?.role === "협력사") {
      const isAssignedToMe = caseItem.assignedPartner === user.company;
      const isNotPending = caseItem.status !== "배당대기";
      
      // 협력사도 진행상태 필터를 선택할 수 있음
      if (selectedStatus === "전체") {
        return isAssignedToMe && isNotPending;
      }
      if (selectedStatus === "미복구") {
        return isAssignedToMe && (caseItem.status === "미복구" || caseItem.status === "출동비 청구");
      }
      if (selectedStatus === "출동비 청구") {
        return isAssignedToMe && (caseItem.status === "출동비 청구" || caseItem.status === "미복구");
      }
      return isAssignedToMe && caseItem.status === selectedStatus;
    }
    
    // 다른 역할은 기존 필터링 로직 유지
    if (selectedStatus === "전체") return true;
    // 미복구는 출동비 청구로 정규화되어 저장되므로 둘 다 매칭
    if (selectedStatus === "미복구") {
      return caseItem.status === "미복구" || caseItem.status === "출동비 청구";
    }
    if (selectedStatus === "출동비 청구") {
      return caseItem.status === "출동비 청구" || caseItem.status === "미복구";
    }
    return caseItem.status === selectedStatus;
  });

  // 검색 필터링
  const filteredDataUnsorted = filteredByStatus.filter((caseItem) => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    
    if (normalizedQuery === "") {
      return true;
    }

    const insuranceCompany = (caseItem.insuranceCompany || "").toLowerCase();
    const insuranceAccidentNo = (caseItem.insuranceAccidentNo || "").toLowerCase();
    const caseNumber = (caseItem.caseNumber || "").toLowerCase();
    const insuredName = (caseItem.insuredName || "").toLowerCase();
    const managerName = (caseItem.managerName || "").toLowerCase();
    const insuredAddress = (caseItem.insuredAddress || "").toLowerCase();
    const insuredAddressDetail = ((caseItem as any).insuredAddressDetail || "").toLowerCase();
    
    return (
      insuranceCompany.includes(normalizedQuery) ||
      insuranceAccidentNo.includes(normalizedQuery) ||
      caseNumber.includes(normalizedQuery) ||
      insuredName.includes(normalizedQuery) ||
      managerName.includes(normalizedQuery) ||
      insuredAddress.includes(normalizedQuery) ||
      insuredAddressDetail.includes(normalizedQuery)
    );
  });

  // 최신순으로 정렬 (caseNumber 기준 내림차순 - yyMMddxxx 형식)
  const filteredData = [...filteredDataUnsorted].sort((a, b) => {
    // caseNumber에서 숫자 부분만 추출 (예: "251201001" -> 251201001, "251201001-1" -> 2512010011)
    const extractNumericValue = (caseNumber: string | null) => {
      if (!caseNumber) return 0;
      // 하이픈 제거하고 숫자만 추출
      const numericStr = caseNumber.replace(/-/g, '');
      return parseInt(numericStr, 10) || 0;
    };
    
    const numA = extractNumericValue(a.caseNumber);
    const numB = extractNumericValue(b.caseNumber);
    return numB - numA;
  });

  const totalCount = filteredData.length;

  // 협력사가 변경 가능한 상태 목록
  const PARTNER_ALLOWED_STATUSES = ["직접복구", "선견적요청"];
  // 협력사가 상태 변경 가능한 현재 상태들
  const PARTNER_CHANGEABLE_FROM_STATUSES = ["현장정보제출", "복구요청(2차승인)"];

  // 상태 자동 전환 매핑 (선견적요청만 자동전환, 직접복구는 자동전환 없음)
  const STATUS_AUTO_TRANSITION: Record<string, string> = {
    "선견적요청": "(선견적요청인 경우) 출동비 청구",
  };

  // 상태 변경 핸들러
  const handleStatusChange = (caseId: string, status: string) => {
    // 자동 전환이 필요한 상태인지 확인
    const targetStatus = STATUS_AUTO_TRANSITION[status] || status;
    
    // 관리자는 모든 상태 변경 가능
    if (user?.role === "관리자") {
      updateStatusMutation.mutate({ caseId, status: targetStatus });
      return;
    }
    
    // 협력사는 직접복구/선견적요청만 변경 가능 (자동 전환 적용)
    if (user?.role === "협력사") {
      if (PARTNER_ALLOWED_STATUSES.includes(status)) {
        updateStatusMutation.mutate({ caseId, status: targetStatus });
        return;
      } else {
        toast({
          title: "권한 없음",
          description: "협력사는 '직접복구' 또는 '선견적요청' 상태만 선택할 수 있습니다.",
          variant: "destructive",
        });
        return;
      }
    }
    
    // 그 외 역할은 상태 변경 불가
    toast({
      title: "권한 없음",
      description: "상태 변경 권한이 없습니다.",
      variant: "destructive",
    });
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
          <button
            type="button"
            onClick={() => toggleFavoriteMutation.mutate()}
            className="flex items-center justify-center hover-elevate active-elevate-2 rounded transition-all"
            style={{
              width: "24px",
              height: "24px",
              padding: "4px",
            }}
            data-testid="favorite-종합진행관리"
          >
            <Star
              size={16}
              fill={isFavorite ? '#FFB800' : 'none'}
              stroke={isFavorite ? '#FFB800' : 'rgba(12, 12, 12, 0.3)'}
              strokeWidth={2}
            />
          </button>
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

          {/* Status Filter Dropdown */}
          <div style={{ marginBottom: "16px" }}>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger 
                className="w-[180px] h-[44px]"
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "14px",
                  fontWeight: 400,
                  letterSpacing: "-0.02em",
                  border: "1px solid rgba(12, 12, 12, 0.1)",
                  borderRadius: "6px",
                }}
                data-testid="select-status-filter"
              >
                <SelectValue placeholder="진행상태 선택" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.key} value={option.name} data-testid={`option-${option.key}`}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                placeholder="보험사 사고번호, 접수번호, 피보험자, 피보험자 주소, 당사 담당자 등으로 검색해주세요."
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

        {/* Count and Bulk Delete Button */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 4px", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
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
          {user?.role === "관리자" && selectedCaseIds.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowBulkDeleteDialog(true)}
              disabled={bulkDeleteMutation.isPending}
              data-testid="button-bulk-delete"
            >
              {bulkDeleteMutation.isPending ? "삭제 중..." : `선택된 ${selectedCaseIds.length}건 삭제`}
            </Button>
          )}
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
          <div style={{ overflowX: "auto" }}>
            {/* Table Header */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: user?.role === "협력사" 
                  ? "40px 110px 130px 110px 90px 100px 100px 100px 100px 80px 120px 120px 60px 100px 100px"
                  : "40px 110px 130px 110px 90px 100px 100px 100px 100px 80px 120px 120px 60px 100px",
                padding: "14px 20px",
                background: "rgba(12, 12, 12, 0.04)",
                borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                gap: "8px",
                minWidth: "max-content",
              }}
            >
            {user?.role === "관리자" && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Checkbox
                  checked={filteredData.length > 0 && selectedCaseIds.length === filteredData.length}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedCaseIds(filteredData.map(c => c.id));
                    } else {
                      setSelectedCaseIds([]);
                    }
                  }}
                  data-testid="checkbox-select-all"
                />
              </div>
            )}
            {user?.role !== "관리자" && (
              <div style={{ width: "40px" }} />
            )}
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
              피보험자
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
            {user?.role === "협력사" && (
              <div style={{ fontFamily: "Pretendard", fontWeight: 600, fontSize: "13px", color: "rgba(12, 12, 12, 0.6)" }}>
                동작
              </div>
            )}
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
                    <li>• 보험사명, 사고번호, 접수번호, 피보험자, 당사 담당자 등으로 검색해보세요.</li>
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
                    gridTemplateColumns: user?.role === "협력사"
                      ? "40px 110px 130px 110px 90px 100px 100px 100px 100px 80px 120px 120px 60px 100px 100px"
                      : "40px 110px 130px 110px 90px 100px 100px 100px 100px 80px 120px 120px 60px 100px",
                    padding: "14px 20px",
                    borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                    gap: "8px",
                    alignItems: "center",
                    cursor: "pointer",
                    minWidth: "max-content",
                  }}
                  data-testid={`case-row-${caseItem.id}`}
                >
                  {user?.role === "관리자" && (
                    <div 
                      style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={selectedCaseIds.includes(caseItem.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedCaseIds(prev => [...prev, caseItem.id]);
                          } else {
                            setSelectedCaseIds(prev => prev.filter(id => id !== caseItem.id));
                          }
                        }}
                        data-testid={`checkbox-case-${caseItem.id}`}
                      />
                    </div>
                  )}
                  {user?.role !== "관리자" && (
                    <div style={{ width: "40px" }} />
                  )}
                  <div style={{ fontFamily: "Pretendard", fontSize: "13px", color: "rgba(12, 12, 12, 0.8)" }}>
                    {caseItem.insuranceAccidentNo || "-"}
                  </div>
                  <div style={{ fontFamily: "Pretendard", fontSize: "13px", color: "rgba(12, 12, 12, 0.8)" }}>
                    {formatCaseNumber(caseItem.caseNumber) || "-"}
                  </div>
                  <div style={{ fontFamily: "Pretendard", fontSize: "13px", color: "rgba(12, 12, 12, 0.8)" }}>
                    {caseItem.insuranceCompany || "-"}
                  </div>
                  <div style={{ fontFamily: "Pretendard", fontSize: "13px", color: "rgba(12, 12, 12, 0.8)" }}>
                    {caseItem.insuredName || "-"}
                  </div>
                  <div style={{ fontFamily: "Pretendard", fontSize: "13px", color: "rgba(12, 12, 12, 0.8)" }}>
                    {caseItem.managerName || "-"}
                  </div>
                  <div style={{ fontFamily: "Pretendard", fontSize: "13px", color: "rgba(12, 12, 12, 0.8)" }}>
                    {caseItem.assignedPartner || "-"}
                  </div>
                  <div style={{ fontFamily: "Pretendard", fontSize: "13px", color: "rgba(12, 12, 12, 0.8)" }}>
                    {caseItem.initialEstimateAmount ? `₩${parseInt(caseItem.initialEstimateAmount).toLocaleString()}` : "-"}
                  </div>
                  <div style={{ fontFamily: "Pretendard", fontSize: "13px", color: "rgba(12, 12, 12, 0.8)" }}>
                    {caseItem.approvedAmount ? `₩${parseInt(caseItem.approvedAmount).toLocaleString()}` : "-"}
                  </div>
                  <div style={{ fontFamily: "Pretendard", fontSize: "13px", color: "rgba(12, 12, 12, 0.8)" }}>
                    {calculateDays(caseItem.createdAt)}
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    {/* 관리자: 모든 상태에서 변경 가능, 협력사: 현장정보제출/복구요청(2차승인) 상태에서만 변경 가능 */}
                    {(user?.role === "관리자" || (user?.role === "협력사" && PARTNER_CHANGEABLE_FROM_STATUSES.includes(caseItem.status || ""))) ? (
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
                            {caseItem.status || "배당대기"}
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
                          {(user?.role === "협력사" ? PARTNER_ALLOWED_STATUSES : CASE_STATUSES).map((status) => (
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
                        {caseItem.status || "배당대기"}
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
                  {user?.role === "협력사" && (
                    <div 
                      style={{ 
                        fontFamily: "Pretendard", 
                        fontSize: "13px", 
                        color: "#008FED",
                        fontWeight: 500,
                        cursor: "pointer",
                        textDecoration: "underline",
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        localStorage.setItem('selectedFieldSurveyCaseId', caseItem.id);
                        setLocation('/field-survey/management');
                      }}
                      data-testid={`button-field-survey-${caseItem.id}`}
                    >
                      현장조사 입력
                    </div>
                  )}
                  <div>
                    {caseItem.status === "배당대기" ? (
                      // 배당대기 상태 - 임시 저장 건이므로 이어서 작성하기 버튼
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          localStorage.setItem('editCaseId', caseItem.id);
                          setLocation('/intake');
                        }}
                        style={{
                          padding: "6px 12px",
                          background: "#EFF6FF",
                          border: "1px solid #008FED",
                          borderRadius: "6px",
                          fontFamily: "Pretendard",
                          fontSize: "12px",
                          fontWeight: 500,
                          color: "#008FED",
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                        data-testid={`button-continue-draft-${caseItem.id}`}
                      >
                        이어서 작성하기
                      </button>
                    ) : (
                      // 접수완료 이후 상태 - 상세보기 버튼 및 청구하기 버튼
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsReceptionEditMode(false); // 새 케이스 열 때 수정모드 리셋
                            setSelectedCaseId(caseItem.id);
                          }}
                          style={{
                            padding: "6px 12px",
                            background: "#FFFFFF",
                            border: "1px solid rgba(12, 12, 12, 0.2)",
                            borderRadius: "6px",
                            fontFamily: "Pretendard",
                            fontSize: "12px",
                            fontWeight: 500,
                            color: "rgba(12, 12, 12, 0.7)",
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                          }}
                          data-testid={`button-detail-${caseItem.id}`}
                        >
                          자세히 보기
                        </button>
                        {canShowClaimButton(caseItem, cases) && user?.role !== "협력사" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setInvoiceCaseId(caseItem.id);
                              // 통합 인보이스 다이얼로그 표시 (혼합 복구타입 지원)
                              setShowInvoiceDialog(true);
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
                            data-testid={`button-claim-${caseItem.id}`}
                          >
                            청구하기
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          </div>
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
              <div style={{ display: "flex", gap: "8px" }}>
                {/* 접수완료 이후 상태에서만 접수건 상세보기 버튼 표시 */}
                {(() => {
                  const currentCase = cases?.find(c => c.id === selectedCaseId);
                  const status = currentCase?.status || "";
                  const isAfterReceptionComplete = status !== "배당대기";
                  return isAfterReceptionComplete ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsReceptionEditMode(false); // 수정모드 리셋
                        setShowReceptionDetailDialog(true);
                      }}
                      data-testid="button-reception-detail"
                    >
                      접수건 상세보기
                    </Button>
                  ) : null;
                })()}
              </div>
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
                        {/* 진행상태 섹션 */}
                        <div style={{ 
                          background: "rgba(12, 12, 12, 0.02)",
                          borderRadius: "8px",
                          padding: "16px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "0px",
                        }}>
                          {/* 진행상태 */}
                          <div style={{
                            display: "flex",
                            flexDirection: "row",
                            alignItems: "center",
                            padding: "10px 0px",
                            gap: "16px",
                          }}>
                            <div style={{
                              width: "100px",
                              fontFamily: "Pretendard",
                              fontWeight: 500,
                              fontSize: "14px",
                              color: "rgba(12, 12, 12, 0.6)",
                            }}>
                              진행상태
                            </div>
                            <div style={{
                              padding: "6px 16px",
                              background: "#008FED",
                              borderRadius: "4px",
                              fontFamily: "Pretendard",
                              fontWeight: 500,
                              fontSize: "14px",
                              color: "#FFFFFF",
                            }}>
                              {selectedCase.status || "접수완료"}
                            </div>
                          </div>

                          {/* 당사 담당자 */}
                          <div style={{
                            display: "flex",
                            flexDirection: "row",
                            alignItems: "center",
                            padding: "10px 0px",
                            gap: "16px",
                          }}>
                            <div style={{
                              width: "100px",
                              fontFamily: "Pretendard",
                              fontWeight: 500,
                              fontSize: "14px",
                              color: "rgba(12, 12, 12, 0.6)",
                            }}>
                              당사 담당자
                            </div>
                            <div style={{
                              fontFamily: "Pretendard",
                              fontWeight: 400,
                              fontSize: "14px",
                              color: "rgba(12, 12, 12, 0.9)",
                            }}>
                              {selectedCase.managerName || "-"}
                            </div>
                          </div>

                          {/* 관리사 */}
                          <div style={{
                            display: "flex",
                            flexDirection: "row",
                            alignItems: "center",
                            padding: "10px 0px",
                            gap: "16px",
                          }}>
                            <div style={{
                              width: "100px",
                              fontFamily: "Pretendard",
                              fontWeight: 500,
                              fontSize: "14px",
                              color: "rgba(12, 12, 12, 0.6)",
                            }}>
                              관리사
                            </div>
                            <div style={{
                              fontFamily: "Pretendard",
                              fontWeight: 400,
                              fontSize: "14px",
                              color: "rgba(12, 12, 12, 0.9)",
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
                          }}>
                            <div style={{
                              width: "100px",
                              fontFamily: "Pretendard",
                              fontWeight: 500,
                              fontSize: "14px",
                              color: "rgba(12, 12, 12, 0.6)",
                            }}>
                              경과일수
                            </div>
                            <div style={{
                              fontFamily: "Pretendard",
                              fontWeight: 400,
                              fontSize: "14px",
                              color: "rgba(12, 12, 12, 0.9)",
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
                          }}>
                            <div style={{
                              width: "100px",
                              fontFamily: "Pretendard",
                              fontWeight: 500,
                              fontSize: "14px",
                              color: "rgba(12, 12, 12, 0.6)",
                            }}>
                              견적금액
                            </div>
                            <div style={{
                              fontFamily: "Pretendard",
                              fontWeight: 400,
                              fontSize: "14px",
                              color: "rgba(12, 12, 12, 0.9)",
                            }}>
                              {selectedCase.initialEstimateAmount ? `₩${parseInt(selectedCase.initialEstimateAmount).toLocaleString()}` : "-"}
                            </div>
                          </div>

                          {/* 승인금액 */}
                          <div style={{
                            display: "flex",
                            flexDirection: "row",
                            alignItems: "center",
                            padding: "10px 0px",
                            gap: "16px",
                          }}>
                            <div style={{
                              width: "100px",
                              fontFamily: "Pretendard",
                              fontWeight: 500,
                              fontSize: "14px",
                              color: "rgba(12, 12, 12, 0.6)",
                            }}>
                              승인금액
                            </div>
                            <div style={{
                              fontFamily: "Pretendard",
                              fontWeight: 400,
                              fontSize: "14px",
                              color: "rgba(12, 12, 12, 0.9)",
                            }}>
                              {selectedCase.approvedAmount ? `₩${parseInt(selectedCase.approvedAmount).toLocaleString()}` : "-"}
                            </div>
                          </div>
                        </div>

                        {/* 구분선 */}
                        <div style={{
                          width: "100%",
                          height: "1px",
                          background: "rgba(12, 12, 12, 0.1)",
                          margin: "8px 0",
                        }}></div>

                        {/* 증권/분쟁 섹션 */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "0px" }}>
                          {/* 증권번호 */}
                          <div style={{
                            display: "flex",
                            flexDirection: "row",
                            alignItems: "center",
                            padding: "10px 0px",
                            gap: "16px",
                          }}>
                            <div style={{
                              width: "100px",
                              fontFamily: "Pretendard",
                              fontWeight: 500,
                              fontSize: "14px",
                              color: "rgba(12, 12, 12, 0.6)",
                            }}>
                              증권번호
                            </div>
                            <div style={{
                              fontFamily: "Pretendard",
                              fontWeight: 400,
                              fontSize: "14px",
                              color: "rgba(12, 12, 12, 0.9)",
                            }}>
                              {selectedCase.insurancePolicyNo || "-"}
                            </div>
                          </div>

                          {/* 기감금액 */}
                          <div style={{
                            display: "flex",
                            flexDirection: "row",
                            alignItems: "center",
                            padding: "10px 0px",
                            gap: "16px",
                          }}>
                            <div style={{
                              width: "100px",
                              fontFamily: "Pretendard",
                              fontWeight: 500,
                              fontSize: "14px",
                              color: "rgba(12, 12, 12, 0.6)",
                            }}>
                              기감금액
                            </div>
                            <div style={{
                              fontFamily: "Pretendard",
                              fontWeight: 400,
                              fontSize: "14px",
                              color: "rgba(12, 12, 12, 0.9)",
                            }}>
                              -
                            </div>
                          </div>

                          {/* Ded */}
                          <div style={{
                            display: "flex",
                            flexDirection: "row",
                            alignItems: "center",
                            padding: "10px 0px",
                            gap: "16px",
                          }}>
                            <div style={{
                              width: "100px",
                              fontFamily: "Pretendard",
                              fontWeight: 500,
                              fontSize: "14px",
                              color: "rgba(12, 12, 12, 0.6)",
                            }}>
                              Ded
                            </div>
                            <div style={{
                              fontFamily: "Pretendard",
                              fontWeight: 400,
                              fontSize: "14px",
                              color: "rgba(12, 12, 12, 0.9)",
                            }}>
                              -
                            </div>
                          </div>
                        </div>

                        {/* 구분선 */}
                        <div style={{
                          width: "100%",
                          height: "1px",
                          background: "rgba(12, 12, 12, 0.1)",
                          margin: "8px 0",
                        }}></div>

                        {/* 심사 정보 섹션 */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "0px" }}>
                          {/* 심사사 */}
                          <div style={{
                            display: "flex",
                            flexDirection: "row",
                            alignItems: "center",
                            padding: "10px 0px",
                            gap: "16px",
                          }}>
                            <div style={{
                              width: "100px",
                              fontFamily: "Pretendard",
                              fontWeight: 500,
                              fontSize: "14px",
                              color: "rgba(12, 12, 12, 0.6)",
                            }}>
                              심사사
                            </div>
                            <div style={{
                              fontFamily: "Pretendard",
                              fontWeight: 400,
                              fontSize: "14px",
                              color: "rgba(12, 12, 12, 0.9)",
                            }}>
                              {selectedCase.insuranceCompany || "-"}
                            </div>
                          </div>

                          {/* 심사 담당자 */}
                          <div style={{
                            display: "flex",
                            flexDirection: "row",
                            alignItems: "center",
                            padding: "10px 0px",
                            gap: "16px",
                          }}>
                            <div style={{
                              width: "100px",
                              fontFamily: "Pretendard",
                              fontWeight: 500,
                              fontSize: "14px",
                              color: "rgba(12, 12, 12, 0.6)",
                            }}>
                              심사 담당자
                            </div>
                            <div style={{
                              fontFamily: "Pretendard",
                              fontWeight: 400,
                              fontSize: "14px",
                              color: "rgba(12, 12, 12, 0.9)",
                            }}>
                              {selectedCase.assessorDepartment && selectedCase.assessorTeam 
                                ? `${selectedCase.assessorDepartment} ${selectedCase.assessorTeam}`
                                : selectedCase.assessorId || "-"}
                            </div>
                          </div>
                        </div>

                        {/* 보고서 열람 버튼 - 항상 표시 */}
                        <button
                          onClick={() => {
                            // localStorage에 케이스 ID 저장하고 현장출동보고서 페이지로 이동
                            localStorage.setItem('selectedFieldSurveyCaseId', selectedCase.id);
                            localStorage.setItem('returnToComprehensiveProgress', 'true');
                            setLocation('/field-survey/report');
                          }}
                          style={{
                            width: "100%",
                            padding: "14px",
                            background: "#008FED",
                            borderRadius: "8px",
                            border: "none",
                            fontFamily: "Pretendard",
                            fontWeight: 600,
                            fontSize: "16px",
                            color: "#FFFFFF",
                            cursor: "pointer",
                            marginTop: "16px",
                          }}
                          data-testid="button-view-report"
                        >
                          보고서 열람
                        </button>
                      </>
                    )}

              {/* 일자 탭 */}
              {detailTab === "일자" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {[
                    { label: "접수일", value: selectedCase?.receptionDate },
                    { label: "배당일", value: selectedCase?.assignmentDate },
                    { label: "현장방문일", value: selectedCase?.visitDate },
                    { label: "현장자료 제출일", value: selectedCase?.siteInvestigationSubmitDate },
                    { label: "1차 승인일(내부)", value: selectedCase?.firstApprovalDate },
                    { label: "2차 승인일(복구 요청일)", value: selectedCase?.secondApprovalDate },
                    { label: "복구완료일", value: selectedCase?.constructionCompletionDate },
                    { label: "청구일", value: selectedCase?.claimDate },
                    { label: "입금완료일", value: selectedCase?.paymentCompletedDate },
                    { label: "일부입금일", value: selectedCase?.partialPaymentDate },
                    { label: "정산완료일", value: selectedCase?.settlementCompletedDate },
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
                        {formatDate(item.value)}
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

      {/* 삭제 확인 Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>접수건 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 접수건을 삭제하시겠습니까? 삭제된 데이터는 복구할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedCaseId) {
                  deleteCaseMutation.mutate(selectedCaseId);
                }
              }}
              disabled={deleteCaseMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteCaseMutation.isPending ? "삭제 중..." : "확인"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 대량 삭제 확인 Dialog */}
      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>선택된 접수건 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              선택한 {selectedCaseIds.length}건의 접수건을 삭제하시겠습니까? 삭제된 데이터는 복구할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-bulk-delete">취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                bulkDeleteMutation.mutate(selectedCaseIds);
              }}
              disabled={bulkDeleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-bulk-delete"
            >
              {bulkDeleteMutation.isPending ? "삭제 중..." : "확인"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                  {formatCaseNumber(selectedCase?.caseNumber) || "-"}
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

      {/* 접수건 상세보기 Dialog - IntakePage 재사용 */}
      <Dialog 
        open={showReceptionDetailDialog} 
        onOpenChange={(open) => {
          setShowReceptionDetailDialog(open);
          if (!open) {
            setIsReceptionEditMode(false); // 닫을 때 수정 모드 리셋
          }
        }}
        modal={true}
      >
        <DialogContent 
          style={{
            maxWidth: "95vw",
            width: "1700px",
            maxHeight: "90vh",
            overflow: "hidden",
            padding: 0,
            background: "#F5F7FA",
            border: "none",
            borderRadius: "16px",
            display: "flex",
            flexDirection: "column",
            zIndex: 100,
          }}
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          data-testid="dialog-reception-detail"
        >
          {/* 수정 버튼 - 다이얼로그 상단 우측 */}
          <div style={{ 
            position: "absolute", 
            top: "16px", 
            right: "56px", 
            zIndex: 10,
            display: "flex",
            gap: "8px",
          }}>
            {!isReceptionEditMode ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsReceptionEditMode(true)}
                style={{
                  fontFamily: "Pretendard",
                  fontWeight: 500,
                }}
                data-testid="button-enable-edit-mode"
              >
                수정
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsReceptionEditMode(false)}
                style={{
                  fontFamily: "Pretendard",
                  fontWeight: 500,
                  color: "rgba(12, 12, 12, 0.5)",
                }}
                data-testid="button-cancel-edit-mode"
              >
                수정 취소
              </Button>
            )}
          </div>
          {selectedCaseId && (
            <div style={{ 
              flex: 1, 
              overflow: "auto", 
              maxHeight: "calc(90vh - 60px)",
            }}>
              <IntakePage 
                isModal={true}
                initialCaseId={selectedCaseId}
                readOnly={!isReceptionEditMode}
                onClose={() => {
                  setShowReceptionDetailDialog(false);
                  setIsReceptionEditMode(false);
                }}
                onSuccess={() => {
                  setShowReceptionDetailDialog(false);
                  setIsReceptionEditMode(false);
                  queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
                }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>


      {/* INVOICE 다이얼로그 - 직접복구 케이스용 (손해방지비용 + 대물복구비용) */}
      <InvoiceSheet
        open={showInvoiceDialog}
        onOpenChange={setShowInvoiceDialog}
        caseData={cases?.find(c => c.id === invoiceCaseId) || null}
        relatedCases={(() => {
          const invoiceCase = cases?.find(c => c.id === invoiceCaseId);
          const invoiceCasePrefix = getCaseNumberPrefix(invoiceCase?.caseNumber);
          return invoiceCasePrefix 
            ? cases?.filter(c => getCaseNumberPrefix(c.caseNumber) === invoiceCasePrefix) || []
            : invoiceCase ? [invoiceCase] : [];
        })()}
      />

      {/* 현장출동비용 청구 다이얼로그 - 선견적요청 케이스용 (현장출동비용만) */}
      <FieldDispatchCostSheet
        open={showFieldDispatchInvoiceDialog}
        onOpenChange={setShowFieldDispatchInvoiceDialog}
        caseData={cases?.find(c => c.id === invoiceCaseId) || null}
        relatedCases={(() => {
          const invoiceCase = cases?.find(c => c.id === invoiceCaseId);
          const invoiceCasePrefix = getCaseNumberPrefix(invoiceCase?.caseNumber);
          return invoiceCasePrefix 
            ? cases?.filter(c => getCaseNumberPrefix(c.caseNumber) === invoiceCasePrefix) || []
            : invoiceCase ? [invoiceCase] : [];
        })()}
      />

      {/* SMS 알림 발송 다이얼로그 - 추가 정보 입력이 필요한 상태에서만 사용 (접수취소, 결정금액/수수료) */}
      {smsCaseData && (
        <SmsNotificationDialog
          open={smsDialogOpen}
          onOpenChange={setSmsDialogOpen}
          caseData={smsCaseData as unknown as SchemaCase}
          stage={smsStage}
          onSuccess={() => {
            setSmsDialogOpen(false);
            setSmsCaseData(null);
          }}
        />
      )}

    </div>
  );
}
