import { inject, singleton } from 'tsyringe'
import { sql, type Kysely, type Transaction } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import { ApportEntity, ApportRemboursementEntity } from '../entities/apport.entity'
import type {
  ApportCreateDto,
  ApportDto,
  ApportListFiltres,
  ApportRemboursementCreateDto,
  ApportRemboursementDto,
  ApportStatut,
  ApportType,
  ApportUpdateDto,
} from '../dto/apport.dto'
import type { ModePaiement } from '../dto/invoice.dto'
import { nowIso, todayIso } from '../utils/date-utils'
import { entityEventBus } from '../automerge/event-bus'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const MODES_PAIEMENT: readonly ModePaiement[] = [
  'espèces', 'carte_bancaire', 'chèque', 'virement', 'mobile_money', 'assurance', 'autre',
]
const MAX_REFERENCE_ATTEMPTS = 50

function assertDate(value: string | undefined | null, label: string): string | undefined {
  if (value == null || value === '') return undefined
  if (!DATE_RE.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    throw new Error(`${label} invalide (format YYYY-MM-DD attendu)`)
  }
  return value
}

function asAmount(value: unknown): number {
  const n = Number(value ?? 0)
  return Number.isFinite(n) ? Math.trunc(n) : 0
}

function assertPositiveAmount(value: unknown, label: string): number {
  const n = Math.trunc(Number(value))
  if (!Number.isFinite(n) || n <= 0) throw new Error(`${label} doit être un entier strictement positif`)
  return n
}

function assertMode(value: string | undefined, fallback: ModePaiement): ModePaiement {
  if (value == null || value === '') return fallback
  if (!MODES_PAIEMENT.includes(value as ModePaiement)) throw new Error('Mode de paiement invalide')
  return value as ModePaiement
}

@singleton()
export class ApportService {
  private readonly db: Kysely<DB>

  constructor(@inject(AppDatabaseDatasource) datasource: AppDatabaseDatasource) {
    this.db = datasource.getInstance()
  }

  async list(filters: ApportListFiltres = {}): Promise<ApportDto[]> {
    let query = this.db.selectFrom('apports').selectAll()
    if (filters.type) query = query.where('type', '=', filters.type)
    if (filters.statut) query = query.where('statut', '=', filters.statut)
    if (filters.dateDebut) query = query.where('date_apport', '>=', assertDate(filters.dateDebut, 'Date de début')!)
    if (filters.dateFin) query = query.where('date_apport', '<=', assertDate(filters.dateFin, 'Date de fin')!)
    const search = filters.search?.trim()
    if (search) {
      const pattern = `%${search}%`
      query = query.where((eb) => eb.or([
        eb('reference', 'like', pattern),
        eb('libelle', 'like', pattern),
      ]))
    }
    const rows = await query
      .orderBy('date_apport', 'desc')
      .orderBy('id', 'desc')
      .limit(1000)
      .execute() as unknown as ApportEntity[]
    return this.hydrateMany(rows)
  }

  async getById(id: number): Promise<ApportDto> {
    const row = await this.getEntity(id)
    const [dto] = await this.hydrateMany([row])
    return dto
  }

  async create(dto: ApportCreateDto): Promise<ApportDto> {
    const type = this.assertType(dto.type)
    const libelle = dto.libelle?.trim()
    if (!libelle) throw new Error('Le libellé de l’apport est requis')
    const montant = assertPositiveAmount(dto.montant, 'Le montant')
    const dateApport = assertDate(dto.dateApport, 'Date de l’apport') ?? todayIso()
    const modePaiement = assertMode(dto.modePaiement, 'espèces')
    const providedReference = dto.reference?.trim()
    if (providedReference && providedReference.length > 100) throw new Error('La référence ne doit pas dépasser 100 caractères')

    const stamp = dateApport.replace(/-/g, '')
    const base = providedReference ? 0 : await this.nextReferenceBase(stamp)
    let lastError: unknown
    for (let attempt = 0; attempt < MAX_REFERENCE_ATTEMPTS; attempt++) {
      const reference = providedReference || `AP-${stamp}-${String(base + attempt + 1).padStart(4, '0')}`
      try {
        const id = await this.db.transaction().execute(async (trx) => {
          const inserted = await trx
            .insertInto('apports')
            .values({
              reference,
              type,
              libelle,
              montant,
              date_apport: dateApport,
              mode_paiement: modePaiement,
              statut: 'ouvert',
              notes: dto.notes?.trim() || null,
              created_by: dto.createdBy,
              created_at: nowIso(),
              updated_at: nowIso(),
            })
            .returning('id')
            .executeTakeFirstOrThrow()
          return Number(inserted.id)
        })
        const created = await this.getById(id)
        entityEventBus.emitEntityChange({ entityType: 'apport', action: 'created', id, entity: created, source: 'local', timestamp: Date.now() })
        return created
      } catch (error) {
        lastError = error
        const message = error instanceof Error ? error.message : String(error)
        if (providedReference || !message.includes('UNIQUE') || !message.includes('apports.reference')) throw error
      }
    }
    throw lastError instanceof Error ? lastError : new Error('Impossible de générer une référence d’apport')
  }

  async update(id: number, dto: ApportUpdateDto): Promise<ApportDto> {
    const existing = await this.getEntity(id)
    if (existing.statut === 'annule') throw new Error('Un apport annulé ne peut pas être modifié')
    const montant = dto.montant !== undefined ? assertPositiveAmount(dto.montant, 'Le montant') : Number(existing.montant ?? 0)
    const rembourse = await this.sumRemboursements(id)
    if (montant < rembourse) throw new Error('Le montant ne peut pas être inférieur au cumul déjà remboursé')

    const values: Record<string, unknown> = { updated_at: nowIso() }
    if (dto.libelle !== undefined) {
      const libelle = dto.libelle.trim()
      if (!libelle) throw new Error('Le libellé de l’apport est requis')
      values.libelle = libelle
    }
    if (dto.montant !== undefined) values.montant = montant
    if (dto.dateApport !== undefined) {
      const dateApport = assertDate(dto.dateApport, 'Date de l’apport')
      if (dateApport) values.date_apport = dateApport
    }
    if (dto.modePaiement !== undefined) values.mode_paiement = assertMode(dto.modePaiement, 'espèces')
    if (dto.notes !== undefined) values.notes = dto.notes?.trim() || null

    const statut = this.computeStatut(existing.type!, montant, rembourse, existing.statut!)
    values.statut = statut
    await this.db.updateTable('apports').set(values as never).where('id', '=', id).execute()
    const updated = await this.getById(id)
    entityEventBus.emitEntityChange({ entityType: 'apport', action: 'updated', id, entity: updated, source: 'local', timestamp: Date.now() })
    return updated
  }

  async delete(id: number): Promise<void> {
    const existing = await this.getEntity(id)
    const rembourse = await this.sumRemboursements(id)
    if (rembourse > 0) {
      throw new Error('Impossible de supprimer un apport déjà remboursé (annulez-le plutôt)')
    }
    if (existing.statut !== 'annule') {
      throw new Error('Seul un apport annulé peut être supprimé')
    }
    await this.db.deleteFrom('apports').where('id', '=', id).execute()
  }

  async annuler(id: number): Promise<ApportDto> {
    const existing = await this.getEntity(id)
    if (existing.statut === 'annule') throw new Error('Cet apport est déjà annulé')
    const rembourse = await this.sumRemboursements(id)
    if (rembourse > 0) throw new Error('Impossible d’annuler un apport déjà partiellement remboursé')
    await this.db
      .updateTable('apports')
      .set({ statut: 'annule', updated_at: nowIso() })
      .where('id', '=', id)
      .execute()
    const updated = await this.getById(id)
    entityEventBus.emitEntityChange({ entityType: 'apport', action: 'updated', id, entity: updated, source: 'local', timestamp: Date.now() })
    return updated
  }

  async addRemboursement(apportId: number, dto: ApportRemboursementCreateDto): Promise<ApportDto> {
    const apport = await this.getEntity(apportId)
    if (apport.type !== 'dette') throw new Error('Seul un apport de type dette peut être remboursé')
    if (apport.statut === 'annule') throw new Error('Un apport annulé ne peut pas être remboursé')
    if (apport.statut === 'rembourse') throw new Error('Cet apport est déjà entièrement remboursé')
    const montant = assertPositiveAmount(dto.montant, 'Le montant du remboursement')
    const dateRemboursement = assertDate(dto.dateRemboursement, 'Date de remboursement') ?? todayIso()
    const modePaiement = assertMode(dto.modePaiement, 'espèces')

    await this.db.transaction().execute(async (trx) => {
      const current = await this.getEntityTx(trx, apportId)
      if (current.statut !== 'ouvert') throw new Error('Cet apport ne peut plus être remboursé')
      const dejaRembourse = await this.sumRemboursements(apportId, trx)
      const total = dejaRembourse + montant
      if (total > Number(current.montant ?? 0)) {
        throw new Error(`Remboursement supérieur au reste dû (reste ${Number(current.montant ?? 0) - dejaRembourse})`)
      }
      await trx
        .insertInto('apport_remboursements')
        .values({
          apport_id: apportId,
          montant,
          date_remboursement: dateRemboursement,
          mode_paiement: modePaiement,
          reference: dto.reference?.trim() || null,
          notes: dto.notes?.trim() || null,
          created_by: dto.createdBy,
          created_at: nowIso(),
        })
        .execute()
      await trx
        .updateTable('apports')
        .set({
          statut: total >= Number(current.montant ?? 0) ? 'rembourse' : 'ouvert',
          updated_at: nowIso(),
        })
        .where('id', '=', apportId)
        .execute()
    })
    const updated = await this.getById(apportId)
    entityEventBus.emitEntityChange({ entityType: 'apport', action: 'updated', id: apportId, entity: updated, source: 'local', timestamp: Date.now() })
    return updated
  }

  async deleteRemboursement(id: number): Promise<ApportDto> {
    const remboursement = await this.db
      .selectFrom('apport_remboursements')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst()
    if (!remboursement) throw new Error('Remboursement introuvable')
    const apportId = Number(remboursement.apport_id)
    await this.db.transaction().execute(async (trx) => {
      const apport = await this.getEntityTx(trx, apportId)
      if (apport.statut === 'annule') throw new Error('Un apport annulé ne peut pas être modifié')
      await trx.deleteFrom('apport_remboursements').where('id', '=', id).execute()
      const total = await this.sumRemboursements(apportId, trx)
      await trx
        .updateTable('apports')
        .set({
          statut: total >= Number(apport.montant ?? 0) ? 'rembourse' : 'ouvert',
          updated_at: nowIso(),
        })
        .where('id', '=', apportId)
        .execute()
    })
    const updated = await this.getById(apportId)
    entityEventBus.emitEntityChange({ entityType: 'apport', action: 'updated', id: apportId, entity: updated, source: 'local', timestamp: Date.now() })
    return updated
  }

  private async hydrateMany(rows: ApportEntity[]): Promise<ApportDto[]> {
    if (rows.length === 0) return []
    const ids = rows.map((r) => Number(r.id))
    const remboursements = await this.db
      .selectFrom('apport_remboursements')
      .selectAll()
      .where('apport_id', 'in', ids)
      .orderBy('date_remboursement', 'asc')
      .orderBy('id', 'asc')
      .execute() as unknown as ApportRemboursementEntity[]
    const byApport = new Map<number, ApportRemboursementDto[]>()
    for (const row of remboursements) {
      const list = byApport.get(Number(row.apport_id)) ?? []
      list.push(ApportRemboursementEntity.toDto(row))
      byApport.set(Number(row.apport_id), list)
    }
    return rows.map((row) => {
      const dto = ApportEntity.toDto(row)
      const list = byApport.get(Number(row.id)) ?? []
      const montantRembourse = list.reduce((sum, r) => sum + (r.montant ?? 0), 0)
      dto.remboursements = list
      dto.montantRembourse = montantRembourse
      dto.resteARembourser = Math.max(0, (row.montant ?? 0) - montantRembourse)
      return dto
    })
  }

  private async getEntity(id: number): Promise<ApportEntity> {
    const row = await this.db.selectFrom('apports').selectAll().where('id', '=', id).executeTakeFirst()
    if (!row) throw new Error('Apport introuvable')
    return row as unknown as ApportEntity
  }

  private async getEntityTx(trx: Transaction<DB>, id: number): Promise<ApportEntity> {
    const row = await trx.selectFrom('apports').selectAll().where('id', '=', id).executeTakeFirst()
    if (!row) throw new Error('Apport introuvable')
    return row as unknown as ApportEntity
  }

  private async sumRemboursements(apportId: number, db: Kysely<DB> | Transaction<DB> = this.db): Promise<number> {
    const row = await db
      .selectFrom('apport_remboursements')
      .select(sql<number>`COALESCE(SUM(montant), 0)`.as('total'))
      .where('apport_id', '=', apportId)
      .executeTakeFirst()
    return asAmount(row?.total)
  }

  private async nextReferenceBase(stamp: string): Promise<number> {
    const row = await this.db
      .selectFrom('apports')
      .select('reference')
      .where('reference', 'like', `AP-${stamp}-%`)
      .orderBy('reference', 'desc')
      .executeTakeFirst()
    if (!row?.reference) return 0
    const match = /-(\d+)$/.exec(row.reference)
    return match ? Number(match[1]) : 0
  }

  private assertType(value: ApportType): ApportType {
    if (value !== 'fonds_propres' && value !== 'dette') throw new Error('Type d’apport invalide')
    return value
  }

  private computeStatut(
    type: ApportType,
    montant: number,
    rembourse: number,
    current: ApportStatut,
  ): ApportStatut {
    if (current === 'annule') return 'annule'
    if (type === 'dette' && rembourse >= montant) return 'rembourse'
    return 'ouvert'
  }
}
