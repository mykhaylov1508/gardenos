import { test, expect } from '@playwright/test';

test.describe('Map Page', () => {
  test('сторінка завантажується з картою', async ({ page }) => {
    await page.goto('/map');
    await expect(page.locator('text=🗺 Карта городу')).toBeVisible();
    // Перевіряємо наявність кнопки Додати (завжди є)
    await expect(page.getByRole('button', { name: 'Додати' }).first()).toBeVisible();
  });

  test('кнопка "Додати" веде на NewPlantPage', async ({ page }) => {
    await page.goto('/map');
    await page.getByRole('button', { name: 'Додати' }).first().click();
    await expect(page).toHaveURL(/plants\/new/);
  });
});