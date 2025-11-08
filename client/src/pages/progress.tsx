import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { User, Case } from "@shared/schema";
import { Star, Search, Plus } from "lucide-react";
import logoIcon from "@assets/Frame 2_1762217940686.png";

export default function Progress() {
  const [activeMenu, setActiveMenu] = useState("진행상황");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRow, setSelectedRow] = useState<string | null>(null);
  const [selectedCases, setSelectedCases] = useState<string[]>([]);
  const [, setLocation] = useLocation();

  const { data: user, isLoading: userLoading } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  const { data: cases, isLoading } = useQuery<Case[]>({
    queryKey: ["/api/cases"],
  });

  const progressData = cases || [];
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

      {/* Header - Same as intake.tsx */}
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
                    placeholder="보험사, 사고번호, 접수번호, 계약자, 담당 담당자를 검색 검색해주세요."
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
                      {row.progressStatus || '-'}
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

            {/* 진행상황 입력 Section */}
            <div 
              style={{
                background: '#FFFFFF',
                boxShadow: '0px 0px 20px #DBE9F5',
                borderRadius: '12px',
                padding: '20px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                  <span 
                    style={{
                      fontFamily: 'Pretendard',
                      fontWeight: 600,
                      fontSize: '16px',
                      lineHeight: '128%',
                      letterSpacing: '-0.02em',
                      color: '#0C0C0C',
                    }}
                  >
                    진행상황 입력
                  </span>
                  <span 
                    style={{
                      fontFamily: 'Pretendard',
                      fontWeight: 400,
                      fontSize: '14px',
                      lineHeight: '128%',
                      letterSpacing: '-0.02em',
                      color: 'rgba(12, 12, 12, 0.6)',
                    }}
                  >
                    상세 기재
                  </span>
                </div>
                <button
                  style={{
                    width: '40px',
                    height: '40px',
                    background: '#008FED',
                    borderRadius: '8px',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                  data-testid="button-add-progress"
                >
                  <Plus style={{ width: '20px', height: '20px', color: '#FFFFFF' }} />
                </button>
              </div>

              {/* Progress Table */}
              {selectedRow && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0px', width: '100%' }}>
                  {/* Table Header */}
                  <div 
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '120px 120px 120px 120px 100px 100px 100px 140px 1fr',
                      background: '#F5F5F5',
                      borderRadius: '6px 6px 0 0',
                      padding: '12px 16px',
                      gap: '8px',
                    }}
                  >
                    <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '14px', color: '#686A6E' }}>접수일자</span>
                    <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '14px', color: '#686A6E' }}>M/S 배당일</span>
                    <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '14px', color: '#686A6E' }}>견적 제출</span>
                    <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '14px', color: '#686A6E' }}>견적 승인</span>
                    <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '14px', color: '#686A6E' }}>긴급도</span>
                    <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '14px', color: '#686A6E' }}>비고사항</span>
                    <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '14px', color: '#686A6E' }}>청구건</span>
                    <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '14px', color: '#686A6E' }}>시공이전 QC일</span>
                    <span style={{ fontFamily: 'Pretendard', fontWeight: 500, fontSize: '14px', color: '#686A6E' }}>시공 담당 QC일</span>
                  </div>

                  {/* Sample Data Row */}
                  <div 
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '120px 120px 120px 120px 100px 100px 100px 140px 1fr',
                      borderBottom: '1px solid #E5E5E5',
                      padding: '12px 16px',
                      gap: '8px',
                    }}
                  >
                    <span style={{ fontFamily: 'Pretendard', fontWeight: 400, fontSize: '14px', color: '#0C0C0C' }}>
                      {progressData.find(c => c.id === selectedRow)?.accidentDate || '-'}
                    </span>
                    <span style={{ fontFamily: 'Pretendard', fontWeight: 400, fontSize: '14px', color: '#0C0C0C' }}>-</span>
                    <span style={{ fontFamily: 'Pretendard', fontWeight: 400, fontSize: '14px', color: '#0C0C0C' }}>-</span>
                    <span style={{ fontFamily: 'Pretendard', fontWeight: 400, fontSize: '14px', color: '#0C0C0C' }}>-</span>
                    <span style={{ fontFamily: 'Pretendard', fontWeight: 400, fontSize: '14px', color: '#0C0C0C' }}>
                      {progressData.find(c => c.id === selectedRow)?.urgency || '-'}
                    </span>
                    <span style={{ fontFamily: 'Pretendard', fontWeight: 400, fontSize: '14px', color: '#0C0C0C' }}>-</span>
                    <span style={{ fontFamily: 'Pretendard', fontWeight: 400, fontSize: '14px', color: '#0C0C0C' }}>-</span>
                    <span style={{ fontFamily: 'Pretendard', fontWeight: 400, fontSize: '14px', color: '#0C0C0C' }}>-</span>
                    <span style={{ fontFamily: 'Pretendard', fontWeight: 400, fontSize: '14px', color: '#0C0C0C' }}>-</span>
                  </div>
                </div>
              )}

              {!selectedRow && (
                <div style={{ padding: '40px 0', textAlign: 'center' }}>
                  <span style={{ fontFamily: 'Pretendard', fontWeight: 400, fontSize: '14px', color: '#686A6E' }}>
                    케이스를 선택하여 진행상황을 입력하세요
                  </span>
                </div>
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
              data-testid="button-add-progress-bottom"
            >
              <Plus style={{ width: '16px', height: '16px', color: '#FFFFFF' }} />
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
