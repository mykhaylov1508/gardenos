// frontend/src/features/planner/steps/Step2PlantSelection.tsx
// 🌿 GardenOS v2.0 - Крок 2: Вибір рослин для посадки

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { usePlannerState, type SelectedPlantData } from '../usePlannerState';

/**
 * Тип рослини з бібліотеки (те що приходить з БД)
 */
interface PlantLibraryItem {
  id: string;
  name_uk: string;
  category: string;
  icon_slug: string;
  vegetation_days: number;
  watering_interval_days: number;
  care_tips: string[];
  beginner_tips: any;
}

export function Step2PlantSelection() {
  const { 
    selected_plants, 
    togglePlant, 
    setStep, 
    optimization_goal, 
    setOptimizationGoal 
  } = usePlannerState();
  
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Завантажуємо бібліотеку рослин з Supabase
  const { data: library = [], isLoading } = useQuery({
    queryKey: ['plant_library'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plant_library')
        .select('*')
        .order('name_uk');
      
      if (error) throw error;
      return data as PlantLibraryItem[];
    },
  });
  
  // Фільтруємо рослини за категорією та пошуком
  const filteredPlants = useMemo(() => {
    let result = library;
    
    if (activeCategory !== 'all') {
      result = result.filter(p => p.category === activeCategory);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.name_uk.toLowerCase().includes(query)
      );
    }
    
    return result;
  }, [library, activeCategory, searchQuery]);
  
  // Категорії для фільтру
  const categories = [
    { value: 'all', label: 'Всі', emoji: '🌱' },
    { value: 'vegetable', label: 'Овочі', emoji: '🥕' },
    { value: 'herb', label: 'Зелень', emoji: '🌿' },
    { value: 'berry', label: 'Ягоди', emoji: '🫐' },
    { value: 'tree', label: 'Дерева', emoji: '🌳' },
  ];
  
  // Перевірка чи рослина вибрана
  const isSelected = (plantId: string) => {
    return selected_plants.some(p => p.library_id === plantId);
  };
  
  // Обробка вибору рослини
  const handleToggle = (plant: PlantLibraryItem) => {
    const plantData: SelectedPlantData = {
      library_id: plant.id,
      name_uk: plant.name_uk,
      priority: 'must_have',
    };
    togglePlant(plantData);
  };
  
  // Перехід до наступного кроку
  const handleNext = () => {
    if (selected_plants.length === 0) {
      alert('Обери хоча б одну рослину!');
      return;
    }
    setStep(3);
  };
  
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <div className="text-6xl mb-4">🌱</div>
        <p className="text-earth-brown/70">Завантажую бібліотеку рослин...</p>
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Заголовок кроку */}
      <div className="mb-8">
        <div className="text-sm text-garden-green/70 mb-2">Крок 2 з 3</div>
        <h1 className="text-3xl font-serif text-garden-green mb-2">
          Що хочеш посадити?
        </h1>
        <p className="text-earth-brown/80">
          Обери рослини з нашої бібліотеки. Ми автоматично розрахуємо скільки потрібно кожної культури для твоєї сім'ї.
        </p>
      </div>
      
      {/* Ціль оптимізації */}
      <div className="bg-cream-paper p-6 rounded-2xl mb-6 border-2 border-garden-green/10">
        <label className="block text-garden-green font-semibold mb-3">
          🎯 Що для тебе важливіше?
        </label>
        <p className="text-sm text-earth-brown/70 mb-4">
          Це вплине на те, як ми розставимо рослини на ділянці.
        </p>
        
        <div className="grid grid-cols-3 gap-3">
          {[
            { 
              value: 'yield', 
              label: 'Максимум врожаю', 
              emoji: '📈',
              description: 'Більше плодів з м²'
            },
            { 
              value: 'convenience', 
              label: 'Зручність догляду', 
              emoji: '🚶',
              description: 'Все під рукою'
            },
            { 
              value: 'low_care', 
              label: 'Мінімум догляду', 
              emoji: '☕',
              description: 'Для початківця'
            },
          ].map((goal) => (
            <button
              key={goal.value}
              onClick={() => setOptimizationGoal(goal.value as any)}
              className={`p-4 rounded-xl border-2 transition text-left ${
                optimization_goal === goal.value
                  ? 'border-garden-green bg-garden-green/10'
                  : 'border-garden-green/20 hover:border-garden-green/40'
              }`}
            >
              <div className="text-2xl mb-2">{goal.emoji}</div>
              <div className="font-semibold text-garden-green text-sm mb-1">
                {goal.label}
              </div>
              <div className="text-xs text-earth-brown/60">
                {goal.description}
              </div>
            </button>
          ))}
        </div>
      </div>
      
      {/* Пошук та фільтри */}
      <div className="mb-6">
        {/* Пошук */}
        <div className="relative mb-4">
          <input
            type="text"
            placeholder="🔍 Пошук рослини..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 pl-12 rounded-xl border-2 border-garden-green/20 bg-white focus:border-garden-green focus:outline-none"
          />
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">
            🔍
          </span>
        </div>
        
        {/* Фільтри категорій */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={`px-4 py-2 rounded-full whitespace-nowrap transition ${
                activeCategory === cat.value
                  ? 'bg-garden-green text-white'
                  : 'bg-garden-green/10 text-garden-green hover:bg-garden-green/20'
              }`}
            >
              {cat.emoji} {cat.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Лічильник вибраних */}
      {selected_plants.length > 0 && (
        <div className="bg-dew-blue/10 border-2 border-dew-blue/30 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-garden-green">
                ✅ Вибрано: {selected_plants.length}{' '}
                {selected_plants.length === 1 ? 'рослина' : 
                 selected_plants.length < 5 ? 'рослини' : 'рослин'}
              </div>
              <div className="text-sm text-earth-brown/70 mt-1">
                {selected_plants.map(p => p.name_uk).join(', ')}
              </div>
            </div>
            <button
              onClick={() => usePlannerState.setState({ selected_plants: [] })}
              className="text-terra-cotta hover:text-terra-cotta/80 text-sm font-semibold"
            >
              Очистити
            </button>
          </div>
        </div>
      )}
      
      {/* Галерея рослин */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredPlants.map((plant) => {
          const selected = isSelected(plant.id);
          
          return (
            <button
              key={plant.id}
              onClick={() => handleToggle(plant)}
              className={`relative p-4 rounded-2xl border-2 transition text-left ${
                selected
                  ? 'border-garden-green bg-garden-green/10 shadow-lg shadow-garden-green/20'
                  : 'border-garden-green/20 bg-white hover:border-garden-green/40'
              }`}
            >
              {/* Галочка вибору */}
              {selected && (
                <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-garden-green text-white flex items-center justify-center text-sm">
                  ✓
                </div>
              )}
              
              {/* Іконка рослини */}
              <div className="text-5xl mb-3 text-center">
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
                {plant.icon_slug === 'apple' && '🍎'}
                {!plant.icon_slug && '🌱'}
              </div>
              
              {/* Назва */}
              <div className="font-serif text-garden-green text-center mb-2">
                {plant.name_uk}
              </div>
              
              {/* Швидка інфа */}
              <div className="space-y-1 text-xs text-earth-brown/70">
                <div className="flex items-center gap-1">
                  <span>⏱️</span>
                  <span>{plant.vegetation_days} днів</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>💧</span>
                  <span>Полив кожні {plant.watering_interval_days} дн</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      
      {/* Порожній стан */}
      {filteredPlants.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <p className="text-earth-brown/70">
            Не знайдено рослин за твоїм запитом
          </p>
        </div>
      )}
      
      {/* Навігація */}
      <div className="flex justify-between mt-8">
        <button
          onClick={() => setStep(1)}
          className="px-6 py-3 text-earth-brown/60 hover:text-earth-brown transition"
        >
          ← Назад
        </button>
        <button
          onClick={handleNext}
          disabled={selected_plants.length === 0}
          className="px-8 py-3 bg-garden-green text-white rounded-xl font-semibold hover:bg-garden-green/90 transition shadow-lg shadow-garden-green/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Побачити план →
        </button>
      </div>
    </div>
  );
}