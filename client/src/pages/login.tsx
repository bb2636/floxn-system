import { useEffect } from "react";
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
import { Loader2, Truck } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import loginIllustration from "@assets/generated_images/Business_login_illustration_b7564f6b.png";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

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
    <div className="flex min-h-screen">
      {/* Left Panel - Illustration */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-amber-50 to-orange-50 items-center justify-center p-12 relative">
        {/* Logo */}
        <div className="absolute top-8 left-8 flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
            <Truck className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-800">FLOXN</span>
        </div>

        {/* Illustration */}
        <div className="max-w-lg">
          <img 
            src={loginIllustration} 
            alt="Login Illustration" 
            className="w-full h-auto object-contain drop-shadow-2xl"
          />
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 p-6">
        {/* Mobile Logo */}
        <div className="lg:hidden absolute top-6 left-6 flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
            <Truck className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-800">FLOXN</span>
        </div>

        <div className="w-full max-w-md space-y-8">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900" data-testid="text-login-title">
              로그인
            </h1>
            <p className="mt-2 text-sm text-gray-600" data-testid="text-login-subtitle">
              접수부터 종결까지 진행 흐름을 한눈에-
            </p>
          </div>

          {/* Test Credentials Banner */}
          <TestCredentialsBanner />

          {/* Login Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Username Field */}
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">
                      아이디
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="xblock01"
                        className="h-12 bg-white border-gray-200 focus:border-primary focus:ring-primary"
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
                    <FormLabel className="text-sm font-medium text-gray-700">
                      비밀번호
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder="••••••••••••"
                        className="h-12 bg-white border-gray-200 focus:border-primary focus:ring-primary"
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
                        />
                      </FormControl>
                      <Label
                        htmlFor="rememberMe"
                        className="text-sm text-gray-600 cursor-pointer"
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
                className="w-full h-12 text-base font-medium bg-blue-500 hover:bg-blue-600 text-white"
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
        </div>
      </div>
    </div>
  );
}
