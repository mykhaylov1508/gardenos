// src/pages/MapPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Loader2, Image as ImageIcon, Upload } from 'lucide-react';
import DetailedGridMap from '../components/DetailedGridMap';

export default function MapPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [zones, setZones] = useState([]);
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedZone, setSelectedZone] = useState(null);

  // Розміри ділянки з профілю (або дефолтні)
  const plotSize = profile?.plot_size_m2 || 600; // 6 соток
  const plotWidth = Math.sqrt(plotSize * 0.66); // припускаємо співвідношення 2:3
  const plotLength = plotSize / plotWidth;

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  async function fetchData() {
    try {
      setLoading(true);

      const { data: zonesData } = await supabase
        .from('my_zones')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      const { data: plantsData } = await supabase
        .from('my_plants')
        .select(`
          *,
          plant_library (name_uk, category, vegetation_days)
        `)
        .eq('user_id', user.id)
        .eq('status', 'active');

      setZones(zonesData || []);
      setPlants(plantsData || []);
    } catch (err) {
      console.error('Помилка:', err);
    } finally {
      setLoading(false);
    }
  }

  // Оновлення позиції зони після drop
  function handleZoneDrop(zoneId, newX, newY) {
    setZones(zones.map(z =>
      z.id === zoneId ? { ...z, grid_x: newX, grid_y: newY } : z
    ));
  }

  // Клік на зону — відкриваємо список рослин
  function handleZoneClick(zone) {
    setSelectedZone(zone);
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
            {zones.length} {zones.length === 1 ? 'зона' : 'зон'} · 
            Перетягуй грядки щоб змінити розташування
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

      {/* Карта */}
      <div className="card p-6">
        <DetailedGridMap
          zones={zones}
          plants={plants}
          plotWidth={plotWidth}
          plotLength={plotLength}
          onZoneClick={handleZoneClick}
          onZoneDrop={handleZoneDrop}
        />
      </div>

      {/* Порожній стан */}
      {zones.length === 0 && (
        <div className="card text-center py-12">
          <div className="text-6xl mb-4">🗺</div>
          <h3 className="text-xl font-bold text-garden-green mb-2">
            Карта порожня
          </h3>
          <p className="text-gray-600 mb-4">
            Створи першу грядку щоб розмістити її на карті
          </p>
          <button
            onClick={() => navigate('/garden/zones')}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Створити грядку
          </button>
        </div>
      )}

      {/* Бічна панель з деталями зони */}
      {selectedZone && (
        <ZoneSidePanel
          zone={selectedZone}
          plants={plants.filter(p => p.zone_id === selectedZone.id)}
          onClose={() => setSelectedZone(null)}
          onViewPlant={(plantId) => {
            navigate(`/plants/${plantId}`);
            setSelectedZone(null);
          }}
        />
      )}
    </div>
  );
}

// Бічна панель з деталями зони
function ZoneSidePanel({ zone, plants, onClose, onViewPlant }) {
  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-white shadow-2xl z-50 overflow-y-auto animate-slide-in">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-garden-green text-lg">{zone.name}</h3>
          <p className="text-xs text-gray-500">
            {zone.area_m2 || '?'} м² · {plants.length} рослин
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-full"
        >
          ✕
        </button>
      </div>

      {/* Контент */}
      <div className="p-6 space-y-4">
        {zone.description && (
          <p className="text-sm text-gray-600 italic">{zone.description}</p>
        )}

        {/* Список рослин */}
        <div>
          <h4 className="font-bold text-garden-green text-sm mb-3">
            🌱 Що росте на цій грядці
          </h4>
          {plants.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-4">
              Поки що нічого не посаджено
            </p>
          ) : (
            <div className="space-y-2">
              {plants.map(plant => (
                <div
                  key={plant.id}
                  className="bg-cream-paper rounded-lg p-3 cursor-pointer hover:shadow-md transition"
                  onClick={() => onViewPlant(plant.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">
                      {plant.plant_library?.category === 'vegetable' && '🥬'}
                      {plant.plant_library?.category === 'fruit' && '🍓'}
                      {plant.plant_library?.category === 'herb' && '🌿'}
                      {plant.plant_library?.category === 'tree' && '🌳'}
                      {!plant.plant_library?.category && '🌱'}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-garden-green text-sm">
                        {plant.custom_name || plant.plant_library?.name_uk}
                      </div>
                      <div className="text-xs text-gray-500">
                        {plant.plant_library?.name_uk}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}