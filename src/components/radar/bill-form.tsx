import { useEffect, useState, type ReactNode } from "react";
import { Drawer } from "vaul";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { todayIso } from "@/lib/radar/dates";
import {
  CATEGORIES,
  CATEGORY_LABEL,
  FREQUENCIES,
  FREQUENCY_LABEL,
  type Bill,
  type BillDraft,
  type Category,
  type Frequency,
} from "@/lib/radar/types";
import { cn } from "@/lib/utils";

const TEMPLATES: { label: string; name: string; amount: string; category: Category }[] = [
  { label: "Rent", name: "House rent", amount: "", category: "rent" },
  { label: "EMI", name: "Loan EMI", amount: "", category: "loan-emi" },
  { label: "Card", name: "Credit card", amount: "", category: "credit-card" },
  { label: "Jio", name: "Jio Fiber", amount: "999", category: "internet" },
  { label: "Airtel", name: "Airtel prepaid", amount: "299", category: "mobile" },
  { label: "Power", name: "Electricity", amount: "", category: "electricity" },
  { label: "OTT", name: "Netflix", amount: "649", category: "ott" },
];

function emptyDraft(): BillDraft {
  return {
    name: "",
    amount: "",
    category: "other",
    frequency: "monthly",
    nextDue: todayIso(),
    autoDebit: false,
    notes: "",
    account: "",
    remainingEmis: "",
    reminderDays: "",
  };
}

function fromBill(bill: Bill): BillDraft {
  return {
    name: bill.name,
    amount: String(bill.amount),
    category: bill.category,
    frequency: bill.frequency,
    nextDue: bill.nextDue,
    autoDebit: bill.autoDebit,
    notes: bill.notes,
    account: bill.account,
    remainingEmis: bill.remainingEmis ? String(bill.remainingEmis) : "",
    reminderDays: bill.reminderDays ? String(bill.reminderDays) : "",
  };
}

function Chip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-10 rounded-full px-3 text-sm transition-[background-color,color] duration-150",
        active ? "bg-accent text-accent-fg" : "bg-surface-2 text-muted hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}

interface BillFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Bill | null;
  onSave: (draft: BillDraft, id?: string) => void;
  onDelete?: (id: string) => void;
}

export function BillForm({ open, onOpenChange, editing, onSave, onDelete }: BillFormProps) {
  const [draft, setDraft] = useState<BillDraft>(emptyDraft);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (open) {
      setDraft(editing ? fromBill(editing) : emptyDraft());
      setConfirmDelete(false);
    }
  }, [open, editing]);

  const valid = draft.name.trim().length > 0 && Number(draft.amount.replace(/[₹,\s]/g, "")) > 0;
  const showEmi = draft.category === "loan-emi";

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-bg/70" />
        <Drawer.Content className="fixed bottom-0 left-1/2 z-50 flex max-h-[92vh] w-full max-w-lg -translate-x-1/2 flex-col rounded-t-xl bg-surface shadow-[var(--shadow-border)] outline-none">
          <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-border-strong" />
          <div className="overflow-y-auto px-5 pb-8 pt-4">
            <Drawer.Title className="font-display text-2xl tracking-tight">
              {editing ? "Edit bill" : "Add a bill"}
            </Drawer.Title>
            <Drawer.Description className="mt-1 text-sm text-muted">
              Name, amount, and the next day money leaves.
            </Drawer.Description>

            {editing ? null : (
              <div className="mt-4 flex flex-wrap gap-2">
                {TEMPLATES.map((t) => (
                  <Chip
                    key={t.label}
                    active={draft.name === t.name}
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        name: t.name,
                        amount: t.amount || d.amount,
                        category: t.category,
                        frequency: "monthly",
                      }))
                    }
                  >
                    {t.label}
                  </Chip>
                ))}
              </div>
            )}

            <form
              className="mt-6 space-y-5"
              onSubmit={(e) => {
                e.preventDefault();
                if (!valid) return;
                onSave(draft, editing?.id);
                onOpenChange(false);
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="bill-name">Name</Label>
                <Input
                  id="bill-name"
                  placeholder="Jio Fiber, rent, car EMI"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  autoComplete="off"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="bill-amount">Amount (₹)</Label>
                  <Input
                    id="bill-amount"
                    inputMode="numeric"
                    placeholder="999"
                    value={draft.amount}
                    onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
                    className="tabular-nums"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bill-due">Next due</Label>
                  <Input
                    id="bill-due"
                    type="date"
                    value={draft.nextDue}
                    onChange={(e) => setDraft({ ...draft, nextDue: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bill-account">Account / UPI</Label>
                <Input
                  id="bill-account"
                  placeholder="HDFC, GPay, landlord UPI"
                  value={draft.account}
                  onChange={(e) => setDraft({ ...draft, account: e.target.value })}
                  autoComplete="off"
                />
              </div>

              <div className="space-y-2">
                <Label>How often</Label>
                <div className="flex flex-wrap gap-2">
                  {FREQUENCIES.map((f) => (
                    <Chip
                      key={f}
                      active={draft.frequency === f}
                      onClick={() => setDraft({ ...draft, frequency: f as Frequency })}
                    >
                      {FREQUENCY_LABEL[f]}
                    </Chip>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((c) => (
                    <Chip
                      key={c}
                      active={draft.category === c}
                      onClick={() => setDraft({ ...draft, category: c as Category })}
                    >
                      {CATEGORY_LABEL[c]}
                    </Chip>
                  ))}
                </div>
              </div>

              {showEmi ? (
                <div className="space-y-2">
                  <Label htmlFor="bill-emis">EMIs left</Label>
                  <Input
                    id="bill-emis"
                    inputMode="numeric"
                    placeholder="28"
                    className="tabular-nums"
                    value={draft.remainingEmis}
                    onChange={(e) => setDraft({ ...draft, remainingEmis: e.target.value })}
                  />
                  <p className="text-xs text-muted">Leave blank if you just want the monthly hit.</p>
                </div>
              ) : null}

              <div className="flex items-center justify-between rounded-lg bg-bg px-3 py-3">
                <div>
                  <p className="text-sm font-medium text-fg">Auto-debit</p>
                  <p className="text-xs text-muted">Bank pulls this on the due date</p>
                </div>
                <Switch
                  checked={draft.autoDebit}
                  onCheckedChange={(autoDebit) => setDraft({ ...draft, autoDebit })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bill-notes">Note</Label>
                <Input
                  id="bill-notes"
                  placeholder="Optional — last 4 of card, landlord name"
                  value={draft.notes}
                  onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                />
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <Button type="submit" disabled={!valid} className="h-12">
                  {editing ? "Save changes" : "Add bill"}
                </Button>
                {editing && onDelete ? (
                  <Button
                    type="button"
                    variant={confirmDelete ? "danger" : "ghost"}
                    onClick={() => {
                      if (!confirmDelete) {
                        setConfirmDelete(true);
                        return;
                      }
                      onDelete(editing.id);
                      onOpenChange(false);
                    }}
                  >
                    {confirmDelete ? "Tap again to remove" : "Remove bill"}
                  </Button>
                ) : null}
              </div>
            </form>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
