// frontend/src/features/planner/PlannerPage.tsx

import { useState } from 'react';

import { usePlannerState } from './usePlannerState';

import { Step1PlotConfig } from './steps/Step1PlotConfig';
import { Step2PlantSelection } from './steps/Step2PlantSelection';
import { Step3PlannerResult } from './steps/Step3PlannerResult';

import { SavedPlansList } from './components/SavedPlansList';
import { ComparePlansModal } from './components/ComparePlansModal';

export function PlannerPage() {
  const {
    current_step,
    loaded_plan_name,
    clearLoadedPlan,
  } = usePlannerState();

  const [showSavedPlans, setShowSavedPlans] = useState(false);
  const [comparePlans, setComparePlans] = useState<any[] | null>(null);

  return (
    <div className="min-h-screen bg-cream-paper">
      {/* Header */}
      <div className="bg-white border-b border-garden-green/10 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          {loaded_plan_name && (
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-garden-green/10">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-garden-green animate-pulse" />

                <span className="text-sm text-earth-brown/60">
                  Відкрито план:
                </span>

                <span className="font-semibold text-garden-green">
                  {loaded_plan_name}
                </span>
              </div>

              <button
                onClick={clearLoadedPlan}
                className="text-xs text-earth-brown/50 hover:text-earth-brown transition"
              >
                ✕ Закрити
              </button>
            </div>
          )}

          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setShowSavedPlans(true)}
              className="px-3 py-1.5 bg-dew-blue/10 text-dew-blue rounded-lg text-sm font-semibold hover:bg-dew-blue/20 transition flex items-center gap-1"
            >
              📂 Мої плани
            </button>
          </div>

          <div className="flex items-center gap-2">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className="flex items-center gap-2 flex-1"
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition ${
                    current_step >= step
                      ? 'bg-garden-green text-white'
                      : 'bg-garden-green/20 text-garden-green/60'
                  }`}
                >
                  {current_step > step ? '✓' : step}
                </div>

                <div
                  className={`text-sm hidden sm:block ${
                    current_step >= step
                      ? 'text-garden-green font-semibold'
                      : 'text-earth-brown/50'
                  }`}
                >
                  {step === 1 && 'Ділянка'}
                  {step === 2 && 'Рослини'}
                  {step === 3 && 'Результат'}
                </div>

                {step < 3 && (
                  <div
                    className={`flex-1 h-0.5 ${
                      current_step > step
                        ? 'bg-garden-green'
                        : 'bg-garden-green/20'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="py-6">
        {current_step === 1 && <Step1PlotConfig />}
        {current_step === 2 && <Step2PlantSelection />}
        {current_step === 3 && <Step3PlannerResult />}
      </div>

      {/* Saved plans sidebar */}
      {showSavedPlans && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setShowSavedPlans(false)}
          />

          <div className="relative w-full max-w-sm bg-cream-paper shadow-2xl h-full overflow-hidden">
            <SavedPlansList
              onClose={() => setShowSavedPlans(false)}
              onOpenCompare={(plans) => {
                setComparePlans(plans);
                setShowSavedPlans(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Compare modal */}
      {comparePlans && (
        <ComparePlansModal
          plans={comparePlans}
          onClose={() => setComparePlans(null)}
          onLoadPlan={(plan) => {
            console.log('Selected plan:', plan);

            // Тут повинна бути логіка завантаження плану
            // залежно від реалізації usePlannerState

            setComparePlans(null);
          }}
        />
      )}
    </div>
  );
}