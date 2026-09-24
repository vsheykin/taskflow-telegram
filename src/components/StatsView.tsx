import { Task, TaskStats } from '../types';
import { motion } from 'framer-motion';
import { TrendingUp, CheckCircle, Clock, AlertTriangle, Target, Calendar } from 'lucide-react';
import { format, isToday, parseISO, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { ru } from 'date-fns/locale';

interface StatsViewProps {
  tasks: Task[];
}

export default function StatsView({ tasks }: StatsViewProps) {
  const activeTasks = tasks.filter(t => t.status !== 'cancelled');
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const overdueTasks = activeTasks.filter(t => {
    if (!t.dueDate || t.status === 'completed') return false;
    return new Date(t.dueDate) < new Date();
  });
  const todayTasks = activeTasks.filter(t => {
    if (!t.dueDate) return false;
    return isToday(parseISO(t.dueDate));
  });

  const completionRate = activeTasks.length > 0
    ? Math.round((completedTasks.length / activeTasks.length) * 100)
    : 0;

  // Tasks by category
  const categoryCounts: Record<string, number> = {};
  activeTasks.forEach(t => {
    categoryCounts[t.category] = (categoryCounts[t.category] || 0) + 1;
  });

  // Tasks by priority
  const priorityCounts = {
    high: activeTasks.filter(t => t.priority === 'high' && t.status !== 'completed').length,
    medium: activeTasks.filter(t => t.priority === 'medium' && t.status !== 'completed').length,
    low: activeTasks.filter(t => t.priority === 'low' && t.status !== 'completed').length,
  };

  // Weekly activity
  const weekStart = startOfWeek(new Date(), { locale: ru });
  const weekEnd = endOfWeek(new Date(), { locale: ru });
  const weekCompleted = completedTasks.filter(t => {
    if (!t.completedAt) return false;
    return isWithinInterval(parseISO(t.completedAt), { start: weekStart, end: weekEnd });
  }).length;

  const stats: { icon: typeof TrendingUp; label: string; value: number; color: string; bg: string }[] = [
    { icon: Target, label: 'Всего задач', value: activeTasks.length, color: 'text-blue-600', bg: 'bg-blue-50' },
    { icon: CheckCircle, label: 'Выполнено', value: completedTasks.length, color: 'text-green-600', bg: 'bg-green-50' },
    { icon: Clock, label: 'В работе', value: inProgressTasks.length, color: 'text-orange-600', bg: 'bg-orange-50' },
    { icon: AlertTriangle, label: 'Просрочено', value: overdueTasks.length, color: 'text-red-600', bg: 'bg-red-50' },
    { icon: Calendar, label: 'На сегодня', value: todayTasks.length, color: 'text-purple-600', bg: 'bg-purple-50' },
    { icon: TrendingUp, label: 'За неделю', value: weekCompleted, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ];

  const categoryLabels: Record<string, { emoji: string; label: string }> = {
    work: { emoji: '💼', label: 'Работа' },
    personal: { emoji: '👤', label: 'Личное' },
    health: { emoji: '🏃', label: 'Здоровье' },
    study: { emoji: '📚', label: 'Учёба' },
    other: { emoji: '📌', label: 'Другое' },
  };

  return (
    <div className="px-4 py-4 pb-24">
      {/* Completion Rate */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-5 mb-5 text-white"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-lg">Прогресс</h3>
          <span className="text-3xl font-bold">{completionRate}%</span>
        </div>
        <div className="w-full bg-white/20 rounded-full h-3">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${completionRate}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="bg-white rounded-full h-3"
          />
        </div>
        <p className="text-sm text-white/80 mt-2">
          {completedTasks.length} из {activeTasks.length} задач выполнено
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`${stat.bg} rounded-2xl p-4`}
          >
            <stat.icon size={24} className={stat.color} />
            <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
            <p className="text-xs text-gray-600 mt-0.5">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Priority Distribution */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-2xl p-4 border border-gray-100 mb-4"
      >
        <h3 className="font-semibold text-gray-900 mb-3">Приоритеты (активные)</h3>
        <div className="space-y-2">
          {[
            { key: 'high', label: 'Высокий', color: 'bg-red-500', count: priorityCounts.high },
            { key: 'medium', label: 'Средний', color: 'bg-yellow-500', count: priorityCounts.medium },
            { key: 'low', label: 'Низкий', color: 'bg-green-500', count: priorityCounts.low },
          ].map((p) => {
            const total = priorityCounts.high + priorityCounts.medium + priorityCounts.low;
            const percent = total > 0 ? (p.count / total) * 100 : 0;
            return (
              <div key={p.key} className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-16">{p.label}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-3">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percent}%` }}
                    transition={{ duration: 0.8, delay: 0.5 }}
                    className={`${p.color} rounded-full h-3`}
                  />
                </div>
                <span className="text-sm font-medium text-gray-700 w-6 text-right">{p.count}</span>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Category Distribution */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-2xl p-4 border border-gray-100"
      >
        <h3 className="font-semibold text-gray-900 mb-3">По категориям</h3>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(categoryCounts).map(([cat, count]) => (
            <div key={cat} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
              <span className="text-lg">{categoryLabels[cat]?.emoji || '📌'}</span>
              <span className="text-sm text-gray-700">{categoryLabels[cat]?.label || cat}</span>
              <span className="ml-auto text-sm font-bold text-gray-900">{count}</span>
            </div>
          ))}
          {Object.keys(categoryCounts).length === 0 && (
            <p className="text-sm text-gray-400 col-span-2 text-center py-4">Нет задач</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
