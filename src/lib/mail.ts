import nodemailer from "nodemailer";
import { ApiError } from "./errors";
import type { Locale } from "./types";

export function mailTransport() {
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.replace(/\s/g, "");
  if (!user || !pass) throw new ApiError("EMAIL_NOT_CONFIGURED", 503);
  const port = Number(process.env.SMTP_PORT || 465);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port,
    secure: port === 465,
    requireTLS: process.env.SMTP_HOST !== "127.0.0.1",
    auth: { user, pass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    logger: false,
    debug: false,
  });
}
export async function sendLoginCode(
  email: string,
  code: string,
  locale: Locale,
) {
  const transport = mailTransport();
  const fa = locale === "fa";
  try {
    const result = await transport.sendMail({
      from: {
        name: fa ? "گزارش‌یار" : "Report Desk",
        address: process.env.SMTP_USER!.trim(),
      },
      to: email,
      subject: fa ? "کد ورود به گزارش‌یار" : "Your Report Desk sign-in code",
      text: fa
        ? `کد ورود شما: ${code}\nاین کد تا ۵ دقیقه اعتبار دارد و فقط یک بار قابل استفاده است. اگر درخواست ورود نداده‌اید، این پیام را نادیده بگیرید. کد را با دیگران شریک نسازید.`
        : `Your sign-in code: ${code}\nThis code expires in 5 minutes and can be used once. If you did not request it, ignore this email. Do not share this code.`,
      html: `<div dir="${fa ? "rtl" : "ltr"}" style="font-family:Tahoma,Arial,sans-serif;background:#f2f6f6;padding:32px"><div style="max-width:480px;margin:auto;background:#fff;border:1px solid #dce5e5;padding:32px"><h2>${fa ? "ورود به گزارش‌یار" : "Sign in to Report Desk"}</h2><p>${fa ? "کد یک‌بارمصرف ورود شما:" : "Your one-time sign-in code:"}</p><p dir="ltr" style="font-size:32px;letter-spacing:8px;text-align:center;font-weight:bold;color:#1d3534">${code}</p><p>${fa ? "اعتبار: ۵ دقیقه. کد را با دیگران شریک نسازید. اگر درخواست ورود نداده‌اید، این پیام را نادیده بگیرید." : "Valid for 5 minutes. Do not share this code. If you did not request it, ignore this email."}</p></div></div>`,
    });
    if (!result.accepted?.length) throw new Error("NOT_ACCEPTED");
  } catch {
    // SMTP errors can contain credentials or message contents; never log them.
    throw new ApiError("EMAIL_SEND_FAILED", 503);
  } finally {
    transport.close();
  }
}
