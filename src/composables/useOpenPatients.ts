import { ref, computed, watch } from 'vue'
import type { Patient } from './usePatientContext'
import { ipcInvoke } from '@/utils/ipc'

const MAX_OPEN_PATIENTS = 8
const STORAGE_KEY = 'cde:open-patients'

export interface OpenPatientEntry {
  patient: Patient
  accessedAt: string // ISO date string for serialization
}

// ── Module-level state (shared across all components) ──
const _entries = ref<OpenPatientEntry[]>([])

// Restore from localStorage on first load
function hydrate() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed: OpenPatientEntry[] = JSON.parse(raw)
      _entries.value = parsed.slice(0, MAX_OPEN_PATIENTS)
    }
  } catch {
    // corrupted storage — start fresh
    _entries.value = []
  }
}
hydrate()

// Persist to localStorage whenever the list changes
watch(_entries, (list) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    // storage full or blocked — silently degrade
  }
}, { deep: true })


/**
 * Validate stored open patient entries against the database.
 * Removes entries whose patients no longer exist.
 * Call this once during app initialization (e.g. from DashboardLayout).
 */
export async function validateEntries() {
  const ids = _entries.value.map(e => e.patient.id).filter(id => id > 0)
  if (ids.length === 0) return
  try {
    const exists = await ipcInvoke<Record<number, boolean>>('patients:exists', { ids })
    _entries.value = _entries.value.filter(e => exists[e.patient.id] !== false)
  } catch {
    // silently fail — keep existing entries
  }
}

// ── Composable ──
export function useOpenPatients() {
  const openPatients = computed(() => _entries.value)

  function addPatient(patient: Patient) {
    if (!patient || !patient.id || patient.id <= 0) return
    const idx = _entries.value.findIndex(e => e.patient.id === patient.id)
    const entry: OpenPatientEntry = {
      patient: { ...patient },
      accessedAt: new Date().toISOString(),
    }

    if (idx >= 0) {
      // Move to top
      _entries.value = [
        entry,
        ..._entries.value.filter((_, i) => i !== idx),
      ]
    } else {
      _entries.value = [entry, ..._entries.value]
      if (_entries.value.length > MAX_OPEN_PATIENTS) {
        _entries.value = _entries.value.slice(0, MAX_OPEN_PATIENTS)
      }
    }
  }

  function removePatient(patientId: number) {
    _entries.value = _entries.value.filter(e => e.patient.id !== patientId)
  }

  function clearAll() {
    _entries.value = []
  }

  return {
    openPatients,
    addPatient,
    removePatient,
    clearAll,
  }
}
