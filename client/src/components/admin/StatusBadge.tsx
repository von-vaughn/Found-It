export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Open: "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300",
    Lost: "bg-orange-50 dark:bg-orange-500/10 text-orange-800 dark:text-orange-400",
    Found: "bg-sky-50 dark:bg-sky-500/10 text-sky-800 dark:text-sky-400",
    Claimed: "bg-blue-50 dark:bg-blue-500/10 text-blue-800 dark:text-blue-400",
    Approved: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400",
    Unreturned: "bg-cyan-50 dark:bg-cyan-500/10 text-cyan-800 dark:text-cyan-400",
    "Under review": "bg-violet-50 dark:bg-violet-500/10 text-violet-800 dark:text-violet-400",
    Returned: "bg-teal-50 dark:bg-teal-500/10 text-teal-800 dark:text-teal-400",
    Pending: "bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-400",
    Rejected: "bg-rose-50 dark:bg-rose-500/10 text-rose-800 dark:text-rose-400",
    Active: "bg-lime-50 dark:bg-lime-500/10 text-lime-800 dark:text-lime-400",
    Inactive: "bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300",
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
