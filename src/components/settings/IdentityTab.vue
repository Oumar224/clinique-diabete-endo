<template>
  <div class="identity-tab">
    <!-- Logo -->
    <div class="identity-tab__section">
      <h2 class="identity-tab__section-title">Logo</h2>
      <div class="identity-tab__card identity-tab__logo-section">
        <div class="identity-tab__logo-preview">
          <el-avatar :size="120" shape="square">
            <img v-if="logoPreview" :src="logoPreview" alt="Logo" style="width: 100%; height: 100%; object-fit: contain;" />
            <span v-else style="font-size: 32px; color: var(--cd-gray-400)">CDE</span>
          </el-avatar>
        </div>
        <div class="identity-tab__logo-actions">
          <el-button type="primary" @click="triggerFileInput">Choisir</el-button>
          <el-button :disabled="!logoPreview" @click="removeLogo">Supprimer</el-button>
          <input
            ref="fileInputRef"
            type="file"
            accept="image/png,image/jpeg"
            style="display: none"
            @change="onFileSelected"
          />
          <p class="identity-tab__logo-hint">Formats: PNG, JPEG. Max: 2 Mo</p>
        </div>
      </div>
    </div>

    <!-- Informations -->
    <div class="identity-tab__section">
      <h2 class="identity-tab__section-title">Informations</h2>
      <div class="identity-tab__card">
        <el-form
          ref="formRef"
          :model="info"
          label-position="top"
          :rules="rules"
        >
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="Nom *" prop="name">
                <el-input v-model="info.name" placeholder="Nom de l'établissement" maxlength="100" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="Adresse" prop="address">
                <el-input v-model="info.address" placeholder="Adresse" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="Téléphone" prop="phone">
                <el-input v-model="info.phone" placeholder="Téléphone" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="Email *" prop="email">
                <el-input v-model="info.email" placeholder="Email" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="Ville / Pays" prop="city">
                <el-input v-model="info.city" placeholder="Ville / Pays" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="N° d'agrément" prop="regNumber">
                <el-input v-model="info.regNumber" placeholder="Numéro d'agrément" />
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
      </div>
    </div>

    <!-- Actions -->
    <div class="identity-tab__actions">
      <el-button type="primary" :icon="Plus" :loading="saving" @click="handleSave">
        Enregistrer
      </el-button>
      <el-button :disabled="!logoPreview" @click="handleApplySystemIcon">
        Appliquer comme icône système
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { useHospitalInfo } from '@/composables/useHospitalInfo'
import { ipcInvoke } from '@/utils/ipc'

const { info, loadInfo, saveInfo, saveLogo } = useHospitalInfo()

const formRef = ref<FormInstance>()
const fileInputRef = ref<HTMLInputElement>()
const saving = ref(false)
const logoPreview = ref<string | null>(null)
const pendingLogo = ref<string | null>(null)

const rules: FormRules = {
  name: [
    { required: true, message: 'Le nom est requis', trigger: 'blur' },
    { max: 100, message: 'Maximum 100 caractères', trigger: 'blur' },
  ],
  email: [
    { required: true, message: 'L\'email est requis', trigger: 'blur' },
    { type: 'email', message: 'Format email invalide', trigger: 'blur' },
  ],
}

onMounted(async () => {
  await loadInfo()
  await loadExistingLogo()
})

async function loadExistingLogo() {
  try {
    const data = await ipcInvoke<string | null>('identity:get-logo')
    if (data) {
      logoPreview.value = data
    }
  } catch {}
}

function triggerFileInput() {
  fileInputRef.value?.click()
}

function onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (file.size > 2 * 1024 * 1024) {
    ElMessage.error('Le fichier ne doit pas dépasser 2 Mo')
    input.value = ''
    return
  }

  const reader = new FileReader()
  reader.onload = () => {
    logoPreview.value = reader.result as string
    pendingLogo.value = reader.result as string
  }
  reader.readAsDataURL(file)
}

function removeLogo() {
  logoPreview.value = null
  pendingLogo.value = null
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

async function handleSave() {
  saving.value = true
  try {
    const infoResult = await saveInfo(formRef.value)
    if (!infoResult.success) {
      ElMessage.error(infoResult.error || 'Erreur lors de la sauvegarde des informations')
      saving.value = false
      return
    }

    if (pendingLogo.value) {
      const logoResult = await saveLogo(pendingLogo.value)
      if (!logoResult.success) {
        ElMessage.warning('Identité enregistrée, mais le logo n\'a pas pu être sauvegardé')
        saving.value = false
        return
      }
      pendingLogo.value = null
    }

    ElMessage.success('Identité enregistrée')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement'
    ElMessage.error(message)
  }
  saving.value = false
}

async function handleApplySystemIcon() {
  if (!logoPreview.value) return

  try {
    await ElMessageBox.confirm(
      'Cela remplacera les fichiers source de l\'application par le logo actuel. ' +
      'L\'icône sera définitivement appliquée après rebuild. Continuer ?',
      'Appliquer comme icône système',
      { type: 'warning', confirmButtonText: 'Appliquer', cancelButtonText: 'Annuler' }
    )

    if (pendingLogo.value) {
      await saveLogo(pendingLogo.value)
      pendingLogo.value = null
    }

    ElMessage.success("L'icône sera définitivement appliquée après rebuild. Lancez npx electron-builder.")
  } catch {}
}
</script>

<style scoped>
.identity-tab__section {
  margin-bottom: 28px;
}

.identity-tab__section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--cd-gray-900);
  margin-bottom: 12px;
}

.identity-tab__card {
  background: var(--cd-white);
  border-radius: 10px;
  border: 1px solid var(--cd-gray-200);
  padding: 20px;
}

.identity-tab__logo-section {
  display: flex;
  align-items: center;
  gap: 24px;
}

.identity-tab__logo-preview {
  flex-shrink: 0;
}

.identity-tab__logo-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
}

.identity-tab__logo-hint {
  font-size: 12px;
  color: var(--cd-gray-400);
  margin: 0;
}

.identity-tab__actions {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}
</style>
