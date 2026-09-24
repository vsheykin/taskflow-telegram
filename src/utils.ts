import { format, isToday, isTomorrow, isPast, differenceInDays, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = parseISO(dateStr);
  if (isToday(date)) return 'Сегодня';
  if (isTomorrow(date)) return 'Завтра';
  return format(date, 'd MMMM', { locale: ru });
}

export function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = parseISO(dateStr);
  return format(date, 'd MMMM, HH:mm', { locale: ru });
}

export function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return isPast(parseISO(dateStr));
}

export function getDaysUntilDue(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return differenceInDays(parseISO(dateStr), new Date());
}

export function getDueDateLabel(dateStr: string | null): { text: string; color: string } {
  if (!dateStr) return { text: '', color: '' };
  const days = getDaysUntilDue(dateStr);
  if (days === null) return { text: '', color: '' };
  if (days < 0) return { text: `Просрочено на ${Math.abs(days)} дн.`, color: 'text-red-500' };
  if (days === 0) return { text: 'Сегодня', color: 'text-orange-500' };
  if (days === 1) return { text: 'Завтра', color: 'text-yellow-500' };
  if (days <= 3) return { text: `${days} дн.`, color: 'text-blue-500' };
  return { text: formatDate(dateStr), color: 'text-gray-500' };
}

export function toLocalISOString(date: Date): string {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60000);
  return localDate.toISOString().slice(0, 16);
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return 'Доброй ночи';
  if (hour < 12) return 'Доброе утро';
  if (hour < 18) return 'Добрый день';
  return 'Добрый вечер';
}
