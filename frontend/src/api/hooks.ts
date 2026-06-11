import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import { useSelections } from '../store/selections';

export function useCompanies() {
  return useQuery({ queryKey: ['companies'], queryFn: api.listCompanies });
}

export function useUpload() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => api.uploadCompany(file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['companies'] }),
  });
}

export function useDeleteCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteCompany(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['companies'] }),
  });
}

function selectionPayload() {
  const { yourCompany, competitors, fiscalYear } = useSelections.getState();
  return {
    your_company_id: yourCompany as string,
    competitor_ids: competitors,
    fiscal_year: fiscalYear,
  };
}

export function useBenchmark() {
  const yourCompany = useSelections((s) => s.yourCompany);
  const competitors = useSelections((s) => s.competitors);
  const fiscalYear = useSelections((s) => s.fiscalYear);
  return useQuery({
    queryKey: ['benchmark', yourCompany, competitors, fiscalYear],
    queryFn: () => api.benchmark(selectionPayload()),
    enabled: !!yourCompany,
  });
}

export function useInsights() {
  const yourCompany = useSelections((s) => s.yourCompany);
  const competitors = useSelections((s) => s.competitors);
  const fiscalYear = useSelections((s) => s.fiscalYear);
  return useQuery({
    queryKey: ['insights', yourCompany, competitors, fiscalYear],
    queryFn: () => api.insights(selectionPayload()),
    enabled: !!yourCompany,
  });
}

export function useCachedFeed() {
  const competitors = useSelections((s) => s.competitors);
  return useQuery({
    queryKey: ['feed', competitors],
    queryFn: () => api.feedCached(competitors),
    enabled: competitors.length > 0,
  });
}

export function useHealth() {
  return useQuery({ queryKey: ['health'], queryFn: api.health, staleTime: Infinity });
}
