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
}: InvoiceManagementPopupProps) {
  const { toast } = useToast();
  const { hasItem, isAdmin } = usePermissions();
  
  // 초기 로드 상태 추적 (팝업이 열릴 때만 데이터 로드)
  const lastLoadedCaseId = useRef<string | null>(null);
  
  const [submissionDate, setSubmissionDate] = useState<Date | undefined>(undefined);
  const [acceptanceDate, setAcceptanceDate] = useState<string>("");
  const [settlementStatus, setSettlementStatus] = useState<string>("정산");
  
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
    depositDate: format(new Date(), "yyyy-MM-dd"),
    insuranceCompany: caseData?.insuranceCompany || "전체",
    claimAmount: 0,
    depositStatus: "미입금",
    depositAmount: 0,
    memo: "",
  });
  
  // 인보이스 승인 여부 확인
  const isInvoiceApproved = !!caseData?.invoiceConfirmDate;
  
  // 인보이스 승인 권한이 있는 관리자만 확인 가능 (일반 관리자는 불가)
  const canApproveInvoice = hasItem("관리자 설정", "인보이스 승인");
  
  // 입금구분 변경 핸들러 - 상태 변경 시 협력업체 지급일 자동 설정
  const handleSettlementStatusChange = (value: string) => {
    setSettlementStatus(value);
    // 상태가 변경되면 현재 날짜를 협력업체 지급일로 자동 설정
    const today = format(new Date(), "yyyy-MM-dd");
    setPartnerPaymentDate(today);
  };

  // 총 승인금액 (손해방지비용 + 대물복구비용 승인금액)
  const totalApprovedAmount = 
    (parseInt(preventionApprovedAmount || "0") || 0) + 
    (parseInt(propertyApprovedAmount || "0") || 0);

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

  // 미수액 계산
  const outstandingAmount = useMemo(() => {
    const total = parseInt(totalApprovedAmountInput.replace(/,/g, "") || "0");
    const deductible = parseInt(deductibleAmount || "0");
    const claimTotal = total - deductible;
    return claimTotal - depositTotals.totalDeposit;
  }, [totalApprovedAmountInput, deductibleAmount, depositTotals.totalDeposit]);

  // 입금내역 추가
  const handleAddDeposit = () => {
    const newEntry: DepositEntry = {
      ...newDeposit,
      id: `deposit-${Date.now()}`,
    };
    setDepositEntries([...depositEntries, newEntry]);
    setNewDeposit({
      id: "",
      depositDate: format(new Date(), "yyyy-MM-dd"),
      insuranceCompany: caseData?.insuranceCompany || "전체",
      claimAmount: 0,
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
      depositDate: format(new Date(), "yyyy-MM-dd"),
      insuranceCompany: caseData?.insuranceCompany || "전체",
      claimAmount: 0,
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
      
      // 인보이스에 자기부담금 저장
      if (caseGroupPrefix) {
        const existingInvoice = await fetch(`/api/invoices/group/${encodeURIComponent(caseGroupPrefix)}`);
        const existingInvoiceData = await existingInvoice.json();
        
        if (existingInvoiceData && existingInvoiceData.id) {
          await apiRequest("PATCH", `/api/invoices/${existingInvoiceData.id}`, {
            deductible: deductibleAmount || "0",
          });
        }
      }
      
      // 정산 데이터도 업데이트 (정산조회에서 읽을 수 있도록)
      const settlementResponse = await fetch(`/api/settlements/case/${caseData.id}/latest`);
      const settlementData = await settlementResponse.json();
      
      if (settlementData && settlementData.id) {
        // 입금 내역에서 입금액과 입금일 계산
        const totalDepositAmount = depositEntries.reduce((sum, entry) => sum + entry.depositAmount, 0);
        const latestDepositDate = depositEntries.length > 0 
          ? depositEntries.sort((a, b) => b.depositDate.localeCompare(a.depositDate))[0].depositDate
          : null;
        
        // "정산"이 선택된 경우 종결일도 함께 저장
        const settlementUpdateData: Record<string, string> = {
          deductible: deductibleAmount || "0",
          discount: totalDepositAmount.toString(), // 입금액
          partnerPaymentAmount: partnerPaymentAmount.toString(), // 협력업체 지급금액
          partnerPaymentDate: partnerPaymentDate || todayDate, // 협력업체 지급일
        };
        
        if (latestDepositDate) {
          settlementUpdateData.settlementDate = latestDepositDate; // 입금일
        }
        
        // "정산"이 선택된 경우 종결일 설정
        if (settlementStatus === "정산") {
          settlementUpdateData.closingDate = todayDate; // 종결일
        }
        
        await apiRequest("PATCH", `/api/settlements/${settlementData.id}`, settlementUpdateData);
      }
      
      // "정산"이 선택된 경우 케이스 상태를 "정산완료"로 변경
      if (settlementStatus === "정산") {
        await apiRequest("PATCH", `/api/cases/${caseData.id}`, {
          status: "정산완료",
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settlements"] });
      
      toast({
        title: "저장 완료",
        description: settlementStatus === "정산" 
          ? "정산이 완료되었습니다." 
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
        setSettlementStatus("정산");
        
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

        // 자기부담금: 저장된 인보이스에서 로드
        const loadInvoiceData = async () => {
          try {
            const caseGroupPrefix = caseData.caseNumber?.split("-")[0] || "";
            if (caseGroupPrefix) {
              const response = await fetch(`/api/invoices/group/${encodeURIComponent(caseGroupPrefix)}`);
              if (response.ok) {
                const invoiceData = await response.json();
                if (invoiceData && invoiceData.deductible) {
                  setDeductibleAmount(invoiceData.deductible);
                } else {
                  setDeductibleAmount("0");
                }
              } else {
                setDeductibleAmount("0");
              }
            } else {
              setDeductibleAmount("0");
            }
          } catch (error) {
            console.error("Failed to load invoice data:", error);
            setDeductibleAmount("0");
          }
        };
        loadInvoiceData();
        
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
      
      await apiRequest("PATCH", `/api/cases/${caseData.id}`, {
        invoiceDamagePreventionAmount: preventionApprovedAmount,
        invoicePropertyRepairAmount: propertyApprovedAmount,
        invoiceConfirmDate: invoiceConfirmDateValue,
        status: settlementStatus === "정산" ? "정산완료" : 
                settlementStatus === "부분입금" ? "일부입금" : 
                caseData.status,
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      
      toast({
        title: "인보이스 승인 완료",
        description: `총 승인금액: ${totalApprovedAmount.toLocaleString()}원`,
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
            padding: "0 20px 0 8px", 
            maxHeight: "calc(90vh - 187px)",
          }}
        >
          <div className="flex flex-col gap-5 p-0" style={{ padding: "0 12px" }}>
            {/* 기본정보 섹션 */}
            <div
              style={{
                background: "#FFFFFF",
                border: "1px solid rgba(12, 12, 12, 0.12)",
                borderRadius: "12px",
                padding: "28px 32px 32px",
              }}
            >
              <div 
                className="flex items-center py-2.5 px-1 mb-3"
                style={{ fontWeight: 700, fontSize: "22px", color: "#0C0C0C" }}
              >
                기본정보
              </div>

              <div className="flex flex-col gap-0.5">
                {/* 제출일 */}
                <div className="flex items-center justify-between py-0 h-10">
                  <div className="flex items-center px-1" style={{ width: "80px" }}>
                    <span style={{ fontWeight: 600, fontSize: "16px", color: "rgba(12, 12, 12, 0.7)" }}>
                      제출일
                    </span>
                  </div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="justify-start text-left font-normal"
                        data-testid="button-submission-date"
                        style={{
                          width: "140px",
                          height: "40px",
                          background: "rgba(255, 255, 255, 0.04)",
                          border: "1px solid rgba(12, 12, 12, 0.3)",
                          borderRadius: "6px",
                          fontWeight: 500,
                          fontSize: "16px",
                          color: submissionDate ? "rgba(12, 12, 12, 0.8)" : "rgba(12, 12, 12, 0.7)",
                        }}
                      >
                        <CalendarIcon size={20} style={{ marginRight: "8px", color: "rgba(12, 12, 12, 0.7)" }} />
                        {submissionDate ? format(submissionDate, "yyyy-MM-dd") : "날짜 선택"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
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
                <div className="flex items-center justify-between py-0 h-11">
                  <div className="flex items-center px-1">
                    <span style={{ fontWeight: 600, fontSize: "16px", color: "rgba(12, 12, 12, 0.7)" }}>
                      수임일
                    </span>
                  </div>
                  <div className="flex items-center px-1">
                    <span style={{ fontWeight: 500, fontSize: "16px", color: "rgba(12, 12, 12, 0.8)" }}>
                      {acceptanceDate || "-"}
                    </span>
                  </div>
                </div>

                {/* 보험사 */}
                <div className="flex items-center justify-between py-0 h-11">
                  <div className="flex items-center px-1">
                    <span style={{ fontWeight: 600, fontSize: "16px", color: "rgba(12, 12, 12, 0.7)" }}>
                      보험사
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 px-1">
                    <span style={{ fontWeight: 500, fontSize: "16px", color: "rgba(12, 12, 12, 0.8)" }}>
                      {caseData.insuranceCompany || "-"}
                    </span>
                  </div>
                </div>

                {/* 담당자 */}
                <div className="flex items-center justify-between py-0 h-11">
                  <div className="flex items-center px-1">
                    <span style={{ fontWeight: 600, fontSize: "16px", color: "rgba(12, 12, 12, 0.7)" }}>
                      담당자
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 px-1">
                    <span style={{ fontWeight: 500, fontSize: "16px", color: "rgba(12, 12, 12, 0.8)" }}>
                      {managerName}
                    </span>
                    <span style={{ fontWeight: 500, fontSize: "16px", color: "rgba(12, 12, 12, 0.8)" }}>
                      {managerContact}
                    </span>
                  </div>
                </div>

                {/* 접수번호 */}
                <div className="flex items-center justify-between py-0 h-11">
                  <div className="flex items-center px-1">
                    <span style={{ fontWeight: 600, fontSize: "16px", color: "rgba(12, 12, 12, 0.7)" }}>
                      접수번호
                    </span>
                  </div>
                  <div className="flex items-center px-1">
                    <span style={{ fontWeight: 500, fontSize: "16px", color: "rgba(12, 12, 12, 0.8)" }}>
                      {caseData.caseNumber || "-"}
                    </span>
                  </div>
                </div>

                {/* 사고번호 */}
                <div className="flex items-center justify-between py-0 h-11">
                  <div className="flex items-center px-1">
                    <span style={{ fontWeight: 600, fontSize: "16px", color: "rgba(12, 12, 12, 0.7)" }}>
                      사고번호
                    </span>
                  </div>
                  <div className="flex items-center px-1">
                    <span style={{ fontWeight: 500, fontSize: "16px", color: "rgba(12, 12, 12, 0.8)" }}>
                      {caseData.insuranceAccidentNo || "-"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 협력/현장 정보 & 세금계산서/인보이스 섹션 */}
            <div className="flex gap-4">
              {/* 협력/현장 정보 */}
              <div
                className="flex-1"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid rgba(12, 12, 12, 0.12)",
                  borderRadius: "12px",
                  padding: "20px 24px",
                }}
              >
                <div 
                  className="flex items-center py-2 mb-2"
                  style={{ fontWeight: 700, fontSize: "18px", color: "#0C0C0C" }}
                >
                  협력/현장 정보
                </div>

                <div className="flex flex-col gap-1">
                  {/* 협력업체 */}
                  <div className="flex items-center justify-between py-1.5">
                    <span style={{ fontWeight: 600, fontSize: "14px", color: "rgba(12, 12, 12, 0.7)" }}>
                      협력업체
                    </span>
                    <span style={{ fontWeight: 500, fontSize: "14px", color: "rgba(12, 12, 12, 0.8)" }}>
                      {caseData.assignedPartner || "-"}
                    </span>
                  </div>

                  {/* 담당자 */}
                  <div className="flex items-center justify-between py-1.5">
                    <span style={{ fontWeight: 600, fontSize: "14px", color: "rgba(12, 12, 12, 0.7)" }}>
                      담당자
                    </span>
                    <span style={{ fontWeight: 500, fontSize: "14px", color: "rgba(12, 12, 12, 0.8)" }}>
                      {caseData.assignedPartnerManager || "-"} {caseData.assignedPartnerContact || ""}
                    </span>
                  </div>

                  {/* 사고유형 */}
                  <div className="flex items-center justify-between py-1.5">
                    <span style={{ fontWeight: 600, fontSize: "14px", color: "rgba(12, 12, 12, 0.7)" }}>
                      사고유형
                    </span>
                    <span style={{ fontWeight: 500, fontSize: "14px", color: "rgba(12, 12, 12, 0.8)" }}>
                      {caseData.accidentType || "-"}
                    </span>
                  </div>

                  {/* 공사유무 */}
                  <div className="flex items-center justify-between py-1.5">
                    <span style={{ fontWeight: 600, fontSize: "14px", color: "rgba(12, 12, 12, 0.7)" }}>
                      공사유무
                    </span>
                    <span style={{ fontWeight: 500, fontSize: "14px", color: "rgba(12, 12, 12, 0.8)" }}>
                      {caseData.recoveryType === "직접복구" ? "수리" : caseData.recoveryType === "선견적요청" ? "미수리" : "-"}
                    </span>
                  </div>
                </div>
              </div>

              {/* 세금계산서/인보이스 */}
              <div
                className="flex-1"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid rgba(12, 12, 12, 0.12)",
                  borderRadius: "12px",
                  padding: "20px 24px",
                }}
              >
                <div 
                  className="flex items-center py-2 mb-2"
                  style={{ fontWeight: 700, fontSize: "18px", color: "#0C0C0C" }}
                >
                  세금계산서/인보이스
                </div>

                <div className="flex flex-col gap-1">
                  {/* 세금계산서 확인 */}
                  <div className="flex items-center justify-between py-1.5">
                    <span style={{ fontWeight: 600, fontSize: "14px", color: "rgba(12, 12, 12, 0.7)" }}>
                      세금계산서 확인
                    </span>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="justify-start text-left font-normal"
                          data-testid="button-tax-invoice-date"
                          style={{
                            width: "120px",
                            height: "32px",
                            background: "rgba(255, 255, 255, 0.04)",
                            border: "1px solid rgba(12, 12, 12, 0.3)",
                            borderRadius: "6px",
                            fontWeight: 500,
                            fontSize: "13px",
                            color: taxInvoiceDate ? "rgba(12, 12, 12, 0.8)" : "rgba(12, 12, 12, 0.7)",
                          }}
                        >
                          <CalendarIcon size={14} style={{ marginRight: "4px", color: "rgba(12, 12, 12, 0.7)" }} />
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
                  <div className="flex items-center justify-between py-1.5">
                    <span style={{ fontWeight: 600, fontSize: "14px", color: "rgba(12, 12, 12, 0.7)" }}>
                      인보이스 확인
                    </span>
                    <span style={{ fontWeight: 500, fontSize: "14px", color: "rgba(12, 12, 12, 0.8)" }}>
                      {caseData.invoiceConfirmDate || "-"}
                    </span>
                  </div>

                  {/* 인보이스 속성 */}
                  <div className="flex items-center justify-between py-1.5">
                    <span style={{ fontWeight: 600, fontSize: "14px", color: "rgba(12, 12, 12, 0.7)" }}>
                      인보이스 속성
                    </span>
                    <span style={{ fontWeight: 500, fontSize: "14px", color: "rgba(12, 12, 12, 0.8)" }}>
                      {caseData.invoiceAttribute || "일반"}
                    </span>
                  </div>

                  {/* 메인 인보이스 */}
                  <div className="flex items-center justify-between py-1.5">
                    <span style={{ fontWeight: 600, fontSize: "14px", color: "rgba(12, 12, 12, 0.7)" }}>
                      메인 인보이스
                    </span>
                    <span style={{ fontWeight: 500, fontSize: "14px", color: "rgba(12, 12, 12, 0.8)" }}>
                      {caseData.mainInvoiceLink || "연동"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 금액 섹션 */}
            <div className="flex flex-col gap-2">
              <div 
                className="flex items-center py-2.5 px-1"
                style={{ fontWeight: 700, fontSize: "18px", color: "#0C0C0C" }}
              >
                금액
              </div>

              <div 
                className="flex flex-col"
                style={{ borderRadius: "6px", overflow: "hidden", border: "1px solid rgba(12, 12, 12, 0.08)" }}
              >
                {/* 헤더 행 */}
                <div className="flex items-center" style={{ height: "48px" }}>
                  <div 
                    className="flex items-center justify-center"
                    style={{ 
                      width: "120px", 
                      height: "48px", 
                      background: "rgba(12, 12, 12, 0.04)",
                      borderRight: "1px solid rgba(12, 12, 12, 0.08)",
                    }}
                  />
                  <div 
                    className="flex items-center justify-center flex-1"
                    style={{ 
                      height: "48px", 
                      background: "rgba(12, 12, 12, 0.04)",
                      borderRight: "1px solid rgba(12, 12, 12, 0.08)",
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: "15px", color: "rgba(12, 12, 12, 0.7)" }}>
                      손해방지비용
                    </span>
                  </div>
                  <div 
                    className="flex items-center justify-center flex-1"
                    style={{ 
                      height: "48px", 
                      background: "rgba(12, 12, 12, 0.04)",
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: "15px", color: "rgba(12, 12, 12, 0.7)" }}>
                      대물비용
                    </span>
                  </div>
                </div>

                {/* 견적금액 행 */}
                <div className="flex items-center" style={{ height: "48px", borderTop: "1px solid rgba(12, 12, 12, 0.08)" }}>
                  <div 
                    className="flex items-center justify-center"
                    style={{ 
                      width: "120px", 
                      height: "48px", 
                      background: "rgba(12, 12, 12, 0.04)",
                      borderRight: "1px solid rgba(12, 12, 12, 0.08)",
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: "14px", color: "rgba(12, 12, 12, 0.7)" }}>
                      견적금액(원)
                    </span>
                  </div>
                  <div 
                    className="flex items-center justify-center flex-1"
                    style={{ 
                      height: "48px", 
                      background: "#FFFFFF",
                      borderRight: "1px solid rgba(12, 12, 12, 0.08)",
                    }}
                  >
                    <span style={{ fontWeight: 500, fontSize: "15px", color: "rgba(12, 12, 12, 0.8)" }}>
                      {displayEstimates.preventionEstimate.toLocaleString()}원
                    </span>
                  </div>
                  <div 
                    className="flex items-center justify-center flex-1"
                    style={{ 
                      height: "48px", 
                      background: "#FFFFFF",
                    }}
                  >
                    <span style={{ fontWeight: 500, fontSize: "15px", color: "rgba(12, 12, 12, 0.8)" }}>
                      {displayEstimates.propertyEstimate.toLocaleString()}원
                    </span>
                  </div>
                </div>

                {/* 승인금액 행 */}
                <div className="flex items-center" style={{ height: "48px", borderTop: "1px solid rgba(12, 12, 12, 0.08)" }}>
                  <div 
                    className="flex items-center justify-center"
                    style={{ 
                      width: "120px", 
                      height: "48px", 
                      background: "rgba(12, 12, 12, 0.04)",
                      borderRight: "1px solid rgba(12, 12, 12, 0.08)",
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: "14px", color: "rgba(12, 12, 12, 0.7)" }}>
                      승인금액(원)
                    </span>
                  </div>
                  <div 
                    className="flex items-center justify-center flex-1"
                    style={{ 
                      height: "48px", 
                      background: "#FFFFFF",
                      borderRight: "1px solid rgba(12, 12, 12, 0.08)",
                    }}
                  >
                    <span style={{ fontWeight: 500, fontSize: "15px", color: "rgba(12, 12, 12, 0.8)" }}>
                      {(parseInt(preventionApprovedAmount || "0") || 0).toLocaleString()}원
                    </span>
                  </div>
                  <div 
                    className="flex items-center justify-center flex-1"
                    style={{ 
                      height: "48px", 
                      background: "#FFFFFF",
                    }}
                  >
                    <span style={{ fontWeight: 500, fontSize: "15px", color: "rgba(12, 12, 12, 0.8)" }}>
                      {(parseInt(propertyApprovedAmount || "0") || 0).toLocaleString()}원
                    </span>
                  </div>
                </div>

                {/* 차액 행 */}
                <div className="flex items-center" style={{ height: "48px", borderTop: "1px solid rgba(12, 12, 12, 0.08)" }}>
                  <div 
                    className="flex items-center justify-center"
                    style={{ 
                      width: "120px", 
                      height: "48px", 
                      background: "rgba(12, 12, 12, 0.04)",
                      borderRight: "1px solid rgba(12, 12, 12, 0.08)",
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: "14px", color: "rgba(12, 12, 12, 0.7)" }}>
                      차액(원)
                    </span>
                  </div>
                  <div 
                    className="flex items-center justify-center flex-1"
                    style={{ 
                      height: "48px", 
                      background: "#FFFFFF",
                      borderRight: "1px solid rgba(12, 12, 12, 0.08)",
                    }}
                  >
                    <span style={{ fontWeight: 500, fontSize: "15px", color: "rgba(12, 12, 12, 0.8)" }}>
                      {((parseInt(preventionApprovedAmount || "0") || 0) - displayEstimates.preventionEstimate).toLocaleString()}원
                    </span>
                  </div>
                  <div 
                    className="flex items-center justify-center flex-1"
                    style={{ 
                      height: "48px", 
                      background: "#FFFFFF",
                    }}
                  >
                    <span style={{ fontWeight: 500, fontSize: "15px", color: "rgba(12, 12, 12, 0.8)" }}>
                      {((parseInt(propertyApprovedAmount || "0") || 0) - displayEstimates.propertyEstimate).toLocaleString()}원
                    </span>
                  </div>
                </div>

                {/* 수정률 행 */}
                <div className="flex items-center" style={{ height: "48px", borderTop: "1px solid rgba(12, 12, 12, 0.08)" }}>
                  <div 
                    className="flex items-center justify-center"
                    style={{ 
                      width: "120px", 
                      height: "48px", 
                      background: "rgba(12, 12, 12, 0.04)",
                      borderRight: "1px solid rgba(12, 12, 12, 0.08)",
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: "14px", color: "rgba(12, 12, 12, 0.7)" }}>
                      수정률(%)
                    </span>
                  </div>
                  <div 
                    className="flex items-center justify-center flex-1"
                    style={{ 
                      height: "48px", 
                      background: "#FFFFFF",
                      borderRight: "1px solid rgba(12, 12, 12, 0.08)",
                    }}
                  >
                    <span style={{ fontWeight: 500, fontSize: "15px", color: "rgba(12, 12, 12, 0.8)" }}>
                      {displayEstimates.preventionEstimate > 0 
                        ? ((((parseInt(preventionApprovedAmount || "0") || 0) - displayEstimates.preventionEstimate) / displayEstimates.preventionEstimate) * 100).toFixed(1) + "%"
                        : "0%"}
                    </span>
                  </div>
                  <div 
                    className="flex items-center justify-center flex-1"
                    style={{ 
                      height: "48px", 
                      background: "#FFFFFF",
                    }}
                  >
                    <span style={{ fontWeight: 500, fontSize: "15px", color: "rgba(12, 12, 12, 0.8)" }}>
                      {displayEstimates.propertyEstimate > 0 
                        ? ((((parseInt(propertyApprovedAmount || "0") || 0) - displayEstimates.propertyEstimate) / displayEstimates.propertyEstimate) * 100).toFixed(1) + "%"
                        : "0%"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 정산 섹션 */}
            <div 
              className="flex flex-col gap-3 p-7"
              style={{
                background: "#FFFFFF",
                border: "1px solid rgba(12, 12, 12, 0.12)",
                borderRadius: "12px",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: "18px", color: "#0C0C0C", marginBottom: "8px" }}>
                정산
              </div>

              {/* 수수료(원) */}
              <div className="flex items-center justify-between py-2">
                <span style={{ fontWeight: 500, fontSize: "15px", color: "rgba(12, 12, 12, 0.7)" }}>
                  수수료(원)
                </span>
                <span style={{ fontWeight: 500, fontSize: "15px", color: "rgba(12, 12, 12, 0.8)" }}>
                  {feeAmount.toLocaleString()}원
                </span>
              </div>

              {/* 협력업체 지급액(원) */}
              <div className="flex items-center justify-between py-2">
                <span style={{ fontWeight: 500, fontSize: "15px", color: "rgba(12, 12, 12, 0.7)" }}>
                  협력업체 지급액(원)
                </span>
                <span style={{ fontWeight: 500, fontSize: "15px", color: "rgba(12, 12, 12, 0.8)" }}>
                  {partnerPaymentAmount.toLocaleString()}원
                </span>
              </div>

              {/* 협력업체 지급일 */}
              <div className="flex items-center justify-between py-2">
                <span style={{ fontWeight: 500, fontSize: "15px", color: "rgba(12, 12, 12, 0.7)" }}>
                  협력업체 지급일
                </span>
                <span style={{ fontWeight: 500, fontSize: "15px", color: "rgba(12, 12, 12, 0.8)" }}>
                  {partnerPaymentDate || "-"}
                </span>
              </div>

              {/* 입금일 */}
              <div className="flex items-center justify-between py-2">
                <span style={{ fontWeight: 500, fontSize: "15px", color: "rgba(12, 12, 12, 0.7)" }}>
                  입금일
                </span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="justify-start text-left font-normal"
                      data-testid="button-deposit-date"
                      style={{
                        width: "140px",
                        height: "32px",
                        background: "rgba(255, 255, 255, 0.04)",
                        border: "1px solid rgba(12, 12, 12, 0.3)",
                        borderRadius: "6px",
                        fontWeight: 500,
                        fontSize: "13px",
                        color: depositDate ? "rgba(12, 12, 12, 0.8)" : "rgba(12, 12, 12, 0.7)",
                      }}
                    >
                      <CalendarIcon size={14} style={{ marginRight: "4px", color: "rgba(12, 12, 12, 0.7)" }} />
                      {depositDate ? format(depositDate, "yyyy-MM-dd") : "날짜 선택"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={depositDate}
                      onSelect={setDepositDate}
                      locale={ko}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* 입금 구분 */}
              <div className="flex items-center justify-between py-2">
                <span style={{ fontWeight: 500, fontSize: "15px", color: "rgba(12, 12, 12, 0.7)" }}>
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

              {/* 총 승인 금액 */}
              <div className="flex items-center justify-between py-2">
                <span style={{ fontWeight: 500, fontSize: "15px", color: "rgba(12, 12, 12, 0.7)" }}>
                  총 승인 금액
                </span>
                <div className="flex items-center">
                  <Input
                    type="text"
                    value={totalApprovedAmountInput ? parseInt(totalApprovedAmountInput.replace(/,/g, "") || "0").toLocaleString() : "0"}
                    onChange={(e) => {
                      const value = e.target.value.replace(/,/g, "").replace(/[^0-9]/g, "");
                      setTotalApprovedAmountInput(value);
                    }}
                    data-testid="input-total-approved-amount"
                    className="text-right"
                    style={{
                      width: "140px",
                      fontWeight: 500,
                      fontSize: "15px",
                      color: "rgba(12, 12, 12, 0.8)",
                    }}
                  />
                  <span style={{ fontWeight: 500, fontSize: "15px", color: "rgba(12, 12, 12, 0.8)", marginLeft: "4px" }}>
                    원
                  </span>
                </div>
              </div>

              {/* 자기부담금 */}
              <div className="flex items-center justify-between py-2">
                <span style={{ fontWeight: 500, fontSize: "15px", color: "rgba(12, 12, 12, 0.7)" }}>
                  자기부담금
                </span>
                <div className="flex items-center">
                  <Input
                    type="text"
                    value={deductibleAmount ? parseInt(deductibleAmount).toLocaleString() : "0"}
                    onChange={(e) => {
                      const value = e.target.value.replace(/,/g, "").replace(/[^0-9]/g, "");
                      setDeductibleAmount(value);
                    }}
                    data-testid="input-deductible-amount"
                    className="text-right"
                    style={{
                      width: "140px",
                      fontWeight: 500,
                      fontSize: "15px",
                      color: "rgba(12, 12, 12, 0.8)",
                    }}
                  />
                  <span style={{ fontWeight: 500, fontSize: "15px", color: "rgba(12, 12, 12, 0.8)", marginLeft: "4px" }}>
                    원
                  </span>
                </div>
              </div>

              {/* 비고란 */}
              <div className="flex flex-col gap-2 mt-4">
                <span style={{ fontWeight: 600, fontSize: "14px", color: "rgba(12, 12, 12, 0.7)" }}>
                  비고
                </span>
                <textarea
                  placeholder="내용을 입력하세요"
                  data-testid="textarea-invoice-remarks"
                  className="w-full resize-none"
                  rows={4}
                  style={{
                    padding: "12px 16px",
                    border: "1px solid rgba(12, 12, 12, 0.12)",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: 400,
                    color: "rgba(12, 12, 12, 0.8)",
                    background: "#FFFFFF",
                    outline: "none",
                  }}
                />
              </div>

              {/* 입금관리 섹션 - 인보이스 승인 후에만 표시 */}
              {isInvoiceApproved && (
                <div className="flex flex-col gap-3 mt-6">
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
                          depositDate: format(new Date(), "yyyy-MM-dd"),
                          insuranceCompany: caseData?.insuranceCompany || "전체",
                          claimAmount: 0,
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
                      <div style={{ fontWeight: 600, fontSize: "14px", color: "rgba(12, 12, 12, 0.8)" }}>{parseInt(totalApprovedAmountInput.replace(/,/g, "") || "0").toLocaleString()}원</div>
                    </div>
                    <div style={{ flex: 1, padding: "12px 8px", textAlign: "center", borderRight: "1px solid rgba(12, 12, 12, 0.08)" }}>
                      <div style={{ fontWeight: 600, fontSize: "12px", color: "rgba(12, 12, 12, 0.5)", marginBottom: "4px" }}>자기부담금</div>
                      <div style={{ fontWeight: 600, fontSize: "14px", color: "rgba(12, 12, 12, 0.8)" }}>{parseInt(deductibleAmount || "0").toLocaleString()}원</div>
                    </div>
                    <div style={{ flex: 1, padding: "12px 8px", textAlign: "center", borderRight: "1px solid rgba(12, 12, 12, 0.08)" }}>
                      <div style={{ fontWeight: 600, fontSize: "12px", color: "rgba(12, 12, 12, 0.5)", marginBottom: "4px" }}>청구액</div>
                      <div style={{ fontWeight: 600, fontSize: "14px", color: "rgba(12, 12, 12, 0.8)" }}>{depositTotals.totalClaim.toLocaleString()}원</div>
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
              )}
            </div>
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
              <label style={{ fontWeight: 600, fontSize: "15px", color: "#0C0C0C", width: "70px" }}>입금</label>
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
              <label style={{ fontWeight: 600, fontSize: "15px", color: "#0C0C0C" }}>입금액</label>
              <div className="flex items-center" style={{ borderBottom: "1px solid rgba(12, 12, 12, 0.12)", paddingBottom: "8px" }}>
                <Input
                  type="text"
                  value={newDeposit.depositAmount ? newDeposit.depositAmount.toLocaleString() : ""}
                  onChange={(e) => {
                    const value = e.target.value.replace(/,/g, "").replace(/[^0-9]/g, "");
                    setNewDeposit({ ...newDeposit, depositAmount: parseInt(value) || 0 });
                  }}
                  data-testid="input-deposit-amount"
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
