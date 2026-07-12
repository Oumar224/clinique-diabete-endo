<template>
  <div class="patient-layout" v-loading="loading">
    <div v-if="patientNotFound" class="patient-layout__not-found">
      <el-empty description="Patient introuvable" />
    </div>

    <template v-else-if="activePatient">
      <PatientBanner :patient="activePatient" :age="age" @edit="openEditPatient" />

      <PatientContextToolbar :patient-id="activePatient.id" :show-pdf="routeName === 'patient-dossier'">
        <SectionHeader :label="currentSection.label" :icon="currentSection.icon" level="primary" />
      </PatientContextToolbar>

      <div class="patient-layout__content">
        <router-view />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  FolderOpened, DataAnalysis, Tickets, Search, List, Aim, HomeFilled, Calendar, Money,
} from '@element-plus/icons-vue'
import { usePatientContext } from '@/composables/usePatientContext'
import { getPatient } from '@/composables/usePatients'
import SectionHeader from '@/components/common/SectionHeader.vue'
import PatientBanner from '@/components/patients/PatientBanner.vue'
import PatientContextToolbar from '@/components/patients/PatientContextToolbar.vue'
import type { Component } from 'vue'

interface SectionInfo {
  label: string
  icon: Component
}

const SECTION_INFO: Record<string, SectionInfo> = {
  'patient-dossier': { label: 'Fiche Patient', icon: FolderOpened },
  'patient-dossier-clinic': { label: 'Dossier Clinic', icon: FolderOpened },
  'patient-labo': { label: 'Résultats Bio', icon: DataAnalysis },
  'patient-prescription': { label: 'Prescriptions, Soins & Médicaments', icon: Tickets },
  'patient-examens': { label: 'Demande Examens', icon: Search },
  'patient-actes': { label: 'Actes, Soins & Médicaments', icon: List },
  'patient-soins': { label: 'Administration Soins & Médicaments', icon: Aim },
  'patient-contact': { label: 'Contacts', icon: HomeFilled },
  'patient-sejour': { label: 'Patient & Séjour', icon: HomeFilled },
  'patient-rdv': { label: 'Rendez-vous', icon: Calendar },
  'patient-factures': { label: 'Factures', icon: Money },
}

const route = useRoute()
const { activePatient, age, setActivePatient } = usePatientContext()

const loading = ref(false)
const patientNotFound = ref(false)

const routeName = computed(() => typeof route.name === 'string' ? route.name : '')

const currentSection = computed<SectionInfo>(() => {
  return SECTION_INFO[routeName.value] ?? { label: '', icon: FolderOpened }
})

function openEditPatient() {
  ElMessage.info('Modification du patient - fonction a implementer')
}

onMounted(async () => {
  const id = Number(route.params.id)
  if (!id) {
    patientNotFound.value = true
    return
  }
  if (activePatient.value?.id === id) return
  await loadPatient(id)
})

watch(() => route.params.id, async (newId) => {
  if (!newId) return
  const id = Number(newId)
  if (activePatient.value?.id !== id) {
    await loadPatient(id)
  }
})

async function loadPatient(id: number) {
  loading.value = true
  patientNotFound.value = false
  try {
    const p = await getPatient(id)
    if (p) {
      setActivePatient(p)
    } else {
      patientNotFound.value = true
    }
  } catch (e) {
    ElMessage.error(`Erreur lors du chargement du patient: ${(e as Error).message}`)
    patientNotFound.value = true
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.patient-layout {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.patient-layout__not-found {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 60vh;
}

.patient-layout__content {
  flex: 1;
  min-height: 0;
  overflow: auto;
}
</style>
