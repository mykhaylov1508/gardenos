// frontend/src/features/planner/components/SavedPlansList.tsx
import { useEffect, useState } from 'react';
import { useGardenPlans } from '../useGardenPlans';
import { usePlannerState } from '../usePlannerState';
import { Loader2, Trash2, FileText, GitCompareArrows, Check } from 'lucide-react';

interface Props {
  onClose: () => void;
  onOpenCompare: (plans: any[]) => void; // ← НОВЕ: callback для відкриття модалки порівняння
}

export function SavedPlansList({ onClose, onOpenCompare }: Props) {
  const { getSavedPlans, deletePlan, loading } = useGardenPlans();
  const { setPlot, setFamilySize, setOptimizationGoal, setStep, setLoadedPlan, loaded_plan_id } = usePlannerState();
  
  const [plans, setPlans] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  
  // 🆕 Режим порівняння та вибрані плани
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<Set<string>>(new Set());

  useEffect(() => { loadPlans(); }, []);

  async function loadPlans() {
    setRefreshing(true);
    const data = await getSavedPlans();
    setPlans(data || []);
    setRefreshing(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Видалити цей план?')) return;
    await deletePlan(id);
    loadPlans();
    // Якщо видалили вибраний для порівняння — прибираємо з вибраних
    setSelectedForCompare(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  function handleLoad(plan: any) {
    // Відновлюємо стан майстра з збереженого плану
    setPlot({
      width_m: plan.plot_config.width_m,
      length_m: plan.plot_config.length_m,
      has_water_source: !!plan.plot_config.water_source,
      water_source: plan.plot_config.water_source,
      north_direction: plan.plot_config.north_direction,
    });
    setFamilySize(plan.family_size);
    setOptimizationGoal(plan.optimization_goal);
    
    // Відновлюємо вибрані рослини
    const plants = plan.selected_plants.map((p: any) => ({
      library_id: p.library_id,
      name_uk: p.name_uk,
      priority: p.priority,
      custom_quantity: p.quantity,
    }));
    usePlannerState.setState({ selected_plants: plants });
    
    // 🆕 Зберігаємо який план завантажили
    setLoadedPlan(plan.id, plan.name);
    
    // Переходимо одразу до результату
    setStep(3);
    onClose();
  }

  // 🆕 Toggle вибору для порівняння
  function toggleCompare(planId: string) {
    setSelectedForCompare(prev => {
      const next = new Set(prev);
      if (next.has(planId)) {
        next.delete(planId);
      } else {
        if (next.size >= 3) {
          alert('Можна порівнювати максимум 3 плани');
          return prev;
        }
        next.add(planId);
      }
      return next;
    });
  }

  // 🆕 Відкрити модалку порівняння
  function handleOpenCompare() {
    const selectedPlans = plans.filter(p => selectedForCompare.has(p.id));
    if (selectedPlans.length < 2) {
      alert('Вибери мінімум 2 плани для порівняння');
      return;
    }
    onOpenCompare(selectedPlans);
  }

  if (loading || refreshing) {
    return <div className="p-6 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-garden-green" /></div>;
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-garden-green/10 flex justify-between items-center">
        <h2 className="font-serif text-garden-green text-lg">📂 Збережені плани</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
      </div>

      {/* 🆕 Панель керування порівнянням */}
      {plans.length >= 2 && (
        <div className="px-4 py-2 border-b border-garden-green/10 bg-cream-paper/30">
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => {
                setCompareMode(!compareMode);
                setSelectedForCompare(new Set());
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition ${
                compareMode
                  ? 'bg-dew-blue text-white'
                  : 'bg-dew-blue/10 text-dew-blue hover:bg-dew-blue/20'
              }`}
            >
              <GitCompareArrows className="w-4 h-4" />
              {compareMode ? 'Скасувати' : '⚖️ Порівняти'}
            </button>

            {compareMode && selectedForCompare.size > 0 && (
              <button
                onClick={handleOpenCompare}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-garden-green text-white rounded-lg text-sm font-semibold hover:bg-garden-green/90 transition shadow-md"
              >
                Порівняти ({selectedForCompare.size})
              </button>
            )}
          </div>

          {compareMode && (
            <p className="text-xs text-gray-500 mt-2">
              Вибери 2-3 плани для порівняння
            </p>
          )}
        </div>
      )}
      
      {/* Список планів */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {plans.length === 0 ? (
          <p className="text-center text-gray-500 py-8">Ще немає збережених планів</p>
        ) : (
          plans.map(plan => {
            const isCurrentPlan = loaded_plan_id === plan.id;
            const isSelected = selectedForCompare.has(plan.id);

            return (
              <div
                key={plan.id}
                className={`bg-white rounded-xl p-4 border-2 shadow-sm transition ${
                  isCurrentPlan
                    ? 'border-garden-green ring-2 ring-garden-green/20'
                    : isSelected
                    ? 'border-dew-blue'
                    : 'border-garden-green/10'
                }`}
              >
                {/* Верхній рядок: назва + статуси */}
                <div className="flex justify-between items-start mb-2 gap-2">
                  {/* 🆕 Чекбокс (тільки в режимі порівняння) */}
                  {compareMode && (
                    <button
                      onClick={() => toggleCompare(plan.id)}
                      className={`flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition ${
                        isSelected
                          ? 'bg-dew-blue border-dew-blue text-white'
                          : 'border-dew-blue/50 hover:border-dew-blue'
                      }`}
                    >
                      {isSelected && <Check className="w-4 h-4" />}
                    </button>
                  )}

                  <h3 className="font-semibold text-garden-green flex-1">
                    {plan.name}
                    {isCurrentPlan && (
                      <span className="ml-2 text-xs text-garden-green/70">(поточний)</span>
                    )}
                  </h3>
                  
                  <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                    plan.status === 'active' ? 'bg-garden-green/10 text-garden-green' :
                    plan.status === 'template' ? 'bg-dew-blue/10 text-dew-blue' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {plan.status === 'active' ? 'Активний' : plan.status === 'template' ? 'Шаблон' : 'Архів'}
                  </span>
                </div>

                <div className="text-xs text-gray-500 mb-3">
                  📅 {new Date(plan.created_at).toLocaleDateString('uk-UA')} ·
                  📐 {plan.total_area_m2?.toFixed(0)} м² ·
                  📦 {plan.expected_yield_kg?.toFixed(0)} кг
                </div>

                {/* Кнопки дій (сховані в режимі порівняння) */}
                {!compareMode && (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleLoad(plan)} 
                      disabled={isCurrentPlan}
                      className="flex-1 py-1.5 bg-garden-green text-white rounded-lg text-sm font-semibold hover:bg-garden-green/90 transition flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FileText className="w-4 h-4" /> 
                      {isCurrentPlan ? 'Відкрито' : 'Завантажити'}
                    </button>
                    <button 
                      onClick={() => handleDelete(plan.id)} 
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition" 
                      title="Видалити"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}