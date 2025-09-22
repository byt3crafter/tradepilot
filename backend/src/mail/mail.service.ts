
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT'),
      secure: this.configService.get<boolean>('SMTP_SECURE'),
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });
  }

  private async sendMail(to: string, subject: string, html: string) {
    const from = `"${this.configService.get<string>('EMAIL_FROM_NAME')}" <${this.configService.get<string>('EMAIL_FROM')}>`;
    try {
      const info = await this.transporter.sendMail({
        from,
        to,
        subject,
        html,
      });
      this.logger.log(`Email sent to ${to}: ${info.messageId}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}`, error.stack);
    }
  }

  async sendVerificationEmail(email: string, token: string) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const verificationLink = `${frontendUrl}/verify-email?token=${token}`;
    const subject = 'Welcome to tradePilot! Please Verify Your Email';
    const html = this.generateStyledEmail(
        'Welcome to tradePilot!',
        'Thank you for registering. Please click the button below to verify your email address and activate your account.',
        verificationLink,
        'Verify Email Address'
    );
    await this.sendMail(email, subject, html);
  }

  async sendPasswordResetEmail(email: string, token: string) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;
    const subject = 'tradePilot: Password Reset Request';
     const html = this.generateStyledEmail(
        'Password Reset Request',
        'You recently requested to reset your password for your tradePilot account. Click the button below to reset it. If you did not request a password reset, please ignore this email.',
        resetLink,
        'Reset Your Password'
    );
    await this.sendMail(email, subject, html);
  }

  async sendChangeEmailVerification(newEmail: string, token: string) {
    const appUrl = this.configService.get<string>('APP_URL');
    const verificationLink = `${appUrl}/auth/verify-email-change?token=${token}`;
    const subject = 'tradePilot: Confirm Your New Email Address';
    const html = this.generateStyledEmail(
        'Confirm Your New Email',
        'Please click the button below to confirm your new email address.',
        verificationLink,
        'Confirm New Email'
    );
    await this.sendMail(newEmail, subject, html);
  }

  private generateStyledEmail(title: string, body: string, link: string, buttonText: string): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
              body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #0A0B0D; color: #EAEAEA; }
              .container { max-width: 600px; margin: 40px auto; background-color: #14161C; border: 1px solid rgba(0, 191, 255, 0.2); border-radius: 8px; overflow: hidden; }
              .header { padding: 20px; text-align: center; }
              .header h1 { font-family: 'Orbitron', sans-serif; color: #00BFFF; margin: 0; font-size: 28px; }
              .content { padding: 30px; }
              .content p { font-size: 16px; line-height: 1.6; margin: 0 0 20px; }
              .button-container { text-align: center; margin: 30px 0; }
              .button { background-color: #00BFFF; color: #0A0B0D; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px; }
              .footer { padding: 20px; text-align: center; font-size: 12px; color: #8899A6; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>tradePilot</h1>
              </div>
              <div class="content">
                  <h2>${title}</h2>
                  <p>${body}</p>
                  <div class="button-container">
                      <a href="${link}" class="button">${buttonText}</a>
                  </div>
                  <p>If you're having trouble clicking the button, copy and paste the URL below into your web browser:</p>
                  <p style="font-size: 12px; word-break: break-all;">${link}</p>
              </div>
              <div class="footer">
                  &copy; ${new Date().getFullYear()} tradePilot. All rights reserved.
              </div>
          </div>
      </body>
      </html>
    `;
  }
}