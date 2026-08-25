import { app, BrowserWindow } from 'electron'
import path from 'path'
import { spawn } from 'child_process'

const PORT = 3000
let mainWindow: BrowserWindow | null = null
let serverProcess: ReturnType<typeof spawn> | null = null

function startServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    const serverPath = path.join(__dirname, '..', 'standalone', 'server.js')
    serverProcess = spawn('node', [serverPath], {
      env: {
        ...process.env,
        PORT: String(PORT),
        HOSTNAME: '127.0.0.1',
        NODE_ENV: 'production',
        DATABASE_URL: path.join(__dirname, '..', 'data', 'riman.db'),
        AUTH_SECRET: 'electron-built-in-secret-change-in-production-32ch',
        AUTH_URL: `http://localhost:${PORT}`,
      },
      stdio: 'inherit',
    })

    serverProcess.on('error', reject)

    setTimeout(resolve, 3000)
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: 'Riman HR Management',
    icon: path.join(__dirname, '..', 'public', 'favicon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  mainWindow.loadURL(`http://localhost:${PORT}/en/dashboard`)
  mainWindow.on('closed', () => { mainWindow = null })
}

app.whenReady().then(async () => {
  await startServer()
  createWindow()
})

app.on('window-all-closed', () => {
  if (serverProcess) serverProcess.kill()
  app.quit()
})

app.on('activate', () => {
  if (mainWindow === null) createWindow()
})
