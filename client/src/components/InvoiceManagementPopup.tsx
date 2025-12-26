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
  const [fieldDispatchPreventionAmount, setFieldDispatchPreventionAmount] = useState<string>("0");
  const [fieldDispatchPropertyAmount, setFieldDispatchPropertyAmount] = useState<string>("0");
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

  const hasPreventionDirectRecovery = categorizedCases.prevention.directRecovery.length > 0;
  const hasPreventionFieldDispatch = categorizedCases.prevention.fieldDispatch.length > 0;
  const hasPropertyDirectRecovery = categorizedCases.property.directRecovery.length > 0;
  const hasPropertyFieldDispatch = categorizedCases.property.fieldDispatch.length > 0;

  const calculatedEstimates = useMemo(() => {
    const preventionEstimate = categorizedCases.prevention.directRecovery.reduce(
      (sum, c) => sum + (c.estimateAmount || 0), 0
    );
    const preventionFieldDispatchEstimate = categorizedCases.prevention.fieldDispatch.length * FIXED_FIELD_DISPATCH_COST;
    const propertyEstimate = categorizedCases.property.directRecovery.reduce(
      (sum, c) => sum + (c.estimateAmount || 0), 0
    );
    const propertyFieldDispatchEstimate = categorizedCases.property.fieldDispatch.length * FIXED_FIELD_DISPATCH_COST;

    return {
      preventionEstimate,
      preventionFieldDispatchEstimate,
      propertyEstimate,
      propertyFieldDispatchEstimate,
    };
  }, [categorizedCases]);
  
  useEffect(() => {
    if (open && caseData) {
      setSubmissionDate(undefined);
      setAcceptanceDate(caseData.receptionDate || "");
      setSettlementStatus("정산");
      
      if (hasPreventionDirectRecovery) {
        setPreventionApprovedAmount(
          caseData.invoiceDamagePreventionAmount || 
          calculatedEstimates.preventionEstimate.toString() ||
          estimateData?.preventionApproved?.toString() || 
          ""
        );
      } else {
        setPreventionApprovedAmount("0");
      }

      if (hasPreventionFieldDispatch) {
        setFieldDispatchPreventionAmount(calculatedEstimates.preventionFieldDispatchEstimate.toString());
      } else {
        setFieldDispatchPreventionAmount("0");
      }

      if (hasPropertyDirectRecovery) {
        setPropertyApprovedAmount(
          caseData.invoicePropertyRepairAmount || 
          calculatedEstimates.propertyEstimate.toString() ||
          estimateData?.propertyApproved?.toString() || 
          ""
        );
      } else {
        setPropertyApprovedAmount("0");
      }

      if (hasPropertyFieldDispatch) {
        setFieldDispatchPropertyAmount(calculatedEstimates.propertyFieldDispatchEstimate.toString());
      } else {
        setFieldDispatchPropertyAmount("0");
      }

      setDeductibleAmount("0");
    }
  }, [open, caseData, estimateData, hasPreventionDirectRecovery, hasPreventionFieldDispatch, hasPropertyDirectRecovery, hasPropertyFieldDispatch, calculatedEstimates]);

  const totalApprovedAmount = 
    (parseInt(preventionApprovedAmount || "0") || 0) + 
    (parseInt(propertyApprovedAmount || "0") || 0) +
    (parseInt(fieldDispatchPreventionAmount || "0") || 0) +
    (parseInt(fieldDispatchPropertyAmount || "0") || 0);

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
      const hasAnyFieldDispatch = hasPreventionFieldDispatch || hasPropertyFieldDispatch;
      const totalFieldDispatch = (parseInt(fieldDispatchPreventionAmount || "0") || 0) + (parseInt(fieldDispatchPropertyAmount || "0") || 0);
      
      const invoiceData = {
        caseId: caseData.id,
        caseGroupPrefix,
        type: caseData.recoveryType || "직접복구",
        status: "approved" as const,
        damagePreventionEstimate: calculatedEstimates.preventionEstimate.toString(),
        damagePreventionApproved: preventionApprovedAmount || "0",
        propertyRepairEstimate: calculatedEstimates.propertyEstimate.toString(),
        propertyRepairApproved: propertyApprovedAmount || "0",
        fieldDispatchAmount: hasAnyFieldDispatch ? totalFieldDispatch.toString() : null,
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
      
      await apiRequest("PATCH", `/api/cases/${caseData.id}`, {
        invoiceDamagePreventionAmount: preventionApprovedAmount,
        invoicePropertyRepairAmount: propertyApprovedAmount,
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

  const showAnyAmountRow = hasPreventionDirectRecovery || hasPreventionFieldDispatch || hasPropertyDirectRecovery || hasPropertyFieldDispatch;

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

            {/* 금액 섹션 */}
            {showAnyAmountRow && (
              <div className="flex flex-col gap-2">
                <div 
                  className="flex items-center py-2.5 px-1"
                  style={{ fontWeight: 700, fontSize: "18px", color: "#0C0C0C" }}
                >
                  금액
                </div>

                <div 
                  className="flex flex-col"
                  style={{ borderRadius: "6px", overflow: "hidden" }}
                >
                  {/* 헤더 행 */}
                  <div className="flex items-center" style={{ height: "43px" }}>
                    <div 
                      className="flex items-center justify-center"
                      style={{ 
                        width: "129px", 
                        height: "43px", 
                        background: "rgba(12, 12, 12, 0.04)",
                        padding: "17.5px 8px",
                      }}
                    />
                    <div 
                      className="flex items-center flex-1"
                      style={{ 
                        height: "43px", 
                        background: "rgba(12, 12, 12, 0.04)",
                        padding: "17.5px 12px",
                      }}
                    >
                      <span style={{ fontWeight: 600, fontSize: "15px", color: "rgba(12, 12, 12, 0.7)" }}>
                        항목
                      </span>
                    </div>
                    <div 
                      className="flex items-center"
                      style={{ 
                        width: "150px",
                        height: "43px", 
                        background: "rgba(12, 12, 12, 0.04)",
                        padding: "17.5px 12px",
                      }}
                    >
                      <span style={{ fontWeight: 600, fontSize: "15px", color: "rgba(12, 12, 12, 0.7)" }}>
                        견적금액
                      </span>
                    </div>
                    <div 
                      className="flex items-center"
                      style={{ 
                        width: "180px",
                        height: "43px", 
                        background: "rgba(12, 12, 12, 0.04)",
                        padding: "17.5px 12px",
                      }}
                    >
                      <span style={{ fontWeight: 600, fontSize: "15px", color: "rgba(12, 12, 12, 0.7)" }}>
                        승인금액
                      </span>
                    </div>
                  </div>

                  {/* 손해방지비용 (직접복구 -0 cases) */}
                  {hasPreventionDirectRecovery && (
                    <div className="flex items-center" style={{ height: "54px" }}>
                      <div 
                        className="flex items-center"
                        style={{ 
                          width: "129px", 
                          height: "54px", 
                          background: "rgba(12, 12, 12, 0.04)",
                          padding: "17.5px 12px",
                        }}
                      >
                        <span style={{ fontWeight: 600, fontSize: "15px", color: "rgba(12, 12, 12, 0.7)" }}>
                          손해방지
                        </span>
                      </div>
                      <div 
                        className="flex items-center flex-1"
                        style={{ 
                          height: "54px", 
                          background: "#FFFFFF",
                          padding: "17.5px 12px",
                          border: "1px solid rgba(12, 12, 12, 0.08)",
                        }}
                      >
                        <span style={{ fontWeight: 500, fontSize: "15px", color: "rgba(12, 12, 12, 0.8)" }}>
                          손해방지비용
                        </span>
                      </div>
                      <div 
                        className="flex items-center"
                        style={{ 
                          width: "150px",
                          height: "54px", 
                          background: "#FFFFFF",
                          padding: "17.5px 12px",
                          border: "1px solid rgba(12, 12, 12, 0.08)",
                        }}
                      >
                        <span style={{ fontWeight: 500, fontSize: "15px", color: "rgba(12, 12, 12, 0.8)" }}>
                          {calculatedEstimates.preventionEstimate.toLocaleString()}원
                        </span>
                      </div>
                      <div 
                        className="flex items-center"
                        style={{ 
                          width: "180px",
                          height: "54px", 
                          background: "#FFFFFF",
                          padding: "8px 12px",
                          border: "1px solid rgba(12, 12, 12, 0.08)",
                        }}
                      >
                        <Input
                          type="text"
                          value={preventionApprovedAmount ? parseInt(preventionApprovedAmount).toLocaleString() : ""}
                          onChange={(e) => {
                            const value = e.target.value.replace(/,/g, "").replace(/[^0-9]/g, "");
                            setPreventionApprovedAmount(value);
                          }}
                          data-testid="input-prevention-approved-amount"
                          style={{
                            fontWeight: 500,
                            fontSize: "15px",
                            color: "rgba(12, 12, 12, 0.8)",
                            border: "none",
                            background: "transparent",
                            padding: 0,
                            height: "auto",
                          }}
                        />
                        <span style={{ fontWeight: 500, fontSize: "15px", color: "rgba(12, 12, 12, 0.8)", marginLeft: "4px" }}>원</span>
                      </div>
                    </div>
                  )}

                  {/* 현장출동비용 - 손해방지 (선견적요청 -0 cases) */}
                  {hasPreventionFieldDispatch && (
                    <div className="flex items-center" style={{ height: "54px" }}>
                      <div 
                        className="flex items-center"
                        style={{ 
                          width: "129px", 
                          height: "54px", 
                          background: "rgba(12, 12, 12, 0.04)",
                          padding: "17.5px 12px",
                        }}
                      >
                        <span style={{ fontWeight: 600, fontSize: "15px", color: "rgba(12, 12, 12, 0.7)" }}>
                          손해방지
                        </span>
                      </div>
                      <div 
                        className="flex items-center flex-1"
                        style={{ 
                          height: "54px", 
                          background: "#FFFFFF",
                          padding: "17.5px 12px",
                          border: "1px solid rgba(12, 12, 12, 0.08)",
                        }}
                      >
                        <span style={{ fontWeight: 500, fontSize: "15px", color: "rgba(12, 12, 12, 0.8)" }}>
                          현장출동비용 ({categorizedCases.prevention.fieldDispatch.length}건)
                        </span>
                      </div>
                      <div 
                        className="flex items-center"
                        style={{ 
                          width: "150px",
                          height: "54px", 
                          background: "#FFFFFF",
                          padding: "17.5px 12px",
                          border: "1px solid rgba(12, 12, 12, 0.08)",
                        }}
                      >
                        <span style={{ fontWeight: 500, fontSize: "15px", color: "rgba(12, 12, 12, 0.8)" }}>
                          {calculatedEstimates.preventionFieldDispatchEstimate.toLocaleString()}원
                        </span>
                      </div>
                      <div 
                        className="flex items-center"
                        style={{ 
                          width: "180px",
                          height: "54px", 
                          background: "#FFFFFF",
                          padding: "8px 12px",
                          border: "1px solid rgba(12, 12, 12, 0.08)",
                        }}
                      >
                        <Input
                          type="text"
                          value={fieldDispatchPreventionAmount ? parseInt(fieldDispatchPreventionAmount).toLocaleString() : ""}
                          onChange={(e) => {
                            const value = e.target.value.replace(/,/g, "").replace(/[^0-9]/g, "");
                            setFieldDispatchPreventionAmount(value);
                          }}
                          data-testid="input-field-dispatch-prevention-amount"
                          style={{
                            fontWeight: 500,
                            fontSize: "15px",
                            color: "rgba(12, 12, 12, 0.8)",
                            border: "none",
                            background: "transparent",
                            padding: 0,
                            height: "auto",
                          }}
                        />
                        <span style={{ fontWeight: 500, fontSize: "15px", color: "rgba(12, 12, 12, 0.8)", marginLeft: "4px" }}>원</span>
                      </div>
                    </div>
                  )}

                  {/* 대물복구비용 (직접복구 -1+ cases) */}
                  {hasPropertyDirectRecovery && (
                    <div className="flex items-center" style={{ height: "54px" }}>
                      <div 
                        className="flex items-center"
                        style={{ 
                          width: "129px", 
                          height: "54px", 
                          background: "rgba(12, 12, 12, 0.04)",
                          padding: "17.5px 12px",
                        }}
                      >
                        <span style={{ fontWeight: 600, fontSize: "15px", color: "rgba(12, 12, 12, 0.7)" }}>
                          피해세대
                        </span>
                      </div>
                      <div 
                        className="flex items-center flex-1"
                        style={{ 
                          height: "54px", 
                          background: "#FFFFFF",
                          padding: "17.5px 12px",
                          border: "1px solid rgba(12, 12, 12, 0.08)",
                        }}
                      >
                        <span style={{ fontWeight: 500, fontSize: "15px", color: "rgba(12, 12, 12, 0.8)" }}>
                          대물복구비용
                        </span>
                      </div>
                      <div 
                        className="flex items-center"
                        style={{ 
                          width: "150px",
                          height: "54px", 
                          background: "#FFFFFF",
                          padding: "17.5px 12px",
                          border: "1px solid rgba(12, 12, 12, 0.08)",
                        }}
                      >
                        <span style={{ fontWeight: 500, fontSize: "15px", color: "rgba(12, 12, 12, 0.8)" }}>
                          {calculatedEstimates.propertyEstimate.toLocaleString()}원
                        </span>
                      </div>
                      <div 
                        className="flex items-center"
                        style={{ 
                          width: "180px",
                          height: "54px", 
                          background: "#FFFFFF",
                          padding: "8px 12px",
                          border: "1px solid rgba(12, 12, 12, 0.08)",
                        }}
                      >
                        <Input
                          type="text"
                          value={propertyApprovedAmount ? parseInt(propertyApprovedAmount).toLocaleString() : ""}
                          onChange={(e) => {
                            const value = e.target.value.replace(/,/g, "").replace(/[^0-9]/g, "");
                            setPropertyApprovedAmount(value);
                          }}
                          data-testid="input-property-approved-amount"
                          style={{
                            fontWeight: 500,
                            fontSize: "15px",
                            color: "rgba(12, 12, 12, 0.8)",
                            border: "none",
                            background: "transparent",
                            padding: 0,
                            height: "auto",
                          }}
                        />
                        <span style={{ fontWeight: 500, fontSize: "15px", color: "rgba(12, 12, 12, 0.8)", marginLeft: "4px" }}>원</span>
                      </div>
                    </div>
                  )}

                  {/* 현장출동비용 - 피해세대 (선견적요청 -1+ cases) */}
                  {hasPropertyFieldDispatch && (
                    <div className="flex items-center" style={{ height: "54px" }}>
                      <div 
                        className="flex items-center"
                        style={{ 
                          width: "129px", 
                          height: "54px", 
                          background: "rgba(12, 12, 12, 0.04)",
                          padding: "17.5px 12px",
                        }}
                      >
                        <span style={{ fontWeight: 600, fontSize: "15px", color: "rgba(12, 12, 12, 0.7)" }}>
                          피해세대
                        </span>
                      </div>
                      <div 
                        className="flex items-center flex-1"
                        style={{ 
                          height: "54px", 
                          background: "#FFFFFF",
                          padding: "17.5px 12px",
                          border: "1px solid rgba(12, 12, 12, 0.08)",
                        }}
                      >
                        <span style={{ fontWeight: 500, fontSize: "15px", color: "rgba(12, 12, 12, 0.8)" }}>
                          현장출동비용 ({categorizedCases.property.fieldDispatch.length}건)
                        </span>
                      </div>
                      <div 
                        className="flex items-center"
                        style={{ 
                          width: "150px",
                          height: "54px", 
                          background: "#FFFFFF",
                          padding: "17.5px 12px",
                          border: "1px solid rgba(12, 12, 12, 0.08)",
                        }}
                      >
                        <span style={{ fontWeight: 500, fontSize: "15px", color: "rgba(12, 12, 12, 0.8)" }}>
                          {calculatedEstimates.propertyFieldDispatchEstimate.toLocaleString()}원
                        </span>
                      </div>
                      <div 
                        className="flex items-center"
                        style={{ 
                          width: "180px",
                          height: "54px", 
                          background: "#FFFFFF",
                          padding: "8px 12px",
                          border: "1px solid rgba(12, 12, 12, 0.08)",
                        }}
                      >
                        <Input
                          type="text"
                          value={fieldDispatchPropertyAmount ? parseInt(fieldDispatchPropertyAmount).toLocaleString() : ""}
                          onChange={(e) => {
                            const value = e.target.value.replace(/,/g, "").replace(/[^0-9]/g, "");
                            setFieldDispatchPropertyAmount(value);
                          }}
                          data-testid="input-field-dispatch-property-amount"
                          style={{
                            fontWeight: 500,
                            fontSize: "15px",
                            color: "rgba(12, 12, 12, 0.8)",
                            border: "none",
                            background: "transparent",
                            padding: 0,
                            height: "auto",
                          }}
                        />
                        <span style={{ fontWeight: 500, fontSize: "15px", color: "rgba(12, 12, 12, 0.8)", marginLeft: "4px" }}>원</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

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
