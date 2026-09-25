import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Task } from './types';

// Читаем ВСЕ переменные окружения для диагностики
const allEnvVars = Object.keys(import.meta.env).filter(k => k.startsWith('VITE_'));
console.log('[TaskFlow] === DIAGNOSTIC START ===');
console.log('[TaskFlow] All VITE_ env vars found:', allEnvVars);
console.log('[TaskFlow] import.meta.env keys:', Object.keys(import.meta.env));

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

console.log('[TaskFlow] VITE_SUPABASE_URL raw value:', JSON.stringify(import.meta.env.VITE_SUPABASE_URL));
console.log('[TaskFlow] VITE_SUPABASE_ANON_KEY raw value:', import.meta.env.VITE_SUPABASE_ANON_KEY ? JSON.stringify(import.meta.env.VITE_SUPABASE_ANON_KEY.substring(0, 30) + '...') : 'undefined');
console.log('[TaskFlow] supabaseUrl after fallback:', JSON.stringify(supabaseUrl));
console.log('[TaskFlow] supabaseUrl length:', supabaseUrl.length);

// Флаг: Supabase настроен?
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

console.log('[TaskFlow] isSupabaseConfigured:', isSupabaseConfigured);
console.log('[TaskFlow] === DIAGNOSTIC END ===');

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
