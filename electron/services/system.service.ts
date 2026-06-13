import { inject, singleton } from 'tsyringe'
import { app } from 'electron'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import type { Kysely } from 'kysely'
import { sql } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import type { DbStatsDto, BackupResultDto, AppInfoDto } from '../dto/settings.dto'

/**
 * User-facing table names for record-count display.
 * Internal/system tables are excluded.
 */
const USER_TABLES = [
  'user',
  'patient',
  'appointment',
  'invoice',
  'invoice_item',
  'invoice_payment',
  'services',
  'medical_acts',
  'act_price_history',
  'session',
  'app_settings',
] as const

@singleton()
export class SystemService {
  public db: Kysely<DB>
  private readonly dbPath: string

  constructor(@inject(AppDatabaseDatasource) datasource: AppDatabaseDatasource) {
    this.db = datasource.getInstance()
    this.dbPath = this.resolveDbPath()
  }

  // ─── Database statistics ─────────────────────────────────────
  async getDbStats(): Promise<DbStatsDto> {
    let dbSizeBytes = 0
    try {
      const stat = await fsp.stat(this.dbPath)
      dbSizeBytes = stat.size
    } catch {
      // File may not exist yet (fresh install, in-memory test)
    }

    const recordCounts: Record<string, number> = {}

    for (const table of USER_TABLES) {
      try {
        const result = await sql<{ count: number }>`
          SELECT COUNT(*) AS count FROM ${sql.table(table as string)}
        `.execute(this.db)
        recordCounts[table] = Number(result.rows[0]?.count ?? 0)
      } catch {
        // Table may not exist yet during early migrations
        recordCounts[table] = 0
      }
    }

    // Include WAL and SHM sizes if present (post-crash state)
    let walSize = 0
    let shmSize = 0
    try {
      if (fs.existsSync(this.dbPath + '-wal')) {
        walSize = (await fsp.stat(this.dbPath + '-wal')).size
      }
      if (fs.existsSync(this.dbPath + '-shm')) {
        shmSize = (await fsp.stat(this.dbPath + '-shm')).size
      }
    } catch {
      // best effort
    }

    const totalBytes = dbSizeBytes + walSize + shmSize

    return {
      db_size_bytes: dbSizeBytes,
      db_size_human: this.formatBytes(totalBytes),
      record_counts: recordCounts,
    }
  }

  // ─── Backup: copy the SQLite file to a target path ───────────
  async backup(targetPath?: string): Promise<BackupResultDto> {
    if (!fs.existsSync(this.dbPath)) {
      throw new Error('Base de données introuvable')
    }

    const backupPath = targetPath ?? this.generateBackupPath()

    // Ensure target directory exists
    const backupDir = path.dirname(backupPath)
    await fsp.mkdir(backupDir, { recursive: true })

    // Force a WAL checkpoint for a consistent snapshot
    try {
      await sql`PRAGMA wal_checkpoint(TRUNCATE)`.execute(this.db)
    } catch {
      // best-effort
    }

    await fsp.copyFile(this.dbPath, backupPath)

    // Copy WAL/SHM if they somehow remain after checkpoint
    for (const ext of ['-wal', '-shm']) {
      const src = this.dbPath + ext
      if (fs.existsSync(src)) {
        try { await fsp.copyFile(src, backupPath + ext) } catch { /* ignore */ }
      }
    }

    const backupStat = await fsp.stat(backupPath)

    return {
      file_path: backupPath,
      date: new Date().toISOString(),
      size_bytes: backupStat.size,
    }
  }

  // ─── Restore: replace DB file, then signal restart ───────────
  async restore(backupPath: string): Promise<{ needs_restart: boolean; safety_backup: string | null }> {
    if (!fs.existsSync(backupPath)) {
      throw new Error('Fichier de sauvegarde introuvable')
    }

    // Validate SQLite header magic bytes
    this.validateSqliteHeader(backupPath)

    // Safety: create a pre-restore backup
    const safetyBackup = this.generateBackupPath('pre-restore')
    if (fs.existsSync(this.dbPath)) {
      await fsp.copyFile(this.dbPath, safetyBackup)
    }

    // Replace the database file
    await fsp.copyFile(backupPath, this.dbPath)

    // IMPORTANT: The app must restart to pick up the new database.
    // Return signal to renderer, which will prompt the user.
    return {
      needs_restart: true,
      safety_backup: safetyBackup,
    }
  }

  // ─── Application info ────────────────────────────────────────
  async getAppInfo(): Promise<AppInfoDto> {
    let sqliteVersion = 'inconnue'
    try {
      const result = await sql<{ version: string }>`
        SELECT sqlite_version() AS version
      `.execute(this.db)
      sqliteVersion = result.rows[0]?.version ?? 'inconnue'
    } catch {
      // Database not initialized yet
    }

    return {
      app_version: app.getVersion(),
      electron_version: process.versions.electron ?? 'inconnue',
      node_version: process.versions.node ?? 'inconnue',
      sqlite_version: sqliteVersion,
      platform: process.platform,
      platform_arch: process.arch,
    }
  }

  // ─── Private helpers ─────────────────────────────────────────

  private generateBackupPath(prefix = 'backup'): string {
    const userDataPath = app.getPath('userData')
    const backupDir = path.join(userDataPath, 'backups')
    const timestamp = new Date().toISOString().replace(/[:.]+/g, '-')
    return path.join(backupDir, `cde-${prefix}-${timestamp}.db`)
  }

  private resolveDbPath(): string {
    // Extract the path from the dialect internals if possible,
    // otherwise reconstruct the default path.
    try {
      return path.join(app.getPath('userData'), 'cde-clinique.db')
    } catch {
      return ':memory:'
    }
  }

  private validateSqliteHeader(filePath: string): void {
    const header = Buffer.alloc(16)
    const fd = fs.openSync(filePath, 'r')
    try {
      fs.readSync(fd, header, 0, 16, 0)
      const expected = 'SQLite format 3\x00'
      if (header.toString('ascii', 0, 16) !== expected) {
        throw new Error('Le fichier sélectionné n\'est pas une base de données SQLite valide')
      }
    } finally {
      fs.closeSync(fd)
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 o'
    const units = ['o', 'Ko', 'Mo', 'Go']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    const val = bytes / Math.pow(1024, i)
    return `${val.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
  }
}
