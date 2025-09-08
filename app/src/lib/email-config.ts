// Configuration for email sending
export interface EmailConfig {
  // Email service configuration
  service: 'sendgrid' | 'aws-ses' | 'nodemailer' | 'mock';
  
  // SendGrid configuration
  sendgrid?: {
    apiKey: string;
    fromEmail: string;
    fromName: string;
  };
  
  // AWS SES configuration
  awsSes?: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    fromEmail: string;
  };
  
  // Nodemailer configuration
  nodemailer?: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
    fromEmail: string;
  };
}

// Default configuration (development mode)
export const defaultEmailConfig: EmailConfig = {
  service: 'mock',
  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY || '',
    fromEmail: process.env.FROM_EMAIL || 'noreply@athletehub.com',
    fromName: process.env.FROM_NAME || 'Athlete Hub'
  },
  awsSes: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    region: process.env.AWS_REGION || 'us-east-1',
    fromEmail: process.env.FROM_EMAIL || 'noreply@athletehub.com'
  },
  nodemailer: {
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || ''
    },
    fromEmail: process.env.FROM_EMAIL || 'noreply@athletehub.com'
  }
};

// Función para obtener la configuración actual
export function getEmailConfig(): EmailConfig {
  // Check if SendGrid is configured and use it automatically
  if (process.env.SENDGRID_API_KEY) {
    return {
      ...defaultEmailConfig,
      service: 'sendgrid'
    };
  }
  
  // If no SendGrid, use mock for development
  return defaultEmailConfig;
}

// Function to verify if email service is configured
export function isEmailServiceConfigured(): boolean {
  const config = getEmailConfig();
  
  switch (config.service) {
    case 'sendgrid':
      return !!(config.sendgrid?.apiKey);
    case 'aws-ses':
      return !!(config.awsSes?.accessKeyId && config.awsSes?.secretAccessKey);
    case 'nodemailer':
      return !!(config.nodemailer?.host && config.nodemailer?.auth.user);
    case 'mock':
      return true; // Always available in development mode
    default:
      return false;
  }
}

// Function to get sender email
export function getFromEmail(): string {
  const config = getEmailConfig();
  
  switch (config.service) {
    case 'sendgrid':
      return config.sendgrid?.fromEmail || 'noreply@athletehub.com';
    case 'aws-ses':
      return config.awsSes?.fromEmail || 'noreply@athletehub.com';
    case 'nodemailer':
      return config.nodemailer?.fromEmail || 'noreply@athletehub.com';
    case 'mock':
      return 'noreply@athletehub.com';
    default:
      return 'noreply@athletehub.com';
  }
}
