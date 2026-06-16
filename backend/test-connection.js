// test-connection.js
// Тимчасовий файл для перевірки з'єднання з базою

import { supabase } from './supabase-client.js';

async function testConnection() {
  console.log('🔌 Тестую з\'єднання з Supabase...\n');
  
  // Спробуємо прочитати бібліотеку рослин
  const { data, error } = await supabase
    .from('plant_library')
    .select('name_uk, category')
    .limit(5);
  
  if (error) {
    console.error('❌ Помилка з\'єднання:', error.message);
    process.exit(1);
  }
  
  console.log('✅ З\'єднання працює! Ось 5 культур з бібліотеки:\n');
  data.forEach(plant => {
    console.log(`  🌱 ${plant.name_uk} (${plant.category})`);
  });
  
  console.log('\n🎉 Все готово для створення Rule Engine!');
}

testConnection();