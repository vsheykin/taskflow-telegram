# Настройка контроля доступа (Whitelist)

## 📋 Что это?

Система whitelist позволяет ограничить доступ к приложению только определённым пользователям. Только пользователи из списка `allowed_users` смогут использовать приложение.

## 🔧 Настройка

### Шаг 1: Создайте таблицу allowed_users

1. Откройте Supabase Dashboard → SQL Editor
2. Скопируйте код из файла `supabase/create-allowed-users.sql`
3. Вставьте и нажмите **Run**

### Шаг 2: Узнайте свой Telegram ID

**Способ 1: Через бота**
1. Откройте [@userinfobot](https://t.me/userinfobot) в Telegram
2. Нажмите **Start**
3. Бот покажет ваш ID (например: `123456789`)

**Способ 2: Через приложение**
1. Откройте приложение в Telegram
2. Если доступ запрещён, на экране будет показан ваш Telegram ID
3. Скопируйте его

### Шаг 3: Добавьте себя в whitelist

1. Откройте Supabase Dashboard → SQL Editor
2. Выполните запрос:

```sql
INSERT INTO allowed_users (telegram_id, username, first_name, added_by)
VALUES (
  123456789,  -- Ваш Telegram ID
  'your_username',
  'Ваше Имя',
  'admin'
);
```

Замените значения на свои реальные данные.

### Шаг 4: Добавьте жену в whitelist

Повторите шаг 3 для жены:

```sql
INSERT INTO allowed_users (telegram_id, username, first_name, added_by)
VALUES (
  987654321,  -- Telegram ID жены
  'wife_username',
  'Имя Жены',
  'admin'
);
```

### Шаг 5: Проверьте доступ

1. Откройте приложение заново
2. Если всё настроено правильно, вы увидите главный экран
3. Если доступ запрещён, проверьте:
   - Правильность Telegram ID
   - Что запись добавлена в таблицу `allowed_users`

## 🔍 Проверка whitelist

Чтобы посмотреть всех разрешённых пользователей:

```sql
SELECT * FROM allowed_users;
```

## 🗑️ Удаление пользователя

Чтобы удалить пользователя из whitelist:

```sql
DELETE FROM allowed_users WHERE telegram_id = 123456789;
```

## ⚠️ Важно

- Если таблица `allowed_users` пуста, **все пользователи будут иметь доступ**
- Если таблица содержит хотя бы одну запись, доступ будут иметь **только пользователи из списка**
- Telegram ID — это число, не строка (без кавычек)

## 🆘 Если не работает

1. Проверьте логи в консоли браузера (F12):
   - `🔐 Проверяю доступ для telegramId: ...`
   - `🔐 Результат проверки доступа: true/false`

2. Проверьте таблицу `allowed_users` в Supabase:
   - Table Editor → allowed_users
   - Убедитесь, что ваш telegram_id там есть

3. Проверьте, что SQL-скрипт `create-allowed-users.sql` выполнен

## 📊 Управление через Supabase Dashboard

Вы также можете управлять whitelist через интерфейс:

1. Откройте Supabase Dashboard → Table Editor
2. Выберите таблицу `allowed_users`
3. Нажмите **Insert** для добавления пользователя
4. Заполните поля:
   - `telegram_id`: число (например, `123456789`)
   - `username`: текст (например, `john_doe`)
   - `first_name`: текст (например, `Иван`)
   - `added_by`: текст (например, `admin`)
5. Нажмите **Save**
