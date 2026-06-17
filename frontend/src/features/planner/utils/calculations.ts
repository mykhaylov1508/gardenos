// frontend/src/features/planner/utils/calculations.ts
// 🌿 GardenOS v2.0 - Розрахунки для Планувальника

import { PERSONAL_NEEDS_KG, PLANT_SPACING } from '../constants';

/**
 * Розраховує необхідну кількість рослин для сім'ї
 * 
 * @param plant_name - Назва рослини (наприклад, "томат")
 * @param family_size - Кількість людей у сім'ї
 * @param yield_per_plant_kg - Середній врожай з однієї рослини (кг)
 * @returns Необхідна кількість рослин (округлена вгору)
 * 
 * @example
 * // Сім'я з 4 людей, томат дає 4 кг з куща
 * calculateRequiredPlants('томат', 4, 4.0); // → 25 кущів
 */
export function calculateRequiredPlants(
  plant_name: string,
  family_size: number,
  yield_per_plant_kg: number
): number {
  // Знаходимо потребу однієї людини в цій культурі (кг на сезон)
  const personal_need_kg = PERSONAL_NEEDS_KG[plant_name as keyof typeof PERSONAL_NEEDS_KG];
  
  if (!personal_need_kg) {
    // Якщо культура не в списку стандартних потреб - використовуємо загальне правило
    // Припускаємо 5 кг на людину для рідкісних культур
    const estimated_need = family_size * 5;
    return Math.ceil(estimated_need / yield_per_plant_kg);
  }
  
  // Загальна потреба сім'ї (кг)
  const total_need_kg = personal_need_kg * family_size;
  
  // Скільки рослин потрібно (округлюємо вгору)
  const required_plants = Math.ceil(total_need_kg / yield_per_plant_kg);
  
  // Мінімум 3 рослини навіть для маленької сім'ї (на випадок хвороб/втрат)
  return Math.max(required_plants, 3);
}

/**
 * Розраховує площу, яку займе група рослин одного виду
 * 
 * @param plant_name - Назва рослини
 * @param quantity - Кількість рослин
 * @param include_pathways - Чи враховувати доріжки між рядами
 * @param pathway_width_m - Ширина доріжок (метри)
 * @returns Об'єкт з шириною, довжиною та загальною площею (м²)
 * 
 * @example
 * calculatePlantArea('томат', 20, true, 0.5);
 * // → { width_m: 2.2, length_m: 3.5, area_m2: 7.7 }
 */
export function calculatePlantArea(
  plant_name: string,
  quantity: number,
  include_pathways: boolean = true,
  pathway_width_m: number = 0.5
): { width_m: number; length_m: number; area_m2: number } {
  const spacing = PLANT_SPACING[plant_name as keyof typeof PLANT_SPACING];
  
  if (!spacing) {
    // Якщо рослина не в списку - використовуємо середні значення
    const default_spacing = { between: 0.4, rows: 0.6 };
    return calculateWithSpacing(quantity, default_spacing, include_pathways, pathway_width_m);
  }
  
  return calculateWithSpacing(quantity, spacing, include_pathways, pathway_width_m);
}

/**
 * Внутрішня функція: розрахунок площі з відстанями
 */
function calculateWithSpacing(
  quantity: number,
  spacing: { between: number; rows: number },
  include_pathways: boolean,
  pathway_width_m: number
): { width_m: number; length_m: number; area_m2: number } {
  // Визначаємо оптимальну кількість рядів (намагаємось зробити квадрат/прямокутник)
  const rows = Math.ceil(Math.sqrt(quantity));
  const plants_per_row = Math.ceil(quantity / rows);
  
  // Ширина грядки (з урахуванням відстаней між рослинами)
  let width_m = plants_per_row * spacing.between;
  
  // Довжина грядки (з урахуванням відстаней між рядами та доріжок)
  let length_m = rows * spacing.rows;
  
  // Додаємо доріжки між рядами (якщо потрібно)
  if (include_pathways && rows > 1) {
    // Доріжка після кожного 2-го ряду (щоб не займати занадто багато місця)
    const pathway_count = Math.floor((rows - 1) / 2);
    length_m += pathway_count * pathway_width_m;
  }
  
  // Додаємо відступи по краях (0.2 м з кожного боку)
  width_m += 0.4;
  length_m += 0.4;
  
  const area_m2 = width_m * length_m;
  
  return {
    width_m: Math.round(width_m * 100) / 100,
    length_m: Math.round(length_m * 100) / 100,
    area_m2: Math.round(area_m2 * 100) / 100,
  };
}

/**
 * Перевіряє, чи вистачить площі на ділянці для всіх рослин
 */
export function checkAreaSufficiency(
  total_plot_area_m2: number,
  plants: Array<{ name: string; quantity: number }>
): {
  sufficient: boolean;
  total_needed_m2: number;
  remaining_m2: number;
  usage_percent: number;
} {
  let total_needed_m2 = 0;
  
  plants.forEach(plant => {
    const area = calculatePlantArea(plant.name, plant.quantity, true, 0.5);
    total_needed_m2 += area.area_m2;
  });
  
  const remaining_m2 = total_plot_area_m2 - total_needed_m2;
  const usage_percent = (total_needed_m2 / total_plot_area_m2) * 100;
  
  return {
    sufficient: remaining_m2 >= 0,
    total_needed_m2: Math.round(total_needed_m2 * 100) / 100,
    remaining_m2: Math.round(remaining_m2 * 100) / 100,
    usage_percent: Math.round(usage_percent),
  };
}

/**
 * Розраховує очікуваний загальний врожай (кг)
 */
export function calculateExpectedYield(
  plants: Array<{ name: string; quantity: number; yield_per_plant_kg: number }>
): { total_kg: number; per_plant: Record<string, number> } {
  let total_kg = 0;
  const per_plant: Record<string, number> = {};
  
  plants.forEach(plant => {
    const yield_kg = plant.quantity * plant.yield_per_plant_kg;
    per_plant[plant.name] = Math.round(yield_kg * 100) / 100;
    total_kg += yield_kg;
  });
  
  return {
    total_kg: Math.round(total_kg * 100) / 100,
    per_plant,
  };
}