<template>
  <el-dialog
    v-model="visible"
    :title="editingId ? 'Modifier le mécanisme' : 'Nouveau mécanisme de contact'"
    width="520px"
    :close-on-click-modal="false"
    @closed="onClosed"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="140px"
      label-position="top"
    >
      <el-form-item label="Valeur technique" prop="value">
        <el-input
          v-model="form.value"
          placeholder="Ex: centre_sante"
          maxlength="50"
          :disabled="!!editingId"
        />
      </el-form-item>
      <el-form-item label="Libellé affiché" prop="label">
        <el-input v-model="form.label" placeholder="Ex: Centre de santé" maxlength="200" />
      </el-form-item>
      <el-form-item label="Ordre" prop="sort_order">
        <el-input-number v-model="form.sort_order" :min="0" style="width: 100%" />
      </el-form-item>
      <el-form-item label="Actif">
        <el-switch v-model="form.is_active" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">Annuler</el-button>
      <el-button type="primary" :loading="submitting" @click="submit">Confirmer</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance } from 'element-plus'
import { useContactOrigins, type ContactOriginDto } from '@/composables/useContactOrigins'

const emit = defineEmits<{
  saved: []
}>()

const { createOrigin, updateOrigin } = useContactOrigins()

const visible = ref(false)
const submitting = ref(false)
const editingId = ref<number | null>(null)
const formRef = ref<FormInstance>()

const form = reactive({
  value: '',
  label: '',
  sort_order: 0,
  is_active: true,
})

const rules = {
  value: [
    { required: true, message: 'La valeur technique est requise', trigger: 'blur' },
    {
      pattern: /^[a-z_]+$/,
      message: 'Uniquement lettres minuscules et underscores',
      trigger: 'blur',
    },
    { max: 50, message: 'Maximum 50 caractères', trigger: 'blur' },
  ],
  label: [
    { required: true, message: 'Le libellé est requis', trigger: 'blur' },
    { max: 200, message: 'Maximum 200 caractères', trigger: 'blur' },
  ],
  sort_order: [
    { required: true, message: "L'ordre est requis", trigger: 'blur' },
  ],
}

function open(origin?: ContactOriginDto) {
  editingId.value = null
  form.value = ''
  form.label = ''
  form.sort_order = 0
  form.is_active = true
  if (origin) {
    editingId.value = origin.id!
    form.value = origin.value
    form.label = origin.label
    form.sort_order = origin.sort_order
    form.is_active = origin.is_active
  }
  visible.value = true
}

function close() {
  visible.value = false
}

async function submit() {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  submitting.value = true
  try {
    let result: ContactOriginDto | null = null
    if (editingId.value) {
      result = await updateOrigin(editingId.value, {
        label: form.label,
        sort_order: form.sort_order,
        is_active: form.is_active,
      })
      if (result) ElMessage.success('Mécanisme modifié')
    } else {
      result = await createOrigin({
        value: form.value,
        label: form.label,
        sort_order: form.sort_order,
        is_active: form.is_active,
      })
      if (result) ElMessage.success('Mécanisme créé')
    }
    if (result) {
      emit('saved')
      visible.value = false
    }
  } catch {
    ElMessage({ type: 'error', message: "Erreur lors de l'enregistrement" })
  } finally {
    submitting.value = false
  }
}

function onClosed() {
  editingId.value = null
  formRef.value?.resetFields()
}

defineExpose({ open, close })
</script>
