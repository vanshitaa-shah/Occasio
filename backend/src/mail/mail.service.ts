import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface SendCardMailInput {
  to: string;
  /** Sender address — the card owner's email. */
  from: string;
  subject: string;
  /** The rendered card as a PNG buffer, embedded inline in the email body. */
  png: Buffer;
}

const CID = 'occasio-card';

/**
 * Sends the rendered card via SMTP. v1 targets Mailhog (local inbox) through
 * Nodemailer; swap SMTP creds / provider via env without touching callers.
 * The PNG is embedded inline (cid) so it renders in the email body.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? 'localhost',
    port: Number(process.env.SMTP_PORT ?? 1025),
    secure: false,
  });

  async sendCard({ to, from, subject, png }: SendCardMailInput): Promise<void> {
    await this.transporter.sendMail({
      from,
      to,
      subject,
      html: `<p>You've received a card 🎉</p>
             <img src="cid:${CID}" alt="Your card" style="max-width:100%;height:auto;border-radius:8px" />`,
      attachments: [{ filename: 'card.png', content: png, cid: CID }],
    });
  }
}
