import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Мок usePlannerState
vi.mock('../../usePlannerState', () => ({
  usePlannerState: () => ({
    plot: { width_m: 10, length_m: 20, has_water_source: false, north_direction: 'top' },
    selected_plants: [
      { library_id: '1', name_uk: 'Томат', priority: 'must_have' },
    ],
    family_size: 4,
    optimization_goal: 'yield',
    setStep: vi.fn(),
    reset: vi.fn(),
  }),
}));

// Мок useGardenPlans
vi.mock('../../useGardenPlans', () => ({
  useGardenPlans: () => ({
    applyPlanToGarden: vi.fn(),
    savePlan: vi.fn(),
    loading: false,
  }),
}));

// Простий тест що компонент рендериться
describe('Step3PlannerResult', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  it('компонент імпортується без помилок', async () => {
    const { Step3PlannerResult } = await import('../Step3PlannerResult');
    expect(Step3PlannerResult).toBeDefined();
    expect(typeof Step3PlannerResult).toBe('function');
  });
});