import { Injectable, Logger } from '@nestjs/common';

/**
 * Dev mail service: writes "emails" to the backend console.
 * For production: replace the `send` body with a Resend/SendGrid/SMTP call.
 */
@Injectable()
export class MailService {
  private logger = new Logger('MailService');

  async sendOtp(to: string, otp: string) {
    return this.send(to, 'Your QuizAI verification code',
      `Your verification code is: ${otp}\n\nThis code expires in 15 minutes.`);
  }

  async sendPasswordReset(to: string, resetUrl: string) {
    return this.send(to, 'Reset your QuizAI password',
      `Click the link below to reset your password:\n\n${resetUrl}\n\nThis link expires in 30 minutes. If you didn't request this, ignore this email.`);
  }

  private async send(to: string, subject: string, body: string) {
    const banner = '─'.repeat(60);
    this.logger.log(
      `\n${banner}\n📧  EMAIL (dev-mode console)\n${banner}\nTO:      ${to}\nSUBJECT: ${subject}\n\n${body}\n${banner}`,
    );
  }
}
