<!-- eslint-disable vue/no-mutating-props -- Les lignes sont mutées EN PLACE (référence partagée avec le parent) puis 'change' est émis -->
<template>
  <el-form label-position="top" class="tab-form">
    <CollapsibleSection :ref="setSectionRefCapture" title="Évolution pondérale et de la répartition de l’obésité" :default-open="true">
      <div class="history-table-wrap">
        <table class="history-table">
          <thead>
            <tr>
              <th>Date de consultation</th>
              <th>Poids (kg)</th>
              <th>IMC (kg/m²)</th>
              <th>Tour de taille (cm)</th>
              <th>Tour de hanche (cm)</th>
              <th>Commentaires</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr v-if="sortedLignes.length === 0">
              <td colspan="7" class="history-table__empty">
                Aucune ligne — cliquez sur « + Ajouter une ligne »
              </td>
            </tr>
            <tr v-for="l in sortedLignes" :key="l._key">
              <td class="col-date">
                <el-date-picker
                  v-model="l.date"
                  type="date"
                  value-format="YYYY-MM-DD"
                  format="DD/MM/YYYY"
                  size="small"
                  style="width:100%"
                  :disabled="props.readonly"
                  @change="emit('change')"
                />
              </td>
              <td class="col-num">
                <el-input-number
                  v-model="l.poids"
                  :min="0"
                  :max="300"
                  :step="0.1"
                  :precision="1"
                  size="small"
                  controls-position="right"
                  :disabled="props.readonly"
                  @change="() => onPoidsChange(l)"
                />
              </td>
              <td class="col-num">
                <el-input-number
                  v-model="l.imc"
                  :min="0"
                  :max="100"
                  :step="0.1"
                  :precision="1"
                  size="small"
                  controls-position="right"
                  :disabled="props.readonly"
                  title="IMC : saisie manuelle possible ; préservé comme snapshot historique"
                  @change="emit('change')"
                />
              </td>
              <td class="col-num">
                <el-input-number
                  v-model="l.tourTaille"
                  :min="0"
                  :max="300"
                  :step="0.5"
                  :precision="1"
                  size="small"
                  controls-position="right"
                  :disabled="props.readonly"
                  @change="emit('change')"
                />
              </td>
              <td class="col-num">
                <el-input-number
                  v-model="l.tourHanche"
                  :min="0"
                  :max="300"
                  :step="0.5"
                  :precision="1"
                  size="small"
                  controls-position="right"
                  :disabled="props.readonly"
                  @change="emit('change')"
                />
              </td>
              <td>
                <el-input v-model="l.commentaires" size="small" placeholder="Commentaires" :disabled="props.readonly" @change="emit('change')" />
              </td>
              <td class="history-table__actions">
                <el-button v-if="!props.readonly" size="small" type="danger" :icon="Delete" title="Supprimer la ligne" @click="removeLigne(l)" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="!props.readonly" class="evolution__actions">
        <el-button size="small" type="primary" :icon="Plus" @click="addLigne">
          + Ajouter une ligne
        </el-button>
      </div>
      <p class="evolution__hint">
        L’IMC est un snapshot historique : il est calculé automatiquement quand le poids change
        (si la taille est connue) mais reste modifiable et n’est pas recalculé rétroactivement.
      </p>
    </CollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Évolution pondérale"
        variant="compact"
        :hide-header="true"
        :fields="evolutionPreviewFields"
        empty-text="Aucune ligne renseignée"
        @edit="() => openSection()"
      />
    </div>
  </el-form>
</template>

<script setup lang="ts">
/* eslint-disable vue/no-mutating-props -- Mutations en place du tableau de lignes partagé par référence avec le parent (push/splice/v-model), déclenchées par émission explicite de 'change' */
import { ref, computed, nextTick } from 'vue'
import { Plus, Delete } from '@element-plus/icons-vue'
import type { CrcObesiteFormData, EvolutionPonderaleLigne } from '@/types/crc-obesite'
import { calcIMC } from '@/utils/medical-calculations'
import CollapsibleSection from '@/components/common/CollapsibleSection.vue'
import FormPreview, { type FormPreviewField } from '@/components/common/FormPreview.vue'

const props = withDefaults(defineProps<{
  data: CrcObesiteFormData['evolutionPonderale']
  readonly?: boolean
}>(), {
  readonly: false,
})

const emit = defineEmits<{ change: [] }>()

const sectionRef = ref<InstanceType<typeof CollapsibleSection> | null>(null)

function setSectionRefCapture(el: unknown) {
  sectionRef.value = el as InstanceType<typeof CollapsibleSection> | null
}

async function openSection() {
  sectionRef.value?.open()
  await nextTick()
  sectionRef.value?.$el?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
}

// Affichage trié par date décroissante (l'ordre de saisie sous-jacent reste inchangé).
const sortedLignes = computed<EvolutionPonderaleLigne[]>(() =>
  [...(props.data.lignes ?? [])].sort((a, b) => b.date.localeCompare(a.date)),
)

function formatDateFR(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const evolutionPreviewFields = computed<FormPreviewField[]>(() =>
  sortedLignes.value.map((l, i) => ({
    label: `Ligne ${i + 1} — ${formatDateFR(l.date)}`,
    value: [
      l.poids != null ? `${l.poids} kg` : null,
      l.imc != null ? `IMC ${l.imc} kg/m²` : null,
      l.tourTaille != null ? `TT ${l.tourTaille} cm` : null,
      l.tourHanche != null ? `TH ${l.tourHanche} cm` : null,
      l.commentaires || null,
    ]
      .filter(Boolean)
      .join(' · ') || null,
    key: `evolutionPonderale.lignes.${l._key}`,
  })),
)

/**
 * IMC snapshot : calculé depuis poids + taille connue au moment de la saisie.
 * La ligne ne porte pas de taille (voir crc-obesite.ts) : on tente
 * calcIMC(poids, taille de la ligne si présente, sinon null) et on ne
 * remplit que si le calcul aboutit — sinon l'IMC reste éditable manuellement.
 * Ne réévalue jamais l'IMC des lignes existantes (pas de recalcul rétroactif).
 */
function onPoidsChange(ligne: EvolutionPonderaleLigne) {
  if (props.readonly) return
  const taille = (ligne as unknown as Record<string, unknown>).taille as number | null | undefined
  const calculated = calcIMC(ligne.poids, taille ?? null)
  if (calculated != null) {
    ligne.imc = calculated
  }
  emit('change')
}

function addLigne(): void {
  if (props.readonly) return
  props.data.lignes.push({
    _key: crypto.randomUUID(),
    date: '',
    poids: null,
    imc: null,
    tourTaille: null,
    tourHanche: null,
    commentaires: '',
  })
  emit('change')
}

function removeLigne(l: EvolutionPonderaleLigne): void {
  if (props.readonly) return
  const idx = props.data.lignes.indexOf(l)
  if (idx !== -1) {
    props.data.lignes.splice(idx, 1)
    emit('change')
  }
}
</script>

<style scoped>
.section-preview {
  margin: 8px 0 16px;
}
.evolution__actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}
.evolution__hint {
  margin: 8px 0 0;
  font-size: 11px;
  color: var(--el-text-color-secondary);
  font-style: italic;
}
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
.history-table td .el-input,
.history-table td .el-input-number,
.history-table td .el-date-editor {
  width: 100%;
}
.col-date {
  min-width: 150px;
}
.col-num {
  min-width: 110px;
}
</style>
