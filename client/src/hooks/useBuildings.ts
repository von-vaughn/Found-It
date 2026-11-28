import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

export interface Building {
  id: string;
  name: string;
}

interface BuildingsResponse {
  buildings: Building[];
}

export const buildingQueryKey = ["buildings"] as const;

export async function fetchBuildings(): Promise<Building[]> {
  const { data } = await api.get<BuildingsResponse>("/buildings");
  return data.buildings;
}

export async function createBuilding(name: string): Promise<Building> {
  const { data } = await api.post<{ building: Building }>("/buildings", { name });
  return data.building;
}

export async function deleteBuilding(id: string): Promise<void> {
  await api.delete<{ message: string }>(`/buildings/${id}`);
}

export function useBuildings() {
  return useQuery({
    queryKey: buildingQueryKey,
    queryFn: fetchBuildings,
    staleTime: Infinity,
    retry: 1,
  });
}

export function useCreateBuilding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createBuilding,
    onSuccess: (created) => {
      queryClient.setQueryData<Building[]>(buildingQueryKey, (current) =>
        current
          ? [...current.filter((entry) => entry.id !== created.id), created]
          : [created],
      );
      queryClient.invalidateQueries({ queryKey: buildingQueryKey });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    },
  });
}

export function useDeleteBuilding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteBuilding,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: buildingQueryKey });
      const previous = queryClient.getQueryData<Building[]>(buildingQueryKey);
      queryClient.setQueryData<Building[]>(buildingQueryKey, (current) =>
        current?.filter((entry) => entry.id !== id),
      );
      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(buildingQueryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: buildingQueryKey });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    },
  });
}
