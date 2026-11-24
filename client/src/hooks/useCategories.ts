import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

export { formatCategoryLabel, isOtherCategory } from "@/lib/categoryLabel";

export interface Category {
  id: string;
  name: string;
}

interface CategoriesResponse {
  categories: Category[];
}

/** Fetches all categories from the server. */
export async function fetchCategories(): Promise<Category[]> {
  const { data } = await api.get<CategoriesResponse>("/categories");
  return data.categories;
}

export async function createCategory(name: string): Promise<Category> {
  const { data } = await api.post<{ category: Category }>("/categories", { name });
  return data.category;
}

export async function deleteCategory(id: string): Promise<void> {
  await api.delete<{ message: string }>(`/categories/${id}`);
}

/** Helper to get a category UUID by slug, fetching if needed. */
export async function getCategoryUuid(slug: string): Promise<string | undefined> {
  const categories = await fetchCategories();
  const found = categories.find((c) => c.name.toLowerCase() === slug.toLowerCase());
  return found?.id;
}

/**
 * TanStack Query hook that fetches the category list once and caches it for
 * the lifetime of the session (staleTime: Infinity).
 */
export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    staleTime: Infinity,
    retry: 1,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    },
  });
}

/**
 * Builds a slug → UUID lookup map from the categories array.
 * Returns `undefined` when categories haven't loaded yet.
 */
export function useCategoryMap(): Map<string, string> | undefined {
  const { data } = useCategories();
  if (!data) return undefined;
  return new Map(data.map((c) => [c.name, c.id]));
}
