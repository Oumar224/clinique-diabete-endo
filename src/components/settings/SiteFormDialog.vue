<template>
  <el-dialog
    v-model="visible"
    :title="editingId ? 'Modifier le site' : 'Nouveau site'"
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
      <el-form-item label="Nom" prop="name">
        <el-input v-model="form.name" placeholder="Ex: Clinique principale" maxlength="150" />
      </el-form-item>
      <el-form-item label="Adresse" prop="address">
        <el-input
          v-model="form.address"
          type="textarea"
          :rows="2"
          placeholder="Adresse complète"
        />
      </el-form-item>
      <el-form-item label="Téléphone" prop="phone">
        <el-input
          v-model="form.phone"
          placeholder="+221 77 123 45 67"
          maxlength="20"
        />
      </el-form-item>
      <el-form-item label="Email" prop="email">
        <el-input v-model="form.email" placeholder="contact@clinique.com" maxlength="150" />
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
import { useSites, type SiteDto } from '@/composables/useSites'

const emit = defineEmits<{
  saved: []
}>()

const { createSite, updateSite } = useSites()

const visible = ref(false)
const submitting = ref(false)
const editingId = ref<number | null>(null)
const formRef = ref<FormInstance>()

const form = reactive({
  name: '',
  address: '',
  phone: '',
  email: '',
})

const rules = {
  name: [
    { required: true, message: 'Le nom est requis', trigger: 'blur' },
    { max: 150, message: 'Maximum 150 caractères', trigger: 'blur' },
  ],
  email: [
    { type: 'email', message: 'Format d\'email invalide', trigger: 'blur' },
  ],
}

function open(site?: SiteDto) {
  editingId.value = null
  form.name = ''
  form.address = ''
  form.phone = ''
  form.email = ''
  if (site) {
    editingId.value = site.id!
    form.name = site.name
    form.address = site.address || ''
    form.phone = site.phone || ''
    form.email = site.email || ''
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
    let result: SiteDto | null = null
    if (editingId.value) {
      result = await updateSite(editingId.value, {
        name: form.name,
        address: form.address || null,
        phone: form.phone || null,
        email: form.email || null,
      })
      if (result) ElMessage.success('Site modifié')
    } else {
      result = await createSite({
        name: form.name,
        address: form.address || null,
        phone: form.phone || null,
        email: form.email || null,
      })
      if (result) ElMessage.success('Site créé')
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
