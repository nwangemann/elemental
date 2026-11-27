import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import { threeCatalogue } from './scripts/three-catalogue.ts';
import { troikaNoSdfWarmup } from './scripts/troika-no-sdf-warmup.ts';

export default defineConfig({
  plugins: [react(), threeCatalogue(), troikaNoSdfWarmup()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
  },
});
