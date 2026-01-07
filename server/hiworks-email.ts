import nodemailer from 'nodemailer';

const SMTP_CONFIGS = {
  hiworks: {
    host: 'smtps.hiworks.com',
    port: 465,
    secure: true,
    user: 'hjlee@floxn.co.kr',
  },
  gmail: {
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    user: process.env.GMAIL_USER || '',
  },
};

function getSmtpConfig() {
  const provider = (process.env.MAIL_PROVIDER || 'hiworks').toLowerCase();
  const config = SMTP_CONFIGS[provider as keyof typeof SMTP_CONFIGS] || SMTP_CONFIGS.hiworks;
  
  if (provider === 'gmail' && process.env.GMAIL_USER) {
    config.user = process.env.GMAIL_USER;
  }
  
  return { provider, config };
}

let transporter: nodemailer.Transporter | null = null;

export function initializeEmailTransporter(): void {
  const password = process.env.MAIL_APP_PASSWORD;
  
  if (!password) {
    console.warn('[Email] MAIL_APP_PASSWORD not set - email sending will be disabled');
    return;
  }

  const { provider, config } = getSmtpConfig();
  
  console.log('[Email] Initializing SMTP transporter...');
  console.log(`[Email] Provider: ${provider}`);
  console.log(`[Email] Host: ${config.host}, Port: ${config.port}, Secure: ${config.secure}`);
  console.log(`[Email] User: ${config.user}`);

  transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: password,
    },
  });

  transporter.verify((error, success) => {
    if (error) {
      const err = error as any;
      console.error('[Email] ========== SMTP VERIFICATION FAILED ==========');
      console.error(`[Email] Provider: ${provider}`);
      console.error(`[Email] Host: ${config.host}:${config.port}`);
      console.error(`[Email] User: ${config.user}`);
      console.error(`[Email] Error code: ${err.code || 'N/A'}`);
      console.error(`[Email] Error command: ${err.command || 'N/A'}`);
      console.error(`[Email] Error responseCode: ${err.responseCode || 'N/A'}`);
      console.error(`[Email] Error response: ${err.response || 'N/A'}`);
      console.error(`[Email] Error message: ${err.message || 'N/A'}`);
      console.error('[Email] ==============================================');
    } else {
      console.log('[Email] SMTP connection verified successfully');
    }
  });
}

interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

interface SendEmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: EmailAttachment[];
}

export async function sendEmailWithAttachment(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { provider, config } = getSmtpConfig();
  
  if (!transporter) {
    const password = process.env.MAIL_APP_PASSWORD;
    if (!password) {
      return { success: false, error: 'MAIL_APP_PASSWORD not configured' };
    }
    
    console.log('[Email] Creating transporter on-demand...');
    transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: password,
      },
    });
  }

  try {
    console.log(`[Email] Sending email via ${provider}`);
    console.log(`[Email] To: ${options.to}`);
    console.log(`[Email] Subject: ${options.subject}`);
    console.log(`[Email] Attachments: ${options.attachments?.length || 0} files`);
    
    // 상세 첨부 파일 로깅
    let totalAttachmentBytes = 0;
    let totalBase64Bytes = 0;
    if (options.attachments && options.attachments.length > 0) {
      console.log('[Email] ========== 첨부 파일 상세 정보 ==========');
      for (const att of options.attachments) {
        const rawBytes = att.content.length;
        const base64Bytes = Math.ceil(rawBytes * 4 / 3); // base64 인코딩 후 예상 크기
        totalAttachmentBytes += rawBytes;
        totalBase64Bytes += base64Bytes;
        console.log(`[Email]   ${att.filename}: ${(rawBytes / 1024 / 1024).toFixed(3)}MB (raw) → ${(base64Bytes / 1024 / 1024).toFixed(3)}MB (base64)`);
      }
      console.log('[Email] ------------------------------------------');
      console.log(`[Email] 총 첨부 파일: ${options.attachments.length}개`);
      console.log(`[Email] 총 raw 용량: ${(totalAttachmentBytes / 1024 / 1024).toFixed(3)}MB`);
      console.log(`[Email] 총 base64 용량 (예상): ${(totalBase64Bytes / 1024 / 1024).toFixed(3)}MB`);
      
      // 이메일 본문 크기 추가
      const textBytes = options.text?.length || 0;
      const htmlBytes = options.html?.length || 0;
      const headerEstimate = 2000; // MIME 헤더 예상
      const totalMessageEstimate = totalBase64Bytes + textBytes + htmlBytes + headerEstimate;
      console.log(`[Email] 본문(text/html): ${((textBytes + htmlBytes) / 1024).toFixed(1)}KB`);
      console.log(`[Email] 전체 메시지 예상 크기: ${(totalMessageEstimate / 1024 / 1024).toFixed(3)}MB`);
      console.log('[Email] ==============================================');
    }
    
    const mailOptions: nodemailer.SendMailOptions = {
      from: `"FLOXN" <${config.user}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: options.attachments?.map(att => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType || 'application/pdf',
      })),
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`[Email] Email sent successfully. MessageId: ${result.messageId}`);
    
    return { success: true, messageId: result.messageId };
  } catch (error: any) {
    console.error('[Email] ========== SEND MAIL FAILED ==========');
    console.error(`[Email] Provider: ${provider}`);
    console.error(`[Email] To: ${options.to}`);
    console.error(`[Email] Error code: ${error.code || 'N/A'}`);
    console.error(`[Email] Error command: ${error.command || 'N/A'}`);
    console.error(`[Email] Error responseCode: ${error.responseCode || 'N/A'}`);
    console.error(`[Email] Error response: ${error.response || 'N/A'}`);
    console.error(`[Email] Error message: ${error.message || 'N/A'}`);
    console.error('[Email] ==========================================');
    return { success: false, error: error.message };
  }
}

export interface FieldReportEmailData {
  insuranceAccidentNo?: string;
  policyNumber?: string;
  assessorTeam?: string;
  investigatorTeam?: string;
}

export async function sendFieldReportEmail(
  to: string,
  caseNumber: string,
  insuredName: string,
  pdfBuffer: Buffer,
  additionalData?: FieldReportEmailData
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const today = new Date();
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  
  const accidentNo = additionalData?.insuranceAccidentNo || '-';
  const policyNo = additionalData?.policyNumber || '-';
  const assessor = additionalData?.assessorTeam || '-';
  const investigator = additionalData?.investigatorTeam || '-';
  
  // 이메일 제목: 보험사 사고번호 우선, 없으면 증권번호, 둘 다 없으면 접수번호
  const subjectIdentifier = additionalData?.insuranceAccidentNo || additionalData?.policyNumber || caseNumber;
  const subject = `[FLOXN] 현장출동보고서 - ${subjectIdentifier}`;
  
  const htmlContent = `
    <div style="font-family: 'Malgun Gothic', 'Noto Sans KR', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333; border-bottom: 2px solid #0066cc; padding-bottom: 10px;">현장출동보고서 송부</h2>
      
      <p style="color: #666; line-height: 1.8;">안녕하세요,</p>
      
      <p style="color: #666; line-height: 1.8;">
        아래 접수건에 대한 <strong>현장출동보고서</strong>를 첨부하여 송부드립니다.
      </p>
      
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; table-layout: fixed;">
        <tr>
          <td style="background: #f5f5f5; padding: 10px 15px; border: 1px solid #ddd; width: 20%; font-weight: bold;">사고번호</td>
          <td style="padding: 10px 15px; border: 1px solid #ddd;" colspan="4">${accidentNo}</td>
        </tr>
        <tr>
          <td style="background: #f5f5f5; padding: 10px 15px; border: 1px solid #ddd; width: 20%; font-weight: bold;">담당자</td>
          <td style="background: #f5f5f5; padding: 10px 15px; border: 1px solid #ddd; width: 15%; font-weight: bold; text-align: center;">심사자</td>
          <td style="padding: 10px 15px; border: 1px solid #ddd; width: 25%; word-break: break-word;">${assessor}</td>
          <td style="background: #f5f5f5; padding: 10px 15px; border: 1px solid #ddd; width: 15%; font-weight: bold; text-align: center;">조사자</td>
          <td style="padding: 10px 15px; border: 1px solid #ddd; width: 25%; word-break: break-word;">${investigator}</td>
        </tr>
        <tr>
          <td style="background: #f5f5f5; padding: 10px 15px; border: 1px solid #ddd; font-weight: bold;">피보험자</td>
          <td style="padding: 10px 15px; border: 1px solid #ddd;" colspan="4">${insuredName || '-'}</td>
        </tr>
        <tr>
          <td style="background: #f5f5f5; padding: 10px 15px; border: 1px solid #ddd; font-weight: bold;">접수번호</td>
          <td style="padding: 10px 15px; border: 1px solid #ddd;" colspan="4">${caseNumber}</td>
        </tr>
        <tr>
          <td style="background: #f5f5f5; padding: 10px 15px; border: 1px solid #ddd; font-weight: bold;">발송일</td>
          <td style="padding: 10px 15px; border: 1px solid #ddd;" colspan="4">${dateStr}</td>
        </tr>
      </table>
      
      <p style="color: #666; line-height: 1.8;">
        첨부된 PDF 파일을 확인해 주시기 바랍니다.
      </p>
      
      <p style="color: #666; line-height: 1.8; margin-top: 30px;">
        감사합니다.<br/>
        <strong>FLOXN</strong>
      </p>
      
      <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;" />
      
      <p style="color: #999; font-size: 12px;">
        본 메일은 FLOXN 시스템에서 자동 발송되었습니다.
      </p>
    </div>
  `;

  const textContent = `
현장출동보고서 송부

안녕하세요,

아래 접수건에 대한 현장출동보고서를 첨부하여 송부드립니다.

- 사고번호: ${accidentNo}
- 담당자: 심사자 ${assessor} / 조사자 ${investigator}
- 피보험자: ${insuredName || '-'}
- 접수번호: ${caseNumber}
- 발송일: ${dateStr}

첨부된 PDF 파일을 확인해 주시기 바랍니다.

감사합니다.
FLOXN
  `;

  const filename = `현장출동보고서_${caseNumber}_${dateStr}.pdf`;

  return sendEmailWithAttachment({
    to,
    subject,
    text: textContent,
    html: htmlContent,
    attachments: [
      {
        filename,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  });
}

export async function sendFieldReportEmailWithLink(
  to: string,
  caseNumber: string,
  insuredName: string,
  pdfUrl: string,
  additionalData?: FieldReportEmailData
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const today = new Date();
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  
  const accidentNo = additionalData?.insuranceAccidentNo || '-';
  const assessor = additionalData?.assessorTeam || '-';
  const investigator = additionalData?.investigatorTeam || '-';
  
  const subjectIdentifier = additionalData?.insuranceAccidentNo || additionalData?.policyNumber || caseNumber;
  const subject = `[FLOXN] 현장출동보고서 - ${subjectIdentifier}`;
  
  const htmlContent = `
    <div style="font-family: 'Malgun Gothic', 'Noto Sans KR', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333; border-bottom: 2px solid #0066cc; padding-bottom: 10px;">현장출동보고서 송부</h2>
      
      <p style="color: #666; line-height: 1.8;">안녕하세요,</p>
      
      <p style="color: #666; line-height: 1.8;">
        아래 접수건에 대한 <strong>현장출동보고서</strong>를 송부드립니다.
      </p>
      
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; table-layout: fixed;">
        <tr>
          <td style="background: #f5f5f5; padding: 10px 15px; border: 1px solid #ddd; width: 20%; font-weight: bold;">사고번호</td>
          <td style="padding: 10px 15px; border: 1px solid #ddd;" colspan="4">${accidentNo}</td>
        </tr>
        <tr>
          <td style="background: #f5f5f5; padding: 10px 15px; border: 1px solid #ddd; width: 20%; font-weight: bold;">담당자</td>
          <td style="background: #f5f5f5; padding: 10px 15px; border: 1px solid #ddd; width: 15%; font-weight: bold; text-align: center;">심사자</td>
          <td style="padding: 10px 15px; border: 1px solid #ddd; width: 25%; word-break: break-word;">${assessor}</td>
          <td style="background: #f5f5f5; padding: 10px 15px; border: 1px solid #ddd; width: 15%; font-weight: bold; text-align: center;">조사자</td>
          <td style="padding: 10px 15px; border: 1px solid #ddd; width: 25%; word-break: break-word;">${investigator}</td>
        </tr>
        <tr>
          <td style="background: #f5f5f5; padding: 10px 15px; border: 1px solid #ddd; font-weight: bold;">피보험자</td>
          <td style="padding: 10px 15px; border: 1px solid #ddd;" colspan="4">${insuredName || '-'}</td>
        </tr>
        <tr>
          <td style="background: #f5f5f5; padding: 10px 15px; border: 1px solid #ddd; font-weight: bold;">접수번호</td>
          <td style="padding: 10px 15px; border: 1px solid #ddd;" colspan="4">${caseNumber}</td>
        </tr>
        <tr>
          <td style="background: #f5f5f5; padding: 10px 15px; border: 1px solid #ddd; font-weight: bold;">발송일</td>
          <td style="padding: 10px 15px; border: 1px solid #ddd;" colspan="4">${dateStr}</td>
        </tr>
      </table>
      
      <div style="background: #f0f7ff; border: 1px solid #0066cc; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
        <p style="color: #333; margin: 0 0 15px 0; font-weight: bold;">📎 PDF 다운로드</p>
        <a href="${pdfUrl}" style="display: inline-block; background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
          현장출동보고서 다운로드
        </a>
        <p style="color: #666; font-size: 12px; margin: 15px 0 0 0;">
          (링크는 7일간 유효합니다)
        </p>
      </div>
      
      <p style="color: #666; line-height: 1.8; margin-top: 30px;">
        감사합니다.<br/>
        <strong>FLOXN</strong>
      </p>
      
      <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;" />
      
      <p style="color: #999; font-size: 12px;">
        본 메일은 FLOXN 시스템에서 자동 발송되었습니다.
      </p>
    </div>
  `;

  const textContent = `
현장출동보고서 송부

안녕하세요,

아래 접수건에 대한 현장출동보고서를 송부드립니다.

- 사고번호: ${accidentNo}
- 담당자: 심사자 ${assessor} / 조사자 ${investigator}
- 피보험자: ${insuredName || '-'}
- 접수번호: ${caseNumber}
- 발송일: ${dateStr}

▶ PDF 다운로드 링크 (7일간 유효):
${pdfUrl}

감사합니다.
FLOXN
  `;

  return sendEmailWithAttachment({
    to,
    subject,
    text: textContent,
    html: htmlContent,
    attachments: [],
  });
}
