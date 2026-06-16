// src/pages/GardenPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Sprout, MapPin, Loader2 } from 'lucide-react';

export default function GardenPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [zones, setZones] = useState([]);
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);

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
      
      // Отримуємо всі рослини з інформацією з бібліотеки
      const { data: plantsData } = await supabase
        .from('my_plants')
        .select(`
          *,
          plant_library (name_uk, category, vegetation_days, icon_slug)
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('planted_date', { ascending: false });
      
      setZones(zonesData || []);
      setPlants(plantsData || []);
    } catch (err) {
      console.error('Помилка:', err);
    } finally {
      setLoading(false);
    }
  }

  // Обчислюємо прогрес дозрівання для рослини
  function getProgress(plant) {
    if (!plant.planted_date || !plant.plant_library?.vegetation_days) {
      return null;
    }
    const daysPlanted = Math.floor(
      (new Date() - new Date(plant.planted_date)) / (1000 * 60 * 60 * 24)
    );
    const progress = (daysPlanted / plant.plant_library.vegetation_days) * 100;
    return Math.min(100, Math.max(0, progress));
  }

  // Іконка категорії
  function getCategoryIcon(category) {
    switch (category) {
      case 'vegetable':
        return '🥬';
      case 'fruit':
        return '🍓';
      case 'herb':
        return '🌿';
      case 'tree':
        return '🌳';
      default:
        return '🌱';
    }
  }

  // Групуємо рослини по зонам
  const plantsByZone = zones.map((zone) => ({
    ...zone,
    plants: plants.filter((p) => p.zone_id === zone.id),
  }));

  // Рослини без зони
  const unassignedPlants = plants.filter((p) => !p.zone_id);

  return (
    <div>
      {/* Заголовок */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-garden-green mb-1">
            🗺 Мій Город
          </h2>
          <p className="text-gray-600">
            {plants.length} {plants.length === 1 ? 'рослина' : 'рослин'} на{' '}
            {zones.length} {zones.length === 1 ? 'грядці' : 'грядках'}
          </p>
        </div>
        <button
          onClick={() => navigate('/plants/new')}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Додати
        </button>
      </div>

      {loading && (
        <div className="card text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-garden-green mx-auto mb-4" />
          <p className="text-gray-600">Завантажую город...</p>
        </div>
      )}

      {/* Порожній стан */}
      {!loading && plants.length === 0 && (
        <div className="card text-center py-16">
          <div className="text-6xl mb-4">🌱</div>
          <h3 className="text-xl font-bold text-garden-green mb-2">
            Город ще порожній
          </h3>
          <p className="text-gray-600 mb-6">
            Додай першу рослину щоб почати сезон
          </p>
          <button
            onClick={() => navigate('/plants/new')}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Додати першу рослину
          </button>
        </div>
      )}

      {/* Список зон з рослинами */}
      {!loading && plantsByZone.map((zone) => (
        <div key={zone.id} className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-5 h-5 text-garden-terracotta" />
            <h3 className="text-lg font-bold text-garden-green">
              {zone.name}
            </h3>
            <span className="text-sm text-gray-500">
              ({zone.plants.length})
            </span>
          </div>

          {zone.plants.length === 0 ? (
            <div className="card text-center py-6 text-gray-500 text-sm">
              Поки що нічого не посаджено на цій грядці
            </div>
          ) : (
            <div className="space-y-3">
              {zone.plants.map((plant) => {
                const progress = getProgress(plant);
                return (
                  <div
                    key={plant.id}
                    onClick={() => navigate(`/plants/${plant.id}`)}
                    className="card hover:shadow-lg cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-4">
                      {/* Іконка рослини */}
                      <div className="flex-shrink-0 w-14 h-14 bg-garden-cream rounded-xl flex items-center justify-center text-3xl">
                        {getCategoryIcon(plant.plant_library?.category)}
                      </div>

                      {/* Інфо */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-garden-green mb-1">
                          {plant.custom_name || plant.plant_library?.name_uk}
                        </h4>
                        <p className="text-sm text-gray-600 mb-2">
                          {plant.plant_library?.name_uk}
                          {plant.planted_date &&
                            ` · Посаджено ${new Date(
                              plant.planted_date
                            ).toLocaleDateString('uk-UA', {
                              day: 'numeric',
                              month: 'short',
                            })}`}
                        </p>

                        {/* Прогрес дозрівання */}
                        {progress !== null && (
                          <div>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-gray-500">
                                Прогрес до збору
                              </span>
                              <span className="font-semibold text-garden-green">
                                {Math.round(progress)}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  progress >= 90
                                    ? 'bg-garden-harvest'
                                    : progress >= 60
                                    ? 'bg-garden-leaf'
                                    : 'bg-garden-water'
                                }`}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Статус */}
                      <div className="flex-shrink-0">
                        {progress >= 90 ? (
                          <span className="text-2xl" title="Готове до збору">
                            🍎
                          </span>
                        ) : progress >= 60 ? (
                          <span className="text-2xl" title="Росте">
                            🌿
                          </span>
                        ) : (
                          <span className="text-2xl" title="Молоде">
                            🌱
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}

      {/* Рослини без зони */}
      {!loading && unassignedPlants.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-bold text-garden-green mb-3">
            📦 Без зони
          </h3>
          <div className="space-y-3">
            {unassignedPlants.map((plant) => (
              <div
                key={plant.id}
                onClick={() => navigate(`/plants/${plant.id}`)}
                className="card hover:shadow-lg cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-garden-cream rounded-xl flex items-center justify-center text-3xl">
                    {getCategoryIcon(plant.plant_library?.category)}
                  </div>
                  <div>
                    <h4 className="font-bold text-garden-green">
                      {plant.custom_name || plant.plant_library?.name_uk}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {plant.plant_library?.name_uk}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}