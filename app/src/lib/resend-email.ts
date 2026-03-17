import { Resend } from 'resend';

function getFromAddress(): string {
  const name = process.env.RESEND_FROM_NAME || 'HEAD Sport Hub';
  const email =
    process.env.RESEND_FROM_EMAIL ||
    process.env.FROM_EMAIL ||
    'noreply@head-hub.local';
  return `${name} <${email}>`;
}

export async function sendResendEmail(params: {
  to: string;
  subject: string;
  html: string;
  from?: string;
}): Promise<{ sent: boolean; error?: string; id?: string }> {
  const apiKey = process.env.RESEND_API_KEY || process.env.NEXT_PUBLIC_RESEND_API_KEY || '';
  if (!apiKey) {
    // Do not throw; allow API flows to succeed without email provider
    console.warn('Resend not configured: RESEND_API_KEY missing. Email will not be sent.');
    return { sent: false, error: 'RESEND_API_KEY not configured' };
  }
  try {
    const from = params.from || getFromAddress();
    const client = new Resend(apiKey);
    const result: any = await client.emails.send({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
    return { sent: true, id: result?.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { sent: false, error: msg };
  }
}

export async function sendResendInvitationEmail(params: {
  to: string;
  inviteUrl: string; // Prefer Supabase action_link when available
  role?: string;
  personalMessage?: string;
}): Promise<{ sent: boolean; error?: string }> {
  const subject = 'HEAD Sport Hub — Invitation';
  const roleText = params.role ? `Assigned role: <strong>${params.role}</strong>` : '';
  const personalText = params.personalMessage
    ? `<p style="margin: 8px 0;"><em>${params.personalMessage}</em></p>`
    : '';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #111827;">HEAD Sport Hub</h2>
      <p style="margin-top: 12px;">Welcome!</p>
      <p style="margin: 8px 0;">Click the button below to follow the steps and create your account.</p>
      ${roleText ? `<p style="margin: 8px 0;">${roleText}</p>` : ''}
      ${personalText}
      <p style="margin-top: 16px;">
        <a href="${params.inviteUrl}" style="display:inline-block;background:#111827;color:#ffffff;padding:12px 18px;text-decoration:none;border-radius:8px;">Create my account</a>
      </p>
      <p style="font-size:12px;color:#6b7280;margin-top:16px;">If the button doesn't work, copy and paste this link in your browser:</p>
      <p style="font-size:12px;word-break: break-all;"><a href="${params.inviteUrl}">${params.inviteUrl}</a></p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
      <p style="font-size:12px;color:#6b7280;">Thanks,</p>
      <p style="font-size:12px;color:#6b7280;">HEAD Sport Hub Team</p>
    </div>
  `;
  return sendResendEmail({ to: params.to, subject, html });
}


