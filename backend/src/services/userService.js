import { execCommand, execSudo } from '../utils/exec.js'

/**
 * 获取用户列表
 */
export const getUsers = async () => {
  try {
    const { stdout, success } = await execCommand('getent passwd')
    
    if (!success || !stdout) {
      return []
    }

    const lines = stdout.trim().split('\n')
    const users = []

    for (const line of lines) {
      const parts = line.split(':')
      if (parts.length >= 7) {
        const username = parts[0]
        const uid = parseInt(parts[2])
        const gid = parseInt(parts[3])
        const home = parts[5]
        const shell = parts[6]

        // 跳过系统用户（UID < 1000，除了root）
        if (uid < 1000 && username !== 'root') {
          continue
        }

        // 获取用户组信息
        let groups = []
        try {
          const { stdout: groupsOut } = await execCommand(`groups ${username}`)
          groups = groupsOut.split(':')[1]?.trim().split(' ') || []
        } catch (error) {
          // 忽略错误
        }

        users.push({
          username: username,
          uid: uid,
          gid: gid,
          home: home,
          shell: shell,
          groups: groups,
        })
      }
    }

    return users
  } catch (error) {
    console.error('获取用户列表错误:', error)
    throw error
  }
}

/**
 * 获取用户详情
 */
export const getUserDetails = async (username) => {
  try {
    const { stdout, success } = await execCommand(`getent passwd ${username}`)
    
    if (!success || !stdout) {
      return null
    }

    const parts = stdout.trim().split(':')
    if (parts.length < 7) {
      return null
    }

    const uid = parseInt(parts[2])
    const gid = parseInt(parts[3])
    const home = parts[5]
    const shell = parts[6]

    // 获取用户组信息
    let groups = []
    try {
      const { stdout: groupsOut } = await execCommand(`groups ${username}`)
      groups = groupsOut.split(':')[1]?.trim().split(' ') || []
    } catch (error) {
      // 忽略错误
    }

    return {
      username: username,
      uid: uid,
      gid: gid,
      home: home,
      shell: shell,
      groups: groups,
    }
  } catch (error) {
    console.error('获取用户详情错误:', error)
    return null
  }
}

/**
 * 创建用户
 */
export const createUser = async (userData) => {
  const { username, password, home, shell, groups } = userData

  if (!username) {
    throw new Error('用户名不能为空')
  }

  let cmd = `useradd`
  
  if (home) {
    cmd += ` -d ${home}`
  }
  
  if (shell) {
    cmd += ` -s ${shell}`
  }
  
  if (groups && groups.length > 0) {
    cmd += ` -G ${groups.join(',')}`
  }
  
  cmd += ` ${username}`

  const { success, stderr } = await execSudo(cmd)
  if (!success) {
    throw new Error(stderr || '创建用户失败')
  }

  // 设置密码
  if (password) {
    // 使用chpasswd设置密码
    const { success: passSuccess, stderr: passStderr } = await execSudo(
      `echo "${username}:${password}" | chpasswd`
    )
    if (!passSuccess) {
      throw new Error(passStderr || '设置密码失败')
    }
  }

  return {
    username: username,
    message: '用户创建成功',
  }
}

/**
 * 更新用户
 */
export const updateUser = async (username, userData) => {
  const { home, shell, groups, password } = userData

  if (home) {
    const { success, stderr } = await execSudo(`usermod -d ${home} ${username}`)
    if (!success) {
      throw new Error(stderr || '更新用户主目录失败')
    }
  }

  if (shell) {
    const { success, stderr } = await execSudo(`usermod -s ${shell} ${username}`)
    if (!success) {
      throw new Error(stderr || '更新用户shell失败')
    }
  }

  if (groups && groups.length > 0) {
    const { success, stderr } = await execSudo(`usermod -G ${groups.join(',')} ${username}`)
    if (!success) {
      throw new Error(stderr || '更新用户组失败')
    }
  }

  if (password) {
    const { success, stderr } = await execSudo(`echo "${username}:${password}" | chpasswd`)
    if (!success) {
      throw new Error(stderr || '更新密码失败')
    }
  }
}

/**
 * 删除用户
 */
export const deleteUser = async (username) => {
  const { success, stderr } = await execSudo(`userdel -r ${username}`)
  if (!success) {
    throw new Error(stderr || '删除用户失败')
  }
}

