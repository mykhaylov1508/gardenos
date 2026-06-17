// frontend/src/features/planner/steps/Step3PlannerResult.tsx
// 🌿 GardenOS v2.0 - Крок 3: Результат планування саду
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { usePlannerState } from '../usePlannerState';
import { generateLayout, type LayoutInput, type PlantToLayout } from '../utils/layout';
import { generateSuggestions } from '../utils/suggestions';
import { calculateRequiredPlants } from '../utils/calculations';
import { useGardenPlans } from '../useGardenPlans';

interface PlantLibraryItem {
  id: string;
  name_uk: string;
  category: string;
  icon_slug: string;
  vegetation_days: number;
  watering_interval_days: number;
  good_companions: string[] | null;
  bad_companions: string[] | null;
}

const PLANT_ICONS: Record<string, string> = {
  томат: '🍅', огірок: '🥒', картопля: '🥔', морква: '🥕',
  цибуля: '🧅', часник: '🧄', перець: '🌶️', капуста: '🥬',
  салат: '🥗', базилік: '🌿', кріп: '🌿', петрушка: '🌿',
  шпинат: '🌿', полуниця: '🍓', смородина: '🫐', малина: '🫐',
  кабачок: '🥒', буряк: '🟤', соняшник: '🌻', горох: '🌱',
  квасоля: '🌱', кукурудза: '🌽', редис: '🔴',
};

const BED_COLORS: Record<string, { bg: string; border: string }> = {
  vegetable: { bg: 'rgba(90, 138, 60, 0.3)', border: '#5a8a3c' },
  herb: { bg: 'rgba(45, 74, 39, 0.3)', border: '#2d4a27' },
  berry: { bg: 'rgba(196, 96, 58, 0.3)', border: '#c4603a' },
  tree: { bg: 'rgba(139, 115, 85, 0.3)', border: '#8b7355' },
  fruit: { bg: 'rgba(196, 96, 58, 0.3)', border: '#c4603a' },
  default: { bg: 'rgba(212, 168, 57, 0.3)', border: '#d4a839' },
};

// Середня врожайність (кг з рослини)
const AVG_YIELD_PER_PLANT: Record<string, number> = {
  томат: 4, огірок: 3, картопля: 1.5, морква: 0.3,
  цибуля: 0.2, часник: 0.1, перець: 2, капуста: 3,
  салат: 0.3, базилік: 0.2, кріп: 0.1, петрушка: 0.15,
  кабачок: 5, буряк: 0.4, полуниця: 0.5, смородина: 2,
  малина: 1.5, шпинат: 0.2, соняшник: 0.3, горох: 0.2,
  квасоля: 0.3, кукурудза: 0.5, редис: 0.05,
};

export function Step3PlannerResult() {
    const useGardenPlansHook = useGardenPlans;
  const { plot, selected_plants, family_size, optimization_goal, setStep, reset } =
    usePlannerState();

  // ✅ Чекбокси зберігаються за НАЗВОЮ рослини (не за індексом)
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());

  // Стан для ручного додавання
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualPlantId, setManualPlantId] = useState('');
  const [manualQuantity, setManualQuantity] = useState(5);

  const { data: library = [] } = useQuery({
    queryKey: ['plant_library_for_planner'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plant_library')
        .select('id, name_uk, category, icon_slug, vegetation_days, watering_interval_days, good_companions, bad_companions');
      if (error) throw error;
      return data as PlantLibraryItem[];
    },
  });

  const planResult = useMemo(() => {
    if (library.length === 0 || selected_plants.length === 0) return null;

    const plantsToLayout: PlantToLayout[] = selected_plants
      .map((selected) => {
        const libItem = library.find((l) => l.id === selected.library_id);
        if (!libItem) return null;

        const quantity =
          selected.custom_quantity ||
          calculateRequiredPlants(libItem.name_uk.toLowerCase(), family_size, 4);

        return {
          plant_id: libItem.id,
          name_uk: libItem.name_uk,
          quantity,
          good_companions: libItem.good_companions || [],
          bad_companions: libItem.bad_companions || [],
        };
      })
      .filter((p): p is PlantToLayout => p !== null);

    const water_source = plot.has_water_source && plot.water_source
      ? {
          x_m: (plot.water_source.x_percent / 100) * plot.width_m,
          y_m: (plot.water_source.y_percent / 100) * plot.length_m,
        }
      : undefined;

    const layoutInput: LayoutInput = {
      plot_width_m: plot.width_m,
      plot_length_m: plot.length_m,
      water_source,
      north_direction: plot.north_direction,
      plants: plantsToLayout,
    };

    const layout = generateLayout(layoutInput);

    const suggestions = generateSuggestions(
      layout.total_empty_area_m2,
      layout.beds.map((b) => b.name_uk),
      {
        focus_on: optimization_goal === 'low_care' ? 'low_care' : 'yield',
        family_size,
      }
    );

    return {
      layout,
      suggestions,
      plantsToLayout,
      total_area: plot.width_m * plot.length_m,
    };
  }, [library, selected_plants, plot, family_size, optimization_goal]);

  const handleBack = () => setStep(2);

  const handleReset = () => {
    if (confirm('Скинути всі налаштування і почати новий план?')) {
      reset();
      setStep(1);
    }
  };

  // Toggle чекбокса (по назві, не по індексу — тому не пропадає)
  const toggleSuggestion = (plantName: string) => {
    setSelectedSuggestions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(plantName)) {
        newSet.delete(plantName);
      } else {
        newSet.add(plantName);
      }
      return newSet;
    });
  };

  // Додавання вибраних пропозицій
  const handleAddSelectedSuggestions = () => {
    if (selectedSuggestions.size === 0) return;

    let addedCount = 0;
    for (const plantName of selectedSuggestions) {
      const suggestion = planResult?.suggestions.suggestions.find(
        (s) => s.plant_name === plantName
      );
      if (!suggestion) continue;

      const libraryItem = library.find(
        (p) => p.name_uk.toLowerCase() === plantName.toLowerCase()
      );
      if (!libraryItem) continue;

      const alreadySelected = selected_plants.some(
        (p) => p.library_id === libraryItem.id
      );
      if (alreadySelected) continue;

      usePlannerState.getState().togglePlant({
        library_id: libraryItem.id,
        name_uk: suggestion.plant_name,
        priority: 'nice_to_have',
        custom_quantity: suggestion.quantity,
      });
      addedCount++;
    }

    setSelectedSuggestions(new Set());

    if (addedCount > 0) {
      alert(`✅ Додано ${addedCount} рослин!\nНатисни "← Назад до вибору" щоб побачити їх у списку, а потім "Побачити план →" для перегенерації.`);
    } else {
      alert('⚠️ Всі вибрані рослини вже є в плані');
    }
  };

  // Ручне додавання рослини
  const handleManualAdd = () => {
    if (!manualPlantId) {
      alert('Обери рослину');
      return;
    }

    const libItem = library.find((l) => l.id === manualPlantId);
    if (!libItem) return;

    const alreadySelected = selected_plants.some(
      (p) => p.library_id === libItem.id
    );

    if (alreadySelected) {
      usePlannerState.getState().setPlantQuantity(libItem.id, manualQuantity);
      alert(`✅ Оновлено кількість ${libItem.name_uk} до ${manualQuantity} шт`);
    } else {
      usePlannerState.getState().togglePlant({
        library_id: libItem.id,
        name_uk: libItem.name_uk,
        priority: 'must_have',
        custom_quantity: manualQuantity,
      });
      alert(`✅ ${libItem.name_uk} (${manualQuantity} шт) додано!\nНатисни "← Назад до вибору" для перегенерації.`);
    }

    setShowManualAdd(false);
    setManualPlantId('');
    setManualQuantity(5);
  };

  if (!planResult) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <div className="text-6xl mb-4 animate-bounce">🌱</div>
        <p className="text-earth-brown/70">Готую твій план саду...</p>
      </div>
    );
  }

  const { layout, suggestions, total_area } = planResult;

  // Загальний врожай
  const totalYield = layout.beds.reduce((sum, bed) => {
    const yield_per_plant = AVG_YIELD_PER_PLANT[bed.name_uk.toLowerCase()] || 2;
    return sum + (bed.planted_quantity * yield_per_plant);
  }, 0);

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Заголовок */}
      <div className="mb-8">
        <div className="text-sm text-garden-green/70 mb-2">Крок 3 з 3</div>
        <h1 className="text-3xl font-serif text-garden-green mb-2">
          🌿 Твій план саду готовий!
        </h1>
        <p className="text-earth-brown/80">
          Ось як найкраще розмістити вибрані рослини на твоїй ділянці.
        </p>
      </div>

      {/* Зведення */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        <div className="bg-cream-paper p-3 rounded-2xl border-2 border-garden-green/10">
          <div className="text-xs text-earth-brown/60 mb-1">Площа</div>
          <div className="text-xl font-serif text-garden-green">
            {total_area.toFixed(0)} м²
          </div>
        </div>
        <div className="bg-cream-paper p-3 rounded-2xl border-2 border-garden-green/10">
          <div className="text-xs text-earth-brown/60 mb-1">Використано</div>
          <div className="text-xl font-serif text-garden-green">
            {layout.usage_percent}%
          </div>
        </div>
        <div className="bg-cream-paper p-3 rounded-2xl border-2 border-garden-green/10">
          <div className="text-xs text-earth-brown/60 mb-1">🟢 Моїх</div>
          <div className="text-xl font-serif text-garden-green">
            {layout.beds.length}
          </div>
        </div>
        <div className="bg-cream-paper p-3 rounded-2xl border-2 border-garden-green/10">
          <div className="text-xs text-earth-brown/60 mb-1">Вільно</div>
          <div className="text-xl font-serif text-garden-green">
            {layout.total_empty_area_m2.toFixed(1)} м²
          </div>
        </div>
        <div className="bg-cream-paper p-3 rounded-2xl border-2 border-garden-green/10">
          <div className="text-xs text-earth-brown/60 mb-1">📦 Врожай</div>
          <div className="text-xl font-serif text-garden-green">
            {totalYield.toFixed(0)} кг
          </div>
        </div>
      </div>

      {/* Попередження */}
      {layout.warnings.length > 0 && (
        <div className="bg-terra-cotta/10 border-2 border-terra-cotta/30 rounded-2xl p-4 mb-6">
          <div className="font-semibold text-terra-cotta mb-2">⚠️ Увага:</div>
          <ul className="space-y-1 text-sm text-earth-brown">
            {layout.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Карта */}
        <div className="bg-cream-paper p-6 rounded-2xl border-2 border-garden-green/10">
          <h2 className="font-serif text-garden-green text-xl mb-4">
            🗺️ Схема розміщення
          </h2>
          <PlanMap
            width_m={plot.width_m}
            length_m={plot.length_m}
            beds={layout.beds}
            suggestions={suggestions.suggestions}
            water_source={plot.water_source}
            north_direction={plot.north_direction}
            library={library}
          />
        </div>

        {/* Список грядок */}
        <div className="bg-cream-paper p-6 rounded-2xl border-2 border-garden-green/10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-garden-green text-xl">
              📋 Мої грядки
            </h2>
            <button
              onClick={() => setShowManualAdd(!showManualAdd)}
              className="px-3 py-1 bg-garden-green text-white rounded-lg text-sm font-semibold hover:bg-garden-green/90 transition"
            >
              {showManualAdd ? '✕ Закрити' : '➕ Додати вручну'}
            </button>
          </div>

          {/* Форма ручного додавання */}
          {showManualAdd && (
            <div className="bg-garden-green/10 border-2 border-garden-green/30 rounded-xl p-4 mb-4">
              <h3 className="font-semibold text-garden-green mb-3">
                🌱 Додати рослину вручну
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-earth-brown/70 mb-1 block">
                    Обери культуру
                  </label>
                  <select
                    value={manualPlantId}
                    onChange={(e) => setManualPlantId(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-garden-green/20 rounded-lg bg-white focus:border-garden-green focus:outline-none"
                  >
                    <option value="">-- Вибери --</option>
                    {library.map((lib) => (
                      <option key={lib.id} value={lib.id}>
                        {PLANT_ICONS[lib.name_uk.toLowerCase()] || '🌱'} {lib.name_uk}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-earth-brown/70 mb-1 block">
                    Кількість (шт)
                  </label>
                  <input
                    type="number"
                    value={manualQuantity}
                    onChange={(e) => setManualQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    min={1}
                    max={100}
                    className="w-full px-3 py-2 border-2 border-garden-green/20 rounded-lg bg-white focus:border-garden-green focus:outline-none"
                  />
                </div>
                <button
                  onClick={handleManualAdd}
                  className="w-full py-2 bg-garden-green text-white rounded-lg font-semibold hover:bg-garden-green/90 transition"
                >
                  ➕ Додати до плану
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {layout.beds.map((bed, idx) => {
              const icon = PLANT_ICONS[bed.name_uk.toLowerCase()] || '🌱';
              const yield_per_plant = AVG_YIELD_PER_PLANT[bed.name_uk.toLowerCase()] || 2;
              const expected_yield = (bed.planted_quantity * yield_per_plant).toFixed(1);

              return (
                <div
                  key={idx}
                  className="p-3 bg-white rounded-xl border-2 border-garden-green/30"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-2 h-2 rounded-full bg-garden-green"></div>
                    <div className="text-2xl">{icon}</div>
                    <div className="flex-1">
                      <div className="font-semibold text-garden-green">
                        {bed.name_uk}
                      </div>
                      <div className="text-xs text-earth-brown/60">
                        {bed.planted_quantity} шт · {bed.width_m}×{bed.length_m} м · 📦 {expected_yield} кг
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-earth-brown/80 bg-garden-green/5 p-2 rounded">
                    💡 {bed.placement_reason}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Пропозиції для порожнього місця */}
      {suggestions.suggestions.length > 0 && (
        <div className="bg-dew-blue/10 border-2 border-dew-blue/30 rounded-2xl p-6 mb-8">
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <h2 className="font-serif text-garden-green text-xl">
              💡 Запропоновані культури
            </h2>
            {selectedSuggestions.size > 0 && (
              <button
                onClick={handleAddSelectedSuggestions}
                className="px-4 py-2 bg-dew-blue text-white rounded-lg text-sm font-semibold hover:bg-dew-blue/90 transition shadow-md"
              >
                ➕ Додати вибране ({selectedSuggestions.size}) до моїх
              </button>
            )}
          </div>
          <p className="text-sm text-earth-brown/70 mb-4">
            {suggestions.explanation}
          </p>

          <div className="grid md:grid-cols-2 gap-3">
            {suggestions.suggestions.map((suggestion) => {
              const icon = PLANT_ICONS[suggestion.plant_name.toLowerCase()] || '🌱';
              const isSelected = selectedSuggestions.has(suggestion.plant_name);

              return (
                <div
                  key={suggestion.plant_name}
                  className={`p-4 bg-white rounded-xl border-2 transition cursor-pointer ${
                    isSelected
                      ? 'border-dew-blue shadow-md bg-dew-blue/5'
                      : 'border-dew-blue/30 hover:border-dew-blue/60'
                  }`}
                  onClick={() => toggleSuggestion(suggestion.plant_name)}
                >
                  <div className="flex items-start gap-3 mb-2">
                    <div
                      className={`flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition ${
                        isSelected
                          ? 'bg-dew-blue border-dew-blue text-white'
                          : 'border-dew-blue/50'
                      }`}
                    >
                      {isSelected && '✓'}
                    </div>

                    <div className="text-3xl">{icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold text-garden-green">
                          {suggestion.plant_name}
                        </div>
                        <span className="text-xs px-2 py-0.5 bg-dew-blue/20 text-dew-blue rounded-full">
                          запропоновано
                        </span>
                      </div>
                      <div className="text-xs text-earth-brown/60">
                        {suggestion.area_m2} м² · {suggestion.quantity} шт
                      </div>
                    </div>
                  </div>

                  <div className="text-sm text-earth-brown/80 space-y-1">
                    <div>
                      📦 Врожай:{' '}
                      <span className="font-semibold">
                        {suggestion.expected_yield_kg} кг
                      </span>
                    </div>
                    {suggestion.potential_income > 0 && (
                      <div>
                        💰 Дохід:{' '}
                        <span className="font-semibold">
                          {suggestion.potential_income} грн
                        </span>
                      </div>
                    )}
                    <div className="text-xs text-earth-brown/60 pt-1">
                      {suggestion.reasons[0]}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {suggestions.total_potential_yield_kg > 0 && (
            <div className="mt-4 p-3 bg-dew-blue/10 rounded-xl text-sm">
              📊 <strong>Загальний потенціал:</strong>{' '}
              {suggestions.total_potential_yield_kg.toFixed(1)} кг врожаю
              {suggestions.total_potential_income > 0 &&
                ` · ${suggestions.total_potential_income} грн доходу`}
            </div>
          )}
        </div>
      )}

      {/* Кнопки дій */}
        <div className="flex flex-wrap gap-4 justify-between">
        <button
            onClick={handleBack}
            className="px-6 py-3 bg-earth-brown/10 text-earth-brown rounded-xl font-semibold hover:bg-earth-brown/20 transition flex items-center gap-2"
        >
            ← Назад до вибору рослин
        </button>

        <div className="flex gap-3">
            <button
            onClick={handleReset}
            className="px-6 py-3 border-2 border-earth-brown/20 text-earth-brown rounded-xl hover:bg-earth-brown/5 transition"
            >
            🔄 Новий план
            </button>
            
            {/* 💾 Зберегти як шаблон */}
            <button
            onClick={async () => {
                const planName = prompt('Назва плану:', `План ${new Date().toLocaleDateString('uk-UA')}`);
                if (!planName) return;

                const { applyPlanToGarden } = await import('../useGardenPlans');
                const { applyPlanToGarden: applyFn } = useGardenPlansHook();
                
                // Просто зберігаємо як шаблон (без застосування)
                const { savePlan } = useGardenPlansHook();
                const result = await savePlan({
                name: planName,
                plot_config: {
                    width_m: plot.width_m,
                    length_m: plot.length_m,
                    water_source: plot.water_source,
                    north_direction: plot.north_direction,
                },
                family_size,
                optimization_goal,
                selected_plants: selected_plants.map(p => ({
                    library_id: p.library_id,
                    name_uk: p.name_uk,
                    quantity: p.custom_quantity || 0,
                    priority: p.priority,
                })),
                layout,
                suggestions,
                total_area_m2: total_area,
                used_area_m2: layout.total_used_area_m2,
                empty_area_m2: layout.total_empty_area_m2,
                expected_yield_kg: totalYield,
                });

                if (result.success) {
                alert(`✅ План "${planName}" збережено як шаблон!`);
                } else {
                alert(`❌ Помилка: ${result.error}`);
                }
            }}
            className="px-6 py-3 bg-dew-blue text-white rounded-xl font-semibold hover:bg-dew-blue/90 transition shadow-md"
            >
            💾 Зберегти як шаблон
            </button>

            {/* 🚀 Застосувати до городу */}
            <button
            onClick={async () => {
                const planName = prompt(
                'Назва плану (буде застосовано до городу):', 
                `План ${new Date().toLocaleDateString('uk-UA')}`
                );
                if (!planName) return;

                const confirm = window.confirm(
                `🚀 Застосувати план "${planName}" до городу?\n\n` +
                `Це створить:\n` +
                `• ${layout.beds.length} зон (грядок)\n` +
                `• ${layout.beds.length} рослин в городі\n` +
                `• ${layout.beds.length} задач "Посадити"\n\n` +
                `Рослини отримають статус "planned" (заплановані).\n` +
                `Продовжити?`
                );
                if (!confirm) return;

                const { applyPlanToGarden } = useGardenPlansHook();
                const result = await applyPlanToGarden({
                name: planName,
                plot_config: {
                    width_m: plot.width_m,
                    length_m: plot.length_m,
                    water_source: plot.water_source,
                    north_direction: plot.north_direction,
                },
                family_size,
                optimization_goal,
                selected_plants: selected_plants.map(p => ({
                    library_id: p.library_id,
                    name_uk: p.name_uk,
                    quantity: p.custom_quantity || 0,
                    priority: p.priority,
                })),
                layout,
                suggestions,
                total_area_m2: total_area,
                used_area_m2: layout.total_used_area_m2,
                empty_area_m2: layout.total_empty_area_m2,
                expected_yield_kg: totalYield,
                });

                if (result.success) {
                alert(
                    `🎉 План успішно застосовано!\n\n` +
                    `✅ Створено зон: ${result.zones_created}\n` +
                    `✅ Створено рослин: ${result.plants_created}\n` +
                    `✅ Створено задач: ${result.tasks_created}\n\n` +
                    `Тепер відкрий "Город" або "Задачі" щоб побачити результати!`
                );
                } else {
                alert(
                    `⚠️ Застосовано з помилками:\n\n` +
                    `Зон: ${result.zones_created}\n` +
                    `Рослин: ${result.plants_created}\n` +
                    `Задач: ${result.tasks_created}\n\n` +
                    `Помилки:\n${result.errors.join('\n')}`
                );
                }
            }}
            className="px-8 py-3 bg-garden-green text-white rounded-xl font-semibold hover:bg-garden-green/90 transition shadow-lg shadow-garden-green/20"
            >
            🚀 Застосувати до городу
            </button>
        </div>
        </div>
    </div>
  );
}

interface PlanMapProps {
  width_m: number;
  length_m: number;
  beds: any[];
  suggestions: any[];
  water_source?: { x_percent: number; y_percent: number };
  north_direction: string;
  library: PlantLibraryItem[];
}

function PlanMap({
  width_m,
  length_m,
  beds,
  suggestions,
  water_source,
  north_direction,
  library,
}: PlanMapProps) {
  const SVG_WIDTH = 600;
  const SVG_HEIGHT = 400;
  const scale_x = SVG_WIDTH / width_m;
  const scale_y = SVG_HEIGHT / length_m;

  // Розміщуємо пропозиції в нижній частині карти
  const suggestionsWithCoords = useMemo(() => {
    if (!suggestions || suggestions.length === 0) return [];

    const result: any[] = [];
    const availableWidth = SVG_WIDTH * 0.9;
    const startX = SVG_WIDTH * 0.05;
    const y = SVG_HEIGHT * 0.75;
    const itemWidth = availableWidth / Math.max(suggestions.length, 1);

    suggestions.forEach((suggestion, idx) => {
      const area = suggestion.area_m2;
      const side = Math.sqrt(area);
      const w_m = Math.min(side, width_m * 0.25);
      const h_m = area / w_m;

      result.push({
        ...suggestion,
        x_px: startX + idx * itemWidth + (itemWidth - w_m * scale_x) / 2,
        y_px: y,
        w_px: w_m * scale_x,
        h_px: h_m * scale_y,
      });
    });

    return result;
  }, [suggestions, width_m, length_m, scale_x, scale_y]);

  const northPosition = {
    top: { x: SVG_WIDTH / 2, y: 20 },
    bottom: { x: SVG_WIDTH / 2, y: SVG_HEIGHT - 20 },
    left: { x: 20, y: SVG_HEIGHT / 2 },
    right: { x: SVG_WIDTH - 20, y: SVG_HEIGHT / 2 },
  }[north_direction] || { x: SVG_WIDTH / 2, y: 20 };

  return (
    <div className="bg-white rounded-xl p-2 border border-garden-green/20">
      <svg
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        className="w-full h-auto"
        style={{ maxHeight: '400px' }}
      >
        <rect x={0} y={0} width={SVG_WIDTH} height={SVG_HEIGHT} fill="#f5f0e8" stroke="#2d4a27" strokeWidth={2} />

        {Array.from({ length: Math.floor(width_m / 5) }).map((_, i) => (
          <line
            key={`v-${i}`}
            x1={(i + 1) * 5 * scale_x} y1={0}
            x2={(i + 1) * 5 * scale_x} y2={SVG_HEIGHT}
            stroke="#2d4a27" strokeOpacity={0.1} strokeDasharray="2,2"
          />
        ))}
        {Array.from({ length: Math.floor(length_m / 5) }).map((_, i) => (
          <line
            key={`h-${i}`}
            x1={0} y1={(i + 1) * 5 * scale_y}
            x2={SVG_WIDTH} y2={(i + 1) * 5 * scale_y}
            stroke="#2d4a27" strokeOpacity={0.1} strokeDasharray="2,2"
          />
        ))}

        {water_source && (
          <g>
            <circle
              cx={(water_source.x_percent / 100) * SVG_WIDTH}
              cy={(water_source.y_percent / 100) * SVG_HEIGHT}
              r={15} fill="#4a7fa5" fillOpacity={0.3}
              stroke="#4a7fa5" strokeWidth={2}
            />
            <text
              x={(water_source.x_percent / 100) * SVG_WIDTH}
              y={(water_source.y_percent / 100) * SVG_HEIGHT + 5}
              textAnchor="middle" fontSize={20}
            >
              💧
            </text>
          </g>
        )}

        {/* Грядки (МОЇ) — суцільні */}
        {beds.map((bed, idx) => {
          const libItem = library.find((l) => l.id === bed.plant_id);
          const colors = BED_COLORS[libItem?.category || 'default'] || BED_COLORS.default;
          const icon = PLANT_ICONS[bed.name_uk.toLowerCase()] || '🌱';

          const x = bed.x_m * scale_x;
          const y = bed.y_m * scale_y;
          const w = bed.width_m * scale_x;
          const h = bed.length_m * scale_y;

          return (
            <g key={`bed-${idx}`}>
              <rect
                x={x} y={y} width={w} height={h}
                fill={colors.bg}
                stroke={colors.border}
                strokeWidth={2}
                rx={4}
              />
              {w > 40 && h > 30 && (
                <>
                  <text x={x + w / 2} y={y + h / 2 - 5} textAnchor="middle" fontSize={20}>
                    {icon}
                  </text>
                  <text
                    x={x + w / 2} y={y + h / 2 + 15}
                    textAnchor="middle" fontSize={11}
                    fill="#2d4a27" fontWeight="600"
                  >
                    {bed.name_uk}
                  </text>
                </>
              )}
            </g>
          );
        })}

        {/* ПРОПОЗИЦІЇ — пунктирні, блакитні */}
        {suggestionsWithCoords.map((suggestion, idx) => {
          const icon = PLANT_ICONS[suggestion.plant_name.toLowerCase()] || '🌱';
          const w = suggestion.w_px;
          const h = suggestion.h_px;

          return (
            <g key={`suggestion-${idx}`}>
              <rect
                x={suggestion.x_px}
                y={suggestion.y_px}
                width={w} height={h}
                fill="rgba(74, 127, 165, 0.15)"
                stroke="#4a7fa5"
                strokeWidth={2}
                strokeDasharray="6,3"
                rx={4}
              />
              {w > 50 && h > 25 && (
                <>
                  <text
                    x={suggestion.x_px + w / 2}
                    y={suggestion.y_px + h / 2 - 3}
                    textAnchor="middle" fontSize={16}
                  >
                    {icon}
                  </text>
                  <text
                    x={suggestion.x_px + w / 2}
                    y={suggestion.y_px + h / 2 + 12}
                    textAnchor="middle" fontSize={10}
                    fill="#4a7fa5" fontWeight="600"
                  >
                    {suggestion.plant_name}?
                  </text>
                </>
              )}
            </g>
          );
        })}

        <g>
          <text x={northPosition.x} y={northPosition.y} textAnchor="middle" fontSize={12} fill="#2d4a27" fontWeight="bold">
            N
          </text>
          <text x={northPosition.x} y={northPosition.y + 15} textAnchor="middle" fontSize={14}>
            🧭
          </text>
        </g>

        <text x={SVG_WIDTH / 2} y={SVG_HEIGHT - 5} textAnchor="middle" fontSize={10} fill="#2d4a27" fillOpacity={0.6}>
          {width_m} м
        </text>
        <text
          x={5} y={SVG_HEIGHT / 2}
          textAnchor="start" fontSize={10}
          fill="#2d4a27" fillOpacity={0.6}
          transform={`rotate(-90 5 ${SVG_HEIGHT / 2})`}
        >
          {length_m} м
        </text>
      </svg>

      {/* Легенда */}
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-earth-brown/70 justify-center">
        <div className="flex items-center gap-1">
          <span className="w-4 h-3 rounded border-2" style={{ background: BED_COLORS.vegetable.bg, borderColor: BED_COLORS.vegetable.border }}></span>
          Мої грядки
        </div>
        <div className="flex items-center gap-1">
          <span className="w-4 h-3 rounded border-2 border-dashed" style={{ background: 'rgba(74, 127, 165, 0.15)', borderColor: '#4a7fa5' }}></span>
          Запропоновані
        </div>
        {water_source && <div className="flex items-center gap-1">💧 Вода</div>}
      </div>
    </div>
  );
}