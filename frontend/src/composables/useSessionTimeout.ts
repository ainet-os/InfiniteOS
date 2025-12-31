import { useRouter } from 'vue-router'

/**
 * 会话超时管理
 * 无操作超过指定时间后自动退出登录
 */
export function useSessionTimeout(timeoutMinutes: number = 5) {
  const router = useRouter()
  const timeoutMs = timeoutMinutes * 60 * 1000 // 转换为毫秒
  let timeoutId: number | null = null
  let lastActivityTime = Date.now()
  let activityListeners: Array<{ event: string; handler: () => void }> = []

  /**
   * 清除token并跳转到登录页
   */
  const logout = () => {
    console.warn('会话超时，自动退出登录')
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    
    // 清除所有定时器
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
    
    // 跳转到登录页
    router.push('/signin').catch(() => {
      // 如果路由跳转失败，使用window.location
      window.location.href = '/signin'
    })
  }

  /**
   * 重置超时计时器
   */
  const resetTimeout = () => {
    // 清除现有计时器
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    
    // 更新最后活动时间
    lastActivityTime = Date.now()
    
    // 设置新的超时计时器
    timeoutId = window.setTimeout(() => {
      // 检查是否真的超时（防止在清除前已经触发）
      const timeSinceLastActivity = Date.now() - lastActivityTime
      if (timeSinceLastActivity >= timeoutMs) {
        logout()
      }
    }, timeoutMs)
  }

  /**
   * 处理用户活动
   */
  const handleActivity = () => {
    resetTimeout()
  }

  /**
   * 初始化会话超时监听
   */
  const init = () => {
    // 检查是否有token
    const token = localStorage.getItem('token')
    if (!token) {
      return // 未登录，不需要监听
    }

    // 初始化计时器
    resetTimeout()

    // 监听用户活动事件
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
      'keydown',
    ]

    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true })
      activityListeners.push({ event, handler: handleActivity })
    })

    // 返回清理函数
    return () => {
      activityListeners.forEach(({ event, handler }) => {
        document.removeEventListener(event, handler)
      })
      activityListeners = []
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
    }
  }

  /**
   * 手动重置超时（用于API调用等活动）
   */
  const reset = () => {
    resetTimeout()
  }

  /**
   * 停止会话超时监听
   */
  const stop = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
  }

  return {
    init,
    reset,
    stop,
    logout,
  }
}

