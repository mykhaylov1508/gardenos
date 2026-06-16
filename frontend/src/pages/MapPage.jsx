// src/pages/MapPage.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stage, Layer, Image as KonvaImage, Circle, Text, Group, Rect } from 'react-konva';
import { useImage } from 'react-konva-utils';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, ZoomIn, ZoomOut, Maximize2, Loader2, X, Image as ImageIcon, Upload } from 'lucide-react';

// Розміри canvas
const STAGE_WIDTH = 1200;
const STAGE_HEIGHT = 800;

// Іконки категорій
function getCategoryEmoji(category) {
  switch (category) {
    case 'vegetable': return '🥬';
    case 'fruit': return '🍓';
    case 'herb': return '🌿';
    case 'tree': return '🌳';
    case 'bush': return '🌲';
    case 'flower': return '🌸';
    default: return '🌱';
  }
}

// Визначення кольору стану рослини
function getHealthColor(plant) {
  if (!plant.planted_date || !plant.plant_library?.vegetation_days) return '#7ba05b';
  
  const daysPlanted = Math.floor(
    (new Date() - new Date(plant.planted_date)) / (1000 * 60 * 60 * 24)
  );
  const progress = (daysPlanted / plant.plant_library.vegetation_days) * 100;
  
  if (progress >= 90) return '#e8533a'; // 🔴 Готове до збору
  if (progress >= 60) return '#c4603a'; // 🟠 Формує плоди
  if (progress >= 30) return '#d4a839'; // 🟡 Цвіте
  return '#7ba05b'; // 🟢 Росте
}

// Перевірка чи потрібен полив (спрощено)
function needsWatering(plant, events) {
  if (!plant.plant_library?.watering_interval_days) return false;
  const lastWatering = events.find(
    e => e.plant_id === plant.id && e.event_type === 'water'
  );
  const refDate = lastWatering?.event_date || plant.planted_date;
  if (!refDate) return false;
  const daysSince = Math.floor((new Date() - new Date(refDate)) / (1000 * 60 * 60 * 24));
  return daysSince >= plant.plant_library.watering_interval_days;
}

export default function MapPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const stageRef = useRef(null);
  
  const [plants, setPlants] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlant, setSelectedPlant] = useState(null);
  const [stageScale, setStageScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  async function fetchData() {
    try {
      setLoading(true);
      
      const { data: plantsData } = await supabase
        .from('my_plants')
        .select(`
          *,
          plant_library (
            name_uk, category, vegetation_days,
            watering_interval_days, feeding_interval_days
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active');
      
      // Події для визначення потреб
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      
      const { data: eventsData } = await supabase
        .from('events_log')
        .select('*')
        .eq('user_id', user.id)
        .gte('event_date', sixtyDaysAgo.toISOString().split('T')[0]);
      
      setPlants(plantsData || []);
      setEvents(eventsData || []);
      // Завантажуємо фон карти

      await fetchBackground();
    } catch (err) {
      console.error('Помилка:', err);
    } finally {
      setLoading(false);
    }
  }
// Завантаження фону карти
async function uploadBackground(file) {
  if (!file) return;
  
  if (file.size > 10 * 1024 * 1024) {
    alert('Файл занадто великий. Максимум 10 МБ.');
    return;
  }
  
  setUploading(true);
  
  try {
    // Видаляємо старий фон якщо є
    if (backgroundImage) {
      const oldPath = backgroundImage.image_url.split('/').slice(-2).join('/');
      await supabase.storage
        .from('map-backgrounds')
        .remove([oldPath]);
      
      await supabase
        .from('map_backgrounds')
        .delete()
        .eq('user_id', user.id);
    }
    
    // Завантажуємо новий
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/background-${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('map-backgrounds')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (uploadError) throw uploadError;
    
    const { data } = supabase.storage
      .from('map-backgrounds')
      .getPublicUrl(fileName);
    
    const { data: bgData, error: dbError } = await supabase
      .from('map_backgrounds')
      .insert({
        user_id: user.id,
        image_url: data.publicUrl
      })
      .select()
      .single();
    
    if (dbError) throw dbError;
    
    setBackgroundImage(bgData);
    
  } catch (err) {
    console.error('Помилка завантаження:', err);
    alert('Не вдалось завантажити фон: ' + (err.message || 'невідома помилка'));
  } finally {
    setUploading(false);
  }
}

// Завантаження існуючого фону
async function fetchBackground() {
  const { data } = await supabase
    .from('map_backgrounds')
    .select('*')
    .eq('user_id', user.id)
    .order('uploaded_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  
  if (data) {
    setBackgroundImage(data);
  }
}


  // Drag & Drop — оновлення позиції при перетягуванні
  async function handleDragEnd(plant, e) {
    const newX = e.target.x() / STAGE_WIDTH;
    const newY = e.target.y() / STAGE_HEIGHT;
    
    // Оновлюємо локально
    setPlants(plants.map(p => 
      p.id === plant.id 
        ? { ...p, map_x: newX, map_y: newY }
        : p
    ));
    
    // Зберігаємо в БД
    await supabase
      .from('my_plants')
      .update({ map_x: newX, map_y: newY })
      .eq('id', plant.id);
  }

  // Зум колесом миші
  function handleWheel(e) {
    e.evt.preventDefault();
    
    const stage = stageRef.current;
    const oldScale = stageScale;
    const pointer = stage.getPointerPosition();
    
    const mousePointTo = {
      x: (pointer.x - stagePos.x) / oldScale,
      y: (pointer.y - stagePos.y) / oldScale,
    };
    
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const newScale = direction > 0 ? oldScale * 1.1 : oldScale / 1.1;
    const clampedScale = Math.max(0.5, Math.min(3, newScale));
    
    setStageScale(clampedScale);
    setStagePos({
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    });
  }

  // Кнопки зуму
  function zoomIn() {
    setStageScale(Math.min(3, stageScale * 1.2));
  }
  
  function zoomOut() {
    setStageScale(Math.max(0.5, stageScale / 1.2));
  }
  
  function resetZoom() {
    setStageScale(1);
    setStagePos({ x: 0, y: 0 });
  }

  if (loading) {
    return (
      <div className="card text-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-garden-green mx-auto mb-4" />
        <p className="text-gray-600">Завантажую карту...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
        <div className="flex items-center justify-between mb-4">
        <div>
            <h2 className="text-2xl font-bold text-garden-green">
            🗺 Карта городу
            </h2>
            <p className="text-sm text-gray-600">
            {plants.length} {plants.length === 1 ? 'рослина' : 'рослин'} · 
            Перетягуй іконки щоб змінити розташування
            </p>
        </div>
        <div className="flex gap-2">
            {/* Кнопка завантаження фону */}
            <div className="relative">
            <input
                type="file"
                accept="image/*"
                onChange={(e) => uploadBackground(e.target.files[0])}
                className="hidden"
                id="bg-upload"
                disabled={uploading}
            />
            <label
                htmlFor="bg-upload"
                className="btn-primary flex items-center gap-2 cursor-pointer"
            >
                {uploading ? (
                <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Завантажую...
                </>
                ) : (
                <>
                    <ImageIcon className="w-5 h-5" />
                    {backgroundImage ? 'Змінити фон' : 'Додати фон'}
                </>
                )}
            </label>
            </div>
            
            <button
            onClick={() => navigate('/plants/new')}
            className="btn-primary flex items-center gap-2"
            >
            <Plus className="w-5 h-5" />
            Додати
            </button>
        </div>
        </div>

      {/* Карта */}
      <div className="relative bg-white rounded-2xl shadow-md overflow-hidden border border-gray-100">
        <Stage
          ref={stageRef}
          width={STAGE_WIDTH}
          height={STAGE_HEIGHT}
          scaleX={stageScale}
          scaleY={stageScale}
          x={stagePos.x}
          y={stagePos.y}
          onWheel={handleWheel}
          draggable
          onDragEnd={(e) => {
            if (e.target === stageRef.current) {
              setStagePos({ x: e.target.x(), y: e.target.y() });
            }
          }}
          className="w-full cursor-grab active:cursor-grabbing"
          style={{ maxWidth: '100%', height: 'auto', aspectRatio: `${STAGE_WIDTH}/${STAGE_HEIGHT}` }}
        >
          <Layer>
            {/* Фонове зображення ділянки */}
            {backgroundImage && (
                <BackgroundImage
                imageUrl={backgroundImage.image_url}
                width={STAGE_WIDTH}
                height={STAGE_HEIGHT}
                />
            )}
            
            {/* Якщо немає фону — показуємо сітку */}
            {!backgroundImage && (
                <>
                <Rect
                    x={0}
                    y={0}
                    width={STAGE_WIDTH}
                    height={STAGE_HEIGHT}
                    fill="#f5f0e8"
                />
                
                {/* Сітка для орієнтації */}
                {Array.from({ length: 12 }).map((_, i) => (
                    <Rect
                    key={`v-${i}`}
                    x={i * 100}
                    y={0}
                    width={1}
                    height={STAGE_HEIGHT}
                    fill="#e5e0d8"
                    />
                ))}
                {Array.from({ length: 8 }).map((_, i) => (
                    <Rect
                    key={`h-${i}`}
                    x={0}
                    y={i * 100}
                    width={STAGE_WIDTH}
                    height={1}
                    fill="#e5e0d8"
                    />
                ))}
                </>
            )}
            
            {/* Рослини */}
            {plants.map(plant => {
                const x = (plant.map_x || 0.5) * STAGE_WIDTH;
                const y = (plant.map_y || 0.5) * STAGE_HEIGHT;
                const healthColor = getHealthColor(plant);
                const showWater = needsWatering(plant, events);
                
                return (
                <Group
                    key={plant.id}
                    x={x}
                    y={y}
                    draggable
                    onDragEnd={(e) => handleDragEnd(plant, e)}
                    onClick={() => setSelectedPlant(plant)}
                    onTap={() => setSelectedPlant(plant)}
                >
                    {/* Кільце стану (зовнішнє) */}
                    <Circle
                    x={0}
                    y={0}
                    radius={32}
                    stroke={healthColor}
                    strokeWidth={4}
                    fill={`${healthColor}20`}
                    />
                    
                    {/* Внутрішнє коло (фон для emoji) */}
                    <Circle
                    x={0}
                    y={0}
                    radius={26}
                    fill="white"
                    shadowColor="black"
                    shadowBlur={5}
                    shadowOpacity={0.1}
                    />
                    
                    {/* Іконка рослини (emoji як текст) */}
                    <Text
                    x={-15}
                    y={-15}
                    text={getCategoryEmoji(plant.plant_library?.category)}
                    fontSize={30}
                    width={30}
                    align="center"
                    />
                    
                    {/* Індикатор поливу (маленька крапля) */}
                    {showWater && (
                    <Group x={20} y={-20}>
                        <Circle
                        x={0}
                        y={0}
                        radius={10}
                        fill="#4a7fa5"
                        stroke="white"
                        strokeWidth={2}
                        />
                        <Text
                        x={-6}
                        y={-8}
                        text="💧"
                        fontSize={14}
                        />
                    </Group>
                    )}
                    
                    {/* Назва під іконкою */}
                    <Text
                    x={-50}
                    y={38}
                    text={plant.custom_name || plant.plant_library?.name_uk || ''}
                    fontSize={12}
                    fontStyle="bold"
                    fill="#2d4a27"
                    width={100}
                    align="center"
                    />
                </Group>
                );
            })}
            </Layer>
        </Stage>

        {/* Кнопки зуму */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-2">
          <button
            onClick={zoomIn}
            className="bg-white p-2 rounded-full shadow-md hover:shadow-lg transition-all"
            title="Збільшити"
          >
            <ZoomIn className="w-5 h-5 text-garden-green" />
          </button>
          <button
            onClick={zoomOut}
            className="bg-white p-2 rounded-full shadow-md hover:shadow-lg transition-all"
            title="Зменшити"
          >
            <ZoomOut className="w-5 h-5 text-garden-green" />
          </button>
          <button
            onClick={resetZoom}
            className="bg-white p-2 rounded-full shadow-md hover:shadow-lg transition-all"
            title="Скинути"
          >
            <Maximize2 className="w-5 h-5 text-garden-green" />
          </button>
        </div>

        {/* Мінімапа */}
        <div className="absolute top-4 left-4 w-32 h-24 bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
          <div className="w-full h-full bg-garden-cream relative">
            {plants.map(plant => (
              <div
                key={plant.id}
                className="absolute w-1.5 h-1.5 rounded-full"
                style={{
                  left: `${(plant.map_x || 0.5) * 100}%`,
                  top: `${(plant.map_y || 0.5) * 100}%`,
                  backgroundColor: getHealthColor(plant),
                  transform: 'translate(-50%, -50%)'
                }}
              />
            ))}
          </div>
        </div>

        {/* Порожній стан */}
        {plants.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center bg-white/90 backdrop-blur-sm rounded-2xl p-8 max-w-sm">
              <div className="text-6xl mb-3">🗺</div>
              <h3 className="text-lg font-bold text-garden-green mb-2">
                Карта порожня
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Додай першу рослину щоб розмістити її на карті
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Легенда */}
      <div className="card">
        <h4 className="text-xs font-bold text-garden-green mb-3">
          🎨 Стан рослин
        </h4>
        <div className="flex flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-[#7ba05b]" />
            <span className="text-gray-700">🌿 Росте</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-[#d4a839]" />
            <span className="text-gray-700">🌸 Цвіте</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-[#c4603a]" />
            <span className="text-gray-700">🥒 Формує плоди</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-[#e8533a]" />
            <span className="text-gray-700">🍎 Готове до збору</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm">💧</span>
            <span className="text-gray-700">Потребує поливу</span>
          </div>
        </div>
      </div>

      {/* Бічна панель з деталями рослини */}
      {selectedPlant && (
        <PlantSidePanel
          plant={selectedPlant}
          events={events}
          onClose={() => setSelectedPlant(null)}
          onViewDetails={() => {
            navigate(`/plants/${selectedPlant.id}`);
            setSelectedPlant(null);
          }}
        />
      )}
    </div>
  );
}

// Бічна панель з деталями вибраної рослини
function PlantSidePanel({ plant, events, onClose, onViewDetails }) {
  const lib = plant.plant_library;
  const healthColor = getHealthColor(plant);
  
  const daysPlanted = plant.planted_date
    ? Math.floor((new Date() - new Date(plant.planted_date)) / (1000 * 60 * 60 * 24))
    : 0;
  
  const progress = lib?.vegetation_days
    ? Math.min(100, (daysPlanted / lib.vegetation_days) * 100)
    : 0;
  
  const daysToHarvest = lib?.vegetation_days
    ? Math.max(0, lib.vegetation_days - daysPlanted)
    : null;
  
  // Останні події
  const recentEvents = events
    .filter(e => e.plant_id === plant.id)
    .sort((a, b) => new Date(b.event_date) - new Date(a.event_date))
    .slice(0, 3);

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-white shadow-2xl z-50 overflow-y-auto animate-slide-in">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-4xl">
            {getCategoryEmoji(lib?.category)}
          </span>
          <div>
            <h3 className="font-bold text-garden-green">
              {plant.custom_name || lib?.name_uk}
            </h3>
            <p className="text-xs text-gray-500">
              {lib?.name_uk}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-full"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Контент */}
      <div className="p-6 space-y-5">
        
        {/* Статус */}
        <div
          className="rounded-xl p-4 border-2"
          style={{ 
            borderColor: healthColor, 
            backgroundColor: `${healthColor}10` 
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700">
              Прогрес до збору
            </span>
            <span className="text-lg font-bold" style={{ color: healthColor }}>
              {Math.round(progress)}%
            </span>
          </div>
          <div className="w-full bg-white rounded-full h-2.5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ 
                width: `${progress}%`,
                backgroundColor: healthColor 
              }}
            />
          </div>
          {daysToHarvest !== null && (
            <p className="text-xs text-gray-600 mt-2">
              {progress >= 90 
                ? '🍎 Готове до збору!' 
                : `🎯 До збору: ~${daysToHarvest} днів`}
            </p>
          )}
        </div>

        {/* Інфо */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-600">📅 Посаджено</span>
            <span className="font-semibold text-garden-green">
              {plant.planted_date 
                ? new Date(plant.planted_date).toLocaleDateString('uk-UA', {
                    day: 'numeric', month: 'short'
                  })
                : '—'}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-600">⏱ Днів росту</span>
            <span className="font-semibold text-garden-green">
              {daysPlanted}
            </span>
          </div>
          {lib?.watering_interval_days && (
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">💧 Полив кожні</span>
              <span className="font-semibold text-garden-green">
                {lib.watering_interval_days} днів
              </span>
            </div>
          )}
        </div>

        {/* Останні події */}
        <div>
          <h4 className="font-bold text-garden-green text-sm mb-3">
            📋 Останній догляд
          </h4>
          {recentEvents.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-4">
              Поки що немає записів
            </p>
          ) : (
            <div className="space-y-2">
              {recentEvents.map(event => (
                <div 
                  key={event.id}
                  className="bg-garden-cream/50 rounded-lg p-3 text-xs"
                >
                  <div className="flex justify-between mb-1">
                    <span className="font-semibold text-garden-green capitalize">
                      {event.event_type === 'water' && '💧 Полив'}
                      {event.event_type === 'feed' && '🌿 Підживлення'}
                      {event.event_type === 'harvest' && '🍎 Збір'}
                      {event.event_type === 'observe' && '👁 Спостереження'}
                      {event.event_type === 'plant' && '🌱 Посадка'}
                    </span>
                    <span className="text-gray-500">
                      {new Date(event.event_date).toLocaleDateString('uk-UA', {
                        day: 'numeric', month: 'short'
                      })}
                    </span>
                  </div>
                  {event.notes && (
                    <p className="text-gray-600 mt-1">{event.notes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Кнопка детальніше */}
        <button
          onClick={onViewDetails}
          className="btn-primary w-full"
        >
          Детальніше про рослину →
        </button>
      </div>
    </div>
  );
}  // Компонент фонового зображення
function BackgroundImage({ imageUrl, width, height }) {
  const [image] = useImage(imageUrl, 'anonymous');
  
  if (!image) return null;
  
  return (
    <KonvaImage
      image={image}
      width={width}
      height={height}
      listening={false}
    />
  );
}
