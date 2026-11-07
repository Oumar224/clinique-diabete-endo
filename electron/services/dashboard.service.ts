import { inject, singleton } from 'tsyringe'
import type { Kysely } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import type { DashboardStatsDto, DashboardStatsParams } from '../dto/dashboard.dto'

const toISODate = (d: Date) => d.toISOString().slice(0, 10)

@singleton()
export class DashboardService {
  public db: Kysely<DB>

  constructor(@inject(AppDatabaseDatasource) datasource: AppDatabaseDatasource) {
    this.db = datasource.getInstance()
  }

  async getStats(params?: DashboardStatsParams): Promise<DashboardStatsDto> {
    const today = new Date()
    const todayStr = toISODate(today)
    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - 6)
    const weekStartStr = toISODate(weekStart)
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const monthStartStr = toISODate(monthStart)

    const dateDebut = params?.date_debut || monthStartStr
    const dateFin = params?.date_fin || todayStr
    // Fenêtre « mois » : si le caller fournit une période explicite, elle
    // fait foi (le tableau de bord affiche alors la période sélectionnée).
    const moisDebut = params?.date_debut || monthStartStr
    const moisFin = params?.date_fin || todayStr
    const medecinId = params?.medecin_id

    // ─── Facturation (CA jour / semaine / mois / période) ───
    const sumInvoices = async (from: string, to: string): Promise<number> => {
      const q = this.db
        .selectFrom('invoice')
        .select(['montant_total'])
        .where('invoice.date', '>=', from)
        .where('invoice.date', '<=', to)
        .where('invoice.status', '!=', 'annulé')
      const rows = await q.execute()
      return rows.reduce((s: number, r: any) => s + (r.montant_total ?? 0), 0)
    }
    const sumPayments = async (from: string, to: string): Promise<number> => {
      const rows: any[] = await this.db
        .selectFrom('invoice_payment')
        .select(['date_paiement', 'montant'])
        .where('invoice_payment.date_paiement', '>=', from)
        .execute()
      return rows
        .filter((p) => {
          const d = String(p.date_paiement ?? '').slice(0, 10)
          return d >= from && d <= to
        })
        .reduce((s, p) => s + (p.montant ?? 0), 0)
    }

    const [
      caFactureJour,
      caSemaine,
      caFactureMois,
      caPeriode,
      caJour,
      caMois,
      encaissePeriode,
    ] = await Promise.all([
      // Facturé (le CA comptable) …
      sumInvoices(todayStr, todayStr),
      sumInvoices(weekStartStr, todayStr),
      sumInvoices(moisDebut, moisFin),
      sumInvoices(dateDebut, dateFin),
      // … et réellement encaissé (trésorerie).
      sumPayments(todayStr, todayStr),
      sumPayments(moisDebut, moisFin),
      sumPayments(dateDebut, dateFin),
    ])

    const enAttenteRows: any[] = await this.db
      .selectFrom('invoice')
      .select(['montant_restant'])
      .where('invoice.status', 'in', ['en_attente', 'partiel'])
      .execute()
    const resteARecouvrer = enAttenteRows.reduce((s, r) => s + (r.montant_restant ?? 0), 0)
    // Taux d'encaissement de la PÉRIODE : jamais > 100 % (un encaissement
    // d'une facture antérieure ne doit pas gonfler l'indicateur).
    const tauxEncaissement = caPeriode > 0
      ? Math.min(100, Math.max(0, Math.round((encaissePeriode / caPeriode) * 100)))
      : 0

    // Série CA 30j
    const start30 = new Date(today)
    start30.setDate(today.getDate() - 29)
    const start30Str = toISODate(start30)
    const invoices30: any[] = await this.db
      .selectFrom('invoice')
      .select(['date', 'montant_total'])
      .where('date', '>=', start30Str)
      .where('date', '<=', todayStr)
      .where('status', '!=', 'annulé')
      .execute()
    const payments30: any[] = await this.db
      .selectFrom('invoice_payment')
      .select(['date_paiement', 'montant'])
      .where('date_paiement', '>=', start30Str)
      .execute()
    const serie30j = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(start30)
      d.setDate(start30.getDate() + i)
      const key = toISODate(d)
      return {
        date: key,
        montant: invoices30
          .filter((inv) => String(inv.date).slice(0, 10) === key)
          .reduce((s, inv) => s + (inv.montant_total ?? 0), 0),
        encaisse: payments30
          .filter((p) => String(p.date_paiement ?? '').slice(0, 10) === key)
          .reduce((s, p) => s + (p.montant ?? 0), 0),
      }
    })

    // ─── Patients ───
    const totalPatientsRow = await this.db
      .selectFrom('patient')
      .select(this.db.fn.countAll<number>().as('count'))
      .executeTakeFirst()
    const todayStartISO = `${todayStr}T00:00:00`
    const nouveauxJourRow = await this.db
      .selectFrom('patient')
      .select(this.db.fn.countAll<number>().as('count'))
      .where('created_at', '>=', todayStartISO)
      .executeTakeFirst()
      .catch(() => ({ count: 0 }) as any)
    const nouveauxPeriodeRow = await this.db
      .selectFrom('patient')
      .select(this.db.fn.countAll<number>().as('count'))
      .where('created_at', '>=', `${dateDebut}T00:00:00`)
      .where('created_at', '<=', `${dateFin}T23:59:59.999`)
      .executeTakeFirst()
      .catch(() => ({ count: 0 }) as any)
    const recents: any[] = await this.db
      .selectFrom('patient')
      .select(['id', 'nom', 'prenom', 'created_at'])
      .orderBy('created_at', 'desc')
      .orderBy('id', 'desc')
      .limit(5)
      .execute()
      .catch(() => [])

    // ─── Rendez-vous ───
    const countRdv = async (from: string, to: string, onlyMedecin = false): Promise<number> => {
      let q = this.db
        .selectFrom('appointment')
        .select(this.db.fn.countAll<number>().as('count'))
        .where('appointment.date', '>=', from)
        .where('appointment.date', '<=', to)
      if (onlyMedecin && medecinId) q = q.where('appointment.medecin_id', '=', medecinId) as typeof q
      const row = await q.executeTakeFirst()
      return Number(row?.count ?? 0)
    }
    const [rdvJour, rdvSemaine, rdvPeriode] = await Promise.all([
      countRdv(todayStr, todayStr),
      countRdv(weekStartStr, todayStr),
      countRdv(dateDebut, dateFin),
    ])

    let statutRows: any[] = []
    try {
      const q = this.db
        .selectFrom('appointment')
        .select(['status', this.db.fn.countAll<number>().as('count')])
        .where('appointment.date', '>=', dateDebut)
        .where('appointment.date', '<=', dateFin)
        .groupBy('status')
      statutRows = await q.execute()
    } catch {
      statutRows = []
    }
    const parStatut: Record<string, number> = {}
    for (const r of statutRows) parStatut[String(r.status)] = Number(r.count ?? 0)
    const done = parStatut['done'] ?? 0
    const cancelled = parStatut['cancelled'] ?? 0
    const terminés = done + cancelled
    const tauxPresence = terminés > 0 ? Math.round((done / terminés) * 100) : 0

    // RDV par jour sur la période (pour le Bar chart)
    const rdvPeriodeRows: any[] = await this.db
      .selectFrom('appointment')
      .select(['date'])
      .where('appointment.date', '>=', dateDebut)
      .where('appointment.date', '<=', dateFin)
      .execute()
      .catch(() => [])
    const perDayMap = new Map<string, number>()
    for (const r of rdvPeriodeRows) {
      const key = String(r.date).slice(0, 10)
      perDayMap.set(key, (perDayMap.get(key) ?? 0) + 1)
    }
    const parJour = Array.from(perDayMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14)

    // Prochains RDV (aujourd'hui et futur, 8 premiers)
    let prochains: DashboardStatsDto['rendez_vous']['prochains'] = []
    try {
      const q = this.db
        .selectFrom('appointment')
        .leftJoin('patient', 'patient.id', 'appointment.patient_id')
        .leftJoin('user', 'user.id', 'appointment.medecin_id')
        .select([
          'appointment.id',
          'appointment.date',
          'appointment.time',
          'appointment.motif',
          'appointment.status',
          'appointment.medecin_id',
          'appointment.patient_id',
          'patient.nom as patient_nom',
        ])
        .where('appointment.date', '>=', todayStr)
        .orderBy('appointment.date', 'asc')
        .orderBy('appointment.time', 'asc')
        .limit(8)
      const rows: any[] = await q.execute()
      prochains = rows.map((r) => ({
        id: r.id,
        date: r.date,
        time: r.time,
        motif: r.motif,
        status: r.status,
        medecin_id: r.medecin_id,
        medecin_name: r.medecin_name ?? undefined,
        patient_id: r.patient_id,
        patient_nom: r.patient_nom
          ? `${r.patient_nom} ${r.patient_prenom ?? ''}`.trim()
          : undefined,
      }))
    } catch {
      prochains = []
    }

    // ─── Consultations (encounters) ───
    const consultationsJourRow = await this.db
      .selectFrom('encounters')
      .select(this.db.fn.countAll<number>().as('count'))
      .where('start_date', '>=', `${todayStr}T00:00:00`)
      .where('start_date', '<=', `${todayStr}T23:59:59.999`)
      .executeTakeFirst()
      .catch(() => ({ count: 0 }) as any)
    const consultationsPeriodeRow = await this.db
      .selectFrom('encounters')
      .select(this.db.fn.countAll<number>().as('count'))
      .where('start_date', '>=', `${dateDebut}T00:00:00`)
      .where('start_date', '<=', `${dateFin}T23:59:59.999`)
      .executeTakeFirst()
      .catch(() => ({ count: 0 }) as any)

    // ─── Top actes ───
    let topActes: DashboardStatsDto['top_actes'] = []
    try {
      const rows: any[] = await this.db
        .selectFrom('invoice_item')
        .innerJoin('invoice', 'invoice.id', 'invoice_item.invoice_id')
        .select([
          'invoice_item.libelle as libelle',
          'invoice_item.type as type',
          this.db.fn.sum<number>('invoice_item.montant').as('montant'),
          this.db.fn.sum<number>('invoice_item.quantite').as('quantite'),
        ])
        .where('invoice.status', '!=', 'annulé')
        .where('invoice.date', '>=', dateDebut)
        .where('invoice.date', '<=', dateFin)
        .groupBy(['invoice_item.libelle', 'invoice_item.type'])
        .orderBy('montant', 'desc')
        .limit(5)
        .execute()
      topActes = rows.map((r) => ({
        libelle: r.libelle ?? '—',
        type: r.type,
        montant: Number(r.montant ?? 0),
        quantite: Number(r.quantite ?? 0),
      }))
    } catch {
      topActes = []
    }

    return {
      periode: { date_debut: dateDebut, date_fin: dateFin },
      ca: {
        // Champs historiques : FACTURÉ (conservés pour le renderer existant).
        jour: caFactureJour,
        semaine: caSemaine,
        mois: caFactureMois,
        periode: caPeriode,
        // Nouveaux champs explicites.
        ca_facture_jour: caFactureJour,
        ca_facture_mois: caFactureMois,
        ca_jour: caJour,
        ca_mois: caMois,
        encaisse_periode: encaissePeriode,
        taux_encaissement: tauxEncaissement,
        reste_a_recouvrer: resteARecouvrer,
        serie_30j: serie30j,
      },
      patients: {
        total: Number(totalPatientsRow?.count ?? 0),
        nouveaux_jour: Number((nouveauxJourRow as any)?.count ?? 0),
        nouveaux_periode: Number((nouveauxPeriodeRow as any)?.count ?? 0),
        recents: recents.map((r) => ({
          id: r.id,
          nom: r.nom,
          prenom: r.prenom,
          created_at: r.created_at,
        })),
      },
      rendez_vous: {
        jour: rdvJour,
        semaine: rdvSemaine,
        total_periode: rdvPeriode,
        taux_presence: tauxPresence,
        par_jour: parJour,
        par_statut: parStatut,
        prochains,
      },
      consultations: {
        jour: Number((consultationsJourRow as any)?.count ?? 0),
        periode: Number((consultationsPeriodeRow as any)?.count ?? 0),
      },
      top_actes: topActes,
    }
  }
}
