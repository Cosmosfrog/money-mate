import { useEffect, useState } from "react";
import { Drawer } from "vaul";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { daysLabel, formatINR } from "@/lib/radar/format";
import { formatPretty as prettyDate } from "@/lib/radar/dates";
import { CATEGORY_LABEL, FREQUENCY_LABEL, type Payment } from "@/lib/radar/types";
import { paymentsForBill, type EnrichedBill } from "@/lib/radar/selectors";
import { urgencyVariant, CategoryIcon } from "./bill-row";

interface BillDetailProps {
  bill: EnrichedBill | null;
  payments: Payment[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaid: (id: string, amount?: number) => void;
  onSkip: (id: string) => void;
  onSnooze: (id: string, days: number) => void;
  onEdit: (id: string) => void;
  onDuplicate: (id: string) => void;
  onArchive: (id: string, archived: boolean) => void;
}

function statusVariant(status: Payment["status"]) {
  if (status === "on-time") return "ok" as const;
  if (status === "late") return "overdue" as const;
  return "default" as const;
}

function statusLabel(status: Payment["status"]) {
  if (status === "on-time") return "On time";
  if (status === "late") return "Late";
  return "Skipped";
}

export function BillDetail({
  bill,
  payments,
  open,
  onOpenChange,
  onPaid,
  onSkip,
  onSnooze,
  onEdit,
  onDuplicate,
  onArchive,
}: BillDetailProps) {
  const [amount, setAmount] = useState("");

  useEffect(() => {
    if (bill) setAmount(String(bill.amount));
  }, [bill]);

  if (!bill) return null;
  const history = paymentsForBill(payments, bill.id).slice(0, 8);
  const remainingLoad = bill.remainingEmis > 0 ? bill.remainingEmis * bill.amount : 0;
  const paidAmount = Number.parseFloat(amount.replace(/[₹,\s]/g, "")) || bill.amount;

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-bg/70" />
        <Drawer.Content className="fixed bottom-0 left-1/2 z-50 flex max-h-[92vh] w-full max-w-lg -translate-x-1/2 flex-col rounded-t-xl bg-surface shadow-[var(--shadow-border)] outline-none">
          <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-border-strong" />
          <div className="overflow-y-auto px-5 pb-8 pt-2">
            <div className="mt-3 flex items-start gap-3">
              <span className="flex size-12 items-center justify-center rounded-lg bg-bg text-muted">
                <CategoryIcon category={bill.category} className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <Drawer.Title className="font-display text-2xl tracking-tight">
                  {bill.name}
                </Drawer.Title>
                <Drawer.Description className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
                  <span>{CATEGORY_LABEL[bill.category]}</span>
                  <span className="text-subtle">·</span>
                  <span>{FREQUENCY_LABEL[bill.frequency]}</span>
                  {bill.autoDebit ? (
                    <>
                      <span className="text-subtle">·</span>
                      <span>Auto-debit</span>
                    </>
                  ) : null}
                  {bill.account ? (
                    <>
                      <span className="text-subtle">·</span>
                      <span>{bill.account}</span>
                    </>
                  ) : null}
                </Drawer.Description>
              </div>
            </div>

            <p className="mt-6 font-display text-4xl tabular-nums tracking-tight">
              {formatINR(bill.amount)}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <Badge variant={urgencyVariant(bill.urgency)}>{daysLabel(bill.days)}</Badge>
              <span className="text-sm text-muted">{prettyDate(bill.nextDue)}</span>
            </div>

            {bill.remainingEmis > 0 ? (
              <p className="mt-3 text-sm text-muted">
                {bill.remainingEmis} EMIs left · {formatINR(remainingLoad)} remaining
              </p>
            ) : null}

            {bill.notes ? (
              <p className="mt-4 rounded-md bg-bg px-3 py-2 text-sm text-muted">{bill.notes}</p>
            ) : null}

            <div className="mt-5 space-y-2">
              <Label htmlFor="pay-amount">Pay amount (₹)</Label>
              <Input
                id="pay-amount"
                inputMode="numeric"
                className="tabular-nums"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button
                className="h-12"
                onClick={() => {
                  onPaid(bill.id, paidAmount);
                  onOpenChange(false);
                }}
              >
                Mark paid
              </Button>
              <Button
                variant="outline"
                className="h-12"
                onClick={() => {
                  onEdit(bill.id);
                  onOpenChange(false);
                }}
              >
                Edit
              </Button>
            </div>

            {bill.frequency !== "one-time" && !bill.archived ? (
              <div className="mt-3">
                <p className="mb-2 text-xs uppercase tracking-widest text-subtle">Snooze</p>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 3, 7].map((d) => (
                    <Button
                      key={d}
                      type="button"
                      variant="outline"
                      onClick={() => {
                        onSnooze(bill.id, d);
                        onOpenChange(false);
                      }}
                    >
                      +{d}d
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-3 flex flex-col gap-1">
              {bill.frequency !== "one-time" && !bill.archived ? (
                <Button
                  variant="ghost"
                  onClick={() => {
                    onSkip(bill.id);
                    onOpenChange(false);
                  }}
                >
                  Skip this cycle
                </Button>
              ) : null}
              <Button
                variant="ghost"
                onClick={() => {
                  onDuplicate(bill.id);
                  onOpenChange(false);
                }}
              >
                Duplicate
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  onArchive(bill.id, !bill.archived);
                  onOpenChange(false);
                }}
              >
                {bill.archived ? "Restore" : "Archive"}
              </Button>
            </div>
            <p className="mt-3 text-center text-xs text-subtle">
              Marking paid rolls the next due date forward.
            </p>

            {history.length > 0 ? (
              <section className="mt-6">
                <h3 className="text-xs font-medium uppercase tracking-widest text-subtle">
                  History
                </h3>
                <ul className="mt-2 divide-y divide-border rounded-lg bg-bg">
                  {history.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
                    >
                      <span className="text-muted">{prettyDate(p.paidOn)}</span>
                      <span className="flex items-center gap-2">
                        <Badge variant={statusVariant(p.status)}>{statusLabel(p.status)}</Badge>
                        <span className="tabular-nums text-fg">
                          {p.status === "skipped" ? "—" : formatINR(p.amount)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

