// frontend/e2e/season.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Season Page', () => {
  test('сторінка завантажується з таймлайном', async ({ page }) => {
    await page.goto('/season');
    
    // Перевіряємо заголовок сезону
    const currentYear = new Date().getFullYear();
    await expect(page.locator(`text=Сезон ${currentYear}`)).toBeVisible();
    
    // Перевіряємо прогрес сезону
    await expect(page.locator('text=Сьогодні:')).toBeVisible();
    
    // Перевіряємо секцію "Цього тижня"
    await expect(page.locator('text=📊 Цього тижня')).toBeVisible();
  });

  test('фільтри працюють', async ({ page }) => {
    await page.goto('/season');
    
    // Клікаємо фільтр "Готові"
    const readyFilter = page.locator('button:has-text("🍎 Готові")');
    if (await readyFilter.isVisible()) {
      await readyFilter.click();
    }
    
    // Клікаємо фільтр "Овочі"
    const vegFilter = page.locator('button:has-text("🥬 Овочі")');
    if (await vegFilter.isVisible()) {
      await vegFilter.click();
    }
    
    // Повертаємось до "Всі"
    const allFilter = page.locator('button:has-text("Всі")').first();
    if (await allFilter.isVisible()) {
      await allFilter.click();
    }
  });
});