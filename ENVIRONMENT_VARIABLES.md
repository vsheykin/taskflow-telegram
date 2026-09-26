# 📋 Итоговый список переменных окружения

## 🎯 GitHub Secrets (для деплоя)

Все переменные добавляются в **Settings → Secrets and variables → Actions**

### Обязательные переменные (3 шт.)

| Имя переменной | Описание | Где взять |
|----------------|----------|-----------|
| `VITE_SUPABASE_URL` | URL вашего Supabase проекта | Supabase Dashboard → Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Публичный ключ Supabase | Supabase Dashboard → Settings → API → anon public |
| `VITE_TELEGRAM_BOT_TOKEN` | Токен Telegram бота для напоминаний | [@BotFather](https://t.me/BotFather) → /mybots → API Token |

### Примеры значений

```bash
# VITE_SUPABASE_URL
https://fgyyzyruhwdbvzvtojoy.supabase.co

# VITE_SUPABASE_ANON_KEY
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZneXl6eXJ1aHdkYnZ6dnRvam95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyNzg2MTksImV4cCI6MjEwNTg1NDYxOX0.mLbiw3OYP-4TL6WlVp6GS8-EXOK0fekLyktedoj_7vs

# VITE_TELEGRAM_BOT_TOKEN
123456789:ABCdefGHIjklMNOpqrsTUVwxyz
```

---

## 🔧 Как добавить секреты в GitHub

### Пошаговая инструкция

1. Откройте ваш репозиторий на GitHub
2. Перейдите в **Settings** (вверху справа)
3. В левом меню выберите **Secrets and variables** → **Actions**
4. Нажмите **New repository secret**
5. Для каждой переменной:
   - Введите **Name** (например, `VITE_SUPABASE_URL`)
   - Введите **Secret** (значение из таблицы выше)
   - Нажмите **Add secret**
6. Повторите для всех 3 переменных

### Проверка

После добавления всех секретов вы должны увидеть:
```
Repository secrets
├── VITE_SUPABASE_URL
├── VITE_SUPABASE_ANON_KEY
└── VITE_TELEGRAM_BOT_TOKEN
```

---

## 📦 Как это работает

### При деплое (GitHub Actions)

1. GitHub читает секреты из Settings → Secrets
2. Создаёт временный `.env` файл с этими значениями
3. Vite встраивает значения в итоговый JavaScript при сборке
4. Файл `.env` **не попадает** в репозиторий (добавлен в `.gitignore`)
5. Секреты **не видны** в коде на GitHub

### В приложении

```typescript
// src/supabase.ts
export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
export const TELEGRAM_BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN || '';
```

Переменные встраиваются в JavaScript **только при сборке**. В исходном коде их нет.

---

## 🔐 Безопасность

### ✅ Что безопасно

- Секреты хранятся в GitHub Secrets (зашифрованы)
- Секреты не видны в репозитории
- Секреты не видны в логах сборки (мы их маскируем)
- `anon key` Supabase — это **публичный ключ**, предназначенный для клиентского использования

### ⚠️ Что нужно понимать

- После сборки токен бота **будет виден** в итоговом JavaScript файле
- Это особенность всех клиентских приложений (SPA)
- Для **личного/семейного** использования это приемлемо
- Для **публичного** приложения с тысячами пользователей нужен backend-прокси

### 🛡️ Защита на уровне Supabase

- Включён **RLS (Row Level Security)** на всех таблицах
- Используется **whitelist** (`allowed_users`) для контроля доступа
- `anon key` может только читать/писать данные согласно RLS политикам
- `service_role key` (секретный) нужен только для Edge Functions

---

## 🧪 Проверка работы

### После деплоя

1. Откройте сайт в браузере
2. Нажмите **F12** → вкладка **Console**
3. Найдите строки:
   ```
   [TaskFlow] ✅ Supabase configured: true
   [TaskFlow] ✅ Supabase URL: https://fgyyzyruhwdbvzvtojoy.supabase.co
   ```
4. Если видите `true` — переменные загрузились правильно

### Проверка в логах GitHub Actions

1. Откройте **Actions** в репозитории
2. Нажмите на последний workflow run
3. Разверните шаг **Create .env file from secrets**
4. Должны увидеть:
   ```
   ✅ .env file created with secrets
   VITE_SUPABASE_URL: https://fgyyzyruhwdbvzvtojoy...
   VITE_SUPABASE_ANON_KEY: eyJhbGciOiJIUzI1NiIs...
   VITE_TELEGRAM_BOT_TOKEN: SET
   ```

---

## 🚨 Частые проблемы

### Проблема 1: "Supabase configured: false"

**Причина:** Секреты не добавлены или добавлены с неправильными именами

**Решение:**
- Проверьте, что имена точно: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_TELEGRAM_BOT_TOKEN`
- Убедитесь, что нет пробелов в начале/конце
- Пересоберите проект (Redeploy)

### Проблема 2: "Напоминания не отправляются"

**Причина:** `VITE_TELEGRAM_BOT_TOKEN` не установлен или неправильный

**Решение:**
- Проверьте секрет `VITE_TELEGRAM_BOT_TOKEN`
- Убедитесь, что токен получен от [@BotFather](https://t.me/BotFather)
- Проверьте, что бот запущен (напишите ему /start)

### Проблема 3: "Unauthorized" при запросах к Supabase

**Причина:** Неправильный `VITE_SUPABASE_ANON_KEY`

**Решение:**
- Скопируйте ключ заново из Supabase Dashboard → Settings → API
- Убедитесь, что это **anon public** key (не service_role!)
- Ключ должен начинаться с `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9`

---

## 📊 Итоговая таблица

| Переменная | Обязательна | Где используется | Безопасность |
|------------|-------------|------------------|--------------|
| `VITE_SUPABASE_URL` | ✅ Да | Подключение к Supabase | ✅ Публичный URL |
| `VITE_SUPABASE_ANON_KEY` | ✅ Да | API запросы к Supabase | ✅ Публичный ключ (предназначен для клиента) |
| `VITE_TELEGRAM_BOT_TOKEN` | ✅ Да | Отправка напоминаний | ⚠️ Видим в JS после сборки, но приемлемо для личного использования |

---

## 🎯 Быстрый чеклист

- [ ] Создан проект в Supabase
- [ ] Выполнен SQL скрипт для создания таблиц
- [ ] Добавлены пользователи в `allowed_users`
- [ ] Создан Telegram бот через @BotFather
- [ ] Добавлены 3 секрета в GitHub:
  - [ ] `VITE_SUPABASE_URL`
  - [ ] `VITE_SUPABASE_ANON_KEY`
  - [ ] `VITE_TELEGRAM_BOT_TOKEN`
- [ ] Запушен код в репозиторий
- [ ] Деплой прошёл успешно
- [ ] Приложение открывается
- [ ] Задачи создаются и сохраняются
- [ ] Напоминания отправляются в Telegram

---

## 📞 Поддержка

Если возникли проблемы:

1. Проверьте логи в GitHub Actions
2. Проверьте консоль браузера (F12)
3. Проверьте логи в Supabase Dashboard → Logs
4. Убедитесь, что все 3 секрета добавлены правильно

Удачи! 🚀
