<template>
  <div class="sejour-view cde" v-loading="loading">
    <div class="cde-panels">
      <!-- Section 1: Séjour en cours -->
      <section class="cde-panel">
        <div class="cde-panel__head">
          <span class="cde-panel__title">Séjour en cours</span>
          <span v-if="activeStay" class="cde-badge" :class="stayStatusClass(activeStay.status)">
            {{ stayStatusLabel(activeStay.status) }}
          </span>
        </div>
        <div v-if="!activeStay" class="cde-empty">Aucun séjour actif</div>
        <div v-else class="sejour-view__body">
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="N° Séjour">{{ activeStay.id }}</el-descriptions-item>
            <el-descriptions-item label="Date d'entrée">{{ formatDate(activeStay.admission_date) }}</el-descriptions-item>
            <el-descriptions-item label="Mode d'admission">
              <span class="cde-badge" :class="admissionClass(activeStay.mode_admission)">
                {{ admissionLabel(activeStay.mode_admission) }}
              </span>
            </el-descriptions-item>
            <el-descriptions-item label="Type d'hospitalisation">
              {{ stayTypeLabel(activeStay.type) }}
            </el-descriptions-item>
            <el-descriptions-item label="Service / Unité">{{ activeStay.service_name || '—' }}</el-descriptions-item>
            <el-descriptions-item label="Chambre / Lit">
              {{ activeStay.chambre || '—' }}{{ activeStay.lit ? ` / Lit ${activeStay.lit}` : '' }}
            </el-descriptions-item>
            <el-descriptions-item label="Médecin référent">{{ activeStay.medecin_name || '—' }}</el-descriptions-item>
          </el-descriptions>
        </div>
      </section>

      <!-- Section 1b: Informations administratives -->
      <section class="cde-panel">
        <div class="cde-panel__head">
          <span class="cde-panel__title">Informations administratives</span>
        </div>
        <div class="sejour-view__body">
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="NIP">{{ patientInfo?.nip || '—' }}</el-descriptions-item>
            <el-descriptions-item label="N° SS / INS">{{ patientInfo?.nir || '—' }}</el-descriptions-item>
            <el-descriptions-item label="Assurance / Mutuelle">{{ patientInfo?.assuranceMutuelle || '—' }}</el-descriptions-item>
            <el-descriptions-item label="Consentement études">{{ patientInfo?.consentementEtude || 'Non précisé' }}</el-descriptions-item>
          </el-descriptions>
        </div>
      </section>
    </div>

    <!-- Section 2: Timeline du séjour (mouvements du contact associé) -->
    <section class="cde-panel sejour-view__timeline">
      <div class="cde-panel__head">
        <span class="cde-panel__title">Timeline du séjour</span>
      </div>
      <div v-if="!activeEncounter" class="cde-empty">Aucun contact hospitalisation actif</div>
      <StayTimeline v-else :movements="timelineMovements" :loading="loadingMovements"
        :contact-status="activeEncounter?.status ?? 'closed'"
        :stay-status="activeStay?.status ?? 'cloture'" />
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { usePatientContext } from '@/composables/usePatientContext'
import { useStays } from '@/composables/useStays'
import { useEncounters } from '@/composables/useEncounters'
import type { StayDto, StayMovementDto } from '@/composables/useStays'
import type { EncounterDto, EncounterMovementDto } from '@/composables/useEncounters'
import StayTimeline from '@/components/patients/StayTimeline.vue'
import { on } from '@/utils/eventBus'

const route = useRoute()
const { activePatient } = usePatientContext()
const { getActiveStay, listStaysByPatient } = useStays()
const { listEncountersByPatient, getEncounterMovements } = useEncounters()

const patientId = computed(() => {
  const id = Number(route.params.id)
  return Number.isFinite(id) && id > 0 ? id : (activePatient.value?.id ?? 0)
})
const patientInfo = computed(() => activePatient.value)

const loading = ref(true)
const activeStay = ref<StayDto | null>(null)
const activeEncounter = ref<EncounterDto | null>(null)
const encounterMovements = ref<EncounterMovementDto[]>([])
const loadingMovements = ref(false)

const timelineMovements = computed<StayMovementDto[]>(() =>
  encounterMovements.value.map(m => ({
    id: m.id,
    stay_id: activeStay.value?.id ?? 0,
    movement_type: (m.step_label === 'Admission' ? 'admission' : m.step_label === 'Sortie' ? 'sortie' : 'transfert_service') as StayMovementDto['movement_type'],
    from_service_id: m.from_service_id ?? null,
    from_service_name: m.from_service_name ?? undefined,
    to_service_id: m.service_id ?? null,
    to_service_name: m.service_name ?? undefined,
    moved_at: m.entered_at,
    exited_at: m.exited_at ?? null,
    notes: m.notes ?? null,
    created_at: m.created_at ?? undefined,
  }))
)

function formatDate(dateStr: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }) + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function admissionLabel(mode: string): string {
  const labels: Record<string, string> = {
    urgences: 'Urgences',
    programmee: 'Programmée',
    transfert: 'Transfert',
  }
  return labels[mode] || mode
}

function stayTypeLabel(type?: string | null): string {
  const labels: Record<string, string> = {
    jour: 'Hôpital de jour',
    complete: 'Hospitalisation complète',
  }
  return type ? labels[type] || type : '—'
}

function admissionClass(mode: string): string {
  return mode === 'urgences' ? 'cde-badge--danger' : mode === 'transfert' ? 'cde-badge--warning' : 'cde-badge--success'
}

function stayStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    en_cours: 'En cours',
    cloture: 'Clôturé',
    transfere: 'Transféré',
  }
  return labels[status] || status
}

function stayStatusClass(status: string): string {
  return status === 'en_cours' ? 'cde-badge--success' : status === 'transfere' ? 'cde-badge--warning' : 'cde-badge--info'
}

async function loadStayData() {
  try {
    activeStay.value = await getActiveStay(patientId.value)
    let encounter: EncounterDto | null = null

    if (activeStay.value?.id) {
      // Load the active hospitalisation contact for this patient
      const encounters = await listEncountersByPatient(patientId.value, 'active')
      encounter = encounters.find(e => e.contact_type === 'hospitalisation') ?? null
    }

    if (!encounter) {
      // Fallback to the most recent closed stay
      const allStays = await listStaysByPatient(patientId.value)
      const closedStay = allStays
        .filter(s => s.status === 'cloture')
        .sort((a, b) => new Date(b.sortie_date ?? b.admission_date ?? 0).getTime() - new Date(a.sortie_date ?? a.admission_date ?? 0).getTime())[0]
      if (closedStay) {
        activeStay.value = closedStay
        // Find the associated encounter (any status)
        const allEncounters = await listEncountersByPatient(patientId.value)
        encounter = allEncounters.find(e => e.contact_type === 'hospitalisation') ?? null
      }
    }

    activeEncounter.value = encounter

    loadingMovements.value = true
    try {
      if (encounter?.id) {
        encounterMovements.value = await getEncounterMovements(encounter.id)
      } else {
        encounterMovements.value = []
      }
    } catch {
      encounterMovements.value = []
    } finally {
      loadingMovements.value = false
    }
  } catch {
    activeStay.value = null
    activeEncounter.value = null
    encounterMovements.value = []
  }
}

onMounted(async () => {
  loading.value = true
  await loadStayData()
  loading.value = false
})

let unsubMovement: (() => void) | null = null
onMounted(() => {
  unsubMovement = on('movement-updated', () => {
    loadStayData()
  })
})

onUnmounted(() => {
  unsubMovement?.()
})
</script>

<style scoped>
.sejour-view {
  width: 100%;
}

.sejour-view__body {
  padding: 10px 12px;
}

.sejour-view__timeline {
  margin-top: 12px;
}

.sejour-view__body :deep(.el-descriptions__body) {
  background: transparent;
}

.sejour-view__body :deep(.el-descriptions__label) {
  width: 160px;
  color: var(--cde-muted);
  font-weight: 500;
}

.sejour-view__body :deep(.el-descriptions__content) {
  color: var(--cd-gray-900);
}
</style>
