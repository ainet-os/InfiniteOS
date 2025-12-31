import api from './index'

export interface User {
  username: string
  uid: number
  gid: number
  home: string
  shell: string
  groups: string[]
}

export interface CreateUserRequest {
  username: string
  password?: string
  home?: string
  shell?: string
  groups?: string[]
}

export interface UpdateUserRequest {
  home?: string
  shell?: string
  groups?: string[]
  password?: string
}

export const usersApi = {
  getUsers: (): Promise<User[]> => {
    return api.get('/users')
  },
  getUserDetails: (username: string): Promise<User> => {
    return api.get(`/users/${username}`)
  },
  createUser: (data: CreateUserRequest): Promise<{ username: string; message: string }> => {
    return api.post('/users', data)
  },
  updateUser: (username: string, data: UpdateUserRequest): Promise<{ message: string }> => {
    return api.put(`/users/${username}`, data)
  },
  deleteUser: (username: string): Promise<{ message: string }> => {
    return api.delete(`/users/${username}`)
  },
}
