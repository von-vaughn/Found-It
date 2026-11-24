import {
  driver,
  type Alignment,
  type DriveStep,
  type Driver,
  type Side,
} from "driver.js";
import "driver.js/dist/driver.css";

interface TourStepConfig {
  selectors: string[];
  title: string;
  description: string;
  side?: Side;
  align?: Alignment;
  popoverClass?: string;
}

const TOUR_STEPS: TourStepConfig[] = [
  {
    selectors: ['[data-tour="school-search"]'],
    title: "Search & filters",
    description:
      "Search by name (Ctrl/Cmd + K) or filter by building, color, and date.",
    side: "bottom",
    align: "start",
  },
  {
    selectors: ['[data-tour="school-categories"]'],
    title: "Categories",
    description: "Filter items by category in one click.",
    side: "bottom",
    align: "start",
  },
  {
    selectors: ['[data-tour="school-feed-highlight"]', '[data-tour="school-feed"]'],
    title: "Campus feed",
    description:
      "Open any post to view details, possible matches, or submit a claim.",
    side: "left",
    align: "center",
    popoverClass: "foundit-tour-popover foundit-tour-popover-compact-left",
  },
  {
    selectors: ['[data-tour="nav-create"]', '[data-tour="mobile-nav-create"]'],
    title: "Post item",
    description: "Report a lost or found item on campus.",
    side: "right",
    align: "center",
  },
  {
    selectors: ['[data-tour="nav-claims"]', '[data-tour="mobile-nav-claims"]'],
    title: "Claims & Returned",
    description: "Track, edit, or cancel your claims and found reports.",
    side: "right",
    align: "center",
  },
  {
    selectors: [
      '[data-tour="nav-notifications"]',
      '[data-tour="mobile-nav-notifications"]',
    ],
    title: "Notifications",
    description: "Get updates on approvals, rejections, and OSA pickups.",
    side: "right",
    align: "center",
  },
  {
    selectors: [
      '[data-tour="school-profile-menu"]',
      '[data-tour="mobile-nav-profile"]',
    ],
    title: "Account menu",
    description: "Open Profile, toggle Dark mode, or replay this tour anytime.",
    side: "right",
    align: "end",
  },
];

function syncFeedHighlightRows(maxRows = 2): void {
  const feed = document.querySelector<HTMLElement>('[data-tour="school-feed"]');
  const highlight = document.querySelector<HTMLElement>(
    '[data-tour="school-feed-highlight"]',
  );
  if (!feed || !highlight) return;

  highlight.style.left = "0px";
  highlight.style.width = "100%";

  const cards = Array.from(feed.querySelectorAll<HTMLElement>(".grid > *"));
  if (cards.length === 0) {
    highlight.style.height = `${feed.clientHeight}px`;
    return;
  }

  const rowKeys = new Set<number>();
  let maxBottom = 0;
  for (const card of cards) {
    const rowKey = Math.round(card.offsetTop / 16);
    if (!rowKeys.has(rowKey)) {
      if (rowKeys.size >= maxRows) break;
      rowKeys.add(rowKey);
    }
    maxBottom = Math.max(maxBottom, card.offsetTop + card.offsetHeight);
  }
  highlight.style.height = `${maxBottom}px`;
}

function findVisibleElement(selectors: string[]): Element | undefined {
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (!element) continue;
    const style = window.getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden") continue;
    const rect = element.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) return element;
  }
  return undefined;
}

export interface StartTourOptions {
  onComplete?: () => void;
}

export function startSchoolUserTour(options?: StartTourOptions): Driver | null {
  syncFeedHighlightRows(2);
  const isMobile = window.matchMedia("(max-width: 767px)").matches;
  const steps: DriveStep[] = [];

  for (const step of TOUR_STEPS) {
    const target = findVisibleElement(step.selectors);
    if (!target) continue;
    steps.push({
      element: target,
      popover: {
        title: step.title,
        description: step.description,
        side: isMobile ? undefined : step.side,
        align: isMobile ? "center" : step.align,
        popoverClass: !isMobile ? step.popoverClass : undefined,
      },
    });
  }

  if (steps.length === 0) return null;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const tour = driver({
    steps,
    animate: !reduceMotion,
    smoothScroll: !reduceMotion,
    allowClose: true,
    showProgress: true,
    progressText: "{{current}} of {{total}}",
    nextBtnText: "Next",
    prevBtnText: "Back",
    doneBtnText: "Done",
    popoverClass: "foundit-tour-popover",
    stagePadding: 6,
    stageRadius: 12,
    onDestroyed: (_el, _step, opts) => {
      if (opts.reason !== "api") {
        options?.onComplete?.();
      }
    },
  });

  tour.drive();
  return tour;
}
