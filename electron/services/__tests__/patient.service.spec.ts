import "reflect-metadata"
import { describe, it, expect, beforeEach, afterEach } from "vitest"
import path from "node:path"
import fs from "node:fs"
import os from "node:os"
import { container } from "tsyringe"
import { AppDatabaseDatasource } from "../../sqlite-data-source"
import type { Kysely } from "kysely"
import type { DB } from "../../entities/database"
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

  it("deletes a patient plus all dependent child rows without FK constraint errors", async () => {
    const service = container.resolve(PatientService)
    const db = (service as unknown as { db: Kysely<DB> }).db

    // Reference rows required by foreign keys
    const user = await db.insertInto("user").values({
      nom: "PatientDelete", prenom: "User",
      email: "patient-delete@clinique.test",
      password_hash: "not-used",
      role: "MEDECIN",
      is_active: 1,
    }).returning("id").executeTakeFirstOrThrow()

    const svc = await db.insertInto("services").values({
      name: `Patient Delete Svc ${Date.now()}`,
      description: "test",
      duration: 30,
      sort_order: 99,
      is_active: 1,
    }).returning("id").executeTakeFirstOrThrow()

    const created = await service.create(PatientEntity.fromDto({
      civilite: 'M', nom: 'Cascade', prenom: 'Delete',
      date_naissance: '1988-08-08', nir: '1880808123450', telephone: '0688888888',
    }))
    const pid = created.id!

    // ─── Encounter tree (NO ACTION FKs must be deleted first) ──
    const encounter = await db.insertInto("encounters").values({
      patient_id: pid,
      contact_type: "consultation",
      start_date: "2026-01-10",
      end_date: "2026-01-10",
      service_id: svc.id,
      origin: "auto_refere",
      zone_situation: "zone_responsabilite",
      prise_en_charge: "maladie_naturelle",
      status: "active",
      created_by: user.id,
    }).returning("id").executeTakeFirstOrThrow()

    await db.insertInto("encounter_movements").values({
      encounter_id: encounter.id,
      step_label: "Arrivée",
      entered_at: "2026-01-10 08:00:00",
    }).execute()

    const doc = await db.insertInto("patient_clinical_documents").values({
      id: "patient-delete-doc-1",
      contact_id: String(encounter.id),
      document_type_id: "11111111-1111-4111-1111-111111111111",
      status: "draft",
      created_by: String(user.id),
    }).returning("id").executeTakeFirstOrThrow()

    await db.insertInto("clinical_document_signatures").values({
      id: "patient-delete-sig-1",
      document_id: doc.id,
      user_id: String(user.id),
      signature_hash: "abc123",
    }).execute()

    await db.insertInto("document_attachments").values({
      document_id: doc.id,
      display_name: "a.txt",
      file_name: "a.txt",
      file_data: "dGVzdA==",
      mime_type: "text/plain",
    }).execute()

    // ─── Stay tree (NO ACTION FKs must be deleted first) ──────
    const stay = await db.insertInto("stays").values({
      patient_id: pid,
      admission_date: "2026-01-10",
      mode_admission: "programmee",
      service_id: svc.id,
      status: "en_cours",
      created_by: user.id,
    }).returning("id").executeTakeFirstOrThrow()

    await db.insertInto("stay_movements").values({
      stay_id: stay.id,
      movement_type: "admission",
      moved_at: "2026-01-10 08:00:00",
    }).execute()

    // ─── Exam request tree (NO ACTION on patient_id AND encounter_id) ──
    const labCat = await db.insertInto("lab_exam_categories").values({
      code: "TST",
      name: "Test Cat",
      sort_order: 99,
    }).returning("id").executeTakeFirstOrThrow()

    const exam = await db.insertInto("lab_exams").values({
      category_id: labCat.id,
      code: "TST",
      name: "Test examen",
      is_active: 1,
      sort_order: 99,
    }).returning("id").executeTakeFirstOrThrow()

    const parameter = await db.insertInto("exam_parameters").values({
      exam_id: exam.id,
      name: "Glucose",
      input_type: "numeric",
      reference_values: "{}",
      sort_order: 1,
    }).returning("id").executeTakeFirstOrThrow()

    const examReq = await db.insertInto("exam_requests").values({
      patient_id: pid,
      encounter_id: encounter.id,
      type: "lab",
      statut: "en_attente",
      created_by: user.id,
    }).returning("id").executeTakeFirstOrThrow()

    await db.insertInto("exam_results").values({
      exam_request_id: examReq.id,
      parameter_id: parameter.id,
      value: "0.85",
    }).execute()

    await db.insertInto("exam_request_attachments").values({
      exam_request_id: examReq.id,
      display_name: "r.txt",
      file_name: "r.txt",
      file_data: "dGVzdA==",
    }).execute()

    // ─── Cascade-to-patient table + orphan form draft ─────────
    await db.insertInto("trusted_persons").values({
      patient_id: pid,
      has_trusted: 1,
      nom: "Tiers de confiance",
    }).execute()

    await db.insertInto("form_drafts").values({
      form_type: "encounter",
      form_data: "{}",
      patient_id: pid,
    }).execute()

    // Previously threw "FOREIGN KEY constraint failed"
    await expect(service.delete(pid)).resolves.toBeDefined()

    // Patient row gone
    expect(await db.selectFrom("patient").select("id").where("id", "=", pid).executeTakeFirst()).toBeUndefined()
    // Encounter tree gone
    expect(await db.selectFrom("encounters").select("id").where("id", "=", encounter.id).executeTakeFirst()).toBeUndefined()
    expect(await db.selectFrom("encounter_movements").select("id").where("encounter_id", "=", encounter.id).executeTakeFirst()).toBeUndefined()
    expect(await db.selectFrom("patient_clinical_documents").select("id").where("id", "=", doc.id).executeTakeFirst()).toBeUndefined()
    expect(await db.selectFrom("clinical_document_signatures").select("id").where("id", "=", "patient-delete-sig-1").executeTakeFirst()).toBeUndefined()
    expect(await db.selectFrom("document_attachments").select("id").where("document_id", "=", doc.id).executeTakeFirst()).toBeUndefined()
    // Stay tree gone
    expect(await db.selectFrom("stays").select("id").where("id", "=", stay.id).executeTakeFirst()).toBeUndefined()
    expect(await db.selectFrom("stay_movements").select("id").where("stay_id", "=", stay.id).executeTakeFirst()).toBeUndefined()
    // Exam request tree gone
    expect(await db.selectFrom("exam_requests").select("id").where("id", "=", examReq.id).executeTakeFirst()).toBeUndefined()
    expect(await db.selectFrom("exam_results").select("id").where("exam_request_id", "=", examReq.id).executeTakeFirst()).toBeUndefined()
    expect(await db.selectFrom("exam_request_attachments").select("id").where("exam_request_id", "=", examReq.id).executeTakeFirst()).toBeUndefined()
    // Cascade table + orphan draft gone
    expect(await db.selectFrom("trusted_persons").select("id").where("patient_id", "=", pid).executeTakeFirst()).toBeUndefined()
    expect(await db.selectFrom("form_drafts").select("id").where("patient_id", "=", pid).executeTakeFirst()).toBeUndefined()
  })

    it('returns created patient with an id using PatientEntity directly', async () => {
      const service = container.resolve(PatientService)
      const entity = new PatientEntity()
      entity.civilite = 'M'
      entity.nom = 'TestReturn'
      entity.prenom = 'IdCheck'
      entity.date_naissance = '1980-01-01'
      entity.nir = '1800101123459'
      entity.telephone = '0612345681'
  
      const created = await service.create(entity)
      expect(created.id).toBeDefined()
      expect(created.id).toBeGreaterThan(0)
      expect(created.nom).toBe('TestReturn')
      expect(created.prenom).toBe('IdCheck')
    })

  // ─── NIP duplicate detection ──────────────────────────────────────────

  it('rejects creating a patient with duplicate NIP (same nip → throws French error)', async () => {
    const service = container.resolve(PatientService)
    const p1 = PatientEntity.fromDto({
      civilite: 'M', nom: 'First', prenom: 'Patient',
      date_naissance: '1990-01-01', nir: '1900101123450', telephone: '0611111111',
      nip: 'NIP001',
    })
    await service.create(p1)

    const p2 = PatientEntity.fromDto({
      civilite: 'Mme', nom: 'Second', prenom: 'Patient',
      date_naissance: '1992-02-02', nir: '2920202123450', telephone: '0622222222',
      nip: 'NIP001', // same NIP!
    })
    await expect(service.create(p2)).rejects.toThrow('Un patient avec ce NIP existe déjà')
  })

  it('rejects creating a patient with duplicate NIP via UNIQUE constraint fallback', async () => {
    const service = container.resolve(PatientService)
    // Bypass the service-level check by inserting directly, then use service
    const db = (service as any).db
    await db.insertInto('patient').values({
      civilite: 'M', nom: 'Existing', prenom: 'NIP',
      date_naissance: '1980-03-03', nir: '1800303123450', telephone: '0633333333',
      nip: 'NIP-UNIQUE-TEST',
    }).execute()

    const p2 = PatientEntity.fromDto({
      civilite: 'M', nom: 'Duplicate', prenom: 'NIP',
      date_naissance: '1985-04-04', nir: '1850404123450', telephone: '0644444444',
      nip: 'NIP-UNIQUE-TEST',
    })
    // The UNIQUE constraint on nip should also catch this via the try/catch
    await expect(service.create(p2)).rejects.toThrow('Un patient avec ce NIP existe déjà')
  })

  it('rejects updating a patient to a NIP that another patient already has', async () => {
    const service = container.resolve(PatientService)
    const p1 = PatientEntity.fromDto({
      civilite: 'M', nom: 'Owner', prenom: 'NIP',
      date_naissance: '1990-01-01', nir: '1900101123451', telephone: '0611111111',
      nip: 'NIP-OWNER',
    })
    await service.create(p1)

    // Create a second patient without NIP
    const p2 = PatientEntity.fromDto({
      civilite: 'Mme', nom: 'Taker', prenom: 'NIP',
      date_naissance: '1992-02-02', nir: '2920202123451', telephone: '0622222222',
    })
    const created2 = await service.create(p2)

    // Try to update p2 to use p1's NIP
    const updateEntity = PatientEntity.fromDto({
      id: created2.id,
      civilite: 'Mme', nom: 'Taker', prenom: 'NIP',
      date_naissance: '1992-02-02', nir: '2920202123451', telephone: '0622222222',
      nip: 'NIP-OWNER',
    })
    await expect(service.update(updateEntity)).rejects.toThrow('Un patient avec ce NIP existe déjà')
  })

  it('allows updating a patient to keep its own NIP unchanged', async () => {
    const service = container.resolve(PatientService)
    const p = PatientEntity.fromDto({
      civilite: 'M', nom: 'Self', prenom: 'NIP',
      date_naissance: '1990-01-01', nir: '1900101123452', telephone: '0611111112',
      nip: 'NIP-SELF',
    })
    const created = await service.create(p)

    const updated = await service.update(PatientEntity.fromDto({
      id: created.id,
      civilite: 'M', nom: 'SelfUpdated', prenom: 'NIP',
      date_naissance: '1990-01-01', nir: '1900101123452', telephone: '0611111112',
      nip: 'NIP-SELF', // same NIP as before
    }))
    expect(updated.nom).toBe('SelfUpdated')
  })

  it('creates patient with empty civilite (empty string allowed by migration 021)', async () => {
    const service = container.resolve(PatientService)
    const p = PatientEntity.fromDto({
      civilite: '', // "Non defini"
      nom: 'EmptyCivilite', prenom: 'Test',
      date_naissance: '1995-05-05', nir: '1950505123450', telephone: '0655555555',
    })
    const created = await service.create(p)
    expect(created.id).toBeGreaterThan(0)
    expect(created.civilite).toBe('')
  })

  it('creates patient without NIR (now nullable after migration NIR NOT NULL removed)', async () => {
    const service = container.resolve(PatientService)
    const p = PatientEntity.fromDto({
      civilite: 'M',
      nom: 'NoNir', prenom: 'Test',
      date_naissance: '2000-01-01',
      nir: '', // NIR is optional now
      telephone: '0666666666',
    })
    const created = await service.create(p)
    expect(created.id).toBeGreaterThan(0)
    expect(created.nir).toBe('')
  })

  it('documents that NIR is required by service for post-insert lookup (even if DB allows NULL)', async () => {
    // The service.create() uses entity.nir! for the post-insert SELECT lookup.
    // When NIR is undefined, WHERE nir = NULL returns no rows, causing
    // Échec de la récupération du patient inséré. This is a known limitation:
    // callers must always provide a NIR value (even if empty string '').
    const service = container.resolve(PatientService)
    const p = new PatientEntity()
    p.civilite = 'M'
    p.nom = 'NoNirUndefined'
    p.prenom = 'Test'
    p.date_naissance = '2000-06-15'
    p.telephone = '0677777777'
    // NIR is intentionally left undefined — service cannot handle this
    await expect(service.create(p)).rejects.toThrow('Échec de la récupération du patient inséré')
  })
})
