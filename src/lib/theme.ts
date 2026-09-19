export type ThemePref = "light" | "dark" | "system";

export const THEME_KEY = "mm-theme";
export const THEME_LIGHT = "#f3f1eb";
export const THEME_DARK = "#0c0d0f";

export function readThemePref(): ThemePref {
  if (typeof window === "undefined") return "system";
  try {
    const raw = window.localStorage.getItem(THEME_KEY);
    if (raw === "light" || raw === "dark" || raw === "system") return raw;
  } catch {
    /* ignore */
  }
  return "system";
}

export function resolveTheme(pref: ThemePref): "light" | "dark" {
  if (pref === "light" || pref === "dark") return pref;
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(pref: ThemePref) {
  if (typeof document === "undefined") return;
  const resolved = resolveTheme(pref);
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", resolved === "light" ? THEME_LIGHT : THEME_DARK);
}

export const THEME_BOOT = `(function(){try{var t=localStorage.getItem("${THEME_KEY}")||"system";var d=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=d?"dark":"light";var e=document.documentElement;e.dataset.theme=r;e.style.colorScheme=r;var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",r==="light"?"${THEME_LIGHT}":"${THEME_DARK}");}catch(err){document.documentElement.dataset.theme="dark";document.documentElement.style.colorScheme="dark";}})();`;
