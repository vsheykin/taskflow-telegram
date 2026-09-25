-- ============================================
-- ПЕРЕСОЗДАНИЕ таблицы allowed_users
-- ============================================

-- Удаляем старую таблицу
DROP TABLE IF EXISTS allowed_users;

-- Создаём новую таблицу с правильными колонками
CREATE TABLE allowed_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT UNIQUE NOT NULL,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  added_by TEXT
);

-- Отключаем RLS
ALTER TABLE allowed_users DISABLE ROW LEVEL SECURITY;

-- Индекс для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_allowed_users_telegram_id ON allowed_users(telegram_id);

-- ============================================
-- ДОБАВЛЕНИЕ ПЕРВЫХ ПОЛЬЗОВАТЕЛЕЙ
-- ============================================

-- Замените значения на реальные!
-- Узнать Telegram ID можно через бота @userinfobot

INSERT INTO allowed_users (telegram_id, username, first_name, added_by)
VALUES (
  123456789,           -- ← ЗАМЕНИТЕ на ваш Telegram ID
  'your_username',     -- ← ЗАМЕНИТЕ на ваш username
  'Ваше Имя',          -- ← ЗАМЕНИТЕ на ваше имя
  'admin'
);

-- Добавьте жену (раскомментируйте и заполните):
-- INSERT INTO allowed_users (telegram_id, username, first_name, added_by)
-- VALUES (
--   987654321,           -- ← Telegram ID жены
--   'wife_username',     -- ← username жены
--   'Имя Жены',          -- ← имя жены
--   'admin'
-- );
