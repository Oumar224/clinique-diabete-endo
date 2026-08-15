<template>
  <div class="dossier-clinic-view">
    <!-- Contact bar or no-contact warning (toujours visible) -->
    <div v-if="activeContact" class="dossier-clinic-view__contact-bar">
      <div class="dossier-clinic-view__contact-info">
        <el-icon color="var(--el-color-info)"><User /></el-icon>
        <span class="dossier-clinic-view__contact-label">Contact actif</span>
        <span class="dossier-clinic-view__contact-sep">|</span>
        <span class="dossier-clinic-view__contact-type">{{ contactTypeLabel }}</span>
        <span class="dossier-clinic-view__contact-sep">|</span>
        <span class="dossier-clinic-view__contact-date">{{ formatDate(activeContact.start_date) }}</span>
        <span v-if="activeContact.service_name" class="dossier-clinic-view__contact-sep">|</span>
        <span v-if="activeContact.service_name" class="dossier-clinic-view__contact-service">{{ activeContact.service_name }}</span>
        <span v-if="activeContact.medecin_name" class="dossier-clinic-view__contact-sep">|</span>
        <span v-if="activeContact.medecin_name" class="dossier-clinic-view__contact-medecin">{{ activeContact.medecin_name }}</span>
      </div>
      <el-tag size="small" type="info" effect="plain">#{{ activeContact.id }}</el-tag>
    </div>

    <!-- Action bar (toujours visible) -->
    <div class="dossier-clinic-view__actions">
      <el-button
        type="primary"
        size="small"
        :icon="Plus"
        @click="showTypeDialog = true"
      >
        Nouveau Document
      </el-button>
      <el-button
        size="small"
        :icon="Upload"
        :disabled="!activeContact"
        @click="showImportDialog = true"
      >
        Importer Document
      </el-button>
    </div>

    <!-- Filter bar -->
    <div class="dossier-clinic-view__filters">
      <el-segmented v-model="filterSource" :options="sourceFilterOptions" size="small" />
      <el-select v-model="filterTypeId" placeholder="Tous les types" clearable size="small" style="width: 200px">
        <el-option
          v-for="dt in documentTypes"
          :key="dt.id"
          :label="dt.label"
          :value="dt.id"
        />
      </el-select>
      <el-date-picker
        v-model="filterDateRange"
        type="daterange"
        range-separator="à"
        start-label="Du"
        end-label="Au"
        value-format="YYYY-MM-DD"
        size="small"
        style="width: 260px"
      />
    </div>

    <!-- Documents table (toujours visible, même vide) -->
    <el-table
      :data="filteredDocuments"
      style="width:100%;margin-top:12px"
      size="small"
      highlight-current-row
      v-loading="loading"
      element-loading-text="Chargement des documents..."
      @row-click="onRowClick"
    >
      <el-table-column label="Créé le" width="110">
        <template #default="{ row }">
          {{ formatDate(row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column label="Document" min-width="200">
        <template #default="{ row }">
          <div class="dossier-clinic__doc-cell">
            <span class="dossier-clinic__doc-title">{{ row.documentType?.label || row.title || 'Document' }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="Source" width="90">
        <template #default="{ row }">
          <el-tag v-if="row.source === 'imported'" size="small" type="warning">
            Importé
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="Statut" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="row.status === 'signed' ? 'success' : 'warning'" size="small" effect="plain">
            {{ row.status === 'signed' ? 'Signé' : 'Brouillon' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="Actions" width="160" align="center">
        <template #default="{ row }">
          <el-tooltip v-if="row.pdfPath" content="Ouvrir le PDF" placement="top" :show-after="400">
            <el-button size="small" text type="primary" @click.stop="handleOpenPdf(row)">
              <el-icon><View /></el-icon>
            </el-button>
          </el-tooltip>
          <template v-if="row.source !== 'imported'">
            <el-tooltip v-if="row.status !== 'signed'" content="Signer" placement="top" :show-after="400">
              <el-button size="small" text type="success" @click.stop="handleSignRow(row)">
                <el-icon><DocumentChecked /></el-icon>
              </el-button>
            </el-tooltip>
            <el-tooltip v-if="row.status !== 'signed'" content="Verrouiller" placement="top" :show-after="400">
              <el-button size="small" text type="warning" @click.stop="handleSignRow(row)">
                <el-icon><Lock /></el-icon>
              </el-button>
            </el-tooltip>
          </template>
          <el-tooltip content="Supprimer" placement="top" :show-after="400">
            <el-button
              size="small"
              text
              type="danger"
              :disabled="row.status === 'signed'"
              @click.stop="onDelete(row)"
            >
              <el-icon><Delete /></el-icon>
            </el-button>
          </el-tooltip>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty description="Aucun document clinique pour ce contact" :image-size="80" />
      </template>
    </el-table>

    <!-- Popup de sélection du type de document -->
    <el-dialog
      v-model="showTypeDialog"
      title="Nouveau Document"
      width="420px"
      :close-on-click-modal="false"
    >
      <template v-if="!activeContact">
        <el-alert type="warning" :closable="false" show-icon>
          Aucun contact actif. Créez ou réouvrez un contact pour ce patient.
        </el-alert>
      </template>
      <el-form v-else label-position="top">
        <el-form-item label="Type de document">
          <el-select v-model="selectedTypeId" placeholder="Sélectionner un type" style="width:100%">
            <el-option
              v-for="t in filteredByContactTypes"
              :key="t.id"
              :label="t.label"
              :value="t.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showTypeDialog = false">Annuler</el-button>
        <el-button
          type="primary"
          :disabled="!selectedTypeId || !activeContact"
          :loading="creatingDoc"
          @click="handleConfirmType"
        >
          Créer
        </el-button>
      </template>
    </el-dialog>

    <!-- Import Document Dialog -->
    <ImportDocumentDialog
      :visible="showImportDialog"
      :document-types="filteredByContactTypes"
      @update:visible="showImportDialog = $event"
      @import="handleImport"
    />

    <!-- Loading overlay for initial load -->
    <div v-if="pageLoading" class="dossier-clinic-view__page-loading">
      <el-skeleton :rows="6" animated />
    </div>

    <!-- FULL PAGE FORM -->
    <template v-if="fullPageMode && selectedDocument">
      <div class="dossier-clinic__full-page">
        <div class="dossier-clinic__full-page-header">
          <div class="dossier-clinic__full-page-header-left">
            <el-button text size="default" @click="handleBackToList">
              <template #icon>
                <ArrowLeft />
              </template>
              Retour à la liste
            </el-button>
          </div>
          <div class="dossier-clinic__full-page-header-right">
            <span class="dossier-clinic__full-page-doc-title">
              {{ selectedDocument.documentType?.label || 'Document' }}
            </span>
            <el-tag
              :type="selectedDocument.status === 'signed' ? 'success' : 'warning'"
              size="small"
              effect="light"
            >
              {{ selectedDocument.status === 'signed' ? 'Signé' : 'Brouillon' }}
            </el-tag>
          </div>
        </div>
        <div class="dossier-clinic__full-page-body">
          <ClinicalDocForm
            v-if="selectedDocType"
            :document="selectedDocument"
            :document-type="selectedDocType"
            :readonly="isReadonly"
            :contact-display="contactDisplayLabel"
            @save="handleSave"
            @sign="handleSign"
            @close="handleBackToList"
          />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Delete, User, Upload, View, ArrowLeft, DocumentChecked, Lock } from '@element-plus/icons-vue'
import { usePatientContext } from '@/composables/usePatientContext'
import { useClinicalDocuments } from '@/composables/useClinicalDocuments'
import { useAuth } from '@/composables/useAuth'
import { useEncounters, type EncounterDto } from '@/composables/useEncounters'
import ClinicalDocForm from '@/components/patients/ClinicalDocForm.vue'
import ImportDocumentDialog from '@/components/patients/ImportDocumentDialog.vue'

const { activePatient } = usePatientContext()
const { listEncountersByPatient } = useEncounters()
const {
  documentTypes,
  documents,
  selectedDocument,
  loading,
  fetchDocumentTypes,
  fetchDocumentsByPatient,
  createDocument,
  importFile,
  openPdf,
  updateDocumentData,
  signDocument,
  deleteDocument,
  getDocumentType,
  selectDocument,
} = useClinicalDocuments()
const { user } = useAuth()

const pageLoading = ref(true)
const activeContact = ref<EncounterDto | null>(null)
const creatingDoc = ref(false)
const fullPageMode = ref(false)
const showTypeDialog = ref(false)
const showImportDialog = ref(false)
const selectedTypeId = ref('')

// ─── Filters ──────────────────────────────────────────────────────────────────
const filterSource = ref<'all' | 'created' | 'imported'>('all')
const filterTypeId = ref<string | null>(null)
const filterDateRange = ref<[string, string] | null>(null)

const sourceFilterOptions = [
  { label: 'Tous', value: 'all' },
  { label: 'Créés', value: 'created' },
  { label: 'Importés', value: 'imported' },
]

const filteredDocuments = computed(() => {
  let result = documents.value

  // Source filter
  if (filterSource.value !== 'all') {
    const source = filterSource.value === 'created' ? 'created' : 'imported'
    result = result.filter(doc => doc.source === source)
  }

  // Document type filter
  if (filterTypeId.value) {
    result = result.filter(doc => doc.documentTypeId === filterTypeId.value)
  }

  // Date range filter
  if (filterDateRange.value && filterDateRange.value[0] && filterDateRange.value[1]) {
    const [startStr, endStr] = filterDateRange.value
    const start = new Date(startStr)
    const end = new Date(endStr)
    // Set end to end of day
    end.setHours(23, 59, 59, 999)
    result = result.filter(doc => {
      if (!doc.createdAt) return false
      const created = new Date(doc.createdAt)
      return created >= start && created <= end
    })
  }

  return result
})

const filteredByContactTypes = computed(() => {
  const ct = activeContact.value?.contact_type
  if (!ct) return documentTypes.value
  return documentTypes.value.filter(dt => {
    const supported = dt.contactTypes
    if (!supported || supported.length === 0) return true
    return supported.includes(ct)
  })
})

const contactTypeLabel = computed(() => {
  if (!activeContact.value) return ''
  const map: Record<string, string> = {
    consultation: 'Consultation',
    hospitalisation: 'Hospitalisation',
    urgence: 'Urgence',
    soin_externe: 'Soin Externe',
    autre: 'Autre',
  }
  return map[activeContact.value.contact_type] || activeContact.value.contact_type
})

const contactDisplayLabel = computed(() => {
  if (!activeContact.value) return ''
  const dateStr = activeContact.value.start_date
    ? new Date(activeContact.value.start_date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : 'Date inconnue'
  return `${contactTypeLabel.value} - ${dateStr} — ${activeContact.value.service_name || ''} ${activeContact.value.medecin_name ? `/ ${activeContact.value.medecin_name}` : ''} #${activeContact.value.id}`
})

const isReadonly = computed(() => {
  if (!selectedDocument.value) return true
  return selectedDocument.value.status === 'signed'
})

const selectedDocType = computed(() => {
  if (!selectedDocument.value) return null
  return getDocumentType(selectedDocument.value.documentTypeId) ?? null
})

function formatDate(dateStr: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

async function loadData() {
  if (!activePatient.value?.id) return
  pageLoading.value = true
  try {
    await fetchDocumentTypes()
    const encounters = await listEncountersByPatient(activePatient.value.id, 'active')
    activeContact.value = encounters[0] ?? null
    await fetchDocumentsByPatient(activePatient.value.id)
  } finally {
    pageLoading.value = false
  }
}

onMounted(loadData)

async function handleConfirmType() {
  if (!selectedTypeId.value || !activePatient.value?.id) return
  if (!activeContact.value) {
    ElMessage.warning('Aucun contact actif. Créez ou réouvrez un contact pour ce patient.')
    return
  }
  showTypeDialog.value = false

  creatingDoc.value = true
  try {
    const serviceId = activeContact.value.service_id?.toString() ?? ''
    const createdBy = user.value?.id?.toString() ?? ''
    const doc = await createDocument(selectedTypeId.value, activeContact.value.id!.toString(), serviceId, createdBy)
    if (doc) {
      selectDocument(doc)
      fullPageMode.value = true
      ElMessage.success('Document créé')
    } else {
      ElMessage.error('Échec de la création du document')
    }
    selectedTypeId.value = ''
  } finally {
    creatingDoc.value = false
  }
}

async function handleImport(data: { file: File; documentTypeId: string; title: string }) {
  if (!activePatient.value?.id) return
  if (!activeContact.value) {
    ElMessage.warning('Aucun contact actif. Créez ou réouvrez un contact pour ce patient.')
    return
  }
  const createdBy = user.value?.id?.toString() ?? ''
  const doc = await importFile({
    contactId: activeContact.value.id!.toString(),
    createdBy,
    file: data.file,
    documentTypeId: data.documentTypeId,
    title: data.title,
  })
  if (doc) {
    await fetchDocumentsByPatient(activePatient.value.id)
  }
}

async function handleOpenPdf(row: any) {
  if (row.pdfPath) {
    await openPdf(row.pdfPath)
  }
}

function onRowClick(row: any) {
  selectDocument(row)
  fullPageMode.value = true
}

async function handleSave(formData: Record<string, any>) {
  if (!selectedDocument.value) return
  const success = await updateDocumentData(selectedDocument.value.id, formData)
  if (success) {
    ElMessage.success('Brouillon enregistré')
  }
}

async function handleSign() {
  if (!selectedDocument.value) return
  const userId = user.value?.id?.toString() ?? ''
  const success = await signDocument(selectedDocument.value.id, userId)
  if (success) {
    fullPageMode.value = false
    selectDocument(null)
    await fetchDocumentsByPatient(activePatient.value!.id)
  }
}

async function handleSignRow(row: any) {
  if (!row || row.source === 'imported' || row.status === 'signed') return
  try {
    await ElMessageBox.confirm(
      `Signer et verrouiller "${row.documentType?.label || row.title}" ?`,
      'Signature',
      { type: 'warning', confirmButtonText: 'Signer', cancelButtonText: 'Annuler' },
    )
  } catch {
    return
  }
  const userId = user.value?.id?.toString() ?? ''
  const success = await signDocument(row.id, userId)
  if (success) {
    await fetchDocumentsByPatient(activePatient.value!.id)
  }
}

async function onDelete(row: any) {
  try {
    await ElMessageBox.confirm(
      `Supprimer le document "${row.documentType?.label || row.title}" ?`,
      'Confirmation',
      { type: 'warning', confirmButtonText: 'Supprimer', cancelButtonText: 'Annuler' },
    )
  } catch {
    return
  }
  const ok = await deleteDocument(row.id)
  if (ok) {
    if (selectedDocument.value?.id === row.id) {
      selectDocument(null)
      fullPageMode.value = false
    }
  }
}

function handleBackToList() {
  fullPageMode.value = false
  selectDocument(null)
}
</script>

<style scoped>
.dossier-clinic-view {
  padding: 8px 0;
}

.dossier-clinic-view__alert {
  margin-bottom: 16px;
}

.dossier-clinic-view__empty {
  margin-top: 24px;
}

.dossier-clinic-view__loading {
  padding: 24px 0;
  text-align: center;
  color: var(--cd-gray-500);
}

.dossier-clinic-view__page-loading {
  padding: 24px;
}

.dossier-clinic-view__contact-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--el-color-info-light-9);
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  margin-bottom: 12px;
}

.dossier-clinic-view__contact-info {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.dossier-clinic-view__contact-label {
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.dossier-clinic-view__contact-sep {
  color: var(--el-border-color);
}

.dossier-clinic-view__contact-type,
.dossier-clinic-view__contact-date,
.dossier-clinic-view__contact-service,
.dossier-clinic-view__contact-medecin {
  color: var(--el-text-color-regular);
  font-weight: 500;
}

.dossier-clinic-view__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dossier-clinic-view__filters {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
  margin-bottom: 4px;
  flex-wrap: wrap;
}

.dossier-clinic__doc-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.dossier-clinic__doc-title {
  font-weight: 600;
  font-size: 13px;
}

/* Full page form */
.dossier-clinic__full-page {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: var(--el-bg-color, #fff);
  display: flex;
  flex-direction: column;
}

.dossier-clinic__full-page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid var(--el-border-color-light);
  background: var(--cd-white, #fff);
  flex-shrink: 0;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.dossier-clinic__full-page-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dossier-clinic__full-page-header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.dossier-clinic__full-page-doc-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.dossier-clinic__full-page-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

</style>
