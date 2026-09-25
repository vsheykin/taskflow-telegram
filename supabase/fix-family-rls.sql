-- ============================================
-- ИСПРАВЛЕНИЕ RLS ДЛЯ СЕМЕЙНЫХ ТАБЛИЦ
-- ============================================

-- 1. Отключаем RLS для таблицы families
ALTER TABLE families DISABLE ROW LEVEL SECURITY;

-- 2. Отключаем RLS для таблицы family_members
ALTER TABLE family_members DISABLE ROW LEVEL SECURITY;

-- 3. Удаляем ВСЕ старые политики с families
DROP POLICY IF EXISTS "Allow all operations on families" ON families;
DROP POLICY IF EXISTS "Members can view family" ON families;
DROP POLICY IF EXISTS "Owners can update family" ON families;
DROP POLICY IF EXISTS "Enable all access for families" ON families;

-- 4. Удаляем ВСЕ старые политики с family_members
DROP POLICY IF EXISTS "Allow all operations on family_members" ON family_members;
DROP POLICY IF EXISTS "Members can view family members" ON family_members;
DROP POLICY IF EXISTS "Users can join families" ON family_members;
DROP POLICY IF EXISTS "Owners can remove members" ON family_members;
DROP POLICY IF EXISTS "Enable all access for family_members" ON family_members;

-- 5. Проверяем, что RLS отключён
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('families', 'family_members');

-- Должно показать: rowsecurity = false для обеих таблиц

-- 6. Проверяем структуру таблиц
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'families'
ORDER BY ordinal_position;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'family_members'
ORDER BY ordinal_position;

-- 7. Если таблицы не существуют, создаём их
CREATE TABLE IF NOT EXISTS families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  role TEXT CHECK (role IN ('owner', 'member')) DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(family_id, user_id)
);

-- 8. Отключаем RLS для новых таблиц (если они только что созданы)
ALTER TABLE families DISABLE ROW LEVEL SECURITY;
ALTER TABLE family_members DISABLE ROW LEVEL SECURITY;

-- 9. Проверяем, что всё готово
SELECT 'families' as table_name, COUNT(*) as count FROM families
UNION ALL
SELECT 'family_members' as table_name, COUNT(*) as count FROM family_members;
