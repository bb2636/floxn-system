import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
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
}

const FIXED_FIELD_DISPATCH_COST = 100000;

function getCaseSuffix(caseNumber: string | null | undefined): number {
  if (!caseNumber) return -1;
  const parts = caseNumber.split("-");
  if (parts.length < 2) return -1;
  const suffix = parseInt(parts[parts.length - 1], 10);
  return isNaN(suffix) ? -1 : suffix;
}

export function InvoiceManagementPopup({ 
  open, 
  onOpenChange, 
  caseData,
  estimateData,
  relatedCases = [],
  managerName = "-",
  managerContact = "-",
}: InvoiceManagementPopupProps) {
  const { toast } = useToast();
  const { hasItem, isAdmin } = usePermissions();
  
  const [submissionDate, setSubmissionDate] = useState<Date | undefined>(undefined);
  const [acceptanceDate, setAcceptanceDate] = useState<string>("");
  const [settlementStatus, setSettlementStatus] = useState<string>("정산");
  
  const [preventionApprovedAmount, setPreventionApprovedAmount] = useState<string>("");
  const [propertyApprovedAmount, setPropertyApprovedAmount] = useState<string>("");
  const [deductibleAmount, setDeductibleAmount] = useState<string>("0");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const canApproveInvoice = hasItem("관리자 설정", "인보이스 승인") || isAdmin;

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
  
  useEffect(() => {
    if (open && caseData) {
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

      setDeductibleAmount("0");
    }
  }, [open, caseData, displayEstimates]);

  const totalApprovedAmount = 
    (parseInt(preventionApprovedAmount || "0") || 0) + 
    (parseInt(propertyApprovedAmount || "0") || 0);

  const getCaseNumberPrefix = (caseNumber: string | null | undefined): string => {
    if (!caseNumber) return "";
    const parts = caseNumber.split("-");
    return parts[0] || caseNumber;
  };

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
                            color: caseData.taxInvoiceConfirmDate ? "rgba(12, 12, 12, 0.8)" : "rgba(12, 12, 12, 0.7)",
                          }}
                        >
                          <CalendarIcon size={14} style={{ marginRight: "4px", color: "rgba(12, 12, 12, 0.7)" }} />
                          {caseData.taxInvoiceConfirmDate || "날짜 선택"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                          mode="single"
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

            {/* 상태 선택 섹션 */}
            <div 
              className="flex flex-col gap-3 p-7"
              style={{
                background: "#FFFFFF",
                border: "1px solid rgba(12, 12, 12, 0.12)",
                borderRadius: "12px",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: "18px", color: "#0C0C0C", marginBottom: "8px" }}>
                상태
              </div>

              <RadioGroup 
                value={settlementStatus} 
                onValueChange={setSettlementStatus}
                className="flex items-center gap-6"
              >
                <div className="flex items-center gap-1">
                  <RadioGroupItem 
                    value="정산" 
                    id="status-settlement"
                    data-testid="radio-status-settlement"
                    style={{ 
                      width: "18px", 
                      height: "18px",
                      borderColor: settlementStatus === "정산" ? "#008FED" : "rgba(12, 12, 12, 0.1)",
                    }}
                  />
                  <Label 
                    htmlFor="status-settlement"
                    style={{ 
                      fontWeight: 500, 
                      fontSize: "15px", 
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
                    style={{ 
                      width: "18px", 
                      height: "18px",
                      borderColor: settlementStatus === "부분입금" ? "#008FED" : "rgba(12, 12, 12, 0.1)",
                    }}
                  />
                  <Label 
                    htmlFor="status-partial"
                    style={{ 
                      fontWeight: 500, 
                      fontSize: "15px", 
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
                    style={{ 
                      width: "18px", 
                      height: "18px",
                      borderColor: settlementStatus === "청구변경" ? "#008FED" : "rgba(12, 12, 12, 0.1)",
                    }}
                  />
                  <Label 
                    htmlFor="status-change"
                    style={{ 
                      fontWeight: 500, 
                      fontSize: "15px", 
                      color: settlementStatus === "청구변경" ? "#008FED" : "rgba(12, 12, 12, 0.8)",
                      cursor: "pointer",
                    }}
                  >
                    청구변경
                  </Label>
                </div>
              </RadioGroup>

              {/* 총 승인 금액 */}
              <div className="flex items-center justify-between py-0 h-11 mt-4">
                <div className="flex items-center px-1">
                  <span style={{ fontWeight: 600, fontSize: "16px", color: "rgba(12, 12, 12, 0.7)" }}>
                    총 승인 금액
                  </span>
                </div>
                <div className="flex items-center px-1">
                  <span style={{ fontWeight: 600, fontSize: "16px", color: "#008FED" }}>
                    {totalApprovedAmount.toLocaleString()}원
                  </span>
                </div>
              </div>

              {/* 자기부담금 */}
              <div className="flex items-center justify-between py-0 h-11">
                <div className="flex items-center px-1">
                  <span style={{ fontWeight: 600, fontSize: "16px", color: "rgba(12, 12, 12, 0.7)" }}>
                    자기부담금
                  </span>
                </div>
                <div className="flex items-center px-1">
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
                      width: "120px",
                      fontWeight: 500,
                      fontSize: "16px",
                      color: "rgba(12, 12, 12, 0.8)",
                    }}
                  />
                  <span style={{ fontWeight: 500, fontSize: "16px", color: "rgba(12, 12, 12, 0.8)", marginLeft: "4px" }}>
                    원
                  </span>
                </div>
              </div>
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
          {canApproveInvoice && (
            <Button
              onClick={handleApprove}
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
