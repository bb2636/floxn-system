import { useState } from "react";
import { useLocation } from "wouter";
import { Plus, MessageSquare, X, Mail, Loader2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Intake from "@/pages/intake";

interface Recipient {
  name: string;
  phone: string;
}

export function FloatingIntakeButton() {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [smsDialogOpen, setSmsDialogOpen] = useState(false);
  const { toast } = useToast();

  const [smsSubject, setSmsSubject] = useState("");
  const [smsContent, setSmsContent] = useState("");
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [newRecipientName, setNewRecipientName] = useState("");
  const [newRecipientPhone, setNewRecipientPhone] = useState("");

  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  const sendSmsMutation = useMutation({
    mutationFn: async (data: { subject: string; content: string; recipients: Recipient[] }) => {
      const res = await apiRequest("POST", "/api/send-custom-sms", data);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "문자 발송 완료",
        description: data.message,
      });
      resetSmsForm();
      setSmsDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "문자 발송 실패",
        description: error?.message || "문자 발송 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const hiddenPaths = ['/', '/login', '/intake', '/forbidden', '/not-found'];
  if (hiddenPaths.includes(location)) return null;

  if (user?.role !== "관리자") return null;

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleSuccess = () => {
    setIsOpen(false);
  };

  const addRecipient = () => {
    if (!newRecipientName.trim() || !newRecipientPhone.trim()) {
      toast({
        title: "입력 오류",
        description: "이름과 휴대폰번호를 모두 입력해주세요.",
        variant: "destructive",
      });
      return;
    }
    setRecipients([...recipients, { name: newRecipientName.trim(), phone: newRecipientPhone.trim() }]);
    setNewRecipientName("");
    setNewRecipientPhone("");
  };

  const removeRecipient = (index: number) => {
    setRecipients(recipients.filter((_, i) => i !== index));
  };

  const resetSmsForm = () => {
    setSmsSubject("");
    setSmsContent("");
    setRecipients([]);
    setNewRecipientName("");
    setNewRecipientPhone("");
  };

  const handleSendSms = () => {
    if (!smsSubject.trim()) {
      toast({ title: "입력 오류", description: "제목을 입력해주세요.", variant: "destructive" });
      return;
    }
    if (!smsContent.trim()) {
      toast({ title: "입력 오류", description: "내용을 입력해주세요.", variant: "destructive" });
      return;
    }
    if (recipients.length === 0) {
      toast({ title: "입력 오류", description: "수신인을 1명 이상 추가해주세요.", variant: "destructive" });
      return;
    }
    sendSmsMutation.mutate({
      subject: smsSubject,
      content: smsContent,
      recipients,
    });
  };

  return (
    <>
      <div
        style={{
          position: 'fixed',
          bottom: '32px',
          left: '32px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          zIndex: 100,
        }}
      >
        <button
          onClick={() => {
            resetSmsForm();
            setSmsDialogOpen(true);
          }}
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '14px 20px',
            background: '#6B5CE7',
            borderRadius: '40px',
            border: 'none',
            boxShadow: '0px 4px 20px rgba(107, 92, 231, 0.4)',
            cursor: 'pointer',
          }}
          data-testid="button-floating-sms"
        >
          <MessageSquare size={18} color="#FFFFFF" />
          <span style={{
            fontFamily: 'Pretendard',
            fontWeight: 600,
            fontSize: '14px',
            lineHeight: '128%',
            letterSpacing: '-0.02em',
            color: '#FFFFFF',
          }}>
            문자발송
          </span>
        </button>

        <button
          onClick={() => setIsOpen(true)}
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '16px 24px',
            background: '#008FED',
            borderRadius: '40px',
            border: 'none',
            boxShadow: '0px 4px 20px rgba(0, 143, 237, 0.4)',
            cursor: 'pointer',
          }}
          data-testid="button-floating-intake"
        >
          <span style={{
            fontFamily: 'Pretendard',
            fontWeight: 600,
            fontSize: '16px',
            lineHeight: '128%',
            letterSpacing: '-0.02em',
            color: '#FFFFFF',
          }}>
            접수
          </span>
          <Plus size={20} color="#FFFFFF" />
        </button>
      </div>

      <Dialog open={smsDialogOpen} onOpenChange={setSmsDialogOpen}>
        <DialogContent
          style={{
            maxWidth: '720px',
            width: '90vw',
            maxHeight: '85vh',
            overflow: 'auto',
            padding: '0',
            borderRadius: '12px',
          }}
          data-testid="dialog-sms-send"
        >
          <div style={{ padding: '28px 32px' }}>
            <DialogHeader>
              <DialogTitle style={{
                fontFamily: 'Pretendard',
                fontSize: '20px',
                fontWeight: 700,
                color: '#0C0C0C',
                textAlign: 'center',
                marginBottom: '24px',
              }}>
                문자 보내기
              </DialogTitle>
            </DialogHeader>

            <div style={{ display: 'flex', gap: '20px' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <label style={{
                    fontFamily: 'Pretendard',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#0C0C0C',
                    minWidth: '48px',
                  }}>
                    제목
                  </label>
                  <input
                    type="text"
                    value={smsSubject}
                    onChange={(e) => setSmsSubject(e.target.value)}
                    placeholder="문자 제목을 입력하세요"
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      border: '1px solid rgba(12, 12, 12, 0.15)',
                      borderRadius: '8px',
                      fontFamily: 'Pretendard',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                    data-testid="input-sms-subject"
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{
                    fontFamily: 'Pretendard',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#008FED',
                  }}>
                    내용입력
                  </label>
                  <textarea
                    value={smsContent}
                    onChange={(e) => setSmsContent(e.target.value)}
                    placeholder="문자 내용을 입력하세요"
                    style={{
                      width: '100%',
                      minHeight: '220px',
                      padding: '14px',
                      border: '1px solid #008FED',
                      borderRadius: '8px',
                      fontFamily: 'Pretendard',
                      fontSize: '14px',
                      lineHeight: '1.6',
                      resize: 'vertical',
                      outline: 'none',
                      background: '#F0F7FF',
                    }}
                    data-testid="textarea-sms-content"
                  />
                </div>
              </div>

              <div style={{ width: '260px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <div style={{
                    fontFamily: 'Pretendard',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#0C0C0C',
                    marginBottom: '8px',
                  }}>
                    수신인
                  </div>

                  <div style={{
                    border: '1px solid rgba(12, 12, 12, 0.15)',
                    borderRadius: '8px',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '80px 1fr 32px',
                      background: '#F5F7FA',
                      borderBottom: '1px solid rgba(12, 12, 12, 0.1)',
                    }}>
                      <div style={{ padding: '8px 10px', fontFamily: 'Pretendard', fontSize: '12px', fontWeight: 600, color: 'rgba(12,12,12,0.6)' }}>이름</div>
                      <div style={{ padding: '8px 10px', fontFamily: 'Pretendard', fontSize: '12px', fontWeight: 600, color: 'rgba(12,12,12,0.6)' }}>휴대폰번호</div>
                      <div />
                    </div>

                    <div style={{ maxHeight: '160px', overflowY: 'auto' }}>
                      {recipients.length === 0 ? (
                        <div style={{
                          padding: '20px',
                          textAlign: 'center',
                          fontFamily: 'Pretendard',
                          fontSize: '12px',
                          color: 'rgba(12,12,12,0.3)',
                        }}>
                          수신인을 추가해주세요
                        </div>
                      ) : (
                        recipients.map((r, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '80px 1fr 32px',
                              borderBottom: idx < recipients.length - 1 ? '1px solid rgba(12,12,12,0.06)' : 'none',
                              alignItems: 'center',
                            }}
                            data-testid={`row-recipient-${idx}`}
                          >
                            <div style={{ padding: '8px 10px', fontFamily: 'Pretendard', fontSize: '13px', color: '#0C0C0C', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
                            <div style={{ padding: '8px 10px', fontFamily: 'Pretendard', fontSize: '13px', color: '#0C0C0C' }}>{r.phone}</div>
                            <button
                              onClick={() => removeRecipient(idx)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              data-testid={`button-remove-recipient-${idx}`}
                            >
                              <X size={14} color="rgba(12,12,12,0.4)" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '6px', marginTop: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      value={newRecipientName}
                      onChange={(e) => setNewRecipientName(e.target.value)}
                      placeholder="이름"
                      style={{
                        width: '70px',
                        padding: '8px 10px',
                        border: '1px solid rgba(12, 12, 12, 0.15)',
                        borderRadius: '6px',
                        fontFamily: 'Pretendard',
                        fontSize: '13px',
                        outline: 'none',
                      }}
                      data-testid="input-recipient-name"
                    />
                    <input
                      type="text"
                      value={newRecipientPhone}
                      onChange={(e) => setNewRecipientPhone(e.target.value)}
                      placeholder="휴대폰번호"
                      onKeyPress={(e) => { if (e.key === 'Enter') addRecipient(); }}
                      style={{
                        flex: 1,
                        padding: '8px 10px',
                        border: '1px solid rgba(12, 12, 12, 0.15)',
                        borderRadius: '6px',
                        fontFamily: 'Pretendard',
                        fontSize: '13px',
                        outline: 'none',
                      }}
                      data-testid="input-recipient-phone"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={addRecipient}
                      data-testid="button-add-recipient"
                    >
                      <Plus size={16} />
                    </Button>
                  </div>
                </div>

              </div>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginTop: '24px',
              paddingTop: '16px',
              borderTop: '1px solid rgba(12, 12, 12, 0.08)',
            }}>
              <Button
                onClick={handleSendSms}
                disabled={sendSmsMutation.isPending}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 24px',
                  background: '#008FED',
                  fontFamily: 'Pretendard',
                  fontWeight: 600,
                  fontSize: '14px',
                }}
                data-testid="button-send-sms"
              >
                {sendSmsMutation.isPending ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Mail size={18} />
                )}
                {sendSmsMutation.isPending ? "발송 중..." : "발송"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Sheet open={isOpen} onOpenChange={setIsOpen} modal={true}>
        <SheetContent 
          side="right" 
          className="w-full sm:max-w-full md:max-w-[90vw] lg:max-w-[85vw] xl:max-w-[80vw] p-0 flex flex-col"
          style={{ 
            maxWidth: '1400px',
            background: '#F5F7FA',
            height: '100vh',
          }}
        >
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <Intake 
              isModal={true} 
              onClose={handleClose} 
              onSuccess={handleSuccess} 
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
