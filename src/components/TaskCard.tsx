import { Task, Priority, Status } from '../types';
import { getDueDateLabel, formatDate } from '../utils';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  XCircle,
  Calendar,
  Bell,
  ChevronRight,
} from 'lucide-react';

interface TaskCardProps {
  task: Task;
  onToggleStatus: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}

const priorityConfig: Record<Priority, { color: string; label: string; icon: string }> = {
  high: { color: 'bg-red-100 text-red-700 border-red-200', label: 'Высокий', icon: '🔴' },
  medium: { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', label: 'Средний', icon: '🟡' },
  low: { color: 'bg-green-100 text-green-700 border-green-200', label: 'Низкий', icon: '🟢' },
};

const statusConfig: Record<Status, { icon: typeof Circle; color: string }> = {
  new: { icon: Circle, color: 'text-blue-500' },
  in_progress: { icon: Clock, color: 'text-orange-500' },
  completed: { icon: CheckCircle2, color: 'text-green-500' },
  cancelled: { icon: XCircle, color: 'text-gray-400' },
};

const categoryEmoji: Record<string, string> = {
  work: '💼',
  personal: '👤',
  health: '🏃',
  study: '📚',
  other: '📌',
};

export default function TaskCard({ task, onToggleStatus, onEdit, onDelete }: TaskCardProps) {
  const priority = priorityConfig[task.priority];
  const status = statusConfig[task.status];
  const StatusIcon = status.icon;
  const dueLabel = getDueDateLabel(task.dueDate);
  const isCompleted = task.status === 'completed';
  const isCancelled = task.status === 'cancelled';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
      className={`relative bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-3 ${
        isCompleted ? 'opacity-60' : ''
      } ${isCancelled ? 'opacity-40' : ''}`}
      onClick={() => !isCompleted && !isCancelled && onEdit(task)}
    >
      <div className="flex items-start gap-3">
        {/* Status toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleStatus(task.id);
          }}
          className="mt-0.5 flex-shrink-0"
        >
          <StatusIcon
            size={24}
            className={`${status.color} transition-transform active:scale-90`}
          />
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3
              className={`font-medium text-gray-900 truncate ${
                isCompleted ? 'line-through text-gray-400' : ''
              }`}
            >
              {task.title}
            </h3>
          </div>

          {task.description && (
            <p className="text-sm text-gray-500 truncate mb-2">{task.description}</p>
          )}

          {/* Tags */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Scope indicator */}
            {task.scope === 'family' && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200">
                👨‍👩‍👧 Семейная
              </span>
            )}
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${priority.color}`}>
              {priority.icon} {priority.label}
            </span>
            
            <span className="text-xs text-gray-500">
              {categoryEmoji[task.category]} {task.category === 'work' ? 'Работа' : task.category === 'personal' ? 'Личное' : task.category === 'health' ? 'Здоровье' : task.category === 'study' ? 'Учёба' : 'Другое'}
            </span>

            {task.dueDate && (
              <span className={`inline-flex items-center gap-1 text-xs font-medium ${dueLabel.color}`}>
                <Calendar size={12} />
                {dueLabel.text}
              </span>
            )}

            {task.reminderDate && !task.reminderSent && (
              <span className="inline-flex items-center gap-1 text-xs text-purple-500">
                <Bell size={12} />
                Напоминание
              </span>
            )}
          </div>
        </div>

        {/* Arrow */}
        {!isCompleted && !isCancelled && (
          <ChevronRight size={20} className="text-gray-300 flex-shrink-0 mt-1" />
        )}
      </div>

      {/* Overdue indicator */}
      {task.dueDate && isOverdue(task.dueDate) && !isCompleted && !isCancelled && (
        <div className="absolute top-2 right-2">
          <AlertTriangle size={16} className="text-red-500" />
        </div>
      )}
    </motion.div>
  );
}

function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}
