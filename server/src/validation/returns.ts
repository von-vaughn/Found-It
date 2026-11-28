import { z } from "zod";
import type { ReportType } from "../types/items";
import { pastOrTodayDateSchema } from "./dates";

const returnTimeSchema = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be HH:MM");

const walkInReturnItemFields = {
  claimantTitle: z.string().trim().min(1, "What is it? is required").max(100),
  color: z.string().trim().min(1).max(50).optional(),
  building: z.string().trim().min(1).max(100).optional(),
  dateLost: pastOrTodayDateSchema,
  timeLost: returnTimeSchema,
  location: z.string().trim().min(1, "Location found is required").max(500),
  details: z.string().trim().max(2000).default(""),
  importantDetails: z
    .string()
    .trim()
    .min(1, "Important details are required")
    .max(2000),
  evidence: z
    .array(z.string().url("Evidence must be an image URL").max(2048))
    .max(4)
    .optional(),
  approvalInstructions: z
    .string()
    .trim()
    .min(1, "Pickup instructions are required")
    .max(500, "Pickup instructions must be at most 500 characters"),
};

export const createWalkInReturnSchema = z.discriminatedUnion("mode", [
  z.object({
    itemId: z.string().uuid("itemId must be a UUID"),
    mode: z.literal("account"),
    userId: z.string().uuid("Select a valid school user account"),
    ...walkInReturnItemFields,
  }),
  z.object({
    itemId: z.string().uuid("itemId must be a UUID"),
    mode: z.literal("guest"),
    fullName: z.string().trim().min(2, "Full name is required").max(120),
    schoolId: z
      .string()
      .trim()
      .min(2, "School ID is required")
      .max(30, "School ID must be at most 30 characters"),
    email: z
      .string()
      .trim()
      .email("Enter a valid email address")
      .max(120, "Email must be at most 120 characters")
      .optional(),
    ...walkInReturnItemFields,
  }),
]);

export type CreateWalkInReturnInput = z.infer<typeof createWalkInReturnSchema>;

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
