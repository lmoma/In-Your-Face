import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    base: '/', // Serve site at custom-domain root (changed from '/iyf')
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
    },
});