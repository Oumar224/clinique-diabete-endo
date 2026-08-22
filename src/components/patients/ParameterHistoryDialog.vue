<template>
  <el-dialog
    :model-value="modelValue"
    :title="title"
    width="640px"
    :close-on-click-modal="false"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-loading="loading" class="parameter-history-dialog__body">
      <el-table v-if="!loading" :data="entries" size="small">
        <el-table-column label="Date" width="160">
          <template #default="{ row }">
            <span class="parameter-history-dialog__date">{{ formatDate(row.date) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="documentLabel" label="Document" min-width="170" show-overflow-tooltip />
        <el-table-column label="Valeur" min-width="140">
          <template #default="{ row }">
            <span class="parameter-history-dialog__value">{{ displayValue(row.value) }}</span>
          </template>
        </el-table-column>
      </el-table>
      <el-empty
        v-if="!loading && !entries.length"
        description="Aucun historique pour ce paramètre"
        :image-size="72"
      />
    </div>
    <template #footer>
      <el-button size="small" @click="emit('update:modelValue', false)">Fermer</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import type { ParameterHistoryEntry } from '@/composables/useParameterHistory'
import { formatValue } from '@/utils/parameter-history'

const props = defineProps<{
  modelValue: boolean
  title: string
  path: string
  loading: boolean
  entries: ParameterHistoryEntry[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

function formatDate(isoStr: string): string {
  if (!isoStr) return '—'
  const d = new Date(isoStr)
  if (isNaN(d.getTime())) return isoStr
  return (
    d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  )
}

function displayValue(value: unknown): string {
  return formatValue(props.path, value)
}
</script>

<style scoped lang="scss">
.parameter-history-dialog__body {
  min-height: 140px;
}

.parameter-history-dialog__date {
  font-weight: 600;
  color: var(--cd-primary);
  white-space: nowrap;
}

.parameter-history-dialog__value {
  font-weight: 500;
  color: var(--cd-gray-800);
}
</style>
