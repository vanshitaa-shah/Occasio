import { Injectable, Logger } from '@nestjs/common';

export interface SendCardMailInput {
  to: string;
  subject: string;
  /** The rendered card as a PNG buffer, embedded inline in the email body. */
  png: Buffer;
}

/**
 * Sends the rendered card via SMTP. v1 targets Mailhog (local inbox) through
 * Nodemailer; swap SMTP creds / provider via env without touching callers.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  /**
   * Phase 3 fills this in:
   *   - nodemailer.createTransport({ host: SMTP_HOST, port: SMTP_PORT })
   *   - attach the PNG inline (cid) and reference it in the HTML body
   */
  async sendCard(_input: SendCardMailInput): Promise<void> {
    // TODO(phase-3): Nodemailer transport + inline PNG.
    throw new Error('MailService.sendCard not implemented until Phase 3');
  }
}
