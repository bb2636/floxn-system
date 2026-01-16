import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { MessageSquare, Send, Loader2, Check, X } from "lucide-react";
import type { Case } from "@shared/schema";

type NotificationStage =
  | "접수완료"
  | "현장정보입력"
  | "반려"
  | "승인반려"
  | "현장정보제출"
  | "복구요청"
  | "직접복구"
  | "미복구"
  | "청구자료제출"
  | "청구"
  | "결정금액/수수료"
  | "접수취소"
  | "입금완료"
  | "부분입금"
  | "정산완료"
  | "선견적요청";

interface RecipientConfig {
  partner: boolean;
  manager: boolean;
  assessorInvestigator: boolean;
}

const STAGE_RECIPIENT_DEFAULTS: Record<NotificationStage, RecipientConfig> = {
  "접수완료": { partner: true, manager: true, assessorInvestigator: true },
  "현장정보입력": { partner: false, manager: true, assessorInvestigator: false },
  "반려": { partner: true, manager: false, assessorInvestigator: false },
  "승인반려": { partner: true, manager: false, assessorInvestigator: false },
  "현장정보제출": { partner: false, manager: false, assessorInvestigator: true },
  "복구요청": { partner: true, manager: false, assessorInvestigator: false },
  "직접복구": { partner: true, manager: true, assessorInvestigator: false },
  "미복구": { partner: true, manager: true, assessorInvestigator: false },
  "청구자료제출": { partner: false, manager: true, assessorInvestigator: false },
  "청구": { partner: false, manager: false, assessorInvestigator: true },
  "결정금액/수수료": { partner: true, manager: false, assessorInvestigator: false },
  "접수취소": { partner: false, manager: false, assessorInvestigator: true },
  "입금완료": { partner: true, manager: true, assessorInvestigator: false },
  "부분입금": { partner: true, manager: true, assessorInvestigator: false },
  "정산완료": { partner: true, manager: true, assessorInvestigator: false },
  "선견적요청": { partner: true, manager: true, assessorInvestigator: false },
};

interface SmsNotificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseData: Case;
  stage: NotificationStage;
  cancelReason?: string;
  recoveryAmount?: number;
  feeRate?: number;
  paymentAmount?: number;
  previousStatus?: string;
  onSuccess?: () => void;
}

export function SmsNotificationDialog({
  open,
  onOpenChange,
  caseData,
  stage,
  cancelReason: initialCancelReason = "",
  recoveryAmount: initialRecoveryAmount,
  feeRate: initialFeeRate,
  paymentAmount: initialPaymentAmount,
  previousStatus,
  onSuccess,
}: SmsNotificationDialogProps) {
  const { toast } = useToast();
  const [recipients, setRecipients] = useState<RecipientConfig>(
    STAGE_RECIPIENT_DEFAULTS[stage]
  );
  const [additionalMessage, setAdditionalMessage] = useState("");
  const [cancelReason, setCancelReason] = useState(initialCancelReason);
  const [recoveryAmount, setRecoveryAmount] = useState<number | undefined>(initialRecoveryAmount);
  const [feeRate, setFeeRate] = useState<number | undefined>(initialFeeRate);
  const [paymentAmount, setPaymentAmount] = useState<number | undefined>(initialPaymentAmount);

  useEffect(() => {
    if (open) {
      setRecipients(STAGE_RECIPIENT_DEFAULTS[stage]);
      setAdditionalMessage("");
      setCancelReason(initialCancelReason);
      setRecoveryAmount(initialRecoveryAmount);
      setFeeRate(initialFeeRate);
      setPaymentAmount(initialPaymentAmount);
    }
  }, [open, stage, initialCancelReason, initialRecoveryAmount, initialFeeRate, initialPaymentAmount]);

  const sendNotificationMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/send-stage-notification", {
        caseId: caseData.id,
        stage,
        recipients,
        additionalMessage: additionalMessage || undefined,
        cancelReason: stage === "접수취소" ? cancelReason : undefined,
        recoveryAmount: stage === "결정금액/수수료" ? recoveryAmount : undefined,
        feeRate: stage === "결정금액/수수료" ? feeRate : undefined,
        paymentAmount: stage === "결정금액/수수료" ? paymentAmount : undefined,
        previousStatus: (stage === "반려" || stage === "승인반려") ? previousStatus : undefined,
      });
      return response;
    },
    onSuccess: (data: any) => {
      toast({
        title: "알림 발송 완료",
        description: data.message || "문자 알림이 발송되었습니다.",
      });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "알림 발송 실패",
        description: error?.message || "문자 발송에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleSend = () => {
    if (!recipients.partner && !recipients.manager && !recipients.assessorInvestigator) {
      toast({
        title: "수신자 선택 필요",
        description: "최소 1명의 수신자를 선택해주세요.",
        variant: "destructive",
      });
      return;
    }
    sendNotificationMutation.mutate();
  };

  const getStageDisplayName = () => {
    switch (stage) {
      case "결정금액/수수료": return "결정금액 및 수수료 안내";
      default: return stage;
    }
  };

  // 의뢰범위 계산 (손방/대물)
  const getRequestScope = () => {
    const items = [];
    if (caseData.damagePreventionCost === "true") items.push("손방");
    if (caseData.victimIncidentAssistance === "true") items.push("대물");
    return items.length > 0 ? items.join(", ") : "기타";
  };

  // 케이스 접미사에 따른 주소 결정: -0은 피보험자 주소, -1 이상은 피해자 주소
  const getFullAddress = () => {
    const caseNumber = caseData.caseNumber || "";
    const suffixMatch = caseNumber.match(/-(\d+)$/);
    const suffix = suffixMatch ? parseInt(suffixMatch[1], 10) : 0;
    
    if (suffix === 0) {
      // 손해방지(-0): 피보험자 주소 + 상세주소
      return [caseData.insuredAddress, caseData.insuredAddressDetail].filter(Boolean).join(" ") || "-";
    } else {
      // 피해세대(-1, -2, ...): 피해자 주소 + 상세주소 (없으면 피보험자 주소로 대체)
      const victimAddr = [caseData.victimAddress, caseData.victimAddressDetail].filter(Boolean).join(" ");
      if (victimAddr) {
        return victimAddr;
      }
      return [caseData.insuredAddress, caseData.insuredAddressDetail].filter(Boolean).join(" ") || "-";
    }
  };

  const getMessagePreview = () => {
    if (stage === "접수완료") {
      const lines: string[] = [];
      
      if (caseData.caseNumber) lines.push(`접수번호 : ${caseData.caseNumber}`);
      if (caseData.insuranceCompany) lines.push(`보험사 : ${caseData.insuranceCompany}`);
      if (caseData.insurancePolicyNo) lines.push(`증권번호 : ${caseData.insurancePolicyNo}`);
      if (caseData.insuranceAccidentNo) lines.push(`사고번호 : ${caseData.insuranceAccidentNo}`);
      
      // 피보험자 라인: 이름 또는 연락처가 있을 때만 표시
      if (caseData.insuredName || caseData.insuredContact) {
        const insuredParts = [];
        if (caseData.insuredName) insuredParts.push(caseData.insuredName);
        if (caseData.insuredContact) insuredParts.push(`연락처 ${caseData.insuredContact}`);
        lines.push(`피보험자 : ${insuredParts.join("  ")}`);
      }
      
      // 피해자 라인: 이름 또는 연락처가 있을 때만 표시
      if (caseData.victimName || caseData.victimContact) {
        const victimParts = [];
        if (caseData.victimName) victimParts.push(caseData.victimName);
        if (caseData.victimContact) victimParts.push(`연락처 ${caseData.victimContact}`);
        lines.push(`피해자 : ${victimParts.join("  ")}`);
      }
      
      // 심사자 라인: 이름과 연락처 모두 있을 때만 표시
      if (caseData.investigatorTeamName && caseData.investigatorContact) {
        lines.push(`심사자 : ${caseData.investigatorTeamName}  연락처 ${caseData.investigatorContact}`);
      }
      
      lines.push(`사고장소 : ${getFullAddress()}`);
      
      const requestScope = getRequestScope();
      if (requestScope !== "기타") lines.push(`의뢰범위 : ${requestScope}`);
      
      return lines.join("\n");
    } else if (stage === "접수취소") {
      return `접수번호 : ${caseData.caseNumber || "-"}
보험사 : ${caseData.insuranceCompany || "-"}
증권번호 : ${caseData.insurancePolicyNo || "-"}
사고번호 : ${caseData.insuranceAccidentNo || "-"}
피보험자 : ${caseData.insuredName || "-"}
사고장소 : ${getFullAddress()}

위 접수건은 접수 취소 되었음을 알려드립니다.
취소 사유 : ${cancelReason || "-"}`;
    } else if (stage === "결정금액/수수료") {
      return `접수번호 : ${caseData.caseNumber || "-"}
보험사 : ${caseData.insuranceCompany || "-"}
증권번호 : ${caseData.insurancePolicyNo || "-"}
사고번호 : ${caseData.insuranceAccidentNo || "-"}
피보험자 : ${caseData.insuredName || "-"}
사고장소 : ${getFullAddress()}
복구금액 : ${recoveryAmount?.toLocaleString() || "-"}원
수수료 : 최종금액의 ${feeRate || "-"}%
지급금액 : ${paymentAmount?.toLocaleString() || "-"}원`;
    } else if (stage === "반려" || stage === "승인반려") {
      const rejectionStatus = previousStatus ? `${previousStatus}에서 반려` : "반려";
      return `접수번호 : ${caseData.caseNumber || "-"}
보험사 : ${caseData.insuranceCompany || "-"}
증권번호 : ${caseData.insurancePolicyNo || "-"}
사고번호 : ${caseData.insuranceAccidentNo || "-"}
피보험자 : ${caseData.insuredName || "-"}
사고장소 : ${getFullAddress()}
진행상태 : ${rejectionStatus}`;
    } else {
      return `접수번호 : ${caseData.caseNumber || "-"}
보험사 : ${caseData.insuranceCompany || "-"}
증권번호 : ${caseData.insurancePolicyNo || "-"}
사고번호 : ${caseData.insuranceAccidentNo || "-"}
피보험자 : ${caseData.insuredName || "-"}
사고장소 : ${getFullAddress()}
진행사항 : ${stage}`;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {getStageDisplayName()} 알림 발송
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/50 p-4 rounded-md">
            <Label className="text-sm font-medium mb-2 block">메시지 미리보기</Label>
            <pre className="text-xs whitespace-pre-wrap font-mono bg-background p-3 rounded border">
              &lt;{getStageDisplayName()} 알림&gt;{"\n\n"}
              {getMessagePreview()}
              {additionalMessage && `\n\n추가사항 : ${additionalMessage}`}
            </pre>
          </div>

          {stage === "접수취소" && (
            <div className="space-y-2">
              <Label htmlFor="cancelReason" className="text-sm font-medium">
                취소 사유 *
              </Label>
              <Textarea
                id="cancelReason"
                placeholder="취소 사유를 입력해주세요"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="min-h-[80px]"
                data-testid="textarea-cancel-reason"
              />
            </div>
          )}

          {stage === "결정금액/수수료" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="recoveryAmount" className="text-sm">복구금액</Label>
                  <Input
                    id="recoveryAmount"
                    type="number"
                    placeholder="0"
                    value={recoveryAmount || ""}
                    onChange={(e) => setRecoveryAmount(Number(e.target.value) || undefined)}
                    data-testid="input-recovery-amount"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="feeRate" className="text-sm">수수료율 (%)</Label>
                  <Input
                    id="feeRate"
                    type="number"
                    placeholder="0"
                    value={feeRate || ""}
                    onChange={(e) => setFeeRate(Number(e.target.value) || undefined)}
                    data-testid="input-fee-rate"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="paymentAmount" className="text-sm">지급금액</Label>
                <Input
                  id="paymentAmount"
                  type="number"
                  placeholder="0"
                  value={paymentAmount || ""}
                  onChange={(e) => setPaymentAmount(Number(e.target.value) || undefined)}
                  data-testid="input-payment-amount"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm font-medium">추가 메시지 (선택)</Label>
            <Textarea
              placeholder="추가 메시지를 입력해주세요 (선택사항)"
              value={additionalMessage}
              onChange={(e) => setAdditionalMessage(e.target.value)}
              className="min-h-[60px]"
              data-testid="textarea-additional-message"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">수신자 선택</Label>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="partner"
                  checked={recipients.partner}
                  onCheckedChange={(checked) =>
                    setRecipients((prev) => ({ ...prev, partner: !!checked }))
                  }
                  data-testid="checkbox-partner"
                />
                <Label
                  htmlFor="partner"
                  className="text-sm cursor-pointer flex items-center gap-1"
                >
                  협력업체
                  {caseData.assignedPartnerContact ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <X className="h-3 w-3 text-muted-foreground" />
                  )}
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="manager"
                  checked={recipients.manager}
                  onCheckedChange={(checked) =>
                    setRecipients((prev) => ({ ...prev, manager: !!checked }))
                  }
                  data-testid="checkbox-manager"
                />
                <Label
                  htmlFor="manager"
                  className="text-sm cursor-pointer flex items-center gap-1"
                >
                  플록슨담당자
                  {caseData.managerId ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <X className="h-3 w-3 text-muted-foreground" />
                  )}
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="assessorInvestigator"
                  checked={recipients.assessorInvestigator}
                  onCheckedChange={(checked) =>
                    setRecipients((prev) => ({ ...prev, assessorInvestigator: !!checked }))
                  }
                  data-testid="checkbox-assessor-investigator"
                />
                <Label
                  htmlFor="assessorInvestigator"
                  className="text-sm cursor-pointer flex items-center gap-1"
                >
                  심사자 및 조사자
                  {caseData.assessorContact || caseData.investigatorContact ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <X className="h-3 w-3 text-muted-foreground" />
                  )}
                </Label>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              * 연락처가 등록된 수신자에게만 발송됩니다.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={sendNotificationMutation.isPending}
            data-testid="button-cancel-notification"
          >
            취소
          </Button>
          <Button
            onClick={handleSend}
            disabled={sendNotificationMutation.isPending}
            data-testid="button-send-notification"
          >
            {sendNotificationMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                발송 중...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                발송
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export type { NotificationStage, RecipientConfig };
