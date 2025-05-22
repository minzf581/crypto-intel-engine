import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 加载环境变量
  const env = loadEnv(mode, process.cwd(), '');
  
  // 根据环境设置默认API URL
  const apiUrl = env.VITE_API_URL || (
    mode === 'production' 
      ? 'https://crypto-demo.up.railway.app' 
      : 'http://localhost:5001'
  );
  
  console.log(`Building for ${mode} mode with API URL: ${apiUrl}`);
  
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    define: {
      // 确保环境变量可在客户端使用
      'import.meta.env.VITE_API_URL': JSON.stringify(apiUrl)
    },
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: apiUrl,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path
        },
        '/socket.io': {
          target: apiUrl,
          ws: true,
          changeOrigin: true,
          secure: false
        }
      },
    },
    build: {
      sourcemap: true,
      outDir: 'dist',
      // 避免因类型错误而中断构建
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            charts: ['chart.js', 'react-chartjs-2']
          }
        }
      }
    }
  };
}); 