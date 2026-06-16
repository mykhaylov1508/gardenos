// src/components/QuickLogModal.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { X, Droplet, AlertCircle, Apple, Camera, Loader2, CheckCircle } from 'lucide-react';

export default function QuickLogModal({ actionType, onClose }) {
  const { user } = useAuth();
  
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Форма
  const [selectedPlantId, setSelectedPlantId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('liters');
  const [notes, setNotes] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  // Завантажуємо список рослин
  useEffect(() => {
    fetchPlants();
  }, []);

  async function fetchPlants() {
    try {
      setLoading(true);
      const { data } = await supabase
        .from('my_plants')
        .select('id, custom_name, plant_library(name_uk)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('custom_name');
      
      setPlants(data || []);
    } catch (err) {
      console.error('Помилка:', err);
    } finally {
      setLoading(false);
    }
  }

  // Обробка вибору фото
  function handlePhotoSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      setError('Фото має бути менше 5 МБ');
      return;
    }
    
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setError('');
  }

  // Завантаження фото в Storage
  async function uploadPhoto(file, plantId) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${plantId}/${Date.now()}.${fileExt}`;
    const filePath = `plant-photos/${fileName}`;
    
    const { error: uploadError } = await supabase.storage
      .from('garden-photos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (uploadError) throw uploadError;
    
    const { data } = supabase.storage
      .from('garden-photos')
      .getPublicUrl(filePath);
    
    return data.publicUrl;
  }

  // Відправка форми
  async function handleSubmit(e) {
    e.preventDefault();
    
    if (!selectedPlantId) {
      setError('Обери рослину');
      return;
    }
    
    setSubmitting(true);
    setError('');
    
    try {
      let photoUrl = null;
      
      // Завантажуємо фото якщо є
      if (photoFile) {
        photoUrl = await uploadPhoto(photoFile, selectedPlantId);
      }
      
      // Визначаємо тип події
      const eventType = actionType === 'water' ? 'water' 
                      : actionType === 'problem' ? 'observe'
                      : actionType === 'harvest' ? 'harvest' : 'other';
      
      // Записуємо подію
      const { error: eventError } = await supabase
        .from('events_log')
        .insert({
          user_id: user.id,
          plant_id: selectedPlantId,
          event_type: eventType,
          event_date: new Date().toISOString().split('T')[0],
          quantity: quantity ? parseFloat(quantity) : null,
          unit: quantity ? unit : null,
          notes: notes || null,
          photo_url: photoUrl
        });
      
      if (eventError) throw eventError;
      
      setSuccess(true);
      
      // Закриваємо через 1.5 секунди
      setTimeout(() => {
        onClose();
      }, 1500);
      
    } catch (err) {
      console.error('Помилка:', err);
      setError(err.message || 'Не вдалось зберегти');
    } finally {
      setSubmitting(false);
    }
  }

  // Конфігурація для кожного типу дії
  const config = {
    water: {
      title: '💧 Записати полив',
      icon: Droplet,
      color: 'bg-garden-water',
      quantityLabel: 'Обсяг води',
      units: [
        { id: 'liters', label: 'Літри' },
        { id: 'ml', label: 'Мілілітри' },
      ],
      quickAmounts: ['2', '5', '10', '20'],
    },
    problem: {
      title: '🏥 Записати проблему',
      icon: AlertCircle,
      color: 'bg-garden-alert',
      quantityLabel: null,
      units: [],
      quickAmounts: [],
    },
    harvest: {
      title: '🍎 Записати збір',
      icon: Apple,
      color: 'bg-garden-harvest',
      quantityLabel: 'Кількість',
      units: [
        { id: 'kg', label: 'Кілограми' },
        { id: 'g', label: 'Грами' },
        { id: 'pieces', label: 'Штуки' },
      ],
      quickAmounts: ['0.5', '1', '2', '5'],
    },
  };

  const currentConfig = config[actionType];
  const Icon = currentConfig.icon;

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
        <div className="bg-white rounded-3xl w-full max-w-md p-8 text-center animate-scale-in">
          <div className="w-20 h-20 bg-garden-leaf rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>
          <h3 className="text-xl font-bold text-garden-green mb-2">
            Збережено!
          </h3>
          <p className="text-gray-600">
            {currentConfig.title}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-slide-up">
        
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${currentConfig.color} rounded-full flex items-center justify-center`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-bold text-garden-green text-lg">
              {currentConfig.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Форма */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* Вибір рослини */}
          <div>
            <label className="block text-sm font-semibold text-garden-green mb-2">
              🌱 Рослина
            </label>
            {loading ? (
              <div className="text-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-garden-green mx-auto" />
              </div>
            ) : (
              <select
                value={selectedPlantId}
                onChange={(e) => setSelectedPlantId(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-garden-green bg-white"
              >
                <option value="">Обери рослину...</option>
                {plants.map(plant => (
                  <option key={plant.id} value={plant.id}>
                    {plant.custom_name || plant.plant_library?.name_uk}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Кількість (для поливу і збору) */}
          {currentConfig.quantityLabel && (
            <div>
              <label className="block text-sm font-semibold text-garden-green mb-2">
                🔢 {currentConfig.quantityLabel}
              </label>
              
              {/* Швидкі кнопки */}
              {currentConfig.quickAmounts.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {currentConfig.quickAmounts.map(amount => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => setQuantity(amount)}
                      className={`py-2 rounded-lg font-semibold text-sm transition-all ${
                        quantity === amount
                          ? 'bg-garden-green text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {amount}
                    </button>
                  ))}
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Або введи вручну"
                  step="0.1"
                  className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-garden-green"
                />
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-garden-green bg-white"
                >
                  {currentConfig.units.map(u => (
                    <option key={u.id} value={u.id}>{u.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Фото (обов'язкове для проблеми) */}
          <div>
            <label className="block text-sm font-semibold text-garden-green mb-2">
              📷 Фото {actionType === 'problem' && '(рекомендовано)'}
            </label>
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center">
              {photoPreview ? (
                <div className="relative">
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-full h-40 object-cover rounded-lg mb-3"
                  />
                  <button
                    type="button"
                    onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                    className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 mb-2">
                    {actionType === 'problem' 
                      ? 'Сфотографуй проблему для аналізу' 
                      : 'Додай фото (необов\'язково)'}
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="hidden"
                    id="quick-photo-input"
                  />
                  <label
                    htmlFor="quick-photo-input"
                    className="inline-block px-4 py-2 bg-garden-cream text-garden-green rounded-lg text-sm font-semibold cursor-pointer hover:bg-opacity-90"
                  >
                    Обрати файл
                  </label>
                </>
              )}
            </div>
          </div>

          {/* Нотатки */}
          <div>
            <label className="block text-sm font-semibold text-garden-green mb-2">
              📝 Нотатки {actionType === 'problem' && '(опиши що бачиш)'}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder={
                actionType === 'problem' 
                  ? 'Наприклад: листя жовтіє знизу, є коричневі плями...'
                  : 'Додаткові деталі...'
              }
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-garden-green resize-none"
            />
          </div>

          {/* Помилка */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-garden-alert px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          {/* Кнопка збереження */}
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Зберігаю...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Зберегти
              </>
            )}
          </button>

        </form>
      </div>
    </div>
  );
}