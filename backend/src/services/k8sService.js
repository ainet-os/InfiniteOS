import { execSudo } from '../utils/exec.js'

/**
 * 检查kubectl是否可用
 */
const checkKubectl = async () => {
  try {
    const { success } = await execSudo('which kubectl')
    return success
  } catch (error) {
    return false
  }
}

/**
 * 执行kubectl命令
 */
const kubectl = async (command) => {
  const kubectlAvailable = await checkKubectl()
  if (!kubectlAvailable) {
    throw new Error('kubectl未安装或不可用')
  }

  const { stdout, success, stderr } = await execSudo(`kubectl ${command}`)
  if (!success) {
    throw new Error(stderr || 'kubectl命令执行失败')
  }

  return stdout
}

/**
 * 获取Pods列表
 */
export const getPods = async (namespace = 'default') => {
  try {
    const output = await kubectl(`get pods -n ${namespace} -o json`)
    const data = JSON.parse(output)
    
    return data.items.map(pod => ({
      name: pod.metadata.name,
      namespace: pod.metadata.namespace,
      status: pod.status.phase || 'Unknown',
      node: pod.spec.nodeName || '',
      restarts: pod.status.containerStatuses?.[0]?.restartCount || 0,
      age: calculateAge(pod.metadata.creationTimestamp),
    }))
  } catch (error) {
    console.error('获取Pods错误:', error)
    return []
  }
}

/**
 * 获取Pod详情
 */
export const getPodDetails = async (namespace, name) => {
  try {
    const output = await kubectl(`get pod ${name} -n ${namespace} -o json`)
    const pod = JSON.parse(output)
    
    return {
      name: pod.metadata.name,
      namespace: pod.metadata.namespace,
      status: pod.status.phase || 'Unknown',
      node: pod.spec.nodeName || '',
      restarts: pod.status.containerStatuses?.[0]?.restartCount || 0,
      age: calculateAge(pod.metadata.creationTimestamp),
      containers: pod.spec.containers.map(container => ({
        name: container.name,
        image: container.image,
        ready: pod.status.containerStatuses?.find(c => c.name === container.name)?.ready || false,
      })),
    }
  } catch (error) {
    console.error('获取Pod详情错误:', error)
    return null
  }
}

/**
 * 删除Pod
 */
export const deletePod = async (namespace, name) => {
  await kubectl(`delete pod ${name} -n ${namespace}`)
}

/**
 * 获取Pod日志
 */
export const getPodLogs = async (namespace, name, lines = 100) => {
  try {
    const output = await kubectl(`logs ${name} -n ${namespace} --tail=${lines}`)
    return output.split('\n').filter(line => line.trim())
  } catch (error) {
    console.error('获取Pod日志错误:', error)
    return []
  }
}

/**
 * 获取Deployments列表
 */
export const getDeployments = async (namespace = 'default') => {
  try {
    const output = await kubectl(`get deployments -n ${namespace} -o json`)
    const data = JSON.parse(output)
    
    return data.items.map(deployment => ({
      name: deployment.metadata.name,
      namespace: deployment.metadata.namespace,
      ready: deployment.status.readyReplicas || 0,
      available: deployment.status.availableReplicas || 0,
      desired: deployment.spec.replicas || 0,
      age: calculateAge(deployment.metadata.creationTimestamp),
    }))
  } catch (error) {
    console.error('获取Deployments错误:', error)
    return []
  }
}

/**
 * 获取Deployment详情
 */
export const getDeploymentDetails = async (namespace, name) => {
  try {
    const output = await kubectl(`get deployment ${name} -n ${namespace} -o json`)
    const deployment = JSON.parse(output)
    
    return {
      name: deployment.metadata.name,
      namespace: deployment.metadata.namespace,
      ready: deployment.status.readyReplicas || 0,
      available: deployment.status.availableReplicas || 0,
      desired: deployment.spec.replicas || 0,
      age: calculateAge(deployment.metadata.creationTimestamp),
      strategy: deployment.spec.strategy?.type || 'RollingUpdate',
    }
  } catch (error) {
    console.error('获取Deployment详情错误:', error)
    return null
  }
}

/**
 * 扩缩容Deployment
 */
export const scaleDeployment = async (namespace, name, replicas) => {
  await kubectl(`scale deployment ${name} -n ${namespace} --replicas=${replicas}`)
}

/**
 * 删除Deployment
 */
export const deleteDeployment = async (namespace, name) => {
  await kubectl(`delete deployment ${name} -n ${namespace}`)
}

/**
 * 获取Services列表
 */
export const getServices = async (namespace = 'default') => {
  try {
    const output = await kubectl(`get services -n ${namespace} -o json`)
    const data = JSON.parse(output)
    
    return data.items.map(service => ({
      name: service.metadata.name,
      namespace: service.metadata.namespace,
      type: service.spec.type || 'ClusterIP',
      clusterIP: service.spec.clusterIP || '',
      ports: (service.spec.ports || []).map(port => 
        `${port.port}${port.targetPort ? `:${port.targetPort}` : ''}/${port.protocol || 'TCP'}`
      ).join(', '),
      age: calculateAge(service.metadata.creationTimestamp),
    }))
  } catch (error) {
    console.error('获取Services错误:', error)
    return []
  }
}

/**
 * 获取Service详情
 */
export const getServiceDetails = async (namespace, name) => {
  try {
    const output = await kubectl(`get service ${name} -n ${namespace} -o json`)
    const service = JSON.parse(output)
    
    return {
      name: service.metadata.name,
      namespace: service.metadata.namespace,
      type: service.spec.type || 'ClusterIP',
      clusterIP: service.spec.clusterIP || '',
      ports: (service.spec.ports || []).map(port => ({
        port: port.port,
        targetPort: port.targetPort,
        protocol: port.protocol || 'TCP',
      })),
      age: calculateAge(service.metadata.creationTimestamp),
    }
  } catch (error) {
    console.error('获取Service详情错误:', error)
    return null
  }
}

/**
 * 删除Service
 */
export const deleteService = async (namespace, name) => {
  await kubectl(`delete service ${name} -n ${namespace}`)
}

/**
 * 获取ConfigMaps列表
 */
export const getConfigMaps = async (namespace = 'default') => {
  try {
    const output = await kubectl(`get configmaps -n ${namespace} -o json`)
    const data = JSON.parse(output)
    
    return data.items.map(cm => ({
      name: cm.metadata.name,
      namespace: cm.metadata.namespace,
      dataCount: Object.keys(cm.data || {}).length,
      age: calculateAge(cm.metadata.creationTimestamp),
    }))
  } catch (error) {
    console.error('获取ConfigMaps错误:', error)
    return []
  }
}

/**
 * 获取ConfigMap详情
 */
export const getConfigMapDetails = async (namespace, name) => {
  try {
    const output = await kubectl(`get configmap ${name} -n ${namespace} -o json`)
    const cm = JSON.parse(output)
    
    return {
      name: cm.metadata.name,
      namespace: cm.metadata.namespace,
      data: cm.data || {},
      age: calculateAge(cm.metadata.creationTimestamp),
    }
  } catch (error) {
    console.error('获取ConfigMap详情错误:', error)
    return null
  }
}

/**
 * 创建ConfigMap
 */
export const createConfigMap = async (configMapData) => {
  const { name, namespace = 'default', data } = configMapData
  
  if (!name || !data) {
    throw new Error('ConfigMap名称和数据不能为空')
  }

  // 构建kubectl create命令
  let cmd = `create configmap ${name} -n ${namespace}`
  
  for (const [key, value] of Object.entries(data)) {
    cmd += ` --from-literal=${key}=${value}`
  }

  await kubectl(cmd)
}

/**
 * 删除ConfigMap
 */
export const deleteConfigMap = async (namespace, name) => {
  await kubectl(`delete configmap ${name} -n ${namespace}`)
}

/**
 * 获取Secrets列表
 */
export const getSecrets = async (namespace = 'default') => {
  try {
    const output = await kubectl(`get secrets -n ${namespace} -o json`)
    const data = JSON.parse(output)
    
    return data.items.map(secret => ({
      name: secret.metadata.name,
      namespace: secret.metadata.namespace,
      type: secret.type || 'Opaque',
      age: calculateAge(secret.metadata.creationTimestamp),
    }))
  } catch (error) {
    console.error('获取Secrets错误:', error)
    return []
  }
}

/**
 * 获取Secret详情
 */
export const getSecretDetails = async (namespace, name) => {
  try {
    const output = await kubectl(`get secret ${name} -n ${namespace} -o json`)
    const secret = JSON.parse(output)
    
    return {
      name: secret.metadata.name,
      namespace: secret.metadata.namespace,
      type: secret.type || 'Opaque',
      age: calculateAge(secret.metadata.creationTimestamp),
    }
  } catch (error) {
    console.error('获取Secret详情错误:', error)
    return null
  }
}

/**
 * 创建Secret
 */
export const createSecret = async (secretData) => {
  const { name, namespace = 'default', type = 'Opaque', data } = secretData
  
  if (!name || !data) {
    throw new Error('Secret名称和数据不能为空')
  }

  // 构建kubectl create命令
  let cmd = `create secret ${type} ${name} -n ${namespace}`
  
  for (const [key, value] of Object.entries(data)) {
    cmd += ` --from-literal=${key}=${value}`
  }

  await kubectl(cmd)
}

/**
 * 删除Secret
 */
export const deleteSecret = async (namespace, name) => {
  await kubectl(`delete secret ${name} -n ${namespace}`)
}

/**
 * 计算资源年龄
 */
const calculateAge = (timestamp) => {
  if (!timestamp) return '-'
  
  const now = new Date()
  const created = new Date(timestamp)
  const diff = now - created
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  
  if (days > 0) {
    return `${days}d`
  } else if (hours > 0) {
    return `${hours}h`
  } else {
    return `${minutes}m`
  }
}

