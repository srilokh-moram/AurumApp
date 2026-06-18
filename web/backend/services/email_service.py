import smtplib
import sys
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from config import SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM

_BRAND   = "CB Markets"
_GOLD    = "#f0b429"
_DARK    = "#0a0a0f"
_CARD    = "#111827"
_BORDER  = "#374151"
_INNER   = "#1f2937"
_GRAY    = "#9ca3af"
_MUTED   = "#6b7280"


def _header():
    return f"""
<tr>
  <td style="padding:40px 40px 24px;">
    <p style="margin:0 0 4px;font-size:24px;font-weight:700;color:{_GOLD};letter-spacing:1px;">{_BRAND}</p>
    <p style="margin:0;font-size:13px;color:{_MUTED};">Gold Trading Platform</p>
  </td>
</tr>
<tr><td style="padding:0 40px;"><hr style="border:none;border-top:1px solid {_INNER};"></td></tr>"""


def _footer():
    return f"""
<tr>
  <td style="padding:20px 40px 32px;">
    <p style="margin:0;color:#4b5563;font-size:12px;">&copy; 2026 {_BRAND}. All rights reserved.</p>
  </td>
</tr>"""


def _wrap(body: str) -> str:
    return f"""<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:{_DARK};font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0">
  <tr><td align="center" style="padding:48px 16px;">
    <table width="480" cellpadding="0" cellspacing="0"
           style="background:{_CARD};border-radius:16px;overflow:hidden;border:1px solid {_BORDER};">
      {_header()}{body}{_footer()}
    </table>
  </td></tr>
</table></body></html>"""


def _send_html(to_email: str, subject: str, html: str):
    if not SMTP_USER or not SMTP_PASSWORD:
        print(f"\n{'='*50}\nEMAIL | {subject}\nTo: {to_email}\n{'='*50}\n", file=sys.stderr, flush=True)
        return
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = SMTP_FROM
        msg["To"]      = to_email
        msg.attach(MIMEText(html, "html"))
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as s:
            s.ehlo(); s.starttls(); s.login(SMTP_USER, SMTP_PASSWORD)
            s.sendmail(SMTP_FROM, to_email, msg.as_string())
    except Exception as e:
        print(f"[EMAIL ERROR] {subject} → {to_email}: {e}", file=sys.stderr, flush=True)


# ── OTP ───────────────────────────────────────────────────────────────────────

def send_otp_email(to_email: str, otp: str, name: str):
    body = f"""
<tr><td style="padding:32px 40px;">
  <p style="margin:0 0 8px;color:#f9fafb;font-size:16px;">Hi {name},</p>
  <p style="margin:0 0 28px;color:{_GRAY};font-size:14px;line-height:1.6;">
    Use the code below to sign in to your {_BRAND} account. It expires in 10 minutes.
  </p>
  <div style="background:{_INNER};border-radius:12px;padding:28px;text-align:center;
              border:1px solid {_BORDER};margin-bottom:28px;">
    <span style="font-size:40px;font-weight:800;letter-spacing:12px;color:{_GOLD};
                 font-family:'Courier New',monospace;">{otp}</span>
  </div>
  <p style="margin:0;color:{_MUTED};font-size:13px;">
    If you didn't request this, you can safely ignore this email. Never share this code with anyone.
  </p>
</td></tr>"""
    _send_html(to_email, f"Your {_BRAND} login code: {otp}", _wrap(body))


# ── Deposit ───────────────────────────────────────────────────────────────────

def send_deposit_received(to_email: str, name: str, amount: float, new_balance: float):
    body = f"""
<tr><td style="padding:32px 40px;">
  <p style="margin:0 0 8px;color:#f9fafb;font-size:16px;">Hi {name},</p>
  <p style="margin:0 0 24px;color:{_GRAY};font-size:14px;line-height:1.6;">
    Your trading account has been credited.
  </p>
  <div style="background:{_INNER};border-radius:12px;padding:24px;border:1px solid {_BORDER};margin-bottom:24px;">
    <table width="100%"><tr>
      <td style="text-align:center;padding:8px;">
        <p style="margin:0 0 4px;font-size:12px;color:{_MUTED};text-transform:uppercase;">Deposited</p>
        <p style="margin:0;font-size:28px;font-weight:800;color:{_GOLD};font-family:'Courier New',monospace;">${amount:,.2f}</p>
      </td>
      <td style="text-align:center;padding:8px;border-left:1px solid {_BORDER};">
        <p style="margin:0 0 4px;font-size:12px;color:{_MUTED};text-transform:uppercase;">New Balance</p>
        <p style="margin:0;font-size:28px;font-weight:800;color:#f9fafb;font-family:'Courier New',monospace;">${new_balance:,.2f}</p>
      </td>
    </tr></table>
  </div>
  <p style="margin:0;color:{_MUTED};font-size:13px;">
    You can now use these funds to start trading. Log in to your account to get started.
  </p>
</td></tr>"""
    _send_html(to_email, f"{_BRAND} — Deposit Received: ${amount:,.2f}", _wrap(body))


# ── Withdrawal ────────────────────────────────────────────────────────────────

def send_withdrawal_approved(to_email: str, name: str, amount: float):
    body = f"""
<tr><td style="padding:32px 40px;">
  <p style="margin:0 0 8px;color:#f9fafb;font-size:16px;">Hi {name},</p>
  <p style="margin:0 0 24px;color:{_GRAY};font-size:14px;line-height:1.6;">
    Great news — your withdrawal request has been <strong style="color:#34d399;">approved</strong>.
  </p>
  <div style="background:{_INNER};border-radius:12px;padding:24px;border:1px solid {_BORDER};
              text-align:center;margin-bottom:24px;">
    <p style="margin:0 0 4px;font-size:13px;color:{_MUTED};">Amount Released</p>
    <p style="margin:0;font-size:36px;font-weight:800;color:#34d399;font-family:'Courier New',monospace;">${amount:,.2f}</p>
  </div>
  <p style="margin:0;color:{_MUTED};font-size:13px;">
    Funds will be transferred to your specified account. Contact support if you have any questions.
  </p>
</td></tr>"""
    _send_html(to_email, f"{_BRAND} — Withdrawal Approved: ${amount:,.2f}", _wrap(body))


def send_withdrawal_rejected(to_email: str, name: str, amount: float, reason: Optional[str] = None):
    reason_block = ""
    if reason:
        reason_block = f"""
  <div style="background:#1a0505;border-radius:8px;padding:16px;border:1px solid #7f1d1d;margin-bottom:20px;">
    <p style="margin:0 0 4px;font-size:12px;color:#f87171;text-transform:uppercase;letter-spacing:1px;">Reason</p>
    <p style="margin:0;color:#fca5a5;font-size:14px;">{reason}</p>
  </div>"""
    body = f"""
<tr><td style="padding:32px 40px;">
  <p style="margin:0 0 8px;color:#f9fafb;font-size:16px;">Hi {name},</p>
  <p style="margin:0 0 24px;color:{_GRAY};font-size:14px;line-height:1.6;">
    Your withdrawal request of <strong style="color:#f9fafb;">${amount:,.2f}</strong>
    has been <strong style="color:#f87171;">rejected</strong>.
  </p>
  {reason_block}
  <p style="margin:0;color:{_MUTED};font-size:13px;">
    Please contact support if you believe this is an error or need assistance.
  </p>
</td></tr>"""
    _send_html(to_email, f"{_BRAND} — Withdrawal Rejected: ${amount:,.2f}", _wrap(body))


def send_admin_withdrawal_request(admin_email: str, user_name: str, user_email: str, amount: float):
    body = f"""
<tr><td style="padding:32px 40px;">
  <p style="margin:0 0 8px;color:#f9fafb;font-size:16px;">New Withdrawal Request</p>
  <p style="margin:0 0 24px;color:{_GRAY};font-size:14px;line-height:1.6;">
    A user has submitted a withdrawal request requiring your approval.
  </p>
  <div style="background:{_INNER};border-radius:12px;padding:24px;border:1px solid {_BORDER};margin-bottom:24px;">
    <p style="margin:0 0 4px;font-size:12px;color:{_MUTED};">User</p>
    <p style="margin:0 0 16px;color:#f9fafb;font-size:14px;">{user_name} ({user_email})</p>
    <p style="margin:0 0 4px;font-size:12px;color:{_MUTED};">Amount Requested</p>
    <p style="margin:0;font-size:30px;font-weight:800;color:{_GOLD};font-family:'Courier New',monospace;">${amount:,.2f}</p>
  </div>
  <p style="margin:0;color:{_MUTED};font-size:13px;">
    Log in to the admin panel to approve or reject this request.
  </p>
</td></tr>"""
    _send_html(admin_email, f"{_BRAND} Admin — Withdrawal Request: ${amount:,.2f} from {user_name}", _wrap(body))


# ── Margin Call ───────────────────────────────────────────────────────────────

def send_margin_call_alert(to_email: str, name: str, equity: float, threshold: float):
    body = f"""
<tr><td style="padding:32px 40px;">
  <p style="margin:0 0 8px;color:#f9fafb;font-size:16px;">Hi {name},</p>
  <div style="background:#1a0505;border-radius:12px;padding:20px;border:1px solid #7f1d1d;margin-bottom:24px;">
    <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#f87171;text-transform:uppercase;
              letter-spacing:1px;">⚠ Margin Call Triggered</p>
    <p style="margin:8px 0 0;color:#fca5a5;font-size:14px;line-height:1.6;">
      Your equity dropped to <strong>${equity:,.2f}</strong>, below the threshold of
      <strong>${threshold:,.2f}</strong>. All open positions have been automatically closed.
    </p>
  </div>
  <p style="margin:0;color:{_MUTED};font-size:13px;">
    Please review your account balance and consider depositing additional funds before resuming trading.
  </p>
</td></tr>"""
    _send_html(to_email, f"{_BRAND} — Margin Call: All Positions Closed", _wrap(body))


# ── Pending Order Filled ──────────────────────────────────────────────────────

def send_pending_order_filled(to_email: str, name: str, direction: str, price: float, lots: float):
    dir_color = "#34d399" if direction == "buy" else "#f87171"
    body = f"""
<tr><td style="padding:32px 40px;">
  <p style="margin:0 0 8px;color:#f9fafb;font-size:16px;">Hi {name},</p>
  <p style="margin:0 0 24px;color:{_GRAY};font-size:14px;line-height:1.6;">
    Your pending order has been <strong style="color:#34d399;">filled</strong>.
  </p>
  <div style="background:{_INNER};border-radius:12px;padding:24px;border:1px solid {_BORDER};margin-bottom:24px;">
    <table width="100%"><tr>
      <td style="text-align:center;padding:8px;">
        <p style="margin:0 0 4px;font-size:12px;color:{_MUTED};text-transform:uppercase;">Direction</p>
        <p style="margin:0;font-size:22px;font-weight:800;color:{dir_color};">{direction.upper()}</p>
      </td>
      <td style="text-align:center;padding:8px;border-left:1px solid {_BORDER};">
        <p style="margin:0 0 4px;font-size:12px;color:{_MUTED};text-transform:uppercase;">Fill Price</p>
        <p style="margin:0;font-size:22px;font-weight:800;color:#f9fafb;font-family:'Courier New',monospace;">${price:,.2f}</p>
      </td>
      <td style="text-align:center;padding:8px;border-left:1px solid {_BORDER};">
        <p style="margin:0 0 4px;font-size:12px;color:{_MUTED};text-transform:uppercase;">Lot Size</p>
        <p style="margin:0;font-size:22px;font-weight:800;color:#f9fafb;">{lots}</p>
      </td>
    </tr></table>
  </div>
  <p style="margin:0;color:{_MUTED};font-size:13px;">
    The position is now open. Monitor it in your trading dashboard.
  </p>
</td></tr>"""
    _send_html(to_email, f"{_BRAND} — Pending Order Filled: {direction.upper()} @ ${price:,.2f}", _wrap(body))
