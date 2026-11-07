<template>
  <div class="dossier-clinic-view cde">
    <!-- Patient identity is rendered once by PatientLayout (PatientBanner). -->

    <!-- Contact bar or no-contact warning (toujours visible) -->
    <div v-if="activeContact" class="dossier-clinic-view__contact-bar">
      <div class="dossier-clinic-view__contact-info">
        <el-icon color="var(--el-color-info)"><User /></el-icon>
        <span class="dossier-clinic-view__contact-label">Contact actif</span>
        <span class="dossier-clinic-view__contact-sep">|</span>
        <span class="dossier-clinic-view__contact-type">{{ contactTypeLabel }}</span>
        <span class="dossier-clinic-view__contact-sep">|</span>
        <span class="dossier-clinic-view__contact-date">{{ formatDateTime(activeContact.start_date) }}</span>
        <span v-if="activeContact.service_name" class="dossier-clinic-view__contact-sep">|</span>
        <span v-if="activeContact.service_name" class="dossier-clinic-view__contact-service">{{ activeContact.service_name }}</span>
        <span v-if="activeContact.medecin_name" class="dossier-clinic-view__contact-sep">|</span>
        <span v-if="activeContact.medecin_name" class="dossier-clinic-view__contact-medecin">{{ activeContact.medecin_name }}</span>
      </div>
      <span class="cde-badge cde-badge--muted">#{{ activeContact.id }}</span>
    </div>

    <!-- Toolbar : filtres + actions (toujours visible) -->
    <div class="cde-toolbar dossier-clinic-view__toolbar">
      <div class="cde-filters">
        <div class="cde-filter dossier-clinic-view__filter dossier-clinic-view__filter--source">
          <span class="cde-filter__label">Source</span>
          <el-segmented
            v-model="filterSource"
            class="dossier-clinic-view__source"
            :options="sourceFilterOptions"
            size="small"
            aria-label="Filtrer par source"
          />
        </div>
        <div class="cde-filter dossier-clinic-view__filter dossier-clinic-view__filter--type">
          <span class="cde-filter__label">Type de document</span>
          <el-select
            v-model="filterTypeId"
            class="cde-toolbar__select"
            placeholder="Tous les types"
            clearable
            aria-label="Filtrer par type de document"
          >
            <el-option
              v-for="dt in documentTypes"
              :key="dt.id"
              :label="dt.label"
              :value="dt.id"
            />
          </el-select>
        </div>
        <div class="cde-filter dossier-clinic-view__filter dossier-clinic-view__filter--period">
          <span class="cde-filter__label">Période</span>
          <el-date-picker
            v-model="filterDateRange"
            class="cde-toolbar__range"
            type="daterange"
            range-separator="à"
            start-placeholder="Du"
            end-placeholder="Au"
            value-format="YYYY-MM-DD"
            aria-label="Période des documents"
          />
        </div>
      </div>
      <div class="cde-toolbar__actions">
        <el-button
          type="primary"
          :icon="Plus"
          @click="showTypeDialog = true"
        >
          Nouveau Document
        </el-button>
        <el-button
          :icon="Upload"
          :disabled="!activeContact"
          @click="showImportDialog = true"
        >
          Importer Document
        </el-button>
      </div>
    </div>

    <!-- Documents table (toujours visible, même vide) -->
    <div class="cde-table-card dossier-clinic-view__table-card">
      <el-table
        :data="filteredDocuments"
        class="dossier-clinic-view__table"
        style="width:100%"
        size="small"
        highlight-current-row
        v-loading="loading"
        element-loading-text="Chargement des documents..."
        @row-click="onRowClick"
      >
        <el-table-column type="expand" width="32">
          <template #default="{ row }">
            <div class="dossier-clinic__expanded">
              <template v-if="row.pdfPath">
                <iframe
                  :src="'file://' + row.pdfPath"
                  class="dossier-clinic__pdf-viewer"
                />
                <div class="dossier-clinic__expanded-actions">
                  <el-button size="small" type="primary" @click.stop="openPreviewDialog(row)">
                    Ouvrir dans l'app
                  </el-button>
                  <el-button size="small" @click.stop="downloadDocFile('clinical-documents:export-pdf', row)">
                    Télécharger PDF
                  </el-button>
                  <el-button size="small" @click.stop="downloadDocFile('clinical-documents:export-doc', row)">
                    Télécharger DOC
                  </el-button>
                  <el-button size="small" text type="info" @click.stop="openPdf(row.pdfPath)">
                    Ouvrir dans la visionneuse système
                  </el-button>
                </div>
              </template>
              <div v-else class="cde-empty">
                Aucun PDF disponible pour ce document.
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="Créé le" width="140" show-overflow-tooltip>
          <template #default="{ row }">
            {{ formatDateTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="Créateur" width="130" show-overflow-tooltip>
          <template #default="{ row }">{{ creatorName(row) }}</template>
        </el-table-column>
        <el-table-column label="Document" min-width="260" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="dossier-clinic__doc-cell">
              <span class="dossier-clinic__doc-title">{{ row.documentType?.label || row.title || 'Document' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="Source" width="86">
          <template #default="{ row }">
            <span v-if="row.source === 'imported'" class="cde-badge cde-badge--warning">
              Importé
            </span>
            <span v-else class="cde-muted">Créé</span>
          </template>
        </el-table-column>
        <el-table-column label="Site" width="120" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.siteName || '—' }}
          </template>
        </el-table-column>
        <el-table-column label="Statut" width="96" align="center">
          <template #default="{ row }">
            <span
              class="cde-badge"
              :class="row.status === 'signed' ? 'cde-badge--success' : 'cde-badge--warning'"
            >
              {{ row.status === 'signed' ? 'Signé' : 'Brouillon' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="Actions" width="156" align="center">
          <template #default="{ row }">
            <el-tooltip v-if="row.pdfPath" content="Ouvrir le PDF" placement="top" :show-after="400">
              <el-button size="small" text type="primary" aria-label="Ouvrir le PDF" @click.stop="handleOpenPdf(row)">
                <el-icon><View /></el-icon>
              </el-button>
            </el-tooltip>
            <template v-if="row.source !== 'imported'">
              <el-tooltip v-if="row.status !== 'signed'" content="Signer" placement="top" :show-after="400">
                <el-button size="small" text type="success" aria-label="Signer le document" @click.stop="handleSignRow(row)">
                  <el-icon><DocumentChecked /></el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip v-if="row.status !== 'signed'" content="Verrouiller" placement="top" :show-after="400">
                <el-button size="small" text type="warning" aria-label="Verrouiller le document" @click.stop="handleSignRow(row)">
                  <el-icon><Lock /></el-icon>
                </el-button>
              </el-tooltip>
            </template>
            <el-tooltip content="Supprimer" placement="top" :show-after="400">
              <el-button
                size="small"
                text
                type="danger"
                aria-label="Supprimer le document"
                :disabled="row.status === 'signed'"
                @click.stop="onDelete(row)"
              >
                <el-icon><Delete /></el-icon>
              </el-button>
            </el-tooltip>
          </template>
        </el-table-column>
        <template #empty>
          <div class="dossier-clinic-view__empty">
            Aucun document clinique pour ce contact.
          </div>
        </template>
      </el-table>
    </div>

    <div class="cde-footer">
      <span class="cde-muted">{{ filteredDocuments.length }} document(s)</span>
    </div>

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

    <!-- In-app HTML preview dialog -->
    <HtmlPreviewDialog
      ref="previewDialogRef"
      :title="previewDocTitle"
      channel="clinical-documents:preview"
      download-channel="clinical-documents:export-pdf"
      doc-download-channel="clinical-documents:export-doc"
      :params="previewParams"
      @close="handlePreviewClose"
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
            <el-button text size="default" @click="handleBackToList">
              <template #icon>
                <Close />
              </template>
              Fermer
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
            :hide-header="true"
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
import { ref, computed, onMounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Delete, User, Upload, View, ArrowLeft, Close, DocumentChecked, Lock } from '@element-plus/icons-vue'
import { usePatientContext } from '@/composables/usePatientContext'
import { useClinicalDocuments, type ClinicalDocumentDTO } from '@/composables/useClinicalDocuments'
import { useAuth } from '@/composables/useAuth'
import { useEncounters, type EncounterDto } from '@/composables/useEncounters'
import { ipcInvoke } from '@/utils/ipc'
import { useUsers, getUserDisplayName } from '@/composables/useUsers'
import ClinicalDocForm from '@/components/patients/ClinicalDocForm.vue'
import ImportDocumentDialog from '@/components/patients/ImportDocumentDialog.vue'
import HtmlPreviewDialog from '@/components/common/HtmlPreviewDialog.vue'

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
const { users, loadUsers } = useUsers()
const previewDoc = ref<ClinicalDocumentDTO | null>(null)
const previewDialogRef = ref<InstanceType<typeof HtmlPreviewDialog> | null>(null)

const usersMap = computed(() => {
  const m = new Map<string, string>()
  for (const u of users.value) {
    if (u.id != null) m.set(String(u.id), getUserDisplayName(u))
  }
  return m
})

function creatorName(row: ClinicalDocumentDTO): string {
  if (!row.createdBy) return '—'
  return usersMap.value.get(String(row.createdBy)) ?? String(row.createdBy)
}

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

const previewDocTitle = computed(() => {
  if (!previewDoc.value) return 'Aperçu du document'
  return previewDoc.value.documentType?.label || previewDoc.value.title || 'Aperçu du document'
})

const previewParams = computed(() => {
  return previewDoc.value ? { docId: previewDoc.value.id } : {}
})

const selectedDocType = computed(() => {
  if (!selectedDocument.value) return null
  return getDocumentType(selectedDocument.value.documentTypeId) ?? null
})

function formatDateTime(dateStr: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }) + ' ' + d.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })
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

onMounted(async () => {
  try { await loadUsers() } catch { /* users non bloquant */ }
  await loadData()
})

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

async function handleImport(data: { file: File; documentTypeId: string; title: string; siteId?: number }) {
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
    siteId: data.siteId,
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

function onRowClick(row: any, column?: { type?: string }) {
  // Garde-fou conservé (WS4) : un clic sur la colonne "expand" ne doit
  // déclencher ni l'aperçu PDF in-app, ni le formulaire plein écran.
  if (column?.type === 'expand') return
  selectDocument(row)
  fullPageMode.value = true
}

function openPreviewDialog(row: any) {
  previewDoc.value = row
  nextTick(() => previewDialogRef.value?.open())
}

function handlePreviewClose() {
  previewDoc.value = null
}

async function downloadDocFile(channel: string, row: any) {
  try {
    const data = await ipcInvoke<string>(channel, { docId: row.id })
    ElMessage.success(`Fichier enregistré : ${data}`)
  } catch {
    // ipcInvoke already surfaces the error toast
  }
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

.dossier-clinic-view__toolbar {
  align-items: flex-end;
  row-gap: 8px;
}

.dossier-clinic-view__toolbar .cde-filters {
  flex: 1 1 auto;
  align-items: flex-end;
  gap: 12px;
}

.dossier-clinic-view__filter {
  flex: 0 0 auto;
  min-width: auto;
}

.dossier-clinic-view__filter--source {
  min-width: 200px;
}

.dossier-clinic-view__filter--type {
  width: 168px;
}

.dossier-clinic-view__filter--period {
  width: 250px;
}

.dossier-clinic-view__toolbar :deep(.cde-toolbar__select) {
  width: 100%;
}

.dossier-clinic-view__toolbar :deep(.cde-toolbar__range) {
  width: 100%;
}

/* Neutral segmented control: the selected item stays readable and on-system. */
.dossier-clinic-view__source {
  --el-segmented-bg-color: var(--cd-widget-bg);
  --el-segmented-color: var(--cd-gray-600);
  --el-segmented-item-selected-bg-color: var(--cd-gray-100);
  --el-segmented-item-selected-color: var(--cd-gray-900);
  --el-segmented-item-hover-bg-color: var(--cd-gray-50);
  --el-segmented-item-hover-color: var(--cd-gray-900);
  --el-segmented-item-active-bg-color: var(--cd-gray-100);
  width: 100%;
  min-height: 28px;
  padding: 2px;
  border: 1px solid var(--cd-gray-300);
  border-radius: 6px;
}

.dossier-clinic-view__source :deep(.el-segmented__group) {
  gap: 0;
}

.dossier-clinic-view__source :deep(.el-segmented__item) {
  min-height: 22px;
  padding: 0 10px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.dossier-clinic-view__source :deep(.el-segmented__item.is-selected) {
  font-weight: 600;
}

.dossier-clinic-view__source :deep(.el-segmented__item-selected) {
  border-radius: 4px;
}

.dossier-clinic-view__source :deep(.el-segmented__item-selected.is-focus-visible:before) {
  outline-color: var(--el-color-primary);
}

.dossier-clinic-view__page-loading {
  padding: 24px;
}

.dossier-clinic-view__contact-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--cd-gray-50);
  border: 1px solid var(--cde-border);
  border-radius: 6px;
  margin-bottom: 12px;
}

.dossier-clinic-view__contact-info {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--cd-gray-500);
}

.dossier-clinic-view__contact-label {
  font-weight: 600;
  color: var(--cd-gray-900);
}

.dossier-clinic-view__contact-sep {
  color: var(--cd-gray-300);
}

.dossier-clinic-view__contact-type,
.dossier-clinic-view__contact-date,
.dossier-clinic-view__contact-service,
.dossier-clinic-view__contact-medecin {
  color: var(--cd-gray-600);
  font-weight: 500;
}


.dossier-clinic-view :deep(.el-table__empty-block) {
  min-height: 40px;
}

.dossier-clinic-view__empty {
  width: 100%;
  padding: 0 10px;
  font-size: 12px;
  line-height: 40px;
  color: var(--cde-muted);
  text-align: left;
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

.dossier-clinic__expanded {
  padding: 8px 16px 8px 24px;
}

.dossier-clinic__pdf-viewer {
  display: block;
  width: 100%;
  height: 150px;
  min-height: 150px;
  border: 1px solid var(--cde-border-soft);
  border-radius: 6px;
  background: var(--cde-surface-tint);
}

.dossier-clinic__expanded-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  flex-wrap: wrap;
}

/* Full page form */
.dossier-clinic__full-page {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: var(--cde-surface);
  display: flex;
  flex-direction: column;
}

.dossier-clinic__full-page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 24px;
  border-bottom: 1px solid var(--cde-border);
  background: var(--cde-surface);
  flex-shrink: 0;
}

.dossier-clinic__full-page-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dossier-clinic__full-page-header-left .el-button + .el-button {
  margin-left: 4px;
  border-left: 1px solid var(--cde-border-soft);
  border-radius: 0;
  padding-left: 14px;
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
  padding-top: 0;
}

</style>
