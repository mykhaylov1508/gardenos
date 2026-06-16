// generate-tasks.js
// 🧠 Rule Engine — мозок системи GardenOS
// Генерує щоденні задачі на основі:
//   - Бібліотеки рослин (норми поливу, підживлення)
//   - Історії подій (коли останній раз поливав)
//   - Погоди (якщо інтегровано)

import { supabase } from './supabase-client.js';

// ============================================
// 📅 ХЕЛПЕРИ ДЛЯ РОБОТИ З ДАТАМИ
// ============================================

function today() {
  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
}

function daysBetween(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2 - d1);
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

// ============================================
// 💧 ПРАВИЛО 1: ГЕНЕРАЦІЯ ЗАДАЧІ НА ПОЛИВ
// ============================================

function generateWateringTask(plant, library, events) {
  // Шукаємо останній полив для цієї рослини
  const lastWatering = events.find(
    e => e.plant_id === plant.id && e.event_type === 'water'
  );
  
  // Скільки днів пройшло з останнього поливу (або з посадки якщо не поливали)
  const referenceDate = lastWatering?.event_date || plant.planted_date;
  const daysSince = daysBetween(referenceDate, today());
  
  // Перевіряємо чи час поливати
  const needWater = daysSince >= library.watering_interval_days;
  
  if (!needWater) return null;
  
  // Формуємо зрозуміле пояснення "ЧОМУ"
  const explanation = `Минуло ${daysSince} днів з останнього поливу (норма: кожні ${library.watering_interval_days} днів). ${library.name_uk} потребує ${library.watering_liters_per_m2} л/м² води.`;
  
  return {
    task_type: 'water',
    title: `💧 Полити ${plant.custom_name || library.name_uk}`,
    action_description: `Вилити ~${library.watering_liters_per_m2} літрів води під корінь`,
    explanation_text: explanation,
    priority: 'normal',
    recommended_time: 'Вранці (до 9:00) або ввечері (після 18:00)'
  };
}

// ============================================
// 🌿 ПРАВИЛО 2: ГЕНЕРАЦІЯ ЗАДАЧІ НА ПІДЖИВЛЕННЯ
// ============================================

function generateFeedingTask(plant, library, events) {
  // Якщо для цієї культури підживлення не потрібне
  if (!library.feeding_interval_days || library.feeding_interval_days === 0) {
    return null;
  }
  
  const lastFeeding = events.find(
    e => e.plant_id === plant.id && e.event_type === 'feed'
  );
  
  const referenceDate = lastFeeding?.event_date || plant.planted_date;
  const daysSince = daysBetween(referenceDate, today());
  
  if (daysSince < library.feeding_interval_days) return null;
  
  // Визначаємо стадію росту для вибору типу добрива
  const daysPlanted = daysBetween(plant.planted_date, today());
  const progress = daysPlanted / library.vegetation_days;
  
  let feedingReason, fertilizerType;
  if (progress < 0.3) {
    feedingReason = 'Фаза активного росту зеленої маси — потрібен азот';
    fertilizerType = 'Азотне добриво (аміачна селітра, настій кропиви)';
  } else if (progress < 0.6) {
    feedingReason = 'Почалося цвітіння — потрібен фосфор';
    fertilizerType = 'Фосфорне добриво (суперфосфат)';
  } else {
    feedingReason = 'Формуються плоди — потрібен калій';
    fertilizerType = 'Калійне добриво (сульфат калію, деревна зола)';
  }
  
  return {
    task_type: 'feed',
    title: `🌿 Підживити ${plant.custom_name || library.name_uk}`,
    action_description: fertilizerType,
    explanation_text: `${feedingReason}. Минуло ${daysSince} днів з останнього підживлення (норма: кожні ${library.feeding_interval_days} днів).`,
    priority: 'normal',
    recommended_time: 'Ввечері після поливу'
  };
}

// ============================================
// 🍎 ПРАВИЛО 3: ГЕНЕРАЦІЯ ЗАДАЧІ НА ЗБІР УРОЖАЮ
// ============================================

function generateHarvestTask(plant, library, events) {
  if (!plant.planted_date || !library.vegetation_days) return null;
  
  const daysPlanted = daysBetween(plant.planted_date, today());
  const progressPercent = (daysPlanted / library.vegetation_days) * 100;
  
  // Готовий до збору якщо >= 90% вегетаційного періоду
  if (progressPercent < 90) return null;
  
  // Перевіряємо чи не збирали сьогодні
  const todayStr = today();
  const harvestedToday = events.some(
    e => e.plant_id === plant.id && 
         e.event_type === 'harvest' && 
         e.event_date === todayStr
  );
  
  if (harvestedToday) return null;
  
  return {
    task_type: 'harvest',
    title: `🍎 Час збирати ${plant.custom_name || library.name_uk}!`,
    action_description: 'Зрізати/зірвати стиглі плоди',
    explanation_text: `Пройшло ${daysPlanted} з ${library.vegetation_days} днів вегетації (${Math.round(progressPercent)}%). ${library.harvest_signs || 'Перевірте стиглість плодів.'}`,
    priority: 'high',
    recommended_time: 'Вранці (6:00-9:00) — плоди найсоковитіші'
  };
}

// ============================================
// 🔍 ПРАВИЛО 4: ЩОТИЖНЕВИЙ ОГЛЯД
// ============================================

function generateWeeklyCheckup(dayOfWeek) {
  // Субота = 6 в JavaScript
  if (dayOfWeek !== 6) return null;
  
  return {
    task_type: 'general',
    title: '🔍 Щотижневий огляд городу',
    action_description: 'Обійти ділянку 15 хвилин',
    explanation_text: 'Регулярний огляд — найкращий спосіб виявити проблему поки вона маленька. Перевірте листя, ґрунт на вологість, наявність шкідників.',
    priority: 'normal',
    recommended_time: 'Субота вранці'
  };
}

// ============================================
// 🎯 ГОЛОВНА ФУНКЦІЯ — ЗАПУСК RULE ENGINE
// ============================================

async function generateDailyTasks() {
  console.log('🌅 Запуск Rule Engine...\n');
  console.log(`📅 Сьогодні: ${today()}`);
  
  // 1. Отримуємо всі активні рослини користувача
  console.log('\n📖 Читаю рослини з бази даних...');
  const { data: plants, error: plantsError } = await supabase
    .from('my_plants')
    .select(`
      *,
      plant_library(*)
    `)
    .eq('status', 'active');
  
  if (plantsError) {
    console.error('❌ Помилка читання рослин:', plantsError.message);
    return;
  }
  
  if (!plants || plants.length === 0) {
    console.log('⚠️  У тебе ще немає жодної рослини в системі.');
    console.log('💡 Додай першу рослину через Supabase Table Editor (таблиця my_plants),');
    console.log('   або зачекай поки зробимо інтерфейс для додавання.');
    return;
  }
  
  console.log(`✅ Знайдено ${plants.length} активних рослин`);
  
  // 2. Отримуємо історію подій за останні 60 днів
  console.log('\n📖 Читаю історію подій...');
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  
  const { data: events, error: eventsError } = await supabase
    .from('events_log')
    .select('*')
    .gte('event_date', sixtyDaysAgo.toISOString().split('T')[0]);
  
  if (eventsError) {
    console.error('❌ Помилка читання подій:', eventsError.message);
    return;
  }
  
  console.log(`✅ Знайдено ${(events || []).length} подій за останні 60 днів`);
  
  // 3. Видаляємо старі НЕвиконані задачі за сьогодні
  // (щоб не було дублікатів якщо скрипт запустити двічі)
  console.log('\n🧹 Очищаю старі задачі на сьогодні...');
  await supabase
    .from('tasks')
    .delete()
    .eq('due_date', today())
    .eq('is_completed', false);
  
  // 4. Генеруємо задачі для кожної рослини
  console.log('\n🧠 Генерую задачі...');
  const newTasks = [];
  const dayOfWeek = new Date().getDay();
  
  for (const plant of plants) {
    const library = plant.plant_library;
    
    // Правило 1: Полив
    const waterTask = generateWateringTask(plant, library, events || []);
    if (waterTask) newTasks.push({ ...waterTask, plant_id: plant.id, user_id: plant.user_id });
    
    // Правило 2: Підживлення
    const feedTask = generateFeedingTask(plant, library, events || []);
    if (feedTask) newTasks.push({ ...feedTask, plant_id: plant.id, user_id: plant.user_id });
    
    // Правило 3: Збір урожаю
    const harvestTask = generateHarvestTask(plant, library, events || []);
    if (harvestTask) newTasks.push({ ...harvestTask, plant_id: plant.id, user_id: plant.user_id });
  }
  
  // Правило 4: Щотижневий огляд (загальна задача)
  const checkup = generateWeeklyCheckup(dayOfWeek);
  if (checkup && plants.length > 0) {
    newTasks.push({ ...checkup, plant_id: null, user_id: plants[0].user_id });
  }
  
  console.log(`✅ Згенеровано ${newTasks.length} задач на сьогодні\n`);
  
  if (newTasks.length === 0) {
    console.log('🎉 Сьогодні немає задач! Всі рослини доглянуті.');
    return;
  }
  
  // 5. Зберігаємо задачі в базу
  console.log('💾 Зберігаю задачі в базу даних...\n');
  const tasksToInsert = newTasks.map(task => ({
    ...task,
    due_date: today()
  }));
  
  const { data: insertedTasks, error: insertError } = await supabase
    .from('tasks')
    .insert(tasksToInsert)
    .select();
  
  if (insertError) {
    console.error('❌ Помилка збереження задач:', insertError.message);
    return;
  }
  
  // 6. Виводимо красивий список
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 ТВОЇ ЗАДАЧІ НА СЬОГОДНІ:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  insertedTasks.forEach((task, i) => {
    console.log(`${i + 1}. ${task.title}`);
    console.log(`   📝 Що зробити: ${task.action_description}`);
    console.log(`   💡 Чому: ${task.explanation_text}`);
    console.log(`   ⏰ Коли: ${task.recommended_time}`);
    console.log(`   🔥 Пріоритет: ${task.priority}`);
    console.log('');
  });
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Готово! ${insertedTasks.length} задач збережено в таблицю "tasks".`);
  console.log('💡 Тепер можеш подивитись їх у Supabase Table Editor.');
}

// Запускаємо
generateDailyTasks().catch(err => {
  console.error('💥 Критична помилка:', err);
  process.exit(1);
});