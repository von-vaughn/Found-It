export function StatusFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
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
        <option>All statuses</option>
        <option>Pending</option>
        <option>Approved</option>
        <option>Claimed</option>
        <option>Returned</option>
        <option>Rejected</option>
      </select>
    </label>
  );
}
