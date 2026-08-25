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

const CID = 'occasio-card.png';
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

/**
 * Sends the rendered card either via Brevo's HTTP email API (BREVO_API_KEY set)
 * or raw SMTP (Mailhog in dev; any SMTP provider otherwise).
 *
 * Outbound SMTP (25/465/587) is blocked/throttled on some hosts' free tiers
 * (e.g. Render's free plan), which surfaces as a hung "Connection timeout" —
 * the HTTP API rides over plain HTTPS instead, sidestepping that entirely.
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
  private readonly brevoApiKey = process.env.BREVO_API_KEY;
  private readonly transporter: Transporter | undefined = this.brevoApiKey
    ? undefined
    : nodemailer.createTransport({
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

  async sendCard({
    to,
    replyTo,
    subject,
    png,
  }: SendCardMailInput): Promise<void> {
    const html = `<p>You've received a card 🎉</p>
             <img src="cid:${CID}" alt="Your card" style="max-width:100%;height:auto;border-radius:8px" />`;

    if (this.brevoApiKey) {
      await this.sendViaBrevoApi({ to, replyTo, subject, html, png });
      return;
    }

    await this.transporter!.sendMail({
      from: this.from,
      replyTo,
      to,
      subject,
      html,
      attachments: [{ filename: 'card.png', content: png, cid: CID }],
    });
  }

  /** Splits SMTP_FROM ("Name <email>" or bare "email") into Brevo's sender shape. */
  private parseFrom(): { name?: string; email: string } {
    const match = this.from.match(/^(.*)<(.+)>$/);
    if (match) {
      const name = match[1].trim();
      return { name: name || undefined, email: match[2].trim() };
    }
    return { email: this.from.trim() };
  }

  private async sendViaBrevoApi({
    to,
    replyTo,
    subject,
    html,
    png,
  }: {
    to: string;
    replyTo: string;
    subject: string;
    html: string;
    png: Buffer;
  }): Promise<void> {
    const res = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'api-key': this.brevoApiKey!,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: this.parseFrom(),
        to: [{ email: to }],
        replyTo: { email: replyTo },
        subject,
        htmlContent: html,
        attachment: [{ name: CID, content: png.toString('base64') }],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Brevo API error ${res.status}: ${body}`);
    }
  }
}
