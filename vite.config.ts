import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src',
  build: {
    target: 'esnext',
    emptyOutDir: true,
    // rollupOptions: {
    //   input: {
    //     index: resolve(__dirname, 'src/index.html'),
    //   },
    // }
  },
});
