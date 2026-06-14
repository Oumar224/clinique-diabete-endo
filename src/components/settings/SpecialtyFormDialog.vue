<template>
  <el-dialog
    v-model="visible"
    :title="editingId ? 'Modifier la spécialité' : 'Nouvelle spécialité'"
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
          placeholder="Ex: CARDIO"
          maxlength="20"
          style="text-transform: uppercase"
        />
      </el-form-item>
      <el-form-item label="Nom" prop="name">
        <el-input v-model="form.name" placeholder="Ex: Cardiologie" maxlength="100" />
      </el-form-item>
      <el-form-item label="Préfixe titre" prop="title_prefix">
        <el-select v-model="form.title_prefix" placeholder="Sélectionner" style="width: 100%">
          <el-option label="Dr" value="Dr" />
          <el-option label="Pr" value="Pr" />
          <el-option label="Mme" value="Mme" />
          <el-option label="M." value="M." />
          <el-option label="Ph" value="Ph" />
        </el-select>
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
import { useSpecialties, type SpecialtyDto } from '@/composables/useSpecialties'

const emit = defineEmits<{
  saved: []
}>()

const { createSpecialty, updateSpecialty } = useSpecialties()

const visible = ref(false)
const submitting = ref(false)
const editingId = ref<number | null>(null)
const formRef = ref<FormInstance>()

const form = reactive({
  code: '',
  name: '',
  title_prefix: 'Dr',
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
  title_prefix: [
    { required: true, message: 'Le préfixe est requis', trigger: 'change' },
  ],
}

function open(specialty?: SpecialtyDto) {
  editingId.value = null
  form.code = ''
  form.name = ''
  form.title_prefix = 'Dr'
  if (specialty) {
    editingId.value = specialty.id!
    form.code = specialty.code
    form.name = specialty.name
    form.title_prefix = specialty.title_prefix
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
    let result: SpecialtyDto | null = null
    if (editingId.value) {
      result = await updateSpecialty(editingId.value, {
        code: form.code.toUpperCase(),
        name: form.name,
        title_prefix: form.title_prefix,
      })
      if (result) ElMessage.success('Spécialité modifiée')
    } else {
      result = await createSpecialty({
        code: form.code.toUpperCase(),
        name: form.name,
        title_prefix: form.title_prefix,
      })
      if (result) ElMessage.success('Spécialité créée')
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
