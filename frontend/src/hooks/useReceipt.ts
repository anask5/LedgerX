import { useQuery, useQueryClient } from '@tanstack/react-query';
import { receiptsApi } from '../api/receipts';

export function useReceipt(id: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['receipt', id],
    queryFn: () => receiptsApi.get(id),
    enabled: !!id,
    refetchInterval: (query) => {
      const data = query.state.data;
      return data?.status === 'processing' ? 2000 : false;
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
