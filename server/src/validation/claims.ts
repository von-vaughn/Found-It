import { z } from "zod";
import { pastOrTodayDateSchema } from "./dates";

const claimTimeSchema = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be HH:MM");

export const createClaimSchema = z.object({
  itemId: z.string().uuid("itemId must be a UUID"),
  claimantTitle: z.string().trim().min(1, "What is it? is required").max(100),
  color: z.string().trim().min(1).max(50).optional(),
  building: z.string().trim().min(1).max(100).optional(),
  dateLost: pastOrTodayDateSchema,
  timeLost: claimTimeSchema,
  location: z.string().trim().min(1, "Location lost is required").max(500),
  details: z.string().trim().max(2000).default(""),
  importantDetails: z.string().trim().min(1, "Important details are required").max(2000),
  evidence: z.array(z.string().url("Evidence must be an image URL").max(2048)).max(4).optional(),
});

export const updateClaimSchema = createClaimSchema.omit({ itemId: true });

export const createWalkInClaimSchema = z.discriminatedUnion("mode", [
  z.object({
    itemId: z.string().uuid("itemId must be a UUID"),
    mode: z.literal("account"),
    userId: z.string().uuid("Select a valid school user account"),
    notes: z.string().trim().max(500, "Notes must be at most 500 characters").optional(),
  }),
  z.object({
    itemId: z.string().uuid("itemId must be a UUID"),
    mode: z.literal("guest"),
    fullName: z.string().trim().min(2, "Full name is required").max(120),
    schoolId: z.string().trim().min(2, "School ID is required").max(30),
    contact: z.string().trim().max(120, "Contact must be at most 120 characters").optional(),
    notes: z.string().trim().max(500, "Notes must be at most 500 characters").optional(),
  }),
]);

export type CreateClaimInput = z.infer<typeof createClaimSchema>;
export type UpdateClaimInput = z.infer<typeof updateClaimSchema>;
export type CreateWalkInClaimInput = z.infer<typeof createWalkInClaimSchema>;
