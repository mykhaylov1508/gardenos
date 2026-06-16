// src/pages/ZonesPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
  Plus, Edit2, Trash2, X, MapPin, Sun, Droplet, 
  Loader2, AlertCircle, CheckCircle 
} from 'lucide-react';

// Варіанти для select-полів
const SUNLIGHT_OPTIONS = [
  { id: 'full_sun', label: 'Повне сонце (6+ год)', emoji: '☀️' },
  { id: 'partial', label: 'Часткова тінь (3-6 год)', emoji: '⛅' },
  { id: 'shade', label: 'Тінь (менше 3 год)', emoji: '🌥' },
];

const IRRIGATION_OPTIONS = [
  { id: 'manual', label: 'Ручний полив', emoji: '🚿' },
  { id: 'drip', label: 'Крапельний полив', emoji: '💧' },
  { id: 'sprinkler', label: 'Дощувачі', emoji: '🌧' },
  { id: 'none', label: 'Без поливу', emoji: '❌' },
];

const ZONE_TYPES = [
  { id: 'bed', label: 'Грядка', emoji: '🌱' },
  { id: 'greenhouse', label: 'Теплиця', emoji: '🏡' },
  { id: 'orchard', label: 'Сад', emoji: '🌳' },
  { id: 'flower_bed', label: 'Клумба', emoji: '🌸' },
  { id: 'berry', label: 'Ягідник', emoji: '🍓' },
  { id: 'other', label: 'Інше', emoji: '📦' },
];

export default function ZonesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [zones, setZones] = useState([]);
  const [plantsPerZone, setPlantsPerZone] = useState({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  const [deletingZone, setDeletingZone] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Форма
  const [formData, setFormData] = useState({
    name: '',
    zone_type: 'bed',
    area_m2: '',
    sunlight: 'full_sun',
    irrigation_type: 'manual',
    description: '',
  });

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  async function fetchData() {
    try {
      setLoading(true);
      
      // Отримуємо всі зони
      const { data: zonesData } = await supabase
        .from('my_zones')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      
      setZones(zonesData || []);
      
      // Рахуємо рослини в кожній зоні
      const { data: plantsData } = await supabase
        .from('my_plants')
        .select('id, zone_id, status')
        .eq('user_id', user.id)
        .eq('status', 'active');
      
      const counts = {};
      (plantsData || []).forEach(p => {
        counts[p.zone_id] = (counts[p.zone_id] || 0) + 1;
      });
      setPlantsPerZone(counts);
      
    } catch (err) {
      console.error('Помилка:', err);
    } finally {
      setLoading(false);
    }
  }

  // Відкрити форму для нової грядки
  function handleAddNew() {
    setEditingZone(null);
    setFormData({
      name: '',
      zone_type: 'bed',
      area_m2: '',
      sunlight: 'full_sun',
      irrigation_type: 'manual',
      description: '',
    });
    setError('');
    setShowForm(true);
  }

  // Відкрити форму для редагування
  function handleEdit(zone) {
    setEditingZone(zone);
    setFormData({
      name: zone.name || '',
      zone_type: zone.zone_type || 'bed',
      area_m2: zone.area_m2 || '',
      sunlight: zone.sunlight || 'full_sun',
      irrigation_type: zone.irrigation_type || 'manual',
      description: zone.description || '',
    });
    setError('');
    setShowForm(true);
  }

  // Закрити форму
  function handleCloseForm() {
    setShowForm(false);
    setEditingZone(null);
    setError('');
  }

  // Зберегти грядку (створити або оновити)
  async function handleSubmit(e) {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Введи назву грядки');
      return;
    }
    
    setSubmitting(true);
    setError('');
    
    try {
      const payload = {
        user_id: user.id,
        name: formData.name.trim(),
        zone_type: formData.zone_type,
        area_m2: formData.area_m2 ? parseFloat(formData.area_m2) : null,
        sunlight: formData.sunlight,
        irrigation_type: formData.irrigation_type,
        description: formData.description.trim() || null,
      };
      
      if (editingZone) {
        // Оновлення
        const { error } = await supabase
          .from('my_zones')
          .update(payload)
          .eq('id', editingZone.id);
        if (error) throw error;
      } else {
        // Створення
        const { error } = await supabase
          .from('my_zones')
          .insert(payload);
        if (error) throw error;
      }
      
      handleCloseForm();
      await fetchData();
      
    } catch (err) {
      setError(err.message || 'Не вдалось зберегти');
    } finally {
      setSubmitting(false);
    }
  }

  // Видалити грядку
  async function handleDelete() {
    if (!deletingZone) return;
    
    const plantCount = plantsPerZone[deletingZone.id] || 0;
    
    if (plantCount > 0) {
      const confirm = window.confirm(
        `На цій грядці ${plantCount} ${plantCount === 1 ? 'рослина' : 'рослин'}. ` +
        `При видаленні грядки рослини стануть "без зони". Продовжити?`
      );
      if (!confirm) {
        setDeletingZone(null);
        return;
      }
    }
    
    try {
      // Видаляємо грядку (рослини залишаться, але з NULL zone_id)
      const { error } = await supabase
        .from('my_zones')
        .delete()
        .eq('id', deletingZone.id);
      
      if (error) throw error;
      
      setDeletingZone(null);
      await fetchData();
      
    } catch (err) {
      alert('Помилка видалення: ' + err.message);
    }
  }

  // Отримати emoji для типу зони
  function getZoneEmoji(zoneType) {
    return ZONE_TYPES.find(z => z.id === zoneType)?.emoji || '📦';
  }

  if (loading) {
    return (
      <div className="card text-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-garden-green mx-auto mb-4" />
        <p className="text-gray-600">Завантажую грядки...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-garden-green">
            📍 Мої грядки
          </h2>
          <p className="text-sm text-gray-600">
            {zones.length} {zones.length === 1 ? 'грядка' : 'грядок'} · 
            Управління зонами городу
          </p>
        </div>
        <button
          onClick={handleAddNew}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Додати
        </button>
      </div>

      {/* Порожній стан */}
      {zones.length === 0 && (
        <div className="card text-center py-16">
          <div className="text-6xl mb-4">📍</div>
          <h3 className="text-xl font-bold text-garden-green mb-2">
            Ще немає жодної грядки
          </h3>
          <p className="text-gray-600 mb-6">
            Створи першу грядку щоб організувати свої рослини
          </p>
          <button
            onClick={handleAddNew}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Створити першу грядку
          </button>
        </div>
      )}

      {/* Список грядок */}
      {zones.length > 0 && (
        <div className="space-y-3">
          {zones.map(zone => {
            const plantCount = plantsPerZone[zone.id] || 0;
            const sunOption = SUNLIGHT_OPTIONS.find(s => s.id === zone.sunlight);
            const irrOption = IRRIGATION_OPTIONS.find(i => i.id === zone.irrigation_type);
            
            return (
              <div key={zone.id} className="card">
                <div className="flex items-start gap-4">
                  {/* Emoji зони */}
                  <div className="flex-shrink-0 w-14 h-14 bg-garden-cream rounded-xl flex items-center justify-center text-3xl">
                    {getZoneEmoji(zone.zone_type)}
                  </div>
                  
                  {/* Інфо */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-garden-green text-lg mb-1">
                      {zone.name}
                    </h3>
                    
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-gray-600 mb-2">
                      <span>
                        🌱 {plantCount} {plantCount === 1 ? 'рослина' : 'рослин'}
                      </span>
                      {zone.area_m2 && (
                        <span>📏 {zone.area_m2} м²</span>
                      )}
                      {sunOption && (
                        <span>{sunOption.emoji} {sunOption.label.split(' ')[0]}</span>
                      )}
                      {irrOption && (
                        <span>{irrOption.emoji} {irrOption.label}</span>
                      )}
                    </div>
                    
                    {zone.description && (
                      <p className="text-sm text-gray-500 italic">
                        {zone.description}
                      </p>
                    )}
                  </div>
                  
                  {/* Дії */}
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleEdit(zone)}
                      className="p-2 text-gray-400 hover:text-garden-green hover:bg-garden-cream rounded-lg transition-all"
                      title="Редагувати"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setDeletingZone(zone)}
                      className="p-2 text-gray-400 hover:text-garden-alert hover:bg-red-50 rounded-lg transition-all"
                      title="Видалити"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Підказка */}
      {zones.length > 0 && (
        <div className="card bg-garden-cream/50">
          <p className="text-sm text-gray-600">
            💡 <strong>Порада:</strong> При створенні нової рослини ти зможеш 
            вибрати грядку зі списку. Це допоможе краще організувати город і 
            бачити що де росте.
          </p>
        </div>
      )}

      {/* Модальне вікно форми */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-3xl">
              <h3 className="font-bold text-garden-green text-lg">
                {editingZone ? '✏️ Редагувати грядку' : '➕ Нова грядка'}
              </h3>
              <button
                onClick={handleCloseForm}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Форма */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              
              {/* Назва */}
              <div>
                <label className="block text-sm font-semibold text-garden-green mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Назва грядки *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Наприклад: Грядка №1, Теплиця, Ягідник"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-garden-green"
                  autoFocus
                />
              </div>

              {/* Тип зони */}
              <div>
                <label className="block text-sm font-semibold text-garden-green mb-2">
                  Тип зони
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {ZONE_TYPES.map(type => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, zone_type: type.id })}
                      className={`p-3 rounded-xl border-2 text-center transition-all ${
                        formData.zone_type === type.id
                          ? 'border-garden-green bg-garden-cream'
                          : 'border-gray-100 hover:border-garden-leaf'
                      }`}
                    >
                      <div className="text-2xl mb-1">{type.emoji}</div>
                      <div className="text-xs font-medium text-gray-700">
                        {type.label}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Площа */}
              <div>
                <label className="block text-sm font-semibold text-garden-green mb-2">
                  📏 Площа (м²)
                </label>
                <input
                  type="number"
                  value={formData.area_m2}
                  onChange={(e) => setFormData({ ...formData, area_m2: e.target.value })}
                  placeholder="Наприклад: 12.5"
                  step="0.1"
                  min="0"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-garden-green"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Необов'язково, але допоможе в розрахунках
                </p>
              </div>

              {/* Освітленість */}
              <div>
                <label className="block text-sm font-semibold text-garden-green mb-2">
                  <Sun className="w-4 h-4 inline mr-1" />
                  Освітленість
                </label>
                <div className="space-y-2">
                  {SUNLIGHT_OPTIONS.map(option => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, sunlight: option.id })}
                      className={`w-full p-3 rounded-xl border-2 text-left flex items-center gap-3 transition-all ${
                        formData.sunlight === option.id
                          ? 'border-garden-green bg-garden-cream'
                          : 'border-gray-100 hover:border-garden-leaf'
                      }`}
                    >
                      <span className="text-2xl">{option.emoji}</span>
                      <span className="text-sm font-medium text-gray-700">
                        {option.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Тип поливу */}
              <div>
                <label className="block text-sm font-semibold text-garden-green mb-2">
                  <Droplet className="w-4 h-4 inline mr-1" />
                  Тип поливу
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {IRRIGATION_OPTIONS.map(option => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, irrigation_type: option.id })}
                      className={`p-3 rounded-xl border-2 text-center transition-all ${
                        formData.irrigation_type === option.id
                          ? 'border-garden-green bg-garden-cream'
                          : 'border-gray-100 hover:border-garden-leaf'
                      }`}
                    >
                      <div className="text-2xl mb-1">{option.emoji}</div>
                      <div className="text-xs font-medium text-gray-700">
                        {option.label}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Опис */}
              <div>
                <label className="block text-sm font-semibold text-garden-green mb-2">
                  📝 Опис (необов'язково)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder="Особливості, історія, нотатки..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-garden-green resize-none"
                />
              </div>

              {/* Помилка */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-garden-alert px-4 py-3 rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              {/* Кнопки */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-xl font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Скасувати
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Зберігаю...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      {editingZone ? 'Зберегти' : 'Створити'}
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Модальне вікно підтвердження видалення */}
      {deletingZone && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-8 h-8 text-garden-alert" />
              </div>
              <h3 className="font-bold text-garden-green text-lg mb-2">
                Видалити грядку?
              </h3>
              <p className="text-gray-600 text-sm">
                Грядка <strong>"{deletingZone.name}"</strong> буде видалена.
                {plantsPerZone[deletingZone.id] > 0 && (
                  <span className="block mt-2 text-garden-alert">
                    ⚠️ На ній {plantsPerZone[deletingZone.id]} рослин — 
                    вони стануть "без зони", але не видаляться.
                  </span>
                )}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingZone(null)}
                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl font-semibold text-gray-700 hover:bg-gray-50"
              >
                Скасувати
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-3 bg-garden-alert text-white rounded-xl font-semibold hover:bg-opacity-90"
              >
                Видалити
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}