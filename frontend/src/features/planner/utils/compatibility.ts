// frontend/src/features/planner/utils/compatibility.ts
// 🌿 GardenOS v2.0 - Перевірка сумісності рослин

/**
 * Тип сумісності між двома рослинами
 */
export type CompatibilityLevel = 'good' | 'neutral' | 'bad';

/**
 * Результат перевірки сумісності
 */
export interface CompatibilityResult {
  level: CompatibilityLevel;
  reason: string;
  suggestion?: string;
}

/**
 * База знань про сумісність рослин
 * 
 * good - гарні сусіди (допомагають одна одній)
 * neutral - нейтральні (можна садити поруч)
 * bad - погані сусіди (конфліктують)
 */
const COMPATIBILITY_DB: Record<string, Record<string, CompatibilityLevel>> = {
  томат: {
    базилік: 'good',
    морква: 'good',
    петрушка: 'good',
    салат: 'good',
    цибуля: 'good',
    часник: 'good',
    картопля: 'bad',
    капуста: 'bad',
    огірок: 'neutral',
    перець: 'neutral',
  },
  огірок: {
    кріп: 'good',
    салат: 'good',
    горох: 'good',
    капуста: 'good',
    томат: 'neutral',
    картопля: 'bad',
    перець: 'neutral',
  },
  перець: {
    базилік: 'good',
    томат: 'neutral',
    морква: 'good',
    огірок: 'neutral',
    картопля: 'bad',
    капуста: 'neutral',
  },
  картопля: {
    томат: 'bad',
    огірок: 'bad',
    перець: 'bad',
    капуста: 'bad',
    квасоля: 'good',
    кукурудза: 'good',
  },
  морква: {
    томат: 'good',
    цибуля: 'good',
    часник: 'good',
    салат: 'good',
    кріп: 'bad',
    петрушка: 'neutral',
  },
  капуста: {
    огірок: 'good',
    салат: 'good',
    кріп: 'good',
    томат: 'bad',
    картопля: 'bad',
    перець: 'neutral',
  },
  цибуля: {
    морква: 'good',
    томат: 'good',
    салат: 'good',
    горох: 'bad',
    квасоля: 'bad',
  },
  часник: {
    морква: 'good',
    томат: 'good',
    салат: 'good',
    горох: 'bad',
    квасоля: 'bad',
  },
  базилік: {
    томат: 'good',
    перець: 'good',
    салат: 'good',
    огірок: 'neutral',
  },
  кріп: {
    огірок: 'good',
    капуста: 'good',
    салат: 'good',
    морква: 'bad',
    томат: 'neutral',
  },
  салат: {
    огірок: 'good',
    томат: 'good',
    капуста: 'good',
    морква: 'good',
    базилік: 'good',
  },
};

/**
 * Перевіряє сумісність двох рослин
 * 
 * @param plant1_name - Назва першої рослини
 * @param plant2_name - Назва другої рослини
 * @returns Результат перевірки з поясненням
 * 
 * @example
 * checkCompatibility('томат', 'базилік');
 * // → { level: 'good', reason: 'Базилік відлякує шкідників томатів і покращує їх смак' }
 */
export function checkCompatibility(
  plant1_name: string,
  plant2_name: string
): CompatibilityResult {
  const p1_lower = plant1_name.toLowerCase();
  const p2_lower = plant2_name.toLowerCase();
  
  // Перевіряємо в базі знань (в обох напрямках)
  const compatibility1 = COMPATIBILITY_DB[p1_lower]?.[p2_lower];
  const compatibility2 = COMPATIBILITY_DB[p2_lower]?.[p1_lower];
  
  const level = compatibility1 || compatibility2 || 'neutral';
  
  const reason = getCompatibilityReason(p1_lower, p2_lower, level);
  const suggestion = getCompatibilitySuggestion(p1_lower, p2_lower, level);
  
  return { level, reason, suggestion };
}

/**
 * Перевіряє сумісність всієї групи рослин
 * 
 * @param plant_names - Масив назв рослин
 * @returns Масив проблемних пар з поясненнями
 */
export function checkGroupCompatibility(plant_names: string[]): {
  score: number; // 0-100 (вище = краще)
  problems: Array<{
    plant1: string;
    plant2: string;
    level: CompatibilityLevel;
    reason: string;
    suggestion?: string;
  }>;
  suggestions: string[];
} {
  const problems: Array<{
    plant1: string;
    plant2: string;
    level: CompatibilityLevel;
    reason: string;
    suggestion?: string;
  }> = [];
  
  // Перевіряємо всі пари
  for (let i = 0; i < plant_names.length; i++) {
    for (let j = i + 1; j < plant_names.length; j++) {
      const result = checkCompatibility(plant_names[i], plant_names[j]);
      
      if (result.level !== 'neutral') {
        problems.push({
          plant1: plant_names[i],
          plant2: plant_names[j],
          level: result.level,
          reason: result.reason,
          suggestion: result.suggestion,
        });
      }
    }
  }
  
  // Розраховуємо загальний бал сумісності
  const total_pairs = (plant_names.length * (plant_names.length - 1)) / 2;
  const good_pairs = problems.filter(p => p.level === 'good').length;
  const bad_pairs = problems.filter(p => p.level === 'bad').length;
  
  // Формула: базово 50, +5 за кожну хорошу пару, -10 за кожну погану
  let score = 50 + (good_pairs * 5) - (bad_pairs * 10);
  score = Math.max(0, Math.min(100, score)); // Обмежуємо 0-100
  
  // Генеруємо загальні поради
  const suggestions: string[] = [];
  
  if (bad_pairs > 0) {
    suggestions.push(
      `Є ${bad_pairs} пар рослин, які погано ростуть поруч. Розмістіть їх на різних грядках або додайте рослини-посередники.`
    );
  }
  
  if (good_pairs > 0) {
    suggestions.push(
      `Чудово! ${good_pairs} пар рослин добре доповнюють одна одну. Садіть їх поруч для кращого врожаю.`
    );
  }
  
  return { score, problems, suggestions };
}

/**
 * Повертає пояснення сумісності
 */
function getCompatibilityReason(
  plant1: string,
  plant2: string,
  level: CompatibilityLevel
): string {
  const reasons: Record<string, string> = {
    'томат-базилік': 'Базилік відлякує шкідників томатів (попелицю, гусениць) і покращує їх смак.',
    'томат-морква': 'Томати захищають моркву від морквяної мухи, а морква розпушує ґрунт для томатів.',
    'томат-картопля': 'Обидві рослини з родини пасльонових — мають однакові хвороби (фітофтора). Не садіть поруч!',
    'огірок-кріп': 'Кріп приваблює корисних комах, які запилюють огірки і захищають від шкідників.',
    'морква-цибуля': 'Класична пара! Цибуля відлякує морквяну муху, а морква — цибулеву муху.',
    'капуста-томат': 'Томати пригнічують ріст капусти. Краще розмістити їх на різних грядках.',
  };
  
  const key = `${plant1}-${plant2}`;
  const reverse_key = `${plant2}-${plant1}`;
  
  if (reasons[key]) return reasons[key];
  if (reasons[reverse_key]) return reasons[reverse_key];
  
  // Загальні пояснення
  if (level === 'good') {
    return `${plant1} та ${plant2} добре ростуть поруч і допомагають одна одній.`;
  } else if (level === 'bad') {
    return `${plant1} та ${plant2} конфліктують — мають спільних шкідників або пригнічують ріст одна одної.`;
  }
  
  return `${plant1} та ${plant2} нейтральні одна до одної — можна садити поруч без проблем.`;
}

/**
 * Повертає пораду щодо розміщення
 */
function getCompatibilitySuggestion(
  plant1: string,
  plant2: string,
  level: CompatibilityLevel
): string | undefined {
  if (level === 'good') {
    return `Розмістіть ${plant1} та ${plant2} на одній грядці для взаємної вигоди.`;
  } else if (level === 'bad') {
    return `Розділіть ${plant1} та ${plant2} мінімум 1-2 метрами або посадіть між ними нейтральну рослину (салат, редис).`;
  }
  
  return undefined;
}

/**
 * Перевіряє сівозміну (що росло тут минулого року)
 * 
 * @param current_plant - Що плануємо садити зараз
 * @param previous_plant - Що росло тут минулого року
 * @returns Чи безпечно садити цю рослину після попередньої
 */
export function checkCropRotation(
  current_plant: string,
  previous_plant: string
): { safe: boolean; reason: string } {
  // Родини рослин (не можна садити одну родину поспіль)
  const plant_families: Record<string, string> = {
    томат: 'solanaceae',
    картопля: 'solanaceae',
    перець: 'solanaceae',
    баклажан: 'solanaceae',
    
    огірок: 'cucurbitaceae',
    кабачок: 'cucurbitaceae',
    гарбуз: 'cucurbitaceae',
    
    капуста: 'brassicaceae',
    редис: 'brassicaceae',
    ріпа: 'brassicaceae',
    
    морква: 'apiaceae',
    петрушка: 'apiaceae',
    кріп: 'apiaceae',
    
    цибуля: 'amaryllidaceae',
    часник: 'amaryllidaceae',
  };
  
  const current_family = plant_families[current_plant.toLowerCase()];
  const previous_family = plant_families[previous_plant.toLowerCase()];
  
  if (current_family && previous_family && current_family === previous_family) {
    return {
      safe: false,
      reason: `${current_plant} і ${previous_plant} з однієї родини (${current_family}). Вони мають спільних шкідників і хвороби, які залишились в ґрунті. Краще садити ${current_plant} після бобових, зернових або зелені.`,
    };
  }
  
  return {
    safe: true,
    reason: `${current_plant} можна безпечно садити після ${previous_plant}.`,
  };
}