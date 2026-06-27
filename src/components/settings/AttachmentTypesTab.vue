<template>
  <div class="attachment-types-tab">
    <div class="attachment-types-tab__section">
      <h2 class="attachment-types-tab__section-title">Types de pièces jointes</h2>

      <div class="attachment-types-tab__actions">
        <el-button type="primary" :icon="Plus" @click="openAddDialog">Ajouter</el-button>
      </div>

      <div v-if="loading" class="attachment-types-tab__loading">Chargement...</div>

      <el-table
        v-else
        :data="types"
        style="width: 100%"
        :header-cell-style="{ background: '#0E5C5B', color: '#ffffff', fontWeight: 600 }"
        max-height="500"
      >
        <el-table-column prop="name" label="Nom" min-width="200" />
        <el-table-column label="Actions" width="160" align="center">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="openEditDialog(row)">Modifier</el-button>
            <el-button text type="danger" size="small" @click="handleDelete(row)">Supprimer</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="!loading && types.length === 0" description="Aucun type de pièce jointe" />
    </div>

    <!-- Add / Edit Dialog -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingType ? 'Modifier le type' : 'Ajouter un type'"
      width="400px"
      :close-on-click-modal="false"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="Nom" prop="name">
          <el-input v-model="form.name" placeholder="Nom du type" maxlength="100" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">Annuler</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">Enregistrer</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { ipcInvoke } from '@/utils/ipc'

interface AttachmentType {
  id: number
  name: string
}

const types = ref<AttachmentType[]>([])
const loading = ref(true)
const saving = ref(false)
const dialogVisible = ref(false)
const editingType = ref<AttachmentType | null>(null)
const formRef = ref<FormInstance>()

const form = reactive({
  name: '',
})

const rules: FormRules = {
  name: [
    { required: true, message: 'Le nom est requis', trigger: 'blur' },
    { max: 100, message: 'Maximum 100 caractères', trigger: 'blur' },
  ],
}

onMounted(async () => {
  await loadTypes()
})

async function loadTypes() {
  loading.value = true
  try {
    types.value = await ipcInvoke<AttachmentType[]>('attachment-types:list')
  } catch {
    types.value = []
  } finally {
    loading.value = false
  }
}

function openAddDialog() {
  editingType.value = null
  form.name = ''
  dialogVisible.value = true
}

function openEditDialog(type: AttachmentType) {
  editingType.value = type
  form.name = type.name
  dialogVisible.value = true
}

async function handleSave() {
  if (!formRef.value) return
  await formRef.value.validate(async (valid: boolean) => {
    if (!valid) return
    saving.value = true
    try {
      if (editingType.value) {
        await ipcInvoke('attachment-types:update', { id: editingType.value.id, name: form.name.trim() })
        ElMessage.success('Type mis à jour')
      } else {
        await ipcInvoke('attachment-types:create', { name: form.name.trim() })
        ElMessage.success('Type ajouté')
      }
      dialogVisible.value = false
      await loadTypes()
    } catch (e) {
      ElMessage.error(`Erreur: ${(e as Error).message}`)
    } finally {
      saving.value = false
    }
  })
}

async function handleDelete(type: AttachmentType) {
  try {
    await ElMessageBox.confirm(
      `Supprimer le type "${type.name}" ?`,
      'Confirmation',
      { type: 'warning', confirmButtonText: 'Supprimer', cancelButtonText: 'Annuler' },
    )
    await ipcInvoke('attachment-types:delete', { id: type.id })
    ElMessage.success('Type supprimé')
    await loadTypes()
  } catch {
    // cancelled or error
  }
}
</script>

<style scoped>
.attachment-types-tab__section {
  margin-bottom: 28px;
}

.attachment-types-tab__section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--cd-gray-900);
  margin-bottom: 12px;
}

.attachment-types-tab__actions {
  margin-bottom: 16px;
}

.attachment-types-tab__loading {
  font-size: 13px;
  color: #999;
  padding: 24px 0;
  text-align: center;
}
</style>
