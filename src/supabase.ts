import { createClient } from '@supabase/supabase-js';
import { Task } from './types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Проверка авторизации через Telegram
export async function checkAuth(telegramId: number): Promise<{ allowed: boolean; profile: any }> {
  // Проверяем, есть ли пользователь в whitelist
  const { data: allowed } = await supabase
    .from('allowed_users')
    .select('telegram_id')
    .eq('telegram_id', telegramId)
    .single();

  if (!allowed) {
    return { allowed: false, profile: null };
  }

  // Получаем или создаём профиль
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('telegram_id', telegramId)
    .single();

  return { allowed: true, profile };
}

// Загрузка задач пользователя
export async function loadTasks(userId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      task_tags (tag)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading tasks:', error);
    return [];
  }

  return data.map((task: any) => ({
    id: task.id,
    title: task.title,
    description: task.description || '',
    priority: task.priority,
    status: task.status,
    category: task.category,
    createdAt: task.created_at,
    dueDate: task.due_date,
    reminderDate: task.reminder_date,
    reminderSent: task.reminder_sent,
    completedAt: task.completed_at,
    tags: task.task_tags?.map((t: any) => t.tag) || [],
  }));
}

// Создание задачи
export async function createTask(userId: string, task: Omit<Task, 'id' | 'createdAt'>): Promise<Task | null> {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      user_id: userId,
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status,
      category: task.category,
      due_date: task.dueDate,
      reminder_date: task.reminderDate,
      completed_at: task.completedAt,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating task:', error);
    return null;
  }

  // Добавляем теги
  if (task.tags.length > 0) {
    await supabase.from('task_tags').insert(
      task.tags.map(tag => ({ task_id: data.id, tag }))
    );
  }

  return {
    ...data,
    tags: task.tags,
    createdAt: data.created_at,
    dueDate: data.due_date,
    reminderDate: data.reminder_date,
    reminderSent: data.reminder_sent,
    completedAt: data.completed_at,
  };
}

// Обновление задачи
export async function updateTask(taskId: string, updates: Partial<Task>): Promise<boolean> {
  const dbUpdates: any = {};
  
  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.category !== undefined) dbUpdates.category = updates.category;
  if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
  if (updates.reminderDate !== undefined) dbUpdates.reminder_date = updates.reminderDate;
  if (updates.completedAt !== undefined) dbUpdates.completed_at = updates.completedAt;

  const { error } = await supabase
    .from('tasks')
    .update(dbUpdates)
    .eq('id', taskId);

  if (error) {
    console.error('Error updating task:', error);
    return false;
  }

  // Обновляем теги
  if (updates.tags !== undefined) {
    await supabase.from('task_tags').delete().eq('task_id', taskId);
    if (updates.tags.length > 0) {
      await supabase.from('task_tags').insert(
        updates.tags.map(tag => ({ task_id: taskId, tag }))
      );
    }
  }

  return true;
}

// Удаление задачи
export async function deleteTask(taskId: string): Promise<boolean> {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId);

  if (error) {
    console.error('Error deleting task:', error);
    return false;
  }

  return true;
}

// Создание семьи
export async function createFamily(userId: string, name: string): Promise<{ familyId: string; inviteCode: string } | null> {
  const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();

  const { data, error } = await supabase
    .from('families')
    .insert({
      name,
      invite_code: inviteCode,
      created_by: userId,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating family:', error);
    return null;
  }

  // Добавляем создателя как owner
  await supabase.from('family_members').insert({
    family_id: data.id,
    user_id: userId,
    role: 'owner',
  });

  return { familyId: data.id, inviteCode: data.invite_code };
}

// Присоединение к семье по коду
export async function joinFamily(userId: string, inviteCode: string): Promise<boolean> {
  const { data: family } = await supabase
    .from('families')
    .select('id')
    .eq('invite_code', inviteCode)
    .single();

  if (!family) return false;

  const { error } = await supabase
    .from('family_members')
    .insert({
      family_id: family.id,
      user_id: userId,
      role: 'member',
    });

  if (error) {
    console.error('Error joining family:', error);
    return false;
  }

  return true;
}

// Получение семьи пользователя
export async function getUserFamily(userId: string): Promise<any> {
  const { data } = await supabase
    .from('family_members')
    .select(`
      family_id,
      role,
      families (
        id,
        name,
        invite_code,
        family_members (
          user_id,
          role,
          profiles (telegram_id, first_name, last_name, username)
        )
      )
    `)
    .eq('user_id', userId)
    .single();

  return data;
}

// Realtime подписка на задачи
export function subscribeToTasks(userId: string, callback: (task: Task) => void) {
  return supabase
    .channel('tasks-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tasks',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        console.log('Task changed:', payload);
        // Здесь можно вызвать callback для обновления UI
      }
    )
    .subscribe();
}
