import { useEffect, useState } from "react";
import { CalendarDays, Plus, Radar, Receipt, Settings, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { UserButton } from "@/lib/auth/gates";
import { advanceDue, formatDay } from "@/lib/radar/dates";
import { formatINR } from "@/lib/radar/format";
import { fireDueReminders } from "@/lib/radar/notify";
import {
  CHECKOUT_FLAG_KEY,
  FREE_BILL_CAP,
  captureCheckoutReturn,
  tryUnlockPro,
} from "@/lib/radar/pro";
import { enrich } from "@/lib/radar/selectors";
import { useBillStore } from "@/lib/radar/store";
import type { AppView, Bill } from "@/lib/radar/types";
import { cn } from "@/lib/utils";
import { BillDetail } from "./bill-detail";
import { BillForm } from "./bill-form";
import { SettingsPanel } from "./settings-panel";
import { RadarSplash } from "./sign-in";
import { BrandMark } from "./logo";
import { ThemeToggle } from "@/components/theme";
import { UpgradeSheet } from "./upgrade-sheet";
import { BillsView, CalendarView, PlanView, RadarView } from "./views";

const NAV: { id: AppView; label: string; icon: typeof Radar }[] = [
  { id: "radar", label: "Home", icon: Radar },
  { id: "bills", label: "Bills", icon: Receipt },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "plan", label: "Money", icon: Wallet },
];

export function RadarApp() {
  const hydrated = useBillStore((s) => s.hydrated);
  const bills = useBillStore((s) => s.bills);
  const payments = useBillStore((s) => s.payments);
  const settings = useBillStore((s) => s.settings);
  const [view, setView] = useState<AppView>("radar");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [editing, setEditing] = useState<Bill | null>(null);

  useEffect(() => {
    let cancelled = false;
    void useBillStore
      .getState()
      .hydrate()
      .then(() => {
        if (cancelled) return;
        const store = useBillStore.getState();
        fireDueReminders(store.bills, store.settings, store.rememberNotified);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const unlock = () => {
      captureCheckoutReturn();
      if (useBillStore.getState().settings.isPro) return;
      if (!tryUnlockPro()) return;
      useBillStore.getState().setPro(true);
      toast("Pro is on. Unlimited bills and money tools.");
    };
    unlock();
    const later = window.setTimeout(unlock, 8500);
    const onStorage = (event: StorageEvent) => {
      if (event.key === CHECKOUT_FLAG_KEY && event.newValue === "1") unlock();
    };
    window.addEventListener("focus", unlock);
    document.addEventListener("visibilitychange", unlock);
    window.addEventListener("storage", onStorage);
    return () => {
      window.clearTimeout(later);
      window.removeEventListener("focus", unlock);
      document.removeEventListener("visibilitychange", unlock);
      window.removeEventListener("storage", onStorage);
    };
  }, [hydrated]);

  const selected = selectedId
    ? bills.find((b) => b.id === selectedId) ?? null
    : null;
  const selectedEnriched = selected ? enrich(selected) : null;

  const askUpgrade = (reason?: string) => {
    setFormOpen(false);
    setDetailOpen(false);
    setSettingsOpen(false);
    setUpgradeOpen(true);
    if (reason) toast(reason);
  };

  const openBill = (id: string) => {
    setSelectedId(id);
    setFormOpen(false);
    setSettingsOpen(false);
    setUpgradeOpen(false);
    setDetailOpen(true);
  };

  const openAdd = () => {
    const state = useBillStore.getState();
    if (!state.settings.isPro) {
      const live = state.bills.filter((b) => !b.archived).length;
      if (live >= FREE_BILL_CAP) {
        askUpgrade("Free covers 12 bills. Upgrade for unlimited.");
        return;
      }
    }
    setEditing(null);
    setDetailOpen(false);
    setSettingsOpen(false);
    setUpgradeOpen(false);
    setFormOpen(true);
  };

  const openEdit = (id: string) => {
    const bill = bills.find((b) => b.id === id) ?? null;
    setEditing(bill);
    setDetailOpen(false);
    setSettingsOpen(false);
    setUpgradeOpen(false);
    setFormOpen(true);
  };

  const markPaid = (id: string, amount?: number) => {
    const bill = useBillStore.getState().bills.find((b) => b.id === id);
    useBillStore.getState().markPaid(id, amount);
    if (bill) {
      const nextRemaining =
        bill.remainingEmis > 0 ? Math.max(0, bill.remainingEmis - 1) : 0;
      const done =
        bill.frequency === "one-time" || (bill.remainingEmis > 0 && nextRemaining === 0);
      const next = done
        ? "Cleared"
        : `Next due ${formatDay(advanceDue(bill.nextDue, bill.frequency))}`;
      toast(`${bill.name} paid · ${formatINR(amount ?? bill.amount)}`, {
        description: next,
      });
    }
  };

  if (!hydrated) {
    return <RadarSplash label="Loading your bills…" />;
  }

  const viewProps = {
    bills,
    payments,
    settings,
    selectedId,
    onSelect: openBill,
    onAdd: openAdd,
    onPaid: markPaid,
  };

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <div className="mx-auto flex min-h-dvh max-w-6xl">
        <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r border-border px-4 py-6 md:flex">
          <Brand isPro={settings.isPro} />
          <nav className="mt-10 flex flex-col gap-1">
            {NAV.map((item) => (
              <NavButton
                key={item.id}
                {...item}
                active={view === item.id}
                onClick={() => setView(item.id)}
              />
            ))}
          </nav>
          <div className="mt-auto space-y-3">
            <div className="radar-account rounded-lg bg-surface px-3 py-2.5 text-fg shadow-[var(--shadow-border)]">
              <UserButton />
            </div>
            <ThemeToggle />
            {!settings.isPro ? (
              <Button
                variant="outline"
                className="h-11 w-full"
                onClick={() => askUpgrade()}
              >
                Pro
              </Button>
            ) : null}
            <Button
              variant="outline"
              className="h-11 w-full"
              onClick={() => {
                setFormOpen(false);
                setDetailOpen(false);
                setUpgradeOpen(false);
                setSettingsOpen(true);
              }}
            >
              <Settings className="size-4" />
              Settings
            </Button>
            <Button className="h-11 w-full" onClick={openAdd}>
              <Plus className="size-4" />
              Add bill
            </Button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between gap-2 px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))] md:hidden">
            <Brand compact isPro={settings.isPro} />
            <div className="flex shrink-0 items-center gap-1">
              <ThemeToggle compact />
              <Button
                size="icon"
                variant="outline"
                aria-label="Settings"
                onClick={() => {
                  setFormOpen(false);
                  setDetailOpen(false);
                  setUpgradeOpen(false);
                  setSettingsOpen(true);
                }}
              >
                <Settings className="size-4" />
              </Button>
              <Button size="icon" variant="outline" aria-label="Add bill" onClick={openAdd}>
                <Plus className="size-4" />
              </Button>
            </div>
          </header>

          {settings.isSample ? (
            <div className="mx-4 mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface px-3 py-2 text-sm text-muted shadow-[var(--shadow-border)]">
              <p>Sample household. Replace with yours anytime.</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  useBillStore.getState().startFresh();
                  setSelectedId(null);
                  toast("Cleared. Add your first bill.");
                }}
              >
                Start fresh
              </Button>
            </div>
          ) : null}

          <main className="flex-1 px-4 py-6 pb-28 md:px-10 md:pb-10">
            {view === "radar" ? <RadarView {...viewProps} /> : null}
            {view === "bills" ? <BillsView {...viewProps} /> : null}
            {view === "calendar" ? <CalendarView {...viewProps} /> : null}
            {view === "plan" ? (
              <PlanView
                {...viewProps}
                onIncome={(n) => useBillStore.getState().setIncome(n)}
                onPayday={(d) => useBillStore.getState().setPaydayDay(d)}
                onUndo={() => {
                  const ok = useBillStore.getState().undoLastPayment();
                  toast(ok ? "Last payment undone" : "Nothing to undo");
                }}
                onUpgrade={() => askUpgrade()}
                onGoal={(name, target) => useBillStore.getState().setGoal(name, target)}
              />
            ) : null}
          </main>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg/95 pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-4">
          {NAV.map((item) => (
            <NavButton
              key={item.id}
              {...item}
              compact
              active={view === item.id}
              onClick={() => setView(item.id)}
            />
          ))}
        </div>
      </nav>

      <BillDetail
        bill={selectedEnriched}
        payments={payments}
        open={detailOpen && !!selectedEnriched}
        onOpenChange={setDetailOpen}
        onPaid={markPaid}
        onSkip={(id) => {
          const bill = bills.find((b) => b.id === id);
          useBillStore.getState().skipCycle(id);
          toast(bill ? `Skipped ${bill.name}` : "Skipped");
        }}
        onSnooze={(id, days) => {
          const bill = bills.find((b) => b.id === id);
          useBillStore.getState().snooze(id, days);
          toast(bill ? `Snoozed ${bill.name} by ${days}d` : "Snoozed");
        }}
        onEdit={openEdit}
        onDuplicate={(id) => {
          const result = useBillStore.getState().duplicateBill(id);
          if (result === "cap") {
            askUpgrade("Free covers 12 bills. Upgrade for unlimited.");
            return;
          }
          toast("Copy added");
        }}
        onArchive={(id, archived) => {
          useBillStore.getState().archiveBill(id, archived);
          toast(archived ? "Archived" : "Restored");
        }}
      />

      <BillForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        onSave={(draft, id) => {
          const result = useBillStore.getState().upsertBill(draft, id);
          if (result === "cap") {
            askUpgrade("Free covers 12 bills. Upgrade for unlimited.");
            return;
          }
          setFormOpen(false);
          toast(id ? "Bill updated" : `${draft.name} is on Money Mate`);
        }}
        onDelete={(id) => {
          useBillStore.getState().removeBill(id);
          setSelectedId(null);
          toast("Bill removed");
        }}
      />

      <SettingsPanel
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onUpgrade={() => askUpgrade()}
      />

      <UpgradeSheet open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </div>
  );
}

function Brand({ compact = false, isPro = false }: { compact?: boolean; isPro?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <BrandMark size={compact ? "sm" : "md"} />
      <div className={cn(compact && "leading-tight")}>
        <p className={cn("font-display tracking-tight", compact ? "text-base" : "text-lg")}>
          Money Mate
          {isPro ? (
            <span className="ml-2 align-middle text-xs uppercase tracking-widest text-accent">
              Pro
            </span>
          ) : null}
        </p>
        {compact ? null : (
          <p className="text-xs uppercase tracking-widest text-subtle">
            {isPro ? "Whole household" : "Bill & EMI"}
          </p>
        )}
      </div>
    </div>
  );
}

function NavButton({
  label,
  icon: Icon,
  active,
  onClick,
  compact,
}: {
  id: AppView;
  label: string;
  icon: typeof Radar;
  active: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors duration-150",
        compact
          ? "h-14 min-h-14 flex-col justify-center gap-1 px-0 text-xs uppercase tracking-wider"
          : "h-11",
        active ? "bg-surface-2 text-fg" : "text-muted hover:bg-surface-2/60 hover:text-fg",
      )}
    >
      <Icon className={cn("size-4", active && "text-accent")} />
      {label}
    </button>
  );
}