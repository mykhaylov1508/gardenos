import { describe, it, expect } from 'vitest';
import { generateLayout } from '../layout';

describe('layout.ts — Алгоритм розміщення', () => {
  const baseInput = {
    plot_width_m: 10,
    plot_length_m: 20,
    north_direction: 'top' as const,
    plants: [
      {
        plant_id: '1',
        name_uk: 'томат',
        quantity: 10,
        good_companions: ['базилік'],
        bad_companions: ['картопля'],
      },
    ],
  };

  it('повинен розмістити рослини на ділянці', () => {
    const result = generateLayout(baseInput);
    
    expect(result.beds).toHaveLength(1);
    expect(result.beds[0].name_uk).toBe('томат');
    expect(result.beds[0].planted_quantity).toBe(10);
  });

  it('повинен повернути координати в межах ділянки', () => {
    const result = generateLayout(baseInput);
    const bed = result.beds[0];
    
    expect(bed.x_m).toBeGreaterThanOrEqual(0);
    expect(bed.y_m).toBeGreaterThanOrEqual(0);
    expect(bed.x_m + bed.width_m).toBeLessThanOrEqual(10);
    expect(bed.y_m + bed.length_m).toBeLessThanOrEqual(20);
  });

  it('повинен розмістити вологолюбні біля води', () => {
    const inputWithWater = {
      ...baseInput,
      water_source: { x_m: 5, y_m: 18 }, // Вода внизу
      plants: [
        {
          plant_id: '1',
          name_uk: 'огірок', // висока потреба у воді
          quantity: 10,
          good_companions: [],
          bad_companions: [],
        },
      ],
    };

    const result = generateLayout(inputWithWater);
    const bed = result.beds[0];
    
    // Огірок має бути ближче до низу (y > 10 з 20)
    expect(bed.y_m).toBeGreaterThan(8);
  });

  it('повинен уникати перекриття грядок', () => {
    const multiPlantInput = {
      ...baseInput,
      plants: [
        { plant_id: '1', name_uk: 'томат', quantity: 10, good_companions: [], bad_companions: [] },
        { plant_id: '2', name_uk: 'огірок', quantity: 10, good_companions: [], bad_companions: [] },
        { plant_id: '3', name_uk: 'морква', quantity: 20, good_companions: [], bad_companions: [] },
      ],
    };

    const result = generateLayout(multiPlantInput);
    
    // Перевіряємо що жодні дві грядки не перекриваються
    for (let i = 0; i < result.beds.length; i++) {
      for (let j = i + 1; j < result.beds.length; j++) {
        const a = result.beds[i];
        const b = result.beds[j];
        
        const overlaps = !(
          a.x_m + a.width_m <= b.x_m ||
          b.x_m + b.width_m <= a.x_m ||
          a.y_m + a.length_m <= b.y_m ||
          b.y_m + b.length_m <= a.y_m
        );
        
        expect(overlaps).toBe(false);
      }
    }
  });

  it('повинен рахувати usage_percent правильно', () => {
    const result = generateLayout(baseInput);
    
    const expectedUsed = result.beds.reduce((sum, b) => sum + b.width_m * b.length_m, 0);
    const expectedPercent = Math.round((expectedUsed / 200) * 100);
    
    expect(result.usage_percent).toBe(expectedPercent);
  });

  it('повинен генерувати warning коли не вистачає місця', () => {
    const hugeInput = {
      plot_width_m: 2,
      plot_length_m: 2,
      north_direction: 'top' as const,
      plants: [
        { plant_id: '1', name_uk: 'томат', quantity: 1000, good_companions: [], bad_companions: [] },
      ],
    };

    const result = generateLayout(hugeInput);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('повинен враховувати сумісність (друзів поруч)', () => {
    const friendlyInput = {
      ...baseInput,
      plants: [
        { plant_id: '1', name_uk: 'томат', quantity: 5, good_companions: ['базилік'], bad_companions: [] },
        { plant_id: '2', name_uk: 'базилік', quantity: 5, good_companions: ['томат'], bad_companions: [] },
      ],
    };

    const result = generateLayout(friendlyInput);
    
    // Обидві грядки мають існувати
    expect(result.beds).toHaveLength(2);
    
    // Відстань між друзями має бути меншою ніж між випадковими
    const tomato = result.beds.find(b => b.name_uk === 'томат')!;
    const basil = result.beds.find(b => b.name_uk === 'базилік')!;
    
    const distance = Math.sqrt(
      Math.pow(tomato.x_m - basil.x_m, 2) + Math.pow(tomato.y_m - basil.y_m, 2)
    );
    
    // Мають бути відносно близько
    expect(distance).toBeLessThan(15);
  });
});