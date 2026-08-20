"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type Hazard } from "../_services/api";

export const HAZARDS_KEY = ["hazards"];
export const GOV_STATS_KEY = ["gov-stats"];

export function useHazards() {
  return useQuery({
    queryKey: HAZARDS_KEY,
    queryFn: api.getHazards,
    staleTime: 10_000,
    refetchInterval: 30_000,
  });
}

export function useGovStats() {
  return useQuery({
    queryKey: GOV_STATS_KEY,
    queryFn: api.getStats,
    staleTime: 10_000,
    refetchInterval: 30_000,
  });
}

export function useUpdateStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: Hazard["status"] }) =>
      api.updateStatus(id, status),

    // Optimistic update
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: HAZARDS_KEY });
      const previous = queryClient.getQueryData<Hazard[]>(HAZARDS_KEY);

      queryClient.setQueryData<Hazard[]>(HAZARDS_KEY, (old = []) =>
        old.map((h) =>
          h.id === id
            ? {
                ...h,
                status,
                resolved_at: status === "resolved" ? new Date().toISOString() : null,
              }
            : h
        )
      );

      return { previous };
    },

    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(HAZARDS_KEY, context.previous);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: HAZARDS_KEY });
      queryClient.invalidateQueries({ queryKey: GOV_STATS_KEY });
    },
  });
}
