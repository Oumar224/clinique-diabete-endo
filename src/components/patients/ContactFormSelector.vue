<template>
  <div class="contact-form-selector">
    <!-- Service filter -->
    <div class="contact-form-selector__filter">
      <div class="contact-form-selector__filter-label">
        Service
      </div>
      <el-select
        v-model="selectedServiceId"
        placeholder="Filtrer par service"
        clearable
        filterable
        style="width: 320px"
        @change="loadDocumentTypes"
      >
        <el-option
          v-for="svc in services"
          :key="svc.id"
          :label="svc.name"
          :value="svc.id!"
        />
      </el-select>
    </div>

    <!-- Loading state -->
    <div v-if="loadingTypes" class="contact-form-selector__loading">
      <el-skeleton :rows="6" animated />
    </div>

    <!-- Empty state -->
    <el-empty
      v-else-if="groupedTypes.length === 0"
      description="Aucun document disponible"
      :image-size="80"
    />

    <!-- Accordion catalog -->
    <el-collapse
      v-else
      v-model="openCategories"
      class="contact-form-selector__accordion"
    >
      <el-collapse-item
        v-for="group in groupedTypes"
        :key="group.category"
        :name="group.category"
      >
        <template #title>
          <div class="contact-form-selector__group-title">
            <span class="contact-form-selector__group-icon">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="1.5" y="1.5" width="11" height="11" rx="1" stroke="currentColor" stroke-width="0.8" fill="currentColor" fill-opacity="0.1"/>
                <path d="M4 7H10" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
              </svg>
            </span>
            <span class="contact-form-selector__group-label">{{ group.category }}</span>
            <el-tag size="small" type="info" effect="plain" class="contact-form-selector__group-count">
              {{ group.types.length }}
            </el-tag>
          </div>
        </template>

        <div class="contact-form-selector__items">
          <div
            v-for="docType in group.types"
            :key="docType.id"
            class="contact-form-selector__item"
          >
            <div class="contact-form-selector__item-info">
              <div class="contact-form-selector__item-label">
                {{ docType.label }}
              </div>
              <div v-if="docType.acteLabel || docType.prixUnitaire != null" class="contact-form-selector__item-acte">
                <el-tag
                  size="small"
                  effect="plain"
                  type="warning"
                  class="contact-form-selector__item-badge"
                >
                  {{ docType.acteLabel ?? 'Acte' }}
                  <span v-if="docType.prixUnitaire != null" class="contact-form-selector__item-price">
                    — {{ formatPrice(docType.prixUnitaire) }}
                  </span>
                </el-tag>
              </div>
            </div>

            <el-button
              type="primary"
              size="small"
              :loading="creatingId === docType.id"
              @click="handleCreate(docType)"
            >
              {{ creatingId === docType.id ? 'Création...' : 'Nouveau' }}
            </el-button>
          </div>
        </div>
      </el-collapse-item>
    </el-collapse>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useClinicalDocuments, type ClinicalDocumentTypeDTO } from '@/composables/useClinicalDocuments'
import { useMedicalServices } from '@/composables/useMedicalServices'
import { useAuth } from '@/composables/useAuth'
import { useCurrencies } from '@/composables/useCurrencies'
import { getEncounter } from '@/composables/useEncounters'

const props = defineProps<{
  contactId: string
}>()

const emit = defineEmits<{
  'document-created': [documentId: string]
}>()

const {
  createDocumentWithActe,
  fetchDocumentTypesWithPricing,
  isContactExpired,
  checkContactExpired,
} = useClinicalDocuments()

const { services, fetchServices } = useMedicalServices()
const { user } = useAuth()
const { formatCurrency } = useCurrencies()

function formatPrice(amount: number): string {
  return formatCurrency(amount)
}

const selectedServiceId = ref<number | undefined>(undefined)
const openCategories = ref<string[]>([])
const allDocumentTypes = ref<ClinicalDocumentTypeDTO[]>([])
const loadingTypes = ref(false)
const creatingId = ref<string | null>(null)

// Group document types by category, optionally filtered by service
const groupedTypes = computed(() => {
  const filtered = selectedServiceId.value
    ? allDocumentTypes.value
    : allDocumentTypes.value

  const groups = new Map<string, ClinicalDocumentTypeDTO[]>()
  for (const dt of filtered) {
    const cat = dt.category || 'Autres'
    if (!groups.has(cat)) groups.set(cat, [])
    groups.get(cat)!.push(dt)
  }

  return Array.from(groups.entries()).map(([category, types]) => ({
    category,
    types,
  }))
})

onMounted(async () => {
  await Promise.all([
    fetchServices(true),
    checkContactExpired(props.contactId),
  ])

  // Auto-detect service from contact
  await autoDetectService()
  await loadDocumentTypes()
})

watch(() => props.contactId, async (newId) => {
  if (newId) {
    await checkContactExpired(newId)
    await autoDetectService()
    await loadDocumentTypes()
  }
})

async function autoDetectService() {
  try {
    const encounter = await getEncounter(Number(props.contactId))
    if (encounter?.service_id) {
      selectedServiceId.value = encounter.service_id
    }
  } catch {
    // Silent fallback — user will pick manually
  }
}

async function loadDocumentTypes() {
  loadingTypes.value = true
  try {
    allDocumentTypes.value = await fetchDocumentTypesWithPricing()
    // Auto-open first category
    if (allDocumentTypes.value.length > 0 && openCategories.value.length === 0) {
      const cats = new Set(allDocumentTypes.value.map(d => d.category || 'Autres'))
      openCategories.value = [Array.from(cats)[0]]
    }
  } finally {
    loadingTypes.value = false
  }
}

async function handleCreate(docType: ClinicalDocumentTypeDTO) {
  // Check contact expiration
  if (isContactExpired.value) {
    ElMessageBox.alert(
      'Ce contact est expiré (plus de 24h). Impossible de créer un nouveau document.',
      'Contact expiré',
      {
        confirmButtonText: 'OK',
        type: 'warning',
      },
    )
    return
  }

  creatingId.value = docType.id
  const serviceId = selectedServiceId.value?.toString() ?? ''
  const createdBy = user.value?.id?.toString() ?? ''

  const result = await createDocumentWithActe(
    docType.id,
    props.contactId,
    serviceId,
    createdBy,
  )

  if (result.document) {
    const acteMsg = result.acteId
      ? ` + Acte lié${result.prixUnitaire != null ? ` (${formatPrice(result.prixUnitaire)})` : ''}`
      : ''
    ElMessage.success(`Document "${docType.label}" créé${acteMsg}`)
    emit('document-created', result.document.id)
  }

  creatingId.value = null
}
</script>

<style scoped lang="scss">
.contact-form-selector {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.contact-form-selector__filter {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.contact-form-selector__filter-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  white-space: nowrap;
}

.contact-form-selector__loading {
  padding: 16px 0;
}

.contact-form-selector__accordion {
  flex: 1;
  overflow-y: auto;
}

.contact-form-selector__group-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
}

.contact-form-selector__group-icon {
  display: flex;
  align-items: center;
  color: var(--el-color-primary);
}

.contact-form-selector__group-count {
  margin-left: auto;
}

.contact-form-selector__items {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 4px 0;
}

.contact-form-selector__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--el-border-color-light);
  transition: background-color 0.15s ease, border-color 0.15s ease;

  &:hover {
    background-color: var(--el-color-primary-light-9);
    border-color: var(--el-color-primary-light-7);
  }
}

.contact-form-selector__item-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.contact-form-selector__item-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.contact-form-selector__item-acte {
  display: flex;
  align-items: center;
  gap: 4px;
}

.contact-form-selector__item-badge {
  font-size: 11px;
}

.contact-form-selector__item-price {
  font-weight: 600;
}
</style>
