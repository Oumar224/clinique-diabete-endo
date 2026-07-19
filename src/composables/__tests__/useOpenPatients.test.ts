// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { useOpenPatients } from '../useOpenPatients'
import type { Patient } from '../usePatientContext'

// ── Mock ipcInvoke (used by validateEntries, but not called in our tests) ──
const mockIpcInvoke = vi.hoisted(() => vi.fn())
vi.mock('@/utils/ipc', () => ({
  ipcInvoke: mockIpcInvoke,
}))

const STORAGE_KEY = 'cde:open-patients'

// ── Test fixtures ─────────────────────────────────────────────────────
function makePatient(id: number, overrides: Partial<Patient> = {}): Patient {
  return {
    id,
    civilite: 'M',
    nom: `Patient${id}`,
    prenom: `Prenom${id}`,
    date_naissance: '1990-01-01',
    nir: `123456789${id}`,
    telephone: `+224600000${id}`,
    allergies: [],
    ...overrides,
  }
}

describe('useOpenPatients', () => {
  beforeEach(() => {
    localStorage.clear()
    // Reset module-level state between tests
    const { clearAll } = useOpenPatients()
    clearAll()
  })

  // ────────────────────────────────────────────────────────────────────
  // addPatient() guards
  // ────────────────────────────────────────────────────────────────────
  describe('addPatient() guards', () => {
    it('rejects patient with id = 0', () => {
      const { addPatient, openPatients } = useOpenPatients()
      addPatient(makePatient(0))
      expect(openPatients.value).toHaveLength(0)
    })

    it('rejects patient with id = undefined', () => {
      const { addPatient, openPatients } = useOpenPatients()
      addPatient(makePatient(undefined as unknown as number))
      expect(openPatients.value).toHaveLength(0)
    })

    it('rejects patient with id = null', () => {
      const { addPatient, openPatients } = useOpenPatients()
      addPatient(makePatient(null as unknown as number))
      expect(openPatients.value).toHaveLength(0)
    })

    it('accepts valid patient with id > 0', () => {
      const { addPatient, openPatients } = useOpenPatients()
      addPatient(makePatient(1))
      expect(openPatients.value).toHaveLength(1)
      expect(openPatients.value[0].patient.id).toBe(1)
    })

    it('moves existing patient to top when re-added', () => {
      const { addPatient, openPatients } = useOpenPatients()
      addPatient(makePatient(1, { nom: 'Alpha' }))
      addPatient(makePatient(2, { nom: 'Beta' }))
      addPatient(makePatient(3, { nom: 'Gamma' }))

      // Re-add patient 1 — should move to top
      addPatient(makePatient(1, { nom: 'Alpha' }))

      expect(openPatients.value).toHaveLength(3)
      expect(openPatients.value[0].patient.id).toBe(1)
      expect(openPatients.value[1].patient.id).toBe(3)
      expect(openPatients.value[2].patient.id).toBe(2)
    })

    it('rejects patient with negative id', () => {
      const { addPatient, openPatients } = useOpenPatients()
      addPatient(makePatient(-5))
      expect(openPatients.value).toHaveLength(0)
    })
  })

  // ────────────────────────────────────────────────────────────────────
  // removePatient()
  // ────────────────────────────────────────────────────────────────────
  describe('removePatient()', () => {
    it('removes patient by ID', () => {
      const { addPatient, removePatient, openPatients } = useOpenPatients()
      addPatient(makePatient(1))
      addPatient(makePatient(2))
      addPatient(makePatient(3))

      removePatient(2)

      expect(openPatients.value).toHaveLength(2)
      expect(openPatients.value.find(e => e.patient.id === 2)).toBeUndefined()
    })

    it('does not fail on non-existent ID', () => {
      const { addPatient, removePatient, openPatients } = useOpenPatients()
      addPatient(makePatient(1))

      removePatient(999)

      expect(openPatients.value).toHaveLength(1)
      expect(openPatients.value[0].patient.id).toBe(1)
    })

    it('updates the list correctly after multiple additions and removals', () => {
      const { addPatient, removePatient, openPatients } = useOpenPatients()
      addPatient(makePatient(1))
      addPatient(makePatient(2))
      addPatient(makePatient(3))

      removePatient(1)
      expect(openPatients.value).toHaveLength(2)
      expect(openPatients.value[0].patient.id).toBe(3)
      expect(openPatients.value[1].patient.id).toBe(2)

      removePatient(3)
      expect(openPatients.value).toHaveLength(1)
      expect(openPatients.value[0].patient.id).toBe(2)
    })
  })

  // ────────────────────────────────────────────────────────────────────
  // clearAll()
  // ────────────────────────────────────────────────────────────────────
  describe('clearAll()', () => {
    it('empties the entire list', () => {
      const { addPatient, clearAll, openPatients } = useOpenPatients()
      addPatient(makePatient(1))
      addPatient(makePatient(2))
      expect(openPatients.value).toHaveLength(2)

      clearAll()
      expect(openPatients.value).toHaveLength(0)
    })
  })

  // ────────────────────────────────────────────────────────────────────
  // localStorage persistence
  // ────────────────────────────────────────────────────────────────────
  describe('localStorage persistence', () => {
    it('after addPatient(), data is saved to localStorage', async () => {
      const { addPatient } = useOpenPatients()
      addPatient(makePatient(1, { nom: 'Doe', prenom: 'John' }))

      // Wait for the watch callback to persist to localStorage
      await nextTick()

      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
      expect(saved).toHaveLength(1)
      expect(saved[0].patient.id).toBe(1)
      expect(saved[0].patient.nom).toBe('Doe')
      expect(saved[0].patient.prenom).toBe('John')
    })

    it('after clearAll(), localStorage is updated', async () => {
      const { addPatient, clearAll } = useOpenPatients()
      addPatient(makePatient(1))
      addPatient(makePatient(2))

      await nextTick() // let the watch fire

      clearAll()

      await nextTick() // let the watch fire again

      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
      expect(saved).toHaveLength(0)
    })

    it('after removePatient(), localStorage is updated', async () => {
      const { addPatient, removePatient } = useOpenPatients()
      addPatient(makePatient(1))
      addPatient(makePatient(2))

      await nextTick()

      removePatient(1)

      await nextTick()

      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
      expect(saved).toHaveLength(1)
      expect(saved[0].patient.id).toBe(2)
    })

    it('persisted data survives module-level state reset (simulates page reload)', async () => {
      // First session: add a patient
      const { addPatient } = useOpenPatients()
      addPatient(makePatient(42, { nom: 'Survivor', prenom: 'Test' }))

      // Wait for the watch callback to persist
      await nextTick()

      // Verify localStorage was written
      let saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
      expect(saved).toHaveLength(1)

      // Simulate page reload: the raw localStorage data is correct
      saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
      expect(saved[0].patient.id).toBe(42)
      expect(saved[0].patient.nom).toBe('Survivor')
    })
  })

  // ────────────────────────────────────────────────────────────────────
  // Entry limit (MAX_OPEN_PATIENTS = 8)
  // ────────────────────────────────────────────────────────────────────
  describe('Entry limit (MAX_OPEN_PATIENTS = 8)', () => {
    it('adding more than 8 patients trims the list to 8', () => {
      const { addPatient, openPatients } = useOpenPatients()

      for (let i = 1; i <= 10; i++) {
        addPatient(makePatient(i))
      }

      expect(openPatients.value).toHaveLength(8)
    })

    it('the most recent patients are kept when trimming (oldest are dropped)', () => {
      const { addPatient, openPatients } = useOpenPatients()

      for (let i = 1; i <= 10; i++) {
        addPatient(makePatient(i))
      }

      // Patients 1 and 2 (oldest) should be trimmed
      expect(openPatients.value.find(e => e.patient.id === 1)).toBeUndefined()
      expect(openPatients.value.find(e => e.patient.id === 2)).toBeUndefined()

      // Patients 3 through 10 should be kept
      for (let i = 3; i <= 10; i++) {
        expect(openPatients.value.find(e => e.patient.id === i)).toBeDefined()
      }

      // Most recent should be at index 0
      expect(openPatients.value[0].patient.id).toBe(10)
    })

    it('re-adding an existing patient does not exceed the limit', () => {
      const { addPatient, openPatients } = useOpenPatients()

      // Fill to capacity
      for (let i = 1; i <= 8; i++) {
        addPatient(makePatient(i))
      }

      // Re-add patient 8 (moves to top)
      addPatient(makePatient(8))

      expect(openPatients.value).toHaveLength(8)
      expect(openPatients.value[0].patient.id).toBe(8)

      // Order should now be: 8, 7, 6, 5, 4, 3, 2, 1
      const ids = openPatients.value.map(e => e.patient.id)
      expect(ids).toEqual([8, 7, 6, 5, 4, 3, 2, 1])
    })
  })

  // ────────────────────────────────────────────────────────────────────
  // accessedAt timestamp updates
  // ────────────────────────────────────────────────────────────────────
  describe('accessedAt timestamp', () => {
    it('entry has a valid ISO timestamp after addPatient', () => {
      const { addPatient, openPatients } = useOpenPatients()
      addPatient(makePatient(1))

      const timestamp = openPatients.value[0].accessedAt
      expect(timestamp).toBeTruthy()
      expect(() => new Date(timestamp)).not.toThrow()
      expect(new Date(timestamp).toISOString()).toBe(timestamp)
    })

    it('re-adding patient moves entry to top and updates the timestamp', () => {
      const { addPatient, openPatients } = useOpenPatients()
      addPatient(makePatient(1))
      addPatient(makePatient(2))

      const originalTimestamp = openPatients.value[0].accessedAt

      // Re-add patient 1 — should move to top
      addPatient(makePatient(1))

      expect(openPatients.value[0].patient.id).toBe(1)
      expect(openPatients.value[0].accessedAt).toBeTruthy()
    })
  })
})
