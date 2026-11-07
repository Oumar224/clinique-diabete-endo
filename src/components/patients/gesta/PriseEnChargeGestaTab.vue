<!-- PriseEnChargeGestaTab — CRC Diabète gestationnel : traitement actuel,
  tableau d'insulinothérapie, protocole d'insulinothérapie chez la femme
  enceinte et examen physique. Même pattern que MotifProfilObesiteTab :
  une StagedCollapsibleSection par bloc, `draft` isolé tant que
  `Enregistrer` n'a pas été cliqué, puis `change` émis au `save`. Les
  mutations du tableau des insulines sont faites en place sur
  `draft.insulines` (push/splice + `_key` crypto.randomUUID) ;
  `:disabled="readonly"` partout, boutons add/remove masqués si readonly.
  Le protocole n'est qu'une aide affichée en lecture seule (règles
  statiques, seuils, cibles) : aucune dose n'est jamais calculée.
-->
<template>
  <el-form label-position="top" class="tab-form">
    <StagedCollapsibleSection
      :ref="setSectionRef('traitement')"
      title="Traitement actuel"
      :keys="['traitements', 'autreDetail']"
      :model-value="props.data"
      :readonly="readonly"
      @save="emit('change')"
    >
      <template #default="{ draft }">
        <el-form-item label="Traitement actuel">
          <el-checkbox-group v-model="draft.traitements" :disabled="readonly">
            <el-checkbox value="mhd">{{ TRAITEMENT_LABELS.mhd }}</el-checkbox>
            <el-checkbox value="insuline">{{ TRAITEMENT_LABELS.insuline }}</el-checkbox>
            <el-checkbox value="ado">{{ TRAITEMENT_LABELS.ado }}</el-checkbox>
            <el-checkbox value="autre">{{ TRAITEMENT_LABELS.autre }}</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item
          v-if="Array.isArray(draft.traitements) && draft.traitements.includes('autre')"
          label="Autre traitement (préciser)"
        >
          <el-input
            v-model="draft.autreDetail"
            type="textarea"
            :rows="2"
            :disabled="readonly"
            placeholder="Préciser l'autre traitement…"
          />
        </el-form-item>
      </template>
    </StagedCollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Traitement actuel"
        variant="compact"
        :fields="traitementPreviewFields"
        @edit="() => openSection('traitement')"
      />
    </div>

    <StagedCollapsibleSection
      :ref="setSectionRef('insulines')"
      title="Insulinothérapie"
      :keys="['insulines']"
      :model-value="props.data"
      :readonly="readonly"
      @save="emit('change')"
    >
      <template #default="{ draft }">
        <div v-if="draft.insulines.length === 0" class="entry-empty">
          Aucune insuline renseignée
        </div>
        <div v-else class="history-table-wrap">
          <table class="history-table">
            <thead>
              <tr>
                <th>Insuline</th>
                <th style="width: 140px">Dose (UI)</th>
                <th style="width: 160px">Horaire</th>
                <th v-if="!readonly" style="width: 60px">
                  <span class="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(line, idx) in draft.insulines" :key="line._key || idx">
                <td>
                  <el-input v-model="line.insuline" :disabled="readonly" placeholder="Insuline" />
                </td>
                <td>
                  <el-input-number
                    v-model="line.dose"
                    :min="0"
                    :precision="0"
                    :disabled="readonly"
                    controls-position="right"
                  />
                </td>
                <td>
                  <el-input v-model="line.horaire" :disabled="readonly" placeholder="Horaire" />
                </td>
                <td v-if="!readonly" class="history-table__actions">
                  <button
                    type="button"
                    class="entry-delete"
                    title="Supprimer"
                    @click="removeInsuline(draft.insulines, idx)"
                  >
                    <el-icon :size="14"><Delete /></el-icon>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="!readonly" class="insulines-actions">
          <el-button type="primary" @click="addInsuline(draft.insulines)">
            <el-icon><Plus /></el-icon>
            Ajouter une insuline
          </el-button>
        </div>
      </template>
    </StagedCollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Insulinothérapie"
        variant="compact"
        :fields="insulinesPreviewFields"
        empty-text="Aucune insuline renseignée"
        @edit="() => openSection('insulines')"
      />
    </div>

    <StagedCollapsibleSection
      :ref="setSectionRef('protocole')"
      title="Protocole d'insulinothérapie chez la femme enceinte"
      :keys="['protocole']"
      :model-value="props.data"
      :readonly="readonly"
      @save="emit('change')"
    >
      <template #default="{ draft }">
        <el-form-item label="Variante du protocole">
          <el-radio-group v-model="draft.protocole.variante" :disabled="readonly">
            <el-radio value="insulatard">Insuline semi-lente Insulatard</el-radio>
            <el-radio value="lente">Insuline lente</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-row v-if="draft.protocole.variante === 'insulatard'" :gutter="16">
          <el-col :span="8">
            <el-form-item label="Insulatard — dose du matin (UI)">
              <el-input-number
                v-model="draft.protocole.insulatardMatin"
                :min="0"
                :precision="0"
                controls-position="right"
                style="width:100%"
                :disabled="readonly"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="Insulatard — dose du soir (UI)">
              <el-input-number
                v-model="draft.protocole.insulatardSoir"
                :min="0"
                :precision="0"
                controls-position="right"
                style="width:100%"
                :disabled="readonly"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="Date de remise">
              <el-date-picker
                v-model="draft.protocole.dateRemise"
                type="date"
                value-format="YYYY-MM-DD"
                format="DD/MM/YYYY"
                style="width:100%"
                :disabled="readonly"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row v-if="draft.protocole.variante === 'lente'" :gutter="16">
          <el-col :span="8">
            <el-form-item label="Insuline lente — dose du soir (UI)">
              <el-input-number
                v-model="draft.protocole.lenteSoir"
                :min="0"
                :precision="0"
                controls-position="right"
                style="width:100%"
                :disabled="readonly"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="Date de remise">
              <el-date-picker
                v-model="draft.protocole.dateRemise"
                type="date"
                value-format="YYYY-MM-DD"
                format="DD/MM/YYYY"
                style="width:100%"
                :disabled="readonly"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item v-if="draft.protocole.variante === ''" label="Date de remise">
          <el-date-picker
            v-model="draft.protocole.dateRemise"
            type="date"
            value-format="YYYY-MM-DD"
            format="DD/MM/YYYY"
            style="width:100%"
            :disabled="readonly"
          />
        </el-form-item>

        <el-form-item label="Commentaires">
          <el-input
            v-model="draft.protocole.commentaires"
            type="textarea"
            :rows="2"
            :disabled="readonly"
            placeholder="Commentaires sur le protocole…"
          />
        </el-form-item>

        <div class="protocole-info">
          <p class="protocole-cibles">
            Cibles glycémiques : à jeun &lt; {{ fmtCible(CIBLES_GLYCEMIQUES.gaj) }} g/L ·
            post-prandiale 1 h &lt; {{ fmtCible(CIBLES_GLYCEMIQUES.pp1h) }} g/L ·
            post-prandiale 2 h &lt; {{ fmtCible(CIBLES_GLYCEMIQUES.pp2h) }} g/L.
          </p>

          <h4 class="protocole-subtitle">Insuline semi-lente Insulatard</h4>
          <ul class="protocole-rules">
            <li v-for="regle in PROTOCOLE_INSULATARD_REGLES" :key="regle">
              {{ regle }}
            </li>
          </ul>

          <h4 class="protocole-subtitle">Insuline lente</h4>
          <ul class="protocole-rules">
            <li v-for="regle in PROTOCOLE_LENTE_REGLES" :key="regle">
              {{ regle }}
            </li>
          </ul>

          <h4 class="protocole-subtitle">Glycémie mesurée — conduite à tenir</h4>
          <div class="history-table-wrap">
            <table class="history-table">
              <thead>
                <tr>
                  <th>Glycémie mesurée</th>
                  <th>Petit-déjeuner</th>
                  <th>Déjeuner</th>
                  <th>Dîner</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="seuil in PROTOCOLE_SEUILS" :key="seuil.label">
                  <td>{{ seuil.label }}</td>
                  <td>{{ seuil.conseil ?? '' }}</td>
                  <td>{{ seuil.conseil ?? '' }}</td>
                  <td>{{ seuil.conseil ?? '' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>
    </StagedCollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Protocole d'insulinothérapie chez la femme enceinte"
        variant="compact"
        :fields="protocolePreviewFields"
        @edit="() => openSection('protocole')"
      />
    </div>

    <StagedCollapsibleSection
      :ref="setSectionRef('examen')"
      title="Examen physique"
      :keys="['texte']"
      :model-value="examenWrap"
      :readonly="readonly"
      @save="onExamenSave"
    >
      <template #default="{ draft }">
        <el-form-item label="Examen physique">
          <el-input
            v-model="draft.texte"
            type="textarea"
            :rows="4"
            :disabled="readonly"
            placeholder="Décrire l'examen physique…"
          />
        </el-form-item>
      </template>
    </StagedCollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Examen physique"
        variant="compact"
        :fields="examenPreviewFields"
        @edit="() => openSection('examen')"
      />
    </div>
  </el-form>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { Delete, Plus } from '@element-plus/icons-vue'
import type { CrcGestaFormData, LigneInsulineGesta } from '@/types/crc-gesta'
import { TRAITEMENT_LABELS } from '@/types/crc-gesta'
import {
  CIBLES_GLYCEMIQUES,
  PROTOCOLE_INSULATARD_REGLES,
  PROTOCOLE_LENTE_REGLES,
  PROTOCOLE_SEUILS,
} from '@/utils/gesta-protocol'
import { formatDate } from '@/utils/date'
import StagedCollapsibleSection from '@/components/common/StagedCollapsibleSection.vue'
import FormPreview from '@/components/common/FormPreview.vue'
import type { FormPreviewField } from '@/components/common/FormPreview.vue'

const props = withDefaults(defineProps<{
  data: CrcGestaFormData['priseEnCharge']
  examenCliniqueTexte: string
  readonly?: boolean
}>(), {
  readonly: false,
})

const emit = defineEmits<{
  change: []
  'update:examenCliniqueTexte': [value: string]
}>()

const sectionRefs = ref<Record<string, InstanceType<typeof StagedCollapsibleSection> | null>>({})

function setSectionRef(key: string) {
  return (el: unknown) => {
    sectionRefs.value[key] = el as InstanceType<typeof StagedCollapsibleSection> | null
  }
}

async function openSection(key: string) {
  const section = sectionRefs.value[key]
  if (section && typeof section.open === 'function') {
    section.open()
  }
  await nextTick()
  sectionRefs.value[key]?.$el?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
}

const traitementPreviewFields = computed<FormPreviewField[]>(() => {
  const fields: FormPreviewField[] = [
    {
      label: 'Traitement(s) actuel(s)',
      value: props.data.traitements?.length
        ? props.data.traitements.map(t => TRAITEMENT_LABELS[t] ?? t).join(', ')
        : '',
    },
  ]
  if (props.data.autreDetail?.trim()) {
    fields.push({ label: 'Autre traitement', value: props.data.autreDetail })
  }
  return fields
})

const insulinesPreviewFields = computed<FormPreviewField[]>(() =>
  (props.data.insulines ?? []).map((line, i) => ({
    label: `Insuline ${i + 1}`,
    value: `${line.insuline?.trim() || '—'} — ${line.dose != null ? `${line.dose} UI` : '—'} — ${line.horaire?.trim() || '—'}`,
  })),
)

const VARIANTE_LABELS: Record<string, string> = {
  insulatard: 'Insuline semi-lente Insulatard',
  lente: 'Insuline lente',
}

function doseText(value: number | null): string {
  return value != null ? `${value} UI` : 'non renseignée'
}

const protocolePreviewFields = computed<FormPreviewField[]>(() => {
  const p = props.data.protocole
  const doses = p.variante === 'insulatard'
    ? `Matin : ${doseText(p.insulatardMatin)} · Soir : ${doseText(p.insulatardSoir)}`
    : p.variante === 'lente'
      ? `Soir : ${doseText(p.lenteSoir)}`
      : ''
  return [
    {
      label: 'Variante',
      value: p.variante ? (VARIANTE_LABELS[p.variante] ?? p.variante) : '',
    },
    { label: 'Doses', value: doses },
    { label: 'Date de remise', value: p.dateRemise ? formatDate(p.dateRemise) : '' },
    { label: 'Commentaires', value: p.commentaires },
  ]
})

const examenPreviewFields = computed<FormPreviewField[]>(() => [
  { label: 'Examen physique', value: props.examenCliniqueTexte },
])

// Mutation en place du tableau édité (le draft), comme addTentative dans
// MotifProfilObesiteTab ; `crypto.randomUUID` garantit la clé stable de
// chaque ligne.
function addInsuline(list: LigneInsulineGesta[]) {
  list.push({ _key: crypto.randomUUID(), insuline: '', dose: null, horaire: '' })
}

function removeInsuline(list: LigneInsulineGesta[], index: number) {
  list.splice(index, 1)
}

function fmtCible(value: number): string {
  return String(value).replace('.', ',')
}

// `examenCliniqueTexte` est une chaîne primitive : le Staged travaille sur
// un objet — on enveloppe la valeur et on la resynchronise depuis la prop.
// Au save, la valeur commitée est ré-émise vers le parent (update + change).
const examenWrap = reactive({ texte: props.examenCliniqueTexte })

watch(
  () => props.examenCliniqueTexte,
  (value) => {
    examenWrap.texte = value
  },
)

function onExamenSave() {
  emit('update:examenCliniqueTexte', examenWrap.texte)
  emit('change')
}
</script>

<style scoped>
.section-preview {
  margin: 8px 0 16px;
}
.entry-empty {
  padding: 14px 16px;
  text-align: center;
  color: var(--cde-muted);
  font-size: 13px;
  font-style: italic;
  background: var(--cde-surface-tint);
  border: 1px dashed var(--cde-border);
  border-radius: 6px;
  margin-bottom: 20px;
}
.insulines-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
.entry-delete {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--cde-muted);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.entry-delete:hover {
  background: var(--cde-danger-tint);
  color: var(--cde-danger);
  border-color: color-mix(in srgb, var(--cde-danger) 20%, transparent);
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
}
.history-table tbody td {
  padding: 7px 10px;
  border-bottom: 1px solid var(--cde-border-soft);
  color: var(--cde-muted);
}
.history-table tbody tr:last-child td {
  border-bottom: none;
}
.history-table__actions {
  white-space: nowrap;
  text-align: right;
}
.history-table td .el-input,
.history-table td .el-input-number {
  width: 100%;
}
.protocole-info {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--cde-border-soft);
}
.protocole-cibles {
  margin: 0 0 12px;
  font-size: 12px;
  color: var(--el-text-color-primary);
  font-weight: 600;
}
.protocole-subtitle {
  margin: 12px 0 6px;
  font-size: 12px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}
.protocole-rules {
  margin: 0 0 4px;
  padding-left: 18px;
  font-size: 11px;
  color: var(--el-text-color-secondary);
}
.protocole-rules li {
  margin-bottom: 3px;
  line-height: 1.45;
}
</style>
