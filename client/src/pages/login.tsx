import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { loginSchema, type LoginInput } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
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
import { ForceChangePasswordModal } from "@/components/force-change-password-modal";
import loginIllustration from "@assets/Vector_1762217883452.png";
import logoIcon from "@assets/Frame 2_1762217940686.png";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showForceChangePassword, setShowForceChangePassword] = useState(false);
  const [saveUsername, setSaveUsername] = useState(false);
  const [privacyPolicyOpen, setPrivacyPolicyOpen] = useState(false);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
      rememberMe: false,
    },
  });

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch("/api/check-session");
        const data = await response.json();
        if (data.authenticated) {
          if (data.user?.mustChangePassword === true) {
            setShowForceChangePassword(true);
          } else {
            setLocation("/dashboard");
          }
        }
      } catch (error) {
        console.error("Session check failed:", error);
      }
    };

    checkSession();

    const savedUsername = localStorage.getItem("savedUsername");
    if (savedUsername) {
      form.setValue("username", savedUsername);
      setSaveUsername(true);
    }

    const savedRememberMe = localStorage.getItem("rememberMe");
    if (savedRememberMe === "true") {
      form.setValue("rememberMe", true);
    }
  }, [setLocation, form]);

  const loginMutation = useMutation({
    mutationFn: async (data: LoginInput) => {
      const response = await apiRequest("POST", "/api/login", data);
      return await response.json();
    },
    onSuccess: (data: any, variables) => {
      if (variables.rememberMe) {
        localStorage.setItem("rememberMe", "true");
      } else {
        localStorage.removeItem("rememberMe");
      }

      if (saveUsername) {
        localStorage.setItem("savedUsername", variables.username);
      } else {
        localStorage.removeItem("savedUsername");
      }

      if (data.mustChangePassword === true) {
        toast({
          title: "비밀번호 변경 필요",
          description: "임시 비밀번호를 변경해주세요.",
        });
        setShowForceChangePassword(true);
      } else {
        toast({
          title: "로그인 성공",
          description: "환영합니다!",
        });

        setTimeout(() => {
          setLocation("/dashboard");
        }, 500);
      }
    },
    onError: (error: any) => {
      const errorMessage =
        error?.error || "로그인에 실패했습니다. 다시 시도해주세요.";

      toast({
        title: "로그인 실패",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: LoginInput) => {
    loginMutation.mutate(data);
  };

  const handlePasswordChangeSuccess = () => {
    setShowForceChangePassword(false);
    toast({
      title: "로그인 성공",
      description: "환영합니다!",
    });
    setTimeout(() => {
      setLocation("/dashboard");
    }, 500);
  };

  const handleLogoutFromModal = () => {
    setShowForceChangePassword(false);
    form.reset();
  };

  return (
    <div
      className="relative"
      style={{ height: "1147px", background: "#E7EDFE" }}
    >
      {/* Blur Background Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute"
          style={{
            width: "1095px",
            height: "777px",
            left: "-250px",
            top: "170px",
            background: "rgba(254, 240, 230, 0.40)",
            borderRadius: "9999px",
            filter: "blur(212px)",
          }}
        />
        <div
          className="absolute"
          style={{
            width: "1335px",
            height: "1323px",
            left: "160px",
            top: "160px",
            background: "rgba(233, 230, 254, 0.50)",
            borderRadius: "9999px",
            filter: "blur(212px)",
          }}
        />
        <div
          className="absolute"
          style={{
            width: "348px",
            height: "1323px",
            right: "-100px",
            top: "-30px",
            background: "rgba(233, 230, 254, 0.50)",
            borderRadius: "9999px",
            filter: "blur(212px)",
          }}
        />
      </div>
      {/* Header */}
      <header
        className="relative w-full h-[89px] px-8 flex items-center gap-2"
        style={{
          background: "rgba(255, 255, 255, 0.06)",
          backdropFilter: "blur(22px)",
        }}
      >
        <img src={logoIcon} alt="FLOXN Logo" className="w-6 h-6" />
        <div className="text-2xl font-bold text-gray-900">FLOXN</div>
      </header>
      {/* Main Content */}
      <div className="relative flex gap-0 px-8 py-0 max-w-[1856px] mx-auto">
        {/* Left Panel - Illustration */}
        <div
          className="hidden lg:block bg-white overflow-hidden flex-1"
          style={{
            height: "990px",
            borderRadius: "12px",
            position: "relative",
          }}
        >
          {/* Blur orbs inside left panel */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div
              className="absolute"
              style={{
                width: "1095px",
                height: "777px",
                left: "-609px",
                top: "-300px",
                background: "rgba(254, 240, 230, 0.40)",
                borderRadius: "9999px",
                filter: "blur(212px)",
              }}
            />
            <div
              className="absolute"
              style={{
                width: "1335px",
                height: "1323px",
                left: "200px",
                top: "160px",
                background: "rgba(233, 230, 254, 0.50)",
                borderRadius: "9999px",
                filter: "blur(212px)",
              }}
            />
          </div>

          {/* Illustration */}
          <div className="relative z-10 flex items-center justify-center h-full p-12">
            <img
              src={loginIllustration}
              alt="Login Illustration"
              className="max-w-2xl w-full h-auto object-contain"
            />
          </div>
        </div>

        {/* Right Panel - Login Form */}
        <div
          className="flex-1 flex items-center justify-center overflow-hidden"
          style={{
            height: "990px",
            borderRadius: "12px",
          }}
        >
          <div className="w-full max-w-lg px-8 py-12">
            {/* Header */}
            <div className="mb-[91px]">
              <h1
                className="font-medium mb-3"
                style={{
                  color: "rgba(12, 12, 12, 0.90)",
                  fontSize: "28px",
                  lineHeight: "35.84px",
                }}
                data-testid="text-login-title"
              >
                로그인
              </h1>
              <p
                style={{
                  color: "rgba(12, 12, 12, 0.70)",
                  fontSize: "18px",
                  lineHeight: "23.04px",
                }}
                data-testid="text-login-subtitle"
              >
                접수부터 종결까지 진행 흐름을 한눈에-
              </p>
            </div>

            {/* Login Form */}
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-[38px]"
              >
                <div className="space-y-5">
                  {/* Username Field */}
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel
                          className="font-semibold"
                          style={{
                            color: "#0C0C0C",
                            fontSize: "15px",
                            lineHeight: "19.20px",
                          }}
                        >
                          아이디
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="floxn"
                            className="font-semibold"
                            style={{
                              height: "34px",
                              paddingLeft: "20px",
                              paddingRight: "20px",
                              background: "#FDFDFD",
                              borderRadius: "8px",
                              border: "none",
                              outline: "2px solid rgba(12, 12, 12, 0.08)",
                              outlineOffset: "-2px",
                              color: "#0C0C0C",
                              fontSize: "16px",
                              lineHeight: "20.48px",
                            }}
                            data-testid="input-username"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Password Field */}
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel
                          className="font-semibold"
                          style={{
                            color: "#0C0C0C",
                            fontSize: "15px",
                            lineHeight: "19.20px",
                          }}
                        >
                          비밀번호
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="password"
                            placeholder="••••••••••••"
                            className="font-semibold"
                            style={{
                              height: "34px",
                              paddingLeft: "20px",
                              paddingRight: "20px",
                              background: "#FDFDFD",
                              borderRadius: "8px",
                              border: "none",
                              outline: "2px solid rgba(12, 12, 12, 0.08)",
                              outlineOffset: "-2px",
                              color: "#0C0C0C",
                              fontSize: "16px",
                              lineHeight: "20.48px",
                            }}
                            data-testid="input-password"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Save Username Checkbox */}
                  <div className="flex items-center gap-1">
                    <Checkbox
                      checked={saveUsername}
                      onCheckedChange={(checked) => setSaveUsername(!!checked)}
                      data-testid="checkbox-save-username"
                    />
                    <Label
                      className="cursor-pointer font-medium"
                      style={{
                        color: "#686A6E",
                        fontSize: "14px",
                        lineHeight: "17.92px",
                      }}
                      onClick={() => setSaveUsername(!saveUsername)}
                    >
                      아이디저장
                    </Label>
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full font-bold"
                  style={{
                    height: "34px",
                    paddingLeft: "20px",
                    paddingRight: "20px",
                    background: "#008FED",
                    borderRadius: "8px",
                    color: "#FDFDFD",
                    fontSize: "18px",
                    lineHeight: "23.04px",
                  }}
                  data-testid="button-login"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      로그인 중...
                    </>
                  ) : (
                    "로그인"
                  )}
                </Button>

                <div
                  className="mt-6 text-center"
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "12px",
                    color: "rgba(12, 12, 12, 0.45)",
                    lineHeight: "1.8",
                  }}
                >
                  <div
                    className="flex items-center justify-center gap-3 mb-2"
                    style={{
                      fontSize: "13px",
                      color: "rgba(12, 12, 12, 0.55)",
                    }}
                  >
                    <span
                      className="cursor-pointer hover:underline"
                      style={{ color: "rgba(12, 12, 12, 0.7)" }}
                      onClick={() => setPrivacyPolicyOpen(true)}
                      data-testid="button-privacy-policy"
                    >개인정보처리방침</span>
                    <span>|</span>
                    <span>서비스 이용약관</span>
                  </div>
                  <p>
                    회사명: ©플록슨 대표이사: 송기원 사업자등록번호:
                    517-87-03490
                  </p>
                  <p>
                    (07256) 서울 영등포구 당산로 133, 3층 302호 Tel.
                    070-7778-0925
                  </p>
                  <p>Copyright FLOXN Co., Ltd. All rights reserved.</p>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </div>
      <ForceChangePasswordModal
        open={showForceChangePassword}
        onSuccess={handlePasswordChangeSuccess}
        onLogout={handleLogoutFromModal}
      />
      <Dialog open={privacyPolicyOpen} onOpenChange={setPrivacyPolicyOpen}>
        <DialogContent className="sm:max-w-[640px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">개인정보 처리방침</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-slate-700 leading-relaxed space-y-4" style={{ fontFamily: 'Pretendard' }}>
            <p>주식회사 플록슨(이하 '회사')은 「개인정보 보호법」 제30조에 따라 정보주체의 개인정보를 보호하고 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 하기 위하여 다음과 같이 개인정보 처리방침을 수립·공개합니다.</p>

            <div>
              <h4 className="font-bold text-slate-900 mb-1">제1조 (개인정보의 처리 목적)</h4>
              <p>회사는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며 이용 목적이 변경되는 경우에는 「개인정보 보호법」 제18조에 따라 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.</p>
              <ul className="list-disc list-inside mt-1 space-y-1 text-slate-600">
                <li>서비스 제공 및 관리: B2B 업무 시스템 이용에 따른 본인 식별, 인증, 회원자격 유지·관리, 서비스 공급 및 계약 이행.</li>
                <li>현장 조사 및 공사 수행 지원: 사고원인 파악을 위한 현장확인, 관련 위치 및 피해상황 사진 촬영, 공사 진행상태 기록 및 관리</li>
                <li>서비스 이용 관련 문의, 불만 처리 및 고지사항 전달 등</li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 mb-1">제2조 (개인정보의 처리 및 보유 기간)</h4>
              <p>① 회사는 법령에 따른 개인정보 보유·이용 기간 또는 정보주체로부터 개인정보를 수집 시에 동의 받은 개인정보 보유·이용 기간 내에서 개인정보를 처리·보유합니다.</p>
              <p className="mt-1">② 각각의 개인정보 처리 및 보유 기간은 다음과 같습니다.</p>
              <ul className="list-disc list-inside mt-1 space-y-1 text-slate-600">
                <li>시스템 회원 가입 및 관리: 시스템 탈퇴 시까지. 단, 다음의 사유에 해당하는 경우에는 해당 사유 종료 시까지 보존합니다.
                  <ul className="list-disc list-inside ml-4 mt-1 space-y-0.5">
                    <li>관계 법령 위반에 따른 수사·조사 등이 진행 중인 경우: 해당 수사·조사 종료 시까지</li>
                    <li>시스템 이용에 따른 채권·채무관계 잔존 시: 해당 채권·채무관계 정산 완료 시까지</li>
                  </ul>
                </li>
                <li>서비스 접속 및 이용 기록: 1년 (관련 법령에 따라 최소 1년 이상 보관)</li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 mb-1">제3조 (처리하는 개인정보의 항목)</h4>
              <p>회사는 다음의 개인정보 항목을 처리하고 있습니다.</p>
              <ol className="list-decimal list-inside mt-1 space-y-1 text-slate-600">
                <li>피보험자 정보: 성명, 연락처(휴대전화번호), 주소(공사 대상 주택 소재지)</li>
                <li>피해자 정보: 성명, 연락처, 주소</li>
                <li>현장 조사 및 업무 수행 정보: 사고 현장 사진(위치 및 피해 상황 포함), 공사 진행 관련 사진</li>
                <li>시스템 이용자(담당자) 정보: 성명, 소속 회사/부서, 직함, 업무용 연락처, 로그인 ID, 접속 로그, IP 주소</li>
              </ol>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 mb-1">제4조 (개인정보 처리 업무의 위탁)</h4>
              <p>회사는 원활한 서비스 제공 및 현장 출동, 복구 공사 등 업무 수행을 위하여 다음과 같이 개인정보 처리 업무를 위탁하고 있습니다.</p>
              <div className="mt-2 border border-slate-200 rounded-md overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="p-2 text-left font-semibold border-b border-slate-200">수탁자(업무 수행 주체)</th>
                      <th className="p-2 text-left font-semibold border-b border-slate-200">위탁 업무의 내용</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-2 border-b border-slate-100">시스템 등록된 공사업체</td>
                      <td className="p-2 border-b border-slate-100">현장 출동, 사고원인 확인, 공사 수행, 피해자 확인 및 현장 사진 촬영</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-1">회사는 위탁계약 체결 시 「개인정보 보호법」 제26조에 따라 위탁업무 수행 목적 외 개인정보 처리금지, 기술적·관리적 보호조치, 재위탁 제한, 수탁자에 대한 관리·감독, 손해배상 등 책임에 관한 사항을 계약서 등 명문으로 규정하고, 수탁자가 개인정보를 안전하게 처리하는지를 감독하고 있습니다.</p>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 mb-1">제5조 (개인정보의 파기 절차 및 방법)</h4>
              <p>① 회사는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체 없이 해당 개인정보를 파기합니다.</p>
              <p>② 전자적 파일 형태의 정보는 기록을 재생할 수 없는 기술적 방법을 사용하여 삭제합니다.</p>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 mb-1">제6조 (개인정보의 안전성 확보 조치)</h4>
              <p>회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다.</p>
              <ul className="list-disc list-inside mt-1 space-y-1 text-slate-600">
                <li>관리적 조치: 내부관리계획 수립 및 시행, 정기적 직원 교육.</li>
                <li>기술적 조치: 개인정보처리시스템 등의 접근권한 관리, 접속기록의 보관, 비밀번호의 일방향 암호화, 데이터 전송 시 SSL 암호화 적용.</li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 mb-1">제7조 (개인정보 보호책임자)</h4>
              <p>개인정보 처리에 관한 업무를 총괄해서 책임지고, 정보주체의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.</p>
              <ul className="list-disc list-inside mt-1 space-y-1 text-slate-600">
                <li>성명: 이현재</li>
                <li>직책: 상무</li>
                <li>연락처: hjlee@floxn.co.kr (070-7731-0925)</li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 mb-1">제8조 (정보주체의 권리·의무 및 그 행사방법)</h4>
              <p>정보주체는 회사에 대해 언제든지 개인정보 열람·정정·삭제·처리정지 요구 등의 권리를 행사할 수 있습니다. 권리 행사는 서면, 전자우편 등을 통하여 하실 수 있으며 회사는 이에 대해 지체 없이 조치하겠습니다.</p>
            </div>

            <div className="border-t border-slate-200 pt-3">
              <h4 className="font-bold text-slate-900 mb-1">부 칙</h4>
              <p>제1조 (시행일) 본 개인정보 처리방침은 2026년 3월 1일부터 시행됩니다.</p>
              <p className="mt-1">제2조 (개정 이력) 회사는 개인정보 처리방침을 개정하는 경우 변경 전후를 비교하여 확인할 수 있도록 아래와 같이 관리합니다.</p>
              <div className="mt-2 border border-slate-200 rounded-md overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="p-2 text-left font-semibold border-b border-slate-200">버전 번호</th>
                      <th className="p-2 text-left font-semibold border-b border-slate-200">공고 일자</th>
                      <th className="p-2 text-left font-semibold border-b border-slate-200">시행일자</th>
                      <th className="p-2 text-left font-semibold border-b border-slate-200">주요 개정 내용</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-2 border-b border-slate-100">v1.0</td>
                      <td className="p-2 border-b border-slate-100">2026.02.23.</td>
                      <td className="p-2 border-b border-slate-100">2026.03.01</td>
                      <td className="p-2 border-b border-slate-100">최초 제정 및 시행</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
