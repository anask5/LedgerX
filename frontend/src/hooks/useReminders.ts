import { useQuery } from '@tanstack/react-query';
import { remindersApi } from '../api/reminders';

export function useReminders(tab: 'upcoming' | 'expiring_soon' | 'expired' = 'upcoming') {
  return useQuery({
    queryKey: ['reminders', tab],
    queryFn: () => {
      switch (tab) {
        case 'upcoming':
          return remindersApi.listUpcoming();
        case 'expiring_soon':
          return remindersApi.listExpiringSoon();
        case 'expired':
          return remindersApi.listExpired();
      }
    },
  });
}
