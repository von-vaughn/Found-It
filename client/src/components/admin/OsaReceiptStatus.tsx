export function OsaReceiptStatus({ received }: { received: boolean }) {
  if (!received) {
    return (
      <span className="whitespace-nowrap text-[11px] text-muted-foreground">
        Not Yet Received
      </span>
    );
  }

  return (
    <span className="whitespace-nowrap text-[11px] text-emerald-700 dark:text-emerald-400">
      Received by OSA
    </span>
  );
}
