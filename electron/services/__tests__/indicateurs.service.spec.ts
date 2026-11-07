import 'reflect-metadata'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { sql, type Kysely } from 'kysely'
import { createMockDataSource, createTestDb } from './test-helper'
import { IndicateursService } from '../indicateurs.service'
import {
  ACTIVITY_KEYS,
  METRIC_KEYS,
  type IndicateursAnnuelsDto,
} from '../../dto/indicateurs.dto'

let db: Kysely<any>
let service: IndicateursService
let diabServiceId: number
let endoServiceId: number
let accueilServiceId: number
let ecgId: number

function rowOf(stats: IndicateursAnnuelsDto, annee: number) {
  const row = stats.lignes.find((ligne) => ligne.annee === annee)
  expect(row, `ligne ${annee}`).toBeDefined()
  return row!
}

/**
 * Nombre de jours écoulés entre `admission` et aujourd'hui (UTC), tel que
 * calculé par `julianday(date('now')) - julianday(admission_date)`.
 */
function daysUntilToday(admission: string): number {
  const [year, month, day] = admission.split('-').map(Number)
  const now = new Date()
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const admissionUtc = Date.UTC(year, month - 1, day)
  return Math.max(1, Math.floor((todayUtc - admissionUtc) / 86_400_000))
}

async function addPatient(id: number): Promise<void> {
  await sql`
    INSERT INTO patient (id, civilite, nom, prenom, date_naissance, nir, telephone)
    VALUES (${id}, 'M', ${`Patient${id}`}, 'Test', '1980-01-01', ${`NIR${id}`}, ${`60000000${id}`})
  `.execute(db)
}

async function addEncounter(
  patientId: number,
  startDate: string,
  caseType: string | null,
  isNewCase: number,
  serviceId: number = diabServiceId,
  contactType: 'consultation' | 'hospitalisation' = 'consultation',
): Promise<void> {
  await sql`
    INSERT INTO encounters
      (patient_id, contact_type, start_date, end_date, service_id,
       origin, zone_situation, prise_en_charge, case_type, is_new_case, status)
    VALUES
      (${patientId}, ${contactType}, ${startDate}, ${startDate}, ${serviceId},
       'auto_refere', 'zone_responsabilite', 'maladie_naturelle', ${caseType}, ${isNewCase}, 'closed')
  `.execute(db)
}

async function addStay(
  patientId: number,
  admissionDate: string,
  sortieDate: string | null,
  type: 'jour' | 'complete',
): Promise<void> {
  await sql`
    INSERT INTO stays
      (patient_id, admission_date, mode_admission, service_id, type, status, sortie_date)
    VALUES
      (${patientId}, ${admissionDate}, 'urgences', ${diabServiceId}, ${type},
       ${sortieDate ? 'cloture' : 'en_cours'}, ${sortieDate})
  `.execute(db)
}

async function addExamRequest(params: {
  type: string
  statut: string
  createdAt: string | null
  realizedAt: string | null
  examIds?: number[] | null
}): Promise<void> {
  await sql`
    INSERT INTO exam_requests (patient_id, type, statut, exam_ids, created_at, realized_at)
    VALUES (
      1,
      ${params.type},
      ${params.statut},
      ${params.examIds == null ? null : JSON.stringify(params.examIds)},
      ${params.createdAt},
      ${params.realizedAt}
    )
  `.execute(db)
}

beforeAll(async () => {
  db = await createTestDb()
  service = new IndicateursService(createMockDataSource(db) as any)

  const services = await sql<{ id: number; name: string }>`
    SELECT id, name FROM services WHERE name IN ('Diabétologie', 'Endocrinologie', 'Accueil')
  `.execute(db)
  const serviceId = (name: string): number => {
    const found = services.rows.find((row) => row.name === name)
    if (!found) throw new Error(`Service ${name} introuvable`)
    return Number(found.id)
  }
  diabServiceId = serviceId('Diabétologie')
  endoServiceId = serviceId('Endocrinologie')
  accueilServiceId = serviceId('Accueil')

  const ecg = await sql<{ id: number }>`SELECT id FROM lab_exams WHERE code = 'ECG'`.execute(db)
  ecgId = Number(ecg.rows[0].id)

  for (const id of [2, 3, 4, 5, 6]) await addPatient(id)

  // ─── Dossiers / nouveaux cas ───────────────────────────────────────
  await addEncounter(2, '2025-01-10', 'diabete', 1)
  await addEncounter(2, '2025-06-10', 'diabete', 0)
  await addEncounter(2, '2026-03-10', 'diabete', 0)
  await addEncounter(3, '2025-02-10', 'diabete', 0)
  await addEncounter(4, '2025-03-10', 'thyroide_endocrino', 1)
  await addEncounter(5, '2025-04-10', 'autre', 1)
  await addEncounter(6, '2026-01-10', 'diabete', 1)

  // Activité hors Diabétologie/Endocrinologie : compte dans les soins
  // ambulatoires mais pas dans le suivi spécialisé.
  await addEncounter(4, '2025-07-01', null, 0, accueilServiceId)
  // Hospitalisation : JAMAIS comptée dans les soins ambulatoires.
  await addEncounter(5, '2025-08-01', null, 0, accueilServiceId, 'hospitalisation')

  // Patient 7 : premier contact NON classé (case_type NULL), puis premier
  // contact diabète dans la même année. Il doit compter comme nouveau venu
  // diabète 2025 (is_new_case = 0 pour ne pas polluer « nouveaux cas »).
  await addPatient(7)
  await addEncounter(7, '2025-05-01', null, 1)
  await addEncounter(7, '2025-09-01', 'diabete', 0)

  // ─── Séjours ───────────────────────────────────────────────────────
  await addStay(2, '2025-01-01', '2025-01-04', 'jour') // 3 jours
  await addStay(3, '2025-02-01', null, 'jour') // 1 jour (minimum)
  await addStay(4, '2025-03-01', '2025-03-10', 'complete')
  await addStay(5, '2026-01-01', '2026-01-02', 'jour') // 1 jour
  await addStay(6, '2026-01-01', '2026-01-05', 'complete')

  // ─── Examens ───────────────────────────────────────────────────────
  await addExamRequest({
    type: 'laboratoire',
    statut: 'realise',
    createdAt: '2025-03-01 10:00:00',
    realizedAt: null,
  })
  await addExamRequest({
    type: 'laboratoire',
    statut: 'annule',
    createdAt: '2025-04-01 10:00:00',
    realizedAt: null,
  })
  await addExamRequest({
    type: 'laboratoire',
    statut: 'en_attente',
    createdAt: '2026-02-01 10:00:00',
    realizedAt: '2026-02-05 09:00:00',
  })
  await addExamRequest({
    type: 'imagerie',
    statut: 'realise',
    createdAt: '2025-05-01 10:00:00',
    realizedAt: null,
    examIds: [ecgId],
  })
  await addExamRequest({
    type: 'imagerie',
    statut: 'annule',
    createdAt: '2025-05-02 10:00:00',
    realizedAt: null,
    examIds: [ecgId],
  })
  await addExamRequest({
    type: 'imagerie',
    statut: 'en_attente',
    createdAt: '2026-03-01 10:00:00',
    realizedAt: '2026-03-02 09:00:00',
    examIds: [999_999, ecgId],
  })
  await addExamRequest({
    type: 'imagerie',
    statut: 'realise',
    createdAt: '2025-06-01 10:00:00',
    realizedAt: null,
    examIds: [999_999],
  })
  // `exam_ids` corrompu : `json_valid()` doit empêcher `json_each` d'exploser.
  await sql`
    INSERT INTO exam_requests (patient_id, type, statut, exam_ids, created_at, realized_at)
    VALUES (1, 'imagerie', 'realise', 'pas-du-json', '2025-07-01 10:00:00', NULL)
  `.execute(db)
})

afterAll(async () => {
  await db.destroy()
})

describe('IndicateursService — agrégats annuels', () => {
  it('compte les dossiers de suivi diabète/endocrino', async () => {
    const stats = await service.getAnnualStats({ fromYear: 2025, toYear: 2026 })

    // Tous les dossiers des services Diabétologie/Endocrinologie, quelle que
    // soit leur modalité. L'activité Accueil de juillet n'entre pas ici.
    expect(rowOf(stats, 2025).suivi_diabete_endocrino).toBe(7)
    expect(rowOf(stats, 2025).sources.suivi_diabete_endocrino).toBe('calcule')
    expect(rowOf(stats, 2026).suivi_diabete_endocrino).toBe(2)
    expect(stats.totaux.suivi_diabete_endocrino).toBe(9)
    expect(stats.totaux.moyenne_par_an.suivi_diabete_endocrino).toBe(5)
  })

  it('compte les soins ambulatoires et exclut les hospitalisations', async () => {
    const stats = await service.getAnnualStats({ fromYear: 2025, toYear: 2026 })

    // 2025 : 7 dossiers diabète/endo + 1 consultation Accueil ; le dossier
    // `contact_type = 'hospitalisation'` d'août est exclu.
    expect(rowOf(stats, 2025).soins_ambulatoires).toBe(8)
    expect(rowOf(stats, 2025).sources.soins_ambulatoires).toBe('calcule')
    expect(rowOf(stats, 2026).soins_ambulatoires).toBe(3)
    expect(stats.totaux.soins_ambulatoires).toBe(11)
  })

  it('compte les nouveaux cas par case_type et is_new_case', async () => {
    const stats = await service.getAnnualStats({ fromYear: 2025, toYear: 2026 })

    expect(rowOf(stats, 2025).nouveaux_cas_diabete).toBe(1)
    expect(rowOf(stats, 2025).nouveaux_cas_thyroide_endocrino).toBe(1)
    expect(rowOf(stats, 2025).autres_nouveaux_cas).toBe(1)
    expect(rowOf(stats, 2026).nouveaux_cas_diabete).toBe(1)
    expect(rowOf(stats, 2026).nouveaux_cas_thyroide_endocrino).toBeNull()
    expect(rowOf(stats, 2026).autres_nouveaux_cas).toBeNull()
  })

  it('compte le premier contact DIABÈTE, même si le premier dossier est non classé', async () => {
    const stats = await service.getAnnualStats({ fromYear: 2025, toYear: 2026 })

    // 2025 : patients 2, 3 et 7. Le patient 7 a d'abord un dossier
    // `case_type` NULL, puis son premier dossier diabète en 2025 : il compte.
    // Le second dossier du patient 2 en 2026 ne le recompte pas.
    expect(rowOf(stats, 2025).nouveaux_venus_diabete).toBe(3)
    // 2026 : patient 6 uniquement.
    expect(rowOf(stats, 2026).nouveaux_venus_diabete).toBe(1)
    expect(stats.totaux.nouveaux_venus_diabete).toBe(4)
  })

  it('compte les bilans labo non annulés et les ECG via le tableau JSON exam_ids', async () => {
    const stats = await service.getAnnualStats({ fromYear: 2025, toYear: 2026 })

    expect(rowOf(stats, 2025).bilan_labo).toBe(1)
    expect(rowOf(stats, 2026).bilan_labo).toBe(1)

    expect(rowOf(stats, 2025).ecg).toBe(1)
    expect(rowOf(stats, 2026).ecg).toBe(1)
  })

  it('distingue les jours d’hospitalisation du nombre de séjours de jour', async () => {
    const stats = await service.getAnnualStats({ fromYear: 2025, toYear: 2026 })

    // Séjour terminé 3 jours + séjour EN COURS (sortie vide) compté jusqu'à
    // aujourd'hui, et non « 1 jour ».
    const ongoingDays = daysUntilToday('2025-02-01')
    const y2025 = rowOf(stats, 2025)
    expect(y2025.hospitalisation_jour).toBe(3 + ongoingDays)
    expect(y2025.hopital_de_jour).toBe(2)
    expect(y2025.hospitalisation_complete).toBe(1)

    const y2026 = rowOf(stats, 2026)
    expect(y2026.hospitalisation_jour).toBe(1)
    expect(y2026.hopital_de_jour).toBe(1)
    expect(y2026.hospitalisation_complete).toBe(1)
  })

  it('calcule les totaux et la moyenne des activités', async () => {
    const stats = await service.getAnnualStats({ fromYear: 2025, toYear: 2026 })
    const ongoingDays = daysUntilToday('2025-02-01')

    // Le suivi est une cohorte : il n'entre PAS dans le total. Les 10
    // activités de ACTIVITY_KEYS sont toutes renseignées en 2025.
    const total2025 = 8 + 1 + 1 + 3 + 1 + (3 + ongoingDays) + 1 + 1 + 1 + 2
    expect(rowOf(stats, 2025).total_activites).toBe(total2025)
    expect(rowOf(stats, 2025).moyenne_activites).toBe(Math.round(total2025 / 10))
    expect(rowOf(stats, 2025).sources.total_activites).toBe('calcule')

    // 2026 : thyroïde et autres sont indisponibles → exclus du dénominateur.
    // 2 dossiers de test + le dossier `date('now')` du jeu de test.
    expect(rowOf(stats, 2026).total_activites).toBe(10)
    expect(rowOf(stats, 2026).moyenne_activites).toBe(1)

    expect(stats.totaux.total_activites).toBe(total2025 + 10)
    // `totaux.moyenne_activites` cumule les moyennes ANNUELLES (comme les
    // autres métriques) ; l'export Excel, lui, laisse cette colonne blanche.
    expect(stats.totaux.moyenne_activites).toBe(Math.round(total2025 / 10) + 1)
  })

  it('totalise exactement les dix clés ACTIVITY_KEYS exportées par le DTO', async () => {
    expect(ACTIVITY_KEYS).toHaveLength(10)
    expect(ACTIVITY_KEYS).not.toContain('suivi_diabete_endocrino')
    expect(ACTIVITY_KEYS).toContain('soins_ambulatoires')
    expect(ACTIVITY_KEYS).toContain('hospitalisation_jour')

    const stats = await service.getAnnualStats({ fromYear: 2025, toYear: 2026 })
    for (const ligne of stats.lignes) {
      const expected = ACTIVITY_KEYS.reduce(
        (sum, key) => sum + (ligne[key] ?? 0),
        0,
      )
      expect(ligne.total_activites, `total ${ligne.annee}`).toBe(expected)
    }
  })

  it('retourne une année vide avec des nulls et la source « indisponible »', async () => {
    const stats = await service.getAnnualStats({ fromYear: 2024, toYear: 2024 })

    expect(stats.lignes).toHaveLength(1)
    const y2024 = stats.lignes[0]
    for (const metric of METRIC_KEYS) {
      expect(y2024[metric], metric).toBeNull()
      expect(y2024.sources[metric], metric).toBe('indisponible')
    }
    // Aucune valeur sur la période → total `null` (l'UI affiche « — »),
    // distinct d'un total réellement nul.
    expect(stats.totaux.total_activites).toBeNull()
    expect(stats.totaux.moyenne_par_an.total_activites).toBeNull()
  })

  it('retourne null par métrique (jamais 0) quand aucune année n’a de valeur', async () => {
    const stats = await service.getAnnualStats({ fromYear: 2026, toYear: 2026 })

    // 2026 n'a ni thyroïde ni « autres nouveaux cas » : cumul inconnu → null.
    expect(stats.totaux.nouveaux_cas_thyroide_endocrino).toBeNull()
    expect(stats.totaux.moyenne_par_an.nouveaux_cas_thyroide_endocrino).toBeNull()
    expect(stats.totaux.autres_nouveaux_cas).toBeNull()
    expect(stats.totaux.moyenne_par_an.autres_nouveaux_cas).toBeNull()

    // Les métriques renseignées restent numériques.
    expect(stats.totaux.nouveaux_cas_diabete).toBe(1)
  })

  it('expose des lignes plates pour Excel', async () => {
    const rows = await service.getExportRows({ fromYear: 2025, toYear: 2026 })

    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({
      annee: 2025,
      suivi_diabete_endocrino: 7,
      soins_ambulatoires: 8,
    })
    expect(rows[0]).not.toHaveProperty('sources')
    expect(rows[1]).toMatchObject({
      annee: 2026,
      suivi_diabete_endocrino: 2,
      soins_ambulatoires: 3,
    })
  })

  it('borne la période à [1900, année courante + 1] et à 60 ans maximum', async () => {
    const currentYear = new Date().getFullYear()

    await expect(
      service.getAnnualStats({ fromYear: 1899, toYear: currentYear }),
    ).rejects.toThrow(/1900/)
    await expect(
      service.getAnnualStats({ fromYear: currentYear, toYear: currentYear + 2 }),
    ).rejects.toThrow(/période/)

    await expect(
      service.getAnnualStats({ fromYear: 1900, toYear: 1959 }),
    ).resolves.toBeDefined()
    await expect(
      service.getAnnualStats({ fromYear: 1900, toYear: 1960 }),
    ).rejects.toThrow(/60 ans/)
  })
})

describe('IndicateursService — détail mensuel', () => {
  it('répartit chaque activité sur les douze mois, sans le suivi', async () => {
    const monthly = await service.getMonthlyStats({ annee: 2025 })
    const annual = await service.getAnnualStats({ fromYear: 2025, toYear: 2025 })
    const annualRow = rowOf(annual, 2025)
    const ongoingDays = daysUntilToday('2025-02-01')

    expect(monthly.annee).toBe(2025)
    expect(monthly.lignes.map((ligne) => ligne.metric)).toEqual([...ACTIVITY_KEYS])
    expect(monthly.lignes.some((ligne) => ligne.metric === 'suivi_diabete_endocrino')).toBe(false)

    const byMetric = new Map(monthly.lignes.map((ligne) => [ligne.metric, ligne]))

    expect(byMetric.get('soins_ambulatoires')!.mois).toEqual([
      1, 1, 1, 1, 1, 1, 1, null, 1, null, null, null,
    ])
    expect(byMetric.get('nouveaux_cas_diabete')!.mois).toEqual([
      1, null, null, null, null, null, null, null, null, null, null, null,
    ])
    expect(byMetric.get('nouveaux_cas_thyroide_endocrino')!.mois).toEqual([
      null, null, 1, null, null, null, null, null, null, null, null, null,
    ])
    expect(byMetric.get('nouveaux_venus_diabete')!.mois).toEqual([
      1, 1, null, null, null, null, null, null, 1, null, null, null,
    ])
    expect(byMetric.get('bilan_labo')!.mois).toEqual([
      null, null, 1, null, null, null, null, null, null, null, null, null,
    ])
    expect(byMetric.get('hospitalisation_jour')!.mois).toEqual([
      3, ongoingDays, null, null, null, null, null, null, null, null, null, null,
    ])
    expect(byMetric.get('hospitalisation_complete')!.mois).toEqual([
      null, null, 1, null, null, null, null, null, null, null, null, null,
    ])
    expect(byMetric.get('autres_nouveaux_cas')!.mois).toEqual([
      null, null, null, 1, null, null, null, null, null, null, null, null,
    ])
    expect(byMetric.get('ecg')!.mois).toEqual([
      null, null, null, null, 1, null, null, null, null, null, null, null,
    ])
    expect(byMetric.get('hopital_de_jour')!.mois).toEqual([
      1, 1, null, null, null, null, null, null, null, null, null, null,
    ])

    // Le cumul des mois d'une ligne est exactement la valeur annuelle.
    for (const ligne of monthly.lignes) {
      expect(ligne.total, ligne.metric).toBe(annualRow[ligne.metric])
    }

    expect(monthly.totaux_mois).toEqual([
      7, 3 + ongoingDays, 4, 2, 2, 1, 1, null, 2, null, null, null,
    ])
    expect(monthly.total).toBe(annualRow.total_activites)
  })

  it('renvoie des lignes et totaux null pour une année sans donnée', async () => {
    const monthly = await service.getMonthlyStats({ annee: 2024 })

    expect(monthly.annee).toBe(2024)
    expect(monthly.lignes).toHaveLength(ACTIVITY_KEYS.length)
    for (const ligne of monthly.lignes) {
      expect(ligne.mois).toEqual(Array.from({ length: 12 }, () => null))
      expect(ligne.total).toBeNull()
    }
    expect(monthly.totaux_mois).toEqual(Array.from({ length: 12 }, () => null))
    expect(monthly.total).toBeNull()
  })

  it('refuse une année hors bornes', async () => {
    await expect(service.getMonthlyStats({ annee: 1899 })).rejects.toThrow(/1900/)
  })
})

describe('IndicateursService — surcharges manuelles', () => {
  beforeEach(async () => {
    await sql`DELETE FROM annual_indicator`.execute(db)
  })

  it('une valeur saisie prime sur le calcul, puis clear restaure le calcul', async () => {
    await service.setManuel(2025, 'soins_ambulatoires', 999, 7)

    const afterSet = await service.getAnnualStats({ fromYear: 2025, toYear: 2026 })
    expect(rowOf(afterSet, 2025).soins_ambulatoires).toBe(999)
    expect(rowOf(afterSet, 2025).sources.soins_ambulatoires).toBe('saisi')
    expect(rowOf(afterSet, 2026).soins_ambulatoires).toBe(3)
    expect(rowOf(afterSet, 2026).sources.soins_ambulatoires).toBe('calcule')

    await service.clearManuel(2025, 'soins_ambulatoires')

    const afterClear = await service.getAnnualStats({ fromYear: 2025, toYear: 2026 })
    expect(rowOf(afterClear, 2025).soins_ambulatoires).toBe(8)
    expect(rowOf(afterClear, 2025).sources.soins_ambulatoires).toBe('calcule')
  })

  it('recalcule total et moyenne à partir des activités saisies', async () => {
    await service.setManuel(2025, 'nouveaux_cas_diabete', 10, 1)

    const stats = await service.getAnnualStats({ fromYear: 2025, toYear: 2025 })
    const y2025 = rowOf(stats, 2025)
    const ongoingDays = daysUntilToday('2025-02-01')

    // 8 (soins) + 10 (diabète saisi) + 1 + 3 + 1 + (3 + jours en cours)
    // + 1 + 1 + 1 + 2.
    const expectedTotal = 8 + 10 + 1 + 3 + 1 + (3 + ongoingDays) + 1 + 1 + 1 + 2
    expect(y2025.nouveaux_cas_diabete).toBe(10)
    expect(y2025.sources.nouveaux_cas_diabete).toBe('saisi')
    expect(y2025.total_activites).toBe(expectedTotal)
    expect(y2025.moyenne_activites).toBe(Math.round(expectedTotal / 10))
    expect(y2025.sources.total_activites).toBe('calcule')
  })

  it('refuse la saisie et l’effacement des indicateurs dérivés', async () => {
    // Contrat service (pas seulement l'UI) : les dérivés sont recalculés et
    // ne peuvent jamais être surchargés ni effacés manuellement.
    await expect(service.setManuel(2025, 'total_activites', 50, 1)).rejects.toThrow(
      /calculé automatiquement/,
    )
    await expect(service.setManuel(2025, 'moyenne_activites', 5, 1)).rejects.toThrow(
      /calculé automatiquement/,
    )
    await expect(service.clearManuel(2025, 'total_activites')).rejects.toThrow(
      /calculé automatiquement/,
    )
    await expect(service.clearManuel(2025, 'moyenne_activites')).rejects.toThrow(
      /calculé automatiquement/,
    )

    const rows = await sql<{ n: number }>`
      SELECT COUNT(*) AS n FROM annual_indicator WHERE annee = 2025
    `.execute(db)
    expect(Number(rows.rows[0].n)).toBe(0)
  })

  it('refuse un indicateur inconnu, une année invalide ou une valeur non entière', async () => {
    await expect(service.setManuel(2025, 'inconnu' as any, 1, 1)).rejects.toThrow(/Indicateur inconnu/)
    await expect(service.setManuel(0, 'ecg', 1, 1)).rejects.toThrow(/année/)
    await expect(service.setManuel(2025, 'ecg', -1, 1)).rejects.toThrow(/entier positif/)
    await expect(service.setManuel(2025, 'ecg', 1.5, 1)).rejects.toThrow(/entier positif/)
  })
})
