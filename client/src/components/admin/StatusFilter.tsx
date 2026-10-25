const DEFAULT_STATUS_OPTIONS = [
  "All",
  "Pending",
  "Approved",
  "Claimed",
  "Returned",
  "Rejected",
];

export function StatusFilter({
  value,
  onChange,
  options = DEFAULT_STATUS_OPTIONS,
}: {
  value: string;
  onChange: (value: string) => void;
  options?: string[];
}) {
  return (
    <label className="flex items-center gap-2 text-[11px] font-semibold text-neutral-600 dark:text-neutral-400">
      Status
      <select
        name="status"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="box-border h-9 w-36 shrink-0 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2.5 text-xs text-neutral-700 dark:text-neutral-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}
