-- ============================================
-- ДИАГНОСТИКА И ИСПРАВЛЕНИЕ whitelist
-- ============================================

-- 1. Проверяем структуру таблицы
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'allowed_users';

-- 2. Проверяем содержимое таблицы
SELECT * FROM allowed_users;

-- 3. Если таблица пустая или структура неправильная, пересоздаём
DROP TABLE IF EXISTS allowed_users;

CREATE TABLE allowed_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT UNIQUE NOT NULL,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  added_by TEXT
);

-- Отключаем RLS полностью
ALTER TABLE allowed_users DISABLE ROW LEVEL SECURITY;

-- Удаляем все старые политики
DROP POLICY IF EXISTS "Allow all operations on allowed_users" ON allowed_users;
DROP POLICY IF EXISTS "Anyone can check if allowed" ON allowed_users;

-- Индекс для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_allowed_users_telegram_id ON allowed_users(telegram_id);

-- ============================================
-- ДОБАВЛЕНИЕ ПОЛЬЗОВАТЕЛЕЙ
-- ============================================

-- ВАЖНО: Замените значения на реальные!
-- Узнать свой Telegram ID можно через @userinfobot

-- Пример добавления (раскомментируйте и заполните):
-- INSERT INTO allowed_users (telegram_id, username, first_name, added_by)
-- VALUES (
--   123456789,              -- ← Ваш Telegram ID (число, БЕЗ кавычек!)
--   'your_username',        -- ← Ваш username
--   'Ваше Имя',             -- ← Ваше имя
--   'admin'
-- );

-- Проверка после добавления:
-- SELECT * FROM allowed_users;
