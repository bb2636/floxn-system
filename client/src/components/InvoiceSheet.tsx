import { useState, useRef, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { X, Calendar, FileText, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface InvoiceSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseData: {
    id: string;
    caseNumber?: string | null;
    insuranceCompany?: string | null;
    insuranceAccidentNo?: string | null;
    receptionDate?: string | null;
    invoiceDamagePreventionAmount?: string | null;
    invoicePropertyRepairAmount?: string | null;
    invoiceRemarks?: string | null;
    recoveryType?: string | null;
    estimateAmount?: string | null;
    assessorId?: string | null;
    assignedPartner?: string | null;
    accidentType?: string | null;
    insuranceDepartment?: string | null;
    insuranceContact?: string | null;
    insuranceManager?: string | null;
  } | null;
  relatedCases?: Array<{
    id: string;
    caseNumber?: string | null;
    recoveryType?: string | null;
    estimateAmount?: string | null;
  }>;
}

const getCaseSuffix = (caseNumber: string | null | undefined): number => {
  if (!caseNumber) return 0;
  const parts = caseNumber.split("-");
  return parts.length > 1 ? parseInt(parts[parts.length - 1]) || 0 : 0;
};

export function getCaseNumberPrefix(caseNumber: string | null | undefined): string | null {
  if (!caseNumber) return null;
  const parts = caseNumber.split("-");
  if (parts.length < 2) return caseNumber;
  return parts.slice(0, -1).join("-");
}

export function InvoiceSheet({ open, onOpenChange, caseData, relatedCases = [] }: InvoiceSheetProps) {
  const { toast } = useToast();
  const invoicePdfRef = useRef<HTMLDivElement>(null);
  
  const [invoiceDamagePreventionAmount, setInvoiceDamagePreventionAmount] = useState<string>("");
  const [invoicePropertyRepairAmount, setInvoicePropertyRepairAmount] = useState<string>("");
  const [fieldDispatchPreventionAmount, setFieldDispatchPreventionAmount] = useState<string>("");
  const [fieldDispatchPropertyAmount, setFieldDispatchPropertyAmount] = useState<string>("");
  const [invoiceRemarks, setInvoiceRemarks] = useState<string>("");
  const [invoiceRecipientEmail, setInvoiceRecipientEmail] = useState<string>("");
  const [isSendingPdf, setIsSendingPdf] = useState(false);
  const [isLoadingAmounts, setIsLoadingAmounts] = useState(false);
  const [submissionDate, setSubmissionDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));

  const categorizedAmounts = useMemo(() => {
    let damagePreventionAmount = 0;
    let damagePreventionFieldDispatch = 0;
    let propertyRepairAmount = 0;
    let propertyFieldDispatch = 0;
    
    const allCases = relatedCases.length > 0 ? relatedCases : (caseData ? [caseData] : []);
    
    for (const c of allCases) {
      const suffix = getCaseSuffix(c.caseNumber);
      const isFieldDispatch = c.recoveryType === "선견적요청";
      
      if (suffix === 0) {
        if (isFieldDispatch) {
          damagePreventionFieldDispatch++;
        } else {
          damagePreventionAmount += parseInt(c.estimateAmount || "0") || 0;
        }
      } else if (suffix > 0) {
        if (isFieldDispatch) {
          propertyFieldDispatch++;
        } else {
          propertyRepairAmount += parseInt(c.estimateAmount || "0") || 0;
        }
      }
    }
    
    const hasAnyDirectRecovery = allCases.some(c => c.recoveryType && c.recoveryType !== "선견적요청");
    
    return {
      damagePreventionAmount,
      damagePreventionFieldDispatch,
      propertyRepairAmount,
      propertyFieldDispatch,
      hasDirectRecoveryPrevention: damagePreventionAmount > 0 || allCases.some(c => getCaseSuffix(c.caseNumber) === 0 && c.recoveryType !== "선견적요청"),
      hasFieldDispatchPrevention: damagePreventionFieldDispatch > 0 && !hasAnyDirectRecovery,
      hasDirectRecoveryProperty: propertyRepairAmount > 0 || allCases.some(c => getCaseSuffix(c.caseNumber) > 0 && c.recoveryType !== "선견적요청"),
      hasFieldDispatchProperty: propertyFieldDispatch > 0 && !hasAnyDirectRecovery,
    };
  }, [relatedCases, caseData]);

  useEffect(() => {
    const fetchApprovedAmounts = async () => {
      if (open && caseData) {
        const hasOnlyFieldDispatchPrevention = !categorizedAmounts.hasDirectRecoveryPrevention && categorizedAmounts.hasFieldDispatchPrevention;
        const hasOnlyFieldDispatchProperty = !categorizedAmounts.hasDirectRecoveryProperty && categorizedAmounts.hasFieldDispatchProperty;
        
        if (hasOnlyFieldDispatchPrevention) {
          setInvoiceDamagePreventionAmount("0");
        } else if (caseData.invoiceDamagePreventionAmount) {
          setInvoiceDamagePreventionAmount(caseData.invoiceDamagePreventionAmount);
        } else if (categorizedAmounts.damagePreventionAmount > 0) {
          setInvoiceDamagePreventionAmount(categorizedAmounts.damagePreventionAmount.toString());
        } else {
          const prefix = getCaseNumberPrefix(caseData.caseNumber);
          if (prefix && categorizedAmounts.hasDirectRecoveryPrevention) {
            setIsLoadingAmounts(true);
            try {
              const response = await fetch(`/api/invoice-amounts/${encodeURIComponent(prefix)}`);
              if (response.ok) {
                const data = await response.json();
                setInvoiceDamagePreventionAmount(data.damagePreventionAmount?.toString() || "0");
              }
            } catch (error) {
              console.error("Failed to fetch approved amounts:", error);
            } finally {
              setIsLoadingAmounts(false);
            }
          } else {
            setInvoiceDamagePreventionAmount("0");
          }
        }
        
        if (hasOnlyFieldDispatchProperty) {
          setInvoicePropertyRepairAmount("0");
        } else if (caseData.invoicePropertyRepairAmount) {
          setInvoicePropertyRepairAmount(caseData.invoicePropertyRepairAmount);
        } else if (categorizedAmounts.propertyRepairAmount > 0) {
          setInvoicePropertyRepairAmount(categorizedAmounts.propertyRepairAmount.toString());
        } else {
          const prefix = getCaseNumberPrefix(caseData.caseNumber);
          if (prefix && categorizedAmounts.hasDirectRecoveryProperty) {
            setIsLoadingAmounts(true);
            try {
              const response = await fetch(`/api/invoice-amounts/${encodeURIComponent(prefix)}`);
              if (response.ok) {
                const data = await response.json();
                setInvoicePropertyRepairAmount(data.propertyRepairAmount?.toString() || "0");
              }
            } catch (error) {
              console.error("Failed to fetch approved amounts:", error);
            } finally {
              setIsLoadingAmounts(false);
            }
          } else {
            setInvoicePropertyRepairAmount("0");
          }
        }
        
        if (categorizedAmounts.hasFieldDispatchPrevention) {
          setFieldDispatchPreventionAmount((categorizedAmounts.damagePreventionFieldDispatch * 100000).toString());
        } else {
          setFieldDispatchPreventionAmount("0");
        }
        if (categorizedAmounts.hasFieldDispatchProperty) {
          setFieldDispatchPropertyAmount((categorizedAmounts.propertyFieldDispatch * 100000).toString());
        } else {
          setFieldDispatchPropertyAmount("0");
        }
        
        setInvoiceRemarks(caseData.invoiceRemarks || "");
        setInvoiceRecipientEmail("");
        setSubmissionDate(format(new Date(), "yyyy-MM-dd"));
      } else if (!open) {
        setInvoiceDamagePreventionAmount("");
        setInvoicePropertyRepairAmount("");
        setFieldDispatchPreventionAmount("");
        setFieldDispatchPropertyAmount("");
        setInvoiceRemarks("");
        setInvoiceRecipientEmail("");
      }
    };
    
    fetchApprovedAmounts();
  }, [open, caseData, categorizedAmounts, relatedCases]);

  const totalBeforeTruncation = 
    (parseInt(invoiceDamagePreventionAmount || "0") || 0) + 
    (parseInt(invoicePropertyRepairAmount || "0") || 0) +
    (parseInt(fieldDispatchPreventionAmount || "0") || 0) +
    (parseInt(fieldDispatchPropertyAmount || "0") || 0);
  
  const truncation = totalBeforeTruncation % 1000;
  const totalAmount = totalBeforeTruncation - truncation;

  const handleSendInvoicePdf = async () => {
    if (!caseData?.id) {
      toast({
        title: "PDF 생성 실패",
        description: "케이스 정보를 찾을 수 없습니다.",
        variant: "destructive",
      });
      return;
    }

    if (!invoiceRecipientEmail) {
      toast({
        title: "이메일 주소 필요",
        description: "수신자 이메일 주소를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    setIsSendingPdf(true);

    try {
      const damagePreventionAmt = parseInt(invoiceDamagePreventionAmount || "0") || 0;
      const propertyRepairAmt = parseInt(invoicePropertyRepairAmount || "0") || 0;
      const fieldDispatchPreventionAmt = parseInt(fieldDispatchPreventionAmount || "0") || 0;
      const fieldDispatchPropertyAmt = parseInt(fieldDispatchPropertyAmount || "0") || 0;
      
      const response = await fetch('/api/send-invoice-email-v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: invoiceRecipientEmail,
          caseId: caseData.id,
          recipientName: caseData.insuranceCompany || '',
          damagePreventionAmount: damagePreventionAmt,
          propertyRepairAmount: propertyRepairAmt,
          fieldDispatchPreventionAmount: fieldDispatchPreventionAmt,
          fieldDispatchPropertyAmount: fieldDispatchPropertyAmt,
          totalAmount: totalAmount,
          remarks: invoiceRemarks,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "이메일 전송 완료",
          description: `${invoiceRecipientEmail}으로 INVOICE PDF 링크가 전송되었습니다.`,
        });
        onOpenChange(false);
      } else {
        throw new Error(result.error || "이메일 전송에 실패했습니다");
      }
    } catch (error) {
      console.error("INVOICE PDF 이메일 전송 중 오류 발생", error);
      toast({
        title: "이메일 전송 실패",
        description: error instanceof Error ? error.message : "다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsSendingPdf(false);
    }
  };

  const handleSave = async () => {
    try {
      await apiRequest("POST", "/api/invoice/send", {
        caseId: caseData?.id,
        relatedCaseIds: relatedCases.map(c => c.id),
        damagePreventionAmount: parseInt(invoiceDamagePreventionAmount || "0") || 0,
        propertyRepairAmount: parseInt(invoicePropertyRepairAmount || "0") || 0,
        fieldDispatchPreventionAmount: parseInt(fieldDispatchPreventionAmount || "0") || 0,
        fieldDispatchPropertyAmount: parseInt(fieldDispatchPropertyAmount || "0") || 0,
        remarks: invoiceRemarks,
        totalAmount: totalAmount,
      });
      toast({
        title: "저장 완료",
        description: "인보이스가 저장되었습니다.",
      });
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
    } catch (error: any) {
      toast({
        title: "저장 실패",
        description: error?.message || "저장 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontFamily: "'Pretendard'",
    fontStyle: "normal",
    fontWeight: 700,
    fontSize: "22px",
    lineHeight: "128%",
    letterSpacing: "-0.02em",
    color: "#0C0C0C",
  };

  const subSectionTitleStyle: React.CSSProperties = {
    fontFamily: "'Pretendard'",
    fontStyle: "normal",
    fontWeight: 700,
    fontSize: "18px",
    lineHeight: "128%",
    letterSpacing: "-0.02em",
    color: "#0C0C0C",
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: "'Pretendard'",
    fontStyle: "normal",
    fontWeight: 600,
    fontSize: "16px",
    lineHeight: "128%",
    letterSpacing: "-0.02em",
    color: "rgba(12, 12, 12, 0.7)",
  };

  const valueStyle: React.CSSProperties = {
    fontFamily: "'Pretendard'",
    fontStyle: "normal",
    fontWeight: 500,
    fontSize: "16px",
    lineHeight: "128%",
    letterSpacing: "-0.02em",
    color: "rgba(12, 12, 12, 0.8)",
  };

  const tableHeaderStyle: React.CSSProperties = {
    fontFamily: "'Pretendard'",
    fontStyle: "normal",
    fontWeight: 600,
    fontSize: "15px",
    lineHeight: "128%",
    letterSpacing: "-0.02em",
    color: "rgba(12, 12, 12, 0.7)",
  };

  const tableValueStyle: React.CSSProperties = {
    fontFamily: "'Pretendard'",
    fontStyle: "normal",
    fontWeight: 400,
    fontSize: "15px",
    lineHeight: "128%",
    letterSpacing: "-0.01em",
    color: "rgba(12, 12, 12, 0.8)",
  };

  const infoRowStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0px",
    width: "100%",
    height: "44px",
  };

  const formatAmount = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseInt(amount) || 0 : amount;
    return num.toLocaleString() + "원";
  };

  const damagePreventionAmt = parseInt(invoiceDamagePreventionAmount || "0") || 0;
  const propertyRepairAmt = parseInt(invoicePropertyRepairAmount || "0") || 0;
  
  const damagePreventionDiff = damagePreventionAmt - categorizedAmounts.damagePreventionAmount;
  const propertyRepairDiff = propertyRepairAmt - categorizedAmounts.propertyRepairAmount;
  
  const damagePreventionRate = categorizedAmounts.damagePreventionAmount > 0 
    ? ((damagePreventionAmt / categorizedAmounts.damagePreventionAmount) * 100).toFixed(0) 
    : "0";
  const propertyRepairRate = categorizedAmounts.propertyRepairAmount > 0 
    ? ((propertyRepairAmt / categorizedAmounts.propertyRepairAmount) * 100).toFixed(0) 
    : "0";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          padding: "0px",
          gap: "16px",
          width: "810px",
          maxWidth: "95vw",
          background: "#FDFDFD",
          boxShadow: "0px 0px 20px #DBE9F5",
          borderRadius: "12px 0 0 12px",
          overflow: "hidden",
        }}
        data-testid="dialog-invoice"
      >
        {/* Header */}
        <div style={{
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "24px",
          width: "100%",
          height: "76px",
          borderBottom: "2px solid rgba(12, 12, 12, 0.1)",
        }}>
          <div style={{ width: "28px" }} />
          <span style={{
            fontFamily: "'Pretendard'",
            fontStyle: "normal",
            fontWeight: 600,
            fontSize: "22px",
            lineHeight: "128%",
            letterSpacing: "-0.02em",
            color: "#0C0C0C",
          }}>
            인보이스 관리
          </span>
          <button
            onClick={() => onOpenChange(false)}
            style={{
              width: "28px",
              height: "28px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            data-testid="button-close-invoice"
          >
            <X size={20} color="rgba(12, 12, 12, 0.8)" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "flex-start",
          padding: "0px 8px 0px 20px",
          gap: "10px",
          width: "100%",
          flex: 1,
          overflow: "auto",
        }}>
          <div 
            ref={invoicePdfRef}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              padding: "0px",
              gap: "20px",
              width: "762px",
              paddingBottom: "32px",
            }}
          >
            {/* 기본정보 Section */}
            <div style={{
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              padding: "28px 32px 32px",
              gap: "12px",
              width: "762px",
              background: "#FFFFFF",
              border: "1px solid rgba(12, 12, 12, 0.12)",
              borderRadius: "12px",
            }}>
              <div style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                padding: "10px 4px",
                gap: "10px",
                width: "698px",
                height: "48px",
              }}>
                <span style={sectionTitleStyle}>기본정보</span>
              </div>

              <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                padding: "0px",
                gap: "2px",
                width: "698px",
              }}>
                {/* 제출일 */}
                <div style={infoRowStyle}>
                  <div style={{ display: "flex", alignItems: "center", padding: "0px 4px" }}>
                    <span style={labelStyle}>제출일</span>
                  </div>
                  <div style={{
                    boxSizing: "border-box",
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "center",
                    alignItems: "center",
                    padding: "10px 16px 10px 12px",
                    gap: "10px",
                    height: "40px",
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid rgba(12, 12, 12, 0.3)",
                    boxShadow: "inset 0px -2px 4px rgba(0, 0, 0, 0.05), inset 0px 2px 4px rgba(0, 0, 0, 0.05)",
                    backdropFilter: "blur(7px)",
                    borderRadius: "6px",
                  }}>
                    <Calendar size={20} color="rgba(12, 12, 12, 0.7)" />
                    <input
                      type="date"
                      value={submissionDate}
                      onChange={(e) => setSubmissionDate(e.target.value)}
                      style={{
                        border: "none",
                        background: "transparent",
                        fontFamily: "'Pretendard'",
                        fontWeight: 500,
                        fontSize: "16px",
                        color: "rgba(12, 12, 12, 0.7)",
                        outline: "none",
                      }}
                      data-testid="input-submission-date"
                    />
                  </div>
                </div>

                {/* 수임일 */}
                <div style={infoRowStyle}>
                  <div style={{ display: "flex", alignItems: "center", padding: "0px 4px" }}>
                    <span style={labelStyle}>수임일</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", padding: "0px 4px" }}>
                    <span style={valueStyle}>{caseData?.receptionDate || "-"}</span>
                  </div>
                </div>

                {/* 보험사 */}
                <div style={infoRowStyle}>
                  <div style={{ display: "flex", alignItems: "center", padding: "0px 4px" }}>
                    <span style={labelStyle}>보험사</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", padding: "0px 4px", gap: "10px" }}>
                    <span style={valueStyle}>{caseData?.insuranceCompany || "-"}</span>
                    <span style={valueStyle}>{caseData?.insuranceDepartment || ""}</span>
                    <span style={valueStyle}>{caseData?.insuranceContact || ""}</span>
                  </div>
                </div>

                {/* 담당자 */}
                <div style={infoRowStyle}>
                  <div style={{ display: "flex", alignItems: "center", padding: "0px 4px" }}>
                    <span style={labelStyle}>담당자</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", padding: "0px 4px", gap: "10px" }}>
                    <span style={valueStyle}>{caseData?.insuranceManager || "-"}</span>
                  </div>
                </div>

                {/* 접수번호 */}
                <div style={infoRowStyle}>
                  <div style={{ display: "flex", alignItems: "center", padding: "0px 4px" }}>
                    <span style={labelStyle}>접수번호</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", padding: "0px 4px" }}>
                    <span style={valueStyle}>{caseData?.caseNumber || "-"}</span>
                  </div>
                </div>

                {/* 사고번호 */}
                <div style={infoRowStyle}>
                  <div style={{ display: "flex", alignItems: "center", padding: "0px 4px" }}>
                    <span style={labelStyle}>사고번호</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", padding: "0px 4px" }}>
                    <span style={valueStyle}>{caseData?.insuranceAccidentNo || "-"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 협력/현장 정보 Section */}
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              padding: "28px 32px 32px",
              gap: "12px",
              width: "762px",
              background: "rgba(12, 12, 12, 0.03)",
              borderRadius: "12px",
            }}>
              <div style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                padding: "10px 4px",
                gap: "10px",
                width: "698px",
                height: "43px",
              }}>
                <span style={subSectionTitleStyle}>협력/현장 정보</span>
              </div>

              <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                padding: "0px",
                gap: "2px",
                width: "698px",
              }}>
                {/* 협력업체 */}
                <div style={infoRowStyle}>
                  <div style={{ display: "flex", alignItems: "center", padding: "0px 4px" }}>
                    <span style={labelStyle}>협력업체</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", padding: "0px 4px" }}>
                    <span style={valueStyle}>{caseData?.assignedPartner || "-"}</span>
                  </div>
                </div>

                {/* 사고유형 */}
                <div style={infoRowStyle}>
                  <div style={{ display: "flex", alignItems: "center", padding: "0px 4px" }}>
                    <span style={labelStyle}>사고유형</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", padding: "0px 4px" }}>
                    <span style={valueStyle}>{caseData?.accidentType || "-"}</span>
                  </div>
                </div>

                {/* 공사유무 */}
                <div style={infoRowStyle}>
                  <div style={{ display: "flex", alignItems: "center", padding: "0px 4px" }}>
                    <span style={labelStyle}>공사유무</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", padding: "0px 4px" }}>
                    <span style={valueStyle}>{caseData?.recoveryType || "-"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 금액 Section */}
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              padding: "0px",
              gap: "8px",
              width: "762px",
            }}>
              <div style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                padding: "10px 4px",
                gap: "10px",
                width: "762px",
                height: "43px",
              }}>
                <span style={subSectionTitleStyle}>금액</span>
              </div>

              {/* Amount Table */}
              <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                padding: "0px",
                width: "762px",
                borderRadius: "6px",
                overflow: "hidden",
              }}>
                {/* Table Header */}
                <div style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  padding: "0px",
                  width: "762px",
                  height: "43px",
                }}>
                  <div style={{
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "center",
                    alignItems: "center",
                    padding: "17.5px 8px",
                    gap: "10px",
                    width: "141px",
                    height: "43px",
                    background: "rgba(12, 12, 12, 0.04)",
                  }} />
                  <div style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    padding: "17.5px 12px",
                    gap: "10px",
                    width: "310.5px",
                    height: "43px",
                    background: "rgba(12, 12, 12, 0.04)",
                  }}>
                    <span style={tableHeaderStyle}>손해방지비용</span>
                  </div>
                  <div style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    padding: "17.5px 12px",
                    gap: "10px",
                    width: "310.5px",
                    height: "43px",
                    background: "rgba(12, 12, 12, 0.04)",
                  }}>
                    <span style={tableHeaderStyle}>대물비용</span>
                  </div>
                </div>

                {/* Table Body */}
                <div style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "flex-start",
                  padding: "0px",
                  width: "762px",
                }}>
                  {/* Row Labels Column */}
                  <div style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    padding: "0px",
                    width: "141px",
                  }}>
                    {["견적금액(원)", "차액(원)", "수정률(%)", "승인금액(원)", "총 승인금액", "총 수수료(원)", "협력업체 지급액(원)"].map((label, idx) => (
                      <div key={idx} style={{
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        padding: "17.5px 12px",
                        gap: "10px",
                        width: "141px",
                        height: "54px",
                        background: "rgba(12, 12, 12, 0.04)",
                      }}>
                        <span style={tableHeaderStyle}>{label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Values Columns */}
                  <div style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "flex-start",
                    padding: "0px",
                    width: "621px",
                  }}>
                    {/* First 4 rows - split columns */}
                    <div style={{
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      padding: "0px",
                      width: "621px",
                    }}>
                      {/* 손해방지비용 Column */}
                      <div style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        padding: "0px",
                        width: "310.5px",
                      }}>
                        <div style={{
                          display: "flex",
                          flexDirection: "row",
                          alignItems: "center",
                          padding: "17.5px 12px",
                          gap: "10px",
                          width: "310.5px",
                          height: "54px",
                        }}>
                          <span style={tableValueStyle}>{formatAmount(categorizedAmounts.damagePreventionAmount)}</span>
                        </div>
                        <div style={{
                          display: "flex",
                          flexDirection: "row",
                          alignItems: "center",
                          padding: "17.5px 12px",
                          gap: "10px",
                          width: "310.5px",
                          height: "54px",
                        }}>
                          <span style={tableValueStyle}>{formatAmount(damagePreventionDiff)}</span>
                        </div>
                        <div style={{
                          display: "flex",
                          flexDirection: "row",
                          alignItems: "center",
                          padding: "17.5px 12px",
                          gap: "10px",
                          width: "310.5px",
                          height: "54px",
                        }}>
                          <span style={tableValueStyle}>{damagePreventionRate}%</span>
                        </div>
                        <div style={{
                          display: "flex",
                          flexDirection: "row",
                          alignItems: "center",
                          padding: "17.5px 12px",
                          gap: "10px",
                          width: "310.5px",
                          height: "54px",
                        }}>
                          <span style={tableValueStyle}>{formatAmount(damagePreventionAmt)}</span>
                        </div>
                      </div>

                      {/* 대물비용 Column */}
                      <div style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        padding: "0px",
                        width: "310.5px",
                      }}>
                        <div style={{
                          display: "flex",
                          flexDirection: "row",
                          alignItems: "center",
                          padding: "17.5px 12px",
                          gap: "10px",
                          width: "310.5px",
                          height: "54px",
                        }}>
                          <span style={tableValueStyle}>{formatAmount(categorizedAmounts.propertyRepairAmount)}</span>
                        </div>
                        <div style={{
                          display: "flex",
                          flexDirection: "row",
                          alignItems: "center",
                          padding: "17.5px 12px",
                          gap: "10px",
                          width: "310.5px",
                          height: "54px",
                        }}>
                          <span style={tableValueStyle}>{formatAmount(propertyRepairDiff)}</span>
                        </div>
                        <div style={{
                          display: "flex",
                          flexDirection: "row",
                          alignItems: "center",
                          padding: "17.5px 12px",
                          gap: "10px",
                          width: "310.5px",
                          height: "54px",
                        }}>
                          <span style={tableValueStyle}>{propertyRepairRate}%</span>
                        </div>
                        <div style={{
                          display: "flex",
                          flexDirection: "row",
                          alignItems: "center",
                          padding: "17.5px 12px",
                          gap: "10px",
                          width: "310.5px",
                          height: "54px",
                        }}>
                          <span style={tableValueStyle}>{formatAmount(propertyRepairAmt)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Total rows - full width */}
                    <div style={{
                      display: "flex",
                      flexDirection: "row",
                      justifyContent: "center",
                      alignItems: "center",
                      padding: "17.5px 12px",
                      gap: "10px",
                      width: "621px",
                      height: "54px",
                      background: "rgba(12, 12, 12, 0.02)",
                    }}>
                      <span style={{ ...tableValueStyle, fontWeight: 600 }}>{formatAmount(totalAmount)}</span>
                    </div>
                    <div style={{
                      display: "flex",
                      flexDirection: "row",
                      justifyContent: "center",
                      alignItems: "center",
                      padding: "17.5px 12px",
                      gap: "10px",
                      width: "621px",
                      height: "54px",
                    }}>
                      <span style={tableValueStyle}>{formatAmount(Math.round(totalAmount * 0.1))}</span>
                    </div>
                    <div style={{
                      display: "flex",
                      flexDirection: "row",
                      justifyContent: "center",
                      alignItems: "center",
                      padding: "17.5px 12px",
                      gap: "10px",
                      width: "621px",
                      height: "54px",
                    }}>
                      <span style={tableValueStyle}>{formatAmount(Math.round(totalAmount * 0.9))}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 세금계산서/인보이스 Section */}
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              padding: "28px 32px 32px",
              gap: "12px",
              width: "762px",
              background: "rgba(12, 12, 12, 0.03)",
              borderRadius: "12px",
            }}>
              <div style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                padding: "10px 4px",
                gap: "10px",
                width: "698px",
                height: "43px",
              }}>
                <span style={subSectionTitleStyle}>세금계산서/인보이스</span>
              </div>

              <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                padding: "0px",
                gap: "2px",
                width: "698px",
              }}>
                {/* 세금계산서 확인 */}
                <div style={{
                  ...infoRowStyle,
                  height: "53px",
                }}>
                  <div style={{ display: "flex", alignItems: "center", padding: "0px 4px" }}>
                    <span style={labelStyle}>세금계산서 확인</span>
                  </div>
                  <div style={{
                    boxSizing: "border-box",
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "center",
                    alignItems: "center",
                    padding: "10px 16px 10px 12px",
                    gap: "10px",
                    height: "40px",
                    background: "#FDFDFD",
                    border: "1px solid rgba(12, 12, 12, 0.3)",
                    boxShadow: "inset 0px -2px 4px rgba(0, 0, 0, 0.05), inset 0px 2px 4px rgba(0, 0, 0, 0.05)",
                    backdropFilter: "blur(7px)",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}>
                    <Calendar size={20} color="rgba(12, 12, 12, 0.7)" />
                    <span style={{ ...valueStyle, color: "rgba(12, 12, 12, 0.7)" }}>날짜 선택</span>
                  </div>
                </div>

                {/* 인보이스 생성 */}
                <div style={{
                  ...infoRowStyle,
                  height: "54px",
                }}>
                  <div style={{ display: "flex", alignItems: "center", padding: "0px 4px" }}>
                    <span style={labelStyle}>인보이스 생성</span>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <Button
                      variant="outline"
                      size="sm"
                      style={{
                        height: "40px",
                        borderRadius: "6px",
                        border: "1px solid rgba(12, 12, 12, 0.3)",
                      }}
                      data-testid="button-preview-invoice"
                    >
                      <FileText size={16} />
                      <span style={{ marginLeft: "6px" }}>미리보기</span>
                    </Button>
                  </div>
                </div>

                {/* 이메일 전송 */}
                <div style={{
                  ...infoRowStyle,
                  height: "54px",
                }}>
                  <div style={{ display: "flex", alignItems: "center", padding: "0px 4px" }}>
                    <span style={labelStyle}>이메일 전송</span>
                  </div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <Input
                      type="email"
                      placeholder="이메일 주소"
                      value={invoiceRecipientEmail}
                      onChange={(e) => setInvoiceRecipientEmail(e.target.value)}
                      style={{
                        width: "200px",
                        height: "40px",
                        borderRadius: "6px",
                        border: "1px solid rgba(12, 12, 12, 0.3)",
                      }}
                      data-testid="input-recipient-email"
                    />
                    <Button
                      onClick={handleSendInvoicePdf}
                      disabled={isSendingPdf || !invoiceRecipientEmail}
                      style={{
                        height: "40px",
                        borderRadius: "6px",
                        background: "#2563EB",
                        color: "#FFFFFF",
                      }}
                      data-testid="button-send-invoice"
                    >
                      <Send size={16} />
                      <span style={{ marginLeft: "6px" }}>{isSendingPdf ? "전송중..." : "전송"}</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Action Buttons */}
            <div style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "flex-end",
              alignItems: "center",
              padding: "16px 0px",
              gap: "12px",
              width: "762px",
            }}>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                style={{
                  height: "44px",
                  padding: "0px 24px",
                  borderRadius: "8px",
                }}
                data-testid="button-cancel-invoice"
              >
                취소
              </Button>
              <Button
                onClick={handleSave}
                style={{
                  height: "44px",
                  padding: "0px 24px",
                  borderRadius: "8px",
                  background: "#2563EB",
                  color: "#FFFFFF",
                }}
                data-testid="button-save-invoice"
              >
                저장
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
