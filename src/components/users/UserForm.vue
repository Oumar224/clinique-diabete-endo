<template>
  <el-dialog v-model="dialogVisible" :title="title" width="480px">
    <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="Nom" prop="nom">
            <el-input v-model="form.nom" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="Prénom" prop="prenom">
            <el-input v-model="form.prenom" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-form-item label="Email" prop="email">
        <el-input v-model="form.email" />
      </el-form-item>
      <el-form-item label="Rôle" prop="role">
        <el-select v-model="form.role" style="width: 100%">
          <el-option label="Médecin" value="MEDECIN" />
          <el-option label="Secrétaire" value="SECRETAIRE" />
          <el-option label="Pharmacien" value="PHARMACIEN" />
          <el-option label="Comptable" value="COMPTABLE" />
          <el-option label="Administrateur" value="ADMIN" />
        </el-select>
      </el-form-item>
      <el-form-item label="Service">
        <el-input v-model="form.service" placeholder="Endocrinologie, Accueil..." />
      </el-form-item>
      <el-form-item label="Mot de passe provisoire" prop="password">
        <el-input v-model="form.password" type="password" show-password />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogVisible = false">Annuler</el-button>
      <el-button type="primary" @click="onSubmit(form as UserDto)">{{ form.id ? 'Modifier' : 'Créer' }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import type { UserDto } from '@/composables/useUsers'

defineProps<{ title: string }>()
const dialogVisible = ref(false)
const formRef = ref<FormInstance>()
const form = reactive<Partial<UserDto>>({
  nom: '',
  prenom: '',
  email: '',
  role: 'MEDECIN',
  service: '',
  password: 'changeme',
})

const rules: FormRules = {
  nom: [{ required: true, message: 'Requis', trigger: 'blur' }],
  prenom: [{ required: true, message: 'Requis', trigger: 'blur' }],
  email: [
    { required: true, message: 'Requis', trigger: 'blur' },
    { type: 'email', message: 'Email invalide', trigger: 'blur' },
  ],
  role: [{ required: true, message: 'Requis', trigger: 'change' }],
  password: [{ min: 4, message: 'Minimum 4 caractères', trigger: 'blur' }],
}

function open(user?: UserDto) {
  dialogVisible.value = true
  if (user) {
    form.id = user.id
    form.nom = user.nom
    form.prenom = user.prenom
    form.email = user.email
    form.role = user.role
    form.service = user.service
    form.password = user.password
  }
}

function close() {
  dialogVisible.value = false
}

function onSubmit(formData: UserDto) {
  emits('submitAction', formRef.value, formData)
}

const emits = defineEmits<{
  (e: 'submitAction', formRef: FormInstance | undefined, form: UserDto): void
}>()

defineExpose({ open, close })
</script>
