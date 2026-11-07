<template>
  <div class="dvt cde">
    <header class="cde-page-head">
      <div>
        <h1 class="cde-page-title">
          Dispositifs médicaux &amp; Voies d'abord
        </h1>
        <p class="cde-page-sub">
          Référentiels utilisés dans les dossiers de soins
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

    <div class="dvt__sections">
      <section class="cde-section">
        <div class="cde-section-head">
          <h2 class="cde-section-title">
            Dispositifs médicaux
          </h2>
          <el-button type="primary" size="small" :icon="Plus" @click="openCreate('dispositif')">
            Ajouter
          </el-button>
        </div>
        <div class="cde-toolbar">
          <div class="cde-filters">
            <div class="cde-filter cde-toolbar__search">
              <span class="cde-filter__label">Recherche</span>
              <el-input
                v-model="dispositifSearch"
                placeholder="Libellé…"
                clearable
                size="small"
              >
                <template #prefix>
                  <el-icon><Search /></el-icon>
                </template>
              </el-input>
            </div>
          </div>
        </div>
        <div class="cde-table-card">
          <el-table
            v-loading="dispositifLoading"
            :data="dispositifFiltered"
            size="small"
            style="width: 100%"
            empty-text=""
          >
            <el-table-column prop="label" label="Type de dispositif / Voie d'abord" min-width="280" />
            <el-table-column label="Actions" width="90" align="center">
              <template #default="{ row }">
                <el-button text type="danger" size="small" :icon="Delete" title="Supprimer" @click="handleDelete('dispositif', row)" />
              </template>
            </el-table-column>
          </el-table>
        </div>
        <div v-if="!dispositifLoading && dispositifFiltered.length === 0" class="cde-empty">
          Aucun dispositif.
        </div>
        <div class="cde-footer">
          <span class="cde-muted">{{ dispositifFiltered.length }} dispositif(s)</span>
        </div>
      </section>

      <section class="cde-section">
        <div class="cde-section-head">
          <h2 class="cde-section-title">
            Voies d'administration
          </h2>
          <el-button type="primary" size="small" :icon="Plus" @click="openCreate('voie')">
            Ajouter
          </el-button>
        </div>
        <div class="cde-toolbar">
          <div class="cde-filters">
            <div class="cde-filter cde-toolbar__search">
              <span class="cde-filter__label">Recherche</span>
              <el-input
                v-model="voieSearch"
                placeholder="Libellé…"
                clearable
                size="small"
              >
                <template #prefix>
                  <el-icon><Search /></el-icon>
                </template>
              </el-input>
            </div>
          </div>
        </div>
        <div class="cde-table-card">
          <el-table
            v-loading="voieLoading"
            :data="voieFiltered"
            size="small"
            style="width: 100%"
            empty-text=""
          >
            <el-table-column prop="label" label="Voie d'administration" min-width="280" />
            <el-table-column label="Actions" width="90" align="center">
              <template #default="{ row }">
                <el-button text type="danger" size="small" :icon="Delete" title="Supprimer" @click="handleDelete('voie', row)" />
              </template>
            </el-table-column>
          </el-table>
        </div>
        <div v-if="!voieLoading && voieFiltered.length === 0" class="cde-empty">
          Aucune voie d'administration.
        </div>
        <div class="cde-footer">
          <span class="cde-muted">{{ voieFiltered.length }} voie(s)</span>
        </div>
      </section>
    </div>

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
.dvt {
  min-width: 0;
  max-width: 100%;
}

.dvt__sections {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.dvt__sections > * {
  min-width: 0;
}

@media (max-width: 1000px) {
  .dvt__sections {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
