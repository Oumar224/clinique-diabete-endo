<template>
  <el-dialog
    :model-value="visible"
    title="Saisie des résultats"
    width="720px"
    :close-on-click-modal="false"
    @update:model-value="$emit('update:visible', $event)"
  >
    <div v-if="loadingParams" v-loading="true" style="height: 200px" />
    <template v-else>
      <div v-if="groupedParams.length === 0" class="val-dialog__empty">
        <el-empty description="Aucun paramètre configuré pour les examens demandés" :image-size="80" />
      </div>
      <template v-else>
        <div v-for="group in groupedParams" :key="group.examName" class="val-dialog__group">
          <h4 class="val-dialog__group-title" v-if="groupedParams.length > 1">{{ group.examName }}</h4>
          <el-form label-position="top">
            <el-row :gutter="16">
              <template v-for="param in group.params" :key="param.id">
                <el-col :span="12" class="val-dialog__field-col">
                  <el-form-item>
                    <template #label>
                      <span>{{ param.name }}</span>
                      <span v-if="param.unit" class="val-dialog__unit"> ({{ param.unit }})</span>
                    </template>
                    <!-- Numeric -->
                    <el-input-number
                      v-if="param.inputType === 'numeric'"
                      v-model="formData[`param_${param.id}`]"
                      controls-position="right"
                      style="width: 100%"
                      :placeholder="formatRefHelp(param.referenceValues)"
                    />
                    <!-- Text -->
                    <el-input
                      v-else-if="param.inputType === 'text'"
                      v-model="formData[`param_${param.id}`]"
                      placeholder="Saisir la valeur"
                    />
                    <!-- Select -->
                    <el-select
                      v-else-if="param.inputType === 'select'"
                      v-model="formData[`param_${param.id}`]"
                      placeholder="Sélectionner"
                      style="width: 100%"
                    >
                      <el-option
                        v-for="opt in (param.referenceValues?.options ?? [])"
                        :key="opt.value"
                        :label="opt.value"
                        :value="opt.value"
                      />
                    </el-select>
                    <!-- Boolean -->
                    <el-radio-group
                      v-else-if="param.inputType === 'boolean'"
                      v-model="formData[`param_${param.id}`]"
                    >
                      <el-radio :value="param.referenceValues?.normal_value ?? 'Négatif'">
                        {{ param.referenceValues?.normal_value ?? 'Négatif' }}
                      </el-radio>
                      <el-radio :value="param.referenceValues?.normal_value === 'Négatif' ? 'Positif' : 'Négatif'">
                        {{ param.referenceValues?.normal_value === 'Négatif' ? 'Positif' : 'Négatif' }}
                      </el-radio>
                    </el-radio-group>
                    <span v-if="param.inputType === 'numeric' && formatRefHelp(param.referenceValues)" class="val-dialog__ref-help">
                      {{ formatRefHelp(param.referenceValues) }}
                    </span>
                  </el-form-item>
                </el-col>
              </template>
            </el-row>
          </el-form>
        </div>
      </template>
    </template>
    <template #footer>
      <el-button @click="$emit('update:visible', false)">Annuler</el-button>
      <el-button type="primary" :loading="saving" :disabled="groupedParams.length === 0" @click="onSubmit">
        Enregistrer les résultats
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { useExamParameters, type ExamParameterDto } from '@/composables/useExamParameters'
import { useExamResults } from '@/composables/useExamResults'
import { useAuth } from '@/composables/useAuth'

const props = defineProps<{
  visible: boolean
  examRequestId: number
  examIds: number[]
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'validated': []
}>()

const { parameters, loading: loadingParams, fetchByExamIds } = useExamParameters()
const { validateExam } = useExamResults()
const { user } = useAuth()

const saving = ref(false)
const formData = reactive<Record<string, any>>({})

interface ParamGroup {
  examName: string
  params: ExamParameterDto[]
}

const groupedParams = ref<ParamGroup[]>([])

watch(() => props.visible, async (v) => {
  if (v && props.examIds.length > 0) {
    Object.keys(formData).forEach(k => delete formData[k])
    await fetchByExamIds(props.examIds)
    // Group by exam name
    const groups = new Map<string, ExamParameterDto[]>()
    for (const p of parameters.value) {
      const key = p.examName ?? 'Paramètres'
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(p)
    }
    groupedParams.value = Array.from(groups.entries()).map(([examName, params]) => ({ examName, params }))
  }
})

function formatRefHelp(refs: any): string {
  if (!refs) return ''
  if (refs.min != null && refs.max != null) return `Réf: ${refs.min} – ${refs.max}`
  if (refs.min_h != null && refs.max_h != null) return `H: ${refs.min_h}–${refs.max_h} | F: ${refs.min_f}–${refs.max_f}`
  return ''
}

async function onSubmit() {
  if (props.examRequestId == null || !user.value?.id) return
  saving.value = true
  try {
    const results = parameters.value
      .filter(p => formData[`param_${p.id}`] !== undefined && formData[`param_${p.id}`] !== '')
      .map(p => {
        const val = formData[`param_${p.id}`]
        const valStr = String(val)
        return {
          parameterId: p.id!,
          value: valStr,
          isNormal: computeIsNormal(p, valStr),
        }
      })
    const ok = await validateExam(props.examRequestId, results, user.value.id)
    if (ok) {
      emit('validated')
      emit('update:visible', false)
    }
  } finally {
    saving.value = false
  }
}

function computeIsNormal(param: ExamParameterDto, value: string): boolean | undefined {
  const refs = param.referenceValues
  if (!refs) return undefined
  if (param.inputType === 'numeric') {
    const num = parseFloat(value)
    if (isNaN(num)) return undefined
    if (refs.min_h != null && refs.max_h != null) {
      if (num >= refs.min_h && num <= refs.max_h) return true
      if (refs.min_f != null && refs.max_f != null && num >= refs.min_f && num <= refs.max_f) return true
      return false
    }
    if (refs.min != null && refs.max != null) {
      return num >= refs.min && num <= refs.max
    }
    return undefined
  }
  if (param.inputType === 'select' && refs.options) {
    const opt = refs.options.find(o => o.value === value)
    return opt?.is_normal
  }
  if (param.inputType === 'boolean' && refs.normal_value) {
    return value === refs.normal_value
  }
  return undefined
}
</script>

<style scoped>
.val-dialog__group {
  margin-bottom: 16px;
}
.val-dialog__group-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--cd-gray-700);
  margin-bottom: 8px;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--cd-gray-200);
}
.val-dialog__unit {
  font-size: 12px;
  color: var(--cd-gray-500);
}
.val-dialog__ref-help {
  display: block;
  font-size: 11px;
  color: var(--cd-gray-500);
  margin-top: 2px;
}
.val-dialog__field-col {
  margin-bottom: 4px;
}
</style>
