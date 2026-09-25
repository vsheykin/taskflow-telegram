-- ============================================
-- TaskFlow Database Schema - ИСПРАВЛЕННАЯ ВЕРСИЯ
-- ============================================

-- Отключаем RLS для всех таблиц (упрощаем безопасность)
-- Так как у нас нет полноценной аутентификации через Supabase Auth
ALTER TABLE IF EXISTS profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS task_tags DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS families DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS family_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS allowed_users DISABLE ROW LEVEL SECURITY;

-- Удаляем старые политики (если есть)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can insert own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can view task tags" ON task_tags;
DROP POLICY IF EXISTS "Users can manage task tags" ON task_tags;
DROP POLICY IF EXISTS "Members can view family" ON families;
DROP POLICY IF EXISTS "Owners can update family" ON families;
DROP POLICY IF EXISTS "Members can view family members" ON family_members;
DROP POLICY IF EXISTS "Users can join families" ON family_members;
DROP POLICY IF EXISTS "Owners can remove members" ON family_members;
DROP POLICY IF EXISTS "Anyone can check if allowed" ON allowed_users;

-- Создаём простые политики (разрешаем все операции)
CREATE POLICY "Allow all operations on profiles"
  ON profiles FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on tasks"
  ON tasks FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on task_tags"
  ON task_tags FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on families"
  ON families FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on family_members"
  ON family_members FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on allowed_users"
  ON allowed_users FOR ALL
  USING (true)
  WITH CHECK (true);

-- Функция для получения задач с напоминаниями (для cron)
CREATE OR REPLACE FUNCTION get_pending_reminders()
RETURNS TABLE (
  task_id UUID,
  user_telegram_id BIGINT,
  title TEXT,
  description TEXT,
  reminder_date TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    p.telegram_id,
    t.title,
    t.description,
    t.reminder_date
  FROM tasks t
  JOIN profiles p ON t.user_id = p.id
  WHERE t.reminder_date IS NOT NULL
    AND t.reminder_date <= NOW()
    AND t.reminder_sent = false
    AND t.status NOT IN ('completed', 'cancelled');
END;
$$ LANGUAGE plpgsql;
