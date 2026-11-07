<template>
  <div class="labo-fournisseurs">
    <div class="cde-toolbar">
      <div class="cde-filters">
        <div class="cde-filter cde-toolbar__search">
          <span class="cde-filter__label">Recherche</span>
          <el-input
            v-model="search"
            placeholder="Nom du fournisseur…"
            clearable
            :prefix-icon="Search"
            class="cde-toolbar__search-input"
            @keyup.enter="reload"
            @clear="reload"
          />
        </div>
      </div>
      <div class="cde-toolbar__actions">
        <el-button type="primary" :icon="Plus" @click="openForm()">Nouveau fournisseur</el-button>
      </div>
    </div>

    <div class="cde-table-wrap">
      <el-table :data="fournisseurs" v-loading="loading" size="small" style="width: 100%" aria-label="Fournisseurs du laboratoire">
        <el-table-column prop="nom" label="Nom" min-width="180" />
        <el-table-column prop="contact" label="Contact" min-width="140">
          <template #default="{ row }">{{ row.contact || '—' }}</template>
        </el-table-column>
        <el-table-column prop="telephone" label="Téléphone" width="150">
          <template #default="{ row }">{{ row.telephone || '—' }}</template>
        </el-table-column>
        <el-table-column prop="email" label="Email" min-width="180">
          <template #default="{ row }">{{ row.email || '—' }}</template>
        </el-table-column>
        <el-table-column label="Statut" width="110">
          <template #default="{ row }">
            <el-tag size="small" :type="row.actif ? 'success' : 'info'" effect="plain">
              {{ row.actif ? 'Actif' : 'Inactif' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Actions" width="110" fixed="right">
          <template #default="{ row }">
            <el-button link size="small" @click="openForm(row)">Modifier</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="Aucun fournisseur" :image-size="70" />
        </template>
      </el-table>
    </div>

    <el-dialog v-model="dialog" :title="form.id ? 'Modifier le fournisseur' : 'Nouveau fournisseur'" width="560px">
      <el-form label-position="top" :model="form">
        <el-form-item label="Nom" required><el-input v-model="form.nom" /></el-form-item>
        <el-row :gutter="12">
          <el-col :span="12"><el-form-item label="Contact"><el-input v-model="form.contact" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="Téléphone"><el-input v-model="form.telephone" /></el-form-item></el-col>
        </el-row>
        <el-form-item label="Email"><el-input v-model="form.email" /></el-form-item>
        <el-form-item label="Adresse"><el-input v-model="form.adresse" type="textarea" :rows="2" /></el-form-item>
        <el-form-item label="Actif"><el-switch v-model="form.actif" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog = false">Annuler</el-button>
        <el-button type="primary" :loading="saving" @click="submit">Enregistrer</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Search } from '@element-plus/icons-vue'
import { useFournisseurs, type FournisseurDto } from '@/composables/useFournisseurs'

const { fournisseurs, loading, fetchFournisseurs, saveFournisseur } = useFournisseurs()

const search = ref('')
const dialog = ref(false)
const saving = ref(false)

const form = reactive<FournisseurDto>({
  id: undefined,
  nom: '',
  contact: '',
  telephone: '',
  email: '',
  adresse: '',
  actif: true,
})

function reload(): void {
  fetchFournisseurs({ search: search.value || undefined })
}

function openForm(row?: FournisseurDto): void {
  form.id = row?.id
  form.nom = row?.nom ?? ''
  form.contact = row?.contact ?? ''
  form.telephone = row?.telephone ?? ''
  form.email = row?.email ?? ''
  form.adresse = row?.adresse ?? ''
  form.actif = row?.actif ?? true
  dialog.value = true
}

async function submit(): Promise<void> {
  if (!form.nom?.trim()) {
    ElMessage.warning('Le nom du fournisseur est requis')
    return
  }
  saving.value = true
  try {
    const saved = await saveFournisseur({ ...form, nom: form.nom.trim() })
    if (!saved) {
      ElMessage.error('Enregistrement impossible')
      return
    }
    ElMessage.success('Fournisseur enregistré')
    dialog.value = false
    reload()
  } finally {
    saving.value = false
  }
}

onMounted(reload)
</script>
