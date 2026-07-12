<template>
  <el-dialog
    v-model="visible"
    :title="editingId ? 'Modifier l\'unité de soins' : 'Nouvelle unité de soins'"
    width="560px"
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
      <el-form-item label="Service" prop="service_id">
        <el-select
          v-model="form.service_id"
          filterable
          placeholder="Sélectionnez le service"
          style="width: 100%"
        >
          <el-option
            v-for="svc in services"
            :key="svc.id"
            :label="svc.name"
            :value="svc.id!"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="Code" prop="code">
        <el-input v-model="form.code" placeholder="Ex: ENDO.HOSP" maxlength="30" />
      </el-form-item>

      <el-form-item label="Nom" prop="name">
        <el-input v-model="form.name" placeholder="Ex: Hospitalisation" maxlength="100" />
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
import { useCareUnits, type CareUnitDto } from '@/composables/useCareUnits'
import { useMedicalServices } from '@/composables/useMedicalServices'

const emit = defineEmits<{
  saved: []
}>()

const { createUnit, updateUnit } = useCareUnits()
const { services } = useMedicalServices()

const visible = ref(false)
const submitting = ref(false)
const editingId = ref<number | null>(null)
const formRef = ref<FormInstance>()

const form = reactive({
  service_id: null as number | null,
  name: '',
  code: '',
  description: '',
})

const rules = {
  service_id: [
    { required: true, message: 'Le service est requis', trigger: 'change' },
  ],
  name: [
    { required: true, message: 'Le nom est requis', trigger: 'blur' },
    { max: 100, message: 'Maximum 100 caractères', trigger: 'blur' },
  ],
  code: [
    { max: 30, message: 'Maximum 30 caractères', trigger: 'blur' },
    {
      pattern: /^[A-Z]+(?:\.[A-Z]+)*$/,
      message: 'Format: lettres majuscules séparées par des points (ex: ENDO.HOSP)',
      trigger: 'blur',
    },
  ],
}

function open(unit?: CareUnitDto) {
  editingId.value = null
  form.service_id = null
  form.name = ''
  form.code = ''
  form.description = ''
  if (unit) {
    editingId.value = unit.id!
    form.service_id = unit.service_id
    form.name = unit.name
    form.code = unit.code || ''
    form.description = unit.description || ''
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
    let result: CareUnitDto | null = null
    if (editingId.value) {
      result = await updateUnit(editingId.value, {
        service_id: form.service_id!,
        name: form.name,
        code: form.code || null,
        description: form.description || null,
      })
      if (result) ElMessage.success('Unité de soins modifiée')
    } else {
      result = await createUnit({
        service_id: form.service_id!,
        name: form.name,
        code: form.code || null,
        description: form.description || null,
      })
      if (result) ElMessage.success('Unité de soins créée')
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
