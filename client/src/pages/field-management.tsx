import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { User, Case } from "@shared/schema";
import { ChevronDown, ChevronRight, ChevronUp, Calendar as CalendarIcon, Clock, X, Plus, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

export default function FieldManagement() {
  const [selectedCase, setSelectedCase] = useState<string>("");
  
  // Collapsible states - intake.tsx 스타일
  const [scheduleOpen, setScheduleOpen] = useState(true);
  const [basicInfoOpen, setBasicInfoOpen] = useState(true);
  const [damageInfoOpen, setDamageInfoOpen] = useState(true);
  const [insuranceInfoOpen, setInsuranceInfoOpen] = useState(true);
  const [insuredInfoOpen, setInsuredInfoOpen] = useState(true);
  const [recoveryMethodOpen, setRecoveryMethodOpen] = useState(true);
  

  const [accidentDate, setAccidentDate] = useState<Date | undefined>(undefined);
  const [accidentTime, setAccidentTime] = useState("");
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  
  // 현장조사 정보 관련 상태
  const [visitDate, setVisitDate] = useState<Date | undefined>(undefined);
  const [visitTime, setVisitTime] = useState("");
  const [visitDatePickerOpen, setVisitDatePickerOpen] = useState(false);
  const [travelDistance, setTravelDistance] = useState("");
  const [dispatchLocation, setDispatchLocation] = useState("");
  const [accompaniedPerson, setAccompaniedPerson] = useState("");
  const [accidentCategory, setAccidentCategory] = useState("배관");
  const [accidentCause, setAccidentCause] = useState("");
  const [specialNotes, setSpecialNotes] = useState("");
  const [victimName, setVictimName] = useState("");
  const [victimContact, setVictimContact] = useState("");
  const [victimAddress, setVictimAddress] = useState("");
  const [additionalVictims, setAdditionalVictims] = useState<Array<{name: string, phone: string, address: string}>>([]);
  const [voc, setVoc] = useState("");
  
  // 피해 복구 방식 및 차액 유형 관련 상태
  const [processingTypes, setProcessingTypes] = useState<Set<string>>(new Set());
  const [processingTypeOther, setProcessingTypeOther] = useState("");
  const [recoveryMethodType, setRecoveryMethodType] = useState("부분수리");

  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  // 접수건 목록 가져오기
  const { data: allCases, isLoading: casesLoading } = useQuery<Case[]>({
    queryKey: ["/api/cases"],
  });

  if (!user) {
    return null;
  }

  // 협력사만 입력 가능
  const isPartner = user.role === "협력사";
  const isReadOnly = !isPartner;

  // 협력사는 자신에게 배당된 케이스만, 관리자는 모든 케이스 표시
  const availableCases = isPartner 
    ? allCases?.filter(c => c.assignedPartner === user.company) || []
    : allCases || [];

  // 선택한 케이스 데이터 가져오기
  const selectedCaseData = useMemo(() => {
    if (!selectedCase || !availableCases) return null;
    return availableCases.find(c => c.id === selectedCase) || null;
  }, [selectedCase, availableCases]);

  // 케이스 선택 관리: 첫 번째 케이스 자동 선택 & 현재 선택된 케이스가 목록에 없으면 초기화
  useEffect(() => {
    if (availableCases.length === 0) {
      // 케이스가 없으면 선택 해제
      setSelectedCase("");
      return;
    }

    // 현재 선택된 케이스가 목록에 없으면 (재배당되거나 삭제됨)
    const isCurrentCaseAvailable = selectedCase && availableCases.some(c => c.id === selectedCase);
    
    if (!isCurrentCaseAvailable) {
      // 첫 번째 케이스로 자동 선택
      setSelectedCase(availableCases[0].id);
    }
  }, [availableCases, selectedCase]);

  // 선택한 케이스의 데이터를 폼에 로드
  useEffect(() => {
    if (!selectedCaseData) {
      // 케이스가 없으면 모든 state 초기화
      setAccidentDate(undefined);
      setAccidentTime("");
      setVisitDate(undefined);
      setVisitTime("");
      setTravelDistance("");
      setDispatchLocation("");
      setAccompaniedPerson("");
      setAccidentCategory("배관");
      setAccidentCause("");
      setSpecialNotes("");
      setVictimName("");
      setVictimContact("");
      setVictimAddress("");
      setAdditionalVictims([]);
      setVoc("");
      setProcessingTypes(new Set());
      setProcessingTypeOther("");
      setRecoveryMethodType("부분수리");
      return;
    }

    // 사고 발생일시
    if (selectedCaseData.accidentDate) {
      try {
        const [datePart, timePart] = selectedCaseData.accidentDate.split(' ');
        if (datePart) {
          setAccidentDate(new Date(datePart));
        }
        if (timePart) {
          setAccidentTime(timePart);
        }
      } catch (e) {
        console.error("Error parsing accident date:", e);
      }
    } else {
      setAccidentDate(undefined);
      setAccidentTime("");
    }

    // 현장조사 정보
    if (selectedCaseData.fieldSurveyDate) {
      try {
        const [datePart, timePart] = selectedCaseData.fieldSurveyDate.split(' ');
        if (datePart) {
          setVisitDate(new Date(datePart));
        }
        if (timePart) {
          setVisitTime(timePart);
        }
      } catch (e) {
        console.error("Error parsing visit date:", e);
      }
    } else {
      setVisitDate(undefined);
      setVisitTime("");
    }

    // 출동담당자 및 현장 정보
    setAccompaniedPerson(selectedCaseData.accompaniedPerson || "");
    setTravelDistance(selectedCaseData.travelDistance || "");
    setDispatchLocation(selectedCaseData.dispatchLocation || "");

    // 사고 정보
    setAccidentCategory(selectedCaseData.accidentType || "배관");
    setAccidentCause(selectedCaseData.accidentCause || "");
    setSpecialNotes(selectedCaseData.specialNotes || "");

    // 피해자 정보
    setVictimName(selectedCaseData.victimName || "");
    setVictimContact(selectedCaseData.victimContact || "");
    setVictimAddress(selectedCaseData.victimAddress || "");
    
    // 추가 피해자 목록 (JSON 파싱)
    if (selectedCaseData.additionalVictims) {
      try {
        const parsed = JSON.parse(selectedCaseData.additionalVictims);
        setAdditionalVictims(Array.isArray(parsed) ? parsed : []);
      } catch (e) {
        console.error("Error parsing additionalVictims:", e);
        setAdditionalVictims([]);
      }
    } else {
      setAdditionalVictims([]);
    }

    // VOC 정보
    setVoc(selectedCaseData.specialRequests || "");

  }, [selectedCaseData]);

  // intake.tsx 스타일 입력 필드 클래스
  const intakeFieldClass = "h-[68px] px-5 py-2.5 bg-[#FDFDFD] border-2 border-[rgba(12,12,12,0.08)] rounded-lg";
  const intakeFieldStyle = {
    fontFamily: "Pretendard",
    fontWeight: 600,
    fontSize: "16px",
    letterSpacing: "-0.02em",
    color: "#0C0C0C",
  };
  
  // intake.tsx 스타일 버튼 클래스 (68px 높이 통일)
  const intakeButtonClass = "h-[68px] px-4 rounded transition-colors";
  const intakeButtonStyle = {
    fontFamily: "Pretendard",
    fontSize: "14px",
    fontWeight: 500,
  };

  // SectionCard: intake.tsx 스타일의 Collapsible 카드
  const SectionCard = ({
    title,
    isOpen,
    onToggle,
    children,
    disabled = false,
  }: {
    title: string;
    isOpen: boolean;
    onToggle: () => void;
    children: React.ReactNode;
    disabled?: boolean;
  }) => (
    <div
      style={{
        background: '#FFFFFF',
        boxShadow: '0px 0px 20px #DBE9F5',
        borderRadius: '12px',
        marginBottom: '20px',
      }}
    >
      <Collapsible open={isOpen} onOpenChange={onToggle}>
        {/* 헤더 */}
        <div
          style={{
            padding: '24px',
            height: '82px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h3
            style={{
              fontFamily: "Pretendard",
              fontSize: "20px",
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color: "#0C0C0C",
            }}
          >
            {title}
          </h3>
          <CollapsibleTrigger asChild>
            <button
              className="flex items-center gap-1 px-3 py-2 rounded hover-elevate active-elevate-2"
              disabled={disabled}
              data-testid={`button-toggle-${title}`}
            >
              {isOpen ? (
                <ChevronUp className="w-5 h-5" style={{ color: "rgba(12, 12, 12, 0.6)" }} />
              ) : (
                <ChevronDown className="w-5 h-5" style={{ color: "rgba(12, 12, 12, 0.6)" }} />
              )}
            </button>
          </CollapsibleTrigger>
        </div>

        {/* 콘텐츠 */}
        <CollapsibleContent>
          <div style={{ padding: '0 24px 24px 24px' }}>
            {children}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );

  return (
    <div className="relative p-8">
      {/* 현장일력 섹션 */}
      <SectionCard
        title="현장일력"
        isOpen={scheduleOpen}
        onToggle={() => setScheduleOpen(!scheduleOpen)}
      >
        <div>
          <p 
            className="mb-3"
            style={{
              fontFamily: "Pretendard",
              fontSize: "14px",
              fontWeight: 500,
              color: "rgba(12, 12, 12, 0.7)",
            }}
          >
            접수건 선택
          </p>
            
            {/* 접수건 드롭다운 */}
            {casesLoading ? (
              <div className="text-center py-8" style={{ fontFamily: "Pretendard", color: "rgba(12, 12, 12, 0.5)" }}>
                접수건을 불러오는 중...
              </div>
            ) : availableCases.length === 0 ? (
              <div className="text-center py-8" style={{ fontFamily: "Pretendard", color: "rgba(12, 12, 12, 0.5)" }}>
                {isPartner ? "배당된 접수건이 없습니다." : "등록된 접수건이 없습니다."}
              </div>
            ) : (
              <Select
                value={selectedCase}
                onValueChange={(value) => !isReadOnly && setSelectedCase(value)}
                disabled={isReadOnly}
              >
                <SelectTrigger 
                  className="border-0 focus:ring-0"
                  style={{
                    width: "788px",
                    height: "auto",
                    padding: "20px 24px",
                    background: "#F0F1F3",
                    borderRadius: "12px",
                  }}
                  data-testid="select-case"
                >
                  {selectedCaseData ? (
                    <div className="flex flex-col gap-2 w-full">
                      {/* 첫 번째 줄: 파란 점 + 보험사명 + 케이스 번호 */}
                      <div className="flex items-center gap-2">
                        <span 
                          className="rounded-full"
                          style={{
                            width: "8px",
                            height: "8px",
                            background: "#008FED",
                            flexShrink: 0,
                          }}
                        />
                        <span
                          style={{
                            fontFamily: "Pretendard",
                            fontSize: "18px",
                            fontWeight: 600,
                            letterSpacing: "-0.02em",
                            color: "#0C0C0C",
                          }}
                        >
                          {selectedCaseData.insuranceCompany || "보험사 미지정"} {selectedCaseData.caseNumber || ""}
                        </span>
                      </div>
                      {/* 두 번째 줄: 접수번호, 계약자, 담당자 */}
                      <div 
                        className="flex items-center gap-4"
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          fontWeight: 500,
                          color: "rgba(12, 12, 12, 0.6)",
                        }}
                      >
                        <span>접수번호 {selectedCaseData.insuranceAccidentNo || "-"}</span>
                        <span>계약자 {selectedCaseData.policyHolderName || "-"}</span>
                        <span>담당자 {selectedCaseData.assignedPartnerManager || "-"}</span>
                      </div>
                    </div>
                  ) : (
                    <span
                      style={{
                        fontFamily: "Pretendard",
                        fontSize: "16px",
                        color: "rgba(12, 12, 12, 0.5)",
                      }}
                    >
                      접수건을 선택하세요
                    </span>
                  )}
                </SelectTrigger>
                <SelectContent>
                  {availableCases.map((caseItem) => (
                    <SelectItem 
                      key={caseItem.id} 
                      value={caseItem.id}
                      data-testid={`case-option-${caseItem.id}`}
                    >
                      <div className="flex flex-col gap-1 py-1">
                        {/* 첫 번째 줄: 파란 점 + 보험사명 + 케이스 번호 */}
                        <div className="flex items-center gap-2">
                          <span 
                            className="rounded-full"
                            style={{
                              width: "6px",
                              height: "6px",
                              background: "#008FED",
                              flexShrink: 0,
                            }}
                          />
                          <span
                            style={{
                              fontFamily: "Pretendard",
                              fontSize: "16px",
                              fontWeight: 600,
                              letterSpacing: "-0.02em",
                              color: "#0C0C0C",
                            }}
                          >
                            {caseItem.insuranceCompany || "보험사 미지정"} {caseItem.caseNumber || ""}
                          </span>
                        </div>
                        {/* 두 번째 줄: 접수번호, 계약자, 담당자 */}
                        <div 
                          className="flex items-center gap-3 pl-4"
                          style={{
                            fontFamily: "Pretendard",
                            fontSize: "12px",
                            fontWeight: 500,
                            color: "rgba(12, 12, 12, 0.6)",
                          }}
                        >
                          <span>접수번호 {caseItem.insuranceAccidentNo || "-"}</span>
                          <span>계약자 {caseItem.policyHolderName || "-"}</span>
                          <span>담당자 {caseItem.assignedPartnerManager || "-"}</span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </SectionCard>

        {/* 접수정보 섹션 */}
        <SectionCard
          title="접수정보"
          isOpen={true}
          onToggle={() => {}}
          disabled={!selectedCaseData}
        >
          <div className="grid grid-cols-2 gap-4">
            {/* 접수번호 */}
            <div>
              <Label 
                htmlFor="case-number"
                className="mb-2"
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "rgba(12, 12, 12, 0.7)",
                }}
              >
                접수번호
              </Label>
              <Input
                id="case-number"
                value={selectedCaseData?.caseNumber || ""}
                readOnly
                className={intakeFieldClass}
                style={{
                  ...intakeFieldStyle,
                  background: "rgba(12, 12, 12, 0.03)",
                  color: "rgba(12, 12, 12, 0.5)",
                }}
                data-testid="input-case-number"
              />
            </div>
            
            {/* 보험사 */}
            <div>
              <Label 
                htmlFor="insurance-company-display"
                className="mb-2"
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "rgba(12, 12, 12, 0.7)",
                }}
              >
                보험사
              </Label>
              <Input
                id="insurance-company-display"
                value={selectedCaseData?.insuranceCompany || ""}
                readOnly
                placeholder="보험회사 선택"
                className={intakeFieldClass}
                style={{
                  ...intakeFieldStyle,
                  background: "rgba(12, 12, 12, 0.03)",
                  color: "rgba(12, 12, 12, 0.5)",
                }}
                data-testid="input-insurance-company-display"
              />
            </div>
          </div>
        </SectionCard>

        {/* 현장정보 섹션 */}
        <SectionCard
          title="현장정보"
          isOpen={true}
          onToggle={() => {}}
          disabled={!selectedCaseData}
        >
          <div className="grid grid-cols-3 gap-4">
            {/* 방문 일시 */}
            <div>
              <Label 
                htmlFor="visit-date"
                className="mb-3"
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "rgba(12, 12, 12, 0.7)",
                }}
              >
                방문 일시
              </Label>
              <div className="flex gap-2">
                <Popover open={visitDatePickerOpen} onOpenChange={setVisitDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={intakeButtonClass}
                      style={{
                        ...intakeButtonStyle,
                        justifyContent: "flex-start",
                        background: "#FDFDFD",
                        border: "2px solid rgba(12,12,12,0.08)",
                        flex: 1,
                      }}
                      disabled={isReadOnly}
                      data-testid="button-visit-date"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {visitDate ? format(visitDate, "yyyy.MM.dd", { locale: ko }) : <span>날짜 선택</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={visitDate}
                      onSelect={(date) => {
                        setVisitDate(date);
                        setVisitDatePickerOpen(false);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Input
                  type="time"
                  value={visitTime}
                  onChange={(e) => setVisitTime(e.target.value)}
                  className={intakeFieldClass}
                  style={{
                    ...intakeFieldStyle,
                    flex: 1,
                  }}
                  disabled={isReadOnly}
                  data-testid="input-visit-time"
                />
              </div>
            </div>

            {/* 현장 이동 거리 */}
            <div>
              <Label 
                htmlFor="travel-distance"
                className="mb-3"
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "rgba(12, 12, 12, 0.7)",
                }}
              >
                현장 이동 거리
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="travel-distance"
                  type="number"
                  value={travelDistance}
                  onChange={(e) => setTravelDistance(e.target.value)}
                  className={intakeFieldClass}
                  style={{
                    ...intakeFieldStyle,
                    flex: 1,
                  }}
                  disabled={isReadOnly}
                  placeholder="0"
                  data-testid="input-travel-distance"
                />
                <span
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "16px",
                    fontWeight: 600,
                    color: "#0C0C0C",
                  }}
                >
                  km
                </span>
              </div>
            </div>

            {/* 출동 업장지 */}
            <div>
              <Label 
                htmlFor="dispatch-location"
                className="mb-3"
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "rgba(12, 12, 12, 0.7)",
                }}
              >
                출동 업장지
              </Label>
              <Input
                id="dispatch-location"
                value={dispatchLocation}
                onChange={(e) => setDispatchLocation(e.target.value)}
                className={intakeFieldClass}
                style={intakeFieldStyle}
                disabled={isReadOnly}
                placeholder="출동 업장지 설명"
                data-testid="input-dispatch-location"
              />
            </div>
          </div>
        </SectionCard>

        {/* 기본정보 섹션 */}
        <SectionCard
          title="기본정보"
          isOpen={basicInfoOpen}
          onToggle={() => setBasicInfoOpen(!basicInfoOpen)}
          disabled={!selectedCaseData}
        >
          <div className="space-y-6">
            {/* 사고 발생일시 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label 
                  htmlFor="accident-date"
                  className="mb-2"
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "rgba(12, 12, 12, 0.7)",
                  }}
                >
                  사고 발생일시
                </Label>
                <div className="flex gap-2">
                  <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={intakeButtonClass}
                        style={{
                          ...intakeButtonStyle,
                          justifyContent: "flex-start",
                          background: "#FDFDFD",
                          border: "2px solid rgba(12,12,12,0.08)",
                        }}
                        disabled={isReadOnly}
                        data-testid="button-accident-date"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {accidentDate ? format(accidentDate, "PPP", { locale: ko }) : <span>날짜 선택</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={accidentDate}
                        onSelect={(date) => {
                          setAccidentDate(date);
                          setDatePickerOpen(false);
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <Input
                    type="time"
                    value={accidentTime}
                    onChange={(e) => setAccidentTime(e.target.value)}
                    className={intakeFieldClass}
                    style={intakeFieldStyle}
                    disabled={isReadOnly}
                    data-testid="input-accident-time"
                  />
                </div>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* 피해 및 복구 평가 섹션 */}
        <SectionCard
          title="피해 및 복구 평가"
          isOpen={damageInfoOpen}
          onToggle={() => setDamageInfoOpen(!damageInfoOpen)}
          disabled={!selectedCaseData}
        >
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label 
                  htmlFor="travel-distance"
                  className="mb-2"
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "rgba(12, 12, 12, 0.7)",
                  }}
                >
                  이동거리
                </Label>
                <Input
                  id="travel-distance"
                  value={travelDistance}
                  onChange={(e) => setTravelDistance(e.target.value)}
                  placeholder="예: 15km"
                  className={intakeFieldClass}
                  style={intakeFieldStyle}
                  disabled={isReadOnly}
                  data-testid="input-travel-distance"
                />
              </div>
              <div>
                <Label 
                  htmlFor="accompanied-person"
                  className="mb-2"
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "rgba(12, 12, 12, 0.7)",
                  }}
                >
                  출동담당자
                </Label>
                <Input
                  id="accompanied-person"
                  value={accompaniedPerson}
                  onChange={(e) => setAccompaniedPerson(e.target.value)}
                  placeholder="출동담당자 입력"
                  className={intakeFieldClass}
                  style={intakeFieldStyle}
                  disabled={isReadOnly}
                  data-testid="input-accompanied-person"
                />
              </div>
            </div>

            {/* 현장출동 일시 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label 
                  htmlFor="visit-date"
                  className="mb-2"
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "rgba(12, 12, 12, 0.7)",
                  }}
                >
                  현장출동 일시
                </Label>
                <div className="flex gap-2">
                  <Popover open={visitDatePickerOpen} onOpenChange={setVisitDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={intakeButtonClass}
                        style={{
                          ...intakeButtonStyle,
                          justifyContent: "flex-start",
                          background: "#FDFDFD",
                          border: "2px solid rgba(12,12,12,0.08)",
                        }}
                        disabled={isReadOnly}
                        data-testid="button-visit-date"
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {visitDate ? format(visitDate, "PPP", { locale: ko }) : <span>날짜 선택</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={visitDate}
                        onSelect={(date) => {
                          setVisitDate(date);
                          setVisitDatePickerOpen(false);
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <Input
                    type="time"
                    value={visitTime}
                    onChange={(e) => setVisitTime(e.target.value)}
                    className={intakeFieldClass}
                    style={intakeFieldStyle}
                    disabled={isReadOnly}
                    data-testid="input-visit-time"
                  />
                </div>
              </div>
            </div>

            {/* 사고 정보 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label 
                  htmlFor="accident-category"
                  className="mb-2"
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "rgba(12, 12, 12, 0.7)",
                  }}
                >
                  사고 구분
                </Label>
                <Select
                  value={accidentCategory}
                  onValueChange={setAccidentCategory}
                  disabled={isReadOnly}
                >
                  <SelectTrigger 
                    id="accident-category" 
                    className={intakeFieldClass}
                    style={intakeFieldStyle}
                    data-testid="select-accident-category"
                  >
                    <SelectValue placeholder="사고 구분 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="배관">배관</SelectItem>
                    <SelectItem value="화재">화재</SelectItem>
                    <SelectItem value="누수">누수</SelectItem>
                    <SelectItem value="기타">기타</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label 
                  htmlFor="accident-cause"
                  className="mb-2"
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "rgba(12, 12, 12, 0.7)",
                  }}
                >
                  사고 원인
                </Label>
                <Input
                  id="accident-cause"
                  value={accidentCause}
                  onChange={(e) => setAccidentCause(e.target.value)}
                  placeholder="사고 원인 입력"
                  className={intakeFieldClass}
                  style={intakeFieldStyle}
                  disabled={isReadOnly}
                  data-testid="input-accident-cause"
                />
              </div>
            </div>

            {/* 특이사항 */}
            <div>
              <Label 
                htmlFor="special-notes"
                className="mb-2"
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "rgba(12, 12, 12, 0.7)",
                }}
              >
                특이사항
              </Label>
              <Textarea
                id="special-notes"
                value={specialNotes}
                onChange={(e) => setSpecialNotes(e.target.value)}
                placeholder="특이사항 입력"
                className="min-h-[120px]"
                style={{
                  ...intakeFieldStyle,
                  padding: "16px 20px",
                  background: "#FDFDFD",
                  border: "2px solid rgba(12,12,12,0.08)",
                  borderRadius: "8px",
                }}
                disabled={isReadOnly}
                data-testid="textarea-special-notes"
              />
            </div>
          </div>
        </SectionCard>

        {/* 보험 및 피보험자 정보 섹션 */}
        <SectionCard
          title="보험 및 피보험자 정보"
          isOpen={insuranceInfoOpen}
          onToggle={() => setInsuranceInfoOpen(!insuranceInfoOpen)}
          disabled={!selectedCaseData}
        >
          <div className="space-y-6">
            {/* 보험사명, 증권번호 - readonly */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label 
                  className="mb-2"
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "rgba(12, 12, 12, 0.7)",
                  }}
                >
                  보험사명
                </Label>
                <Input
                  value={selectedCaseData?.insuranceCompany || ""}
                  readOnly
                  className={intakeFieldClass}
                  style={{
                    ...intakeFieldStyle,
                    background: "rgba(12, 12, 12, 0.03)",
                    color: "rgba(12, 12, 12, 0.5)",
                  }}
                  data-testid="input-insurance-company"
                />
              </div>
              <div>
                <Label 
                  className="mb-2"
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "rgba(12, 12, 12, 0.7)",
                  }}
                >
                  증권번호
                </Label>
                <Input
                  value={selectedCaseData?.insurancePolicyNo || ""}
                  readOnly
                  className={intakeFieldClass}
                  style={{
                    ...intakeFieldStyle,
                    background: "rgba(12, 12, 12, 0.03)",
                    color: "rgba(12, 12, 12, 0.5)",
                  }}
                  data-testid="input-insurance-policy-no"
                />
              </div>
            </div>
          </div>
        </SectionCard>

        {/* 피보험자 및 피해자 정보 섹션 */}
        <SectionCard
          title="피보험자 및 피해자 정보"
          isOpen={insuredInfoOpen}
          onToggle={() => setInsuredInfoOpen(!insuredInfoOpen)}
          disabled={!selectedCaseData}
        >
          <div className="space-y-6">
            {/* 피보험자 정보 - readonly */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label 
                  className="mb-2"
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "rgba(12, 12, 12, 0.7)",
                  }}
                >
                  피보험자 성명
                </Label>
                <Input
                  value={selectedCaseData?.insuredName || ""}
                  readOnly
                  className={intakeFieldClass}
                  style={{
                    ...intakeFieldStyle,
                    background: "rgba(12, 12, 12, 0.03)",
                    color: "rgba(12, 12, 12, 0.5)",
                  }}
                  data-testid="input-insured-name"
                />
              </div>
              <div>
                <Label 
                  className="mb-2"
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "rgba(12, 12, 12, 0.7)",
                  }}
                >
                  피보험자 연락처
                </Label>
                <Input
                  value={selectedCaseData?.insuredContact || ""}
                  readOnly
                  className={intakeFieldClass}
                  style={{
                    ...intakeFieldStyle,
                    background: "rgba(12, 12, 12, 0.03)",
                    color: "rgba(12, 12, 12, 0.5)",
                  }}
                  data-testid="input-insured-contact"
                />
              </div>
            </div>

            {/* 피해자 정보 */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label 
                  htmlFor="victim-name"
                  className="mb-2"
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "rgba(12, 12, 12, 0.7)",
                  }}
                >
                  피해자 성명
                </Label>
                <Input
                  id="victim-name"
                  value={victimName}
                  onChange={(e) => setVictimName(e.target.value)}
                  placeholder="피해자 성명"
                  className={intakeFieldClass}
                  style={intakeFieldStyle}
                  disabled={isReadOnly}
                  data-testid="input-victim-name"
                />
              </div>
              <div>
                <Label 
                  htmlFor="victim-contact"
                  className="mb-2"
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "rgba(12, 12, 12, 0.7)",
                  }}
                >
                  피해자 연락처
                </Label>
                <Input
                  id="victim-contact"
                  value={victimContact}
                  onChange={(e) => setVictimContact(e.target.value)}
                  placeholder="피해자 연락처"
                  className={intakeFieldClass}
                  style={intakeFieldStyle}
                  disabled={isReadOnly}
                  data-testid="input-victim-contact"
                />
              </div>
              <div>
                <Label 
                  htmlFor="victim-address"
                  className="mb-2"
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "rgba(12, 12, 12, 0.7)",
                  }}
                >
                  피해자 주소
                </Label>
                <Input
                  id="victim-address"
                  value={victimAddress}
                  onChange={(e) => setVictimAddress(e.target.value)}
                  placeholder="피해자 주소"
                  className={intakeFieldClass}
                  style={intakeFieldStyle}
                  disabled={isReadOnly}
                  data-testid="input-victim-address"
                />
              </div>
            </div>

            {/* 추가 피해자 목록 표시 */}
            {additionalVictims.length > 0 && (
              <div className="space-y-3">
                <Label 
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "rgba(12, 12, 12, 0.7)",
                  }}
                >
                  추가 피해자 목록
                </Label>
                {additionalVictims.map((victim, index) => (
                  <div 
                    key={index}
                    className="grid grid-cols-3 gap-4 p-4 rounded-lg"
                    style={{
                      background: "rgba(12, 12, 12, 0.02)",
                      border: "1px solid rgba(12, 12, 12, 0.08)",
                    }}
                  >
                    <div>
                      <Label 
                        className="mb-1"
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "12px",
                          fontWeight: 500,
                          color: "rgba(12, 12, 12, 0.6)",
                        }}
                      >
                        성명
                      </Label>
                      <p
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          fontWeight: 500,
                          color: "#0C0C0C",
                        }}
                      >
                        {victim.name}
                      </p>
                    </div>
                    <div>
                      <Label 
                        className="mb-1"
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "12px",
                          fontWeight: 500,
                          color: "rgba(12, 12, 12, 0.6)",
                        }}
                      >
                        연락처
                      </Label>
                      <p
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          fontWeight: 500,
                          color: "#0C0C0C",
                        }}
                      >
                        {victim.phone}
                      </p>
                    </div>
                    <div>
                      <Label 
                        className="mb-1"
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "12px",
                          fontWeight: 500,
                          color: "rgba(12, 12, 12, 0.6)",
                        }}
                      >
                        주소
                      </Label>
                      <p
                        style={{
                          fontFamily: "Pretendard",
                          fontSize: "14px",
                          fontWeight: 500,
                          color: "#0C0C0C",
                        }}
                      >
                        {victim.address}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* VOC */}
            <div>
              <Label 
                htmlFor="voc"
                className="mb-2"
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "rgba(12, 12, 12, 0.7)",
                }}
              >
                VOC (고객 요청사항)
              </Label>
              <Textarea
                id="voc"
                value={voc}
                onChange={(e) => setVoc(e.target.value)}
                placeholder="고객 요청사항 입력"
                className="min-h-[120px]"
                style={{
                  ...intakeFieldStyle,
                  padding: "16px 20px",
                  background: "#FDFDFD",
                  border: "2px solid rgba(12,12,12,0.08)",
                  borderRadius: "8px",
                }}
                disabled={isReadOnly}
                data-testid="textarea-voc"
              />
            </div>
          </div>
        </SectionCard>

        {/* 피해 복구 방식 및 차액 유형 섹션 */}
        <SectionCard
          title="피해 복구 방식 및 차액 유형"
          isOpen={recoveryMethodOpen}
          onToggle={() => setRecoveryMethodOpen(!recoveryMethodOpen)}
          disabled={!selectedCaseData}
        >
          <div className="space-y-6">
            {/* 처리유형 (복수 선택 가능) */}
            <div>
              <Label 
                className="mb-3"
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "rgba(12, 12, 12, 0.7)",
                }}
              >
                처리유형 (복수선택 가능)
              </Label>
              <div className="grid grid-cols-3 gap-3">
                {["차액없음", "예상차액발생", "차액발생", "기타"].map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      if (isReadOnly) return;
                      const newSet = new Set(processingTypes);
                      if (newSet.has(type)) {
                        newSet.delete(type);
                      } else {
                        newSet.add(type);
                      }
                      setProcessingTypes(newSet);
                    }}
                    className={intakeButtonClass}
                    style={{
                      ...intakeButtonStyle,
                      background: processingTypes.has(type) ? "#008FED" : "#FDFDFD",
                      color: processingTypes.has(type) ? "#FFFFFF" : "#0C0C0C",
                      border: `2px solid ${processingTypes.has(type) ? "#008FED" : "rgba(12,12,12,0.08)"}`,
                    }}
                    disabled={isReadOnly}
                    data-testid={`button-processing-type-${type}`}
                  >
                    {type}
                  </button>
                ))}
              </div>
              {processingTypes.has("기타") && (
                <Input
                  value={processingTypeOther}
                  onChange={(e) => setProcessingTypeOther(e.target.value)}
                  placeholder="기타 처리유형 입력"
                  className={`${intakeFieldClass} mt-3`}
                  style={intakeFieldStyle}
                  disabled={isReadOnly}
                  data-testid="input-processing-type-other"
                />
              )}
            </div>

            {/* 복구방법 */}
            <div>
              <Label 
                className="mb-3"
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "rgba(12, 12, 12, 0.7)",
                }}
              >
                복구방법
              </Label>
              <div className="grid grid-cols-2 gap-3">
                {["부분수리", "전체수리"].map((method) => (
                  <button
                    key={method}
                    onClick={() => !isReadOnly && setRecoveryMethodType(method)}
                    className={intakeButtonClass}
                    style={{
                      ...intakeButtonStyle,
                      background: recoveryMethodType === method ? "#008FED" : "#FDFDFD",
                      color: recoveryMethodType === method ? "#FFFFFF" : "#0C0C0C",
                      border: `2px solid ${recoveryMethodType === method ? "#008FED" : "rgba(12,12,12,0.08)"}`,
                    }}
                    disabled={isReadOnly}
                    data-testid={`button-recovery-method-${method}`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </SectionCard>
      </div>
  );
}
