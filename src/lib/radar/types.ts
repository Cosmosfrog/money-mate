export const CATEGORIES = [
  "rent",
  "loan-emi",
  "credit-card",
  "mobile",
  "internet",
  "electricity",
  "gas",
  "water",
  "insurance",
  "ott",
  "school",
  "household",
  "gym",
  "other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABEL: Record<Category, string> = {
  rent: "Rent",
  "loan-emi": "Loan EMI",
  "credit-card": "Credit card",
  mobile: "Mobile",
  internet: "Internet",
  electricity: "Electricity",
  gas: "Gas",
  water: "Water",
  insurance: "Insurance",
  ott: "OTT / streaming",
  school: "School / fees",
  household: "Household",
  gym: "Gym",
  other: "Other",
};

export const FREQUENCIES = [
  "weekly",
  "monthly",
  "quarterly",
  "yearly",
  "one-time",
] as const;

export type Frequency = (typeof FREQUENCIES)[number];

export const FREQUENCY_LABEL: Record<Frequency, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
  "one-time": "One time",
};

export type PaymentStatus = "on-time" | "late" | "skipped";

export type AppView = "radar" | "bills" | "calendar" | "plan";

export interface Bill {
  id: string;
  name: string;
  amount: number;
  category: Category;
  frequency: Frequency;
  nextDue: string;
  autoDebit: boolean;
  notes: string;
  archived: boolean;
  createdAt: string;
  account: string;
  remainingEmis: number;
  reminderDays: number;
}

export interface Payment {
  id: string;
  billId: string;
  billName: string;
  amount: number;
  paidOn: string;
  dueOn: string;
  status: PaymentStatus;
  previousDue: string;
  previousRemainingEmis: number;
  previousArchived: boolean;
}

export interface Settings {
  income: number;
  paydayDay: number;
  isSample: boolean;
  startedEmpty: boolean;
  reminderDays: number;
  notifyEnabled: boolean;
  notifiedKeys: string[];
  isPro: boolean;
  goalName: string;
  goalTarget: number;
}

export interface BillDraft {
  name: string;
  amount: string;
  category: Category;
  frequency: Frequency;
  nextDue: string;
  autoDebit: boolean;
  notes: string;
  account: string;
  remainingEmis: string;
  reminderDays: string;
}

export function isCategory(v: string): v is Category {
  return (CATEGORIES as readonly string[]).includes(v);
}

export function isFrequency(v: string): v is Frequency {
  return (FREQUENCIES as readonly string[]).includes(v);
}

export function normalizeBill(raw: Partial<Bill> & { id: string }): Bill {
  const category = raw.category && isCategory(raw.category) ? raw.category : "other";
  const frequency = raw.frequency && isFrequency(raw.frequency) ? raw.frequency : "monthly";
  return {
    id: raw.id,
    name: (raw.name ?? "Bill").trim() || "Bill",
    amount: Number(raw.amount) || 0,
    category,
    frequency,
    nextDue: raw.nextDue || new Date().toISOString().slice(0, 10),
    autoDebit: Boolean(raw.autoDebit),
    notes: raw.notes ?? "",
    archived: Boolean(raw.archived),
    createdAt: raw.createdAt ?? new Date().toISOString(),
    account: raw.account ?? "",
    remainingEmis: Math.max(0, Math.floor(Number(raw.remainingEmis) || 0)),
    reminderDays: Math.max(0, Math.floor(Number(raw.reminderDays) || 0)),
  };
}

export function normalizePayment(raw: Partial<Payment> & { id: string }): Payment {
  const status: PaymentStatus =
    raw.status === "late" || raw.status === "skipped" || raw.status === "on-time"
      ? raw.status
      : "on-time";
  return {
    id: raw.id,
    billId: raw.billId ?? "",
    billName: raw.billName ?? "",
    amount: Number(raw.amount) || 0,
    paidOn: raw.paidOn ?? "",
    dueOn: raw.dueOn ?? "",
    status,
    previousDue: raw.previousDue ?? raw.dueOn ?? "",
    previousRemainingEmis: Math.max(0, Math.floor(Number(raw.previousRemainingEmis) || 0)),
    previousArchived: Boolean(raw.previousArchived),
  };
}

export function normalizeSettings(raw?: Partial<Settings> | null): Settings {
  return {
    income: Number(raw?.income) || 0,
    paydayDay: Math.min(28, Math.max(1, Number(raw?.paydayDay) || 1)),
    isSample: Boolean(raw?.isSample),
    startedEmpty: Boolean(raw?.startedEmpty),
    reminderDays: Math.min(7, Math.max(0, Number(raw?.reminderDays) || 1)),
    notifyEnabled: Boolean(raw?.notifyEnabled),
    notifiedKeys: Array.isArray(raw?.notifiedKeys)
      ? raw.notifiedKeys.filter((k): k is string => typeof k === "string").slice(-80)
      : [],
    isPro: Boolean(raw?.isPro),
    goalName: (raw?.goalName ?? "").trim(),
    goalTarget: Math.max(0, Number(raw?.goalTarget) || 0),
  };
}
