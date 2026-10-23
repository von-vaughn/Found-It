import type { ReportType } from "../types/items";

interface ReturnTarget {
  reporterId: string;
  reportType: ReportType;
}

export interface ReturnTargetError {
  status: 400 | 404;
  message: string;
}

/** Guards a found report before it is saved as a return request. */
export function validateReturnTarget(
  item: ReturnTarget | null,
  userId: string,
): ReturnTargetError | null {
  if (!item) {
    return { status: 404, message: "Item not found." };
  }
  if (item.reportType !== "lost") {
    return {
      status: 400,
      message: "Found reports can only be filed on lost items.",
    };
  }
  if (item.reporterId === userId) {
    return {
      status: 400,
      message: "You cannot submit a found report for your own lost item.",
    };
  }
  return null;
}
