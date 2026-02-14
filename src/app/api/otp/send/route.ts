import { NextRequest, NextResponse } from 'next/server';
import { otpSet } from '@/lib/otp-store';
import nodemailer from 'nodemailer';

const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const otp = generateOTP();

    await otpSet(normalizedEmail, {
      otp,
      expiresAt: Date.now() + OTP_EXPIRY_MS,
    });

    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (smtpUser && smtpPass) {
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: { user: smtpUser, pass: smtpPass },
      });
      await transporter.sendMail({
        from: smtpUser,
        to: normalizedEmail,
        subject: 'Your CivicGuard verification code',
        text: `Your verification code is: ${otp}. This code expires in 5 minutes.`,
        html: `<p>Your verification code is: <strong>${otp}</strong></p><p>This code expires in 5 minutes.</p>`,
      });
    } else if (process.env.NODE_ENV === 'development') {
      console.log(`[OTP for ${normalizedEmail}]: ${otp}`);
    }

    return NextResponse.json({
      success: true,
      message: 'OTP sent to your email',
      ...(process.env.NODE_ENV === 'development' && !smtpUser && { devOtp: otp }),
    });
  } catch (error) {
    console.error('OTP send error:', error);
    return NextResponse.json({ error: 'Failed to send OTP' }, { status: 500 });
  }
}
