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
    port: parseInt(process.env.VITE_DEV_PORT || '8080', 10),
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
      // WebSocket终端代理 - 需要放在 /api 之前，因为更具体
      '/api/terminal/ws': {
        target: process.env.VITE_DEV_BACKEND_URL || 'http://localhost:3000',
        changeOrigin: false, // WebSocket不需要changeOrigin
        secure: false,
        ws: true,
        rewrite: (path) => path,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.error('Terminal WebSocket proxy error:', err);
          });
          proxy.on('proxyReqWs', (proxyReq, req, socket) => {
            console.log('Terminal WebSocket proxy request:', req.url);
            // 确保WebSocket升级请求的头部正确
            proxyReq.setHeader('Connection', 'Upgrade');
            proxyReq.setHeader('Upgrade', 'websocket');
          });
          proxy.on('open', (proxySocket) => {
            console.log('Terminal WebSocket connection opened');
          });
          proxy.on('close', (res, socket, head) => {
            console.log('Terminal WebSocket connection closed');
          });
          proxy.on('upgrade', (req, socket, head) => {
            console.log('Terminal WebSocket upgrade request:', req.url);
          });
        },
      },
      // 后端API代理（包括其他WebSocket）
      '/api': {
        target: process.env.VITE_DEV_BACKEND_URL || 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path,
        ws: true, // 启用WebSocket代理
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('API proxy error:', err);
          });
          proxy.on('proxyReqWs', (proxyReq, req, socket) => {
            console.log('WebSocket proxy request:', req.url);
          });
        },
      },
    },
  },
})
