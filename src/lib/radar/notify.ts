import { notifyKey, reminderCandidates } from "./selectors";
import type { Bill, Settings } from "./types";
import { formatINR } from "./format";
import { daysLabel } from "./format";

export async function enableNotifications(): Promise<boolean> {
  if (typeof Notification === "undefined") return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export function fireDueReminders(
  bills: Bill[],
  settings: Settings,
  markKeys: (keys: string[]) => void,
) {
  if (!settings.notifyEnabled) return;
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;

  const due = reminderCandidates(bills, settings.reminderDays);
  const fresh = due.filter((b) => !settings.notifiedKeys.includes(notifyKey(b.id, b.nextDue)));
  if (fresh.length === 0) return;

  const keys = fresh.map((b) => notifyKey(b.id, b.nextDue));
  markKeys(keys);

  const top = fresh.slice(0, 3);
  for (const bill of top) {
    try {
      new Notification(`${bill.name} · ${formatINR(bill.amount)}`, {
        body: daysLabel(bill.days),
        tag: notifyKey(bill.id, bill.nextDue),
      });
    } catch {
      /* preview / unsupported */
    }
  }
}
