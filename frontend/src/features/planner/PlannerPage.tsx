// frontend/src/features/planner/PlannerPage.tsx
// 🌿 GardenOS v2.0 - Головна сторінка Планувальника саду
// Цей компонент перемикає між трьома кроками майстра

import { usePlannerState } from './usePlannerState';
import { Step1PlotConfig } from './steps/Step1PlotConfig';
import { Step2PlantSelection } from './steps/Step2PlantSelection';
import { Step3PlannerResult } from './steps/Step3PlannerResult';

export function PlannerPage() {
  const { current_step } = usePlannerState();

  return (
    <div className="min-h-screen bg-cream-paper">
      {/* Прогрес-бар зверху */}
      <div className="bg-white border-b border-garden-green/10 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center gap-2">
            {/* Кроки-індикатори */}
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center gap-2 flex-1">
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

      {/* Контент кроку */}
      <div className="py-6">
        {current_step === 1 && <Step1PlotConfig />}
        {current_step === 2 && <Step2PlantSelection />}
        {current_step === 3 && <Step3PlannerResult />}
      </div>
    </div>
  );
}