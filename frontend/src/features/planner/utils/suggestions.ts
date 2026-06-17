// frontend/src/features/planner/utils/suggestions.ts
// 🌿 GardenOS v2.0 - Генерація пропозицій для порожнього місця

import { checkCompatibility } from './compatibility';

/**
 * База знань про "вигідні" культури
 * 
 * Ці рослини обрані за критеріями:
 * 1. Високий врожай з м²
 * 2. Не потребують багато догляду
 * 3. Добре зберігаються / продаються
 * 4. Популярні на ринку
 */
const PROFITABLE_CROPS = [
  {
    plant_name: 'томат',
    yield_per_m2_kg: 12,
    care_level: 'medium' as const,
    market_price_per_kg: 40, // умовні гривні
    storage_days: 14,
    best_for: ['sale', 'family'],
    reasons: [
      'Високий врожай з м² (до 12 кг)',
      'Популярний на ринку — легко продати',
      'Можна консервувати, сушити, заморожувати',
    ],
  },
  {
    plant_name: 'огірок',
    yield_per_m2_kg: 15,
    care_level: 'high' as const,
    market_price_per_kg: 35,
    storage_days: 7,
    best_for: ['family', 'sale'],
    reasons: [
      'Дуже високий врожай (до 15 кг/м²)',
      'Швидко росте — перший урожай через 40 днів',
      'Популярний для консервації',
    ],
  },
  {
    plant_name: 'кабачок',
    yield_per_m2_kg: 18,
    care_level: 'low' as const,
    market_price_per_kg: 20,
    storage_days: 30,
    best_for: ['sale', 'family'],
    reasons: [
      'Рекордний врожай (до 18 кг/м²)',
      'Майже не потребує догляду',
      'Довго зберігається (до місяця)',
      'Добре продається на ринку',
    ],
  },
  {
    plant_name: 'картопля',
    yield_per_m2_kg: 4,
    care_level: 'low' as const,
    market_price_per_kg: 15,
    storage_days: 180,
    best_for: ['family', 'storage'],
    reasons: [
      'Зберігається всю зиму (до 6 місяців)',
      'Базовий продукт для сім\'ї',
      'Мінімальний догляд після посадки',
    ],
  },
  {
    plant_name: 'морква',
    yield_per_m2_kg: 6,
    care_level: 'low' as const,
    market_price_per_kg: 18,
    storage_days: 150,
    best_for: ['family', 'storage'],
    reasons: [
      'Зберігається всю зиму',
      'Не потребує частого поливу',
      'Універсальна в кулінарії',
    ],
  },
  {
    plant_name: 'буряк',
    yield_per_m2_kg: 5,
    care_level: 'low' as const,
    market_price_per_kg: 16,
    storage_days: 180,
    best_for: ['family', 'storage'],
    reasons: [
      'Зберігається всю зиму',
      'Стійкий до хвороб',
      'Корисний для здоров\'я',
    ],
  },
  {
    plant_name: 'цибуля',
    yield_per_m2_kg: 4,
    care_level: 'low' as const,
    market_price_per_kg: 20,
    storage_days: 240,
    best_for: ['family', 'storage'],
    reasons: [
      'Зберігається до 8 місяців',
      'Базовий інгредієнт для будь-якої кухні',
      'Відлякує шкідників від інших рослин',
    ],
  },
  {
    plant_name: 'часник',
    yield_per_m2_kg: 2,
    care_level: 'low' as const,
    market_price_per_kg: 120,
    storage_days: 240,
    best_for: ['sale', 'storage'],
    reasons: [
      'Дуже висока ціна на ринку (до 120 грн/кг)',
      'Зберігається до 8 місяців',
      'Природний антибіотик',
      'Відлякує шкідників',
    ],
  },
  {
    plant_name: 'капуста',
    yield_per_m2_kg: 8,
    care_level: 'medium' as const,
    market_price_per_kg: 12,
    storage_days: 120,
    best_for: ['family', 'processing'],
    reasons: [
      'Високий врожай з м²',
      'Ідеальна для квашення (зберігається всю зиму)',
      'Багата на вітаміни',
    ],
  },
  {
    plant_name: 'соняшник',
    yield_per_m2_kg: 3, // насіння
    care_level: 'low' as const,
    market_price_per_kg: 25,
    storage_days: 365,
    best_for: ['sale', 'storage'],
    reasons: [
      'Насіння зберігається рік',
      'Можна продавати або робити олію',
      'Майже не потребує догляду',
      'Красиво виглядає на ділянці',
    ],
  },
  {
    plant_name: 'квасоля',
    yield_per_m2_kg: 2,
    care_level: 'low' as const,
    market_price_per_kg: 60,
    storage_days: 365,
    best_for: ['family', 'storage', 'sale'],
    reasons: [
      'Висока білкова цінність',
      'Зберігається рік у сухому вигляді',
      'Збагачує ґрунт азотом (корисно для наступних культур)',
      'Добре продається',
    ],
  },
  {
    plant_name: 'горох',
    yield_per_m2_kg: 1.5,
    care_level: 'low' as const,
    market_price_per_kg: 50,
    storage_days: 365,
    best_for: ['family', 'storage'],
    reasons: [
      'Збагачує ґрунт азотом',
      'Швидко росте (60 днів)',
      'Можна заморожувати або сушити',
    ],
  },
  {
    plant_name: 'салат',
    yield_per_m2_kg: 3,
    care_level: 'medium' as const,
    market_price_per_kg: 80,
    storage_days: 5,
    best_for: ['sale', 'quick'],
    reasons: [
      'Висока ціна на ринку',
      'Швидкий урожай (30-40 днів)',
      'Можна садити кілька разів за сезон',
    ],
  },
  {
    plant_name: 'редис',
    yield_per_m2_kg: 4,
    care_level: 'low' as const,
    market_price_per_kg: 40,
    storage_days: 14,
    best_for: ['sale', 'quick'],
    reasons: [
      'Найшвидший урожай (20-25 днів)',
      'Можна садити між іншими культурами',
      'Популярний на ринку навесні',
    ],
  },
  {
    plant_name: 'петрушка',
    yield_per_m2_kg: 2,
    care_level: 'low' as const,
    market_price_per_kg: 100,
    storage_days: 7,
    best_for: ['sale', 'family'],
    reasons: [
      'Висока ціна за зелень',
      'Можна заморожувати або сушити',
      'Використовується в багатьох стравах',
    ],
  },
  {
    plant_name: 'кріп',
    yield_per_m2_kg: 1.5,
    care_level: 'low' as const,
    market_price_per_kg: 80,
    storage_days: 7,
    best_for: ['sale', 'family'],
    reasons: [
      'Популярна зелень',
      'Можна сушити або заморожувати',
      'Відлякує деяких шкідників',
    ],
  },
];

/**
 * Результат генерації пропозицій
 */
export interface SuggestionResult {
  suggestions: PlantSuggestion[];
  total_potential_yield_kg: number;
  total_potential_income: number;
  explanation: string;
}

export interface PlantSuggestion {
  plant_name: string;
  quantity: number;
  area_m2: number;
  expected_yield_kg: number;
  potential_income: number;
  care_level: 'low' | 'medium' | 'high';
  reasons: string[];
  compatibility_score: number; // 0-100
  compatibility_notes: string[];
}

/**
 * 🧠 ГОЛОВНА ФУНКЦІЯ: генерує пропозиції для порожнього місця
 * 
 * @param empty_area_m2 - Скільки вільного місця залишилось
 * @param existing_plants - Які рослини вже розміщені (для перевірки сумісності)
 * @param preferences - Переваги користувача
 */
export function generateSuggestions(
  empty_area_m2: number,
  existing_plants: string[],
  preferences: {
    focus_on: 'yield' | 'profit' | 'low_care' | 'storage';
    family_size: number;
  }
): SuggestionResult {
  // Якщо мало місця — не пропонуємо нічого
  if (empty_area_m2 < 2) {
    return {
      suggestions: [],
      total_potential_yield_kg: 0,
      total_potential_income: 0,
      explanation: 'Мало вільного місця для додаткових посадок.',
    };
  }
  
  const suggestions: PlantSuggestion[] = [];
  let remaining_area = empty_area_m2;
  
  // Сортуємо культури за пріоритетом
  const sorted_crops = prioritizeCrops(preferences.focus_on);
  
  // Вибираємо культури поки є місце
  for (const crop of sorted_crops) {
    if (remaining_area < 1) break; // Мінімальна грядка — 1 м²
    
    // Перевіряємо сумісність з існуючими рослинами
    const compatibility = checkCompatibilityWithExisting(
      crop.plant_name,
      existing_plants
    );
    
    // Якщо дуже погана сумісність — пропускаємо
    if (compatibility.score < 30) continue;
    
    // Розраховуємо скільки можна посадити
    const area_to_use = Math.min(remaining_area, 5); // Максимум 5 м² на одну культуру
    const yield_per_m2 = crop.yield_per_m2_kg;
    const expected_yield = area_to_use * yield_per_m2;
    const potential_income = expected_yield * crop.market_price_per_kg;
    
    suggestions.push({
      plant_name: crop.plant_name,
      quantity: Math.round(area_to_use * 4), // Приблизно 4 рослини на м²
      area_m2: area_to_use,
      expected_yield_kg: Math.round(expected_yield * 10) / 10,
      potential_income: Math.round(potential_income),
      care_level: crop.care_level,
      reasons: crop.reasons,
      compatibility_score: compatibility.score,
      compatibility_notes: compatibility.notes,
    });
    
    remaining_area -= area_to_use;
    
    // Зупиняємось якщо вже 3-4 пропозиції (щоб не перевантажувати)
    if (suggestions.length >= 4) break;
  }
  
  // Рахуємо загальні показники
  const total_potential_yield_kg = suggestions.reduce(
    (sum, s) => sum + s.expected_yield_kg,
    0
  );
  const total_potential_income = suggestions.reduce(
    (sum, s) => sum + s.potential_income,
    0
  );
  
  // Генеруємо пояснення
  const explanation = generateExplanation(
    suggestions,
    total_potential_yield_kg,
    total_potential_income,
    preferences.family_size
  );
  
  return {
    suggestions,
    total_potential_yield_kg: Math.round(total_potential_yield_kg * 10) / 10,
    total_potential_income,
    explanation,
  };
}

/**
 * Сортує культури за пріоритетом в залежності від цілі користувача
 */
function prioritizeCrops(focus: 'yield' | 'profit' | 'low_care' | 'storage') {
  return [...PROFITABLE_CROPS].sort((a, b) => {
    switch (focus) {
      case 'yield':
        // Спочатку ті, що дають найбільше врожаю
        return b.yield_per_m2_kg - a.yield_per_m2_kg;
      
      case 'profit':
        // Спочатку найдорожчі
        return b.market_price_per_kg - a.market_price_per_kg;
      
      case 'low_care':
        // Спочатку ті, що потребують найменше догляду
        const care_order = { low: 0, medium: 1, high: 2 };
        return care_order[a.care_level] - care_order[b.care_level];
      
      case 'storage':
        // Спочатку ті, що довго зберігаються
        return b.storage_days - a.storage_days;
      
      default:
        return 0;
    }
  });
}

/**
 * Перевіряє сумісність нової культури з вже розміщеними
 */
function checkCompatibilityWithExisting(
  new_plant: string,
  existing_plants: string[]
): { score: number; notes: string[] } {
  let good_count = 0;
  let bad_count = 0;
  const notes: string[] = [];
  
  for (const existing of existing_plants) {
    const result = checkCompatibility(new_plant, existing);
    
    if (result.level === 'good') {
      good_count++;
      notes.push(`Добре росте поруч з ${existing}`);
    } else if (result.level === 'bad') {
      bad_count++;
      notes.push(`Не рекомендується поруч з ${existing}`);
    }
  }
  
  // Розраховуємо загальний бал сумісності
  const total = good_count + bad_count;
  if (total === 0) {
    return { score: 70, notes: ['Нейтральна сумісність з існуючими рослинами'] };
  }
  
  const score = Math.round((good_count / total) * 100);
  
  return {
    score: Math.max(0, Math.min(100, score)),
    notes: notes.slice(0, 3), // Показуємо максимум 3 нотатки
  };
}

/**
 * 💬 Генерує зрозуміле пояснення для користувача
 */
function generateExplanation(
  suggestions: PlantSuggestion[],
  total_yield_kg: number,
  total_income: number,
  family_size: number
): string {
  if (suggestions.length === 0) {
    return 'Не знайдено підходящих культур для цього місця.';
  }
  
  const crop_names = suggestions.map(s => s.plant_name).join(', ');
  
  let explanation = `Рекомендую посадити: ${crop_names}. `;
  
  explanation += `Це дасть додатково ${total_yield_kg} кг врожаю. `;
  
  if (total_income > 500) {
    explanation += `Орієнтовний дохід від продажу: ${total_income} грн. `;
  }
  
  // Додаємо пораду щодо використання
  const high_yield = suggestions.find(s => s.expected_yield_kg > 10);
  if (high_yield) {
    explanation += `${high_yield.plant_name} принесе найбільше плодів — вистачить для сім'ї з ${family_size} людей і залишиться на продаж. `;
  }
  
  const low_care = suggestions.find(s => s.care_level === 'low');
  if (low_care) {
    explanation += `${low_care.plant_name} майже не потребує догляду — ідеально для початківця. `;
  }
  
  return explanation.trim();
}

/**
 * Повертає список всіх доступних "вигідних" культур
 * (для UI, якщо користувач хоче вибрати вручну)
 */
export function getAllProfitableCrops() {
  return PROFITABLE_CROPS.map(crop => ({
    name: crop.plant_name,
    yield_per_m2: crop.yield_per_m2_kg,
    care_level: crop.care_level,
    market_price: crop.market_price_per_kg,
    storage_days: crop.storage_days,
    reasons: crop.reasons,
  }));
}