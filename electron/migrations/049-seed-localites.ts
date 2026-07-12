import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`PRAGMA foreign_keys = OFF`.execute(db)

  await sql`
    INSERT OR IGNORE INTO localites (id, code, name, type, parent_id) VALUES
      (1, 'CON', 'Conakry', 'prefecture', NULL),
      (2, 'BOK', 'Boké', 'prefecture', NULL),
      (3, 'KIN', 'Kindia', 'prefecture', NULL),
      (4, 'LAB', 'Labé', 'prefecture', NULL),
      (5, 'MAM', 'Mamou', 'prefecture', NULL),
      (6, 'FAR', 'Faranah', 'prefecture', NULL),
      (7, 'KAN', 'Kankan', 'prefecture', NULL),
      (8, 'NZE', 'Nzérékoré', 'prefecture', NULL),
      (9, 'CON.KAL', 'Kaloum', 'commune', 1),
      (10, 'CON.DIX', 'Dixinn', 'commune', 1),
      (11, 'CON.MAT', 'Matam', 'commune', 1),
      (12, 'CON.RAT', 'Ratoma', 'commune', 1),
      (13, 'CON.MATOTO', 'Matoto', 'commune', 1),
      (14, 'BOK.BOK', 'Boké Centre', 'commune', 2),
      (15, 'BOK.KAN', 'Kamsar', 'commune', 2),
      (16, 'BOK.SAN', 'Sangarédi', 'sous_prefecture', 2),
      (17, 'KIN.KIN', 'Kindia Centre', 'commune', 3),
      (18, 'KIN.FOR', 'Forécariah', 'sous_prefecture', 3),
      (19, 'KIN.TEL', 'Télimélé', 'sous_prefecture', 3),
      (20, 'KIN.DUB', 'Dubréka', 'sous_prefecture', 3),
      (21, 'LAB.LAB', 'Labé Centre', 'commune', 4),
      (22, 'LAB.MAL', 'Mali', 'sous_prefecture', 4),
      (23, 'LAB.TOU', 'Tougué', 'sous_prefecture', 4),
      (24, 'LAB.LABE', 'Lâbé', 'sous_prefecture', 4),
      (25, 'MAM.MAM', 'Mamou Centre', 'commune', 5),
      (26, 'MAM.DAL', 'Dalaba', 'sous_prefecture', 5),
      (27, 'MAM.PIT', 'Pita', 'sous_prefecture', 5),
      (28, 'FAR.FAR', 'Faranah Centre', 'commune', 6),
      (29, 'FAR.DIN', 'Dinguiraye', 'sous_prefecture', 6),
      (30, 'FAR.KIS', 'Kissidougou', 'sous_prefecture', 6),
      (31, 'KAN.KAN', 'Kankan Centre', 'commune', 7),
      (32, 'KAN.KER', 'Kérouané', 'sous_prefecture', 7),
      (33, 'KAN.MAN', 'Mandiana', 'sous_prefecture', 7),
      (34, 'KAN.SIG', 'Siguiri', 'sous_prefecture', 7),
      (35, 'NZE.NZE', 'Nzérékoré Centre', 'commune', 8),
      (36, 'NZE.BEY', 'Beyla', 'sous_prefecture', 8),
      (37, 'NZE.GUE', 'Guéckédou', 'sous_prefecture', 8),
      (38, 'NZE.LOL', 'Lola', 'sous_prefecture', 8),
      (39, 'NZE.YOM', 'Yomou', 'sous_prefecture', 8)
  `.execute(db)

  await sql`PRAGMA foreign_keys = ON`.execute(db)
}

export async function down(_db: Kysely<unknown>): Promise<void> {
  // No-op
}
