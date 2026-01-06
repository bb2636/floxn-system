import { useState, useRef, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Image as ImageIcon, File } from "lucide-react";

interface CaseDocument {
  id: string;
  fileName: string;
  fileType: string;
  category: string;
  fileUrl?: string;
}

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
    assessorEmail?: string | null;
    investigatorEmail?: string | null;
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

const DOCUMENT_CATEGORIES = ["사진-수리중", "사진-복구완료", "기본자료", "증빙자료", "청구자료"] as const;

const DOCUMENT_TABS = ["전체", "현장사진", "기본자료", "증빙자료", "청구자료"] as const;
type DocumentTab = typeof DOCUMENT_TABS[number];

const CATEGORY_TO_TAB: Record<string, DocumentTab> = {
  "현장출동사진": "현장사진",
  "현장": "현장사진",
  "수리중 사진": "현장사진",
  "수리중": "현장사진",
  "사진-수리중": "현장사진",
  "복구완료 사진": "현장사진",
  "복구완료": "현장사진",
  "사진-복구완료": "현장사진",
  "보험금 청구서": "기본자료",
  "개인정보 동의서(가족용)": "기본자료",
  "기본자료": "기본자료",
  "주민등록등본": "증빙자료",
  "등기부등본": "증빙자료",
  "건축물대장": "증빙자료",
  "기타증빙자료(민원일지 등)": "증빙자료",
  "증빙자료": "증빙자료",
  "위임장": "청구자료",
  "도급계약서": "청구자료",
  "복구완료확인서": "청구자료",
  "부가세 청구자료": "청구자료",
  "청구": "청구자료",
  "청구자료": "청구자료",
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
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [selectedDocTab, setSelectedDocTab] = useState<DocumentTab>("전체");

  const { data: documents = [] } = useQuery<CaseDocument[]>({
    queryKey: [`/api/cases/${caseData?.id}/documents`],
    enabled: open && !!caseData?.id,
  });

  const documentsByCategory = useMemo(() => {
    const grouped: Record<string, CaseDocument[]> = {};
    for (const category of DOCUMENT_CATEGORIES) {
      grouped[category] = documents.filter(doc => doc.category === category);
    }
    return grouped;
  }, [documents]);

  const filteredDocumentsForGrid = useMemo(() => {
    if (selectedDocTab === "전체") return documents;
    return documents.filter(doc => CATEGORY_TO_TAB[doc.category] === selectedDocTab);
  }, [documents, selectedDocTab]);

  const getFileIcon = (fileType: string) => {
    if (fileType?.startsWith("image/")) return <ImageIcon className="w-6 h-6 text-muted-foreground" />;
    if (fileType === "application/pdf") return <FileText className="w-6 h-6 text-muted-foreground" />;
    return <File className="w-6 h-6 text-muted-foreground" />;
  };

  const getFileThumbnail = (doc: CaseDocument) => {
    if (doc.fileType?.startsWith("image/") && doc.fileUrl) {
      return (
        <img 
          src={doc.fileUrl} 
          alt={doc.fileName}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            borderRadius: "8px",
          }}
        />
      );
    }
    return (
      <div style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(12, 12, 12, 0.04)",
        borderRadius: "8px",
      }}>
        {getFileIcon(doc.fileType)}
      </div>
    );
  };

  const toggleEmail = (email: string) => {
    setSelectedEmails(prev => {
      if (prev.includes(email)) {
        return prev.filter(e => e !== email);
      } else {
        return [...prev, email];
      }
    });
  };

  const toggleDocumentId = (docId: string) => {
    setSelectedDocumentIds(prev => {
      if (prev.includes(docId)) {
        return prev.filter(id => id !== docId);
      } else {
        return [...prev, docId];
      }
    });
  };

  useEffect(() => {
    if (selectedEmails.length > 0) {
      setInvoiceRecipientEmail(selectedEmails.join(", "));
    }
  }, [selectedEmails]);

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
        setSelectedEmails([]);
        setSelectedDocumentIds([]);
      } else if (!open) {
        setInvoiceDamagePreventionAmount("");
        setInvoicePropertyRepairAmount("");
        setFieldDispatchPreventionAmount("");
        setFieldDispatchPropertyAmount("");
        setInvoiceRemarks("");
        setInvoiceRecipientEmail("");
        setSelectedEmails([]);
        setSelectedDocumentIds([]);
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
          selectedDocumentIds: selectedDocumentIds,
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

        {/* 협력사 제출 증빙자료 Section */}
        {documents.length > 0 && (
          <div style={{
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            padding: "16px 38px",
            gap: "12px",
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
            }}>협력사 제출 증빙자료</span>
            
            {/* Category Tabs */}
            <div style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
            }}>
              {DOCUMENT_TABS.map(tab => {
                const isSelected = selectedDocTab === tab;
                const tabCount = tab === "전체" 
                  ? documents.length 
                  : documents.filter(doc => CATEGORY_TO_TAB[doc.category] === tab).length;
                return (
                  <button
                    key={tab}
                    onClick={() => setSelectedDocTab(tab)}
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      padding: "6px 12px",
                      gap: "4px",
                      background: isSelected ? "#008FED" : "rgba(12, 12, 12, 0.04)",
                      borderRadius: "16px",
                      border: "none",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                    data-testid={`tab-doc-${tab}`}
                  >
                    <span style={{
                      fontFamily: "'Pretendard'",
                      fontStyle: "normal",
                      fontWeight: 500,
                      fontSize: "12px",
                      lineHeight: "128%",
                      letterSpacing: "-0.01em",
                      color: isSelected ? "#FFFFFF" : "rgba(12, 12, 12, 0.7)",
                    }}>
                      {tab}
                    </span>
                    {tabCount > 0 && (
                      <span style={{
                        fontFamily: "'Pretendard'",
                        fontWeight: 500,
                        fontSize: "11px",
                        color: isSelected ? "rgba(255, 255, 255, 0.8)" : "rgba(12, 12, 12, 0.5)",
                      }}>
                        {tabCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Select All Row */}
            <div style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "8px 0",
              borderBottom: "1px solid rgba(12, 12, 12, 0.1)",
            }}>
              <label style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
              }}>
                <Checkbox
                  checked={filteredDocumentsForGrid.length > 0 && filteredDocumentsForGrid.every(doc => selectedDocumentIds.includes(doc.id))}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      const newIds = filteredDocumentsForGrid.map(doc => doc.id);
                      setSelectedDocumentIds(prev => Array.from(new Set([...prev, ...newIds])));
                    } else {
                      const currentTabIds = new Set(filteredDocumentsForGrid.map(doc => doc.id));
                      setSelectedDocumentIds(prev => prev.filter(id => !currentTabIds.has(id)));
                    }
                  }}
                  disabled={filteredDocumentsForGrid.length === 0}
                  data-testid="checkbox-select-all-docs"
                />
                <span style={{
                  fontFamily: "'Pretendard'",
                  fontSize: "12px",
                  color: "rgba(12, 12, 12, 0.7)",
                }}>
                  전체 선택
                </span>
              </label>
              <span style={{
                fontFamily: "'Pretendard'",
                fontSize: "12px",
                color: "rgba(12, 12, 12, 0.5)",
              }}>
                {selectedDocumentIds.length}개 선택됨
              </span>
            </div>

            {/* Document Grid */}
            <ScrollArea style={{ maxHeight: "280px" }}>
              {filteredDocumentsForGrid.length === 0 ? (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "40px",
                  color: "rgba(12, 12, 12, 0.5)",
                  fontFamily: "'Pretendard'",
                  fontSize: "13px",
                }}>
                  해당 카테고리에 자료가 없습니다.
                </div>
              ) : (
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: "12px",
                  padding: "4px",
                }}>
                  {filteredDocumentsForGrid.map(doc => {
                    const isSelected = selectedDocumentIds.includes(doc.id);
                    return (
                      <div
                        key={doc.id}
                        onClick={() => toggleDocumentId(doc.id)}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "6px",
                          cursor: "pointer",
                          position: "relative",
                        }}
                        data-testid={`doc-thumbnail-${doc.id}`}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            toggleDocumentId(doc.id);
                          }
                        }}
                      >
                        <div style={{
                          width: "100%",
                          aspectRatio: "1",
                          borderRadius: "8px",
                          overflow: "visible",
                          border: isSelected ? "2px solid #008FED" : "1px solid rgba(12, 12, 12, 0.1)",
                          position: "relative",
                        }}>
                          <div style={{
                            width: "100%",
                            height: "100%",
                            overflow: "hidden",
                            borderRadius: "6px",
                          }}>
                            {getFileThumbnail(doc)}
                          </div>
                          {/* Selection indicator overlay */}
                          <div style={{
                            position: "absolute",
                            top: "6px",
                            right: "6px",
                            width: "20px",
                            height: "20px",
                            borderRadius: "4px",
                            background: isSelected ? "#008FED" : "rgba(255, 255, 255, 0.9)",
                            border: isSelected ? "none" : "1px solid rgba(12, 12, 12, 0.2)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                            pointerEvents: "none",
                          }}>
                            {isSelected && (
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                <path d="M2.5 6L5 8.5L9.5 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </div>
                        </div>
                        <span style={{
                          fontFamily: "'Pretendard'",
                          fontStyle: "normal",
                          fontWeight: 400,
                          fontSize: "11px",
                          lineHeight: "128%",
                          letterSpacing: "-0.01em",
                          color: "rgba(12, 12, 12, 0.7)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          maxWidth: "100%",
                        }}>
                          {doc.fileName}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        )}

        {/* 이메일 수신자 선택 Section */}
        <div style={{
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          padding: "16px 38px",
          gap: "12px",
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
          }}>수신자 이메일</span>
          
          {/* Email Checkboxes */}
          {(caseData?.assessorEmail || caseData?.investigatorEmail) && (
            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              paddingLeft: "8px",
            }}>
              {caseData?.assessorEmail && (
                <label
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "pointer",
                  }}
                  data-testid="checkbox-assessor-email"
                >
                  <Checkbox
                    checked={selectedEmails.includes(caseData.assessorEmail)}
                    onCheckedChange={() => toggleEmail(caseData.assessorEmail!)}
                  />
                  <span style={{
                    fontFamily: "'Pretendard'",
                    fontStyle: "normal",
                    fontWeight: 400,
                    fontSize: "13px",
                    lineHeight: "128%",
                    letterSpacing: "-0.01em",
                    color: "rgba(12, 12, 12, 0.8)",
                  }}>
                    심사자 이메일: {caseData.assessorEmail}
                  </span>
                </label>
              )}
              {caseData?.investigatorEmail && (
                <label
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "pointer",
                  }}
                  data-testid="checkbox-investigator-email"
                >
                  <Checkbox
                    checked={selectedEmails.includes(caseData.investigatorEmail)}
                    onCheckedChange={() => toggleEmail(caseData.investigatorEmail!)}
                  />
                  <span style={{
                    fontFamily: "'Pretendard'",
                    fontStyle: "normal",
                    fontWeight: 400,
                    fontSize: "13px",
                    lineHeight: "128%",
                    letterSpacing: "-0.01em",
                    color: "rgba(12, 12, 12, 0.8)",
                  }}>
                    조사자 이메일: {caseData.investigatorEmail}
                  </span>
                </label>
              )}
            </div>
          )}

          {/* Email Input */}
          <input
            type="email"
            value={invoiceRecipientEmail}
            onChange={(e) => {
              setInvoiceRecipientEmail(e.target.value);
              setSelectedEmails([]);
            }}
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
