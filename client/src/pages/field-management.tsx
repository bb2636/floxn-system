import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { User, Case } from "@shared/schema";
import { ChevronDown, ChevronRight, Calendar as CalendarIcon, Clock, X, Plus, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

export default function FieldManagement() {
  const [selectedCase, setSelectedCase] = useState<string>("");
  const [expandedSections, setExpandedSections] = useState({
    schedule: true,
    basic: true,
    fieldSurvey: true,
    recoveryMethod: true,
    reception: true,
    insurance: true,
    accident: true,
  });

  const [accidentDate, setAccidentDate] = useState<Date | undefined>(undefined);
  const [accidentTime, setAccidentTime] = useState("");
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  
  // 현장조사 정보 관련 상태
  const [visitDate, setVisitDate] = useState<Date | undefined>(undefined);
  const [visitTime, setVisitTime] = useState("");
  const [visitDatePickerOpen, setVisitDatePickerOpen] = useState(false);
  const [travelDistance, setTravelDistance] = useState("");
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

    // 사고 정보
    setAccidentCategory(selectedCaseData.accidentType || "배관");
    setAccidentCause(selectedCaseData.accidentCause || "");
    setSpecialNotes(selectedCaseData.specialNotes || "");

    // 피해자 정보
    setVictimName(selectedCaseData.victimName || "");
    setVictimContact(selectedCaseData.victimContact || "");
    setVictimAddress(selectedCaseData.insuredAddress || "");

    // VOC 정보
    setVoc(selectedCaseData.specialRequests || "");

  }, [selectedCaseData]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const SectionHeader = ({ 
    title, 
    sectionKey, 
    hasCollapseButton = true 
  }: { 
    title: string; 
    sectionKey: keyof typeof expandedSections; 
    hasCollapseButton?: boolean 
  }) => (
    <div className="flex items-center justify-between mb-4">
      <h3 
        style={{
          fontFamily: "Pretendard",
          fontSize: "18px",
          fontWeight: 600,
          letterSpacing: "-0.02em",
          color: "#0C0C0C",
        }}
      >
        {title}
      </h3>
      {hasCollapseButton && (
        <button
          onClick={() => toggleSection(sectionKey)}
          className="flex items-center gap-1 px-3 py-1 rounded hover-elevate active-elevate-2"
          style={{
            fontFamily: "Pretendard",
            fontSize: "14px",
            fontWeight: 500,
            color: "rgba(12, 12, 12, 0.6)",
          }}
          data-testid={`button-toggle-${sectionKey}`}
        >
          {expandedSections[sectionKey] ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
      )}
    </div>
  );

  return (
    <div className="relative p-8">
      {/* 현장일력 섹션 */}
      <div className="mb-6 bg-white/60 backdrop-blur-sm rounded-lg p-6 border border-[rgba(0,143,237,0.2)]">
        <SectionHeader title="현장일력" sectionKey="schedule" />
        
        {expandedSections.schedule && (
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
            
            {/* 접수건 카드 리스트 */}
            {casesLoading ? (
              <div className="text-center py-8" style={{ fontFamily: "Pretendard", color: "rgba(12, 12, 12, 0.5)" }}>
                접수건을 불러오는 중...
              </div>
            ) : availableCases.length === 0 ? (
              <div className="text-center py-8" style={{ fontFamily: "Pretendard", color: "rgba(12, 12, 12, 0.5)" }}>
                {isPartner ? "배당된 접수건이 없습니다." : "등록된 접수건이 없습니다."}
              </div>
            ) : (
              <div className="space-y-3">
                {availableCases.map((caseItem) => (
                  <button
                    key={caseItem.id}
                    onClick={() => !isReadOnly && setSelectedCase(caseItem.id)}
                    disabled={isReadOnly}
                    className="w-full text-left rounded-xl transition-all"
                    data-testid={`case-card-${caseItem.id}`}
                    style={{
                      padding: "16px",
                      background: selectedCase === caseItem.id 
                        ? "rgba(12, 12, 12, 0.04)" 
                        : "rgba(255, 255, 255, 0.6)",
                      backdropFilter: "blur(7px)",
                      border: `1px solid ${selectedCase === caseItem.id ? "rgba(0, 143, 237, 0.3)" : "rgba(0, 143, 237, 0.1)"}`,
                      cursor: isReadOnly ? "not-allowed" : "pointer",
                      opacity: isReadOnly ? 0.6 : 1,
                    }}
                  >
                    <div className="flex items-center justify-between gap-4">
                      {/* 왼쪽: 접수건 정보 */}
                      <div className="flex flex-col gap-2 flex-1">
                        {/* 첫 번째 줄: 파란 점 + 보험사명 + 케이스 번호 */}
                        <div className="flex items-center gap-4">
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
                            <div className="flex items-center gap-2">
                              <span
                                style={{
                                  fontFamily: "Pretendard",
                                  fontSize: "18px",
                                  fontWeight: 600,
                                  letterSpacing: "-0.02em",
                                  color: "rgba(12, 12, 12, 0.9)",
                                }}
                              >
                                {caseItem.insuranceCompany || "보험사 미지정"}
                              </span>
                              <span
                                style={{
                                  fontFamily: "Pretendard",
                                  fontSize: "18px",
                                  fontWeight: 600,
                                  letterSpacing: "-0.02em",
                                  color: "rgba(12, 12, 12, 0.9)",
                                }}
                              >
                                {caseItem.insuranceAccidentNo || caseItem.caseNumber}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* 두 번째 줄: 접수번호, 계약자, 담당자 */}
                        <div className="flex items-center gap-6 pl-6">
                          <div className="flex items-center gap-1.5">
                            <span
                              style={{
                                fontFamily: "Pretendard",
                                fontSize: "16px",
                                fontWeight: 400,
                                letterSpacing: "-0.02em",
                                color: "rgba(12, 12, 12, 0.5)",
                              }}
                            >
                              접수번호:
                            </span>
                            <span
                              style={{
                                fontFamily: "Pretendard",
                                fontSize: "16px",
                                fontWeight: 400,
                                letterSpacing: "-0.02em",
                                color: "rgba(12, 12, 12, 0.7)",
                              }}
                            >
                              {caseItem.caseNumber}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span
                              style={{
                                fontFamily: "Pretendard",
                                fontSize: "16px",
                                fontWeight: 400,
                                letterSpacing: "-0.02em",
                                color: "rgba(12, 12, 12, 0.5)",
                              }}
                            >
                              계약자:
                            </span>
                            <span
                              style={{
                                fontFamily: "Pretendard",
                                fontSize: "16px",
                                fontWeight: 400,
                                letterSpacing: "-0.02em",
                                color: "rgba(12, 12, 12, 0.7)",
                              }}
                            >
                              {caseItem.policyHolderName || "-"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span
                              style={{
                                fontFamily: "Pretendard",
                                fontSize: "16px",
                                fontWeight: 400,
                                letterSpacing: "-0.02em",
                                color: "rgba(12, 12, 12, 0.5)",
                              }}
                            >
                              담당자:
                            </span>
                            <span
                              style={{
                                fontFamily: "Pretendard",
                                fontSize: "16px",
                                fontWeight: 400,
                                letterSpacing: "-0.02em",
                                color: "rgba(12, 12, 12, 0.7)",
                              }}
                            >
                              {caseItem.assignedPartnerManager || "-"}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* 오른쪽: 선택 표시 또는 화살표 */}
                      <div className="flex items-center justify-center" style={{ width: "24px", height: "24px" }}>
                        {selectedCase === caseItem.id ? (
                          <Check 
                            className="w-5 h-5"
                            style={{ color: "#008FED" }}
                            data-testid={`check-${caseItem.id}`}
                          />
                        ) : (
                          <ChevronDown 
                            className="w-5 h-5"
                            style={{ color: "rgba(12, 12, 12, 0.4)" }}
                          />
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 기본 정보 섹션 */}
      <div className="mb-6 bg-white/60 backdrop-blur-sm rounded-lg p-6 border border-[rgba(0,143,237,0.2)]">
        <SectionHeader title="기본 정보" sectionKey="basic" />
        
        {expandedSections.basic && (
          <div className="space-y-6">
            {/* 상단 3개 필드: 협력사, 담당자명, 담당자 연락처 - 협력사만 수정 가능 */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label
                  className="block mb-2"
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "rgba(12, 12, 12, 0.7)",
                  }}
                >
                  협력사
                </label>
                <Input
                  value={selectedCaseData?.assignedPartner || ""}
                  disabled={isReadOnly}
                  data-testid="input-partner-company"
                  style={{
                    fontFamily: "Pretendard",
                    background: isReadOnly ? "rgba(12, 12, 12, 0.05)" : "white",
                    color: isReadOnly ? "rgba(12, 12, 12, 0.6)" : "#0C0C0C",
                  }}
                />
              </div>
              <div>
                <label
                  className="block mb-2"
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "rgba(12, 12, 12, 0.7)",
                  }}
                >
                  담당자명
                </label>
                <Input
                  value={selectedCaseData?.assignedPartnerManager || ""}
                  disabled={isReadOnly}
                  data-testid="input-manager-name"
                  style={{
                    fontFamily: "Pretendard",
                    background: isReadOnly ? "rgba(12, 12, 12, 0.05)" : "white",
                    color: isReadOnly ? "rgba(12, 12, 12, 0.6)" : "#0C0C0C",
                  }}
                />
              </div>
              <div>
                <label
                  className="block mb-2"
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "rgba(12, 12, 12, 0.7)",
                  }}
                >
                  담당자 연락처
                </label>
                <Input
                  value={selectedCaseData?.assignedPartnerContact || ""}
                  disabled={isReadOnly}
                  data-testid="input-manager-contact"
                  style={{
                    fontFamily: "Pretendard",
                    background: isReadOnly ? "rgba(12, 12, 12, 0.05)" : "white",
                    color: isReadOnly ? "rgba(12, 12, 12, 0.6)" : "#0C0C0C",
                  }}
                />
              </div>
            </div>

            {/* 접수정보 하위 섹션 */}
            <div>
              <h4 
                className="mb-3"
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "15px",
                  fontWeight: 600,
                  color: "#0C0C0C",
                }}
              >
                접수 정보
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    className="block mb-2"
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "rgba(12, 12, 12, 0.7)",
                    }}
                  >
                    접수번호
                  </label>
                  <Input
                    value={selectedCaseData?.caseNumber || ""}
                    disabled
                    data-testid="input-reception-number"
                    style={{
                      fontFamily: "Pretendard",
                      background: "rgba(12, 12, 12, 0.05)",
                      color: "rgba(12, 12, 12, 0.6)",
                    }}
                  />
                </div>
                <div>
                  <label
                    className="block mb-2"
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "rgba(12, 12, 12, 0.7)",
                    }}
                  >
                    보험사
                </label>
                  <Input
                    value={selectedCaseData?.insuranceCompany || ""}
                    disabled
                    data-testid="input-insurance"
                    style={{
                      fontFamily: "Pretendard",
                      background: "rgba(12, 12, 12, 0.05)",
                      color: "rgba(12, 12, 12, 0.6)",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 보험계약자 및 피보험자 정보 하위 섹션 */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "15px",
                    fontWeight: 600,
                    color: "#0C0C0C",
                  }}
                >
                  보험계약자 및 피보험자 정보
                </h4>
                <div 
                  className="flex items-center gap-2 px-2 py-1 rounded"
                  style={{
                    background: "rgba(12, 12, 12, 0.05)",
                  }}
                >
                  <Checkbox 
                    id="same-as-contractor" 
                    disabled 
                    data-testid="checkbox-same-contractor"
                  />
                  <label
                    htmlFor="same-as-contractor"
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      color: "rgba(12, 12, 12, 0.5)",
                      cursor: "not-allowed",
                    }}
                  >
                    보험계약자 = 피보험자
                  </label>
                </div>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label
                      className="block mb-2"
                      style={{
                        fontFamily: "Pretendard",
                        fontSize: "14px",
                        fontWeight: 500,
                        color: "rgba(12, 12, 12, 0.7)",
                      }}
                    >
                      보험계약자
                    </label>
                    <Input
                      value={selectedCaseData?.policyHolderName || ""}
                      disabled
                      data-testid="input-contractor"
                      style={{
                        fontFamily: "Pretendard",
                        background: "rgba(12, 12, 12, 0.05)",
                        color: "rgba(12, 12, 12, 0.6)",
                      }}
                    />
                  </div>
                  <div>
                    <label
                      className="block mb-2"
                      style={{
                        fontFamily: "Pretendard",
                        fontSize: "14px",
                        fontWeight: 500,
                        color: "rgba(12, 12, 12, 0.7)",
                      }}
                    >
                      피보험자
                    </label>
                    <Input
                      value={selectedCaseData?.insuredName || ""}
                      disabled
                      data-testid="input-insured"
                      style={{
                        fontFamily: "Pretendard",
                        background: "rgba(12, 12, 12, 0.05)",
                        color: "rgba(12, 12, 12, 0.6)",
                      }}
                    />
                  </div>
                  <div>
                    <label
                      className="block mb-2"
                      style={{
                        fontFamily: "Pretendard",
                        fontSize: "14px",
                        fontWeight: 500,
                        color: "rgba(12, 12, 12, 0.7)",
                      }}
                    >
                      피보험자 연락처<span style={{ color: "red" }}>*</span>
                    </label>
                    <Input
                      value={selectedCaseData?.insuredContact || ""}
                      disabled
                      data-testid="input-insured-contact"
                      style={{
                        fontFamily: "Pretendard",
                        background: "rgba(12, 12, 12, 0.05)",
                        color: "rgba(12, 12, 12, 0.6)",
                      }}
                    />
                  </div>
                </div>
                <div>
                  <label
                    className="block mb-2"
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "rgba(12, 12, 12, 0.7)",
                    }}
                  >
                    피보험자 주소<span style={{ color: "red" }}>*</span>
                  </label>
                  <Input
                    value={selectedCaseData?.insuredAddress || ""}
                    disabled
                    data-testid="input-insured-address"
                    style={{
                      fontFamily: "Pretendard",
                      background: "rgba(12, 12, 12, 0.05)",
                      color: "rgba(12, 12, 12, 0.6)",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 사고 발생일시 - 협력사만 입력 가능 */}
            <div>
              <h4 
                className="mb-3"
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "15px",
                  fontWeight: 600,
                  color: "#0C0C0C",
                }}
              >
                사고 발생일시
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    className="block mb-2"
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "rgba(12, 12, 12, 0.7)",
                    }}
                  >
                    날짜 선택
                  </label>
                  <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        disabled={isReadOnly}
                        className="w-full justify-start text-left"
                        data-testid="button-accident-date"
                        style={{
                          fontFamily: "Pretendard",
                          background: isReadOnly ? "rgba(12, 12, 12, 0.05)" : "white",
                        }}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {accidentDate ? format(accidentDate, "PPP", { locale: ko }) : "날짜 선택"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={accidentDate}
                        onSelect={(date) => {
                          setAccidentDate(date);
                          setDatePickerOpen(false);
                        }}
                        locale={ko}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <label
                    className="block mb-2"
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "rgba(12, 12, 12, 0.7)",
                    }}
                  >
                    시간 선택
                  </label>
                  <div className="relative">
                    <Input
                      type="time"
                      value={accidentTime}
                      onChange={(e) => setAccidentTime(e.target.value)}
                      disabled={isReadOnly}
                      data-testid="input-accident-time"
                      style={{
                        fontFamily: "Pretendard",
                        background: isReadOnly ? "rgba(12, 12, 12, 0.05)" : "white",
                      }}
                    />
                    <Clock className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 현장조사 정보 섹션 */}
      <div className="mb-6 bg-white/60 backdrop-blur-sm rounded-lg p-6 border border-[rgba(0,143,237,0.2)]">
        <SectionHeader title="현장조사 정보" sectionKey="fieldSurvey" />
        
        {expandedSections.fieldSurvey && (
          <div className="space-y-6">
            {/* 현장정보 */}
            <div>
              <h4 
                className="mb-3"
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "15px",
                  fontWeight: 600,
                  color: "#0C0C0C",
                }}
              >
                현장정보
              </h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label
                    className="block mb-2"
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "rgba(12, 12, 12, 0.7)",
                    }}
                  >
                    방문 일시
                  </label>
                  <Popover open={visitDatePickerOpen} onOpenChange={setVisitDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        disabled={isReadOnly}
                        className="w-full justify-start text-left"
                        data-testid="button-visit-date"
                        style={{
                          fontFamily: "Pretendard",
                          background: isReadOnly ? "rgba(12, 12, 12, 0.05)" : "white",
                        }}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {visitDate ? format(visitDate, "PPP", { locale: ko }) : "날짜 선택"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={visitDate}
                        onSelect={(date) => {
                          setVisitDate(date);
                          setVisitDatePickerOpen(false);
                        }}
                        locale={ko}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <label
                    className="block mb-2"
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "rgba(12, 12, 12, 0.7)",
                    }}
                  >
                    시간 선택
                  </label>
                  <div className="relative">
                    <Input
                      type="time"
                      value={visitTime}
                      onChange={(e) => setVisitTime(e.target.value)}
                      disabled={isReadOnly}
                      data-testid="input-visit-time"
                      style={{
                        fontFamily: "Pretendard",
                        background: isReadOnly ? "rgba(12, 12, 12, 0.05)" : "white",
                      }}
                    />
                    <Clock className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label
                    className="block mb-2"
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "rgba(12, 12, 12, 0.7)",
                    }}
                  >
                    현장 이동 거리
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={travelDistance}
                      onChange={(e) => setTravelDistance(e.target.value)}
                      placeholder="0"
                      disabled={isReadOnly}
                      data-testid="input-travel-distance"
                      style={{
                        fontFamily: "Pretendard",
                        background: isReadOnly ? "rgba(12, 12, 12, 0.05)" : "white",
                      }}
                    />
                    <span
                      className="flex items-center px-3 py-2 bg-gray-100 rounded"
                      style={{
                        fontFamily: "Pretendard",
                        fontSize: "14px",
                        color: "rgba(12, 12, 12, 0.7)",
                        minWidth: "40px",
                      }}
                    >
                      km
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <label
                  className="block mb-2"
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "rgba(12, 12, 12, 0.7)",
                  }}
                >
                  출동담당자
                </label>
                <Input
                  value={accompaniedPerson}
                  onChange={(e) => setAccompaniedPerson(e.target.value)}
                  placeholder="출동담당자 성명"
                  disabled
                  data-testid="input-accompanied-person"
                  style={{
                    fontFamily: "Pretendard",
                    background: "rgba(12, 12, 12, 0.05)",
                    color: "rgba(12, 12, 12, 0.6)",
                  }}
                />
              </div>
            </div>

            {/* 사고 원인(누수원천) */}
            <div>
              <h4 
                className="mb-3"
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "15px",
                  fontWeight: 600,
                  color: "#0C0C0C",
                }}
              >
                사고 원인(누수원천)
              </h4>
              <div className="mb-4">
                <label
                  className="block mb-2"
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "rgba(12, 12, 12, 0.7)",
                  }}
                >
                  카테고리
                </label>
                <div className="flex gap-2">
                  {["배관", "코킹", "방수", "기타"].map((category) => (
                    <button
                      key={category}
                      onClick={() => setAccidentCategory(category)}
                      disabled={isReadOnly}
                      className="px-4 py-2 rounded transition-colors"
                      style={{
                        fontFamily: "Pretendard",
                        fontSize: "14px",
                        fontWeight: 500,
                        background: accidentCategory === category ? "#008FED" : "white",
                        color: accidentCategory === category ? "white" : "rgba(12, 12, 12, 0.7)",
                        border: `1px solid ${accidentCategory === category ? "#008FED" : "rgba(0, 143, 237, 0.2)"}`,
                        cursor: isReadOnly ? "not-allowed" : "pointer",
                        opacity: isReadOnly ? 0.6 : 1,
                      }}
                      data-testid={`button-category-${category}`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label
                  className="block mb-2"
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "rgba(12, 12, 12, 0.7)",
                  }}
                >
                  사고원인
                </label>
                <Textarea
                  value={accidentCause}
                  onChange={(e) => setAccidentCause(e.target.value)}
                  placeholder="누수원인, 누수지점 등 가능 등이 상세하게 입력해주세요"
                  rows={4}
                  maxLength={800}
                  disabled={isReadOnly}
                  data-testid="textarea-accident-cause"
                  style={{
                    fontFamily: "Pretendard",
                    background: isReadOnly ? "rgba(12, 12, 12, 0.05)" : "white",
                  }}
                />
                <div 
                  className="text-right mt-1"
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "12px",
                    color: "rgba(12, 12, 12, 0.5)",
                  }}
                >
                  {accidentCause.length}/800
                </div>
              </div>
            </div>

            {/* 특이사항 */}
            <div>
              <h4 
                className="mb-3"
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "15px",
                  fontWeight: 600,
                  color: "#0C0C0C",
                }}
              >
                특이사항
              </h4>
              <Textarea
                value={specialNotes}
                onChange={(e) => setSpecialNotes(e.target.value)}
                placeholder="내용을 작성해주세요"
                rows={4}
                maxLength={800}
                disabled={isReadOnly}
                data-testid="textarea-special-notes"
                style={{
                  fontFamily: "Pretendard",
                  background: isReadOnly ? "rgba(12, 12, 12, 0.05)" : "white",
                }}
              />
              <div 
                className="text-right mt-1"
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "12px",
                  color: "rgba(12, 12, 12, 0.5)",
                }}
              >
                {specialNotes.length}/800
              </div>
            </div>

            {/* 피해자 정보 */}
            <div>
              <h4 
                className="mb-3"
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "15px",
                  fontWeight: 600,
                  color: "#0C0C0C",
                }}
              >
                피해자 정보
              </h4>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <label
                    className="block mb-2"
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "rgba(12, 12, 12, 0.7)",
                    }}
                  >
                    피해자
                  </label>
                  <Input
                    value={victimName}
                    onChange={(e) => setVictimName(e.target.value)}
                    placeholder="피해자 성명"
                    disabled={isReadOnly}
                    data-testid="input-victim-name"
                    style={{
                      fontFamily: "Pretendard",
                      background: isReadOnly ? "rgba(12, 12, 12, 0.05)" : "white",
                    }}
                  />
                </div>
                <div>
                  <label
                    className="block mb-2"
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "rgba(12, 12, 12, 0.7)",
                    }}
                  >
                    피해자 연락처
                  </label>
                  <Input
                    value={victimContact}
                    onChange={(e) => setVictimContact(e.target.value)}
                    placeholder="피해자 연락처"
                    disabled={isReadOnly}
                    data-testid="input-victim-contact"
                    style={{
                      fontFamily: "Pretendard",
                      background: isReadOnly ? "rgba(12, 12, 12, 0.05)" : "white",
                    }}
                  />
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label
                      className="block mb-2"
                      style={{
                        fontFamily: "Pretendard",
                        fontSize: "14px",
                        fontWeight: 500,
                        color: "rgba(12, 12, 12, 0.7)",
                      }}
                    >
                      피해자 주소
                    </label>
                    <Input
                      value={victimAddress}
                      onChange={(e) => setVictimAddress(e.target.value)}
                      placeholder="상세주소"
                      disabled={isReadOnly}
                      data-testid="input-victim-address"
                      style={{
                        fontFamily: "Pretendard",
                        background: isReadOnly ? "rgba(12, 12, 12, 0.05)" : "white",
                      }}
                    />
                  </div>
                  <Button
                    variant="outline"
                    disabled={isReadOnly}
                    data-testid="button-search-address"
                    style={{
                      fontFamily: "Pretendard",
                      fontWeight: 500,
                    }}
                  >
                    검색
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2 mb-4">
                <Checkbox
                  id="mobile-victim"
                  disabled={isReadOnly}
                  data-testid="checkbox-mobile-victim"
                />
                <label
                  htmlFor="mobile-victim"
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    color: "rgba(12, 12, 12, 0.7)",
                    cursor: isReadOnly ? "not-allowed" : "pointer",
                  }}
                >
                  휴대전화 피해자
                </label>
              </div>

              {/* 기타등록 피해자 */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <h5 
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#0C0C0C",
                    }}
                  >
                    기타등록 피해자
                  </h5>
                  {!isReadOnly && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (victimName || victimContact || victimAddress) {
                          setAdditionalVictims(prev => [...prev, {
                            name: victimName,
                            phone: victimContact,
                            address: victimAddress,
                          }]);
                          setVictimName("");
                          setVictimContact("");
                          setVictimAddress("");
                        }
                      }}
                      data-testid="button-add-victim"
                      style={{
                        fontFamily: "Pretendard",
                        fontWeight: 500,
                      }}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      추가
                    </Button>
                  )}
                </div>
                {additionalVictims.length > 0 && (
                  <div className="space-y-2">
                    {additionalVictims.map((victim, index) => (
                      <div 
                        key={index}
                        className="flex items-center gap-3 p-3 rounded"
                        style={{
                          background: "rgba(0, 143, 237, 0.05)",
                          border: "1px solid rgba(0, 143, 237, 0.15)",
                        }}
                        data-testid={`additional-victim-${index}`}
                      >
                        <span 
                          className="w-2 h-2 rounded-full"
                          style={{ background: "#008FED" }}
                          data-testid={`victim-indicator-${index}`}
                        />
                        <span
                          style={{
                            fontFamily: "Pretendard",
                            fontSize: "14px",
                            fontWeight: 600,
                            color: "#008FED",
                          }}
                          data-testid={`victim-name-${index}`}
                        >
                          {victim.name}
                        </span>
                        <span
                          style={{
                            fontFamily: "Pretendard",
                            fontSize: "14px",
                            color: "rgba(12, 12, 12, 0.6)",
                          }}
                          data-testid={`victim-phone-${index}`}
                        >
                          {victim.phone}
                        </span>
                        <span
                          style={{
                            fontFamily: "Pretendard",
                            fontSize: "14px",
                            color: "rgba(12, 12, 12, 0.6)",
                          }}
                          data-testid={`victim-address-${index}`}
                        >
                          {victim.address}
                        </span>
                        {!isReadOnly && (
                          <button
                            onClick={() => {
                              setAdditionalVictims(prev => prev.filter((_, i) => i !== index));
                            }}
                            className="ml-auto p-1 rounded-full hover-elevate active-elevate-2"
                            data-testid={`button-remove-victim-${index}`}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* VOC(고객의 소리) */}
            <div>
              <h4 
                className="mb-3"
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "15px",
                  fontWeight: 600,
                  color: "#0C0C0C",
                }}
              >
                VOC(고객의 소리)
              </h4>
              <Textarea
                value={voc}
                onChange={(e) => setVoc(e.target.value)}
                placeholder="내용을 작성해주세요"
                rows={4}
                maxLength={800}
                disabled={isReadOnly}
                data-testid="textarea-voc"
                style={{
                  fontFamily: "Pretendard",
                  background: isReadOnly ? "rgba(12, 12, 12, 0.05)" : "white",
                }}
              />
              <div 
                className="text-right mt-1"
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "12px",
                  color: "rgba(12, 12, 12, 0.5)",
                }}
              >
                {voc.length}/800
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 피해 복구 방식 및 차액 유형 섹션 */}
      <div className="mb-6 bg-white/60 backdrop-blur-sm rounded-lg p-6 border border-[rgba(0,143,237,0.2)]">
        <SectionHeader title="피해 복구 방식 및 차액 유형" sectionKey="recoveryMethod" />
        
        {expandedSections.recoveryMethod && (
          <div className="space-y-6">
            {/* 처리 유형(복수선택) */}
            <div>
              <label
                className="block mb-3"
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "rgba(12, 12, 12, 0.7)",
                }}
              >
                처리 유형(복수선택)
              </label>
              <div className="flex gap-2 mb-3">
                {["수리", "비교견적", "기타"].map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      if (!isReadOnly) {
                        setProcessingTypes(prev => {
                          const newSet = new Set(prev);
                          if (newSet.has(type)) {
                            newSet.delete(type);
                          } else {
                            newSet.add(type);
                          }
                          return newSet;
                        });
                      }
                    }}
                    disabled={isReadOnly}
                    data-testid={`button-processing-type-${type}`}
                    className="px-4 py-2 rounded hover-elevate active-elevate-2"
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      fontWeight: 500,
                      background: processingTypes.has(type) ? "#008FED" : "white",
                      color: processingTypes.has(type) ? "white" : "rgba(12, 12, 12, 0.7)",
                      border: processingTypes.has(type) ? "1px solid #008FED" : "1px solid rgba(0, 143, 237, 0.3)",
                      cursor: isReadOnly ? "not-allowed" : "pointer",
                      opacity: isReadOnly ? 0.6 : 1,
                    }}
                  >
                    {type}
                  </button>
                ))}
              </div>
              {processingTypes.has("기타") && (
                <Input
                  value={processingTypeOther}
                  onChange={(e) => setProcessingTypeOther(e.target.value)}
                  placeholder="기타선택시 설명해주세요"
                  disabled={isReadOnly}
                  data-testid="input-processing-type-other"
                  style={{
                    fontFamily: "Pretendard",
                    background: isReadOnly ? "rgba(12, 12, 12, 0.05)" : "white",
                  }}
                />
              )}
            </div>

            {/* 복구 방식 */}
            <div>
              <label
                className="block mb-3"
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "rgba(12, 12, 12, 0.7)",
                }}
              >
                복구 방식
              </label>
              <div className="flex gap-2">
                {["부분수리", "전체수리"].map((method) => (
                  <button
                    key={method}
                    onClick={() => {
                      if (!isReadOnly) {
                        setRecoveryMethodType(method);
                      }
                    }}
                    disabled={isReadOnly}
                    data-testid={`button-recovery-method-${method}`}
                    className="px-4 py-2 rounded hover-elevate active-elevate-2"
                    style={{
                      fontFamily: "Pretendard",
                      fontSize: "14px",
                      fontWeight: 500,
                      background: recoveryMethodType === method ? "#008FED" : "white",
                      color: recoveryMethodType === method ? "white" : "rgba(12, 12, 12, 0.7)",
                      border: recoveryMethodType === method ? "1px solid #008FED" : "1px solid rgba(0, 143, 237, 0.3)",
                      cursor: isReadOnly ? "not-allowed" : "pointer",
                      opacity: isReadOnly ? 0.6 : 1,
                    }}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 접수 정보 섹션 */}
      <div className="mb-6 bg-white/60 backdrop-blur-sm rounded-lg p-6 border border-[rgba(0,143,237,0.2)]">
        <SectionHeader title="접수 정보" sectionKey="reception" />
        
        {expandedSections.reception && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  className="block mb-2"
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "rgba(12, 12, 12, 0.7)",
                  }}
                >
                  접수전문
                </label>
                <Input
                  placeholder="접수전문"
                  disabled={isReadOnly}
                  data-testid="input-reception-text"
                  style={{
                    fontFamily: "Pretendard",
                    background: isReadOnly ? "rgba(12, 12, 12, 0.05)" : "white",
                  }}
                />
              </div>
              <div>
                <label
                  className="block mb-2"
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "rgba(12, 12, 12, 0.7)",
                  }}
                >
                  부실
                </label>
                <Select disabled={isReadOnly}>
                  <SelectTrigger
                    data-testid="select-부실"
                    style={{
                      fontFamily: "Pretendard",
                      background: isReadOnly ? "rgba(12, 12, 12, 0.05)" : "white",
                    }}
                  >
                    <SelectValue placeholder="부실사 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="option1">옵션1</SelectItem>
                    <SelectItem value="option2">옵션2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label
                className="block mb-2"
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "rgba(12, 12, 12, 0.7)",
                }}
              >
                업체사 설명
              </label>
              <Input
                placeholder="업체사 설명"
                disabled={isReadOnly}
                data-testid="input-partner-description"
                style={{
                  fontFamily: "Pretendard",
                  background: isReadOnly ? "rgba(12, 12, 12, 0.05)" : "white",
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 보험계약자 및 피보험자 정보 섹션 */}
      <div className="mb-6 bg-white/60 backdrop-blur-sm rounded-lg p-6 border border-[rgba(0,143,237,0.2)]">
        <SectionHeader title="보험계약자 및 피보험자 정보" sectionKey="insurance" />
        
        {expandedSections.insurance && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 rounded" style={{ background: "rgba(0, 143, 237, 0.05)" }}>
              <input
                type="checkbox"
                id="same-as-contractor"
                className="w-4 h-4"
                disabled={isReadOnly}
                data-testid="checkbox-same-contractor"
              />
              <label
                htmlFor="same-as-contractor"
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "13px",
                  color: "rgba(12, 12, 12, 0.7)",
                }}
              >
                보험 계약자 측 거래처와 같 거래처 번지로 기재하시기 바랍니다
              </label>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label
                  className="block mb-2"
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "rgba(12, 12, 12, 0.7)",
                  }}
                >
                  보험계약자
                </label>
                <Input
                  placeholder="보험자 성명"
                  disabled={isReadOnly}
                  data-testid="input-insurer-name"
                  style={{
                    fontFamily: "Pretendard",
                    background: isReadOnly ? "rgba(12, 12, 12, 0.05)" : "white",
                  }}
                />
              </div>
              <div>
                <label
                  className="block mb-2"
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "rgba(12, 12, 12, 0.7)",
                  }}
                >
                  보험회사
                </label>
                <Input
                  placeholder="피보험자 성명"
                  disabled={isReadOnly}
                  data-testid="input-insured-company"
                  style={{
                    fontFamily: "Pretendard",
                    background: isReadOnly ? "rgba(12, 12, 12, 0.05)" : "white",
                  }}
                />
              </div>
              <div>
                <label
                  className="block mb-2"
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "rgba(12, 12, 12, 0.7)",
                  }}
                >
                  피보험자 연락처 <span style={{ color: "#E53E3E" }}>*</span>
                </label>
                <Input
                  placeholder="피보험자 연락처"
                  disabled={isReadOnly}
                  data-testid="input-insured-contact"
                  style={{
                    fontFamily: "Pretendard",
                    background: isReadOnly ? "rgba(12, 12, 12, 0.05)" : "white",
                  }}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  className="block mb-2"
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "rgba(12, 12, 12, 0.7)",
                  }}
                >
                  피보험자 성명
                </label>
                <Input
                  placeholder="피보험자 성명"
                  disabled={isReadOnly}
                  data-testid="input-insured-name-1"
                  style={{
                    fontFamily: "Pretendard",
                    background: isReadOnly ? "rgba(12, 12, 12, 0.05)" : "white",
                  }}
                />
              </div>
              <div>
                <label
                  className="block mb-2"
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "rgba(12, 12, 12, 0.7)",
                  }}
                >
                  피보험자 성명
                </label>
                <Input
                  placeholder="피보험자 연락처"
                  disabled={isReadOnly}
                  data-testid="input-insured-name-2"
                  style={{
                    fontFamily: "Pretendard",
                    background: isReadOnly ? "rgba(12, 12, 12, 0.05)" : "white",
                  }}
                />
              </div>
            </div>
            
            <div>
              <label
                className="block mb-2"
                style={{
                  fontFamily: "Pretendard",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "rgba(12, 12, 12, 0.7)",
                }}
              >
                피보험자 주소 <span style={{ color: "#E53E3E" }}>*</span>
              </label>
              <Textarea
                placeholder="도로명 주소, 동/호수 포함"
                disabled={isReadOnly}
                rows={2}
                data-testid="textarea-insured-address"
                style={{
                  fontFamily: "Pretendard",
                  background: isReadOnly ? "rgba(12, 12, 12, 0.05)" : "white",
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 저장 버튼 (협력사만 표시) */}
      {isPartner && (
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            data-testid="button-cancel"
            style={{
              fontFamily: "Pretendard",
              fontWeight: 500,
            }}
          >
            취소
          </Button>
          <Button
            data-testid="button-save"
            style={{
              fontFamily: "Pretendard",
              fontWeight: 600,
              background: "#008FED",
              color: "white",
            }}
          >
            저장
          </Button>
        </div>
      )}
    </div>
  );
}
