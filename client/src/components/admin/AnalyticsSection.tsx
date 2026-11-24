import { ArrowUpRight } from "lucide-react";
import { FadeIn } from "@/components/FadeIn";
import { StaggerGrid, StaggerItem } from "@/components/StaggerGridItem";
import { Panel } from "./Panel";
import { StatusBadge } from "./StatusBadge";
import type { AdminSection } from "./types";
import type { ClaimRequest } from "@/types/claim";

export function AnalyticsSection({
  claims,
  returnRequests,
  onNavigate,
}: {
  claims: ClaimRequest[];
  returnRequests: ClaimRequest[];
  onNavigate: (section: AdminSection | "returns") => void;
}) {
  return (
    <section aria-labelledby="analytics-heading" className="mt-5">
      <FadeIn delay={0.08}>
      <div className="mb-3">
        <h2
          id="analytics-heading"
          className="text-sm font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100"
        >
          Recent activity
        </h2>
      </div>
      </FadeIn>

      <StaggerGrid className="mt-3 grid min-w-0 items-stretch gap-3 lg:grid-cols-2">
        <StaggerItem className="flex h-full flex-col">
        <Panel
          title="Recent submitted claims"
          className="flex h-full flex-col"
          action={
            <button
              type="button"
              onClick={() => onNavigate("claims")}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
            >
              View claims
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          }
        >
          <ul className="flex flex-1 flex-col justify-center divide-y divide-neutral-100 dark:divide-neutral-800">
            {claims.slice(0, 4).map((claim) => (
              <li
                key={claim.id}
                className="flex items-center gap-3 px-4 py-3 sm:px-5"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                    {claim.item}
                  </span>
                  <span className="mt-0.5 block truncate text-[10px] text-neutral-500 dark:text-neutral-400">
                    {claim.claimant} · {claim.submitted}
                  </span>
                </span>
                <StatusBadge status={claim.status} />
              </li>
            ))}
            {claims.length === 0 && (
              <li className="px-4 py-6 text-center text-xs text-neutral-500 dark:text-neutral-400 sm:px-5">
                No submitted claims yet.
              </li>
            )}
          </ul>
        </Panel>
        </StaggerItem>

        <StaggerItem className="flex h-full flex-col">
        <Panel
          title="Recent return items"
          className="flex h-full flex-col"
          action={
            <button
              type="button"
              onClick={() => onNavigate("returns")}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
            >
              View returns
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          }
        >
          <ul className="flex flex-1 flex-col justify-center divide-y divide-neutral-100 dark:divide-neutral-800">
            {returnRequests
              .filter((request) => request.status === "Pending")
              .slice(0, 4)
              .map((request) => (
              <li
                key={request.id}
                className="flex items-center gap-3 px-4 py-3 sm:px-5"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                    {request.claimantTitle || request.item}
                  </span>
                  <span className="mt-0.5 block truncate text-[10px] text-neutral-500 dark:text-neutral-400">
                    {request.claimant} · {request.submitted}
                  </span>
                </span>
                <StatusBadge status={request.status} />
              </li>
            ))}
            {returnRequests.every(
              (request) => request.status !== "Pending",
            ) && (
              <li className="px-4 py-6 text-center text-xs text-neutral-500 dark:text-neutral-400 sm:px-5">
                No pending return items.
              </li>
            )}
          </ul>
        </Panel>
        </StaggerItem>
      </StaggerGrid>
    </section>
  );
}

export default AnalyticsSection;
