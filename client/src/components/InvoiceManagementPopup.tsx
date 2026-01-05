import { useState, useEffect, useMemo, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { usePermissions } from "@/hooks/use-permissions";

interface RelatedCase {
  id: string;
  caseNumber?: string | null;
  recoveryType?: string | null;
  estimateAmount?: number | null;
}

interface InvoiceManagementPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseData: {
    id: string;
    caseNumber?: string | null;
    insuranceCompany?: string | null;
    insuranceAccidentNo?: string | null;
    receptionDate?: string | null;
    clientName?: string | null;
    clientContact?: string | null;
    recoveryType?: string | null;
    invoiceDamagePreventionAmount?: string | null;
    invoicePropertyRepairAmount?: string | null;
    fieldDispatchInvoiceAmount?: string | null;
    status?: string | null;
    claimDate?: string | null; // 청구일 (청구 상태로 변경된 날짜)
    // 협력/현장 정보
    assignedPartner?: string | null; // 협력업체
    assignedPartnerManager?: string | null; // 담당자명
    assignedPartnerContact?: string | null; // 담당자 연락처
    accidentType?: string | null; // 사고유형
    // 세금계산서/인보이스 정보
    taxInvoiceConfirmDate?: string | null; // 세금계산서 확인 날짜
    invoiceConfirmDate?: string | null; // 인보이스 확인 날짜
    invoiceAttribute?: string | null; // 인보이스 속성
    mainInvoiceLink?: string | null; // 메인 인보이스 연동 여부
  } | null;
  estimateData?: {
    preventionEstimate: number;
    preventionApproved: number;
    propertyEstimate: number;
    propertyApproved: number;
  } | null;
  relatedCases?: RelatedCase[];
  managerName?: string;
  managerContact?: string;
  settlementCommission?: number; // 정산조회에서 가져온 수수료 값
  settlementClaimAmount?: number; // 정산조회에서 가져온 청구액
}

const FIXED_FIELD_DISPATCH_COST = 100000;

interface DepositEntry {
  id: string;
  depositDate: string;
  insuranceCompany: string;
  claimAmount: number;
  depositStatus: "입금" | "미입금";
  depositAmount: number;
  memo: string;
}

function getCaseSuffix(caseNumber: string | null | undefined): number {
  if (!caseNumber) return -1;
  const parts = caseNumber.split("-");
  if (parts.length < 2) return -1;
  const suffix = parseInt(parts[parts.length - 1], 10);
  return isNaN(suffix) ? -1 : suffix;
}

function getCaseNumberPrefix(caseNumber: string | null | undefined): string {
  if (!caseNumber) return "";
  const parts = caseNumber.split("-");
  return parts[0] || caseNumber;
}

export function InvoiceManagementPopup({ 
  open, 
  onOpenChange, 
  caseData,
  estimateData,
  relatedCases = [],
  managerName = "-",
  managerContact = "-",
  settlementCommission,
  settlementClaimAmount,
}: InvoiceManagementPopupProps) {
  const { toast } = useToast();
  const { hasItem, isAdmin } = usePermissions();
  
  // 초기 로드 상태 추적 (팝업이 열릴 때만 데이터 로드)
  const lastLoadedCaseId = useRef<string | null>(null);
  
  const [submissionDate, setSubmissionDate] = useState<Date | undefined>(undefined);
  const [acceptanceDate, setAcceptanceDate] = useState<string>("");
  const [settlementStatus, setSettlementStatus] = useState<string>("");
  
  const [preventionApprovedAmount, setPreventionApprovedAmount] = useState<string>("");
  const [propertyApprovedAmount, setPropertyApprovedAmount] = useState<string>("");
  const [deductibleAmount, setDeductibleAmount] = useState<string>("0");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [taxInvoiceDate, setTaxInvoiceDate] = useState<Date | undefined>(undefined);
  const [partnerPaymentDate, setPartnerPaymentDate] = useState<string>("");
  const [depositDate, setDepositDate] = useState<Date | undefined>(undefined);
  const [totalApprovedAmountInput, setTotalApprovedAmountInput] = useState<string>("0");
  const [showApprovalConfirm, setShowApprovalConfirm] = useState(false);
  const [depositEntries, setDepositEntries] = useState<DepositEntry[]>([]);
  const [showDepositForm, setShowDepositForm] = useState(false);
  const [editingDepositId, setEditingDepositId] = useState<string | null>(null);
  const [newDeposit, setNewDeposit] = useState<DepositEntry>({
    id: "",
    depositDate: "",
    insuranceCompany: caseData?.insuranceCompany || "전체",
    claimAmount: 0,
    depositStatus: "미입금",
    depositAmount: 0,
    memo: "",
  });
  
  // 인보이스 확인 날짜 로컬 상태 (실시간 UI 업데이트용)
  const [localInvoiceConfirmDate, setLocalInvoiceConfirmDate] = useState<string | null>(caseData?.invoiceConfirmDate || null);
  
  // caseData 변경 시 로컬 상태 동기화
  useEffect(() => {
    setLocalInvoiceConfirmDate(caseData?.invoiceConfirmDate || null);
  }, [caseData?.invoiceConfirmDate]);
  
  // 인보이스 승인 여부 확인 (로컬 상태 사용)
  const isInvoiceApproved = !!localInvoiceConfirmDate;
  
  // 인보이스 승인 권한이 있는 관리자만 확인 가능 (일반 관리자는 불가)
  const canApproveInvoice = hasItem("관리자 설정", "인보이스 승인");
  
  // 입금구분 변경 핸들러 (날짜는 저장 시에만 설정)
  const handleSettlementStatusChange = (value: string) => {
    setSettlementStatus(value);
  };

  // 총 승인금액 (선견적요청: 현장출동비용, 직접복구: 손해방지비용 + 대물복구비용 승인금액)
  const totalApprovedAmount = useMemo(() => {
    if (caseData?.recoveryType === "선견적요청") {
      // 선견적요청 케이스는 현장출동비용(100,000원) 또는 저장된 값 사용
      return parseInt(caseData?.fieldDispatchInvoiceAmount || "0") || FIXED_FIELD_DISPATCH_COST;
    }
    // 직접복구 케이스는 손해방지비용 + 대물복구비용
    return (parseInt(preventionApprovedAmount || "0") || 0) + 
           (parseInt(propertyApprovedAmount || "0") || 0);
  }, [caseData?.recoveryType, caseData?.fieldDispatchInvoiceAmount, preventionApprovedAmount, propertyApprovedAmount]);

  // 수수료 - 정산조회에서 전달받은 값 사용, 없으면 7.7% 계산
  const feeAmount = useMemo(() => {
    // 정산조회에서 전달받은 수수료 값이 있으면 그것을 사용
    if (settlementCommission !== undefined && settlementCommission > 0) {
      return settlementCommission;
    }
    // 없으면 7.7% 계산
    return Math.round(totalApprovedAmount * 0.077);
  }, [totalApprovedAmount, settlementCommission]);

  // 협력업체 지급액 계산 - 위쪽 승인금액 기준
  const partnerPaymentAmount = useMemo(() => {
    return totalApprovedAmount - feeAmount;
  }, [totalApprovedAmount, feeAmount]);

  // 입금내역 합계 계산
  const depositTotals = useMemo(() => {
    const totalClaim = depositEntries.reduce((sum, entry) => sum + entry.claimAmount, 0);
    const totalDeposit = depositEntries.reduce((sum, entry) => sum + entry.depositAmount, 0);
    return { totalClaim, totalDeposit };
  }, [depositEntries]);

  // 청구액 계산 (총 승인금액 - 자기부담금)
  const claimAmount = useMemo(() => {
    const deductible = parseInt(deductibleAmount || "0");
    return totalApprovedAmount - deductible;
  }, [totalApprovedAmount, deductibleAmount]);

  // 미수액 계산 (청구액 - 입금액)
  const outstandingAmount = useMemo(() => {
    return claimAmount - depositTotals.totalDeposit;
  }, [claimAmount, depositTotals.totalDeposit]);

  // 입금내역 추가
  const handleAddDeposit = () => {
    const newEntry: DepositEntry = {
      ...newDeposit,
      id: `deposit-${Date.now()}`,
    };
    setDepositEntries([...depositEntries, newEntry]);
    setNewDeposit({
      id: "",
      depositDate: "",
      insuranceCompany: caseData?.insuranceCompany || "전체",
      claimAmount: settlementClaimAmount || 0,
      depositStatus: "미입금",
      depositAmount: 0,
      memo: "",
    });
    setShowDepositForm(false);
  };

  // 입금내역 수정
  const handleEditDeposit = (entry: DepositEntry) => {
    setEditingDepositId(entry.id);
    setNewDeposit(entry);
    setShowDepositForm(true);
  };

  // 입금내역 수정 저장
  const handleSaveEditDeposit = () => {
    setDepositEntries(depositEntries.map(entry => 
      entry.id === editingDepositId ? newDeposit : entry
    ));
    setEditingDepositId(null);
    setNewDeposit({
      id: "",
      depositDate: "",
      insuranceCompany: caseData?.insuranceCompany || "전체",
      claimAmount: settlementClaimAmount || 0,
      depositStatus: "미입금",
      depositAmount: 0,
      memo: "",
    });
    setShowDepositForm(false);
  };

  // 저장완료 - 입금내역 및 자기부담금 저장 (모든 관리자 가능)
  const handleSaveComplete = async () => {
    if (!caseData) return;
    
    setIsSubmitting(true);
    try {
      const caseGroupPrefix = getCaseNumberPrefix(caseData.caseNumber);
      const todayDate = format(new Date(), "yyyy-MM-dd");
      
      // 인보이스에 자기부담금 및 입금구분 저장
      if (caseGroupPrefix) {
        const existingInvoice = await fetch(`/api/invoices/group/${encodeURIComponent(caseGroupPrefix)}`);
        const existingInvoiceData = await existingInvoice.json();
        
        if (existingInvoiceData && existingInvoiceData.id) {
          // 기존 인보이스 업데이트
          console.log("[Invoice Save] Updating existing invoice, settlementStatus:", settlementStatus);
          await apiRequest("PATCH", `/api/invoices/${existingInvoiceData.id}`, {
            deductible: deductibleAmount || "0",
            settlementStatus: settlementStatus || "", // 입금구분 저장
          });
        } else {
          // 인보이스가 없으면 새로 생성
          console.log("[Invoice Save] Creating new invoice, settlementStatus:", settlementStatus);
          // 인보이스 타입 결정: recoveryType이 "선견적요청"이면 "선견적요청", 그 외는 "직접복구"
          const invoiceType = caseData.recoveryType === "선견적요청" ? "선견적요청" : "직접복구";
          await apiRequest("POST", "/api/invoices", {
            caseGroupPrefix: caseGroupPrefix,
            caseId: caseData.id,
            type: invoiceType,
            deductible: deductibleAmount || "0",
            settlementStatus: settlementStatus || "", // 입금구분 저장
          });
        }
      }
      
      // 정산 데이터도 업데이트 (정산조회에서 읽을 수 있도록)
      const settlementResponse = await fetch(`/api/settlements/case/${caseData.id}/latest`);
      const settlementData = await settlementResponse.json();
      
      // 입금 내역에서 입금액 계산
      const totalDepositAmount = depositEntries.reduce((sum, entry) => sum + entry.depositAmount, 0);
      
      if (settlementData && settlementData.id) {
        // 기존 정산 데이터 업데이트
        const settlementUpdateData: Record<string, unknown> = {
          deductible: deductibleAmount || "0",
          discount: totalDepositAmount.toString(), // 입금액 합계 (레거시 호환용)
          depositEntries: depositEntries, // 입금내역 배열 저장
          commission: feeAmount.toString(), // 수수료
          partnerPaymentAmount: partnerPaymentAmount.toString(), // 협력업체 지급금액
        };
        
        // "정산"이 선택된 경우에만 날짜 설정, 그 외에는 날짜 초기화
        if (settlementStatus === "정산") {
          settlementUpdateData.partnerPaymentDate = todayDate; // 협력업체 지급일
          settlementUpdateData.settlementDate = todayDate; // 입금일
          settlementUpdateData.closingDate = todayDate; // 종결일
          // 로컬 상태도 업데이트
          setPartnerPaymentDate(todayDate);
          setDepositDate(new Date());
        } else {
          // "정산"이 아닌 경우 입금일 초기화 (부분입금 등)
          settlementUpdateData.settlementDate = ""; // 입금일 초기화
          setDepositDate(undefined);
        }
        
        await apiRequest("PATCH", `/api/settlements/${settlementData.id}`, settlementUpdateData);
      } else {
        // 정산 데이터가 없으면 새로 생성
        const settlementCreateData: Record<string, unknown> = {
          caseId: caseData.id,
          settlementAmount: "0", // 필수 필드
          settlementDate: settlementStatus === "정산" ? todayDate : "", // 정산인 경우에만 날짜 설정
          deductible: deductibleAmount || "0",
          discount: totalDepositAmount.toString(), // 입금액 합계 (레거시 호환용)
          depositEntries: depositEntries, // 입금내역 배열 저장
          commission: feeAmount.toString(), // 수수료
          partnerPaymentAmount: partnerPaymentAmount.toString(), // 협력업체 지급금액
        };
        
        // "정산"이 선택된 경우에만 날짜 설정
        if (settlementStatus === "정산") {
          settlementCreateData.partnerPaymentDate = todayDate; // 협력업체 지급일
          settlementCreateData.closingDate = todayDate; // 종결일
          // 로컬 상태도 업데이트
          setPartnerPaymentDate(todayDate);
          setDepositDate(new Date());
        } else {
          setDepositDate(undefined);
        }
        
        await apiRequest("POST", "/api/settlements", settlementCreateData);
      }
      
      // "정산" 또는 "부분입금"이 선택된 경우 같은 사고번호의 모든 케이스 상태 변경
      if (settlementStatus === "정산" || settlementStatus === "부분입금") {
        const newStatus = settlementStatus === "정산" ? "정산완료" : "부분입금";
        
        // 현재 케이스 상태 변경
        await apiRequest("PATCH", `/api/cases/${caseData.id}`, {
          status: newStatus,
        });
        
        // 관련 케이스들도 모두 상태 변경 (같은 사고번호)
        if (relatedCases && relatedCases.length > 0) {
          const updatePromises = relatedCases
            .filter(rc => rc.id !== caseData.id) // 현재 케이스 제외
            .map(rc => 
              apiRequest("PATCH", `/api/cases/${rc.id}`, {
                status: newStatus,
              })
            );
          await Promise.all(updatePromises);
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settlements"] });
      
      const updatedCount = relatedCases ? relatedCases.length : 1;
      toast({
        title: "저장 완료",
        description: settlementStatus === "정산" 
          ? `정산이 완료되었습니다. (${updatedCount}건 상태 변경)` 
          : settlementStatus === "부분입금"
          ? `부분입금 처리되었습니다. (${updatedCount}건 상태 변경)`
          : "정산 정보가 저장되었습니다.",
      });
      
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "저장 실패",
        description: "저장 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 세금계산서 날짜 선택 핸들러
  const handleTaxInvoiceDateSelect = async (date: Date | undefined) => {
    if (!date || !caseData) return;
    
    setTaxInvoiceDate(date);
    const formattedDate = format(date, "yyyy-MM-dd");
    
    try {
      await apiRequest("PATCH", `/api/cases/${caseData.id}`, {
        taxInvoiceConfirmDate: formattedDate,
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      
      toast({
        title: "세금계산서 확인일 저장",
        description: `${formattedDate}로 저장되었습니다.`,
      });
    } catch (error) {
      toast({
        title: "저장 실패",
        description: "세금계산서 확인일 저장 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  // 인보이스 확인 핸들러
  const handleInvoiceConfirm = async (dateStr: string) => {
    if (!caseData) return;
    
    // 즉시 로컬 상태 업데이트 (실시간 UI 반영)
    setLocalInvoiceConfirmDate(dateStr);
    
    try {
      await apiRequest("PATCH", `/api/cases/${caseData.id}`, {
        invoiceConfirmDate: dateStr,
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settlements"] });
      
      toast({
        title: "인보이스 확인",
        description: `인보이스가 확인되었습니다. (${dateStr})`,
      });
    } catch (error) {
      // 에러 시 로컬 상태 롤백
      setLocalInvoiceConfirmDate(caseData?.invoiceConfirmDate || null);
      toast({
        title: "확인 실패",
        description: "인보이스 확인 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  // 인보이스 취소 핸들러
  const handleInvoiceCancel = async () => {
    if (!caseData) return;
    
    const previousDate = localInvoiceConfirmDate;
    
    // 즉시 로컬 상태 업데이트 (실시간 UI 반영)
    setLocalInvoiceConfirmDate(null);
    
    try {
      await apiRequest("PATCH", `/api/cases/${caseData.id}`, {
        invoiceConfirmDate: null,
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settlements"] });
      
      toast({
        title: "인보이스 취소",
        description: "인보이스 확인이 취소되었습니다.",
      });
    } catch (error) {
      // 에러 시 로컬 상태 롤백
      setLocalInvoiceConfirmDate(previousDate);
      toast({
        title: "취소 실패",
        description: "인보이스 취소 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const categorizedCases = useMemo(() => {
    const allCases = relatedCases.length > 0 ? relatedCases : 
      (caseData ? [{
        id: caseData.id,
        caseNumber: caseData.caseNumber,
        recoveryType: caseData.recoveryType,
        estimateAmount: estimateData?.preventionEstimate || 0,
      }] : []);

    const prevention = {
      directRecovery: [] as RelatedCase[],
      fieldDispatch: [] as RelatedCase[],
    };
    const property = {
      directRecovery: [] as RelatedCase[],
      fieldDispatch: [] as RelatedCase[],
    };

    allCases.forEach((c) => {
      const suffix = getCaseSuffix(c.caseNumber);
      if (suffix === 0) {
        if (c.recoveryType === "선견적요청") {
          prevention.fieldDispatch.push(c);
        } else {
          prevention.directRecovery.push(c);
        }
      } else if (suffix > 0) {
        if (c.recoveryType === "선견적요청") {
          property.fieldDispatch.push(c);
        } else {
          property.directRecovery.push(c);
        }
      }
    });

    return { prevention, property };
  }, [relatedCases, caseData, estimateData]);

  // estimateData가 넘어오면 사용, 없으면 relatedCases에서 계산
  const displayEstimates = useMemo(() => {
    // estimateData가 있으면 해당 값 사용 (정산조회에서 전달)
    if (estimateData) {
      return {
        preventionEstimate: estimateData.preventionEstimate || 0,
        preventionApproved: estimateData.preventionApproved || 0,
        propertyEstimate: estimateData.propertyEstimate || 0,
        propertyApproved: estimateData.propertyApproved || 0,
      };
    }
    
    // estimateData가 없으면 relatedCases에서 계산
    const preventionEstimate = categorizedCases.prevention.directRecovery.reduce(
      (sum, c) => sum + (c.estimateAmount || 0), 0
    );
    const propertyEstimate = categorizedCases.property.directRecovery.reduce(
      (sum, c) => sum + (c.estimateAmount || 0), 0
    );

    return {
      preventionEstimate,
      preventionApproved: preventionEstimate,
      propertyEstimate,
      propertyApproved: propertyEstimate,
    };
  }, [categorizedCases, estimateData]);
  
  // 팝업이 닫힐 때 로드 상태 초기화
  useEffect(() => {
    if (!open) {
      lastLoadedCaseId.current = null;
    }
  }, [open]);
  
  useEffect(() => {
    if (open && caseData) {
      // 이미 로드된 케이스인 경우 displayEstimates만 업데이트 (자기부담금은 유지)
      const alreadyLoaded = lastLoadedCaseId.current === caseData.id;
      
      if (!alreadyLoaded) {
        // 최초 로드: 모든 필드 초기화
        lastLoadedCaseId.current = caseData.id;
        
        // 제출일: 청구일(claimDate)이 있으면 자동 설정
        if (caseData.claimDate) {
          setSubmissionDate(new Date(caseData.claimDate));
        } else {
          setSubmissionDate(undefined);
        }
        setAcceptanceDate(caseData.receptionDate || "");
        
        // 승인금액 설정 - 저장된 값이 있으면 사용, 없으면 displayEstimates의 승인금액 사용
        setPreventionApprovedAmount(
          caseData.invoiceDamagePreventionAmount || 
          displayEstimates.preventionApproved.toString() ||
          "0"
        );

        setPropertyApprovedAmount(
          caseData.invoicePropertyRepairAmount || 
          displayEstimates.propertyApproved.toString() ||
          "0"
        );

        // 자기부담금, 입금구분, 정산 데이터 모두 로드 (순차 처리로 race condition 방지)
        const loadAllData = async () => {
          let loadedDeductible = "0";
          let loadedSettlementStatus = "";
          
          // 1. 정산 데이터 먼저 로드 (자기부담금 포함)
          try {
            const settlementResponse = await fetch(`/api/settlements/case/${caseData.id}/latest`);
            if (settlementResponse.ok) {
              const settlementData = await settlementResponse.json();
              if (settlementData && settlementData.id) {
                // 입금일 (날짜 선택기)
                if (settlementData.settlementDate) {
                  setDepositDate(new Date(settlementData.settlementDate));
                } else {
                  setDepositDate(undefined);
                }
                
                // 협력업체 지급일
                if (settlementData.partnerPaymentDate) {
                  setPartnerPaymentDate(settlementData.partnerPaymentDate);
                } else {
                  setPartnerPaymentDate("");
                }
                
                // 자기부담금: 정산에서 먼저 로드
                if (settlementData.deductible && parseInt(settlementData.deductible) > 0) {
                  loadedDeductible = settlementData.deductible;
                }
                
                // 입금내역 복원 (depositEntries 배열 우선, 없으면 discount로 호환)
                if (settlementData.depositEntries && Array.isArray(settlementData.depositEntries) && settlementData.depositEntries.length > 0) {
                  // 새 형식: depositEntries 배열 사용
                  setDepositEntries(settlementData.depositEntries);
                } else if (settlementData.discount && parseInt(settlementData.discount) > 0) {
                  // 레거시 형식: discount에서 단일 항목 생성 (하위 호환용)
                  const depositEntry: DepositEntry = {
                    id: `deposit-loaded-${Date.now()}`,
                    depositDate: settlementData.settlementDate || format(new Date(), "yyyy-MM-dd"),
                    insuranceCompany: caseData.insuranceCompany || "전체",
                    claimAmount: 0,
                    depositStatus: "입금",
                    depositAmount: parseInt(settlementData.discount) || 0,
                    memo: "",
                  };
                  setDepositEntries([depositEntry]);
                } else {
                  setDepositEntries([]);
                }
              } else {
                setDepositDate(undefined);
                setDepositEntries([]);
                setPartnerPaymentDate("");
              }
            } else {
              setDepositDate(undefined);
              setDepositEntries([]);
              setPartnerPaymentDate("");
            }
          } catch (error) {
            console.error("Failed to load settlement data:", error);
            setDepositDate(undefined);
            setDepositEntries([]);
            setPartnerPaymentDate("");
          }
          
          // 2. 인보이스 데이터 로드 (자기부담금이 있으면 덮어쓰기, 입금구분 로드)
          try {
            const caseGroupPrefix = caseData.caseNumber?.split("-")[0] || "";
            if (caseGroupPrefix) {
              const response = await fetch(`/api/invoices/group/${encodeURIComponent(caseGroupPrefix)}`, {
                cache: 'no-store',
                headers: { 'Cache-Control': 'no-cache' }
              });
              if (response.ok) {
                const invoiceData = await response.json();
                console.log("[Invoice Load] settlementStatus from server:", invoiceData.settlementStatus);
                if (invoiceData) {
                  // 자기부담금: 인보이스에 값이 있으면 덮어쓰기 (정산 값보다 우선)
                  if (invoiceData.deductible && parseInt(invoiceData.deductible) > 0) {
                    loadedDeductible = invoiceData.deductible;
                  }
                  // 입금구분 (정산/부분입금/청구변경)
                  if (invoiceData.settlementStatus) {
                    loadedSettlementStatus = invoiceData.settlementStatus;
                  }
                }
              }
            }
          } catch (error) {
            console.error("Failed to load invoice data:", error);
          }
          
          // 3. 최종 값 설정
          setDeductibleAmount(loadedDeductible);
          setSettlementStatus(loadedSettlementStatus);
        };
        loadAllData();
        
        // 세금계산서 확인일 초기화
        if (caseData.taxInvoiceConfirmDate) {
          setTaxInvoiceDate(new Date(caseData.taxInvoiceConfirmDate));
        } else {
          setTaxInvoiceDate(undefined);
        }
      }
    }
  }, [open, caseData, displayEstimates]);

  const handleApprove = async () => {
    if (!caseData) return;
    
    setIsSubmitting(true);
    try {
      const caseGroupPrefix = getCaseNumberPrefix(caseData.caseNumber);
      const todayDate = format(new Date(), "yyyy-MM-dd");
      
      const invoiceData = {
        caseId: caseData.id,
        caseGroupPrefix,
        type: caseData.recoveryType || "직접복구",
        status: "approved" as const,
        damagePreventionEstimate: displayEstimates.preventionEstimate.toString(),
        damagePreventionApproved: preventionApprovedAmount || "0",
        propertyRepairEstimate: displayEstimates.propertyEstimate.toString(),
        propertyRepairApproved: propertyApprovedAmount || "0",
        fieldDispatchAmount: null,
        totalApprovedAmount: totalApprovedAmount.toString(),
        deductible: deductibleAmount || "0",
        submissionDate: submissionDate ? format(submissionDate, "yyyy-MM-dd") : null,
        settlementStatus,
        remarks: null,
      };
      
      const existingInvoice = await fetch(`/api/invoices/group/${encodeURIComponent(caseGroupPrefix)}`);
      const existingInvoiceData = await existingInvoice.json();
      
      if (existingInvoiceData && existingInvoiceData.id) {
        await apiRequest("PATCH", `/api/invoices/${existingInvoiceData.id}`, {
          ...invoiceData,
          approvedAt: new Date().toISOString(),
        });
      } else {
        await apiRequest("POST", "/api/invoices", invoiceData);
      }
      
      // 인보이스 확인 날짜 자동 저장 (승인 시점의 현재 날짜)
      const today = new Date();
      const invoiceConfirmDateValue = format(today, "yyyy.MM.dd");
      
      // 정산 데이터도 업데이트 (정산조회에서 읽을 수 있도록)
      const settlementResponse = await fetch(`/api/settlements/case/${caseData.id}/latest`);
      const settlementData = await settlementResponse.json();
      
      // 입금 내역에서 입금액 계산
      const totalDepositAmount = depositEntries.reduce((sum, entry) => sum + entry.depositAmount, 0);
      
      if (settlementData && settlementData.id) {
        // 기존 정산 데이터 업데이트
        const settlementUpdateData: Record<string, unknown> = {
          deductible: deductibleAmount || "0",
          discount: totalDepositAmount.toString(), // 입금액 합계 (레거시 호환용)
          depositEntries: depositEntries, // 입금내역 배열 저장
          commission: feeAmount.toString(), // 수수료
          partnerPaymentAmount: partnerPaymentAmount.toString(), // 협력업체 지급금액
        };
        
        // "정산"이 선택된 경우에만 날짜 설정, 그 외에는 날짜 초기화
        if (settlementStatus === "정산") {
          settlementUpdateData.partnerPaymentDate = todayDate; // 협력업체 지급일
          settlementUpdateData.settlementDate = todayDate; // 입금일
          settlementUpdateData.closingDate = todayDate; // 종결일
          // 로컬 상태도 업데이트
          setPartnerPaymentDate(todayDate);
          setDepositDate(new Date());
        } else {
          // "정산"이 아닌 경우 입금일 초기화 (부분입금 등)
          settlementUpdateData.settlementDate = ""; // 입금일 초기화
          setDepositDate(undefined);
        }
        
        await apiRequest("PATCH", `/api/settlements/${settlementData.id}`, settlementUpdateData);
      } else {
        // 정산 데이터가 없으면 새로 생성
        const settlementCreateData: Record<string, unknown> = {
          caseId: caseData.id,
          settlementAmount: "0", // 필수 필드
          settlementDate: settlementStatus === "정산" ? todayDate : "", // 정산인 경우에만 날짜 설정
          deductible: deductibleAmount || "0",
          discount: totalDepositAmount.toString(), // 입금액 합계 (레거시 호환용)
          depositEntries: depositEntries, // 입금내역 배열 저장
          commission: feeAmount.toString(), // 수수료
          partnerPaymentAmount: partnerPaymentAmount.toString(), // 협력업체 지급금액
        };
        
        // "정산"이 선택된 경우에만 날짜 설정
        if (settlementStatus === "정산") {
          settlementCreateData.partnerPaymentDate = todayDate; // 협력업체 지급일
          settlementCreateData.closingDate = todayDate; // 종결일
          // 로컬 상태도 업데이트
          setPartnerPaymentDate(todayDate);
          setDepositDate(new Date());
        } else {
          setDepositDate(undefined);
        }
        
        await apiRequest("POST", "/api/settlements", settlementCreateData);
      }
      
      // "정산" 또는 "부분입금"이 선택된 경우 같은 사고번호의 모든 케이스 상태 변경
      if (settlementStatus === "정산" || settlementStatus === "부분입금") {
        const newStatus = settlementStatus === "정산" ? "정산완료" : "부분입금";
        
        // 현재 케이스 상태 변경
        await apiRequest("PATCH", `/api/cases/${caseData.id}`, {
          invoiceDamagePreventionAmount: preventionApprovedAmount,
          invoicePropertyRepairAmount: propertyApprovedAmount,
          invoiceConfirmDate: invoiceConfirmDateValue,
          status: newStatus,
        });
        
        // 관련 케이스들도 모두 상태 변경 (같은 사고번호)
        if (relatedCases && relatedCases.length > 0) {
          const updatePromises = relatedCases
            .filter(rc => rc.id !== caseData.id) // 현재 케이스 제외
            .map(rc => 
              apiRequest("PATCH", `/api/cases/${rc.id}`, {
                status: newStatus,
              })
            );
          await Promise.all(updatePromises);
        }
      } else {
        // 정산/부분입금이 아닌 경우 현재 케이스만 업데이트
        await apiRequest("PATCH", `/api/cases/${caseData.id}`, {
          invoiceDamagePreventionAmount: preventionApprovedAmount,
          invoicePropertyRepairAmount: propertyApprovedAmount,
          invoiceConfirmDate: invoiceConfirmDateValue,
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settlements"] });
      
      const updatedCount = relatedCases ? relatedCases.length : 1;
      toast({
        title: "인보이스 승인 완료",
        description: settlementStatus === "정산" 
          ? `정산이 완료되었습니다. (${updatedCount}건 상태 변경)` 
          : settlementStatus === "부분입금"
          ? `부분입금 처리되었습니다. (${updatedCount}건 상태 변경)`
          : `총 승인금액: ${totalApprovedAmount.toLocaleString()}원`,
      });
      
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "승인 실패",
        description: "인보이스 승인 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!caseData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-[810px] p-0 gap-0"
        style={{
          fontFamily: "Pretendard",
          background: "#FDFDFD",
          boxShadow: "0px 0px 20px #DBE9F5",
          borderRadius: "12px",
          maxHeight: "90vh",
          overflow: "hidden",
        }}
      >
        <DialogHeader
          className="flex flex-row items-center justify-center px-6 py-6"
          style={{
            borderBottom: "2px solid rgba(12, 12, 12, 0.1)",
          }}
        >
          <DialogTitle 
            style={{ 
              fontFamily: "Pretendard", 
              fontSize: "22px", 
              fontWeight: 600,
              color: "#0C0C0C",
              textAlign: "center",
            }}
          >
            인보이스 관리
          </DialogTitle>
        </DialogHeader>

        <div 
          className="overflow-y-auto"
          style={{ 
            padding: "24px 24px 0 24px", 
            maxHeight: "calc(90vh - 187px)",
          }}
        >
          <div className="flex flex-col gap-5 p-0">
            {/* 기본정보 섹션 */}
            <div
              style={{
                background: "#FFFFFF",
                border: "1px solid rgba(12, 12, 12, 0.08)",
                borderRadius: "8px",
                padding: "28px 32px",
              }}
            >
              <div 
                className="flex items-center mb-6"
                style={{ fontWeight: 700, fontSize: "18px", color: "#0C0C0C" }}
              >
                기본정보
              </div>

              <div className="flex flex-col gap-4">
                {/* 제출일 */}
                <div className="flex items-center justify-between">
                  <span style={{ fontWeight: 400, fontSize: "15px", color: "rgba(12, 12, 12, 0.6)" }}>
                    제출일
                  </span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="justify-start text-left font-normal"
                        data-testid="button-submission-date"
                        style={{
                          height: "36px",
                          background: "#FFFFFF",
                          border: "1px solid rgba(12, 12, 12, 0.2)",
                          borderRadius: "6px",
                          fontWeight: 400,
                          fontSize: "14px",
                          color: submissionDate ? "rgba(12, 12, 12, 0.8)" : "rgba(12, 12, 12, 0.5)",
                          padding: "0 12px",
                        }}
                      >
                        <CalendarIcon size={16} style={{ marginRight: "8px", color: "rgba(12, 12, 12, 0.5)" }} />
                        {submissionDate ? format(submissionDate, "yyyy-MM-dd") : "날짜 선택"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        mode="single"
                        selected={submissionDate}
                        onSelect={setSubmissionDate}
                        locale={ko}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* 수임일 */}
                <div className="flex items-center justify-between">
                  <span style={{ fontWeight: 400, fontSize: "15px", color: "rgba(12, 12, 12, 0.6)" }}>
                    수임일
                  </span>
                  <span style={{ fontWeight: 400, fontSize: "15px", color: "rgba(12, 12, 12, 0.9)" }}>
                    {acceptanceDate || "-"}
                  </span>
                </div>

                {/* 보험사 */}
                <div className="flex items-center justify-between">
                  <span style={{ fontWeight: 400, fontSize: "15px", color: "rgba(12, 12, 12, 0.6)" }}>
                    보험사
                  </span>
                  <span style={{ fontWeight: 400, fontSize: "15px", color: "rgba(12, 12, 12, 0.9)" }}>
                    {caseData.insuranceCompany || "-"} {caseData.clientName || ""} {caseData.clientContact || ""}
                  </span>
                </div>

                {/* 담당자 */}
                <div className="flex items-center justify-between">
                  <span style={{ fontWeight: 400, fontSize: "15px", color: "rgba(12, 12, 12, 0.6)" }}>
                    담당자
                  </span>
                  <span style={{ fontWeight: 400, fontSize: "15px", color: "rgba(12, 12, 12, 0.9)" }}>
                    {managerName} {managerContact}
                  </span>
                </div>

                {/* 접수번호 */}
                <div className="flex items-center justify-between">
                  <span style={{ fontWeight: 400, fontSize: "15px", color: "rgba(12, 12, 12, 0.6)" }}>
                    접수번호
                  </span>
                  <span style={{ fontWeight: 400, fontSize: "15px", color: "rgba(12, 12, 12, 0.9)" }}>
                    {caseData.caseNumber || "-"}
                  </span>
                </div>

                {/* 사고번호 */}
                <div className="flex items-center justify-between">
                  <span style={{ fontWeight: 400, fontSize: "15px", color: "rgba(12, 12, 12, 0.6)" }}>
                    사고번호
                  </span>
                  <span style={{ fontWeight: 400, fontSize: "15px", color: "rgba(12, 12, 12, 0.9)" }}>
                    {caseData.insuranceAccidentNo || "-"}
                  </span>
                </div>
              </div>
            </div>

            {/* 협력/현장 정보 섹션 */}
            <div
              style={{
                background: "#FFFFFF",
                border: "1px solid rgba(12, 12, 12, 0.08)",
                borderRadius: "8px",
                padding: "28px 32px",
              }}
            >
              <div 
                className="flex items-center mb-6"
                style={{ fontWeight: 700, fontSize: "18px", color: "#0C0C0C" }}
              >
                협력/현장 정보
              </div>

              <div className="flex flex-col gap-4">
                {/* 협력업체 */}
                <div className="flex items-center justify-between">
                  <span style={{ fontWeight: 400, fontSize: "15px", color: "rgba(12, 12, 12, 0.6)" }}>
                    협력업체
                  </span>
                  <span style={{ fontWeight: 400, fontSize: "15px", color: "rgba(12, 12, 12, 0.9)" }}>
                    {caseData.assignedPartner || "-"}
                  </span>
                </div>

                {/* 담당자 */}
                <div className="flex items-center justify-between">
                  <span style={{ fontWeight: 400, fontSize: "15px", color: "rgba(12, 12, 12, 0.6)" }}>
                    담당자
                  </span>
                  <span style={{ fontWeight: 400, fontSize: "15px", color: "rgba(12, 12, 12, 0.9)" }}>
                    {caseData.assignedPartnerManager || "-"} {caseData.assignedPartnerContact || ""}
                  </span>
                </div>

                {/* 사고유형 */}
                <div className="flex items-center justify-between">
                  <span style={{ fontWeight: 400, fontSize: "15px", color: "rgba(12, 12, 12, 0.6)" }}>
                    사고유형
                  </span>
                  <span style={{ fontWeight: 400, fontSize: "15px", color: "rgba(12, 12, 12, 0.9)" }}>
                    {caseData.accidentType || "-"}
                  </span>
                </div>

                {/* 공사유무 */}
                <div className="flex items-center justify-between">
                  <span style={{ fontWeight: 400, fontSize: "15px", color: "rgba(12, 12, 12, 0.6)" }}>
                    공사유무
                  </span>
                  <span style={{ fontWeight: 400, fontSize: "15px", color: "rgba(12, 12, 12, 0.9)" }}>
                    {caseData.recoveryType === "직접복구" ? "수리" : caseData.recoveryType === "선견적요청" ? "미수리" : "-"}
                  </span>
                </div>
              </div>
            </div>

            {/* 금액 섹션 */}
            <div
              style={{
                background: "#FFFFFF",
                border: "1px solid rgba(12, 12, 12, 0.08)",
                borderRadius: "8px",
                padding: "28px 32px",
              }}
            >
              <div 
                className="flex items-center mb-6"
                style={{ fontWeight: 700, fontSize: "18px", color: "#0C0C0C" }}
              >
                금액
              </div>

              <div className="flex flex-col">
                {/* 헤더 행 */}
                <div 
                  className="flex items-center"
                  style={{ 
                    borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                    paddingBottom: "12px",
                    marginBottom: "4px",
                  }}
                >
                  <div style={{ width: "140px" }} />
                  <div className="flex-1 text-center">
                    <span style={{ fontWeight: 500, fontSize: "14px", color: "rgba(12, 12, 12, 0.5)" }}>
                      손해방지비용
                    </span>
                  </div>
                  <div className="flex-1 text-center">
                    <span style={{ fontWeight: 500, fontSize: "14px", color: "rgba(12, 12, 12, 0.5)" }}>
                      대물비용
                    </span>
                  </div>
                </div>

                {/* 견적금액 행 */}
                <div className="flex items-center py-4">
                  <div style={{ width: "140px" }}>
                    <span style={{ fontWeight: 400, fontSize: "15px", color: "rgba(12, 12, 12, 0.6)" }}>
                      견적금액(원)
                    </span>
                  </div>
                  <div className="flex-1 text-center">
                    <span style={{ fontWeight: 400, fontSize: "15px", color: "rgba(12, 12, 12, 0.9)" }}>
                      {displayEstimates.preventionEstimate.toLocaleString()}원
                    </span>
                  </div>
                  <div className="flex-1 text-center">
                    <span style={{ fontWeight: 400, fontSize: "15px", color: "rgba(12, 12, 12, 0.9)" }}>
                      {displayEstimates.propertyEstimate.toLocaleString()}원
                    </span>
                  </div>
                </div>

                {/* 차액 행 - 견적금액 - 승인금액 (A - A1) */}
                <div className="flex items-center py-4">
                  <div style={{ width: "140px" }}>
                    <span style={{ fontWeight: 400, fontSize: "15px", color: "rgba(12, 12, 12, 0.6)" }}>
                      차액(원)
                    </span>
                  </div>
                  <div className="flex-1 text-center">
                    <span style={{ fontWeight: 400, fontSize: "15px", color: "rgba(12, 12, 12, 0.9)" }}>
                      {(displayEstimates.preventionEstimate - (parseInt(preventionApprovedAmount || "0") || 0)).toLocaleString()}원
                    </span>
                  </div>
                  <div className="flex-1 text-center">
                    <span style={{ fontWeight: 400, fontSize: "15px", color: "rgba(12, 12, 12, 0.9)" }}>
                      {(displayEstimates.propertyEstimate - (parseInt(propertyApprovedAmount || "0") || 0)).toLocaleString()}원
                    </span>
                  </div>
                </div>

                {/* 수정률 행 - (견적금액 - 승인금액) / 견적금액 * 100% = (A - A1) / A * 100% */}
                <div className="flex items-center py-4">
                  <div style={{ width: "140px" }}>
                    <span style={{ fontWeight: 400, fontSize: "15px", color: "rgba(12, 12, 12, 0.6)" }}>
                      수정률(%)
                    </span>
                  </div>
                  <div className="flex-1 text-center">
                    <span style={{ fontWeight: 400, fontSize: "15px", color: "rgba(12, 12, 12, 0.9)" }}>
                      {displayEstimates.preventionEstimate > 0 
                        ? (((displayEstimates.preventionEstimate - (parseInt(preventionApprovedAmount || "0") || 0)) / displayEstimates.preventionEstimate) * 100).toFixed(0) + "%"
                        : "0%"}
                    </span>
                  </div>
                  <div className="flex-1 text-center">
                    <span style={{ fontWeight: 400, fontSize: "15px", color: "rgba(12, 12, 12, 0.9)" }}>
                      {displayEstimates.propertyEstimate > 0 
                        ? (((displayEstimates.propertyEstimate - (parseInt(propertyApprovedAmount || "0") || 0)) / displayEstimates.propertyEstimate) * 100).toFixed(0) + "%"
                        : "0%"}
                    </span>
                  </div>
                </div>

                {/* 승인금액 행 */}
                <div className="flex items-center py-4">
                  <div style={{ width: "140px" }}>
                    <span style={{ fontWeight: 400, fontSize: "15px", color: "rgba(12, 12, 12, 0.6)" }}>
                      승인금액(원)
                    </span>
                  </div>
                  <div className="flex-1 text-center">
                    <span style={{ fontWeight: 400, fontSize: "15px", color: "rgba(12, 12, 12, 0.9)" }}>
                      {(parseInt(preventionApprovedAmount || "0") || 0).toLocaleString()}원
                    </span>
                  </div>
                  <div className="flex-1 text-center">
                    <span style={{ fontWeight: 400, fontSize: "15px", color: "rgba(12, 12, 12, 0.9)" }}>
                      {(parseInt(propertyApprovedAmount || "0") || 0).toLocaleString()}원
                    </span>
                  </div>
                </div>

                {/* 구분선 */}
                <div style={{ borderTop: "1px solid rgba(12, 12, 12, 0.08)", marginTop: "8px", marginBottom: "8px" }} />

                {/* 총 승인금액 */}
                <div className="flex items-center justify-between py-4">
                  <span style={{ fontWeight: 400, fontSize: "15px", color: "rgba(12, 12, 12, 0.6)" }}>
                    총 승인금액
                  </span>
                  {settlementStatus === "청구변경" ? (
                    <div className="flex items-center gap-1">
                      <Input
                        type="text"
                        value={totalApprovedAmount.toLocaleString()}
                        onChange={(e) => {
                          const value = e.target.value.replace(/,/g, "").replace(/[^0-9]/g, "");
                          // 총 승인금액 변경 시 손해방지비용 승인금액으로 설정 (대물복구비용은 0으로)
                          setPreventionApprovedAmount(value || "0");
                          setPropertyApprovedAmount("0");
                        }}
                        data-testid="input-total-approved-amount"
                        style={{
                          width: "120px",
                          textAlign: "right",
                          fontWeight: 400,
                          fontSize: "15px",
                          padding: "4px 8px",
                          height: "32px",
                        }}
                      />
                      <span style={{ fontWeight: 400, fontSize: "15px", color: "rgba(12, 12, 12, 0.9)" }}>원</span>
                    </div>
                  ) : (
                    <span style={{ fontWeight: 400, fontSize: "15px", color: "rgba(12, 12, 12, 0.9)" }}>
                      {totalApprovedAmount.toLocaleString()}원
                    </span>
                  )}
                </div>

                {/* 총 수수료(원) */}
                <div className="flex items-center justify-between py-4">
                  <span style={{ fontWeight: 400, fontSize: "15px", color: "rgba(12, 12, 12, 0.6)" }}>
                    총 수수료(원)
                  </span>
                  <span style={{ fontWeight: 400, fontSize: "15px", color: "rgba(12, 12, 12, 0.9)" }}>
                    {feeAmount.toLocaleString()}원
                  </span>
                </div>

                {/* 협력업체 지급액(원) */}
                <div className="flex items-center justify-between py-4">
                  <span style={{ fontWeight: 400, fontSize: "15px", color: "rgba(12, 12, 12, 0.6)" }}>
                    협력업체 지급액(원)
                  </span>
                  <span style={{ fontWeight: 400, fontSize: "15px", color: "rgba(12, 12, 12, 0.9)" }}>
                    {partnerPaymentAmount.toLocaleString()}원
                  </span>
                </div>
              </div>
            </div>

            {/* 세금계산서/인보이스 섹션 */}
            <div
              style={{
                background: "#FFFFFF",
                border: "1px solid rgba(12, 12, 12, 0.08)",
                borderRadius: "8px",
                padding: "28px 32px",
              }}
            >
              <div 
                className="flex items-center mb-6"
                style={{ fontWeight: 700, fontSize: "18px", color: "#0C0C0C" }}
              >
                세금계산서/인보이스
              </div>

              <div className="flex flex-col gap-4">
                {/* 세금계산서 확인 */}
                <div className="flex items-center justify-between">
                  <span style={{ fontWeight: 400, fontSize: "15px", color: "rgba(12, 12, 12, 0.6)" }}>
                    세금계산서 확인
                  </span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="justify-start text-left font-normal"
                        data-testid="button-tax-invoice-date"
                        style={{
                          height: "36px",
                          background: "#FFFFFF",
                          border: "1px solid rgba(12, 12, 12, 0.2)",
                          borderRadius: "6px",
                          fontWeight: 400,
                          fontSize: "14px",
                          color: taxInvoiceDate ? "rgba(12, 12, 12, 0.8)" : "rgba(12, 12, 12, 0.5)",
                          padding: "0 12px",
                        }}
                      >
                        <CalendarIcon size={16} style={{ marginRight: "8px", color: "rgba(12, 12, 12, 0.5)" }} />
                        {taxInvoiceDate ? format(taxInvoiceDate, "yyyy-MM-dd") : "날짜 선택"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        mode="single"
                        selected={taxInvoiceDate}
                        onSelect={handleTaxInvoiceDateSelect}
                        locale={ko}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* 인보이스 확인 */}
                <div className="flex items-center justify-between">
                  <span style={{ fontWeight: 400, fontSize: "15px", color: "rgba(12, 12, 12, 0.6)" }}>
                    인보이스 확인
                  </span>
                  <div className="flex items-center gap-3">
                    <span style={{ fontWeight: 400, fontSize: "15px", color: "rgba(12, 12, 12, 0.9)" }}>
                      {localInvoiceConfirmDate || "-"}
                    </span>
                    <Button
                      onClick={() => {
                        const today = format(new Date(), "yyyy.MM.dd");
                        // Update case with invoice confirm date
                        handleInvoiceConfirm(today);
                      }}
                      data-testid="button-invoice-confirm-action"
                      style={{
                        height: "36px",
                        background: "#008FED",
                        borderRadius: "6px",
                        fontWeight: 500,
                        fontSize: "14px",
                        color: "#FFFFFF",
                        padding: "0 16px",
                      }}
                    >
                      인보이스 확인
                    </Button>
                    <Button
                      onClick={() => {
                        // Clear invoice confirm date
                        handleInvoiceCancel();
                      }}
                      data-testid="button-invoice-cancel-action"
                      style={{
                        height: "36px",
                        background: "#DC2626",
                        borderRadius: "6px",
                        fontWeight: 500,
                        fontSize: "14px",
                        color: "#FFFFFF",
                        padding: "0 16px",
                      }}
                    >
                      인보이스 취소
                    </Button>
                  </div>
                </div>

                {/* 인보이스 속성 */}
                <div className="flex items-center justify-between">
                  <span style={{ fontWeight: 400, fontSize: "15px", color: "rgba(12, 12, 12, 0.6)" }}>
                    인보이스 속성
                  </span>
                  <span style={{ fontWeight: 400, fontSize: "15px", color: "rgba(12, 12, 12, 0.9)" }}>
                    {caseData.recoveryType === "직접복구" ? "수리(인보이스 연동)" : "미수리"}
                  </span>
                </div>
              </div>
            </div>

            {/* 정산 섹션 */}
            <div
              style={{
                background: "#FFFFFF",
                border: "1px solid rgba(12, 12, 12, 0.08)",
                borderRadius: "8px",
                padding: "28px 32px",
              }}
            >
              <div 
                className="flex items-center mb-6"
                style={{ fontWeight: 700, fontSize: "18px", color: "#0C0C0C" }}
              >
                정산
              </div>

              <div className="flex flex-col gap-4">
                {/* 협력업체 지급일 */}
                <div className="flex items-center justify-between">
                  <span style={{ fontWeight: 400, fontSize: "15px", color: "rgba(12, 12, 12, 0.6)" }}>
                    협력업체 지급일
                  </span>
                  <span style={{ fontWeight: 400, fontSize: "15px", color: "rgba(12, 12, 12, 0.9)" }}>
                    {partnerPaymentDate || "-"}
                  </span>
                </div>

                {/* 입금일 */}
                <div className="flex items-center justify-between">
                  <span style={{ fontWeight: 400, fontSize: "15px", color: "rgba(12, 12, 12, 0.6)" }}>
                    입금일
                  </span>
                  <span style={{ fontWeight: 400, fontSize: "15px", color: "rgba(12, 12, 12, 0.9)" }}>
                    {depositDate ? format(depositDate, "yyyy-MM-dd") : "-"}
                  </span>
                </div>

                {/* 입금 구분 */}
                <div className="flex items-center justify-between">
                  <span style={{ fontWeight: 400, fontSize: "15px", color: "rgba(12, 12, 12, 0.6)" }}>
                    입금 구분
                  </span>
                  <RadioGroup 
                    value={settlementStatus} 
                    onValueChange={handleSettlementStatusChange}
                    className="flex items-center gap-4"
                  >
                    <div className="flex items-center gap-1">
                      <RadioGroupItem 
                        value="정산" 
                        id="status-settlement"
                        data-testid="radio-status-settlement"
                        className={settlementStatus === "정산" ? "border-[#008FED] text-[#008FED]" : "border-gray-300"}
                      />
                      <Label 
                        htmlFor="status-settlement"
                        style={{ 
                          fontWeight: 500, 
                          fontSize: "14px", 
                          color: settlementStatus === "정산" ? "#008FED" : "rgba(12, 12, 12, 0.8)",
                          cursor: "pointer",
                        }}
                      >
                        정산
                      </Label>
                    </div>

                    <div className="flex items-center gap-1">
                      <RadioGroupItem 
                        value="부분입금" 
                        id="status-partial"
                        data-testid="radio-status-partial"
                        className={settlementStatus === "부분입금" ? "border-[#008FED] text-[#008FED]" : "border-gray-300"}
                      />
                      <Label 
                        htmlFor="status-partial"
                        style={{ 
                          fontWeight: 500, 
                          fontSize: "14px", 
                          color: settlementStatus === "부분입금" ? "#008FED" : "rgba(12, 12, 12, 0.8)",
                          cursor: "pointer",
                        }}
                      >
                        부분입금
                      </Label>
                    </div>

                    <div className="flex items-center gap-1">
                      <RadioGroupItem 
                        value="청구변경" 
                        id="status-change"
                        data-testid="radio-status-change"
                        className={settlementStatus === "청구변경" ? "border-[#008FED] text-[#008FED]" : "border-gray-300"}
                      />
                      <Label 
                        htmlFor="status-change"
                        style={{ 
                          fontWeight: 500, 
                          fontSize: "14px", 
                          color: settlementStatus === "청구변경" ? "#008FED" : "rgba(12, 12, 12, 0.8)",
                          cursor: "pointer",
                        }}
                      >
                        청구변경
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* 자기부담금 - 항상 편집 가능 */}
                <div className="flex items-center justify-between">
                  <span style={{ fontWeight: 400, fontSize: "15px", color: "rgba(12, 12, 12, 0.6)" }}>
                    자기부담금
                  </span>
                  <div className="flex items-center gap-1">
                    <Input
                      type="text"
                      value={deductibleAmount ? parseInt(deductibleAmount).toLocaleString() : "0"}
                      onChange={(e) => {
                        const value = e.target.value.replace(/,/g, "").replace(/[^0-9]/g, "");
                        setDeductibleAmount(value || "0");
                      }}
                      data-testid="input-deductible-amount"
                      style={{
                        width: "120px",
                        textAlign: "right",
                        fontWeight: 400,
                        fontSize: "15px",
                        padding: "4px 8px",
                        height: "32px",
                      }}
                    />
                    <span style={{ fontWeight: 400, fontSize: "15px", color: "rgba(12, 12, 12, 0.9)" }}>원</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 입금관리 섹션 - 인보이스 승인 후에만 표시 */}
            {isInvoiceApproved && (
              <div
                style={{
                  background: "#FFFFFF",
                  border: "1px solid rgba(12, 12, 12, 0.08)",
                  borderRadius: "8px",
                  padding: "28px 32px",
                }}
              >
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span style={{ fontWeight: 700, fontSize: "18px", color: "#0C0C0C" }}>
                      입금관리
                    </span>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setEditingDepositId(null);
                        setNewDeposit({
                          id: "",
                          depositDate: "",
                          insuranceCompany: caseData?.insuranceCompany || "전체",
                          claimAmount: settlementClaimAmount || 0,
                          depositStatus: "미입금",
                          depositAmount: 0,
                          memo: "",
                        });
                        setShowDepositForm(true);
                      }}
                      data-testid="button-add-deposit"
                      style={{
                        fontWeight: 500,
                        fontSize: "15px",
                        color: "#008FED",
                        padding: "4px 8px",
                      }}
                    >
                      추가
                    </Button>
                  </div>

                  {/* 입금내역 테이블 */}
                  <div 
                    style={{
                      border: "1px solid rgba(12, 12, 12, 0.08)",
                      borderRadius: "8px",
                      overflow: "hidden",
                    }}
                  >
                    {/* 테이블 헤더 */}
                    <div 
                      className="flex items-center"
                      style={{ 
                        background: "rgba(12, 12, 12, 0.02)",
                        borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
                      }}
                    >
                      <div style={{ flex: 1, padding: "12px 8px", textAlign: "center", fontWeight: 600, fontSize: "13px", color: "rgba(12, 12, 12, 0.6)" }}>입금일자</div>
                      <div style={{ flex: 1, padding: "12px 8px", textAlign: "center", fontWeight: 600, fontSize: "13px", color: "rgba(12, 12, 12, 0.6)" }}>보험사</div>
                      <div style={{ flex: 1, padding: "12px 8px", textAlign: "center", fontWeight: 600, fontSize: "13px", color: "rgba(12, 12, 12, 0.6)" }}>청구액</div>
                      <div style={{ flex: 1, padding: "12px 8px", textAlign: "center", fontWeight: 600, fontSize: "13px", color: "rgba(12, 12, 12, 0.6)" }}>입금액</div>
                      <div style={{ flex: 0.8, padding: "12px 8px", textAlign: "center", fontWeight: 600, fontSize: "13px", color: "rgba(12, 12, 12, 0.6)" }}>메모</div>
                      <div style={{ flex: 0.6, padding: "12px 8px", textAlign: "center", fontWeight: 600, fontSize: "13px", color: "rgba(12, 12, 12, 0.6)" }}>요청</div>
                    </div>

                    {/* 테이블 바디 */}
                    {depositEntries.length === 0 ? (
                      <div className="flex items-center justify-center" style={{ padding: "24px", color: "rgba(12, 12, 12, 0.4)", fontSize: "14px" }}>
                        입금 내역이 없습니다
                      </div>
                    ) : (
                      depositEntries.map((entry, index) => (
                        <div 
                          key={entry.id}
                          className="flex items-center"
                          style={{ 
                            borderBottom: index < depositEntries.length - 1 ? "1px solid rgba(12, 12, 12, 0.08)" : "none",
                          }}
                        >
                          <div style={{ flex: 1, padding: "12px 8px", textAlign: "center", fontSize: "14px", color: "rgba(12, 12, 12, 0.8)" }}>{entry.depositDate}</div>
                          <div style={{ flex: 1, padding: "12px 8px", textAlign: "center", fontSize: "14px", color: "rgba(12, 12, 12, 0.8)" }}>{entry.insuranceCompany}</div>
                          <div style={{ flex: 1, padding: "12px 8px", textAlign: "center", fontSize: "14px", color: "rgba(12, 12, 12, 0.8)" }}>{entry.claimAmount.toLocaleString()}원</div>
                          <div style={{ flex: 1, padding: "12px 8px", textAlign: "center", fontSize: "14px", color: "rgba(12, 12, 12, 0.8)" }}>{entry.depositAmount.toLocaleString()}원</div>
                          <div style={{ flex: 0.8, padding: "12px 8px", textAlign: "center", fontSize: "14px", color: "rgba(12, 12, 12, 0.8)" }}>{entry.memo || "-"}</div>
                          <div style={{ flex: 0.6, padding: "12px 8px", textAlign: "center" }}>
                            <Button
                              variant="ghost"
                              onClick={() => handleEditDeposit(entry)}
                              data-testid={`button-edit-deposit-${entry.id}`}
                              style={{
                                fontWeight: 500,
                                fontSize: "13px",
                                color: "#008FED",
                                padding: "2px 6px",
                              }}
                            >
                              수정하기
                            </Button>
                          </div>
                        </div>
                      ))
                    )}

                    {/* 합계 행 */}
                    {depositEntries.length > 0 && (
                      <div 
                        className="flex items-center"
                        style={{ 
                          background: "rgba(12, 12, 12, 0.02)",
                          borderTop: "1px solid rgba(12, 12, 12, 0.08)",
                        }}
                      >
                        <div style={{ flex: 2, padding: "12px 8px", textAlign: "left", fontWeight: 600, fontSize: "14px", color: "rgba(12, 12, 12, 0.7)", paddingLeft: "16px" }}>합계</div>
                        <div style={{ flex: 1, padding: "12px 8px", textAlign: "center", fontWeight: 600, fontSize: "14px", color: "rgba(12, 12, 12, 0.8)" }}>{depositTotals.totalClaim.toLocaleString()}</div>
                        <div style={{ flex: 1, padding: "12px 8px", textAlign: "center", fontWeight: 600, fontSize: "14px", color: "rgba(12, 12, 12, 0.8)" }}>{depositTotals.totalDeposit.toLocaleString()}</div>
                        <div style={{ flex: 1.4 }}></div>
                      </div>
                    )}
                  </div>

                  {/* 총 승인금액/자기부담금/청구액/입금액/미수액 요약 */}
                  <div 
                    className="flex items-center"
                    style={{
                      background: "rgba(12, 12, 12, 0.02)",
                      border: "1px solid rgba(12, 12, 12, 0.08)",
                      borderRadius: "8px",
                      marginTop: "8px",
                    }}
                  >
                    <div style={{ flex: 1, padding: "12px 8px", textAlign: "center", borderRight: "1px solid rgba(12, 12, 12, 0.08)" }}>
                      <div style={{ fontWeight: 600, fontSize: "12px", color: "rgba(12, 12, 12, 0.5)", marginBottom: "4px" }}>총 승인금액</div>
                      <div style={{ fontWeight: 600, fontSize: "14px", color: "rgba(12, 12, 12, 0.8)" }}>{totalApprovedAmount.toLocaleString()}원</div>
                    </div>
                    <div style={{ flex: 1, padding: "12px 8px", textAlign: "center", borderRight: "1px solid rgba(12, 12, 12, 0.08)" }}>
                      <div style={{ fontWeight: 600, fontSize: "12px", color: "rgba(12, 12, 12, 0.5)", marginBottom: "4px" }}>자기부담금</div>
                      <div style={{ fontWeight: 600, fontSize: "14px", color: "rgba(12, 12, 12, 0.8)" }}>{parseInt(deductibleAmount || "0").toLocaleString()}원</div>
                    </div>
                    <div style={{ flex: 1, padding: "12px 8px", textAlign: "center", borderRight: "1px solid rgba(12, 12, 12, 0.08)" }}>
                      <div style={{ fontWeight: 600, fontSize: "12px", color: "rgba(12, 12, 12, 0.5)", marginBottom: "4px" }}>청구액</div>
                      <div style={{ fontWeight: 600, fontSize: "14px", color: "rgba(12, 12, 12, 0.8)" }}>{claimAmount.toLocaleString()}원</div>
                    </div>
                    <div style={{ flex: 1, padding: "12px 8px", textAlign: "center", borderRight: "1px solid rgba(12, 12, 12, 0.08)" }}>
                      <div style={{ fontWeight: 600, fontSize: "12px", color: "rgba(12, 12, 12, 0.5)", marginBottom: "4px" }}>입금액</div>
                      <div style={{ fontWeight: 600, fontSize: "14px", color: "rgba(12, 12, 12, 0.8)" }}>{depositTotals.totalDeposit.toLocaleString()}원</div>
                    </div>
                    <div style={{ flex: 1, padding: "12px 8px", textAlign: "center" }}>
                      <div style={{ fontWeight: 600, fontSize: "12px", color: "rgba(12, 12, 12, 0.5)", marginBottom: "4px" }}>미수액</div>
                      <div style={{ fontWeight: 600, fontSize: "14px", color: outstandingAmount > 0 ? "#E53935" : "rgba(12, 12, 12, 0.8)" }}>
                        {outstandingAmount > 0 ? outstandingAmount.toLocaleString() + "원" : "-"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 하단 버튼 영역 */}
        <div 
          className="flex justify-end items-center px-5 gap-3"
          style={{
            height: "111px",
            background: "#FDFDFD",
            borderTop: "1px solid rgba(12, 12, 12, 0.1)",
          }}
        >
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-invoice-management"
            style={{
              padding: "10px 20px",
              height: "48px",
              borderRadius: "6px",
              fontWeight: 500,
              fontSize: "18px",
              color: "rgba(12, 12, 12, 0.7)",
            }}
          >
            취소
          </Button>
          
          {/* 인보이스 승인 전: 인보이스 확인 버튼 (인보이스 승인 권한 필요) */}
          {!isInvoiceApproved && canApproveInvoice && (
            <Button
              onClick={() => setShowApprovalConfirm(true)}
              disabled={isSubmitting}
              data-testid="button-confirm-invoice"
              style={{
                padding: "10px 20px",
                height: "48px",
                background: "#008FED",
                borderRadius: "6px",
                fontWeight: 600,
                fontSize: "18px",
                color: "#FDFDFD",
              }}
            >
              {isSubmitting ? "처리중..." : "인보이스 확인"}
            </Button>
          )}
          
          {/* 인보이스 승인 후: 저장완료 버튼 (모든 관리자 가능) */}
          {isInvoiceApproved && isAdmin && (
            <Button
              onClick={handleSaveComplete}
              disabled={isSubmitting}
              data-testid="button-save-complete"
              style={{
                padding: "10px 20px",
                height: "48px",
                background: "#008FED",
                borderRadius: "6px",
                fontWeight: 600,
                fontSize: "18px",
                color: "#FDFDFD",
              }}
            >
              {isSubmitting ? "처리중..." : "저장완료"}
            </Button>
          )}
        </div>
      </DialogContent>

      {/* 인보이스 승인 확인 팝업 */}
      <AlertDialog open={showApprovalConfirm} onOpenChange={setShowApprovalConfirm}>
        <AlertDialogContent
          style={{
            maxWidth: "400px",
            padding: "32px",
            borderRadius: "16px",
            background: "#FFFFFF",
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle
              style={{
                fontWeight: 700,
                fontSize: "20px",
                color: "#0C0C0C",
                textAlign: "center",
                marginBottom: "8px",
              }}
            >
              인보이스를 승인하시겠습니까?
            </AlertDialogTitle>
            <AlertDialogDescription
              style={{
                fontWeight: 400,
                fontSize: "15px",
                color: "rgba(12, 12, 12, 0.6)",
                textAlign: "center",
              }}
            >
              승인 후 인보이스 발행·전송 기능이 활성화됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter
            className="flex justify-center gap-3 mt-6"
            style={{ justifyContent: "center" }}
          >
            <AlertDialogCancel
              data-testid="button-cancel-approval"
              style={{
                padding: "10px 24px",
                height: "44px",
                borderRadius: "6px",
                fontWeight: 500,
                fontSize: "16px",
                color: "#008FED",
                background: "transparent",
                border: "none",
              }}
            >
              취소
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowApprovalConfirm(false);
                handleApprove();
              }}
              data-testid="button-confirm-approval"
              style={{
                padding: "10px 32px",
                height: "44px",
                background: "#008FED",
                borderRadius: "6px",
                fontWeight: 600,
                fontSize: "16px",
                color: "#FFFFFF",
              }}
            >
              승인
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 입금내역 추가/수정 팝업 */}
      <Dialog open={showDepositForm} onOpenChange={setShowDepositForm}>
        <DialogContent
          style={{
            maxWidth: "480px",
            padding: "32px",
            borderRadius: "16px",
            background: "#FFFFFF",
          }}
        >
          <DialogHeader>
            <DialogTitle style={{ fontWeight: 700, fontSize: "20px", color: "#0C0C0C" }}>
              {newDeposit.depositDate} 입금 관리
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col gap-5 mt-6">
            {/* 입금일자 */}
            <div className="flex items-center gap-4">
              <label style={{ fontWeight: 600, fontSize: "15px", color: "#0C0C0C", width: "70px" }}>입금일자</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="justify-start text-left font-normal"
                    data-testid="button-deposit-entry-date"
                    style={{
                      height: "40px",
                      background: "#FFFFFF",
                      border: "1px solid rgba(12, 12, 12, 0.12)",
                      borderRadius: "8px",
                      fontWeight: 400,
                      fontSize: "14px",
                      color: newDeposit.depositDate ? "rgba(12, 12, 12, 0.8)" : "rgba(12, 12, 12, 0.4)",
                    }}
                  >
                    <CalendarIcon size={16} style={{ marginRight: "8px", color: "rgba(12, 12, 12, 0.5)" }} />
                    {newDeposit.depositDate || "날짜 선택"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={newDeposit.depositDate ? new Date(newDeposit.depositDate) : undefined}
                    onSelect={(date) => setNewDeposit({ ...newDeposit, depositDate: date ? format(date, "yyyy-MM-dd") : "" })}
                    locale={ko}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* 보험사 */}
            <div className="flex items-center gap-4">
              <label style={{ fontWeight: 600, fontSize: "15px", color: "#0C0C0C", width: "70px" }}>보험사</label>
              <Select
                value={newDeposit.insuranceCompany}
                onValueChange={(value) => setNewDeposit({ ...newDeposit, insuranceCompany: value })}
              >
                <SelectTrigger 
                  data-testid="select-deposit-insurance"
                  style={{
                    flex: 1,
                    height: "40px",
                    background: "#FFFFFF",
                    border: "1px solid rgba(12, 12, 12, 0.12)",
                    borderRadius: "8px",
                  }}
                >
                  <SelectValue placeholder="전체" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="전체">전체</SelectItem>
                  <SelectItem value="현대해상">현대해상</SelectItem>
                  <SelectItem value="삼성화재">삼성화재</SelectItem>
                  <SelectItem value="DB손해보험">DB손해보험</SelectItem>
                  <SelectItem value="KB손해보험">KB손해보험</SelectItem>
                  <SelectItem value="메리츠화재">메리츠화재</SelectItem>
                  <SelectItem value="한화손해보험">한화손해보험</SelectItem>
                  <SelectItem value="롯데손해보험">롯데손해보험</SelectItem>
                  <SelectItem value="흥국화재">흥국화재</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 청구액 */}
            <div className="flex flex-col gap-2">
              <label style={{ fontWeight: 600, fontSize: "15px", color: "#0C0C0C" }}>청구액</label>
              <div className="flex items-center" style={{ borderBottom: "1px solid rgba(12, 12, 12, 0.12)", paddingBottom: "8px" }}>
                <Input
                  type="text"
                  value={newDeposit.claimAmount ? newDeposit.claimAmount.toLocaleString() : ""}
                  onChange={(e) => {
                    const value = e.target.value.replace(/,/g, "").replace(/[^0-9]/g, "");
                    setNewDeposit({ ...newDeposit, claimAmount: parseInt(value) || 0 });
                  }}
                  data-testid="input-deposit-claim"
                  placeholder="금액입력"
                  className="border-0 text-left focus-visible:ring-0"
                  style={{
                    flex: 1,
                    fontWeight: 400,
                    fontSize: "15px",
                    color: "rgba(12, 12, 12, 0.8)",
                    padding: "0",
                  }}
                />
                <span style={{ fontWeight: 500, fontSize: "15px", color: "rgba(12, 12, 12, 0.8)" }}>원</span>
              </div>
            </div>

            {/* 입금 상태 */}
            <div className="flex items-center gap-4">
              <label style={{ fontWeight: 600, fontSize: "15px", color: "#0C0C0C", width: "70px" }}>입금여부</label>
              <RadioGroup 
                value={newDeposit.depositStatus} 
                onValueChange={(value: "입금" | "미입금") => setNewDeposit({ ...newDeposit, depositStatus: value })}
                className="flex items-center gap-6"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem 
                    value="입금" 
                    id="deposit-status-done"
                    data-testid="radio-deposit-done"
                    style={{ 
                      width: "18px", 
                      height: "18px",
                      borderColor: newDeposit.depositStatus === "입금" ? "#008FED" : "rgba(12, 12, 12, 0.2)",
                    }}
                  />
                  <Label 
                    htmlFor="deposit-status-done"
                    style={{ 
                      fontWeight: 500, 
                      fontSize: "15px", 
                      color: newDeposit.depositStatus === "입금" ? "#008FED" : "rgba(12, 12, 12, 0.6)",
                      cursor: "pointer",
                    }}
                  >
                    입금
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <RadioGroupItem 
                    value="미입금" 
                    id="deposit-status-pending"
                    data-testid="radio-deposit-pending"
                    style={{ 
                      width: "18px", 
                      height: "18px",
                      borderColor: newDeposit.depositStatus === "미입금" ? "#008FED" : "rgba(12, 12, 12, 0.2)",
                    }}
                  />
                  <Label 
                    htmlFor="deposit-status-pending"
                    style={{ 
                      fontWeight: 500, 
                      fontSize: "15px", 
                      color: newDeposit.depositStatus === "미입금" ? "#008FED" : "rgba(12, 12, 12, 0.6)",
                      cursor: "pointer",
                    }}
                  >
                    미입금
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* 입금액 */}
            <div className="flex flex-col gap-2">
              <label style={{ fontWeight: 600, fontSize: "15px", color: newDeposit.depositStatus === "미입금" ? "rgba(12, 12, 12, 0.4)" : "#0C0C0C" }}>입금액</label>
              <div className="flex items-center" style={{ borderBottom: "1px solid rgba(12, 12, 12, 0.12)", paddingBottom: "8px", opacity: newDeposit.depositStatus === "미입금" ? 0.5 : 1 }}>
                <Input
                  type="text"
                  value={newDeposit.depositAmount ? newDeposit.depositAmount.toLocaleString() : ""}
                  onChange={(e) => {
                    const value = e.target.value.replace(/,/g, "").replace(/[^0-9]/g, "");
                    setNewDeposit({ ...newDeposit, depositAmount: parseInt(value) || 0 });
                  }}
                  disabled={newDeposit.depositStatus === "미입금"}
                  data-testid="input-deposit-amount"
                  placeholder="금액입력"
                  className="border-0 text-left focus-visible:ring-0"
                  style={{
                    flex: 1,
                    fontWeight: 400,
                    fontSize: "15px",
                    color: "rgba(12, 12, 12, 0.8)",
                    padding: "0",
                    cursor: newDeposit.depositStatus === "미입금" ? "not-allowed" : "text",
                  }}
                />
                <span style={{ fontWeight: 500, fontSize: "15px", color: "rgba(12, 12, 12, 0.8)" }}>원</span>
              </div>
            </div>

            {/* 메모 */}
            <div className="flex flex-col gap-2">
              <label style={{ fontWeight: 600, fontSize: "15px", color: "#0C0C0C" }}>메모</label>
              <textarea
                value={newDeposit.memo}
                onChange={(e) => setNewDeposit({ ...newDeposit, memo: e.target.value })}
                data-testid="textarea-deposit-memo"
                placeholder="내용을 입력하세요"
                className="w-full resize-none"
                rows={3}
                style={{
                  padding: "0",
                  paddingBottom: "8px",
                  border: "none",
                  borderBottom: "1px solid rgba(12, 12, 12, 0.12)",
                  fontSize: "15px",
                  fontWeight: 400,
                  color: "rgba(12, 12, 12, 0.8)",
                  background: "transparent",
                  outline: "none",
                }}
              />
            </div>
          </div>

          <div 
            className="flex justify-center gap-3 mt-8 pt-6"
            style={{ borderTop: "1px solid rgba(12, 12, 12, 0.08)" }}
          >
            <Button
              variant="ghost"
              onClick={() => setShowDepositForm(false)}
              data-testid="button-cancel-deposit"
              style={{
                padding: "10px 24px",
                height: "44px",
                fontWeight: 500,
                fontSize: "16px",
                color: "rgba(12, 12, 12, 0.6)",
              }}
            >
              취소
            </Button>
            <Button
              onClick={editingDepositId ? handleSaveEditDeposit : handleAddDeposit}
              data-testid="button-save-deposit"
              style={{
                padding: "10px 32px",
                height: "44px",
                background: "#008FED",
                borderRadius: "6px",
                fontWeight: 600,
                fontSize: "16px",
                color: "#FFFFFF",
              }}
            >
              {editingDepositId ? "수정" : "추가"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
