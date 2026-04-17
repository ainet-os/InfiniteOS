import api from './index'

export interface Pod {
  name: string
  namespace: string
  status: string
  attempt: number
  createdAt: string | null
}

export const k8sApi = {
  getPods: (): Promise<Pod[]> => {
    return api.get('/k8s/pods')
  },
}
