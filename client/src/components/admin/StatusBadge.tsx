export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Open: "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300",
    Lost: "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400",
    Found: "bg-sky-50 dark:bg-sky-500/10 text-sky-800 dark:text-sky-400",
    Claimed: "bg-blue-50 dark:bg-blue-500/10 text-blue-800 dark:text-blue-400",
    Approved: "bg-blue-50 dark:bg-blue-500/10 text-blue-800 dark:text-blue-400",
    "Under review": "bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-400",
    Returned: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400",
    Pending: "bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-400",
    Rejected: "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400",
    Active: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400",
    Inactive: "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400",
    school_user: "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300",
    admin: "bg-blue-50 dark:bg-blue-500/10 text-blue-800 dark:text-blue-400",
    super_admin: "bg-neutral-900 dark:bg-neutral-100 dark:bg-neutral-800 text-white dark:text-neutral-900 dark:text-neutral-100",
    "School user": "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300",
    Admin: "bg-blue-50 dark:bg-blue-500/10 text-blue-800 dark:text-blue-400",
    "Super admin": "bg-neutral-900 dark:bg-neutral-100 dark:bg-neutral-800 text-white dark:text-neutral-900 dark:text-neutral-100",
  };

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-semibold ${styles[status] ?? styles.Open}`}
    >
      {status}
    </span>
  );
}
