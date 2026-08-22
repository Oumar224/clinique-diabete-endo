<template>
  <div class="patient-clinical-docs">
    <el-row :gutter="0" class="patient-clinical-docs__layout">
      <!-- Left column: Document list -->
      <el-col :span="8" class="patient-clinical-docs__list-col">
        <!-- Filter bar -->
        <div class="patient-clinical-docs__filters">
          <el-segmented
            v-model="filterSource"
            :options="sourceFilterOptions"
            size="small"
          />
          <el-select
            v-model="filterTypeId"
            placeholder="Tous les types"
            clearable
            size="small"
            style="width: 180px"
          >
            <el-option
              v-for="dt in documentTypes"
              :key="dt.id"
              :label="dt.label"
              :value="dt.id"
            />
          </el-select>
          <el-select
            v-model="filterCategory"
            placeholder="Toutes catégories"
            clearable
            size="small"
            style="width: 160px"
          >
            <el-option label="Consultation" value="consultation" />
            <el-option label="Labo" value="lab" />
            <el-option label="Livraison" value="delivery" />
            <el-option label="Autre" value="other" />
          </el-select>
          <el-date-picker
            v-model="filterDateRange"
            type="daterange"
            range-separator="à"
            start-placeholder="Date début"
            end-placeholder="Date fin"
            value-format="YYYY-MM-DD"
            size="small"
            style="width: 260px"
          />
          <el-button
            size="small"
            :disabled="isContactExpired"
            @click="showImportDialog = true"
          >
            Importer
          </el-button>
        </div>

        <ClinicalDocList
          :documents="filteredDocuments"
          :document-types="documentTypes"
          :selected-id="selectedDocument?.id ?? null"
          :loading="loading"
          :disabled="isContactExpired"
          class="patient-clinical-docs__doclist"
          @select="handleSelect"
          @create="handleCreate"
          @delete-document="handleDelete"
        />
      </el-col>

      <!-- Right column: Document form -->
      <el-col :span="16" class="patient-clinical-docs__form-col">
        <ClinicalDocForm
          :document="selectedDocument"
          :document-type="selectedDocType"
          :readonly="isReadonly"
          @save="handleSave"
          @sign="handleSign"
          @close="handleCloseForm"
        />
      </el-col>
    </el-row>

    <!-- Import Document Dialog -->
    <ImportDocumentDialog
      :visible="showImportDialog"
      :document-types="documentTypes"
      :disabled="isContactExpired"
      @update:visible="showImportDialog = $event"
      @import="handleImport"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useClinicalDocuments } from '@/composables/useClinicalDocuments'
import { usePatientContext } from '@/composables/usePatientContext'
import { useAuth } from '@/composables/useAuth'
import ImportDocumentDialog from './ImportDocumentDialog.vue'

const props = defineProps<{
  contactId: string
  serviceId?: string
}>()

const {
  documentTypes,
  documents,
  selectedDocument,
  loading,
  isContactExpired,
  fetchDocumentTypes,
  fetchDocuments,
  createDocument,
  updateDocumentData,
  signDocument,
  deleteDocument,
  checkContactExpired,
  getDocumentType,
  selectDocument,
  importFile,
} = useClinicalDocuments()

const { activePatient } = usePatientContext()
const { user } = useAuth()

// Current patient ID derived from context
const currentPatientId = computed(() => activePatient.value?.id?.toString() ?? null)

// Computed: is the form readonly?
const isReadonly = computed(() => {
  if (!selectedDocument.value) return false
  if (isContactExpired.value) return true
  return false
})

// Computed: selected document's type
const selectedDocType = computed(() => {
  if (!selectedDocument.value) return null
  return getDocumentType(selectedDocument.value.documentTypeId) ?? null
})

// ─── Import dialog ─────────────────────────────────────────────────────────
const showImportDialog = ref(false)

async function handleImport(data: { file: File; documentTypeId: string; title: string; siteId?: number }) {
  if (!props.contactId) {
    ElMessage.warning('Aucun contact sélectionné')
    return
  }
  const createdBy = user.value?.id?.toString() ?? ''
  const result = await importFile({
    contactId: props.contactId,
    createdBy,
    file: data.file,
    documentTypeId: data.documentTypeId,
    title: data.title,
    siteId: data.siteId,
  })
  if (result) {
    showImportDialog.value = false
  }
}

// ─── Filters ───────────────────────────────────────────────────────────────
const filterSource = ref<'all' | 'created' | 'imported'>('all')
const filterTypeId = ref<string | null>(null)
const filterCategory = ref<string | null>(null)
const filterDateRange = ref<[string, string] | null>(null)

const sourceFilterOptions = [
  { label: 'Tous', value: 'all' },
  { label: 'Créés', value: 'created' },
  { label: 'Importés', value: 'imported' },
]

const filteredDocuments = computed(() => {
  let result = documents.value
  if (filterSource.value === 'created') {
    result = result.filter(d => d.source !== 'imported')
  } else if (filterSource.value === 'imported') {
    result = result.filter(d => d.source === 'imported')
  }
  if (filterTypeId.value) {
    result = result.filter(d => d.documentTypeId === filterTypeId.value)
  }
  if (filterCategory.value) {
    result = result.filter(d => d.documentType?.category === filterCategory.value)
  }
  if (filterDateRange.value) {
    const [start, end] = filterDateRange.value
    if (start && end) {
      const startDate = new Date(start)
      const endDate = new Date(end)
      endDate.setHours(23, 59, 59, 999)
      result = result.filter(d => {
        const docDate = new Date(d.createdAt)
        return docDate >= startDate && docDate <= endDate
      })
    }
  }
  return result
})

// Watch for contact ID changes
watch(
  () => props.contactId,
  async (newContactId, oldContactId) => {
    if (newContactId && newContactId !== oldContactId) {
      await reloadForContact(newContactId)
    }
  },
  { immediate: false },
)

onMounted(async () => {
  await fetchDocumentTypes()
  if (props.contactId) {
    await reloadForContact(props.contactId)
  }
})

async function reloadForContact(contactId: string) {
  await Promise.all([
    fetchDocuments(contactId),
    checkContactExpired(contactId),
  ])
}

// Handle document selection
function handleSelect(id: string) {
  const doc = documents.value.find(d => d.id === id)
  if (doc) {
    selectDocument(doc)
  }
}

// Handle document creation
async function handleCreate(typeId: string) {
  if (!props.contactId) {
    ElMessage.warning('Aucun contact sélectionné')
    return
  }
  if (!currentPatientId.value) {
    ElMessage.warning('Aucun patient sélectionné')
    return
  }

  const serviceId = props.serviceId ?? ''
  const createdBy = user.value?.id?.toString() ?? ''
  const created = await createDocument(typeId, props.contactId, serviceId, createdBy)
  if (created) {
    selectDocument(created)
    ElMessage.success('Document créé')
  }
}

// Handle save draft
async function handleSave(formData: Record<string, any>) {
  if (!selectedDocument.value) return
  const success = await updateDocumentData(selectedDocument.value.id, formData)
  if (success) {
    ElMessage.success('Brouillon enregistré')
  }
}

// Handle sign
async function handleSign() {
  if (!selectedDocument.value) return
  const userId = user.value?.id?.toString() ?? ''
  const success = await signDocument(selectedDocument.value.id, userId)
  if (success) {
    // Document status updated by composable
  }
}

// Handle delete
async function handleDelete(id: string) {
  await deleteDocument(id)
}

// Handle close form
function handleCloseForm() {
  selectDocument(null)
}
</script>

<style scoped lang="scss">
.patient-clinical-docs {
  height: 100%;
}

.patient-clinical-docs__layout {
  height: 100%;
}

.patient-clinical-docs__list-col {
  height: 100%;
  overflow-y: auto;
  padding: 12px 0 12px 12px;
  display: flex;
  flex-direction: column;
}

.patient-clinical-docs__filters {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.patient-clinical-docs__doclist {
  flex: 1;
  min-height: 0;
}

.patient-clinical-docs__form-col {
  height: 100%;
  overflow-y: auto;
  border-left: 1px solid var(--el-border-color-light);
}
</style>
