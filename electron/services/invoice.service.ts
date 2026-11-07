import { inject, singleton } from 'tsyringe'
import { sql, type Kysely, type SqlBool } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import { InvoiceEntity } from '../entities/invoice.entity'
import type { InvoiceDto, InvoiceItemDto, InvoicePaymentDto, InvoiceCreateDto, InvoiceStatsDto, RecuDto } from '../dto/invoice.dto'
import { validateForeignKeys } from './utils/fk-validator'
import { entityEventBus } from '../automerge/event-bus'
import { montantEnLettres } from '../utils/montant-lettres'

export function computeInvoiceTotals(items: Array<{ quantite?: number; prix_unitaire?: number; montant?: number }>, remisePct = 0, tvaPct = 0) {
  const sousTotal = (items ?? []).reduce((sum, it) => {
    const line = it.montant ?? ((it.quantite ?? 0) * (it.prix_unitaire ?? 0))
    return sum + line
  }, 0)
  const remise = Math.max(0, Math.min(100, remisePct || 0))
  const tva = Math.max(0, Math.min(100, tvaPct || 0))
  const remiseMontant = (sousTotal * remise) / 100
  const base = sousTotal - remiseMontant
  const tvaMontant = (base * tva) / 100
  const total = Math.round(base + tvaMontant)
  return { sousTotal, remiseMontant, tvaMontant, total }
}

/** Détecte une violation de contrainte UNIQUE (SQLite). */
function isUniqueViolation(error: unknown): boolean {
  if ((error as { code?: string })?.code === 'SQLITE_CONSTRAINT_UNIQUE') return true
  return /UNIQUE constraint failed/i.test((error as Error)?.message ?? '')
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && DATE_RE.test(value)
}

/**
 * Date calendaire réelle `YYYY-MM-DD` : le format seul ne suffit pas
 * (`2026-02-30` ou `2026-13-01` doivent être refusés).
 */
function isRealIsoDate(value: unknown): value is string {
  if (!isIsoDate(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

/** Fenêtre calendaire [from, to] (bornes incluses). */
interface Fenetre {
  from: string
  to: string
}

/** Dernier jour du mois d'une date `YYYY-MM-DD`. */
function lastDayOfMonth(isoDay: string): string {
  const year = Number(isoDay.slice(0, 4))
  const month = Number(isoDay.slice(5, 7))
  const last = new Date(Date.UTC(year, month, 0))
  return last.toISOString().slice(0, 10)
}

/** Nombre de jours calendaires entre deux dates `YYYY-MM-DD` (bornes incluses). */
function dayCount(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`)
  const b = Date.parse(`${to}T00:00:00Z`)
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return 0
  return Math.round((b - a) / 86_400_000) + 1
}

@singleton()
export class InvoiceService {
  public db: Kysely<DB>

  constructor(@inject(AppDatabaseDatasource) datasource: AppDatabaseDatasource) {
    this.db = datasource.getInstance()
  }

  /**
   * Trace une requête secondaire AVORTÉE (défaut N14).
   *
   * Les statistiques et rapports facturaires sont assemblés à partir de
   * plusieurs requêtes « best effort » : si l'une d'elles échoue, on rend un
   * résultat partiel plutôt que de casser tout l'écran. Mais l'échec ne doit
   * JAMAIS être silencieux — il est journalisé pour être diagnosticable.
   */
  private logFallback(context: string, error: unknown): void {
    console.warn(`[invoice] Requête ignorée (${context})`, {
      error: error instanceof Error ? error.message : String(error),
    })
  }

  async list(params?: {
    search?: string
    status?: string
    date_debut?: string
    date_fin?: string
  }): Promise<InvoiceDto[]> {
    let query = this.db
      .selectFrom('invoice')
      .innerJoin('patient', 'invoice.patient_id', 'patient.id')
      .leftJoin('insurances', 'invoice.assurance_id', 'insurances.id')
      .selectAll('invoice')
      .select(['patient.nom as patient_nom', 'patient.prenom as patient_prenom', 'patient.nip as patient_nip', 'insurances.name as assurance_nom'])
      .orderBy('invoice.date', 'desc')
      .orderBy('invoice.id', 'desc')

    if (params?.search) {
      const q = `%${params.search}%`
      query = query.where((eb) =>
        eb('invoice.numero', 'like', q)
          .or('patient.nom', 'like', q)
          .or('patient.prenom', 'like', q)
      ) as typeof query
    }
    if (params?.status) {
      query = query.where('invoice.status', '=', params.status as any)
    }
    if (params?.date_debut) {
      query = query.where('invoice.date', '>=', params.date_debut)
    }
    if (params?.date_fin) {
      query = query.where('invoice.date', '<=', params.date_fin)
    }

    const rows = await query.execute()
    return rows.map((row: any) =>
      InvoiceEntity.toDto(
        row as InvoiceEntity,
        undefined,
        undefined,
        row.patient_nom,
        row.patient_prenom,
        row.patient_nip,
      )
    ).map((dto, i) => ({ ...dto, assurance_nom: (rows as any[])[i]?.assurance_nom }))
  }

  async getById(id: number): Promise<InvoiceDto | null> {
    const row: any = await this.db
      .selectFrom('invoice')
      .innerJoin('patient', 'invoice.patient_id', 'patient.id')
      .leftJoin('insurances', 'invoice.assurance_id', 'insurances.id')
      .selectAll('invoice')
      .select(['patient.nom as patient_nom', 'patient.prenom as patient_prenom', 'patient.nip as patient_nip', 'insurances.name as assurance_nom'])
      .where('invoice.id', '=', id)
      .executeTakeFirst()

    if (!row) return null

    const items = await this.getItems(id)
    const payments = await this.getPayments(id)

    const dto = InvoiceEntity.toDto(
      row as InvoiceEntity,
      items,
      payments,
      row.patient_nom,
      row.patient_prenom,
      row.patient_nip,
    )
    return { ...dto, assurance_nom: row.assurance_nom }
  }

  async getByPatient(patientId: number): Promise<InvoiceDto[]> {
    const rows: any[] = await this.db
      .selectFrom('invoice')
      .innerJoin('patient', 'invoice.patient_id', 'patient.id')
      .leftJoin('insurances', 'invoice.assurance_id', 'insurances.id')
      .selectAll('invoice')
      .select(['patient.nom as patient_nom', 'patient.prenom as patient_prenom', 'patient.nip as patient_nip', 'insurances.name as assurance_nom'])
      .where('invoice.patient_id', '=', patientId)
      .orderBy('invoice.date', 'desc')
      .execute()

    return rows.map((row: any) => ({
      ...InvoiceEntity.toDto(row as InvoiceEntity, undefined, undefined, row.patient_nom, row.patient_prenom, row.patient_nip),
      assurance_nom: row.assurance_nom,
    }))
  }

  async create(dto: InvoiceCreateDto): Promise<InvoiceDto> {
    const fks: Array<{ table: string; column: string; value: unknown }> = [
      { table: 'patient', column: 'patient_id', value: dto.patient_id },
      { table: 'user', column: 'created_by', value: dto.created_by },
    ]
    if (dto.assurance_id) fks.push({ table: 'insurances', column: 'assurance_id', value: dto.assurance_id })
    await validateForeignKeys(this.db as any, fks as any)

    // Date de facture : une date impossible (`2026-02-30`) fausserait
    // durablement tous les rapports par période. On normalise un éventuel
    // horodatage ISO en jour calendaire, puis on valide la date réelle.
    const dateStr = typeof dto.date === 'string' ? dto.date.slice(0, 10) : ''
    if (!isRealIsoDate(dateStr)) {
      throw new Error('Date de facture invalide : le format attendu est AAAA-MM-JJ (ex. 2026-01-31).')
    }
    const numero = await this.generateNumero(dateStr)
    const remisePct = dto.remise_pct ?? 0
    const tvaPct = dto.tva_pct ?? 0
    const normalizedItems = (dto.items ?? []).map((it) => ({
      ...it,
      quantite: Math.max(1, it.quantite ?? 1),
      prix_unitaire: Math.max(0, it.prix_unitaire ?? 0),
      montant: it.montant ?? ((it.quantite ?? 1) * (it.prix_unitaire ?? 0)),
    }))
    const { total } = computeInvoiceTotals(normalizedItems, remisePct, tvaPct)

    // Part assurance / patient : taux de prise en charge (défaut 80 % si assurance liée)
    let partAssurance = 0
    let partPatient = total
    if (dto.assurance_id) {
      const taux = dto.taux_prise_en_charge ?? 80
      partAssurance = Math.round((total * Math.max(0, Math.min(100, taux))) / 100)
      partPatient = total - partAssurance
    }

    // La facture et ses lignes sont insérées dans UNE SEULE transaction :
    // un échec d'insertion d'une ligne ne doit pas laisser une facture
    // partielle visible dans les rapports comptables.
    const result = await this.db.transaction().execute(async (trx) => {
      const inserted = await trx
        .insertInto('invoice')
        .values({
          numero,
          patient_id: dto.patient_id,
          date: dateStr,
          montant_total: total,
          montant_restant: partPatient,
          status: 'en_attente',
          notes: dto.notes ?? undefined,
          remise_pct: remisePct,
          tva_pct: tvaPct,
          assurance_id: dto.assurance_id ?? undefined,
          part_assurance: partAssurance,
          part_patient: partPatient,
          mode_paiement: dto.mode_paiement ?? undefined,
          created_by: dto.created_by ?? undefined,
        } as any)
        .returningAll()
        .executeTakeFirst()

      if (!inserted) throw new Error('Échec de la création de la facture')

      for (const item of normalizedItems) {
        await trx
          .insertInto('invoice_item')
          .values({
            invoice_id: inserted.id!,
            libelle: item.libelle,
            quantite: item.quantite,
            prix_unitaire: item.prix_unitaire,
            montant: item.montant ?? (item.quantite! * item.prix_unitaire!),
            type: (item.type as any) ?? 'autre',
            acte_id: item.acte_id ?? undefined,
          })
          .execute()
      }

      return inserted
    })

    const invoiceDto = (await this.getById(result.id!))!
    entityEventBus.emitEntityChange({ entityType: 'invoice', action: 'created', id: result.id!, entity: invoiceDto, source: 'local', timestamp: Date.now() })
    return invoiceDto
  }

  async update(id: number, data: {
    notes?: string
    status?: string
    remise_pct?: number
    tva_pct?: number
    assurance_id?: number | null
    taux_prise_en_charge?: number
    items?: InvoiceItemDto[]
  }): Promise<InvoiceDto> {
    const existing: any = await this.db
      .selectFrom('invoice')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst()
    if (!existing) throw new Error('Facture introuvable')

    // Une facture déjà réglée (au moins un encaissement) est figée : ses
    // lignes, remises, taxes et assurance ne peuvent plus bouger, sinon les
    // montants facturés ne correspondraient plus aux reçus émis.
    const toucheContenu =
      data.items !== undefined ||
      data.remise_pct !== undefined ||
      data.tva_pct !== undefined ||
      data.assurance_id !== undefined ||
      data.taux_prise_en_charge !== undefined ||
      data.notes !== undefined
    if (toucheContenu && (await this.getTotalPaid(id)) > 0) {
      throw new Error('Facture déjà réglée (au moins un paiement encaissé) : modification impossible.')
    }

    // Politique d'annulation (unique, appliquée par TOUS les rapports) :
    // une facture portant des encaissements ne peut pas être annulée. Sans
    // cela, les paiements d'une facture annulée resteraient comptés dans la
    // caisse alors que la facture disparaîtrait des totaux facturés.
    const annulation = data.status === 'annulé' && existing.status !== 'annulé'
    if (annulation) {
      const paiements: any = await this.db
        .selectFrom('invoice_payment')
        .select([this.db.fn.countAll<number>().as('nb'), this.db.fn.sum<number>('montant').as('total')])
        .where('invoice_id', '=', id)
        .executeTakeFirst()
      const nbPaiements = Number(paiements?.nb ?? 0)
      if (nbPaiements > 0) {
        throw new Error(
          `Impossible d'annuler la facture ${existing.numero} : ${nbPaiements} paiement(s) ont été encaissés. ` +
          `Annulez d'abord les encaissements.`,
        )
      }
    }

    // Une facture annulée est définitive : seule une nouvelle annulation
    // (idempotente) est tolérée, aucune autre modification.
    if (existing.status === 'annulé' && !annulation) {
      throw new Error('Une facture annulée ne peut plus être modifiée.')
    }

    // Validation des lignes AVANT toute écriture (aucune suppression si une
    // ligne est invalide) — même contrat que la création.
    let normalizedItems: Array<InvoiceItemDto & { quantite: number; prix_unitaire: number; montant: number }> | undefined
    if (data.items !== undefined) {
      normalizedItems = data.items.map((it, index) => {
        const libelle = typeof it.libelle === 'string' ? it.libelle.trim() : ''
        if (!libelle) {
          throw new Error(`Ligne ${index + 1} : le libellé est requis.`)
        }
        if (it.type === 'acte' && !((it.prix_unitaire ?? 0) > 0)) {
          throw new Error(`Ligne ${index + 1} : le prix unitaire d'un acte doit être strictement positif.`)
        }
        const quantite = Math.max(1, it.quantite ?? 1)
        const prixUnitaire = Math.max(0, it.prix_unitaire ?? 0)
        return {
          ...it,
          libelle,
          quantite,
          prix_unitaire: prixUnitaire,
          montant: it.montant ?? quantite * prixUnitaire,
        }
      })
    }

    if (data.assurance_id) {
      await validateForeignKeys(this.db as any, [
        { table: 'insurances', column: 'assurance_id', value: data.assurance_id },
      ] as any)
    }

    const updateData: any = {}
    if (data.notes !== undefined) updateData.notes = data.notes
    if (data.status !== undefined) updateData.status = data.status
    if (data.remise_pct !== undefined) updateData.remise_pct = data.remise_pct
    if (data.tva_pct !== undefined) updateData.tva_pct = data.tva_pct
    if (data.assurance_id !== undefined) updateData.assurance_id = data.assurance_id
    // Une facture annulée n'a plus de reste à recouvrer : sans quoi elle
    // gonflerait les impayés alors qu'elle est exclue des totaux facturés.
    if (annulation) updateData.montant_restant = 0

    // Recalcul complet dès qu'un élément de contenu change. Une annulation
    // reste prioritaire : son reste à payer est figé à 0.
    const recalcul =
      data.items !== undefined ||
      data.remise_pct !== undefined ||
      data.tva_pct !== undefined ||
      data.assurance_id !== undefined ||
      data.taux_prise_en_charge !== undefined
    if (!annulation && recalcul) {
      const items = normalizedItems ?? (await this.getItems(id))
      const remise = data.remise_pct ?? existing.remise_pct ?? 0
      const tva = data.tva_pct ?? existing.tva_pct ?? 0
      const { total } = computeInvoiceTotals(items, remise, tva)

      const assuranceId = data.assurance_id !== undefined ? data.assurance_id : existing.assurance_id
      const tauxFourni = data.taux_prise_en_charge
      const tauxExistant = existing.montant_total
        ? ((existing.part_assurance ?? 0) / existing.montant_total) * 100
        : 0
      const taux = Math.max(0, Math.min(100, tauxFourni ?? (tauxExistant > 0 ? tauxExistant : 80)))
      const partAssurance = assuranceId ? Math.round((total * taux) / 100) : 0
      const partPatient = total - partAssurance
      const totalPaid = await this.getTotalPaid(id)
      const montantRestant = Math.max(0, (assuranceId ? partPatient : total) - totalPaid)

      updateData.montant_total = total
      updateData.part_assurance = partAssurance
      updateData.part_patient = partPatient
      updateData.montant_restant = montantRestant

      // Statut re-dérivé (hors annulation) : une facture sans paiement reste
      // « en attente », soldée → « payé », sinon « partiel ».
      if (totalPaid <= 0) updateData.status = 'en_attente'
      else if (montantRestant <= 0) updateData.status = 'payé'
      else updateData.status = 'partiel'
    }

    updateData.updated_at = new Date().toISOString()

    // Écriture atomique : lignes remplacées + entête mis à jour, ou rien.
    await this.db.transaction().execute(async (trx) => {
      if (normalizedItems !== undefined) {
        await trx
          .deleteFrom('invoice_item')
          .where('invoice_id', '=', id)
          .execute()
        for (const item of normalizedItems) {
          await trx
            .insertInto('invoice_item')
            .values({
              invoice_id: id,
              libelle: item.libelle,
              quantite: item.quantite,
              prix_unitaire: item.prix_unitaire,
              montant: item.montant,
              type: (item.type as any) ?? 'autre',
              acte_id: item.acte_id ?? undefined,
            } as any)
            .execute()
        }
      }

      await trx
        .updateTable('invoice')
        .set(updateData)
        .where('id', '=', id)
        .execute()
    })

    const invoiceDto = (await this.getById(id))!
    entityEventBus.emitEntityChange({ entityType: 'invoice', action: 'updated', id, entity: invoiceDto, source: 'local', timestamp: Date.now() })
    return invoiceDto
  }

  /**
   * Enregistre un encaissement.
   *
   * Invariants (garantis par la transaction) :
   *  - une facture annulée n'encaisse rien ;
   *  - le montant est strictement positif et ne dépasse jamais le reste à
   *    payer (aucun trop-perçu silencieusement perdu) ;
   *  - l'insertion du paiement, le recalcul du reste dû et le statut sont
   *    atomiques : en cas d'échec, RIEN n'est persisté.
   */
  async addPayment(payment: InvoicePaymentDto): Promise<InvoiceDto> {
    if (!payment.invoice_id) throw new Error('Facture introuvable')
    if (typeof payment.montant !== 'number' || !Number.isFinite(payment.montant) || payment.montant <= 0) {
      throw new Error('Montant de paiement invalide : le montant doit être strictement positif.')
    }

    await validateForeignKeys(this.db as any, [
      { table: 'invoice', column: 'invoice_id', value: payment.invoice_id },
      { table: 'user', column: 'created_by', value: payment.created_by },
    ])

    // Jour calendaire de l'encaissement : un horodatage est normalisé, une
    // date impossible est refusée (sinon le paiement sortirait de toute
    // période de rapport sans erreur visible).
    const datePaiementBrute = typeof payment.date_paiement === 'string'
      ? payment.date_paiement.slice(0, 10)
      : new Date().toISOString().slice(0, 10)
    if (!isRealIsoDate(datePaiementBrute)) {
      throw new Error('Date de paiement invalide : le format attendu est AAAA-MM-JJ (ex. 2026-01-31).')
    }
    const datePaiement = datePaiementBrute

    const inserted: any = await this.db.transaction().execute(async (trx) => {
      const invoice: any = await trx
        .selectFrom('invoice')
        .selectAll()
        .where('id', '=', payment.invoice_id!)
        .executeTakeFirst()
      if (!invoice) throw new Error('Facture introuvable')
      if (invoice.status === 'annulé') {
        throw new Error(
          `Impossible d'encaisser un paiement : la facture ${invoice.numero} est annulée.`,
        )
      }

      // Référence patient : part_patient si assurance, sinon montant_total
      const du = invoice.assurance_id ? (invoice.part_patient ?? invoice.montant_total) : invoice.montant_total
      const totalPaye = await this.getTotalPaid(payment.invoice_id!, trx)
      const montantRestantAvant = Math.max(0, (du ?? 0) - totalPaye)
      if (payment.montant! > montantRestantAvant) {
        throw new Error(
          `Montant supérieur au reste à payer : ${montantRestantAvant} attendu(s) au maximum ` +
          `sur la facture ${invoice.numero}.`,
        )
      }

      const row: any = payment.numero_recu
        ? await trx
            .insertInto('invoice_payment')
            .values({
              invoice_id: payment.invoice_id!,
              montant: payment.montant!,
              mode_paiement: (payment.mode_paiement as any) ?? 'espèces',
              date_paiement: datePaiement,
              reference: payment.reference ?? undefined,
              numero_recu: payment.numero_recu,
              created_by: payment.created_by ?? undefined,
            } as any)
            .returningAll()
            .executeTakeFirst()
        : await this.insertPaymentWithRecuAuto({
            invoice_id: payment.invoice_id!,
            montant: payment.montant!,
            mode_paiement: (payment.mode_paiement as any) ?? 'espèces',
            date_paiement: datePaiement,
            reference: payment.reference ?? undefined,
            created_by: payment.created_by ?? undefined,
          }, trx)

      // Recalcul APRÈS insertion : le total réellement encaissé est relu en
      // base (et non déduit), ce qui protège aussi d'un encaissement
      // concurrent déjà validé.
      const totalPayeApres = await this.getTotalPaid(payment.invoice_id!, trx)
      if (totalPayeApres > (du ?? 0)) {
        // Trop-perçu : la transaction est annulée (aucun reçu ne subsiste).
        throw new Error(
          `Montant supérieur au reste à payer : le total encaissé (${totalPayeApres}) ` +
          `dépasserait le dû (${du ?? 0}) de la facture ${invoice.numero}.`,
        )
      }
      const montantRestant = Math.max(0, (du ?? 0) - totalPayeApres)

      let newStatus: 'payé' | 'en_attente' | 'annulé' | 'partiel'
      if (montantRestant <= 0) {
        newStatus = 'payé'
      } else if (totalPayeApres > 0) {
        newStatus = 'partiel'
      } else {
        newStatus = 'en_attente'
      }

      await trx
        .updateTable('invoice')
        .set({ montant_restant: montantRestant, status: newStatus, mode_paiement: (payment.mode_paiement as any) ?? invoice.mode_paiement } as any)
        .where('id', '=', payment.invoice_id!)
        .execute()

      return row
    })

    entityEventBus.emitEntityChange({ entityType: 'invoice_payment', action: 'created', id: inserted?.id ?? 0, entity: inserted, source: 'local', timestamp: Date.now() })
    return (await this.getById(payment.invoice_id!))!
  }

  async getRecu(params: { payment_id?: number; numero_recu?: string }): Promise<RecuDto | null> {
    let pay: any = null
    if (params.payment_id) {
      pay = await this.db.selectFrom('invoice_payment').selectAll().where('id', '=', params.payment_id).executeTakeFirst()
    } else if (params.numero_recu) {
      pay = await this.db.selectFrom('invoice_payment').selectAll().where('numero_recu', '=', params.numero_recu).executeTakeFirst()
    }
    if (!pay) return null

    const inv: any = await this.db
      .selectFrom('invoice')
      .innerJoin('patient', 'invoice.patient_id', 'patient.id')
      .leftJoin('insurances', 'invoice.assurance_id', 'insurances.id')
      .selectAll('invoice')
      .select(['patient.nom as patient_nom', 'patient.prenom as patient_prenom', 'patient.nip as patient_nip', 'insurances.name as assurance_nom'])
      .where('invoice.id', '=', pay.invoice_id)
      .executeTakeFirst()

    let caissierNom: string | undefined
    if (pay.created_by) {
      const u: any = await this.db
        .selectFrom('user')
        .selectAll()
        .where('id', '=', pay.created_by)
        .executeTakeFirst()
        .catch((error) => {
          this.logFallback('nom du caissier', error)
          return null
        })
      if (u) caissierNom = `${u.prenom ?? ''} ${(u.nom ?? '').toUpperCase()}`.trim() || undefined
    }

    const totalPaye = await this.getTotalPaid(pay.invoice_id)
    const du = inv?.assurance_id ? (inv?.part_patient ?? inv?.montant_total ?? 0) : (inv?.montant_total ?? 0)
    return {
      payment: {
        id: pay.id,
        invoice_id: pay.invoice_id,
        montant: pay.montant,
        mode_paiement: pay.mode_paiement,
        date_paiement: pay.date_paiement,
        reference: pay.reference,
        numero_recu: pay.numero_recu,
        created_by: pay.created_by,
        created_at: pay.created_at,
        caissier_nom: caissierNom,
      },
      invoice_numero: inv?.numero,
      invoice_date: inv?.date,
      invoice_total: inv?.montant_total,
      patient_nom: inv?.patient_nom,
      patient_prenom: inv?.patient_prenom,
      patient_nip: inv?.patient_nip,
      assurance_nom: inv?.assurance_nom,
      caissier_nom: caissierNom,
      montant_lettres: montantEnLettres(pay.montant ?? 0),
      reste_du: Math.max(0, du - totalPaye),
    }
  }

  /**
   * Statistiques de facturation.
   *
   * Cadrage explicite :
   *  - `anchor = date_debut ?? today` (jour d'ancrage) ;
   *  - `range = [date_debut ?? -inf, date_fin ?? +inf]` (plage demandée).
   *
   * Chaque fenêtre (`jour`, `semaine`, `mois`, `annee`) est la fenêtre
   * CALENDAIRE de l'ancre INTERSECTÉE avec la plage demandée ; une
   * intersection vide vaut 0.
   *
   * `ca_jour` = montant ENCAISSÉ le seul jour de l'ancre. Le montant facturé
   * du jour est exposé séparément via `ca_facture_jour` (jamais plus dans
   * `ca_jour`, qui ne doit signifier qu'une seule chose).
   *
   * `taux_encaissement` : numérateur (encaissé) et dénominateur (facturé)
   * utilisent la MÊME fenêtre ; le résultat est plafonné à 100 %.
   */
  async getStats(params?: { date_debut?: string; date_fin?: string }): Promise<InvoiceStatsDto> {
    const now = new Date()
    const today = now.toISOString().slice(0, 10)

    const filterStart = isIsoDate(params?.date_debut) ? params.date_debut : undefined
    const filterEnd = isIsoDate(params?.date_fin) ? params.date_fin : undefined

    // Ancrage explicite + plage demandée (bornes optionnelles).
    const anchor = filterStart ?? today
    const rangeStart = filterStart ?? null
    const rangeEnd = filterEnd ?? null

    const anchorDate = new Date(`${anchor}T00:00:00Z`)
    const monday = new Date(anchorDate)
    monday.setUTCDate(anchorDate.getUTCDate() - ((anchorDate.getUTCDay() + 6) % 7))
    const sunday = new Date(monday)
    sunday.setUTCDate(monday.getUTCDate() + 6)

    const fenetreJour: Fenetre = { from: anchor, to: anchor }
    const fenetreSemaine: Fenetre = {
      from: monday.toISOString().slice(0, 10),
      to: sunday.toISOString().slice(0, 10),
    }
    const fenetreMois: Fenetre = { from: `${anchor.slice(0, 7)}-01`, to: lastDayOfMonth(anchor) }
    const fenetreAnnee: Fenetre = { from: `${anchor.slice(0, 4)}-01-01`, to: `${anchor.slice(0, 4)}-12-31` }

    /** Intersection d'une fenêtre calendaire avec la plage demandée. */
    const intersect = (fenetre: Fenetre): Fenetre | null => {
      const from = rangeStart && rangeStart > fenetre.from ? rangeStart : fenetre.from
      const to = rangeEnd && rangeEnd < fenetre.to ? rangeEnd : fenetre.to
      return from > to ? null : { from, to }
    }

    // Jour calendaire de l'encaissement : un horodatage tombant le dernier
    // jour de la période ne doit pas être exclu de la période.
    const jourPaiement = sql<string>`substr(invoice_payment.date_paiement, 1, 10)`
    const jourFacture = sql<string>`substr(invoice.date, 1, 10)`

    const sumPayments = async (fenetre: Fenetre | null): Promise<number> => {
      if (!fenetre) return 0
      const r: any = await this.db
        .selectFrom('invoice_payment')
        .select(this.db.fn.sum<number>('montant').as('total'))
        .where(sql<SqlBool>`${jourPaiement} >= ${fenetre.from}`)
        .where(sql<SqlBool>`${jourPaiement} <= ${fenetre.to}`)
        .executeTakeFirst()
      return Number(r?.total ?? 0)
    }

    /** Montant FACTURÉ (factures non annulées) sur la fenêtre. */
    const sumBilled = async (fenetre: Fenetre | null): Promise<number> => {
      if (!fenetre) return 0
      const r: any = await this.db
        .selectFrom('invoice')
        .select(this.db.fn.sum<number>('montant_total').as('total'))
        .where(sql<SqlBool>`${jourFacture} >= ${fenetre.from}`)
        .where(sql<SqlBool>`${jourFacture} <= ${fenetre.to}`)
        .where('invoice.status', '!=', 'annulé')
        .executeTakeFirst()
      return Number(r?.total ?? 0)
    }

    const countInvoices = async (fenetre: Fenetre | null): Promise<number> => {
      if (!fenetre) return 0
      const r: any = await this.db
        .selectFrom('invoice')
        .select(this.db.fn.countAll<number>().as('count'))
        .where(sql<SqlBool>`${jourFacture} >= ${fenetre.from}`)
        .where(sql<SqlBool>`${jourFacture} <= ${fenetre.to}`)
        .where('invoice.status', '!=', 'annulé')
        .executeTakeFirst()
      return Number(r?.count ?? 0)
    }

    const fenetreJourI = intersect(fenetreJour)
    const fenetreSemaineI = intersect(fenetreSemaine)
    const fenetreMoisI = intersect(fenetreMois)
    const fenetreAnneeI = intersect(fenetreAnnee)
    // `nb_jour` suit la plage demandée ; sans plage, il compte les factures
    // du jour d'ancrage (comportement historique inchangé).
    const fenetreNbJour = (rangeStart && rangeEnd)
      ? intersect({ from: rangeStart, to: rangeEnd })
      : fenetreJourI
    // Nombre de JOURS de la plage demandée (information additive).
    // Indéfini dès qu'une borne manque : un demi-intervalle n'a pas de
    // longueur en jours (ne jamais rapporter 1 par défaut).
    const nbJoursPeriode = (rangeStart && rangeEnd) ? dayCount(rangeStart, rangeEnd) : undefined

    const [caJour, caSemaine, caMois, caAnnee, caFactureJour, billedMois, nbMois, nbJour] = await Promise.all([
      sumPayments(fenetreJourI),
      sumPayments(fenetreSemaineI),
      sumPayments(fenetreMoisI),
      sumPayments(fenetreAnneeI),
      sumBilled(fenetreJourI),
      sumBilled(fenetreMoisI),
      countInvoices(fenetreMoisI),
      countInvoices(fenetreNbJour),
    ])

    const enAttenteRows: any[] = await this.db
      .selectFrom('invoice')
      .selectAll('invoice')
      .where('invoice.status', 'in', ['en_attente', 'partiel'])
      .execute()
    const enAttenteTotal = enAttenteRows.reduce((s: number, inv: any) => s + (inv.montant_restant ?? 0), 0)

    // Taux d'encaissement : même fenêtre pour le numérateur et le dénominateur,
    // et plafonnement à 100 % (l'encaissé d'une facture antérieure peut
    // dépasser le facturé de la fenêtre).
    const taux = billedMois > 0 ? Math.min(100, (caMois / billedMois) * 100) : 0

    // Taux de recouvrement global — les factures annulées sont exclues des
    // deux termes (une facture annulée n'est ni due ni recouvrable).
    const allInv: any[] = await this.db
      .selectFrom('invoice')
      .select(['montant_total'])
      .where('invoice.status', '!=', 'annulé')
      .execute()
    const allPay: any = await this.db
      .selectFrom('invoice_payment')
      .innerJoin('invoice', 'invoice.id', 'invoice_payment.invoice_id')
      .where('invoice.status', '!=', 'annulé')
      .select(this.db.fn.sum<number>('invoice_payment.montant').as('total'))
      .executeTakeFirst()
    const totalFacture = allInv.reduce((s: number, r: any) => s + (r.montant_total ?? 0), 0)
    const totalEncaisse = Number((allPay as any)?.total ?? 0)
    const tauxRecouvrement = totalFacture > 0 ? (totalEncaisse / totalFacture) * 100 : 0

    // Top 5 actes (libellés les plus facturés, filtrés par période si fournie)
    let topQuery = this.db
      .selectFrom('invoice_item')
      .innerJoin('invoice', 'invoice.id', 'invoice_item.invoice_id')
      .select(['invoice_item.libelle as libelle', this.db.fn.sum<number>('invoice_item.montant').as('total'), this.db.fn.sum<number>('invoice_item.quantite').as('quantite')])
      .where('invoice.status', '!=', 'annulé')
      .groupBy('invoice_item.libelle')
      .orderBy('total', 'desc')
      .limit(5)
    if (filterStart) topQuery = topQuery.where(sql<SqlBool>`${jourFacture} >= ${filterStart}`) as typeof topQuery
    if (filterEnd) topQuery = topQuery.where(sql<SqlBool>`${jourFacture} <= ${filterEnd}`) as typeof topQuery
    const topActes: any[] = await topQuery.execute().catch((error) => {
      this.logFallback('top_actes', error)
      return []
    })

    // CA par mode de paiement (restreint à la période fournie le cas échéant)
    let caParModeQuery = this.db
      .selectFrom('invoice_payment')
      .select(['mode_paiement as mode', this.db.fn.sum<number>('montant').as('total'), this.db.fn.countAll<number>().as('nb')])
      .groupBy('mode_paiement')
      .orderBy('total', 'desc')
    if (filterStart) {
      caParModeQuery = caParModeQuery.where(sql<SqlBool>`${jourPaiement} >= ${filterStart}`) as typeof caParModeQuery
    }
    if (filterEnd) {
      caParModeQuery = caParModeQuery.where(sql<SqlBool>`${jourPaiement} <= ${filterEnd}`) as typeof caParModeQuery
    }
    const caParMode: any[] = await caParModeQuery.execute().catch((error) => {
      this.logFallback('ca_par_mode', error)
      return []
    })

    // Série CA 30j (facturé + encaissé par jour) : les 30 derniers jours
    // terminando sur le jour d'ancrage, intersectés avec la plage demandée.
    const start30 = new Date(anchorDate)
    start30.setUTCDate(anchorDate.getUTCDate() - 29)
    const start30Str = start30.toISOString().slice(0, 10)
    const invoices30: any[] = await this.db
      .selectFrom('invoice')
      .select(['date', 'montant_total'])
      .where(sql<SqlBool>`${jourFacture} >= ${start30Str}`)
      .where(sql<SqlBool>`${jourFacture} <= ${anchor}`)
      .where('status', '!=', 'annulé')
      .execute()
      .catch((error) => {
        this.logFallback('ca_30j (factures)', error)
        return []
      })
    const payments30: any[] = await this.db
      .selectFrom('invoice_payment')
      .select([jourPaiement.as('date'), 'montant'])
      .where(sql<SqlBool>`${jourPaiement} >= ${start30Str}`)
      .where(sql<SqlBool>`${jourPaiement} <= ${anchor}`)
      .execute()
      .catch((error) => {
        this.logFallback('ca_30j (paiements)', error)
        return []
      })
    const ca30j = Array.from({ length: 30 }, (_, i) => {
      // Clés calendaires calculées intégralement en UTC : `setDate`/`getDate`
      // (heure locale) décalaient la clé d'un jour sur un déploiement non-UTC.
      const d = new Date(start30)
      d.setUTCDate(start30.getUTCDate() + i)
      const key = d.toISOString().slice(0, 10)
      const dansPlage = (!rangeStart || key >= rangeStart) && (!rangeEnd || key <= rangeEnd)
      if (!dansPlage) return { date: key, montant: 0, encaisse: 0 }
      return {
        date: key,
        montant: invoices30
          .filter((inv) => String(inv.date).slice(0, 10) === key)
          .reduce((s, inv) => s + (inv.montant_total ?? 0), 0),
        encaisse: payments30
          .filter((p) => String(p.date ?? '').slice(0, 10) === key)
          .reduce((s, p) => s + (p.montant ?? 0), 0),
      }
    })

    return {
      ca_jour: caJour,
      ca_facture_jour: caFactureJour,
      ca_semaine: caSemaine,
      ca_mois: caMois,
      ca_annee: caAnnee,
      en_attente: enAttenteTotal,
      impayes: enAttenteTotal,
      reste_a_recouvrer: enAttenteTotal,
      nb_mois: nbMois,
      nb_jour: nbJour,
      nb_jours_periode: nbJoursPeriode,
      taux_encaissement: Math.round(taux),
      taux_recouvrement: Math.round(tauxRecouvrement),
      top_actes: (topActes as any[]).map((r) => ({ libelle: r.libelle, total: Number(r.total ?? 0), quantite: Number(r.quantite ?? 0) })),
      ca_par_mode: (caParMode as any[]).map((r) => ({ mode: r.mode, total: Number(r.total ?? 0), nb: Number(r.nb ?? 0) })),
      ca_30j: ca30j,
    }
  }

  private async generateNumero(dateStr: string): Promise<string> {
    const prefix = `F-${dateStr.replace(/-/g, '')}-`
    const last = await this.db
      .selectFrom('invoice')
      .select('numero')
      .where('numero', 'like', `${prefix}%`)
      .orderBy('numero', 'desc')
      .limit(1)
      .executeTakeFirst()

    let seq = 1
    if (last?.numero) {
      const parts = last.numero.split('-')
      seq = parseInt(parts[parts.length - 1], 10) + 1
    }
    return `${prefix}${String(seq).padStart(4, '0')}`
  }

  /**
   * Prochain numéro de reçu du jour (`R-YYYYMMDD-NNNN`) à partir du dernier
   * numéro enregistré. La lecture seule sert de BASE : l'unicité est
   * garantie par l'index UNIQUE et des retries (cf. `insertPaymentWithRecuAuto`).
   */
  private async nextRecuSequence(dateStr: string, db: Kysely<DB> = this.db): Promise<number> {
    const day = String(dateStr).slice(0, 10).replace(/-/g, '')
    const prefix = `R-${day}-`
    const last = await db
      .selectFrom('invoice_payment')
      .select('numero_recu')
      .where('numero_recu', 'like', `${prefix}%`)
      .orderBy('numero_recu', 'desc')
      .limit(1)
      .executeTakeFirst()
      .catch((error) => {
        this.logFallback('numéro de reçu', error)
        return null
      })

    let seq = 1
    if ((last as any)?.numero_recu) {
      const parts = String((last as any).numero_recu).split('-')
      seq = parseInt(parts[parts.length - 1], 10) + 1
      if (Number.isNaN(seq)) seq = 1
    }
    return seq
  }

  /**
   * Insère un paiement en générant son numéro de reçu, avec retry sur
   * violation d'unicité : deux encaissements concurrents sur le même jour
   * liraient le même « dernier » numéro et la seconde insertion échouerait
   * sur l'index UNIQUE `invoice_payment.numero_recu`.
   *
   * Même technique que le générateur de reçus pharmacie.
   */
  private async insertPaymentWithRecuAuto(values: {
    invoice_id: number
    montant: number
    mode_paiement: any
    date_paiement: string
    reference?: string
    created_by?: number
  }, db: Kysely<DB> = this.db): Promise<any> {
    const day = String(values.date_paiement).slice(0, 10).replace(/-/g, '')
    const base = await this.nextRecuSequence(values.date_paiement, db)

    for (let attempt = 0; attempt < 50; attempt += 1) {
      const sequence = base + attempt
      if (sequence > 9999) break
      const numeroRecu = `R-${day}-${String(sequence).padStart(4, '0')}`
      try {
        return await db
          .insertInto('invoice_payment')
          .values({ ...values, numero_recu: numeroRecu } as any)
          .returningAll()
          .executeTakeFirstOrThrow()
      } catch (error) {
        // Collision de numéro de reçu (course concurrente) : on incrémente.
        if (!isUniqueViolation(error)) throw error
      }
    }
    throw new Error('Impossible de générer un numéro de reçu unique')
  }

  private async getItems(invoiceId: number): Promise<InvoiceItemDto[]> {
    return await this.db
      .selectFrom('invoice_item')
      .selectAll()
      .where('invoice_id', '=', invoiceId)
      .execute() as any
  }

  private async getPayments(invoiceId: number): Promise<InvoicePaymentDto[]> {
    const rows: any[] = await this.db
      .selectFrom('invoice_payment')
      .leftJoin('user', 'invoice_payment.created_by', 'user.id')
      .selectAll('invoice_payment')
      .select(['user.nom as caissier_nom_raw', 'user.prenom as caissier_prenom_raw'])
      .where('invoice_id', '=', invoiceId)
      .orderBy('date_paiement', 'asc')
      .execute() as any[]
    return rows.map((r) => ({
      id: r.id,
      invoice_id: r.invoice_id,
      montant: r.montant,
      mode_paiement: r.mode_paiement,
      date_paiement: r.date_paiement,
      reference: r.reference,
      numero_recu: r.numero_recu,
      created_by: r.created_by,
      created_at: r.created_at,
      caissier_nom: r.caissier_prenom_raw || r.caissier_nom_raw
        ? `${r.caissier_prenom_raw ?? ''} ${(r.caissier_nom_raw ?? '').toUpperCase()}`.trim()
        : undefined,
    }))
  }

  private async getTotalPaid(invoiceId: number, db: Kysely<DB> = this.db): Promise<number> {
    const result = await db
      .selectFrom('invoice_payment')
      .select(this.db.fn.sum<number>('montant').as('total'))
      .where('invoice_id', '=', invoiceId)
      .executeTakeFirst()
    return Number((result as any)?.total ?? 0)
  }
}
