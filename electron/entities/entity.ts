import type { Kysely } from 'kysely'

export interface Entity {
  createSchema: (db: Kysely<unknown>) => Promise<void>
  dropSchema: (db: Kysely<unknown>) => Promise<void>
  recreateSchema: (db: Kysely<unknown>) => Promise<void>
  name?: string
  documentType?: () => string
  documentSchema?: () => any
  register?: () => void
}
