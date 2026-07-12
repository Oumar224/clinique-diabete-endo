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
    <el-alert
      v-else
      title="Aucun contact actif"
      type="warning"
      show-icon
      :closable="false"
      class="dossier-clinic-view__alert"
    >
      <p>Créez d'abord un contact (hospitalisation) pour ce patient avant de pouvoir créer un document clinique.</p>
    </el-alert>

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
    </div>

    <!-- Documents table (toujours visible, même vide) -->
    <el-table
      :data="documents"
      style="width:100%;margin-top:12px"
      size="small"
      highlight-current-row
      v-loading="loading"
      element-loading-text="Chargement des documents..."
      @row-click="onRowClick"
    >
      <el-table-column label="Document" min-width="200">
        <template #default="{ row }">
          <div class="dossier-clinic__doc-cell">
            <span class="dossier-clinic__doc-title">{{ row.documentType?.label || row.title || 'Document' }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="Statut" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="row.status === 'signed' ? 'success' : 'warning'" size="small" effect="plain">
            {{ row.status === 'signed' ? 'Signé' : 'Brouillon' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="Créé le" width="110">
        <template #default="{ row }">
          {{ formatDate(row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column label="Actions" width="100" align="center">
        <template #default="{ row }">
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
      <template v-if="activeContact">
        <el-form label-position="top">
          <el-form-item label="Type de document">
            <el-select v-model="selectedTypeId" placeholder="Sélectionner un type" style="width:100%">
              <el-option
                v-for="t in documentTypes"
                :key="t.id"
                :label="t.label"
                :value="t.id"
              />
            </el-select>
          </el-form-item>
        </el-form>
      </template>
      <template v-else>
        <el-empty description="Aucun contact actif de type hospitalisation" :image-size="80" />
      </template>
      <template #footer>
        <el-button @click="showTypeDialog = false">Annuler</el-button>
        <el-button
          type="primary"
          :disabled="!selectedTypeId"
          :loading="creatingDoc"
          @click="handleConfirmType"
        >
          Créer
        </el-button>
      </template>
    </el-dialog>

    <!-- DOCUMENT FORM DRAWER -->
    <el-drawer
      v-model="showFormDrawer"
      :title="selectedDocument?.documentType?.label || 'Document'"
      size="75%"
      direction="rtl"
      destroy-on-close
    >
      <ClinicalDocForm
        v-if="selectedDocument && selectedDocType"
        :document="selectedDocument"
        :document-type="selectedDocType"
        :readonly="isReadonly"
        :contact-display="contactDisplayLabel"
        @save="handleSave"
        @sign="handleSign"
        @close="handleCloseForm"
      />
    </el-drawer>

    <!-- Loading overlay for initial load -->
    <div v-if="pageLoading" class="dossier-clinic-view__page-loading">
      <el-skeleton :rows="6" animated />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Delete, User } from '@element-plus/icons-vue'
import { usePatientContext } from '@/composables/usePatientContext'
import { useClinicalDocuments } from '@/composables/useClinicalDocuments'
import { useAuth } from '@/composables/useAuth'
import { listEncountersByPatient, type EncounterDto } from '@/composables/useEncounters'
import ClinicalDocForm from '@/components/patients/ClinicalDocForm.vue'

const { activePatient } = usePatientContext()
const {
  documentTypes,
  documents,
  selectedDocument,
  loading,
  fetchDocumentTypes,
  fetchDocumentsByPatient,
  createDocument,
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
const showFormDrawer = ref(false)
const showTypeDialog = ref(false)
const selectedTypeId = ref('')

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
    activeContact.value = encounters.find(e => e.contact_type === 'hospitalisation') ?? null
    await fetchDocumentsByPatient(activePatient.value.id)
  } finally {
    pageLoading.value = false
  }
}

onMounted(loadData)

async function handleConfirmType() {
  if (!selectedTypeId.value || !activeContact.value || !activePatient.value?.id) return
  showTypeDialog.value = false

  creatingDoc.value = true
  try {
    const serviceId = activeContact.value.service_id?.toString() ?? ''
    const createdBy = user.value?.id?.toString() ?? ''
    const doc = await createDocument(selectedTypeId.value, activeContact.value.id!.toString(), serviceId, createdBy)
    if (doc) {
      selectDocument(doc)
      showFormDrawer.value = true
      ElMessage.success('Document créé')
    } else {
      ElMessage.error('Échec de la création du document')
    }
    selectedTypeId.value = ''
  } finally {
    creatingDoc.value = false
  }
}

function onRowClick(row: any) {
  selectDocument(row)
  showFormDrawer.value = true
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
    showFormDrawer.value = false
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
      showFormDrawer.value = false
    }
  }
}

function handleCloseForm() {
  showFormDrawer.value = false
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

.dossier-clinic__doc-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.dossier-clinic__doc-title {
  font-weight: 600;
  font-size: 13px;
}

</style>
