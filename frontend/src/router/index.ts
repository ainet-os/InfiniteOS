import { createRouter, createWebHistory } from 'vue-router'
import i18n from '@/i18n'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(to, from, savedPosition) {
    return savedPosition || { left: 0, top: 0 }
  },
  routes: [
    // 认证路由
    {
      path: '/signin',
      name: 'Signin',
      component: () => import('../views/Auth/Signin.vue'),
      meta: {
        title: '登录',
        requiresAuth: false,
      },
    },
    {
      path: '/reset-password',
      name: 'ResetPassword',
      component: () => import('../views/Auth/Signin.vue'), // 暂时重定向到登录页
      meta: {
        title: '重置密码',
        requiresAuth: false,
      },
      beforeEnter: (to, from, next) => {
        // 暂时重定向到登录页
        next('/signin')
      },
    },
    {
      path: '/',
      name: 'Overview',
      component: () => import('../views/Overview/Index.vue'),
      meta: {
        title: '系统概览',
        requiresAuth: true,
      },
    },
    // 资源路由
    {
      path: '/compute',
      name: 'Compute',
      component: () => import('../views/Resources/Compute/Index.vue'),
      meta: {
        title: '算力管理',
        requiresAuth: true,
      },
    },
    {
      path: '/compute/:id',
      name: 'ComputeDetail',
      component: () => import('../views/Resources/Compute/Detail.vue'),
      meta: {
        title: '算力设备详情',
        requiresAuth: true,
      },
    },
    {
      path: '/virtual-machines',
      name: 'VirtualMachines',
      component: () => import('../views/Resources/VirtualMachines/Index.vue'),
      meta: {
        title: '虚拟机管理',
        requiresAuth: true,
      },
    },
    {
      path: '/virtual-machines/:name',
      name: 'VirtualMachineDetail',
      component: () => import('../views/Resources/VirtualMachines/Detail.vue'),
      meta: {
        title: '虚拟机详情',
        requiresAuth: true,
      },
    },
    {
      path: '/virtual-machines/:name/console',
      name: 'VirtualMachineConsole',
      component: () => import('../views/Resources/VirtualMachines/Console.vue'),
      meta: {
        title: '虚拟机控制台',
        requiresAuth: true,
      },
    },
    {
      path: '/containers',
      name: 'Containers',
      component: () => import('../views/Resources/Containers/Index.vue'),
      meta: {
        title: '容器管理',
        requiresAuth: true,
      },
    },
    {
      path: '/containers/:name',
      name: 'ContainerDetail',
      component: () => import('../views/Resources/Containers/Detail.vue'),
      meta: {
        title: '容器详情',
        requiresAuth: true,
      },
    },
    {
      path: '/models/detail/:source/:name',
      name: 'ModelDetail',
      component: () => import('../views/Resources/Models/Detail.vue'),
      meta: {
        title: '模型详情',
        requiresAuth: true,
      },
    },
    {
      path: '/models',
      name: 'Models',
      component: () => import('../views/Resources/Models/Index.vue'),
      meta: {
        title: '模型管理',
        requiresAuth: true,
      },
    },
    // k3s 资源路由（仅保留Pods，因为Pods是运行在节点上的容器）
    {
      path: '/pods',
      name: 'Pods',
      component: () => import('../views/Resources/Pods/Index.vue'),
      meta: {
        title: 'Pods 管理',
        requiresAuth: true,
      },
    },
    // 系统路由
    {
      path: '/network',
      name: 'Network',
      component: () => import('../views/System/Network/Index.vue'),
      meta: {
        title: '网络管理',
        requiresAuth: true,
      },
    },
    {
      path: '/storage',
      name: 'Storage',
      component: () => import('../views/System/Storage/Index.vue'),
      meta: {
        title: '存储管理',
        requiresAuth: true,
      },
    },
    {
      path: '/services',
      name: 'Services',
      component: () => import('../views/System/Services/Index.vue'),
      meta: {
        title: '服务管理',
        requiresAuth: true,
      },
    },
    {
      path: '/terminal',
      name: 'Terminal',
      component: () => import('../views/System/Terminal/Index.vue'),
      meta: {
        title: '终端',
        requiresAuth: true,
      },
    },
    {
      path: '/logs',
      name: 'Logs',
      component: () => import('../views/System/Logs/Index.vue'),
      meta: {
        title: '日志查看',
        requiresAuth: true,
      },
    },
    {
      path: '/users',
      name: 'Users',
      component: () => import('../views/System/Users/Index.vue'),
      meta: {
        title: '用户管理',
        requiresAuth: true,
      },
    },
    {
      path: '/settings',
      name: 'Settings',
      component: () => import('../views/System/Settings/Index.vue'),
      meta: {
        title: '设置',
        requiresAuth: true,
      },
    },
    // 支持路由（不需要认证）
    {
      path: '/docs',
      name: 'Docs',
      component: () => import('../views/Support/Docs/Index.vue'),
      meta: {
        title: '技术文档',
        requiresAuth: false,
      },
    },
    {
      path: '/help',
      name: 'Help',
      component: () => import('../views/Support/Help/Index.vue'),
      meta: {
        title: '帮助与支持',
        requiresAuth: false,
      },
    },
    // 其它路由
    {
      path: '/sponsor',
      name: 'Sponsor',
      component: () => import('../views/Others/Sponsor/Index.vue'),
      meta: {
        title: '赞助',
        requiresAuth: false,
      },
    },
  ],
})

// 路由守卫
router.beforeEach((to, from, next) => {
  // 使用 i18n 获取标题
  let title = ''
  
  // 根据路由路径获取对应的翻译键
  const titleMap: Record<string, string> = {
    '/': 'pages.overview.title',
    '/signin': 'auth.signinTitle',
    '/compute': 'pages.compute.title',
    '/virtual-machines': 'pages.virtualMachines.title',
    '/containers': 'pages.containers.title',
    '/models': 'pages.models.title',
    '/pods': 'menu.pods',
    '/network': 'pages.network.title',
    '/storage': 'pages.storage.title',
    '/services': 'pages.services.title',
    '/terminal': 'pages.terminal.title',
    '/logs': 'pages.logs.title',
    '/users': 'pages.users.title',
    '/settings': 'pages.settings.title',
    '/docs': 'menu.docs',
    '/help': 'menu.help',
    '/sponsor': 'menu.sponsor',
  }
  
  const titleKey = titleMap[to.path] || (to.meta.title as string)
  if (titleKey && typeof titleKey === 'string' && titleKey.includes('.')) {
    title = i18n.global.t(titleKey)
  } else if (titleKey) {
    title = titleKey as string
  } else {
    title = i18n.global.t('common.infiniteEdgeOS')
  }
    document.title = `${title} | InfiniteOS`
  
  // 检查是否需要认证
  if (to.meta.requiresAuth) {
    const token = localStorage.getItem('token')
    if (!token) {
      // 未登录，跳转到登录页
      next('/signin')
      return
    }
    // 路由切换也算用户活动，重置会话超时
    window.dispatchEvent(new CustomEvent('user-activity'))
  }
  
  // 如果已登录，访问登录页时跳转到首页
  if (to.path === '/signin') {
    const token = localStorage.getItem('token')
    if (token) {
      next('/')
      return
    }
  }
  
  next()
})

export default router
