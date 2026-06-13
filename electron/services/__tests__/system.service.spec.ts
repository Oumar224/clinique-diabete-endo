import 'reflect-metadata'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import path from 'node:path'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import os from 'node:os'
import { container } from 'tsyringe'

// ── Hoisted mutable state for the electron mock ─────────────────
const mockElectronState = vi.hoisted(() => ({ userDataPath: '' }))

// ── Mock electron BEFORE any module imports ─────────────────────
vi.mock('electron', () => ({
  app: {
    getPath: (name: string) => {
      if (name === 'userData') return mockElectronState.userDataPath
      return '/tmp'
    },
    getVersion: () => '1.0.0-test',
    getName: () => 'cde-test',
  },
}))

import { AppDatabaseDatasource } from '../../sqlite-data-source'
import { SystemService } from '../system.service'

describe('SystemService', () => {
  let tempDir: string
  let dbPath: string

  beforeEach(async () => {
    container.clearInstances()
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cd-system-test-'))
    // SystemService resolves dbPath as:
    //   path.join(app.getPath('userData'), 'cde-clinique.db')
    // We set userDataPath = tempDir so the db lives at tempDir/cde-clinique.db
    mockElectronState.userDataPath = tempDir
    dbPath = path.join(tempDir, 'cde-clinique.db')

    // The restore() method generates safety backup paths inside
    // app.getPath('userData')/backups/ — pre-create that directory
    await fsp.mkdir(path.join(tempDir, 'backups'), { recursive: true })

    container.register('DB_PATH', { useValue: dbPath })

    const datasource = container.resolve(AppDatabaseDatasource)
    await datasource.initialize()
  })

  afterEach(() => {
    container.clearInstances()
    try {
      if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath)
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch { /* cleanup best-effort */ }
  })

  // ─── App Info ─────────────────────────────────────────────────

  it('should return app info with version and platform details', async () => {
    const service = container.resolve(SystemService)
    const info = await service.getAppInfo()

    expect(info).toHaveProperty('app_version')
    expect(info).toHaveProperty('electron_version')
    expect(info).toHaveProperty('node_version')
    expect(info).toHaveProperty('sqlite_version')
    expect(info).toHaveProperty('platform')
    expect(info).toHaveProperty('platform_arch')

    expect(info.sqlite_version).toBeTruthy()
    expect(info.node_version).toBeTruthy()
    expect(info.platform).toBe('linux')
    expect(typeof info.app_version).toBe('string')
  })

  // ─── DB Stats ─────────────────────────────────────────────────

  it('should return DB stats with correct structure and record counts', async () => {
    const service = container.resolve(SystemService)
    const stats = await service.getDbStats()

    expect(stats).toHaveProperty('db_size_bytes')
    expect(typeof stats.db_size_bytes).toBe('number')
    expect(stats).toHaveProperty('db_size_human')
    expect(typeof stats.db_size_human).toBe('string')
    expect(stats).toHaveProperty('record_counts')
    expect(typeof stats.record_counts).toBe('object')

    // Should count records in key user-facing tables
    expect(stats.record_counts).toHaveProperty('user')
    expect(stats.record_counts).toHaveProperty('patient')
    expect(stats.record_counts).toHaveProperty('appointment')
    expect(stats.record_counts).toHaveProperty('services')
    expect(stats.record_counts).toHaveProperty('medical_acts')
    expect(stats.record_counts).toHaveProperty('act_price_history')
    expect(stats.record_counts).toHaveProperty('session')
    expect(stats.record_counts).toHaveProperty('app_settings')

    // Seeded data
    expect(stats.record_counts.user).toBeGreaterThanOrEqual(1)
    expect(stats.record_counts.services).toBeGreaterThanOrEqual(5)
    expect(stats.record_counts.medical_acts).toBeGreaterThanOrEqual(3)
    expect(stats.record_counts.act_price_history).toBeGreaterThanOrEqual(3)
    expect(stats.record_counts.app_settings).toBeGreaterThanOrEqual(1)

    // Empty tables should report 0
    expect(stats.record_counts.patient).toBe(0)
    expect(stats.record_counts.appointment).toBe(0)
  })

  it('should report db_size_bytes as a number', async () => {
    const service = container.resolve(SystemService)
    const stats = await service.getDbStats()
    expect(typeof stats.db_size_bytes).toBe('number')
  })

  // ─── Backup ───────────────────────────────────────────────────

  it('should create a valid SQLite backup file at the specified path', async () => {
    const service = container.resolve(SystemService)
    const backupPath = path.join(tempDir, 'backup-test.db')

    const result = await service.backup(backupPath)

    expect(result.file_path).toBe(backupPath)
    expect(result.size_bytes).toBeGreaterThan(0)
    expect(result.date).toBeTruthy()
    expect(fs.existsSync(backupPath)).toBe(true)

    // Verify SQLite magic header
    const fd = fs.openSync(backupPath, 'r')
    try {
      const header = Buffer.alloc(16)
      fs.readSync(fd, header, 0, 16, 0)
      expect(header.toString('ascii', 0, 16)).toBe('SQLite format 3\x00')
    } finally {
      fs.closeSync(fd)
    }
  })

  // ─── Restore ──────────────────────────────────────────────────

  it('should throw on restore of non-existent file', async () => {
    const service = container.resolve(SystemService)
    await expect(
      service.restore('/nonexistent/backup/path.db')
    ).rejects.toThrow('Fichier de sauvegarde introuvable')
  })

  it('should throw on restore of invalid file (bad SQLite header)', async () => {
    const service = container.resolve(SystemService)
    const invalidPath = path.join(tempDir, 'not-a-db.txt')
    await fsp.writeFile(invalidPath, 'this is not a sqlite database')

    await expect(service.restore(invalidPath)).rejects.toThrow(
      'n\'est pas une base de données SQLite valide'
    )
  })

  it('should restore from a valid backup and signal restart with safety backup', async () => {
    const service = container.resolve(SystemService)

    // Create backup first
    const backupPath = path.join(tempDir, 'restore-test.db')
    await service.backup(backupPath)

    // Restore from backup
    const result = await service.restore(backupPath)
    expect(result.needs_restart).toBe(true)
    expect(result.safety_backup).toBeTruthy()
    // Verify safety backup file exists
    expect(fs.existsSync(result.safety_backup!)).toBe(true)
  })
})
