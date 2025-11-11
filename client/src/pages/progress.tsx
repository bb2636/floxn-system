import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { User, CaseWithLatestProgress } from "@shared/schema";
import { Star, Search, Plus, Minus } from "lucide-react";
import logoIcon from "@assets/Frame 2_1762217940686.png";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { GlobalHeader } from "@/components/global-header";

export default function Progress() {
  const [activeMenu, setActiveMenu] = useState("진행상황");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRow, setSelectedRow] = useState<string | null>(null);
  const [selectedCases, setSelectedCases] = useState<string[]>([]);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [progressContent, setProgressContent] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: user, isLoading: userLoading } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  const { data: cases, isLoading } = useQuery<CaseWithLatestProgress[]>({
    queryKey: ["/api/cases"],
  });

  // 검색 필터링 로직
  const filteredProgressData = (cases || []).filter((caseItem) => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    
    if (normalizedQuery === "") {
      return true; // 검색어가 없으면 모든 케이스 표시
    }

    // 검색 가능한 필드들
    const insuranceCompany = (caseItem.insuranceCompany || "").toLowerCase();
    const insuranceAccidentNo = (caseItem.insuranceAccidentNo || "").toLowerCase();
    const caseNumber = (caseItem.caseNumber || "").toLowerCase();
    const clientName = (caseItem.clientName || "").toLowerCase();
    const assignedPartner = (caseItem.assignedPartner || "").toLowerCase();
    const assignedPartnerManager = (caseItem.assignedPartnerManager || "").toLowerCase();
    
    // 하나라도 매치되면 표시
    return (
      insuranceCompany.includes(normalizedQuery) ||
      insuranceAccidentNo.includes(normalizedQuery) ||
      caseNumber.includes(normalizedQuery) ||
      clientName.includes(normalizedQuery) ||
      assignedPartner.includes(normalizedQuery) ||
      assignedPartnerManager.includes(normalizedQuery)
    );
  });

  const progressData = filteredProgressData;
  const totalCount = progressData.length;

  const menuItems = [
    { name: "홈" },
    { name: "접수하기" },
    { name: "진행상황" },
    { name: "현장조사" },
    { name: "종합진행관리" },
    { name: "통계 및 정산" },
    { name: "관리자 설정" },
  ];

  const submitProgressMutation = useMutation({
    mutationFn: async (data: { caseId: string; content: string }[]) => {
      // 각 케이스에 대해 진행상황 업데이트 생성
      const promises = data.map(item => 
        apiRequest("POST", "/api/progress-updates", item)
      );
      return await Promise.all(promises);
    },
    onSuccess: () => {
      toast({ description: "진행상황이 저장되었습니다." });
      setIsProgressModalOpen(false);
      setProgressContent("");
      setSelectedCases([]);
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
    },
    onError: (error: Error) => {
      toast({ description: error.message || "진행상황 저장에 실패했습니다.", variant: "destructive" });
    },
  });

  const handleSubmitProgress = () => {
    if (!progressContent.trim()) {
      toast({ description: "주요 진행사항을 입력해주세요.", variant: "destructive" });
      return;
    }

    const updates = selectedCases.map(caseId => ({
      caseId,
      content: progressContent,
    }));

    submitProgressMutation.mutate(updates);
  };

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

      <GlobalHeader />

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
              진행상황
            </h1>
            <Star className="w-5 h-5" style={{ color: 'rgba(12, 12, 12, 0.24)' }} data-testid="button-favorite" />
          </div>

          {/* Main Container */}
          <div style={{ width: '1596px', margin: '0 32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* 검색조건 검색 Section */}
            <div 
              style={{
                background: '#FFFFFF',
                boxShadow: '0px 0px 20px #DBE9F5',
                borderRadius: '12px',
                padding: '24px',
              }}
            >
              <h2 
                style={{
                  fontFamily: 'Pretendard',
                  fontWeight: 600,
                  fontSize: '18px',
                  lineHeight: '128%',
                  letterSpacing: '-0.02em',
                  color: '#0C0C0C',
                  marginBottom: '16px',
                }}
              >
                검색조건 검색
              </h2>
              
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search 
                    className="absolute left-4 top-1/2 transform -translate-y-1/2" 
                    style={{ width: '20px', height: '20px', color: 'rgba(12, 12, 12, 0.4)' }} 
                  />
                  <input
                    type="text"
                    placeholder="보험사, 사고번호, 접수번호, 계약자, 담당자를 검색해주세요."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      height: '56px',
                      padding: '0 20px 0 52px',
                      background: '#FDFDFD',
                      border: '2px solid rgba(12, 12, 12, 0.08)',
                      borderRadius: '8px',
                      fontFamily: 'Pretendard',
                      fontSize: '16px',
                      fontWeight: 400,
                      letterSpacing: '-0.02em',
                      color: '#0C0C0C',
                    }}
                    data-testid="input-search"
                  />
                </div>
                <button
                  style={{
                    width: '120px',
                    height: '56px',
                    background: '#008FED',
                    borderRadius: '8px',
                    border: 'none',
                    fontFamily: 'Pretendard',
                    fontSize: '16px',
                    fontWeight: 600,
                    letterSpacing: '-0.02em',
                    color: '#FFFFFF',
                    cursor: 'pointer',
                  }}
                  data-testid="button-search"
                >
                  검색
                </button>
              </div>
            </div>

            {/* 검수 목록 Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 4px' }}>
              <span 
                style={{
                  fontFamily: 'Pretendard',
                  fontWeight: 600,
                  fontSize: '18px',
                  lineHeight: '128%',
                  letterSpacing: '-0.02em',
                  color: 'rgba(12, 12, 12, 0.8)',
                }}
              >
                검수 목록
              </span>
              <span 
                style={{
                  fontFamily: 'Pretendard',
                  fontWeight: 600,
                  fontSize: '18px',
                  lineHeight: '128%',
                  letterSpacing: '-0.02em',
                  color: '#008FED',
                }}
              >
                {totalCount}
              </span>
            </div>

            {/* Table */}
            <div 
              style={{
                background: '#FFFFFF',
                boxShadow: '0px 0px 20px #DBE9F5',
                borderRadius: '12px',
                overflow: 'hidden',
              }}
            >
              {/* Table Header */}
              <div 
                style={{
                  display: 'grid',
                  gridTemplateColumns: '120px 140px 140px 140px 120px 120px 140px 140px 160px 140px 80px',
                  padding: '16px 20px',
                  background: 'rgba(12, 12, 12, 0.04)',
                  borderBottom: '1px solid rgba(12, 12, 12, 0.08)',
                }}
              >
                <div style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '14px', color: 'rgba(12, 12, 12, 0.6)' }}>날짜</div>
                <div style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '14px', color: 'rgba(12, 12, 12, 0.6)' }}>보험사</div>
                <div style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '14px', color: 'rgba(12, 12, 12, 0.6)' }}>보험사 사고번호</div>
                <div style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '14px', color: 'rgba(12, 12, 12, 0.6)' }}>접수번호</div>
                <div style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '14px', color: 'rgba(12, 12, 12, 0.6)' }}>계약자</div>
                <div style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '14px', color: 'rgba(12, 12, 12, 0.6)' }}>실사사</div>
                <div style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '14px', color: 'rgba(12, 12, 12, 0.6)' }}>심사담당자</div>
                <div style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '14px', color: 'rgba(12, 12, 12, 0.6)' }}>담당자</div>
                <div style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '14px', color: 'rgba(12, 12, 12, 0.6)' }}>복구유형</div>
                <div style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '14px', color: 'rgba(12, 12, 12, 0.6)' }}>주요진행사항</div>
                <div style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '14px', color: 'rgba(12, 12, 12, 0.6)' }}>요청</div>
              </div>

              {/* Table Body */}
              {isLoading ? (
                <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'Pretendard', fontSize: '16px', color: 'rgba(12, 12, 12, 0.6)' }}>
                  로딩중...
                </div>
              ) : progressData.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'Pretendard', fontSize: '16px', color: 'rgba(12, 12, 12, 0.6)' }}>
                  접수 건이 없습니다
                </div>
              ) : (
                progressData.map((row, index) => (
                  <div 
                    key={row.id}
                    onClick={() => setSelectedRow(row.id)}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '120px 140px 140px 140px 120px 120px 140px 140px 160px 140px 80px',
                      padding: '16px 20px',
                      background: index === 0 ? 'rgba(0, 143, 237, 0.04)' : 'transparent',
                      border: index === 0 ? '1px solid #008FED' : 'none',
                      borderLeft: 'none',
                      borderRight: 'none',
                      borderTop: index === 0 ? '1px solid #008FED' : 'none',
                      borderBottom: index === 0 ? '1px solid #008FED' : '1px solid rgba(12, 12, 12, 0.08)',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                    }}
                    data-testid={`table-row-${index}`}
                    onMouseEnter={(e) => {
                      if (index !== 0) {
                        e.currentTarget.style.background = 'rgba(0, 143, 237, 0.02)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (index !== 0) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <div style={{ fontFamily: 'Pretendard', fontSize: '14px', color: 'rgba(12, 12, 12, 0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {row.accidentDate || '-'}
                    </div>
                    <div style={{ fontFamily: 'Pretendard', fontSize: '14px', color: 'rgba(12, 12, 12, 0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {row.insuranceCompany || '-'}
                    </div>
                    <div style={{ fontFamily: 'Pretendard', fontSize: '14px', color: 'rgba(12, 12, 12, 0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {row.insuranceAccidentNo || '-'}
                    </div>
                    <div style={{ fontFamily: 'Pretendard', fontSize: '14px', color: 'rgba(12, 12, 12, 0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {row.caseNumber || '-'}
                    </div>
                    <div style={{ fontFamily: 'Pretendard', fontSize: '14px', color: 'rgba(12, 12, 12, 0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {row.clientName || '-'}
                    </div>
                    <div style={{ fontFamily: 'Pretendard', fontSize: '14px', color: 'rgba(12, 12, 12, 0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {row.investigatorTeam || '-'}
                    </div>
                    <div style={{ fontFamily: 'Pretendard', fontSize: '14px', color: 'rgba(12, 12, 12, 0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {row.assessorTeam || '-'}
                    </div>
                    <div style={{ fontFamily: 'Pretendard', fontSize: '14px', color: 'rgba(12, 12, 12, 0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {row.assessorDepartment || '-'}
                    </div>
                    <div style={{ fontFamily: 'Pretendard', fontSize: '14px', color: 'rgba(12, 12, 12, 0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {row.restorationMethod || '-'}
                    </div>
                    <div style={{ fontFamily: 'Pretendard', fontSize: '14px', color: 'rgba(12, 12, 12, 0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {row.latestProgress?.content || '-'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div 
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '4px',
                          background: selectedCases.includes(row.id) ? '#008FED' : 'rgba(12, 12, 12, 0.1)',
                          border: selectedCases.includes(row.id) ? 'none' : '1px solid rgba(12, 12, 12, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCases(prev => 
                            prev.includes(row.id) 
                              ? prev.filter(id => id !== row.id)
                              : [...prev, row.id]
                          );
                        }}
                        data-testid={`checkbox-case-${index}`}
                      >
                        {selectedCases.includes(row.id) && (
                          <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                            <path d="M1 5L4.5 8.5L11 1.5" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Fixed Bottom Bar for Selected Cases */}
        {selectedCases.length > 0 && (
          <div 
            style={{
              position: 'fixed',
              bottom: '32px',
              left: '50%',
              transform: 'translateX(-50%)',
              maxWidth: '1596px',
              width: 'calc(100% - 160px)',
              background: '#FFFFFF',
              boxShadow: '0px 0px 60px #AAB1C2, 0px 0px 20px #DBE9F5',
              borderRadius: '12px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              zIndex: 1000,
            }}
            data-testid="selected-cases-bar"
          >
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '16px', margin: '0 auto' }}>
              <span 
                style={{
                  fontFamily: 'Pretendard',
                  fontWeight: 600,
                  fontSize: '24px',
                  lineHeight: '128%',
                  letterSpacing: '-0.02em',
                  color: '#0C0C0C',
                }}
              >
                진행상황 입력
              </span>

              {selectedCases.map((caseId) => {
                const selectedCase = progressData.find(c => c.id === caseId);
                if (!selectedCase) return null;
                
                return (
                  <div 
                    key={caseId}
                    style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px' }}
                  >
                    <div style={{ width: '6px', height: '6px', background: '#008FED', borderRadius: '50%' }} />
                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '6px' }}>
                      <span 
                        style={{
                          fontFamily: 'Pretendard',
                          fontWeight: 500,
                          fontSize: '15px',
                          lineHeight: '128%',
                          letterSpacing: '-0.01em',
                          color: 'rgba(12, 12, 12, 0.7)',
                        }}
                      >
                        {selectedCase.insuranceCompany || '-'}
                      </span>
                      <span 
                        style={{
                          fontFamily: 'Pretendard',
                          fontWeight: 400,
                          fontSize: '15px',
                          lineHeight: '128%',
                          letterSpacing: '-0.01em',
                          color: 'rgba(12, 12, 12, 0.7)',
                        }}
                      >
                        {selectedCase.insuranceAccidentNo || '-'}
                      </span>
                      <span 
                        style={{
                          fontFamily: 'Pretendard',
                          fontWeight: 400,
                          fontSize: '15px',
                          lineHeight: '128%',
                          letterSpacing: '-0.01em',
                          color: 'rgba(12, 12, 12, 0.7)',
                        }}
                      >
                        {selectedCase.victimName || '-'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              style={{
                width: '28px',
                height: '28px',
                background: '#008FED',
                borderRadius: '50%',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
              }}
              onClick={() => setIsProgressModalOpen(true)}
              data-testid="button-add-progress-bottom"
            >
              <Plus style={{ width: '16px', height: '16px', color: '#FFFFFF' }} />
            </button>
          </div>
        )}

        {/* Progress Input Modal */}
        {isProgressModalOpen && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 50,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0, 0, 0, 0.5)',
            }}
            onClick={() => setIsProgressModalOpen(false)}
          >
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                padding: '32px',
                width: '90%',
                maxWidth: '600px',
                maxHeight: '80vh',
                overflow: 'auto',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2
                style={{
                  fontFamily: 'Pretendard',
                  fontWeight: 700,
                  fontSize: '24px',
                  lineHeight: '128%',
                  letterSpacing: '-0.02em',
                  color: '#0C0C0C',
                  marginBottom: '24px',
                }}
              >
                진행상황 입력
              </h2>

              <div style={{ marginBottom: '24px' }}>
                <label
                  style={{
                    display: 'block',
                    fontFamily: 'Pretendard',
                    fontWeight: 600,
                    fontSize: '15px',
                    lineHeight: '128%',
                    letterSpacing: '-0.01em',
                    color: '#0C0C0C',
                    marginBottom: '12px',
                  }}
                >
                  선택된 케이스 ({selectedCases.length}건)
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedCases.map((caseId) => {
                    const selectedCase = progressData.find(c => c.id === caseId);
                    if (!selectedCase) return null;
                    
                    return (
                      <div 
                        key={caseId}
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px',
                          padding: '8px 12px',
                          background: 'rgba(0, 143, 237, 0.05)',
                          borderRadius: '8px',
                        }}
                      >
                        <div style={{ width: '6px', height: '6px', background: '#008FED', borderRadius: '50%' }} />
                        <span 
                          style={{
                            fontFamily: 'Pretendard',
                            fontWeight: 500,
                            fontSize: '14px',
                            color: 'rgba(12, 12, 12, 0.8)',
                          }}
                        >
                          {selectedCase.insuranceCompany || '-'} / {selectedCase.insuranceAccidentNo || '-'} / {selectedCase.victimName || '-'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label
                  style={{
                    display: 'block',
                    fontFamily: 'Pretendard',
                    fontWeight: 600,
                    fontSize: '15px',
                    lineHeight: '128%',
                    letterSpacing: '-0.01em',
                    color: '#0C0C0C',
                    marginBottom: '12px',
                  }}
                >
                  주요 진행사항
                </label>
                <textarea
                  value={progressContent}
                  onChange={(e) => setProgressContent(e.target.value)}
                  placeholder="진행사항을 입력해주세요"
                  rows={6}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid rgba(12, 12, 12, 0.1)',
                    borderRadius: '8px',
                    fontFamily: 'Pretendard',
                    fontSize: '15px',
                    resize: 'vertical',
                  }}
                  data-testid="input-progress-content"
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setIsProgressModalOpen(false);
                    setProgressContent("");
                  }}
                  style={{
                    padding: '12px 24px',
                    background: 'rgba(12, 12, 12, 0.05)',
                    border: 'none',
                    borderRadius: '8px',
                    fontFamily: 'Pretendard',
                    fontWeight: 600,
                    fontSize: '15px',
                    color: '#0C0C0C',
                    cursor: 'pointer',
                  }}
                  data-testid="button-cancel-progress"
                >
                  취소
                </button>
                <button
                  onClick={handleSubmitProgress}
                  disabled={submitProgressMutation.isPending}
                  style={{
                    padding: '12px 24px',
                    background: submitProgressMutation.isPending ? 'rgba(0, 143, 237, 0.5)' : '#008FED',
                    border: 'none',
                    borderRadius: '8px',
                    fontFamily: 'Pretendard',
                    fontWeight: 600,
                    fontSize: '15px',
                    color: '#FFFFFF',
                    cursor: submitProgressMutation.isPending ? 'not-allowed' : 'pointer',
                  }}
                  data-testid="button-submit-progress"
                >
                  {submitProgressMutation.isPending ? '저장 중...' : '저장'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
