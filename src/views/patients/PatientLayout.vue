<template>
  <div class="patient-layout" v-loading="loading">
    <div v-if="patientNotFound" class="patient-layout__not-found">
      <el-empty description="Patient introuvable" />
    </div>

    <template v-else-if="activePatient">
      <PatientBanner :patient="activePatient" :age="age" @edit="openEditPatient" />

      <header class="cde-section-head patient-layout__section-bar">
        <div class="patient-layout__band-row">
          <div class="patient-layout__band-heading">
            <h1 class="patient-layout__section-title">
              {{ currentSection.label }}
            </h1>
            <div id="patient-page-subtitle" ref="subtitleTarget" class="patient-layout__band-sub" />
          </div>

          <div class="patient-layout__band-aside">
            <div id="patient-page-actions" ref="actionsTarget" class="patient-layout__band-actions" />
            <PatientContextToolbar
              v-if="routeName === 'patient-dossier'"
              :patient-id="activePatient.id"
              show-pdf
            />
          </div>
        </div>

        <nav
          v-if="sectionTabs.length > 0"
          class="patient-layout__tabs"
          role="tablist"
          aria-label="Sections du patient"
        >
          <button
            v-for="tab in sectionTabs"
            :key="tab.name"
            type="button"
            role="tab"
            class="patient-layout__tab"
            :class="{ 'patient-layout__tab--active': activeSectionTab === tab.name }"
            :aria-selected="activeSectionTab === tab.name"
            @click="selectSectionTab(tab.name)"
          >
            {{ tab.label }}
          </button>
        </nav>
      </header>

      <div class="patient-layout__content">
        <router-view />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, provide, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  FolderOpened, DataAnalysis, Tickets, Search, Aim, HomeFilled, Calendar, Money,
} from '@element-plus/icons-vue'
import { usePatientContext } from '@/composables/usePatientContext'
import { useOpenPatients } from '@/composables/useOpenPatients'
import { usePatients } from '@/composables/usePatients'
import PatientBanner from '@/components/patients/PatientBanner.vue'
import PatientContextToolbar from '@/components/patients/PatientContextToolbar.vue'
import {
  PATIENT_ACTIVE_SECTION_TAB,
  PATIENT_PAGE_CHROME,
  PATIENT_SECTION_TABS,
} from './patientSections'
import type { Component } from 'vue'
const { getPatient } = usePatients()

interface SectionInfo {
  label: string
  icon: Component
}

const SECTION_INFO: Record<string, SectionInfo> = {
  'patient-dossier': { label: 'Fiche Patient', icon: FolderOpened },
  'patient-dossier-clinic': { label: 'Dossier Clinic', icon: FolderOpened },
  'patient-labo': { label: 'Résultats Bio', icon: DataAnalysis },
  'patient-prescription': { label: 'Prescriptions, Soins & Médicaments', icon: Tickets },
  'patient-ordonnances': { label: 'Ordonnances', icon: Tickets },
  'patient-examens': { label: 'Demande Examens', icon: Search },
  'patient-soins': { label: 'Administration Soins & Médicaments', icon: Aim },
  'patient-contact': { label: 'Contacts du patient', icon: HomeFilled },
  'patient-sejour': { label: 'Patient & Séjour', icon: HomeFilled },
  'patient-rdv': { label: 'Rendez-vous', icon: Calendar },
  'patient-factures': { label: 'Factures', icon: Money },
}

const route = useRoute()
const { activePatient, age, setActivePatient, clearPatient } = usePatientContext()
const { removePatient } = useOpenPatients()

const loading = ref(false)
const patientNotFound = ref(false)

const routeName = computed(() => typeof route.name === 'string' ? route.name : '')

/**
 * The page title is owned by the layout, never by the routed view: one H1 per
 * patient screen, always rendered inside the tinted band. The route supplies
 * the label; `meta.title` is only a fallback for routes not yet listed here.
 */
const currentSection = computed<SectionInfo>(() => {
  const section = SECTION_INFO[routeName.value]
  if (section) return section
  const fallback = typeof route.meta.title === 'string' ? route.meta.title : 'Patient'
  return { label: fallback, icon: FolderOpened }
})

const sectionTabs = computed(() => PATIENT_SECTION_TABS[routeName.value] ?? [])
const activeSectionTab = ref(sectionTabs.value[0]?.name ?? '')

const subtitleTarget = ref<HTMLElement | null>(null)
const actionsTarget = ref<HTMLElement | null>(null)

provide(PATIENT_ACTIVE_SECTION_TAB, activeSectionTab)
provide(PATIENT_PAGE_CHROME, { subtitleTarget, actionsTarget })

watch(routeName, () => {
  const tabs = sectionTabs.value
  if (!tabs.some(tab => tab.name === activeSectionTab.value)) {
    activeSectionTab.value = tabs[0]?.name ?? ''
  }
})

function selectSectionTab(name: string) {
  activeSectionTab.value = name
}

function openEditPatient() {
  ElMessage.info('Modification du patient - fonction a implementer')
}

onMounted(async () => {
  const id = Number(route.params.id)
  if (!id) {
    patientNotFound.value = true
    return
  }
  // Always re-verify the patient exists in the DB.
  // The activePatient context may be stale (e.g. set from sidebar open-patients
  // stored in localStorage, or from a previous list fetch), and we must not
  // carry a deleted patient into child form submissions.
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
      clearPatient()
      removePatient(id)
      ElMessage.warning(`Le patient (ID ${id}) n'existe plus dans la base de données`)
    }
  } catch (e) {
    ElMessage.error(`Erreur lors du chargement du patient: ${(e as Error).message}`)
    patientNotFound.value = true
  } finally {
    loading.value = false
  }
}

defineExpose({ loadPatient, patientNotFound })
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

/* The section bar is the page header card: it always carries the page title
   and, when the screen has tabs, the tab strip directly beneath it. */
.patient-layout__section-bar {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0;
  padding: 0;
  overflow: hidden;
}

.patient-layout__band-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  min-height: 56px;
  padding: 10px 16px 10px 19px; /* 16px + the 3px inset accent */
}

.patient-layout__band-heading {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1 1 auto;
  min-width: 0;
}

.patient-layout__section-title {
  margin: 0;
  font-size: 26px;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.01em;
  color: var(--cde-text, #12211F);
}

.patient-layout__band-sub:empty {
  display: none;
}

.patient-layout__band-sub :deep(.cde-page-sub) {
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
  color: var(--cde-muted);
}

.patient-layout__band-aside {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 0 0 auto;
  max-width: 100%;
}

.patient-layout__band-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}

/* Tab strip: same clinical accent bar as `.cde-tabs`, but rendered by the
   page band so the title and the tabs share one bordered card. */
.patient-layout__tabs {
  display: flex;
  align-items: stretch;
  height: 40px;
  box-sizing: border-box;
  overflow-x: auto;
  background: var(--cde-accent-strong);
  border-top: 1px solid var(--cde-border);
}

.patient-layout__tab {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 0 16px;
  border: 0;
  border-top: 2px solid transparent;
  border-radius: 0;
  background: transparent;
  color: rgba(255, 255, 255, 0.82);
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
}

.patient-layout__tab:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}

.patient-layout__tab--active {
  background: var(--cde-surface);
  border-top-color: var(--cde-accent);
  color: var(--cde-accent-strong);
}

.patient-layout__tab:focus-visible {
  outline: 2px solid var(--cde-accent);
  outline-offset: -2px;
}

.patient-layout__content {
  flex: 1;
  min-height: 0;
  overflow: auto;
}
</style>
