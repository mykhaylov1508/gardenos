// src/pages/PlantDetailPage.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
  ArrowLeft, Calendar, Droplet, Leaf, Apple, Camera, Plus, 
  Loader2, AlertCircle, Image as ImageIcon, Sprout, BookOpen, MapPin
} from 'lucide-react';
import AddEventModal from '../components/AddEventModal';

export default function PlantDetailPage() {
  const { id: plantId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [plant, setPlant] = useState(null);
  const [events, setEvents] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddEvent, setShowAddEvent] = useState(false);

  useEffect(() => {
    if (user && plantId) fetchData();
  }, [user, plantId]);

  async function fetchData() {
    try {
      setLoading(true);
      
      // Дані рослини + бібліотека + зона
      const { data: plantData, error: plantError } = await supabase
        .from('my_plants')
        .select(`
          *,
          plant_library (
            name_uk, name_latin, category, vegetation_days, 
            watering_interval_days, feeding_interval_days,
            care_tips, harvest_signs, common_diseases, 
            beginner_tips, regional_ukraine
          ),
          my_zones (name)
        `)
        .eq('id', plantId)
        .eq('user_id', user.id)
        .single();
      
      if (plantError) throw plantError;
      setPlant(plantData);
      
      // Події догляду
      const { data: eventsData } = await supabase
        .from('events_log')
        .select('*')
        .eq('plant_id', plantId)
        .order('event_date', { ascending: false });
      setEvents(eventsData || []);
      
      // Фото (якщо є в подіях)
      const photosList = (eventsData || [])
        .filter(e => e.photo_url)
        .map(e => ({ url: e.photo_url, date: e.event_date, note: e.notes }));
      setPhotos(photosList);
      
    } catch (err) {
      console.error('Помилка:', err);
    } finally {
      setLoading(false);
    }
  }

  // Прогрес дозрівання
  function getProgress() {
    if (!plant?.planted_date || !plant.plant_library?.vegetation_days) return null;
    const daysPlanted = Math.floor(
      (new Date() - new Date(plant.planted_date)) / (1000 * 60 * 60 * 24)
    );
    const progress = (daysPlanted / plant.plant_library.vegetation_days) * 100;
    return Math.min(100, Math.max(0, progress));
  }

  // Іконка типу події
  function getEventIcon(type) {
    switch (type) {
      case 'water': return <Droplet className="w-5 h-5 text-garden-water" />;
      case 'feed': return <Leaf className="w-5 h-5 text-garden-leaf" />;
      case 'harvest': return <Apple className="w-5 h-5 text-garden-harvest" />;
      case 'plant': return <Calendar className="w-5 h-5 text-garden-green" />;
      case 'observe': return <AlertCircle className="w-5 h-5 text-garden-alert" />;
      default: return <Plus className="w-5 h-5" />;
    }
  }

  // Колір бейджа події
  function getEventBadgeColor(type) {
    switch (type) {
      case 'water': return 'bg-garden-water';
      case 'feed': return 'bg-garden-leaf';
      case 'harvest': return 'bg-garden-harvest';
      case 'plant': return 'bg-garden-green';
      case 'observe': return 'bg-garden-alert';
      default: return 'bg-gray-400';
    }
  }

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('uk-UA', {
      day: 'numeric', month: 'short'
    });
  }

  function getCategoryEmoji(category) {
    switch (category) {
      case 'vegetable': return '🥬';
      case 'fruit': return '🍓';
      case 'herb': return '🌿';
      case 'tree': return '🌳';
      case 'berry': return '🍇';
      default: return '🌱';
    }
  }

  if (loading) {
    return (
      <div className="card text-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-garden-green mx-auto mb-4" />
        <p className="text-gray-600">Завантажую...</p>
      </div>
    );
  }

  if (!plant) {
    return (
      <div className="card text-center py-12">
        <AlertCircle className="w-12 h-12 text-garden-alert mx-auto mb-4" />
        <p className="text-gray-600">Рослину не знайдено</p>
        <button onClick={() => navigate('/garden')} className="btn-primary mt-4">
          Назад до городу
        </button>
      </div>
    );
  }

  const progress = getProgress();
  const library = plant.plant_library;
  const beginnerTips = library?.beginner_tips || [];
  const diseases = library?.common_diseases || [];
  const regional = library?.regional_ukraine || {};

  return (
    <div className="pb-24">
      {/* Header з навігацією */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-garden-green hover:underline"
        >
          <ArrowLeft className="w-5 h-5" />
          Назад
        </button>
        <button
          onClick={() => setShowAddEvent(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Додати подію
        </button>
      </div>

      {/* Картка рослини */}
      <div className="card mb-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-16 h-16 bg-garden-cream rounded-2xl flex items-center justify-center text-4xl">
            {getCategoryEmoji(library?.category)}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-garden-green mb-1">
              {plant.custom_name || library?.name_uk}
            </h2>
            <p className="text-gray-600 mb-2 italic">
              {library?.name_latin}
            </p>
            <p className="text-sm text-gray-500">
              📍 {plant.my_zones?.name || 'Без зони'} · 
              📅 Посаджено {formatDate(plant.planted_date)}
            </p>
          </div>
        </div>

        {/* Шкала дозрівання */}
        {progress !== null && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-600">Прогрес до збору</span>
              <span className="font-bold text-garden-green">{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  progress >= 90 ? 'bg-garden-harvest' :
                  progress >= 60 ? 'bg-garden-leaf' : 'bg-garden-water'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
            {progress >= 90 && (
              <p className="text-sm text-garden-harvest font-semibold mt-2">
                🍎 Готове до збору!
              </p>
            )}
          </div>
        )}
      </div>

      {/* 🆕 НОВЕ: Регіональні особливості */}
      {(regional.planting_date || regional.notes) && (
        <div className="card mb-6 bg-garden-cream/50 border-garden-leaf/30">
          <h3 className="font-bold text-garden-green mb-3 flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            🇺🇦 Особливості для України
          </h3>
          {regional.planting_date && (
            <p className="text-sm text-gray-700 mb-2">
              <span className="font-semibold">📅 Оптимальна посадка:</span> {regional.planting_date}
            </p>
          )}
          {regional.notes && (
            <p className="text-sm text-gray-700">
              <span className="font-semibold">💡 Порада:</span> {regional.notes}
            </p>
          )}
        </div>
      )}

      {/* 🆕 НОВЕ: Поради для початківців */}
      {beginnerTips.length > 0 && (
        <div className="card mb-6">
          <h3 className="font-bold text-garden-green mb-3 flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            💡 Поради для початківця
          </h3>
          <ul className="space-y-2">
            {beginnerTips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-garden-leaf mt-0.5">✓</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 🆕 НОВЕ: Типові хвороби та шкідники */}
      {diseases.length > 0 && (
        <div className="card mb-6">
          <h3 className="font-bold text-garden-green mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-garden-alert" />
            🍄 Можливі проблеми та лікування
          </h3>
          <div className="space-y-4">
            {diseases.slice(0, 3).map((disease, i) => (
              <div key={i} className="border-l-4 border-garden-alert/30 pl-3 py-1">
                <p className="font-semibold text-garden-green text-sm">{disease.name}</p>
                <p className="text-xs text-gray-600 mt-1"><span className="font-medium">Симптоми:</span> {disease.symptoms}</p>
                <p className="text-xs text-gray-600"><span className="font-medium">Причина:</span> {disease.triggers}</p>
                <p className="text-xs text-garden-leaf mt-1"><span className="font-medium">Лікування:</span> {disease.treatment}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Фотогалерея */}
      {photos.length > 0 && (
        <div className="card mb-6">
          <h3 className="font-bold text-garden-green mb-3 flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Фотохроніка ({photos.length})
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo, i) => (
              <img
                key={i}
                src={photo.url}
                alt={photo.note || 'Фото рослини'}
                className="w-full aspect-square object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => window.open(photo.url, '_blank')}
              />
            ))}
          </div>
        </div>
      )}

      {/* Історія подій */}
      <div className="card">
        <h3 className="font-bold text-garden-green mb-4">📋 Історія догляду</h3>
        
        {events.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            Поки що немає записів. Додай першу подію!
          </p>
        ) : (
          <div className="space-y-4">
            {events.map(event => (
              <div key={event.id} className="flex items-start gap-3 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white ${getEventBadgeColor(event.event_type)}`}>
                  {getEventIcon(event.event_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-garden-green capitalize">
                      {event.event_type === 'water' && 'Полив'}
                      {event.event_type === 'feed' && 'Підживлення'}
                      {event.event_type === 'harvest' && 'Збір урожаю'}
                      {event.event_type === 'plant' && 'Посадка'}
                      {event.event_type === 'observe' && 'Спостереження'}
                      {event.event_type === 'prune' && 'Обрізка'}
                    </span>
                    <span className="text-xs text-gray-500">{formatDate(event.event_date)}</span>
                  </div>
                  {event.notes && (
                    <p className="text-sm text-gray-600">{event.notes}</p>
                  )}
                  {event.quantity && event.unit && (
                    <p className="text-xs text-gray-500 mt-1">
                      Кількість: {event.quantity} {event.unit}
                    </p>
                  )}
                  {event.photo_url && (
                    <button
                      onClick={() => window.open(event.photo_url, '_blank')}
                      className="inline-flex items-center gap-1 text-xs text-garden-water hover:underline mt-1"
                    >
                      <ImageIcon className="w-3 h-3" />
                      Переглянути фото
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Модальне вікно додавання події */}
      {showAddEvent && (
        <AddEventModal
          plantId={plantId}
          plantName={plant.custom_name || library?.name_uk}
          onClose={() => setShowAddEvent(false)}
          onEventAdded={() => {
            setShowAddEvent(false);
            fetchData(); // Оновлюємо дані після додавання
          }}
        />
      )}
    </div>
  );
}