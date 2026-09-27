import { format, isToday, isTomorrow, isPast, differenceInDays, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

// Конвертирует строку даты в Date объект, учитывая часовой пояс
export function parseDateWithTimezone(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  
  // Если строка уже содержит часовой пояс (Z или +HH:MM), используем как есть
  if (dateStr.includes('Z') || dateStr.match(/[+-]\d{2}:\d{2}$/)) {
    return new Date(dateStr);
  }
  
  // Иначе предполагаем, что это локальное время и конвертируем в UTC
  const date = new Date(dateStr);
  return date;
}

// Форматирует дату в локальное время пользователя
export function formatToLocalDateTime(date: Date): string {
  return date.toLocaleString('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
  });
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = parseDateWithTimezone(dateStr);
  if (!date) return '';
  
  if (isToday(date)) return 'Сегодня';
  if (isTomorrow(date)) return 'Завтра';
  return format(date, 'd MMMM', { locale: ru });
}

export function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = parseDateWithTimezone(dateStr);
  if (!date) return '';
  
  // Используем локальное время пользователя
  return formatToLocalDateTime(date);
}

export function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const date = parseDateWithTimezone(dateStr);
  if (!date) return false;
  return isPast(date);
}

export function getDaysUntilDue(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const date = parseDateWithTimezone(dateStr);
  if (!date) return null;
  return differenceInDays(date, new Date());
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
  // Форматируем дату в локальном времени для input type="datetime-local"
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// Конвертирует локальную дату из input в UTC строку для сохранения
export function localToUTC(localDateStr: string): string {
  if (!localDateStr) return '';
  
  // Создаём Date объект из локальной строки
  const localDate = new Date(localDateStr);
  
  // Конвертируем в UTC ISO строку
  return localDate.toISOString();
}

// Конвертирует UTC строку из БД в локальную строку для отображения в input
export function utcToLocal(utcDateStr: string): string {
  if (!utcDateStr) return '';
  
  const date = new Date(utcDateStr);
  return toLocalISOString(date);
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return 'Доброй ночи';
  if (hour < 12) return 'Доброе утро';
  if (hour < 18) return 'Добрый день';
  return 'Добрый вечер';
}
