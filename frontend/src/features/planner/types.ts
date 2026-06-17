// frontend/src/features/planner/types.ts
// 🌿 GardenOS v2.0 - Типи для Планувальника саду

/**
 * Головний об'єкт плану саду
 * Зберігає всю інформацію про розкладку рослин на ділянці
 */
export interface GardenPlan {
  id: string;
  user_id: string;
  zone_id?: string; // Якщо прив'язано до конкретної зони
  name: string; // Наприклад, "План на весну 2026"
  
  // Параметри ділянки
  plot: PlotConfig;
  
  // Вибрані користувачем рослини
  selected_plants: SelectedPlant[];
  
  // Результат розміщення
  layout: PlantPlacement[];
  
  // Порожні місця та пропозиції
  empty_spaces: EmptySpace[];
  
  // Метадані
  created_at: string;
  updated_at: string;
}

/**
 * Конфігурація ділянки
 */
export interface PlotConfig {
  width_m: number; // Ширина в метрах
  length_m: number; // Довжина в метрах
  total_area_m2: number; // Загальна площа
  
  // Джерело води (координати в метрах від лівого верхнього кута)
  water_source?: {
    x_m: number;
    y_m: number;
  };
  
  // Орієнтація (для врахування сонця)
  orientation?: 'north' | 'south' | 'east' | 'west';
}

/**
 * Рослина, яку користувач хоче посадити
 */
export interface SelectedPlant {
  plant_id: string; // ID з plant_library
  desired_quantity?: number; // Бажана кількість (якщо не вказано - розрахуємо автоматично)
  priority?: 'high' | 'medium' | 'low'; // Пріоритет розміщення
}

/**
 * Результат розміщення однієї рослини
 */
export interface PlantPlacement {
  plant_id: string;
  variety?: string; // Сорт
  
  // Координати центру рослини (в метрах від лівого верхнього кута)
  x_m: number;
  y_m: number;
  
  // Відстані
  spacing_m: number; // Відстань між рослинами цього виду
  row_spacing_m: number; // Відстань між рядами
  
  // Кількість
  quantity: number;
  
  // Пояснення
  reason: string; // Чому розміщено саме тут
  
  // Метадані з бібліотеки (для зручності)
  plant_name: string;
  category: string;
  vegetation_days: number;
  height_cm?: number; // Для врахування затінення
}

/**
 * Порожнє місце на ділянці
 */
export interface EmptySpace {
  x_m: number;
  y_m: number;
  width_m: number;
  length_m: number;
  area_m2: number;
  
  // Пропозиції що тут посадити
  suggestions: PlantSuggestion[];
}

/**
 * Пропозиція для посадки
 */
export interface PlantSuggestion {
  plant_id: string;
  plant_name: string;
  reason: string; // Чому саме ця рослина
  expected_yield_kg: number; // Очікуваний врожай
  care_level: 'low' | 'medium' | 'high'; // Рівень догляду
  market_value?: 'low' | 'medium' | 'high'; // Ринкова вартість (для продажу)
}

/**
 * Параметри для алгоритму планування
 */
export interface PlannerOptions {
  family_size: number; // Розмір сім'ї
  optimization_goal: 'yield' | 'convenience' | 'aesthetics'; // Ціль оптимізації
  include_pathways: boolean; // Враховувати доріжки
  pathway_width_m: number; // Ширина доріжок
}

/**
 * Результат роботи алгоритму планування
 */
export interface PlannerResult {
  success: boolean;
  placements: PlantPlacement[];
  empty_spaces: EmptySpace[];
  warnings: string[]; // Попередження (наприклад, "Не вистачило місця для всіх томатів")
  suggestions: PlantSuggestion[]; // Загальні пропозиції
}