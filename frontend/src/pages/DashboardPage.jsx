// src/pages/DashboardPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
  Sun, Cloud, CloudRain, Thermometer, Droplet, Wind,
  Sprout, CheckCircle, Apple, AlertTriangle, ArrowRight,
  Calendar, Loader2, Clock
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
      .select('*, plant_library(vegetation_days), health_score, growth_stage')
      .eq('user_id', user.id)
      .in('status', ['active', 'planned']);  // ← active + planned
      
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
      
    // Розрахунок загального Health Score
    // Рахуємо на основі простих правил
    // Розрахунок загального Health Score
    let averageHealthScore = 100;
    let plantsWithIssues = 0;

    (plants || []).forEach(plant => {
      // Використовуємо health_score з БД (якщо є)
      const plantScore = plant.health_score 
        ? Number(plant.health_score) 
        : 100;
      
      if (plantScore < 70) {
        plantsWithIssues++;
      }
    });

    // Середній health score
    if (plants && plants.length > 0) {
      const totalScore = plants.reduce((sum, p) => {
        return sum + (p.health_score ? Number(p.health_score) : 100);
      }, 0);
      averageHealthScore = Math.round(totalScore / plants.length);
    }

    averageHealthScore = Math.max(0, Math.min(100, averageHealthScore));

    // 🔧 ОНОВЛЮЄМО СТАТИСТИКУ (було відсутнє!)
    setStats({
      totalPlants: (plants || []).length,
      plantsWithIssues: plantsWithIssues,
      tasksToday: (tasks || []).length,
      urgentTasks: (tasks || []).filter(t => t.priority === 'high' || t.priority === 'urgent').length,
      readyToHarvest: readyToHarvest,
      healthScore: averageHealthScore,
    });

      // Критичні задачі (high priority)
      // Сортуємо задачі: спочатку urgent/high, потім normal. Беремо максимум 4.
      const priorityWeight = { urgent: 3, high: 2, normal: 1, low: 0 };
      const sortedTasks = (tasks || [])
        .sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority])
        .slice(0, 4);
      
      setCriticalTasks(sortedTasks);
      
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

    // Виконання задачі прямо з Dashboard
  async function handleTaskComplete(taskId) {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          is_completed: true,
          completed_at: new Date().toISOString()
        })
        .eq('id', taskId);
      
      if (error) throw error;
      
      // Оновлюємо дані після виконання
      await fetchDashboardData();
    } catch (err) {
      console.error('Помилка виконання задачі:', err);
    }
  }

  // Визначення часу доби для привітання
  function getTimeGreeting() {
    const hour = new Date().getHours();
    if (hour < 11) return { text: 'Доброго ранку', icon: '🌅' };
    if (hour < 18) return { text: 'Доброго дня', icon: '☀️' };
    return { text: 'Доброго вечора', icon: '🌇' };
  }

  async function fetchWeather() {
    try {
      // 🆕 Використовуємо точні координати з профілю якщо є
      let lat, lon, locationName;
      
      if (profile?.latitude && profile?.longitude) {
        lat = profile.latitude;
        lon = profile.longitude;
        locationName = profile.location_name || 'Моє місце';
      } else {
        const cityName = profile?.region?.split(' ')[0] || 'Вінниця';
        const cities = {
          'Київ': { lat: 50.45, lon: 30.52 },
          'Львів': { lat: 49.84, lon: 24.03 },
          'Одеса': { lat: 46.48, lon: 30.73 },
          'Харків': { lat: 49.99, lon: 36.23 },
          'Вінниця': { lat: 49.23, lon: 28.47 },
          'Дніпро': { lat: 48.46, lon: 35.04 },
          'Хмельницький': { lat: 49.42, lon: 26.99 },
        };
        const coords = cities[cityName] || cities['Вінниця'];
        lat = coords.lat;
        lon = coords.lon;
        locationName = cityName;
      }

      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode,relative_humidity_2m_max&timezone=auto&forecast_days=2`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      setWeather({
        today: {
          temp_max: data.daily.temperature_2m_max[0],
          temp_min: data.daily.temperature_2m_min[0],
          rain: data.daily.precipitation_sum[0],
          code: data.daily.weathercode[0],
          humidity: data.daily.relative_humidity_2m_max?.[0],
        },
        tomorrow: {
          temp_max: data.daily.temperature_2m_max[1],
          temp_min: data.daily.temperature_2m_min[1],
          rain: data.daily.precipitation_sum[1],
          code: data.daily.weathercode[1],
        },
        city: locationName,
        hasExactCoords: !!(profile?.latitude && profile?.longitude),
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
              <h3 className="font-bold text-garden-green flex items-center gap-2">
                {weather.hasExactCoords ? '📍' : '🏙'} Погода · {weather.city}
                {weather.hasExactCoords && (
                  <span className="text-xs bg-garden-leaf/20 text-garden-leaf px-2 py-0.5 rounded-full">
                    точна
                  </span>
                )}
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
              <p className="text-xs text-gray-600 mb-1">
                {getWeatherDescription(weather.today.code)}
                {weather.today.rain > 0 && ` · ${weather.today.rain} мм`}
              </p>
              {weather.today.humidity && (
                <div className="text-xs text-gray-600 mt-1">
                  💧 Вологість: {weather.today.humidity}%
                </div>
              )}
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

  {/* Пульс садиби */}
  <div className="card bg-gradient-to-br from-garden-leaf/10 to-garden-green/10 border-garden-leaf/30">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <span className="text-2xl">🌿</span>
        <h3 className="font-bold text-garden-green text-lg">
          Пульс садиби
        </h3>
      </div>
      <div className="text-right">
        <div className={`text-4xl font-bold ${
          stats.healthScore >= 80 ? 'text-garden-leaf' :
          stats.healthScore >= 60 ? 'text-garden-harvest' :
          'text-garden-alert'
        }`}>
          {stats.healthScore}
        </div>
        <div className="text-xs text-gray-600">
          {stats.healthScore >= 80 ? 'Добре' :
          stats.healthScore >= 60 ? 'Потребує уваги' :
          'Критично'}
        </div>
      </div>
    </div>
    
    {/* Шкала */}
    <div className="mb-4">
      <div className="w-full bg-white/60 rounded-full h-3 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            stats.healthScore >= 80 ? 'bg-garden-leaf' :
            stats.healthScore >= 60 ? 'bg-garden-harvest' :
            'bg-garden-alert'
          }`}
          style={{ width: `${stats.healthScore}%` }}
        />
      </div>
    </div>
    
    {/* Деталі */}
    <div className="grid grid-cols-3 gap-3 text-center">
      <div className="bg-white/60 rounded-lg p-3">
        <div className="text-2xl mb-1">
          {stats.plantsWithIssues === 0 ? '🟢' : '🟡'}
        </div>
        <div className="text-xs text-gray-600">
          {stats.plantsWithIssues === 0 
            ? 'Всі рослини в нормі' 
            : `${stats.plantsWithIssues} потребують уваги`}
        </div>
      </div>
      <div className="bg-white/60 rounded-lg p-3">
        <div className="text-2xl mb-1">
          {stats.urgentTasks === 0 ? '🟢' : '🔴'}
        </div>
        <div className="text-xs text-gray-600">
          {stats.urgentTasks === 0 
            ? 'Немає термінових задач' 
            : `${stats.urgentTasks} термінових`}
        </div>
      </div>
      <div className="bg-white/60 rounded-lg p-3">
        <div className="text-2xl mb-1">🍎</div>
        <div className="text-xs text-gray-600">
          {stats.readyToHarvest === 0 
            ? 'Немає готових' 
            : `${stats.readyToHarvest} готові до збору`}
        </div>
      </div>
    </div>
  </div>

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
          onClick={() => navigate('/tasks')}
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
        <div 
          onClick={() => navigate('/season?filter=ready')}
          className="card hover:shadow-lg cursor-pointer transition-all text-center"
        >
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
            {/* 🆕 РАНКОВИЙ БРИФІНГ: Задачі на сьогодні */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-garden-green text-lg flex items-center gap-2">
            {getTimeGreeting().icon} {getTimeGreeting().text}!
          </h3>
          {weather && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              {Math.round(weather.today.temp_max)}°C, {weather.today.rain > 0 ? `дощ ${weather.today.rain}мм` : 'без опадів'}
            </span>
          )}
        </div>

        {criticalTasks.length === 0 ? (
          <div className="card text-center py-8 bg-garden-leaf/10 border-garden-leaf/30">
            <div className="text-4xl mb-2">🎉</div>
            <p className="font-semibold text-garden-green">На сьогодні завдань немає!</p>
            <p className="text-sm text-gray-600 mt-1">Всі рослини доглянуті. Час відпочити.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {criticalTasks.map(task => {
              // Визначаємо колір рамки за пріоритетом
              const borderColor = task.priority === 'urgent' ? 'border-garden-alert' : 
                                  task.priority === 'high' ? 'border-garden-harvest' : 'border-garden-leaf';
              
              const taskIcon = task.task_type === 'water' ? '💧' :
                               task.task_type === 'feed' ? '🌿' :
                               task.task_type === 'harvest' ? '🍎' :
                               task.task_type === 'alert' ? '🚨' : '📋';

              return (
                <div 
                  key={task.id} 
                  className={`bg-white rounded-xl shadow-sm border-l-4 ${borderColor} p-4 transition-all hover:shadow-md`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-start gap-3 flex-1">
                      <span className="text-2xl flex-shrink-0 mt-0.5">{taskIcon}</span>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-garden-green text-base leading-tight mb-1">
                          {task.title}
                        </h4>
                        {/* "Чому" - головна фіча навчання */}
                        <p className="text-sm text-gray-600 leading-snug">
                          {task.explanation_text}
                        </p>
                        <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-500">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{task.recommended_time || 'Будь-який час'}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Кнопка швидкого виконання */}
                    <button
                      onClick={() => handleTaskComplete(task.id)}
                      className="flex-shrink-0 bg-garden-green text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-opacity-90 transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Виконано
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Посилання на повний список */}
        {criticalTasks.length > 0 && (
          <button
            onClick={() => navigate('/tasks')}
            className="w-full py-3 text-sm font-semibold text-garden-green hover:bg-garden-cream rounded-xl transition-all flex items-center justify-center gap-1 border border-garden-green/20"
          >
            Переглянути всі задачі на тиждень
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

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