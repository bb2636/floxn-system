import { useState, useEffect, useMemo, useRef, useLayoutEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { User, Case } from "@shared/schema";
import { ChevronDown, ChevronRight, ChevronUp, Calendar as CalendarIcon, Clock, X, Plus, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatCaseNumber } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { SmsNotificationDialog } from "@/components/sms-notification-dialog";

// Helper function to normalize boolean values from string/boolean storage
const normalizeBoolean = (value: any): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return false;
};

// SectionCard: intake.tsx 스타일의 Collapsible 카드 (컴포넌트 외부 정의로 리렌더링 시 재생성 방지)
const SectionCard = ({
  title,
  isOpen,
  onToggle,
  children,
  disabled = false,
}: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) => (
  <div
    style={{
      background: 'transparent',
      borderRadius: '12px',
      marginBottom: '20px',
    }}
  >
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      {/* 헤더 */}
      <div
        style={{
          padding: '24px',
          height: '82px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <h3
          style={{
            fontFamily: "Pretendard",
            fontSize: "20px",
            fontWeight: 600,
            letterSpacing: "-0.02em",
            color: "#0C0C0C",
          }}
        >
          {title}
        </h3>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-1 px-3 py-2 rounded hover-elevate active-elevate-2"
            disabled={disabled}
            data-testid={`button-toggle-${title}`}
          >
            {isOpen ? (
              <ChevronUp className="w-5 h-5" style={{ color: "rgba(12, 12, 12, 0.6)" }} />
            ) : (
              <ChevronDown className="w-5 h-5" style={{ color: "rgba(12, 12, 12, 0.6)" }} />
            )}
          </button>
        </CollapsibleTrigger>
      </div>

      {/* 콘텐츠 */}
      <CollapsibleContent>
        <div style={{ padding: '0 24px 24px 24px' }}>
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  </div>
);

export default function FieldManagement() {
  const { toast } = useToast();
  const [selectedCase, setSelectedCase] = useState<string>(() => {
    // Load from localStorage on mount
    return localStorage.getItem('selectedFieldSurveyCaseId') || "";
  });
  
  // Collapsible states - intake.tsx 스타일
  const [scheduleOpen, setScheduleOpen] = useState(true);
  const [basicInfoOpen, setBasicInfoOpen] = useState(true);
  const [damageInfoOpen, setDamageInfoOpen] = useState(true);
  const [insuranceInfoOpen, setInsuranceInfoOpen] = useState(true);
  const [insuredInfoOpen, setInsuredInfoOpen] = useState(true);
  const [recoveryMethodOpen, setRecoveryMethodOpen] = useState(true);
  

  const [accidentDate, setAccidentDate] = useState<Date | undefined>(undefined);
  const [accidentTime, setAccidentTime] = useState("");
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  
  // 현장조사 정보 관련 상태
  const [visitDate, setVisitDate] = useState<Date | undefined>(undefined);
  const [visitTime, setVisitTime] = useState("");
  const [visitDatePickerOpen, setVisitDatePickerOpen] = useState(false);
  const [dispatchLocation, setDispatchLocation] = useState("");
  const [accompaniedPerson, setAccompaniedPerson] = useState("");
  const [accidentCategory, setAccidentCategory] = useState("");
  const [accidentCause, setAccidentCause] = useState("");
  const [specialNotes, setSpecialNotes] = useState("");
  const [victimName, setVictimName] = useState("");
  const [victimContact, setVictimContact] = useState("");
  const [victimAddress, setVictimAddress] = useState("");
  const [additionalVictims, setAdditionalVictims] = useState<Array<{name: string, phone: string, address: string}>>([]);
  const [voc, setVoc] = useState("");
  
  // 새 피해자 입력용 state
  const [newVictimName, setNewVictimName] = useState("");
  const [newVictimContact, setNewVictimContact] = useState("");
  const [newVictimAddress, setNewVictimAddress] = useState("");
  const [newVictimAddressDetail, setNewVictimAddressDetail] = useState("");
  const [sameAsInsured, setSameAsInsured] = useState(false);
  
  // 피해 복구 방식 및 차액 유형 관련 상태
  const [processingTypes, setProcessingTypes] = useState<Set<string>>(new Set());
  const [processingTypeOther, setProcessingTypeOther] = useState("");
  const [recoveryMethodType, setRecoveryMethodType] = useState("부분수리");

  // SMS 알림 다이얼로그 상태
  const [smsDialogOpen, setSmsDialogOpen] = useState(false);

  // 입력 중 상태 추적 (데이터 자동 리로드 방지)
  // ref 사용: state 변경 시 re-render 방지 (포커스 유지)
  const isUserTypingRef = useRef(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Refs for preventing scroll on focus
  const caseSelectTriggerRef = useRef<HTMLButtonElement>(null);
  const accidentDateTriggerRef = useRef<HTMLButtonElement>(null);
  const visitDateTriggerRef = useRef<HTMLButtonElement>(null);
  
  // Ref to track the last loaded case ID - prevents unnecessary reloads
  const lastLoadedCaseIdRef = useRef<string | null>(null);

  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  // 접수건 목록 가져오기
  const { data: allCases, isLoading: casesLoading } = useQuery<Case[]>({
    queryKey: ["/api/cases"],
    refetchOnWindowFocus: false, // 윈도우 포커스 시 refetch 방지
    refetchOnMount: false, // 마운트 시 refetch 방지
    staleTime: 5 * 60 * 1000, // 5분간 fresh 상태 유지
  });

  // 백엔드 데이터에서 각 단계 완료 상태 확인
  // 도면 데이터 조회
  const { data: drawingData, isLoading: isLoadingDrawing } = useQuery({
    queryKey: ["/api/drawings", "case", selectedCase],
    enabled: !!selectedCase,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: 5 * 60 * 1000,
  });

  // 문서 데이터 조회
  const { data: documentsData, isLoading: isLoadingDocuments } = useQuery({
    queryKey: ["/api/documents/case", selectedCase],
    enabled: !!selectedCase,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: 5 * 60 * 1000,
  });

  // 견적 데이터 조회
  const { data: estimateData, isLoading: isLoadingEstimate } = useQuery({
    queryKey: ["/api/estimates", selectedCase, "latest"],
    enabled: !!selectedCase,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: 5 * 60 * 1000,
  });

  if (!user) {
    return null;
  }

  // 협력사만 입력 가능, 단 검토중 상태에서는 협력사도 수정 불가
  const isPartner = user.role === "협력사";
  const isAdmin = user.role === "관리자";

  // 협력사는 자신에게 배당된 케이스만, 관리자는 모든 케이스 표시
  // useMemo로 감싸서 불필요한 재계산 방지
  const availableCases = useMemo(() => {
    return isPartner 
      ? allCases?.filter(c => c.assignedPartner === user.company) || []
      : allCases || [];
  }, [isPartner, allCases, user.company]);

  // 선택한 케이스 데이터 가져오기
  const selectedCaseData = useMemo(() => {
    if (!selectedCase || !availableCases) return null;
    return availableCases.find(c => c.id === selectedCase) || null;
  }, [selectedCase, availableCases]);

  // 같은 사고번호를 가진 케이스들 (추가 피해자 표시용)
  const relatedCases = useMemo(() => {
    if (!selectedCaseData?.insuranceAccidentNo || !availableCases) return [];
    return availableCases
      .filter(c => c.insuranceAccidentNo === selectedCaseData.insuranceAccidentNo)
      .sort((a, b) => (a.caseNumber || "").localeCompare(b.caseNumber || ""));
  }, [selectedCaseData, availableCases]);

  // 케이스 데이터 로드 시 누락된 정보 콘솔 로그
  useEffect(() => {
    if (!selectedCaseData) return;
    
    console.log("=== 현장조사 케이스 데이터 체크 ===");
    console.log("접수번호:", selectedCaseData.caseNumber);
    
    const missingFields: string[] = [];
    
    // 기본정보 체크
    if (!selectedCaseData.assignedPartner) missingFields.push("접수사 (협력사)");
    if (!selectedCaseData.assignedPartnerManager) missingFields.push("협력사 담당자명");
    if (!selectedCaseData.assignedPartnerContact) missingFields.push("협력사 담당자 연락처");
    if (!(selectedCaseData as any).managerName) missingFields.push("당사 담당자명");
    
    // 접수정보 체크
    if (!selectedCaseData.insuranceCompany) missingFields.push("보험사");
    if (!selectedCaseData.insurancePolicyNo) missingFields.push("증권번호");
    if (!selectedCaseData.insuranceAccidentNo) missingFields.push("사고접수번호");
    
    // 보험계약자/피보험자 정보 체크
    if (!selectedCaseData.policyHolderName) missingFields.push("보험계약자");
    if (!selectedCaseData.insuredName) missingFields.push("피보험자");
    if (!selectedCaseData.insuredContact) missingFields.push("피보험자 연락처");
    
    // 피해자 정보 체크
    if (!selectedCaseData.victimName) missingFields.push("피해자 성명");
    if (!selectedCaseData.victimContact) missingFields.push("피해자 연락처");
    
    if (missingFields.length > 0) {
      console.warn("⚠️ 누락된 정보:", missingFields.join(", "));
    } else {
      console.log("✅ 모든 기본 정보가 입력되어 있습니다.");
    }
    
    console.log("================================");
  }, [selectedCaseData?.id]);

  // 협력사 또는 관리자만 입력 가능
  // 협력사: 현장출동보고서 제출 후(fieldSurveyStatus === "submitted") 또는 1차승인 후 수정 불가
  // 단, 관리자가 "반려" 상태로 변경하면 협력사도 수정 가능
  // 관리자: 항상 수정 가능
  const canEdit = isPartner || isAdmin;
  const isSubmitted = selectedCaseData?.fieldSurveyStatus === "submitted";
  const isRejected = selectedCaseData?.progressStatus === "반려";
  const isFirstApproved = selectedCaseData?.status === "1차승인";
  const isReadOnly = !canEdit || (isPartner && (isFirstApproved || isSubmitted) && !isRejected);

  // 각 섹션 완료 상태 체크
  // 현장입력 완료: 필수 필드 입력 완료 (로컬 state 또는 저장된 데이터 확인)
  const isFieldInputComplete = useMemo(() => {
    // 로컬 state 우선, 없으면 저장된 케이스 데이터 확인
    // 카테고리는 반드시 로컬에서 선택해야 함 (필수 필드)
    const hasVisitDate = visitDate || selectedCaseData?.visitDate;
    const hasVisitTime = visitTime || selectedCaseData?.visitTime;
    const hasAccidentCategory = !!accidentCategory; // 로컬 상태만 확인 (필수)
    const hasVictimName = victimName || selectedCaseData?.victimName;
    
    return !!(hasVisitDate && hasVisitTime && hasAccidentCategory && hasVictimName);
  }, [visitDate, visitTime, accidentCategory, victimName, selectedCaseData?.visitDate, selectedCaseData?.visitTime, selectedCaseData?.victimName]);

  // 도면 완료: 도면이 저장되어 있으면 완료 (도면 객체에 id가 있으면 저장된 것으로 판단)
  const isDrawingComplete = useMemo(() => {
    return !isLoadingDrawing && !!drawingData && typeof drawingData === 'object' && 'id' in drawingData;
  }, [drawingData, isLoadingDrawing]);

  // 문서 완료: 파일이 1개 이상 업로드되어 있으면 완료
  const isDocumentsComplete = useMemo(() => {
    return !isLoadingDocuments && Array.isArray(documentsData) && documentsData.length > 0;
  }, [documentsData, isLoadingDocuments]);

  // 견적 완료: 견적이 저장되어 있으면 완료 (견적 객체에 id가 있으면 저장된 것으로 판단)
  const isEstimateComplete = useMemo(() => {
    return !isLoadingEstimate && !!estimateData && typeof estimateData === 'object' && 'id' in estimateData;
  }, [estimateData, isLoadingEstimate]);

  // 현장입력 필수 필드만 채워지면 제출 가능 (도면, 증빙자료, 견적서는 선택)
  const canSubmit = isFieldInputComplete;

  // 케이스 선택 관리: 첫 번째 케이스 자동 선택 & 현재 선택된 케이스가 목록에 없으면 초기화
  // 케이스 ID 목록만 추적하여 불필요한 재실행 방지
  const availableCaseIds = useMemo(() => {
    return availableCases.map(c => c.id).join(',');
  }, [availableCases]);

  useEffect(() => {
    if (availableCases.length === 0) {
      // 케이스가 없으면 선택 해제
      if (selectedCase) {
        setSelectedCase("");
        localStorage.removeItem('selectedFieldSurveyCaseId');
      }
      return;
    }

    // 현재 선택된 케이스가 목록에 없으면 (재배당되거나 삭제됨)
    const isCurrentCaseAvailable = selectedCase && availableCases.some(c => c.id === selectedCase);
    
    if (!isCurrentCaseAvailable) {
      // 첫 번째 케이스로 자동 선택
      const newCaseId = availableCases[0].id;
      setSelectedCase(newCaseId);
      localStorage.setItem('selectedFieldSurveyCaseId', newCaseId);
    }
  }, [availableCaseIds, selectedCase]); // availableCases 대신 availableCaseIds 사용

  // 케이스 선택 변경 시 localStorage에 저장
  const handleCaseChange = (caseId: string) => {
    setSelectedCase(caseId);
    localStorage.setItem('selectedFieldSurveyCaseId', caseId);
  };

  // 관리자가 "현장정보 입력" 상태의 케이스를 열면 "검토중"으로 자동 변경
  // selectedCase ID만 감시하여 불필요한 재실행 방지
  const [autoReviewUpdated, setAutoReviewUpdated] = useState<Set<string>>(new Set());
  
  useEffect(() => {
    const autoUpdateToReview = async () => {
      if (!selectedCaseData || !isAdmin || !selectedCase) return;
      
      // 이미 업데이트한 케이스면 스킵
      if (autoReviewUpdated.has(selectedCase)) return;
      
      // 상태가 "현장정보 입력"일 때만 "검토중"으로 변경
      if (selectedCaseData.status === "현장정보 입력") {
        try {
          await apiRequest("PATCH", `/api/cases/${selectedCaseData.id}/field-survey`, {
            status: "검토중",
          });
          
          // 이 케이스를 업데이트 완료로 기록
          setAutoReviewUpdated(prev => {
            const updated = new Set(Array.from(prev));
            updated.add(selectedCase);
            return updated;
          });
          
          // 케이스 목록 새로고침
          queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
        } catch (error) {
          console.error("상태 자동 변경 실패:", error);
        }
      }
    };

    autoUpdateToReview();
  }, [selectedCase, isAdmin]); // selectedCase ID만 감시

  // 방문일시 선택 시 자동으로 '현장방문' 상태로 변경
  const [visitStatusUpdated, setVisitStatusUpdated] = useState<Set<string>>(new Set());
  
  useEffect(() => {
    const autoUpdateToVisit = async () => {
      if (!selectedCaseData || !selectedCase) return;
      
      // 읽기 전용이면 상태 변경 안 함
      if (isReadOnly) return;
      
      // 이미 업데이트한 케이스면 스킵
      if (visitStatusUpdated.has(selectedCase)) return;
      
      // 방문일시가 모두 입력되었을 때만 상태 변경
      if (!visitDate || !visitTime) return;
      
      // 상태가 "협력사 배정" 또는 아직 현장방문 전인 경우에만 변경
      const eligibleStatuses = ["협력사 배정", "접수완료", "배당완료"];
      if (!eligibleStatuses.includes(selectedCaseData.status || "")) return;
      
      try {
        console.log(`[Auto Status] 방문일시 입력됨 - 상태를 '현장방문'으로 변경: ${selectedCaseData.caseNumber}`);
        await apiRequest("PATCH", `/api/cases/${selectedCaseData.id}/field-survey`, {
          status: "현장방문",
          visitDate: format(visitDate, "yyyy-MM-dd"),
          visitTime: visitTime,
        });
        
        // 이 케이스를 업데이트 완료로 기록
        setVisitStatusUpdated(prev => {
          const updated = new Set(Array.from(prev));
          updated.add(selectedCase);
          return updated;
        });
        
        // 케이스 목록 새로고침
        queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
        
        toast({
          title: "상태 변경됨",
          description: "방문일시 입력으로 '현장방문' 상태로 변경되었습니다.",
        });
      } catch (error) {
        console.error("현장방문 상태 자동 변경 실패:", error);
      }
    };

    autoUpdateToVisit();
  }, [selectedCase, visitDate, visitTime, selectedCaseData?.status]);

  // 입력 중 상태 추적 헬퍼 (ref 사용으로 re-render 없음)
  // 데이터 자동 리로드 방지용 - 스크롤 복원은 제거됨
  const handleUserInput = () => {
    isUserTypingRef.current = true;
    
    // 타이핑 멈춘 후 2초 뒤에 상태 해제
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      isUserTypingRef.current = false;
    }, 2000);
  };

  // 선택한 케이스의 데이터를 폼에 로드 - 실제로 케이스 ID가 바뀔 때만 실행
  useEffect(() => {
    // 🛡️ 사용자가 입력 중이면 데이터 로드 안 함 (스크롤 점프 & 포커스 손실 방지)
    if (isUserTypingRef.current) {
      console.log('⏸️ 사용자 입력 중 - form reset 스킵');
      return;
    }

    // 선택된 케이스 ID가 없으면 초기화
    if (!selectedCase) {
      lastLoadedCaseIdRef.current = null;
      setAccidentDate(undefined);
      setAccidentTime("");
      setVisitDate(undefined);
      setVisitTime("");
      setDispatchLocation("");
      setAccompaniedPerson("");
      setAccidentCategory("");
      setAccidentCause("");
      setSpecialNotes("");
      setVictimName("");
      setVictimContact("");
      setVictimAddress("");
      setAdditionalVictims([]);
      setVoc("");
      setProcessingTypes(new Set());
      setProcessingTypeOther("");
      setRecoveryMethodType("부분수리");
      return;
    }

    // 이미 로드한 케이스면 스킵 (입력 중인 데이터 보호)
    if (lastLoadedCaseIdRef.current === selectedCase) {
      return;
    }

    // 데이터가 로드되지 않았으면 대기
    if (!selectedCaseData) {
      return;
    }

    // 새 케이스 로드
    lastLoadedCaseIdRef.current = selectedCase;

    // 사고 발생일시
    if (selectedCaseData.accidentDate) {
      try {
        const [datePart, timePart] = selectedCaseData.accidentDate.split(' ');
        if (datePart) {
          setAccidentDate(new Date(datePart));
        }
        if (timePart) {
          setAccidentTime(timePart);
        }
      } catch (e) {
        console.error("Error parsing accident date:", e);
      }
    } else {
      setAccidentDate(undefined);
      setAccidentTime("");
    }

    // 현장조사 정보 (방문일시)
    if (selectedCaseData.visitDate) {
      try {
        setVisitDate(new Date(selectedCaseData.visitDate));
      } catch (e) {
        console.error("Error parsing visit date:", e);
        setVisitDate(undefined);
      }
    } else {
      setVisitDate(undefined);
    }
    
    if (selectedCaseData.visitTime) {
      setVisitTime(selectedCaseData.visitTime);
    } else {
      setVisitTime("");
    }

    // 출동담당자 및 현장 정보
    setAccompaniedPerson(selectedCaseData.accompaniedPerson || "");
    setDispatchLocation(selectedCaseData.dispatchLocation || "");

    // 사고 정보
    setAccidentCategory(selectedCaseData.accidentCategory || "");
    setAccidentCause(selectedCaseData.accidentCause || "");
    setSpecialNotes(selectedCaseData.specialNotes || "");

    // 피해자 정보
    setVictimName(selectedCaseData.victimName || "");
    setVictimContact(selectedCaseData.victimContact || "");
    setVictimAddress(selectedCaseData.victimAddress || "");
    
    // 추가 피해자 목록 (JSON 파싱)
    if (selectedCaseData.additionalVictims) {
      try {
        const parsed = JSON.parse(selectedCaseData.additionalVictims);
        setAdditionalVictims(Array.isArray(parsed) ? parsed : []);
      } catch (e) {
        console.error("Error parsing additionalVictims:", e);
        setAdditionalVictims([]);
      }
    } else {
      setAdditionalVictims([]);
    }

    // VOC 정보
    setVoc(selectedCaseData.specialRequests || "");

    // 처리유형 정보 (JSON 파싱)
    if (selectedCaseData.processingTypes) {
      try {
        const parsed = JSON.parse(selectedCaseData.processingTypes);
        setProcessingTypes(new Set(Array.isArray(parsed) ? parsed : []));
      } catch (e) {
        console.error("Error parsing processingTypes:", e);
        setProcessingTypes(new Set());
      }
    } else {
      setProcessingTypes(new Set());
    }
    setProcessingTypeOther(selectedCaseData.processingTypeOther || "");
    
    // 복구방식 로드
    setRecoveryMethodType(selectedCaseData.recoveryMethodType || "부분수리");

  }, [selectedCase]); // selectedCase ID만 감지 - ref로 입력 보호

  // intake.tsx 스타일 입력 필드 클래스
  const intakeFieldClass = "h-[68px] px-5 py-2.5 bg-[#FDFDFD] border-2 border-[rgba(12,12,12,0.08)] rounded-lg";
  const intakeFieldStyle = {
    fontFamily: "Pretendard",
    fontWeight: 600,
    fontSize: "16px",
    letterSpacing: "-0.02em",
    color: "#0C0C0C",
  };
  
  // intake.tsx 스타일 버튼 클래스 (68px 높이 통일)
  const intakeButtonClass = "h-[68px] px-4 rounded transition-colors";
  const intakeButtonStyle = {
    fontFamily: "Pretendard",
    fontSize: "14px",
    fontWeight: 500,
  };

  return (
    <>
    <div className="relative p-8">
      {/* 현장입력 섹션 */}
      <SectionCard
        title="현장입력"
        isOpen={scheduleOpen}
        onToggle={() => setScheduleOpen(!scheduleOpen)}
      >
        <div>
            {/* 선택된 접수건 정보 표시 */}
            {casesLoading ? (
              <div className="text-center py-8" style={{ fontFamily: "Pretendard", color: "rgba(12, 12, 12, 0.5)" }}>
                접수건을 불러오는 중...
              </div>
            ) : !selectedCaseData ? (
              <div className="text-center py-8" style={{ fontFamily: "Pretendard", color: "rgba(12, 12, 12, 0.5)" }}>
                {isPartner ? "배당된 접수건이 없습니다." : "선택된 접수건이 없습니다."}
              </div>
            ) : (
              <div
                style={{
                  width: "788px",
                  padding: "20px 24px",
                  background: "rgba(12, 12, 12, 0.03)",
                  borderRadius: "12px",
                }}
                data-testid="selected-case-info"
              >
                <div className="flex flex-col gap-2">
                  {/* 첫 번째 줄: 파란 점 + 보험사명 + 케이스 번호 */}
                  <div className="flex items-center gap-2">
                    <span 
                      className="rounded-full"
                      style={{
                        width: "8px",
                        height: "8px",
                        background: "#008FED",
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontFamily: "Pretendard",
                        fontSize: "18px",
                        fontWeight: 600,
                        letterSpacing: "-0.02em",
                        color: "#0C0C0C",
                      }}
                    >
                      {selectedCaseData.insuranceCompany || "보험사 미지정"} {formatCaseNumber(selectedCaseData.caseNumber) || ""}
                    </span>
                  </div>
                  {/* 두 번째 줄: 접수번호, 피보험자, 담당자 */}
                  <div 
                    className="flex items-center gap-4"
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "rgba(12, 12, 12, 0.6)",
                    }}
                  >
                    <span>접수번호 {formatCaseNumber(selectedCaseData.caseNumber) || "-"}</span>
                    <span>피보험자 {selectedCaseData.policyHolderName || "-"}</span>
                    <span>담당자 {selectedCaseData.assignedPartnerManager || "-"}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </SectionCard>

        {/* 기본정보 섹션 */}
        <SectionCard
          title="기본정보"
          isOpen={basicInfoOpen}
          onToggle={() => setBasicInfoOpen(!basicInfoOpen)}
          disabled={!selectedCaseData}
        >
          <div className="space-y-5">
            {/* 접수사, 담당자명, 담당자 연락처 - 3열 */}
            <div className="grid grid-cols-3 gap-5">
              <div>
                <Label 
                  className="mb-2"
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "#686A6E",
                  }}
                >
                  접수사
                </Label>
                <Input
                  value={selectedCaseData?.assignedPartner || ""}
                  readOnly
                  placeholder="담당사명"
                  className={intakeFieldClass}
                  style={{
                    ...intakeFieldStyle,
                    background: "rgba(12, 12, 12, 0.04)",
                    color: "rgba(12, 12, 12, 0.4)",
                  }}
                  data-testid="input-intake-company"
                />
              </div>
              <div>
                <Label 
                  className="mb-2"
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "#686A6E",
                  }}
                >
                  담당자명
                </Label>
                <Input
                  value={selectedCaseData?.assignedPartnerManager || ""}
                  readOnly
                  placeholder="담당자명"
                  className={intakeFieldClass}
                  style={{
                    ...intakeFieldStyle,
                    background: "rgba(12, 12, 12, 0.04)",
                    color: "rgba(12, 12, 12, 0.4)",
                  }}
                  data-testid="input-manager-name"
                />
              </div>
              <div>
                <Label 
                  className="mb-2"
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "#686A6E",
                  }}
                >
                  담당자 연락처
                </Label>
                <Input
                  value={selectedCaseData?.assignedPartnerContact || ""}
                  readOnly
                  placeholder="담당자 연락처"
                  className={intakeFieldClass}
                  style={{
                    ...intakeFieldStyle,
                    background: "rgba(12, 12, 12, 0.04)",
                    color: "rgba(12, 12, 12, 0.4)",
                  }}
                  data-testid="input-manager-contact"
                />
              </div>
            </div>

            {/* 접수정보 소제목 */}
            <div
              style={{
                fontFamily: "Pretendard",
                fontSize: "18px",
                fontWeight: 600,
                color: "#0C0C0C",
                marginTop: "24px",
                marginBottom: "16px",
              }}
            >
              접수정보
            </div>

            {/* 접수번호, 보험사 - 2열 */}
            <div className="grid grid-cols-2 gap-5">
              <div>
                <Label 
                  className="mb-2"
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "#686A6E",
                  }}
                >
                  접수번호
                </Label>
                <Input
                  value={formatCaseNumber(selectedCaseData?.caseNumber) || ""}
                  readOnly
                  placeholder="접수번호"
                  className={intakeFieldClass}
                  style={{
                    ...intakeFieldStyle,
                    background: "rgba(12, 12, 12, 0.04)",
                    color: "rgba(12, 12, 12, 0.4)",
                  }}
                  data-testid="input-case-number"
                />
              </div>
              <div>
                <Label 
                  className="mb-2"
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "#686A6E",
                  }}
                >
                  보험사
                </Label>
                <Input
                  value={selectedCaseData?.insuranceCompany || ""}
                  readOnly
                  placeholder="보험사 선택"
                  className={intakeFieldClass}
                  style={{
                    ...intakeFieldStyle,
                    background: "rgba(12, 12, 12, 0.04)",
                    color: "rgba(12, 12, 12, 0.4)",
                  }}
                  data-testid="input-insurance-company"
                />
              </div>
            </div>

            {/* 보험계약자 및 피보험자 정보 소제목 + 체크박스 */}
            <div 
              className="flex items-center justify-between"
              style={{
                marginTop: "24px",
                marginBottom: "16px",
              }}
            >
              <div
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "18px",
                  fontWeight: 600,
                  color: "#0C0C0C",
                }}
              >
                보험계약자 및 피보험자 정보
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="same-as-policyholder"
                  checked={normalizeBoolean(selectedCaseData?.sameAsPolicyHolder)}
                  disabled
                  data-testid="checkbox-same-as-policyholder"
                />
                <label
                  htmlFor="same-as-policyholder"
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "#686A6E",
                    cursor: "not-allowed",
                  }}
                >
                  보험계약자 = 피보험자
                </label>
              </div>
            </div>

            {/* 보험계약자, 피보험자, 피보험자 연락처 - 3열 */}
            <div className="grid grid-cols-3 gap-5">
              <div>
                <Label 
                  className="mb-2"
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "#686A6E",
                  }}
                >
                  보험계약자
                </Label>
                <Input
                  value={selectedCaseData?.policyHolderName || ""}
                  readOnly
                  placeholder="보험계약자 성명"
                  className={intakeFieldClass}
                  style={{
                    ...intakeFieldStyle,
                    background: "rgba(12, 12, 12, 0.04)",
                    color: "rgba(12, 12, 12, 0.4)",
                  }}
                  data-testid="input-policyholder-name"
                />
              </div>
              <div>
                <Label 
                  className="mb-2"
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "#686A6E",
                  }}
                >
                  피보험자
                </Label>
                <Input
                  value={selectedCaseData?.insuredName || ""}
                  readOnly
                  placeholder="피보험자 성명"
                  className={intakeFieldClass}
                  style={{
                    ...intakeFieldStyle,
                    background: "rgba(12, 12, 12, 0.04)",
                    color: "rgba(12, 12, 12, 0.4)",
                  }}
                  data-testid="input-insured-name"
                />
              </div>
              <div>
                <Label 
                  className="mb-2"
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "#686A6E",
                  }}
                >
                  피보험자 연락처
                </Label>
                <Input
                  value={selectedCaseData?.insuredContact || ""}
                  readOnly
                  placeholder="피보험자 연락처"
                  className={intakeFieldClass}
                  style={{
                    ...intakeFieldStyle,
                    background: "rgba(12, 12, 12, 0.04)",
                    color: "rgba(12, 12, 12, 0.4)",
                  }}
                  data-testid="input-insured-contact"
                />
              </div>
            </div>

            {/* 피보험자 주소 - 전체 너비 */}
            <div>
              <Label 
                className="mb-2"
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "#686A6E",
                }}
              >
                피보험자 주소
              </Label>
              <Input
                value={[
                  selectedCaseData?.insuredAddress,
                  (selectedCaseData as any)?.insuredAddressDetail
                ].filter(Boolean).join(" ") || ""}
                readOnly
                placeholder="도로명 주소, 동/호수 포함"
                className={intakeFieldClass}
                style={{
                  ...intakeFieldStyle,
                  background: "rgba(12, 12, 12, 0.04)",
                  color: "rgba(12, 12, 12, 0.4)",
                }}
                data-testid="input-insured-address"
              />
            </div>

            {/* 사고 발생 일시 */}
            <div>
              <Label 
                className="mb-2"
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "#686A6E",
                }}
              >
                사고 발생일시
              </Label>
              <div className="flex gap-2">
                <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen} modal={false}>
                  <PopoverTrigger asChild>
                    <Button
                      ref={accidentDateTriggerRef}
                      type="button"
                      variant="outline"
                      className={intakeButtonClass}
                      style={{
                        ...intakeButtonStyle,
                        justifyContent: "flex-start",
                        background: "#FDFDFD",
                        border: isReadOnly ? "none" : "2px solid rgba(12,12,12,0.08)",
                        flex: 1,
                      }}
                      disabled={isReadOnly}
                      data-testid="button-accident-date"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {accidentDate ? format(accidentDate, "yyyy.MM.dd", { locale: ko }) : <span>날짜 선택</span>}
                    </Button>
                  </PopoverTrigger>
                  {/* FIX: focus() 호출 제거 - trigger 버튼 포커스 재지정 시 스크롤 위로 이동 문제 해결 */}
                  <PopoverContent 
                    className="w-auto p-0"
                    onOpenAutoFocus={(e) => {
                      e.preventDefault();
                    }}
                    onCloseAutoFocus={(e) => {
                      e.preventDefault();
                    }}
                  >
                    <Calendar
                      mode="single"
                      selected={accidentDate}
                      onSelect={(date) => {
                        setAccidentDate(date);
                        setDatePickerOpen(false);
                      }}
                    />
                  </PopoverContent>
                </Popover>
                <Input
                  type="time"
                  value={accidentTime}
                  onChange={(e) => { handleUserInput(); setAccidentTime(e.target.value); }}
                  className={intakeFieldClass}
                  style={{
                    ...intakeFieldStyle,
                    flex: 1,
                    border: isReadOnly ? "none" : undefined,
                  }}
                  disabled={isReadOnly}
                  data-testid="input-accident-time"
                />
              </div>
            </div>
          </div>
        </SectionCard>

        {/* 현장조사 정보 섹션 */}
        <SectionCard
          title="현장조사 정보"
          isOpen={true}
          onToggle={() => {}}
          disabled={!selectedCaseData}
        >
          <div className="space-y-6">
            {/* 현장정보 서브섹션 */}
            <div>
              <h3
                className="mb-4"
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "18px",
                  fontWeight: 600,
                  color: "rgba(12, 12, 12, 0.8)",
                }}
              >
                현장정보
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {/* 방문 일시 */}
                <div>
                  <Label 
                    htmlFor="visit-date"
                    className="mb-3"
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "rgba(12, 12, 12, 0.7)",
                    }}
                  >
                    방문 일시
                  </Label>
                  <div className="flex gap-2">
                    <Popover open={visitDatePickerOpen} onOpenChange={setVisitDatePickerOpen} modal={false}>
                      <PopoverTrigger asChild>
                        <Button
                          ref={visitDateTriggerRef}
                          type="button"
                          variant="outline"
                          className={intakeButtonClass}
                          style={{
                            ...intakeButtonStyle,
                            justifyContent: "flex-start",
                            background: "#FDFDFD",
                            border: "2px solid rgba(12,12,12,0.08)",
                            flex: 1,
                          }}
                          disabled={isReadOnly}
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                          data-testid="button-visit-date"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {visitDate ? format(visitDate, "yyyy.MM.dd", { locale: ko }) : <span>날짜 선택</span>}
                        </Button>
                      </PopoverTrigger>
                      {/* FIX: focus() 호출 제거 - 현장조사 정보에서 날짜 선택 시 스크롤 위치 유지 */}
                      <PopoverContent 
                        className="w-auto p-0"
                        onOpenAutoFocus={(e) => {
                          e.preventDefault();
                        }}
                        onCloseAutoFocus={(e) => {
                          e.preventDefault();
                        }}
                      >
                        <Calendar
                          mode="single"
                          selected={visitDate}
                          onSelect={(date) => {
                            setVisitDate(date);
                            setVisitDatePickerOpen(false);
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                    <Input
                      type="time"
                      value={visitTime}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleUserInput();
                        setVisitTime(e.target.value);
                      }}
                      onFocus={(e) => {
                        e.stopPropagation();
                      }}
                      className={intakeFieldClass}
                      style={{
                        ...intakeFieldStyle,
                        flex: 1,
                      }}
                      disabled={isReadOnly}
                      data-testid="input-visit-time"
                    />
                  </div>
                </div>

                {/* 출동 담당자 */}
                <div>
                  <Label 
                    htmlFor="dispatch-manager"
                    className="mb-3"
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "rgba(12, 12, 12, 0.7)",
                    }}
                  >
                    출동 담당자
                  </Label>
                  <Input
                    id="dispatch-manager"
                    value={selectedCaseData?.assignedPartnerManager || ""}
                    readOnly
                    className={intakeFieldClass}
                    style={{
                      ...intakeFieldStyle,
                      background: "rgba(12, 12, 12, 0.04)",
                      color: "rgba(12, 12, 12, 0.6)",
                    }}
                    placeholder="협력사 담당자명"
                    data-testid="input-dispatch-manager"
                  />
                </div>
              </div>
            </div>

            {/* 사고 원인(누수소견서) 서브섹션 */}
            <div>
              <h3
                className="mb-4"
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "20px",
                  fontWeight: 600,
                  color: "rgba(12, 12, 12, 0.8)",
                  letterSpacing: "-0.02em",
                }}
              >
                사고 원인(누수소견서)
              </h3>
              <div className="space-y-4">
                {/* 카테고리 */}
                <div>
                  <Label 
                    className="mb-2"
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "#686A6E",
                    }}
                  >
                    카테고리 <span style={{ color: "#FF4D4F" }}>*</span>
                  </Label>
                  <div className="flex gap-2">
                    {["배관", "코킹", "방수", "기타"].map((category) => (
                      <button
                        key={category}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleUserInput();
                          setAccidentCategory(category);
                        }}
                        disabled={isReadOnly}
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "16px",
                          fontWeight: 600,
                          height: "52px",
                          padding: "12px 16px",
                          borderRadius: "6px",
                          border: accidentCategory === category 
                            ? "2px solid rgba(255, 255, 255, 0.04)" 
                            : "1px solid rgba(12, 12, 12, 0.3)",
                          background: accidentCategory === category 
                            ? "rgba(0, 143, 237, 0.1)" 
                            : "#FDFDFD",
                          color: accidentCategory === category 
                            ? "#008FED" 
                            : "rgba(12, 12, 12, 0.9)",
                          boxShadow: accidentCategory === category 
                            ? "inset 0px -2px 4px rgba(0, 0, 0, 0.05), inset 0px 2px 4px rgba(0, 0, 0, 0.05)" 
                            : "none",
                          backdropFilter: accidentCategory === category ? "blur(7px)" : "none",
                          cursor: isReadOnly ? "not-allowed" : "pointer",
                          opacity: isReadOnly ? 0.5 : 1,
                        }}
                        data-testid={`button-category-${category}`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 사고원인 */}
                <div>
                  <Label 
                    htmlFor="accident-cause-detail"
                    className="mb-2"
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "#686A6E",
                    }}
                  >
                    사고원인
                  </Label>
                  <textarea
                    id="accident-cause-detail"
                    value={accidentCause}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleUserInput();
                      setAccidentCause(e.target.value);
                    }}
                    onFocus={(e) => {
                      e.stopPropagation();
                    }}
                    placeholder="누수원인, 누수지점 등 기타 특이사항을 자유롭게 입력해주세요"
                    maxLength={800}
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "16px",
                      padding: "16px 20px",
                      background: "#FDFDFD",
                      border: "2px solid rgba(12,12,12,0.08)",
                      borderRadius: "8px",
                      resize: "none",
                      minHeight: "120px",
                      width: "100%",
                    }}
                    disabled={isReadOnly}
                    data-testid="textarea-accident-cause"
                  />
                  <div 
                    className="text-right mt-1"
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "12px",
                      color: "rgba(12, 12, 12, 0.5)",
                    }}
                  >
                    {accidentCause.length}/800
                  </div>
                </div>
              </div>
            </div>

            {/* 같은 사고의 케이스들 */}
            <div>
              <h3
                className="mb-4"
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "20px",
                  fontWeight: 600,
                  color: "rgba(12, 12, 12, 0.8)",
                  letterSpacing: "-0.02em",
                }}
              >
                같은 사고의 케이스들 (총 {relatedCases.length}건)
              </h3>
              
              <div className="space-y-3">
                {relatedCases.map((caseItem) => (
                  <div
                    key={caseItem.id}
                    style={{
                      background: caseItem.id === selectedCase 
                        ? "rgba(0, 143, 237, 0.08)" 
                        : "rgba(12, 12, 12, 0.04)",
                      borderRadius: "8px",
                      padding: "16px 20px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      border: caseItem.id === selectedCase 
                        ? "2px solid rgba(0, 143, 237, 0.3)" 
                        : "none",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        style={{
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          background: caseItem.id === selectedCase ? "#008FED" : "#686A6E",
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          fontWeight: 600,
                          color: "#008FED",
                          minWidth: "120px",
                        }}
                      >
                        {formatCaseNumber(caseItem.caseNumber)}
                      </span>
                      <span
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "16px",
                          fontWeight: 600,
                          color: "rgba(12, 12, 12, 0.8)",
                        }}
                      >
                        {caseItem.victimName || "-"}
                      </span>
                      <span
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "16px",
                          fontWeight: 500,
                          color: "rgba(12, 12, 12, 0.6)",
                        }}
                      >
                        {caseItem.victimContact || "-"}
                      </span>
                      <span
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "16px",
                          fontWeight: 500,
                          color: "rgba(12, 12, 12, 0.6)",
                        }}
                      >
                        {caseItem.victimAddress || "-"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* 새 피해자 추가 폼 */}
              {!isReadOnly && (
                <div className="mt-6 space-y-4">
                  <div
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "16px",
                      fontWeight: 600,
                      color: "rgba(12, 12, 12, 0.8)",
                    }}
                  >
                    피해자 추가
                  </div>
                  
                  <div className="flex items-end gap-2">
                    <div className="flex-1 space-y-2">
                      <Input
                        value={newVictimName}
                        onChange={(e) => { handleUserInput(); setNewVictimName(e.target.value); }}
                        placeholder="성함을 입력해주세요"
                        className={intakeFieldClass}
                        style={intakeFieldStyle}
                        data-testid="input-new-victim-name"
                      />
                      <Input
                        value={newVictimContact}
                        onChange={(e) => { handleUserInput(); setNewVictimContact(e.target.value); }}
                        placeholder="연락처를 입력해주세요"
                        className={intakeFieldClass}
                        style={intakeFieldStyle}
                        data-testid="input-new-victim-contact"
                      />
                      <div className="flex items-center gap-2">
                        <Input
                          value={newVictimAddress}
                          onChange={(e) => { handleUserInput(); setNewVictimAddress(e.target.value); }}
                          placeholder="주소"
                          className={intakeFieldClass}
                          style={{
                            ...intakeFieldStyle,
                            flex: 1,
                          }}
                          disabled={sameAsInsured}
                          data-testid="input-new-victim-address"
                        />
                        <Input
                          value={newVictimAddressDetail}
                          onChange={(e) => { handleUserInput(); setNewVictimAddressDetail(e.target.value); }}
                          placeholder="상세주소"
                          className={intakeFieldClass}
                          style={{
                            ...intakeFieldStyle,
                            flex: 1,
                          }}
                          disabled={sameAsInsured}
                          data-testid="input-new-victim-address-detail"
                        />
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="same-as-insured-address"
                            checked={sameAsInsured}
                            onCheckedChange={(checked) => {
                              setSameAsInsured(checked === true);
                              if (checked === true) {
                                setNewVictimAddress(selectedCaseData?.insuredAddress || "");
                                setNewVictimAddressDetail(selectedCaseData?.insuredAddressDetail || "");
                              } else {
                                setNewVictimAddress("");
                                setNewVictimAddressDetail("");
                              }
                            }}
                            data-testid="checkbox-same-as-insured"
                          />
                          <label
                            htmlFor="same-as-insured-address"
                            style={{
                              fontFamily: "Pretendard",
                              fontSize: "14px",
                              fontWeight: 500,
                              color: "#686A6E",
                              whiteSpace: "nowrap",
                              cursor: "pointer",
                            }}
                          >
                            주소지 동일
                          </label>
                        </div>
                      </div>
                    </div>
                    
                    <Button
                      type="button"
                      onClick={async () => {
                        if (newVictimName && newVictimContact && newVictimAddress && selectedCaseData) {
                          try {
                            // 원본 케이스 접수번호에서 prefix 추출 (예: "251203001-1" -> "251203001")
                            const parentCaseNumber = selectedCaseData.caseNumber || "";
                            const casePrefix = parentCaseNumber.split('-')[0];
                            
                            // 새 피해세대 케이스 생성 (spread 사용 안 함 - 필요한 필드만 명시적으로 복사)
                            const newCasePayload = {
                              // 원본 케이스 번호 prefix 전달 (서버에서 다음 suffix 계산)
                              parentCasePrefix: casePrefix,
                              
                              // 기본 정보 (복사)
                              receptionDate: selectedCaseData.receptionDate,
                              accidentDate: selectedCaseData.accidentDate,
                              
                              // 보험 정보 (복사)
                              insuranceCompany: selectedCaseData.insuranceCompany,
                              insurancePolicyNo: selectedCaseData.insurancePolicyNo,
                              insuranceAccidentNo: selectedCaseData.insuranceAccidentNo,
                              
                              // 의뢰사 정보 (복사)
                              clientResidence: selectedCaseData.clientResidence,
                              clientDepartment: selectedCaseData.clientDepartment,
                              clientName: selectedCaseData.clientName,
                              clientContact: selectedCaseData.clientContact,
                              
                              // 심사사 정보 (복사)
                              assessorId: selectedCaseData.assessorId,
                              assessorDepartment: selectedCaseData.assessorDepartment,
                              assessorTeam: selectedCaseData.assessorTeam,
                              assessorContact: selectedCaseData.assessorContact,
                              
                              // 조사사 정보 (복사)
                              investigatorTeam: selectedCaseData.investigatorTeam,
                              investigatorDepartment: selectedCaseData.investigatorDepartment,
                              investigatorTeamName: selectedCaseData.investigatorTeamName,
                              investigatorContact: selectedCaseData.investigatorContact,
                              
                              // 보험계약자 정보 (복사)
                              policyHolderName: selectedCaseData.policyHolderName,
                              policyHolderIdNumber: selectedCaseData.policyHolderIdNumber,
                              policyHolderAddress: selectedCaseData.policyHolderAddress,
                              
                              // 피보험자 정보 (복사)
                              insuredName: selectedCaseData.insuredName,
                              insuredIdNumber: selectedCaseData.insuredIdNumber,
                              insuredContact: selectedCaseData.insuredContact,
                              insuredAddress: selectedCaseData.insuredAddress,
                              insuredAddressDetail: selectedCaseData.insuredAddressDetail,
                              sameAsPolicyHolder: selectedCaseData.sameAsPolicyHolder,
                              
                              // 새 피해자 정보 (신규 입력)
                              victimName: newVictimName,
                              victimContact: newVictimContact,
                              victimAddress: newVictimAddress,
                              victimAddressDetail: newVictimAddressDetail,
                              
                              // 피해사항 정보 (빈 배열로 초기화 - 새 피해자는 자신의 피해사항 입력)
                              damageItems: "[]",
                              
                              // 처리 유형: 피해세대복구지원만 (JSON string으로 전송 - schema가 text 타입)
                              processingTypes: JSON.stringify(["피해세대복구"]),
                              victimIncidentAssistance: "true",  // schema는 text 타입 ("true" | "false" | null)
                              damagePreventionCost: "false",     // schema는 text 타입 ("true" | "false" | null)
                              
                              // 당사 담당자 정보 (복사)
                              managerId: selectedCaseData.managerId,
                              
                              // 배당 정보 (복사 - 같은 업체에 배당)
                              assignedPartner: selectedCaseData.assignedPartner,
                              assignmentDate: selectedCaseData.assignmentDate,
                              
                              // 복구 타입 (복사)
                              recoveryType: selectedCaseData.recoveryType,
                              
                              // 상태: 접수완료 (워크플로우 시작점)
                              status: "접수완료",
                              
                              // 워크플로우 필드: 모두 null/초기값 (새 케이스는 처음부터 시작)
                              progressStatus: null,
                              reviewDecision: null,
                              reviewComment: null,
                              reviewedAt: null,
                              reviewedBy: null,
                              visitDate: null,
                              visitTime: null,
                              fieldSurveyStatus: "draft",               // 현장조사 상태 (초기값: draft)
                              
                              // 현장조사 관련 필드: 모두 null (새 케이스는 입력 전 상태)
                              accompaniedPerson: null,
                              travelDistance: null,
                              dispatchLocation: null,
                              accidentTime: null,
                              accidentCategory: null,
                              processingTypeOther: null,
                              recoveryMethodType: null,
                              
                              // 기타 필드: 모두 null
                              clientPhone: null,
                              clientAddress: null,
                              accidentLocation: null,
                              accidentDescription: null,
                              accidentType: null,
                              accidentCause: null,
                              restorationMethod: null,
                              otherVendorEstimate: null,
                              
                              // 추가 피해자: 빈 배열 (JSON string)
                              additionalVictims: "[]",
                              
                              // 배당사항 추가 필드: null
                              assignedPartnerManager: null,
                              assignedPartnerContact: null,
                              urgency: null,
                              specialRequests: null,
                              
                              // 진행상황 메모: null
                              specialNotes: null,
                              specialNotesConfirmedBy: null,
                              additionalNotes: null,
                              
                              // 금액: null
                              estimateAmount: null,
                              
                              // 기타 연관 필드: null
                              assignedTo: null,
                              
                              // 날짜 필드: 모두 null (접수일/배당일 제외)
                              inspectionDate: null,
                              siteVisitDate: null,
                              fieldSurveyDate: null,
                              siteInvestigationSubmitDate: null,
                              firstInspectionDate: null,
                              firstApprovalDate: null,
                              secondApprovalDate: null,
                              firstInvoiceDate: null,
                              approvalRequestDate: null,
                              approvalDate: null,
                              approvalCompletionDate: null,
                              constructionStartDate: null,
                              constructionCompletionDate: null,
                              constructionReportSubmitDate: null,
                              totalWorkDate: null,
                              contractorReportDate: null,
                              contractorRepairDate: null,
                              completionDate: null,
                              claimDate: null,
                            };
                            
                            await apiRequest("POST", "/api/cases", newCasePayload);
                            
                            toast({
                              title: "추가 피해자 등록 완료",
                              description: `${newVictimName} 님의 케이스가 생성되었습니다.`,
                            });
                            
                            // 입력 필드 초기화
                            setNewVictimName("");
                            setNewVictimContact("");
                            setNewVictimAddress("");
                            setNewVictimAddressDetail("");
                            setSameAsInsured(false);
                            
                            // 케이스 목록 새로고침
                            queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
                          } catch (error) {
                            toast({
                              title: "케이스 생성 실패",
                              description: error instanceof Error ? error.message : "케이스 생성 중 오류가 발생했습니다.",
                              variant: "destructive",
                            });
                          }
                        }
                      }}
                      disabled={!newVictimName || !newVictimContact || !newVictimAddress || !selectedCaseData}
                      style={{
                        fontFamily: "Pretendard",
                        fontSize: "16px",
                        fontWeight: 600,
                        height: "68px",
                        width: "120px",
                        background: newVictimName && newVictimContact && newVictimAddress 
                          ? "#ECECEC" 
                          : "rgba(12, 12, 12, 0.04)",
                        color: newVictimName && newVictimContact && newVictimAddress 
                          ? "rgba(12, 12, 12, 0.8)" 
                          : "rgba(12, 12, 12, 0.3)",
                        border: "none",
                        borderRadius: "8px",
                      }}
                      data-testid="button-add-new-victim"
                    >
                      등록
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* VOC(고객의 소리) 서브섹션 */}
            <div>
              <h3
                className="mb-4"
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "20px",
                  fontWeight: 600,
                  color: "rgba(12, 12, 12, 0.8)",
                  letterSpacing: "-0.02em",
                }}
              >
                VOC(고객의 소리)
              </h3>
              <div>
                <textarea
                  id="voc"
                  value={voc}
                  onChange={(e) => { handleUserInput(); setVoc(e.target.value); }}
                  placeholder="내용을 적어주세요"
                  maxLength={800}
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "16px",
                    padding: "16px 20px",
                    background: "#FDFDFD",
                    border: "2px solid rgba(12,12,12,0.08)",
                    borderRadius: "8px",
                    resize: "none",
                    minHeight: "120px",
                    width: "100%",
                  }}
                  disabled={isReadOnly}
                  data-testid="textarea-voc"
                />
                <div 
                  className="text-right mt-1"
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "12px",
                    color: "rgba(12, 12, 12, 0.5)",
                  }}
                >
                  {voc.length}/800
                </div>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* 피해 복구 방식 및 처리 유형 섹션 */}
        <SectionCard
          title="피해 복구 방식 및 처리 유형"
          isOpen={true}
          onToggle={() => {}}
          disabled={!selectedCaseData}
        >
          <div className="space-y-6">
            {/* 처리 유형(복수선택) */}
            <div>
              <Label 
                className="mb-2"
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "#686A6E",
                }}
              >
                처리 유형(복수선택)
              </Label>
              <div className="flex gap-2">
                {["수리", "비교견적", "기타"].map((type) => (
                  <Button
                    key={type}
                    type="button"
                    onClick={() => {
                      const newTypes = new Set(processingTypes);
                      if (newTypes.has(type)) {
                        newTypes.delete(type);
                      } else {
                        newTypes.add(type);
                      }
                      setProcessingTypes(newTypes);
                    }}
                    disabled={isReadOnly}
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "16px",
                      fontWeight: 600,
                      height: "52px",
                      padding: "12px 16px",
                      borderRadius: "6px",
                      border: processingTypes.has(type)
                        ? "2px solid rgba(255, 255, 255, 0.04)" 
                        : "1px solid rgba(12, 12, 12, 0.3)",
                      background: processingTypes.has(type)
                        ? "rgba(0, 143, 237, 0.1)" 
                        : "#FDFDFD",
                      color: processingTypes.has(type)
                        ? "#008FED" 
                        : "rgba(12, 12, 12, 0.9)",
                      boxShadow: processingTypes.has(type)
                        ? "inset 0px -2px 4px rgba(0, 0, 0, 0.05), inset 0px 2px 4px rgba(0, 0, 0, 0.05)" 
                        : "none",
                      backdropFilter: processingTypes.has(type) ? "blur(7px)" : "none",
                    }}
                    data-testid={`button-processing-type-${type}`}
                  >
                    {type}
                  </Button>
                ))}
                <Input
                  value={processingTypeOther}
                  onChange={(e) => { handleUserInput(); setProcessingTypeOther(e.target.value); }}
                  placeholder="기타사항을 입력해주세요"
                  className="h-[52px] flex-1"
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "16px",
                    fontWeight: 600,
                    padding: "12px 16px",
                    background: "#FDFDFD",
                    border: "1px solid rgba(12, 12, 12, 0.3)",
                    borderRadius: "6px",
                    color: "rgba(12, 12, 12, 0.9)",
                  }}
                  disabled={isReadOnly}
                  data-testid="input-processing-type-other"
                />
              </div>
            </div>

            {/* 복구 방식 */}
            <div>
              <Label 
                className="mb-2"
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "#686A6E",
                }}
              >
                복구 방식
              </Label>
              <div className="flex gap-2">
                {["부분수리", "전체수리"].map((method) => (
                  <Button
                    key={method}
                    type="button"
                    onClick={() => setRecoveryMethodType(method)}
                    disabled={isReadOnly}
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "16px",
                      fontWeight: 600,
                      height: "52px",
                      padding: "12px 16px",
                      borderRadius: "6px",
                      border: recoveryMethodType === method
                        ? "2px solid rgba(255, 255, 255, 0.04)" 
                        : "1px solid rgba(12, 12, 12, 0.3)",
                      background: recoveryMethodType === method
                        ? "rgba(0, 143, 237, 0.1)" 
                        : "#FDFDFD",
                      color: recoveryMethodType === method
                        ? "#008FED" 
                        : "rgba(12, 12, 12, 0.9)",
                      boxShadow: recoveryMethodType === method
                        ? "inset 0px -2px 4px rgba(0, 0, 0, 0.05), inset 0px 2px 4px rgba(0, 0, 0, 0.05)" 
                        : "none",
                      backdropFilter: recoveryMethodType === method ? "blur(7px)" : "none",
                    }}
                    data-testid={`button-recovery-method-${method}`}
                  >
                    {method}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </SectionCard>

      {/* 하단 액션 버튼 영역 */}
      {selectedCaseData && (
        <div
          style={{
            maxWidth: "1400px",
            margin: "40px auto 60px",
            padding: "0 40px",
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
          }}
        >
          {/* 역할별 버튼 - 협력사 또는 관리자일 때 저장 버튼 표시 */}
          <div className="flex gap-3">
            {canEdit && (
              <>
                {/* 임시저장 버튼 */}
                <Button
                  type="button"
                  onClick={async () => {
                    // 제출 조건 상태 콘솔 로그
                    console.log("=== 제출 조건 체크 (임시저장) ===");
                    console.log("현장입력 완료:", isFieldInputComplete);
                    console.log("제출 가능:", canSubmit);
                    console.log("================================");
                    
                    if (!selectedCaseData?.id) {
                      toast({
                        title: "저장 실패",
                        description: "선택된 접수건이 없습니다.",
                        variant: "destructive",
                      });
                      return;
                    }

                    // 누락된 필드 체크 및 표시 (카테고리는 반드시 선택 필요)
                    const missingFields: string[] = [];
                    if (!visitDate) missingFields.push("방문일자");
                    if (!visitTime) missingFields.push("방문시간");
                    if (!accidentCategory) missingFields.push("카테고리");
                    if (!victimName && !selectedCaseData?.victimName) missingFields.push("피해자 성명");
                    if (!victimContact && !selectedCaseData?.victimContact) missingFields.push("피해자 연락처");
                    
                    // 콘솔에도 출력
                    if (missingFields.length > 0) {
                      console.warn("⚠️ 임시저장 - 누락된 필드:", missingFields.join(", "));
                      toast({
                        title: "일부 정보 누락",
                        description: `다음 항목이 비어있습니다: ${missingFields.join(", ")}`,
                        variant: "destructive",
                      });
                      return;
                    }

                    try {
                      // 상태 자동 변경 로직
                      let status = "현장방문"; // 기본값: 방문일시만 입력된 경우
                      
                      // 모든 필수 필드가 입력된 경우 → "현장정보 입력" (카테고리는 로컬 상태 필수)
                      const hasVictimName = victimName || selectedCaseData?.victimName;
                      if (visitDate && visitTime && accidentCategory && hasVictimName) {
                        status = "현장정보 입력";
                      }

                      const payload = {
                        visitDate: visitDate ? format(visitDate, "yyyy-MM-dd") : null,
                        visitTime,
                        dispatchLocation,
                        accompaniedPerson,
                        accidentDate: accidentDate ? `${format(accidentDate, "yyyy-MM-dd")} ${accidentTime || "00:00"}` : null,
                        accidentTime,
                        accidentCategory: accidentCategory || null,
                        accidentCause,
                        specialNotes,
                        victimName: victimName || selectedCaseData?.victimName || null,
                        victimContact: victimContact || selectedCaseData?.victimContact || null,
                        victimAddress: victimAddress || selectedCaseData?.victimAddress || null,
                        additionalVictims: JSON.stringify(additionalVictims),
                        specialRequests: voc,
                        processingTypes: JSON.stringify(Array.from(processingTypes)),
                        processingTypeOther,
                        recoveryMethodType,
                        fieldSurveyStatus: "draft",
                        status, // 자동 변경된 상태 추가
                      };

                      const data = await apiRequest("PATCH", `/api/cases/${selectedCaseData.id}/field-survey`, payload);

                      const syncedCases = (data as any)?.syncedCases || 0;
                      const syncMessage = syncedCases > 0 
                        ? ` (${syncedCases}건의 연관 케이스에도 동기화됨)`
                        : "";

                      toast({
                        title: "임시저장 완료",
                        description: `현장조사 정보가 임시저장되었습니다. (상태: ${status})${syncMessage}`,
                      });

                      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
                      queryClient.invalidateQueries({ queryKey: ["/api/field-surveys", selectedCaseData.id, "report"] });
                    } catch (error: any) {
                      console.error("임시저장 에러:", error);
                      
                      // 서버에서 반환된 오류 메시지 파싱
                      let errorMessage = "현장조사 정보 임시저장 중 오류가 발생했습니다.";
                      if (error?.message) {
                        errorMessage = error.message;
                      }
                      
                      toast({
                        title: "임시저장 실패",
                        description: errorMessage,
                        variant: "destructive",
                      });
                    }
                  }}
                  disabled={isReadOnly}
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "16px",
                    fontWeight: 600,
                    height: "52px",
                    padding: "12px 32px",
                    background: isReadOnly ? "rgba(12, 12, 12, 0.1)" : "#FFFFFF",
                    color: isReadOnly ? "rgba(12, 12, 12, 0.3)" : "rgba(12, 12, 12, 0.7)",
                    border: "1px solid rgba(12, 12, 12, 0.2)",
                    borderRadius: "8px",
                    cursor: isReadOnly ? "not-allowed" : "pointer",
                  }}
                  data-testid="button-temp-save"
                >
                  임시저장
                </Button>

                {/* 제출 버튼 - 모든 필수 필드 입력 시 활성화 */}
                <Button
                  type="button"
                  onClick={async () => {
                    // 제출 조건 상태 콘솔 로그
                    console.log("=== 제출 조건 체크 (제출) ===");
                    console.log("현장입력 완료:", isFieldInputComplete);
                    console.log("제출 가능:", canSubmit);
                    console.log("============================");
                    
                    if (!selectedCaseData?.id) {
                      toast({
                        title: "제출 실패",
                        description: "선택된 접수건이 없습니다.",
                        variant: "destructive",
                      });
                      return;
                    }

                    // 필수 필드 검증 - 현장입력 필수 필드만 체크 (카테고리는 반드시 선택 필요)
                    const missingFields: string[] = [];
                    
                    // 현장입력 필수 필드
                    if (!visitDate) missingFields.push("방문일자");
                    if (!visitTime) missingFields.push("방문시간");
                    if (!accidentCategory) missingFields.push("카테고리");
                    if (!victimName && !selectedCaseData?.victimName) missingFields.push("피해자 성명");
                    
                    if (missingFields.length > 0) {
                      toast({
                        title: "제출 불가",
                        description: `다음 항목이 누락되었습니다: ${missingFields.join(", ")}`,
                        variant: "destructive",
                      });
                      return;
                    }

                    try {
                      const payload = {
                        visitDate: visitDate ? format(visitDate, "yyyy-MM-dd") : null,
                        visitTime,
                        dispatchLocation,
                        accompaniedPerson,
                        accidentDate: accidentDate ? `${format(accidentDate, "yyyy-MM-dd")} ${accidentTime || "00:00"}` : null,
                        accidentTime,
                        accidentCategory: accidentCategory || null,
                        accidentCause,
                        specialNotes,
                        victimName: victimName || selectedCaseData?.victimName || null,
                        victimContact: victimContact || selectedCaseData?.victimContact || null,
                        victimAddress: victimAddress || selectedCaseData?.victimAddress || null,
                        additionalVictims: JSON.stringify(additionalVictims),
                        specialRequests: voc,
                        processingTypes: JSON.stringify(Array.from(processingTypes)),
                        processingTypeOther,
                        recoveryMethodType,
                        fieldSurveyStatus: "submitted",
                        status: "현장정보 입력", // 제출 시 상태 변경
                      };

                      const data = await apiRequest("PATCH", `/api/cases/${selectedCaseData.id}/field-survey`, payload);

                      const syncedCases = (data as any)?.syncedCases || 0;
                      const syncMessage = syncedCases > 0 
                        ? ` (${syncedCases}건의 연관 케이스에도 동기화됨)`
                        : "";

                      toast({
                        title: "제출 완료",
                        description: `현장조사 보고서가 제출되었습니다.${syncMessage}`,
                      });

                      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
                      queryClient.invalidateQueries({ queryKey: ["/api/field-surveys", selectedCaseData.id, "report"] });

                      // 현장정보입력 SMS 알림 다이얼로그 표시
                      setSmsDialogOpen(true);
                    } catch (error: any) {
                      console.error("제출 에러:", error);
                      
                      // 서버에서 반환된 오류 메시지 파싱
                      let errorMessage = "현장조사 보고서 제출 중 오류가 발생했습니다.";
                      if (error?.message) {
                        errorMessage = error.message;
                      }
                      
                      toast({
                        title: "제출 실패",
                        description: errorMessage,
                        variant: "destructive",
                      });
                    }
                  }}
                  disabled={!canSubmit || isReadOnly}
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "16px",
                    fontWeight: 600,
                    height: "52px",
                    padding: "12px 32px",
                    background: (canSubmit && !isReadOnly) ? "#008FED" : "rgba(12, 12, 12, 0.1)",
                    color: (canSubmit && !isReadOnly) ? "#FFFFFF" : "rgba(12, 12, 12, 0.3)",
                    border: "none",
                    borderRadius: "8px",
                    cursor: (canSubmit && !isReadOnly) ? "pointer" : "not-allowed",
                  }}
                  data-testid="button-submit"
                >
                  제출
                </Button>
              </>
            )}
          </div>
        </div>
      )}
      </div>

      {/* 현장정보입력 SMS 알림 다이얼로그 */}
      {selectedCaseData && (
        <SmsNotificationDialog
          open={smsDialogOpen}
          onOpenChange={setSmsDialogOpen}
          stage="현장정보입력"
          caseData={selectedCaseData}
        />
      )}
    </>
  );
}
