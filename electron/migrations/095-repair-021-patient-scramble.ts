import { type Kysely, sql } from 'kysely'

/**
 * REPAIR for the 021 positional-copy data-corruption bug.
 *
 * The ORIGINAL 021 used `INSERT INTO patient_v2 SELECT * FROM patient`. The
 * source `patient` (pre-021) and target `patient_v2` define their columns in
 * DIFFERENT orders, so every column from #13 onward was written into the wrong
 * column:
 *
 *   patient   (pre-021 order)        patient_v2 (021 order)     result
 *   ─────────────────────────────    ───────────────────────    ─────────
 *   1  .. 12 (id..allergies)        1 .. 12 (id..allergies)    correct
 *   13 automerge_id   ──────────▶   13 photo                   photo    = automerge_id
 *   14 created_at     ──────────▶   14 nip                     nip      = created_at   (datetime → "strange chars")
 *   15 updated_at     ──────────▶   15 lieu_naissance          lieu_naissance = updated_at
 *   16 photo          ──────────▶   16 residence_code          residence_code   = photo
 *   17 nip            ──────────▶   17 complement_adresse      complement_adresse = nip
 *   18 lieu_naissance ──────────▶   18 region                  region   = lieu_naissance
 *   19 residence_code ──────────▶   19 profession              profession = residence_code
 *   20 complement_adresse ───────▶  20 automerge_id            automerge_id = complement_adresse
 *   21 region         ──────────▶   21 created_at              created_at = region
 *   22 profession     ──────────▶   22 updated_at              updated_at = profession
 *
 * DETECTION PREDICATE: in a scrambled row the `nip` column holds the OLD
 * `created_at`, which SQLite stores as a `datetime('now')` string matching
 * `GLOB '????-??-?? ??:??:??'`. A correct NIP (e.g. `185COXGJLE`) never matches
 * that pattern, so the predicate only selects genuinely scrambled rows. On a
 * fresh DB that ran the REWRITTEN 021 the predicate matches nothing and this
 * migration is a no-op.
 *
 * REPAIR: for each matching row we reverse the scramble by restoring the true
 * value of every column from the (same-row) scrambled values:
 *
 *   TRUE column          ←  current (scrambled) column holds
 *   ─────────────        ─────────────────────────────
 *   automerge_id     = photo
 *   created_at       = nip
 *   updated_at       = lieu_naissance
 *   photo            = residence_code
 *   nip              = complement_adresse
 *   lieu_naissance   = region
 *   residence_code   = profession
 *   complement_adresse = automerge_id
 *   region           = created_at
 *   profession       = updated_at
 *
 * WHY `profession` IS SPECIAL: `patient.service.ts` stamps
 * `updated_at = new Date().toISOString()` on every save, so a scrambled row
 * edited at least once between 021 and 095 has its true `profession` (physically
 * stored in the `updated_at` column) OVERWRITTEN by an ISO string. Restoring it
 * verbatim would surface e.g. `2024-03-14T09:30:00.000Z` AS the profession — the
 * same "strange characters in a normal field" symptom, relocated. Instead, when
 * `updated_at` is ISO-shaped (`GLOB '*T*:*:*.*Z'`: matches real ISO timestamps;
 * never matches `datetime('now')` legacy strings or professional titles) we
 * assign NULL, so a lost value surfaces as an empty field rather than garbage.
 *
 * SQLITE ASSIGNMENT-ORDER SEMANTICS: within a single UPDATE statement all RHS
 * expressions are evaluated against the OLD row values before any assignment
 * takes effect (SQLite does not cascade assignments). The swap below is
 * therefore safe — each RHS reads the pre-update value of its source column —
 * and no intermediate column loses its scrambled value mid-statement.
 *
 * Idempotent: once restored, no column contains a datetime-shaped NIP, so a
 * second run matches no rows.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    UPDATE patient
    SET
      automerge_id      = photo,
      created_at        = nip,
      updated_at        = lieu_naissance,
      photo             = residence_code,
      nip               = complement_adresse,
      lieu_naissance    = region,
      residence_code    = profession,
      complement_adresse = automerge_id,
      region            = created_at,
      profession        = CASE WHEN updated_at GLOB '*T*:*:*.*Z' THEN NULL ELSE updated_at END
    WHERE nip GLOB '????-??-?? ??:??:??'
  `.execute(db)
}

export async function down(_db: Kysely<unknown>): Promise<void> {
  // No-op: a data repair cannot be meaningfully reversed.
}
