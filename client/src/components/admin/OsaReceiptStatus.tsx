export function OsaReceiptStatus({ received }: { received: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-1 text-[11px] font-semibold ${
        received
          ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-500 dark:text-emerald-50"
          : "bg-amber-100 text-amber-900 dark:bg-amber-500 dark:text-amber-50"
      }`}
    >
      {received ? "Received by OSA" : "Not Yet Received"}
    </span>
  );
}
