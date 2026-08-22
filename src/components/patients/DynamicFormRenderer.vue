<template>
  <el-form
    ref="formRef"
    :model="localFormData"
    label-position="top"
    :disabled="disabled"
    class="dynamic-form"
  >
    <el-row :gutter="16">
      <template v-for="field in visibleSchema" :key="field.key">
        <el-col
          :span="field.layout?.width ?? 24"
          :xs="24"
          class="dynamic-form__col"
        >
          <el-form-item
            :label="field.label"
            :required="field.required"
            :prop="field.key"
            :rules="buildRules(field)"
          >
            <!-- Text input -->
            <el-input
              v-if="field.type === 'text'"
              v-model="localFormData[field.key]"
              :placeholder="field.placeholder"
              :clearable="!disabled"
            />

            <!-- Textarea -->
            <RichTextEditor
              v-else-if="field.type === 'textarea'"
              v-model="localFormData[field.key]"
              :rows="3"
              :placeholder="field.placeholder"
              :readonly="disabled"
            />

            <!-- Number -->
            <el-input-number
              v-else-if="field.type === 'number'"
              v-model="localFormData[field.key]"
              :placeholder="field.placeholder"
              :min="getNumberValidatorParam(field, 'min')"
              :max="getNumberValidatorParam(field, 'max')"
              controls-position="right"
              class="dynamic-form__number"
            />

            <!-- Date picker -->
            <el-date-picker
              v-else-if="field.type === 'date'"
              v-model="localFormData[field.key]"
              type="date"
              value-format="YYYY-MM-DD"
              :placeholder="field.placeholder ?? 'Sélectionner une date'"
              :clearable="!disabled"
              style="width: 100%"
            />

            <!-- Select -->
            <el-select
              v-else-if="field.type === 'select'"
              v-model="localFormData[field.key]"
              :placeholder="field.placeholder ?? 'Sélectionner...'"
              :clearable="!disabled"
              style="width: 100%"
            >
              <el-option
                v-for="opt in field.options ?? []"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>

            <!-- Radio group -->
            <el-radio-group
              v-else-if="field.type === 'radio'"
              v-model="localFormData[field.key]"
            >
              <el-radio
                v-for="opt in field.options ?? []"
                :key="opt.value"
                :value="opt.value"
                :label="opt.label"
              />
            </el-radio-group>

            <!-- Checkbox group -->
            <el-checkbox-group
              v-else-if="field.type === 'checkbox'"
              v-model="localFormData[field.key]"
            >
              <el-checkbox
                v-for="opt in field.options ?? []"
                :key="opt.value"
                :label="opt.value"
                :value="opt.value"
              >
                {{ opt.label }}
              </el-checkbox>
            </el-checkbox-group>

            <!-- Autocomplete -->
            <el-autocomplete
              v-else-if="field.type === 'autocomplete'"
              v-model="localFormData[field.key]"
              :fetch-suggestions="getFetchSuggestions(field)"
              :placeholder="field.placeholder ?? 'Rechercher...'"
              :clearable="!disabled"
              style="width: 100%"
            />

            <!-- Help text -->
            <span
              v-if="field.helpText"
              class="dynamic-form__help"
            >
              {{ field.helpText }}
            </span>
          </el-form-item>
        </el-col>
      </template>
    </el-row>
  </el-form>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { ElForm } from 'element-plus'
import type { FormFieldSchema, FormFieldValidator } from '@/composables/useClinicalDocuments'
import RichTextEditor from '@/components/patients/RichTextEditor.vue'
import { isRichTextEmpty } from '@/utils/rich-text'

/** Callback of async-validator rules (element-plus form validation). */
type ValidatorCallback = (error?: Error) => void

const props = defineProps<{
  schema: FormFieldSchema[]
  modelValue: Record<string, any>
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, any>]
}>()

const formRef = ref<InstanceType<typeof ElForm> | null>(null)

// Local copy to avoid direct mutation of prop
const localFormData = ref<Record<string, any>>({ ...props.modelValue })

watch(
  () => props.modelValue,
  (val) => {
    // Shallow merge: only update keys that changed, preserving local edits
    const needsUpdate = Object.keys(val).some(k => localFormData.value[k] !== val[k])
    if (needsUpdate) {
      localFormData.value = { ...val }
    }
  },
  { deep: true },
)

watch(
  localFormData,
  (val) => {
    emit('update:modelValue', { ...val })
  },
  { deep: true },
)

// Filter schema: only show fields whose conditions are met
const visibleSchema = computed(() => {
  return props.schema.filter((field) => {
    if (!field.conditional) return true
    const condVal = localFormData.value[field.conditional.field]
    return condVal === field.conditional.value
  })
})

function buildRules(field: FormFieldSchema): any[] {
  const rules: any[] = []
  if (field.required) {
    if (field.type === 'textarea') {
      rules.push({
        required: true,
        message: `${field.label} est requis`,
        trigger: 'blur',
        validator: (_rule: any, value: any, callback: ValidatorCallback) => {
          if (isRichTextEmpty(value)) callback(new Error(`${field.label} est requis`))
          else callback()
        },
      })
    } else {
      rules.push({ required: true, message: `${field.label} est requis`, trigger: 'blur' })
    }
  }
  if (field.validators) {
    for (const v of field.validators) {
      const rule = buildValidatorRule(v, field)
      if (rule) rules.push(rule)
    }
  }
  return rules
}

function buildValidatorRule(v: FormFieldValidator, _field: FormFieldSchema): any {
  switch (v.type) {
    case 'email':
      return { type: 'email', message: 'Email invalide', trigger: 'blur' }
    case 'minLength':
      return { min: v.params, message: `Minimum ${v.params} caractères`, trigger: 'blur' }
    case 'maxLength':
      return { max: v.params, message: `Maximum ${v.params} caractères`, trigger: 'blur' }
    case 'pattern':
      return { pattern: new RegExp(v.params), message: 'Format invalide', trigger: 'blur' }
    case 'custom':
      return {
        validator: (_rule: any, value: any, callback: ValidatorCallback) => {
          if (typeof v.params === 'function') {
            const result = v.params(value)
            if (result !== true) {
              callback(new Error(result || 'Valeur invalide'))
            } else {
              callback()
            }
          } else {
            callback()
          }
        },
        trigger: 'blur',
      }
    default:
      return null
  }
}

function getNumberValidatorParam(field: FormFieldSchema, paramType: 'min' | 'max'): number | undefined {
  if (!field.validators) return undefined
  const v = field.validators.find(v => v.type === paramType)
  return v?.params !== undefined ? Number(v.params) : undefined
}

function handleAutocomplete(
  field: FormFieldSchema,
  query: string,
  cb: (results: any[]) => void,
) {
  const options = field.options ?? []
  if (!query) {
    cb(options.slice(0, 10))
    return
  }
  const filtered = options.filter(
    o => o.label.toLowerCase().includes(query.toLowerCase()),
  )
  cb(filtered)
}

function getFetchSuggestions(field: FormFieldSchema) {
  return (query: string, cb: (results: any[]) => void) => {
    handleAutocomplete(field, query, cb)
  }
}

function validate(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!formRef.value) {
      resolve(true)
      return
    }
    formRef.value.validate((valid: boolean) => {
      resolve(valid)
    })
  })
}

function resetValidation() {
  formRef.value?.clearValidate()
}

defineExpose({ validate, resetValidation, formRef })
</script>

<style scoped lang="scss">
.dynamic-form {
  width: 100%;
}

.dynamic-form__col {
  margin-bottom: 0;
}

.dynamic-form__number {
  width: 100%;

  :deep(.el-input-number__decrease),
  :deep(.el-input-number__increase) {
    display: none;
  }
}

.dynamic-form__help {
  display: block;
  font-size: 11px;
  color: var(--el-text-color-secondary);
  margin-top: 2px;
  line-height: 1.4;
}
</style>
