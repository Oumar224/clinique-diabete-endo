import { inject, singleton } from 'tsyringe'
import type { Kysely } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import { InvoiceEntity } from '../entities/invoice.entity'
import type { InvoiceDto, InvoiceItemDto, InvoicePaymentDto, InvoiceCreateDto, InvoiceStatsDto } from '../dto/invoice.dto'

@singleton()
export class InvoiceService {
  public db: Kysely<DB>

  constructor(@inject(AppDatabaseDatasource) datasource: AppDatabaseDatasource) {
    this.db = datasource.getInstance()
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
      .selectAll('invoice')
      .select(['patient.nom as patient_nom', 'patient.prenom as patient_prenom'])
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
      )
    )
  }

  async getById(id: number): Promise<InvoiceDto | null> {
    const row: any = await this.db
      .selectFrom('invoice')
      .innerJoin('patient', 'invoice.patient_id', 'patient.id')
      .selectAll('invoice')
      .select(['patient.nom as patient_nom', 'patient.prenom as patient_prenom'])
      .where('invoice.id', '=', id)
      .executeTakeFirst()

    if (!row) return null

    const items = await this.getItems(id)
    const payments = await this.getPayments(id)

    return InvoiceEntity.toDto(
      row as InvoiceEntity,
      items,
      payments,
      row.patient_nom,
      row.patient_prenom,
    )
  }

  async getByPatient(patientId: number): Promise<InvoiceDto[]> {
    const rows: any[] = await this.db
      .selectFrom('invoice')
      .innerJoin('patient', 'invoice.patient_id', 'patient.id')
      .selectAll('invoice')
      .select(['patient.nom as patient_nom', 'patient.prenom as patient_prenom'])
      .where('invoice.patient_id', '=', patientId)
      .orderBy('invoice.date', 'desc')
      .execute()

    return rows.map((row: any) =>
      InvoiceEntity.toDto(
        row as InvoiceEntity,
        undefined,
        undefined,
        row.patient_nom,
        row.patient_prenom,
      )
    )
  }

  async create(dto: InvoiceCreateDto): Promise<InvoiceDto> {
    const dateStr = dto.date
    const numero = await this.generateNumero(dateStr)
    const montantTotal = dto.items.reduce((sum, item) => sum + item.montant, 0)

    const result = await this.db
      .insertInto('invoice')
      .values({
        numero,
        patient_id: dto.patient_id,
        date: dateStr,
        montant_total: montantTotal,
        montant_restant: montantTotal,
        status: 'en_attente',
        notes: dto.notes ?? undefined,
        created_by: dto.created_by ?? undefined,
      })
      .returningAll()
      .executeTakeFirst()

    if (!result) throw new Error('Échec de la création de la facture')

    for (const item of dto.items) {
      await this.db
        .insertInto('invoice_item')
        .values({
          invoice_id: result.id!,
          libelle: item.libelle,
          quantite: item.quantite,
          prix_unitaire: item.prix_unitaire,
          montant: item.montant,
          type: item.type,
        })
        .execute()
    }

    return (await this.getById(result.id!))!
  }

  async update(id: number, data: { notes?: string; status?: string }): Promise<InvoiceDto> {
    const existing = await this.db
      .selectFrom('invoice')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst()
    if (!existing) throw new Error('Facture introuvable')

    const updateData: any = {}
    if (data.notes !== undefined) updateData.notes = data.notes
    if (data.status !== undefined) updateData.status = data.status

    if (Object.keys(updateData).length > 0) {
      await this.db
        .updateTable('invoice')
        .set(updateData)
        .where('id', '=', id)
        .execute()
    }

    return (await this.getById(id))!
  }

  async addPayment(payment: InvoicePaymentDto): Promise<InvoiceDto> {
    const invoice = await this.db
      .selectFrom('invoice')
      .selectAll()
      .where('id', '=', payment.invoice_id!)
      .executeTakeFirst()
    if (!invoice) throw new Error('Facture introuvable')

    await this.db
      .insertInto('invoice_payment')
      .values({
        invoice_id: payment.invoice_id!,
        montant: payment.montant,
        mode_paiement: payment.mode_paiement,
        date_paiement: payment.date_paiement,
        reference: payment.reference ?? undefined,
        created_by: payment.created_by ?? undefined,
      })
      .execute()

    const totalPaye = await this.getTotalPaid(payment.invoice_id!)
    const montantRestant = Math.max(0, invoice.montant_total! - totalPaye)

    let newStatus: 'payé' | 'en_attente' | 'annulé' | 'partiel'
    if (montantRestant <= 0) {
      newStatus = 'payé'
    } else if (totalPaye > 0) {
      newStatus = 'partiel'
    } else {
      newStatus = 'en_attente'
    }

    await this.db
      .updateTable('invoice')
      .set({ montant_restant: montantRestant, status: newStatus })
      .where('id', '=', payment.invoice_id!)
      .execute()

    return (await this.getById(payment.invoice_id!))!
  }

  async getStats(): Promise<InvoiceStatsDto> {
    const today = new Date().toISOString().slice(0, 10)
    const monthStart = new Date()
    monthStart.setDate(1)
    const monthStartStr = monthStart.toISOString().slice(0, 10)

    const caJour = await this.db
      .selectFrom('invoice')
      .selectAll('invoice')
      .where('invoice.date', '=', today)
      .where('invoice.status', '=', 'payé')
      .execute()

    const caJourTotal = caJour.reduce((sum: number, inv: any) => sum + (inv.montant_total ?? 0), 0)

    const enAttente = await this.db
      .selectFrom('invoice')
      .selectAll('invoice')
      .where('invoice.status', 'in', ['en_attente', 'partiel'])
      .execute()

    const enAttenteTotal = enAttente.reduce((sum: number, inv: any) => sum + (inv.montant_restant ?? 0), 0)

    const nbMois = await this.db
      .selectFrom('invoice')
      .select(this.db.fn.countAll<number>().as('count'))
      .where('invoice.date', '>=', monthStartStr)
      .executeTakeFirst()

    const payeMois = await this.db
      .selectFrom('invoice_payment')
      .selectAll()
      .where('invoice_payment.date_paiement', '>=', monthStartStr)
      .execute()

    const totalPayeMois = payeMois.reduce((sum: number, p: any) => sum + (p.montant ?? 0), 0)

    const totalDuMois = await this.db
      .selectFrom('invoice')
      .selectAll()
      .where('invoice.date', '>=', monthStartStr)
      .execute()

    const totalDuMoisMontant = totalDuMois.reduce((sum: number, inv: any) => sum + (inv.montant_total ?? 0), 0)

    const taux = totalDuMoisMontant > 0 ? (totalPayeMois / totalDuMoisMontant) * 100 : 0

    return {
      ca_jour: caJourTotal,
      en_attente: enAttenteTotal,
      nb_mois: nbMois?.count ?? 0,
      taux_encaissement: Math.round(taux),
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

  private async getItems(invoiceId: number): Promise<InvoiceItemDto[]> {
    return await this.db
      .selectFrom('invoice_item')
      .selectAll()
      .where('invoice_id', '=', invoiceId)
      .execute() as any
  }

  private async getPayments(invoiceId: number): Promise<InvoicePaymentDto[]> {
    return await this.db
      .selectFrom('invoice_payment')
      .selectAll()
      .where('invoice_id', '=', invoiceId)
      .orderBy('date_paiement', 'asc')
      .execute() as any
  }

  private async getTotalPaid(invoiceId: number): Promise<number> {
    const result = await this.db
      .selectFrom('invoice_payment')
      .select(this.db.fn.sum<number>('montant').as('total'))
      .where('invoice_id', '=', invoiceId)
      .executeTakeFirst()
    return (result as any)?.total ?? 0
  }
}
