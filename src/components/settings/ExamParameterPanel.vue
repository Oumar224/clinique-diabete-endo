<template>
  <div class="param-panel">
    <div class="param-panel__header">
      <div class="param-panel__header-left">
        <el-button text size="small" :icon="ArrowLeft" @click="$emit('close')" />
        <span class="param-panel__title">Paramètres — {{ ownerLabel }}</span>
        <el-tag v-if="parameters.length" size="small" type="info" effect="plain">{{ parameters.length }}</el-tag>
      </div>
      <el-button type="primary" size="small" :icon="Plus" @click="openCreate">
        Nouveau paramètre
      </el-button>
    </div>

    <el-table :data="parameters" size="small" v-loading="loading" border style="width: 100%">
      <el-table-column label="Ordre" prop="sortOrder" width="70" align="center" />
      <el-table-column label="Nom" prop="name" min-width="140" />
      <el-table-column label="Unité" prop="unit" width="100" />
      <el-table-column label="Type" width="120" align="center">
        <template #default="{ row }">
          <el-tag size="small" :type="inputTypeTagType(row.inputType)">{{ inputTypeLabel(row.inputType) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="Référence" min-width="180">
        <template #default="{ row }">
          <span class="param-panel__ref-text">{{ formatRefShort(row.referenceValues, row.inputType) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="Actif" width="70" align="center">
        <template #default="{ row }">
          <el-tag :type="row.isActive ? 'success' : 'danger'" size="small">{{ row.isActive ? 'Oui' : 'Non' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="Actions" width="100" align="center">
        <template #default="{ row }">
          <el-button text type="primary" :icon="Edit" size="small" @click="openEdit(row)" />
          <el-button text type="danger" :icon="Delete" size="small" @click="handleDelete(row)" />
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-if="!loading && parameters.length === 0" description="Aucun paramètre configuré" :image-size="60" />

    <ExamParameterForm
      v-model:visible="formVisible"
      :mode="formMode"
      :model-value="formDto"
      :owner-id="ownerId"
      :saving="formSaving"
      @submit="onFormSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { Plus, Edit, Delete, ArrowLeft } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import { useExamParameters, type ExamParameterDto, type ExamParameterReferenceValues } from '@/composables/useExamParameters'
import ExamParameterForm from './ExamParameterForm.vue'

const props = defineProps<{
  ownerId: number
  ownerType: 'type' | 'exam'
  ownerLabel: string
}>()

defineEmits<{ close: [] }>()

const { parameters, loading, fetchByExam, fetchByType, createParameter, updateParameter, deleteParameter } = useExamParameters()

const formVisible = ref(false)
const formMode = ref<'create' | 'edit'>('create')
const formDto = ref<Partial<ExamParameterDto>>({})
const formSaving = ref(false)

async function loadParams() {
  if (props.ownerType === 'exam') {
    await fetchByExam(props.ownerId)
  } else {
    await fetchByType(props.ownerId)
  }
}

onMounted(loadParams)
watch(() => props.ownerId, loadParams)

function openCreate() {
  formMode.value = 'create'
  formDto.value = { examId: props.ownerId, sortOrder: parameters.value.length, isActive: true, inputType: 'numeric' }
  formVisible.value = true
}

function openEdit(param: ExamParameterDto) {
  formMode.value = 'edit'
  formDto.value = { ...param }
  formVisible.value = true
}

async function onFormSubmit(dto: Partial<ExamParameterDto>) {
  formSaving.value = true
  try {
    if (formMode.value === 'create') {
      const created = await createParameter(dto)
      if (created) formVisible.value = false
    } else {
      const updated = await updateParameter(dto as ExamParameterDto)
      if (updated) formVisible.value = false
    }
    await loadParams()
  } finally {
    formSaving.value = false
  }
}

async function handleDelete(param: ExamParameterDto) {
  try {
    await ElMessageBox.confirm(
      `Supprimer le paramètre « ${param.name} » ?`,
      'Confirmation',
      { type: 'warning', confirmButtonText: 'Supprimer', cancelButtonText: 'Annuler' },
    )
    const ok = await deleteParameter(param.id!)
    if (ok) await loadParams()
  } catch { /* cancelled */ }
}

function inputTypeLabel(type?: string): string {
  const map: Record<string, string> = { numeric: 'Numérique', text: 'Texte', select: 'Liste', boolean: 'Booléen' }
  return map[type ?? ''] ?? type ?? ''
}

function inputTypeTagType(type?: string): 'success' | 'warning' | 'info' | 'danger' {
  const map: Record<string, 'success' | 'warning' | 'info' | 'danger'> = { numeric: 'success', text: 'info', select: 'warning', boolean: 'danger' }
  return map[type ?? ''] ?? 'info'
}

function formatRefShort(refs: ExamParameterReferenceValues | undefined, inputType?: string): string {
  if (!refs) return '—'
  if (inputType === 'numeric') {
    if (refs.min_h != null && refs.max_h != null) return `H: ${refs.min_h}–${refs.max_h} / F: ${refs.min_f}–${refs.max_f}`
    if (refs.min != null && refs.max != null) return `${refs.min} – ${refs.max}`
  }
  if (inputType === 'select' && refs.options) {
    return refs.options.map(o => o.value).join(', ')
  }
  if (inputType === 'boolean' && refs.normal_value) {
    return `Normal: ${refs.normal_value}`
  }
  return '—'
}
</script>

<style scoped>
.param-panel {
  padding: 12px;
  background: var(--cd-gray-50);
  border: 1px solid var(--cd-primary-light-5);
  border-radius: 6px;
  margin-top: 12px;
}
.param-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.param-panel__header-left {
  display: flex;
  align-items: center;
  gap: 6px;
}
.param-panel__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--cd-gray-900);
}
.param-panel__ref-text {
  font-size: 12px;
  color: var(--cd-gray-600);
}
</style>
