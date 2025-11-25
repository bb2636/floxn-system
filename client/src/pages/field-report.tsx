import { useQuery, useMutation } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import type { Drawing, CaseDocument as SchemaDocument } from "@shared/schema";

interface Case {
  id: string;
  caseNumber: string;
  insuranceCompany: string;
  insuranceAccidentNo: string;
  clientName: string;
  policyHolderName: string;
  insuredName: string;
  insuredContact: string;
  insuredAddress: string;
  accidentDate: string;
  accidentTime: string;
  assignedPartner: string;
  assignedPartnerManager: string;
  assignedPartnerContact: string;
  // 현장조사 정보
  visitDate: string | null;
  visitTime: string | null;
  travelDistance: string | null;
  dispatchLocation: string | null;
  accompaniedPerson: string | null;
  accidentCategory: string | null;
  accidentCause: string | null;
  specialNotes: string | null;
  victimName: string | null;
  victimContact: string | null;
  victimAddress: string | null;
  additionalVictims: string | null;
  specialRequests: string | null;
  processingTypes: string | null;
  processingTypeOther: string | null;
  recoveryMethodType: string | null;
  additionalNotes: string | null;
  // 추가 필드
  fieldSurveyStatus?: string | null;
  createdAt?: string | null;
  assignmentDate?: string | null;
  urgency?: string | null;
}


interface LaborCostRow {
  id?: string;
  category: string;
  workName: string;
  detailWork: string;
  detailItem?: string;
  unit: string;
  standardPrice: number;
  quantity: number;
  amount: number;
}

interface MaterialCostRow {
  id?: string;
  공종: string;
  자재: string;
  규격: string;
  단위: string;
  기준단가: number;
  수량: number;
  금액: number;
  비고?: string;
}

interface Estimate {
  id: string;
  caseId: string;
  version: number;
  status: string;
  laborCostData?: LaborCostRow[] | string | null;
  materialCostData?: MaterialCostRow[] | string | null;
  createdAt?: string;
}

interface EstimateRow {
  id: string;
  category: string;
  location: string;
  workName: string;
  damageWidth?: number;
  damageHeight?: number;
  damageArea: number;
  repairWidth?: number;
  repairHeight?: number;
  repairArea: number;
  note: string;
}

interface CompletionStatus {
  fieldSurvey: boolean;
  drawing: boolean;
  documents: boolean;
  estimate: boolean;
  isComplete: boolean;
}

interface ReportData {
  case: Case;
  drawing: Drawing | null;
  documents: SchemaDocument[];
  estimate: {
    estimate: Estimate | null;
    rows: EstimateRow[];
  };
  completionStatus: CompletionStatus;
}

// Safe parsing helpers with numeric field coercion and object validation
function safeParseLaborCosts(data: LaborCostRow[] | string | null | undefined): LaborCostRow[] {
  if (!data) return [];
  
  let rawData: any[];
  if (Array.isArray(data)) {
    rawData = data;
  } else if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      rawData = Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  } else {
    return [];
  }
  
  // Filter out non-object entries and coerce numeric fields to ensure type safety
  return rawData
    .filter((row) => row && typeof row === 'object' && !Array.isArray(row))
    .map((row) => ({
      ...row,
      standardPrice: Number(row.standardPrice) || 0,
      quantity: Number(row.quantity) || 0,
      amount: Number(row.amount) || 0,
    }));
}

function safeParseMaterialCosts(data: MaterialCostRow[] | string | null | undefined): MaterialCostRow[] {
  if (!data) return [];
  
  let rawData: any[];
  if (Array.isArray(data)) {
    rawData = data;
  } else if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      rawData = Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  } else {
    return [];
  }
  
  // Filter out non-object entries and coerce numeric fields to ensure type safety
  return rawData
    .filter((row) => row && typeof row === 'object' && !Array.isArray(row))
    .map((row) => ({
      ...row,
      기준단가: Number(row.기준단가) || 0,
      수량: Number(row.수량) || 0,
      금액: Number(row.금액) || 0,
    }));
}

export default function FieldReport() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // 현장입력에서 선택한 케이스 ID 가져오기
  const selectedCaseId = localStorage.getItem('selectedFieldSurveyCaseId') || '';
  
  // 종합진행관리에서 왔는지 확인
  const returnToComprehensiveProgress = localStorage.getItem('returnToComprehensiveProgress') === 'true';
  
  // 현재 사용자 정보 가져오기
  const { data: currentUser, isLoading: isUserLoading } = useQuery<{ id: string; role: string }>({
    queryKey: ["/api/user"],
  });
  
  const isAdmin = currentUser?.role === "관리자";
  const isPartner = currentUser?.role === "협력사";
  
  // 통합 보고서 데이터 가져오기
  const { data: reportData, isLoading } = useQuery<ReportData>({
    queryKey: ["/api/field-surveys", selectedCaseId, "report"],
    enabled: !!selectedCaseId,
  });

  // 기타사항 상태
  const [additionalNotes, setAdditionalNotes] = useState('');
  
  // 제출 확인 다이얼로그 상태
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  
  // 심사 다이얼로그 상태
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewDecision, setReviewDecision] = useState<"승인" | "비승인">("승인");
  const [reviewComment, setReviewComment] = useState("");
  
  // 이메일 전송 다이얼로그 상태
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailAddress, setEmailAddress] = useState("");

  // reportData가 변경될 때 additionalNotes 상태 업데이트
  useEffect(() => {
    if (reportData?.case.additionalNotes !== undefined) {
      setAdditionalNotes(reportData.case.additionalNotes || '');
    }
  }, [reportData?.case.additionalNotes]);

  // Parse and memoize labor cost and material cost data
  const parsedLaborCosts = useMemo(() => {
    return safeParseLaborCosts(reportData?.estimate?.estimate?.laborCostData);
  }, [reportData?.estimate?.estimate?.laborCostData]);

  const parsedMaterialCosts = useMemo(() => {
    return safeParseMaterialCosts(reportData?.estimate?.estimate?.materialCostData);
  }, [reportData?.estimate?.estimate?.materialCostData]);

  // 기타사항 저장 mutation
  const saveNotesMutation = useMutation({
    mutationFn: async (notes: string) => {
      return apiRequest(
        "PATCH",
        `/api/cases/${selectedCaseId}/additional-notes`,
        { additionalNotes: notes }
      );
    },
    onSuccess: () => {
      toast({
        title: "저장 완료",
        description: "기타사항이 저장되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/field-surveys", selectedCaseId, "report"] });
    },
    onError: (error: Error) => {
      toast({
        title: "저장 실패",
        description: error.message || "기타사항 저장 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // 보고서 제출 mutation
  const submitReportMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", `/api/cases/${selectedCaseId}/submit`);
    },
    onSuccess: () => {
      toast({
        title: "제출 완료",
        description: "현장출동보고서가 성공적으로 제출되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/field-surveys", selectedCaseId, "report"] });
      setShowSubmitDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: "제출 실패",
        description: error.message || "보고서 제출 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // 보고서 심사 mutation
  const reviewMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(
        "PATCH",
        `/api/cases/${selectedCaseId}/review`,
        {
          decision: reviewDecision,
          reviewComment: reviewComment || "",
        }
      );
    },
    onSuccess: () => {
      toast({
        title: "심사 완료",
        description: `보고서가 ${reviewDecision} 처리되었습니다.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/field-surveys", selectedCaseId, "report"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      setShowReviewDialog(false);
      setReviewDecision("승인");
      setReviewComment("");
    },
    onError: (error: Error) => {
      toast({
        title: "심사 실패",
        description: error.message || "보고서 심사 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  if (!selectedCaseId) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">케이스를 먼저 선택해주세요.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 역할 정보 로딩 중이거나 데이터 로딩 중이면 로딩 화면 표시
  if (isLoading || isUserLoading) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">로딩중...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">보고서 데이터를 찾을 수 없습니다.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { case: caseData, drawing, documents, estimate, completionStatus } = reportData;

  return (
    <div className="relative p-8">
      {/* 페이지 타이틀 및 버튼 */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          {/* 뒤로 가기 버튼 (종합진행관리에서 온 경우만) */}
          {returnToComprehensiveProgress && (
            <button
              onClick={() => {
                localStorage.removeItem('returnToComprehensiveProgress');
                setLocation('/comprehensive-progress');
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 12px",
                background: "rgba(12, 12, 12, 0.05)",
                borderRadius: "6px",
                border: "1px solid rgba(12, 12, 12, 0.1)",
                fontFamily: "Pretendard",
                fontSize: "14px",
                fontWeight: 500,
                color: "rgba(12, 12, 12, 0.7)",
                cursor: "pointer",
              }}
              data-testid="button-back-to-comprehensive"
            >
              <ArrowLeft size={16} />
              종합진행관리
            </button>
          )}
          
          <div className="flex items-center gap-2">
            <h1
              style={{
                fontFamily: "Pretendard",
                fontSize: "24px",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: "#0C0C0C",
              }}
            >
              현장출동보고서
            </h1>
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "rgba(12, 12, 12, 0.2)",
              }}
            />
          </div>
        </div>

        {/* 역할별 버튼 */}
        <div className="flex items-center gap-3">
          {/* 역할 확인 중일 때는 버튼 표시하지 않음 */}
          {!isUserLoading && isPartner && (
            <>
              <Button
                data-testid="button-save-notes"
                variant="outline"
                onClick={() => saveNotesMutation.mutate(additionalNotes)}
                disabled={saveNotesMutation.isPending || caseData.fieldSurveyStatus === "submitted"}
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "14px",
                  fontWeight: "500",
                }}
              >
                {saveNotesMutation.isPending ? "저장 중..." : "저장"}
              </Button>
              <Button
                data-testid="button-submit-report"
                onClick={() => setShowSubmitDialog(true)}
                disabled={submitReportMutation.isPending || !completionStatus.isComplete || caseData.fieldSurveyStatus === "submitted"}
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "14px",
                  fontWeight: "500",
                }}
              >
                {submitReportMutation.isPending ? "제출 중..." : "제출"}
              </Button>
            </>
          )}
          
          {!isUserLoading && isAdmin && (
            <>
              <Button
                data-testid="button-pdf-download"
                variant="outline"
                onClick={() => {
                  toast({ title: "준비 중", description: "PDF 저장 기능은 준비 중입니다." });
                }}
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "14px",
                  fontWeight: "500",
                }}
              >
                PDF 저장
              </Button>
              <Button
                data-testid="button-email-send"
                variant="outline"
                onClick={() => setShowEmailDialog(true)}
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "14px",
                  fontWeight: "500",
                }}
              >
                이메일 전송
              </Button>
              <Button
                data-testid="button-review"
                onClick={() => setShowReviewDialog(true)}
                disabled={caseData.fieldSurveyStatus !== "submitted" || reviewMutation.isPending}
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "14px",
                  fontWeight: "500",
                }}
              >
                {reviewMutation.isPending ? "심사 중..." : "심사"}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 제출 확인 다이얼로그 */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle
              style={{
                fontFamily: "Pretendard",
                fontSize: "18px",
                fontWeight: "600",
              }}
            >
              보고서 제출 확인
            </AlertDialogTitle>
            <AlertDialogDescription
              style={{
                fontFamily: "Pretendard",
                fontSize: "14px",
              }}
            >
              현장출동보고서를 제출하시겠습니까?{"\n"}
              제출 후에는 수정이 불가능합니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              data-testid="button-cancel-submit"
              style={{
                fontFamily: "Pretendard",
                fontSize: "14px",
              }}
            >
              취소
            </AlertDialogCancel>
            <AlertDialogAction
              data-testid="button-confirm-submit"
              onClick={() => submitReportMutation.mutate()}
              style={{
                fontFamily: "Pretendard",
                fontSize: "14px",
              }}
            >
              제출
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 심사 다이얼로그 */}
      <AlertDialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle
              style={{
                fontFamily: "Pretendard",
                fontSize: "18px",
                fontWeight: "600",
              }}
            >
              심사하기
            </AlertDialogTitle>
          </AlertDialogHeader>

          {/* 심사중인 건 정보 */}
          <div className="space-y-2 mb-4">
            <div
              style={{
                fontFamily: "Pretendard",
                fontSize: "14px",
                fontWeight: 400,
                color: "rgba(12, 12, 12, 0.5)",
              }}
            >
              심사중인 건
            </div>
            <div 
              className="p-3 rounded-lg" 
              style={{ background: "rgba(12, 12, 12, 0.03)" }}
            >
              <div
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "15px",
                  fontWeight: 600,
                  color: "#0C0C0C",
                }}
              >
                {caseData.insuranceCompany || "보험사 미정"} {caseData.insuranceAccidentNo || ""}
              </div>
              <div
                className="mt-1"
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "13px",
                  color: "rgba(12, 12, 12, 0.6)",
                }}
              >
                접수일: {caseData.createdAt ? new Date(caseData.createdAt).toLocaleDateString('ko-KR') : "-"} | 
                처리담당: {caseData.assignedPartner || "-"} | 
                의뢰일: {caseData.assignmentDate || "-"} | 
                긴급여부: {caseData.urgency || "-"}
              </div>
            </div>
          </div>

          {/* 심사결과 */}
          <div className="space-y-3 mb-4">
            <Label
              style={{
                fontFamily: "Pretendard",
                fontSize: "14px",
                fontWeight: 500,
              }}
            >
              심사결과
            </Label>
            <RadioGroup value={reviewDecision} onValueChange={(value) => setReviewDecision(value as "승인" | "비승인")}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="승인" id="approve" data-testid="radio-approve" />
                <Label htmlFor="approve" style={{ fontFamily: "Pretendard", fontSize: "14px", cursor: "pointer" }}>
                  승인
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="비승인" id="reject" data-testid="radio-reject" />
                <Label htmlFor="reject" style={{ fontFamily: "Pretendard", fontSize: "14px", cursor: "pointer" }}>
                  비승인
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* 검토 의견 */}
          <div className="space-y-2 mb-4">
            <div className="flex justify-between items-center">
              <Label
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "14px",
                  fontWeight: 500,
                }}
              >
                검토 의견(선택)
              </Label>
              <span
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "12px",
                  color: "rgba(12, 12, 12, 0.5)",
                }}
              >
                {reviewComment.length}/800
              </span>
            </div>
            <Textarea
              data-testid="textarea-review-comment"
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value.slice(0, 800))}
              placeholder="검토 의견을 입력해주세요"
              className="resize-none"
              rows={4}
              style={{
                fontFamily: "Pretendard",
                fontSize: "14px",
              }}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel
              data-testid="button-cancel-review"
              onClick={() => {
                setReviewDecision("승인");
                setReviewComment("");
              }}
              style={{
                fontFamily: "Pretendard",
                fontSize: "14px",
              }}
            >
              취소
            </AlertDialogCancel>
            <AlertDialogAction
              data-testid="button-confirm-review"
              onClick={() => reviewMutation.mutate()}
              style={{
                fontFamily: "Pretendard",
                fontSize: "14px",
              }}
            >
              제출
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* 이메일 전송 Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent
          style={{
            maxWidth: "457px",
            background: "rgba(253, 253, 253, 0.95)",
            backdropFilter: "blur(17px)",
            border: "none",
            borderRadius: "12px",
            padding: "32px",
          }}
        >
          {/* 제목 */}
          <div style={{
            fontFamily: "Pretendard",
            fontWeight: 600,
            fontSize: "18px",
            color: "#0C0C0C",
            textAlign: "center",
            marginBottom: "24px",
          }}>
            이메일 전송
          </div>
          
          {/* 이메일 입력 */}
          <div style={{ marginBottom: "32px" }}>
            <label style={{
              display: "block",
              fontFamily: "Pretendard",
              fontSize: "14px",
              fontWeight: 500,
              color: "rgba(12, 12, 12, 0.6)",
              marginBottom: "8px",
            }}>
              받는 이메일 주소
            </label>
            <input
              type="email"
              value={emailAddress}
              onChange={(e) => setEmailAddress(e.target.value)}
              placeholder="example@email.com"
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: "8px",
                border: "1px solid rgba(12, 12, 12, 0.15)",
                fontFamily: "Pretendard",
                fontSize: "14px",
                color: "#0C0C0C",
                outline: "none",
              }}
              data-testid="input-email-address"
            />
          </div>
          
          {/* 버튼 */}
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={() => {
                setShowEmailDialog(false);
                setEmailAddress("");
              }}
              style={{
                flex: 1,
                padding: "14px",
                background: "rgba(12, 12, 12, 0.05)",
                borderRadius: "8px",
                border: "none",
                fontFamily: "Pretendard",
                fontWeight: 500,
                fontSize: "14px",
                color: "rgba(12, 12, 12, 0.6)",
                cursor: "pointer",
              }}
              data-testid="button-cancel-email-send"
            >
              취소
            </button>
            <button
              onClick={() => {
                if (!emailAddress || !emailAddress.includes("@")) {
                  toast({
                    title: "입력 오류",
                    description: "올바른 이메일 주소를 입력해주세요.",
                    variant: "destructive",
                  });
                  return;
                }
                
                // 이메일 전송 로직 (API 호출)
                toast({
                  title: "전송 중",
                  description: "보고서를 이메일로 전송하고 있습니다...",
                });
                
                // TODO: 실제 API 호출 구현
                setShowEmailDialog(false);
                setEmailAddress("");
              }}
              style={{
                flex: 1,
                padding: "14px",
                background: "#008FED",
                borderRadius: "8px",
                border: "none",
                fontFamily: "Pretendard",
                fontWeight: 600,
                fontSize: "14px",
                color: "#FFFFFF",
                cursor: "pointer",
              }}
              data-testid="button-confirm-email-send"
            >
              전송
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 작성중인 건 */}
      <div className="mb-6">
        <div
          style={{
            fontFamily: "Pretendard",
            fontSize: "14px",
            fontWeight: 400,
            letterSpacing: "-0.02em",
            color: "rgba(12, 12, 12, 0.5)",
            marginBottom: "8px",
          }}
        >
          작성중인 건
        </div>
        
        <div 
          className="p-4 rounded-lg"
          style={{
            background: "rgba(12, 12, 12, 0.03)",
          }}
        >
          {/* 첫 번째 줄: 보험사명 + 사고번호 */}
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: "#008FED" }}
            />
            <span
              style={{
                fontFamily: "Pretendard",
                fontSize: "15px",
                fontWeight: 600,
                letterSpacing: "-0.02em",
                color: "#0C0C0C",
              }}
            >
              {caseData.insuranceCompany || "보험사 미정"} {caseData.insuranceAccidentNo || ""}
            </span>
          </div>
          
          {/* 두 번째 줄: 접수번호, 계약자, 담당자 */}
          <div 
            className="flex items-center gap-4"
            style={{
              fontFamily: "Pretendard",
              fontSize: "13px",
              fontWeight: 400,
              letterSpacing: "-0.02em",
              color: "rgba(12, 12, 12, 0.5)",
              paddingLeft: "12px",
            }}
          >
            <span>접수번호 {caseData.caseNumber}</span>
            <span>계약자 {caseData.policyHolderName || caseData.clientName || "미정"}</span>
            <span>담당자 {caseData.assignedPartnerManager || "미정"}</span>
          </div>
        </div>
      </div>

      {/* 탭 메뉴 */}
      <Tabs defaultValue="현장조사" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="현장조사">현장조사</TabsTrigger>
          <TabsTrigger value="도면">도면</TabsTrigger>
          <TabsTrigger value="증빙자료">증빙자료</TabsTrigger>
          <TabsTrigger value="견적서">견적서</TabsTrigger>
          <TabsTrigger value="기타사항/원인">기타사항/원인</TabsTrigger>
        </TabsList>

        {/* 현장조사 탭 */}
        <TabsContent value="현장조사" className="space-y-6">
          {/* 현장조사 정보 섹션 */}
          <div>
            <h2
              style={{
                fontFamily: "Pretendard",
                fontSize: "20px",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: "#0C0C0C",
                marginBottom: "24px",
              }}
            >
              현장조사 정보
            </h2>

            {/* 현장정보 */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "16px",
                    fontWeight: 600,
                    color: "rgba(12, 12, 12, 0.8)",
                  }}
                >
                  현장정보
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center">
                  <span
                    className="w-32"
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "rgba(12, 12, 12, 0.6)",
                    }}
                  >
                    방문일시
                  </span>
                  <span
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: "#0C0C0C",
                    }}
                  >
                    {caseData.visitDate && caseData.visitTime 
                      ? `${caseData.visitDate} ${caseData.visitTime}` 
                      : caseData.visitDate || "-"}
                  </span>
                </div>
                <div className="flex items-center">
                  <span
                    className="w-32"
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "rgba(12, 12, 12, 0.6)",
                    }}
                  >
                    출동 담당자
                  </span>
                  <span
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: "#0C0C0C",
                    }}
                  >
                    {caseData.accompaniedPerson || "-"}
                  </span>
                </div>
                <div className="flex items-center">
                  <span
                    className="w-32"
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "rgba(12, 12, 12, 0.6)",
                    }}
                  >
                    출동 업장지
                  </span>
                  <span
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: "#0C0C0C",
                    }}
                  >
                    {caseData.dispatchLocation || "-"}
                  </span>
                </div>
                <div className="flex items-center">
                  <span
                    className="w-32"
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "rgba(12, 12, 12, 0.6)",
                    }}
                  >
                    피보험자 주소
                  </span>
                  <span
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: "#0C0C0C",
                    }}
                  >
                    {caseData.insuredAddress || "-"}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* 사고 원인(누수원천) */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "16px",
                    fontWeight: 600,
                    color: "rgba(12, 12, 12, 0.8)",
                  }}
                >
                  사고 원인(누수원천)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center">
                  <span
                    className="w-32"
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "rgba(12, 12, 12, 0.6)",
                    }}
                  >
                    사고 발생일시
                  </span>
                  <span
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: "#0C0C0C",
                    }}
                  >
                    {caseData.accidentDate && caseData.accidentTime 
                      ? `${caseData.accidentDate} ${caseData.accidentTime}` 
                      : caseData.accidentDate || "-"}
                  </span>
                </div>
                <div className="flex items-center">
                  <span
                    className="w-32"
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "rgba(12, 12, 12, 0.6)",
                    }}
                  >
                    카테고리
                  </span>
                  <div
                    className="px-3 py-1 rounded"
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: "#008FED",
                      background: "rgba(0, 143, 237, 0.1)",
                    }}
                  >
                    {caseData.accidentCategory || "-"}
                  </div>
                </div>
                <div>
                  <span
                    className="block mb-2"
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "rgba(12, 12, 12, 0.6)",
                    }}
                  >
                    사고원인
                  </span>
                  <div
                    className="p-4 rounded"
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: "#0C0C0C",
                      background: "rgba(12, 12, 12, 0.03)",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {caseData.accidentCause || "이 안에는 사고원인이 적성됩니다."}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 현장 특이사항 */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "16px",
                    fontWeight: 600,
                    color: "rgba(12, 12, 12, 0.8)",
                  }}
                >
                  현장 특이사항
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="p-4 rounded"
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    color: "#0C0C0C",
                    background: "rgba(12, 12, 12, 0.03)",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {caseData.specialNotes || "이 안에는 특이사항이 적성됩니다."}
                </div>
              </CardContent>
            </Card>

            {/* 특이사항 및 요청사항 (VOC) */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "16px",
                    fontWeight: 600,
                    color: "rgba(12, 12, 12, 0.8)",
                  }}
                >
                  특이사항 및 요청사항 (VOC)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="p-4 rounded"
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    color: "#0C0C0C",
                    background: "rgba(12, 12, 12, 0.03)",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {caseData.specialRequests || "-"}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 피해 복구방식 및 처리 유형 섹션 */}
          <div>
            <h2
              style={{
                fontFamily: "Pretendard",
                fontSize: "20px",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: "#0C0C0C",
                marginBottom: "24px",
              }}
            >
              피해 복구방식 및 처리 유형
            </h2>

            {/* 피해자 정보 */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "16px",
                    fontWeight: 600,
                    color: "rgba(12, 12, 12, 0.8)",
                  }}
                >
                  피해자 정보
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(() => {
                  const victims = [];
                  
                  // 기본 피해자
                  if (caseData.victimName) {
                    victims.push({
                      name: caseData.victimName,
                      contact: caseData.victimContact || "",
                      address: caseData.victimAddress || "",
                    });
                  }
                  
                  // 추가 피해자
                  if (caseData.additionalVictims && caseData.additionalVictims.trim()) {
                    try {
                      const additional = JSON.parse(caseData.additionalVictims);
                      if (Array.isArray(additional)) {
                        victims.push(...additional);
                      }
                    } catch (e) {
                      console.error("Error parsing additional victims:", e);
                    }
                  }
                  
                  return victims.length > 0 ? (
                    victims.map((victim, index) => (
                      <div 
                        key={index}
                        className="p-3 rounded flex items-center gap-3"
                        style={{ background: "rgba(12, 12, 12, 0.03)" }}
                      >
                        <div
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: "#008FED" }}
                        />
                        <span
                          style={{
                            fontFamily: "Pretendard",
                            fontSize: "14px",
                            fontWeight: 600,
                            color: "#0C0C0C",
                          }}
                        >
                          {victim.name}
                        </span>
                        <span
                          style={{
                            fontFamily: "Pretendard",
                            fontSize: "14px",
                            color: "rgba(12, 12, 12, 0.6)",
                          }}
                        >
                          {victim.contact}
                        </span>
                        <span
                          style={{
                            fontFamily: "Pretendard",
                            fontSize: "14px",
                            color: "rgba(12, 12, 12, 0.6)",
                          }}
                        >
                          {victim.address}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p style={{ fontFamily: "Pretendard", fontSize: "14px", color: "rgba(12, 12, 12, 0.5)" }}>
                      등록된 피해자가 없습니다.
                    </p>
                  );
                })()}
              </CardContent>
            </Card>

            {/* 처리 유형 및 복구 방식 */}
            <Card>
              <CardHeader>
                <CardTitle
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "16px",
                    fontWeight: 600,
                    color: "rgba(12, 12, 12, 0.8)",
                  }}
                >
                  처리 유형 및 복구 방식
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center">
                    <span
                      className="w-32"
                      style={{
                        fontFamily: "Pretendard",
                        fontSize: "14px",
                        fontWeight: 500,
                        color: "rgba(12, 12, 12, 0.6)",
                      }}
                    >
                      처리 유형
                    </span>
                    <div className="flex gap-2 flex-wrap">
                      {(() => {
                        let types: string[] = [];
                        
                        if (caseData.processingTypes && caseData.processingTypes.trim()) {
                          try {
                            const parsed = JSON.parse(caseData.processingTypes);
                            if (Array.isArray(parsed)) {
                              types = parsed;
                            }
                          } catch (e) {
                            console.error("Error parsing processing types:", e);
                          }
                        }
                        
                        return types.length > 0 ? (
                          types.map((type: string, index: number) => (
                            <div
                              key={index}
                              className="px-3 py-1 rounded"
                              style={{
                                fontFamily: "Pretendard",
                                fontSize: "14px",
                                color: "#008FED",
                                background: "rgba(0, 143, 237, 0.1)",
                              }}
                            >
                              {type}
                            </div>
                          ))
                        ) : (
                          <span style={{ fontFamily: "Pretendard", fontSize: "14px", color: "rgba(12, 12, 12, 0.5)" }}>
                            -
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                  {/* 기타 처리 유형 상세 */}
                  {caseData.processingTypeOther && (
                    <div className="flex items-start">
                      <span
                        className="w-32 pt-1"
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          fontWeight: 500,
                          color: "rgba(12, 12, 12, 0.6)",
                        }}
                      >
                        기타 상세
                      </span>
                      <div
                        className="p-3 rounded flex-1"
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          color: "#0C0C0C",
                          background: "rgba(12, 12, 12, 0.03)",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {caseData.processingTypeOther}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center">
                  <span
                    className="w-32"
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "rgba(12, 12, 12, 0.6)",
                    }}
                  >
                    복구 방식
                  </span>
                  <div
                    className="px-3 py-1 rounded"
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: "#008FED",
                      background: "rgba(0, 143, 237, 0.1)",
                    }}
                  >
                    {caseData.recoveryMethodType || "-"}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 도면 탭 */}
        <TabsContent value="도면">
          <div>
            <h2
              style={{
                fontFamily: "Pretendard",
                fontSize: "20px",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: "#0C0C0C",
                marginBottom: "24px",
              }}
            >
              피해 복구방식 및 처리 유형
            </h2>

            {/* 도면 작성 */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "16px",
                    fontWeight: 600,
                    color: "rgba(12, 12, 12, 0.8)",
                  }}
                >
                  도면 작성
                </CardTitle>
              </CardHeader>
              <CardContent>
                {drawing ? (
                  <div
                    className="relative overflow-auto"
                    style={{
                      width: "100%",
                      height: "600px",
                      background: "white",
                      backgroundImage: `
                        linear-gradient(rgba(218, 218, 218, 0.5) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(218, 218, 218, 0.5) 1px, transparent 1px)
                      `,
                      backgroundSize: "10px 10px",
                    }}
                  >
                    {/* 업로드된 이미지 */}
                    {drawing.uploadedImages?.map((img) => (
                      <img
                        key={img.id}
                        src={img.src}
                        alt={`도면 이미지 ${img.id}`}
                        style={{
                          position: "absolute",
                          left: `${img.x}px`,
                          top: `${img.y}px`,
                          width: `${img.width}px`,
                          height: `${img.height}px`,
                          userSelect: "none",
                          zIndex: 1,
                        }}
                      />
                    ))}

                    {/* 사각형 */}
                    {drawing.rectangles?.map((rect) => (
                      <div
                        key={rect.id}
                        style={{
                          position: "absolute",
                          left: `${rect.x}px`,
                          top: `${rect.y}px`,
                          width: `${rect.width}px`,
                          height: `${rect.height}px`,
                          border: "1px solid #0C0C0C",
                          background: "rgba(255, 255, 255, 0.8)",
                          zIndex: 2,
                        }}
                      >
                        {/* 텍스트 */}
                        <div className="w-full h-full flex items-center justify-center">
                          <span
                            style={{
                              fontFamily: "Pretendard",
                              fontSize: "14px",
                              color: "#0C0C0C",
                            }}
                          >
                            {rect.text || ""}
                          </span>
                        </div>

                        {/* mm 표시 (하단) */}
                        <div
                          style={{
                            position: "absolute",
                            bottom: "-20px",
                            left: "50%",
                            transform: "translateX(-50%)",
                            background: "rgba(218, 218, 218, 0.9)",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            fontSize: "11px",
                            fontFamily: "Pretendard",
                            color: "#0C0C0C",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {rect.width} mm
                        </div>

                        {/* mm 표시 (우측) */}
                        <div
                          style={{
                            position: "absolute",
                            right: "-50px",
                            top: "50%",
                            transform: "translateY(-50%) rotate(90deg)",
                            background: "rgba(218, 218, 218, 0.9)",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            fontSize: "11px",
                            fontFamily: "Pretendard",
                            color: "#0C0C0C",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {rect.height} mm
                        </div>
                      </div>
                    ))}

                    {/* 사고 영역 */}
                    {drawing.accidentAreas?.map((area) => (
                      <div
                        key={area.id}
                        style={{
                          position: "absolute",
                          left: `${area.x}px`,
                          top: `${area.y}px`,
                          width: `${area.width}px`,
                          height: `${area.height}px`,
                          border: "2px dashed #9E9E9E",
                          background: "rgba(189, 189, 189, 0.3)",
                          zIndex: 1,
                        }}
                      />
                    ))}

                    {/* 누수 마커 */}
                    {drawing.leakMarkers?.map((marker) => (
                      <div
                        key={marker.id}
                        style={{
                          position: "absolute",
                          left: `${marker.x - 12}px`,
                          top: `${marker.y - 12}px`,
                          width: "24px",
                          height: "24px",
                          zIndex: 4,
                        }}
                      >
                        <svg
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <circle cx="12" cy="12" r="10" fill="#FF4D4F" opacity="0.2" />
                          <circle cx="12" cy="12" r="6" fill="none" stroke="#FF4D4F" strokeWidth="2" />
                          <line x1="12" y1="2" x2="12" y2="22" stroke="#FF4D4F" strokeWidth="2" />
                          <line x1="2" y1="12" x2="22" y2="12" stroke="#FF4D4F" strokeWidth="2" />
                        </svg>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: "rgba(12, 12, 12, 0.5)",
                      textAlign: "center",
                      padding: "60px 0",
                    }}
                  >
                    등록된 도면이 없습니다.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* 첨부된 파일 */}
            {drawing && (
              <Card>
                <CardHeader>
                  <CardTitle
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "16px",
                      fontWeight: 600,
                      color: "rgba(12, 12, 12, 0.8)",
                    }}
                  >
                    첨부된 파일
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 p-3 rounded" style={{ background: "rgba(12, 12, 12, 0.03)" }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span
                      style={{
                        fontFamily: "Pretendard",
                        fontSize: "14px",
                        fontWeight: 500,
                        color: "#0C0C0C",
                      }}
                    >
                      {caseData.insuranceCompany}회보_{caseData.caseNumber}.png
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* 증빙자료 탭 */}
        <TabsContent value="증빙자료">
          <div>
            {documents && documents.length > 0 ? (
              <>
                {/* 헤더 */}
                <div className="flex items-center justify-between mb-6">
                  <h2
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "20px",
                      fontWeight: 700,
                      letterSpacing: "-0.02em",
                      color: "#0C0C0C",
                    }}
                  >
                    증빙자료 {documents.length}
                  </h2>
                  <button
                    onClick={() => {
                      // 전체 다운로드 함수
                      documents.forEach((doc) => {
                        const link = document.createElement('a');
                        // Base64 데이터에 data URL prefix 추가
                        const dataUrl = doc.fileData.startsWith('data:') 
                          ? doc.fileData 
                          : `data:${doc.fileType};base64,${doc.fileData}`;
                        link.href = dataUrl;
                        link.download = doc.fileName;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      });
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded hover-elevate"
                    style={{
                      background: "rgba(0, 143, 237, 0.1)",
                      border: "1px solid rgba(0, 143, 237, 0.3)",
                    }}
                    data-testid="button-download-all"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="#008FED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span
                      style={{
                        fontFamily: "Pretendard",
                        fontSize: "14px",
                        fontWeight: 600,
                        color: "#008FED",
                      }}
                    >
                      전체 다운로드
                    </span>
                  </button>
                </div>
              <div className="space-y-6">
                {/* 카테고리별 그룹핑 */}
                {["현장", "수리중", "복구완료", "청구", "개인정보"].map((category) => {
                  const categoryDocs = documents.filter(doc => doc.category === category);
                  if (categoryDocs.length === 0) return null;

                  return (
                    <Card key={category}>
                      <CardHeader>
                        <CardTitle
                          style={{
                            fontFamily: "Pretendard",
                            fontSize: "16px",
                            fontWeight: 600,
                            color: "rgba(12, 12, 12, 0.8)",
                          }}
                        >
                          {category} {categoryDocs.length}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {categoryDocs.map((doc) => (
                            <div
                              key={doc.id}
                              className="flex items-center justify-between"
                              style={{
                                padding: "12px",
                                background: "rgba(12, 12, 12, 0.02)",
                                borderRadius: "8px",
                              }}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  style={{
                                    width: "40px",
                                    height: "40px",
                                    borderRadius: "50%",
                                    background: "rgba(12, 12, 12, 0.05)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-7-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M13 2v7h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                </div>
                                <span
                                  style={{
                                    fontFamily: "Pretendard",
                                    fontSize: "14px",
                                    fontWeight: 500,
                                    color: "#0C0C0C",
                                  }}
                                >
                                  {doc.fileName}
                                </span>
                              </div>
                              <button
                                onClick={() => {
                                  const link = document.createElement('a');
                                  // Base64 데이터에 data URL prefix 추가
                                  const dataUrl = doc.fileData.startsWith('data:') 
                                    ? doc.fileData 
                                    : `data:${doc.fileType};base64,${doc.fileData}`;
                                  link.href = dataUrl;
                                  link.download = doc.fileName;
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                }}
                                style={{
                                  width: "32px",
                                  height: "32px",
                                  borderRadius: "4px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  background: "rgba(0, 143, 237, 0.1)",
                                }}
                                className="hover-elevate"
                                data-testid={`button-download-document-${doc.id}`}
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="#008FED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              </>
            ) : (
              <Card>
                <CardContent className="p-6">
                  <p
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: "rgba(12, 12, 12, 0.5)",
                      textAlign: "center",
                      padding: "40px 0",
                    }}
                  >
                    등록된 증빙자료가 없습니다.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* 견적서 탭 */}
        <TabsContent value="견적서">
          <div className="min-w-0">
            {estimate.estimate && estimate.rows && estimate.rows.length > 0 ? (
              <>
                {/* 헤더 */}
                <div className="flex items-center justify-between mb-6">
                  <h2
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "20px",
                      fontWeight: 700,
                      letterSpacing: "-0.02em",
                      color: "#0C0C0C",
                    }}
                  >
                    견적서 {estimate.estimate.createdAt ? new Date(estimate.estimate.createdAt).toISOString().split('T')[0] : ''}
                  </h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        // TODO: 다운로드 기능 구현
                      }}
                      className="flex items-center gap-2 px-4 py-2 rounded hover-elevate"
                      style={{
                        background: "rgba(0, 143, 237, 0.1)",
                        border: "1px solid rgba(0, 143, 237, 0.3)",
                      }}
                      data-testid="button-download-estimate"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="#008FED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          fontWeight: 600,
                          color: "#008FED",
                        }}
                      >
                        다운로드
                      </span>
                    </button>
                    <button
                      onClick={() => {
                        // TODO: 이메일 전송 기능 구현
                      }}
                      className="flex items-center gap-2 px-4 py-2 rounded hover-elevate"
                      style={{
                        background: "rgba(0, 143, 237, 0.1)",
                        border: "1px solid rgba(0, 143, 237, 0.3)",
                      }}
                      data-testid="button-email-estimate"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="#008FED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M22 6l-10 7L2 6" stroke="#008FED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          fontWeight: 600,
                          color: "#008FED",
                        }}
                      >
                        이메일 전송
                      </span>
                    </button>
                  </div>
                </div>

                {/* 복구면적 산출표 */}
                <Card className="mb-6 min-w-0">
                  <CardHeader>
                    <CardTitle
                      style={{
                        fontFamily: "Pretendard",
                        fontSize: "16px",
                        fontWeight: 600,
                        color: "rgba(12, 12, 12, 0.8)",
                      }}
                    >
                      복구면적 산출표 {estimate.estimate.createdAt ? new Date(estimate.estimate.createdAt).toISOString().split('T')[0] : ''}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table
                        style={{
                          minWidth: "1000px",
                          width: "100%",
                          borderCollapse: "collapse",
                          fontFamily: "Pretendard",
                          fontSize: "13px",
                        }}
                      >
                        <thead>
                          <tr style={{ background: "rgba(12, 12, 12, 0.03)" }}>
                            <th style={{ padding: "12px 8px", textAlign: "center", borderBottom: "1px solid rgba(12, 12, 12, 0.1)" }}>장소</th>
                            <th style={{ padding: "12px 8px", textAlign: "center", borderBottom: "1px solid rgba(12, 12, 12, 0.1)" }}>위치</th>
                            <th style={{ padding: "12px 8px", textAlign: "center", borderBottom: "1px solid rgba(12, 12, 12, 0.1)" }}>공사내용</th>
                            <th colSpan={3} style={{ padding: "12px 8px", textAlign: "center", borderBottom: "1px solid rgba(12, 12, 12, 0.1)", borderLeft: "1px solid rgba(12, 12, 12, 0.1)" }}>피해면적</th>
                            <th colSpan={3} style={{ padding: "12px 8px", textAlign: "center", borderBottom: "1px solid rgba(12, 12, 12, 0.1)", borderLeft: "1px solid rgba(12, 12, 12, 0.1)" }}>복구면적</th>
                            <th style={{ padding: "12px 8px", textAlign: "center", borderBottom: "1px solid rgba(12, 12, 12, 0.1)", borderLeft: "1px solid rgba(12, 12, 12, 0.1)" }}>비고</th>
                          </tr>
                          <tr style={{ background: "rgba(12, 12, 12, 0.02)" }}>
                            <th colSpan={3} style={{ borderBottom: "1px solid rgba(12, 12, 12, 0.1)" }}></th>
                            <th style={{ padding: "8px", textAlign: "center", fontSize: "12px", borderBottom: "1px solid rgba(12, 12, 12, 0.1)", borderLeft: "1px solid rgba(12, 12, 12, 0.1)" }}>가로(mm)</th>
                            <th style={{ padding: "8px", textAlign: "center", fontSize: "12px", borderBottom: "1px solid rgba(12, 12, 12, 0.1)" }}>세로(mm)</th>
                            <th style={{ padding: "8px", textAlign: "center", fontSize: "12px", borderBottom: "1px solid rgba(12, 12, 12, 0.1)" }}>면적(㎡)</th>
                            <th style={{ padding: "8px", textAlign: "center", fontSize: "12px", borderBottom: "1px solid rgba(12, 12, 12, 0.1)", borderLeft: "1px solid rgba(12, 12, 12, 0.1)" }}>가로(mm)</th>
                            <th style={{ padding: "8px", textAlign: "center", fontSize: "12px", borderBottom: "1px solid rgba(12, 12, 12, 0.1)" }}>세로(mm)</th>
                            <th style={{ padding: "8px", textAlign: "center", fontSize: "12px", borderBottom: "1px solid rgba(12, 12, 12, 0.1)" }}>면적(㎡)</th>
                            <th style={{ borderBottom: "1px solid rgba(12, 12, 12, 0.1)", borderLeft: "1px solid rgba(12, 12, 12, 0.1)" }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {estimate.rows.map((row, index) => (
                            <tr key={row.id} style={{ borderBottom: index === estimate.rows.length - 1 ? "none" : "1px solid rgba(12, 12, 12, 0.06)" }}>
                              <td style={{ padding: "10px 8px", textAlign: "center" }}>{row.category || '-'}</td>
                              <td style={{ padding: "10px 8px", textAlign: "center" }}>{row.location || '-'}</td>
                              <td style={{ padding: "10px 8px", textAlign: "center" }}>{row.workName || '-'}</td>
                              <td style={{ padding: "10px 8px", textAlign: "center", borderLeft: "1px solid rgba(12, 12, 12, 0.06)" }}>{row.damageWidth || '0000'}</td>
                              <td style={{ padding: "10px 8px", textAlign: "center" }}>{row.damageHeight || '0000'}</td>
                              <td style={{ padding: "10px 8px", textAlign: "center" }}>
                                {row.damageArea ? (row.damageArea / 1_000_000).toFixed(2) : '0000'}
                              </td>
                              <td style={{ padding: "10px 8px", textAlign: "center", borderLeft: "1px solid rgba(12, 12, 12, 0.06)" }}>{row.repairWidth || '0000'}</td>
                              <td style={{ padding: "10px 8px", textAlign: "center" }}>{row.repairHeight || '0000'}</td>
                              <td style={{ padding: "10px 8px", textAlign: "center" }}>
                                {row.repairArea ? (row.repairArea / 1_000_000).toFixed(2) : '0000'}
                              </td>
                              <td style={{ padding: "10px 8px", textAlign: "center", borderLeft: "1px solid rgba(12, 12, 12, 0.06)" }}>{row.note || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* 노무비 */}
                <Card className="mb-6 min-w-0">
                  <CardHeader>
                    <CardTitle
                      style={{
                        fontFamily: "Pretendard",
                        fontSize: "16px",
                        fontWeight: 600,
                        color: "rgba(12, 12, 12, 0.8)",
                      }}
                    >
                      노무비 {estimate.estimate.createdAt ? new Date(estimate.estimate.createdAt).toISOString().split('T')[0] : ''}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {parsedLaborCosts.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table
                          style={{
                            minWidth: "900px",
                            width: "100%",
                            borderCollapse: "collapse",
                            fontFamily: "Pretendard",
                            fontSize: "13px",
                          }}
                        >
                          <thead>
                            <tr style={{ background: "rgba(12, 12, 12, 0.03)" }}>
                              <th style={{ padding: "12px 8px", textAlign: "center", borderBottom: "1px solid rgba(12, 12, 12, 0.1)", minWidth: "80px" }}>공종</th>
                              <th style={{ padding: "12px 8px", textAlign: "center", borderBottom: "1px solid rgba(12, 12, 12, 0.1)", minWidth: "120px" }}>공사명</th>
                              <th style={{ padding: "12px 8px", textAlign: "center", borderBottom: "1px solid rgba(12, 12, 12, 0.1)", minWidth: "120px" }}>세부공사</th>
                              <th style={{ padding: "12px 8px", textAlign: "center", borderBottom: "1px solid rgba(12, 12, 12, 0.1)", minWidth: "150px" }}>세부항목</th>
                              <th style={{ padding: "12px 8px", textAlign: "center", borderBottom: "1px solid rgba(12, 12, 12, 0.1)", minWidth: "60px" }}>단위</th>
                              <th style={{ padding: "12px 8px", textAlign: "center", borderBottom: "1px solid rgba(12, 12, 12, 0.1)", minWidth: "100px" }}>기준가(단위)</th>
                              <th style={{ padding: "12px 8px", textAlign: "center", borderBottom: "1px solid rgba(12, 12, 12, 0.1)", minWidth: "60px" }}>수량</th>
                              <th style={{ padding: "12px 8px", textAlign: "center", borderBottom: "1px solid rgba(12, 12, 12, 0.1)", minWidth: "100px" }}>금액</th>
                            </tr>
                          </thead>
                          <tbody>
                            {parsedLaborCosts.map((row, index) => (
                              <tr key={row.id || index} style={{ borderBottom: index === parsedLaborCosts.length - 1 ? "none" : "1px solid rgba(12, 12, 12, 0.06)" }}>
                                <td style={{ padding: "10px 8px", textAlign: "center" }}>{row.category || '-'}</td>
                                <td style={{ padding: "10px 8px", textAlign: "center" }}>{row.workName || '-'}</td>
                                <td style={{ padding: "10px 8px", textAlign: "center" }}>{row.detailWork || '-'}</td>
                                <td style={{ padding: "10px 8px", textAlign: "center" }}>{row.detailItem || '-'}</td>
                                <td style={{ padding: "10px 8px", textAlign: "center" }}>{row.unit || '-'}</td>
                                <td style={{ padding: "10px 8px", textAlign: "right" }}>{(row.standardPrice || 0).toLocaleString()}</td>
                                <td style={{ padding: "10px 8px", textAlign: "center" }}>{row.quantity || 0}</td>
                                <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: 600 }}>{(row.amount || 0).toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          color: "rgba(12, 12, 12, 0.5)",
                          textAlign: "center",
                          padding: "40px 0",
                        }}
                      >
                        노무비 데이터가 없습니다.
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* 자재비 */}
                <Card className="mb-6 min-w-0">
                  <CardHeader>
                    <CardTitle
                      style={{
                        fontFamily: "Pretendard",
                        fontSize: "16px",
                        fontWeight: 600,
                        color: "rgba(12, 12, 12, 0.8)",
                      }}
                    >
                      자재비 {estimate.estimate.createdAt ? new Date(estimate.estimate.createdAt).toISOString().split('T')[0] : ''}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {parsedMaterialCosts.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table
                          style={{
                            minWidth: "900px",
                            width: "100%",
                            borderCollapse: "collapse",
                            fontFamily: "Pretendard",
                            fontSize: "13px",
                          }}
                        >
                          <thead>
                            <tr style={{ background: "rgba(12, 12, 12, 0.03)" }}>
                              <th style={{ padding: "12px 8px", textAlign: "center", borderBottom: "1px solid rgba(12, 12, 12, 0.1)", minWidth: "80px" }}>공종</th>
                              <th style={{ padding: "12px 8px", textAlign: "center", borderBottom: "1px solid rgba(12, 12, 12, 0.1)", minWidth: "120px" }}>자재</th>
                              <th style={{ padding: "12px 8px", textAlign: "center", borderBottom: "1px solid rgba(12, 12, 12, 0.1)", minWidth: "120px" }}>규격</th>
                              <th style={{ padding: "12px 8px", textAlign: "center", borderBottom: "1px solid rgba(12, 12, 12, 0.1)", minWidth: "60px" }}>단위</th>
                              <th style={{ padding: "12px 8px", textAlign: "center", borderBottom: "1px solid rgba(12, 12, 12, 0.1)", minWidth: "100px" }}>기준단가</th>
                              <th style={{ padding: "12px 8px", textAlign: "center", borderBottom: "1px solid rgba(12, 12, 12, 0.1)", minWidth: "60px" }}>수량</th>
                              <th style={{ padding: "12px 8px", textAlign: "center", borderBottom: "1px solid rgba(12, 12, 12, 0.1)", minWidth: "100px" }}>금액</th>
                              <th style={{ padding: "12px 8px", textAlign: "center", borderBottom: "1px solid rgba(12, 12, 12, 0.1)", minWidth: "100px" }}>비고</th>
                            </tr>
                          </thead>
                          <tbody>
                            {parsedMaterialCosts.map((row, index) => (
                              <tr key={row.id || index} style={{ borderBottom: index === parsedMaterialCosts.length - 1 ? "none" : "1px solid rgba(12, 12, 12, 0.06)" }}>
                                <td style={{ padding: "10px 8px", textAlign: "center" }}>{row.공종 || '-'}</td>
                                <td style={{ padding: "10px 8px", textAlign: "center" }}>{row.자재 || '-'}</td>
                                <td style={{ padding: "10px 8px", textAlign: "center" }}>{row.규격 || '-'}</td>
                                <td style={{ padding: "10px 8px", textAlign: "center" }}>{row.단위 || '-'}</td>
                                <td style={{ padding: "10px 8px", textAlign: "right" }}>{(row.기준단가 || 0).toLocaleString()}</td>
                                <td style={{ padding: "10px 8px", textAlign: "center" }}>{row.수량 || 0}</td>
                                <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: 600 }}>{(row.금액 || 0).toLocaleString()}</td>
                                <td style={{ padding: "10px 8px", textAlign: "center" }}>{row.비고 || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          color: "rgba(12, 12, 12, 0.5)",
                          textAlign: "center",
                          padding: "40px 0",
                        }}
                      >
                        자재비 데이터가 없습니다.
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* 합계 섹션 */}
                <Card>
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b">
                        <span style={{ fontFamily: "Pretendard", fontSize: "14px", fontWeight: 500 }}>소계</span>
                        <span style={{ fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600 }}>0</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b">
                        <span style={{ fontFamily: "Pretendard", fontSize: "14px", fontWeight: 500 }}>일반관리비 (6%)</span>
                        <span style={{ fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600 }}>0</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b">
                        <span style={{ fontFamily: "Pretendard", fontSize: "14px", fontWeight: 500 }}>이윤 (15%)</span>
                        <span style={{ fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600 }}>0</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b">
                        <span style={{ fontFamily: "Pretendard", fontSize: "14px", fontWeight: 500 }}>VAT</span>
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1">
                            <input type="radio" name="vat" checked disabled />
                            <span style={{ fontFamily: "Pretendard", fontSize: "13px" }}>포함</span>
                          </label>
                          <label className="flex items-center gap-1">
                            <input type="radio" name="vat" disabled />
                            <span style={{ fontFamily: "Pretendard", fontSize: "13px" }}>별도</span>
                          </label>
                          <span style={{ fontFamily: "Pretendard", fontSize: "14px", fontWeight: 600, marginLeft: "8px" }}>0</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center py-3 border-t-2">
                        <span style={{ fontFamily: "Pretendard", fontSize: "16px", fontWeight: 700, color: "#008FED" }}>총 합계</span>
                        <span style={{ fontFamily: "Pretendard", fontSize: "18px", fontWeight: 700, color: "#008FED" }}>0</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="p-6">
                  <p
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: "rgba(12, 12, 12, 0.5)",
                      textAlign: "center",
                      padding: "40px 0",
                    }}
                  >
                    등록된 견적서가 없습니다.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* 기타사항/원인 탭 */}
        <TabsContent value="기타사항/원인">
          <div
            style={{
              fontFamily: "Pretendard",
              fontSize: "20px",
              fontWeight: "700",
              lineHeight: "30px",
              color: "#0C0C0C",
              marginBottom: "24px",
            }}
          >
            기타사항
          </div>
          
          <Card>
            <CardContent className="p-6 space-y-4">
              <div>
                <label
                  htmlFor="additional-notes"
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#0C0C0C",
                    display: "block",
                    marginBottom: "8px",
                  }}
                >
                  기타사항 입력
                </label>
                <Textarea
                  id="additional-notes"
                  data-testid="textarea-additional-notes"
                  placeholder={isAdmin ? "" : "추가 메모 또는 특별 사항을 입력해주세요"}
                  value={additionalNotes}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.length <= 800) {
                      setAdditionalNotes(value);
                    }
                  }}
                  rows={10}
                  readOnly={isAdmin}
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    resize: "none",
                  }}
                />
                <div
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "12px",
                    color: "rgba(12, 12, 12, 0.5)",
                    textAlign: "right",
                    marginTop: "8px",
                  }}
                >
                  {additionalNotes.length}/800
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  data-testid="button-save-notes"
                  onClick={() => saveNotesMutation.mutate(additionalNotes)}
                  disabled={saveNotesMutation.isPending}
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                >
                  {saveNotesMutation.isPending ? "저장 중..." : "저장"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
