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
import { Star, Minus, ChevronDown, Calendar, HelpCircle } from "lucide-react";
import logoIcon from "@assets/Frame 2_1762217940686.png";

export default function Intake() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeMenu, setActiveMenu] = useState("접수하기");
  const [basicInfoOpen, setBasicInfoOpen] = useState(true);
  
  const { data: user, isLoading: userLoading } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  useEffect(() => {
    if (!userLoading && !user) {
      setLocation("/");
    }
  }, [user, userLoading, setLocation]);

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
        description: "보험사 증권번호 또는 보험사 사고번호 중 하나는 반드시 입력해야 합니다.",
        variant: "destructive",
      });
      return;
    }
    submitMutation.mutate(formData);
  };

  const menuItems = [
    { name: "홈", path: "/dashboard" },
    { name: "접수하기", path: "/intake" },
    { name: "진행상황", path: "/progress" },
    { name: "현장조사", path: "/inspection" },
    { name: "종합진행관리", path: "/management" },
    { name: "통계 및 정산", path: "/statistics" },
    { name: "관리자 설정", path: "/admin" },
  ];

  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  if (userLoading || !user) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col" style={{
      background: "linear-gradient(135deg, #FFF5EB 0%, #E8E0FF 100%)",
    }}>
      <header className="bg-white border-b border-border backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <img src={logoIcon} alt="FLOXN" className="h-8" />
              <span className="text-xl font-semibold text-foreground" style={{ fontFamily: "Pretendard" }}>
                FLOXN
              </span>
            </div>
            
            <nav className="flex items-center gap-2">
              {menuItems.map((item) => (
                <Button
                  key={item.name}
                  variant={activeMenu === item.name ? "default" : "ghost"}
                  size="sm"
                  onClick={() => {
                    setActiveMenu(item.name);
                    setLocation(item.path);
                  }}
                  className="text-sm"
                  data-testid={`button-nav-${item.name}`}
                >
                  {item.name}
                </Button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
                {getInitials(user.name)}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground" data-testid="text-username">{user.name}</span>
                <span className="text-xs text-muted-foreground" data-testid="text-role">{user.role}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 p-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2 mb-6">
            <Star className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-2xl font-semibold" style={{ fontFamily: "Pretendard" }}>
              새로운 접수
            </h1>
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
