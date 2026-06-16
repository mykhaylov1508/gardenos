// src/pages/SeasonPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Calendar, Filter, Sprout, Flower2, Apple, AlertTriangle,
  TrendingUp, ChevronRight, Loader2, Leaf, Droplet, Snowflake,
  Thermometer
} from 'lucide-react';

// Конфігурація сезону
const SEASON_START_MONTH = 2; // Березень (0-indexed)
const SEASON_START_DAY = 1;
const SEASON_END_MONTH = 9;   // Жовтень
const SEASON_END_DAY = 31;

const MONTHS_UK = [
  'Січ', 'Лют', 'Бер', 'Кві', 'Тра', 'Чер',
  'Лип', 'Сер', 'Вер', 'Жов', 'Лис', 'Гру'
];

const MONTHS_FULL_UK = [
  'Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень',
  'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'
];

// Кольори стадій росту
const STAGE_COLORS = {
  seedling: { bg: '#4a7fa5', label: 'Розсада', icon: '🌱' },    // 0-20%
  growing:  { bg: '#7ba05b', label: 'Ріст', icon: '🌿' },       // 20-45%
  flowering:{ bg: '#d4a839', label: 'Цвітіння', icon: '🌸' },   // 45-60%
  fruiting: { bg: '#c4603a', label: 'Плоди', icon: '🥒' },      // 60-90%
  harvest:  { bg: '#e8533a', label: 'Збір', icon: '🍎' },       // 90%+
  done:     { bg: '#8b7355', label: 'Зібрано', icon: '✅' },
};

// Іконки категорій
function getCategoryIcon(category) {
  switch (category) {
    case 'vegetable': return '🥬';
    case 'fruit': return '🍓';
    case 'herb': return '🌿';
    case 'tree': return '🌳';
    case 'bush': return '🌲';
    default: return '🌱';
  }
}

// Визначення стадії росту
function getGrowthStage(plant) {
  if (plant.status === 'harvested') return 'done';
  if (!plant.planted_date || !plant.plant_library?.vegetation_days) return 'seedling';
  
  const daysPlanted = Math.floor(
    (new Date() - new Date(plant.planted_date)) / (1000 * 60 * 60 * 24)
  );
  const progress = (daysPlanted / plant.plant_library.vegetation_days) * 100;
  
  if (progress >= 90) return 'harvest';
  if (progress >= 60) return 'fruiting';
  if (progress >= 45) return 'flowering';
  if (progress >= 20) return 'growing';
  return 'seedling';
}

// Обчислення прогресу
function getProgress(plant) {
  if (!plant.planted_date || !plant.plant_library?.vegetation_days) return 0;
  const daysPlanted = Math.floor(
    (new Date() - new Date(plant.planted_date)) / (1000 * 60 * 60 * 24)
  );
  return Math.min(100, Math.max(0, (daysPlanted / plant.plant_library.vegetation_days) * 100));
}

export default function SeasonPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [plants, setPlants] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [hoveredPlant, setHoveredPlant] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
  // Сезонні дати
  const year = new Date().getFullYear();
  const seasonStart = new Date(year, SEASON_START_MONTH, SEASON_START_DAY);
  const seasonEnd = new Date(year, SEASON_END_MONTH, SEASON_END_DAY);
  const today = new Date();
  
  const totalDays = (seasonEnd - seasonStart) / (1000 * 60 * 60 * 24);
  const passedDays = Math.max(0, (today - seasonStart) / (1000 * 60 * 60 * 24));
  const seasonProgress = Math.min(100, Math.max(0, (passedDays / totalDays) * 100));

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  async function fetchData() {
    try {
      setLoading(true);
      
      const { data: zonesData } = await supabase
        .from('my_zones')
        .select('*')
        .eq('user_id', user.id);
      
      const { data: plantsData } = await supabase
        .from('my_plants')
        .select(`
          *,
          plant_library (
            name_uk, category, vegetation_days, 
            watering_interval_days, frost_tolerance_c
          ),
          my_zones (id, name)
        `)
        .eq('user_id', user.id)
        .in('status', ['active', 'harvested']);
      
      setZones(zonesData || []);
      setPlants(plantsData || []);
    } catch (err) {
      console.error('Помилка:', err);
    } finally {
      setLoading(false);
    }
  }

  // Фільтрація рослин
  const filteredPlants = plants.filter(plant => {
    if (filter === 'all') return true;
    if (filter === 'ready') return getProgress(plant) >= 90;
    if (filter === 'attention') return getGrowthStage(plant) === 'harvest';
    return plant.plant_library?.category === filter;
  });

  // Групування по зонам
  const plantsByZone = zones.map(zone => ({
    ...zone,
    plants: filteredPlants.filter(p => p.zone_id === zone.id)
  })).filter(z => z.plants.length > 0);

  const unassignedPlants = filteredPlants.filter(p => !p.zone_id);

  // Обчислення статистики
  const stats = {
    total: plants.length,
    readyToHarvest: plants.filter(p => getProgress(p) >= 90 && p.status === 'active').length,
    seedlings: plants.filter(p => getGrowthStage(p) === 'seedling').length,
    flowering: plants.filter(p => getGrowthStage(p) === 'flowering').length,
  };

  // Позиція "сьогодні" на таймлайні (у відсотках)
  const todayPosition = Math.min(100, Math.max(0, (passedDays / totalDays) * 100));

  // Tooltip handlers
  function handlePlantHover(plant, e) {
    setHoveredPlant(plant);
    setMousePos({ x: e.clientX, y: e.clientY });
  }

  if (loading) {
    return (
      <div className="card text-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-garden-green mx-auto mb-4" />
        <p className="text-gray-600">Завантажую сезон...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      
      {/* Заголовок + прогрес сезону */}
      <div className="card bg-gradient-to-br from-garden-leaf/10 to-garden-harvest/10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-garden-green" />
            <h2 className="font-bold text-garden-green">
              Сезон {year}
            </h2>
          </div>
          <span className="text-sm font-bold text-garden-green">
            {Math.round(seasonProgress)}%
          </span>
        </div>
        <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
          <span>1 {MONTHS_FULL_UK[SEASON_START_MONTH]}</span>
          <span>Сьогодні: {today.getDate()} {MONTHS_FULL_UK[today.getMonth()]}</span>
          <span>{SEASON_END_DAY} {MONTHS_FULL_UK[SEASON_END_MONTH]}</span>
        </div>
        <div className="relative w-full bg-white/60 rounded-full h-3 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-garden-leaf via-garden-harvest to-garden-terracotta rounded-full transition-all"
            style={{ width: `${seasonProgress}%` }}
          />
          {/* Маркер "сьогодні" */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-garden-green"
            style={{ left: `${todayPosition}%` }}
          />
        </div>
      </div>

      {/* Цього тижня */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-5 h-5 text-garden-green" />
          <h3 className="font-bold text-garden-green">📊 Цього тижня</h3>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-garden-harvest/10 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-garden-green">{stats.readyToHarvest}</div>
            <div className="text-xs text-gray-600">🍎 Готові</div>
          </div>
          <div className="bg-garden-leaf/10 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-garden-green">{stats.flowering}</div>
            <div className="text-xs text-gray-600">🌸 Цвітуть</div>
          </div>
          <div className="bg-garden-water/10 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-garden-green">{stats.seedlings}</div>
            <div className="text-xs text-gray-600">🌱 Молоді</div>
          </div>
        </div>
        
        {stats.readyToHarvest > 0 && (
          <div className="bg-garden-alert/10 border border-garden-alert/20 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-garden-alert mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <span className="font-semibold text-garden-alert">
                  {stats.readyToHarvest} {stats.readyToHarvest === 1 ? 'культура готова' : 'культур готові'} до збору!
                </span>
                <p className="text-xs text-gray-600 mt-1">
                  Не зволікай — перезрілі плоди втрачають смак
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Фільтри */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4">
        <Filter className="w-4 h-4 text-gray-500 flex-shrink-0" />
        {[
          { id: 'all', label: 'Всі', icon: null },
          { id: 'ready', label: 'Готові', icon: '🍎' },
          { id: 'vegetable', label: 'Овочі', icon: '🥬' },
          { id: 'herb', label: 'Зелень', icon: '🌿' },
          { id: 'fruit', label: 'Ягоди', icon: '🍓' },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
              filter === f.id
                ? 'bg-garden-green text-white shadow-sm'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            {f.icon && <span className="mr-1">{f.icon}</span>}
            {f.label}
          </button>
        ))}
      </div>

      {/* Таймлайн */}
      {filteredPlants.length === 0 ? (
        <EmptyState onAdd={() => navigate('/plants/new')} />
      ) : (
        <div className="card p-0 overflow-hidden">
          {/* Header з місяцями */}
          <div className="border-b border-gray-100 bg-gray-50/50">
            <div className="flex">
              {/* Пуста колонка для назв */}
              <div className="w-28 flex-shrink-0 p-2 text-xs font-semibold text-gray-500">
                Культура
              </div>
              {/* Місяці */}
              <div className="flex-1 flex relative">
                {[2, 3, 4, 5, 6, 7, 8, 9].map((monthIdx) => (
                  <div
                    key={monthIdx}
                    className="flex-1 text-center py-2 text-xs font-semibold text-gray-600 border-l border-gray-100 first:border-l-0"
                  >
                    {MONTHS_UK[monthIdx]}
                  </div>
                ))}
                {/* Today marker в хедері */}
                {todayPosition > 0 && todayPosition < 100 && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-garden-green z-10"
                    style={{ left: `${todayPosition}%` }}
                  >
                    <div className="absolute -top-0 left-1/2 -translate-x-1/2 bg-garden-green text-white text-[10px] px-1.5 py-0.5 rounded-b-md font-semibold whitespace-nowrap">
                      Сьогодні
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Зони з рослинами */}
          <div className="divide-y divide-gray-100">
            {plantsByZone.map(zone => (
              <div key={zone.id}>
                {/* Заголовок зони */}
                <div className="bg-garden-cream/30 px-3 py-2 flex items-center gap-2">
                  <span className="text-sm">📍</span>
                  <span className="text-xs font-bold text-garden-green">
                    {zone.name}
                  </span>
                  <span className="text-xs text-gray-500">
                    ({zone.plants.length})
                  </span>
                </div>
                
                {/* Рослини зони */}
                {zone.plants.map(plant => (
                  <PlantTimelineRow
                    key={plant.id}
                    plant={plant}
                    seasonStart={seasonStart}
                    totalDays={totalDays}
                    todayPosition={todayPosition}
                    onHover={handlePlantHover}
                    onLeave={() => setHoveredPlant(null)}
                    onClick={() => navigate(`/plants/${plant.id}`)}
                  />
                ))}
              </div>
            ))}
            
            {/* Рослини без зони */}
            {unassignedPlants.length > 0 && (
              <div>
                <div className="bg-garden-cream/30 px-3 py-2 flex items-center gap-2">
                  <span className="text-sm">📦</span>
                  <span className="text-xs font-bold text-garden-green">
                    Без зони
                  </span>
                </div>
                {unassignedPlants.map(plant => (
                  <PlantTimelineRow
                    key={plant.id}
                    plant={plant}
                    seasonStart={seasonStart}
                    totalDays={totalDays}
                    todayPosition={todayPosition}
                    onHover={handlePlantHover}
                    onLeave={() => setHoveredPlant(null)}
                    onClick={() => navigate(`/plants/${plant.id}`)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Легенда */}
      <div className="card">
        <h4 className="text-xs font-bold text-garden-green mb-3">
          🎨 Стадії росту
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(STAGE_COLORS).slice(0, 5).map(([key, stage]) => (
            <div key={key} className="flex items-center gap-2 text-xs">
              <div
                className="w-4 h-4 rounded flex-shrink-0"
                style={{ backgroundColor: stage.bg }}
              />
              <span className="text-gray-700">
                {stage.icon} {stage.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Tooltip */}
      {hoveredPlant && (
        <PlantTooltip
          plant={hoveredPlant}
          mousePos={mousePos}
        />
      )}
    </div>
  );
}

// Компонент рядка рослини в таймлайні
function PlantTimelineRow({ plant, seasonStart, totalDays, todayPosition, onHover, onLeave, onClick }) {
  const stage = getGrowthStage(plant);
  const stageInfo = STAGE_COLORS[stage];
  const progress = getProgress(plant);
  
  // Обчислення позиції смужки
  let barStart = 0;
  let barWidth = 100;
  
  if (plant.planted_date) {
    const plantedDate = new Date(plant.planted_date);
    const daysFromSeasonStart = (plantedDate - seasonStart) / (1000 * 60 * 60 * 24);
    barStart = Math.max(0, (daysFromSeasonStart / totalDays) * 100);
    
    if (plant.plant_library?.vegetation_days) {
      const barDays = plant.plant_library.vegetation_days;
      barWidth = Math.min(100 - barStart, (barDays / totalDays) * 100);
    }
  }
  
  // Прогрес всередині смужки
  const filledWidth = (progress / 100) * barWidth;

  return (
    <div
      className="flex items-center hover:bg-garden-cream/20 transition-colors cursor-pointer group"
      onClick={onClick}
      onMouseEnter={(e) => onHover(plant, e)}
      onMouseMove={(e) => onHover(plant, e)}
      onMouseLeave={onLeave}
    >
      {/* Назва рослини */}
      <div className="w-28 flex-shrink-0 px-3 py-2.5 flex items-center gap-2 min-w-0">
        <span className="text-lg flex-shrink-0">
          {getCategoryIcon(plant.plant_library?.category)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-garden-green truncate">
            {plant.custom_name || plant.plant_library?.name_uk}
          </div>
          {plant.custom_name && (
            <div className="text-[10px] text-gray-500 truncate">
              {plant.plant_library?.name_uk}
            </div>
          )}
        </div>
      </div>
      
      {/* Смужка таймлайну */}
      <div className="flex-1 relative h-10 px-1">
        {/* Фон-сітка місяців */}
        <div className="absolute inset-0 flex">
          {[2, 3, 4, 5, 6, 7, 8, 9].map((monthIdx) => (
            <div
              key={monthIdx}
              className="flex-1 border-l border-gray-50 first:border-l-0"
            />
          ))}
        </div>
        
        {/* Смужка вегетації */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-6 rounded-md overflow-hidden shadow-sm"
          style={{
            left: `${barStart}%`,
            width: `${barWidth}%`,
            backgroundColor: stageInfo.bg + '40',
          }}
        >
          {/* Заповнена частина (прогрес) */}
          <div
            className="h-full transition-all"
            style={{
              width: `${progress}%`,
              backgroundColor: stageInfo.bg,
            }}
          />
          
          {/* Іконка стадії */}
          <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold drop-shadow">
            {progress > 15 ? stageInfo.icon : ''}
          </div>
        </div>
        
        {/* Маркер готовності до збору */}
        {progress >= 90 && plant.status === 'active' && (
          <div
            className="absolute top-1/2 -translate-y-1/2 text-lg animate-pulse"
            style={{ left: `${barStart + barWidth - 3}%` }}
          >
            🍎
          </div>
        )}
        
        {/* Today marker */}
        {todayPosition > 0 && todayPosition < 100 && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-garden-green/50 z-0"
            style={{ left: `${todayPosition}%` }}
          />
        )}
      </div>
      
      {/* Стрілка */}
      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-garden-green flex-shrink-0 mr-2 transition-colors" />
    </div>
  );
}

// Tooltip з деталями рослини
function PlantTooltip({ plant, mousePos }) {
  const stage = getGrowthStage(plant);
  const stageInfo = STAGE_COLORS[stage];
  const progress = getProgress(plant);
  
  const daysPlanted = plant.planted_date 
    ? Math.floor((new Date() - new Date(plant.planted_date)) / (1000 * 60 * 60 * 24))
    : 0;
  
  const daysToHarvest = plant.plant_library?.vegetation_days
    ? Math.max(0, plant.plant_library.vegetation_days - daysPlanted)
    : null;

  return (
    <div
      className="fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-200 p-4 max-w-xs pointer-events-none"
      style={{
        left: mousePos.x + 15,
        top: mousePos.y + 15,
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">
          {getCategoryIcon(plant.plant_library?.category)}
        </span>
        <div>
          <div className="font-bold text-garden-green">
            {plant.custom_name || plant.plant_library?.name_uk}
          </div>
          <div className="text-xs text-gray-500">
            {plant.plant_library?.name_uk}
          </div>
        </div>
      </div>
      
      <div className="space-y-1.5 text-xs">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: stageInfo.bg }}
          />
          <span className="text-gray-700">
            Стадія: <strong>{stageInfo.label}</strong> {stageInfo.icon}
          </span>
        </div>
        
        {plant.planted_date && (
          <div className="text-gray-600">
            📅 Посаджено: {new Date(plant.planted_date).toLocaleDateString('uk-UA', {
              day: 'numeric', month: 'short'
            })} ({daysPlanted} днів тому)
          </div>
        )}
        
        {daysToHarvest !== null && (
          <div className={`font-semibold ${progress >= 90 ? 'text-garden-alert' : 'text-garden-green'}`}>
            {progress >= 90
              ? '🍎 Готове до збору!'
              : `🎯 До збору: ~${daysToHarvest} днів`
            }
          </div>
        )}
        
        {plant.my_zones && (
          <div className="text-gray-500">
            📍 {plant.my_zones.name}
          </div>
        )}
      </div>
      
      <div className="mt-3 pt-2 border-t border-gray-100 text-xs text-gray-500">
        Клікни для деталей →
      </div>
    </div>
  );
}

// Порожній стан
function EmptyState({ onAdd }) {
  const month = new Date().getMonth();
  
  // Сезонні рекомендації
  const recommendations = {
    2: ['🌱 Розсада томатів', '🥬 Рання капуста', '🌿 Базилік на підвіконні'],
    3: ['🥕 Морква', '🧅 Цибуля', '🌿 Кріп, петрушка'],
    4: ['🍅 Томати', '🫑 Перець', '🥒 Огірки'],
    5: ['🥒 Огірки', '🫘 Квасоля', '🌽 Кукурудза'],
    6: ['🥬 Салат (повторна)', '🌿 Базилік', '🥕 Редис'],
    7: ['🥬 Салат осінній', '🌿 Кріп', '🥕 Редис'],
    8: ['🧅 Озима цибуля', '🧄 Озимий часник', '🌿 Петрушка'],
    9: ['🧄 Часник', '🌱 Сидерати (гірчиця)'],
  };
  
  const tips = recommendations[month] || recommendations[4];

  return (
    <div className="card text-center py-12">
      <div className="text-6xl mb-4">🌱</div>
      <h3 className="text-xl font-bold text-garden-green mb-2">
        Сезон тільки починається
      </h3>
      <p className="text-gray-600 mb-6 max-w-sm mx-auto">
        Додай першу рослину щоб побачити таймлайн всього сезону
      </p>
      
      <div className="bg-garden-cream rounded-xl p-4 mb-6 text-left max-w-sm mx-auto">
        <p className="text-xs font-bold text-garden-green mb-2">
          💡 Що можна посадити в {MONTHS_FULL_UK[month]}:
        </p>
        <ul className="space-y-1">
          {tips.map((tip, i) => (
            <li key={i} className="text-sm text-gray-700">{tip}</li>
          ))}
        </ul>
      </div>
      
      <button
        onClick={onAdd}
        className="btn-primary inline-flex items-center gap-2"
      >
        <Sprout className="w-5 h-5" />
        Додати першу рослину
      </button>
    </div>
  );
}