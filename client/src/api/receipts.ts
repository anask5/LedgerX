import type {
  Receipt,
  ReceiptListResponse,
  ReceiptCreateResponse,
  ReceiptFilters,
} from './types';
import { api } from './client';

function buildQueryString(filters: ReceiptFilters): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  });
  const query = params.toString();
  return query ? `?${query}` : '';
}

function patchReceipt(
  id: string,
  payload: Record<string, unknown>
): Promise<Receipt> {
  return api.request<Receipt>(`/receipts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export const receiptsApi = {
  async list(filters: ReceiptFilters = {}): Promise<ReceiptListResponse> {
    return api.request<ReceiptListResponse>(`/receipts${buildQueryString(filters)}`);
  },

  async get(id: string): Promise<Receipt> {
    return api.request<Receipt>(`/receipts/${id}`);
  },

  async upload(formData: FormData): Promise<ReceiptCreateResponse> {
    return api.upload<ReceiptCreateResponse>('/receipts', formData);
  },

  async update(
    id: string,
    data: Partial<Receipt> & { confirm?: boolean }
  ): Promise<Receipt> {
    return patchReceipt(id, data as Record<string, unknown>);
  },

  async delete(id: string): Promise<void> {
    await api.request(`/receipts/${id}`, { method: 'DELETE' });
  },

  async toggleFavorite(id: string, is_favorite: boolean): Promise<Receipt> {
    return patchReceipt(id, { is_favorite });
  },

  async archive(id: string, is_archived: boolean): Promise<Receipt> {
    return patchReceipt(id, { is_archived });
  },

  async moveToFolder(id: string, folder_id: string | null): Promise<Receipt> {
    return patchReceipt(id, { folder_id });
  },

  async setTags(id: string, tags: string[]): Promise<Receipt> {
    return patchReceipt(id, { tags });
  },
};