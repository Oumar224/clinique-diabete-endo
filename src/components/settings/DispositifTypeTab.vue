<template>
  <div class="dtt cde">
    <header class="cde-page-head">
      <div>
        <h1 class="cde-page-title">
          Types de dispositifs
        </h1>
        <p class="cde-page-sub">
          Dispositifs médicaux disponibles
        </p>
      </div>
    </header>

    <el-alert
      v-if="error"
      class="cde-alert cde-alert--danger"
      type="error"
      :title="error"
      :closable="true"
      @close="error = null"
    />

    <div class="cde-toolbar">
      <div class="cde-filters">
        <div class="cde-filter cde-toolbar__search">
          <span class="cde-filter__label">Recherche</span>
          <el-input
            v-model="search"
            placeholder="Libellé…"
            clearable
            size="small"
            @input="onSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>
      </div>
      <div class="cde-toolbar__actions">
        <el-button type="primary" size="small" :icon="Plus" @click="openCreate">
          Nouveau type
        </el-button>
      </div>
    </div>

    <div class="cde-table-card">
      <el-table
        v-loading="loading"
        :data="filteredTypes"
        style="width: 100%"
        size="small"
        row-key="id"
        empty-text=""
      >
        <el-table-column prop="label" label="Type de dispositif / Voie d'abord" min-width="300" />
        <el-table-column label="Actions" width="120" align="center">
          <template #default="{ row }">
            <el-button text type="danger" size="small" :icon="Delete" title="Supprimer" @click="handleDelete(row)" />
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div v-if="!loading && filteredTypes.length === 0" class="cde-empty">
      Aucun type de dispositif.
    </div>

    <div class="cde-footer">
      <span class="cde-muted">{{ filteredTypes.length }} élément(s)</span>
    </div>

    <!-- Create dialog -->
    <el-dialog v-model="showDialog" title="Nouveau type de dispositif" width="420px" :close-on-click-modal="false" @closed="onDialogClosed">
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <el-form-item label="Libellé" prop="label">
          <el-input v-model="form.label" placeholder="Ex: KT central, PICC line, Chambre implantable..." />
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
import { ref, reactive, computed, onMounted } from 'vue'
import { Plus, Search, Delete } from '@element-plus/icons-vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import type { FormInstance } from 'element-plus'
import { useDispositifTypes, type DispositifTypeDto } from '@/composables/useDispositifTypes'

const {
  types, loading, error, fetchTypes, createType, deleteType,
} = useDispositifTypes()

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
      ElMessage.success('Type de dispositif créé')
      showDialog.value = false
    }
  } catch {
    ElMessage.error("Erreur lors de l'enregistrement")
  } finally {
    submitting.value = false
  }
}

async function handleDelete(row: DispositifTypeDto) {
  if (row.id == null) {
    ElMessage.error('Impossible de supprimer : identifiant manquant')
    return
  }
  try {
    await ElMessageBox.confirm(
      `Supprimer le type « ${row.label} » ?`,
      'Confirmation',
      { type: 'warning', confirmButtonText: 'Supprimer', cancelButtonText: 'Annuler' },
    )
    const ok = await deleteType(row.id)
    if (ok) ElMessage.success('Type supprimé')
  } catch {
    // cancelled or error
  }
}

function onDialogClosed() {
  formRef.value?.resetFields()
}

</script>
