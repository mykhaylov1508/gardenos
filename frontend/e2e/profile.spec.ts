// frontend/e2e/profile.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Profile Page', () => {
  test('сторінка налаштувань завантажується', async ({ page }) => {
    await page.goto('/settings');
    
    await expect(page.locator('text=⚙️ Налаштування')).toBeVisible();
    
    // Перевіряємо секції
    await expect(page.locator('text=Особиста інформація')).toBeVisible();
    await expect(page.locator('text=Регіон')).toBeVisible();
    await expect(page.locator('text=Інформація про ділянку')).toBeVisible();
    await expect(page.locator('text=Сім\'я')).toBeVisible();
    
    // Перевіряємо кнопку збереження
    await expect(page.locator('button:has-text("Зберегти зміни")')).toBeVisible();
  });
});