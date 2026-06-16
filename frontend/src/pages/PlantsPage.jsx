// src/pages/PlantsPage.jsx — список бібліотеки культур (поки заглушка)
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Sprout, Loader2 } from 'lucide-react';

export default function PlantsPage() {
  const [library, setLibrary] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLibrary();
  }, []);

  async function fetchLibrary() {
    const { data } = await supabase
      .from('plant_library')
      .select('id, name_uk, category, vegetation_days, watering_interval_days')
      .order('name_uk');
    setLibrary(data || []);
    setLoading(false);
  }

  function getCategoryIcon(category) {
    switch (category) {
      case 'vegetable': return '🥬';
      case 'fruit': return '🍓';
      case 'herb': return '🌿';
      case 'tree': return '🌳';
      default: return '🌱';
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-garden-green mb-2">
        🌱 Бібліотека культур
      </h2>
      <p className="text-gray-600 mb-6">
        {library.length} культур в базі знань
      </p>

      {loading && (
        <div className="card text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-garden-green mx-auto" />
        </div>
      )}

      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {library.map((plant) => (
            <div key={plant.id} className="card text-center">
              <div className="text-4xl mb-2">
                {getCategoryIcon(plant.category)}
              </div>
              <h3 className="font-bold text-garden-green text-sm mb-1">
                {plant.name_uk}
              </h3>
              <p className="text-xs text-gray-500">
                {plant.vegetation_days}д · полив {plant.watering_interval_days}д
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}