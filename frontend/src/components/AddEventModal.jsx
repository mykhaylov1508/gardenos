// src/components/AddEventModal.jsx
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { X, Droplet, Leaf, Apple, Camera, Loader2 } from 'lucide-react';

export default function AddEventModal({ plantId, plantName, onClose, onEventAdded }) {
  const { user } = useAuth();
  
  const [eventType, setEventType] = useState('water');
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('liters');
  const [notes, setNotes] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Обробка вибору фото
  function handlePhotoSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Перевірка розміру (макс 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Фото має бути менше 5 МБ');
      return;
    }
    
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setError('');
  }

  // Завантаження фото в Supabase Storage
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
    
    // Отримуємо публічний URL
    const { data } = supabase.storage
      .from('garden-photos')
      .getPublicUrl(filePath);
    
    return data.publicUrl;
  }

  // Відправка форми
  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    
    try {
      let photoUrl = null;
      
      // Завантажуємо фото якщо є
      if (photoFile) {
        setUploading(true);
        photoUrl = await uploadPhoto(photoFile, plantId);
        setUploading(false);
      }
      
      // Записуємо подію
      const { error: eventError } = await supabase
        .from('events_log')
        .insert({
          user_id: user.id,
          plant_id: plantId,
          event_type: eventType,
          event_date: eventDate,
          quantity: quantity ? parseFloat(quantity) : null,
          unit: quantity ? unit : null,
          notes: notes || null,
          photo_url: photoUrl
        });
      
      if (eventError) throw eventError;
      
      // Сповіщаємо батьківський компонент
      onEventAdded?.();
      
    } catch (err) {
      console.error('Помилка:', err);
      setError(err.message || 'Не вдалось зберегти подію');
      setUploading(false);
    } finally {
      setSubmitting(false);
    }
  }

  // Типи подій з іконками
  const eventTypes = [
    { id: 'water', label: 'Полив', icon: Droplet, color: 'bg-garden-water' },
    { id: 'feed', label: 'Підживлення', icon: Leaf, color: 'bg-garden-leaf' },
    { id: 'harvest', label: 'Збір урожаю', icon: Apple, color: 'bg-garden-harvest' },
    { id: 'observe', label: 'Спостереження', icon: Camera, color: 'bg-garden-alert' },
    { id: 'prune', label: 'Обрізка', icon: Leaf, color: 'bg-gray-500' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-3xl">
          <h3 className="font-bold text-garden-green">
            ➕ Додати подію: {plantName}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* Тип події */}
          <div>
            <label className="block text-sm font-semibold text-garden-green mb-3">
              Тип події
            </label>
            <div className="grid grid-cols-3 gap-2">
              {eventTypes.map(type => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setEventType(type.id)}
                    className={`p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                      eventType === type.id
                        ? 'border-garden-green bg-garden-cream'
                        : 'border-gray-100 hover:border-garden-leaf'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full ${type.color} flex items-center justify-center`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xs font-medium text-gray-700">{type.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Дата */}
          <div>
            <label className="block text-sm font-semibold text-garden-green mb-2">
              📅 Дата
            </label>
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-garden-green"
            />
          </div>

          {/* Кількість (для поливу/підживлення/збору) */}
          {['water', 'feed', 'harvest'].includes(eventType) && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-garden-green mb-2">
                  🔢 Кількість
                </label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Наприклад: 15"
                  step="0.1"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-garden-green"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-garden-green mb-2">
                  📏 Одиниця
                </label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-garden-green bg-white"
                >
                  {eventType === 'water' && (
                    <>
                      <option value="liters">Літри</option>
                      <option value="ml">Мілілітри</option>
                    </>
                  )}
                  {eventType === 'feed' && (
                    <>
                      <option value="grams">Грами</option>
                      <option value="kg">Кілограми</option>
                      <option value="ml">Мілілітри</option>
                    </>
                  )}
                  {eventType === 'harvest' && (
                    <>
                      <option value="kg">Кілограми</option>
                      <option value="pieces">Штуки</option>
                      <option value="bunches">Пучки</option>
                    </>
                  )}
                </select>
              </div>
            </div>
          )}

          {/* Завантаження фото */}
          <div>
            <label className="block text-sm font-semibold text-garden-green mb-3">
              📷 Фото (необов'язково)
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
                  <p className="text-sm text-gray-600 mb-2">Натисни щоб додати фото</p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="hidden"
                    id="photo-input"
                  />
                  <label
                    htmlFor="photo-input"
                    className="inline-block px-4 py-2 bg-garden-cream text-garden-green rounded-lg text-sm font-semibold cursor-pointer hover:bg-opacity-90"
                  >
                    Обрати файл
                  </label>
                  <p className="text-xs text-gray-400 mt-2">Макс. 5 МБ</p>
                </>
              )}
            </div>
          </div>

          {/* Нотатки */}
          <div>
            <label className="block text-sm font-semibold text-garden-green mb-2">
              📝 Нотатки
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Деталі: який препарат, погода, спостереження..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-garden-green resize-none"
            />
          </div>

          {/* Помилка */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-garden-alert px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          {/* Кнопки */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl font-semibold text-gray-700 hover:bg-gray-50"
            >
              Скасувати
            </button>
            <button
              type="submit"
              disabled={submitting || uploading}
              className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {(submitting || uploading) ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {uploading ? 'Завантажую фото...' : 'Зберігаю...'}
                </>
              ) : (
                'Зберегти'
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}