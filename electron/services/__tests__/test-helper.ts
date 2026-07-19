/**
 * Test helper for FK validation integration tests.
 *
 * Creates an in-memory SQLite database, runs all migrations,
 * seeds minimal reference data, and provides a factory for
 * instantiating services with a mock datasource.
 */

import { DatabaseSync } from 'node:sqlite'
import { Kysely, sql } from 'kysely'
import { NodeSqliteDialect } from '../../driver/node-sqlite-dialect'
import { MigrationService } from '../migration.service'
import { SeedService } from '../seed.service'
import type { IAppDataSource } from '../../data-source'

// ─── Database factory ────────────────────────────────────────────────

/**
 * Create a fresh in-memory Kysely instance, run all migrations
 * and seed the minimum reference data needed for FK validation tests.
 */
export async function createTestDb(): Promise<Kysely<any>> {
  const dialect = new NodeSqliteDialect(':memory:')
  const db = new Kysely({ dialect })

  // Run all migrations — they create tables and seed lookup data
  const migrationService = new MigrationService(db as any)
  await migrationService.runMigrations()

  // Seed the admin user (user id = 1)
  const seedService = new SeedService(db as any)
  await seedService.seed()

  // Seed additional reference data needed for FK validation tests
  await seedReferenceData(db)

  return db
}

/**
 * Seed minimal reference rows for FK targets that aren't covered
 * by the migrations or SeedService.
 */
async function seedReferenceData(db: Kysely<any>): Promise<void> {
  await sql`PRAGMA foreign_keys = OFF`.execute(db)

  // patient #1 – referenced by many seed rows in migrations (031, 032, 033, 035)
  await sql`
    INSERT OR IGNORE INTO patient (id, civilite, nom, prenom, date_naissance, nir, telephone)
    VALUES (1, 'M', 'Dupont', 'Jean', '1980-01-15', 'NIR001', '600000001')
  `.execute(db)

  // specialty — needed by exam-request FK
  await sql`
    INSERT OR IGNORE INTO specialties (id, name, code, title_prefix)
    VALUES (1, 'Cardiologie', 'CARD', 'Dr')
  `.execute(db)

  // Make sure at least one service exists (migration 005 seeds 5 services)
  // The "Accueil" service is the first one, id should be 1
  const svc = await sql<{ id: number }>`SELECT id FROM services LIMIT 1`.execute(db)
  if (svc.rows.length === 0) {
    await sql`
      INSERT INTO services (id, name, description, duration, color, sort_order, is_active)
      VALUES (1, 'Consultation', 'Consultation générale', 30, '#409EFF', 1, 1)
    `.execute(db)
  }

  // encounter (needed by exam-request and clinical-document FKs)
  const encounterServiceId = svc.rows.length > 0 ? svc.rows[0].id : 1
  await sql`
    INSERT OR IGNORE INTO encounters (id, patient_id, contact_type, start_date, end_date, service_id, status, created_by, origin, zone_situation, prise_en_charge)
    VALUES (1, 1, 'consultation', date('now'), date('now'), ${encounterServiceId}, 'active', 1, 'auto_refere', 'zone_responsabilite', 'maladie_naturelle')
  `.execute(db)

  // clinical_document_types – referenced by clinical-document FK
  // Migration 064 seeds one: id = '11111111-1111-4111-1111-111111111111'
  // If it doesn't exist, seed it manually
  const cdt = await sql<{ id: string }>`SELECT id FROM clinical_document_types LIMIT 1`.execute(db)
  if (cdt.rows.length === 0) {
    await sql`
      INSERT OR IGNORE INTO clinical_document_types (id, code, label, description, form_schema, category)
      VALUES ('11111111-1111-4111-1111-111111111111', 'CRH_DIABETE', 'Compte-Rendu', 'Test', '[]', 'hospitalization')
    `.execute(db)
  }

  // attachment_types – needed by patient-attachment and user-attachment FKs
  await sql`
    INSERT OR IGNORE INTO attachment_types (id, name) VALUES (1, 'Test Attachment Type')
  `.execute(db)

  // care_unit – needed by appointment FK (when new columns exist)
  await sql`
    INSERT OR IGNORE INTO care_units (id, service_id, name, code)
    VALUES (1, ${encounterServiceId}, 'Unité de test', 'UT')
  `.execute(db)

  await sql`PRAGMA foreign_keys = ON`.execute(db)
}

// ─── Mock datasource factory ─────────────────────────────────────────

/**
 * Create a minimal mock of `AppDatabaseDatasource` that returns the
 * given Kysely instance from `getInstance()`.
 *
 * The real `IAppDataSource` interface only requires `getInstance()`.
 */
export function createMockDataSource(db: Kysely<any>): IAppDataSource<Kysely<any>> {
  return {
    getInstance: () => db,
    initialize: async () => db,
    destroy: async () => { /* no-op */ },
    dropAllSchemas: async () => { /* no-op */ },
    recreateAllSchemas: async () => { /* no-op */ },
  }
}

// ─── Entity builders ─────────────────────────────────────────────────

import { ExamRequestEntity } from '../../entities/exam-request.entity'
import { PrescriptionEntity } from '../../entities/prescription.entity'
import { DispositifEntity } from '../../entities/dispositif.entity'
import { VitalSignEntity } from '../../entities/vital-sign.entity'
import { PatientAttachmentEntity } from '../../entities/patient-attachment.entity'
import { UserAttachmentEntity } from '../../entities/user-attachment.entity'
import type { AppointmentEntity } from '../../entities/appointment.entity'
import type { InvoiceCreateDto } from '../../dto/invoice.dto'
import type { CreateDocumentParams } from '../clinical-document.service'

/**
 * Build a minimal ExamRequestEntity with sensible defaults.
 * Override any field via `overrides`.
 */
export function buildExamRequest(overrides: Partial<ExamRequestEntity> = {}): ExamRequestEntity {
  const entity = new ExamRequestEntity()
  entity.patient_id = 1
  entity.type = 'lab'
  entity.statut = 'en_attente'
  entity.prescripteur_id = 1
  entity.created_by = 1
  Object.assign(entity, overrides)
  return entity
}

/**
 * Build a minimal AppointmentEntity.
 */
export function buildAppointment(overrides: Partial<AppointmentEntity> = {}): AppointmentEntity {
  return {
    patient_id: 1,
    date: new Date().toISOString().slice(0, 10),
    time: '09:00',
    motif: 'Test',
    status: 'confirmed',
    medecin_id: 1,
    ...overrides,
  } as AppointmentEntity
}

/**
 * Build a minimal PrescriptionEntity.
 */
export function buildPrescription(overrides: Partial<PrescriptionEntity> = {}): PrescriptionEntity {
  const entity = new PrescriptionEntity()
  entity.patient_id = 1
  entity.medicament = 'TestMed'
  entity.dosage = '10mg'
  entity.voie = 'PO'
  entity.duree = 7
  entity.frequence = 'Matin,Soir'
  entity.prescripteur_id = 1
  Object.assign(entity, overrides)
  return entity
}

/**
 * Build a minimal invoice creation DTO.
 */
export function buildInvoiceCreateDto(overrides: Partial<InvoiceCreateDto> = {}): InvoiceCreateDto {
  return {
    patient_id: 1,
    date: new Date().toISOString().slice(0, 10),
    items: [{ libelle: 'Test', quantite: 1, prix_unitaire: 100, montant: 100, type: 'consultation' as const }],
    created_by: 1,
    notes: undefined,
    ...overrides,
  }
}

/**
 * Build a minimal DispositifEntity.
 */
export function buildDispositif(overrides: Partial<DispositifEntity> = {}): DispositifEntity {
  const entity = new DispositifEntity()
  entity.patient_id = 1
  entity.type = 'Cathéter'
  entity.date_pose = new Date().toISOString().slice(0, 10)
  entity.aspect = 'Sain'
  entity.created_by = 1
  Object.assign(entity, overrides)
  return entity
}

/**
 * Build a minimal VitalSignEntity.
 */
export function buildVitalSign(overrides: Partial<VitalSignEntity> = {}): VitalSignEntity {
  const entity = new VitalSignEntity()
  entity.patient_id = 1
  entity.date = new Date().toISOString().slice(0, 10)
  entity.glycemie = 1.0
  entity.created_by = 1
  Object.assign(entity, overrides)
  return entity
}

/**
 * Build a minimal CreateDocumentParams.
 */
export function buildCreateDocumentParams(overrides: Partial<CreateDocumentParams> = {}): CreateDocumentParams {
  return {
    contactId: '1',
    documentTypeId: '11111111-1111-4111-1111-111111111111',
    createdBy: '1',
    serviceId: null,
    ...overrides,
  }
}

/**
 * Build a minimal PatientAttachmentEntity.
 */
export function buildPatientAttachment(overrides: Partial<PatientAttachmentEntity> = {}): PatientAttachmentEntity {
  const entity = new PatientAttachmentEntity()
  entity.patient_id = 1
  entity.display_name = 'test.txt'
  entity.file_name = 'test.txt'
  entity.file_data = 'dGVzdA==' // base64 "test"
  entity.mime_type = 'text/plain'
  entity.file_size = 4
  entity.category = 'patient'
  entity.attachment_type_id = 1
  Object.assign(entity, overrides)
  return entity
}

/**
 * Build a minimal UserAttachmentEntity.
 */
export function buildUserAttachment(overrides: Partial<UserAttachmentEntity> = {}): UserAttachmentEntity {
  const entity = new UserAttachmentEntity()
  entity.user_id = 1
  entity.display_name = 'test.txt'
  entity.file_name = 'test.txt'
  entity.file_data = 'dGVzdA=='
  entity.mime_type = 'text/plain'
  entity.file_size = 4
  entity.attachment_type_id = 1
  Object.assign(entity, overrides)
  return entity
}
