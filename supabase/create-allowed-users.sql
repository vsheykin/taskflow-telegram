-- ============================================
-- Создание таблицы разрешённых пользователей
-- ============================================

-- Создаём таблицу whitelist
CREATE TABLE IF NOT EXISTS allowed_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT UNIQUE NOT NULL,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  added_by TEXT
);

-- Отключаем RLS для таблицы (упрощаем доступ)
ALTER TABLE allowed_users DISABLE ROW LEVEL SECURITY;

-- Создаём простую политику (разрешаем все операции)
DROP POLICY IF EXISTS "Allow all operations on allowed_users" ON allowed_users;
CREATE POLICY "Allow all operations on allowed_users"
  ON allowed_users FOR ALL
  USING (true)
  WITH CHECK (true);

-- Индекс для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_allowed_users_telegram_id ON allowed_users(telegram_id);
