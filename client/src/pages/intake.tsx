import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { User } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { Star, Minus, Calendar, HelpCircle, ChevronDown } from "lucide-react";
import logoIcon from "@assets/Frame 2_1762217940686.png";

export default function Intake() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeMenu, setActiveMenu] = useState("접수하기");
  
  // Collapsible states
  const [basicInfoOpen, setBasicInfoOpen] = useState(true);
  const [insuranceInfoOpen, setInsuranceInfoOpen] = useState(true);
  const [clientInfoOpen, setClientInfoOpen] = useState(true);
  const [assessorInfoOpen, setAssessorInfoOpen] = useState(true);
  const [investigatorInfoOpen, setInvestigatorInfoOpen] = useState(true);
  const [insuredVictimInfoOpen, setInsuredVictimInfoOpen] = useState(true);
  
  const [sameAsPolicyHolder, setSameAsPolicyHolder] = useState(false);
  
  const { data: user, isLoading: userLoading } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  const { data: assessors } = useQuery<User[]>({
    queryKey: ["/api/users"],
    select: (users) => users.filter(u => u.role === "심사사"),
  });

  const [formData, setFormData] = useState({
    accidentDate: "",
    insuranceCompany: "",
    insurancePolicyNo: "",
    insuranceAccidentNo: "",
    clientResidence: "",
    clientDepartment: "",
    clientName: "",
    clientContact: "",
    assessorId: "",
    assessorDepartment: "",
    assessorTeam: "",
    assessorContact: "",
    investigatorTeam: "",
    investigatorDepartment: "",
    investigatorTeamName: "",
    investigatorContact: "",
    policyHolderName: "",
    policyHolderIdNumber: "",
    policyHolderAddress: "",
    insuredName: "",
    insuredIdNumber: "",
    insuredAddress: "",
    victimName: "",
    victimContact: "",
  });

  useEffect(() => {
    if (!userLoading && !user) {
      setLocation("/");
    }
  }, [user, userLoading, setLocation]);

  useEffect(() => {
    if (sameAsPolicyHolder) {
      setFormData((prev) => ({
        ...prev,
        insuredName: prev.policyHolderName,
        insuredIdNumber: prev.policyHolderIdNumber,
        insuredAddress: prev.policyHolderAddress,
      }));
    }
  }, [sameAsPolicyHolder, formData.policyHolderName, formData.policyHolderIdNumber, formData.policyHolderAddress]);

  const cleanFormData = (data: typeof formData) => {
    const cleaned: any = {};
    Object.entries(data).forEach(([key, value]) => {
      if (value !== "" && value !== null && value !== undefined) {
        cleaned[key] = value;
      }
    });
    return cleaned;
  };

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest("POST", "/api/cases", cleanFormData(data));
    },
    onSuccess: () => {
      toast({ description: "접수가 저장되었습니다.", duration: 2000 });
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
    },
    onError: (error: Error) => {
      toast({ description: error.message, variant: "destructive" });
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest("POST", "/api/cases", { ...cleanFormData(data), status: "제출" });
    },
    onSuccess: () => {
      toast({ 
        description: "접수가 완료되었습니다.",
        duration: 2000,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      setTimeout(() => {
        setLocation("/dashboard");
      }, 1000);
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
    // Validation: 접수일자 필수
    if (!formData.accidentDate) {
      toast({
        description: "접수일자를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }
    
    // Validation: 보험사 증권번호 또는 사고번호 중 하나 필수
    if (!formData.insuranceAccidentNo && !formData.insurancePolicyNo) {
      toast({
        description: "보험사 증권번호 또는 보험사 사고번호 중 하나는 반드시 입력해야 합니다.",
        variant: "destructive",
      });
      return;
    }
    
    // Validation: 보험계약자 또는 피보험자 중 하나의 성명 필수
    if (!formData.policyHolderName && !formData.insuredName) {
      toast({
        description: "보험계약자 성명 또는 피보험자 성명 중 하나는 반드시 입력해야 합니다.",
        variant: "destructive",
      });
      return;
    }
    
    submitMutation.mutate(formData);
  };

  const menuItems = [
    { name: "홈" },
    { name: "접수하기" },
    { name: "진행상황" },
    { name: "현장조사" },
    { name: "종합진행관리" },
    { name: "통계 및 정산" },
    { name: "관리자 설정" },
  ];

  if (userLoading || !user) {
    return null;
  }

  return (
    <div className="relative" style={{ minHeight: '100vh', background: 'linear-gradient(0deg, #E7EDFE, #E7EDFE)' }}>
      {/* Blur Background Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Ellipse 3 - Orange/Cream */}
        <div 
          className="absolute"
          style={{
            width: '1095px',
            height: '777px',
            left: '97px',
            bottom: '1169px',
            background: 'rgba(254, 240, 230, 0.4)',
            borderRadius: '9999px',
            filter: 'blur(212px)',
            transform: 'rotate(-35.25deg)',
          }}
        />
        {/* Ellipse 2 - Purple */}
        <div 
          className="absolute"
          style={{
            width: '1335px',
            height: '1323px',
            right: '0px',
            bottom: '0px',
            background: 'rgba(234, 230, 254, 0.5)',
            borderRadius: '9999px',
            filter: 'blur(212px)',
          }}
        />
        {/* Ellipse 4 - Purple Left */}
        <div 
          className="absolute"
          style={{
            width: '348px',
            height: '1323px',
            left: '0px',
            bottom: '189px',
            background: 'rgba(234, 230, 254, 0.5)',
            borderRadius: '9999px',
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
        <div className="flex items-center gap-2 w-[260px]">
          <img src={logoIcon} alt="FLOXN Logo" className="w-6 h-6" />
          <div className="text-2xl font-bold text-gray-900">FLOXN</div>
        </div>

        <div className="flex items-center gap-6 flex-1 px-6">
          {menuItems.map((item) => (
            <button
              key={item.name}
              onClick={() => {
                setActiveMenu(item.name);
                if (item.name === "홈") setLocation("/dashboard");
                else if (item.name === "관리자 설정") setLocation("/admin-settings");
                else if (item.name === "접수하기") setLocation("/intake");
              }}
              className="px-6 py-3 rounded-lg transition-colors"
              style={{
                fontFamily: 'Pretendard',
                fontSize: '18px',
                fontWeight: activeMenu === item.name ? 600 : 500,
                letterSpacing: '-0.02em',
                color: activeMenu === item.name ? '#0C0C0C' : 'rgba(12, 12, 12, 0.5)',
              }}
              data-testid={`menu-${item.name}`}
            >
              {item.name}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(0, 143, 237, 0.3)' }}
          />
          <span 
            style={{
              fontFamily: 'Pretendard',
              fontSize: '15px',
              fontWeight: 600,
              letterSpacing: '-0.02em',
              color: 'rgba(12, 12, 12, 0.7)',
            }}
            data-testid="user-info"
          >
            {user.username}
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative flex items-center justify-center" style={{ padding: '0 0 40px 0' }}>
        {/* 1660px Centered Container */}
        <div style={{ width: '1660px', marginTop: '89px' }}>
          {/* Page Title */}
          <div 
            className="flex items-center gap-4"
            style={{
              padding: '36px 32px',
              height: '82px',
            }}
          >
            <h1 
              style={{
                fontFamily: 'Pretendard',
                fontWeight: 600,
                fontSize: '26px',
                lineHeight: '128%',
                letterSpacing: '-0.02em',
                color: '#0C0C0C',
              }}
            >
              새로운 접수
            </h1>
            <Star className="w-5 h-5" style={{ color: 'rgba(12, 12, 12, 0.24)' }} data-testid="button-favorite" />
          </div>

          {/* Form Sections Container */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '1596px', margin: '0 32px' }}>
            
            {/* 1. 기본 정보 */}
            <div 
              style={{
                background: '#FFFFFF',
                boxShadow: '0px 0px 20px #DBE9F5',
                borderRadius: '12px',
                overflow: 'hidden',
              }}
            >
              <Collapsible open={basicInfoOpen} onOpenChange={setBasicInfoOpen}>
                <div 
                  className="flex items-center justify-between"
                  style={{
                    padding: '24px',
                    height: '82px',
                    borderBottom: '2px solid rgba(12, 12, 12, 0.1)',
                  }}
                >
                  <h2 
                    style={{
                      fontFamily: 'Pretendard',
                      fontWeight: 600,
                      fontSize: '24px',
                      lineHeight: '128%',
                      letterSpacing: '-0.02em',
                      color: '#0C0C0C',
                    }}
                  >
                    기본 정보
                  </h2>
                  <CollapsibleTrigger asChild>
                    <button 
                      className="w-[34px] h-[34px] flex items-center justify-center"
                      data-testid="button-toggle-basic-info"
                    >
                      <Minus className="w-4 h-4" style={{ color: '#008FED' }} />
                    </button>
                  </CollapsibleTrigger>
                </div>
                
                <CollapsibleContent>
                  <div style={{ padding: '16px 0 32px 0' }}>
                    {/* 2-column grid (768px each) */}
                    <div style={{ display: 'flex', gap: '20px', padding: '0 20px' }}>
                      {/* Column 1 */}
                      <div style={{ width: '768px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label 
                          style={{
                            fontFamily: 'Pretendard',
                            fontWeight: 500,
                            fontSize: '14px',
                            lineHeight: '128%',
                            letterSpacing: '-0.01em',
                            color: '#686A6E',
                          }}
                        >
                          접수번호
                        </label>
                        <div 
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '10px 20px',
                            height: '68px',
                            background: 'rgba(12, 12, 12, 0.04)',
                            borderRadius: '8px',
                          }}
                        >
                          <span 
                            style={{
                              fontFamily: 'Pretendard',
                              fontWeight: 600,
                              fontSize: '16px',
                              lineHeight: '128%',
                              letterSpacing: '-0.02em',
                              color: 'rgba(12, 12, 12, 0.4)',
                            }}
                          >
                            자동 생성
                          </span>
                        </div>
                      </div>

                      {/* Column 2 */}
                      <div style={{ width: '768px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label 
                          style={{
                            fontFamily: 'Pretendard',
                            fontWeight: 500,
                            fontSize: '14px',
                            lineHeight: '128%',
                            letterSpacing: '-0.01em',
                            color: '#686A6E',
                          }}
                        >
                          접수일자
                        </label>
                        <div className="relative">
                          <input
                            type="date"
                            value={formData.accidentDate}
                            onChange={(e) => handleInputChange("accidentDate", e.target.value)}
                            style={{
                              width: '768px',
                              height: '68px',
                              padding: '10px 20px',
                              background: 'rgba(12, 12, 12, 0.04)',
                              borderRadius: '8px',
                              border: 'none',
                              fontFamily: 'Pretendard',
                              fontWeight: 600,
                              fontSize: '16px',
                              letterSpacing: '-0.02em',
                              color: '#0C0C0C',
                            }}
                            data-testid="input-accident-date"
                          />
                          <Calendar 
                            className="absolute right-5 top-1/2 -translate-y-1/2 w-[30px] h-[30px] pointer-events-none"
                            style={{ color: 'rgba(12, 12, 12, 0.8)' }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            {/* 2. 보험 정보 */}
            <div 
              style={{
                background: '#FFFFFF',
                boxShadow: '0px 0px 20px #DBE9F5',
                borderRadius: '12px',
                overflow: 'hidden',
              }}
            >
              <Collapsible open={insuranceInfoOpen} onOpenChange={setInsuranceInfoOpen}>
                <div 
                  className="flex items-center justify-between"
                  style={{
                    padding: '24px',
                    height: '82px',
                    borderBottom: '2px solid rgba(12, 12, 12, 0.1)',
                  }}
                >
                  <h2 
                    style={{
                      fontFamily: 'Pretendard',
                      fontWeight: 600,
                      fontSize: '24px',
                      lineHeight: '128%',
                      letterSpacing: '-0.02em',
                      color: '#0C0C0C',
                    }}
                  >
                    보험 정보
                  </h2>
                  <CollapsibleTrigger asChild>
                    <button 
                      className="w-[34px] h-[34px] flex items-center justify-center"
                      data-testid="button-toggle-insurance-info"
                    >
                      <Minus className="w-4 h-4" style={{ color: '#008FED' }} />
                    </button>
                  </CollapsibleTrigger>
                </div>
                
                <CollapsibleContent>
                  <div style={{ padding: '16px 0 32px 0' }}>
                    {/* Subsection Header */}
                    <div style={{ padding: '24px 20px' }}>
                      <h3 
                        style={{
                          fontFamily: 'Pretendard',
                          fontWeight: 600,
                          fontSize: '20px',
                          lineHeight: '128%',
                          letterSpacing: '-0.02em',
                          color: 'rgba(12, 12, 12, 0.8)',
                          marginBottom: '8px',
                        }}
                      >
                        보험 정보
                      </h3>
                      <p 
                        style={{
                          fontFamily: 'Pretendard',
                          fontWeight: 500,
                          fontSize: '14px',
                          lineHeight: '128%',
                          letterSpacing: '-0.01em',
                          color: 'rgba(12, 12, 12, 0.5)',
                        }}
                      >
                        보험사 증권번호, 보험사 사고번호 중 한 가지는 반드시 기입해야 합니다.
                      </p>
                    </div>

                    {/* 3-column grid (505.33px each) */}
                    <div style={{ display: 'flex', gap: '20px', padding: '0 20px', marginBottom: '12px' }}>
                      {/* Column 1 - 보험사 */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label 
                          style={{
                            fontFamily: 'Pretendard',
                            fontWeight: 500,
                            fontSize: '14px',
                            lineHeight: '128%',
                            letterSpacing: '-0.01em',
                            color: '#686A6E',
                          }}
                        >
                          보험사
                        </label>
                        <Select 
                          value={formData.insuranceCompany} 
                          onValueChange={(value) => handleInputChange("insuranceCompany", value)}
                        >
                          <SelectTrigger 
                            style={{
                              height: '68px',
                              padding: '10px 20px',
                              background: '#FDFDFD',
                              border: '2px solid rgba(12, 12, 12, 0.08)',
                              borderRadius: '8px',
                              fontFamily: 'Pretendard',
                              fontWeight: 600,
                              fontSize: '16px',
                              letterSpacing: '-0.02em',
                            }}
                            data-testid="select-insurance-company"
                          >
                            <SelectValue placeholder="선택해주세요" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="삼성화재" data-testid="select-option-samsung">삼성화재</SelectItem>
                            <SelectItem value="현대해상" data-testid="select-option-hyundai">현대해상</SelectItem>
                            <SelectItem value="DB손해보험" data-testid="select-option-db">DB손해보험</SelectItem>
                            <SelectItem value="KB손해보험" data-testid="select-option-kb">KB손해보험</SelectItem>
                            <SelectItem value="메리츠화재" data-testid="select-option-meritz">메리츠화재</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Column 2 - 보험사 증권번호 */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label 
                          style={{
                            fontFamily: 'Pretendard',
                            fontWeight: 500,
                            fontSize: '14px',
                            lineHeight: '128%',
                            letterSpacing: '-0.01em',
                            color: '#686A6E',
                          }}
                        >
                          보험사 증권번호
                        </label>
                        <input
                          type="text"
                          placeholder="증권번호를 입력해주세요"
                          value={formData.insurancePolicyNo}
                          onChange={(e) => handleInputChange("insurancePolicyNo", e.target.value)}
                          style={{
                            height: '68px',
                            padding: '10px 20px',
                            background: '#FDFDFD',
                            border: '2px solid rgba(12, 12, 12, 0.08)',
                            borderRadius: '8px',
                            fontFamily: 'Pretendard',
                            fontWeight: 600,
                            fontSize: '16px',
                            letterSpacing: '-0.02em',
                            color: '#0C0C0C',
                          }}
                          data-testid="input-policy-number"
                        />
                      </div>

                      {/* Column 3 - 보험사 사고번호 */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label 
                          style={{
                            fontFamily: 'Pretendard',
                            fontWeight: 500,
                            fontSize: '14px',
                            lineHeight: '128%',
                            letterSpacing: '-0.01em',
                            color: '#686A6E',
                          }}
                        >
                          보험사 사고번호
                        </label>
                        <input
                          type="text"
                          placeholder="사고번호를 입력해주세요"
                          value={formData.insuranceAccidentNo}
                          onChange={(e) => handleInputChange("insuranceAccidentNo", e.target.value)}
                          style={{
                            height: '68px',
                            padding: '10px 20px',
                            background: '#FDFDFD',
                            border: '2px solid rgba(12, 12, 12, 0.08)',
                            borderRadius: '8px',
                            fontFamily: 'Pretendard',
                            fontWeight: 600,
                            fontSize: '16px',
                            letterSpacing: '-0.02em',
                            color: '#0C0C0C',
                          }}
                          data-testid="input-accident-number"
                        />
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            {/* 3. 의뢰자 정보 */}
            <div 
              style={{
                background: '#FFFFFF',
                boxShadow: '0px 0px 20px #DBE9F5',
                borderRadius: '12px',
                overflow: 'hidden',
              }}
            >
              <Collapsible open={clientInfoOpen} onOpenChange={setClientInfoOpen}>
                <div 
                  className="flex items-center justify-between"
                  style={{
                    padding: '24px',
                    height: '82px',
                    borderBottom: '2px solid rgba(12, 12, 12, 0.1)',
                  }}
                >
                  <h2 
                    style={{
                      fontFamily: 'Pretendard',
                      fontWeight: 600,
                      fontSize: '24px',
                      lineHeight: '128%',
                      letterSpacing: '-0.02em',
                      color: '#0C0C0C',
                    }}
                  >
                    의뢰자 정보
                  </h2>
                  <CollapsibleTrigger asChild>
                    <button 
                      className="w-[34px] h-[34px] flex items-center justify-center"
                      data-testid="button-toggle-client-info"
                    >
                      <Minus className="w-4 h-4" style={{ color: '#008FED' }} />
                    </button>
                  </CollapsibleTrigger>
                </div>
                
                <CollapsibleContent>
                  <div style={{ padding: '16px 0 32px 0' }}>
                    {/* Subsection Header */}
                    <div style={{ padding: '24px 20px' }}>
                      <h3 
                        style={{
                          fontFamily: 'Pretendard',
                          fontWeight: 600,
                          fontSize: '20px',
                          lineHeight: '128%',
                          letterSpacing: '-0.02em',
                          color: 'rgba(12, 12, 12, 0.8)',
                        }}
                      >
                        의뢰자 정보
                      </h3>
                    </div>

                    {/* 4-column grid (374px each) */}
                    <div style={{ display: 'flex', gap: '20px', padding: '0 20px', marginBottom: '12px' }}>
                      {/* Column 1 - 거주지 */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label 
                          style={{
                            fontFamily: 'Pretendard',
                            fontWeight: 500,
                            fontSize: '14px',
                            lineHeight: '128%',
                            letterSpacing: '-0.01em',
                            color: '#686A6E',
                          }}
                        >
                          거주지
                        </label>
                        <Select 
                          value={formData.clientResidence} 
                          onValueChange={(value) => handleInputChange("clientResidence", value)}
                        >
                          <SelectTrigger 
                            style={{
                              height: '68px',
                              padding: '10px 20px',
                              background: '#FDFDFD',
                              border: '2px solid rgba(12, 12, 12, 0.08)',
                              borderRadius: '8px',
                              fontFamily: 'Pretendard',
                              fontWeight: 600,
                              fontSize: '16px',
                              letterSpacing: '-0.02em',
                            }}
                            data-testid="select-client-residence"
                          >
                            <SelectValue placeholder="선택해주세요" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="서울" data-testid="select-option-seoul">서울</SelectItem>
                            <SelectItem value="경기" data-testid="select-option-gyeonggi">경기</SelectItem>
                            <SelectItem value="인천" data-testid="select-option-incheon">인천</SelectItem>
                            <SelectItem value="부산" data-testid="select-option-busan">부산</SelectItem>
                            <SelectItem value="대구" data-testid="select-option-daegu">대구</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Column 2 - 소속/시설 */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label 
                          style={{
                            fontFamily: 'Pretendard',
                            fontWeight: 500,
                            fontSize: '14px',
                            lineHeight: '128%',
                            letterSpacing: '-0.01em',
                            color: '#686A6E',
                          }}
                        >
                          소속/시설
                        </label>
                        <input
                          type="text"
                          placeholder="입력해주세요"
                          value={formData.clientDepartment}
                          onChange={(e) => handleInputChange("clientDepartment", e.target.value)}
                          style={{
                            height: '68px',
                            padding: '10px 20px',
                            background: '#FDFDFD',
                            border: '2px solid rgba(12, 12, 12, 0.08)',
                            borderRadius: '8px',
                            fontFamily: 'Pretendard',
                            fontWeight: 600,
                            fontSize: '16px',
                            letterSpacing: '-0.02em',
                            color: '#0C0C0C',
                          }}
                          data-testid="input-client-department"
                        />
                      </div>

                      {/* Column 3 - 의뢰자 */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label 
                          style={{
                            fontFamily: 'Pretendard',
                            fontWeight: 500,
                            fontSize: '14px',
                            lineHeight: '128%',
                            letterSpacing: '-0.01em',
                            color: '#686A6E',
                          }}
                        >
                          의뢰자
                        </label>
                        <input
                          type="text"
                          placeholder="성함을 입력해주세요"
                          value={formData.clientName}
                          onChange={(e) => handleInputChange("clientName", e.target.value)}
                          style={{
                            height: '68px',
                            padding: '10px 20px',
                            background: '#FDFDFD',
                            border: '2px solid rgba(12, 12, 12, 0.08)',
                            borderRadius: '8px',
                            fontFamily: 'Pretendard',
                            fontWeight: 600,
                            fontSize: '16px',
                            letterSpacing: '-0.02em',
                            color: '#0C0C0C',
                          }}
                          data-testid="input-client-name"
                        />
                      </div>

                      {/* Column 4 - 의뢰자 담당자 연락처 */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label 
                          style={{
                            fontFamily: 'Pretendard',
                            fontWeight: 500,
                            fontSize: '14px',
                            lineHeight: '128%',
                            letterSpacing: '-0.01em',
                            color: '#686A6E',
                          }}
                        >
                          의뢰자 담당자 연락처
                        </label>
                        <input
                          type="text"
                          placeholder="연락처를 입력해주세요"
                          value={formData.clientContact}
                          onChange={(e) => handleInputChange("clientContact", e.target.value)}
                          style={{
                            height: '68px',
                            padding: '10px 20px',
                            background: 'rgba(12, 12, 12, 0.04)',
                            borderRadius: '8px',
                            border: 'none',
                            fontFamily: 'Pretendard',
                            fontWeight: 600,
                            fontSize: '16px',
                            letterSpacing: '-0.02em',
                            color: '#0C0C0C',
                          }}
                          data-testid="input-client-contact"
                        />
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            {/* 4. 심사자 정보 */}
            <div 
              style={{
                background: '#FFFFFF',
                boxShadow: '0px 0px 20px #DBE9F5',
                borderRadius: '12px',
                overflow: 'hidden',
              }}
            >
              <Collapsible open={assessorInfoOpen} onOpenChange={setAssessorInfoOpen}>
                <div 
                  className="flex items-center justify-between"
                  style={{
                    padding: '24px',
                    height: '82px',
                    borderBottom: '2px solid rgba(12, 12, 12, 0.1)',
                  }}
                >
                  <h2 
                    style={{
                      fontFamily: 'Pretendard',
                      fontWeight: 600,
                      fontSize: '24px',
                      lineHeight: '128%',
                      letterSpacing: '-0.02em',
                      color: '#0C0C0C',
                    }}
                  >
                    심사자 정보
                  </h2>
                  <CollapsibleTrigger asChild>
                    <button 
                      className="w-[34px] h-[34px] flex items-center justify-center"
                      data-testid="button-toggle-assessor-info"
                    >
                      <Minus className="w-4 h-4" style={{ color: '#008FED' }} />
                    </button>
                  </CollapsibleTrigger>
                </div>
                
                <CollapsibleContent>
                  <div style={{ padding: '16px 0 32px 0' }}>
                    {/* Subsection Header */}
                    <div style={{ padding: '24px 20px' }}>
                      <h3 
                        style={{
                          fontFamily: 'Pretendard',
                          fontWeight: 600,
                          fontSize: '20px',
                          lineHeight: '128%',
                          letterSpacing: '-0.02em',
                          color: 'rgba(12, 12, 12, 0.8)',
                        }}
                      >
                        심사자 정보
                      </h3>
                    </div>

                    {/* 4-column grid */}
                    <div style={{ display: 'flex', gap: '20px', padding: '0 20px' }}>
                      {/* Column 1 - 심사자 */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label 
                          style={{
                            fontFamily: 'Pretendard',
                            fontWeight: 500,
                            fontSize: '14px',
                            lineHeight: '128%',
                            letterSpacing: '-0.01em',
                            color: '#686A6E',
                          }}
                        >
                          심사자
                        </label>
                        <Select 
                          value={formData.assessorId} 
                          onValueChange={(value) => handleInputChange("assessorId", value)}
                        >
                          <SelectTrigger 
                            style={{
                              height: '68px',
                              padding: '10px 20px',
                              background: '#FDFDFD',
                              border: '2px solid rgba(12, 12, 12, 0.08)',
                              borderRadius: '8px',
                              fontFamily: 'Pretendard',
                              fontWeight: 600,
                              fontSize: '16px',
                              letterSpacing: '-0.02em',
                            }}
                            data-testid="select-assessor"
                          >
                            <SelectValue placeholder="선택해주세요" />
                          </SelectTrigger>
                          <SelectContent>
                            {assessors?.map((assessor) => (
                              <SelectItem 
                                key={assessor.id} 
                                value={assessor.id}
                                data-testid={`select-option-assessor-${assessor.id}`}
                              >
                                {assessor.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Column 2 - 소속/시설 */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label 
                          style={{
                            fontFamily: 'Pretendard',
                            fontWeight: 500,
                            fontSize: '14px',
                            lineHeight: '128%',
                            letterSpacing: '-0.01em',
                            color: '#686A6E',
                          }}
                        >
                          소속/시설
                        </label>
                        <input
                          type="text"
                          placeholder="입력해주세요"
                          value={formData.assessorDepartment}
                          onChange={(e) => handleInputChange("assessorDepartment", e.target.value)}
                          style={{
                            height: '68px',
                            padding: '10px 20px',
                            background: '#FDFDFD',
                            border: '2px solid rgba(12, 12, 12, 0.08)',
                            borderRadius: '8px',
                            fontFamily: 'Pretendard',
                            fontWeight: 600,
                            fontSize: '16px',
                            letterSpacing: '-0.02em',
                            color: '#0C0C0C',
                          }}
                          data-testid="input-assessor-department"
                        />
                      </div>

                      {/* Column 3 - 심사팀 */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label 
                          style={{
                            fontFamily: 'Pretendard',
                            fontWeight: 500,
                            fontSize: '14px',
                            lineHeight: '128%',
                            letterSpacing: '-0.01em',
                            color: '#686A6E',
                          }}
                        >
                          심사팀
                        </label>
                        <input
                          type="text"
                          placeholder="입력해주세요"
                          value={formData.assessorTeam}
                          onChange={(e) => handleInputChange("assessorTeam", e.target.value)}
                          style={{
                            height: '68px',
                            padding: '10px 20px',
                            background: '#FDFDFD',
                            border: '2px solid rgba(12, 12, 12, 0.08)',
                            borderRadius: '8px',
                            fontFamily: 'Pretendard',
                            fontWeight: 600,
                            fontSize: '16px',
                            letterSpacing: '-0.02em',
                            color: '#0C0C0C',
                          }}
                          data-testid="input-assessor-team"
                        />
                      </div>

                      {/* Column 4 - 심사자 연락처 */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label 
                          style={{
                            fontFamily: 'Pretendard',
                            fontWeight: 500,
                            fontSize: '14px',
                            lineHeight: '128%',
                            letterSpacing: '-0.01em',
                            color: '#686A6E',
                          }}
                        >
                          심사자 연락처
                        </label>
                        <input
                          type="text"
                          placeholder="연락처를 입력해주세요"
                          value={formData.assessorContact}
                          onChange={(e) => handleInputChange("assessorContact", e.target.value)}
                          style={{
                            height: '68px',
                            padding: '10px 20px',
                            background: 'rgba(12, 12, 12, 0.04)',
                            borderRadius: '8px',
                            border: 'none',
                            fontFamily: 'Pretendard',
                            fontWeight: 600,
                            fontSize: '16px',
                            letterSpacing: '-0.02em',
                            color: '#0C0C0C',
                          }}
                          data-testid="input-assessor-contact"
                        />
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            {/* 5. 조사자 정보 */}
            <div 
              style={{
                background: '#FFFFFF',
                boxShadow: '0px 0px 20px #DBE9F5',
                borderRadius: '12px',
                overflow: 'hidden',
              }}
            >
              <Collapsible open={investigatorInfoOpen} onOpenChange={setInvestigatorInfoOpen}>
                <div 
                  className="flex items-center justify-between"
                  style={{
                    padding: '24px',
                    height: '82px',
                    borderBottom: '2px solid rgba(12, 12, 12, 0.1)',
                  }}
                >
                  <h2 
                    style={{
                      fontFamily: 'Pretendard',
                      fontWeight: 600,
                      fontSize: '24px',
                      lineHeight: '128%',
                      letterSpacing: '-0.02em',
                      color: '#0C0C0C',
                    }}
                  >
                    조사자 정보
                  </h2>
                  <CollapsibleTrigger asChild>
                    <button 
                      className="w-[34px] h-[34px] flex items-center justify-center"
                      data-testid="button-toggle-investigator-info"
                    >
                      <Minus className="w-4 h-4" style={{ color: '#008FED' }} />
                    </button>
                  </CollapsibleTrigger>
                </div>
                
                <CollapsibleContent>
                  <div style={{ padding: '16px 0 32px 0' }}>
                    {/* Subsection Header */}
                    <div style={{ padding: '24px 20px' }}>
                      <h3 
                        style={{
                          fontFamily: 'Pretendard',
                          fontWeight: 600,
                          fontSize: '20px',
                          lineHeight: '128%',
                          letterSpacing: '-0.02em',
                          color: 'rgba(12, 12, 12, 0.8)',
                        }}
                      >
                        조사자 정보
                      </h3>
                    </div>

                    {/* 4-column grid */}
                    <div style={{ display: 'flex', gap: '20px', padding: '0 20px' }}>
                      {/* Column 1 - 순서팀 */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label 
                          style={{
                            fontFamily: 'Pretendard',
                            fontWeight: 500,
                            fontSize: '14px',
                            lineHeight: '128%',
                            letterSpacing: '-0.01em',
                            color: '#686A6E',
                          }}
                        >
                          순서팀
                        </label>
                        <input
                          type="text"
                          placeholder="입력해주세요"
                          value={formData.investigatorTeam}
                          onChange={(e) => handleInputChange("investigatorTeam", e.target.value)}
                          style={{
                            height: '68px',
                            padding: '10px 20px',
                            background: '#FDFDFD',
                            border: '2px solid rgba(12, 12, 12, 0.08)',
                            borderRadius: '8px',
                            fontFamily: 'Pretendard',
                            fontWeight: 600,
                            fontSize: '16px',
                            letterSpacing: '-0.02em',
                            color: '#0C0C0C',
                          }}
                          data-testid="input-investigator-team"
                        />
                      </div>

                      {/* Column 2 - 소속/부서 */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label 
                          style={{
                            fontFamily: 'Pretendard',
                            fontWeight: 500,
                            fontSize: '14px',
                            lineHeight: '128%',
                            letterSpacing: '-0.01em',
                            color: '#686A6E',
                          }}
                        >
                          소속/부서
                        </label>
                        <input
                          type="text"
                          placeholder="입력해주세요"
                          value={formData.investigatorDepartment}
                          onChange={(e) => handleInputChange("investigatorDepartment", e.target.value)}
                          style={{
                            height: '68px',
                            padding: '10px 20px',
                            background: '#FDFDFD',
                            border: '2px solid rgba(12, 12, 12, 0.08)',
                            borderRadius: '8px',
                            fontFamily: 'Pretendard',
                            fontWeight: 600,
                            fontSize: '16px',
                            letterSpacing: '-0.02em',
                            color: '#0C0C0C',
                          }}
                          data-testid="input-investigator-department"
                        />
                      </div>

                      {/* Column 3 - 조사팀 */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label 
                          style={{
                            fontFamily: 'Pretendard',
                            fontWeight: 500,
                            fontSize: '14px',
                            lineHeight: '128%',
                            letterSpacing: '-0.01em',
                            color: '#686A6E',
                          }}
                        >
                          조사팀
                        </label>
                        <input
                          type="text"
                          placeholder="입력해주세요"
                          value={formData.investigatorTeamName}
                          onChange={(e) => handleInputChange("investigatorTeamName", e.target.value)}
                          style={{
                            height: '68px',
                            padding: '10px 20px',
                            background: '#FDFDFD',
                            border: '2px solid rgba(12, 12, 12, 0.08)',
                            borderRadius: '8px',
                            fontFamily: 'Pretendard',
                            fontWeight: 600,
                            fontSize: '16px',
                            letterSpacing: '-0.02em',
                            color: '#0C0C0C',
                          }}
                          data-testid="input-investigator-team-name"
                        />
                      </div>

                      {/* Column 4 - 조사자 연락처 */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label 
                          style={{
                            fontFamily: 'Pretendard',
                            fontWeight: 500,
                            fontSize: '14px',
                            lineHeight: '128%',
                            letterSpacing: '-0.01em',
                            color: '#686A6E',
                          }}
                        >
                          조사자 연락처
                        </label>
                        <input
                          type="text"
                          placeholder="연락처를 입력해주세요"
                          value={formData.investigatorContact}
                          onChange={(e) => handleInputChange("investigatorContact", e.target.value)}
                          style={{
                            height: '68px',
                            padding: '10px 20px',
                            background: 'rgba(12, 12, 12, 0.04)',
                            borderRadius: '8px',
                            border: 'none',
                            fontFamily: 'Pretendard',
                            fontWeight: 600,
                            fontSize: '16px',
                            letterSpacing: '-0.02em',
                            color: '#0C0C0C',
                          }}
                          data-testid="input-investigator-contact"
                        />
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            {/* 6. 피보험자 및 피해자 정보 - To be continued in next section */}
            <div 
              style={{
                background: '#FFFFFF',
                boxShadow: '0px 0px 20px #DBE9F5',
                borderRadius: '12px',
                overflow: 'hidden',
              }}
            >
              <Collapsible open={insuredVictimInfoOpen} onOpenChange={setInsuredVictimInfoOpen}>
                <div 
                  className="flex items-center justify-between"
                  style={{
                    padding: '24px',
                    height: '82px',
                    borderBottom: '2px solid rgba(12, 12, 12, 0.1)',
                  }}
                >
                  <h2 
                    style={{
                      fontFamily: 'Pretendard',
                      fontWeight: 600,
                      fontSize: '24px',
                      lineHeight: '128%',
                      letterSpacing: '-0.02em',
                      color: '#0C0C0C',
                    }}
                  >
                    피보험자 및 피해자 정보
                  </h2>
                  <CollapsibleTrigger asChild>
                    <button 
                      className="w-[34px] h-[34px] flex items-center justify-center"
                      data-testid="button-toggle-insured-victim-info"
                    >
                      <Minus className="w-4 h-4" style={{ color: '#008FED' }} />
                    </button>
                  </CollapsibleTrigger>
                </div>
                
                <CollapsibleContent>
                  <div style={{ padding: '16px 0 32px 0' }}>
                    {/* Subsection 1: 보험계약자 및 피보험자 정보 */}
                    <div style={{ padding: '24px 20px' }}>
                      <h3 
                        style={{
                          fontFamily: 'Pretendard',
                          fontWeight: 600,
                          fontSize: '20px',
                          lineHeight: '128%',
                          letterSpacing: '-0.02em',
                          color: 'rgba(12, 12, 12, 0.8)',
                          marginBottom: '8px',
                        }}
                      >
                        보험계약자 및 피보험자 정보
                      </h3>
                      <p 
                        style={{
                          fontFamily: 'Pretendard',
                          fontWeight: 500,
                          fontSize: '14px',
                          lineHeight: '128%',
                          letterSpacing: '-0.01em',
                          color: 'rgba(12, 12, 12, 0.5)',
                        }}
                      >
                        보험 계약자, 피보험자 중 한 가지는 반드시 기입해야 합니다.
                      </p>
                    </div>

                    {/* Checkbox: 보험계약자 = 피보험자 */}
                    <div style={{ padding: '0 20px', marginBottom: '20px' }}>
                      <div className="flex items-center gap-2">
                        <Checkbox 
                          id="same-as-policy-holder"
                          checked={sameAsPolicyHolder}
                          onCheckedChange={(checked) => setSameAsPolicyHolder(checked as boolean)}
                          data-testid="checkbox-same-as-policy-holder"
                        />
                        <label 
                          htmlFor="same-as-policy-holder"
                          style={{
                            fontFamily: 'Pretendard',
                            fontWeight: 500,
                            fontSize: '16px',
                            letterSpacing: '-0.02em',
                            color: '#0C0C0C',
                            cursor: 'pointer',
                          }}
                        >
                          보험계약자 = 피보험자
                        </label>
                      </div>
                    </div>

                    {/* 3-column grid for policy holder & insured */}
                    <div style={{ display: 'flex', gap: '20px', padding: '0 20px', marginBottom: '20px' }}>
                      {/* Policy Holder Name */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label 
                          style={{
                            fontFamily: 'Pretendard',
                            fontWeight: 500,
                            fontSize: '14px',
                            lineHeight: '128%',
                            letterSpacing: '-0.01em',
                            color: '#686A6E',
                          }}
                        >
                          보험계약자 성명
                        </label>
                        <input
                          type="text"
                          placeholder="성함을 입력해주세요"
                          value={formData.policyHolderName}
                          onChange={(e) => handleInputChange("policyHolderName", e.target.value)}
                          style={{
                            height: '68px',
                            padding: '10px 20px',
                            background: '#FDFDFD',
                            border: '2px solid rgba(12, 12, 12, 0.08)',
                            borderRadius: '8px',
                            fontFamily: 'Pretendard',
                            fontWeight: 600,
                            fontSize: '16px',
                            letterSpacing: '-0.02em',
                            color: '#0C0C0C',
                          }}
                          data-testid="input-policy-holder-name"
                        />
                      </div>

                      {/* Policy Holder ID */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label 
                          style={{
                            fontFamily: 'Pretendard',
                            fontWeight: 500,
                            fontSize: '14px',
                            lineHeight: '128%',
                            letterSpacing: '-0.01em',
                            color: '#686A6E',
                          }}
                        >
                          보험계약자 주민등록번호
                        </label>
                        <input
                          type="text"
                          placeholder="주민등록번호를 입력해주세요"
                          value={formData.policyHolderIdNumber}
                          onChange={(e) => handleInputChange("policyHolderIdNumber", e.target.value)}
                          style={{
                            height: '68px',
                            padding: '10px 20px',
                            background: '#FDFDFD',
                            border: '2px solid rgba(12, 12, 12, 0.08)',
                            borderRadius: '8px',
                            fontFamily: 'Pretendard',
                            fontWeight: 600,
                            fontSize: '16px',
                            letterSpacing: '-0.02em',
                            color: '#0C0C0C',
                          }}
                          data-testid="input-policy-holder-id"
                        />
                      </div>

                      {/* Policy Holder Address */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label 
                          style={{
                            fontFamily: 'Pretendard',
                            fontWeight: 500,
                            fontSize: '14px',
                            lineHeight: '128%',
                            letterSpacing: '-0.01em',
                            color: '#686A6E',
                          }}
                        >
                          보험계약자 주소
                        </label>
                        <input
                          type="text"
                          placeholder="주소를 입력해주세요"
                          value={formData.policyHolderAddress}
                          onChange={(e) => handleInputChange("policyHolderAddress", e.target.value)}
                          style={{
                            height: '68px',
                            padding: '10px 20px',
                            background: '#FDFDFD',
                            border: '2px solid rgba(12, 12, 12, 0.08)',
                            borderRadius: '8px',
                            fontFamily: 'Pretendard',
                            fontWeight: 600,
                            fontSize: '16px',
                            letterSpacing: '-0.02em',
                            color: '#0C0C0C',
                          }}
                          data-testid="input-policy-holder-address"
                        />
                      </div>
                    </div>

                    {/* Insured Info */}
                    <div style={{ display: 'flex', gap: '20px', padding: '0 20px', marginBottom: '20px' }}>
                      {/* Insured Name */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label 
                          style={{
                            fontFamily: 'Pretendard',
                            fontWeight: 500,
                            fontSize: '14px',
                            lineHeight: '128%',
                            letterSpacing: '-0.01em',
                            color: '#686A6E',
                          }}
                        >
                          피보험자 성명
                        </label>
                        <input
                          type="text"
                          placeholder="성함을 입력해주세요"
                          value={formData.insuredName}
                          onChange={(e) => handleInputChange("insuredName", e.target.value)}
                          style={{
                            height: '68px',
                            padding: '10px 20px',
                            background: '#FDFDFD',
                            border: '2px solid rgba(12, 12, 12, 0.08)',
                            borderRadius: '8px',
                            fontFamily: 'Pretendard',
                            fontWeight: 600,
                            fontSize: '16px',
                            letterSpacing: '-0.02em',
                            color: '#0C0C0C',
                          }}
                          data-testid="input-insured-name"
                        />
                      </div>

                      {/* Insured ID */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label 
                          style={{
                            fontFamily: 'Pretendard',
                            fontWeight: 500,
                            fontSize: '14px',
                            lineHeight: '128%',
                            letterSpacing: '-0.01em',
                            color: '#686A6E',
                          }}
                        >
                          피보험자 주민등록번호
                        </label>
                        <input
                          type="text"
                          placeholder="주민등록번호를 입력해주세요"
                          value={formData.insuredIdNumber}
                          onChange={(e) => handleInputChange("insuredIdNumber", e.target.value)}
                          style={{
                            height: '68px',
                            padding: '10px 20px',
                            background: '#FDFDFD',
                            border: '2px solid rgba(12, 12, 12, 0.08)',
                            borderRadius: '8px',
                            fontFamily: 'Pretendard',
                            fontWeight: 600,
                            fontSize: '16px',
                            letterSpacing: '-0.02em',
                            color: '#0C0C0C',
                          }}
                          data-testid="input-insured-id"
                        />
                      </div>

                      {/* Insured Address */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label 
                          style={{
                            fontFamily: 'Pretendard',
                            fontWeight: 500,
                            fontSize: '14px',
                            lineHeight: '128%',
                            letterSpacing: '-0.01em',
                            color: '#686A6E',
                          }}
                        >
                          피보험자 주소
                        </label>
                        <input
                          type="text"
                          placeholder="주소를 입력해주세요"
                          value={formData.insuredAddress}
                          onChange={(e) => handleInputChange("insuredAddress", e.target.value)}
                          style={{
                            height: '68px',
                            padding: '10px 20px',
                            background: '#FDFDFD',
                            border: '2px solid rgba(12, 12, 12, 0.08)',
                            borderRadius: '8px',
                            fontFamily: 'Pretendard',
                            fontWeight: 600,
                            fontSize: '16px',
                            letterSpacing: '-0.02em',
                            color: '#0C0C0C',
                          }}
                          data-testid="input-insured-address"
                        />
                      </div>
                    </div>

                    {/* Subsection 2: 피해자 정보 */}
                    <div style={{ padding: '24px 20px 12px 20px' }}>
                      <h3 
                        style={{
                          fontFamily: 'Pretendard',
                          fontWeight: 600,
                          fontSize: '20px',
                          lineHeight: '128%',
                          letterSpacing: '-0.02em',
                          color: 'rgba(12, 12, 12, 0.8)',
                        }}
                      >
                        피해자 정보
                      </h3>
                    </div>

                    {/* 2-column grid for victim */}
                    <div style={{ display: 'flex', gap: '20px', padding: '0 20px' }}>
                      {/* Victim Name */}
                      <div style={{ width: '768px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label 
                          style={{
                            fontFamily: 'Pretendard',
                            fontWeight: 500,
                            fontSize: '14px',
                            lineHeight: '128%',
                            letterSpacing: '-0.01em',
                            color: '#686A6E',
                          }}
                        >
                          피해자 성명
                        </label>
                        <input
                          type="text"
                          placeholder="성함을 입력해주세요"
                          value={formData.victimName}
                          onChange={(e) => handleInputChange("victimName", e.target.value)}
                          style={{
                            height: '68px',
                            padding: '10px 20px',
                            background: '#FDFDFD',
                            border: '2px solid rgba(12, 12, 12, 0.08)',
                            borderRadius: '8px',
                            fontFamily: 'Pretendard',
                            fontWeight: 600,
                            fontSize: '16px',
                            letterSpacing: '-0.02em',
                            color: '#0C0C0C',
                          }}
                          data-testid="input-victim-name"
                        />
                      </div>

                      {/* Victim Contact */}
                      <div style={{ width: '768px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label 
                          style={{
                            fontFamily: 'Pretendard',
                            fontWeight: 500,
                            fontSize: '14px',
                            lineHeight: '128%',
                            letterSpacing: '-0.01em',
                            color: '#686A6E',
                          }}
                        >
                          피해자 연락처
                        </label>
                        <input
                          type="text"
                          placeholder="연락처를 입력해주세요"
                          value={formData.victimContact}
                          onChange={(e) => handleInputChange("victimContact", e.target.value)}
                          style={{
                            height: '68px',
                            padding: '10px 20px',
                            background: '#FDFDFD',
                            border: '2px solid rgba(12, 12, 12, 0.08)',
                            borderRadius: '8px',
                            fontFamily: 'Pretendard',
                            fontWeight: 600,
                            fontSize: '16px',
                            letterSpacing: '-0.02em',
                            color: '#0C0C0C',
                          }}
                          data-testid="input-victim-contact"
                        />
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>

          {/* Bottom Action Buttons */}
          <div 
            className="flex items-center justify-between"
            style={{ 
              width: '1596px', 
              margin: '32px 32px 0 32px',
              padding: '0 20px',
            }}
          >
            <Button
              variant="outline"
              onClick={handleSave}
              disabled={saveMutation.isPending}
              style={{
                height: '56px',
                padding: '0 32px',
                fontFamily: 'Pretendard',
                fontWeight: 600,
                fontSize: '18px',
                letterSpacing: '-0.02em',
                background: '#FFFFFF',
                border: '2px solid rgba(12, 12, 12, 0.1)',
                borderRadius: '8px',
                color: '#0C0C0C',
              }}
              data-testid="button-save"
            >
              조회
            </Button>
            
            <Button
              onClick={handleSubmit}
              disabled={submitMutation.isPending}
              style={{
                height: '56px',
                padding: '0 48px',
                fontFamily: 'Pretendard',
                fontWeight: 600,
                fontSize: '18px',
                letterSpacing: '-0.02em',
                background: '#008FED',
                color: '#FFFFFF',
                borderRadius: '8px',
                border: 'none',
              }}
              data-testid="button-submit"
            >
              새로운 접수
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
