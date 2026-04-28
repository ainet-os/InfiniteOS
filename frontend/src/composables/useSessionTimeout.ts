import { useRouter } from 'vue-router'

/**
 * 会话超时管理
 * 无操作超过指定时间后自动退出登录
 */
export function useSessionTimeout(timeoutMinutes: number = 5) {
  const router = useRouter()
  const timeoutMs = timeoutMinutes * 60 * 1000 // 转换为毫秒
  const LAST_ACTIVITY_KEY = 'sessionLastActivityAt'
  let timeoutId: number | null = null
  let lastActivityTime = Date.now()
  let activityListeners: Array<{ event: string; handler: () => void }> = []
  let windowListeners: Array<{ event: string; handler: EventListener }> = []

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

  const persistLastActivity = (timestamp: number) => {
    lastActivityTime = timestamp
    localStorage.setItem(LAST_ACTIVITY_KEY, String(timestamp))
  }

  const getLastActivity = () => {
    const storedValue = localStorage.getItem(LAST_ACTIVITY_KEY)
    const storedTimestamp = storedValue ? Number(storedValue) : NaN
    if (Number.isFinite(storedTimestamp) && storedTimestamp > 0) {
      lastActivityTime = storedTimestamp
      return storedTimestamp
    }
    return lastActivityTime
  }

  const isExpired = () => {
    return Date.now() - getLastActivity() >= timeoutMs
  }

  const validateSession = () => {
    if (!localStorage.getItem('token')) {
      return
    }

    if (isExpired()) {
      logout()
    }
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
    persistLastActivity(Date.now())
    
    // 设置新的超时计时器
    timeoutId = window.setTimeout(() => {
      // 页面可能被后台冻结，触发时再次基于持久化时间做校验
      if (isExpired()) {
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

    // 恢复持久化的最后活动时间，并在页面恢复时补做超时校验
    getLastActivity()
    validateSession()
    if (!localStorage.getItem('token')) {
      return
    }

    // 初始化计时器
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    timeoutId = window.setTimeout(() => {
      if (isExpired()) {
        logout()
      }
    }, Math.max(0, timeoutMs - (Date.now() - getLastActivity())))

    // 监听用户活动事件
    const events = [
      'mousedown',
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

    const handleVisibilityChange: EventListener = () => {
      if (document.visibilityState === 'visible') {
        validateSession()
      }
    }

    const handleWindowFocus: EventListener = () => {
      validateSession()
    }

    const handleStorage: EventListener = (event) => {
      const storageEvent = event as StorageEvent
      if (storageEvent.key === LAST_ACTIVITY_KEY || storageEvent.key === 'token') {
        validateSession()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleWindowFocus)
    window.addEventListener('storage', handleStorage)
    windowListeners = [
      { event: 'visibilitychange', handler: handleVisibilityChange },
      { event: 'focus', handler: handleWindowFocus },
      { event: 'storage', handler: handleStorage },
    ]

    // 返回清理函数
    return () => {
      activityListeners.forEach(({ event, handler }) => {
        document.removeEventListener(event, handler)
      })
      activityListeners = []
      windowListeners.forEach(({ event, handler }) => {
        if (event === 'visibilitychange') {
          document.removeEventListener(event, handler)
        } else {
          window.removeEventListener(event, handler)
        }
      })
      windowListeners = []
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
    }
  }

  /**
   * 手动重置超时（用于显式触发的前端活动）
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
