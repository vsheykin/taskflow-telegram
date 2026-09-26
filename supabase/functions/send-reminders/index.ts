// Edge Function для отправки напоминаний о задачах
// Размещается в Supabase Dashboard → Edge Functions

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

serve(async (req) => {
  try {
    console.log('🔔 Запуск проверки напоминаний...')

    // Получаем задачи с напоминаниями, которые нужно отправить
    const now = new Date().toISOString()
    console.log('🕐 Текущее время:', now)
    
    // Сначала получаем ВСЕ задачи для отладки
    const { data: allTasks, error: allError } = await supabase
      .from('tasks')
      .select('*')
    
    if (allError) {
      console.error('❌ Ошибка получения всех задач:', allError)
    } else {
      console.log(`📊 Всего задач в БД: ${allTasks?.length || 0}`)
      if (allTasks && allTasks.length > 0) {
        console.log('📋 Примеры задач:', allTasks.slice(0, 3).map(t => ({
          id: t.id,
          title: t.title,
          reminder_date: t.reminder_date,
          reminder_sent: t.reminder_sent,
          status: t.status,
          user_id: t.user_id
        })))
      }
    }
    
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .lte('reminder_date', now)
      .eq('reminder_sent', false)
      .in('status', ['new', 'in_progress'])

    if (error) {
      console.error('❌ Ошибка получения задач:', error)
      throw error
    }

    if (!tasks || tasks.length === 0) {
      console.log('ℹ️ Нет задач для напоминания')
      console.log('🔍 Условия фильтрации:')
      console.log('  - reminder_date <= NOW()')
      console.log('  - reminder_sent = false')
      console.log('  - status IN (new, in_progress)')
      return new Response(JSON.stringify({ message: 'No reminders to send' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    console.log(`📋 Найдено задач для напоминания: ${tasks.length}`)

    let sentCount = 0
    let failedCount = 0

    for (const task of tasks) {
      // Получаем информацию о пользователе отдельно (без .single())
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('telegram_id, first_name')
        .eq('telegram_id', task.user_id)

      const profile = profiles && profiles.length > 0 ? profiles[0] : null
      const telegramId = profile?.telegram_id
      const userName = profile?.first_name || 'Пользователь'

      if (!telegramId) {
        console.warn(`⚠️ Нет telegram_id для задачи ${task.id}`)
        continue
      }

      try {
        // Формируем сообщение
        const message = `🔔 <b>Напоминание о задаче</b>\n\n` +
          `👋 Привет, ${userName}!\n\n` +
          `📝 <b>${task.title}</b>\n` +
          (task.description ? `\n${task.description}\n` : '') +
          (task.due_date ? `\n⏰ Дедлайн: ${new Date(task.due_date).toLocaleString('ru-RU')}` : '')

        // Отправляем сообщение через Telegram Bot API
        const response = await fetch(
          `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: telegramId,
              text: message,
              parse_mode: 'HTML',
            }),
          }
        )

        if (response.ok) {
          // Помечаем задачу как отправленную
          await supabase
            .from('tasks')
            .update({ reminder_sent: true })
            .eq('id', task.id)

          sentCount++
          console.log(`✅ Напоминание отправлено для задачи: ${task.title}`)
        } else {
          const errorData = await response.json()
          console.error(`❌ Ошибка отправки Telegram:`, errorData)
          failedCount++
        }
      } catch (err) {
        console.error(`❌ Ошибка отправки для задачи ${task.id}:`, err)
        failedCount++
      }
    }

    console.log(`📊 Итого: отправлено ${sentCount}, ошибок ${failedCount}`)

    return new Response(
      JSON.stringify({
        message: 'Reminders processed',
        sent: sentCount,
        failed: failedCount,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('❌ Критическая ошибка:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})
