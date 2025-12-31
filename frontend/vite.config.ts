import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueJsx(),
    vueDevTools({
      launchEditor: 'cursor',
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 8080,
    strictPort: false,
    open: false,
    cors: true,
    proxy: {
      // Ollama API代理 - 需要放在 /api 之前，因为更具体
      '/api/ollama': {
        target: 'http://localhost:8000',
        changeOrigin: false,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/ollama/, '/api'),
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('Ollama proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Ollama proxy request:', req.method, req.url, '->', proxyReq.path);
            // 确保Content-Type正确
            if (req.method === 'POST' && !proxyReq.getHeader('Content-Type')) {
              proxyReq.setHeader('Content-Type', 'application/json');
            }
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Ollama proxy response:', proxyRes.statusCode, req.url);
            // 添加CORS头
            proxyRes.headers['Access-Control-Allow-Origin'] = '*';
            proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
            proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
            // 如果是OPTIONS请求，直接返回200
            if (req.method === 'OPTIONS') {
              proxyRes.statusCode = 200;
              proxyRes.statusMessage = 'OK';
            }
          });
        },
      },
      // 后端API代理
      '/api': {
        target: 'http://0.0.0.0:3000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path,
      },
    },
  },
})
