import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**', 'src/app/api/**'],
      exclude: ['**/*.test.*', '**/*.d.ts', 'src/lib/supabase/**', 'src/lib/push.ts'],
      // Coverage thresholds enforce ~70% floor on critical paths.
      // push.ts excluded — browser-only code requiring ServiceWorker APIs.
      thresholds: {
        lines: 70,
        branches: 65,
        functions: 60,
        statements: 70,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
