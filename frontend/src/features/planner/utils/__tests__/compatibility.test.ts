import { describe, it, expect } from 'vitest';
import { checkCompatibility, checkGroupCompatibility } from '../compatibility';

describe('compatibility.ts — Сумісність рослин', () => {
  it('томат + базилік = good', () => {
    const result = checkCompatibility('томат', 'базилік');
    expect(result.level).toBe('good');
  });

  it('томат + картопля = bad (одна родина)', () => {
    const result = checkCompatibility('томат', 'картопля');
    expect(result.level).toBe('bad');
  });

  it('томат + огірок = neutral', () => {
    const result = checkCompatibility('томат', 'огірок');
    expect(result.level).toBe('neutral');
  });

  it('симетричність: A-B == B-A', () => {
    const ab = checkCompatibility('томат', 'базилік');
    const ba = checkCompatibility('базилік', 'томат');
    expect(ab.level).toBe(ba.level);
  });

  it('checkGroupCompatibility знаходить проблеми', () => {
    const result = checkGroupCompatibility(['томат', 'картопля', 'базилік']);
    expect(result.problems.length).toBeGreaterThan(0);
    expect(result.problems.some(p => p.level === 'bad')).toBe(true);
  });

  it('checkGroupCompatibility для друзів дає високий score', () => {
    const result = checkGroupCompatibility(['томат', 'базилік', 'морква']);
    expect(result.score).toBeGreaterThanOrEqual(60);
  });
});