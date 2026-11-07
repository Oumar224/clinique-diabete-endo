<template>
  <div class="attachment-types-tab cde">
    <header class="cde-page-head">
      <div>
        <h1 class="cde-page-title">
          Types de pièces jointes
        </h1>
        <p class="cde-page-sub">
          Catégories disponibles pour les documents patients
        </p>
      </div>
    </header>

    <div class="cde-toolbar">
      <div class="cde-filters">
        <span class="cde-toolbar__meta">{{ types.length }} type(s)</span>
      </div>
      <div class="cde-toolbar__actions">
        <el-button type="primary" size="small" :icon="Plus" @click="openAddDialog">
          Ajouter
        </el-button>
      </div>
    </div>

    <div v-if="loading" class="cde-muted attachment-types-tab__loading">
      Chargement…
    </div>

    <div v-else class="cde-table-card">
      <el-table
        :data="types"
        style="width: 100%"
        size="small"
        empty-text=""
      >
        <el-table-column prop="name" label="Nom" min-width="200" />
        <el-table-column label="Actions" width="160" align="center">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="openEditDialog(row)">Modifier</el-button>
            <el-button text type="danger" size="small" @click="handleDelete(row)">Supprimer</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div v-if="!loading && types.length === 0" class="cde-empty">
      Aucun type de pièce jointe.
    </div>

    <div class="cde-footer">
      <span class="cde-muted">{{ types.length }} type(s)</span>
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
