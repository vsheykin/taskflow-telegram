-- Диагностика напоминаний

-- 1. Проверить все задачи с напоминаниями
SELECT 
  id,
  title,
  user_id,
  reminder_date,
  reminder_sent,
  status,
  NOW() as current_time,
  reminder_date <= NOW() as is_past_due
FROM tasks
WHERE reminder_date IS NOT NULL
ORDER BY reminder_date DESC;

-- 2. Проверить задачи, которые должны быть отправлены
SELECT 
  id,
  title,
  user_id,
  reminder_date,
  reminder_sent,
  status
FROM tasks
WHERE reminder_date <= NOW()
  AND reminder_sent = false
  AND status IN ('new', 'in_progress');

-- 3. Проверить профили пользователей
SELECT 
  telegram_id,
  first_name,
  last_name,
  username
FROM profiles;

-- 4. Проверить соответствие user_id в задачах и telegram_id в профилях
SELECT 
  t.id as task_id,
  t.title,
  t.user_id,
  p.telegram_id,
  p.first_name,
  CASE 
    WHEN p.telegram_id IS NULL THEN '❌ Профиль не найден'
    ELSE '✅ Профиль найден'
  END as profile_status
FROM tasks t
LEFT JOIN profiles p ON t.user_id::bigint = p.telegram_id
WHERE t.reminder_date IS NOT NULL
  AND t.reminder_date <= NOW()
  AND t.reminder_sent = false
  AND t.status IN ('new', 'in_progress');

-- 5. Создать тестовую задачу с напоминанием в прошлом
INSERT INTO tasks (
  title,
  description,
  priority,
  status,
  category,
  scope,
  user_id,
  reminder_date,
  reminder_sent,
  created_at
) VALUES (
  '🧪 Тестовая задача с напоминанием',
  'Это тестовая задача для проверки работы напоминаний',
  'medium',
  'new',
  'other',
  'personal',
  '271057229',
  NOW() - INTERVAL '5 minutes',
  false,
  NOW()
)
RETURNING id, title, reminder_date, reminder_sent;

-- 6. Обновить существующую задачу для теста
UPDATE tasks
SET 
  reminder_date = NOW() - INTERVAL '5 minutes',
  reminder_sent = false,
  status = 'new'
WHERE id = 'YOUR_TASK_ID_HERE'
RETURNING id, title, reminder_date, reminder_sent, status;

-- 7. Проверить, что напоминание отправлено
SELECT 
  id,
  title,
  reminder_date,
  reminder_sent,
  status
FROM tasks
WHERE reminder_sent = true
ORDER BY reminder_date DESC
LIMIT 10;
