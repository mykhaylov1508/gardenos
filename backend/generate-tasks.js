// ============================================================================
// 🧠 GardenOS Rule Engine 2.0 — Розумний агроном
// ============================================================================
// Генерує задачі на основі:
// - Бібліотеки рослин (норми)
// - Погоди (Open-Meteo API)
// - Історії догляду
// - Стадії росту
// - Health Score
// ============================================================================

import { supabase } from './supabase-client.js';

// ============================================
// 📅 ХЕЛПЕРИ ДЛЯ ДАТ
// ============================================
function today() {
  return new Date().toISOString().split('T')[0];
}

function daysBetween(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return Math.floor(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24));
}

function getCurrentMonth() {
  return new Date().getMonth() + 1; // 1-12
}

// ============================================
// 🌤 ПОГОДА (Open-Meteo API)
// ============================================
async function getWeatherForecast(lat, lon) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&timezone=auto&forecast_days=3&past_days=7`;
    const response = await fetch(url);
    const data = await response.json();
    
    return {
      today_max: data.daily.temperature_2m_max[7],
      today_min: data.daily.temperature_2m_min[7],
      today_rain: data.daily.precipitation_sum[7],
      today_rain_prob: data.daily.precipitation_probability_max[7],
      tomorrow_max: data.daily.temperature_2m_max[8],
      tomorrow_min: data.daily.temperature_2m_min[8],
      tomorrow_rain: data.daily.precipitation_sum[8],
      last_3_days_rain: data.daily.precipitation_sum.slice(4, 7).reduce((a, b) => a + b, 0),
      last_7_days_rain: data.daily.precipitation_sum.slice(0, 7).reduce((a, b) => a + b, 0),
      heat_streak: data.daily.temperature_2m_max.slice(5, 8).filter(t => t >= 30).length,
    };
  } catch (err) {
    console.error('⚠️  Не вдалось отримати погоду:', err.message);
    return null;
  }
}

const UKRAINE_CITIES = {
  'Київ': { lat: 50.45, lon: 30.52 },
  'Львів': { lat: 49.84, lon: 24.03 },
  'Одеса': { lat: 46.48, lon: 30.73 },
  'Харків': { lat: 49.99, lon: 36.23 },
  'Вінниця': { lat: 49.23, lon: 28.47 },
  'Дніпро': { lat: 48.46, lon: 35.04 },
  'Запоріжжя': { lat: 47.84, lon: 35.14 },
  'Полтава': { lat: 49.59, lon: 34.55 },
  'Чернігів': { lat: 51.49, lon: 31.29 },
  'Житомир': { lat: 50.25, lon: 28.66 },
  'Хмельницький': { lat: 49.42, lon: 26.99 },
  'Тернопіль': { lat: 49.55, lon: 25.59 },
};

// ============================================
// 🌱 СТАДІЇ РОСТУ
// ============================================
function getGrowthStage(plant, library) {
  if (!plant.planted_date || !library?.vegetation_days) return 'seedling';
  
  const daysPlanted = daysBetween(plant.planted_date, today());
  const progress = (daysPlanted / library.vegetation_days) * 100;
  
  if (progress >= 90) return 'mature';    // Дозрівання/збір
  if (progress >= 60) return 'fruiting';  // Плодоношення
  if (progress >= 45) return 'flowering'; // Цвітіння
  if (progress >= 20) return 'growing';   // Активний ріст
  return 'seedling';                       // Розсада
}

const STAGE_INFO = {
  seedling:  { label: 'Розсада',      emoji: '🌱', feeding: 'none',     watering_mult: 1.2 },
  growing:   { label: 'Активний ріст', emoji: '🌿', feeding: 'high_n',   watering_mult: 1.0 },
  flowering: { label: 'Цвітіння',     emoji: '🌸', feeding: 'high_p',   watering_mult: 0.9 },
  fruiting:  { label: 'Плодоношення', emoji: '🥒', feeding: 'high_k',   watering_mult: 1.3 },
  mature:    { label: 'Дозрівання',   emoji: '🍎', feeding: 'none',     watering_mult: 0.7 },
};

// ============================================
// 💚 HEALTH SCORE (розрахунок здоров'я)
// ============================================
function calculateHealthScore(plant, library, events, weather) {
  let score = 100;
  const issues = [];
  
  if (!plant.planted_date) return { score: 100, issues: [] };
  
  // Перевірка поливів
  const waterings = events.filter(e => e.plant_id === plant.id && e.event_type === 'water');
  const daysSincePlanted = daysBetween(plant.planted_date, today());
  const expectedWaterings = Math.floor(daysSincePlanted / (library.watering_interval_days || 3));
  const missedWaterings = Math.max(0, expectedWaterings - waterings.length);
  
  if (missedWaterings > 0) {
    score -= missedWaterings * 8;
    issues.push(`Пропущено ${missedWaterings} поливів`);
  }
  
  // Перевірка підживлень (якщо потрібні)
  if (library.feeding_interval_days && library.feeding_interval_days > 0) {
    const feedings = events.filter(e => e.plant_id === plant.id && e.event_type === 'feed');
    const expectedFeedings = Math.floor(daysSincePlanted / library.feeding_interval_days);
    const missedFeedings = Math.max(0, expectedFeedings - feedings.length);
    
    if (missedFeedings > 0) {
      score -= missedFeedings * 10;
      issues.push(`Пропущено ${missedFeedings} підживлень`);
    }
  }
  
  // Погодний стрес
  if (weather) {
    if (weather.heat_streak >= 3) {
      score -= 5;
      issues.push('Тривала спека');
    }
    if (weather.last_7_days_rain > 50) {
      score -= 5;
      issues.push('Занадто багато дощів');
    }
  }
  
  return {
    score: Math.max(0, Math.min(100, score)),
    issues
  };
}

// ============================================
// 💧 ПРАВИЛО 1: РОЗУМНИЙ ПОЛИВ
// ============================================
function generateWateringTask(plant, library, events, weather, stage) {
  const stageInfo = STAGE_INFO[stage];
  const lastWatering = events.find(e => e.plant_id === plant.id && e.event_type === 'water');
  const refDate = lastWatering?.event_date || plant.planted_date;
  const daysSince = daysBetween(refDate, today());
  
  let baseInterval = library.watering_interval_days || 3;
  let adjustedInterval = baseInterval / stageInfo.watering_mult;
  let needWater = daysSince >= adjustedInterval;
  let contextNotes = [];
  
  if (weather) {
    // Дощ скасовує полив
    if (weather.today_rain >= 5 || weather.tomorrow_rain >= 5) {
      return null;
    }
    if (weather.last_3_days_rain >= (library.watering_liters_per_m2 || 15) * 0.7) {
      return null;
    }
    
    // Спека — частіше
    if (weather.today_max >= (library.heat_stress_temp || 32)) {
      adjustedInterval = baseInterval * 0.5;
      needWater = daysSince >= adjustedInterval;
      contextNotes.push(`🔥 Спека ${weather.today_max}°C — ґрунт висихає швидше`);
    }
    
    // Сильна спека — подвійна норма
    if (weather.today_max >= 35) {
      contextNotes.push(`Краще полити ввечері, інакше листя згорить`);
    }
  }
  
  if (!needWater) return null;
  
  // Анти-правило: не поливаємо перед заморозками
  if (weather && weather.tomorrow_min < (library.frost_tolerance_c || 0) + 2) {
    return null;
  }
  
  const liters = Math.round((library.watering_liters_per_m2 || 10) * (plant.area_m2 || 1));
  const recommendedTime = (weather && weather.today_max > 28)
    ? 'Ввечері після 18:00 — вдень згорить листя'
    : 'Вранці (6:00-9:00) або ввечері (після 18:00)';
  
  const explanation = [
    `Минуло ${daysSince} днів з поливу (норма для стадії "${stageInfo.label}": кожні ${Math.round(adjustedInterval)} днів).`,
    `На стадії ${stageInfo.emoji} ${stageInfo.label.toLowerCase()} потрібно ${stageInfo.watering_mult > 1 ? 'більше' : stageInfo.watering_mult < 1 ? 'менше' : 'стандартно'} води.`,
    ...contextNotes
  ].join(' ');
  
  return {
    task_type: 'water',
    title: `💧 Полити ${plant.custom_name || library.name_uk}`,
    action_description: `${liters} л води під корінь`,
    explanation_text: explanation,
    priority: (weather && weather.today_max > 32) ? 'high' : 'normal',
    recommended_time: recommendedTime
  };
}

// ============================================
// 🌿 ПРАВИЛО 2: ПІДЖИВЛЕННЯ ЗА СТАДІЄЮ
// ============================================
function generateFeedingTask(plant, library, events, stage) {
  const stageInfo = STAGE_INFO[stage];
  
  // На стадії розсади і дозрівання не підживлюємо
  if (stageInfo.feeding === 'none') return null;
  if (!library.feeding_interval_days || library.feeding_interval_days === 0) return null;
  
  const lastFeeding = events.find(e => e.plant_id === plant.id && e.event_type === 'feed');
  const refDate = lastFeeding?.event_date || plant.planted_date;
  const daysSince = daysBetween(refDate, today());
  
  if (daysSince < library.feeding_interval_days) return null;
  
  const feedingTypes = {
    high_n: {
      label: 'Азотне (N)',
      product: 'Аміачна селітра або настій кропиви',
      why: 'Стимулює ріст зеленої маси — стебла і листя'
    },
    high_p: {
      label: 'Фосфорне (P)',
      product: 'Суперфосфат або кісткове борошно',
      why: 'Потрібен для цвітіння і формування кореневої системи'
    },
    high_k: {
      label: 'Калійне (K)',
      product: 'Сульфат калію або деревна зола (1 склянка на 10 л)',
      why: 'Покращує смак плодів, підвищує стійкість до хвороб'
    }
  };
  
  const feeding = feedingTypes[stageInfo.feeding];
  
  return {
    task_type: 'feed',
    title: `🌿 Підживити ${plant.custom_name || library.name_uk} (${feeding.label})`,
    action_description: feeding.product,
    explanation_text: `Стадія ${stageInfo.emoji} ${stageInfo.label.toLowerCase()} — ${feeding.why}. Минуло ${daysSince} днів з останнього підживлення.`,
    priority: 'normal',
    recommended_time: 'Ввечері після поливу — так коріння краще засвоїть'
  };
}

// ============================================
// 🍎 ПРАВИЛО 3: ЗБІР УРОЖАЮ
// ============================================
function generateHarvestTask(plant, library, events, stage) {
  if (stage !== 'mature') return null;
  
  const daysPlanted = daysBetween(plant.planted_date, today());
  const progress = (daysPlanted / library.vegetation_days) * 100;
  
  const todayStr = today();
  const harvestedToday = events.some(
    e => e.plant_id === plant.id && e.event_type === 'harvest' && e.event_date === todayStr
  );
  if (harvestedToday) return null;
  
  return {
    task_type: 'harvest',
    title: `🍎 Час збирати ${plant.custom_name || library.name_uk}!`,
    action_description: 'Зібрати стиглі плоди',
    explanation_text: `Пройшло ${daysPlanted} з ${library.vegetation_days} днів вегетації (${Math.round(progress)}%). ${library.harvest_signs || 'Перевірте стиглість.'} Збирайте вранці — плоди найсоковитіші.`,
    priority: 'high',
    recommended_time: 'Вранці 6:00-9:00'
  };
}

// ============================================
// ❄️ ПРАВИЛО 4: АЛЕРТ НА ЗАМОРОЗКИ
// ============================================
function generateFrostAlert(plant, library, weather, stage) {
  if (!weather) return null;
  if (weather.tomorrow_min >= 3) return null;
  
  const frostTolerance = library.frost_tolerance_c ?? 0;
  if (weather.tomorrow_min >= frostTolerance + 2) return null;
  
  const isYoung = stage === 'seedling' || stage === 'growing';
  const severity = (stage === 'flowering' || stage === 'fruiting') ? 'critical' : 'high';
  
  return {
    task_type: 'alert',
    title: `🚨 ЗАМОРОЗКИ ${weather.tomorrow_min}°C! Вкрий ${plant.custom_name || library.name_uk}`,
    action_description: 'Накрити агроволокном або плівкою до 18:00',
    explanation_text: `${library.name_uk} витримує до ${frostTolerance}°C. Завтра вночі ${weather.tomorrow_min}°C. ${isYoung ? 'Молоді рослини особливо вразливі.' : 'Квіти і плоди можуть постраждати.'} Полийте ввечері — волога тримає тепло.`,
    priority: severity,
    recommended_time: 'Сьогодні до 18:00'
  };
}

// ============================================
// 🔥 ПРАВИЛО 5: АЛЕРТ НА СПЕКУ
// ============================================
function generateHeatAlert(plant, library, weather, stage) {
  if (!weather) return null;
  if (weather.today_max < (library.heat_stress_temp || 32)) return null;
  
  const sensitiveCrops = ['салат', 'шпинат', 'редис', 'капуста', 'полуниця'];
  const isSensitive = sensitiveCrops.some(c => library.name_uk.toLowerCase().includes(c));
  
  const actions = [
    'Полити ввечері (не вдень — згорить листя)',
    'НЕ підживлювати — коріння в стресі не засвоїть',
  ];
  
  if (isSensitive) {
    actions.push('Затінити агроволокном або щитами');
  }
  
  if (weather.heat_streak >= 3) {
    actions.push('Мульчувати 5-10 см соломи — збереже вологу');
  }
  
  return {
    task_type: 'alert',
    title: `🔥 Спека ${weather.today_max}°C! Захисти ${plant.custom_name || library.name_uk}`,
    action_description: actions.join('. ') + '.',
    explanation_text: `Температура вище критичної для ${library.name_uk} (${library.heat_stress_temp}°C). У спеку рослини в стресі, можуть скинути зав'язь. ${weather.heat_streak >= 3 ? `Спека триває ${weather.heat_streak} днів — ситуація критична.` : ''}`,
    priority: 'high',
    recommended_time: 'Ввечері після 18:00'
  };
}

// ============================================
// 🍄 ПРАВИЛО 6: РИЗИК ХВОРОБ (фітофтора тощо)
// ============================================
function generateDiseaseAlert(plant, library, weather, stage) {
  if (!weather) return null;
  
  // Фітофтора: пасльонові + волога + прохолода
  const solanaceae = ['Томат', 'Картопля', 'Перець', 'Баклажан'];
  const isSolanaceae = solanaceae.includes(library.name_uk);
  
  if (isSolanaceae && weather.last_7_days_rain > 30 && weather.today_max < 25) {
    return {
      task_type: 'alert',
      title: `🍄 Високий ризик фітофтори! ${plant.custom_name || library.name_uk}`,
      action_description: 'Профілактично обробити мідьвмісним препаратом (Хом, Оксихом)',
      explanation_text: `${library.name_uk} + ${Math.round(weather.last_7_days_rain)}мм дощів за тиждень + прохолода = ідеальні умови для фітофтори. Також: обріж нижнє листя (торкається землі), покращ вентиляцію.`,
      priority: 'high',
      recommended_time: 'В суху погоду, вранці'
    };
  }
  
  // Борошниста роса: гарбузові + спека вдень + прохолодні ночі
  const cucurbitaceae = ['Огірок', 'Кабачок', 'Гарбуз', 'Диня'];
  const isCucurbit = cucurbitaceae.includes(library.name_uk);
  
  if (isCucurbit && weather.today_max > 28 && weather.today_min < 15 && weather.last_3_days_rain < 5) {
    return {
      task_type: 'alert',
      title: `🌫 Ризик борошнистої роси! ${plant.custom_name || library.name_uk}`,
      action_description: 'Обприскати розчином соди (1 ст.л. на 10 л) або фунгіцидом',
      explanation_text: `Спека вдень + прохолодні ночі + сухо = ідеальні умови для борошнистої роси на ${library.name_uk.toLowerCase()}. Ознаки: білий наліт на листі.`,
      priority: 'normal',
      recommended_time: 'Ввечері'
    };
  }
  
  return null;
}

// ============================================
// 🐛 ПРАВИЛО 7: ШКІДНИКИ ПО СЕЗОНУ
// ============================================
function generatePestAlert(plant, library) {
  const month = getCurrentMonth();
  
  const pestPatterns = {
    'Картопля': { months: [5, 6, 7], pest: 'Колорадський жук', action: 'Збирати вручну або обробити біопрепаратом (Актофіт)' },
    'Капуста': { months: [5, 6, 7, 8], pest: 'Гусінь білянки', action: 'Оглядати листя, збирати гусінь, накрити сіткою' },
    'Морква': { months: [5, 6], pest: 'Морквяна муха', action: 'Посадити поруч цибулю, накрити агроволокном' },
    'Цибуля': { months: [5, 6], pest: 'Цибулева муха', action: 'Посипати золою між рядками' },
    'Томат': { months: [7, 8], pest: 'Білокрилка', action: 'Жовті клейові пастки, обробити інсектицидом' },
  };
  
  const pattern = pestPatterns[library.name_uk];
  if (!pattern || !pattern.months.includes(month)) return null;
  
  return {
    task_type: 'alert',
    title: `🐛 Увага: ${pattern.pest} на ${plant.custom_name || library.name_uk}`,
    action_description: pattern.action,
    explanation_text: `У ${month}-му місяці активний ${pattern.pest}. Оглянь рослини (особливо нижню сторону листя). Профілактика краща за лікування.`,
    priority: 'normal',
    recommended_time: 'Вранці'
  };
}

// ============================================
// 😰 ПРАВИЛО 8: РОСЛИНА В СТРЕСІ
// ============================================
function generateStressAlert(plant, library, healthScore, issues) {
  if (healthScore >= 70) return null;
  
  return {
    task_type: 'alert',
    title: `😰 ${plant.custom_name || library.name_uk} потребує уваги (Health: ${Math.round(healthScore)}%)`,
    action_description: 'Переглянути історію догляду і відновити графік',
    explanation_text: `Проблеми: ${issues.join(', ')}. Рослина в стресі — потрібен відновлювальний догляд. Почни з поливу, через 3 дні — легке підживлення.`,
    priority: 'high',
    recommended_time: 'Сьогодні'
  };
}

// ============================================
// 📋 ПРАВИЛО 9: ЩОТИЖНЕВИЙ ЧЕК-АП
// ============================================
function generateWeeklyCheckup(dayOfWeek, plants) {
  if (dayOfWeek !== 6) return null; // тільки субота
  if (plants.length === 0) return null;
  
  return {
    task_type: 'general',
    title: '🔍 Щотижневий огляд городу (15 хв)',
    action_description: 'Обійти ділянку, оглянути всі рослини',
    explanation_text: 'Регулярний огляд — найкращий спосіб виявити проблему поки вона маленька. Перевір: листя (колір, плями), ґрунт (вологість на 5 см), бур\'яни, шкідники. Сфотографуй прогрес.',
    priority: 'normal',
    recommended_time: 'Субота вранці'
  };
}

// ============================================
// 🎯 ГОЛОВНА ФУНКЦІЯ
// ============================================
async function generateDailyTasks() {
  console.log('🧠 Запуск Rule Engine 2.0...\n');
  console.log(`📅 Сьогодні: ${today()}\n`);
  
  // 1. Отримуємо регіон і погоду
  const { data: profile } = await supabase
    .from('profiles')
    .select('region')
    .limit(1)
    .maybeSingle();
  
  const cityName = profile?.region?.split(' ')[0] || process.env.USER_REGION || 'Київ';
  const coords = UKRAINE_CITIES[cityName] || UKRAINE_CITIES['Київ'];
  
  console.log(`🌤 Отримую погоду для ${cityName}...`);
  const weather = await getWeatherForecast(coords.lat, coords.lon);
  
  if (weather) {
    console.log(`✅ Сьогодні: ${weather.today_max}°C (мін ${weather.today_min}°C), дощ ${weather.today_rain}мм`);
    console.log(`   Завтра: ${weather.tomorrow_max}°C, дощ ${weather.tomorrow_rain}мм`);
    console.log(`   За 7 днів: ${Math.round(weather.last_7_days_rain)}мм опадів\n`);
  }
  
  // 2. Отримуємо рослини
  console.log('📖 Читаю рослини...');
  const { data: plants, error: plantsError } = await supabase
    .from('my_plants')
    .select('*, plant_library(*)')
    .eq('status', 'active');
  
  if (plantsError) {
    console.error('❌ Помилка:', plantsError.message);
    return;
  }
  
  if (!plants || plants.length === 0) {
    console.log('⚠️  Немає активних рослин');
    return;
  }
  
  console.log(`✅ Знайдено ${plants.length} рослин\n`);
  
  // 3. Отримуємо історію подій
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  
  const { data: events } = await supabase
    .from('events_log')
    .select('*')
    .gte('event_date', sixtyDaysAgo.toISOString().split('T')[0]);
  
  // 4. Очищаємо старі задачі
  await supabase
    .from('tasks')
    .delete()
    .eq('due_date', today())
    .eq('is_completed', false);
  
  // 5. Генеруємо задачі
  console.log('🧠 Генерую задачі з урахуванням стадій, погоди та історії...\n');
  const newTasks = [];
  const dayOfWeek = new Date().getDay();
  
  for (const plant of plants) {
    const library = plant.plant_library;
    if (!library) continue;
    
    const stage = getGrowthStage(plant, library);
    const { score: healthScore, issues } = calculateHealthScore(plant, library, events || [], weather);
    
    // Оновлюємо health_score і growth_stage в БД
    await supabase
      .from('my_plants')
      .update({
        health_score: healthScore,
        growth_stage: stage,
        last_health_update: new Date().toISOString()
      })
      .eq('id', plant.id);
    
    // Генеруємо задачі
    const rules = [
      () => generateWateringTask(plant, library, events || [], weather, stage),
      () => generateFeedingTask(plant, library, events || [], stage),
      () => generateHarvestTask(plant, library, events || [], stage),
      () => generateFrostAlert(plant, library, weather, stage),
      () => generateHeatAlert(plant, library, weather, stage),
      () => generateDiseaseAlert(plant, library, weather, stage),
      () => generatePestAlert(plant, library),
      () => generateStressAlert(plant, library, healthScore, issues),
    ];
    
    for (const rule of rules) {
      const task = rule();
      if (task) {
        newTasks.push({
          ...task,
          plant_id: plant.id,
          user_id: plant.user_id,
        });
      }
    }
  }
  
  // Щотижневий чек-ап
  const checkup = generateWeeklyCheckup(dayOfWeek, plants);
  if (checkup) {
    newTasks.push({ ...checkup, plant_id: null, user_id: plants[0].user_id });
  }
  
  console.log(`✅ Згенеровано ${newTasks.length} задач\n`);
  
  if (newTasks.length === 0) {
    console.log('🎉 Немає задач — всі рослини доглянуті!');
    return;
  }
  
  // 6. Зберігаємо
  const tasksToInsert = newTasks.map(t => ({ ...t, due_date: today() }));
  
  const { error: insertError } = await supabase
    .from('tasks')
    .insert(tasksToInsert);
  
  if (insertError) {
    console.error('❌ Помилка збереження:', insertError.message);
    return;
  }
  
  // 7. Виводимо гарно
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 ТВОЇ РОЗУМНІ ЗАДАЧІ НА СЬОГОДНІ:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Групуємо по пріоритетах
  const urgent = tasksToInsert.filter(t => t.priority === 'high' || t.priority === 'urgent');
  const normal = tasksToInsert.filter(t => t.priority === 'normal');
  
  if (urgent.length > 0) {
    console.log('🚨 ТЕРМІНОВО:\n');
    urgent.forEach((task, i) => {
      console.log(`${i + 1}. ${task.title}`);
      console.log(`   📝 ${task.action_description}`);
      console.log(`   💡 ${task.explanation_text}`);
      console.log(`   ⏰ ${task.recommended_time}\n`);
    });
  }
  
  if (normal.length > 0) {
    console.log('📌 НА СЬОГОДНІ:\n');
    normal.forEach((task, i) => {
      console.log(`${i + 1}. ${task.title}`);
      console.log(`   📝 ${task.action_description}`);
      console.log(`   💡 ${task.explanation_text}\n`);
    });
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Збережено в БД. Відкрий додаток щоб побачити.`);
}

// Запуск
generateDailyTasks().catch(err => {
  console.error('💥 Критична помилка:', err);
  process.exit(1);
});