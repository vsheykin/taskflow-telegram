-- ============================================
-- ИСПРАВЛЕНИЕ ТИПА user_id В ТАБЛИЦЕ tasks
-- ============================================
-- Проблема: user_id имеет тип UUID, но приложение передаёт Telegram ID (число)
-- Решение: изменить тип на TEXT

-- 1. Изменяем тип колонки user_id с UUID на TEXT
ALTER TABLE tasks ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- 2. Проверяем результат
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tasks' AND column_name = 'user_id';

-- Должно показать: data_type = text

-- 3. Проверяем существующие записи
SELECT id, title, user_id, scope FROM tasks LIMIT 10;
