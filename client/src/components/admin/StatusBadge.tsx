export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Open: "bg-neutral-100 text-neutral-700",
    Lost: "bg-red-50 text-red-700",
    Found: "bg-sky-50 text-sky-800",
    Claimed: "bg-blue-50 text-blue-800",
    "Under review": "bg-amber-50 text-amber-800",
    Returned: "bg-emerald-50 text-emerald-800",
    Pending: "bg-red-50 text-red-700",
  };

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-semibold ${styles[status] ?? styles.Open}`}
    >
      {status}
    </span>
  );
}
