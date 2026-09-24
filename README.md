# 📋 TaskFlow — Telegram Mini App для управления задачами

Приложение для ведения и постановки задач с напоминаниями и отслеживанием прогресса.

## ✨ Возможности

- 📝 Создание задач с приоритетами, категориями и дедлайнами
- 🔔 Система напоминаний (push-уведомления)
- 📊 Аналитика и статистика выполнения
- 🔍 Поиск и фильтрация задач
- 📱 Адаптивный дизайн для Telegram
- 💾 Хранение данных в LocalStorage
- 🎯 Отслеживание прогресса

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

- React 18 + TypeScript
- Vite
- Tailwind CSS 4
- Framer Motion
- Telegram Web App API
- date-fns
- Lucide Icons
