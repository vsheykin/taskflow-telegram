# 🚀 Полная настройка TaskFlow

## 📋 Что вам нужно

1. **Supabase аккаунт** (бесплатно) — для базы данных и синхронизации
2. **Telegram Bot Token** — для отправки напоминаний
3. **Vercel/GitHub** — для хостинга

---

## Шаг 1: Настройка Supabase

### 1.1 Создайте проект

1. Зайдите на [supabase.com](https://supabase.com)
2. Нажмите **New Project**
3. Заполните:
   - **Name**: `taskflow`
   - **Database Password**: (сохраните его!)
   - **Region**: выберите ближайший (Frankfurt для России)
4. Нажмите **Create new project**
5. Подождите 1-2 минуты

### 1.2 Выполните SQL-скрипт

1. В Supabase Dashboard откройте **SQL Editor** (иконка `</>` в меню)
2. Нажмите **New query**
3. Скопируйте весь код из файла `supabase/schema.sql`
4. Вставьте в редактор и нажмите **Run**
5. Должно появиться: `Success. No rows returned`

### 1.3 Получите ключи API

1. Откройте **Settings** → **API**
2. Скопируйте:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### 1.4 Создайте .env файл

В корне проекта создайте файл `.env`:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Замените значения на свои из шага 1.3.

---

## Шаг 2: Настройка Telegram Bot для напоминаний

### 2.1 Получите токен бота

Если у вас ещё нет бота:
1. Откройте [@BotFather](https://t.me/BotFather)
2. Отправьте `/newbot`
3. Следуйте инструкциям
4. Сохраните токен вида: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`

### 2.2 Добавьте переменные окружения в Supabase

1. В Supabase Dashboard откройте **Settings** → **Secrets**
2. Добавьте:
   - **TELEGRAM_BOT_TOKEN**: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`
   - **SUPABASE_URL**: `https://xxxxx.supabase.co`
   - **SUPABASE_SERVICE_ROLE_KEY**: (найдите в Settings → API → service_role key)

### 2.3 Создайте Edge Function для напоминаний

1. Откройте **Edge Functions** в меню Supabase
2. Нажмите **New Function**
3. Название: `send-reminders`
4. Скопируйте код из `supabase/functions/send-reminders/index.ts`
5. Вставьте и нажмите **Deploy**

### 2.4 Настройте Cron для автоматических напоминаний

1. Откройте **Database** → **Triggers** (или **Scheduled Functions**)
2. Создайте новый Cron Job:
   - **Name**: `send-task-reminders`
   - **Schedule**: `*/5 * * * *` (каждые 5 минут)
   - **Function**: `send-reminders`

Теперь напоминания будут отправляться автоматически даже когда приложение закрыто!

---

## Шаг 3: Добавление пользователей (Whitelist)

### 3.1 Добавьте себя и жену в базу

1. Откройте **Table Editor** в Supabase
2. Выберите таблицу `allowed_users`
3. Нажмите **Insert** → **New row**
4. Заполните:
   - **telegram_id**: ваш Telegram ID (число)
   - **added_by**: оставьте пустым
5. Повторите для жены

### 3.2 Как узнать свой Telegram ID

**Способ 1**: Через бота [@userinfobot](https://t.me/userinfobot)
1. Откройте бота
2. Нажмите **Start**
3. Он покажет ваш ID

**Способ 2**: Через браузер
1. Откройте ваш Mini App
2. Нажмите F12 → Console
3. Введите: `Telegram.WebApp.initDataUnsafe.user.id`
4. Скопируйте число

---

## Шаг 4: Создание семьи

### 4.1 Создайте семью через приложение

После того как приложение заработает с Supabase:

1. Откройте Mini App
2. Перейдите на вкладку **Семья** (иконка 👥)
3. Нажмите **Создать семью**
4. Введите название (например: "Наша семья")
5. Скопируйте код приглашения
6. Отправьте код жене

### 4.2 Жена присоединяется к семье

1. Жена открывает Mini App
2. Перейдёт на вкладку **Семья**
3. Нажимает **Присоединиться**
4. Вводит код приглашения
5. Готово! Теперь вы видите задачи друг друга

---

## Шаг 5: Деплой обновлённого приложения

### 5.1 Закоммитьте изменения

```bash
git add .
git commit -m "Add Supabase integration with sync and reminders"
git push
```

### 5.2 Добавьте переменные окружения в Vercel

1. Откройте [vercel.com](https://vercel.com) → ваш проект
2. **Settings** → **Environment Variables**
3. Добавьте:
   - `VITE_SUPABASE_URL` = `https://xxxxx.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `eyJhbGc...`
4. Нажмите **Redeploy**

---

## ✅ Проверка работы

### Синхронизация между устройствами

1. Откройте приложение на компьютере
2. Создайте задачу
3. Откройте приложение на телефоне
4. Задача должна появиться автоматически (realtime)

### Напоминания

1. Создайте задачу с напоминанием через 1 минуту
2. Закройте приложение
3. Через минуту бот должен отправить сообщение с напоминанием

### Семейные задачи

1. Создайте задачу на компьютере
2. Жена открывает приложение на телефоне
3. Она видит вашу задачу
4. Она может отметить её как выполненную
5. У вас тоже обновится статус

---

## 🔧 Решение проблем

### Задачи не синхронизируются

1. Проверьте, что `.env` файл создан и содержит правильные ключи
2. Проверьте, что переменные добавлены в Vercel
3. Пересоберите и задеплойте заново

### Напоминания не приходят

1. Проверьте, что Edge Function задеплена
2. Проверьте, что Cron настроен
3. Откройте логи Edge Function в Supabase
4. Убедитесь, что `reminder_date` в прошлом

### Доступ запрещён

1. Проверьте, что ваш Telegram ID добавлен в `allowed_users`
2. Проверьте, что ID правильный (число, не строка)

---

## 📊 Структура базы данных

```
profiles (пользователи)
  ├─ telegram_id
  ├─ username
  └─ first_name, last_name

tasks (задачи)
  ├─ user_id → profiles.id
  ├─ title, description
  ├─ priority, status, category
  ├─ due_date, reminder_date
  └─ reminder_sent

families (семьи)
  ├─ name
  ├─ invite_code
  └─ created_by → profiles.id

family_members (участники семей)
  ├─ family_id → families.id
  ├─ user_id → profiles.id
  └─ role (owner/member)

allowed_users (whitelist)
  └─ telegram_id
```

---

## 🎯 Следующие улучшения

- [ ] Push-уведомления через Service Worker
- [ ] Экспорт задач в CSV
- [ ] Повторяющиеся задачи
- [ ] Подзадачи
- [ ] Приоритеты с цветами
- [ ] Темная тема
- [ ] Мультиязычность

---

## 📞 Поддержка

Если возникли вопросы:
1. Проверьте логи в Supabase Dashboard → Logs
2. Проверьте консоль браузера (F12)
3. Убедитесь, что все переменные окружения установлены

Удачи! 🚀
