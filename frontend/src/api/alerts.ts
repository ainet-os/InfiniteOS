import api from './index'

export interface SystemAlert {
  id: string
  type: 'error' | 'warning' | 'info'
  level: 'low' | 'medium' | 'high'
  title: string
  message: string
  service?: string
  mount?: string
  value?: number
  timestamp: number
  category: 'service' | 'resource' | 'log'
}

export const alertsApi = {
  getAlerts: (): Promise<{ alerts: SystemAlert[] }> => {
    return api.get('/alerts')
  },
  markAsRead: (id: string): Promise<{ success: boolean }> => {
    return api.post(`/alerts/${id}/read`)
  },
  clearAll: (): Promise<{ success: boolean }> => {
    return api.post('/alerts/clear')
  },
}

