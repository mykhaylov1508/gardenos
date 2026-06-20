// frontend/e2e/plants.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Plants Library', () => {
  test('бібліотека завантажується', async ({ page }) => {
    await page.goto('/plants');
    
    await expect(page.locator('text=🌱 Бібліотека культур')).toBeVisible();
    
    // Перевіряємо що хоча б одна рослина відображається
    await expect(page.locator('text=Томат').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Огірок').first()).toBeVisible();
  });
});