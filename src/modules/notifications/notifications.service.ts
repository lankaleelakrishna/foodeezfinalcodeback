import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export interface SendCredentialsPayload {
  email: string;
  phone: string;
  password: string;
  restaurantName: string;
}

export interface SendPasswordResetPayload {
  email: string;
  phone: string;
  resetToken: string;
}

export interface SendDeliveryPartnerCredentialsPayload {
  name: string;
  email: string;
  password: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendRestaurantCredentials(payload: SendCredentialsPayload) {
    const subject = `Restaurant Partner Login Details`;

    const body = `
Hello,

Your restaurant "${payload.restaurantName}" has been successfully registered.

Login Email: ${payload.email}
Temporary Password: ${payload.password}

Please login and change your password immediately.

Thank you.
`;

    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: payload.email,
        subject,
        text: body,
      });
      this.logger.log(`Credentials email sent to ${payload.email}`);
    } catch (err: any) {
      this.logger.error(`Failed sending credentials email to ${payload.email}: ${err?.message || err}`);
    }
  }

  async sendDeliveryPartnerCredentials(payload: SendDeliveryPartnerCredentialsPayload) {
    const subject = `Delivery Partner Account Created – Login Details`;

    const body = `
Hello ${payload.name},

Your delivery partner account has been created successfully.

Login Email   : ${payload.email}
Temporary Password: ${payload.password}

Please login and change your password immediately.

Thank you.
`;

    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: payload.email,
        subject,
        text: body,
      });
      this.logger.log(`Delivery partner credentials email sent to ${payload.email}`);
    } catch (err: any) {
      this.logger.error(`Failed sending delivery partner email to ${payload.email}: ${err?.message || err}`);
    }
  }

  async sendPasswordReset(payload: SendPasswordResetPayload) {
    const subject = `Password Reset Request`;

    const body = `
Hello,

A password reset request was received.

Reset Token: ${payload.resetToken}

Use this token to reset your password.

Thank you.
`;

    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: payload.email,
        subject,
        text: body,
      });
      this.logger.log(`Password reset email sent to ${payload.email}`);
    } catch (err: any) {
      this.logger.error(`Failed sending password reset email to ${payload.email}: ${err?.message || err}`);
    }
  }

  async sendCustomerOtp(payload: { phone: string; otp: string; purpose: string }) {
    // In production replace with MSG91 / Twilio SMS provider.
    // For now we log the OTP and send via email when SMTP_FROM is configured.
    this.logger.log(
      `[OTP] phone=${payload.phone} purpose=${payload.purpose} otp=${payload.otp}`,
    );

    if (process.env.SMTP_FROM && process.env.OTP_DEBUG_EMAIL) {
      const body = `
Your Foodeez OTP is: ${payload.otp}

Purpose : ${payload.purpose}
Valid for 10 minutes.

Do not share this OTP with anyone.
`;
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: process.env.OTP_DEBUG_EMAIL,
        subject: `Foodeez OTP – ${payload.otp}`,
        text: body,
      });
    }
  }

  async sendCustomerOtpByEmail(payload: { email: string; otp: string; purpose: string }) {
    if (!process.env.SMTP_FROM) return;

    const body = `
Your Foodeez OTP is: ${payload.otp}

Purpose : ${payload.purpose}
Valid for 10 minutes.

Do not share this OTP with anyone.
`;

    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: payload.email,
        subject: `Foodeez OTP – ${payload.otp}`,
        text: body,
      });
      this.logger.log(`OTP email sent to ${payload.email} for purpose=${payload.purpose}`);
    } catch (err: any) {
      this.logger.error(`Failed sending OTP email to ${payload.email}: ${err?.message || err}`);
    }
  }

  async sendOrderStatusNotification(payload: {
    customerEmail?: string;
    orderNumber: string;
    status: string;
    message: string;
  }) {
    if (!payload.customerEmail) return;

    const body = `
Hello,

Order #${payload.orderNumber} update:
${payload.message}

Thank you for ordering with Foodeez.
`;

    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: payload.customerEmail,
        subject: `Order #${payload.orderNumber} – ${payload.status}`,
        text: body,
      });
      this.logger.log(`Order status email sent to ${payload.customerEmail} — ${payload.status}`);
    } catch (err: any) {
      this.logger.error(`Failed sending order status email to ${payload.customerEmail}: ${err?.message || err}`);
    }
  }

  async sendDocumentVerified(payload: { email: string; restaurantName: string; documentType: string }) {
    if (!process.env.SMTP_FROM) return;

    const subject = `Document Verified – ${payload.documentType}`;

    const body = `
Hello,

Great news! Your ${payload.documentType} document submitted for "${payload.restaurantName}" has been verified and accepted by our team.

Your restaurant profile is one step closer to going live on Foodeez.

If you have any questions, feel free to contact our support team.

Thank you,
Team Foodeez
`;

    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: payload.email,
        subject,
        text: body,
      });
      this.logger.log(`Document verified email sent to ${payload.email} — type=${payload.documentType}`);
    } catch (err: any) {
      this.logger.error(`Failed sending document verified email to ${payload.email}: ${err?.message || err}`);
    }
  }

  async sendDocumentRejected(payload: { email: string; restaurantName: string; documentType: string; reason: string }) {
    if (!process.env.SMTP_FROM) return;

    const subject = `Document Rejected – ${payload.documentType}`;

    const body = `
Hello,

We regret to inform you that your ${payload.documentType} document submitted for "${payload.restaurantName}" has been rejected by our review team.

Reason for rejection:
${payload.reason}

Please re-upload the correct document at your earliest convenience so we can continue the onboarding process.

If you have any questions or need assistance, please contact our support team.

Thank you,
Team Foodeez
`;

    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: payload.email,
        subject,
        text: body,
      });
      this.logger.log(`Document rejected email sent to ${payload.email} — type=${payload.documentType}`);
    } catch (err: any) {
      this.logger.error(`Failed sending document rejected email to ${payload.email}: ${err?.message || err}`);
    }
  }

  async sendRegistrationSubmitted(payload: { email: string; restaurantId: string; restaurantName: string; submittedBy?: string }) {
    if (!process.env.SMTP_FROM) return;

    const subject = `Registration Submitted for Review: ${payload.restaurantName}`;

    const body = `
Hello,

The registration for "${payload.restaurantName}" (ID: ${payload.restaurantId}) has been submitted for review.

Submitted By: ${payload.submittedBy ?? 'Sales Operator'}

You will be notified when the review is completed.

Thank you.
`;

    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: payload.email,
        subject,
        text: body,
      });
      this.logger.log(`Registration submission email sent to ${payload.email} for restaurant ${payload.restaurantId}`);
    } catch (err: any) {
      this.logger.error(`Failed sending registration submission email to ${payload.email}: ${err?.message || err}`);
    }
  }
}