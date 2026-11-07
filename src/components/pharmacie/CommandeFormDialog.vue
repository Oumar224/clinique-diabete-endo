<template>
  <el-dialog
    v-model="visible"
    :title="commandId == null ? 'Nouveau bon de commande' : 'Modifier le bon de commande'"
    width="820px"
    :close-on-click-modal="false"
    @closed="onClosed"
  >
    <el-alert
      v-if="submitError"
      class="cde-alert cde-alert--danger"
      type="error"
      :closable="false"
      show-icon
      :title="submitError"
    />

    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-position="top"
      @submit.prevent
    >
      <el-row :gutter="12">
        <el-col
          :xs="24"
          :sm="14"
        >
          <el-form-item
            label="Fournisseur"
            prop="fournisseurId"
          >
            <el-select
              v-model="form.fournisseurId"
              filterable
              placeholder="Choisir un fournisseur"
              style="width: 100%"
            >
              <el-option
                v-for="option in fournisseurOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col
          :xs="24"
          :sm="10"
        >
          <el-form-item label="Commande urgente">
            <el-switch
              v-model="form.urgence"
              active-text="Oui"
              inactive-text="Non"
            />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="12">
        <el-col
          :xs="24"
          :sm="8"
        >
          <el-form-item
            label="Date de commande"
            prop="dateCommande"
          >
            <el-date-picker
              v-model="form.dateCommande"
              type="date"
              value-format="YYYY-MM-DD"
              :clearable="false"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
        <el-col
          :xs="24"
          :sm="8"
        >
          <el-form-item label="Date prévue">
            <el-date-picker
              v-model="form.datePrevue"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="Optionnelle"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
        <el-col
          :xs="24"
          :sm="8"
        >
          <el-form-item label="Période budgétaire">
            <el-input
              v-model="form.periode"
              maxlength="40"
              placeholder="Ex : 2026-T4"
            />
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="Notes">
        <el-input
          v-model="form.notes"
          type="textarea"
          :rows="2"
          maxlength="500"
          show-word-limit
          placeholder="Instructions de livraison, conditions…"
        />
      </el-form-item>
    </el-form>

    <section class="cde-section">
      <div class="cde-section-head">
        <h2 class="cde-section-title">
          Lignes commandées
        </h2>
        <span class="cde-section-meta">{{ lignes.length }} ligne(s)</span>
      </div>

      <div class="commande-form__add">
        <el-select
          v-model="selectedMedicamentId"
          filterable
          clearable
          placeholder="Ajouter un article…"
          aria-label="Article à ajouter au bon de commande"
          class="commande-form__add-select"
        >
          <el-option
            v-for="option in medicamentOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
        <el-button
          :icon="Plus"
          :disabled="selectedMedicamentId == null"
          @click="addLine"
        >
          Ajouter
        </el-button>
      </div>

      <el-alert
        v-if="linesError"
        class="cde-alert cde-alert--danger"
        type="error"
        :closable="false"
        show-icon
        :title="linesError"
      />

      <div class="cde-table-wrap">
        <el-table
          :data="lignes"
          size="small"
          style="width: 100%"
          aria-label="Lignes du bon de commande"
        >
          <el-table-column
            label="Article"
            min-width="220"
          >
            <template #default="{ row }">
              <div class="commande-form__article">
                {{ row.designation }}
              </div>
              <div
                v-if="row.unite"
                class="commande-form__unit"
              >
                Unité : {{ row.unite }}
              </div>
            </template>
          </el-table-column>
          <el-table-column
            label="CMM"
            width="90"
            align="right"
          >
            <template #default="{ row }">
              <span class="cde-num">{{ row.cmm }}</span>
            </template>
          </el-table-column>
          <el-table-column
            label="Stock restant"
            width="110"
            align="right"
          >
            <template #default="{ row }">
              <span class="cde-num">{{ row.stockRestant }}</span>
            </template>
          </el-table-column>
          <el-table-column
            label="Quantité"
            width="150"
            align="right"
          >
            <template #default="{ row }">
              <el-input-number
                v-model="row.quantiteCommandee"
                :min="1"
                :step="1"
                :precision="0"
                controls-position="right"
                size="small"
                style="width: 120px"
                :aria-label="`Quantité commandée pour ${row.designation}`"
              />
            </template>
          </el-table-column>
          <el-table-column
            label=""
            width="60"
            align="right"
          >
            <template #default="{ $index }">
              <el-button
                text
                type="danger"
                size="small"
                title="Retirer la ligne"
                @click="removeLine($index)"
              >
                <el-icon><Delete /></el-icon>
              </el-button>
            </template>
          </el-table-column>
          <template #empty>
            <div class="cde-empty">
              Ajoutez au moins un article au bon de commande.
            </div>
          </template>
        </el-table>
      </div>
    </section>

    <template #footer>
      <el-button @click="visible = false">
        Annuler
      </el-button>
      <el-button
        type="primary"
        :loading="saving"
        @click="submit"
      >
        {{ commandId == null ? 'Créer le brouillon' : 'Enregistrer' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Delete, Plus } from '@element-plus/icons-vue'
import { useAuth } from '@/composables/useAuth'
import { useFournisseurs } from '@/composables/useFournisseurs'
import { medicamentLabel, useMedicaments } from '@/composables/useMedicaments'
import {
  useCommandes,
  type CommandeDto,
  type CommandeLigneDto,
} from '@/composables/useCommandes'

/** Ligne éditable du formulaire (snapshot CMM / stock inclus). */
interface LigneDraft {
  medicamentId: number
  designation: string
  unite: string
  cmm: number
  stockRestant: number
  quantiteCommandee: number
}

const emit = defineEmits<{
  saved: [commande: CommandeDto]
}>()

const { user } = useAuth()
const { fournisseurOptions, fournisseurs, fetchFournisseurs } = useFournisseurs()
const { medicaments, medicamentOptions, fetchMedicaments } = useMedicaments()
const { createCommande, updateCommande, prefill, saving, error } = useCommandes()

const visible = ref(false)
const commandId = ref<number | null>(null)
const formRef = ref<FormInstance>()
const lignes = ref<LigneDraft[]>([])
const selectedMedicamentId = ref<number | null>(null)
const linesError = ref('')
const submitError = ref('')

/**
 * Jeton de génération des préremplissages en vol.
 *
 * `commande:prefill` peut répondre après la fermeture du dialogue (ou après
 * l'ajout/la suppression de la ligne). Chaque ouverture, fermeture ou
 * enregistrement incrémente ce jeton : une réponse dont le jeton ne
 * correspond plus est ignorée, elle ne peut donc pas réécrire un brouillon
 * déjà fermé ou soumis.
 */
let prefillGeneration = 0

/** Invalide toutes les requêtes de préremplissage en cours. */
function invalidatePrefill(): void {
  prefillGeneration += 1
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

const form = reactive({
  fournisseurId: null as number | null,
  dateCommande: todayIso(),
  datePrevue: '',
  periode: '',
  urgence: false,
  notes: '',
})

const rules: FormRules = {
  fournisseurId: [{ required: true, message: 'Le fournisseur est requis', trigger: 'change' }],
  dateCommande: [{ required: true, message: 'La date de commande est requise', trigger: 'change' }],
}

/**
 * Ouvre le dialogue en création ou en modification.
 *
 * @param target - Bon à modifier (uniquement en brouillon). Absent pour créer.
 */
async function open(target?: CommandeDto) {
  invalidatePrefill()
  submitError.value = ''
  linesError.value = ''
  selectedMedicamentId.value = null

  if (fournisseurs.value.length === 0) {
    fetchFournisseurs({ actif: true }).catch(() => undefined)
  }
  if (medicaments.value.length === 0) {
    fetchMedicaments({ actif: true }).catch(() => undefined)
  }

  if (target?.id != null) {
    commandId.value = target.id
    form.fournisseurId = target.fournisseurId ?? null
    form.dateCommande = target.dateCommande ?? todayIso()
    form.datePrevue = target.datePrevue ?? ''
    form.periode = target.periode ?? ''
    form.urgence = target.urgence === true
    form.notes = target.notes ?? ''
    lignes.value = (target.lignes ?? [])
      .map(toDraft)
      .filter((ligne): ligne is LigneDraft => ligne != null)
  } else {
    commandId.value = null
    form.fournisseurId = null
    form.dateCommande = todayIso()
    form.datePrevue = ''
    form.periode = ''
    form.urgence = false
    form.notes = ''
    lignes.value = []
  }

  visible.value = true
}

/**
 * Convertit une ligne backend en ligne éditable.
 *
 * Une ligne dont le `medicamentId` n'est pas un entier strictement positif
 * (ligne orpheline, donnée historique) est écartée : sans identifiant valide,
 * elle ne peut être ni préremplie ni enregistrée et ferait échouer tout le
 * bon à la validation.
 *
 * @param ligne - Ligne du bon.
 * @returns La ligne éditable, ou `null` si l'article est invalide.
 */
function toDraft(ligne: CommandeLigneDto): LigneDraft | null {
  const medicamentId = Number(ligne.medicamentId)
  if (!Number.isInteger(medicamentId) || medicamentId <= 0) return null

  const quantite = Number(ligne.quantiteCommandee ?? 1)
  return {
    medicamentId,
    designation: ligne.designation ?? `Médicament #${medicamentId}`,
    unite: ligne.unite ?? '',
    cmm: ligne.cmm ?? 0,
    stockRestant: ligne.stockRestant ?? 0,
    quantiteCommandee: Number.isInteger(quantite) && quantite > 0 ? quantite : 1,
  }
}

/**
 * Applique une suggestion de préremplissage sans écraser une saisie manuelle.
 *
 * Seuls les champs encore égaux au snapshot pris à l'ajout de la ligne sont
 * complétés. Si l'utilisateur a modifié la CMM, le stock restant, la
 * désignation ou l'unité pendant l'appel réseau, sa valeur est conservée.
 *
 * @param draft - Ligne encore présente dans le brouillon.
 * @param initial - Valeurs au moment de l'ajout.
 * @param suggestion - Valeurs calculées par le backend.
 */
function applyPrefill(
  draft: LigneDraft,
  initial: LigneDraft,
  suggestion: {
    cmm?: number | null
    stockRestant?: number | null
    designation?: string | null
    unite?: string | null
  },
): void {
  if (draft.cmm === initial.cmm) draft.cmm = suggestion.cmm ?? initial.cmm
  if (draft.stockRestant === initial.stockRestant) {
    draft.stockRestant = suggestion.stockRestant ?? initial.stockRestant
  }
  if (draft.designation === initial.designation && suggestion.designation) {
    draft.designation = suggestion.designation
  }
  if (draft.unite === initial.unite && suggestion.unite) {
    draft.unite = suggestion.unite
  }
}

/** Ajoute l'article sélectionné et complète CMM / stock via le backend. */
async function addLine() {
  const id = selectedMedicamentId.value
  if (id == null || !Number.isInteger(id) || id <= 0) return
  if (lignes.value.some((line) => line.medicamentId === id)) {
    ElMessage.info('Cet article est déjà présent dans le bon.')
    return
  }
  const med = medicaments.value.find((m) => m.id === id)
  const draft: LigneDraft = {
    medicamentId: id,
    designation: med ? medicamentLabel(med) : `Médicament #${id}`,
    unite: med?.uniteStock ?? '',
    cmm: 0,
    stockRestant: 0,
    quantiteCommandee: 1,
  }
  const initial: LigneDraft = { ...draft }
  const generation = prefillGeneration
  lignes.value.push(draft)
  selectedMedicamentId.value = null
  linesError.value = ''

  const suggestions = await prefill([id], form.dateCommande)

  // Réponse tardive : dialogue fermé, rouvert, ou ligne retirée entre-temps.
  if (generation !== prefillGeneration || !visible.value) return
  if (!lignes.value.includes(draft)) return

  const suggestion = suggestions.find((s) => s.medicamentId === id)
  if (suggestion) applyPrefill(draft, initial, suggestion)
}

/**
 * Retire une ligne du bon.
 *
 * @param index - Position de la ligne.
 */
function removeLine(index: number) {
  lignes.value.splice(index, 1)
}

/** Valide puis enregistre le bon de commande. */
async function submit() {
  submitError.value = ''
  linesError.value = ''
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid || form.fournisseurId == null) return

  if (lignes.value.length === 0) {
    linesError.value = 'Ajoutez au moins un article au bon de commande.'
    return
  }
  if (lignes.value.some((line) => !Number.isInteger(line.quantiteCommandee) || line.quantiteCommandee <= 0)) {
    linesError.value = 'Chaque quantité doit être un entier strictement positif.'
    return
  }
  if (form.datePrevue && form.datePrevue < form.dateCommande) {
    submitError.value = 'La date prévue doit être postérieure ou égale à la date de commande.'
    return
  }

  const payload = {
    fournisseurId: form.fournisseurId,
    dateCommande: form.dateCommande,
    datePrevue: form.datePrevue || null,
    periode: form.periode.trim() || null,
    urgence: form.urgence,
    notes: form.notes.trim() || null,
    lignes: lignes.value.map((line) => ({
      medicamentId: line.medicamentId,
      cmm: line.cmm,
      stockRestant: line.stockRestant,
      quantiteCommandee: Math.trunc(line.quantiteCommandee),
    })),
  }

  // Gèle les préremplissages encore en vol : le payload est figé ci-dessus.
  invalidatePrefill()
  const saved = commandId.value == null
    ? await createCommande({ ...payload, createdBy: user.value?.id })
    : await updateCommande({ id: commandId.value, ...payload })

  if (!saved) {
    submitError.value = error.value || 'Enregistrement du bon impossible.'
    return
  }
  ElMessage.success(commandId.value == null ? 'Bon de commande créé en brouillon' : 'Bon de commande mis à jour')
  emit('saved', saved)
  visible.value = false
}

function onClosed() {
  invalidatePrefill()
  formRef.value?.resetFields()
  lignes.value = []
  selectedMedicamentId.value = null
  commandId.value = null
  submitError.value = ''
  linesError.value = ''
}

defineExpose({ open })
</script>

<style scoped>
.commande-form__add {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin: 10px 0;
}

.commande-form__add-select {
  width: min(420px, 100%);
  flex: 1 1 260px;
}

.commande-form__article {
  font-weight: 500;
}

.commande-form__unit {
  font-size: 11px;
  color: var(--cde-muted);
}
</style>
