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
import { Loader2 } from "lucide-react";
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
      const errorMessage = error?.error || "로그인에 실패했습니다. 다시 시도해주세요.";
      
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
    <div className="relative" style={{ height: '1147px', background: '#E7EDFE' }}>
      {/* Blur Background Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute"
          style={{
            width: '1095px',
            height: '777px',
            left: '-250px',
            top: '170px',
            background: 'rgba(254, 240, 230, 0.40)',
            borderRadius: '9999px',
            filter: 'blur(212px)',
          }}
        />
        <div 
          className="absolute"
          style={{
            width: '1335px',
            height: '1323px',
            left: '160px',
            top: '160px',
            background: 'rgba(233, 230, 254, 0.50)',
            borderRadius: '9999px',
            filter: 'blur(212px)',
          }}
        />
        <div 
          className="absolute"
          style={{
            width: '348px',
            height: '1323px',
            right: '-100px',
            top: '-30px',
            background: 'rgba(233, 230, 254, 0.50)',
            borderRadius: '9999px',
            filter: 'blur(212px)',
          }}
        />
      </div>
      {/* Header */}
      <header 
        className="relative w-full h-[89px] px-8 flex items-center gap-2"
        style={{
          background: 'rgba(255, 255, 255, 0.06)',
          backdropFilter: 'blur(22px)',
        }}
      >
        <img 
          src={logoIcon} 
          alt="FLOXN Logo" 
          className="w-6 h-6"
        />
        <div className="text-2xl font-bold text-gray-900">FLOXN</div>
      </header>
      {/* Main Content */}
      <div className="relative flex gap-0 px-8 py-0 max-w-[1856px] mx-auto">
        {/* Left Panel - Illustration */}
        <div 
          className="hidden lg:block bg-white overflow-hidden flex-1"
          style={{
            height: '990px',
            borderRadius: '12px',
            position: 'relative',
          }}
        >
          {/* Blur orbs inside left panel */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div 
              className="absolute"
              style={{
                width: '1095px',
                height: '777px',
                left: '-609px',
                top: '-300px',
                background: 'rgba(254, 240, 230, 0.40)',
                borderRadius: '9999px',
                filter: 'blur(212px)',
              }}
            />
            <div 
              className="absolute"
              style={{
                width: '1335px',
                height: '1323px',
                left: '200px',
                top: '160px',
                background: 'rgba(233, 230, 254, 0.50)',
                borderRadius: '9999px',
                filter: 'blur(212px)',
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
            height: '990px',
            borderRadius: '12px',
          }}
        >
          <div className="w-full max-w-lg px-8 py-12">
            {/* Header */}
            <div className="mb-[91px]">
              <h1 
                className="font-medium mb-3"
                style={{ 
                  color: 'rgba(12, 12, 12, 0.90)',
                  fontSize: '28px',
                  lineHeight: '35.84px',
                }}
                data-testid="text-login-title"
              >
                로그인
              </h1>
              <p 
                style={{ 
                  color: 'rgba(12, 12, 12, 0.70)',
                  fontSize: '18px',
                  lineHeight: '23.04px',
                }}
                data-testid="text-login-subtitle"
              >
                접수부터 종결까지 진행 흐름을 한눈에-
              </p>
            </div>

            {/* Login Form */}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-[38px]">
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
                            color: '#0C0C0C',
                            fontSize: '15px',
                            lineHeight: '19.20px',
                          }}
                        >
                          아이디
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="xblock01"
                            className="font-semibold"
                            style={{
                              height: '68px',
                              paddingLeft: '20px',
                              paddingRight: '20px',
                              background: '#FDFDFD',
                              borderRadius: '8px',
                              border: 'none',
                              outline: '2px solid rgba(12, 12, 12, 0.08)',
                              outlineOffset: '-2px',
                              color: '#0C0C0C',
                              fontSize: '16px',
                              lineHeight: '20.48px',
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
                            color: '#0C0C0C',
                            fontSize: '15px',
                            lineHeight: '19.20px',
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
                              height: '68px',
                              paddingLeft: '20px',
                              paddingRight: '20px',
                              background: '#FDFDFD',
                              borderRadius: '8px',
                              border: 'none',
                              outline: '2px solid rgba(12, 12, 12, 0.08)',
                              outlineOffset: '-2px',
                              color: '#0C0C0C',
                              fontSize: '16px',
                              lineHeight: '20.48px',
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
                        color: '#686A6E',
                        fontSize: '14px',
                        lineHeight: '17.92px',
                      }}
                      onClick={() => setSaveUsername(!saveUsername)}
                    >아이디저장</Label>
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full font-bold"
                  style={{
                    height: '68px',
                    paddingLeft: '20px',
                    paddingRight: '20px',
                    background: '#008FED',
                    borderRadius: '8px',
                    color: '#FDFDFD',
                    fontSize: '18px',
                    lineHeight: '23.04px',
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

                <div className="mt-6 text-center" style={{ fontFamily: 'Pretendard', fontSize: '12px', color: 'rgba(12, 12, 12, 0.45)', lineHeight: '1.8' }}>
                  <div className="flex items-center justify-center gap-3 mb-2" style={{ fontSize: '13px', color: 'rgba(12, 12, 12, 0.55)' }}>
                    <span>개인정보처리방침</span>
                    <span>|</span>
                    <span>서비스 이용약관</span>
                  </div>
                  <p>회사명: ©플록슨 대표이사: 송기원 사업자등록번호: 517-87-03490</p>
                  <p>(07256) 서울 영등포구 당산로 133, 3층 302호 Tel. 070-7778-0925</p>
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
    </div>
  );
}
