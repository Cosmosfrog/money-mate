import {
  Building2,
  Check,
  CreditCard,
  Droplets,
  Flame,
  GraduationCap,
  Home,
  Landmark,
  MonitorPlay,
  Shield,
  Smartphone,
  UserRound,
  Wifi,
  Zap,
  Dumbbell,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { daysLabel, formatINR } from "@/lib/radar/format";
import { CATEGORY_LABEL, type Category } from "@/lib/radar/types";
import type { EnrichedBill } from "@/lib/radar/selectors";
import { cn } from "@/lib/utils";

const ICONS: Record<Category, typeof Home> = {
  rent: Home,
  "loan-emi": Landmark,
  "credit-card": CreditCard,
  mobile: Smartphone,
  internet: Wifi,
  electricity: Zap,
  gas: Flame,
  water: Droplets,
  insurance: Shield,
  ott: MonitorPlay,
  school: GraduationCap,
  household: UserRound,
  gym: Dumbbell,
  other: Building2,
};

export function urgencyVariant(urgency: EnrichedBill["urgency"]) {
  if (urgency === "overdue") return "overdue" as const;
  if (urgency === "today" || urgency === "soon") return "today" as const;
  if (urgency === "week") return "accent" as const;
  return "default" as const;
}

export function CategoryIcon({ category, className }: { category: Category; className?: string }) {
  const Icon = ICONS[category];
  return <Icon className={cn("size-4", className)} />;
}

interface BillRowProps {
  bill: EnrichedBill;
  selected?: boolean;
  onSelect: (id: string) => void;
  onPaid?: (id: string) => void;
}

export function BillRow({ bill, selected, onSelect, onPaid }: BillRowProps) {
  const showPay = Boolean(onPaid) && bill.days <= 0;
  return (
    <div
      className={cn(
        "flex w-full min-h-14 items-center rounded-lg pr-1 text-left transition-[background-color,box-shadow] duration-150",
        selected
          ? "bg-surface-2 shadow-[var(--shadow-border-hover)]"
          : "hover:bg-surface-2/70",
      )}
    >
      <button
        type="button"
        onClick={() => onSelect(bill.id)}
        className="flex min-h-14 min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-bg text-muted">
          <CategoryIcon category={bill.category} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate font-medium text-fg">{bill.name}</span>
            {bill.autoDebit ? (
              <span className="shrink-0 text-xs uppercase tracking-wider text-subtle">
                Auto
              </span>
            ) : null}
          </span>
          <span className="mt-0.5 block truncate text-xs text-muted">
            {bill.account ? `${bill.account} · ` : ""}
            {CATEGORY_LABEL[bill.category]}
            {bill.remainingEmis > 0 ? ` · ${bill.remainingEmis} left` : ""}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <span className="font-medium tabular-nums text-fg">{formatINR(bill.amount)}</span>
          <Badge variant={urgencyVariant(bill.urgency)}>{daysLabel(bill.days)}</Badge>
        </span>
      </button>
      {showPay && onPaid ? (
        <button
          type="button"
          aria-label={`Mark ${bill.name} paid`}
          onClick={() => onPaid(bill.id)}
          className="flex size-11 shrink-0 items-center justify-center rounded-md text-muted transition-colors duration-150 hover:bg-bg hover:text-ok"
        >
          <Check className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
