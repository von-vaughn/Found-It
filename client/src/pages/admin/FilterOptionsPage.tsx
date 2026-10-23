import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { Panel } from "@/components/admin/Panel";
import { AdminLayout } from "./AdminLayout";
import { ITEM_CATEGORIES } from "@/data/itemCategories";
import { ITEM_BUILDINGS } from "@/data/itemBuildings";

type OptionKind = "category" | "building";

function OptionList({
  values,
  addedValues,
}: {
  values: string[];
  addedValues: string[];
}) {
  if (values.length === 0) {
    return (
      <p className="px-4 py-6 text-center text-xs text-neutral-500 dark:text-neutral-400">
        No options available.
      </p>
    );
  }

  return (
    <ul className="max-h-80 divide-y divide-neutral-100 overflow-y-auto dark:divide-neutral-800">
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
            <span
              className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-semibold ${
                isAdded
                  ? "bg-red-50 text-[#b81626] dark:bg-red-500/10 dark:text-red-300"
                  : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
              }`}
            >
              {isAdded ? "This session" : "Default"}
            </span>
          </li>
        );
      })}
    </ul>
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
  const [addedCategories, setAddedCategories] = useState<string[]>([]);
  const [addedBuildings, setAddedBuildings] = useState<string[]>([]);
  const categoryNames = [
    ...ITEM_CATEGORIES.map((category) => category.label),
    ...addedCategories,
  ];
  const buildingNames = [...ITEM_BUILDINGS, ...addedBuildings];

  const addCategory = (value: string) => {
    if (categoryNames.some((name) => name.toLowerCase() === value.toLowerCase())) {
      return false;
    }
    setAddedCategories((current) => [...current, value]);
    return true;
  };

  const addBuilding = (value: string) => {
    if (buildingNames.some((name) => name.toLowerCase() === value.toLowerCase())) {
      return false;
    }
    setAddedBuildings((current) => [...current, value]);
    return true;
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
          <OptionList
            values={categoryNames}
            addedValues={addedCategories}
          />
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
          <OptionList values={buildingNames} addedValues={addedBuildings} />
        </Panel>
      </div>
    </AdminLayout>
  );
}

export default FilterOptionsPage;
