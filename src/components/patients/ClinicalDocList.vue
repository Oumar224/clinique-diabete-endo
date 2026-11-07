<template>
  <div class="doc-list">
    <!-- Header -->
    <div class="doc-list__header">
      <h3 class="doc-list__title">Documents Cliniques</h3>
      <el-dropdown
        trigger="click"
        :disabled="disabled"
        @command="handleCreate"
      >
        <el-button
          type="primary"
          size="small"
          :disabled="disabled"
          :title="disabled ? 'Le contact est expiré, impossible d\'ajouter un document' : 'Ajouter un document'"
        >
          + Ajouter
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item
              v-for="dt in documentTypes"
              :key="dt.id"
              :command="dt.id"
            >
              <span class="doc-list__type-option">
                <span
                  class="doc-list__type-dot"
                  :style="{ background: categoryColor(dt.category) }"
                />
                {{ dt.label }}
              </span>
            </el-dropdown-item>
            <el-dropdown-item
              v-if="documentTypes.length === 0"
              disabled
            >
              Aucun type disponible
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="doc-list__loading">
      <el-skeleton :rows="4" animated />
    </div>

    <!-- Empty state -->
    <el-empty
      v-else-if="documents.length === 0"
      description="Aucun document clinique"
      :image-size="80"
    />

    <!-- Document list -->
    <div v-else class="doc-list__items">
      <div
        v-for="doc in documents"
        :key="doc.id"
        class="doc-list__item"
        :class="{ 'doc-list__item--selected': doc.id === selectedId }"
        @click="handleSelect(doc.id)"
      >
        <div class="doc-list__item-left">
          <!-- Category icon -->
          <span class="doc-list__item-icon" :style="{ color: categoryColor(doc.documentType?.category) }">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="2" y="1.5" width="14" height="15" rx="1.5" stroke="currentColor" stroke-width="1" fill="currentColor" fill-opacity="0.1" />
              <path d="M5.5 5.5H12.5" stroke="currentColor" stroke-width="1" stroke-linecap="round" />
              <path d="M5.5 8.5H10" stroke="currentColor" stroke-width="1" stroke-linecap="round" />
              <path d="M5.5 11.5H8" stroke="currentColor" stroke-width="1" stroke-linecap="round" />
            </svg>
          </span>

          <div class="doc-list__item-info">
            <div class="doc-list__item-title">
              {{ doc.documentType?.label ?? doc.title ?? 'Document' }}
            </div>
            <div class="doc-list__item-meta">
              <el-tag
                :type="doc.status === 'signed' ? 'success' : 'warning'"
                size="small"
                effect="plain"
              >
                {{ doc.status === 'signed' ? 'Signé' : 'Brouillon' }}
              </el-tag>
              <el-tag
                v-if="doc.source === 'imported'"
                type="info"
                size="small"
                effect="plain"
              >
                Importé
              </el-tag>
              <span class="doc-list__item-date">{{ formatDateTime(doc.createdAt) }}</span>
            </div>
          </div>
        </div>

        <!-- Delete button (drafts only) -->
        <el-button
          v-if="doc.status === 'draft'"
          text
          type="danger"
          size="small"
          class="doc-list__item-delete"
          @click.stop="handleDelete(doc.id)"
        >
          <template #icon>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 3.5H12" stroke="currentColor" stroke-width="1" stroke-linecap="round" />
              <path d="M4.5 3.5V2.5C4.5 2.22386 4.72386 2 5 2H9C9.27614 2 9.5 2.22386 9.5 2.5V3.5" stroke="currentColor" stroke-width="1" stroke-linecap="round" />
              <path d="M3 3.5V11C3 11.5523 3.44772 12 4 12H10C10.5523 12 11 11.5523 11 11V3.5" stroke="currentColor" stroke-width="1" stroke-linecap="round" />
            </svg>
          </template>
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ElMessageBox } from 'element-plus'
import type { ClinicalDocumentDTO, ClinicalDocumentTypeDTO } from '@/composables/useClinicalDocuments'

defineProps<{
  documents: ClinicalDocumentDTO[]
  documentTypes: ClinicalDocumentTypeDTO[]
  selectedId: string | null
  loading: boolean
  disabled: boolean
}>()

const emit = defineEmits<{
  select: [id: string]
  create: [typeId: string]
  'delete-document': [id: string]
  import: []
}>()

function handleSelect(id: string) {
  emit('select', id)
}

function handleCreate(typeId: string) {
  emit('create', typeId)
}

async function handleDelete(id: string) {
  try {
    await ElMessageBox.confirm(
      'Supprimer ce document ? Cette action est irréversible.',
      'Confirmation',
      {
        confirmButtonText: 'Supprimer',
        cancelButtonText: 'Annuler',
        type: 'warning',
      },
    )
    emit('delete-document', id)
  } catch {
    // User cancelled
  }
}

function categoryColor(category?: string): string {
  const colors: Record<string, string> = {
    consultation: 'var(--el-color-primary)',
    lab: 'var(--el-color-success)',
    delivery: 'var(--el-color-danger)',
  }
  return colors[category ?? ''] || 'var(--el-color-info)'
}

function formatDateTime(dateStr: string): string {
  if (!dateStr) return ''
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
.doc-list {
  height: 100%;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--cde-border);
  padding-right: 12px;
}

.doc-list__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  flex-shrink: 0;
}

.doc-list__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0;
}

.doc-list__loading {
  padding: 8px 0;
}

.doc-list__items {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.doc-list__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-radius: 6px;
  border: 1px solid var(--cde-border);
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease;

  &:hover {
    background-color: var(--cde-surface-tint);
    border-color: var(--cde-border);
  }

  &--selected {
    background-color: var(--cde-accent-tint);
    border-color: var(--cde-accent);
  }
}

.doc-list__item-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1;
}

.doc-list__item-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.doc-list__item-info {
  min-width: 0;
  flex: 1;
}

.doc-list__item-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}

.doc-list__item-meta {
  display: flex;
  align-items: center;
  gap: 6px;
}

.doc-list__item-date {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.doc-list__item-delete {
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.doc-list__item:hover .doc-list__item-delete {
  opacity: 1;
}

.doc-list__type-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

.doc-list__type-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
</style>
