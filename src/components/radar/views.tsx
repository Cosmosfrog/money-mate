import { useMemo, useState } from "react";
import {
  addMonths,
  format,
  startOfMonth,
  subMonths,
} from "date-fns";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatDay, formatPretty, monthGrid, todayIso } from "@/lib/radar/dates";
import { formatINR, parseAmount } from "@/lib/radar/format";
import {
  categoryTotals,
  emiLoad,
  enrich,
  enrichOnDate,
  hitsInMonth,
  imminentBills,
  leftover,
  monthObligation,
  monthVsLast,
  nextLeaving,
  nextSevenTotal,
  onTimeStreak,
  recentPayments,
  sortedUpcoming,
  untilPayday,
  weekStrip,
  type EnrichedBill,
} from "@/lib/radar/selectors";
import { CATEGORY_LABEL } from "@/lib/radar/types";
import type { Bill, Payment, Settings } from "@/lib/radar/types";
import { cn } from "@/lib/utils";
import { BillRow, CategoryIcon, urgencyVariant } from "./bill-row";
import { MoneyTools } from "./money-tools";
import { RadarLegend, RadarScope } from "./radar-scope";

interface ViewProps {
  bills: Bill[];
  payments: Payment[];
  settings: Settings;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onPaid: (id: string) => void;
}

export function RadarView({
  bills,
  payments,
  settings,
  selectedId,
  onSelect,
  onAdd,
  onPaid,
}: ViewProps) {
  const upcoming = sortedUpcoming(bills);
  const next = nextLeaving(bills);
  const month = monthObligation(bills, payments);
  const weekTotal = nextSevenTotal(bills);
  const streak = onTimeStreak(payments);
  const left = leftover(settings.income, bills, payments);
  const imminent = imminentBills(bills);
  const imminentTotal = imminent.reduce((s, b) => s + b.amount, 0);
  const strip = weekStrip(bills);
  const today = todayIso();

  return (
    <div className="space-y-8">
      <header className="rise-in">
        <p className="text-xs font-medium uppercase tracking-widest text-subtle">
          {next ? (next.days < 0 ? "Overdue" : next.days === 0 ? "Leaves today" : `Leaves in ${next.days} days`) : "All clear"}
        </p>
        <h1 className="mt-2 font-display text-4xl leading-tight tracking-tight text-fg md:text-5xl">
          {next ? next.name : "Nothing due"}
        </h1>
        <p className="mt-2 font-display text-3xl tabular-nums tracking-tight text-accent">
          {next ? formatINR(next.amount) : formatINR(0)}
        </p>
        {next && next.days <= 0 ? (
          <Button className="mt-4 h-11" onClick={() => onPaid(next.id)}>
            Mark {next.name} paid
          </Button>
        ) : null}
      </header>

      {imminent.length > 0 ? (
        <p className="rise-in rise-in-1 rounded-lg bg-surface px-4 py-3 text-sm text-muted shadow-[var(--shadow-border)]">
          <span className={imminent.some((b) => b.days < 0) ? "text-danger" : "text-warn"}>
            {imminent.length === 1
              ? imminent[0].days < 0
                ? "1 bill is overdue"
                : imminent[0].days === 0
                  ? "1 bill leaves today"
                  : "1 bill leaves tomorrow"
              : `${imminent.length} bills leave in the next 48 hours`}
          </span>
          <span className="mx-2 text-subtle">·</span>
          <span className="tabular-nums text-fg">{formatINR(imminentTotal)}</span>
        </p>
      ) : null}

      <div className="rise-in rise-in-1 grid grid-cols-7 gap-1">
        {strip.map((d) => (
          <div
            key={d.iso}
            className={cn(
              "rounded-md bg-surface px-1 py-2 text-center shadow-[var(--shadow-border)]",
              d.iso === today && "bg-surface-2",
            )}
          >
            <p className="text-xs uppercase tracking-wider text-subtle">
              {formatDay(d.iso, "EEE").slice(0, 2)}
            </p>
            <p className={cn("mt-1 text-xs tabular-nums", d.total > 0 ? "text-fg" : "text-subtle")}>
              {d.total > 0 ? formatINR(d.total).replace("₹", "") : "—"}
            </p>
          </div>
        ))}
      </div>

      <dl className="rise-in rise-in-1 grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-border sm:grid-cols-4">
        <Stat label="Next 7 days" value={formatINR(weekTotal)} />
        <Stat label="Open this month" value={formatINR(month.open)} hint={`${month.openCount} hits`} />
        <Stat
          label="On-time streak"
          value={streak === 0 ? "—" : String(streak)}
          hint={streak === 1 ? "payment" : "payments"}
        />
        <Stat
          label="Payday leftover"
          value={settings.income > 0 ? formatINR(left) : "Set income"}
          hint={left < 0 && settings.income > 0 ? "Short this month" : undefined}
          warn={left < 0 && settings.income > 0}
        />
      </dl>

      <div className="rise-in rise-in-2 grid items-start gap-8 md:grid-cols-2">
        <div>
          <RadarScope bills={upcoming} selectedId={selectedId} onSelect={onSelect} />
          <div className="mt-3">
            <RadarLegend bills={upcoming} />
          </div>
        </div>

        <section>
          <div className="mb-3 flex items-end justify-between">
            <h2 className="text-sm font-medium uppercase tracking-widest text-subtle">
              Incoming hits
            </h2>
            <Button variant="ghost" size="sm" onClick={onAdd} className="h-9">
              <Plus className="size-4" />
              Add
            </Button>
          </div>
          {upcoming.length === 0 ? (
            <EmptyBills onAdd={onAdd} />
          ) : (
            <ul className="divide-y divide-border rounded-xl bg-surface px-1 py-1 shadow-[var(--shadow-border)]">
              {upcoming.slice(0, 8).map((bill) => (
                <li key={bill.id}>
                  <BillRow
                    bill={bill}
                    selected={selectedId === bill.id}
                    onSelect={onSelect}
                    onPaid={onPaid}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({
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

function EmptyBills({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-xl bg-surface px-5 py-10 text-center shadow-[var(--shadow-border)]">
      <p className="font-display text-2xl tracking-tight">Add the first bill</p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
        Rent, Jio, EMI, credit card — anything that leaves on a date. Money Mate lines them up so nothing surprises you.
      </p>
      <Button className="mt-5" onClick={onAdd}>
        <Plus className="size-4" />
        Add a bill
      </Button>
    </div>
  );
}

export function BillsView({ bills, selectedId, onSelect, onAdd, onPaid }: ViewProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "overdue" | "auto" | "emi" | "archived">("all");
  const base =
    filter === "archived"
      ? bills.filter((b) => b.archived).map((b) => enrich(b))
      : sortedUpcoming(bills);
  const upcoming = base.filter((b) => {
    if (filter === "overdue" && b.days >= 0) return false;
    if (filter === "auto" && !b.autoDebit) return false;
    if (filter === "emi" && b.category !== "loan-emi") return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      b.name.toLowerCase().includes(q) ||
      b.account.toLowerCase().includes(q) ||
      CATEGORY_LABEL[b.category].toLowerCase().includes(q)
    );
  });

  const groups: { key: string; label: string; items: EnrichedBill[] }[] = [
    { key: "overdue", label: "Overdue", items: upcoming.filter((b) => b.days < 0) },
    { key: "week", label: "This week", items: upcoming.filter((b) => b.days >= 0 && b.days <= 7) },
    { key: "later", label: "Later", items: upcoming.filter((b) => b.days > 7) },
  ];

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-subtle">Ledger</p>
          <h1 className="mt-1 font-display text-4xl tracking-tight">Bills</h1>
        </div>
        <Button onClick={onAdd} className="h-11">
          <Plus className="size-4" />
          Add
        </Button>
      </header>

      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search name, account, category"
        aria-label="Search bills"
      />

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["all", "All"],
            ["overdue", "Overdue"],
            ["auto", "Auto-debit"],
            ["emi", "EMI"],
            ["archived", "Archived"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={cn(
              "h-10 rounded-full px-3 text-sm",
              filter === id ? "bg-accent text-accent-fg" : "bg-surface-2 text-muted",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {upcoming.length === 0 ? (
        filter === "archived" ? (
          <p className="text-sm text-muted">No archived bills.</p>
        ) : (
          <EmptyBills onAdd={onAdd} />
        )
      ) : (
        groups
          .filter((g) => g.items.length > 0)
          .map((g) => (
            <section key={g.key}>
              <h2 className="mb-2 text-xs font-medium uppercase tracking-widest text-subtle">
                {g.label}
              </h2>
              <ul className="divide-y divide-border rounded-xl bg-surface px-1 py-1 shadow-[var(--shadow-border)]">
                {g.items.map((bill) => (
                  <li key={bill.id}>
                    <BillRow
                      bill={bill}
                      selected={selectedId === bill.id}
                      onSelect={onSelect}
                      onPaid={filter === "archived" ? undefined : onPaid}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))
      )}
    </div>
  );
}

export function CalendarView({ bills, onSelect, onPaid }: ViewProps) {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const cells = monthGrid(cursor);
  const hits = useMemo(() => hitsInMonth(bills, cursor), [bills, cursor]);
  const byDay = useMemo(() => {
    const map = new Map<string, typeof hits>();
    for (const h of hits) {
      const list = map.get(h.date) ?? [];
      list.push(h);
      map.set(h.date, list);
    }
    return map;
  }, [hits]);
  const today = todayIso();
  const [picked, setPicked] = useState<string | null>(today);
  const dayHits = picked ? (byDay.get(picked) ?? []) : [];
  const monthTotal = hits
    .filter((h) => h.days >= 0 || h.isCurrent)
    .reduce((s, h) => s + h.bill.amount, 0);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-subtle">
            {formatINR(monthTotal)} this month
          </p>
          <h1 className="mt-1 font-display text-4xl tracking-tight">
            {format(cursor, "MMMM yyyy")}
          </h1>
        </div>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="icon"
            aria-label="Previous month"
            onClick={() => setCursor((d) => subMonths(d, 1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Next month"
            onClick={() => setCursor((d) => addMonths(d, 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </header>

      <div className="rounded-xl bg-surface p-3 shadow-[var(--shadow-border)]">
        <div className="grid grid-cols-7 gap-1 pb-2 text-center text-xs uppercase tracking-widest text-subtle">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell) => {
            const items = byDay.get(cell.iso) ?? [];
            const isToday = cell.iso === today;
            const isPicked = cell.iso === picked;
            const total = items.reduce((s, h) => s + h.bill.amount, 0);
            const hot = items.some((h) => h.days <= 2);
            return (
              <button
                key={cell.iso}
                type="button"
                onClick={() => setPicked(cell.iso)}
                className={cn(
                  "flex min-h-14 flex-col items-center rounded-md px-0.5 py-1 text-xs transition-colors duration-150",
                  cell.inMonth ? "text-fg" : "text-subtle",
                  isPicked && "bg-surface-2 shadow-[var(--shadow-border)]",
                  isToday && !isPicked && "bg-bg",
                )}
              >
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full tabular-nums",
                    isToday && "bg-accent text-accent-fg",
                  )}
                >
                  {format(cell.date, "d")}
                </span>
                {items.length > 0 ? (
                  <span
                    className={cn(
                      "mt-1 tabular-nums text-xs",
                      hot ? "text-warn" : "text-muted",
                    )}
                  >
                    {items.length === 1 ? formatINR(total).replace("₹", "") : `${items.length}`}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <section>
        <h2 className="mb-2 text-xs font-medium uppercase tracking-widest text-subtle">
          {picked ? formatPretty(picked) : "Pick a day"}
        </h2>
        {dayHits.length === 0 ? (
          <p className="text-sm text-muted">No bills due this day.</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl bg-surface px-1 py-1 shadow-[var(--shadow-border)]">
            {dayHits.map((hit) => (
              <li key={`${hit.bill.id}-${hit.date}`}>
                <BillRow
                  bill={enrichOnDate(hit.bill, hit.date)}
                  onSelect={onSelect}
                  onPaid={hit.isCurrent || hit.days <= 0 ? onPaid : undefined}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export function PlanView({
  bills,
  payments,
  settings,
  onSelect,
  onIncome,
  onPayday,
  onUndo,
  onUpgrade,
  onGoal,
}: ViewProps & {
  onIncome: (n: number) => void;
  onPayday: (d: number) => void;
  onUndo: () => void;
  onUpgrade: () => void;
  onGoal: (name: string, target: number) => void;
}) {
  const month = monthObligation(bills, payments);
  const left = leftover(settings.income, bills, payments);
  const payday = untilPayday(bills, settings.paydayDay || 1);
  const cats = categoryTotals(bills, payments);
  const vs = monthVsLast(bills, payments);
  const recent = recentPayments(payments, 12);
  const emis = emiLoad(bills);
  const [incomeDraft, setIncomeDraft] = useState(
    settings.income ? String(settings.income) : "",
  );

  const chartData = cats.slice(0, 6).map((c) => ({
    name: CATEGORY_LABEL[c.category].split(" ")[0],
    total: c.total,
  }));

  const deltaLabel =
    vs.lastPaid <= 0
      ? null
      : vs.delta === 0
        ? "Same as last month"
        : vs.delta > 0
          ? `${formatINR(vs.delta)} more than last month`
          : `${formatINR(Math.abs(vs.delta))} less than last month`;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-widest text-subtle">
          Money
        </p>
        <h1 className="mt-1 font-display text-4xl tracking-tight">What is left</h1>
      </header>

      <div className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
        <p className="text-xs uppercase tracking-widest text-subtle">After this month’s bills</p>
        <p
          className={cn(
            "mt-2 font-display text-4xl tabular-nums tracking-tight",
            settings.income > 0 && left < 0 ? "text-danger" : "text-fg",
          )}
        >
          {settings.income > 0 ? formatINR(left) : "—"}
        </p>
        <p className="mt-2 text-sm text-muted">
          {settings.income > 0
            ? `${formatINR(settings.income)} in · ${formatINR(month.scheduled)} out`
            : "Set monthly income to see leftover."}
        </p>
      </div>

      <MoneyTools
        bills={bills}
        payments={payments}
        settings={settings}
        onSelect={onSelect}
        onUpgrade={onUpgrade}
        onGoal={onGoal}
      />

      {emis.count > 0 ? (
        <div className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
          <p className="text-xs uppercase tracking-widest text-subtle">EMI load</p>
          <p className="mt-2 font-display text-3xl tabular-nums">
            {formatINR(emis.monthly)}
            <span className="text-lg text-muted"> / mo</span>
          </p>
          <p className="mt-2 text-sm text-muted">
            {emis.count} loan{emis.count === 1 ? "" : "s"}
            {settings.isPro && emis.remaining > 0 ? ` · ${formatINR(emis.remaining)} still to pay` : ""}
          </p>
        </div>
      ) : null}

      {vs.lastPaid > 0 ? (
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-border">
          <div className="bg-surface px-4 py-4">
            <p className="text-xs uppercase tracking-widest text-subtle">This month</p>
            <p className="mt-2 font-display text-xl tabular-nums">{formatINR(vs.thisScheduled)}</p>
          </div>
          <div className="bg-surface px-4 py-4">
            <p className="text-xs uppercase tracking-widest text-subtle">Last month paid</p>
            <p className="mt-2 font-display text-xl tabular-nums">{formatINR(vs.lastPaid)}</p>
          </div>
          {deltaLabel ? (
            <p className="col-span-2 bg-surface px-4 py-3 text-sm text-muted">{deltaLabel}</p>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="income">Monthly income (₹)</Label>
          <Input
            id="income"
            inputMode="numeric"
            className="tabular-nums"
            placeholder="52000"
            value={incomeDraft}
            onChange={(e) => setIncomeDraft(e.target.value)}
            onBlur={() => onIncome(parseAmount(incomeDraft))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="payday">Payday (day of month)</Label>
          <Input
            id="payday"
            inputMode="numeric"
            className="tabular-nums"
            min={1}
            max={28}
            value={settings.paydayDay || 1}
            onChange={(e) => {
              const n = Math.min(28, Math.max(1, Number(e.target.value) || 1));
              onPayday(n);
            }}
          />
        </div>
      </div>

      <section className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
        <h2 className="text-sm font-medium text-fg">Until next payday</h2>
        <p className="mt-1 text-sm text-muted">
          {formatPretty(payday.payday)} · {payday.items.length} hits ·{" "}
          <span className="tabular-nums text-fg">{formatINR(payday.total)}</span>
        </p>
        <ul className="mt-4 space-y-2">
          {payday.items.slice(0, 8).map((hit) => (
            <li key={`${hit.bill.id}-${hit.date}`}>
              <button
                type="button"
                onClick={() => onSelect(hit.bill.id)}
                className="flex w-full min-h-11 items-center gap-3 rounded-md px-1 py-1.5 text-left hover:bg-surface-2"
              >
                <CategoryIcon category={hit.bill.category} className="size-4 text-muted" />
                <span className="min-w-0 flex-1 truncate text-sm">{hit.bill.name}</span>
                <Badge variant={urgencyVariant(enrichOnDate(hit.bill, hit.date).urgency)}>
                  {formatDay(hit.date)}
                </Badge>
                <span className="tabular-nums text-sm">{formatINR(hit.bill.amount)}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {chartData.length > 0 ? (
        <section className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
          <h2 className="text-sm font-medium text-fg">This month by category</h2>
          <div className="mt-4 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barSize={22}>
                <XAxis
                  dataKey="name"
                  tick={{ fill: "var(--color-muted)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide />
                <Tooltip
                  cursor={{ fill: "var(--color-surface-2)" }}
                  contentStyle={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    color: "var(--color-fg)",
                  }}
                  formatter={(value) => formatINR(Number(value ?? 0))}
                />
                <Bar dataKey="total" fill="var(--color-accent)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      ) : null}

      {recent.length > 0 ? (
        <section className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-fg">Ledger</h2>
            <Button variant="ghost" size="sm" onClick={onUndo}>
              Undo last
            </Button>
          </div>
          <ul className="mt-3 divide-y divide-border">
            {recent.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="min-w-0 truncate text-fg">{p.billName}</span>
                <span className="shrink-0 text-muted">{formatPretty(p.paidOn)}</span>
                <span className="shrink-0 tabular-nums text-fg">
                  {p.status === "skipped" ? "Skip" : formatINR(p.amount)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
