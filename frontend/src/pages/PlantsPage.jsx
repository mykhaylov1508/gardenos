// src/pages/PlantsPage.jsx — список бібліотеки культур
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Sprout, Loader2, Search } from 'lucide-react';

export default function PlantsPage() {
  const navigate = useNavigate();
  const [library, setLibrary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

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
      case 'berry': return '🫐';
      default: return '🌱';
    }
  }

  // Фільтрація
  const filteredPlants = library.filter(plant => {
    const matchesSearch = !searchQuery || 
      plant.name_uk.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'all' || 
      plant.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [
    { value: 'all', label: 'Всі', emoji: '🌱' },
    { value: 'vegetable', label: 'Овочі', emoji: '🥬' },
    { value: 'herb', label: 'Зелень', emoji: '🌿' },
    { value: 'berry', label: 'Ягоди', emoji: '🍓' },
    { value: 'tree', label: 'Дерева', emoji: '🌳' },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-garden-green mb-2">
        🌱 Бібліотека культур
      </h2>
      <p className="text-gray-600 mb-6">
        {library.length} культур в базі знань. Клікни на рослину щоб побачити деталі.
      </p>

      {/* Пошук */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Пошук рослини..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border-2 border-garden-green/20 rounded-xl bg-white focus:border-garden-green focus:outline-none"
        />
      </div>

      {/* Фільтри категорій */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-4">
        {categories.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setActiveCategory(cat.value)}
            className={`px-4 py-2 rounded-full whitespace-nowrap transition text-sm font-semibold ${
              activeCategory === cat.value
                ? 'bg-garden-green text-white'
                : 'bg-garden-green/10 text-garden-green hover:bg-garden-green/20'
            }`}
          >
            {cat.emoji} {cat.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="card text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-garden-green mx-auto" />
        </div>
      )}

      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {filteredPlants.map((plant) => (
            <div
              key={plant.id}
              onClick={() => navigate(`/library/${plant.id}`)}
              className="card text-center cursor-pointer hover:shadow-lg hover:scale-105 transition-all"
            >
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

      {!loading && filteredPlants.length === 0 && (
        <div className="card text-center py-12">
          <div className="text-5xl mb-3">🔍</div>
          <p className="text-gray-600">Не знайдено рослин</p>
        </div>
      )}
    </div>
  );
}