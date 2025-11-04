import { useState, useEffect } from "react";
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
import { TestCredentialsBanner } from "@/components/test-credentials-banner";
import { Shield, Lock, User, Loader2 } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      accidentNumber: "",
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
          setLocation("/dashboard");
        }
      } catch (error) {
        console.error("Session check failed:", error);
      }
    };

    checkSession();

    const savedRememberMe = localStorage.getItem("rememberMe");
    if (savedRememberMe === "true") {
      form.setValue("rememberMe", true);
    }
  }, [setLocation, form]);

  const loginMutation = useMutation({
    mutationFn: async (data: LoginInput) => {
      return await apiRequest("POST", "/api/login", data);
    },
    onSuccess: (data, variables) => {
      if (variables.rememberMe) {
        localStorage.setItem("rememberMe", "true");
      } else {
        localStorage.removeItem("rememberMe");
      }

      toast({
        title: "로그인 성공",
        description: "환영합니다!",
      });

      setTimeout(() => {
        setLocation("/dashboard");
      }, 500);
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

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background">
      {/* Background blur ellipses */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] left-[15%] w-[500px] h-[500px] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute top-[30%] left-[25%] w-[400px] h-[400px] rounded-full bg-primary/30 blur-[100px]" />
        <div className="absolute top-[50%] left-[10%] w-[350px] h-[350px] rounded-full bg-primary/15 blur-[90px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-8 py-6 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-3" data-testid="logo-container">
          <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary">
            <Shield className="w-6 h-6 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-foreground">보험 관리</span>
            <span className="text-xs text-muted-foreground">Insurance System</span>
          </div>
        </div>
      </header>

      {/* Main content - two panels */}
      <div className="relative flex min-h-[calc(100vh-80px)]">
        {/* Left decorative panel */}
        <div className="relative hidden lg:flex lg:w-[60%] items-center justify-center overflow-hidden">
          {/* Duplicate blur effects for left panel */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-[20%] left-[30%] w-[450px] h-[450px] rounded-full bg-primary/25 blur-[110px]" />
            <div className="absolute top-[40%] left-[40%] w-[350px] h-[350px] rounded-full bg-primary/35 blur-[95px]" />
            <div className="absolute top-[60%] left-[25%] w-[300px] h-[300px] rounded-full bg-primary/20 blur-[85px]" />
          </div>

          {/* Decorative content */}
          <div className="relative z-10 max-w-lg px-8 space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 backdrop-blur-sm border border-primary/20">
                <Shield className="w-12 h-12 text-primary" />
              </div>
              <h1 className="text-4xl font-bold text-foreground">
                접수부터 종결까지
                <br />
                진행 흐름을 한눈에
              </h1>
              <p className="text-lg text-muted-foreground">
                보험 사고 관리의 모든 과정을 효율적으로 처리하세요
              </p>
            </div>

            {/* Feature highlights */}
            <div className="space-y-4">
              {[
                { icon: Shield, text: "안전한 데이터 관리" },
                { icon: Lock, text: "보안 인증 시스템" },
                { icon: User, text: "사용자 맞춤 대시보드" },
              ].map((feature, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-4 p-4 rounded-lg bg-card/50 backdrop-blur-sm border border-card-border"
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10">
                    <feature.icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-card-foreground">
                    {feature.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right panel - login form */}
        <div className="relative flex items-center justify-center w-full lg:w-[40%] px-6 py-12 bg-background/95 backdrop-blur-sm">
          <div className="w-full max-w-[400px] space-y-8">
            {/* Title section */}
            <div className="space-y-2 text-center lg:text-left">
              <h2 className="text-2xl font-bold text-foreground" data-testid="text-login-title">
                로그인
              </h2>
              <p className="text-sm text-muted-foreground" data-testid="text-login-subtitle">
                접수부터 종결까지 진행 흐름을 한눈에-
              </p>
            </div>

            {/* Test credentials banner */}
            <TestCredentialsBanner />

            {/* Login form */}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Accident Number Field */}
                <FormField
                  control={form.control}
                  name="accidentNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-foreground">
                        보험사 사고번호
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="사고번호를 입력해주세요"
                          className="h-12 text-base"
                          data-testid="input-accident-number"
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
                      <FormLabel className="text-sm font-medium text-foreground">
                        비밀번호
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="password"
                          placeholder="••••••••••••"
                          className="h-12 text-base"
                          data-testid="input-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Remember Me Checkbox */}
                <FormField
                  control={form.control}
                  name="rememberMe"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center space-x-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-remember-me"
                            className="w-5 h-5"
                          />
                        </FormControl>
                        <Label
                          htmlFor="rememberMe"
                          className="text-sm font-normal text-foreground cursor-pointer"
                        >
                          자동로그인
                        </Label>
                      </div>
                    </FormItem>
                  )}
                />

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full h-[52px] text-base font-semibold"
                  data-testid="button-login"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      로그인 중...
                    </>
                  ) : (
                    "로그인"
                  )}
                </Button>
              </form>
            </Form>

            {/* Mobile only - show features */}
            <div className="lg:hidden pt-8 space-y-3 border-t border-border">
              {[
                { icon: Shield, text: "안전한 데이터 관리" },
                { icon: Lock, text: "보안 인증 시스템" },
                { icon: User, text: "사용자 맞춤 대시보드" },
              ].map((feature, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 rounded-md bg-card/30 border border-card-border"
                >
                  <feature.icon className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground">{feature.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
