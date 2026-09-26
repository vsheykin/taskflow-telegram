# 🔧 Диагностика проблем с напоминаниями

## Проблема 1: GitHub Actions не работает

### Проверка секрета

1. Откройте ваш репозиторий на GitHub
2. Перейдите в **Settings** → **Secrets and variables** → **Actions**
3. Убедитесь, что есть секрет `SUPABASE_SERVICE_ROLE_KEY`
4. Значение должно быть **service_role key** из Supabase (НЕ anon key!)

### Как получить service_role key

1. Откройте [Supabase Dashboard](https://supabase.com/dashboard/project/fgyyzyruhwdbvzvtojoy)
2. Перейдите в **Project Settings** → **API**
3. Найдите **Service Role Key** (секретный ключ)
4. Скопируйте его полностью

⚠️ **Важно:** Не путайте с:
- ❌ anon key (публичный ключ)
- ❌ API Key
- ✅ Service Role Key (секретный ключ)

### Проверка workflow

1. Откройте **Actions** в репозитории
2. Найдите workflow **Send Task Reminders**
3. Нажмите на последний запуск
4. Проверьте логи:
   - Должно быть: `✅ Secret exists (length: XXX)`
   - Если: `❌ Secret SUPABASE_SERVICE_ROLE_KEY is empty!` — секрет не добавлен

---

## Проблема 2: Функция не находит задачи

### Диагностика через SQL

Выполните в Supabase → SQL Editor скрипт из файла `supabase/diagnostics-reminders.sql`:

```sql
-- Проверить все задачи с напоминаниями
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
```

### Условия для отправки напоминания

Задача должна соответствовать **ВСЕМ** условиям:

1. ✅ `reminder_date IS NOT NULL` — дата напоминания установлена
2. ✅ `reminder_date <= NOW()` — дата в прошлом или сейчас
3. ✅ `reminder_sent = false` — ещё не отправлено
4. ✅ `status IN ('new', 'in_progress')` — задача активна

### Проверка профиля пользователя

```sql
-- Проверить профили
SELECT telegram_id, first_name FROM profiles;

-- Проверить соответствие
SELECT 
  t.id,
  t.title,
  t.user_id,
  p.telegram_id,
  CASE 
    WHEN p.telegram_id IS NULL THEN '❌ Профиль не найден'
    ELSE '✅ Профиль найден'
  END as status
FROM tasks t
LEFT JOIN profiles p ON t.user_id::bigint = p.telegram_id
WHERE t.reminder_date IS NOT NULL;
```

### Возможные проблемы

#### Проблема A: reminder_date в будущем

```sql
-- Проверить
SELECT id, title, reminder_date, NOW() 
FROM tasks 
WHERE reminder_date > NOW();

-- Решение: обновить дату
UPDATE tasks 
SET reminder_date = NOW() - INTERVAL '5 minutes'
WHERE id = 'YOUR_TASK_ID';
```

#### Проблема B: reminder_sent = true

```sql
-- Проверить
SELECT id, title, reminder_sent 
FROM tasks 
WHERE reminder_sent = true;

-- Решение: сбросить флаг
UPDATE tasks 
SET reminder_sent = false
WHERE id = 'YOUR_TASK_ID';
```

#### Проблема C: status = 'completed' или 'cancelled'

```sql
-- Проверить
SELECT id, title, status 
FROM tasks 
WHERE status NOT IN ('new', 'in_progress');

-- Решение: изменить статус
UPDATE tasks 
SET status = 'new'
WHERE id = 'YOUR_TASK_ID';
```

#### Проблема D: Нет профиля пользователя

```sql
-- Проверить
SELECT * FROM profiles WHERE telegram_id = 271057229;

-- Решение: создать профиль
INSERT INTO profiles (telegram_id, first_name)
VALUES (271057229, 'Ваше Имя');
```

#### Проблема E: Неправильный тип user_id

```sql
-- Проверить типы
SELECT 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'tasks' AND column_name = 'user_id';

-- Должно быть: data_type = 'text'

-- Если UUID, исправить:
ALTER TABLE tasks ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
```

---

## Тестирование

### Шаг 1: Создать тестовую задачу

```sql
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
  '🧪 Тестовая задача',
  'Тест напоминания',
  'medium',
  'new',
  'other',
  'personal',
  '271057229',
  NOW() - INTERVAL '5 minutes',
  false,
  NOW()
);
```

### Шаг 2: Проверить задачу

```sql
SELECT * FROM tasks 
WHERE title = '🧪 Тестовая задача';
```

Должно показать:
- `reminder_date` — в прошлом
- `reminder_sent` — false
- `status` — 'new'

### Шаг 3: Запустить функцию

**Локально:**
```bash
curl -X POST https://fgyyzyruhwdbvzvtojoy.supabase.co/functions/v1/send-reminders \
  -H "Authorization: Bearer ВАШ_SERVICE_ROLE_KEY"
```

**Через GitHub Actions:**
1. Откройте **Actions** → **Send Task Reminders**
2. Нажмите **Run workflow** → **Run workflow**

### Шаг 4: Проверить логи

Откройте Supabase → **Logs** → **Edge Functions** → `send-reminders`

Должны увидеть:
```
🔔 Запуск проверки напоминаний...
🕐 Текущее время: 2026-09-26T...
📊 Всего задач в БД: X
📋 Примеры задач: [...]
📋 Найдено задач для напоминания: 1
✅ Напоминание отправлено для задачи: 🧪 Тестовая задача
📊 Итого: отправлено 1, ошибок 0
```

### Шаг 5: Проверить Telegram

Должно прийти сообщение от бота:
```
🔔 Напоминание о задаче

👋 Привет, Ваше Имя!

📝 🧪 Тестовая задача

Тест напоминания
```

### Шаг 6: Проверить, что reminder_sent обновлён

```sql
SELECT id, title, reminder_sent 
FROM tasks 
WHERE title = '🧪 Тестовая задача';
```

Должно показать: `reminder_sent = true`

---

## Обновление кода Edge Function

После внесения изменений в `supabase/functions/send-reminders/index.ts`:

1. Откройте Supabase → **Edge Functions** → `send-reminders`
2. Нажмите **Edit code**
3. Замените весь код на содержимое файла `supabase/functions/send-reminders/index.ts`
4. Нажмите **Deploy**

---

## Обновление GitHub Actions

После внесения изменений в `.github/workflows/reminders.yml`:

```bash
git add .github/workflows/reminders.yml
git commit -m "Fix: add secret check to reminders workflow"
git push origin main
```

---

## Чеклист

- [ ] Секрет `SUPABASE_SERVICE_ROLE_KEY` добавлен в GitHub
- [ ] Код Edge Function обновлён в Supabase
- [ ] Профиль пользователя создан в таблице `profiles`
- [ ] Тестовая задача создана с правильными параметрами
- [ ] Функция возвращает `sent: 1`
- [ ] Сообщение получено в Telegram
- [ ] `reminder_sent` обновлён на `true`
- [ ] GitHub Actions workflow запушен
- [ ] Workflow запускается автоматически каждые 5 минут

---

## Частые ошибки

### Ошибка: "Unauthorized"

**Причина:** Неправильный ключ авторизации

**Решение:** Используйте **service_role key**, а не anon key

### Ошибка: "No reminders to send"

**Причина:** Нет задач, соответствующих условиям

**Решение:** Проверьте условия фильтрации (см. выше)

### Ошибка: "Нет telegram_id для задачи"

**Причина:** Профиль пользователя не найден

**Решение:** Создайте профиль в таблице `profiles`

### Ошибка: "Secret is empty"

**Причина:** Секрет не добавлен в GitHub

**Решение:** Добавьте `SUPABASE_SERVICE_ROLE_KEY` в Settings → Secrets → Actions

---

## Поддержка

Если проблема не решена:

1. Пришлите скриншот логов Edge Function из Supabase
2. Пришлите результат SQL-запроса диагностики
3. Пришлите скриншот настроек GitHub Secrets
4. Опишите, что именно не работает
