import { inject, singleton } from 'tsyringe'
import { sql, type Kysely, type RawBuilder } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import type {
  CaisseParModeDto,
  CaisseParSourceDto,
  CaisseSens,
  CaisseSource,
  CaisseSyntheseDto,
} from '../dto/caisse.dto'

/** Ligne brute du UNION ALL — noms de colonnes SQL. */
interface MouvementRow {
  id: number
  source_id: number
  source: CaisseSource
  sens: CaisseSens
  mouvement_date: string
  montant: number
  mode_paiement: string | null
  reference: string | null
  facture_numero: string | null
  tiers: string | null
  libelle: string | null
}

function toAmount(value: unknown): number {
  const n = Number(value ?? 0)
  return Number.isFinite(n) ? Math.round(n) : 0
}

/**
 * Source de vérité unique de la trésorerie.
 *
 * Entrées :
 *  - `invoice_payment` (facture)
 *  - `vente_pharmacie_paiement` (pharmacie)
 *  - `apports` de type fonds propres ou dette (apport)
 *
 * Sorties :
 *  - `apport_remboursements` (remboursement d’un apport de type dette)
 *  - `salaire_paiement` (salaire)
 *  - `depense` avec `statut_paiement = 'payee'` (dépense)
 *
 * Les ventes pharmacie à crédit (delivrance sans paiement) et les dépenses à
 * crédit n'apparaissent donc jamais tant qu'elles ne sont pas encaissées /
 * payées. Toutes les méthodes dérivent du même UNION ALL.
 */
@singleton()
export class CaisseService {
  private readonly db: Kysely<DB>

  constructor(@inject(AppDatabaseDatasource) datasource: AppDatabaseDatasource) {
    this.db = datasource.getInstance()
  }

  /** Solde de caisse all-time : Σ entrées − Σ sorties. */
  async getSolde(): Promise<number> {
    const result = await sql<{ solde: number }>`
      SELECT COALESCE(
        SUM(CASE WHEN m.sens = 'entree' THEN m.montant ELSE -m.montant END),
        0
      ) AS solde
      FROM (${this.mouvementsSql()}) AS m
    `.execute(this.db)

    return toAmount(result.rows[0]?.solde)
  }

  /** Synthèse sur une période (bornes incluses, optionnelles). */
  async getSynthese(filtres: { dateDebut?: string; dateFin?: string } = {}): Promise<CaisseSyntheseDto> {
    this.assertDate(filtres.dateDebut, 'Date de début')
    this.assertDate(filtres.dateFin, 'Date de fin')
    this.assertRange(filtres.dateDebut, filtres.dateFin)

    const where = this.buildWhere(filtres)

    const [totals, parSourceRows, parModeRows] = await Promise.all([
      sql<{ entrees: number; sorties: number; count: number }>`
        SELECT
          COALESCE(SUM(CASE WHEN m.sens = 'entree' THEN m.montant ELSE 0 END), 0) AS entrees,
          COALESCE(SUM(CASE WHEN m.sens = 'sortie' THEN m.montant ELSE 0 END), 0) AS sorties,
          COUNT(*) AS count
        FROM (${this.mouvementsSql()}) AS m
        ${where}
      `.execute(this.db),
      sql<{ source: CaisseSource; entrees: number; sorties: number; count: number }>`
        SELECT
          m.source AS source,
          COALESCE(SUM(CASE WHEN m.sens = 'entree' THEN m.montant ELSE 0 END), 0) AS entrees,
          COALESCE(SUM(CASE WHEN m.sens = 'sortie' THEN m.montant ELSE 0 END), 0) AS sorties,
          COUNT(*) AS count
        FROM (${this.mouvementsSql()}) AS m
        ${where}
        GROUP BY m.source
        ORDER BY m.source ASC
      `.execute(this.db),
      sql<{ mode: string | null; sens: CaisseSens; total: number; count: number }>`
        SELECT
          m.mode_paiement AS mode,
          m.sens AS sens,
          COALESCE(SUM(m.montant), 0) AS total,
          COUNT(*) AS count
        FROM (${this.mouvementsSql()}) AS m
        ${where}
        GROUP BY m.mode_paiement, m.sens
        ORDER BY m.mode_paiement ASC, m.sens ASC
      `.execute(this.db),
    ])

    const entrees = toAmount(totals.rows[0]?.entrees)
    const sorties = toAmount(totals.rows[0]?.sorties)

    const parSource: CaisseParSourceDto[] = parSourceRows.rows.map((row) => {
      const sourceEntrees = toAmount(row.entrees)
      const sourceSorties = toAmount(row.sorties)
      return {
        source: row.source,
        entrees: sourceEntrees,
        sorties: sourceSorties,
        solde: sourceEntrees - sourceSorties,
        count: toAmount(row.count),
      }
    })

    const parMode: CaisseParModeDto[] = parModeRows.rows.map((row) => ({
      mode: row.mode ?? null,
      sens: row.sens,
      total: toAmount(row.total),
      count: toAmount(row.count),
    }))

    return {
      dateDebut: filtres.dateDebut,
      dateFin: filtres.dateFin,
      entrees,
      sorties,
      solde: entrees - sorties,
      count: toAmount(totals.rows[0]?.count),
      parSource,
      parMode,
    }
  }

  /**
   * UNION ALL unique : entrées facture + pharmacie, sorties salaire + dépense.
   * Les dates sont normalisées en YYYY-MM-DD (`substr`) pour que les filtres
   * inclusifs fonctionnent aussi avec des horodatages ISO.
   */
  private mouvementsSql(): RawBuilder<MouvementRow> {
    return sql<MouvementRow>`
      SELECT
        ip.id AS id,
        ip.id AS source_id,
        'facture' AS source,
        'entree' AS sens,
        substr(ip.date_paiement, 1, 10) AS mouvement_date,
        ip.montant AS montant,
        ip.mode_paiement AS mode_paiement,
        ip.numero_recu AS reference,
        i.numero AS facture_numero,
        TRIM(COALESCE(p.prenom, '') || ' ' || COALESCE(p.nom, '')) AS tiers,
        NULL AS libelle
      FROM invoice_payment ip
      INNER JOIN invoice i ON i.id = ip.invoice_id
      INNER JOIN patient p ON p.id = i.patient_id

      UNION ALL

      SELECT
        vpp.id AS id,
        vpp.id AS source_id,
        'pharmacie' AS source,
        'entree' AS sens,
        substr(vpp.date_paiement, 1, 10) AS mouvement_date,
        vpp.montant AS montant,
        vpp.mode_paiement AS mode_paiement,
        vpp.numero_recu AS reference,
        NULL AS facture_numero,
        TRIM(COALESCE(p.prenom, '') || ' ' || COALESCE(p.nom, '')) AS tiers,
        NULL AS libelle
      FROM vente_pharmacie_paiement vpp
      INNER JOIN delivrances d ON d.id = vpp.delivrance_id
      INNER JOIN patient p ON p.id = d.patient_id

      UNION ALL

      SELECT
        lp.id AS id,
        lp.id AS source_id,
        'laboratoire' AS source,
        'entree' AS sens,
        substr(lp.date_paiement, 1, 10) AS mouvement_date,
        lp.montant AS montant,
        lp.mode_paiement AS mode_paiement,
        lp.reference AS reference,
        NULL AS facture_numero,
        TRIM(COALESCE(er.externe_prenom, '') || ' ' || COALESCE(er.externe_nom, '') || COALESCE(
          (SELECT TRIM(COALESCE(p.prenom, '') || ' ' || COALESCE(p.nom, ''))
           FROM patient p WHERE p.id = er.patient_id), ''
        )) AS tiers,
        'Laboratoire — ' || COALESCE(er.numero, '') AS libelle
      FROM labo_paiements lp
      INNER JOIN exam_requests er ON er.id = lp.exam_request_id

      UNION ALL

      SELECT
        a.id AS id,
        a.id AS source_id,
        'apport' AS source,
        'entree' AS sens,
        substr(a.date_apport, 1, 10) AS mouvement_date,
        a.montant AS montant,
        a.mode_paiement AS mode_paiement,
        a.reference AS reference,
        NULL AS facture_numero,
        NULL AS tiers,
        a.libelle AS libelle
      FROM apports a
      WHERE a.statut <> 'annule'

      UNION ALL

      SELECT
        ar.id AS id,
        ar.id AS source_id,
        'apport_remboursement' AS source,
        'sortie' AS sens,
        substr(ar.date_remboursement, 1, 10) AS mouvement_date,
        ar.montant AS montant,
        ar.mode_paiement AS mode_paiement,
        ar.reference AS reference,
        NULL AS facture_numero,
        a.reference AS tiers,
        'Remboursement — ' || a.libelle AS libelle
      FROM apport_remboursements ar
      INNER JOIN apports a ON a.id = ar.apport_id
      WHERE a.statut <> 'annule'

      UNION ALL

      SELECT
        sp.id AS id,
        sp.id AS source_id,
        'salaire' AS source,
        'sortie' AS sens,
        substr(sp.date_paiement, 1, 10) AS mouvement_date,
        sp.montant_net AS montant,
        sp.mode_paiement AS mode_paiement,
        sp.reference AS reference,
        NULL AS facture_numero,
        TRIM(COALESCE(u.prenom, '') || ' ' || COALESCE(u.nom, '')) AS tiers,
        NULL AS libelle
      FROM salaire_paiement sp
      INNER JOIN user u ON u.id = sp.user_id

      UNION ALL

      SELECT
        dep.id AS id,
        dep.id AS source_id,
        'depense' AS source,
        'sortie' AS sens,
        substr(COALESCE(dep.date_paiement, dep.date), 1, 10) AS mouvement_date,
        dep.montant AS montant,
        dep.mode_paiement AS mode_paiement,
        dep.reference AS reference,
        NULL AS facture_numero,
        dc.nom AS tiers,
        dep.libelle AS libelle
      FROM depense dep
      INNER JOIN depense_categorie dc ON dc.id = dep.categorie_id
      WHERE dep.statut_paiement = 'payee'
    `
  }

  private buildWhere(filtres: {
    dateDebut?: string
    dateFin?: string
    source?: string
    mode?: string
    sens?: string
  }): RawBuilder<unknown> {
    const conditions: RawBuilder<unknown>[] = []

    if (filtres.dateDebut) conditions.push(sql`m.mouvement_date >= ${filtres.dateDebut}`)
    if (filtres.dateFin) conditions.push(sql`m.mouvement_date <= ${filtres.dateFin}`)
    if (filtres.source) conditions.push(sql`m.source = ${filtres.source}`)
    if (filtres.mode) conditions.push(sql`m.mode_paiement = ${filtres.mode}`)
    if (filtres.sens) conditions.push(sql`m.sens = ${filtres.sens}`)

    if (conditions.length === 0) return sql``
    return sql`WHERE ${sql.join(conditions, sql` AND `)}`
  }

  private assertDate(value: string | undefined, label: string): void {
    if (value == null || value === '') return
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
      throw new Error(`${label} invalide (format YYYY-MM-DD attendu)`)
    }
  }

  private assertRange(dateDebut?: string, dateFin?: string): void {
    if (dateDebut && dateFin && dateDebut > dateFin) {
      throw new Error('La date de début doit précéder la date de fin')
    }
  }
}
