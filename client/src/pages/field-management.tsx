import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { ChevronDown, ChevronRight, Calendar as CalendarIcon, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

export default function FieldManagement() {
  const [expandedSections, setExpandedSections] = useState({
    schedule: true,
    basic: true,
    reception: true,
    insurance: true,
    accident: true,
  });

  const [accidentDate, setAccidentDate] = useState<Date | undefined>(undefined);
  const [accidentTime, setAccidentTime] = useState("");
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  if (!user) {
    return null;
  }

  // 협력사만 입력 가능
  const isPartner = user.role === "협력사";
  const isReadOnly = !isPartner;

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
              작성중인 건
            </p>
            <div 
              className="flex items-center gap-4 p-4 rounded-lg"
              style={{
                background: "rgba(0, 143, 237, 0.05)",
                border: "1px solid rgba(0, 143, 237, 0.15)",
              }}
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-[#008FED] rounded-full"></span>
                <span
                  style={{
                    fontFamily: "Pretendard",
                    fontSize: "15px",
                    fontWeight: 600,
                    color: "#008FED",
                  }}
                >
                  MG수원역센터 252198943
                </span>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <span style={{ color: "rgba(12, 12, 12, 0.6)" }}>
                  접수번호: <span style={{ fontWeight: 600 }}>25145107</span>
                </span>
                <span style={{ color: "rgba(12, 12, 12, 0.6)" }}>
                  개인자: <span style={{ fontWeight: 600 }}>김해리</span>
                </span>
                <span style={{ color: "rgba(12, 12, 12, 0.6)" }}>
                  담당자: <span style={{ fontWeight: 600 }}>김해리</span>
                </span>
              </div>
              <button
                className="ml-auto p-2 rounded-full hover-elevate active-elevate-2"
                style={{
                  background: "rgba(255, 255, 255, 0.8)",
                }}
                data-testid="button-close-case"
              >
                <span className="text-lg">&times;</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 기본 정보 섹션 */}
      <div className="mb-6 bg-white/60 backdrop-blur-sm rounded-lg p-6 border border-[rgba(0,143,237,0.2)]">
        <SectionHeader title="기본 정보" sectionKey="basic" />
        
        {expandedSections.basic && (
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
                업체사
              </label>
              <Input
                placeholder="협력사명"
                disabled={isReadOnly}
                data-testid="input-partner-company"
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
                담당자명
              </label>
              <Input
                placeholder="담당자명"
                disabled={isReadOnly}
                data-testid="input-manager-name"
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
                담당자 연락처
              </label>
              <Input
                placeholder="담당자 연락처"
                disabled={isReadOnly}
                data-testid="input-manager-contact"
                style={{
                  fontFamily: "Pretendard",
                  background: isReadOnly ? "rgba(12, 12, 12, 0.05)" : "white",
                }}
              />
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

      {/* 사고 발생 일시 섹션 */}
      <div className="mb-6 bg-white/60 backdrop-blur-sm rounded-lg p-6 border border-[rgba(0,143,237,0.2)]">
        <SectionHeader title="사고 발생 일시" sectionKey="accident" hasCollapseButton={false} />
        
        <div className="grid grid-cols-2 gap-4 mt-4">
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
                  data-testid="button-select-date"
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
                  disabled={isReadOnly}
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
