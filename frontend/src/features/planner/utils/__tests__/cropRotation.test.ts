import { describe, it, expect } from 'vitest';
import { checkCropRotation, findProblematicZonesForFamily, type ZoneHistory } from '../cropRotation';

describe('cropRotation.ts — Сівозміна', () => {
  const currentYear = new Date().getFullYear();

  it('нова зона — завжди дозволено', () => {
    const result = checkCropRotation('Solanaceae', 'томат', null);
    expect(result.allowed).toBe(true);
    expect(result.risk_level).toBe('safe');
  });

  it('та ж родина торік — заблоковано', () => {
    const history: ZoneHistory = {
      zone_id: '1',
      zone_name: 'Тест',
      plantings: [{
        plant_name: 'Картопля',
        family: 'Solanaceae',
        planted_date: `${currentYear - 1}-05-01`,
        year: currentYear - 1,
      }],
    };

    const result = checkCropRotation('Solanaceae', 'Томат', history);
    expect(result.allowed).toBe(false);
    expect(result.risk_level).toBe('danger');
  });

  it('та ж родина 5 років тому — дозволено', () => {
    const history: ZoneHistory = {
      zone_id: '1',
      zone_name: 'Тест',
      plantings: [{
        plant_name: 'Картопля',
        family: 'Solanaceae',
        planted_date: `${currentYear - 5}-05-01`,
        year: currentYear - 5,
      }],
    };

    const result = checkCropRotation('Solanaceae', 'Томат', history);
    expect(result.allowed).toBe(true);
  });

  it('бобові як попередник — бонус', () => {
    const history: ZoneHistory = {
      zone_id: '1',
      zone_name: 'Тест',
      plantings: [{
        plant_name: 'Горох',
        family: 'Fabaceae',
        planted_date: `${currentYear - 1}-05-01`,
        year: currentYear - 1,
      }],
    };

    const result = checkCropRotation('Solanaceae', 'Томат', history);
    expect(result.allowed).toBe(true);
    expect(result.reason).toMatch(/бобові|азот/i);
  });

  it('findProblematicZonesForFamily знаходить проблеми', () => {
    const history: ZoneHistory[] = [{
      zone_id: '1',
      zone_name: 'Грядка 1',
      plantings: [{
        plant_name: 'Томат',
        family: 'Solanaceae',
        planted_date: `${currentYear - 1}-05-01`,
        year: currentYear - 1,
      }],
    }];

    const problems = findProblematicZonesForFamily('Solanaceae', history);
    expect(problems.length).toBeGreaterThan(0);
  });
});