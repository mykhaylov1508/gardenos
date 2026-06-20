// frontend/src/features/planner/utils/cropRotation.ts
// 🌿 GardenOS v2.0 - Логіка сівозміни
// Перевіряє чи можна садити рослину в зону на основі історії посадок

import { supabase } from '../../../lib/supabase';

/**
 * 📚 Правила сівозміни (агрономічні норми)
 * Скільки років НЕ МОЖНА садити рослини тієї ж родини на тому ж місці
 */
const FAMILY_ROTATION_YEARS: Record<string, number> = {
  // Пасльонові — дуже виснажують ґрунт, накопичують фітофтору
  'Solanaceae': 4,      // Томат, Перець, Картопля, Баклажан
  'Пасльонові': 4,
  'Ясенкові': 4,        // Базилік (теж пасльонові по суті)
  
  // Капустяні — накопичують килу
  'Brassicaceae': 3,    // Капуста, Редис, Ріпа, Редька
  'Капустяні': 3,
  
  // Гарбузові — виснажують ґрунт
  'Cucurbitaceae': 3,   // Огірок, Кабачок, Гарбуз, Кавун
  'Гарбузові': 3,
  
  // Селерові (зонтичні) — повільно відновлюються
  'Apiaceae': 3,        // Морква, Кріп, Петрушка, Селера
  'Зонтичні': 3,
  
  // Бобові — ПОКРАЩУЮТЬ ґрунт (фіксують азот)
  'Fabaceae': 1,        // Горох, Квасоля, Боби
  'Бобові': 1,
  
  // Айстрові — середнє навантаження
  'Asteraceae': 2,      // Салат, Соняшник
  'Айстрові': 2,
  
  // Амарилісові (цибулеві)
  'Amaryllidaceae': 3,  // Цибуля, Часник
  'Амарилісові': 3,
  
  // Розові (ягідні) — багаторічні, але для грядок
  'Rosaceae': 3,        // Полуниця
  'Розові': 3,
  
  // Лободові
  'Amaranthaceae': 2,   // Буряк, Шпинат
  'Лободові': 2,
  
  // Злакові
  'Poaceae': 2,         // Кукурудза
  'Злакові': 2,
};

/**
 * 🟢 "Хороші попередники" — після них можна садити майже все
 * Бобові збагачують ґрунт азотом
 */
const GOOD_PREDECESSORS: string[] = [
  'Fabaceae', 'Бобові',  // Горох, квасоля
];

/**
 * Результат перевірки сівозміни
 */
export interface CropRotationCheck {
  allowed: boolean;              // Чи можна садити
  risk_level: 'safe' | 'warning' | 'danger';
  years_since_same_family: number; // Скільки років минуло
  required_years: number;          // Скільки треба чекати
  previous_plant_name?: string;    // Що росло торік
  previous_family?: string;        // Яка родина
  reason: string;                  // Пояснення для користувача
  recommendation?: string;         // Що краще посадити замість
}

/**
 * Історія посадок в зоні
 */
export interface ZoneHistory {
  zone_id: string;
  zone_name: string;
  plantings: {
    plant_name: string;
    family: string;
    planted_date: string;
    year: number;
  }[];
}

/**
 * 🔍 ГОЛОВНА ФУНКЦІЯ: Перевіряє сівозміну для рослини в зоні
 */
export function checkCropRotation(
  plantFamily: string,
  plantName: string,
  zoneHistory: ZoneHistory | null
): CropRotationCheck {
  // Якщо немає історії — все ок
  if (!zoneHistory || zoneHistory.plantings.length === 0) {
    return {
      allowed: true,
      risk_level: 'safe',
      years_since_same_family: 99,
      required_years: 0,
      reason: '✅ Нова зона — можна садити будь-що',
    };
  }

  const currentYear = new Date().getFullYear();
  const requiredYears = FAMILY_ROTATION_YEARS[plantFamily] || 2;

  // Шукаємо останню рослину тієї ж родини
  const sameFamilyPlantings = zoneHistory.plantings
    .filter(p => p.family === plantFamily)
    .sort((a, b) => b.year - a.year); // Найсвіжіші першими

  if (sameFamilyPlantings.length === 0) {
    // Родини не було — перевіряємо чи були хороші попередники
    const hasGoodPredecessor = zoneHistory.plantings.some(p => 
      GOOD_PREDECESSORS.includes(p.family)
    );

    return {
      allowed: true,
      risk_level: 'safe',
      years_since_same_family: 99,
      required_years: requiredYears,
      reason: hasGoodPredecessor 
        ? `✅ Чудово! Торік росли бобові — ґрунт збагачений азотом`
        : `✅ Цю родину тут не садили — можна садити`,
    };
  }

  const lastSameFamily = sameFamilyPlantings[0];
  const yearsSince = currentYear - lastSameFamily.year;

  // 🟢 БЕЗПЕЧНО: минуло достатньо років
  if (yearsSince >= requiredYears) {
    return {
      allowed: true,
      risk_level: 'safe',
      years_since_same_family: yearsSince,
      required_years: requiredYears,
      previous_plant_name: lastSameFamily.plant_name,
      previous_family: lastSameFamily.family,
      reason: `✅ Сівозміна дотримана: ${lastSameFamily.plant_name} ріс ${yearsSince} р. тому (норма: ${requiredYears} р.)`,
    };
  }

  // 🟡 ПОПЕРЕДЖЕННЯ: минуло мало років, але не критично
  if (yearsSince >= requiredYears - 1) {
    return {
      allowed: true,
      risk_level: 'warning',
      years_since_same_family: yearsSince,
      required_years: requiredYears,
      previous_plant_name: lastSameFamily.plant_name,
      previous_family: lastSameFamily.family,
      reason: `⚠️ Минуло тільки ${yearsSince} р. (рекомендовано ${requiredYears}). Ризик хвороб підвищений.`,
      recommendation: `Краще посадити сюди бобові або зелень`,
    };
  }

  // 🔴 НЕБЕЗПЕЧНО: садити не можна
  return {
    allowed: false,
    risk_level: 'danger',
    years_since_same_family: yearsSince,
    required_years: requiredYears,
    previous_plant_name: lastSameFamily.plant_name,
    previous_family: lastSameFamily.family,
    reason: `❌ Не можна садити! ${lastSameFamily.plant_name} (${lastSameFamily.family}) ріс ${yearsSince} р. тому. Треба чекати ще ${requiredYears - yearsSince} р.`,
    recommendation: getAlternativeRecommendation(plantFamily),
  };
}

/**
 * 💡 Пропонує альтернативу якщо не можна садити обрану рослину
 */
function getAlternativeRecommendation(blockedFamily: string): string {
  if (blockedFamily === 'Solanaceae' || blockedFamily === 'Пасльонові') {
    return '👉 Замість томатів/картоплі посади бобові, моркву або капусту';
  }
  if (blockedFamily === 'Brassicaceae' || blockedFamily === 'Капустяні') {
    return '👉 Замість капусти посади картоплю, буряк або цибулю';
  }
  if (blockedFamily === 'Cucurbitaceae' || blockedFamily === 'Гарбузові') {
    return '👉 Замість огірків посади бобові, капусту або кукурудзу';
  }
  if (blockedFamily === 'Apiaceae' || blockedFamily === 'Зонтичні') {
    return '👉 Замість моркви посади капусту, томат або цибулю';
  }
  if (blockedFamily === 'Amaryllidaceae' || blockedFamily === 'Амарилісові') {
    return '👉 Замість цибулі посади моркву, картоплю або капусту';
  }
  return '👉 Посади рослину з іншої родини';
}

/**
 * 📊 Завантажує історію посадок для всіх зон користувача
 * Використовується в планувальнику для перевірки сівозміни
 */
export async function loadZonesHistory(userId: string): Promise<ZoneHistory[]> {
  // Беремо посадки за останні 4 роки
  const fourYearsAgo = new Date();
  fourYearsAgo.setFullYear(fourYearsAgo.getFullYear() - 4);

  try {
    const { data: plantings } = await supabase
      .from('my_plants')
      .select(`
        id,
        zone_id,
        planted_date,
        plant_library!inner (name_uk, family),
        my_zones!inner (id, name)
      `)
      .eq('user_id', userId)
      .gte('planted_date', fourYearsAgo.toISOString().split('T')[0])
      .order('planted_date', { ascending: false });

    if (!plantings || plantings.length === 0) {
      return [];
    }

    // Групуємо по зонам
    const zoneMap = new Map<string, ZoneHistory>();

    for (const p of plantings) {
      if (!p.zone_id || !p.my_zones) continue;

      const zoneId = p.zone_id;
      if (!zoneMap.has(zoneId)) {
        zoneMap.set(zoneId, {
          zone_id: zoneId,
          zone_name: (p.my_zones as any).name,
          plantings: [],
        });
      }

      zoneMap.get(zoneId)!.plantings.push({
        plant_name: (p.plant_library as any).name_uk,
        family: (p.plant_library as any).family || 'Unknown',
        planted_date: p.planted_date,
        year: new Date(p.planted_date).getFullYear(),
      });
    }

    return Array.from(zoneMap.values());
  } catch (err) {
    console.error('Помилка завантаження історії зон:', err);
    return [];
  }
}

/**
 * 🎯 Швидка перевірка: чи є "проблемні" зони для родини
 * Використовується в Step 2 для показу ⚠️ біля назви рослини
 */
export function findProblematicZonesForFamily(
  family: string,
  zonesHistory: ZoneHistory[]
): { zoneName: string; previousPlant: string; yearsSince: number }[] {
  const currentYear = new Date().getFullYear();
  const requiredYears = FAMILY_ROTATION_YEARS[family] || 2;
  const problems: { zoneName: string; previousPlant: string; yearsSince: number }[] = [];

  for (const zone of zonesHistory) {
    const sameFamily = zone.plantings
      .filter(p => p.family === family)
      .sort((a, b) => b.year - a.year);

    if (sameFamily.length > 0) {
      const last = sameFamily[0];
      const yearsSince = currentYear - last.year;
      
      if (yearsSince < requiredYears) {
        problems.push({
          zoneName: zone.zone_name,
          previousPlant: last.plant_name,
          yearsSince,
        });
      }
    }
  }

  return problems;
}