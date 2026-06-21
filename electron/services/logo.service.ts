import { singleton } from 'tsyringe'
import { app, BrowserWindow } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import pngToIco from 'png-to-ico'

@singleton()
export class LogoService {
  private readonly logoDir: string
  private readonly pngPath: string
  private readonly icoPath: string

  constructor() {
    this.logoDir = app.getPath('userData')
    this.pngPath = path.join(this.logoDir, 'logo.png')
    this.icoPath = path.join(this.logoDir, 'logo.ico')
  }

  async getLogoBase64(): Promise<string | null> {
    try {
      if (!fs.existsSync(this.pngPath)) return null
      const buffer = fs.readFileSync(this.pngPath)
      const ext = path.extname(this.pngPath).slice(1)
      return `data:image/${ext};base64,${buffer.toString('base64')}`
    } catch {
      return null
    }
  }

  async saveLogo(base64Data: string): Promise<void> {
    const matches = base64Data.match(/^data:image\/(\w+);base64,(.+)$/)
    if (!matches) throw new Error('Format de fichier invalide. Utilisez une image PNG ou JPEG.')
    const [, , b64] = matches
    const buffer = Buffer.from(b64, 'base64')
    fs.writeFileSync(this.pngPath, buffer)

    try {
      const icoBuffer = await pngToIco(this.pngPath)
      fs.writeFileSync(this.icoPath, icoBuffer)
    } catch {
      // ICO generation is non-critical
    }

    const win = BrowserWindow.getAllWindows()[0]
    if (win) {
      try { win.setIcon(this.pngPath) } catch {}
    }
  }
}
