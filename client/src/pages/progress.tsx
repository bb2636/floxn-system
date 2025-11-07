import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { User } from "@shared/schema";
import logoIcon from "@assets/Frame 2_1762217940686.png";

export default function Progress() {
  const [activeMenu, setActiveMenu] = useState("진행상황");
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [, setLocation] = useLocation();

  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  // Mock data for progress list
  const mockProgressData = [
    { id: 1, date: "2025-01-15", insurer: "MG손해보험", insurerAccidentNo: "25219943", receptionNo: "25145136", contractor: "김블락", assessor: "이블락", assessorManager: "박블락", manager: "최블락", restorationType: "선견적요청", mainProgress: "서류 보완 요청" },
    { id: 2, date: "2025-01-14", insurer: "삼성화재", insurerAccidentNo: "25219942", receptionNo: "25145135", contractor: "박철수", assessor: "김영희", assessorManager: "이민수", manager: "정지훈", restorationType: "플랫폼 복구", mainProgress: "현장 조사 중" },
    { id: 3, date: "2025-01-13", insurer: "현대해상", insurerAccidentNo: "25219941", receptionNo: "25145134", contractor: "이미라", assessor: "최수진", assessorManager: "강동원", manager: "송혜교", restorationType: "없음", mainProgress: "접수 완료" },
  ];

  const totalCount = mockProgressData.length;

  return (
    <div 
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(0deg, #E7EDFE, #E7EDFE), #FFFFFF',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background Ellipses */}
      <div 
        style={{
          position: 'absolute',
          width: '1095px',
          height: '776.83px',
          left: '97.61px',
          bottom: '1169.19px',
          background: 'rgba(254, 240, 230, 0.4)',
          filter: 'blur(212px)',
          transform: 'rotate(-35.25deg)',
        }}
      />
      <div 
        style={{
          position: 'absolute',
          width: '1334.83px',
          height: '1322.98px',
          left: '811.58px',
          bottom: '0px',
          background: 'rgba(234, 230, 254, 0.5)',
          filter: 'blur(212px)',
        }}
      />
      <div 
        style={{
          position: 'absolute',
          width: '348px',
          height: '1322.98px',
          left: '0px',
          bottom: '188.99px',
          background: 'rgba(234, 230, 254, 0.5)',
          filter: 'blur(212px)',
        }}
      />

      {/* Header */}
      <header 
        style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 162px',
          height: '108px',
          background: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(10px)',
          position: 'relative',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <img src={logoIcon} alt="FLOXN Logo" style={{ height: '40px' }} />
        </div>

        <nav style={{ display: 'flex', gap: '48px' }}>
          {["접수하기", "진행상황", "통계 및 정산", "관리자"].map((menu) => (
            <button
              key={menu}
              onClick={() => {
                setActiveMenu(menu);
                if (menu === "접수하기") setLocation("/intake");
                else if (menu === "진행상황") setLocation("/progress");
                else if (menu === "관리자") setLocation("/admin-settings");
              }}
              style={{
                background: 'none',
                border: 'none',
                fontFamily: 'Pretendard',
                fontWeight: activeMenu === menu ? 700 : 600,
                fontSize: '18px',
                lineHeight: '128%',
                letterSpacing: '-0.02em',
                color: activeMenu === menu ? '#008FED' : 'rgba(12, 12, 12, 0.6)',
                cursor: 'pointer',
                padding: '8px 0',
                borderBottom: activeMenu === menu ? '2px solid #008FED' : 'none',
              }}
              data-testid={`nav-${menu}`}
            >
              {menu}
            </button>
          ))}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div 
            style={{
              fontFamily: 'Pretendard',
              fontWeight: 600,
              fontSize: '16px',
              color: 'rgba(12, 12, 12, 0.8)',
            }}
          >
            {user?.username || '사용자'}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main 
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          padding: '0px',
          position: 'absolute',
          width: '1596px',
          left: 'calc(50% - 1596px/2)',
          top: '401px',
        }}
      >
        {/* Title Section */}
        <div 
          style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '24px 0px',
            width: '1596px',
            height: '82px',
          }}
        >
          <div 
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              padding: '0px',
              gap: '16px',
              margin: '0 auto',
            }}
          >
            <span 
              style={{
                fontFamily: 'Pretendard',
                fontWeight: 600,
                fontSize: '20px',
                lineHeight: '128%',
                letterSpacing: '-0.02em',
                color: 'rgba(12, 12, 12, 0.9)',
              }}
            >
              접수 목록
            </span>
            <span 
              style={{
                fontFamily: 'Pretendard',
                fontWeight: 600,
                fontSize: '20px',
                lineHeight: '128%',
                letterSpacing: '-0.02em',
                color: 'rgba(0, 143, 237, 0.9)',
              }}
            >
              {totalCount}
            </span>
          </div>
        </div>

        {/* Table Container */}
        <div 
          style={{
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            padding: '0px 0px 16px',
            gap: '17px',
            width: '1596px',
            backdropFilter: 'blur(7px)',
            borderRadius: '8px',
          }}
        >
          {/* Table Header */}
          <div 
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              padding: '0px 12px',
              width: '1596px',
              height: '54px',
              background: 'rgba(12, 12, 12, 0.04)',
              borderRadius: '8px',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '17.5px 8px', gap: '10px', width: '150.2px', flexGrow: 1 }}>
              <span style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '15px', lineHeight: '128%', letterSpacing: '-0.02em', color: 'rgba(12, 12, 12, 0.6)' }}>날짜</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '17.5px 8px', gap: '10px', width: '150.2px', flexGrow: 1 }}>
              <span style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '15px', lineHeight: '128%', letterSpacing: '-0.02em', color: 'rgba(12, 12, 12, 0.6)' }}>보험사</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '17.5px 8px', gap: '10px', width: '150.2px', flexGrow: 1 }}>
              <span style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '15px', lineHeight: '128%', letterSpacing: '-0.02em', color: 'rgba(12, 12, 12, 0.6)' }}>보험사 사고번호</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '17.5px 8px', gap: '10px', width: '150.2px', flexGrow: 1 }}>
              <span style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '15px', lineHeight: '128%', letterSpacing: '-0.02em', color: 'rgba(12, 12, 12, 0.6)' }}>접수번호</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '17.5px 8px', gap: '10px', width: '150.2px', flexGrow: 1 }}>
              <span style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '15px', lineHeight: '128%', letterSpacing: '-0.02em', color: 'rgba(12, 12, 12, 0.6)' }}>계약자</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '17.5px 8px', gap: '10px', width: '150.2px', flexGrow: 1 }}>
              <span style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '15px', lineHeight: '128%', letterSpacing: '-0.02em', color: 'rgba(12, 12, 12, 0.6)' }}>심사사</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '17.5px 8px', gap: '10px', width: '150.2px', flexGrow: 1 }}>
              <span style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '15px', lineHeight: '128%', letterSpacing: '-0.02em', color: 'rgba(12, 12, 12, 0.6)' }}>심사 담당자</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '17.5px 8px', gap: '10px', width: '150.2px', flexGrow: 1 }}>
              <span style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '15px', lineHeight: '128%', letterSpacing: '-0.02em', color: 'rgba(12, 12, 12, 0.6)' }}>담당자</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '17.5px 8px', gap: '10px', width: '150.2px', flexGrow: 1 }}>
              <span style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '15px', lineHeight: '128%', letterSpacing: '-0.02em', color: 'rgba(12, 12, 12, 0.6)' }}>복구유형</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '17.5px 8px', gap: '10px', width: '150.2px', flexGrow: 1 }}>
              <span style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '15px', lineHeight: '128%', letterSpacing: '-0.02em', color: 'rgba(12, 12, 12, 0.6)' }}>주요 진행사항</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '17.5px 8px', gap: '10px', width: '70px' }}>
              <span style={{ fontFamily: 'Pretendard', fontWeight: 600, fontSize: '15px', lineHeight: '128%', letterSpacing: '-0.02em', color: 'rgba(12, 12, 12, 0.6)' }}>요청</span>
            </div>
          </div>

          {/* Table Data Rows */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '0px', gap: '17px', width: '1596px' }}>
            {mockProgressData.map((row, index) => (
              <div 
                key={row.id}
                onClick={() => setSelectedRow(row.id)}
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: '0px 12px',
                  width: '1596px',
                  height: '44px',
                  background: index === 0 ? 'rgba(0, 143, 237, 0.04)' : 'transparent',
                  border: index === 0 ? '1px solid #008FED' : 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
                data-testid={`progress-row-${row.id}`}
              >
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '12px 8px', gap: '10px', width: '150.2px', flexGrow: 1 }}>
                  <span style={{ fontFamily: 'Pretendard', fontWeight: 400, fontSize: '16px', lineHeight: '128%', letterSpacing: '-0.02em', color: 'rgba(12, 12, 12, 0.8)' }}>{row.date}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '12px 8px', gap: '10px', width: '150.2px', flexGrow: 1 }}>
                  <span style={{ fontFamily: 'Pretendard', fontWeight: 400, fontSize: '16px', lineHeight: '128%', letterSpacing: '-0.02em', color: 'rgba(12, 12, 12, 0.8)' }}>{row.insurer}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '12px 8px', gap: '10px', width: '150.2px', flexGrow: 1 }}>
                  <span style={{ fontFamily: 'Pretendard', fontWeight: 400, fontSize: '16px', lineHeight: '128%', letterSpacing: '-0.02em', color: 'rgba(12, 12, 12, 0.8)' }}>{row.insurerAccidentNo}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '12px 8px', gap: '10px', width: '150.2px', flexGrow: 1 }}>
                  <span style={{ fontFamily: 'Pretendard', fontWeight: 400, fontSize: '16px', lineHeight: '128%', letterSpacing: '-0.02em', color: 'rgba(12, 12, 12, 0.8)' }}>{row.receptionNo}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '12px 8px', gap: '10px', width: '150.2px', flexGrow: 1 }}>
                  <span style={{ fontFamily: 'Pretendard', fontWeight: 400, fontSize: '16px', lineHeight: '128%', letterSpacing: '-0.02em', color: 'rgba(12, 12, 12, 0.8)' }}>{row.contractor}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '12px 8px', gap: '10px', width: '150.2px', flexGrow: 1 }}>
                  <span style={{ fontFamily: 'Pretendard', fontWeight: 400, fontSize: '16px', lineHeight: '128%', letterSpacing: '-0.02em', color: 'rgba(12, 12, 12, 0.8)' }}>{row.assessor}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '12px 8px', gap: '10px', width: '150.2px', flexGrow: 1 }}>
                  <span style={{ fontFamily: 'Pretendard', fontWeight: 400, fontSize: '16px', lineHeight: '128%', letterSpacing: '-0.02em', color: 'rgba(12, 12, 12, 0.8)' }}>{row.assessorManager}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '12px 8px', gap: '10px', width: '150.2px', flexGrow: 1 }}>
                  <span style={{ fontFamily: 'Pretendard', fontWeight: 400, fontSize: '16px', lineHeight: '128%', letterSpacing: '-0.02em', color: 'rgba(12, 12, 12, 0.8)' }}>{row.manager}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '12px 8px', gap: '10px', width: '150.2px', flexGrow: 1 }}>
                  <span style={{ fontFamily: 'Pretendard', fontWeight: 400, fontSize: '16px', lineHeight: '128%', letterSpacing: '-0.02em', color: 'rgba(12, 12, 12, 0.8)' }}>{row.restorationType}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '12px 8px', gap: '10px', width: '150.2px', flexGrow: 1 }}>
                  <span style={{ fontFamily: 'Pretendard', fontWeight: 400, fontSize: '16px', lineHeight: '128%', letterSpacing: '-0.02em', color: 'rgba(12, 12, 12, 0.8)' }}>{row.mainProgress}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '0px 8px', gap: '10px', width: '70px' }}>
                  <div style={{ position: 'relative', width: '18px', height: '18px' }}>
                    <div 
                      style={{
                        position: 'absolute',
                        left: '0%',
                        right: '0%',
                        top: '0%',
                        bottom: '0%',
                        background: selectedRow === row.id ? '#008FED' : 'rgba(12, 12, 12, 0.1)',
                        border: selectedRow === row.id ? 'none' : '1px solid rgba(12, 12, 12, 0.1)',
                        borderRadius: '50%',
                      }}
                    />
                    {selectedRow === row.id && (
                      <div 
                        style={{
                          position: 'absolute',
                          left: '27.78%',
                          right: '27.78%',
                          top: '27.78%',
                          bottom: '27.78%',
                          background: '#FDFDFD',
                          borderRadius: '50%',
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
