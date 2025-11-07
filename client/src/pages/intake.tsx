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
  
  // Collapsible states - 3 main sections
  const [basicInfoOpen, setBasicInfoOpen] = useState(true);
  const [insuredVictimInfoOpen, setInsuredVictimInfoOpen] = useState(true);
  const [accidentDamageInfoOpen, setAccidentDamageInfoOpen] = useState(true);
  
  const [sameAsPolicyHolder, setSameAsPolicyHolder] = useState(false);
  const [damagePreventionCost, setDamagePreventionCost] = useState(false);
  const [victimIncidentAssistance, setVictimIncidentAssistance] = useState(false);
  
  // 피해사항 등록 항목들
  const [damageItems, setDamageItems] = useState<Array<{
    item: string;
    type: string;
    quantity: string;
    details: string;
  }>>([]);
  
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
    insuredContact: "",
    insuredAddress: "",
    victimName: "",
    victimContact: "",
    // 사고 및 피해사항
    accidentType: "",
    accidentCause: "",
    restorationMethod: "",
    otherVendorEstimate: "",
    accidentDescription: "",
    damageItem: "",
    damageType: "",
    damageQuantity: "",
    damageDetails: "",
    assignedPartner: "",
    assignedPartnerManager: "",
    assignedPartnerContact: "",
    location: "",
    specialRequests: "",
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
      }));
    }
  }, [sameAsPolicyHolder, formData.policyHolderName]);

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

  const handleAddDamageItem = () => {
    if (formData.damageItem && formData.damageType) {
      setDamageItems([...damageItems, {
        item: formData.damageItem,
        type: formData.damageType,
        quantity: formData.damageQuantity || '0',
        details: formData.damageDetails,
      }]);
      // Clear fields after adding
      setFormData(prev => ({
        ...prev,
        damageItem: '',
        damageType: '',
        damageQuantity: '',
        damageDetails: '',
      }));
    }
  };

  const handleRemoveDamageItem = (index: number) => {
    setDamageItems(damageItems.filter((_, i) => i !== index));
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', width: '1596px', margin: '0 32px' }}>
            
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
                    {/* Row 1: 접수번호, 접수일자 (2-column) */}
                    <div style={{ display: 'flex', gap: '20px', padding: '0 20px', marginBottom: '32px' }}>
                      {/* Column 1 - 접수번호 */}
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

                      {/* Column 2 - 접수일자 */}
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

                    {/* Subsection: 보험 정보 */}
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

                    {/* 보험 정보 3-column */}
                    <div style={{ display: 'flex', gap: '20px', padding: '0 20px', marginBottom: '32px' }}>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{fontFamily: 'Pretendard',fontWeight: 500,fontSize: '14px',lineHeight: '128%',letterSpacing: '-0.01em',color: '#686A6E'}}>보험사</label>
                        <Select value={formData.insuranceCompany} onValueChange={(value) => handleInputChange("insuranceCompany", value)}>
                          <SelectTrigger style={{height: '68px',padding: '10px 20px',background: '#FDFDFD',border: '2px solid rgba(12, 12, 12, 0.08)',borderRadius: '8px',fontFamily: 'Pretendard',fontWeight: 600,fontSize: '16px',letterSpacing: '-0.02em'}} data-testid="select-insurance-company">
                            <SelectValue placeholder="보험사 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            {["삼성화재", "현대해상", "DB손해보험", "KB손해보험", "메리츠화재"].map((company) => (
                              <SelectItem key={company} value={company} data-testid={`select-option-insurance-company-${company}`}>{company}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{fontFamily: 'Pretendard',fontWeight: 500,fontSize: '14px',lineHeight: '128%',letterSpacing: '-0.01em',color: '#686A6E'}}>보험사 증권번호</label>
                        <input type="text" placeholder="증권번호 입력" value={formData.insurancePolicyNo} onChange={(e) => handleInputChange("insurancePolicyNo", e.target.value)} style={{height: '68px',padding: '10px 20px',background: '#FDFDFD',border: '2px solid rgba(12, 12, 12, 0.08)',borderRadius: '8px',fontFamily: 'Pretendard',fontWeight: 600,fontSize: '16px',letterSpacing: '-0.02em',color: '#0C0C0C'}} data-testid="input-insurance-policy-no" />
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{fontFamily: 'Pretendard',fontWeight: 500,fontSize: '14px',lineHeight: '128%',letterSpacing: '-0.01em',color: '#686A6E'}}>보험사 사고번호</label>
                        <input type="text" placeholder="사고번호 입력" value={formData.insuranceAccidentNo} onChange={(e) => handleInputChange("insuranceAccidentNo", e.target.value)} style={{height: '68px',padding: '10px 20px',background: '#FDFDFD',border: '2px solid rgba(12, 12, 12, 0.08)',borderRadius: '8px',fontFamily: 'Pretendard',fontWeight: 600,fontSize: '16px',letterSpacing: '-0.02em',color: '#0C0C0C'}} data-testid="input-insurance-accident-no" />
                      </div>
                    </div>

                    {/* Subsection: 의뢰자 정보 */}
                    <div style={{ padding: '24px 20px 12px 20px' }}>
                      <h3 style={{fontFamily: 'Pretendard',fontWeight: 600,fontSize: '20px',lineHeight: '128%',letterSpacing: '-0.02em',color: 'rgba(12, 12, 12, 0.8)'}}>의뢰자 정보</h3>
                    </div>

                    {/* 의뢰자 정보 4-column */}
                    <div style={{ display: 'flex', gap: '20px', padding: '0 20px', marginBottom: '32px' }}>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{fontFamily: 'Pretendard',fontWeight: 500,fontSize: '14px',lineHeight: '128%',letterSpacing: '-0.01em',color: '#686A6E'}}>의뢰자</label>
                        <Select value={formData.clientResidence} onValueChange={(value) => handleInputChange("clientResidence", value)}>
                          <SelectTrigger style={{height: '68px',padding: '10px 20px',background: '#FDFDFD',border: '2px solid rgba(12, 12, 12, 0.08)',borderRadius: '8px',fontFamily: 'Pretendard',fontWeight: 600,fontSize: '16px',letterSpacing: '-0.02em'}} data-testid="select-client-residence">
                            <SelectValue placeholder="의뢰자 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            {["서울", "경기", "인천", "부산", "대구"].map((region) => (
                              <SelectItem key={region} value={region} data-testid={`select-option-client-residence-${region}`}>{region}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{fontFamily: 'Pretendard',fontWeight: 500,fontSize: '14px',lineHeight: '128%',letterSpacing: '-0.01em',color: '#686A6E'}}>소속/시설</label>
                        <input type="text" placeholder="소속/시설" value={formData.clientDepartment} onChange={(e) => handleInputChange("clientDepartment", e.target.value)} style={{height: '68px',padding: '10px 20px',background: '#FDFDFD',border: '2px solid rgba(12, 12, 12, 0.08)',borderRadius: '8px',fontFamily: 'Pretendard',fontWeight: 600,fontSize: '16px',letterSpacing: '-0.02em',color: '#0C0C0C'}} data-testid="input-client-department" />
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{fontFamily: 'Pretendard',fontWeight: 500,fontSize: '14px',lineHeight: '128%',letterSpacing: '-0.01em',color: '#686A6E'}}>의뢰자</label>
                        <input type="text" placeholder="성함을 입력해주세요" value={formData.clientName} onChange={(e) => handleInputChange("clientName", e.target.value)} style={{height: '68px',padding: '10px 20px',background: '#FDFDFD',border: '2px solid rgba(12, 12, 12, 0.08)',borderRadius: '8px',fontFamily: 'Pretendard',fontWeight: 600,fontSize: '16px',letterSpacing: '-0.02em',color: '#0C0C0C'}} data-testid="input-client-name" />
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{fontFamily: 'Pretendard',fontWeight: 500,fontSize: '14px',lineHeight: '128%',letterSpacing: '-0.01em',color: '#686A6E'}}>의뢰자 담당자 연락처</label>
                        <input type="text" placeholder="연락처를 입력해주세요" value={formData.clientContact} onChange={(e) => handleInputChange("clientContact", e.target.value)} style={{height: '68px',padding: '10px 20px',background: 'rgba(12, 12, 12, 0.04)',borderRadius: '8px',border: 'none',fontFamily: 'Pretendard',fontWeight: 600,fontSize: '16px',letterSpacing: '-0.02em',color: '#0C0C0C'}} data-testid="input-client-contact" />
                      </div>
                    </div>

                    {/* Subsection: 심사자 정보 */}
                    <div style={{ padding: '24px 20px 12px 20px' }}>
                      <h3 style={{fontFamily: 'Pretendard',fontWeight: 600,fontSize: '20px',lineHeight: '128%',letterSpacing: '-0.02em',color: 'rgba(12, 12, 12, 0.8)'}}>심사자 정보</h3>
                    </div>

                    {/* 심사자 정보 4-column */}
                    <div style={{ display: 'flex', gap: '20px', padding: '0 20px', marginBottom: '32px' }}>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{fontFamily: 'Pretendard',fontWeight: 500,fontSize: '14px',lineHeight: '128%',letterSpacing: '-0.01em',color: '#686A6E'}}>심사자</label>
                        <Select value={formData.assessorId} onValueChange={(value) => handleInputChange("assessorId", value)}>
                          <SelectTrigger style={{height: '68px',padding: '10px 20px',background: '#FDFDFD',border: '2px solid rgba(12, 12, 12, 0.08)',borderRadius: '8px',fontFamily: 'Pretendard',fontWeight: 600,fontSize: '16px',letterSpacing: '-0.02em'}} data-testid="select-assessor">
                            <SelectValue placeholder="선택해주세요" />
                          </SelectTrigger>
                          <SelectContent>
                            {assessors?.map((assessor) => (
                              <SelectItem key={assessor.id} value={assessor.id} data-testid={`select-option-assessor-${assessor.id}`}>{assessor.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{fontFamily: 'Pretendard',fontWeight: 500,fontSize: '14px',lineHeight: '128%',letterSpacing: '-0.01em',color: '#686A6E'}}>소속/시설</label>
                        <input type="text" placeholder="입력해주세요" value={formData.assessorDepartment} onChange={(e) => handleInputChange("assessorDepartment", e.target.value)} style={{height: '68px',padding: '10px 20px',background: '#FDFDFD',border: '2px solid rgba(12, 12, 12, 0.08)',borderRadius: '8px',fontFamily: 'Pretendard',fontWeight: 600,fontSize: '16px',letterSpacing: '-0.02em',color: '#0C0C0C'}} data-testid="input-assessor-department" />
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{fontFamily: 'Pretendard',fontWeight: 500,fontSize: '14px',lineHeight: '128%',letterSpacing: '-0.01em',color: '#686A6E'}}>심사팀</label>
                        <input type="text" placeholder="입력해주세요" value={formData.assessorTeam} onChange={(e) => handleInputChange("assessorTeam", e.target.value)} style={{height: '68px',padding: '10px 20px',background: '#FDFDFD',border: '2px solid rgba(12, 12, 12, 0.08)',borderRadius: '8px',fontFamily: 'Pretendard',fontWeight: 600,fontSize: '16px',letterSpacing: '-0.02em',color: '#0C0C0C'}} data-testid="input-assessor-team" />
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{fontFamily: 'Pretendard',fontWeight: 500,fontSize: '14px',lineHeight: '128%',letterSpacing: '-0.01em',color: '#686A6E'}}>심사자 연락처</label>
                        <input type="text" placeholder="연락처를 입력해주세요" value={formData.assessorContact} onChange={(e) => handleInputChange("assessorContact", e.target.value)} style={{height: '68px',padding: '10px 20px',background: 'rgba(12, 12, 12, 0.04)',borderRadius: '8px',border: 'none',fontFamily: 'Pretendard',fontWeight: 600,fontSize: '16px',letterSpacing: '-0.02em',color: '#0C0C0C'}} data-testid="input-assessor-contact" />
                      </div>
                    </div>

                    {/* Subsection: 조사자 정보 */}
                    <div style={{ padding: '24px 20px 12px 20px' }}>
                      <h3 style={{fontFamily: 'Pretendard',fontWeight: 600,fontSize: '20px',lineHeight: '128%',letterSpacing: '-0.02em',color: 'rgba(12, 12, 12, 0.8)'}}>조사자 정보</h3>
                    </div>

                    {/* 조사자 정보 4-column */}
                    <div style={{ display: 'flex', gap: '20px', padding: '0 20px' }}>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{fontFamily: 'Pretendard',fontWeight: 500,fontSize: '14px',lineHeight: '128%',letterSpacing: '-0.01em',color: '#686A6E'}}>순서팀</label>
                        <input type="text" placeholder="입력해주세요" value={formData.investigatorTeam} onChange={(e) => handleInputChange("investigatorTeam", e.target.value)} style={{height: '68px',padding: '10px 20px',background: '#FDFDFD',border: '2px solid rgba(12, 12, 12, 0.08)',borderRadius: '8px',fontFamily: 'Pretendard',fontWeight: 600,fontSize: '16px',letterSpacing: '-0.02em',color: '#0C0C0C'}} data-testid="input-investigator-team" />
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{fontFamily: 'Pretendard',fontWeight: 500,fontSize: '14px',lineHeight: '128%',letterSpacing: '-0.01em',color: '#686A6E'}}>소속/부서</label>
                        <input type="text" placeholder="입력해주세요" value={formData.investigatorDepartment} onChange={(e) => handleInputChange("investigatorDepartment", e.target.value)} style={{height: '68px',padding: '10px 20px',background: '#FDFDFD',border: '2px solid rgba(12, 12, 12, 0.08)',borderRadius: '8px',fontFamily: 'Pretendard',fontWeight: 600,fontSize: '16px',letterSpacing: '-0.02em',color: '#0C0C0C'}} data-testid="input-investigator-department" />
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{fontFamily: 'Pretendard',fontWeight: 500,fontSize: '14px',lineHeight: '128%',letterSpacing: '-0.01em',color: '#686A6E'}}>조사팀</label>
                        <input type="text" placeholder="입력해주세요" value={formData.investigatorTeamName} onChange={(e) => handleInputChange("investigatorTeamName", e.target.value)} style={{height: '68px',padding: '10px 20px',background: '#FDFDFD',border: '2px solid rgba(12, 12, 12, 0.08)',borderRadius: '8px',fontFamily: 'Pretendard',fontWeight: 600,fontSize: '16px',letterSpacing: '-0.02em',color: '#0C0C0C'}} data-testid="input-investigator-team-name" />
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{fontFamily: 'Pretendard',fontWeight: 500,fontSize: '14px',lineHeight: '128%',letterSpacing: '-0.01em',color: '#686A6E'}}>조사자 연락처</label>
                        <input type="text" placeholder="연락처를 입력해주세요" value={formData.investigatorContact} onChange={(e) => handleInputChange("investigatorContact", e.target.value)} style={{height: '68px',padding: '10px 20px',background: 'rgba(12, 12, 12, 0.04)',borderRadius: '8px',border: 'none',fontFamily: 'Pretendard',fontWeight: 600,fontSize: '16px',letterSpacing: '-0.02em',color: '#0C0C0C'}} data-testid="input-investigator-contact" />
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            {/* 2. 피보험자 및 피해자 정보 */}
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
                  <div style={{ padding: '0px 0 32px 0' }}>
                    {/* First Row: Title + Note + Checkbox (space-between) */}
                    <div 
                      style={{ 
                        display: 'flex',
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '24px 20px',
                        gap: '10px',
                      }}
                    >
                      {/* Left: Title + Note */}
                      <div 
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                        }}
                      >
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

                      {/* Right: Checkbox */}
                      <div 
                        style={{
                          display: 'flex',
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Checkbox 
                          id="same-as-policy-holder"
                          checked={sameAsPolicyHolder}
                          onCheckedChange={(checked) => setSameAsPolicyHolder(checked as boolean)}
                          data-testid="checkbox-same-as-policy-holder"
                          style={{ width: '24px', height: '24px' }}
                        />
                        <label 
                          htmlFor="same-as-policy-holder"
                          style={{
                            fontFamily: 'Pretendard',
                            fontWeight: 500,
                            fontSize: '14px',
                            lineHeight: '128%',
                            letterSpacing: '-0.01em',
                            color: '#686A6E',
                            cursor: 'pointer',
                          }}
                        >
                          보험계약자 = 피보험자
                        </label>
                      </div>
                    </div>

                    {/* Second Row: 3-column - 보험계약자, 피보험자, 피보험자 연락처 */}
                    <div style={{ padding: '0 20px', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', gap: '20px' }}>
                        {/* Column 1: 보험계약자 */}
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
                            보험계약자
                          </label>
                          <input
                            type="text"
                            placeholder="보험자 성명"
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

                        {/* Column 2: 피보험자 */}
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
                            피보험자
                          </label>
                          <input
                            type="text"
                            placeholder="피보험자 성명"
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

                        {/* Column 3: 피보험자 연락처 (필수) */}
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
                            피보험자 연락처 <span style={{ color: '#FF0000' }}>*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="피보험자 연락처"
                            value={formData.insuredContact}
                            onChange={(e) => handleInputChange("insuredContact", e.target.value)}
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
                            data-testid="input-insured-contact"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Third Row: Full width - 피보험자 주소 (필수) */}
                    <div style={{ padding: '0 20px', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                          피보험자 주소 <span style={{ color: '#FF0000' }}>*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="피보험자 주소 입력"
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

                    {/* Fourth Section: 피해자 정보 */}
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

                    {/* Fifth Row: 2-column - 피해자, 피해자 연락처 */}
                    <div style={{ padding: '0 20px' }}>
                      <div style={{ display: 'flex', gap: '20px' }}>
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
                            피해자
                          </label>
                          <input
                            type="text"
                            placeholder="피해자 성명"
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

                        {/* Column 2: 피해자 연락처 */}
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
                            피해자 연락처
                          </label>
                          <input
                            type="text"
                            placeholder="피해자 연락처"
                            value={formData.victimContact}
                            onChange={(e) => handleInputChange("victimContact", e.target.value)}
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
                            data-testid="input-victim-contact"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* 3. 사고 및 피해사항 (Accident & Damage Information) */}
              <Collapsible
                open={accidentDamageInfoOpen}
                onOpenChange={setAccidentDamageInfoOpen}
                style={{
                  width: '1596px',
                  height: 'auto',
                  background: '#FFFFFF',
                  boxShadow: '0px 0px 20px #DBE9F5',
                  borderRadius: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  padding: '0px 0px 32px',
                }}
              >
                <CollapsibleTrigger asChild>
                  <div 
                    style={{
                      boxSizing: 'border-box',
                      display: 'flex',
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '24px',
                      width: '1596px',
                      height: '82px',
                      borderBottom: '2px solid rgba(12, 12, 12, 0.1)',
                      cursor: 'pointer',
                    }}
                  >
                    <h2 
                      style={{
                        margin: '0 auto',
                        width: '153px',
                        height: '31px',
                        fontFamily: 'Pretendard',
                        fontStyle: 'normal',
                        fontWeight: 600,
                        fontSize: '24px',
                        lineHeight: '128%',
                        letterSpacing: '-0.02em',
                        color: '#0C0C0C',
                      }}
                    >
                      사고 및 피해사항
                    </h2>
                    <Minus 
                      style={{
                        margin: '0 auto',
                        width: '34px',
                        height: '34px',
                        color: '#008FED',
                        transform: accidentDamageInfoOpen ? 'rotate(0deg)' : 'rotate(90deg)',
                        transition: 'transform 0.2s',
                      }}
                    />
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent style={{ width: '100%' }}>
                  <div 
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      padding: '0px',
                      gap: '32px',
                      width: '1596px',
                      height: 'auto',
                    }}
                  >
                    {/* Section 1: 사고 원인 · 규모 */}
                    <div 
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        padding: '0px',
                        width: '1596px',
                        height: 'auto',
                      }}
                    >
                      {/* Subsection Header with Checkbox */}
                      <div 
                        style={{
                          display: 'flex',
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '24px 20px',
                          gap: '10px',
                          width: '1596px',
                          height: '74px',
                        }}
                      >
                        <h3 
                          style={{
                            margin: '0 auto',
                            width: '120px',
                            height: '26px',
                            fontFamily: 'Pretendard',
                            fontStyle: 'normal',
                            fontWeight: 600,
                            fontSize: '20px',
                            lineHeight: '128%',
                            letterSpacing: '-0.02em',
                            color: 'rgba(12, 12, 12, 0.8)',
                          }}
                        >
                          사고 원인 · 규모
                        </h3>
                        <div 
                          style={{
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'center',
                            padding: '0px',
                            gap: '4px',
                            margin: '0 auto',
                            width: 'auto',
                            height: '24px',
                          }}
                        >
                          <span 
                            style={{
                              fontFamily: 'Pretendard',
                              fontStyle: 'normal',
                              fontWeight: 500,
                              fontSize: '14px',
                              lineHeight: '128%',
                              letterSpacing: '-0.01em',
                              color: '#686A6E',
                            }}
                          >
                            손방 및 대물 선택(중복 가능)
                          </span>
                        </div>
                      </div>

                      {/* Checkboxes and Dropdowns */}
                      <div 
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          padding: '0px 20px',
                          gap: '12px',
                          width: '1596px',
                          height: 'auto',
                        }}
                      >
                        {/* Row 1: Checkboxes */}
                        <div 
                          style={{
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'center',
                            padding: '0px',
                            gap: '12px',
                            width: '1556px',
                            height: '24px',
                          }}
                        >
                          <div 
                            style={{
                              display: 'flex',
                              flexDirection: 'row',
                              alignItems: 'center',
                              padding: '0px',
                              gap: '4px',
                            }}
                          >
                            <Checkbox
                              checked={damagePreventionCost}
                              onCheckedChange={(checked) => setDamagePreventionCost(checked as boolean)}
                              style={{
                                width: '24px',
                                height: '24px',
                              }}
                              data-testid="checkbox-damage-prevention"
                            />
                            <span 
                              style={{
                                fontFamily: 'Pretendard',
                                fontStyle: 'normal',
                                fontWeight: 500,
                                fontSize: '14px',
                                lineHeight: '128%',
                                letterSpacing: '-0.01em',
                                color: '#686A6E',
                              }}
                            >
                              손방(손해방지비)
                            </span>
                          </div>

                          <div 
                            style={{
                              display: 'flex',
                              flexDirection: 'row',
                              alignItems: 'center',
                              padding: '0px',
                              gap: '4px',
                            }}
                          >
                            <Checkbox
                              checked={victimIncidentAssistance}
                              onCheckedChange={(checked) => setVictimIncidentAssistance(checked as boolean)}
                              style={{
                                width: '24px',
                                height: '24px',
                              }}
                              data-testid="checkbox-victim-incident"
                            />
                            <span 
                              style={{
                                fontFamily: 'Pretendard',
                                fontStyle: 'normal',
                                fontWeight: 500,
                                fontSize: '14px',
                                lineHeight: '128%',
                                letterSpacing: '-0.01em',
                                color: '#686A6E',
                              }}
                            >
                              피해세대복구
                            </span>
                          </div>
                        </div>

                        {/* Row 2: 4-column Dropdowns */}
                        <div 
                          style={{
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'center',
                            padding: '0px',
                            gap: '20px',
                            width: '1556px',
                            height: '68px',
                          }}
                        >
                          {/* Column 1: 사고 유형 */}
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <Select 
                              value={formData.accidentType} 
                              onValueChange={(value) => handleInputChange("accidentType", value)}
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
                                data-testid="select-accident-type"
                              >
                                <SelectValue placeholder="사고 유형 선택" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="누수">누수</SelectItem>
                                <SelectItem value="화재">화재</SelectItem>
                                <SelectItem value="파손">파손</SelectItem>
                                <SelectItem value="기타">기타</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Column 2: 사고 원인 */}
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <Select 
                              value={formData.accidentCause} 
                              onValueChange={(value) => handleInputChange("accidentCause", value)}
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
                                data-testid="select-accident-cause"
                              >
                                <SelectValue placeholder="사고 원인 선택" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="배관 노후">배관 노후</SelectItem>
                                <SelectItem value="시공 불량">시공 불량</SelectItem>
                                <SelectItem value="동파">동파</SelectItem>
                                <SelectItem value="기타">기타</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Column 3: 복구 유형 */}
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <Select 
                              value={formData.restorationMethod} 
                              onValueChange={(value) => handleInputChange("restorationMethod", value)}
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
                                data-testid="select-restoration-method"
                              >
                                <SelectValue placeholder="복구 유형 선택" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="부분 복구">부분 복구</SelectItem>
                                <SelectItem value="전체 복구">전체 복구</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Column 4: 타업체 견적 여부 */}
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <Select 
                              value={formData.otherVendorEstimate} 
                              onValueChange={(value) => handleInputChange("otherVendorEstimate", value)}
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
                                data-testid="select-other-vendor-estimate"
                              >
                                <SelectValue placeholder="타업체 견적 여부 선택" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="있음">있음</SelectItem>
                                <SelectItem value="없음">없음</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Row 3: 사고내용 Textarea */}
                        <div style={{ width: '1556px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                            사고내용
                          </label>
                          <div style={{ position: 'relative' }}>
                            <textarea
                              placeholder="사고내용을 입력해 주세요"
                              value={formData.accidentDescription}
                              onChange={(e) => handleInputChange("accidentDescription", e.target.value)}
                              maxLength={800}
                              style={{
                                width: '100%',
                                height: '120px',
                                padding: '16px 20px',
                                background: '#FDFDFD',
                                border: '2px solid rgba(12, 12, 12, 0.08)',
                                borderRadius: '8px',
                                fontFamily: 'Pretendard',
                                fontWeight: 400,
                                fontSize: '14px',
                                lineHeight: '150%',
                                letterSpacing: '-0.01em',
                                color: '#0C0C0C',
                                resize: 'none',
                              }}
                              data-testid="textarea-accident-description"
                            />
                            <span 
                              style={{
                                position: 'absolute',
                                bottom: '12px',
                                right: '20px',
                                fontFamily: 'Pretendard',
                                fontSize: '12px',
                                color: '#686A6E',
                              }}
                            >
                              {formData.accidentDescription.length}/800
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Section 2: 피해사항(선택) */}
                    <div 
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        padding: '0px',
                        width: '1596px',
                        height: 'auto',
                      }}
                    >
                      {/* Subsection Header */}
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
                          피해사항(선택)
                        </h3>
                      </div>

                      {/* Input Fields and Add Button */}
                      <div 
                        style={{
                          padding: '0 20px',
                          width: '1596px',
                          display: 'flex',
                          flexDirection: 'row',
                          alignItems: 'flex-end',
                          gap: '20px',
                        }}
                      >
                        {/* 피해 품목 */}
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
                            피해 품목
                          </label>
                          <Select 
                            value={formData.damageItem} 
                            onValueChange={(value) => handleInputChange("damageItem", value)}
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
                              data-testid="select-damage-item"
                            >
                              <SelectValue placeholder="피해 품목 선택" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="장판">장판</SelectItem>
                              <SelectItem value="벽지">벽지</SelectItem>
                              <SelectItem value="가구">가구</SelectItem>
                              <SelectItem value="전자제품">전자제품</SelectItem>
                              <SelectItem value="기타">기타</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* 피해 유형 */}
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
                            피해 유형
                          </label>
                          <Select 
                            value={formData.damageType} 
                            onValueChange={(value) => handleInputChange("damageType", value)}
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
                              data-testid="select-damage-type"
                            >
                              <SelectValue placeholder="피해 유형 선택" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="교체">교체</SelectItem>
                              <SelectItem value="수리">수리</SelectItem>
                              <SelectItem value="청소">청소</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* 수량 */}
                        <div style={{ flex: 0.5, display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                            수량
                          </label>
                          <input
                            type="number"
                            placeholder="0"
                            value={formData.damageQuantity}
                            onChange={(e) => handleInputChange("damageQuantity", e.target.value)}
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
                              textAlign: 'center',
                            }}
                            data-testid="input-damage-quantity"
                          />
                        </div>

                        {/* 피해 내용 */}
                        <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                            피해 내용
                          </label>
                          <input
                            type="text"
                            placeholder="피해 내용 입력"
                            value={formData.damageDetails}
                            onChange={(e) => handleInputChange("damageDetails", e.target.value)}
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
                            data-testid="input-damage-details"
                          />
                        </div>

                        {/* 등록 Button */}
                        <Button
                          onClick={handleAddDamageItem}
                          style={{
                            height: '68px',
                            padding: '0 32px',
                            background: '#008FED',
                            color: '#FFFFFF',
                            borderRadius: '8px',
                            border: 'none',
                            fontFamily: 'Pretendard',
                            fontWeight: 600,
                            fontSize: '16px',
                            letterSpacing: '-0.02em',
                            flexShrink: 0,
                          }}
                          data-testid="button-add-damage"
                        >
                          등록
                        </Button>
                      </div>

                      {/* 등록된 피해사항 표시 (태그) */}
                      {damageItems.length > 0 && (
                        <div 
                          style={{
                            padding: '12px 20px 0 20px',
                            width: '1596px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                          }}
                        >
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
                            등 건의 피해
                          </label>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {damageItems.map((item, index) => (
                              <div
                                key={index}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  padding: '8px 12px',
                                  background: '#F5F5F5',
                                  borderRadius: '6px',
                                  fontFamily: 'Pretendard',
                                  fontSize: '14px',
                                  color: '#0C0C0C',
                                }}
                              >
                                <span style={{ color: '#008FED', fontWeight: 600 }}>•</span>
                                <span style={{ fontWeight: 500 }}>
                                  {item.item}
                                </span>
                                <span style={{ color: '#686A6E' }}>
                                  {item.type}
                                </span>
                                <span style={{ fontWeight: 600 }}>
                                  {item.quantity}
                                </span>
                                <span style={{ color: '#686A6E' }}>
                                  {item.details}
                                </span>
                                <button
                                  onClick={() => handleRemoveDamageItem(index)}
                                  style={{
                                    marginLeft: '4px',
                                    width: '16px',
                                    height: '16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: 'rgba(12, 12, 12, 0.2)',
                                    borderRadius: '50%',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: '#FFFFFF',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                  }}
                                  data-testid={`button-remove-damage-${index}`}
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Section 3: 배당사항(협력사 배당) */}
                    <div 
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        padding: '0px',
                        width: '1596px',
                        height: 'auto',
                      }}
                    >
                      {/* Subsection Header */}
                      <div style={{ padding: '24px 20px 0px 20px' }}>
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
                          배당사항(협력사 배당)
                        </h3>
                        <p 
                          style={{
                            marginTop: '8px',
                            fontFamily: 'Pretendard',
                            fontWeight: 400,
                            fontSize: '13px',
                            lineHeight: '150%',
                            letterSpacing: '-0.01em',
                            color: '#686A6E',
                          }}
                        >
                          공지사항: 담배책 다량 설치필요 XX 건조공사
                        </p>
                      </div>

                      {/* Partner Assignment Fields */}
                      <div 
                        style={{
                          padding: '16px 20px',
                          width: '1596px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                        }}
                      >
                        <h4 
                          style={{
                            fontFamily: 'Pretendard',
                            fontWeight: 600,
                            fontSize: '16px',
                            lineHeight: '128%',
                            letterSpacing: '-0.01em',
                            color: '#0C0C0C',
                          }}
                        >
                          배당 협력사 정보
                        </h4>

                        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-end' }}>
                          {/* 협력사 */}
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
                              협력사
                            </label>
                            <input
                              type="text"
                              placeholder="협력사 선택"
                              value={formData.assignedPartner}
                              onChange={(e) => handleInputChange("assignedPartner", e.target.value)}
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
                              data-testid="input-assigned-partner"
                            />
                          </div>

                          {/* 담당자명 */}
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
                              담당자명
                            </label>
                            <input
                              type="text"
                              placeholder="담당자명"
                              value={formData.assignedPartnerManager}
                              onChange={(e) => handleInputChange("assignedPartnerManager", e.target.value)}
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
                              data-testid="input-partner-manager"
                            />
                          </div>

                          {/* 담당자 연락처 */}
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
                              담당자 연락처
                            </label>
                            <input
                              type="text"
                              placeholder="담당자 연락처"
                              value={formData.assignedPartnerContact}
                              onChange={(e) => handleInputChange("assignedPartnerContact", e.target.value)}
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
                              data-testid="input-partner-contact"
                            />
                          </div>

                          {/* 점검 Button */}
                          <Button
                            style={{
                              height: '68px',
                              padding: '0 32px',
                              background: '#008FED',
                              color: '#FFFFFF',
                              borderRadius: '8px',
                              border: 'none',
                              fontFamily: 'Pretendard',
                              fontWeight: 600,
                              fontSize: '16px',
                              letterSpacing: '-0.02em',
                              flexShrink: 0,
                            }}
                            data-testid="button-check-partner"
                          >
                            점검
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Section 4: 일정 · 우선순위 */}
                    <div 
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        padding: '0px',
                        width: '1596px',
                        height: 'auto',
                      }}
                    >
                      {/* Subsection Header */}
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
                          일정 · 우선순위
                        </h3>
                      </div>

                      {/* Location and Special Requests */}
                      <div 
                        style={{
                          padding: '0 20px',
                          width: '1596px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                        }}
                      >
                        {/* 지도(선택) */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                            지도(선택)
                          </label>
                          <Select 
                            value={formData.location} 
                            onValueChange={(value) => handleInputChange("location", value)}
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
                              data-testid="select-location"
                            >
                              <SelectValue placeholder="지도(선택)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="서울">서울</SelectItem>
                              <SelectItem value="경기">경기</SelectItem>
                              <SelectItem value="인천">인천</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* 특이사항 및 요청사항 Textarea */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                            특이사항 및 요청사항
                          </label>
                          <div style={{ position: 'relative' }}>
                            <textarea
                              placeholder="접장 특이사항, 요청사항 등"
                              value={formData.specialRequests}
                              onChange={(e) => handleInputChange("specialRequests", e.target.value)}
                              maxLength={800}
                              style={{
                                width: '100%',
                                height: '120px',
                                padding: '16px 20px',
                                background: '#FDFDFD',
                                border: '2px solid rgba(12, 12, 12, 0.08)',
                                borderRadius: '8px',
                                fontFamily: 'Pretendard',
                                fontWeight: 400,
                                fontSize: '14px',
                                lineHeight: '150%',
                                letterSpacing: '-0.01em',
                                color: '#0C0C0C',
                                resize: 'none',
                              }}
                              data-testid="textarea-special-requests"
                            />
                            <span 
                              style={{
                                position: 'absolute',
                                bottom: '12px',
                                right: '20px',
                                fontFamily: 'Pretendard',
                                fontSize: '12px',
                                color: '#686A6E',
                              }}
                            >
                              {formData.specialRequests.length}/800
                            </span>
                          </div>
                        </div>
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
