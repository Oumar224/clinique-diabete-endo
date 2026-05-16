import "reflect-metadata"
import { describe, it, expect, beforeEach, afterEach } from "vitest"
import path from "node:path"
import fs from "node:fs"
import os from "node:os"
import { container } from "tsyringe"
import { AppDatabaseDatasource } from "../../sqlite-data-source"
import { PatientService } from "../patient.service"
import { PatientEntity } from "../../entities/patient.entity"
import { EntityRegistry } from "../../automerge/entity-registry"

describe("PatientService", () => {
  let tempDir: string
  let dbPath: string

  beforeEach(async () => {
    container.clearInstances()
    EntityRegistry.getInstance().clear()
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cd-patient-test-"))
    dbPath = path.join(tempDir, "test.db")
    container.register("DB_PATH", { useValue: dbPath })
    const datasource = container.resolve(AppDatabaseDatasource)
    await datasource.initialize()
  })

  afterEach(() => {
    container.clearInstances()
    try {
      if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath)
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch {}
  })

  it("should create and retrieve a patient", async () => {
    const service = container.resolve(PatientService)
    const dto = PatientEntity.fromDto({
      civilite: 'M',
      nom: 'Diallo',
      prenom: 'Amadou',
      date_naissance: '1985-06-15',
      nir: '1850615123456',
      telephone: '0612345678',
    })

    const created = await service.create(dto)
    expect(created.id).toBeDefined()
    expect(created.nom).toBe('Diallo')

    const found = await service.getById(created.id!)
    expect(found).toBeDefined()
    expect(found!.prenom).toBe('Amadou')
  })

  it("should list patients", async () => {
    const service = container.resolve(PatientService)
    const p1 = PatientEntity.fromDto({
      civilite: 'M', nom: 'Alpha', prenom: 'Test',
      date_naissance: '1990-01-01', nir: '1900101123456', telephone: '0611111111',
    })
    const p2 = PatientEntity.fromDto({
      civilite: 'Mme', nom: 'Beta', prenom: 'Test',
      date_naissance: '1992-02-02', nir: '2920202123456', telephone: '0622222222',
    })
    await service.create(p1)
    await service.create(p2)

    const list = await service.list()
    expect(list.length).toBeGreaterThanOrEqual(2)
  })

  it("should search patients by name", async () => {
    const service = container.resolve(PatientService)
    const p = PatientEntity.fromDto({
      civilite: 'M', nom: 'Unique', prenom: 'Name',
      date_naissance: '1980-03-03', nir: '1800303123456', telephone: '0633333333',
    })
    await service.create(p)

    const results = await service.list('Unique')
    expect(results.length).toBe(1)
    expect(results[0].nom).toBe('Unique')
  })

  it("should update a patient", async () => {
    const service = container.resolve(PatientService)
    const created = await service.create(PatientEntity.fromDto({
      civilite: 'Mlle', nom: 'Update', prenom: 'Test',
      date_naissance: '1995-04-04', nir: '2950404123456', telephone: '0644444444',
    }))

    const updated = await service.update(PatientEntity.fromDto({
      id: created.id, civilite: 'Mme', nom: 'Updated', prenom: 'Test',
      date_naissance: '1995-04-04', nir: '2950404123456', telephone: '0644444444',
    }))
    expect(updated.nom).toBe('Updated')
  })

  it("should delete a patient", async () => {
    const service = container.resolve(PatientService)
    const created = await service.create(PatientEntity.fromDto({
      civilite: 'M', nom: 'Delete', prenom: 'Test',
      date_naissance: '2000-05-05', nir: '2000505123456', telephone: '0655555555',
    }))

    await service.delete(created.id!)
    const found = await service.getById(created.id!)
    expect(found).toBeNull()
  })
})
