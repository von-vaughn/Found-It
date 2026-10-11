export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Open: "bg-neutral-100 text-neutral-700",
    Lost: "bg-red-50 text-red-700",
    Found: "bg-sky-50 text-sky-800",
    Claimed: "bg-blue-50 text-blue-800",
    Approved: "bg-blue-50 text-blue-800",
    "Under review": "bg-amber-50 text-amber-800",
    Returned: "bg-emerald-50 text-emerald-800",
    Pending: "bg-amber-50 text-amber-800",
    Rejected: "bg-neutral-100 text-neutral-500",
    Active: "bg-emerald-50 text-emerald-800",
    Inactive: "bg-neutral-100 text-neutral-500",
    school_user: "bg-neutral-100 text-neutral-700",
    admin: "bg-blue-50 text-blue-800",
    super_admin: "bg-neutral-900 text-white",
    "School user": "bg-neutral-100 text-neutral-700",
    Admin: "bg-blue-50 text-blue-800",
    "Super admin": "bg-neutral-900 text-white",
  };

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-semibold ${styles[status] ?? styles.Open}`}
    >
      {status}
    </span>
  );
}
