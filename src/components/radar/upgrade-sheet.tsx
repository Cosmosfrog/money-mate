import { useState } from "react";
import { Drawer } from "vaul";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/radar/format";
import {
  PRO_PERKS,
  PRO_PLANS,
  PRO_TRIAL_DAYS,
  startProCheckout,
  type ProPlanId,
} from "@/lib/radar/pro";
import { cn } from "@/lib/utils";

interface UpgradeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UpgradeSheet({ open, onOpenChange }: UpgradeSheetProps) {
  const [plan, setPlan] = useState<ProPlanId>("yearly");
  const selected = PRO_PLANS[plan];

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-bg/70" />
        <Drawer.Content className="fixed bottom-0 left-1/2 z-50 flex max-h-[92vh] w-full max-w-lg -translate-x-1/2 flex-col rounded-t-xl bg-surface shadow-[var(--shadow-border)] outline-none">
          <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-border-strong" />
          <div className="overflow-y-auto px-5 pb-8 pt-4">
            <p className="text-xs font-medium uppercase tracking-widest text-subtle">Money Mate Pro</p>
            <Drawer.Title className="mt-1 font-display text-3xl tracking-tight">
              Run the whole household
            </Drawer.Title>
            <Drawer.Description className="mt-2 text-sm text-muted">
              Free covers a typical 12-bill home. Pick monthly or yearly. After Stripe,
              the account converts to Pro on its own.
            </Drawer.Description>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <PlanChoice
                active={plan === "yearly"}
                badge="Best value"
                title={formatINR(PRO_PLANS.yearly.amount)}
                period="/ year"
                hint={`${formatINR(PRO_PLANS.yearly.perMonth)}/mo · save ${formatINR(PRO_PLANS.yearly.save)}`}
                onClick={() => setPlan("yearly")}
              />
              <PlanChoice
                active={plan === "monthly"}
                title={formatINR(PRO_PLANS.monthly.amount)}
                period="/ month"
                hint="Cancel any month"
                onClick={() => setPlan("monthly")}
              />
            </div>

            <ul className="mt-5 space-y-2 text-sm text-fg">
              {PRO_PERKS.map((perk) => (
                <li key={perk} className="flex gap-2">
                  <span className="text-accent">·</span>
                  {perk}
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <Button
                className="h-12 w-full"
                onClick={() => {
                  startProCheckout(plan);
                  onOpenChange(false);
                }}
              >
                Start {PRO_TRIAL_DAYS}-day trial · {selected.period === "year" ? "yearly" : "monthly"}
              </Button>
            </div>
            <p className="mt-3 text-center text-xs text-subtle">
              {selected.blurb} Pro turns on when you come back.
            </p>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function PlanChoice({
  active,
  badge,
  title,
  period,
  hint,
  onClick,
}: {
  active: boolean;
  badge?: string;
  title: string;
  period: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg bg-bg px-3 py-3 text-left shadow-[var(--shadow-border)] transition-[box-shadow,background-color] duration-150",
        active && "shadow-[var(--shadow-border-hover)]",
      )}
    >
      {badge ? (
        <p className="text-xs font-medium uppercase tracking-widest text-accent">{badge}</p>
      ) : (
        <p className="text-xs font-medium uppercase tracking-widest text-subtle">Monthly</p>
      )}
      <p className="mt-1 font-display text-2xl tabular-nums tracking-tight">
        {title}
        <span className="text-sm text-muted">{period}</span>
      </p>
      <p className="mt-1 text-xs text-muted">{hint}</p>
    </button>
  );
}
