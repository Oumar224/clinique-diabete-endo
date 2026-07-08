import type { Kysely } from 'kysely'
import { CompiledQuery } from 'kysely'

export interface PlanSoinsEntity {
  id?: number
  patient_id: number
  date: string
  created_by: number
  created_at?: string
  updated_at?: string
}

export interface PlanSoinsItemEntity {
  id?: number
  plan_soins_id: number
  bloc_heure: string
  medicament: string
  dosage: string
  voie: string
  statut: string
  valide_par: string | null
  valide_a: string | null
  motif_suspension: string | null
  prescription_id: number | null
  created_at?: string
  updated_at?: string
}

export class PlanSoinsEntity {
  static async createSchema(db: Kysely<unknown>): Promise<void> {
    await db.executeQuery(CompiledQuery.raw(`
      CREATE TABLE IF NOT EXISTS plan_soins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL REFERENCES patient(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        created_by INTEGER NOT NULL REFERENCES user(id),
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `))
    await db.executeQuery(CompiledQuery.raw(`
      CREATE TABLE IF NOT EXISTS plan_soins_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plan_soins_id INTEGER NOT NULL REFERENCES plan_soins(id) ON DELETE CASCADE,
        bloc_heure TEXT NOT NULL,
        medicament TEXT NOT NULL,
        dosage TEXT NOT NULL,
        voie TEXT NOT NULL CHECK(voie IN ('PO','SC','IV','IM','SL')),
        statut TEXT NOT NULL DEFAULT 'en_attente' CHECK(statut IN ('en_attente','valide','suspendu')),
        valide_par TEXT,
        valide_a TEXT,
        motif_suspension TEXT,
        prescription_id INTEGER REFERENCES prescriptions(id) ON DELETE SET NULL,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `))
    await db.executeQuery(CompiledQuery.raw('CREATE INDEX IF NOT EXISTS idx_plan_soins_patient_date ON plan_soins(patient_id, date)'))
    await db.executeQuery(CompiledQuery.raw('CREATE INDEX IF NOT EXISTS idx_plan_soins_items_plan ON plan_soins_items(plan_soins_id)'))
  }

  static async dropSchema(db: Kysely<unknown>): Promise<void> {
    await db.executeQuery(CompiledQuery.raw('DROP TABLE IF EXISTS plan_soins_items'))
    await db.executeQuery(CompiledQuery.raw('DROP TABLE IF EXISTS plan_soins'))
  }

  static async recreateSchema(db: Kysely<unknown>): Promise<void> {
    await this.dropSchema(db)
    await this.createSchema(db)
  }
}
