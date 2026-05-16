import type { AppointmentDto } from '../dto/appointment.dto'
import type { Kysely } from 'kysely'
import { CompiledQuery } from 'kysely'
import { EntityRegistry } from '../automerge/entity-registry'
import { AppointmentConverter } from '../automerge/converters/appointment.converter'
import type { AutomergeDocument } from '../automerge/utils/entity-types'

export class AppointmentEntity {
  id?: number
  patient_id?: number
  date?: string
  time?: string
  motif?: string
  status?: 'confirmed' | 'pending' | 'cancelled' | 'done'
  medecin_id?: number
  notes?: string
  automerge_id?: string
  created_at?: string
  updated_at?: string

  static toDto(entity: AppointmentEntity): AppointmentDto {
    return {
      id: entity.id,
      patient_id: entity.patient_id,
      date: entity.date,
      time: entity.time,
      motif: entity.motif,
      status: entity.status,
      medecin_id: entity.medecin_id,
      notes: entity.notes,
    }
  }

  static toDtos(entities: AppointmentEntity[]): AppointmentDto[] {
    return entities.map(AppointmentEntity.toDto)
  }

  static fromDto(dto: AppointmentDto): AppointmentEntity {
    const e = new AppointmentEntity()
    e.id = dto.id
    e.patient_id = dto.patient_id
    e.date = dto.date
    e.time = dto.time
    e.motif = dto.motif
    e.status = dto.status
    e.medecin_id = dto.medecin_id
    e.notes = dto.notes
    return e
  }

  static async createSchema(db: Kysely<unknown>): Promise<void> {
    await db.executeQuery(CompiledQuery.raw(`
      CREATE TABLE IF NOT EXISTS appointment (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL REFERENCES patient(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        motif TEXT,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('confirmed','pending','cancelled','done')),
        medecin_id INTEGER REFERENCES user(id),
        notes TEXT,
        automerge_id TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `))
    await db.executeQuery(CompiledQuery.raw('CREATE INDEX IF NOT EXISTS idx_appointment_date ON appointment(date)'))
    await db.executeQuery(CompiledQuery.raw('CREATE INDEX IF NOT EXISTS idx_appointment_patient ON appointment(patient_id)'))
  }

  static async dropSchema(db: Kysely<unknown>): Promise<void> {
    await db.executeQuery(CompiledQuery.raw('DROP TABLE IF EXISTS appointment'))
  }

  static async recreateSchema(db: Kysely<unknown>): Promise<void> {
    await this.dropSchema(db)
    await this.createSchema(db)
  }

  static documentType(): string {
    return 'Appointment'
  }

  static documentSchema(): AutomergeDocument<AppointmentEntity> {
    return {} as AutomergeDocument<AppointmentEntity>
  }

  static register(): void {
    EntityRegistry.getInstance().register({
      type: this.documentType(),
      tableName: 'appointment',
      documentSchema: this.documentSchema(),
      converter: { toDocument: AppointmentConverter.toDocument, toEntity: AppointmentConverter.toEntity },
    })
  }
}
