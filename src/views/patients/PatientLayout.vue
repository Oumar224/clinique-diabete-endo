<template>
  <div class="patient-layout" v-loading="loading">
    <div v-if="patientNotFound" class="patient-layout__not-found">
      <el-empty description="Patient introuvable" />
    </div>

    <template v-else-if="activePatient">
      <header class="patient-layout__section-header">
        <el-icon :size="24" v-if="currentSection.icon">
          <component :is="currentSection.icon" />
        </el-icon>
        <h1 class="patient-layout__section-title">{{ currentSection.label }}</h1>
      </header>

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
import type { Component } from 'vue'

interface SectionInfo {
  label: string
  icon: Component
}

const SECTION_INFO: Record<string, SectionInfo> = {
  'patient-dossier': { label: 'Dossier Patient', icon: FolderOpened },
  'patient-labo': { label: 'Résultats Bio', icon: DataAnalysis },
  'patient-prescription': { label: 'Prescription / Soins', icon: Tickets },
  'patient-examens': { label: 'Demande Examens', icon: Search },
  'patient-actes': { label: 'Actes / Soins', icon: List },
  'patient-soins': { label: 'Administration Soins', icon: Aim },
  'patient-sejour': { label: 'Patient & Séjour', icon: HomeFilled },
  'patient-rdv': { label: 'Rendez-vous', icon: Calendar },
  'patient-factures': { label: 'Factures', icon: Money },
}

const route = useRoute()
const { activePatient, setActivePatient } = usePatientContext()

const loading = ref(false)
const patientNotFound = ref(false)

const currentSection = computed<SectionInfo>(() => {
  const name = typeof route.name === 'string' ? route.name : ''
  return SECTION_INFO[name] ?? { label: '', icon: FolderOpened }
})

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
}

.patient-layout__not-found {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 60vh;
}

.patient-layout__section-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 20px;
  color: var(--cd-gray-900);
}

.patient-layout__section-title {
  font-size: 22px;
  font-weight: 700;
  margin: 0;
  line-height: 1.3;
  color: var(--cd-gray-900);
}

.patient-layout__content {
  flex: 1;
  min-height: 0;
  overflow: auto;
}
</style>
