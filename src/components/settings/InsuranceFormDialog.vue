<template>
  <el-dialog
    v-model="visible"
    :title="editingId ? `Modifier l'assurance` : 'Nouvelle assurance'"
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
      <el-form-item label="Code" prop="code">
        <el-input
          v-model="form.code"
          placeholder="Ex: CNSS"
          maxlength="30"
          :disabled="!!editingId"
        />
      </el-form-item>
      <el-form-item label="Nom" prop="name">
        <el-input v-model="form.name" placeholder="Ex: Caisse Nationale de Sécurité Sociale" maxlength="200" />
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
import { useInsurances, type InsuranceDto } from '@/composables/useInsurances'

const emit = defineEmits<{
  saved: []
}>()

const { createInsurance, updateInsurance } = useInsurances()

const visible = ref(false)
const submitting = ref(false)
const editingId = ref<number | null>(null)
const formRef = ref<FormInstance>()

const form = reactive({
  code: '',
  name: '',
  is_active: true,
})

const rules = {
  code: [
    { required: true, message: 'Le code est requis', trigger: 'blur' },
    {
      pattern: /^[A-Z0-9_-]+$/,
      message: 'Uniquement lettres majuscules, chiffres, tirets et underscores',
      trigger: 'blur',
    },
    { max: 30, message: 'Maximum 30 caractères', trigger: 'blur' },
  ],
  name: [
    { required: true, message: 'Le nom est requis', trigger: 'blur' },
    { max: 200, message: 'Maximum 200 caractères', trigger: 'blur' },
  ],
}

function open(insurance?: InsuranceDto) {
  editingId.value = null
  form.code = ''
  form.name = ''
  form.is_active = true
  if (insurance) {
    editingId.value = insurance.id!
    form.code = insurance.code
    form.name = insurance.name
    form.is_active = insurance.is_active
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
    let result: InsuranceDto | null = null
    if (editingId.value) {
      result = await updateInsurance(editingId.value, {
        name: form.name,
        is_active: form.is_active,
      })
      if (result) ElMessage.success('Assurance modifiée')
    } else {
      result = await createInsurance({
        code: form.code,
        name: form.name,
        is_active: form.is_active,
      })
      if (result) ElMessage.success('Assurance créée')
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
