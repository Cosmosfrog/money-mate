import { create } from "zustand";
import { loadRadar, saveRadar } from "./api";
import { addDaysIso, advanceDue, daysUntil, todayIso } from "./dates";
import { FREE_BILL_CAP } from "./pro";
import { sampleHousehold } from "./sample";
import {
  normalizeBill,
  normalizePayment,
  normalizeSettings,
  type Bill,
  type BillDraft,
  type Payment,
  type Settings,
} from "./types";

const defaultSettings: Settings = normalizeSettings({
  income: 0,
  paydayDay: 1,
  reminderDays: 1,
});

function newId(): string {
  return crypto.randomUUID();
}

function parseDraftAmount(raw: string): number {
  return Number.parseFloat(raw.replace(/[₹,\s]/g, "")) || 0;
}

function draftToBill(draft: BillDraft, existing?: Bill): Bill {
  return normalizeBill({
    id: existing?.id ?? newId(),
    name: draft.name.trim(),
    amount: parseDraftAmount(draft.amount),
    category: draft.category,
    frequency: draft.frequency,
    nextDue: draft.nextDue,
    autoDebit: draft.autoDebit,
    notes: draft.notes.trim(),
    archived: existing?.archived ?? false,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    account: draft.account.trim(),
    remainingEmis: Math.max(0, Math.floor(Number(draft.remainingEmis) || 0)),
    reminderDays: Math.max(0, Math.floor(Number(draft.reminderDays) || 0)),
  });
}

function readLegacyLocal(): { bills: Bill[]; payments: Payment[]; settings: Settings } | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem("radar-bills-v1");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const inner =
      parsed.state && typeof parsed.state === "object"
        ? (parsed.state as Record<string, unknown>)
        : parsed;
    if (!Array.isArray(inner.bills)) return null;
    const bills = inner.bills
      .filter((b): b is Record<string, unknown> => Boolean(b) && typeof b === "object")
      .map((b) =>
        normalizeBill({
          ...(b as Partial<Bill>),
          id: String(b.id ?? newId()),
        }),
      );
    const payments = Array.isArray(inner.payments)
      ? inner.payments
          .filter((p): p is Record<string, unknown> => Boolean(p) && typeof p === "object")
          .map((p) =>
            normalizePayment({
              ...(p as Partial<Payment>),
              id: String(p.id ?? newId()),
            }),
          )
      : [];
    return {
      bills,
      payments,
      settings: normalizeSettings(inner.settings as Partial<Settings> | undefined),
    };
  } catch {
    return null;
  }
}

interface BillState {
  hydrated: boolean;
  bills: Bill[];
  payments: Payment[];
  settings: Settings;
  hydrate: () => Promise<void>;
  loadSample: () => void;
  startFresh: () => void;
  upsertBill: (draft: BillDraft, id?: string) => "ok" | "cap";
  removeBill: (id: string) => void;
  archiveBill: (id: string, archived?: boolean) => void;
  duplicateBill: (id: string) => "ok" | "cap";
  markPaid: (id: string, amount?: number) => void;
  skipCycle: (id: string) => void;
  snooze: (id: string, days: number) => void;
  undoLastPayment: () => boolean;
  setIncome: (income: number) => void;
  setPaydayDay: (day: number) => void;
  setReminderDays: (days: number) => void;
  setNotifyEnabled: (on: boolean) => void;
  rememberNotified: (keys: string[]) => void;
  setPro: (on: boolean) => void;
  setGoal: (name: string, target: number) => void;
  restoreBackup: (bills: Bill[], payments: Payment[], settings: Settings) => void;
}

let saveChain: Promise<void> = Promise.resolve();

function queueSave() {
  saveChain = saveChain
    .then(async () => {
      const state = useBillStore.getState();
      if (!state.hydrated) return;
      await saveRadar({
        data: {
          bills: state.bills,
          payments: state.payments,
          settings: state.settings,
        },
      });
    })
    .catch((err) => {
      console.error("[radar] save failed", err);
    });
}

function sampleState(isPro = false) {
  const household = sampleHousehold();
  return {
    bills: household.bills,
    payments: household.payments,
    settings: normalizeSettings({
      income: 52000,
      paydayDay: 1,
      isSample: true,
      startedEmpty: false,
      reminderDays: 1,
      notifyEnabled: false,
      isPro,
    }),
  };
}

export const useBillStore = create<BillState>()((set, get) => ({
  hydrated: false,
  bills: [],
  payments: [],
  settings: defaultSettings,
  hydrate: async () => {
    try {
      const remote = await loadRadar();
      if (remote.bills.length === 0 && !remote.settings.startedEmpty) {
        const local = readLegacyLocal();
        if (local && local.bills.length > 0) {
          set({
            bills: local.bills,
            payments: local.payments,
            settings: { ...local.settings, isSample: false, startedEmpty: false },
            hydrated: true,
          });
          try {
            localStorage.removeItem("radar-bills-v1");
          } catch {
            /* ignore */
          }
        } else {
          set({ ...sampleState(), hydrated: true });
        }
        queueSave();
        return;
      }
      set({
        bills: remote.bills,
        payments: remote.payments,
        settings: remote.settings,
        hydrated: true,
      });
    } catch (err) {
      console.error("[radar] load failed", err);
      set({ hydrated: true, bills: [], payments: [], settings: defaultSettings });
    }
  },
  loadSample: () => {
    set({ ...sampleState(get().settings.isPro) });
    queueSave();
  },
  startFresh: () => {
    set({
      bills: [],
      payments: [],
      settings: {
        ...defaultSettings,
        startedEmpty: true,
        isSample: false,
        isPro: get().settings.isPro,
      },
    });
    queueSave();
  },
  upsertBill: (draft, id) => {
    const current = get().bills;
    const existing = id ? current.find((b) => b.id === id) : undefined;
    if (!existing && !get().settings.isPro) {
      const live = current.filter((b) => !b.archived).length;
      if (live >= FREE_BILL_CAP) return "cap";
    }
    const bill = draftToBill(draft, existing);
    const bills = existing
      ? current.map((b) => (b.id === existing.id ? bill : b))
      : [...current, bill];
    set({
      bills,
      settings: { ...get().settings, isSample: false },
    });
    queueSave();
    return "ok";
  },
  removeBill: (id) => {
    set({
      bills: get().bills.filter((b) => b.id !== id),
      settings: { ...get().settings, isSample: false },
    });
    queueSave();
  },
  archiveBill: (id, archived = true) => {
    set({
      bills: get().bills.map((b) => (b.id === id ? { ...b, archived } : b)),
      settings: { ...get().settings, isSample: false },
    });
    queueSave();
  },
  duplicateBill: (id) => {
    if (!get().settings.isPro) {
      const live = get().bills.filter((b) => !b.archived).length;
      if (live >= FREE_BILL_CAP) return "cap";
    }
    const bill = get().bills.find((b) => b.id === id);
    if (!bill) return "ok";
    const copy = normalizeBill({
      ...bill,
      id: newId(),
      name: `${bill.name} copy`,
      nextDue: todayIso(),
      archived: false,
      createdAt: new Date().toISOString(),
    });
    set({
      bills: [...get().bills, copy],
      settings: { ...get().settings, isSample: false },
    });
    queueSave();
    return "ok";
  },
  markPaid: (id, amount) => {
    const bill = get().bills.find((b) => b.id === id);
    if (!bill || bill.archived) return;
    const dueOn = bill.nextDue;
    const paidOn = todayIso();
    const late = daysUntil(dueOn) < 0;
    const paidAmount = amount ?? bill.amount;
    const nextRemaining =
      bill.remainingEmis > 0 ? Math.max(0, bill.remainingEmis - 1) : 0;
    const done =
      bill.frequency === "one-time" || (bill.remainingEmis > 0 && nextRemaining === 0);
    const payment: Payment = {
      id: newId(),
      billId: bill.id,
      billName: bill.name,
      amount: paidAmount,
      paidOn,
      dueOn,
      status: late ? "late" : "on-time",
      previousDue: bill.nextDue,
      previousRemainingEmis: bill.remainingEmis,
      previousArchived: bill.archived,
    };
    const nextDue = done ? bill.nextDue : advanceDue(bill.nextDue, bill.frequency);
    set({
      payments: [...get().payments, payment],
      bills: get().bills.map((b) =>
        b.id === id
          ? {
              ...b,
              nextDue,
              archived: done,
              remainingEmis: bill.remainingEmis > 0 ? nextRemaining : 0,
            }
          : b,
      ),
      settings: { ...get().settings, isSample: false },
    });
    queueSave();
  },
  skipCycle: (id) => {
    const bill = get().bills.find((b) => b.id === id);
    if (!bill || bill.frequency === "one-time") return;
    const payment: Payment = {
      id: newId(),
      billId: bill.id,
      billName: bill.name,
      amount: 0,
      paidOn: todayIso(),
      dueOn: bill.nextDue,
      status: "skipped",
      previousDue: bill.nextDue,
      previousRemainingEmis: bill.remainingEmis,
      previousArchived: bill.archived,
    };
    set({
      payments: [...get().payments, payment],
      bills: get().bills.map((b) =>
        b.id === id
          ? { ...b, nextDue: advanceDue(b.nextDue, b.frequency) }
          : b,
      ),
      settings: { ...get().settings, isSample: false },
    });
    queueSave();
  },
  snooze: (id, days) => {
    const bill = get().bills.find((b) => b.id === id);
    if (!bill || days <= 0) return;
    set({
      bills: get().bills.map((b) =>
        b.id === id ? { ...b, nextDue: addDaysIso(b.nextDue, days) } : b,
      ),
      settings: { ...get().settings, isSample: false },
    });
    queueSave();
  },
  undoLastPayment: () => {
    const payments = [...get().payments].sort(
      (a, b) => b.paidOn.localeCompare(a.paidOn) || b.id.localeCompare(a.id),
    );
    const last = payments[0];
    if (!last) return false;
    set({
      payments: get().payments.filter((p) => p.id !== last.id),
      bills: get().bills.map((b) =>
        b.id === last.billId
          ? {
              ...b,
              nextDue: last.previousDue || last.dueOn,
              remainingEmis: last.previousRemainingEmis,
              archived: last.previousArchived,
            }
          : b,
      ),
      settings: { ...get().settings, isSample: false },
    });
    queueSave();
    return true;
  },
  setIncome: (income) => {
    set({ settings: { ...get().settings, income } });
    queueSave();
  },
  setPaydayDay: (paydayDay) => {
    set({ settings: { ...get().settings, paydayDay } });
    queueSave();
  },
  setReminderDays: (reminderDays) => {
    set({ settings: { ...get().settings, reminderDays } });
    queueSave();
  },
  setNotifyEnabled: (notifyEnabled) => {
    set({ settings: { ...get().settings, notifyEnabled } });
    queueSave();
  },
  rememberNotified: (keys) => {
    const current = get().settings.notifiedKeys;
    const merged = [...new Set([...current, ...keys])].slice(-80);
    set({ settings: { ...get().settings, notifiedKeys: merged } });
    queueSave();
  },
  setPro: (isPro) => {
    set({ settings: { ...get().settings, isPro } });
    queueSave();
  },
  setGoal: (goalName, goalTarget) => {
    set({
      settings: {
        ...get().settings,
        goalName: goalName.trim(),
        goalTarget: Math.max(0, goalTarget),
      },
    });
    queueSave();
  },
  restoreBackup: (bills, payments, settings) => {
    set({
      bills: bills.map((b) => normalizeBill(b)),
      payments: payments.map((p) => normalizePayment(p)),
      settings: normalizeSettings({ ...settings, isSample: false }),
    });
    queueSave();
  },
}));
