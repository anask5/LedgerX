import type { Tag } from './types';
import { api } from './client';
import { mockTags } from './mockData';

let localTags: Tag[] = [...mockTags];

export const tagsApi = {
  async list(): Promise<Tag[]> {
    try {
      const res = await api.request<{ data: Tag[] }>('/tags');
      if (res && res.data) return res.data;
      throw new Error('No data');
    } catch {
      return localTags;
    }
  },

  async create(name: string): Promise<Tag> {
    try {
      return await api.request<Tag>('/tags', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
    } catch {
      const newTag: Tag = {
        id: `t-${Date.now()}`,
        name,
        receipt_count: 0,
      };
      localTags.push(newTag);
      return newTag;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await api.request(`/tags/${id}`, { method: 'DELETE' });
    } catch {
      localTags = localTags.filter((t) => t.id !== id);
    }
  },
};
