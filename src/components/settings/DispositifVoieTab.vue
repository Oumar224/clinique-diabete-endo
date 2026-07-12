<template>
  <div class="dvt">
    <el-alert v-if="error" type="error" :title="error" show-icon closable style="margin-bottom: 12px" />

    <div class="dvt__sections">
      <!-- Dispositifs médicaux -->
      <div class="dvt__section">
        <div class="dvt__section-header">
          <h3 class="dvt__section-title">Dispositifs médicaux</h3>
          <el-button type="primary" size="small" :icon="Plus" @click="openCreate('dispositif')">Ajouter</el-button>
        </div>
        <div class="dvt__toolbar">
          <el-input
            v-model="dispositifSearch"
            placeholder="Rechercher un dispositif..."
            clearable
            style="width: 260px"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>
        <el-table
          v-loading="dispositifLoading"
          :data="dispositifFiltered"
          size="small"
          border
          style="width:100%"
        >
          <template #empty>
            <el-empty description="Aucun dispositif" :image-size="40" />
          </template>
          <el-table-column prop="label" label="Type de dispositif / Voie d'abord" min-width="280" />
          <el-table-column label="Actions" width="90" align="center">
            <template #default="{ row }">
              <el-button text type="danger" :icon="Delete" size="small" @click="handleDelete('dispositif', row)" />
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- Voies d'administration -->
      <div class="dvt__section">
        <div class="dvt__section-header">
          <h3 class="dvt__section-title">Voies d'administration</h3>
          <el-button type="primary" size="small" :icon="Plus" @click="openCreate('voie')">Ajouter</el-button>
        </div>
        <div class="dvt__toolbar">
          <el-input
            v-model="voieSearch"
            placeholder="Rechercher une voie..."
            clearable
            style="width: 260px"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>
        <el-table
          v-loading="voieLoading"
          :data="voieFiltered"
          size="small"
          border
          style="width:100%"
        >
          <template #empty>
            <el-empty description="Aucune voie" :image-size="40" />
          </template>
          <el-table-column prop="label" label="Voie d'administration" min-width="280" />
          <el-table-column label="Actions" width="90" align="center">
            <template #default="{ row }">
              <el-button text type="danger" :icon="Delete" size="small" @click="handleDelete('voie', row)" />
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- Create dialog -->
    <el-dialog
      v-model="showDialog"
      :title="dialogTitle"
      width="420px"
      :close-on-click-modal="false"
      @closed="onDialogClosed"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <el-form-item label="Libellé" prop="label">
          <el-input v-model="form.label" :placeholder="dialogPlaceholder" />
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
import { useVoieTypes, type VoieTypeDto } from '@/composables/useVoieTypes'

const {
  types: dispositifTypes,
  loading: dispositifLoading,
  error: dispositifError,
  fetchTypes: fetchDispositifTypes,
  createType: createDispositifType,
  deleteType: deleteDispositifType,
} = useDispositifTypes()

const {
  types: voieTypes,
  loading: voieLoading,
  error: voieError,
  fetchTypes: fetchVoieTypes,
  createType: createVoieType,
  deleteType: deleteVoieType,
} = useVoieTypes()

const error = computed(() => dispositifError.value || voieError.value)

const showDialog = ref(false)
const submitting = ref(false)
const formRef = ref<FormInstance>()
const form = reactive({ label: '' })
const dialogType = ref<'dispositif' | 'voie'>('dispositif')

const dialogTitle = computed(() =>
  dialogType.value === 'dispositif' ? 'Nouveau dispositif médical' : 'Nouvelle voie d\'administration',
)

const dialogPlaceholder = computed(() =>
  dialogType.value === 'dispositif'
    ? 'Ex: KT central, PICC line, Chambre implantable...'
    : 'Ex: IV, PO, SC, IM, SL...',
)

const rules = {
  label: [
    { required: true, message: 'Le libellé est requis', trigger: 'blur' },
    { max: 100, message: 'Maximum 100 caractères', trigger: 'blur' },
  ],
}

const dispositifSearch = ref('')
const voieSearch = ref('')

const dispositifFiltered = computed(() => {
  if (!dispositifSearch.value) return dispositifTypes.value
  const q = dispositifSearch.value.toLowerCase()
  return dispositifTypes.value.filter(t => t.label.toLowerCase().includes(q))
})

const voieFiltered = computed(() => {
  if (!voieSearch.value) return voieTypes.value
  const q = voieSearch.value.toLowerCase()
  return voieTypes.value.filter(t => t.label.toLowerCase().includes(q))
})

onMounted(async () => {
  await Promise.all([fetchDispositifTypes(), fetchVoieTypes()])
})

function openCreate(type: 'dispositif' | 'voie') {
  dialogType.value = type
  form.label = ''
  showDialog.value = true
}

async function submit() {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  submitting.value = true
  try {
    const ok = dialogType.value === 'dispositif'
      ? await createDispositifType({ label: form.label })
      : await createVoieType({ label: form.label })
    if (ok) {
      ElMessage.success(dialogType.value === 'dispositif' ? 'Dispositif créé' : 'Voie créée')
      showDialog.value = false
    }
  } catch {
    ElMessage.error("Erreur lors de l'enregistrement")
  } finally {
    submitting.value = false
  }
}

async function handleDelete(type: 'dispositif' | 'voie', row: DispositifTypeDto | VoieTypeDto) {
  if (row.id == null) {
    ElMessage.error('Impossible de supprimer : identifiant manquant')
    return
  }
  const label = (row as any).label
  try {
    await ElMessageBox.confirm(
      `Supprimer « ${label} » ?`,
      'Confirmation',
      { type: 'warning', confirmButtonText: 'Supprimer', cancelButtonText: 'Annuler' },
    )
    const ok = type === 'dispositif'
      ? await deleteDispositifType(row.id)
      : await deleteVoieType(row.id)
    if (ok) ElMessage.success(type === 'dispositif' ? 'Dispositif supprimé' : 'Voie supprimée')
  } catch { /* cancelled */ }
}

function onDialogClosed() {
  formRef.value?.resetFields()
}
</script>

<style scoped>
.dvt__sections {
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.dvt__section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.dvt__section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--cd-gray-900);
  margin: 0;
}
.dvt__toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}
</style>
