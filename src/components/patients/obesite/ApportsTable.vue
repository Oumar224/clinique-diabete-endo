<!-- ApportsTable — tableau partagé des apports alimentaires (CRC Obésité).
     Les lignes sont mutées EN PLACE (référence partagée avec le parent) puis
     'change' est émis ; l'objectif journalier (primitive) passe par un v-model.
     Usage :
       <ApportsTable
         :lignes="apports.lignes"
         v-model:objectif-jour-kcal="apports.objectifJourKcal"
         :readonly="readonly"
         title="Apports alimentaires"
         @change="emit('change')"
       />
-->
<template>
  <!-- eslint-disable vue/no-mutating-props -- Voir le script : mutations en place du tableau de lignes + 'change' explicite -->
  <section class="apports-table">
    <header class="apports-table__header">
      <h4 class="apports-table__title">
        {{ props.title ?? 'Apports alimentaires' }}
      </h4>
      <div class="apports-table__goal">
        <span class="apports-table__goal-label">Objectif journalier (Kcal)</span>
        <el-input-number
          v-model="objectifJourKcal"
          class="apports-table__goal-input"
          :min="0"
          :precision="0"
          size="small"
          controls-position="right"
          :disabled="props.readonly"
          @change="emit('change')"
        />
        <span class="apports-table__goal-ecart">
          Écart journalier : <strong>{{ ecartJourLabel }}</strong>
        </span>
      </div>
    </header>

    <div class="history-table-wrap">
      <table class="history-table">
        <thead>
          <tr>
            <th>Repas</th>
            <th>Aliments</th>
            <th>Catégorie</th>
            <th>Quantité</th>
            <th>Unité</th>
            <th>Équiv./g</th>
            <th>Apport kcal</th>
            <th>Objectif kcal</th>
            <th>Écart kcal</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr v-if="props.lignes.length === 0">
            <td
              colspan="10"
              class="history-table__empty"
            >
              Aucune ligne — cliquez sur « + Ajouter une ligne »
            </td>
          </tr>
          <template
            v-for="g in groupes"
            :key="g.repas"
          >
            <tr class="apports-table__group">
              <td colspan="6">
                Sous-total — {{ REPAS_LABELS[g.repas] }}
              </td>
              <td>{{ fmtKcal(g.totaux.kcal) }}</td>
              <td>{{ fmtObjectif(g.totaux) }}</td>
              <td>{{ fmtEcart(g.totaux.ecart) }}</td>
              <td />
            </tr>
            <tr
              v-for="l in g.lignes"
              :key="l._key"
            >
              <td>
                <el-select
                  v-model="l.repas"
                  size="small"
                  :disabled="props.readonly"
                  @change="emit('change')"
                >
                  <el-option
                    v-for="opt in REPAS_OPTIONS"
                    :key="opt.value"
                    :label="opt.label"
                    :value="opt.value"
                  />
                </el-select>
              </td>
              <td>
                <el-input
                  v-model="l.aliment"
                  size="small"
                  placeholder="Aliment"
                  :disabled="props.readonly"
                  @change="emit('change')"
                />
              </td>
              <td>
                <el-select
                  v-model="l.categorie"
                  size="small"
                  :disabled="props.readonly"
                  @change="emit('change')"
                >
                  <el-option
                    v-for="opt in CATEGORIES"
                    :key="opt.value"
                    :label="opt.label"
                    :value="opt.value"
                  />
                </el-select>
              </td>
              <td>
                <el-input-number
                  v-model="l.quantite"
                  :min="0"
                  :step="0.1"
                  size="small"
                  controls-position="right"
                  :disabled="props.readonly"
                  @change="emit('change')"
                />
              </td>
              <td>
                <el-input
                  v-model="l.unite"
                  size="small"
                  placeholder="g, kg, ml…"
                  :disabled="props.readonly"
                  @change="emit('change')"
                />
              </td>
              <td>
                <el-input-number
                  v-model="l.equivalentParGramme"
                  :min="0"
                  :step="0.01"
                  size="small"
                  controls-position="right"
                  :disabled="props.readonly"
                  @change="emit('change')"
                />
              </td>
              <td>
                <el-input-number
                  v-if="l.categorie === 'autres'"
                  v-model="l.kcalManuel"
                  :min="0"
                  :step="1"
                  :precision="0"
                  size="small"
                  controls-position="right"
                  :disabled="props.readonly"
                  title="Kcal manuels (catégorie Autres)"
                  @change="emit('change')"
                />
                <el-input
                  v-else
                  :model-value="fmtKcal(kcalLigne(l))"
                  size="small"
                  disabled
                />
              </td>
              <td>
                <el-input-number
                  v-model="l.objectifKcal"
                  :min="0"
                  :step="1"
                  :precision="0"
                  size="small"
                  controls-position="right"
                  :disabled="props.readonly"
                  @change="emit('change')"
                />
              </td>
              <td>
                <el-input
                  :model-value="fmtEcart(ecartLigne(l))"
                  size="small"
                  disabled
                />
              </td>
              <td class="history-table__actions">
                <el-button
                  v-if="!props.readonly"
                  size="small"
                  type="danger"
                  :icon="Delete"
                  title="Supprimer la ligne"
                  @click="removeLigne(l)"
                />
              </td>
            </tr>
          </template>
          <tr class="apports-table__total">
            <td colspan="6">
              <strong>Total</strong>
            </td>
            <td>{{ fmtKcal(totauxJournal.kcal) }}</td>
            <td>{{ fmtObjectif(totauxJournal) }}</td>
            <td>{{ fmtEcart(totauxJournal.ecart) }}</td>
            <td />
          </tr>
        </tbody>
      </table>
    </div>

    <div
      v-if="!props.readonly"
      class="apports-table__actions"
    >
      <el-button
        size="small"
        type="primary"
        :icon="Plus"
        @click="addLigne"
      >
        + Ajouter une ligne
      </el-button>
    </div>
  </section>
</template>

<script setup lang="ts">
/* eslint-disable vue/no-mutating-props -- Mutations en place du tableau de lignes partagé par référence avec le parent (push/splice/v-model sur les champs), déclenchées par émission explicite de 'change' */
import { computed } from 'vue'
import { Plus, Delete } from '@element-plus/icons-vue'
import type { ApportLigne } from '@/types/crc-obesite'
import { kcalLigne, ecartLigne, totauxApports, ecartJour } from '@/utils/apports-alimentaires'

type RepasKey = ApportLigne['repas']
type CategorieNutriment = ApportLigne['categorie']
type TotauxApports = ReturnType<typeof totauxApports>

const props = defineProps<{
  lignes: ApportLigne[]
  readonly?: boolean
  title?: string
}>()

// Primitive non mutable par référence : v-model:objectif-jour-kcal (mise à jour du parent).
const objectifJourKcal = defineModel<number | null>('objectifJourKcal', { default: null })

const emit = defineEmits<{ change: [] }>()

const REPAS_ORDER: RepasKey[] = ['matin', 'midi', 'soir', 'grignotage']
const REPAS_LABELS: Record<RepasKey, string> = {
  matin: 'Matin',
  midi: 'Midi',
  soir: 'Soir',
  grignotage: 'Grignotage',
}
const REPAS_OPTIONS = REPAS_ORDER.map((value) => ({ value, label: REPAS_LABELS[value] }))
const CATEGORIES: Array<{ value: CategorieNutriment; label: string }> = [
  { value: 'glucides', label: 'Glucides' },
  { value: 'lipides', label: 'Lipides' },
  { value: 'protides', label: 'Protides' },
  { value: 'autres', label: 'Autres' },
]

interface GroupeApports {
  repas: RepasKey
  lignes: ApportLigne[]
  totaux: TotauxApports
}

// Groupes non vides dans l'ordre matin → midi → soir → grignotage, sous-totaux via totauxApports().
const groupes = computed<GroupeApports[]>(() =>
  REPAS_ORDER
    .map((repas) => {
      const lignes = props.lignes.filter((l) => l.repas === repas)
      return { repas, lignes, totaux: totauxApports(lignes) }
    })
    .filter((g) => g.lignes.length > 0),
)

const totauxJournal = computed<TotauxApports>(() => totauxApports(props.lignes))
const ecartJournalier = computed<number | null>(() =>
  ecartJour({ lignes: props.lignes, objectifJourKcal: objectifJourKcal.value }),
)
const ecartJourLabel = computed<string>(() =>
  ecartJournalier.value == null ? '—' : `${fmtEcart(ecartJournalier.value)} kcal`,
)

function fmtKcal(v: number | null): string {
  return v == null ? '—' : `${v} kcal`
}

function fmtEcart(v: number | null): string {
  if (v == null) return '—'
  return v > 0 ? `+${v}` : `${v}`
}

// totauxApports() : ecart == null <=> aucun objectif renseigné (objectif reste à 0, on affiche '—').
function fmtObjectif(t: TotauxApports): string {
  return t.ecart == null ? '—' : fmtKcal(t.objectif)
}

function addLigne(): void {
  if (props.readonly) return
  props.lignes.push({
    _key: crypto.randomUUID(),
    repas: 'matin',
    aliment: '',
    categorie: 'autres',
    quantite: null,
    unite: 'g',
    equivalentParGramme: null,
    kcalManuel: null,
    objectifKcal: null,
  })
  emit('change')
}

function removeLigne(l: ApportLigne): void {
  if (props.readonly) return
  const idx = props.lignes.indexOf(l)
  if (idx !== -1) {
    props.lignes.splice(idx, 1)
    emit('change')
  }
}
</script>

<style scoped lang="scss">
.apports-table__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}
.apports-table__title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}
.apports-table__goal {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.apports-table__goal-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-regular);
}
.apports-table__goal-input {
  width: 150px;
}
.apports-table__goal-ecart {
  font-size: 12px;
  color: var(--el-text-color-regular);
}
.apports-table__goal-ecart strong {
  color: var(--el-text-color-primary);
  font-weight: 700;
}
.apports-table__actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}

/* History table — même style que BilanInitialTab.vue */
.history-table-wrap {
  margin-bottom: 16px;
  overflow-x: auto;
}
.history-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  background: var(--cde-surface);
  border: 1px solid var(--cde-border);
  border-radius: 6px;
  overflow: hidden;
}
.history-table thead th {
  background: var(--cde-header-bg);
  color: var(--cde-header-text);
  font-weight: 600;
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 0.3px;
  padding: 8px 10px;
  text-align: left;
  border-bottom: 1px solid var(--cde-border);
  white-space: nowrap;
}
.history-table tbody td {
  padding: 7px 10px;
  border-bottom: 1px solid var(--cde-border-soft);
  color: var(--cde-muted);
}
.history-table tbody tr:last-child td {
  border-bottom: none;
}
.history-table tbody tr:hover {
  background: var(--cde-surface-tint);
}
.history-table__actions {
  white-space: nowrap;
  text-align: right;
}
.history-table__empty {
  text-align: center;
  color: var(--cde-muted);
  font-style: italic;
  padding: 16px 10px;
}

/* Lignes de groupe (sous-totaux par repas) et de total */
.apports-table__group td,
.apports-table__total td {
  background: var(--cde-surface-tint);
  font-weight: 700;
  color: var(--el-text-color-primary);
}
.apports-table__total td {
  border-top: 1px solid var(--cde-border);
}

/* Champs à pleine largeur dans les cellules du tableau */
.history-table td .el-input,
.history-table td .el-select,
.history-table td .el-input-number {
  width: 100%;
}
</style>
