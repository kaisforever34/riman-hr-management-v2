const { app, BrowserWindow } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const fs = require('fs')

const PORT = 3000
let mainWindow = null
let serverProcess = null

function getResourcesPath() {
  if (app.isPackaged) {
    return path.join(path.dirname(app.getPath('exe')), 'resources')
  }
  return path.join(__dirname, '..')
}

function getDataPath() {
  const dataDir = path.join(app.getPath('userData'), 'data')
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
  return dataDir
}

function startServer() {
  return new Promise((resolve, reject) => {
    const resPath = getResourcesPath()
    const serverPath = path.join(resPath, 'standalone', 'server.js')
    const dbPath = path.join(getDataPath(), 'riman.db')

    const env = Object.assign({}, process.env, {
      DATABASE_URL: 'file:' + dbPath,
      AUTH_SECRET: 'electron-riman-hr-secret-key-change-in-production-32chars!',
      AUTH_URL: 'http://localhost:' + PORT,
      NODE_ENV: 'production',
      PORT: String(PORT),
      HOSTNAME: '127.0.0.1',
    })

    serverProcess = spawn(process.execPath || 'node', [serverPath], {
      env: env,
      stdio: 'inherit',
    })

    serverProcess.on('error', reject)
    setTimeout(resolve, 4000)
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: 'Riman HR Management',
    icon: path.join(getResourcesPath(), 'standalone', 'public', 'favicon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  mainWindow.loadURL('http://localhost:' + PORT + '/en/dashboard')
  mainWindow.on('closed', function () { mainWindow = null })
}

app.whenReady().then(async function () {
  await startServer()
  createWindow()
})

app.on('window-all-closed', function () {
  if (serverProcess) serverProcess.kill()
  app.quit()
})

app.on('activate', function () {
  if (mainWindow === null) createWindow()
})
