import { createHandler } from '../utils/create-handler'

const MOCK_BLOCS = [
  {
    heure: '08h00',
    soins: [
      { id: 1, medicament: 'Insuline NOVORAPID', dosage: '10 UI', voie: 'SC', statut: 'en_attente' },
      { id: 2, medicament: 'Furosémide', dosage: '40 mg', voie: 'PO', statut: 'en_attente' },
    ],
  },
  {
    heure: '12h00',
    soins: [
      { id: 3, medicament: 'Metformine', dosage: '500 mg', voie: 'PO', statut: 'en_attente' },
      { id: 4, medicament: 'Insuline TOUJEO', dosage: '20 UI', voie: 'SC', statut: 'en_attente' },
    ],
  },
  {
    heure: '18h00',
    soins: [
      { id: 5, medicament: 'Furosémide', dosage: '40 mg', voie: 'PO', statut: 'valide', validePar: 'IDE Diallo', valideA: '18:10' },
    ],
  },
  {
    heure: '22h00',
    soins: [
      { id: 6, medicament: 'Paracétamol', dosage: '500 mg', voie: 'PO', statut: 'suspendu' },
    ],
  },
]

const MOCK_DISPOSITIFS = [
  { id: 1, type: 'Cathéter périphérique', datePose: '26/06/2026', aspect: 'Sain', volumeMl: null },
  { id: 2, type: 'Sonde urinaire', datePose: '26/06/2026', aspect: 'Sain', volumeMl: 350 },
]

export function registerPatientCareHandlers() {
  // ── Plan de Soins ────────────────────────────────────────────────
  createHandler('plan-soins:list', async (params: { patientId: number; date: string }) => {
    const { patientId, date } = params
    if (!patientId) throw new Error('patientId requis')
    return {
      id: 1,
      patientId,
      date,
      blocs: MOCK_BLOCS,
      createdBy: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  })

  createHandler('plan-soins:valider', async (params: { soinId: number; validePar: string }) => {
    const { soinId, validePar } = params
    const now = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    // Find and update the soin in mock data
    for (const bloc of MOCK_BLOCS) {
      const soin = bloc.soins.find(s => s.id === soinId)
      if (soin) {
        soin.statut = 'valide' as any
        ;(soin as any).validePar = validePar
        ;(soin as any).valideA = now
        return { ...soin, statut: 'valide', validePar, valideA: now }
      }
    }
    throw new Error(`Soin ${soinId} introuvable`)
  })

  createHandler('plan-soins:suspendre', async (params: { soinId: number; motif: string }) => {
    const { soinId } = params
    for (const bloc of MOCK_BLOCS) {
      const soin = bloc.soins.find(s => s.id === soinId)
      if (soin) {
        soin.statut = 'suspendu' as any
        return { ...soin, statut: 'suspendu' }
      }
    }
    throw new Error(`Soin ${soinId} introuvable`)
  })

  // ── Signes Vitaux ────────────────────────────────────────────────
  let savedVitalSigns: Record<string, unknown> | null = null

  createHandler('vital-signs:get-today', async (params: { patientId: number }) => {
    const { patientId } = params
    if (!patientId) throw new Error('patientId requis')
    return savedVitalSigns
      ? { id: 1, patientId, ...savedVitalSigns, createdBy: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      : null
  })

  createHandler('vital-signs:save', async (params: { patientId: number; date: string; taSystolique: number | null; taDiastolique: number | null; frequenceCardiaque: number | null; temperature: number | null; glycemie: number | null }) => {
    const { patientId, ...data } = params
    if (!patientId) throw new Error('patientId requis')
    savedVitalSigns = { ...data }
    return { id: 1, patientId, ...data, createdBy: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  })

  // ── Dispositifs d'accès ──────────────────────────────────────────
  createHandler('dispositifs:list', async (params: { patientId: number }) => {
    const { patientId } = params
    if (!patientId) throw new Error('patientId requis')
    return MOCK_DISPOSITIFS
  })

  createHandler('dispositifs:create', async (params: { patientId: number; type: string; datePose: string; aspect: string; volumeMl: number | null }) => {
    const { patientId, type, datePose, aspect, volumeMl } = params
    if (!patientId) throw new Error('patientId requis')
    const newDispositif = { id: Date.now(), type, datePose, aspect, volumeMl: volumeMl ?? null }
    ;(MOCK_DISPOSITIFS as any[]).push(newDispositif)
    return newDispositif
  })

  createHandler('dispositifs:delete', async (params: { id: number }) => {
    const { id } = params
    const idx = MOCK_DISPOSITIFS.findIndex(d => d.id === id)
    if (idx !== -1) MOCK_DISPOSITIFS.splice(idx, 1)
  })
}
