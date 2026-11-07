<template>
  <el-dialog
    v-model="visible"
    class="cde-dialog"
    :title="editing ? 'Modifier la dépense' : 'Nouvelle dépense'"
    width="min(680px, 94vw)"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
  >
    <el-form
      label-position="top"
      @submit.prevent
    >
      <el-row :gutter="16">
        <el-col
          :xs="24"
          :sm="12"
        >
          <el-form-item
            label="Date"
            required
          >
            <el-date-picker
              v-model="form.date"
              type="date"
              value-format="YYYY-MM-DD"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
        <el-col
          :xs="24"
          :sm="12"
        >
          <el-form-item
            label="Catégorie"
            required
          >
            <el-select
              v-model="form.categorieId"
              placeholder="Choisir une catégorie"
              style="width: 100%"
            >
              <el-option
                v-for="categorie in categories"
                :key="categorie.id"
                :label="categorie.nom"
                :value="categorie.id as number"
              />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item
        label="Libellé"
        required
      >
        <el-input
          v-model="form.libelle"
          maxlength="200"
          placeholder="Ex. Achat de gants, loyer du local…"
        />
      </el-form-item>

      <el-row :gutter="16">
        <el-col
          :xs="24"
          :sm="12"
        >
          <el-form-item
            label="Montant (GNF)"
            required
          >
            <el-input-number
              v-model="form.montant"
              :min="0"
              :step="1000"
              :precision="0"
              controls-position="right"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
        <el-col
          :xs="24"
          :sm="12"
        >
          <el-form-item label="Statut du paiement">
            <el-radio-group v-model="form.statutPaiement">
              <el-radio-button value="payee">
                Payée
              </el-radio-button>
              <el-radio-button value="credit">
                À crédit
              </el-radio-button>
            </el-radio-group>
          </el-form-item>
        </el-col>
      </el-row>

      <el-row
        v-if="form.statutPaiement === 'payee'"
        :gutter="16"
      >
        <el-col
          :xs="24"
          :sm="12"
        >
          <el-form-item
            label="Mode de paiement"
            required
          >
            <el-select
              v-model="form.modePaiement"
              style="width: 100%"
            >
              <el-option
                v-for="mode in MODES_PAIEMENT"
                :key="mode.value"
                :label="mode.label"
                :value="mode.value"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col
          :xs="24"
          :sm="12"
        >
          <el-form-item label="Date de paiement">
            <el-date-picker
              v-model="form.datePaiement"
              type="date"
              value-format="YYYY-MM-DD"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="16">
        <el-col
          :xs="24"
          :sm="12"
        >
          <el-form-item label="Fournisseur">
            <el-select
              v-model="form.fournisseurId"
              clearable
              filterable
              placeholder="Sélectionner un fournisseur"
              style="width: 100%"
              @change="onFournisseurChange"
            >
              <el-option
                v-for="fournisseur in fournisseurOptions"
                :key="fournisseur.value"
                :label="fournisseur.label"
                :value="fournisseur.value"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col
          :xs="24"
          :sm="12"
        >
          <el-form-item label="Fournisseur (saisie libre)">
            <el-input
              v-model="form.fournisseurNom"
              maxlength="160"
              placeholder="Nom si non référencé"
              :disabled="form.fournisseurId != null"
            />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="16">
        <el-col
          :xs="24"
          :sm="12"
        >
          <el-form-item label="Référence (optionnel)">
            <el-input
              v-model="form.reference"
              maxlength="120"
              placeholder="N° de reçu, facture fournisseur…"
            />
          </el-form-item>
        </el-col>
        <el-col
          :xs="24"
          :sm="12"
        >
          <el-form-item label="Notes (optionnel)">
            <el-input
              v-model="form.notes"
              maxlength="500"
              placeholder="Commentaire interne"
            />
          </el-form-item>
        </el-col>
      </el-row>

      <p
        v-if="formError"
        class="depense-form__error"
        role="alert"
      >
        {{ formError }}
      </p>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">
        Annuler
      </el-button>
      <el-button
        type="primary"
        :loading="saving"
        @click="save"
      >
        {{ editing ? 'Enregistrer' : 'Créer la dépense' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useDepenses } from '@/composables/useDepenses'
import type {
  Depense,
  DepenseCategorie,
  DepenseCreate,
  DepenseStatutPaiement,
  DepenseUpdate,
} from '@/composables/useDepenses'
import { MODES_PAIEMENT } from '@/composables/useSalaires'
import type { ModePaiement } from '@/composables/useSalaires'
import { useFournisseurs } from '@/composables/useFournisseurs'

defineProps<{ categories: DepenseCategorie[] }>()
const emit = defineEmits<{ saved: [] }>()

const { createDepense, updateDepense } = useDepenses()
const { fournisseurOptions, fetchFournisseurs } = useFournisseurs()

const visible = ref(false)
const saving = ref(false)
const editing = ref(false)
const editingId = ref<number | null>(null)
const formError = ref('')

const form = reactive({
  date: todayIso(),
  categorieId: null as number | null,
  libelle: '',
  montant: 0,
  statutPaiement: 'payee' as DepenseStatutPaiement,
  modePaiement: 'espèces' as ModePaiement,
  datePaiement: todayIso(),
  fournisseurId: null as number | null,
  fournisseurNom: '',
  reference: '',
  notes: '',
})

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Ouvre le formulaire en création, ou en édition pour une dépense manuelle. */
function open(depense?: Depense | null) {
  editing.value = depense != null
  editingId.value = depense?.id ?? null
  formError.value = ''
  form.date = depense?.date ?? todayIso()
  form.categorieId = depense?.categorieId ?? null
  form.libelle = depense?.libelle ?? ''
  form.montant = Number(depense?.montant ?? 0)
  form.statutPaiement = depense?.statutPaiement === 'credit' ? 'credit' : 'payee'
  form.modePaiement = depense?.modePaiement ?? 'espèces'
  form.datePaiement = depense?.datePaiement ?? todayIso()
  form.fournisseurId = depense?.fournisseurId ?? null
  form.fournisseurNom = depense?.fournisseurId == null ? (depense?.fournisseurNom ?? '') : ''
  form.reference = depense?.reference ?? ''
  form.notes = depense?.notes ?? ''
  visible.value = true
  fetchFournisseurs({ actif: true })
}

function onFournisseurChange() {
  if (form.fournisseurId != null) form.fournisseurNom = ''
}

function validate(): string | null {
  if (!form.date) return 'La date est requise.'
  if (form.categorieId == null) return 'Sélectionnez une catégorie.'
  if (!form.libelle.trim()) return 'Le libellé est requis.'
  if (!Number.isFinite(form.montant) || form.montant <= 0) return 'Le montant doit être supérieur à 0.'
  if (form.statutPaiement === 'payee' && !form.modePaiement) return 'Sélectionnez un mode de paiement.'
  return null
}

async function save() {
  const validation = validate()
  if (validation) {
    formError.value = validation
    return
  }

  const payload: DepenseCreate = {
    date: form.date,
    categorieId: form.categorieId as number,
    libelle: form.libelle.trim(),
    montant: Math.round(form.montant),
    statutPaiement: form.statutPaiement,
    modePaiement: form.statutPaiement === 'payee' ? form.modePaiement : null,
    datePaiement: form.statutPaiement === 'payee' ? form.datePaiement || form.date : undefined,
    fournisseurId: form.fournisseurId,
    fournisseurNom: form.fournisseurId == null ? form.fournisseurNom.trim() || undefined : undefined,
    reference: form.reference.trim() || undefined,
    notes: form.notes.trim() || undefined,
  }

  saving.value = true
  formError.value = ''
  try {
    if (editing.value && editingId.value != null) {
      const update: DepenseUpdate = {
        date: payload.date,
        categorieId: payload.categorieId,
        libelle: payload.libelle,
        montant: payload.montant,
        statutPaiement: payload.statutPaiement,
        modePaiement: payload.modePaiement,
        fournisseurId: payload.fournisseurId,
        fournisseurNom: payload.fournisseurNom ?? null,
        reference: payload.reference ?? null,
        notes: payload.notes ?? null,
      }
      if (payload.statutPaiement === 'payee') update.datePaiement = payload.datePaiement ?? null
      await updateDepense(editingId.value, update)
      ElMessage.success('Dépense mise à jour')
    } else {
      await createDepense(payload)
      ElMessage.success('Dépense créée')
    }
    visible.value = false
    emit('saved')
  } catch {
    // ipcInvoke affiche déjà l'erreur backend.
  } finally {
    saving.value = false
  }
}

defineExpose({ open })
</script>

<style scoped>
.depense-form__error {
  margin: 0;
  color: var(--cd-secondary);
  font-size: 13px;
}
</style>
