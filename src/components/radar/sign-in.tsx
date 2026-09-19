import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { authClient, GROK_PROVIDERS } from "@/lib/auth/client";
import { normalizeIndiaPhone } from "@/lib/auth/phone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    <div className="relative flex min-h-dvh items-center justify-center bg-bg px-4 py-10">
      <div className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] z-20">
        <ThemeToggle compact />
      </div>
      <div className="relative z-10 w-full max-w-sm">
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
          Google, email, or phone. Rent, EMIs, and payday leftover follow this account on every phone.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <AuthButtons ready={authReady} />
        </div>
        <p className="mt-6 text-xs text-subtle">
          Google opens a secure window. Email and phone stay on this page.
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
        <div className="h-24 animate-pulse rounded-md bg-surface-2" />
      </div>
    );
  }

  return (
    <div className={cn("relative z-10 flex flex-col gap-4", className)}>
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

      <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-subtle">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>

      <EmailPasswordForm
        busy={busy}
        setBusy={setBusy}
        setError={setError}
      />

      <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-subtle">
        <span className="h-px flex-1 bg-border" />
        phone
        <span className="h-px flex-1 bg-border" />
      </div>

      <PhoneOtpForm
        busy={busy}
        setBusy={setBusy}
        setError={setError}
      />

      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}

function EmailPasswordForm({
  busy,
  setBusy,
  setError,
}: {
  busy: string | null;
  setBusy: (v: string | null) => void;
  setError: (v: string) => void;
}) {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const locked = Boolean(busy);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError("");
    setBusy("email");
    try {
      if (mode === "sign-up") {
        const { error } = await authClient.signUp.email({
          email: email.trim(),
          password,
          name: name.trim() || email.trim().split("@")[0] || "User",
        });
        if (error) throw new Error(error.message ?? "Sign-up failed. Try again.");
      } else {
        const { error } = await authClient.signIn.email({
          email: email.trim(),
          password,
        });
        if (error) throw new Error(error.message ?? "Sign-in failed. Try again.");
      }
      window.location.assign("/");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
      toast.error(message);
      setBusy(null);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <div className="flex gap-2 text-sm">
        <button
          type="button"
          className={cn(
            "rounded-md px-3 py-1.5",
            mode === "sign-in" ? "bg-surface-2 text-fg" : "text-muted hover:text-fg",
          )}
          disabled={locked}
          onClick={() => setMode("sign-in")}
        >
          Sign in
        </button>
        <button
          type="button"
          className={cn(
            "rounded-md px-3 py-1.5",
            mode === "sign-up" ? "bg-surface-2 text-fg" : "text-muted hover:text-fg",
          )}
          disabled={locked}
          onClick={() => setMode("sign-up")}
        >
          Sign up
        </button>
      </div>
      {mode === "sign-up" ? (
        <div className="space-y-1.5">
          <Label htmlFor="mm-name">Name</Label>
          <Input
            id="mm-name"
            name="name"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={locked}
            placeholder="Your name"
          />
        </div>
      ) : null}
      <div className="space-y-1.5">
        <Label htmlFor="mm-email">Email</Label>
        <Input
          id="mm-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={locked}
          placeholder="you@example.com"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="mm-password">Password</Label>
        <Input
          id="mm-password"
          name="password"
          type="password"
          autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={locked}
          placeholder="At least 8 characters"
        />
      </div>
      <Button type="submit" className="h-12 w-full" disabled={locked}>
        {busy === "email"
          ? mode === "sign-up"
            ? "Creating account…"
            : "Signing in…"
          : mode === "sign-up"
            ? "Create account"
            : "Sign in with email"}
      </Button>
    </form>
  );
}

function PhoneOtpForm({
  busy,
  setBusy,
  setError,
}: {
  busy: string | null;
  setBusy: (v: string | null) => void;
  setError: (v: string) => void;
}) {
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phoneInput, setPhoneInput] = useState("");
  const [e164, setE164] = useState("");
  const [code, setCode] = useState("");
  const locked = Boolean(busy);

  async function sendOtp(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError("");
    const normalized = normalizeIndiaPhone(phoneInput);
    if (!normalized) {
      const message = "Enter a valid Indian mobile (+91 or 10 digits).";
      setError(message);
      toast.error(message);
      return;
    }
    setBusy("phone-send");
    try {
      const { error } = await authClient.phoneNumber.sendOtp({
        phoneNumber: normalized,
      });
      if (error) throw new Error(error.message ?? "Could not send code. Try again.");
      setE164(normalized);
      setStep("code");
      toast.success("Code sent by SMS.");
      setBusy(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not send code.";
      setError(message);
      toast.error(message);
      setBusy(null);
    }
  }

  async function verifyOtp(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError("");
    setBusy("phone-verify");
    try {
      const { error } = await authClient.phoneNumber.verify({
        phoneNumber: e164,
        code: code.trim(),
      });
      if (error) throw new Error(error.message ?? "Invalid code. Try again.");
      window.location.assign("/");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Verification failed.";
      setError(message);
      toast.error(message);
      setBusy(null);
    }
  }

  if (step === "code") {
    return (
      <form onSubmit={verifyOtp} className="flex flex-col gap-3">
        <p className="text-sm text-muted">
          Code sent to <span className="tabular-nums text-fg">{e164}</span>
        </p>
        <div className="space-y-1.5">
          <Label htmlFor="mm-otp">SMS code</Label>
          <Input
            id="mm-otp"
            name="otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={locked}
            placeholder="6-digit code"
          />
        </div>
        <Button type="submit" className="h-12 w-full" disabled={locked}>
          {busy === "phone-verify" ? "Verifying…" : "Verify & sign in"}
        </Button>
        <button
          type="button"
          className="text-sm text-muted hover:text-fg"
          disabled={locked}
          onClick={() => {
            setStep("phone");
            setCode("");
          }}
        >
          Change number
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={sendOtp} className="flex flex-col gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="mm-phone">Mobile number</Label>
        <Input
          id="mm-phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required
          value={phoneInput}
          onChange={(e) => setPhoneInput(e.target.value)}
          disabled={locked}
          placeholder="+91 98765 43210"
        />
      </div>
      <Button type="submit" variant="outline" className="h-12 w-full" disabled={locked}>
        {busy === "phone-send" ? "Sending…" : "Send OTP"}
      </Button>
    </form>
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
  const mine = busy === provider.providerId;
  const locked = Boolean(busy);
  return (
    <Button
      type="button"
      variant="outline"
      className="relative z-10 h-12 w-full justify-center gap-2.5 [&_svg]:pointer-events-none [&_svg]:size-[20px] [&_svg]:shrink-0 [&_svg]:overflow-visible"
      disabled={locked}
      onClick={() => onPress(provider.providerId)}
    >
      <ProviderMark idp={provider.idp} />
      {mine ? "Connecting…" : `Continue with ${provider.label}`}
    </Button>
  );
}

/** Full-colour Google G. Inline size beats Button's [&_svg]:size-4. */
function ProviderMark({ idp }: { idp: string }) {
  if (idp === "google") {
    return (
      <svg
        viewBox="0 0 24 24"
        width={20}
        height={20}
        className="shrink-0 overflow-visible"
        style={{ width: 20, height: 20, overflow: "visible" }}
        aria-hidden="true"
      >
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
    );
  }
  return null;
}
