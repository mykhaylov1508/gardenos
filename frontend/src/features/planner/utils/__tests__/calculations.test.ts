import { describe, it, expect } from 'vitest';
import { calculateRequiredPlants } from '../calculations';

describe('calculations.ts — Розрахунок кількості', () => {
  it('повертає число більше 0 для сім\'ї з 4 людей', () => {
    const result = calculateRequiredPlants('томат', 4, 4);
    expect(result).toBeGreaterThan(0);
    expect(typeof result).toBe('number');
  });

  it('більша сім\'я = більше рослин', () => {
    const small = calculateRequiredPlants('томат', 2, 4);
    const big = calculateRequiredPlants('томат', 6, 4);
    expect(big).toBeGreaterThan(small);
  });

  it('картоплі потрібно більше ніж томатів', () => {
    const tomatoes = calculateRequiredPlants('томат', 4, 4);
    const potatoes = calculateRequiredPlants('картопля', 4, 4);
    expect(potatoes).toBeGreaterThan(tomatoes);
  });

  it('зелені потрібно менше ніж овочів', () => {
    const tomatoes = calculateRequiredPlants('томат', 4, 4);
    const dill = calculateRequiredPlants('кріп', 4, 4);
    expect(dill).toBeLessThan(tomatoes);
  });
});