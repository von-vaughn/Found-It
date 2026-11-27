export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Open: "bg-neutral-600 text-white",
    Lost: "bg-orange-500 text-white",
    Found: "bg-sky-500 text-white",
    Claimed: "bg-blue-600 text-white",
    Approved: "bg-emerald-600 text-white",
    Returned: "bg-teal-600 text-white",
    Pending: "bg-amber-500 text-white",
    Rejected: "bg-rose-600 text-white",
    Deleted: "bg-rose-600 text-white",
    Flagged: "bg-amber-500 text-white",
    Active: "bg-lime-600 text-white",
    Inactive: "bg-stone-500 text-white",
    school_user: "bg-neutral-600 text-white",
    staff: "bg-blue-600 text-white",
    admin: "bg-neutral-900 text-white dark:bg-neutral-800",
    "School user": "bg-neutral-600 text-white",
    Staff: "bg-blue-600 text-white",
    Admin: "bg-neutral-900 text-white dark:bg-neutral-800",
  };

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-semibold ${styles[status] ?? styles.Open}`}
    >
      {status}
    </span>
  );
}
