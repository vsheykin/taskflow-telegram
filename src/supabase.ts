import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Task } from './types';

// Supabase credentials (hardcoded for reliability)
export const supabaseUrl = 'https://fgyyzyruhwdbvzvtojoy.supabase.co';
export const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZneXl6eXJ1aHdkYnZ6dnRvam95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyNzg2MTksImV4cCI6MjEwNTg1NDYxOX0.mLbiw3OYP-4TL6WlVp6GS8-EXOK0fekLyktedoj_7vs';

// Флаг: Supabase настроен?
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

console.log('[TaskFlow] ✅ Supabase configured:', isSupabaseConfigured);
console.log('[TaskFlow] ✅ Supabase URL:', supabaseUrl);

// Создаём клиент только если настроен
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// ====== LOCAL STORAGE FALLBACK ======
const STORAGE_KEY = 'taskflow_tasks';

function loadTasksLocal(): Task[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveTasksLocal(tasks: Task[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// ====== API ФУНКЦИИ ======

export async function loadTasks(userId?: string): Promise<Task[]> {
  if (!isSupabaseConfigured || !supabase) {
    return loadTasksLocal();
  }

  try {
    const { data, error } = await supabase
      .from('tasks')
      .select(`*, task_tags (tag)`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!data) return [];

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
  } catch (err) {
    console.error('Error loading tasks from Supabase, falling back to local:', err);
    return loadTasksLocal();
  }
}

export async function createTask(userId: string | undefined, task: Omit<Task, 'id' | 'createdAt'>): Promise<Task | null> {
  if (!isSupabaseConfigured || !supabase) {
    // Локальное сохранение
    const newTask: Task = {
      ...task,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    const tasks = loadTasksLocal();
    tasks.unshift(newTask);
    saveTasksLocal(tasks);
    return newTask;
  }

  try {
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

    if (error) throw error;

    if (task.tags.length > 0) {
      await supabase.from('task_tags').insert(
        task.tags.map(tag => ({ task_id: data.id, tag }))
      );
    }

    return {
      id: data.id,
      title: data.title,
      description: data.description || '',
      priority: data.priority,
      status: data.status,
      category: data.category,
      createdAt: data.created_at,
      dueDate: data.due_date,
      reminderDate: data.reminder_date,
      reminderSent: data.reminder_sent,
      completedAt: data.completed_at,
      tags: task.tags,
    };
  } catch (err) {
    console.error('Error creating task, saving locally:', err);
    const newTask: Task = {
      ...task,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    const tasks = loadTasksLocal();
    tasks.unshift(newTask);
    saveTasksLocal(tasks);
    return newTask;
  }
}

export async function updateTask(taskId: string, updates: Partial<Task>): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) {
    // Локальное обновление
    const tasks = loadTasksLocal();
    const index = tasks.findIndex(t => t.id === taskId);
    if (index === -1) return false;
    tasks[index] = { ...tasks[index], ...updates };
    saveTasksLocal(tasks);
    return true;
  }

  try {
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

    if (error) throw error;

    if (updates.tags !== undefined) {
      await supabase.from('task_tags').delete().eq('task_id', taskId);
      if (updates.tags.length > 0) {
        await supabase.from('task_tags').insert(
          updates.tags.map(tag => ({ task_id: taskId, tag }))
        );
      }
    }

    return true;
  } catch (err) {
    console.error('Error updating task, saving locally:', err);
    const tasks = loadTasksLocal();
    const index = tasks.findIndex(t => t.id === taskId);
    if (index === -1) return false;
    tasks[index] = { ...tasks[index], ...updates };
    saveTasksLocal(tasks);
    return true;
  }
}

export async function deleteTask(taskId: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) {
    const tasks = loadTasksLocal();
    saveTasksLocal(tasks.filter(t => t.id !== taskId));
    return true;
  }

  try {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error deleting task, removing locally:', err);
    const tasks = loadTasksLocal();
    saveTasksLocal(tasks.filter(t => t.id !== taskId));
    return true;
  }
}

// ====== FAMILY FUNCTIONS ======

export async function createFamily(userId: string, name: string): Promise<{ familyId: string; inviteCode: string } | null> {
  console.log('🔵 createFamily вызвана с userId:', userId, 'name:', name);
  
  if (!isSupabaseConfigured || !supabase) {
    console.log('❌ Supabase не настроен');
    return null;
  }

  const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
  console.log('📝 Сгенерирован код:', inviteCode);

  try {
    console.log('📤 Вставляю в таблицу families...');
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
      console.error('❌ Ошибка вставки в families:', error);
      throw error;
    }

    console.log('✅ Семья создана:', data);

    // Добавляем создателя как owner
    console.log('📤 Добавляю пользователя в family_members...');
    const { error: memberError } = await supabase.from('family_members').insert({
      family_id: data.id,
      user_id: userId,
      role: 'owner',
    });

    if (memberError) {
      console.error('❌ Ошибка вставки в family_members:', memberError);
      throw memberError;
    }

    console.log('✅ Пользователь добавлен как owner');
    return { familyId: data.id, inviteCode: data.invite_code };
  } catch (err) {
    console.error('❌ Ошибка в createFamily:', err);
    return null;
  }
}

export async function joinFamily(userId: string, inviteCode: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;

  try {
    const { data: family, error: familyError } = await supabase
      .from('families')
      .select('id')
      .eq('invite_code', inviteCode)
      .single();

    if (familyError || !family) return false;

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
  } catch (err) {
    console.error('Error joining family:', err);
    return false;
  }
}

export async function getUserFamily(userId: string): Promise<any> {
  console.log('🔵 getUserFamily вызвана с userId:', userId);
  
  if (!isSupabaseConfigured || !supabase) {
    console.log('❌ Supabase не настроен');
    return null;
  }

  try {
    console.log('📤 Запрашиваю данные семьи...');
    const { data, error } = await supabase
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

    if (error) {
      console.error('❌ Ошибка запроса семьи:', error);
      return null;
    }

    console.log('✅ Данные семьи получены:', data);
    return data;
  } catch (err) {
    console.error('❌ Ошибка в getUserFamily:', err);
    return null;
  }
}
