import type {
  Receipt,
  ReceiptListResponse,
  ReceiptCreateResponse,
  ReceiptFilters,
} from './types';
import { api } from './client';
import { mockReceipts } from './mockData';

let localReceipts: Receipt[] = [...mockReceipts];

export const receiptsApi = {
  async list(filters: ReceiptFilters = {}): Promise<ReceiptListResponse> {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.set(key, String(value));
        }
      });
      const query = params.toString();
      const res = await api.request<ReceiptListResponse>(`/receipts${query ? `?${query}` : ''}`);
      if (res && res.data) return res;
      throw new Error('No data');
    } catch {
      // Fallback to local mock data
      let filtered = [...localReceipts];

      if (filters.q) {
        const query = filters.q.toLowerCase();
        filtered = filtered.filter(
          (r) =>
            r.store_name.toLowerCase().includes(query) ||
            r.category?.toLowerCase().includes(query) ||
            r.items.some((i) => i.name.toLowerCase().includes(query))
        );
      }
      if (filters.category) {
        filtered = filtered.filter((r) => r.category === filters.category);
      }
      if (filters.is_favorite) {
        filtered = filtered.filter((r) => r.is_favorite);
      }
      if (filters.folder_id) {
        filtered = filtered.filter((r) => r.folder_id === filters.folder_id);
      }

      const page = filters.page || 1;
      const pageSize = filters.page_size || 20;
      const start = (page - 1) * pageSize;
      const paginated = filtered.slice(start, start + pageSize);

      return {
        data: paginated,
        total: filtered.length,
        page,
        page_size: pageSize,
      };
    }
  },

  async get(id: string): Promise<Receipt> {
    try {
      const res = await api.request<Receipt>(`/receipts/${id}`);
      if (res && res.id) return res;
      throw new Error('Not found');
    } catch {
      const found = localReceipts.find((r) => r.id === id);
      if (found) return found;
      return localReceipts[0];
    }
  },

  async upload(formData: FormData): Promise<ReceiptCreateResponse> {
    try {
      return await api.upload<ReceiptCreateResponse>('/receipts', formData);
    } catch {
      // Local fallback create
      const newId = `rcpt-${Date.now()}`;
      const newReceipt: Receipt = {
        id: newId,
        user_id: 'user-demo',
        store_name: 'Uploaded Store Receipt',
        store_address: null,
        store_phone: null,
        purchase_date: new Date().toISOString().split('T')[0],
        total_amount: 1499,
        currency: 'INR',
        payment_mode: 'upi',
        receipt_number: null,
        subtotal: 1499,
        tax: 270,
        category: 'Groceries',
        image_url: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=800&q=80',
        thumbnail_url: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=200&q=80',
        status: 'ready',
        ocr_confidence: null,
        needs_review: ['store_name'],
        items: [
          {
            id: `item-${Date.now()}`,
            name: 'Scanned Item',
            quantity: 1,
            price: 1499,
            serial_number: null,
            brand_warranty_months: null,
            brand_warranty_expiry: null,
            extended_warranty_months: null,
            extended_warranty_expiry: null,
            return_deadline: null,
            status: 'none',
          },
        ],
        folder_id: null,
        tags: ['new'],
        is_favorite: false,
        is_archived: false,
        return_deadline: null,
        notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      localReceipts.unshift(newReceipt);
      return {
        data: {
          id: newId,
          status: 'ready',
        },
      };
    }
  },

  async update(id: string, data: Partial<Receipt> & { confirm?: boolean }): Promise<Receipt> {
    try {
      return await api.request<Receipt>(`/receipts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    } catch {
      const idx = localReceipts.findIndex((r) => r.id === id);
      if (idx !== -1) {
        localReceipts[idx] = { ...localReceipts[idx], ...data, updated_at: new Date().toISOString() };
        return localReceipts[idx];
      }
      return localReceipts[0];
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await api.request(`/receipts/${id}`, { method: 'DELETE' });
    } catch {
      localReceipts = localReceipts.filter((r) => r.id !== id);
    }
  },

  async toggleFavorite(id: string, is_favorite: boolean): Promise<Receipt> {
    try {
      return await api.request<Receipt>(`/receipts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_favorite }),
      });
    } catch {
      const idx = localReceipts.findIndex((r) => r.id === id);
      if (idx !== -1) {
        localReceipts[idx].is_favorite = is_favorite;
        return localReceipts[idx];
      }
      return localReceipts[0];
    }
  },

  async archive(id: string, is_archived: boolean): Promise<Receipt> {
    try {
      return await api.request<Receipt>(`/receipts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_archived }),
      });
    } catch {
      const idx = localReceipts.findIndex((r) => r.id === id);
      if (idx !== -1) {
        localReceipts[idx].is_archived = is_archived;
        return localReceipts[idx];
      }
      return localReceipts[0];
    }
  },

  async moveToFolder(id: string, folder_id: string | null): Promise<Receipt> {
    try {
      return await api.request<Receipt>(`/receipts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ folder_id }),
      });
    } catch {
      const idx = localReceipts.findIndex((r) => r.id === id);
      if (idx !== -1) {
        localReceipts[idx].folder_id = folder_id;
        return localReceipts[idx];
      }
      return localReceipts[0];
    }
  },

  async setTags(id: string, tags: string[]): Promise<Receipt> {
    try {
      return await api.request<Receipt>(`/receipts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ tags }),
      });
    } catch {
      const idx = localReceipts.findIndex((r) => r.id === id);
      if (idx !== -1) {
        localReceipts[idx].tags = tags;
        return localReceipts[idx];
      }
      return localReceipts[0];
    }
  },
};
