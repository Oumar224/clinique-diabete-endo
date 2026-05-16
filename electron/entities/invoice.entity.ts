import type { InvoiceDto, InvoiceItemDto, InvoicePaymentDto } from '../dto/invoice.dto'
import type { Kysely } from 'kysely'
import { CompiledQuery } from 'kysely'
import { EntityRegistry } from '../automerge/entity-registry'
import type { AutomergeDocument } from '../automerge/utils/entity-types'
import { InvoiceConverter } from '../automerge/converters/invoice.converter'

export class InvoiceEntity {
  id?: number
  numero?: string
  patient_id?: number
  date?: string
  montant_total?: number
  montant_restant?: number
  status?: 'payé' | 'en_attente' | 'annulé' | 'partiel'
  notes?: string
  created_by?: number
  created_at?: string
  updated_at?: string

  static toDto(
    entity: InvoiceEntity,
    items?: InvoiceItemDto[],
    payments?: InvoicePaymentDto[],
    patientNom?: string,
    patientPrenom?: string,
  ): InvoiceDto {
    return {
      id: entity.id,
      numero: entity.numero!,
      patient_id: entity.patient_id!,
      patient_nom: patientNom,
      patient_prenom: patientPrenom,
      date: entity.date!,
      montant_total: entity.montant_total ?? 0,
      montant_restant: entity.montant_restant ?? 0,
      status: entity.status!,
      notes: entity.notes,
      created_by: entity.created_by,
      created_at: entity.created_at,
      updated_at: entity.updated_at,
      items,
      payments,
    }
  }

  static toDtos(entities: InvoiceEntity[]): InvoiceDto[] {
    return entities.map((e) => InvoiceEntity.toDto(e))
  }

  static fromDto(dto: InvoiceDto | InvoiceDto): InvoiceEntity {
    const e = new InvoiceEntity()
    e.id = dto.id
    e.numero = dto.numero
    e.patient_id = dto.patient_id
    e.date = dto.date
    e.montant_total = dto.montant_total
    e.montant_restant = dto.montant_restant
    e.status = dto.status
    e.notes = dto.notes
    e.created_by = dto.created_by
    return e
  }

  static async createSchema(db: Kysely<unknown>): Promise<void> {
    await db.executeQuery(CompiledQuery.raw(`
      CREATE TABLE IF NOT EXISTS invoice (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        numero TEXT NOT NULL UNIQUE,
        patient_id INTEGER NOT NULL REFERENCES patient(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        montant_total REAL NOT NULL DEFAULT 0,
        montant_restant REAL NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'en_attente' CHECK(status IN ('payé','en_attente','annulé','partiel')),
        notes TEXT,
        created_by INTEGER REFERENCES user(id),
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `))
    await db.executeQuery(CompiledQuery.raw('CREATE INDEX IF NOT EXISTS idx_invoice_numero ON invoice(numero)'))
    await db.executeQuery(CompiledQuery.raw('CREATE INDEX IF NOT EXISTS idx_invoice_patient ON invoice(patient_id)'))
    await db.executeQuery(CompiledQuery.raw('CREATE INDEX IF NOT EXISTS idx_invoice_date ON invoice(date)'))
    await db.executeQuery(CompiledQuery.raw('CREATE INDEX IF NOT EXISTS idx_invoice_status ON invoice(status)'))

    await db.executeQuery(CompiledQuery.raw(`
      CREATE TABLE IF NOT EXISTS invoice_item (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_id INTEGER NOT NULL REFERENCES invoice(id) ON DELETE CASCADE,
        libelle TEXT NOT NULL,
        quantite INTEGER NOT NULL DEFAULT 1,
        prix_unitaire REAL NOT NULL,
        montant REAL NOT NULL,
        type TEXT NOT NULL DEFAULT 'autre' CHECK(type IN ('consultation','acte','medicament','autre')),
        created_at TEXT DEFAULT (datetime('now'))
      )
    `))
    await db.executeQuery(CompiledQuery.raw('CREATE INDEX IF NOT EXISTS idx_invoice_item_invoice ON invoice_item(invoice_id)'))

    await db.executeQuery(CompiledQuery.raw(`
      CREATE TABLE IF NOT EXISTS invoice_payment (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_id INTEGER NOT NULL REFERENCES invoice(id) ON DELETE CASCADE,
        montant REAL NOT NULL,
        mode_paiement TEXT NOT NULL CHECK(mode_paiement IN ('espèces','carte_bancaire','chèque','virement','autre')),
        date_paiement TEXT NOT NULL,
        reference TEXT,
        created_by INTEGER REFERENCES user(id),
        created_at TEXT DEFAULT (datetime('now'))
      )
    `))
    await db.executeQuery(CompiledQuery.raw('CREATE INDEX IF NOT EXISTS idx_invoice_payment_invoice ON invoice_payment(invoice_id)'))
  }

  static async dropSchema(db: Kysely<unknown>): Promise<void> {
    await db.executeQuery(CompiledQuery.raw('DROP TABLE IF EXISTS invoice_payment'))
    await db.executeQuery(CompiledQuery.raw('DROP TABLE IF EXISTS invoice_item'))
    await db.executeQuery(CompiledQuery.raw('DROP TABLE IF EXISTS invoice'))
  }

  static async recreateSchema(db: Kysely<unknown>): Promise<void> {
    await this.dropSchema(db)
    await this.createSchema(db)
  }

  static documentType(): string {
    return 'Invoice'
  }

  static documentSchema(): AutomergeDocument<InvoiceEntity> {
    return {} as AutomergeDocument<InvoiceEntity>
  }

  static register(): void {
    EntityRegistry.getInstance().register({
      type: this.documentType(),
      tableName: 'invoice',
      documentSchema: this.documentSchema(),
      converter: { toDocument: InvoiceConverter.toDocument, toEntity: InvoiceConverter.toEntity },
    })
  }
}
