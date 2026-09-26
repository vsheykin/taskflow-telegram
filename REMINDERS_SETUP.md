# 📋 Настройка напоминаний через Supabase

## 🎯 Что нужно сделать

Напоминания работают через **Supabase Edge Functions** + **Telegram Bot API**.

---

## 📝 Пошаговая инструкция

### Шаг 1: Получите токен Telegram Bot

1. Откройте [@BotFather](https://t.me/BotFather) в Telegram
2. Отправьте команду `/mybots`
3. Выберите вашего бота
4. Нажмите **API Token**
5. Скопируйте токен (формат: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

---

### Шаг 2: Добавьте секреты в Supabase

1. Откройте [Supabase Dashboard](https://app.supabase.com)
2. Выберите ваш проект
3. Перейдите в **Settings** → **Secrets**
4. Добавьте три секрета:

| Имя секрета | Значение |
|-------------|----------|
| `TELEGRAM_BOT_TOKEN` | Токен вашего бота из BotFather |
| `SUPABASE_URL` | URL вашего проекта (из Settings → API) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (из Settings → API) |

⚠️ **Важно:** Используйте **service_role key**, а не anon key!

---

### Шаг 3: Создайте Edge Function

#### Вариант A: Через Supabase CLI (рекомендуется)

1. Установите Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Войдите в аккаунт:
   ```bash
   supabase login
   ```

3. Свяжите проект:
   ```bash
   supabase link --project-ref fgyyzyruhwdbvzvtojoy
   ```

4. Создайте функцию:
   ```bash
   supabase functions new send-reminders
   ```

5. Скопируйте код из файла `supabase/functions/send-reminders/index.ts` в созданную папку

6. Задеплойте функцию:
   ```bash
   supabase functions deploy send-reminders
   ```

#### Вариант B: Через Supabase Dashboard

1. Откройте **Edge Functions** в меню
2. Нажмите **New Function**
3. Название: `send-reminders`
4. Скопируйте код из файла `supabase/functions/send-reminders/index.ts`
5. Нажмите **Deploy**

---

### Шаг 4: Настройте Cron Job

#### Вариант A: Через pg_cron (SQL)

Выполните в Supabase → SQL Editor:

```sql
-- Включаем расширение pg_cron (если ещё не включено)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Создаём cron job для запуска каждые 5 минут
SELECT cron.schedule(
  'send-task-reminders',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://fgyyzyruhwdbvzvtojoy.supabase.co/functions/v1/send-reminders',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  );
  $$
);

-- Проверить созданные jobs
SELECT * FROM cron.job;
```

⚠️ Замените `YOUR_SERVICE_ROLE_KEY` на ваш service_role key!

#### Вариант B: Через GitHub Actions (альтернатива)

Создайте файл `.github/workflows/reminders.yml`:

```yaml
name: Send Task Reminders

on:
  schedule:
    - cron: '*/5 * * * *'  # Каждые 5 минут
  workflow_dispatch:  # Ручной запуск

jobs:
  send-reminders:
    runs-on: ubuntu-latest
    steps:
      - name: Call Supabase Edge Function
        run: |
          curl -X POST https://fgyyzyruhwdbvzvtojoy.supabase.co/functions/v1/send-reminders \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            -H "Content-Type: application/json"
```

Добавьте секрет `SUPABASE_SERVICE_ROLE_KEY` в GitHub Secrets.

---

### Шаг 5: Проверьте работу

1. Создайте задачу с напоминанием:
   - Откройте приложение
   - Создайте задачу
   - Установите дату напоминания на 1-2 минуты вперёд
   - Сохраните

2. Подождите 5-10 минут

3. Проверьте логи:
   - Откройте Supabase → **Logs** → **Edge Functions**
   - Найдите функцию `send-reminders`
   - Должны увидеть логи: `🔔 Запуск проверки напоминаний...`

4. Проверьте Telegram:
   - Бот должен отправить сообщение с напоминанием

---

## 🔍 Диагностика

### Проверка Edge Function

Выполните в терминале:

```bash
curl -X POST https://fgyyzyruhwdbvzvtojoy.supabase.co/functions/v1/send-reminders \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

Должны получить ответ:
```json
{
  "message": "Reminders processed",
  "sent": 0,
  "failed": 0
}
```

### Проверка Cron Job

```sql
-- Проверить статус cron jobs
SELECT * FROM cron.job;

-- Проверить логи выполнения
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```

### Проверка задач с напоминаниями

```sql
-- Найти задачи с напоминаниями
SELECT 
  id,
  title,
  reminder_date,
  reminder_sent,
  user_id
FROM tasks
WHERE reminder_date IS NOT NULL
  AND reminder_sent = false
ORDER BY reminder_date;
```

---

## ⚠️ Частые проблемы

### Проблема 1: "relation cron.job does not exist"

**Решение:** Включите расширение pg_cron:
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

### Проблема 2: "permission denied for schema cron"

**Решение:** pg_cron доступен только в Supabase Pro план. Используйте GitHub Actions (Вариант B).

### Проблема 3: Напоминания не отправляются

**Проверьте:**
1. Токен бота правильный?
2. Секреты добавлены в Supabase?
3. Edge Function задеплоена?
4. Cron job создан и активен?
5. Бот запущен (нажмите /start у бота)?

### Проблема 4: "Unauthorized" при вызове функции

**Решение:** Используйте **service_role key**, а не anon key!

---

## 📊 Мониторинг

### Логи Edge Function

Откройте Supabase → **Logs** → **Edge Functions** → выберите функцию `send-reminders`

### Статистика напоминаний

```sql
-- Количество отправленных напоминаний
SELECT 
  COUNT(*) as total_sent,
  COUNT(*) FILTER (WHERE reminder_sent = true) as sent,
  COUNT(*) FILTER (WHERE reminder_sent = false AND reminder_date < NOW()) as pending
FROM tasks
WHERE reminder_date IS NOT NULL;
```

---

## 🎯 Итоговая архитектура

```
┌─────────────────┐
│  Cron Job       │ (каждые 5 минут)
│  (pg_cron)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Edge Function   │ (send-reminders)
│ - Проверяет БД  │
│ - Находит задачи│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Telegram Bot API│ (отправка сообщений)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Пользователь    │ (получает уведомление)
└─────────────────┘
```

---

## ✅ Чеклист

- [ ] Получен токен Telegram Bot
- [ ] Добавлены секреты в Supabase (TELEGRAM_BOT_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
- [ ] Создана Edge Function `send-reminders`
- [ ] Настроен Cron Job (pg_cron или GitHub Actions)
- [ ] Проверена работа вручную (curl)
- [ ] Создана тестовая задача с напоминанием
- [ ] Получено тестовое уведомление в Telegram

---

## 🆘 Поддержка

Если возникли проблемы:
1. Проверьте логи Edge Function в Supabase
2. Проверьте логи Cron Job: `SELECT * FROM cron.job_run_details`
3. Проверьте, что бот запущен (нажмите /start)
4. Убедитесь, что используете service_role key

Удачи! 🚀
