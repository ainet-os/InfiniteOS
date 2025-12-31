import { exec } from 'child_process'
import { promisify } from 'util'
import { spawn } from 'child_process'

const execAsync = promisify(exec)

/**
 * 使用PAM进行用户认证
 * 通过pamtester工具或su命令使用PAM验证
 */
export const authenticateWithPAM = async (username, password) => {
  return new Promise((resolve) => {
    // 首先检查用户是否存在
    exec(`id -u ${username}`, (error) => {
      if (error) {
        return resolve({ valid: false, error: '用户不存在' })
      }

      // 优先使用pamtester工具
      exec(`which pamtester`, (error) => {
        if (!error) {
          // 使用pamtester进行PAM认证
          const pamtesterProcess = spawn('pamtester', ['login', username, 'authenticate'], {
            stdio: ['pipe', 'pipe', 'pipe']
          })

          let output = ''
          let errorOutput = ''

          pamtesterProcess.stdout.on('data', (data) => {
            output += data.toString()
          })

          pamtesterProcess.stderr.on('data', (data) => {
            errorOutput += data.toString()
          })

          pamtesterProcess.on('close', (code) => {
            if (code === 0) {
              return resolve({ valid: true })
            }
            if (errorOutput.includes('Authentication failure') || errorOutput.includes('Permission denied')) {
              return resolve({ valid: false, error: '密码错误' })
            }
            return resolve({ valid: false, error: 'PAM认证失败' })
          })

          // 等待一下再发送密码，确保pamtester准备好接收
          setTimeout(() => {
            pamtesterProcess.stdin.write(password + '\n')
            pamtesterProcess.stdin.end()
          }, 300)

          // 超时处理（增加到10秒）
          setTimeout(() => {
            if (!pamtesterProcess.killed) {
              pamtesterProcess.kill()
              resolve({ valid: false, error: 'PAM验证超时' })
            }
          }, 10000)
        } else {
          // 备用方法: 使用su命令（通过PAM）
          const suProcess = spawn('su', ['-', username, '-c', 'echo PAM_AUTH_OK'], {
            stdio: ['pipe', 'pipe', 'pipe']
          })

          let output = ''
          let errorOutput = ''

          suProcess.stdout.on('data', (data) => {
            output += data.toString()
          })

          suProcess.stderr.on('data', (data) => {
            errorOutput += data.toString()
          })

          suProcess.on('close', (code) => {
            if (output.includes('PAM_AUTH_OK') && !errorOutput.includes('Authentication failure')) {
              return resolve({ valid: true })
            }
            if (errorOutput.includes('Authentication failure')) {
              return resolve({ valid: false, error: '密码错误' })
            }
            return resolve({ valid: false, error: 'PAM认证失败' })
          })

          // 监听stderr，当出现"Password:"提示时发送密码
          let passwordSent = false
          const checkAndSendPassword = () => {
            if (!passwordSent && (output.includes('Password:') || errorOutput.includes('Password:'))) {
              passwordSent = true
              suProcess.stdin.write(password + '\n')
              suProcess.stdin.end()
            }
          }

          // 定期检查是否需要发送密码
          const passwordCheckInterval = setInterval(() => {
            checkAndSendPassword()
          }, 100)

          // 等待一下再发送密码（备用方法）
          setTimeout(() => {
            if (!passwordSent) {
              passwordSent = true
              suProcess.stdin.write(password + '\n')
              suProcess.stdin.end()
            }
            clearInterval(passwordCheckInterval)
          }, 500)

          // 超时处理
          setTimeout(() => {
            clearInterval(passwordCheckInterval)
            if (!suProcess.killed) {
              suProcess.kill()
              resolve({ valid: false, error: 'PAM验证超时' })
            }
          }, 10000)
        }
      })
    })
  })
}

/**
 * 使用pamtester进行PAM认证（更可靠的方法）
 */
export const authenticateWithPAMTester = async (username, password) => {
  return new Promise((resolve) => {
    // 检查用户是否存在
    exec(`id -u ${username}`, (error) => {
      if (error) {
        return resolve({ valid: false, error: '用户不存在' })
      }

      // 检查pamtester是否可用
      exec(`which pamtester`, (error) => {
        if (error) {
          // pamtester不可用，使用su命令作为备用
          return authenticateWithPAM(username, password).then(resolve)
        }

        // 使用pamtester进行PAM认证
        const pamtesterProcess = spawn('pamtester', ['login', username, 'authenticate'], {
          stdio: ['pipe', 'pipe', 'pipe']
        })

        let output = ''
        let errorOutput = ''

        pamtesterProcess.stdout.on('data', (data) => {
          output += data.toString()
        })

        pamtesterProcess.stderr.on('data', (data) => {
          errorOutput += data.toString()
        })

        pamtesterProcess.on('close', (code) => {
          if (code === 0) {
            return resolve({ valid: true })
          }
          if (errorOutput.includes('Authentication failure') || errorOutput.includes('Permission denied')) {
            return resolve({ valid: false, error: '密码错误' })
          }
          return resolve({ valid: false, error: 'PAM认证失败' })
        })

        // 等待一下再发送密码
        setTimeout(() => {
          pamtesterProcess.stdin.write(password + '\n')
          pamtesterProcess.stdin.end()
        }, 300)

        // 超时处理
        setTimeout(() => {
          if (!pamtesterProcess.killed) {
            pamtesterProcess.kill()
            resolve({ valid: false, error: 'PAM验证超时' })
          }
        }, 10000)
      })
    })
  })
}

/**
 * 统一的PAM认证入口
 */
export const authenticateSystemUser = async (username, password) => {
  // 优先使用pamtester，如果不可用则使用su命令
  return await authenticateWithPAMTester(username, password)
}
