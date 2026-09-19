import {
  normalizeBill,
  normalizePayment,
  normalizeSettings,
  type Bill,
  type Payment,
  type Settings,
} from "./types";

export interface RadarBackup {
  v: number;
  app: "radar";
  exportedAt: string;
  bills: Bill[];
  payments: Payment[];
  settings: Settings;
}

export function makeBackup(bills: Bill[], payments: Payment[], settings: Settings): string {
  const payload: RadarBackup = {
    v: 2,
    app: "radar",
    exportedAt: new Date().toISOString(),
    bills,
    payments,
    settings,
  };
  return JSON.stringify(payload, null, 2);
}

export function parseBackup(text: string): RadarBackup {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("That file is not valid JSON.");
  }
  if (!data || typeof data !== "object") {
    throw new Error("That file is not a Money Mate backup.");
  }
  const raw = data as Partial<RadarBackup> & { bills?: unknown; payments?: unknown };
  if (!Array.isArray(raw.bills) || !Array.isArray(raw.payments)) {
    throw new Error("That file is not a Money Mate backup.");
  }
  const bills = (raw.bills as unknown[])
    .filter((b): b is Record<string, unknown> => Boolean(b) && typeof b === "object")
    .map((b) =>
      normalizeBill({
        ...(b as Partial<Bill>),
        id: String(b.id ?? crypto.randomUUID()),
      }),
    );
  const payments = (raw.payments as unknown[])
    .filter((p): p is Record<string, unknown> => Boolean(p) && typeof p === "object")
    .map((p) =>
      normalizePayment({
        ...(p as Partial<Payment>),
        id: String(p.id ?? crypto.randomUUID()),
      }),
    );
  return {
    v: 2,
    app: "radar",
    exportedAt: typeof raw.exportedAt === "string" ? raw.exportedAt : "",
    bills,
    payments,
    settings: normalizeSettings(raw.settings),
  };
}

export function downloadText(filename: string, text: string, type = "application/json") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
