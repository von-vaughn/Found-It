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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: buildingQueryKey });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    },
  });
}

export function useDeleteBuilding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteBuilding,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: buildingQueryKey });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    },
  });
}
