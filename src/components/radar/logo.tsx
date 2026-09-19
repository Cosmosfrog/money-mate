import { cn } from "@/lib/utils";

/** Polychromatic coin + rupee. Fills stay fixed so it reads on light and dark. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("size-8", className)}
      aria-hidden="true"
    >
      <circle cx="16" cy="16" r="15" fill="#16140f" />
      <circle cx="16" cy="16" r="12.55" fill="#b8862a" />
      <circle cx="16" cy="16" r="12.15" fill="#e2b13c" />
      <circle cx="16" cy="16" r="12.15" fill="none" stroke="#f6d56b" strokeWidth="1.05" />
      <path
        d="M8.4 12.2a8.4 8.4 0 0 1 7.4-5.3"
        fill="none"
        stroke="#fff1b8"
        strokeWidth="1.15"
        strokeLinecap="round"
        opacity="0.55"
      />
      <circle cx="16" cy="16" r="7.55" fill="#145a44" />
      <circle cx="16" cy="16" r="7.15" fill="#1c7a5c" />
      <path
        d="M12.05 10.55h8.15M12.05 14.15h6.35M12.05 10.35v12.2M12.05 14.15L20.05 22.2"
        fill="none"
        stroke="#f4fbf7"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="23.75" cy="8.85" r="2.7" fill="#9a3d1c" />
      <circle cx="23.75" cy="8.85" r="2.35" fill="#e06c3a" />
    </svg>
  );
}

export function BrandMark({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const box = size === "lg" ? "size-10" : size === "sm" ? "size-7" : "size-8";
  return (
    <span className={cn("flex shrink-0 items-center justify-center", box, className)}>
      <LogoMark className="size-full" />
    </span>
  );
}
