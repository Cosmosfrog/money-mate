import { useEffect, useState } from "react";
import { formatINR, formatINRCompact } from "@/lib/radar/format";
import type { EnrichedBill } from "@/lib/radar/selectors";

const CX = 100;
const CY = 100;
const DAY_SPAN = 14;

function polar(days: number, offset: number) {
  const clamped = Math.max(-2, Math.min(DAY_SPAN, days));
  const t = (clamped + 2) / (DAY_SPAN + 2);
  const r = 22 + t * 68;
  const base = ((clamped + 2) / (DAY_SPAN + 2)) * Math.PI * 2 - Math.PI / 2;
  const angle = base + offset;
  return {
    x: CX + Math.cos(angle) * r,
    y: CY + Math.sin(angle) * r,
    r,
  };
}

function colorFor(bill: EnrichedBill): string {
  if (bill.urgency === "overdue") return "var(--color-danger)";
  if (bill.urgency === "today" || bill.urgency === "soon") return "var(--color-warn)";
  if (bill.urgency === "week") return "var(--color-accent)";
  return "var(--color-muted)";
}

function radiusFor(amount: number, max: number): number {
  const t = max <= 0 ? 0.5 : amount / max;
  return 3.2 + t * 4.2;
}

interface RadarScopeProps {
  bills: EnrichedBill[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function RadarScope({ bills, selectedId, onSelect }: RadarScopeProps) {
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const visible = bills.filter((b) => b.days <= DAY_SPAN);
  const maxAmount = Math.max(...visible.map((b) => b.amount), 1);
  const byDay = new Map<number, EnrichedBill[]>();
  for (const b of visible) {
    const key = b.days;
    const list = byDay.get(key) ?? [];
    list.push(b);
    byDay.set(key, list);
  }

  const points = visible.map((bill) => {
    const siblings = byDay.get(bill.days) ?? [bill];
    const i = siblings.findIndex((s) => s.id === bill.id);
    const spread = siblings.length === 1 ? 0 : (i - (siblings.length - 1) / 2) * 0.18;
    const p = polar(bill.days, spread);
    return { bill, ...p, size: radiusFor(bill.amount, maxAmount) };
  });

  const next = bills[0];

  return (
    <div className="relative mx-auto w-64 sm:w-72">
      <svg
        viewBox="0 0 200 200"
        className="block h-auto w-full overflow-visible text-border"
        role="img"
        aria-label="Upcoming bills over the next 14 days"
      >
        <circle cx={CX} cy={CY} r={90} fill="none" stroke="currentColor" strokeWidth="0.6" />
        <circle cx={CX} cy={CY} r={62} fill="none" stroke="currentColor" strokeWidth="0.6" />
        <circle cx={CX} cy={CY} r={34} fill="none" stroke="currentColor" strokeWidth="0.6" />
        <line x1={CX} y1={10} x2={CX} y2={190} stroke="currentColor" strokeWidth="0.4" />
        <line x1={10} y1={CY} x2={190} y2={CY} stroke="currentColor" strokeWidth="0.4" />

        <g>
          {reduceMotion ? null : (
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 100 100"
              to="360 100 100"
              dur="18s"
              repeatCount="indefinite"
            />
          )}
          <defs>
            <linearGradient id="sweep" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0" />
              <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.22" />
            </linearGradient>
          </defs>
          <path d="M100 100 L100 10 A90 90 0 0 1 168 38 Z" fill="url(#sweep)" />
        </g>

        {points.map(({ bill, x, y, size }) => {
          const selected = selectedId === bill.id;
          return (
            <g key={bill.id}>
              <circle
                cx={x}
                cy={y}
                r={selected ? size + 4 : size + 8}
                fill="transparent"
                className="cursor-pointer"
                onClick={() => onSelect(bill.id)}
              />
              <circle
                cx={x}
                cy={y}
                r={selected ? size + 1.8 : size}
                fill={colorFor(bill)}
                stroke="var(--color-bg)"
                strokeWidth={1.2}
                className="cursor-pointer"
                onClick={() => onSelect(bill.id)}
              />
            </g>
          );
        })}
      </svg>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-subtle">
          Next out
        </p>
        <p className="mt-1 font-display text-3xl tabular-nums leading-tight tracking-tight text-fg">
          {next ? formatINRCompact(next.amount) : "—"}
        </p>
        <p className="mt-1 max-w-40 truncate text-xs text-muted">
          {next ? next.name : "Clear skies"}
        </p>
      </div>

      <div className="mt-2 flex justify-between px-6 text-xs uppercase tracking-widest text-subtle">
        <span>Overdue</span>
        <span>7 days</span>
        <span>14 days</span>
      </div>
    </div>
  );
}

export function RadarLegend({ bills }: { bills: EnrichedBill[] }) {
  const overdue = bills.filter((b) => b.urgency === "overdue").length;
  const week = bills.filter((b) => b.days >= 0 && b.days <= 7).length;
  return (
    <p className="text-center text-sm text-muted">
      {overdue > 0 ? (
        <span className="text-danger">
          {overdue} overdue
        </span>
      ) : (
        <span className="text-ok">Nothing overdue</span>
      )}
      <span className="mx-2 text-subtle">·</span>
      {week} in the next 7 days
      {bills[0] ? (
        <>
          <span className="mx-2 text-subtle">·</span>
          <span className="tabular-nums text-fg">{formatINR(bills.filter((b) => b.days <= 7).reduce((s, b) => s + b.amount, 0))}</span>
        </>
      ) : null}
    </p>
  );
}
