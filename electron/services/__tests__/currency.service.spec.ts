import 'reflect-metadata'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { container } from 'tsyringe'
import { AppDatabaseDatasource } from '../../sqlite-data-source'
import { CurrencyService } from '../currency.service'

describe('CurrencyService', () => {
  let tempDir: string
  let dbPath: string

  beforeEach(async () => {
    container.clearInstances()
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cd-currency-test-'))
    dbPath = path.join(tempDir, 'test.db')
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

  // ─── List ─────────────────────────────────────────────────────

  it('should list seeded currencies GNF, EUR, XOF', async () => {
    const service = container.resolve(CurrencyService)
    const list = await service.list()
    const codes = list.map(c => c.code)
    expect(codes).toContain('GNF')
    expect(codes).toContain('EUR')
    expect(codes).toContain('XOF')
    expect(list.length).toBeGreaterThanOrEqual(3)
  })

  it('should list only active currencies when requested', async () => {
    const service = container.resolve(CurrencyService)
    // Deactivate one currency first
    await service.update('XOF', { is_active: false })

    const all = await service.list(false)
    const active = await service.list(true)
    expect(active.length).toBeLessThan(all.length)
    expect(active.every(c => c.is_active === true)).toBe(true)
    expect(active.find(c => c.code === 'XOF')).toBeUndefined()
  })

  // ─── GetByCode ────────────────────────────────────────────────

  it('should get a currency by code', async () => {
    const service = container.resolve(CurrencyService)
    const found = await service.getByCode('GNF')
    expect(found).toBeDefined()
    expect(found!.name).toBe('Franc Guinéen')
    expect(found!.symbol).toBe('FG')
  })

  it('should return null for non-existent currency code', async () => {
    const service = container.resolve(CurrencyService)
    const found = await service.getByCode('ZZZ')
    expect(found).toBeNull()
  })

  // ─── Create ───────────────────────────────────────────────────

  it('should create a currency with uppercase code', async () => {
    const service = container.resolve(CurrencyService)
    const created = await service.create({
      code: 'usd',
      name: 'Dollar américain',
      symbol: '$',
      decimals: 2,
    })
    expect(created.code).toBe('USD')
    expect(created.name).toBe('Dollar américain')
    expect(created.symbol).toBe('$')
    expect(created.decimals).toBe(2)
    expect(created.is_active).toBe(true)
  })

  it('should reject duplicate currency code', async () => {
    const service = container.resolve(CurrencyService)
    await expect(
      service.create({ code: 'EUR', name: 'Euro dup', symbol: '€' })
    ).rejects.toThrow('existe déjà')
  })

  it('should validate decimals >= 0 via SQL constraint', async () => {
    const service = container.resolve(CurrencyService)
    await expect(
      service.create({ code: 'NEG', name: 'Negative', symbol: 'N', decimals: -1 })
    ).rejects.toThrow()
  })

  it('should reject empty code', async () => {
    const service = container.resolve(CurrencyService)
    await expect(
      service.create({ code: '', name: 'Bad', symbol: 'B' })
    ).rejects.toThrow('Le code de la devise est requis')
  })

  it('should reject empty name', async () => {
    const service = container.resolve(CurrencyService)
    await expect(
      service.create({ code: 'BAD', name: '', symbol: 'B' })
    ).rejects.toThrow('Le nom de la devise est requis')
  })

  it('should reject empty symbol', async () => {
    const service = container.resolve(CurrencyService)
    await expect(
      service.create({ code: 'BAD', name: 'Bad', symbol: '' })
    ).rejects.toThrow('Le symbole de la devise est requis')
  })

  it('should default decimals to 0 when not provided', async () => {
    const service = container.resolve(CurrencyService)
    const created = await service.create({
      code: 'XYZ',
      name: 'Test Currency',
      symbol: 'T',
    })
    expect(created.decimals).toBe(0)
  })

  // ─── Update ───────────────────────────────────────────────────

  it('should update currency name, symbol, and decimals', async () => {
    const service = container.resolve(CurrencyService)
    const updated = await service.update('XOF', {
      name: 'Franc CFA BCEAO',
      symbol: 'F',
      decimals: 0,
    })
    expect(updated.name).toBe('Franc CFA BCEAO')
    expect(updated.symbol).toBe('F')
    expect(updated.decimals).toBe(0)
  })

  it('should keep code unchanged after update', async () => {
    const service = container.resolve(CurrencyService)
    await service.update('XOF', { name: 'Updated Name' })
    const found = await service.getByCode('XOF')
    expect(found).toBeDefined()
    expect(found!.code).toBe('XOF')
    // Should not be findable under a different code
    const notFound = await service.getByCode('Updated Name')
    expect(notFound).toBeNull()
  })

  it('should throw when updating non-existent currency', async () => {
    const service = container.resolve(CurrencyService)
    await expect(
      service.update('ZZZ', { name: 'Ghost' })
    ).rejects.toThrow('Devise introuvable')
  })

  // ─── Delete ───────────────────────────────────────────────────

  it('should reject deleting GNF (default currency)', async () => {
    const service = container.resolve(CurrencyService)
    await expect(service.delete('GNF')).rejects.toThrow(
      'Impossible de supprimer la devise par défaut'
    )
  })

  it('should reject deleting currency set as default via app_settings', async () => {
    const service = container.resolve(CurrencyService)
    await service.setDefault('EUR')
    await expect(service.delete('EUR')).rejects.toThrow(
      'elle est définie comme devise par défaut'
    )
  })

  it('should reject deleting currency referenced by medical acts', async () => {
    const service = container.resolve(CurrencyService)
    // Create a new currency
    await service.create({
      code: 'USD', name: 'US Dollar', symbol: '$', decimals: 2,
    })

    // Get a service to link the act to
    const { ServiceService } = await import('../service.service')
    const svcService = container.resolve(ServiceService)
    const services = await svcService.list()
    const firstService = services[0]

    // Create a medical act referencing USD
    const { MedicalActService } = await import('../medical-act.service')
    const actService = container.resolve(MedicalActService)
    await actService.create({
      code: 'USD-ACT-001',
      label: 'US Dollar Act',
      price: 100,
      currency_code: 'USD',
      service_id: firstService.id!,
    })

    // Deleting USD should fail because an act references it
    await expect(service.delete('USD')).rejects.toThrow(
      /acte\(s\) médical\(eaux\)/
    )
  })

  it('should succeed deleting an unused currency', async () => {
    const service = container.resolve(CurrencyService)
    await service.create({
      code: 'GBP', name: 'Livre sterling', symbol: '£', decimals: 2,
    })

    await expect(service.delete('GBP')).resolves.not.toThrow()
    const found = await service.getByCode('GBP')
    expect(found).toBeNull()
  })

  it('should throw when deleting non-existent currency', async () => {
    const service = container.resolve(CurrencyService)
    await expect(service.delete('ZZZ')).rejects.toThrow('Devise introuvable')
  })

  // ─── Default currency ─────────────────────────────────────────

  it('should return GNF as default currency from app_settings', async () => {
    const service = container.resolve(CurrencyService)
    const defaultCode = await service.getDefault()
    expect(defaultCode).toBe('GNF')
  })

  it('should set and get default currency in app_settings', async () => {
    const service = container.resolve(CurrencyService)
    await service.setDefault('EUR')
    const defaultCode = await service.getDefault()
    expect(defaultCode).toBe('EUR')
  })

  it('should throw setDefault for non-existent currency', async () => {
    const service = container.resolve(CurrencyService)
    await expect(service.setDefault('ZZZ')).rejects.toThrow(
      'non prise en charge'
    )
  })
})
