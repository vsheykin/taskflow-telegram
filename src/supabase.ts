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

export async function loadTasks(userId?: string, familyMemberIds?: string[]): Promise<Task[]> {
  if (!isSupabaseConfigured || !supabase) {
    return loadTasksLocal();
  }

  try {
    // Загружаем все задачи (личные + семейные)
    // Фильтрацию будем делать на клиенте
    const { data, error } = await supabase
      .from('tasks')
      .select(`*, task_tags (tag)`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!data) return [];

    // Фильтруем: личные задачи пользователя + семейные задачи всех членов семьи
    const filtered = data.filter((task: any) => {
      if (task.scope === 'family') return true; // Семейные задачи видны всем
      if (task.scope === 'personal' && task.user_id === userId) return true; // Личные только свои
      return false;
    });

    return filtered.map((task: any) => ({
      id: task.id,
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      status: task.status,
      category: task.category,
      scope: task.scope || 'personal',
      userId: task.user_id,
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
        scope: task.scope || 'personal',
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
      scope: data.scope || task.scope || 'personal',
      userId: data.user_id,
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
    if (updates.scope !== undefined) dbUpdates.scope = updates.scope;
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

// ====== ACCESS CONTROL FUNCTIONS ======

export async function checkAccess(telegramId: number): Promise<boolean> {
  console.log('🔵 checkAccess вызвана с telegramId:', telegramId, 'тип:', typeof telegramId);
  
  if (!isSupabaseConfigured || !supabase) {
    console.log('❌ Supabase не настроен, разрешаю доступ');
    return true; // Если Supabase не настроен, разрешаем доступ
  }

  try {
    console.log('📤 Проверяю таблицу allowed_users...');
    
    // Сначала получаем ВСЕ записи для диагностики
    const { data: allUsers, error: allError } = await supabase
      .from('allowed_users')
      .select('telegram_id');
    
    console.log('📋 Все пользователи в whitelist:', allUsers);
    if (allError) {
      console.error('❌ Ошибка получения всех пользователей:', allError);
    }
    
    // Теперь ищем конкретного пользователя (без .single())
    const { data, error } = await supabase
      .from('allowed_users')
      .select('telegram_id')
      .eq('telegram_id', telegramId);

    console.log('🔍 Найденные пользователи:', data);
    if (error) {
      console.error('❌ Ошибка запроса allowed_users:', error);
      return false;
    }

    const hasAccess = data && data.length > 0;
    if (hasAccess) {
      console.log('✅ Пользователь найден в whitelist');
      return true;
    } else {
      console.log('❌ Пользователь не найден в whitelist');
      return false;
    }
  } catch (err) {
    console.error('❌ Ошибка в checkAccess:', err);
    return false;
  }
}

export async function addUserToWhitelist(telegramId: number): Promise<boolean> {
  console.log('🔵 addUserToWhitelist вызвана с telegramId:', telegramId);
  
  if (!isSupabaseConfigured || !supabase) {
    console.log('❌ Supabase не настроен');
    return false;
  }

  try {
    console.log('📤 Добавляю пользователя в allowed_users...');
    const { error } = await supabase
      .from('allowed_users')
      .insert({ telegram_id: telegramId });

    if (error) {
      console.error('❌ Ошибка добавления в whitelist:', error);
      return false;
    }

    console.log('✅ Пользователь добавлен в whitelist');
    return true;
  } catch (err) {
    console.error('❌ Ошибка в addUserToWhitelist:', err);
    return false;
  }
}

// ====== FAMILY FUNCTIONS ======

export async function createFamily(userId: string, name: string): Promise<{ familyId: string; inviteCode: string } | null> {
  console.log('🔵 createFamily вызвана с userId:', userId, 'name:', name);
  
  if (!isSupabaseConfigured || !supabase) {
    console.log('❌ Supabase не настроен');
    return null;
  }

  try {
    // Сначала проверяем, есть ли уже пользователь в какой-либо семье
    console.log('🔍 Проверяю, есть ли пользователь уже в семье...');
    const { data: existingMember, error: checkError } = await supabase
      .from('family_members')
      .select('family_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (checkError) {
      console.error('❌ Ошибка проверки существующей семьи:', checkError);
    }

    if (existingMember) {
      console.log('⚠️ Пользователь уже в семье:', existingMember.family_id);
      // Получаем данные существующей семьи
      const { data: existingFamily, error: familyError } = await supabase
        .from('families')
        .select('id, invite_code')
        .eq('id', existingMember.family_id)
        .single();

      if (!familyError && existingFamily) {
        console.log('✅ Возвращаю существующую семью:', existingFamily);
        return { familyId: existingFamily.id, inviteCode: existingFamily.invite_code };
      }
    }

    // Создаём новую семью
    const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    console.log('📝 Сгенерирован код:', inviteCode);

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
    // Проверяем, есть ли уже пользователь в семье
    const { data: existingMember } = await supabase
      .from('family_members')
      .select('family_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingMember) {
      console.log('⚠️ Пользователь уже в семье');
      return false;
    }

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
    
    // Сначала находим семью пользователя (используем maybeSingle для безопасности)
    const { data: memberData, error: memberError } = await supabase
      .from('family_members')
      .select('family_id, role')
      .eq('user_id', userId)
      .maybeSingle();

    if (memberError) {
      console.error('❌ Ошибка запроса членства:', memberError);
      return null;
    }

    if (!memberData) {
      console.log('ℹ️ Пользователь не в семье');
      return null;
    }

    console.log('📋 Пользователь в семье:', memberData);

    // Теперь получаем данные семьи
    const { data: familyData, error: familyError } = await supabase
      .from('families')
      .select('id, name, invite_code')
      .eq('id', memberData.family_id)
      .single();

    if (familyError || !familyData) {
      console.error('❌ Ошибка получения семьи:', familyError);
      return null;
    }

    console.log('📋 Данные семьи:', familyData);

    // Получаем всех участников семьи
    const { data: membersData, error: membersError } = await supabase
      .from('family_members')
      .select('user_id, role')
      .eq('family_id', memberData.family_id);

    if (membersError) {
      console.error('❌ Ошибка получения участников:', membersError);
    }

    console.log('📋 Участники семьи:', membersData);

    // Формируем результат
    const result = {
      family_id: memberData.family_id,
      role: memberData.role,
      families: {
        ...familyData,
        family_members: membersData || [],
      },
    };

    console.log('✅ Данные семьи получены:', result);
    return result;
  } catch (err) {
    console.error('❌ Ошибка в getUserFamily:', err);
    return null;
  }
}
