import { useState, useRef, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

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
        const allCases = relatedCases.length > 0 ? relatedCases : (caseData ? [caseData] : []);
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
    if (!invoicePdfRef.current) {
      toast({
        title: "PDF 생성 실패",
        description: "변환할 인보이스 정보를 찾을 수 없습니다.",
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
      const jsPDF = (await import("jspdf")).default;
      const html2canvas = (await import("html2canvas")).default;

      const pdfContainer = invoicePdfRef.current;
      const inputFields = pdfContainer.querySelectorAll('.invoice-input-field');
      const spanFields = pdfContainer.querySelectorAll('.invoice-span-field');
      const wonLabels = pdfContainer.querySelectorAll('.invoice-input-field + span');
      
      inputFields.forEach(el => (el as HTMLElement).style.display = 'none');
      wonLabels.forEach(el => (el as HTMLElement).style.display = 'none');
      spanFields.forEach(el => (el as HTMLElement).style.display = 'inline');

      const canvas = await html2canvas(invoicePdfRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#FFFFFF",
      });

      inputFields.forEach(el => (el as HTMLElement).style.display = '');
      wonLabels.forEach(el => (el as HTMLElement).style.display = '');
      spanFields.forEach(el => (el as HTMLElement).style.display = 'none');

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 10;
      
      const imgWidth = pageWidth - (margin * 2);
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);

      const pdfBase64 = pdf.output('datauristring').split(',')[1];

      const response = await fetch('/api/send-invoice-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: invoiceRecipientEmail,
          pdfBase64,
          caseNumber: caseData?.caseNumber || '',
          insuranceCompany: caseData?.insuranceCompany || '',
          accidentNo: caseData?.insuranceAccidentNo || '',
          damagePreventionAmount: parseInt(invoiceDamagePreventionAmount || "0") || 0,
          propertyRepairAmount: parseInt(invoicePropertyRepairAmount || "0") || 0,
          fieldDispatchPreventionAmount: parseInt(fieldDispatchPreventionAmount || "0") || 0,
          fieldDispatchPropertyAmount: parseInt(fieldDispatchPropertyAmount || "0") || 0,
          totalAmount,
          remarks: invoiceRemarks,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "이메일 전송 완료",
          description: `${invoiceRecipientEmail}으로 INVOICE PDF가 전송되었습니다.`,
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        style={{
          width: "520px",
          maxWidth: "95vw",
          padding: 0,
          background: "#FFFFFF",
          overflow: "auto",
          boxShadow: "0px -2px 70px rgba(179, 193, 205, 0.8)",
          borderRadius: "12px 0 0 12px",
        }}
        data-testid="dialog-invoice"
      >
        <div style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
        }}>
          {/* Header */}
          <div style={{
            padding: "24px 28px 20px",
            borderBottom: "1px solid rgba(12, 12, 12, 0.08)",
          }}>
            <h2 style={{
              fontFamily: "Pretendard",
              fontWeight: 700,
              fontSize: "24px",
              color: "#0C0C0C",
              margin: 0,
              letterSpacing: "1px",
            }}>
              INVOICE
            </h2>
          </div>

          {/* Content */}
          <div 
            ref={invoicePdfRef}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              padding: "20px 28px",
              gap: "20px",
              background: "#FFFFFF",
              overflowY: "auto",
            }}
          >
            {/* Header Info Grid */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
              padding: "16px",
              background: "rgba(12, 12, 12, 0.02)",
              borderRadius: "8px",
              fontFamily: "Pretendard",
              fontSize: "13px",
            }}>
              <div style={{ display: "flex", gap: "8px" }}>
                <span style={{ color: "rgba(12, 12, 12, 0.5)", minWidth: "56px" }}>수신</span>
                <span style={{ color: "#0C0C0C", fontWeight: 500 }}>{caseData?.insuranceCompany || "-"}</span>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <span style={{ color: "rgba(12, 12, 12, 0.5)", minWidth: "56px" }}>수임일자</span>
                <span style={{ color: "#0C0C0C", fontWeight: 500 }}>{caseData?.receptionDate?.replace(/-/g, ".") || "0000.00.00"}</span>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <span style={{ color: "rgba(12, 12, 12, 0.5)", minWidth: "56px" }}>사고번호</span>
                <span style={{ color: "#0C0C0C", fontWeight: 600 }}>{caseData?.insuranceAccidentNo || "-"}</span>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <span style={{ color: "rgba(12, 12, 12, 0.5)", minWidth: "56px" }}>제출일자</span>
                <span style={{ color: "#0C0C0C", fontWeight: 500 }}>{format(new Date(), "yyyy.MM.dd")}</span>
              </div>
            </div>

            {/* Particulars Section */}
            <div>
              <div style={{
                fontFamily: "Pretendard",
                fontSize: "12px",
                color: "rgba(12, 12, 12, 0.5)",
                marginBottom: "8px",
              }}>
                Particulars
              </div>
              <div style={{
                fontFamily: "Pretendard",
                fontWeight: 600,
                fontSize: "14px",
                color: "#0C0C0C",
                marginBottom: "12px",
              }}>
                사고번호  {caseData?.insuranceAccidentNo || "-"}
              </div>

              {/* Particulars Table */}
              <div style={{
                border: "1px solid rgba(12, 12, 12, 0.1)",
                borderRadius: "8px",
                overflow: "hidden",
              }}>
                {/* Table Header */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 120px",
                  background: "rgba(12, 12, 12, 0.03)",
                  borderBottom: "1px solid rgba(12, 12, 12, 0.1)",
                }}>
                  <div style={{
                    padding: "10px 16px",
                    fontFamily: "Pretendard",
                    fontSize: "12px",
                    fontWeight: 500,
                    color: "rgba(12, 12, 12, 0.5)",
                    textTransform: "uppercase",
                  }}>
                    Particulars
                  </div>
                  <div style={{
                    padding: "10px 16px",
                    fontFamily: "Pretendard",
                    fontSize: "12px",
                    fontWeight: 500,
                    color: "rgba(12, 12, 12, 0.5)",
                    textAlign: "right",
                    textTransform: "uppercase",
                  }}>
                    Amount
                  </div>
                </div>

                {/* 손해방지비용 Row */}
                {categorizedAmounts.hasDirectRecoveryPrevention && (
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 120px",
                    borderBottom: "1px solid rgba(12, 12, 12, 0.06)",
                  }}>
                    <div style={{
                      padding: "12px 16px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: "#0C0C0C",
                    }}>
                      손해방지비용
                    </div>
                    <div style={{
                      padding: "12px 16px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                    }}>
                      <input
                        type="text"
                        value={invoiceDamagePreventionAmount ? Number(invoiceDamagePreventionAmount).toLocaleString() : ""}
                        onChange={(e) => setInvoiceDamagePreventionAmount(e.target.value.replace(/[^0-9]/g, ""))}
                        placeholder="0"
                        className="invoice-input-field"
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          color: "#008FED",
                          background: "transparent",
                          border: "none",
                          outline: "none",
                          textAlign: "right",
                          width: "80px",
                        }}
                        data-testid="input-damage-prevention-amount"
                      />
                      <span className="invoice-input-field" style={{ fontFamily: "Pretendard", fontSize: "14px", color: "#0C0C0C", marginLeft: "2px" }}>원</span>
                      <span className="invoice-span-field" style={{ display: "none", fontFamily: "Pretendard", fontSize: "14px", color: "#0C0C0C" }} data-testid="text-damage-prevention-amount">
                        {invoiceDamagePreventionAmount ? Number(invoiceDamagePreventionAmount).toLocaleString() : "0"}원
                      </span>
                    </div>
                  </div>
                )}

                {/* 현장출동비용 (손해방지) Row */}
                {categorizedAmounts.hasFieldDispatchPrevention && (
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 120px",
                    borderBottom: "1px solid rgba(12, 12, 12, 0.06)",
                  }}>
                    <div style={{
                      padding: "12px 16px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: "#0C0C0C",
                    }}>
                      현장출동비용 (손해방지)
                    </div>
                    <div style={{
                      padding: "12px 16px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: "#0C0C0C",
                      textAlign: "right",
                    }} data-testid="text-field-dispatch-prevention-amount">
                      <span className="invoice-input-field">{Number(fieldDispatchPreventionAmount).toLocaleString()}원</span>
                      <span className="invoice-span-field" style={{ display: "none" }}>{Number(fieldDispatchPreventionAmount).toLocaleString()}원</span>
                    </div>
                  </div>
                )}

                {/* 대물복구비용 Row */}
                {categorizedAmounts.hasDirectRecoveryProperty && (
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 120px",
                    borderBottom: "1px solid rgba(12, 12, 12, 0.06)",
                  }}>
                    <div style={{
                      padding: "12px 16px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: "#0C0C0C",
                    }}>
                      대물복구비용
                    </div>
                    <div style={{
                      padding: "12px 16px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                    }}>
                      <span style={{ fontFamily: "Pretendard", fontSize: "14px", color: "rgba(12, 12, 12, 0.4)", marginRight: "4px" }}>금액을 입력해주세요</span>
                      <input
                        type="text"
                        value={invoicePropertyRepairAmount ? Number(invoicePropertyRepairAmount).toLocaleString() : ""}
                        onChange={(e) => setInvoicePropertyRepairAmount(e.target.value.replace(/[^0-9]/g, ""))}
                        placeholder=""
                        className="invoice-input-field"
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          color: "#008FED",
                          background: "transparent",
                          border: "none",
                          outline: "none",
                          textAlign: "right",
                          width: "80px",
                          display: invoicePropertyRepairAmount ? "block" : "none",
                        }}
                        data-testid="input-property-repair-amount"
                      />
                      <span className="invoice-input-field" style={{ fontFamily: "Pretendard", fontSize: "14px", color: "#0C0C0C", marginLeft: "2px", display: invoicePropertyRepairAmount ? "inline" : "none" }}>원</span>
                      <span className="invoice-span-field" style={{ display: "none", fontFamily: "Pretendard", fontSize: "14px", color: "#0C0C0C" }} data-testid="text-property-repair-amount">
                        {invoicePropertyRepairAmount ? Number(invoicePropertyRepairAmount).toLocaleString() : "0"}원
                      </span>
                    </div>
                  </div>
                )}

                {/* 현장출동비용 (피해세대) Row */}
                {categorizedAmounts.hasFieldDispatchProperty && (
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 120px",
                    borderBottom: "1px solid rgba(12, 12, 12, 0.06)",
                  }}>
                    <div style={{
                      padding: "12px 16px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: "#0C0C0C",
                    }}>
                      현장출동비용 (피해세대)
                    </div>
                    <div style={{
                      padding: "12px 16px",
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: "#0C0C0C",
                      textAlign: "right",
                    }} data-testid="text-field-dispatch-property-amount">
                      <span className="invoice-input-field">{Number(fieldDispatchPropertyAmount).toLocaleString()}원</span>
                      <span className="invoice-span-field" style={{ display: "none" }}>{Number(fieldDispatchPropertyAmount).toLocaleString()}원</span>
                    </div>
                  </div>
                )}

                {/* Total Amount Row */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 120px",
                  background: "rgba(12, 12, 12, 0.02)",
                }}>
                  <div style={{
                    padding: "14px 16px",
                    fontFamily: "Pretendard",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "rgba(12, 12, 12, 0.6)",
                    textTransform: "uppercase",
                  }}>
                    Total Amount
                  </div>
                  <div style={{
                    padding: "14px 16px",
                    fontFamily: "Pretendard",
                    fontSize: "16px",
                    fontWeight: 700,
                    color: "#0C0C0C",
                    textAlign: "right",
                  }} data-testid="text-total-amount">
                    {totalAmount.toLocaleString()}원
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Two-Column Section */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
              marginTop: "8px",
            }}>
              {/* Left Column - 비고 */}
              <div>
                <div style={{
                  fontFamily: "Pretendard",
                  fontWeight: 600,
                  fontSize: "13px",
                  color: "#0C0C0C",
                  marginBottom: "8px",
                }}>
                  비고
                </div>
                <div style={{
                  fontFamily: "Pretendard",
                  fontSize: "13px",
                  color: "#008FED",
                  cursor: "pointer",
                }}>
                  {invoiceRemarks || "기재된 계좌로 |"}
                </div>
              </div>

              {/* Right Column - 입금정보 */}
              <div>
                <div style={{
                  fontFamily: "Pretendard",
                  fontWeight: 600,
                  fontSize: "13px",
                  color: "#0C0C0C",
                  marginBottom: "8px",
                }}>
                  입금 정보
                </div>
                <div style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                  fontFamily: "Pretendard",
                  fontSize: "13px",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "rgba(12, 12, 12, 0.5)" }}>은행명</span>
                    <span style={{ color: "#0C0C0C", fontWeight: 500 }}>KB국민은행</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "rgba(12, 12, 12, 0.5)" }}>계좌번호</span>
                    <span style={{ color: "#0C0C0C", fontWeight: 500 }}>00000000000</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "rgba(12, 12, 12, 0.5)" }}>예금주</span>
                    <span style={{ color: "#0C0C0C", fontWeight: 500 }}>주식회사 플록슨</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "rgba(12, 12, 12, 0.5)" }}>사업자등록번호</span>
                    <span style={{ color: "#0C0C0C", fontWeight: 500 }}>517-89-03490</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div style={{ 
            padding: "16px 28px", 
            borderTop: "1px solid rgba(12, 12, 12, 0.08)",
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
            background: "#FFFFFF",
          }}>
            <Button
              variant="outline"
              onClick={handleSendInvoicePdf}
              disabled={isSendingPdf || !invoiceRecipientEmail}
              style={{
                fontFamily: "Pretendard",
                fontSize: "14px",
                fontWeight: 500,
                color: "#008FED",
                borderColor: "#008FED",
              }}
              data-testid="button-invoice-pdf"
            >
              {isSendingPdf ? "발송 중..." : "PDF 발송"}
            </Button>
            <Button
              onClick={handleSave}
              style={{ 
                background: "#008FED",
                fontFamily: "Pretendard",
                fontSize: "14px",
                fontWeight: 500,
              }}
              data-testid="button-invoice-save"
            >
              저장
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
