import 'reflect-metadata'
import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { container } from 'tsyringe'
import { autoUpdater } from 'electron-updater'
import { AppDatabaseDatasource } from './sqlite-data-source'
import { registerAllHandlers } from './handlers'

let mainWindow: BrowserWindow | null = null

function setupAutoUpdate() {
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  if (!app.isPackaged) {
    autoUpdater.logger = {
      info: (message: string) => console.log(message),
      warn: (message: string) => console.warn(message),
      error: (message: string, error?: Error) => {
        console.error(message, error)
      },
      debug: (message: string) => console.debug(message),
    }
    autoUpdater.forceDevUpdateConfig = true
    app.commandLine.appendSwitch('ignore-certificate-errors')
  }
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1200,
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

setupAutoUpdate()

autoUpdater.on('checking-for-update', () => {
  console.log('Recherche de mises à jour...')
  mainWindow?.webContents.send('checking_for_update')
})

autoUpdater.on('update-available', (info: any) => {
  console.log('Mise à jour disponible', info)
  mainWindow?.webContents.send('update_available', {
    version: info.version,
    releaseDate: info.releaseDate,
    releaseNotes: info.releaseNotes,
  })
})

autoUpdater.on('update-not-available', (info: any) => {
  console.log('Aucune mise à jour disponible', info)
  mainWindow?.webContents.send('update_not_available')
})

autoUpdater.on('download-progress', (progressObj: any) => {
  console.log('Progression du téléchargement:', progressObj.percent)
  mainWindow?.webContents.send('download_progress', progressObj)
})

autoUpdater.on('update-downloaded', (info: any) => {
  console.log('Mise à jour téléchargée', info)
  mainWindow?.webContents.send('update_downloaded', {
    version: info.version,
    releaseDate: info.releaseDate,
    releaseNotes: info.releaseNotes,
  })
})

autoUpdater.on('error', (error: any) => {
  console.error('Erreur lors de la mise à jour:', error)
  mainWindow?.webContents.send('update_error', {
    message: error.message,
    stack: error.stack,
  })
})

ipcMain.handle('check-for-updates', async () => {
  if (!app.isPackaged) {
    const updateInfo = {
      version: '1.0.1',
      releaseDate: new Date().toISOString(),
      releaseNotes: ['Corrections de bugs', 'Amélioration des performances'],
    }
    mainWindow?.webContents.send('update_available', updateInfo)
    return { updateInfo }
  } else {
    try {
      const updateCheckResult = await autoUpdater.checkForUpdates()
      return { updateInfo: updateCheckResult?.updateInfo }
    } catch (error) {
      console.error('Erreur lors de la vérification des mises à jour:', error)
      throw error
    }
  }
})

ipcMain.handle('download-update', async () => {
  console.log('Téléchargement de la mise à jour demandé')
  try {
    await autoUpdater.downloadUpdate()
  } catch (error) {
    console.log('Erreur lors du téléchargement:', error)
    throw error
  }
})

ipcMain.handle('install-update', () => {
  console.log('Installation de la mise à jour demandée')
  setImmediate(() => autoUpdater.quitAndInstall())
})

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
