import { useState, useEffect, useMemo } from "react";
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
import { Star, Minus, Calendar, HelpCircle, ChevronDown, ChevronUp, X } from "lucide-react";
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
  
  // 협력사 검색 팝업 상태
  const [isPartnerSearchOpen, setIsPartnerSearchOpen] = useState(false);
  const [partnerSearchQuery, setPartnerSearchQuery] = useState("");
  const [selectedPartner, setSelectedPartner] = useState<any>(null);
  const [tempSelectedPartner, setTempSelectedPartner] = useState<any>(null);
  
  // Mock 협력사 데이터
  const mockPartners = [
    { id: 1, name: "AERO 파트너스", dailyCount: 0, monthlyCount: 0, inProgressCount: 0, pendingCount: 0, region: "서울시/강남구, 서초구, 송파구, 성동구, 광진구" },
    { id: 2, name: "누수닥터", dailyCount: 0, monthlyCount: 0, inProgressCount: 0, pendingCount: 0, region: "서울시/종로구, 중구, 용산구" },
    { id: 3, name: "플록슨 파트너", dailyCount: 5, monthlyCount: 20, inProgressCount: 3, pendingCount: 2, region: "경기도/성남시, 분당구" },
  ];
  
  const filteredPartners = partnerSearchQuery 
    ? mockPartners.filter(p => p.name.toLowerCase().includes(partnerSearchQuery.toLowerCase()))
    : [];
  
  const { data: user, isLoading: userLoading } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  const { data: assessors } = useQuery<User[]>({
    queryKey: ["/api/users"],
    select: (users) => users.filter(u => u.role === "심사사"),
  });

  // 조사사 목록 가져오기
  const { data: investigators } = useQuery<User[]>({
    queryKey: ["/api/users"],
    select: (users) => users.filter(u => u.role === "조사사"),
  });

  // 보험사 직원 목록 가져오기
  const { data: insuranceEmployees } = useQuery<User[]>({
    queryKey: ["/api/users"],
    select: (users) => users.filter(u => u.role === "보험사"),
  });

  // 의뢰사 직원 목록 가져오기
  const { data: clientEmployees } = useQuery<User[]>({
    queryKey: ["/api/users"],
    select: (users) => users.filter(u => u.role === "의뢰사"),
  });

  // 접수번호 자동 생성 함수
  const generateCaseNumber = () => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
    return `CLM-${year}${month}${day}${hours}${minutes}${seconds}${milliseconds}`;
  };

  const [caseNumber] = useState(() => generateCaseNumber());
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
    damageItems: [] as Array<{
      item: string;
      type: string;
      quantity: string;
      details: string;
    }>,
    assignedPartner: "",
    assignedPartnerManager: "",
    assignedPartnerContact: "",
    location: "",
    specialRequests: "",
  });

  // 선택된 의뢰사에 해당하는 직원 필터링
  const filteredClientEmployees = useMemo(() => {
    if (!formData.clientResidence || !clientEmployees) {
      return [];
    }
    return clientEmployees.filter(
      emp => emp.company === formData.clientResidence
    );
  }, [formData.clientResidence, clientEmployees]);

  // 선택된 심사사에 해당하는 심사자(직원) 필터링
  const filteredAssessorEmployees = useMemo(() => {
    if (!formData.assessorId || !assessors) {
      return [];
    }
    return assessors.filter(
      emp => emp.company === formData.assessorId
    );
  }, [formData.assessorId, assessors]);

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
      return await apiRequest("POST", "/api/cases", { ...cleanFormData(data), caseNumber });
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
      return await apiRequest("POST", "/api/cases", { ...cleanFormData(data), caseNumber, status: "제출" });
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
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      
      // 의뢰자를 선택하면 해당 직원의 연락처를 자동으로 설정
      if (field === "clientName" && value) {
        const selectedEmployee = filteredClientEmployees.find(emp => emp.name === value);
        if (selectedEmployee) {
          updated.clientContact = selectedEmployee.phone || "";
        }
      }
      
      // 심사자를 선택하면 해당 심사자의 연락처를 자동으로 설정
      if (field === "assessorTeam" && value) {
        const selectedAssessor = filteredAssessorEmployees.find(assessor => assessor.name === value);
        if (selectedAssessor) {
          updated.assessorContact = selectedAssessor.phone || "";
        }
      }
      
      // 조사자를 선택하면 해당 조사자의 연락처를 자동으로 설정
      if (field === "investigatorTeamName" && value) {
        const selectedInvestigator = investigators?.find(inv => inv.name === value);
        if (selectedInvestigator) {
          updated.investigatorContact = selectedInvestigator.phone || "";
        }
      }
      
      return updated;
    });
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
      setFormData(prev => ({
        ...prev,
        damageItems: [...prev.damageItems, {
          item: prev.damageItem,
          type: prev.damageType,
          quantity: prev.damageQuantity || '0',
          details: prev.damageDetails,
        }],
        damageItem: '',
        damageType: '',
        damageQuantity: '',
        damageDetails: '',
      }));
    }
  };

  const handleRemoveDamageItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      damageItems: prev.damageItems.filter((_, i) => i !== index),
    }));
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
                else if (item.name === "진행상황") setLocation("/progress");
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
                              color: '#0C0C0C',
                            }}
                            data-testid="text-case-number"
                          >
                            {caseNumber}
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
                        <label style={{fontFamily: 'Pretendard',fontWeight: 500,fontSize: '14px',lineHeight: '128%',letterSpacing: '-0.01em',color: '#686A6E'}}>의뢰사</label>
                        <Select value={formData.clientResidence} onValueChange={(value) => handleInputChange("clientResidence", value)}>
                          <SelectTrigger style={{height: '68px',padding: '10px 20px',background: '#FDFDFD',border: '2px solid rgba(12, 12, 12, 0.08)',borderRadius: '8px',fontFamily: 'Pretendard',fontWeight: 600,fontSize: '16px',letterSpacing: '-0.02em'}} data-testid="select-client-company">
                            <SelectValue placeholder="의뢰사 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="대한건설" data-testid="select-option-client-daehan">대한건설</SelectItem>
                            <SelectItem value="한국종합건설" data-testid="select-option-client-korea">한국종합건설</SelectItem>
                            <SelectItem value="서울건설" data-testid="select-option-client-seoul">서울건설</SelectItem>
                            <SelectItem value="코리아부동산관리" data-testid="select-option-client-realestate">코리아부동산관리</SelectItem>
                            <SelectItem value="글로벌시설관리" data-testid="select-option-client-global">글로벌시설관리</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{fontFamily: 'Pretendard',fontWeight: 500,fontSize: '14px',lineHeight: '128%',letterSpacing: '-0.01em',color: '#686A6E'}}>소속/시설</label>
                        <input type="text" placeholder="소속/시설" value={formData.clientDepartment} onChange={(e) => handleInputChange("clientDepartment", e.target.value)} style={{height: '68px',padding: '10px 20px',background: '#FDFDFD',border: '2px solid rgba(12, 12, 12, 0.08)',borderRadius: '8px',fontFamily: 'Pretendard',fontWeight: 600,fontSize: '16px',letterSpacing: '-0.02em',color: '#0C0C0C'}} data-testid="input-client-department" />
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{fontFamily: 'Pretendard',fontWeight: 500,fontSize: '14px',lineHeight: '128%',letterSpacing: '-0.01em',color: '#686A6E'}}>의뢰자</label>
                        <Select 
                          value={formData.clientName} 
                          onValueChange={(value) => handleInputChange("clientName", value)}
                          disabled={!formData.clientResidence}
                        >
                          <SelectTrigger style={{height: '68px',padding: '10px 20px',background: '#FDFDFD',border: '2px solid rgba(12, 12, 12, 0.08)',borderRadius: '8px',fontFamily: 'Pretendard',fontWeight: 600,fontSize: '16px',letterSpacing: '-0.02em'}} data-testid="select-client-name">
                            <SelectValue placeholder={formData.clientResidence ? "담당자 선택" : "의뢰사를 먼저 선택해주세요"} />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredClientEmployees.length > 0 ? (
                              filteredClientEmployees.map((employee) => (
                                <SelectItem key={employee.id} value={employee.name} data-testid={`select-option-client-${employee.id}`}>
                                  {employee.name}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="no-employees" disabled data-testid="select-option-no-employees">
                                해당 보험사에 등록된 직원이 없습니다
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{fontFamily: 'Pretendard',fontWeight: 500,fontSize: '14px',lineHeight: '128%',letterSpacing: '-0.01em',color: '#686A6E'}}>의뢰자 담당자 연락처</label>
                        <input type="text" placeholder="의뢰자를 선택하면 자동으로 입력됩니다" value={formData.clientContact} readOnly style={{height: '68px',padding: '10px 20px',background: 'rgba(12, 12, 12, 0.04)',borderRadius: '8px',border: 'none',fontFamily: 'Pretendard',fontWeight: 600,fontSize: '16px',letterSpacing: '-0.02em',color: '#0C0C0C'}} data-testid="input-client-contact" />
                      </div>
                    </div>

                    {/* Subsection: 심사자 정보 */}
                    <div style={{ padding: '24px 20px 12px 20px' }}>
                      <h3 style={{fontFamily: 'Pretendard',fontWeight: 600,fontSize: '20px',lineHeight: '128%',letterSpacing: '-0.02em',color: 'rgba(12, 12, 12, 0.8)'}}>심사자 정보</h3>
                    </div>

                    {/* 심사자 정보 4-column */}
                    <div style={{ display: 'flex', gap: '20px', padding: '0 20px', marginBottom: '32px' }}>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{fontFamily: 'Pretendard',fontWeight: 500,fontSize: '14px',lineHeight: '128%',letterSpacing: '-0.01em',color: '#686A6E'}}>심사사</label>
                        <Select value={formData.assessorId} onValueChange={(value) => handleInputChange("assessorId", value)}>
                          <SelectTrigger style={{height: '68px',padding: '10px 20px',background: '#FDFDFD',border: '2px solid rgba(12, 12, 12, 0.08)',borderRadius: '8px',fontFamily: 'Pretendard',fontWeight: 600,fontSize: '16px',letterSpacing: '-0.02em'}} data-testid="select-assessor-company">
                            <SelectValue placeholder="심사사 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="한국손해사정" data-testid="select-option-assessor-korea">한국손해사정</SelectItem>
                            <SelectItem value="코리아손해사정" data-testid="select-option-assessor-corea">코리아손해사정</SelectItem>
                            <SelectItem value="대한손해사정" data-testid="select-option-assessor-daehan">대한손해사정</SelectItem>
                            <SelectItem value="글로벌손해사정" data-testid="select-option-assessor-global">글로벌손해사정</SelectItem>
                            <SelectItem value="한빛손해사정" data-testid="select-option-assessor-hanbit">한빛손해사정</SelectItem>
                            <SelectItem value="우리손해사정" data-testid="select-option-assessor-woori">우리손해사정</SelectItem>
                            <SelectItem value="서울손해사정" data-testid="select-option-assessor-seoul">서울손해사정</SelectItem>
                            <SelectItem value="현대손해사정" data-testid="select-option-assessor-hyundai">현대손해사정</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{fontFamily: 'Pretendard',fontWeight: 500,fontSize: '14px',lineHeight: '128%',letterSpacing: '-0.01em',color: '#686A6E'}}>소속/시설</label>
                        <input type="text" placeholder="입력해주세요" value={formData.assessorDepartment} onChange={(e) => handleInputChange("assessorDepartment", e.target.value)} style={{height: '68px',padding: '10px 20px',background: '#FDFDFD',border: '2px solid rgba(12, 12, 12, 0.08)',borderRadius: '8px',fontFamily: 'Pretendard',fontWeight: 600,fontSize: '16px',letterSpacing: '-0.02em',color: '#0C0C0C'}} data-testid="input-assessor-department" />
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{fontFamily: 'Pretendard',fontWeight: 500,fontSize: '14px',lineHeight: '128%',letterSpacing: '-0.01em',color: '#686A6E'}}>심사자</label>
                        <Select 
                          value={formData.assessorTeam} 
                          onValueChange={(value) => handleInputChange("assessorTeam", value)}
                          disabled={!formData.assessorId}
                        >
                          <SelectTrigger style={{height: '68px',padding: '10px 20px',background: '#FDFDFD',border: '2px solid rgba(12, 12, 12, 0.08)',borderRadius: '8px',fontFamily: 'Pretendard',fontWeight: 600,fontSize: '16px',letterSpacing: '-0.02em'}} data-testid="select-assessor-name">
                            <SelectValue placeholder={formData.assessorId ? "심사자 선택" : "심사사를 먼저 선택해주세요"} />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredAssessorEmployees.length > 0 ? (
                              filteredAssessorEmployees.map((employee) => (
                                <SelectItem key={employee.id} value={employee.name} data-testid={`select-option-assessor-${employee.id}`}>
                                  {employee.name}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="no-employees" disabled data-testid="select-option-no-assessors">
                                해당 심사사에 등록된 직원이 없습니다
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{fontFamily: 'Pretendard',fontWeight: 500,fontSize: '14px',lineHeight: '128%',letterSpacing: '-0.01em',color: '#686A6E'}}>심사자 연락처</label>
                        <input type="text" placeholder="심사자를 선택하면 자동으로 입력됩니다" value={formData.assessorContact} readOnly style={{height: '68px',padding: '10px 20px',background: 'rgba(12, 12, 12, 0.04)',borderRadius: '8px',border: 'none',fontFamily: 'Pretendard',fontWeight: 600,fontSize: '16px',letterSpacing: '-0.02em',color: '#0C0C0C'}} data-testid="input-assessor-contact" />
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
                        <label style={{fontFamily: 'Pretendard',fontWeight: 500,fontSize: '14px',lineHeight: '128%',letterSpacing: '-0.01em',color: '#686A6E'}}>조사자</label>
                        <Select value={formData.investigatorTeamName} onValueChange={(value) => handleInputChange("investigatorTeamName", value)}>
                          <SelectTrigger style={{height: '68px',padding: '10px 20px',background: '#FDFDFD',border: '2px solid rgba(12, 12, 12, 0.08)',borderRadius: '8px',fontFamily: 'Pretendard',fontWeight: 600,fontSize: '16px',letterSpacing: '-0.02em'}} data-testid="select-investigator">
                            <SelectValue placeholder="선택해주세요" />
                          </SelectTrigger>
                          <SelectContent>
                            {investigators?.map((investigator) => (
                              <SelectItem key={investigator.id} value={investigator.name} data-testid={`select-option-investigator-${investigator.id}`}>{investigator.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{fontFamily: 'Pretendard',fontWeight: 500,fontSize: '14px',lineHeight: '128%',letterSpacing: '-0.01em',color: '#686A6E'}}>조사자 연락처</label>
                        <input type="text" placeholder="조사자를 선택하면 자동으로 입력됩니다" value={formData.investigatorContact} readOnly style={{height: '68px',padding: '10px 20px',background: 'rgba(12, 12, 12, 0.04)',borderRadius: '8px',border: 'none',fontFamily: 'Pretendard',fontWeight: 600,fontSize: '16px',letterSpacing: '-0.02em',color: '#0C0C0C'}} data-testid="input-investigator-contact" />
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
            </div>

            {/* 3. 사고 및 피해사항 (Accident & Damage Information) */}
              <div 
                style={{
                  background: '#FFFFFF',
                  boxShadow: '0px 0px 20px #DBE9F5',
                  borderRadius: '12px',
                  overflow: 'hidden',
                }}
              >
                <Collapsible open={accidentDamageInfoOpen} onOpenChange={setAccidentDamageInfoOpen}>
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
                      사고 및 피해사항
                    </h2>
                    <CollapsibleTrigger asChild>
                      <button 
                        className="w-[34px] h-[34px] flex items-center justify-center"
                        data-testid="button-toggle-accident-damage-info"
                      >
                        <Minus className="w-4 h-4" style={{ color: '#008FED' }} />
                      </button>
                    </CollapsibleTrigger>
                  </div>
                  
                  <CollapsibleContent>
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
                      {/* Subsection Header */}
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
                            fontFamily: 'Pretendard',
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
                            gap: '4px',
                          }}
                        >
                          <Checkbox
                            style={{ width: '24px', height: '24px' }}
                            data-testid="checkbox-insurer-equals-insured"
                          />
                          <span 
                            style={{
                              fontFamily: 'Pretendard',
                              fontWeight: 500,
                              fontSize: '14px',
                              lineHeight: '128%',
                              letterSpacing: '-0.01em',
                              color: '#686A6E',
                            }}
                          >
                            보험계약자 = 피보험자
                          </span>
                        </div>
                      </div>

                      {/* Content */}
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
                        {/* Row 1: Checkboxes with Label */}
                        <div 
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            gap: '8px',
                            width: '1556px',
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
                            손방 및 대물 선택(중복 가능)
                          </label>
                          <div 
                            style={{
                              display: 'flex',
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: '12px',
                            }}
                          >
                            <div 
                              style={{
                                display: 'flex',
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <Checkbox
                                checked={damagePreventionCost}
                                onCheckedChange={(checked) => setDamagePreventionCost(checked as boolean)}
                                style={{ width: '24px', height: '24px' }}
                                data-testid="checkbox-damage-prevention"
                              />
                              <span 
                                style={{
                                  fontFamily: 'Pretendard',
                                  fontWeight: 500,
                                  fontSize: '14px',
                                  lineHeight: '128%',
                                  letterSpacing: '-0.01em',
                                  color: damagePreventionCost ? '#008FED' : '#686A6E',
                                }}
                              >
                                손해방지
                              </span>
                            </div>
                            <div 
                              style={{
                                display: 'flex',
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <Checkbox
                                checked={victimIncidentAssistance}
                                onCheckedChange={(checked) => setVictimIncidentAssistance(checked as boolean)}
                                style={{ width: '24px', height: '24px' }}
                                data-testid="checkbox-victim-incident"
                              />
                              <span 
                                style={{
                                  fontFamily: 'Pretendard',
                                  fontWeight: 500,
                                  fontSize: '14px',
                                  lineHeight: '128%',
                                  letterSpacing: '-0.01em',
                                  color: victimIncidentAssistance ? '#008FED' : '#686A6E',
                                }}
                              >
                                피해세대복구
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Row 2: 4-column Dropdowns */}
                        <div 
                          style={{
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: '20px',
                            width: '1556px',
                          }}
                        >
                          {/* Column 1 */}
                          <div style={{ width: '374px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '14px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>
                              사고 유형
                            </label>
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
                                <SelectItem value="급배수">급배수</SelectItem>
                                <SelectItem value="화재">화재</SelectItem>
                                <SelectItem value="기타">기타</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Column 2 */}
                          <div style={{ width: '374px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '14px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>
                              사고 원인
                            </label>
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
                                <SelectItem value="배관">배관</SelectItem>
                                <SelectItem value="방수">방수</SelectItem>
                                <SelectItem value="코킹">코킹</SelectItem>
                                <SelectItem value="공용부">공용부</SelectItem>
                                <SelectItem value="복합">복합</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Column 3 */}
                          <div style={{ width: '374px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '14px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>
                              복구 방식
                            </label>
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
                                <SelectItem value="없음">없음</SelectItem>
                                <SelectItem value="플랫폼 복구">플랫폼 복구</SelectItem>
                                <SelectItem value="선견적요청">선견적요청</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Column 4 */}
                          <div style={{ width: '374px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '14px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>
                              타업체 견적 여부
                            </label>
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
                                <SelectItem value="유">유</SelectItem>
                                <SelectItem value="무">무</SelectItem>
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
                      <div 
                        style={{
                          display: 'flex',
                          flexDirection: 'row',
                          alignItems: 'center',
                          padding: '24px 20px',
                          gap: '10px',
                          width: '1596px',
                          height: '74px',
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
                          피해사항(선택)
                        </h3>
                      </div>

                      {/* Input Row */}
                      <div 
                        style={{
                          display: 'flex',
                          flexDirection: 'row',
                          alignItems: 'center',
                          padding: '0px 20px',
                          gap: '20px',
                          width: '1596px',
                          height: '94px',
                        }}
                      >
                        {/* Input Fields Container */}
                        <div 
                          style={{
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: '12px',
                            flex: 1,
                          }}
                        >
                          {/* 피해 품목 */}
                          <div style={{ width: '413.33px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '14px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>
                              피해 품목
                            </label>
                            <Select value={formData.damageItem} onValueChange={(value) => handleInputChange("damageItem", value)}>
                              <SelectTrigger 
                                style={{ height: '68px', padding: '10px 20px', background: '#FDFDFD', border: '2px solid rgba(12, 12, 12, 0.08)', borderRadius: '8px', fontFamily: 'Pretendard', fontWeight: 600, fontSize: '16px', letterSpacing: '-0.02em' }}
                                data-testid="select-damage-item"
                              >
                                <SelectValue placeholder="선택" />
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
                          <div style={{ width: '413.33px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '14px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>
                              피해 유형
                            </label>
                            <Select value={formData.damageType} onValueChange={(value) => handleInputChange("damageType", value)}>
                              <SelectTrigger 
                                style={{ height: '68px', padding: '10px 20px', background: '#FDFDFD', border: '2px solid rgba(12, 12, 12, 0.08)', borderRadius: '8px', fontFamily: 'Pretendard', fontWeight: 600, fontSize: '16px', letterSpacing: '-0.02em' }}
                                data-testid="select-damage-type"
                              >
                                <SelectValue placeholder="선택" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="교체">교체</SelectItem>
                                <SelectItem value="수리">수리</SelectItem>
                                <SelectItem value="청소">청소</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* 수량 with increment/decrement buttons */}
                          <div style={{ width: '187px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '14px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>
                              수량
                            </label>
                            <div style={{ position: 'relative', height: '68px', display: 'flex', alignItems: 'center', padding: '10px 14px 10px 20px', background: '#FDFDFD', border: '2px solid rgba(12, 12, 12, 0.08)', borderRadius: '8px' }}>
                              <input
                                type="number"
                                value={formData.damageQuantity}
                                onChange={(e) => handleInputChange("damageQuantity", e.target.value)}
                                style={{
                                  width: '100%',
                                  border: 'none',
                                  background: 'transparent',
                                  fontFamily: 'Pretendard',
                                  fontWeight: 600,
                                  fontSize: '16px',
                                  letterSpacing: '-0.02em',
                                  color: '#0C0C0C',
                                  outline: 'none',
                                }}
                                data-testid="input-damage-quantity"
                              />
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <button
                                  onClick={() => handleInputChange("damageQuantity", String(Math.max(0, Number(formData.damageQuantity || 0) + 1)))}
                                  style={{
                                    width: '48px',
                                    height: '18px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: 'rgba(12, 12, 12, 0.06)',
                                    borderRadius: '4px',
                                    border: 'none',
                                    cursor: 'pointer',
                                  }}
                                  data-testid="button-quantity-increment"
                                >
                                  <ChevronUp style={{ width: '12px', height: '12px', color: '#008FED' }} />
                                </button>
                                <button
                                  onClick={() => handleInputChange("damageQuantity", String(Math.max(0, Number(formData.damageQuantity || 0) - 1)))}
                                  style={{
                                    width: '48px',
                                    height: '18px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: 'rgba(12, 12, 12, 0.06)',
                                    borderRadius: '4px',
                                    border: 'none',
                                    cursor: 'pointer',
                                  }}
                                  data-testid="button-quantity-decrement"
                                >
                                  <ChevronDown style={{ width: '12px', height: '12px', color: 'rgba(12, 12, 12, 0.4)' }} />
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* 피해 내용 */}
                          <div style={{ width: '413.33px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '14px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>
                              피해 내용
                            </label>
                            <input
                              type="text"
                              placeholder="선택"
                              value={formData.damageDetails}
                              onChange={(e) => handleInputChange("damageDetails", e.target.value)}
                              style={{ height: '68px', padding: '10px 20px', background: '#FDFDFD', border: '2px solid rgba(12, 12, 12, 0.08)', borderRadius: '8px', fontFamily: 'Pretendard', fontWeight: 600, fontSize: '16px', letterSpacing: '-0.02em', color: '#0C0C0C' }}
                              data-testid="input-damage-details"
                            />
                          </div>
                        </div>

                        {/* 입력 Button */}
                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '26px 0px 0px', gap: '10px', width: '73px', height: '94px' }}>
                          <button
                            onClick={handleAddDamageItem}
                            style={{
                              display: 'flex',
                              flexDirection: 'row',
                              justifyContent: 'center',
                              alignItems: 'center',
                              padding: '0px 24px',
                              width: '73px',
                              height: '68px',
                              background: '#008FED',
                              borderRadius: '6px',
                              border: 'none',
                              cursor: 'pointer',
                            }}
                            data-testid="button-add-damage"
                          >
                            <span style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '15px', lineHeight: '128%', letterSpacing: '-0.02em', color: '#FDFDFD' }}>
                              입력
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* 등록된 피해사항 리스트 */}
                      <div 
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          padding: '16px 20px',
                          gap: '10px',
                          width: '1596px',
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: '2px', width: '1556px' }}>
                          <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '14px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>
                            총 {formData.damageItems.length}건의 피해
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: '12px', width: '1556px', flexWrap: 'wrap' }}>
                          {formData.damageItems.map((item, index) => (
                            <div 
                              key={index}
                              style={{
                                display: 'flex',
                                flexDirection: 'row',
                                alignItems: 'center',
                                padding: '20px',
                                gap: '16px',
                                width: '316px',
                                height: '64px',
                                background: 'rgba(12, 12, 12, 0.08)',
                                borderRadius: '12px',
                              }}
                            >
                              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px', flex: 1 }}>
                                <div style={{ width: '8px', height: '8px', background: '#008FED', borderRadius: '50%' }} />
                                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '20px' }}>
                                  <span style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '16px', lineHeight: '128%', letterSpacing: '-0.02em', color: '#008FED' }}>
                                    {item.item}
                                  </span>
                                  <span style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '16px', lineHeight: '128%', letterSpacing: '-0.02em', color: 'rgba(0, 143, 237, 0.7)' }}>
                                    {item.type}
                                  </span>
                                  <span style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '16px', lineHeight: '128%', letterSpacing: '-0.02em', color: 'rgba(0, 143, 237, 0.7)' }}>
                                    {item.quantity}
                                  </span>
                                  <span style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '16px', lineHeight: '128%', letterSpacing: '-0.02em', color: 'rgba(0, 143, 237, 0.7)' }}>
                                    {item.details}
                                  </span>
                                </div>
                              </div>
                              <button
                                onClick={() => handleRemoveDamageItem(index)}
                                style={{ width: '24px', height: '24px', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                                data-testid={`button-remove-damage-${index}`}
                              >
                                <X style={{ width: '24px', height: '24px', color: 'rgba(12, 12, 12, 0.3)' }} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 등록된 피해사항 표시 (태그) */}
                      {formData.damageItems.length > 0 && (
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
                            {formData.damageItems.map((item, index) => (
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

                    {/* Section 3: 배당사항(협력사 배당) + 일정 · 우선순위 */}
                    <div 
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        padding: '0px 0px 32px',
                        width: '1556px',
                        background: 'rgba(12, 12, 12, 0.03)',
                        borderRadius: '12px',
                      }}
                    >
                      {/* Header */}
                      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '24px', width: '1556px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <h3 style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '22px', lineHeight: '128%', letterSpacing: '-0.02em', color: 'rgba(12, 12, 12, 0.9)' }}>
                            배당사항(협력사 배당)
                          </h3>
                          <p style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '14px', lineHeight: '128%', letterSpacing: '-0.01em', color: 'rgba(12, 12, 12, 0.5)' }}>
                            필수값은 상태에 따라 달라질 수 있습니다.
                          </p>
                        </div>
                      </div>

                      {/* 배당 협력사 정보 */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '1556px' }}>
                        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '24px 20px', gap: '10px', width: '1556px' }}>
                          <h4 style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '20px', lineHeight: '128%', letterSpacing: '-0.02em', color: 'rgba(12, 12, 12, 0.7)' }}>
                            배당 협력사 정보
                          </h4>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '0px 20px', gap: '20px', width: '1556px' }}>
                          {/* 협력사 with 검색 button */}
                          <div style={{ width: '492px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '14px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>
                              협력사
                            </label>
                            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', height: '68px' }}>
                              <input
                                type="text"
                                placeholder="선택"
                                value={formData.assignedPartner}
                                onChange={(e) => handleInputChange("assignedPartner", e.target.value)}
                                style={{ width: '379px', height: '68px', padding: '10px 20px', background: '#FDFDFD', border: '2px solid rgba(12, 12, 12, 0.08)', borderRadius: '8px 0px 0px 8px', fontFamily: 'Pretendard', fontWeight: 600, fontSize: '16px', letterSpacing: '-0.02em', color: 'rgba(12, 12, 12, 0.4)' }}
                                data-testid="input-assigned-partner"
                              />
                              <button
                                onClick={() => {
                                  setTempSelectedPartner(selectedPartner);
                                  setPartnerSearchQuery("");
                                  setIsPartnerSearchOpen(true);
                                }}
                                style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', width: '113px', height: '68px', background: '#008FED', borderRadius: '0px 8px 8px 0px', border: 'none', cursor: 'pointer' }}
                                data-testid="button-search-partner"
                              >
                                <span style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '18px', lineHeight: '128%', letterSpacing: '-0.02em', color: '#FDFDFD' }}>
                                  검색
                                </span>
                              </button>
                            </div>
                          </div>

                          {/* 담당자 */}
                          <div style={{ width: '492px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '14px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>
                              담당자
                            </label>
                            <input
                              type="text"
                              placeholder="담당자"
                              value={formData.assignedPartnerManager}
                              onChange={(e) => handleInputChange("assignedPartnerManager", e.target.value)}
                              readOnly
                              style={{ height: '68px', padding: '10px 20px', background: 'rgba(12, 12, 12, 0.04)', border: 'none', borderRadius: '8px', fontFamily: 'Pretendard', fontWeight: 600, fontSize: '16px', letterSpacing: '-0.02em', color: 'rgba(12, 12, 12, 0.4)' }}
                              data-testid="input-partner-manager"
                            />
                          </div>

                          {/* 연락처 */}
                          <div style={{ width: '492px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '14px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>
                              연락처
                            </label>
                            <input
                              type="text"
                              placeholder="연락처"
                              value={formData.assignedPartnerContact}
                              onChange={(e) => handleInputChange("assignedPartnerContact", e.target.value)}
                              readOnly
                              style={{ height: '68px', padding: '10px 20px', background: 'rgba(12, 12, 12, 0.04)', border: 'none', borderRadius: '8px', fontFamily: 'Pretendard', fontWeight: 600, fontSize: '16px', letterSpacing: '-0.02em', color: 'rgba(12, 12, 12, 0.4)' }}
                              data-testid="input-partner-contact"
                            />
                          </div>
                        </div>
                      </div>

                      {/* 일정 · 우선순위 */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '1556px', marginTop: '20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '24px 20px', gap: '10px', width: '1556px' }}>
                          <h4 style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '20px', lineHeight: '128%', letterSpacing: '-0.02em', color: 'rgba(12, 12, 12, 0.7)' }}>
                            일정 · 우선순위
                          </h4>
                        </div>

                        {/* 지도 선택 */}
                        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '0px 20px', gap: '20px', width: '536px' }}>
                          <div style={{ width: '496px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '14px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>
                              지도
                            </label>
                            <input
                              type="text"
                              placeholder="선택"
                              value={formData.location}
                              onChange={(e) => handleInputChange("location", e.target.value)}
                              style={{ height: '68px', padding: '10px 20px', background: '#FDFDFD', border: '2px solid rgba(12, 12, 12, 0.08)', borderRadius: '8px', fontFamily: 'Pretendard', fontWeight: 600, fontSize: '16px', letterSpacing: '-0.02em', color: 'rgba(12, 12, 12, 0.4)' }}
                              data-testid="input-location"
                            />
                          </div>
                        </div>

                        {/* 특이사항 및 요청사항 */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '0px 20px', gap: '20px', width: '1556px', marginTop: '12px' }}>
                          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', width: '1516px' }}>
                            <div style={{ width: '1516px', display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative' }}>
                              <label style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '14px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>
                                특이사항 및 요청사항
                              </label>
                              <textarea
                                placeholder="입력해주세요"
                                value={formData.specialRequests}
                                onChange={(e) => {
                                  if (e.target.value.length <= 800) {
                                    handleInputChange("specialRequests", e.target.value);
                                  }
                                }}
                                maxLength={800}
                                style={{ width: '100%', height: '120px', padding: '20px', background: '#FDFDFD', border: '2px solid rgba(12, 12, 12, 0.08)', borderRadius: '8px', fontFamily: 'Pretendard', fontWeight: 600, fontSize: '16px', lineHeight: '128%', letterSpacing: '-0.02em', color: 'rgba(12, 12, 12, 0.4)', resize: 'none' }}
                                data-testid="textarea-special-requests"
                              />
                              <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'flex-end', width: '1516px' }}>
                                <span style={{ fontFamily: 'Pretendard', fontWeight: 700, fontSize: '14px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>
                                  {formData.specialRequests.length}/800
                                </span>
                              </div>
                            </div>
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

      {/* 협력사 검색 팝업 */}
      {isPartnerSearchOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setIsPartnerSearchOpen(false)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              padding: '0px 0px 20px',
              gap: '10px',
              isolation: 'isolate',
              width: '864px',
              height: '696px',
              background: '#FFFFFF',
              boxShadow: '0px -2px 70px rgba(179, 193, 205, 0.8)',
              borderRadius: '12px',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: '0px 0px 0px 20px', gap: '321px', width: '864px', height: '60px' }}>
              <h2 style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '18px', lineHeight: '128%', letterSpacing: '-0.02em', color: '#0C0C0C' }}>
                협력사 검색
              </h2>
              <button
                onClick={() => setIsPartnerSearchOpen(false)}
                style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: '24px 20px', width: '60px', height: '60px', background: 'transparent', border: 'none', cursor: 'pointer' }}
                data-testid="button-close-partner-search"
              >
                <X size={24} color="#1C1B1F" />
              </button>
            </div>

            {/* Content */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0px', gap: '16px', width: '864px', height: '676px' }}>
              {/* Search Input */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '0px', gap: '8px', width: '824px', height: '84px' }}>
                <label style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '14px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>
                  협력사 검색
                </label>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '0px', width: '824px', height: '58px' }}>
                  <input
                    type="text"
                    placeholder="성함을 입력해주세요."
                    value={partnerSearchQuery}
                    onChange={(e) => setPartnerSearchQuery(e.target.value)}
                    style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '10px 12px', gap: '10px', width: '723.25px', height: '58px', background: '#FDFDFD', border: '1px solid rgba(12, 12, 12, 0.08)', borderRadius: '6px 0px 0px 6px', fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#0C0C0C' }}
                    data-testid="input-partner-search"
                  />
                  <button
                    onClick={() => {}}
                    style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: '0px', gap: '10px', width: '100.75px', height: '58px', background: '#008FED', borderRadius: '0px 6px 6px 0px', border: 'none', cursor: 'pointer' }}
                    data-testid="button-partner-search"
                  >
                    <span style={{ margin: '0 auto', fontFamily: 'Pretendard', fontWeight: 600, fontSize: '15px', lineHeight: '128%', letterSpacing: '-0.02em', color: '#FDFDFD' }}>
                      검색
                    </span>
                  </button>
                </div>
              </div>

              {/* Results */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '0px', gap: '24px', width: '824px', height: '500px' }}>
                {filteredPartners.length === 0 ? (
                  /* Empty State */
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0px 0px 58px', gap: '128px', width: '824px', height: '367px' }}>
                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '0px', width: '824px', height: '39px', background: '#F5F5F5' }}>
                      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '10px 12px', gap: '10px', width: '155px', height: '39px' }}>
                        <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>업체명</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '10px 12px', gap: '10px', width: '93px', height: '39px' }}>
                        <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>일배당건수</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '10px 12px', gap: '10px', width: '93px', height: '39px' }}>
                        <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>월배당건수</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '10px 12px', gap: '10px', width: '93px', height: '39px' }}>
                        <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>진행건수</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '10px 12px', gap: '10px', width: '93px', height: '39px' }}>
                        <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>미결건수</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '10px 12px', gap: '10px', width: '248px', height: '39px', flexGrow: 1 }}>
                        <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>지역</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '10px 12px', gap: '10px', width: '49px', height: '39px' }}>
                        <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>선택</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '824px', marginTop: '60px' }}>
                      <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', lineHeight: '128%', textAlign: 'center', letterSpacing: '-0.01em', color: '#686A6E' }}>
                        협력사를 검색해주세요
                      </span>
                    </div>
                  </div>
                ) : (
                  /* Table with Data */
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '0px', width: '824px', height: '373px' }}>
                    {/* Header */}
                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '0px', width: '824px', height: '39px', background: '#F5F5F5' }}>
                      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '10px 12px', gap: '10px', width: '155px', height: '39px' }}>
                        <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>업체명</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '10px 12px', gap: '10px', width: '93px', height: '39px' }}>
                        <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>일배당건수</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '10px 12px', gap: '10px', width: '93px', height: '39px' }}>
                        <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>월배당건수</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '10px 12px', gap: '10px', width: '93px', height: '39px' }}>
                        <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>진행건수</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '10px 12px', gap: '10px', width: '93px', height: '39px' }}>
                        <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>미결건수</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '10px 12px', gap: '10px', width: '248px', height: '39px', flexGrow: 1 }}>
                        <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>지역</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '10px 12px', gap: '10px', width: '49px', height: '39px' }}>
                        <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>선택</span>
                      </div>
                    </div>
                    
                    {/* Data Rows */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '0px', width: '824px', height: '334px' }}>
                      {filteredPartners.map((partner) => (
                        <div key={partner.id} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '0px', width: '824px', height: '61px' }}>
                          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '10px 12px', gap: '10px', width: '155px', height: '39px' }}>
                            <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>
                              {partner.name}
                            </span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '10px 12px', gap: '10px', width: '93px', height: '39px' }}>
                            <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>
                              {partner.dailyCount}
                            </span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '10px 12px', gap: '10px', width: '93px', height: '39px' }}>
                            <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>
                              {partner.monthlyCount}
                            </span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '10px 12px', gap: '10px', width: '93px', height: '39px' }}>
                            <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>
                              {partner.inProgressCount}
                            </span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '10px 12px', gap: '10px', width: '93px', height: '39px' }}>
                            <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>
                              {partner.pendingCount}
                            </span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '10px 12px', gap: '10px', width: '248px', height: '61px', flexGrow: 1 }}>
                            <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '15px', lineHeight: '128%', letterSpacing: '-0.01em', color: '#686A6E' }}>
                              {partner.region}
                            </span>
                          </div>
                          <div 
                            onClick={() => setTempSelectedPartner(partner)}
                            style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '10px 12px', gap: '10px', width: '49px', height: '38px', cursor: 'pointer' }}
                            data-testid={`radio-partner-${partner.id}`}
                          >
                            <div style={{ position: 'relative', width: '18px', height: '18px' }}>
                              <div style={{ position: 'absolute', left: '0%', right: '0%', top: '0%', bottom: '0%', background: tempSelectedPartner?.id === partner.id ? '#008FED' : '#FDFDFD', border: tempSelectedPartner?.id === partner.id ? 'none' : '2px solid rgba(12, 12, 12, 0.2)', borderRadius: '50%' }}></div>
                              {tempSelectedPartner?.id === partner.id && (
                                <div style={{ position: 'absolute', left: '27.78%', right: '27.78%', top: '27.78%', bottom: '27.78%', background: '#FDFDFD', borderRadius: '50%' }}></div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Selected Partner Card */}
                {tempSelectedPartner && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0px', gap: '8px', width: '824px', height: '103px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '16px', gap: '8px', width: '824px', height: '55px', background: '#F8F8F8', borderRadius: '12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '0px', gap: '16px', width: '424px', height: '23px' }}>
                        <div style={{ width: '8px', height: '8px', background: '#008FED', borderRadius: '50%' }}></div>
                        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '0px', gap: '9px', width: '400px', height: '23px' }}>
                          <span style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '18px', lineHeight: '128%', letterSpacing: '-0.02em', color: 'rgba(12, 12, 12, 0.9)' }}>
                            {tempSelectedPartner.name}
                          </span>
                          <span style={{ fontFamily: 'Pretendard', fontWeight: 400, fontSize: '16px', lineHeight: '128%', letterSpacing: '-0.02em', color: 'rgba(12, 12, 12, 0.6)' }}>
                            {tempSelectedPartner.region}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Buttons */}
                    <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: '0px', gap: '8px', width: '824px', height: '40px' }}>
                      <button
                        onClick={() => setTempSelectedPartner(null)}
                        style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: '10px', gap: '10px', margin: '0 auto', width: '88px', height: '40px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                        data-testid="button-reset-partner"
                      >
                        <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '16px', lineHeight: '128%', letterSpacing: '-0.02em', color: 'rgba(12, 12, 12, 0.3)' }}>
                          초기화
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          setSelectedPartner(tempSelectedPartner);
                          handleInputChange("assignedPartner", tempSelectedPartner.name);
                          setIsPartnerSearchOpen(false);
                        }}
                        style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: '10px', gap: '10px', margin: '0 auto', width: '88px', height: '40px', background: '#008FED', borderRadius: '6px', border: 'none', cursor: 'pointer' }}
                        data-testid="button-apply-partner"
                      >
                        <span style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '16px', lineHeight: '128%', letterSpacing: '-0.02em', color: '#FDFDFD' }}>
                          적용
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
