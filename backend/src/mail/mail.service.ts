import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private configService: ConfigService) {}

  // This service is largely deprecated in favor of Clerk's built-in email handling.
  // Methods kept as placeholders or for custom notifications if needed later.

  async sendVerificationEmail(email: string, token: string) {
    this.logger.warn('sendVerificationEmail called but local mailer is disabled. Clerk handles this.');
  }

  async sendPasswordResetEmail(email: string, token: string) {
    this.logger.warn('sendPasswordResetEmail called but local mailer is disabled. Clerk handles this.');
  }

  async sendChangeEmailVerification(newEmail: string, token: string) {
    this.logger.warn('sendChangeEmailVerification called but local mailer is disabled.');
  }
}