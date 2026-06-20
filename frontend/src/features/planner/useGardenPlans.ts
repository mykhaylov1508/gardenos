// frontend/src/features/planner/useGardenPlans.ts
// 🌿 GardenOS v2.0 - Хук для роботи з планами саду
import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { LayoutResult } from './utils/layout';

export interface PlanData {
  name: string;
  plot_config: {
    width_m: number;
    length_m: number;
    water_source?: { x_percent: number; y_percent: number };
    north_direction: string;
  };
  family_size: number;
  optimization_goal: string;
  selected_plants: Array<{
    library_id: string;
    name_uk: string;
    quantity: number;
    priority: string;
  }>;
  layout: LayoutResult;
  suggestions?: any;
  total_area_m2: number;
  used_area_m2: number;
  empty_area_m2: number;
  expected_yield_kg: number;
}

export interface ApplyResult {
  success: boolean;
  zones_created: number;
  plants_created: number;
  tasks_created: number;
  plan_id: string;
  errors: string[];
}

function parseRegionalDate(dateString: string | undefined): string {
  if (!dateString) {
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + 7);
    return fallback.toISOString().split('T')[0];
  }

  const lower = dateString.toLowerCase();
  const currentYear = new Date().getFullYear();
  const months: Record<string, number> = {
    'січ': 0, 'лют': 1, 'бер': 2, 'кві': 3, 'тра': 4, 'чер': 5,
    'лип': 6, 'сер': 7, 'вер': 8, 'жов': 9, 'лис': 10, 'гру': 11
  };

  let targetMonth = 4;
  let targetDay = 15;

  for (const [monthKey, monthNum] of Object.entries(months)) {
    if (lower.includes(monthKey)) {
      targetMonth = monthNum;
      if (lower.includes('кінець') || lower.includes('кінця')) targetDay = 25;
      else if (lower.includes('початок') || lower.includes('початку')) targetDay = 5;
      else if (lower.includes('середин')) targetDay = 15;
      break;
    }
  }

  const date = new Date(currentYear, targetMonth, targetDay);
  return date.toISOString().split('T')[0];
}

export function useGardenPlans() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function applyPlanToGarden(planData: PlanData): Promise<ApplyResult> {
    if (!user) {
      return {
        success: false,
        zones_created: 0,
        plants_created: 0,
        tasks_created: 0,
        plan_id: '',
        errors: ['Користувач не авторизований'],
      };
    }

    setLoading(true);
    setError(null);

    const result: ApplyResult = {
      success: false,
      zones_created: 0,
      plants_created: 0,
      tasks_created: 0,
      plan_id: '',
      errors: [],
    };

    try {
      const { data: savedPlan, error: planError } = await supabase
        .from('garden_plans')
        .insert({
          user_id: user.id,
          name: planData.name,
          status: 'active',
          plot_config: planData.plot_config,
          family_size: planData.family_size,
          optimization_goal: planData.optimization_goal,
          selected_plants: planData.selected_plants,
          layout: planData.layout,
          suggestions: planData.suggestions,
          total_area_m2: planData.total_area_m2,
          used_area_m2: planData.used_area_m2,
          empty_area_m2: planData.empty_area_m2,
          expected_yield_kg: planData.expected_yield_kg,
          applied_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (planError) {
        result.errors.push(`Помилка збереження плану: ${planError.message}`);
        return result;
      }

      result.plan_id = savedPlan.id;

      const plantIds = planData.layout.beds.map(b => b.plant_id);
      const { data: libraryData } = await supabase
        .from('plant_library')
        .select('id, name_uk, vegetation_days, regional_ukraine, beginner_tips')
        .in('id', plantIds);

      const libraryMap = new Map(
        (libraryData || []).map(lib => [lib.id, lib])
      );

      for (const bed of planData.layout.beds) {
        const libItem = libraryMap.get(bed.plant_id);
        if (!libItem) {
          result.errors.push(`Рослину ${bed.name_uk} не знайдено в бібліотеці`);
          continue;
        }

        try {
          const zoneName = `Грядка: ${bed.name_uk}`;

          // Спочатку перевіряємо чи вже є така зона
          const { data: existingZone } = await supabase
            .from('my_zones')
            .select('id, name, area_m2')
            .eq('user_id', user.id)
            .eq('name', zoneName)
            .maybeSingle();

          let newZone: any;

          if (existingZone) {
            // Зона вже існує — використовуємо її
            newZone = existingZone;
          } else {
            // Створюємо нову зону
            const { data, error: zoneError } = await supabase
              .from('my_zones')
              .insert({
                user_id: user.id,
                name: zoneName,
                zone_type: 'bed',
                area_m2: bed.width_m * bed.length_m,
                description: `Створено з плану "${planData.name}"`,
              })
              .select()
              .single();

            if (zoneError) {
              result.errors.push(`Помилка створення зони для ${bed.name_uk}: ${zoneError.message}`);
              continue;
            }

            newZone = data;
            result.zones_created++;
          }

          const regional = libItem.regional_ukraine || {};
          const plantedDate = parseRegionalDate(regional.planting_date);
          
          const harvestDate = new Date(plantedDate);
          harvestDate.setDate(harvestDate.getDate() + (libItem.vegetation_days || 90));
          const expectedHarvestDate = harvestDate.toISOString().split('T')[0];

          const { data: newPlant, error: plantError } = await supabase
            .from('my_plants')
            .insert({
              user_id: user.id,
              zone_id: newZone.id,
              library_id: bed.plant_id,
              custom_name: `${bed.name_uk} (${planData.name})`,
              planted_date: plantedDate,
              expected_harvest_date: expectedHarvestDate,
              area_m2: bed.width_m * bed.length_m,
              status: 'planned',
              notes: bed.placement_reason,
              map_x: (bed.x_m + bed.width_m / 2) / planData.plot_config.width_m,
              map_y: (bed.y_m + bed.length_m / 2) / planData.plot_config.length_m,
            })
            .select()
            .single();

          if (plantError) {
            result.errors.push(`Помилка створення рослини ${bed.name_uk}: ${plantError.message}`);
            continue;
          }

          result.plants_created++;

          const beginnerTips = libItem.beginner_tips || [];
          const firstTip = Array.isArray(beginnerTips) && beginnerTips.length > 0 
            ? beginnerTips[0] 
            : '';

          const explanation = [
            `📅 Оптимальна дата посадки для твого регіону: ${regional.planting_date || 'весна'}`,
            regional.notes ? `💡 ${regional.notes}` : '',
            firstTip ? `🌱 Порада: ${firstTip}` : '',
            `📍 ${bed.placement_reason}`,
          ].filter(Boolean).join('\n\n');

          const { error: taskError } = await supabase
            .from('tasks')
            .insert({
              user_id: user.id,
              plant_id: newPlant.id,
              task_type: 'plant',
              title: `🌱 Посадити ${bed.name_uk} (${bed.planted_quantity} шт)`,
              action_description: `Підготувати грядку "${zoneName}" (${bed.width_m.toFixed(1)}×${bed.length_m.toFixed(1)} м) та висадити ${bed.planted_quantity} рослин`,
              explanation_text: explanation,
              due_date: plantedDate,
              recommended_time: 'Вранці або ввечері, в похмуру погоду',
              priority: 'normal',
              is_completed: false,
            });

          if (taskError) {
            result.errors.push(`Помилка створення задачі для ${bed.name_uk}: ${taskError.message}`);
          } else {
            result.tasks_created++;
          }

          // Додаткова задача на сьогодні
                    // 3e. 🔥 НОВЕ: Створюємо задачу "Підготуватись" НА СЬОГОДНІ
          // Щоб користувач одразу побачив її в списку задач
          const prepDate = new Date().toISOString().split('T')[0]; // сьогодні

          const { error: prepTaskError } = await supabase
            .from('tasks')
            .insert({
              user_id: user.id,
              plant_id: newPlant.id,
              task_type: 'general',
              title: `📋 Підготувати грядку для ${bed.name_uk}`,
              action_description: `Підготувати ґрунт, внести компост, перевірити розмітку для "${zoneName}" (${bed.width_m.toFixed(1)}×${bed.length_m.toFixed(1)} м)`,
              explanation_text: `До посадки ${bed.name_uk} залишилось кілька тижнів. Підготуй грядку заздалегідь:\n\n` +
                `• Перекопай ґрунт на глибину 20-25 см\n` +
                `• Внеси компост (3-4 кг на м²)\n` +
                `• Розрівняй граблями\n` +
                `• Перевір рівень pH (для ${bed.name_uk} оптимально ${libItem.regional_ukraine?.notes || '6.0-7.0'})\n\n` +
                `Посадка запланована на ${regional.planting_date || 'весну'}.`,
              due_date: prepDate, // ← сьогодні!
              recommended_time: 'У вихідний день, коли є 1-2 години',
              priority: 'normal',
              is_completed: false,
            });

          if (!prepTaskError) {
            result.tasks_created++;
          }
        } catch (err: any) {
          result.errors.push(`Неочікувана помилка з ${bed.name_uk}: ${err.message}`);
        }
      }

      result.success = result.errors.length === 0;
      return result;
    } catch (err: any) {
      result.errors.push(`Критична помилка: ${err.message}`);
      setError(err.message);
      return result;
    } finally {
      setLoading(false);
    }
  }

  async function savePlan(planData: PlanData): Promise<{ success: boolean; plan_id?: string; error?: string }> {
    if (!user) {
      return { success: false, error: 'Користувач не авторизований' };
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('garden_plans')
        .insert({
          user_id: user.id,
          name: planData.name,
          status: 'template',
          plot_config: planData.plot_config,
          family_size: planData.family_size,
          optimization_goal: planData.optimization_goal,
          selected_plants: planData.selected_plants,
          layout: planData.layout,
          suggestions: planData.suggestions,
          total_area_m2: planData.total_area_m2,
          used_area_m2: planData.used_area_m2,
          empty_area_m2: planData.empty_area_m2,
          expected_yield_kg: planData.expected_yield_kg,
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, plan_id: data.id };
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }

  async function getSavedPlans() {
    if (!user) return [];

    const { data, error } = await supabase
      .from('garden_plans')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Помилка завантаження планів:', error);
      return [];
    }

    return data || [];
  }

  async function deletePlan(planId: string): Promise<boolean> {
    const { error } = await supabase
      .from('garden_plans')
      .delete()
      .eq('id', planId);

    return !error;
  }

  return {
    loading,
    error,
    applyPlanToGarden,
    savePlan,
    getSavedPlans,
    deletePlan,
  };
}