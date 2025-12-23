import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface FieldDispatchCostSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseData: {
    id: string;
    caseNumber?: string | null;
    insuranceCompany?: string | null;
    insuranceAccidentNo?: string | null;
    receptionDate?: string | null;
    fieldDispatchInvoiceAmount?: string | null;
    fieldDispatchInvoiceRemarks?: string | null;
  } | null;
  relatedCases?: Array<{
    id: string;
    caseNumber?: string | null;
  }>;
}

export function FieldDispatchCostSheet({ open, onOpenChange, caseData, relatedCases = [] }: FieldDispatchCostSheetProps) {
  const { toast } = useToast();
  const invoicePdfRef = useRef<HTMLDivElement>(null);
  
  const [fieldDispatchAmount, setFieldDispatchAmount] = useState<string>("");
  const [invoiceRemarks, setInvoiceRemarks] = useState<string>("");
  const [invoiceRecipientEmail, setInvoiceRecipientEmail] = useState<string>("");
  const [isSendingPdf, setIsSendingPdf] = useState(false);

  useEffect(() => {
    if (open && caseData) {
      // 기존 저장된 값이 있으면 불러오기
      setFieldDispatchAmount(caseData.fieldDispatchInvoiceAmount || "");
      setInvoiceRemarks(caseData.fieldDispatchInvoiceRemarks || "");
      setInvoiceRecipientEmail("");
    } else if (!open) {
      setFieldDispatchAmount("");
      setInvoiceRemarks("");
      setInvoiceRecipientEmail("");
    }
  }, [open, caseData]);

  const totalAmount = parseInt(fieldDispatchAmount || "0") || 0;

  const handleSendInvoicePdf = async () => {
    if (!invoicePdfRef.current) {
      toast({
        title: "PDF 생성 실패",
        description: "변환할 청구서 정보를 찾을 수 없습니다.",
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

      const response = await fetch('/api/send-field-dispatch-invoice-email', {
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
          fieldDispatchAmount: parseInt(fieldDispatchAmount || "0") || 0,
          totalAmount,
          remarks: invoiceRemarks,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "이메일 전송 완료",
          description: `${invoiceRecipientEmail}으로 현장출동비용 청구서 PDF가 전송되었습니다.`,
        });
        onOpenChange(false);
      } else {
        throw new Error(result.error || "이메일 전송에 실패했습니다");
      }
    } catch (error) {
      console.error("현장출동비용 청구서 PDF 이메일 전송 중 오류 발생", error);
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
      await apiRequest("POST", "/api/field-dispatch-invoice/send", {
        caseId: caseData?.id,
        relatedCaseIds: relatedCases.map(c => c.id),
        fieldDispatchAmount: parseInt(fieldDispatchAmount || "0") || 0,
        remarks: invoiceRemarks,
        totalAmount: totalAmount,
      });
      toast({
        title: "저장 완료",
        description: "현장출동비용 청구서가 저장되었습니다.",
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
        data-testid="dialog-field-dispatch-invoice"
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
                현장출동비용 청구
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
              alignItems: "flex-start",
              padding: "0px 38px",
              gap: "26px",
              background: "#FFFFFF",
            }}
          >
            <div style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: "8px",
              width: "100%",
            }}>
              <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                padding: "15px 16px",
                gap: "15px",
                flex: 1,
                background: "rgba(12, 12, 12, 0.04)",
                backdropFilter: "blur(7px)",
                borderRadius: "12px",
              }}>
                <div style={{
                  display: "flex",
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  width: "100%",
                }}>
                  <span style={{
                    fontFamily: "Pretendard",
                    fontWeight: 400,
                    fontSize: "15px",
                    lineHeight: "128%",
                    letterSpacing: "-0.01em",
                    color: "rgba(12, 12, 12, 0.7)",
                  }}>
                    수신
                  </span>
                  <span style={{
                    fontFamily: "Pretendard",
                    fontWeight: 600,
                    fontSize: "15px",
                    lineHeight: "128%",
                    letterSpacing: "-0.02em",
                    color: "rgba(12, 12, 12, 0.9)",
                  }}>
                    {caseData?.insuranceCompany || "-"}
                  </span>
                </div>
                <div style={{
                  width: "100%",
                  height: "0px",
                  border: "1px solid rgba(12, 12, 12, 0.1)",
                }} />
                <div style={{
                  display: "flex",
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  width: "100%",
                }}>
                  <span style={{
                    fontFamily: "Pretendard",
                    fontWeight: 400,
                    fontSize: "15px",
                    lineHeight: "128%",
                    letterSpacing: "-0.01em",
                    color: "rgba(12, 12, 12, 0.7)",
                  }}>
                    사고번호
                  </span>
                  <span style={{
                    fontFamily: "Pretendard",
                    fontWeight: 600,
                    fontSize: "15px",
                    lineHeight: "128%",
                    letterSpacing: "-0.02em",
                    color: "rgba(12, 12, 12, 0.9)",
                  }}>
                    {caseData?.insuranceAccidentNo || "-"}
                  </span>
                </div>
              </div>

              <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                padding: "15px 16px",
                gap: "15px",
                flex: 1,
                background: "rgba(12, 12, 12, 0.04)",
                backdropFilter: "blur(7px)",
                borderRadius: "12px",
              }}>
                <div style={{
                  display: "flex",
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  width: "100%",
                }}>
                  <span style={{
                    fontFamily: "Pretendard",
                    fontWeight: 400,
                    fontSize: "15px",
                    lineHeight: "128%",
                    letterSpacing: "-0.01em",
                    color: "rgba(12, 12, 12, 0.7)",
                  }}>
                    수임일자
                  </span>
                  <span style={{
                    fontFamily: "Pretendard",
                    fontWeight: 600,
                    fontSize: "15px",
                    lineHeight: "128%",
                    letterSpacing: "-0.02em",
                    color: "rgba(12, 12, 12, 0.9)",
                  }}>
                    {caseData?.receptionDate || "-"}
                  </span>
                </div>
                <div style={{
                  width: "100%",
                  height: "0px",
                  border: "1px solid rgba(12, 12, 12, 0.1)",
                }} />
                <div style={{
                  display: "flex",
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  width: "100%",
                }}>
                  <span style={{
                    fontFamily: "Pretendard",
                    fontWeight: 400,
                    fontSize: "15px",
                    lineHeight: "128%",
                    letterSpacing: "-0.01em",
                    color: "rgba(12, 12, 12, 0.7)",
                  }}>
                    제출일자
                  </span>
                  <span style={{
                    fontFamily: "Pretendard",
                    fontWeight: 600,
                    fontSize: "15px",
                    lineHeight: "128%",
                    letterSpacing: "-0.02em",
                    color: "rgba(12, 12, 12, 0.9)",
                  }}>
                    {format(new Date(), "yyyy.MM.dd")}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ width: "100%" }}>
              <div style={{
                fontFamily: "Pretendard",
                fontWeight: 400,
                fontSize: "14px",
                lineHeight: "128%",
                letterSpacing: "-0.01em",
                color: "rgba(12, 12, 12, 0.5)",
                marginBottom: "8px",
              }}>
                Particulars
              </div>
              <div style={{
                fontFamily: "Pretendard",
                fontWeight: 500,
                fontSize: "16px",
                lineHeight: "128%",
                letterSpacing: "-0.02em",
                color: "rgba(12, 12, 12, 0.9)",
              }}>
                사고번호 {caseData?.insuranceAccidentNo || "-"}
              </div>
            </div>

            <div style={{ width: "100%" }}>
              <div style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 0",
                borderBottom: "1px solid rgba(12, 12, 12, 0.1)",
              }}>
                <span style={{
                  fontFamily: "Pretendard",
                  fontWeight: 600,
                  fontSize: "14px",
                  lineHeight: "128%",
                  letterSpacing: "-0.02em",
                  color: "rgba(12, 12, 12, 0.5)",
                }}>
                  PARTICULARS
                </span>
                <span style={{
                  fontFamily: "Pretendard",
                  fontWeight: 600,
                  fontSize: "14px",
                  lineHeight: "128%",
                  letterSpacing: "-0.02em",
                  color: "rgba(12, 12, 12, 0.5)",
                }}>
                  AMOUNT
                </span>
              </div>

              <div style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px 0",
                borderBottom: "1px solid rgba(12, 12, 12, 0.1)",
              }}>
                <span style={{
                  fontFamily: "Pretendard",
                  fontWeight: 500,
                  fontSize: "15px",
                  lineHeight: "128%",
                  letterSpacing: "-0.01em",
                  color: "rgba(12, 12, 12, 0.7)",
                }}>
                  현장출동비용
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <input
                    type="text"
                    value={fieldDispatchAmount ? Number(fieldDispatchAmount).toLocaleString() : ""}
                    onChange={(e) => setFieldDispatchAmount(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="0"
                    className="invoice-input-field"
                    style={{
                      fontFamily: "Pretendard",
                      fontWeight: 500,
                      fontSize: "15px",
                      lineHeight: "128%",
                      letterSpacing: "-0.01em",
                      color: "rgba(12, 12, 12, 0.9)",
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      textAlign: "right",
                      width: "120px",
                    }}
                    data-testid="input-field-dispatch-cost"
                  />
                  <span style={{
                    fontFamily: "Pretendard",
                    fontWeight: 500,
                    fontSize: "15px",
                    color: "rgba(12, 12, 12, 0.9)",
                  }}>원</span>
                  <span 
                    className="invoice-span-field"
                    style={{
                      display: "none",
                      fontFamily: "Pretendard",
                      fontWeight: 500,
                      fontSize: "15px",
                      lineHeight: "128%",
                      letterSpacing: "-0.01em",
                      color: "rgba(12, 12, 12, 0.9)",
                    }}
                    data-testid="text-field-dispatch-cost"
                  >
                    {fieldDispatchAmount ? Number(fieldDispatchAmount).toLocaleString() : "0"}원
                  </span>
                </div>
              </div>

              <div style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px 0",
              }}>
                <span style={{
                  fontFamily: "Pretendard",
                  fontWeight: 600,
                  fontSize: "15px",
                  lineHeight: "128%",
                  letterSpacing: "-0.02em",
                  color: "rgba(12, 12, 12, 0.9)",
                }}>
                  TOTAL AMOUNT
                </span>
                <span style={{
                  fontFamily: "Pretendard",
                  fontWeight: 700,
                  fontSize: "18px",
                  lineHeight: "128%",
                  letterSpacing: "-0.02em",
                  color: "rgba(12, 12, 12, 0.9)",
                }}>
                  {totalAmount.toLocaleString()}원
                </span>
              </div>
            </div>

            <div style={{
              display: "flex",
              flexDirection: "row",
              gap: "24px",
              width: "100%",
            }}>
              <div style={{ flex: 1 }}>
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
                    height: "120px",
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
                  }}
                  data-testid="textarea-field-dispatch-remarks"
                />
              </div>

              <div style={{
                flex: 1,
                background: "rgba(12, 149, 246, 0.1)",
                borderRadius: "12px",
                padding: "16px",
              }}>
                <div style={{
                  fontFamily: "Pretendard",
                  fontWeight: 600,
                  fontSize: "15px",
                  lineHeight: "128%",
                  letterSpacing: "-0.02em",
                  color: "rgba(12, 12, 12, 0.9)",
                  marginBottom: "16px",
                }}>
                  입금 정보
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{
                      fontFamily: "Pretendard",
                      fontWeight: 400,
                      fontSize: "14px",
                      color: "rgba(12, 12, 12, 0.7)",
                    }}>
                      은행명
                    </span>
                    <span style={{
                      fontFamily: "Pretendard",
                      fontWeight: 500,
                      fontSize: "14px",
                      color: "rgba(12, 12, 12, 0.9)",
                    }}>
                      신한
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{
                      fontFamily: "Pretendard",
                      fontWeight: 400,
                      fontSize: "14px",
                      color: "rgba(12, 12, 12, 0.7)",
                    }}>
                      계좌번호
                    </span>
                    <span style={{
                      fontFamily: "Pretendard",
                      fontWeight: 500,
                      fontSize: "14px",
                      color: "rgba(12, 12, 12, 0.9)",
                    }}>
                      140-015-744120
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{
                      fontFamily: "Pretendard",
                      fontWeight: 400,
                      fontSize: "14px",
                      color: "rgba(12, 12, 12, 0.7)",
                    }}>
                      예금주
                    </span>
                    <span style={{
                      fontFamily: "Pretendard",
                      fontWeight: 500,
                      fontSize: "14px",
                      color: "rgba(12, 12, 12, 0.9)",
                    }}>
                      플록슨
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{
                      fontFamily: "Pretendard",
                      fontWeight: 400,
                      fontSize: "14px",
                      color: "rgba(12, 12, 12, 0.7)",
                    }}>
                      사업자등록번호
                    </span>
                    <span style={{
                      fontFamily: "Pretendard",
                      fontWeight: 500,
                      fontSize: "14px",
                      color: "rgba(12, 12, 12, 0.9)",
                    }}>
                      517-89-03490
                    </span>
                  </div>
                </div>
              </div>
            </div>
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
                data-testid="input-field-dispatch-email"
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
                data-testid="button-field-dispatch-pdf"
              >
                {isSendingPdf ? "발송 중..." : "PDF 발송"}
              </Button>
              <Button
                onClick={handleSave}
                style={{ background: "#008FED" }}
                data-testid="button-field-dispatch-save"
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
