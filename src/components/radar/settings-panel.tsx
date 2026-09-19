import { useRef, useState } from "react";
import { Drawer } from "vaul";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { downloadText, makeBackup, parseBackup } from "@/lib/radar/backup";
import { parseAmount } from "@/lib/radar/format";
import { enableNotifications } from "@/lib/radar/notify";
import { useBillStore } from "@/lib/radar/store";
import { todayIso } from "@/lib/radar/dates";
import { UserButton } from "@/lib/auth/gates";
import { ThemePicker } from "@/components/theme";

interface SettingsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpgrade: () => void;
}

export function SettingsPanel({ open, onOpenChange, onUpgrade }: SettingsPanelProps) {
  const settings = useBillStore((s) => s.settings);
  const bills = useBillStore((s) => s.bills);
  const payments = useBillStore((s) => s.payments);
  const fileRef = useRef<HTMLInputElement>(null);
  const [incomeDraft, setIncomeDraft] = useState(
    settings.income ? String(settings.income) : "",
  );
  const [importError, setImportError] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <Drawer.Root
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (next) {
          setIncomeDraft(settings.income ? String(settings.income) : "");
          setImportError("");
          setConfirmReset(false);
        }
      }}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-bg/70" />
        <Drawer.Content className="fixed bottom-0 left-1/2 z-50 flex max-h-[92vh] w-full max-w-lg -translate-x-1/2 flex-col rounded-t-xl bg-surface shadow-[var(--shadow-border)] outline-none">
          <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-border-strong" />
          <div className="overflow-y-auto px-5 pb-8 pt-4">
            <Drawer.Title className="font-display text-2xl tracking-tight">
              Settings
            </Drawer.Title>
            <Drawer.Description className="mt-1 text-sm text-muted">
              Everything is saved to your account. Export a JSON backup if you want a file copy.
            </Drawer.Description>

            <div className="mt-6 space-y-5">
              <section className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-widest text-subtle">
                  Account
                </p>
                <div className="radar-account rounded-lg bg-bg px-3 py-2.5 text-fg">
                  <UserButton />
                </div>
              </section>

              <section className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-widest text-subtle">
                  Appearance
                </p>
                <ThemePicker />
              </section>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="set-income">Monthly income (₹)</Label>
                  <Input
                    id="set-income"
                    inputMode="numeric"
                    className="tabular-nums"
                    placeholder="52000"
                    value={incomeDraft}
                    onChange={(e) => setIncomeDraft(e.target.value)}
                    onBlur={() => useBillStore.getState().setIncome(parseAmount(incomeDraft))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="set-payday">Payday (day of month)</Label>
                  <Input
                    id="set-payday"
                    inputMode="numeric"
                    className="tabular-nums"
                    min={1}
                    max={28}
                    value={settings.paydayDay || 1}
                    onChange={(e) => {
                      const n = Math.min(28, Math.max(1, Number(e.target.value) || 1));
                      useBillStore.getState().setPaydayDay(n);
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="set-remind">Remind me (days before)</Label>
                <Input
                  id="set-remind"
                  inputMode="numeric"
                  className="tabular-nums"
                  min={0}
                  max={7}
                  value={settings.reminderDays}
                  onChange={(e) => {
                    const n = Math.min(7, Math.max(0, Number(e.target.value) || 0));
                    useBillStore.getState().setReminderDays(n);
                  }}
                />
                <p className="text-xs text-muted">0 means only on the due date. 1 is the day before.</p>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-bg px-3 py-3">
                <div>
                  <p className="text-sm font-medium text-fg">Browser alerts</p>
                  <p className="text-xs text-muted">Ping when a bill is inside the remind window</p>
                </div>
                <Switch
                  checked={settings.notifyEnabled}
                  onCheckedChange={async (on) => {
                    if (on) {
                      const ok = await enableNotifications();
                      useBillStore.getState().setNotifyEnabled(ok);
                      return;
                    }
                    useBillStore.getState().setNotifyEnabled(false);
                  }}
                />
              </div>

              <section className="rounded-lg bg-bg px-3 py-3">
                <p className="text-xs font-medium uppercase tracking-widest text-subtle">
                  Money Mate Pro
                </p>
                {settings.isPro ? (
                  <p className="mt-2 text-sm text-muted">
                    Unlimited bills, 90-day cashflow, EMI check, leftover goals.
                  </p>
                ) : (
                  <>
                    <p className="mt-2 text-sm text-muted">
                      ₹49/month or ₹399/year, with a 7-day trial. Free still covers a 12-bill home. Pro turns on after Stripe — no extra tap.
                    </p>
                    <Button
                      className="mt-3 h-11 w-full"
                      onClick={() => {
                        onOpenChange(false);
                        onUpgrade();
                      }}
                    >
                      Upgrade to Pro
                    </Button>
                  </>
                )}
              </section>

              <section className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-widest text-subtle">Backup</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const json = makeBackup(bills, payments, settings);
                      downloadText(`money-mate-${todayIso()}.json`, json);
                    }}
                  >
                    Export JSON
                  </Button>
                  <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
                    Import JSON
                  </Button>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    try {
                      const text = await file.text();
                      const backup = parseBackup(text);
                      useBillStore.getState().restoreBackup(
                        backup.bills,
                        backup.payments,
                        backup.settings,
                      );
                      setImportError("");
                      onOpenChange(false);
                    } catch (err) {
                      setImportError(err instanceof Error ? err.message : "Could not import.");
                    }
                  }}
                />
                {importError ? <p className="text-sm text-danger">{importError}</p> : null}
              </section>

              <section className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-widest text-subtle">Data</p>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    useBillStore.getState().loadSample();
                    onOpenChange(false);
                  }}
                >
                  Load sample household
                </Button>
                <Button
                  type="button"
                  variant={confirmReset ? "danger" : "ghost"}
                  className="w-full"
                  onClick={() => {
                    if (!confirmReset) {
                      setConfirmReset(true);
                      return;
                    }
                    useBillStore.getState().startFresh();
                    onOpenChange(false);
                  }}
                >
                  {confirmReset ? "Tap again to erase all bills" : "Start fresh"}
                </Button>
              </section>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
