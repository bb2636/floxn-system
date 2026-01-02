import { useState, useRef, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { Sheet, SheetContent } from "@/components/ui/sheet";
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
          description: `${invoiceRecipientEmail}으로 INVOICE PDF가 첨부파일로 전송되었습니다.`,
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

  // Common styles from CSS spec
  const labelStyle: React.CSSProperties = {
    fontFamily: "'Pretendard'",
    fontStyle: "normal",
    fontWeight: 400,
    fontSize: "15px",
    lineHeight: "128%",
    letterSpacing: "-0.01em",
    color: "rgba(12, 12, 12, 0.7)",
  };

  const valueStyle: React.CSSProperties = {
    fontFamily: "'Pretendard'",
    fontStyle: "normal",
    fontWeight: 600,
    fontSize: "15px",
    lineHeight: "128%",
    letterSpacing: "-0.02em",
    color: "rgba(12, 12, 12, 0.9)",
  };

  const infoBoxStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    padding: "15px 16px",
    gap: "15px",
    width: "298px",
    height: "98px",
    background: "rgba(12, 12, 12, 0.04)",
    backdropFilter: "blur(7px)",
    borderRadius: "12px",
    flex: "none",
    flexGrow: 1,
  };

  const infoRowStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0px",
    width: "100%",
    height: "19px",
  };

  const dividerStyle: React.CSSProperties = {
    width: "100%",
    height: "0px",
    border: "1px solid rgba(12, 12, 12, 0.1)",
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "38px 0px 0px",
          gap: "24px",
          width: "680px",
          maxWidth: "95vw",
          background: "#FFFFFF",
          boxShadow: "0px -2px 70px rgba(179, 193, 205, 0.8)",
          borderRadius: "12px 0 0 12px",
          overflow: "auto",
        }}
        data-testid="dialog-invoice"
      >
        {/* Header Section */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "0px",
          gap: "16px",
          width: "680px",
        }}>
          {/* INVOICE Title */}
          <div style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            padding: "0px 38px",
            gap: "10px",
            width: "680px",
            height: "41px",
          }}>
            <span style={{
              fontFamily: "'Pretendard'",
              fontStyle: "normal",
              fontWeight: 600,
              fontSize: "32px",
              lineHeight: "128%",
              textAlign: "center",
              color: "#0C0C0C",
            }}>
              INVOICE
            </span>
          </div>
          {/* Divider */}
          <div style={{ ...dividerStyle, width: "680px" }} />
        </div>

        {/* Main Content */}
        <div 
          ref={invoicePdfRef}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            padding: "0px 38px",
            gap: "26px",
            width: "604px",
            background: "#FFFFFF",
          }}
        >
          {/* Info Boxes Row */}
          <div style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            padding: "0px",
            gap: "8px",
            width: "604px",
            height: "98px",
          }}>
            {/* Left Info Box - 수신, 사고번호 */}
            <div style={infoBoxStyle}>
              <div style={infoRowStyle}>
                <span style={labelStyle}>수신</span>
                <span style={valueStyle}>{caseData?.insuranceCompany || "-"}</span>
              </div>
              <div style={dividerStyle} />
              <div style={infoRowStyle}>
                <span style={labelStyle}>사고번호</span>
                <span style={valueStyle}>{caseData?.insuranceAccidentNo || "-"}</span>
              </div>
            </div>

            {/* Right Info Box - 수임일자, 제출일자 */}
            <div style={infoBoxStyle}>
              <div style={infoRowStyle}>
                <span style={labelStyle}>수임일자</span>
                <span style={valueStyle}>{caseData?.receptionDate?.replace(/-/g, ".") || "0000.00.00"}</span>
              </div>
              <div style={dividerStyle} />
              <div style={infoRowStyle}>
                <span style={labelStyle}>제출일자</span>
                <span style={valueStyle}>{format(new Date(), "yyyy.MM.dd")}</span>
              </div>
            </div>
          </div>

          {/* Particulars Section */}
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            padding: "0px",
            gap: "12px",
            width: "604px",
          }}>
            {/* Particulars Label */}
            <div style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              padding: "16px 0px",
              gap: "10px",
              width: "604px",
              height: "50px",
            }}>
              <span style={{
                fontFamily: "'Pretendard'",
                fontStyle: "normal",
                fontWeight: 400,
                fontSize: "14px",
                lineHeight: "128%",
                letterSpacing: "-0.01em",
                color: "rgba(12, 12, 12, 0.5)",
              }}>
                Particulars
              </span>
            </div>

            {/* Accident Number Header */}
            <div style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              padding: "0px 4px",
              gap: "8px",
              width: "604px",
              height: "19px",
            }}>
              <span style={valueStyle}>사고번호</span>
              <span style={valueStyle}>{caseData?.insuranceAccidentNo || "-"}</span>
            </div>

            {/* Table Container */}
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              padding: "0px",
              width: "604px",
              borderRadius: "12px",
            }}>
              {/* Table Header */}
              <div style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "0px",
                width: "604px",
                height: "44px",
                background: "rgba(12, 12, 12, 0.04)",
              }}>
                <div style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  padding: "0px 16px",
                  gap: "10px",
                  height: "44px",
                }}>
                  <span style={{
                    fontFamily: "'Pretendard'",
                    fontStyle: "normal",
                    fontWeight: 400,
                    fontSize: "14px",
                    lineHeight: "128%",
                    letterSpacing: "-0.01em",
                    color: "rgba(12, 12, 12, 0.5)",
                  }}>
                    PARTICULARS
                  </span>
                </div>
                <div style={{
                  display: "flex",
                  flexDirection: "row",
                  justifyContent: "flex-end",
                  alignItems: "center",
                  padding: "0px 16px",
                  gap: "10px",
                  height: "44px",
                  flexGrow: 1,
                }}>
                  <span style={{
                    fontFamily: "'Pretendard'",
                    fontStyle: "normal",
                    fontWeight: 400,
                    fontSize: "14px",
                    lineHeight: "128%",
                    letterSpacing: "-0.01em",
                    color: "rgba(12, 12, 12, 0.5)",
                  }}>
                    AMOUNT
                  </span>
                </div>
              </div>

              {/* Table Rows */}
              <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                padding: "0px",
                width: "604px",
              }}>
                {/* 손해방지비용 Row */}
                {categorizedAmounts.hasDirectRecoveryPrevention && (
                  <div style={{
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0px",
                    width: "604px",
                    height: "54px",
                  }}>
                    <div style={{
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      padding: "0px 16px",
                      gap: "10px",
                      height: "54px",
                    }}>
                      <span style={labelStyle}>손해방지비용</span>
                    </div>
                    <div style={{
                      display: "flex",
                      flexDirection: "row",
                      justifyContent: "flex-end",
                      alignItems: "center",
                      padding: "0px 16px",
                      gap: "4px",
                      height: "54px",
                      flexGrow: 1,
                    }}>
                      <span
                        style={{
                          fontFamily: "'Pretendard'",
                          fontStyle: "normal",
                          fontWeight: 400,
                          fontSize: "15px",
                          lineHeight: "128%",
                          letterSpacing: "-0.01em",
                          color: "#0C0C0C",
                          textAlign: "right",
                        }}
                        data-testid="text-damage-prevention-amount"
                      >
                        {invoiceDamagePreventionAmount ? Number(invoiceDamagePreventionAmount).toLocaleString() : "0"}
                      </span>
                      <span style={{
                        fontFamily: "'Pretendard'",
                        fontStyle: "normal",
                        fontWeight: 400,
                        fontSize: "15px",
                        lineHeight: "128%",
                        letterSpacing: "-0.01em",
                        color: "#0C0C0C",
                      }}>원</span>
                    </div>
                  </div>
                )}

                {/* 대물복구비용 Row */}
                {categorizedAmounts.hasDirectRecoveryProperty && (
                  <div style={{
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0px",
                    width: "604px",
                    height: "54px",
                  }}>
                    <div style={{
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      padding: "0px 16px",
                      gap: "10px",
                      height: "54px",
                    }}>
                      <span style={labelStyle}>대물복구비용</span>
                    </div>
                    <div style={{
                      display: "flex",
                      flexDirection: "row",
                      justifyContent: "flex-end",
                      alignItems: "center",
                      padding: "0px 16px",
                      gap: "4px",
                      height: "54px",
                      flexGrow: 1,
                    }}>
                      <span
                        style={{
                          fontFamily: "'Pretendard'",
                          fontStyle: "normal",
                          fontWeight: 400,
                          fontSize: "15px",
                          lineHeight: "128%",
                          letterSpacing: "-0.01em",
                          color: "#0C0C0C",
                          textAlign: "right",
                        }}
                        data-testid="text-property-repair-amount"
                      >
                        {invoicePropertyRepairAmount ? Number(invoicePropertyRepairAmount).toLocaleString() : "0"}
                      </span>
                      <span style={{
                        fontFamily: "'Pretendard'",
                        fontStyle: "normal",
                        fontWeight: 400,
                        fontSize: "15px",
                        lineHeight: "128%",
                        letterSpacing: "-0.01em",
                        color: "#0C0C0C",
                      }}>원</span>
                    </div>
                  </div>
                )}

                {/* TOTAL AMOUNT Row */}
                <div style={{
                  boxSizing: "border-box",
                  display: "flex",
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0px",
                  width: "604px",
                  height: "54px",
                  borderTop: "1px solid rgba(12, 12, 12, 0.1)",
                }}>
                  <div style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    padding: "0px 16px",
                    gap: "10px",
                    height: "54px",
                    background: "rgba(12, 12, 12, 0.04)",
                  }}>
                    <span style={{
                      fontFamily: "'Pretendard'",
                      fontStyle: "normal",
                      fontWeight: 400,
                      fontSize: "14px",
                      lineHeight: "128%",
                      letterSpacing: "-0.01em",
                      color: "rgba(12, 12, 12, 0.7)",
                    }}>
                      TOTAL AMOUNT
                    </span>
                  </div>
                  <div style={{
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "flex-end",
                    alignItems: "center",
                    padding: "0px 16px",
                    gap: "10px",
                    height: "54px",
                    flexGrow: 1,
                  }}>
                    <span style={{
                      fontFamily: "'Pretendard'",
                      fontStyle: "normal",
                      fontWeight: 600,
                      fontSize: "18px",
                      lineHeight: "128%",
                      letterSpacing: "-0.02em",
                      color: "#0C0C0C",
                    }} data-testid="text-total-amount">
                      {totalAmount.toLocaleString()}원
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Section - 비고 & 입금정보 */}
          <div style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            padding: "0px",
            gap: "8px",
            width: "604px",
            height: "261px",
          }}>
            {/* 비고 Box */}
            <div style={{
              boxSizing: "border-box",
              width: "298px",
              height: "261px",
              border: "1px solid rgba(12, 12, 12, 0.04)",
              backdropFilter: "blur(7px)",
              borderRadius: "12px",
              position: "relative",
            }}>
              <span style={{
                position: "absolute",
                left: "16px",
                top: "15px",
                ...valueStyle,
              }}>
                비고
              </span>
              <div style={{
                position: "absolute",
                left: "16px",
                top: "54px",
                width: "266px",
                height: "186px",
              }}>
                <textarea
                  value={invoiceRemarks}
                  onChange={(e) => setInvoiceRemarks(e.target.value)}
                  placeholder="내용을 입력해주세요"
                  style={{
                    width: "100%",
                    height: "100%",
                    fontFamily: "'Pretendard'",
                    fontStyle: "normal",
                    fontWeight: 400,
                    fontSize: "15px",
                    lineHeight: "128%",
                    letterSpacing: "-0.01em",
                    color: "#0C0C0C",
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    resize: "none",
                  }}
                  data-testid="textarea-invoice-remarks"
                />
              </div>
            </div>

            {/* 입금 정보 Box */}
            <div style={{
              width: "298px",
              height: "261px",
              background: "rgba(12, 12, 12, 0.04)",
              backdropFilter: "blur(7px)",
              borderRadius: "12px",
              position: "relative",
            }}>
              <span style={{
                position: "absolute",
                left: "16px",
                top: "15px",
                ...valueStyle,
              }}>
                입금 정보
              </span>
              <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                padding: "0px",
                gap: "15px",
                position: "absolute",
                width: "266px",
                left: "16px",
                top: "64px",
              }}>
                {/* 은행명 */}
                <div style={infoRowStyle}>
                  <span style={labelStyle}>은행명</span>
                  <span style={valueStyle}>신한은행
</span>
                </div>
                <div style={dividerStyle} />
                {/* 계좌번호 */}
                <div style={infoRowStyle}>
                  <span style={labelStyle}>계좌번호</span>
                  <span style={valueStyle}>140-015-744120</span>
                </div>
                <div style={dividerStyle} />
                {/* 예금주 */}
                <div style={infoRowStyle}>
                  <span style={labelStyle}>예금주</span>
                  <span style={valueStyle}>주식회사 플록슨</span>
                </div>
                <div style={dividerStyle} />
                {/* 사업자등록번호 */}
                <div style={infoRowStyle}>
                  <span style={labelStyle}>사업자등록번호</span>
                  <span style={valueStyle}>517-89-03490</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 수신자 이메일 Section */}
        <div style={{
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          padding: "16px 38px",
          gap: "16px",
          width: "680px",
        }}>
          <span style={{
            fontFamily: "'Pretendard'",
            fontStyle: "normal",
            fontWeight: 500,
            fontSize: "14px",
            lineHeight: "128%",
            letterSpacing: "-0.01em",
            color: "rgba(12, 12, 12, 0.7)",
            whiteSpace: "nowrap",
          }}>수신자 이메일</span>
          <input
            type="email"
            value={invoiceRecipientEmail}
            onChange={(e) => setInvoiceRecipientEmail(e.target.value)}
            placeholder="보험사 이메일 주소를 입력해주세요"
            style={{
              flex: 1,
              fontFamily: "'Pretendard'",
              fontStyle: "normal",
              fontWeight: 400,
              fontSize: "14px",
              lineHeight: "128%",
              letterSpacing: "-0.01em",
              color: "#0C0C0C",
              background: "rgba(12, 12, 12, 0.04)",
              border: "1px solid rgba(12, 12, 12, 0.1)",
              borderRadius: "8px",
              padding: "10px 12px",
              outline: "none",
            }}
            data-testid="input-recipient-email"
          />
        </div>

        {/* Footer */}
        <div style={{
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          padding: "20px 38px",
          gap: "10px",
          width: "680px",
          borderTop: "1px solid rgba(12, 12, 12, 0.1)",
        }}>
          <div style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "flex-end",
            alignItems: "center",
            padding: "0px",
            gap: "8px",
            width: "604px",
            height: "40px",
          }}>
            {/* PDF 발송 Button */}
            <button
              onClick={handleSendInvoicePdf}
              disabled={isSendingPdf || !invoiceRecipientEmail}
              style={{
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                padding: "10px 16px",
                gap: "10px",
                minWidth: "100px",
                height: "40px",
                border: "1px solid rgba(12, 12, 12, 0.1)",
                borderRadius: "8px",
                background: "transparent",
                cursor: isSendingPdf || !invoiceRecipientEmail ? "not-allowed" : "pointer",
                opacity: isSendingPdf || !invoiceRecipientEmail ? 0.5 : 1,
                whiteSpace: "nowrap",
              }}
              data-testid="button-invoice-pdf">
              <span style={{
                fontFamily: "'Pretendard'",
                fontStyle: "normal",
                fontWeight: 600,
                fontSize: "16px",
                lineHeight: "128%",
                letterSpacing: "-0.02em",
                color: "#008FED",
                whiteSpace: "nowrap",
              }}>
                {isSendingPdf ? "발송 중..." : "PDF 발송"}
              </span>
            </button>

            {/* 저장 Button */}
            <button
              onClick={handleSave}
              style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                padding: "10px 16px",
                gap: "10px",
                width: "60px",
                height: "40px",
                background: "#008FED",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
              }}
              data-testid="button-invoice-save"
            >
              <span style={{
                fontFamily: "'Pretendard'",
                fontStyle: "normal",
                fontWeight: 600,
                fontSize: "16px",
                lineHeight: "128%",
                letterSpacing: "-0.02em",
                color: "#FFFFFF",
              }}>
                저장
              </span>
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
