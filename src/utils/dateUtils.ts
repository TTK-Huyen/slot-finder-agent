/**
 * Date utility helpers for The Slot Finder.
 * Sprints are based on calendar weeks starting on Monday.
 */

// Format date to YYYY-MM-DD
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Parse YYYY-MM-DD into a Date (at midnight local time)
export function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// Get the Monday of the week for a given date
export function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  // In JS, Sunday is 0, Monday is 1, ..., Saturday is 6
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Add days to date
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// Get the date string of the previous day
export function getDayBefore(dateStr: string): string {
  const d = parseDate(dateStr);
  return formatDate(addDays(d, -1));
}

// Get all Mondays that fall within the range [startDateStr, endDateStr]
export function getWeeksCovered(startDateStr: string, endDateStr: string): string[] {
  const start = parseDate(startDateStr);
  const end = parseDate(endDateStr);

  const startMonday = getMonday(start);
  const endMonday = getMonday(end);

  const weeks: string[] = [];
  let curr = new Date(startMonday);

  while (curr <= endMonday) {
    weeks.push(formatDate(curr));
    curr = addDays(curr, 7);
  }

  return weeks;
}

// Display date label e.g., "14/10"
export function formatShortDate(dateStr: string): string {
  if (!dateStr) return '';
  const [, m, d] = dateStr.split('-');
  return `${d}/${m}`;
}

// Format week label e.g., "Tuần 14/10 - 20/10"
export function formatWeekLabel(weekStartStr: string): string {
  const start = parseDate(weekStartStr);
  const end = addDays(start, 6);
  return `Tuần ${formatShortDate(weekStartStr)} - ${formatShortDate(formatDate(end))}`;
}
