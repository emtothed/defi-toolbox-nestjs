import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class EmailService {
  constructor(private mailerService: MailerService) {}

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const url = `http://localhost:3000/auth/verify/${token}`;

    await this.mailerService.sendMail({
      to: email,
      subject: 'Email Verification for DeFi Toolbox',
      html: `Please click <a href="${url}">here</a> to verify your email.`,
    });
  }

  async sendApiKey(email: string, apiKey: string): Promise<void> {
    await this.mailerService.sendMail({
      to: email,
      subject: 'Your API Key',
      html: `Your API key is: <strong>${apiKey}</strong><br>
            Please store it safely and don't share it with anyone.`,
    });
  }
}
