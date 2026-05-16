import 'reflect-metadata'
import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { container } from 'tsyringe'
import { AppDatabaseDatasource } from './sqlite-data-source'
import { registerAllHandlers } from './handlers'

let mainWindow: BrowserWindow | null = null

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 680,
    icon: join(__dirname, '../public/cde.png'),
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(async () => {
  try {
    registerAllHandlers()
  } catch (error) {
    console.error('[CDE] Handler registration error:', error)
  }

  try {
    const datasource = container.resolve(AppDatabaseDatasource)
    await datasource.initialize()
  } catch (error) {
    console.error('[CDE] Database initialization error:', error)
  }

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

ipcMain.handle('app:get-version', () => app.getVersion())
