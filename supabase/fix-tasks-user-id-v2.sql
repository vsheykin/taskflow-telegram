-- ============================================
-- ИСПРАВЛЕНИЕ ТИПА user_id С УЧЁТОМ FOREIGN KEY
-- ============================================

-- 1. Удаляем foreign key constraint
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_user_id_fkey;

-- 2. Изменяем тип колонки user_id с UUID на TEXT
ALTER TABLE tasks ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- 3. Проверяем результат
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tasks' AND column_name = 'user_id';

-- Должно показать: data_type = text

-- 4. Проверяем существующие записи
SELECT id, title, user_id, scope FROM tasks LIMIT 10;

-- Примечание: Foreign key с profiles.id больше не существует,
-- так как profiles.id имеет тип UUID, а tasks.user_id теперь TEXT.
-- Это нормально для нашей архитектуры, так как мы используем Telegram ID.
