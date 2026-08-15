<template>
  <div class="doc-form">
    <!-- No document selected -->
    <el-empty
      v-if="!document"
      description="Sélectionnez un document"
      :image-size="100"
    />

    <!-- Imported document: viewer + metadata -->
    <template v-else-if="document.source === 'imported'">
      <div class="doc-form__header">
        <div class="doc-form__header-left">
          <h3 class="doc-form__title">{{ document.title || 'Document importé' }}</h3>
          <el-tag type="info" size="small" effect="light">
            Importé
          </el-tag>
        </div>
      </div>

      <div class="doc-form__meta">
        <span v-if="document.createdBy" class="doc-form__meta-item">
          Créé par: <strong>{{ document.createdBy }}</strong>
        </span>
        <span class="doc-form__meta-item">
          Créé le: <strong>{{ formatDateTime(document.createdAt) }}</strong>
        </span>
        <span class="doc-form__meta-item">
          Importé le: <strong>{{ formatDateTime(document.updatedAt) }}</strong>
        </span>
      </div>

      <div class="doc-form__body doc-form__body--imported">
        <!-- PDF preview -->
        <iframe
          v-if="importedFileType === 'pdf' && document.pdfPath"
          :src="'file://' + document.pdfPath"
          class="doc-form__pdf-viewer"
        />
        <!-- Image preview -->
        <img
          v-else-if="importedFileType === 'image' && document.pdfPath"
          :src="'file://' + document.pdfPath"
          :alt="document.title"
          class="doc-form__image-viewer"
        />
        <!-- Doc / other: no inline preview -->
        <el-empty v-else description="Document importé" :image-size="80">
          <template #default>
            <p class="doc-form__imported-filename">
              {{ document.title || document.pdfPath?.split('/').pop() || 'Fichier inconnu' }}
            </p>
          </template>
        </el-empty>
      </div>

      <div class="doc-form__footer">
        <el-button
          v-if="document.pdfPath"
          type="primary"
          @click="openPdf(document.pdfPath!)"
        >
          Ouvrir dans le visionneuse système
        </el-button>
      </div>
    </template>

    <!-- Document with known type -->
    <template v-else-if="documentType">
      <!-- CRH Diabète: dedicated form -->
      <CrhDiabeteForm
        v-if="documentType.code === 'CRH_DIABETE'"
        v-model="localFormData"
        :readonly="readonly"
        :contact-id="document.contactId"
        :contact-display="contactDisplay"
        :document-id="document.id"
        :document-created-at="document.createdAt"
        @save="handleSave"
        @sign="handleSign"
        @close="$emit('close')"
      />

      <!-- CRC Diabète: dedicated form -->
      <CrcDiabeteForm
        v-else-if="documentType.code === 'CRC_DIABETE'"
        v-model="localFormData"
        :readonly="readonly"
        :contact-id="document.contactId"
        :contact-display="contactDisplay"
        :document-id="document.id"
        :document-created-at="document.createdAt"
        @save="handleSave"
        @sign="handleSign"
        @close="$emit('close')"
      />

      <!-- Ordonnance Libre: dedicated form -->
      <OrdonnanceLibreForm
        v-else-if="documentType.code === 'ORDONNANCE_LIBRE'"
        :document="document"
        :document-type="documentType"
        :readonly="readonly"
        :contact-display="contactDisplay"
        @save="handleSave"
        @sign="handleSign"
        @close="$emit('close')"
      />

      <!-- Other document types: dynamic form renderer -->
      <template v-else>
        <!-- Locked alert -->
        <el-alert
          v-if="readonly"
          title="Ce document est verrouillé en lecture seule."
          type="warning"
          show-icon
          :closable="false"
          class="doc-form__alert"
        />

        <!-- Document header -->
        <div class="doc-form__header">
          <div class="doc-form__header-left">
            <h3 class="doc-form__title">{{ documentType.label }}</h3>
            <el-tag
              :type="document.status === 'signed' ? 'success' : 'warning'"
              size="small"
              effect="light"
            >
              {{ document.status === 'signed' ? 'Signé' : 'Brouillon' }}
            </el-tag>
          </div>

        </div>

        <!-- Meta info -->
        <div class="doc-form__meta">
          <span v-if="document.createdBy" class="doc-form__meta-item">
            Créé par: <strong>{{ document.createdBy }}</strong>
          </span>
          <span class="doc-form__meta-item">
            Créé le: <strong>{{ formatDateTime(document.createdAt) }}</strong>
          </span>
          <span v-if="document.signedAt" class="doc-form__meta-item">
            Signé le: <strong>{{ formatDateTime(document.signedAt) }}</strong>
          </span>
          <span v-if="document.signedBy" class="doc-form__meta-item">
            Par: <strong>{{ document.signedBy }}</strong>
          </span>
        </div>

        <!-- Dynamic Form -->
        <div class="doc-form__body">
          <DynamicFormRenderer
            ref="formRendererRef"
            v-model="localFormData"
            :schema="documentType.formSchema"
            :disabled="readonly"
          />
        </div>

        <!-- Footer actions -->
        <div v-if="!readonly" class="doc-form__footer">
          <el-button
            :loading="saving"
            :disabled="saving || signing"
            @click="handleSaveDraft"
          >
            Enregistrer Brouillon
          </el-button>
          <el-button
            v-if="document.status === 'draft'"
            type="primary"
            :loading="signing"
            :disabled="saving || signing"
            @click="handleSign"
          >
            Signer et Verrouiller
          </el-button>
        </div>
      </template>
    </template>

    <!-- Document type not found -->
    <el-empty
      v-else
      description="Type de document introuvable"
      :image-size="80"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { ClinicalDocumentDTO, ClinicalDocumentTypeDTO } from '@/composables/useClinicalDocuments'
import { useClinicalDocuments } from '@/composables/useClinicalDocuments'
import DynamicFormRenderer from './DynamicFormRenderer.vue'
import CrhDiabeteForm from './CrhDiabeteForm.vue'
import CrcDiabeteForm from './CrcDiabeteForm.vue'
import OrdonnanceLibreForm from './OrdonnanceLibreForm.vue'

const props = defineProps<{
  document: ClinicalDocumentDTO | null
  documentType: ClinicalDocumentTypeDTO | null
  readonly: boolean
  contactDisplay?: string
}>()

const emit = defineEmits<{
  save: [formData: Record<string, any>]
  sign: []
  close: []
}>()

const formRendererRef = ref<InstanceType<typeof DynamicFormRenderer> | null>(null)
const localFormData = ref<Record<string, any>>({})
const saving = ref(false)
const signing = ref(false)

const { openPdf } = useClinicalDocuments()

const importedFileType = computed(() => {
  const path = props.document?.pdfPath
  if (!path) return 'unknown'
  const ext = path.split('.').pop()?.toLowerCase()
  if (ext === 'pdf') return 'pdf'
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext ?? '')) return 'image'
  if (['doc', 'docx'].includes(ext ?? '')) return 'doc'
  return 'unknown'
})

const contactDisplay = computed(() => {
  return props.contactDisplay || `Contact #${props.document?.contactId || '?'}`
})

// When document changes, initialize local form data from document.formData
watch(
  () => props.document,
  (doc) => {
    if (doc) {
      localFormData.value = JSON.parse(JSON.stringify(doc.formData ?? {}))
      nextTick(() => {
        formRendererRef.value?.resetValidation()
      })
    } else {
      localFormData.value = {}
    }
  },
  { immediate: true },
)

async function handleSave(formData: Record<string, any>) {
  emit('save', formData)
}

async function handleSaveDraft() {
  if (!props.document) return

  // Validate form
  const valid = await formRendererRef.value?.validate() ?? true
  if (!valid) {
    ElMessage.warning('Veuillez corriger les erreurs avant d\'enregistrer.')
    return
  }

  saving.value = true
  emit('save', { ...localFormData.value })
  saving.value = false
}

async function handleSign() {
  if (!props.document) return

  // For CRH/CRC Diabète, signing is handled by the dedicated form
  if (props.documentType?.code === 'CRH_DIABETE' || props.documentType?.code === 'CRC_DIABETE') {
    emit('sign')
    return
  }

  // Validate form first for dynamic forms
  const valid = await formRendererRef.value?.validate() ?? true
  if (!valid) {
    ElMessage.warning('Veuillez corriger les erreurs avant de signer.')
    return
  }

  try {
    await ElMessageBox.confirm(
      'Êtes-vous sûr de vouloir signer et verrouiller ce document ? Cette action est irréversible.',
      'Confirmation de signature',
      {
        confirmButtonText: 'Signer',
        cancelButtonText: 'Annuler',
        type: 'warning',
      },
    )
    signing.value = true
    emit('save', { ...localFormData.value })
    await nextTick()
    emit('sign')
    signing.value = false
  } catch {
    // User cancelled
  }
}

function formatDateTime(dateStr: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }) + ' ' + d.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<style scoped lang="scss">
.doc-form {
  padding: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.doc-form__alert {
  margin-bottom: 16px;
}

.doc-form__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.doc-form__header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.doc-form__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0;
}

.doc-form__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--el-border-color-light);
}

.doc-form__meta-item {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.doc-form__body {
  flex: 1;
  overflow-y: auto;
}

.doc-form__body--imported {
  display: flex;
  align-items: center;
  justify-content: center;
}

.doc-form__pdf-viewer {
  width: 100%;
  height: 100%;
  min-height: 500px;
  border: none;
  border-radius: 4px;
}

.doc-form__image-viewer {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  margin: 0 auto;
  display: block;
  border-radius: 4px;
}

.doc-form__imported-filename {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  margin-top: 8px;
}

.doc-form__footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 16px;
  border-top: 1px solid var(--el-border-color-light);
  margin-top: 16px;
}
</style>
