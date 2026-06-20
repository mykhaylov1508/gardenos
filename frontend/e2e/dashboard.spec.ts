// frontend/e2e/dashboard.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Dashboard Page', () => {
  test('сторінка завантажується і показує основні елементи', async ({ page }) => {
    await page.goto('/');
    
    // Перевіряємо заголовок
    await expect(page.locator('text=🌿 Добрий день')).toBeVisible();
    
    // Перевіряємо що віджет погоди завантажився
    await expect(page.locator('text=Погода')).toBeVisible({ timeout: 10000 });
    
    // Перевіряємо "Пульс садиби"
    await expect(page.locator('text=Пульс садиби')).toBeVisible();
    
    // Перевіряємо що статистика відображається
    await expect(page.getByText('Рослин', { exact: true }).first()).toBeVisible();
    await expect(page.locator('text=Задач сьогодні')).toBeVisible();
  });

  test('кнопка "Додати рослину" веде на правильну сторінку', async ({ page }) => {
    await page.goto('/');
    await page.click('text=➕ Додати рослину');
    await expect(page).toHaveURL('/plants/new');
  });

  test('кнопка "Мій город" веде на правильну сторінку', async ({ page }) => {
    await page.goto('/');
    await page.click('text=🗺 Мій город');
    await expect(page).toHaveURL('/garden');
  });
});