import { test as setup, expect } from '@playwright/test';

const authFile = 'e2e/.auth/user.json';

// ⚠️ ЗМІНИ на свої тестові credentials!
const TEST_EMAIL = 'test@gardenos.com';
const TEST_PASSWORD = 'Test123456';

setup('authenticate', async ({ page }) => {
  console.log('🔐 Починаю авторизацію...');
  console.log(`📧 Email: ${TEST_EMAIL}`);
  
  await page.goto('/login');
  
  // Чекаємо що форма логіну завантажилась
  await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });
  
  // Заповнюємо форму
  await page.fill('input[type="email"]', TEST_EMAIL);
  await page.fill('input[type="password"]', TEST_PASSWORD);
  
  // Клікаємо "Увійти"
  await page.click('button[type="submit"]');
  
  // Чекаємо редіректу з логіну (означає успішний логін)
  await page.waitForURL('**/', { timeout: 15000 });
  
  // Перевіряємо що ми дійсно на головній (не на логіні)
  await expect(page.locator('text=GardenOS')).toBeVisible({ timeout: 10000 });
  
  console.log('✅ Авторизація успішна!');
  
  // Зберігаємо стан
  await page.context().storageState({ path: authFile });
  console.log(`💾 Стан збережено в ${authFile}`);
});