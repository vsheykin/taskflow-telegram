-- ============================================
-- ИСПРАВЛЕНИЕ ОШИБКИ 406 - ОТКЛЮЧЕНИЕ RLS
-- ============================================

-- 1. Отключаем RLS для таблицы allowed_users
ALTER TABLE allowed_users DISABLE ROW LEVEL SECURITY;

-- 2. Удаляем ВСЕ старые политики (они могут блокировать доступ)
DROP POLICY IF EXISTS "Allow all operations on allowed_users" ON allowed_users;
DROP POLICY IF EXISTS "Anyone can check if allowed" ON allowed_users;
DROP POLICY IF EXISTS "Enable read access for all users" ON allowed_users;
DROP POLICY IF EXISTS "Public read access" ON allowed_users;
DROP POLICY IF EXISTS "allow_select" ON allowed_users;

-- 3. Проверяем, что RLS отключён
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'allowed_users';

-- Должно показать: rowsecurity = false

-- 4. Проверяем содержимое таблицы
SELECT * FROM allowed_users;

-- 5. Если таблица пустая, добавляем пользователя
-- ЗАМЕНИТЕ 271057229 на ваш реальный Telegram ID!
-- INSERT INTO allowed_users (telegram_id, added_by)
-- VALUES (271057229, 'admin');

-- 6. Проверяем, что пользователь добавлен
SELECT telegram_id FROM allowed_users WHERE telegram_id = 271057229;
