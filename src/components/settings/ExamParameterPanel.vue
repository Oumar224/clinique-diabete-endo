<template>
  <section class="param-panel cde">
    <div class="cde-section-head param-panel__header">
      <div class="param-panel__header-left">
        <el-button text size="small" :icon="ArrowLeft" title="Retour" @click="$emit('close')" />
        <span class="cde-section-title">Paramètres — {{ ownerLabel }}</span>
        <span v-if="parameters.length" class="cde-badge cde-badge--muted">{{ parameters.length }}</span>
      </div>
      <el-button type="primary" size="small" :icon="Plus" @click="openCreate">
        Nouveau paramètre
      </el-button>
    </div>

    <div class="cde-table-card">
      <el-table
        v-loading="loading"
        :data="parameters"
        size="small"
        style="width: 100%"
        empty-text=""
      >
        <el-table-column label="Ordre" prop="sortOrder" width="70" align="right">
          <template #default="{ row }">
            <span class="cde-num">{{ row.sortOrder }}</span>
          </template>
        </el-table-column>
        <el-table-column label="Nom" prop="name" min-width="140" />
        <el-table-column label="Unité" prop="unit" width="100">
          <template #default="{ row }">
            <span :class="{ 'cde-muted': !row.unit }">{{ row.unit || '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="Type" width="120" align="center">
          <template #default="{ row }">
            <span class="cde-badge cde-badge--muted">{{ inputTypeLabel(row.inputType) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="Référence" min-width="180">
          <template #default="{ row }">
            <span class="cde-muted param-panel__ref-text">{{ formatRefShort(row.referenceValues, row.inputType) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="Actif" width="70" align="center">
          <template #default="{ row }">
            <span class="cde-badge" :class="row.isActive ? 'cde-badge--success' : 'cde-badge--danger'">
              {{ row.isActive ? 'Oui' : 'Non' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="Actions" width="100" align="center">
          <template #default="{ row }">
            <el-button text type="primary" size="small" :icon="Edit" title="Modifier" @click="openEdit(row)" />
            <el-button text type="danger" size="small" :icon="Delete" title="Supprimer" @click="handleDelete(row)" />
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div v-if="!loading && parameters.length === 0" class="cde-empty">
      Aucun paramètre configuré.
    </div>

    <div class="cde-footer">
      <span class="cde-muted">{{ parameters.length }} paramètre(s)</span>
    </div>

    <ExamParameterForm
      v-model:visible="formVisible"
      :mode="formMode"
      :model-value="formDto"
      :owner-id="ownerId"
      :saving="formSaving"
      @submit="onFormSubmit"
    />
  </section>
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
  margin-top: 10px;
  padding: 0;
  background: transparent;
  border: 0;
}

.param-panel__header {
  margin-bottom: 6px;
}

.param-panel__header-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.param-panel__ref-text {
  font-size: 11px;
}
</style>
