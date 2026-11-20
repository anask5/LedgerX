import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { receiptsApi } from '../api/receipts';
import type { ReceiptFilters } from '../api/types';

export function useReceipts(filters: ReceiptFilters = {}) {
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: ['receipts', filters],
    queryFn: ({ pageParam = 1 }) =>
      receiptsApi.list({ ...filters, page: pageParam, page_size: 20 }),
    getNextPageParam: (lastPage) =>
      lastPage.page * lastPage.page_size < lastPage.total
        ? lastPage.page + 1
        : undefined,
    initialPageParam: 1,
  });

  const receipts = query.data?.pages.flatMap((page) => page.data) ?? [];
  const total = query.data?.pages[0]?.total ?? 0;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['receipts'] });
  };

  return {
    ...query,
    receipts,
    total,
    invalidate,
  };
}
