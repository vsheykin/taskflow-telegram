-- ============================================
-- ИСПРАВЛЕНИЕ ТИПОВ ДАННЫХ ДЛЯ СЕМЕЙНЫХ ТАБЛИЦ
-- ============================================
-- Проблема: user_id имеет тип UUID, но приложение передаёт Telegram ID (число)
-- Решение: изменить тип на TEXT

-- 1. Удаляем старые таблицы (они имеют неправильную структуру)
DROP TABLE IF EXISTS family_members;
DROP TABLE IF EXISTS families;

-- 2. Создаём таблицу families с правильными типами
CREATE TABLE families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  created_by TEXT,  -- ← TEXT, не UUID! (Telegram ID)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Создаём таблицу family_members с правильными типами
CREATE TABLE family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,  -- ← TEXT, не UUID! (Telegram ID)
  role TEXT CHECK (role IN ('owner', 'member')) DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(family_id, user_id)
);

-- 4. Отключаем RLS
ALTER TABLE families DISABLE ROW LEVEL SECURITY;
ALTER TABLE family_members DISABLE ROW LEVEL SECURITY;

-- 5. Индексы для производительности
CREATE INDEX idx_family_members_user_id ON family_members(user_id);
CREATE INDEX idx_family_members_family_id ON family_members(family_id);
CREATE INDEX idx_families_invite_code ON families(invite_code);

-- 6. Проверяем структуру
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'families'
ORDER BY ordinal_position;

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'family_members'
ORDER BY ordinal_position;

-- Должно показать:
-- families.created_by: text
-- family_members.user_id: text
