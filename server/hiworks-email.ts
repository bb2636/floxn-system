import nodemailer from 'nodemailer';

const SMTP_HOST = 'smtp.hiworks.com';
const SMTP_PORT = 587;
const SMTP_USER = 'master@floxn.co.kr';

let transporter: nodemailer.Transporter | null = null;

export function initializeEmailTransporter(): void {
  const password = process.env.MAIL_APP_PASSWORD;
  
  if (!password) {
    console.warn('[Hiworks Email] MAIL_APP_PASSWORD not set - email sending will be disabled');
    return;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: false,
    requireTLS: true,
    auth: {
      user: SMTP_USER,
      pass: password,
    },
  });

  transporter.verify((error, success) => {
    if (error) {
      console.error('[Hiworks Email] SMTP connection verification failed:', error.message);
    } else {
      console.log('[Hiworks Email] SMTP connection verified successfully');
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
  if (!transporter) {
    const password = process.env.MAIL_APP_PASSWORD;
    if (!password) {
      return { success: false, error: 'MAIL_APP_PASSWORD not configured' };
    }
    
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: false,
      requireTLS: true,
      auth: {
        user: SMTP_USER,
        pass: password,
      },
    });
  }

  try {
    console.log(`[Hiworks Email] Sending email to: ${options.to}`);
    
    const mailOptions: nodemailer.SendMailOptions = {
      from: `"FLOXN" <${SMTP_USER}>`,
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
    console.log(`[Hiworks Email] Email sent successfully. MessageId: ${result.messageId}`);
    
    return { success: true, messageId: result.messageId };
  } catch (error: any) {
    console.error('[Hiworks Email] Failed to send email:', error.message);
    return { success: false, error: error.message };
  }
}

export async function sendFieldReportEmail(
  to: string,
  caseNumber: string,
  insuredName: string,
  pdfBuffer: Buffer
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const today = new Date();
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  
  const subject = `[FLOXN] 현장출동보고서 - ${caseNumber}`;
  
  const htmlContent = `
    <div style="font-family: 'Malgun Gothic', 'Noto Sans KR', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333; border-bottom: 2px solid #0066cc; padding-bottom: 10px;">현장출동보고서 송부</h2>
      
      <p style="color: #666; line-height: 1.8;">안녕하세요,</p>
      
      <p style="color: #666; line-height: 1.8;">
        아래 접수건에 대한 <strong>현장출동보고서</strong>를 첨부하여 송부드립니다.
      </p>
      
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr>
          <td style="background: #f5f5f5; padding: 10px 15px; border: 1px solid #ddd; width: 120px; font-weight: bold;">접수번호</td>
          <td style="padding: 10px 15px; border: 1px solid #ddd;">${caseNumber}</td>
        </tr>
        <tr>
          <td style="background: #f5f5f5; padding: 10px 15px; border: 1px solid #ddd; font-weight: bold;">피보험자</td>
          <td style="padding: 10px 15px; border: 1px solid #ddd;">${insuredName || '-'}</td>
        </tr>
        <tr>
          <td style="background: #f5f5f5; padding: 10px 15px; border: 1px solid #ddd; font-weight: bold;">발송일</td>
          <td style="padding: 10px 15px; border: 1px solid #ddd;">${dateStr}</td>
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

- 접수번호: ${caseNumber}
- 피보험자: ${insuredName || '-'}
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
