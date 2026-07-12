<template>
  <div class="patient-clinical-docs">
    <el-row :gutter="0" class="patient-clinical-docs__layout">
      <!-- Left column: Document list -->
      <el-col :span="8" class="patient-clinical-docs__list-col">
        <ClinicalDocList
          :documents="documents"
          :document-types="documentTypes"
          :selected-id="selectedDocument?.id ?? null"
          :loading="loading"
          :disabled="isContactExpired"
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
  </div>
</template>

<script setup lang="ts">
import { computed, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useClinicalDocuments } from '@/composables/useClinicalDocuments'
import { usePatientContext } from '@/composables/usePatientContext'
import { useAuth } from '@/composables/useAuth'

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
} = useClinicalDocuments()

const { activePatient } = usePatientContext()
const { user } = useAuth()

// Current patient ID derived from context
const currentPatientId = computed(() => activePatient.value?.id?.toString() ?? null)

// Computed: is the form readonly?
const isReadonly = computed(() => {
  if (!selectedDocument.value) return false
  if (selectedDocument.value.status === 'signed') return true
  if (isContactExpired.value) return true
  return false
})

// Computed: selected document's type
const selectedDocType = computed(() => {
  if (!selectedDocument.value) return null
  return getDocumentType(selectedDocument.value.documentTypeId) ?? null
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
}

.patient-clinical-docs__form-col {
  height: 100%;
  overflow-y: auto;
  border-left: 1px solid var(--el-border-color-light);
}
</style>
