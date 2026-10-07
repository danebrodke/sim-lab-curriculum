const SUBJECTS: Record<string, string> = {
  'sign-in': 'Your Sim Lab sign-in code',
  'email-verification': 'Confirm your Sim Lab account',
  'forget-password': 'Your Sim Lab password reset code',
};

// Sends a 6-digit code via Resend. Codes only (no links): OHSU's URL Defense
// rewrites links in email and breaks them.
export async function sendOtpEmail(email: string, otp: string, type: string) {
  const subject = SUBJECTS[type] ?? 'Your Sim Lab verification code';

  if (!process.env.RESEND_API_KEY) {
    console.warn(`[email] RESEND_API_KEY not set. ${type} code for ${email}: ${otp}`);
    return;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || 'OHSU Sim Lab <noreply@ohsusim.com>',
      to: email,
      subject,
      text: `Your code is ${otp}\n\nIt expires in 10 minutes. If you didn't request this, you can ignore this email.`,
      html: `<div style="font-family:system-ui,sans-serif;max-width:420px">
<p>Your OHSU Sim Lab code is:</p>
<p style="font-size:28px;font-weight:600;letter-spacing:6px;margin:16px 0">${otp}</p>
<p style="color:#666;font-size:13px">It expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
</div>`,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`[email] Resend failed (${res.status}): ${body}`);
    throw new Error('Failed to send email');
  }
}
