import { test, expect } from '@playwright/test';

test.describe('Tasks Page', () => {
  test('сторінка завантажується', async ({ page }) => {
    await page.goto('/tasks');
    await expect(page.locator('text=📋 Задачі на сьогодні')).toBeVisible();
    // Перевіряємо що дата відображається
    const today = new Date().toLocaleDateString('uk-UA', { day: 'numeric' });
    await expect(page.locator(`text=${today}`)).toBeVisible();
  });

  test('має контент (або задачі або повідомлення)', async ({ page }) => {
    await page.goto('/tasks');
    
    // Чекаємо завантаження
    await page.waitForTimeout(1000);
    
    // Перевіряємо що сторінка завантажилась — або є задачі, або є повідомлення
    const hasAnyContent = await page.locator('main, .card, .space-y-4').first().isVisible();
    expect(hasAnyContent).toBeTruthy();
  });
});