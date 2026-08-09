import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
  delay,
}: {
  className?: string;
  children: ReactNode;
  delay?: number;
}) {
  return (
    <section
      className={cn("glass fade-up rounded-lg p-5", className)}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </section>
  );
}

export function CardTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <h2 className="font-sans text-sm font-medium">{children}</h2>
      {right ? <div className="text-[10px] text-muted-foreground">{right}</div> : null}
    </div>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="mb-1 text-xs font-medium tracking-widest text-muted-foreground uppercase">
      {children}
    </p>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "accent" | "quiet" | "pill" | "danger" | "ghost";
  size?: "sm" | "md";
};

export function Button({ variant = "accent", size = "md", className, ...props }: ButtonProps) {
  const base = "press inline-flex items-center justify-center gap-2 font-medium disabled:opacity-50";
  const sizes = { sm: "text-xs px-3 py-2 rounded-sm", md: "text-sm px-4 py-3 rounded-md" };
  const variants = {
    accent: "bg-accent text-accent-foreground",
    quiet: "bg-secondary text-secondary-foreground",
    pill: "glass rounded-full text-foreground",
    danger: "bg-destructive text-destructive-foreground",
    ghost: "text-muted-foreground hover:text-foreground",
  };
  return (
    <button
      className={cn(base, sizes[size], variants[variant], variant === "pill" && "rounded-full", className)}
      {...props}
    />
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-md border border-input bg-background/40 px-3 py-3 text-sm outline-none placeholder:text-muted-foreground focus:border-accent/60",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full resize-none rounded-md border border-input bg-background/40 px-3 py-3 text-sm outline-none placeholder:text-muted-foreground focus:border-accent/60",
        className,
      )}
      {...props}
    />
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      {children}
    </label>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="press flex w-full items-center justify-between gap-4 py-3 text-left"
    >
      <span className="min-w-0">
        <span className="block text-sm">{label}</span>
        {hint ? <span className="block text-[11px] text-muted-foreground">{hint}</span> : null}
      </span>
      <span
        className={cn(
          "relative h-6 w-10 shrink-0 rounded-full transition-colors",
          checked ? "bg-accent" : "bg-input",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-background shadow-sm transition-all",
            checked ? "left-[1.125rem]" : "left-0.5",
          )}
        />
      </span>
    </button>
  );
}

export function Chip({
  active,
  children,
  onClick,
  className,
}: {
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "press rounded-full px-3 py-1.5 text-xs font-medium",
        active ? "bg-accent text-accent-foreground" : "bg-secondary text-secondary-foreground",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-xs text-muted-foreground">{children}</p>;
}

export function Avatar({
  name,
  photo,
  tone = "a",
  size = 40,
}: {
  name: string;
  photo?: string | null;
  tone?: "a" | "b";
  size?: number;
}) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full outline outline-offset-[-1px] outline-border",
        tone === "a" ? "bg-partner-a/20 text-partner-a" : "bg-partner-b/20 text-partner-b",
      )}
      style={{ width: size, height: size }}
    >
      {photo ? (
        <img src={photo} alt={name} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <span className="text-[10px] font-medium tracking-tight">{initials || "?"}</span>
      )}
    </span>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-100 flex items-end justify-center">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
      />
      <div className="glass-strong fade-up relative mx-3 mb-3 w-full max-w-[420px] rounded-xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-serif text-xl">{title}</h3>
          <button onClick={onClose} className="press text-xs text-muted-foreground">
            Close
          </button>
        </div>
        <div className="flex flex-col gap-3">{children}</div>
      </div>
    </div>
  );
}
