// src/pages/ProfilePage.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
  User, MapPin, Home, Users, Save, Loader2, 
  CheckCircle, AlertCircle, Droplet, Sun, 
  Zap, TreePine, LogOut 
} from 'lucide-react';

// Варіанти для select-полів
const REGIONS = [
  'Вінницька', 'Волинська', 'Дніпропетровська', 'Донецька',
  'Житомирська', 'Закарпатська', 'Запорізька', 'Івано-Франківська',
  'Київська', 'Кіровоградська', 'Луганська', 'Львівська',
  'Миколаївська', 'Одеська', 'Полтавська', 'Рівненська',
  'Сумська', 'Тернопільська', 'Харківська', 'Херсонська',
  'Хмельницька', 'Черкаська', 'Чернівецька', 'Чернігівська'
];

const SOIL_TYPES = [
  { id: 'sand', label: 'Піщаний', emoji: '🏖', description: 'Швидко сохне, частий полив' },
  { id: 'loam', label: 'Суглинок', emoji: '🌾', description: 'Оптимальний, помірна волога' },
  { id: 'clay', label: 'Глинистий', emoji: '🧱', description: 'Довго тримає вологу' },
  { id: 'chernozem', label: 'Чорнозем', emoji: '🌱', description: 'Найродючіший' },
];

const ORIENTATIONS = [
  { id: 'south', label: 'Південна', emoji: '☀️', description: 'Максимум сонця' },
  { id: 'east', label: 'Східна', emoji: '🌅', description: 'Ранкове сонце' },
  { id: 'west', label: 'Західна', emoji: '🌇', description: 'Вечірнє сонце' },
  { id: 'north', label: 'Північна', emoji: '🌥', description: 'Мало сонця' },
  { id: 'mixed', label: 'Змішана', emoji: '🔄', description: 'Різні зони' },
];

const WATER_SOURCES = [
  { id: 'well', label: 'Криниця', emoji: '🪣' },
  { id: 'central', label: 'Централізоване', emoji: '🚰' },
  { id: 'tank', label: 'Бак/цистерна', emoji: '🛢' },
  { id: 'rain', label: 'Дощова вода', emoji: '🌧' },
  { id: 'river', label: 'Річка/ставка', emoji: '🏞' },
];

export default function ProfilePage() {
  const { user, profile, signOut } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');
  
  // Форма
  const [formData, setFormData] = useState({
    full_name: '',
    region: '',
    latitude: '',
    longitude: '',
    location_name: '',
    microclimate: '',
    plot_size_m2: '',
    soil_type: '',
    orientation: '',
    water_source: '',
    has_electricity: false,
    family_size: 1,
  });

  const [locationSearch, setLocationSearch] = useState('');
  const [locationResults, setLocationResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        region: profile.region || '',
        latitude: profile.latitude || '',
        longitude: profile.longitude || '',
        location_name: profile.location_name || '',
        microclimate: profile.microclimate || '',
        plot_size_m2: profile.plot_size_m2 || '',
        soil_type: profile.soil_type || '',
        orientation: profile.orientation || '',
        water_source: profile.water_source || '',
        has_electricity: profile.has_electricity || false,
        family_size: profile.family_size || 1,
      });
      setLoading(false);
    }
  }, [profile]);

  // Збереження змін
  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccessMessage('');
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name.trim() || null,
          region: formData.region || null,
          latitude: formData.latitude ? parseFloat(formData.latitude) : null,
          longitude: formData.longitude ? parseFloat(formData.longitude) : null,
          location_name: formData.location_name || null,
          microclimate: formData.microclimate || null,
          plot_size_m2: formData.plot_size_m2 ? parseFloat(formData.plot_size_m2) : null,
          soil_type: formData.soil_type || null,
          orientation: formData.orientation || null,
          water_source: formData.water_source || null,
          has_electricity: formData.has_electricity,
          family_size: parseInt(formData.family_size) || 1,
        })
        .eq('id', user.id);
      
      if (error) throw error;
      
      setSuccessMessage('✅ Зміни збережено!');
      setTimeout(() => setSuccessMessage(''), 3000);
      
    } catch (err) {
      setError('Помилка збереження: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  // 🔍 Пошук локації через Nominatim API (OpenStreetMap)
  async function searchLocation(query) {
    if (query.length < 3) {
      setLocationResults([]);
      return;
    }
    
    setSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ', Ukraine')}&limit=5&countrycodes=ua`
      );
      const data = await response.json();
      setLocationResults(data.map(item => ({
        display_name: item.display_name,
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
        name: item.display_name.split(',')[0], // Коротка назва
      })));
    } catch (err) {
      console.error('Помилка пошуку:', err);
    } finally {
      setSearching(false);
    }
  }

  function selectLocation(loc) {
    setFormData({
      ...formData,
      latitude: loc.lat,
      longitude: loc.lon,
      location_name: loc.name,
    });
    setLocationSearch('');
    setLocationResults([]);
  }

  if (loading) {
    return (
      <div className="card text-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-garden-green mx-auto mb-4" />
        <p className="text-gray-600">Завантажую профіль...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-garden-green">
          ⚙️ Налаштування
        </h2>
        <button
          onClick={signOut}
          className="px-4 py-2 text-garden-alert hover:bg-red-50 rounded-xl transition-all flex items-center gap-2 text-sm font-semibold"
        >
          <LogOut className="w-4 h-4" />
          Вийти
        </button>
      </div>

      {/* Email (тільки для перегляду) */}
      <div className="card bg-garden-cream/50">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-garden-green rounded-full flex items-center justify-center">
            <User className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Email</p>
            <p className="font-semibold text-garden-green">{user?.email}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        
        {/* Секція 1: Особиста інформація */}
        <div className="card">
          <h3 className="font-bold text-garden-green mb-4 flex items-center gap-2">
            <User className="w-5 h-5" />
            Особиста інформація
          </h3>
          
          <div>
            <label className="block text-sm font-semibold text-garden-green mb-2">
              👤 Ім'я
            </label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="Як до тебе звертатись?"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-garden-green"
            />
          </div>
        </div>

        {/* Секція 2: Регіон */}
        <div className="card">
          <h3 className="font-bold text-garden-green mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Регіон (для погоди)
          </h3>
          
          <div>
            <label className="block text-sm font-semibold text-garden-green mb-2">
              📍 Область
            </label>
            <select
              value={formData.region}
              onChange={(e) => setFormData({ ...formData, region: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-garden-green bg-white"
            >
              <option value="">Обери область...</option>
              {REGIONS.map(region => (
                <option key={region} value={region}>
                  {region} область
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-2">
              💡 Використовується для точного прогнозу погоди
            </p>
          </div>
        </div>

        {/* Секція: Точне місцезнаходження */}
        <div className="card">
          <h3 className="font-bold text-garden-green mb-4 flex items-center gap-2">
            📍 Моє точне місцезнаходження
          </h3>
          
          <div className="space-y-3">
            {/* Поточна локація */}
            {formData.location_name && (
              <div className="bg-garden-leaf/10 border border-garden-leaf/30 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-garden-green text-sm">
                    📍 {formData.location_name}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {Number(formData.latitude).toFixed(4)}°, {Number(formData.longitude).toFixed(4)}°
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, latitude: '', longitude: '', location_name: '' })}
                  className="text-garden-alert text-xs hover:underline"
                >
                  Видалити
                </button>
              </div>
            )}
            
            {/* Пошук */}
            <div>
              <label className="block text-sm font-semibold text-garden-green mb-2">
                🔍 Знайти моє село/місто
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={locationSearch}
                  onChange={(e) => {
                    setLocationSearch(e.target.value);
                    searchLocation(e.target.value);
                  }}
                  placeholder="Наприклад: Стара Ушиця"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-garden-green"
                />
                {searching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-5 h-5 animate-spin text-garden-green" />
                  </div>
                )}
              </div>
              
              {/* Результати пошуку */}
              {locationResults.length > 0 && (
                <div className="mt-2 border border-gray-200 rounded-xl overflow-hidden">
                  {locationResults.map((loc, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => selectLocation(loc)}
                      className="w-full text-left px-4 py-3 hover:bg-garden-cream transition border-b border-gray-100 last:border-0"
                    >
                      <div className="font-semibold text-sm text-garden-green">
                        {loc.name}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {loc.display_name}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              
              <p className="text-xs text-gray-500 mt-2">
                💡 Точні координати дають найточніший прогноз погоди саме для твоєї ділянки
              </p>
            </div>
            
            {/* Мікроклімат */}
            <div>
              <label className="block text-sm font-semibold text-garden-green mb-2">
                🌊 Особливості мікроклімату
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'river', label: 'Біля річки', emoji: '🌊', desc: 'Вища вологість, тумани' },
                  { id: 'hill', label: 'На пагорбі', emoji: '⛰', desc: 'Вітряно, менше заморозків' },
                  { id: 'valley', label: 'В низині', emoji: '🏞', desc: 'Холодніше, заморозки' },
                  { id: 'plain', label: 'Рівнина', emoji: '🌾', desc: 'Стандартні умови' },
                ].map(micro => (
                  <button
                    key={micro.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, microclimate: micro.id })}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      formData.microclimate === micro.id 
                        ? 'border-garden-green bg-garden-cream'
                        : 'border-gray-100 hover:border-garden-leaf'
                    }`}
                  >
                    <div className="text-2xl mb-1">{micro.emoji}</div>
                    <div className="text-sm font-semibold text-gray-700">{micro.label}</div>
                    <div className="text-xs text-gray-500 mt-1">{micro.desc}</div>
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                💡 Впливає на попередження про заморозки, хвороби від вологи
              </p>
            </div>
          </div>
        </div>

        {/* Секція 3: Інформація про ділянку */}
        <div className="card">
          <h3 className="font-bold text-garden-green mb-4 flex items-center gap-2">
            <Home className="w-5 h-5" />
            Інформація про ділянку
          </h3>
          
          <div className="space-y-4">
            {/* Площа */}
            <div>
              <label className="block text-sm font-semibold text-garden-green mb-2">
                📏 Загальна площа (м²)
              </label>
              <input
                type="number"
                value={formData.plot_size_m2}
                onChange={(e) => setFormData({ ...formData, plot_size_m2: e.target.value })}
                placeholder="Наприклад: 600"
                min="0"
                step="1"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-garden-green"
              />
              <p className="text-xs text-gray-500 mt-1">
                6 соток = 600 м², 10 соток = 1000 м²
              </p>
            </div>

            {/* Тип ґрунту */}
            <div>
              <label className="block text-sm font-semibold text-garden-green mb-2">
                <TreePine className="w-4 h-4 inline mr-1" />
                Тип ґрунту
              </label>
              <div className="grid grid-cols-2 gap-2">
                {SOIL_TYPES.map(soil => (
                  <button
                    key={soil.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, soil_type: soil.id })}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      formData.soil_type === soil.id
                        ? 'border-garden-green bg-garden-cream'
                        : 'border-gray-100 hover:border-garden-leaf'
                    }`}
                  >
                    <div className="text-2xl mb-1">{soil.emoji}</div>
                    <div className="text-sm font-semibold text-gray-700">
                      {soil.label}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {soil.description}
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                💡 Впливає на частоту поливу (піщаний сохне швидше)
              </p>
            </div>

            {/* Орієнтація */}
            <div>
              <label className="block text-sm font-semibold text-garden-green mb-2">
                <Sun className="w-4 h-4 inline mr-1" />
                Орієнтація ділянки
              </label>
              <div className="grid grid-cols-2 gap-2">
                {ORIENTATIONS.map(orient => (
                  <button
                    key={orient.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, orientation: orient.id })}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      formData.orientation === orient.id
                        ? 'border-garden-green bg-garden-cream'
                        : 'border-gray-100 hover:border-garden-leaf'
                    }`}
                  >
                    <div className="text-2xl mb-1">{orient.emoji}</div>
                    <div className="text-sm font-semibold text-gray-700">
                      {orient.label}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {orient.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Джерело води */}
            <div>
              <label className="block text-sm font-semibold text-garden-green mb-2">
                <Droplet className="w-4 h-4 inline mr-1" />
                Джерело води
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {WATER_SOURCES.map(source => (
                  <button
                    key={source.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, water_source: source.id })}
                    className={`p-3 rounded-xl border-2 text-center transition-all ${
                      formData.water_source === source.id
                        ? 'border-garden-green bg-garden-cream'
                        : 'border-gray-100 hover:border-garden-leaf'
                    }`}
                  >
                    <div className="text-2xl mb-1">{source.emoji}</div>
                    <div className="text-xs font-semibold text-gray-700">
                      {source.label}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Електрика */}
            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.has_electricity}
                  onChange={(e) => setFormData({ ...formData, has_electricity: e.target.checked })}
                  className="w-5 h-5 text-garden-green rounded focus:ring-garden-green"
                />
                <Zap className="w-5 h-5 text-garden-harvest" />
                <span className="text-sm font-semibold text-garden-green">
                  Є електрика на ділянці
                </span>
              </label>
              <p className="text-xs text-gray-500 mt-1 ml-8">
                Важливо для насосів, освітлення, інструментів
              </p>
            </div>
          </div>
        </div>

        {/* Секція 4: Сім'я */}
        <div className="card">
          <h3 className="font-bold text-garden-green mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Сім'я
          </h3>
          
          <div>
            <label className="block text-sm font-semibold text-garden-green mb-2">
              👨‍👩‍👧‍👦 Кількість людей
            </label>
            <input
              type="number"
              value={formData.family_size}
              onChange={(e) => setFormData({ ...formData, family_size: e.target.value })}
              min="1"
              max="20"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-garden-green"
            />
            <p className="text-xs text-gray-500 mt-2">
              💡 Використовується для розрахунку потреб урожаю (Фаза 3)
            </p>
          </div>
        </div>

        {/* Повідомлення */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-garden-leaf px-4 py-3 rounded-xl flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            <p className="text-sm font-semibold">{successMessage}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-garden-alert px-4 py-3 rounded-xl flex items-start gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Кнопка збереження */}
        <button
          type="submit"
          disabled={saving}
          className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Зберігаю...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Зберегти зміни
            </>
          )}
        </button>

      </form>

      {/* Підказка */}
      <div className="card bg-garden-cream/50">
        <p className="text-xs text-gray-600 text-center">
          💡 Ці дані допомагають системі давати точніші рекомендації. 
          Наприклад, якщо ґрунт піщаний — система рекомендуватиме частіший полив.
        </p>
      </div>
    </div>
  );
}