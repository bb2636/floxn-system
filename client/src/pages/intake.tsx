import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { User } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import logoIcon from "@assets/Frame 2_1762217940686.png";

export default function Intake() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeMenu, setActiveMenu] = useState("접수하기");
  
  const { data: user, isLoading: userLoading } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  useEffect(() => {
    if (!userLoading && !user) {
      setLocation("/");
    }
  }, [user, userLoading, setLocation]);

  const [formData, setFormData] = useState({
    insuranceAccidentNo: "",
    insurancePolicyNo: "",
    insuranceCompany: "",
    clientName: "",
    clientPhone: "",
    clientAddress: "",
    accidentDate: "",
    accidentLocation: "",
    accidentDescription: "",
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest("POST", "/api/cases", data);
    },
    onSuccess: () => {
      toast({ description: "접수가 저장되었습니다." });
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
    },
    onError: (error: Error) => {
      toast({ description: error.message, variant: "destructive" });
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest("POST", "/api/cases", { ...data, status: "제출" });
    },
    onSuccess: () => {
      toast({ description: "접수가 완료되었습니다." });
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      setLocation("/dashboard");
    },
    onError: (error: Error) => {
      toast({ description: error.message, variant: "destructive" });
    },
  });

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  const handleSubmit = () => {
    if (!formData.insuranceAccidentNo && !formData.insurancePolicyNo) {
      toast({
        description: "보험사 사고번호 또는 보험사 증권번호 중 하나는 필수입니다.",
        variant: "destructive",
      });
      return;
    }
    submitMutation.mutate(formData);
  };

  const handleReset = () => {
    setFormData({
      insuranceAccidentNo: "",
      insurancePolicyNo: "",
      insuranceCompany: "",
      clientName: "",
      clientPhone: "",
      clientAddress: "",
      accidentDate: "",
      accidentLocation: "",
      accidentDescription: "",
    });
  };

  if (userLoading) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ minHeight: "100vh" }}
      >
        <div style={{ fontFamily: "Pretendard", color: "#686A6E" }}>
          로딩 중...
        </div>
      </div>
    );
  }

  if (!user) {
    setLocation("/");
    return null;
  }

  const menuItems = [
    { name: "홈" },
    { name: "접수하기" },
    { name: "진행상황" },
    { name: "현장조사" },
    { name: "종합진행관리" },
    { name: "통계 및 정산" },
    { name: "관리자 설정" },
  ];

  return (
    <div className="relative" style={{ minHeight: '100vh', background: '#E7EDFE' }}>
      {/* Blur Background Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute"
          style={{
            width: '1095px',
            height: '777px',
            left: '97px',
            bottom: '-200px',
            background: 'rgba(254, 240, 230, 0.4)',
            borderRadius: '9999px',
            filter: 'blur(212px)',
            transform: 'rotate(-35.25deg)',
          }}
        />
        <div 
          className="absolute"
          style={{
            width: '1335px',
            height: '1323px',
            left: '811px',
            bottom: '0px',
            background: 'rgba(234, 230, 254, 0.5)',
            borderRadius: '9999px',
            filter: 'blur(212px)',
          }}
        />
        <div 
          className="absolute"
          style={{
            width: '348px',
            height: '1323px',
            right: '0px',
            top: '0px',
            background: 'linear-gradient(119.98deg, rgba(217, 217, 217, 0) 0%, rgba(12, 95, 246, 0.064) 100%)',
            filter: 'blur(212px)',
          }}
        />
      </div>

      {/* Header */}
      <header 
        className="relative w-full h-[89px] px-8 flex items-center justify-between"
        style={{
          background: 'rgba(255, 255, 255, 0.06)',
          borderBottom: '1px solid rgba(0, 143, 237, 0.2)',
          backdropFilter: 'blur(22px)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 w-[260px]">
          <img 
            src={logoIcon} 
            alt="FLOXN Logo" 
            className="w-6 h-6"
          />
          <div className="text-2xl font-bold text-gray-900">FLOXN</div>
        </div>

        {/* Navigation Menu */}
        <div className="flex items-center gap-6 flex-1 px-6">
          {menuItems.map((item) => (
            <button
              key={item.name}
              onClick={() => {
                setActiveMenu(item.name);
                if (item.name === "홈") {
                  setLocation("/dashboard");
                } else if (item.name === "관리자 설정") {
                  setLocation("/admin-settings");
                } else if (item.name === "접수하기") {
                  setLocation("/intake");
                }
              }}
              className="px-6 py-3 rounded-lg transition-colors"
              style={{
                fontFamily: 'Pretendard',
                fontSize: '18px',
                fontWeight: activeMenu === item.name ? 600 : 500,
                letterSpacing: '-0.02em',
                color: activeMenu === item.name ? '#0C0C0C' : 'rgba(12, 12, 12, 0.5)',
                background: activeMenu === item.name ? 'rgba(12, 12, 12, 0.04)' : 'transparent',
              }}
              data-testid={`nav-${item.name}`}
            >
              {item.name}
            </button>
          ))}
        </div>

        {/* User Profile */}
        <div 
          className="flex items-center gap-3 px-4 py-2 rounded-lg"
          style={{
            background: 'rgba(0, 143, 237, 0.08)',
            border: '1px solid rgba(0, 143, 237, 0.3)',
          }}
        >
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: '#008FED' }}
          >
            <span className="text-white font-semibold">{user?.username?.[0] || 'U'}</span>
          </div>
          <div className="flex flex-col">
            <div 
              className="font-semibold"
              style={{
                fontFamily: 'Pretendard',
                fontSize: '16px',
                color: '#0C0C0C',
              }}
            >
              {user?.username || '사용자'} {user?.role || '관리자'}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div
        className="relative flex flex-col items-center"
        style={{
          padding: "40px 0",
        }}
      >
      <div
        className="flex flex-col"
        style={{
          width: "1660px",
          gap: "8px",
        }}
      >
        {/* Page Header */}
        <div
          className="flex items-center"
          style={{
            padding: "36px 32px",
            gap: "16px",
            height: "82px",
          }}
        >
          <h1
            style={{
              fontFamily: "Pretendard",
              fontWeight: 600,
              fontSize: "26px",
              lineHeight: "128%",
              letterSpacing: "-0.02em",
              color: "#0C0C0C",
            }}
            data-testid="heading-intake"
          >
            새로운 접수
          </h1>
        </div>

        {/* Form Content */}
        <div
          className="flex flex-col"
          style={{
            gap: "20px",
          }}
        >
          {/* Basic Information Section */}
          <div
            className="flex flex-col"
            style={{
              background: "#FFFFFF",
              boxShadow: "0px 0px 20px #DBE9F5",
              borderRadius: "12px",
              padding: "0 0 32px",
            }}
          >
            {/* Section Header */}
            <div
              className="flex items-center justify-center"
              style={{
                padding: "24px",
                borderBottom: "2px solid rgba(12, 12, 12, 0.1)",
                height: "82px",
              }}
            >
              <h2
                style={{
                  fontFamily: "Pretendard",
                  fontWeight: 600,
                  fontSize: "24px",
                  lineHeight: "128%",
                  letterSpacing: "-0.02em",
                  color: "#0C0C0C",
                }}
              >
                기본 정보
              </h2>
            </div>

            {/* Form Fields - Row 1 */}
            <div
              className="flex items-start"
              style={{
                padding: "16px 20px 0",
                gap: "20px",
              }}
            >
              {/* Field 1 */}
              <div
                className="flex flex-col flex-1"
                style={{ gap: "8px" }}
              >
                <label
                  style={{
                    fontFamily: "Pretendard",
                    fontWeight: 500,
                    fontSize: "14px",
                    lineHeight: "128%",
                    letterSpacing: "-0.01em",
                    color: "#686A6E",
                  }}
                >
                  접수일
                </label>
                <Input
                  type="date"
                  value={formData.accidentDate}
                  onChange={(e) => handleInputChange("accidentDate", e.target.value)}
                  style={{
                    height: "68px",
                    background: "rgba(12, 12, 12, 0.04)",
                    border: "none",
                    borderRadius: "8px",
                    padding: "10px 20px",
                    fontFamily: "Pretendard",
                    fontWeight: 600,
                    fontSize: "16px",
                    lineHeight: "128%",
                    letterSpacing: "-0.02em",
                  }}
                  data-testid="input-accident-date"
                />
              </div>

              {/* Field 2 */}
              <div
                className="flex flex-col flex-1"
                style={{ gap: "8px" }}
              >
                <label
                  style={{
                    fontFamily: "Pretendard",
                    fontWeight: 500,
                    fontSize: "14px",
                    lineHeight: "128%",
                    letterSpacing: "-0.01em",
                    color: "#686A6E",
                  }}
                >
                  사고지역
                </label>
                <Input
                  placeholder="사고 지역을 입력해주세요"
                  value={formData.accidentLocation}
                  onChange={(e) => handleInputChange("accidentLocation", e.target.value)}
                  style={{
                    height: "68px",
                    background: "rgba(12, 12, 12, 0.04)",
                    border: "none",
                    borderRadius: "8px",
                    padding: "10px 20px",
                    fontFamily: "Pretendard",
                    fontWeight: 600,
                    fontSize: "16px",
                    lineHeight: "128%",
                    letterSpacing: "-0.02em",
                  }}
                  data-testid="input-accident-location"
                />
              </div>
            </div>
          </div>

          {/* Insurance Information Section */}
          <div
            className="flex flex-col"
            style={{
              background: "#FFFFFF",
              boxShadow: "0px 0px 20px #DBE9F5",
              borderRadius: "12px",
              padding: "0 0 32px",
            }}
          >
            {/* Section Header */}
            <div
              className="flex flex-col items-start"
              style={{
                padding: "24px 20px",
                gap: "8px",
              }}
            >
              <h2
                style={{
                  fontFamily: "Pretendard",
                  fontWeight: 600,
                  fontSize: "20px",
                  lineHeight: "128%",
                  letterSpacing: "-0.02em",
                  color: "rgba(12, 12, 12, 0.8)",
                }}
              >
                보험 정보
              </h2>
              <p
                style={{
                  fontFamily: "Pretendard",
                  fontWeight: 500,
                  fontSize: "14px",
                  lineHeight: "128%",
                  letterSpacing: "-0.01em",
                  color: "rgba(12, 12, 12, 0.5)",
                }}
              >
                보험사 증권번호, 보험사 사고번호 중 한 가지는 반드시 기입해야 합니다.
              </p>
            </div>

            {/* Form Fields - Row 1 */}
            <div
              className="flex items-start"
              style={{
                padding: "0 20px",
                gap: "20px",
              }}
            >
              {/* Field 1 */}
              <div
                className="flex flex-col flex-1"
                style={{ gap: "8px" }}
              >
                <label
                  style={{
                    fontFamily: "Pretendard",
                    fontWeight: 500,
                    fontSize: "14px",
                    lineHeight: "128%",
                    letterSpacing: "-0.01em",
                    color: "#686A6E",
                  }}
                >
                  보험사 사고번호
                </label>
                <Input
                  placeholder="보험사 사고번호를 입력해주세요"
                  value={formData.insuranceAccidentNo}
                  onChange={(e) => handleInputChange("insuranceAccidentNo", e.target.value)}
                  style={{
                    height: "68px",
                    background: "#FDFDFD",
                    border: "2px solid rgba(12, 12, 12, 0.08)",
                    borderRadius: "8px",
                    padding: "10px 20px",
                    fontFamily: "Pretendard",
                    fontWeight: 600,
                    fontSize: "16px",
                    lineHeight: "128%",
                    letterSpacing: "-0.02em",
                  }}
                  data-testid="input-insurance-accident-no"
                />
              </div>

              {/* Field 2 */}
              <div
                className="flex flex-col flex-1"
                style={{ gap: "8px" }}
              >
                <label
                  style={{
                    fontFamily: "Pretendard",
                    fontWeight: 500,
                    fontSize: "14px",
                    lineHeight: "128%",
                    letterSpacing: "-0.01em",
                    color: "#686A6E",
                  }}
                >
                  보험사 증권번호
                </label>
                <Input
                  placeholder="보험사 증권번호를 입력해주세요"
                  value={formData.insurancePolicyNo}
                  onChange={(e) => handleInputChange("insurancePolicyNo", e.target.value)}
                  style={{
                    height: "68px",
                    background: "#FDFDFD",
                    border: "2px solid rgba(12, 12, 12, 0.08)",
                    borderRadius: "8px",
                    padding: "10px 20px",
                    fontFamily: "Pretendard",
                    fontWeight: 600,
                    fontSize: "16px",
                    lineHeight: "128%",
                    letterSpacing: "-0.02em",
                  }}
                  data-testid="input-insurance-policy-no"
                />
              </div>

              {/* Field 3 */}
              <div
                className="flex flex-col flex-1"
                style={{ gap: "8px" }}
              >
                <label
                  style={{
                    fontFamily: "Pretendard",
                    fontWeight: 500,
                    fontSize: "14px",
                    lineHeight: "128%",
                    letterSpacing: "-0.01em",
                    color: "#686A6E",
                  }}
                >
                  보험사
                </label>
                <Input
                  placeholder="보험사를 입력해주세요"
                  value={formData.insuranceCompany}
                  onChange={(e) => handleInputChange("insuranceCompany", e.target.value)}
                  style={{
                    height: "68px",
                    background: "#FDFDFD",
                    border: "2px solid rgba(12, 12, 12, 0.08)",
                    borderRadius: "8px",
                    padding: "10px 20px",
                    fontFamily: "Pretendard",
                    fontWeight: 600,
                    fontSize: "16px",
                    lineHeight: "128%",
                    letterSpacing: "-0.02em",
                  }}
                  data-testid="input-insurance-company"
                />
              </div>
            </div>
          </div>

          {/* Client Information Section */}
          <div
            className="flex flex-col"
            style={{
              background: "#FFFFFF",
              boxShadow: "0px 0px 20px #DBE9F5",
              borderRadius: "12px",
              padding: "0 0 32px",
            }}
          >
            {/* Section Header */}
            <div
              className="flex items-center"
              style={{
                padding: "24px 20px",
              }}
            >
              <h2
                style={{
                  fontFamily: "Pretendard",
                  fontWeight: 600,
                  fontSize: "20px",
                  lineHeight: "128%",
                  letterSpacing: "-0.02em",
                  color: "rgba(12, 12, 12, 0.8)",
                }}
              >
                의뢰자 정보
              </h2>
            </div>

            {/* Form Fields - Row 1 */}
            <div
              className="flex items-start"
              style={{
                padding: "0 20px",
                gap: "20px",
                marginBottom: "12px",
              }}
            >
              {/* Field 1 */}
              <div
                className="flex flex-col flex-1"
                style={{ gap: "8px" }}
              >
                <label
                  style={{
                    fontFamily: "Pretendard",
                    fontWeight: 500,
                    fontSize: "14px",
                    lineHeight: "128%",
                    letterSpacing: "-0.01em",
                    color: "#686A6E",
                  }}
                >
                  성함
                </label>
                <Input
                  placeholder="성함을 입력해주세요"
                  value={formData.clientName}
                  onChange={(e) => handleInputChange("clientName", e.target.value)}
                  style={{
                    height: "68px",
                    background: "#FDFDFD",
                    border: "2px solid rgba(12, 12, 12, 0.08)",
                    borderRadius: "8px",
                    padding: "10px 20px",
                    fontFamily: "Pretendard",
                    fontWeight: 600,
                    fontSize: "16px",
                    lineHeight: "128%",
                    letterSpacing: "-0.02em",
                  }}
                  data-testid="input-client-name"
                />
              </div>

              {/* Field 2 */}
              <div
                className="flex flex-col flex-1"
                style={{ gap: "8px" }}
              >
                <label
                  style={{
                    fontFamily: "Pretendard",
                    fontWeight: 500,
                    fontSize: "14px",
                    lineHeight: "128%",
                    letterSpacing: "-0.01em",
                    color: "#686A6E",
                  }}
                >
                  연락처
                </label>
                <Input
                  placeholder="연락처를 입력해주세요"
                  value={formData.clientPhone}
                  onChange={(e) => handleInputChange("clientPhone", e.target.value)}
                  style={{
                    height: "68px",
                    background: "#FDFDFD",
                    border: "2px solid rgba(12, 12, 12, 0.08)",
                    borderRadius: "8px",
                    padding: "10px 20px",
                    fontFamily: "Pretendard",
                    fontWeight: 600,
                    fontSize: "16px",
                    lineHeight: "128%",
                    letterSpacing: "-0.02em",
                  }}
                  data-testid="input-client-phone"
                />
              </div>

              {/* Field 3 */}
              <div
                className="flex flex-col flex-1"
                style={{ gap: "8px" }}
              >
                <label
                  style={{
                    fontFamily: "Pretendard",
                    fontWeight: 500,
                    fontSize: "14px",
                    lineHeight: "128%",
                    letterSpacing: "-0.01em",
                    color: "#686A6E",
                  }}
                >
                  주소
                </label>
                <Input
                  placeholder="주소를 입력해주세요"
                  value={formData.clientAddress}
                  onChange={(e) => handleInputChange("clientAddress", e.target.value)}
                  style={{
                    height: "68px",
                    background: "#FDFDFD",
                    border: "2px solid rgba(12, 12, 12, 0.08)",
                    borderRadius: "8px",
                    padding: "10px 20px",
                    fontFamily: "Pretendard",
                    fontWeight: 600,
                    fontSize: "16px",
                    lineHeight: "128%",
                    letterSpacing: "-0.02em",
                  }}
                  data-testid="input-client-address"
                />
              </div>
            </div>

            {/* Field 4 - Full Width */}
            <div
              className="flex flex-col"
              style={{
                padding: "0 20px",
                gap: "8px",
              }}
            >
              <label
                style={{
                  fontFamily: "Pretendard",
                  fontWeight: 500,
                  fontSize: "14px",
                  lineHeight: "128%",
                  letterSpacing: "-0.01em",
                  color: "#686A6E",
                }}
              >
                사고내용
              </label>
              <textarea
                placeholder="사고내용을 입력해주세요"
                value={formData.accidentDescription}
                onChange={(e) => handleInputChange("accidentDescription", e.target.value)}
                style={{
                  minHeight: "120px",
                  background: "#FDFDFD",
                  border: "2px solid rgba(12, 12, 12, 0.08)",
                  borderRadius: "8px",
                  padding: "16px 20px",
                  fontFamily: "Pretendard",
                  fontWeight: 600,
                  fontSize: "16px",
                  lineHeight: "128%",
                  letterSpacing: "-0.02em",
                  resize: "vertical",
                }}
                data-testid="input-accident-description"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div
            className="flex items-center justify-end"
            style={{
              gap: "12px",
              padding: "20px 0",
            }}
          >
            <Button
              onClick={handleReset}
              variant="outline"
              style={{
                height: "56px",
                padding: "0 32px",
                fontFamily: "Pretendard",
                fontWeight: 600,
                fontSize: "16px",
                borderRadius: "8px",
              }}
              data-testid="button-reset"
            >
              초기화
            </Button>
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              variant="outline"
              style={{
                height: "56px",
                padding: "0 32px",
                fontFamily: "Pretendard",
                fontWeight: 600,
                fontSize: "16px",
                borderRadius: "8px",
              }}
              data-testid="button-save"
            >
              {saveMutation.isPending ? "저장 중..." : "저장"}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitMutation.isPending}
              style={{
                height: "56px",
                padding: "0 32px",
                background: "#008FED",
                color: "#FFFFFF",
                fontFamily: "Pretendard",
                fontWeight: 600,
                fontSize: "16px",
                borderRadius: "8px",
              }}
              data-testid="button-submit"
            >
              {submitMutation.isPending ? "접수 중..." : "접수완료"}
            </Button>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
