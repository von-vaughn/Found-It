import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { ITEM_CATEGORIES } from "@/data/itemCategories";
import { formatCategoryLabel, useCategories } from "@/hooks/useCategories";

/**
 * Resolves the category list (live server categories with static fallback) and
 * measures how many pills fit cleanly inside a single horizontal row while
 * reserving space for a trailing "More" button when overflowed.
 */
export function useFittedCategories() {
  const { data: serverCategories } = useCategories();
  const [visibleCategoryCount, setVisibleCategoryCount] = useState(0);
  const categoryRowRef = useRef<HTMLDivElement>(null);
  const categoryMeasureRef = useRef<HTMLDivElement>(null);
  const moreCategoryMeasureRef = useRef<HTMLButtonElement>(null);

  const categories = useMemo(
    () => [
      { id: "all", label: "All" },
      ...(serverCategories
        ? serverCategories.map((category) => {
            const match = ITEM_CATEGORIES.find(
              (entry) => entry.id === category.name,
            );
            return {
              id: category.name,
              label: formatCategoryLabel(category.name),
              ...(match ? { icon: match.icon } : {}),
            };
          })
        : ITEM_CATEGORIES),
    ],
    [serverCategories],
  );

  useLayoutEffect(() => {
    const row = categoryRowRef.current;
    const measureRow = categoryMeasureRef.current;
    const moreButton = moreCategoryMeasureRef.current;
    if (!row || !measureRow || !moreButton) return;

    const updateVisibleCategoryCount = () => {
      const availableWidth = row.clientWidth;
      const categoryButtons = Array.from(measureRow.children).slice(
        0,
        categories.length,
      ) as HTMLElement[];
      const categoryWidths = categoryButtons.map(
        (button) => button.getBoundingClientRect().width,
      );
      const moreWidth = moreButton.getBoundingClientRect().width;
      const gap =
        Number.parseFloat(getComputedStyle(measureRow).columnGap) || 0;
      const allCategoriesWidth =
        categoryWidths.reduce((total, width) => total + width, 0) +
        gap * Math.max(0, categoryWidths.length - 1);

      if (allCategoriesWidth <= availableWidth) {
        setVisibleCategoryCount(categories.length);
        return;
      }

      let usedWidth = 0;
      let count = 0;
      for (const width of categoryWidths) {
        const nextWidth = usedWidth + (count > 0 ? gap : 0) + width;
        const widthWithMore = nextWidth + gap + moreWidth;
        if (widthWithMore > availableWidth) break;
        usedWidth = nextWidth;
        count += 1;
      }
      setVisibleCategoryCount(count);
    };

    updateVisibleCategoryCount();
    const observer = new ResizeObserver(updateVisibleCategoryCount);
    observer.observe(row);
    observer.observe(measureRow);
    return () => observer.disconnect();
  }, [categories.length]);

  const visibleCategories = useMemo(
    () => categories.slice(0, visibleCategoryCount),
    [categories, visibleCategoryCount],
  );

  return {
    categories,
    visibleCategories,
    visibleCategoryCount,
    categoryRowRef,
    categoryMeasureRef,
    moreCategoryMeasureRef,
  };
}
