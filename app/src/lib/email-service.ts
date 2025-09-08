import sgMail from '@sendgrid/mail';
import { getEmailConfig, getFromEmail } from './email-config';

// Configurar SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export interface EmailData {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface InvitationEmailData {
  to: string;
  role: string;
  invitationLink: string;
  invitedBy?: string;
  personalMessage?: string;
}

export class EmailService {
  private static instance: EmailService;
  private isConfigured: boolean;

  private constructor() {
    this.isConfigured = this.checkConfiguration();
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  private checkConfiguration(): boolean {
    const config = getEmailConfig();
    
    switch (config.service) {
      case 'sendgrid':
        return !!(process.env.SENDGRID_API_KEY);
      case 'aws-ses':
        return !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
      case 'nodemailer':
        return !!(process.env.SMTP_HOST && process.env.SMTP_USER);
      case 'mock':
        return true;
      default:
        return false;
    }
  }

  public async sendEmail(emailData: EmailData): Promise<boolean> {
    try {
      const config = getEmailConfig();
      
      switch (config.service) {
        case 'sendgrid':
          return await this.sendWithSendGrid(emailData);
        case 'aws-ses':
          return await this.sendWithAWSSES(emailData);
        case 'nodemailer':
          return await this.sendWithNodemailer(emailData);
        case 'mock':
          return await this.sendMock(emailData);
        default:
          throw new Error('No email service configured');
      }
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  public async sendInvitationEmail(data: InvitationEmailData): Promise<boolean> {
    const subject = `You're invited to join Athlete Hub as a ${data.role}`;
    
    const html = this.generateInvitationHTML(data);
    const text = this.generateInvitationText(data);

    return await this.sendEmail({
      to: data.to,
      subject,
      html,
      text
    });
  }

  private async sendWithSendGrid(emailData: EmailData): Promise<boolean> {
    if (!process.env.SENDGRID_API_KEY) {
      throw new Error('SendGrid API key not configured');
    }

    const msg = {
      to: emailData.to,
      from: getFromEmail(),
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text || this.htmlToText(emailData.html)
    };

    try {
      await sgMail.send(msg);
      console.log(`✅ Email sent via SendGrid to ${emailData.to}`);
      return true;
    } catch (error) {
      console.error('SendGrid error:', error);
      throw error;
    }
  }

  private async sendWithAWSSES(emailData: EmailData): Promise<boolean> {
    // Implementación para AWS SES
    console.log(`📧 Email would be sent via AWS SES to ${emailData.to}`);
    console.log('AWS SES integration not yet implemented');
    return true; // Simulado por ahora
  }

  private async sendWithNodemailer(emailData: EmailData): Promise<boolean> {
    // Implementación para Nodemailer
    console.log(`📧 Email would be sent via Nodemailer to ${emailData.to}`);
    console.log('Nodemailer integration not yet implemented');
    return true; // Simulado por ahora
  }

  private async sendMock(emailData: EmailData): Promise<boolean> {
    // Modo mock para desarrollo
    console.log('=== MOCK EMAIL SENT ===');
    console.log('To:', emailData.to);
    console.log('Subject:', emailData.subject);
    console.log('HTML Content Length:', emailData.html.length);
    console.log('========================');
    return true;
  }

  private generateInvitationHTML(data: InvitationEmailData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invitation to Join Athlete Hub</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 15px 30px; background: #3B82F6; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
          .button:hover { background: #2563EB; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          .role-badge { display: inline-block; padding: 5px 15px; background: #10B981; color: white; border-radius: 20px; font-size: 14px; margin: 10px 0; }
          .expiry { background: #FEF3C7; border: 1px solid #F59E0B; padding: 15px; border-radius: 8px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏃‍♂️ Athlete Hub</h1>
            <p>You've been invited to join our platform!</p>
          </div>
          
          <div class="content">
            <h2>Welcome to Athlete Hub!</h2>
            
            <p>You've been invited to join our platform as a <strong>${data.role}</strong>.</p>
            
            <div class="role-badge">Role: ${data.role.charAt(0).toUpperCase() + data.role.slice(1)}</div>
            
            ${data.personalMessage ? `<p><em>"${data.personalMessage}"</em></p>` : ''}
            
            <p>Click the button below to accept your invitation and create your account:</p>
            
            <div style="text-align: center;">
              <a href="${data.invitationLink}" class="button">
                🎯 Accept Invitation
              </a>
            </div>
            
            <div class="expiry">
              <strong>⚠️ Important:</strong> This invitation expires in 7 days for security reasons.
            </div>
            
            <p>If you have any questions or need assistance, please contact your administrator.</p>
            
            <p>Best regards,<br>The Athlete Hub Team</p>
          </div>
          
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>© ${new Date().getFullYear()} Athlete Hub. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateInvitationText(data: InvitationEmailData): string {
    return `
Athlete Hub - Invitation

You've been invited to join Athlete Hub as a ${data.role}.

${data.personalMessage ? `Personal Message: "${data.personalMessage}"` : ''}

To accept your invitation, visit this link:
${data.invitationLink}

Role: ${data.role.charAt(0).toUpperCase() + data.role.slice(1)}
Expires: In 7 days

If you have any questions, please contact your administrator.

Best regards,
The Athlete Hub Team

---
This is an automated message. Please do not reply to this email.
© ${new Date().getFullYear()} Athlete Hub. All rights reserved.
    `.trim();
  }

  private htmlToText(html: string): string {
    // Conversión simple de HTML a texto plano
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  public getConfigurationStatus(): { configured: boolean; service: string; details: string } {
    const config = getEmailConfig();
    
    return {
      configured: this.isConfigured,
      service: config.service,
      details: this.getConfigurationDetails()
    };
  }

  private getConfigurationDetails(): string {
    const config = getEmailConfig();
    
    switch (config.service) {
      case 'sendgrid':
        return process.env.SENDGRID_API_KEY ? 'API Key configured' : 'API Key missing';
      case 'aws-ses':
        return (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) ? 'AWS credentials configured' : 'AWS credentials missing';
      case 'nodemailer':
        return (process.env.SMTP_HOST && process.env.SMTP_USER) ? 'SMTP configured' : 'SMTP configuration incomplete';
      case 'mock':
        return 'Mock mode active (development)';
      default:
        return 'No service configured';
    }
  }
}

// Exportar instancia singleton
export const emailService = EmailService.getInstance();

