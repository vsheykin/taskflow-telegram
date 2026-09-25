-- ============================================
-- Добавление первых пользователей в whitelist
-- ============================================

-- Замените TELEGRAM_ID на реальные ID пользователей
-- Узнать ID можно через бота @userinfobot в Telegram

-- Пример добавления пользователя:
INSERT INTO allowed_users (telegram_id, username, first_name, added_by)
VALUES (
  123456789,  -- Замените на реальный Telegram ID
  'username', -- Замените на реальный username
  'Имя',      -- Замените на реальное имя
  'admin'
);

-- Добавьте ещё пользователей по необходимости:
-- INSERT INTO allowed_users (telegram_id, username, first_name, added_by)
-- VALUES (987654321, 'wife_username', 'Жена', 'admin');
