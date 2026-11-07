import 'reflect-metadata'
import { describe, it, expect, afterEach } from 'vitest'
import { Kysely, Migrator, sql, type MigrationProvider } from 'kysely'
import { NodeSqliteDialect } from '../../driver/node-sqlite-dialect'
import * as PharmacieComptabilite from '../../migrations/109-pharmacie-comptabilite'
import * as AddDelivranceMotif from '../../migrations/101-add-delivrance-motif'
import { createTestDb } from './test-helper'

/**
 * Défaut B3 — « la migration 109 peut committer un schéma à moitié migré ».
 *
 * Kysely exécute chaque migration dans une transaction. L'ancien code
 * avalait TOUTE erreur d'`ALTER TABLE` (`catch { console.log(...) }`) : une
 * vraie erreur (table verrouillée, page corrompue, disque plein) était
 * donc « ratée », la migration était quand même enregistrée dans
 * `kysely_migration` et l'application démarrait avec des colonnes
 * manquantes — sans aucun chemin de réparation.
 *
 * Ces tests verrouillent le nouveau comportement :
 *  1. rejouer la migration sur un schéma déjà migré ne casse rien ;
 *  2. une erreur d'`ALTER` fait ÉCHOUER la migration, qui n'est alors PAS
 *     enregistrée dans `kysely_migration` (donc rejouée au prochain
 *     démarrage) et dont une nouvelle tentative COMPLÈTE le schéma.
 *
 * Note SQLite : l'adaptateur SQLite de Kysely déclare
 * `supportsTransactionalDdl = false` — le migrateur n'enveloppe pas les
 * migrations dans une transaction. Les `ALTER` déjà réussis restent donc
 * appliqués en autocommit (schéma partiellement migré) ; c'est la sonde
 * d'idempotence qui rend la reprise possible SANS doublon. La migration
 * n'étant pas enregistrée, elle est bien rejouée au démarrage suivant.
 */

async function columnsOf(db: Kysely<any>, table: string): Promise<string[]> {
  const rows = await sql<{ name: string }>`
    SELECT name FROM pragma_table_info(${table})
  `.execute(db)
  return rows.rows.map((row) => row.name)
}

async function tableExists(db: Kysely<any>, table: string): Promise<boolean> {
  const rows = await sql<{ name: string }>`
    SELECT name FROM sqlite_master WHERE type = 'table' AND name = ${table}
  `.execute(db)
  return rows.rows.length > 0
}

function providerFor(migrations: Record<string, typeof PharmacieComptabilite>): MigrationProvider {
  return {
    async getMigrations() {
      return migrations
    },
  }
}

describe('migration 109 — idempotence et atomicité', { timeout: 60_000 }, () => {
  let db: Kysely<any> | undefined

  afterEach(async () => {
    await db?.destroy().catch(() => {})
    db = undefined
  })

  it('rejouée sur un schéma déjà migré, la migration laisse le schéma COMPLET', async () => {
    db = await createTestDb()

    // Le schéma est déjà complet (migration appliquée par createTestDb).
    expect(await columnsOf(db, 'delivrances')).toEqual(
      expect.arrayContaining(['date_vente', 'type_vente', 'motif_gratuite', 'montant_total']),
    )
    expect(await columnsOf(db, 'delivrance_lignes')).toEqual(
      expect.arrayContaining(['prix_unitaire', 'montant', 'cout_achat_total']),
    )

    // Rejouée explicitement : aucun échec, aucun schéma altéré.
    await expect(PharmacieComptabilite.up(db)).resolves.toBeUndefined()

    expect(await columnsOf(db, 'delivrances')).toEqual(
      expect.arrayContaining(['date_vente', 'type_vente', 'motif_gratuite', 'montant_total']),
    )
    expect(await columnsOf(db, 'delivrance_lignes')).toEqual(
      expect.arrayContaining(['prix_unitaire', 'montant', 'cout_achat_total']),
    )
    expect(await tableExists(db, 'vente_pharmacie_paiement')).toBe(true)
  })

  it('un ALTER en échec n’enregistre PAS la migration et une reprise complète le schéma', async () => {
    db = new Kysely<any>({ dialect: new NodeSqliteDialect(':memory:') })

    // `delivrance_lignes` est une VUE : l'ALTER sur cette table échoue
    // ("Cannot add a column to a view"), les ALTER sur `delivrances`
    // réussissent. C'est exactement le scénario « schéma à moitié migré ».
    await sql`CREATE TABLE delivrances (id INTEGER PRIMARY KEY AUTOINCREMENT)`.execute(db)
    await sql`CREATE VIEW delivrance_lignes AS SELECT 1 AS id`.execute(db)

    const provider = providerFor({ '109-pharmacie-comptabilite': PharmacieComptabilite })

    const failed = await new Migrator({ db, provider }).migrateToLatest()

    // 1. La migration a ÉCHOUÉ (et n'a pas été avalée).
    expect(failed.error).toBeDefined()
    expect(failed.results.map((r) => r.status)).toContain('Error')

    // 2. Elle n'est PAS enregistrée dans `kysely_migration` → elle sera
    //    rejouée au prochain démarrage.
    const afterFailure = await sql<{ name: string }>`
      SELECT name FROM kysely_migration
    `.execute(db)
    expect(afterFailure.rows.map((row) => row.name)).not.toContain('109-pharmacie-comptabilite')
    expect(await tableExists(db, 'vente_pharmacie_paiement')).toBe(false)

    // 3. SQLite n'est PAS transactionnel pour le DDL via Kysely
    //    (`supportsTransactionalDdl = false`) : les ALTER déjà réussis sont
    //    conservés. C'est précisément pourquoi la sonde d'idempotence est
    //    indispensable à la reprise.
    expect(await columnsOf(db, 'delivrances')).toContain('date_vente')

    // 4. On répare la cause (la « table » était une vue) puis on rejoue :
    //    la sonde saute les colonnes déjà présentes, complète les autres et
    //    la migration est cette fois enregistrée.
    await sql`DROP VIEW delivrance_lignes`.execute(db)
    await sql`CREATE TABLE delivrance_lignes (id INTEGER PRIMARY KEY AUTOINCREMENT)`.execute(db)

    const retried = await new Migrator({ db, provider }).migrateToLatest()
    expect(retried.error).toBeUndefined()
    expect(await columnsOf(db, 'delivrance_lignes')).toEqual(
      expect.arrayContaining(['prix_unitaire', 'montant', 'cout_achat_total']),
    )
    expect(await columnsOf(db, 'delivrances')).toEqual(
      expect.arrayContaining(['date_vente', 'type_vente', 'motif_gratuite', 'montant_total']),
    )
    expect(await tableExists(db, 'vente_pharmacie_paiement')).toBe(true)
    const afterRetry = await sql<{ name: string }>`
      SELECT name FROM kysely_migration
    `.execute(db)
    expect(afterRetry.rows.map((row) => row.name)).toContain('109-pharmacie-comptabilite')
  })

  it('la migration 101 n’enregistre pas une migration en échec et reste rejouable', async () => {
    db = new Kysely<any>({ dialect: new NodeSqliteDialect(':memory:') })

    await sql`CREATE VIEW delivrances AS SELECT 1 AS id`.execute(db)

    const provider = providerFor({ '101-add-delivrance-motif': AddDelivranceMotif })

    const failed = await new Migrator({ db, provider }).migrateToLatest()
    expect(failed.error).toBeDefined()
    const afterFailure = await sql<{ name: string }>`
      SELECT name FROM kysely_migration
    `.execute(db)
    expect(afterFailure.rows.map((row) => row.name)).not.toContain('101-add-delivrance-motif')

    // Reprise après réparation de la cause.
    await sql`DROP VIEW delivrances`.execute(db)
    await sql`CREATE TABLE delivrances (id INTEGER PRIMARY KEY AUTOINCREMENT)`.execute(db)
    const retried = await new Migrator({ db, provider }).migrateToLatest()
    expect(retried.error).toBeUndefined()
    expect(await columnsOf(db, 'delivrances')).toContain('motif')
    const afterRetry = await sql<{ name: string }>`
      SELECT name FROM kysely_migration
    `.execute(db)
    expect(afterRetry.rows.map((row) => row.name)).toContain('101-add-delivrance-motif')
  })

  it('la migration 101 est rejouable sur un schéma déjà migré', async () => {
    db = await createTestDb()

    expect(await columnsOf(db, 'delivrances')).toContain('motif')
    await expect(AddDelivranceMotif.up(db)).resolves.toBeUndefined()
    expect(await columnsOf(db, 'delivrances')).toContain('motif')
  })
})
