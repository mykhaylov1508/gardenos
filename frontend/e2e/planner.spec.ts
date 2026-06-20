import { test, expect } from '@playwright/test';

test.describe('Planner Wizard', () => {
  test('повний цикл: ділянка → рослини → результат', async ({ page }) => {
    await page.goto('/planner');
    
    // КРОК 1: Налаштування ділянки
    await expect(page.locator('text=Крок 1 з 3')).toBeVisible();
    // Перевіряємо що є інпути (замість конкретного тексту)
    const widthInput = page.locator('input[type="number"]').first();
    await expect(widthInput).toBeVisible();
    
    // Заповнюємо розміри
    await widthInput.fill('15');
    const inputs = page.locator('input[type="number"]');
    const count = await inputs.count();
    if (count >= 2) {
      await inputs.nth(1).fill('25');
    }
    
    // Переходимо до кроку 2
    const nextButton = page.getByRole('button', { name: /далі|наступний/i }).first();
    if (await nextButton.isVisible()) {
      await nextButton.click();
    }
    
    // КРОК 2: Вибір рослин
    await expect(page.locator('text=Крок 2 з 3')).toBeVisible({ timeout: 5000 });
    
    // Вибираємо першу доступну рослину
    const firstPlant = page.locator('button').filter({ hasText: /томат|огірок|картопля/i }).first();
    if (await firstPlant.isVisible()) {
      await firstPlant.click();
    }
    
    // Переходимо до кроку 3
    const seePlanButton = page.getByRole('button', { name: /побачити план|далі/i }).last();
    if (await seePlanButton.isVisible()) {
      await seePlanButton.click();
    }
    
    // КРОК 3: Результат
    await expect(page.locator('text=Крок 3 з 3')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Твій план саду готовий')).toBeVisible();
    
    // Перевіряємо кнопки дій
    await expect(page.getByRole('button', { name: /зберегти|застосувати/i }).first()).toBeVisible();
  });

  test('кнопка "Мої плани" відкриває список', async ({ page }) => {
    await page.goto('/planner');
    await page.getByRole('button', { name: /мої плани/i }).click();
    await expect(page.locator('text=📂 Збережені плани')).toBeVisible();
  });
});