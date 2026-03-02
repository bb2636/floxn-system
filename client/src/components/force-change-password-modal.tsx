import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { forceChangePasswordSchema, type ForceChangePasswordInput } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff, Lock, AlertTriangle, ShieldCheck, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

interface ForceChangePasswordModalProps {
  open: boolean;
  onSuccess: () => void;
  onLogout: () => void;
}

export function ForceChangePasswordModal({
  open,
  onSuccess,
  onLogout,
}: ForceChangePasswordModalProps) {
  const { toast } = useToast();
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [termsExpanded, setTermsExpanded] = useState(false);
  const [privacyExpanded, setPrivacyExpanded] = useState(false);

  const form = useForm<ForceChangePasswordInput>({
    resolver: zodResolver(forceChangePasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: ForceChangePasswordInput) => {
      return await apiRequest("POST", "/api/force-change-password", data);
    },
    onSuccess: () => {
      toast({
        title: "비밀번호 변경 완료",
        description: "새 비밀번호로 변경되었습니다.",
      });
      form.reset();
      onSuccess();
    },
    onError: (error: any) => {
      const errorMessage = error?.error || "비밀번호 변경에 실패했습니다.";
      toast({
        title: "비밀번호 변경 실패",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: ForceChangePasswordInput) => {
    if (!termsAgreed || !privacyAgreed) {
      toast({
        title: "약관 동의 필요",
        description: "서비스 이용약관과 개인정보 처리방침에 모두 동의해주세요.",
        variant: "destructive",
      });
      return;
    }
    changePasswordMutation.mutate(data);
  };

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/logout", {});
      onLogout();
    } catch (error) {
      console.error("Logout error:", error);
      onLogout();
    }
  };

  const allAgreed = termsAgreed && privacyAgreed;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-[460px] max-h-[90vh] overflow-y-auto" 
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="mb-4 p-4 rounded-lg" style={{ background: '#F0F5FF', border: '1px solid #D6E4FF' }}>
          <div className="flex items-start gap-3 mb-3">
            <div className="p-1.5 bg-blue-100 rounded-full mt-0.5">
              <ShieldCheck className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 leading-snug">
                서비스약관 동의 및<br />개인정보처리방침 고지 확인
              </h3>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between p-2.5 bg-white rounded-md" style={{ border: '1px solid #E5E7EB' }}>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={termsAgreed}
                  onChange={(e) => setTermsAgreed(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-200"
                  data-testid="checkbox-terms-agree"
                />
                <span className="text-xs text-blue-600 font-medium">(필수)</span>
                서비스 이용약관 동의
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTermsExpanded(!termsExpanded)}
                  className="text-xs text-blue-500 hover:text-blue-700 underline"
                  data-testid="button-terms-detail"
                >
                  전문 보기
                </button>
                <span
                  className="text-xs font-medium"
                  style={{ color: termsAgreed ? '#16A34A' : '#9CA3AF' }}
                >
                  {termsAgreed ? '동의' : '미확인'}
                </span>
              </div>
            </div>
            {termsExpanded && (
              <div className="p-3 bg-white rounded-md text-xs text-slate-600 leading-relaxed max-h-[150px] overflow-y-auto" style={{ border: '1px solid #E5E7EB' }}>
                <p className="font-semibold mb-1">서비스 이용약관</p>
                <p>제1조 (목적) 이 약관은 플록슨(이하 "회사")이 제공하는 누수 사고 관리 시스템 서비스(이하 "서비스")의 이용조건 및 절차에 관한 사항을 규정함을 목적으로 합니다.</p>
                <p className="mt-1">제2조 (이용계약의 성립) 서비스 이용계약은 이용자가 본 약관에 동의하고 회사가 승인함으로써 성립됩니다.</p>
                <p className="mt-1">제3조 (서비스의 내용) 회사는 보험 사고 접수, 현장조사, 견적, 정산 등의 업무를 지원하는 통합 관리 플랫폼을 제공합니다.</p>
                <p className="mt-1">제4조 (이용자의 의무) 이용자는 서비스 이용 시 관련 법령 및 본 약관을 준수해야 하며, 타인의 정보를 부정하게 사용하거나 서비스를 방해하는 행위를 해서는 안 됩니다.</p>
              </div>
            )}

            <div className="flex items-center justify-between p-2.5 bg-white rounded-md" style={{ border: '1px solid #E5E7EB' }}>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={privacyAgreed}
                  onChange={(e) => setPrivacyAgreed(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-200"
                  data-testid="checkbox-privacy-agree"
                />
                <span className="text-xs text-blue-600 font-medium">(필수)</span>
                개인정보 처리방침 고지 확인
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPrivacyExpanded(!privacyExpanded)}
                  className="text-xs text-blue-500 hover:text-blue-700 underline"
                  data-testid="button-privacy-detail"
                >
                  전문 보기
                </button>
                <span
                  className="text-xs font-medium"
                  style={{ color: privacyAgreed ? '#16A34A' : '#9CA3AF' }}
                >
                  {privacyAgreed ? '확인' : '미확인'}
                </span>
              </div>
            </div>
            {privacyExpanded && (
              <div className="p-3 bg-white rounded-md text-xs text-slate-600 leading-relaxed max-h-[150px] overflow-y-auto" style={{ border: '1px solid #E5E7EB' }}>
                <p className="font-semibold mb-1">개인정보 처리방침</p>
                <p>플록슨(이하 "회사")은 개인정보보호법에 따라 이용자의 개인정보를 보호하고 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 다음과 같이 개인정보 처리방침을 수립·공개합니다.</p>
                <p className="mt-1">1. 수집하는 개인정보 항목: 이름, 연락처, 이메일, 소속회사, 부서명 등 서비스 이용에 필요한 최소한의 정보를 수집합니다.</p>
                <p className="mt-1">2. 개인정보의 수집 및 이용목적: 서비스 제공, 본인 확인, 업무 연락, 서비스 개선 등을 위해 개인정보를 이용합니다.</p>
                <p className="mt-1">3. 개인정보의 보유 및 이용기간: 회원 탈퇴 시까지 보유하며, 관련 법령에 따른 보존 의무가 있는 경우 해당 기간 동안 보관합니다.</p>
              </div>
            )}
          </div>
        </div>

        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-amber-100 rounded-full">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <DialogTitle className="text-lg font-semibold">
              임시 비밀번호 변경
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground">
            보안을 위해 임시 비밀번호를 변경해주세요.
            <br />
            비밀번호를 변경하지 않으면 시스템을 이용할 수 없습니다.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    새 비밀번호 <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type={showNewPassword ? "text" : "password"}
                        placeholder="6자 이상, 영문/숫자, 특수문자 포함"
                        className="pl-10 pr-10"
                        data-testid="input-new-password"
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        data-testid="button-toggle-new-password"
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    비밀번호 확인 <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="비밀번호를 다시 입력해주세요"
                        className="pl-10 pr-10"
                        data-testid="input-confirm-password"
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        data-testid="button-toggle-confirm-password"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md">
              <p className="font-medium mb-1">비밀번호 조건:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>6자 이상</li>
                <li>영문자 포함</li>
                <li>숫자 포함</li>
                <li>특수문자 포함</li>
              </ul>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleLogout}
                className="flex-1"
                data-testid="button-logout-from-modal"
              >
                로그아웃
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={changePasswordMutation.isPending || !allAgreed}
                data-testid="button-change-password"
              >
                {changePasswordMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    변경 중...
                  </>
                ) : (
                  "비밀번호 변경"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
