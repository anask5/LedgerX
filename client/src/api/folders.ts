import type { Folder } from './types';
import { api } from './client';
import { mockFolders } from './mockData';

let localFolders: Folder[] = [...mockFolders];

export const foldersApi = {
  async list(): Promise<Folder[]> {
    try {
      const res = await api.request<{ data: Folder[] }>('/folders');
      if (res && res.data) return res.data;
      throw new Error('No data');
    } catch {
      return localFolders;
    }
  },

  async create(data: { name: string; emoji: string; color: string }): Promise<Folder> {
    try {
      return await api.request<Folder>('/folders', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch {
      const newFolder: Folder = {
        id: `f-${Date.now()}`,
        name: data.name,
        emoji: data.emoji,
        color: data.color,
        receipt_count: 0,
        created_at: new Date().toISOString(),
      };
      localFolders.push(newFolder);
      return newFolder;
    }
  },

  async update(id: string, data: Partial<Folder>): Promise<Folder> {
    try {
      return await api.request<Folder>(`/folders/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    } catch {
      const idx = localFolders.findIndex((f) => f.id === id);
      if (idx !== -1) {
        localFolders[idx] = { ...localFolders[idx], ...data };
        return localFolders[idx];
      }
      return localFolders[0];
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await api.request(`/folders/${id}`, { method: 'DELETE' });
    } catch {
      localFolders = localFolders.filter((f) => f.id !== id);
    }
  },
};
