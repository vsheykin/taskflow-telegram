import { useState, useEffect, useCallback } from 'react';
import { Task, ViewMode, FilterStatus, FilterPriority } from './types';
import { useTelegram } from './useTelegram';
import { getGreeting } from './utils';
import { loadTasks, createTask, updateTask, deleteTask, isSupabaseConfigured, supabase, supabaseUrl, supabaseAnonKey } from './supabase';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Plus,
  List,
  BarChart3,
  Users,
  Cloud,
  Smartphone,
  Info,
} from 'lucide-react';
import TaskCard from './components/TaskCard';
import TaskForm from './components/TaskForm';
import StatsView from './components/StatsView';
import FilterBar from './components/FilterBar';

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<FilterPriority>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>('');
  const [showSyncInfo, setShowSyncInfo] = useState(false);

  const { tgUser, hapticFeedback, hapticSuccess } = useTelegram();

  // Инициализация
  useEffect(() => {
    const init = async () => {
      // Получаем Telegram user ID
      const tg = window.Telegram?.WebApp;
      const telegramUser = tg?.initDataUnsafe?.user;

      if (telegramUser) {
        setUserId(String(telegramUser.id));
      }

      // Загружаем задачи
      const userTasks = await loadTasks(userId || undefined);
      setTasks(userTasks);
      setLoading(false);
    };

    init();
  }, []);

  // Realtime подписка на изменения задач (только если Supabase настроен)
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    const sb = supabase; // TypeScript guard
    const channel = sb
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
        },
        async () => {
          const userTasks = await loadTasks(userId || undefined);
          setTasks(userTasks);
        }
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, [userId]);

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    if (statusFilter !== 'all' && task.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        task.title.toLowerCase().includes(query) ||
        task.description.toLowerCase().includes(query) ||
        task.tags.some(t => t.toLowerCase().includes(query))
      );
    }
    return true;
  });

  // Sort tasks
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const aActive = a.status !== 'completed' && a.status !== 'cancelled' ? 0 : 1;
    const bActive = b.status !== 'completed' && b.status !== 'cancelled' ? 0 : 1;
    if (aActive !== bActive) return aActive - bActive;

    const priorityOrder = { high: 0, medium: 1, low: 2 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }

    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const handleSaveTask = useCallback(async (task: Task) => {
    if (editingTask) {
      await updateTask(task.id, task);
    } else {
      await createTask(userId || undefined, task);
    }

    const userTasks = await loadTasks(userId || undefined);
    setTasks(userTasks);

    setShowForm(false);
    setEditingTask(null);
    hapticSuccess();
  }, [userId, editingTask, hapticSuccess]);

  const handleDeleteTask = useCallback(async (id: string) => {
    await deleteTask(id);

    const userTasks = await loadTasks(userId || undefined);
    setTasks(userTasks);

    setShowForm(false);
    setEditingTask(null);
    hapticFeedback('medium');
  }, [userId, hapticFeedback]);

  const handleToggleStatus = useCallback(async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const nextStatus = task.status === 'completed' ? 'new' : 'completed';
    await updateTask(id, {
      status: nextStatus,
      completedAt: nextStatus === 'completed' ? new Date().toISOString() : null,
    });

    const userTasks = await loadTasks(userId || undefined);
    setTasks(userTasks);

    hapticSuccess();
  }, [tasks, userId, hapticSuccess]);

  const handleEditTask = useCallback((task: Task) => {
    setEditingTask(task);
    setShowForm(true);
  }, []);

  const handleNewTask = () => {
    setEditingTask(null);
    setShowForm(true);
  };

  const activeCount = tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled').length;

  // Экран загрузки
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">📋</div>
          <p className="text-gray-500">Загрузка...</p>
        </div>
      </div>
    );
  }

  // Экран диагностики (если Supabase не настроен)
  if (!isSupabaseConfigured) {
    return (
      <div className="h-full overflow-y-auto bg-gray-50 p-5">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-6">
            <div className="text-6xl mb-3">⚠️</div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Supabase не подключён</h1>
            <p className="text-sm text-gray-500">Приложение работает в локальном режиме</p>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-yellow-200 mb-4">
            <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <span className="text-yellow-500">🔍</span> Диагностика
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">VITE_SUPABASE_URL:</span>
                <span className={`font-mono text-xs ${supabaseUrl ? 'text-green-600' : 'text-red-600'}`}>
                  {supabaseUrl ? '✅ ' + supabaseUrl.substring(0, 25) + '...' : '❌ НЕ УСТАНОВЛЕН'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">VITE_SUPABASE_ANON_KEY:</span>
                <span className={`font-mono text-xs ${supabaseAnonKey ? 'text-green-600' : 'text-red-600'}`}>
                  {supabaseAnonKey ? '✅ SET' : '❌ НЕ УСТАНОВЛЕН'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600">Режим:</span>
                <span className="font-mono text-xs text-orange-600">📱 ЛОКАЛЬНЫЙ</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4">
            <h2 className="font-semibold text-gray-900 mb-3">📋 Что делать:</h2>
            <ol className="space-y-3 text-sm text-gray-700">
              <li className="flex gap-2">
                <span className="font-bold text-blue-500">1.</span>
                <span>Откройте <b>Supabase Dashboard</b> → Settings → API</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-blue-500">2.</span>
                <span>Скопируйте <b>Project URL</b> и <b>anon public key</b></span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-blue-500">3.</span>
                <span>Откройте файл <code className="bg-gray-100 px-1 rounded">.env</code> в корне проекта</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-blue-500">4.</span>
                <div>
                  <span>Вставьте значения без кавычек и пробелов:</span>
                  <pre className="mt-1 bg-gray-900 text-green-400 p-2 rounded text-xs overflow-x-auto">
{`VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...`}
                  </pre>
                </div>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-blue-500">5.</span>
                <span>Закоммитьте и запушьте:</span>
              </li>
            </ol>
            <pre className="mt-2 bg-gray-900 text-green-400 p-3 rounded text-xs overflow-x-auto">
{`git add -f .env
git commit -m "Fix Supabase config"
git push origin main`}
            </pre>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-blue-500 text-white rounded-xl font-medium"
          >
            🔄 Обновить страницу
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white px-5 pt-5 pb-3 shadow-sm">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {getGreeting()}{tgUser ? `, ${tgUser.name.split(' ')[0]}` : ''}! 👋
            </h1>
            <p className="text-sm text-gray-500">
              {activeCount > 0 ? `${activeCount} активных задач` : 'Все задачи выполнены! 🎉'}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {/* Sync indicator */}
            <button
              onClick={() => setShowSyncInfo(!showSyncInfo)}
              className={`p-2 rounded-lg transition-all ${
                isSupabaseConfigured ? 'text-green-500' : 'text-gray-400'
              }`}
            >
              {isSupabaseConfigured ? <Cloud size={18} /> : <Smartphone size={18} />}
            </button>
            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
              {[
                { mode: 'list' as ViewMode, icon: List },
                { mode: 'stats' as ViewMode, icon: BarChart3 },
              ].map(({ mode, icon: Icon }) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`p-2 rounded-lg transition-all ${
                    viewMode === mode ? 'bg-white shadow-sm text-blue-500' : 'text-gray-400'
                  }`}
                >
                  <Icon size={18} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sync info banner */}
        <AnimatePresence>
          {showSyncInfo && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className={`mt-2 p-3 rounded-xl flex items-start gap-2 ${
                isSupabaseConfigured ? 'bg-green-50' : 'bg-yellow-50'
              }`}>
                <Info size={16} className={isSupabaseConfigured ? 'text-green-600 mt-0.5' : 'text-yellow-600 mt-0.5'} />
                <div className="text-xs">
                  {isSupabaseConfigured ? (
                    <>
                      <p className="font-semibold text-green-800">☁️ Облачная синхронизация</p>
                      <p className="text-green-700">Задачи синхронизируются между всеми устройствами в реальном времени</p>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold text-yellow-800">📱 Локальный режим</p>
                      <p className="text-yellow-700">Задачи сохраняются только на этом устройстве. Для синхронизации настройте Supabase (см. SETUP_GUIDE.md)</p>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {viewMode === 'stats' ? (
          <StatsView tasks={tasks} />
        ) : (
          <>
            <FilterBar
              statusFilter={statusFilter}
              priorityFilter={priorityFilter}
              onStatusChange={setStatusFilter}
              onPriorityChange={setPriorityFilter}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />

            {/* Task List */}
            <div className="px-4 pb-24">
              {sortedTasks.length > 0 ? (
                <AnimatePresence>
                  {sortedTasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onToggleStatus={handleToggleStatus}
                      onEdit={handleEditTask}
                      onDelete={handleDeleteTask}
                    />
                  ))}
                </AnimatePresence>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-16"
                >
                  <div className="text-6xl mb-4">
                    {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' ? '🔍' : '✨'}
                  </div>
                  <p className="text-gray-500 text-lg font-medium">
                    {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all'
                      ? 'Задачи не найдены'
                      : 'Пока нет задач'}
                  </p>
                  <p className="text-gray-400 text-sm mt-1">
                    {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all'
                      ? 'Попробуйте изменить фильтры'
                      : 'Нажмите + чтобы создать первую задачу'}
                  </p>
                </motion.div>
              )}
            </div>
          </>
        )}
      </div>

      {/* FAB */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={handleNewTask}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-500 rounded-full shadow-lg shadow-blue-500/30 flex items-center justify-center text-white z-40 active:scale-95 transition-transform"
      >
        <Plus size={28} />
      </motion.button>

      {/* Task Form Modal */}
      <AnimatePresence>
        {showForm && (
          <TaskForm
            task={editingTask}
            onSave={handleSaveTask}
            onDelete={handleDeleteTask}
            onClose={() => {
              setShowForm(false);
              setEditingTask(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
