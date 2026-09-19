import {
  daysUntil,
  endOfMonthIso,
  inMonth,
  isoOffset,
  monthOffset,
  nextPayday,
  occurrencesThrough,
  todayIso,
} from "./dates";
import type { Bill, Category, Payment } from "./types";

export interface EnrichedBill extends Bill {
  days: number;
  urgency: "overdue" | "today" | "soon" | "week" | "later";
}

export interface Hit {
  bill: Bill;
  date: string;
  days: number;
  isCurrent: boolean;
}

export function activeBills(bills: Bill[]): Bill[] {
  return bills.filter((b) => !b.archived);
}

export function enrich(bill: Bill, from = new Date()): EnrichedBill {
  const days = daysUntil(bill.nextDue, from);
  let urgency: EnrichedBill["urgency"] = "later";
  if (days < 0) urgency = "overdue";
  else if (days === 0) urgency = "today";
  else if (days <= 2) urgency = "soon";
  else if (days <= 7) urgency = "week";
  return { ...bill, days, urgency };
}

export function enrichOnDate(bill: Bill, date: string, from = new Date()): EnrichedBill {
  return enrich({ ...bill, nextDue: date }, from);
}

export function sortedUpcoming(bills: Bill[], from = new Date()): EnrichedBill[] {
  return activeBills(bills)
    .map((b) => enrich(b, from))
    .sort((a, b) => a.days - b.days || b.amount - a.amount);
}

export function hitsThrough(bills: Bill[], untilIso: string, from = new Date()): Hit[] {
  const today = todayIso(from);
  const hits: Hit[] = [];
  for (const bill of activeBills(bills)) {
    const dates = occurrencesThrough(bill.nextDue, bill.frequency, untilIso, bill.remainingEmis);
    for (const date of dates) {
      hits.push({
        bill,
        date,
        days: daysUntil(date, from),
        isCurrent: date === bill.nextDue || (date <= today && bill.nextDue === date),
      });
    }
  }
  return hits.sort((a, b) => a.date.localeCompare(b.date) || b.bill.amount - a.bill.amount);
}

export function hitsInMonth(bills: Bill[], month = new Date(), from = new Date()): Hit[] {
  const until = endOfMonthIso(month);
  return hitsThrough(bills, until, from).filter(
    (h) => inMonth(h.date, month) || h.days < 0,
  );
}

export function dueThisMonth(bills: Bill[], month = new Date()): EnrichedBill[] {
  return sortedUpcoming(bills).filter((b) => inMonth(b.nextDue, month) || b.days < 0);
}

export function paidThisMonth(payments: Payment[], month = new Date()): Payment[] {
  return payments.filter(
    (p) => p.status !== "skipped" && inMonth(p.paidOn, month),
  );
}

export function monthObligation(bills: Bill[], payments: Payment[], month = new Date()): {
  scheduled: number;
  paid: number;
  open: number;
  openCount: number;
} {
  const hits = hitsInMonth(bills, month).filter((h) => h.days >= 0 || inMonth(h.date, month) || h.isCurrent);
  const uniqueOpen = hits.filter((h) => h.days >= 0 || h.isCurrent);
  const paid = paidThisMonth(payments, month);
  const open = uniqueOpen.reduce((s, h) => s + h.bill.amount, 0);
  const paidTotal = paid.reduce((s, p) => s + p.amount, 0);
  return {
    scheduled: open + paidTotal,
    paid: paidTotal,
    open,
    openCount: uniqueOpen.length,
  };
}

export function monthVsLast(
  bills: Bill[],
  payments: Payment[],
  from = new Date(),
): {
  thisScheduled: number;
  lastPaid: number;
  delta: number;
} {
  const last = monthOffset(from, -1);
  const thisScheduled = monthObligation(bills, payments, from).scheduled;
  const lastPaid = paidThisMonth(payments, last).reduce((s, p) => s + p.amount, 0);
  return { thisScheduled, lastPaid, delta: thisScheduled - lastPaid };
}

export function nextLeaving(bills: Bill[], from = new Date()): EnrichedBill | null {
  return sortedUpcoming(bills, from)[0] ?? null;
}

export function nextSevenTotal(bills: Bill[], from = new Date()): number {
  const until = isoOffset(7, from);
  return hitsThrough(bills, until, from)
    .filter((h) => h.days <= 7)
    .reduce((s, h) => s + h.bill.amount, 0);
}

export function imminentBills(bills: Bill[], from = new Date()): EnrichedBill[] {
  return sortedUpcoming(bills, from).filter((b) => b.days <= 1);
}

export function reminderCandidates(
  bills: Bill[],
  defaultDays: number,
  from = new Date(),
): EnrichedBill[] {
  return sortedUpcoming(bills, from).filter((b) => {
    const window = b.reminderDays > 0 ? b.reminderDays : defaultDays;
    return b.days <= window;
  });
}

export function onTimeStreak(payments: Payment[]): number {
  const ordered = [...payments]
    .filter((p) => p.status !== "skipped")
    .sort((a, b) => b.paidOn.localeCompare(a.paidOn) || b.id.localeCompare(a.id));
  let streak = 0;
  for (const p of ordered) {
    if (p.status !== "on-time") break;
    streak += 1;
  }
  return streak;
}

export function categoryTotals(bills: Bill[], payments: Payment[], month = new Date()): {
  category: Category;
  total: number;
}[] {
  const map = new Map<Category, number>();
  for (const h of hitsInMonth(bills, month).filter((x) => x.days >= 0 || x.isCurrent)) {
    map.set(h.bill.category, (map.get(h.bill.category) ?? 0) + h.bill.amount);
  }
  for (const p of paidThisMonth(payments, month)) {
    const bill = bills.find((b) => b.id === p.billId);
    const cat = bill?.category ?? "other";
    map.set(cat, (map.get(cat) ?? 0) + p.amount);
  }
  return [...map.entries()]
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
}

export function leftover(income: number, bills: Bill[], payments: Payment[], month = new Date()): number {
  return income - monthObligation(bills, payments, month).scheduled;
}

export function untilPayday(bills: Bill[], paydayDay: number, from = new Date()): {
  payday: string;
  total: number;
  items: Hit[];
} {
  const payday = nextPayday(paydayDay, from);
  const items = hitsThrough(bills, payday, from).filter((h) => h.date < payday || h.days < 0);
  return {
    payday,
    total: items.reduce((s, h) => s + h.bill.amount, 0),
    items,
  };
}

export function paymentsForBill(payments: Payment[], billId: string): Payment[] {
  return [...payments]
    .filter((p) => p.billId === billId)
    .sort((a, b) => b.paidOn.localeCompare(a.paidOn) || b.id.localeCompare(a.id));
}

export function recentPayments(payments: Payment[], limit = 8): Payment[] {
  return [...payments]
    .filter((p) => p.status !== "skipped")
    .sort((a, b) => b.paidOn.localeCompare(a.paidOn) || b.id.localeCompare(a.id))
    .slice(0, limit);
}

export function lastPayment(payments: Payment[]): Payment | null {
  const ordered = [...payments].sort(
    (a, b) => b.paidOn.localeCompare(a.paidOn) || b.id.localeCompare(a.id),
  );
  return ordered[0] ?? null;
}

export function emiLoad(bills: Bill[]): { monthly: number; remaining: number; count: number } {
  const emis = activeBills(bills).filter((b) => b.category === "loan-emi");
  const monthly = emis.reduce((s, b) => s + b.amount, 0);
  const remaining = emis.reduce(
    (s, b) => s + (b.remainingEmis > 0 ? b.remainingEmis * b.amount : 0),
    0,
  );
  return { monthly, remaining, count: emis.length };
}

export function weekStrip(bills: Bill[], from = new Date()): { iso: string; total: number; count: number }[] {
  const until = isoOffset(6, from);
  const hits = hitsThrough(bills, until, from);
  return Array.from({ length: 7 }, (_, i) => {
    const iso = isoOffset(i, from);
    const dayHits =
      i === 0
        ? hits.filter((h) => h.date === iso || h.days < 0)
        : hits.filter((h) => h.date === iso);
    return {
      iso,
      total: dayHits.reduce((s, h) => s + h.bill.amount, 0),
      count: dayHits.length,
    };
  });
}

export function cashflow90(bills: Bill[], from = new Date()): Hit[] {
  return hitsThrough(bills, isoOffset(90, from), from).slice(0, 24);
}

export function notifyKey(billId: string, due: string): string {
  return `${billId}:${due}`;
}

export function subscriptionWaste(bills: Bill[]): {
  monthly: number;
  yearly: number;
  items: Bill[];
} {
  const items = activeBills(bills).filter((b) => b.category === "ott" || b.category === "gym");
  const monthly = items.reduce((s, b) => {
    if (b.frequency === "yearly") return s + b.amount / 12;
    if (b.frequency === "quarterly") return s + b.amount / 3;
    if (b.frequency === "weekly") return s + b.amount * 4.3;
    if (b.frequency === "one-time") return s;
    return s + b.amount;
  }, 0);
  return { monthly, yearly: monthly * 12, items };
}

export function emiBurden(income: number, bills: Bill[]): number {
  if (income <= 0) return 0;
  return emiLoad(bills).monthly / income;
}

export function spendSafe(leftoverAmt: number): number {
  return Math.max(0, leftoverAmt * 0.4);
}

export function emiFor(principal: number, annualPct: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0;
  const r = annualPct / 12 / 100;
  if (r <= 0) return principal / months;
  const pow = (1 + r) ** months;
  return (principal * r * pow) / (pow - 1);
}

