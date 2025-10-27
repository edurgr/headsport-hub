// Try Postmark first, fallback to AWS SES, then console log
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text?: string,
): Promise<boolean> {
  // Try Postmark first
  if (process.env.POSTMARK_TOKEN) {
    try {
      const response = await fetch('https://api.postmarkapp.com/email', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-Postmark-Server-Token': process.env.POSTMARK_TOKEN,
        },
        body: JSON.stringify({
          From: process.env.FROM_EMAIL || 'noreply@headsport-hub.com',
          To: to,
          Subject: subject,
          HtmlBody: html,
          TextBody: text || html.replace(/<[^>]*>/g, ''),
          MessageStream: 'outbound',
        }),
      });

      if (response.ok) {
        console.log('Email sent via Postmark to:', to);
        return true;
      }
    } catch (error) {
      console.warn('Postmark failed, trying AWS SES:', error);
    }
  }

  // Try AWS SES if Postmark fails
  if (
    process.env.AWS_SES_ACCESS_KEY_ID &&
    process.env.AWS_SES_SECRET_ACCESS_KEY &&
    process.env.AWS_SES_REGION
  ) {
    try {
      // This would require AWS SDK - simplified version
      const sesResponse = await fetch(
        `https://email.${process.env.AWS_SES_REGION}.amazonaws.com/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `AWS4-HMAC-SHA256 Credential=${process.env.AWS_SES_ACCESS_KEY_ID}`,
          },
          body: new URLSearchParams({
            Action: 'SendEmail',
            Source: process.env.FROM_EMAIL || 'noreply@headsport-hub.com',
            Destination: `ToAddresses=${to}`,
            Message: JSON.stringify({
              Subject: { Data: subject },
              Body: {
                Html: { Data: html },
                Text: { Data: text || html.replace(/<[^>]*>/g, '') },
              },
            }),
          }),
        },
      );

      if (sesResponse.ok) {
        console.log('Email sent via AWS SES to:', to);
        return true;
      }
    } catch (error) {
      console.warn('AWS SES failed:', error);
    }
  }

  // Fallback to console log for development
  console.log('=== EMAIL NOT SENT (No email provider configured) ===');
  console.log('To:', to);
  console.log('Subject:', subject);
  console.log('HTML:', html);
  console.log('==================================================');

  // In development, we'll return true to simulate success
  // In production, this should return false if no email was actually sent
  return process.env.NODE_ENV === 'development';
}

// Helper function for invitation emails
export async function sendInvitationEmail(
  email: string,
  rolePreset: string,
  inviteUrl: string,
  message?: string,
): Promise<boolean> {
  const subject = `You've been invited to HEAD Sport Hub`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">Welcome to HEAD Sport Hub!</h2>
        <p>You've been invited to join HEAD Sport Hub as a <strong>${rolePreset}</strong>.</p>
      
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0;"><strong>Click the button below to accept your invitation:</strong></p>
        <a href="${inviteUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px;">
          Accept Invitation
        </a>
      </div>
      
      ${message ? `<p><strong>Personal Message:</strong><br>${message}</p>` : ''}
      
      <p style="color: #6b7280; font-size: 14px;">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <a href="${inviteUrl}" style="color: #2563eb;">${inviteUrl}</a>
      </p>
      
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
      <p style="color: #6b7280; font-size: 12px;">
        This invitation will expire in ${process.env.INVITE_TOKEN_TTL_DAYS || 7} days.
      </p>
    </div>
  `;

  return sendEmail(email, subject, html);
}

// Helper function for order confirmation emails
export async function sendOrderConfirmationEmail(
  email: string,
  orderId: string,
  items: Array<{
    product: {
      name: string;
      sku: string;
      category?: string;
    };
    length_cm?: string;
    quantity: number;
    boot_size?: string;
  }>,
): Promise<boolean> {
  const subject = `Order Confirmation - ${orderId}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Order Confirmed!</h2>
      <p>Your order has been received and is being processed.</p>
      
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Order Details</h3>
        <p><strong>Order ID:</strong> ${orderId}</p>
        <p><strong>Items:</strong></p>
        <ul>
          ${items
            .map(
              (item) => `
            <li>${item.product.name} (${item.product.sku}) - Qty: ${item.quantity}
              ${item.length_cm ? ` - Length: ${item.length_cm}cm` : ''}
              ${item.boot_size ? ` - Size: ${item.boot_size}` : ''}
            </li>
          `,
            )
            .join('')}
        </ul>
      </div>
      
      <p>We'll notify you when your order is ready for pickup or shipping.</p>
      
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
      <p style="color: #6b7280; font-size: 12px;">
        Thank you for choosing HEAD Sport Hub!
      </p>
    </div>
  `;

  return sendEmail(email, subject, html);
}
