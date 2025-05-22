import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 加载环境变量
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    define: {
      // 确保环境变量可在客户端使用
      'process.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL || 'http://localhost:5001')
    },
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:5001',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path
        },
        '/socket.io': {
          target: env.VITE_API_URL || 'http://localhost:5001',
          ws: true,
          changeOrigin: true,
          secure: false
        }
      },
    },
  };
}); 