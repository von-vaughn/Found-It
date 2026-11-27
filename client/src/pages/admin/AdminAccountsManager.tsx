/* eslint-disable react-refresh/only-export-components -- shared modal + roleLabel helper live together */
import { useEffect } from "react";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { AdminUserRole } from "@/components/admin/types";
import type { CreateAdminUserPayload } from "@/services/adminUserService";

const createAdminSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100)
    .refine((name) => {
      const [firstName, ...lastNameParts] = name.split(/\s+/);
      return (
        firstName.length <= 50 &&
        (lastNameParts.join(" ") || firstName).length <= 50
      );
    }, "Each part of the name must be at most 50 characters"),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128)
    .refine(
      (password) => new TextEncoder().encode(password).length <= 72,
      "Password cannot exceed 72 bytes",
    ),
  role: z.enum(["staff", "admin"]),
});

export type CreateAdminValues = z.infer<typeof createAdminSchema>;

export function roleLabel(role: AdminUserRole): string {
  if (role === "admin") return "Admin";
  if (role === "staff") return "Staff";
  return "School user";
}

interface CreateAccountModalProps {
  open: boolean;
  defaultRole: "staff" | "admin";
  existingEmails: string[];
  onClose: () => void;
  onCreateAccount: (values: CreateAdminUserPayload) => Promise<void>;
}

export function CreateAccountModal({
  open,
  defaultRole,
  existingEmails,
  onClose,
  onCreateAccount,
}: CreateAccountModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateAdminValues>({
    defaultValues: { name: "", email: "", password: "", role: defaultRole },
  });

  useEffect(() => {
    if (open) {
      reset({ name: "", email: "", password: "", role: defaultRole });
    }
  }, [open, defaultRole, reset]);

  if (!open) return null;

  const onCreate = async (rawValues: CreateAdminValues) => {
    setError("root.server", { message: "" });
    const parsed = createAdminSchema.safeParse(rawValues);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      const field = String(first.path[0] ?? "name") as keyof CreateAdminValues;
      setError(field, { message: first.message });
      return;
    }
    const values = parsed.data;
    if (
      existingEmails.some(
        (email) => email.toLowerCase() === values.email.toLowerCase(),
      )
    ) {
      setError("email", {
        message: "An account with this email already exists.",
      });
      return;
    }
    try {
      await onCreateAccount({
        ...values,
        name: values.name.trim(),
        email: values.email.trim().toLowerCase(),
      });
      toast.success(
        `${values.name} created as ${roleLabel(values.role).toLowerCase()}.`,
      );
      reset();
      onClose();
    } catch (error) {
      const responseData = (
        error as {
          response?: {
            data?: {
              message?: string;
              errors?: Array<{ field?: string; message?: string }>;
            };
          };
        }
      )?.response?.data;
      for (const fieldError of responseData?.errors ?? []) {
        if (
          (fieldError.field === "name" ||
            fieldError.field === "email" ||
            fieldError.field === "password" ||
            fieldError.field === "role") &&
          fieldError.message
        ) {
          setError(fieldError.field, { message: fieldError.message });
        }
      }
      if (responseData?.message?.toLowerCase().includes("already exists")) {
        setError("email", { message: responseData.message });
      }
      setError("root.server", {
        message:
          responseData?.message &&
          responseData.message !== "Validation failed."
            ? responseData.message
            : responseData?.errors?.length
              ? "Check the account details and try again."
              : "We couldn't create this account. Please try again.",
      });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-neutral-950/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <form
        onSubmit={handleSubmit(onCreate)}
        className="w-full max-w-md rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 shadow-xl"
      >
        <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
          Create staff or admin account
        </h2>
        <div className="mt-4 space-y-3">
          {errors.root?.server?.message && (
            <p className="text-xs text-red-600" role="alert">
              {errors.root.server.message}
            </p>
          )}
          <div>
            <label
              htmlFor="staff-name"
              className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300"
            >
              Full Name
            </label>
            <input
              id="staff-name"
              type="text"
              autoComplete="name"
              placeholder="e.g. OSA Officer"
              {...register("name")}
              className="h-10 w-full rounded-lg border border-neutral-200 dark:border-neutral-800 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
              disabled={isSubmitting}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
            )}
          </div>
          <div>
            <label
              htmlFor="staff-email"
              className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300"
            >
              Email
            </label>
            <input
              id="staff-email"
              type="email"
              autoComplete="email"
              placeholder="admin@wmsu.edu.ph"
              {...register("email")}
              className="h-10 w-full rounded-lg border border-neutral-200 dark:border-neutral-800 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
              disabled={isSubmitting}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="staff-password"
                className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300"
              >
                Password
              </label>
              <input
                id="staff-password"
                type="password"
                autoComplete="new-password"
                placeholder="Min. 8 characters"
                {...register("password")}
                className="h-10 w-full rounded-lg border border-neutral-200 dark:border-neutral-800 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
                disabled={isSubmitting}
              />
              {errors.password && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.password.message}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="staff-role"
                className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300"
              >
                Role
              </label>
              <select
                id="staff-role"
                {...register("role")}
                className="h-10 w-full rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
                disabled={isSubmitting}
              >
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => {
              reset();
              onClose();
            }}
            className="h-9 rounded-lg border border-neutral-200 dark:border-neutral-800 px-3.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="h-9 rounded-lg bg-[#E5192D] px-3.5 text-xs font-semibold text-white transition-colors hover:bg-[#c81424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2 disabled:opacity-50"
          >
            {isSubmitting ? "Creating…" : "Create account"}
          </button>
        </div>
      </form>
    </div>
  );
}
