# 📋 TaskFlow — Telegram Mini App для управления задачами

Полноценное приложение для ведения и постановки задач с синхронизацией между устройствами, семейным доступом и автоматическими напоминаниями через Telegram Bot.

## ✨ Возможности

- 📝 **Создание задач** с приоритетами, категориями, дедлайнами и тегами
- 🔔 **Автоматические напоминания** через Telegram Bot (работают даже когда приложение закрыто!)
- 🔄 **Синхронизация в реальном времени** между всеми устройствами
- 👨‍👩‍👧 **Семейные задачи** — создавайте общие списки задач с близкими
- 🔒 **Контроль доступа** — только разрешённые пользователи могут использовать приложение
- 📊 **Аналитика и статистика** выполнения задач
- 🔍 **Поиск и фильтрация** по статусу, приоритету, тегам
- 📱 **Адаптивный дизайн** для Telegram Mini App
- 🎯 **Отслеживание прогресса** с визуализацией

## 🚀 Публикация

### 1. Создайте репозиторий на GitHub

Перейдите на [github.com/new](https://github.com/new) и создайте новый репозиторий.

### 2. Инициализируйте Git и отправьте код

```bash
# В папке проекта
git init
git add .
git commit -m "Initial commit: TaskFlow Telegram Mini App"
git branch -M main
git remote add origin https://github.com/<ВАШ_ЛОГИН>/<ИМЯ_РЕПО>.git
git push -u origin main
```

### 3. Настройте vite.config.js для GitHub Pages

Добавьте `base` в конфигурацию (имя вашего репозитория):

```js
export default defineConfig({
  base: '/<ИМЯ_РЕПО>/',  // ← добавьте эту строку
  plugins: [react(), tailwindcss()],
  // ...
});
```

### 4. Включите GitHub Pages

1. Откройте **Settings → Pages** в вашем репозитории
2. В разделе **Source** выберите **GitHub Actions**
3. После push в `main` начнётся автоматический деплой

### 5. Подключите к Telegram Bot

1. Откройте [@BotFather](https://t.me/BotFather) в Telegram
2. Создайте нового бота: `/newbot`
3. Настройте Mini App: `/newapp`
4. Укажите URL: `https://<ВАШ_ЛОГИН>.github.io/<ИМЯ_РЕПО>/`

## 🛠 Технологии

- **Frontend**: React 18 + TypeScript, Vite, Tailwind CSS 4, Framer Motion
- **Backend**: Supabase (PostgreSQL, Realtime, Edge Functions)
- **Notifications**: Telegram Bot API
- **Icons**: Lucide React
- **Dates**: date-fns
- **Integration**: Telegram Web App API

## 📖 Документация

Подробная инструкция по настройке: [SETUP_GUIDE.md](./SETUP_GUIDE.md)
