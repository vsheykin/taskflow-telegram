// Supabase Edge Function для отправки напоминаний
// Размещается в Supabase Dashboard → Edge Functions

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Получаем задачи с.pending напоминаниями
    const { data: reminders, error } = await supabase.rpc("get_pending_reminders");

    if (error) throw error;
    if (!reminders || reminders.length === 0) {
      return new Response(JSON.stringify({ message: "No pending reminders" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    let sentCount = 0;

    for (const reminder of reminders) {
      try {
        // Отправляем сообщение через Telegram Bot API
        const message = `🔔 <b>Напоминание!</b>\n\n📋 ${reminder.title}${
          reminder.description ? `\n\n${reminder.description}` : ""
        }`;

        const response = await fetch(
          `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: reminder.user_telegram_id,
              text: message,
              parse_mode: "HTML",
            }),
          }
        );

        if (response.ok) {
          // Помечаем напоминание как отправленное
          await supabase
            .from("tasks")
            .update({ reminder_sent: true })
            .eq("id", reminder.task_id);
          sentCount++;
        }
      } catch (err) {
        console.error(`Failed to send reminder for task ${reminder.task_id}:`, err);
      }
    }

    return new Response(
      JSON.stringify({ message: `Sent ${sentCount} reminders` }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
