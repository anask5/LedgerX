import type { ShareLink, CreateShareLinkRequest } from './types';
import { api } from './client';

export interface CsvImportResult {
  imported: number;
  skipped?: number;
  errors?: Array<{ row?: number; message: string }>;
}

export const shareApi = {
  async createLink(receiptId: string, data: CreateShareLinkRequest): Promise<ShareLink> {
    return api.request<ShareLink>(`/receipts/${receiptId}/share-links`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async listLinks(receiptId: string): Promise<ShareLink[]> {
    const res = await api.request<{ data: ShareLink[] }>(`/receipts/${receiptId}/share-links`);
    return res.data;
  },

  async revokeLink(linkId: string): Promise<void> {
    await api.request(`/share-links/${linkId}`, { method: 'DELETE' });
  },

  async downloadProof(receiptId: string): Promise<string> {
    // Returns URL to download the proof PDF
    const res = await api.request<{ url: string }>(`/receipts/${receiptId}/proof`);
    return res.url;
  },

  async exportCSV(params: { date_from?: string; date_to?: string; category?: string }): Promise<string> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) queryParams.set(key, value);
    });
    const query = queryParams.toString();
    const res = await api.request<{ url: string }>(`/exports/receipts.csv${query ? `?${query}` : ''}`);
    return res.url;
  },

  /** Upload a receipt CSV for server-side validation and import. */
  async importCSV(formData: FormData): Promise<CsvImportResult> {
    return api.upload<CsvImportResult>('/imports/receipts.csv', formData);
  },
};
