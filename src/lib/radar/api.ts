import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import {
  normalizeBill,
  normalizePayment,
  normalizeSettings,
  type Bill,
  type Payment,
  type Settings,
} from "./types";

const BillSchema = z.object({
  id: z.string().min(1).max(80),
  name: z.string().max(120),
  amount: z.number(),
  category: z.string(),
  frequency: z.string(),
  nextDue: z.string(),
  autoDebit: z.boolean(),
  notes: z.string().max(400),
  archived: z.boolean(),
  createdAt: z.string(),
  account: z.string().max(80),
  remainingEmis: z.number(),
  reminderDays: z.number(),
});

const PaymentSchema = z.object({
  id: z.string().min(1).max(80),
  billId: z.string(),
  billName: z.string(),
  amount: z.number(),
  paidOn: z.string(),
  dueOn: z.string(),
  status: z.enum(["on-time", "late", "skipped"]),
  previousDue: z.string(),
  previousRemainingEmis: z.number(),
  previousArchived: z.boolean(),
});

const SettingsSchema = z.object({
  income: z.number(),
  paydayDay: z.number(),
  isSample: z.boolean(),
  startedEmpty: z.boolean(),
  reminderDays: z.number(),
  notifyEnabled: z.boolean(),
  notifiedKeys: z.array(z.string()).max(80),
  isPro: z.boolean(),
  goalName: z.string().max(80),
  goalTarget: z.number(),
});

const SnapshotSchema = z.object({
  bills: z.array(BillSchema).max(200),
  payments: z.array(PaymentSchema).max(2000),
  settings: SettingsSchema,
});

export type RadarSnapshot = {
  bills: Bill[];
  payments: Payment[];
  settings: Settings;
};

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function bool(v: unknown): boolean {
  return v === true || v === "t" || v === "true";
}

function mapBill(row: Record<string, unknown>): Bill {
  return normalizeBill({
    id: String(row.id),
    name: String(row.name ?? ""),
    amount: num(row.amount),
    category: String(row.category ?? "other") as Bill["category"],
    frequency: String(row.frequency ?? "monthly") as Bill["frequency"],
    nextDue: String(row.next_due ?? ""),
    autoDebit: bool(row.auto_debit),
    notes: String(row.notes ?? ""),
    archived: bool(row.archived),
    createdAt: String(row.created_at ?? new Date().toISOString()),
    account: String(row.account ?? ""),
    remainingEmis: num(row.remaining_emis),
    reminderDays: num(row.reminder_days),
  });
}

function mapPayment(row: Record<string, unknown>): Payment {
  return normalizePayment({
    id: String(row.id),
    billId: String(row.bill_id ?? ""),
    billName: String(row.bill_name ?? ""),
    amount: num(row.amount),
    paidOn: String(row.paid_on ?? ""),
    dueOn: String(row.due_on ?? ""),
    status: String(row.status ?? "on-time") as Payment["status"],
    previousDue: String(row.previous_due ?? row.due_on ?? ""),
    previousRemainingEmis: num(row.previous_remaining_emis),
    previousArchived: bool(row.previous_archived),
  });
}

function mapSettings(row?: Record<string, unknown>): Settings {
  if (!row) return normalizeSettings({ startedEmpty: false, isSample: false });
  let keys: string[] = [];
  try {
    const parsed = JSON.parse(String(row.notified_keys ?? "[]"));
    if (Array.isArray(parsed)) keys = parsed.filter((k) => typeof k === "string");
  } catch {
    keys = [];
  }
  return normalizeSettings({
    income: num(row.income),
    paydayDay: num(row.payday_day) || 1,
    reminderDays: num(row.reminder_days) || 1,
    notifyEnabled: bool(row.notify_enabled),
    notifiedKeys: keys,
    startedEmpty: bool(row.started_empty),
    isSample: bool(row.is_sample),
    isPro: bool(row.is_pro),
    goalName: String(row.goal_name ?? ""),
    goalTarget: num(row.goal_target),
  });
}

export const loadRadar = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<RadarSnapshot> => {
    const sql = await getSql();
    const bills = await sql<Record<string, unknown>>`
      select * from radar_bills where user_id = ${context.userId} order by created_at asc
    `;
    const payments = await sql<Record<string, unknown>>`
      select * from radar_payments where user_id = ${context.userId}
    `;
    const settingsRows = await sql<Record<string, unknown>>`
      select * from radar_settings where user_id = ${context.userId}
    `;
    return {
      bills: bills.map(mapBill),
      payments: payments.map(mapPayment),
      settings: mapSettings(settingsRows[0]),
    };
  });

export const saveRadar = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((raw: unknown) => SnapshotSchema.parse(raw))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const userId = context.userId;
    const bills = data.bills.map((b) => normalizeBill(b as Bill));
    const payments = data.payments.map((p) => normalizePayment(p as Payment));
    const settings = normalizeSettings(data.settings);

    // Server is_pro is source of truth (Stripe webhook). Never trust client unlock.
    const existingPro = await sql<Record<string, unknown>>`
      select is_pro from radar_settings where user_id = ${userId}
    `;
    const isPro = bool(existingPro[0]?.is_pro);

    await sql`delete from radar_bills where user_id = ${userId}`;
    await sql`delete from radar_payments where user_id = ${userId}`;
    await sql`delete from radar_settings where user_id = ${userId}`;

    for (const bill of bills) {
      await sql`
        insert into radar_bills (
          id, user_id, name, amount, category, frequency, next_due, auto_debit,
          notes, archived, created_at, account, remaining_emis, reminder_days
        ) values (
          ${bill.id}, ${userId}, ${bill.name}, ${bill.amount}, ${bill.category},
          ${bill.frequency}, ${bill.nextDue}, ${bill.autoDebit}, ${bill.notes},
          ${bill.archived}, ${bill.createdAt}, ${bill.account}, ${bill.remainingEmis},
          ${bill.reminderDays}
        )
      `;
    }

    for (const payment of payments) {
      await sql`
        insert into radar_payments (
          id, user_id, bill_id, bill_name, amount, paid_on, due_on, status,
          previous_due, previous_remaining_emis, previous_archived
        ) values (
          ${payment.id}, ${userId}, ${payment.billId}, ${payment.billName},
          ${payment.amount}, ${payment.paidOn}, ${payment.dueOn}, ${payment.status},
          ${payment.previousDue || null}, ${payment.previousRemainingEmis},
          ${payment.previousArchived}
        )
      `;
    }

    await sql`
      insert into radar_settings (
        user_id, income, payday_day, reminder_days, notify_enabled,
        notified_keys, started_empty, is_sample, is_pro, goal_name, goal_target
      ) values (
        ${userId}, ${settings.income}, ${settings.paydayDay}, ${settings.reminderDays},
        ${settings.notifyEnabled}, ${JSON.stringify(settings.notifiedKeys)},
        ${settings.startedEmpty}, ${settings.isSample}, ${isPro},
        ${settings.goalName}, ${settings.goalTarget}
      )
    `;

    return { ok: true as const };
  });
