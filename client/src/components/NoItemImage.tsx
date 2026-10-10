import { ImageOff } from "lucide-react";
import { cn } from "cn";

export function NoItemImage({
  title,
  subtitle,
  compact = false,
  className = "",
  iconClassName = "h-5 w-5",
}: {
  title?: string;
  subtitle?: string;
  compact?: boolean;
  className?: string;
  iconClassName?: string;
}) {
  if (compact) {
    return (
      <span
        aria-hidden="true"
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg border border-dashed border-neutral-200 bg-neutral-50 text-neutral-400",
          className,
        )}
      >
        <ImageOff className={iconClassName} aria-hidden="true" />
      </span>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-neutral-200 bg-neutral-50 px-4 text-center",
        className,
      )}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
        <ImageOff className={iconClassName} aria-hidden="true" />
      </span>
      {title ? (
        <p className="text-xs font-medium text-neutral-500">{title}</p>
      ) : null}
      {subtitle ? (
        <p className="text-[10px] text-neutral-400">{subtitle}</p>
      ) : null}
    </div>
  );
}
