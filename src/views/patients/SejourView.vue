<template>
  <div class="sejour-view" v-loading="loading">
    <!-- Section 1: Séjour en cours + Infos admin -->
    <el-row :gutter="24">
      <el-col :span="12">
        <el-card class="sejour-view__card">
          <template #header>
            <div class="sejour-view__card-header">
              <span><strong>Séjour en cours</strong></span>
              <el-tag v-if="activeStay" :type="stayStatusTag(activeStay.status)" size="small" effect="dark">
                {{ stayStatusLabel(activeStay.status) }}
              </el-tag>
            </div>
          </template>
          <div v-if="!activeStay" class="sejour-view__empty-card">
            <el-empty description="Aucun séjour actif" :image-size="48" />
          </div>
          <el-descriptions v-else :column="1" border size="small">
            <el-descriptions-item label="N° Séjour">{{ activeStay.id }}</el-descriptions-item>
            <el-descriptions-item label="Date d'entrée">{{ formatDate(activeStay.admission_date) }}</el-descriptions-item>
            <el-descriptions-item label="Mode d'admission">
              <el-tag :type="admissionTag(activeStay.mode_admission)" size="small">
                {{ admissionLabel(activeStay.mode_admission) }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="Service / Unité">{{ activeStay.service_name || '—' }}</el-descriptions-item>
            <el-descriptions-item label="Chambre / Lit">
              {{ activeStay.chambre || '—' }}{{ activeStay.lit ? ` / Lit ${activeStay.lit}` : '' }}
            </el-descriptions-item>
            <el-descriptions-item label="Médecin référent">{{ activeStay.medecin_name || '—' }}</el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>

      <el-col :span="12">
        <el-card class="sejour-view__card">
          <template #header>
            <span><strong>Informations administratives</strong></span>
          </template>
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="NIP">{{ patientInfo?.nip || '—' }}</el-descriptions-item>
            <el-descriptions-item label="N° SS / INS">{{ patientInfo?.nir || '—' }}</el-descriptions-item>
            <el-descriptions-item label="Assurance / Mutuelle">{{ patientInfo?.assuranceMutuelle || '—' }}</el-descriptions-item>
            <el-descriptions-item label="Consentement études">
              <el-tag size="small">{{ patientInfo?.consentementEtude || 'Non précisé' }}</el-tag>
            </el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>
    </el-row>

    <!-- Section 2: Contacts du patient -->
    <el-card class="sejour-view__card sejour-view__card--section">
      <EncountersTable
        :encounters="encounters"
        @new-contact="openContactDialog"
      />
    </el-card>

    <!-- Section 3: Mouvements du séjour -->
    <el-card v-if="activeStay" class="sejour-view__card sejour-view__card--section">
      <StayTimeline :movements="stayMovements" :loading="loadingMovements" />
    </el-card>

    <!-- Dialog: Nouveau contact -->
    <ContactFormDialog
      v-model:visible="contactDialogVisible"
      :patient-id="patientId"
      :patient-name="patientName"
      :user-id="currentUserId"
      @saved="onContactSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { usePatientContext } from '@/composables/usePatientContext'
import { useAuth } from '@/composables/useAuth'
import { listEncountersByPatient } from '@/composables/useEncounters'
import type { EncounterDto } from '@/composables/useEncounters'
import { getActiveStay, getStayMovements } from '@/composables/useStays'
import type { StayDto, StayMovementDto } from '@/composables/useStays'
import EncountersTable from '@/components/patients/EncountersTable.vue'
import StayTimeline from '@/components/patients/StayTimeline.vue'
import ContactFormDialog from '@/components/patients/ContactFormDialog.vue'

const route = useRoute()
const { activePatient } = usePatientContext()
const { user } = useAuth()

const patientId = computed(() => Number(route.params.id) || activePatient.value?.id || 0)
const patientName = computed(() => {
  if (!activePatient.value) return ''
  const p = activePatient.value
  return `${p.prenom} ${p.nom}`
})
const patientInfo = computed(() => activePatient.value)
const currentUserId = computed(() => user.value?.id ?? null)

const loading = ref(true)
const encounters = ref<EncounterDto[]>([])
const activeStay = ref<StayDto | null>(null)
const stayMovements = ref<StayMovementDto[]>([])
const loadingMovements = ref(false)
const contactDialogVisible = ref(false)

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

function admissionTag(mode: string): 'danger' | 'success' | 'warning' {
  return mode === 'urgences' ? 'danger' : mode === 'transfert' ? 'warning' : 'success'
}

function stayStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    en_cours: 'En cours',
    cloture: 'Clôturé',
    transfere: 'Transféré',
  }
  return labels[status] || status
}

function stayStatusTag(status: string): 'success' | 'info' | 'warning' {
  return status === 'en_cours' ? 'success' : status === 'transfere' ? 'warning' : 'info'
}

function openContactDialog() {
  contactDialogVisible.value = true
}

async function onContactSaved() {
  await loadEncounters()
}

async function loadEncounters() {
  try {
    encounters.value = await listEncountersByPatient(patientId.value)
  } catch {
    encounters.value = []
  }
}

async function loadStayData() {
  try {
    activeStay.value = await getActiveStay(patientId.value)
    if (activeStay.value?.id) {
      loadingMovements.value = true
      try {
        stayMovements.value = await getStayMovements(activeStay.value.id)
      } catch {
        stayMovements.value = []
      } finally {
        loadingMovements.value = false
      }
    }
  } catch {
    activeStay.value = null
    stayMovements.value = []
  }
}

onMounted(async () => {
  loading.value = true
  await Promise.all([loadEncounters(), loadStayData()])
  loading.value = false
})
</script>

<style scoped>
.sejour-view {
  width: 100%;
}

.sejour-view__card {
  height: 100%;
}

.sejour-view__card--section {
  margin-top: 16px;
}

.sejour-view__card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.sejour-view__empty-card {
  display: flex;
  justify-content: center;
  padding: 8px 0;
}
</style>
