# InfiniteOS

**InfiniteOS** 是由 **ai.net实验室**发起的开源AI操作系统项目，面向云边端一体化场景。

## InfiniteOS 特性

InfiniteOS 面向云边端一体化场景，提供：

- 🚀 **算力资源管理** - 完整的 GPU/TPU 等算力资源管理和监控
- 🖥️ **虚拟化支持** - 虚拟机创建、管理和监控
- 🐳 **容器化支持** - Docker/Podman 容器管理
- 🤖 **AI 模型部署** - AI 模型管理和推理服务
- 🌐 **网络管理** - 网络接口配置和管理
- 💾 **存储管理** - 磁盘和文件系统管理
- ⚙️ **服务管理** - 系统服务管理
- 📋 **日志查看** - 系统日志查看和分析
- 👥 **用户管理** - 系统用户管理

## 项目结构

```
iosm/
├── frontend/          # 前端管理平台
│   ├── src/
│   │   ├── views/    # 页面组件
│   │   ├── components/ # 组件
│   │   └── router/   # 路由配置
│   └── package.json
├── backend/           # 后端API服务
│   ├── src/
│   │   ├── routes/   # 路由定义
│   │   ├── services/ # 业务逻辑
│   │   └── middleware/ # 中间件
│   └── package.json
└── README.md
```

## 快速开始

### 前端开发

```bash
cd frontend
npm install
npm run dev
```

访问 http://localhost:8080

**端口说明**：生产环境默认前端 8080、后端 3000。测试环境若需使用其他端口（如前端 8090、后端 3001），可在 `frontend/.env` 中设置 `VITE_DEV_PORT=8090`、`VITE_DEV_BACKEND_URL=http://localhost:3001`，后端通过环境变量 `PORT=3001` 启动。参见 `frontend/.env.example` 与 `backend/.env.example`。

## 技术栈

- **Vue 3** - 渐进式 JavaScript 框架
- **TypeScript** - 类型安全的 JavaScript
- **Tailwind CSS** - 实用优先的 CSS 框架
- **Vite** - 下一代前端构建工具

## 社区

- **GitHub**: [github.com/ai.net/infiniteos](https://github.com/ai.net/infiniteos)
- **社区论坛**: [forum.ai.net](https://forum.ai.net)
- **技术支持**: support@ai.net

## 许可证

本项目采用开源许可证，详情请查看 LICENSE 文件。

## 赞助

如果您想支持 InfiniteOS 项目的发展，请访问 [赞助页面](/sponsor)。

---

**InfiniteOS** - 让智算更简单
