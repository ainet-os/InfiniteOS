import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

/**
 * 执行系统命令
 * @param {string} command - 要执行的命令
 * @param {object} options - 执行选项
 * @returns {Promise<{stdout: string, stderr: string}>}
 */
export const execCommand = async (command, options = {}) => {
  try {
    const { stdout, stderr } = await execAsync(command, {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024, // 10MB
      ...options,
    })
    return { stdout: stdout.trim(), stderr: stderr.trim(), success: true }
  } catch (error) {
    return {
      stdout: error.stdout?.trim() || '',
      stderr: error.stderr?.trim() || error.message,
      success: false,
      error: error.message,
    }
  }
}

/**
 * 执行需要sudo权限的命令
 */
export const execSudo = async (command, options = {}) => {
  return execCommand(`sudo ${command}`, options)
}

