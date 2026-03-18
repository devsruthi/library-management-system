import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, isPast, parseISO } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "MMM d, yyyy");
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "MMM d, yyyy h:mm a");
}

export function timeAgo(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

export function isOverdue(dueDate: string | Date | null | undefined): boolean {
  if (!dueDate) return false;
  const d = typeof dueDate === "string" ? parseISO(dueDate) : dueDate;
  return isPast(d);
}

export function getDueDateLabel(
  dueDate: string | Date | null | undefined,
  returnedAt: string | Date | null | undefined
): string {
  if (returnedAt) return "Returned";
  if (!dueDate) return "—";
  const d = typeof dueDate === "string" ? parseISO(dueDate) : dueDate;
  if (isPast(d)) return "Overdue";
  return `Due ${format(d, "MMM d")}`;
}

export function calculateDueDate(borrowedAt: Date = new Date(), days = 14): Date {
  const due = new Date(borrowedAt);
  due.setDate(due.getDate() + days);
  return due;
}

export function normalizeSearch(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "");
}

export const MEMBERSHIP_CONFIG = {
  standard: {
    label: "Standard (Student)",
    loanDays: 14,
    finePerDay: 20,
    description: "For students · 14-day loans · ₹20/day fine",
  },
  public: {
    label: "Public",
    loanDays: 20,
    finePerDay: 50,
    description: "For public members · 20-day loans · ₹50/day fine",
  },
} as const;

export function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
