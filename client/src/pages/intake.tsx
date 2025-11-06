import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { User } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { Star, Minus, ChevronDown, Calendar, HelpCircle } from "lucide-react";
import logoIcon from "@assets/Frame 2_1762217940686.png";

export default function Intake() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeMenu, setActiveMenu] = useState("접수하기");
  const [basicInfoOpen, setBasicInfoOpen] = useState(true);
  const [insuredInfoOpen, setInsuredInfoOpen] = useState(true);
  const [sameAsPolicyHolder, setSameAsPolicyHolder] = useState(false);
  
  const { data: user, isLoading: userLoading } = useQuery<User>({
    queryKey: ["/api/user"],
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
      toast({ description: "접수가 저장되었습니다." });
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
    if (!formData.insuranceAccidentNo && !formData.insurancePolicyNo) {
      toast({
        description: "보험사 증권번호 또는 보험사 사고번호 중 하나는 반드시 입력해야 합니다.",
        variant: "destructive",
      });
      return;
    }
    submitMutation.mutate(formData);
  };

  const menuItems = [
    { name: "홈", active: false },
    { name: "접수하기", active: true },
    { name: "진행상황", active: false },
    { name: "현장조사", active: false },
    { name: "종합진행관리", active: false },
    { name: "통계 및 정산", active: false },
    { name: "관리자 설정", active: false },
  ];

  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  if (userLoading || !user) {
    return null;
  }

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
              }}
              data-testid={`menu-${item.name}`}
            >
              {item.name}
            </button>
          ))}
        </div>

        {/* User Profile */}
        <div className="flex items-center gap-3">
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(0, 143, 237, 0.3)' }}
          />
          <div className="flex items-center gap-2">
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
        </div>
      </header>

      <main className="relative flex-1 p-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2 mb-6">
            <h1 className="text-2xl font-semibold" style={{ fontFamily: "Pretendard" }}>
              새로운 접수
            </h1>
            <Star className="h-6 w-6 text-muted-foreground cursor-pointer hover-elevate" data-testid="button-favorite" />
          </div>

          <Card className="p-6" style={{ boxShadow: "0px 0px 20px #DBE9F5" }}>
            <Collapsible open={basicInfoOpen} onOpenChange={setBasicInfoOpen}>
              <div className="flex items-center justify-between pb-4 border-b">
                <h2 className="text-lg font-semibold" style={{ fontFamily: "Pretendard" }}>기본 정보</h2>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" data-testid="button-toggle-basic-info">
                    {basicInfoOpen ? <Minus className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
              </div>
              
              <CollapsibleContent>
                <div className="grid grid-cols-2 gap-6 pt-6">
                  <div>
                    <Label className="text-sm text-muted-foreground mb-2">접수번호</Label>
                    <Input
                      placeholder="접수번호"
                      disabled
                      className="bg-muted/50"
                      data-testid="input-case-number"
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground mb-2">접수일자</Label>
                    <div className="relative">
                      <Input
                        type="date"
                        placeholder="접수일자"
                        value={formData.accidentDate}
                        onChange={(e) => handleInputChange("accidentDate", e.target.value)}
                        className="pr-10"
                        data-testid="input-accident-date"
                      />
                      <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            <div className="mt-6 pt-6 border-t">
              <Collapsible open={insuredInfoOpen} onOpenChange={setInsuredInfoOpen}>
                <div className="flex items-center justify-between pb-4 border-b">
                  <h2 className="text-2xl font-semibold" style={{ fontFamily: "Pretendard" }}>피보험자 및 피해자 정보</h2>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" data-testid="button-toggle-insured-info">
                      {insuredInfoOpen ? <Minus className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </CollapsibleTrigger>
                </div>

                <CollapsibleContent>
                  <div className="pt-6">
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-base font-semibold mb-1" style={{ fontFamily: "Pretendard", color: "rgba(12, 12, 12, 0.8)" }}>
                            보험계약자 및 피보험자 정보
                          </h3>
                          <p className="text-sm" style={{ fontFamily: "Pretendard", color: "rgba(12, 12, 12, 0.5)" }}>
                            보험 계약자, 피보험자 중 한 가지는 반드시 기입해야 합니다.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="same-as-policy-holder"
                            checked={sameAsPolicyHolder}
                            onCheckedChange={(checked) => setSameAsPolicyHolder(checked as boolean)}
                            data-testid="checkbox-same-as-policy-holder"
                          />
                          <Label
                            htmlFor="same-as-policy-holder"
                            className="text-sm cursor-pointer"
                            style={{ fontFamily: "Pretendard", color: "#686A6E" }}
                          >
                            보험계약자 = 피보험자
                          </Label>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-6">
                          <div>
                            <Label className="text-sm mb-2" style={{ color: "#686A6E" }}>보험계약자</Label>
                            <Input
                              placeholder="보험사 선택"
                              value={formData.policyHolderName}
                              onChange={(e) => handleInputChange("policyHolderName", e.target.value)}
                              data-testid="input-policy-holder-name"
                            />
                          </div>
                          <div>
                            <Label className="text-sm mb-2" style={{ color: "#686A6E" }}>피보험자</Label>
                            <Input
                              placeholder="피보험사 성명"
                              value={formData.insuredIdNumber}
                              onChange={(e) => handleInputChange("insuredIdNumber", e.target.value)}
                              data-testid="input-insured-id-number"
                            />
                          </div>
                          <div>
                            <Label className="text-sm mb-2" style={{ color: "#686A6E" }}>피보험자 성명*</Label>
                            <Input
                              placeholder="피보험자 성명*"
                              value={formData.insuredName}
                              onChange={(e) => handleInputChange("insuredName", e.target.value)}
                              disabled={sameAsPolicyHolder}
                              data-testid="input-insured-name"
                            />
                          </div>
                        </div>

                        <div>
                          <Label className="text-sm mb-2" style={{ color: "#686A6E" }}>피보험자 주소*</Label>
                          <Input
                            placeholder="도로명 주소, 동/호 포함"
                            value={formData.insuredAddress}
                            onChange={(e) => handleInputChange("insuredAddress", e.target.value)}
                            data-testid="input-insured-address"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-6 border-t">
                      <h3 className="text-base font-semibold mb-4" style={{ fontFamily: "Pretendard", color: "rgba(12, 12, 12, 0.8)" }}>
                        피해자 정보
                      </h3>
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <Label className="text-sm mb-2" style={{ color: "#686A6E" }}>피해자</Label>
                          <Input
                            placeholder="피해자 성명"
                            value={formData.victimName}
                            onChange={(e) => handleInputChange("victimName", e.target.value)}
                            data-testid="input-victim-name"
                          />
                        </div>
                        <div>
                          <Label className="text-sm mb-2" style={{ color: "#686A6E" }}>피해자 연락처</Label>
                          <Input
                            placeholder="피해자 연락처"
                            value={formData.victimContact}
                            onChange={(e) => handleInputChange("victimContact", e.target.value)}
                            data-testid="input-victim-contact"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            <div className="mt-6 pt-6 border-t">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-lg font-semibold" style={{ fontFamily: "Pretendard" }}>보험 정보</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                보험사 증권번호, 생명사 사고번호 중 한 가지는 반드시 기입해야 합니다.
              </p>
              
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <Label className="text-sm text-muted-foreground mb-2">보험사</Label>
                  <Select
                    value={formData.insuranceCompany}
                    onValueChange={(value) => handleInputChange("insuranceCompany", value)}
                  >
                    <SelectTrigger data-testid="select-insurance-company">
                      <SelectValue placeholder="보험사 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="삼성화재">삼성화재</SelectItem>
                      <SelectItem value="현대해상">현대해상</SelectItem>
                      <SelectItem value="DB손해보험">DB손해보험</SelectItem>
                      <SelectItem value="KB손해보험">KB손해보험</SelectItem>
                      <SelectItem value="메리츠화재">메리츠화재</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground mb-2">보험사 증권번호</Label>
                  <Input
                    placeholder="보험사 사고번호"
                    value={formData.insurancePolicyNo}
                    onChange={(e) => handleInputChange("insurancePolicyNo", e.target.value)}
                    data-testid="input-insurance-policy-no"
                  />
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground mb-2">보험사 사고번호</Label>
                  <Input
                    placeholder="보험사 사고번호"
                    value={formData.insuranceAccidentNo}
                    onChange={(e) => handleInputChange("insuranceAccidentNo", e.target.value)}
                    data-testid="input-insurance-accident-no"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-lg font-semibold" style={{ fontFamily: "Pretendard" }}>의뢰자 정보</h2>
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </div>
              
              <div className="grid grid-cols-4 gap-6">
                <div>
                  <Label className="text-sm text-muted-foreground mb-2">거주지</Label>
                  <Select
                    value={formData.clientResidence}
                    onValueChange={(value) => handleInputChange("clientResidence", value)}
                  >
                    <SelectTrigger data-testid="select-client-residence">
                      <SelectValue placeholder="의뢰자 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="서울">서울</SelectItem>
                      <SelectItem value="경기">경기</SelectItem>
                      <SelectItem value="인천">인천</SelectItem>
                      <SelectItem value="부산">부산</SelectItem>
                      <SelectItem value="대구">대구</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground mb-2">소속/시절</Label>
                  <Input
                    placeholder="소속/부서명"
                    value={formData.clientDepartment}
                    onChange={(e) => handleInputChange("clientDepartment", e.target.value)}
                    data-testid="input-client-department"
                  />
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground mb-2">의뢰자</Label>
                  <Select
                    value={formData.clientName}
                    onValueChange={(value) => handleInputChange("clientName", value)}
                  >
                    <SelectTrigger data-testid="select-client-name">
                      <SelectValue placeholder="의뢰자 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="김철수">김철수</SelectItem>
                      <SelectItem value="이영희">이영희</SelectItem>
                      <SelectItem value="박민수">박민수</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground mb-2">의뢰자 담당자 연락처</Label>
                  <Input
                    placeholder="의뢰자 담당자 연락처"
                    value={formData.clientContact}
                    onChange={(e) => handleInputChange("clientContact", e.target.value)}
                    data-testid="input-client-contact"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-lg font-semibold" style={{ fontFamily: "Pretendard" }}>심사자 정보</h2>
              </div>
              
              <div className="grid grid-cols-4 gap-6">
                <div>
                  <Label className="text-sm text-muted-foreground mb-2">심사자</Label>
                  <Select
                    value={formData.assessorId}
                    onValueChange={(value) => handleInputChange("assessorId", value)}
                  >
                    <SelectTrigger data-testid="select-assessor">
                      <SelectValue placeholder="심사자 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="assessor1">심사자1</SelectItem>
                      <SelectItem value="assessor2">심사자2</SelectItem>
                      <SelectItem value="assessor3">심사자3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground mb-2">소속/시절</Label>
                  <Input
                    placeholder="소속/부서명"
                    value={formData.assessorDepartment}
                    onChange={(e) => handleInputChange("assessorDepartment", e.target.value)}
                    data-testid="input-assessor-department"
                  />
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground mb-2">심사팀</Label>
                  <Select
                    value={formData.assessorTeam}
                    onValueChange={(value) => handleInputChange("assessorTeam", value)}
                  >
                    <SelectTrigger data-testid="select-assessor-team">
                      <SelectValue placeholder="심사자 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="team1">심사팀1</SelectItem>
                      <SelectItem value="team2">심사팀2</SelectItem>
                      <SelectItem value="team3">심사팀3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground mb-2">심사자 연락처</Label>
                  <Input
                    placeholder="심사자 연락처"
                    value={formData.assessorContact}
                    onChange={(e) => handleInputChange("assessorContact", e.target.value)}
                    data-testid="input-assessor-contact"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-lg font-semibold" style={{ fontFamily: "Pretendard" }}>조사자 정보</h2>
              </div>
              
              <div className="grid grid-cols-4 gap-6">
                <div>
                  <Label className="text-sm text-muted-foreground mb-2">순서팀</Label>
                  <Input
                    placeholder="순서팀"
                    value={formData.investigatorTeam}
                    onChange={(e) => handleInputChange("investigatorTeam", e.target.value)}
                    data-testid="input-investigator-team"
                  />
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground mb-2">소속/부서</Label>
                  <Input
                    placeholder="소속/부서명"
                    value={formData.investigatorDepartment}
                    onChange={(e) => handleInputChange("investigatorDepartment", e.target.value)}
                    data-testid="input-investigator-department"
                  />
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground mb-2">조사팀</Label>
                  <Select
                    value={formData.investigatorTeamName}
                    onValueChange={(value) => handleInputChange("investigatorTeamName", value)}
                  >
                    <SelectTrigger data-testid="select-investigator-team-name">
                      <SelectValue placeholder="조사자 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="investigator1">조사팀1</SelectItem>
                      <SelectItem value="investigator2">조사팀2</SelectItem>
                      <SelectItem value="investigator3">조사팀3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground mb-2">조사자 연락처</Label>
                  <Input
                    placeholder="조사자 연락처"
                    value={formData.investigatorContact}
                    onChange={(e) => handleInputChange("investigatorContact", e.target.value)}
                    data-testid="input-investigator-contact"
                  />
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={handleSave}
                disabled={saveMutation.isPending}
                data-testid="button-save"
              >
                {saveMutation.isPending ? "저장 중..." : "저장"}
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitMutation.isPending}
                data-testid="button-submit"
              >
                {submitMutation.isPending ? "접수 중..." : "접수 완료"}
              </Button>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
