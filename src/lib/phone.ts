// Phone numbers are stored in E.164 (+962791234567). Customers type them in
// every local format imaginable, so we infer the country from the business's
// time zone when the number has no country code.

const CALLING_CODE_BY_TIMEZONE: Record<string, string> = {
  "Asia/Amman": "962",
  "Asia/Dubai": "971",
  "Asia/Riyadh": "966",
  "Asia/Qatar": "974",
  "Asia/Kuwait": "965",
  "Asia/Bahrain": "973",
  "Asia/Muscat": "968",
  "Asia/Beirut": "961",
  "Africa/Cairo": "20",
  "Europe/Istanbul": "90",
  "Europe/London": "44",
};

export function normalizePhone(raw: string, timeZone?: string): string | null {
  const trimmed = raw.trim();
  let digits = trimmed.replace(/\D/g, "");
  if (digits === "") return null;

  if (trimmed.startsWith("+")) {
    // already international
  } else if (digits.startsWith("00")) {
    digits = digits.slice(2);
  } else if (digits.startsWith("0")) {
    const code = timeZone ? CALLING_CODE_BY_TIMEZONE[timeZone] : undefined;
    if (!code) return null;
    digits = code + digits.slice(1);
  }

  const e164 = `+${digits}`;
  return /^\+[1-9][0-9]{6,14}$/.test(e164) ? e164 : null;
}

/** WhatsApp sends ids like "962791234567" (no plus). */
export function phoneFromWhatsAppId(waId: string): string | null {
  return normalizePhone(`+${waId}`);
}

export function maskPhone(phone: string): string {
  return phone.length <= 6 ? phone : `${phone.slice(0, 4)}•••${phone.slice(-3)}`;
}
