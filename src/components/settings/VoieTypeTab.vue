<template>
  <div class="vtt">
    <el-alert v-if="error" type="error" :title="error" show-icon closable style="margin-bottom: 12px" />

    <div class="vtt__toolbar">
      <el-input
        v-model="search"
        placeholder="Rechercher..."
        clearable
        style="width: 260px"
        @input="onSearch"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-button type="primary" :icon="Plus" @click="openCreate">Nouvelle voie</el-button>
    </div>

    <el-table
      v-loading="loading"
      :data="filteredTypes"
      style="width: 100%"
      border
      row-key="id"
    >
      <template #empty>
        <el-empty description="Aucune voie d'administration" />
      </template>
      <el-table-column prop="label" label="Voie d'administration" min-width="300" />
      <el-table-column label="Actions" width="120" align="center">
        <template #default="{ row }">
          <el-button text type="danger" :icon="Delete" size="small" @click="handleDelete(row)" />
        </template>
      </el-table-column>
    </el-table>

    <!-- Create dialog -->
    <el-dialog v-model="showDialog" title="Nouvelle voie d'administration" width="420px" :close-on-click-modal="false" @closed="onDialogClosed">
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <el-form-item label="Libellé" prop="label">
          <el-input v-model="form.label" placeholder="Ex: IV, PO, SC, IM, SL..." />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDialog = false">Annuler</el-button>
        <el-button type="primary" :loading="submitting" @click="submit">Confirmer</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { Plus, Search, Delete } from '@element-plus/icons-vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import type { FormInstance } from 'element-plus'
import { useVoieTypes, type VoieTypeDto } from '@/composables/useVoieTypes'

const {
  types, loading, error, fetchTypes, createType, deleteType,
} = useVoieTypes()

const search = ref('')
const showDialog = ref(false)
const submitting = ref(false)
const formRef = ref<FormInstance>()
const form = reactive({ label: '' })

const rules = {
  label: [
    { required: true, message: 'Le libellé est requis', trigger: 'blur' },
    { max: 100, message: 'Maximum 100 caractères', trigger: 'blur' },
  ],
}

onMounted(async () => {
  await fetchTypes()
})

const filteredTypes = computed(() => {
  if (!search.value) return types.value
  const q = search.value.toLowerCase()
  return types.value.filter(t => t.label.toLowerCase().includes(q))
})

function onSearch() {
  // handled by computed
}

function openCreate() {
  form.label = ''
  showDialog.value = true
}

async function submit() {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  submitting.value = true
  try {
    const result = await createType({ label: form.label })
    if (result) {
      ElMessage.success('Voie d\'administration créée')
      showDialog.value = false
    }
  } catch {
    ElMessage.error("Erreur lors de l'enregistrement")
  } finally {
    submitting.value = false
  }
}

async function handleDelete(row: VoieTypeDto) {
  if (row.id == null) {
    ElMessage.error('Impossible de supprimer : identifiant manquant')
    return
  }
  try {
    await ElMessageBox.confirm(
      `Supprimer la voie « ${row.label} » ?`,
      'Confirmation',
      { type: 'warning', confirmButtonText: 'Supprimer', cancelButtonText: 'Annuler' },
    )
    const ok = await deleteType(row.id)
    if (ok) ElMessage.success('Voie supprimée')
  } catch {
    // cancelled or error
  }
}

function onDialogClosed() {
  formRef.value?.resetFields()
}
</script>

<style scoped>
.vtt__toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}
</style>
