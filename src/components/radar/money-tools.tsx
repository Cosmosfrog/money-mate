import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatINR, parseAmount } from "@/lib/radar/format";
import { FREE_BILL_CAP } from "@/lib/radar/pro";
import {
  cashflow90,
  emiBurden,
  emiFor,
  leftover,
  spendSafe,
  subscriptionWaste,
} from "@/lib/radar/selectors";
import { formatDay } from "@/lib/radar/dates";
import type { Bill, Payment, Settings } from "@/lib/radar/types";
import { cn } from "@/lib/utils";

interface MoneyToolsProps {
  bills: Bill[];
  payments: Payment[];
  settings: Settings;
  onSelect: (id: string) => void;
  onUpgrade: () => void;
  onGoal: (name: string, target: number) => void;
}

export function MoneyTools({
  bills,
  payments,
  settings,
  onSelect,
  onUpgrade,
  onGoal,
}: MoneyToolsProps) {
  const isPro = settings.isPro;
  const left = leftover(settings.income, bills, payments);
  const burden = emiBurden(settings.income, bills);
  const waste = subscriptionWaste(bills);
  const safe = spendSafe(left);
  const liveCount = bills.filter((b) => !b.archived).length;
  const flow = cashflow90(bills);

  return (
    <div className="space-y-6">
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-border">
        <PulseStat
          label="Safe to spend"
          value={settings.income > 0 ? formatINR(safe) : "Set income"}
          hint="40% of leftover"
        />
        <PulseStat
          label="EMI of income"
          value={settings.income > 0 ? `${Math.round(burden * 100)}%` : "—"}
          hint={burden > 0.4 ? "Heavy" : "Under 40% is comfortable"}
          warn={burden > 0.4}
        />
      </dl>

      <section className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium text-fg">Bills on this plan</h2>
          {!isPro ? (
            <p className="text-xs tabular-nums text-muted">
              {liveCount}/{FREE_BILL_CAP} free
            </p>
          ) : (
            <p className="text-xs uppercase tracking-widest text-accent">Pro</p>
          )}
        </div>
        {!isPro ? (
          <Button variant="outline" className="mt-4 h-11 w-full" onClick={onUpgrade}>
            Upgrade to Pro
          </Button>
        ) : (
          <p className="mt-2 text-sm text-muted">Unlimited bills, 90-day cashflow, EMI check.</p>
        )}
      </section>

      {isPro ? (
        <AffordCard leftoverAmt={left} income={settings.income} />
      ) : (
        <Teaser
          kicker="Pro"
          title="Can I afford this EMI"
          copy="Type a phone or car price. See the monthly hit against this month’s leftover."
          onUpgrade={onUpgrade}
        />
      )}

      {isPro ? (
        <WasteCard waste={waste} onSelect={onSelect} />
      ) : (
        <Teaser
          kicker="Pro"
          title="Subscription waste"
          copy="OTT and gym, rolled up for the year — so you know what to cut first."
          onUpgrade={onUpgrade}
        />
      )}

      {isPro ? (
        <GoalCard
          leftoverAmt={left}
          name={settings.goalName}
          target={settings.goalTarget}
          onGoal={onGoal}
        />
      ) : (
        <Teaser
          kicker="Pro"
          title="Park the leftover"
          copy="Name a goal. Money Mate tells you how many paydays until you hit it."
          onUpgrade={onUpgrade}
        />
      )}

      {isPro ? (
        flow.length > 0 ? (
          <section className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
            <h2 className="text-sm font-medium text-fg">Next 90 days</h2>
            <ul className="mt-3 divide-y divide-border">
              {flow.map((hit) => (
                <li key={`${hit.bill.id}-${hit.date}`}>
                  <button
                    type="button"
                    onClick={() => onSelect(hit.bill.id)}
                    className="flex w-full min-h-11 items-center justify-between gap-3 py-2 text-left text-sm"
                  >
                    <span className="min-w-0 truncate text-fg">{hit.bill.name}</span>
                    <span className="shrink-0 text-muted">{formatDay(hit.date)}</span>
                    <span className="shrink-0 tabular-nums text-fg">{formatINR(hit.bill.amount)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null
      ) : (
        <Teaser
          kicker="Pro"
          title="Next 90 days"
          copy="Every hit lined up for the next quarter — rent, EMIs, insurance, the lot."
          onUpgrade={onUpgrade}
        />
      )}
    </div>
  );
}

function PulseStat({
  label,
  value,
  hint,
  warn,
}: {
  label: string;
  value: string;
  hint?: string;
  warn?: boolean;
}) {
  return (
    <div className="bg-surface px-4 py-4">
      <dt className="text-xs uppercase tracking-widest text-subtle">{label}</dt>
      <dd
        className={cn(
          "mt-2 font-display text-xl tabular-nums tracking-tight",
          warn ? "text-danger" : "text-fg",
        )}
      >
        {value}
      </dd>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

function Teaser({
  kicker,
  title,
  copy,
  onUpgrade,
}: {
  kicker: string;
  title: string;
  copy: string;
  onUpgrade: () => void;
}) {
  return (
    <section className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
      <p className="text-xs uppercase tracking-widest text-subtle">{kicker}</p>
      <h2 className="mt-1 font-display text-2xl tracking-tight">{title}</h2>
      <p className="mt-2 text-sm text-muted">{copy}</p>
      <Button className="mt-4 h-11" onClick={onUpgrade}>
        Unlock with Pro
      </Button>
    </section>
  );
}

function AffordCard({ leftoverAmt, income }: { leftoverAmt: number; income: number }) {
  const [price, setPrice] = useState("");
  const [months, setMonths] = useState("12");
  const [rate, setRate] = useState("14");
  const principal = parseAmount(price);
  const n = Math.max(1, Number(months) || 12);
  const pct = Math.max(0, Number(rate) || 0);
  const emi = emiFor(principal, pct, n);
  const after = leftoverAmt - emi;
  const heavy = income > 0 && emi / income > 0.4;

  return (
    <section className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
      <h2 className="text-sm font-medium text-fg">Can I afford this EMI</h2>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-2">
          <Label htmlFor="aff-price">Price (₹)</Label>
          <Input
            id="aff-price"
            inputMode="numeric"
            className="tabular-nums"
            value={price}
            placeholder="79990"
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="aff-months">Months</Label>
          <Input
            id="aff-months"
            inputMode="numeric"
            className="tabular-nums"
            value={months}
            onChange={(e) => setMonths(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="aff-rate">APR %</Label>
          <Input
            id="aff-rate"
            inputMode="numeric"
            className="tabular-nums"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
          />
        </div>
      </div>
      {principal > 0 ? (
        <div className="mt-4">
          <p className="font-display text-3xl tabular-nums">{formatINR(emi)} / mo</p>
          <p className={cn("mt-2 text-sm", after < 0 || heavy ? "text-danger" : "text-muted")}>
            {after < 0
              ? `This EMI overruns leftover by ${formatINR(Math.abs(after))}.`
              : `Leftover after this EMI: ${formatINR(after)}.`}
            {heavy ? " Over 40% of income." : ""}
          </p>
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted">Try a phone at ₹79,990 over 12 months.</p>
      )}
    </section>
  );
}

function WasteCard({
  waste,
  onSelect,
}: {
  waste: ReturnType<typeof subscriptionWaste>;
  onSelect: (id: string) => void;
}) {
  return (
    <section className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
      <h2 className="text-sm font-medium text-fg">Subscription waste</h2>
      <p className="mt-2 font-display text-3xl tabular-nums">{formatINR(waste.yearly)} / yr</p>
      <p className="mt-1 text-sm text-muted">{formatINR(waste.monthly)} a month on OTT and gym.</p>
      {waste.items.length === 0 ? (
        <p className="mt-3 text-sm text-muted">No OTT or gym yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {waste.items.map((b) => (
            <li key={b.id}>
              <button
                type="button"
                onClick={() => onSelect(b.id)}
                className="flex w-full min-h-11 items-center justify-between gap-3 py-2 text-left text-sm"
              >
                <span className="truncate">{b.name}</span>
                <span className="tabular-nums">{formatINR(b.amount)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function GoalCard({
  leftoverAmt,
  name,
  target,
  onGoal,
}: {
  leftoverAmt: number;
  name: string;
  target: number;
  onGoal: (name: string, target: number) => void;
}) {
  const [draftName, setDraftName] = useState(name);
  const [draftTarget, setDraftTarget] = useState(target ? String(target) : "");
  const goal = parseAmount(draftTarget);
  const months = leftoverAmt > 0 && goal > 0 ? Math.ceil(goal / leftoverAmt) : 0;

  return (
    <section className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
      <h2 className="text-sm font-medium text-fg">Leftover goal</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="goal-name">Name</Label>
          <Input
            id="goal-name"
            placeholder="Emergency fund"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={() => onGoal(draftName, goal)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="goal-target">Target (₹)</Label>
          <Input
            id="goal-target"
            inputMode="numeric"
            className="tabular-nums"
            placeholder="100000"
            value={draftTarget}
            onChange={(e) => setDraftTarget(e.target.value)}
            onBlur={() => onGoal(draftName, parseAmount(draftTarget))}
          />
        </div>
      </div>
      {goal > 0 && leftoverAmt > 0 ? (
        <p className="mt-3 text-sm text-muted">
          At this leftover, {draftName || "the goal"} is about {months} payday
          {months === 1 ? "" : "s"} away.
        </p>
      ) : (
        <p className="mt-3 text-sm text-muted">Set income and a target to see the runway.</p>
      )}
    </section>
  );
}
