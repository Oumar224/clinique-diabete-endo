<template>
  <div class="identity-tab cde">
    <header class="cde-page-head">
      <div>
        <h1 class="cde-page-title">
          Identité
        </h1>
        <p class="cde-page-sub">
          Logo et informations de l'établissement
        </p>
      </div>
      <div class="cde-page-actions">
        <el-button type="primary" size="small" :icon="Plus" :loading="saving" @click="handleSave">
          Enregistrer
        </el-button>
      </div>
    </header>

    <section class="cde-section">
      <div class="cde-section-head">
        <h2 class="cde-section-title">
          Logo
        </h2>
      </div>
      <div class="cde-panel">
        <div class="identity-tab__body identity-tab__logo-section">
          <div class="identity-tab__logo-preview">
            <el-avatar :size="96" shape="square" class="identity-tab__avatar">
              <img v-if="logoPreview" :src="logoPreview" alt="Logo de l'établissement" class="identity-tab__logo-img" />
              <span v-else class="identity-tab__logo-placeholder">CDE</span>
            </el-avatar>
          </div>
          <div class="identity-tab__logo-actions">
            <div class="cde-toolbar__actions">
              <el-button size="small" type="primary" @click="triggerFileInput">
                Choisir
              </el-button>
              <el-button size="small" :disabled="!logoPreview" @click="removeLogo">
                Supprimer
              </el-button>
            </div>
            <p class="identity-tab__logo-hint cde-muted">
              Formats : PNG, JPEG. Max : 2 Mo
            </p>
            <el-button
              size="small"
              text
              :disabled="!logoPreview"
              @click="handleApplySystemIcon"
            >
              Appliquer comme icône système
            </el-button>
            <input
              ref="fileInputRef"
              type="file"
              accept="image/png,image/jpeg"
              class="identity-tab__file-input"
              @change="onFileSelected"
            />
          </div>
        </div>
      </div>
    </section>

    <section class="cde-section">
      <div class="cde-section-head">
        <h2 class="cde-section-title">
          Informations
        </h2>
      </div>
      <div class="cde-panel">
        <div class="identity-tab__body">
          <el-form
            ref="formRef"
            :model="info"
            label-position="top"
            :rules="rules"
            class="identity-tab__form"
          >
            <div class="identity-tab__form-grid">
              <el-form-item label="Nom *" prop="name">
                <el-input v-model="info.name" placeholder="Nom de l'établissement" maxlength="100" />
              </el-form-item>
              <el-form-item label="Adresse" prop="address">
                <el-input v-model="info.address" placeholder="Adresse" />
              </el-form-item>
              <el-form-item label="Téléphone" prop="phone">
                <el-input v-model="info.phone" placeholder="Téléphone" />
              </el-form-item>
              <el-form-item label="Email *" prop="email">
                <el-input v-model="info.email" placeholder="Email" />
              </el-form-item>
              <el-form-item label="Ville / Pays" prop="city">
                <el-input v-model="info.city" placeholder="Ville / Pays" />
              </el-form-item>
              <el-form-item label="N° d'agrément" prop="regNumber">
                <el-input v-model="info.regNumber" placeholder="Numéro d'agrément" />
              </el-form-item>
            </div>
          </el-form>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { useHospitalInfo } from '@/composables/useHospitalInfo'
import { useLogo } from '@/composables/useLogo'
import { ipcInvoke } from '@/utils/ipc'

const { info, loadInfo, saveInfo, saveLogo } = useHospitalInfo()
const { refreshLogo } = useLogo()

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
  } catch {
    // pas de logo existant
  }
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
      await refreshLogo()
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
  } catch {
    // annulé par l'utilisateur
  }
}
</script>

<style scoped>
.identity-tab {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  max-width: 100%;
}

.identity-tab__body {
  padding: 12px;
}

.identity-tab__logo-section {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}

.identity-tab__logo-preview {
  flex-shrink: 0;
}

.identity-tab__avatar {
  background: var(--cd-gray-50);
  border: 1px solid var(--cde-border);
  border-radius: 6px;
}

.identity-tab__logo-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.identity-tab__logo-placeholder {
  font-size: 24px;
  font-weight: 600;
  color: var(--cde-muted);
}

.identity-tab__logo-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-start;
  min-width: 0;
}

.identity-tab__logo-hint {
  margin: 0;
  font-size: 11px;
}

.identity-tab__file-input {
  display: none;
}

.identity-tab__form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 12px;
}

@media (max-width: 760px) {
  .identity-tab__form-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
