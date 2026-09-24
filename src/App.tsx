import { useState, useEffect, useCallback } from 'react';
import { Task, ViewMode, FilterStatus, FilterPriority } from './types';
import { loadTasks, saveTasks } from './store';
import { useTelegram } from './useTelegram';
import { getGreeting } from './utils';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Plus,
  List,
  BarChart3,
  LayoutGrid,
  Sparkles,
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
  const { tgUser, hapticFeedback, hapticSuccess } = useTelegram();

  // Load tasks
  useEffect(() => {
    setTasks(loadTasks());
  }, []);

  // Save tasks whenever they change
  useEffect(() => {
    if (tasks.length > 0 || localStorage.getItem('taskflow_tasks')) {
      saveTasks(tasks);
    }
  }, [tasks]);

  // Reminder checker
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      setTasks(prev => prev.map(task => {
        if (
          task.reminderDate &&
          !task.reminderSent &&
          task.status !== 'completed' &&
          task.status !== 'cancelled' &&
          new Date(task.reminderDate) <= now
        ) {
          // Show notification
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('📋 Напоминание: ' + task.title, {
              body: task.description || 'Время выполнить задачу!',
            });
          }
          // Try Telegram haptic
          hapticFeedback('heavy');
          return { ...task, reminderSent: true };
        }
        return task;
      }));
    };

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const interval = setInterval(checkReminders, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [hapticFeedback]);

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

  // Sort: active first, then by priority, then by due date
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    // Completed/cancelled at the bottom
    const aActive = a.status !== 'completed' && a.status !== 'cancelled' ? 0 : 1;
    const bActive = b.status !== 'completed' && b.status !== 'cancelled' ? 0 : 1;
    if (aActive !== bActive) return aActive - bActive;

    // Priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }

    // Due date
    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;

    // Created date
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const handleSaveTask = useCallback((task: Task) => {
    setTasks(prev => {
      const existing = prev.findIndex(t => t.id === task.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = task;
        return updated;
      }
      return [task, ...prev];
    });
    setShowForm(false);
    setEditingTask(null);
    hapticSuccess();
  }, [hapticSuccess]);

  const handleDeleteTask = useCallback((id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    setShowForm(false);
    setEditingTask(null);
    hapticFeedback('medium');
  }, [hapticFeedback]);

  const handleToggleStatus = useCallback((id: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      const nextStatus = t.status === 'completed' ? 'new' : 'completed';
      return {
        ...t,
        status: nextStatus,
        completedAt: nextStatus === 'completed' ? new Date().toISOString() : null,
      };
    }));
    hapticSuccess();
  }, [hapticSuccess]);

  const handleEditTask = useCallback((task: Task) => {
    setEditingTask(task);
    setShowForm(true);
  }, []);

  const handleNewTask = () => {
    setEditingTask(null);
    setShowForm(true);
  };

  const activeCount = tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled').length;

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
