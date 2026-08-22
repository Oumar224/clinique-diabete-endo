import 'reflect-metadata'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { container } from 'tsyringe'
import { sql } from 'kysely'
import { AppDatabaseDatasource } from '../../sqlite-data-source'
import { ClinicalDocumentService } from '../clinical-document.service'
import { ServiceService } from '../service.service'

// Fixed UUIDs from migration 053 seed data
const CONSULTATION_TYPE_ID = '11111111-1111-4111-1111-111111111111'
const LAB_REQUEST_TYPE_ID = '22222222-2222-4222-2222-222222222222'
const DELIVERY_REPORT_TYPE_ID = '33333333-3333-4333-3333-333333333333'

describe('ClinicalDocumentService', () => {
  let tempDir: string
  let dbPath: string
  let service: ClinicalDocumentService
  let datasource: AppDatabaseDatasource
  let patientId: number
  let serviceId: number
  let encounterId: number
  let userId: string

  beforeEach(async () => {
    container.clearInstances()
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cd-clinical-doc-test-'))
    dbPath = path.join(tempDir, 'test.db')
    container.register('DB_PATH', { useValue: dbPath })
    datasource = container.resolve(AppDatabaseDatasource)
    await datasource.initialize()
    service = container.resolve(ClinicalDocumentService)
    const db = datasource.getInstance()

    // Migration 052 is broken, causing 053 (clinical-documents) to be skipped
    // on fresh databases. We need to manually create the clinical document
    // tables so that the service can operate.
    // Use DROP IF EXISTS first so that any columns added by later migrations
    // (e.g. acte_id_declenche) don't cause INSERT failures.
    await sql`DROP TABLE IF EXISTS clinical_document_signatures`.execute(db)
    await sql`DROP TABLE IF EXISTS patient_clinical_documents`.execute(db)
    await sql`DROP TABLE IF EXISTS clinical_document_types`.execute(db)

    await sql`
      CREATE TABLE IF NOT EXISTS clinical_document_types (
        id          TEXT PRIMARY KEY,
        code        TEXT NOT NULL UNIQUE,
        label       TEXT NOT NULL,
        description TEXT,
        form_schema TEXT NOT NULL,
        category    TEXT NOT NULL CHECK(category IN ('consultation','lab','delivery','other')),
        is_active   INTEGER NOT NULL DEFAULT 1,
        created_at  TEXT DEFAULT (datetime('now'))
      )
    `.execute(db)

    await sql`
      CREATE TABLE IF NOT EXISTS patient_clinical_documents (
        id                TEXT PRIMARY KEY,
        contact_id        TEXT NOT NULL REFERENCES encounters(id),
        service_id        TEXT REFERENCES services(id),
        site_id           INTEGER REFERENCES sites(id),
        document_type_id  TEXT NOT NULL REFERENCES clinical_document_types(id),
        title             TEXT,
        status            TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','signed')),
        form_data         TEXT,
        source            TEXT,
        pdf_path          TEXT,
        signed_at         TEXT,
        signed_by         TEXT REFERENCES user(id),
        created_by        TEXT NOT NULL REFERENCES user(id),
        created_at        TEXT DEFAULT (datetime('now')),
        updated_at        TEXT DEFAULT (datetime('now'))
      )
    `.execute(db)

    await sql`
      CREATE TABLE IF NOT EXISTS clinical_document_signatures (
        id             TEXT PRIMARY KEY,
        document_id    TEXT NOT NULL REFERENCES patient_clinical_documents(id),
        user_id        TEXT NOT NULL REFERENCES user(id),
        signature_hash TEXT NOT NULL,
        signed_at      TEXT DEFAULT (datetime('now'))
      )
    `.execute(db)

    // Seed the 3 document types using the fixed UUIDs from migration 053
    const consultationSchema = JSON.stringify([
      { key: 'reason', type: 'textarea', label: 'Motif', required: true },
      { key: 'diagnosis', type: 'textarea', label: 'Diagnostic', required: true },
    ])
    const labSchema = JSON.stringify([
      { key: 'exam_type', type: 'select', label: "Type d'examen", required: true, options: [{ label: 'HbA1c', value: 'hba1c' }] },
    ])
    const deliverySchema = JSON.stringify([
      { key: 'delivery_date', type: 'date', label: 'Date de remise', required: true },
    ])

    // Seed with test labels. Migration-seeded rows (if any) are gone because
    // we dropped the tables above.
    await sql`INSERT INTO clinical_document_types (id, code, label, description, form_schema, category, is_active)
      VALUES ('11111111-1111-4111-1111-111111111111', 'CONSULTATION_NOTE', 'Compte rendu de consultation', 'Compte rendu détaillé', ${consultationSchema}, 'consultation', 1)`.execute(db)
    await sql`INSERT INTO clinical_document_types (id, code, label, description, form_schema, category, is_active)
      VALUES ('22222222-2222-4222-2222-222222222222', 'LAB_REQUEST', 'Demande d''examen de laboratoire', 'Bon de demande d''analyses', ${labSchema}, 'lab', 1)`.execute(db)
    await sql`INSERT INTO clinical_document_types (id, code, label, description, form_schema, category, is_active)
      VALUES ('33333333-3333-4333-3333-333333333333', 'DELIVERY_REPORT', 'Bordereau de remise de documents', 'Bordereau de remise', ${deliverySchema}, 'delivery', 1)`.execute(db)

    // Create a test user (needed for created_by / signed_by FK)
    // Role must be one of: MEDECIN, SECRETAIRE, PHARMACIEN, COMPTABLE, ADMIN, INFIRMIER
    const user = await db
      .insertInto('user')
      .values({
        nom: 'DocTest',
        prenom: 'User',
        email: 'doctest@clinique.test',
        password_hash: 'not-used',
        role: 'MEDECIN',
        is_active: 1,
      })
      .returningAll()
      .executeTakeFirstOrThrow()
    userId = String(user.id!)

    // Create a test patient
    const patient = await db
      .insertInto('patient')
      .values({
        civilite: 'M',
        nom: 'Diallo',
        prenom: 'Amadou',
        date_naissance: '1985-06-15',
        nir: `1${String(Math.random()).slice(2, 15)}`,
        telephone: '0612345678',
      })
      .returningAll()
      .executeTakeFirstOrThrow()
    patientId = patient.id!

    // Create a test service via ServiceService to ensure proper defaults
    const svc = await container.resolve(ServiceService).create({
      name: `Service Test Clinique ${Date.now()}`,
      code: `CLINICAL-DOC-TEST-${Date.now()}`,
    })
    serviceId = svc.id!

    // Create a test encounter (contact)
    const encounter = await db
      .insertInto('encounters')
      .values({
        patient_id: patientId,
        contact_type: 'consultation',
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        service_id: serviceId,
        origin: 'auto_refere',
        zone_situation: 'zone_responsabilite',
        prise_en_charge: 'maladie_naturelle',
        status: 'active',
      })
      .returningAll()
      .executeTakeFirstOrThrow()
    encounterId = encounter.id!
  })

  afterEach(() => {
    container.clearInstances()
    try {
      if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath)
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch {
      /* best-effort cleanup */
    }
  })

  // ─── Helper ──────────────────────────────────────────────────────

  /** Create a minimal draft document and return its full DTO. */
  async function createDraftDoc(typeId = CONSULTATION_TYPE_ID): Promise<ReturnType<typeof service.createDocument>> {
    return service.createDocument({
      contactId: String(encounterId),
      documentTypeId: typeId,
      createdBy: userId,
    })
  }

  /** Create a signed document and return its full DTO. */
  async function createSignedDoc(typeId = CONSULTATION_TYPE_ID) {
    const doc = await createDraftDoc(typeId)
    return service.signDocument(doc.id, userId)
  }

  // ─── getDocumentTypes ────────────────────────────────────────────

  describe('getDocumentTypes', () => {
    it('returns all active document types ordered by label asc', async () => {
      const types = await service.getDocumentTypes()

      expect(types).toHaveLength(3)
      expect(types.map(t => t.code).sort()).toEqual([
        'CONSULTATION_NOTE',
        'DELIVERY_REPORT',
        'LAB_REQUEST',
      ])

      // Verify each has the expected shape
      for (const t of types) {
        expect(t.id).toBeDefined()
        expect(t.code).toBeDefined()
        expect(t.label).toBeDefined()
        expect(t.formSchema).toBeInstanceOf(Array)
        expect(t.isActive).toBe(true)
      }
    })

    it('does not return inactive document types', async () => {
      // Deactivate one type
      const db = datasource.getInstance()
      await sql`UPDATE clinical_document_types SET is_active = 0 WHERE id = ${CONSULTATION_TYPE_ID}`.execute(db)

      const types = await service.getDocumentTypes()
      const codes = types.map(t => t.code)
      expect(codes).not.toContain('CONSULTATION_NOTE')
      expect(types).toHaveLength(2)
    })
  })

  // ─── getDocumentsByContact ───────────────────────────────────────

  describe('getDocumentsByContact', () => {
    it('returns documents for a contact ordered by created_at desc', async () => {
      const doc1 = await createDraftDoc(CONSULTATION_TYPE_ID)
      // Small delay to ensure different created_at
      await new Promise(r => setTimeout(r, 10))
      const doc2 = await createDraftDoc(LAB_REQUEST_TYPE_ID)

      const docs = await service.getDocumentsByContact(String(encounterId))

      expect(docs).toHaveLength(2)
      // Most recent first
      expect(docs[0].id).toBe(doc2.id)
      expect(docs[1].id).toBe(doc1.id)
    })

    it('returns empty array for contact with no documents', async () => {
      const docs = await service.getDocumentsByContact('99999')
      expect(docs).toHaveLength(0)
    })

    it('includes document type label and code in the result', async () => {
      await createDraftDoc(LAB_REQUEST_TYPE_ID)

      const docs = await service.getDocumentsByContact(String(encounterId))

      expect(docs[0].documentTypeLabel).toBe('Demande d\'examen de laboratoire')
      expect(docs[0].documentTypeCode).toBe('LAB_REQUEST')
    })

    it('isolates documents between different contacts', async () => {
      // Create a second encounter
      const db = datasource.getInstance()
      const enc2 = await db
        .insertInto('encounters')
        .values({
          patient_id: patientId,
          contact_type: 'urgence',
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          service_id: serviceId,
          origin: 'domicile',
          zone_situation: 'hors_zone',
          prise_en_charge: 'accident_circulation',
          status: 'active',
        })
        .returningAll()
        .executeTakeFirstOrThrow()

      await createDraftDoc(CONSULTATION_TYPE_ID)
      await service.createDocument({
        contactId: String(enc2.id!),
        documentTypeId: LAB_REQUEST_TYPE_ID,
        createdBy: userId,
      })

      const docs1 = await service.getDocumentsByContact(String(encounterId))
      const docs2 = await service.getDocumentsByContact(String(enc2.id!))

      expect(docs1).toHaveLength(1)
      expect(docs2).toHaveLength(1)
      expect(docs1[0].documentTypeCode).toBe('CONSULTATION_NOTE')
      expect(docs2[0].documentTypeCode).toBe('LAB_REQUEST')
    })
  })

  describe('countDocumentsByContact', () => {
    it('returns 0 when no documents are linked to the contact', async () => {
      const count = await service.countDocumentsByContact('99999')
      expect(count).toBe(0)
    })

    it('returns the number of documents linked to the contact', async () => {
      await createDraftDoc(CONSULTATION_TYPE_ID)
      await createDraftDoc(LAB_REQUEST_TYPE_ID)
      await createDraftDoc(DELIVERY_REPORT_TYPE_ID)

      const count = await service.countDocumentsByContact(String(encounterId))
      expect(count).toBe(3)
    })

    it('counts draft and signed documents together', async () => {
      await createDraftDoc(CONSULTATION_TYPE_ID)
      await createDraftDoc(LAB_REQUEST_TYPE_ID)
      await createSignedDoc(DELIVERY_REPORT_TYPE_ID)

      const count = await service.countDocumentsByContact(String(encounterId))
      expect(count).toBe(3)
    })

    it('only counts documents for the given contact', async () => {
      const db = datasource.getInstance()
      const enc2 = await db
        .insertInto('encounters')
        .values({
          patient_id: patientId,
          contact_type: 'urgence',
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          service_id: serviceId,
          origin: 'domicile',
          zone_situation: 'hors_zone',
          prise_en_charge: 'accident_circulation',
          status: 'active',
        })
        .returningAll()
        .executeTakeFirstOrThrow()

      await createDraftDoc(CONSULTATION_TYPE_ID)
      await service.createDocument({
        contactId: String(enc2.id!),
        documentTypeId: LAB_REQUEST_TYPE_ID,
        createdBy: userId,
      })

      const count1 = await service.countDocumentsByContact(String(encounterId))
      const count2 = await service.countDocumentsByContact(String(enc2.id!))

      expect(count1).toBe(1)
      expect(count2).toBe(1)
    })
  })

  // ─── createDocument ──────────────────────────────────────────────

  describe('createDocument', () => {
    it('creates a draft document and returns full DTO', async () => {
      const doc = await createDraftDoc(CONSULTATION_TYPE_ID)

      expect(doc.id).toBeDefined()
      expect(doc.contactId).toBe(String(encounterId))
      expect(doc.documentTypeId).toBe(CONSULTATION_TYPE_ID)
      expect(doc.title).toBe('Compte rendu de consultation')
      expect(doc.status).toBe('draft')
      expect(doc.formData).toBeDefined()
      expect(doc.createdBy).toBe(userId)
      expect(doc.createdAt).toBeDefined()
      expect(doc.updatedAt).toBeDefined()
    })

    it('inherits service_id from the encounter when not explicitly provided', async () => {
      const doc = await createDraftDoc(CONSULTATION_TYPE_ID)
      expect(doc.serviceId).toBe(String(serviceId))
    })

    it('uses explicitly provided service_id over encounter inheritance', async () => {
      const otherSvc = await container.resolve(ServiceService).create({
        name: `Cardio Test ${Date.now()}`,
        code: `CARDIO-TEST-${Date.now()}`,
      })

      const doc = await service.createDocument({
        contactId: String(encounterId),
        serviceId: String(otherSvc.id!),
        documentTypeId: CONSULTATION_TYPE_ID,
        createdBy: userId,
      })

      expect(doc.serviceId).toBe(String(otherSvc.id!))
    })
  })

  // ─── updateDocumentData ──────────────────────────────────────────

  describe('updateDocumentData', () => {
    it('updates form_data on a draft document', async () => {
      const doc = await createDraftDoc(CONSULTATION_TYPE_ID)
      const formData = { reason: 'Douleur thoracique', diagnosis: 'Angine de poitrine' }

      const updated = await service.updateDocumentData(doc.id, formData)

      const parsed = JSON.parse(updated.formData!)
      expect(parsed.reason).toBe('Douleur thoracique')
      expect(parsed.diagnosis).toBe('Angine de poitrine')
    })

    it('allows update on a signed document', async () => {
      const doc = await createSignedDoc()

      const updated = await service.updateDocumentData(doc.id, { reason: 'changed' })
      expect(JSON.parse(updated.formData!).reason).toBe('changed')
    })

    it('rejects update on a document linked to an expired contact', async () => {
      // Consultation without end_date: the 24h created_at rule applies, so a
      // created_at older than 24h marks the contact expired.
      const db = datasource.getInstance()
      const enc = await db
        .insertInto('encounters')
        .values({
          patient_id: patientId,
          contact_type: 'consultation',
          start_date: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
          // end_date intentionally omitted (null)
          service_id: serviceId,
          origin: 'auto_refere',
          zone_situation: 'zone_responsabilite',
          prise_en_charge: 'maladie_naturelle',
          status: 'active',
        })
        .returningAll()
        .executeTakeFirstOrThrow()

      const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
      await db
        .updateTable('encounters')
        .set({ created_at: oldDate })
        .where('id', '=', enc.id!)
        .execute()

      const doc = await service.createDocument({
        contactId: String(enc.id!),
        documentTypeId: CONSULTATION_TYPE_ID,
        createdBy: userId,
      })

      await expect(
        service.updateDocumentData(doc.id, { reason: 'changed' }),
      ).rejects.toThrow('Impossible de modifier un document signé')
    })

    it('allows update on a document linked to an active consultation with future end_date even when created_at is older than 24h', async () => {
      const db = datasource.getInstance()
      const enc = await db
        .insertInto('encounters')
        .values({
          patient_id: patientId,
          contact_type: 'consultation',
          start_date: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
          end_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          service_id: serviceId,
          origin: 'auto_refere',
          zone_situation: 'zone_responsabilite',
          prise_en_charge: 'maladie_naturelle',
          status: 'active',
        })
        .returningAll()
        .executeTakeFirstOrThrow()

      const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
      await db
        .updateTable('encounters')
        .set({ created_at: oldDate })
        .where('id', '=', enc.id!)
        .execute()

      const doc = await service.createDocument({
        contactId: String(enc.id!),
        documentTypeId: CONSULTATION_TYPE_ID,
        createdBy: userId,
      })

      const updated = await service.updateDocumentData(doc.id, { reason: 'changed' })
      expect(JSON.parse(updated.formData!).reason).toBe('changed')
    })
  })

  // ─── signDocument ────────────────────────────────────────────────

  describe('signDocument', () => {
    it('changes status to signed, creates signature, generates hash', async () => {
      const doc = await createDraftDoc(CONSULTATION_TYPE_ID)
      const db = datasource.getInstance()

      const signed = await service.signDocument(doc.id, userId)

      expect(signed.status).toBe('signed')
      expect(signed.signedBy).toBe(userId)
      expect(signed.signedAt).toBeDefined()

      // Verify signature record exists
      const sig = await sql<{
        id: string
        document_id: string
        user_id: string
        signature_hash: string
        signed_at: string
      }>`SELECT * FROM clinical_document_signatures WHERE document_id = ${doc.id}`.execute(db)

      expect(sig.rows).toHaveLength(1)
      expect(sig.rows[0].user_id).toBe(userId)
      expect(sig.rows[0].signature_hash).toBeDefined()
      expect(sig.rows[0].signature_hash).toHaveLength(64) // sha256 hex
    })

    it('allows re-signing and overwrites the previous signature', async () => {
      const signed = await createSignedDoc()
      const db = datasource.getInstance()
      const firstSignedAt = signed.signedAt
      await new Promise(r => setTimeout(r, 10))

      const reSigned = await service.signDocument(signed.id, userId)

      expect(reSigned.status).toBe('signed')
      expect(reSigned.signedAt).toBeDefined()
      expect(reSigned.signedAt).not.toBe(firstSignedAt)

      // Écrasement total: exactement une signature conservée pour le document
      const sig = await sql<{ id: string }>`SELECT id FROM clinical_document_signatures WHERE document_id = ${signed.id}`.execute(db)
      expect(sig.rows).toHaveLength(1)
    })

    it('returns the document with an updated pdf_path after setDocumentPdfPath', async () => {
      const doc = await createDraftDoc(CONSULTATION_TYPE_ID)

      const updated = await service.setDocumentPdfPath(doc.id, '/tmp/clinical-doc.pdf')

      expect(updated.pdfPath).toBe('/tmp/clinical-doc.pdf')
      const reloaded = await service.getDocumentById(doc.id)
      expect(reloaded?.pdfPath).toBe('/tmp/clinical-doc.pdf')
    })
  })

  // ─── deleteDocument ──────────────────────────────────────────────

  describe('deleteDocument', () => {
    it('deletes a draft document', async () => {
      const doc = await createDraftDoc()

      await expect(service.deleteDocument(doc.id)).resolves.not.toThrow()

      // Verify it's gone
      const docs = await service.getDocumentsByContact(String(encounterId))
      expect(docs).toHaveLength(0)
    })

    it('removes associated signature records when deleting a draft', async () => {
      const doc = await createDraftDoc()
      const db = datasource.getInstance()

      // Manually insert a signature (simulates partial state)
      await sql`INSERT INTO clinical_document_signatures (id, document_id, user_id, signature_hash, signed_at)
        VALUES (${'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'}, ${doc.id}, ${userId}, ${'x'.repeat(64)}, ${new Date().toISOString()})`.execute(db)

      await service.deleteDocument(doc.id)

      const sigs = await sql<{ id: string }>`SELECT id FROM clinical_document_signatures WHERE document_id = ${doc.id}`.execute(db)

      expect(sigs.rows).toHaveLength(0)
    })

    it('rejects deleting a signed document', async () => {
      const doc = await createSignedDoc()

      await expect(
        service.deleteDocument(doc.id),
      ).rejects.toThrow('Impossible de supprimer un document signé')
    })
  })

  // ─── isContactExpired ────────────────────────────────────────────

  describe('isContactExpired', () => {
    it('returns false for a contact created less than 24h ago', async () => {
      const expired = await service.isContactExpired(String(encounterId))
      expect(expired).toBe(false)
    })

    it('returns true for a consultation contact without end_date created more than 24h ago', async () => {
      const db = datasource.getInstance()
      const enc = await db
        .insertInto('encounters')
        .values({
          patient_id: patientId,
          contact_type: 'consultation',
          start_date: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
          // end_date intentionally omitted (null) so the 24h created_at rule applies
          service_id: serviceId,
          origin: 'auto_refere',
          zone_situation: 'zone_responsabilite',
          prise_en_charge: 'maladie_naturelle',
          status: 'active',
        })
        .returningAll()
        .executeTakeFirstOrThrow()

      const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
      await db
        .updateTable('encounters')
        .set({ created_at: oldDate })
        .where('id', '=', enc.id!)
        .execute()

      const expired = await service.isContactExpired(String(enc.id!))
      expect(expired).toBe(true)
    })

    it('returns true for a contact that does not exist', async () => {
      const expired = await service.isContactExpired('99999')
      expect(expired).toBe(true)
    })

    // ── Hospitalisation-specific expiration rules ────────────────

    it('returns false for hospitalisation contact without end_date', async () => {
      const db = datasource.getInstance()
      // Create a hospitalisation encounter 5 days ago with NO end_date
      const oldDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      const enc = await db
        .insertInto('encounters')
        .values({
          patient_id: patientId,
          contact_type: 'hospitalisation',
          start_date: oldDate,
          // end_date intentionally omitted (null)
          service_id: serviceId,
          origin: 'auto_refere',
          zone_situation: 'zone_responsabilite',
          prise_en_charge: 'maladie_naturelle',
          status: 'active',
        })
        .returningAll()
        .executeTakeFirstOrThrow()

      const expired = await service.isContactExpired(String(enc.id!))
      expect(expired).toBe(false)
    })

    it('returns false for hospitalisation contact with future end_date', async () => {
      const db = datasource.getInstance()
      const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
      const enc = await db
        .insertInto('encounters')
        .values({
          patient_id: patientId,
          contact_type: 'hospitalisation',
          start_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          end_date: futureDate,
          service_id: serviceId,
          origin: 'auto_refere',
          zone_situation: 'zone_responsabilite',
          prise_en_charge: 'maladie_naturelle',
          status: 'active',
        })
        .returningAll()
        .executeTakeFirstOrThrow()

      const expired = await service.isContactExpired(String(enc.id!))
      expect(expired).toBe(false)
    })

    it('returns true for hospitalisation contact with past end_date', async () => {
      const db = datasource.getInstance()
      const pastDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      const enc = await db
        .insertInto('encounters')
        .values({
          patient_id: patientId,
          contact_type: 'hospitalisation',
          start_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          end_date: pastDate,
          service_id: serviceId,
          origin: 'auto_refere',
          zone_situation: 'zone_responsabilite',
          prise_en_charge: 'maladie_naturelle',
          status: 'active',
        })
        .returningAll()
        .executeTakeFirstOrThrow()

      const expired = await service.isContactExpired(String(enc.id!))
      expect(expired).toBe(true)
    })

    // ── Non-hospitalisation types still use 24h rule ─────────────

    it('returns false for consultation contact with future end_date even when created_at is older than 24h', async () => {
      const db = datasource.getInstance()
      // Insert a consultation whose end_date is still in the future but whose
      // created_at is > 24h old: the end_date must win (active contact).
      const enc = await db
        .insertInto('encounters')
        .values({
          patient_id: patientId,
          contact_type: 'consultation',
          start_date: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
          end_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          service_id: serviceId,
          origin: 'auto_refere',
          zone_situation: 'zone_responsabilite',
          prise_en_charge: 'maladie_naturelle',
          status: 'active',
        })
        .returningAll()
        .executeTakeFirstOrThrow()

      // Age the created_at to > 24h ago (must NOT mark the contact expired)
      const oldCreated = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
      await db
        .updateTable('encounters')
        .set({ created_at: oldCreated })
        .where('id', '=', enc.id!)
        .execute()

      const expired = await service.isContactExpired(String(enc.id!))
      expect(expired).toBe(false)
    })

    it('returns true for consultation contact with past end_date', async () => {
      const db = datasource.getInstance()
      const pastDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      const enc = await db
        .insertInto('encounters')
        .values({
          patient_id: patientId,
          contact_type: 'consultation',
          start_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          end_date: pastDate,
          service_id: serviceId,
          origin: 'auto_refere',
          zone_situation: 'zone_responsabilite',
          prise_en_charge: 'maladie_naturelle',
          status: 'active',
        })
        .returningAll()
        .executeTakeFirstOrThrow()

      const expired = await service.isContactExpired(String(enc.id!))
      expect(expired).toBe(true)
    })

    it('returns false for consultation contact less than 24h old', async () => {
      const db = datasource.getInstance()
      const enc = await db
        .insertInto('encounters')
        .values({
          patient_id: patientId,
          contact_type: 'consultation',
          start_date: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          end_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          service_id: serviceId,
          origin: 'auto_refere',
          zone_situation: 'zone_responsabilite',
          prise_en_charge: 'maladie_naturelle',
          status: 'active',
        })
        .returningAll()
        .executeTakeFirstOrThrow()

      // created_at defaults to datetime('now') — less than 24h, so not expired
      const expired = await service.isContactExpired(String(enc.id!))
      expect(expired).toBe(false)
    })

    it('returns false for consultation contact without end_date created less than 24h ago', async () => {
      const db = datasource.getInstance()
      const enc = await db
        .insertInto('encounters')
        .values({
          patient_id: patientId,
          contact_type: 'consultation',
          start_date: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          // end_date intentionally omitted (null) so the 24h created_at rule applies
          service_id: serviceId,
          origin: 'auto_refere',
          zone_situation: 'zone_responsabilite',
          prise_en_charge: 'maladie_naturelle',
          status: 'active',
        })
        .returningAll()
        .executeTakeFirstOrThrow()

      const expired = await service.isContactExpired(String(enc.id!))
      expect(expired).toBe(false)
    })
  })

  // ─── canModifyDocument ───────────────────────────────────────────

  describe('canModifyDocument', () => {
    it('returns true for a draft document with a recent contact', async () => {
      const doc = await createDraftDoc()
      const canModify = await service.canModifyDocument(doc.id)
      expect(canModify).toBe(true)
    })

    it('returns true for a signed document', async () => {
      const doc = await createSignedDoc()
      const canModify = await service.canModifyDocument(doc.id)
      expect(canModify).toBe(true)
    })

    it('returns false for a draft document with an expired contact', async () => {
      const db = datasource.getInstance()
      // Consultation without end_date: the 24h created_at rule applies, so a
      // created_at older than 24h marks the contact expired.
      const enc = await db
        .insertInto('encounters')
        .values({
          patient_id: patientId,
          contact_type: 'consultation',
          start_date: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
          // end_date intentionally omitted (null)
          service_id: serviceId,
          origin: 'auto_refere',
          zone_situation: 'zone_responsabilite',
          prise_en_charge: 'maladie_naturelle',
          status: 'active',
        })
        .returningAll()
        .executeTakeFirstOrThrow()

      const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
      await db
        .updateTable('encounters')
        .set({ created_at: oldDate })
        .where('id', '=', enc.id!)
        .execute()

      const doc = await service.createDocument({
        contactId: String(enc.id!),
        documentTypeId: CONSULTATION_TYPE_ID,
        createdBy: userId,
      })
      const canModify = await service.canModifyDocument(doc.id)
      expect(canModify).toBe(false)
    })

    it('returns false for a non-existent document', async () => {
      const canModify = await service.canModifyDocument('nonexistent-id')
      expect(canModify).toBe(false)
    })

    it('allows modification of unsigned hospitalisation document without end_date', async () => {
      const db = datasource.getInstance()
      // Create a hospitalisation encounter with NO end_date (5 days ago — would be expired under 24h rule)
      const oldDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      const enc = await db
        .insertInto('encounters')
        .values({
          patient_id: patientId,
          contact_type: 'hospitalisation',
          start_date: oldDate,
          // end_date intentionally omitted (null)
          service_id: serviceId,
          origin: 'auto_refere',
          zone_situation: 'zone_responsabilite',
          prise_en_charge: 'maladie_naturelle',
          status: 'active',
        })
        .returningAll()
        .executeTakeFirstOrThrow()

      // Create a draft document linked to this hospitalisation encounter
      const doc = await service.createDocument({
        contactId: String(enc.id!),
        documentTypeId: CONSULTATION_TYPE_ID,
        createdBy: userId,
      })

      const canModify = await service.canModifyDocument(doc.id)
      expect(canModify).toBe(true)
    })

    it('blocks modification of unsigned hospitalisation document with past end_date', async () => {
      const db = datasource.getInstance()
      const pastDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      const enc = await db
        .insertInto('encounters')
        .values({
          patient_id: patientId,
          contact_type: 'hospitalisation',
          start_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          end_date: pastDate,
          service_id: serviceId,
          origin: 'auto_refere',
          zone_situation: 'zone_responsabilite',
          prise_en_charge: 'maladie_naturelle',
          status: 'active',
        })
        .returningAll()
        .executeTakeFirstOrThrow()

      const doc = await service.createDocument({
        contactId: String(enc.id!),
        documentTypeId: CONSULTATION_TYPE_ID,
        createdBy: userId,
      })

      const canModify = await service.canModifyDocument(doc.id)
      expect(canModify).toBe(false)
    })
  })

  // ─── FK Validation ────────────────────────────────────────────────

  describe('FK Validation', () => {
    it('should reject createDocument with invalid contact_id', async () => {
      await expect(
        service.createDocument({
          contactId: '99999',
          documentTypeId: CONSULTATION_TYPE_ID,
          createdBy: userId,
        })
      ).rejects.toThrow()
    })

    it('should reject createDocument with invalid document_type_id', async () => {
      await expect(
        service.createDocument({
          contactId: String(encounterId),
          documentTypeId: 'non-existent-type-id',
          createdBy: userId,
        })
      ).rejects.toThrow()
    })

    it('should reject createDocument with invalid created_by', async () => {
      await expect(
        service.createDocument({
          contactId: String(encounterId),
          documentTypeId: CONSULTATION_TYPE_ID,
          createdBy: 'non-existent-user',
        })
      ).rejects.toThrow()
    })
  })

  // ─── Site resolution (default site for a user) ───────────────────

  describe('site resolution', () => {
    it('persists an explicitly provided siteId on the document', async () => {
      const db = datasource.getInstance()
      const site = await db
        .insertInto('sites')
        .values({ name: `Site A ${Date.now()}`, is_active: 1 })
        .returningAll()
        .executeTakeFirstOrThrow()

      const doc = await service.createDocument({
        contactId: String(encounterId),
        documentTypeId: CONSULTATION_TYPE_ID,
        createdBy: userId,
        siteId: site.id!,
      })

      expect(doc.siteId).toBe(site.id)
    })

    it('defaults site_id to the creator\'s first user_sites entry when not provided', async () => {
      const db = datasource.getInstance()
      const siteA = await db
        .insertInto('sites')
        .values({ name: `Site Alpha ${Date.now()}`, is_active: 1 })
        .returningAll()
        .executeTakeFirstOrThrow()
      const siteB = await db
        .insertInto('sites')
        .values({ name: `Site Beta ${Date.now()}`, is_active: 1 })
        .returningAll()
        .executeTakeFirstOrThrow()

      // Two sites — resolution must pick the lowest site_id (ordered asc)
      await db
        .insertInto('user_sites')
        .values([
          { user_id: Number(userId), site_id: siteB.id! },
          { user_id: Number(userId), site_id: siteA.id! },
        ])
        .execute()

      const doc = await service.createDocument({
        contactId: String(encounterId),
        documentTypeId: CONSULTATION_TYPE_ID,
        createdBy: userId,
      })

      expect(doc.siteId).toBe(siteA.id)
    })

    it('leaves site_id null when the user has no assigned site', async () => {
      const doc = await createDraftDoc()
      expect(doc.siteId).toBeNull()
    })

    it('explicit siteId wins over the user_sites default', async () => {
      const db = datasource.getInstance()
      const siteA = await db
        .insertInto('sites')
        .values({ name: `Site Alpha ${Date.now()}`, is_active: 1 })
        .returningAll()
        .executeTakeFirstOrThrow()
      const siteB = await db
        .insertInto('sites')
        .values({ name: `Site Beta ${Date.now()}`, is_active: 1 })
        .returningAll()
        .executeTakeFirstOrThrow()

      await db
        .insertInto('user_sites')
        .values({ user_id: Number(userId), site_id: siteA.id! })
        .execute()

      const doc = await service.createDocument({
        contactId: String(encounterId),
        documentTypeId: CONSULTATION_TYPE_ID,
        createdBy: userId,
        siteId: siteB.id!,
      })

      expect(doc.siteId).toBe(siteB.id)
    })

    it('joins the site name into getDocumentsByContact results', async () => {
      const db = datasource.getInstance()
      const site = await db
        .insertInto('sites')
        .values({ name: `Site Principal ${Date.now()}`, is_active: 1 })
        .returningAll()
        .executeTakeFirstOrThrow()

      const doc = await service.createDocument({
        contactId: String(encounterId),
        documentTypeId: CONSULTATION_TYPE_ID,
        createdBy: userId,
        siteId: site.id!,
      })

      const docs = await service.getDocumentsByContact(String(encounterId))
      expect(docs).toHaveLength(1)
      expect(docs[0].id).toBe(doc.id)
      expect(docs[0].siteId).toBe(site.id)
      expect(docs[0].siteName).toBe(site.name)
    })
  })
})
