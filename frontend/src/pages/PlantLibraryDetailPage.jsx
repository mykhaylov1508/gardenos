// src/pages/PlantLibraryDetailPage.jsx
// Детальна сторінка культури з бібліотеки + нотатки користувача
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  ArrowLeft, Star, Edit2, Check, X, Plus, Loader2,
  Calendar, Droplet, MapPin, BookOpen, AlertCircle, Leaf
} from 'lucide-react';

export default function PlantLibraryDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [plant, setPlant] = useState(null);
  const [notes, setNotes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    notes: '',
    rating: 0,
    planted_before: false,
    success_rate: 'never',
  });

  useEffect(() => {
    if (user && id) fetchData();
  }, [user, id]);

  async function fetchData() {
    try {
      setLoading(true);

      // Завантажуємо інформацію про рослину з бібліотеки
      const { data: plantData, error: plantError } = await supabase
        .from('plant_library')
        .select('*')
        .eq('id', id)
        .single();

      if (plantError) throw plantError;
      setPlant(plantData);

      // Завантажуємо нотатки користувача
      const { data: notesData } = await supabase
        .from('user_plant_notes')
        .select('*')
        .eq('user_id', user.id)
        .eq('library_id', id)
        .maybeSingle();

      if (notesData) {
        setNotes(notesData);
        setEditForm({
          notes: notesData.notes || '',
          rating: notesData.rating || 0,
          planted_before: notesData.planted_before || false,
          success_rate: notesData.success_rate || 'never',
        });
      }
    } catch (err) {
      console.error('Помилка:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      if (notes) {
        // Оновлюємо існуючі нотатки
        const { error } = await supabase
          .from('user_plant_notes')
          .update({
            notes: editForm.notes,
            rating: editForm.rating,
            planted_before: editForm.planted_before,
            success_rate: editForm.success_rate,
          })
          .eq('id', notes.id);

        if (error) throw error;
      } else {
        // Створюємо нові нотатки
        const { error } = await supabase
          .from('user_plant_notes')
          .insert({
            user_id: user.id,
            library_id: id,
            notes: editForm.notes,
            rating: editForm.rating,
            planted_before: editForm.planted_before,
            success_rate: editForm.success_rate,
          });

        if (error) throw error;
      }

      setEditing(false);
      fetchData();
    } catch (err) {
      alert('Помилка збереження: ' + err.message);
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
        <button onClick={() => navigate('/plants')} className="btn-primary mt-4">
          Назад до бібліотеки
        </button>
      </div>
    );
  }

  const regional = plant.regional_ukraine || {};
  const beginnerTips = plant.beginner_tips || [];
  const diseases = plant.common_diseases || [];

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/plants')}
          className="p-2 hover:bg-garden-cream rounded-lg transition"
        >
          <ArrowLeft className="w-6 h-6 text-garden-green" />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-garden-green mb-1">
            {plant.name_uk}
          </h1>
          <p className="text-gray-600 italic">{plant.name_latin}</p>
        </div>
        <div className="text-6xl">
          {plant.icon_slug === 'tomato' && '🍅'}
          {plant.icon_slug === 'cucumber' && '🥒'}
          {plant.icon_slug === 'potato' && '🥔'}
          {plant.icon_slug === 'carrot' && '🥕'}
          {plant.icon_slug === 'onion' && '🧅'}
          {plant.icon_slug === 'garlic' && '🧄'}
          {plant.icon_slug === 'pepper' && '🌶️'}
          {plant.icon_slug === 'cabbage' && '🥬'}
          {plant.icon_slug === 'lettuce' && '🥗'}
          {plant.icon_slug === 'strawberry' && '🍓'}
          {!plant.icon_slug && '🌱'}
        </div>
      </div>

      {/* Основна інформація */}
      <div className="card">
        <h2 className="text-xl font-bold text-garden-green mb-4">
          📊 Характеристики
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-garden-cream/30 rounded-xl p-4">
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
              <Calendar className="w-4 h-4" /> Вегетація
            </div>
            <div className="text-2xl font-bold text-garden-green">
              {plant.vegetation_days} днів
            </div>
          </div>
          <div className="bg-garden-cream/30 rounded-xl p-4">
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
              <Droplet className="w-4 h-4" /> Полив
            </div>
            <div className="text-2xl font-bold text-garden-green">
              Кожні {plant.watering_interval_days} дн
            </div>
          </div>
        </div>
      </div>

      {/* Регіональна інформація */}
      {(regional.planting_date || regional.notes) && (
        <div className="card bg-garden-cream/50 border-garden-leaf/30">
          <h2 className="text-xl font-bold text-garden-green mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            🇺🇦 Для твого регіону
          </h2>
          <div className="space-y-3">
            {regional.planting_date && (
              <div className="bg-garden-leaf/10 rounded-xl p-4">
                <div className="text-sm text-gray-600 mb-1">🌱 Посадка</div>
                <div className="font-semibold text-garden-green">
                  {regional.planting_date}
                </div>
              </div>
            )}
            {regional.harvest_time && (
              <div className="bg-garden-harvest/10 rounded-xl p-4">
                <div className="text-sm text-gray-600 mb-1">🍎 Збір врожаю</div>
                <div className="font-semibold text-garden-green">
                  {regional.harvest_time}
                </div>
              </div>
            )}
            {regional.notes && (
              <div className="bg-white/60 rounded-xl p-4">
                <div className="text-sm text-gray-600 mb-1">💡 Поради</div>
                <div className="text-sm text-gray-700">
                  {regional.notes}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Поради для початківців */}
      {beginnerTips.length > 0 && (
        <div className="card">
          <h2 className="text-xl font-bold text-garden-green mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            💡 Поради для початківця
          </h2>
          <ul className="space-y-2">
            {beginnerTips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-garden-leaf mt-0.5">✓</span>
                {typeof tip === 'string' ? tip : tip.tip || JSON.stringify(tip)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Нотатки користувача */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-garden-green">
            📝 Мої нотатки
          </h2>
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-2 px-3 py-2 bg-garden-green text-white rounded-lg text-sm font-semibold hover:bg-garden-green/90 transition"
            >
              <Edit2 className="w-4 h-4" />
              {notes ? 'Редагувати' : 'Додати'}
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-3 py-2 bg-garden-green text-white rounded-lg text-sm font-semibold hover:bg-garden-green/90 transition"
              >
                <Check className="w-4 h-4" />
                Зберегти
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  if (notes) {
                    setEditForm({
                      notes: notes.notes || '',
                      rating: notes.rating || 0,
                      planted_before: notes.planted_before || false,
                      success_rate: notes.success_rate || 'never',
                    });
                  }
                }}
                className="flex items-center gap-2 px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-300 transition"
              >
                <X className="w-4 h-4" />
                Скасувати
              </button>
            </div>
          )}
        </div>

        {!editing ? (
          <div className="space-y-4">
            {notes?.rating > 0 && (
              <div>
                <div className="text-sm text-gray-600 mb-2">Оцінка</div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-6 h-6 ${
                        star <= notes.rating
                          ? 'fill-garden-harvest text-garden-harvest'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}

            {notes?.planted_before && (
              <div>
                <div className="text-sm text-gray-600 mb-2">Досвід</div>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-garden-leaf/10 text-garden-leaf rounded-full text-sm font-semibold">
                  ✅ Садив раніше
                </div>
                {notes.success_rate && notes.success_rate !== 'never' && (
                  <div className="mt-2 text-sm text-gray-700">
                    Результат:{' '}
                    <span className="font-semibold">
                      {notes.success_rate === 'excellent' && '🌟 Чудово'}
                      {notes.success_rate === 'good' && '👍 Добре'}
                      {notes.success_rate === 'poor' && '👎 Погано'}
                    </span>
                  </div>
                )}
              </div>
            )}

            {notes?.notes && (
              <div>
                <div className="text-sm text-gray-600 mb-2">Нотатки</div>
                <div className="bg-garden-cream/30 rounded-xl p-4 text-gray-700 whitespace-pre-wrap">
                  {notes.notes}
                </div>
              </div>
            )}

            {!notes && (
              <div className="text-center py-8 text-gray-500">
                <Plus className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>Ще немає нотаток</p>
                <p className="text-sm mt-1">
                  Натисни "Додати" щоб записати свій досвід
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Оцінка
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setEditForm({ ...editForm, rating: star })}
                    className="p-1"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= editForm.rating
                          ? 'fill-garden-harvest text-garden-harvest'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editForm.planted_before}
                  onChange={(e) =>
                    setEditForm({ ...editForm, planted_before: e.target.checked })
                  }
                  className="w-5 h-5 text-garden-green"
                />
                <span className="text-sm font-semibold text-gray-700">
                  Садив цю культуру раніше
                </span>
              </label>
            </div>

            {editForm.planted_before && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Результат
                </label>
                <select
                  value={editForm.success_rate}
                  onChange={(e) =>
                    setEditForm({ ...editForm, success_rate: e.target.value })
                  }
                  className="w-full px-3 py-2 border-2 border-garden-green/20 rounded-lg bg-white focus:border-garden-green focus:outline-none"
                >
                  <option value="never">-- Обери --</option>
                  <option value="excellent">🌟 Чудово</option>
                  <option value="good">👍 Добре</option>
                  <option value="poor">👎 Погано</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Нотатки
              </label>
              <textarea
                value={editForm.notes}
                onChange={(e) =>
                  setEditForm({ ...editForm, notes: e.target.value })
                }
                rows={5}
                placeholder="Запиши свій досвід, поради, спостереження..."
                className="w-full px-3 py-2 border-2 border-garden-green/20 rounded-lg bg-white focus:border-garden-green focus:outline-none resize-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Швидкі дії */}
      <div className="card">
        <h2 className="text-xl font-bold text-garden-green mb-4">
          ⚡ Швидкі дії
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate('/plants/new')}
            className="bg-garden-leaf/10 hover:bg-garden-leaf/20 text-garden-leaf py-4 rounded-xl font-semibold transition"
          >
            ➕ Додати на город
          </button>
          <button
            onClick={() => navigate('/planner')}
            className="bg-garden-water/10 hover:bg-garden-water/20 text-garden-water py-4 rounded-xl font-semibold transition"
          >
            🗺 Додати в план
          </button>
        </div>
      </div>
    </div>
  );
}