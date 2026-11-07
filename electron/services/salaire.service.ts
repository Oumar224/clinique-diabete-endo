import { inject, singleton } from 'tsyringe'
import { type Kysely, type Transaction, sql } from 'kysely'
import { AppDatabaseDatasource } from '../sqlite-data-source'
import type { DB } from '../entities/database'
import { CaisseService } from './caisse.service'
import type { ModePaiement } from '../dto/invoice.dto'
import type {
  PayerBulkResultDto,
  SalaireConfigCreateDto,
  SalaireConfigDto,
  SalaireConfigRubriqueCreateDto,
  SalaireConfigRubriqueDto,
  SalaireConfigRowDto,
  SalaireHistoriqueFiltres,
  SalaireHistoriqueRowDto,
  SalairePaieRowDto,
  SalairePaiementDto,
  SalairePayerBulkDto,
  SalairePayslipDto,
  SalairePayerDto,
  SalaireRubriqueDto,
} from '../dto/salaire.dto'
import type {
  SalaireConfigEntity,
  SalaireConfigRubriqueEntity,
  SalairePaiementEntity,
} from '../entities/salaire.entity'

type DbExecutor = Kysely<DB> | Transaction<DB>

const MODES_PAIEMENT: readonly ModePaiement[] = [
  'espèces',
  'carte_bancaire',
  'chèque',
  'virement',
  'mobile_money',
  'assurance',
  'autre',
]

const PERIODE_RE = /^\d{4}-(0[1-9]|1[0-2])$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function isUniqueViolation(error: unknown): boolean {
  if ((error as { code?: string })?.code === 'SQLITE_CONSTRAINT_UNIQUE') return true
  return /UNIQUE constraint failed/i.test((error as Error)?.message ?? '')
}

function assertPeriode(periode: unknown): string {
  if (typeof periode !== 'string' || !PERIODE_RE.test(periode)) {
    throw new Error('Période invalide (format attendu AAAA-MM)')
  }
  return periode
}

function assertDate(value: unknown, field: string): string {
  if (typeof value !== 'string' || !DATE_RE.test(value)) {
    throw new Error(`${field} invalide (format attendu AAAA-MM-JJ)`)
  }
  return value
}

function assertUserId(value: unknown): number {
  const id = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value
  if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0) {
    throw new Error('Utilisateur invalide')
  }
  return id
}

function assertMode(value: unknown): ModePaiement {
  if (typeof value !== 'string' || !MODES_PAIEMENT.includes(value as ModePaiement)) {
    throw new Error('Mode de paiement invalide')
  }
  return value as ModePaiement
}

/** Arrondit un montant GNF entier et refuse les valeurs non finies ou négatives. */
function roundAmount(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${field} doit être un nombre fini`)
  }
  const rounded = Math.round(value)
  if (rounded < 0) throw new Error(`${field} ne peut pas être négatif`)
  return rounded
}

function roundJours(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error('Jours travaillés invalides')
  }
  const rounded = Math.round(value)
  if (rounded < 0 || rounded > 31) {
    throw new Error('Jours travaillés doit être compris entre 0 et 31')
  }
  return rounded
}

/** Jours explicites d'une rubrique journalière (0-31). */
function roundJoursForRubrique(value: unknown, libelle: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Rubrique « ${libelle} » : jours invalides`)
  }
  const rounded = Math.round(value)
  if (rounded < 0 || rounded > 31) {
    throw new Error(`Rubrique « ${libelle} » : jours doit être compris entre 0 et 31`)
  }
  return rounded
}

function previousPeriode(periode: string): string {
  const [year, month] = periode.split('-').map(Number)
  const d = new Date(Date.UTC(year, month - 2, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

interface NormalizedRubrique {
  libelle: string
  type: 'fixe' | 'journalier'
  montant: number
  montant_jour: number | null
  jours: number | null
  impact_net: number
  ordre: number
}

function normalizeRubriques(input: SalaireConfigRubriqueCreateDto[] | undefined): NormalizedRubrique[] {
  if (input == null) return []
  if (!Array.isArray(input)) throw new Error('Les rubriques doivent être une liste')

  return input.map((rubrique, index) => {
    const libelle = typeof rubrique?.libelle === 'string' ? rubrique.libelle.trim() : ''
    if (!libelle) throw new Error(`Rubrique ${index + 1} : libellé requis`)

    const type = rubrique.type
    if (type !== 'fixe' && type !== 'journalier') {
      throw new Error(`Rubrique « ${libelle} » : type invalide (fixe ou journalier)`)
    }

    let montant = 0
    let montantJour: number | null = null
    let jours: number | null = null
    if (type === 'fixe') {
      if (rubrique.montant == null) {
        throw new Error(`Rubrique « ${libelle} » : montant requis pour une rubrique fixe`)
      }
      montant = roundAmount(rubrique.montant, `Montant de « ${libelle} »`)
    } else {
      if (rubrique.montantJour == null) {
        throw new Error(`Rubrique « ${libelle} » : montantJour requis pour une rubrique journalier`)
      }
      montantJour = roundAmount(rubrique.montantJour, `Montant journalier de « ${libelle} »`)
      montant = rubrique.montant == null ? 0 : roundAmount(rubrique.montant, `Montant de « ${libelle} »`)
      if (rubrique.jours != null) {
        jours = roundJoursForRubrique(rubrique.jours, libelle)
      }
    }

    if (rubrique.impactNet !== undefined && typeof rubrique.impactNet !== 'boolean') {
      throw new Error(`Rubrique « ${libelle} » : impactNet doit être un booléen`)
    }

    let ordre = index
    if (rubrique.ordre !== undefined) {
      if (typeof rubrique.ordre !== 'number' || !Number.isFinite(rubrique.ordre)) {
        throw new Error(`Rubrique « ${libelle} » : ordre invalide`)
      }
      ordre = Math.round(rubrique.ordre)
      if (ordre < 0) throw new Error(`Rubrique « ${libelle} » : ordre ne peut pas être négatif`)
    }

    return {
      libelle,
      type,
      montant,
      montant_jour: montantJour,
      jours,
      impact_net: rubrique.impactNet === false ? 0 : 1,
      ordre,
    }
  })
}

/**
 * Net = base + Σ(rubriques fixes impactant le net)
 *            + Σ(montant journalier × jours travaillés impactant le net).
 * Tous les montants sont des entiers GNF.
 */
export function computeSalaireNet(
  config: Pick<SalaireConfigDto, 'base' | 'joursTravailles' | 'rubriques'>,
): number {
  const base = Number(config.base ?? 0)
  const jours = Number(config.joursTravailles ?? 0)
  let net = Number.isFinite(base) ? base : 0

  for (const rubrique of config.rubriques ?? []) {
    if (rubrique.impactNet === false) continue
    if (rubrique.type === 'fixe') {
      const montant = Number(rubrique.montant ?? 0)
      if (Number.isFinite(montant)) net += montant
    } else if (rubrique.type === 'journalier') {
      const montantJour = Number(rubrique.montantJour ?? 0)
      const joursRubrique = rubrique.jours == null ? jours : Number(rubrique.jours)
      if (Number.isFinite(montantJour) && Number.isFinite(joursRubrique)) {
        net += montantJour * joursRubrique
      }
    }
  }

  return Math.round(net)
}

@singleton()
export class SalaireService {
  public db: Kysely<DB>

  constructor(
    @inject(AppDatabaseDatasource) datasource: AppDatabaseDatasource,
    @inject(CaisseService) private caisseService: CaisseService,
  ) {
    this.db = datasource.getInstance()
  }

  /**
   * Employés = utilisateurs actifs dont le rôle n'est pas ADMIN.
   * `is_active` vaut 1 par défaut ; NULL est considéré comme actif.
   */
  private async listEmployees(executor: DbExecutor): Promise<Array<{
    userId: number
    nom: string
    prenom: string
    role: string
  }>> {
    const rows = await executor
      .selectFrom('user')
      .select(['id', 'nom', 'prenom', 'role', 'is_active'])
      .where('role', '!=', 'ADMIN')
      .orderBy('nom', 'asc')
      .orderBy('prenom', 'asc')
      .execute()

    return rows
      .filter((row) => row.is_active !== 0)
      .map((row) => ({
        userId: row.id as number,
        nom: String(row.nom ?? ''),
        prenom: String(row.prenom ?? ''),
        role: String(row.role ?? ''),
      }))
  }

  private mapRubrique(row: SalaireConfigRubriqueEntity): SalaireConfigRubriqueDto {
    return {
      id: row.id,
      configId: row.config_id,
      libelle: row.libelle,
      type: row.type as SalaireConfigRubriqueDto['type'],
      montant: row.montant ?? 0,
      montantJour: row.montant_jour ?? null,
      jours: row.jours ?? null,
      impactNet: row.impact_net === 1,
      ordre: row.ordre ?? 0,
      createdAt: row.created_at,
    }
  }

  private mapConfig(
    row: SalaireConfigEntity,
    rubriques: SalaireConfigRubriqueEntity[],
  ): SalaireConfigDto {
    return {
      id: row.id,
      userId: row.user_id,
      periode: row.periode,
      base: row.base ?? 0,
      joursTravailles: row.jours_travailles ?? 0,
      createdBy: row.created_by ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      rubriques: rubriques.map((rubrique) => this.mapRubrique(rubrique)),
    }
  }

  private mapPaiement(row: SalairePaiementEntity): SalairePaiementDto {
    return {
      id: row.id,
      userId: row.user_id,
      periode: row.periode,
      montantNet: row.montant_net ?? 0,
      modePaiement: row.mode_paiement as ModePaiement,
      datePaiement: row.date_paiement,
      reference: row.reference ?? undefined,
      details: row.details ?? undefined,
      createdBy: row.created_by ?? undefined,
      createdAt: row.created_at,
    }
  }

  private async loadConfigs(executor: DbExecutor, periode: string): Promise<Map<number, SalaireConfigDto>> {
    const configs = await executor
      .selectFrom('salaire_config')
      .selectAll()
      .where('periode', '=', periode)
      .execute()
    if (configs.length === 0) return new Map()

    const ids = configs.map((config) => config.id as number)
    const rubriques = await executor
      .selectFrom('salaire_config_rubrique')
      .selectAll()
      .where('config_id', 'in', ids)
      .orderBy('ordre', 'asc')
      .orderBy('id', 'asc')
      .execute()

    const byConfig = new Map<number, SalaireConfigRubriqueEntity[]>()
    for (const rubrique of rubriques) {
      const list = byConfig.get(rubrique.config_id as number) ?? []
      list.push(rubrique)
      byConfig.set(rubrique.config_id as number, list)
    }

    return new Map(
      configs.map((config) => [
        config.user_id as number,
        this.mapConfig(config, byConfig.get(config.id as number) ?? []),
      ]),
    )
  }

  private async persistConfig(
    executor: DbExecutor,
    input: {
      userId: number
      periode: string
      base: number
      joursTravailles: number
      rubriques: NormalizedRubrique[]
      createdBy?: number
    },
  ): Promise<SalaireConfigDto> {
    const existing = await executor
      .selectFrom('salaire_config')
      .selectAll()
      .where('user_id', '=', input.userId)
      .where('periode', '=', input.periode)
      .executeTakeFirst()

    let configId: number
    if (existing) {
      configId = existing.id as number
      await executor
        .updateTable('salaire_config')
        .set({
          base: input.base,
          jours_travailles: input.joursTravailles,
          updated_at: sql`datetime('now')`,
        })
        .where('id', '=', configId)
        .execute()
    } else {
      const inserted = await executor
        .insertInto('salaire_config')
        .values({
          user_id: input.userId,
          periode: input.periode,
          base: input.base,
          jours_travailles: input.joursTravailles,
          created_by: input.createdBy,
        })
        .returningAll()
        .executeTakeFirstOrThrow()
      configId = inserted.id as number
    }

    // Remplacement complet des rubriques : pas de fusion partielle.
    await executor
      .deleteFrom('salaire_config_rubrique')
      .where('config_id', '=', configId)
      .execute()

    for (const rubrique of input.rubriques) {
      await executor
        .insertInto('salaire_config_rubrique')
        .values({
          config_id: configId,
          libelle: rubrique.libelle,
          type: rubrique.type,
          montant: rubrique.montant,
          montant_jour: rubrique.montant_jour,
          jours: rubrique.jours,
          impact_net: rubrique.impact_net,
          ordre: rubrique.ordre,
        })
        .execute()
    }

    const saved = await executor
      .selectFrom('salaire_config')
      .selectAll()
      .where('id', '=', configId)
      .executeTakeFirstOrThrow()
    const rubriques = await executor
      .selectFrom('salaire_config_rubrique')
      .selectAll()
      .where('config_id', '=', configId)
      .orderBy('ordre', 'asc')
      .orderBy('id', 'asc')
      .execute()

    return this.mapConfig(saved, rubriques)
  }

  async listConfigs(periode: string): Promise<SalaireConfigRowDto[]> {
    const safePeriode = assertPeriode(periode)
    const [employees, configs] = await Promise.all([
      this.listEmployees(this.db),
      this.loadConfigs(this.db, safePeriode),
    ])

    return employees.map((employee) => ({
      ...employee,
      config: configs.get(employee.userId) ?? null,
    }))
  }

  async saveConfig(dto: SalaireConfigCreateDto): Promise<SalaireConfigDto> {
    const periode = assertPeriode(dto?.periode)
    const userId = assertUserId(dto?.userId)
    const base = roundAmount(dto.base ?? 0, 'Base')
    const joursTravailles = roundJours(dto.joursTravailles ?? 0)
    const rubriques = normalizeRubriques(dto.rubriques)

    return this.db.transaction().execute(async (trx) => {
      const user = await trx
        .selectFrom('user')
        .select('id')
        .where('id', '=', userId)
        .executeTakeFirst()
      if (!user) throw new Error('Utilisateur introuvable')

      return this.persistConfig(trx, {
        userId,
        periode,
        base,
        joursTravailles,
        rubriques,
        createdBy: dto.createdBy,
      })
    })
  }

  async copyPreviousMonth(periode: string): Promise<{ copied: number; skipped: number }> {
    const safePeriode = assertPeriode(periode)
    const previous = previousPeriode(safePeriode)

    return this.db.transaction().execute(async (trx) => {
      const employees = await this.listEmployees(trx)
      const previousConfigs = await this.loadConfigs(trx, previous)
      if (previousConfigs.size === 0) {
        return { copied: 0, skipped: employees.length }
      }

      const currentConfigs = await this.loadConfigs(trx, safePeriode)
      let copied = 0

      for (const employee of employees) {
        if (currentConfigs.has(employee.userId)) continue
        const previousConfig = previousConfigs.get(employee.userId)
        if (!previousConfig) continue

        const rubriques = (previousConfig.rubriques ?? []).map<SalaireConfigRubriqueCreateDto>(
          (rubrique) => ({
            libelle: rubrique.libelle ?? '',
            type: rubrique.type ?? 'fixe',
            montant: rubrique.montant ?? 0,
            montantJour: rubrique.montantJour ?? null,
            impactNet: rubrique.impactNet !== false,
            ordre: rubrique.ordre ?? 0,
          }),
        )

        await this.persistConfig(trx, {
          userId: employee.userId,
          periode: safePeriode,
          base: previousConfig.base ?? 0,
          joursTravailles: previousConfig.joursTravailles ?? 0,
          rubriques: normalizeRubriques(rubriques),
        })
        copied++
      }

      return { copied, skipped: employees.length - copied }
    })
  }

  /**
   * Fiche de paie d'un employé actif pour une période.
   * Un employé sans configuration reste éligible : montants à 0.
   */
  async getPayslip(userIdInput: number, periodeInput: string): Promise<SalairePayslipDto> {
    const userId = assertUserId(userIdInput)
    const periode = assertPeriode(periodeInput)

    const row = await this.db
      .selectFrom('user')
      .select([
        'id',
        'nom',
        'prenom',
        'role',
        'fonction',
        'service',
        'telephone',
        'type_contrat',
        'temps_travail',
        'numero_securite_sociale',
        'date_debut_contrat',
        'is_active',
      ])
      .where('id', '=', userId)
      .executeTakeFirst()

    if (!row || row.role === 'ADMIN' || row.is_active === 0) {
      throw new Error('Employé introuvable ou inactif')
    }

    const config = (await this.loadConfigs(this.db, periode)).get(userId) ?? null
    const payment = await this.db
      .selectFrom('salaire_paiement')
      .selectAll()
      .where('user_id', '=', userId)
      .where('periode', '=', periode)
      .executeTakeFirst()

    const base = Number(config?.base ?? 0)
    const joursTravailles = Number(config?.joursTravailles ?? 0)
    let totalMensuel = Number.isFinite(base) ? base : 0
    const rubriques: SalairePayslipDto['rubriques'] = []

    for (const rubrique of config?.rubriques ?? []) {
      const montant = Number(rubrique.montant ?? 0)
      const montantJour = rubrique.montantJour == null ? null : Number(rubrique.montantJour)
      const jours = rubrique.jours == null ? null : Number(rubrique.jours)
      const joursAppliques = rubrique.type === 'journalier'
        ? (jours ?? joursTravailles)
        : null

      let montantCalcule = 0
      if (rubrique.type === 'fixe') {
        if (Number.isFinite(montant)) montantCalcule = Math.round(montant)
      } else if (Number.isFinite(montantJour) && Number.isFinite(joursAppliques)) {
        montantCalcule = Math.round((montantJour as number) * (joursAppliques as number))
      }

      const impactNet = rubrique.impactNet !== false
      totalMensuel += montantCalcule

      rubriques.push({
        libelle: String(rubrique.libelle ?? ''),
        type: (rubrique.type ?? 'fixe') as 'fixe' | 'journalier',
        montant: Number.isFinite(montant) ? montant : 0,
        montantJour: montantJour != null && Number.isFinite(montantJour) ? montantJour : null,
        jours: joursAppliques,
        impactNet,
        montantCalcule,
      })
    }

    const netAPayer = config ? computeSalaireNet(config) : 0
    const totalInformations = Math.max(0, Math.round(totalMensuel) - netAPayer)

    return {
      employee: {
        userId,
        nom: String(row.nom ?? ''),
        prenom: String(row.prenom ?? ''),
        role: String(row.role ?? ''),
        fonction: row.fonction ?? undefined,
        service: row.service ?? undefined,
        telephone: row.telephone ?? undefined,
        typeContrat: row.type_contrat ?? undefined,
        tempsTravail: (row.temps_travail as 'PLEIN' | 'PARTIEL' | null) ?? 'PLEIN',
        numeroSecuriteSociale: row.numero_securite_sociale ?? undefined,
        dateDebutContrat: row.date_debut_contrat ?? undefined,
      },
      periode,
      base: Number.isFinite(base) ? base : 0,
      joursTravailles: Number.isFinite(joursTravailles) ? joursTravailles : 0,
      rubriques,
      totalMensuel: Math.round(totalMensuel),
      totalInformations,
      netAPayer,
      paiement: payment ? this.mapPaiement(payment) : null,
    }
  }

  async getPaie(periode: string): Promise<SalairePaieRowDto[]> {
    const safePeriode = assertPeriode(periode)
    const [employees, configs, payments] = await Promise.all([
      this.listEmployees(this.db),
      this.loadConfigs(this.db, safePeriode),
      this.db
        .selectFrom('salaire_paiement')
        .selectAll()
        .where('periode', '=', safePeriode)
        .execute(),
    ])

    const byUser = new Map<number, SalairePaiementEntity>()
    for (const payment of payments) byUser.set(payment.user_id as number, payment)

    return employees.map((employee) => {
      const config = configs.get(employee.userId) ?? null
      const payment = byUser.get(employee.userId)
      const montantNet = config ? computeSalaireNet(config) : 0

      return {
        ...employee,
        config,
        montantNet,
        paye: payment != null,
        paiement: payment ? this.mapPaiement(payment) : null,
        datePaiement: payment?.date_paiement ?? undefined,
        modePaiement: (payment?.mode_paiement as ModePaiement | undefined) ?? undefined,
        reference: payment?.reference ?? undefined,
      }
    })
  }

  async payer(dto: SalairePayerDto): Promise<SalairePaiementDto> {
    const periode = assertPeriode(dto?.periode)
    const userId = assertUserId(dto?.userId)
    const modePaiement = assertMode(dto?.modePaiement)
    const datePaiement = assertDate(dto?.datePaiement, 'Date de paiement')

    return this.db.transaction().execute(async (trx) => {
      const config = (await this.loadConfigs(trx, periode)).get(userId)
      if (!config) {
        throw new Error('Aucune configuration de salaire pour cet employé et cette période')
      }

      const montantNet = computeSalaireNet(config)
      if (montantNet <= 0) throw new Error('Le montant net doit être supérieur à 0')

      const existing = await trx
        .selectFrom('salaire_paiement')
        .select('id')
        .where('user_id', '=', userId)
        .where('periode', '=', periode)
        .executeTakeFirst()
      if (existing) {
        throw new Error('Le salaire de cet employé est déjà payé pour cette période')
      }

      const details = JSON.stringify({
        userId,
        periode,
        base: config.base ?? 0,
        joursTravailles: config.joursTravailles ?? 0,
        rubriques: config.rubriques ?? [],
        montantNet,
      })

      try {
        const inserted = await trx
          .insertInto('salaire_paiement')
          .values({
            user_id: userId,
            periode,
            montant_net: montantNet,
            mode_paiement: modePaiement,
            date_paiement: datePaiement,
            reference: dto.reference?.trim() || undefined,
            details,
            created_by: dto.createdBy,
          })
          .returningAll()
          .executeTakeFirstOrThrow()
        return this.mapPaiement(inserted)
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new Error('Le salaire de cet employé est déjà payé pour cette période')
        }
        throw error
      }
    })
  }

  async payerBulk(dto: SalairePayerBulkDto): Promise<PayerBulkResultDto> {
    const periode = assertPeriode(dto?.periode)
    const modePaiement = assertMode(dto?.modePaiement)
    const datePaiement = assertDate(dto?.datePaiement, 'Date de paiement')
    if (typeof dto?.montantDisponible !== 'number' || !Number.isFinite(dto.montantDisponible) || dto.montantDisponible < 0) {
      throw new Error('Montant disponible invalide')
    }
    const budgetDemande = Math.round(dto.montantDisponible)

    // Le budget effectif ne peut pas dépasser la trésorerie disponible : le
    // montant communiqué par le renderer n'est qu'une demande, pas une
    // autorité. Solde connu (même nul ou négatif) → plafond STRICT à
    // `max(0, solde)` : on ne paie jamais plus que ce qui est en caisse.
    // Solde INCONNU (`null`, échec de lecture) → on conserve la demande avec
    // un avertissement, la lecture de caisse n'étant pas bloquante.
    const soldeCaisse = await this.readSoldeCaisse()
    let budget = budgetDemande
    if (soldeCaisse != null) {
      budget = Math.min(budgetDemande, Math.max(0, soldeCaisse))
    } else {
      console.warn(
        '[SalaireService] Budget de paie non plafonné : solde de caisse illisible.',
        { periode, budgetDemande },
      )
    }

    return this.db.transaction().execute(async (trx) => {
      const [employees, configs, payments] = await Promise.all([
        this.listEmployees(trx),
        this.loadConfigs(trx, periode),
        trx
          .selectFrom('salaire_paiement')
          .select('user_id')
          .where('periode', '=', periode)
          .execute(),
      ])

      const alreadyPaid = new Set(payments.map((payment) => payment.user_id as number))
      const eligible = employees
        .filter((employee) => !alreadyPaid.has(employee.userId))
        .map((employee) => {
          const config = configs.get(employee.userId)
          return { employee, config, montantNet: config ? computeSalaireNet(config) : 0 }
        })
        .filter((row) => row.montantNet > 0)
        // Net croissant : maximise le nombre de salariés intégralement couverts.
        .sort((a, b) => a.montantNet - b.montantNet || a.employee.userId - b.employee.userId)

      let reste = budget
      let totalPaye = 0
      let paid = 0

      for (const row of eligible) {
        // Jamais de paiement partiel.
        if (row.montantNet > reste) continue

        const config = row.config as SalaireConfigDto
        const details = JSON.stringify({
          userId: row.employee.userId,
          periode,
          base: config.base ?? 0,
          joursTravailles: config.joursTravailles ?? 0,
          rubriques: config.rubriques ?? [],
          montantNet: row.montantNet,
        })

        await trx
          .insertInto('salaire_paiement')
          .values({
            user_id: row.employee.userId,
            periode,
            montant_net: row.montantNet,
            mode_paiement: modePaiement,
            date_paiement: datePaiement,
            details,
            created_by: dto.createdBy,
          })
          .execute()

        reste -= row.montantNet
        totalPaye += row.montantNet
        paid++
      }

      return {
        paid,
        skipped: eligible.length - paid,
        totalPaye,
        reste,
        budgetDemande,
        budgetEffectif: budget,
      }
    })
  }

  /**
   * Solde de caisse, ou `null` s'il n'a pas pu être déterminé.
   * Lu AVANT toute transaction : la caisse et la paie partagent la même
   * base SQLite.
   */
  private async readSoldeCaisse(): Promise<number | null> {
    try {
      const solde = await this.caisseService.getSolde()
      return Number.isFinite(solde) ? Number(solde) : null
    } catch (error) {
      console.warn('[SalaireService] Solde de caisse illisible.', {
        message: (error as Error)?.message,
      })
      return null
    }
  }

  async historique(filtres?: SalaireHistoriqueFiltres): Promise<SalaireHistoriqueRowDto[]> {
    if (filtres?.periodeDebut != null) assertPeriode(filtres.periodeDebut)
    if (filtres?.periodeFin != null) assertPeriode(filtres.periodeFin)

    let query = this.db
      .selectFrom('salaire_paiement')
      .leftJoin('user', 'user.id', 'salaire_paiement.user_id')
      .selectAll('salaire_paiement')
      .select([
        'user.nom as nom',
        'user.prenom as prenom',
        'user.role as role',
      ])

    if (filtres?.userId != null) {
      query = query.where('salaire_paiement.user_id', '=', filtres.userId)
    }
    if (filtres?.periodeDebut) {
      query = query.where('salaire_paiement.periode', '>=', filtres.periodeDebut)
    }
    if (filtres?.periodeFin) {
      query = query.where('salaire_paiement.periode', '<=', filtres.periodeFin)
    }

    const rows = await query
      .orderBy('salaire_paiement.periode', 'desc')
      .orderBy('salaire_paiement.date_paiement', 'desc')
      .orderBy('salaire_paiement.id', 'desc')
      .execute()

    return rows.map((row) => ({
      ...this.mapPaiement(row),
      nom: row.nom ?? undefined,
      prenom: row.prenom ?? undefined,
      role: row.role ?? undefined,
    }))
  }
}

export type { SalaireRubriqueDto }
