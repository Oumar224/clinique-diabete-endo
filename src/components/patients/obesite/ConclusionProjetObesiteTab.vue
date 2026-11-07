<!-- ConclusionProjetObesiteTab — CRC Obésité : examen clinique, conclusion, projet thérapeutique.
  Sections en StagedCollapsibleSection + FormPreview (même pattern que les autres
  onglets obésité). La valeur stockée pour l'IMC est `conclusion.imc` (modifiable) ;
  l'aide « IMC calculé » est dérivée de imcAuto(examenPhysique.poids, examenPhysique.taille).
-->
<template>
  <!-- eslint-disable vue/no-mutating-props -- Le préremplissage de l'IMC écrit volontairement dans l'objet réactif partagé data et déclenche 'change' explicitement -->
  <el-form label-position="top" class="tab-form">
    <!-- Examen clinique -->
    <StagedCollapsibleSection
      :ref="setSectionRef('examen')"
      title="Examen clinique"
      :keys="['examenClinique']"
      :model-value="data"
      :readonly="props.readonly"
      @save="emit('change')"
    >
      <template #default="{ draft }">
        <el-row :gutter="16">
          <el-col :span="24">
            <el-form-item label="Examen clinique">
              <el-input
                v-model="draft.examenClinique"
                type="textarea"
                :rows="4"
                placeholder="Décrire l'examen clinique…"
                :disabled="props.readonly"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </template>
    </StagedCollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Examen clinique"
        variant="compact"
        :hide-header="true"
        :fields="examenPreviewFields"
        @edit="() => openSection('examen')"
      />
    </div>

    <!-- Conclusion -->
    <StagedCollapsibleSection
      :ref="setSectionRef('conclusion')"
      title="Conclusion"
      :keys="['typeConclusion', 'imc', 'origine', 'terrain', 'facteursAggravants', 'commentaires']"
      :model-value="data"
      :readonly="props.readonly"
      @save="emit('change')"
    >
      <template #default="{ draft }">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="Type de conclusion">
              <el-radio-group v-model="draft.typeConclusion" :disabled="props.readonly">
                <el-radio value="surpoids">Surpoids</el-radio>
                <el-radio value="obesite">Obésité</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="IMC (kg/m²)">
              <div class="imc-field">
                <el-input-number
                  v-model="draft.imc"
                  :min="0"
                  :max="100"
                  :step="0.1"
                  :precision="1"
                  controls-position="right"
                  style="width:100%"
                  :disabled="props.readonly"
                  @change="onImcChange"
                />
                <p v-if="imcCalc != null" class="imc-help">
                  IMC calculé : {{ imcCalc }} kg/m²
                  <template v-if="examenPhysique.poids != null && examenPhysique.taille != null">
                    (poids {{ examenPhysique.poids }} kg, taille {{ examenPhysique.taille }} cm)
                  </template>
                  — valeur modifiable.
                  <button
                    v-if="!props.readonly && imcCalc != null"
                    type="button"
                    class="imc-apply"
                    @click="applyImcCalc(draft)"
                  >
                    Utiliser l'IMC calculé
                  </button>
                </p>
              </div>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="Origine">
              <el-input v-model="draft.origine" placeholder="Origine de l'obésité…" :disabled="props.readonly" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="Terrain">
              <el-input v-model="draft.terrain" placeholder="Terrain…" :disabled="props.readonly" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="24">
            <el-form-item label="Facteurs aggravants">
              <el-input v-model="draft.facteursAggravants" type="textarea" :rows="2" placeholder="Facteurs aggravants…" :disabled="props.readonly" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="24">
            <el-form-item label="Commentaires">
              <el-input v-model="draft.commentaires" type="textarea" :rows="2" placeholder="Commentaires…" :disabled="props.readonly" />
            </el-form-item>
          </el-col>
        </el-row>
      </template>
    </StagedCollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Conclusion"
        variant="compact"
        :hide-header="true"
        :fields="conclusionPreviewFields"
        @edit="() => openSection('conclusion')"
      />
    </div>

    <!-- Projet thérapeutique -->
    <StagedCollapsibleSection
      :ref="setSectionRef('projet')"
      title="Projet thérapeutique"
      :keys="['niveau', 'niveaux']"
      :model-value="projet"
      :readonly="props.readonly"
      @save="emit('change')"
    >
      <template #default="{ draft }">
        <el-row :gutter="16">
          <el-col :span="24">
            <el-form-item label="Parcours obésité — niveau">
              <el-radio-group v-model="draft.niveau" :disabled="props.readonly">
                <el-radio :value="1">Niveau 1 — Surpoids</el-radio>
                <el-radio :value="2">Niveau 2 — Obésité modérée et sévère</el-radio>
                <el-radio :value="3">Niveau 3 — Obésité massive</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>

        <div
          v-for="niv in NIVEAUX"
          :key="niv.key"
          class="niveau-block"
          :class="{ 'niveau-block--selected': draft.niveau === niv.num }"
        >
          <h4 class="niveau-title">{{ niv.title }}</h4>
          <p class="niveau-desc">{{ niv.desc }}</p>
          <el-form-item :label="`Étapes — ${niv.title}`">
            <el-checkbox-group v-model="draft.niveaux[niv.key].etapes" :disabled="props.readonly">
              <el-checkbox v-for="opt in ETAPES_OPTIONS" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </el-checkbox>
            </el-checkbox-group>
          </el-form-item>
          <el-form-item label="Commentaire">
            <el-input
              v-model="draft.niveaux[niv.key].commentaire"
              type="textarea"
              :rows="2"
              :placeholder="`Commentaire pour ${niv.title}…`"
              :disabled="props.readonly"
            />
          </el-form-item>
        </div>
      </template>
    </StagedCollapsibleSection>

    <div class="section-preview">
      <FormPreview
        title="Projet thérapeutique"
        variant="compact"
        :hide-header="true"
        :fields="projetPreviewFields"
        @edit="() => openSection('projet')"
      />
    </div>
  </el-form>
</template>

<script setup lang="ts">
/* eslint-disable vue/no-mutating-props -- Écritures volontaires dans l'objet réactif partagé data (préremplissage IMC) déclenchées par émission explicite de 'change' */
import { ref, computed, nextTick, watch } from 'vue'
import type { CrcObesiteFormData } from '@/types/crc-obesite'
import { imcAuto } from '@/utils/apports-alimentaires'
import FormPreview, { type FormPreviewField } from '@/components/common/FormPreview.vue'
import StagedCollapsibleSection from '@/components/common/StagedCollapsibleSection.vue'

const props = withDefaults(defineProps<{
  data: CrcObesiteFormData['conclusion']
  projet: CrcObesiteFormData['projetTherapeutique']
  examenPhysique: CrcObesiteFormData['bilanInitial']['examenPhysique']
  readonly?: boolean
}>(), {
  readonly: false,
})

const emit = defineEmits<{ change: [] }>()

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

// IMC calculé depuis le bilan initial (aide/pre-remplissage, valeur stockée reste conclusion.imc)
const imcCalc = computed<number | null>(() =>
  imcAuto(props.examenPhysique.poids, props.examenPhysique.taille),
)

const imcUserModified = ref(false)

function onImcChange() {
  imcUserModified.value = true
}

function applyImcCalc(draft: Record<string, unknown>) {
  if (imcCalc.value != null) {
    draft.imc = imcCalc.value
    imcUserModified.value = true
  }
}

// Préremplissage : si l'IMC stocké est encore vide et que le calcul est dispo, on le propose
// en le copiant dans conclusion.imc (modifiable ensuite). Ne pas écraser une valeur saisie par l'utilisateur.
watch(
  imcCalc,
  (calc) => {
    if (calc != null && props.data.imc == null && !imcUserModified.value && !props.readonly) {
      props.data.imc = calc
      emit('change')
    }
  },
  { immediate: true },
)

const examenPreviewFields = computed<FormPreviewField[]>(() => [
  { label: 'Examen clinique', value: props.data.examenClinique || null, key: 'conclusion.examenClinique' },
])

const TYPE_LABELS: Record<string, string> = {
  surpoids: 'Surpoids',
  obesite: 'Obésité',
}

const conclusionPreviewFields = computed<FormPreviewField[]>(() => [
  {
    label: 'Type de conclusion',
    value: props.data.typeConclusion ? (TYPE_LABELS[props.data.typeConclusion] ?? props.data.typeConclusion) : null,
    key: 'conclusion.typeConclusion',
  },
  { label: 'IMC', value: props.data.imc != null ? `${props.data.imc} kg/m²` : null, key: 'conclusion.imc' },
  { label: 'Origine', value: props.data.origine || null, key: 'conclusion.origine' },
  { label: 'Terrain', value: props.data.terrain || null, key: 'conclusion.terrain' },
  { label: 'Facteurs aggravants', value: props.data.facteursAggravants || null, key: 'conclusion.facteursAggravants' },
  { label: 'Commentaires', value: props.data.commentaires || null, key: 'conclusion.commentaires' },
])

const ETAPES_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'bilan', label: 'Bilan minimum (TSH, GAJ, HbA1c, bilan lipidique, acide urique, calcémie, magnésémie, créat)' },
  { value: 'depistage', label: 'Dépistage des complications/comorbidités' },
  { value: 'controle', label: 'Contrôle des facteurs favorisants/aggravants' },
  { value: 'etp', label: 'Planification ETP : 2 séances APA, 4 séances DIET, 1 séance/semaine à l’initiation' },
  { value: 'prescription', label: 'Prescription médicaments' },
  { value: 'suivi', label: 'Suivi / évaluation' },
  { value: 'dossier_reference', label: 'Constitution d’un dossier de référence' },
]

const ETAPES_LABELS: Record<string, string> = Object.fromEntries(ETAPES_OPTIONS.map((o) => [o.value, o.label]))

const NIVEAUX: Array<{ key: '1' | '2' | '3'; num: 1 | 2 | 3; title: string; desc: string }> = [
  { key: '1', num: 1, title: 'Parcours obésité niveau 1 : SURPOIDS', desc: 'Bilan minimum, contrôle des facteurs favorisants/aggravants, ETP (2 séances APA, 4 séances DIET, 1 séance/semaine), suivi/évaluation bi-mensuel.' },
  { key: '2', num: 2, title: 'Parcours obésité niveau 2 : OBÉSITÉ MODÉRÉE ET SÉVÈRE', desc: 'Bilan minimum + dépistage des complications/comorbidités, contrôle des facteurs, ETP, prescription médicaments, suivi/évaluation mensuel.' },
  { key: '3', num: 3, title: 'Parcours obésité niveau 3 : OBÉSITÉ MASSIVE', desc: 'Bilan minimum + dépistage des complications/comorbidités, contrôle des facteurs, ETP, prescription médicaments, suivi/évaluation mensuel, constitution d’un dossier de référence.' },
]

const NIVEAU_LABELS: Record<string, string> = {
  '1': 'Niveau 1 — Surpoids',
  '2': 'Niveau 2 — Obésité modérée et sévère',
  '3': 'Niveau 3 — Obésité massive',
}

const projetPreviewFields = computed<FormPreviewField[]>(() => {
  const fields: FormPreviewField[] = [
    {
      label: 'Parcours sélectionné',
      value: props.projet.niveau != null ? (NIVEAU_LABELS[String(props.projet.niveau)] ?? `Niveau ${props.projet.niveau}`) : null,
      key: 'projetTherapeutique.niveau',
    },
  ]
  for (const niv of NIVEAUX) {
    const n = props.projet.niveaux[niv.key]
    fields.push({
      label: `${niv.title} — étapes`,
      value: n.etapes?.length ? n.etapes.map((e) => ETAPES_LABELS[e] ?? e).join(' ; ') : null,
      key: `projetTherapeutique.niveaux.${niv.key}.etapes`,
    })
    fields.push({
      label: `${niv.title} — commentaire`,
      value: n.commentaire || null,
      key: `projetTherapeutique.niveaux.${niv.key}.commentaire`,
    })
  }
  return fields
})
</script>

<style scoped>
.section-preview {
  margin: 8px 0 16px;
}
.imc-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.imc-help {
  margin: 0;
  font-size: 11px;
  color: var(--el-text-color-secondary);
}
.imc-apply {
  margin-left: 6px;
  padding: 0;
  border: none;
  background: none;
  color: var(--el-color-primary);
  font-size: 11px;
  text-decoration: underline;
  cursor: pointer;
}
.imc-apply:hover {
  color: var(--el-color-primary-dark-2);
}
.niveau-block {
  border: 1px solid var(--cde-border);
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 12px;
  background: var(--cde-surface);
}
.niveau-block--selected {
  border-color: var(--el-color-primary);
  background: var(--cde-surface-tint);
}
.niveau-title {
  margin: 0 0 4px;
  font-size: 13px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}
.niveau-desc {
  margin: 0 0 10px;
  font-size: 11px;
  color: var(--el-text-color-secondary);
  font-style: italic;
}
</style>
