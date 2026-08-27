const { app, BrowserWindow } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const fs = require('fs')

const PORT = 3999
const HOST = '127.0.0.1'
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

function getNodeBinary() {
  var resPath = getResourcesPath()
  var bundled = path.join(resPath, 'node', 'node.exe')
  if (fs.existsSync(bundled)) return bundled
  return 'node'
}

function startServer() {
  return new Promise(function (resolve, reject) {
    var resPath = getResourcesPath()
    var serverPath = path.join(resPath, 'standalone', 'server.js')
    var dbPath = path.join(getDataPath(), 'riman.db')
    var nodeBin = getNodeBinary()

    var env = Object.assign({}, process.env, {
      DATABASE_URL: 'file:' + dbPath,
      AUTH_SECRET: 'electron-riman-hr-secret-key-change-in-production-32chars!',
      AUTH_URL: 'http://' + HOST + ':' + PORT,
      NODE_ENV: 'production',
      PORT: String(PORT),
      HOSTNAME: HOST,
    })

    serverProcess = spawn(nodeBin, [serverPath], {
      env: env,
      stdio: 'inherit',
    })

    serverProcess.on('error', function (err) {
      console.error('Server failed to start:', err)
      reject(err)
    })

    serverProcess.on('exit', function (code) {
      if (code && code !== 0) {
        console.error('Server exited with code:', code)
      }
    })

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

  mainWindow.loadURL('http://' + HOST + ':' + PORT + '/en/dashboard')
  mainWindow.on('closed', function () { mainWindow = null })
}

app.whenReady().then(async function () {
  try {
    await startServer()
    createWindow()
  } catch (err) {
    console.error('Failed to start:', err)
    app.quit()
  }
})

app.on('window-all-closed', function () {
  if (serverProcess) serverProcess.kill()
  app.quit()
})

app.on('activate', function () {
  if (mainWindow === null) createWindow()
})
