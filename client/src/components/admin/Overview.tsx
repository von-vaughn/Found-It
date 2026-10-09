import {
  ArrowUpRight,
  BadgeCheck,
  PackageCheck,
  PackageSearch,
} from "lucide-react";
import { Panel } from "./Panel";
import { ItemTable } from "./ItemTable";
import { adminReports, activityHistory, claims } from "./adminData";
import type { AdminReport, AdminSection } from "./types";

export function Overview({
  onNavigate,
  onViewReport,
  onSelectClaim,
}: {
  onNavigate: (section: AdminSection) => void;
  onViewReport: (report: AdminReport) => void;
  onSelectClaim: (id: string) => void;
}) {
  const lostCount = adminReports.filter((item) => item.type === "Lost").length;
  const foundCount = adminReports.filter(
    (item) => item.type === "Found",
  ).length;
  const pendingCount = claims.length;
  const metrics = [
    {
      label: "Lost reports",
      value: lostCount,
      note: "Across all statuses",
      icon: PackageSearch,
      section: "items" as const,
    },
    {
      label: "Found reports",
      value: foundCount,
      note: "Reports on file",
      icon: PackageCheck,
      section: "items" as const,
    },
    {
      label: "Claims to review",
      value: pendingCount,
      note: "Ownership requests",
      icon: BadgeCheck,
      section: "claims" as const,
    },
  ];
  const recentRows = [...adminReports]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  return (
    <>
      <section
        aria-label="Report totals"
        className="grid grid-cols-2 overflow-hidden rounded-xl border border-neutral-200 bg-white xl:grid-cols-3"
      >
        {metrics.map(({ label, value, note, icon: Icon, section }) => (
          <button
            key={label}
            type="button"
            onClick={() => onNavigate(section)}
            className="group flex min-w-0 items-center gap-3 border-b border-neutral-100 p-3 text-left transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#E5192D] last:border-b-0 [&:nth-child(odd)]:border-r xl:border-b-0 xl:border-r xl:p-4 xl:last:border-r-0"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-50 text-neutral-600 group-hover:bg-white">
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="flex items-baseline gap-2">
                <span className="text-lg font-extrabold tabular-nums tracking-tight text-neutral-900">
                  {value}
                </span>
                <span className="truncate text-[10px] font-semibold text-neutral-600 sm:text-[11px]">
                  {label}
                </span>
              </span>
              <span className="mt-0.5 block truncate text-[10px] text-neutral-500">
                {note}
              </span>
            </span>
          </button>
        ))}
      </section>

      <div className="mt-5 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.9fr)]">
        <Panel
          title="Recent reports"
          action={
            <button
              type="button"
              onClick={() => onNavigate("items")}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-600 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
            >
              View reports
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          }
        >
          <ItemTable rows={recentRows} onViewDetails={onViewReport} />
        </Panel>

        <div className="flex min-w-0 flex-col gap-5">
          <Panel
            title="Pending actions"
            action={
              <span className="rounded-md bg-red-50 px-2 py-1 text-[10px] font-bold text-red-700">
                {claims.length}
              </span>
            }
          >
            <div className="divide-y divide-neutral-100">
              {claims.slice(0, 2).map((claim) => (
                <button
                  key={claim.id}
                  type="button"
                  onClick={() => onSelectClaim(claim.id)}
                  className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#E5192D]"
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                    <BadgeCheck className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-neutral-800">
                      Verify {claim.item} claim
                    </span>
                    <span className="mt-1 block text-[10px] text-neutral-500">
                      {claim.claimant} · {claim.submitted}
                    </span>
                  </span>
                  <ArrowUpRight
                    className="mt-1 h-3.5 w-3.5 shrink-0 text-neutral-400"
                    aria-hidden="true"
                  />
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="Recent activity">
            <ol className="space-y-4 px-4 py-4">
              {activityHistory
                .slice(0, 3)
                .map(({ id, title, detail, time, icon: Icon }) => (
                  <li key={id} className="flex gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-neutral-800">
                        {title}
                      </p>
                      <p className="mt-0.5 text-[10px] leading-relaxed text-neutral-500">
                        {detail}
                      </p>
                      <time className="mt-1 block text-[10px] text-neutral-400">
                        {time}
                      </time>
                    </div>
                  </li>
                ))}
            </ol>
          </Panel>
        </div>
      </div>
    </>
  );
}
