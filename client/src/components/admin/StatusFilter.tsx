const DEFAULT_STATUS_OPTIONS = [
  "All statuses",
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
    <label className="flex items-center gap-2 text-[11px] font-semibold text-neutral-600">
      Status
      <select
        name="status"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 rounded-md border border-neutral-200 bg-white px-2.5 text-xs text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}
