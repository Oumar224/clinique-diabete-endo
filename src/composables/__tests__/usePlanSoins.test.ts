// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, defineComponent, h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { ElMessageBox } from 'element-plus'
import { provideVitalSigns } from '../useVitalSigns'
import { usePlanSoins } from '../usePlanSoins'
import type { PlanSoinsContext } from '../usePlanSoins'
import type { BlocHoraire, SoinItem } from '@/types/soins'

const { mockGetPlanSoins, mockValiderSoin, mockSuspendreSoin } = vi.hoisted(() => ({
  mockGetPlanSoins: vi.fn(),
  mockValiderSoin: vi.fn(),
  mockSuspendreSoin: vi.fn(),
}))

vi.mock('@/api/planSoins', () => ({
  getPlanSoins: mockGetPlanSoins,
  validerSoin: mockValiderSoin,
  suspendreSoin: mockSuspendreSoin,
}))

vi.mock('@/api/vitalSigns', () => ({
  getVitalSigns: vi.fn(() => Promise.resolve(null)),
  saveVitalSigns: vi.fn(),
}))

vi.mock('@/composables/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: ref({ prenom: 'Test', nom: 'User' }),
  })),
}))

vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), warning: vi.fn(), info: vi.fn(), error: vi.fn() },
  ElMessageBox: { prompt: vi.fn(() => Promise.resolve({ value: 'Refus patient' })) },
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
    mockGetPlanSoins.mockResolvedValue(makePlanRecord())
    mockValiderSoin.mockImplementation(async (_id: number, validePar: string) => ({
      ...SOIN_EN_ATTENTE,
      statut: 'valide' as const,
      validePar,
      valideA: '10:30',
    }))
    mockSuspendreSoin.mockImplementation(async (_id: number, _motif: string) => ({
      ...SOIN_EN_ATTENTE,
      statut: 'suspendu' as const,
      motifSuspension: _motif,
    }))
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
      expect(mockGetPlanSoins).toHaveBeenCalledWith(1, '2026-07-03')
      expect(ctx.blocs.value.length).toBe(2)
      expect(ctx.blocs.value[0].heure).toBe('08h00')
      expect(ctx.blocs.value[1].heure).toBe('12h00')
    })

    it('sets blocs to empty when API returns null', async () => {
      mockGetPlanSoins.mockResolvedValue(null)
      const { ctx } = mountPlanSoinsContext(null)
      await ctx.fetchPlan(1, '2026-07-03')
      expect(ctx.blocs.value).toEqual([])
    })

    it('does not fetch when id is falsy', async () => {
      const { ctx } = mountPlanSoinsContext(null)
      await ctx.fetchPlan(0, '2026-07-03')
      expect(mockGetPlanSoins).not.toHaveBeenCalled()
      expect(ctx.blocs.value).toEqual([])
    })

    it('sets error on API failure', async () => {
      mockGetPlanSoins.mockRejectedValue(new Error('Network error'))
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
      expect(mockGetPlanSoins).toHaveBeenCalled()
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
      expect(mockValiderSoin).toHaveBeenCalledWith(1, 'Test User')
      const updatedSoin = ctx.blocs.value[0].soins[0]
      expect(updatedSoin.statut).toBe('valide')
    })

    it('blocks insulin when insulinBlocked and no glycemia', async () => {
      const { ctx } = mountPlanSoinsContext(null)
      await ctx.fetchPlan(1, '2026-07-03')
      await ctx.valider(SOIN_INSULIN)
      expect(mockValiderSoin).not.toHaveBeenCalled()
      expect(ctx.insulinBlocked.value).toBe(true)
    })

    it('does not block non-insulin medication', async () => {
      const { ctx } = mountPlanSoinsContext(null)
      await ctx.fetchPlan(1, '2026-07-03')
      await ctx.valider(SOIN_EN_ATTENTE)
      expect(mockValiderSoin).toHaveBeenCalled()
      expect(ctx.insulinBlocked.value).toBe(false)
    })

    it('sets error on API failure', async () => {
      mockValiderSoin.mockRejectedValue(new Error('DB error'))
      const { ctx } = mountPlanSoinsContext(null)
      await ctx.fetchPlan(1, '2026-07-03')
      await ctx.valider(SOIN_EN_ATTENTE)
      expect(ctx.error.value).toBe('DB error')
    })
  })

  describe('suspendre', () => {
    it('calls api and updates local blocs on success', async () => {
      const { ctx } = mountPlanSoinsContext(null)
      await ctx.fetchPlan(1, '2026-07-03')
      await ctx.suspendre(SOIN_EN_ATTENTE)
      expect(mockSuspendreSoin).toHaveBeenCalledWith(1, 'Refus patient')
      const updatedSoin = ctx.blocs.value[0].soins[0]
      expect(updatedSoin.statut).toBe('suspendu')
    })

    it('does nothing when user cancels the prompt', async () => {
      vi.mocked(ElMessageBox.prompt).mockRejectedValueOnce('cancel')
      const { ctx } = mountPlanSoinsContext(null)
      await ctx.fetchPlan(1, '2026-07-03')
      await ctx.suspendre(SOIN_EN_ATTENTE)
      expect(mockSuspendreSoin).not.toHaveBeenCalled()
    })

    it('sets error on API failure', async () => {
      mockSuspendreSoin.mockRejectedValue(new Error('DB error'))
      const { ctx } = mountPlanSoinsContext(null)
      await ctx.fetchPlan(1, '2026-07-03')
      await ctx.suspendre(SOIN_EN_ATTENTE)
      expect(ctx.error.value).toBe('DB error')
    })
  })
})
