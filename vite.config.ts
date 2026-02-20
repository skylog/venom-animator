import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { svelteTesting } from '@testing-library/svelte/vite';
import { fileURLToPath } from 'url';

export default defineConfig(({ mode }) => ({
  plugins: [svelte(), svelteTesting()],
  resolve: {
    alias: {
      '$lib': fileURLToPath(new URL('./src/lib', import.meta.url)),
    },
    // В режиме тестов разрешаем browser-экспорты пакетов (Svelte 5 index-client.js
    // вместо index-server.js), иначе mount() недоступен в happy-dom/jsdom среде.
    conditions: mode === 'test' ? ['browser'] : [],
  },
  optimizeDeps: {
    exclude: ['sql.js'],
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['src/**/*.test.ts'],
    alias: {
      '$lib': fileURLToPath(new URL('./src/lib', import.meta.url)),
    },
  },
}));
