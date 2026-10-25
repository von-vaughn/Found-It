export function OsaReceiptStatus({ received }: { received: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-1 text-[11px] font-semibold ${
        received
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
          : "bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300"
      }`}
    >
      {received ? "Received by OSA" : "Not Yet Received"}
    </span>
  );
}
