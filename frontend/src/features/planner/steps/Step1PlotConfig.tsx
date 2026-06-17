// frontend/src/features/planner/steps/Step1PlotConfig.tsx
// 🌿 GardenOS v2.0 - Крок 1: Налаштування ділянки

import { useState } from 'react';
import { usePlannerState, type PlotData } from '../usePlannerState';

export function Step1PlotConfig() {
  const { plot, setPlot, setStep, family_size, setFamilySize } = usePlannerState();
  
  // Локальний стан для інтерактивної карти (щоб показати де вода і північ)
  const [localPlot, setLocalPlot] = useState<PlotData>(plot);
  
  // Обробка кліку по карті для встановлення джерела води
  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!localPlot.has_water_source) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x_percent = ((e.clientX - rect.left) / rect.width) * 100;
    const y_percent = ((e.clientY - rect.top) / rect.height) * 100;
    
    setLocalPlot({
      ...localPlot,
      water_source: { x_percent, y_percent },
    });
  };
  
  // Збереження та перехід до наступного кроку
  const handleNext = () => {
    setPlot(localPlot);
    setStep(2);
  };
  
  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Заголовок кроку */}
      <div className="mb-8">
        <div className="text-sm text-garden-green/70 mb-2">Крок 1 з 3</div>
        <h1 className="text-3xl font-serif text-garden-green mb-2">
          Розкажи про свою ділянку
        </h1>
        <p className="text-earth-brown/80">
          Чим точніше ти опишеш свій город, тим кращий план ми складемо.
        </p>
      </div>
      
      {/* Розмір сім'ї */}
      <div className="bg-cream-paper p-6 rounded-2xl mb-6 border-2 border-garden-green/10">
        <label className="block text-garden-green font-semibold mb-3">
          👨‍👩‍👧‍👦 Скільки людей у твоїй сім'ї?
        </label>
        <p className="text-sm text-earth-brown/70 mb-4">
          Від цього залежить скільки кожної культури тобі потрібно посадити.
        </p>
        
        <div className="flex items-center gap-4">
          <button
            onClick={() => setFamilySize(Math.max(1, family_size - 1))}
            className="w-10 h-10 rounded-full bg-terra-cotta/10 text-terra-cotta font-bold text-xl hover:bg-terra-cotta/20 transition"
          >
            −
          </button>
          <div className="text-4xl font-serif text-garden-green w-16 text-center">
            {family_size}
          </div>
          <button
            onClick={() => setFamilySize(Math.min(10, family_size + 1))}
            className="w-10 h-10 rounded-full bg-garden-green/10 text-garden-green font-bold text-xl hover:bg-garden-green/20 transition"
          >
            +
          </button>
        </div>
      </div>
      
      {/* Розміри ділянки */}
      <div className="bg-cream-paper p-6 rounded-2xl mb-6 border-2 border-garden-green/10">
        <label className="block text-garden-green font-semibold mb-3">
          📏 Розміри городу (метри)
        </label>
        <p className="text-sm text-earth-brown/70 mb-4">
          Ширина × довжина. Орієнтовно, можна поміняти потім.
        </p>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-earth-brown/60 mb-1 block">Ширина</label>
            <input
              type="number"
              value={localPlot.width_m}
              onChange={(e) =>
                setLocalPlot({ ...localPlot, width_m: Number(e.target.value) })
              }
              className="w-full px-4 py-3 rounded-lg border-2 border-garden-green/20 bg-white focus:border-garden-green focus:outline-none"
              min={1}
              max={100}
            />
            <div className="text-xs text-earth-brown/50 mt-1">метрів</div>
          </div>
          
          <div>
            <label className="text-sm text-earth-brown/60 mb-1 block">Довжина</label>
            <input
              type="number"
              value={localPlot.length_m}
              onChange={(e) =>
                setLocalPlot({ ...localPlot, length_m: Number(e.target.value) })
              }
              className="w-full px-4 py-3 rounded-lg border-2 border-garden-green/20 bg-white focus:border-garden-green focus:outline-none"
              min={1}
              max={100}
            />
            <div className="text-xs text-earth-brown/50 mt-1">метрів</div>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-garden-green/10">
          <div className="text-sm text-garden-green/80">
            📐 Загальна площа:{' '}
            <span className="font-semibold">
              {(localPlot.width_m * localPlot.length_m).toFixed(0)} м²
            </span>
          </div>
        </div>
      </div>
      
      {/* Орієнтація (де північ) */}
      <div className="bg-cream-paper p-6 rounded-2xl mb-6 border-2 border-garden-green/10">
        <label className="block text-garden-green font-semibold mb-3">
          🧭 Де знаходиться північ?
        </label>
        <p className="text-sm text-earth-brown/70 mb-4">
          Це важливо для розміщення високих рослин (щоб не затінювали інших).
        </p>
        
        <div className="grid grid-cols-4 gap-2">
          {[
            { value: 'top', label: 'Зверху', emoji: '⬆️' },
            { value: 'right', label: 'Справа', emoji: '➡️' },
            { value: 'bottom', label: 'Знизу', emoji: '⬇️' },
            { value: 'left', label: 'Зліва', emoji: '⬅️' },
          ].map((dir) => (
            <button
              key={dir.value}
              onClick={() =>
                setLocalPlot({
                  ...localPlot,
                  north_direction: dir.value as PlotData['north_direction'],
                })
              }
              className={`p-3 rounded-lg border-2 transition ${
                localPlot.north_direction === dir.value
                  ? 'border-garden-green bg-garden-green/10 text-garden-green'
                  : 'border-garden-green/20 text-earth-brown/70 hover:border-garden-green/40'
              }`}
            >
              <div className="text-2xl mb-1">{dir.emoji}</div>
              <div className="text-xs">{dir.label}</div>
            </button>
          ))}
        </div>
      </div>
      
      {/* Джерело води */}
      <div className="bg-cream-paper p-6 rounded-2xl mb-8 border-2 border-garden-green/10">
        <div className="flex items-center justify-between mb-3">
          <label className="block text-garden-green font-semibold">
            💧 Джерело води на ділянці
          </label>
          <button
            onClick={() =>
              setLocalPlot({
                ...localPlot,
                has_water_source: !localPlot.has_water_source,
                water_source: localPlot.has_water_source ? undefined : { x_percent: 50, y_percent: 50 },
              })
            }
            className={`relative w-14 h-7 rounded-full transition ${
              localPlot.has_water_source ? 'bg-dew-blue' : 'bg-earth-brown/30'
            }`}
          >
            <div
              className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${
                localPlot.has_water_source ? 'translate-x-8' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        
        {localPlot.has_water_source && (
          <>
            <p className="text-sm text-earth-brown/70 mb-4">
              Тицяй на карту щоб показати де знаходиться кран / колодязь / бочка.
              Вологолюбні рослини (огірки, салат) будуть розміщені ближче до води.
            </p>
            
            <div
              onClick={handleMapClick}
              className="relative w-full h-64 bg-gradient-to-br from-garden-green/10 to-cream-earth/20 rounded-xl border-2 border-dashed border-garden-green/30 cursor-pointer overflow-hidden hover:border-garden-green/50 transition"
            >
              {/* Індикатор півночі */}
              <div className={`absolute text-2xl ${
                localPlot.north_direction === 'top' ? 'top-2 left-1/2 -translate-x-1/2' :
                localPlot.north_direction === 'bottom' ? 'bottom-2 left-1/2 -translate-x-1/2' :
                localPlot.north_direction === 'left' ? 'left-2 top-1/2 -translate-y-1/2' :
                'right-2 top-1/2 -translate-y-1/2'
              }`}>
                🧭
              </div>
              
              {/* Маркер води */}
              {localPlot.water_source && (
                <div
                  className="absolute w-8 h-8 -translate-x-1/2 -translate-y-1/2 text-3xl animate-pulse"
                  style={{
                    left: `${localPlot.water_source.x_percent}%`,
                    top: `${localPlot.water_source.y_percent}%`,
                  }}
                >
                  💧
                </div>
              )}
              
              {/* Підказка */}
              <div className="absolute bottom-2 right-2 text-xs text-garden-green/60 bg-white/70 px-2 py-1 rounded">
                {localPlot.width_m} × {localPlot.length_m} м
              </div>
            </div>
          </>
        )}
      </div>
      
      {/* Кнопка "Далі" */}
      <div className="flex justify-between">
        <button
          onClick={() => {/* Можна додати "Зберегти та вийти" */}}
          className="px-6 py-3 text-earth-brown/60 hover:text-earth-brown transition"
        >
          Скасувати
        </button>
        <button
          onClick={handleNext}
          className="px-8 py-3 bg-garden-green text-white rounded-xl font-semibold hover:bg-garden-green/90 transition shadow-lg shadow-garden-green/20"
        >
          Далі — вибір рослин →
        </button>
      </div>
    </div>
  );
}