import { inject, singleton } from 'tsyringe'
import { type Kysely, type Transaction, sql } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import { StockLotEntity } from '../entities/stock-lot.entity'
import { MouvementStockEntity } from '../entities/mouvement-stock.entity'
import type { MouvementStockDto, MouvementStockType } from '../dto/mouvement-stock.dto'
import { MedicamentService } from './medicament.service'
import { DepenseService } from './depense.service'
import { todayIso } from '../utils/date-utils'
import { entityEventBus } from '../automerge/event-bus'
import { StockLotAttachmentEntity } from '../entities/stock-lot-attachment.entity'
import type {
  StockLotAttachmentCreateDto,
  StockLotAttachmentDto,
  StockLotAttachmentWithDataDto,
} from '../dto/stock-lot-attachment.dto'
import { validateAttachmentInput } from '../utils/attachment-utils'

type DbExecutor = Kysely<DB> | Transaction<DB>

export interface StockNiveau {
  medicamentId: number
  dci: string
  nomCommercial?: string
  uniteStock: string
  seuilAlerte: number
  stockTotal: number
  nbLots: number
  prochainePeremption?: string
  fournisseurPrincipalId?: number
  fournisseurNom?: string
  prixAchat?: number
  prixVente?: number
}

export interface AlerteLot {
  lotId: number
  medicamentId: number
  dci: string
  numeroLot?: string
  quantite: number
  datePeremption?: string
}

export interface AlertesStock {
  ruptures: StockNiveau[]
  sousSeuil: StockNiveau[]
  perimes: AlerteLot[]
  peremptionProche: AlerteLot[]
}

export type MouvementType = 'entree' | 'sortie_manuelle' | 'delivrance' | 'administration' | 'ajustement'

export function toUserId(userId?: number | string): number | undefined {
  if (typeof userId === 'number' && Number.isInteger(userId)) return userId
  if (typeof userId === 'string' && /^\d+$/.test(userId.trim())) return Number(userId.trim())
  return undefined
}

export interface StockEntreeParams {
  medicamentId: number
  quantite: number
  numeroLot?: string
  datePeremption?: string
  dateEntree?: string
  userId?: number | string
  fournisseurId?: number | null
  prixAchat?: number | null
  refBl?: string
  refFacture?: string
  /** Renseigné par une réception de bon de commande. */
  commandeReceptionId?: number | null
}

function addMonthsIso(months: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() + months)
  return d.toISOString().slice(0, 10)
}

@singleton()
export class StockService {
  public db: Kysely<DB>

  constructor(
    @inject(AppDatabaseDatasource) datasource: AppDatabaseDatasource,
    @inject(MedicamentService) private medicamentService: MedicamentService,
    @inject(DepenseService) private depenseService: DepenseService,
  ) {
    this.db = datasource.getInstance()
  }

  async niveaux(): Promise<StockNiveau[]> {
    const medicaments = await this.medicamentService.list({ actif: true })
    const lots = await this.db
      .selectFrom('stock_lots')
      .select(['medicament_id', 'quantite', 'date_peremption'])
      .execute()
    const byMedicament = new Map<number, typeof lots>()
    for (const lot of lots) {
      const list = byMedicament.get(lot.medicament_id as number) ?? []
      list.push(lot)
      byMedicament.set(lot.medicament_id as number, list)
    }
    // LEFT JOIN fournisseurs (principal) — best effort pour compat rollback
    const fournisseurNoms = new Map<number, string>()
    try {
      const ids = [...new Set(
        medicaments
          .map((m) => (m as unknown as { fournisseur_principal_id?: number | null }).fournisseur_principal_id)
          .filter((v): v is number => v != null),
      )]
      if (ids.length > 0) {
        const fours = await this.db
          .selectFrom('fournisseurs')
          .select(['id', 'nom'])
          .where('id', 'in', ids)
          .execute()
        for (const f of fours) fournisseurNoms.set(f.id as number, f.nom as string)
      }
    } catch { /* table fournisseurs absente (rollback) : niveaux sans noms */ }
    return medicaments.map((m) => {
      const actifs = (byMedicament.get(m.id!) ?? []).filter((l) => (l.quantite as number) > 0)
      const stockTotal = actifs.reduce((sum, l) => sum + (l.quantite as number), 0)
      const peremptions = actifs
        .map((l) => l.date_peremption as string | null)
        .filter((d): d is string => !!d)
        .sort()
      const mm = m as unknown as Record<string, unknown>
      const principalId = mm['fournisseur_principal_id'] as number | undefined
      return {
        medicamentId: m.id!,
        dci: m.dci!,
        nomCommercial: m.nom_commercial ?? undefined,
        uniteStock: m.unite_stock ?? 'cp',
        seuilAlerte: m.seuil_alerte ?? 0,
        stockTotal,
        nbLots: actifs.length,
        prochainePeremption: peremptions[0],
        fournisseurPrincipalId: principalId ?? undefined,
        fournisseurNom: principalId != null ? fournisseurNoms.get(principalId) : undefined,
        prixAchat: (mm['prix_achat'] as number | undefined) ?? undefined,
        prixVente: (mm['prix_vente'] as number | undefined) ?? undefined,
      }
    })
  }

  async lots(medicamentId: number): Promise<StockLotEntity[]> {
    let rows: Array<Record<string, unknown>>
    try {
      rows = await this.db
        .selectFrom('stock_lots')
        .leftJoin('fournisseurs', 'fournisseurs.id', 'stock_lots.fournisseur_id')
        .selectAll('stock_lots')
        .select('fournisseurs.nom as fournisseur_nom')
        .where('medicament_id', '=', medicamentId)
        .orderBy('date_peremption', (ob) => ob.asc().nullsLast())
        .orderBy('id', 'asc')
        .execute() as unknown as Array<Record<string, unknown>>
    } catch {
      // Compat rollback (colonnes/jointure absentes) : requête simple
      rows = await this.db
        .selectFrom('stock_lots')
        .selectAll()
        .where('medicament_id', '=', medicamentId)
        .orderBy('date_peremption', (ob) => ob.asc().nullsLast())
        .orderBy('id', 'asc')
        .execute() as unknown as Array<Record<string, unknown>>
    }
    const counts = await this.lotAttachmentCounts(rows.map((r) => Number(r.id)))
    for (const row of rows) row.attachments_count = counts.get(Number(row.id)) ?? 0
    return rows as unknown as StockLotEntity[]
  }

  private async lotAttachmentCounts(lotIds: number[]): Promise<Map<number, number>> {
    const counts = new Map<number, number>()
    if (lotIds.length === 0) return counts
    try {
      const rows = await this.db
        .selectFrom('stock_lot_attachments')
        .select(['stock_lot_id'])
        .select((eb) => eb.fn.countAll<number>().as('n'))
        .where('stock_lot_id', 'in', lotIds)
        .groupBy('stock_lot_id')
        .execute()
      for (const row of rows) counts.set(Number(row.stock_lot_id), Number(row.n ?? 0))
    } catch {
      // Table absente (base antérieure à 116) : pas de compteur.
    }
    return counts
  }

  async listLotAttachments(stockLotId: number): Promise<StockLotAttachmentDto[]> {
    await this.assertLotExists(stockLotId)
    const rows = await this.db
      .selectFrom('stock_lot_attachments')
      .select(['id', 'stock_lot_id', 'file_name', 'file_type', 'file_size', 'uploaded_by', 'created_at'])
      .where('stock_lot_id', '=', stockLotId)
      .orderBy('created_at', 'desc')
      .orderBy('id', 'desc')
      .execute()
    return StockLotAttachmentEntity.toDtos(rows as unknown as StockLotAttachmentEntity[])
  }

  async getLotAttachment(stockLotId: number, id: number): Promise<StockLotAttachmentDto> {
    await this.assertLotExists(stockLotId)
    const row = await this.db
      .selectFrom('stock_lot_attachments')
      .select(['id', 'stock_lot_id', 'file_name', 'file_type', 'file_size', 'uploaded_by', 'created_at'])
      .where('id', '=', id)
      .where('stock_lot_id', '=', stockLotId)
      .executeTakeFirst()
    if (!row) throw new Error('Pièce jointe introuvable')
    return StockLotAttachmentEntity.toDto(row as unknown as StockLotAttachmentEntity)
  }

  async downloadLotAttachment(stockLotId: number, id: number): Promise<StockLotAttachmentWithDataDto> {
    await this.assertLotExists(stockLotId)
    const row = await this.db
      .selectFrom('stock_lot_attachments')
      .selectAll()
      .where('id', '=', id)
      .where('stock_lot_id', '=', stockLotId)
      .executeTakeFirst()
    if (!row) throw new Error('Pièce jointe introuvable')
    return StockLotAttachmentEntity.toDtoWithData(row as unknown as StockLotAttachmentEntity)
  }

  async createLotAttachment(dto: StockLotAttachmentCreateDto): Promise<StockLotAttachmentDto> {
    await this.assertLotExists(dto.stockLotId)
    const validated = validateAttachmentInput(dto)
    const created = await this.db
      .insertInto('stock_lot_attachments')
      .values({
        stock_lot_id: dto.stockLotId,
        file_name: validated.fileName,
        file_type: validated.fileType,
        file_size: validated.fileSize,
        file_data: validated.fileData,
        uploaded_by: dto.uploadedBy,
      })
      .returningAll()
      .executeTakeFirstOrThrow()
    return StockLotAttachmentEntity.toDto(created as unknown as StockLotAttachmentEntity)
  }

  async deleteLotAttachment(stockLotId: number, id: number): Promise<void> {
    await this.assertLotExists(stockLotId)
    const deleted = await this.db
      .deleteFrom('stock_lot_attachments')
      .where('id', '=', id)
      .where('stock_lot_id', '=', stockLotId)
      .returning('id')
      .executeTakeFirst()
    if (!deleted) throw new Error('Pièce jointe introuvable')
  }

  private async assertLotExists(stockLotId: number, db: DbExecutor = this.db): Promise<void> {
    if (!Number.isInteger(stockLotId) || stockLotId <= 0) throw new Error('Lot invalide')
    const lot = await db
      .selectFrom('stock_lots')
      .select('id')
      .where('id', '=', stockLotId)
      .executeTakeFirst()
    if (!lot) throw new Error('Lot introuvable')
  }

  async mouvements(filters?: {
    medicamentId?: number
    type?: MouvementStockType
    limit?: number
    offset?: number
  }): Promise<Array<MouvementStockDto & { medicamentLabel: string }>> {
    const limit = Math.min(Math.max(Math.floor(filters?.limit ?? 100), 1), 500)
    const offset = Math.max(Math.floor(filters?.offset ?? 0), 0)
    let query = this.db
      .selectFrom('mouvements_stock')
      .leftJoin('medicaments', 'medicaments.id', 'mouvements_stock.medicament_id')
      .selectAll('mouvements_stock')
      .select(['medicaments.dci as dci', 'medicaments.dosage as dosage'])
    if (filters?.medicamentId != null) {
      query = query.where('mouvements_stock.medicament_id', '=', filters.medicamentId)
    }
    if (filters?.type) {
      query = query.where('mouvements_stock.type', '=', filters.type)
    }
    const mouvements = await query
      .orderBy('mouvements_stock.created_at', 'desc')
      .orderBy('mouvements_stock.id', 'desc')
      .limit(limit)
      .offset(offset)
      .execute()
    return mouvements.map((r) => {
      const { dci, dosage, ...mouvement } = r
      const label = dci ? `${dci}${dosage ? ` ${dosage}` : ''}` : `#${mouvement.medicament_id}`
      return { ...MouvementStockEntity.toDto(mouvement as unknown as MouvementStockEntity), medicamentLabel: label as string }
    })
  }

  async entree(params: StockEntreeParams): Promise<StockLotEntity> {
    const result = await this.db.transaction().execute((trx) => this.entreeTx(trx, params))
    entityEventBus.emitEntityChange({ entityType: 'stock_lot', action: 'created', id: result.id!, entity: result, source: 'local', timestamp: Date.now() })
    return result
  }

  /**
   * Entrée de stock exécutée DANS une transaction existante.
   *
   * Utilisée par la réception d'un bon de commande : le lot, le mouvement et
   * la mise à jour de la ligne de commande doivent être atomiques. Aucun
   * événement n'est émis ici (l'appelant décide quand publier).
   */
  async entreeTx(trx: Transaction<DB>, params: StockEntreeParams): Promise<StockLotEntity> {
    // Lecture dans la transaction courante : le snapshot prix/fournisseur doit
    // être cohérent avec les écritures qui suivent (pas de lecture hors trx).
    const medicament = await trx
      .selectFrom('medicaments')
      .select(['id', 'dci', 'nom_commercial', 'prix_achat', 'fournisseur_principal_id'])
      .where('id', '=', params.medicamentId)
      .executeTakeFirst()
    if (!medicament) throw new Error('Médicament introuvable')
    const quantite = Math.floor(params.quantite)
    if (!Number.isFinite(quantite) || quantite <= 0) throw new Error('Quantité invalide')
    if (params.datePeremption && !/^\d{4}-\d{2}-\d{2}$/.test(params.datePeremption)) {
      throw new Error('Date de péremption invalide (format attendu AAAA-MM-JJ)')
    }
    if (params.dateEntree && !/^\d{4}-\d{2}-\d{2}$/.test(params.dateEntree)) {
      throw new Error('Date d\u2019entrée invalide (format attendu AAAA-MM-JJ)')
    }

    // Phase 1 — traçabilité lot : héritage principal + snapshot catalogue
    const medAny = medicament as unknown as Record<string, unknown>
    const fournisseurId = params.fournisseurId !== undefined ? params.fournisseurId : (medAny['fournisseur_principal_id'] as number | null | undefined) ?? undefined
    if (fournisseurId != null) {
      let four: { actif?: number } | undefined
      try {
        four = await trx
          .selectFrom('fournisseurs')
          .select(['actif'])
          .where('id', '=', fournisseurId)
          .executeTakeFirst() as unknown as { actif?: number } | undefined
      } catch {
        throw new Error('Fournisseur introuvable')
      }
      if (!four) throw new Error('Fournisseur introuvable')
      // Une réception de bon de commande peut concerner un fournisseur
      // désactivé entre l'émission et la livraison : on conserve la
      // traçabilité du bon plutôt que de bloquer la réception.
      if (params.commandeReceptionId == null && Number((four as unknown as { actif: number }).actif) !== 1) {
        throw new Error('Le fournisseur est inactif')
      }
    }
    let prixAchat: number | undefined
    const prixSource = params.prixAchat !== undefined ? params.prixAchat : (medAny['prix_achat'] as number | null | undefined) ?? undefined
    if (prixSource != null) {
      if (typeof prixSource !== 'number' || !Number.isFinite(prixSource) || prixSource < 0) {
        throw new Error("Le prix d'achat doit être positif ou nul")
      }
      prixAchat = Math.round(prixSource * 100) / 100
    }
    const refBl = params.refBl?.trim() || undefined
    const refFacture = params.refFacture?.trim() || undefined
    if (refBl !== undefined && refBl.length > 100) throw new Error('La référence BL ne doit pas dépasser 100 caractères')
    if (refFacture !== undefined && refFacture.length > 100) throw new Error('La référence facture ne doit pas dépasser 100 caractères')

    const stockAvant = await this.stockTotalFor(medicament.id!, trx)
    const numeroLot = params.numeroLot?.trim() || undefined
    // Un numéro de lot n'est unique que dans le périmètre d'un fournisseur et
    // d'une réception. Ne jamais fusionner deux lots de provenances distinctes.
    let lot = numeroLot
      ? await trx
        .selectFrom('stock_lots')
        .selectAll()
        .where('medicament_id', '=', medicament.id!)
        .where('numero_lot', '=', numeroLot)
        .where('fournisseur_id', 'is', fournisseurId ?? null)
        .where('commande_reception_id', 'is', params.commandeReceptionId ?? null)
        .executeTakeFirst()
      : undefined
    if (lot) {
      if (params.datePeremption && params.datePeremption !== (lot.date_peremption as string | null)) {
        throw new Error(`Lot ${numeroLot} : péremption différente (${lot.date_peremption ?? 'non renseignée'} en stock, ${params.datePeremption} fournie)`)
      }
      lot = await trx
        .updateTable('stock_lots')
        .set({
          quantite: (lot.quantite as number) + quantite,
          // quantite_initiale = cumul de tout ce qui est entré sur ce lot
          quantite_initiale: (lot.quantite_initiale as number) + quantite,
        })
        .where('id', '=', lot.id!)
        .returningAll()
        .executeTakeFirstOrThrow()
    } else {
      // Requêtes conditionnelles : ne pas inclure la clé si undefined (compat rollback sans 104)
      const values: Record<string, unknown> = {
        medicament_id: medicament.id!,
        numero_lot: numeroLot,
        quantite,
        quantite_initiale: quantite,
        date_peremption: params.datePeremption || undefined,
        date_entree: params.dateEntree || todayIso(),
      }
      if (fournisseurId !== undefined) values.fournisseur_id = fournisseurId
      if (prixAchat !== undefined) values.prix_achat = prixAchat
      if (refBl !== undefined) values.ref_bl = refBl
      if (refFacture !== undefined) values.ref_facture = refFacture
      if (params.commandeReceptionId != null) values.commande_reception_id = params.commandeReceptionId
      lot = await trx
        .insertInto('stock_lots')
        .values(values as never)
        .returningAll()
        .executeTakeFirstOrThrow()
    }
    const mouvementId = await this.insertMouvement(trx, {
      medicamentId: medicament.id!,
      lotId: lot.id!,
      type: 'entree',
      quantite,
      stockAvant,
      stockApres: stockAvant + quantite,
      userId: toUserId(params.userId),
    })

    // Dépense d'achat pharmacie : uniquement si une facture est fournie et
    // que le prix d'achat est exploitable. Créée en crédit (à payer).
    const montantAchat = prixAchat != null ? Math.round(prixAchat * quantite) : 0
    if (refFacture !== undefined && montantAchat > 0) {
      const libelleParts = [medicament.dci]
      if (medicament.nom_commercial) libelleParts.push(medicament.nom_commercial)
      const libelle = `Achat ${libelleParts.join(' ')}${numeroLot ? ` - lot ${numeroLot}` : ''}`
      await this.depenseService.createFromStockEntry(trx, {
        date: params.dateEntree ?? todayIso(),
        libelle,
        montant: montantAchat,
        fournisseurId: fournisseurId ?? null,
        reference: refFacture,
        sourceId: mouvementId,
        createdBy: toUserId(params.userId),
        statutPaiement: 'credit',
      })
    }

    return lot as unknown as StockLotEntity
  }

  async sortieManuelle(params: {
    medicamentId: number
    quantite: number
    motif: string
    userId?: number | string
  }): Promise<Array<{ lotId: number; quantite: number }>> {
    const medicament = await this.medicamentService.getById(params.medicamentId)
    if (!medicament) throw new Error('Médicament introuvable')
    const quantite = Math.floor(params.quantite)
    if (!Number.isFinite(quantite) || quantite <= 0) throw new Error('Quantité invalide')
    if (!params.motif?.trim()) throw new Error('Motif requis pour une sortie manuelle')
    const lignes = await this.db.transaction().execute(async (trx) => {
      const stockAvant = await this.stockTotalFor(medicament.id!, trx)
      if (stockAvant < quantite) {
        throw new Error(`Stock insuffisant pour « ${medicament.dci} » (demandé ${quantite}, disponible ${stockAvant})`)
      }
      return this.consumeFifo(trx, {
        medicamentId: medicament.id!,
        quantite,
        type: 'sortie_manuelle',
        motif: params.motif.trim(),
        userId: toUserId(params.userId),
      })
    })
    entityEventBus.emitEntityChange({ entityType: 'stock_lot', action: 'updated', id: medicament.id!, entity: null, source: 'local', timestamp: Date.now() })
    return lignes.map(({ lotId, quantite }) => ({ lotId, quantite }))
  }

  async ajustement(params: {
    medicamentId: number
    lotId?: number
    quantiteNouvelle: number
    motif: string
    userId?: number | string
  }): Promise<StockLotEntity> {
    const medicament = await this.medicamentService.getById(params.medicamentId)
    if (!medicament) throw new Error('Médicament introuvable')
    const quantiteNouvelle = Math.floor(params.quantiteNouvelle)
    if (!Number.isFinite(quantiteNouvelle) || quantiteNouvelle < 0) throw new Error('Quantité invalide')
    if (!params.motif?.trim()) throw new Error('Motif requis pour un ajustement')

    const result = await this.db.transaction().execute(async (trx) => {
      let lot = params.lotId != null
        ? await trx.selectFrom('stock_lots').selectAll().where('id', '=', params.lotId).executeTakeFirst()
        : undefined
      if (!lot) {
        const actifs = await trx
          .selectFrom('stock_lots')
          .selectAll()
          .where('medicament_id', '=', medicament.id!)
          .where('quantite', '>', 0)
          .orderBy('date_peremption', (ob) => ob.asc().nullsLast())
          .orderBy('id', 'asc')
          .execute()
        if (actifs.length === 0) throw new Error('Aucun lot à ajuster pour ce médicament')
        if (actifs.length > 1 && params.lotId == null) throw new Error('Plusieurs lots existent : précisez le lot à ajuster (lotId)')
        lot = actifs[0]
      }
      if ((lot.medicament_id as number) !== medicament.id!) throw new Error('Lot invalide pour ce médicament')
      const stockAvant = await this.stockTotalFor(medicament.id!, trx)
      const delta = quantiteNouvelle - (lot.quantite as number)
      const updated = await trx
        .updateTable('stock_lots')
        .set({ quantite: quantiteNouvelle })
        .where('id', '=', lot.id!)
        .returningAll()
        .executeTakeFirstOrThrow()
      await this.insertMouvement(trx, {
        medicamentId: medicament.id!,
        lotId: lot.id!,
        type: 'ajustement',
        quantite: delta,
        stockAvant,
        stockApres: stockAvant + delta,
        motif: params.motif.trim(),
        userId: toUserId(params.userId),
      })
      return updated as unknown as StockLotEntity
    })
    entityEventBus.emitEntityChange({ entityType: 'stock_lot', action: 'updated', id: result.id!, entity: result, source: 'local', timestamp: Date.now() })
    return result
  }

  async alertes(params?: { peremptionMois?: number }): Promise<AlertesStock> {
    const peremptionMois = params?.peremptionMois ?? 3
    const niveaux = await this.niveaux()
    const ruptures = niveaux.filter((n) => n.stockTotal === 0)
    const sousSeuil = niveaux.filter((n) => n.stockTotal > 0 && n.stockTotal <= n.seuilAlerte)
    const today = todayIso()
    const cutoff = addMonthsIso(peremptionMois > 0 ? peremptionMois : 3)
    const lots = await this.db
      .selectFrom('stock_lots')
      .innerJoin('medicaments', 'medicaments.id', 'stock_lots.medicament_id')
      .select([
        'stock_lots.id as lotId',
        'stock_lots.medicament_id as medicamentId',
        'medicaments.dci as dci',
        'stock_lots.numero_lot as numeroLot',
        'stock_lots.quantite as quantite',
        'stock_lots.date_peremption as datePeremption',
      ])
      .where('stock_lots.quantite', '>', 0)
      .where('stock_lots.date_peremption', 'is not', null)
      .execute()
    const toAlerte = (l: (typeof lots)[number]): AlerteLot => ({
      lotId: l.lotId as number,
      medicamentId: l.medicamentId as number,
      dci: l.dci as string,
      numeroLot: (l.numeroLot as string | null) ?? undefined,
      quantite: l.quantite as number,
      datePeremption: l.datePeremption as string | undefined,
    })
    const perimes = lots.filter((l) => (l.datePeremption as string) < today).map(toAlerte)
    const peremptionProche = lots
      .filter((l) => (l.datePeremption as string) >= today && (l.datePeremption as string) < cutoff)
      .map(toAlerte)
    return { ruptures, sousSeuil, perimes, peremptionProche }
  }

  async administration(params: {
    libelle: string
    planSoinsItemId: number
    quantite?: number
    userId?: number | string
  }): Promise<{ medicamentId: number; lignes: Array<{ lotId: number; quantite: number }> } | null> {
    const medicament = await this.medicamentService.findByName(params.libelle)
    if (!medicament) return null
    const quantite = Math.floor(params.quantite ?? 1)
    if (!Number.isFinite(quantite) || quantite <= 0) return null
    const lignes = await this.db.transaction().execute(async (trx) => {
      const stockAvant = await this.stockTotalFor(medicament.id!, trx)
      if (stockAvant < quantite) throw new Error('Stock insuffisant')
      return this.consumeFifo(trx, {
        medicamentId: medicament.id!,
        quantite,
        type: 'administration',
        referenceType: 'plan_soins_item',
        referenceId: String(params.planSoinsItemId),
        userId: toUserId(params.userId),
      })
    })
    return {
      medicamentId: medicament.id!,
      lignes: lignes.map(({ lotId, quantite }) => ({ lotId, quantite })),
    }
  }

  async decrementLot(
    db: DbExecutor,
    params: {
      lotId: number
      medicamentId: number
      quantite: number
      type: MouvementType
      motif?: string
      referenceType?: 'ordonnance_libre' | 'prescription' | 'plan_soins_item'
      referenceId?: number | string
      userId?: number
    },
  ): Promise<{ lotId: number; quantite: number }> {
    const lot = await db
      .selectFrom('stock_lots')
      .selectAll()
      .where('id', '=', params.lotId)
      .executeTakeFirst()
    if (!lot || (lot.medicament_id as number) !== params.medicamentId) throw new Error('Lot invalide')
    if (lot.date_peremption != null && (lot.date_peremption as string) < todayIso()) {
      throw new Error(`Lot périmé (péremption ${lot.date_peremption})`)
    }
    if ((lot.quantite as number) < params.quantite) {
      throw new Error(`Stock insuffisant dans le lot (demandé ${params.quantite}, disponible ${lot.quantite})`)
    }
    const stockAvant = await this.stockTotalFor(params.medicamentId, db)
    // Décrément atomique : le CHECK/where empêche toute quantité négative si
    // une autre écriture a consommé le lot entre la lecture et l'update.
    const updated = await db
      .updateTable('stock_lots')
      .set({ quantite: sql`quantite - ${params.quantite}` })
      .where('id', '=', lot.id!)
      .where('quantite', '>=', params.quantite)
      .returning('id')
      .executeTakeFirst()
    if (!updated) {
      throw new Error(`Stock insuffisant dans le lot (demandé ${params.quantite}, disponible ${lot.quantite})`)
    }
    await this.insertMouvement(db, {
      medicamentId: params.medicamentId,
      lotId: lot.id!,
      type: params.type,
      quantite: -params.quantite,
      stockAvant,
      stockApres: stockAvant - params.quantite,
      motif: params.motif,
      referenceType: params.referenceType,
      referenceId: params.referenceId != null ? String(params.referenceId) : undefined,
      userId: params.userId,
    })
    return { lotId: lot.id!, quantite: params.quantite }
  }

  async consumeFifo(
    db: DbExecutor,
    params: {
      medicamentId: number
      quantite: number
      type: MouvementType
      motif?: string
      referenceType?: 'ordonnance_libre' | 'prescription' | 'plan_soins_item'
      referenceId?: number | string
      userId?: number
    },
  ): Promise<Array<{ lotId: number; quantite: number; prixAchat?: number }>> {
    const today = todayIso()
    const stockAvant = await this.stockTotalFor(params.medicamentId, db)
    const lots = await db
      .selectFrom('stock_lots')
      .select(['id', 'quantite', 'prix_achat'])
      .where('medicament_id', '=', params.medicamentId)
      .where('quantite', '>', 0)
      .where((eb) => eb.or([eb('date_peremption', 'is', null), eb('date_peremption', '>=', today)]))
      .orderBy('date_peremption', (ob) => ob.asc().nullsLast())
      .orderBy('id', 'asc')
      .execute()
    let remaining = params.quantite
    let runningAvant = stockAvant
    const consumed: Array<{ lotId: number; quantite: number; prixAchat?: number }> = []
    for (const lot of lots) {
      if (remaining <= 0) break
      const take = Math.min(lot.quantite as number, remaining)
      // Mise à jour conditionnelle : jamais de stock négatif même en cas de
      // concurrence entre deux sorties sur le même lot.
      const updated = await db
        .updateTable('stock_lots')
        .set({ quantite: sql`quantite - ${take}` })
        .where('id', '=', lot.id!)
        .where('quantite', '>=', take)
        .returning('id')
        .executeTakeFirst()
      if (!updated) throw new Error('Stock insuffisant (lot modifié concurremment)')
      await this.insertMouvement(db, {
        medicamentId: params.medicamentId,
        lotId: lot.id!,
        type: params.type,
        quantite: -take,
        stockAvant: runningAvant,
        stockApres: runningAvant - take,
        motif: params.motif,
        referenceType: params.referenceType,
        referenceId: params.referenceId != null ? String(params.referenceId) : undefined,
        userId: params.userId,
      })
      consumed.push({
        lotId: lot.id!,
        quantite: take,
        prixAchat: (lot.prix_achat as number | null) ?? undefined,
      })
      remaining -= take
      runningAvant -= take
    }
    if (remaining > 0) throw new Error('Stock insuffisant')
    return consumed
  }

  private async stockTotalFor(medicamentId: number, db: DbExecutor = this.db): Promise<number> {
    const row = await db
      .selectFrom('stock_lots')
      .select((eb) => eb.fn.sum<number | null>('quantite').as('total'))
      .where('medicament_id', '=', medicamentId)
      .executeTakeFirst()
    return Number(row?.total ?? 0)
  }

  private async insertMouvement(
    db: DbExecutor,
    params: {
      medicamentId: number
      lotId?: number
      type: MouvementType
      quantite: number
      stockAvant?: number
      stockApres?: number
      motif?: string
      referenceType?: 'ordonnance_libre' | 'prescription' | 'plan_soins_item'
      referenceId?: string
      userId?: number
    },
  ): Promise<number> {
    const inserted = await db
      .insertInto('mouvements_stock')
      .values({
        medicament_id: params.medicamentId,
        lot_id: params.lotId,
        type: params.type,
        quantite: params.quantite,
        stock_avant: params.stockAvant,
        stock_apres: params.stockApres,
        reference_type: params.referenceType,
        reference_id: params.referenceId,
        motif: params.motif,
        user_id: params.userId,
      })
      .returning('id')
      .executeTakeFirstOrThrow()
    return inserted.id as number
  }
}
