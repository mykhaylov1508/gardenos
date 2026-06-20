// frontend/vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      reporter: ['text', 'html', 'json-summary'],
      include: ['src/features/planner/**/*.{ts,tsx}'],
      exclude: ['**/*.test.*', '**/*.spec.*', '**/index.ts'],
    },
    // Для стабільного виводу
    reporters: ['default', 'json'],
    outputFile: {
      json: './test-results.json'
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});