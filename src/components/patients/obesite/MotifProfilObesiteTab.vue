<!-- MotifProfilObesiteTab — CRC Obésité : motif de consultation, histoire pondérale, tentatives.
  Mêmes principes que AdmissionTab/ModeVieAtcdTab : une StagedCollapsibleSection par
  bloc, un `draft` isolé tant que `Enregistrer` n'a pas été cliqué, puis `change`
  émis au `save`. Le tableau des tentatives mute `draft.tentatives` en place
  (push/splice, comme les allergies d'antécédents dans ModeVieAtcdTab) et n'est
  commité qu'au save via la section ; les boutons ajout/suppression sont masqués
  si `readonly`.
  Questions 1-4 du § « MOTIF DE CONSULTATION ET PROFIL » du formulaire papier.
-->
<template>
  <el-form label-position="top" class="tab-form">
    <StagedCollapsibleSection
      :ref="setSectionRef('motif')"
      title="Motif de consultation"
      :keys="['motifs']"
      :model-value="data"
      :readonly="readonly"
      @save="emit('change')"
    >
      <template #default="{ draft }">
        <el-form-item label="Quel est le motif de consultation aujourd'hui ?">
          <el-checkbox-group v-model="draft.motifs" :disabled="readonly">
            <el-checkbox value="perte_poids">Perte de poids</el-checkbox>
            <el-checkbox value="bilan">Bilan</el-checkbox>
            <el-checkbox value="chirurgie">Chirurgie</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
      </template>
    </StagedCollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Motif de consultation"
        variant="compact"
        :fields="motifPreviewFields"
        @edit="() => openSection('motif')"
      />
    </div>

    <StagedCollapsibleSection
      :ref="setSectionRef('histoire')"
      title="Histoire pondérale"
      :keys="['prisePoidsMois', 'prisePoidsAnnee', 'poidsPlusBas', 'poidsPlusHaut']"
      :model-value="data"
      :readonly="readonly"
      @save="emit('change')"
    >
      <template #default="{ draft }">
        <el-row :gutter="16">
          <el-col :span="6">
            <el-form-item label="Prise de poids — mois">
              <el-input-number
                v-model="draft.prisePoidsMois"
                :min="0"
                :precision="0"
                :disabled="readonly"
                controls-position="right"
                style="width:100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="Prise de poids — année">
              <el-input-number
                v-model="draft.prisePoidsAnnee"
                :min="0"
                :precision="0"
                :disabled="readonly"
                controls-position="right"
                style="width:100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="Poids le plus bas (kg)">
              <el-input-number
                v-model="draft.poidsPlusBas"
                :min="0"
                :precision="1"
                :disabled="readonly"
                controls-position="right"
                style="width:100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="Poids le plus haut (kg)">
              <el-input-number
                v-model="draft.poidsPlusHaut"
                :min="0"
                :precision="1"
                :disabled="readonly"
                controls-position="right"
                style="width:100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </template>
    </StagedCollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Histoire pondérale"
        variant="compact"
        :fields="histoirePreviewFields"
        @edit="() => openSection('histoire')"
      />
    </div>

    <StagedCollapsibleSection
      :ref="setSectionRef('tentatives')"
      title="Tentatives de perte de poids"
      :keys="['tentatives']"
      :model-value="data"
      :readonly="readonly"
      @save="emit('change')"
    >
      <template #default="{ draft }">
        <div v-if="draft.tentatives.length === 0" class="entry-empty">
          Aucune tentative renseignée
        </div>
        <div v-else class="history-table-wrap">
          <table class="history-table">
            <thead>
              <tr>
                <th>Méthode</th>
                <th style="width: 180px">Résultat (kg)</th>
                <th v-if="!readonly" style="width: 60px">
                  <span class="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(t, idx) in draft.tentatives" :key="t._key || idx">
                <td>
                  <el-input v-model="t.methode" :disabled="readonly" placeholder="Méthode utilisée" />
                </td>
                <td>
                  <el-input-number
                    v-model="t.resultatKg"
                    :min="0"
                    :precision="1"
                    :disabled="readonly"
                    controls-position="right"
                  />
                </td>
                <td v-if="!readonly" class="history-table__actions">
                  <button
                    type="button"
                    class="entry-delete"
                    title="Supprimer"
                    @click="removeTentative(draft.tentatives, idx)"
                  >
                    <el-icon :size="14"><Delete /></el-icon>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="!readonly" class="tentatives-actions">
          <el-button type="primary" @click="addTentative(draft.tentatives)">
            <el-icon><Plus /></el-icon>
            Ajouter une tentative
          </el-button>
        </div>
      </template>
    </StagedCollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Tentatives de perte de poids"
        variant="compact"
        :fields="tentativesPreviewFields"
        empty-text="Aucune tentative renseignée"
        @edit="() => openSection('tentatives')"
      />
    </div>
  </el-form>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { Delete, Plus } from '@element-plus/icons-vue'
import type { CrcObesiteFormData, TentativePertePoids } from '@/types/crc-obesite'
import StagedCollapsibleSection from '@/components/common/StagedCollapsibleSection.vue'
import FormPreview from '@/components/common/FormPreview.vue'
import type { FormPreviewField } from '@/components/common/FormPreview.vue'

const props = withDefaults(defineProps<{
  data: CrcObesiteFormData['motifProfil']
  readonly?: boolean
}>(), {
  readonly: false,
})

const emit = defineEmits<{
  change: []
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

const MOTIF_LABELS: Record<string, string> = {
  perte_poids: 'Perte de poids',
  bilan: 'Bilan',
  chirurgie: 'Chirurgie',
}

const motifPreviewFields = computed<FormPreviewField[]>(() => [
  {
    label: 'Motif(s) de consultation',
    value: props.data.motifs?.length
      ? props.data.motifs.map(m => MOTIF_LABELS[m] ?? m).join(', ')
      : '',
  },
])

const histoirePreviewFields = computed<FormPreviewField[]>(() => [
  { label: 'Prise de poids (mois)', value: props.data.prisePoidsMois },
  { label: 'Prise de poids (année)', value: props.data.prisePoidsAnnee },
  { label: 'Poids le plus bas (kg)', value: props.data.poidsPlusBas },
  { label: 'Poids le plus haut (kg)', value: props.data.poidsPlusHaut },
])

const tentativesPreviewFields = computed<FormPreviewField[]>(() =>
  (props.data.tentatives ?? []).map((t, i) => ({
    label: `Tentative ${i + 1}`,
    value: `${t.methode?.trim() || '—'} — ${t.resultatKg != null ? `${t.resultatKg} kg` : '—'}`,
  })),
)

// Mutation en place du tableau édité (le draft), comme addAllergie dans
// ModeVieAtcdTab ; `crypto.randomUUID` garantit la clé stable de chaque ligne.
function addTentative(list: TentativePertePoids[]) {
  list.push({ _key: crypto.randomUUID(), methode: '', resultatKg: null })
}

function removeTentative(list: TentativePertePoids[], index: number) {
  list.splice(index, 1)
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
.tentatives-actions {
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
</style>
