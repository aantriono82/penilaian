const fs = require('fs')
const path = require('path')
const net = require('net')

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {}

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/)
  const env = {}

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const eqIndex = trimmed.indexOf('=')
    if (eqIndex === -1) continue

    const key = trimmed.slice(0, eqIndex).trim()
    const value = trimmed.slice(eqIndex + 1).trim()
    env[key] = value
  }

  return env
}

function parsePortFromUrl(value) {
  try {
    const parsed = new URL(value)
    if (parsed.port) return Number(parsed.port)
    if (parsed.protocol === 'https:') return 443
    if (parsed.protocol === 'http:') return 80
    return null
  } catch {
    return null
  }
}

function checkPortAvailable(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const server = net.createServer()

    server.once('error', (err) => {
      if (err && err.code === 'EADDRINUSE') return resolve(false)
      resolve(false)
    })

    server.once('listening', () => {
      server.close(() => resolve(true))
    })

    server.listen(port, host)
  })
}

async function main() {
  const rootDir = process.cwd()
  const backendEnv = readEnvFile(path.join(rootDir, 'backend', '.env'))
  const frontendEnv = readEnvFile(path.join(rootDir, 'frontend', '.env'))

  const backendPort = Number(backendEnv.PORT || process.env.PORT || 3002)
  const frontendProxyTarget = frontendEnv.VITE_DEV_API_TARGET || 'http://localhost:3002'
  const frontendProxyPort = parsePortFromUrl(frontendProxyTarget)

  const backendPortFree = await checkPortAvailable(backendPort)

  if (!backendPortFree) {
    console.error(`\n[dev-check] Port backend ${backendPort} sedang dipakai.`)
    console.error(`[dev-check] Hentikan proses lama dulu: lsof -i :${backendPort}`)
    console.error(`[dev-check] Lalu kill <PID> dan jalankan ulang npm run dev.\n`)
    process.exit(1)
  }

  if (frontendProxyPort && frontendProxyPort !== backendPort) {
    console.error(`\n[dev-check] Konfigurasi port tidak sinkron.`)
    console.error(`[dev-check] backend/.env -> PORT=${backendPort}`)
    console.error(`[dev-check] frontend/.env -> VITE_DEV_API_TARGET=${frontendProxyTarget}`)
    console.error(`[dev-check] Samakan target frontend ke http://localhost:${backendPort} lalu jalankan ulang.\n`)
    process.exit(1)
  }

  console.log(`[dev-check] OK. Backend akan jalan di ${backendPort}, proxy frontend -> ${frontendProxyTarget}`)
}

main().catch((err) => {
  console.error('\n[dev-check] Gagal memeriksa konfigurasi dev.')
  console.error(err)
  process.exit(1)
})
