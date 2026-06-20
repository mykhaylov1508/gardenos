import { test, expect } from '@playwright/test';

test.describe('Garden Page', () => {
  test('сторінка завантажується', async ({ page }) => {
    await page.goto('/garden');
    await expect(page.locator('text=🗺 Мій Город')).toBeVisible();
    // Використовуємо getByRole з exact: true щоб уникнути strict mode violation
    await expect(page.getByRole('button', { name: 'Додати', exact: true })).toBeVisible();
  });

  test('кнопка "Додати" веде на NewPlantPage', async ({ page }) => {
    await page.goto('/garden');
    await page.getByRole('button', { name: 'Додати', exact: true }).click();
    await expect(page).toHaveURL(/plants\/new/);
  });
});