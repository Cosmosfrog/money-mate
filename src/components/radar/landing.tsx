import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme";
import { formatINR } from "@/lib/radar/format";
import { FREE_BILL_CAP, PRO_PERKS, PRO_PLANS, PRO_TRIAL_DAYS } from "@/lib/radar/pro";
import { BrandMark } from "./logo";
import { AuthButtons } from "./sign-in";

const MOTIVE = [
  {
    kicker: "Goal",
    title: "Never be surprised by a debit",
    body: "Rent, EMIs, OTT, and the credit-card cycle should sit on one radar — not five bank apps and a fading spreadsheet.",
  },
  {
    kicker: "Motive",
    title: "Payday leftover, not leftover panic",
    body: "See what is already spoken for before you tap UPI. Money Mate is the quiet pause between salary credit and the next EMI.",
  },
];

const BENEFITS = [
  {
    title: "14-day radar",
    body: "Bills land as blips. Overdue sits close to the centre. Next week sits on the rim. One glance, not a scroll.",
  },
  {
    title: "Payday leftover",
    body: "Income minus what is still due this cycle. Safe-to-spend is 40% of that leftover — so a weekend does not wipe the month.",
  },
  {
    title: "EMI load",
    body: "Car, phone, and personal loans as a share of income. Over 40% lights up. You know before the next showroom visit.",
  },
  {
    title: "Reminders that follow you",
    body: "Google, email, or phone. Same household on every device. Browser alerts the day before, or on the due date — your call.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Sign in",
    body: "Google, email, or phone. Google opens a secure window; email and phone stay on the page.",
  },
  {
    n: "02",
    title: "Load the household",
    body: "Start from a sample Indian home, or add rent, EMIs, and OTT in under a minute.",
  },
  {
    n: "03",
    title: "Watch the next out",
    body: "Mark paid, skip, or snooze. Leftover updates. The radar keeps turning.",
  },
];

const KEYS = [
  {
    title: "Free covers a real home",
    body: `${FREE_BILL_CAP} live bills — rent, two EMIs, utilities, a couple of subscriptions. Not a toy cap.`,
  },
  {
    title: "Pro turns on by itself",
    body: "Pay on Stripe. Come back. The account is Pro — no extra tap.",
  },
  {
    title: "Yours to keep",
    body: "Export JSON anytime. Import on a new phone. Start fresh if you want a clean slate.",
  },
  {
    title: "Built for Indian money",
    body: "Rupees, payday day-of-month, auto-debit, remaining EMIs, OTT and gym rolled up for the year.",
  },
];

const RETAIN = [
  {
    title: "The radar becomes a habit",
    body: "Open it the morning after payday. See what leaves this week. People stay because the next debit is always in view.",
  },
  {
    title: "Leftover goals",
    body: "Name an emergency fund. Money Mate counts the paydays. A monthly plan you can feel is harder to cancel.",
  },
  {
    title: "Alerts before the bounce",
    body: "Browser ping inside your remind window. Credit-card due no longer hides behind a salary credit.",
  },
  {
    title: "Same home, every device",
    body: "Sign in on the phone at the shop. The EMI check is already there. No CSV, no re-typing.",
  },
];

const FAQS = [
  {
    q: "What happens after I pay?",
    a: "Stripe takes the card. You land back in Money Mate and Pro turns on by itself.",
  },
  {
    q: "Can I try before I pay?",
    a: `Yes. Free covers ${FREE_BILL_CAP} bills, the radar, the calendar, and payday leftover. Pro starts with a ${PRO_TRIAL_DAYS}-day trial, then ${formatINR(PRO_PLANS.monthly.amount)} a month or ${formatINR(PRO_PLANS.yearly.amount)} a year.`,
  },
  {
    q: "What does Pro add?",
    a: "Unlimited bills, a 90-day cashflow, “can I afford this EMI”, subscription waste, and leftover goals. The tools you open when money is about to leave.",
  },
  {
    q: "How do I cancel?",
    a: "Leave from Stripe whenever the household no longer needs the extra tools. Monthly or yearly — your bills stay on the free plan, capped at 12.",
  },
  {
    q: "Is my data on this account?",
    a: "Yes. Google, email, or phone holds the login. Bills save to your account, not a shared demo. Export a JSON backup if you want a file copy.",
  },
];

const BLIPS: { x: number; y: number; r: number; tone: "danger" | "warn" | "accent" | "muted"; delay: string }[] = [
  { x: 86, y: 48, r: 5.2, tone: "danger", delay: "0s" },
  { x: 128, y: 62, r: 6.4, tone: "warn", delay: "0.4s" },
  { x: 148, y: 108, r: 4.2, tone: "accent", delay: "0.8s" },
  { x: 118, y: 150, r: 3.6, tone: "muted", delay: "1.2s" },
  { x: 62, y: 132, r: 4.8, tone: "accent", delay: "1.6s" },
  { x: 54, y: 88, r: 3.4, tone: "muted", delay: "2s" },
];

export function Landing({ authReady = true }: { authReady?: boolean }) {
  return (
    <div className="min-h-dvh bg-bg text-fg">
      <header className="sticky top-0 z-20 border-b border-border bg-bg/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4 sm:h-16 sm:px-6">
          <a href="#top" className="flex min-w-0 items-center gap-2 text-fg">
            <BrandMark />
            <span className="font-display text-lg tracking-tight">Money Mate</span>
          </a>
          <nav className="hidden items-center gap-6 text-sm text-muted md:flex">
            <a href="#why" className="hover:text-fg">
              Why
            </a>
            <a href="#benefits" className="hover:text-fg">
              Benefits
            </a>
            <a href="#pricing" className="hover:text-fg">
              Pricing
            </a>
            <a href="#start" className="hover:text-fg">
              Sign in
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle compact />
            <Button asChild size="sm" className="h-10">
              <a href="#start">Start free</a>
            </Button>
          </div>
        </div>
      </header>

      <main id="top">
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.1fr_0.9fr] md:py-20">
          <div>
            <p className="land-in text-xs font-medium uppercase tracking-widest text-subtle">
              Bill & EMI radar
            </p>
            <h1 className="land-in land-in-1 mt-4 font-display text-4xl leading-[1.1] tracking-tight sm:text-5xl md:text-6xl">
              See money leave before it leaves.
            </h1>
            <p className="land-in land-in-2 mt-5 max-w-xl text-base text-muted sm:text-lg">
              Track rent, EMIs, and payday leftover on one quiet radar. Free for a{" "}
              {FREE_BILL_CAP}-bill home. Pro is {formatINR(PRO_PLANS.monthly.amount)} a month
              or {formatINR(PRO_PLANS.yearly.amount)} a year — trial first, unlocks itself after
              Stripe.
            </p>
            <div className="relative z-10 mt-8 max-w-sm" id="start">
              <AuthButtons ready={authReady} />
              <p className="mt-3 text-xs text-subtle">
                Google opens a secure window. Email and phone stay on this page.
              </p>
            </div>
          </div>
          <HeroScope />
        </section>

        <section id="why" className="border-t border-border">
          <div className="mx-auto grid max-w-6xl gap-px bg-border md:grid-cols-2">
            {MOTIVE.map((item) => (
              <article key={item.kicker} className="bg-bg px-4 py-10 sm:px-6 md:px-10 md:py-14">
                <p className="text-xs font-medium uppercase tracking-widest text-subtle">
                  {item.kicker}
                </p>
                <h2 className="mt-3 font-display text-3xl tracking-tight">{item.title}</h2>
                <p className="mt-3 max-w-md text-sm text-muted sm:text-base">{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="benefits" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
          <p className="text-xs font-medium uppercase tracking-widest text-subtle">Benefits</p>
          <h2 className="mt-3 max-w-xl font-display text-3xl tracking-tight sm:text-4xl">
            The household, in one place, before UPI.
          </h2>
          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            {BENEFITS.map((item) => (
              <article
                key={item.title}
                className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6"
              >
                <h3 className="font-display text-xl tracking-tight">{item.title}</h3>
                <p className="mt-2 text-sm text-muted">{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-border bg-surface-2/40">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20">
            <p className="text-xs font-medium uppercase tracking-widest text-subtle">How it works</p>
            <h2 className="mt-3 font-display text-3xl tracking-tight">Three steps. Then the radar.</h2>
            <ol className="mt-10 grid gap-6 md:grid-cols-3">
              {STEPS.map((step) => (
                <li key={step.n}>
                  <p className="font-display text-2xl tabular-nums text-subtle">{step.n}</p>
                  <h3 className="mt-2 text-base font-medium text-fg">{step.title}</h3>
                  <p className="mt-2 text-sm text-muted">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
          <p className="text-xs font-medium uppercase tracking-widest text-subtle">Key points</p>
          <h2 className="mt-3 max-w-xl font-display text-3xl tracking-tight sm:text-4xl">
            Why people start — and why they stay.
          </h2>
          <div className="mt-10 grid gap-px overflow-hidden rounded-xl bg-border sm:grid-cols-2">
            {KEYS.map((item) => (
              <article key={item.title} className="bg-surface p-5 sm:p-6">
                <h3 className="text-sm font-medium text-fg">{item.title}</h3>
                <p className="mt-2 text-sm text-muted">{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="pricing" className="border-t border-border">
          <div className="mx-auto grid max-w-6xl gap-px bg-border md:grid-cols-3">
            <article className="bg-bg px-4 py-12 sm:px-6 md:px-8">
              <p className="text-xs font-medium uppercase tracking-widest text-subtle">Free</p>
              <p className="mt-3 font-display text-4xl tracking-tight">₹0</p>
              <p className="mt-2 text-sm text-muted">A typical 12-bill home. Keep it forever.</p>
              <ul className="mt-6 space-y-2 text-sm text-fg">
                <li className="flex gap-2">
                  <span className="text-accent">·</span>
                  {FREE_BILL_CAP} live bills
                </li>
                <li className="flex gap-2">
                  <span className="text-accent">·</span>
                  14-day radar, calendar, leftover
                </li>
                <li className="flex gap-2">
                  <span className="text-accent">·</span>
                  Mark paid, skip, snooze, JSON backup
                </li>
              </ul>
            </article>
            <article className="bg-bg px-4 py-12 sm:px-6 md:px-8">
              <p className="text-xs font-medium uppercase tracking-widest text-subtle">Monthly</p>
              <p className="mt-3 font-display text-4xl tabular-nums tracking-tight">
                {formatINR(PRO_PLANS.monthly.amount)}
                <span className="text-lg text-muted"> / mo</span>
              </p>
              <p className="mt-2 text-sm text-muted">
                {PRO_TRIAL_DAYS}-day trial. Cancel any month.
              </p>
              <ul className="mt-6 space-y-2 text-sm text-fg">
                {PRO_PERKS.map((perk) => (
                  <li key={perk} className="flex gap-2">
                    <span className="text-accent">·</span>
                    {perk}
                  </li>
                ))}
              </ul>
            </article>
            <article className="bg-surface px-4 py-12 sm:px-6 md:px-8">
              <p className="text-xs font-medium uppercase tracking-widest text-accent">
                Yearly · best value
              </p>
              <p className="mt-3 font-display text-4xl tabular-nums tracking-tight">
                {formatINR(PRO_PLANS.yearly.amount)}
                <span className="text-lg text-muted"> / yr</span>
              </p>
              <p className="mt-2 text-sm text-muted">
                {formatINR(PRO_PLANS.yearly.perMonth)}/mo. Save {formatINR(PRO_PLANS.yearly.save)}.
              </p>
              <ul className="mt-6 space-y-2 text-sm text-fg">
                <li className="flex gap-2">
                  <span className="text-accent">·</span>
                  Everything in monthly
                </li>
                <li className="flex gap-2">
                  <span className="text-accent">·</span>
                  {PRO_TRIAL_DAYS}-day trial, then one payment
                </li>
                <li className="flex gap-2">
                  <span className="text-accent">·</span>
                  Pro turns on after Stripe — no extra tap
                </li>
              </ul>
            </article>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
          <p className="text-xs font-medium uppercase tracking-widest text-subtle">Stay</p>
          <h2 className="mt-3 max-w-xl font-display text-3xl tracking-tight sm:text-4xl">
            Built to keep the household coming back.
          </h2>
          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            {RETAIN.map((item) => (
              <article
                key={item.title}
                className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6"
              >
                <h3 className="font-display text-xl tracking-tight">{item.title}</h3>
                <p className="mt-2 text-sm text-muted">{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-t border-border">
          <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 md:py-20">
            <p className="text-xs font-medium uppercase tracking-widest text-subtle">Questions</p>
            <h2 className="mt-3 font-display text-3xl tracking-tight">Straight answers</h2>
            <div className="mt-8 space-y-2">
              {FAQS.map((item) => (
                <details
                  key={item.q}
                  className="rounded-lg bg-surface px-4 py-1 shadow-[var(--shadow-border)]"
                >
                  <summary className="cursor-pointer list-none py-3 text-sm font-medium leading-snug text-fg [&::-webkit-details-marker]:hidden">
                    {item.q}
                  </summary>
                  <p className="pb-3 text-sm text-muted">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border">
          <div className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6 md:py-24">
            <h2 className="font-display text-3xl tracking-tight sm:text-4xl">
              Put the household on the radar.
            </h2>
            <p className="mt-4 text-sm text-muted sm:text-base">
              Sign in. Load a sample home or your own bills. Pro is there when twelve is no longer enough.
            </p>
            <div className="relative z-10 mx-auto mt-8 max-w-sm text-left">
              <AuthButtons ready={authReady} />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-xs text-subtle sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>Money Mate · Bill & EMI</p>
          <p>
            Pro · {formatINR(PRO_PLANS.monthly.amount)}/mo or {formatINR(PRO_PLANS.yearly.amount)}/yr · {PRO_TRIAL_DAYS}-day trial
          </p>
        </div>
      </footer>
    </div>
  );
}

function HeroScope() {
  return (
    <div className="land-in land-in-4 relative mx-auto w-full max-w-md">
      <svg
        viewBox="0 0 200 200"
        className="block h-auto w-full overflow-visible text-border"
        role="img"
        aria-label="Bills appearing on a 14-day radar"
      >
        <circle className="land-ring" cx="100" cy="100" r="90" fill="none" stroke="currentColor" strokeWidth="0.6" />
        <circle cx="100" cy="100" r="62" fill="none" stroke="currentColor" strokeWidth="0.6" />
        <circle cx="100" cy="100" r="34" fill="none" stroke="currentColor" strokeWidth="0.6" />
        <line x1="100" y1="10" x2="100" y2="190" stroke="currentColor" strokeWidth="0.4" />
        <line x1="10" y1="100" x2="190" y2="100" stroke="currentColor" strokeWidth="0.4" />
        <g className="land-sweep">
          <defs>
            <linearGradient id="land-sweep" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0" />
              <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.28" />
            </linearGradient>
          </defs>
          <path d="M100 100 L100 10 A90 90 0 0 1 168 38 Z" fill="url(#land-sweep)" />
        </g>
        {BLIPS.map((blip, i) => (
          <circle
            key={i}
            className="land-blip"
            cx={blip.x}
            cy={blip.y}
            r={blip.r}
            fill={`var(--color-${blip.tone})`}
            stroke="var(--color-bg)"
            strokeWidth="1.2"
            style={{ animationDelay: blip.delay }}
          />
        ))}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-subtle">Next out</p>
        <p className="mt-1 font-display text-3xl tabular-nums leading-tight tracking-tight text-fg">
          ₹11k
        </p>
        <p className="mt-1 text-xs text-muted">Car EMI · HDFC</p>
      </div>
      <div className="mt-2 flex justify-between px-8 text-xs uppercase tracking-widest text-subtle">
        <span>Overdue</span>
        <span>7 days</span>
        <span>14 days</span>
      </div>
    </div>
  );
}
