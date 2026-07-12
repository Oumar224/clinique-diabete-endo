<template>
  <el-dialog
    v-model="visible"
    :title="editingId ? 'Modifier le stockage' : 'Nouveau stockage'"
    width="480px"
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
        <el-input v-model="form.code" placeholder="Ex: stk_01" maxlength="50" />
      </el-form-item>
      <el-form-item label="Nom" prop="name">
        <el-input v-model="form.name" placeholder="Ex: Réfrigérateur (2°C - 8°C)" maxlength="200" />
      </el-form-item>
      <el-form-item label="Description" prop="description">
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="2"
          placeholder="Description optionnelle"
        />
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
import { useConservateurs, type StockageDto } from '@/composables/useConservateurs'

const emit = defineEmits<{
  saved: []
}>()

const { createStockage, updateStockage, stockages } = useConservateurs()

const visible = ref(false)
const submitting = ref(false)
const editingId = ref<number | null>(null)
const formRef = ref<FormInstance>()

const form = reactive({
  code: '',
  name: '',
  description: '',
})

const rules = {
  code: [
    { required: true, message: 'Le code est requis', trigger: 'blur' },
    { max: 50, message: 'Maximum 50 caractères', trigger: 'blur' },
  ],
  name: [
    { required: true, message: 'Le nom est requis', trigger: 'blur' },
    { max: 200, message: 'Maximum 200 caractères', trigger: 'blur' },
  ],
}

function open(stockage?: StockageDto) {
  editingId.value = null
  form.code = ''
  form.name = ''
  form.description = ''
  if (stockage) {
    editingId.value = stockage.id!
    form.code = stockage.code
    form.name = stockage.name
    form.description = stockage.description || ''
  }
  visible.value = true
}

function close() {
  visible.value = false
}

function nextSortOrder(): number {
  if (!stockages.value.length) return 1
  return Math.max(...stockages.value.map(s => s.sort_order)) + 1
}

async function submit() {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  submitting.value = true
  try {
    let result: StockageDto | null = null
    if (editingId.value) {
      result = await updateStockage(editingId.value, {
        code: form.code,
        name: form.name,
        description: form.description || null,
      })
      if (result) ElMessage.success('Stockage modifié')
    } else {
      result = await createStockage({
        code: form.code,
        name: form.name,
        description: form.description || null,
        sort_order: nextSortOrder(),
      })
      if (result) ElMessage.success('Stockage créé')
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
