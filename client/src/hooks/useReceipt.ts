import { useQuery, useQueryClient } from '@tanstack/react-query';
import { receiptsApi } from '../api/receipts';

export function useReceipt(id: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['receipt', id],
    queryFn: () => receiptsApi.get(id),
    enabled: !!id,
    retry: 2,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'ready' || status === 'failed') {
        return false;
      }
      return 2000;
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['receipt', id] });
    queryClient.invalidateQueries({ queryKey: ['receipts'] });
  };

  return {
    ...query,
    receipt: query.data,
    invalidate,
  };
}