import { driver, type DriveStep, type Driver, type Side, type Alignment } from "driver.js";
import "driver.js/dist/driver.css";

interface TourStepConfig {
  selectors: string[];
  title: string;
  description: string;
  side?: Side;
  align?: Alignment;
}

const TOUR_STEPS: TourStepConfig[] = [
  {
    selectors: ['[data-tour="school-search"]'],
    title: "Search & filter items",
    description:
      "Search lost or found reports by name (Ctrl/Cmd + K) or open filters to narrow by report type, category, building, color, and date.",
    side: "bottom",
    align: "start",
  },
  {
    selectors: ['[data-tour="school-categories"]'],
    title: "Quick categories",
    description:
      "Filter the feed by item category in one click, or open More for the full category list.",
    side: "bottom",
    align: "start",
  },
  {
    selectors: ['[data-tour="school-feed"]'],
    title: "Browse campus reports",
    description:
      "Click any post to view full details, check Possible matches for your lost items, or submit a claim / found report. Found photos stay blurred until OSA verification.",
    side: "top",
    align: "center",
  },
  {
    selectors: ['[data-tour="nav-create"]', '[data-tour="mobile-nav-create"]'],
    title: "Post an item",
    description:
      "Lost something or found an unattended item on campus? Publish a report here with photos, building, and identifying details.",
    side: "right",
    align: "center",
  },
  {
    selectors: ['[data-tour="nav-claims"]', '[data-tour="mobile-nav-claims"]'],
    title: "Claims & Returned",
    description:
      "Track the status of your ownership claims and found reports, edit or delete pending requests, and review completed returns.",
    side: "right",
    align: "center",
  },
  {
    selectors: [
      '[data-tour="nav-notifications"]',
      '[data-tour="mobile-nav-notifications"]',
    ],
    title: "Live notifications",
    description:
      "Receive updates whenever OSA approves or rejects a claim, marks an item as ready for pickup, or confirms a return.",
    side: "right",
    align: "center",
  },
  {
    selectors: [
      '[data-tour="school-profile-menu"]',
      '[data-tour="mobile-nav-profile"]',
    ],
    title: "Profile & tutorial replay",
    description:
      "View your reports on Profile, toggle Dark mode, sign out, or replay this Tutorial tour anytime from your account menu.",
    side: "bottom",
    align: "end",
  },
];

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
