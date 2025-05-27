import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { loadEnv } from 'vite';

// Load environment variables
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Set default API URL based on environment
  const apiUrl = env.VITE_API_URL || (mode === 'production' 
    ? 'https://crypto-intelligence-engine-production.up.railway.app'
    : 'http://localhost:5001');

  console.log(`Building for ${mode} mode with API URL: ${apiUrl}`);

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
      },
    },
    define: {
      // Ensure environment variables are available on the client
      'process.env.VITE_API_URL': JSON.stringify(apiUrl),
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            utils: ['axios'],
          },
        },
      },
    },
    optimizeDeps: {
      include: ['react', 'react-dom'],
    },
    server: {
      port: 3000,
      open: true,
    },
    esbuild: {
      // Avoid build interruption due to type errors
      logOverride: { 'this-is-undefined-in-esm': 'silent' }
    }
  };
}); 