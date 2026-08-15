<template>
  <div class="dossier-documents">
    <!-- Contact selector -->
    <div class="dossier-documents__selector">
      <div class="dossier-documents__selector-label">
        Contact
      </div>
      <el-select
        v-model="selectedContactId"
        placeholder="Sélectionner un contact"
        clearable
        filterable
        style="width: 320px"
        @change="handleContactChange"
      >
        <el-option
          v-for="enc in encounters"
          :key="enc.id"
          :label="contactOptionLabel(enc)"
          :value="enc.id!.toString()"
        />
      </el-select>

      <!-- Toggle: catalog vs documents view -->
      <el-button
        v-if="selectedContactId && !showCatalog"
        text
        size="small"
        @click="showCatalog = true"
      >
        <template #icon>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1.5" y="1.5" width="11" height="11" rx="1" stroke="currentColor" stroke-width="0.8" fill="currentColor" fill-opacity="0.1"/>
            <path d="M4 4.5H10" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
            <path d="M4 7H10" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
            <path d="M4 9.5H7.5" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
          </svg>
        </template>
        Catalogue
      </el-button>
    </div>

    <!-- No contact selected: prompt -->
    <el-empty
      v-if="!selectedContactId"
      description="Sélectionnez un contact pour créer ou consulter des documents"
      :image-size="100"
      class="dossier-documents__empty"
    />

    <!-- Catalog/accordion view (ContactFormSelector) -->
    <ContactFormSelector
      v-else-if="showCatalog"
      :key="'catalog-' + selectedContactId"
      :contact-id="selectedContactId"
      @document-created="handleDocumentCreated"
    />

    <!-- Documents list + form view -->
    <PatientClinicalDocs
      v-else
      :key="'docs-' + selectedContactId + '-' + activeDocumentId"
      :contact-id="selectedContactId"
      :service-id="selectedServiceId"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { usePatientContext } from '@/composables/usePatientContext'
import { useEncounters, type EncounterDto } from '@/composables/useEncounters'
import { ElMessage } from 'element-plus'
import ContactFormSelector from '@/components/patients/ContactFormSelector.vue'
import PatientClinicalDocs from '@/components/patients/PatientClinicalDocs.vue'

const { activePatient } = usePatientContext()
const { listEncountersByPatient } = useEncounters()

const encounters = ref<EncounterDto[]>([])
const selectedContactId = ref<string>('')
const selectedServiceId = ref<string>('')
const loadingEncounters = ref(false)
const showCatalog = ref(true)
const activeDocumentId = ref<string>('')

const currentPatientId = computed(() => activePatient.value?.id)

onMounted(async () => {
  if (currentPatientId.value) {
    await loadEncounters()
  }
})

async function loadEncounters() {
  if (!currentPatientId.value) return
  loadingEncounters.value = true
  try {
    encounters.value = await listEncountersByPatient(currentPatientId.value)
  } catch {
    ElMessage.error('Erreur lors du chargement des contacts')
    encounters.value = []
  } finally {
    loadingEncounters.value = false
  }
}

function handleContactChange(val: string | undefined) {
  if (!val) {
    selectedContactId.value = ''
    selectedServiceId.value = ''
    return
  }
  const enc = encounters.value.find(e => e.id?.toString() === val)
  selectedServiceId.value = enc?.service_id?.toString() ?? ''
  showCatalog.value = true
  activeDocumentId.value = ''
}

function handleDocumentCreated(documentId: string) {
  activeDocumentId.value = documentId
  showCatalog.value = false
}

function contactOptionLabel(enc: EncounterDto): string {
  const dateStr = enc.start_date
    ? new Date(enc.start_date).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : 'Date inconnue'

  const typeLabels: Record<string, string> = {
    consultation: 'Consultation',
    urgence: 'Urgence',
    soin_externe: 'Soin externe',
    autre: 'Autre',
  }

  const typeLabel = typeLabels[enc.contact_type] || enc.contact_type
  return `${dateStr} — ${typeLabel}${enc.service_name ? ` (${enc.service_name})` : ''}`
}
</script>

<style scoped lang="scss">
.dossier-documents {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.dossier-documents__selector {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 0;
  border-bottom: 1px solid var(--el-border-color-light);
  margin-bottom: 8px;
  flex-shrink: 0;
}

.dossier-documents__selector-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  white-space: nowrap;
}

.dossier-documents__empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
