<template>
  <el-dialog
    :model-value="visible"
    :title="mode === 'create' ? 'Nouveau paramètre' : 'Modifier le paramètre'"
    width="560px"
    :close-on-click-modal="false"
    @update:model-value="$emit('update:visible', $event)"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
      <el-row :gutter="16">
        <el-col :span="14">
          <el-form-item label="Nom du paramètre" prop="name">
            <el-input v-model="form.name" placeholder="ex: TSH, Créat, Aspect" />
          </el-form-item>
        </el-col>
        <el-col :span="10">
          <el-form-item label="Unité" prop="unit">
            <el-input v-model="form.unit" placeholder="ex: µUI/ml, mmol/l" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="Type de saisie" prop="inputType">
            <el-select v-model="form.inputType" style="width: 100%" @change="onInputTypeChange">
              <el-option label="Numérique" value="numeric" />
              <el-option label="Texte libre" value="text" />
              <el-option label="Liste de choix" value="select" />
              <el-option label="Booléen (Positif/Négatif)" value="boolean" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="Ordre d'affichage" prop="sortOrder">
            <el-input-number v-model="form.sortOrder" :min="0" controls-position="right" style="width: 100%" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="Actif">
        <el-switch v-model="form.isActive" />
      </el-form-item>

      <!-- Reference values section -->
      <el-divider content-position="left">Valeurs de référence</el-divider>

      <!-- Numeric references -->
      <template v-if="form.inputType === 'numeric'">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="Min général">
              <el-input-number v-model="form.referenceValues.min" :precision="2" controls-position="right" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="Max général">
              <el-input-number v-model="form.referenceValues.max" :precision="2" controls-position="right" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-checkbox v-model="hasGenderRef" style="margin-bottom: 12px">Valeurs séparées Homme / Femme</el-checkbox>
        <template v-if="hasGenderRef">
          <el-row :gutter="16">
            <el-col :span="6">
              <el-form-item label="Min H">
                <el-input-number v-model="form.referenceValues.min_h" :precision="2" controls-position="right" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="Max H">
                <el-input-number v-model="form.referenceValues.max_h" :precision="2" controls-position="right" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="Min F">
                <el-input-number v-model="form.referenceValues.min_f" :precision="2" controls-position="right" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="Max F">
                <el-input-number v-model="form.referenceValues.max_f" :precision="2" controls-position="right" style="width: 100%" />
              </el-form-item>
            </el-col>
          </el-row>
        </template>
      </template>

      <!-- Select references -->
      <template v-if="form.inputType === 'select'">
        <div v-for="(opt, idx) in form.referenceValues.options" :key="idx" class="param-form__option-row">
          <el-input v-model="opt.value" placeholder="Valeur" style="flex: 1" />
          <el-switch v-model="opt.is_normal" active-text="Normal" inactive-text="Anormal" style="margin-left: 8px" />
          <el-button text type="danger" :icon="Delete" @click="removeOption(idx)" style="margin-left: 4px" />
        </div>
        <el-button size="small" :icon="Plus" @click="addOption">Ajouter une option</el-button>
      </template>

      <!-- Boolean references -->
      <template v-if="form.inputType === 'boolean'">
        <el-form-item label="Valeur considérée comme normale">
          <el-select v-model="form.referenceValues.normal_value" style="width: 100%">
            <el-option label="Négatif" value="Négatif" />
            <el-option label="Positif" value="Positif" />
            <el-option label="Oui" value="Oui" />
            <el-option label="Non" value="Non" />
          </el-select>
        </el-form-item>
      </template>

      <template v-if="form.inputType === 'text'">
        <el-alert type="info" :closable="false" show-icon title="Pas de valeurs de référence pour le type texte libre" />
      </template>
    </el-form>

    <template #footer>
      <el-button @click="$emit('update:visible', false)">Annuler</el-button>
      <el-button type="primary" :loading="saving" @click="onSubmit">
        {{ mode === 'create' ? 'Créer' : 'Enregistrer' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { Plus, Delete } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import type { ExamParameterDto, ExamParameterReferenceValues } from '@/composables/useExamParameters'

const props = defineProps<{
  visible: boolean
  mode: 'create' | 'edit'
  modelValue: Partial<ExamParameterDto>
  ownerId: number
  saving?: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'submit': [dto: Partial<ExamParameterDto>]
}>()

const formRef = ref<FormInstance>()
const hasGenderRef = ref(false)

const form = reactive({
  name: '',
  unit: '',
  inputType: 'numeric' as ExamParameterDto['inputType'],
  sortOrder: 0,
  isActive: true,
  referenceValues: {
    min: undefined as number | undefined,
    max: undefined as number | undefined,
    min_h: undefined as number | undefined,
    max_h: undefined as number | undefined,
    min_f: undefined as number | undefined,
    max_f: undefined as number | undefined,
    options: [] as Array<{ value: string; is_normal: boolean }>,
    normal_value: 'Négatif' as string,
  },
})

const rules: FormRules = {
  name: [{ required: true, message: 'Le nom est requis', trigger: 'blur' }],
  inputType: [{ required: true, message: 'Le type de saisie est requis', trigger: 'change' }],
}

watch(() => props.visible, (v) => {
  if (v && props.modelValue) {
    form.name = props.modelValue.name ?? ''
    form.unit = props.modelValue.unit ?? ''
    form.inputType = props.modelValue.inputType ?? 'numeric'
    form.sortOrder = props.modelValue.sortOrder ?? 0
    form.isActive = props.modelValue.isActive ?? true
    const refs = props.modelValue.referenceValues ?? {}
    form.referenceValues.min = refs.min
    form.referenceValues.max = refs.max
    form.referenceValues.min_h = refs.min_h
    form.referenceValues.max_h = refs.max_h
    form.referenceValues.min_f = refs.min_f
    form.referenceValues.max_f = refs.max_f
    form.referenceValues.options = refs.options ? JSON.parse(JSON.stringify(refs.options)) : []
    form.referenceValues.normal_value = refs.normal_value ?? 'Négatif'
    hasGenderRef.value = refs.min_h != null || refs.max_h != null
  }
})

function onInputTypeChange() {
  form.referenceValues = {
    min: undefined, max: undefined,
    min_h: undefined, max_h: undefined,
    min_f: undefined, max_f: undefined,
    options: [],
    normal_value: 'Négatif',
  }
  hasGenderRef.value = false
}

function addOption() {
  form.referenceValues.options.push({ value: '', is_normal: true })
}

function removeOption(idx: number) {
  form.referenceValues.options.splice(idx, 1)
}

async function onSubmit() {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  const refValues: ExamParameterReferenceValues = {}
  if (form.inputType === 'numeric') {
    if (!hasGenderRef.value) {
      if (form.referenceValues.min != null) refValues.min = form.referenceValues.min
      if (form.referenceValues.max != null) refValues.max = form.referenceValues.max
    } else {
      if (form.referenceValues.min_h != null) refValues.min_h = form.referenceValues.min_h
      if (form.referenceValues.max_h != null) refValues.max_h = form.referenceValues.max_h
      if (form.referenceValues.min_f != null) refValues.min_f = form.referenceValues.min_f
      if (form.referenceValues.max_f != null) refValues.max_f = form.referenceValues.max_f
    }
  } else if (form.inputType === 'select') {
    refValues.options = form.referenceValues.options.filter(o => o.value.trim())
  } else if (form.inputType === 'boolean') {
    refValues.normal_value = form.referenceValues.normal_value
  }

  emit('submit', {
    ...props.modelValue,
    name: form.name,
    unit: form.unit || undefined,
    inputType: form.inputType,
    sortOrder: form.sortOrder,
    isActive: form.isActive,
    referenceValues: refValues,
    examId: props.ownerId,
  })
}
</script>

<style scoped>
.param-form__option-row {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 8px;
}
</style>
