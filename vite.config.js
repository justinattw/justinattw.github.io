import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: { portfolio: 'index.html', styles: 'styles.html' },
      output: {
        manualChunks: { three: ['three'] },
      },
    },
  },
});
