import api from './index'

export interface LogEntry {
  timestamp: string
  service: string
  level: string
  message: string
  hostname: string
}

export interface LogQueryParams {
  service?: string
  level?: string
  since?: string
  until?: string
  lines?: number
  search?: string
}

export const logsApi = {
  getLogs: (params?: LogQueryParams): Promise<{ logs: LogEntry[] }> => {
    return api.get('/logs', { params })
  },
}
