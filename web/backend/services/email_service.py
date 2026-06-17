import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from config import SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM


def send_otp_email(to_email: str, otp: str, name: str):
    # Development fallback: print OTP to console when SMTP is not configured
    if not SMTP_USER or not SMTP_PASSWORD:
        import sys
        print(
            f"\n{'='*50}\nAURUM OTP (no SMTP configured)\n"
            f"To: {to_email}\nOTP: {otp}\n{'='*50}\n",
            file=sys.stderr, flush=True,
        )
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"Your Aurum login code: {otp}"
    msg["From"] = SMTP_FROM
    msg["To"] = to_email

    html = f"""
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:48px 16px;">
        <table width="480" cellpadding="0" cellspacing="0"
               style="background:#111827;border-radius:16px;overflow:hidden;border:1px solid #374151;">
          <tr>
            <td style="padding:40px 40px 24px;">
              <p style="margin:0 0 4px;font-size:24px;font-weight:700;color:#f0b429;letter-spacing:1px;">AURUM</p>
              <p style="margin:0;font-size:13px;color:#6b7280;">Gold Trading Platform</p>
            </td>
          </tr>
          <tr><td style="padding:0 40px;"><hr style="border:none;border-top:1px solid #1f2937;"></td></tr>
          <tr>
            <td style="padding:32px 40px;">
              <p style="margin:0 0 8px;color:#f9fafb;font-size:16px;">Hi {name},</p>
              <p style="margin:0 0 28px;color:#9ca3af;font-size:14px;line-height:1.6;">
                Use the code below to sign in to your Aurum account. It expires in 10 minutes.
              </p>
              <div style="background:#1f2937;border-radius:12px;padding:28px;text-align:center;
                          border:1px solid #374151;margin-bottom:28px;">
                <span style="font-size:40px;font-weight:800;letter-spacing:12px;color:#f0b429;
                             font-family:'Courier New',monospace;">{otp}</span>
              </div>
              <p style="margin:0;color:#6b7280;font-size:13px;">
                If you didn't request this, you can safely ignore this email.
                Never share this code with anyone.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px 32px;">
              <p style="margin:0;color:#4b5563;font-size:12px;">
                &copy; 2026 Aurum Trading Platform. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""
    msg.attach(MIMEText(html, "html"))

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.ehlo()
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.sendmail(SMTP_FROM, to_email, msg.as_string())
