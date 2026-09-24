import { useState, useEffect } from 'react';
import { Task, Priority, Status, Category } from '../types';
import { generateId } from '../store';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Calendar, Bell, Tag } from 'lucide-react';

interface TaskFormProps {
  task: Task | null;
  onSave: (task: Task) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export default function TaskForm({ task, onSave, onDelete, onClose }: TaskFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [status, setStatus] = useState<Status>('new');
  const [category, setCategory] = useState<Category>('work');
  const [dueDate, setDueDate] = useState('');
  const [reminderDate, setReminderDate] = useState('');
  const [tags, setTags] = useState('');

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description);
      setPriority(task.priority);
      setStatus(task.status);
      setCategory(task.category);
      setDueDate(task.dueDate ? task.dueDate.slice(0, 16) : '');
      setReminderDate(task.reminderDate ? task.reminderDate.slice(0, 16) : '');
      setTags(task.tags.join(', '));
    }
  }, [task]);

  const handleSave = () => {
    if (!title.trim()) return;

    const savedTask: Task = {
      id: task?.id || generateId(),
      title: title.trim(),
      description: description.trim(),
      priority,
      status,
      category,
      createdAt: task?.createdAt || new Date().toISOString(),
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      reminderDate: reminderDate ? new Date(reminderDate).toISOString() : null,
      reminderSent: task?.reminderSent || false,
      completedAt: status === 'completed' ? new Date().toISOString() : null,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
    };

    onSave(savedTask);
  };

  const priorities: { value: Priority; label: string; emoji: string }[] = [
    { value: 'low', label: 'Низкий', emoji: '🟢' },
    { value: 'medium', label: 'Средний', emoji: '🟡' },
    { value: 'high', label: 'Высокий', emoji: '🔴' },
  ];

  const statuses: { value: Status; label: string }[] = [
    { value: 'new', label: '🆕 Новая' },
    { value: 'in_progress', label: '⏳ В работе' },
    { value: 'completed', label: '✅ Выполнена' },
    { value: 'cancelled', label: '❌ Отменена' },
  ];

  const categories: { value: Category; label: string; emoji: string }[] = [
    { value: 'work', label: 'Работа', emoji: '💼' },
    { value: 'personal', label: 'Личное', emoji: '👤' },
    { value: 'health', label: 'Здоровье', emoji: '🏃' },
    { value: 'study', label: 'Учёба', emoji: '📚' },
    { value: 'other', label: 'Другое', emoji: '📌' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-end"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="bg-white w-full rounded-t-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 px-5 pt-5 pb-3 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">
              {task ? 'Редактировать задачу' : 'Новая задача'}
            </h2>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
              <X size={24} className="text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Название *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Что нужно сделать?"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-gray-900 text-base"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Детали задачи..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-gray-900 text-base resize-none"
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Приоритет</label>
            <div className="flex gap-2">
              {priorities.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPriority(p.value)}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-all ${
                    priority === p.value
                      ? 'bg-blue-50 border-2 border-blue-500 text-blue-700'
                      : 'bg-gray-50 border-2 border-transparent text-gray-600'
                  }`}
                >
                  {p.emoji} {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Категория</label>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setCategory(c.value)}
                  className={`py-2 px-3 rounded-xl text-sm font-medium transition-all ${
                    category === c.value
                      ? 'bg-blue-50 border-2 border-blue-500 text-blue-700'
                      : 'bg-gray-50 border-2 border-transparent text-gray-600'
                  }`}
                >
                  {c.emoji} {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          {task && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Статус</label>
              <div className="flex flex-wrap gap-2">
                {statuses.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setStatus(s.value)}
                    className={`py-2 px-3 rounded-xl text-sm font-medium transition-all ${
                      status === s.value
                        ? 'bg-blue-50 border-2 border-blue-500 text-blue-700'
                        : 'bg-gray-50 border-2 border-transparent text-gray-600'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Due Date */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
              <Calendar size={16} /> Дедлайн
            </label>
            <input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-gray-900 text-base"
            />
          </div>

          {/* Reminder */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
              <Bell size={16} /> Напоминание
            </label>
            <input
              type="datetime-local"
              value={reminderDate}
              onChange={(e) => setReminderDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-gray-900 text-base"
            />
            <p className="text-xs text-gray-400 mt-1">
              ⏰ Напоминание сработает в указанное время (при открытом приложении)
            </p>
          </div>

          {/* Tags */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
              <Tag size={16} /> Теги (через запятую)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="важное, срочное, проект..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-gray-900 text-base"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2 pb-6">
            {task && (
              <button
                onClick={() => onDelete(task.id)}
                className="px-4 py-3 rounded-xl bg-red-50 text-red-600 font-medium flex items-center gap-2"
              >
                <Trash2 size={18} />
                Удалить
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={!title.trim()}
              className="flex-1 py-3 rounded-xl bg-blue-500 text-white font-semibold text-base disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-transform"
            >
              {task ? 'Сохранить' : 'Создать задачу'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
