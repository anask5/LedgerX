/**
 * Format dates in DD/MM/YYYY format (Indian standard).
 */
export function formatDate(dateStr: string | Date): string {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (isNaN(date.getTime())) return 'Invalid date';

  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();

  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Parse a DD/MM/YYYY string into a Date object.
 */
export function parseDate(dateStr: string): Date | null {
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;

  const [dd, mm, yyyy] = parts.map(Number);
  if (!dd || !mm || !yyyy) return null;

  const date = new Date(yyyy, mm - 1, dd);
  if (isNaN(date.getTime())) return null;

  return date;
}

/**
 * Calculate how many days are left until a deadline.
 */
export function daysLeft(deadline: string | Date): number {
  const target = typeof deadline === 'string' ? new Date(deadline) : deadline;
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Human-readable relative time for deadlines.
 */
export function deadlineLabel(deadline: string | Date): string {
  const days = daysLeft(deadline);
  if (days < 0) return `${Math.abs(days)} days ago`;
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days <= 7) return `${days} days left`;
  if (days <= 30) return `${Math.ceil(days / 7)} weeks left`;
  return `${Math.ceil(days / 30)} months left`;
}
