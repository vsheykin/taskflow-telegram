import { useState, useEffect, useCallback } from 'react';
import { Task, ViewMode, FilterStatus, FilterPriority } from './types';
import { useTelegram } from './useTelegram';
import { getGreeting } from './utils';
import { loadTasks, createTask, updateTask, deleteTask, isSupabaseConfigured, supabase } from './supabase';
import { createFamily, joinFamily, getUserFamily, checkAccess, addUserToWhitelist } from './supabase';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Plus,
  List,
  BarChart3,
  Users,
  User,
  Cloud,
  Smartphone,
  Info,
  Check,
  Copy,
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
  const [isAllowed, setIsAllowed] = useState<boolean | null>(null);
  const [family, setFamily] = useState<any>(null);
  const [showFamilyForm, setShowFamilyForm] = useState(false);
  const [familyName, setFamilyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [copied, setCopied] = useState(false);

  const { tgUser, hapticFeedback, hapticSuccess } = useTelegram();

  // Инициализация
  useEffect(() => {
    const init = async () => {
      console.log('🚀 Инициализация приложения...');
      
      // Получаем Telegram user ID
      const tg = window.Telegram?.WebApp;
      const telegramUser = tg?.initDataUnsafe?.user;

      console.log('👤 Telegram пользователь:', telegramUser);

      if (telegramUser) {
        const telegramId = telegramUser.id;
        setUserId(String(telegramId));

        // Проверяем доступ
        console.log('🔐 Проверяю доступ для telegramId:', telegramId);
        const hasAccess = await checkAccess(telegramId);
        console.log('🔐 Результат проверки доступа:', hasAccess);
        
        setIsAllowed(hasAccess);

        if (!hasAccess) {
          console.log('❌ Доступ запрещён');
          setLoading(false);
          return;
        }

        // Загружаем задачи
        console.log('✅ Доступ разрешён, загружаю задачи...');
        const userTasks = await loadTasks(String(telegramId));
        setTasks(userTasks);

        // Загружаем семью
        const userFamily = await getUserFamily(String(telegramId));
        setFamily(userFamily);
      } else {
        console.log('⚠️ Telegram пользователь не определён');
        console.log('💡 Откройте приложение через Telegram бота для полной функциональности');
        setIsAllowed(true); // Разрешаем доступ для тестирования в браузере
      }

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

  // Разделяем задачи на личные и семейные
  const personalTasks = tasks.filter(t => t.scope === 'personal');
  const familyTasks = tasks.filter(t => t.scope === 'family');

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

  const handleCreateFamily = async () => {
    console.log('🔵 handleCreateFamily вызвана');
    console.log('familyName:', familyName);
    console.log('userId:', userId);
    
    if (!familyName.trim()) {
      console.log('❌ familyName пустой');
      alert('Введите название семьи');
      return;
    }
    
    if (!userId) {
      console.log('❌ userId пустой');
      alert('Ошибка: пользователь не определён');
      return;
    }
    
    try {
      console.log('✅ Вызываю createFamily...');
      const result = await createFamily(userId, familyName.trim());
      console.log('📦 Результат createFamily:', result);
      
      if (result) {
        console.log('✅ Семья создана, формирую данные для UI...');
        
        // Формируем данные семьи сразу из результата createFamily
        const familyData = {
          family_id: result.familyId,
          role: 'owner',
          families: {
            id: result.familyId,
            name: familyName.trim(),
            invite_code: result.inviteCode,
            family_members: [
              {
                user_id: userId,
                role: 'owner',
              },
            ],
          },
        };
        
        console.log('👨‍👩‍👧 Данные семьи для UI:', familyData);
        setFamily(familyData);
        setShowFamilyForm(false);
        setFamilyName('');
        hapticSuccess();
        alert('Семья создана!');
        
        // Дополнительно загружаем актуальные данные из БД (не блокируя UI)
        setTimeout(async () => {
          const userFamily = await getUserFamily(userId);
          if (userFamily) {
            console.log('🔄 Обновляю данные семьи из БД:', userFamily);
            setFamily(userFamily);
          }
        }, 500);
      } else {
        console.log('❌ createFamily вернул null');
        alert('Ошибка при создании семьи');
      }
    } catch (error) {
      console.error('❌ Ошибка в handleCreateFamily:', error);
      alert('Произошла ошибка: ' + error);
    }
  };

  const handleJoinFamily = async () => {
    console.log('🔵 handleJoinFamily вызвана');
    console.log('inviteCode:', inviteCode);
    console.log('userId:', userId);
    
    if (!inviteCode.trim()) {
      console.log('❌ inviteCode пустой');
      alert('Введите код приглашения');
      return;
    }
    
    if (!userId) {
      console.log('❌ userId пустой');
      alert('Ошибка: пользователь не определён');
      return;
    }
    
    try {
      console.log('✅ Вызываю joinFamily...');
      const success = await joinFamily(userId, inviteCode.trim().toUpperCase());
      console.log('📦 Результат joinFamily:', success);
      
      if (success) {
        console.log('✅ Присоединился, загружаю данные...');
        setShowFamilyForm(false);
        setInviteCode('');
        hapticSuccess();
        alert('Вы присоединились к семье!');
        
        // Загружаем данные семьи с небольшой задержкой
        setTimeout(async () => {
          const userFamily = await getUserFamily(userId);
          console.log('👨‍👩‍👧 Данные семьи:', userFamily);
          if (userFamily) {
            setFamily(userFamily);
          } else {
            console.error('❌ Не удалось загрузить данные семьи');
            alert('Вы присоединились, но не удалось загрузить данные. Обновите страницу.');
          }
        }, 500);
      } else {
        console.log('❌ joinFamily вернул false');
        alert('Неверный код приглашения или ошибка');
        hapticFeedback('medium');
      }
    } catch (error) {
      console.error('❌ Ошибка в handleJoinFamily:', error);
      alert('Произошла ошибка: ' + error);
    }
  };

  const handleCopyInviteCode = () => {
    if (family?.families?.invite_code) {
      navigator.clipboard.writeText(family.families.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      hapticSuccess();
    }
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

  // Экран доступа запрещён
  if (isAllowed === false) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 p-5">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-red-100 text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Доступ запрещён</h1>
            <p className="text-gray-600 mb-4">
              У вас нет доступа к этому приложению. Обратитесь к администратору для получения доступа.
            </p>
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <p className="text-sm text-gray-500 mb-2">Ваш Telegram ID:</p>
              <p className="font-mono text-lg font-bold text-gray-900">{userId}</p>
            </div>
            <p className="text-xs text-gray-400">
              Отправьте этот ID администратору для добавления в список разрешённых пользователей
            </p>
          </div>
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
                { mode: 'board' as ViewMode, icon: Users },
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

      {/* Family section */}
      {viewMode === 'board' && (
        <div className="px-4 py-3">
          {family ? (
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-4 border border-blue-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  👨‍👩‍👧 {family.families?.name || 'Семья'}
                </h3>
                <button
                  onClick={handleCopyInviteCode}
                  className="flex items-center gap-1 px-3 py-1.5 bg-white rounded-lg text-sm font-medium text-blue-600 shadow-sm"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Скопировано!' : 'Код'}
                </button>
              </div>
              <div className="bg-white/60 rounded-xl p-3 mb-3">
                <p className="text-xs text-gray-600 mb-1">Код приглашения:</p>
                <p className="font-mono font-bold text-lg text-blue-600">{family.families?.invite_code}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-2">Участники:</p>
                <div className="flex flex-wrap gap-2">
                  {family.families?.family_members?.map((member: any) => (
                    <div key={member.user_id} className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg text-sm shadow-sm">
                      <span className="font-medium text-gray-900">
                        👤 {member.user_id}
                      </span>
                      {member.role === 'owner' && <span className="text-yellow-500 text-xs">⭐</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-5 border border-gray-100 text-center">
              <div className="text-5xl mb-3">👨‍👩‍👧</div>
              <h3 className="font-semibold text-gray-900 mb-2">Семейные задачи</h3>
              <p className="text-sm text-gray-500 mb-4">
                Создайте семью или присоединитесь по коду, чтобы делиться задачами с близкими
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowFamilyForm(true)}
                  className="flex-1 py-2.5 bg-blue-500 text-white rounded-xl font-medium text-sm"
                >
                  Создать семью
                </button>
                <button
                  onClick={() => {
                    setShowFamilyForm(true);
                    setInviteCode('');
                    setFamilyName('');
                  }}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium text-sm"
                >
                  Присоединиться
                </button>
              </div>
            </div>
          )}

          {/* Family form modal */}
          <AnimatePresence>
            {showFamilyForm && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-50 flex items-end"
                onClick={() => setShowFamilyForm(false)}
              >
                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                  className="bg-white w-full rounded-t-3xl p-5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Семья</h2>
                  
                  {!family ? (
                    <>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Название семьи</label>
                        <input
                          type="text"
                          value={familyName}
                          onChange={(e) => setFamilyName(e.target.value)}
                          placeholder="Например: Наша семья"
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                        />
                      </div>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Или код приглашения</label>
                        <input
                          type="text"
                          value={inviteCode}
                          onChange={(e) => setInviteCode(e.target.value)}
                          placeholder="ABCD1234"
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none font-mono uppercase"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleCreateFamily}
                          disabled={!familyName.trim()}
                          className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-medium disabled:opacity-50"
                        >
                          Создать
                        </button>
                        <button
                          onClick={handleJoinFamily}
                          disabled={!inviteCode.trim()}
                          className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium disabled:opacity-50"
                        >
                          Присоединиться
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className="text-center text-gray-500 py-4">Вы уже в семье</p>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

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
                <>
                  {/* Семейные задачи */}
                  {familyTasks.filter(t => sortedTasks.includes(t)).length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2 px-1">
                        <Users size={16} className="text-purple-500" />
                        <h3 className="text-sm font-semibold text-purple-700">Семейные задачи</h3>
                        <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">
                          {familyTasks.filter(t => sortedTasks.includes(t)).length}
                        </span>
                      </div>
                      <AnimatePresence>
                        {sortedTasks.filter(t => t.scope === 'family').map(task => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            onToggleStatus={handleToggleStatus}
                            onEdit={handleEditTask}
                            onDelete={handleDeleteTask}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Личные задачи */}
                  {personalTasks.filter(t => sortedTasks.includes(t)).length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2 px-1">
                        <User size={16} className="text-blue-500" />
                        <h3 className="text-sm font-semibold text-blue-700">Личные задачи</h3>
                        <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                          {personalTasks.filter(t => sortedTasks.includes(t)).length}
                        </span>
                      </div>
                      <AnimatePresence>
                        {sortedTasks.filter(t => t.scope === 'personal').map(task => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            onToggleStatus={handleToggleStatus}
                            onEdit={handleEditTask}
                            onDelete={handleDeleteTask}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </>
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
            hasFamily={!!family}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
