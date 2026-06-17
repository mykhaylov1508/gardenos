// frontend/src/features/planner/usePlannerState.ts
// 🌿 GardenOS v2.0 - Стан майстра планування
// Зберігає всі дані між кроками, щоб користувач міг повернутись назад

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Дані про ділянку (Крок 1)
 */
export interface PlotData {
  width_m: number;
  length_m: number;
  has_water_source: boolean;
  water_source?: { x_percent: number; y_percent: number }; // % від розміру
  north_direction: 'top' | 'right' | 'bottom' | 'left';
}

/**
 * Дані про вибрані рослини (Крок 2)
 */
export interface SelectedPlantData {
  library_id: string;
  name_uk: string;
  custom_quantity?: number; // Якщо користувач вказав сам
  priority: 'must_have' | 'nice_to_have'; // Обов'язкова / бажана
}

/**
 * Головна форма стану майстра
 */
interface PlannerState {
  // Поточний крок (1, 2 або 3)
  current_step: 1 | 2 | 3;
  
  // Дані кроків
  family_size: number;
  plot: PlotData;
  selected_plants: SelectedPlantData[];
  
  // Оптимізаційна ціль (що для тебе важливіше)
  optimization_goal: 'yield' | 'convenience' | 'low_care';
  
  // Дії
  setStep: (step: 1 | 2 | 3) => void;
  setFamilySize: (size: number) => void;
  setPlot: (plot: PlotData) => void;
  togglePlant: (plant: SelectedPlantData) => void;
  setPlantQuantity: (library_id: string, quantity: number) => void;
  setOptimizationGoal: (goal: 'yield' | 'convenience' | 'low_care') => void;
  reset: () => void;
}

/**
 * Початкові значення (щоб скидати форму)
 */
const INITIAL_STATE = {
  current_step: 1 as const,
  family_size: 2,
  plot: {
    width_m: 10,
    length_m: 20,
    has_water_source: false,
    north_direction: 'top' as const,
  },
  selected_plants: [],
  optimization_goal: 'yield' as const,
};

/**
 * Zustand store з автозбереженням у localStorage
 * 
 * Чому persist? Щоб якщо користувач випадково закриє сторінку —
 * його дані не пропадуть, і він зможе продовжити планування
 */
export const usePlannerState = create<PlannerState>()(
  persist(
    (set) => ({
      ...INITIAL_STATE,
      
      setStep: (step) => set({ current_step: step }),
      
      setFamilySize: (size) => set({ family_size: Math.max(1, Math.min(10, size)) }),
      
      setPlot: (plot) => set({ plot }),
      
      togglePlant: (plant) =>
        set((state) => {
          const exists = state.selected_plants.some(
            (p) => p.library_id === plant.library_id
          );
          
          if (exists) {
            return {
              selected_plants: state.selected_plants.filter(
                (p) => p.library_id !== plant.library_id
              ),
            };
          } else {
            return {
              selected_plants: [...state.selected_plants, plant],
            };
          }
        }),
      
      setPlantQuantity: (library_id, quantity) =>
        set((state) => ({
          selected_plants: state.selected_plants.map((p) =>
            p.library_id === library_id ? { ...p, custom_quantity: quantity } : p
          ),
        })),
      
      setOptimizationGoal: (goal) => set({ optimization_goal: goal }),
      
      reset: () => set(INITIAL_STATE),
    }),
    {
      name: 'gardenos-planner-draft', // Ключ у localStorage
    }
  )
);