// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, defineComponent, h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { ElMessageBox } from 'element-plus'
import { provideVitalSigns } from '../useVitalSigns'
import { usePlanSoins, getPlanSoins, getPlanSoinsDates, getValidesPlanSoins, reprendreSoin, suspendrePrescription, reprendrePrescription, isInsulin, voieColor } from '../usePlanSoins'
import { useAuth } from '@/composables/useAuth'
import type { PlanSoinsContext } from '../usePlanSoins'
import type { BlocHoraire, SoinItem } from '@/types/soins'

const mockIpcInvoke = vi.hoisted(() => vi.fn())

vi.mock('@/utils/ipc', () => ({
  ipcInvoke: mockIpcInvoke,
}))

vi.mock('@/composables/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: ref({ prenom: 'Test', nom: 'User' }),
  })),
}))

vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), warning: vi.fn(), info: vi.fn(), error: vi.fn() },
  ElMessageBox: { prompt: vi.fn(async (_title: string, _msg: string, opts?: any) => {
    if (opts?.inputValidator) {
      const result = opts.inputValidator('Test motif')
      if (result !== true && typeof result === 'string') throw new Error(result)
    }
    return { value: 'Refus patient' }
  }) },
}))

const SOIN_EN_ATTENTE: SoinItem = { id: 1, medicament: 'Metformine', dosage: '500 mg', voie: 'PO', statut: 'en_attente' }
const SOIN_INSULIN: SoinItem = { id: 2, medicament: 'Insuline NOVORAPID', dosage: '10 UI', voie: 'SC', statut: 'en_attente' }
const SOIN_VALIDE: SoinItem = { id: 3, medicament: 'Furosémide', dosage: '40 mg', voie: 'PO', statut: 'valide', validePar: 'IDE Test', valideA: '10:30' }
const SOIN_SUSPENDU: SoinItem = { id: 4, medicament: 'Paracétamol', dosage: '500 mg', voie: 'PO', statut: 'suspendu' }

const DEFAULT_BLOCS: BlocHoraire[] = [
  { heure: '08h00', soins: [SOIN_EN_ATTENTE, SOIN_INSULIN] },
  { heure: '12h00', soins: [SOIN_VALIDE, SOIN_SUSPENDU] },
]

function makePlanRecord(overrides: Partial<{
  blocs: BlocHoraire[]
}> = {}) {
  return {
    id: 1,
    patientId: 1,
    date: new Date().toISOString().slice(0, 10),
    blocs: DEFAULT_BLOCS,
    createdBy: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

function mountPlanSoinsContext(patientIdValue: number | null) {
  const patientId = ref<number | null>(patientIdValue)
  let ctx!: PlanSoinsContext

  const Child = defineComponent({
    setup() {
      ctx = usePlanSoins(patientId)
      return () => null
    },
  })

  mount(
    defineComponent({
      setup() {
        provideVitalSigns(patientId)
        return () => h(Child)
      },
    }),
  )

  return { ctx, patientId }
}

describe('usePlanSoins', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIpcInvoke.mockImplementation(async (channel: string, params?: any) => {
      if (channel === 'plan-soins:list') return makePlanRecord()
      if (channel === 'plan-soins:valider') return { ...SOIN_EN_ATTENTE, statut: 'valide' as const, validePar: params?.validePar, valideA: '10:30' }
      if (channel === 'plan-soins:suspendre') return { ...SOIN_EN_ATTENTE, statut: 'suspendu' as const, motifSuspension: params?.motif }
      if (channel === 'vital-signs:get-today') return null
      return null
    })
  })

  describe('initial state', () => {
    it('starts with empty blocs and not loading', () => {
      const { ctx } = mountPlanSoinsContext(null)
      expect(ctx.blocs.value).toEqual([])
      expect(ctx.loading.value).toBe(false)
      expect(ctx.error.value).toBeNull()
      expect(ctx.insulinBlocked.value).toBe(false)
    })
  })

  describe('fetchPlan', () => {
    it('fetches plan from API and sets blocs', async () => {
      const { ctx } = mountPlanSoinsContext(null)
      await ctx.fetchPlan(1, '2026-07-03')
      expect(mockIpcInvoke).toHaveBeenCalledWith('plan-soins:list', { patientId: 1, date: '2026-07-03' })
      expect(ctx.blocs.value.length).toBe(2)
      expect(ctx.blocs.value[0].heure).toBe('08h00')
      expect(ctx.blocs.value[1].heure).toBe('12h00')
    })

    it('sets blocs to empty when API returns null', async () => {
      mockIpcInvoke.mockImplementation(async (channel: string) => {
        if (channel === 'plan-soins:list') return null
        if (channel === 'vital-signs:get-today') return null
        return null
      })
      const { ctx } = mountPlanSoinsContext(null)
      await ctx.fetchPlan(1, '2026-07-03')
      expect(ctx.blocs.value).toEqual([])
    })

    it('does not fetch when id is falsy', async () => {
      const { ctx } = mountPlanSoinsContext(null)
      await ctx.fetchPlan(0, '2026-07-03')
      const listCalls = mockIpcInvoke.mock.calls.filter(([ch]: [string]) => ch === 'plan-soins:list')
      expect(listCalls).toHaveLength(0)
      expect(ctx.blocs.value).toEqual([])
    })

    it('sets error on API failure', async () => {
      mockIpcInvoke.mockImplementation(async (channel: string) => {
        if (channel === 'plan-soins:list') throw new Error('Network error')
        if (channel === 'vital-signs:get-today') return null
        return null
      })
      const { ctx } = mountPlanSoinsContext(null)
      await ctx.fetchPlan(1, '2026-07-03')
      expect(ctx.error.value).toBe('Network error')
    })
  })

  describe('auto-fetch on patientId change', () => {
    it('calls fetchPlan when patientId becomes non-null', async () => {
      const { patientId } = mountPlanSoinsContext(null)
      patientId.value = 1
      await nextTick()
      await new Promise(r => setTimeout(r, 0))
      const listCalls = mockIpcInvoke.mock.calls.filter(([ch]: [string]) => ch === 'plan-soins:list')
      expect(listCalls.length).toBeGreaterThan(0)
    })

    it('clears blocs when patientId becomes null', async () => {
      const { ctx, patientId } = mountPlanSoinsContext(1)
      await nextTick()
      await new Promise(r => setTimeout(r, 0))
      patientId.value = null
      await nextTick()
      expect(ctx.blocs.value).toEqual([])
    })
  })

  describe('valider', () => {
    it('calls api and updates local blocs on success', async () => {
      const { ctx } = mountPlanSoinsContext(null)
      await ctx.fetchPlan(1, '2026-07-03')
      await ctx.valider(SOIN_EN_ATTENTE)
      const validerCalls = mockIpcInvoke.mock.calls.filter(([ch]: [string]) => ch === 'plan-soins:valider')
      expect(validerCalls).toHaveLength(1)
      const updatedSoin = ctx.blocs.value[0].soins[0]
      expect(updatedSoin.statut).toBe('valide')
    })

    it('blocks insulin when insulinBlocked and no glycemia', async () => {
      const { ctx } = mountPlanSoinsContext(null)
      await ctx.fetchPlan(1, '2026-07-03')
      await ctx.valider(SOIN_INSULIN)
      const validerCalls = mockIpcInvoke.mock.calls.filter(([ch]: [string]) => ch === 'plan-soins:valider')
      expect(validerCalls).toHaveLength(0)
      expect(ctx.insulinBlocked.value).toBe(true)
    })

    it('does not block non-insulin medication', async () => {
      const { ctx } = mountPlanSoinsContext(null)
      await ctx.fetchPlan(1, '2026-07-03')
      await ctx.valider(SOIN_EN_ATTENTE)
      const validerCalls = mockIpcInvoke.mock.calls.filter(([ch]: [string]) => ch === 'plan-soins:valider')
      expect(validerCalls.length).toBeGreaterThan(0)
      expect(ctx.insulinBlocked.value).toBe(false)
    })

    it('sets error on API failure', async () => {
      mockIpcInvoke.mockImplementation(async (channel: string, params?: any) => {
        if (channel === 'plan-soins:list') return makePlanRecord()
        if (channel === 'plan-soins:valider') throw new Error('DB error')
        if (channel === 'vital-signs:get-today') return null
        return null
      })
      const { ctx } = mountPlanSoinsContext(null)
      await ctx.fetchPlan(1, '2026-07-03')
      await ctx.valider(SOIN_EN_ATTENTE)
      expect(ctx.error.value).toBe('DB error')
    })

    it('uses "Utilisateur inconnu" when user is null', async () => {
      vi.mocked(useAuth).mockReturnValueOnce({ user: ref(null) } as any)
      const { ctx } = mountPlanSoinsContext(null)
      await ctx.fetchPlan(1, '2026-07-03')
      await ctx.valider(SOIN_EN_ATTENTE)
      const validerCalls = mockIpcInvoke.mock.calls.filter(([ch]: [string]) => ch === 'plan-soins:valider')
      expect(validerCalls.length).toBe(1)
    })

    it('handles soin not found in any bloc gracefully', async () => {
      mockIpcInvoke.mockImplementation(async (channel: string, params?: any) => {
        if (channel === 'plan-soins:list') return { blocs: [{ heure: '08h00', soins: [{ id: 99, medicament: 'Other', dosage: '100mg', voie: 'PO', statut: 'en_attente' }] }] }
        if (channel === 'plan-soins:valider') return { id: params?.soinId, statut: 'valide', validePar: params?.validePar, valideA: '10:30' }
        if (channel === 'vital-signs:get-today') return null
        return null
      })
      const { ctx } = mountPlanSoinsContext(null)
      await ctx.fetchPlan(1, '2026-07-03')
      await ctx.valider({ id: 1, medicament: 'Metformine', dosage: '500mg', voie: 'PO', statut: 'en_attente' })
      expect(ctx.blocs.value[0].soins[0].id).toBe(99)
    })
  })

  describe('suspendre', () => {
    it('calls api and updates local blocs on success', async () => {
      const { ctx } = mountPlanSoinsContext(null)
      await ctx.fetchPlan(1, '2026-07-03')
      await ctx.suspendre(SOIN_EN_ATTENTE)
      const suspendreCalls = mockIpcInvoke.mock.calls.filter(([ch]: [string]) => ch === 'plan-soins:suspendre')
      expect(suspendreCalls).toHaveLength(1)
      const updatedSoin = ctx.blocs.value[0].soins[0]
      expect(updatedSoin.statut).toBe('suspendu')
    })

    it('does nothing when user cancels the prompt', async () => {
      vi.mocked(ElMessageBox.prompt).mockRejectedValueOnce('cancel')
      const { ctx } = mountPlanSoinsContext(null)
      await ctx.fetchPlan(1, '2026-07-03')
      await ctx.suspendre(SOIN_EN_ATTENTE)
      const suspendreCalls = mockIpcInvoke.mock.calls.filter(([ch]: [string]) => ch === 'plan-soins:suspendre')
      expect(suspendreCalls).toHaveLength(0)
    })

    it('sets error on API failure', async () => {
      mockIpcInvoke.mockImplementation(async (channel: string, params?: any) => {
        if (channel === 'plan-soins:list') return makePlanRecord()
        if (channel === 'plan-soins:suspendre') throw new Error('DB error')
        if (channel === 'vital-signs:get-today') return null
        return null
      })
      const { ctx } = mountPlanSoinsContext(null)
      await ctx.fetchPlan(1, '2026-07-03')
      await ctx.suspendre(SOIN_EN_ATTENTE)
      expect(ctx.error.value).toBe('DB error')
    })

    it('returns early on close error', async () => {
      vi.mocked(ElMessageBox.prompt).mockRejectedValueOnce('close')
      const { ctx } = mountPlanSoinsContext(null)
      await ctx.fetchPlan(1, '2026-07-03')
      await ctx.suspendre(SOIN_EN_ATTENTE)
      const suspendreCalls = mockIpcInvoke.mock.calls.filter(([ch]: [string]) => ch === 'plan-soins:suspendre')
      expect(suspendreCalls).toHaveLength(0)
    })

    it('handles non-Error string throw from IPC', async () => {
      mockIpcInvoke.mockImplementation(async (channel: string) => {
        if (channel === 'plan-soins:list') return makePlanRecord()
        if (channel === 'plan-soins:suspendre') throw 'raw string error'
        if (channel === 'vital-signs:get-today') return null
        return null
      })
      const { ctx } = mountPlanSoinsContext(null)
      await ctx.fetchPlan(1, '2026-07-03')
      await ctx.suspendre(SOIN_EN_ATTENTE)
      expect(ctx.error.value).toBe('raw string error')
    })
  })
})

describe('standalone exported functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIpcInvoke.mockResolvedValue(null)
  })

  it('getPlanSoins calls ipcInvoke with correct params', async () => {
    const mockRecord = { id: 1, patientId: 1, date: '2026-01-01', blocs: [] }
    mockIpcInvoke.mockResolvedValueOnce(mockRecord)
    const result = await getPlanSoins(1, '2026-01-01')
    expect(mockIpcInvoke).toHaveBeenCalledWith('plan-soins:list', { patientId: 1, date: '2026-01-01' })
    expect(result).toBe(mockRecord)
  })

  it('getPlanSoinsDates calls ipcInvoke with correct params', async () => {
    const mockDates = ['2026-07-03', '2026-07-01']
    mockIpcInvoke.mockResolvedValueOnce(mockDates)
    const result = await getPlanSoinsDates(1)
    expect(mockIpcInvoke).toHaveBeenCalledWith('plan-soins:dates', { patientId: 1 })
    expect(result).toBe(mockDates)
  })

  it('getValidesPlanSoins calls ipcInvoke with correct params', async () => {
    const mockRecords = [{ date: '2026-01-01', heure: '08h00', medicament: 'M', dosage: '100mg', voie: 'PO', validePar: null, valideA: null }]
    mockIpcInvoke.mockResolvedValueOnce(mockRecords)
    const result = await getValidesPlanSoins(1, '2026-01-01', '2026-01-07')
    expect(mockIpcInvoke).toHaveBeenCalledWith('plan-soins:valides', { patientId: 1, startDate: '2026-01-01', endDate: '2026-01-07' })
    expect(result).toBe(mockRecords)
  })

  it('reprendreSoin calls ipcInvoke with correct params', async () => {
    mockIpcInvoke.mockResolvedValueOnce({ id: 1 })
    const result = await reprendreSoin(1)
    expect(mockIpcInvoke).toHaveBeenCalledWith('plan-soins:reprise', { soinId: 1 })
    expect(result).toEqual({ id: 1 })
  })

  it('suspendrePrescription calls ipcInvoke with correct params', async () => {
    mockIpcInvoke.mockResolvedValueOnce([{ id: 1 }])
    const result = await suspendrePrescription(5, 'Motif test')
    expect(mockIpcInvoke).toHaveBeenCalledWith('plan-soins:suspendre-prescription', { prescriptionId: 5, motif: 'Motif test' })
    expect(result).toEqual([{ id: 1 }])
  })

  it('reprendrePrescription calls ipcInvoke with correct params', async () => {
    mockIpcInvoke.mockResolvedValueOnce([{ id: 1 }])
    const result = await reprendrePrescription(10)
    expect(mockIpcInvoke).toHaveBeenCalledWith('plan-soins:reprendre-prescription', { prescriptionId: 10 })
    expect(result).toEqual([{ id: 1 }])
  })
})

describe('re-exported functions from soins', () => {
  it('isInsulin detects insulin medications', () => {
    expect(isInsulin('Insuline Lantus')).toBe(true)
    expect(isInsulin('Metformine')).toBe(false)
  })

  it('voieColor returns a value for known voie', () => {
    const color = voieColor('PO')
    expect(color).toBeDefined()
  })
})
