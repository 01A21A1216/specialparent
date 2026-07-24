import { Global, Injectable, Logger, Module, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

// Feature-flagged mailer. Wire SMTP_URL to send real email; without it we
// print the message body to the server console so a dev can copy the
// verification / reset link during local testing. Never persists secrets;
// SMTP creds live in env only.

export interface MailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class MailerService implements OnModuleInit {
  private readonly logger = new Logger(MailerService.name);
  private transporter: Transporter | null = null;
  private fromAddress = 'SpecialParents.in <no-reply@specialparents.in>';

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const url = this.config.get<string>('SMTP_URL');
    const from = this.config.get<string>('MAIL_FROM');
    if (from) this.fromAddress = from;
    if (!url) {
      this.logger.warn(
        'SMTP_URL not set — mail delivery disabled (messages will be logged to console).',
      );
      return;
    }
    try {
      this.transporter = nodemailer.createTransport(url);
      this.logger.log('SMTP transporter ready.');
    } catch (err) {
      this.logger.warn(
        `SMTP transporter init failed — falling back to console: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  /**
   * Sends `input`. Always resolves — a mail failure never breaks the
   * caller's flow (signup, forgot-password, etc.). The user hears "we sent
   * you an email"; the operator sees the failure in logs.
   */
  async send(input: MailInput): Promise<{ delivered: boolean }> {
    if (!this.transporter) {
      this.logger.log(
        `[MAIL:DEV] To: ${input.to}\n  Subject: ${input.subject}\n  ---\n  ${(
          input.text ?? this.stripHtml(input.html)
        ).replace(/\n/g, '\n  ')}`,
      );
      return { delivered: false };
    }
    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text ?? this.stripHtml(input.html),
      });
      return { delivered: true };
    } catch (err) {
      this.logger.error(
        `Mail send failed to ${input.to}: ${err instanceof Error ? err.message : String(err)}`,
      );
      return { delivered: false };
    }
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      // Preserve link targets — a plain-text email (or dev console log) is
      // useless if the URL is stripped along with the anchor tag.
      .replace(/<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, '$2 → $1')
      .replace(/<[^>]+>/g, '')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
}

@Global()
@Module({
  providers: [MailerService],
  exports: [MailerService],
})
export class MailModule {}
