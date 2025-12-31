import api from './index'

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  token: string
  user: {
    id: string | number
    username: string
    role: string
    home?: string
    shell?: string
  }
}

export const authApi = {
  login: (data: LoginRequest): Promise<LoginResponse> => {
    return api.post('/auth/login', data)
  },
}
