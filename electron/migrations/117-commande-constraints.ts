import { type Kysely, sql } from 'kysely'

/**
 * Garanties de cohérence des commandes pharmacie pour les bases existantes.
 *
 * Les contraintes CHECK/UNIQUE ont été ajoutées à 113/114 après leur première
 * mise en production. SQLite ne modifie pas une table existante pour ajouter
 * un CHECK, et `CREATE TABLE IF NOT EXISTS` ne rejoue donc pas ces garanties
 * sur une base qui a déjà exécuté 113/114. Cette migration les rétablit avec
 * des objets indépendants et idempotents, valables aussi sur une base neuve.
 *
 * Hypothèse : la fonctionnalité de réception est nouvelle et aucune donnée
 * historique ne contient de doublon `(reception_id, commande_ligne_id)`. En
 * cas de doublon, la création de l'index unique échoue volontairement : on ne
 * déduplique pas silencieusement des réceptions potentiellement différentes.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS ux_commande_reception_lignes_reception_ligne
      ON commande_reception_lignes (reception_id, commande_ligne_id)
  `.execute(db)

  await sql`
    CREATE TRIGGER IF NOT EXISTS trg_commande_lignes_quantite_livree_insert
    BEFORE INSERT ON commande_lignes
    WHEN NEW.quantite_livree < 0 OR NEW.quantite_livree > NEW.quantite_commandee
    BEGIN
      SELECT RAISE(ABORT, 'quantite_livree invalide');
    END
  `.execute(db)

  await sql`
    CREATE TRIGGER IF NOT EXISTS trg_commande_lignes_quantite_livree_update
    BEFORE UPDATE OF quantite_livree, quantite_commandee ON commande_lignes
    WHEN NEW.quantite_livree < 0 OR NEW.quantite_livree > NEW.quantite_commandee
    BEGIN
      SELECT RAISE(ABORT, 'quantite_livree invalide');
    END
  `.execute(db)
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`DROP TRIGGER IF EXISTS trg_commande_lignes_quantite_livree_update`.execute(db)
  await sql`DROP TRIGGER IF EXISTS trg_commande_lignes_quantite_livree_insert`.execute(db)
  await sql`DROP INDEX IF EXISTS ux_commande_reception_lignes_reception_ligne`.execute(db)
}
