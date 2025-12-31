import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import http from 'http'
import { attachVncWsProxy } from './src/ws/vncProxy.js'

// Load environment variables
dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Import routes
import authRoutes from './src/routes/auth.js'
import systemRoutes from './src/routes/system.js'
import computeRoutes from './src/routes/compute.js'
import virtualMachineRoutes from './src/routes/virtualMachines.js'
import containerRoutes from './src/routes/containers.js'
import modelRoutes from './src/routes/models.js'
import networkRoutes from './src/routes/network.js'
import storageRoutes from './src/routes/storage.js'
import serviceRoutes from './src/routes/services.js'
import logRoutes from './src/routes/logs.js'
import userRoutes from './src/routes/users.js'
import k8sRoutes from './src/routes/k8s.js'
import alertRoutes from './src/routes/alerts.js'

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/system', systemRoutes)
app.use('/api/compute', computeRoutes)
app.use('/api/virtual-machines', virtualMachineRoutes)
app.use('/api/containers', containerRoutes)
app.use('/api/models', modelRoutes)
app.use('/api/network', networkRoutes)
app.use('/api/storage', storageRoutes)
app.use('/api/services', serviceRoutes)
app.use('/api/logs', logRoutes)
app.use('/api/users', userRoutes)
app.use('/api/k8s', k8sRoutes)
app.use('/api/alerts', alertRoutes)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err)
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  })
})

// Start server (HTTP + WebSocket upgrade)
const server = http.createServer(app)
attachVncWsProxy(server)

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 InfiniteOS Backend Server running on port ${PORT}`)
  console.log(`📡 API endpoints available at http://localhost:${PORT}/api`)
})

export default app
