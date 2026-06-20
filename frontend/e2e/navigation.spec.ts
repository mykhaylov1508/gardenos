// frontend/e2e/navigation.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Bottom Navigation', () => {
  test('всі вкладки працюють', async ({ page }) => {
    await page.goto('/');
    
    // Перевіряємо що нижня навігація видима
    const nav = page.locator('nav.fixed.bottom-0');
    await expect(nav).toBeVisible();
    
    // Перевіряємо кожну вкладку
    const tabs = [
      { text: 'Головна', url: '/' },
      { text: 'Задачі', url: '/tasks' },
      { text: 'Планувальник', url: '/planner' },
      { text: 'Сезон', url: '/season' },
      { text: 'Карта', url: '/map' },
      { text: 'Бібліотека', url: '/plants' },
    ];
    
    for (const tab of tabs) {
      await page.click(`nav >> text=${tab.text}`);
      await expect(page).toHaveURL(tab.url);
      await page.waitForTimeout(500); // Даємо час на завантаження
    }
  });
});