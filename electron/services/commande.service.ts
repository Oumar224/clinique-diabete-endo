import { inject, singleton } from 'tsyringe'
import { sql, type Kysely, type Transaction } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import { CommandeEntity, CommandeLigneEntity, CommandeReceptionAttachmentEntity, CommandeReceptionEntity, CommandeReceptionLigneEntity } from '../entities/commande.entity'
import type { MedicamentEntity } from '../entities/medicament.entity'
import type {
  CommandeCreateDto,
  CommandeDto,
  CommandeLigneDto,
  CommandeLigneInputDto,
  CommandeLigneSuggestionDto,
  CommandeListFiltres,
  CommandePrefillDto,
  CommandeReceptionAttachmentDto,
  CommandeReceptionAttachmentInputDto,
  CommandeReceptionAttachmentWithDataDto,
  CommandeReceptionDto,
  CommandeReceptionInputDto,
  CommandeReceptionLigneDto,
  CommandeStatut,
  CommandeUpdateDto,
  FournisseurSeriePointDto,
  FournisseursSeriesDto,
  FournisseursSeriesFiltres,
} from '../dto/commande.dto'
import { StockService } from './stock.service'
import { nowIso, todayIso } from '../utils/date-utils'
import { entityEventBus } from '../automerge/event-bus'
import { validateAttachmentInput } from '../utils/attachment-utils'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const MAX_NUMERO_ATTEMPTS = 50

interface LigneValues {
  medicamentId: number
  designation: string
  forme: string | null
  dosage: string | null
  conditionnement: string | null
  unite: string | null
  cmm: number
  stockRestant: number
  quantiteCommandee: number
  ordre: number
}

function assertDate(value: string | undefined | null, label: string): string | undefined {
  if (value == null || value === '') return undefined
  if (!DATE_RE.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    throw new Error(`${label} invalide (format YYYY-MM-DD attendu)`)
  }
  return value
}

function asInteger(value: unknown): number {
  const n = Number(value ?? 0)
  return Number.isFinite(n) ? Math.trunc(n) : 0
}

function designationOf(med: Pick<MedicamentEntity, 'dci' | 'nom_commercial'>): string {
  const dci = (med.dci ?? '').trim()
  const commercial = (med.nom_commercial ?? '').trim()
  if (dci && commercial && commercial.toLowerCase() !== dci.toLowerCase()) return `${dci} — ${commercial}`
  return dci || commercial || 'Médicament'
}

function conditionnementOf(med: MedicamentEntity): string | null {
  const explicit = (med.conditionnement ?? '').trim()
  if (explicit) return explicit
  if (med.contenance_qte != null && med.unite_contenance) return `${med.contenance_qte} ${med.unite_contenance}`
  return null
}

function monthKeys(dateDebut: string, dateFin: string): string[] {
  const [startYear, startMonth] = dateDebut.split('-').map(Number)
  const [endYear, endMonth] = dateFin.split('-').map(Number)
  const months: string[] = []
  let year = startYear
  let month = startMonth
  while (year < endYear || (year === endYear && month <= endMonth)) {
    months.push(`${year}-${String(month).padStart(2, '0')}`)
    month++
    if (month > 12) {
      month = 1
      year++
    }
  }
  return months
}

@singleton()
export class CommandeService {
  private readonly db: Kysely<DB>

  constructor(
    @inject(AppDatabaseDatasource) datasource: AppDatabaseDatasource,
    @inject(StockService) private stockService: StockService,
  ) {
    this.db = datasource.getInstance()
  }

  // ─── Lecture ────────────────────────────────────────────────────

  async list(filters: CommandeListFiltres = {}): Promise<CommandeDto[]> {
    let query = this.db
      .selectFrom('commandes')
      .leftJoin('fournisseurs', 'fournisseurs.id', 'commandes.fournisseur_id')
      .selectAll('commandes')
      .select('fournisseurs.nom as fournisseur_nom')
    if (filters.statut) query = query.where('commandes.statut', '=', filters.statut)
    if (filters.fournisseurId != null) query = query.where('commandes.fournisseur_id', '=', filters.fournisseurId)
    if (filters.dateDebut) query = query.where('commandes.date_commande', '>=', assertDate(filters.dateDebut, 'Date de début')!)
    if (filters.dateFin) query = query.where('commandes.date_commande', '<=', assertDate(filters.dateFin, 'Date de fin')!)
    const search = filters.search?.trim()
    if (search) {
      const pattern = `%${search}%`
      query = query.where((eb) => eb.or([
        eb('commandes.numero', 'like', pattern),
        eb('fournisseurs.nom', 'like', pattern),
      ]))
    }
    const rows = await query
      .orderBy('commandes.date_commande', 'desc')
      .orderBy('commandes.id', 'desc')
      .limit(500)
      .execute()
    if (rows.length === 0) return []

    const ids = rows.map((r) => Number(r.id))
    const linesByCommande = await this.linesForCommandes(ids)
    return rows.map((row) => {
      const dto = CommandeEntity.toDto(row as unknown as CommandeEntity)
      dto.fournisseurNom = (row as unknown as { fournisseur_nom?: string }).fournisseur_nom
      dto.lignes = linesByCommande.get(Number(row.id)) ?? []
      this.attachTotals(dto)
      dto.receptions = []
      return dto
    })
  }

  async getById(id: number): Promise<CommandeDto> {
    const row = await this.db
      .selectFrom('commandes')
      .leftJoin('fournisseurs', 'fournisseurs.id', 'commandes.fournisseur_id')
      .selectAll('commandes')
      .select('fournisseurs.nom as fournisseur_nom')
      .where('commandes.id', '=', id)
      .executeTakeFirst()
    if (!row) throw new Error('Bon de commande introuvable')

    const dto = CommandeEntity.toDto(row as unknown as CommandeEntity)
    dto.fournisseurNom = (row as unknown as { fournisseur_nom?: string }).fournisseur_nom
    dto.lignes = (await this.linesForCommandes([id])).get(id) ?? []
    dto.receptions = await this.receptionsForCommande(id, dto.lignes)
    this.attachTotals(dto)
    return dto
  }

  async prefill(dto: CommandePrefillDto): Promise<CommandeLigneSuggestionDto[]> {
    const ids = [...new Set((dto.medicamentIds ?? []).map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))]
    if (ids.length === 0) return []
    const dateCommande = assertDate(dto.dateCommande, 'Date de commande') ?? todayIso()
    const medicaments = await this.db
      .selectFrom('medicaments')
      .selectAll()
      .where('id', 'in', ids)
      .execute() as unknown as MedicamentEntity[]
    const byId = new Map(medicaments.map((m) => [Number(m.id), m]))
    const [cmm, stock] = await Promise.all([
      this.cmmMap(ids, dateCommande),
      this.stockRestantMap(ids),
    ])
    return ids
      .filter((id) => byId.has(id))
      .map((id) => {
        const med = byId.get(id)!
        return {
          medicamentId: id,
          designation: designationOf(med),
          forme: med.forme ?? null,
          dosage: med.dosage ?? null,
          conditionnement: conditionnementOf(med),
          unite: med.unite_stock ?? med.unite_contenance ?? null,
          cmm: cmm.get(id) ?? 0,
          stockRestant: stock.get(id) ?? 0,
        }
      })
  }

  async seriesFournisseurs(filtres: FournisseursSeriesFiltres): Promise<FournisseursSeriesDto> {
    const dateDebut = assertDate(filtres?.dateDebut, 'Date de début')
    const dateFin = assertDate(filtres?.dateFin, 'Date de fin')
    if (!dateDebut) throw new Error('Date de début requise')
    if (!dateFin) throw new Error('Date de fin requise')
    if (dateDebut > dateFin) throw new Error('La date de début doit être antérieure ou égale à la date de fin')

    const requestedIds = filtres.fournisseurIds == null
      ? undefined
      : [...new Set(filtres.fournisseurIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))]
    if (requestedIds && requestedIds.length === 0) {
      return { mois: monthKeys(dateDebut, dateFin), fournisseurs: [], commandes: [], ventes: [] }
    }

    const supplierScope = requestedIds
      ? sql`AND c.fournisseur_id IN (${sql.join(requestedIds.map((id) => sql`${id}`), sql`, `)})`
      : sql``
    const salesSupplierScope = requestedIds
      ? sql`AND sl.fournisseur_id IN (${sql.join(requestedIds.map((id) => sql`${id}`), sql`, `)})`
      : sql``

    const commandes = await sql<{ fournisseur_id: number; mois: string; quantite: number }>`
      SELECT c.fournisseur_id AS fournisseur_id,
             strftime('%Y-%m', c.date_commande) AS mois,
             COALESCE(SUM(cl.quantite_commandee), 0) AS quantite
      FROM commandes c
      INNER JOIN commande_lignes cl ON cl.commande_id = c.id
      WHERE c.date_commande >= ${dateDebut}
        AND c.date_commande <= ${dateFin}
        AND c.statut IN ('envoyee', 'partielle', 'livree', 'cloturee')
        ${supplierScope}
      GROUP BY c.fournisseur_id, strftime('%Y-%m', c.date_commande)
    `.execute(this.db)

    const ventes = await sql<{ fournisseur_id: number; mois: string; quantite: number; montant: number }>`
      SELECT sl.fournisseur_id AS fournisseur_id,
             strftime('%Y-%m', COALESCE(d.served_at, d.created_at)) AS mois,
             COALESCE(SUM(dl.quantite_servie), 0) AS quantite,
             COALESCE(SUM(dl.montant), 0) AS montant
      FROM delivrance_lignes dl
      INNER JOIN delivrances d ON d.id = dl.delivrance_id
      INNER JOIN stock_lots sl ON sl.id = dl.lot_id
      WHERE d.statut IN ('servie', 'partielle')
        AND d.type_vente = 'facturee'
        AND dl.lot_id IS NOT NULL
        AND sl.fournisseur_id IS NOT NULL
        AND date(COALESCE(d.served_at, d.created_at)) >= ${dateDebut}
        AND date(COALESCE(d.served_at, d.created_at)) <= ${dateFin}
        ${salesSupplierScope}
      GROUP BY sl.fournisseur_id, strftime('%Y-%m', COALESCE(d.served_at, d.created_at))
    `.execute(this.db)

    const supplierIds = requestedIds ?? [...new Set([
      ...commandes.rows.map((row) => Number(row.fournisseur_id)),
      ...ventes.rows.map((row) => Number(row.fournisseur_id)),
    ])]
    const fournisseurs = supplierIds.length === 0
      ? []
      : await this.db
        .selectFrom('fournisseurs')
        .select(['id', 'nom'])
        .where('id', 'in', supplierIds)
        .orderBy('nom', 'asc')
        .orderBy('id', 'asc')
        .execute()
    const activeIds = new Set(fournisseurs.map((f) => Number(f.id)))
    const mois = monthKeys(dateDebut, dateFin)

    const orderMap = new Map<string, number>()
    for (const row of commandes.rows) {
      const id = Number(row.fournisseur_id)
      if (!activeIds.has(id)) continue
      orderMap.set(`${id}|${row.mois}`, (orderMap.get(`${id}|${row.mois}`) ?? 0) + asInteger(row.quantite))
    }
    const saleMap = new Map<string, { quantite: number; montant: number }>()
    for (const row of ventes.rows) {
      const id = Number(row.fournisseur_id)
      if (!activeIds.has(id)) continue
      const key = `${id}|${row.mois}`
      const existing = saleMap.get(key) ?? { quantite: 0, montant: 0 }
      existing.quantite += asInteger(row.quantite)
      existing.montant += Number(row.montant ?? 0)
      saleMap.set(key, existing)
    }

    const commandesSeries: FournisseurSeriePointDto[] = []
    const ventesSeries: FournisseurSeriePointDto[] = []
    for (const fournisseur of fournisseurs) {
      const id = Number(fournisseur.id)
      for (const moisKey of mois) {
        commandesSeries.push({ fournisseurId: id, mois: moisKey, quantite: orderMap.get(`${id}|${moisKey}`) ?? 0 })
        const sale = saleMap.get(`${id}|${moisKey}`) ?? { quantite: 0, montant: 0 }
        ventesSeries.push({ fournisseurId: id, mois: moisKey, quantite: sale.quantite, montant: sale.montant })
      }
    }

    return {
      mois,
      fournisseurs: fournisseurs.map((f) => ({ id: Number(f.id), nom: f.nom ?? '' })),
      commandes: commandesSeries,
      ventes: ventesSeries,
    }
  }

  // ─── Écriture ───────────────────────────────────────────────────

  async create(dto: CommandeCreateDto): Promise<CommandeDto> {
    if (!dto?.fournisseurId) throw new Error('Fournisseur requis')
    const fournisseur = await this.getActiveFournisseur(dto.fournisseurId)
    const dateCommande = assertDate(dto.dateCommande, 'Date de commande') ?? todayIso()
    const datePrevue = assertDate(dto.datePrevue, 'Date prévue')
    if (datePrevue && datePrevue < dateCommande) throw new Error('La date prévue doit être postérieure à la date de commande')
    const lignes = await this.buildLignes(dto.lignes, dateCommande)
    const stamp = dateCommande.replace(/-/g, '')
    const base = await this.nextNumeroBase(stamp)

    let lastError: unknown
    for (let attempt = 0; attempt < MAX_NUMERO_ATTEMPTS; attempt++) {
      const numero = `BC-${stamp}-${String(base + attempt + 1).padStart(4, '0')}`
      try {
        const id = await this.db.transaction().execute(async (trx) => {
          const inserted = await trx
            .insertInto('commandes')
            .values({
              numero,
              fournisseur_id: fournisseur.id!,
              date_commande: dateCommande,
              date_prevue: datePrevue ?? null,
              periode: dto.periode?.trim() || null,
              urgence: dto.urgence ? 1 : 0,
              statut: 'brouillon',
              notes: dto.notes?.trim() || null,
              created_by: dto.createdBy,
              created_at: nowIso(),
              updated_at: nowIso(),
            })
            .returning('id')
            .executeTakeFirstOrThrow()
          await this.insertLignes(trx, Number(inserted.id), lignes)
          return Number(inserted.id)
        })
        const created = await this.getById(id)
        entityEventBus.emitEntityChange({ entityType: 'commande', action: 'created', id, entity: created, source: 'local', timestamp: Date.now() })
        return created
      } catch (error) {
        lastError = error
        const message = error instanceof Error ? error.message : String(error)
        if (!message.includes('UNIQUE') || !message.includes('commandes.numero')) throw error
      }
    }
    throw lastError instanceof Error ? lastError : new Error('Impossible de générer un numéro de bon de commande')
  }

  async update(id: number, dto: CommandeUpdateDto): Promise<CommandeDto> {
    const existing = await this.getEntity(id)
    if (existing.statut !== 'brouillon') throw new Error('Seul un bon en brouillon peut être modifié')

    const dateCommande = assertDate(dto.dateCommande, 'Date de commande') ?? (existing.date_commande as string)
    const datePrevue = dto.datePrevue !== undefined ? assertDate(dto.datePrevue, 'Date prévue') : (existing.date_prevue as string | null | undefined) ?? null
    if (datePrevue && datePrevue < dateCommande) throw new Error('La date prévue doit être postérieure à la date de commande')
    if (dto.fournisseurId !== undefined) await this.getActiveFournisseur(dto.fournisseurId)

    let lignes: LigneValues[]
    if (dto.lignes !== undefined) {
      lignes = await this.buildLignes(dto.lignes, dateCommande)
    } else if (dto.dateCommande !== undefined) {
      const current = await this.linesForCommandes([id])
      const inputs: CommandeLigneInputDto[] = (current.get(id) ?? []).map((l) => ({
        medicamentId: l.medicamentId!,
        cmm: l.cmm,
        stockRestant: l.stockRestant,
        quantiteCommandee: l.quantiteCommandee!,
      }))
      lignes = await this.buildLignes(inputs, dateCommande)
    } else {
      lignes = []
    }

    await this.db.transaction().execute(async (trx) => {
      const values: Record<string, unknown> = { updated_at: nowIso() }
      if (dto.fournisseurId !== undefined) values.fournisseur_id = dto.fournisseurId
      if (dto.dateCommande !== undefined) values.date_commande = dateCommande
      if (dto.datePrevue !== undefined) values.date_prevue = datePrevue ?? null
      if (dto.periode !== undefined) values.periode = dto.periode?.trim() || null
      if (dto.urgence !== undefined) values.urgence = dto.urgence ? 1 : 0
      if (dto.notes !== undefined) values.notes = dto.notes?.trim() || null
      // Garde dans la transaction : le statut peut avoir changé entre la
      // lecture initiale et l'écriture (envoi/clôture concurrents).
      const updated = await trx
        .updateTable('commandes')
        .set(values as never)
        .where('id', '=', id)
        .where('statut', '=', 'brouillon')
        .returning('id')
        .executeTakeFirst()
      if (!updated) throw new Error('Seul un bon en brouillon peut être modifié')
      if (lignes.length > 0) {
        await trx.deleteFrom('commande_lignes').where('commande_id', '=', id).execute()
        await this.insertLignes(trx, id, lignes)
      }
    })

    const updated = await this.getById(id)
    entityEventBus.emitEntityChange({ entityType: 'commande', action: 'updated', id, entity: updated, source: 'local', timestamp: Date.now() })
    return updated
  }

  async envoyer(id: number): Promise<CommandeDto> {
    const updated = await this.db
      .updateTable('commandes')
      .set({ statut: 'envoyee', updated_at: nowIso() })
      .where('id', '=', id)
      .where('statut', '=', 'brouillon')
      .returning('id')
      .executeTakeFirst()
    if (!updated) throw new Error('Seul un bon en brouillon peut être envoyé')
    return this.getById(id)
  }

  async receptionner(id: number, dto: CommandeReceptionInputDto): Promise<CommandeDto> {
    const commande = await this.getById(id)
    if (commande.statut !== 'envoyee' && commande.statut !== 'partielle') {
      throw new Error('Ce bon ne peut pas être réceptionné dans son état actuel')
    }
    const dateReception = assertDate(dto.dateReception, 'Date de réception') ?? todayIso()
    const refBl = dto.refBl?.trim() || undefined
    if (refBl && refBl.length > 100) throw new Error('La référence BL ne doit pas dépasser 100 caractères')
    if (!dto.lignes?.length) throw new Error('Au moins une ligne reçue est requise')

    const linesById = new Map((commande.lignes ?? []).map((l) => [Number(l.id), l]))
    const seen = new Set<number>()
    const prepared = dto.lignes.map((line) => {
      const commandeLigneId = Number(line.commandeLigneId)
      const commandeLigne = linesById.get(commandeLigneId)
      if (!commandeLigne) throw new Error(`Ligne de commande ${commandeLigneId} introuvable sur ce bon`)
      if (seen.has(commandeLigneId)) throw new Error('Une ligne de commande ne peut être réceptionnée qu’une fois par réception')
      seen.add(commandeLigneId)
      const quantite = asInteger(line.quantiteRecue)
      if (quantite <= 0) throw new Error('La quantité reçue doit être supérieure à zéro')
      const reste = Math.max(0, (commandeLigne.quantiteCommandee ?? 0) - (commandeLigne.quantiteLivree ?? 0))
      if (quantite > reste) throw new Error(`Quantité reçue supérieure au reste à livrer pour « ${commandeLigne.designation} » (reste ${reste})`)
      const datePeremption = assertDate(line.datePeremption, 'Date de péremption')
      return { commandeLigne, quantite, numeroLot: line.numeroLot?.trim() || undefined, datePeremption }
    })
    const attachments = (dto.attachments ?? []).map((a) => validateAttachmentInput(a))

    await this.db.transaction().execute(async (trx) => {
      const current = await trx
        .selectFrom('commandes')
        .select(['id', 'statut', 'fournisseur_id'])
        .where('id', '=', id)
        .executeTakeFirst()
      if (!current || (current.statut !== 'envoyee' && current.statut !== 'partielle')) {
        throw new Error('Ce bon ne peut pas être réceptionné dans son état actuel')
      }

      const reception = await trx
        .insertInto('commande_receptions')
        .values({
          commande_id: id,
          date_reception: dateReception,
          ref_bl: refBl ?? null,
          notes: dto.notes?.trim() || null,
          created_by: dto.createdBy,
          created_at: nowIso(),
        })
        .returning('id')
        .executeTakeFirstOrThrow()
      const receptionId = Number(reception.id)

      for (const line of prepared) {
        await trx
          .insertInto('commande_reception_lignes')
          .values({
            reception_id: receptionId,
            commande_ligne_id: line.commandeLigne.id!,
            quantite_recue: line.quantite,
            created_at: nowIso(),
          })
          .execute()
        const updatedLine = await trx
          .updateTable('commande_lignes')
          .set({ quantite_livree: sql<number>`quantite_livree + ${line.quantite}` })
          .where('id', '=', line.commandeLigne.id!)
          .where(sql<boolean>`quantite_livree + ${line.quantite} <= quantite_commandee`)
          .executeTakeFirst()
        if (Number(updatedLine.numUpdatedRows) !== 1) {
          throw new Error(`Quantité reçue supérieure au reste à livrer pour « ${line.commandeLigne.designation} »`)
        }
        await this.stockService.entreeTx(trx, {
          medicamentId: line.commandeLigne.medicamentId!,
          quantite: line.quantite,
          numeroLot: line.numeroLot,
          datePeremption: line.datePeremption,
          dateEntree: dateReception,
          userId: dto.createdBy,
          fournisseurId: Number(current.fournisseur_id),
          // Prix explicitement nul : la réception d'un bon ne crée jamais de dépense.
          prixAchat: null,
          refBl,
          commandeReceptionId: receptionId,
        })
      }

      for (const attachment of attachments) {
        await trx
          .insertInto('commande_reception_attachments')
          .values({
            reception_id: receptionId,
            file_name: attachment.fileName,
            file_type: attachment.fileType,
            file_size: attachment.fileSize,
            file_data: attachment.fileData,
            uploaded_by: dto.createdBy,
            created_at: nowIso(),
          })
          .execute()
      }

      const remaining = await trx
        .selectFrom('commande_lignes')
        .select(sql<number>`COALESCE(SUM(MAX(0, quantite_commandee - quantite_livree)), 0)`.as('total'))
        .where('commande_id', '=', id)
        .executeTakeFirst()
      const statut: CommandeStatut = asInteger(remaining?.total) <= 0 ? 'livree' : 'partielle'
      await trx
        .updateTable('commandes')
        .set({ statut, updated_at: nowIso() })
        .where('id', '=', id)
        .execute()
    })

    const updated = await this.getById(id)
    entityEventBus.emitEntityChange({ entityType: 'commande', action: 'updated', id, entity: updated, source: 'local', timestamp: Date.now() })
    entityEventBus.emitEntityChange({ entityType: 'stock_lot', action: 'updated', id, entity: null, source: 'local', timestamp: Date.now() })
    return updated
  }

  async cloturer(id: number): Promise<CommandeDto> {
    const updated = await this.db
      .updateTable('commandes')
      .set({ statut: 'cloturee', updated_at: nowIso() })
      .where('id', '=', id)
      .where('statut', 'in', ['envoyee', 'partielle', 'livree'])
      .returning('id')
      .executeTakeFirst()
    if (!updated) throw new Error('Ce bon ne peut pas être clôturé dans son état actuel')
    return this.getById(id)
  }

  async annuler(id: number): Promise<CommandeDto> {
    const updated = await this.db
      .updateTable('commandes')
      .set({ statut: 'annulee', updated_at: nowIso() })
      .where('id', '=', id)
      .where('statut', 'in', ['brouillon', 'envoyee'])
      .returning('id')
      .executeTakeFirst()
    if (!updated) throw new Error('Ce bon ne peut pas être annulé dans son état actuel')
    return this.getById(id)
  }

  async delete(id: number): Promise<void> {
    const existing = await this.getEntity(id)
    if (!existing || (existing.statut !== 'brouillon' && existing.statut !== 'annulee')) {
      throw new Error('Seul un bon en brouillon ou annulé peut être supprimé')
    }
    await this.db.deleteFrom('commandes').where('id', '=', id).execute()
  }

  // ─── Pièces jointes de réception ────────────────────────────────

  async listReceptionAttachments(receptionId: number): Promise<CommandeReceptionAttachmentDto[]> {
    await this.assertReceptionExists(receptionId)
    const rows = await this.db
      .selectFrom('commande_reception_attachments')
      .select(['id', 'reception_id', 'file_name', 'file_type', 'file_size', 'uploaded_by', 'created_at'])
      .where('reception_id', '=', receptionId)
      .orderBy('created_at', 'desc')
      .orderBy('id', 'desc')
      .execute()
    return CommandeReceptionAttachmentEntity.toDtos(rows as unknown as CommandeReceptionAttachmentEntity[])
  }

  async getReceptionAttachment(receptionId: number, id: number): Promise<CommandeReceptionAttachmentDto> {
    await this.assertReceptionExists(receptionId)
    const row = await this.db
      .selectFrom('commande_reception_attachments')
      .select(['id', 'reception_id', 'file_name', 'file_type', 'file_size', 'uploaded_by', 'created_at'])
      .where('id', '=', id)
      .where('reception_id', '=', receptionId)
      .executeTakeFirst()
    if (!row) throw new Error('Pièce jointe introuvable')
    return CommandeReceptionAttachmentEntity.toDto(row as unknown as CommandeReceptionAttachmentEntity)
  }

  async downloadReceptionAttachment(receptionId: number, id: number): Promise<CommandeReceptionAttachmentWithDataDto> {
    await this.assertReceptionExists(receptionId)
    const row = await this.db
      .selectFrom('commande_reception_attachments')
      .selectAll()
      .where('id', '=', id)
      .where('reception_id', '=', receptionId)
      .executeTakeFirst()
    if (!row) throw new Error('Pièce jointe introuvable')
    const entity = row as unknown as CommandeReceptionAttachmentEntity
    return { ...CommandeReceptionAttachmentEntity.toDto(entity), fileData: entity.file_data }
  }

  async createReceptionAttachment(
    receptionId: number,
    dto: CommandeReceptionAttachmentInputDto,
    userId?: number,
  ): Promise<CommandeReceptionAttachmentDto> {
    const reception = await this.assertReceptionExists(receptionId)
    if (reception.commande_id == null) throw new Error('Réception invalide')
    const validated = validateAttachmentInput(dto)
    const created = await this.db
      .insertInto('commande_reception_attachments')
      .values({
        reception_id: receptionId,
        file_name: validated.fileName,
        file_type: validated.fileType,
        file_size: validated.fileSize,
        file_data: validated.fileData,
        uploaded_by: userId,
      })
      .returningAll()
      .executeTakeFirstOrThrow()
    return CommandeReceptionAttachmentEntity.toDto(created as unknown as CommandeReceptionAttachmentEntity)
  }

  async deleteReceptionAttachment(receptionId: number, id: number): Promise<void> {
    await this.assertReceptionExists(receptionId)
    const deleted = await this.db
      .deleteFrom('commande_reception_attachments')
      .where('id', '=', id)
      .where('reception_id', '=', receptionId)
      .returning('id')
      .executeTakeFirst()
    if (!deleted) throw new Error('Pièce jointe introuvable')
  }

  // ─── Helpers ────────────────────────────────────────────────────

  private async getEntity(id: number): Promise<CommandeEntity> {
    const row = await this.db.selectFrom('commandes').selectAll().where('id', '=', id).executeTakeFirst()
    if (!row) throw new Error('Bon de commande introuvable')
    return row as unknown as CommandeEntity
  }

  private async getActiveFournisseur(id: number): Promise<{ id?: number; actif?: number }> {
    const fournisseur = await this.db
      .selectFrom('fournisseurs')
      .select(['id', 'actif'])
      .where('id', '=', id)
      .executeTakeFirst()
    if (!fournisseur) throw new Error('Fournisseur introuvable')
    if (Number(fournisseur.actif) !== 1) throw new Error('Le fournisseur est inactif')
    return fournisseur as unknown as { id?: number; actif?: number }
  }

  private async nextNumeroBase(stamp: string): Promise<number> {
    const row = await this.db
      .selectFrom('commandes')
      .select('numero')
      .where('numero', 'like', `BC-${stamp}-%`)
      .orderBy('numero', 'desc')
      .executeTakeFirst()
    if (!row?.numero) return 0
    const match = /-(\d+)$/.exec(row.numero)
    return match ? Number(match[1]) : 0
  }

  private async buildLignes(inputs: CommandeLigneInputDto[], dateCommande: string) {
    if (!inputs?.length) throw new Error('Au moins une ligne de commande est requise')
    const ids = [...new Set(inputs.map((l) => Number(l.medicamentId)).filter((id) => Number.isInteger(id) && id > 0))]
    if (ids.length === 0) throw new Error('Médicament requis sur chaque ligne')
    const medicaments = await this.db
      .selectFrom('medicaments')
      .selectAll()
      .where('id', 'in', ids)
      .execute() as unknown as MedicamentEntity[]
    const byId = new Map(medicaments.map((m) => [Number(m.id), m]))
    const [cmm, stock] = await Promise.all([
      this.cmmMap(ids, dateCommande),
      this.stockRestantMap(ids),
    ])
    return inputs.map((input, index) => {
      const medId = Number(input.medicamentId)
      const med = byId.get(medId)
      if (!med) throw new Error(`Médicament ${medId} introuvable`)
      const quantite = asInteger(input.quantiteCommandee)
      if (quantite <= 0) throw new Error(`Quantité commandée invalide pour « ${designationOf(med)} »`)
      const cmmValue = input.cmm !== undefined ? asInteger(input.cmm) : (cmm.get(medId) ?? 0)
      const stockValue = input.stockRestant !== undefined ? asInteger(input.stockRestant) : (stock.get(medId) ?? 0)
      if (cmmValue < 0) throw new Error(`CMM invalide pour « ${designationOf(med)} »`)
      if (stockValue < 0) throw new Error(`Stock restant invalide pour « ${designationOf(med)} »`)
      return this.toLigneValues({
        medicamentId: medId,
        designation: designationOf(med),
        forme: med.forme ?? null,
        dosage: med.dosage ?? null,
        conditionnement: conditionnementOf(med),
        unite: med.unite_stock ?? med.unite_contenance ?? null,
        cmm: cmmValue,
        stockRestant: stockValue,
        quantiteCommandee: quantite,
        ordre: index,
      })
    })
  }

  private toLigneValues(values: {
    medicamentId: number
    designation: string
    forme: string | null
    dosage: string | null
    conditionnement: string | null
    unite: string | null
    cmm: number
    stockRestant: number
    quantiteCommandee: number
    ordre: number
  }): LigneValues {
    return values
  }

  private async insertLignes(trx: Kysely<DB> | Transaction<DB>, commandeId: number, lignes: LigneValues[]): Promise<void> {
    for (const ligne of lignes) {
      await trx
        .insertInto('commande_lignes')
        .values({
          commande_id: commandeId,
          medicament_id: ligne.medicamentId,
          designation: ligne.designation,
          forme: ligne.forme,
          dosage: ligne.dosage,
          conditionnement: ligne.conditionnement,
          unite: ligne.unite,
          cmm: ligne.cmm,
          stock_restant: ligne.stockRestant,
          quantite_commandee: ligne.quantiteCommandee,
          quantite_livree: 0,
          ordre: ligne.ordre,
          created_at: nowIso(),
        })
        .execute()
    }
  }

  private async linesForCommandes(commandeIds: number[]): Promise<Map<number, CommandeLigneDto[]>> {
    const map = new Map<number, CommandeLigneDto[]>()
    if (commandeIds.length === 0) return map
    const rows = await this.db
      .selectFrom('commande_lignes')
      .selectAll()
      .where('commande_id', 'in', commandeIds)
      .orderBy('commande_id', 'asc')
      .orderBy('ordre', 'asc')
      .orderBy('id', 'asc')
      .execute()
    for (const row of rows) {
      const dto = CommandeLigneEntity.toDto(row as unknown as CommandeLigneEntity)
      const list = map.get(Number(row.commande_id)) ?? []
      list.push(dto)
      map.set(Number(row.commande_id), list)
    }
    return map
  }

  private async receptionsForCommande(commandeId: number, lignes: CommandeLigneDto[]): Promise<CommandeReceptionDto[]> {
    const receptions = await this.db
      .selectFrom('commande_receptions')
      .selectAll()
      .where('commande_id', '=', commandeId)
      .orderBy('date_reception', 'asc')
      .orderBy('id', 'asc')
      .execute() as unknown as CommandeReceptionEntity[]
    if (receptions.length === 0) return []
    const ids = receptions.map((r) => Number(r.id))
    const [receptionLines, attachments, lots] = await Promise.all([
      this.db
        .selectFrom('commande_reception_lignes')
        .selectAll()
        .where('reception_id', 'in', ids)
        .orderBy('id', 'asc')
        .execute() as unknown as CommandeReceptionLigneEntity[],
      this.db
        .selectFrom('commande_reception_attachments')
        .select(['id', 'reception_id', 'file_name', 'file_type', 'file_size', 'uploaded_by', 'created_at'])
        .where('reception_id', 'in', ids)
        .orderBy('created_at', 'desc')
        .orderBy('id', 'desc')
        .execute() as unknown as CommandeReceptionAttachmentEntity[],
      // Lots créés par la réception : le bon de réception doit porter le
      // numéro de lot et la péremption réellement enregistrés en stock.
      this.db
        .selectFrom('stock_lots')
        .select(['commande_reception_id', 'medicament_id', 'numero_lot', 'date_peremption'])
        .where('commande_reception_id', 'in', ids)
        .execute(),
    ])
    const lotByReceptionMedicament = new Map<string, { numeroLot: string | null; datePeremption: string | null }>()
    for (const lot of lots) {
      lotByReceptionMedicament.set(`${lot.commande_reception_id}:${lot.medicament_id}`, {
        numeroLot: lot.numero_lot ?? null,
        datePeremption: lot.date_peremption ?? null,
      })
    }
    const ligneById = new Map(lignes.map((l) => [Number(l.id), l]))
    const linesByReception = new Map<number, CommandeReceptionLigneDto[]>()
    for (const row of receptionLines) {
      const dto = CommandeReceptionLigneEntity.toDto(row)
      const source = ligneById.get(Number(row.commande_ligne_id))
      dto.medicamentId = source?.medicamentId
      dto.designation = source?.designation
      dto.forme = source?.forme ?? null
      dto.dosage = source?.dosage ?? null
      dto.conditionnement = source?.conditionnement ?? null
      dto.unite = source?.unite ?? null
      dto.cmm = source?.cmm
      dto.stockRestant = source?.stockRestant
      dto.quantiteCommandee = source?.quantiteCommandee
      dto.quantiteLivree = source?.quantiteLivree
      const lot = lotByReceptionMedicament.get(`${row.reception_id}:${source?.medicamentId}`)
      dto.numeroLot = lot?.numeroLot ?? null
      dto.datePeremption = lot?.datePeremption ?? null
      const list = linesByReception.get(Number(row.reception_id)) ?? []
      list.push(dto)
      linesByReception.set(Number(row.reception_id), list)
    }
    const attByReception = new Map<number, CommandeReceptionAttachmentDto[]>()
    for (const row of attachments) {
      const list = attByReception.get(Number(row.reception_id)) ?? []
      list.push(CommandeReceptionAttachmentEntity.toDto(row))
      attByReception.set(Number(row.reception_id), list)
    }
    return receptions.map((r) => ({
      ...CommandeReceptionEntity.toDto(r),
      lignes: linesByReception.get(Number(r.id)) ?? [],
      attachments: attByReception.get(Number(r.id)) ?? [],
    }))
  }

  private attachTotals(dto: CommandeDto): void {
    const lignes = dto.lignes ?? []
    dto.totalLignes = lignes.length
    dto.totalQuantiteCommandee = lignes.reduce((sum, l) => sum + (l.quantiteCommandee ?? 0), 0)
    dto.totalQuantiteLivree = lignes.reduce((sum, l) => sum + (l.quantiteLivree ?? 0), 0)
  }

  private async cmmMap(medicamentIds: number[], dateCommande: string): Promise<Map<number, number>> {
    const map = new Map<number, number>()
    if (medicamentIds.length === 0) return map
    const placeholders = sql.join(medicamentIds.map((id) => sql`${id}`), sql`, `)
    const result = await sql<{ medicament_id: number; total: number }>`
      SELECT dl.medicament_id AS medicament_id,
             COALESCE(SUM(dl.quantite_servie), 0) AS total
      FROM delivrance_lignes dl
      INNER JOIN delivrances d ON d.id = dl.delivrance_id
      WHERE dl.medicament_id IN (${placeholders})
        AND d.statut IN ('servie', 'partielle')
        AND date(COALESCE(d.served_at, d.created_at)) >= date(${dateCommande}, '-3 months')
        AND date(COALESCE(d.served_at, d.created_at)) <= date(${dateCommande})
      GROUP BY dl.medicament_id
    `.execute(this.db)
    for (const row of result.rows) {
      map.set(Number(row.medicament_id), Math.round(asInteger(row.total) / 3))
    }
    return map
  }

  private async stockRestantMap(medicamentIds: number[]): Promise<Map<number, number>> {
    const map = new Map<number, number>()
    if (medicamentIds.length === 0) return map
    const rows = await this.db
      .selectFrom('stock_lots')
      .select(['medicament_id'])
      .select((eb) => eb.fn.sum<number>('quantite').as('total'))
      .where('medicament_id', 'in', medicamentIds)
      .groupBy('medicament_id')
      .execute()
    for (const row of rows) map.set(Number(row.medicament_id), asInteger(row.total))
    return map
  }

  private async assertReceptionExists(id: number): Promise<CommandeReceptionEntity> {
    const row = await this.db.selectFrom('commande_receptions').selectAll().where('id', '=', id).executeTakeFirst()
    if (!row) throw new Error('Réception introuvable')
    return row as unknown as CommandeReceptionEntity
  }
}
