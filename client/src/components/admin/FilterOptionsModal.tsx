import { useEffect, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import { Panel } from "@/components/admin/Panel";
import {
  formatCategoryLabel,
  useCategories,
  useCreateCategory,
  useDeleteCategory,
} from "@/hooks/useCategories";
import {
  useBuildings,
  useCreateBuilding,
  useDeleteBuilding,
} from "@/hooks/useBuildings";

type OptionKind = "category" | "building";

function OptionList({
  values,
  itemLabel,
  onRemove,
  isRemoving,
}: {
  values: string[];
  itemLabel: string;
  onRemove?: (value: string) => void;
  isRemoving?: boolean;
}) {
  return (
    <div className="h-64 overflow-y-auto sm:h-72">
      {values.length === 0 ? (
        <p className="flex h-full items-center justify-center px-4 text-center text-xs text-neutral-500 dark:text-neutral-400">
          No options available.
        </p>
      ) : (
        <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {values.map((value) => (
            <li
              key={value}
              className="flex items-center justify-between gap-3 px-4 py-2.5 sm:px-5"
            >
              <span className="min-w-0 break-words text-xs font-medium text-neutral-800 dark:text-neutral-200">
                {value}
              </span>
              <div className="flex shrink-0 items-center gap-2">
                {onRemove && (
                  <button
                    type="button"
                    aria-label={`Remove ${value} ${itemLabel}`}
                    title={`Remove ${value}`}
                    disabled={isRemoving}
                    onClick={() => onRemove(value)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-700 transition-colors hover:bg-red-50 hover:text-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] disabled:cursor-wait disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950/30 dark:hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AddOptionForm({
  kind,
  isSubmitting,
  onAdd,
}: {
  kind: OptionKind;
  isSubmitting?: boolean;
  onAdd: (value: string) => Promise<string | null>;
}) {
  const [value, setValue] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const label = kind === "category" ? "category" : "building";
  const inputId = `modal-new-${kind}`;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedValue = value.trim();
    if (!trimmedValue) {
      setIsError(true);
      setMessage(`Enter a ${label} name before adding it.`);
      return;
    }
    const errorMessage = await onAdd(trimmedValue);
    if (errorMessage) {
      setIsError(true);
      setMessage(errorMessage);
      return;
    }
    setValue("");
    setIsError(false);
    setMessage(`${trimmedValue} added.`);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="border-b border-neutral-100 px-4 py-3.5 dark:border-neutral-800 sm:px-5"
    >
      <label
        htmlFor={inputId}
        className="mb-1.5 block text-xs font-semibold text-neutral-700 dark:text-neutral-300"
      >
        New {label}
      </label>
      <div className="flex min-w-0 items-center gap-2">
        <input
          id={inputId}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setIsError(false);
            setMessage("");
          }}
          maxLength={80}
          placeholder={`Enter a ${label} name`}
          className="h-9 min-w-0 flex-1 rounded-lg border border-neutral-200 bg-neutral-50 px-3 text-xs text-neutral-900 placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100 dark:placeholder:text-neutral-400"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-[#E5192D] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#c81424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Add {label}
        </button>
      </div>
      <div className="min-h-4">
        <p
          aria-live="polite"
          className={`mt-1.5 text-[11px] ${
            isError
              ? "text-red-700 dark:text-red-400"
              : "text-emerald-700 dark:text-emerald-400"
          }`}
        >
          {message}
        </p>
      </div>
    </form>
  );
}

interface FilterOptionsModalProps {
  open: boolean;
  onClose: () => void;
}

export function FilterOptionsModal({ open, onClose }: FilterOptionsModalProps) {
  const queryClient = useQueryClient();
  const categoriesQuery = useCategories();
  const buildingsQuery = useBuildings();
  const createCategoryMutation = useCreateCategory();
  const createBuildingMutation = useCreateBuilding();
  const deleteCategoryMutation = useDeleteCategory();
  const deleteBuildingMutation = useDeleteBuilding();

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  const [pendingRemoval, setPendingRemoval] = useState<{
    kind: "category" | "building";
    id: string;
    label: string;
  } | null>(null);

  if (!open) return null;

  const categoryRecords = categoriesQuery.data ?? [];
  const categoryNames = categoryRecords.map((category) =>
    formatCategoryLabel(category.name),
  );
  const buildingRecords = buildingsQuery.data ?? [];
  const buildingNames = buildingRecords.map((building) => building.name);

  const extractErrorMessage = (error: unknown, fallback: string) =>
    (error as { response?: { data?: { message?: string } } })?.response?.data
      ?.message ?? fallback;

  const addCategory = async (value: string): Promise<string | null> => {
    try {
      await createCategoryMutation.mutateAsync(value);
      toast.success(`${value} category added.`);
      return null;
    } catch (error) {
      return extractErrorMessage(
        error,
        "We couldn't add this category. Please try again.",
      );
    }
  };

  const removeCategory = (value: string) => {
    const category = categoryRecords.find(
      (entry) => formatCategoryLabel(entry.name) === value,
    );
    if (!category) {
      toast.error("That category could not be found. Refresh and try again.");
      return;
    }
    setPendingRemoval({ kind: "category", id: category.id, label: value });
  };

  const addBuilding = async (value: string): Promise<string | null> => {
    try {
      await createBuildingMutation.mutateAsync(value);
      toast.success(`${value} building added.`);
      return null;
    } catch (error) {
      return extractErrorMessage(
        error,
        "We couldn't add this building. Please try again.",
      );
    }
  };

  const removeBuilding = (value: string) => {
    const building = buildingRecords.find((entry) => entry.name === value);
    if (!building) {
      toast.error("That building could not be found. Refresh and try again.");
      return;
    }
    setPendingRemoval({ kind: "building", id: building.id, label: value });
  };

  const handleConfirmRemoval = async () => {
    if (!pendingRemoval) return;
    const { kind, id, label } = pendingRemoval;
    try {
      if (kind === "category") {
        await deleteCategoryMutation.mutateAsync(id);
        toast.success(`${label} category removed.`);
      } else {
        await deleteBuildingMutation.mutateAsync(id);
        toast.success(`${label} building removed.`);
      }
      setPendingRemoval(null);
    } catch (error) {
      toast.error(
        extractErrorMessage(
          error,
          `We couldn't remove this ${kind}. Please try again.`,
        ),
      );
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="filter-options-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <div className="relative flex max-h-[90dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-[#f7f7f8] shadow-2xl dark:border-neutral-800 dark:bg-neutral-950">
        <div className="flex items-start justify-between gap-4 border-b border-neutral-200 bg-white px-5 py-4 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="min-w-0">
            <h2
              id="filter-options-modal-title"
              className="text-base font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100 sm:text-lg"
            >
              Filter options
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
              Add or remove categories and campus buildings available in reports and filters.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close filter options"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="overflow-y-auto p-4 sm:p-5">
          <div className="grid min-w-0 gap-4 lg:grid-cols-2">
            <div className="min-w-0">
              <Panel
                title="Categories"
                action={
                  <span className="text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
                    {categoryNames.length} options
                  </span>
                }
              >
                <AddOptionForm
                  kind="category"
                  isSubmitting={createCategoryMutation.isPending}
                  onAdd={addCategory}
                />
                {categoriesQuery.isPending ? (
                  <p className="px-4 py-6 text-center text-xs text-neutral-500 dark:text-neutral-400">
                    Loading categories…
                  </p>
                ) : categoriesQuery.isError ? (
                  <div className="flex flex-col items-center gap-2 px-4 py-6 text-center">
                    <p
                      className="text-xs text-red-700 dark:text-red-400"
                      role="alert"
                    >
                      We couldn’t load categories.
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        void queryClient.invalidateQueries({
                          queryKey: ["categories"],
                        })
                      }
                      className="text-xs font-semibold text-neutral-700 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] dark:text-neutral-300"
                    >
                      Try again
                    </button>
                  </div>
                ) : (
                  <OptionList
                    values={categoryNames}
                    itemLabel="category"
                    onRemove={(value) => void removeCategory(value)}
                    isRemoving={deleteCategoryMutation.isPending}
                  />
                )}
              </Panel>
            </div>

            <div className="min-w-0">
              <Panel
                title="Buildings"
                action={
                  <span className="text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
                    {buildingNames.length} options
                  </span>
                }
              >
                <AddOptionForm
                  kind="building"
                  isSubmitting={createBuildingMutation.isPending}
                  onAdd={addBuilding}
                />
                {buildingsQuery.isPending ? (
                  <p className="px-4 py-6 text-center text-xs text-neutral-500 dark:text-neutral-400">
                    Loading buildings…
                  </p>
                ) : buildingsQuery.isError ? (
                  <div className="flex flex-col items-center gap-2 px-4 py-6 text-center">
                    <p
                      className="text-xs text-red-700 dark:text-red-400"
                      role="alert"
                    >
                      We couldn’t load buildings.
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        void queryClient.invalidateQueries({
                          queryKey: ["buildings"],
                        })
                      }
                      className="text-xs font-semibold text-neutral-700 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] dark:text-neutral-300"
                    >
                      Try again
                    </button>
                  </div>
                ) : (
                  <OptionList
                    values={buildingNames}
                    itemLabel="building"
                    onRemove={(value) => void removeBuilding(value)}
                    isRemoving={deleteBuildingMutation.isPending}
                  />
                )}
              </Panel>
            </div>
          </div>
        </div>
      </div>

      {pendingRemoval && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !deleteCategoryMutation.isPending &&
              !deleteBuildingMutation.isPending
            ) {
              setPendingRemoval(null);
            }
          }}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="filter-option-remove-title"
            aria-describedby="filter-option-remove-description"
            className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900"
          >
            <h3
              id="filter-option-remove-title"
              className="text-base font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100"
            >
              Remove {pendingRemoval.kind}?
            </h3>
            <p
              id="filter-option-remove-description"
              className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400 break-words"
            >
              Remove &ldquo;{pendingRemoval.label}&rdquo; from{" "}
              {pendingRemoval.kind} options? Existing reports will keep this{" "}
              {pendingRemoval.kind}.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                disabled={
                  deleteCategoryMutation.isPending ||
                  deleteBuildingMutation.isPending
                }
                onClick={() => setPendingRemoval(null)}
                className="h-10 rounded-xl border border-neutral-200 px-4 text-xs font-bold text-neutral-700 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 disabled:opacity-50 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  deleteCategoryMutation.isPending ||
                  deleteBuildingMutation.isPending
                }
                onClick={() => void handleConfirmRemoval()}
                className="h-10 rounded-xl bg-[#E5192D] px-4 text-xs font-bold text-white transition-colors hover:bg-[#c81424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] disabled:opacity-50"
              >
                {deleteCategoryMutation.isPending ||
                deleteBuildingMutation.isPending
                  ? "Removing…"
                  : "Remove"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
