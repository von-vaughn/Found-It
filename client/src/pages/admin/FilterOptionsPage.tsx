import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { StaggerGrid, StaggerItem } from "@/components/StaggerGridItem";
import { Panel } from "@/components/admin/Panel";
import { AdminLayout } from "./AdminLayout";
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
    <div className="h-[28rem] overflow-y-auto">
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
  const inputId = `new-${kind}`;

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
      className="border-b border-neutral-100 px-4 py-4 dark:border-neutral-800 sm:px-5"
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
          className="h-10 min-w-0 flex-1 rounded-lg border border-neutral-200 bg-neutral-50 px-3 text-xs text-neutral-900 placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100 dark:placeholder:text-neutral-400"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-[#E5192D] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#c81424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-50"
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

export function FilterOptionsPage() {
  const queryClient = useQueryClient();
  const categoriesQuery = useCategories();
  const buildingsQuery = useBuildings();
  const createCategoryMutation = useCreateCategory();
  const createBuildingMutation = useCreateBuilding();
  const deleteCategoryMutation = useDeleteCategory();
  const deleteBuildingMutation = useDeleteBuilding();
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

  const removeCategory = async (value: string) => {
    const category = categoryRecords.find(
      (entry) => formatCategoryLabel(entry.name) === value,
    );
    if (!category) {
      toast.error("That category could not be found. Refresh and try again.");
      return;
    }

    if (
      !window.confirm(
        `Remove "${value}" from category options? Existing reports will keep this category.`,
      )
    ) {
      return;
    }

    try {
      await deleteCategoryMutation.mutateAsync(category.id);
      toast.success(`${value} category removed.`);
    } catch (error) {
      toast.error(
        extractErrorMessage(
          error,
          "We couldn't remove this category. Please try again.",
        ),
      );
    }
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

  const removeBuilding = async (value: string) => {
    const building = buildingRecords.find((entry) => entry.name === value);
    if (!building) {
      toast.error("That building could not be found. Refresh and try again.");
      return;
    }

    if (
      !window.confirm(
        `Remove "${value}" from building options? Existing reports will keep this building.`,
      )
    ) {
      return;
    }

    try {
      await deleteBuildingMutation.mutateAsync(building.id);
      toast.success(`${value} building removed.`);
    } catch (error) {
      toast.error(
        extractErrorMessage(
          error,
          "We couldn't remove this building. Please try again.",
        ),
      );
    }
  };

  return (
    <AdminLayout activeSection="options">
      <StaggerGrid className="grid min-w-0 gap-5 lg:grid-cols-2">
        <StaggerItem className="min-w-0">
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
              <p className="text-xs text-red-700 dark:text-red-400" role="alert">
                We couldn’t load categories.
              </p>
              <button
                type="button"
                onClick={() => void queryClient.invalidateQueries({ queryKey: ["categories"] })}
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
        </StaggerItem>

        <StaggerItem className="min-w-0">
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
              <p className="text-xs text-red-700 dark:text-red-400" role="alert">
                We couldn’t load buildings.
              </p>
              <button
                type="button"
                onClick={() => void queryClient.invalidateQueries({ queryKey: ["buildings"] })}
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
        </StaggerItem>
      </StaggerGrid>
    </AdminLayout>
  );
}

export default FilterOptionsPage;
