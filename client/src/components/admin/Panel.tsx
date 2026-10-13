import type React from "react";

export function Panel({
  title,
  action,
  children,
  className = "",
  borderless = false,
  stickyHeader = false,
  titleSize = "default",
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
  stickyHeader?: boolean;
  titleSize?: "default" | "large";
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
      className={`min-w-0 bg-white dark:bg-neutral-900 ${borderless ? "" : "rounded-xl border border-neutral-200 dark:border-neutral-800"} ${className}`}
    >
      <div
        className={`flex min-h-14 items-center justify-between gap-3 px-4 sm:px-5 ${borderless ? "" : "border-b border-neutral-100 dark:border-neutral-800"} ${stickyHeader ? "sticky top-0 z-10 bg-white dark:bg-neutral-900" : ""}`}
      >
        <h2
          className={`min-w-0 truncate whitespace-nowrap font-bold text-neutral-900 dark:text-neutral-100 ${
            titleSize === "large" ? "text-lg" : "text-sm"
          }`}
        >
          {title}
        </h2>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}
