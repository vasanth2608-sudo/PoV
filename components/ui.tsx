import { ReactNode } from "react";

export function Shell({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-neutral-950 text-white">{children}</div>;
}

export function Container({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">{children}</div>;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-3xl border border-white/10 bg-neutral-900/70 shadow-xl ${className}`}>{children}</div>;
}

export function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; variant?: "primary" | "secondary" | "ghost" }) {
  const { className = "", variant = "primary", children, ...rest } = props;
  const base = "inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50";
  const styles =
    variant === "primary"
      ? "bg-white text-black hover:bg-neutral-200"
      : variant === "secondary"
      ? "border border-white/10 bg-white/5 text-white hover:bg-white/10"
      : "text-neutral-300 hover:bg-white/5";
  return (
    <button className={`${base} ${styles} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none placeholder:text-neutral-500 ${props.className || ""}`} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`min-h-28 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-neutral-500 ${props.className || ""}`} />;
}

export function Badge({ children }: { children: ReactNode }) {
  return <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">{children}</span>;
}
