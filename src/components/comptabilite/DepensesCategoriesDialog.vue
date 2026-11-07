<template>
  <el-dialog
    v-model="visible"
    class="cde-dialog"
    title="Catégories de dépenses"
    width="min(720px, 94vw)"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
  >
    <div class="categories">
      <div class="categories__form">
        <h3>{{ editingId ? 'Modifier la catégorie' : 'Nouvelle catégorie' }}</h3>
        <el-row :gutter="12">
          <el-col
            :xs="24"
            :sm="10"
          >
            <el-form-item
              label="Nom"
              required
            >
              <el-input
                v-model="form.nom"
                maxlength="80"
                placeholder="Ex. Fournitures"
                @keyup.enter="save"
              />
            </el-form-item>
          </el-col>
          <el-col
            :xs="12"
            :sm="5"
          >
            <el-form-item label="Couleur">
              <el-color-picker v-model="form.couleur" />
            </el-form-item>
          </el-col>
          <el-col
            :xs="12"
            :sm="4"
          >
            <el-form-item label="Ordre">
              <el-input-number
                v-model="form.ordre"
                :min="0"
                :precision="0"
                controls-position="right"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col
            :xs="24"
            :sm="5"
          >
            <el-form-item label="Active">
              <el-switch v-model="form.actif" />
            </el-form-item>
          </el-col>
        </el-row>
        <div class="categories__form-actions">
          <el-button
            v-if="editingId"
            @click="resetForm"
          >
            Annuler
          </el-button>
          <el-button
            type="primary"
            :loading="saving"
            :disabled="!form.nom.trim()"
            @click="save"
          >
            {{ editingId ? 'Enregistrer' : 'Ajouter' }}
          </el-button>
        </div>
        <p
          v-if="formError"
          class="categories__error"
          role="alert"
        >
          {{ formError }}
        </p>
      </div>

      <el-table
        :data="categories"
        size="small"
        border
        style="width: 100%"
      >
        <el-table-column
          label="Couleur"
          width="70"
          align="center"
        >
          <template #default="{ row }">
            <span
              class="categories__swatch"
              :style="{ background: row.couleur || '#dcdfe6' }"
            />
          </template>
        </el-table-column>
        <el-table-column
          prop="nom"
          label="Nom"
          min-width="150"
        />
        <el-table-column
          prop="code"
          label="Code"
          width="140"
        />
        <el-table-column
          label="Ordre"
          width="70"
          align="center"
          prop="ordre"
        />
        <el-table-column
          label="Active"
          width="80"
          align="center"
        >
          <template #default="{ row }">
            <el-tag
              :type="row.actif === false ? 'info' : 'success'"
              size="small"
            >
              {{ row.actif === false ? 'Non' : 'Oui' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="Actions"
          width="150"
          align="center"
        >
          <template #default="{ row }">
            <el-button
              text
              type="primary"
              size="small"
              @click="edit(row)"
            >
              Modifier
            </el-button>
            <el-button
              text
              type="danger"
              size="small"
              @click="remove(row)"
            >
              Supprimer
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <template #footer>
      <el-button @click="visible = false">
        Fermer
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useDepenses } from '@/composables/useDepenses'
import type { DepenseCategorie } from '@/composables/useDepenses'

defineProps<{ categories: DepenseCategorie[] }>()
const emit = defineEmits<{ changed: [] }>()

const { createCategorie, updateCategorie, deleteCategorie } = useDepenses()

const visible = ref(false)
const saving = ref(false)
const formError = ref('')
const editingId = ref<number | null>(null)

const form = reactive({
  nom: '',
  couleur: '#409eff' as string | null,
  ordre: 0,
  actif: true,
})

function open() {
  resetForm()
  visible.value = true
}

function resetForm() {
  editingId.value = null
  form.nom = ''
  form.couleur = '#409eff'
  form.ordre = 0
  form.actif = true
  formError.value = ''
}

function edit(categorie: DepenseCategorie) {
  editingId.value = categorie.id ?? null
  form.nom = categorie.nom ?? ''
  form.couleur = categorie.couleur || null
  form.ordre = Number(categorie.ordre ?? 0)
  form.actif = categorie.actif !== false
  formError.value = ''
}

async function save() {
  const nom = form.nom.trim()
  if (!nom) {
    formError.value = 'Le nom est requis.'
    return
  }

  saving.value = true
  formError.value = ''
  try {
    if (editingId.value != null) {
      await updateCategorie(editingId.value, {
        nom,
        couleur: form.couleur || null,
        ordre: Math.round(form.ordre),
        actif: form.actif,
      })
      ElMessage.success('Catégorie mise à jour')
    } else {
      await createCategorie({
        nom,
        couleur: form.couleur || undefined,
        ordre: Math.round(form.ordre),
        actif: form.actif,
      })
      ElMessage.success('Catégorie créée')
    }
    resetForm()
    emit('changed')
  } catch {
    // ipcInvoke affiche déjà l'erreur backend.
  } finally {
    saving.value = false
  }
}

async function remove(categorie: DepenseCategorie) {
  if (categorie.id == null) return
  try {
    await ElMessageBox.confirm(
      `Supprimer la catégorie « ${categorie.nom} » ? Cette action est impossible si des dépenses l'utilisent.`,
      'Supprimer la catégorie',
      { confirmButtonText: 'Supprimer', cancelButtonText: 'Annuler', type: 'warning' },
    )
  } catch {
    return
  }

  saving.value = true
  try {
    await deleteCategorie(categorie.id)
    ElMessage.success('Catégorie supprimée')
    if (editingId.value === categorie.id) resetForm()
    emit('changed')
  } catch {
    // ipcInvoke affiche déjà l'erreur backend (catégorie utilisée).
  } finally {
    saving.value = false
  }
}

defineExpose({ open })
</script>

<style scoped>
.categories__form {
  padding: 12px 14px;
  margin-bottom: 16px;
  background: var(--cd-gray-50);
  border-radius: var(--cd-radius-sm);
}

.categories__form h3 {
  margin: 0 0 8px;
  font-size: 14px;
}

.categories__form :deep(.el-form-item) {
  margin-bottom: 8px;
}

.categories__form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.categories__error {
  margin: 6px 0 0;
  color: var(--cd-secondary);
  font-size: 13px;
}

.categories__swatch {
  display: inline-block;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1px solid var(--cd-border);
  vertical-align: middle;
}
</style>
