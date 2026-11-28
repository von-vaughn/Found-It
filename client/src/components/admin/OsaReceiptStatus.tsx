export function OsaReceiptStatus({ received }: { received: boolean }) {
  if (!received) {
    return (
      <span className="whitespace-nowrap text-xs text-neutral-500 dark:text-neutral-400">
        Not yet received
      </span>
    );
  }

  return (
    <span className="whitespace-nowrap text-xs font-medium text-emerald-700 dark:text-emerald-400">
      Received by OSA
    </span>
  );
}
