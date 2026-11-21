import type { Reminder } from './types';
import { api } from './client';
import { mockReminders } from './mockData';

let localReminders: Reminder[] = [...mockReminders];

export const remindersApi = {
  async listUpcoming(): Promise<Reminder[]> {
    try {
      const res = await api.request<{ data: Reminder[] }>('/reminders/upcoming');
      if (res && res.data) return res.data;
      throw new Error('No data');
    } catch {
      return localReminders.filter((r) => r.status === 'upcoming');
    }
  },

  async listExpiringSoon(): Promise<Reminder[]> {
    try {
      const res = await api.request<{ data: Reminder[] }>('/reminders/expiring-soon');
      if (res && res.data) return res.data;
      throw new Error('No data');
    } catch {
      return localReminders.filter((r) => r.status === 'expiring_soon');
    }
  },

  async listExpired(): Promise<Reminder[]> {
    try {
      const res = await api.request<{ data: Reminder[] }>('/reminders/expired');
      if (res && res.data) return res.data;
      throw new Error('No data');
    } catch {
      return localReminders.filter((r) => r.status === 'expired');
    }
  },

  async snooze(id: string, days: number): Promise<Reminder> {
    try {
      return await api.request<Reminder>(`/reminders/${id}/snooze`, {
        method: 'PATCH',
        body: JSON.stringify({ days }),
      });
    } catch {
      const idx = localReminders.findIndex((r) => r.id === id);
      if (idx !== -1) {
        const snoozeDate = new Date();
        snoozeDate.setDate(snoozeDate.getDate() + days);
        localReminders[idx].snoozed_until = snoozeDate.toISOString();
        return localReminders[idx];
      }
      return localReminders[0];
    }
  },
};
