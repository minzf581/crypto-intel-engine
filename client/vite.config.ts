import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Detect Railway environment
  const isRailway = process.env.RAILWAY_ENVIRONMENT === 'true' || 
                   process.env.RAILWAY_STATIC_URL || 
                   process.env.RAILWAY_PUBLIC_DOMAIN;
  
  console.log(`Building for ${mode} mode with Railway detected: ${isRailway}`);
  
  // Set default API URL based on environment
  let apiUrl = process.env.VITE_API_URL;
  
  if (!apiUrl) {
    if (isRailway) {
      // In Railway, backend and frontend are served from same domain
      // Use empty string for relative API calls
      apiUrl = '';
      console.log('Building for production mode with API URL: relative path');
    } else if (mode === 'production') {
      // Production mode but not Railway
      apiUrl = 'http://localhost:5001';
      console.log(`Building for production mode with API URL: ${apiUrl}`);
    } else {
      // Development mode
      apiUrl = 'http://localhost:5001';
      console.log(`Building for development mode with API URL: ${apiUrl}`);
    }
  } else {
    console.log(`Building for ${mode} mode with API URL: ${apiUrl}`);
  }

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    define: {
      'process.env.VITE_API_URL': JSON.stringify(apiUrl),
      'process.env.NODE_ENV': JSON.stringify(mode),
      'process.env.RAILWAY_ENVIRONMENT': JSON.stringify(isRailway ? 'true' : 'false'),
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            router: ['react-router-dom'],
            icons: ['@heroicons/react'],
          },
        },
      },
    },
    server: {
      port: 3000,
      host: true,
    },
    preview: {
      port: 3000,
      host: true,
    },
  };
}); 