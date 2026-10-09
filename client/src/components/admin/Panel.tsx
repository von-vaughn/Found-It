import type React from "react";

export function Panel({
  title,
  action,
  children,
  className = "",
  borderless = false,
  onMouseEnter,
  onMouseLeave,
  onFocusCapture,
  onBlurCapture,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  borderless?: boolean;
  onMouseEnter?: React.MouseEventHandler<HTMLElement>;
  onMouseLeave?: React.MouseEventHandler<HTMLElement>;
  onFocusCapture?: React.FocusEventHandler<HTMLElement>;
  onBlurCapture?: React.FocusEventHandler<HTMLElement>;
}) {
  return (
    <section
      aria-label={title}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onFocusCapture={onFocusCapture}
      onBlurCapture={onBlurCapture}
      className={`min-w-0 bg-white ${borderless ? "" : "rounded-xl border border-neutral-200"} ${className}`}
    >
      <div
        className={`flex min-h-14 items-center justify-between gap-3 px-4 sm:px-5 ${borderless ? "" : "border-b border-neutral-100"}`}
      >
        <h2 className="text-sm font-bold text-neutral-900">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
