-- Добавление полей для повторных напоминаний
-- Выполнить в Supabase SQL Editor

-- Добавляем поле для подсчёта отправленных напоминаний
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reminder_count INTEGER DEFAULT 0;

-- Добавляем поле для времени последней отправки напоминания
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMP WITH TIME ZONE;

-- Обновляем существующие задачи
UPDATE tasks SET reminder_count = 0 WHERE reminder_count IS NULL;

-- Проверяем результат
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'tasks'
  AND column_name IN ('reminder_count', 'last_reminder_sent_at');
