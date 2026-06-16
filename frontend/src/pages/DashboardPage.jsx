// src/pages/DashboardPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
  Sun, Cloud, CloudRain, Thermometer, Droplet, Wind,
  Sprout, CheckCircle, Apple, AlertTriangle, ArrowRight,
  Calendar, Loader2
} from 'lucide-react';

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  
  const [weather, setWeather] = useState(null);
  const [stats, setStats] = useState({
    totalPlants: 0,
    plantsWithIssues: 0,
    tasksToday: 0,
    urgentTasks: 0,
    readyToHarvest: 0,
  });
  const [seasonProgress, setSeasonProgress] = useState(0);
  const [criticalTasks, setCriticalTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchDashboardData();
  }, [user]);

  async function fetchDashboardData() {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      
      // 1. Отримуємо погоду
      await fetchWeather();
      
      // 2. Рахуємо статистику
      const { data: plants } = await supabase
        .from('my_plants')
        .select('*, plant_library(vegetation_days)')
        .eq('user_id', user.id)
        .eq('status', 'active');
      
      const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .eq('due_date', today)
        .eq('is_completed', false);
      
      // Рахуємо рослини готові до збору (>90% вегетації)
      let readyToHarvest = 0;
      (plants || []).forEach(plant => {
        if (plant.planted_date && plant.plant_library?.vegetation_days) {
          const daysPlanted = Math.floor(
            (new Date() - new Date(plant.planted_date)) / (1000 * 60 * 60 * 24)
          );
          const progress = (daysPlanted / plant.plant_library.vegetation_days) * 100;
          if (progress >= 90) readyToHarvest++;
        }
      });
      
      setStats({
        totalPlants: (plants || []).length,
        plantsWithIssues: 0, // Поки 0, можна додати логіку пізніше
        tasksToday: (tasks || []).length,
        urgentTasks: (tasks || []).filter(t => t.priority === 'high' || t.priority === 'urgent').length,
        readyToHarvest,
      });
      
      // Критичні задачі (high priority)
      setCriticalTasks(
        (tasks || [])
          .filter(t => t.priority === 'high' || t.priority === 'urgent')
          .slice(0, 3)
      );
      
      // Сезонний прогрес (припустимо сезон 1 квітня - 31 жовтня = 213 днів)
      const seasonStart = new Date(new Date().getFullYear(), 3, 1); // 1 квітня
      const seasonEnd = new Date(new Date().getFullYear(), 9, 31); // 31 жовтня
      const now = new Date();
      const totalDays = (seasonEnd - seasonStart) / (1000 * 60 * 60 * 24);
      const passedDays = (now - seasonStart) / (1000 * 60 * 60 * 24);
      const progress = Math.max(0, Math.min(100, (passedDays / totalDays) * 100));
      setSeasonProgress(Math.round(progress));
      
    } catch (err) {
      console.error('Помилка:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchWeather() {
    try {
      // Координати Вінниці (або іншого міста з профілю)
      const cityName = profile?.region?.split(' ')[0] || 'Вінниця';
      const cities = {
        'Київ': { lat: 50.45, lon: 30.52 },
        'Львів': { lat: 49.84, lon: 24.03 },
        'Одеса': { lat: 46.48, lon: 30.73 },
        'Харків': { lat: 49.99, lon: 36.23 },
        'Вінниця': { lat: 49.23, lon: 28.47 },
        'Дніпро': { lat: 48.46, lon: 35.04 },
      };
      const coords = cities[cityName] || cities['Вінниця'];
      
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode&timezone=auto&forecast_days=2`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      setWeather({
        today: {
          temp_max: data.daily.temperature_2m_max[0],
          temp_min: data.daily.temperature_2m_min[0],
          rain: data.daily.precipitation_sum[0],
          code: data.daily.weathercode[0],
        },
        tomorrow: {
          temp_max: data.daily.temperature_2m_max[1],
          temp_min: data.daily.temperature_2m_min[1],
          rain: data.daily.precipitation_sum[1],
          code: data.daily.weathercode[1],
        },
        city: cityName,
      });
    } catch (err) {
      console.error('Помилка погоди:', err);
    }
  }

  // Іконка погоди за кодом WMO
  function getWeatherIcon(code) {
    if (code === 0 || code === 1) return <Sun className="w-8 h-8 text-garden-harvest" />;
    if (code <= 3) return <Cloud className="w-8 h-8 text-gray-400" />;
    if (code >= 51) return <CloudRain className="w-8 h-8 text-garden-water" />;
    return <Sun className="w-8 h-8 text-garden-harvest" />;
  }

  function getWeatherDescription(code) {
    if (code === 0) return 'Ясно';
    if (code === 1 || code === 2) return 'Переважно ясно';
    if (code === 3) return 'Хмарно';
    if (code >= 51 && code <= 55) return 'Мряка';
    if (code >= 61 && code <= 67) return 'Дощ';
    if (code >= 71 && code <= 77) return 'Сніг';
    if (code >= 80 && code <= 82) return 'Зливи';
    if (code >= 95) return 'Гроза';
    return '';
  }

  if (loading) {
    return (
      <div className="card text-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-garden-green mx-auto mb-4" />
        <p className="text-gray-600">Завантажую панель...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div>
        <h2 className="text-2xl font-bold text-garden-green mb-1">
          🌿 Добрий день!
        </h2>
        <p className="text-gray-600">
          {new Date().toLocaleDateString('uk-UA', {
            day: 'numeric',
            month: 'long',
            weekday: 'long',
          })}
        </p>
      </div>

      {/* Віджет погоди */}
      {weather && (
        <div className="card bg-gradient-to-br from-garden-water/10 to-garden-leaf/10 border-garden-water/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Thermometer className="w-5 h-5 text-garden-water" />
              <h3 className="font-bold text-garden-green">
                Погода · {weather.city}
              </h3>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {/* Сьогодні */}
            <div className="bg-white/60 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Сьогодні</span>
                {getWeatherIcon(weather.today.code)}
              </div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-3xl font-bold text-garden-green">
                  {Math.round(weather.today.temp_max)}°
                </span>
                <span className="text-sm text-gray-500">
                  / {Math.round(weather.today.temp_min)}°
                </span>
              </div>
              <p className="text-xs text-gray-600">
                {getWeatherDescription(weather.today.code)}
                {weather.today.rain > 0 && ` · ${weather.today.rain} мм`}
              </p>
            </div>

            {/* Завтра */}
            <div className="bg-white/60 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Завтра</span>
                {getWeatherIcon(weather.tomorrow.code)}
              </div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-3xl font-bold text-garden-green">
                  {Math.round(weather.tomorrow.temp_max)}°
                </span>
                <span className="text-sm text-gray-500">
                  / {Math.round(weather.tomorrow.temp_min)}°
                </span>
              </div>
              <p className="text-xs text-gray-600">
                {getWeatherDescription(weather.tomorrow.code)}
                {weather.tomorrow.rain > 0 && (
                  <span className="text-garden-water font-semibold">
                    {' '}· {weather.tomorrow.rain} мм 🌧
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Статистика - 3 картки */}
      <div className="grid grid-cols-3 gap-3">
        {/* Рослини */}
        <div 
          onClick={() => navigate('/garden')}
          className="card hover:shadow-lg cursor-pointer transition-all text-center"
        >
          <Sprout className="w-8 h-8 text-garden-leaf mx-auto mb-2" />
          <div className="text-2xl font-bold text-garden-green mb-1">
            {stats.totalPlants}
          </div>
          <div className="text-xs text-gray-600">
            Рослин
          </div>
          {stats.plantsWithIssues > 0 && (
            <div className="text-xs text-garden-alert mt-1">
              ⚠️ {stats.plantsWithIssues}
            </div>
          )}
        </div>

        {/* Задачі */}
        <div 
          onClick={() => navigate('/')}
          className="card hover:shadow-lg cursor-pointer transition-all text-center"
        >
          <CheckCircle className="w-8 h-8 text-garden-water mx-auto mb-2" />
          <div className="text-2xl font-bold text-garden-green mb-1">
            {stats.tasksToday}
          </div>
          <div className="text-xs text-gray-600">
            Задач сьогодні
          </div>
          {stats.urgentTasks > 0 && (
            <div className="text-xs text-garden-alert mt-1 font-semibold">
              🔴 {stats.urgentTasks} терміново
            </div>
          )}
        </div>

        {/* Готові до збору */}
        <div className="card text-center">
          <Apple className="w-8 h-8 text-garden-harvest mx-auto mb-2" />
          <div className="text-2xl font-bold text-garden-green mb-1">
            {stats.readyToHarvest}
          </div>
          <div className="text-xs text-gray-600">
            Готові до збору
          </div>
        </div>
      </div>

      {/* Сезонний прогрес */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-5 h-5 text-garden-green" />
          <h3 className="font-bold text-garden-green">
            Сезонний прогрес
          </h3>
        </div>
        <div className="mb-2">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-600">1 квітня</span>
            <span className="font-bold text-garden-green">{seasonProgress}%</span>
            <span className="text-gray-600">31 жовтня</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-garden-leaf to-garden-harvest rounded-full transition-all"
              style={{ width: `${seasonProgress}%` }}
            />
          </div>
        </div>
        <p className="text-xs text-gray-500 text-center">
          {Math.round(seasonProgress * 2.13)} з 213 днів сезону пройдено
        </p>
      </div>

      {/* Критичні задачі */}
      {criticalTasks.length > 0 && (
        <div className="card bg-garden-alert/5 border-garden-alert/20">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-garden-alert" />
            <h3 className="font-bold text-garden-alert">
              🚨 Термінові задачі
            </h3>
          </div>
          <div className="space-y-2">
            {criticalTasks.map(task => (
              <div 
                key={task.id}
                className="bg-white rounded-lg p-3 flex items-center gap-3"
              >
                <span className="text-2xl">
                  {task.task_type === 'water' && '💧'}
                  {task.task_type === 'feed' && '🌿'}
                  {task.task_type === 'harvest' && '🍎'}
                  {task.task_type === 'alert' && '⚠️'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-garden-green text-sm truncate">
                    {task.title}
                  </p>
                  <p className="text-xs text-gray-600 truncate">
                    {task.recommended_time}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => navigate('/')}
            className="mt-3 w-full py-2 text-sm font-semibold text-garden-green hover:bg-white rounded-lg transition-all flex items-center justify-center gap-1"
          >
            Перейти до всіх задач
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Швидкі дії */}
      <div className="card">
        <h3 className="font-bold text-garden-green mb-3">⚡ Швидкі дії</h3>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => navigate('/plants/new')}
            className="bg-garden-leaf/10 hover:bg-garden-leaf/20 text-garden-green py-3 rounded-xl font-semibold text-sm transition-all"
          >
            ➕ Додати рослину
          </button>
          <button
            onClick={() => navigate('/garden')}
            className="bg-garden-water/10 hover:bg-garden-water/20 text-garden-water py-3 rounded-xl font-semibold text-sm transition-all"
          >
            🗺 Мій город
          </button>
        </div>
      </div>
    </div>
  );
}