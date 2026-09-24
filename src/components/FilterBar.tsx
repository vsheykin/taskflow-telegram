import { FilterStatus, FilterPriority, Priority, Status } from '../types';
import { motion } from 'framer-motion';
import { Filter, X } from 'lucide-react';

interface FilterBarProps {
  statusFilter: FilterStatus;
  priorityFilter: FilterPriority;
  onStatusChange: (status: FilterStatus) => void;
  onPriorityChange: (priority: FilterPriority) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export default function FilterBar({
  statusFilter,
  priorityFilter,
  onStatusChange,
  onPriorityChange,
  searchQuery,
  onSearchChange,
}: FilterBarProps) {
  const hasFilters = statusFilter !== 'all' || priorityFilter !== 'all' || searchQuery !== '';

  const statusOptions: { value: FilterStatus; label: string }[] = [
    { value: 'all', label: 'Все' },
    { value: 'new', label: 'Новые' },
    { value: 'in_progress', label: 'В работе' },
    { value: 'completed', label: 'Выполнены' },
    { value: 'cancelled', label: 'Отменены' },
  ];

  const priorityOptions: { value: FilterPriority; label: string; emoji: string }[] = [
    { value: 'all', label: 'Все', emoji: '📋' },
    { value: 'high', label: 'Высокий', emoji: '🔴' },
    { value: 'medium', label: 'Средний', emoji: '🟡' },
    { value: 'low', label: 'Низкий', emoji: '🟢' },
  ];

  return (
    <div className="px-4 pb-3">
      {/* Search */}
      <div className="relative mb-3">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="🔍 Поиск задач..."
          className="w-full px-4 py-2.5 rounded-xl bg-gray-100 text-gray-900 placeholder-gray-400 text-sm outline-none focus:bg-gray-50 focus:ring-2 focus:ring-blue-200 transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            <X size={16} className="text-gray-400" />
          </button>
        )}
      </div>

      {/* Status Filter */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide mb-2">
        {statusOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onStatusChange(opt.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              statusFilter === opt.value
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Priority Filter */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {priorityOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onPriorityChange(opt.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              priorityFilter === opt.value
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {opt.emoji} {opt.label}
          </button>
        ))}
      </div>

      {/* Clear filters */}
      {hasFilters && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => {
            onStatusChange('all');
            onPriorityChange('all');
            onSearchChange('');
          }}
          className="mt-2 text-xs text-blue-500 font-medium"
        >
          ✕ Сбросить фильтры
        </motion.button>
      )}
    </div>
  );
}
