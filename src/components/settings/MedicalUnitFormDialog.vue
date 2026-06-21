<template>
  <el-dialog
    v-model="visible"
    :title="editingId ? 'Modifier l\'unité' : 'Nouvelle unité médicale'"
    width="520px"
    :close-on-click-modal="false"
    @closed="onClosed"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="120px"
      label-position="top"
    >
      <el-form-item label="Code" prop="code">
        <el-input v-model="form.code" placeholder="Ex: mg" maxlength="20" />
      </el-form-item>
      <el-form-item label="Nom" prop="name">
        <el-input v-model="form.name" placeholder="Ex: Milligramme" maxlength="100" />
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
import { useMedicalUnits, type MedicalUnitDto } from '@/composables/useMedicalUnits'

const emit = defineEmits<{
  saved: []
}>()

const { createUnit, updateUnit } = useMedicalUnits()

const visible = ref(false)
const submitting = ref(false)
const editingId = ref<number | null>(null)
const formRef = ref<FormInstance>()

const form = reactive({
  code: '',
  name: '',
})

const rules = {
  code: [
    { required: true, message: 'Le code est requis', trigger: 'blur' },
    { min: 2, message: 'Le code doit contenir au moins 2 caractères', trigger: 'blur' },
    { max: 20, message: 'Maximum 20 caractères', trigger: 'blur' },
  ],
  name: [
    { required: true, message: 'Le nom est requis', trigger: 'blur' },
    { max: 100, message: 'Maximum 100 caractères', trigger: 'blur' },
  ],
}

function open(unit?: MedicalUnitDto) {
  editingId.value = null
  form.code = ''
  form.name = ''
  if (unit) {
    editingId.value = unit.id!
    form.code = unit.code
    form.name = unit.name
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
    let result: MedicalUnitDto | null = null
    if (editingId.value) {
      result = await updateUnit(editingId.value, {
        code: form.code,
        name: form.name,
      })
      if (result) ElMessage.success('Unité modifiée')
    } else {
      result = await createUnit({
        code: form.code,
        name: form.name,
      })
      if (result) ElMessage.success('Unité créée')
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
