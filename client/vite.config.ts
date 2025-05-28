import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { loadEnv } from 'vite';

// Load environment variables
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Detect Railway environment
  const isRailway = !!(env.RAILWAY_ENVIRONMENT || env.RAILWAY_PROJECT_ID);
  
  // Set default API URL based on environment
  let apiUrl = env.VITE_API_URL;
  
  if (!apiUrl) {
    if (isRailway || mode === 'production') {
      // In Railway/production, backend and frontend are served from same domain
      // Use relative path for API calls
      apiUrl = '';
    } else {
      // Development mode
      apiUrl = 'http://localhost:5001';
    }
  }

  console.log(`Building for ${mode} mode with API URL: ${apiUrl || 'relative path'}`);

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