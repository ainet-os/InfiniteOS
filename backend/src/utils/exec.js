import { exec, execFile } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)
const execFileAsync = promisify(execFile)

/**
 * 执行系统命令
 * @param {string} command - 要执行的命令
 * @param {object} options - 执行选项，支持 timeout（毫秒），超时后终止进程
 * @returns {Promise<{stdout: string, stderr: string, success: boolean}>}
 */
export const execCommand = async (command, options = {}) => {
  try {
    const { stdout, stderr } = await execAsync(command, {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024, // 10MB
      timeout: 10000, // 默认 10 秒，防止 nvidia-smi 等命令卡住
      ...options,
    })
    return { stdout: stdout.trim(), stderr: stderr.trim(), success: true }
  } catch (error) {
    const timedOut = error.killed === true || error.signal === 'SIGTERM'
    return {
      stdout: error.stdout?.trim() || '',
      stderr: error.stderr?.trim() || error.message,
      success: false,
      error: error.message,
      timedOut: !!timedOut,
    }
  }
}

/**
 * 以参数数组的方式执行命令，避免 shell 注入风险
 * @param {string} file - 可执行文件
 * @param {string[]} args - 参数数组
 * @param {object} options - 执行选项
 * @returns {Promise<{stdout: string, stderr: string, success: boolean}>}
 */
export const execFileCommand = async (file, args = [], options = {}) => {
  try {
    const { stdout, stderr } = await execFileAsync(file, args, {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
      timeout: 10000,
      ...options,
    })
    return {
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      success: true,
    }
  } catch (error) {
    const timedOut = error.killed === true || error.signal === 'SIGTERM'
    return {
      stdout: error.stdout?.trim() || '',
      stderr: error.stderr?.trim() || error.message,
      success: false,
      error: error.message,
      timedOut: !!timedOut,
    }
  }
}

/**
 * 执行需要sudo权限的命令
 */
export const execSudo = async (command, options = {}) => {
  return execCommand(`sudo ${command}`, options)
}

/**
 * 使用 sudo 以参数数组方式执行命令
 */
export const execSudoFile = async (command, args = [], options = {}) => {
  return execFileCommand('sudo', [command, ...args], options)
}
