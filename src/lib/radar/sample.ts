import { isoOffset, todayIso } from "./dates";
import { normalizeBill, normalizePayment, type Bill, type Payment } from "./types";

function nid(): string {
  return crypto.randomUUID();
}

export function sampleHousehold(from = new Date()): { bills: Bill[]; payments: Payment[] } {
  const createdAt = new Date(from).toISOString();
  const rows: Array<Partial<Bill> & { name: string; amount: number; category: Bill["category"] }> = [
    {
      name: "HDFC credit card",
      amount: 6240,
      category: "credit-card",
      frequency: "monthly",
      nextDue: isoOffset(-2, from),
      autoDebit: false,
      account: "HDFC · 4412",
      reminderDays: 2,
    },
    {
      name: "Car EMI · HDFC",
      amount: 11450,
      category: "loan-emi",
      frequency: "monthly",
      nextDue: isoOffset(0, from),
      autoDebit: true,
      account: "HDFC",
      remainingEmis: 28,
    },
    {
      name: "WBSEDCL electricity",
      amount: 1840,
      category: "electricity",
      frequency: "monthly",
      nextDue: isoOffset(2, from),
      autoDebit: false,
      account: "UPI",
    },
    {
      name: "Jio Fiber",
      amount: 999,
      category: "internet",
      frequency: "monthly",
      nextDue: isoOffset(4, from),
      autoDebit: true,
      account: "Jio",
    },
    {
      name: "Airtel prepaid",
      amount: 299,
      category: "mobile",
      frequency: "monthly",
      nextDue: isoOffset(6, from),
      autoDebit: false,
      account: "UPI",
    },
    {
      name: "Netflix",
      amount: 649,
      category: "ott",
      frequency: "monthly",
      nextDue: isoOffset(9, from),
      autoDebit: true,
    },
    {
      name: "Cult.fit",
      amount: 1499,
      category: "gym",
      frequency: "monthly",
      nextDue: isoOffset(11, from),
      autoDebit: true,
    },
    {
      name: "Star Health",
      amount: 2180,
      category: "insurance",
      frequency: "monthly",
      nextDue: isoOffset(14, from),
      autoDebit: true,
      account: "HDFC",
    },
    {
      name: "House rent",
      amount: 8500,
      category: "rent",
      frequency: "monthly",
      nextDue: isoOffset(19, from),
      autoDebit: false,
      notes: "Landlord · UPI on the 1st week",
    },
    {
      name: "Maid · Sunita",
      amount: 3000,
      category: "household",
      frequency: "monthly",
      nextDue: isoOffset(19, from),
      autoDebit: false,
    },
    {
      name: "School van",
      amount: 1800,
      category: "school",
      frequency: "monthly",
      nextDue: isoOffset(22, from),
      autoDebit: false,
    },
  ];

  const bills = rows.map((row) =>
    normalizeBill({
      ...row,
      id: nid(),
      notes: row.notes ?? "",
      archived: false,
      createdAt,
    }),
  );

  const rent = bills.find((b) => b.category === "rent");
  const emi = bills.find((b) => b.category === "loan-emi");
  const payments: Payment[] = [];
  if (rent && emi) {
    for (let i = 1; i <= 6; i += 1) {
      payments.push(
        normalizePayment({
          id: nid(),
          billId: rent.id,
          billName: rent.name,
          amount: rent.amount,
          dueOn: isoOffset(-30 * i, from),
          paidOn: isoOffset(-30 * i - 1, from),
          status: "on-time",
          previousDue: isoOffset(-30 * i, from),
        }),
      );
      payments.push(
        normalizePayment({
          id: nid(),
          billId: emi.id,
          billName: emi.name,
          amount: emi.amount,
          dueOn: isoOffset(-30 * i, from),
          paidOn: isoOffset(-30 * i, from),
          status: "on-time",
          previousDue: isoOffset(-30 * i, from),
          previousRemainingEmis: emi.remainingEmis + i,
        }),
      );
    }
  }

  return {
    bills,
    payments: payments.sort((a, b) => a.paidOn.localeCompare(b.paidOn)),
  };
}

export function sampleBills(from = new Date()): Bill[] {
  return sampleHousehold(from).bills;
}

export function samplePayments(from = new Date()): Payment[] {
  return sampleHousehold(from).payments;
}

export function sampleTodayLabel(from = new Date()): string {
  return todayIso(from);
}
