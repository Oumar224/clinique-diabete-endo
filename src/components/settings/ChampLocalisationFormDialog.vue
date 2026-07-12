<template>
  <el-dialog
    v-model="visible"
    :title="editingId ? 'Modifier le champ' : 'Nouveau champ'"
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
      <el-form-item label="Clé" prop="cle">
        <el-input v-model="form.cle" placeholder="Ex: etagere" maxlength="50" />
      </el-form-item>
      <el-form-item label="Label" prop="label">
        <el-input v-model="form.label" placeholder="Ex: Étagère" maxlength="200" />
      </el-form-item>
      <el-form-item label="Type" prop="type">
        <el-input v-model="form.type" placeholder="Ex: texte, nombre, date" maxlength="50" />
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
import { useConservateurs, type ChampLocalisationDto } from '@/composables/useConservateurs'

const emit = defineEmits<{
  saved: []
}>()

const { createChamp, updateChamp, champs } = useConservateurs()

const visible = ref(false)
const submitting = ref(false)
const editingId = ref<number | null>(null)
const formRef = ref<FormInstance>()
const stockageId = ref<number | null>(null)

const form = reactive({
  cle: '',
  label: '',
  type: 'texte',
})

const rules = {
  cle: [
    { required: true, message: 'La clé est requise', trigger: 'blur' },
    { max: 50, message: 'Maximum 50 caractères', trigger: 'blur' },
  ],
  label: [
    { required: true, message: 'Le label est requis', trigger: 'blur' },
    { max: 200, message: 'Maximum 200 caractères', trigger: 'blur' },
  ],
}

function open(champ?: ChampLocalisationDto | null, stkId?: number | null) {
  editingId.value = null
  stockageId.value = null
  form.cle = ''
  form.label = ''
  form.type = 'texte'
  if (champ) {
    editingId.value = champ.id!
    stockageId.value = champ.stockage_id
    form.cle = champ.cle
    form.label = champ.label
    form.type = champ.type || 'texte'
  } else if (stkId) {
    stockageId.value = stkId
  }
  visible.value = true
}

function close() {
  visible.value = false
}

function nextSortOrder(): number {
  if (!champs.value.length) return 1
  return Math.max(...champs.value.map(c => c.sort_order)) + 1
}

async function submit() {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  if (!stockageId.value) {
    ElMessage({ type: 'error', message: 'Stockage non sélectionné' })
    return
  }
  submitting.value = true
  try {
    let result: ChampLocalisationDto | null = null
    if (editingId.value) {
      result = await updateChamp(editingId.value, {
        stockage_id: stockageId.value,
        cle: form.cle,
        label: form.label,
        type: form.type || 'texte',
      })
      if (result) ElMessage.success('Champ modifié')
    } else {
      result = await createChamp({
        stockage_id: stockageId.value,
        cle: form.cle,
        label: form.label,
        type: form.type || 'texte',
        sort_order: nextSortOrder(),
      })
      if (result) ElMessage.success('Champ créé')
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
  stockageId.value = null
  formRef.value?.resetFields()
}

defineExpose({ open, close })
</script>
