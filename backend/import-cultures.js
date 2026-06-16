// backend/import-cultures.js
import { supabase } from './supabase-client.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Отримуємо шлях до поточної директорії
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CULTURES_DIR = path.join(__dirname, '..', 'data', 'cultures');

async function importCultures() {
  console.log('🌱 Починаю імпорт бібліотеки рослин до Supabase...\n');

  // Перевіряємо чи існує папка
  if (!fs.existsSync(CULTURES_DIR)) {
    console.error(`❌ Папка не знайдена: ${CULTURES_DIR}`);
    console.log('💡 Спочатку запусти Python-скрипт для генерації даних.');
    return;
  }

  // Читаємо всі JSON файли
  const files = fs.readdirSync(CULTURES_DIR).filter(f => f.endsWith('.json'));
  console.log(`📂 Знайдено ${files.length} файлів культур.\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const file of files) {
    const filePath = path.join(CULTURES_DIR, file);
    const raw = fs.readFileSync(filePath, 'utf-8');
    
    try {
      const data = JSON.parse(raw);
      const cultureName = data.name_uk;

      // Перевіряємо, чи рослина вже існує в БД
      const { data: existing, error: fetchError } = await supabase
        .from('plant_library')
        .select('id')
        .eq('name_uk', cultureName)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existing) {
        // Оновлюємо існуючий запис
        const { error: updateError } = await supabase
          .from('plant_library')
          .update(data)
          .eq('id', existing.id);
        
        if (updateError) throw updateError;
        console.log(`✅ Оновлено: ${cultureName}`);
      } else {
        // Створюємо новий запис
        const { error: insertError } = await supabase
          .from('plant_library')
          .insert(data);
        
        if (insertError) throw insertError;
        console.log(`✅ Додано: ${cultureName}`);
      }
      
      successCount++;
      
    } catch (err) {
      console.error(`❌ Помилка обробки файлу ${file}:`, err.message);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`🎉 Імпорт завершено!`);
  console.log(`✅ Успішно: ${successCount}`);
  console.log(`❌ Помилок: ${errorCount}`);
  console.log('='.repeat(50));
}

importCultures();