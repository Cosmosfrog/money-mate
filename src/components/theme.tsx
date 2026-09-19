import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { Toaster } from "sonner";
import {
  THEME_KEY,
  applyTheme,
  readThemePref,
  resolveTheme,
  type ThemePref,
} from "@/lib/theme";
import { cn } from "@/lib/utils";

const ThemeCtx = createContext<{
  pref: ThemePref;
  resolved: "light" | "dark";
  setPref: (pref: ThemePref) => void;
} | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [pref, setPrefState] = useState<ThemePref>(() =>
    typeof window === "undefined" ? "system" : readThemePref(),
  );
  const [resolved, setResolved] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "dark";
    return resolveTheme(readThemePref());
  });

  useEffect(() => {
    const initial = readThemePref();
    setPrefState(initial);
    applyTheme(initial);
    setResolved(resolveTheme(initial));
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const current = readThemePref();
      if (current !== "system") return;
      applyTheme(current);
      setResolved(resolveTheme(current));
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const setPref = useCallback((next: ThemePref) => {
    try {
      window.localStorage.setItem(THEME_KEY, next);
    } catch {
      /* ignore */
    }
    setPrefState(next);
    applyTheme(next);
    setResolved(resolveTheme(next));
  }, []);

  const value = useMemo(() => ({ pref, resolved, setPref }), [pref, resolved, setPref]);

  return (
    <ThemeCtx.Provider value={value}>
      {children}
      <Toaster
        theme={resolved}
        position="top-center"
        toastOptions={{
          className:
            "!bg-surface !text-fg !border-border !shadow-[var(--shadow-border)]",
        }}
      />
    </ThemeCtx.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) {
    return {
      pref: "system" as ThemePref,
      resolved: "dark" as const,
      setPref: (_pref: ThemePref) => {},
    };
  }
  return ctx;
}

/** Header control: explicit Light | Dark. Every tap applies that theme immediately. */
export function ThemeToggle({ compact = false, className }: { compact?: boolean; className?: string }) {
  const { resolved, setPref } = useTheme();

  return (
    <div
      role="group"
      aria-label="Appearance"
      className={cn(
        "flex items-center rounded-lg bg-surface-2 p-1",
        compact ? "h-10" : "h-11 w-full",
        className,
      )}
    >
      <ThemeChoice
        label="Light"
        compact={compact}
        active={resolved === "light"}
        icon={Sun}
        onClick={() => setPref("light")}
      />
      <ThemeChoice
        label="Dark"
        compact={compact}
        active={resolved === "dark"}
        icon={Moon}
        onClick={() => setPref("dark")}
      />
    </div>
  );
}

function ThemeChoice({
  label,
  compact,
  active,
  icon: Icon,
  onClick,
}: {
  label: string;
  compact: boolean;
  active: boolean;
  icon: typeof Sun;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      onClick={onClick}
      className={cn(
        "flex h-full items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors duration-150",
        compact ? "size-8" : "min-h-9 flex-1",
        active ? "bg-accent text-accent-fg" : "text-muted hover:text-fg",
      )}
    >
      <Icon className="size-4 shrink-0" strokeWidth={1.75} />
      {compact ? <span className="sr-only">{label}</span> : <span>{label}</span>}
    </button>
  );
}

/** Settings: Light | Dark | System. */
export function ThemePicker() {
  const { pref, setPref } = useTheme();
  const options: { id: ThemePref; label: string; icon: typeof Sun }[] = [
    { id: "light", label: "Light", icon: Sun },
    { id: "dark", label: "Dark", icon: Moon },
    { id: "system", label: "System", icon: Monitor },
  ];
  return (
    <div className="grid grid-cols-3 gap-1 rounded-lg bg-bg p-1" role="group" aria-label="Appearance">
      {options.map((opt) => {
        const Icon = opt.icon;
        const active = pref === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => setPref(opt.id)}
            className={cn(
              "flex min-h-11 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors duration-150",
              active ? "bg-accent text-accent-fg" : "text-muted hover:text-fg",
            )}
          >
            <Icon className="size-3.5 shrink-0" strokeWidth={1.75} />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
