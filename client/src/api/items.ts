import type { ReceiptItem } from './types';
import { api } from './client';

export const itemsApi = {
  async update(id: string, data: Partial<ReceiptItem>): Promise<ReceiptItem> {
    return api.request<ReceiptItem>(`/receipt-items/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async markReturned(id: string): Promise<ReceiptItem> {
    return api.request<ReceiptItem>(`/receipt-items/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'returned' }),
    });
  },
};
