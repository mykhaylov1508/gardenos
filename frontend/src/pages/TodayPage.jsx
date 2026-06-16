// src/pages/TodayPage.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Droplet, Leaf, Apple, Search, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function TodayPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) fetchTasks();
  }, [user]);

  async function fetchTasks() {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          my_plants (
            id,
            custom_name,
            plant_library (name_uk)
          )
        `)
        .eq('user_id', user.id)
        .eq('due_date', today)
        .eq('is_completed', false)
        .order('priority', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (err) {
      console.error('Помилка:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function completeTask(task) {
    try {
      // 1. Оновлюємо задачу
      await supabase
        .from('tasks')
        .update({
          is_completed: true,
          completed_at: new Date().toISOString(),
        })
        .eq('id', task.id);

      // 2. Записуємо подію
      if (task.plant_id) {
        await supabase.from('events_log').insert({
          user_id: user.id,
          plant_id: task.plant_id,
          event_type: task.task_type,
          event_date: new Date().toISOString().split('T')[0],
          notes: `Виконано: ${task.title}`,
        });
      }

      // 3. Видаляємо зі списку
      setTasks(tasks.filter((t) => t.id !== task.id));
    } catch (err) {
      alert('Помилка: ' + err.message);
    }
  }

  function getTaskIcon(type) {
    switch (type) {
      case 'water':
        return <Droplet className="w-6 h-6 text-garden-water" />;
      case 'feed':
        return <Leaf className="w-6 h-6 text-garden-leaf" />;
      case 'harvest':
        return <Apple className="w-6 h-6 text-garden-harvest" />;
      default:
        return <Search className="w-6 h-6 text-garden-green" />;
    }
  }

  function getPriorityClass(priority) {
    if (priority === 'high' || priority === 'urgent') return 'priority-high';
    if (priority === 'normal') return 'priority-normal';
    return 'priority-low';
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-garden-green mb-2">
          📋 Задачі на сьогодні
        </h2>
        <p className="text-gray-600">
          {new Date().toLocaleDateString('uk-UA', {
            day: 'numeric',
            month: 'long',
            weekday: 'long',
          })}
        </p>
      </div>

      {loading && (
        <div className="card text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-garden-green mx-auto mb-4" />
          <p className="text-gray-600">Завантажую задачі...</p>
        </div>
      )}

      {error && (
        <div className="card bg-red-50 border-red-200 text-center py-8">
          <AlertCircle className="w-12 h-12 text-garden-alert mx-auto mb-3" />
          <p className="text-garden-alert font-semibold mb-2">
            Помилка завантаження
          </p>
          <p className="text-sm text-gray-600">{error}</p>
        </div>
      )}

      {!loading && !error && tasks.length === 0 && (
        <div className="card text-center py-16">
          <div className="text-6xl mb-4">🎉</div>
          <h3 className="text-xl font-bold text-garden-green mb-2">
            Все зроблено!
          </h3>
          <p className="text-gray-600">Твої рослини доглянуті.</p>
        </div>
      )}

      {!loading && !error && tasks.length > 0 && (
        <div className="space-y-4">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`task-card ${getPriorityClass(task.priority)}`}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center">
                  {getTaskIcon(task.task_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-garden-green mb-2">
                    {task.title}
                  </h3>
                  {task.action_description && (
                    <p className="text-gray-700 mb-2">
                      📝 {task.action_description}
                    </p>
                  )}
                  {task.explanation_text && (
                    <div className="bg-garden-cream rounded-lg p-3 mb-3">
                      <p className="text-sm text-gray-700">
                        <span className="font-semibold text-garden-green">
                          💡 Чому:{' '}
                        </span>
                        {task.explanation_text}
                      </p>
                    </div>
                  )}
                  {task.recommended_time && (
                    <p className="text-sm text-gray-500 mb-3">
                      ⏰ {task.recommended_time}
                    </p>
                  )}
                  <button
                    onClick={() => completeTask(task)}
                    className="btn-success flex items-center gap-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Виконано
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}