import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface SendCardMailInput {
  to: string;
  /** Reply-To = the card owner's email (we can't send *as* them; see below). */
  replyTo: string;
  subject: string;
  /** The rendered card as a PNG buffer, embedded inline in the email body. */
  png: Buffer;
}

const CID = 'occasio-card';

/**
 * Sends the rendered card via SMTP. Works with any SMTP provider (Mailhog in
 * dev; Brevo/SendGrid/Resend/etc. in prod) via env — set SMTP_HOST/PORT and,
 * for real providers, SMTP_USER/SMTP_PASS/SMTP_SECURE.
 *
 * Email can't be sent *as* an arbitrary user's address (SPF/DKIM/DMARC), so the
 * `From` is a fixed, verified sender we control (SMTP_FROM) and the owner's
 * address is set as `Reply-To`. The visible "Sent by: <owner>" attribution
 * lives in the rendered card image instead.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly from =
    process.env.SMTP_FROM ?? 'Occasio <no-reply@occasio.local>';
  private readonly transporter: Transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? 'localhost',
    port: Number(process.env.SMTP_PORT ?? 1025),
    secure: process.env.SMTP_SECURE === 'true',
    ...(process.env.SMTP_USER
      ? {
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        }
      : {}),
  });

  async sendCard({ to, replyTo, subject, png }: SendCardMailInput): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      replyTo,
      to,
      subject,
      html: `<p>You've received a card 🎉</p>
             <img src="cid:${CID}" alt="Your card" style="max-width:100%;height:auto;border-radius:8px" />`,
      attachments: [{ filename: 'card.png', content: png, cid: CID }],
    });
  }
}
