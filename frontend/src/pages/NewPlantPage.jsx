// src/pages/NewPlantPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Calendar, MapPin, Sprout, Loader2, Search } from 'lucide-react';

export default function NewPlantPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Стани форми
  const [library, setLibrary] = useState([]);
  const [zones, setZones] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLibraryId, setSelectedLibraryId] = useState('');
  const [selectedZoneId, setSelectedZoneId] = useState('');
  const [customName, setCustomName] = useState('');
  const [plantedDate, setPlantedDate] = useState(new Date().toISOString().split('T')[0]);
  const [areaM2, setAreaM2] = useState(1);
  const [notes, setNotes] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Завантажуємо бібліотеку і зони
  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  async function fetchData() {
    setLoading(true);
    
    // Бібліотека культур (фільтруємо по пошуку)
    const { data: libData } = await supabase
      .from('plant_library')
      .select('id, name_uk, category, vegetation_days, watering_interval_days')
      .order('name_uk');
    setLibrary(libData || []);
    
    // Зони користувача
    const { data: zonesData } = await supabase
      .from('my_zones')
      .select('id, name')
      .eq('user_id', user.id);
    setZones(zonesData || []);
    
    setLoading(false);
  }

  // Фільтрована бібліотека по пошуку
  const filteredLibrary = library.filter(plant =>
    plant.name_uk.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Обрана культура з бібліотеки
  const selectedPlant = library.find(p => p.id === selectedLibraryId);

  // Відправка форми
  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedLibraryId || !selectedZoneId) {
      setError('Обери культуру та грядку');
      return;
    }
    
    setSubmitting(true);
    setError('');
    
    try {
      // 1. Створюємо запис рослини
      const { data: newPlant, error: plantError } = await supabase
        .from('my_plants')
        .insert({
          user_id: user.id,
          zone_id: selectedZoneId,
          library_id: selectedLibraryId,
          custom_name: customName || null,
          planted_date: plantedDate,
          area_m2: areaM2,
          notes: notes || null,
          status: 'active'
        })
        .select()
        .single();
      
      if (plantError) throw plantError;
      
      // 2. Записуємо подію "посадка"
      await supabase.from('events_log').insert({
        user_id: user.id,
        plant_id: newPlant.id,
        event_type: 'plant',
        event_date: plantedDate,
        notes: `Посаджено: ${customName || selectedPlant?.name_uk}`
      });
      
      // 3. Перенаправляємо на профіль нової рослини
      navigate(`/plants/${newPlant.id}`);
      
    } catch (err) {
      console.error('Помилка:', err);
      setError(err.message || 'Не вдалось додати рослину');
    } finally {
      setSubmitting(false);
    }
  }

  // Іконка категорії
  function getCategoryIcon(category) {
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

  if (loading) {
    return (
      <div className="card text-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-garden-green mx-auto mb-4" />
        <p className="text-gray-600">Завантажую дані...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Заголовок */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-garden-green hover:underline mb-6"
      >
        <ArrowLeft className="w-5 h-5" />
        Назад
      </button>
      
      <h2 className="text-2xl font-bold text-garden-green mb-2">
        ➕ Додати нову рослину
      </h2>
      <p className="text-gray-600 mb-6">
        Обери культуру з бібліотеки та вкажи де посадив
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Пошук по бібліотеці */}
        <div className="card">
          <label className="block text-sm font-semibold text-garden-green mb-3">
            🔍 Обери культуру
          </label>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Пошук: томат, огірок, морква..."
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-garden-green"
            />
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
            {filteredLibrary.map(plant => (
              <button
                key={plant.id}
                type="button"
                onClick={() => setSelectedLibraryId(plant.id)}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  selectedLibraryId === plant.id
                    ? 'border-garden-green bg-garden-cream'
                    : 'border-gray-100 hover:border-garden-leaf'
                }`}
              >
                <div className="text-2xl mb-1">
                  {getCategoryIcon(plant.category)}
                </div>
                <div className="font-semibold text-sm text-garden-green">
                  {plant.name_uk}
                </div>
                <div className="text-xs text-gray-500">
                  {plant.vegetation_days}д · полив {plant.watering_interval_days}д
                </div>
              </button>
            ))}
          </div>
          {filteredLibrary.length === 0 && (
            <p className="text-center text-gray-500 py-4">
              Нічого не знайдено 😕
            </p>
          )}
        </div>

        {/* Деталі обраної культури */}
        {selectedPlant && (
          <div className="card bg-garden-cream border-garden-leaf">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">{getCategoryIcon(selectedPlant.category)}</span>
              <div>
                <h3 className="font-bold text-garden-green">{selectedPlant.name_uk}</h3>
                <p className="text-sm text-gray-600">
                  Вегетація: {selectedPlant.vegetation_days} днів · 
                  Полив кожні {selectedPlant.watering_interval_days} днів
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Грядка/Зона */}
        <div className="card">
          <label className="block text-sm font-semibold text-garden-green mb-3">
            <MapPin className="w-4 h-4 inline mr-1" />
            Де посадив?
          </label>
          <select
            value={selectedZoneId}
            onChange={(e) => setSelectedZoneId(e.target.value)}
            required
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-garden-green bg-white"
          >
            <option value="">Обери грядку...</option>
            {zones.map(zone => (
              <option key={zone.id} value={zone.id}>{zone.name}</option>
            ))}
          </select>
          {zones.length === 0 && (
            <p className="text-sm text-garden-alert mt-2">
              ⚠️ Спочатку створи грядку в розділі "Город"
            </p>
          )}
        </div>

        {/* Назва (опціонально) */}
        <div className="card">
          <label className="block text-sm font-semibold text-garden-green mb-3">
            🏷 Назва (необов'язково)
          </label>
          <input
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="Наприклад: Мої ранні томати"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-garden-green"
          />
          <p className="text-xs text-gray-500 mt-1">
            Якщо залишиш порожнім — буде використовуватись назва культури
          </p>
        </div>

        {/* Дата посадки */}
        <div className="card">
          <label className="block text-sm font-semibold text-garden-green mb-3">
            <Calendar className="w-4 h-4 inline mr-1" />
            Дата посадки
          </label>
          <input
            type="date"
            value={plantedDate}
            onChange={(e) => setPlantedDate(e.target.value)}
            required
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-garden-green"
          />
        </div>

        {/* Площа */}
        <div className="card">
          <label className="block text-sm font-semibold text-garden-green mb-3">
            📏 Площа (м²)
          </label>
          <input
            type="number"
            value={areaM2}
            onChange={(e) => setAreaM2(parseFloat(e.target.value) || 1)}
            min="0.1"
            step="0.1"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-garden-green"
          />
          <p className="text-xs text-gray-500 mt-1">
            Впливає на розрахунок норм поливу та підживлення
          </p>
        </div>

        {/* Нотатки */}
        <div className="card">
          <label className="block text-sm font-semibold text-garden-green mb-3">
            📝 Нотатки (необов'язково)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Сорт, особливості посадки, джерело насіння..."
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-garden-green resize-none"
          />
        </div>

        {/* Помилка */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-garden-alert px-4 py-3 rounded-xl">
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Кнопка */}
        <button
          type="submit"
          disabled={submitting || !selectedLibraryId || !selectedZoneId}
          className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Зберігаю...
            </>
          ) : (
            <>
              <Sprout className="w-5 h-5" />
              Додати рослину
            </>
          )}
        </button>

      </form>
    </div>
  );
}