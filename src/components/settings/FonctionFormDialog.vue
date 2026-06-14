<template>
  <el-dialog
    v-model="visible"
    :title="editingId ? 'Modifier la fonction' : 'Nouvelle fonction'"
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
      <el-form-item label="Nom" prop="name">
        <el-input v-model="form.name" placeholder="Ex: Endocrinologue" maxlength="100" />
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
import { useFonctions, type FonctionDto } from '@/composables/useFonctions'

const emit = defineEmits<{
  saved: []
}>()

const { createFonction, updateFonction } = useFonctions()

const visible = ref(false)
const submitting = ref(false)
const editingId = ref<number | null>(null)
const formRef = ref<FormInstance>()

const form = reactive({
  name: '',
})

const rules = {
  name: [
    { required: true, message: 'Le nom est requis', trigger: 'blur' },
    { max: 100, message: 'Maximum 100 caractères', trigger: 'blur' },
  ],
}

function open(fonction?: FonctionDto) {
  editingId.value = null
  form.name = ''
  if (fonction) {
    editingId.value = fonction.id!
    form.name = fonction.name
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
    let result: FonctionDto | null = null
    if (editingId.value) {
      result = await updateFonction(editingId.value, { name: form.name })
      if (result) ElMessage.success('Fonction modifiée')
    } else {
      result = await createFonction(form.name)
      if (result) ElMessage.success('Fonction créée')
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
