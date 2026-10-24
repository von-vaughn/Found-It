import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Panel } from "@/components/admin/Panel";
import { AdminLayout } from "./AdminLayout";
import { ITEM_CATEGORIES } from "@/data/itemCategories";
import { ITEM_BUILDINGS } from "@/data/itemBuildings";
import { useCategories, useDeleteCategory } from "@/hooks/useCategories";
import { useBuildings, useDeleteBuilding } from "@/hooks/useBuildings";

type OptionKind = "category" | "building";

function OptionList({
  values,
  addedValues,
  itemLabel,
  onRemove,
  isRemoving,
}: {
  values: string[];
  addedValues: string[];
  itemLabel: string;
  onRemove?: (value: string, isAdded: boolean) => void;
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
          {values.map((value) => {
            const isAdded = addedValues.includes(value);
            return (
              <li
                key={value}
                className="flex items-center justify-between gap-3 px-4 py-2.5 sm:px-5"
              >
                <span className="min-w-0 break-words text-xs font-medium text-neutral-800 dark:text-neutral-200">
                  {value}
                </span>
                <div className="flex shrink-0 items-center gap-2">
                  {isAdded && (
                    <span className="rounded-md bg-red-50 px-2 py-1 text-[10px] font-semibold text-[#b81626] dark:bg-red-500/10 dark:text-red-300">
                      This session
                    </span>
                  )}
                  {onRemove && (
                    <button
                      type="button"
                      aria-label={`Remove ${value} ${itemLabel}`}
                      title={`Remove ${value}`}
                      disabled={isRemoving && !isAdded}
                      onClick={() => onRemove(value, isAdded)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-700 transition-colors hover:bg-red-50 hover:text-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] disabled:cursor-wait disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950/30 dark:hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function AddOptionForm({
  kind,
  onAdd,
}: {
  kind: OptionKind;
  onAdd: (value: string) => boolean;
}) {
  const [value, setValue] = useState("");
  const [message, setMessage] = useState("");
  const label = kind === "category" ? "category" : "building";
  const inputId = `new-${kind}`;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedValue = value.trim();
    if (!trimmedValue) {
      setMessage(`Enter a ${label} name before adding it.`);
      return;
    }
    if (!onAdd(trimmedValue)) {
      setMessage(`That ${label} is already in the list.`);
      return;
    }
    setValue("");
    setMessage(`${trimmedValue} added for this session.`);
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
            setMessage("");
          }}
          maxLength={80}
          placeholder={`Enter a ${label} name`}
          className="h-10 min-w-0 flex-1 rounded-lg border border-neutral-200 bg-neutral-50 px-3 text-xs text-neutral-900 placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100 dark:placeholder:text-neutral-400"
        />
        <button
          type="submit"
          className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-[#E5192D] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#c81424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Add {label}
        </button>
      </div>
      <div className="min-h-4">
        <p
          aria-live="polite"
          className={`mt-1.5 text-[11px] ${
            message.includes("added")
              ? "text-emerald-700 dark:text-emerald-400"
              : "text-red-700 dark:text-red-400"
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
  const deleteCategoryMutation = useDeleteCategory();
  const deleteBuildingMutation = useDeleteBuilding();
  const [addedCategories, setAddedCategories] = useState<string[]>([]);
  const [addedBuildings, setAddedBuildings] = useState<string[]>([]);
  const categoryRecords = categoriesQuery.data ?? [];
  const getCategoryLabel = (name: string) =>
    ITEM_CATEGORIES.find((category) => category.id === name)?.label ??
    name.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  const categoryNames = [
    ...categoryRecords.map((category) => getCategoryLabel(category.name)),
    ...addedCategories,
  ];
  const buildingRecords = buildingsQuery.data ?? [];
  const buildingNames = [
    ...(buildingsQuery.data?.map((building) => building.name) ?? ITEM_BUILDINGS),
    ...addedBuildings,
  ];

  const addCategory = (value: string) => {
    if (categoryNames.some((name) => name.toLowerCase() === value.toLowerCase())) {
      return false;
    }
    setAddedCategories((current) => [...current, value]);
    return true;
  };

  const removeCategory = async (value: string, isAdded: boolean) => {
    if (isAdded) {
      setAddedCategories((current) => current.filter((name) => name !== value));
      return;
    }

    const category = categoryRecords.find(
      (entry) => getCategoryLabel(entry.name) === value,
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
      const message = (
        error as { response?: { data?: { message?: string } } }
      )?.response?.data?.message;
      toast.error(
        message ?? "We couldn't remove this category. Please try again.",
      );
    }
  };

  const addBuilding = (value: string) => {
    if (buildingNames.some((name) => name.toLowerCase() === value.toLowerCase())) {
      return false;
    }
    setAddedBuildings((current) => [...current, value]);
    return true;
  };

  const removeBuilding = async (value: string, isAdded: boolean) => {
    if (isAdded) {
      setAddedBuildings((current) => current.filter((name) => name !== value));
      return;
    }

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
      const message = (
        error as { response?: { data?: { message?: string } } }
      )?.response?.data?.message;
      toast.error(
        message ?? "We couldn't remove this building. Please try again.",
      );
    }
  };

  return (
    <AdminLayout activeSection="options">
      <p className="mb-4 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
        Add choices to the category and building filters available to school
        users. These additions last only for the current session.
      </p>
      <div className="grid min-w-0 gap-5 lg:grid-cols-2">
        <Panel
          title="Categories"
          action={
            <span className="text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
              {categoryNames.length} options
            </span>
          }
        >
          <AddOptionForm kind="category" onAdd={addCategory} />
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
              addedValues={addedCategories}
              itemLabel="category"
              onRemove={(value, isAdded) => void removeCategory(value, isAdded)}
              isRemoving={deleteCategoryMutation.isPending}
            />
          )}
        </Panel>

        <Panel
          title="Buildings"
          action={
            <span className="text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
              {buildingNames.length} options
            </span>
          }
        >
          <AddOptionForm kind="building" onAdd={addBuilding} />
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
              addedValues={addedBuildings}
              itemLabel="building"
              onRemove={(value, isAdded) => void removeBuilding(value, isAdded)}
              isRemoving={deleteBuildingMutation.isPending}
            />
          )}
        </Panel>
      </div>
    </AdminLayout>
  );
}

export default FilterOptionsPage;
