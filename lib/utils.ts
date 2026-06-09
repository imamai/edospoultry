import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "KES") {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(n: number) {
  return new Intl.NumberFormat("en-KE").format(n);
}

export function formatDate(date: string | Date) {
  return format(new Date(date), "dd MMM yyyy");
}

export function formatDateTime(date: string | Date) {
  return format(new Date(date), "dd MMM yyyy HH:mm");
}

export function timeAgo(date: string | Date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function sanitizePhone(phone: string) {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("0") && cleaned.length === 10) return "254" + cleaned.slice(1);
  if (cleaned.startsWith("254") && cleaned.length === 12) return cleaned;
  if (cleaned.startsWith("7") && cleaned.length === 9) return "254" + cleaned;
  return cleaned;
}

export function formatPhone(phone: string) {
  const s = sanitizePhone(phone);
  if (s.startsWith("254") && s.length === 12) {
    return `+${s.slice(0, 3)} ${s.slice(3, 6)} ${s.slice(6, 9)} ${s.slice(9)}`;
  }
  return phone;
}

export function getBirdCategoryColor(cat: string) {
  const map: Record<string, string> = {
    broiler:       "bg-orange-100 text-orange-800",
    layer:         "bg-yellow-100 text-yellow-800",
    dual_purpose:  "bg-purple-100 text-purple-800",
    indigenous:    "bg-green-100 text-green-800",
    breeder:       "bg-blue-100 text-blue-800",
  };
  return map[cat] ?? "bg-gray-100 text-gray-800";
}

export function getStatusColor(status: string) {
  const map: Record<string, string> = {
    active:      "bg-green-100 text-green-800",
    confirmed:   "bg-blue-100 text-blue-800",
    dispatched:  "bg-indigo-100 text-indigo-800",
    in_transit:  "bg-purple-100 text-purple-800",
    delivered:   "bg-green-100 text-green-800",
    pending:     "bg-yellow-100 text-yellow-800",
    cancelled:   "bg-red-100 text-red-800",
    failed:      "bg-red-100 text-red-800",
    completed:   "bg-green-100 text-green-800",
    depleted:    "bg-gray-100 text-gray-600",
    submitted:   "bg-blue-100 text-blue-800",
    approved:    "bg-green-100 text-green-800",
    rejected:    "bg-red-100 text-red-800",
  };
  return map[status] ?? "bg-gray-100 text-gray-800";
}

export function calcHDP(eggs: number, hens: number) {
  if (!hens) return 0;
  return Math.round((eggs / hens) * 100 * 10) / 10;
}

export function calcFCR(feedKg: number, weightGainKg: number) {
  if (!weightGainKg) return 0;
  return Math.round((feedKg / weightGainKg) * 100) / 100;
}

export function generateOrderNumber(orgSlug: string) {
  const prefix = orgSlug.toUpperCase().slice(0, 3);
  const date = format(new Date(), "yyMMdd");
  const rand = Math.floor(Math.random() * 99999).toString().padStart(5, "0");
  return `${prefix}-${date}-${rand}`;
}
