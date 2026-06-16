// supabase-client.js
// Модуль для з'єднання з базою даних Supabase

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Завантажуємо змінні з файлу .env
dotenv.config();

// Перевіряємо що ключі є
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE) {
  console.error('❌ Помилка: Не знайдено SUPABASE_URL або SUPABASE_SERVICE_ROLE у файлі .env');
  process.exit(1);
}

// Створюємо клієнт з service_role ключем
// service_role = "адмінський" ключ, який може читати/писати всі дані
// Використовуємо його тільки локально, ніколи в браузері!
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

console.log('✅ Клієнт Supabase створено успішно');