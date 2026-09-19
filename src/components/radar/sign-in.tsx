import { useState } from "react";
import { toast } from "sonner";
import { GROK_PROVIDERS } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { startProviderSignIn } from "@/lib/radar/sign-in-flow";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme";
import { BrandMark } from "./logo";

export function RadarSplash({ label = "Checking your account…" }: { label?: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-bg">
      <BrandMark size="lg" />
      <p className="mt-4 text-sm text-muted">{label}</p>
    </div>
  );
}

export function RadarSignIn({ authReady = true }: { authReady?: boolean }) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center bg-bg px-4">
      <div className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))]">
        <ThemeToggle compact />
      </div>
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2">
          <BrandMark size="lg" />
          <div>
            <p className="font-display text-2xl tracking-tight text-fg">Money Mate</p>
            <p className="text-xs uppercase tracking-widest text-subtle">Bill & EMI</p>
          </div>
        </div>
        <h1 className="mt-8 font-display text-4xl tracking-tight text-fg">
          Sign in to keep your bills
        </h1>
        <p className="mt-3 text-sm text-muted">
          Google or X. Rent, EMIs, and payday leftover follow this account on every phone.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <AuthButtons ready={authReady} />
        </div>
        <p className="mt-6 text-xs text-subtle">
          A secure window opens. We never see your password.
        </p>
      </div>
    </div>
  );
}

export function AuthButtons({
  className,
  ready = true,
}: {
  className?: string;
  ready?: boolean;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  if (!ready) {
    return (
      <div className={cn("flex flex-col gap-3", className)} aria-hidden="true">
        <div className="h-12 animate-pulse rounded-md bg-surface-2" />
        <div className="h-12 animate-pulse rounded-md bg-surface-2" />
      </div>
    );
  }

  return (
    <div className={cn("relative z-10 flex flex-col gap-3", className)}>
      {GROK_PROVIDERS.map((provider) => (
        <ProviderButton
          key={provider.providerId}
          provider={provider}
          busy={busy}
          onPress={async (id) => {
            if (busy) return;
            setError("");
            setBusy(id);
            try {
              await startProviderSignIn(id);
            } catch (err) {
              const message =
                err instanceof Error ? err.message : "Sign-in failed. Try again.";
              setError(message);
              toast.error(message);
              setBusy(null);
            }
          }}
        />
      ))}
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}

function ProviderButton({
  provider,
  busy,
  onPress,
}: {
  provider: (typeof GROK_PROVIDERS)[number];
  busy: string | null;
  onPress: (id: string) => void;
}) {
  const isX = provider.idp === "twitter";
  const mine = busy === provider.providerId;
  const locked = Boolean(busy);
  return (
    <Button
      type="button"
      variant={isX ? "default" : "outline"}
      className="relative z-10 h-12 w-full justify-center gap-2.5 [&_svg]:size-5 [&_svg]:overflow-visible"
      disabled={locked}
      onClick={() => onPress(provider.providerId)}
    >
      <ProviderMark idp={provider.idp} />
      {mine ? "Connecting…" : `Continue with ${provider.label}`}
    </Button>
  );
}

function ProviderMark({ idp }: { idp: string }) {
  if (idp === "google") {
    return (
      <svg viewBox="0 0 24 24" className="size-5 shrink-0 overflow-visible" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47c-.29 1.49-1.13 2.76-2.4 3.62v3.01h3.87c2.27-2.09 3.55-5.17 3.55-8.87z"
        />
        <path
          fill="#34A853"
          d="M12 24c3.24 0 5.95-1.07 7.93-2.91l-3.87-3.01c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.94H1.32v3.09C3.3 21.3 7.36 24 12 24z"
        />
        <path
          fill="#FBBC05"
          d="M5.29 14.29A7.2 7.2 0 0 1 4.91 12c0-.8.14-1.57.38-2.29V6.62H1.32A11.97 11.97 0 0 0 0 12c0 1.94.46 3.77 1.32 5.38l3.97-3.09z"
        />
        <path
          fill="#EA4335"
          d="M12 4.75c1.77 0 3.36.61 4.61 1.8l3.45-3.44C17.96 1.19 15.24 0 12 0 7.36 0 3.3 2.7 1.32 6.62l3.97 3.09C6.23 6.86 8.88 4.75 12 4.75z"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0 overflow-visible" aria-hidden="true">
      <path
        fill="currentColor"
        d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.727-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z"
      />
    </svg>
  );
}
