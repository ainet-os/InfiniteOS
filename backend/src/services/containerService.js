import { execSudo } from '../utils/exec.js'

/**
 * 检测容器运行时（Docker）
 */
const checkContainerRuntime = async () => {
  try {
    const { success: dockerExists } = await execSudo('which docker')
    if (dockerExists) {
      return 'docker'
    }

    return null
  } catch (error) {
    return null
  }
}

/**
 * 获取容器列表
 */
export const getContainers = async () => {
  try {
    const runtime = await checkContainerRuntime()
    if (!runtime) {
      return []
    }

    const { stdout, success } = await execSudo(`${runtime} ps -a --format json`)
    
    if (!success || !stdout) {
      return []
    }

    const lines = stdout.trim().split('\n').filter(line => line.trim())
    const containers = []

    for (const line of lines) {
      try {
        const container = JSON.parse(line)
        
        // 处理端口信息
        let ports = '-'
        if (container.Ports) {
          if (Array.isArray(container.Ports) && container.Ports.length > 0) {
            ports = container.Ports.map(p => {
              if (typeof p === 'object' && p.PublicPort && p.PrivatePort) {
                return `${p.PublicPort}:${p.PrivatePort}`
              } else if (typeof p === 'string') {
                return p
              }
              return ''
            }).filter(p => p).join(', ')
          } else if (typeof container.Ports === 'string' && container.Ports.trim()) {
            ports = container.Ports
          }
        }

        // 处理名称
        let name = 'unknown'
        if (container.Names) {
          if (Array.isArray(container.Names) && container.Names.length > 0) {
            name = container.Names[0].replace(/^\//, '')
          } else if (typeof container.Names === 'string') {
            name = container.Names.replace(/^\//, '')
          }
        }

        // 确定容器的实际状态
        const rawState = (container.State || 'unknown').toString().toLowerCase()
        const rawStatus = (container.Status || container.State || 'unknown').toString()
        
        // 从 Status 字段中提取状态信息（例如 "Up 2 minutes" 或 "Exited (1) 2 minutes ago"）
        let actualState = rawState
        if (rawStatus.toLowerCase().includes('up') || rawStatus.toLowerCase().startsWith('up')) {
          actualState = 'running'
        } else if (rawStatus.toLowerCase().includes('exited') || rawState === 'exited') {
          actualState = 'exited'
        } else if (rawState === 'running') {
          actualState = 'running'
        }
        
        containers.push({
          id: (container.ID || container.Id || 'unknown').toString().substring(0, 12),
          name: name,
          image: container.Image || 'unknown',
          status: rawStatus,
          state: actualState,
          ports: ports,
          created: container.Created || container.CreatedAt || '-',
        })
      } catch (error) {
        console.error('解析容器信息错误:', error, 'Line:', line)
      }
    }

    return containers
  } catch (error) {
    console.error('获取容器列表错误:', error)
    if (error.message?.includes('command not found')) {
      return []
    }
    throw error
  }
}

/**
 * 获取容器详情
 */
export const getContainerDetails = async (containerId) => {
  try {
    const runtime = await checkContainerRuntime()
    if (!runtime) {
      return null
    }

    const { stdout, success } = await execSudo(`${runtime} inspect ${containerId}`)
    
    if (!success) {
      return null
    }

    const containers = JSON.parse(stdout)
    if (containers.length === 0) {
      return null
    }

    const container = containers[0]
    const config = container.Config || {}
    const networkSettings = container.NetworkSettings || {}

    return {
      id: container.Id?.substring(0, 12) || containerId,
      name: container.Name?.replace(/^\//, '') || containerId,
      image: container.Config?.Image || 'unknown',
      status: container.State?.Status || 'unknown',
      created: container.Created || '-',
      command: config.Cmd?.join(' ') || '',
      ports: Object.entries(networkSettings.Ports || {}).map(([port, mappings]) => ({
        container: port,
        host: mappings?.[0]?.HostPort || '',
        type: port.split('/')[1] || 'tcp',
      })),
      environment: config.Env || [],
      volumes: (container.Mounts || []).map(mount => ({
        hostPath: mount.Source || '',
        containerPath: mount.Destination || '',
        readOnly: mount.RW === false,
      })),
    }
  } catch (error) {
    console.error('获取容器详情错误:', error)
    return null
  }
}

/**
 * 创建容器
 */
export const createContainer = async (config) => {
  const runtime = await checkContainerRuntime()
  if (!runtime) {
    throw new Error('未找到 Docker')
  }

  const { name, image, ports = [], volumes = [], environment = [], command = '', networkMode = 'bridge' } = config

  // 构建 docker run 命令
  let cmd = `${runtime} run -d`
  
  if (name) {
    cmd += ` --name ${name}`
  }

  // 端口映射
  for (const port of ports) {
    if (port.host && port.container) {
      cmd += ` -p ${port.host}:${port.container}`
    }
  }

  // 数据卷
  for (const volume of volumes) {
    if (volume.hostPath && volume.containerPath) {
      const ro = volume.readOnly ? ':ro' : ''
      cmd += ` -v ${volume.hostPath}:${volume.containerPath}${ro}`
    }
  }

  // 环境变量
  for (const env of environment) {
    if (env.key && env.value) {
      cmd += ` -e ${env.key}=${env.value}`
    }
  }

  // 网络模式
  if (networkMode && networkMode !== 'bridge') {
    cmd += ` --network ${networkMode}`
  }

  // 镜像和命令
  cmd += ` ${image}`
  if (command) {
    cmd += ` ${command}`
  }

  const { stdout, success, stderr } = await execSudo(cmd)
  
  if (!success) {
    throw new Error(stderr || '创建容器失败')
  }

  return {
    id: stdout.trim(),
    message: '容器创建成功',
  }
}

/**
 * 导入容器
 */
export const importContainer = async (config) => {
  const runtime = await checkContainerRuntime()
  if (!runtime) {
    throw new Error('未找到 Docker')
  }

  const { importType, imageName, tarPath, importedImageName, containerName, pullIfNotExists, startAfterImport } = config

  if (importType === 'image') {
    // 清理镜像名称：移除可能的命令前缀和引号
    let cleanedImageName = (imageName || '').trim()
    if (cleanedImageName) {
      // 移除 "docker pull" 前缀
      cleanedImageName = cleanedImageName.replace(/^docker\s+pull\s+/i, '').trim()
      // 移除可能的引号
      cleanedImageName = cleanedImageName.replace(/^["']|["']$/g, '')
    }

    if (!cleanedImageName) {
      throw new Error('镜像名称不能为空')
    }

    // 从镜像导入
    if (pullIfNotExists) {
      // 检查镜像是否存在
      const { stdout: imageIdOut, success: imageCmdOk } = await execSudo(`${runtime} images -q ${cleanedImageName}`)
      const imageExists = imageCmdOk && Boolean(imageIdOut && imageIdOut.trim())
      if (!imageExists) {
        // 拉取镜像
        const { success: pullSuccess, stderr, stdout } = await execSudo(`${runtime} pull ${cleanedImageName}`)
        if (!pullSuccess) {
          const errorMsg = (stderr || stdout || '').trim()
          
          // 检测常见的错误类型并提供友好的提示
          if (errorMsg.includes('no such host') || errorMsg.includes('lookup')) {
            throw new Error(`DNS解析失败：无法解析镜像仓库地址。\n\n可能的原因：\n1. 镜像仓库域名未配置在 /etc/hosts 文件中\n2. DNS服务器无法解析该域名\n3. 网络连接问题\n\n建议：\n- 检查 /etc/hosts 文件，确保包含镜像仓库的IP地址映射\n- 例如：echo "192.168.1.100 harbor.cluster1.local" >> /etc/hosts\n- 或配置DNS服务器解析该域名（如 CoreDNS: 100.93.0.30:53）\n\n原始错误：${errorMsg}`)
          } else if (errorMsg.includes('HTTP response to HTTPS client') || errorMsg.includes('server gave HTTP response')) {
            throw new Error(`协议错误：Docker尝试使用HTTPS连接，但镜像仓库使用HTTP。\n\n解决方法：\n1. 编辑 /etc/docker/daemon.json 文件\n2. 添加以下配置：\n{\n  "insecure-registries": ["harbor.cluster1.local:30002"]\n}\n3. 重启Docker服务：sudo systemctl restart docker\n\n注意：如果 /etc/docker/daemon.json 不存在，需要创建它。\n\n原始错误：${errorMsg}`)
          } else if (errorMsg.includes('connection refused') || errorMsg.includes('connect')) {
            throw new Error(`连接失败：无法连接到镜像仓库。\n\n可能的原因：\n1. 镜像仓库服务未运行\n2. 端口号不正确\n3. 防火墙阻止了连接\n\n原始错误：${errorMsg}`)
          } else if (errorMsg.includes('unauthorized') || errorMsg.includes('authentication')) {
            throw new Error(`认证失败：无法访问私有镜像仓库。\n\n可能的原因：\n1. 需要先登录镜像仓库：docker login harbor.cluster1.local:30002\n2. 用户名或密码错误\n3. 没有访问权限\n\n原始错误：${errorMsg}`)
          } else if (errorMsg.includes('manifest unknown') || errorMsg.includes('not found')) {
            throw new Error(`镜像不存在：指定的镜像在仓库中不存在。\n\n请检查：\n1. 镜像名称和标签是否正确\n2. 镜像是否已推送到仓库\n\n原始错误：${errorMsg}`)
          } else {
            throw new Error(`拉取镜像失败：${errorMsg || '未知错误'}`)
          }
        }
      }
    }

    // 创建容器
    let cmd = `${runtime} create`
    if (containerName) {
      cmd += ` --name ${containerName}`
    }
    cmd += ` ${cleanedImageName}`

    const { stdout, success, stderr } = await execSudo(cmd)
    if (!success) {
      throw new Error((stderr || stdout || '').trim() || '创建容器失败')
    }

    const containerId = stdout.trim()

    // 如果需要启动
    if (startAfterImport) {
      await startContainer(containerId)
    }

    return {
      id: containerId,
      message: '容器导入成功',
    }
  } else if (importType === 'tar') {
    // 从tar文件导入
    let cmd = `${runtime} load -i ${tarPath}`
    
    if (importedImageName) {
      // 如果指定了导入后的镜像名称，需要先导入再打标签
      const { success, stderr } = await execSudo(cmd)
      if (!success) {
        throw new Error(stderr || '导入tar文件失败')
      }

      // 获取导入的镜像ID
      const { stdout: imageId } = await execSudo(`${runtime} images -q --filter "dangling=true" | head -1`)
      if (imageId) {
        await execSudo(`${runtime} tag ${imageId.trim()} ${importedImageName}`)
      }
    } else {
      const { success, stderr } = await execSudo(cmd)
      if (!success) {
        throw new Error(stderr || '导入tar文件失败')
      }
    }

    // 创建容器
    const imageToUse = importedImageName || 'imported-image:latest'
    let createCmd = `${runtime} create`
    if (containerName) {
      createCmd += ` --name ${containerName}`
    }
    createCmd += ` ${imageToUse}`

    const { stdout, success: createSuccess, stderr: createStderr } = await execSudo(createCmd)
    if (!createSuccess) {
      throw new Error(createStderr || '创建容器失败')
    }

    const containerId = stdout.trim()

    // 如果需要启动
    if (startAfterImport) {
      await startContainer(containerId)
    }

    return {
      id: containerId,
      message: '容器导入成功',
    }
  }

  throw new Error('不支持的导入类型')
}

/**
 * 启动容器
 */
export const startContainer = async (containerId) => {
  const runtime = await checkContainerRuntime()
  if (!runtime) {
    throw new Error('未找到容器运行时')
  }

  // 先检查容器是否存在
  const { success: exists, stdout: inspectOutput } = await execSudo(`${runtime} inspect ${containerId}`)
  if (!exists) {
    throw new Error(`容器 ${containerId} 不存在`)
  }

  // 检查容器当前状态
  const { stdout: psOutput } = await execSudo(`${runtime} ps -a --format json`)
  const containers = psOutput.trim().split('\n').filter(line => line.trim())
  for (const line of containers) {
    try {
      const container = JSON.parse(line)
      const id = container.ID?.substring(0, 12) || container.Id?.substring(0, 12) || ''
      if (id === containerId || container.ID === containerId || container.Id === containerId) {
        const state = (container.State || 'unknown').toLowerCase()
        if (state === 'running') {
          return { message: '容器已在运行中' }
        }
        // 检查容器是否有问题
        if (state === 'created' && container.Image) {
          // 检查镜像是否存在
          const { success: imageExists } = await execSudo(`${runtime} image inspect ${container.Image}`)
          if (!imageExists) {
            throw new Error(`容器镜像 ${container.Image} 不存在或已损坏，请重新创建容器`)
          }
        }
        break
      }
    } catch (error) {
      // 忽略解析错误，继续检查
    }
  }

  // 启动容器
  const { success, stderr, stdout: startOutput } = await execSudo(`${runtime} start ${containerId}`)
  if (!success) {
    // 提取更详细的错误信息
    const errorMsg = stderr || startOutput || '启动容器失败'
    // 如果是镜像问题，提供更友好的错误信息
    if (errorMsg.includes('/bin/sh') || errorMsg.includes('no such file')) {
      throw new Error('容器镜像不完整或损坏，请删除容器后重新创建')
    }
    throw new Error(errorMsg)
  }
  return { message: '容器启动成功' }
}

/**
 * 停止容器
 */
export const stopContainer = async (containerId) => {
  const runtime = await checkContainerRuntime()
  if (!runtime) {
    throw new Error('未找到容器运行时')
  }

  const { success, stderr } = await execSudo(`${runtime} stop ${containerId}`)
  if (!success) {
    throw new Error(stderr || '停止容器失败')
  }
}

/**
 * 重启容器
 */
export const restartContainer = async (containerId) => {
  const runtime = await checkContainerRuntime()
  if (!runtime) {
    throw new Error('未找到容器运行时')
  }

  const { success, stderr } = await execSudo(`${runtime} restart ${containerId}`)
  if (!success) {
    throw new Error(stderr || '重启容器失败')
  }
}

/**
 * 删除容器
 */
export const deleteContainer = async (containerId) => {
  const runtime = await checkContainerRuntime()
  if (!runtime) {
    throw new Error('未找到容器运行时')
  }

  const { success, stderr } = await execSudo(`${runtime} rm -f ${containerId}`)
  if (!success) {
    throw new Error(stderr || '删除容器失败')
  }
}

/**
 * 获取容器日志
 */
export const getContainerLogs = async (containerId, lines = 100, tail = true) => {
  const runtime = await checkContainerRuntime()
  if (!runtime) {
    throw new Error('未找到容器运行时')
  }

  const { stdout, success, stderr } = await execSudo(
    `${runtime} logs ${tail ? '--tail' : '--head'} ${lines} ${containerId}`
  )
  
  if (!success) {
    throw new Error(stderr || '获取容器日志失败')
  }

  return stdout.split('\n')
}

/**
 * 获取容器监控数据
 */
export const getContainerMonitoring = async (containerId) => {
  const runtime = await checkContainerRuntime()
  if (!runtime) {
    throw new Error('未找到容器运行时')
  }

  try {
    const { stdout, success } = await execSudo(`${runtime} stats ${containerId} --no-stream --format json`)
    
    if (!success) {
      return {
        cpuUsage: 0,
        memoryUsage: 0,
        networkRx: 0,
        networkTx: 0,
        diskRead: 0,
        diskWrite: 0,
      }
    }

    const stats = JSON.parse(stdout)
    if (stats.length === 0) {
      return {
        cpuUsage: 0,
        memoryUsage: 0,
        networkRx: 0,
        networkTx: 0,
        diskRead: 0,
        diskWrite: 0,
      }
    }

    const stat = stats[0]
    
    return {
      cpuUsage: parseFloat(stat.CPUPerc?.replace('%', '')) || 0,
      memoryUsage: parseInt(stat.MemUsage?.split('/')[0]?.replace(/[^0-9]/g, '')) || 0,
      networkRx: parseInt(stat.NetIO?.split('/')[0]?.replace(/[^0-9]/g, '')) || 0,
      networkTx: parseInt(stat.NetIO?.split('/')[1]?.replace(/[^0-9]/g, '')) || 0,
      diskRead: parseInt(stat.BlockIO?.split('/')[0]?.replace(/[^0-9]/g, '')) || 0,
      diskWrite: parseInt(stat.BlockIO?.split('/')[1]?.replace(/[^0-9]/g, '')) || 0,
    }
  } catch (error) {
    console.error('获取容器监控数据错误:', error)
    return {
      cpuUsage: 0,
      memoryUsage: 0,
      networkRx: 0,
      networkTx: 0,
      diskRead: 0,
      diskWrite: 0,
    }
  }
}

/**
 * 获取镜像列表
 */
export const getImages = async () => {
  const runtime = await checkContainerRuntime()
  if (!runtime) {
    return []
  }

  try {
    const { stdout, success } = await execSudo(`${runtime} images --format json`)
    
    if (!success || !stdout) {
      return []
    }

    const lines = stdout.trim().split('\n').filter(line => line.trim())
    return lines.map(line => {
      try {
        const image = JSON.parse(line)
        return {
          id: image.ID || '',
          repository: image.Repository || '',
          tag: image.Tag || '',
          size: image.Size || '0',
          created: image.CreatedAt || '',
        }
      } catch (error) {
        return null
      }
    }).filter(Boolean)
  } catch (error) {
    console.error('获取镜像列表错误:', error)
    return []
  }
}

/**
 * 更新容器端口映射
 * 注意：Docker不支持直接修改运行中容器的端口映射，需要重新创建容器
 */
export const updateContainerPorts = async (containerId, ports) => {
  const runtime = await checkContainerRuntime()
  if (!runtime) {
    throw new Error('未找到容器运行时')
  }

  // 获取容器信息
  const { stdout: inspectOutput, success: inspectSuccess } = await execSudo(`${runtime} inspect ${containerId}`)
  if (!inspectSuccess) {
    throw new Error('容器不存在')
  }

  const containers = JSON.parse(inspectOutput)
  if (containers.length === 0) {
    throw new Error('容器不存在')
  }

  const container = containers[0]
  const containerName = container.Name?.replace(/^\//, '') || containerId
  const image = container.Config?.Image || 'unknown'
  const isRunning = container.State?.Status === 'running'

  // 停止容器（如果正在运行）
  if (isRunning) {
    await stopContainer(containerId)
  }

  // 删除旧容器
  await deleteContainer(containerId)

  // 构建新的docker run命令
  let cmd = `${runtime} run -d`
  
  // 添加容器名称
  if (containerName) {
    cmd += ` --name ${containerName}`
  }

  // 添加端口映射
  if (ports && ports.length > 0) {
    for (const port of ports) {
      if (port.host && port.container) {
        const portType = port.type || 'tcp'
        // 确保端口号是字符串
        const hostPort = String(port.host).trim()
        const containerPort = String(port.container).trim()
        if (hostPort && containerPort) {
          cmd += ` -p ${hostPort}:${containerPort}/${portType}`
        }
      }
    }
  }

  // 复制原有的配置
  const config = container.Config || {}
  
  // 环境变量
  if (config.Env && config.Env.length > 0) {
    for (const env of config.Env) {
      cmd += ` -e "${env}"`
    }
  }

  // 数据卷
  if (container.Mounts && container.Mounts.length > 0) {
    for (const mount of container.Mounts) {
      if (mount.Source && mount.Destination) {
        const ro = mount.RW === false ? ':ro' : ''
        cmd += ` -v ${mount.Source}:${mount.Destination}${ro}`
      }
    }
  }

  // 网络模式
  const networkMode = container.HostConfig?.NetworkMode || 'bridge'
  if (networkMode && networkMode !== 'bridge') {
    cmd += ` --network ${networkMode}`
  }

  // 其他选项
  if (container.HostConfig?.RestartPolicy?.Name && container.HostConfig.RestartPolicy.Name !== 'no') {
    cmd += ` --restart=${container.HostConfig.RestartPolicy.Name}`
  }

  // 镜像和命令
  cmd += ` ${image}`
  if (config.Cmd && config.Cmd.length > 0) {
    // 正确处理命令数组，确保参数正确传递
    const cmdArray = Array.isArray(config.Cmd) ? config.Cmd : [config.Cmd]
    // 对于包含空格的参数，需要特殊处理
    const escapedCmd = cmdArray.map(arg => {
      // 如果参数包含空格或特殊字符，需要加引号
      if (arg.includes(' ') || arg.includes('=')) {
        return `"${arg}"`
      }
      return arg
    }).join(' ')
    cmd += ` ${escapedCmd}`
  }

  // 创建新容器
  console.log('执行命令:', cmd)
  const { stdout, success, stderr } = await execSudo(cmd)
  if (!success) {
    const errorMsg = (stderr || stdout || '').trim()
    console.error('创建容器失败:', errorMsg)
    throw new Error(errorMsg || '更新容器端口映射失败')
  }

  const newContainerId = stdout.trim()
  console.log('新容器ID:', newContainerId)

  // 如果原容器正在运行，启动新容器
  if (isRunning) {
    try {
      await startContainer(newContainerId)
    } catch (error) {
      console.error('启动新容器失败:', error)
      // 即使启动失败，也返回成功，因为容器已创建
    }
  }

  return {
    id: newContainerId,
    message: '容器端口映射已更新',
  }
}

/**
 * 拉取镜像
 */
export const pullImage = async (imageName) => {
  const runtime = await checkContainerRuntime()
  if (!runtime) {
    throw new Error('未找到 Docker')
  }

  // 清理镜像名称：移除可能的命令前缀和引号
  let cleanedImageName = (imageName || '').trim()
  if (cleanedImageName) {
    // 移除 "docker pull" 前缀
    cleanedImageName = cleanedImageName.replace(/^docker\s+pull\s+/i, '').trim()
    // 移除可能的引号
    cleanedImageName = cleanedImageName.replace(/^["']|["']$/g, '')
  }

  if (!cleanedImageName) {
    throw new Error('镜像名称不能为空')
  }

  const { success, stderr, stdout } = await execSudo(`${runtime} pull ${cleanedImageName}`)
  if (!success) {
    const errorMsg = (stderr || stdout || '').trim()
    
    // 检测常见的错误类型并提供友好的提示
    if (errorMsg.includes('no such host') || errorMsg.includes('lookup')) {
      throw new Error(`DNS解析失败：无法解析镜像仓库地址。\n\n可能的原因：\n1. 镜像仓库域名未配置在 /etc/hosts 文件中\n2. DNS服务器无法解析该域名\n3. 网络连接问题\n\n建议：\n- 检查 /etc/hosts 文件，确保包含镜像仓库的IP地址映射\n- 例如：echo "192.168.1.100 harbor.cluster1.local" >> /etc/hosts\n- 或配置DNS服务器解析该域名（如 CoreDNS: 100.93.0.30:53）\n\n原始错误：${errorMsg}`)
    } else if (errorMsg.includes('HTTP response to HTTPS client') || errorMsg.includes('server gave HTTP response')) {
      throw new Error(`协议错误：Docker尝试使用HTTPS连接，但镜像仓库使用HTTP。\n\n解决方法：\n1. 编辑 /etc/docker/daemon.json 文件\n2. 添加以下配置：\n{\n  "insecure-registries": ["harbor.cluster1.local:30002"]\n}\n3. 重启Docker服务：sudo systemctl restart docker\n\n注意：如果 /etc/docker/daemon.json 不存在，需要创建它。\n\n原始错误：${errorMsg}`)
    } else if (errorMsg.includes('connection refused') || errorMsg.includes('connect')) {
      throw new Error(`连接失败：无法连接到镜像仓库。\n\n可能的原因：\n1. 镜像仓库服务未运行\n2. 端口号不正确\n3. 防火墙阻止了连接\n\n原始错误：${errorMsg}`)
    } else if (errorMsg.includes('unauthorized') || errorMsg.includes('authentication')) {
      throw new Error(`认证失败：无法访问私有镜像仓库。\n\n可能的原因：\n1. 需要先登录镜像仓库：docker login harbor.cluster1.local:30002\n2. 用户名或密码错误\n3. 没有访问权限\n\n原始错误：${errorMsg}`)
    } else if (errorMsg.includes('manifest unknown') || errorMsg.includes('not found')) {
      throw new Error(`镜像不存在：指定的镜像在仓库中不存在。\n\n请检查：\n1. 镜像名称和标签是否正确\n2. 镜像是否已推送到仓库\n\n原始错误：${errorMsg}`)
    } else {
      throw new Error(`拉取镜像失败：${errorMsg || '未知错误'}`)
    }
  }
}
