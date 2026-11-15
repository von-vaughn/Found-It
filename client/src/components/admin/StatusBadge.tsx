export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Open: "bg-neutral-200 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-100",
    Lost: "bg-orange-100 text-orange-900 dark:bg-orange-500 dark:text-orange-50",
    Found: "bg-sky-100 text-sky-900 dark:bg-sky-500 dark:text-sky-50",
    Claimed: "bg-blue-100 text-blue-900 dark:bg-blue-500 dark:text-blue-50",
    Approved: "bg-emerald-100 text-emerald-900 dark:bg-emerald-500 dark:text-emerald-50",
    Returned: "bg-teal-100 text-teal-900 dark:bg-teal-500 dark:text-teal-50",
    Pending: "bg-amber-100 text-amber-900 dark:bg-amber-500 dark:text-amber-50",
    Rejected: "bg-rose-100 text-rose-900 dark:bg-rose-500 dark:text-rose-50",
    Deleted: "bg-rose-100 text-rose-900 dark:bg-rose-500 dark:text-rose-50",
    Flagged: "bg-amber-100 text-amber-900 dark:bg-amber-500 dark:text-amber-50",
    Active: "bg-lime-100 text-lime-900 dark:bg-lime-500 dark:text-lime-50",
    Inactive: "bg-stone-200 text-stone-800 dark:bg-stone-700 dark:text-stone-100",
    school_user: "bg-neutral-200 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-100",
    admin: "bg-blue-100 text-blue-900 dark:bg-blue-500 dark:text-blue-50",
    super_admin: "bg-neutral-900 text-white dark:bg-neutral-800 dark:text-white",
    "School user": "bg-neutral-200 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-100",
    Staff: "bg-blue-100 text-blue-900 dark:bg-blue-500 dark:text-blue-50",
    Admin: "bg-neutral-900 text-white dark:bg-neutral-800 dark:text-white",
  };

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-semibold ${styles[status] ?? styles.Open}`}
    >
      {status}
    </span>
  );
}
