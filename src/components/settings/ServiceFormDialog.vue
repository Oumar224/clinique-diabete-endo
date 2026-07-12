<template>
  <el-dialog
    v-model="visible"
    :title="editingId ? 'Modifier le service' : 'Nouveau service'"
    width="600px"
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
      <el-form-item label="Nom" prop="name">
        <el-input v-model="form.name" placeholder="Ex: Consultation générale" maxlength="100" />
      </el-form-item>

      <el-form-item label="Catégorie" prop="category">
        <el-select
          v-model="form.category"
          filterable
          allow-create
          clearable
          placeholder="Sélectionner ou saisir une catégorie"
          style="width: 100%"
        >
          <el-option
            v-for="cat in categories"
            :key="cat"
            :label="cat"
            :value="cat"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="Site(s)" prop="site_ids">
        <el-select
          v-model="form.site_ids"
          multiple
          filterable
          placeholder="Sélectionner un ou plusieurs sites"
          style="width: 100%"
        >
          <el-option
            v-for="site in sites"
            :key="site.id!"
            :label="site.name"
            :value="site.id!"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="Description" prop="description">
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="2"
          placeholder="Description optionnelle"
        />
      </el-form-item>

      <el-form-item label="Durée (min)" prop="duration">
        <el-input-number
          v-model="form.duration"
          :min="5"
          :max="480"
          :step="5"
          controls-position="right"
          style="width: 100%"
        />
      </el-form-item>

      <el-form-item label="Couleur" prop="color">
        <ServiceColorPicker v-model="form.color" />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">Annuler</el-button>
      <el-button type="primary" :loading="submitting" @click="submit">Confirmer</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance } from 'element-plus'
import { useMedicalServices, SERVICE_CATEGORIES, type ServiceDto } from '@/composables/useMedicalServices'
import { useSites } from '@/composables/useSites'

interface ServiceForm {
  name: string
  category: string
  site_ids: number[]
  description: string
  duration: number
  color: string | null
}

const emit = defineEmits<{
  saved: []
}>()

const { createService, updateService } = useMedicalServices()
const { sites, fetchSites } = useSites()

const visible = ref(false)
const submitting = ref(false)
const editingId = ref<number | null>(null)
const formRef = ref<FormInstance>()

const categories = [...SERVICE_CATEGORIES]

const form = reactive<ServiceForm>({
  name: '',
  category: 'Consultation',
  site_ids: [],
  description: '',
  duration: 30,
  color: null,
})

const rules = {
  name: [
    { required: true, message: 'Le nom est requis', trigger: 'blur' },
    { max: 100, message: 'Maximum 100 caractères', trigger: 'blur' },
  ],
  duration: [
    { required: true, message: 'La durée est requise', trigger: 'blur' },
  ],
}

onMounted(async () => {
  await fetchSites()
})

function open(service?: ServiceDto | null) {
  editingId.value = null
  form.name = ''
  form.category = 'Consultation'
  form.site_ids = []
  form.description = ''
  form.duration = 30
  form.color = null

  if (service) {
    editingId.value = service.id!
    form.name = service.name
    form.category = service.category || 'Consultation'
    form.site_ids = service.site_ids ?? []
    form.description = service.description || ''
    form.duration = service.duration
    form.color = service.color || null
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
    const payload = {
      name: form.name,
      category: form.category,
      site_ids: form.site_ids,
      description: form.description || null,
      duration: form.duration,
      color: form.color,
    }

    let result: ServiceDto | null = null
    if (editingId.value) {
      result = await updateService(editingId.value, payload)
      if (result) ElMessage.success('Service modifié')
    } else {
      result = await createService(payload)
      if (result) ElMessage.success('Service créé')
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
