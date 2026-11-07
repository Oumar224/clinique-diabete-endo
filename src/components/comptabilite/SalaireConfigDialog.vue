<template>
  <el-dialog
    v-model="visible"
    class="cde-dialog"
    title="Configuration du salaire"
    width="min(820px, 94vw)"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
  >
    <div class="salaire-config">
      <div class="salaire-config__employee">
        <strong>{{ employeeLabel }}</strong>
        <span>Période {{ periode }}</span>
      </div>

      <el-form
        label-position="top"
        @submit.prevent
      >
        <el-row :gutter="16">
          <el-col
            :xs="24"
            :sm="8"
          >
            <el-form-item label="Salaire de base (GNF)">
              <el-input-number
                v-model="form.base"
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
            :sm="8"
          >
            <el-form-item label="Jours travaillés">
              <el-input-number
                v-model="form.joursTravailles"
                :min="0"
                :max="31"
                :precision="0"
                controls-position="right"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col
            :xs="24"
            :sm="8"
          >
            <el-form-item label="Net calculé">
              <div class="salaire-config__net">
                {{ formatCurrency(net) }}
              </div>
            </el-form-item>
          </el-col>
        </el-row>

        <div class="salaire-config__rubriques-head">
          <div>
            <h3>Rubriques</h3>
            <p>Les rubriques sans impact sur le net restent informatives.</p>
          </div>
          <div class="salaire-config__rubriques-actions">
            <el-button
              size="small"
              @click="addStandardRubriques"
            >
              Ajouter les rubriques standard
            </el-button>
            <el-button
              :icon="Plus"
              size="small"
              @click="addRubrique"
            >
              Ajouter
            </el-button>
          </div>
        </div>

        <div
          v-if="form.rubriques.length === 0"
          class="salaire-config__empty"
        >
          Aucune rubrique. Le net correspond au salaire de base.
        </div>

        <div
          v-for="(rubrique, index) in form.rubriques"
          :key="index"
          class="rubrique-row"
        >
          <el-input
            v-model="rubrique.libelle"
            placeholder="Libellé (ex. prime de transport)"
            aria-label="Libellé de la rubrique"
          />
          <el-select
            v-model="rubrique.type"
            aria-label="Type de rubrique"
            style="width: 130px"
          >
            <el-option
              label="Fixe"
              value="fixe"
            />
            <el-option
              label="Journalier"
              value="journalier"
            />
          </el-select>
          <el-input-number
            v-if="rubrique.type === 'fixe'"
            v-model="rubrique.montant"
            :min="0"
            :step="500"
            :precision="0"
            controls-position="right"
            aria-label="Montant de la rubrique"
            placeholder="Montant"
          />
          <template v-else>
            <el-input-number
              v-model="rubrique.montantJour"
              :min="0"
              :step="500"
              :precision="0"
              controls-position="right"
              aria-label="Montant journalier"
              placeholder="Montant / jour"
            />
            <el-input-number
              v-model="rubrique.jours"
              :min="0"
              :max="31"
              :precision="0"
              controls-position="right"
              aria-label="Jours de la rubrique"
              placeholder="Jours"
              class="rubrique-row__jours"
            />
          </template>
          <el-checkbox v-model="rubrique.impactNet">
            Impact net
          </el-checkbox>
          <el-button
            text
            type="danger"
            :icon="Delete"
            aria-label="Supprimer la rubrique"
            @click="removeRubrique(index)"
          />
        </div>

        <p
          v-if="formError"
          class="salaire-config__error"
          role="alert"
        >
          {{ formError }}
        </p>
      </el-form>
    </div>

    <template #footer>
      <el-button @click="visible = false">
        Annuler
      </el-button>
      <el-button
        type="primary"
        :loading="saving"
        @click="save"
      >
        Enregistrer
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Delete, Plus } from '@element-plus/icons-vue'
import { useSalaires, computeSalaireNet, buildDefaultRubriques, SALAIRES_RUBRIQUES_DEFAUT } from '@/composables/useSalaires'
import type { SalaireConfigRow, SalaireRubriqueType } from '@/composables/useSalaires'
import { useCurrency } from '@/currency/useCurrency'

interface RubriqueDraft {
  libelle: string
  type: SalaireRubriqueType
  montant: number
  montantJour: number | null
  /** Nombre de jours explicite (journalier) ; null ⇒ jours travaillés. */
  jours: number | null
  impactNet: boolean
}

const emit = defineEmits<{ saved: [] }>()
const { saveConfig } = useSalaires()
const { formatCurrency } = useCurrency()

const visible = ref(false)
const saving = ref(false)
const formError = ref('')
const employeeLabel = ref('')
const userId = ref(0)
const periode = ref('')

const form = reactive({
  base: 0,
  joursTravailles: 0,
  rubriques: [] as RubriqueDraft[],
})

const net = computed(() =>
  computeSalaireNet({
    base: form.base,
    joursTravailles: form.joursTravailles,
    rubriques: form.rubriques,
  }),
)

/** Ouvre le dialogue pour un employé et une période. */
function open(row: SalaireConfigRow, targetPeriode: string) {
  userId.value = row.userId
  periode.value = targetPeriode
  employeeLabel.value = `${row.prenom} ${row.nom}`.trim()
  formError.value = ''

  const config = row.config
  form.base = Number(config?.base ?? 0)
  form.joursTravailles = Number(config?.joursTravailles ?? 0)
  form.rubriques = config
    ? (config.rubriques ?? []).map((rubrique) => ({
      libelle: String(rubrique.libelle ?? ''),
      type: rubrique.type === 'journalier' ? 'journalier' : 'fixe',
      montant: Number(rubrique.montant ?? 0),
      montantJour: rubrique.montantJour == null ? null : Number(rubrique.montantJour),
      jours: rubrique.jours == null ? null : Number(rubrique.jours),
      impactNet: rubrique.impactNet !== false,
    }))
    : buildDefaultRubriques().map((rubrique) => ({
      libelle: rubrique.libelle,
      type: rubrique.type,
      montant: rubrique.montant ?? 0,
      montantJour: rubrique.montantJour ?? null,
      jours: rubrique.jours ?? null,
      impactNet: rubrique.impactNet !== false,
    }))
  visible.value = true
}

function addRubrique() {
  form.rubriques.push({
    libelle: '',
    type: 'fixe',
    montant: 0,
    montantJour: null,
    jours: null,
    impactNet: true,
  })
}

/**
 * Ajoute les rubriques standard absentes du formulaire (comparaison sur le
 * libellé, insensible à la casse). Les rubriques existantes ne sont pas
 * écrasées : l'utilisateur conserve ses montants.
 */
function addStandardRubriques() {
  const existants = new Set(
    form.rubriques.map((rubrique) => rubrique.libelle.trim().toLocaleLowerCase('fr')),
  )
  let ajoutees = 0
  for (const defaut of SALAIRES_RUBRIQUES_DEFAUT) {
    if (existants.has(defaut.libelle.toLocaleLowerCase('fr'))) continue
    form.rubriques.push({
      libelle: defaut.libelle,
      type: defaut.type,
      montant: defaut.montant ?? 0,
      montantJour: defaut.montantJour ?? null,
      jours: defaut.jours ?? null,
      impactNet: defaut.impactNet !== false,
    })
    ajoutees++
  }
  if (ajoutees === 0) ElMessage.info('Les rubriques standard sont déjà présentes')
}

function removeRubrique(index: number) {
  form.rubriques.splice(index, 1)
}

function validate(): string | null {
  if (!Number.isFinite(form.base) || form.base < 0) return 'Le salaire de base doit être positif.'
  if (!Number.isFinite(form.joursTravailles) || form.joursTravailles < 0 || form.joursTravailles > 31) {
    return 'Les jours travaillés doivent être compris entre 0 et 31.'
  }
  for (let i = 0; i < form.rubriques.length; i++) {
    const rubrique = form.rubriques[i]
    if (!rubrique.libelle.trim()) return `Rubrique ${i + 1} : le libellé est requis.`
    if (rubrique.type === 'fixe') {
      if (!Number.isFinite(rubrique.montant) || rubrique.montant < 0) {
        return `Rubrique « ${rubrique.libelle} » : montant invalide.`
      }
    } else {
      if (rubrique.montantJour == null || !Number.isFinite(rubrique.montantJour) || rubrique.montantJour < 0) {
        return `Rubrique « ${rubrique.libelle} » : montant journalier invalide.`
      }
      if (rubrique.jours != null && (!Number.isFinite(rubrique.jours) || rubrique.jours < 0 || rubrique.jours > 31)) {
        return `Rubrique « ${rubrique.libelle} » : jours invalides (0 à 31).`
      }
    }
  }
  return null
}

async function save() {
  const validation = validate()
  if (validation) {
    formError.value = validation
    return
  }

  saving.value = true
  formError.value = ''
  try {
    await saveConfig({
      userId: userId.value,
      periode: periode.value,
      base: Math.round(form.base),
      joursTravailles: Math.round(form.joursTravailles),
      rubriques: form.rubriques.map((rubrique, index) => ({
        libelle: rubrique.libelle.trim(),
        type: rubrique.type,
        montant: rubrique.type === 'fixe' ? Math.round(rubrique.montant) : 0,
        montantJour: rubrique.type === 'journalier' ? Math.round(rubrique.montantJour ?? 0) : null,
        jours: rubrique.type === 'journalier' && rubrique.jours != null ? Math.round(rubrique.jours) : null,
        impactNet: rubrique.impactNet,
        ordre: index,
      })),
    })
    ElMessage.success('Configuration enregistrée')
    visible.value = false
    emit('saved')
  } catch {
    // ipcInvoke affiche déjà l'erreur backend ; le dialogue reste ouvert.
  } finally {
    saving.value = false
  }
}

defineExpose({ open })
</script>

<style scoped>
.salaire-config__employee {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: baseline;
  padding: 12px 14px;
  margin-bottom: 16px;
  background: var(--cd-gray-50);
  border-radius: var(--cd-radius-sm);
}

.salaire-config__employee span {
  font-size: 12px;
  color: var(--cd-gray-500);
}

.salaire-config__net {
  height: 32px;
  display: flex;
  align-items: center;
  font-weight: 700;
  color: var(--cd-primary-dark);
}

.salaire-config__rubriques-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin: 4px 0 10px;
}

.salaire-config__rubriques-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.salaire-config__rubriques-head h3 {
  margin: 0;
  font-size: 14px;
}

.salaire-config__rubriques-head p {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--cd-gray-500);
}

.salaire-config__empty {
  padding: 14px;
  text-align: center;
  font-size: 13px;
  color: var(--cd-gray-500);
  border: 1px dashed var(--cd-border);
  border-radius: var(--cd-radius-sm);
}

.rubrique-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 8px 0;
  border-bottom: 1px solid var(--cd-border);
}

.rubrique-row > :first-child {
  flex: 1 1 220px;
}

.rubrique-row :deep(.el-input-number) {
  width: 140px;
}

.rubrique-row :deep(.rubrique-row__jours) {
  width: 100px;
}

.salaire-config__error {
  margin-top: 12px;
  color: var(--cd-secondary);
  font-size: 13px;
}
</style>
