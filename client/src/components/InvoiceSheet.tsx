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
  if (!caseNumber) return 0; // 기본값 0 (손해방지 버킷으로 분류)
  const parts = caseNumber.split("-");
  return parts.length > 1 ? parseInt(parts[parts.length - 1]) || 0 : 0;
};

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
    
    // 관련 케이스 중 하나라도 직접복구가 있으면 출동비 청구하지 않음
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
        // 선견적요청 케이스 판단: 현재 케이스가 선견적요청이거나, 직접복구 케이스가 없는 경우
        const allCases = relatedCases.length > 0 ? relatedCases : (caseData ? [caseData] : []);
        const hasOnlyFieldDispatchPrevention = !categorizedAmounts.hasDirectRecoveryPrevention && categorizedAmounts.hasFieldDispatchPrevention;
        const hasOnlyFieldDispatchProperty = !categorizedAmounts.hasDirectRecoveryProperty && categorizedAmounts.hasFieldDispatchProperty;
        
        // 손해방지 금액 설정
        if (hasOnlyFieldDispatchPrevention) {
          // 선견적요청만 있는 경우: 견적금액 무시하고 현장출동비용만 표시
          setInvoiceDamagePreventionAmount("0");
        } else if (caseData.invoiceDamagePreventionAmount) {
          setInvoiceDamagePreventionAmount(caseData.invoiceDamagePreventionAmount);
        } else if (categorizedAmounts.damagePreventionAmount > 0) {
          setInvoiceDamagePreventionAmount(categorizedAmounts.damagePreventionAmount.toString());
        } else {
          // API에서 가져오기
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
        
        // 대물복구 금액 설정
        if (hasOnlyFieldDispatchProperty) {
          // 선견적요청만 있는 경우: 견적금액 무시하고 현장출동비용만 표시
          setInvoicePropertyRepairAmount("0");
        } else if (caseData.invoicePropertyRepairAmount) {
          setInvoicePropertyRepairAmount(caseData.invoicePropertyRepairAmount);
        } else if (categorizedAmounts.propertyRepairAmount > 0) {
          setInvoicePropertyRepairAmount(categorizedAmounts.propertyRepairAmount.toString());
        } else {
          // API에서 가져오기
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
        
        // 현장출동비용 설정 (선견적요청 케이스당 10만원)
        // 관련 케이스 중 하나라도 직접복구가 있으면 출동비 0원으로 설정
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
  
  // 천원단위절사
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
          width: "680px",
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
          padding: "38px 0px 0px",
          gap: "24px",
        }}>
          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            width: "100%",
          }}>
            <div style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              padding: "0px 38px",
            }}>
              <h2 style={{
                fontFamily: "Pretendard",
                fontWeight: 600,
                fontSize: "32px",
                lineHeight: "128%",
                color: "#0C0C0C",
                margin: 0,
              }}>
                INVOICE
              </h2>
            </div>
            <div style={{
              width: "100%",
              height: "0px",
              border: "1px solid rgba(12, 12, 12, 0.1)",
            }} />
          </div>

          <div 
            ref={invoicePdfRef}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "20px 38px",
              gap: "20px",
              background: "#FFFFFF",
            }}
          >
            {/* Invoice Title */}
            <div style={{ textAlign: "center", marginBottom: "10px" }}>
              <h1 style={{
                fontFamily: "Pretendard",
                fontWeight: 700,
                fontSize: "28px",
                color: "#000000",
                margin: 0,
                letterSpacing: "4px",
              }}>
                INVOICE
              </h1>
              <div style={{
                width: "100px",
                height: "2px",
                background: "#000000",
                margin: "8px auto 0",
              }} />
            </div>

            {/* Header Info - 수신, 심사자, 수임일자, 사고번호, 제출일자 */}
            <div style={{ width: "100%", fontFamily: "Pretendard", fontSize: "14px", color: "#000000" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span>
                  <span style={{ fontWeight: 500 }}>수  신 : </span>
                  <span>{caseData?.insuranceCompany || "-"} 및 {caseData?.assessorId || "-"}</span>
                </span>
                <span>
                  <span style={{ fontWeight: 500 }}>수임일자 : </span>
                  <span>{caseData?.receptionDate || "-"}</span>
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>
                  <span style={{ fontWeight: 500 }}>사고번호 : </span>
                  <span>{caseData?.caseNumber || "-"}</span>
                </span>
                <span>
                  <span style={{ fontWeight: 500 }}>제출일자 : </span>
                  <span>{format(new Date(), "yyyy.MM.dd")}</span>
                </span>
              </div>
            </div>

            {/* Particulars Table */}
            <table style={{
              width: "100%",
              borderCollapse: "collapse",
              fontFamily: "Pretendard",
              fontSize: "14px",
              color: "#000000",
            }}>
              <thead>
                <tr>
                  <th style={{
                    border: "1px solid #000000",
                    padding: "10px",
                    textAlign: "center",
                    fontWeight: 600,
                    width: "70%",
                    background: "#f5f5f5",
                  }}>
                    PARTICULARS
                  </th>
                  <th style={{
                    border: "1px solid #000000",
                    padding: "10px",
                    textAlign: "center",
                    fontWeight: 600,
                    width: "30%",
                    background: "#f5f5f5",
                  }}>
                    AMOUNT
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* 보험사 사고번호 Row */}
                <tr>
                  <td style={{
                    border: "1px solid #000000",
                    padding: "10px",
                    verticalAlign: "top",
                  }}>
                    <div style={{ fontWeight: 600, marginBottom: "6px" }}>
                      ■ {caseData?.insuranceAccidentNo || "-"}
                    </div>
                    {categorizedAmounts.hasDirectRecoveryPrevention && (
                      <div style={{ paddingLeft: "12px", marginBottom: "4px" }}>- 손해방지비용</div>
                    )}
                    {categorizedAmounts.hasFieldDispatchPrevention && (
                      <div style={{ paddingLeft: "12px", marginBottom: "4px" }}>- 현장출동비용 (손해방지)</div>
                    )}
                    {categorizedAmounts.hasDirectRecoveryProperty && (
                      <div style={{ paddingLeft: "12px", marginBottom: "4px" }}>- 대물복구비용</div>
                    )}
                    {categorizedAmounts.hasFieldDispatchProperty && (
                      <div style={{ paddingLeft: "12px", marginBottom: "4px" }}>- 현장출동비용 (피해세대)</div>
                    )}
                  </td>
                  <td style={{
                    border: "1px solid #000000",
                    padding: "10px",
                    verticalAlign: "top",
                    textAlign: "right",
                  }}>
                    <div style={{ height: "24px" }}></div>
                    {categorizedAmounts.hasDirectRecoveryPrevention && (
                      <div style={{ marginBottom: "4px" }}>
                        <input
                          type="text"
                          value={invoiceDamagePreventionAmount ? Number(invoiceDamagePreventionAmount).toLocaleString() : ""}
                          onChange={(e) => setInvoiceDamagePreventionAmount(e.target.value.replace(/[^0-9]/g, ""))}
                          placeholder="0"
                          className="invoice-input-field"
                          style={{
                            fontFamily: "Pretendard",
                            fontSize: "14px",
                            color: "#000000",
                            background: "transparent",
                            border: "none",
                            outline: "none",
                            textAlign: "right",
                            width: "100px",
                          }}
                          data-testid="input-damage-prevention-amount"
                        />
                        <span className="invoice-input-field">원</span>
                        <span 
                          className="invoice-span-field"
                          style={{ display: "none" }}
                          data-testid="text-damage-prevention-amount"
                        >
                          {invoiceDamagePreventionAmount ? Number(invoiceDamagePreventionAmount).toLocaleString() : "0"}원
                        </span>
                      </div>
                    )}
                    {categorizedAmounts.hasFieldDispatchPrevention && (
                      <div style={{ marginBottom: "4px" }}>
                        <span className="invoice-input-field" data-testid="text-field-dispatch-prevention-amount">
                          {Number(fieldDispatchPreventionAmount).toLocaleString()}원
                        </span>
                        <span className="invoice-span-field" style={{ display: "none" }}>
                          {Number(fieldDispatchPreventionAmount).toLocaleString()}원
                        </span>
                      </div>
                    )}
                    {categorizedAmounts.hasDirectRecoveryProperty && (
                      <div style={{ marginBottom: "4px" }}>
                        <input
                          type="text"
                          value={invoicePropertyRepairAmount ? Number(invoicePropertyRepairAmount).toLocaleString() : ""}
                          onChange={(e) => setInvoicePropertyRepairAmount(e.target.value.replace(/[^0-9]/g, ""))}
                          placeholder="0"
                          className="invoice-input-field"
                          style={{
                            fontFamily: "Pretendard",
                            fontSize: "14px",
                            color: "#000000",
                            background: "transparent",
                            border: "none",
                            outline: "none",
                            textAlign: "right",
                            width: "100px",
                          }}
                          data-testid="input-property-repair-amount"
                        />
                        <span className="invoice-input-field">원</span>
                        <span 
                          className="invoice-span-field"
                          style={{ display: "none" }}
                          data-testid="text-property-repair-amount"
                        >
                          {invoicePropertyRepairAmount ? Number(invoicePropertyRepairAmount).toLocaleString() : "0"}원
                        </span>
                      </div>
                    )}
                    {categorizedAmounts.hasFieldDispatchProperty && (
                      <div style={{ marginBottom: "4px" }}>
                        <span className="invoice-input-field" data-testid="text-field-dispatch-property-amount">
                          {Number(fieldDispatchPropertyAmount).toLocaleString()}원
                        </span>
                        <span className="invoice-span-field" style={{ display: "none" }}>
                          {Number(fieldDispatchPropertyAmount).toLocaleString()}원
                        </span>
                      </div>
                    )}
                  </td>
                </tr>
                {/* 천원단위 절사 Row */}
                <tr>
                  <td style={{
                    border: "1px solid #000000",
                    padding: "8px",
                    textAlign: "center",
                    fontWeight: 500,
                    background: "#f5f5f5",
                  }}>
                    천원단위 절사
                  </td>
                  <td style={{
                    border: "1px solid #000000",
                    padding: "8px",
                    textAlign: "right",
                  }} data-testid="text-truncation">
                    -{truncation.toLocaleString()}원
                  </td>
                </tr>
                {/* Total Amount Row */}
                <tr>
                  <td style={{
                    border: "1px solid #000000",
                    padding: "10px",
                    textAlign: "center",
                    fontWeight: 600,
                    background: "#f5f5f5",
                  }}>
                    TOTAL AMOUNT
                  </td>
                  <td style={{
                    border: "1px solid #000000",
                    padding: "10px",
                    textAlign: "right",
                    fontWeight: 700,
                    fontSize: "16px",
                  }} data-testid="text-total-amount">
                    {totalAmount.toLocaleString()}원
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Bank Info Section */}
            <div style={{ width: "100%", marginTop: "10px" }}>
              <div style={{
                fontFamily: "Pretendard",
                fontSize: "14px",
                color: "#000000",
                marginBottom: "10px",
                textAlign: "center",
              }}>
                아래의 계좌로 입금 부탁드립니다.
              </div>
              <table style={{
                width: "100%",
                borderCollapse: "collapse",
                fontFamily: "Pretendard",
                fontSize: "14px",
                color: "#000000",
              }}>
                <tbody>
                  <tr>
                    <td style={{
                      border: "1px solid #000000",
                      padding: "8px",
                      textAlign: "center",
                      fontWeight: 500,
                      width: "30%",
                      background: "#f5f5f5",
                    }}>
                      은행명
                    </td>
                    <td style={{
                      border: "1px solid #000000",
                      padding: "8px",
                      textAlign: "center",
                    }}>
                      신한은행
                    </td>
                  </tr>
                  <tr>
                    <td style={{
                      border: "1px solid #000000",
                      padding: "8px",
                      textAlign: "center",
                      fontWeight: 500,
                      background: "#f5f5f5",
                    }}>
                      계좌번호
                    </td>
                    <td style={{
                      border: "1px solid #000000",
                      padding: "8px",
                      textAlign: "center",
                    }}>
                      140-015-744120
                    </td>
                  </tr>
                  <tr>
                    <td style={{
                      border: "1px solid #000000",
                      padding: "8px",
                      textAlign: "center",
                      fontWeight: 500,
                      background: "#f5f5f5",
                    }}>
                      예금주
                    </td>
                    <td style={{
                      border: "1px solid #000000",
                      padding: "8px",
                      textAlign: "center",
                    }}>
                      주식회사 플록슨
                    </td>
                  </tr>
                  <tr>
                    <td style={{
                      border: "1px solid #000000",
                      padding: "8px",
                      textAlign: "center",
                      fontWeight: 500,
                      background: "#f5f5f5",
                    }}>
                      사업자등록번호
                    </td>
                    <td style={{
                      border: "1px solid #000000",
                      padding: "8px",
                      textAlign: "center",
                    }}>
                      517-87-03490
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Company Footer */}
            <div style={{
              fontFamily: "Pretendard",
              fontSize: "16px",
              fontWeight: 600,
              color: "#000000",
              marginTop: "20px",
              textAlign: "center",
            }}>
              FLOXN . , Inc
            </div>
          </div>

          {/* Remarks Section - Outside PDF area */}
          <div style={{ padding: "0px 38px", marginBottom: "20px" }}>
            <div style={{
              fontFamily: "Pretendard",
              fontWeight: 600,
              fontSize: "15px",
              lineHeight: "128%",
              letterSpacing: "-0.02em",
              color: "rgba(12, 12, 12, 0.9)",
              marginBottom: "12px",
            }}>
              비고
            </div>
            <textarea
              value={invoiceRemarks}
              onChange={(e) => setInvoiceRemarks(e.target.value)}
              placeholder="내용을 입력해주세요"
              style={{
                width: "100%",
                height: "80px",
                fontFamily: "Pretendard",
                fontWeight: 400,
                fontSize: "14px",
                lineHeight: "150%",
                letterSpacing: "-0.01em",
                color: "rgba(12, 12, 12, 0.9)",
                background: "rgba(12, 12, 12, 0.04)",
                border: "none",
                borderRadius: "8px",
                padding: "12px",
                resize: "none",
                outline: "none",
                boxSizing: "border-box",
              }}
              data-testid="textarea-invoice-remarks"
            />
          </div>

          <div style={{ 
            padding: "20px 38px", 
            borderTop: "1px solid rgba(12, 12, 12, 0.08)",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}>
            <div style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: "12px",
            }}>
              <span style={{
                fontFamily: "Pretendard",
                fontWeight: 500,
                fontSize: "14px",
                color: "rgba(12, 12, 12, 0.7)",
                whiteSpace: "nowrap",
              }}>
                수신자 이메일
              </span>
              <input
                type="email"
                value={invoiceRecipientEmail}
                onChange={(e) => setInvoiceRecipientEmail(e.target.value)}
                placeholder="보험사 이메일 주소를 입력해주세요"
                style={{
                  flex: 1,
                  fontFamily: "Pretendard",
                  fontWeight: 400,
                  fontSize: "14px",
                  lineHeight: "128%",
                  letterSpacing: "-0.01em",
                  color: "rgba(12, 12, 12, 0.9)",
                  background: "rgba(12, 12, 12, 0.04)",
                  border: "1px solid rgba(12, 12, 12, 0.1)",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  outline: "none",
                }}
                data-testid="input-invoice-email"
              />
            </div>

            <div style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "12px",
            }}>
              <Button
                variant="outline"
                onClick={handleSendInvoicePdf}
                disabled={isSendingPdf || !invoiceRecipientEmail}
                data-testid="button-invoice-pdf"
              >
                {isSendingPdf ? "발송 중..." : "PDF 발송"}
              </Button>
              <Button
                onClick={handleSave}
                style={{ background: "#008FED" }}
                data-testid="button-invoice-save"
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

export function getCaseNumberPrefix(caseNumber: string | null | undefined): string | null {
  if (!caseNumber) return null;
  const dashIndex = caseNumber.lastIndexOf('-');
  if (dashIndex > 0) {
    return caseNumber.substring(0, dashIndex);
  }
  return caseNumber;
}
