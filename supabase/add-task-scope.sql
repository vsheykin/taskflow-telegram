-- ============================================
-- ДОБАВЛЕНИЕ ПОЛЯ SCOPE ДЛЯ РАЗДЕЛЕНИЯ ЗАДАЧ
-- ============================================

-- Добавляем колонку scope в таблицу tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS scope TEXT DEFAULT 'personal';

-- Устанавливаем значение по умолчанию для существующих записей
UPDATE tasks SET scope = 'personal' WHERE scope IS NULL;

-- Добавляем ограничение на значения
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_scope_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_scope_check CHECK (scope IN ('personal', 'family'));

-- Проверяем результат
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'tasks' AND column_name = 'scope';
